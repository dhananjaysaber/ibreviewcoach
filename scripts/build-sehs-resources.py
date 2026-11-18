#!/usr/bin/env python3
"""Builds the free SEHS IA downloads into public/resources (PDFs via Chromium, DOCX via python-docx).
Run: python3 scripts/build-sehs-resources.py"""
import os, html
from playwright.sync_api import sync_playwright
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "resources")
os.makedirs(OUT, exist_ok=True)
NOTE = ("Independent educational resource from IB IA Review (ibiareview.com). Not affiliated with or endorsed by the International Baccalaureate. "
        "Always follow your teacher's instructions and the current IB Sports, Exercise and Health Science guide.")
LOGO = '<svg viewBox="0 0 64 64" width="34" height="34"><rect width="64" height="64" rx="14" fill="#0B1120"/><path d="M32 8 47 30 41 46H23l-6-16z" fill="#FBBF24"/><path d="M32 28v18" stroke="#0B1120" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="28" r="3.2" fill="#0B1120"/><rect x="19" y="50" width="26" height="5" rx="2.5" fill="#F8FAFC"/></svg>'

CSS = """h2{break-after:avoid}@page{size:A4;margin:16mm 15mm 18mm}
h2{break-after:avoid}
*{box-sizing:border-box}body{font:10.5pt/1.5 'Inter','Helvetica Neue',Arial,sans-serif;color:#1E293B;margin:0}
.top{display:flex;align-items:center;gap:10px;border-bottom:3px solid #FBBF24;padding-bottom:10px;margin-bottom:14px}
.top b{font:600 13pt Georgia,serif;color:#0B1120}.top small{display:block;font-size:7.5pt;letter-spacing:.16em;text-transform:uppercase;color:#B45309}
.tag{margin-left:auto;font-size:8pt;color:#64748B;text-align:right}
h1{font:500 22pt/1.15 Georgia,serif;color:#0B1120;margin:6px 0 4px}h2{font:600 13pt Georgia,serif;color:#0B1120;margin:16px 0 6px;border-left:4px solid #F59E0B;padding-left:8px}
.sub{color:#475569;margin:0 0 10px}
.box{border:1px solid #E2E8F0;border-radius:8px;padding:9px 12px;margin:8px 0;background:#FFFBEB;break-inside:avoid}
ul.c{list-style:none;padding:0;margin:4px 0}ul.c li{padding:3px 0 3px 24px;position:relative;break-inside:avoid}
ul.c li:before{content:"";position:absolute;left:0;top:6px;width:12px;height:12px;border:1.6px solid #0B1120;border-radius:3px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9.5pt}th{background:#0B1120;color:#fff;text-align:left;padding:6px 8px;font-weight:600}
td{border:1px solid #CBD5E1;padding:6px 8px;vertical-align:top}tr{break-inside:avoid}.fill{height:26px}
.foot{margin-top:18px;padding-top:8px;border-top:1px solid #E2E8F0;font-size:7.5pt;color:#64748B}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.k{font-weight:600;color:#0B1120}"""

