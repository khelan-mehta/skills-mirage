#!/usr/bin/env python3
"""Generate Skills Mirage documentation PDF using reportlab."""

import sys, textwrap
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import Flowable

# ── palette ──────────────────────────────────────────────────────────────────
BG       = colors.HexColor("#0a0a0a")
CARD     = colors.HexColor("#161616")
DGRAY    = colors.HexColor("#323232")
TEAL     = colors.HexColor("#00d4aa")
TEAL2    = colors.HexColor("#00bcd4")
WHITE    = colors.white
LGRAY    = colors.HexColor("#c8c8c8")
MGRAY    = colors.HexColor("#8c8c8c")

PW, PH = A4
ML = MR = 18 * mm
MT = MB = 18 * mm
CW = PW - ML - MR   # content width

# ── custom flowables ──────────────────────────────────────────────────────────
class TealRule(Flowable):
    def __init__(self, width=CW, thickness=0.5):
        super().__init__()
        self.width  = width
        self.height = thickness + 3
        self._thickness = thickness

    def draw(self):
        self.canv.setStrokeColor(TEAL)
        self.canv.setLineWidth(self._thickness)
        self.canv.line(0, self._thickness / 2, self.width, self._thickness / 2)

class ColorRect(Flowable):
    def __init__(self, width, height, fill_color, stroke_color=None):
        super().__init__()
        self.width        = width
        self.height       = height
        self._fill        = fill_color
        self._stroke      = stroke_color

    def draw(self):
        self.canv.setFillColor(self._fill)
        self.canv.rect(0, 0, self.width, self.height, fill=1,
                       stroke=1 if self._stroke else 0)

class ScoreBar(Flowable):
    def __init__(self, label, pct, color=TEAL, width=CW):
        super().__init__()
        self.width  = width
        self.height = 14
        self._label = label
        self._pct   = pct
        self._color = color

    def draw(self):
        c = self.canv
        lw = self.width * 0.52
        bar_x = lw
        bar_w = self.width - lw - 20
        bar_h = 6
        bar_y = (self.height - bar_h) / 2

        c.setFont("Helvetica", 8)
        c.setFillColor(LGRAY)
        c.drawString(0, bar_y + 1, self._label)

        # background
        c.setFillColor(DGRAY)
        c.rect(bar_x, bar_y, bar_w, bar_h, fill=1, stroke=0)
        # fill
        c.setFillColor(self._color)
        c.rect(bar_x, bar_y, bar_w * self._pct / 100, bar_h, fill=1, stroke=0)
        # pct label
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(self._color)
        c.drawString(bar_x + bar_w + 4, bar_y + 1, f"{self._pct}%")

# ── styles ────────────────────────────────────────────────────────────────────
def make_styles():
    s = getSampleStyleSheet()

    def add(name, **kw):
        s.add(ParagraphStyle(name=name, **kw))

    add("DocLabel",
        fontName="Helvetica-Bold", fontSize=7, textColor=MGRAY,
        spaceBefore=0, spaceAfter=2, leading=9)

    add("DocH1",
        fontName="Helvetica-Bold", fontSize=20, textColor=WHITE,
        spaceBefore=4, spaceAfter=6, leading=24)

    add("DocH2",
        fontName="Helvetica-Bold", fontSize=12, textColor=WHITE,
        spaceBefore=10, spaceAfter=2, leading=15)

    add("DocH3",
        fontName="Helvetica-Bold", fontSize=9.5, textColor=TEAL2,
        spaceBefore=6, spaceAfter=2, leading=12)

    add("DocBody",
        fontName="Helvetica", fontSize=8.5, textColor=LGRAY,
        spaceBefore=2, spaceAfter=4, leading=13)

    add("DocBullet",
        fontName="Helvetica", fontSize=8.5, textColor=LGRAY,
        spaceBefore=1, spaceAfter=1, leading=12,
        leftIndent=12, bulletIndent=0,
        bulletText="▸", bulletColor=TEAL)

    add("DocCode",
        fontName="Courier", fontSize=7.5, textColor=LGRAY,
        spaceBefore=0, spaceAfter=0, leading=11,
        leftIndent=6)

    add("TealNum",
        fontName="Helvetica-Bold", fontSize=12, textColor=TEAL,
        spaceBefore=10, spaceAfter=2, leading=15)

    return s

STYLES = make_styles()

# ── helpers ───────────────────────────────────────────────────────────────────
def label(txt):
    return Paragraph(f"[ {txt.upper()} ]", STYLES["DocLabel"])

def h1(txt):
    return Paragraph(txt, STYLES["DocH1"])

def h2(txt, num=None):
    if num:
        content = f'<font color="#00d4aa">[{num}]</font>  {txt}'
    else:
        content = f'<font color="#00d4aa">{txt}</font>'
    return Paragraph(content, STYLES["DocH2"])

def h3(txt):
    return Paragraph(txt, STYLES["DocH3"])

def body(txt):
    return Paragraph(txt, STYLES["DocBody"])

def bullet(txt):
    return Paragraph(txt, STYLES["DocBullet"])

def rule():
    return TealRule()

def sp(n=4):
    return Spacer(1, n * mm)

def code_block(lines):
    items = []
    bg_table = Table(
        [[Paragraph(
            "<br/>".join(
                f'<font color="#00d4aa">{ln}</font>' if ln.startswith("#")
                else f'<font color="#c8c8c8">{ln}</font>'
                for ln in lines
            ),
            STYLES["DocCode"]
        )]],
        colWidths=[CW - 8 * mm],
    )
    bg_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("BOX",        (0, 0), (-1, -1), 0.5, DGRAY),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return bg_table

def kv_table(rows, col_widths=None):
    cw = col_widths or [50 * mm, CW - 50 * mm]
    data = []
    for k, v in rows:
        data.append([
            Paragraph(f'<font color="#00bcd4"><b>{k}</b></font>', STYLES["DocBody"]),
            Paragraph(v, STYLES["DocBody"]),
        ])
    t = Table(data, colWidths=cw)
    style = [
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD, colors.HexColor("#121212")]),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID",         (0, 0), (-1, -1), 0.2, DGRAY),
    ]
    t.setStyle(TableStyle(style))
    return t

