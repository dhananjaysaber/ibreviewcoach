export interface AnnotationPoint {
  id: number;
  highlightText: string;
  criterion: 'RD' | 'DA' | 'CO' | 'EV';
  strandName: string;
  issueType: 'Missing Detail' | 'Uncertainty Gap' | 'Unsubstantiated' | 'Methodological Flaw';
  severity: 'Critical' | 'Moderate' | 'Minor';
  scoreImpact: string;
  diagnostic: string;
  fixInstruction: string;
  beforeSnippet: string;
  afterSnippet: string;
}

export interface SampleSection {
  id: string;
  title: string;
  pageNumber: number;
  criterionId: 'RD' | 'DA' | 'CO' | 'EV';
  currentScore: string;
  potentialScore: string;
  fullExcerpt: string;
  annotations: AnnotationPoint[];
}

export const SAMPLE_SECTIONS: SampleSection[] = [
  {
    id: 'methodology',
    title: 'Research Design & Methodology',
    pageNumber: 3,
    criterionId: 'RD',
    currentScore: '3 / 6 Marks',
    potentialScore: '5–6 / 6 Marks',
    fullExcerpt: `Participants completed three trials on a 20 m sprint track after a standardized 5-minute dynamic warm-up. Sprint times were recorded with a handheld digital stopwatch (accuracy ±0.01 s). [H1] The same tester started and stopped the timer for every trial [/H1] to avoid inter-operator discrepancies, and data were manually entered into Table 1. [H2] Rest intervals between sprints were kept around two minutes [/H2] before the next trial was administered.`,
    annotations: [
      {
        id: 1,
        highlightText: 'The same tester started and stopped the timer for every trial',
        criterion: 'RD',
        strandName: 'RD3 · Reproducibility of methodology',
        issueType: 'Missing Detail',
        severity: 'Critical',
        scoreImpact: '+1 Mark in Research Design',
        diagnostic: 'Stated, not yet operationally described.',
        fixInstruction: 'State what exact sensory cue determined the start (e.g., visual movement of the athlete’s back foot vs auditory acoustic whistle) and where the timer stood relative to the 20m line to eliminate parallax error.',
        beforeSnippet: 'The same tester started and stopped the timer for every trial and results were written in a table.',
        afterSnippet: 'To eliminate inter-operator reaction bias and parallax distortion, the same single tester stood positioned perpendicular (90°) to the 20 m finish line at eye level with the infrared tape. Timing was triggered at the first forward displacement of the athlete’s rear heel from the starting block.'
      },
      {
        id: 2,
        highlightText: 'Rest intervals between sprints were kept around two minutes',
        criterion: 'RD',
        strandName: 'RD2 · Methodological consideration',
        issueType: 'Methodological Flaw',
        severity: 'Moderate',
        scoreImpact: '+1 Mark in Research Design',
        diagnostic: 'Vague interval specification threatens ATP-PC replenishment constancy.',
        fixInstruction: 'Specify the exact rest duration (e.g., timed stopwatch countdown of exactly 120 ± 1 s) and justify it scientifically with ATP-PC re-synthesis physiology literature.',
        beforeSnippet: 'Rest intervals between sprints were kept around two minutes before the next trial was administered.',
        afterSnippet: 'Between successive trials, each participant remained seated for an exact stopwatch-timed recovery period of 180 ± 1 s. This interval was chosen based on Bogdanis et al. (1995) to guarantee >90% ATP-PC system phosphocreatine resynthesis before subsequent exertion.'
      }
    ]
  },
  {
    id: 'data-processing',
    title: 'Data analysis',
    pageNumber: 7,
    criterionId: 'DA',
    currentScore: '3 / 6 Marks',
    potentialScore: '6 / 6 Marks',
    fullExcerpt: `Table 2 outlines the calculated mean sprint velocities across all 5 conditions. [H1] The average speed was calculated by dividing distance (20 m) by the mean time [/H1]. [H2] Standard deviations were plotted on Figure 3 [/H2] to illustrate the dispersion of scores across the experimental sample.`,
    annotations: [
      {
        id: 1,
        highlightText: 'The average speed was calculated by dividing distance (20 m) by the mean time',
        criterion: 'DA',
        strandName: 'DA2 · Consideration of uncertainties',
        issueType: 'Uncertainty Gap',
        severity: 'Critical',
        scoreImpact: '+2 Marks in Data Analysis',
        diagnostic: 'The instrument uncertainty is not stated for the timing, so the reader cannot judge how precise the speeds are.',
        fixInstruction: 'State the realistic timing uncertainty for how the stopwatch was used (hand-timing is far less precise than the display), and report speeds to a consistent number of decimal places that the timing allows.',
        beforeSnippet: 'The average speed was calculated by dividing distance (20 m) by the mean time.',
        afterSnippet: 'Mean speed was calculated as v = d / t = 20 m / 3.80 s = 5.3 m s⁻¹. Hand-timing reaction error makes the realistic timing uncertainty about ±0.2 s, so speeds are reported to one decimal place only.'
      },
      {
        id: 2,
        highlightText: 'Standard deviations were plotted on Figure 3',
        criterion: 'DA',
        strandName: 'DA1 · Communication of data',
        issueType: 'Missing Detail',
        severity: 'Minor',
        scoreImpact: '+1 Mark in Data Analysis',
        diagnostic: 'The graph caption does not say what the error bars show.',
        fixInstruction: 'Add explicit caption definition specifying error bars denote ±1 Sample Standard Deviation (n=15), and clarify whether error bars overlap between conditions.',
        beforeSnippet: 'Standard deviations were plotted on Figure 3 to illustrate the dispersion.',
        afterSnippet: 'Figure 3: Mean velocity across conditions. Vertical error bars represent ±1 Standard Deviation from the mean (n = 15). Non-overlapping error bars between Condition A and D confirm statistical divergence.'
      }
    ]
  },
  {
    id: 'conclusion',
    title: 'Conclusion & Scientific Context',
    pageNumber: 10,
    criterionId: 'CO',
    currentScore: '4 / 6 Marks',
    potentialScore: '6 / 6 Marks',
    fullExcerpt: `In conclusion, the data demonstrates that elevated ambient relative humidity noticeably impairs 20 m sprint acceleration in adolescent athletes. [H1] Athletes tested under 80% relative humidity recorded sprint times 0.18 seconds slower than under 45% relative humidity [/H1], supporting my experimental hypothesis. [H2] This outcome agrees with common knowledge in sports science [/H2] that humid conditions hinder evaporative thermoregulation and increase physiological strain.`,
    annotations: [
      {
        id: 1,
        highlightText: 'Athletes tested under 80% relative humidity recorded sprint times 0.18 seconds slower than under 45% relative humidity',
        criterion: 'CO',
        strandName: 'CO1 · Relevance and support',
        issueType: 'Unsubstantiated',
        severity: 'Moderate',
        scoreImpact: '+1 Mark in Conclusion',
        diagnostic: 'The difference is quoted without saying whether it is bigger than the variation in the data or the timing uncertainty.',
        fixInstruction: 'Contrast the observed sprint time difference (0.18 s) against your combined experimental timing uncertainty (±0.05 s) and report whether a paired t-test confirmed significance at p < 0.05.',
        beforeSnippet: 'Athletes tested under 80% relative humidity recorded sprint times 0.18 seconds slower than under 45% relative humidity, supporting my experimental hypothesis.',
        afterSnippet: 'Athletes sprinting under 80% relative humidity exhibited a mean velocity decrement of 0.18 ± 0.05 s compared to 45% relative humidity. Because this 0.18 s margin exceeds cumulative experimental uncertainty, and a paired two-tailed t-test showed p = 0.021 (p < 0.05), the null hypothesis is rejected.'
      },
      {
        id: 2,
        highlightText: 'This outcome agrees with common knowledge in sports science',
        criterion: 'CO',
        strandName: 'CO2 · Scientific context comparison',
        issueType: 'Missing Detail',
        severity: 'Critical',
        scoreImpact: '+1 Mark in Conclusion',
        diagnostic: 'Examiners penalize vague claims like "common knowledge". Must cite peer-reviewed exercise physiology literature.',
        fixInstruction: 'Cite peer-reviewed environmental exercise physiology literature (e.g. Galloway & Maughan, 1997 or Maughan et al., 2012) linking high water vapor pressure to suppressed cutaneous sweat evaporation and premature neuromuscular fatigue.',
        beforeSnippet: 'This outcome agrees with common knowledge in sports science that humid conditions hinder evaporative thermoregulation.',
        afterSnippet: 'This 3.8% performance impairment corroborates empirical findings by Galloway & Maughan (1997), who demonstrated that elevated ambient vapor pressure limits sweat evaporation, accelerating core temperature rise and precipitating acute motor unit fatigue.'
      }
    ]
  },
  {
    id: 'evaluation',
    title: 'Evaluation & Realistic Improvements',
    pageNumber: 12,
    criterionId: 'EV',
    currentScore: '2 / 6 Marks',
    potentialScore: '5–6 / 6 Marks',
    fullExcerpt: `A limitation of this study was human error when clicking the stopwatch buttons. [H1] In future trials, I would recruit more participants and take more time [/H1] to obtain better averages. Furthermore, [H2] the room temperature varied slightly between test days [/H2], which may have influenced the athletes’ fatigue levels.`,
    annotations: [
      {
        id: 1,
        highlightText: 'In future trials, I would recruit more participants and take more time',
        criterion: 'EV',
        strandName: 'EV2 · Improvement',
        issueType: 'Methodological Flaw',
        severity: 'Critical',
        scoreImpact: '+2 Marks in Evaluation',
        diagnostic: 'Classic low-band evaluation trap: "more people / more time" earns 1–2 marks.',
        fixInstruction: 'Propose an exact apparatus modification (dual infrared timing gates with photoelectric beam sensors, accuracy ±0.001 s) to eradicate human reaction latency entirely.',
        beforeSnippet: 'In future trials, I would recruit more participants and take more time to obtain better averages.',
        afterSnippet: 'To eliminate human reaction time latency (~0.20 s) at the 20 m threshold, subsequent investigations should deploy dual-beam infrared photoelectric timing gates (Microgate Polifemo) mounted on tripods at waist height.'
      },
      {
        id: 2,
        highlightText: 'the room temperature varied slightly between test days',
        criterion: 'EV',
        strandName: 'EV1 · Weaknesses and limitations',
        issueType: 'Unsubstantiated',
        severity: 'Critical',
        scoreImpact: '+1 Mark in Evaluation',
        diagnostic: 'Identified a variable without explaining whether it led to an overestimate or underestimate.',
        fixInstruction: 'State the temperature variance range (e.g. 19°C vs 24°C) and explain the biological effect on muscle viscosity and sprint times.',
        beforeSnippet: 'the room temperature varied slightly between test days, which may have influenced the athletes’ fatigue levels.',
        afterSnippet: 'Ambient indoor temperature fluctuated between 18.5°C on Day 1 and 23.8°C on Day 3. Higher temperatures reduce synovial fluid and muscle viscosity, potentially causing an artificial overestimate of baseline velocities on Day 3 trials by 0.05–0.08 s.'
      }
    ]
  }
];

