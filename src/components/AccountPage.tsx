import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { AccountCommercePanel } from './AccountCommercePanel';

import '../student-dashboard-premium-tabs.css';

type AccountPageProps = {
  session: Session | null;
  busy: boolean;
  onOpenReport: (submissionId: string) => Promise<void>;
  onOpenReports: () => void;
  onStartReview: () => void;
  onOpenCredits: () => void;
  paymentsEnabled?: boolean;
  focusBilling?: boolean;
};

type DashboardTab =
  | 'overview'
  | 'reviews'
  | 'access'
  | 'billing';

type RecentReportRow = {
  submission_id: string;
  original_filename: string;
  version_number: number;
  subject: string;
  report_generated_at: string | null;
  saved_at: string | null;
  uploaded_at: string;
  criterion_scores: unknown;
  annotated_html_ready: boolean;
  progress_plan_ready: boolean;
};

type CommerceSnapshot = {
  fullCredits: number;
  freeReviewAvailable: boolean;
  freeReviewStatus: string;
  nextCreditExpiry: string | null;
  savedReportCount: number;
  reservedReviewCount: number;
  paymentCount: number;
  paidPaymentCount: number;
};

type TabDefinition = {
  key: DashboardTab;
  label: string;
  shortLabel: string;
  icon: ReactNode;
};

const EMPTY_COMMERCE: CommerceSnapshot = {
  fullCredits: 0,
  freeReviewAvailable: true,
  freeReviewStatus: 'available',
  nextCreditExpiry: null,
  savedReportCount: 0,
  reservedReviewCount: 0,
  paymentCount: 0,
  paidPaymentCount: 0,
};

const DASHBOARD_TABS: TabDefinition[] = [
  {
    key: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: <LayoutDashboard aria-hidden="true" />,
  },
  {
    key: 'reviews',
    label: 'My Reviews',
    shortLabel: 'Reviews',
    icon: <BookOpenCheck aria-hidden="true" />,
  },
  {
    key: 'access',
    label: 'Review Access',
    shortLabel: 'Access',
    icon: <CreditCard aria-hidden="true" />,
  },
  {
    key: 'billing',
    label: 'Billing & Receipts',
    shortLabel: 'Billing',
    icon: <ReceiptText aria-hidden="true" />,
  },
];

