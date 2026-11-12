import React, { useState } from 'react';
import { FREQUENT_QUESTIONS } from './mock-reviews';
import { ChevronDown, Search } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredQuestions = FREQUENT_QUESTIONS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="faq" className="py-20 bg-[#faf8f5] dark:bg-[#0b1120] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Frequently Asked Questions
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4 text-balance">
            Everything you need to know about IB IA Review
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Have questions regarding academic policy, data retention, or turnaround time? Find answers below.
          </p>
        </div>

        {/* Search filter input */}
        <div className="relative mb-8">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g., academic honesty, privacy, turnaround time)..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#121a2d] border border-slate-300 dark:border-slate-700/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 transition-colors shadow-sm"
          />
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredQuestions.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden transition-colors shadow-md shadow-black/20"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif font-semibold text-slate-900 dark:text-white text-base sm:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-amber-600 dark:text-amber-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 dark:text-slate-200 leading-relaxed border-t border-slate-100 dark:border-slate-700/80 font-sans">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              No matching questions found for "{searchQuery}". Contact support for assistance.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
