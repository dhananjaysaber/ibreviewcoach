import { CreditCard, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadAppSettings } from '../lib/rightClick';
import { PayPalCheckoutModal, type PayPalCreditPack } from './PayPalCheckoutModal';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

type Props = { pack: PayPalCreditPack; onClose: () => void; onStartReview: () => void; successActionLabel?: string };

/** Lets the student pick Razorpay (UPI, cards, netbanking in rupees) or PayPal (USD). */
export function CheckoutRouter(props: Props) {
  const [method, setMethod] = useState<'razorpay' | 'paypal' | null>(null);
  const [paypalOn, setPaypalOn] = useState<boolean | null>(null);
  useEffect(() => { let alive = true; void loadAppSettings().then((v) => { if (alive) setPaypalOn(v.paypal_enabled !== false); }); return () => { alive = false; }; }, []);
  if (paypalOn === null) return null;
  if (!paypalOn) return <RazorpayCheckoutModal {...props} />;
  if (method === 'paypal') return <PayPalCheckoutModal {...props} />;
  if (method === 'razorpay') return <RazorpayCheckoutModal {...props} onBack={() => setMethod(null)} />;
  const { pack, onClose } = props;
  return (
    <div className="paypal-checkout-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="paypal-checkout-modal pay-choose" role="dialog" aria-modal="true" aria-labelledby="pay-method-title">
        <button className="paypal-checkout-close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        <div className="pay-choose-head">
          <span className="pay-choose-icon"><CreditCard aria-hidden="true" /></span>
          <div><small>Choose how to pay</small><h2 id="pay-method-title">{pack.display_name}</h2></div>
        </div>
        <div className="pay-choose-options">
        <button className="pay-opt pay-opt-primary" type="button" onClick={() => setMethod('razorpay')}><strong>Pay in rupees</strong><span>UPI, cards, netbanking · Razorpay</span></button>
        <button className="pay-opt" type="button" onClick={() => setMethod('paypal')}><strong>Pay in US dollars</strong><span>PayPal · ${pack.price_usd.toFixed(2)}</span></button>
        </div>
        <p className="pay-choose-note">Secure checkout. Your card details never touch our servers.</p>
      </section>
    </div>
  );
}