export function AccountPage({
  session,
  busy,
  onOpenReport,
  onOpenReports,
  onStartReview,
  onOpenCredits,
  paymentsEnabled = true,
  focusBilling = false,
}: AccountPageProps) {
  const [activeTab, setActiveTab] =
    useState<DashboardTab>(
      focusBilling ? 'billing' : 'overview'
    );

  const [reports, setReports] =
    useState<RecentReportRow[]>([]);

  const [reportsLoading, setReportsLoading] =
    useState(true);

  const [openingReportId, setOpeningReportId] =
    useState<string | null>(null);

  const [commerce, setCommerce] =
    useState<CommerceSnapshot>(EMPTY_COMMERCE);

  const [commerceLoading, setCommerceLoading] =
    useState(true);

  useEffect(() => {
    if (focusBilling) {
      setActiveTab('billing');
    }
  }, [focusBilling]);

  useEffect(() => {
    if (!paymentsEnabled && activeTab === 'access') {
      setActiveTab('overview');
    }
  }, [paymentsEnabled, activeTab]);

  useEffect(() => {
    setActiveTab(
      focusBilling ? 'billing' : 'overview'
    );
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;

    async function loadRecentReports() {
      setReportsLoading(true);

      const { data, error } =
        await supabase.rpc(
          'get_my_ia_report_history'
        );

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          'Recent IA reports could not be loaded',
          error
        );

        setReports([]);
        setReportsLoading(false);
        return;
      }

      const rows = Array.isArray(data)
        ? data
            .map(normalizeRecentReport)
            .filter(
              (
                row
              ): row is RecentReportRow =>
                row !== null
            )
            .sort(
              (left, right) =>
                getReportTime(right) -
                getReportTime(left)
            )
            .slice(0, 6)
        : [];

      setReports(rows);
      setReportsLoading(false);
    }

    void loadRecentReports();

    const refresh = () => {
      void loadRecentReports();
    };

    window.addEventListener(
      'ia-report-history-changed',
      refresh
    );

    return () => {
      active = false;

      window.removeEventListener(
        'ia-report-history-changed',
        refresh
      );
    };
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;

    async function loadCommerceSnapshot() {
      if (!session?.user.id) {
        if (active) {
          setCommerce(
            EMPTY_COMMERCE
          );
          setCommerceLoading(false);
        }
        return;
      }

      setCommerceLoading(true);

      try {
        const { data, error } =
          await supabase.rpc(
            'get_my_ia_commercial_account'
          );

        if (error) {
          throw error;
        }

        if (active) {
          setCommerce(
            normalizeCommerceSnapshot(data)
          );
        }
      } catch (error) {
        console.error(
          'Review access summary could not be loaded',
          error
        );

        if (active) {
          setCommerce(
            EMPTY_COMMERCE
          );
        }
      } finally {
        if (active) {
          setCommerceLoading(false);
        }
      }
    }

    void loadCommerceSnapshot();

    const refresh = () => {
      void loadCommerceSnapshot();
    };

    window.addEventListener(
      'ia-credit-balance-changed',
      refresh
    );

    window.addEventListener(
      'ia-review-finalized',
      refresh
    );

    window.addEventListener(
      'ia-report-history-changed',
      refresh
    );

    return () => {
      active = false;

      window.removeEventListener(
        'ia-credit-balance-changed',
        refresh
      );

      window.removeEventListener(
        'ia-review-finalized',
        refresh
      );

      window.removeEventListener(
        'ia-report-history-changed',
        refresh
      );
    };
  }, [session?.user.id]);

  const dashboardTabs = useMemo(
    () =>
      paymentsEnabled
        ? DASHBOARD_TABS
        : DASHBOARD_TABS.filter(
            (tab) => tab.key !== 'access'
          ),
    [paymentsEnabled]
  );

  const greeting = useMemo(
    () =>
      getGreeting(
        session?.user.email ?? null
      ),
    [session?.user.email]
  );

  const nextAction = useMemo(
    () =>
      getNextActionPresentation(
        commerce,
        paymentsEnabled
      ),
    [commerce, paymentsEnabled]
  );

  async function handleOpenReport(
    submissionId: string
  ) {
    if (openingReportId) {
      return;
    }

    setOpeningReportId(submissionId);

    try {
      await onOpenReport(submissionId);
    } finally {
      setOpeningReportId(null);
    }
  }

  return (
    <div
      className={
        paymentsEnabled
          ? 'student-dashboard'
          : 'student-dashboard student-dashboard-payments-disabled'
      }
    >
      <section className="student-dashboard-hero">
        <div className="student-dashboard-hero-copy">
          <span className="student-dashboard-eyebrow">
            <Sparkles aria-hidden="true" />
            IB SEHS IA workspace
          </span>

          <h2>{greeting.title}</h2>

          <p>
            {greeting.subtitle}
          </p>
        </div>

        <button
          className="student-dashboard-primary-action"
          type="button"
          onClick={onStartReview}
          disabled={busy}
        >
          <UploadCloud aria-hidden="true" />
          <span>Start new review</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <nav
        className="student-dashboard-tabs"
        aria-label="Student dashboard sections"
      >
        {dashboardTabs.map(
          (tab) => (
            <button
              key={tab.key}
              className={
                activeTab === tab.key
                  ? 'student-dashboard-tab student-dashboard-tab-active'
                  : 'student-dashboard-tab'
              }
              type="button"
              onClick={() =>
                setActiveTab(tab.key)
              }
              aria-current={
                activeTab === tab.key
                  ? 'page'
                  : undefined
              }
            >
              {tab.icon}

              <span className="student-dashboard-tab-label">
                {tab.label}
              </span>

              <span className="student-dashboard-tab-short-label">
                {tab.shortLabel}
              </span>
            </button>
          )
        )}
      </nav>

      {activeTab === 'overview' && (
        <OverviewTab
          commerce={commerce}
          commerceLoading={
            commerceLoading
          }
          reports={reports}
          reportsLoading={
            reportsLoading
          }
          openingReportId={
            openingReportId
          }
          nextAction={nextAction}
          onStartReview={
            onStartReview
          }
          onOpenCredits={() =>
            paymentsEnabled
              ? setActiveTab('access')
              : onStartReview()
          }
          onOpenBilling={() =>
            setActiveTab('billing')
          }
          onOpenReviews={() =>
            setActiveTab('reviews')
          }
          onOpenReport={
            handleOpenReport
          }
        />
      )}

      {activeTab === 'reviews' && (
        <ReviewsTab
          reports={reports}
          reportsLoading={
            reportsLoading
          }
          openingReportId={
            openingReportId
          }
          onStartReview={
            onStartReview
          }
          onOpenReport={
            handleOpenReport
          }
          onOpenReports={
            onOpenReports
          }
        />
      )}

      {paymentsEnabled && activeTab === 'access' && (
        <section className="student-dashboard-tab-page">
          <TabPageHeader
            eyebrow="Review access"
            title="Your review access"
            description="See your available full-review credits and free-review status without mixing them with payment history."
          />

          <div className="student-dashboard-commerce student-dashboard-commerce-access">
            <AccountCommercePanel
              session={session}
              onStartReview={
                onStartReview
              }
              onOpenPricing={
                onOpenCredits
              }
              onOpenReports={
                onOpenReports
              }
              expandPurchases={
                false
              }
            />
          </div>
        </section>
      )}

      {activeTab === 'billing' && (
        <section className="student-dashboard-tab-page">
          <TabPageHeader
            eyebrow="Billing & receipts"
            title="Purchases and invoices"
            description="Your PayPal payment records, invoices and printable receipts are kept together in one place."
          />

          <div className="student-dashboard-commerce student-dashboard-commerce-billing">
            <AccountCommercePanel
              session={session}
              onStartReview={
                onStartReview
              }
              onOpenPricing={
                onOpenCredits
              }
              onOpenReports={
                onOpenReports
              }
              expandPurchases
            />
          </div>
        </section>
      )}
    </div>
  );
}

