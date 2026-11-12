import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Gift,
  History,
  LoaderCircle,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
  Webhook,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { supabase } from '../lib/supabase';
import { SettingsAdmin } from './SettingsAdmin';
import { loadAppSettings, saveAppSetting } from '../lib/rightClick';
import { useEffect as useEffectPP, useState as useStatePP } from 'react';

type JsonRecord = Record<string, unknown>;
type LoadState = 'loading' | 'ready' | 'error';
type AdminTab =
  | 'overview'
  | 'students'
  | 'payments'
  | 'reviews'
  | 'health'
  | 'pricing'
  | 'settings'
  | 'audit';

type Notice = {
  tone: 'success' | 'error';
  text: string;
};

type DashboardData = {
  students: number;
  active_admins: number;
  payments: {
    total: number;
    paid: number;
    pending: number;
    created: number;
    failed: number;
    cancelled: number;
    refunded: number;
    partially_refunded: number;
    gross_paid_usd: number;
    gross_paid_by_currency: Record<string, number>;
  };
  credits: {
    purchase_credits_granted: number;
    purchase_credits_remaining: number;
    complimentary_credits_granted: number;
    complimentary_credits_remaining: number;
  };
  reviews: {
    total: number;
    completed: number;
    free: number;
    paid: number;
    complimentary: number;
  };
  usage: {
    estimated_ai_cost_usd: number;
    ai_input_tokens: number;
    ai_output_tokens: number;
  };
  payment_health: {
    pending_or_created: number;
    failed_payments: number;
    webhook_failures: number;
    webhooks_waiting: number;
  };
};

type StudentRow = {
  student_id: string;
  full_name: string;
  cohort: string | null;
  email: string | null;
  free_review_status: string;
  is_admin: boolean;
  paid_credits_remaining: number;
  complimentary_credits_remaining: number;
  paid_order_count: number;
  paid_total_usd: number;
  paid_by_currency: Record<string, number>;
  review_count: number;
  completed_review_count: number;
  last_payment_at: string | null;
  last_review_at: string | null;
};

type PaymentRow = {
  payment_order_id: string;
  student_id: string;
  full_name: string;
  customer_email: string | null;
  pack_name: string;
  credits_to_grant: number;
  currency: string;
  amount: number;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  status: string;
  created_at: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  failure_message: string | null;
  credits_remaining: number | null;
  webhook_event_count: number;
};

type ReviewRow = {
  submission_id: string;
  full_name: string;
  email: string | null;
  project_title: string | null;
  original_filename: string | null;
  status: string;
  commercial_access: string;
  uploaded_at: string | null;
  extracted_page_count: number | null;
  extracted_word_count: number | null;
  estimated_ai_cost_usd: number | null;
};

type WebhookRow = {
  id: string;
  provider_event_id: string;
  event_type: string;
  verification_status: string;
  processing_status: string;
  payment_order_id: string | null;
  payment_status: string | null;
  full_name: string | null;
  customer_email: string | null;
  received_at: string | null;
  error_message: string | null;
};

type CreditPack = {
  pack_code: string;
  display_name: string;
  description: string;
  review_credits: number;
  price_usd: number;
  validity_days: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
};

type AuditRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_email: string | null;
  target_email: string | null;
  details: JsonRecord;
  created_at: string | null;
};

type StudentDetail = {
  student: {
    student_id: string;
    full_name: string;
    cohort: string | null;
    email: string | null;
    created_at: string | null;
    is_admin: boolean;
  };
  credit_account: JsonRecord | null;
  credit_grants: JsonRecord[];
  payments: JsonRecord[];
  reviews: JsonRecord[];
};

type PaymentDetail = {
  order: JsonRecord;
  student: JsonRecord | null;
  credit_grant: JsonRecord | null;
  webhooks: JsonRecord[];
};

const PAGE_SIZE = 50;

const EMPTY_DASHBOARD: DashboardData = {
  students: 0,
  active_admins: 0,
  payments: {
    total: 0,
    paid: 0,
    pending: 0,
    created: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    partially_refunded: 0,
    gross_paid_usd: 0,
    gross_paid_by_currency: {},
  },
  credits: {
    purchase_credits_granted: 0,
    purchase_credits_remaining: 0,
    complimentary_credits_granted: 0,
    complimentary_credits_remaining: 0,
  },
  reviews: {
    total: 0,
    completed: 0,
    free: 0,
    paid: 0,
    complimentary: 0,
  },
  usage: {
    estimated_ai_cost_usd: 0,
    ai_input_tokens: 0,
    ai_output_tokens: 0,
  },
  payment_health: {
    pending_or_created: 0,
    failed_payments: 0,
    webhook_failures: 0,
    webhooks_waiting: 0,
  },
};

const TABS: Array<{
  key: AdminTab;
  label: string;
  icon: ReactNode;
}> = [
  {
    key: 'overview',
    label: 'Overview',
    icon: <ShieldCheck aria-hidden="true" />,
  },
  {
    key: 'students',
    label: 'Students & Credits',
    icon: <UsersRound aria-hidden="true" />,
  },
  {
    key: 'payments',
    label: 'Payments & Orders',
    icon: <ReceiptText aria-hidden="true" />,
  },
  {
    key: 'reviews',
    label: 'Reviews & Usage',
    icon: <BookOpenCheck aria-hidden="true" />,
  },
  {
    key: 'health',
    label: 'Payment Health',
    icon: <Webhook aria-hidden="true" />,
  },
  {
    key: 'pricing',
    label: 'Pricing & Packs',
    icon: <PackageOpen aria-hidden="true" />,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <Settings2 aria-hidden="true" />,
  },
  {
    key: 'audit',
    label: 'Audit Log',
    icon: <History aria-hidden="true" />,
  },
];

