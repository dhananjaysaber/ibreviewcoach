/**
 * SEHS 2026+ workshop template: STRUCTURAL COACHING GUIDE (not an IB rubric).
 * The school's workshop recommendations must never automatically award/deduct marks.
 * The existing four official assessment criteria remain the single scoring system.
 */
export type IbCriterion = 'Research Design' | 'Data Analysis' | 'Conclusion' | 'Evaluation';
export type WorkshopCheck = {
  id: string;
  title: string;
  question: string;
  guidance: string;
  example: string;
  higherBand?: string;
  searchTerms: string[];
  advisory?: boolean;
};
export type WorkshopSection = {
  id: string;
  name: string;
  criterion: IbCriterion;
  checks: WorkshopCheck[];
};
const c = (id:string,title:string,question:string,guidance:string,example:string,searchTerms:string[],higherBand?:string,advisory=false):WorkshopCheck => ({id,title,question,guidance,example,searchTerms,higherBand,advisory});
export const SEHS_WORKSHOP_SECTIONS:WorkshopSection[] = [
 {id:'rq',name:'01 · Research Question',criterion:'Research Design', checks:[
 c('rq-iv','Independent variable','What exactly is being changed or compared?','Identify the independent variable and the levels or conditions of the study.','In a footwear study: three footwear conditions, clearly defined.',['independent','iv','research question','research aim'],'Specific and reproducible investigation.'),
 c('rq-dv','Dependent variable','What is measured, and in which units?','The measurable outcome must be clear and appropriate to the chosen design.','Sprint time (s) rather than simply “performance”.',['dependent','dv','measurement','time','speed'],'Measurable outcome with meaningful precision.'),
 c('rq-measure','Measurement method and uncertainty','Which instrument or method measures the outcome, and what is its verified uncertainty?','Check instrument specifications; do not invent a precision value.','A speed gun reports km/h; confirm uncertainty against the actual model datasheet.',['uncertainty','speed gun','measurement','equipment','resolution'],'Clear enough that another investigator could reproduce measurements.'),
 c('rq-population','Population or system','Who or what is being investigated?','Define the participant group or system only as specifically as the data allow.','U19 softball players rather than “athletes”.',['population','participants','sample','group'],'A well-bounded, feasible investigation.'),
 c('rq-scope','Testable and reproducible focus','Could another researcher identify the IV, DV, context and measurement approach from the question?','Prefer one clear investigable relationship over several broad aims.','Clarify whether the outcome is speed or time; avoid mixing them.',['research question','reproduce','investigation','aim'],'Specific, measurable and reproducible research question.')
 ]},
 {id:'background',name:'02 · Background Information / Introduction',criterion:'Research Design',checks:[
 c('bg-link','Scientific rationale linking IV and DV','Why could changing the IV affect the DV?','Explain the science/mechanism, not only definitions of both variables.','For footwear and sprinting, investigate traction and force application as possible mechanisms.',['scientific','rationale','background','introduction','mechanism'],'Explain why the relationship is worth investigating.'),
 c('bg-literature','Relevant peer-reviewed research','Which published studies are directly relevant to this relationship?','Evaluate relevance and quality of studies rather than citing sources by number alone.','Ask whether studies measured the same outcome, with a similar population.',['literature','peer-reviewed','journal','studies','research'],'Prior research supports reasoning and design choices.'),
 c('bg-design','Research used to justify design','How did prior studies inform the conditions, protocol or measurement tool you selected?','Connect sources to decisions, not merely to general background.','A published sprint testing protocol might justify distance or recovery interval.',['previous research','study','method','design','protocol'],'Shows how prior scientific work underpins chosen design.'),
 c('bg-focus','Concise relevant context','Does each paragraph develop the RQ, or only define familiar terms?','Remove unrelated theory and keep a purposeful scientific narrative.','Instead of a long definition of speed, discuss mechanisms likely to affect speed.',['background','introduction','theory','rationale'],'Use scientific reasoning rather than generic definitions.',true),
 c('bg-count','Workshop literature/word targets','Does your introduction use suitable depth and supporting research?','Workshop suggests ~750 words and four peer-reviewed sources; these are guidance, NOT automatic IB requirements.','Three excellent relevant studies may be more useful than four unrelated ones.',['word count','sources','literature','citations'],'Prioritise relevance and insight, not mechanical counts.',true)
 ]},
 {id:'hypothesis',name:'03 · Hypotheses',criterion:'Research Design',checks:[
 c('hyp-alt','Alternative hypothesis','What result do you predict, and what published science justifies it?','Specify an evidence-led expectation appropriate to the study.','Consider which condition may influence the measured outcome, and why.',['alternative hypothesis','alternate hypothesis','hypothesis'],'A defensible, literature-connected prediction.'),
 c('hyp-null','Null hypothesis','What would no meaningful effect or relationship mean in this investigation?','Formulate the statistical null only when it is relevant to the design/test.','No statistically significant difference among the conditions.',['null hypothesis','h0','significant'],'Match the hypothesis to planned analysis.')
 ]},
 {id:'variables',name:'04 · Variables',criterion:'Research Design',checks:[
 c('var-iv','Independent variable and conditions','Can a reader identify and distinguish each independent-variable condition?','Describe each condition in context; use a photograph where it adds scientific clarity.','State exactly how trainers, turf shoes and cleats are distinguished.',['independent variable','conditions','footwear'],'Precise operational description.'),
 c('var-dv','Dependent variable measurement','How exactly was the DV measured, including units and real equipment uncertainty?','Explain the measurement process, not just the instrument brand.','Where did timing begin and end?',['dependent variable','measured','measurement','uncertainty'],'Repeatable method with defensible precision.'),
 c('var-controls','Controlled variables','Which relevant variables were held constant, how, and why?','Consider warm-up, environment, time of day, test duration and sample instructions when relevant.','A table can show variable → control method → reason for control.',['controlled variables','control','warm-up','environment'],'Justify important control decisions.'),
 c('var-bias','Bias controls','Could trial order, familiarisation, expectation or observer effects alter results?','Address only relevant order, practice, placebo and observer effects, with mitigation.','Randomise order when fatigue or learning could advantage a condition.',['randomisation','counterbalancing','familiarisation','blinding','bias'],'Explain impacts of relevant biases and the prevention methods.'),
 c('var-confound','Confounding variables','What could not be fully controlled and how might it influence the findings?','Acknowledge practical confounders without pretending they were controlled.','Prior sporting experience could affect participants differently.',['confounding','uncontrolled','mitigate','limitations'],'Evaluate likely direction and impact of confounding.')
 ]},
 {id:'safety',name:'05 · Safety and Ethics',criterion:'Research Design',checks:[
 c('safe-physical','Physical safety and risk assessment','What hazards exist, who may be harmed and what controls were used?','State actual safety practices; do not assert forms or approval were completed without evidence.','A risk table might include hazard → likelihood/severity → mitigations.',['safety','risk','injury','first aid'],'Explicit and context-specific risk management.'),
 c('safe-consent','Consent, screening and approval','How were participants appropriately informed, screened and protected?','Workshop mentions consent, PAR-Q and teacher review; verify local ethical requirements and practices.','Check whether consent was actually obtained before testing.',['consent','par-q','screening','ethical'],'Ethical safeguards explicitly described, never assumed.'),
 c('safe-rights','Anonymity and right to withdraw','How were confidentiality and withdrawal rights protected?','Avoid names and identifiers; explain how voluntary participation worked.','Use participant IDs in data tables.',['anonymity','withdraw','confidential','privacy'],'Specific participant rights and safeguards.'),
 c('safe-environment','Environmental consideration','Did the investigation have any environmental impacts or hazards?','If negligible, state that after considering the testing environment.','Compare any equipment, travel or resource use relevant to the study.',['environmental','sustainability','electricity'],'Demonstrate considered judgement, not boilerplate.')
 ]},
 {id:'method',name:'06 · Methodology',criterion:'Research Design',checks:[
 c('method-why','Method rationale','Why are this IV, DV and population appropriate to the question?','Justify design rather than simply describing its steps.','Explain why a specific population is appropriate for the performance test.',['rationale','methodology','design'],'Choices linked to research aims.'),
 c('method-sampling','Participant selection','How were participants selected and why was that procedure suitable?','Describe sampling method and its limitations accurately.','Convenience sampling should not be described as random allocation.',['sampling','selected','participants','recruitment'],'Justified sample and transparent limits.'),
 c('method-tools','Materials and uncertainty','Which non-generic materials or measuring devices are essential?','Provide model, resolution and justified uncertainty when relevant.','Record the timing-gate model rather than “electronic device”.',['materials','equipment','uncertainty','instrument'],'Factual equipment details and uncertainty.'),
 c('method-pilot','Pilot or pre-test','Was a pilot conducted, and what did it change?','Only claim a pilot if actually undertaken; explain useful lessons if so.','A pilot may reveal insufficient rest periods.',['pilot','pre-test','familiarisation'],'Evidence-led design refinement.',true),
 c('method-setup','Test setup and diagram','Could a reader understand the physical arrangement?','Use a diagram/photo when needed for reproducibility; describe setup if visual evidence is unavailable.','Show start/finish markers and the sensor location.',['setup','diagram','figure','photograph'],'Visual and textual clarity appropriate to complexity.',true),
 c('method-protocol','Step-by-step reproducible protocol','Could another researcher replicate what happened from beginning to end?','Describe sequence, trials, rest, briefing and warm-up/cool-down where relevant.','List what happens before, during and after each measured trial.',['procedure','protocol','steps','trials'],'A complete reproducible sequence.')
 ]},
 {id:'data',name:'07 · Data Analysis',criterion:'Data Analysis',checks:[
 c('data-raw','Raw data and anomalies','Are observations, units, precision and missing values presented transparently?','Explain anomalies without changing or hiding observations.','Use a raw-data table and note any participant withdrawal.',['raw data','measurements','anomalies','withdrawals'],'Accurate and complete raw evidence.'),
 c('data-process','Processing rationale','How were raw measurements transformed, and why?','Use calculations/statistics that suit the design and question.','Explain whether means and standard deviations meaningfully describe the sample.',['processing','calculation','mean','standard deviation'],'Appropriate mathematical processing with rationale.'),
 c('data-table','Analysed tables and uncertainty','Do processed tables include clear headings, sample size, units and relevant uncertainty?','Avoid unexplained precision or misleading summaries.','A table heading states mean sprint time (s), n and SD when appropriate.',['analysed','table','sample size','uncertainty'],'Tables should support interpretation.'),
 c('data-variation','Variation and coefficient of variation','What does the spread of the data mean? Is CV appropriate?','The workshop recommends CV, but it may be inappropriate for some variables; explain rather than force it.','CV expresses SD relative to a meaningful ratio-scale mean.',['variation','coefficient of variation','cv','standard deviation'],'Explain variability in context.',true),
 c('data-graphs','Graphs and uncertainties','Do graph type, axes, units and uncertainty representations match the data?','Use error bars where statistically appropriate; explain what they show.','Distinguish SD variation from SE uncertainty in a plotted mean.',['graph','error bars','axes','scatter'],'Clear, accurately interpreted visuals.'),
 c('data-interpret','Interpretation of tables and graphs','What pattern does each figure show in relation to the RQ?','Explain meaningful trends and exceptions near the actual table or graph.','Compare conditions, not just “the bar chart increases”.',['interpretation','trend','results','comparison'],'Integrates evidence and context rather than postponing all meaning to the conclusion.'),
 c('data-stats','Statistical test selection and interpretation','Why was the statistical test appropriate for the data and design?','Explain assumptions, relevant statistics and interpretation, avoiding automatic significance claims.','For a repeated-measures design, consider dependency before selecting a test.',['statistical test','t-test','anova','correlation','p-value'],'Justified inference with appropriate limitations.')
 ]},
 {id:'conclusion',name:'08 · Conclusion',criterion:'Conclusion',checks:[
 c('con-answer','Answer to research question','What do your measured results actually support?','Answer directly with appropriate caution rather than overclaiming causality.','Tie the answer to the measured DV and studied population.',['conclusion','research question','findings'],'A confident but bounded evidence-led answer.'),
 c('con-evidence','Processed evidence and hypothesis','Which means, uncertainty measures and tests support the conclusion?','Interpret statistical evidence carefully; do not automatically “accept” the null after a non-significant result.','A non-significant p-value may mean insufficient evidence to reject H0.',['hypothesis','p-value','mean','significant'],'Claim strength matches evidence and analysis.'),
 c('con-literature','Comparison with scientific literature','How do results agree or differ from relevant published studies?','The workshop suggests two new peer-reviewed sources; prioritise pertinent scientific comparisons.','Consider differences in population or instrument that explain divergent results.',['literature','studies','research','comparison'],'Findings placed in defensible scientific context.',true),
 c('con-implications','Practical implications and generalisability','Who could use the findings, and to whom do they not necessarily apply?','Be specific and avoid extending a small sample to all athletes.','A study of U19 players may not transfer to younger beginners.',['practical','training','generalisability','implications'],'Realistic implications tied to actual study limits.')
 ]},
 {id:'evaluation',name:'09 · Evaluation',criterion:'Evaluation',checks:[
 c('eval-limit','Specific limitations and their impact','Which limitations mattered most, and how did they affect the conclusion?','Rank issues by consequence rather than listing generic errors.','Explain how a small control group limits certainty.',['limitations','weakness','sample','reliability'],'Relative impact on conclusion explicitly analysed.'),
 c('eval-error','Random and systematic error','Could results be affected by random variation or consistent bias?','Distinguish error types accurately with relevant examples.','Trial-to-trial variation differs from a consistently miscalibrated device.',['systematic','random error','uncertainty'],'Error mechanism and effect clearly reasoned.'),
 c('eval-bias','Uncontrolled variables and biases','How might fatigue, practice, order or observer effects influence results?','Mention only effects that are reasonably plausible for the design.','Same-order testing may favour later conditions via practice.',['confounding','bias','fatigue','observer'],'Explain direction and possible scale of influence.'),
 c('eval-fix','Realistic justified improvements','What specific change addresses each meaningful weakness?','Connect improvement to limitation and likely impact; avoid generic suggestions.','Randomising trial order can address a possible order effect.',['improvements','future','randomise','recommendations'],'Justified improvements, sometimes literature-supported.'),
 c('eval-quality','Validity, reliability and scope','How defensible and reproducible are the conclusions?','Reflect on whether the question was answered and what remains uncertain.','Distinguish internal validity from external generalisability.',['validity','reliability','reproducibility','generalise'],'Reflect on real strengths and boundaries of the findings.')
 ]}
];
export const SEHS_OFFICIAL_CRITERIA = [
 {name:'Research Design',maximum:6},
 {name:'Data Analysis',maximum:6},
 {name:'Conclusion',maximum:6},
 {name:'Evaluation',maximum:6}
] as const;
