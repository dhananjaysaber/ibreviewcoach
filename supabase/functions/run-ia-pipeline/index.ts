// supabase/functions/run-ia-pipeline/index.ts
//
// IA Pipeline Orchestrator — v4.3 (free run stops after Research Design)
//
// Workflow: extract-document-text -> extract-structure -> map-to-rubric ->
// generate-coaching -> generate-annotated-ia -> create-progress-plan
//
// Input: { "submission_id": "<uuid>" }
//
// v4.3: a FREE review is complete as soon as Research Design coaching exists.
// It never runs coaching for the other criteria, the annotated copy or the
// progress plan. When the student pays, the submission becomes paid and the
// next call resumes from the saved state and runs only the missing stages.
// Free responses never include the overall mark range or maximum mark.

import { createClient } from "npm:@supabase/supabase-js@2";

const ORCHESTRATOR_VERSION = "run-ia-pipeline-v4.3-free-rd-only";
const REQUIRED_DETAIL_VERSION = "detailed-findings-v1";
const FREE_CRITERION = "ResearchDesign";
const MIN_EXTRACTED_TEXT_LENGTH = 100;
const CHILD_FUNCTION_TIMEOUT_MS = 300_000;
const RUNNING_STAGE_GRACE_MINUTES = 6;

const PIPELINE_STAGES = [
  { key: "extract_document_text", functionName: "extract-document-text", databaseStage: "extract_text", label: "Reading the uploaded document" },
  { key: "extract_structure", functionName: "extract-structure", databaseStage: "extract_structure", label: "Identifying the IA structure and locations" },
  { key: "map_to_rubric", functionName: "map-to-rubric", databaseStage: "map_to_rubric", label: "Mapping evidence to the rubric" },
  { key: "generate_coaching", functionName: "generate-coaching", databaseStage: "generate_coaching", label: "Creating detailed coaching guidance" },
  { key: "generate_annotated_ia", functionName: "generate-annotated-ia", databaseStage: null, label: "Preparing the annotated IA" },
  { key: "create_progress_plan", functionName: "create-progress-plan", databaseStage: "create_progress_plan", label: "Building the progress plan" },
] as const;

type PipelineStageKey = (typeof PIPELINE_STAGES)[number]["key"];
type PipelineStageDefinition = (typeof PIPELINE_STAGES)[number];

type AnnotatedArtifactState = {
  id: string; status: string; storage_bucket: string; storage_path: string;
  generated_at: string | null; expires_at: string | null; deleted_at: string | null;
};

type PipelineState = {
  submission: Record<string, any>;
  isFreeReview: boolean;
  freeCoachingDone: boolean;
  hasExtractedText: boolean;
  hasDocumentBlocks: boolean;
  structureMapId: string | null;
  rubricMappingId: string | null;
  overallMarkRange: [number, number] | null;
  maximumMark: number | null;
  expectedCriterionCodes: string[];
  coachingOutputId: string | null;
  completedCoachingCodes: string[];
  detailedFindingCodes: string[];
  coachingComplete: boolean;
  annotatedArtifact: AnnotatedArtifactState | null;
  annotatedArtifactReady: boolean;
  progressPlanId: string | null;
  completed: boolean;
};

