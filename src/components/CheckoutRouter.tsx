import { CreditCard, X } from 'lucide-react';
import { useState } from 'react';
import { PayPalCheckoutModal, type PayPalCreditPack } from './PayPalCheckoutModal';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';

type Props = { pack: PayPalCreditPack; onClose: () => void; onStartReview: () => void; successActionLabel?: string };

/** Lets the student pick Razorpay (UPI, cards, netbanking in rupees) or PayPal (USD). */
export function CheckoutRouter(props: Props) {
  const [method, setMethod] = useState<'razorpay' | 'paypal' | null>(null);
  if (method === 'paypal') return <PayPalCheckoutModal {...props} />;
  if (method === 'razorpay') return <RazorpayCheckoutModal {...props} onBack={() => setMethod(null)} />;
  const { pack, onClose } = props;
  return (
    <div className="paypal-checkout-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="paypal-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="pay-method-title">
        <button className="paypal-checkout-close" type="button" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></button>
        <div className="paypal-checkout-heading">
          <span className="paypal-checkout-icon"><CreditCard aria-hidden="true" /></span>
          <div><span>Choose how to pay</span><h2 id="pay-method-title">{pack.display_name}</h2></div>
        </div>
        <button className="paypal-primary-action paypal-wide-action" type="button" onClick={() => setMethod('razorpay')}>Pay in rupees: UPI, cards, netbanking (Razorpay)</button>
        <button className="paypal-secondary-action paypal-wide-action" type="button" onClick={() => setMethod('paypal')}>Pay in US dollars (PayPal) — ${pack.price_usd.toFixed(2)}</button>
      </section>
    </div>
  );
}
