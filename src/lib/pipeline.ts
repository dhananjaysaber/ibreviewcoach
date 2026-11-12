import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { ensureAnonymousSession } from './anonymousSession';
import { supabase } from './supabase';

import {
  PIPELINE_STAGE_KEYS,
  type PipelineCompletion,
  type PipelineFinalization,
  type PipelineProgress,
  type PipelineStageDefinition,
  type PipelineStageKey,
  type PipelineStageMetadata,
  type RunIaPipelineResponse,
} from '../types/ia';

const MAX_PIPELINE_REQUESTS = 40;
const NEXT_STAGE_DELAY_MS = 700;
const DEFAULT_RETRY_DELAY_MS = 10_000;
const PIPELINE_PROGRESS_STORAGE_PREFIX =
  'sehs-ia-pipeline-progress:';

export const PIPELINE_STAGES: PipelineStageDefinition[] = [
  {
    key: 'extract_document_text',
    number: 1,
    title: 'Reading your document',
    description:
      'Securely preparing the text, headings, paragraphs and document locations.',
  },
  {
    key: 'extract_structure',
    number: 2,
    title: 'Identifying its structure',
    description:
      'Locating sections, sentences, the research question and variables.',
  },
  {
    key: 'map_to_rubric',
    number: 3,
    title: 'Reviewing rubric evidence',
    description:
      'Checking the evidence demonstrated against each assessment criterion.',
  },
  {
    key: 'generate_coaching',
    number: 4,
    title: 'Preparing detailed guidance',
    description:
      'Creating specific findings, actions, required elements and completion checks.',
  },
  {
    key: 'generate_annotated_ia',
    number: 5,
    title: 'Annotating your IA',
    description:
      'Linking detailed review comments to the exact sections and sentences in your draft.',
  },
  {
    key: 'create_progress_plan',
    number: 6,
    title: 'Building your progress plan',
    description:
      'Organising the highest-priority next steps into a manageable plan.',
  },
];

type RunPipelineOptions = {
  submissionId: string;
  onProgress: (progress: PipelineProgress) => void;
  isCancelled?: () => boolean;
};

type FunctionErrorPayload = {
  error?: string;
  next_stage?: unknown;
  failed_stage?: unknown;
  retry_after_seconds?: unknown;
};

type CompletionAccumulator = {
  overallMarkRange: [number, number] | null;
  maximumMark: number | null;

  planSummary: string | null;
  nextCheckinDate: string | null;

  annotatedIaUrl: string | null;
  annotatedArtifactId: string | null;
  annotatedArtifactExpiresAt: string | null;

  finalization: PipelineFinalization | null;
};

export class PipelineError extends Error {
  failedStage: PipelineStageKey | null;
  retryable: boolean;

  constructor(
    message: string,
    options: {
      failedStage?: PipelineStageKey | null;
      retryable?: boolean;
    } = {},
  ) {
    super(message);

    this.name = 'PipelineError';
    this.failedStage = options.failedStage ?? null;
    this.retryable = options.retryable ?? true;
  }
}

export function createInitialPipelineProgress(
  submissionId: string,
): PipelineProgress {
  return {
    submissionId,
    progressPercent: 0,
    currentStage: 'extract_document_text',
    completedStages: [],
    message: 'Preparing to read your document.',
    coachingCompletedCount: 0,
    coachingTotalCount: 0,
  };
}

