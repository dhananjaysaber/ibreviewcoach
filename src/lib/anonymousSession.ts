import type {
  AuthChangeEvent,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js';

import { supabase } from './supabase';

const MINIMUM_PASSWORD_LENGTH = 8;

let sessionRequest: Promise<Session> | null = null;
let refreshRequest: Promise<Session> | null = null;

export type AccountSessionState =
  | 'signed-out'
  | 'temporary'
  | 'permanent';

export type PasswordValidation = {
  isValid: boolean;
  message: string;
};

export function getAccountSessionState(
  session: Session | null
): AccountSessionState {
  if (!session) {
    return 'signed-out';
  }

  return session.user.is_anonymous
    ? 'temporary'
    : 'permanent';
}

export function isTemporarySession(
  session: Session | null
): boolean {
  return getAccountSessionState(session) === 'temporary';
}

export function isPermanentSession(
  session: Session | null
): boolean {
  return getAccountSessionState(session) === 'permanent';
}

export function getSignedInEmail(
  session: Session | null
): string | null {
  const email = session?.user.email?.trim();

  return email || null;
}

export function getAuthRedirectUrl(
  route: string
): string {
  const normalizedRoute = route.startsWith('/')
    ? route
    : `/${route}`;

  return `${window.location.origin}${normalizedRoute}`;
}

/**
 * Preserves the current review behaviour.
 *
 * Existing permanent users are returned unchanged. A temporary private
 * session is created only when no session currently exists.
 */
export function ensureAnonymousSession(): Promise<Session> {
  if (!sessionRequest) {
    sessionRequest = resolveReviewSession().finally(() => {
      sessionRequest = null;
    });
  }

  return sessionRequest;
}

export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Account session check failed', error);

    throw new Error(
      'Your account session could not be checked. Refresh the page and try again.'
    );
  }

  return session;
}

export async function refreshCurrentSession(): Promise<Session> {
  if (!refreshRequest) {
    refreshRequest = resolveFreshSession().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

export async function requestCurrentReviewAccountEmail(
  email: string
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const session = await refreshCurrentSession();

  if (!session.user.is_anonymous) {
    throw new Error(
      'This review is already connected to an account.'
    );
  }

  const { error } = await supabase.auth.updateUser(
    {
      email: normalizedEmail,
    },
    {
      emailRedirectTo: getAuthRedirectUrl('/account-confirmed'),
    }
  );

  if (error) {
    console.error('Account email connection failed', error);

    throw toFriendlyAuthError(
      error,
      'The confirmation email could not be sent. Check the email address and try again.'
    );
  }
}

/**
 * Call this only after the user has confirmed the email address that was
 * attached to the temporary review session.
 */
export async function completeCurrentReviewAccount(
  password: string
): Promise<Session> {
  validatePasswordOrThrow(password);

  const session = await refreshCurrentSession();
  const user = session.user;

  if (!user.email) {
    throw new Error(
      'Confirm your email address before creating a password.'
    );
  }

  if (!isEmailVerified(user)) {
    throw new Error(
      'Confirm your email address using the email we sent before creating a password.'
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error('Account password creation failed', error);

    throw toFriendlyAuthError(
      error,
      'Your password could not be saved. Try again.'
    );
  }

  const updatedSession = await refreshCurrentSession();

  if (
    data.user.is_anonymous ||
    updatedSession.user.is_anonymous
  ) {
    throw new Error(
      'Your account could not be completed. Refresh the page and try again.'
    );
  }

  return updatedSession;
}

export async function createAccountWithPassword(
  email: string,
  password: string
): Promise<{
  session: Session | null;
  confirmationRequired: boolean;
}> {
  const normalizedEmail = normalizeEmail(email);

  validatePasswordOrThrow(password);

  const currentSession = await getCurrentSession();

  if (currentSession?.user.is_anonymous) {
    await requestCurrentReviewAccountEmail(normalizedEmail);

    return {
      session: currentSession,
      confirmationRequired: true,
    };
  }

  if (currentSession) {
    throw new Error(
      'You are already signed in.'
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl('/account-confirmed'),
    },
  });

  if (error) {
    console.error('Account creation failed', error);

    throw toFriendlyAuthError(
      error,
      'Your account could not be created. Check the details and try again.'
    );
  }

  return {
    session: data.session,
    confirmationRequired: !data.session,
  };
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<Session> {
  const normalizedEmail = normalizeEmail(email);

  if (!password) {
    throw new Error(
      'Enter your password.'
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    console.error('Account sign-in failed', error);

    throw toFriendlyAuthError(
      error,
      'The email address or password was not recognised.'
    );
  }

  if (!data.session) {
    throw new Error(
      'Your account could not be signed in. Try again.'
    );
  }

  return data.session;
}

export async function sendPasswordResetEmail(
  email: string
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    {
      redirectTo: getAuthRedirectUrl('/reset-password'),
    }
  );

  if (error) {
    console.error('Password reset request failed', error);

    throw toFriendlyAuthError(
      error,
      'The reset email could not be sent. Wait a moment and try again.'
    );
  }
}

export async function updateRecoveredPassword(
  password: string
): Promise<Session> {
  validatePasswordOrThrow(password);

  const currentSession = await getCurrentSession();

  if (!currentSession) {
    throw new Error(
      'The password reset link is no longer valid. Request a new reset email.'
    );
  }

  const {
    error,
  } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error('Recovered password update failed', error);

    throw toFriendlyAuthError(
      error,
      'Your new password could not be saved. Request a new reset email and try again.'
    );
  }

  return refreshCurrentSession();
}

export async function signOutAccount(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Account sign-out failed', error);

    throw new Error(
      'You could not be signed out. Try again.'
    );
  }
}

export function subscribeToAuthChanges(
  callback: (
    event: AuthChangeEvent,
    session: Session | null
  ) => void
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );

  return subscription;
}

