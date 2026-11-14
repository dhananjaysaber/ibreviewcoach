#!/usr/bin/env python3
"""Generates the static SEHS IA guide pages into public/<slug>/index.html.
Run: python3 scripts/build-seo-pages.py   (then commit the output and update public/sitemap.xml if slugs change)
Pages are plain HTML so search engines read them without running JavaScript."""
import json, os, html

SITE = "https://ibiareview.com"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
UPDATED = "2026-11-14"
DISCLAIMER = ("IB IA Review is an independent coaching service and is not affiliated with the IB. "
              "Always check requirements with your teacher and the current IB SEHS guide. "
              "Marks shown anywhere on this site are indicative.")

def P(*t): return "".join(f"<p>{x}</p>" for x in t)
def UL(*t): return "<ul>" + "".join(f"<li>{x}</li>" for x in t) + "</ul>"
def OL(*t): return "<ol>" + "".join(f"<li>{x}</li>" for x in t) + "</ol>"

PAGES = [
 dict(slug="sehs-ia-guide", nav="SEHS IA guide",
  title="IB SEHS IA Guide: Sports Science Internal Assessment Explained",
  desc="A plain-English guide to the IB SEHS IA (Sports, Exercise and Health Science scientific investigation): what it is, how it is marked, how long it is and how to plan it.",
  h1="IB SEHS IA guide: the Sports, Exercise and Health Science internal assessment",
  kw="IB SEHS IA guide, IB Sports Science IA, SEHS internal assessment, SEHS scientific investigation, what is the SEHS IA, how to write SEHS IA, IB sports exercise and health science IA",
  lead="The IA in IB Sports, Exercise and Health Science (often just called the Sports Science IA) is one individual scientific investigation. You choose a question, collect your own data, analyse it and write a report. This guide explains how it works before you start.",
  body=[
   ("What the SEHS IA is", P("The new SEHS course was first taught in August 2024 and is first assessed in May 2026. Its IA is called the scientific investigation. The IB describes it as an open-ended task in which you gather and analyse data to answer your own research question, and you hand in the outcome as a written report.","It is the same task at Standard Level and Higher Level. You must collect and analyse quantitative data, supported by qualitative observations where appropriate. The IB lists hands-on laboratory work, fieldwork, spreadsheet analysis and modelling, data from a database, and simulations as approaches. They can be used alone or together.")),
   ("The key facts", UL("<b>Task:</b> one individual written report based on your own investigation.","<b>Marks:</b> 24 in total, from four criteria worth 6 marks each.","<b>Weighting:</b> 24% of your final SEHS grade, as set out in the IB subject brief.","<b>Time:</b> about 10 hours is recommended for the investigation, though planning, data collection and writing often take longer in real life.","<b>Length:</b> the report has a limit of 3,200 words. Charts, diagrams, data tables, equations, calculations, citations, the bibliography and headers are not counted.","<b>Marking:</b> your teacher marks it, then the IB externally moderates the school's marks.","<b>Drafts:</b> your teacher reads one draft and gives oral or written advice, but does not edit it. The next version you hand in is the final one.","<b>Emphasis:</b> half of the marks (12 of 24) are for Conclusion and Evaluation, so the thinking after the data matters most.","<b>Group work:</b> optional, in groups of up to three. The final report is always individual.")),
   ("The four criteria in one line each", UL("<b>Research design:</b> a focused question, a justified method and a procedure someone else could repeat.","<b>Data analysis:</b> accurate recording and suitable processing of your data, with uncertainty and variation handled properly.","<b>Conclusion:</b> an answer to your research question that is supported by your analysis and compared with accepted scientific knowledge.","<b>Evaluation:</b> an honest look at the strengths, limits and possible improvements of your investigation.")+P("Older websites describe five criteria (Personal engagement, Exploration, Analysis, Evaluation, Communication). Those belong to the previous course. If a guide mentions them, it is out of date for 2026.")),
   ("What changed from the old SEHS IA", UL("Personal engagement and Communication are no longer marked as a separate criterion.","Conclusion and Evaluation are now two separate criteria, and together they carry 50% of the marks.","A 3,200-word limit applies to the report.","Conclusion now rewards discussing the practical implications of your findings.","Limited collaboration is allowed, under set conditions.","The course has two external papers instead of three, and the old options have been removed.")+P("See our page on the <a href=\"/sehs-ia-new-syllabus/\">new SEHS syllabus and IA</a> for the full list.")),
   ("How to plan it", OL("Pick a topic from the SEHS syllabus that you can actually test with the people and equipment you have.","Turn it into a narrow research question with a clear independent and dependent variable.","Write a method with exact timings, distances, intensities, equipment and units. Get your teacher's approval and written consent from every participant before you test anyone.","Run a short pilot to find problems early, and make sure your teacher agrees your method is feasible in the time and with the resources you have.","Collect the full data set, then process it and draw clear graphs.","Write the conclusion and evaluation as you finish the analysis, not at the end.")),
   ("Honesty and referencing", P("The work must be entirely your own, and you must confirm it is authentic. Missing or improper referencing is academic malpractice. If you work in a group, remember that collaboration is allowed, but copying a partner's analysis or wording is collusion.")),
   ("Where students lose marks", P("Most lost marks come from a vague research question, a method that cannot be repeated, graphs without a clear message, a conclusion that goes beyond the data, and an evaluation that lists generic problems such as human error. The pages linked below deal with each of these.")),
  ], links=["sehs-ia-new-syllabus","sehs-ia-criteria","sehs-ia-ethics-and-safety","sehs-ia-research-question"]),

 dict(slug="sehs-ia-criteria", nav="SEHS IA criteria",
  title="IB SEHS IA Criteria and Rubric Explained (Research Design, Data Analysis, Conclusion, Evaluation)",
  desc="The four IB SEHS IA criteria (first assessed 2026) explained in simple words: what each 6-mark criterion looks for, how the bands work and how to reach the top band.",
  h1="IB SEHS IA criteria and rubric explained",
  kw="SEHS IA criteria, SEHS IA rubric, SEHS IA mark scheme, SEHS IA marking criteria, SEHS IA level descriptors, research design criterion, data analysis criterion, conclusion criterion, evaluation criterion, IB SEHS 24 marks, SEHS IA 2026 criteria",
  lead="The SEHS IA (first assessed in 2026) is marked out of 24 using four equally weighted criteria. Each is worth 6 marks and 25% of the IA. Conclusion and Evaluation together carry half of the marks. This page explains the IB level descriptors in plain words. Your teacher uses the official wording.",
  body=[
   ("How the marking works", UL("Each criterion has four levels: 0, 1-2, 3-4 and 5-6.","Your teacher uses a <b>best-fit</b> approach. If your work matches different parts of a descriptor at different levels, the mark reflects the balance. Not every point of a descriptor has to be met.","Within a level, the upper mark is for work that largely meets the descriptor, and the lower mark is for work that meets it to a lesser extent.","Only whole numbers are recorded.","The criteria are independent. A high level in one does not guarantee a high level in another.","The top level does not mean faultless work. It is meant to be reachable.","Your teacher marks the work, and the IB externally moderates it.")),
   ("Research design (6 marks)", P("This criterion is about how well you communicate your method: its purpose and the practice. It has three strands.")+UL("<b>Research question and context.</b> At the bottom, the question is stated with no context. In the middle, it is outlined within a broad context. At the top, it is described within a specific and appropriate context.","<b>Methodological considerations.</b> These move from stated, to described, to <em>explained</em>. They must be about collecting relevant and sufficient data to answer the question.","<b>Reproducibility.</b> At the bottom, there is not enough detail to repeat the investigation. In the middle, it can be repeated with few ambiguities or omissions. At the top, it can be repeated.")+P("A question with context refers to the independent and dependent variables, or to two correlated variables, briefly describes the system the question sits in, and includes background theory that is directly relevant.","Methodological considerations include: how you measure the variables, the data source or model and how you sample it, the range, interval and frequency of the independent variable, repetitions and precision, control variables and how you control them, and any safety, ethical or environmental issues.")),
   ("Data analysis (6 marks)", P("This criterion is about how you record, process and present the data in ways that suit the research question. It has three strands.")+UL("<b>Communication.</b> Recording and processing is communicated, then clear <em>or</em> precise, then clear <em>and</em> precise. Clear means the method of processing is easy to follow. Precise means following conventions: annotating graphs and tables correctly, and using units, decimal places and significant figures properly.","<b>Uncertainties.</b> Limited evidence at the bottom, some evidence with significant omissions or inaccuracies in the middle, and an appropriate consideration at the top.","<b>Processing.</b> Some processing with major omissions or inaccuracies at the bottom, some significant gaps in the middle, and processing that is appropriate and accurate at the top.")+P("Your data is quantitative, or quantitative together with qualitative observations. Major omissions are the ones that stop you from drawing a valid conclusion. Significant ones leave you able to draw a conclusion, but with limits to its validity or detail.")),
   ("Conclusion (6 marks)", P("This criterion is about how well you answer your research question, using your analysis and the accepted scientific context. It has three strands.")+UL("<b>The conclusion itself.</b> It moves from stated but not supported by the analysis, to described but not fully consistent with it, to <em>justified</em> and fully consistent with the analysis.","<b>Scientific context.</b> A superficial comparison at the bottom, some relevant comparison in the middle, and a relevant comparison that justifies the conclusion at the top.","<b>Practical implications.</b> Stated, then outlined, then <em>explained</em>.")+P("A fully consistent conclusion interprets the processed data together with its uncertainties. Scientific context can come from published papers, published values, course notes, textbooks or other sources, and your citations must be detailed enough for the source to be traced. Practical implications are real-world applications related to health or performance.")),
   ("Evaluation (6 marks)", P("This criterion is about how well you evaluate your methodology and suggest improvements. It has two strands.")+UL("<b>Weaknesses and limitations.</b> Generic at the bottom, specific in the middle, and at the top you <em>explain the relative impact</em> of specific weaknesses and limitations.","<b>Improvements.</b> Realistic improvements are stated, then described and linked to the weaknesses you identified, then explained.")+P("Generic means a point that could apply to many methods and not to yours specifically. Weaknesses could relate to control of variables, precision of measurement or variation in the data. Limitations could be how far the conclusion is limited by the range of the data, the confines of the system, or the assumptions you made. Methodological means the whole approach as well as the procedural steps.")),
   ("What to do with this", OL("Use each strand as a checklist for your own draft.","Look at the words that change from level to level: stated, described, explained, justified. They show how much reasoning the marker expects.","Make the evidence easy to find, with clear headings and numbered figures.","Remember that your teacher gives your marks. IB IA Review compares your draft to these criteria and shows where evidence is missing.")),
  ], links=["sehs-ia-new-syllabus","sehs-ia-research-question","sehs-ia-data-analysis","sehs-ia-conclusion-and-evaluation"]),

 dict(slug="sehs-ia-research-question", nav="Research question",
  title="How to Write a SEHS IA Research Question (With Examples and a Checklist)",
  desc="How to write a focused IB SEHS IA research question: variables, population, context, common weak examples and ways to fix them.",
  h1="How to write a good SEHS IA research question",
  kw="SEHS IA research question, sports science IA research question, IB SEHS research question examples, how to write research question SEHS, SEHS IA aim, independent variable dependent variable SEHS",
  lead="A good research question makes the rest of your IA easier. It tells you what to measure, who to test and what your conclusion has to answer.",
  body=[
   ("What a strong question contains", UL("A clear <b>measurement method</b> for your variables, and a note of the <b>context</b> in which you test.","An <b>independent variable</b> you can change, such as a type of warm-up, a rest period or a hydration level.","A <b>dependent variable</b> you can measure, such as sprint time, jump height, heart rate or reaction time.","A clear <b>group and setting</b>, such as school-level swimmers or recreational runners.","A <b>direction or comparison</b> so the answer is measurable.")),
   ("A simple template", P("The IB describes a research question with context as one that refers to the independent and dependent variables (or two correlated variables), briefly describes the system it sits in, and includes background theory of direct relevance. Your question must also be one you can answer by collecting and analysing quantitative data.","<em>How does [independent variable] affect [dependent variable] in [group] during [task]?</em>","Example: How does a 3-minute dynamic warm-up compared with static stretching affect 20 m sprint time in school-level football players?")),
   ("Weak versus stronger", UL("<b>Weak:</b> Does warming up help? &rarr; <b>Stronger:</b> How does a 5-minute dynamic warm-up compared with no warm-up affect 10 m sprint time in school-level basketball players?","<b>Weak:</b> Does music improve exercise? &rarr; <b>Stronger:</b> How does listening to fast-tempo music affect distance covered in a 6-minute run in recreational runners?","<b>Weak:</b> Which diet or supplement is best for athletes? &rarr; This cannot be done in an SEHS IA. IB examiner instructions do not allow experiments that give participants any substance, such as supplements, caffeine or energy drinks. Choose a variable you can change without giving anything to the participants.")),
   ("Checks before you commit", OL("Is it safe, and allowed under IB rules? You need your teacher's approval, and written consent from each participant.","Can you measure the dependent variable accurately with the equipment you have?","Can you collect enough data with the time and participants available?","Can you control the other variables?","Can someone else repeat your method from your description?")),
   ("Add scientific context", P("In your report, explain in a short paragraph why you expect a certain result. Use ideas from the syllabus and from published research. This context is part of what the Research design criterion looks for.")),
  ], links=["sehs-ia-topic-ideas","sehs-ia-criteria","sehs-ia-checklist"]),

 dict(slug="sehs-ia-topic-ideas", nav="Topic ideas",
  title="SEHS IA Topic Ideas: 30 IB Sports Science Investigation Ideas",
  desc="30 starting ideas for an IB SEHS IA investigation across exercise physiology, biomechanics, nutrition, psychology and fitness testing, with notes on feasibility.",
  h1="SEHS IA topic ideas for the IB Sports Science investigation",
  kw="SEHS IA topic ideas, sports science IA ideas, IB SEHS IA topics, SEHS IA experiment ideas, exercise physiology IA ideas, biomechanics IA ideas, sports psychology IA ideas, SEHS IA investigation ideas",
  lead="These ideas are starting points, not finished research questions. Choose one that you are curious about, narrow it, and check that it is safe, measurable and approved by your teacher. IB rules do not allow experiments that give participants any substance, so none of these involve supplements, caffeine, drinks or food.",
  body=[
   ("Exercise physiology", UL("Warm-up type and 20 m sprint time","Rest interval length and repeated sprint performance","Breathing pattern and swim or sprint time","Recovery method and heart rate return","Time of day and grip strength or jump height","Cadence and heart rate during steady cycling","Body position and recovery heart rate")),
   ("Biomechanics and skill", UL("Run-up length and long jump distance","Arm swing and vertical jump height","Stance width and basketball free-throw accuracy","Grip type and handgrip endurance","Footwear and agility test time","Joint angle and plank hold time","Video analysis of take-off angle and jump distance")),
   ("Fitness testing and training", UL("Short plyometric programme and jump height over a few weeks","Stretching type and sit-and-reach score","Interval versus continuous training and shuttle-run score","Core exercise programme and balance test score","Training frequency and push-up endurance")),
   ("Psychology and performance", UL("Music tempo and 6-minute run distance","Visualisation and free-throw or penalty accuracy","Audience presence and performance on a skill task","Concentration cues and reaction time","Self-talk style and endurance task performance")),
   ("Health and lifestyle (observational)", UL("Resting heart rate and weekly activity level","Self-reported sleep duration and balance test performance","Screen time and reaction time","Posture and range of movement","Weekly training volume and vertical jump height")),
   ("Before you pick one", UL("Is there a safe, ethical way to test it at school? You need your teacher's approval and written consent from each participant.","Can you recruit enough participants and repeat the test?","Do you have the equipment, such as timing gates, a stopwatch app, a heart rate monitor or a camera?","Is the measure objective, so that two people would record similar values?","Would your teacher approve the risk level and any consent forms?")+P("Do not plan anything that gives participants a substance, uses body fluids, or involves extreme heat, dehydration or fasting. See our <a href=\"/sehs-ia-ethics-and-safety/\">ethics and safety guide</a>.")),
  ], links=["sehs-ia-research-question","sehs-ia-ethics-and-safety","sehs-ia-guide"]),

 dict(slug="sehs-ia-data-analysis", nav="Data analysis help",
  title="SEHS IA Data Analysis Help: Tables, Graphs, Statistics and Uncertainty",
  desc="How to handle data analysis in your IB SEHS IA: raw data tables, processing, graphs, standard deviation, t-tests, uncertainty and common mistakes.",
  h1="SEHS IA data analysis: tables, graphs, statistics and uncertainty",
  kw="SEHS IA data analysis, SEHS IA statistics, SEHS IA graphs, standard deviation SEHS, t-test SEHS IA, SEHS IA uncertainty, SEHS raw data table, sports science IA statistics",
  lead="Data analysis is worth 6 marks. It rewards clear recording, suitable processing and an honest treatment of variation. You do not need advanced statistics, but you do need to explain what you did and why.",
  body=[
   ("Communicate clearly and precisely", UL("Clear means a reader can easily follow how you processed the data.","Precise means following conventions: correctly annotated graphs and tables, and the right units, decimal places and significant figures.")),
   ("Record raw data well", UL("Use one table per measure, with a clear title and units in the column headings.","Keep the same number of decimal places as your equipment can measure.","Keep trials and participants in order so that each value can be traced.","If you have a lot of data, show a sample in the report and explain where the rest is.")),
   ("Process data to suit your question", UL("Calculate means for repeated trials or groups.","Show variation with range or standard deviation.","Calculate change or percentage change when you compare before and after.","Show a sample calculation so that every processed value can be traced back to your raw data.","Use a spreadsheet to process data and draw graphs.")),
   ("Choose graphs that fit", UL("Bar charts with error bars for comparing groups.","Line graphs for changes over time.","Scatter plots with a trend line for relationships between two measures.","Label both axes with units and give each graph a title that states the finding.")),
   ("Uncertainty and variation", P("Every measurement has some uncertainty. This is more than the smallest division of an instrument. It includes the reaction time of the timer, differences between participants and changes in effort from trial to trial. State it, and say whether it is small compared with the difference you found. If you add error bars, say what they show (standard deviation, standard error or a confidence interval). If the difference between your groups is within the variation, say so honestly and cautiously.")),
   ("Statistical tests", P("A test such as a t-test can help you judge whether a difference is likely to be due to chance. The test must match your design: a paired test for the same participants measured twice, an unpaired test for separate groups. A correlation shows that two things are linked, not that one causes the other. Explain what a p-value means for your research question. A p-value with no explanation will not earn credit.")),
   ("Common mistakes", UL("Graphs without units or titles.","Averaging data that should be looked at participant by participant.","Using a test that does not match the design, such as an unpaired test on repeated measures.","Treating a correlation as proof of cause.","Hiding the raw data in an appendix when the analysis depends on it.","Describing a trend in the graph that the numbers do not support.")),
  ], links=["sehs-ia-criteria","sehs-ia-conclusion-and-evaluation","sehs-ia-common-mistakes"]),

 dict(slug="sehs-ia-conclusion-and-evaluation", nav="Conclusion and evaluation",
  title="SEHS IA Conclusion and Evaluation: How to Score Higher",
  desc="How to write the conclusion and evaluation in your IB SEHS IA: answer the research question, compare with science, name specific limitations and suggest realistic improvements.",
  h1="SEHS IA conclusion and evaluation: how to score higher",
  kw="SEHS IA conclusion, SEHS IA evaluation, SEHS IA limitations, SEHS IA improvements, practical implications SEHS, how to write conclusion IB SEHS IA, evaluation of investigation SEHS",
  lead="Together, Conclusion and Evaluation are half of the 24 marks. Many reports lose marks here because the writing is general. Specific evidence is what moves you up a band.",
  body=[
   ("Writing the conclusion", OL("Answer the research question in the first sentence.","Support the answer with a few selected numbers from your analysis, such as the mean difference, the direction and size of the effect, and the variation. Do not repeat your whole results table.","Say how confident you can be, based on the spread of your data and any statistics.","Keep your claim within the participants and conditions you tested.","Compare your result with accepted science, such as peer-reviewed studies, textbooks or established theory. Say whether it agrees and why your result is plausible.","Discuss the practical implications. The new syllabus asks for this, so base it on your evidence and avoid advice for everyone.")),
   ("What the IB means", UL("A conclusion that is fully consistent with your analysis interprets the processed data together with its uncertainties.","Scientific context can come from papers, published values, course notes or textbooks. Cite it in enough detail for the source to be traced.","Practical implications are real-world applications related to health or performance.")),
   ("What to avoid in a conclusion", UL("Claiming a cause when you only found a link.","Repeating the introduction.","Adding results that are not in your data.","Ignoring results that did not fit your hypothesis.")),
   ("Writing the evaluation", P("A good evaluation judges your investigation. For each important limitation, follow the same pattern.")+OL("<b>State it precisely:</b> for example, all participants did condition A before condition B.","<b>Explain the effect on your data:</b> fatigue could have lowered the results for condition B.","<b>Judge its importance:</b> compared with your other limitations, did it reduce precision, add bias, weaken validity or limit what you can conclude?","<b>Improve it:</b> use a counterbalanced design in which half the group does each order.","<b>Explain how the improvement solves the problem:</b> any order effect would now be spread across both conditions.")+P("Improvements must fix the real cause. A larger sample cannot fix a miscalibrated instrument.","The IB gives examples of what to look at. Weaknesses can relate to the control of variables, the precision of measurement or the variation in the data. Limitations can be how far the conclusion is limited by the range of data, the confines of the system or the assumptions you made. A generic point that fits many investigations will not reach the upper levels.")),
   ("Specific beats generic", UL("Weak: human error affected the results.","Stronger: starting the stopwatch by hand added a reaction time of about 0.2 s, which is large compared with the 0.1 s difference between groups. Using timing gates would reduce this.")),
   ("Strengths count too", P("Say what worked well and why it supports your conclusion, for example standardised instructions, a pilot test or the use of repeated trials.")),
   ("Future work", P("Finish with one or two realistic next steps. For example, a larger sample, a different age group or a longer training period.")),
  ], links=["sehs-ia-data-analysis","sehs-ia-criteria","sehs-ia-common-mistakes"]),

 dict(slug="sehs-ia-common-mistakes", nav="Common mistakes",
  title="Common SEHS IA Mistakes That Cost Marks (And How to Fix Them)",
  desc="The most common mistakes in IB SEHS IA reports, by criterion: vague research questions, missing detail, weak graphs, overclaiming and generic evaluations.",
  h1="Common SEHS IA mistakes and how to fix them",
  kw="SEHS IA mistakes, how to improve SEHS IA, SEHS IA tips, SEHS IA feedback, why did I lose marks SEHS IA, SEHS IA fix plan, sports science IA tips, SEHS IA 7",
  lead="These are the problems that appear again and again in SEHS IA drafts. Check your draft against each one before you submit it to your teacher.",
  body=[
   ("Research design", UL("<b>Question too broad.</b> Narrow it to one independent variable, one measure and one group.","<b>No scientific context.</b> Add a short explanation of why you expect your result.","<b>Method that cannot be repeated.</b> Add exact timings, distances, intensities, equipment and instructions.","<b>Controls missing.</b> List what you kept constant and how.","<b>Safety and consent not mentioned.</b> State your teacher's approval, the written consent you collected and your safety steps.","<b>Breaking IB rules.</b> Do not give participants any substance, such as supplements, caffeine or energy drinks, and do not use body fluids.")),
   ("Data analysis", UL("<b>Raw data missing or untidy.</b> Show clean tables with units.","<b>Graphs that do not match the data.</b> Choose the type that shows the comparison.","<b>No uncertainty.</b> State the limits of your measurement and the variation.","<b>Statistics without explanation.</b> Say what the test shows in plain words.","<b>Wrong test for the design.</b> Use paired tests for repeated measures and unpaired tests for separate groups.")),
   ("Conclusion", UL("<b>Does not answer the question.</b> Use the first sentence for the answer.","<b>Overclaims.</b> Match your wording to the strength of the evidence.","<b>No comparison with science.</b> Add one or two relevant sources or syllabus ideas.","<b>No practical meaning.</b> Say what the result means for training or health, from your evidence only.","<b>Claims that are too broad.</b> Keep them to the people and conditions you tested.")),
   ("Evaluation", UL("<b>Generic limitations.</b> Replace human error with the specific cause and its effect.","<b>No improvements.</b> Pair every limitation with a realistic fix that targets its cause.","<b>No ranking of limitations.</b> Say which matter most and why.","<b>Ignoring strengths.</b> Say what supports the reliability of the result.")),
   ("Structure and writing", UL("<b>Going over the word limit</b> with long background theory. Keep it focused.","<b>Hiding key evidence in an appendix.</b> Keep essential data and reasoning in the main report.","<b>Copying text from the internet or examples.</b> Your work must be your own and properly cited.","<b>Using old criteria.</b> Advice about Personal engagement and Communication is for the previous course.")),
   ("Get a second pair of eyes", P("IB IA Review reads your draft against the SEHS criteria and gives you a fix plan that shows what to change, why it matters and how to check it is done. It coaches your writing, and never writes it for you.")),
  ], links=["sehs-ia-checklist","sehs-ia-criteria","sehs-ia-checker"]),

 dict(slug="sehs-ia-checklist", nav="Checklist",
  title="SEHS IA Checklist: Check Your IB Sports Science IA Before You Submit",
  desc="A practical checklist for your IB SEHS IA draft, organised by the four criteria: research design, data analysis, conclusion and evaluation.",
  h1="SEHS IA checklist before you submit",
  kw="SEHS IA checklist, SEHS IA draft checklist, sports science IA checklist, check my SEHS IA, SEHS IA self assessment, IB SEHS IA before submission, SEHS IA review checklist",
  lead="Use this checklist on your draft. If you cannot tick a box, that is the next thing to fix.",
  body=[
   ("Research design", UL("My research question names the independent variable, the dependent variable and the group.","I explain the science behind my expected result.","I describe my method with exact equipment, units, timings and instructions.","I list the variables I controlled and how I controlled them.","I explain my choice of participants and sample size.","I describe the safety and ethical steps I took, including teacher approval and written consent from each participant.","I did not give participants any substance and did not use body fluids.")),
   ("Data analysis", UL("My raw data are in clear tables with titles and units.","I processed the data in a way that suits my question.","I show one worked example of each calculation.","My graphs have labelled axes, units and a title that states the finding.","I show variation or uncertainty.","I explain any statistical test I used.")),
   ("Conclusion", UL("My first sentence answers the research question.","I support the answer with numbers from my analysis.","I compare my result with accepted science or published research.","I discuss the practical implications, based on my evidence.","I do not claim more than my data can show, and I stay within the people and conditions I tested.")),
   ("Evaluation", UL("I name specific strengths and limitations.","I explain how each limitation could have changed my data.","I say which limitations matter most.","I suggest a realistic improvement for each limitation that targets its cause.","I suggest what could be investigated next.")),
   ("Final checks", UL("My report is no longer than 3,200 words, not counting charts, diagrams, data tables, equations, calculations, citations, the bibliography and headers.","The key evidence is in the main report, not only in an appendix.","All sources are cited and my work is my own.","The report is clear and easy to follow, with figures and tables numbered.","I have a copy saved and I know my school deadline.")),
  ], links=["sehs-ia-ethics-and-safety","sehs-ia-common-mistakes","sehs-ia-checker"]),

 dict(slug="sehs-ia-word-count-and-structure", nav="Word count and structure",
  title="SEHS IA Word Count and Structure: What to Include in Your Report",
  desc="How to structure an IB SEHS IA report: suggested sections, how to spend your word count and what to include in each part.",
  h1="SEHS IA word count and structure",
  kw="SEHS IA word count, SEHS IA structure, SEHS IA format, SEHS IA outline, SEHS IA template, how long is SEHS IA, 3200 words SEHS IA, SEHS IA sections, SEHS IA report layout",
  lead="The IB does not require fixed headings for the scientific investigation, but a clear structure helps your teacher and the moderator find the evidence for each criterion.",
  body=[
   ("Word limit", P("The IB sets a maximum of 3,200 words for the report. These are not counted: charts and diagrams, data tables, equations, formulae and calculations, citations and references (whether in brackets, numbered, footnotes or endnotes), the bibliography, and headers. Keep a running word count as you write.")),
   ("Start of the report", P("State these details at the start of the report:")+UL("the title of the investigation","your candidate personal code (letters and numbers, for example xyz123)","the personal codes of your group members, if you worked in a group","your word count")+P("You do not need a cover page or a contents page.")),
   ("A structure that follows the criteria", OL("<b>Title and research question.</b>","<b>Background and context.</b> A short explanation of the science behind your question.","<b>Hypothesis or expectation</b> and the reasons for it, if you use one.","<b>Variables.</b> Independent, dependent and controlled.","<b>Method.</b> Equipment, participants, procedure, safety and ethics.","<b>Raw data.</b>","<b>Processed data and graphs.</b> Calculations, uncertainty and any statistics.","<b>Conclusion.</b>","<b>Evaluation.</b> Strengths, limitations, improvements and further work.","<b>Bibliography.</b>")),
   ("Spending your words", UL("Keep the background short and relevant. Long theory sections are a common reason for going over the limit.","Spend your words where the marks are. Research design, conclusion and evaluation are all written in sentences, so give them room.","Use tables and graphs for data, and use words to explain what they show.","Do not hide essential reasoning in an appendix.")),
   ("Presentation and referencing", UL("Reference all sourced information in your report. Missing or improper referencing is academic malpractice.","Cite published material in enough detail for the source to be traced.","Put the key data, processing and reasoning in the main report, so the marker can find the evidence for each criterion.","A spreadsheet is a useful tool for processing data and drawing graphs.")),
   ("Make evidence easy to find", P("A moderator reads many reports. Use clear headings, number your figures, and refer to them in the text. This makes it easier for the marker to see the evidence for each criterion.")),
  ], links=["sehs-ia-guide","sehs-ia-criteria","sehs-ia-checklist"]),

 dict(slug="sehs-ia-examples", nav="Using examples",
  title="SEHS IA Examples: How to Learn From Sample IAs Without Copying",
  desc="How to use SEHS IA examples and exemplars properly: what to look for in each criterion, how to compare with your own draft and why you should never copy.",
  h1="SEHS IA examples: how to learn from them",
  kw="SEHS IA examples, IB SEHS IA exemplar, sports science IA example, sample SEHS IA, SEHS IA example 7, high scoring SEHS IA, IB sports exercise and health science IA example",
  lead="Examples can help you see what a finished investigation looks like. Used well, they teach you structure and standard. Used badly, they lead to copying, which breaks IB academic integrity rules.",
  body=[
   ("What to look for", UL("How the research question names the variables and the group.","How much detail is in the method, and whether you could repeat it.","How the graphs are labelled and what they show.","How the conclusion uses numbers and compares with research.","How specific the evaluation is.")),
   ("Compare, do not copy", P("Read an example with the criteria beside you. Ask where each criterion is met and how you know. Then check your own draft in the same way. Never reuse wording, data or ideas from someone else's work.")),
   ("A note on the new course", P("Examples written for the previous SEHS course were marked against five different criteria, including Personal engagement and Communication. The course first assessed in May 2026 uses four criteria: Research design, Data analysis, Conclusion and Evaluation. Use only examples marked against the new criteria, and treat any older example as a guide to the topic, not to the marking.")),
   ("Your own draft is the best example", P("IB IA Review shows where your own draft meets each criterion, with comments placed in the text and a fix plan for each gap. This is feedback on your own work, which is more useful than reading someone else's.")),
  ], links=["sehs-ia-criteria","sehs-ia-checker","sehs-ia-common-mistakes"]),

 dict(slug="sehs-ia-checker", nav="IA checker and review",
  title="SEHS IA Review and Checker: Get Feedback on Your IB Sports Science IA",
  desc="Upload your IB SEHS IA draft and get criteria-based feedback, an annotated copy and a step-by-step fix plan. Free preview available. Reports are approved by an authorised IB moderator.",
  h1="SEHS IA review and checker for IB Sports Science students",
  kw="SEHS IA review, SEHS IA checker, SEHS IA feedback, sports science IA review, IB SEHS IA marking service, check my SEHS IA, IB IA feedback online, annotated IA, SEHS IA fix plan, IB IA moderator review",
  lead="IB IA Review reads your SEHS IA draft against the four criteria and shows you what to fix before you hand it in. We coach your writing. We never write it for you.",
  body=[
   ("What you get", UL("Feedback against Research design, Data analysis, Conclusion and Evaluation.","An annotated copy of your IA, with comments placed where they apply.","A step-by-step fix plan: what to change, why it matters and how to check it is done.","A progress view that tracks the fixes you have completed.","Paid reviews are marked and approved by an authorised IB moderator before they are released to you.")),
   ("Try it free", P("Your first review is free. It shows the Research design feedback so you can see how the review works before you decide on a full review.")),
   ("How it works", OL("Upload your draft as a document.","We read it against the criteria.","You get your feedback, annotated copy and fix plan.","Fix the gaps and upload your next draft to see your progress.")),
   ("Who it is for", UL("IB Sports, Exercise and Health Science students working on the scientific investigation.","Teachers and tutors who want a second view of a draft.")),
   ("What it does not do", P("It does not write your IA, and it does not replace your teacher. Your teacher gives your official marks, and any marks in a review are indicative.")),
  ], links=["sehs-ia-criteria","sehs-ia-checklist","sehs-ia-common-mistakes"], cta_primary=True),

 dict(slug="sehs-ia-faq", nav="FAQ",
  title="IB SEHS IA FAQ: Your Sports Science IA Questions Answered",
  desc="Answers to common questions about the IB SEHS IA: criteria, marks, word count, topics, examples, feedback and how IB IA Review works.",
  h1="IB SEHS IA frequently asked questions",
  kw="SEHS IA FAQ, SEHS IA questions, IB sports science IA questions, how is SEHS IA marked, how many marks SEHS IA, can I get my SEHS IA checked",
  lead="Short answers to the questions students ask most about the SEHS IA.",
  body=[], links=["sehs-ia-new-syllabus","sehs-ia-criteria","sehs-ia-checker"],
  faq=[
   ("What is the IB SEHS IA?","It is one individual scientific investigation. You write a research question, collect your own data, analyse it and write a report. For the course first assessed in 2026 it is called the scientific investigation."),
   ("How many marks is the SEHS IA worth?","It is marked out of 24, with four criteria worth 6 marks each: Research design, Data analysis, Conclusion and Evaluation."),
   ("How much of my SEHS grade is the IA?","The IB subject brief gives the IA as 24% of the final SEHS grade."),
   ("When is the new SEHS syllabus first assessed?","The new course was first taught in August 2024 and is first assessed in May 2026. The external assessment is Paper 1 (multiple choice and data-based questions, 36%) and Paper 2 (short-answer and extended-response, 40%). The IA is 24%."),
   ("What is the word limit?","The IB sets a maximum of 3,200 words for the report. Charts, diagrams, data tables, equations, calculations, citations, the bibliography and headers are not counted."),
   ("Are the SEHS IA criteria different from before?","Yes. The course first assessed in 2026 uses four criteria, each out of 6 marks, and half of the marks are for Conclusion and Evaluation. Older material that lists Personal engagement, Exploration, Analysis, Evaluation and Communication is for the previous course."),
   ("Can I get my SEHS IA checked before I submit it?","Yes. You can ask your teacher for feedback within your school's rules, and you can upload your draft to IB IA Review for criteria-based feedback, an annotated copy and a fix plan."),
   ("Does IB IA Review write my IA?","No. It coaches your writing by showing what to fix and why. You write your own work."),
   ("Is IB IA Review free?","Your first review is free and shows the Research design feedback. A full review covers all four criteria."),
   ("Who approves the reports?","Paid reviews are marked and approved by an authorised IB moderator before release."),
   ("Is IB IA Review official?","No. It is an independent coaching service and is not affiliated with the IB. Your teacher gives your official marks."),
   ("What makes a good SEHS research question?","It names one independent variable, one measurable dependent variable and a clear group, and it can be tested safely at school."),
   ("Is Personal engagement still marked in the SEHS IA?","No. In the course first assessed in 2026, Personal engagement and Communication are no longer a separate criterion. The four criteria are Research design, Data analysis, Conclusion and Evaluation."),
   ("Can I work with classmates on the SEHS IA?","Yes, in groups of up to three, if your school facilitates it. Within a group you use a different independent variable, or the same independent variable with a different dependent variable, or different data from a larger shared data set. You must not present the same raw data as another student, and all writing, including the method, must be your own."),
   ("Can I give participants caffeine, supplements or energy drinks?","No. IB examiner instructions for the sciences do not allow experiments that give participants substances such as alcohol, drugs, medicines, supplements, caffeine or energy drinks. They also do not allow experiments with body fluids."),
   ("Do I need consent to test participants?","Yes. Your teacher must approve the plan, you need written consent from each participant, and participants under 16 need written consent from a parent or guardian. If the activity is moderate to vigorous, you also need a written declaration of good physical health, for example a PAR-Q."),
   ("Can I use a database or simulation instead of collecting my own data?","The IB guide lists several approaches that can be used alone or together: hands-on laboratory work, fieldwork, spreadsheet analysis and modelling, extracting data from a database, and using a simulation. Whatever you choose, you must collect or select quantitative data and analyse it, and your report must explain how the data were gathered or selected. Agree your plan with your teacher."),
   ("What must be at the start of the report?","The title, your candidate personal code, the personal codes of any group members, and your word count. You do not need a cover page or contents page."),
   ("Will my teacher read my draft?","Teachers read and advise on one draft, giving oral or written advice on how to improve it, but they do not edit it. The next version you hand in is the final version."),
   ("How big can a group be?","Collaboration is optional, and groups can have up to three students. Each student must investigate their own research question and write their own report. A group report is not allowed."),
   ("Can I use statistics in my SEHS IA?","Yes, if the test fits your design and you explain what the result means. You do not have to use a test, but you do have to handle variation and uncertainty."),
  ]),


 dict(slug="sehs-ia-new-syllabus", nav="New syllabus (2026)",
  title="New IB SEHS Syllabus and IA Changes: What Is Different From 2026",
  desc="What changed in the new IB Sports, Exercise and Health Science course (first assessed May 2026): the new IA criteria, 3,200-word limit, group work, papers and course structure.",
  h1="The new IB SEHS syllabus and IA: what changed for 2026",
  kw="new SEHS syllabus, SEHS 2026 syllabus, SEHS IA changes, new SEHS IA criteria, SEHS first assessment 2026, SEHS IA 2026, SEHS old vs new IA, IB sports exercise and health science new course",
  lead="The IB revised Sports, Exercise and Health Science. The new course was first taught in August 2024 and is first assessed in May 2026. If you are using older notes, check what has changed.",
  body=[
   ("Course structure", UL("Three themes: physiology, biomechanics and psychology, with a focus on connected, concept-based learning.","The old options have been removed, and some of that content has moved into other units.","Skills run through the course: experimental techniques, technology and mathematics, and the inquiry steps of exploring and designing, collecting and processing data, and concluding and evaluating.")),
   ("Assessment at a glance", UL("<b>Paper 1 (36%):</b> Paper 1A is multiple choice, and Paper 1B has data-based questions.","<b>Paper 2 (40%):</b> short-answer and extended-response questions.","<b>Internal assessment (24%):</b> the scientific investigation, about 10 hours, marked out of 24.")+P("The external papers are 1 hour 30 minutes each at SL. At HL, Paper 1 is 1 hour 45 minutes and Paper 2 is 2 hours 30 minutes.")),
   ("What changed in the IA", UL("<b>Criteria:</b> four criteria of 6 marks each: Research design, Data analysis, Conclusion and Evaluation.","<b>Personal engagement and Communication</b> are no longer a separate criterion.","<b>Conclusion and Evaluation</b> are now two separate criteria and together carry 50% of the marks, so higher-order thinking matters more.","<b>Practical implications:</b> your conclusion should discuss what the findings mean in the real world.","<b>Word limit:</b> a maximum of 3,200 words for the report.","<b>Collaboration:</b> optional, in groups of up to three. Each student has their own research question, their own data and their own report.")),
   ("What stayed the same", UL("The IA is still one scientific investigation, based on your own research question.","It is still about 10 hours and worth 24% of the final grade.","It is still marked by your teacher and externally moderated by the IB.")),
   ("Old criteria versus new", UL("<b>Old course:</b> Personal engagement, Exploration, Analysis, Evaluation, Communication.","<b>New course:</b> Research design, Data analysis, Conclusion, Evaluation.")+P("If a website, example or video talks about the old criteria, it is for the previous course.")),
   ("What to do now", OL("Read the new criteria with your teacher.","Choose a research question that fits the new criteria. See our <a href=\"/sehs-ia-research-question/\">research question guide</a>.","Plan for the conclusion and evaluation from the start, because they carry half of the marks.","Check your draft against the new criteria. IB IA Review is built around them.")),
  ], links=["sehs-ia-criteria","sehs-ia-group-work","sehs-ia-guide","sehs-ia-checker"]),

 dict(slug="sehs-ia-ethics-and-safety", nav="Ethics and safety",
  title="SEHS IA Ethics and Safety Rules: Consent, Approval and What Is Not Allowed",
  desc="IB rules for human experiments in the SEHS IA: teacher approval, written consent, under-16 permission, PAR-Q health declaration and what you cannot test.",
  h1="SEHS IA ethics and safety: what you need before you test anyone",
  kw="SEHS IA ethics, SEHS IA consent form, SEHS IA safety, PAR-Q SEHS IA, SEHS IA participants, SEHS IA human experiments, SEHS IA not allowed, SEHS IA caffeine, SEHS IA risk assessment",
  lead="Any SEHS IA that tests people needs approval and consent first. The IB SEHS guide requires your teacher to make sure you have thought about safety, ethical and environmental factors before you collect data. The specific rules below come from the IB examiner instructions for the sciences. Your school may add more, so check with your teacher.",
  body=[
   ("Before you start", UL("Your supervising teacher must approve any planned experiment on people, after discussing it with you.","You need written permission from each participant, with a confidential informed consent form.","Participants under 16 need written consent from a parent or guardian.","If the activity is moderate to vigorous in intensity, you need a written declaration that each participant is in good physical health, such as a PAR-Q.")),
   ("What is not allowed", UL("Experiments that give participants any substance, including alcohol, drugs, medicines, dietary supplements, caffeine drinks and energy drinks.","Experiments that involve body fluids such as sweat, blood, urine or saliva.")+P("This means ideas such as caffeine, creatine, energy drinks or sweat testing are not allowed. Choose a variable you can change without giving participants anything, such as warm-up type, rest time, technique or music.")),
   ("What to show in your report", UL("That your teacher approved the plan.","That you collected written consent, and how you kept names confidential.","How you checked participants were fit to take part.","The safety steps you took, such as a supervised warm-up and stopping rules.")),
   ("Keep participants safe", UL("Avoid maximal efforts unless you have a teacher supervising and a safe protocol.","Use a warm-up and a cool-down.","Stop the test if a participant feels unwell.","Do not use extreme heat, dehydration or fasting.")),
   ("Ethics also earn marks", P("The Research design criterion looks for consent, confidentiality, safety and welfare. Showing that you thought about them is part of a strong method.")),
  ], links=["sehs-ia-research-question","sehs-ia-topic-ideas","sehs-ia-checklist"]),

 dict(slug="sehs-ia-group-work", nav="Group work and collaboration",
  title="SEHS IA Group Work: Can You Collaborate on the New SEHS IA?",
  desc="The new SEHS IA allows optional collaboration in groups of up to three. What you can share, what must be your own and how to stay within academic honesty rules.",
  h1="SEHS IA group work and collaboration",
  kw="SEHS IA group work, SEHS IA collaboration, can I work with a partner SEHS IA, SEHS IA shared method, SEHS IA academic honesty, SEHS IA group data collection, SEHS IA collusion",
  lead="Under the new SEHS course, collaboration is optional. If your school facilitates it, you can work in a group of up to three students. The report is always individual.",
  body=[
   ("The rules", UL("Groups can have no more than three students, and students may organise their own groups.","Your teacher guides the group so that everyone is fully engaged.","Each student investigates their own research question.","A report by the group is not allowed. All writing, including the description of the method, must be done by you.","You must not present the same set of raw data as another student.")),
   ("How your investigation must differ", P("Within a group, each student does one of the following:")+UL("manipulates a different independent variable from the others","uses the same independent variable with a different dependent variable","uses different data from within a larger data set collected by the whole group")),
   ("Example", P("Three students share a sprint-testing session. One compares warm-up types, one compares rest intervals and one compares footwear. They run the sessions together, but each analyses their own data and writes their own report.")),
   ("Class databases", P("If your class or school collects data for a shared database, and you use it, your work is treated as a database investigation. Your method then focuses on how you filtered and sampled the data from the whole database.")),
   ("Collaboration is not collusion", UL("Agree the plan with your teacher before you start.","Do your own analysis, graphs, conclusion and evaluation.","Never copy a partner's analysis or wording.","Cite every source properly. Missing or improper referencing is academic malpractice.")),
  ], links=["sehs-ia-new-syllabus","sehs-ia-ethics-and-safety","sehs-ia-guide"]),

 dict(slug="sehs-ia-guides", nav="All guides", hub=True,
  title="IB SEHS IA Guides: Criteria, Topic Ideas, Checklist and Help",
  desc="All our IB SEHS (Sports Science) IA guides in one place: criteria, research questions, topic ideas, data analysis, conclusion and evaluation, checklist and FAQ.",
  h1="IB SEHS IA guides",
  kw="IB SEHS IA guides, Sports Science IA help, SEHS IA resources, SEHS IA tips, IB SEHS IA help",
  lead="Free guides for students working on the IB Sports, Exercise and Health Science scientific investigation.",
  body=[], links=[]),
]
BY = {p["slug"]: p for p in PAGES}

