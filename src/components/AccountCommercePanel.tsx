import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  LoaderCircle,
  PlayCircle,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

type CreditSummary = {
  free_review_status: string;
  free_review_available: boolean;
  paid_credits_available: number;
  complimentary_credits_available: number;
  total_paid_or_complimentary_credits: number;
  can_start_review: boolean;
  can_use_paid_features: boolean;
  next_credit_expiry: string | null;
  saved_report_count: number;
  reserved_review_count: number;
};

type PurchaseRecord = {
  payment_order_id: string;
  pack_code: string;
  pack_name: string;
  pack_description: string;
  credits_purchased: number;
  amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  invoice_issued_at: string | null;
  merchant_name: string;
  customer_email: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  credits_remaining: number | null;
  credit_expires_at: string | null;
  invoice_available: boolean;
  failure_message: string | null;
};

type CommercialAccount = {
  credit_summary: CreditSummary;
  purchases: PurchaseRecord[];
};

type ReconciliationResponse = {
  ok?: boolean;
  paymentPending?: boolean;
  paymentStatus?: string;
  paymentOrderId?: string;
  message?: string;
};

type AccountCommercePanelProps = {
  session: Session | null;
  onStartReview: () => void;
  onOpenPricing: () => void;
  onOpenReports: () => void;
  expandPurchases?: boolean;
};

type Notice = {
  tone: 'success' | 'warning' | 'error';
  text: string;
};

const EMPTY_CREDIT_SUMMARY: CreditSummary = {
  free_review_status: 'available',
  free_review_available: true,
  paid_credits_available: 0,
  complimentary_credits_available: 0,
  total_paid_or_complimentary_credits: 0,
  can_start_review: true,
  can_use_paid_features: false,
  next_credit_expiry: null,
  saved_report_count: 0,
  reserved_review_count: 0,
};

