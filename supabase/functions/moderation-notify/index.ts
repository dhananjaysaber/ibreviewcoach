// supabase/functions/moderation-notify/index.ts  (verify_jwt = true)
//
// Emails a student when the moderator has published their report.
// Only an active admin can call it, and only for a report that is really published.
// If no email provider is configured (RESEND_API_KEY secret), it returns
// { sent: false, reason: "email_not_configured" } and the report is still visible in the student's account.
//
// Secrets: RESEND_API_KEY (optional), EMAIL_FROM (optional), SITE_URL (optional), ALLOWED_ORIGINS.
import { createClient } from "npm:@supabase/supabase-js@2";

const FN = "moderation-notify";

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });
  if (req.method !== "POST") return reply({ ok: false, message: "Not available." }, 405, cors);

  try {
    const url = need("SUPABASE_URL");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!publicKey || !serviceKey) throw new Error("Supabase keys missing");

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return reply({ ok: false, message: "Sign in required." }, 401, cors);

    const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: auth } }, ...opts });
    const admin = createClient(url, serviceKey, opts);

    const { data: isAdmin, error: adminErr } = await userClient.rpc("is_ia_admin");
    if (adminErr || isAdmin !== true) return reply({ ok: false, message: "Admin access is required." }, 403, cors);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* empty */ }
    const submissionId = typeof body.submission_id === "string" ? body.submission_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return reply({ ok: false, message: "Invalid report." }, 400, cors);

    const { data: sub } = await admin
      .from("ia_submissions")
      .select("id, student_id, original_filename, moderation_status")
      .eq("id", submissionId).maybeSingle();
    if (!sub || sub.moderation_status !== "published") {
      return reply({ ok: false, message: "That report has not been published." }, 409, cors);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return reply({ ok: true, sent: false, reason: "email_not_configured" }, 200, cors);

    const { data: user } = await admin.auth.admin.getUserById(sub.student_id);
    const to = user?.user?.email;
    if (!to) return reply({ ok: true, sent: false, reason: "no_student_email" }, 200, cors);

    const from = Deno.env.get("EMAIL_FROM") ?? "IB IA Review <support@ibiareview.com>";
    const site = (Deno.env.get("SITE_URL") ?? "https://ibiareview.com").replace(/\/+$/, "");
    const file = escapeHtml(String(sub.original_filename ?? "your IA"));

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your IA report is ready",
        html:
          `<p>Your report for <strong>${file}</strong> has been marked and approved by an authorised IB moderator and is ready.</p>` +
          `<p><a href="${site}/my-reports">Open My IA Reports</a></p>` +
          `<p>IB IA Review</p>`,
      }),
    });
    if (!res.ok) {
      console.error(`[${FN}] provider status`, res.status);
      return reply({ ok: true, sent: false, reason: `provider_${res.status}` }, 200, cors);
    }
    return reply({ ok: true, sent: true }, 200, cors);
  } catch (error) {
    console.error(`[${FN}] error`, error instanceof Error ? error.message : error);
    return reply({ ok: false, message: "The notification could not be sent." }, 500, corsHeaders(req));
  }
});

function need(name: string): string {
  const v = Deno.env.get(name)?.trim();
  if (!v) throw new Error(`${name} is not configured.`);
  return v;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const allowed = !!origin && (configured.includes("*") || configured.includes(origin) || isLocal(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? (origin as string) : "http://localhost:5173",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function isLocal(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname) && u.port === "5173";
  } catch {
    return false;
  }
}

function reply(body: Record<string, unknown>, status: number, cors: HeadersInit): Response {
  return new Response(JSON.stringify({ functionName: FN, ...body }), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