CSS = """*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0E1726;background:#FAF8F3;line-height:1.65}
a{color:#92400E}header.top{background:#090E1A;color:#fff}header.top div{max-width:880px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
header.top a{color:#fff;text-decoration:none;font-weight:700}header.top nav a{font-weight:500;font-size:.9rem;margin-left:14px;opacity:.9}
main{max-width:880px;margin:0 auto;padding:32px 20px 48px}h1{font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.2;margin:0 0 12px;letter-spacing:-.02em}
.lead{font-size:1.1rem;color:#344054;margin:0 0 24px}h2{font-size:1.35rem;margin:30px 0 8px}ul,ol{padding-left:1.3em}li{margin:6px 0}
.cta{background:#FEF3C7;border:1px solid rgba(217,119,6,.35);border-radius:14px;padding:20px;margin:32px 0}.cta strong{display:block;font-size:1.1rem;margin-bottom:6px}
.btn{display:inline-block;background:#D97706;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px;margin-top:8px}
.related{margin-top:28px}.related ul{list-style:none;padding:0;display:grid;gap:8px}.related a{display:block;background:#fff;border:1px solid #E1E5EC;border-radius:10px;padding:12px 14px;text-decoration:none;font-weight:600}
.hub{list-style:none;padding:0;display:grid;gap:12px}.hub a{display:block;background:#fff;border:1px solid #E1E5EC;border-radius:12px;padding:16px;text-decoration:none;color:#0E1726}.hub b{display:block;color:#92400E;margin-bottom:4px}.hub span{font-size:.92rem;color:#475467}
details{background:#fff;border:1px solid #E1E5EC;border-radius:10px;padding:12px 14px;margin:10px 0}summary{cursor:pointer;font-weight:700}
footer{max-width:880px;margin:0 auto;padding:0 20px 40px;font-size:.85rem;color:#475467}footer a{margin-right:14px}.small{font-size:.82rem;color:#667085}"""