def three_col_table(headers, rows):
    w1, w2, w3 = 42 * mm, 65 * mm, CW - 107 * mm
    data = [[
        Paragraph(f'<b>{h}</b>', ParagraphStyle("th", fontName="Helvetica-Bold",
                  fontSize=8, textColor=BG))
        for h in headers
    ]]
    for row in rows:
        colors_row = [TEAL2, LGRAY, MGRAY]
        data.append([
            Paragraph(f'<font color="{c.hexval() if hasattr(c,"hexval") else "#c8c8c8"}">{cell}</font>',
                      STYLES["DocBody"])
            for cell, c in zip(row, colors_row)
        ])
    # fix color refs
    data2 = [[
        Paragraph(f'<font color="#00bcd4"><b>{headers[0]}</b></font>',
                  ParagraphStyle("th0", fontName="Helvetica-Bold", fontSize=8, textColor=BG)),
        Paragraph(f'<font color="#c8c8c8"><b>{headers[1]}</b></font>',
                  ParagraphStyle("th1", fontName="Helvetica-Bold", fontSize=8, textColor=BG)),
        Paragraph(f'<font color="#c8c8c8"><b>{headers[2]}</b></font>',
                  ParagraphStyle("th2", fontName="Helvetica-Bold", fontSize=8, textColor=BG)),
    ]]
    for row in rows:
        data2.append([
            Paragraph(f'<font color="#00bcd4">{row[0]}</font>', STYLES["DocBody"]),
            Paragraph(f'<font color="#c8c8c8">{row[1]}</font>', STYLES["DocBody"]),
            Paragraph(f'<font color="#8c8c8c">{row[2]}</font>', STYLES["DocBody"]),
        ])
    t = Table(data2, colWidths=[w1, w2, w3])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1,  0), TEAL),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CARD, colors.HexColor("#121212")]),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("GRID",         (0, 0), (-1, -1), 0.2, DGRAY),
    ]))
    return t

# ── page template ─────────────────────────────────────────────────────────────
def on_page(canv, doc):
    """Header/footer for every page except cover."""
    pn = doc.page
    if pn == 1:
        # cover: solid dark background
        canv.saveState()
        canv.setFillColor(BG)
        canv.rect(0, 0, PW, PH, fill=1, stroke=0)
        # dot matrix
        canv.setFillColor(colors.HexColor("#002920"))
        for row in range(0, int(PH / mm) + 15, 15):
            offset_x = 8 if (row // 15) % 2 else 0
            for col_mm in range(offset_x, int(PW / mm) + 15, 15):
                canv.circle(col_mm * mm, row * mm, 0.8, fill=1, stroke=0)
        canv.restoreState()
        return

    # all other pages
    canv.saveState()
    canv.setFillColor(BG)
    canv.rect(0, 0, PW, PH, fill=1, stroke=0)
    # top bar
    canv.setFillColor(colors.HexColor("#111111"))
    canv.rect(0, PH - 10 * mm, PW, 10 * mm, fill=1, stroke=0)
    canv.setFont("Helvetica-Bold", 6.5)
    canv.setFillColor(TEAL)
    canv.drawString(ML, PH - 6 * mm,
                    "SKILLS MIRAGE  ·  Technical Documentation  ·  HACKaMINeD 2026")
    canv.setFillColor(MGRAY)
    canv.drawRightString(PW - MR, PH - 6 * mm, f"Page {pn}")
    # bottom bar
    canv.setFillColor(colors.HexColor("#111111"))
    canv.rect(0, 0, PW, 10 * mm, fill=1, stroke=0)
    canv.setFont("Helvetica", 6.5)
    canv.setFillColor(MGRAY)
    canv.drawCentredString(PW / 2, 3.5 * mm,
        "© 2026 devx labs  ·  India's First Open Workforce Intelligence System")
    canv.restoreState()

# ── cover page ────────────────────────────────────────────────────────────────
def cover_content():
    elems = []
    elems.append(Spacer(1, 25 * mm))

    elems.append(Paragraph(
        '[ AI-NATIVE WORKFORCE INTELLIGENCE ]',
        ParagraphStyle("cov_lbl", fontName="Helvetica-Bold", fontSize=8,
                       textColor=TEAL, leading=10)
    ))
    elems.append(Spacer(1, 6 * mm))
    elems.append(Paragraph(
        '<font color="#ffffff">SKILLS</font>',
        ParagraphStyle("cov_t1", fontName="Helvetica-Bold", fontSize=38,
                       textColor=WHITE, leading=42)
    ))
    elems.append(Paragraph(
        '<font color="#00d4aa">MIRAGE</font>',
        ParagraphStyle("cov_t2", fontName="Helvetica-Bold", fontSize=38,
                       textColor=TEAL, leading=42)
    ))
    elems.append(Spacer(1, 6 * mm))
    elems.append(Paragraph(
        "India's First Open Workforce Intelligence System",
        ParagraphStyle("cov_sub", fontName="Helvetica-Oblique", fontSize=12,
                       textColor=LGRAY, leading=15)
    ))
    elems.append(Paragraph(
        "Built for HACKaMINeD 2026 by devx labs",
        ParagraphStyle("cov_sub2", fontName="Helvetica", fontSize=9,
                       textColor=MGRAY, leading=12)
    ))
    elems.append(Spacer(1, 10 * mm))

    # tech tags as a table
    tags = ["React 18 + Vite", "Express.js", "MongoDB + Redis", "Gemini 2.0 Flash",
            "Claude API", "Three.js", "Socket.IO", "Docker Compose"]
    tag_data = [[
        Paragraph(f'<font color="#00bcd4"><b>{t}</b></font>',
                  ParagraphStyle("tag", fontName="Helvetica-Bold", fontSize=7.5,
                                 textColor=TEAL2))
        for t in tags[:4]
    ], [
        Paragraph(f'<font color="#00bcd4"><b>{t}</b></font>',
                  ParagraphStyle("tag", fontName="Helvetica-Bold", fontSize=7.5,
                                 textColor=TEAL2))
        for t in tags[4:]
    ]]
    tag_table = Table(tag_data, colWidths=[CW / 4] * 4)
    tag_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD),
        ("BOX",           (0, 0), (-1, -1), 0.3, TEAL),
        ("INNERGRID",     (0, 0), (-1, -1), 0.2, DGRAY),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))
    elems.append(tag_table)
    elems.append(Spacer(1, 8 * mm))

    # stats row
    stats = [("2", "Layers"), ("6", "AI Agents"), ("3", "Data Stores"), ("20+", "Cities")]
    stat_data = [[
        Paragraph(f'<font color="#00d4aa"><b>{v}</b></font>',
                  ParagraphStyle("sv", fontName="Helvetica-Bold", fontSize=22,
                                 textColor=TEAL, alignment=TA_CENTER))
        for v, _ in stats
    ], [
        Paragraph(f'<font color="#8c8c8c">{l}</font>',
                  ParagraphStyle("sl", fontName="Helvetica", fontSize=7.5,
                                 textColor=MGRAY, alignment=TA_CENTER))
        for _, l in stats
    ]]
    stat_table = Table(stat_data, colWidths=[CW / 4] * 4)
    stat_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD),
        ("BOX",           (0, 0), (-1, -1), 0.2, DGRAY),
        ("INNERGRID",     (0, 0), (-1, -1), 0.2, DGRAY),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))
    elems.append(stat_table)
    elems.append(Spacer(1, 10 * mm))
    elems.append(Paragraph(
        "Version 1.0  ·  March 2026  ·  Technical Documentation",
        ParagraphStyle("ver", fontName="Helvetica", fontSize=8, textColor=MGRAY)
    ))
    return elems

