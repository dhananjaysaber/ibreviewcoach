import React from 'react';
import { 
  ShieldCheck, 
  XCircle, 
  CheckCircle2, 
  GraduationCap, 
  Lock, 
  Trash2, 
  FileKey, 
  EyeOff, 
  Clock, 
  Server,
  FileCheck
} from 'lucide-react';

export const AcademicIntegrity: React.FC = () => {
  return (
    <section id="integrity" className="py-20 bg-[#faf8f5] dark:bg-[#0b1120] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Academic Integrity Guarantee</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900 dark:text-white tracking-tight mb-4">
              We coach your scientific writing. We never write your IA.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed text-balance max-w-2xl mx-auto">
              Designed in strict alignment with the International Baccalaureate Organization’s Academic Honesty Policy (Article 12).
            </p>
          </div>

          {/* Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* What we do */}
            <div className="bg-white dark:bg-[#121a2d] border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-6 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-4">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>What IB IA Review Does (Formative Coaching)</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>Evaluates your work objectively against the official 24-mark IB rubric.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>Flags missing uncertainties, uncontrolled variables, and weak conclusions.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>Provides clear diagnostic notes so YOU understand why marks were deducted.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">✓</span>
                  <span>Generates an annotated report you can review together with your classroom teacher.</span>
                </li>
              </ul>
            </div>

            {/* What we never do */}
            <div className="bg-white dark:bg-[#121a2d] border border-rose-300 dark:border-rose-500/40 rounded-2xl p-6 shadow-lg shadow-black/20">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm mb-4">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>What We NEVER Do (Strictly Prohibited)</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">✕</span>
                  <span>We never ghostwrite, generate replacement paragraphs, or fabricate data.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">✕</span>
                  <span>We never modify your original document or bypass your own intellect.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">✕</span>
                  <span>We never share or upload your manuscript to public plagiarism repositories.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">✕</span>
                  <span>Every sentence in your final submission remains 100% authored by you.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Teacher Consultation Quote */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex items-start gap-4 shadow-md shadow-black/20 mb-14">
            <GraduationCap className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="italic text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">
                "The annotated fix plan gives students the exact vocabulary of IB examiners. Instead of hearing 'fix your evaluation', students see exactly which systematic error was missing the direction of bias. It makes teacher-student draft meetings ten times more productive."
              </p>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                — Senior IB Diploma Coordinator & SEHS Examiner (Geneva & Singapore schools)
              </div>
            </div>
          </div>

          {/* NEW SECTION: Security & Privacy */}
          <div className="pt-10 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Security & Privacy Protocol</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-serif font-medium text-slate-900 dark:text-white tracking-tight">
                  Encrypted Uploads & Data Deletion
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                  Your draft stays in your private account, is never submitted to similarity checkers, and the original file is removed on a fixed schedule.
                </p>
              </div>

              {/* Status Indicator Badge */}
              <div className="flex items-center gap-2 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Private by default</span>
              </div>
            </div>

            {/* Visual Security Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {/* Badge 1: Encrypted Uploads */}
              <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 transition-all hover:border-amber-400/50 dark:hover:border-amber-400/50 group shadow-md shadow-black/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <FileKey className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wide bg-amber-100/70 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-600/60">
                    <Lock className="w-3 h-3" />
                    AES-256 & TLS 1.3
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  End-to-End Encrypted Uploads
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-4">
                  Drafts travel over HTTPS and are stored in a private bucket that only your account can open. Nobody else can browse your files.
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Server className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Encrypted transport · Private storage</span>
                </div>
              </div>

              {/* Badge 2: Automated Data Deletion Policy */}
              <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 transition-all hover:border-emerald-400/50 dark:hover:border-emerald-400/50 group shadow-md shadow-black/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wide bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-600/60">
                    <Clock className="w-3 h-3" />
                    180-DAY AUTO-PURGE
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Automated Data Deletion Policy
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-4">
                  Your original uploaded file is kept for 6 months, then deleted automatically. You can delete the original yourself at any time. Your annotated review and fix plan stay in your account.
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>6-month automatic deletion · Delete the original any time</span>
                </div>
              </div>

              {/* Badge 3: Never Submitted to Turnitin */}
              <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 transition-all hover:border-cyan-400/50 dark:hover:border-cyan-400/50 group shadow-md shadow-black/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-700/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <EyeOff className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wide bg-cyan-100/70 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-600/60">
                    <ShieldCheck className="w-3 h-3" />
                    NO TURNITIN DEPOT
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  Strict Plagiarism Index Exemption
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-4">
                  Your draft is never deposited into Turnitin or any academic comparison database, so reviewing it here will not create a similarity match when your school submits the final paper.
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Safe for official school submission</span>
                </div>
              </div>

              {/* Badge 4: Zero Model Retraining */}
              <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 transition-all hover:border-purple-400/50 dark:hover:border-purple-400/50 group shadow-md shadow-black/20">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-700/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wide bg-purple-100/70 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300/60 dark:border-purple-600/60">
                    <Lock className="w-3 h-3" />
                    ZERO TRAINING RETENTION
                  </span>
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Model Retraining Exemption
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 leading-relaxed mb-4">
                  Reviews run on our own hosted model. Your work is not used to train public models.
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Not used to train public models</span>
                </div>
              </div>
            </div>

            {/* Candidate Privacy Guarantees Summary Strip */}
            <div className="bg-white dark:bg-[#121a2d] border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-300 shadow-md shadow-black/20">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span><strong className="text-slate-900 dark:text-white">HTTPS</strong> encrypted transport</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong className="text-slate-900 dark:text-white">6-month</strong> automatic original-file deletion</span>
              </div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span><strong className="text-slate-900 dark:text-white">Never deposited</strong> in Turnitin or external archives</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