export function validatePassword(
  password: string
): PasswordValidation {
  if (!password) {
    return {
      isValid: false,
      message: 'Enter a password.',
    };
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return {
      isValid: false,
      message: `Use at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    };
  }

  return {
    isValid: true,
    message: '',
  };
}

async function resolveReviewSession(): Promise<Session> {
  const existingSession = await getCurrentSession();

  if (existingSession) {
    return existingSession;
  }

  const {
    data,
    error,
  } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error('Secure review session creation failed', error);

    throw new Error(
      'A secure review session could not be started. Refresh the page and try again.'
    );
  }

  if (!data.session) {
    throw new Error(
      'A secure review session could not be created. Refresh the page and try again.'
    );
  }

  return data.session;
}

async function resolveFreshSession(): Promise<Session> {
  const currentSession = await getCurrentSession();

  if (!currentSession) {
    throw new Error(
      'Your secure session has ended. Refresh the page and try again.'
    );
  }

  const {
    data,
    error,
  } = await supabase.auth.refreshSession(currentSession);

  if (error || !data.session) {
    console.error('Account session refresh failed', error);

    throw new Error(
      'Your secure session has expired. Refresh the page and try again.'
    );
  }

  return data.session;
}

function normalizeEmail(
  email: string
): string {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      'Enter your email address.'
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail)
  ) {
    throw new Error(
      'Enter a valid email address.'
    );
  }

  return normalizedEmail;
}

function validatePasswordOrThrow(
  password: string
): void {
  const result = validatePassword(password);

  if (!result.isValid) {
    throw new Error(result.message);
  }
}

function isEmailVerified(
  user: User
): boolean {
  return Boolean(
    user.email_confirmed_at ||
      user.confirmed_at
  );
}

function toFriendlyAuthError(
  error: {
    message?: string;
    code?: string;
    status?: number;
  },
  fallback: string
): Error {
  const code = error.code?.toLowerCase() ?? '';
  const message = error.message?.toLowerCase() ?? '';

  if (
    code.includes('email_exists') ||
    code.includes('user_already_exists') ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return new Error(
      'An account already uses this email address. Sign in instead.'
    );
  }

  if (
    code.includes('email_not_confirmed') ||
    message.includes('email not confirmed')
  ) {
    return new Error(
      'Confirm your email address before signing in.'
    );
  }

  if (
    code.includes('invalid_credentials') ||
    message.includes('invalid login credentials')
  ) {
    return new Error(
      'The email address or password was not recognised.'
    );
  }

  if (
    code.includes('over_email_send_rate_limit') ||
    code.includes('over_request_rate_limit') ||
    message.includes('rate limit')
  ) {
    return new Error(
      'Too many emails were requested. Wait a while before trying again.'
    );
  }

  if (
    code.includes('weak_password') ||
    message.includes('password should be')
  ) {
    return new Error(
      'Choose a stronger password and try again.'
    );
  }

  return new Error(fallback);
}

