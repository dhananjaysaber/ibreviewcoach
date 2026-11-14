import type { ReactNode } from 'react';
import './policy-pages.css';

export const CONTACT_EMAIL = 'support@ibiareview.com';
const UPDATED = '13 November 2026';

export const POLICY_ROUTES: Record<string, string> = {
  '/privacy-policy': 'privacy',
  '/refund-policy': 'refund',
  '/terms': 'terms',
  '/contact': 'contact',
};

export function getPolicyPage(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return POLICY_ROUTES[clean] ?? null;
}

type Section = { heading: string; body: ReactNode };

const mail = (
  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
);

const PAGES: Record<string, { title: string; intro: string; sections: Section[] }> = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'IB IA Review ("we", "us") coaches IB students on their Internal Assessment drafts. This policy explains what we collect, why, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: (
          <ul>
            <li>Account details: your name and email address, and your sign-in credentials (passwords are stored hashed by our authentication provider, never in plain text).</li>
            <li>Your uploads: the IA documents you submit, the subject and academic year you choose, and the reviews, marks and annotated copies prepared from them.</li>
            <li>Purchase records: the review-credit pack you bought, the amount, the date and a payment reference. We do not receive or store your card, UPI or bank details; these are handled by the payment processor.</li>
            <li>Basic technical data such as browser type and error logs, used to keep the service running and secure.</li>
          </ul>
        ),
      },
      {
        heading: 'How we use it',
        body: (
          <ul>
            <li>To prepare your review, marks, annotated copy and fix plan, and to let you reopen them later.</li>
            <li>To manage your account, review credits, receipts and support requests.</li>
            <li>To maintain, secure and improve the service.</li>
          </ul>
        ),
      },
      {
        heading: 'Your documents',
        body: (
          <p>
            Your IA is analysed on our own hosted model to prepare your review. Your work is not used to train public models, it is not submitted to plagiarism or similarity checkers, and it is not sold or shared with other students. Depending on the review option you choose, your report is either prepared by our system alone (as with the free review) or reviewed, marked and approved by an authorised IB moderator before it is released to you. Where a moderator reviews your report, your document is visible only to you and to that moderator. Original uploaded files are kept for up to 6 months so you can download them again. You can use <strong>Delete original IA</strong> on a saved report at any time to remove the uploaded file; you can also ask us to delete your account and data by emailing {mail}.
          </p>
        ),
      },
      {
        heading: 'Who we share data with',
        body: (
          <p>
            We do not sell personal data. We share it only with service providers that help us run the product: hosting and database providers (for example Netlify and Supabase) and payment processors (for example Razorpay and PayPal). They process data only to provide their service. We may also disclose information if required by law.
          </p>
        ),
      },
      {
        heading: 'Cookies and storage',
        body: (
          <p>
            We use essential browser storage to keep you signed in and to remember settings such as light or dark theme. We do not use advertising cookies.
          </p>
        ),
      },
      {
        heading: 'Security',
        body: (
          <p>
            Data is encrypted in transit (HTTPS) and access to stored files is restricted to your account. No online service can promise perfect security, but we take reasonable steps to protect your information.
          </p>
        ),
      },
      {
        heading: 'Your rights and children',
        body: (
          <p>
            You may ask to access, correct or delete your personal data at any time by emailing {mail}. The service is intended for IB Diploma students; if a student is under 18, we recommend a parent or guardian is aware of the account and any purchase.
          </p>
        ),
      },
      {
        heading: 'Changes and contact',
        body: (
          <p>
            We may update this policy and will change the date above when we do. Questions: {mail}.
          </p>
        ),
      },
    ],
  },
  refund: {
    title: 'Cancellation and Refund Policy',
    intro:
      'IB IA Review sells digital review credits. Nothing is shipped, so there is no physical return. Please read this policy before you buy.',
    sections: [
      {
        heading: 'What you are buying',
        body: (
          <p>
            A review credit covers one supported IA draft review (marks, annotated copy and fix plan). Credits are sold as one-time packs, not as a subscription, so there is no automatic renewal. Each pack shows its validity period on the pricing page, and you can use your credits whenever you like within that period.
          </p>
        ),
      },
      {
        heading: 'Cancellation',
        body: (
          <p>
            Credits are added to your account as soon as your payment succeeds, so an order cannot be cancelled once payment is complete. If you have not completed payment, no charge is made and nothing needs to be cancelled.
          </p>
        ),
      },
      {
        heading: 'No refunds once paid',
        body: (
          <p>
            All payments for review credits are final and non-refundable once payment is complete, whether or not the credits have been used. Please check the pack and amount before you pay.
          </p>
        ),
      },
      {
        heading: 'If something goes wrong, you keep your credit',
        body: (
          <ul>
            <li>A credit is used only when a complete review has been delivered to you successfully.</li>
            <li>If your document cannot be read, or the review fails or is not produced because of an error on our side, no credit is used. The credit stays in your account and you can submit again at any time.</li>
          </ul>
        ),
      },
      {
        heading: 'Payment problems',
        body: (
          <p>
            If you are charged twice, charged a different amount from the pack you chose, or your payment succeeds but the credits do not appear in your account, email {mail} with your payment reference. We will correct it by adding the credits or refunding the extra amount to the original payment method. Banks and card issuers usually take 5 to 7 business days to show a refund.
          </p>
        ),
      },
      {
        heading: 'Contact',
        body: (
          <p>
            Email {mail} from your account email with your purchase date and payment reference. We aim to reply within 2 business days.
          </p>
        ),
      },
      {
        heading: 'Delivery',
        body: (
          <p>
            Credits are added to your account immediately after a successful payment. Reviews are delivered online inside your account; nothing is shipped.
          </p>
        ),
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'By creating an account or buying credits on IB IA Review you agree to these terms.',
    sections: [
      {
        heading: 'The service',
        body: (
          <p>
            IB IA Review gives feedback and marks against the official criteria on IB Internal Assessment drafts. It is an independent educational tool. It is not affiliated with or endorsed by the International Baccalaureate Organization. Final marks are decided by your teacher and the IB. Depending on the review option you choose, a report is either prepared by our system alone (the free review, which is automated and is not reviewed by a moderator) or reviewed, marked and approved by an authorised IB moderator before it is released to you.
          </p>
        ),
      },
      {
        heading: 'Academic honesty',
        body: (
          <p>
            The service coaches; it does not write your work for you. You are responsible for the originality of what you submit to your school and the IB, and you must only upload work you have the right to upload.
          </p>
        ),
      },
      {
        heading: 'Accounts and credits',
        body: (
          <p>
            Keep your sign-in details private. Review credits are personal, non-transferable and valid for the period stated on the pricing page. Prices are shown before you pay and may change for future purchases. Payments are non-refundable once complete, and a credit is not used if a review fails because of an error on our side, as set out in the <a href="/refund-policy">Cancellation and Refund Policy</a>.
          </p>
        ),
      },
      {
        heading: 'Acceptable use',
        body: (
          <p>
            Do not misuse the service, attempt to break or overload it, share your account, or upload unlawful or harmful content. We may suspend accounts that do.
          </p>
        ),
      },
      {
        heading: 'Limits of liability',
        body: (
          <p>
            Feedback is guidance only and we cannot guarantee any particular IB mark. To the extent the law allows, our liability is limited to the amount you paid for the credits concerned.
          </p>
        ),
      },
      {
        heading: 'Contact',
        body: <p>Questions about these terms: {mail}. See also our <a href="/privacy-policy">Privacy Policy</a>.</p>,
      },
    ],
  },
  contact: {
    title: 'Contact Us',
    intro: 'Questions about reviews, payments, refunds or your data? Write to us.',
    sections: [
      {
        heading: 'Email',
        body: (
          <p>
            {mail}
            <br />
            We aim to reply within 2 business days.
          </p>
        ),
      },
      {
        heading: 'Business details',
        body: (
          <p>
            IB IA Review, operated by Dhananjay Kumar, New Delhi, India.
          </p>
        ),
      },
      {
        heading: 'Helpful to include',
        body: (
          <ul>
            <li>The email you signed up with.</li>
            <li>For payment questions: the purchase date and payment reference.</li>
            <li>For review problems: the file name and the time you uploaded it.</li>
          </ul>
        ),
      },
    ],
  },
};

export function PolicyLinks({ className = '' }: { className?: string }) {
  return (
    <nav className={`policy-links ${className}`} aria-label="Legal and support">
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/refund-policy">Refund Policy</a>
      <a href="/terms">Terms</a>
      <a href="/contact">Contact</a>
      <a href="/sehs-ia-guides/">SEHS IA Guides</a>
      <a href="/sehs-ia-criteria/">SEHS IA Criteria</a>
      <a href="/sehs-ia-topic-ideas/">Topic Ideas</a>
    </nav>
  );
}

export default function PolicyPage({ page }: { page: string }) {
  const content = PAGES[page];
  document.title = `${content.title} | IB IA Review`;

  return (
    <div className="policy-shell">
      <header className="policy-top">
        <a className="policy-brand" href="/">IB IA Review</a>
        <a className="policy-back" href="/">← Back to home</a>
      </header>
      <main className="policy-main">
        <h1>{content.title}</h1>
        <p className="policy-updated">Last updated: {UPDATED}</p>
        <p className="policy-intro">{content.intro}</p>
        {content.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body}
          </section>
        ))}
      </main>
      <footer className="policy-foot">
        <PolicyLinks />
        <p>© {new Date().getFullYear()} IB IA Review. Independent educational tool, not affiliated with the International Baccalaureate Organization.</p>
      </footer>
    </div>
  );
}
