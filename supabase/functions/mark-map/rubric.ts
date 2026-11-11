// Teacher strand sheet (SEHS IA 2026 Teachers Comment), word for word. Level "0" is always:
// "The report does not reach the standard described by the descriptors below."
export const CRITERIA = [
 { code: 'RD', name: 'Research design', max: 6 },
 { code: 'DA', name: 'Data analysis', max: 6 },
 { code: 'CO', name: 'Conclusion', max: 6 },
 { code: 'EV', name: 'Evaluation', max: 6 },
] as const;
export const LEVELS = ['0', '1-2', '3-4', '5-6'] as const;
export type Strand = { id: string; criterion: string; name: string; levels: Record<string, string> };
export const STRANDS: Strand[] = [
 {
  "id": "RD1",
  "criterion": "RD",
  "name": "Research Question Context",
  "levels": {
   "1-2": "The research question is stated without context.",
   "3-4": "The research question is outlined within a broad context.",
   "5-6": "The research question is described within a specific and appropriate context."
  }
 },
 {
  "id": "RD2",
  "criterion": "RD",
  "name": "Methodological consideration",
  "levels": {
   "1-2": "Methodological considerations associated with collecting data relevant to the research question are stated.",
   "3-4": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are described.",
   "5-6": "Methodological considerations associated with collecting relevant and sufficient data to answer the research question are explained."
  }
 },
 {
  "id": "RD3",
  "criterion": "RD",
  "name": "Reproducibility of methodology",
  "levels": {
   "1-2": "The description of the methodology for collecting or selecting data lacks the detail to allow for the investigation to be reproduced.",
   "3-4": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced with few ambiguities or omissions.",
   "5-6": "The description of the methodology for collecting or selecting data allows for the investigation to be reproduced."
  }
 },
 {
  "id": "DA1",
  "criterion": "DA",
  "name": "Communication of data",
  "levels": {
   "1-2": "The recording and processing of the data is communicated but is neither clear nor precise.",
   "3-4": "The communication of the recording and processing of the data is either clear or precise.",
   "5-6": "The communication of the recording and processing of the data is both clear and precise."
  }
 },
 {
  "id": "DA2",
  "criterion": "DA",
  "name": "Consideration of uncertainties",
  "levels": {
   "1-2": "The recording and processing of data shows limited evidence of the consideration of uncertainties.",
   "3-4": "The recording and processing of data shows evidence of a consideration of uncertainties but with some significant omissions or inaccuracies.",
   "5-6": "The recording and processing of data shows evidence of an appropriate consideration of uncertainties."
  }
 },
 {
  "id": "DA3",
  "criterion": "DA",
  "name": "Processing quality",
  "levels": {
   "1-2": "Some processing of data relevant to addressing the research question is carried out but with major omissions, inaccuracies or inconsistencies.",
   "3-4": "The processing of data relevant to addressing the research question is carried out but with some significant omissions, inaccuracies or inconsistencies.",
   "5-6": "The processing of data relevant to addressing the research question is carried out appropriately and accurately."
  }
 },
 {
  "id": "CO1",
  "criterion": "CO",
  "name": "Relevance and support",
  "levels": {
   "1-2": "A conclusion is stated that is relevant to the research question but is not supported by the analysis presented.",
   "3-4": "A conclusion is described that is relevant to the research question but is not fully consistent with the analysis presented.",
   "5-6": "A conclusion is justified that is relevant to the research question and fully consistent with the analysis presented."
  }
 },
 {
  "id": "CO2",
  "criterion": "CO",
  "name": "Scientific context comparison",
  "levels": {
   "1-2": "The conclusion makes superficial comparison to the accepted scientific context.",
   "3-4": "A conclusion is described that makes some relevant comparison to the accepted scientific context.",
   "5-6": "A conclusion is justified through relevant comparison to the accepted scientific context."
  }
 },
 {
  "id": "CO3",
  "criterion": "CO",
  "name": "Practical implications",
  "levels": {
   "1-2": "Practical implications of the findings are stated.",
   "3-4": "Practical implications of the findings are outlined.",
   "5-6": "Practical implications of the findings are explained."
  }
 },
 {
  "id": "EV1",
  "criterion": "EV",
  "name": "Weaknesses and limitations",
  "levels": {
   "1-2": "The report states generic methodological weaknesses or limitations.",
   "3-4": "The report describes specific methodological weaknesses or limitations.",
   "5-6": "The report explains the relative impact of specific methodological weaknesses or limitations."
  }
 },
 {
  "id": "EV2",
  "criterion": "EV",
  "name": "Improvement",
  "levels": {
   "1-2": "Realistic improvements to the investigation are stated.",
   "3-4": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are described.",
   "5-6": "Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are explained."
  }
 }
];