export async function runIaPipelineToCompletion({
  submissionId,
  onProgress,
  isCancelled = () => false,
}: RunPipelineOptions): Promise<PipelineCompletion> {
  await ensureAnonymousSession();

  let progress =
    loadSavedPipelineProgress(submissionId) ??
    createInitialPipelineProgress(submissionId);

  const stageMetadata =
    new Map<PipelineStageKey, PipelineStageMetadata>();

  const completion: CompletionAccumulator = {
    overallMarkRange: null,
    maximumMark: null,

    planSummary: null,
    nextCheckinDate: null,

    annotatedIaUrl: null,
    annotatedArtifactId: null,
    annotatedArtifactExpiresAt: null,

    finalization: null,
  };

  /*
    Do not emit a locally-created Step 1 state before the server checks saved
    progress. On retry, the existing screen should remain unchanged until the
    authoritative backend state is returned.
  */

  for (
    let requestNumber = 1;
    requestNumber <= MAX_PIPELINE_REQUESTS;
    requestNumber += 1
  ) {
    assertNotCancelled(isCancelled);

    const activeStage =
      progress.currentStage ??
      resolveFirstIncompleteStage(progress);

    progress = {
      ...progress,
      currentStage: activeStage,
      message: buildProgressMessage(
        activeStage,
        progress.coachingCompletedCount,
        progress.coachingTotalCount,
      ),
    };

    const { data, error } =
      await supabase.functions.invoke<RunIaPipelineResponse>(
        'run-ia-pipeline',
        {
          body: {
            submission_id: submissionId,
          },
        },
      );

    assertNotCancelled(isCancelled);

    if (error) {
      const details =
        await readFunctionError(error);

      if (details.status === 409) {
        const retryStage =
          normalizeStage(details.payload?.next_stage) ??
          progress.currentStage;

        const retrySeconds =
          normalizeRetrySeconds(
            details.payload?.retry_after_seconds,
          );

        progress = {
          ...progress,
          currentStage: retryStage,
          message: retryStage
            ? `${getStageDefinition(retryStage).title} is still in progress.`
            : 'Your review is still being prepared.',
        };

        savePipelineProgress(progress);
        onProgress(progress);

        await wait(
          retrySeconds * 1000,
          isCancelled,
        );

        continue;
      }

      console.error('Pipeline invocation failed', {
        error,
        status: details.status,
        payload: details.payload,
      });

      const failedStage =
        normalizeStage(details.payload?.failed_stage) ??
        progress.currentStage;

      throw new PipelineError(
        getFriendlyPipelineError(
          failedStage,
          details.payload?.error,
        ),
        {
          failedStage,
          retryable: true,
        },
      );
    }

    if (!isPipelineResponse(data)) {
      console.error(
        'Invalid pipeline response',
        data,
      );

      throw new PipelineError(
        'The review service returned an unexpected response. Please try again.',
        {
          failedStage:
            progress.currentStage,
        },
      );
    }

    updateCompletionAccumulator(
      completion,
      data,
    );

    if (
      data.stage_completed &&
      data.stage_metadata
    ) {
      stageMetadata.set(
        data.stage_completed,
        data.stage_metadata,
      );
    }

    const completedStages =
      normalizeCompletedStages(
        data.completed_stages,
        progress.completedStages,
        data.stage_completed,
      );

    const coachingCompletedCount =
      normalizeCount(
        data.coaching_completed_count,
      );

    const coachingTotalCount =
      normalizeCount(
        data.coaching_total_count,
      );

    progress = {
      submissionId,

      progressPercent:
        clampProgress(
          data.progress_percent,
          completedStages.length,
        ),

      currentStage:
        data.completed
          ? null
          : data.next_stage,

      completedStages,

      coachingCompletedCount,
      coachingTotalCount,

      message:
        data.completed
          ? data.commercial_access === 'free_review'
            ? 'Your free Research Design review is ready.'
            : 'Your detailed review, annotated IA and progress plan are ready.'
          : data.message ??
            buildProgressMessage(
              data.next_stage,
              coachingCompletedCount,
              coachingTotalCount,
            ),
    };

    savePipelineProgress(progress);
    onProgress(progress);

    if (data.completed) {
      clearSavedPipelineProgress(submissionId);

      return buildCompletion(
        submissionId,
        stageMetadata,
        completion,
      );
    }

    await wait(
      NEXT_STAGE_DELAY_MS,
      isCancelled,
    );
  }

  throw new PipelineError(
    'The review is taking longer than expected. Please try continuing the review.',
    {
      failedStage:
        progress.currentStage,
      retryable: true,
    },
  );
}

