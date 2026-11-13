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
          html: `<p>Hello,</p><p>We are sorry: your report for <strong>${file}</strong> is taking longer than the 24 hours we promised. Your moderator is still working on it.</p><p>It will now be ready by <strong>${when}</strong>. Your credit stays safe in your account and is only used when the report is released to you.</p><p><a href="${site}/my-reports">View your reports</a></p><p>Thank you for your patience.<br/>IB IA Review</p>`,
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
