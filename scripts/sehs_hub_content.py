"""Content for the IB Sports Science (SEHS) IA hub page. Used by build-seo-pages.py."""

HUB_CSS = """
.hubx{max-width:1180px;margin:0 auto;padding:36px 32px 72px}@media (max-width:640px){.hubx{padding:26px 20px 56px}}
.hubx h2{font:500 clamp(1.45rem,3vw,1.9rem)/1.2 var(--serif);letter-spacing:-.01em;margin:0 0 10px}
.hubx section{padding:44px 0 0;scroll-margin-top:88px}.hubx section:first-of-type{padding-top:0}
.sec-k{display:inline-block;font:600 .68rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin-bottom:6px}
:root[data-theme=light] .sec-k{color:#B45309}
.hubx .lede{color:var(--mut);max-width:70ch;margin:0 0 18px}
.stats{display:grid;gap:12px;grid-template-columns:repeat(4,minmax(0,1fr));margin:-8px 0 22px}@media (max-width:760px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
.stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px}
.stat b{display:block;font:500 1.9rem/1.1 var(--serif);color:var(--ink)}.stat span{font-size:.84rem;color:var(--mut)}
.fa{margin:0 0 14px;color:var(--mut)}.fa b{color:var(--amber)}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px}.toc a{font-size:.84rem;font-weight:500;text-decoration:none;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 14px}
.toc a:hover{border-color:rgba(251,191,36,.6)}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px}
.card h3{font:500 1.12rem var(--serif);margin:0 0 6px;color:var(--ink)}.card p{margin:0;font-size:.93rem}
.card .n{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#FDE68A,#F59E0B);color:#1A1203;font-weight:700;font-size:.85rem;margin-bottom:10px}
.callout{background:linear-gradient(135deg,rgba(251,191,36,.12),rgba(251,191,36,.03)),var(--card);border:1px solid rgba(251,191,36,.35);border-radius:16px;padding:20px 22px;margin:6px 0 16px}
.callout b{color:var(--ink)}.callout p{margin:0 0 8px}.callout p:last-child{margin:0}
.tbl{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:.92rem;background:var(--card)}
.tbl th{background:var(--card2);color:var(--ink);text-align:left;padding:11px 14px;font-weight:600;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase}
.tbl td{padding:11px 14px;border-top:1px solid var(--line);color:var(--mut);vertical-align:top}.tbl td:first-child{color:var(--ink);font-weight:600}
.tscroll{overflow-x:auto;border-radius:14px}.tscroll .tbl{min-width:560px}
.two{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.list li{position:relative;padding:12px 14px 12px 40px;margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;color:var(--mut)}
.list li:before{content:"";position:absolute;left:14px;top:17px;width:12px;height:12px;border-radius:50%;background:var(--amber)}.list li b{color:var(--ink)}
.steps{counter-reset:s;list-style:none;padding:0;margin:0;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.steps li{counter-increment:s;position:relative;margin:0;padding:14px 16px 14px 56px;background:var(--card);border:1px solid var(--line);border-radius:14px;color:var(--mut)}
.steps li:before{content:counter(s);position:absolute;left:14px;top:13px;width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#FDE68A,#F59E0B);color:#1A1203;font-weight:700;display:grid;place-items:center}.steps li b{display:block;color:var(--ink)}
.dls{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.dl{display:flex;flex-direction:column;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;transition:border-color .15s,transform .15s}
.dl:hover{border-color:rgba(251,191,36,.6);transform:translateY(-2px)}
.dl .tag{align-self:flex-start;font:700 .68rem var(--sans);letter-spacing:.1em;color:#1A1203;background:linear-gradient(135deg,#FDE68A,#F59E0B);border-radius:7px;padding:3px 9px}
.dl h3{font:500 1.12rem var(--serif);margin:0;color:var(--ink)}.dl p{margin:0;font-size:.9rem;flex:1}
.dl a.get{display:inline-flex;align-items:center;gap:8px;font-weight:600;text-decoration:none;color:var(--ink);border:1px solid var(--line-s,rgba(251,191,36,.45));border-radius:10px;padding:9px 14px;align-self:flex-start}
.dl a.get:hover{background:rgba(251,191,36,.12)}
.more{display:inline-block;margin-top:12px;font-weight:600}
.tracker{display:flex;gap:14px;align-items:flex-start}.tracker i{flex:none;width:12px;height:12px;border-radius:50%;background:var(--amber);margin-top:7px;box-shadow:0 0 0 5px rgba(251,191,36,.18)}
"""

