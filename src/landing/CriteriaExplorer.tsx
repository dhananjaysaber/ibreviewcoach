import React, { useState } from 'react';
import { SEHS_CRITERIA, type SehsCriterion, type SehsLevel } from './sehs-criteria';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CriteriaExplorer: React.FC<{ onOpenUpload: () => void }> = ({ onOpenUpload }) => {
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<'RD' | 'DA' | 'CO' | 'EV'>('RD');
  const [band, setBand] = useState<SehsLevel>('5-6');
  const BANDS: SehsLevel[] = ['1-2', '3-4', '5-6'];

  const currentCriteria: SehsCriterion =
    SEHS_CRITERIA.find((c) => c.id === selectedCriteriaId) || SEHS_CRITERIA[0];

  return (
    <section id="criteria" className="py-20 bg-[#f4f1ea] dark:bg-[#0b1120] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            SEHS Criteria
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            Marked against the SEHS strands your teacher uses
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Eleven strands across Research design, Data analysis, Conclusion and Evaluation, 6 marks each. Pick a criterion and a level to read the exact strand descriptors, and what a teacher checks.
          </p>
        </div>

        {/* 4 Criteria Selector Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {SEHS_CRITERIA.map((criterion) => {
            const isSelected = criterion.id === selectedCriteriaId;
            return (
              <button
                key={criterion.id}
                onClick={() => {
                  setSelectedCriteriaId(criterion.id);
                  setBand('5-6');
                }}
                className={`p-5 rounded-2xl text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-[#15223c] border-amber-500 dark:border-amber-400 shadow-xl shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : 'bg-white/80 dark:bg-[#121a2d] border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-[#162139] shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif font-bold text-2xl text-amber-600 dark:text-amber-400">
                    {criterion.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {criterion.maxMark} marks
                  </span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base mb-1">
                  {criterion.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{criterion.strands.length} strands: {criterion.strands.map((x) => x.name).join(', ')}</div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Panel */}
        <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-slate-700/80">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                Criterion {currentCriteria.id}
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
                {currentCriteria.name} (max {currentCriteria.maxMark} marks)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{currentCriteria.strands.length} strands · IB SEHS internal assessment</p>
            </div>

            {/* Band selector buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1120] rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
              {BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBand(b)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    band === b
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {b.replace('-', '–')} marks
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Official Markband Descriptor */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-4">
                {currentCriteria.strands.map((st) => (
                  <div key={st.id} className="bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{st.id} · {st.name}</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{band.replace('-', '–')} marks</span>
                    </div>
                    <p className="text-base text-slate-800 dark:text-slate-100 font-serif leading-relaxed italic">“{st.levels[band]}”</p>
                  </div>
                ))}
              </div>

              {/* What We Verify */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-[#15233c] border border-amber-200/60 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>How our review marks this criterion</span>
                </div>
                <p className="leading-relaxed">
                  We read each {currentCriteria.name} strand against the SEHS strand descriptors, find the evidence in your draft for it, and show exactly what would move it up a level.
                </p>
              </div>
            </div>

            {/* Right: Common Pitfalls that Lose Marks */}
            <div className="lg:col-span-5 relative bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>What the teacher checks</span>
              </div>
              {(() => {
                const all = currentCriteria.strands.flatMap((st) => st.checks.map((chk) => ({ id: st.id, chk })));
                const shown = all.slice(0, 3);
                const hidden = all.slice(3);
                return (
                  <>
                    <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      {shown.map((x, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">✓</span>
                          <span className="leading-relaxed"><strong className="font-mono text-xs mr-1.5 text-slate-500 dark:text-slate-400">{x.id}</strong>{x.chk}</span>
                        </li>
                      ))}
                    </ul>
                    {hidden.length > 0 && (
                      <div className="relative mt-3.5">
                        <ul aria-hidden="true" className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 blur-[5px] select-none pointer-events-none">
                          {hidden.slice(0, 4).map((x, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0 mt-0.5">✓</span>
                              <span className="leading-relaxed">{'locked check '.repeat(Math.max(3, Math.round(x.chk.length / 14))).trim()}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 bg-gradient-to-b from-transparent via-slate-50/60 dark:via-[#0d1527]/60 to-slate-50 dark:to-[#0d1527]">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">+{hidden.length} more checks for {currentCriteria.name}</span>
                          <button onClick={onOpenUpload} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer">Start a review to know more</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