function updateCompletionAccumulator(
  completion: CompletionAccumulator,
  data: RunIaPipelineResponse,
): void {
  if (data.finalization && typeof data.finalization === 'object') {
    completion.finalization = data.finalization;
  }

  if (
    isNumberTuple(
      data.overall_mark_range,
    )
  ) {
    completion.overallMarkRange =
      data.overall_mark_range;
  }

  if (
    typeof data.maximum_mark === 'number' &&
    Number.isFinite(data.maximum_mark)
  ) {
    completion.maximumMark =
      data.maximum_mark;
  }

  if (
    typeof data.annotated_artifact_id === 'string'
  ) {
    completion.annotatedArtifactId =
      data.annotated_artifact_id;
  }

  if (
    typeof data.annotated_artifact_expires_at === 'string'
  ) {
    completion.annotatedArtifactExpiresAt =
      data.annotated_artifact_expires_at;
  }

  const metadata =
    data.stage_metadata;

  if (!metadata) {
    return;
  }

  if (
    typeof metadata.plan_summary === 'string'
  ) {
    completion.planSummary =
      metadata.plan_summary;
  }

  if (
    typeof metadata.next_checkin_date === 'string'
  ) {
    completion.nextCheckinDate =
      metadata.next_checkin_date;
  }

  if (
    typeof metadata.signed_url === 'string'
  ) {
    completion.annotatedIaUrl =
      metadata.signed_url;
  }

  if (
    typeof metadata.artifact_id === 'string'
  ) {
    completion.annotatedArtifactId =
      metadata.artifact_id;
  }

  if (
    typeof metadata.expires_at === 'string'
  ) {
    completion.annotatedArtifactExpiresAt =
      metadata.expires_at;
  }
}

function getProgressStorageKey(
  submissionId: string,
): string {
  return `${PIPELINE_PROGRESS_STORAGE_PREFIX}${submissionId}`;
}