/**
 * What an IB teacher checks for under each strand, paraphrased from the IB SEHS teacher support material
 * ("Unpacking the internal assessment"). Used to judge the evidence. A check can confirm or lower a level, never raise it.
 */
export const CHECKS: Record<string, string[]> = {
  RD1: ['the research question is the student\'s own, names the independent and dependent variable (or the two correlated variables) and both can be quantified; no vague words such as "performance"', 'the sample population is described and conclusions are framed as applying to that sample only', 'background is focused on the exact research question, not a general overview of the topic', 'published research is used to explain why the link between the variables is worth investigating'],
  RD2: ['the method can generate data that answers the question; it is a record of what was done (with any trial or preliminary work), not a plan', 'the dependent variable measurement, the independent variable conditions and the range or intervals chosen are explained', 'every variable is controlled or monitored, confounding variables are named with how their effect was reduced; switching an air conditioner off does not control temperature', 'enough repetitions and data for the system studied; qualitative observations where relevant; safety and ethics count only where they matter to this study'],
  RD3: ['a reader could repeat the investigation from the procedure alone', 'non-standard equipment (for example radar gun, force plate) is identified with model or size and its uncertainty; standard protocols are cited'],
  DA1: ['correct units, in column headings, and a consistent number of decimal places (small slips are acceptable if consistency was clearly attempted)', 'tables and figures have titles or numbers and are referred to in the text; concise column headings', 'sample raw data is shown, and a sample calculation, formula or screenshot where processing is not obvious', 'graphs have labelled axes, a title and a legend where needed', 'the same quantity has the same value everywhere (text, tables, graphs, conclusion); values are not more precise than the instrument allows'],
  DA2: ['instrument precision or uncertainty is stated and realistic for how the instrument was used', 'variation is shown (range, standard deviation, R squared, error bars) and significance testing is considered', 'outliers are neither silently removed nor ignored; uncertainties are reported consistently; propagation of uncertainties is not expected', 'the impact of uncertainty on the conclusion is credited under Conclusion, not here'],
  DA3: ['processing suits the research question and is at Diploma level; the choice of statistical test is justified', 'calculations and graphs are correct; trend lines are realistic', 'there is enough data for the processing used'],
  CO1: ['the conclusion answers the research question within the sample, refers to the data directly and to the hypothesis if one was stated', 'statistical tests are interpreted correctly; a result that is not significant is not presented as support (for example because the p-value is close to 0.05)', 'the conclusion discusses reliability of the data, the impact of uncertainties and the sample size', 'the conclusion is consistent with the analysis; any contradiction between them lowers this strand'],
  CO2: ['relevant published research explains the outcome and the sources can be traced', 'the result is compared with general models or accepted values and explained in a sports science context; if no accepted value exists, the student judges whether the result is reasonable'],
  CO3: ['the result is linked to a real application and to how coaches, athletes or health professionals could use it, supported by the literature', 'an inconclusive result has limited implications and may point to further study'],
  EV1: ['weaknesses are specific to this method and evidenced; generic points such as a small sample or "more measurements" are generic limitations', 'careless errors and hypothetical events with no evidence are not weaknesses', 'the relative impact of each significant weakness is judged (major or minor) and linked to the quality of the data'],
  EV2: ['improvements are realistic and doable in a school or field setting and relate to the weaknesses identified', 'generalities such as "take more measurements" or "use a more precise instrument" count only when tied to a specific weakness'],
};

/** Official IB wording for level 0 differs by criterion: Research design says "the standard", the others say "a standard". */
export const LEVEL0: Record<string, string> = {
  RD: 'The report does not reach the standard described by the descriptors below.',
  DA: 'The report does not reach a standard described by the descriptors below.',
  CO: 'The report does not reach a standard described by the descriptors below.',
  EV: 'The report does not reach a standard described by the descriptors below.',
};

