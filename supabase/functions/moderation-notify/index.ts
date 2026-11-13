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
        html: emailShell({
          site,
          preheader: "Your IA report has been marked and approved. Open it now.",
          eyebrow: "Report ready",
          title: "Your IA report is ready",
          bodyHtml:
            `<p style="margin:0 0 14px;">Hello,</p>` +
            `<p style="margin:0 0 14px;">Your report for <strong style="color:#0F172A;">${file}</strong> has been marked and approved by an authorised IB moderator, and it is now ready for you.</p>` +
            `<p style="margin:0;">Open it to see your marks, the reasoning behind them and what to improve next.</p>`,
          ctaLabel: "Open My IA Reports",
          ctaUrl: `${site}/my-reports`,
          note: "Your review credit has now been used for this report.",
        }),
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

function emailShell(o: { preheader: string; eyebrow: string; title: string; bodyHtml: string; ctaLabel: string; ctaUrl: string; note?: string; site: string }): string {
  const e = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${e(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F1EA;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(o.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="background:#0F172A;border-radius:18px 18px 0 0;padding:28px 32px 26px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:38px;height:38px;border-radius:10px;background:#F59E0B;background-image:linear-gradient(135deg,#FBBF24,#D97706);text-align:center;vertical-align:middle;font:700 15px Georgia,'Times New Roman',serif;color:#0F172A;">IA</td>
    <td style="padding-left:12px;font:600 15px Georgia,'Times New Roman',serif;color:#FFFFFF;letter-spacing:.2px;">IB IA Review</td>
  </tr></table>
  <div style="margin-top:26px;font:700 11px Arial,Helvetica,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#FBBF24;">${e(o.eyebrow)}</div>
  <div style="margin-top:8px;font:600 28px/1.2 Georgia,'Times New Roman',serif;color:#FFFFFF;">${e(o.title)}</div>
</td></tr>
<tr><td style="background:#FFFFFF;padding:30px 32px 8px;font:400 16px/1.65 Arial,Helvetica,sans-serif;color:#344054;">
  ${o.bodyHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 10px;"><tr><td style="border-radius:12px;background:#F59E0B;background-image:linear-gradient(180deg,#FBBF24,#E8920C);">
    <a href="${o.ctaUrl}" style="display:inline-block;padding:14px 28px;font:700 15px Arial,Helvetica,sans-serif;color:#0F172A;text-decoration:none;border-radius:12px;">${e(o.ctaLabel)} &rarr;</a>
  </td></tr></table>
  <p style="margin:14px 0 0;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#667085;">Button not working? Copy this link into your browser:<br><a href="${o.ctaUrl}" style="color:#B45309;word-break:break-all;">${o.ctaUrl}</a></p>
  ${o.note ? `<div style="margin:22px 0 0;padding:14px 16px;border-radius:12px;background:#FAF8F5;border:1px solid #EFEBE2;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#475467;">${o.note}</div>` : ""}
  <div style="height:26px;"></div>
</td></tr>
<tr><td style="background:#FFFFFF;border-radius:0 0 18px 18px;padding:0 32px 26px;">
  <div style="border-top:1px solid #EFEBE2;padding-top:18px;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#667085;">
    <strong style="color:#0F172A;">IB IA Review</strong> &middot; <a href="${o.site}" style="color:#667085;">ibiareview.com</a><br>
    Questions? <a href="${o.site}/contact" style="color:#667085;">Contact us</a> and we will help.<br>
    Indicative guidance only. Final assessment decisions remain with your teacher and the IB assessment process.
  </div>
</td></tr>
</table></td></tr></table></body></html>`;
}

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