export function AccountCommercePanel({
  session,
  onStartReview,
  onOpenPricing,
  onOpenReports,
  expandPurchases = false,
}: AccountCommercePanelProps) {
  const [accountData, setAccountData] =
    useState<CommercialAccount | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkingPaymentId, setCheckingPaymentId] =
    useState<string | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PurchaseRecord | null>(null);

  const [purchasesOpen, setPurchasesOpen] =
    useState(expandPurchases);

  const loadAccountData = useCallback(async () => {
    if (!session?.user.id) {
      setAccountData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        'get_my_ia_commercial_account'
      );

      if (error) {
        throw error;
      }

      setAccountData(normalizeCommercialAccount(data));
    } catch (error) {
      console.error(
        'Account purchase information could not be loaded',
        error
      );

      setLoadError(
        'Your purchase information could not be loaded. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void loadAccountData();
  }, [loadAccountData]);


  useEffect(() => {
    if (expandPurchases) {
      setPurchasesOpen(true);
    }
  }, [expandPurchases]);

  useEffect(() => {
    const refreshAccountData = () => {
      void loadAccountData();
    };

    window.addEventListener(
      'ia-credit-balance-changed',
      refreshAccountData
    );

    window.addEventListener(
      'ia-review-finalized',
      refreshAccountData
    );

    window.addEventListener(
      'ia-report-history-changed',
      refreshAccountData
    );

    return () => {
      window.removeEventListener(
        'ia-credit-balance-changed',
        refreshAccountData
      );

      window.removeEventListener(
        'ia-review-finalized',
        refreshAccountData
      );

      window.removeEventListener(
        'ia-report-history-changed',
        refreshAccountData
      );
    };
  }, [loadAccountData]);

  const creditSummary =
    accountData?.credit_summary ?? EMPTY_CREDIT_SUMMARY;

  const purchases = useMemo(
    () => accountData?.purchases ?? [],
    [accountData?.purchases]
  );

  const pendingPurchases = useMemo(
    () =>
      purchases.filter((purchase) =>
        ['created', 'pending'].includes(
          purchase.payment_status.toLowerCase()
        )
      ),
    [purchases]
  );

  const hasActiveReview =
    creditSummary.reserved_review_count > 0;

  const hasFullCredits =
    creditSummary.total_paid_or_complimentary_credits > 0;

  const accessPresentation =
    hasActiveReview
      ? {
          tone: 'active',
          eyebrow: 'Review in progress',
          title: 'Your IA review is being prepared',
          description:
            'You can move around the app safely. Open the current review to see its latest progress.',
          actionLabel: 'View review progress',
          actionIcon: <PlayCircle aria-hidden="true" />,
          action: onStartReview,
        }
      : hasFullCredits
      ? {
          tone: 'ready',
          eyebrow: 'Full review access ready',
          title: `${creditSummary.total_paid_or_complimentary_credits} ${
            creditSummary.total_paid_or_complimentary_credits === 1
              ? 'complete review'
              : 'complete reviews'
          } available`,
          description:
            'Your next IA can receive the complete detailed review, full annotated IA, progress plan and saved history.',
          actionLabel: 'Start full review',
          actionIcon: <PlayCircle aria-hidden="true" />,
          action: onStartReview,
        }
      : creditSummary.free_review_available
      ? {
          tone: 'free',
          eyebrow: 'Free limited review available',
          title: 'Preview the review before purchasing',
          description:
            'See the first detailed-review criterion and the overview plus first 20 lines of the annotated IA. The progress plan and downloads remain locked.',
          actionLabel: 'Choose review option',
          actionIcon: <Sparkles aria-hidden="true" />,
          action: onStartReview,
        }
      : {
          tone: 'empty',
          eyebrow: 'No review access available',
          title: 'Purchase a review credit to continue',
          description:
            'Choose one, three or five full IA reviews. A credit is consumed only after a review completes successfully.',
          actionLabel: 'View review pricing',
          actionIcon: <CreditCard aria-hidden="true" />,
          action: onOpenPricing,
        };

  async function checkPaymentStatus(
    purchase: PurchaseRecord
  ) {
    setCheckingPaymentId(purchase.payment_order_id);
    setNotice(null);

    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke(
        'paypal-reconcile-payment',
        {
          body: {
            payment_order_id:
              purchase.payment_order_id,
          },
        }
      );

      if (error) {
        throw error;
      }

      const response =
        isRecord(data)
          ? (data as ReconciliationResponse)
          : {};

      const paymentStatus =
        normalizeText(response.paymentStatus).toLowerCase();

      if (
        response.ok === true &&
        paymentStatus === 'paid'
      ) {
        setNotice({
          tone: 'success',
          text:
            'Payment confirmed. Your review credit and invoice are now available.',
        });

        window.dispatchEvent(
          new CustomEvent('ia-credit-balance-changed')
        );
      } else if (
        response.paymentPending === true ||
        paymentStatus === 'pending'
      ) {
        setNotice({
          tone: 'warning',
          text:
            response.message ||
            'PayPal is still processing this payment. No further payment is needed.',
        });
      } else if (paymentStatus === 'failed') {
        setNotice({
          tone: 'error',
          text:
            'PayPal did not complete this payment. No review credit was added.',
        });
      } else {
        setNotice({
          tone: 'warning',
          text:
            response.message ||
            'PayPal has not confirmed the final payment status yet.',
        });
      }

      await loadAccountData();
    } catch (error) {
      console.error(
        'Payment status could not be checked',
        error
      );

      setNotice({
        tone: 'error',
        text:
          'The payment status could not be checked. Please try again shortly.',
      });
    } finally {
      setCheckingPaymentId(null);
    }
  }

  function printInvoice(
    purchase: PurchaseRecord
  ) {
    const printWindow = window.open(
      '',
      '_blank',
      'width=900,height=760'
    );

    if (!printWindow) {
      setNotice({
        tone: 'error',
        text:
          'The invoice window was blocked. Allow pop-ups for this page and try again.',
      });
      return;
    }

    printWindow.opener = null;

    const invoiceHtml =
      buildPrintableInvoiceHtml(purchase);

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();

    window.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  if (loading) {
    return (
      <section
        className="account-commerce account-commerce-loading"
        aria-live="polite"
      >
        <LoaderCircle
          className="account-commerce-spinner"
          aria-hidden="true"
        />
        <span>Loading purchases and credits…</span>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="account-commerce">
        <div
          className="account-commerce-notice account-commerce-notice-error"
          role="alert"
        >
          <AlertCircle aria-hidden="true" />

          <div>
            <strong>Purchase information unavailable</strong>
            <span>{loadError}</span>
          </div>
        </div>

        <button
          className="account-commerce-secondary-button"
          type="button"
          onClick={() => void loadAccountData()}
        >
          <RefreshCw aria-hidden="true" />
          Try again
        </button>
      </section>
    );
  }

  return (
    <section
      className="member-commerce"
      aria-labelledby="account-commerce-title"
    >
      <header className="member-commerce-heading">
        <div>
          <span>Review access</span>
          <h2 id="account-commerce-title">
            Your account at a glance
          </h2>
          <p>
            The most important information is shown first. Purchases and
            invoices remain available below when you need them.
          </p>
        </div>

        <button
          className="member-refresh-button"
          type="button"
          onClick={() => void loadAccountData()}
          aria-label="Refresh account information"
          title="Refresh account information"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </header>

      <section
        className={`member-access-card member-access-${accessPresentation.tone}`}
      >
        <span className="member-access-icon">
          {hasActiveReview ? (
            <LoaderCircle
              className="account-commerce-spinner"
              aria-hidden="true"
            />
          ) : hasFullCredits ? (
            <CheckCircle2 aria-hidden="true" />
          ) : creditSummary.free_review_available ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <CreditCard aria-hidden="true" />
          )}
        </span>

        <div className="member-access-copy">
          <span>{accessPresentation.eyebrow}</span>
          <h3>{accessPresentation.title}</h3>
          <p>{accessPresentation.description}</p>
        </div>

        <button
          className="member-access-action"
          type="button"
          onClick={accessPresentation.action}
        >
          {accessPresentation.actionIcon}
          {accessPresentation.actionLabel}
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section className="member-stat-grid" aria-label="Account summary">
        <article className="member-stat-card member-stat-credit">
          <span className="member-stat-icon">
            <CreditCard aria-hidden="true" />
          </span>

          <div>
            <span>Full review credits</span>
            <strong>
              {creditSummary.total_paid_or_complimentary_credits}
            </strong>
            <small>
              {creditSummary.next_credit_expiry
                ? `Next expiry ${formatDate(
                    creditSummary.next_credit_expiry
                  )}`
                : 'No active full-review credit'}
            </small>
          </div>
        </article>

        <article className="member-stat-card member-stat-free">
          <span className="member-stat-icon">
            <ShieldCheck aria-hidden="true" />
          </span>

          <div>
            <span>Free limited review</span>
            <strong>
              {creditSummary.free_review_available
                ? 'Available'
                : creditSummary.free_review_status === 'reserved'
                ? 'In use'
                : 'Used'}
            </strong>
            <small>
              First criterion and annotated preview only
            </small>
          </div>
        </article>

        <button
          className="member-stat-card member-stat-reports"
          type="button"
          onClick={onOpenReports}
        >
          <span className="member-stat-icon">
            <ClipboardList aria-hidden="true" />
          </span>

          <div>
            <span>Saved IA reports</span>
            <strong>{creditSummary.saved_report_count}</strong>
            <small>Open report history</small>
          </div>

          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      {notice && (
        <div
          className={`account-commerce-notice account-commerce-notice-${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 aria-hidden="true" />
          ) : notice.tone === 'warning' ? (
            <Clock3 aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}

          <span>{notice.text}</span>
        </div>
      )}

      {pendingPurchases.length > 0 && (
        <div className="member-payment-alert">
          <Clock3 aria-hidden="true" />

          <div>
            <strong>
              {pendingPurchases.length === 1
                ? 'One payment is still processing'
                : `${pendingPurchases.length} payments are still processing`}
            </strong>

            <span>
              Do not pay again for the same order. Expand purchase history and
              use Check payment status.
            </span>
          </div>
        </div>
      )}

      <section className="member-purchase-disclosure">
        <button
          className="member-purchase-toggle"
          type="button"
          onClick={() => setPurchasesOpen((value) => !value)}
          aria-expanded={purchasesOpen}
          aria-controls="member-purchase-history"
        >
          <span className="member-purchase-toggle-icon">
            <FileText aria-hidden="true" />
          </span>

          <span className="member-purchase-toggle-copy">
            <small>Receipts and payment details</small>
            <strong>Purchases &amp; invoices</strong>
            <span>
              {purchases.length}{' '}
              {purchases.length === 1 ? 'payment record' : 'payment records'}
            </span>
          </span>

          <ChevronDown
            className={purchasesOpen ? 'member-chevron-open' : ''}
            aria-hidden="true"
          />
        </button>

        {purchasesOpen && (
          <div
            className="member-purchase-body"
            id="member-purchase-history"
          >
            {purchases.length === 0 ? (
              <div className="account-purchase-empty">
                <CreditCard aria-hidden="true" />
                <strong>No purchases yet</strong>
                <span>
                  Completed, processing and unsuccessful payments will appear
                  here.
                </span>
              </div>
            ) : (
              <div className="member-purchase-list">
                {purchases.map((purchase) => {
                  const status =
                    purchase.payment_status.toLowerCase();

                  const isPending =
                    status === 'pending' ||
                    status === 'created';

                  const isPaid =
                    status === 'paid';

                  const isChecking =
                    checkingPaymentId ===
                    purchase.payment_order_id;

                  return (
                    <article
                      className="member-purchase-card"
                      key={purchase.payment_order_id}
                    >
                      <div className="member-purchase-card-head">
                        <span className="member-purchase-card-icon">
                          {isPaid ? (
                            <CheckCircle2 aria-hidden="true" />
                          ) : isPending ? (
                            <Clock3 aria-hidden="true" />
                          ) : (
                            <AlertCircle aria-hidden="true" />
                          )}
                        </span>

                        <div>
                          <strong>{purchase.pack_name}</strong>
                          <span>
                            {formatMoney(
                              purchase.amount,
                              purchase.currency
                            )}
                            {' · '}
                            {purchase.credits_purchased}{' '}
                            {purchase.credits_purchased === 1
                              ? 'review credit'
                              : 'review credits'}
                          </span>
                          <small>
                            {formatDateTime(purchase.created_at)}
                          </small>
                        </div>

                        <PaymentStatusBadge status={status} />
                      </div>

                      <div className="member-purchase-quick-details">
                        <PurchaseDetail
                          label={`${providerName(purchase)} order`}
                          value={
                            purchase.paypal_order_id ??
                            'Not available'
                          }
                          mono
                        />

                        <PurchaseDetail
                          label="Invoice"
                          value={
                            purchase.invoice_number ??
                            (isPending
                              ? 'Issued after completion'
                              : 'Not issued')
                          }
                          mono
                        />

                        <PurchaseDetail
                          label="Credits remaining"
                          value={
                            purchase.credits_remaining === null
                              ? 'Not granted'
                              : String(purchase.credits_remaining)
                          }
                        />

                        <PurchaseDetail
                          label="Credit expiry"
                          value={
                            purchase.credit_expires_at
                              ? formatDate(
                                  purchase.credit_expires_at
                                )
                              : 'Not available'
                          }
                        />
                      </div>

                      {purchase.failure_message && (
                        <div className="account-purchase-failure">
                          <AlertCircle aria-hidden="true" />
                          <span>
                            {friendlyFailureMessage(
                              purchase.failure_message
                            )}
                          </span>
                        </div>
                      )}

                      <div className="account-purchase-actions">
                        {isPending && providerName(purchase) === 'PayPal' && (
                          <button
                            className="account-commerce-primary-button"
                            type="button"
                            onClick={() =>
                              void checkPaymentStatus(purchase)
                            }
                            disabled={checkingPaymentId !== null}
                          >
                            {isChecking ? (
                              <LoaderCircle
                                className="account-commerce-spinner"
                                aria-hidden="true"
                              />
                            ) : (
                              <RefreshCw aria-hidden="true" />
                            )}

                            {isChecking
                              ? 'Checking PayPal…'
                              : 'Check payment status'}
                          </button>
                        )}

                        {isPaid && purchase.invoice_available && (
                          <>
                            <button
                              className="account-commerce-primary-button"
                              type="button"
                              onClick={() =>
                                setSelectedInvoice(purchase)
                              }
                            >
                              <FileText aria-hidden="true" />
                              View invoice
                            </button>

                            <button
                              className="account-commerce-secondary-button"
                              type="button"
                              onClick={() => printInvoice(purchase)}
                            >
                              <Printer aria-hidden="true" />
                              Print / save PDF
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedInvoice && (
        <InvoiceModal
          purchase={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => printInvoice(selectedInvoice)}
        />
      )}
    </section>
  );
}

type PaymentStatusBadgeProps = {
  status: string;
};

function PaymentStatusBadge({
  status,
}: PaymentStatusBadgeProps) {
  if (status === 'paid') {
    return (
      <span className="account-payment-status account-payment-status-paid">
        Paid
      </span>
    );
  }

  if (
    status === 'pending' ||
    status === 'created'
  ) {
    return (
      <span className="account-payment-status account-payment-status-pending">
        Processing
      </span>
    );
  }

  return (
    <span className="account-payment-status account-payment-status-failed">
      Unsuccessful
    </span>
  );
}

type PurchaseDetailProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function PurchaseDetail({
  label,
  value,
  mono = false,
}: PurchaseDetailProps) {
  return (
    <div className="account-purchase-detail">
      <span>{label}</span>
      <strong className={mono ? 'account-mono' : ''}>
        {value}
      </strong>
    </div>
  );
}

type InvoiceModalProps = {
  purchase: PurchaseRecord;
  onClose: () => void;
  onPrint: () => void;
};

function InvoiceModal({
  purchase,
  onClose,
  onPrint,
}: InvoiceModalProps) {
  return (
    <div
      className="account-invoice-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="account-invoice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-invoice-title"
      >
        <button
          className="account-invoice-close"
          type="button"
          onClick={onClose}
          aria-label="Close invoice"
        >
          <X aria-hidden="true" />
        </button>

        <div className="account-invoice-brand">
          <span>IB IA Review</span>
          <strong>SEHS IA Review Coach</strong>
        </div>

        <div className="account-invoice-heading">
          <div>
            <span>Purchase invoice</span>
            <h3 id="account-invoice-title">
              {purchase.invoice_number}
            </h3>
          </div>

          <span className="account-payment-status account-payment-status-paid">
            Paid
          </span>
        </div>

        <div className="account-invoice-meta">
          <PurchaseDetail
            label="Invoice date"
            value={formatDate(
              purchase.invoice_issued_at ??
              purchase.paid_at ??
              purchase.created_at
            )}
          />

          <PurchaseDetail
            label="Receipt number"
            value={
              purchase.receipt_number ??
              'Not available'
            }
            mono
          />

          <PurchaseDetail
            label="Customer"
            value={purchase.customer_email}
          />

          <PurchaseDetail
            label="Merchant"
            value={
              purchase.merchant_name ||
              'IB IA Review'
            }
          />
        </div>

        <div className="account-invoice-line">
          <div>
            <strong>{purchase.pack_name}</strong>
            <span>
              {purchase.pack_description}
            </span>
          </div>

          <strong>
            {formatMoney(
              purchase.amount,
              purchase.currency
            )}
          </strong>
        </div>

        <div className="account-invoice-total">
          <span>Total paid</span>
          <strong>
            {formatMoney(
              purchase.amount,
              purchase.currency
            )}
          </strong>
        </div>

        <div className="account-invoice-payment-details">
          <div>
            <span>Review credits</span>
            <strong>
              {purchase.credits_purchased}
            </strong>
          </div>

          <div>
            <span>Payment method</span>
            <strong>{providerName(purchase)}</strong>
          </div>

          <div>
            <span>{providerName(purchase)} order</span>
            <strong className="account-mono">
              {purchase.paypal_order_id ??
                'Not available'}
            </strong>
          </div>

          <div>
            <span>{providerName(purchase)} payment</span>
            <strong className="account-mono">
              {purchase.paypal_capture_id ??
                'Not available'}
            </strong>
          </div>
        </div>

        <p className="account-invoice-note">
          This document records the completed
          purchase shown in your SEHS IA Review
          Coach account.
        </p>

        <div className="account-invoice-actions">
          <button
            className="account-commerce-secondary-button"
            type="button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            className="account-commerce-primary-button"
            type="button"
            onClick={onPrint}
          >
            <Printer aria-hidden="true" />
            Print / save PDF
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeCommercialAccount(
  value: unknown
): CommercialAccount {
  if (!isRecord(value)) {
    return {
      credit_summary: EMPTY_CREDIT_SUMMARY,
      purchases: [],
    };
  }

  return {
    credit_summary:
      normalizeCreditSummary(
        value.credit_summary
      ),
    purchases:
      Array.isArray(value.purchases)
        ? value.purchases
            .map(normalizePurchase)
            .filter(
              (
                purchase
              ): purchase is PurchaseRecord =>
                purchase !== null
            )
        : [],
  };
}

function normalizeCreditSummary(
  value: unknown
): CreditSummary {
  if (!isRecord(value)) {
    return EMPTY_CREDIT_SUMMARY;
  }

  return {
    free_review_status:
      normalizeText(
        value.free_review_status
      ) || 'available',

    free_review_available:
      value.free_review_available === true,

    paid_credits_available:
      safeInteger(
        value.paid_credits_available
      ),

    complimentary_credits_available:
      safeInteger(
        value.complimentary_credits_available
      ),

    total_paid_or_complimentary_credits:
      safeInteger(
        value.total_paid_or_complimentary_credits
      ),

    can_start_review:
      value.can_start_review === true,

    can_use_paid_features:
      value.can_use_paid_features === true,

    next_credit_expiry:
      nullableText(
        value.next_credit_expiry
      ),

    saved_report_count:
      safeInteger(
        value.saved_report_count
      ),

    reserved_review_count:
      safeInteger(
        value.reserved_review_count
      ),
  };
}

function normalizePurchase(
  value: unknown
): PurchaseRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const paymentOrderId =
    normalizeText(
      value.payment_order_id
    );

  if (!paymentOrderId) {
    return null;
  }

  return {
    payment_order_id:
      paymentOrderId,
    pack_code:
      normalizeText(value.pack_code),
    pack_name:
      normalizeText(value.pack_name) ||
      'IA review credits',
    pack_description:
      normalizeText(
        value.pack_description
      ) ||
      'SEHS IA review credits',
    credits_purchased:
      safeInteger(
        value.credits_purchased
      ),
    amount:
      safeNumber(value.amount),
    currency:
      normalizeText(value.currency) ||
      'USD',
    payment_status:
      normalizeText(
        value.payment_status
      ) ||
      'pending',
    created_at:
      normalizeText(value.created_at),
    paid_at:
      nullableText(value.paid_at),
    invoice_number:
      nullableText(
        value.invoice_number
      ),
    receipt_number:
      nullableText(
        value.receipt_number
      ),
    invoice_issued_at:
      nullableText(
        value.invoice_issued_at
      ),
    merchant_name:
      normalizeText(
        value.merchant_name
      ) ||
      'IB IA Review',
    customer_email:
      normalizeText(
        value.customer_email
      ),
    paypal_order_id:
      nullableText(
        value.paypal_order_id
      ),
    paypal_capture_id:
      nullableText(
        value.paypal_capture_id
      ),
    credits_remaining:
      value.credits_remaining ===
        null ||
      value.credits_remaining ===
        undefined
        ? null
        : safeInteger(
            value.credits_remaining
          ),
    credit_expires_at:
      nullableText(
        value.credit_expires_at
      ),
    invoice_available:
      value.invoice_available === true,
    failure_message:
      nullableText(
        value.failure_message
      ),
  };
}

function buildPrintableInvoiceHtml(
  purchase: PurchaseRecord
): string {
  const invoiceDate =
    formatDate(
      purchase.invoice_issued_at ??
      purchase.paid_at ??
      purchase.created_at
    );

  const amount =
    formatMoney(
      purchase.amount,
      purchase.currency
    );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(
    purchase.invoice_number ??
    'Purchase invoice'
  )}</title>
  <style>
    :root {
      font-family: Inter, Arial, sans-serif;
      color: #14213d;
      background: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 44px;
      background: #f4f7fb;
    }
    .invoice {
      width: min(820px, 100%);
      margin: 0 auto;
      padding: 44px;
      border: 1px solid #dce4f0;
      border-radius: 20px;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(18, 40, 75, .10);
    }
    .brand {
      margin-bottom: 36px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
    }
    .brand strong {
      display: block;
      color: #173f73;
      font-size: 24px;
    }
    .brand span {
      color: #68758a;
      font-size: 13px;
    }
    .paid {
      padding: 8px 12px;
      border: 1px solid #b7dfcf;
      border-radius: 999px;
      color: #17684e;
      background: #eef9f4;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 6px;
      font-size: 30px;
    }
    .reference {
      color: #637085;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
    .meta {
      margin: 32px 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }
    .meta div {
      padding: 16px;
      border: 1px solid #e1e7f0;
      border-radius: 12px;
      background: #fafcff;
    }
    .meta span,
    .payment span {
      display: block;
      margin-bottom: 6px;
      color: #7b8798;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .05em;
      text-transform: uppercase;
    }
    .meta strong,
    .payment strong {
      display: block;
      overflow-wrap: anywhere;
      font-size: 13px;
    }
    .line {
      margin-top: 26px;
      padding: 22px 0;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-top: 1px solid #dfe6ef;
      border-bottom: 1px solid #dfe6ef;
    }
    .line strong { font-size: 16px; }
    .line p {
      margin: 7px 0 0;
      color: #68758a;
      font-size: 13px;
    }
    .total {
      padding: 22px 0;
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: 28px;
    }
    .total span {
      color: #68758a;
      font-weight: 700;
    }
    .total strong {
      color: #173f73;
      font-size: 26px;
    }
    .payment {
      margin-top: 18px;
      padding: 22px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      border-radius: 14px;
      background: #f5f8fc;
    }
    .note {
      margin: 28px 0 0;
      color: #68758a;
      font-size: 12px;
      line-height: 1.6;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .invoice {
        width: 100%;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main class="invoice">
    <div class="brand">
      <div>
        <strong>${escapeHtml(
          purchase.merchant_name ||
          'IB IA Review'
        )}</strong>
        <span>SEHS IA Review Coach</span>
      </div>
      <span class="paid">Paid</span>
    </div>

    <h1>Purchase invoice</h1>
    <div class="reference">${escapeHtml(
      purchase.invoice_number ??
      'Invoice reference unavailable'
    )}</div>

    <section class="meta">
      <div>
        <span>Invoice date</span>
        <strong>${escapeHtml(invoiceDate)}</strong>
      </div>
      <div>
        <span>Receipt number</span>
        <strong>${escapeHtml(
          purchase.receipt_number ??
          'Not available'
        )}</strong>
      </div>
      <div>
        <span>Customer</span>
        <strong>${escapeHtml(
          purchase.customer_email
        )}</strong>
      </div>
      <div>
        <span>Payment method</span>
        <strong>${providerName(purchase)}</strong>
      </div>
    </section>

    <section class="line">
      <div>
        <strong>${escapeHtml(
          purchase.pack_name
        )}</strong>
        <p>${escapeHtml(
          `${purchase.credits_purchased} ${
            purchase.credits_purchased === 1
              ? 'review credit'
              : 'review credits'
          }`
        )}</p>
      </div>
      <strong>${escapeHtml(amount)}</strong>
    </section>

    <section class="total">
      <span>Total paid</span>
      <strong>${escapeHtml(amount)}</strong>
    </section>

    <section class="payment">
      <div>
        <span>${providerName(purchase)} order</span>
        <strong>${escapeHtml(
          purchase.paypal_order_id ??
          'Not available'
        )}</strong>
      </div>
      <div>
        <span>${providerName(purchase)} payment</span>
        <strong>${escapeHtml(
          purchase.paypal_capture_id ??
          'Not available'
        )}</strong>
      </div>
      <div>
        <span>Credits purchased</span>
        <strong>${escapeHtml(
          String(
            purchase.credits_purchased
          )
        )}</strong>
      </div>
      <div>
        <span>Credit expiry</span>
        <strong>${escapeHtml(
          purchase.credit_expires_at
            ? formatDate(
                purchase.credit_expires_at
              )
            : 'Not available'
        )}</strong>
      </div>
    </section>

    <p class="note">
      This document records the completed purchase shown in your
      SEHS IA Review Coach account.
    </p>
  </main>
</body>
</html>`;
}

function friendlyFailureMessage(
  message: string
): string {
  const normalized =
    message.toLowerCase();

  if (
    normalized.includes(
      'instrument'
    ) ||
    normalized.includes(
      'declined'
    )
  ) {
    return 'The selected PayPal payment method was declined. No review credit was added.';
  }

  return 'This payment was not completed. No review credit was added.';
}

function formatMoney(
  value: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency:
          currency || 'USD',
      }
    ).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Not available';
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

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date);
}

function safeInteger(
  value: unknown
): number {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? Math.max(
        0,
        Math.trunc(numberValue)
      )
    : 0;
}

function safeNumber(
  value: unknown
): number {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function nullableText(
  value: unknown
): string | null {
  const text =
    normalizeText(value);

  return text || null;
}

function normalizeText(
  value: unknown
): string {
  return (
    typeof value === 'string'
      ? value.trim()
      : ''
  );
}

function providerName(purchase: { paypal_order_id: string | null }): 'Razorpay' | 'PayPal' {
  return purchase.paypal_order_id?.startsWith('order_') ? 'Razorpay' : 'PayPal';
}

function escapeHtml(
  value: string
): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