class HttpError extends Error {
  status: number;
  publicMessage: string;
  extra: Record<string, unknown>;
  constructor(status: number, publicMessage: string, internalMessage?: string, extra: Record<string, unknown> = {}) {
    super(internalMessage ?? publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    this.extra = extra;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: isRequestOriginAllowed(req) ? 204 : 403, headers: corsHeaders });
  }
  if (!isRequestOriginAllowed(req)) {
    return jsonResponse(req, { error: "This website is not permitted to call the review service." }, 403);
  }
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed." }, 405, { Allow: "POST, OPTIONS" });
  }

  let submissionId: string | null = null;
  let activeStage: PipelineStageDefinition | null = null;

  try {
    const supabaseUrl = requireEnvironmentVariable("SUPABASE_URL");
    const serviceRoleKey = requireEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY");
    const invocationApiKey = getInvocationApiKey();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const authorizationHeader = req.headers.get("Authorization");
    const userId = await authenticateRequest(authorizationHeader, adminClient);
    const requestBody = await readRequestBody(req);
    submissionId = requestBody.submission_id;

    const stateBefore = await loadPipelineState(adminClient, submissionId, userId);

    await ensureReviewAccessReservation(adminClient, submissionId);

    if (stateBefore.completed) {
      await ensureCompletedStatus(adminClient, submissionId);
      const finalization = await finalizeCompletedReview(adminClient, submissionId);
      return jsonResponse(req, buildStateResponse({
        state: stateBefore, stageCompleted: null, activeStage: null, childPayload: null,
        finalization, message: buildCompletedMessage(finalization),
      }), 200);
    }

    activeStage = resolveNextStage(stateBefore);
    if (!activeStage) {
      throw new HttpError(500, "The next review stage could not be determined.");
    }

    if (activeStage.databaseStage) {
      const runningStage = await findRecentRunningStage(adminClient, submissionId, activeStage.databaseStage);
      if (runningStage) {
        return jsonResponse(req, {
          ...buildStateResponse({
            state: stateBefore, stageCompleted: null, activeStage, childPayload: null,
            message: `${activeStage.label} is already in progress.`,
          }),
          retry_after_seconds: 10,
        }, 409, { "Retry-After": "10" });
      }
    }

    const childPayload = await invokePipelineStage({
      supabaseUrl, invocationApiKey,
      authorizationHeader: requireAuthorizationHeader(authorizationHeader),
      stage: activeStage, submissionId,
    });

    const stateAfter = await loadPipelineState(adminClient, submissionId, userId);

    let finalization: Record<string, unknown> | null = null;
    if (stateAfter.completed) {
      await ensureCompletedStatus(adminClient, submissionId);
      finalization = await finalizeCompletedReview(adminClient, submissionId);
    }

    const stageCompleted = didStageComplete(activeStage.key, stateBefore, stateAfter) ? activeStage.key : null;

    return jsonResponse(req, buildStateResponse({
      state: stateAfter, stageCompleted,
      activeStage: resolveNextStage(stateAfter),
      childPayload, finalization,
      message: stateAfter.completed ? buildCompletedMessage(finalization) : buildSuccessMessage(activeStage, stateAfter),
    }), 200);
  } catch (error) {
    const internalMessage = getErrorMessage(error);
    const publicError = error instanceof HttpError
      ? error
      : new HttpError(500, "An unexpected error occurred while preparing the IA review.", internalMessage);

    console.error("run-ia-pipeline failed", {
      submission_id: submissionId,
      stage: activeStage?.key ?? null,
      function_name: activeStage?.functionName ?? null,
      error: internalMessage,
    });

    return jsonResponse(req, {
      error: publicError.publicMessage,
      submission_id: submissionId,
      failed_stage: activeStage?.key ?? null,
      next_stage: activeStage?.key ?? null,
      completed: false,
      ...publicError.extra,
      orchestrator_version: ORCHESTRATOR_VERSION,
    }, publicError.status);
  }
});

