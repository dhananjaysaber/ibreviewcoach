// Official IB SEHS rubric, copied from backend-integration/sehs-official-rubric-2026.json
export const RUBRIC = [
 {
  "code": "ResearchDesign",
  "name": "Research Design",
  "max": 6,
  "clarifications": "A research question with context contains the variables or two correlated variables, a concise system description and directly relevant background theory. Methodology considers measurements, scope, sampling, controls and safety/ethics/environment; the description should allow replication.",
  "bands": [
   {
    "min": 0,
    "max": 0,
    "text": "The report does not reach the standard described below."
   },
   {
    "min": 1,
    "max": 2,
    "text": "The research question is given with little to no surrounding context. Basic methodological points about the data to be collected are mentioned. The methodology is described too thinly for the investigation to be reproduced."
   },
   {
    "min": 3,
    "max": 4,
    "text": "The research question sits within a broad context. Methodological considerations for gathering sufficient, relevant data are described. The methodology allows the investigation to be reproduced, with only minor gaps."
   },
   {
    "min": 5,
    "max": 6,
    "text": "The research question is set within a specific, well-chosen context. Methodological considerations are clearly explained. The methodology description allows the investigation to be fully reproduced."
   }
  ]
 },
 {
  "code": "DataAnalysis",
  "name": "Data Analysis",
  "max": 6,
  "clarifications": "Communication of recording and processing should be clear and precise, uncertainty considered appropriately, and processing accurate and relevant to the research question.",
  "bands": [
   {
    "min": 0,
    "max": 0,
    "text": "The report does not reach the standard described below."
   },
   {
    "min": 1,
    "max": 2,
    "text": "Data recording and processing is present but unclear or imprecise. Little evidence of considering measurement uncertainty. Processing relevant to the research question has major gaps or errors."
   },
   {
    "min": 3,
    "max": 4,
    "text": "Data recording and processing is either clear or precise, not fully both. Some consideration of uncertainty is shown, with noticeable gaps. Processing has some meaningful gaps or inconsistencies."
   },
   {
    "min": 5,
    "max": 6,
    "text": "Data recording and processing is both clear and precise. Measurement uncertainty is appropriately considered. Processing relevant to the research question is accurate and complete."
   }
  ]
 },
 {
  "code": "Conclusion",
  "name": "Conclusion",
  "max": 6,
  "clarifications": "Conclusion must align with processed evidence and uncertainties, compare with scientifically accepted context and discuss real-world applications for health or performance.",
  "bands": [
   {
    "min": 0,
    "max": 0,
    "text": "The report does not reach the standard described below."
   },
   {
    "min": 1,
    "max": 2,
    "text": "A conclusion is given that relates to the research question but is not backed up by the analysis shown. Comparison to accepted scientific understanding is superficial. Practical implications are only mentioned."
   },
   {
    "min": 3,
    "max": 4,
    "text": "A conclusion is given that relates to the research question but isn't fully aligned with the analysis. Some relevant comparison to accepted scientific understanding is made. Practical implications are outlined."
   },
   {
    "min": 5,
    "max": 6,
    "text": "A conclusion is justified, relates clearly to the research question, and is fully aligned with the analysis. It is backed by relevant comparison to accepted scientific understanding. Practical implications are explained."
   }
  ]
 },
 {
  "code": "Evaluation",
  "name": "Evaluation",
  "max": 6,
  "clarifications": "Distinguish specific weaknesses and limitations, their impact on the conclusion, and justified realistic improvements.",
  "bands": [
   {
    "min": 0,
    "max": 0,
    "text": "The report does not reach the standard described below."
   },
   {
    "min": 1,
    "max": 2,
    "text": "Generic methodological weaknesses or limitations are stated. Realistic improvements are stated."
   },
   {
    "min": 3,
    "max": 4,
    "text": "Specific methodological weaknesses or limitations are described. Realistic improvements relevant to the weaknesses identified are described."
   },
   {
    "min": 5,
    "max": 6,
    "text": "The relative impact of specific methodological weaknesses or limitations is explained. Realistic improvements relevant to the weaknesses identified are explained."
   }
  ]
 }
] as const;
