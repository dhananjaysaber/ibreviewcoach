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

export const OFFICIAL_CRITERIA: CriteriaBreakdownItem[] = [
  {
    id: 'RD',
    name: 'Research Design',
    strand: 'Strands 1-3: Context, Question & Variables, Methodology',
    maxMark: 6,
    weightPercent: 25,
    summary: 'Focused research question, scientific background context, controlled variables, safety, and reproducible method.',
    descriptors: [
      {
        range: '5–6 Marks',
        description: 'The research question is clear and focused. Relevant background context explains the underlying science. The methodology is highly reproducible with justified controls and safety considerations.'
      },
      {
        range: '3–4 Marks',
        description: 'The research question is stated with minor ambiguity. Background is present but partially linked. Methodology allows reproduction but has minor uncontrolled variables.'
      },
      {
        range: '1–2 Marks',
        description: 'The research question is too broad or descriptive. Background knowledge is superficial. Methodology lacks essential experimental controls or reproducibility.'
      }
    ],
    pitfalls: [
      'Stating variables without stating how they were measured or controlled',
      'Missing preliminary trial justification for timing or sample concentration',
      'Descriptive questions instead of cause-and-effect relationship'
    ]
  },
  {
    id: 'DA',
    name: 'Data Analysis',
    strand: 'Strands 1-3: Raw Data & Uncertainty, Processing, Precision',
    maxMark: 6,
    weightPercent: 25,
    summary: 'Complete raw data tables with instrument uncertainties, sound processing formulas, error propagation, and clear graphing.',
    descriptors: [
      {
        range: '5–6 Marks',
        description: 'Raw data is recorded with appropriate uncertainties. Data processing is mathematically sound, showing clear sample calculations, propagated uncertainties, and correctly plotted error bars.'
      },
      {
        range: '3–4 Marks',
        description: 'Raw data is recorded. Data processing is sufficient to draw an answer, but contains minor uncertainty or propagation oversights.'
      },
      {
        range: '1–2 Marks',
        description: 'Raw data is missing uncertainties or trial repeats. Data processing is minimal, inaccurate, or graphs lack metric units and labels.'
      }
    ],
    pitfalls: [
      'Omitting instrument uncertainty in raw data column headers (e.g. ±0.01 s)',
      'Averaging trials without justifying outlier handling or standard deviation',
      'Graph error bars not reflecting propagated or calculated variation'
    ]
  },
  {
    id: 'CO',
    name: 'Conclusion',
    strand: 'Strands 1-2: Data-Backed Answer, Scientific Context',
    maxMark: 6,
    weightPercent: 25,
    summary: 'A direct answer to the research question backed strictly by processed trends, contextualized within scientific literature.',
    descriptors: [
      {
        range: '5–6 Marks',
        description: 'A detailed conclusion is justified entirely by processed data and directly answers the question. Findings are rigorously compared with accepted scientific literature or models.'
      },
      {
        range: '3–4 Marks',
        description: 'A conclusion is drawn that answers the research question but relies on qualitative trends or limited literature comparison.'
      },
      {
        range: '1–2 Marks',
        description: 'The conclusion contradicts the data, does not address the question, or is stated without scientific justification.'
      }
    ],
    pitfalls: [
      'Claiming correlation proves causation without addressing confounding factors',
      'Quoting raw data values instead of processed rates or statistical p-values',
      'Failing to cite published peer-reviewed values to compare findings'
    ]
  },
  {
    id: 'EV',
    name: 'Evaluation',
    strand: 'Strands 1-3: Method Strengths, Realistic Weaknesses, Actionable Improvements',
    maxMark: 6,
    weightPercent: 25,
    summary: 'Honest appraisal of systematic and random errors, assessing their impact on reliability, paired with realistic modifications.',
    descriptors: [
      {
        range: '5–6 Marks',
        description: 'Strengths and weaknesses of the methodology are critically evaluated. Distinguishes between systematic and random errors, explaining impact on reliability, with concrete, realistic improvements.'
      },
      {
        range: '3–4 Marks',
        description: 'Identifies weaknesses and suggests improvements, but focuses on superficial human errors rather than procedural design flaws.'
      },
      {
        range: '1–2 Marks',
        description: 'Superficial evaluation citing only "lack of time" or "need more trials" without addressing scientific methodology flaws.'
      }
    ],
    pitfalls: [
      'Listing vague generic complaints like "be more careful with the stopwatch"',
      'Failing to explain how specific errors affected the direction of the result (over- or under-estimate)',
      'Proposing unrealistic modifications that violate school laboratory guidelines'
    ]
  }
];

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
