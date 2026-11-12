import React, { useState } from 'react';
import { SAMPLE_SECTIONS, type AnnotationPoint } from './mock-reviews';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, FileText, Eye } from 'lucide-react';

interface InteractiveSampleProps {
  onOpenUpload: () => void;
}

export const InteractiveSample: React.FC<InteractiveSampleProps> = ({ onOpenUpload }) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(SAMPLE_SECTIONS[0].id);
  const currentSection = SAMPLE_SECTIONS.find((s) => s.id === activeSectionId) || SAMPLE_SECTIONS[0];
  const [activeAnnotationId, setActiveAnnotationId] = useState<number>(1);
  const [showFixedRewrite, setShowFixedRewrite] = useState<boolean>(false);

  const activeAnnotation: AnnotationPoint =
    currentSection.annotations.find((a) => a.id === activeAnnotationId) || currentSection.annotations[0];

  return (
    <section id="interactive-demo" className="py-20 bg-[#faf8f5] dark:bg-[#090e1a] relative overflow-hidden border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-48 w-[30rem] h-[30rem] bg-[radial-gradient(closest-side,rgba(245,158,11,0.12),transparent)] pointer-events-none" />
      <div className="absolute bottom-10 -right-48 w-[30rem] h-[30rem] bg-[radial-gradient(closest-side,rgba(37,99,235,0.10),transparent)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Interactive Examiner Demo
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            See how your draft transforms into an examiner-ready paper
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Click across real student draft excerpts below to inspect line-by-line examiner annotations, strand diagnostics, and the exact step-by-step fix instruction.
          </p>
        </div>

        {/* Section Picker Tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {SAMPLE_SECTIONS.map((sec) => {
            const isActive = sec.id === activeSectionId;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSectionId(sec.id);
                  setActiveAnnotationId(1);
                  setShowFixedRewrite(false);
                }}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-400/20'
                    : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                <span>{sec.title}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pg {sec.pageNumber}
                </span>
              </button>
            );
          })}
        </div>

        {/* Two-Column Interactive Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Academic Paper Mockup */}
          <div className="lg:col-span-7 bg-[#fffefb] dark:bg-[#fbf9f5] text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl border border-amber-300/60 dark:border-amber-200/40 relative">
            {/* Header bar of sample report */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-200 text-xs text-slate-600 font-sans">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-slate-800">
                  SEHS IA Draft · Candidate 003892
                </span>
                <span aria-hidden="true">·</span>
                <span>Page {currentSection.pageNumber} of 12</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-950 font-medium px-2 py-0.5 rounded text-[11px]">
                  Current: {currentSection.currentScore}
                </span>
                <span className="text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  Potential: {currentSection.potentialScore}
                </span>
              </div>
            </div>

            {/* Document Content View */}
            <div className="prose prose-slate max-w-none font-serif text-[15px] sm:text-base leading-relaxed text-slate-800 space-y-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-sans font-bold">
                Section: {currentSection.title}
              </div>

              {/* View mode toggle: Raw Annotated vs Before/After */}
              <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative">
                <div className="flex items-center justify-between mb-3 font-sans text-xs">
                  <span className="text-slate-600 font-medium">Click pinned highlights to inspect:</span>
                  <button
                    onClick={() => setShowFixedRewrite(!showFixedRewrite)}
                    className="flex items-center gap-1.5 text-xs font-sans font-semibold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/70 px-3 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showFixedRewrite ? 'View Original Text' : 'View Proposed Rewrite'}</span>
                  </button>
                </div>

                {!showFixedRewrite ? (
                  <div className="space-y-4">
                    {currentSection.id === 'methodology' && (
                      <p>
                        Participants completed three trials on a 20 m sprint track after a standardized 5-minute dynamic warm-up. Sprint times were recorded with a handheld digital stopwatch (accuracy ±0.01 s).{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(1)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 1
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            1
                          </span>
                          The same tester started and stopped the timer for every trial
                        </button>{' '}
                        to avoid inter-operator discrepancies, and data were manually entered into Table 1.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(2)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 2
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            2
                          </span>
                          Rest intervals between sprints were kept around two minutes
                        </button>{' '}
                        before the next trial was administered.
                      </p>
                    )}

                    {currentSection.id === 'data-processing' && (
                      <p>
                        Table 2 outlines the calculated mean sprint velocities across all 5 conditions.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(1)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 1
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            1
                          </span>
                          The average speed was calculated by dividing distance (20 m) by the mean time
                        </button>
                        .{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(2)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 2
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            2
                          </span>
                          Standard deviations were plotted on Figure 3
                        </button>{' '}
                        to illustrate the dispersion of scores across the experimental sample.
                      </p>
                    )}

                    {currentSection.id === 'conclusion' && (
                      <p>
                        In conclusion, the data demonstrates that elevated ambient relative humidity noticeably impairs 20 m sprint acceleration in adolescent athletes.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(1)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 1
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            1
                          </span>
                          Athletes tested under 80% relative humidity recorded sprint times 0.18 seconds slower than under 45% relative humidity
                        </button>
                        , supporting my experimental hypothesis.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(2)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 2
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            2
                          </span>
                          This outcome agrees with common knowledge in sports science
                        </button>{' '}
                        that humid conditions hinder evaporative thermoregulation and increase physiological strain.
                      </p>
                    )}

                    {currentSection.id === 'evaluation' && (
                      <p>
                        A limitation of this study was human error when clicking the stopwatch buttons.{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(1)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 1
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            1
                          </span>
                          In future trials, I would recruit more participants and take more time
                        </button>{' '}
                        to obtain better averages. Furthermore,{' '}
                        <button
                          type="button"
                          onClick={() => setActiveAnnotationId(2)}
                          className={`inline text-left transition-all px-1 py-0.5 rounded cursor-pointer ${
                            activeAnnotationId === 2
                              ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-500 font-medium'
                              : 'bg-amber-200/80 text-amber-950 hover:bg-amber-300'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-white font-sans text-[10px] font-bold mr-1 align-middle">
                            2
                          </span>
                          the room temperature varied slightly between test days
                        </button>
                        , which may have influenced the athletes’ fatigue levels.
                      </p>
                    )}
                  </div>
                ) : (
                  /* Fixed Exemplar Rewrite View */
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs font-sans text-amber-950 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        Showing the student’s revised draft incorporating the examiner’s step-by-step fix instruction for Pin #{activeAnnotation.id}:
                      </span>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-slate-900 text-sm italic font-serif leading-relaxed">
                      "{activeAnnotation.afterSnippet}"
                    </div>
                    <p className="text-xs font-sans text-slate-600">
                      ✓ Resolves <strong>{activeAnnotation.strandName}</strong> and upgrades this section toward <strong>{currentSection.potentialScore}</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom note */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-sans">
              <span>Annotated with IB Markband Descriptors</span>
              <span className="text-slate-800 font-medium">Click Pin 1 or Pin 2 to switch feedback</span>
            </div>
          </div>

          {/* Right Column: Live Diagnostic & Fix Plan Card */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-xl dark:shadow-2xl dark:shadow-black/50 relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(closest-side,rgba(245,158,11,0.15),transparent)] pointer-events-none" />

              {/* Pin identifier badge & score impact */}
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center">
                    {activeAnnotation.id}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Pin #{activeAnnotation.id} Finding
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-700/80 px-2.5 py-0.5 rounded-md">
                  {activeAnnotation.scoreImpact}
                </span>
              </div>

              {/* IB Strand */}
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300 font-medium">
                  IB Rubric Strand
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeAnnotation.strandName}
                </div>
              </div>

              {/* Diagnostic Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#162238] border border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>Examiner Diagnostic</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-white font-serif leading-relaxed">
                  "{activeAnnotation.diagnostic}"
                </p>
              </div>

              {/* Actionable Fix Instruction */}
              <div className="mb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Step-by-Step Fix Action</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-100 leading-relaxed bg-amber-50/50 dark:bg-[#18233d] p-3.5 rounded-xl border border-amber-200/60 dark:border-slate-700">
                  {activeAnnotation.fixInstruction}
                </p>
              </div>

              {/* Before vs After snippet preview */}
              <div className="space-y-2 mb-6 text-xs">
                <div className="text-slate-600 dark:text-slate-300 font-medium">Original Draft Phrasing:</div>
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100 font-serif">
                  "{activeAnnotation.beforeSnippet}"
                </div>

                <div className="text-slate-600 dark:text-slate-300 font-medium pt-1">Sample Resolved Phrasing:</div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 font-serif">
                  "{activeAnnotation.afterSnippet}"
                </div>
              </div>

              {/* CTA from within demo */}
              <button
                onClick={onOpenUpload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Upload your draft for this exact breakdown</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