export function AdminControlCentre() {
  const [activeTab, setActiveTab] =
    useState<AdminTab>('overview');
  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData>(EMPTY_DASHBOARD);
  const [dashboardState, setDashboardState] =
    useState<LoadState>('loading');

  const [paymentsEnabled, setPaymentsEnabled] =
    useState<boolean | null>(null);
  const [paymentSettingState, setPaymentSettingState] =
    useState<LoadState>('loading');
  const [paymentSettingBusy, setPaymentSettingBusy] =
    useState(false);

  const [students, setStudents] =
    useState<StudentRow[]>([]);
  const [studentTotal, setStudentTotal] =
    useState(0);
  const [studentSearch, setStudentSearch] =
    useState('');
  const [studentState, setStudentState] =
    useState<LoadState>('loading');

  const [payments, setPayments] =
    useState<PaymentRow[]>([]);
  const [paymentTotal, setPaymentTotal] =
    useState(0);
  const [paymentSearch, setPaymentSearch] =
    useState('');
  const [paymentStatus, setPaymentStatus] =
    useState('');
  const [paymentState, setPaymentState] =
    useState<LoadState>('loading');

  const [reviews, setReviews] =
    useState<ReviewRow[]>([]);
  const [reviewTotal, setReviewTotal] =
    useState(0);
  const [reviewSearch, setReviewSearch] =
    useState('');
  const [reviewStatus, setReviewStatus] =
    useState('');
  const [reviewAccess, setReviewAccess] =
    useState('');
  const [reviewState, setReviewState] =
    useState<LoadState>('loading');

  const [webhooks, setWebhooks] =
    useState<WebhookRow[]>([]);
  const [webhookTotal, setWebhookTotal] =
    useState(0);
  const [webhookSearch, setWebhookSearch] =
    useState('');
  const [webhookStatus, setWebhookStatus] =
    useState('');
  const [webhookState, setWebhookState] =
    useState<LoadState>('loading');

  const [packs, setPacks] =
    useState<CreditPack[]>([]);
  const [packState, setPackState] =
    useState<LoadState>('loading');
  const [editingPack, setEditingPack] =
    useState<CreditPack | null>(null);

  const [auditRows, setAuditRows] =
    useState<AuditRow[]>([]);
  const [auditTotal, setAuditTotal] =
    useState(0);
  const [auditSearch, setAuditSearch] =
    useState('');
  const [auditState, setAuditState] =
    useState<LoadState>('loading');

  const [studentDetail, setStudentDetail] =
    useState<StudentDetail | null>(null);
  const [studentDetailState, setStudentDetailState] =
    useState<LoadState>('loading');

  const [paymentDetail, setPaymentDetail] =
    useState<PaymentDetail | null>(null);
  const [paymentDetailState, setPaymentDetailState] =
    useState<LoadState>('loading');

  const loadDashboard = useCallback(async () => {
    setDashboardState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'get_ia_admin_dashboard'
      );

      if (error) {
        throw error;
      }

      setDashboard(normalizeDashboard(data));
      setDashboardState('ready');
    } catch (error) {
      console.error(
        'Admin overview could not be loaded',
        error
      );
      setDashboardState('error');
    }
  }, []);

  const loadPaymentSetting = useCallback(async () => {
    setPaymentSettingState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'get_ia_payment_status'
      );

      if (error) {
        throw error;
      }

      if (
        !isRecord(data) ||
        typeof data.payments_enabled !== 'boolean'
      ) {
        throw new Error(
          'The global payment setting returned an unexpected response.'
        );
      }

      setPaymentsEnabled(data.payments_enabled);
      setPaymentSettingState('ready');
    } catch (error) {
      console.error(
        'Global payment collection status could not be loaded',
        error
      );
      setPaymentsEnabled(null);
      setPaymentSettingState('error');
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setStudentState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_students',
        {
          p_search: studentSearch.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }
      );

      if (error) {
        throw error;
      }

      const result = normalizePaged(
        data,
        normalizeStudent
      );

      setStudents(result.rows);
      setStudentTotal(result.total);
      setStudentState('ready');
    } catch (error) {
      console.error(
        'Admin student list could not be loaded',
        error
      );
      setStudentState('error');
    }
  }, [studentSearch]);

  const loadPayments = useCallback(async () => {
    setPaymentState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_payment_orders',
        {
          p_status: paymentStatus || null,
          p_search: paymentSearch.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }
      );

      if (error) {
        throw error;
      }

      const result = normalizePaged(
        data,
        normalizePayment
      );

      setPayments(result.rows);
      setPaymentTotal(result.total);
      setPaymentState('ready');
    } catch (error) {
      console.error(
        'Admin payment list could not be loaded',
        error
      );
      setPaymentState('error');
    }
  }, [paymentSearch, paymentStatus]);

  const loadReviews = useCallback(async () => {
    setReviewState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_reviews',
        {
          p_status: reviewStatus || null,
          p_access: reviewAccess || null,
          p_search: reviewSearch.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }
      );

      if (error) {
        throw error;
      }

      const result = normalizePaged(
        data,
        normalizeReview
      );

      setReviews(result.rows);
      setReviewTotal(result.total);
      setReviewState('ready');
    } catch (error) {
      console.error(
        'Admin review list could not be loaded',
        error
      );
      setReviewState('error');
    }
  }, [reviewAccess, reviewSearch, reviewStatus]);

  const loadWebhooks = useCallback(async () => {
    setWebhookState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_webhook_events',
        {
          p_processing_status:
            webhookStatus || null,
          p_search: webhookSearch.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }
      );

      if (error) {
        throw error;
      }

      const result = normalizePaged(
        data,
        normalizeWebhook
      );

      setWebhooks(result.rows);
      setWebhookTotal(result.total);
      setWebhookState('ready');
    } catch (error) {
      console.error(
        'Admin payment-health events could not be loaded',
        error
      );
      setWebhookState('error');
    }
  }, [webhookSearch, webhookStatus]);

  const loadPacks = useCallback(async () => {
    setPackState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_credit_packs'
      );

      if (error) {
        throw error;
      }

      setPacks(
        Array.isArray(data)
          ? data
              .map(normalizePack)
              .filter(
                (pack): pack is CreditPack =>
                  pack !== null
              )
          : []
      );
      setPackState('ready');
    } catch (error) {
      console.error(
        'Admin pricing could not be loaded',
        error
      );
      setPackState('error');
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_list_ia_audit_log',
        {
          p_search: auditSearch.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: 0,
        }
      );

      if (error) {
        throw error;
      }

      const result = normalizePaged(
        data,
        normalizeAudit
      );

      setAuditRows(result.rows);
      setAuditTotal(result.total);
      setAuditState('ready');
    } catch (error) {
      console.error(
        'Admin audit log could not be loaded',
        error
      );
      setAuditState('error');
    }
  }, [auditSearch]);

  const refreshActiveTab = useCallback(async () => {
    setNotice(null);

    if (activeTab === 'overview') {
      await Promise.all([
        loadDashboard(),
        loadPaymentSetting(),
      ]);
    } else if (activeTab === 'students') {
      await loadStudents();
    } else if (activeTab === 'payments') {
      await loadPayments();
    } else if (activeTab === 'reviews') {
      await loadReviews();
    } else if (activeTab === 'health') {
      await loadWebhooks();
    } else if (activeTab === 'pricing') {
      await loadPacks();
    } else {
      await loadAudit();
    }
  }, [
    activeTab,
    loadAudit,
    loadDashboard,
    loadPaymentSetting,
    loadPacks,
    loadPayments,
    loadReviews,
    loadStudents,
    loadWebhooks,
  ]);

  useEffect(() => {
    void refreshActiveTab();
  }, [refreshActiveTab]);

  async function setPaymentCollection(nextEnabled: boolean) {
    if (
      !nextEnabled &&
      !window.confirm(
        `Turn off payment collection?

New pricing and checkout will be hidden and blocked immediately. Existing credits, reports, purchases and invoices are not affected.`
      )
    ) {
      return;
    }

    setPaymentSettingBusy(true);
    setNotice(null);

    try {
      const { data, error } = await supabase.rpc(
        'set_ia_payments_enabled',
        {
          p_enabled: nextEnabled,
        }
      );

      if (error) {
        throw error;
      }

      const confirmedEnabled =
        isRecord(data) &&
        typeof data.payments_enabled === 'boolean'
          ? data.payments_enabled
          : nextEnabled;

      setPaymentsEnabled(confirmedEnabled);
      setPaymentSettingState('ready');
      setNotice({
        tone: 'success',
        text: confirmedEnabled
          ? 'Payment collection is enabled. Pricing and checkout are available again.'
          : 'Payment collection is disabled. New pricing and checkout are hidden and blocked.',
      });

      window.dispatchEvent(
        new CustomEvent('ia-payment-status-changed', {
          detail: {
            paymentsEnabled: confirmedEnabled,
          },
        })
      );
    } catch (error) {
      console.error(
        'Global payment collection setting could not be updated',
        error
      );
      setNotice({
        tone: 'error',
        text: 'The payment collection setting could not be changed. Please try again.',
      });
      await loadPaymentSetting();
    } finally {
      setPaymentSettingBusy(false);
    }
  }

  async function openStudent(studentId: string) {
    setStudentDetail(null);
    setStudentDetailState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_get_ia_student_detail',
        {
          p_student_id: studentId,
        }
      );

      if (error) {
        throw error;
      }

      const nextDetail = normalizeStudentDetail(data);

      if (!nextDetail) {
        throw new Error(
          'The student account could not be read.'
        );
      }

      setStudentDetail(nextDetail);
      setStudentDetailState('ready');
    } catch (error) {
      console.error(
        'Student commercial detail could not be loaded',
        error
      );
      setStudentDetailState('error');
    }
  }

  async function refreshStudentDetail() {
    const studentId =
      studentDetail?.student.student_id;

    if (!studentId) {
      return;
    }

    await Promise.all([
      openStudent(studentId),
      loadStudents(),
      loadDashboard(),
    ]);
  }

  async function openPayment(paymentId: string) {
    setPaymentDetail(null);
    setPaymentDetailState('loading');

    try {
      const { data, error } = await supabase.rpc(
        'admin_get_ia_payment_order',
        {
          p_payment_order_id: paymentId,
        }
      );

      if (error) {
        throw error;
      }

      const nextDetail = normalizePaymentDetail(data);

      if (!nextDetail) {
        throw new Error(
          'The payment order could not be read.'
        );
      }

      setPaymentDetail(nextDetail);
      setPaymentDetailState('ready');
    } catch (error) {
      console.error(
        'Payment order detail could not be loaded',
        error
      );
      setPaymentDetailState('error');
    }
  }

  async function grantComplimentaryCredits(
    credits: number,
    validityDays: number,
    reason: string
  ) {
    const studentId =
      studentDetail?.student.student_id;

    if (!studentId) {
      return;
    }

    const { error } = await supabase.rpc(
      'admin_grant_ia_complimentary_credits',
      {
        p_student_id: studentId,
        p_credits: credits,
        p_validity_days: validityDays,
        p_reason: reason,
      }
    );

    if (error) {
      throw error;
    }

    setNotice({
      tone: 'success',
      text: `${credits} complimentary ${
        credits === 1 ? 'credit has' : 'credits have'
      } been added.`,
    });

    await refreshStudentDetail();
  }

  async function resetFreeReview(reason: string) {
    const studentId =
      studentDetail?.student.student_id;

    if (!studentId) {
      return;
    }

    if (
      !window.confirm(
        'Give this student another free limited review? This reset is recorded in the Admin audit log.'
      )
    ) {
      return;
    }

    const { error } = await supabase.rpc(
      'admin_reset_ia_free_review',
      {
        p_student_id: studentId,
        p_reason: reason,
      }
    );

    if (error) {
      throw error;
    }

    setNotice({
      tone: 'success',
      text: 'The free limited review is available again.',
    });

    await refreshStudentDetail();
  }

  async function revokeGrant(
    grantId: string,
    reason: string
  ) {
    if (
      !window.confirm(
        'Revoke all unused credits remaining on this complimentary grant?'
      )
    ) {
      return;
    }

    const { error } = await supabase.rpc(
      'admin_revoke_ia_complimentary_grant',
      {
        p_grant_id: grantId,
        p_reason: reason,
      }
    );

    if (error) {
      throw error;
    }

    setNotice({
      tone: 'success',
      text: 'The unused complimentary credits have been revoked.',
    });

    await refreshStudentDetail();
  }

  async function savePack(pack: CreditPack) {
    const { error } = await supabase.rpc(
      'admin_save_ia_credit_pack',
      {
        p_pack_code: pack.pack_code,
        p_display_name: pack.display_name,
        p_description: pack.description,
        p_review_credits: pack.review_credits,
        p_price_usd: pack.price_usd,
        p_validity_days: pack.validity_days,
        p_is_featured: pack.is_featured,
        p_is_active: pack.is_active,
        p_display_order: pack.display_order,
      }
    );

    if (error) {
      throw error;
    }

    setEditingPack(null);
    setNotice({
      tone: 'success',
      text: 'The review-credit pack has been saved.',
    });

    await Promise.all([
      loadPacks(),
      loadDashboard(),
    ]);
  }

  return (
    <section className="admin-control-centre">
      <header className="admin-hero">
        <div>
          <span className="admin-kicker">
            <ShieldCheck aria-hidden="true" />
            Secure administration
          </span>
          <h2>Commercial Control Centre</h2>
          <p>
            Manage students, payments, credits, review
            usage, pricing and payment health without
            weakening the student-facing security rules.
          </p>
        </div>

        {import.meta.env.DEV && (
          <a
            href="/local-lab/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ alignSelf: 'center', display: 'inline-flex', padding: '12px 14px', background: '#173d7c', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}
          >
            Open Local IA Test Lab
          </a>
        )}
        <button
          className="admin-refresh-button"
          type="button"
          onClick={() => void refreshActiveTab()}
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </button>
      </header>

      {notice && (
        <div
          className={`admin-notice admin-notice-${notice.tone}`}
          role="status"
        >
          {notice.tone === 'success' ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <nav
        className="admin-tab-strip"
        aria-label="Admin Control Centre sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={
              activeTab === tab.key
                ? 'admin-tab admin-tab-active'
                : 'admin-tab'
            }
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <Overview
          data={dashboard}
          state={dashboardState}
          paymentsEnabled={paymentsEnabled}
          paymentSettingState={paymentSettingState}
          paymentSettingBusy={paymentSettingBusy}
          onSetPaymentsEnabled={(enabled) =>
            void setPaymentCollection(enabled)
          }
          onStudents={() => setActiveTab('students')}
          onPayments={() => setActiveTab('payments')}
          onHealth={() => setActiveTab('health')}
        />
      )}

      {activeTab === 'students' && (
        <Students
          rows={students}
          total={studentTotal}
          state={studentState}
          search={studentSearch}
          setSearch={setStudentSearch}
          refresh={loadStudents}
          openStudent={openStudent}
        />
      )}

      {activeTab === 'payments' && (
        <Payments
          rows={payments}
          total={paymentTotal}
          state={paymentState}
          search={paymentSearch}
          setSearch={setPaymentSearch}
          status={paymentStatus}
          setStatus={setPaymentStatus}
          refresh={loadPayments}
          openPayment={openPayment}
        />
      )}

      {activeTab === 'reviews' && (
        <Reviews
          rows={reviews}
          total={reviewTotal}
          state={reviewState}
          search={reviewSearch}
          setSearch={setReviewSearch}
          status={reviewStatus}
          setStatus={setReviewStatus}
          access={reviewAccess}
          setAccess={setReviewAccess}
          refresh={loadReviews}
        />
      )}

      {activeTab === 'health' && (
        <PaymentHealth
          rows={webhooks}
          total={webhookTotal}
          state={webhookState}
          search={webhookSearch}
          setSearch={setWebhookSearch}
          status={webhookStatus}
          setStatus={setWebhookStatus}
          refresh={loadWebhooks}
          openPayment={openPayment}
        />
      )}

      {activeTab === 'pricing' && (
        <Pricing
          rows={packs}
          state={packState}
          edit={setEditingPack}
        />
      )}

      {activeTab === 'settings' && <SettingsAdmin />}

      {activeTab === 'audit' && (
        <Audit
          rows={auditRows}
          total={auditTotal}
          state={auditState}
          search={auditSearch}
          setSearch={setAuditSearch}
          refresh={loadAudit}
        />
      )}

      {studentDetailState !== 'loading' &&
        studentDetail && (
          <StudentDrawer
            detail={studentDetail}
            close={() => setStudentDetail(null)}
            grantCredits={grantComplimentaryCredits}
            resetFreeReview={resetFreeReview}
            revokeGrant={revokeGrant}
          />
        )}

      {studentDetailState === 'error' && (
        <SimpleModal
          title="Student account"
          close={() => setStudentDetailState('loading')}
        >
          <StateCard
            state="error"
            text="The student account could not be loaded."
          />
        </SimpleModal>
      )}

      {paymentDetailState !== 'loading' &&
        paymentDetail && (
          <PaymentDrawer
            detail={paymentDetail}
            close={() => setPaymentDetail(null)}
          />
        )}

      {paymentDetailState === 'error' && (
        <SimpleModal
          title="Payment order"
          close={() => setPaymentDetailState('loading')}
        >
          <StateCard
            state="error"
            text="The payment order could not be loaded."
          />
        </SimpleModal>
      )}

      {editingPack && (
        <PackEditor
          pack={editingPack}
          close={() => setEditingPack(null)}
          save={savePack}
        />
      )}
    </section>
  );
}