async function loadPipelineState(
  adminClient: ReturnType<typeof createClient>,
  submissionId: string,
  userId: string,
): Promise<PipelineState> {
  const { data: submission, error: submissionError } = await adminClient
    .from("ia_submissions")
    .select([
      "id", "student_id", "subject", "status", "commercial_access", "extracted_text",
      "document_blocks_ready_at", "detailed_findings_ready_at", "annotated_artifact_ready_at",
      "completed_at", "deleted_at",
    ].join(","))
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError) throw new HttpError(500, "The submission could not be loaded.", submissionError.message);
  if (!submission || submission.deleted_at) throw new HttpError(404, "The submission was not found.");
  if (submission.student_id !== userId) throw new HttpError(403, "You do not have permission to access this submission.");

  const { count: documentBlockCount, error: documentBlockError } = await adminClient
    .from("ia_document_blocks")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (documentBlockError) throw new HttpError(500, "The saved document locations could not be checked.", documentBlockError.message);

  const { data: structureMap, error: structureError } = await adminClient
    .from("structure_maps").select("id").eq("submission_id", submissionId).maybeSingle();
  if (structureError) throw new HttpError(500, "The saved document structure could not be checked.", structureError.message);

  let rubricMapping: Record<string, any> | null = null;
  if (structureMap?.id) {
    const { data, error } = await adminClient
      .from("rubric_mappings")
      .select(["id", "rubric_version_id", "criterion_scores"].join(","))
      .eq("structure_map_id", structureMap.id)
      .maybeSingle();
    if (error) throw new HttpError(500, "The saved rubric mapping could not be checked.", error.message);
    rubricMapping = data;
  }

  let rubricMaximumMark: number | null = null;
  if (rubricMapping?.rubric_version_id) {
    const { data: rubricVersion, error: rubricVersionError } = await adminClient
      .from("rubric_versions").select("total_marks").eq("id", rubricMapping.rubric_version_id).maybeSingle();
    if (rubricVersionError) throw new HttpError(500, "The rubric configuration could not be checked.", rubricVersionError.message);
    rubricMaximumMark = normalizeNullableNumber(rubricVersion?.total_marks);
  }

  const expectedCriterionCodes = normalizeCriterionCodes(rubricMapping?.criterion_scores);

  let coachingOutput: Record<string, any> | null = null;
  if (rubricMapping?.id) {
    const { data, error } = await adminClient
      .from("coaching_outputs")
      .select(["id", "per_criterion", "detail_version"].join(","))
      .eq("rubric_mapping_id", rubricMapping.id)
      .maybeSingle();
    if (error) throw new HttpError(500, "The saved coaching output could not be checked.", error.message);
    coachingOutput = data;
  }

  const completedCoachingCodes = normalizeCompletedCoachingCodes(coachingOutput?.per_criterion, expectedCriterionCodes);

  let detailedFindingCodes: string[] = [];
  if (coachingOutput?.id) {
    const { data, error } = await adminClient
      .from("ia_detailed_findings")
      .select("criterion_code")
      .eq("submission_id", submissionId)
      .eq("coaching_output_id", coachingOutput.id);
    if (error) throw new HttpError(500, "The detailed findings could not be checked.", error.message);
    detailedFindingCodes = normalizeFindingCriterionCodes(data, expectedCriterionCodes);
  }

  const coachingComplete =
    expectedCriterionCodes.length > 0 &&
    completedCoachingCodes.length === expectedCriterionCodes.length &&
    detailedFindingCodes.length === expectedCriterionCodes.length &&
    coachingOutput?.detail_version === REQUIRED_DETAIL_VERSION &&
    Boolean(submission.detailed_findings_ready_at);

  const { data: artifactData, error: artifactError } = await adminClient
    .from("ia_review_artifacts")
    .select(["id", "status", "storage_bucket", "storage_path", "generated_at", "expires_at", "deleted_at"].join(","))
    .eq("submission_id", submissionId)
    .eq("artifact_type", "annotated_html")
    .maybeSingle();
  if (artifactError) throw new HttpError(500, "The annotated IA status could not be checked.", artifactError.message);

  const annotatedArtifact = artifactData as AnnotatedArtifactState | null;

  const annotatedArtifactReady = Boolean(
    annotatedArtifact &&
    annotatedArtifact.status === "ready" &&
    !annotatedArtifact.deleted_at &&
    (
      annotatedArtifact.expires_at === null ||
      (
        typeof annotatedArtifact.expires_at === "string" &&
        Number.isFinite(Date.parse(annotatedArtifact.expires_at)) &&
        Date.parse(annotatedArtifact.expires_at) > Date.now()
      )
    ),
  );

  const { data: progressPlan, error: progressPlanError } = await adminClient
    .from("progress_plans")
    .select("id, current_submission_id, targets")
    .eq("student_id", userId)
    .eq("subject", submission.subject)
    .maybeSingle();
  if (progressPlanError) throw new HttpError(500, "The saved progress plan could not be checked.", progressPlanError.message);

  const progressPlanReady =
    progressPlan?.current_submission_id === submissionId &&
    Array.isArray(progressPlan.targets) &&
    progressPlan.targets.length > 0;

  const isFreeReview = submission.commercial_access === "free_review";

  const freeCoachingDone =
    completedCoachingCodes.includes(FREE_CRITERION) &&
    detailedFindingCodes.includes(FREE_CRITERION);

  // A free review is complete once Research Design coaching exists.
  const completed = isFreeReview
    ? freeCoachingDone
    : coachingComplete && annotatedArtifactReady && progressPlanReady;

  return {
    submission,
    isFreeReview,
    freeCoachingDone,
    hasExtractedText:
      typeof submission.extracted_text === "string" &&
      submission.extracted_text.trim().length >= MIN_EXTRACTED_TEXT_LENGTH,
    hasDocumentBlocks: (documentBlockCount ?? 0) > 0,
    structureMapId: structureMap?.id ?? null,
    rubricMappingId: rubricMapping?.id ?? null,
    overallMarkRange: calculateOverallMarkRange(rubricMapping?.criterion_scores),
    maximumMark: rubricMaximumMark,
    expectedCriterionCodes,
    coachingOutputId: coachingOutput?.id ?? null,
    completedCoachingCodes,
    detailedFindingCodes,
    coachingComplete,
    annotatedArtifact,
    annotatedArtifactReady,
    progressPlanId: progressPlanReady ? progressPlan?.id ?? null : null,
    completed,
  };
}

