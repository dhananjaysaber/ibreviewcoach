import React, { useState } from 'react';
import { OFFICIAL_CRITERIA, type CriteriaBreakdownItem } from './ia-review-logic';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CriteriaExplorer: React.FC = () => {
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<'RD' | 'DA' | 'CO' | 'EV'>('RD');
  const [activeBandIndex, setActiveBandIndex] = useState<number>(0);

  const currentCriteria: CriteriaBreakdownItem =
    OFFICIAL_CRITERIA.find((c) => c.id === selectedCriteriaId) || OFFICIAL_CRITERIA[0];

  return (
    <section id="criteria" className="py-20 bg-[#f4f1ea] dark:bg-[#0b1120] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            The 24-Mark Matrix
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            Marked against what the IB moderator reads
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Eleven official strands across the four IB criteria. Explore the markband descriptors and common traps below.
          </p>
        </div>

        {/* 4 Criteria Selector Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {OFFICIAL_CRITERIA.map((criterion) => {
            const isSelected = criterion.id === selectedCriteriaId;
            return (
              <button
                key={criterion.id}
                onClick={() => {
                  setSelectedCriteriaId(criterion.id);
                  setActiveBandIndex(0);
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
                    {criterion.maxMark} Marks ({criterion.weightPercent}%)
                  </span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base mb-1">
                  {criterion.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2">
                  {criterion.summary}
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Panel */}
        <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200 dark:border-slate-700/80">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                Criterion {currentCriteria.id} Deep Dive
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
                {currentCriteria.name} (Max {currentCriteria.maxMark} Marks)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{currentCriteria.strand}</p>
            </div>

            {/* Band selector buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#0b1120] rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
              {currentCriteria.descriptors.map((desc, idx) => (
                <button
                  key={desc.range}
                  onClick={() => setActiveBandIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    activeBandIndex === idx
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {desc.range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Official Markband Descriptor */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Official IB Markband Descriptor
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {currentCriteria.descriptors[activeBandIndex].range}
                  </span>
                </div>
                <p className="text-base text-slate-800 dark:text-slate-100 font-serif leading-relaxed italic">
                  "{currentCriteria.descriptors[activeBandIndex].description}"
                </p>
              </div>

              {/* What We Verify */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-[#15233c] border border-amber-200/60 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-200 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>How Our Review Evaluates This Criterion</span>
                </div>
                <p className="leading-relaxed">
                  We check each strand of {currentCriteria.name} against the official IB markband descriptors. We pinpoint missing control variables, unstated instrument errors, or unsubstantiated conclusions before your school marks the draft.
                </p>
              </div>
            </div>

            {/* Right: Common Pitfalls that Lose Marks */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Common Candidate Pitfalls</span>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                {currentCriteria.pitfalls.map((pitfall, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-rose-500 dark:text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                    <span className="leading-relaxed">{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
