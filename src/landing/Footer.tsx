import { LogoLockup } from '../components/LogoMark';
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenUpload: () => void;
  onOpenExemplar: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenUpload, onOpenExemplar }) => {
  return (
    <footer className="bg-[#eeeae2] dark:bg-[#05080f] text-slate-600 dark:text-slate-400 py-16 border-t border-slate-300/80 dark:border-slate-800/80 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-300 dark:border-slate-800/80">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <a href="#" className="flex items-center gap-2.5 text-slate-900 dark:text-white font-serif font-bold text-lg">
              <LogoLockup />
            </a>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
              Examiner-grade Internal Assessment criteria feedback, annotated manuscripts, and actionable fix plans for IB Diploma students worldwide.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 pt-1 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>IB Academic Honesty Compliant</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Supported Subjects
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#subjects" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Sports, Exercise & Health Science (Live)
                </a>
              </li>
              <li>
                <a href="#subjects" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  IB Biology IA (Waitlist)
                </a>
              </li>
              <li>
                <a href="#subjects" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  IB Chemistry IA (Waitlist)
                </a>
              </li>
              <li>
                <a href="#subjects" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  IB Physics IA (Waitlist)
                </a>
              </li>
              <li>
                <a href="#subjects" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  IB Psychology & Business (Waitlist)
                </a>
              </li>
            </ul>
          </div>

          {/* Assessment Resources */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Assessment Rubric
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#criteria" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Research Design (RD) · 6 Marks
                </a>
              </li>
              <li>
                <a href="#criteria" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Data Analysis (DA) · 6 Marks
                </a>
              </li>
              <li>
                <a href="#criteria" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Conclusion (CO) · 6 Marks
                </a>
              </li>
              <li>
                <a href="#criteria" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Evaluation (EV) · 6 Marks
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenExemplar}
                  className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                >
                  Worked Exemplar Report
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Actions */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Candidate Actions
            </h4>
            <ul className="space-y-2 mb-4">
              <li>
                <button
                  onClick={onOpenUpload}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors cursor-pointer text-left"
                >
                  Start an IA Review
                </button>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Review Credit Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  FAQ & Academic Policy
                </a>
              </li>
              <li>
                <a href="#integrity" className="hover:text-slate-950 dark:hover:text-white transition-colors">
                  Security & Data Privacy
                </a>
              </li>
              <li><a href="/privacy-policy" className="hover:text-slate-950 dark:hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/refund-policy" className="hover:text-slate-950 dark:hover:text-white transition-colors">Cancellation &amp; Refund Policy</a></li>
              <li><a href="/terms" className="hover:text-slate-950 dark:hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/contact" className="hover:text-slate-950 dark:hover:text-white transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & official disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} IB IA Review · All rights reserved.
          </div>
          <div className="text-center md:text-right max-w-xl">
            Independent educational tool. International Baccalaureate® and IB® are registered trademarks of the International Baccalaureate Organization, which does not endorse or affiliate with this service.
          </div>
        </div>
      </div>
    </footer>
  );
};
