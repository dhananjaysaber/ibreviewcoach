import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from 'lucide-react';

import { useEffect, useRef, useState } from 'react';

import { supabase } from '../lib/supabase';

export type PayPalCreditPack = {
  pack_code: string;
  display_name: string;
  description: string;
  review_credits: number;
  price_usd: number;
  validity_days: number;
};

type CheckoutState =
  | 'loading'
  | 'ready'
  | 'creating'
  | 'capturing'
  | 'pending'
  | 'success'
  | 'cancelled'
  | 'error';

type PayPalCheckoutModalProps = {
  pack: PayPalCreditPack;
  onClose: () => void;
  onStartReview: () => void;
  successActionLabel?: string;
};

type CreateOrderResponse = {
  ok?: boolean;
  orderId?: string;
  paymentOrderId?: string;
  message?: string;
};

type CaptureOrderResponse = {
  ok?: boolean;
  alreadyCompleted?: boolean;
  paymentOrderId?: string;
  orderId?: string;
  captureId?: string | null;
  creditsGranted?: number;
  credits?: {
    paid_credits_available?: number;
    complimentary_credits_available?: number;
    total_paid_or_complimentary_credits?: number;
  } | null;
  message?: string;
  paymentCompleted?: boolean;
  paymentPending?: boolean;
  captureStatus?: string | null;
  recoverable?: boolean;
  issue?: string | null;
};

type PayPalButtonData = {
  orderID?: string;
  orderId?: string;
};

type PayPalButtonsActions = {
  restart?: () => Promise<void>;
};

type PayPalButtonsInstance = {
  render: (selector: string | HTMLElement) => Promise<void>;
  close?: () => Promise<void>;
  isEligible?: () => boolean;
};

type PayPalButtonsOptions = {
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay';
    height?: number;
  };
  createOrder: () => Promise<string>;
  onApprove: (
    data: PayPalButtonData,
    actions: PayPalButtonsActions
  ) => Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

