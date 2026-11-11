/** Teacher strand sheet and IB moderator template checks. Mirrors supabase/functions/mark-map/rubric.ts (a test checks they match word for word). */
export const CRITERIA_LIST = [{"code":"RD","name":"Research design","max":6},{"code":"DA","name":"Data analysis","max":6},{"code":"CO","name":"Conclusion","max":6},{"code":"EV","name":"Evaluation","max":6}] as const;
export const LEVEL_ZERO: Record<string, string> = {"RD":"The report does not reach the standard described by the descriptors below.","DA":"The report does not reach a standard described by the descriptors below.","CO":"The report does not reach a standard described by the descriptors below.","EV":"The report does not reach a standard described by the descriptors below."};
export const STRAND_DESCRIPTORS: Record<string, Record<string, string>> = {
  RD1: {"1-2":"The research question is stated without context.","3-4":"The research question is outlined within a broad context.","5-6":"The research question is described within a specific and appropriate context."},
  RD2: {"1-2":"Methodological considerations associated with collecting data relevant to the research question are stated.","3-4":"Methodological considerations associated with collecting relevant and sufficient data to answer the research question are described.","5-6":"Methodological considerations associated with collecting relevant and sufficient data to answer the research question are explained."},
  RD3: {"1-2":"The description of the methodology for collecting or selecting data lacks the detail to allow for the investigation to be reproduced.","3-4":"The description of the methodology for collecting or selecting data allows for the investigation to be reproduced with few ambiguities or omissions.","5-6":"The description of the methodology for collecting or selecting data allows for the investigation to be reproduced."},
  DA1: {"1-2":"The recording and processing of the data is communicated but is neither clear nor precise.","3-4":"The communication of the recording and processing of the data is either clear or precise.","5-6":"The communication of the recording and processing of the data is both clear and precise."},
  DA2: {"1-2":"The recording and processing of data shows limited evidence of the consideration of uncertainties.","3-4":"The recording and processing of data shows evidence of a consideration of uncertainties but with some significant omissions or inaccuracies.","5-6":"The recording and processing of data shows evidence of an appropriate consideration of uncertainties."},
  DA3: {"1-2":"Some processing of data relevant to addressing the research question is carried out but with major omissions, inaccuracies or inconsistencies.","3-4":"The processing of data relevant to addressing the research question is carried out but with some significant omissions, inaccuracies or inconsistencies.","5-6":"The processing of data relevant to addressing the research question is carried out appropriately and accurately."},
  CO1: {"1-2":"A conclusion is stated that is relevant to the research question but is not supported by the analysis presented.","3-4":"A conclusion is described that is relevant to the research question but is not fully consistent with the analysis presented.","5-6":"A conclusion is justified that is relevant to the research question and fully consistent with the analysis presented."},
  CO2: {"1-2":"The conclusion makes superficial comparison to the accepted scientific context.","3-4":"A conclusion is described that makes some relevant comparison to the accepted scientific context.","5-6":"A conclusion is justified through relevant comparison to the accepted scientific context."},
  CO3: {"1-2":"Practical implications of the findings are stated.","3-4":"Practical implications of the findings are outlined.","5-6":"Practical implications of the findings are explained."},
  EV1: {"1-2":"The report states generic methodological weaknesses or limitations.","3-4":"The report describes specific methodological weaknesses or limitations.","5-6":"The report explains the relative impact of specific methodological weaknesses or limitations."},
  EV2: {"1-2":"Realistic improvements to the investigation are stated.","3-4":"Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are described.","5-6":"Realistic improvements to the investigation that are relevant to the identified weaknesses or limitations are explained."},
};
export const STRAND_NAMES: Record<string, string> = {"RD1":"Research Question Context","RD2":"Methodological consideration","RD3":"Reproducibility of methodology","DA1":"Communication of data","DA2":"Consideration of uncertainties","DA3":"Processing quality","CO1":"Relevance and support","CO2":"Scientific context comparison","CO3":"Practical implications","EV1":"Weaknesses and limitations","EV2":"Improvement"};
export const NOT_REACHED = "The report does not reach the standard described by the descriptors below.";
export type TemplateCheck = { id: string; strand: string; section: string; text: string; fix: string };
export const TEMPLATE_CHECKS: TemplateCheck[] = [
 {
  "id": "rq_parts",
  "strand": "RD1",
  "section": "rq",
  "text": "The research question includes the IV, DV, units, the measurement tool with its uncertainty, and the population",
  "fix": "Rewrite the research question so it names your independent and dependent variable, their units, the measuring tool with its uncertainty and who was tested."
 },
 {
  "id": "bg_sources",
  "strand": "RD1",
  "section": "bg",
  "text": "At least four peer-reviewed sources in the background",
  "fix": "Add peer-reviewed studies that connect your two variables until you have at least four, and say what each one told you about your design."
 },
 {
  "id": "bg_rationale",
  "strand": "RD1",
  "section": "bg",
  "text": "A scientific rationale linking the IV and DV, explaining why the link is worth investigating",
  "fix": "Write the reasoning that links your two variables, using the studies, so a reader sees why the link is worth testing."
 },
 {
  "id": "bg_no_defs",
  "strand": "RD1",
  "section": "bg",
  "text": "No words spent defining the IV and DV",
  "fix": "Cut the lines that only define your variables and use the space for studies that connect them."
 },
 {
  "id": "bg_underpins",
  "strand": "RD1",
  "section": "bg",
  "text": "Prior studies are shown to underpin the chosen design, not just define terms",
  "fix": "For each study, say which choice in your design it supports, such as the test, the sample or the range."
 },
 {
  "id": "hyp_null",
  "strand": "RD1",
  "section": "hy",
  "text": "The null hypothesis is stated",
  "fix": "State the null hypothesis for your two variables beside the alternate one."
 },
 {
  "id": "hyp_justified",
  "strand": "RD1",
  "section": "hy",
  "text": "The alternate hypothesis predicts the outcome with justification from the literature (120 words or fewer)",
  "fix": "Point to the study that supports the direction of your alternate hypothesis and keep it within 120 words."
 },
 {
  "id": "var_table",
  "strand": "RD2",
  "section": "va",
  "text": "Controlled variables are tabled with how and why each is controlled",
  "fix": "Put your controlled variables in a table with how each was held constant and why it matters."
 },
 {
  "id": "var_bias",
  "strand": "RD2",
  "section": "va",
  "text": "Bias controls are covered: order, practice, placebo and observer effects",
  "fix": "Say what you did about order effects, practice effects, placebo effects and observer bias."
 },
 {
  "id": "var_confound",
  "strand": "RD2",
  "section": "va",
  "text": "Confounding variables are tabled with their effect and the steps taken to reduce it",
  "fix": "For each variable you could not control, say how it could affect the results and what you did to reduce that."
 },
 {
  "id": "var_dv_process",
  "strand": "RD2",
  "section": "va",
  "text": "The dependent variable measurement process, device uncertainty and units are described",
  "fix": "Describe how the dependent variable was measured, the device uncertainty (with its source) and the units."
 },
 {
  "id": "safety_ethics",
  "strand": "RD2",
  "section": "se",
  "text": "Safety and ethics are stated explicitly: PAR-Q, consent, adviser check, first aid, anonymity, right to withdraw, briefing and debrief, environmental statement",
  "fix": "Write a plain statement for each safety and ethics item, including an environmental statement even if there is no impact."
 },
 {
  "id": "method_rationale",
  "strand": "RD2",
  "section": "me",
  "text": "Rationale and selection criteria for the participants are justified",
  "fix": "Say why you chose these variables and this group, how participants were selected and why that method helped."
 },
 {
  "id": "uncertainty_justified",
  "strand": "RD2",
  "section": "me",
  "text": "The uncertainty of each tool is justified from a source or explained",
  "fix": "Say where each tool uncertainty comes from, such as the manual or a study, or how you decided it."
 },
 {
  "id": "pretest",
  "strand": "RD3",
  "section": "me",
  "text": "A pre-test or pilot protocol is described with what it changed",
  "fix": "Describe your trial run and what you changed because of it."
 },
 {
  "id": "protocol_steps",
  "strand": "RD3",
  "section": "me",
  "text": "A step-by-step testing protocol with briefing, warm-up, cool-down and debrief",
  "fix": "List the testing steps in order, starting with the briefing and warm-up and ending with the cool-down and debrief."
 },
 {
  "id": "setup",
  "strand": "RD3",
  "section": "me",
  "text": "The test set-up is described (a picture helps)",
  "fix": "Describe the set-up with distances and positions, and add a photo if you can."
 },
 {
  "id": "raw_data",
  "strand": "DA1",
  "section": "da",
  "text": "Raw data with units, uncertainties and consistent decimal places",
  "fix": "Show all raw measurements with units, uncertainty and the same number of decimal places."
 },
 {
  "id": "interp_each",
  "strand": "DA1",
  "section": "da",
  "text": "Each table, graph and statistical test has its own interpretation",
  "fix": "Add a short interpretation under each table, graph and test instead of leaving it for the conclusion."
 },
 {
  "id": "graph_conv",
  "strand": "DA1",
  "section": "da",
  "text": "Graphs have error bars, labelled axes with units and a descriptive title",
  "fix": "Add error bars, axis labels with units and a clear title to every graph."
 },
 {
  "id": "anomalies",
  "strand": "DA2",
  "section": "da",
  "text": "Commentary on anomalies, missing data and bias effects in the raw data",
  "fix": "Comment on any anomalies, withdrawals or missing data and on possible fatigue, motivation or practice effects."
 },
 {
  "id": "cv_sd",
  "strand": "DA2",
  "section": "da",
  "text": "Means, standard deviation, sample size and the coefficient of variation are shown and interpreted",
  "fix": "Show mean, standard deviation and n, work out the coefficient of variation and say what it means."
 },
 {
  "id": "stat_test",
  "strand": "DA3",
  "section": "da",
  "text": "The statistical test is named, justified, reported and interpreted",
  "fix": "Name the test, say why it suits your data, give the result and explain what it means for the null hypothesis."
 },
 {
  "id": "direct_answer",
  "strand": "CO1",
  "section": "co",
  "text": "A direct answer to the research question using processed data, with strength and limitations of the conclusion",
  "fix": "Answer the question directly with your means, spread and test result, and say how strong the conclusion is."
 },
 {
  "id": "null_outcome",
  "strand": "CO1",
  "section": "co",
  "text": "The null hypothesis is explicitly accepted or rejected with inferential statistics",
  "fix": "State whether the null hypothesis is rejected or accepted and give the statistic that shows it."
 },
 {
  "id": "lit_new",
  "strand": "CO2",
  "section": "co",
  "text": "At least two new peer-reviewed sources not used in the background",
  "fix": "Bring in at least two studies that you did not use in the background and compare their findings with yours."
 },
 {
  "id": "lit_reasons",
  "strand": "CO2",
  "section": "co",
  "text": "Agreement and disagreement with the literature, with reasons for differences",
  "fix": "Say where your result agrees or disagrees with each study and why, such as sample, tools or setting."
 },
 {
  "id": "implications",
  "strand": "CO3",
  "section": "co",
  "text": "Practical implications are specific: who benefits and how",
  "fix": "Name who could use the result, what they would do differently and how strong the evidence is."
 },
 {
  "id": "generalis",
  "strand": "CO3",
  "section": "co",
  "text": "Generalisability is considered",
  "fix": "Say who the findings apply to and who they may not apply to."
 },
 {
  "id": "error_types",
  "strand": "EV1",
  "section": "ev",
  "text": "Systematic and random errors are separated and explained",
  "fix": "Sort your errors into systematic and random, and say how each affected the results."
 },
 {
  "id": "bias_named",
  "strand": "EV1",
  "section": "ev",
  "text": "Biases are named with their likely influence",
  "fix": "Name any order, practice, placebo or observer bias and how it may have changed the data."
 },
 {
  "id": "limits_specific",
  "strand": "EV1",
  "section": "ev",
  "text": "Weaknesses are specific, with representativeness and reproducibility considered",
  "fix": "Make each weakness specific to your study and say how big its effect was."
 },
 {
  "id": "improve_linked",
  "strand": "EV2",
  "section": "ev",
  "text": "Improvements are specific, realistic and linked to the weaknesses",
  "fix": "For each improvement, name the weakness it fixes and why it would work."
 },
 {
  "id": "validity_reliability",
  "strand": "EV2",
  "section": "ev",
  "text": "A reflection on validity, reliability and generalisability",
  "fix": "Say whether the results are valid for the question, could be repeated by others and apply beyond your sample."
 }
];