DOWNLOADS = [
    ("PDF", "SEHS IA criteria checklist", "Every strand in plain tick-box lines, for all four criteria, plus final checks. Print it and tick it off before you submit.", "/resources/sehs-ia-criteria-checklist.pdf"),
    ("PDF", "IA timeline planner", "Ten stages from first idea to final report, with space for your own dates and a weekly log.", "/resources/sehs-ia-timeline-planner.pdf"),
    ("PDF", "Research question builder", "A fill-in template, ten example variable pairs for school settings and a feasibility check.", "/resources/sehs-ia-research-question-builder.pdf"),
    ("PDF", "Statistics and sample size guide", "Which test fits your design, how to plan your sample and how to report a result.", "/resources/sehs-ia-statistics-chooser.pdf"),
    ("DOCX", "Participant consent form template", "An editable information and consent form with a parent or guardian section and a health declaration.", "/resources/sehs-ia-consent-form-template.docx"),
    ("DOCX", "Risk assessment template", "An editable risk table and a before-every-session checklist for your teacher to approve.", "/resources/sehs-ia-risk-assessment-template.docx"),
]

HUB_FAQ = [
    ("What is the IB Sports Science (SEHS) IA?", "It is the scientific investigation in IB Sports, Exercise and Health Science. You design and carry out one individual investigation, collect and analyse your own data, and write a report of up to 3,200 words. It is about 10 hours of work and is worth 24% of the final grade."),
    ("How many marks is the SEHS IA worth and what are the criteria?", "The IA is marked out of 24 using four criteria worth 6 marks each: Research design, Data analysis, Conclusion and Evaluation. Conclusion and Evaluation together carry half of the marks."),
    ("What is the SEHS IA word count?", "The maximum is 3,200 words. Charts and diagrams, data tables, equations, formulae and calculations, citations and references, the bibliography and headers are not counted."),
    ("Is personal engagement still marked in the SEHS IA?", "No. For the new syllabus (first assessment: May 2026), Personal engagement and Communication are no longer separate criteria. Examples written for the previous course were marked against five different criteria."),
    ("Do I need consent forms for my SEHS IA?", "If your investigation involves people, your supervising teacher must approve it and you need written permission from each participant. Participants under 16 need consent from a parent or guardian. You must not give participants any substance or use body fluids."),
    ("How many participants do I need?", "The IB does not set one fixed number. Ask your teacher what your school expects. More participants give a more reliable mean, and very small groups make a statistical test unreliable. A pilot test shows how much your measurements vary."),
    ("Can I work in a group?", "Collaboration is optional, in groups of up to three. Each student has their own research question, their own data and their own report."),
    ("Can IB IA Review check my SEHS IA draft?", "Yes. You upload your draft and get criteria-based feedback against the four SEHS criteria, an annotated copy and a step-by-step fix plan. Your first review is free. We coach, you write."),
]


def _faq_html():
    return "".join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in HUB_FAQ)


