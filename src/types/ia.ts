export const PDF_MIME_TYPE = 'application/pdf';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type SupportedIaMimeType = typeof PDF_MIME_TYPE | typeof DOCX_MIME_TYPE;

export type IaCommercialAccess =
  | 'unassigned'
  | 'free_review'
  | 'paid_credit'
  | 'complimentary';

export type IaReviewAccessSource =
  | 'free_review'
  | 'paid_credit';

export type IaCreditReservationStatus =
  | 'reserved'
  | 'consumed'
  | 'released';

export type ValidatedIaFile = {
  file: File;
  filename: string;
  mimeType: SupportedIaMimeType;
  sizeBytes: number;
  sizeLabel: string;
  extension: 'pdf' | 'docx';
};

export type IaSubmission = {
  id: string;
  student_id: string;
  subject: string;
  draft_version: number;
  original_filename: string;
  mime_type: SupportedIaMimeType;
  file_size_bytes: number;
  raw_file_bucket: string;
  raw_file_path: string;
  raw_file_expires_at: string;
  status: string;
  uploaded_at: string;

  commercial_access?: IaCommercialAccess;
  credit_reservation_id?: string | null;
  access_expires_at?: string | null;
  retention_policy?: string;
  saved_at?: string | null;
  completed_at?: string | null;
};

export type ActiveIaReviewReservation = {
  id: string;
  source_type: Exclude<IaCommercialAccess, 'unassigned'>;
  status: IaCreditReservationStatus;
  reserved_at: string;
};

export type ActiveIaReviewResponse = {
  active: boolean;
  submission?: IaSubmission;
  reservation?: ActiveIaReviewReservation;
};

export const PIPELINE_STAGE_KEYS = [
  'extract_document_text',
  'extract_structure',
  'map_to_rubric',
  'generate_coaching',
  'generate_annotated_ia',
  'create_progress_plan',
] as const;

export type PipelineStageKey = (typeof PIPELINE_STAGE_KEYS)[number];

export type PipelineStageDefinition = {
  key: PipelineStageKey;
  number: number;
  title: string;
  description: string;
};

export type PipelineStageMetadata = {
  cached?: boolean;
  status?: string;

  prompt_version?: string;
  extractor_version?: string;
  artifact_version?: string;
  detail_version?: string;

  word_count?: number;
  character_count?: number;
  page_count?: number | null;

  block_count?: number;
  block_counts?: Record<string, number>;

  sentence_count?: number;
  section_count?: number;
  linked_block_count?: number;

  overall_mark_range?: [number, number];
  maximum_mark?: number;

  plan_summary?: string;
  next_checkin_date?: string;

  completed_criterion?: string | null;
  completed_criteria?: number;
  total_criteria?: number;
  remaining_criteria?: string[];

  detailed_finding_count?: number;
  detailed_findings_ready?: boolean;

  artifact_id?: string;
  artifact_type?: string;
  signed_url?: string;
  annotation_count?: number;
  generated_at?: string;
  expires_at?: string;

  complete?: boolean;
};

export type PipelineFinalization = {
  finalized?: boolean;
  submission_id?: string;
  reservation_id?: string;
  reservation_status?: IaCreditReservationStatus;
  commercial_access?: IaCommercialAccess;
  credit_consumed?: boolean;
  report_saved?: boolean;
  saved_artifact_count?: number;
  finalized_at?: string;
};

export type RunIaPipelineResponse = {
  submission_id: string;
  completed: boolean;
  progress_percent: number;

  completed_stages?: PipelineStageKey[];

  stage_completed: PipelineStageKey | null;
  current_stage?: PipelineStageKey | null;
  current_status?: string;

  next_stage: PipelineStageKey | null;
  next_stage_label?: string | null;

  message?: string;
  retry_after_seconds?: number;

  failed_stage?: PipelineStageKey | null;
  stage_metadata?: PipelineStageMetadata;

  coaching_completed_count?: number;
  coaching_total_count?: number;
  coaching_completed_criteria?: string[];

  overall_mark_range?: [number, number] | null;
  maximum_mark?: number | null;

  annotated_ia_ready?: boolean;
  annotated_artifact_id?: string | null;
  annotated_artifact_expires_at?: string | null;

  finalization?: PipelineFinalization | null;
  report_saved?: boolean;
  credit_consumed?: boolean;
  commercial_access?: IaCommercialAccess | null;

  orchestrator_version?: string;
};

export type PipelineProgress = {
  submissionId: string;
  progressPercent: number;
  currentStage: PipelineStageKey | null;
  completedStages: PipelineStageKey[];
  message: string;
  coachingCompletedCount: number;
  coachingTotalCount: number;
};

export type PipelineCompletion = {
  submissionId: string;

  overallMarkRange: [number, number] | null;
  maximumMark: number | null;

  planSummary: string | null;
  nextCheckinDate: string | null;

  annotatedIaUrl: string | null;
  annotatedArtifactId: string | null;
  annotatedArtifactExpiresAt: string | null;

  reportSaved: boolean;
  creditConsumed: boolean;
  commercialAccess: IaCommercialAccess | null;
  finalizedAt: string | null;

  completedAt: string;
};
