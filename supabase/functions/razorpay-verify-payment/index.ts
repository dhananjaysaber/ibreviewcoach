// Supabase Edge Function: razorpay-verify-payment (verify_jwt = true)
// 1. Checks the signed-in account owns the payment order.
// 2. Verifies HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET) against razorpay_signature.
// 3. Fetches the payment from Razorpay, checks order, amount and currency, captures it if only authorized.
// 4. Calls complete_ia_razorpay_order(), which grants credits exactly once.
import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;
const FN = "razorpay-verify-payment";

Deno.serve(async (request: Request): Promise<Response> => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (!originAllowed(request)) return reply({ ok: false, message: "This payment request is not allowed from the current page." }, 403, cors);
  if (request.method !== "POST") return reply({ ok: false, message: "This payment action is not available." }, 405, cors);

  try {
    const url = need("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!publicKey || !serviceKey) throw new Error("Supabase keys missing");
    const keyId = need("RAZORPAY_KEY_ID");
    const keySecret = need("RAZORPAY_KEY_SECRET");

    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return reply({ ok: false, message: "Please sign in before completing the payment." }, 401, cors);
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, ...opts });
    const admin = createClient(url, serviceKey, opts);

    const { data: ud, error: ue } = await userClient.auth.getUser(token);
    const user = ud.user;
    if (ue || !user) return reply({ ok: false, message: "Your sign-in has expired. Please sign in again." }, 401, cors);
    if (user.is_anonymous === true || user.app_metadata?.provider === "anonymous" || !user.email)
      return reply({ ok: false, message: "Create a permanent account before completing payment." }, 403, cors);

    const body = await readBody(request);
    const paymentOrderId = text(body.payment_order_id);
    const orderId = text(body.razorpay_order_id);
    const paymentId = text(body.razorpay_payment_id);
    const signature = text(body.razorpay_signature);
    if (!paymentOrderId || !orderId || !paymentId || !signature ||
        !/^[A-Za-z0-9_]{6,64}$/.test(orderId) || !/^[A-Za-z0-9_]{6,64}$/.test(paymentId) || !/^[a-f0-9]{64}$/i.test(signature))
      return reply({ ok: false, message: "The payment details are incomplete. No review credits were added." }, 400, cors);

    const { data: po, error: poErr } = await admin.from("ia_payment_orders")
      .select("id, student_id, currency, amount, credits_to_grant, payment_provider, provider_order_id, provider_payment_id, status, checkout_expires_at")
      .eq("id", paymentOrderId).eq("student_id", user.id).eq("payment_provider", "razorpay").eq("provider_order_id", orderId)
      .maybeSingle();
    if (poErr) return reply({ ok: false, message: "The payment could not be checked. Please try again." }, 500, cors);
    if (!po) return reply({ ok: false, message: "This checkout was not found for your account. Please start a new payment." }, 404, cors);

    if (po.status === "paid") {
      const { data: summary } = await userClient.rpc("get_my_ia_credit_summary");
      return reply({ ok: true, alreadyCompleted: true, paymentOrderId: po.id, credits: summary ?? null, message: "Payment was already completed and the credits are available." }, 200, cors);
    }
    if (!["created", "pending"].includes(String(po.status)))
      return reply({ ok: false, message: "This checkout can no longer be completed. Start a new payment." }, 409, cors);

    // 1. Signature check (constant-time).
    const expected = await hmacHex(keySecret, `${orderId}|${paymentId}`);
    if (!timingSafeEqual(expected, signature.toLowerCase())) {
      console.warn(`[${FN}] Signature mismatch`, { paymentOrderId: po.id });
      return reply({ ok: false, message: "The payment could not be verified. No review credits were added." }, 400, cors);
    }

    // 2. Confirm with Razorpay that this payment belongs to this order with the right amount.
    const basic = "Basic " + btoa(`${keyId}:${keySecret}`);
    const payRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: basic } });
    let pay = await readJson(payRes);
    if (!payRes.ok) {
      console.error(`[${FN}] Payment lookup failed`, { status: payRes.status });
      return reply({ ok: false, message: "The payment is still being verified. Do not pay again; contact support if credits do not appear." }, 502, cors);
    }

    const expectedPaise = Math.round(Number(po.amount) * 100);
    if (pay.order_id !== orderId || String(pay.currency).toUpperCase() !== String(po.currency).toUpperCase() || Number(pay.amount) !== expectedPaise) {
      console.error(`[${FN}] Payment does not match order`, { paymentOrderId: po.id });
      return reply({ ok: false, message: "The payment details require verification. Do not pay again." }, 502, cors);
    }

    // 3. Capture if the account is set to manual capture.
    if (pay.status === "authorized") {
      const capRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`, {
        method: "POST",
        headers: { Authorization: basic, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: expectedPaise, currency: po.currency }),
      });
      pay = await readJson(capRes);
      if (!capRes.ok) {
        console.error(`[${FN}] Capture failed`, { status: capRes.status });
        return reply({ ok: false, paymentPending: true, message: "Your payment is being processed. Do not pay again; credits are added once it is confirmed." }, 200, cors);
      }
    }

    if (pay.status === "failed") {
      await admin.rpc("fail_ia_payment_order", {
        p_payment_order_id: po.id, p_failure_code: "razorpay_payment_failed",
        p_failure_message: "The payment failed.", p_provider_status: "failed", p_provider_payload: { payment_id: paymentId },
      });
      return reply({ ok: false, message: "The payment failed. No review credits were added." }, 402, cors);
    }
    if (pay.status !== "captured")
      return reply({ ok: false, paymentPending: true, message: "Your payment is still processing. Do not pay again; credits are added once it is confirmed." }, 200, cors);

    // 4. Grant credits once.
    const { data: done, error: doneErr } = await admin.rpc("complete_ia_razorpay_order", {
      p_payment_order_id: po.id,
      p_provider_order_id: orderId,
      p_provider_payment_id: paymentId,
      p_currency: po.currency,
      p_amount: Number(po.amount),
      p_provider_status: "captured",
      p_provider_payload: { provider_payment_id: paymentId, method: pay.method ?? null, currency: pay.currency, amount_paise: pay.amount },
    });
    if (doneErr) {
      console.error(`[${FN}] Credit grant failed after payment`, doneErr);
      return reply({ ok: false, paymentCompleted: true, message: "Your payment was completed, but the credits are still being confirmed. Do not pay again." }, 500, cors);
    }

    const { data: summary } = await userClient.rpc("get_my_ia_credit_summary");
    return reply({
      ok: true,
      paymentOrderId: po.id,
      creditsGranted: done && typeof done === "object" ? (done as Json).credits_granted : po.credits_to_grant,
      credits: summary ?? null,
      message: "Payment completed. Your review credits are ready.",
    }, 200, cors);
  } catch (error) {
    console.error(`[${FN}] Unexpected error`, error);
    return reply({ ok: false, message: "The payment could not be completed. Please try again." }, 500, corsHeaders(request));
  }
});

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function text(v: unknown): string | null { return typeof v === "string" && v.trim() ? v.trim() : null; }
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
