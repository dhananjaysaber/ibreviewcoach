// Teacher strand sheet (SEHS IA 2026 Teachers Comment), word for word. Level "0" is always:
// "The report does not reach the standard described by the descriptors below."
export const CRITERIA = [
 { code: 'A', name: 'Research design', max: 6 },
 { code: 'B', name: 'Data analysis', max: 6 },
 { code: 'C', name: 'Conclusion', max: 6 },
 { code: 'D', name: 'Evaluation', max: 6 },
] as const;
export const LEVELS = ['0', '1-2', '3-4', '5-6'] as const;
export type Strand = { id: string; criterion: string; name: string; levels: Record<string, string> };
export const STRANDS: Strand[] = [
 {
  "id": "A1",
  "criterion": "A",
  "name": "Research Question Context",
  "levels": {
   "1-2": "The research question is stated without context.",
   "3-4": "The research question is outlined within a broad context.",
   "5-6": "The research question is described within a specific and appropriate context."
  }
 },
 {
  "id": "A2",
  "criterion": "A",
  "name": "Methodological consideration",
  "levels": {
   "1-2": "Methodological considerations associated with collecting data relevant to the research question are stated.",
   "3-4": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are described.",
   "5-6": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are explained."
  }
 },
 {
  "id": "A3",
  "criterion": "A",
  "name": "Reproducibility of methodology",
  "levels": {
   "1-2": "The description of the methodology for collecting or selecting data lacks the detail to allow for the investigation to be reproduced.",
   "3-4": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced with few ambiguities or omissions.",
   "5-6": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced."
  }
 },
 {
  "id": "B1",
  "criterion": "B",
  "name": "Communication of data",
  "levels": {
   "1-2": "The recording and processing of the data is communicated but is neither clear nor precise.",
   "3-4": "The communication of the recording and processing of the data is either clear or precise.",
   "5-6": "The communication of the recording and processing of the data is both clear and precise."
  }
 },
 {
  "id": "B2",
  "criterion": "B",
  "name": "Consideration of uncertainties",
  "levels": {
   "1-2": "The recording and processing of data shows limited evidence of the consideration of uncertainties.",
   "3-4": "The recording and processing of data shows evidence of a consideration of uncertainties but with some significant omissions or inaccuracies.",
   "5-6": "The recording and processing of data shows evidence of an appropriate consideration of uncertainties."
  }
 },
 {
  "id": "B3",
  "criterion": "B",
  "name": "Processing quality",
  "levels": {
   "1-2": "Some processing of data relevant to addressing the research question is carried out but with major omissions, inaccuracies or inconsistencies.",
   "3-4": "The processing of data relevant to addressing the research question is carried out but with some significant omissions, inaccuracies or inconsistencies.",
   "5-6": "The processing of data relevant to addressing the research question is carried out appropriately and accurately."
  }
 },
 {
  "id": "C1",
  "criterion": "C",
  "name": "Relevance and support",
  "levels": {
   "1-2": "A conclusion is stated that is relevant to the research question but is not supported by the analysis presented.",
   "3-4": "A conclusion is described that is relevant to the research question but is not fully consistent with the analysis presented.",
   "5-6": "A conclusion is justified that is relevant to the research question and fully consistent with the analysis presented."
  }
 },
 {
  "id": "C2",
  "criterion": "C",
  "name": "Scientific context comparison",
  "levels": {
   "1-2": "The conclusion makes superficial comparison to the accepted scientific context.",
   "3-4": "A conclusion is described that makes some relevant comparison to the accepted scientific context.",
   "5-6": "A conclusion is justified through relevant comparison to the accepted scientific context."
  }
 },
 {
  "id": "C3",
  "criterion": "C",
  "name": "Practical implications",
  "levels": {
   "1-2": "Practical implications of the findings are stated.",
   "3-4": "Practical implications of the findings are outlined.",
   "5-6": "Practical implications of the findings are explained."
  }
 },
 {
  "id": "D1",
  "criterion": "D",
  "name": "Weaknesses and limitations",
  "levels": {
   "1-2": "The report states generic methodological weaknesses or limitations.",
   "3-4": "The report describes specific methodological weaknesses or limitations.",
   "5-6": "The report explains the relative impact of specific methodological weaknesses or limitations."
  }
 },
 {
  "id": "D2",
  "criterion": "D",
  "name": "Improvement",
  "levels": {
   "1-2": "Realistic improvements to the investigation are stated.",
   "3-4": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are described.",
   "5-6": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are explained."
  }
 }
];