export interface SubjectItem {
  id: string;
  name: string;
  category: 'Sciences' | 'Individuals & Societies';
  status: 'Live Now' | 'Coming Soon' | 'Beta Waitlist';
  badgeColor: string;
  description: string;
  maxMarks: number;
  highlight: string;
}

export const IB_SUBJECTS: SubjectItem[] = [
  {
    id: 'sehs',
    name: 'SEHS',
    category: 'Sciences',
    status: 'Live Now',
    badgeColor: 'emerald',
    description: 'Sports, Exercise and Health Science IA',
    maxMarks: 24,
    highlight: 'Full marking against 4 official criteria and 11 strands.'
  },
  {
    id: 'biology',
    name: 'Biology',
    category: 'Sciences',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Biology IA (Ecology, Physiology & Enzymes)',
    maxMarks: 24,
    highlight: 'Coming soon.'
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    category: 'Sciences',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Chemistry IA (Titrations, Calorimetry & Kinetics)',
    maxMarks: 24,
    highlight: 'Coming soon.'
  },
  {
    id: 'physics',
    name: 'Physics',
    category: 'Sciences',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Physics IA (Mechanics, Optics & Electromagnetism)',
    maxMarks: 24,
    highlight: 'Coming soon.'
  },
  {
    id: 'psychology',
    name: 'Psychology',
    category: 'Individuals & Societies',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Psychology Experimental Study',
    maxMarks: 22,
    highlight: 'Coming soon.'
  },
  {
    id: 'business',
    name: 'Business Management',
    category: 'Individuals & Societies',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Business Management IA',
    maxMarks: 25,
    highlight: 'Coming soon.'
  },
  {
    id: 'economics',
    name: 'Economics',
    category: 'Individuals & Societies',
    status: 'Coming Soon',
    badgeColor: 'amber',
    description: 'IB Economics Portfolio Commentary',
    maxMarks: 45,
    highlight: 'Coming soon.'
  }
];

