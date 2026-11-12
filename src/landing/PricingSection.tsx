import React from 'react';
import { Check } from 'lucide-react';

export interface LandingPack {
  pack_code: string;
  display_name: string;
  description: string;
  review_credits: number;
  price_usd: number;
  validity_days: number;
  is_featured: boolean;
  display_order: number;
}

interface PricingSectionProps {
  packs: LandingPack[];
  paymentsEnabled: boolean;
  onChoosePack: (pack: LandingPack) => void;
  onStart: () => void;
}

const FEATURES = [
  'All four criteria reviewed, marked out of 24',
  'Detailed findings for every criterion',
  'Annotated copy of your IA with Word download',
  'Step-by-step fix plan with completion checks',
  'Report saved in My IA Reports',
];

export const PricingSection: React.FC<PricingSectionProps> = ({ packs, paymentsEnabled, onChoosePack, onStart }) => {
  return (
    <section id="pricing" className="py-20 bg-[#f4f1ea] dark:bg-[#0b1120] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Transparent Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            Simple review-credit pricing
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Your first review is free and covers Research Design only. One credit unlocks a full four-criterion review of one draft, with marks. Purchased credits stay valid for 365 days, so you can revise at your own pace.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 gap-6 lg:gap-8 items-stretch mb-12 ${paymentsEnabled ? 'md:grid-cols-2 lg:grid-cols-4' : 'max-w-md mx-auto'}`}>
          <div className="rounded-3xl p-8 flex flex-col justify-between relative bg-gradient-to-b from-amber-300 to-amber-400 text-slate-950 border-2 border-amber-500 shadow-2xl shadow-amber-500/30">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-slate-950 text-amber-300 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">Start here</span>
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold mb-1">Free review</h3>
              <p className="text-xs min-h-[32px] text-slate-800">Try the review on your own IA.</p>
              <div className="mb-6 pb-6 border-b border-slate-950/15">
                <span className="text-4xl sm:text-5xl font-serif font-bold tracking-tight">$0</span>
                <div className="text-xs font-semibold mt-1">1 per verified account · no card needed</div>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm mb-8">
                {['Research Design reviewed with written feedback', 'No marks shown on the free review', 'Other 3 criteria, marks and annotated copy locked', paymentsEnabled ? 'Fix plan and Word download unlock with a credit' : 'Fix plan and Word download come with the full review'].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={onStart}
              className="w-full py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-slate-950 text-amber-300 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Try my free review
            </button>
          </div>
          {(paymentsEnabled ? packs : []).map((pack) => {
            const popular = pack.is_featured;
            return (
              <div
                key={pack.pack_code}
                className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                  popular
                    ? 'bg-gradient-to-b from-amber-500/15 via-[#15213b] to-[#10182c] border-2 border-amber-400 shadow-2xl shadow-amber-500/20 ring-1 ring-amber-400/40'
                    : 'bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-lg shadow-black/30'
                }`}
              >
                {popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">Most popular</span>
                  </div>
                )}
                <div>
                  <div className="mb-4">
                    <h3 className={`text-xl font-serif font-bold mb-1 ${popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{pack.display_name}</h3>
                    <p className={`text-xs min-h-[32px] ${popular ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>{pack.description}</p>
                  </div>
                  <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/80">
                    <span className={`text-4xl sm:text-5xl font-serif font-bold tracking-tight ${popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>${pack.price_usd}</span>
                    <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                      {pack.review_credits} full {pack.review_credits === 1 ? 'review' : 'reviews'} · valid {pack.validity_days} days
                    </div>
                  </div>
                  <ul className={`space-y-2.5 text-xs sm:text-sm mb-8 ${popular ? 'text-slate-200' : 'text-slate-700 dark:text-slate-200'}`}>
                    {FEATURES.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => (paymentsEnabled ? onChoosePack(pack) : onStart())}
                  className={`w-full py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                    popular
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1a253e] dark:hover:bg-[#243354] text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 shadow-sm'
                  }`}
                >
                  {paymentsEnabled ? `Buy ${pack.display_name}` : 'Start a review'}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
