import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CalendarDays,
  Clock3,
  CreditCard,
  Copy,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Link2,
  KeyRound,
  Layers3,
  ListChecks,
  LogIn,
  Mail,
  LoaderCircle,
  MapPin,
  Printer,
  Quote,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  Share2,
  Sparkles,
  Target,
  ChevronRight,
  UserPlus,
  UploadCloud,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from 'react';

import type { Session } from '@supabase/supabase-js';

import {
  type AccountSessionState,
  completeCurrentReviewAccount,
  ensureAnonymousSession,
  getAccountSessionState,
  getSignedInEmail,
  requestCurrentReviewAccountEmail,
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signOutAccount,
  subscribeToAuthChanges,
  updateRecoveredPassword,
} from './lib/anonymousSession';

import { supabase } from './lib/supabase';
import { WorkshopGuidedReview } from './components/WorkshopGuidedReview';
import { DraftComparison, type DraftSnapshot } from './components/DraftComparison';

import {
  PayPalCheckoutModal,
  type PayPalCreditPack,
} from './components/PayPalCheckoutModal';

import { AccountPage } from './components/AccountPage';
import { AdminControlCentre } from './components/AdminControlCentre';
import {
  PremiumWorkspaceShell,
  type PremiumWorkspaceView,
} from './components/PremiumWorkspaceShell';
import { ReviewReadyToast } from './components/ReviewReadyToast';
import {
  ReviewAccessModal,
  type ReviewAccessPack,
  type ReviewAccessSummary,
} from './components/ReviewAccessModal';

import { FileValidationError, validateIaFile } from './lib/fileValidation';

import {
  createInitialPipelineProgress,
  loadSavedPipelineProgress,
  PIPELINE_STAGES,
  PipelineError,
  runIaPipelineToCompletion,
} from './lib/pipeline';

import { uploadIaSubmission } from './lib/uploadSubmission';

import { DOCX_MIME_TYPE, PDF_MIME_TYPE } from './types/ia';

import type {
  ActiveIaReviewResponse,
  IaReviewAccessSource,
  IaSubmission,
  PipelineCompletion,
  PipelineProgress,
  PipelineStageKey,
  ValidatedIaFile,
} from './types/ia';

import './processing.css';
import './auth.css';
import './reports.css';
import './landing.css';
import './paypal.css';
import './account-commerce.css';
import './member-experience.css';
import './premium-workspace.css';
import './admin-control-centre.css';
import './share-review.css';
import './aurora.css';
import { TeacherCopyPanel } from './components/TeacherCopyPanel';

type AppStatus =
  | 'starting'
  | 'ready'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

type ErrorContext = 'session' | 'file' | 'upload' | 'pipeline' | null;

const COMPLETED_REVIEW_STORAGE_KEY = 'sehs-ia-completed-review';
const ACCOUNT_CONVERSION_REVIEW_KEY = 'sehs-ia-account-conversion-review';
const ACCOUNT_CONVERSION_EMAIL_KEY = 'sehs-ia-account-conversion-email';
const OPEN_SAVED_REPORT_KEY = 'sehs-ia-open-saved-report';
const REVIEW_ACCESS_SOURCE_KEY = 'sehs-ia-review-access-source';
const REVIEW_READY_READ_PREFIX = 'sehs-ia-review-ready-read:';
const REVIEW_READY_TOAST_PREFIX = 'sehs-ia-review-ready-toast:';

type AuthPanelMode =
  | 'closed'
  | 'choose'
  | 'create'
  | 'confirmation-sent'
  | 'set-password'
  | 'sign-in'
  | 'forgot-password'
  | 'reset-password'
  | 'account';

type MainWorkspaceView =
  | 'landing'
  | 'pricing'
  | 'workspace'
  | 'reports'
  | 'account'
  | 'admin';

type ReportSaveState = 'checking' | 'unsaved' | 'saving' | 'saved' | 'error';

let reviewSessionRefreshPromise: Promise<void> | null = null;

type SavedCompletedReview = {
  submission: IaSubmission;
  completion: PipelineCompletion;
};

type CreditPack = {
  pack_code: string;
  display_name: string;
  description: string;
  review_credits: number;
  price_usd: number;
  validity_days: number;
  is_featured: boolean;
  display_order: number;
};

type ReviewLimits = {
  maximum_file_size_bytes: number;
  maximum_pages: number;
  maximum_words: number;
  maximum_estimated_document_tokens: number;
  free_report_retention_hours: number;
  paid_credit_validity_days: number;
};

type ReportHistoryRow = {
  submission_id: string;
  student_id: string;
  project_id: string;
  project_title: string;
  research_question: string | null;
  subject: string;
  version_number: number;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: string;
  uploaded_at: string;
  report_generated_at: string | null;
  saved_at: string | null;
  retention_policy: string;
  word_count: number | null;
  page_count: number | null;
  criterion_scores: unknown;
  progress_plan_ready: boolean;
  annotated_html_ready: boolean;
  annotated_docx_ready: boolean;
  is_latest_version: boolean;
};

type SavedReportLoadResult = {
  submission: IaSubmission;
  completion: PipelineCompletion;
};

type AnnotationShareLink = {
  id: string;
  artifact_id: string;
  submission_id: string;
  student_id: string;
  created_by?: string;
  expires_at: string;
  revoked_at: string | null;
  revoked_by?: string | null;
  allow_download: boolean;
  include_marking: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  active?: boolean;
};

type ManageAnnotationShareResponse = {
  status?: string;
  artifact_id?: string;
  shares?: AnnotationShareLink[];
  share?: AnnotationShareLink & {
    share_path?: string;
    share_url?: string;
  };
  share_id?: string;
  revoked_at?: string;
  already_revoked?: boolean;
};

