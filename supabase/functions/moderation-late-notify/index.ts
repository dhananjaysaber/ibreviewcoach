// supabase/functions/moderation-late-notify/index.ts  (verify_jwt = true)
//
// Finds paid reports that are past their ready-by time and still waiting for the moderator.
// For each one (once only) it sets a new ready-by time 12 hours from now and emails the student
// a short apology. The credit stays with the student; nothing is refunded or consumed here.
// It takes no input from the caller, so it is safe to run on a schedule.
// If RESEND_API_KEY is not set, it skips quietly and leaves reports unmarked so the email goes out later.
// Secrets: RESEND_API_KEY (optional), EMAIL_FROM (optional), SITE_URL (optional).
import { createClient } from "npm:@supabase/supabase-js@2";

const EXTRA_HOURS = 12;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!url || !serviceKey) throw new Error("Supabase keys missing");
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ ok: true, sent: 0, reason: "email_not_configured" });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: late, error } = await admin
      .from("ia_submissions")
      .select("id, student_id, original_filename")
      .eq("moderation_status", "awaiting")
      .is("moderation_late_notified_at", null)
      .is("deleted_at", null)
      .not("moderation_held_at", "is", null)
      .lt("moderation_due_at", new Date().toISOString())
      .limit(25);
    if (error) throw error;

    const from = Deno.env.get("EMAIL_FROM") ?? "IB IA Review <support@ibiareview.com>";
    const site = (Deno.env.get("SITE_URL") ?? "https://ibiareview.com").replace(/\/+$/, "");
    let sent = 0;

    for (const row of late ?? []) {
      const readyBy = new Date(Date.now() + EXTRA_HOURS * 3600 * 1000);
      // Claim the row first so the same student is never emailed twice.
      const { data: claimed } = await admin
        .from("ia_submissions")
        .update({ moderation_late_notified_at: new Date().toISOString(), moderation_promised_at: readyBy.toISOString() })
        .eq("id", row.id).is("moderation_late_notified_at", null).select("id");
      if (!claimed?.length) continue;

      const { data: user } = await admin.auth.admin.getUserById(row.student_id);
      const to = user?.user?.email;
      if (!to) continue;

      const when = readyBy.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
      const file = esc(String(row.original_filename ?? "your IA"));
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to,
          subject: "Your IA report is taking a little longer",
          html: emailShell({
            site,
            preheader: "Your report is taking a little longer than promised. Your credit is safe.",
            eyebrow: "A short delay",
            title: "Your report is taking a little longer",
            bodyHtml:
              `<p style="margin:0 0 14px;">Hello,</p>` +
              `<p style="margin:0 0 14px;">We are sorry: your report for <strong style="color:#0F172A;">${file}</strong> is taking longer than the 24 hours we promised. Your moderator is still working on it.</p>` +
              `<p style="margin:0;">It will now be ready by <strong style="color:#0F172A;">${when}</strong>. Thank you for your patience.</p>`,
            ctaLabel: "View your reports",
            ctaUrl: `${site}/my-reports`,
            note: "Your credit stays safe in your account and is only used when the report is released to you.",
          }),
        }),
      });
      if (res.ok) sent++;
    }
    return json({ ok: true, sent, checked: late?.length ?? 0 });
  } catch (e) {
    console.error("moderation-late-notify", e instanceof Error ? e.message : e);
    return json({ ok: false, message: "Something went wrong." }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
}
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}


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
