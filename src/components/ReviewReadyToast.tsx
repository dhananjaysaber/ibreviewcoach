import {
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';

type ReviewReadyToastProps = {
  open: boolean;
  filename: string;
  reportSaved: boolean;
  onOpenReview: () => void;
  onClose: () => void;
};

export function ReviewReadyToast({
  open,
  filename,
  reportSaved,
  onOpenReview,
  onClose,
}: ReviewReadyToastProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      className="review-ready-toast"
      role="status"
      aria-live="polite"
    >
      <span className="review-ready-toast-icon">
        <CheckCircle2 aria-hidden="true" />
      </span>

      <div className="review-ready-toast-copy">
        <span>Review completed</span>
        <strong>Your IA review is ready</strong>
        <p>
          {filename}
          {reportSaved
            ? ' has been saved to My IA Reports.'
            : ' is ready to open.'}
        </p>

        <button type="button" onClick={onOpenReview}>
          Open review
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <button
        className="review-ready-toast-close"
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
