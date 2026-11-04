import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LoaderCircle,
} from 'lucide-react';

import type {
  IaSubmission,
  PipelineProgress,
} from '../types/ia';

type GlobalReviewStatusBarProps = {
  state: 'processing' | 'complete' | 'error';
  submission: IaSubmission;
  progress: PipelineProgress | null;
  errorMessage?: string;
  reportSaved?: boolean;
  onOpenReview: () => void;
};

export function GlobalReviewStatusBar({
  state,
  submission,
  progress,
  errorMessage = '',
  reportSaved = false,
  onOpenReview,
}: GlobalReviewStatusBarProps) {
  const progressPercent =
    state === 'complete'
      ? 100
      : Math.max(
          0,
          Math.min(
            99,
            Math.round(progress?.progressPercent ?? 0)
          )
        );

  const title =
    state === 'complete'
      ? 'Your IA review is ready'
      : state === 'error'
      ? 'Your IA review needs attention'
      : 'Review in progress';

  const message =
    state === 'complete'
      ? reportSaved
        ? 'The review is complete and saved automatically in My IA Reports.'
        : 'The review is complete and ready to open.'
      : state === 'error'
      ? errorMessage ||
        'Open the review to continue from the saved stage.'
      : progress?.message ||
        'Preparing your IA review. You can safely use other pages while this continues.';

  return (
    <section
      className={`global-review-status global-review-status-${state}`}
      aria-live="polite"
    >
      <div className="global-review-status-inner">
        <div className="global-review-status-icon">
          {state === 'complete' ? (
            <CheckCircle2 aria-hidden="true" />
          ) : state === 'error' ? (
            <AlertCircle aria-hidden="true" />
          ) : (
            <LoaderCircle
              className="global-review-status-spinner"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="global-review-status-copy">
          <div className="global-review-status-title-row">
            <strong>{title}</strong>

            {state === 'processing' && (
              <span>
                <Clock3 aria-hidden="true" />
                {progressPercent}% complete
              </span>
            )}
          </div>

          <p>{message}</p>

          <small>{submission.original_filename}</small>
        </div>

        <button
          type="button"
          onClick={onOpenReview}
        >
          {state === 'complete'
            ? 'Open review'
            : 'View progress'}
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {state === 'processing' && (
        <div
          className="global-review-status-track"
          aria-hidden="true"
        >
          <span
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </section>
  );
}
