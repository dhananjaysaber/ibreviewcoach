import React, { useState } from 'react';
import { IB_SUBJECTS } from './mock-reviews';
import { Bell, ArrowRight } from 'lucide-react';

interface SubjectGridProps {
  onSelectSubjectForReview: (subjectId: string) => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ onSelectSubjectForReview }) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Sciences' | 'Individuals & Societies'>('All');

  const filteredSubjects = IB_SUBJECTS.filter(
    (subj) => selectedCategory === 'All' || subj.category === selectedCategory
  );

  return (
    <section id="subjects" className="py-20 bg-[#f4f1ea] dark:bg-[#070b14] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Curriculum Coverage
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            IB IA review for your exact subject
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Reviews are live today for IB Sports, Exercise and Health Science (SEHS). Other IB subjects are coming soon.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-xl shadow-xs">
            {(['All', 'Sciences', 'Individuals & Societies'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat === 'All' ? 'All Subjects' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => {
            const isLive = subject.status === 'Live Now';

            return (
              <div
                key={subject.id}
                className={`group relative rounded-2xl p-6 sm:p-7 transition-all duration-200 border flex flex-col justify-between ${
                  isLive
                    ? 'bg-gradient-to-b from-amber-500/15 via-white to-amber-50/50 dark:from-amber-400/15 dark:via-[#141d33] dark:to-[#0e1628] border-amber-500/60 dark:border-amber-400/60 shadow-xl dark:shadow-2xl dark:shadow-amber-500/5 ring-1 ring-amber-400/30'
                    : 'bg-white dark:bg-[#121a2d] border-slate-200 dark:border-slate-700/80 hover:border-amber-400/50 dark:hover:border-slate-600 shadow-sm dark:shadow-lg dark:shadow-black/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 tracking-wider uppercase">
                        {subject.category}
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                        {subject.name}
                      </h3>
                    </div>

                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        Available Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#1a253e] border border-slate-200 dark:border-slate-700/70 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-200 mb-6 font-normal leading-relaxed">{subject.description}</p>
                </div>

                {isLive ? (
                  <button
                    onClick={() => onSelectSubjectForReview(subject.id)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-400/20 active:scale-[0.98]"
                  >
                    <span>Start SEHS Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#17223b] hover:bg-slate-200 dark:hover:bg-[#1e2c4c] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 rounded-xl transition-colors cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-amber-400" />
                    <span>Coming soon</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