function Overview({
  data,
  state,
  paymentsEnabled,
  paymentSettingState,
  paymentSettingBusy,
  onSetPaymentsEnabled,
  onStudents,
  onPayments,
  onHealth,
}: {
  data: DashboardData;
  state: LoadState;
  paymentsEnabled: boolean | null;
  paymentSettingState: LoadState;
  paymentSettingBusy: boolean;
  onSetPaymentsEnabled: (enabled: boolean) => void;
  onStudents: () => void;
  onPayments: () => void;
  onHealth: () => void;
}) {
  if (state !== 'ready') {
    return (
      <StateCard
        state={state}
        text="Loading Admin overview…"
      />
    );
  }

  return (
    <div className="admin-tab-content">
      <PaymentCollectionControl
        enabled={paymentsEnabled}
        state={paymentSettingState}
        busy={paymentSettingBusy}
        onChange={onSetPaymentsEnabled}
      />

      <PayPalMethodControl />

      <RupeeRateControl />

      <div className="admin-stat-grid">
        <Stat
          label="Students"
          value={formatInteger(data.students)}
          helper={`${data.active_admins} active Admin`}
          icon={<UsersRound aria-hidden="true" />}
          onClick={onStudents}
        />
        <Stat
          label="Paid revenue"
          value={
            Object.entries(data.payments.gross_paid_by_currency)
              .map(([code, total]) => formatMoney(total, code))
              .join(' + ') || formatMoney(0, 'USD')
          }
          helper={`${data.payments.paid} successful payments`}
          icon={<CircleDollarSign aria-hidden="true" />}
          onClick={onPayments}
        />
        <Stat
          label="Purchased credits left"
          value={formatInteger(
            data.credits.purchase_credits_remaining
          )}
          helper={`${formatInteger(
            data.credits.purchase_credits_granted
          )} purchased in total`}
          icon={<CreditCard aria-hidden="true" />}
        />
        <Stat
          label="Completed reviews"
          value={formatInteger(data.reviews.completed)}
          helper={`${formatInteger(
            data.reviews.total
          )} reviews created`}
          icon={<BookOpenCheck aria-hidden="true" />}
        />
      </div>

      <div className="admin-overview-grid">
        <Panel title="Payment activity">
          <MetricRow
            label="Paid"
            value={data.payments.paid}
          />
          <MetricRow
            label="Pending / created"
            value={
              data.payments.pending +
              data.payments.created
            }
          />
          <MetricRow
            label="Failed"
            value={data.payments.failed}
          />
          <MetricRow
            label="Refunded"
            value={
              data.payments.refunded +
              data.payments.partially_refunded
            }
          />
          <button
            className="admin-text-button"
            type="button"
            onClick={onPayments}
          >
            Open Payments & Orders
          </button>
        </Panel>

        <Panel title="Payment health">
          <MetricRow
            label="Orders waiting"
            value={
              data.payment_health.pending_or_created
            }
          />
          <MetricRow
            label="Failed payments"
            value={
              data.payment_health.failed_payments
            }
          />
          <MetricRow
            label="Webhook failures"
            value={
              data.payment_health.webhook_failures
            }
          />
          <MetricRow
            label="Webhooks waiting"
            value={
              data.payment_health.webhooks_waiting
            }
          />
          <button
            className="admin-text-button"
            type="button"
            onClick={onHealth}
          >
            Open Payment Health
          </button>
        </Panel>

        <Panel title="Review access">
          <MetricRow
            label="Paid-credit reviews"
            value={data.reviews.paid}
          />
          <MetricRow
            label="Free limited reviews"
            value={data.reviews.free}
          />
          <MetricRow
            label="Complimentary / Admin"
            value={data.reviews.complimentary}
          />
        </Panel>

        <Panel title="Processing usage">
          <MetricText
            label="Estimated processing cost"
            value={formatMoney(
              data.usage.estimated_ai_cost_usd,
              'USD'
            )}
          />
          <MetricText
            label="Input tokens"
            value={formatInteger(
              data.usage.ai_input_tokens
            )}
          />
          <MetricText
            label="Output tokens"
            value={formatInteger(
              data.usage.ai_output_tokens
            )}
          />
        </Panel>
      </div>
    </div>
  );
}

