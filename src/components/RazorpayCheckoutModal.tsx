import { AlertCircle, CheckCircle2, Clock3, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PayPalCreditPack } from './PayPalCheckoutModal';

type State = 'ready' | 'creating' | 'paying' | 'verifying' | 'pending' | 'success' | 'cancelled' | 'error';

type CreateOrderResponse = {
  ok?: boolean; keyId?: string; razorpayOrderId?: string; paymentOrderId?: string;
  amount?: number; currency?: string; name?: string; description?: string; prefillEmail?: string; message?: string;
};
type VerifyResponse = {
  ok?: boolean; paymentPending?: boolean; paymentCompleted?: boolean; message?: string;
  credits?: { total_paid_or_complimentary_credits?: number } | null;
};
type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;
declare global { interface Window { Razorpay?: RazorpayCtor } }

const SCRIPT_ID = 'razorpay-checkout-js';
let sdk: Promise<RazorpayCtor> | null = null;

function loadSdk(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (sdk) return sdk;
  sdk = new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : ((sdk = null), reject(new Error('Razorpay did not load.'))));
    s.onerror = () => { sdk = null; reject(new Error('Razorpay checkout could not be loaded. Check your internet connection and try again.')); };
    document.head.appendChild(s);
  });
  return sdk;
}

async function fnError(error: unknown, fallback: string): Promise<string> {
  const ctx = typeof error === 'object' && error !== null && 'context' in error ? (error as { context?: unknown }).context : null;
  if (ctx instanceof Response) {
    try { const p = await ctx.clone().json(); if (typeof p?.message === 'string' && p.message.trim()) return p.message.trim(); } catch { /* fall through */ }
  }
  return fallback;
}

const inr = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100);

type Props = { pack: PayPalCreditPack; onClose: () => void; onStartReview: () => void; successActionLabel?: string; onBack?: () => void };