function resolveNextStage(state: PipelineState): PipelineStageDefinition | null {
  if (state.completed) return null;
  if (state.annotatedArtifactReady && state.coachingComplete) return getStage("create_progress_plan");
  if (state.coachingComplete) return getStage("generate_annotated_ia");
  if (state.rubricMappingId) return getStage("generate_coaching");
  if (state.structureMapId) return getStage("map_to_rubric");
  if (state.hasExtractedText && state.hasDocumentBlocks) return getStage("extract_structure");
  return getStage("extract_document_text");
}

function calculateProgress(state: PipelineState): number {
  if (state.completed) return 100;
  if (state.annotatedArtifactReady) return 83;
  if (state.coachingComplete) return 67;

  if (state.rubricMappingId) {
    const total = state.isFreeReview ? 1 : state.expectedCriterionCodes.length;
    const completed = state.isFreeReview
      ? (state.freeCoachingDone ? 1 : 0)
      : state.detailedFindingCodes.length;
    const coachingShare = total > 0 ? Math.round((completed / total) * 17) : 0;
    return Math.min(66, 50 + coachingShare);
  }

  if (state.structureMapId) return 33;
  if (state.hasExtractedText && state.hasDocumentBlocks) return 17;
  return 0;
}

function getCompletedStages(state: PipelineState): PipelineStageKey[] {
  const completed: PipelineStageKey[] = [];
  if (state.hasExtractedText || state.hasDocumentBlocks || state.structureMapId || state.rubricMappingId) completed.push("extract_document_text");
  if (state.structureMapId || state.rubricMappingId) completed.push("extract_structure");
  if (state.rubricMappingId) completed.push("map_to_rubric");
  if (state.coachingComplete || (state.isFreeReview && state.freeCoachingDone)) completed.push("generate_coaching");
  if (state.annotatedArtifactReady) completed.push("generate_annotated_ia");
  if (state.completed && !state.isFreeReview) completed.push("create_progress_plan");
  return completed;
}

function didStageComplete(stage: PipelineStageKey, before: PipelineState, after: PipelineState): boolean {
  switch (stage) {
    case "extract_document_text":
      return (
        !(before.hasExtractedText && before.hasDocumentBlocks) &&
        ((after.hasExtractedText && after.hasDocumentBlocks) || Boolean(after.structureMapId))
      );
    case "extract_structure":
      return !before.structureMapId && Boolean(after.structureMapId);
    case "map_to_rubric":
      return !before.rubricMappingId && Boolean(after.rubricMappingId);
    case "generate_coaching":
      return after.isFreeReview
        ? !before.freeCoachingDone && after.freeCoachingDone
        : !before.coachingComplete && after.coachingComplete;
    case "generate_annotated_ia":
      return !before.annotatedArtifactReady && after.annotatedArtifactReady;
    case "create_progress_plan":
      return !before.completed && after.completed;
  }
}