def shell(title, sub, body):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="top">{LOGO}<div><b>IB IA Review</b><small>We coach · you write</small></div><div class="tag">Free download<br>ibiareview.com</div></div>
<h1>{title}</h1><p class="sub">{sub}</p>{body}<div class="foot">{NOTE}</div></body></html>"""

def checklist(items): return '<ul class="c">' + "".join(f"<li>{html.escape(i)}</li>" for i in items) + "</ul>"

# ---------- 1. Criteria checklist ----------
CK = {
 "Research design (6 marks)": ["My research question names the independent variable, the dependent variable and the group.","I explain the science behind my expected result.","I describe my method with exact equipment, units, timings and instructions.","I list the variables I controlled and how I controlled them.","I explain my choice of participants and sample size.","I describe the safety and ethical steps, including teacher approval and written consent from each participant.","I did not give participants any substance and did not use body fluids."],
 "Data analysis (6 marks)": ["My raw data are in clear tables with titles and units.","I processed the data in a way that suits my question.","I show one worked example of each calculation.","My graphs have labelled axes, units and a title that states the finding.","I show variation or uncertainty.","I explain any statistical test I used and why it matches my design."],
 "Conclusion (6 marks)": ["My first sentence answers the research question.","I support the answer with numbers from my analysis.","I compare my result with accepted science or published research.","I discuss the practical implications, based on my evidence.","I do not claim more than my data can show."],
 "Evaluation (6 marks)": ["I name specific strengths and limitations.","I explain how each limitation could have changed my data.","I say which limitations matter most.","I suggest a realistic improvement for each limitation.","I suggest what could be investigated next."],
 "Final checks": ["My report is no longer than 3,200 words (not counting charts, diagrams, data tables, equations, calculations, citations, the bibliography and headers).","The key evidence is in the main report, not only in an appendix.","All sources are cited and the work is my own.","Figures and tables are numbered and referred to in the text.","I have a saved copy and I know my school deadline."]}
body = "".join(f"<h2>{k}</h2>{checklist(v)}" for k, v in CK.items())
body += '<div class="box"><span class="k">How the marking works:</span> four criteria of 6 marks each (24 in total). Each criterion has levels 0, 1-2, 3-4 and 5-6, and your teacher uses a best-fit approach. Conclusion and Evaluation together carry half of the marks.</div>'
P1 = ("sehs-ia-criteria-checklist.pdf", shell("SEHS IA criteria checklist (new syllabus, first assessment May 2026)", "IB Sports Science (Sports, Exercise and Health Science) scientific investigation. Tick each line before you submit.", body))

# ---------- 2. Timeline planner ----------
rows = [("1","Explore topics and read the criteria","Shortlist two or three feasible ideas. Check equipment and participants."),
("2","Write the research question","Name the variables and the group. Ask your teacher to approve it."),
("3","Plan the method and ethics","Equipment, controls, timings, safety. Consent forms and risk assessment ready."),
("4","Pilot the whole procedure","Run it once. Record every change you make."),
("5","Collect the final data","Complete, labelled tables. Back up your data the same day."),
("6","Process the data","Means, variation, calculations, graphs and any statistical test."),
("7","Interpret the evidence","Answer the question with numbers. Rank your limitations."),
("8","Write the first full draft","Cover all four criteria. Check the 3,200-word limit."),
("9","Use the feedback you are allowed","Turn comments into a priority list. Fix big issues first."),
("10","Final checks and submit","Use the criteria checklist. Check referencing and file."),]
tb = "<table><tr><th style='width:6%'>#</th><th style='width:28%'>Stage</th><th>What to finish</th><th style='width:15%'>Target date</th><th style='width:9%'>Done</th></tr>" + "".join(f"<tr><td>{a}</td><td class='k'>{b}</td><td>{c}</td><td class='fill'></td><td></td></tr>" for a,b,c in rows) + "</table>"
tb += '<div class="box"><span class="k">Tip:</span> the IA is about 10 hours of class time, but the thinking, pilot and writing take longer. Work backwards from your school deadline and put your own dates in the table. Plan for the conclusion and evaluation from the start, because together they carry half of the marks.</div>'
tb += "<h2>Weekly log</h2><table><tr><th style='width:16%'>Week of</th><th>What I did</th><th style='width:30%'>Next step</th></tr>" + "<tr><td class='fill'></td><td></td><td></td></tr>"*6 + "</table>"
P2 = ("sehs-ia-timeline-planner.pdf", shell("SEHS IA timeline planner", "Ten stages from first idea to final report. Add your own dates and tick each stage.", tb))

# ---------- 3. Research question builder ----------
tpl = '<div class="box" style="background:#F8FAFC"><b>Template:</b> To what extent does <u>[independent variable]</u> affect <u>[dependent variable, with unit]</u> in <u>[group: age, level, activity]</u>?</div>'
ex = [("Warm-up type (dynamic or static)","20 m sprint time (s)","Boys' school football players aged 15-16"),
("Rest interval (30 s or 90 s)","Number of repeated sprints completed","Club netball players aged 14-16"),
("Music tempo (fast or slow)","Distance in a 6-minute run (m)","Year 12 students"),
("Arm swing (used or restricted)","Vertical jump height (cm)","Basketball players aged 16-17"),
("Stance width","Free-throw accuracy (shots out of 10)","Recreational basketball players aged 15-17"),
("Dominant or non-dominant hand","Grip endurance time (s)","Students aged 16-18"),
("Stretching type before a test","Sit-and-reach score (cm)","Year 11 PE students"),
("Run-up length","Long jump distance (cm)","Athletics club members aged 14-16"),
("Time of day (morning or afternoon)","Handgrip strength (kg)","Year 12 students"),
("Visualisation before shooting","Penalty accuracy (goals out of 10)","School football players aged 15-17")]
t = "<table><tr><th>#</th><th>Independent variable</th><th>Dependent variable</th><th>Group</th></tr>" + "".join(f"<tr><td>{i+1}</td><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for i,(a,b,c) in enumerate(ex)) + "</table>"
chk = checklist(["Can I change the independent variable safely, without giving participants any substance?","Can I measure the dependent variable with numbers, with equipment I can access?","Can I get enough participants and repeat the test?","Would two people record similar values (is the measure objective)?","Has my teacher approved the risk level and consent plan?"])
build = "<h2>Your question</h2><table><tr><th style='width:30%'>Part</th><th>Write it here</th></tr><tr><td class='k'>Independent variable</td><td class='fill'></td></tr><tr><td class='k'>Dependent variable and unit</td><td class='fill'></td></tr><tr><td class='k'>Group (age, level, activity)</td><td class='fill'></td></tr><tr><td class='k'>Full question</td><td class='fill' style='height:48px'></td></tr><tr><td class='k'>Why I expect this (science)</td><td class='fill' style='height:48px'></td></tr></table>"
P3 = ("sehs-ia-research-question-builder.pdf", shell("SEHS IA research question builder", "A fill-in template, ten example variable pairs for school settings, and a feasibility check.", tpl + "<h2>Ten example ideas</h2>" + t + "<h2>Feasibility check</h2>" + chk + build))

# ---------- 4. Statistics chooser ----------
st = [("Compare two conditions, same people tested twice","Paired t-test","Wilcoxon signed-rank test (if data are not roughly normal)"),
("Compare two separate groups","Unpaired (independent) t-test","Mann-Whitney U test (if data are not roughly normal)"),
("Compare three or more separate groups","One-way ANOVA","Kruskal-Wallis test"),
("Compare three or more conditions, same people","Repeated-measures ANOVA","Friedman test"),
("Check if two measures are linked","Pearson correlation","Spearman rank correlation")]
t = "<table><tr><th style='width:34%'>My design</th><th>Usual test</th><th>Alternative</th></tr>" + "".join(f"<tr><td>{a}</td><td class='k'>{b}</td><td>{c}</td></tr>" for a,b,c in st) + "</table>"
ss = checklist(["The IB does not set one fixed number of participants. Ask your teacher for your school's expectation.","More participants give a more reliable mean. Very small groups make a test unreliable.","Repeating a test on the same person is not the same as having more participants.","Use a pilot to see how much your measurements vary. If they vary a lot, you need more data or tighter control.","Use the same people in every condition (repeated measures) to reduce differences between people, and counterbalance the order.","Write your sample size (n) next to every mean and in every test result."])
body = '<div class="box"><span class="k">Important:</span> a test only helps if it matches your design. Choose it before you collect data, and ask your teacher to confirm. Explain what the result means for your research question. A p-value with no explanation earns no credit.</div><h2>Which test?</h2>' + t + "<h2>Planning your sample</h2>" + ss + "<h2>Reporting a test</h2>" + checklist(["Name the test and say why it matches my design.","State the sample size, mean and a measure of variation for each condition.","Give the test result (value and p) and say what it means for my question.","Say honestly when the difference is within the normal variation.","Remember: a correlation shows a link, not a cause."])
P4 = ("sehs-ia-statistics-chooser.pdf", shell("SEHS IA statistics and sample size guide", "Choose a test that fits your design, plan your sample and report the result clearly.", body))

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, h in (P1, P2, P3, P4):
        pg = b.new_page(); pg.set_content(h); pg.pdf(path=os.path.join(OUT, name), format="A4", print_background=True); pg.close()
    b.close()

# ---------- DOCX helpers ----------
def base(title, sub):
    d = Document()
    s = d.sections[0]; s.left_margin = s.right_margin = Cm(2); s.top_margin = s.bottom_margin = Cm(1.8)
    d.styles["Normal"].font.name = "Calibri"; d.styles["Normal"].font.size = Pt(11)
    h = d.add_paragraph(); r = h.add_run("IB IA Review · ibiareview.com"); r.font.size = Pt(9); r.font.color.rgb = RGBColor(0xB4,0x53,0x09)
    t = d.add_paragraph(); r = t.add_run(title); r.bold = True; r.font.size = Pt(20); r.font.name = "Georgia"; r.font.color.rgb = RGBColor(0x0B,0x11,0x20)
    p2 = d.add_paragraph(sub); p2.runs[0].font.color.rgb = RGBColor(0x47,0x55,0x69)
    return d
def head(d, t):
    p = d.add_paragraph(); r = p.add_run(t); r.bold = True; r.font.size = Pt(13); r.font.color.rgb = RGBColor(0x0B,0x11,0x20)
def table(d, header, rows, widths=None):
    tb = d.add_table(rows=1, cols=len(header)); tb.style = "Table Grid"
    for i, hname in enumerate(header):
        c = tb.rows[0].cells[i]; c.text = ""; r = c.paragraphs[0].add_run(hname); r.bold = True
    for row in rows:
        cells = tb.add_row().cells
        for i, v in enumerate(row): cells[i].text = v
    if widths:
        for row in tb.rows:
            for i, w in enumerate(widths): row.cells[i].width = Cm(w)
    return tb
def foot(d): 
    p = d.add_paragraph(NOTE); p.runs[0].font.size = Pt(8); p.runs[0].font.color.rgb = RGBColor(0x64,0x74,0x8B)

# ---------- 5. Consent form ----------
d = base("Participant information and consent form", "Template for a SEHS scientific investigation. Adapt it to your investigation and your school's rules, and get your teacher's approval before you use it.")
head(d, "About the investigation")
table(d, ["Item", "Details"], [["Title of the investigation",""],["Researcher (student name)",""],["Supervising teacher",""],["Date(s) and place of testing",""],["What you will be asked to do (clear, step by step)",""],["How long it will take",""],["Possible risks or discomfort (for example muscle tiredness) and how they are reduced",""],["Benefits to you","Learning about sports science. No payment is offered."]], [6, 11])
head(d, "Please read and tick")
for s in ["I have been told what the investigation involves and I had the chance to ask questions.","Taking part is voluntary. I can stop at any time during testing and I do not have to give a reason.","I will tell the researcher straight away if I feel unwell, dizzy or in pain.","My name will not appear in the report. I will be given a code, such as P1, P2.","My results will only be used for this investigation and will be deleted after the course requirements are complete, unless my school asks to keep them.","I am not asked to take any substance (food supplement, drink, medicine) as part of the investigation."]:
    d.add_paragraph("☐  " + s)
head(d, "Health declaration")
d.add_paragraph("☐  To the best of my knowledge I am in good physical health and able to take part in the physical activity described. (If your teacher requires a PAR-Q or the school's own health form, attach it.)")
d.add_paragraph("If you have an injury, illness or any medical advice not to exercise, do not take part and speak to the researcher or your teacher.")
head(d, "Participant")
table(d, ["Name (printed)", "Signature", "Date"], [["","",""]])
head(d, "Parent or guardian (required for participants under 16, or if your school requires it)")
d.add_paragraph("I have read this form and I give permission for my child to take part.")
table(d, ["Parent or guardian name", "Signature", "Date"], [["","",""]])
head(d, "Researcher")
d.add_paragraph("I have explained the investigation and answered the participant's questions.")
table(d, ["Student researcher", "Signature", "Date"], [["","",""]])
table(d, ["Teacher approval", "Signature", "Date"], [["","",""]])
foot(d); d.save(os.path.join(OUT, "sehs-ia-consent-form-template.docx"))

# ---------- 6. Risk assessment ----------
d = base("Risk assessment template", "Complete this with your teacher before testing. Show in your report that you thought about safety and welfare.")
head(d, "Investigation details")
table(d, ["Item", "Details"], [["Title",""],["Student",""],["Teacher who approved the plan",""],["Location and equipment",""],["Number of participants and age range",""],["Intensity of activity (light, moderate, vigorous)",""]], [6, 11])
head(d, "Risks and controls")
table(d, ["Hazard", "Who could be harmed", "Likelihood (L/M/H)", "Severity (L/M/H)", "What I will do to reduce the risk"], [["Muscle strain or injury","Participants","","","Supervised warm-up and cool-down. Stop rules."],["Falls or collisions in the testing area","Participants, researcher","","","Clear space, safe surface, spacing."],["Overexertion or dizziness","Participants","","","Avoid maximal effort unless a teacher supervises. Stop if unwell."],["Heat or dehydration","Participants","","","Test in a suitable room. Water available. No extreme heat."],["Equipment faults","Participants","","","Check and calibrate before each session."],["Data privacy","Participants","","","Use codes, not names. Store forms securely."],["","","","",""]], [4,3,2,2,6])
head(d, "Before every session")
for s in ["Teacher has approved the plan.","Written consent collected (and parent or guardian consent where needed).","Health declaration completed by each participant.","No participant is given any substance (food supplement, drink, medicine). No body fluids are used.","Warm-up planned. Stop rules explained. First-aid contact known.","Participants told they can stop at any time."]:
    d.add_paragraph("☐  " + s)
head(d, "Approval")
table(d, ["Name", "Signature", "Date"], [["Student","",""],["Teacher","",""]])
foot(d); d.save(os.path.join(OUT, "sehs-ia-risk-assessment-template.docx"))
print(sorted(os.listdir(OUT)))
