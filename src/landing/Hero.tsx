import React from 'react';
import { ArrowRight, ShieldCheck, BookOpen, CheckCircle, FileSearch } from 'lucide-react';

interface HeroProps {
  onOpenUpload: () => void;
  onOpenExemplar: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenUpload, onOpenExemplar }) => {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-[#faf8f5] dark:bg-[#090e1a] transition-colors">
      {/* Subtle radial ambient gradients */}
      <div className="absolute top-0 right-1/4 w-[700px] h-[600px] bg-[radial-gradient(closest-side,rgba(245,158,11,0.16),rgba(245,158,11,0.05)_60%,transparent)] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-[radial-gradient(closest-side,rgba(59,130,246,0.07),transparent)] pointer-events-none" />

      <div className="w-full px-5 sm:px-10 lg:px-16 2xl:px-24 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Main Left Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            {/* Editorial Kicker - clean unboxed metadata with responsive wrap */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span>Official 24-Mark IB Rubric</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">·</span>
              <span>SEHS Live Now</span>
              <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">·</span>
              <span>Sciences Coming Soon</span>
            </div>

            {/* Headline with text-wrap: balance */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-medium text-slate-900 dark:text-white tracking-tight leading-[1.15] text-balance">
              Know <span className="italic text-amber-700 dark:text-amber-300 underline decoration-amber-500/40 decoration-1 underline-offset-4">exactly what to fix</span> in your IB IA before it is marked.
            </h1>

            {/* Subhead / Lead */}
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-100 font-normal leading-relaxed max-w-2xl">
              Upload your draft. Get an examiner-grade annotated copy and a clear, step-by-step fix plan for every weak spot, marked against the official IB criteria. We coach your scientific writing—we never ghostwrite.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>Try your first review free</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>

              <button
                onClick={onOpenExemplar}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-base font-medium text-slate-800 dark:text-white bg-white dark:bg-[#151f38] hover:bg-slate-50 dark:hover:bg-[#1a2644] hover:text-slate-900 dark:hover:text-amber-300 border border-slate-300 dark:border-slate-600/80 rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <FileSearch className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>See Worked Example</span>
              </button>
            </div>

            <p className="text-sm font-medium text-amber-700 dark:text-amber-300 -mt-2">
              Your first review is free. No card needed. Upgrade only if you want the complete review.
            </p>

            {/* Proof & Trust Indicators - clean unboxed metadata */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600 dark:text-slate-200">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Your file stays 100% private</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Plain words for every student</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />
                <span>Annotated copy for teachers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Scoreboard & Live Report Snapshot */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Decorative vibrant backdrop halo */}
              <div className="absolute -inset-1.5 rounded-3xl shadow-[0_0_70px_8px_rgba(245,158,11,0.22)] pointer-events-none" />

              <div className="relative bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/90 rounded-2xl p-6 sm:p-7 shadow-xl dark:shadow-2xl dark:shadow-black/70 text-slate-900 dark:text-slate-100 backdrop-blur-sm transition-colors">
                {/* Header of Snapshot Card */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-400/40">
                      IB
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                        SEHS IA Diagnostic Report
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">Official 24-Mark Moderation</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-amber-600 dark:text-amber-400">18</span>
                    <span className="text-xs text-slate-500 dark:text-slate-300"> / 24</span>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Grade 6 Projected</div>
                  </div>
                </div>

                {/* Criteria breakdown mini-bars */}
                <div className="space-y-3 mb-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-800 dark:text-slate-100 font-medium">Research Design (RD)</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold font-mono">5 / 6</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-[83%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-800 dark:text-slate-100 font-medium">Data Analysis (DA)</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold font-mono">4 / 6</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-[66%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-800 dark:text-slate-100 font-medium">Conclusion (CO)</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold font-mono">5 / 6</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-[83%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-800 dark:text-slate-100 font-medium">Evaluation (EV)</span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold font-mono">4 / 6 (Upgrade Target)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 w-[66%]" />
                    </div>
                  </div>
                </div>

                {/* Sample Annotated Finding Card inside Hero */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#162238] border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-300">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Methodology · Page 3</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">Fix Priority 1</span>
                  </div>
                  <div className="p-2.5 rounded bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100 font-serif text-[13px] leading-relaxed">
                    "...<mark className="bg-amber-300/80 dark:bg-amber-400/40 text-slate-950 dark:text-amber-100 px-1 rounded font-semibold">The same tester started and stopped the timer for every trial</mark> and results were written in a table."
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 leading-normal pt-1">
                    <strong className="text-amber-700 dark:text-amber-400 font-semibold">Examiner instruction:</strong> Stated, not yet described. Define the exact sensory cue (sound vs back foot movement) and 90° operator positioning to eliminate parallax error.
                  </div>
                </div>

                {/* Fast Action */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-300 font-medium">Takes 3–5 min to review</span>
                  <button
                    onClick={onOpenUpload}
                    className="text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Check your draft now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