type PayPalNamespace = {
  Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const PAYPAL_SCRIPT_ID = 'sehs-paypal-js-sdk';
const PAYPAL_CURRENCY = 'USD';

// PayPal Client IDs are public browser identifiers. The environment value can
// override this Sandbox ID later when the live merchant app is connected.
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim() ?? '';

let paypalSdkPromise: Promise<PayPalNamespace> | null = null;

export function PayPalCheckoutModal({
  pack,
  onClose,
  onStartReview,
  successActionLabel = 'Start an IA review',
}: PayPalCheckoutModalProps) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const paymentOrderIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');

  const [message, setMessage] = useState('Preparing secure PayPal checkout…');

  const [availableCredits, setAvailableCredits] = useState<number | null>(null);

  const isBusy =
    checkoutState === 'loading' ||
    checkoutState === 'creating' ||
    checkoutState === 'capturing';

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let buttonInstance: PayPalButtonsInstance | null = null;
    let cancelled = false;

    async function renderPayPalButton() {
      const clientId = PAYPAL_CLIENT_ID;
      if (!clientId) {
        setCheckoutState('error');
        setMessage(
          'Secure payment checkout is temporarily unavailable. Please try again later.'
        );
        return;
      }

      try {
        setCheckoutState('loading');
        setMessage('Preparing secure PayPal checkout…');

        const paypal = await loadPayPalSdk(clientId, PAYPAL_CURRENCY);

        if (cancelled || !isMountedRef.current || !buttonContainerRef.current) {
          return;
        }

        buttonContainerRef.current.innerHTML = '';

        buttonInstance = paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48,
          },

          createOrder: async () => {
            setCheckoutState('creating');
            setMessage('Opening secure PayPal checkout…');
            paymentOrderIdRef.current = null;

            const { data, error } =
              await supabase.functions.invoke<CreateOrderResponse>(
                'paypal-create-order',
                {
                  body: {
                    pack_code: pack.pack_code,
                  },
                }
              );

            if (error) {
              throw new Error(
                await readFunctionError(
                  error,
                  'The secure checkout could not be opened. Please try again.'
                )
              );
            }

            if (!data?.ok || !data.orderId || !data.paymentOrderId) {
              throw new Error(
                data?.message ||
                  'The secure checkout could not be opened. Please try again.'
              );
            }

            paymentOrderIdRef.current = data.paymentOrderId;

            setCheckoutState('ready');
            setMessage('Complete the payment in the secure PayPal window.');

            return data.orderId;
          },

          onApprove: async (
            data: PayPalButtonData,
            actions: PayPalButtonsActions
          ) => {
            const paymentOrderId = paymentOrderIdRef.current;

            const orderId = data.orderID ?? data.orderId;

            if (!orderId) {
              setCheckoutState('error');
              setMessage(
                'PayPal did not return the approved order. Please reopen checkout.'
              );
              return;
            }

            setCheckoutState('capturing');
            setMessage('Confirming your payment and adding review credits…');

            const { data: captureData, error: captureError } =
              await supabase.functions.invoke<CaptureOrderResponse>(
                'paypal-capture-order',
                {
                  body: {
                    ...(paymentOrderId
                      ? {
                          payment_order_id: paymentOrderId,
                          paymentOrderId,
                        }
                      : {}),
                    order_id: orderId,
                    orderId,
                    orderID: orderId,
                  },
                }
              );

            if (captureError) {
              const friendlyMessage = await readFunctionError(
                captureError,
                'The payment could not be confirmed. Do not pay again until the transaction has been checked.'
              );

              if (
                friendlyMessage.toLowerCase().includes('instrument') &&
                actions.restart
              ) {
                await actions.restart();
                return;
              }

              setCheckoutState('error');
              setMessage(friendlyMessage);
              return;
            }

            if (!captureData?.ok) {
              if (captureData?.paymentPending === true) {
                setCheckoutState('pending');
                setMessage(
                  captureData.message ||
                    'PayPal is still processing the payment. Do not pay again.'
                );
                return;
              }

              if (
                captureData?.recoverable === true &&
                captureData.issue === 'INSTRUMENT_DECLINED'
              ) {
                setCheckoutState('ready');
                setMessage(
                  captureData.message ||
                    'PayPal could not use the selected payment method. Choose another payment method to continue.'
                );

                if (actions.restart) {
                  await actions.restart();
                  return;
                }

                setCheckoutState('error');
                setMessage(
                  'PayPal could not use the selected payment method. Close checkout and try again with a different payment method.'
                );
                return;
              }

              setCheckoutState('error');
              setMessage(
                captureData?.message ||
                  'The payment could not be confirmed. Do not pay again until the transaction has been checked.'
              );
              return;
            }

            const totalCredits = readCreditTotal(captureData);

            setAvailableCredits(totalCredits);
            setCheckoutState('success');
            setMessage(
              captureData.message ||
                'Payment completed. Your review credits are ready.'
            );
          },

          onCancel: () => {
            paymentOrderIdRef.current = null;
            setCheckoutState('cancelled');
            setMessage('Payment cancelled. No review credits were added.');
          },

          onError: (error: unknown) => {
            console.error('PayPal checkout could not continue', error);

            setCheckoutState('error');
            setMessage(getFriendlyCheckoutError(error));
          },
        });

        if (buttonInstance.isEligible && !buttonInstance.isEligible()) {
          setCheckoutState('error');
          setMessage(
            'PayPal checkout is not available in this browser. Try another browser or device.'
          );
          return;
        }

        await buttonInstance.render(buttonContainerRef.current);

        if (!cancelled && isMountedRef.current) {
          setCheckoutState('ready');
          setMessage(
            'Pay securely with PayPal. You will not be charged until you approve the payment.'
          );
        }
      } catch (error) {
        console.error('PayPal checkout setup failed', error);

        if (!cancelled && isMountedRef.current) {
          setCheckoutState('error');
          setMessage(getFriendlyCheckoutError(error));
        }
      }
    }

    void renderPayPalButton();

    return () => {
      cancelled = true;

      if (buttonContainerRef.current) {
        buttonContainerRef.current.innerHTML = '';
      }

      if (buttonInstance?.close) {
        void buttonInstance.close().catch(() => {
          // The container is already removed during cleanup.
        });
      }
    };
  }, [pack.pack_code]);

  function handleClose() {
    if (isBusy) {
      return;
    }

    onClose();
  }

  return (
    <div
      className="paypal-checkout-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <section
        className="paypal-checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paypal-checkout-title"
      >
        <button
          className="paypal-checkout-close"
          type="button"
          onClick={handleClose}
          disabled={isBusy}
          aria-label="Close PayPal checkout"
        >
          <X aria-hidden="true" />
        </button>

        <div className="paypal-checkout-heading">
          <span className="paypal-checkout-icon">
            <CreditCard aria-hidden="true" />
          </span>

          <div>
            <span>Secure review-credit payment</span>
            <h2 id="paypal-checkout-title">{pack.display_name}</h2>
          </div>
        </div>

        <div className="paypal-order-summary">
          <div>
            <span>Review credits</span>
            <strong>{pack.review_credits}</strong>
          </div>

          <div>
            <span>Total</span>
            <strong>{formatUsd(pack.price_usd)}</strong>
          </div>

          <div>
            <span>Credit validity</span>
            <strong>{pack.validity_days} days</strong>
          </div>
        </div>

        {checkoutState === 'success' ? (
          <div className="paypal-result paypal-result-success">
            <CheckCircle2 aria-hidden="true" />

            <div>
              <strong>Payment completed</strong>
              <p>{message}</p>

              {availableCredits !== null && (
                <span>
                  {availableCredits}{' '}
                  {availableCredits === 1
                    ? 'review credit is'
                    : 'review credits are'}{' '}
                  now available.
                </span>
              )}
            </div>
          </div>
        ) : checkoutState === 'pending' ? (
          <div className="paypal-result paypal-result-pending" role="status">
            <Clock3 aria-hidden="true" />

            <div>
              <strong>Payment processing</strong>
              <p>{message}</p>
              <span>
                Review credits will be added only after PayPal confirms the
                capture as completed.
              </span>
            </div>
          </div>
        ) : checkoutState === 'error' ? (
          <div className="paypal-result paypal-result-error" role="alert">
            <AlertCircle aria-hidden="true" />

            <div>
              <strong>Checkout needs attention</strong>
              <p>{message}</p>
            </div>
          </div>
        ) : checkoutState === 'cancelled' ? (
          <div className="paypal-result paypal-result-cancelled">
            <AlertCircle aria-hidden="true" />

            <div>
              <strong>Payment cancelled</strong>
              <p>{message}</p>
            </div>
          </div>
        ) : (
          <div className="paypal-checkout-status" role="status">
            {isBusy && (
              <LoaderCircle
                className="paypal-checkout-spinner"
                aria-hidden="true"
              />
            )}

            <span>{message}</span>
          </div>
        )}

        {checkoutState !== 'success' && checkoutState !== 'pending' && (
          <div
            ref={buttonContainerRef}
            className={`paypal-button-container ${
              checkoutState === 'loading'
                ? 'paypal-button-container-loading'
                : ''
            }`}
          />
        )}

        {checkoutState === 'pending' && (
          <button
            className="paypal-secondary-action paypal-wide-action"
            type="button"
            onClick={onClose}
          >
            Close — payment is still processing
          </button>
        )}

        {checkoutState === 'success' && (
          <div className="paypal-success-actions">
            <button
              className="paypal-primary-action"
              type="button"
              onClick={onStartReview}
            >
              {successActionLabel}
            </button>

            <button
              className="paypal-secondary-action"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {(checkoutState === 'error' || checkoutState === 'cancelled') && (
          <button
            className="paypal-secondary-action paypal-wide-action"
            type="button"
            onClick={onClose}
          >
            Return to pricing
          </button>
        )}

        <div className="paypal-security-note">
          <LockKeyhole aria-hidden="true" />

          <span>
            Prices and credit quantities are checked on the server. Payment
            details are handled by PayPal.
          </span>
        </div>

        <div className="paypal-integrity-note">
          <ShieldCheck aria-hidden="true" />

          <span>
            One credit covers one supported SEHS IA draft. Revised drafts use
            another review credit.
          </span>
        </div>
      </section>
    </div>
  );
}

function loadPayPalSdk(
  clientId: string,
  currency: string
): Promise<PayPalNamespace> {
  if (window.paypal?.Buttons) {
    return Promise.resolve(window.paypal);
  }

  if (paypalSdkPromise) {
    return paypalSdkPromise;
  }

  paypalSdkPromise = new Promise<PayPalNamespace>((resolve, reject) => {
    const existingScript = document.getElementById(
      PAYPAL_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const handleLoaded = () => {
      if (window.paypal?.Buttons) {
        resolve(window.paypal);
        return;
      }

      paypalSdkPromise = null;
      reject(new Error('PayPal checkout loaded without the payment button.'));
    };

    const handleError = () => {
      paypalSdkPromise = null;
      reject(
        new Error(
          'PayPal checkout could not be loaded. Check the internet connection and try again.'
        )
      );
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoaded, {
        once: true,
      });

      existingScript.addEventListener('error', handleError, {
        once: true,
      });

      return;
    }

    const script = document.createElement('script');

    script.id = PAYPAL_SCRIPT_ID;
    script.src =
      `https://www.paypal.com/sdk/js` +
      `?client-id=${encodeURIComponent(clientId)}` +
      `&currency=${encodeURIComponent(currency)}` +
      `&intent=capture` +
      `&components=buttons`;

    script.async = true;
    script.dataset.namespace = 'paypal';
    script.addEventListener('load', handleLoaded, {
      once: true,
    });

    script.addEventListener('error', handleError, {
      once: true,
    });

    document.head.appendChild(script);
  });

  return paypalSdkPromise;
}

async function readFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = (
      error as {
        context?: unknown;
      }
    ).context;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json();

        if (typeof payload?.message === 'string' && payload.message.trim()) {
          return payload.message.trim();
        }
      } catch {
        // Use the public fallback below.
      }
    }
  }

  if (
    error instanceof Error &&
    error.message &&
    !error.message.toLowerCase().includes('edge function')
  ) {
    return error.message;
  }

  return fallback;
}

function readCreditTotal(response: CaptureOrderResponse): number | null {
  const total = response.credits?.total_paid_or_complimentary_credits;

  if (typeof total === 'number' && Number.isFinite(total)) {
    return total;
  }

  if (
    typeof response.creditsGranted === 'number' &&
    Number.isFinite(response.creditsGranted)
  ) {
    return response.creditsGranted;
  }

  return null;
}

function getFriendlyCheckoutError(error: unknown): string {
  if (
    error instanceof Error &&
    error.message &&
    !error.message.toLowerCase().includes('zoid')
  ) {
    return error.message;
  }

  return (
    'PayPal checkout could not continue. ' +
    'No review credits were added. Please try again.'
  );
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