function App() {
  const sharedReviewToken = useMemo(
    () => getSharedReviewToken(window.location.pathname),
    []
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pipelineRunToken = useRef(0);

  const [status, setStatus] = useState<AppStatus>('starting');

  const [errorContext, setErrorContext] = useState<ErrorContext>(null);

  const [selectedFile, setSelectedFile] = useState<ValidatedIaFile | null>(
    null
  );

  const [submission, setSubmission] = useState<IaSubmission | null>(null);

  const [pipelineProgress, setPipelineProgress] =
    useState<PipelineProgress | null>(null);

  const [completion, setCompletion] = useState<PipelineCompletion | null>(null);

  const [message, setMessage] = useState('');

  const [session, setSession] = useState<Session | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [authPanelMode, setAuthPanelMode] = useState<AuthPanelMode>('closed');

  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');

  const [reportSaveState, setReportSaveState] =
    useState<ReportSaveState>('checking');

  const [reportSaveMessage, setReportSaveMessage] = useState('');

  const [mainView, setMainView] = useState<MainWorkspaceView>(() => {
    const currentPath = window.location.pathname;

    if (currentPath === '/admin') {
      return 'admin';
    }

    if (currentPath === '/my-account') {
      return 'account';
    }

    if (currentPath.startsWith('/my-reports')) {
      return 'reports';
    }

    if (currentPath === '/pricing') {
      return 'pricing';
    }

    if (currentPath === '/review') {
      return 'workspace';
    }

    return 'landing';
  });

  const [isViewingSavedReport, setIsViewingSavedReport] = useState(false);

  const [selectedCreditPack, setSelectedCreditPack] =
    useState<PayPalCreditPack | null>(null);

  const [reviewAccessModalOpen, setReviewAccessModalOpen] = useState(false);

  const [reviewAccessLoading, setReviewAccessLoading] = useState(false);

  const [reviewAccessSummary, setReviewAccessSummary] =
    useState<ReviewAccessSummary | null>(null);

  const [reviewAccessSource, setReviewAccessSource] =
    useState<IaReviewAccessSource | null>(() => loadSavedReviewAccessSource());

  const [reviewUpgradeError, setReviewUpgradeError] = useState('');

  const [reviewAccessIntent, setReviewAccessIntent] = useState<
    'start' | 'credits'
  >('start');

  const [accountSection, setAccountSection] = useState<'dashboard' | 'billing'>(
    () => (window.location.hash === '#billing' ? 'billing' : 'dashboard')
  );

  const [reviewReadyUnread, setReviewReadyUnread] = useState(false);

  const [reviewReadyToastOpen, setReviewReadyToastOpen] = useState(false);

  const {
    paymentsEnabled,
    paymentStatusLoaded,
    refreshPaymentStatus,
  } = usePaymentCollectionStatus(!sharedReviewToken);

  const { packs: reviewAccessPacks } = usePublicCommercialSettings(
    !sharedReviewToken && paymentsEnabled
  );

  useEffect(() => {
    if (!sharedReviewToken && session) {
      void refreshPaymentStatus();
    }
  }, [sharedReviewToken, session?.access_token, refreshPaymentStatus]);

  useEffect(() => {
    if (!paymentStatusLoaded || paymentsEnabled) {
      return;
    }

    setReviewAccessModalOpen(false);
    setSelectedCreditPack(null);

    if (mainView !== 'pricing') {
      return;
    }

    if (getAccountSessionState(session) === 'permanent') {
      setAccountSection('dashboard');

      if (isAdmin) {
        setMainView('admin');
        replaceAppRoute('/admin');
      } else {
        setMainView('account');
        replaceAppRoute('/my-account');
      }
    } else {
      setMainView('landing');
      replaceAppRoute('/');
    }
  }, [paymentStatusLoaded, paymentsEnabled, mainView, session, isAdmin]);

  useEffect(() => {
    if (sharedReviewToken) {
      setStatus('ready');
      setErrorContext(null);
      return;
    }

    let active = true;

    const subscription = subscribeToAuthChanges((event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setAuthPanelMode('reset-password');
        setAuthMessage('Choose a new password for your account.');
        setAuthError('');
      }
    });

    async function startSecureSession() {
      try {
        const activeSession = await ensureAnonymousSession();

        if (!active) {
          return;
        }

        setSession(activeSession);

        const currentPath = window.location.pathname;
        const accountState = getAccountSessionState(activeSession);

        let currentIsAdmin = false;

        if (accountState === 'permanent') {
          try {
            const { data: roleData, error: roleError } = await supabase.rpc(
              'get_my_ia_role'
            );

            if (roleError) {
              throw roleError;
            }

            currentIsAdmin = isRecord(roleData) && roleData.is_admin === true;

            setIsAdmin(currentIsAdmin);
          } catch (roleError) {
            console.error('Account role could not be loaded', roleError);

            setIsAdmin(false);
            currentIsAdmin = false;
          }
        } else {
          setIsAdmin(false);
        }

        if (
          currentIsAdmin &&
          (currentPath === '/admin' ||
            currentPath === '/my-account' ||
            currentPath === '/pricing')
        ) {
          setMainView('admin');
          setAccountSection('dashboard');
          replaceAppRoute('/admin');
          setStatus('ready');
        } else if (currentPath === '/admin') {
          setMainView('landing');
          setAuthPanelMode('sign-in');
          setAuthMessage(
            'Sign in with an Admin account to open the Admin Control Centre.'
          );
          replaceAppRoute('/');
          setStatus('ready');
        } else if (
          currentPath === '/my-account' &&
          accountState === 'permanent'
        ) {
          setMainView('account');
          setStatus('ready');
        } else if (currentPath === '/my-account') {
          setMainView('landing');
          setAuthPanelMode('sign-in');
          setAuthMessage(
            'Sign in to open your account, purchases, credits and invoices.'
          );
          setStatus('ready');
        } else if (
          currentPath === '/my-reports/view' &&
          accountState === 'permanent'
        ) {
          const openSubmissionId = window.sessionStorage.getItem(
            OPEN_SAVED_REPORT_KEY
          );

          if (openSubmissionId) {
            try {
              const savedReport = await loadSavedReportVersion(
                openSubmissionId
              );

              if (!active) {
                return;
              }

              setSelectedFile(null);
              setSubmission(savedReport.submission);
              setCompletion(savedReport.completion);
              setReportSaveState('saved');
              setReportSaveMessage(
                `Version ${savedReport.submission.draft_version} is saved to your account.`
              );
              setIsViewingSavedReport(true);
              setMainView('workspace');
              setStatus('complete');
            } catch (error) {
              console.error('Saved report could not be restored', error);

              window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);

              setMainView('reports');
              replaceAppRoute('/my-reports');
              setStatus('ready');
            }
          } else {
            setMainView('reports');
            replaceAppRoute('/my-reports');
            setStatus('ready');
          }
        } else if (
          currentPath.startsWith('/my-reports') &&
          accountState === 'permanent'
        ) {
          setMainView('reports');
          setStatus('ready');
        } else if (currentPath === '/pricing') {
          setMainView('pricing');
          setStatus('ready');
        } else if (currentPath === '/review') {
          const savedReview =
            loadSavedCompletedReview() ?? loadAccountConversionReview();

          setMainView('workspace');

          if (savedReview) {
            setSubmission(savedReview.submission);
            setCompletion(savedReview.completion);
            setStatus('complete');
          } else {
            if (currentIsAdmin) {
              setReviewAccessSource('paid_credit');
              window.sessionStorage.setItem(
                REVIEW_ACCESS_SOURCE_KEY,
                'paid_credit'
              );
            }

            setStatus('ready');
          }
        } else if (accountState === 'permanent') {
          setAccountSection('dashboard');

          if (currentIsAdmin) {
            setMainView('admin');
            replaceAppRoute('/admin');
          } else {
            setMainView('account');
            replaceAppRoute('/my-account');
          }

          setStatus('ready');
        } else {
          setMainView('landing');
          setStatus('ready');
        }

        if (currentPath === '/account-confirmed') {
          setMainView('landing');
          setAuthPanelMode('set-password');
          setAuthMessage(
            'Your email address is confirmed. Create your password to finish setting up the account.'
          );
        } else if (currentPath === '/reset-password') {
          setMainView('landing');
          setAuthPanelMode('reset-password');
          setAuthMessage('Choose a new password for your account.');
        }

        if (accountState === 'permanent') {
          await recoverCompletedReviewForCurrentAccount();

          if (!active) {
            return;
          }

          const activeReview = await loadActiveReviewForCurrentAccount();

          if (!active) {
            return;
          }

          if (activeReview) {
            setSelectedFile(null);
            setSubmission(activeReview);
            setCompletion(null);
            setPipelineProgress(
              loadSavedPipelineProgress(activeReview.id) ??
                createInitialPipelineProgress(activeReview.id)
            );
            setStatus('processing');
            setErrorContext(null);
            setMessage('');
            setIsViewingSavedReport(false);

            if (currentPath === '/my-reports/view') {
              setMainView('reports');
              replaceAppRoute('/my-reports');
            }

            void startPipeline(activeReview);
          }
        }

        setErrorContext(null);
      } catch (error) {
        if (active) {
          setMessage(getErrorMessage(error));
          setErrorContext('session');
          setStatus('error');
        }
      }
    }

    void startSecureSession();

    return () => {
      active = false;
      subscription.unsubscribe();
      pipelineRunToken.current += 1;
    };
  }, [sharedReviewToken]);

  useEffect(() => {
    if (status === 'complete' && submission && completion) {
      saveCompletedReview(submission, completion);
    }
  }, [status, submission, completion]);

  useEffect(() => {
    if (status !== 'complete' || !submission?.id || isViewingSavedReport) {
      setReviewReadyToastOpen(false);
      return;
    }

    const readKey = `${REVIEW_READY_READ_PREFIX}${submission.id}`;

    const toastKey = `${REVIEW_READY_TOAST_PREFIX}${submission.id}`;

    let isRead = false;
    let toastShown = false;

    try {
      isRead = window.localStorage.getItem(readKey) === 'true';

      toastShown = window.sessionStorage.getItem(toastKey) === 'true';
    } catch {
      // The notification still works when browser storage is unavailable.
    }

    setReviewReadyUnread(!isRead);

    if (isRead || toastShown) {
      setReviewReadyToastOpen(false);
      return;
    }

    setReviewReadyToastOpen(true);

    try {
      window.sessionStorage.setItem(toastKey, 'true');
    } catch {
      // The toast can still be displayed without storage.
    }

    const timeoutId = window.setTimeout(() => {
      setReviewReadyToastOpen(false);
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, submission?.id, isViewingSavedReport]);

  useEffect(() => {
    let active = true;

    async function checkReportRetention() {
      if (
        status !== 'complete' ||
        !submission?.id ||
        getAccountSessionState(session) !== 'permanent'
      ) {
        if (active) {
          setReportSaveState(status === 'complete' ? 'unsaved' : 'checking');
          setReportSaveMessage('');
        }

        return;
      }

      setReportSaveState('checking');
      setReportSaveMessage('Checking whether this version is saved…');

      const { data, error } = await supabase.rpc('get_my_ia_report_history');

      if (!active) {
        return;
      }

      if (error) {
        console.error('Saved report status could not be checked', error);
        setReportSaveState('unsaved');
        setReportSaveMessage('');
        return;
      }

      const isSaved =
        Array.isArray(data) &&
        data.some(
          (row) =>
            row?.submission_id === submission.id &&
            row?.retention_policy === 'account'
        );

      setReportSaveState(isSaved ? 'saved' : 'unsaved');
      setReportSaveMessage(
        isSaved
          ? `Version ${submission.draft_version} is saved to your account.`
          : ''
      );
    }

    void checkReportRetention();

    return () => {
      active = false;
    };
  }, [status, submission?.id, submission?.draft_version, session]);

  if (sharedReviewToken) {
    return <SharedReviewPage token={sharedReviewToken} />;
  }

  function handleChooseFile() {
    if (
      getAccountSessionState(session) === 'permanent' &&
      !reviewAccessSource
    ) {
      void openReviewWorkspace();
      return;
    }

    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setMessage('');
    clearSavedCompletedReview();
    clearAccountConversionReview();
    setSubmission(null);
    setCompletion(null);
    setPipelineProgress(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    try {
      const validated = validateIaFile(file);

      setSelectedFile(validated);
      setErrorContext(null);
      setStatus('ready');
    } catch (error) {
      setSelectedFile(null);
      setMessage(getErrorMessage(error));
      setErrorContext('file');
      setStatus('error');

      event.target.value = '';
    }
  }

  function clearSelectedFile() {
    pipelineRunToken.current += 1;

    clearSavedCompletedReview();
    clearAccountConversionReview();
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    setMainView('workspace');
    setAccountSection('dashboard');
    setIsViewingSavedReport(false);
    setReviewReadyUnread(false);
    setReviewReadyToastOpen(false);
    replaceAppRoute('/review');
    setSelectedFile(null);
    setSubmission(null);
    setCompletion(null);
    setPipelineProgress(null);
    setMessage('');
    setErrorContext(null);
    setStatus('ready');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleUploadAndReview() {
    if (!reviewAccessSource) {
      await openReviewWorkspace();
      return;
    }

    if (!selectedFile) {
      setMessage('Please select a PDF or DOCX document first.');
      setErrorContext('file');
      setStatus('error');
      return;
    }

    try {
      setStatus('uploading');
      setMessage('');
      setErrorContext(null);

      const createdSubmission = await uploadIaSubmission(
        selectedFile,
        reviewAccessSource
      );

      setSubmission(createdSubmission);
      setReviewAccessSource(null);
      window.sessionStorage.removeItem(REVIEW_ACCESS_SOURCE_KEY);

      await startPipeline(createdSubmission);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setErrorContext('upload');
      setStatus('error');
    }
  }

  async function startPipeline(currentSubmission: IaSubmission) {
    const currentRun = pipelineRunToken.current + 1;

    pipelineRunToken.current = currentRun;

    setStatus('processing');
    setMessage('');
    setErrorContext(null);
    setCompletion(null);

    setPipelineProgress(createInitialPipelineProgress(currentSubmission.id));

    try {
      const result = await runIaPipelineToCompletion({
        submissionId: currentSubmission.id,

        onProgress: (progress) => {
          if (pipelineRunToken.current === currentRun) {
            setPipelineProgress(progress);
          }
        },

        isCancelled: () => pipelineRunToken.current !== currentRun,
      });

      if (pipelineRunToken.current !== currentRun) {
        return;
      }

      saveCompletedReview(currentSubmission, result);
      setIsViewingSavedReport(false);
      setCompletion(result);
      setStatus('complete');
      setReportSaveState(result.reportSaved ? 'saved' : 'unsaved');
      setReportSaveMessage(
        result.reportSaved
          ? `Version ${currentSubmission.draft_version} was saved automatically to My IA Reports.`
          : ''
      );

      window.dispatchEvent(new CustomEvent('ia-review-finalized'));

      window.dispatchEvent(new CustomEvent('ia-credit-balance-changed'));

      window.dispatchEvent(new CustomEvent('ia-report-history-changed'));

      window.dispatchEvent(new CustomEvent('ia-active-review-changed'));
    } catch (error) {
      if (pipelineRunToken.current !== currentRun) {
        return;
      }

      setMessage(getErrorMessage(error));
      setErrorContext('pipeline');
      setStatus('error');
    }
  }

  async function retrySecureSession() {
    try {
      setStatus('starting');
      setMessage('');
      setErrorContext(null);

      await ensureAnonymousSession();

      setStatus('ready');
    } catch (error) {
      setMessage(getErrorMessage(error));
      setErrorContext('session');
      setStatus('error');
    }
  }

  async function retryPipeline() {
    if (!submission) {
      setMessage(
        'The review session could not be resumed. Please upload the document again.'
      );
      setErrorContext('upload');
      setStatus('error');
      return;
    }

    await startPipeline(submission);
  }

  const accountState = getAccountSessionState(session);
  const signedInEmail = getSignedInEmail(session);

  async function refreshCurrentRole(
    activeSession: Session | null = session
  ): Promise<boolean> {
    if (getAccountSessionState(activeSession) !== 'permanent') {
      setIsAdmin(false);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('get_my_ia_role');

      if (error) {
        throw error;
      }

      const nextIsAdmin = isRecord(data) && data.is_admin === true;

      setIsAdmin(nextIsAdmin);
      return nextIsAdmin;
    } catch (error) {
      console.error('Account role could not be loaded', error);

      setIsAdmin(false);
      return false;
    }
  }

  function openAdminControlCentre() {
    if (accountState !== 'permanent' || !isAdmin) {
      openAccountPanel('sign-in');
      return;
    }

    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
    setReviewAccessModalOpen(false);
    setSelectedCreditPack(null);
    setAccountSection('dashboard');
    setMainView('admin');
    setIsViewingSavedReport(false);
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    replaceAppRoute('/admin');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function openLandingPage() {
    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
    setIsViewingSavedReport(false);
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);

    if (accountState === 'permanent') {
      setAccountSection('dashboard');

      if (isAdmin) {
        setMainView('admin');
        replaceAppRoute('/admin');
      } else {
        setMainView('account');
        replaceAppRoute('/my-account');
      }
    } else {
      setMainView('landing');
      replaceAppRoute('/');
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function openPricingPage() {
    if (accountState === 'permanent' && isAdmin) {
      openAdminControlCentre();
      return;
    }

    const collectionEnabled = await refreshPaymentStatus();

    if (!collectionEnabled) {
      setReviewAccessModalOpen(false);
      setSelectedCreditPack(null);
      setReviewUpgradeError(
        'New review-credit purchases are temporarily unavailable. Existing credits and saved reports are not affected.'
      );

      if (accountState === 'permanent') {
        setAccountSection('dashboard');
        setMainView('account');
        replaceAppRoute('/my-account');
      } else {
        setMainView('landing');
        replaceAppRoute('/');
      }

      return;
    }

    setReviewUpgradeError('');
    setReviewAccessModalOpen(false);
    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
    setMainView('pricing');
    setIsViewingSavedReport(false);
    replaceAppRoute('/pricing');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function openBuyCredits() {
    if (accountState === 'permanent' && isAdmin) {
      openAdminControlCentre();
      return;
    }

    const collectionEnabled = await refreshPaymentStatus();

    if (!collectionEnabled) {
      setReviewAccessModalOpen(false);
      setSelectedCreditPack(null);
      setReviewUpgradeError(
        'New review-credit purchases are temporarily unavailable. Existing credits and saved reports are not affected.'
      );
      return;
    }

    if (accountState !== 'permanent') {
      await openPricingPage();
      return;
    }

    setReviewAccessIntent('credits');
    setReviewAccessModalOpen(true);
    setReviewAccessLoading(true);
    setReviewUpgradeError('');

    try {
      const summary = await loadMyReviewAccessSummary();

      setReviewAccessSummary(summary);
    } catch (error) {
      console.error('Review-credit options could not be loaded', error);

      setReviewAccessSummary(null);
      setAuthError(
        'Review-credit options could not be loaded. Please refresh the page and try again.'
      );
    } finally {
      setReviewAccessLoading(false);
    }
  }

  function openBillingDashboard() {
    if (accountState === 'permanent' && isAdmin) {
      openAdminControlCentre();
      return;
    }

    if (accountState !== 'permanent') {
      openAccountPanel('sign-in');
      return;
    }

    setAuthPanelMode('closed');
    setAccountSection('billing');
    setMainView('account');
    setIsViewingSavedReport(false);
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    replaceAppRoute('/my-account#billing');

    window.setTimeout(() => {
      document.getElementById('premium-billing-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  async function openReviewWorkspace() {
    if (accountState !== 'permanent') {
      setAuthPanelMode('create');
      setAuthError('');
      setAuthMessage(
        'Create and verify your account before starting an IA review.'
      );
      return;
    }

    if (isCurrentReviewActive(status, errorContext, submission)) {
      openCurrentReview();
      return;
    }

    if (isAdmin) {
      prepareReviewWorkspace('paid_credit');
      return;
    }

    const collectionEnabled = await refreshPaymentStatus();

    setReviewAccessModalOpen(collectionEnabled);
    setReviewAccessLoading(true);

    try {
      const summary = await loadMyReviewAccessSummary();

      setReviewAccessSummary(summary);

      if (summary.total_paid_or_complimentary_credits > 0) {
        setReviewAccessModalOpen(false);
        prepareReviewWorkspace('paid_credit');
        return;
      }

      if (!collectionEnabled && summary.free_review_available) {
        setReviewAccessModalOpen(false);
        prepareReviewWorkspace('free_review');
        return;
      }

      if (!collectionEnabled) {
        setReviewAccessModalOpen(false);
        setReviewAccessSource(null);
        window.sessionStorage.removeItem(REVIEW_ACCESS_SOURCE_KEY);
        setMainView('workspace');
        replaceAppRoute('/review');
      }
    } catch (error) {
      console.error('Review access could not be checked', error);

      setReviewAccessSummary(null);
      setAuthError(
        'Your review access could not be checked. Please refresh the page and try again.'
      );
    } finally {
      setReviewAccessLoading(false);
    }
  }

  function prepareReviewWorkspace(source: IaReviewAccessSource) {
    setReviewUpgradeError('');
    setReviewAccessModalOpen(false);
    setReviewAccessSource(source);
    window.sessionStorage.setItem(REVIEW_ACCESS_SOURCE_KEY, source);

    clearSavedCompletedReview();
    clearAccountConversionReview();
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    setSelectedFile(null);
    setSubmission(null);
    setPipelineProgress(null);
    setCompletion(null);
    setMessage('');
    setErrorContext(null);
    setStatus('ready');
    setMainView('workspace');
    setIsViewingSavedReport(false);
    replaceAppRoute('/review');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function startFreeLimitedReview() {
    if (reviewAccessSummary?.free_review_available !== true) {
      return;
    }

    prepareReviewWorkspace('free_review');
  }

  function closeReviewAccessModal() {
    if (reviewAccessLoading) {
      return;
    }

    setReviewAccessModalOpen(false);
  }

  function choosePackFromReviewAccess(pack: ReviewAccessPack) {
    setReviewAccessModalOpen(false);

    void chooseCreditPack({
      ...pack,
      display_order: 0,
    });
  }

  function openCurrentReview() {
    if (!submission) {
      return;
    }

    markCurrentReviewRead();
    setAuthPanelMode('closed');
    setAccountSection('dashboard');
    setMainView('workspace');
    setIsViewingSavedReport(false);
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    replaceAppRoute('/review');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function markCurrentReviewRead() {
    if (!submission?.id) {
      return;
    }

    try {
      window.localStorage.setItem(
        `${REVIEW_READY_READ_PREFIX}${submission.id}`,
        'true'
      );
    } catch {
      // The current session can still mark the notification as read.
    }

    setReviewReadyUnread(false);
    setReviewReadyToastOpen(false);
  }

  async function chooseCreditPack(pack: CreditPack) {
    setReviewAccessModalOpen(false);

    if (accountState === 'permanent' && isAdmin) {
      openAdminControlCentre();
      return;
    }

    const collectionEnabled = await refreshPaymentStatus();

    if (!collectionEnabled) {
      setSelectedCreditPack(null);
      setReviewUpgradeError(
        'New review-credit purchases are temporarily unavailable. Existing credits and saved reports are not affected.'
      );
      return;
    }

    if (accountState !== 'permanent') {
      setAuthPanelMode('create');
      setAuthError('');
      setAuthMessage(
        `Create and verify your account before purchasing the ${pack.display_name}.`
      );
      return;
    }

    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
    setSelectedCreditPack({
      pack_code: pack.pack_code,
      display_name: pack.display_name,
      description: pack.description,
      review_credits: pack.review_credits,
      price_usd: pack.price_usd,
      validity_days: pack.validity_days,
    });
  }

  function closePayPalCheckout() {
    setSelectedCreditPack(null);
  }

  async function startReviewAfterPayment() {
    const freePreviewSubmissionId =
      status === 'complete' && submission?.commercial_access === 'free_review'
        ? submission.id
        : null;

    setSelectedCreditPack(null);
    setReviewUpgradeError('');

    if (!freePreviewSubmissionId) {
      prepareReviewWorkspace('paid_credit');
      return;
    }

    try {
      await ensureFreshReviewSession();

      const { data, error } = await supabase.rpc('upgrade_my_free_ia_review', {
        p_submission_id: freePreviewSubmissionId,
      });

      if (error) {
        throw error;
      }

      if (!isRecord(data) || data.upgraded !== true) {
        throw new Error('The completed preview could not be unlocked.');
      }

      const upgradedAccess =
        normalizeCommercialAccess(data.commercial_access) ?? 'paid_credit';

      const upgradedAt = asText(data.upgraded_at) ?? new Date().toISOString();

      setSubmission((current) =>
        current
          ? {
              ...current,
              commercial_access: upgradedAccess,
              access_expires_at: null,
              retention_policy: 'account',
              saved_at: current.saved_at ?? upgradedAt,
            }
          : current
      );

      setCompletion((current) =>
        current
          ? {
              ...current,
              commercialAccess: upgradedAccess,
              creditConsumed: true,
              reportSaved: true,
              finalizedAt: upgradedAt,
            }
          : current
      );

      setMainView('workspace');
      setIsViewingSavedReport(false);
      replaceAppRoute('/review');

      window.dispatchEvent(new CustomEvent('ia-credit-balance-changed'));

      window.dispatchEvent(new CustomEvent('ia-report-history-changed'));

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error('The free IA preview could not be unlocked', error);

      setReviewUpgradeError(
        getErrorMessage(error) ||
          'The completed preview could not be unlocked. Your purchased review credit remains available.'
      );
    }
  }

  function openReportsDashboard() {
    if (accountState !== 'permanent') {
      openAccountPanel('sign-in');
      return;
    }

    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
    setMainView('reports');
    setAccountSection('dashboard');
    setIsViewingSavedReport(false);
    window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
    replaceAppRoute('/my-reports');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  async function openSavedReport(submissionId: string): Promise<void> {
    if (isCurrentReviewActive(status, errorContext, submission)) {
      throw new Error(
        'Your current IA review is still being prepared. Use View progress before opening another saved report.'
      );
    }

    if (accountState !== 'permanent') {
      throw new Error('Sign in to open a saved report.');
    }

    if (status === 'complete' && submission) {
      markCurrentReviewRead();
    }

    const savedReport = await loadSavedReportVersion(submissionId);

    window.sessionStorage.setItem(OPEN_SAVED_REPORT_KEY, submissionId);

    saveCompletedReview(savedReport.submission, savedReport.completion);

    setSelectedFile(null);
    setSubmission(savedReport.submission);
    setCompletion(savedReport.completion);
    setPipelineProgress(null);
    setMessage('');
    setErrorContext(null);
    setReportSaveState('saved');
    setReportSaveMessage(
      `Version ${savedReport.submission.draft_version} is saved to your account.`
    );
    setIsViewingSavedReport(true);
    setAccountSection('dashboard');
    setMainView('workspace');
    setStatus('complete');
    replaceAppRoute('/my-reports/view');

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  function openAccountPanel(preferredMode?: Exclude<AuthPanelMode, 'closed'>) {
    setAuthError('');
    setAuthMessage('');

    if (
      accountState === 'permanent' &&
      isAdmin &&
      (!preferredMode || preferredMode === 'account')
    ) {
      openAdminControlCentre();
      return;
    }

    const shouldOpenAccountPage =
      accountState === 'permanent' &&
      (!preferredMode || preferredMode === 'account');

    if (shouldOpenAccountPage) {
      setAuthPanelMode('closed');
      setAccountSection('dashboard');
      setMainView('account');
      setIsViewingSavedReport(false);
      window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
      replaceAppRoute('/my-account');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }

    if (preferredMode && preferredMode !== 'account') {
      setAuthPanelMode(preferredMode);
      return;
    }

    setAuthPanelMode('choose');
  }

  function closeAccountPanel() {
    if (
      authBusy ||
      authPanelMode === 'set-password' ||
      authPanelMode === 'reset-password'
    ) {
      return;
    }

    setAuthPanelMode('closed');
    setAuthError('');
    setAuthMessage('');
  }

  async function handleCreateAccount(email: string) {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      if (submission && completion) {
        saveAccountConversionReview(submission, completion, email);
      } else {
        saveAccountConversionEmail(email);
      }

      await requestCurrentReviewAccountEmail(email);

      setAuthPanelMode('confirmation-sent');
      setAuthMessage(
        'Check your email and open the confirmation link. You will then choose your password.'
      );
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSetAccountPassword(password: string) {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const updatedSession = await completeCurrentReviewAccount(password);

      setSession(updatedSession);

      const pendingReview = loadAccountConversionReview();
      const submissionId =
        submission?.id ?? pendingReview?.submission.id ?? null;

      if (submissionId) {
        await saveCompletedReportToAccount(submissionId);
      }

      clearAccountConversionReview();
      setAuthPanelMode('closed');
      setAccountSection('dashboard');

      const completedAccountIsAdmin = await refreshCurrentRole(updatedSession);

      if (completedAccountIsAdmin) {
        setMainView('admin');
        setAuthMessage('Your account is ready. Admin access is active.');
        replaceAppRoute('/admin');
      } else {
        setMainView('account');
        setAuthMessage(
          submissionId
            ? 'Your account is ready and this report has been saved.'
            : 'Your account is ready.'
        );
        replaceAppRoute('/my-account');
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignIn(email: string, password: string) {
    if (accountState === 'temporary' && status === 'complete' && submission) {
      setAuthError(
        'This completed review belongs to the current temporary session. Create an account from this session to keep the report before signing in elsewhere.'
      );
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const signedInSession = await signInWithEmailPassword(email, password);

      setSession(signedInSession);
      setAuthPanelMode('closed');
      setAccountSection('dashboard');

      const signedInIsAdmin = await refreshCurrentRole(signedInSession);

      if (signedInIsAdmin) {
        setMainView('admin');
        setAuthMessage('You are signed in to the Admin Control Centre.');
        replaceAppRoute('/admin');
      } else {
        setMainView('account');
        setAuthMessage(
          'You are signed in. Your purchases, credits and reports are available below.'
        );
        replaceAppRoute('/my-account');
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleForgotPassword(email: string) {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      await sendPasswordResetEmail(email);
      setAuthMessage('Check your email for the password reset link.');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResetPassword(password: string) {
    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      const updatedSession = await updateRecoveredPassword(password);

      setSession(updatedSession);
      setAccountSection('dashboard');
      setAuthPanelMode('closed');

      const updatedAccountIsAdmin = await refreshCurrentRole(updatedSession);

      if (updatedAccountIsAdmin) {
        setMainView('admin');
        setAuthMessage(
          'Your password has been updated. Admin access is active.'
        );
        replaceAppRoute('/admin');
      } else {
        setMainView('account');
        setAuthMessage('Your password has been updated.');
        replaceAppRoute('/my-account');
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function saveCompletedReportToAccount(submissionId: string) {
    setReportSaveState('saving');
    setReportSaveMessage('Saving this version to your account…');

    const { data, error } = await supabase.rpc('save_ia_report_to_account', {
      p_submission_id: submissionId,
    });

    if (error) {
      console.error('Completed report could not be saved', error);
      setReportSaveState('error');
      setReportSaveMessage(
        'The report could not be saved to your account. Try again.'
      );
      throw new Error(
        'The report could not be saved to your account. Try again.'
      );
    }

    const savedRow = Array.isArray(data) ? data[0] : data;

    const versionNumber =
      typeof savedRow?.version_number === 'number'
        ? savedRow.version_number
        : submission?.draft_version;

    setReportSaveState('saved');
    setReportSaveMessage(
      versionNumber
        ? `Version ${versionNumber} is saved to your account.`
        : 'This report is saved to your account.'
    );
  }

  async function handleSaveCurrentReport() {
    if (!submission?.id) {
      return;
    }

    if (accountState !== 'permanent') {
      openAccountPanel('create');
      return;
    }

    setAuthError('');

    try {
      await saveCompletedReportToAccount(submission.id);
    } catch {
      // The banner already shows the friendly save error.
    }
  }

  async function handleSignOut() {
    if (isCurrentReviewActive(status, errorContext, submission)) {
      openCurrentReview();
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    setAuthMessage('');

    try {
      await signOutAccount();

      clearSavedCompletedReview();
      clearAccountConversionReview();

      setSelectedFile(null);
      setSubmission(null);
      setPipelineProgress(null);
      setCompletion(null);
      setReportSaveState('checking');
      setReportSaveMessage('');
      setSelectedCreditPack(null);
      setIsAdmin(false);
      setReviewReadyUnread(false);
      setReviewReadyToastOpen(false);
      setAccountSection('dashboard');
      setMainView('landing');
      setIsViewingSavedReport(false);
      window.sessionStorage.removeItem(OPEN_SAVED_REPORT_KEY);
      replaceAppRoute('/');
      setStatus('starting');

      const temporarySession = await ensureAnonymousSession();

      setSession(temporarySession);
      setStatus('ready');
      setAuthPanelMode('closed');
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  if (status === 'starting') {
    return (
      <main className="app-loading">
        <div className="loading-mark">
          <GraduationCap aria-hidden="true" />
        </div>

        <div className="loading-spinner" aria-hidden="true" />

        <h1>Preparing your secure review space</h1>

        <p>This should take only a moment.</p>
      </main>
    );
  }

  const showProcessing =
    status === 'processing' ||
    (status === 'error' && errorContext === 'pipeline');

  const memberActiveView: PremiumWorkspaceView =
    mainView === 'admin'
      ? 'admin'
      : reviewAccessModalOpen && reviewAccessIntent === 'credits'
      ? 'credits'
      : mainView === 'reports'
      ? 'reports'
      : mainView === 'workspace'
      ? 'review'
      : mainView === 'pricing'
      ? 'credits'
      : accountSection === 'billing'
      ? 'billing'
      : 'dashboard';

  const reviewIndicatorState =
    !submission || isViewingSavedReport
      ? null
      : status === 'complete'
      ? 'complete'
      : status === 'error' && errorContext === 'pipeline'
      ? 'error'
      : status === 'processing'
      ? 'processing'
      : null;

  const reviewIndicatorMessage =
    reviewIndicatorState === 'complete'
      ? completion?.reportSaved === true
        ? 'The completed review is saved in My IA Reports.'
        : 'The completed review is ready to open.'
      : reviewIndicatorState === 'error'
      ? message || 'Open the review to continue from the saved stage.'
      : pipelineProgress?.message ||
        'Preparing your IA review. You can continue using the workspace.';

  const pageContent: ReactNode =
    accountState === 'permanent' ? (
      mainView === 'admin' && isAdmin ? (
        <AdminControlCentre />
      ) : mainView === 'reports' ? (
        <ReportsDashboard
          onOpenReport={openSavedReport}
          onStartNewReview={() => void openReviewWorkspace()}
          onOpenCredits={() => void openBuyCredits()}
          hideCreditAction={isAdmin || !paymentsEnabled}
        />
      ) : mainView === 'workspace' &&
        status === 'ready' &&
        !submission &&
        !reviewAccessSource ? (
        <MemberReviewAccessGate
          freeReviewAvailable={
            reviewAccessSummary?.free_review_available ?? null
          }
          paymentsEnabled={paymentsEnabled}
          onChooseAccess={() => void openReviewWorkspace()}
          onOpenPricing={() => void openBuyCredits()}
          onOpenReports={openReportsDashboard}
        />
      ) : mainView === 'workspace' && showProcessing ? (
        <ProcessingWorkspace
          selectedFile={selectedFile}
          progress={pipelineProgress}
          errorMessage={status === 'error' ? message : ''}
          onRetry={retryPipeline}
        />
      ) : mainView === 'workspace' && status === 'complete' ? (
        <CompletionWorkspace
          selectedFile={selectedFile}
          submission={submission}
          completion={completion}
          onReset={() => void openReviewWorkspace()}
          onUpgrade={() => void openBuyCredits()}
          paymentsEnabled={paymentsEnabled}
          upgradeError={reviewUpgradeError}
          showBackToReports={isViewingSavedReport}
          onBackToReports={openReportsDashboard}
        />
      ) : mainView === 'workspace' ? (
        <UploadWorkspace
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          status={status}
          message={message}
          errorContext={errorContext}
          onChooseFile={handleChooseFile}
          onFileChange={handleFileChange}
          onClearFile={clearSelectedFile}
          onUpload={handleUploadAndReview}
          onRetrySession={retrySecureSession}
        />
      ) : (
        <AccountPage
          session={session}
          busy={authBusy}
          onOpenReport={openSavedReport}
          onOpenReports={openReportsDashboard}
          onStartReview={() => void openReviewWorkspace()}
          onOpenCredits={() => void openBuyCredits()}
          paymentsEnabled={paymentsEnabled}
          focusBilling={accountSection === 'billing'}
        />
      )
    ) : mainView === 'landing' ? (
      <LandingPage
        accountState={accountState}
        onStartFreeReview={openReviewWorkspace}
        onOpenPricing={openPricingPage}
        onSignIn={() => openAccountPanel('sign-in')}
        onOpenReports={openReportsDashboard}
        onChoosePack={(pack) => void chooseCreditPack(pack)}
        paymentsEnabled={paymentsEnabled}
      />
    ) : mainView === 'pricing' && paymentsEnabled ? (
      <PricingPage
        accountState={accountState}
        onStartFreeReview={openReviewWorkspace}
        onChoosePack={(pack) => void chooseCreditPack(pack)}
        onOpenLanding={openLandingPage}
      />
    ) : mainView === 'pricing' ? (
      <LandingPage
        accountState={accountState}
        onStartFreeReview={openReviewWorkspace}
        onOpenPricing={() => void openPricingPage()}
        onSignIn={() => openAccountPanel('sign-in')}
        onOpenReports={openReportsDashboard}
        onChoosePack={(pack) => void chooseCreditPack(pack)}
        paymentsEnabled={false}
      />
    ) : mainView === 'workspace' && status !== 'complete' ? (
      <ReviewAccessGate
        onCreateAccount={() => openAccountPanel('create')}
        onSignIn={() => openAccountPanel('sign-in')}
        onOpenPricing={() => void openPricingPage()}
        paymentsEnabled={paymentsEnabled}
      />
    ) : showProcessing ? (
      <ProcessingWorkspace
        selectedFile={selectedFile}
        progress={pipelineProgress}
        errorMessage={status === 'error' ? message : ''}
        onRetry={retryPipeline}
      />
    ) : status === 'complete' ? (
      <CompletionWorkspace
        selectedFile={selectedFile}
        submission={submission}
        completion={completion}
        onReset={() => void openReviewWorkspace()}
        onUpgrade={() => void openPricingPage()}
        paymentsEnabled={paymentsEnabled}
        upgradeError={reviewUpgradeError}
        showBackToReports={false}
        onBackToReports={openReportsDashboard}
      />
    ) : (
      <UploadWorkspace
        fileInputRef={fileInputRef}
        selectedFile={selectedFile}
        status={status}
        message={message}
        errorContext={errorContext}
        onChooseFile={handleChooseFile}
        onFileChange={handleFileChange}
        onClearFile={clearSelectedFile}
        onUpload={handleUploadAndReview}
        onRetrySession={retrySecureSession}
      />
    );

  return (
    <div
      className={`app-shell ${
        accountState === 'permanent' ? 'app-shell-premium' : ''
      }`}
    >
      {accountState === 'permanent' ? (
        <PremiumWorkspaceShell
          activeView={memberActiveView}
          email={signedInEmail}
          isAdmin={isAdmin}
          paymentsEnabled={paymentsEnabled}
          review={{
            state: reviewIndicatorState,
            filename: submission?.original_filename ?? null,
            progressPercent: Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  pipelineProgress?.progressPercent ??
                    (reviewIndicatorState === 'complete' ? 100 : 0)
                )
              )
            ),
            message: reviewIndicatorMessage,
            unread: reviewReadyUnread,
          }}
          busy={authBusy}
          onOpenDashboard={() => {
            if (isAdmin) {
              openAdminControlCentre();
            } else {
              openAccountPanel('account');
            }
          }}
          onOpenAdmin={openAdminControlCentre}
          onOpenReports={openReportsDashboard}
          onStartReview={() => void openReviewWorkspace()}
          onOpenCredits={() => void openBuyCredits()}
          onOpenBilling={openBillingDashboard}
          onOpenReview={openCurrentReview}
          onSignOut={() => void handleSignOut()}
        >
          {pageContent}
        </PremiumWorkspaceShell>
      ) : (
        <>
          <header className="site-header">
            <div className="header-inner">
              <a
                className="brand"
                href="/"
                aria-label="IB IA Review home"
                onClick={(event) => {
                  event.preventDefault();
                  openLandingPage();
                }}
              >
                <span className="brand-mark">
                  <GraduationCap aria-hidden="true" />
                </span>

                <span className="brand-copy">
                  <strong>IB IA Review</strong>
                  <span>Reflect. Improve. Take ownership.</span>
                </span>
              </a>

              <nav className="public-header-nav" aria-label="Main navigation">
                <button type="button" onClick={openLandingPage}>
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openLandingPage();
                    window.setTimeout(() => {
                      document
                        .getElementById('features')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }, 0);
                  }}
                >
                  Features
                </button>

                {paymentsEnabled && (
                  <button
                    type="button"
                    onClick={() => void openPricingPage()}
                  >
                    Pricing
                  </button>
                )}
              </nav>

              <div className="header-account-group">
                <div className="secure-session-badge">
                  <ShieldCheck aria-hidden="true" />
                  <span>Temporary private session</span>
                </div>

                <button
                  className="header-account-button"
                  type="button"
                  onClick={() => openAccountPanel()}
                >
                  <LogIn aria-hidden="true" />
                  Sign in / Create account
                </button>
              </div>
            </div>
          </header>

          {pageContent}

          <footer className="site-footer">
            <p>
              Indicative guidance only. Final assessment decisions remain with
              your teacher and the IB assessment process.
            </p>
          </footer>
        </>
      )}

      {authPanelMode !== 'closed' && (
        <AuthPanel
          mode={authPanelMode}
          session={session}
          busy={authBusy}
          message={authMessage}
          error={authError}
          hasTemporaryReview={
            accountState === 'temporary' &&
            status === 'complete' &&
            Boolean(submission)
          }
          reportSaveState={reportSaveState}
          reportSaveMessage={reportSaveMessage}
          onClose={closeAccountPanel}
          onModeChange={(mode) => {
            setAuthError('');
            setAuthMessage('');
            setAuthPanelMode(mode);
          }}
          onCreateAccount={handleCreateAccount}
          onSetPassword={handleSetAccountPassword}
          onSignIn={handleSignIn}
          onForgotPassword={handleForgotPassword}
          onResetPassword={handleResetPassword}
          onSaveCurrentReport={handleSaveCurrentReport}
          onOpenReports={openReportsDashboard}
          onSignOut={handleSignOut}
        />
      )}

      {paymentsEnabled && !isAdmin && (
        <ReviewAccessModal
          open={reviewAccessModalOpen}
          loading={reviewAccessLoading}
          summary={reviewAccessSummary}
          packs={reviewAccessPacks}
          onClose={closeReviewAccessModal}
          onUseFreeReview={startFreeLimitedReview}
          onChoosePack={choosePackFromReviewAccess}
        />
      )}

      {paymentsEnabled && !isAdmin && selectedCreditPack && (
        <PayPalCheckoutModal
          pack={selectedCreditPack}
          onClose={closePayPalCheckout}
          onStartReview={() => {
            void startReviewAfterPayment();
          }}
          successActionLabel={
            status === 'complete' &&
            submission?.commercial_access === 'free_review'
              ? 'Unlock this full review'
              : 'Start an IA review'
          }
        />
      )}

      <ReviewReadyToast
        open={
          accountState === 'permanent' &&
          reviewReadyToastOpen &&
          status === 'complete' &&
          Boolean(submission)
        }
        filename={submission?.original_filename ?? 'Completed IA review'}
        reportSaved={completion?.reportSaved === true}
        onOpenReview={openCurrentReview}
        onClose={() => setReviewReadyToastOpen(false)}
      />
    </div>
  );
}


type SharedReviewPageProps = {
  token: string;
};

function SharedReviewPage({ token }: SharedReviewPageProps) {
  const [state, setState] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function openSharedReview() {
      try {
        setState('loading');
        setErrorMessage('');

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

        if (!supabaseUrl || !anonKey) {
          throw new Error(
            'The shared review service is not configured for this website.'
          );
        }

        const response = await fetch(
          `${supabaseUrl.replace(/\/+$/u, '')}/functions/v1/open-shared-annotation`,
          {
            method: 'POST',
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: controller.signal,
            headers: {
              apikey: anonKey,
              'Content-Type': 'application/json',
              Accept: 'text/html, application/json;q=0.9',
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            await readPublicShareErrorMessage(
              response,
              'This shared IA review is invalid, expired or no longer available.'
            )
          );
        }

        const html = await response.text();
        const normalizedHtml = html.replace(/^\uFEFF/u, '').trimStart();

        if (
          !normalizedHtml ||
          !/^<!doctype\s+html|^<html(?:\s|>)/iu.test(normalizedHtml)
        ) {
          throw new Error(
            'The shared IA review could not be displayed in the expected format.'
          );
        }

        document.open('text/html', 'replace');
        document.write(normalizedHtml);
        document.close();
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Shared IA review could not be opened', error);

        setErrorMessage(
          getErrorMessage(error) ||
            'This shared IA review is no longer available.'
        );
        setState('error');
      }
    }

    void openSharedReview();

    return () => {
      controller.abort();
    };
  }, [token]);

  return (
    <main className="shared-review-gateway">
      <section className="shared-review-gateway-card">
        <span className="shared-review-gateway-mark">
          {state === 'loading' ? (
            <GraduationCap aria-hidden="true" />
          ) : (
            <AlertCircle aria-hidden="true" />
          )}
        </span>

        <span className="shared-review-gateway-brand">IB IA Review</span>

        {state === 'loading' ? (
          <>
            <LoaderCircle className="shared-review-spin" aria-hidden="true" />
            <h1>Opening your shared IA review</h1>
            <p>
              Checking the secure link and preparing the annotated review.
            </p>
          </>
        ) : (
          <>
            <h1>This shared review cannot be opened</h1>
            <p>{errorMessage}</p>
            <p className="shared-review-gateway-help">
              Ask the person who shared the review to create a new link if this
              one has expired or been revoked.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

async function readPublicShareErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = (await response.clone().json()) as Record<string, unknown>;

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    try {
      const text = await response.clone().text();

      if (text.trim()) {
        return text.trim();
      }
    } catch {
      // Use the supplied fallback.
    }
  }

  return fallback;
}

type AuthPanelProps = {
  mode: Exclude<AuthPanelMode, 'closed'>;
  session: Session | null;
  busy: boolean;
  message: string;
  error: string;
  hasTemporaryReview: boolean;
  reportSaveState: ReportSaveState;
  reportSaveMessage: string;
  onClose: () => void;
  onModeChange: (mode: Exclude<AuthPanelMode, 'closed'>) => void;
  onCreateAccount: (email: string) => Promise<void>;
  onSetPassword: (password: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (password: string) => Promise<void>;
  onSaveCurrentReport: () => Promise<void>;
  onOpenReports: () => void;
  onSignOut: () => Promise<void>;
};

function AuthPanel({
  mode,
  session,
  busy,
  message,
  error,
  hasTemporaryReview,
  reportSaveState,
  reportSaveMessage,
  onClose,
  onModeChange,
  onCreateAccount,
  onSetPassword,
  onSignIn,
  onForgotPassword,
  onResetPassword,
  onSaveCurrentReport,
  onOpenReports,
  onSignOut,
}: AuthPanelProps) {
  void reportSaveState;
  void reportSaveMessage;
  void onSaveCurrentReport;
  void onOpenReports;
  void onSignOut;

  const [email, setEmail] = useState(
    loadAccountConversionEmail() ?? session?.user.email ?? ''
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const requiresCompletion =
    mode === 'set-password' || mode === 'reset-password';

  function validateMatchingPasswords(): boolean {
    if (password.length < 8) {
      setLocalError('Use at least 8 characters for your password.');
      return false;
    }

    if (password !== confirmPassword) {
      setLocalError('The passwords do not match.');
      return false;
    }

    setLocalError('');
    return true;
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');
    await onCreateAccount(email);
  }

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');
    await onSignIn(email, password);
  }

  async function submitForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');
    await onForgotPassword(email);
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateMatchingPasswords()) {
      return;
    }

    if (mode === 'reset-password') {
      await onResetPassword(password);
    } else {
      await onSetPassword(password);
    }
  }

  return (
    <div className="auth-backdrop" role="presentation">
      <section
        className={`auth-panel ${
          mode === 'account' ? 'auth-panel-account' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-panel-title"
      >
        {!requiresCompletion && (
          <button
            className="auth-close-button"
            type="button"
            onClick={onClose}
            aria-label="Close account panel"
          >
            <X aria-hidden="true" />
          </button>
        )}

        <div className="auth-brand-mark">
          <GraduationCap aria-hidden="true" />
        </div>

        <AuthPanelHeading mode={mode} />

        {(error || localError) && (
          <div className="auth-message auth-message-error" role="alert">
            <AlertCircle aria-hidden="true" />
            <span>{localError || error}</span>
          </div>
        )}

        {message && (
          <div className="auth-message auth-message-success" role="status">
            <CheckCircle2 aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        {mode === 'choose' && (
          <div className="auth-choice-grid">
            {hasTemporaryReview && (
              <div className="auth-review-preservation-note">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Keep the review currently open</strong>
                  <span>
                    Create the account from this session so the report remains
                    connected to the same student record.
                  </span>
                </div>
              </div>
            )}

            <button
              className="auth-primary-button"
              type="button"
              onClick={() => onModeChange('create')}
            >
              <UserPlus aria-hidden="true" />
              Create account
            </button>

            <button
              className="auth-secondary-button"
              type="button"
              onClick={() => onModeChange('sign-in')}
            >
              <LogIn aria-hidden="true" />
              Sign in
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form className="auth-form" onSubmit={submitCreate}>
            <AuthEmailField
              value={email}
              onChange={setEmail}
              disabled={busy}
              autoFocus
            />

            <div className="auth-process-note">
              <Mail aria-hidden="true" />
              <span>
                First confirm your email address. The confirmation page will
                then ask you to choose your password.
              </span>
            </div>

            <button
              className="auth-primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <Mail aria-hidden="true" />
              )}
              {busy ? 'Sending confirmation…' : 'Continue with email'}
            </button>

            <button
              className="auth-text-button"
              type="button"
              onClick={() => onModeChange('choose')}
              disabled={busy}
            >
              Back
            </button>
          </form>
        )}

        {mode === 'confirmation-sent' && (
          <div className="auth-confirmation-state">
            <span className="auth-confirmation-icon">
              <Mail aria-hidden="true" />
            </span>
            <strong>Open the confirmation email</strong>
            <p>
              Keep this browser available. The confirmation link will return you
              to the app to create your password and save the report.
            </p>
            <button
              className="auth-secondary-button"
              type="button"
              onClick={() => onModeChange('create')}
            >
              Use a different email
            </button>
          </div>
        )}

        {(mode === 'set-password' || mode === 'reset-password') && (
          <form className="auth-form" onSubmit={submitPassword}>
            <AuthPasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              disabled={busy}
              autoFocus
            />

            <AuthPasswordField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={busy}
            />

            <p className="auth-password-guidance">
              Use at least 8 characters. A longer, unique password is safer.
            </p>

            <button
              className="auth-primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <KeyRound aria-hidden="true" />
              )}
              {busy
                ? 'Saving password…'
                : mode === 'reset-password'
                ? 'Update password'
                : 'Create account password'}
            </button>
          </form>
        )}

        {mode === 'sign-in' && (
          <form className="auth-form" onSubmit={submitSignIn}>
            {hasTemporaryReview && (
              <div className="auth-message auth-message-warning">
                <ShieldCheck aria-hidden="true" />
                <span>
                  Create an account from this session to keep the completed
                  report. Signing in to another account will not transfer it.
                </span>
              </div>
            )}

            <AuthEmailField
              value={email}
              onChange={setEmail}
              disabled={busy}
              autoFocus
            />

            <AuthPasswordField
              label="Password"
              value={password}
              onChange={setPassword}
              disabled={busy}
            />

            <button
              className="auth-primary-button"
              type="submit"
              disabled={busy || hasTemporaryReview}
            >
              {busy ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <LogIn aria-hidden="true" />
              )}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="auth-link-row">
              <button
                className="auth-text-button"
                type="button"
                onClick={() => onModeChange('forgot-password')}
                disabled={busy}
              >
                Forgot password?
              </button>

              <button
                className="auth-text-button"
                type="button"
                onClick={() => onModeChange('create')}
                disabled={busy}
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot-password' && (
          <form className="auth-form" onSubmit={submitForgot}>
            <AuthEmailField
              value={email}
              onChange={setEmail}
              disabled={busy}
              autoFocus
            />

            <button
              className="auth-primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <Mail aria-hidden="true" />
              )}
              {busy ? 'Sending reset email…' : 'Send reset email'}
            </button>

            <button
              className="auth-text-button"
              type="button"
              onClick={() => onModeChange('sign-in')}
              disabled={busy}
            >
              Back to sign in
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

type AuthPanelHeadingProps = {
  mode: Exclude<AuthPanelMode, 'closed'>;
};

function AuthPanelHeading({ mode }: AuthPanelHeadingProps) {
  const content: Record<
    Exclude<AuthPanelMode, 'closed'>,
    { eyebrow: string; title: string; description: string }
  > = {
    choose: {
      eyebrow: 'Your private account',
      title: 'Save and revisit your IA reports',
      description:
        'Use an account to keep dated review versions, annotated files and progress plans.',
    },
    create: {
      eyebrow: 'Create account',
      title: 'Connect this review to your email',
      description:
        'Your current review stays connected while the email address is verified.',
    },
    'confirmation-sent': {
      eyebrow: 'Confirmation sent',
      title: 'Check your email',
      description:
        'Open the Supabase confirmation email to return and create your password.',
    },
    'set-password': {
      eyebrow: 'Email confirmed',
      title: 'Create your account password',
      description:
        'This completes the account without changing ownership of the current review.',
    },
    'sign-in': {
      eyebrow: 'Welcome back',
      title: 'Sign in to your account',
      description:
        'Use the email address and password linked to your saved IA reports.',
    },
    'forgot-password': {
      eyebrow: 'Password help',
      title: 'Reset your password',
      description:
        'We will send a secure reset link to the account email address.',
    },
    'reset-password': {
      eyebrow: 'Secure password reset',
      title: 'Choose a new password',
      description: 'After saving it, you will return to your account.',
    },
    account: {
      eyebrow: 'My account',
      title: 'Account, purchases and reports',
      description:
        'Review your credits, payment history, invoices and saved IA reports.',
    },
  };

  const selected = content[mode];

  return (
    <div className="auth-panel-heading">
      <span>{selected.eyebrow}</span>
      <h2 id="auth-panel-title">{selected.title}</h2>
      <p>{selected.description}</p>
    </div>
  );
}

type AuthEmailFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
};

function AuthEmailField({
  value,
  onChange,
  disabled,
  autoFocus = false,
}: AuthEmailFieldProps) {
  return (
    <label className="auth-field">
      <span>Email address</span>
      <div className="auth-input-shell">
        <Mail aria-hidden="true" />
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="student@example.com"
          autoComplete="email"
          disabled={disabled}
          autoFocus={autoFocus}
          required
        />
      </div>
    </label>
  );
}

type AuthPasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  autoFocus?: boolean;
};

function AuthPasswordField({
  label,
  value,
  onChange,
  disabled,
  autoFocus = false,
}: AuthPasswordFieldProps) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-shell">
        <KeyRound aria-hidden="true" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Enter your password"
          autoComplete={
            label === 'Password' ? 'current-password' : 'new-password'
          }
          disabled={disabled}
          autoFocus={autoFocus}
          required
        />
      </div>
    </label>
  );
}

type CommercialPageProps = {
  accountState: AccountSessionState;
  onStartFreeReview: () => void;
  onChoosePack: (pack: CreditPack) => void;
};

type LandingPageProps = CommercialPageProps & {
  onOpenPricing: () => void;
  onSignIn: () => void;
  onOpenReports: () => void;
  paymentsEnabled: boolean;
};

function LandingPage({
  accountState,
  onStartFreeReview,
  onOpenPricing,
  onSignIn,
  onOpenReports,
  onChoosePack,
  paymentsEnabled,
}: LandingPageProps) {
  const { packs, limits } = usePublicCommercialSettings(paymentsEnabled);

  const primaryActionLabel =
    accountState === 'permanent' ? 'Start an IA review' : 'Preview one IA free';

  return (
    <main className="landing-main">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-kicker">
              IB SEHS internal assessment feedback
            </span>

            <h1>Improve your IB SEHS IA with feedback that makes the next step clear.</h1>

            <p className="landing-hero-lead">
              Upload your draft and receive evidence-linked criterion feedback, clear improvement actions, an interactive annotated IA and a prioritised revision plan — while keeping the writing your own.
            </p>

            <div className="landing-hero-actions">
              <button
                className="landing-primary-button"
                type="button"
                onClick={onStartFreeReview}
              >
                <UploadCloud aria-hidden="true" />
                {primaryActionLabel}
              </button>

              {paymentsEnabled && (
                <button
                  className="landing-secondary-button"
                  type="button"
                  onClick={onOpenPricing}
                >
                  See pricing
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="landing-trust-row">
              <span>
                <ShieldCheck aria-hidden="true" />
                Private document handling
              </span>

              <span>
                <BookOpen aria-hidden="true" />
                Coaching, not IA writing
              </span>

              <span>
                <CheckCircle2 aria-hidden="true" />
                One free limited preview per verified account
              </span>
            </div>
          </div>

          <div className="landing-review-preview">
            <div className="landing-preview-header">
              <span>Detailed Review</span>
              <strong>SEHS IA • 24 marks</strong>
            </div>

            <div className="landing-preview-score">
              <span>Indicative range</span>
              <strong>12–16 / 24</strong>
            </div>

            <div className="landing-preview-tabs">
              <span className="active">Detailed Review</span>
              <span>Annotated IA</span>
              <span>Progress Plan</span>
            </div>

            <article className="landing-preview-finding">
              <span className="landing-preview-priority">High priority</span>
              <strong>Research Design</strong>
              <p>
                The control variable is identified, but the method does not
                explain how it remained consistent across every trial.
              </p>

              <div>
                <span>Specific action</span>
                <p>
                  State the controlled value, how it was maintained and how
                  consistency was checked.
                </p>
              </div>
            </article>

            <div className="landing-preview-footer">
              <Target aria-hidden="true" />
              <span>Prioritised next steps prepared</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-proof-strip" aria-label="Review outcomes">
        <div>
          <strong>4</strong>
          <span>SEHS rubric criteria</span>
        </div>

        <div>
          <strong>Exact</strong>
          <span>Evidence-linked findings</span>
        </div>

        <div>
          <strong>Clear</strong>
          <span>Actions and completion checks</span>
        </div>

        <div>
          <strong>Private</strong>
          <span>Account-owned report history</span>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-heading">
          <span>What the review includes</span>
          <h2>Feedback designed for better revision.</h2>
          <p>
            Every review is designed to help the student understand what the
            draft currently demonstrates, what is missing and exactly how to
            improve it without replacing the student’s own work.
          </p>
        </div>

        <div className="landing-feature-grid">
          <FeatureCard
            icon={<SearchCheck aria-hidden="true" />}
            title="Rubric-linked criterion review"
            text="Research Design, Data Analysis, Conclusion and Evaluation are reviewed against the 24-mark SEHS framework."
          />

          <FeatureCard
            icon={<Quote aria-hidden="true" />}
            title="Exact evidence from the draft"
            text="Findings point to the relevant wording, paragraph, section or page instead of giving detached generic advice."
          />

          <FeatureCard
            icon={<ListChecks aria-hidden="true" />}
            title="Specific improvement actions"
            text="Each issue includes a concrete action, required evidence and a completion check."
          />

          <FeatureCard
            icon={<Eye aria-hidden="true" />}
            title="Interactive annotated IA"
            text="Open the draft with highlighted passages and numbered comments connected to the detailed review."
          />

          <FeatureCard
            icon={<Download aria-hidden="true" />}
            title="Microsoft Word comments"
            text="Paid DOCX reviews can include a downloadable copy with genuine Word comments attached to the relevant text."
          />

          <FeatureCard
            icon={<Target aria-hidden="true" />}
            title="Prioritised progress plan"
            text="The student receives a practical sequence of next steps rather than an overwhelming list of disconnected changes."
          />

          <FeatureCard
            icon={<Layers3 aria-hidden="true" />}
            title="Saved dated versions"
            text="Paid reports remain in My IA Reports with their version number, generation date and associated review details."
          />

          <FeatureCard
            icon={<Printer aria-hidden="true" />}
            title="Printable detailed report"
            text="Paid access unlocks printing, saving and private report downloads for later reference."
          />
        </div>
      </section>

      <section className="landing-section landing-criteria-section">
        <div className="landing-section-heading">
          <span>Criterion coverage</span>
          <h2>Focused feedback across all four SEHS IA criteria.</h2>
        </div>

        <div className="landing-criteria-grid">
          {[
            {
              code: '01',
              title: 'Research Design',
              text: 'Research question, variables, context, methodology, control and reproducibility.',
            },
            {
              code: '02',
              title: 'Data Analysis',
              text: 'Processing, uncertainty, visual presentation, interpretation and analytical depth.',
            },
            {
              code: '03',
              title: 'Conclusion',
              text: 'Answer to the research question, evidence use, scientific context and justified claims.',
            },
            {
              code: '04',
              title: 'Evaluation',
              text: 'Limitations, impact, realistic improvements, validity and future investigation.',
            },
          ].map((criterion) => (
            <article key={criterion.code}>
              <span>{criterion.code}</span>
              <h3>{criterion.title}</h3>
              <p>{criterion.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-how-section">
        <div className="landing-section-heading">
          <span>How it works</span>
          <h2>A clear path from draft to revision.</h2>
        </div>

        <ol className="landing-step-grid">
          <ProcessStep
            number="1"
            title="Create or sign in to your account"
            text="A verified account protects the free-review allowance and keeps private reports connected to the correct student."
          />

          <ProcessStep
            number="2"
            title="Upload a PDF or DOCX"
            text="The file is checked before review so unsuitable or oversized documents do not use a free review or paid credit."
          />

          <ProcessStep
            number="3"
            title="Open the detailed review"
            text="Review the indicative range, evidence, issues, actions, annotations and progress plan."
          />

          <ProcessStep
            number="4"
            title="Review a revised draft"
            text="Each new draft uses another review credit and becomes the next dated version of the same IA project."
          />
        </ol>
      </section>

      <section className="landing-section landing-limits-section">
        <div className="landing-limits-card">
          <div>
            <span className="landing-section-label">Standard IA limits</span>
            <h2>Designed for an SEHS IA—not a 50-page research paper.</h2>
            <p>
              Documents outside the supported limits are rejected before the
              review allowance is reserved.
            </p>
          </div>

          <div className="landing-limit-grid">
            <LimitItem
              value={formatFileLimit(limits.maximum_file_size_bytes)}
              label="Maximum file size"
            />

            <LimitItem
              value={`${limits.maximum_pages}`}
              label="Maximum pages"
            />

            <LimitItem
              value={limits.maximum_words.toLocaleString('en-US')}
              label="Maximum extracted words"
            />

            <LimitItem
              value={limits.maximum_estimated_document_tokens.toLocaleString(
                'en-US'
              )}
              label="Maximum estimated document tokens"
            />
          </div>

          <div className="landing-limit-note">
            <AlertCircle aria-hidden="true" />
            <p>
              A rejected document does not use the free review or a paid credit.
              Students should remove unrelated supporting material or extensive
              appendices before uploading again.
            </p>
          </div>
        </div>
      </section>

      {paymentsEnabled && (
        <PricingSection
          packs={packs}
          limits={limits}
          accountState={accountState}
          onStartFreeReview={onStartFreeReview}
          onChoosePack={onChoosePack}
        />
      )}

      <section className="landing-section landing-integrity-grid">
        <article>
          <span className="landing-icon-box">
            <BookOpen aria-hidden="true" />
          </span>
          <h2>Academic integrity first</h2>
          <p>
            The platform reviews student-created work, identifies evidence and
            gaps, and provides reflective questions, actions and completion
            checks. It does not generate replacement IA paragraphs or complete
            the investigation for the student.
          </p>
        </article>

        <article>
          <span className="landing-icon-box">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h2>Private document handling</h2>
          <p>
            Original uploads are stored privately and remain on the short
            source-file retention schedule. Rejected files do not consume a
            review allowance. Paid reports and generated artifacts remain
            available to the account owner until deleted.
          </p>
        </article>
      </section>

      <section className="landing-section landing-faq-section">
        <div className="landing-section-heading">
          <span>Frequently asked questions</span>
          <h2>Important information before reviewing a draft.</h2>
        </div>

        <div className="landing-faq-grid">
          <FaqItem
            question="Does the platform write the IA?"
            answer="No. It reviews the student’s existing draft and provides coaching, evidence, questions and specific improvement actions."
          />

          <FaqItem
            question="What does one review credit cover?"
            answer="One review credit covers one SEHS IA draft that passes the standard page, word, file-size and estimated-token limits."
          />

          <FaqItem
            question="Does a revised draft use another credit?"
            answer="Yes. A revised draft requires a complete new review and therefore uses another review credit."
          />

          <FaqItem
            question="What happens when processing fails?"
            answer="The commercial workflow will consume the allowance only after a successful review. A technical failure will release the reservation."
          />

          <FaqItem
            question="Can I upload a long research paper?"
            answer={`No. The standard limit is ${
              limits.maximum_pages
            } pages and ${limits.maximum_words.toLocaleString(
              'en-US'
            )} extracted words. Unsupported documents are rejected before a credit is used.`}
          />

          <FaqItem
            question="Can a free user download the report?"
            answer="No. The free review is a limited preview: the first detailed-review criterion and the overview plus first 20 lines of the annotated IA. The progress plan, complete review, permanent history, printing and downloads require a review credit."
          />
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <span>Ready to improve your next draft?</span>
          <h2>Start with a free limited IB SEHS IA preview.</h2>
          <p>
            Create a verified account, preview the review experience and unlock
            the complete review when you are ready.
          </p>
        </div>

        <div>
          <button
            className="landing-primary-button"
            type="button"
            onClick={onStartFreeReview}
          >
            <UploadCloud aria-hidden="true" />
            {primaryActionLabel}
          </button>

          {accountState === 'permanent' ? (
            <button
              className="landing-secondary-button landing-secondary-light"
              type="button"
              onClick={onOpenReports}
            >
              Open My IA Reports
            </button>
          ) : (
            <button
              className="landing-secondary-button landing-secondary-light"
              type="button"
              onClick={onSignIn}
            >
              Sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

type PricingPageProps = CommercialPageProps & {
  onOpenLanding: () => void;
};

function PricingPage({
  accountState,
  onStartFreeReview,
  onChoosePack,
  onOpenLanding,
}: PricingPageProps) {
  const { packs, limits } = usePublicCommercialSettings();

  return (
    <main className="pricing-page-main">
      <section className="pricing-page-hero">
        <button
          className="pricing-back-button"
          type="button"
          onClick={onOpenLanding}
        >
          <ArrowLeft aria-hidden="true" />
          Back to overview
        </button>

        <span>Review-credit pricing</span>
        <h1>Choose the review credits that match your drafting process.</h1>
        <p>
          Each review credit covers one supported SEHS IA draft. Choose a single review or a multi-draft pack without an ongoing subscription.
        </p>
      </section>

      <PricingSection
        packs={packs}
        limits={limits}
        accountState={accountState}
        onStartFreeReview={onStartFreeReview}
        onChoosePack={onChoosePack}
        standalone
      />

      <section className="pricing-policy-grid">
        <article>
          <CheckCircle2 aria-hidden="true" />
          <h2>Credit used only after success</h2>
          <p>
            A review allowance is reserved after document checks and consumed
            only when the complete review succeeds.
          </p>
        </article>

        <article>
          <AlertCircle aria-hidden="true" />
          <h2>Oversized documents rejected first</h2>
          <p>
            Documents over {limits.maximum_pages} pages,{' '}
            {limits.maximum_words.toLocaleString('en-US')} words or the
            estimated-token limit are rejected before a credit is used.
          </p>
        </article>

        <article>
          <Clock3 aria-hidden="true" />
          <h2>Credits valid for {limits.paid_credit_validity_days} days</h2>
          <p>
            Purchased review credits remain available for the IA drafting period
            without requiring a recurring monthly subscription.
          </p>
        </article>
      </section>
    </main>
  );
}

type PricingSectionProps = CommercialPageProps & {
  packs: CreditPack[];
  limits: ReviewLimits;
  standalone?: boolean;
};

function PricingSection({
  packs,
  limits,
  accountState,
  onStartFreeReview,
  onChoosePack,
  standalone = false,
}: PricingSectionProps) {
  return (
    <section
      className={`landing-section landing-pricing-section ${
        standalone ? 'landing-pricing-standalone' : ''
      }`}
      id="pricing"
    >
      <div className="landing-section-heading">
        <span>Review-credit pricing</span>
        <h2>Simple review-credit pricing.</h2>
        <p>
          One review credit covers one supported SEHS IA draft. Every revised
          draft uses one additional credit. Purchased credits remain valid for{' '}
          {limits.paid_credit_validity_days} days.
        </p>
      </div>

      <div className="landing-pricing-grid">
        <article className="landing-price-card landing-price-free">
          <div>
            <span className="landing-price-label">Free Limited Preview</span>
            <h3>$0</h3>
            <p>One limited preview per verified account.</p>
          </div>

          <ul>
            <li>
              <Check aria-hidden="true" />
              First detailed-review criterion
            </li>
            <li>
              <Check aria-hidden="true" />
              Annotated IA overview + 20-line preview
            </li>
            <li className="locked">
              <LockKeyhole aria-hidden="true" />
              Progress plan remains locked
            </li>
            <li className="locked">
              <LockKeyhole aria-hidden="true" />
              Downloads remain locked
            </li>
            <li className="locked">
              <LockKeyhole aria-hidden="true" />
              No permanent version history
            </li>
          </ul>

          <button
            className="landing-price-button"
            type="button"
            onClick={onStartFreeReview}
          >
            {accountState === 'permanent'
              ? 'Use free limited review'
              : 'Create account for free preview'}
          </button>

          <small>
            On-screen report available for approximately{' '}
            {limits.free_report_retention_hours} hours.
          </small>
        </article>

        {packs.map((pack) => (
          <article
            className={`landing-price-card ${
              pack.is_featured ? 'featured' : ''
            }`}
            key={pack.pack_code}
          >
            {pack.is_featured && (
              <span className="landing-popular-badge">Most popular</span>
            )}

            <div>
              <span className="landing-price-label">{pack.display_name}</span>
              <h3>{formatUsd(pack.price_usd)}</h3>
              <p>{pack.description}</p>
            </div>

            <div className="landing-credit-count">
              <strong>{pack.review_credits}</strong>
              <span>
                {pack.review_credits === 1
                  ? 'complete IA review'
                  : 'complete IA reviews'}
              </span>
            </div>

            <ul>
              <li>
                <Check aria-hidden="true" />
                Permanent saved report
              </li>
              <li>
                <Check aria-hidden="true" />
                Interactive annotated IA
              </li>
              <li>
                <Check aria-hidden="true" />
                Word-comment download for DOCX
              </li>
              <li>
                <Check aria-hidden="true" />
                Print or save detailed report
              </li>
              <li>
                <Check aria-hidden="true" />
                Dated version history
              </li>
            </ul>

            <button
              className="landing-price-button"
              type="button"
              onClick={() => onChoosePack(pack)}
            >
              Choose {pack.review_credits}{' '}
              {pack.review_credits === 1 ? 'review' : 'reviews'}
            </button>

            <small>
              {formatUsd(pack.price_usd / pack.review_credits)} per review •
              Valid for {pack.validity_days} days
            </small>
          </article>
        ))}
      </div>

      <p className="landing-pricing-note">
        A review credit is not used when a document fails the supported
        preflight limits or when processing fails for a technical reason.
      </p>
    </section>
  );
}

type MemberReviewAccessGateProps = {
  freeReviewAvailable: boolean | null;
  paymentsEnabled: boolean;
  onChooseAccess: () => void;
  onOpenPricing: () => void;
  onOpenReports: () => void;
};

function MemberReviewAccessGate({
  freeReviewAvailable,
  paymentsEnabled,
  onChooseAccess,
  onOpenPricing,
  onOpenReports,
}: MemberReviewAccessGateProps) {
  if (!paymentsEnabled) {
    return (
      <main className="member-review-gate-main">
        <section className="member-review-gate-card">
          <span className="member-review-gate-icon">
            <ShieldCheck aria-hidden="true" />
          </span>

          <span>Review access</span>
          <h1>Paid review access is temporarily unavailable</h1>
          <p>
            New review-credit purchases are currently paused. Existing paid or
            complimentary credits, saved IA reports and previous invoices are
            not affected.
          </p>

          <div className="member-review-gate-options">
            <article>
              <LockKeyhole aria-hidden="true" />
              <strong>Free limited preview</strong>
              <span>
                The free preview can still be used when it remains available on
                your verified account.
              </span>
              <small>
                {freeReviewAvailable === false
                  ? 'The free preview has already been used.'
                  : 'Available once per verified account.'}
              </small>
            </article>

            <article>
              <ClipboardList aria-hidden="true" />
              <strong>Your existing reports remain available</strong>
              <span>
                Open saved reviews, annotated IA files and previous purchase
                records as normal.
              </span>
              <small>No existing access is removed.</small>
            </article>
          </div>

          <div className="member-review-gate-actions">
            {freeReviewAvailable !== false && (
              <button
                className="member-reports-primary"
                type="button"
                onClick={onChooseAccess}
              >
                <Sparkles aria-hidden="true" />
                Use free limited preview
              </button>
            )}

            <button
              className="member-reports-secondary"
              type="button"
              onClick={onOpenReports}
            >
              <ClipboardList aria-hidden="true" />
              Open My IA Reports
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="member-review-gate-main">
      <section className="member-review-gate-card">
        <span className="member-review-gate-icon">
          <ShieldCheck aria-hidden="true" />
        </span>

        <span>Review access required</span>
        <h1>Choose how to review your IA</h1>
        <p>
          Select a full review credit for complete access, or use the one free
          limited preview when it is still available. The upload area opens only
          after a review option has been selected.
        </p>

        <div className="member-review-gate-options">
          <article>
            <CreditCard aria-hidden="true" />
            <strong>Full IA review</strong>
            <span>
              Complete detailed review, full annotated IA, progress plan, saved
              history and available downloads.
            </span>
            <small>Credits start at $9.99.</small>
          </article>

          <article>
            <LockKeyhole aria-hidden="true" />
            <strong>Free limited preview</strong>
            <span>
              First detailed-review criterion, annotated overview and the
              opening 20 lines. Progress plan and downloads stay locked.
            </span>
            <small>
              {freeReviewAvailable === false
                ? 'The free preview has already been used.'
                : 'Available once per verified account.'}
            </small>
          </article>
        </div>

        <div className="member-review-gate-actions">
          <button
            className="member-reports-primary"
            type="button"
            onClick={onChooseAccess}
          >
            <Sparkles aria-hidden="true" />
            Choose review option
          </button>

          <button
            className="member-reports-secondary"
            type="button"
            onClick={onOpenPricing}
          >
            <CreditCard aria-hidden="true" />
            View pricing
          </button>
        </div>
      </section>
    </main>
  );
}

function ReviewAccessGate({
  onCreateAccount,
  onSignIn,
  onOpenPricing,
  paymentsEnabled,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onOpenPricing: () => void;
  paymentsEnabled: boolean;
}) {
  return (
    <main className="review-access-main">
      <section className="review-access-card">
        <span className="landing-icon-box">
          <LockKeyhole aria-hidden="true" />
        </span>

        <span className="landing-kicker">Protected review workspace</span>
        <h1>Create or sign in to your account</h1>
        <p>
          {paymentsEnabled
            ? 'A verified account is required before using the free limited preview or a paid review credit. This protects review ownership, allowances and private report history.'
            : 'A verified account is required before using the free limited preview or existing review access. New paid review-credit purchases are temporarily unavailable.'}
        </p>

        <div className="review-access-actions">
          <button
            className="landing-primary-button"
            type="button"
            onClick={onCreateAccount}
          >
            <UserPlus aria-hidden="true" />
            Create account
          </button>

          <button
            className="landing-secondary-button"
            type="button"
            onClick={onSignIn}
          >
            <LogIn aria-hidden="true" />
            Sign in
          </button>

          {paymentsEnabled && (
            <button
              className="landing-text-button"
              type="button"
              onClick={onOpenPricing}
            >
              View review-credit pricing
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="landing-feature-card">
      <span className="landing-icon-box">{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function ProcessStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <li>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </li>
  );
}

function LimitItem({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details>
      <summary>
        {question}
        <ChevronDown aria-hidden="true" />
      </summary>
      <p>{answer}</p>
    </details>
  );
}

function usePaymentCollectionStatus(enabled = true): {
  paymentsEnabled: boolean;
  paymentStatusLoaded: boolean;
  refreshPaymentStatus: () => Promise<boolean>;
} {
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [paymentStatusLoaded, setPaymentStatusLoaded] = useState(false);

  const refreshPaymentStatus = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      setPaymentsEnabled(false);
      setPaymentStatusLoaded(true);
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('get_ia_payment_status');

      if (error) {
        throw error;
      }

      const nextEnabled =
        isRecord(data) && data.payments_enabled === true;

      setPaymentsEnabled(nextEnabled);
      setPaymentStatusLoaded(true);

      return nextEnabled;
    } catch (error) {
      console.error('Payment collection status could not be loaded', error);

      // Fail closed so a status-service problem can never expose checkout.
      setPaymentsEnabled(false);
      setPaymentStatusLoaded(true);
      return false;
    }
  }, [enabled]);

  useEffect(() => {
    void refreshPaymentStatus();
  }, [refreshPaymentStatus]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleStatusChanged = (event: Event) => {
      const detail =
        event instanceof CustomEvent && isRecord(event.detail)
          ? event.detail
          : null;

      if (detail && typeof detail.paymentsEnabled === 'boolean') {
        setPaymentsEnabled(detail.paymentsEnabled);
        setPaymentStatusLoaded(true);
        return;
      }

      void refreshPaymentStatus();
    };

    const handleFocus = () => {
      void refreshPaymentStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshPaymentStatus();
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshPaymentStatus();
      }
    }, 30_000);

    window.addEventListener('ia-payment-status-changed', handleStatusChanged);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        'ia-payment-status-changed',
        handleStatusChanged
      );
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshPaymentStatus]);

  return {
    paymentsEnabled,
    paymentStatusLoaded,
    refreshPaymentStatus,
  };
}

function usePublicCommercialSettings(
  enabled = true
): {
  packs: CreditPack[];
  limits: ReviewLimits;
} {
  const [packs, setPacks] = useState<CreditPack[]>(DEFAULT_CREDIT_PACKS);

  const [limits, setLimits] = useState<ReviewLimits>(DEFAULT_REVIEW_LIMITS);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    async function loadSettings() {
      const [packsResult, limitsResult] = await Promise.all([
        supabase
          .from('ia_credit_packs')
          .select(
            'pack_code, display_name, description, review_credits, price_usd, validity_days, is_featured, display_order'
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true }),

        supabase
          .from('ia_review_limits')
          .select(
            'maximum_file_size_bytes, maximum_pages, maximum_words, maximum_estimated_document_tokens, free_report_retention_hours, paid_credit_validity_days'
          )
          .eq('limit_code', 'sehs-standard')
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (!active) {
        return;
      }

      if (!packsResult.error && Array.isArray(packsResult.data)) {
        const normalizedPacks = packsResult.data
          .map(normalizeCreditPack)
          .filter((pack): pack is CreditPack => pack !== null);

        if (normalizedPacks.length > 0) {
          setPacks(normalizedPacks);
        }
      }

      if (!limitsResult.error && limitsResult.data) {
        const normalizedLimits = normalizeReviewLimits(limitsResult.data);

        if (normalizedLimits) {
          setLimits(normalizedLimits);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    packs,
    limits,
  };
}

const DEFAULT_CREDIT_PACKS: CreditPack[] = [
  {
    pack_code: 'single-review',
    display_name: 'Single IA Review',
    description:
      'One complete paid SEHS IA review with saved report and downloads.',
    review_credits: 1,
    price_usd: 9.99,
    validity_days: 365,
    is_featured: false,
    display_order: 10,
  },
  {
    pack_code: 'draft-improvement-3',
    display_name: 'Draft Improvement Pack',
    description:
      'Three review credits for an initial, improved and final draft.',
    review_credits: 3,
    price_usd: 24.99,
    validity_days: 365,
    is_featured: true,
    display_order: 20,
  },
  {
    pack_code: 'complete-ia-5',
    display_name: 'Complete IA Pack',
    description:
      'Five review credits for multiple drafting and improvement cycles.',
    review_credits: 5,
    price_usd: 34.99,
    validity_days: 365,
    is_featured: false,
    display_order: 30,
  },
];

const DEFAULT_REVIEW_LIMITS: ReviewLimits = {
  maximum_file_size_bytes: 20 * 1024 * 1024,
  maximum_pages: 30,
  maximum_words: 6000,
  maximum_estimated_document_tokens: 20000,
  free_report_retention_hours: 24,
  paid_credit_validity_days: 365,
};

function normalizeCreditPack(value: unknown): CreditPack | null {
  if (!isRecord(value)) {
    return null;
  }

  const packCode = asText(value.pack_code);
  const displayName = asText(value.display_name);
  const description = asText(value.description);
  const reviewCredits = asNumber(value.review_credits);
  const priceUsd = asNumber(value.price_usd);
  const validityDays = asNumber(value.validity_days);
  const displayOrder = asNumber(value.display_order);

  if (
    !packCode ||
    !displayName ||
    !description ||
    reviewCredits === null ||
    priceUsd === null ||
    validityDays === null ||
    displayOrder === null
  ) {
    return null;
  }

  return {
    pack_code: packCode,
    display_name: displayName,
    description,
    review_credits: reviewCredits,
    price_usd: priceUsd,
    validity_days: validityDays,
    is_featured: value.is_featured === true,
    display_order: displayOrder,
  };
}

function normalizeReviewLimits(value: unknown): ReviewLimits | null {
  if (!isRecord(value)) {
    return null;
  }

  const maximumFileSizeBytes = asNumber(value.maximum_file_size_bytes);
  const maximumPages = asNumber(value.maximum_pages);
  const maximumWords = asNumber(value.maximum_words);
  const maximumEstimatedDocumentTokens = asNumber(
    value.maximum_estimated_document_tokens
  );
  const freeReportRetentionHours = asNumber(value.free_report_retention_hours);
  const paidCreditValidityDays = asNumber(value.paid_credit_validity_days);

  if (
    maximumFileSizeBytes === null ||
    maximumPages === null ||
    maximumWords === null ||
    maximumEstimatedDocumentTokens === null ||
    freeReportRetentionHours === null ||
    paidCreditValidityDays === null
  ) {
    return null;
  }

  return {
    maximum_file_size_bytes: maximumFileSizeBytes,
    maximum_pages: maximumPages,
    maximum_words: maximumWords,
    maximum_estimated_document_tokens: maximumEstimatedDocumentTokens,
    free_report_retention_hours: freeReportRetentionHours,
    paid_credit_validity_days: paidCreditValidityDays,
  };
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatFileLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

type ReportsDashboardProps = {
  onOpenReport: (submissionId: string) => Promise<void>;
  onStartNewReview: () => void;
  onOpenCredits: () => void;
  hideCreditAction?: boolean;
};

function ReportsDashboard({
  onOpenReport,
  onStartNewReview,
  onOpenCredits,
  hideCreditAction = false,
}: ReportsDashboardProps) {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );

  const [reports, setReports] = useState<ReportHistoryRow[]>([]);

  const [loadError, setLoadError] = useState('');

  const [openingSubmissionId, setOpeningSubmissionId] = useState<string | null>(
    null
  );

  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');

  const [sortMode, setSortMode] = useState<'latest' | 'oldest' | 'filename'>(
    'latest'
  );

  useEffect(() => {
    const refreshReports = () => {
      setRefreshKey((value) => value + 1);
    };

    window.addEventListener('ia-report-history-changed', refreshReports);

    return () => {
      window.removeEventListener('ia-report-history-changed', refreshReports);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        setLoadState('loading');
        setLoadError('');

        await ensureFreshReviewSession();

        const { data, error } = await supabase.rpc('get_my_ia_report_history');

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        setReports(normalizeReportHistoryRows(data));

        setLoadState('ready');
      } catch (error) {
        console.error('Saved IA reports could not be loaded', error);

        if (active) {
          setLoadError(
            'Your saved IA reports could not be loaded. Refresh this page and try again.'
          );

          setLoadState('error');
        }
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matching = query
      ? reports.filter((report) => {
          const searchable = [
            report.original_filename,
            report.project_title,
            report.research_question ?? '',
            report.subject,
            `Version ${report.version_number}`,
          ]
            .join(' ')
            .toLowerCase();

          return searchable.includes(query);
        })
      : reports.slice();

    return matching.sort((left, right) => {
      if (sortMode === 'filename') {
        return left.original_filename.localeCompare(right.original_filename);
      }

      const difference = getReportTimestamp(right) - getReportTimestamp(left);

      return sortMode === 'oldest' ? -difference : difference;
    });
  }, [reports, searchQuery, sortMode]);

  const projectCount = useMemo(
    () => new Set(reports.map((report) => report.project_id)).size,
    [reports]
  );

  async function handleOpen(submissionId: string) {
    if (openingSubmissionId) {
      return;
    }

    setOpeningSubmissionId(submissionId);
    setLoadError('');

    try {
      await onOpenReport(submissionId);
    } catch (error) {
      console.error('Saved report could not be opened', error);

      setLoadError(getErrorMessage(error));

      setOpeningSubmissionId(null);
    }
  }

  return (
    <div className="premium-reports-page">
      <header className="premium-page-header">
        <div>
          <span>Saved review library</span>
          <h2>My IA Reports</h2>
          <p>
            Open a completed draft to return to its detailed review, annotated
            IA and progress plan.
          </p>
        </div>

        <button
          className="premium-primary-action"
          type="button"
          onClick={onStartNewReview}
        >
          <UploadCloud aria-hidden="true" />
          New IA review
          <ArrowRight aria-hidden="true" />
        </button>
      </header>

      <section className="premium-report-overview">
        <div>
          <strong>{reports.length}</strong>
          <span>
            {reports.length === 1 ? 'saved version' : 'saved versions'}
          </span>
        </div>

        <span />

        <div>
          <strong>{projectCount}</strong>
          <span>{projectCount === 1 ? 'IA project' : 'IA projects'}</span>
        </div>

        <p>Reports are saved automatically after a full review completes.</p>
      </section>

      <section className="premium-report-toolbar">
        <label>
          <SearchCheck aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by filename, project or research question"
            aria-label="Search saved IA reports"
          />
        </label>

        <div className="premium-report-sort">
          <span>Sort</span>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(
                event.target.value as 'latest' | 'oldest' | 'filename'
              )
            }
            aria-label="Sort reports"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
            <option value="filename">Filename</option>
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </section>

      {loadError && (
        <div className="premium-inline-error" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {loadState === 'loading' ? (
        <section className="premium-report-loading">
          <LoaderCircle className="premium-spin" aria-hidden="true" />
          <div>
            <strong>Loading saved IA reports</strong>
            <span>Your report library is being prepared.</span>
          </div>
        </section>
      ) : loadState === 'error' ? (
        <section className="premium-report-empty">
          <AlertCircle aria-hidden="true" />
          <h3>Reports are temporarily unavailable</h3>
          <p>{loadError}</p>
        </section>
      ) : reports.length === 0 ? (
        <section className="premium-report-empty">
          <span>
            <ClipboardList aria-hidden="true" />
          </span>
          <h3>Your report library is empty</h3>
          <p>
            Complete a full IA review and the report will be saved here
            automatically.
          </p>
          <div>
            <button type="button" onClick={onStartNewReview}>
              <UploadCloud aria-hidden="true" />
              Start an IA review
            </button>
            {!hideCreditAction && (
              <button type="button" onClick={onOpenCredits}>
                <CreditCard aria-hidden="true" />
                Review-credit options
              </button>
            )}
          </div>
        </section>
      ) : filteredReports.length === 0 ? (
        <section className="premium-report-empty">
          <SearchCheck aria-hidden="true" />
          <h3>No report matches that search</h3>
          <p>Try the filename, version, project title or research question.</p>
          <button type="button" onClick={() => setSearchQuery('')}>
            Clear search
          </button>
        </section>
      ) : (
        <section className="premium-report-list">
          <header>
            <span>Report</span>
            <span>Review access</span>
            <span>Indicative range</span>
            <span aria-hidden="true" />
          </header>

          {filteredReports.map((report) => {
            const markSummary = deriveReportMarkSummary(
              report.criterion_scores
            );

            const isOpening = openingSubmissionId === report.submission_id;

            return (
              <article
                className="premium-report-row"
                key={report.submission_id}
              >
                <button
                  className="premium-report-file"
                  type="button"
                  onClick={() => void handleOpen(report.submission_id)}
                  disabled={Boolean(openingSubmissionId)}
                >
                  <span>
                    <FileText aria-hidden="true" />
                  </span>

                  <div>
                    <strong>{report.original_filename}</strong>
                    <p>
                      Version {report.version_number}
                      {' · '}
                      Completed{' '}
                      {formatReportDate(
                        report.report_generated_at ??
                          report.saved_at ??
                          report.uploaded_at
                      )}
                    </p>
                    <small>
                      {report.project_title}
                      {report.research_question
                        ? ` · ${report.research_question}`
                        : ''}
                    </small>
                  </div>
                </button>

                <div className="premium-report-features">
                  {report.annotated_html_ready && (
                    <span>
                      <CheckCircle2 aria-hidden="true" />
                      Annotated IA
                    </span>
                  )}

                  {report.progress_plan_ready && (
                    <span>
                      <ClipboardList aria-hidden="true" />
                      Progress plan
                    </span>
                  )}

                  {report.annotated_docx_ready && (
                    <span>
                      <Download aria-hidden="true" />
                      Word comments
                    </span>
                  )}
                </div>

                <div className="premium-report-mark">
                  <small>Indicative range</small>
                  <strong>
                    {markSummary
                      ? `${markSummary.range[0]}–${markSummary.range[1]} / ${markSummary.maximum}`
                      : 'Open report'}
                  </strong>
                </div>

                <button
                  className="premium-report-open"
                  type="button"
                  onClick={() => void handleOpen(report.submission_id)}
                  disabled={Boolean(openingSubmissionId)}
                  aria-label={`Open ${report.original_filename}`}
                >
                  {isOpening ? (
                    <LoaderCircle className="premium-spin" aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

type UploadWorkspaceProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;

  selectedFile: ValidatedIaFile | null;
  status: AppStatus;
  message: string;
  errorContext: ErrorContext;

  onChooseFile: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onUpload: () => void;
  onRetrySession: () => void;
};

function UploadWorkspace({
  fileInputRef,
  selectedFile,
  status,
  message,
  errorContext,
  onChooseFile,
  onFileChange,
  onClearFile,
  onUpload,
  onRetrySession,
}: UploadWorkspaceProps) {
  const stageDescriptions = [
    'Reads the usable text from your uploaded IA draft.',
    'Identifies sections, headings and evidence locations.',
    'Checks the draft against the four SEHS IA criteria.',
    'Turns findings into specific coaching and improvement actions.',
    'Connects comments to the relevant passages in your draft.',
    'Prioritises the changes to focus on in your next revision.',
  ];

  const stageIcons = [FileText, Layers3, SearchCheck, ListChecks, Eye, Target];

  return (
    <main className="main-content review-upload-page-v7">
      <section className="hero-section review-upload-hero-v7">
        <div className="hero-copy review-upload-hero-copy-v7">
          <span className="eyebrow review-upload-eyebrow-v7">
            IB Sports, Exercise and Health Science
          </span>

          <h1>Strengthen your IA through guided reflection</h1>

          <p>
            Upload your current draft and receive rubric-linked guidance,
            evidence-focused feedback and a clear revision pathway while keeping
            the investigation and writing your own.
          </p>

          <div className="review-upload-hero-points-v7" aria-label="Review features">
            <span>
              <SearchCheck aria-hidden="true" />
              Rubric-linked
            </span>
            <span>
              <Eye aria-hidden="true" />
              Annotated IA
            </span>
            <span>
              <Target aria-hidden="true" />
              Progress plan
            </span>
          </div>
        </div>

        <aside className="integrity-card review-upload-coach-card-v7">
          <span className="review-upload-coach-icon-v7">
            <Sparkles aria-hidden="true" />
          </span>

          <div>
            <small>Coaching principle</small>
            <strong>A review coach, not a report writer</strong>

            <p>
              The coach identifies evidence and guides your next steps. It does
              not write or rewrite your investigation.
            </p>

            <div className="review-upload-coach-tags-v7">
              <span>Evidence first</span>
              <span>Student-owned writing</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="workspace-grid review-upload-grid-v7">
        <div className="upload-card review-upload-card-v7">
          <header className="review-upload-card-header-v7">
            <div className="section-heading review-upload-section-heading-v7">
              <span className="section-number">1</span>

              <div>
                <span className="review-upload-step-label-v7">Step 1</span>
                <h2>Upload your current IA draft</h2>
                <p>Choose a searchable PDF or DOCX document to begin.</p>
              </div>
            </div>

            <span className="review-upload-limit-badge-v7">Maximum 20 MB</span>
          </header>

          <div className="review-upload-meta-v7">
            <span>
              <FileCheck2 aria-hidden="true" />
              PDF or DOCX
            </span>
            <span>
              <ShieldCheck aria-hidden="true" />
              Private upload
            </span>
            <span>
              <Clock3 aria-hidden="true" />
              Source removed after processing window
            </span>
          </div>

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileChange}
          />

          {!selectedFile ? (
            <button
              className="drop-zone review-upload-dropzone-v7"
              type="button"
              onClick={onChooseFile}
              disabled={status === 'uploading'}
            >
              <span className="upload-icon review-upload-icon-v7">
                <UploadCloud aria-hidden="true" />
              </span>

              <span className="drop-zone-title">Select your IA document</span>

              <span className="drop-zone-copy">
                Choose your latest searchable draft. Unsupported files are
                rejected before a review allowance is used.
              </span>

              <span className="secondary-button review-upload-choose-v7">
                <UploadCloud aria-hidden="true" />
                Choose file
              </span>
            </button>
          ) : (
            <div className="selected-file review-upload-selected-v7">
              <span className="file-icon">
                <FileText aria-hidden="true" />
              </span>

              <div className="file-details">
                <strong>{selectedFile.filename}</strong>

                <span>
                  {selectedFile.extension.toUpperCase()}
                  {' · '}
                  {selectedFile.sizeLabel}
                </span>
              </div>

              <button
                className="icon-button"
                type="button"
                aria-label="Remove selected file"
                onClick={onClearFile}
                disabled={status === 'uploading'}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          )}

          {message && (
            <div className="message message-error" role="alert">
              <AlertCircle aria-hidden="true" />

              <span>{message}</span>
            </div>
          )}

          {errorContext === 'session' && (
            <button
              className="retry-button"
              type="button"
              onClick={onRetrySession}
            >
              <RefreshCw aria-hidden="true" />
              Retry secure session
            </button>
          )}

          <button
            className="primary-button review-upload-primary-v7"
            type="button"
            onClick={onUpload}
            disabled={!selectedFile || status === 'uploading'}
          >
            {status === 'uploading' ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Uploading securely…
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" />
                Review my IA
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        <PrivacyCard />
      </section>

      <section className="process-preview review-process-v7">
        <header className="review-process-header-v7">
          <div className="section-heading review-upload-section-heading-v7">
            <span className="section-number">2</span>

            <div>
              <span className="review-upload-step-label-v7">Step 2</span>
              <h2>What happens after you upload</h2>
              <p>
                Six connected stages turn your draft into evidence-linked
                coaching, annotations and a prioritised revision plan.
              </p>
            </div>
          </div>

          <span className="review-process-count-v7">6 review stages</span>
        </header>

        <div className="process-steps review-process-grid-v7">
          {PIPELINE_STAGES.map((stage, index) => {
            const StageIcon = stageIcons[index] ?? Sparkles;

            return (
              <article className="process-step review-process-step-v7" key={stage.key}>
                <div className="review-process-step-top-v7">
                  <span className="review-process-icon-v7">
                    <StageIcon aria-hidden="true" />
                  </span>
                  <span className="review-process-number-v7">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div>
                  <h3>{stage.title}</h3>
                  <p>{stageDescriptions[index] ?? 'Preparing the next part of your review.'}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function PrivacyCard() {
  return (
    <aside className="privacy-card review-privacy-v7">
      <header className="privacy-heading review-privacy-heading-v7">
        <span className="privacy-icon">
          <LockKeyhole aria-hidden="true" />
        </span>

        <div>
          <span className="review-privacy-kicker-v7">Private by design</span>
          <h2>Your IA stays protected</h2>
          <p>Temporary source-file handling with account-owned review outputs.</p>
        </div>
      </header>

      <div className="privacy-list review-privacy-list-v7">
        {[
          {
            title: 'Private upload',
            copy: 'Your document is not placed in a public folder.',
          },
          {
            title: 'Original file removed',
            copy: 'The uploaded PDF or DOCX is scheduled for deletion after approximately one hour.',
          },
          {
            title: 'Secure account connection',
            copy: 'Your review remains connected to the signed-in account that started it.',
          },
          {
            title: 'Academic integrity protected',
            copy: 'Guidance focuses on reflection and actions, not copy-ready writing.',
          },
        ].map((item) => (
          <div className="privacy-item review-privacy-item-v7" key={item.title}>
            <span className="review-privacy-check-v7">
              <Check aria-hidden="true" />
            </span>

            <div>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="review-privacy-footer-v7">
        <ShieldCheck aria-hidden="true" />
        <span>Designed for secure student-owned review history</span>
      </footer>
    </aside>
  );
}

type ProcessingWorkspaceProps = {
  selectedFile: ValidatedIaFile | null;
  progress: PipelineProgress | null;
  errorMessage: string;
  onRetry: () => void;
};

function ProcessingWorkspace({
  selectedFile,
  progress,
  errorMessage,
  onRetry,
}: ProcessingWorkspaceProps) {
  const percentage = progress?.progressPercent ?? 0;

  return (
    <main className="processing-main">
      <section className="processing-card">
        <div className="processing-heading">
          <span className="processing-heading-icon">
            <SearchCheck aria-hidden="true" />
          </span>

          <div>
            <span className="processing-eyebrow">Review in progress</span>

            <h1>Preparing your IA review</h1>

            <p>Keep this page open while each review stage is completed.</p>
          </div>
        </div>

        {selectedFile && (
          <div className="processing-file">
            <FileText aria-hidden="true" />

            <div>
              <strong>{selectedFile.filename}</strong>

              <span>
                {selectedFile.extension.toUpperCase()}
                {' · '}
                {selectedFile.sizeLabel}
              </span>
            </div>
          </div>
        )}

        <div className="progress-summary">
          <div className="progress-summary-row">
            <strong>
              {errorMessage
                ? 'Review paused'
                : progress?.message ?? 'Preparing your review.'}
            </strong>

            <span>{percentage}%</span>
          </div>

          <div
            className="pipeline-progress-track"
            role="progressbar"
            aria-label="IA review progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          >
            <span
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>

        <div className="pipeline-stage-list">
          {PIPELINE_STAGES.map((stage) => {
            const stageState = getStageState(
              stage.key,
              progress,
              Boolean(errorMessage)
            );

            return (
              <div
                className={`pipeline-stage pipeline-stage-${stageState}`}
                key={stage.key}
              >
                <span className="pipeline-stage-icon">
                  {stageState === 'complete' ? (
                    <Check aria-hidden="true" />
                  ) : stageState === 'active' ? (
                    <LoaderCircle
                      className="stage-spinner"
                      aria-hidden="true"
                    />
                  ) : stageState === 'error' ? (
                    <AlertCircle aria-hidden="true" />
                  ) : (
                    stage.number
                  )}
                </span>

                <div className="pipeline-stage-copy">
                  <strong>{stage.title}</strong>
                  <span>{stage.description}</span>
                </div>

                <span className="pipeline-stage-status">
                  {stageState === 'complete'
                    ? 'Complete'
                    : stageState === 'active'
                    ? 'In progress'
                    : stageState === 'error'
                    ? 'Needs retry'
                    : 'Waiting'}
                </span>
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="processing-error" role="alert">
            <AlertCircle aria-hidden="true" />

            <div>
              <strong>This stage needs another attempt</strong>

              <p>{errorMessage}</p>

              <button
                className="primary-button processing-retry"
                type="button"
                onClick={onRetry}
              >
                <RefreshCw aria-hidden="true" />
                Continue review
              </button>
            </div>
          </div>
        ) : (
          <div className="processing-notice">
            <LockKeyhole aria-hidden="true" />

            <span>
              Your document remains private while the review is prepared.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}

type ReviewTab = 'detailed' | 'workshop' | 'comparison' | 'annotated' | 'plan';

type ReviewLoadState = 'loading' | 'ready' | 'error';

type FindingPriority = 'high' | 'medium' | 'low';

type DetailedFinding = {
  id: string;
  coaching_output_id: string;
  criterion_code: string;
  finding_index: number;
  finding_type: string;
  priority: FindingPriority;
  block_id: string | null;
  section_title: string | null;
  paragraph_index: number | null;
  page_number: number | null;
  sentence_ids: string[];
  evidence_excerpt: string | null;
  rubric_requirement: string;
  issue: string;
  specific_action: string;
  required_elements: string[];
  completion_check: string;
  why: string;
};

type CoachingWhy = {
  source_type?: string;
  trigger_sentence_ids?: string[];
  trigger_gap?: string | null;
  explanation?: string;
};

type CoachingStrength = {
  id?: string;
  summary?: string;
  rubric_target?: string;
  why?: CoachingWhy;
};

type CoachingQuestion = {
  id?: string;
  question?: string;
  rubric_target?: string;
  why?: CoachingWhy;
};

type CoachingChecklistItem = {
  id?: string;
  priority?: FindingPriority;
  action?: string;
  completion_check?: string;
  rubric_target?: string;
  why?: CoachingWhy;
};

type CriterionCoaching = {
  criterion: string;
  criterion_name: string;
  criterion_max_marks: number | null;
  indicative_band: string | null;
  indicative_mark_range: [number, number] | null;
  confidence: string | null;
  command_term_level: string | null;
  why_this_range: string | null;
  strengths: CoachingStrength[];
  reflective_questions: CoachingQuestion[];
  improvement_checklist: CoachingChecklistItem[];
};

type ProgressTarget = {
  id: string;
  criterion: string;
  priority: FindingPriority;
  action: string;
  successEvidence: string | null;
  why: string | null;
};

type ProgressPlanView = {
  summary: string | null;
  nextCheckinDate: string | null;
  targets: ProgressTarget[];
};

type DetailedReviewData = {
  findings: DetailedFinding[];
  criteria: CriterionCoaching[];
  progressPlan: ProgressPlanView;
  accessMode: string;
  fullAccess: boolean;
  expired: boolean;
  accessExpiresAt: string | null;
  previewCriterion: string | null;
  progressPlanLocked: boolean;
  annotatedPreviewAvailable: boolean;
  canDownload: boolean;
  canPrint: boolean;
  annotatedIaUrl: string | null;
  annotatedArtifactBucket: string | null;
  annotatedArtifactPath: string | null;
  annotatedArtifactExpiresAt: string | null;
};

type AnnotatedDocxResponse = {
  submission_id?: string;
  artifact_id?: string;
  artifact_type?: string;
  status?: string;
  signed_url?: string;
  filename?: string;
  comment_count?: number;
  skipped_finding_count?: number;
  generated_at?: string;
  expires_at?: string;
  cached?: boolean;
};

type CompletionWorkspaceProps = {
  selectedFile: ValidatedIaFile | null;
  submission: IaSubmission | null;
  completion: PipelineCompletion | null;
  onReset: () => void;
  onUpgrade: () => void;
  paymentsEnabled: boolean;
  upgradeError: string;
  showBackToReports: boolean;
  onBackToReports: () => void;
};

function CompletionWorkspace({
  selectedFile,
  submission,
  completion,
  onReset,
  onUpgrade,
  paymentsEnabled,
  upgradeError,
  showBackToReports,
  onBackToReports,
}: CompletionWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('detailed');
  const [reviewLoadState, setReviewLoadState] =
    useState<ReviewLoadState>('loading');
  const [reviewError, setReviewError] = useState('');
  const [reviewData, setReviewData] = useState<DetailedReviewData | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isOpeningAnnotatedIa, setIsOpeningAnnotatedIa] = useState(false);
  const [annotatedIaOpenError, setAnnotatedIaOpenError] = useState('');
  const [isDownloadingAnnotatedDocx, setIsDownloadingAnnotatedDocx] =
    useState(false);
  const [annotatedDocxError, setAnnotatedDocxError] = useState('');
  const [annotatedDocxSuccess, setAnnotatedDocxSuccess] = useState('');

  const [annotationShareOpen, setAnnotationShareOpen] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<DraftSnapshot | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonMessage, setComparisonMessage] = useState('');

  const accessMode =
    reviewData?.accessMode ??
    completion?.commercialAccess ??
    submission?.commercial_access ??
    'unassigned';

  const isFreeReview = accessMode === 'free_review';

  const hasFullReviewAccess =
    accessMode === 'paid_credit' || accessMode === 'complimentary';

  useEffect(() => {
    if (!isFreeReview) {
      return;
    }

    const printStyleId = 'sehs-free-review-print-restriction';

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === 'p') {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.body.classList.add('free-review-protected');

    let printStyle = document.getElementById(
      printStyleId
    ) as HTMLStyleElement | null;

    if (!printStyle) {
      printStyle = document.createElement('style');

      printStyle.id = printStyleId;

      printStyle.textContent = `
        @media print {
          body.free-review-protected > * {
            display: none !important;
          }

          body.free-review-protected::before {
            content: "Printing is available with a full review credit.";
            display: block !important;
            margin: 72px auto;
            padding: 28px;
            max-width: 620px;
            color: #162033;
            border: 1px solid #d0d5dd;
            border-radius: 14px;
            font-family:
              Inter,
              Arial,
              sans-serif;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.5;
            text-align: center;
          }
        }
      `;

      document.head.appendChild(printStyle);
    }

    document.addEventListener('contextmenu', handleContextMenu, true);

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.body.classList.remove('free-review-protected');

      document.removeEventListener('contextmenu', handleContextMenu, true);

      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isFreeReview]);

  useEffect(() => {
    let active = true;

    async function loadSavedReview() {
      if (!submission?.id) {
        if (active) {
          setReviewLoadState('error');
          setReviewError(
            'The completed review could not be linked to this submission.'
          );
        }
        return;
      }

      try {
        setReviewLoadState('loading');
        setReviewError('');

        const data = await loadDetailedReviewData(submission.id, completion);

        if (active) {
          setReviewData(data);
          setReviewLoadState('ready');
        }
      } catch (error) {
        console.error('Detailed review could not be loaded', error);

        if (active) {
          setReviewError(
            'The saved detailed review could not be displayed. Please try loading it again.'
          );
          setReviewLoadState('error');
        }
      }
    }

    void loadSavedReview();

    return () => {
      active = false;
    };
  }, [submission?.id, completion, reloadToken]);

  // Compare only reports owned by this account and associated with the SAME IA
  // project, using the backend's existing project_id and history RPC.
  // No document-level resolved status is inferred from absent findings.
  useEffect(() => {
    let live = true;
    if (activeTab !== 'comparison' || !submission?.id || !hasFullReviewAccess) return;
    async function loadPriorDraft() {
      setComparisonLoading(true);
      setComparisonMessage('');
      setPreviousDraft(null);
      try {
        const history = await supabase.rpc('get_my_ia_report_history');
        if (history.error) throw history.error;
        const rows = (Array.isArray(history.data) ? history.data : [])
          .filter(isRecord);
        const current = rows.find(row => row.submission_id === submission!.id);
        if (!current || typeof current.project_id !== 'string') {
          throw new Error('No matching IA project history was available.');
        }
        const prior = rows
          .filter(row => row.project_id === current.project_id &&
            row.student_id === current.student_id &&
            typeof row.version_number === 'number' &&
            row.version_number < Number(current.version_number) &&
            typeof row.submission_id === 'string')
          .sort((a,b)=>Number(b.version_number)-Number(a.version_number))[0];
        if (!prior) {
          if (live) setComparisonMessage('No earlier saved report for this IA project.');
          return;
        }
        const result = await supabase.rpc('get_my_ia_review_content', {
          p_submission_id: prior.submission_id as string,
        });
        if (result.error) throw result.error;
        if (!isRecord(result.data) || result.data.full_access !== true) {
          throw new Error('The earlier report is not accessible with full review permission.');
        }
        if (live) setPreviousDraft({
          submissionId: prior.submission_id as string,
          version: prior.version_number as number,
          findings: normalizeDetailedFindings(result.data.findings),
          criteria: normalizeCriterionCoaching(result.data.criteria),
        });
      } catch (error) {
        if (live) setComparisonMessage(error instanceof Error ? error.message : 'Comparison history unavailable.');
      } finally {
        if (live) setComparisonLoading(false);
      }
    }
    void loadPriorDraft();
    return () => {live = false;};
  }, [activeTab, submission?.id, hasFullReviewAccess]);

  const annotatedIaUrl =
    reviewData?.annotatedIaUrl ?? completion?.annotatedIaUrl ?? null;

  const canOpenAnnotatedIa =
    Boolean(
      reviewData?.annotatedArtifactBucket && reviewData?.annotatedArtifactPath
    ) ||
    Boolean(annotatedIaUrl) ||
    Boolean(isFreeReview && reviewData?.annotatedPreviewAvailable);

  async function handleOpenAnnotatedIa() {
    if (!canOpenAnnotatedIa || isOpeningAnnotatedIa || !submission?.id) {
      return;
    }

    setIsOpeningAnnotatedIa(true);
    setAnnotatedIaOpenError('');

    let preparedWindow: Window | null = null;

    try {
      if (isFreeReview) {
        await openFreeAnnotatedIaPreview(submission.id);
      } else {
        preparedWindow = openPreparingAnnotatedIaWindow();

        const preparedArtifact = await prepareCurrentAnnotatedIaArtifact(
          submission.id
        );

        await openAnnotatedIaDocument({
          bucket: null,
          path: null,
          signedUrl: preparedArtifact.signed_url ?? annotatedIaUrl,
          previewWindow: preparedWindow,
        });

        setReloadToken((value) => value + 1);
      }
    } catch (error) {
      console.error('Annotated IA could not be opened', error);

      if (preparedWindow && !preparedWindow.closed) {
        writeAnnotatedIaWindowError(preparedWindow);
      }

      setAnnotatedIaOpenError(
        isExpiredJwtError(error)
          ? 'Your secure session expired. Refresh this page and open the annotated IA again.'
          : 'The annotated IA is temporarily unavailable. Refresh this page and try again.'
      );
    } finally {
      setIsOpeningAnnotatedIa(false);
    }
  }

  const canDownloadAnnotatedDocx =
    hasFullReviewAccess &&
    reviewData?.canDownload !== false &&
    submission?.mime_type === DOCX_MIME_TYPE;

  async function handleDownloadAnnotatedDocx() {
    if (
      !submission?.id ||
      !canDownloadAnnotatedDocx ||
      isDownloadingAnnotatedDocx
    ) {
      return;
    }

    setIsDownloadingAnnotatedDocx(true);
    setAnnotatedDocxError('');
    setAnnotatedDocxSuccess('');

    try {
      await ensureFreshReviewSession();

      let result = await supabase.functions.invoke<AnnotatedDocxResponse>(
        'generate-annotated-docx',
        {
          body: {
            submission_id: submission.id,
            force: false,
          },
        }
      );

      if (result.error && isExpiredJwtError(result.error)) {
        await ensureFreshReviewSession();

        result = await supabase.functions.invoke<AnnotatedDocxResponse>(
          'generate-annotated-docx',
          {
            body: {
              submission_id: submission.id,
              force: false,
            },
          }
        );
      }

      if (result.error) {
        throw new Error(
          await readEdgeFunctionErrorMessage(
            result.error,
            'The annotated Word copy could not be generated.'
          )
        );
      }

      const signedUrl = result.data?.signed_url;

      if (typeof signedUrl !== 'string' || !signedUrl) {
        throw new Error(
          'The annotated Word copy was generated, but its secure download link was unavailable.'
        );
      }

      const filename =
        result.data?.filename?.trim() ||
        buildAnnotatedDocxFilename(submission.original_filename);

      await downloadFileFromSignedUrl(signedUrl, filename);

      const commentCount =
        typeof result.data?.comment_count === 'number'
          ? result.data.comment_count
          : null;

      setAnnotatedDocxSuccess(
        commentCount !== null
          ? `Annotated Word copy downloaded with ${commentCount} review comment${
              commentCount === 1 ? '' : 's'
            }.`
          : 'Annotated Word copy downloaded successfully.'
      );
    } catch (error) {
      console.error('Annotated Word copy could not be downloaded', error);

      setAnnotatedDocxError(getErrorMessage(error));
    } finally {
      setIsDownloadingAnnotatedDocx(false);
    }
  }

  function printDetailedReport() {
    if (isFreeReview || reviewData?.canPrint === false) {
      if (paymentsEnabled) {
        onUpgrade();
      }
      return;
    }

    setActiveTab('detailed');

    window.setTimeout(() => {
      window.print();
    }, 180);
  }

  return (
    <main className="completion-main">
      {showBackToReports && (
        <button
          className="back-to-reports-button"
          type="button"
          onClick={onBackToReports}
        >
          <ArrowLeft aria-hidden="true" />
          Back to My IA Reports
        </button>
      )}

      <ReviewResultAccessBanner
        isFreeReview={isFreeReview}
        fullAccess={hasFullReviewAccess}
        accessExpiresAt={
          reviewData?.accessExpiresAt ?? submission?.access_expires_at ?? null
        }
        reportSaved={
          completion?.reportSaved === true ||
          submission?.retention_policy === 'account'
        }
        paymentsEnabled={paymentsEnabled}
        onUpgrade={onUpgrade}
      />

      {upgradeError && (
        <div className="review-upgrade-error" role="alert">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>The review could not be unlocked yet</strong>
            <span>{upgradeError}</span>
          </div>
        </div>
      )}

      <section className="completion-card completion-card-results">
        <div className="completion-hero">
          <div className="completion-mark">
            <CheckCircle2 aria-hidden="true" />
          </div>

          <div className="completion-hero-copy">
            <span className="completion-eyebrow">Review complete</span>

            <h1>Your IA guidance is ready</h1>

            <p className="completion-intro">
              {isFreeReview
                ? 'Your free preview shows the first detailed-review criterion and the opening section of the annotated IA.'
                : 'Review the exact evidence identified in your draft, the specific action required for each criterion, your annotated IA and your prioritised progress plan.'}
            </p>
          </div>
        </div>

        {(selectedFile?.filename || submission?.original_filename) && (
          <div className="completion-file">
            <FileCheck2 aria-hidden="true" />

            <div>
              <strong>
                {selectedFile?.filename ?? submission?.original_filename}
              </strong>
              <span>Secure detailed review completed</span>
            </div>
          </div>
        )}

        <div className="completion-summary-grid">
          <div className="completion-summary-item">
            <SearchCheck aria-hidden="true" />

            <div>
              <span>Indicative range</span>

              <strong>
                {completion?.overallMarkRange
                  ? `${completion.overallMarkRange[0]}–${completion.overallMarkRange[1]}`
                  : 'Ready'}
                {completion?.maximumMark ? ` / ${completion.maximumMark}` : ''}
              </strong>
            </div>
          </div>

          <div className="completion-summary-item">
            <ListChecks aria-hidden="true" />

            <div>
              <span>Rubric criteria</span>
              <strong>{isFreeReview ? '1 previewed' : '4 reviewed'}</strong>
            </div>
          </div>

          <div className="completion-summary-item">
            <Target aria-hidden="true" />

            <div>
              <span>
                {isFreeReview ? 'Preview findings' : 'Detailed findings'}
              </span>
              <strong>{reviewData?.findings.length ?? 'Saved'}</strong>
            </div>
          </div>

          <div className="completion-summary-item">
            <Clock3 aria-hidden="true" />

            <div>
              <span>Progress plan</span>

              <strong>
                {isFreeReview
                  ? 'Locked'
                  : reviewData?.progressPlan.nextCheckinDate
                  ? formatReviewDate(reviewData.progressPlan.nextCheckinDate)
                  : completion?.nextCheckinDate
                  ? formatReviewDate(completion.nextCheckinDate)
                  : 'Prepared'}
              </strong>
            </div>
          </div>
        </div>

        <div className="completion-toolbar">
          <button
            className={`report-action-button ${
              isFreeReview ? 'report-action-locked' : ''
            }`}
            type="button"
            onClick={printDetailedReport}
            disabled={isFreeReview && !paymentsEnabled}
          >
            {isFreeReview ? (
              <LockKeyhole aria-hidden="true" />
            ) : (
              <Printer aria-hidden="true" />
            )}
            {isFreeReview
              ? paymentsEnabled
                ? 'Unlock print and save'
                : 'Print available with full review'
              : 'Print or save report'}
          </button>

          {canOpenAnnotatedIa && (
            <button
              className="report-action-button report-action-primary"
              type="button"
              onClick={handleOpenAnnotatedIa}
              disabled={isOpeningAnnotatedIa}
            >
              {isOpeningAnnotatedIa ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <ExternalLink aria-hidden="true" />
              )}

              {isOpeningAnnotatedIa
                ? 'Opening annotated IA…'
                : isFreeReview
                ? 'Open annotated IA preview'
                : 'Open annotated IA'}
            </button>
          )}

          {hasFullReviewAccess && submission?.id && (
            <button
              className="report-action-button"
              type="button"
              onClick={() => setAnnotationShareOpen(true)}
            >
              <Share2 aria-hidden="true" />
              Share with student
            </button>
          )}
        </div>

        {annotatedIaOpenError && (
          <div className="annotated-open-error" role="alert">
            <AlertCircle aria-hidden="true" />

            <div>
              <strong
                style={{
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                The annotated IA could not be opened
              </strong>

              <span style={{ display: 'block' }}>{annotatedIaOpenError}</span>
            </div>
          </div>
        )}

        <div className="review-results-shell">
          <nav className="review-tabbar" aria-label="IA review sections">
            <div className="review-tabgroup" role="tablist" aria-label="For the student">
              <span className="review-tabgroup-label">For the student</span>
              {([
                ['detailed', BookOpen, 'Feedback', isFreeReview ? 'First criterion preview' : 'By criterion'],
                ['workshop', ListChecks, 'Section guide', 'All 9 IA sections'],
                ['plan', ClipboardList, 'Progress plan', isFreeReview ? 'Locked' : 'Next steps'],
                ['comparison', Layers3, 'Compare drafts', 'Changes and bands'],
              ] as const).map(([id, Icon, label, hint]) => (
                <button
                  key={id}
                  className={`review-tab ${activeTab === id ? 'review-tab-active' : ''}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon aria-hidden="true" />
                  <span>
                    <strong>{label}</strong>
                    <small>{hint}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="review-tabgroup review-tabgroup-teacher" role="tablist" aria-label="For the teacher">
              <span className="review-tabgroup-label">For the teacher</span>
              <button
                className={`review-tab ${activeTab === 'annotated' ? 'review-tab-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={activeTab === 'annotated'}
                onClick={() => setActiveTab('annotated')}
              >
                <Eye aria-hidden="true" />
                <span>
                  <strong>Annotated IA</strong>
                  <small>{isFreeReview ? '20-line preview' : 'Marked copy and notes'}</small>
                </span>
              </button>
            </div>
          </nav>

          <div className="review-tab-content">
            {reviewLoadState === 'loading' ? (
              <ReviewDataLoading />
            ) : reviewLoadState === 'error' ? (
              <ReviewDataError
                message={reviewError}
                onRetry={() => setReloadToken((value) => value + 1)}
              />
            ) : reviewData ? (
              <>
                {activeTab === 'detailed' && (
                  <DetailedReviewTab
                    data={reviewData}
                    isFreePreview={isFreeReview}
                    paymentsEnabled={paymentsEnabled}
                    onUpgrade={onUpgrade}
                  />
                )}

                {activeTab === 'workshop' && (
                  <WorkshopGuidedReview
                    findings={reviewData.findings}
                    criteria={reviewData.criteria}
                    freePreview={isFreeReview}
                    submissionId={submission?.id}
                    onOpenAnnotatedIa={canOpenAnnotatedIa ? handleOpenAnnotatedIa : undefined}
                  />
                )}

                {activeTab === 'comparison' && (
                  isFreeReview ? <LockedReviewSection
                    title="Compare saved IA reviews"
                    description="Draft comparison is available with full review access."
                    paymentsEnabled={paymentsEnabled}
                    onUpgrade={onUpgrade}
                  /> : comparisonLoading ? <ReviewDataLoading/> : (
                    <>
                    {comparisonMessage && <p className="review-data-state">{comparisonMessage}</p>}
                    <DraftComparison
                      current={{submissionId: submission?.id ?? '',version:submission?.draft_version ?? 1,findings:reviewData.findings,criteria:reviewData.criteria}}
                      previous={previousDraft}
                    />
                    </>
                  )
                )}

                {activeTab === 'annotated' && (
                  <>
                  <AnnotatedIaTab
                    canOpen={canOpenAnnotatedIa}
                    isOpening={isOpeningAnnotatedIa}
                    openError={annotatedIaOpenError}
                    expiresAt={
                      reviewData.annotatedArtifactExpiresAt ??
                      reviewData.accessExpiresAt
                    }
                    onOpen={handleOpenAnnotatedIa}
                    onRefresh={() => setReloadToken((value) => value + 1)}
                    canDownloadWord={canDownloadAnnotatedDocx}
                    sourceIsDocx={submission?.mime_type === DOCX_MIME_TYPE}
                    isDownloadingWord={isDownloadingAnnotatedDocx}
                    wordDownloadError={annotatedDocxError}
                    wordDownloadSuccess={annotatedDocxSuccess}
                    onDownloadWord={handleDownloadAnnotatedDocx}
                    isFreePreview={isFreeReview}
                    paymentsEnabled={paymentsEnabled}
                    onUpgrade={onUpgrade}
                  />
                  {!isFreeReview && submission?.id && (
                    <TeacherCopyPanel submissionId={submission.id} />
                  )}
                  </>
                )}

                {activeTab === 'plan' && (
                  <ProgressPlanTab
                    plan={reviewData.progressPlan}
                    isLocked={isFreeReview || reviewData.progressPlanLocked}
                    paymentsEnabled={paymentsEnabled}
                    onUpgrade={onUpgrade}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>

        <div className="completion-footer-actions">
          <p>
            This is formative guidance. Make every revision independently and
            confirm final decisions with your teacher.
          </p>

          <button
            className="secondary-action-button"
            type="button"
            onClick={onReset}
          >
            <RotateCcw aria-hidden="true" />
            Review another draft
          </button>
        </div>
      </section>

      {annotationShareOpen && submission?.id && hasFullReviewAccess && (
        <AnnotationShareModal
          submissionId={submission.id}
          filename={submission.original_filename}
          initialArtifactId={completion?.annotatedArtifactId ?? null}
          onClose={() => setAnnotationShareOpen(false)}
        />
      )}
    </main>
  );
}


type AnnotationShareModalProps = {
  submissionId: string;
  filename: string;
  initialArtifactId: string | null;
  onClose: () => void;
};

type ShareExpiryPreset = '24h' | '3d' | '7d' | 'custom';

function AnnotationShareModal({
  submissionId,
  filename,
  initialArtifactId,
  onClose,
}: AnnotationShareModalProps) {
  const [artifactId, setArtifactId] = useState<string | null>(
    initialArtifactId
  );
  const [links, setLinks] = useState<AnnotationShareLink[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expiryPreset, setExpiryPreset] =
    useState<ShareExpiryPreset>('7d');
  const [customExpiry, setCustomExpiry] = useState(() =>
    toDatetimeLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [allowDownload, setAllowDownload] = useState(false);
  const [includeMarking, setIncludeMarking] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState('');
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actionBusy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionBusy, onClose]);

  useEffect(() => {
    let active = true;

    async function loadShareLinks() {
      try {
        setLoadState('loading');
        setErrorMessage('');

        let currentArtifactId = initialArtifactId;

        if (!currentArtifactId) {
          const preparedArtifact = await prepareCurrentAnnotatedIaArtifact(
            submissionId
          );

          currentArtifactId =
            typeof preparedArtifact.artifact_id === 'string'
              ? preparedArtifact.artifact_id
              : null;
        }

        if (!currentArtifactId) {
          throw new Error(
            'The annotated IA is ready, but its secure artifact reference could not be loaded.'
          );
        }

        const response = await invokeManageAnnotationShare({
          action: 'list',
          artifact_id: currentArtifactId,
        });

        if (!active) {
          return;
        }

        setArtifactId(currentArtifactId);
        setLinks(normalizeAnnotationShareLinks(response.shares));
        setLoadState('ready');
      } catch (error) {
        console.error('Annotation share links could not be loaded', error);

        if (active) {
          setErrorMessage(
            getErrorMessage(error) ||
              'The secure share-link controls could not be loaded.'
          );
          setLoadState('error');
        }
      }
    }

    void loadShareLinks();

    return () => {
      active = false;
    };
  }, [submissionId, initialArtifactId]);

  async function refreshLinks(nextArtifactId: string = artifactId ?? '') {
    if (!nextArtifactId) {
      return;
    }

    const response = await invokeManageAnnotationShare({
      action: 'list',
      artifact_id: nextArtifactId,
    });

    setLinks(normalizeAnnotationShareLinks(response.shares));
  }

  async function handleCreateShare() {
    if (actionBusy) {
      return;
    }

    setActionBusy(true);
    setErrorMessage('');
    setSuccessMessage('');
    setCreatedShareUrl('');
    setCreatedShareId(null);
    setCopyState('idle');

    try {
      const preparedArtifact = await prepareCurrentAnnotatedIaArtifact(
        submissionId
      );

      const currentArtifactId =
        typeof preparedArtifact.artifact_id === 'string'
          ? preparedArtifact.artifact_id
          : artifactId;

      if (!currentArtifactId) {
        throw new Error(
          'The latest annotated IA could not be prepared for sharing.'
        );
      }

      const expiresAt = getAnnotationShareExpiry(
        expiryPreset,
        customExpiry
      );

      const response = await invokeManageAnnotationShare({
        action: 'create',
        artifact_id: currentArtifactId,
        expires_at: expiresAt,
        allow_download: allowDownload,
        include_marking: includeMarking,
      });

      const shareUrl = response.share?.share_url?.trim();
      const shareId = response.share?.id ?? null;

      if (!shareUrl || !shareId) {
        throw new Error(
          'The share link was created, but the secure URL was not returned.'
        );
      }

      setArtifactId(currentArtifactId);
      setCreatedShareUrl(shareUrl);
      setCreatedShareId(shareId);
      setSuccessMessage(
        `Secure link created. It expires ${formatReviewDateTime(
          response.share?.expires_at ?? expiresAt
        )}.`
      );

      await refreshLinks(currentArtifactId);
    } catch (error) {
      console.error('Secure annotation share link could not be created', error);

      setErrorMessage(
        getErrorMessage(error) ||
          'The secure share link could not be created. Please try again.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!createdShareUrl) {
      return;
    }

    setCopyState('idle');

    try {
      await copyTextToClipboard(createdShareUrl);
      setCopyState('copied');
    } catch (error) {
      console.error('Share link could not be copied', error);
      setCopyState('error');
    }
  }

  async function handleRevokeShare(shareId: string) {
    if (actionBusy || !artifactId) {
      return;
    }

    setActionBusy(true);
    setErrorMessage('');
    setSuccessMessage('');
    setCopyState('idle');

    try {
      await invokeManageAnnotationShare({
        action: 'revoke',
        share_id: shareId,
      });

      if (createdShareId === shareId) {
        setCreatedShareUrl('');
        setCreatedShareId(null);
      }

      await refreshLinks(artifactId);

      setSuccessMessage('The shared link has been revoked.');
    } catch (error) {
      console.error('Annotation share link could not be revoked', error);

      setErrorMessage(
        getErrorMessage(error) ||
          'The share link could not be revoked. Please try again.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div
      className="annotation-share-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !actionBusy) {
          onClose();
        }
      }}
    >
      <section
        className="annotation-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-share-title"
      >
        <header className="annotation-share-header">
          <div className="annotation-share-heading">
            <span className="annotation-share-icon">
              <Share2 aria-hidden="true" />
            </span>

            <div>
              <span>Secure annotated IA sharing</span>
              <h2 id="annotation-share-title">Share with student</h2>
              <p>
                Create a private, expiring link to this annotated IA. The
                student does not need to sign in.
              </p>
            </div>
          </div>

          <button
            className="annotation-share-close"
            type="button"
            onClick={onClose}
            disabled={actionBusy}
            aria-label="Close share controls"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="annotation-share-file">
          <FileText aria-hidden="true" />
          <div>
            <strong>{filename}</strong>
            <span>Only this annotated review will be shared.</span>
          </div>
        </div>

        {loadState === 'loading' ? (
          <div className="annotation-share-loading" role="status">
            <LoaderCircle className="annotation-share-spin" aria-hidden="true" />
            <div>
              <strong>Preparing secure sharing</strong>
              <span>Checking the current annotated artifact and its links.</span>
            </div>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="annotation-share-message error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="annotation-share-message success" role="status">
                <CheckCircle2 aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}

            {loadState === 'error' ? (
              <div className="annotation-share-retry">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw aria-hidden="true" />
                  Refresh and try again
                </button>
              </div>
            ) : (
              <>
                <section className="annotation-share-create">
                  <div className="annotation-share-section-heading">
                    <div>
                      <span>New link</span>
                      <h3>Choose when access should expire</h3>
                    </div>

                    <CalendarDays aria-hidden="true" />
                  </div>

                  <div
                    className="annotation-share-presets"
                    role="group"
                    aria-label="Share-link expiry"
                  >
                    {[
                      ['24h', '24 hours'],
                      ['3d', '3 days'],
                      ['7d', '7 days'],
                      ['custom', 'Custom'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={
                          expiryPreset === value
                            ? 'annotation-share-preset active'
                            : 'annotation-share-preset'
                        }
                        type="button"
                        onClick={() =>
                          setExpiryPreset(value as ShareExpiryPreset)
                        }
                        disabled={actionBusy}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {expiryPreset === 'custom' && (
                    <label className="annotation-share-custom-expiry">
                      <span>Custom expiry date and time</span>
                      <input
                        type="datetime-local"
                        value={customExpiry}
                        onChange={(event) =>
                          setCustomExpiry(event.target.value)
                        }
                        min={toDatetimeLocalInputValue(
                          new Date(Date.now() + 5 * 60 * 1000)
                        )}
                        max={toDatetimeLocalInputValue(
                          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        )}
                        disabled={actionBusy}
                        required
                      />
                      <small>Maximum share duration: 30 days.</small>
                    </label>
                  )}

                  <label className="annotation-share-download-option">
                    <input
                      type="checkbox"
                      checked={includeMarking}
                      onChange={(event) =>
                        setIncludeMarking(event.target.checked)
                      }
                      disabled={actionBusy}
                    />

                    <span>
                      <strong>Include indicative marking</strong>
                      <small>
                        Shows the overall indicative range and criterion marking
                        summary in the student’s shared link. Leave this off to
                        share feedback and annotations without estimated marks.
                      </small>
                    </span>
                  </label>

                  <label className="annotation-share-download-option">
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(event) =>
                        setAllowDownload(event.target.checked)
                      }
                      disabled={actionBusy}
                    />

                    <span>
                      <strong>Allow Print / Save PDF</strong>
                      <small>
                        Leave this off for a view-only shared annotation.
                      </small>
                    </span>
                  </label>

                  <button
                    className="annotation-share-create-button"
                    type="button"
                    onClick={() => void handleCreateShare()}
                    disabled={actionBusy}
                  >
                    {actionBusy ? (
                      <LoaderCircle
                        className="annotation-share-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Link2 aria-hidden="true" />
                    )}

                    {actionBusy ? 'Creating secure link…' : 'Create secure link'}
                  </button>
                </section>

                {createdShareUrl && (
                  <section className="annotation-share-created">
                    <div>
                      <span>New secure link</span>
                      <strong>Copy this link before closing the window</strong>
                      <p>
                        For security, the raw token is not stored and cannot be
                        recovered later. If the link is lost, create a new one.
                      </p>
                    </div>

                    <div className="annotation-share-url-row">
                      <input
                        type="text"
                        value={createdShareUrl}
                        readOnly
                        aria-label="New secure student share link"
                      />

                      <button
                        type="button"
                        onClick={() => void handleCopyShareUrl()}
                      >
                        <Copy aria-hidden="true" />
                        {copyState === 'copied'
                          ? 'Copied'
                          : copyState === 'error'
                          ? 'Copy failed'
                          : 'Copy link'}
                      </button>
                    </div>
                  </section>
                )}

                <section className="annotation-share-existing">
                  <div className="annotation-share-section-heading">
                    <div>
                      <span>Existing links</span>
                      <h3>Manage access</h3>
                    </div>

                    <strong>{links.length}</strong>
                  </div>

                  {links.length === 0 ? (
                    <div className="annotation-share-empty">
                      <Link2 aria-hidden="true" />
                      <span>No share links have been created for this annotation.</span>
                    </div>
                  ) : (
                    <div className="annotation-share-link-list">
                      {links.map((link) => {
                        const status = getAnnotationShareStatus(link);

                        return (
                          <article
                            className="annotation-share-link-row"
                            key={link.id}
                          >
                            <div className="annotation-share-link-main">
                              <span
                                className={`annotation-share-status ${status}`}
                              >
                                {status === 'active'
                                  ? 'Active'
                                  : status === 'revoked'
                                  ? 'Revoked'
                                  : 'Expired'}
                              </span>

                              <strong>
                                Expires {formatReviewDateTime(link.expires_at)}
                              </strong>

                              <small>
                                Created {formatReviewDateTime(link.created_at)}
                                {' · '}
                                {link.allow_download
                                  ? 'Print/PDF allowed'
                                  : 'View only'}
                                {' · '}
                                {link.include_marking
                                  ? 'Marking included'
                                  : 'Marking hidden'}
                              </small>
                            </div>

                            <div className="annotation-share-link-usage">
                              <span>
                                <Eye aria-hidden="true" />
                                {link.access_count}{' '}
                                {link.access_count === 1 ? 'open' : 'opens'}
                              </span>

                              <small>
                                {link.last_accessed_at
                                  ? `Last opened ${formatReviewDateTime(
                                      link.last_accessed_at
                                    )}`
                                  : 'Not opened yet'}
                              </small>
                            </div>

                            {status === 'active' && (
                              <button
                                className="annotation-share-revoke"
                                type="button"
                                onClick={() => void handleRevokeShare(link.id)}
                                disabled={actionBusy}
                              >
                                <LockKeyhole aria-hidden="true" />
                                Revoke
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div className="annotation-share-security-note">
                  <ShieldCheck aria-hidden="true" />
                  <p>
                    The original annotation remains private in your account.
                    Expiring or revoking this link does not delete the saved
                    review.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

async function invokeManageAnnotationShare(
  body: Record<string, unknown>
): Promise<ManageAnnotationShareResponse> {
  await ensureFreshReviewSession();

  let result = await supabase.functions.invoke<ManageAnnotationShareResponse>(
    'manage-annotation-share',
    {
      body,
    }
  );

  if (result.error && isExpiredJwtError(result.error)) {
    await ensureFreshReviewSession();

    result = await supabase.functions.invoke<ManageAnnotationShareResponse>(
      'manage-annotation-share',
      {
        body,
      }
    );
  }

  if (result.error) {
    throw new Error(
      await readEdgeFunctionErrorMessage(
        result.error,
        'The secure share-link request could not be completed.'
      )
    );
  }

  if (!result.data) {
    throw new Error(
      'The secure share-link service did not return a response.'
    );
  }

  return result.data;
}

function normalizeAnnotationShareLinks(
  value: unknown
): AnnotationShareLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map<AnnotationShareLink | null>((item) => {
      const id = asText(item.id);
      const artifactId = asText(item.artifact_id);
      const submissionId = asText(item.submission_id);
      const studentId = asText(item.student_id);
      const expiresAt = asText(item.expires_at);
      const createdAt = asText(item.created_at);

      if (
        !id ||
        !artifactId ||
        !submissionId ||
        !studentId ||
        !expiresAt ||
        !createdAt
      ) {
        return null;
      }

      return {
        id,
        artifact_id: artifactId,
        submission_id: submissionId,
        student_id: studentId,
        created_by: asText(item.created_by) ?? undefined,
        expires_at: expiresAt,
        revoked_at: asText(item.revoked_at),
        revoked_by: asText(item.revoked_by),
        allow_download: item.allow_download === true,
        include_marking: item.include_marking === true,
        access_count: Math.max(0, asNumber(item.access_count) ?? 0),
        last_accessed_at: asText(item.last_accessed_at),
        created_at: createdAt,
        active: item.active === true,
      } satisfies AnnotationShareLink;
    })
    .filter((item): item is AnnotationShareLink => item !== null);
}

function getAnnotationShareStatus(
  link: AnnotationShareLink
): 'active' | 'expired' | 'revoked' {
  if (link.revoked_at) {
    return 'revoked';
  }

  const expiresAt = Date.parse(link.expires_at);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return 'expired';
  }

  return 'active';
}

function getAnnotationShareExpiry(
  preset: ShareExpiryPreset,
  customExpiry: string
): string {
  const now = Date.now();

  if (preset === '24h') {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }

  if (preset === '3d') {
    return new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (preset === '7d') {
    return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (!customExpiry) {
    throw new Error('Choose a custom expiry date and time.');
  }

  const parsed = new Date(customExpiry);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Choose a valid custom expiry date and time.');
  }

  return parsed.toISOString();
}

function toDatetimeLocalInputValue(date: Date): string {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

async function copyTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');

  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');

  textarea.remove();

  if (!copied) {
    throw new Error('The link could not be copied automatically.');
  }
}

type ReviewResultAccessBannerProps = {
  isFreeReview: boolean;
  fullAccess: boolean;
  accessExpiresAt: string | null;
  reportSaved: boolean;
  paymentsEnabled: boolean;
  onUpgrade: () => void;
};

function ReviewResultAccessBanner({
  isFreeReview,
  fullAccess,
  accessExpiresAt,
  reportSaved,
  paymentsEnabled,
  onUpgrade,
}: ReviewResultAccessBannerProps) {
  if (isFreeReview) {
    return (
      <section className="review-access-result review-access-result-free">
        <span className="review-access-result-icon">
          <LockKeyhole aria-hidden="true" />
        </span>

        <div>
          <span>Free limited review</span>
          <strong>You are viewing a preview of the complete IA review</strong>
          <p>
            The first detailed-review criterion and the opening 20 lines of the
            annotated IA are available. The complete review, progress plan,
            downloads and permanent history require full review access.
            {!paymentsEnabled
              ? ' New paid review-credit purchases are temporarily unavailable.'
              : ''}
            {accessExpiresAt
              ? ` This preview is available until ${formatReviewDateTime(
                  accessExpiresAt
                )}.`
              : ''}
          </p>
        </div>

        {paymentsEnabled && (
          <button type="button" onClick={onUpgrade}>
            <CreditCard aria-hidden="true" />
            Unlock full review
          </button>
        )}
      </section>
    );
  }

  if (fullAccess) {
    return (
      <section className="review-access-result review-access-result-full">
        <span className="review-access-result-icon">
          <CheckCircle2 aria-hidden="true" />
        </span>

        <div>
          <span>Full review access</span>
          <strong>
            {reportSaved
              ? 'Complete review saved automatically'
              : 'Complete review available'}
          </strong>
          <p>
            Every criterion, the full annotated IA, progress plan and available
            downloads are unlocked.
          </p>
        </div>
      </section>
    );
  }

  return null;
}

type LockedReviewSectionProps = {
  title: string;
  description: string;
  paymentsEnabled: boolean;
  onUpgrade: () => void;
};

function LockedReviewSection({
  title,
  description,
  paymentsEnabled,
  onUpgrade,
}: LockedReviewSectionProps) {
  return (
    <section className="review-locked-section">
      <div className="review-locked-blur" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="review-locked-content">
        <span className="review-locked-icon">
          <LockKeyhole aria-hidden="true" />
        </span>

        <span>Full review feature</span>
        <h3>{title}</h3>
        <p>
          {paymentsEnabled
            ? description
            : 'This feature requires full review access. New paid review-credit purchases are temporarily unavailable; existing full-review access remains unchanged.'}
        </p>

        {paymentsEnabled && (
          <button type="button" onClick={onUpgrade}>
            <CreditCard aria-hidden="true" />
            View review-credit pricing
          </button>
        )}
      </div>
    </section>
  );
}

function ReviewDataLoading() {
  return (
    <div className="review-data-state" role="status">
      <LoaderCircle className="stage-spinner" aria-hidden="true" />
      <div>
        <strong>Loading your detailed review</strong>
        <span>
          Preparing the saved findings, annotation link and progress targets.
        </span>
      </div>
    </div>
  );
}

type ReviewDataErrorProps = {
  message: string;
  onRetry: () => void;
};

function ReviewDataError({ message, onRetry }: ReviewDataErrorProps) {
  return (
    <div className="review-data-state review-data-state-error" role="alert">
      <AlertCircle aria-hidden="true" />

      <div>
        <strong>Your review is saved but could not be displayed</strong>
        <span>{message}</span>

        <button className="retry-button" type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Load review again
        </button>
      </div>
    </div>
  );
}

type DetailedReviewTabProps = {
  data: DetailedReviewData;
  isFreePreview: boolean;
  paymentsEnabled: boolean;
  onUpgrade: () => void;
};

function DetailedReviewTab({
  data,
  isFreePreview,
  paymentsEnabled,
  onUpgrade,
}: DetailedReviewTabProps) {
  const criterionSections = useMemo(
    () => buildCriterionSections(data.criteria, data.findings),
    [data.criteria, data.findings]
  );

  return (
    <section
      className="detailed-review-panel"
      id="detailed-review-panel"
      role="tabpanel"
    >
      <div className="review-panel-heading">
        <div>
          <span className="review-panel-eyebrow">
            Specific criterion guidance
          </span>
          <h2>What the draft demonstrates and what must change</h2>
          <p>
            Every finding is linked to the submitted IA and includes a precise
            action, required elements, an observable completion check and an
            explanation of why the change matters.
          </p>
        </div>

        <span className="finding-count-badge">
          {data.findings.length}{' '}
          {isFreePreview ? 'preview findings' : 'findings'}
        </span>
      </div>

      <nav className="criterion-jump-list" aria-label="Jump to criterion">
        {criterionSections.map((section, index) => (
          <a key={section.code} href={`#criterion-${section.code}`}>
            <span>{index + 1}</span>
            {section.name}
          </a>
        ))}
      </nav>

      <div className="criterion-review-list">
        {criterionSections.map((section, index) => (
          <CriterionReviewSection
            key={section.code}
            section={section}
            number={index + 1}
          />
        ))}
      </div>

      {isFreePreview && (
        <LockedReviewSection
          title="Unlock the remaining detailed-review criteria"
          description="A full review reveals Data Analysis, Conclusion and Evaluation guidance, every finding, specific action, reflective question and completion check."
          paymentsEnabled={paymentsEnabled}
          onUpgrade={onUpgrade}
        />
      )}
    </section>
  );
}

type CriterionSection = {
  code: string;
  name: string;
  coaching: CriterionCoaching | null;
  findings: DetailedFinding[];
};

type CriterionReviewSectionProps = {
  section: CriterionSection;
  number: number;
};

function CriterionReviewSection({
  section,
  number,
}: CriterionReviewSectionProps) {
  const scoreRange = section.coaching?.indicative_mark_range;
  const maximumMark = section.coaching?.criterion_max_marks;

  return (
    <article
      className={`criterion-review criterion-${getCriterionClass(
        section.code
      )}`}
      id={`criterion-${section.code}`}
    >
      <header className="criterion-review-header">
        <div className="criterion-title-group">
          <span className="criterion-number">{number}</span>

          <div>
            <span className="criterion-label">SEHS criterion</span>
            <h2>{section.name}</h2>
          </div>
        </div>

        <div className="criterion-score-group">
          <span>Indicative range</span>
          <strong>
            {scoreRange ? `${scoreRange[0]}–${scoreRange[1]}` : 'Review ready'}
            {maximumMark ? ` / ${maximumMark}` : ''}
          </strong>
          {section.coaching?.confidence && (
            <small>{capitalize(section.coaching.confidence)} confidence</small>
          )}
        </div>
      </header>

      {section.coaching?.why_this_range && (
        <div className="criterion-range-rationale">
          <SearchCheck aria-hidden="true" />
          <div>
            <strong>Why this range</strong>
            <p>{section.coaching.why_this_range}</p>
          </div>
        </div>
      )}

      <div className="criterion-findings">
        {section.findings.length > 0 ? (
          section.findings.map((finding, index) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              number={index + 1}
            />
          ))
        ) : (
          <div className="empty-review-message">
            No separate detailed findings were saved for this criterion.
          </div>
        )}
      </div>

      <div className="criterion-coaching-grid">
        <ReflectiveQuestions
          questions={section.coaching?.reflective_questions ?? []}
        />
        <CriterionChecklist
          items={section.coaching?.improvement_checklist ?? []}
        />
      </div>
    </article>
  );
}

type FindingCardProps = {
  finding: DetailedFinding;
  number: number;
};

function FindingCard({ finding, number }: FindingCardProps) {
  const location = formatFindingLocation(finding);
  const isStrength = finding.finding_type === 'strength';

  return (
    <article className={`finding-card finding-${finding.priority}`}>
      <div className="finding-card-header">
        <div className="finding-card-title">
          <span className="finding-number">{number}</span>

          <div>
            <span className="finding-type-label">
              {getFindingTypeLabel(finding.finding_type)}
            </span>
            <h3>{finding.issue}</h3>
          </div>
        </div>

        <span className={`priority-pill priority-${finding.priority}`}>
          {capitalize(finding.priority)} priority
        </span>
      </div>

      <div className="finding-location">
        <MapPin aria-hidden="true" />
        <span>{location}</span>
      </div>

      {finding.evidence_excerpt && (
        <blockquote className="finding-evidence">
          <Quote aria-hidden="true" />
          <div>
            <strong>Evidence from the submitted IA</strong>
            <p>{finding.evidence_excerpt}</p>
          </div>
        </blockquote>
      )}

      <div className="finding-detail-grid">
        <div className="finding-detail-block">
          <span>Rubric requirement</span>
          <p>{finding.rubric_requirement}</p>
        </div>

        <div className="finding-detail-block finding-action-block">
          <span>
            {isStrength ? 'How to retain this strength' : 'Specific action'}
          </span>
          <p>{finding.specific_action}</p>

          {finding.required_elements.length > 0 && (
            <ul>
              {finding.required_elements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="finding-detail-block finding-check-block">
          <span>Completion check</span>
          <p>{finding.completion_check}</p>
        </div>

        <div className="finding-detail-block finding-why-block">
          <span>Why this matters</span>
          <p>{finding.why}</p>
        </div>
      </div>
    </article>
  );
}

type ReflectiveQuestionsProps = {
  questions: CoachingQuestion[];
};

function ReflectiveQuestions({ questions }: ReflectiveQuestionsProps) {
  return (
    <section className="criterion-coaching-card">
      <div className="criterion-coaching-heading">
        <Sparkles aria-hidden="true" />
        <div>
          <h3>Reflective questions</h3>
          <p>Answer these before revising the criterion.</p>
        </div>
      </div>

      {questions.length > 0 ? (
        <ol className="reflective-question-list">
          {questions.map((question, index) => (
            <li key={question.id ?? `${question.question}-${index}`}>
              <strong>{question.question}</strong>
              {question.why?.explanation && (
                <span>{question.why.explanation}</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-coaching-copy">
          No separate reflective questions were saved.
        </p>
      )}
    </section>
  );
}

type CriterionChecklistProps = {
  items: CoachingChecklistItem[];
};

function CriterionChecklist({ items }: CriterionChecklistProps) {
  return (
    <section className="criterion-coaching-card">
      <div className="criterion-coaching-heading">
        <ListChecks aria-hidden="true" />
        <div>
          <h3>Criterion checklist</h3>
          <p>Use the completion evidence to check your revision.</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="criterion-checklist">
          {items.map((item, index) => (
            <div
              className="criterion-checklist-item"
              key={item.id ?? `${item.action}-${index}`}
            >
              <span
                className={`priority-dot priority-${item.priority ?? 'medium'}`}
              />
              <div>
                <strong>{item.action}</strong>
                {item.completion_check && <span>{item.completion_check}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-coaching-copy">
          No separate checklist items were saved.
        </p>
      )}
    </section>
  );
}

type AnnotatedIaTabProps = {
  canOpen: boolean;
  isOpening: boolean;
  openError: string;
  expiresAt: string | null;
  onOpen: () => void;
  onRefresh: () => void;
  canDownloadWord: boolean;
  sourceIsDocx: boolean;
  isDownloadingWord: boolean;
  wordDownloadError: string;
  wordDownloadSuccess: string;
  onDownloadWord: () => void;
  isFreePreview: boolean;
  paymentsEnabled: boolean;
  onUpgrade: () => void;
};

function AnnotatedIaTab({
  canOpen,
  isOpening,
  openError,
  expiresAt,
  onOpen,
  onRefresh,
  canDownloadWord,
  sourceIsDocx,
  isDownloadingWord,
  wordDownloadError,
  wordDownloadSuccess,
  onDownloadWord,
  isFreePreview,
  paymentsEnabled,
  onUpgrade,
}: AnnotatedIaTabProps) {
  return (
    <section
      className="annotated-review-panel"
      id="annotated-review-panel"
      role="tabpanel"
    >
      <div className="annotated-hero-card">
        <span className="annotated-hero-icon">
          <Eye aria-hidden="true" />
        </span>

        <div>
          <span className="review-panel-eyebrow">
            Your submitted IA, annotated
          </span>

          <h2>
            {isFreePreview
              ? 'Open the annotated IA preview'
              : 'Open the highlighted document'}
          </h2>

          <p>
            {isFreePreview
              ? 'The free preview includes the complete overview and the first 20 lines of the annotated IA. The remaining document and connected comments stay locked.'
              : 'The annotated view follows the order of your draft. Highlighted passages and numbered markers connect directly to the relevant criterion finding, specific action and completion check.'}
          </p>
        </div>

        <div className="annotated-action-group">
          {canOpen ? (
            <button
              className="annotated-open-button"
              type="button"
              onClick={onOpen}
              disabled={isOpening}
            >
              {isOpening ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <ExternalLink aria-hidden="true" />
              )}

              {isOpening
                ? 'Opening annotated IA…'
                : isFreePreview
                ? 'Open 20-line preview'
                : 'Open annotated IA'}
            </button>
          ) : (
            <button
              className="annotated-open-button"
              type="button"
              onClick={onRefresh}
            >
              <RefreshCw aria-hidden="true" />
              Refresh secure artifact
            </button>
          )}

          {canDownloadWord && (
            <button
              className="annotated-download-button"
              type="button"
              onClick={onDownloadWord}
              disabled={isDownloadingWord}
            >
              {isDownloadingWord ? (
                <LoaderCircle className="stage-spinner" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}

              {isDownloadingWord
                ? 'Preparing Word copy…'
                : 'Download annotated Word copy'}
            </button>
          )}

          {!isFreePreview && !sourceIsDocx && (
            <div className="annotated-word-unavailable" role="note">
              <FileText aria-hidden="true" />
              <div>
                <strong>Microsoft Word comments unavailable for this report</strong>
                <span>
                  This review was created from a PDF. Upload the next draft as a DOCX to receive a downloadable Word copy with genuine comments attached to the relevant text.
                </span>
              </div>
            </div>
          )}

          {isFreePreview && paymentsEnabled && (
            <button
              className="annotated-download-button annotated-download-locked"
              type="button"
              onClick={onUpgrade}
            >
              <LockKeyhole aria-hidden="true" />
              Unlock annotated IA download
            </button>
          )}
        </div>
      </div>

      {openError && (
        <div className="annotated-open-error" role="alert">
          <AlertCircle aria-hidden="true" />

          <div>
            <strong>The annotated IA could not be opened</strong>
            <span>{openError}</span>
          </div>
        </div>
      )}

      {wordDownloadError && (
        <div className="annotated-open-error" role="alert">
          <AlertCircle aria-hidden="true" />

          <div>
            <strong>The annotated Word copy could not be downloaded</strong>
            <span>{wordDownloadError}</span>
          </div>
        </div>
      )}

      {wordDownloadSuccess && (
        <div className="annotated-download-success" role="status">
          <CheckCircle2 aria-hidden="true" />

          <div>
            <strong>Annotated Word copy ready</strong>
            <span>{wordDownloadSuccess}</span>
          </div>
        </div>
      )}

      <div className="annotated-feature-grid">
        <div className="annotated-feature-card">
          <SearchCheck aria-hidden="true" />
          <strong>
            {isFreePreview ? 'Overview included' : 'Exact evidence'}
          </strong>
          <span>
            {isFreePreview
              ? 'See the full review overview before the document preview begins.'
              : 'Highlights are calculated from saved sentence and paragraph locations.'}
          </span>
        </div>

        <div className="annotated-feature-card">
          <ListChecks aria-hidden="true" />
          <strong>
            {isFreePreview ? 'First 20 lines' : 'Numbered comments'}
          </strong>
          <span>
            {isFreePreview
              ? 'The opening 20 document blocks are shown so you can understand the annotated-review experience.'
              : 'Select a marker to move directly to its detailed criterion comment.'}
          </span>
        </div>

        <div
          className={`annotated-feature-card ${
            isFreePreview ? 'annotated-feature-locked' : ''
          }`}
        >
          {isFreePreview ? (
            <LockKeyhole aria-hidden="true" />
          ) : (
            <Download aria-hidden="true" />
          )}
          <strong>Word comment copy</strong>
          <span>
            {isFreePreview
              ? 'Locked in the free review.'
              : 'DOCX submissions can be downloaded with genuine Microsoft Word comments attached to the relevant text.'}
          </span>
        </div>

        <div
          className={`annotated-feature-card ${
            isFreePreview ? 'annotated-feature-locked' : ''
          }`}
        >
          {isFreePreview ? (
            <LockKeyhole aria-hidden="true" />
          ) : (
            <Printer aria-hidden="true" />
          )}
          <strong>Complete printable view</strong>
          <span>
            {isFreePreview
              ? 'Locked in the free review.'
              : 'Use the browser print command in the annotated view to save a PDF copy.'}
          </span>
        </div>
      </div>

      {isFreePreview && (
        <LockedReviewSection
          title="Unlock the complete annotated IA"
          description="A full review reveals every highlighted passage, numbered marker and connected review comment, with available Word and print options."
          paymentsEnabled={paymentsEnabled}
          onUpgrade={onUpgrade}
        />
      )}

      <div className="annotated-privacy-note">
        <ShieldCheck aria-hidden="true" />

        <div>
          <strong>
            {isFreePreview
              ? 'Temporary private preview'
              : 'Private annotated artifact'}
          </strong>

          <p>
            {isFreePreview
              ? 'The limited annotated preview is available only through your signed-in private session.'
              : 'The annotated file is available only through your signed-in private session.'}
            {expiresAt
              ? ` It is currently scheduled to expire on ${formatReviewDateTime(
                  expiresAt
                )}.`
              : ' Refresh the secure artifact if it is no longer available.'}
          </p>
        </div>
      </div>
    </section>
  );
}

type ProgressPlanTabProps = {
  plan: ProgressPlanView;
  isLocked: boolean;
  paymentsEnabled: boolean;
  onUpgrade: () => void;
};

function ProgressPlanTab({
  plan,
  isLocked,
  paymentsEnabled,
  onUpgrade,
}: ProgressPlanTabProps) {
  if (isLocked) {
    return (
      <section
        className="progress-plan-panel"
        id="progress-plan-panel"
        role="tabpanel"
      >
        <LockedReviewSection
          title="Your progress plan is locked"
          description="Purchase a full review credit to unlock the prioritised revision sequence, success evidence, suggested check-in date and criterion-by-criterion next steps."
          paymentsEnabled={paymentsEnabled}
          onUpgrade={onUpgrade}
        />
      </section>
    );
  }

  return (
    <section
      className="progress-plan-panel"
      id="progress-plan-panel"
      role="tabpanel"
    >
      <div className="review-panel-heading progress-plan-heading">
        <div>
          <span className="review-panel-eyebrow">
            Prioritised revision sequence
          </span>
          <h2>Your progress plan</h2>
          <p>
            Complete high-priority targets first. Do not move on until the
            success evidence can be seen in your revised IA.
          </p>
        </div>

        {plan.nextCheckinDate && (
          <div className="plan-checkin-card">
            <Clock3 aria-hidden="true" />
            <span>Suggested check-in</span>
            <strong>{formatReviewDate(plan.nextCheckinDate)}</strong>
          </div>
        )}
      </div>

      {plan.summary && (
        <div className="completion-plan-summary progress-plan-summary">
          <Target aria-hidden="true" />
          <div>
            <strong>Plan overview</strong>
            <p>{plan.summary}</p>
          </div>
        </div>
      )}

      <div className="progress-target-list">
        {plan.targets.length > 0 ? (
          plan.targets.map((target, index) => (
            <article
              className={`progress-target priority-border-${target.priority}`}
              key={target.id}
            >
              <div className="progress-target-number">{index + 1}</div>

              <div className="progress-target-content">
                <div className="progress-target-meta">
                  <span>{target.criterion}</span>
                  <span className={`priority-pill priority-${target.priority}`}>
                    {capitalize(target.priority)} priority
                  </span>
                </div>

                <h3>{target.action}</h3>

                {target.successEvidence && (
                  <div className="progress-success-evidence">
                    <CheckCircle2 aria-hidden="true" />
                    <div>
                      <strong>Success evidence</strong>
                      <span>{target.successEvidence}</span>
                    </div>
                  </div>
                )}

                {target.why && (
                  <details className="progress-target-why">
                    <summary>
                      <ChevronDown aria-hidden="true" />
                      Why this target matters
                    </summary>
                    <p>{target.why}</p>
                  </details>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="empty-review-message">
            The plan summary is available, but no separate targets were saved.
          </div>
        )}
      </div>
    </section>
  );
}

async function readEdgeFunctionErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  const record =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : null;

  const context = record?.context;

  if (context instanceof Response) {
    try {
      const payload = (await context.clone().json()) as Record<string, unknown>;

      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
    } catch {
      try {
        const text = await context.clone().text();

        if (text.trim()) {
          return text.trim();
        }
      } catch {
        // Use the normal fallback below.
      }
    }
  }

  if (typeof record?.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  return fallback;
}

async function downloadFileFromSignedUrl(
  signedUrl: string,
  filename: string
): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      responseText || `The secure Word copy returned ${response.status}.`
    );
  }

  const blob = await response.blob();

  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');

  anchor.href = objectUrl;

  anchor.download = filename;

  anchor.style.display = 'none';

  document.body.appendChild(anchor);

  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

function buildAnnotatedDocxFilename(originalFilename: string): string {
  const base = originalFilename.replace(/\.docx$/iu, '').trim() || 'IA';

  return `${base}-Annotated.docx`;
}

async function ensureFreshReviewSession(): Promise<void> {
  if (reviewSessionRefreshPromise) {
    return reviewSessionRefreshPromise;
  }

  reviewSessionRefreshPromise = (async () => {
    const { data: currentSessionData, error: currentSessionError } =
      await supabase.auth.getSession();

    if (currentSessionError) {
      throw currentSessionError;
    }

    if (!currentSessionData.session) {
      await ensureAnonymousSession();

      const { data: restoredSessionData, error: restoredSessionError } =
        await supabase.auth.getSession();

      if (restoredSessionError || !restoredSessionData.session) {
        throw new Error(
          'Your private review session could not be restored. Keep this page open and try again.'
        );
      }

      return;
    }

    const { data: refreshedSessionData, error: refreshError } =
      await supabase.auth.refreshSession(currentSessionData.session);

    if (refreshError || !refreshedSessionData.session) {
      throw new Error(
        'Your private review session has expired and could not be refreshed. Keep this page open and try again.'
      );
    }
  })();

  try {
    await reviewSessionRefreshPromise;
  } finally {
    reviewSessionRefreshPromise = null;
  }
}

function isExpiredJwtError(error: unknown): boolean {
  const record =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : null;

  const parts = [
    typeof error === 'string' ? error : '',
    typeof record?.message === 'string' ? record.message : '',
    typeof record?.error === 'string' ? record.error : '',
  ];

  try {
    parts.push(JSON.stringify(error));
  } catch {
    // Some browser error objects cannot be serialised.
  }

  return /invalidjwt|jwt[^\n]*expired|exp[^\n]*timestamp|timestamp check failed/iu.test(
    parts.join(' ')
  );
}

type PreparedAnnotatedIaResponse = {
  submission_id?: string;
  artifact_id?: string | null;
  status?: string;
  signed_url?: string | null;
  artifact_version?: string;
  cached?: boolean;
};

async function prepareCurrentAnnotatedIaArtifact(
  submissionId: string
): Promise<PreparedAnnotatedIaResponse> {
  await ensureFreshReviewSession();

  let result = await supabase.functions.invoke<PreparedAnnotatedIaResponse>(
    'generate-annotated-ia',
    {
      body: {
        submission_id: submissionId,
        force: false,
      },
    }
  );

  if (result.error && isExpiredJwtError(result.error)) {
    await ensureFreshReviewSession();

    result = await supabase.functions.invoke<PreparedAnnotatedIaResponse>(
      'generate-annotated-ia',
      {
        body: {
          submission_id: submissionId,
          force: false,
        },
      }
    );
  }

  if (result.error) {
    throw new Error(
      await readEdgeFunctionErrorMessage(
        result.error,
        'The annotated IA could not be opened.'
      )
    );
  }

  const data = result.data;

  if (!data || data.status !== 'ready') {
    throw new Error(
      'The annotated IA could not be prepared. Please try again.'
    );
  }

  return data;
}

function openPreparingAnnotatedIaWindow(): Window {
  const previewWindow = window.open('', '_blank');

  if (!previewWindow) {
    throw new Error(
      'The browser blocked the annotated IA window. Allow pop-ups for this site and try again.'
    );
  }

  previewWindow.opener = null;
  previewWindow.document.open();
  previewWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Preparing annotated IA</title>
      </head>

      <body style="margin:0">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f7fb;color:#172033;font-family:Inter,Arial,sans-serif;text-align:center">
          <div>
            <div style="width:54px;height:54px;margin:0 auto 16px;display:grid;place-items:center;border-radius:16px;color:#fff;background:linear-gradient(145deg,#315fe8,#244bc0);font-size:25px">⌁</div>

            <h1 style="margin:0 0 10px;font-size:24px">
              Preparing your annotated IA
            </h1>

            <p style="margin:0;color:#61708a">
              Preparing the latest review and document.
            </p>
          </div>
        </main>
      </body>
    </html>`);
  previewWindow.document.close();

  return previewWindow;
}

function writeAnnotatedIaWindowError(previewWindow: Window): void {
  previewWindow.document.open();
  previewWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Annotated IA unavailable</title>
      </head>

      <body style="margin:0">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff5f4;color:#8a1c14;font-family:Inter,Arial,sans-serif;text-align:center">
          <div>
            <h1 style="margin:0 0 10px;font-size:24px">
              The annotated IA could not be opened
            </h1>

            <p style="margin:0;color:#9f3a32">
              Return to the review and select Open annotated IA again.
            </p>
          </div>
        </main>
      </body>
    </html>`);
  previewWindow.document.close();
}

async function fetchAnnotatedHtml(signedUrl: string): Promise<string> {
  const response = await fetch(signedUrl, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'text/html, text/plain;q=0.9, */*;q=0.8',
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      responseText ||
        `The secure annotated artifact returned ${response.status}.`
    );
  }

  return response.text();
}

type OpenAnnotatedIaOptions = {
  bucket: string | null;
  path: string | null;
  signedUrl: string | null;
  previewWindow?: Window | null;
};

async function openAnnotatedIaDocument({
  bucket,
  path,
  signedUrl,
  previewWindow: suppliedWindow = null,
}: OpenAnnotatedIaOptions): Promise<void> {
  const previewWindow = suppliedWindow ?? window.open('', '_blank');

  if (!previewWindow) {
    throw new Error(
      'The browser blocked the annotated IA window. Allow pop-ups for this site and try again.'
    );
  }

  previewWindow.opener = null;

  previewWindow.document.open();

  previewWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Preparing annotated IA</title>
      </head>

      <body style="margin:0">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f7fb;color:#172033;font-family:Inter,Arial,sans-serif;text-align:center">
          <div>
            <h1 style="margin:0 0 10px;font-size:24px">
              Preparing your annotated IA
            </h1>

            <p style="margin:0;color:#61708a">
              Refreshing the private session and preparing the document.
            </p>
          </div>
        </main>
      </body>
    </html>`);

  previewWindow.document.close();

  try {
    await ensureFreshReviewSession();

    let html = '';
    let lastError: unknown = null;

    if (bucket && path) {
      let downloadResult = await supabase.storage.from(bucket).download(path);

      if (downloadResult.error && isExpiredJwtError(downloadResult.error)) {
        await ensureFreshReviewSession();

        downloadResult = await supabase.storage.from(bucket).download(path);
      }

      lastError = downloadResult.error;

      if (!downloadResult.error && downloadResult.data) {
        html = await downloadResult.data.text();
      }

      if (!html) {
        let signedUrlResult = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 30 * 60);

        if (signedUrlResult.error && isExpiredJwtError(signedUrlResult.error)) {
          await ensureFreshReviewSession();

          signedUrlResult = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 30 * 60);
        }

        if (!signedUrlResult.error && signedUrlResult.data?.signedUrl) {
          html = await fetchAnnotatedHtml(signedUrlResult.data.signedUrl);
        } else if (signedUrlResult.error) {
          lastError = signedUrlResult.error;
        }
      }
    }

    /*
      The completion-time URL is only a final fallback because its embedded
      expiry may already have passed.
    */
    if (!html && signedUrl) {
      html = await fetchAnnotatedHtml(signedUrl);
    }

    if (!html && lastError) {
      throw lastError;
    }

    const normalizedHtml = html.replace(/^\uFEFF/u, '').trimStart();

    if (
      !normalizedHtml ||
      !/^<!doctype\s+html|^<html(?:\s|>)/iu.test(normalizedHtml)
    ) {
      throw new Error(
        'The annotated artifact did not contain a valid HTML document.'
      );
    }

    /*
      Render the downloaded private HTML locally. The browser never navigates
      to the Supabase object URL, so text/plain Storage responses are not shown
      as source code.
    */
    previewWindow.document.open('text/html', 'replace');

    previewWindow.document.write(normalizedHtml);

    previewWindow.document.close();
    previewWindow.focus();
  } catch (error) {
    previewWindow.document.open();

    previewWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>Annotated IA unavailable</title>
        </head>

        <body style="margin:0">
          <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff5f4;color:#8a1c14;font-family:Inter,Arial,sans-serif;text-align:center">
            <div>
              <h1 style="margin:0 0 10px;font-size:24px">
                The annotated IA could not be opened
              </h1>

              <p style="margin:0;color:#9f3a32">
                Return to the review page and select Open annotated IA again.
                The app will request a fresh private session.
              </p>
            </div>
          </main>
        </body>
      </html>`);

    previewWindow.document.close();

    throw error;
  }
}

type AnnotatedPreviewResponse = {
  submission_id?: string;
  preview?: boolean;
  preview_block_count?: number;
  html?: string;
};

async function openFreeAnnotatedIaPreview(submissionId: string): Promise<void> {
  const previewWindow = window.open('', '_blank', 'noopener,noreferrer');

  if (!previewWindow) {
    throw new Error(
      'The annotated IA window was blocked. Allow pop-ups for this page and try again.'
    );
  }

  previewWindow.opener = null;

  previewWindow.document.open();
  previewWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>Preparing annotated IA preview</title>
      </head>

      <body style="margin:0">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f4f7fb;color:#172033;font-family:Inter,Arial,sans-serif;text-align:center">
          <div>
            <h1 style="margin:0 0 10px;font-size:24px">
              Preparing your annotated IA preview
            </h1>

            <p style="margin:0;color:#61708a">
              Loading the overview and opening 20 lines.
            </p>
          </div>
        </main>
      </body>
    </html>`);
  previewWindow.document.close();

  try {
    await ensureFreshReviewSession();

    let result = await supabase.functions.invoke<AnnotatedPreviewResponse>(
      'get-annotated-ia-preview',
      {
        body: {
          submission_id: submissionId,
        },
      }
    );

    if (result.error && isExpiredJwtError(result.error)) {
      await ensureFreshReviewSession();

      result = await supabase.functions.invoke<AnnotatedPreviewResponse>(
        'get-annotated-ia-preview',
        {
          body: {
            submission_id: submissionId,
          },
        }
      );
    }

    if (result.error) {
      throw new Error(
        await readEdgeFunctionErrorMessage(
          result.error,
          'The annotated IA preview could not be prepared.'
        )
      );
    }

    const html = typeof result.data?.html === 'string' ? result.data.html : '';

    const normalizedHtml = html.replace(/^\uFEFF/u, '').trimStart();

    if (
      !normalizedHtml ||
      !/^<!doctype\s+html|^<html(?:\s|>)/iu.test(normalizedHtml)
    ) {
      throw new Error(
        'The annotated IA preview did not contain a valid document.'
      );
    }

    previewWindow.document.open('text/html', 'replace');

    previewWindow.document.write(normalizedHtml);

    previewWindow.document.close();
    previewWindow.focus();
  } catch (error) {
    previewWindow.document.open();
    previewWindow.document.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />
          <title>Annotated IA preview unavailable</title>
        </head>

        <body style="margin:0">
          <main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff5f4;color:#8a1c14;font-family:Inter,Arial,sans-serif;text-align:center">
            <div>
              <h1 style="margin:0 0 10px;font-size:24px">
                The annotated IA preview could not be opened
              </h1>

              <p style="margin:0;color:#9f3a32">
                Return to the review page and try again.
              </p>
            </div>
          </main>
        </body>
      </html>`);
    previewWindow.document.close();

    throw error;
  }
}

async function loadSavedReportVersion(
  submissionId: string
): Promise<SavedReportLoadResult> {
  await ensureFreshReviewSession();

  const [historyResult, submissionResult, progressPlanResult, artifactResult] =
    await Promise.all([
      supabase.rpc('get_my_ia_report_history'),

      supabase
        .from('ia_submissions')
        .select(
          [
            'id',
            'student_id',
            'subject',
            'draft_version',
            'original_filename',
            'mime_type',
            'file_size_bytes',
            'raw_file_bucket',
            'raw_file_path',
            'raw_file_expires_at',
            'status',
            'uploaded_at',
            'commercial_access',
            'credit_reservation_id',
            'access_expires_at',
            'retention_policy',
            'saved_at',
            'completed_at',
          ].join(',')
        )
        .eq('id', submissionId)
        .maybeSingle(),

      supabase
        .from('progress_plans')
        .select('next_checkin_date')
        .eq('current_submission_id', submissionId)
        .maybeSingle(),

      supabase
        .from('ia_review_artifacts')
        .select('id, expires_at')
        .eq('submission_id', submissionId)
        .eq('artifact_type', 'annotated_html')
        .eq('status', 'ready')
        .is('deleted_at', null)
        .maybeSingle(),
    ]);

  if (historyResult.error) {
    throw historyResult.error;
  }

  if (submissionResult.error) {
    throw submissionResult.error;
  }

  const historyRow = Array.isArray(historyResult.data)
    ? historyResult.data.find((row) => row?.submission_id === submissionId)
    : null;

  if (!historyRow || !submissionResult.data) {
    throw new Error('The selected saved report was not found.');
  }

  const history = normalizeReportHistoryRow(historyRow);

  if (!history) {
    throw new Error(
      'The selected saved report contains incomplete history information.'
    );
  }

  const submission = normalizeSavedSubmission(submissionResult.data);

  const markSummary = deriveReportMarkSummary(history.criterion_scores);

  const artifact = artifactResult.data;

  const completion: PipelineCompletion = {
    submissionId: submission.id,
    overallMarkRange: markSummary?.range ?? null,
    maximumMark: markSummary?.maximum ?? null,
    planSummary: null,
    nextCheckinDate:
      typeof progressPlanResult.data?.next_checkin_date === 'string'
        ? progressPlanResult.data.next_checkin_date
        : null,
    annotatedIaUrl: null,
    annotatedArtifactId: typeof artifact?.id === 'string' ? artifact.id : null,
    annotatedArtifactExpiresAt:
      typeof artifact?.expires_at === 'string' ? artifact.expires_at : null,
    reportSaved: true,
    creditConsumed: true,
    commercialAccess: submission.commercial_access ?? null,
    finalizedAt: submission.completed_at ?? history.saved_at,
    completedAt:
      history.report_generated_at ?? history.saved_at ?? history.uploaded_at,
  };

  return {
    submission,
    completion,
  };
}

function normalizeSavedSubmission(value: unknown): IaSubmission {
  if (!isRecord(value)) {
    throw new Error('The saved submission details could not be read.');
  }

  const mimeType =
    value.mime_type === DOCX_MIME_TYPE
      ? DOCX_MIME_TYPE
      : value.mime_type === PDF_MIME_TYPE
      ? PDF_MIME_TYPE
      : null;

  if (!mimeType) {
    throw new Error('The saved report uses an unsupported document type.');
  }

  const id = asText(value.id);
  const studentId = asText(value.student_id);
  const subject = asText(value.subject);
  const originalFilename = asText(value.original_filename);
  const rawFileBucket = asText(value.raw_file_bucket);
  const rawFilePath = asText(value.raw_file_path);
  const rawFileExpiresAt = asText(value.raw_file_expires_at);
  const status = asText(value.status);
  const uploadedAt = asText(value.uploaded_at);
  const draftVersion = asNumber(value.draft_version);
  const fileSizeBytes = asNumber(value.file_size_bytes);

  if (
    !id ||
    !studentId ||
    !subject ||
    !originalFilename ||
    !rawFileBucket ||
    !rawFilePath ||
    !rawFileExpiresAt ||
    !status ||
    !uploadedAt ||
    draftVersion === null ||
    fileSizeBytes === null
  ) {
    throw new Error('The saved submission details are incomplete.');
  }

  return {
    id,
    student_id: studentId,
    subject,
    draft_version: draftVersion,
    original_filename: originalFilename,
    mime_type: mimeType,
    file_size_bytes: fileSizeBytes,
    raw_file_bucket: rawFileBucket,
    raw_file_path: rawFilePath,
    raw_file_expires_at: rawFileExpiresAt,
    status,
    uploaded_at: uploadedAt,
    commercial_access: normalizeCommercialAccess(value.commercial_access),
    credit_reservation_id: asText(value.credit_reservation_id),
    access_expires_at: asText(value.access_expires_at),
    retention_policy: asText(value.retention_policy) ?? undefined,
    saved_at: asText(value.saved_at),
    completed_at: asText(value.completed_at),
  };
}

function normalizeReportHistoryRows(value: unknown): ReportHistoryRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeReportHistoryRow)
    .filter((row): row is ReportHistoryRow => row !== null);
}

function normalizeReportHistoryRow(value: unknown): ReportHistoryRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const submissionId = asText(value.submission_id);
  const studentId = asText(value.student_id);
  const projectId = asText(value.project_id);
  const projectTitle = asText(value.project_title);
  const subject = asText(value.subject);
  const originalFilename = asText(value.original_filename);
  const mimeType = asText(value.mime_type);
  const status = asText(value.status);
  const uploadedAt = asText(value.uploaded_at);
  const retentionPolicy = asText(value.retention_policy);
  const versionNumber = asNumber(value.version_number);
  const fileSizeBytes = asNumber(value.file_size_bytes);

  if (
    !submissionId ||
    !studentId ||
    !projectId ||
    !projectTitle ||
    !subject ||
    !originalFilename ||
    !mimeType ||
    !status ||
    !uploadedAt ||
    !retentionPolicy ||
    versionNumber === null ||
    fileSizeBytes === null
  ) {
    return null;
  }

  return {
    submission_id: submissionId,
    student_id: studentId,
    project_id: projectId,
    project_title: projectTitle,
    research_question: asText(value.research_question),
    subject,
    version_number: versionNumber,
    original_filename: originalFilename,
    mime_type: mimeType,
    file_size_bytes: fileSizeBytes,
    status,
    uploaded_at: uploadedAt,
    report_generated_at: asText(value.report_generated_at),
    saved_at: asText(value.saved_at),
    retention_policy: retentionPolicy,
    word_count: asNumber(value.word_count),
    page_count: asNumber(value.page_count),
    criterion_scores: value.criterion_scores,
    progress_plan_ready: value.progress_plan_ready === true,
    annotated_html_ready: value.annotated_html_ready === true,
    annotated_docx_ready: value.annotated_docx_ready === true,
    is_latest_version: value.is_latest_version === true,
  };
}

function deriveReportMarkSummary(criterionScores: unknown): {
  range: [number, number];
  maximum: number;
} | null {
  if (!Array.isArray(criterionScores)) {
    return null;
  }

  let minimum = 0;
  let maximum = 0;
  let totalMaximum = 0;
  let found = 0;

  for (const rawScore of criterionScores) {
    if (!isRecord(rawScore)) {
      continue;
    }

    const rawRange = rawScore.indicative_mark_range;

    if (!Array.isArray(rawRange) || rawRange.length < 2) {
      continue;
    }

    const rangeMinimum = asNumber(rawRange[0]);
    const rangeMaximum = asNumber(rawRange[1]);
    const criterionMaximum = asNumber(rawScore.criterion_max_marks);

    if (rangeMinimum === null || rangeMaximum === null) {
      continue;
    }

    minimum += rangeMinimum;
    maximum += rangeMaximum;
    totalMaximum += criterionMaximum ?? rangeMaximum;
    found += 1;
  }

  if (found === 0) {
    return null;
  }

  return {
    range: [minimum, maximum],
    maximum: totalMaximum,
  };
}

function getReportTimestamp(report: ReportHistoryRow): number {
  return (
    Date.parse(
      report.report_generated_at ?? report.saved_at ?? report.uploaded_at
    ) || 0
  );
}

function formatReportDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

async function loadDetailedReviewData(
  submissionId: string,
  completion: PipelineCompletion | null
): Promise<DetailedReviewData> {
  await ensureFreshReviewSession();

  const { data, error } = await supabase.rpc('get_my_ia_review_content', {
    p_submission_id: submissionId,
  });

  if (error) {
    throw error;
  }

  if (!isRecord(data)) {
    throw new Error('The saved detailed review could not be read.');
  }

  const accessMode =
    asText(data.access_mode) ?? completion?.commercialAccess ?? 'unassigned';

  const fullAccess = data.full_access === true;

  const expired = data.expired === true;

  const criteria = normalizeCriterionCoaching(data.criteria);

  const findings = normalizeDetailedFindings(data.findings);

  const progressPlan = normalizeProgressPlan(
    data.progress_plan,
    fullAccess ? completion : null,
    fullAccess ? criteria : []
  );

  let annotatedIaUrl = fullAccess ? completion?.annotatedIaUrl ?? null : null;

  let annotatedArtifactBucket: string | null = null;

  let annotatedArtifactPath: string | null = null;

  let annotatedArtifactExpiresAt: string | null = null;

  const artifact = isRecord(data.annotated_artifact)
    ? data.annotated_artifact
    : null;

  if (fullAccess && artifact && asText(artifact.status) === 'ready') {
    annotatedArtifactBucket = asText(artifact.storage_bucket);

    annotatedArtifactPath = asText(artifact.storage_path);

    annotatedArtifactExpiresAt =
      asText(artifact.expires_at) ??
      completion?.annotatedArtifactExpiresAt ??
      null;

    if (annotatedArtifactBucket && annotatedArtifactPath) {
      const signedUrlResult = await supabase.storage
        .from(annotatedArtifactBucket)
        .createSignedUrl(annotatedArtifactPath, 30 * 60);

      if (!signedUrlResult.error && signedUrlResult.data?.signedUrl) {
        annotatedIaUrl = signedUrlResult.data.signedUrl;
      }
    }
  }

  return {
    findings,
    criteria,
    progressPlan,
    accessMode,
    fullAccess,
    expired,
    accessExpiresAt: asText(data.access_expires_at),
    previewCriterion: asText(data.preview_criterion),
    progressPlanLocked: data.progress_plan_locked === true,
    annotatedPreviewAvailable: data.annotated_preview_available === true,
    canDownload: data.can_download === true,
    canPrint: data.can_print === true,
    annotatedIaUrl,
    annotatedArtifactBucket,
    annotatedArtifactPath,
    annotatedArtifactExpiresAt,
  };
}

function normalizeDetailedFindings(value: unknown): DetailedFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item, index) => ({
      id: asText(item.id) ?? `finding-${index + 1}`,
      coaching_output_id: asText(item.coaching_output_id) ?? '',
      criterion_code: asText(item.criterion_code) ?? 'Other',
      finding_index: asNumber(item.finding_index) ?? index,
      finding_type: asText(item.finding_type) ?? 'missing_detail',
      priority: normalizePriority(item.priority),
      block_id: asText(item.block_id),
      section_title: asText(item.section_title),
      paragraph_index: asNumber(item.paragraph_index),
      page_number: asNumber(item.page_number),
      sentence_ids: asTextArray(item.sentence_ids),
      evidence_excerpt: asText(item.evidence_excerpt),
      rubric_requirement:
        asText(item.rubric_requirement) ??
        'Review the relevant rubric requirement.',
      issue: asText(item.issue) ?? 'A specific review finding was identified.',
      specific_action:
        asText(item.specific_action) ??
        'Review and address this finding independently.',
      required_elements: asTextArray(item.required_elements),
      completion_check:
        asText(item.completion_check) ??
        'Confirm that the required evidence is visible.',
      why:
        asText(item.why) ?? 'This affects the clarity of the rubric evidence.',
    }))
    .sort((left, right) => {
      const criterionDifference =
        getCriterionOrder(left.criterion_code) -
        getCriterionOrder(right.criterion_code);

      return criterionDifference !== 0
        ? criterionDifference
        : left.finding_index - right.finding_index;
    });
}

function normalizeCriterionCoaching(value: unknown): CriterionCoaching[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      criterion: asText(item.criterion) ?? 'Other',
      criterion_name:
        asText(item.criterion_name) ??
        getCriterionName(asText(item.criterion) ?? 'Other'),
      criterion_max_marks: asNumber(item.criterion_max_marks),
      indicative_band: asText(item.indicative_band),
      indicative_mark_range: asNumberRange(item.indicative_mark_range),
      confidence: asText(item.confidence),
      command_term_level: asText(item.command_term_level),
      why_this_range: asText(item.why_this_range),
      strengths: normalizeObjectArray<CoachingStrength>(item.strengths),
      reflective_questions: normalizeObjectArray<CoachingQuestion>(
        item.reflective_questions
      ),
      improvement_checklist: normalizeObjectArray<CoachingChecklistItem>(
        item.improvement_checklist
      ),
    }))
    .sort(
      (left, right) =>
        getCriterionOrder(left.criterion) - getCriterionOrder(right.criterion)
    );
}

function normalizeProgressPlan(
  value: unknown,
  completion: PipelineCompletion | null,
  criteria: CriterionCoaching[]
): ProgressPlanView {
  const row = isRecord(value) ? value : {};

  const rawTargets = firstArray(
    row.targets,
    row.progress_targets,
    row.criterion_targets,
    row.priorities,
    row.actions
  );

  let targets = rawTargets
    .filter(isRecord)
    .map((item, index) => normalizeProgressTarget(item, index))
    .filter((target): target is ProgressTarget => target !== null);

  if (targets.length === 0) {
    targets = criteria.flatMap((criterion) =>
      criterion.improvement_checklist.map((item, index) => ({
        id: item.id ?? `${criterion.criterion}-${index + 1}`,
        criterion: criterion.criterion_name,
        priority: normalizePriority(item.priority),
        action: item.action ?? 'Complete the saved criterion action.',
        successEvidence: item.completion_check ?? null,
        why: item.why?.explanation ?? null,
      }))
    );
  }

  targets.sort((left, right) => {
    const priorityDifference =
      getPriorityOrder(left.priority) - getPriorityOrder(right.priority);

    return priorityDifference !== 0
      ? priorityDifference
      : getCriterionOrder(left.criterion) - getCriterionOrder(right.criterion);
  });

  return {
    summary:
      firstText(
        row.plan_summary,
        row.summary,
        row.overview,
        row.plan_overview
      ) ??
      completion?.planSummary ??
      null,

    nextCheckinDate:
      firstText(
        row.next_checkin_date,
        row.check_in_date,
        row.suggested_checkin_date,
        row.review_date
      ) ??
      completion?.nextCheckinDate ??
      null,

    targets,
  };
}

function normalizeProgressTarget(
  item: Record<string, unknown>,
  index: number
): ProgressTarget | null {
  const action = firstText(
    item.action,
    item.target,
    item.next_step,
    item.improvement_action,
    item.goal,
    item.task
  );

  if (!action) {
    return null;
  }

  return {
    id: asText(item.id) ?? `target-${index + 1}`,
    criterion:
      firstText(
        item.criterion_name,
        item.criterion,
        item.area,
        item.category,
        item.focus
      ) ?? 'IA improvement',
    priority: normalizePriority(item.priority ?? item.impact ?? item.urgency),
    action,
    successEvidence: firstText(
      item.success_evidence,
      item.success_criteria,
      item.completion_check,
      item.evidence,
      item.check
    ),
    why: firstText(item.why, item.rationale, item.reason),
  };
}

function buildCriterionSections(
  criteria: CriterionCoaching[],
  findings: DetailedFinding[]
): CriterionSection[] {
  const criterionCodes = Array.from(
    new Set([
      ...criteria.map((criterion) => criterion.criterion),
      ...findings.map((finding) => finding.criterion_code),
    ])
  ).sort((left, right) => getCriterionOrder(left) - getCriterionOrder(right));

  return criterionCodes.map((code) => {
    const coaching =
      criteria.find((criterion) => criterion.criterion === code) ?? null;

    return {
      code,
      name: coaching?.criterion_name ?? getCriterionName(code),
      coaching,
      findings: findings.filter((finding) => finding.criterion_code === code),
    };
  });
}

function formatFindingLocation(finding: DetailedFinding): string {
  const parts: string[] = [];

  if (finding.section_title) {
    parts.push(finding.section_title);
  }

  if (finding.page_number) {
    parts.push(`Page ${finding.page_number}`);
  }

  if (finding.paragraph_index) {
    parts.push(`Paragraph ${finding.paragraph_index}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Structural requirement';
}

function getFindingTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    strength: 'Demonstrated strength',
    missing_detail: 'Missing detail',
    unclear: 'Unclear evidence',
    inaccurate: 'Accuracy concern',
    unsupported: 'Unsupported statement',
    incomplete_analysis: 'Incomplete analysis',
    structural_gap: 'Structural gap',
  };

  return labels[value] ?? 'Review finding';
}

function getCriterionName(code: string): string {
  const names: Record<string, string> = {
    ResearchDesign: 'Research Design',
    DataAnalysis: 'Data Analysis',
    Conclusion: 'Conclusion',
    Evaluation: 'Evaluation',
  };

  return names[code] ?? code.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function getCriterionClass(code: string): string {
  const classes: Record<string, string> = {
    ResearchDesign: 'research-design',
    DataAnalysis: 'data-analysis',
    Conclusion: 'conclusion',
    Evaluation: 'evaluation',
  };

  return classes[code] ?? 'other';
}

function getCriterionOrder(code: string): number {
  const order = ['ResearchDesign', 'DataAnalysis', 'Conclusion', 'Evaluation'];
  const directIndex = order.indexOf(code);

  if (directIndex >= 0) {
    return directIndex;
  }

  const normalized = code.replace(/\s+/g, '').toLowerCase();
  const normalizedIndex = order.findIndex(
    (criterion) => criterion.toLowerCase() === normalized
  );

  return normalizedIndex >= 0 ? normalizedIndex : order.length;
}

function getPriorityOrder(priority: FindingPriority): number {
  return priority === 'high' ? 0 : priority === 'medium' ? 1 : 2;
}

function normalizePriority(value: unknown): FindingPriority {
  const text = asText(value)?.toLowerCase();

  return text === 'high' || text === 'low' ? text : 'medium';
}

function normalizeObjectArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(isRecord) as T[]) : [];
}

function asNumberRange(value: unknown): [number, number] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number'
  ) {
    return null;
  }

  return [value[0], value[1]];
}

function asTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function firstArray(...values: unknown[]): unknown[] {
  return values.find(Array.isArray) ?? [];
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = asText(value);

    if (text) {
      return text;
    }
  }

  return null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatReviewDateTime(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function saveAccountConversionReview(
  submission: IaSubmission,
  completion: PipelineCompletion,
  email: string
): void {
  try {
    window.localStorage.setItem(
      ACCOUNT_CONVERSION_REVIEW_KEY,
      JSON.stringify({
        submission,
        completion,
      } satisfies SavedCompletedReview)
    );

    saveAccountConversionEmail(email);
  } catch (error) {
    console.warn('The account conversion bridge could not be saved', error);
  }
}

function loadAccountConversionReview(): SavedCompletedReview | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_CONVERSION_REVIEW_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedCompletedReview>;

    if (
      !parsed.submission?.id ||
      !parsed.completion?.submissionId ||
      parsed.submission.id !== parsed.completion.submissionId
    ) {
      clearAccountConversionReview();
      return null;
    }

    return parsed as SavedCompletedReview;
  } catch (error) {
    console.warn('The pending account review could not be restored', error);

    clearAccountConversionReview();
    return null;
  }
}

function saveAccountConversionEmail(email: string): void {
  try {
    window.localStorage.setItem(
      ACCOUNT_CONVERSION_EMAIL_KEY,
      email.trim().toLowerCase()
    );
  } catch (error) {
    console.warn('The account email could not be remembered', error);
  }
}

function loadAccountConversionEmail(): string | null {
  try {
    return window.localStorage.getItem(ACCOUNT_CONVERSION_EMAIL_KEY);
  } catch {
    return null;
  }
}

function clearAccountConversionReview(): void {
  try {
    window.localStorage.removeItem(ACCOUNT_CONVERSION_REVIEW_KEY);

    window.localStorage.removeItem(ACCOUNT_CONVERSION_EMAIL_KEY);
  } catch (error) {
    console.warn('The pending account review could not be cleared', error);
  }
}

async function recoverCompletedReviewForCurrentAccount(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc(
      'recover_my_completed_ia_review'
    );

    if (error) {
      console.error('Completed review recovery could not be checked', error);
      return;
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      !Array.isArray(data) &&
      data.recovered === true
    ) {
      window.dispatchEvent(new CustomEvent('ia-review-finalized'));

      window.dispatchEvent(new CustomEvent('ia-credit-balance-changed'));

      window.dispatchEvent(new CustomEvent('ia-report-history-changed'));
    }
  } catch (error) {
    console.error('Completed review recovery failed', error);
  }
}

async function loadActiveReviewForCurrentAccount(): Promise<IaSubmission | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_active_ia_review');

    if (error) {
      throw error;
    }

    return normalizeActiveReviewResponse(data);
  } catch (error) {
    console.error('Active review could not be restored', error);

    return null;
  }
}

function normalizeActiveReviewResponse(value: unknown): IaSubmission | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const response = value as ActiveIaReviewResponse;
  const activeSubmission = response.submission;

  if (
    response.active !== true ||
    !activeSubmission ||
    typeof activeSubmission.id !== 'string' ||
    typeof activeSubmission.raw_file_path !== 'string'
  ) {
    return null;
  }

  return activeSubmission;
}

async function loadMyReviewAccessSummary(): Promise<ReviewAccessSummary> {
  await ensureFreshReviewSession();

  const { data, error } = await supabase.rpc('get_my_ia_credit_summary');

  if (error) {
    throw error;
  }

  if (!isRecord(data)) {
    throw new Error('Your review access could not be read.');
  }

  return {
    free_review_status: asText(data.free_review_status) ?? 'used',
    free_review_available: data.free_review_available === true,
    paid_credits_available: Math.max(
      0,
      asNumber(data.paid_credits_available) ?? 0
    ),
    complimentary_credits_available: Math.max(
      0,
      asNumber(data.complimentary_credits_available) ?? 0
    ),
    total_paid_or_complimentary_credits: Math.max(
      0,
      asNumber(data.total_paid_or_complimentary_credits) ?? 0
    ),
    reserved_review_count: Math.max(
      0,
      asNumber(data.reserved_review_count) ?? 0
    ),
    can_start_review: data.can_start_review === true,
  };
}

function loadSavedReviewAccessSource(): IaReviewAccessSource | null {
  try {
    const value = window.sessionStorage.getItem(REVIEW_ACCESS_SOURCE_KEY);

    return value === 'paid_credit' || value === 'free_review' ? value : null;
  } catch {
    return null;
  }
}

function normalizeCommercialAccess(
  value: unknown
): IaSubmission['commercial_access'] {
  return value === 'paid_credit' ||
    value === 'complimentary' ||
    value === 'free_review' ||
    value === 'unassigned'
    ? value
    : undefined;
}

function isCurrentReviewActive(
  currentStatus: AppStatus,
  currentErrorContext: ErrorContext,
  currentSubmission: IaSubmission | null
): boolean {
  if (!currentSubmission) {
    return false;
  }

  return (
    currentStatus === 'processing' ||
    (currentStatus === 'error' && currentErrorContext === 'pipeline')
  );
}

function getSharedReviewToken(pathname: string): string | null {
  if (!pathname.startsWith('/shared-review/')) {
    return null;
  }

  const token = pathname
    .slice('/shared-review/'.length)
    .split('/')[0]
    ?.trim();

  if (!token) {
    return 'invalid';
  }

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

function replaceAppRoute(path: string): void {
  window.history.replaceState({}, '', path);
}

function saveCompletedReview(
  submission: IaSubmission,
  completion: PipelineCompletion
): void {
  try {
    const savedReview: SavedCompletedReview = {
      submission,
      completion,
    };

    window.sessionStorage.setItem(
      COMPLETED_REVIEW_STORAGE_KEY,
      JSON.stringify(savedReview)
    );
  } catch {
    // Browser storage is optional. The current in-memory review still works.
  }
}

function loadSavedCompletedReview(): SavedCompletedReview | null {
  try {
    const raw = window.sessionStorage.getItem(COMPLETED_REVIEW_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedCompletedReview>;

    if (
      !parsed.submission ||
      !parsed.completion ||
      typeof parsed.submission.id !== 'string' ||
      typeof parsed.completion.submissionId !== 'string' ||
      parsed.submission.id !== parsed.completion.submissionId
    ) {
      clearSavedCompletedReview();
      return null;
    }

    return parsed as SavedCompletedReview;
  } catch {
    clearSavedCompletedReview();
    return null;
  }
}

function clearSavedCompletedReview(): void {
  try {
    window.sessionStorage.removeItem(COMPLETED_REVIEW_STORAGE_KEY);
  } catch {
    // Browser storage is optional.
  }
}

function getStageState(
  stage: PipelineStageKey,
  progress: PipelineProgress | null,
  hasError: boolean
): 'waiting' | 'active' | 'complete' | 'error' {
  if (progress?.completedStages.includes(stage)) {
    return 'complete';
  }

  if (progress?.currentStage === stage) {
    return hasError ? 'error' : 'active';
  }

  return 'waiting';
}

function formatReviewDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof FileValidationError) {
    return error.message;
  }

  if (error instanceof PipelineError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export default App;