function PaymentCollectionControl({
  enabled,
  state,
  busy,
  onChange,
}: {
  enabled: boolean | null;
  state: LoadState;
  busy: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Panel title="Global payment collection">
      {state === 'loading' ? (
        <div className="admin-detail-list">
          <article className="admin-detail-list-item">
            <div>
              <strong>Checking payment collection…</strong>
              <span>
                Reading the app-wide pricing and checkout setting.
              </span>
            </div>
            <LoaderCircle
              className="admin-spin"
              aria-hidden="true"
            />
          </article>
        </div>
      ) : state === 'error' || enabled === null ? (
        <SafeNote
          warning
          title="Payment collection status unavailable"
          text="The switch could not be read. Refresh the Admin overview before changing payment collection."
        />
      ) : (
        <div className="admin-detail-list">
          <article className="admin-detail-list-item">
            <div>
              <strong>
                {enabled
                  ? 'Payments enabled'
                  : 'Payments disabled'}
              </strong>
              <span>
                {enabled
                  ? 'Pricing and checkout are available to eligible users.'
                  : 'New pricing and checkout are hidden and blocked. Existing credits, reports, purchases and invoices remain available.'}
              </span>
            </div>
            <StatusPill
              value={enabled ? 'active' : 'disabled'}
            />
          </article>

          <label className="admin-toggle-row">
            <input
              type="checkbox"
              checked={enabled}
              disabled={busy}
              onChange={(event) =>
                onChange(event.target.checked)
              }
            />
            <span>
              {busy
                ? 'Updating payment collection…'
                : enabled
                ? 'Accept new payments across the app'
                : 'New payments are paused across the app'}
            </span>
          </label>

          <SafeNote
            title="Existing access is preserved"
            text="Turning payments off does not remove purchased or complimentary credits, saved IA reports, completed orders or invoices. Admin unlimited review access also remains unchanged."
          />
        </div>
      )}
    </Panel>
  );
}

function PayPalMethodControl() {
  const [on, setOn] = useStatePP<boolean | null>(null);
  const [busy, setBusy] = useStatePP(false);
  const [err, setErr] = useStatePP(false);
  useEffectPP(() => { void loadAppSettings().then((v) => setOn(v.paypal_enabled !== false)); }, []);
  async function change(next: boolean) {
    setBusy(true); setErr(false);
    const ok = await saveAppSetting('paypal_enabled', next);
    if (ok) setOn(next); else setErr(true);
    setBusy(false);
  }
  return (
    <Panel title="PayPal payment method">
      <div className="admin-detail-list">
        <article className="admin-detail-list-item">
          <div>
            <strong>{on === null ? 'Checking…' : on ? 'PayPal is offered at checkout' : 'PayPal is hidden at checkout'}</strong>
            <span>{on === false ? 'Students go straight to Razorpay (UPI, cards, netbanking in rupees).' : 'Students choose between Razorpay (rupees) and PayPal (US dollars).'}</span>
          </div>
          <StatusPill value={on ? 'active' : 'disabled'} />
        </article>
        <label className="admin-toggle-row">
          <input type="checkbox" checked={on === true} disabled={busy || on === null} onChange={(e) => void change(e.target.checked)} />
          <span>{busy ? 'Saving…' : on ? 'PayPal on: switch off to use Razorpay only' : 'PayPal off: switch on to offer it again'}</span>
        </label>
        {err && <SafeNote warning title="Could not save" text="The setting was not changed. Try again." />}
      </div>
    </Panel>
  );
}

function RupeeRateControl() {
  const [saved, setSaved] = useStatePP<number | null | undefined>(undefined);
  const [text, setText] = useStatePP('');
  const [busy, setBusy] = useStatePP(false);
  const [msg, setMsg] = useStatePP<'ok' | 'err' | 'range' | null>(null);
  useEffectPP(() => {
    void loadAppSettings().then((v) => {
      const n = typeof v.usd_inr_rate === 'number' ? v.usd_inr_rate : null;
      setSaved(n);
      setText(n === null ? '' : String(n));
    });
  }, []);
  async function save(value: number | null) {
    setBusy(true); setMsg(null);
    const ok = await saveAppSetting('usd_inr_rate', value);
    if (ok) { setSaved(value); setText(value === null ? '' : String(value)); setMsg('ok'); } else setMsg('err');
    setBusy(false);
  }
  function onSave() {
    const n = Number(text);
    if (!Number.isFinite(n) || n < 50 || n > 150) { setMsg('range'); return; }
    void save(Math.round(n * 100) / 100);
  }
  return (
    <Panel title="Exchange rate for rupee checkout">
      <div className="admin-detail-list">
        <article className="admin-detail-list-item">
          <div>
            <strong>
              {saved === undefined ? 'Checking…' : saved === null ? 'Automatic: the live USD to INR rate is used' : `Fixed: ₹${saved} per US$1`}
            </strong>
            <span>
              Students pay in rupees through Razorpay. Prices on the site stay in dollars and are converted at this rate when checkout opens.
              Leave it automatic, or save your own rate (between 50 and 150) and every new checkout will use it until you clear it.
            </span>
          </div>
          <StatusPill value={saved === null ? 'active' : 'pending'} />
        </article>
        <div className="admin-toggle-row">
          <input
            type="number" min="50" max="150" step="0.01" inputMode="decimal"
            value={text} disabled={busy || saved === undefined}
            placeholder="e.g. 94.03"
            onChange={(e) => { setText(e.target.value); setMsg(null); }}
            style={{ width: 120, padding: '8px 10px', borderRadius: 10, border: '1px solid #d9d4c7' }}
            aria-label="Rupees per US dollar"
          />
          <button type="button" className="admin-primary-button" disabled={busy || saved === undefined} onClick={onSave}>
            {busy ? 'Saving…' : 'Save rate'}
          </button>
          <button type="button" className="admin-secondary-button" disabled={busy || saved === null || saved === undefined} onClick={() => void save(null)}>
            Use automatic rate
          </button>
        </div>
        {msg === 'ok' && <SafeNote title="Saved" text="New checkouts use this setting straight away. Payments already started keep their original amount." />}
        {msg === 'range' && <SafeNote warning title="Check the number" text="Enter a rate between 50 and 150 rupees per dollar." />}
        {msg === 'err' && <SafeNote warning title="Could not save" text="The setting was not changed. Try again." />}
      </div>
    </Panel>
  );
}