def head(p, url, extra_ld):
    t = html.escape(p["title"] + " | IB IA Review"); d = html.escape(p["desc"]); k = html.escape(p["kw"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="keywords" content="{k}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" content="#090E1A">
<meta property="og:type" content="article">
<meta property="og:site_name" content="IB IA Review">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<style>{CSS}</style>
<script type="application/ld+json">{json.dumps(extra_ld, ensure_ascii=False)}</script>
</head>"""

def page_html(p):
    url = f"{SITE}/{p['slug']}/"
    crumbs = [("Home", SITE + "/"), ("SEHS IA guides", f"{SITE}/sehs-ia-guides/")]
    if not p.get("hub"): crumbs.append((p["nav"], url))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i+1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]},
        {"@type": "Article", "headline": p["h1"], "description": p["desc"], "dateModified": UPDATED, "datePublished": UPDATED,
         "inLanguage": "en", "mainEntityOfPage": url,
         "author": {"@type": "Organization", "name": "IB IA Review", "url": SITE + "/"},
         "publisher": {"@type": "Organization", "name": "IB IA Review", "url": SITE + "/"}}]}
    if p.get("faq"):
        ld["@graph"].append({"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]})
    out = [head(p, url, ld), "<body>",
      '<header class="top"><div><a href="/">IB IA Review</a><nav aria-label="Guides"><a href="/sehs-ia-guides/">Guides</a><a href="/sehs-ia-criteria/">Criteria</a><a href="/sehs-ia-checker/">Review my IA</a></nav></div></header>',
      "<main>", f"<h1>{html.escape(p['h1'])}</h1>", f'<p class="lead">{p["lead"]}</p>']
    for h, b in p["body"]:
        out.append(f"<h2>{h}</h2>{b}")
    if p.get("faq"):
        for q, a in p["faq"]:
            out.append(f"<details><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>")
    if p.get("hub"):
        out.append('<ul class="hub">' + "".join(f'<li><a href="/{x["slug"]}/"><b>{html.escape(x["nav"])}</b><span>{html.escape(x["desc"])}</span></a></li>' for x in PAGES if not x.get("hub")) + "</ul>")
    out.append('<div class="cta"><strong>Get your SEHS IA reviewed</strong><p>Upload your draft for criteria-based feedback, an annotated copy and a step-by-step fix plan. Your first review is free. We coach, you write.</p><a class="btn" href="/">Try your first review free</a></div>')
    if p.get("links"):
        out.append('<nav class="related" aria-label="Related guides"><h2>Related guides</h2><ul>' + "".join(f'<li><a href="/{s}/">{html.escape(BY[s]["nav"])}: {html.escape(BY[s]["h1"])}</a></li>' for s in p["links"]) + '<li><a href="/sehs-ia-guides/">All SEHS IA guides</a></li></ul></nav>')
    out.append(f'<p class="small">{html.escape(DISCLAIMER)}</p></main>')
    out.append('<footer><a href="/privacy-policy">Privacy Policy</a><a href="/refund-policy">Refund Policy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></footer></body></html>')
    return "\n".join(out)

def main():
    for p in PAGES:
        d = os.path.join(ROOT, p["slug"]); os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f: f.write(page_html(p))
    sm = os.path.join(ROOT, "sitemap.xml"); s = open(sm, encoding="utf-8").read()
    s = s[:s.index("<!-- guides -->")] + s[s.index("</urlset>"):] if "<!-- guides -->" in s else s
    block = "<!-- guides -->\n" + "".join(f"  <url>\n    <loc>{SITE}/{p['slug']}/</loc>\n    <lastmod>{UPDATED}</lastmod>\n  </url>\n" for p in PAGES)
    s = s.replace("</urlset>", block + "</urlset>")
    open(sm, "w", encoding="utf-8").write(s)
    print(len(PAGES), "pages written")
main()