function buildStateResponse(options: {
  state: PipelineState;
  stageCompleted: PipelineStageKey | null;
  activeStage: PipelineStageDefinition | null;
  childPayload: unknown;
  finalization?: Record<string, unknown> | null;
  message: string;
}) {
  const { state, stageCompleted, activeStage, childPayload, finalization = null, message } = options;

  const isFreeReview = state.isFreeReview;

  return {
    submission_id: state.submission.id,
    completed: state.completed,
    progress_percent: calculateProgress(state),
    completed_stages: getCompletedStages(state),
    stage_completed: stageCompleted,
    current_stage: activeStage?.key ?? null,
    next_stage: activeStage?.key ?? null,
    next_stage_label: activeStage?.label ?? null,
    current_status: state.submission.status,
    coaching_completed_count: isFreeReview ? (state.freeCoachingDone ? 1 : 0) : state.detailedFindingCodes.length,
    coaching_total_count: isFreeReview ? 1 : state.expectedCriterionCodes.length,
    coaching_completed_criteria: isFreeReview
      ? (state.freeCoachingDone ? [FREE_CRITERION] : [])
      : state.detailedFindingCodes,

    // Free reviews never receive the overall range or maximum mark.
    overall_mark_range: isFreeReview ? null : state.overallMarkRange,
    maximum_mark: isFreeReview ? null : state.maximumMark,

    annotated_ia_ready: state.annotatedArtifactReady,
    annotated_artifact_id: isFreeReview ? null : state.annotatedArtifact?.id ?? null,
    annotated_artifact_expires_at: isFreeReview ? null : state.annotatedArtifact?.expires_at ?? null,
    stage_metadata: getAccessAwareStageMetadata(childPayload, isFreeReview),
    finalization,
    report_saved: readBooleanValue(finalization?.report_saved),
    credit_consumed: readBooleanValue(finalization?.credit_consumed),
    commercial_access: readTextValue(finalization?.commercial_access),
    message,
    orchestrator_version: ORCHESTRATOR_VERSION,
  };
}

function buildSuccessMessage(completedStage: PipelineStageDefinition, state: PipelineState): string {
  if (completedStage.key === "generate_coaching" && !state.coachingComplete && !state.isFreeReview) {
    return `Detailed guidance completed for ${state.detailedFindingCodes.length} of ${state.expectedCriterionCodes.length} criteria.`;
  }
  if (completedStage.key === "generate_annotated_ia") {
    return "The annotated IA is ready. Building the progress plan next.";
  }
  return `${completedStage.label} completed successfully.`;
}

function normalizeCriterionCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const codes: string[] = [];
  for (const item of value) {
    if (
      isPlainObject(item) &&
      typeof item.criterion === "string" &&
      item.criterion.trim() &&
      !codes.includes(item.criterion.trim())
    ) {
      codes.push(item.criterion.trim());
    }
  }
  return codes;
}

function normalizeCompletedCoachingCodes(value: unknown, expectedCodes: string[]): string[] {
  if (!Array.isArray(value)) return [];
  const expected = new Set(expectedCodes);
  const completed: string[] = [];
  for (const item of value) {
    if (
      isPlainObject(item) &&
      typeof item.criterion === "string" &&
      expected.has(item.criterion) &&
      !completed.includes(item.criterion)
    ) {
      completed.push(item.criterion);
    }
  }
  return expectedCodes.filter((code) => completed.includes(code));
}

function normalizeFindingCriterionCodes(rows: unknown, expectedCodes: string[]): string[] {
  if (!Array.isArray(rows)) return [];
  const expected = new Set(expectedCodes);
  const found = new Set<string>();
  for (const row of rows) {
    if (isPlainObject(row) && typeof row.criterion_code === "string" && expected.has(row.criterion_code)) {
      found.add(row.criterion_code);
    }
  }
  return expectedCodes.filter((code) => found.has(code));
}

function getSafeStageMetadata(payload: unknown): Record<string, unknown> {
  if (!isPlainObject(payload)) return {};

  const allowedKeys = [
    "cached", "status", "prompt_version", "extractor_version", "artifact_version", "detail_version",
    "word_count", "character_count", "page_count", "block_count", "block_counts", "sentence_count",
    "section_count", "linked_block_count", "overall_mark_range", "maximum_mark", "plan_summary",
    "next_checkin_date", "completed_criterion", "completed_criteria", "total_criteria",
    "remaining_criteria", "detailed_finding_count", "detailed_findings_ready", "complete",
    "artifact_id", "artifact_type", "signed_url", "annotation_count", "generated_at", "expires_at",
  ];

  const metadata: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (payload[key] !== undefined) metadata[key] = payload[key];
  }
  return metadata;
}

