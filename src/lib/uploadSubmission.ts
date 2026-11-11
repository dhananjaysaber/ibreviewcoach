import { ensureAnonymousSession } from './anonymousSession';
import { supabase } from './supabase';
import type {
  IaReviewAccessSource,
  IaSubmission,
  ValidatedIaFile,
} from '../types/ia';

type CreateSubmissionResponse = IaSubmission | IaSubmission[] | null;

type ReservationResponse = {
  reservation_id?: string;
  submission_id?: string;
  source_type?: string;
  status?: string;
};

export async function uploadIaSubmission(
  validatedFile: ValidatedIaFile,
  requestedSource: IaReviewAccessSource,
  subject: string
): Promise<IaSubmission> {
  await ensureAnonymousSession();

  const { data, error: createError } = await supabase.rpc(
    'create_ia_submission',
    {
      p_subject: subject,
      p_original_filename: validatedFile.filename,
      p_mime_type: validatedFile.mimeType,
      p_file_size_bytes: validatedFile.sizeBytes,
    }
  );

  if (createError) {
    console.error('Submission creation failed', createError);

    throw new Error(getFriendlySubmissionError(createError.message));
  }

  const submission = normalizeSubmissionResponse(
    data as CreateSubmissionResponse
  );

  try {
    const { data: reservationData, error: reservationError } =
      await supabase.rpc(
        'reserve_my_ia_review_access_strict',
        {
          p_submission_id: submission.id,
          p_requested_source: requestedSource,
        }
      );

    if (reservationError) {
      throw reservationError;
    }

    const reservation = normalizeReservationResponse(reservationData);

    submission.commercial_access =
      reservation.source_type === 'paid_credit' ||
      reservation.source_type === 'complimentary' ||
      reservation.source_type === 'free_review'
        ? reservation.source_type
        : submission.commercial_access;

    submission.credit_reservation_id =
      reservation.reservation_id ?? null;

    window.dispatchEvent(
      new CustomEvent('ia-active-review-changed')
    );

    window.dispatchEvent(
      new CustomEvent('ia-credit-balance-changed')
    );
  } catch (error) {
    console.error('Review access could not be reserved', error);

    throw new Error(
      getFriendlyReservationError(getErrorMessage(error))
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(submission.raw_file_bucket || 'ia-uploads')
    .upload(submission.raw_file_path, validatedFile.file, {
      contentType: validatedFile.mimeType,
      cacheControl: '0',
      upsert: false,
    });

  if (uploadError) {
    console.error('Secure upload failed', uploadError);

    await releaseReservedReview(submission.id, 'upload_failed');

    throw new Error(
      'The document could not be uploaded securely. Your review allowance was not used. Please choose the file again and retry.'
    );
  }

  return submission;
}

async function releaseReservedReview(
  submissionId: string,
  reason: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc(
      'release_my_ia_review_access',
      {
        p_submission_id: submissionId,
        p_release_reason: reason,
      }
    );

    if (error) {
      console.error('Reserved review could not be released', error);
    }
  } catch (error) {
    console.error('Reserved review release failed', error);
  } finally {
    window.dispatchEvent(
      new CustomEvent('ia-active-review-changed')
    );

    window.dispatchEvent(
      new CustomEvent('ia-credit-balance-changed')
    );
  }
}

function normalizeSubmissionResponse(
  data: CreateSubmissionResponse
): IaSubmission {
  const submission = Array.isArray(data) ? data[0] : data;

  if (
    !submission ||
    typeof submission.id !== 'string' ||
    typeof submission.raw_file_path !== 'string'
  ) {
    throw new Error(
      'The secure upload record could not be prepared. Please try again.'
    );
  }

  return submission;
}

function normalizeReservationResponse(
  data: unknown
): ReservationResponse {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data)
  ) {
    return {};
  }

  return data as ReservationResponse;
}

function getFriendlySubmissionError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('authentication')) {
    return 'Your secure session has expired. Please refresh the page and try again.';
  }

  if (message.includes('only pdf') || message.includes('docx')) {
    return 'Please select a valid PDF or DOCX document.';
  }

  if (message.includes('20 mb') || message.includes('maximum file size')) {
    return 'The document is larger than 20 MB. Please choose a smaller file.';
  }

  if (message.includes('rubric')) {
    return 'The SEHS review criteria are temporarily unavailable. Please try again later.';
  }

  return 'The secure review could not be prepared. Please try again.';
}

function getFriendlyReservationError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (
    message.includes('another ia review') ||
    message.includes('already in progress') ||
    message.includes('duplicate key')
  ) {
    return 'An IA review is already in progress for this account. Open the current review instead of starting another.';
  }

  if (
    message.includes('no full ia review credit') ||
    message.includes('free limited ia review has already been used')
  ) {
    return 'The selected review option is no longer available. Return to review options and choose again.';
  }

  if (
    message.includes('no ia review allowance') ||
    message.includes('no review allowance')
  ) {
    return 'No selected review access is currently available. Choose the free limited review or purchase a full review credit.';
  }

  if (
    message.includes('create and verify') ||
    message.includes('authentication')
  ) {
    return 'Create and verify your account before starting an IA review.';
  }

  return 'Your review allowance could not be reserved. Please refresh the page and try again.';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Unknown error';
}
