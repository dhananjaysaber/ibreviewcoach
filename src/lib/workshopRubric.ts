/** SEHS 2026+ IA workshop template, pages 1-10. Workshop recommendations are
 * deliberately not represented as official IB marking requirements. */
export type WorkshopCheck = { id:string; title:string; prompt:string; example:string; higher?:string; advisory?:string; keywords:string[] };
export type WorkshopSection = { id:string; title:string; criterion:'Research Design'|'Data Analysis'|'Conclusion'|'Evaluation'; checks:WorkshopCheck[] };
const check=(id:string,title:string,prompt:string,example:string,keywords:string[],higher?:string,advisory?:string):WorkshopCheck=>({id,title,prompt,example,keywords,higher,advisory});
export const WORKSHOP_SECTIONS:WorkshopSection[]=[
{id:'rq',title:'01 · Research Question',criterion:'Research Design',checks:[
check('rq-iv','Independent variable','What exactly do you change or compare?','List the conditions, e.g. underarm / sidearm / overarm throws.',['research question','independent','type of throw'], 'Specific and precisely defined variables'),
check('rq-dv','Dependent variable and units','What outcome do you measure, and in which units?','Speed (km/h) rather than simply performance.',['dependent','speed','km/h','measurement'], 'Measurable outcome'),
check('rq-tool','Measurement method and uncertainty','Which instrument measures your outcome? What is its verified uncertainty?','A velocity speed gun may report ±2 km/h; check your actual model specification.',['uncertainty','speed gun','instrument','device'], 'Transparent, reproducible measurement'),
check('rq-pop','Population or system','Who or what are you investigating?','U19 varsity softball players, not simply athletes.',['population','participant','u19','players'], 'Specific population and meaningful scope'),
check('rq-scope','Research question focus','Could another researcher tell exactly what is being compared and measured?','Name the conditions and measurable outcome without writing a generic topic.',['research question','specific','reproducible'], 'Specific, measurable and reproducible research question')
]},
{id:'background',title:'02 · Background Information / Introduction',criterion:'Research Design',checks:[
check('bg-rationale','Scientific rationale','Which scientific mechanism could link the IV to the DV? Why investigate this relationship?','For throw type and ball speed, research the mechanics of force transfer and release velocity.',['scientific','rationale','mechanism','literature'], 'Explain mechanisms, not just definitions'),
check('bg-studies','Peer-reviewed evidence','Which peer-reviewed studies directly investigate your variables or mechanism?','Compare published findings, context and methodology; do not merely list definitions.',['peer-reviewed','studies','references','literature'], 'Relevant, critically integrated research','The workshop suggests at least four peer-reviewed sources; this is guidance, not an automatic IB threshold.'),
check('bg-design','Evidence informing design','How did previous studies influence your choice of measurements, participant group or test?','Explain whether prior studies informed your instrument or standardised protocol.',['design','prior studies','method','background'], 'Prior research meaningfully underpins design'),
check('bg-focus','Concise scientific context','Which background information directly supports your research question?','Spend more space on relevant science than broad definitions.',['context','introduction','background'], 'Focused scientific argument','The workshop suggests roughly 750 words; assess scientific quality rather than enforcing an exact count.')
]},
{id:'hypotheses',title:'03 · Hypotheses',criterion:'Research Design',checks:[
check('hyp-alt','Alternative hypothesis','What outcome do you predict? What literature supports that prediction?','Identify a predicted direction and cite evidence rather than guessing.',['alternative hypothesis','hypothesis','prediction'],undefined,'The workshop suggests a maximum of 120 words for this explanation.'),
check('hyp-null','Null hypothesis','What would no statistically detectable relationship or difference mean for this RQ?','Define no difference or association for the actual IV and DV.',['null hypothesis','h0','significant'])
]},
{id:'variables',title:'04 · Variables',criterion:'Research Design',checks:[
check('var-iv','Independent variable detail','Have you defined each tested condition and its practical implementation?','Show how three footwear conditions differ, with a labelled image if useful.',['independent','condition','footwear'],undefined,'A relevant photograph is helpful but not compulsory for every study.'),
check('var-dv','Dependent variable measurement','How exactly will the DV be measured, with what units, method and uncertainty?','Describe how timing gates work, the unit recorded and verified precision.',['dependent','measurement','uncertainty','units']),
check('var-control','Controlled variables','What is held constant, how, and why would variation influence results?','Tabulate warm-up, surface, time of day and how they are controlled.',['controlled','warm-up','environment','table']),
check('var-bias','Bias and order effects','Could trial order, practice, expectations or observer behaviour affect results?','Consider randomisation, familiarisation, blinding or objective equipment as applicable.',['order effect','practice','placebo','observer','bias']),
check('var-confound','Confounding variables','Which factors cannot reasonably be controlled and how did you limit their influence?','Explain a factor such as prior exercise and the practical mitigation.',['confounding','uncontrolled','mitigate'])
]},
{id:'safety',title:'05 · Safety and Ethics',criterion:'Research Design',checks:[
check('safety-physical','Physical safety and risks','Which hazards exist and what controls protect participants?','Identify hazard, severity, affected individuals and mitigation in a risk table.',['safety','hazard','risk']),
check('safety-consent','Screening, consent and supervision','How did you verify informed consent and appropriate participant screening?','Describe consent, injury screening, supervision and emergency readiness, as applicable.',['consent','par-q','screening','first aid'], 'Safeguards are explicit, not assumed','Workshop suggests blank PAR-Q and consent forms in appendices where applicable and permitted.'),
check('safety-ethics','Participant rights and privacy','How are anonymity, withdrawal and secure handling of results protected?','Explain anonymisation and the ability to withdraw under the agreed protocol.',['ethical','anonymous','withdraw','privacy']),
check('safety-env','Environmental considerations','What environmental impact or venue-related issues did you consider?','If none are material, explain that you considered them.',['environmental','electricity','resources'])
]},
{id:'method',title:'06 · Methodology',criterion:'Research Design',checks:[
check('method-why','Testing rationale','Why is your selected test suitable for the IV, DV and target population?','Link the test to the scientific question and sampling context.',['rationale','method','testing']),
check('method-sample','Participant selection','How were participants selected, and what implications does this have?','Distinguish convenience selection from random sampling; explain limitations.',['selection','sampling','participants']),
check('method-tools','Materials and uncertainty','Which specialist instruments are used, and what are their verified specifications?','List relevant measuring tools rather than every ordinary item.',['materials','instrument','uncertainty']),
check('method-pilot','Pre-test or familiarisation','Did you pilot the protocol? What did it reveal or change?','Explain whether a pilot changed recovery time or instructions.',['pilot','pre-test','familiarisation']),
check('method-setup','Testing setup','Can the layout and measurement positions be understood?','Use a labelled setup photograph if it helps replication.',['setup','layout','figure','diagram'],undefined,'A setup image is recommended where informative, not an automatic requirement.'),
check('method-steps','Reproducible testing steps','Could someone repeat the full sequence, including instructions, trials, rest and recovery?','Specify the start, measurement, number of trials, rest intervals and cool-down.',['protocol','procedure','step','replicate'], 'Methodology is sufficiently reproducible')
]},
{id:'analysis',title:'07 · Data Analysis',criterion:'Data Analysis',checks:[
check('data-raw','Raw data and units','Are original measurements visible, correctly labelled and traceable?','Include raw trial measurements and relevant uncertainty.',['raw data','units','table']),
check('data-anomalies','Anomalies and missing data','Have you explained outliers, withdrawals or equipment problems?','Describe anomalous values without silently excluding them.',['anomaly','outlier','missing','withdrawal']),
check('data-method','Data processing rationale','Which calculations are used and why do they answer the RQ?','Explain the reason for averaging repeated trials or computing a change score.',['processing','calculation','mean']),
check('data-tables','Analysed tables','Are means, variability, sample size and appropriate units clearly presented?','Show mean, SD and n in a labelled table when relevant.',['standard deviation','mean','sample size','table']),
check('data-variation','Variation and precision','Have you appropriately analysed spread and explained what it means?','Coefficient of variation may help compare variability when appropriate.',['coefficient of variation','cv','variation','uncertainty'],undefined,'The workshop recommends CV; use it only when statistically meaningful for the data.'),
check('data-graphs','Graphs','Does the graph type, title, axes, units and uncertainty suit the data?','Compare categorical groups with an appropriate plot and justified variability indicators.',['graph','axis','error bars','scatter'],undefined,'The workshop suggests error bars on graphs; select SD/SE/CI based on the analytical purpose.'),
check('data-interpret','Interpret each output','Do you explain what each graph or table actually demonstrates about the RQ?','Describe the direction and magnitude of a pattern, including uncertainty.',['interpretation','trend','results'], 'Interpretation accompanies each relevant output'),
check('data-stats','Statistical test selection','Why is your chosen test appropriate for the variables, design and assumptions?','Explain when a paired test versus an independent-groups test would be appropriate.',['statistical','t-test','anova','correlation']),
check('data-stats-meaning','Interpret statistical results','What do the test statistic and p-value/effect size mean in context?','Distinguish statistical significance from practical importance.',['p-value','significance','effect size','interpretation'])
]},
{id:'conclusion',title:'08 · Conclusion',criterion:'Conclusion',checks:[
check('con-answer','Answer the research question','What does your study actually show about the IV and DV?','State the supported direction or relationship without overstating causation.',['conclusion','research question','findings'], 'Clear and appropriately qualified answer'),
check('con-evidence','Support with data','Which means, spread and statistical results support your interpretation?','Use specific observed results and their uncertainty.',['mean','standard deviation','statistical','data'], 'Reasoning directly grounded in processed data'),
check('con-hyp','Hypothesis outcome','Does the result support or fail to support the hypothesis, and why?','Avoid treating a nonsignificant result as proof that no effect exists.',['hypothesis','null','significance']),
check('con-lit','Scientific literature comparison','Where do findings agree or differ from other research? What might explain this?','Consider population, protocol, instrument and context differences.',['literature','studies','compare'], 'Scientific context integrated with findings','The workshop suggests at least two new peer-reviewed studies; this is advisory.'),
check('con-practice','Practical application and scope','Who could apply these findings, and where is generalisation limited?','Specify the relevant training/coaching population rather than asserting universal application.',['practical','coaching','training','generalisability'], 'Realistic and appropriately bounded implications')
]},
{id:'evaluation',title:'09 · Evaluation',criterion:'Evaluation',checks:[
check('eval-limit','Specific limitations','Which weaknesses in sample, design and measurement affect conclusions?','Link a small sample to precision, power or generalisability as appropriate.',['limitations','sample','measurement'], 'Evaluate impact, not just list weaknesses'),
check('eval-error','Systematic and random error','Can you distinguish a consistent bias from trial-to-trial variation?','Compare instrument calibration error with fluctuating reaction times.',['systematic','random','error']),
check('eval-bias','Confounders and participant bias','How could fatigue, practice, expectations or observer behaviour influence the outcome?','Describe effect direction and magnitude if supported.',['bias','confounding','order','practice']),
check('eval-improve','Justified improvements','What change would address each limitation, and why would it help?','Link timing gates to observer error rather than a generic equipment upgrade.',['improvement','mitigate','solution'], 'Feasible, limitation-linked improvements'),
check('eval-validity','Validity, reliability and scope','How reproducible and transferable are your results?','Explain the evidence that supports or limits claims of reliability and validity.',['validity','reliability','reproducibility','generalisability'], 'Deep reflection on scope and limitations')
]}
];
export const ALL_WORKSHOP_CHECKS=WORKSHOP_SECTIONS.flatMap(s=>s.checks.map(c=>({...c,sectionId:s.id,sectionTitle:s.title,criterion:s.criterion})));