export const FREQUENT_QUESTIONS = [
  {
    q: 'Does IB IA Review write or rewrite my IA for me?',
    a: 'No. We coach, we do not ghostwrite. You get criterion-linked commentary, indicative marks and a fix plan that tells you what to change and why. You write every word.'
  },
  {
    q: 'How fast do I receive my annotated report and fix plan?',
    a: 'The free review is an automated review prepared by our model and is ready within 30 minutes. Paid reviews are marked and approved by an authorised IB moderator and are ready within 24 hours. Your report then appears in My IA Reports and you are emailed when it is ready.'
  },
  {
    q: 'What file formats can I upload?',
    a: 'PDF and Word (.docx). PDF is recommended because it keeps your tables, graphs and page numbers exactly as written.'
  },
  {
    q: 'Is my uploaded draft kept private?',
    a: 'Yes. Your file sits in a private account and is never submitted to Turnitin or any similarity database. The original upload is kept for 6 months and then deleted, and you can delete the original yourself at any time. Your annotated review stays in your account.'
  },
  {
    q: 'Can my IB teacher see or use this feedback?',
    a: 'Yes. You can share the annotated review with your teacher. The commentary uses IB markband language, so it works well alongside a first-draft conversation.'
  },
  {
    q: 'How do review credits work, and do they expire?',
    a: 'One credit covers one full moderator-marked review of one draft. A credit is used only when your report is published, and a review that fails on our side keeps your credit. Each revised draft uses one more credit. Purchased credits stay valid for 365 days.'
  },
  {
    q: 'Which subjects are available?',
    a: 'SEHS is live now. Other IB subjects are coming soon.'
  }
];
