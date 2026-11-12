import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import './landing-tw.css';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { InteractiveSample } from './InteractiveSample';
import { SubjectGrid } from './SubjectGrid';
import { HowItWorks } from './HowItWorks';
import { CriteriaExplorer } from './CriteriaExplorer';
import { AcademicIntegrity } from './AcademicIntegrity';
import { PricingSection, type LandingPack } from './PricingSection';
import { FaqSection } from './FaqSection';
import { Footer } from './Footer';

type Props = {
  packs: LandingPack[];
  paymentsEnabled: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onOpenExemplars: () => void;
  onChoosePack: (pack: LandingPack) => void;
};

export function NewLanding({ packs, paymentsEnabled, onStart, onSignIn, onOpenExemplars, onChoosePack }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('ibia_theme') as 'light' | 'dark') || 'dark'; } catch { return 'dark'; }
  });
  useEffect(() => { try { localStorage.setItem('ibia_theme', theme); } catch { /* ignore */ } }, [theme]);

  return (
    <div className={`ibia-landing ${theme === 'dark' ? 'dark' : ''} bg-[#faf8f5] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 font-sans`}>
      <Navbar onOpenUpload={onStart} onSignIn={onSignIn} onOpenExemplars={onOpenExemplars} theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <main>
        <Hero onOpenUpload={onStart} onOpenExemplar={onOpenExemplars} />
        <InteractiveSample onOpenUpload={onStart} />
        <SubjectGrid onSelectSubjectForReview={onStart} />
        <HowItWorks onOpenUpload={onStart} />
        <CriteriaExplorer onOpenUpload={onStart} />
        <AcademicIntegrity />
        <PricingSection packs={packs} paymentsEnabled={paymentsEnabled} onChoosePack={onChoosePack} onStart={onStart} />
        <FaqSection />
        <section className="py-20 bg-gradient-to-b from-[#f4f1ea] to-[#eeeae2] dark:from-[#0d1527] dark:to-[#090e1a] border-t border-slate-200/80 dark:border-slate-700/80 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-amber-300 dark:border-amber-400/20">
              <Sparkles className="w-3.5 h-3.5" /><span>Prioritize your revisions today</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-5">Ready to elevate your IB Internal Assessment?</h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">Your first review is free. Upload your draft, see your mark projection and how the review works, then unlock the complete annotated copy and fix plan when you are ready.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={onStart} className="inline-flex items-center gap-2 px-7 py-4 text-base font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl shadow-xl shadow-amber-500/20 cursor-pointer"><span>Try your first review free</span><ArrowRight className="w-4 h-4" /></button>
              <button onClick={onOpenExemplars} className="inline-flex items-center gap-2 px-6 py-4 text-base font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer">View exemplars</button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span>Your file stays private and is never submitted to similarity checkers</span></div>
          </div>
        </section>
      </main>
      <Footer onOpenUpload={onStart} onOpenExemplar={onOpenExemplars} />
    </div>
  );
}