# ── TOC ───────────────────────────────────────────────────────────────────────
def toc_content():
    elems = [label("NAVIGATION"), h1("Table of Contents"), rule(), sp(2)]
    toc = [
        ("01", "Project Overview"),
        ("02", "System Architecture"),
        ("03", "Layer 1 — Job Market Dashboard"),
        ("04", "Layer 2 — Worker Intelligence Engine"),
        ("05", "Knowledge Graph"),
        ("06", "AI Chatbot"),
        ("07", "Scraping Pipeline"),
        ("08", "Tech Stack"),
        ("09", "API Reference"),
        ("10", "Database Schemas"),
        ("11", "Build Strategy (48h)"),
        ("12", "Environment Setup"),
        ("13", "Scoring Breakdown"),
        ("14", "Demo Script"),
        ("15", "UI Design System"),
    ]
    rows = []
    for num, title in toc:
        rows.append([
            Paragraph(f'<font color="#00d4aa"><b>[{num}]</b></font>', STYLES["DocBody"]),
            Paragraph(f'<font color="#c8c8c8">{title}</font>', STYLES["DocBody"]),
        ])
    t = Table(rows, colWidths=[18 * mm, CW - 18 * mm])
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD, colors.HexColor("#121212")]),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("GRID",          (0, 0), (-1, -1), 0.2, DGRAY),
    ]))
    elems.append(t)
    return elems