/** Definitions from the official IB SEHS IA assessment criteria. They fix the meaning of the descriptor words. */
export const OFFICIAL_TERMS = [
  'Research design: a research question with context names both variables, describes the system the question sits in and includes directly relevant background theory. Methodological considerations include the sampling or database choice, scope, quantity and range of measurements, and recognition of safety, ethical or environmental issues.',
  'Data analysis: clear means the method of processing can be understood easily; precise means conventions are followed (annotation of graphs and tables, units, decimal places, significant figures). Major omissions, inaccuracies or inconsistencies stop a valid conclusion being drawn; significant ones allow a conclusion but limit its validity or detail.',
  'Conclusion: fully consistent means the interpretation of the processed data includes its uncertainties; sources of scientific context must be traceable.',
  'Evaluation: generic means general to many methodologies and not specific to this one. Weaknesses relate to control of variables, precision of measurement or variation in the data. Limitations relate to the scope of the conclusion, such as the range of data, the confines of the system and assumptions made.',
].join('\n');

/**
 * Mandatory checks from the IB moderator's SEHS IA template. Each belongs to one strand. A missing check holds that strand at 3-4 at most.
 * Two are counted in code (bg_sources, lit_new). Mirrors src/lib/templateChecks.ts.
 */
export type TemplateCheck = { id: string; strand: string; section: string; text: string; fix: string };
export const TEMPLATE_CHECKS: TemplateCheck[] = [
  { id: 'rq_parts', strand: 'RD1', section: 'rq', text: 'The research question includes the IV, DV, units, the measurement tool with its uncertainty, and the population', fix: 'Rewrite the research question so it names your independent and dependent variable, their units, the measuring tool with its uncertainty and who was tested.' },
  { id: 'bg_sources', strand: 'RD1', section: 'bg', text: 'At least four peer-reviewed sources in the background', fix: 'Add peer-reviewed studies that connect your two variables until you have at least four, and say what each one told you about your design.' },
  { id: 'bg_rationale', strand: 'RD1', section: 'bg', text: 'A scientific rationale linking the IV and DV, explaining why the link is worth investigating', fix: 'Write the reasoning that links your two variables, using the studies, so a reader sees why the link is worth testing.' },
  { id: 'bg_no_defs', strand: 'RD1', section: 'bg', text: 'No words spent defining the IV and DV', fix: 'Cut the lines that only define your variables and use the space for studies that connect them.' },
  { id: 'bg_underpins', strand: 'RD1', section: 'bg', text: 'Prior studies are shown to underpin the chosen design, not just define terms', fix: 'For each study, say which choice in your design it supports, such as the test, the sample or the range.' },
  { id: 'hyp_null', strand: 'RD1', section: 'hy', text: 'The null hypothesis is stated', fix: 'State the null hypothesis for your two variables beside the alternate one.' },
  { id: 'hyp_justified', strand: 'RD1', section: 'hy', text: 'The alternate hypothesis predicts the outcome with justification from the literature (120 words or fewer)', fix: 'Point to the study that supports the direction of your alternate hypothesis and keep it within 120 words.' },
  { id: 'var_table', strand: 'RD2', section: 'va', text: 'Controlled variables are tabled with how and why each is controlled', fix: 'Put your controlled variables in a table with how each was held constant and why it matters.' },
  { id: 'var_bias', strand: 'RD2', section: 'va', text: 'Bias controls are covered: order, practice, placebo and observer effects', fix: 'Say what you did about order effects, practice effects, placebo effects and observer bias.' },
  { id: 'var_confound', strand: 'RD2', section: 'va', text: 'Confounding variables are tabled with their effect and the steps taken to reduce it', fix: 'For each variable you could not control, say how it could affect the results and what you did to reduce that.' },
  { id: 'var_dv_process', strand: 'RD2', section: 'va', text: 'The dependent variable measurement process, device uncertainty and units are described', fix: 'Describe how the dependent variable was measured, the device uncertainty (with its source) and the units.' },
  { id: 'safety_ethics', strand: 'RD2', section: 'se', text: 'Safety and ethics are stated explicitly: PAR-Q, consent, adviser check, first aid, anonymity, right to withdraw, briefing and debrief, environmental statement', fix: 'Write a plain statement for each safety and ethics item, including an environmental statement even if there is no impact.' },
  { id: 'method_rationale', strand: 'RD2', section: 'me', text: 'Rationale and selection criteria for the participants are justified', fix: 'Say why you chose these variables and this group, how participants were selected and why that method helped.' },
  { id: 'uncertainty_justified', strand: 'RD2', section: 'me', text: 'The uncertainty of each tool is justified from a source or explained', fix: 'Say where each tool uncertainty comes from, such as the manual or a study, or how you decided it.' },
  { id: 'pretest', strand: 'RD3', section: 'me', text: 'A pre-test or pilot protocol is described with what it changed', fix: 'Describe your trial run and what you changed because of it.' },
  { id: 'protocol_steps', strand: 'RD3', section: 'me', text: 'A step-by-step testing protocol with briefing, warm-up, cool-down and debrief', fix: 'List the testing steps in order, starting with the briefing and warm-up and ending with the cool-down and debrief.' },
  { id: 'setup', strand: 'RD3', section: 'me', text: 'The test set-up is described (a picture helps)', fix: 'Describe the set-up with distances and positions, and add a photo if you can.' },
  { id: 'raw_data', strand: 'DA1', section: 'da', text: 'Raw data with units, uncertainties and consistent decimal places', fix: 'Show all raw measurements with units, uncertainty and the same number of decimal places.' },
  { id: 'interp_each', strand: 'DA1', section: 'da', text: 'Each table, graph and statistical test has its own interpretation', fix: 'Add a short interpretation under each table, graph and test instead of leaving it for the conclusion.' },
  { id: 'graph_conv', strand: 'DA1', section: 'da', text: 'Graphs have error bars, labelled axes with units and a descriptive title', fix: 'Add error bars, axis labels with units and a clear title to every graph.' },
  { id: 'anomalies', strand: 'DA2', section: 'da', text: 'Commentary on anomalies, missing data and bias effects in the raw data', fix: 'Comment on any anomalies, withdrawals or missing data and on possible fatigue, motivation or practice effects.' },
  { id: 'cv_sd', strand: 'DA2', section: 'da', text: 'Means, standard deviation, sample size and the coefficient of variation are shown and interpreted', fix: 'Show mean, standard deviation and n, work out the coefficient of variation and say what it means.' },
  { id: 'stat_test', strand: 'DA3', section: 'da', text: 'The statistical test is named, justified, reported and interpreted', fix: 'Name the test, say why it suits your data, give the result and explain what it means for the null hypothesis.' },
  { id: 'direct_answer', strand: 'CO1', section: 'co', text: 'A direct answer to the research question using processed data, with strength and limitations of the conclusion', fix: 'Answer the question directly with your means, spread and test result, and say how strong the conclusion is.' },
  { id: 'null_outcome', strand: 'CO1', section: 'co', text: 'The null hypothesis is explicitly accepted or rejected with inferential statistics', fix: 'State whether the null hypothesis is rejected or accepted and give the statistic that shows it.' },
  { id: 'lit_new', strand: 'CO2', section: 'co', text: 'At least two new peer-reviewed sources not used in the background', fix: 'Bring in at least two studies that you did not use in the background and compare their findings with yours.' },
  { id: 'lit_reasons', strand: 'CO2', section: 'co', text: 'Agreement and disagreement with the literature, with reasons for differences', fix: 'Say where your result agrees or disagrees with each study and why, such as sample, tools or setting.' },
  { id: 'implications', strand: 'CO3', section: 'co', text: 'Practical implications are specific: who benefits and how', fix: 'Name who could use the result, what they would do differently and how strong the evidence is.' },
  { id: 'generalis', strand: 'CO3', section: 'co', text: 'Generalisability is considered', fix: 'Say who the findings apply to and who they may not apply to.' },
  { id: 'error_types', strand: 'EV1', section: 'ev', text: 'Systematic and random errors are separated and explained', fix: 'Sort your errors into systematic and random, and say how each affected the results.' },
  { id: 'bias_named', strand: 'EV1', section: 'ev', text: 'Biases are named with their likely influence', fix: 'Name any order, practice, placebo or observer bias and how it may have changed the data.' },
  { id: 'limits_specific', strand: 'EV1', section: 'ev', text: 'Weaknesses are specific, with representativeness and reproducibility considered', fix: 'Make each weakness specific to your study and say how big its effect was.' },
  { id: 'improve_linked', strand: 'EV2', section: 'ev', text: 'Improvements are specific, realistic and linked to the weaknesses', fix: 'For each improvement, name the weakness it fixes and why it would work.' },
  { id: 'validity_reliability', strand: 'EV2', section: 'ev', text: 'A reflection on validity, reliability and generalisability', fix: 'Say whether the results are valid for the question, could be repeated by others and apply beyond your sample.' },
];
