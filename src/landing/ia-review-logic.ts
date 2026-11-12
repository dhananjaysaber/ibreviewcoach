/**
 * IB IA Review Core Business Logic & Rubric Helpers
 */

export interface CriteriaMarks {
  researchDesign: number; // 0-6
  dataAnalysis: number;   // 0-6
  conclusion: number;     // 0-6
  evaluation: number;     // 0-6
}

export interface CriteriaBreakdownItem {
  id: 'RD' | 'DA' | 'CO' | 'EV';
  name: string;
  strand: string;
  maxMark: number;
  weightPercent: number;
  summary: string;
  descriptors: {
    range: string;
    description: string;
  }[];
  pitfalls: string[];
}


export function calculateTotalScore(marks: CriteriaMarks): number {
  const clamp = (val: number) => Math.max(0, Math.min(6, Math.round(val)));
  return (
    clamp(marks.researchDesign) +
    clamp(marks.dataAnalysis) +
    clamp(marks.conclusion) +
    clamp(marks.evaluation)
  );
}

export function estimateIbGrade(totalMarks: number): {
  grade: number;
  label: string;
  descriptor: string;
} {
  const score = Math.max(0, Math.min(24, Math.round(totalMarks)));

  if (score >= 21) {
    return {
      grade: 7,
      label: 'Excellent (7/7)',
      descriptor: 'Flawless methodology, rigorous processing, and critical evaluation matching examiner exemplars.'
    };
  }
  if (score >= 18) {
    return {
      grade: 6,
      label: 'Very Good (6/7)',
      descriptor: 'Strong paper with minor omissions in error propagation or literature depth.'
    };
  }
  if (score >= 14) {
    return {
      grade: 5,
      label: 'Good (5/7)',
      descriptor: 'Sound investigation with clear paths for upgrade to 6/7 through targeted fix points.'
    };
  }
  if (score >= 11) {
    return {
      grade: 4,
      label: 'Satisfactory (4/7)',
      descriptor: 'Meets basic rubric requirements; lacks critical control rigor and uncertainty analysis.'
    };
  }
  if (score >= 8) {
    return {
      grade: 3,
      label: 'Mediocre (3/7)',
      descriptor: 'Several criteria at 1–2 marks. Needs structural overhaul before final moderation.'
    };
  }
  if (score >= 4) {
    return {
      grade: 2,
      label: 'Poor (2/7)',
      descriptor: 'Critical methodology gaps, missing raw data uncertainties or superficial conclusions.'
    };
  }
  return {
    grade: 1,
    label: 'Very Poor (1/7)',
    descriptor: 'Incomplete investigation requiring substantial reconstruction.'
  };
}

export interface DraftPreFlightCheck {
  wordCount: number;
  wordCountStatus: 'ideal' | 'warning' | 'critical';
  wordCountMessage: string;
  detectedSections: {
    name: string;
    found: boolean;
    recommendation: string;
  }[];
  riskFlags: string[];
}

export function analyzeDraftStats(wordCount: number, detectedSectionKeys: string[]): DraftPreFlightCheck {
  let wordCountStatus: 'ideal' | 'warning' | 'critical' = 'ideal';
  let wordCountMessage = 'Within optimal IB science IA length (1,800–2,250 words).';

  if (wordCount > 2400) {
    wordCountStatus = 'critical';
    wordCountMessage = `Over recommended limit (${wordCount} words). Examiners may stop reading after page 12 / 2,250 words.`;
  } else if (wordCount > 2250) {
    wordCountStatus = 'warning';
    wordCountMessage = `Approaching ceiling (${wordCount} words). Trim verbose narrative in Background and Method.`;
  } else if (wordCount < 1400) {
    wordCountStatus = 'warning';
    wordCountMessage = `Draft is short (${wordCount} words). Likely missing depth in Evaluation or Literature comparison.`;
  }

  const standardSections = [
    {
      key: 'rq',
      name: 'Focused Research Question & Hypothesis',
      recommendation: 'Ensure independent and dependent variables are specified with metric units.'
    },
    {
      key: 'background',
      name: 'Scientific Context & Theory',
      recommendation: 'Connect specific physiological/physical mechanisms rather than general encyclopedia facts.'
    },
    {
      key: 'methodology',
      name: 'Controlled Variables & Methodology',
      recommendation: 'Include a detailed table of controlled variables with exact management methods.'
    },
    {
      key: 'raw_data',
      name: 'Raw Data & Instrument Uncertainties',
      recommendation: 'Column headers must include measurement uncertainties (e.g. ±0.05 mm, ±0.1 s).'
    },
    {
      key: 'processing',
      name: 'Data Processing & Error Propagation',
      recommendation: 'Provide explicit sample calculations for mean, standard deviation, and propagated error.'
    },
    {
      key: 'conclusion',
      name: 'Data-Supported Conclusion',
      recommendation: 'Directly address the research question using calculated trends, citing scientific literature.'
    },
    {
      key: 'evaluation',
      name: 'Evaluation of Weaknesses & Extensions',
      recommendation: 'Categorize errors by systematic vs random, stating direction of bias and actionable fixes.'
    }
  ];

  const detectedSections = standardSections.map((sec) => ({
    name: sec.name,
    found: detectedSectionKeys.includes(sec.key),
    recommendation: sec.recommendation
  }));

  const riskFlags: string[] = [];
  if (!detectedSectionKeys.includes('raw_data')) {
    riskFlags.push('Missing explicit raw data uncertainty notation');
  }
  if (!detectedSectionKeys.includes('evaluation')) {
    riskFlags.push('Evaluation section missing or severely condensed');
  }
  if (wordCount > 2400) {
    riskFlags.push('Exceeds IB page/word length threshold');
  }

  return {
    wordCount,
    wordCountStatus,
    wordCountMessage,
    detectedSections,
    riskFlags
  };
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD';

export const CURRENCY_RATES: Record<SupportedCurrency, { symbol: string; rate: number }> = {
  USD: { symbol: '$', rate: 1.0 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  CAD: { symbol: 'CA$', rate: 1.36 },
  AUD: { symbol: 'A$', rate: 1.52 },
  SGD: { symbol: 'S$', rate: 1.34 }
};

export function formatPrice(baseUsd: number, currency: SupportedCurrency = 'USD'): string {
  const { symbol, rate } = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const converted = baseUsd * rate;
  return `${symbol}${converted.toFixed(2)}`;
}

export interface PrivacyPolicySpec {
  encryptionStandard: string;
  dataRetentionDays: number;
  plagiarismIndexExemption: boolean;
  modelTrainingExemption: boolean;
}

export const CANDIDATE_PRIVACY_SPEC: PrivacyPolicySpec = {
  encryptionStandard: 'AES-256 and TLS 1.3',
  dataRetentionDays: 180,
  plagiarismIndexExemption: true,
  modelTrainingExemption: true
};
