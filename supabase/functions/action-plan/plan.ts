/**
 * Pure logic for the student action plan. A finding is rewritten as a short plan in plain
 * student-facing language. The coach never writes the student's own text and never states marks.
 */
export type FindingInput = {
  id: string; criterion_code: string; section_title: string | null; issue: string;
  rubric_requirement: string; specific_action: string; why: string; completion_check: string;
  required_elements: string[] | null; evidence_excerpt: string | null;
};
export type ModelPlan = { finding_id?: unknown; goal?: unknown; why?: unknown; steps?: unknown; example?: unknown; done_when?: unknown };
export type Plan = { goal: string; why: string; steps: string[]; example: string; done_when: string };

export const PLAN_SYSTEM = `You are a friendly, experienced IB Sports, Exercise and Health Science teacher explaining to ONE student how to fix a point in their own Internal Assessment.
Write in plain student-friendly language, speaking to the student as "you". Short sentences. No jargon without a quick explanation.
For each finding return a clear plan:
- goal: one line saying what you are fixing (max 20 words).
- why: 1 to 2 sentences on why this matters for how a moderator reads the IA, naming the IB criterion (max 45 words).
- steps: 3 or 4 small actions in order, each starting with a verb (find, decide, work out, add, check). Each max 28 words. Say WHERE in the IA to look. Be concrete about what to think about or calculate, but do not give the answer.
- example: a short worked example (max 60 words) that shows the IDEA using a DIFFERENT, made-up context and different numbers from the student's IA (for example another sport or another dataset). It must teach the thinking, such as a tiny calculation or a before/after of what a good point does, and must not be reusable in the student's IA.
- done_when: one plain sentence the student can use to check they are finished (max 30 words).
Hard rules:
- Never write sentences, paragraphs or wording that the student could paste into their IA. You may point to what a sentence must do, never the sentence itself.
- Do not state marks or bands. Do not promise a higher band.
- Do not invent facts about the student's data beyond the finding supplied.
- Keep the student's own ideas as theirs: you explain, they write.
Return ONLY JSON: {"plans":[{"finding_id":"...","goal":"...","why":"...","steps":["..."],"example":"...","done_when":"..."}]}`;

export const buildUserPrompt = (findings: FindingInput[]): string =>
  'Findings to turn into plans (use each id exactly):\n' + JSON.stringify(findings.map((f) => ({
    finding_id: f.id, criterion: f.criterion_code, section: f.section_title, what_was_found: f.issue,
    ib_requirement: f.rubric_requirement, original_action: f.specific_action, original_reason: f.why,
    original_check: f.completion_check, must_include: f.required_elements ?? [],
    students_own_passage: (f.evidence_excerpt ?? '').slice(0, 400),
  })));

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const PASTEABLE = /["“”][^"“”]{80,}["“”]/;
const BAND_CLAIM = /\b(band|level)\s*\d|\b\d+\s*(?:\/|out of)\s*\d+\s*marks?|\bgain\s+\d+\s+marks?/i;

export function checkPlan(raw: ModelPlan): { ok: true; plan: Plan } | { ok: false; reason: string } {
  const goal = clean(raw.goal), why = clean(raw.why), done = clean(raw.done_when), example = clean(raw.example);
  const steps = Array.isArray(raw.steps) ? raw.steps.map(clean).filter(Boolean) : [];
  if (!goal || !why || !done || !example) return { ok: false, reason: 'missing field' };
  if (words(goal) > 24) return { ok: false, reason: 'goal too long' };
  if (words(why) > 55) return { ok: false, reason: 'why too long' };
  if (words(example) > 75) return { ok: false, reason: 'example too long' };
  if (words(done) > 38) return { ok: false, reason: 'done_when too long' };
  if (steps.length < 2 || steps.length > 5) return { ok: false, reason: 'step count' };
  if (steps.some((s) => words(s) > 34)) return { ok: false, reason: 'step too long' };
  const all = [goal, why, example, done, ...steps].join(' ');
  if (PASTEABLE.test(all)) return { ok: false, reason: 'pasteable wording' };
  if (BAND_CLAIM.test(all)) return { ok: false, reason: 'band claim' };
  return { ok: true, plan: { goal, why, steps, example, done_when: done } };
}

export function assemblePlans(findings: FindingInput[], modelPlans: ModelPlan[]) {
  const wanted = new Set(findings.map((f) => f.id));
  const plans = new Map<string, Plan>();
  const rejected: { finding_id: string; reason: string }[] = [];
  for (const m of modelPlans) {
    const id = clean(m.finding_id);
    if (!wanted.has(id) || plans.has(id)) continue;
    const r = checkPlan(m);
    if (r.ok) plans.set(id, r.plan); else rejected.push({ finding_id: id, reason: r.reason });
  }
  return { plans, rejected, missing: findings.filter((f) => !plans.has(f.id)).map((f) => f.id) };
}
