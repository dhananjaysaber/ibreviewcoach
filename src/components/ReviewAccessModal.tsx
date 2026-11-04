import {
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

export type ReviewAccessPack = {
  pack_code: string;
  display_name: string;
  description: string;
  review_credits: number;
  price_usd: number;
  validity_days: number;
  is_featured: boolean;
};

export type ReviewAccessSummary = {
  free_review_status: string;
  free_review_available: boolean;
  paid_credits_available: number;
  complimentary_credits_available: number;
  total_paid_or_complimentary_credits: number;
  reserved_review_count: number;
  can_start_review: boolean;
};

type ReviewAccessModalProps = {
  open: boolean;
  loading: boolean;
  summary: ReviewAccessSummary | null;
  packs: ReviewAccessPack[];
  onClose: () => void;
  onUseFreeReview: () => void;
  onChoosePack: (pack: ReviewAccessPack) => void;
};

export function ReviewAccessModal({
  open,
  loading,
  summary,
  packs,
  onClose,
  onUseFreeReview,
  onChoosePack,
}: ReviewAccessModalProps) {
  if (!open) {
    return null;
  }

  const freeAvailable =
    summary?.free_review_available === true;

  const fullCredits =
    summary?.total_paid_or_complimentary_credits ?? 0;

  const sortedPacks = packs
    .slice()
    .sort(
      (left, right) =>
        left.review_credits - right.review_credits
    );

  return (
    <div
      className="premium-access-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="premium-access-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-access-title"
      >
        <button
          className="premium-access-close"
          type="button"
          onClick={onClose}
          aria-label="Close review options"
        >
          <X aria-hidden="true" />
        </button>

        <header className="premium-access-header">
          <div className="premium-access-heading-mark">
            <Sparkles aria-hidden="true" />
          </div>

          <div>
            <span>Choose review access</span>
            <h2 id="premium-access-title">
              How would you like to review this IA?
            </h2>
            <p>
              A full review unlocks every criterion, the complete annotated
              IA, your progress plan, saved history and available downloads.
            </p>
          </div>

          {fullCredits > 0 && (
            <div className="premium-access-balance">
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>{fullCredits}</strong>
                full {fullCredits === 1 ? 'review' : 'reviews'} available
              </span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="premium-access-loading" role="status">
            <LoaderCircle
              className="premium-spin"
              aria-hidden="true"
            />
            <strong>Checking review access</strong>
            <span>This should take only a moment.</span>
          </div>
        ) : (
          <div className="premium-access-body">
            <section className="premium-access-pack-section">
              <div className="premium-access-section-heading">
                <div>
                  <span>Complete IA review</span>
                  <h3>Choose the number of drafts you expect to review</h3>
                </div>

                <small>Credits remain valid for 365 days</small>
              </div>

              <div className="premium-access-pack-grid">
                {sortedPacks.map((pack) => {
                  const unitPrice =
                    pack.price_usd / pack.review_credits;

                  return (
                    <article
                      className={`premium-access-pack ${
                        pack.is_featured
                          ? 'premium-access-pack-featured'
                          : ''
                      }`}
                      key={pack.pack_code}
                    >
                      {pack.is_featured && (
                        <span className="premium-access-featured-label">
                          Best value
                        </span>
                      )}

                      <div className="premium-access-pack-top">
                        <span>
                          <ShieldCheck aria-hidden="true" />
                        </span>

                        <div>
                          <small>{pack.display_name}</small>
                          <strong>{formatUsd(pack.price_usd)}</strong>
                        </div>
                      </div>

                      <p>{pack.description}</p>

                      <div className="premium-access-pack-count">
                        <strong>{pack.review_credits}</strong>
                        <span>
                          complete IA{' '}
                          {pack.review_credits === 1
                            ? 'review'
                            : 'reviews'}
                        </span>
                      </div>

                      <div className="premium-access-unit-price">
                        {formatUsd(unitPrice)} per review
                      </div>

                      <button
                        type="button"
                        onClick={() => onChoosePack(pack)}
                      >
                        <CreditCard aria-hidden="true" />
                        Choose {pack.review_credits === 1
                          ? 'single review'
                          : `${pack.review_credits}-review pack`}
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="premium-access-includes">
                <strong>Every full review includes</strong>

                <span>
                  <Check aria-hidden="true" />
                  Complete detailed review
                </span>

                <span>
                  <Check aria-hidden="true" />
                  Full annotated IA
                </span>

                <span>
                  <Check aria-hidden="true" />
                  Progress plan
                </span>

                <span>
                  <Check aria-hidden="true" />
                  Saved report and downloads
                </span>
              </div>
            </section>

            <section
              className={`premium-access-free ${
                freeAvailable
                  ? ''
                  : 'premium-access-free-used'
              }`}
            >
              <span className="premium-access-free-icon">
                <LockKeyhole aria-hidden="true" />
              </span>

              <div>
                <span>
                  {freeAvailable
                    ? 'One free limited preview'
                    : 'Free preview already used'}
                </span>

                <h3>
                  {freeAvailable
                    ? 'See how the review works before purchasing'
                    : 'Purchase a full review credit to continue'}
                </h3>

                <p>
                  {freeAvailable
                    ? 'View the first detailed-review criterion and the overview plus first 20 lines of the annotated IA. The progress plan, complete review and downloads remain locked.'
                    : 'A new IA draft now requires a complete review credit.'}
                </p>
              </div>

              {freeAvailable && (
                <button
                  type="button"
                  onClick={onUseFreeReview}
                >
                  Use free limited preview
                </button>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}
