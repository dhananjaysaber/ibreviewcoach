import {
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  ReceiptText,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PremiumWorkspaceView =
  | 'dashboard'
  | 'reports'
  | 'review'
  | 'credits'
  | 'billing'
  | 'admin';

export type PremiumReviewIndicator = {
  state: 'processing' | 'complete' | 'error' | null;
  filename: string | null;
  progressPercent: number;
  message: string;
  unread: boolean;
};

type PremiumWorkspaceShellProps = {
  activeView: PremiumWorkspaceView;
  email: string | null;
  review: PremiumReviewIndicator;
  busy?: boolean;
  isAdmin?: boolean;
  paymentsEnabled?: boolean;
  children?: ReactNode;
  onOpenDashboard: () => void;
  onOpenReports: () => void;
  onStartReview: () => void;
  onOpenCredits: () => void;
  onOpenBilling: () => void;
  onOpenAdmin: () => void;
  onOpenReview: () => void;
  onSignOut: () => void;
};

type NavItem = {
  key: PremiumWorkspaceView;
  label: string;
  description: string;
  icon: ReactNode;
  action: () => void;
};

export function PremiumWorkspaceShell({
  activeView,
  email,
  review,
  busy = false,
  isAdmin = false,
  paymentsEnabled = true,
  children,
  onOpenDashboard,
  onOpenReports,
  onStartReview,
  onOpenCredits,
  onOpenBilling,
  onOpenAdmin,
  onOpenReview,
  onSignOut,
}: PremiumWorkspaceShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationOpen(false);
  }, [activeView]);

  const navigation = useMemo<NavItem[]>(
    () =>
      isAdmin
        ? [
            {
              key: 'admin',
              label: 'Admin Control',
              description: 'Payments, users and settings',
              icon: <ShieldCheck aria-hidden="true" />,
              action: onOpenAdmin,
            },
            {
              key: 'review',
              label: 'New Review',
              description: 'Upload an IA draft',
              icon: <UploadCloud aria-hidden="true" />,
              action: onStartReview,
            },
            {
              key: 'reports',
              label: 'My IA Reports',
              description: 'Saved reviews and versions',
              icon: <ClipboardList aria-hidden="true" />,
              action: onOpenReports,
            },
          ]
        : [
            {
              key: 'dashboard',
              label: 'Dashboard',
              description: 'Overview and recent work',
              icon: <LayoutDashboard aria-hidden="true" />,
              action: onOpenDashboard,
            },
            {
              key: 'review',
              label: 'New Review',
              description: 'Upload an IA draft',
              icon: <UploadCloud aria-hidden="true" />,
              action: onStartReview,
            },
            {
              key: 'reports',
              label: 'My IA Reports',
              description: 'Saved reviews and versions',
              icon: <ClipboardList aria-hidden="true" />,
              action: onOpenReports,
            },
            ...(paymentsEnabled
              ? [
                  {
                    key: 'credits' as const,
                    label: 'Review Credits',
                    description: 'Choose review access',
                    icon: <CreditCard aria-hidden="true" />,
                    action: onOpenCredits,
                  },
                ]
              : []),
            {
              key: 'billing',
              label: 'Billing',
              description: 'Purchases and invoices',
              icon: <ReceiptText aria-hidden="true" />,
              action: onOpenBilling,
            },
          ],
    [
      isAdmin,
      paymentsEnabled,
      onOpenAdmin,
      onOpenBilling,
      onOpenCredits,
      onOpenDashboard,
      onOpenReports,
      onStartReview,
    ]
  );

  const pageHeading = getPageHeading(activeView);
  const accountInitial = getAccountInitial(email);

  const showLiveReview =
    review.state === 'processing' ||
    review.state === 'error';

  const showReadyNotification =
    review.state === 'complete' &&
    Boolean(review.filename);

  function runNavigation(action: () => void) {
    setMobileMenuOpen(false);
    action();
  }

  const accountAction = isAdmin
    ? onOpenAdmin
    : onOpenDashboard;

  return (
    <div className="premium-workspace">
      <button
        className={`premium-sidebar-backdrop ${
          mobileMenuOpen
            ? 'premium-sidebar-backdrop-visible'
            : ''
        }`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside
        className={`premium-sidebar ${
          mobileMenuOpen
            ? 'premium-sidebar-open'
            : ''
        }`}
      >
        <div className="premium-sidebar-brand">
          <span>
            <GraduationCap aria-hidden="true" />
          </span>

          <div>
            <strong>IB IA Review</strong>
            <small>
              {isAdmin
                ? 'Admin workspace'
                : 'Premium learning workspace'}
            </small>
          </div>

          <button
            className="premium-sidebar-close"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="premium-sidebar-label">
          Workspace
        </div>

        <nav
          className="premium-sidebar-nav"
          aria-label={isAdmin ? 'Admin workspace' : 'Member workspace'}
        >
          {navigation.map((item) => (
            <button
              className={
                activeView === item.key
                  ? 'premium-sidebar-link premium-sidebar-link-active'
                  : 'premium-sidebar-link'
              }
              type="button"
              key={item.key}
              onClick={() => runNavigation(item.action)}
              aria-current={
                activeView === item.key
                  ? 'page'
                  : undefined
              }
            >
              <span className="premium-sidebar-link-icon">
                {item.icon}
              </span>

              <span className="premium-sidebar-link-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>

              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </nav>

        <section className="premium-sidebar-guidance">
          <span>
            <ShieldCheck aria-hidden="true" />
          </span>

          <div>
            <strong>
              {isAdmin ? 'Protected Admin access' : 'Private by design'}
            </strong>
            <p>
              {isAdmin
                ? 'Administrative data is available only through protected Admin actions. Student security rules remain unchanged.'
                : 'Your drafts, reports and purchases stay connected to this signed-in account.'}
            </p>
          </div>
        </section>

        <div className="premium-sidebar-account">
          <span className="premium-account-avatar">
            {accountInitial}
          </span>

          <div>
            <small>
              {isAdmin ? 'Signed in as Admin' : 'Signed in as'}
            </small>
            <strong>{email ?? 'Your account'}</strong>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            disabled={busy}
            aria-label="Sign out"
            title="Sign out"
          >
            {busy ? (
              <LoaderCircle
                className="premium-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      <section className="premium-workspace-stage">
        <header className="premium-topbar">
          <div className="premium-topbar-left">
            <button
              className="premium-mobile-menu"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" />
            </button>

            <div>
              <span>{pageHeading.eyebrow}</span>
              <h1>{pageHeading.title}</h1>
            </div>
          </div>

          <div className="premium-topbar-right">
            {showLiveReview && (
              <button
                className={`premium-live-review premium-live-review-${review.state}`}
                type="button"
                onClick={onOpenReview}
              >
                <span className="premium-live-review-icon">
                  {review.state === 'error' ? (
                    <BookOpenCheck aria-hidden="true" />
                  ) : (
                    <LoaderCircle
                      className="premium-spin"
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="premium-live-review-copy">
                  <small>
                    {review.state === 'error'
                      ? 'Review needs attention'
                      : 'Review in progress'}
                  </small>

                  <strong>
                    {review.filename ?? 'Current IA review'}
                  </strong>
                </span>

                {review.state === 'processing' && (
                  <span className="premium-live-review-percent">
                    {review.progressPercent}%
                  </span>
                )}
              </button>
            )}

            <div className="premium-notification-wrap">
              <button
                className="premium-notification-button"
                type="button"
                onClick={() =>
                  setNotificationOpen((value) => !value)
                }
                aria-label="Open notifications"
                aria-expanded={notificationOpen}
              >
                <Bell aria-hidden="true" />

                {review.unread && (
                  <span aria-label="One unread notification">
                    1
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div
                  className="premium-notification-panel"
                  role="dialog"
                  aria-label="Notifications"
                >
                  <header>
                    <strong>Notifications</strong>
                    <span>
                      {review.unread ? '1 new' : 'Up to date'}
                    </span>
                  </header>

                  {showReadyNotification ? (
                    <button
                      className="premium-notification-item"
                      type="button"
                      onClick={onOpenReview}
                    >
                      <span>
                        <CheckCircle2 aria-hidden="true" />
                      </span>

                      <div>
                        <strong>Your IA review is ready</strong>
                        <p>{review.filename}</p>
                        <small>
                          Open the completed review and saved report.
                        </small>
                      </div>

                      <ChevronRight aria-hidden="true" />
                    </button>
                  ) : showLiveReview ? (
                    <button
                      className="premium-notification-item"
                      type="button"
                      onClick={onOpenReview}
                    >
                      <span>
                        <CircleDollarSign aria-hidden="true" />
                      </span>

                      <div>
                        <strong>
                          {review.state === 'error'
                            ? 'Review needs attention'
                            : 'Review is being prepared'}
                        </strong>
                        <p>{review.filename}</p>
                        <small>{review.message}</small>
                      </div>

                      <ChevronRight aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="premium-notification-empty">
                      <Bell aria-hidden="true" />
                      <strong>You are all caught up</strong>
                      <span>
                        Review updates will appear here.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="premium-profile-button"
              type="button"
              onClick={accountAction}
              title={email ?? (isAdmin ? 'Admin Control Centre' : 'My account')}
            >
              <span>{accountInitial}</span>
              <div>
                <small>{isAdmin ? 'Administrator' : 'Account'}</small>
                <strong>
                  {isAdmin ? 'Admin Control' : 'My workspace'}
                </strong>
              </div>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="premium-workspace-content">
          {showLiveReview && (
            <section
              className={`premium-review-strip premium-review-strip-${review.state}`}
            >
              <div>
                {review.state === 'error' ? (
                  <BookOpenCheck aria-hidden="true" />
                ) : (
                  <LoaderCircle
                    className="premium-spin"
                    aria-hidden="true"
                  />
                )}
              </div>

              <span>
                <small>
                  {review.state === 'error'
                    ? 'Review needs attention'
                    : 'Preparing your IA review'}
                </small>
                <strong>{review.filename}</strong>
                <p>{review.message}</p>
              </span>

              {review.state === 'processing' && (
                <span className="premium-review-strip-progress">
                  <span
                    style={{
                      width: `${review.progressPercent}%`,
                    }}
                  />
                </span>
              )}

              <button type="button" onClick={onOpenReview}>
                {review.state === 'error'
                  ? 'Continue review'
                  : 'View progress'}
                <ChevronRight aria-hidden="true" />
              </button>
            </section>
          )}

          {children}
        </main>

        <footer className="premium-workspace-footer">
          <span>
            Indicative guidance only. Final assessment decisions
            remain with your teacher and the IB assessment process.
          </span>
        </footer>
      </section>

      <nav
        className="premium-mobile-nav"
        aria-label={
          isAdmin
            ? 'Mobile Admin navigation'
            : 'Mobile member navigation'
        }
      >
        <MobileNavButton
          active={isAdmin ? activeView === 'admin' : activeView === 'dashboard'}
          label={isAdmin ? 'Admin' : 'Dashboard'}
          icon={
            isAdmin ? (
              <ShieldCheck aria-hidden="true" />
            ) : (
              <LayoutDashboard aria-hidden="true" />
            )
          }
          onClick={accountAction}
        />

        <MobileNavButton
          active={activeView === 'review'}
          label="New Review"
          icon={<UploadCloud aria-hidden="true" />}
          onClick={onStartReview}
        />

        <MobileNavButton
          active={activeView === 'reports'}
          label="Reports"
          icon={<ClipboardList aria-hidden="true" />}
          onClick={onOpenReports}
        />

        <MobileNavButton
          active={
            isAdmin
              ? activeView === 'admin'
              : activeView === 'credits' ||
                activeView === 'billing'
          }
          label={isAdmin ? 'Control' : 'Account'}
          icon={
            isAdmin ? (
              <ShieldCheck aria-hidden="true" />
            ) : (
              <UserRound aria-hidden="true" />
            )
          }
          onClick={accountAction}
        />
      </nav>
    </div>
  );
}

type MobileNavButtonProps = {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

function MobileNavButton({
  active,
  label,
  icon,
  onClick,
}: MobileNavButtonProps) {
  return (
    <button
      className={
        active
          ? 'premium-mobile-nav-active'
          : ''
      }
      type="button"
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function getPageHeading(view: PremiumWorkspaceView): {
  eyebrow: string;
  title: string;
} {
  switch (view) {
    case 'admin':
      return {
        eyebrow: 'Administration',
        title: 'Admin Control Centre',
      };

    case 'reports':
      return {
        eyebrow: 'Report library',
        title: 'My IA Reports',
      };

    case 'review':
      return {
        eyebrow: 'IA review workspace',
        title: 'Review an IA draft',
      };

    case 'credits':
      return {
        eyebrow: 'Review access',
        title: 'Choose review credits',
      };

    case 'billing':
      return {
        eyebrow: 'Account and billing',
        title: 'Purchases and invoices',
      };

    default:
      return {
        eyebrow: 'Member workspace',
        title: 'Dashboard',
      };
  }
}

function getAccountInitial(email: string | null): string {
  const value = email?.trim();

  return value
    ? value.charAt(0).toUpperCase()
    : 'A';
}

