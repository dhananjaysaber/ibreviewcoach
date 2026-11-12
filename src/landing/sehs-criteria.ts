// Generated from supabase/functions/mark-map/rubric.ts (the SEHS teacher strand sheet). Do not edit by hand.
export type SehsLevel = '1-2' | '3-4' | '5-6';
export interface SehsStrand { id: string; name: string; levels: Record<SehsLevel, string>; checks: string[] }
export interface SehsCriterion { id: 'RD' | 'DA' | 'CO' | 'EV'; name: string; maxMark: number; strands: SehsStrand[] }
export const SEHS_CRITERIA: SehsCriterion[] = [
 {
  "id": "RD",
  "name": "Research design",
  "maxMark": 6,
  "strands": [
   {
    "id": "RD1",
    "name": "Research Question Context",
    "levels": {
     "1-2": "The research question is stated without context.",
     "3-4": "The research question is outlined within a broad context.",
     "5-6": "The research question is described within a specific and appropriate context."
    },
    "checks": [
     "the research question is the student's own, names the independent and dependent variable (or the two correlated variables) and both can be quantified; no vague words such as \"performance\"",
     "the sample population is described and conclusions are framed as applying to that sample only",
     "background is focused on the exact research question, not a general overview of the topic",
     "published research is used to explain why the link between the variables is worth investigating"
    ]
   },
   {
    "id": "RD2",
    "name": "Methodological consideration",
    "levels": {
     "1-2": "Methodological considerations associated with collecting data relevant to the research question are stated.",
     "3-4": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are described.",
     "5-6": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are explained."
    },
    "checks": [
     "the method can generate data that answers the question; it is a record of what was done (with any trial or preliminary work), not a plan",
     "the dependent variable measurement, the independent variable conditions and the range or intervals chosen are explained",
     "every variable is controlled or monitored, confounding variables are named with how their effect was reduced; switching an air conditioner off does not control temperature",
     "enough repetitions and data for the system studied; qualitative observations where relevant; safety and ethics count only where they matter to this study"
    ]
   },
   {
    "id": "RD3",
    "name": "Reproducibility of methodology",
    "levels": {
     "1-2": "The description of the methodology for collecting or selecting data lacks the detail to allow for the investigation to be reproduced.",
     "3-4": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced with few ambiguities or omissions.",
     "5-6": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced."
    },
    "checks": [
     "a reader could repeat the investigation from the procedure alone",
     "non-standard equipment (for example radar gun, force plate) is identified with model or size and its uncertainty; standard protocols are cited"
    ]
   }
  ]
 },
 {
  "id": "DA",
  "name": "Data analysis",
  "maxMark": 6,
  "strands": [
   {
    "id": "DA1",
    "name": "Communication of data",
    "levels": {
     "1-2": "The recording and processing of the data is communicated but is neither clear nor precise.",
     "3-4": "The communication of the recording and processing of the data is either clear or precise.",
     "5-6": "The communication of the recording and processing of the data is both clear and precise."
    },
    "checks": [
     "correct units, in column headings, and a consistent number of decimal places (small slips are acceptable if consistency was clearly attempted)",
     "tables and figures have titles or numbers and are referred to in the text; concise column headings",
     "sample raw data is shown, and a sample calculation, formula or screenshot where processing is not obvious",
     "graphs have labelled axes, a title and a legend where needed",
     "the same quantity has the same value everywhere (text, tables, graphs, conclusion); values are not more precise than the instrument allows"
    ]
   },
   {
    "id": "DA2",
    "name": "Consideration of uncertainties",
    "levels": {
     "1-2": "The recording and processing of data shows limited evidence of the consideration of uncertainties.",
     "3-4": "The recording and processing of data shows evidence of a consideration of uncertainties but with some significant omissions or inaccuracies.",
     "5-6": "The recording and processing of data shows evidence of an appropriate consideration of uncertainties."
    },
    "checks": [
     "instrument precision or uncertainty is stated and realistic for how the instrument was used",
     "variation is shown (range, standard deviation, R squared, error bars) and significance testing is considered",
     "outliers are neither silently removed nor ignored; uncertainties are reported consistently; propagation of uncertainties is not expected",
     "the impact of uncertainty on the conclusion is credited under Conclusion, not here"
    ]
   },
   {
    "id": "DA3",
    "name": "Processing quality",
    "levels": {
     "1-2": "Some processing of data relevant to addressing the research question is carried out but with major omissions, inaccuracies or inconsistencies.",
     "3-4": "The processing of data relevant to addressing the research question is carried out but with some significant omissions, inaccuracies or inconsistencies.",
     "5-6": "The processing of data relevant to addressing the research question is carried out appropriately and accurately."
    },
    "checks": [
     "processing suits the research question and is at Diploma level; the choice of statistical test is justified",
     "calculations and graphs are correct; trend lines are realistic",
     "there is enough data for the processing used"
    ]
   }
  ]
 },
 {
  "id": "CO",
  "name": "Conclusion",
  "maxMark": 6,
  "strands": [
   {
    "id": "CO1",
    "name": "Relevance and support",
    "levels": {
     "1-2": "A conclusion is stated that is relevant to the research question but is not supported by the analysis presented.",
     "3-4": "A conclusion is described that is relevant to the research question but is not fully consistent with the analysis presented.",
     "5-6": "A conclusion is justified that is relevant to the research question and fully consistent with the analysis presented."
    },
    "checks": [
     "the conclusion answers the research question within the sample, refers to the data directly and to the hypothesis if one was stated",
     "statistical tests are interpreted correctly; a result that is not significant is not presented as support (for example because the p-value is close to 0.05)",
     "the conclusion discusses reliability of the data, the impact of uncertainties and the sample size",
     "the conclusion is consistent with the analysis; any contradiction between them lowers this strand"
    ]
   },
   {
    "id": "CO2",
    "name": "Scientific context comparison",
    "levels": {
     "1-2": "The conclusion makes superficial comparison to the accepted scientific context.",
     "3-4": "A conclusion is described that makes some relevant comparison to the accepted scientific context.",
     "5-6": "A conclusion is justified through relevant comparison to the accepted scientific context."
    },
    "checks": [
     "relevant published research explains the outcome and the sources can be traced",
     "the result is compared with general models or accepted values and explained in a sports science context; if no accepted value exists, the student judges whether the result is reasonable"
    ]
   },
   {
    "id": "CO3",
    "name": "Practical implications",
    "levels": {
     "1-2": "Practical implications of the findings are stated.",
     "3-4": "Practical implications of the findings are outlined.",
     "5-6": "Practical implications of the findings are explained."
    },
    "checks": [
     "the result is linked to a real application and to how coaches, athletes or health professionals could use it, supported by the literature",
     "an inconclusive result has limited implications and may point to further study"
    ]
   }
  ]
 },
 {
  "id": "EV",
  "name": "Evaluation",
  "maxMark": 6,
  "strands": [
   {
    "id": "EV1",
    "name": "Weaknesses and limitations",
    "levels": {
     "1-2": "The report states generic methodological weaknesses or limitations.",
     "3-4": "The report describes specific methodological weaknesses or limitations.",
     "5-6": "The report explains the relative impact of specific methodological weaknesses or limitations."
    },
    "checks": [
     "weaknesses are specific to this method and evidenced; generic points such as a small sample or \"more measurements\" are generic limitations",
     "careless errors and hypothetical events with no evidence are not weaknesses",
     "the relative impact of each significant weakness is judged (major or minor) and linked to the quality of the data"
    ]
   },
   {
    "id": "EV2",
    "name": "Improvement",
    "levels": {
     "1-2": "Realistic improvements to the investigation are stated.",
     "3-4": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are described.",
     "5-6": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are explained."
    },
    "checks": [
     "improvements are realistic and doable in a school or field setting and relate to the weaknesses identified",
     "generalities such as \"take more measurements\" or \"use a more precise instrument\" count only when tied to a specific weakness"
    ]
   }
  ]
 }
] as SehsCriterion[];