export function RazorpayCheckoutModal({ pack, onClose, onStartReview, successActionLabel = 'Start an IA review', onBack }: Props) {
  const [state, setState] = useState<State>('ready');
  const [message, setMessage] = useState('You will pay securely with UPI, cards or netbanking through Razorpay. The rupee total is shown on the next screen.');
  const [credits, setCredits] = useState<number | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const busy = state === 'creating' || state === 'verifying';

  async function verify(order: CreateOrderResponse, r: RazorpaySuccess) {
    if (!mounted.current) return;
    setState('verifying');
    setMessage('Confirming your payment. Please do not close this window.');
    const { data, error } = await supabase.functions.invoke<VerifyResponse>('razorpay-verify-payment', {
      body: { payment_order_id: order.paymentOrderId, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature },
    });
    if (!mounted.current) return;
    if (error && !data?.paymentPending) {
      setState('pending');
      setMessage(await fnError(error, 'Your payment was received but is still being confirmed. Do not pay again; contact support if credits do not appear.'));
      return;
    }
    if (data?.ok) {
      setCredits(data.credits?.total_paid_or_complimentary_credits ?? null);
      setState('success');
      setMessage(data.message ?? 'Payment completed. Your review credits are ready.');
    } else if (data?.paymentPending || data?.paymentCompleted) {
      setState('pending');
      setMessage(data.message ?? 'Your payment is being processed. Do not pay again.');
    } else {
      setState('error');
      setMessage(data?.message ?? 'The payment could not be verified. No review credits were added.');
    }
  }

  async function pay() {
    try {
      setState('creating');
      setMessage('Opening secure Razorpay checkout…');
      const [Razorpay, created] = await Promise.all([
        loadSdk(),
        supabase.functions.invoke<CreateOrderResponse>('razorpay-create-order', { body: { pack_code: pack.pack_code } }),
      ]);
      const { data, error } = created;
      if (error || !data?.ok || !data.keyId || !data.razorpayOrderId || !data.amount) {
        throw new Error(await fnError(error, data?.message ?? 'The secure checkout could not be opened. Please try again.'));
      }
      if (!mounted.current) return;
      setState('paying');
      setMessage(`Complete the payment of ${inr(data.amount)} in the Razorpay window.`);
      const rz = new Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency ?? 'INR',
        name: data.name ?? 'IB IA Review',
        description: data.description ?? pack.display_name,
        prefill: { email: data.prefillEmail },
        theme: { color: '#f59e0b' },
        modal: {
          ondismiss: () => {
            if (!mounted.current) return;
            setState((s) => (s === 'paying' ? 'cancelled' : s));
            setMessage('Payment cancelled. No review credits were added and you were not charged.');
          },
        },
        handler: (r: RazorpaySuccess) => { void verify(data, r); },
      });
      rz.on('payment.failed', (r) => {
        if (!mounted.current) return;
        setState('error');
        setMessage(r.error?.description ? `${r.error.description} No review credits were added.` : 'The payment failed. No review credits were added.');
      });
      rz.open();
    } catch (e) {
      if (!mounted.current) return;
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Razorpay checkout could not continue. No review credits were added.');
    }
  }

  return (
    <div className="paypal-checkout-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <section className="paypal-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="razorpay-checkout-title">
        <button className="paypal-checkout-close" type="button" onClick={onClose} disabled={busy} aria-label="Close Razorpay checkout"><X aria-hidden="true" /></button>

        <div className="paypal-checkout-heading">
          <span className="paypal-checkout-icon"><CreditCard aria-hidden="true" /></span>
          <div><span>Secure review-credit payment</span><h2 id="razorpay-checkout-title">{pack.display_name}</h2></div>
        </div>

        <div className="paypal-order-summary">
          <div><span>Review credits</span><strong>{pack.review_credits}</strong></div>
          <div><span>List price</span><strong>${pack.price_usd.toFixed(2)} USD</strong></div>
          <div><span>Credit validity</span><strong>{pack.validity_days} days</strong></div>
        </div>

        {state === 'success' ? (
          <div className="paypal-result paypal-result-success"><CheckCircle2 aria-hidden="true" /><div><strong>Payment completed</strong><p>{message}</p>{credits !== null && <span>{credits} {credits === 1 ? 'review credit is' : 'review credits are'} now available.</span>}</div></div>
        ) : state === 'pending' ? (
          <div className="paypal-result paypal-result-pending" role="status"><Clock3 aria-hidden="true" /><div><strong>Payment processing</strong><p>{message}</p></div></div>
        ) : state === 'error' ? (
          <div className="paypal-result paypal-result-error" role="alert"><AlertCircle aria-hidden="true" /><div><strong>Checkout needs attention</strong><p>{message}</p></div></div>
        ) : state === 'cancelled' ? (
          <div className="paypal-result paypal-result-cancelled"><AlertCircle aria-hidden="true" /><div><strong>Payment cancelled</strong><p>{message}</p></div></div>
        ) : (
          <div className="paypal-checkout-status" role="status">{busy && <LoaderCircle className="paypal-checkout-spinner" aria-hidden="true" />}<span>{message}</span></div>
        )}

        {(state === 'ready' || state === 'cancelled' || state === 'error') && (
          <button className="paypal-primary-action paypal-wide-action" type="button" onClick={() => void pay()}>
            {state === 'ready' ? 'Continue to Razorpay' : 'Try again'}
          </button>
        )}
        {state === 'ready' && onBack && <button className="paypal-secondary-action paypal-wide-action" type="button" onClick={onBack}>Choose another payment method</button>}
        {state === 'pending' && <button className="paypal-secondary-action paypal-wide-action" type="button" onClick={onClose}>Close, payment is still processing</button>}
        {state === 'success' && (
          <div className="paypal-success-actions">
            <button className="paypal-primary-action" type="button" onClick={onStartReview}>{successActionLabel}</button>
            <button className="paypal-secondary-action" type="button" onClick={onClose}>Close</button>
          </div>
        )}

        <div className="paypal-security-note"><LockKeyhole aria-hidden="true" /><span>Prices and credit quantities are checked on the server. Card, UPI and bank details are handled by Razorpay and never reach us. Charged in Indian rupees at today&apos;s conversion.</span></div>
        <div className="paypal-integrity-note"><ShieldCheck aria-hidden="true" /><span>One credit covers one supported SEHS IA draft. See our <a href="/refund-policy">Cancellation and Refund Policy</a>.</span></div>
      </section>
    </div>
  );
}