# ── main content sections ─────────────────────────────────────────────────────
def all_sections():
    E = []

    # ── S1 PROJECT OVERVIEW ──────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 01"), h1("Project Overview"), rule(), sp(2)]
    E += [body(
        "Skills Mirage is India's first open workforce intelligence platform, designed to bridge "
        "the gap between real-time job-market signals and personalized worker reskilling. "
        "Built for HACKaMINeD 2026 by devx labs, it provides transparent, data-driven insights "
        "helping workers understand automation risk and chart actionable reskilling paths."
    )]
    E += [h2("What It Solves", "01")]
    E += [bullet("Workers cannot see which skills are rising or falling in real time.")]
    E += [bullet("AI displacement risk is opaque — workers don't know their vulnerability score or why.")]
    E += [bullet("Reskilling advice is generic; it ignores city-level demand and experience level.")]
    E += [bullet("No platform connects live job data → risk scoring → learning path → chatbot support.")]

    E += [h2("Two-Layer Architecture", "02")]
    E += [h3("Layer 1 — Job Market Dashboard")]
    E += [body("Continuously scrapes Naukri and LinkedIn for live job postings across 20+ Indian cities. "
               "Gemini 2.0 Flash extracts structured signals from raw job descriptions. Results surface as "
               "hiring trends, skills intelligence, and an AI Vulnerability Index (0–100).")]
    E += [h3("Layer 2 — Worker Intelligence Engine")]
    E += [body("Takes 4 worker inputs (job title, city, experience, written description) and computes a "
               "Personal Risk Score that reacts to live Layer 1 signals. Generates a week-by-week "
               "reskilling path using real NPTEL / SWAYAM / PMKVY courses matched to the worker's city.")]

    E += [h2("Bonus Features", "03")]
    E += [bullet("3D Knowledge Graph — upload resume + GitHub URL → interactive Three.js force-directed graph")]
    E += [bullet("AI Chatbot — Claude API powered, context-aware, English + Hindi support")]
    E += [bullet("Displacement Early Warning — sector-level alert system")]
    E += [bullet("Employer-Side View — hiring signal dashboard for companies")]

    # ── S2 ARCHITECTURE ───────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 02"), h1("System Architecture"), rule(), sp(2)]
    E += [code_block([
        "┌─────────────────────────────────────────────────────────┐",
        "│              FRONTEND  (React 18 + Vite + TS)           │",
        "│  Dashboard  │  Worker Engine  │  Chatbot  │  KG Graph   │",
        "├─────────────────────────────────────────────────────────┤",
        "│              BACKEND  (Express.js + Node.js)            │",
        "│  Scrapers   │  AI Services   │  REST API  │  WebSocket  │",
        "├─────────────────────────────────────────────────────────┤",
        "│            DATA LAYER  (MongoDB + Redis + ChromaDB)     │",
        "│  Job Listings │ Worker Profiles │ Skills Graph │ Cache  │",
        "├─────────────────────────────────────────────────────────┤",
        "│          AI LAYER  (Gemini CLI + Claude API)            │",
        "│  Risk Scoring │ NLP │ Chatbot │ Graph Generation        │",
        "└─────────────────────────────────────────────────────────┘",
    ])]
    E += [sp(2), h2("Request Flow", "01")]
    for f in [
        "1. Scraper jobs (BullMQ) pull Naukri/LinkedIn every hour.",
        "2. Raw HTML → Gemini 2.0 Flash NLP → structured JobListing documents stored in MongoDB.",
        "3. Frontend polls /api/v1/dashboard/* (React Query, 60s stale-time).",
        "4. Worker submits 4-input form → POST /api/v1/worker/analyze.",
        "5. Backend calls GeminiService.computeRiskScore() using live L1 signals.",
        "6. Result broadcast via Socket.IO to all connected clients.",
        "7. Chatbot questions hit /api/v1/chat → ClaudeService with injected context.",
        "8. Knowledge Graph built via /api/v1/graph/build → Three.js renders client-side.",
    ]:
        E.append(bullet(f))

    E += [h2("Service Map", "02"), three_col_table(
        ["Service", "Technology", "Port / Notes"],
        [
            ["Frontend (Vite)",    "React 18, TypeScript, Tailwind",  "Port 3000"],
            ["Backend (Express)",  "Node.js, TypeScript",             "Port 5000"],
            ["MongoDB",            "Mongoose ODM, v7",                "Port 27017"],
            ["Redis",              "ioredis, BullMQ queues",          "Port 6379"],
            ["ChromaDB",           "Vector store for RAG",            "Port 8000"],
            ["Socket.IO",          "Real-time L1→L2 propagation",     "ws://5000"],
            ["Gemini 2.0 Flash",   "Primary NLP workhorse",           "API (Google)"],
            ["Claude API",         "Chatbot intelligence",            "API (Anthropic)"],
        ]
    )]

    # ── S3 LAYER 1 ────────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 03"), h1("Layer 1 — Job Market Dashboard"), rule(), sp(2)]
    E += [body("Layer 1 is the live intelligence engine. It continuously ingests job postings, extracts "
               "structured signals via Gemini NLP, and exposes three analytics tabs to the frontend.")]

    E += [h2("Tab A — Hiring Trends", "01")]
    E += [body("Recharts time-series chart showing job postings by city and sector over 7d/30d/90d/1yr.")]
    for b in ["Filter by 20+ Indian cities (Tier 1, 2, 3)",
              "Sector breakdown: IT, BPO, Manufacturing, Healthcare, Finance",
              "Week-over-week delta badges (+12% / -5%)",
              "Live refresh button → triggers BullMQ scrape → Socket.IO broadcast"]:
        E.append(bullet(b))

    E += [h2("Tab B — Skills Intelligence", "02")]
    E += [body("Bar chart of rising vs. declining skills extracted from job descriptions via Gemini.")]
    for b in ["Top 20 rising skills with demand velocity score",
              "Bottom 10 declining skills with replacement mapping",
              "Skill-to-role matrix overlay"]:
        E.append(bullet(b))

    E += [h2("Tab C — AI Vulnerability Index", "03")]
    E += [body("Heatmap of AI-displacement risk scores (0–100) per role × city combination. "
               "Methodology panel shows transparent scoring weights.")]
    for b in ["Role-level risk: automation potential, offshoring likelihood, skill replaceability",
              "City adjustment: lower risk where demand stays high despite automation signals",
              "Transparent weights panel visible in UI (open methodology)"]:
        E.append(bullet(b))

    E += [h2("API Endpoints", "04"), kv_table([
        ("GET /api/v1/dashboard/hiring-trends",      "Time-series job count by city/sector"),
        ("GET /api/v1/dashboard/skills-intel",        "Rising/declining skills with delta"),
        ("GET /api/v1/dashboard/vulnerability-index", "AI vulnerability scores per role×city"),
        ("POST /api/v1/scrape/trigger",               "Manually trigger scrape job"),
        ("WS  ws://5000/dashboard-update",            "Socket.IO live push on new data"),
    ])]

    # ── S4 LAYER 2 ────────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 04"), h1("Layer 2 — Worker Intelligence Engine"), rule(), sp(2)]
    E += [h2("4-Input Form", "01"), kv_table([
        ("Job Title",   "Free-text, e.g. 'Senior BPO Executive'"),
        ("City",        "Dropdown — 20+ cities"),
        ("Experience",  "Slider 0–30 years"),
        ("Write-up",    "Free text — current skills, role description (Gemini extracts structure)"),
    ])]

    E += [h2("Risk Score Computation", "02")]
    E += [body("GeminiService.computeRiskScore() combines Layer 1 signals with worker profile:")]
    for b in [
        "AI Vulnerability Index for worker's role × city (from L1)",
        "Skill overlap: worker's extracted skills vs. declining-skill list",
        "Experience seniority discount (more experience → lower raw risk)",
        "Live market demand in worker's city (real-time from L1)",
        "Output: 0–100 score + 3 top risk factors + recommended action tier",
    ]:
        E.append(bullet(b))

    E += [h2("Reskilling Path Generation", "03")]
    E += [body("Gemini generates a week-by-week reskilling timeline with real course links "
               "(NPTEL, SWAYAM, PMKVY, Coursera) filtered to courses available in the worker's city.")]
    for b in [
        "Target role recommendation based on transferable skills",
        "Weekly time commitment estimate (2–5 hrs/week)",
        "Certification milestones with expected salary uplift",
    ]:
        E.append(bullet(b))

    E += [h2("L1 → L2 Live Propagation", "04")]
    E += [body("When new scrape data changes Layer 1 signals, a Socket.IO event triggers "
               "risk recalculation for all connected Worker Engine sessions. Risk scores update live on screen.")]
    E += [h2("API Endpoints", "05"), kv_table([
        ("POST /api/v1/worker/analyze",    "Submit 4-input form → risk score + path"),
        ("GET  /api/v1/worker/profile/:id","Retrieve saved worker profile"),
        ("POST /api/v1/worker/save",       "Persist profile to MongoDB"),
        ("WS   ws://5000/risk-update",     "Socket.IO: live risk score push"),
    ])]

    # ── S5 KNOWLEDGE GRAPH ────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 05"), h1("Knowledge Graph"), rule(), sp(2)]
    E += [body("The Knowledge Graph is a 3D interactive force-directed visualization built with Three.js "
               "and @react-three/fiber. It maps a worker's skills, projects, certifications, and GitHub "
               "repositories as interconnected nodes.")]
    E += [h2("Data Ingestion", "01")]
    for b in ["Resume upload (PDF) → pdf-parse → Gemini structured extraction",
              "GitHub URL → Octokit API → repos, languages, contribution stats",
              "Gemini merges both sources into unified node + edge schema"]:
        E.append(bullet(b))

    E += [h2("Graph Schema", "02"), kv_table([
        ("Skill node",        "Extracted skill, color-coded by category"),
        ("Project node",      "From resume experience sections"),
        ("Repo node",         "GitHub repository with language breakdown"),
        ("Certification node","Certifications / courses listed in resume"),
        ("Edge weight",       "Frequency of co-occurrence or explicit relation"),
    ])]

    E += [h2("Three.js Rendering", "03")]
    for b in [
        "@react-three/fiber renders the scene inside React component tree",
        "d3-force-3d computes force-directed 3D layout (link, charge, center forces)",
        "Nodes: instanced mesh spheres with emissive glow (teal/cyan palette)",
        "Edges: tube geometry with flowing particle shader animation",
        "Click-to-focus: camera lerps to selected node, detail panel slides in",
        "Category filter controls toggle node visibility groups",
    ]:
        E.append(bullet(b))

    E += [h2("API Endpoints", "04"), kv_table([
        ("POST /api/v1/graph/build",         "Resume + GitHub URL → graph JSON"),
        ("GET  /api/v1/graph/:workerId",      "Retrieve cached graph data"),
        ("POST /api/v1/graph/upload-resume",  "Multipart resume upload → pdf-parse"),
    ])]

    # ── S6 CHATBOT ────────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 06"), h1("AI Chatbot"), rule(), sp(2)]
    E += [body("The chatbot uses Claude API with a context-injected system prompt that includes "
               "the worker's risk score, reskilling path, and live Layer 1 market data. "
               "It supports English and Hindi, handling 5 defined question types.")]
    E += [h2("5 Question Types", "01")]
    for name, desc in [
        ("Risk explanation",  "Why is my risk score high? → cites L1 vulnerability signals"),
        ("Safer roles",       "What jobs are safer? → queries vulnerability index"),
        ("Time-constrained",  "Reskilling paths under 3 months → filtered reskill planner"),
        ("Live L1 query",     "How many BPO jobs in Indore? → real-time L1 count"),
        ("Hindi support",     "मुझे क्या करना चाहिए? → Gemini translate pipeline"),
    ]:
        E.append(h3(f"• {name}"))
        E.append(body(f"  {desc}"))

    E += [h2("Claude API Integration", "02"), code_block([
        "// System prompt injection:",
        "const systemPrompt = `",
        "  You are Skills Mirage assistant.",
        "  Worker Risk Score: ${worker.riskScore}/100",
        "  Worker City: ${worker.city}",
        "  Top declining skills in city: ${l1Signals.declining}",
        "  Current reskilling path: ${worker.reskillPath}",
        "`;",
        "",
        "// API call:",
        "const response = await anthropic.messages.create({",
        "  model: 'claude-sonnet-4-6',",
        "  max_tokens: 1024,",
        "  system: systemPrompt,",
        "  messages: conversation",
        "});",
    ])]
    E += [h2("Language Toggle", "03")]
    E += [body("The UI provides an EN ↔ हिंदी toggle. Hindi questions are translated via Gemini, "
               "processed in English context, then the response is translated back to Hindi. "
               "i18next handles static UI strings (en.json / hi.json).")]

    # ── S7 SCRAPING ───────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 07"), h1("Scraping Pipeline"), rule(), sp(2)]
    E += [h2("Sources", "01"), kv_table([
        ("Naukri.com",  "Puppeteer headless Chrome — 5+ cities × 10 sectors"),
        ("LinkedIn",    "Apify actor (optional) — alternative to direct scrape"),
        ("GitHub",      "Octokit REST API — repo metadata + languages + contributions"),
    ])]
    E += [h2("Pipeline Architecture", "02"), code_block([
        "ScrapeOrchestrator (orchestrator.ts)",
        "  ├── NaukriDriver   (naukri.driver.ts)    ← Puppeteer",
        "  ├── LinkedInDriver (linkedin.driver.ts)   ← Apify API",
        "  └── BaseDriver     (base.driver.ts)       ← shared retry/rate-limit",
        "",
        "BullMQ Queue (scrapeQueue.ts)",
        "  ├── Job: scrape_naukri   (cron: every hour)",
        "  ├── Job: scrape_linkedin (cron: every 2 hours)",
        "  └── Job: analyze_jd     (Gemini NLP per batch)",
        "",
        "Gemini NLP → JobListing schema → MongoDB → Redis cache",
    ])]

    E += [h2("Gemini NLP Extraction", "03")]
    E += [body("For each raw job description, GeminiService extracts:")]
    for b in ["Required skills (list, with proficiency level)",
              "Seniority level (junior / mid / senior / lead)",
              "AI-vulnerability signal (0–1 float)",
              "Normalized role category (mapped to taxonomy)",
              "Salary range (if present)"]:
        E.append(bullet(b))

    E += [h2("Rate Limiting & Reliability", "04")]
    for b in [
        "retry.ts — exponential backoff with jitter (max 3 retries)",
        "batch.ts — processes JDs in batches of 50 to avoid API rate limits",
        "concurrency.ts — limits Puppeteer instances to avoid memory OOM",
        "Redis caches scrape results for 1 hour to reduce repeat requests",
    ]:
        E.append(bullet(b))

    # ── S8 TECH STACK ─────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 08"), h1("Full Tech Stack"), rule(), sp(2)]
    E += [h2("Frontend", "01"), three_col_table(
        ["Package", "Version", "Purpose"],
        [
            ["React",              "18.2.0",  "Core UI framework"],
            ["Vite",               "5.x",     "Build tool & dev server"],
            ["TypeScript",         "5.3",     "Type safety"],
            ["TailwindCSS",        "3.4",     "Utility-first styling"],
            ["Framer Motion",      "10.16",   "Animations & transitions"],
            ["Three.js",           "0.160",   "3D knowledge graph"],
            ["@react-three/fiber", "8.15",    "React renderer for Three.js"],
            ["d3-force-3d",        "3.0.5",   "Force-directed layout"],
            ["Zustand",            "4.4",     "Lightweight state management"],
            ["React Router",       "6.20",    "Client-side routing"],
            ["React Query",        "5.0",     "Server state & caching"],
            ["Recharts",           "2.10",    "Charting (hiring trends)"],
            ["i18next",            "23.7",    "EN + HI internationalisation"],
            ["Socket.io-client",   "4.7",     "Real-time updates"],
        ]
    )]
    E += [sp(3), h2("Backend", "02"), three_col_table(
        ["Package", "Version", "Purpose"],
        [
            ["Express",               "4.18",    "HTTP server framework"],
            ["TypeScript",            "5.3",     "Type safety"],
            ["Mongoose",              "8.0",     "MongoDB ODM"],
            ["ioredis",               "5.10",    "Redis client"],
            ["BullMQ",                "5.0",     "Job queue (Redis-backed)"],
            ["node-cron",             "3.0",     "Cron scheduler"],
            ["Socket.io",             "4.7",     "WebSocket server"],
            ["Puppeteer",             "21.0",    "Headless Chrome scraping"],
            ["Cheerio",               "1.0",     "HTML parsing"],
            ["Octokit",               "20.0",    "GitHub API client"],
            ["pdf-parse",             "1.1",     "Resume PDF extraction"],
            ["@google/generative-ai", "latest",  "Gemini API SDK"],
            ["@anthropic-ai/sdk",     "latest",  "Claude API SDK"],
            ["ChromaDB",              "3.3.1",   "Vector store for RAG"],
            ["Winston",               "3.11",    "Structured logging"],
            ["Zod",                   "3.22",    "Runtime schema validation"],
        ]
    )]

    # ── S9 API REFERENCE ──────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 09"), h1("API Reference"), rule(), sp(2)]
    groups = [
        ("Authentication", [
            ("POST", "/api/v1/auth/register",     "Register new user"),
            ("POST", "/api/v1/auth/login",        "Login → JWT token"),
            ("POST", "/api/v1/auth/refresh",      "Refresh access token"),
        ]),
        ("Dashboard — Layer 1", [
            ("GET",  "/api/v1/dashboard/hiring-trends",      "Hiring trends (city, sector, time)"),
            ("GET",  "/api/v1/dashboard/skills-intel",        "Rising/declining skills"),
            ("GET",  "/api/v1/dashboard/vulnerability-index", "AI vulnerability heatmap"),
            ("GET",  "/api/v1/dashboard/summary",             "Dashboard summary stats"),
        ]),
        ("Worker Engine — Layer 2", [
            ("POST", "/api/v1/worker/analyze",    "Analyze worker → risk score + path"),
            ("GET",  "/api/v1/worker/profile/:id","Fetch worker profile"),
            ("PUT",  "/api/v1/worker/profile/:id","Update worker profile"),
        ]),
        ("Chat", [
            ("POST", "/api/v1/chat/message",      "Send message → Claude response"),
            ("GET",  "/api/v1/chat/history/:id",  "Chat history for session"),
        ]),
        ("Knowledge Graph", [
            ("POST", "/api/v1/graph/build",            "Build graph from resume + GitHub"),
            ("GET",  "/api/v1/graph/:workerId",         "Retrieve graph data"),
            ("POST", "/api/v1/graph/upload-resume",     "Upload PDF resume"),
        ]),
        ("Scraping", [
            ("POST", "/api/v1/scrape/trigger",    "Manually trigger scrape"),
            ("GET",  "/api/v1/scrape/status",     "Scrape job status"),
        ]),
    ]
    m_colors = {"GET": "#00d4aa", "POST": "#64c896", "PUT": "#c8a050", "DELETE": "#c85050"}
    for group_name, endpoints in groups:
        E.append(h3(group_name))
        rows = []
        for method, path, desc in endpoints:
            mc = m_colors.get(method, "#c8c8c8")
            rows.append([
                Paragraph(f'<font color="{mc}"><b>{method}</b></font>', STYLES["DocBody"]),
                Paragraph(f'<font color="#c8c8c8" face="Courier">{path}</font>', STYLES["DocBody"]),
                Paragraph(f'<font color="#8c8c8c">{desc}</font>', STYLES["DocBody"]),
            ])
        t = Table(rows, colWidths=[14 * mm, 80 * mm, CW - 94 * mm])
        t.setStyle(TableStyle([
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CARD, colors.HexColor("#121212")]),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING",   (0, 0), (-1, -1), 5),
            ("GRID",          (0, 0), (-1, -1), 0.2, DGRAY),
        ]))
        E.append(t)
        E.append(sp(2))

    # ── S10 DB SCHEMAS ────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 10"), h1("Database Schemas"), rule(), sp(2)]
    schemas = [
        ("JobListing", [
            ("title",          "String — job title"),
            ("company",        "String — employer name"),
            ("city",           "String — job location"),
            ("sector",         "String — industry category"),
            ("skills",         "[String] — Gemini-extracted skills"),
            ("seniority",      "String — junior/mid/senior/lead"),
            ("aiVulnerability","Number — 0–1 float"),
            ("source",         "String — naukri | linkedin"),
            ("scrapedAt",      "Date — timestamp"),
            ("salary",         "Object — { min, max, currency }"),
        ]),
        ("WorkerProfile", [
            ("userId",         "ObjectId → User"),
            ("jobTitle",       "String"),
            ("city",           "String"),
            ("experience",     "Number — years"),
            ("writeUp",        "String — raw text"),
            ("extractedSkills","[String] — Gemini extraction"),
            ("riskScore",      "Number — 0–100"),
            ("riskFactors",    "[String] — top 3 reasons"),
            ("reskillPath",    "[Object] — weekly milestones"),
            ("updatedAt",      "Date"),
        ]),
        ("ChatMessage", [
            ("sessionId",  "String — chat session ID"),
            ("role",       "String — user | assistant"),
            ("content",    "String — message text"),
            ("language",   "String — en | hi"),
            ("createdAt",  "Date"),
        ]),
        ("GraphData", [
            ("workerId",      "ObjectId → WorkerProfile"),
            ("nodes",         "[Object] — { id, type, label, x, y, z }"),
            ("edges",         "[Object] — { source, target, weight }"),
            ("generatedAt",   "Date"),
        ]),
    ]
    for schema_name, fields in schemas:
        E.append(h3(schema_name))
        E.append(kv_table(fields, [45 * mm, CW - 45 * mm]))
        E.append(sp(3))

    # ── S11 BUILD STRATEGY ────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 11"), h1("Build Strategy — 48-Hour Hackathon"), rule(), sp(2)]
    phases = [
        ("01", "Foundation",           "Hours 0–6",   [
            "npm install all workspace dependencies",
            "MongoDB + Redis + ChromaDB via Docker Compose",
            "Backend Express on :5000 health check passing",
            "Frontend Vite on :3000 with API proxy",
            "Socket.IO connection verified end-to-end",
            "Basic routing (all 5 pages load without crash)",
            "Tailwind + devxlabs dark theme applied globally",
            "Navbar + GridOverlay components complete",
        ]),
        ("02", "Layer 1 Dashboard",    "Hours 6–16",  [
            "Naukri Kaggle CSV seed data loaded into MongoDB",
            "Naukri live Puppeteer scraper (≥5 cities)",
            "Gemini NLP extraction pipeline for job descriptions",
            "Tab A: Hiring Trends — Recharts time-series",
            "Tab B: Skills Intelligence — rising/declining bars",
            "Tab C: AI Vulnerability Index — score + heatmap",
            "Methodology panel with transparent weights",
            "Live refresh button → BullMQ → Socket.IO update",
        ]),
        ("03", "Layer 2 Worker Engine","Hours 16–28", [
            "Worker 4-input form → POST to backend",
            "Gemini NLP skill extraction from write-up",
            "Risk score computation using live L1 signals",
            "Animated SVG risk gauge (0–100 arc)",
            "Risk factors breakdown panel",
            "Reskilling path with NPTEL/SWAYAM real course links",
            "Week-by-week timeline component",
            "L1→L2 Socket.IO live risk propagation",
        ]),
        ("04", "Chatbot",              "Hours 28–36", [
            "Claude API integration with context-injected system prompt",
            "Chat UI: message bubbles, markdown, typing indicator",
            "All 5 question types working",
            "Language toggle EN ↔ हिंदी",
            "Quick action buttons for each question type",
        ]),
        ("05", "Knowledge Graph",      "Hours 36–42", [
            "Resume upload → pdf-parse → Gemini structured extraction",
            "GitHub scraper → Octokit → repos + languages",
            "Gemini: merge into graph node+edge schema",
            "Three.js + R3F scene with force-directed layout",
            "Glow nodes + flowing edge particles",
            "Click-to-focus + detail panel",
        ]),
        ("06", "Polish & Demo Prep",   "Hours 42–48", [
            "Landing page animations (diagonal dots, entrance stagger)",
            "Displacement Early Warning bonus feature",
            "Mobile responsiveness check",
            "Error handling & loading states",
            "Seed impressive demo data",
            "Demo script rehearsal",
        ]),
    ]
    for num, name, hours, tasks in phases:
        E.append(h2(f"{name}  —  {hours}", num))
        for t in tasks:
            E.append(bullet(t))

    # ── S12 ENVIRONMENT ───────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 12"), h1("Environment Setup"), rule(), sp(2)]
    E += [h2("Required API Keys", "01"), kv_table([
        ("GEMINI_API_KEY",  "Google AI Studio — aistudio.google.com/apikey"),
        ("CLAUDE_API_KEY",  "Anthropic Console — console.anthropic.com"),
        ("GITHUB_TOKEN",    "GitHub Settings → Fine-grained token (public_repo read)"),
        ("APIFY_TOKEN",     "Apify.com — optional, LinkedIn scraping"),
        ("MONGODB_URI",     "mongodb://localhost:27017/skills-mirage"),
        ("REDIS_URL",       "redis://localhost:6379"),
        ("JWT_SECRET",      "Random 64-char hex string"),
    ])]
    E += [h2("Quick Start", "02"), code_block([
        "# 1. Clone and setup",
        "git clone <repo> && cd skills-mirage",
        "cp .env.example .env    # Fill in API keys",
        "",
        "# 2. Start infrastructure",
        "docker-compose up -d mongodb redis chromadb",
        "",
        "# 3. Install dependencies",
        "npm install                        # root workspace",
        "cd src/frontend && npm install",
        "cd ../backend   && npm install",
        "",
        "# 4. Run development servers",
        "npm run dev          # starts both frontend + backend",
        "",
        "# 5. Seed sample data",
        "npm run db:seed",
    ])]
    E += [h2("Docker Services", "03"), kv_table([
        ("MongoDB 7",  "Port 27017 — primary data store"),
        ("Redis 7",    "Port 6379  — cache + BullMQ queues"),
        ("ChromaDB",   "Port 8000  — vector embeddings for RAG"),
        ("Backend",    "Port 5000  — Express API + Socket.IO"),
        ("Frontend",   "Port 3000  — Vite dev server"),
    ])]
    E += [h2("Subagent Skills", "04"), kv_table([
        ("ui-agent",               "Implements frontend matching devxlabs.ai design"),
        ("frontend-agent",         "React architecture, state management, routing"),
        ("backend-agent",          "Express API, DB schemas, WebSocket handlers"),
        ("scraper-agent",          "Naukri/LinkedIn/GitHub pipelines + Gemini NLP"),
        ("knowledge-graph-agent",  "Three.js force-directed 3D graph"),
        ("chatbot-agent",          "Claude API chatbot with Hindi support"),
    ])]

    # ── S13 SCORING ───────────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 13"), h1("HACKaMINeD 2026 — Scoring Breakdown"), rule(), sp(2)]
    E += [body("Scoring weights from the official HACKaMINeD 2026 judging rubric. "
               "Skills Mirage's architecture is optimised to score in every category."), sp(4)]
    for lbl, pct, col in [
        ("Technical Complexity & Architecture",       25, TEAL),
        ("Problem Depth & Real-World Applicability",  20, TEAL2),
        ("Reskilling Path Quality",                   20, colors.HexColor("#00c896")),
        ("Chatbot Intelligence",                      15, colors.HexColor("#50b4dc")),
        ("Layer Integration (L1 ↔ L2 live)",          10, colors.HexColor("#6496c8")),
        ("Layer 1 Live Signal Quality",               10, colors.HexColor("#3c8cb4")),
    ]:
        E.append(ScoreBar(lbl, pct, col))
        E.append(sp(2))

    E += [sp(4), h2("How We Score in Each Category", "01")]
    for cat, detail in [
        ("Technical Complexity (25%)",
         "Two-layer architecture with live propagation, Three.js 3D graph, BullMQ queue, "
         "ChromaDB RAG, Socket.IO real-time, Docker Compose orchestration, TypeScript end-to-end."),
        ("Problem Depth (20%)",
         "Directly addresses India's AI displacement crisis with city-level granularity, "
         "transparent methodology, and NPTEL/SWAYAM/PMKVY integration for accessible reskilling."),
        ("Reskilling Path Quality (20%)",
         "Week-by-week timeline with real course links, city-matched demand signals, "
         "experience-adjusted recommendations, and salary uplift estimates."),
        ("Chatbot Intelligence (15%)",
         "5 question types, EN+HI language support, Claude API with context injection of "
         "live L1 signals and worker's personal risk profile."),
        ("Layer Integration (10%)",
         "Socket.IO broadcasts L1 changes to all Worker Engine sessions. Risk scores "
         "recalculate live on screen when new scrape data arrives."),
        ("L1 Signal Quality (10%)",
         "Live Puppeteer scraping from Naukri (5+ cities), Gemini NLP extraction, "
         "hourly BullMQ cron jobs, Redis caching for low-latency queries."),
    ]:
        E.append(h3(cat))
        E.append(body(detail))

    # ── S14 DEMO SCRIPT ───────────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 14"), h1("Demo Script — Judge Walkthrough"), rule(), sp(2)]
    E += [body("Follow this script for a compelling 5-minute demo that hits all scoring criteria."), sp(4)]
    steps = [
        ("1",  "Open Dashboard (Layer 1)",
         "Show Tab A — Hiring Trends. Filter by Pune, 30-day view. "
         "Point out city selector, sector filters, and live data timestamp."),
        ("2",  "AI Vulnerability Index",
         "Click Tab C. Show the heatmap. Hover over Pune BPO row — score appears. "
         "Open Methodology panel to show transparent weights."),
        ("3",  "Enter Worker Engine",
         "Navigate to Worker Engine. Enter: Role='Senior BPO Executive', City=Pune, "
         "Experience=8 years, write a 2-sentence description."),
        ("4",  "Animated Risk Score",
         "Watch the SVG arc animate to 74/100 HIGH RISK. Explain the 3 risk factors shown. "
         "Judges see L1 data directly influencing L2 score."),
        ("5",  "Reskilling Path",
         "Scroll down to week-by-week timeline. Click a week — show NPTEL course link opens. "
         "Highlight that courses are city-filtered and have real URLs."),
        ("6",  "Chatbot Demo",
         "Open Chatbot. Ask: 'Why is my risk score so high?' — show Claude citing L1 data. "
         "Ask: 'मुझे क्या करना चाहिए?' — show Hindi response. Hit quick-action buttons."),
        ("7",  "Live L1 → L2 Propagation",
         "Go back to Dashboard. Hit REFRESH LIVE button. "
         "Socket.IO pushes new data → Worker Engine risk score updates on screen."),
        ("8",  "Knowledge Graph",
         "Navigate to Knowledge Graph. Upload a sample resume PDF + enter a GitHub URL. "
         "Show 3D graph generating. Click a skill node — detail panel slides in."),
        ("9",  "Navigate Graph",
         "Rotate the graph (drag). Toggle a category filter. "
         "Point out glow effects and edge particle animation."),
        ("10", "Wrap-up",
         "Return to landing page. Summarise: 2 layers, live propagation, 6 AI agents, "
         "transparent methodology, English + Hindi, Docker-deployable."),
    ]
    step_data = []
    for num, title, desc in steps:
        step_data.append([
            Paragraph(f'<font color="#0a0a0a"><b>{num}</b></font>',
                      ParagraphStyle("sn", fontName="Helvetica-Bold", fontSize=9,
                                     textColor=BG, alignment=TA_CENTER)),
            Paragraph(f'<font color="#ffffff"><b>{title}</b></font><br/>'
                      f'<font color="#c8c8c8">{desc}</font>', STYLES["DocBody"]),
        ])
    t = Table(step_data, colWidths=[10 * mm, CW - 10 * mm])
    t.setStyle(TableStyle([
        ("ROWBACKGROUNDS",  (0, 0), (-1, -1), [CARD, colors.HexColor("#121212")]),
        ("BACKGROUND",      (0, 0), (0, -1),  TEAL),
        ("TOPPADDING",      (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",   (0, 0), (-1, -1), 5),
        ("LEFTPADDING",     (0, 0), (-1, -1), 6),
        ("VALIGN",          (0, 0), (-1, -1), "TOP"),
        ("GRID",            (0, 0), (-1, -1), 0.2, DGRAY),
    ]))
    E.append(t)

    # ── S15 UI DESIGN SYSTEM ──────────────────────────────────────────────────
    E += [PageBreak(), label("SECTION 15"), h1("UI Design System — devxlabs.ai"), rule(), sp(2)]
    E += [body("All frontend components strictly follow the devxlabs.ai design language, "
               "creating a cohesive premium dark-theme aesthetic throughout the application.")]
    E += [h2("Colour Palette", "01")]
    colour_data = [
        [Paragraph('<font color="#00d4aa"><b>Hex</b></font>', STYLES["DocBody"]),
         Paragraph('<font color="#00d4aa"><b>Swatch</b></font>', STYLES["DocBody"]),
         Paragraph('<font color="#00d4aa"><b>Name</b></font>', STYLES["DocBody"])],
    ]
    swatches = [
        ("#0a0a0a", "Primary background"),
        ("#161616", "Card / elevated surface"),
        ("#323232", "Border / divider"),
        ("#00d4aa", "Teal accent primary"),
        ("#00bcd4", "Teal accent secondary"),
        ("#ffffff", "Primary text"),
        ("#c8c8c8", "Body text"),
        ("#8c8c8c", "Muted text / labels"),
    ]
    for hex_val, name in swatches:
        colour_data.append([
            Paragraph(f'<font color="#00d4aa" face="Courier">{hex_val}</font>', STYLES["DocBody"]),
            ColorRect(20, 8, colors.HexColor(hex_val),
                      DGRAY if hex_val in ("#0a0a0a", "#161616") else None),
            Paragraph(f'<font color="#c8c8c8">{name}</font>', STYLES["DocBody"]),
        ])
    ct = Table(colour_data, colWidths=[30 * mm, 22 * mm, CW - 52 * mm])
    ct.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  CARD),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CARD, colors.HexColor("#121212")]),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("GRID",          (0, 0), (-1, -1), 0.2, DGRAY),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    E.append(ct)

    E += [h2("Typography", "02"), kv_table([
        ("Display headings",  "Playfair Display — italic serif, large scale"),
        ("Body / UI text",    "Syne or DM Sans — clean sans-serif"),
        ("Code / monospace",  "JetBrains Mono or Fira Code"),
        ("Bracketed labels",  "Helvetica Bold 8pt — [ LABEL TEXT ]"),
        ("Section numbers",   "Serif, teal — [01], [02], [03]"),
    ])]

    E += [h2("Signature Elements", "03")]
    for b in [
        "Crosshair grid overlay with + markers at intersections (GridOverlay component)",
        "Diagonal dot-matrix pattern — teal dots flowing diagonally across hero sections",
        "Aurora / light streak effects on hero backgrounds",
        "Dark → teal gradient transitions between page sections",
        "Minimal top navigation, GET IN TOUCH CTA with border",
        "Cards: subtle border, translucent backgrounds, no heavy box shadows",
        "Hover states: smooth transitions, underline reveal animations",
        "Framer Motion entrance animations: stagger, slide-up, fade-in",
    ]:
        E.append(bullet(b))

    E += [h2("Tailwind Theme Extension", "04"), code_block([
        "// tailwind.config.js",
        "theme: {",
        "  extend: {",
        "    colors: {",
        "      bg:     '#0a0a0a',",
        "      card:   '#161616',",
        "      teal:   '#00d4aa',",
        "      teal2:  '#00bcd4',",
        "      border: '#323232',",
        "    },",
        "    fontFamily: {",
        "      display: ['Playfair Display', 'serif'],",
        "      body:    ['Syne', 'DM Sans', 'sans-serif'],",
        "    },",
        "  }",
        "}",
    ])]

    return E

# ── build ─────────────────────────────────────────────────────────────────────
def build(path="docs/skills-mirage-documentation.pdf"):
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=MT + 10 * mm,
        bottomMargin=MB + 10 * mm,
        title="Skills Mirage — Technical Documentation",
        author="devx labs",
        subject="HACKaMINeD 2026",
    )

    story = cover_content() + [PageBreak()] + toc_content() + all_sections()
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"PDF saved → {path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "docs/skills-mirage-documentation.pdf"
    build(out)