def hub_html():
    dls = "".join(
        f'<div class="dl"><span class="tag">{t}</span><h3>{h}</h3><p>{d}</p><a class="get" href="{u}" download>Download free</a></div>'
        for t, h, d, u in DOWNLOADS)
    topics = [
        ("Warm-up type", "20 m sprint time", "Cones, timing gates or a stopwatch app"),
        ("Rest interval length", "Number of repeated sprints", "Cones, timer"),
        ("Music tempo", "Distance in a 6-minute run", "Speaker, marked track"),
        ("Arm swing (used or restricted)", "Vertical jump height", "Jump mat, or video and a ruler"),
        ("Stance width", "Free-throw accuracy", "Ball, hoop, floor tape"),
        ("Stretching type", "Sit-and-reach score", "Sit-and-reach box"),
        ("Run-up length", "Long jump distance", "Tape measure"),
        ("Body position after exercise", "Heart rate recovery", "Heart rate monitor, timer"),
    ]
    trows = "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in topics)
    steps = [
        ("Explore", "Read the criteria and shortlist two or three feasible ideas."),
        ("Question", "Name the variables and the group. Get it approved."),
        ("Plan", "Method, controls, safety and consent."),
        ("Pilot", "Run the whole procedure once and record every change."),
        ("Collect", "Complete, labelled tables. Back up the same day."),
        ("Process", "Means, variation, graphs and any statistical test."),
        ("Interpret", "Answer the question with numbers. Rank limitations."),
        ("Draft", "Cover all four criteria within 3,200 words."),
        ("Improve", "Turn feedback into a priority list."),
        ("Finish", "Final checks, referencing and submit."),
    ]
    st = "".join(f"<li><b>{a}</b>{b}</li>" for a, b in steps)
    crit = [
        ("Research design", "A focused question with context, a justified method, and a procedure someone else could repeat."),
        ("Data analysis", "Clear, precise recording and processing, with uncertainty and graphs that fit the question."),
        ("Conclusion", "A justified answer, compared with scientific context, with real-world implications."),
        ("Evaluation", "Specific strengths and limitations, their effect on your data, and realistic improvements."),
    ]
    cc = "".join(f'<div class="card"><span class="n">6</span><h3>{a}</h3><p>{b}</p></div>' for a, b in crit)
    return f"""<div class="hubx">
<section id="top"><div class="stats">
<div class="stat"><b>24</b><span>marks in the IA</span></div>
<div class="stat"><b>4 &times; 6</b><span>criteria, equal weight</span></div>
<div class="stat"><b>3,200</b><span>words maximum</span></div>
<div class="stat"><b>24%</b><span>of the final grade</span></div></div>
<p class="fa"><b>First assessment: May 2026.</b> This page covers the new Sports, Exercise and Health Science syllabus and its scientific investigation.</p>
<nav class="toc" aria-label="On this page"><a href="#criteria">Criteria</a><a href="#word-count">Word count</a><a href="#topics">Topic ideas</a><a href="#examples">Examples</a><a href="#data">Data analysis</a><a href="#statistics">Statistics</a><a href="#ethics">Ethics</a><a href="#timeline">Timeline</a><a href="#mistakes">Mistakes</a><a href="#boundaries">Grade boundaries</a><a href="#downloads">Free downloads</a><a href="#faq">FAQ</a></nav></section>

<section id="criteria"><span class="sec-k">1 · Criteria and marks</span><h2>The four SEHS IA criteria</h2>
<p class="lede">The IB Sports Science (SEHS) IA, first assessment May 2026, is marked out of 24 by your teacher, then externally moderated by the IB. Each criterion has levels 0, 1&ndash;2, 3&ndash;4 and 5&ndash;6, marked on a best-fit basis. Conclusion and Evaluation together carry half of the marks.</p>
<div class="cards">{cc}</div><a class="more" href="/sehs-ia-criteria/">Read the full criteria and marks guide &rarr;</a></section>

<section id="word-count"><span class="sec-k">2 · Word count</span><h2>SEHS IA word count: 3,200 words</h2>
<div class="callout"><p><b>The limit is 3,200 words for the new syllabus (first assessment: May 2026).</b> Older guides for the previous SEHS course quote different limits, so check the date and syllabus on anything you read.</p><p>Not counted: charts and diagrams, data tables, equations, formulae and calculations, citations and references, the bibliography and headers. Put the key data, processing and reasoning in the main report, not only in an appendix.</p></div>
<a class="more" href="/sehs-ia-word-count-and-structure/">Word count and report structure guide &rarr;</a></section>

<section id="topics"><span class="sec-k">3 · Topic and research question ideas</span><h2>Sports Science IA topic ideas that work in school</h2>
<p class="lede">Test one factor you can change safely, measure one result with numbers, and use equipment you can access. Each idea below becomes a question like: To what extent does the independent variable affect the dependent variable in your group?</p>
<div class="tscroll"><table class="tbl"><thead><tr><th>Independent variable</th><th>Dependent variable</th><th>Equipment</th></tr></thead><tbody>{trows}</tbody></table></div>
<a class="more" href="/sehs-ia-topic-ideas/">More SEHS IA topic ideas &rarr;</a> &nbsp; <a class="more" href="/resources/sehs-ia-research-question-builder.pdf" download>Download the research question builder &rarr;</a></section>

<section id="examples"><span class="sec-k">4 · Examples</span><h2>Learn from SEHS IA examples, the right way</h2>
<p class="lede">Examples show how evidence is organised, but they only help if they match your syllabus. Examples written for the previous course were marked against five different criteria. Look at how each example states its question, controls its variables and supports its conclusion with numbers, then write your own.</p>
<a class="more" href="/sehs-ia-examples/">How to use SEHS IA examples &rarr;</a> &nbsp; <a class="more" href="/exemplars">See a full review before you buy (sign in) &rarr;</a></section>

<section id="data"><span class="sec-k">5 · Data analysis</span><h2>Data analysis for Sports Science data</h2>
<ul class="list"><li><b>Record clearly.</b> One table per measure, with units in the column headings and the same decimal places as your equipment.</li><li><b>Process to fit the question.</b> Means for repeated trials, range or standard deviation for variation, percentage change for before and after.</li><li><b>Choose the right graph.</b> Bar charts with error bars to compare groups, line graphs for change over time, scatter plots for relationships.</li><li><b>State uncertainty.</b> Timer reaction time, differences between people and changes in effort all matter. Say what your error bars show.</li></ul>
<a class="more" href="/sehs-ia-data-analysis/">Data analysis help &rarr;</a></section>

<section id="statistics"><span class="sec-k">6 · Statistics and sample size</span><h2>Which test, and how many participants?</h2>
<div class="tscroll"><table class="tbl"><thead><tr><th>My design</th><th>Usual test</th></tr></thead><tbody><tr><td>Two conditions, same people</td><td>Paired t-test</td></tr><tr><td>Two separate groups</td><td>Unpaired t-test</td></tr><tr><td>Three or more separate groups</td><td>One-way ANOVA</td></tr><tr><td>Two measures that may be linked</td><td>Correlation</td></tr></tbody></table></div>
<p style="margin-top:12px">The IB does not set one fixed number of participants, so ask your teacher what your school expects. More participants give a more reliable mean. Very small groups make a test unreliable, and repeating a test on one person is not the same as having more participants. A pilot shows how much your measurements vary. Choose your test before you collect data and explain what the result means for your question.</p>
<a class="more" href="/resources/sehs-ia-statistics-chooser.pdf" download>Download the statistics and sample size guide &rarr;</a></section>

<section id="ethics"><span class="sec-k">7 · Ethics, consent and safety</span><h2>Ethics, consent and safety for your SEHS IA</h2>
<div class="two"><ul class="list"><li><b>Teacher approval first.</b> Your supervising teacher must approve any experiment on people.</li><li><b>Written consent.</b> From every participant, and from a parent or guardian if they are under 16.</li><li><b>Health declaration.</b> Needed for moderate to vigorous activity.</li></ul><ul class="list"><li><b>Not allowed.</b> Giving any substance, such as caffeine, creatine, energy drinks or medicines, or using body fluids such as sweat or blood.</li><li><b>Keep people safe.</b> Warm up, set stop rules, avoid maximal efforts without supervision.</li><li><b>Show it in your report.</b> Ethics and safety thinking earns marks in Research design.</li></ul></div>
<a class="more" href="/sehs-ia-ethics-and-safety/">Ethics and safety guide &rarr;</a> &nbsp; <a class="more" href="/resources/sehs-ia-consent-form-template.docx" download>Consent form template &rarr;</a> &nbsp; <a class="more" href="/resources/sehs-ia-risk-assessment-template.docx" download>Risk assessment template &rarr;</a></section>

<section id="timeline"><span class="sec-k">8 · Timeline and checklist</span><h2>Plan your SEHS IA in ten stages</h2>
<p class="lede">The IA is about 10 hours of class time, but the thinking, pilot and writing take longer. Work backwards from your school deadline.</p>
<ol class="steps">{st}</ol>
<a class="more" href="/resources/sehs-ia-timeline-planner.pdf" download>Download the timeline planner &rarr;</a> &nbsp; <a class="more" href="/resources/sehs-ia-criteria-checklist.pdf" download>Download the criteria checklist &rarr;</a></section>

<section id="mistakes"><span class="sec-k">9 · Common mistakes</span><h2>Where Sports Science IA students lose marks</h2>
<ul class="list"><li><b>A vague question.</b> No variables, no group, no unit.</li><li><b>A method nobody could repeat.</b> Missing timings, equipment or instructions.</li><li><b>Graphs without a message.</b> No units, no title, no error bars.</li><li><b>A test that does not match the design.</b> For example an unpaired test on repeated measures.</li><li><b>A conclusion that claims too much.</b> Stay within the people and conditions you tested.</li><li><b>A generic evaluation.</b> Name the limitation, how it changed the data, and a fix.</li></ul>
<a class="more" href="/sehs-ia-common-mistakes/">All common mistakes &rarr;</a></section>

<section id="boundaries"><span class="sec-k">10 · Grade boundaries</span><h2>SEHS grade boundaries for the new course</h2>
<div class="callout tracker"><i aria-hidden="true"></i><div><p><b>Last checked 18 November 2026.</b></p><p>The IB sets grade boundaries after each exam session, so they change. We do not quote boundary numbers here. Ask your IB coordinator for the latest figures for the new syllabus (first assessment: May 2026). We will update this section when we can confirm them.</p></div></div>
<p>Until then, the 24-mark IA total and the level descriptors for each criterion are the most reliable guide to where your work stands.</p></section>

<section id="downloads"><span class="sec-k">Free downloads</span><h2>Free SEHS IA resources</h2>
<p class="lede">Printable and editable. Use them with your teacher and adapt them to your school's rules.</p>
<div class="dls">{dls}</div></section>

<section id="faq"><span class="sec-k">FAQ</span><h2>IB Sports Science (SEHS) IA: common questions</h2>{_faq_html()}</section>
</div>"""