export function loadSavedPipelineProgress(
  submissionId: string,
): PipelineProgress | null {
  try {
    const raw =
      window.sessionStorage.getItem(
        getProgressStorageKey(submissionId),
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as Partial<PipelineProgress>;

    if (
      parsed.submissionId !== submissionId ||
      typeof parsed.progressPercent !== 'number' ||
      !Array.isArray(parsed.completedStages)
    ) {
      return null;
    }

    const completedStages =
      parsed.completedStages
        .map((stage) => normalizeStage(stage))
        .filter(
          (stage): stage is PipelineStageKey =>
            stage !== null,
        );

    return {
      submissionId,
      progressPercent: Math.min(
        100,
        Math.max(
          0,
          Math.round(parsed.progressPercent),
        ),
      ),
      currentStage:
        normalizeStage(parsed.currentStage),
      completedStages,
      message:
        typeof parsed.message === 'string'
          ? parsed.message
          : 'Checking saved review progress.',
      coachingCompletedCount:
        normalizeCount(parsed.coachingCompletedCount),
      coachingTotalCount:
        normalizeCount(parsed.coachingTotalCount),
    };
  } catch {
    return null;
  }
}

function savePipelineProgress(
  progress: PipelineProgress,
): void {
  try {
    window.sessionStorage.setItem(
      getProgressStorageKey(progress.submissionId),
      JSON.stringify(progress),
    );
  } catch {
    // Browser storage is optional. The backend remains authoritative.
  }
}

function clearSavedPipelineProgress(
  submissionId: string,
): void {
  try {
    window.sessionStorage.removeItem(
      getProgressStorageKey(submissionId),
    );
  } catch {
    // Browser storage is optional.
  }
}

function buildProgressMessage(
  stage: PipelineStageKey | null,
  coachingCompleted: number,
  coachingTotal: number,
): string {
  if (
    stage === 'generate_coaching' &&
    coachingTotal > 0
  ) {
    return `Preparing detailed guidance: ${coachingCompleted} of ${coachingTotal} criteria complete.`;
  }

  return stage
    ? getStageDefinition(stage).description
    : 'Finalising your review.';
}

function buildCompletion(
  submissionId: string,
  metadata: Map<PipelineStageKey, PipelineStageMetadata>,
  accumulated: CompletionAccumulator,
): PipelineCompletion {
  const rubricMetadata =
    metadata.get('map_to_rubric');

  const annotationMetadata =
    metadata.get('generate_annotated_ia');

  const planMetadata =
    metadata.get('create_progress_plan');

  return {
    submissionId,

    overallMarkRange:
      accumulated.overallMarkRange ??
      (
        isNumberTuple(
          rubricMetadata?.overall_mark_range,
        )
          ? rubricMetadata.overall_mark_range
          : null
      ),

    maximumMark:
      accumulated.maximumMark ??
      (
        typeof rubricMetadata?.maximum_mark === 'number'
          ? rubricMetadata.maximum_mark
          : null
      ),

    planSummary:
      accumulated.planSummary ??
      (
        typeof planMetadata?.plan_summary === 'string'
          ? planMetadata.plan_summary
          : null
      ),

    nextCheckinDate:
      accumulated.nextCheckinDate ??
      (
        typeof planMetadata?.next_checkin_date === 'string'
          ? planMetadata.next_checkin_date
          : null
      ),

    annotatedIaUrl:
      accumulated.annotatedIaUrl ??
      (
        typeof annotationMetadata?.signed_url === 'string'
          ? annotationMetadata.signed_url
          : null
      ),

    annotatedArtifactId:
      accumulated.annotatedArtifactId ??
      (
        typeof annotationMetadata?.artifact_id === 'string'
          ? annotationMetadata.artifact_id
          : null
      ),

    annotatedArtifactExpiresAt:
      accumulated.annotatedArtifactExpiresAt ??
      (
        typeof annotationMetadata?.expires_at === 'string'
          ? annotationMetadata.expires_at
          : null
      ),

    reportSaved:
      accumulated.finalization?.report_saved === true,

    creditConsumed:
      accumulated.finalization?.credit_consumed === true,

    commercialAccess:
      accumulated.finalization?.commercial_access ?? null,

    finalizedAt:
      typeof accumulated.finalization?.finalized_at === 'string'
        ? accumulated.finalization.finalized_at
        : null,

    completedAt:
      new Date().toISOString(),
  };
}

function normalizeCompletedStages(
  authoritative: unknown,
  existing: PipelineStageKey[],
  stageCompleted: PipelineStageKey | null,
): PipelineStageKey[] {
  const completed =
    new Set<PipelineStageKey>();

  if (
    Array.isArray(authoritative)
  ) {
    for (
      const value of authoritative
    ) {
      const stage =
        normalizeStage(value);

      if (stage) {
        completed.add(stage);
      }
    }
  } else {
    for (
      const stage of existing
    ) {
      completed.add(stage);
    }

    if (stageCompleted) {
      completed.add(stageCompleted);
    }
  }

  return PIPELINE_STAGE_KEYS.filter(
    (stage) =>
      completed.has(stage),
  );
}

function resolveFirstIncompleteStage(
  progress: PipelineProgress,
): PipelineStageKey | null {
  return (
    PIPELINE_STAGE_KEYS.find(
      (stage) =>
        !progress.completedStages.includes(stage),
    ) ??
    null
  );
}

function getStageDefinition(
  key: PipelineStageKey,
): PipelineStageDefinition {
  const stage =
    PIPELINE_STAGES.find(
      (item) =>
        item.key === key,
    );

  if (!stage) {
    throw new PipelineError(
      'The next review stage could not be determined.',
    );
  }

  return stage;
}

async function readFunctionError(
  error: unknown,
): Promise<{
  status: number | null;
  payload: FunctionErrorPayload | null;
}> {
  if (
    error instanceof FunctionsHttpError
  ) {
    let payload:
      FunctionErrorPayload | null =
      null;

    try {
      payload =
        (
          await error.context
            .clone()
            .json()
        ) as FunctionErrorPayload;
    } catch {
      payload = null;
    }

    return {
      status:
        error.context.status,
      payload,
    };
  }

  if (
    error instanceof FunctionsRelayError
  ) {
    console.error(
      'Review gateway error',
      error,
    );
  }

  if (
    error instanceof FunctionsFetchError
  ) {
    console.error(
      'Review connection error',
      error,
    );
  }

  return {
    status: null,
    payload: null,
  };
}

function getFriendlyPipelineError(
  stage: PipelineStageKey | null,
  serverMessage?: string,
): string {
  if (
    serverMessage?.trim()
  ) {
    return serverMessage;
  }

  switch (stage) {
    case 'extract_document_text':
      return 'The document could not be read. Confirm that it is a searchable PDF or a valid DOCX file, then try again.';

    case 'extract_structure':
      return 'The document structure and locations could not be prepared. Please try continuing the review.';

    case 'map_to_rubric':
      return 'The rubric review could not be completed. Please try continuing the review.';

    case 'generate_coaching':
      return 'The detailed criterion guidance could not be completed. Please try continuing the review.';

    case 'generate_annotated_ia':
      return 'The annotated IA could not be prepared. Please try continuing the review.';

    case 'create_progress_plan':
      return 'The progress plan could not be completed. Please try continuing the review.';

    default:
      return 'The review could not be completed. Please try again.';
  }
}

function normalizeStage(
  value: unknown,
): PipelineStageKey | null {
  if (
    typeof value === 'string' &&
    PIPELINE_STAGE_KEYS.includes(
      value as PipelineStageKey,
    )
  ) {
    return value as PipelineStageKey;
  }

  return null;
}

function normalizeCount(
  value: unknown,
): number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
    ? Math.trunc(value)
    : 0;
}

