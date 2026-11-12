// Supabase Edge Function: razorpay-create-order (verify_jwt = true)
// The browser sends only a pack_code. Price and credits come from ia_credit_packs.
// Secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, optional RAZORPAY_USD_INR_RATE (fallback only, default 88).
// The USD to INR rate is looked up live for each order (ECB reference rate via frankfurter.dev).
import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;
const FN = "razorpay-create-order";

Deno.serve(async (request: Request): Promise<Response> => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (!originAllowed(request)) return reply({ ok: false, message: "This checkout request is not allowed from the current page." }, 403, cors);
  if (request.method !== "POST") return reply({ ok: false, message: "This checkout action is not available." }, 405, cors);

  try {
    const url = need("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!publicKey || !serviceKey) throw new Error("Supabase keys missing");
    const keyId = need("RAZORPAY_KEY_ID");
    const keySecret = need("RAZORPAY_KEY_SECRET");
    const fallbackRate = Number(Deno.env.get("RAZORPAY_USD_INR_RATE") ?? "88");
    if (!Number.isFinite(fallbackRate) || fallbackRate <= 0) throw new Error("RAZORPAY_USD_INR_RATE is invalid");
    const { rate, source: rateSource } = await getUsdInrRate(fallbackRate);

    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return reply({ ok: false, message: "Please sign in before purchasing review credits." }, 401, cors);
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, ...opts });
    const admin = createClient(url, serviceKey, opts);

    const { data: ud, error: ue } = await userClient.auth.getUser(token);
    const user = ud.user;
    if (ue || !user) return reply({ ok: false, message: "Your sign-in has expired. Please sign in again." }, 401, cors);
    if (user.is_anonymous === true || user.app_metadata?.provider === "anonymous" || !user.email)
      return reply({ ok: false, message: "Create a permanent account before purchasing review credits." }, 403, cors);
    if (!user.email_confirmed_at)
      return reply({ ok: false, message: "Confirm your email address before purchasing review credits." }, 403, cors);

    const { data: settings } = await admin.from("ia_commercial_settings").select("payments_enabled").eq("id", "global").maybeSingle();
    if (settings?.payments_enabled !== true)
      return reply({ ok: false, paymentsDisabled: true, message: "Payment collection is temporarily unavailable. No payment order was created." }, 503, cors);

    const { error: acctErr } = await userClient.rpc("ensure_ia_credit_account");
    if (acctErr) return reply({ ok: false, message: "Your account could not be prepared for checkout. Please try again." }, 500, cors);

    const body = await readBody(request);
    const packCode = body.pack_code ?? body.packCode;
    if (typeof packCode !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(packCode))
      return reply({ ok: false, message: "Select a valid review-credit pack." }, 400, cors);

    const { data: pack, error: packErr } = await admin.from("ia_credit_packs")
      .select("pack_code, display_name, review_credits, price_usd, validity_days")
      .eq("pack_code", packCode).eq("is_active", true).maybeSingle();
    if (packErr) return reply({ ok: false, message: "The selected review-credit pack could not be checked." }, 500, cors);
    if (!pack) return reply({ ok: false, message: "That review-credit pack is no longer available." }, 404, cors);

    const priceUsd = Number(pack.price_usd);
    const credits = Number(pack.review_credits);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isInteger(credits) || credits <= 0)
      throw new Error("Invalid pack data");

    const amountPaise = Math.round(priceUsd * rate * 100);
    if (amountPaise < 100) return reply({ ok: false, message: "The amount is too small to charge." }, 400, cors);
    const amountInr = amountPaise / 100;

    const paymentOrderId = crypto.randomUUID();
    const { error: insErr } = await admin.from("ia_payment_orders").insert({
      id: paymentOrderId,
      student_id: user.id,
      pack_code: pack.pack_code,
      currency: "INR",
      amount: amountInr,
      credits_to_grant: credits,
      payment_provider: "razorpay",
      status: "created",
      checkout_expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      metadata: { price_usd: priceUsd, usd_inr_rate: rate, usd_inr_rate_source: rateSource, created_by_function: FN, request_origin: request.headers.get("Origin") },
    });
    if (insErr) {
      console.error(`[${FN}] insert failed`, insErr);
      return reply({ ok: false, message: "The secure checkout could not be started. Please try again." }, 500, cors);
    }

    const rzRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`), "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: paymentOrderId,
        notes: { payment_order_id: paymentOrderId, pack_code: pack.pack_code },
      }),
    });
    const rz = await readJson(rzRes);

    if (!rzRes.ok || typeof rz.id !== "string") {
      console.error(`[${FN}] Razorpay order failed`, { status: rzRes.status, error: rz.error });
      await admin.rpc("fail_ia_payment_order", {
        p_payment_order_id: paymentOrderId,
        p_failure_code: "razorpay_create_order_failed",
        p_failure_message: "Razorpay did not create the checkout order.",
        p_provider_status: null,
        p_provider_payload: { status: rzRes.status },
      });
      const status = rzRes.status === 401 ? 401 : 502;
      return reply({ ok: false, message: "The secure checkout could not be opened. Please try again." }, status, cors);
    }

    await admin.from("ia_payment_orders").update({
      provider_order_id: rz.id, status: "pending", last_provider_status: String(rz.status ?? "created"),
    }).eq("id", paymentOrderId).eq("student_id", user.id);

    return reply({
      ok: true,
      keyId, // public identifier, safe for the browser
      razorpayOrderId: rz.id,
      paymentOrderId,
      amount: amountPaise,
      currency: "INR",
      name: "IB IA Review",
      description: `${pack.display_name} (${credits} review ${credits === 1 ? "credit" : "credits"})`,
      prefillEmail: user.email,
    }, 200, cors);
  } catch (error) {
    console.error(`[${FN}] Unexpected error`, error);
    return reply({ ok: false, message: "The secure checkout could not be started. Please try again." }, 500, corsHeaders(request));
  }
});

/** Live USD to INR rate (rounded to 2 decimals). Falls back to the fixed rate if the lookup fails or looks wrong. */
async function getUsdInrRate(fallback: number): Promise<{ rate: number; source: string }> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const live = Number(data?.rates?.INR);
      if (Number.isFinite(live) && live >= 60 && live <= 130) return { rate: Math.round(live * 100) / 100, source: "live" };
    }
  } catch { /* use fallback */ }
  return { rate: fallback, source: "fallback" };
}
function need(name: string): string {
  const v = Deno.env.get(name)?.trim();
  if (!v) throw new Error(`${name} is not configured.`);
  return v;
}
function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && isAllowed(origin) ? origin : "http://localhost:5173",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || isAllowed(origin);
}
function isAllowed(origin: string): boolean {
  const configured = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname) && u.port === "5173") return true;
    if (u.protocol === "https:" && u.hostname.endsWith(".local-corp.webcontainer.io")) return true;
  } catch { return false; }
  return false;
}
async function readBody(request: Request): Promise<Json> {
  try { const v = await request.json(); return v && typeof v === "object" && !Array.isArray(v) ? v as Json : {}; } catch { return {}; }
}
async function readJson(response: Response): Promise<Json> {
  const t = await response.text();
  try { const v = JSON.parse(t); return v && typeof v === "object" ? v as Json : {}; } catch { return {}; }
}
function reply(body: Json, status: number, cors: HeadersInit): Response {
  return new Response(JSON.stringify({ functionName: FN, ...body }), {
    status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