function Students({
  rows,
  total,
  state,
  search,
  setSearch,
  refresh,
  openStudent,
}: {
  rows: StudentRow[];
  total: number;
  state: LoadState;
  search: string;
  setSearch: (value: string) => void;
  refresh: () => Promise<void>;
  openStudent: (id: string) => Promise<void>;
}) {
  return (
    <div className="admin-tab-content">
      <Toolbar title="Students & Credits" total={total}>
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search name, email or cohort"
          submit={() => void refresh()}
        />
      </Toolbar>

      <TableFrame state={state}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Free review</th>
              <th>Paid credits</th>
              <th>Complimentary</th>
              <th>Payments</th>
              <th>Reviews</th>
              <th>Last activity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.student_id}>
                <td>
                  <Primary
                    title={row.full_name}
                    subtitle={row.email ?? 'No email shown'}
                    helper={
                      row.is_admin
                        ? 'Admin account'
                        : row.cohort
                    }
                  />
                </td>
                <td>
                  <StatusPill value={row.free_review_status} />
                </td>
                <td>
                  {formatInteger(
                    row.paid_credits_remaining
                  )}
                </td>
                <td>
                  {row.is_admin
                    ? 'Unlimited'
                    : formatInteger(
                        row.complimentary_credits_remaining
                      )}
                </td>
                <td>
                  <Primary
                    title={`${row.paid_order_count} paid`}
                    subtitle={
                      Object.entries(row.paid_by_currency)
                        .map(([code, total]) => formatMoney(total, code))
                        .join(' + ') || formatMoney(0, 'USD')
                    }
                  />
                </td>
                <td>
                  <Primary
                    title={`${row.review_count} total`}
                    subtitle={`${row.completed_review_count} complete`}
                  />
                </td>
                <td>
                  {formatDate(
                    row.last_review_at ??
                      row.last_payment_at
                  )}
                </td>
                <td className="admin-table-action">
                  <button
                    type="button"
                    onClick={() =>
                      void openStudent(row.student_id)
                    }
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {state === 'ready' && rows.length === 0 && (
              <EmptyRow
                colSpan={8}
                text="No students match this search."
              />
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

function Payments({
  rows,
  total,
  state,
  search,
  setSearch,
  status,
  setStatus,
  refresh,
  openPayment,
}: {
  rows: PaymentRow[];
  total: number;
  state: LoadState;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  refresh: () => Promise<void>;
  openPayment: (id: string) => Promise<void>;
}) {
  return (
    <div className="admin-tab-content">
      <Toolbar title="Payments & Orders" total={total}>
        <select
          className="admin-select"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          aria-label="Payment status"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="created">Created</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">
            Partially refunded
          </option>
        </select>
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search customer, invoice or payment ID"
          submit={() => void refresh()}
        />
      </Toolbar>

      <SafeNote
        title="Verified payment state only"
        text="There is no manual Mark Paid control. Paid status and purchase credits continue to come only from verified Razorpay or PayPal payments and reconciliation."
      />

      <TableFrame state={state}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Pack</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th>Invoice / receipt</th>
              <th>Credits left</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.payment_order_id}>
                <td>
                  <Primary
                    title={row.full_name}
                    subtitle={
                      row.customer_email ?? 'No email shown'
                    }
                  />
                </td>
                <td>
                  <Primary
                    title={row.pack_name}
                    subtitle={`${row.credits_to_grant} review ${
                      row.credits_to_grant === 1
                        ? 'credit'
                        : 'credits'
                    }`}
                  />
                </td>
                <td>
                  {formatMoney(row.amount, row.currency)}
                </td>
                <td>
                  <StatusPill value={row.status} />
                </td>
                <td>{formatDate(row.created_at)}</td>
                <td>
                  <Primary
                    title={
                      row.invoice_number ?? 'Not issued'
                    }
                    subtitle={
                      row.receipt_number ?? 'No receipt'
                    }
                  />
                </td>
                <td>
                  {row.credits_remaining == null
                    ? '—'
                    : formatInteger(
                        row.credits_remaining
                      )}
                </td>
                <td className="admin-table-action">
                  <button
                    type="button"
                    onClick={() =>
                      void openPayment(
                        row.payment_order_id
                      )
                    }
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
            {state === 'ready' && rows.length === 0 && (
              <EmptyRow
                colSpan={8}
                text="No payment orders match these filters."
              />
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

function Reviews({
  rows,
  total,
  state,
  search,
  setSearch,
  status,
  setStatus,
  access,
  setAccess,
  refresh,
}: {
  rows: ReviewRow[];
  total: number;
  state: LoadState;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  access: string;
  setAccess: (value: string) => void;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="admin-tab-content">
      <Toolbar title="Reviews & Usage" total={total}>
        <select
          className="admin-select"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <select
          className="admin-select"
          value={access}
          onChange={(event) =>
            setAccess(event.target.value)
          }
        >
          <option value="">All access types</option>
          <option value="paid_credit">Paid credit</option>
          <option value="free_review">
            Free limited review
          </option>
          <option value="complimentary">
            Complimentary / Admin
          </option>
          <option value="unassigned">Unassigned</option>
        </select>
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search student or file"
          submit={() => void refresh()}
        />
      </Toolbar>

      <TableFrame state={state}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>IA / project</th>
              <th>Status</th>
              <th>Access</th>
              <th>Uploaded</th>
              <th>Pages / words</th>
              <th>Usage cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.submission_id}>
                <td>
                  <Primary
                    title={row.full_name}
                    subtitle={row.email ?? 'No email shown'}
                  />
                </td>
                <td>
                  <Primary
                    title={
                      row.original_filename ??
                      row.project_title ??
                      'IA review'
                    }
                    subtitle={
                      row.project_title &&
                      row.original_filename
                        ? row.project_title
                        : 'SEHS'
                    }
                  />
                </td>
                <td>
                  <StatusPill value={row.status} />
                </td>
                <td>
                  <StatusPill
                    value={row.commercial_access}
                  />
                </td>
                <td>{formatDate(row.uploaded_at)}</td>
                <td>
                  <Primary
                    title={`${formatInteger(
                      row.extracted_page_count ?? 0
                    )} pages`}
                    subtitle={`${formatInteger(
                      row.extracted_word_count ?? 0
                    )} words`}
                  />
                </td>
                <td>
                  {row.estimated_ai_cost_usd == null
                    ? '—'
                    : formatMoney(
                        row.estimated_ai_cost_usd,
                        'USD'
                      )}
                </td>
              </tr>
            ))}
            {state === 'ready' && rows.length === 0 && (
              <EmptyRow
                colSpan={7}
                text="No reviews match these filters."
              />
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

function PaymentHealth({
  rows,
  total,
  state,
  search,
  setSearch,
  status,
  setStatus,
  refresh,
  openPayment,
}: {
  rows: WebhookRow[];
  total: number;
  state: LoadState;
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  refresh: () => Promise<void>;
  openPayment: (id: string) => Promise<void>;
}) {
  return (
    <div className="admin-tab-content">
      <Toolbar title="Payment Health" total={total}>
        <select
          className="admin-select"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
        >
          <option value="">All processing states</option>
          <option value="received">Received</option>
          <option value="verified">Verified</option>
          <option value="processed">Processed</option>
          <option value="ignored">Ignored</option>
          <option value="failed">Failed</option>
        </select>
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search event, order or customer"
          submit={() => void refresh()}
        />
      </Toolbar>

      <SafeNote
        warning
        title="Provider actions are read-only for now"
        text="Reconcile and refund buttons are intentionally not simulated in the browser. They will be enabled only after the protected Admin PayPal Edge Function is deployed."
      />

      <TableFrame state={state}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Customer</th>
              <th>Verification</th>
              <th>Processing</th>
              <th>Payment</th>
              <th>Received</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Primary
                    title={row.event_type}
                    subtitle={shortId(
                      row.provider_event_id
                    )}
                  />
                </td>
                <td>
                  <Primary
                    title={row.full_name ?? 'Not linked'}
                    subtitle={
                      row.customer_email ?? '—'
                    }
                  />
                </td>
                <td>
                  <StatusPill
                    value={row.verification_status}
                  />
                </td>
                <td>
                  <StatusPill
                    value={row.processing_status}
                  />
                </td>
                <td>
                  {row.payment_status ? (
                    <StatusPill
                      value={row.payment_status}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatDate(row.received_at)}</td>
                <td className="admin-table-action">
                  {row.payment_order_id ? (
                    <button
                      type="button"
                      onClick={() =>
                        void openPayment(
                          row.payment_order_id as string
                        )
                      }
                    >
                      Order
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {state === 'ready' && rows.length === 0 && (
              <EmptyRow
                colSpan={7}
                text="No webhook events match these filters."
              />
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

function Pricing({
  rows,
  state,
  edit,
}: {
  rows: CreditPack[];
  state: LoadState;
  edit: (pack: CreditPack) => void;
}) {
  if (state !== 'ready') {
    return (
      <StateCard
        state={state}
        text="Loading review-credit packs…"
      />
    );
  }

  return (
    <div className="admin-tab-content">
      <Toolbar title="Pricing & Packs" total={rows.length}>
        <button
          className="admin-primary-button"
          type="button"
          onClick={() => edit(blankPack())}
        >
          <PackageOpen aria-hidden="true" />
          New pack
        </button>
      </Toolbar>

      <div className="admin-pack-grid">
        {rows.map((pack) => (
          <article
            className={`admin-pack-card ${
              pack.is_active
                ? ''
                : 'admin-pack-card-inactive'
            }`}
            key={pack.pack_code}
          >
            <header>
              <div>
                <small>{pack.pack_code}</small>
                <h3>{pack.display_name}</h3>
              </div>
              <div className="admin-pack-badges">
                {pack.is_featured && <span>Featured</span>}
                {!pack.is_active && <span>Archived</span>}
              </div>
            </header>
            <p>{pack.description}</p>
            <div className="admin-pack-metrics">
              <div>
                <strong>{pack.review_credits}</strong>
                <span>Credits</span>
              </div>
              <div>
                <strong>
                  {formatMoney(pack.price_usd, 'USD')}
                </strong>
                <span>Price</span>
              </div>
              <div>
                <strong>{pack.validity_days}</strong>
                <span>Days</span>
              </div>
            </div>
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => edit(pack)}
            >
              <Settings2 aria-hidden="true" />
              Edit pack
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Audit({
  rows,
  total,
  state,
  search,
  setSearch,
  refresh,
}: {
  rows: AuditRow[];
  total: number;
  state: LoadState;
  search: string;
  setSearch: (value: string) => void;
  refresh: () => Promise<void>;
}) {
  return (
    <div className="admin-tab-content">
      <Toolbar title="Audit Log" total={total}>
        <SearchBox
          value={search}
          setValue={setSearch}
          placeholder="Search action, account or entity"
          submit={() => void refresh()}
        />
      </Toolbar>

      <TableFrame state={state}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Admin</th>
              <th>Affected account</th>
              <th>Entity</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Primary
                    title={humanize(row.action)}
                    subtitle={
                      asText(row.details.reason) ??
                      'Recorded Admin action'
                    }
                  />
                </td>
                <td>{row.actor_email ?? 'System'}</td>
                <td>{row.target_email ?? '—'}</td>
                <td>
                  <Primary
                    title={
                      row.entity_type
                        ? humanize(row.entity_type)
                        : '—'
                    }
                    subtitle={
                      row.entity_id
                        ? shortId(row.entity_id)
                        : null
                    }
                  />
                </td>
                <td>{formatDate(row.created_at)}</td>
              </tr>
            ))}
            {state === 'ready' && rows.length === 0 && (
              <EmptyRow
                colSpan={5}
                text="No audit entries match this search."
              />
            )}
          </tbody>
        </table>
      </TableFrame>
    </div>
  );
}

function StudentDrawer({
  detail,
  close,
  grantCredits,
  resetFreeReview,
  revokeGrant,
}: {
  detail: StudentDetail;
  close: () => void;
  grantCredits: (
    credits: number,
    validityDays: number,
    reason: string
  ) => Promise<void>;
  resetFreeReview: (reason: string) => Promise<void>;
  revokeGrant: (
    grantId: string,
    reason: string
  ) => Promise<void>;
}) {
  const [credits, setCredits] = useState('1');
  const [validityDays, setValidityDays] =
    useState('365');
  const [grantReason, setGrantReason] =
    useState('');
  const [resetReason, setResetReason] =
    useState('');
  const [revokeReason, setRevokeReason] =
    useState('');
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState('');

  async function submitGrant(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await grantCredits(
        Number(credits),
        Number(validityDays),
        grantReason
      );
      setGrantReason('');
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function runReset() {
    setBusy(true);
    setError('');

    try {
      await resetFreeReview(resetReason);
      setResetReason('');
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function runRevoke(grantId: string) {
    setBusy(true);
    setError('');

    try {
      await revokeGrant(grantId, revokeReason);
      setRevokeReason('');
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SimpleModal
      title={detail.student.full_name}
      subtitle={detail.student.email ?? 'Student account'}
      close={close}
      wide
    >
      <div className="admin-drawer-stack">
        {detail.student.is_admin && (
          <SafeNote
            title="Unlimited Admin review access"
            text="This account uses the reusable Admin entitlement and never needs to buy or consume review credits."
          />
        )}

        <Panel title="Account summary">
          <div className="admin-detail-grid">
            <Detail
              label="Cohort"
              value={detail.student.cohort ?? 'Not set'}
            />
            <Detail
              label="Free review"
              value={
                asText(
                  detail.credit_account
                    ?.free_review_status
                ) ?? 'available'
              }
            />
            <Detail
              label="Credit grants"
              value={String(
                detail.credit_grants.length
              )}
            />
            <Detail
              label="Payment orders"
              value={String(detail.payments.length)}
            />
            <Detail
              label="Reviews"
              value={String(detail.reviews.length)}
            />
            <Detail
              label="Created"
              value={formatDate(
                detail.student.created_at
              )}
            />
          </div>
        </Panel>

        {!detail.student.is_admin && (
          <Panel title="Grant complimentary credits">
            <form
              className="admin-action-form"
              onSubmit={submitGrant}
            >
              <label>
                <span>Credits</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={credits}
                  onChange={(event) =>
                    setCredits(event.target.value)
                  }
                  required
                />
              </label>
              <label>
                <span>Validity days</span>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={validityDays}
                  onChange={(event) =>
                    setValidityDays(
                      event.target.value
                    )
                  }
                  required
                />
              </label>
              <label className="admin-form-wide">
                <span>Reason</span>
                <input
                  value={grantReason}
                  onChange={(event) =>
                    setGrantReason(event.target.value)
                  }
                  minLength={3}
                  placeholder="Why are these credits being granted?"
                  required
                />
              </label>
              <button
                className="admin-primary-button admin-form-wide"
                type="submit"
                disabled={busy}
              >
                <Gift aria-hidden="true" />
                Grant credits
              </button>
            </form>
          </Panel>
        )}

        {!detail.student.is_admin && (
          <Panel title="Free limited review">
            <div className="admin-inline-action">
              <input
                value={resetReason}
                onChange={(event) =>
                  setResetReason(event.target.value)
                }
                placeholder="Reason for reset"
              />
              <button
                className="admin-secondary-button"
                type="button"
                disabled={
                  busy ||
                  resetReason.trim().length < 3
                }
                onClick={() => void runReset()}
              >
                <RotateCcw aria-hidden="true" />
                Reset free review
              </button>
            </div>
          </Panel>
        )}

        <Panel title="Credit grants">
          <div className="admin-detail-list">
            {detail.credit_grants.map(
              (grant, index) => {
                const id =
                  asText(grant.id) ??
                  `grant-${index}`;
                const type =
                  asText(grant.grant_type) ??
                  'unknown';
                const remaining =
                  asInteger(
                    grant.credits_remaining
                  );
                const revoked =
                  Boolean(
                    asText(grant.revoked_at)
                  );
                const canRevoke =
                  type === 'complimentary' &&
                  !revoked &&
                  remaining > 0;

                return (
                  <article
                    className="admin-detail-list-item"
                    key={id}
                  >
                    <div>
                      <strong>{humanize(type)}</strong>
                      <span>
                        {remaining} of{' '}
                        {asInteger(
                          grant.credits_total
                        )}{' '}
                        remaining
                      </span>
                    </div>
                    <StatusPill
                      value={
                        revoked ? 'revoked' : 'active'
                      }
                    />
                    {canRevoke && (
                      <div className="admin-revoke-row">
                        <input
                          value={revokeReason}
                          onChange={(event) =>
                            setRevokeReason(
                              event.target.value
                            )
                          }
                          placeholder="Reason to revoke unused credits"
                        />
                        <button
                          className="admin-danger-button"
                          type="button"
                          disabled={
                            busy ||
                            revokeReason.trim().length <
                              3
                          }
                          onClick={() =>
                            void runRevoke(id)
                          }
                        >
                          <X aria-hidden="true" />
                          Revoke unused
                        </button>
                      </div>
                    )}
                  </article>
                );
              }
            )}
            {detail.credit_grants.length === 0 && (
              <p className="admin-empty-copy">
                No credit grants have been recorded.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Recent reviews">
          <div className="admin-detail-list">
            {detail.reviews
              .slice(0, 10)
              .map((review, index) => (
                <article
                  className="admin-detail-list-item"
                  key={
                    asText(review.submission_id) ??
                    `review-${index}`
                  }
                >
                  <div>
                    <strong>
                      {asText(review.filename) ??
                        asText(
                          review.project_title
                        ) ??
                        'IA review'}
                    </strong>
                    <span>
                      {humanize(
                        asText(
                          review.commercial_access
                        ) ?? 'unassigned'
                      )}
                    </span>
                  </div>
                  <StatusPill
                    value={
                      asText(review.status) ??
                      'unknown'
                    }
                  />
                </article>
              ))}
          </div>
        </Panel>

        {error && (
          <div className="admin-form-error">
            <AlertCircle aria-hidden="true" />
            {error}
          </div>
        )}
      </div>
    </SimpleModal>
  );
}

function PaymentDrawer({
  detail,
  close,
}: {
  detail: PaymentDetail;
  close: () => void;
}) {
  const order = detail.order;

  return (
    <SimpleModal
      title={
        asText(detail.student?.full_name) ??
        'Payment order'
      }
      subtitle={
        asText(detail.student?.email) ??
        'Order details'
      }
      close={close}
      wide
    >
      <div className="admin-drawer-stack">
        <section className="admin-payment-summary">
          <div>
            <span>Payment status</span>
            <StatusPill
              value={
                asText(order.status) ?? 'unknown'
              }
            />
          </div>
          <strong>
            {formatMoney(
              asNumber(order.amount),
              asText(order.currency) ?? 'USD'
            )}
          </strong>
          <p>
            {asText(order.pack_code) ??
              'IA review credits'}
          </p>
        </section>

        <Panel title="Order references">
          <div className="admin-detail-grid">
            <Detail
              label="Invoice"
              value={
                asText(order.invoice_number) ??
                'Not issued'
              }
            />
            <Detail
              label="Receipt"
              value={
                asText(order.receipt_number) ??
                'Not issued'
              }
            />
            <Detail
              label="PayPal order"
              value={
                asText(order.provider_order_id) ??
                'Not available'
              }
            />
            <Detail
              label="PayPal capture"
              value={
                asText(
                  order.provider_payment_id
                ) ?? 'Not available'
              }
            />
          </div>
        </Panel>

        {asText(order.failure_message) && (
          <div className="admin-form-error">
            <AlertCircle aria-hidden="true" />
            {asText(order.failure_message)}
          </div>
        )}

        <Panel title="Credit outcome">
          {detail.credit_grant ? (
            <div className="admin-detail-grid">
              <Detail
                label="Credits granted"
                value={String(
                  asInteger(
                    detail.credit_grant
                      .credits_total
                  )
                )}
              />
              <Detail
                label="Credits remaining"
                value={String(
                  asInteger(
                    detail.credit_grant
                      .credits_remaining
                  )
                )}
              />
              <Detail
                label="Expires"
                value={formatDate(
                  asText(
                    detail.credit_grant.expires_at
                  )
                )}
              />
            </div>
          ) : (
            <p className="admin-empty-copy">
              No purchase-credit grant is attached to this
              order.
            </p>
          )}
        </Panel>

        <Panel title="PayPal webhook history">
          <div className="admin-detail-list">
            {detail.webhooks.map(
              (event, index) => (
                <article
                  className="admin-detail-list-item"
                  key={
                    asText(event.id) ??
                    `event-${index}`
                  }
                >
                  <div>
                    <strong>
                      {asText(event.event_type) ??
                        'PayPal event'}
                    </strong>
                    <span>
                      {humanize(
                        asText(
                          event.processing_status
                        ) ?? 'received'
                      )}
                    </span>
                  </div>
                  <StatusPill
                    value={
                      asText(
                        event.verification_status
                      ) ?? 'unverified'
                    }
                  />
                </article>
              )
            )}
          </div>
        </Panel>

        <SafeNote
          warning
          title="Refund and reconcile controls are protected"
          text="This release intentionally does not change PayPal state from the browser. We will add those actions through a protected Admin Edge Function before switching PayPal to Live."
        />
      </div>
    </SimpleModal>
  );
}

function PackEditor({
  pack,
  close,
  save,
}: {
  pack: CreditPack;
  close: () => void;
  save: (pack: CreditPack) => Promise<void>;
}) {
  const [form, setForm] =
    useState<CreditPack>(pack);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState('');

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await save(form);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SimpleModal
      title={
        pack.pack_code
          ? 'Edit review-credit pack'
          : 'Create review-credit pack'
      }
      subtitle="Pricing control"
      close={close}
      wide
    >
      <form
        className="admin-pack-form"
        onSubmit={submit}
      >
        <label>
          <span>Pack code</span>
          <input
            value={form.pack_code}
            onChange={(event) =>
              setForm({
                ...form,
                pack_code: event.target.value,
              })
            }
            pattern="[a-z0-9][a-z0-9-]{1,63}"
            placeholder="single-review"
            required
          />
        </label>
        <label>
          <span>Display name</span>
          <input
            value={form.display_name}
            onChange={(event) =>
              setForm({
                ...form,
                display_name: event.target.value,
              })
            }
            required
          />
        </label>
        <label className="admin-form-wide">
          <span>Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
            required
          />
        </label>
        <label>
          <span>Review credits</span>
          <input
            type="number"
            min="1"
            max="100"
            value={form.review_credits}
            onChange={(event) =>
              setForm({
                ...form,
                review_credits:
                  Number(event.target.value),
              })
            }
            required
          />
        </label>
        <label>
          <span>Price (USD)</span>
          <input
            type="number"
            min="0.01"
            max="10000"
            step="0.01"
            value={form.price_usd}
            onChange={(event) =>
              setForm({
                ...form,
                price_usd:
                  Number(event.target.value),
              })
            }
            required
          />
        </label>
        <label>
          <span>Validity days</span>
          <input
            type="number"
            min="1"
            max="3650"
            value={form.validity_days}
            onChange={(event) =>
              setForm({
                ...form,
                validity_days:
                  Number(event.target.value),
              })
            }
            required
          />
        </label>
        <label>
          <span>Display order</span>
          <input
            type="number"
            value={form.display_order}
            onChange={(event) =>
              setForm({
                ...form,
                display_order:
                  Number(event.target.value),
              })
            }
          />
        </label>

        <label className="admin-toggle-row">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(event) =>
              setForm({
                ...form,
                is_featured:
                  event.target.checked,
              })
            }
          />
          <span>Featured pack</span>
        </label>

        <label className="admin-toggle-row">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm({
                ...form,
                is_active:
                  event.target.checked,
              })
            }
          />
          <span>Available for purchase</span>
        </label>

        {error && (
          <div className="admin-form-error admin-form-wide">
            <AlertCircle aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="admin-modal-actions admin-form-wide">
          <button
            className="admin-secondary-button"
            type="button"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="admin-primary-button"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle
                className="admin-spin"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            Save pack
          </button>
        </div>
      </form>
    </SimpleModal>
  );
}

function Toolbar({
  title,
  total,
  children,
}: {
  title: string;
  total: number;
  children?: ReactNode;
}) {
  return (
    <header className="admin-toolbar">
      <div>
        <h3>{title}</h3>
        <span>
          {formatInteger(total)}{' '}
          {total === 1 ? 'record' : 'records'}
        </span>
      </div>
      <div className="admin-toolbar-actions">
        {children}
      </div>
    </header>
  );
}

function SearchBox({
  value,
  setValue,
  placeholder,
  submit,
}: {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  submit: () => void;
}) {
  return (
    <form
      className="admin-search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Search aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        placeholder={placeholder}
      />
      <button type="submit">Search</button>
    </form>
  );
}

function TableFrame({
  state,
  children,
}: {
  state: LoadState;
  children: ReactNode;
}) {
  if (state !== 'ready') {
    return (
      <StateCard
        state={state}
        text="Loading records…"
      />
    );
  }

  return (
    <div className="admin-table-frame">
      {children}
    </div>
  );
}

function StateCard({
  state,
  text,
}: {
  state: LoadState;
  text: string;
}) {
  return (
    <div
      className={`admin-state-card ${
        state === 'error'
          ? 'admin-state-card-error'
          : ''
      }`}
    >
      {state === 'error' ? (
        <AlertCircle aria-hidden="true" />
      ) : (
        <LoaderCircle
          className="admin-spin"
          aria-hidden="true"
        />
      )}
      <strong>
        {state === 'error'
          ? 'This Admin view could not be loaded.'
          : text}
      </strong>
    </div>
  );
}

function SimpleModal({
  title,
  subtitle,
  close,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  close: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="admin-modal-backdrop">
      <section
        className={`admin-modal ${
          wide ? 'admin-modal-wide' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            {subtitle && <span>{subtitle}</span>}
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="admin-modal-body">
          {children}
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  helper,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="admin-stat-icon">{icon}</span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </>
  );

  return onClick ? (
    <button
      className="admin-stat-card admin-stat-card-button"
      type="button"
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <article className="admin-stat-card">
      {content}
    </article>
  );
}

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="admin-metric-row">
      <span>{label}</span>
      <strong>{formatInteger(value)}</strong>
    </div>
  );
}

function MetricText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin-metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Primary({
  title,
  subtitle,
  helper,
}: {
  title: string;
  subtitle?: string | null;
  helper?: string | null;
}) {
  return (
    <div className="admin-primary-cell">
      <strong>{title}</strong>
      {subtitle && <span>{subtitle}</span>}
      {helper && <small>{helper}</small>}
    </div>
  );
}

function SafeNote({
  title,
  text,
  warning = false,
}: {
  title: string;
  text: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`admin-safe-note ${
        warning ? 'admin-safe-note-warning' : ''
      }`}
    >
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function StatusPill({
  value,
}: {
  value: string;
}) {
  const normalized = value.toLowerCase();

  const tone =
    [
      'paid',
      'completed',
      'processed',
      'success',
      'active',
      'available',
    ].includes(normalized)
      ? 'success'
      : [
          'pending',
          'created',
          'received',
          'verified',
          'reserved',
          'processing',
        ].includes(normalized)
      ? 'warning'
      : [
          'failed',
          'failure',
          'revoked',
          'cancelled',
          'denied',
        ].includes(normalized)
      ? 'danger'
      : 'neutral';

  return (
    <span
      className={`admin-status-pill admin-status-pill-${tone}`}
    >
      {humanize(value)}
    </span>
  );
}

function EmptyRow({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td
        className="admin-empty-table"
        colSpan={colSpan}
      >
        {text}
      </td>
    </tr>
  );
}

function normalizeDashboard(
  value: unknown
): DashboardData {
  if (!isRecord(value)) {
    return EMPTY_DASHBOARD;
  }

  const payments = record(value.payments);
  const credits = record(value.credits);
  const reviews = record(value.reviews);
  const usage = record(value.usage);
  const health = record(value.payment_health);

  return {
    students: asInteger(value.students),
    active_admins: asInteger(value.active_admins),
    payments: {
      total: asInteger(payments.total),
      paid: asInteger(payments.paid),
      pending: asInteger(payments.pending),
      created: asInteger(payments.created),
      failed: asInteger(payments.failed),
      cancelled: asInteger(payments.cancelled),
      refunded: asInteger(payments.refunded),
      partially_refunded: asInteger(
        payments.partially_refunded
      ),
      gross_paid_usd: asNumber(
        payments.gross_paid_usd
      ),
      gross_paid_by_currency: Object.fromEntries(
        Object.entries(
          (payments.gross_paid_by_currency ?? {}) as Record<string, unknown>
        ).map(([code, total]) => [code, asNumber(total)])
      ),
    },
    credits: {
      purchase_credits_granted:
        asInteger(
          credits.purchase_credits_granted
        ),
      purchase_credits_remaining:
        asInteger(
          credits.purchase_credits_remaining
        ),
      complimentary_credits_granted:
        asInteger(
          credits.complimentary_credits_granted
        ),
      complimentary_credits_remaining:
        asInteger(
          credits.complimentary_credits_remaining
        ),
    },
    reviews: {
      total: asInteger(reviews.total),
      completed: asInteger(reviews.completed),
      free: asInteger(reviews.free),
      paid: asInteger(reviews.paid),
      complimentary: asInteger(
        reviews.complimentary
      ),
    },
    usage: {
      estimated_ai_cost_usd: asNumber(
        usage.estimated_ai_cost_usd
      ),
      ai_input_tokens: asInteger(
        usage.ai_input_tokens
      ),
      ai_output_tokens: asInteger(
        usage.ai_output_tokens
      ),
    },
    payment_health: {
      pending_or_created: asInteger(
        health.pending_or_created
      ),
      failed_payments: asInteger(
        health.failed_payments
      ),
      webhook_failures: asInteger(
        health.webhook_failures
      ),
      webhooks_waiting: asInteger(
        health.webhooks_waiting
      ),
    },
  };
}

function normalizePaged<T>(
  value: unknown,
  normalize: (row: unknown) => T | null
): {
  rows: T[];
  total: number;
} {
  if (!isRecord(value)) {
    return { rows: [], total: 0 };
  }

  return {
    total: asInteger(value.total),
    rows: Array.isArray(value.rows)
      ? value.rows
          .map(normalize)
          .filter(
            (row): row is T =>
              row !== null
          )
      : [],
  };
}

function normalizeStudent(
  value: unknown
): StudentRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asText(value.student_id);

  if (!id) {
    return null;
  }

  return {
    student_id: id,
    full_name:
      asText(value.full_name) ?? 'Student',
    cohort: asText(value.cohort),
    email: asText(value.email),
    free_review_status:
      asText(value.free_review_status) ??
      'available',
    is_admin: value.is_admin === true,
    paid_credits_remaining:
      asInteger(
        value.paid_credits_remaining
      ),
    complimentary_credits_remaining:
      asInteger(
        value.complimentary_credits_remaining
      ),
    paid_order_count:
      asInteger(value.paid_order_count),
    paid_total_usd:
      asNumber(value.paid_total_usd),
    paid_by_currency: Object.fromEntries(
      Object.entries(
        ((value as Record<string, unknown>).paid_by_currency ?? {}) as Record<string, unknown>
      ).map(([code, total]) => [code, asNumber(total)])
    ),
    review_count:
      asInteger(value.review_count),
    completed_review_count:
      asInteger(
        value.completed_review_count
      ),
    last_payment_at:
      asText(value.last_payment_at),
    last_review_at:
      asText(value.last_review_at),
  };
}

function normalizePayment(
  value: unknown
): PaymentRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    asText(value.payment_order_id);
  const studentId =
    asText(value.student_id);

  if (!id || !studentId) {
    return null;
  }

  return {
    payment_order_id: id,
    student_id: studentId,
    full_name:
      asText(value.full_name) ?? 'Student',
    customer_email:
      asText(value.customer_email),
    pack_name:
      asText(value.pack_name) ??
      'IA review credits',
    credits_to_grant:
      asInteger(value.credits_to_grant),
    currency:
      asText(value.currency) ?? 'USD',
    amount: asNumber(value.amount),
    provider_order_id:
      asText(value.provider_order_id),
    provider_payment_id:
      asText(value.provider_payment_id),
    status:
      asText(value.status) ?? 'created',
    created_at:
      asText(value.created_at),
    invoice_number:
      asText(value.invoice_number),
    receipt_number:
      asText(value.receipt_number),
    failure_message:
      asText(value.failure_message),
    credits_remaining:
      value.credits_remaining == null
        ? null
        : asInteger(
            value.credits_remaining
          ),
    webhook_event_count:
      asInteger(value.webhook_event_count),
  };
}

function normalizeReview(
  value: unknown
): ReviewRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    asText(value.submission_id);

  if (!id) {
    return null;
  }

  return {
    submission_id: id,
    full_name:
      asText(value.full_name) ?? 'Student',
    email: asText(value.email),
    project_title:
      asText(value.project_title),
    original_filename:
      asText(value.original_filename),
    status:
      asText(value.status) ?? 'unknown',
    commercial_access:
      asText(
        value.commercial_access
      ) ?? 'unassigned',
    uploaded_at:
      asText(value.uploaded_at),
    extracted_page_count:
      value.extracted_page_count == null
        ? null
        : asInteger(
            value.extracted_page_count
          ),
    extracted_word_count:
      value.extracted_word_count == null
        ? null
        : asInteger(
            value.extracted_word_count
          ),
    estimated_ai_cost_usd:
      value.estimated_ai_cost_usd == null
        ? null
        : asNumber(
            value.estimated_ai_cost_usd
          ),
  };
}

function normalizeWebhook(
  value: unknown
): WebhookRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asText(value.id);

  if (!id) {
    return null;
  }

  return {
    id,
    provider_event_id:
      asText(value.provider_event_id) ?? id,
    event_type:
      asText(value.event_type) ??
      'PayPal event',
    verification_status:
      asText(
        value.verification_status
      ) ?? 'unverified',
    processing_status:
      asText(
        value.processing_status
      ) ?? 'received',
    payment_order_id:
      asText(value.payment_order_id),
    payment_status:
      asText(value.payment_status),
    full_name:
      asText(value.full_name),
    customer_email:
      asText(value.customer_email),
    received_at:
      asText(value.received_at),
    error_message:
      asText(value.error_message),
  };
}

function normalizePack(
  value: unknown
): CreditPack | null {
  if (!isRecord(value)) {
    return null;
  }

  const code = asText(value.pack_code);

  if (!code) {
    return null;
  }

  return {
    pack_code: code,
    display_name:
      asText(value.display_name) ?? code,
    description:
      asText(value.description) ?? '',
    review_credits:
      asInteger(value.review_credits),
    price_usd:
      asNumber(value.price_usd),
    validity_days:
      asInteger(value.validity_days),
    is_featured:
      value.is_featured === true,
    is_active:
      value.is_active !== false,
    display_order:
      asInteger(value.display_order),
  };
}

function normalizeAudit(
  value: unknown
): AuditRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asText(value.id);

  if (!id) {
    return null;
  }

  return {
    id,
    action:
      asText(value.action) ??
      'admin_action',
    entity_type:
      asText(value.entity_type),
    entity_id:
      asText(value.entity_id),
    actor_email:
      asText(value.actor_email),
    target_email:
      asText(value.target_email),
    details: record(value.details),
    created_at:
      asText(value.created_at),
  };
}

function normalizeStudentDetail(
  value: unknown
): StudentDetail | null {
  if (
    !isRecord(value) ||
    !isRecord(value.student)
  ) {
    return null;
  }

  const id =
    asText(value.student.student_id);

  if (!id) {
    return null;
  }

  return {
    student: {
      student_id: id,
      full_name:
        asText(
          value.student.full_name
        ) ?? 'Student',
      cohort:
        asText(value.student.cohort),
      email:
        asText(value.student.email),
      created_at:
        asText(
          value.student.created_at
        ),
      is_admin:
        value.student.is_admin === true,
    },
    credit_account:
      isRecord(value.credit_account)
        ? value.credit_account
        : null,
    credit_grants:
      recordArray(value.credit_grants),
    payments:
      recordArray(value.payments),
    reviews:
      recordArray(value.reviews),
  };
}

function normalizePaymentDetail(
  value: unknown
): PaymentDetail | null {
  if (
    !isRecord(value) ||
    !isRecord(value.order)
  ) {
    return null;
  }

  return {
    order: value.order,
    student:
      isRecord(value.student)
        ? value.student
        : null,
    credit_grant:
      isRecord(value.credit_grant)
        ? value.credit_grant
        : null,
    webhooks:
      recordArray(value.webhooks),
  };
}

function blankPack(): CreditPack {
  return {
    pack_code: '',
    display_name: '',
    description: '',
    review_credits: 1,
    price_usd: 9.99,
    validity_days: 365,
    is_featured: false,
    is_active: true,
    display_order: 40,
  };
}

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function record(
  value: unknown
): JsonRecord {
  return isRecord(value) ? value : {};
}

function recordArray(
  value: unknown
): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter(isRecord)
    : [];
}

function asText(
  value: unknown
): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  return text || null;
}

function asInteger(
  value: unknown
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Math.max(0, Math.trunc(parsed))
    : 0;
}

function asNumber(
  value: unknown
): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function humanize(
  value: string
): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function shortId(
  value: string
): string {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function formatInteger(
  value: number
): string {
  return new Intl.NumberFormat(
    'en-GB'
  ).format(value);
}

function formatMoney(
  value: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(
      'en-GB',
      {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(value);
  } catch {
    return `${currency.toUpperCase()} ${value.toFixed(2)}`;
  }
}

function formatDate(
  value: string | null
): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(parsed);
}

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    isRecord(error) &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }

  return 'The Admin action could not be completed. Please try again.';
}

