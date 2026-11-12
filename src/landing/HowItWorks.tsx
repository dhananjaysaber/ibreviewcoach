import React from 'react';
import { UploadCloud, CheckSquare2, FileCheck } from 'lucide-react';

interface HowItWorksProps {
  onOpenUpload: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenUpload }) => {
  const steps = [
    {
      number: '01',
      title: 'Upload your IA draft',
      description:
        'Upload your current Internal Assessment as a PDF or Word document (.docx). Specify your subject, SL or HL level, and any particular section concerns.',
      detail: 'Encrypted transfer · Complete privacy · Preserves mathematical notation and graphs'
    },
    {
      number: '02',
      title: 'Get marked and annotated',
      description:
        'Receive your exact score breakdown out of 24 marks against the official IB strands. Detailed margin notes highlight specific sentences that risk losing marks.',
      detail: 'Official IB descriptors · Specific line citations · Highlighted uncertainty gaps'
    },
    {
      number: '03',
      title: 'Execute your prioritized fix plan',
      description:
        'Follow a clear, plain-English roadmap explaining how to rewrite weak justifications, recalculate error bounds, and elevate your draft before teacher submission.',
      detail: 'Before-and-after rewrite examples · Draft comparison tracker · Teacher-ready export'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-[#faf8f5] dark:bg-[#0e1627] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            The Review Workflow
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            A clear path from rough draft to final submission
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Eliminate examiner guesswork. Understand the exact reasons for your marks before your school teacher or IB external moderator reads your paper.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-7 flex flex-col justify-between relative group hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-lg shadow-black/20"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="font-serif text-3xl font-bold text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-[#1a253e] text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-slate-700">
                    {step.number === '01' && <UploadCloud className="w-5 h-5" />}
                    {step.number === '02' && <CheckSquare2 className="w-5 h-5" />}
                    {step.number === '03' && <FileCheck className="w-5 h-5" />}
                  </div>
                </div>

                <h3 className="text-xl font-serif font-semibold text-slate-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 text-xs text-slate-500 dark:text-slate-400 font-sans">
                {step.detail}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Try Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-blue-500/10 dark:from-amber-500/15 dark:via-[#141f36] dark:to-blue-900/20 border border-amber-400/40 dark:border-amber-400/40 p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg font-serif font-semibold text-slate-900 dark:text-white">
              Ready to see what an examiner will flag?
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Start your draft diagnostic now with our secure review simulator.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="px-5 py-3 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upload Your Draft Now
          </button>
        </div>
      </div>
    </section>
  );
};