function normalizeRetrySeconds(
  value: unknown,
): number {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 60
  ) {
    return Math.trunc(value);
  }

  return (
    DEFAULT_RETRY_DELAY_MS /
    1000
  );
}

function clampProgress(
  value: unknown,
  completedCount: number,
): number {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(value),
      ),
    );
  }

  return Math.round(
    (
      completedCount /
      PIPELINE_STAGE_KEYS.length
    ) * 100,
  );
}

function isPipelineResponse(
  value: unknown,
): value is RunIaPipelineResponse {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const response =
    value as Partial<RunIaPipelineResponse>;

  return (
    typeof response.submission_id === 'string' &&
    typeof response.completed === 'boolean' &&
    typeof response.progress_percent === 'number'
  );
}

function isNumberTuple(
  value: unknown,
): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (item) =>
        typeof item === 'number' &&
        Number.isFinite(item),
    )
  );
}

async function wait(
  milliseconds: number,
  isCancelled: () => boolean,
): Promise<void> {
  const interval = 200;
  let elapsed = 0;

  while (
    elapsed < milliseconds
  ) {
    assertNotCancelled(
      isCancelled,
    );

    const nextWait =
      Math.min(
        interval,
        milliseconds -
          elapsed,
      );

    await new Promise<void>(
      (resolve) => {
        window.setTimeout(
          resolve,
          nextWait,
        );
      },
    );

    elapsed +=
      nextWait;
  }
}

function assertNotCancelled(
  isCancelled: () => boolean,
): void {
  if (
    isCancelled()
  ) {
    throw new PipelineError(
      'The review was cancelled.',
      {
        retryable: false,
      },
    );
  }
}

