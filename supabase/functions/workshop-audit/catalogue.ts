/* Workshop coaching checklist only; does not alter official IB scores. */
export const CATALOGUE = {
  "version": "sehs-workshop-2026-v1",
  "note": "Coaching guide only, never overrides IB criteria or official marks",
  "officialCriteria": [
    {
      "name": "Research Design",
      "maximum": 6
    },
    {
      "name": "Data Analysis",
      "maximum": 6
    },
    {
      "name": "Conclusion",
      "maximum": 6
    },
    {
      "name": "Evaluation",
      "maximum": 6
    }
  ],
  "sections": [
    {
      "id": "rq",
      "name": "01 · Research Question",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "rq-iv",
          "title": "Independent variable",
          "question": "What exactly is being changed or compared?",
          "guidance": "Identify the independent variable and the levels or conditions of the study.",
          "example": "In a footwear study: three footwear conditions, clearly defined.",
          "searchTerms": [
            "independent",
            "iv",
            "research question",
            "research aim"
          ],
          "higherBand": "Specific and reproducible investigation.",
          "advisory": false
        },
        {
          "id": "rq-dv",
          "title": "Dependent variable",
          "question": "What is measured, and in which units?",
          "guidance": "The measurable outcome must be clear and appropriate to the chosen design.",
          "example": "Sprint time (s) rather than simply “performance”.",
          "searchTerms": [
            "dependent",
            "dv",
            "measurement",
            "time",
            "speed"
          ],
          "higherBand": "Measurable outcome with meaningful precision.",
          "advisory": false
        },
        {
          "id": "rq-measure",
          "title": "Measurement method and uncertainty",
          "question": "Which instrument or method measures the outcome, and what is its verified uncertainty?",
          "guidance": "Check instrument specifications; do not invent a precision value.",
          "example": "A speed gun reports km/h; confirm uncertainty against the actual model datasheet.",
          "searchTerms": [
            "uncertainty",
            "speed gun",
            "measurement",
            "equipment",
            "resolution"
          ],
          "higherBand": "Clear enough that another investigator could reproduce measurements.",
          "advisory": false
        },
        {
          "id": "rq-population",
          "title": "Population or system",
          "question": "Who or what is being investigated?",
          "guidance": "Define the participant group or system only as specifically as the data allow.",
          "example": "U19 softball players rather than “athletes”.",
          "searchTerms": [
            "population",
            "participants",
            "sample",
            "group"
          ],
          "higherBand": "A well-bounded, feasible investigation.",
          "advisory": false
        },
        {
          "id": "rq-scope",
          "title": "Testable and reproducible focus",
          "question": "Could another researcher identify the IV, DV, context and measurement approach from the question?",
          "guidance": "Prefer one clear investigable relationship over several broad aims.",
          "example": "Clarify whether the outcome is speed or time; avoid mixing them.",
          "searchTerms": [
            "research question",
            "reproduce",
            "investigation",
            "aim"
          ],
          "higherBand": "Specific, measurable and reproducible research question.",
          "advisory": false
        }
      ]
    },
    {
      "id": "background",
      "name": "02 · Background Information / Introduction",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "bg-link",
          "title": "Scientific rationale linking IV and DV",
          "question": "Why could changing the IV affect the DV?",
          "guidance": "Explain the science/mechanism, not only definitions of both variables.",
          "example": "For footwear and sprinting, investigate traction and force application as possible mechanisms.",
          "searchTerms": [
            "scientific",
            "rationale",
            "background",
            "introduction",
            "mechanism"
          ],
          "higherBand": "Explain why the relationship is worth investigating.",
          "advisory": false
        },
        {
          "id": "bg-literature",
          "title": "Relevant peer-reviewed research",
          "question": "Which published studies are directly relevant to this relationship?",
          "guidance": "Evaluate relevance and quality of studies rather than citing sources by number alone.",
          "example": "Ask whether studies measured the same outcome, with a similar population.",
          "searchTerms": [
            "literature",
            "peer-reviewed",
            "journal",
            "studies",
            "research"
          ],
          "higherBand": "Prior research supports reasoning and design choices.",
          "advisory": false
        },
        {
          "id": "bg-design",
          "title": "Research used to justify design",
          "question": "How did prior studies inform the conditions, protocol or measurement tool you selected?",
          "guidance": "Connect sources to decisions, not merely to general background.",
          "example": "A published sprint testing protocol might justify distance or recovery interval.",
          "searchTerms": [
            "previous research",
            "study",
            "method",
            "design",
            "protocol"
          ],
          "higherBand": "Shows how prior scientific work underpins chosen design.",
          "advisory": false
        },
        {
          "id": "bg-focus",
          "title": "Concise relevant context",
          "question": "Does each paragraph develop the RQ, or only define familiar terms?",
          "guidance": "Remove unrelated theory and keep a purposeful scientific narrative.",
          "example": "Instead of a long definition of speed, discuss mechanisms likely to affect speed.",
          "searchTerms": [
            "background",
            "introduction",
            "theory",
            "rationale"
          ],
          "higherBand": "Use scientific reasoning rather than generic definitions.",
          "advisory": true
        },
        {
          "id": "bg-count",
          "title": "Workshop literature/word targets",
          "question": "Does your introduction use suitable depth and supporting research?",
          "guidance": "Workshop suggests ~750 words and four peer-reviewed sources; these are guidance, NOT automatic IB requirements.",
          "example": "Three excellent relevant studies may be more useful than four unrelated ones.",
          "searchTerms": [
            "word count",
            "sources",
            "literature",
            "citations"
          ],
          "higherBand": "Prioritise relevance and insight, not mechanical counts.",
          "advisory": true
        }
      ]
    },
    {
      "id": "hypothesis",
      "name": "03 · Hypotheses",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "hyp-alt",
          "title": "Alternative hypothesis",
          "question": "What result do you predict, and what published science justifies it?",
          "guidance": "Specify an evidence-led expectation appropriate to the study.",
          "example": "Consider which condition may influence the measured outcome, and why.",
          "searchTerms": [
            "alternative hypothesis",
            "alternate hypothesis",
            "hypothesis"
          ],
          "higherBand": "A defensible, literature-connected prediction.",
          "advisory": false
        },
        {
          "id": "hyp-null",
          "title": "Null hypothesis",
          "question": "What would no meaningful effect or relationship mean in this investigation?",
          "guidance": "Formulate the statistical null only when it is relevant to the design/test.",
          "example": "No statistically significant difference among the conditions.",
          "searchTerms": [
            "null hypothesis",
            "h0",
            "significant"
          ],
          "higherBand": "Match the hypothesis to planned analysis.",
          "advisory": false
        }
      ]
    },
    {
      "id": "variables",
      "name": "04 · Variables",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "var-iv",
          "title": "Independent variable and conditions",
          "question": "Can a reader identify and distinguish each independent-variable condition?",
          "guidance": "Describe each condition in context; use a photograph where it adds scientific clarity.",
          "example": "State exactly how trainers, turf shoes and cleats are distinguished.",
          "searchTerms": [
            "independent variable",
            "conditions",
            "footwear"
          ],
          "higherBand": "Precise operational description.",
          "advisory": false
        },
        {
          "id": "var-dv",
          "title": "Dependent variable measurement",
          "question": "How exactly was the DV measured, including units and real equipment uncertainty?",
          "guidance": "Explain the measurement process, not just the instrument brand.",
          "example": "Where did timing begin and end?",
          "searchTerms": [
            "dependent variable",
            "measured",
            "measurement",
            "uncertainty"
          ],
          "higherBand": "Repeatable method with defensible precision.",
          "advisory": false
        },
        {
          "id": "var-controls",
          "title": "Controlled variables",
          "question": "Which relevant variables were held constant, how, and why?",
          "guidance": "Consider warm-up, environment, time of day, test duration and sample instructions when relevant.",
          "example": "A table can show variable → control method → reason for control.",
          "searchTerms": [
            "controlled variables",
            "control",
            "warm-up",
            "environment"
          ],
          "higherBand": "Justify important control decisions.",
          "advisory": false
        },
        {
          "id": "var-bias",
          "title": "Bias controls",
          "question": "Could trial order, familiarisation, expectation or observer effects alter results?",
          "guidance": "Address only relevant order, practice, placebo and observer effects, with mitigation.",
          "example": "Randomise order when fatigue or learning could advantage a condition.",
          "searchTerms": [
            "randomisation",
            "counterbalancing",
            "familiarisation",
            "blinding",
            "bias"
          ],
          "higherBand": "Explain impacts of relevant biases and the prevention methods.",
          "advisory": false
        },
        {
          "id": "var-confound",
          "title": "Confounding variables",
          "question": "What could not be fully controlled and how might it influence the findings?",
          "guidance": "Acknowledge practical confounders without pretending they were controlled.",
          "example": "Prior sporting experience could affect participants differently.",
          "searchTerms": [
            "confounding",
            "uncontrolled",
            "mitigate",
            "limitations"
          ],
          "higherBand": "Evaluate likely direction and impact of confounding.",
          "advisory": false
        }
      ]
    },
    {
      "id": "safety",
      "name": "05 · Safety and Ethics",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "safe-physical",
          "title": "Physical safety and risk assessment",
          "question": "What hazards exist, who may be harmed and what controls were used?",
          "guidance": "State actual safety practices; do not assert forms or approval were completed without evidence.",
          "example": "A risk table might include hazard → likelihood/severity → mitigations.",
          "searchTerms": [
            "safety",
            "risk",
            "injury",
            "first aid"
          ],
          "higherBand": "Explicit and context-specific risk management.",
          "advisory": false
        },
        {
          "id": "safe-consent",
          "title": "Consent, screening and approval",
          "question": "How were participants appropriately informed, screened and protected?",
          "guidance": "Workshop mentions consent, PAR-Q and teacher review; verify local ethical requirements and practices.",
          "example": "Check whether consent was actually obtained before testing.",
          "searchTerms": [
            "consent",
            "par-q",
            "screening",
            "ethical"
          ],
          "higherBand": "Ethical safeguards explicitly described, never assumed.",
          "advisory": false
        },
        {
          "id": "safe-rights",
          "title": "Anonymity and right to withdraw",
          "question": "How were confidentiality and withdrawal rights protected?",
          "guidance": "Avoid names and identifiers; explain how voluntary participation worked.",
          "example": "Use participant IDs in data tables.",
          "searchTerms": [
            "anonymity",
            "withdraw",
            "confidential",
            "privacy"
          ],
          "higherBand": "Specific participant rights and safeguards.",
          "advisory": false
        },
        {
          "id": "safe-environment",
          "title": "Environmental consideration",
          "question": "Did the investigation have any environmental impacts or hazards?",
          "guidance": "If negligible, state that after considering the testing environment.",
          "example": "Compare any equipment, travel or resource use relevant to the study.",
          "searchTerms": [
            "environmental",
            "sustainability",
            "electricity"
          ],
          "higherBand": "Demonstrate considered judgement, not boilerplate.",
          "advisory": false
        }
      ]
    },
    {
      "id": "method",
      "name": "06 · Methodology",
      "criterion": "Research Design",
      "checks": [
        {
          "id": "method-why",
          "title": "Method rationale",
          "question": "Why are this IV, DV and population appropriate to the question?",
          "guidance": "Justify design rather than simply describing its steps.",
          "example": "Explain why a specific population is appropriate for the performance test.",
          "searchTerms": [
            "rationale",
            "methodology",
            "design"
          ],
          "higherBand": "Choices linked to research aims.",
          "advisory": false
        },
        {
          "id": "method-sampling",
          "title": "Participant selection",
          "question": "How were participants selected and why was that procedure suitable?",
          "guidance": "Describe sampling method and its limitations accurately.",
          "example": "Convenience sampling should not be described as random allocation.",
          "searchTerms": [
            "sampling",
            "selected",
            "participants",
            "recruitment"
          ],
          "higherBand": "Justified sample and transparent limits.",
          "advisory": false
        },
        {
          "id": "method-tools",
          "title": "Materials and uncertainty",
          "question": "Which non-generic materials or measuring devices are essential?",
          "guidance": "Provide model, resolution and justified uncertainty when relevant.",
          "example": "Record the timing-gate model rather than “electronic device”.",
          "searchTerms": [
            "materials",
            "equipment",
            "uncertainty",
            "instrument"
          ],
          "higherBand": "Factual equipment details and uncertainty.",
          "advisory": false
        },
        {
          "id": "method-pilot",
          "title": "Pilot or pre-test",
          "question": "Was a pilot conducted, and what did it change?",
          "guidance": "Only claim a pilot if actually undertaken; explain useful lessons if so.",
          "example": "A pilot may reveal insufficient rest periods.",
          "searchTerms": [
            "pilot",
            "pre-test",
            "familiarisation"
          ],
          "higherBand": "Evidence-led design refinement.",
          "advisory": true
        },
        {
          "id": "method-setup",
          "title": "Test setup and diagram",
          "question": "Could a reader understand the physical arrangement?",
          "guidance": "Use a diagram/photo when needed for reproducibility; describe setup if visual evidence is unavailable.",
          "example": "Show start/finish markers and the sensor location.",
          "searchTerms": [
            "setup",
            "diagram",
            "figure",
            "photograph"
          ],
          "higherBand": "Visual and textual clarity appropriate to complexity.",
          "advisory": true
        },
        {
          "id": "method-protocol",
          "title": "Step-by-step reproducible protocol",
          "question": "Could another researcher replicate what happened from beginning to end?",
          "guidance": "Describe sequence, trials, rest, briefing and warm-up/cool-down where relevant.",
          "example": "List what happens before, during and after each measured trial.",
          "searchTerms": [
            "procedure",
            "protocol",
            "steps",
            "trials"
          ],
          "higherBand": "A complete reproducible sequence.",
          "advisory": false
        }
      ]
    },
    {
      "id": "data",
      "name": "07 · Data Analysis",
      "criterion": "Data Analysis",
      "checks": [
        {
          "id": "data-raw",
          "title": "Raw data and anomalies",
          "question": "Are observations, units, precision and missing values presented transparently?",
          "guidance": "Explain anomalies without changing or hiding observations.",
          "example": "Use a raw-data table and note any participant withdrawal.",
          "searchTerms": [
            "raw data",
            "measurements",
            "anomalies",
            "withdrawals"
          ],
          "higherBand": "Accurate and complete raw evidence.",
          "advisory": false
        },
        {
          "id": "data-process",
          "title": "Processing rationale",
          "question": "How were raw measurements transformed, and why?",
          "guidance": "Use calculations/statistics that suit the design and question.",
          "example": "Explain whether means and standard deviations meaningfully describe the sample.",
          "searchTerms": [
            "processing",
            "calculation",
            "mean",
            "standard deviation"
          ],
          "higherBand": "Appropriate mathematical processing with rationale.",
          "advisory": false
        },
        {
          "id": "data-table",
          "title": "Analysed tables and uncertainty",
          "question": "Do processed tables include clear headings, sample size, units and relevant uncertainty?",
          "guidance": "Avoid unexplained precision or misleading summaries.",
          "example": "A table heading states mean sprint time (s), n and SD when appropriate.",
          "searchTerms": [
            "analysed",
            "table",
            "sample size",
            "uncertainty"
          ],
          "higherBand": "Tables should support interpretation.",
          "advisory": false
        },
        {
          "id": "data-variation",
          "title": "Variation and coefficient of variation",
          "question": "What does the spread of the data mean? Is CV appropriate?",
          "guidance": "The workshop recommends CV, but it may be inappropriate for some variables; explain rather than force it.",
          "example": "CV expresses SD relative to a meaningful ratio-scale mean.",
          "searchTerms": [
            "variation",
            "coefficient of variation",
            "cv",
            "standard deviation"
          ],
          "higherBand": "Explain variability in context.",
          "advisory": true
        },
        {
          "id": "data-graphs",
          "title": "Graphs and uncertainties",
          "question": "Do graph type, axes, units and uncertainty representations match the data?",
          "guidance": "Use error bars where statistically appropriate; explain what they show.",
          "example": "Distinguish SD variation from SE uncertainty in a plotted mean.",
          "searchTerms": [
            "graph",
            "error bars",
            "axes",
            "scatter"
          ],
          "higherBand": "Clear, accurately interpreted visuals.",
          "advisory": false
        },
        {
          "id": "data-interpret",
          "title": "Interpretation of tables and graphs",
          "question": "What pattern does each figure show in relation to the RQ?",
          "guidance": "Explain meaningful trends and exceptions near the actual table or graph.",
          "example": "Compare conditions, not just “the bar chart increases”.",
          "searchTerms": [
            "interpretation",
            "trend",
            "results",
            "comparison"
          ],
          "higherBand": "Integrates evidence and context rather than postponing all meaning to the conclusion.",
          "advisory": false
        },
        {
          "id": "data-stats",
          "title": "Statistical test selection and interpretation",
          "question": "Why was the statistical test appropriate for the data and design?",
          "guidance": "Explain assumptions, relevant statistics and interpretation, avoiding automatic significance claims.",
          "example": "For a repeated-measures design, consider dependency before selecting a test.",
          "searchTerms": [
            "statistical test",
            "t-test",
            "anova",
            "correlation",
            "p-value"
          ],
          "higherBand": "Justified inference with appropriate limitations.",
          "advisory": false
        }
      ]
    },
    {
      "id": "conclusion",
      "name": "08 · Conclusion",
      "criterion": "Conclusion",
      "checks": [
        {
          "id": "con-answer",
          "title": "Answer to research question",
          "question": "What do your measured results actually support?",
          "guidance": "Answer directly with appropriate caution rather than overclaiming causality.",
          "example": "Tie the answer to the measured DV and studied population.",
          "searchTerms": [
            "conclusion",
            "research question",
            "findings"
          ],
          "higherBand": "A confident but bounded evidence-led answer.",
          "advisory": false
        },
        {
          "id": "con-evidence",
          "title": "Processed evidence and hypothesis",
          "question": "Which means, uncertainty measures and tests support the conclusion?",
          "guidance": "Interpret statistical evidence carefully; do not automatically “accept” the null after a non-significant result.",
          "example": "A non-significant p-value may mean insufficient evidence to reject H0.",
          "searchTerms": [
            "hypothesis",
            "p-value",
            "mean",
            "significant"
          ],
          "higherBand": "Claim strength matches evidence and analysis.",
          "advisory": false
        },
        {
          "id": "con-literature",
          "title": "Comparison with scientific literature",
          "question": "How do results agree or differ from relevant published studies?",
          "guidance": "The workshop suggests two new peer-reviewed sources; prioritise pertinent scientific comparisons.",
          "example": "Consider differences in population or instrument that explain divergent results.",
          "searchTerms": [
            "literature",
            "studies",
            "research",
            "comparison"
          ],
          "higherBand": "Findings placed in defensible scientific context.",
          "advisory": true
        },
        {
          "id": "con-implications",
          "title": "Practical implications and generalisability",
          "question": "Who could use the findings, and to whom do they not necessarily apply?",
          "guidance": "Be specific and avoid extending a small sample to all athletes.",
          "example": "A study of U19 players may not transfer to younger beginners.",
          "searchTerms": [
            "practical",
            "training",
            "generalisability",
            "implications"
          ],
          "higherBand": "Realistic implications tied to actual study limits.",
          "advisory": false
        }
      ]
    },
    {
      "id": "evaluation",
      "name": "09 · Evaluation",
      "criterion": "Evaluation",
      "checks": [
        {
          "id": "eval-limit",
          "title": "Specific limitations and their impact",
          "question": "Which limitations mattered most, and how did they affect the conclusion?",
          "guidance": "Rank issues by consequence rather than listing generic errors.",
          "example": "Explain how a small control group limits certainty.",
          "searchTerms": [
            "limitations",
            "weakness",
            "sample",
            "reliability"
          ],
          "higherBand": "Relative impact on conclusion explicitly analysed.",
          "advisory": false
        },
        {
          "id": "eval-error",
          "title": "Random and systematic error",
          "question": "Could results be affected by random variation or consistent bias?",
          "guidance": "Distinguish error types accurately with relevant examples.",
          "example": "Trial-to-trial variation differs from a consistently miscalibrated device.",
          "searchTerms": [
            "systematic",
            "random error",
            "uncertainty"
          ],
          "higherBand": "Error mechanism and effect clearly reasoned.",
          "advisory": false
        },
        {
          "id": "eval-bias",
          "title": "Uncontrolled variables and biases",
          "question": "How might fatigue, practice, order or observer effects influence results?",
          "guidance": "Mention only effects that are reasonably plausible for the design.",
          "example": "Same-order testing may favour later conditions via practice.",
          "searchTerms": [
            "confounding",
            "bias",
            "fatigue",
            "observer"
          ],
          "higherBand": "Explain direction and possible scale of influence.",
          "advisory": false
        },
        {
          "id": "eval-fix",
          "title": "Realistic justified improvements",
          "question": "What specific change addresses each meaningful weakness?",
          "guidance": "Connect improvement to limitation and likely impact; avoid generic suggestions.",
          "example": "Randomising trial order can address a possible order effect.",
          "searchTerms": [
            "improvements",
            "future",
            "randomise",
            "recommendations"
          ],
          "higherBand": "Justified improvements, sometimes literature-supported.",
          "advisory": false
        },
        {
          "id": "eval-quality",
          "title": "Validity, reliability and scope",
          "question": "How defensible and reproducible are the conclusions?",
          "guidance": "Reflect on whether the question was answered and what remains uncertain.",
          "example": "Distinguish internal validity from external generalisability.",
          "searchTerms": [
            "validity",
            "reliability",
            "reproducibility",
            "generalise"
          ],
          "higherBand": "Reflect on real strengths and boundaries of the findings.",
          "advisory": false
        }
      ]
    }
  ]
} as const;