async function authenticateRequest(
  authorizationHeader: string | null,
  adminClient: ReturnType<typeof createClient>,
): Promise<string> {
  if (!authorizationHeader?.startsWith("Bearer ")) throw new HttpError(401, "Authentication is required.");
  const token = authorizationHeader.slice("Bearer ".length).trim();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    throw new HttpError(401, "Your secure session is no longer valid. Please refresh the page.", error?.message);
  }
  return user.id;
}

async function readRequestBody(req: Request): Promise<{ submission_id: string }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "The request body must contain valid JSON.");
  }
  if (!isPlainObject(body) || typeof body.submission_id !== "string" || !isUuid(body.submission_id)) {
    throw new HttpError(400, "A valid submission_id is required.");
  }
  return { submission_id: body.submission_id };
}

function getStage(key: PipelineStageKey): PipelineStageDefinition {
  const stage = PIPELINE_STAGES.find((item) => item.key === key);
  if (!stage) throw new HttpError(500, "The requested pipeline stage is not configured.", key);
  return stage;
}

async function findRecentRunningStage(
  adminClient: ReturnType<typeof createClient>,
  submissionId: string,
  databaseStage: string,
) {
  const cutoff = new Date(Date.now() - RUNNING_STAGE_GRACE_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await adminClient
    .from("ia_pipeline_runs")
    .select("id, stage, status, attempt, started_at")
    .eq("submission_id", submissionId)
    .eq("stage", databaseStage)
    .eq("status", "running")
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(500, "The current review state could not be checked.", error.message);
  return data;
}

function getAccessAwareStageMetadata(payload: unknown, isFreeReview: boolean): Record<string, unknown> {
  const metadata = getSafeStageMetadata(payload);
  if (!isFreeReview) return metadata;

  delete metadata.signed_url;
  delete metadata.artifact_id;
  delete metadata.expires_at;
  delete metadata.plan_summary;
  delete metadata.next_checkin_date;
  delete metadata.overall_mark_range;
  delete metadata.maximum_mark;

  return metadata;
}

async function ensureReviewAccessReservation(
  adminClient: ReturnType<typeof createClient>,
  submissionId: string,
): Promise<void> {
  const { error } = await adminClient.rpc("reserve_ia_review_access_internal", {
    p_submission_id: submissionId,
    p_preferred_source: null,
  });
  if (error) throw new HttpError(402, getFriendlyAccessMessage(error.message), error.message);
}

async function finalizeCompletedReview(
  adminClient: ReturnType<typeof createClient>,
  submissionId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await adminClient.rpc("finalize_ia_review_success", { p_submission_id: submissionId });
  if (error) {
    throw new HttpError(
      500,
      "The review is complete, but its account access is still being finalised. Please continue the review once more.",
      error.message,
    );
  }
  return isPlainObject(data) ? data : {};
}

function buildCompletedMessage(finalization: Record<string, unknown> | null): string {
  const commercialAccess = readTextValue(finalization?.commercial_access);
  if (commercialAccess === "free_review") {
    return "Your free Research Design review is ready.";
  }
  if (readBooleanValue(finalization?.report_saved)) {
    return "Your review is ready and has been saved automatically to My IA Reports.";
  }
  return "Your complete IA review is ready.";
}

function getFriendlyAccessMessage(rawMessage: string): string {
  const message = rawMessage.toLowerCase();
  if (message.includes("already in progress") || message.includes("duplicate key")) {
    return "Another IA review is already in progress for this account.";
  }
  if (message.includes("no ia review allowance") || message.includes("no review allowance")) {
    return "No IA review allowance is currently available for this account.";
  }
  return "Your review access could not be confirmed. Please return to My Account and try again.";
}

function readBooleanValue(value: unknown): boolean {
  return value === true;
}

function readTextValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function invokePipelineStage(options: {
  supabaseUrl: string;
  invocationApiKey: string;
  authorizationHeader: string;
  stage: PipelineStageDefinition;
  submissionId: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHILD_FUNCTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${options.supabaseUrl}/functions/v1/${options.stage.functionName}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: options.authorizationHeader,
        apikey: options.invocationApiKey,
        "Content-Type": "application/json",
        "X-Client-Info": `ia-pipeline-orchestrator/${ORCHESTRATOR_VERSION}`,
      },
      body: JSON.stringify({ submission_id: options.submissionId, force: false }),
    });

    const responseText = await response.text();
    const payload = parsePossibleJson(responseText);

    if (!response.ok) {
      const childMessage =
        isPlainObject(payload) && typeof payload.error === "string"
          ? payload.error
          : `${options.stage.label} could not be completed.`;

      throw new HttpError(
        response.status,
        childMessage,
        `Child function ${options.stage.functionName} returned HTTP ${response.status}: ${responseText}`,
        { child_function: options.stage.functionName, child_status: response.status },
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(
        504,
        `${options.stage.label} took too long. Please try again.`,
        `Child function ${options.stage.functionName} timed out.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureCompletedStatus(
  adminClient: ReturnType<typeof createClient>,
  submissionId: string,
): Promise<void> {
  const { error } = await adminClient
    .from("ia_submissions")
    .update({
      status: "completed",
      failure_stage: null,
      failure_message: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .neq("status", "completed");

  if (error) throw new HttpError(500, "The completed review status could not be saved.", error.message);
}

function getInvocationApiKey(): string {
  const legacyAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (legacyAnonKey) return legacyAnonKey;

  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")?.trim();
  if (publishableKey) return publishableKey;

  const publishableKeysJson = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeysJson) {
    try {
      const parsed = JSON.parse(publishableKeysJson);
      if (isPlainObject(parsed)) {
        const defaultKey = typeof parsed.default === "string" ? parsed.default.trim() : "";
        if (defaultKey) return defaultKey;

        const firstKey = Object.values(parsed).find((value) => typeof value === "string" && value.trim());
        if (typeof firstKey === "string") return firstKey.trim();
      }
    } catch {
      throw new HttpError(500, "The server configuration is incomplete.", "SUPABASE_PUBLISHABLE_KEYS is not valid JSON.");
    }
  }

  throw new HttpError(500, "The server configuration is incomplete.", "No Supabase publishable or anon key is available.");
}

function requireAuthorizationHeader(value: string | null): string {
  if (!value?.startsWith("Bearer ")) throw new HttpError(401, "Authentication is required.");
  return value;
}

function parsePossibleJson(value: string): unknown {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return { raw_response: truncateText(value, 1000) };
  }
}

function calculateOverallMarkRange(criterionScores: unknown): [number, number] | null {
  if (!Array.isArray(criterionScores) || criterionScores.length === 0) return null;

  let minimum = 0;
  let maximum = 0;

  for (const score of criterionScores) {
    if (
      !isPlainObject(score) ||
      !Array.isArray(score.indicative_mark_range) ||
      score.indicative_mark_range.length !== 2
    ) {
      return null;
    }

    const lower = score.indicative_mark_range[0];
    const upper = score.indicative_mark_range[1];

    if (
      typeof lower !== "number" || typeof upper !== "number" ||
      !Number.isFinite(lower) || !Number.isFinite(upper)
    ) {
      return null;
    }

    minimum += lower;
    maximum += upper;
  }

  return [minimum, maximum];
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin");
  const configuredOrigins = getConfiguredOrigins();

  let allowedOrigin = "*";
  if (origin && configuredOrigins.length > 0) {
    allowedOrigin = isOriginAllowed(origin, configuredOrigins) ? origin : "null";
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
}

function isRequestOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("Origin");
  const configuredOrigins = getConfiguredOrigins();
  return (!origin || configuredOrigins.length === 0) ? true : isOriginAllowed(origin, configuredOrigins);
}

function getConfiguredOrigins(): string[] {
  return (
    Deno.env.get("ALLOWED_ORIGINS")?.split(",").map((value) => value.trim()).filter(Boolean) ?? []
  );
}

function isOriginAllowed(origin: string, configuredOrigins: string[]): boolean {
  return configuredOrigins.some((configuredOrigin) => {
    if (configuredOrigin === "*" || configuredOrigin === origin) return true;

    if (configuredOrigin.startsWith("*.")) {
      try {
        return new URL(origin).hostname.endsWith(configuredOrigin.slice(1));
      } catch {
        return false;
      }
    }

    return false;
  });
}

function jsonResponse(req: Request, body: unknown, status: number, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), ...extraHeaders },
  });
}

function requireEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new HttpError(500, "The server configuration is incomplete.", `Missing ${name}.`);
  return value;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function truncateText(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(0, maximumLength - 1)}…`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