function OverviewTab({
  commerce,
  commerceLoading,
  reports,
  reportsLoading,
  openingReportId,
  nextAction,
  onStartReview,
  onOpenCredits,
  onOpenBilling,
  onOpenReviews,
  onOpenReport,
}: {
  commerce: CommerceSnapshot;
  commerceLoading: boolean;
  reports: RecentReportRow[];
  reportsLoading: boolean;
  openingReportId: string | null;
  nextAction: NextActionPresentation;
  onStartReview: () => void;
  onOpenCredits: () => void;
  onOpenBilling: () => void;
  onOpenReviews: () => void;
  onOpenReport: (
    submissionId: string
  ) => Promise<void>;
}) {
  return (
    <div className="student-dashboard-overview">
      <section
        className={`student-dashboard-next-card student-dashboard-next-card-${nextAction.tone}`}
      >
        <div className="student-dashboard-next-icon">
          {nextAction.icon}
        </div>

        <div className="student-dashboard-next-copy">
          <span>
            Recommended next step
          </span>
          <h3>
            {nextAction.title}
          </h3>
          <p>
            {nextAction.description}
          </p>
        </div>

        <button
          type="button"
          onClick={
            nextAction.action === 'review'
              ? onStartReview
              : nextAction.action === 'reviews'
              ? onOpenReviews
              : onOpenCredits
          }
        >
          {nextAction.actionLabel}
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section
        className="student-dashboard-metrics"
        aria-label="Account overview"
      >
        <MetricCard
          icon={
            <CreditCard
              aria-hidden="true"
            />
          }
          label="Full reviews"
          value={
            commerceLoading
              ? '—'
              : String(
                  commerce.fullCredits
                )
          }
          helper={
            commerce.nextCreditExpiry
              ? `Next expiry ${formatDate(
                  commerce.nextCreditExpiry
                )}`
              : commerce.fullCredits > 0
              ? 'Ready when you are'
              : 'No full-review credit active'
          }
          actionLabel="Review access"
          onClick={
            onOpenCredits
          }
        />

        <MetricCard
          icon={
            <ShieldCheck
              aria-hidden="true"
            />
          }
          label="Free review"
          value={
            commerceLoading
              ? '—'
              : commerce.freeReviewAvailable
              ? 'Available'
              : commerce.freeReviewStatus ===
                'reserved'
              ? 'In use'
              : 'Used'
          }
          helper="Limited preview access"
          actionLabel="View access"
          onClick={
            onOpenCredits
          }
        />

        <MetricCard
          icon={
            <ClipboardList
              aria-hidden="true"
            />
          }
          label="Saved reports"
          value={
            commerceLoading
              ? '—'
              : String(
                  Math.max(
                    commerce.savedReportCount,
                    reports.length
                  )
                )
          }
          helper="Your completed IA history"
          actionLabel="Open reviews"
          onClick={
            onOpenReviews
          }
        />

        <MetricCard
          icon={
            <ReceiptText
              aria-hidden="true"
            />
          }
          label="Payments"
          value={
            commerceLoading
              ? '—'
              : String(
                  commerce.paymentCount
                )
          }
          helper={
            commerce.paidPaymentCount >
            0
              ? `${commerce.paidPaymentCount} completed`
              : 'Invoices and receipts'
          }
          actionLabel="Open billing"
          onClick={
            onOpenBilling
          }
        />
      </section>

      <section className="student-dashboard-overview-grid">
        <div className="student-dashboard-panel student-dashboard-recent-panel">
          <header className="student-dashboard-panel-heading">
            <div>
              <span>
                Recent activity
              </span>
              <h3>
                Latest IA reviews
              </h3>
              <p>
                Continue from your most recent
                completed work.
              </p>
            </div>

            <button
              type="button"
              onClick={
                onOpenReviews
              }
            >
              View all
              <ChevronRight
                aria-hidden="true"
              />
            </button>
          </header>

          <RecentReportsList
            reports={reports.slice(
              0,
              3
            )}
            reportsLoading={
              reportsLoading
            }
            openingReportId={
              openingReportId
            }
            onOpenReport={
              onOpenReport
            }
            onStartReview={
              onStartReview
            }
            compact
          />
        </div>

        <aside className="student-dashboard-panel student-dashboard-focus-panel">
          <span className="student-dashboard-focus-icon">
            <BookOpenCheck
              aria-hidden="true"
            />
          </span>

          <div>
            <span>
              Keep improving
            </span>
            <h3>
              One draft at a time.
            </h3>
            <p>
              Use each review as feedback for your
              next version. Your saved reports stay
              available so you can compare progress
              over time.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onStartReview
            }
          >
            Start another review
            <ArrowRight
              aria-hidden="true"
            />
          </button>
        </aside>
      </section>
    </div>
  );
}

function ReviewsTab({
  reports,
  reportsLoading,
  openingReportId,
  onStartReview,
  onOpenReport,
  onOpenReports,
}: {
  reports: RecentReportRow[];
  reportsLoading: boolean;
  openingReportId: string | null;
  onStartReview: () => void;
  onOpenReport: (
    submissionId: string
  ) => Promise<void>;
  onOpenReports: () => void;
}) {
  return (
    <section className="student-dashboard-tab-page">
      <TabPageHeader
        eyebrow="My reviews"
        title="Recent IA reviews"
        description="Open your recent reports here or continue to the complete report library."
        action={
          <button
            className="student-dashboard-header-action"
            type="button"
            onClick={
              onOpenReports
            }
          >
            View full report history
            <ArrowRight
              aria-hidden="true"
            />
          </button>
        }
      />

      <div className="student-dashboard-panel student-dashboard-reviews-panel">
        <RecentReportsList
          reports={reports}
          reportsLoading={
            reportsLoading
          }
          openingReportId={
            openingReportId
          }
          onOpenReport={
            onOpenReport
          }
          onStartReview={
            onStartReview
          }
        />
      </div>
    </section>
  );
}

function RecentReportsList({
  reports,
  reportsLoading,
  openingReportId,
  onOpenReport,
  onStartReview,
  compact = false,
}: {
  reports: RecentReportRow[];
  reportsLoading: boolean;
  openingReportId: string | null;
  onOpenReport: (
    submissionId: string
  ) => Promise<void>;
  onStartReview: () => void;
  compact?: boolean;
}) {
  const [mapTotals, setMapTotals] = useState<Record<string, string>>({});
  const idsKey = reports.map((r) => r.submission_id).join(',');
  useEffect(() => {
    if (!idsKey) return;
    let live = true;
    void supabase.from('ia_mark_maps').select('submission_id,mark:result->>mark,maximum:result->>maximum').eq('map_version', 'mark-map-v2').in('submission_id', idsKey.split(',')).then(({ data }) => {
      if (!live || !Array.isArray(data)) return;
      const next: Record<string, string> = {};
      for (const r of data as { submission_id: string; mark: string | null; maximum: string | null }[]) {
        if (Number.isFinite(Number(r.mark)) && Number(r.maximum) > 0) next[r.submission_id] = `${r.mark} / ${r.maximum}`;
      }
      setMapTotals(next);
    });
    return () => { live = false; };
  }, [idsKey]);
  if (reportsLoading) {
    return (
      <div className="student-dashboard-loading">
        <LoaderCircle
          className="student-dashboard-spin"
          aria-hidden="true"
        />
        <span>
          Loading recent reviews…
        </span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="student-dashboard-empty">
        <span>
          <BookOpenCheck
            aria-hidden="true"
          />
        </span>

        <div>
          <strong>
            No saved IA reports yet
          </strong>
          <p>
            Your completed full reviews will
            appear here automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={
            onStartReview
          }
        >
          Start first review
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? 'student-dashboard-report-list student-dashboard-report-list-compact'
          : 'student-dashboard-report-list'
      }
    >
      {reports.map((report) => {
        const markSummary =
          deriveMarkSummary(
            report.criterion_scores
          );

        const opening =
          openingReportId ===
          report.submission_id;

        return (
          <button
            className="student-dashboard-report-row"
            type="button"
            key={
              report.submission_id
            }
            onClick={() =>
              void onOpenReport(
                report.submission_id
              )
            }
            disabled={Boolean(
              openingReportId
            )}
          >
            <span className="student-dashboard-report-icon">
              <FileText
                aria-hidden="true"
              />
            </span>

            <span className="student-dashboard-report-copy">
              <strong>
                {report.original_filename}
              </strong>

              <span>
                Version{' '}
                {report.version_number}
                {' · '}
                {formatDate(
                  report.report_generated_at ??
                    report.saved_at ??
                    report.uploaded_at
                )}
              </span>

              <small>
                {report.annotated_html_ready && (
                  <span>
                    <CheckCircle2
                      aria-hidden="true"
                    />
                    Annotated IA
                  </span>
                )}

                {report.progress_plan_ready && (
                  <span>
                    <ClipboardList
                      aria-hidden="true"
                    />
                    Progress plan
                  </span>
                )}
              </small>
            </span>

            <span className="student-dashboard-report-score">
              <small>
                {mapTotals[report.submission_id] ? 'Marked' : 'Indicative range'}
              </small>
              <strong>
                {mapTotals[report.submission_id] ?? markSummary ??
                  'Open report'}
              </strong>
            </span>

            <span className="student-dashboard-report-open">
              {opening ? (
                <LoaderCircle
                  className="student-dashboard-spin"
                  aria-hidden="true"
                />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  actionLabel,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      className="student-dashboard-metric-card"
      type="button"
      onClick={onClick}
    >
      <span className="student-dashboard-metric-icon">
        {icon}
      </span>

      <span className="student-dashboard-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{helper}</span>
      </span>

      <span className="student-dashboard-metric-action">
        {actionLabel}
        <ChevronRight
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function TabPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="student-dashboard-tab-header">
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>
          {description}
        </p>
      </div>

      {action}
    </header>
  );
}

type NextActionPresentation = {
  tone:
    | 'active'
    | 'ready'
    | 'free'
    | 'empty';
  title: string;
  description: string;
  actionLabel: string;
  action:
    | 'review'
    | 'access'
    | 'reviews';
  icon: ReactNode;
};

function getNextActionPresentation(
  commerce: CommerceSnapshot,
  paymentsEnabled: boolean
): NextActionPresentation {
  if (
    commerce.reservedReviewCount >
    0
  ) {
    return {
      tone: 'active',
      title:
        'Your current IA review is in progress',
      description:
        'You can safely move around the workspace while the review is prepared.',
      actionLabel:
        'View current review',
      action: 'review',
      icon: (
        <LoaderCircle
          className="student-dashboard-spin"
          aria-hidden="true"
        />
      ),
    };
  }

  if (commerce.fullCredits > 0) {
    return {
      tone: 'ready',
      title:
        'You have full-review access ready',
      description:
        'Your next IA can receive the complete detailed review, annotated IA and progress plan.',
      actionLabel:
        'Start full review',
      action: 'review',
      icon: (
        <CheckCircle2
          aria-hidden="true"
        />
      ),
    };
  }

  if (
    commerce.freeReviewAvailable
  ) {
    return {
      tone: 'free',
      title:
        'Your free limited review is available',
      description:
        'Preview the first detailed-review criterion and annotated IA overview before choosing full access.',
      actionLabel:
        'Review an IA',
      action: 'review',
      icon: (
        <ShieldCheck
          aria-hidden="true"
        />
      ),
    };
  }

  if (!paymentsEnabled) {
    return {
      tone: 'empty',
      title:
        'Paid review access is temporarily unavailable',
      description:
        'New review-credit purchases are paused. Your saved IA reports and previous purchase records remain available.',
      actionLabel:
        'Open my reviews',
      action: 'reviews',
      icon: (
        <ClipboardList
          aria-hidden="true"
        />
      ),
    };
  }

  return {
    tone: 'empty',
    title:
      'Choose full-review access for your next IA',
    description:
      'Open Review Access to choose the review option that suits your next draft.',
    actionLabel:
      'View review access',
    action: 'access',
    icon: (
      <CreditCard
        aria-hidden="true"
      />
    ),
  };
}

function normalizeRecentReport(
  value: unknown
): RecentReportRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const submissionId =
    asText(value.submission_id);

  const filename =
    asText(
      value.original_filename
    );

  const subject =
    asText(value.subject) ??
    'SEHS';

  const uploadedAt =
    asText(value.uploaded_at);

  const versionNumber =
    asNumber(
      value.version_number
    );

  if (
    !submissionId ||
    !filename ||
    !uploadedAt ||
    versionNumber === null
  ) {
    return null;
  }

  return {
    submission_id:
      submissionId,
    original_filename:
      filename,
    version_number:
      versionNumber,
    subject,
    report_generated_at:
      asText(
        value.report_generated_at
      ),
    saved_at:
      asText(value.saved_at),
    uploaded_at:
      uploadedAt,
    criterion_scores:
      value.criterion_scores,
    annotated_html_ready:
      value.annotated_html_ready ===
      true,
    progress_plan_ready:
      value.progress_plan_ready ===
      true,
  };
}

function normalizeCommerceSnapshot(
  value: unknown
): CommerceSnapshot {
  if (!isRecord(value)) {
    return EMPTY_COMMERCE;
  }

  const summary =
    isRecord(
      value.credit_summary
    )
      ? value.credit_summary
      : {};

  const purchases =
    Array.isArray(value.purchases)
      ? value.purchases.filter(
          isRecord
        )
      : [];

  const paidPaymentCount =
    purchases.filter(
      (purchase) =>
        asText(
          purchase.payment_status
        )?.toLowerCase() ===
        'paid'
    ).length;

  return {
    fullCredits:
      asSafeInteger(
        summary.total_paid_or_complimentary_credits
      ),

    freeReviewAvailable:
      summary.free_review_available ===
      true,

    freeReviewStatus:
      asText(
        summary.free_review_status
      ) ?? 'available',

    nextCreditExpiry:
      asText(
        summary.next_credit_expiry
      ),

    savedReportCount:
      asSafeInteger(
        summary.saved_report_count
      ),

    reservedReviewCount:
      asSafeInteger(
        summary.reserved_review_count
      ),

    paymentCount:
      purchases.length,

    paidPaymentCount,
  };
}

function getGreeting(
  email: string | null
): {
  title: string;
  subtitle: string;
} {
  const hour =
    new Date().getHours();

  const period =
    hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const displayName =
    getDisplayNameFromEmail(
      email
    );

  return {
    title: displayName
      ? `${period}, ${displayName}`
      : period,

    subtitle:
      'Review your progress, manage access and keep every IA version organised in one focused workspace.',
  };
}

function getDisplayNameFromEmail(
  email: string | null
): string {
  const localPart =
    email?.split('@')[0]?.trim() ??
    '';

  if (!localPart) {
    return '';
  }

  const chunks =
    localPart
      .split(/[._-]+/u)
      .map((chunk) =>
        chunk
          .replace(
            /\d+$/u,
            ''
          )
          .trim()
      )
      .filter(Boolean);

  if (chunks.length === 0) {
    return '';
  }

  const first =
    chunks[0]
      .replace(
        /mail$/iu,
        ''
      )
      .trim();

  const name =
    first || chunks[0];

  return `${name
    .charAt(0)
    .toUpperCase()}${name
    .slice(1)
    .toLowerCase()}`;
}

function deriveMarkSummary(
  value: unknown
): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  let minimum = 0;
  let maximum = 0;
  let total = 0;
  let count = 0;

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const range =
      item.indicative_mark_range;

    if (
      !Array.isArray(range) ||
      range.length < 2
    ) {
      continue;
    }

    const low =
      asNumber(range[0]);

    const high =
      asNumber(range[1]);

    const criterionMaximum =
      asNumber(
        item.criterion_max_marks
      );

    if (
      low === null ||
      high === null
    ) {
      continue;
    }

    minimum += low;
    maximum += high;
    total +=
      criterionMaximum ?? high;
    count += 1;
  }

  return count > 0
    ? `${minimum}–${maximum} / ${total}`
    : null;
}

function getReportTime(
  report: RecentReportRow
): number {
  return Date.parse(
    report.report_generated_at ??
      report.saved_at ??
      report.uploaded_at
  );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(date);
}

function asText(
  value: unknown
): string | null {
  return typeof value ===
      'string' &&
    value.trim()
    ? value.trim()
    : null;
}

function asNumber(
  value: unknown
): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value ===
          'string' &&
        value.trim()
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function asSafeInteger(
  value: unknown
): number {
  const parsed =
    asNumber(value);

  if (parsed === null) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(parsed)
  );
}

function isRecord(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

