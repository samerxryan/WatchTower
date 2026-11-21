"""Génère le rapport technique WatchTower (DOCX structuré, prêt pour export PDF Word).

Tout le contenu est dérivé de l'audit réel du dépôt : code source, migrations SQL,
tests, documentation AGENT et captures QA. Aucune fonctionnalité inventée.
"""
from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ASSETS = OUT / "assets"
EXPORT = OUT / "diagrams" / "export"
SHOTS = ROOT / "Screenshots"
DOCX = OUT / "Rapport_Technique_WatchTower.docx"

NAVY = RGBColor(0x0F, 0x24, 0x49)
INDIGO = RGBColor(0x3B, 0x4F, 0xBA)
CYAN = RGBColor(0x0E, 0x79, 0x8E)
SLATE = RGBColor(0x33, 0x41, 0x55)
MUTED = RGBColor(0x64, 0x6F, 0x82)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT = "EEF2FF"

# ---------------------------------------------------------------------------
# utilitaires XML / styles
# ---------------------------------------------------------------------------


def shade(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, **kwargs) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if edge in kwargs:
            tag = "w:" + edge
            element = borders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                borders.append(element)
            for key, value in kwargs[edge].items():
                element.set(qn("w:" + key), str(value))


def set_repeat_table_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def keep_row_together(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_field(paragraph, instruction: str, placeholder: str = "") -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    sep = OxmlElement("w:fldChar")
    sep.set(qn("w:fldCharType"), "separate")
    txt = OxmlElement("w:t")
    txt.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(sep)
    run._r.append(txt)
    run._r.append(end)


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Page ")
    run.font.size = Pt(9)
    run.font.color.rgb = MUTED
    set_field(paragraph, " PAGE ", "1")
    run2 = paragraph.add_run(" sur ")
    run2.font.size = Pt(9)
    run2.font.color.rgb = MUTED
    set_field(paragraph, " NUMPAGES ", "1")


# ---------------------------------------------------------------------------
# document et styles
# ---------------------------------------------------------------------------
doc = Document()

section = doc.sections[0]
section.page_height = Cm(29.7)
section.page_width = Cm(21.0)
section.top_margin = Cm(1.4)
section.bottom_margin = Cm(1.4)
section.left_margin = Cm(1.5)
section.right_margin = Cm(1.5)
section.header_distance = Cm(0.6)
section.footer_distance = Cm(0.6)

styles = doc.styles

normal = styles["Normal"]
normal.font.name = "Times New Roman"
normal.font.size = Pt(10.5)
normal.font.color.rgb = SLATE
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
pf = normal.paragraph_format
pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
pf.space_after = Pt(1)
pf.space_before = Pt(0)
pf.widow_control = True

for name, size, color, before, after in (
    ("Heading 1", 15, NAVY, 6, 4),
    ("Heading 2", 12, INDIGO, 5, 2),
    ("Heading 3", 11, NAVY, 4, 2),
):
    st = styles[name]
    st.font.name = "Times New Roman"
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = color
    st._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    st.paragraph_format.space_before = Pt(before)
    st.paragraph_format.space_after = Pt(after)
    st.paragraph_format.keep_with_next = True
    st.paragraph_format.keep_together = True
    st.paragraph_format.line_spacing = 1.15

caption_style = styles["Caption"]
caption_style.font.name = "Times New Roman"
caption_style.font.size = Pt(9)
caption_style.font.italic = True
caption_style.font.color.rgb = MUTED
caption_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
caption_style.paragraph_format.space_before = Pt(2)
caption_style.paragraph_format.space_after = Pt(3)
caption_style.paragraph_format.keep_with_next = False

# en-tête / pied de page
header = section.header.paragraphs[0]
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
hr = header.add_run("WatchTower — Rapport technique de projet")
hr.font.size = Pt(9)
hr.font.color.rgb = MUTED
hr.font.name = "Times New Roman"
add_page_number(section.footer.paragraphs[0])

# ---------------------------------------------------------------------------
# helpers de contenu
# ---------------------------------------------------------------------------


def p(text: str = "", *, style=None, align=None, size=None, bold=False,
      italic=False, color=None, space_after=None, keep_next=False):
    par = doc.add_paragraph(style=style)
    if text:
        run = par.add_run(text)
        if size:
            run.font.size = Pt(size)
        run.bold = bold
        run.italic = italic
        if color is not None:
            run.font.color.rgb = color
    if align is not None:
        par.alignment = align
    if space_after is not None:
        par.paragraph_format.space_after = Pt(space_after)
    if keep_next:
        par.paragraph_format.keep_with_next = True
    return par


def h1(text: str):
    par = doc.add_paragraph(text, style="Heading 1")
    par.paragraph_format.page_break_before = True
    return par


def h2(text: str):
    return doc.add_paragraph(text, style="Heading 2")


def h3(text: str):
    return doc.add_paragraph(text, style="Heading 3")


def bullet(text: str, level: int = 0):
    par = doc.add_paragraph(text, style="List Bullet")
    par.paragraph_format.left_indent = Cm(0.6 + 0.5 * level)
    par.paragraph_format.space_after = Pt(1)
    par.paragraph_format.line_spacing = 1.15
    for run in par.runs:
        run.font.size = Pt(10.5)
    return par


def numbered(text: str):
    par = doc.add_paragraph(text, style="List Number")
    par.paragraph_format.left_indent = Cm(0.7)
    par.paragraph_format.space_after = Pt(1)
    par.paragraph_format.line_spacing = 1.15
    for run in par.runs:
        run.font.size = Pt(10.5)
    return par


def table(headers, rows, widths=None, fontsize=8.0, caption=None):
    if caption:
        p(caption, style="Caption")
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.style = "Table Grid"
    hdr = tbl.rows[0]
    set_repeat_table_header(hdr)
    keep_row_together(hdr)
    for idx, label in enumerate(headers):
        cell = hdr.cells[idx]
        cell.text = ""
        para = cell.paragraphs[0]
        para.paragraph_format.space_after = Pt(0)
        para.paragraph_format.line_spacing = 1.0
        run = para.add_run(str(label))
        run.bold = True
        run.font.size = Pt(fontsize)
        run.font.color.rgb = WHITE
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        shade(cell, "152C52")
        set_cell_border(cell, top={"val": "single", "sz": 6, "color": "152C52"},
                        bottom={"val": "single", "sz": 6, "color": "152C52"},
                        left={"val": "single", "sz": 4, "color": "FFFFFF"},
                        right={"val": "single", "sz": 4, "color": "FFFFFF"})
    for r_idx, row in enumerate(rows):
        cells = tbl.add_row().cells
        keep_row_together(tbl.rows[-1])
        for c_idx, value in enumerate(row):
            cell = cells[c_idx]
            cell.text = ""
            para = cell.paragraphs[0]
            para.paragraph_format.space_after = Pt(0)
            para.paragraph_format.line_spacing = 1.05
            run = para.add_run(str(value))
            run.font.size = Pt(fontsize)
            if c_idx == 0:
                run.bold = True
                run.font.color.rgb = NAVY
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            if r_idx % 2 == 1:
                shade(cell, "F5F7FB")
            set_cell_border(cell, top={"val": "single", "sz": 4, "color": "D8DFEA"},
                            bottom={"val": "single", "sz": 4, "color": "D8DFEA"},
                            left={"val": "single", "sz": 4, "color": "D8DFEA"},
                            right={"val": "single", "sz": 4, "color": "D8DFEA"})
    if widths:
        total = float(sum(widths))
        factor = 17.9 / total if total else 1.0
        scaled = [Cm(width * factor) for width in widths]
        for idx, width in enumerate(scaled):
            tbl.columns[idx].width = width
        for row in tbl.rows:
            for idx, width in enumerate(scaled):
                row.cells[idx].width = width
    return tbl


def figure(path: Path, caption: str, width_cm: float):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.space_before = Pt(1)
    par.paragraph_format.space_after = Pt(0)
    par.paragraph_format.keep_with_next = True
    run = par.add_run()
    run.add_picture(str(path), width=Cm(width_cm))
    p(caption, style="Caption")


def code_block(text: str):
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Cm(0.5)
    par.paragraph_format.right_indent = Cm(0.3)
    par.paragraph_format.space_after = Pt(4)
    par.paragraph_format.line_spacing = 1.0
    par.paragraph_format.keep_together = True
    run = par.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(8.0)
    run.font.color.rgb = NAVY
    pPr = par._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), "F4F6FA")
    pPr.append(shd)
    return par


# ===========================================================================
# PAGE DE GARDE
# ===========================================================================
for _ in range(2):
    doc.add_paragraph()

logo_par = doc.add_paragraph()
logo_par.alignment = WD_ALIGN_PARAGRAPH.CENTER
logo_par.paragraph_format.space_after = Pt(16)
logo_par.add_run().add_picture(str(ASSETS / "WatchTower_Logo.png"), width=Cm(5.0))

p("Développement d'une plateforme « WatchTower »",
  align=WD_ALIGN_PARAGRAPH.CENTER, size=20, bold=True, color=NAVY,
  space_after=6).paragraph_format.keep_with_next = True
p("Application web de planification, d'organisation et de suivi de projets",
  align=WD_ALIGN_PARAGRAPH.CENTER, size=13.5, italic=True, color=INDIGO,
  space_after=4)
p("Rapport technique de projet",
  align=WD_ALIGN_PARAGRAPH.CENTER, size=14, bold=True, color=CYAN,
  space_after=28)

cover = [
    ("Étudiant", "Samer Rayen Ncib"),
    ("Projet", "WatchTower"),
    ("Type de projet", "Projet individuel"),
    ("Durée prévisionnelle", "12 semaines"),
    ("Méthodologie", "Scrum adaptée au développement individuel"),
    ("Établissement", "[À compléter par l'étudiant]"),
    ("Encadrant", "[À compléter par l'étudiant]"),
    ("Année universitaire", "2026–2027 (à confirmer)"),
]
ct = doc.add_table(rows=0, cols=2)
ct.alignment = WD_TABLE_ALIGNMENT.CENTER
for key, value in cover:
    cells = ct.add_row().cells
    cells[0].width = Cm(5.0)
    cells[1].width = Cm(10.0)
    r0 = cells[0].paragraphs[0].add_run(key)
    r0.bold = True
    r0.font.size = Pt(11)
    r0.font.color.rgb = NAVY
    r1 = cells[1].paragraphs[0].add_run(value)
    r1.font.size = Pt(11)
    cells[0].paragraphs[0].paragraph_format.space_after = Pt(3)
    cells[1].paragraphs[0].paragraph_format.space_after = Pt(3)

p("Document généré à partir de l'analyse du code source, du schéma SQL, "
  "des tests automatisés et des captures de contrôle qualité du projet.",
  align=WD_ALIGN_PARAGRAPH.CENTER, size=9, italic=True, color=MUTED,
  space_after=0)

# ===========================================================================
# ÉLÉMENTS PRÉLIMINAIRES
# ===========================================================================
h1("Remerciements")
p("[Texte à personnaliser par l'étudiant.]")
p("Je remercie l'équipe pédagogique ainsi que l'encadrant du projet pour les "
  "orientations méthodologiques apportées tout au long de la conception et de "
  "la réalisation de WatchTower. Je remercie également les personnes ayant "
  "accepté de tester les différentes versions de l'application et d'apporter "
  "des retours sur son ergonomie et sur la clarté des parcours utilisateurs.")
p("Une mention particulière est adressée aux mainteneurs des bibliothèques "
  "libres utilisées dans ce projet — React, Node.js, Express, MySQL, Zod, "
  "Vite et Tailwind CSS — dont la documentation publique a constitué une "
  "référence technique constante pendant le développement [1]–[6].")

h1("Résumé")
p("WatchTower est une application web de gestion de projets développée dans "
  "le cadre d'un projet individuel de 12 semaines. Elle centralise la "
  "planification des projets, l'organisation des tâches, l'affectation des "
  "responsabilités, le suivi de la progression et la gestion des membres "
  "d'équipe. Le rapport présente l'audit complet du système réalisé : la "
  "structure du dépôt, les composants React, les routeurs Express, les "
  "services et middlewares, les quatre migrations MySQL, la suite de tests "
  "Vitest/Supertest et les captures de contrôle qualité. L'analyse aboutit à "
  "une architecture client-serveur à API REST JSON, avec authentification par "
  "cookies HttpOnly (jeton d'accès JWT de 15 minutes et session de "
  "rafraîchissement hachée de 7 jours), contrôle d'accès fondé sur trois rôles "
  "globaux et deux rôles projet, et dix tables relationnelles. La modélisation "
  "UML couvre les cas d'utilisation, les classes du domaine, cinq scénarios de "
  "séquence, ainsi que les diagrammes de Gantt et PERT d'une planification à "
  "douze semaines. La démarche Scrum adaptée au travail individuel, la "
  "matrice de traçabilité, les résultats de tests et une estimation de coûts "
  "explicitement hypothétique complètent l'étude. Les limites observées — "
  "absence de machine à états pour les transitions de statut, notifications "
  "d'échéance générées à la demande, suppression logique sans restauration — "
  "sont documentées sans être présentées comme des fonctionnalités réalisées.")
p("Mots-clés : ", bold=True, space_after=2).paragraph_format.keep_with_next = True
p("gestion de projet, application web, React, Node.js, Express, MySQL, API "
  "REST, UML, Scrum, authentification, contrôle d'accès, tests d'intégration.")

h1("Abstract")
p("WatchTower is a web-based project management application developed as a "
  "twelve-week individual project. It centralises project planning, task "
  "organisation, responsibility assignment, progress tracking and team "
  "membership. This report documents a full audit of the delivered codebase: "
  "the React component structure, Express routers, business services and "
  "middleware, four MySQL migrations, the Vitest/Supertest suite and the "
  "quality-assurance screenshots. The resulting architecture is a "
  "client–server system communicating through a JSON REST API, with HttpOnly "
  "cookie authentication (a 15-minute JWT access cookie and a hashed "
  "seven-day refresh session), role-based access control based on three "
  "global roles and two project roles, and ten relational tables. The UML "
  "modelling covers use cases, domain classes, five sequence scenarios and "
  "the Gantt and PERT charts of a twelve-week schedule. An individual "
  "adaptation of Scrum, a traceability matrix, the test inventory and a "
  "clearly hypothetical cost estimate complete the study. Observed "
  "limitations are reported without being presented as implemented features.")
p("Keywords : ", bold=True, space_after=2).paragraph_format.keep_with_next = True
p("project management, web application, React, Node.js, Express, MySQL, REST "
  "API, UML, Scrum, authentication, access control, integration testing.")

# ---------------------------------------------------------------------------
h1("Table des matières")
toc_par = doc.add_paragraph()
set_field(toc_par, ' TOC \\o "1-2" \\h \\z \\u ',
          "Mise à jour automatique à effectuer dans Microsoft Word.")

h1("Liste des figures")
p("Les figures sont numérotées par chapitre. Les captures d'écran sont "
  "numérotées dans le chapitre 5 et proviennent du dossier Screenshots du projet.",
  size=10, italic=True, color=MUTED)
FIGURES = [
    ("Figure 2.1 — Diagramme global des cas d'utilisation de WatchTower", "[[FIG:2.1]]"),
    ("Figure 4.1 — Architecture technique globale de WatchTower", "[[FIG:4.1]]"),
    ("Figure 4.2 — Modèle de classes du domaine (classes persistantes)", "[[FIG:4.2]]"),
    ("Figure 4.3 — Schéma relationnel MySQL (10 tables)", "[[FIG:4.3]]"),
    ("Figure 4.4 — Séquence : inscription et connexion", "[[FIG:4.4]]"),
    ("Figure 4.5 — Séquence : création d'un projet", "[[FIG:4.5]]"),
    ("Figure 4.6 — Séquence : création et attribution d'une tâche", "[[FIG:4.6]]"),
    ("Figure 4.7 — Séquence : modification du statut d'une tâche", "[[FIG:4.7]]"),
    ("Figure 4.8 — Séquence : consultation du tableau de bord", "[[FIG:4.8]]"),
    ("Figure 5.1 — Page de connexion", "[[FIG:5.1]]"),
    ("Figure 5.2 — Interface en thème sombre", "[[FIG:5.2]]"),
    ("Figure 5.3 — Tableau de bord administrateur", "[[FIG:5.3]]"),
    ("Figure 5.4 — Liste des projets", "[[FIG:5.4]]"),
    ("Figure 5.5 — Formulaire de création de projet", "[[FIG:5.5]]"),
    ("Figure 5.6 — Détail d'un projet et gestion des membres", "[[FIG:5.6]]"),
    ("Figure 5.7 — Tableau Kanban des tâches", "[[FIG:5.7]]"),
    ("Figure 5.8 — Commentaire publié sur une tâche", "[[FIG:5.8]]"),
    ("Figure 5.9 — Rapports et agrégats", "[[FIG:5.9]]"),
    ("Figure 5.10 — Centre de notifications", "[[FIG:5.10]]"),
    ("Figure 5.11 — Préférences utilisateur", "[[FIG:5.11]]"),
    ("Figure 5.12 — Vue projets en lecture seule pour un membre", "[[FIG:5.12]]"),
    ("Figure 7.1 — Diagramme de Gantt prévisionnel sur 12 semaines", "[[FIG:7.1]]"),
    ("Figure 7.2 — Réseau PERT et chemin critique", "[[FIG:7.2]]"),
]
for label, marker in FIGURES:
    par = p(label, size=9.5, space_after=1)
    par.paragraph_format.tab_stops.add_tab_stop(Cm(13.4))
    par.add_run("\t" + marker)

h1("Liste des tableaux")
TABLES_LIST = [
    "Tableau 2.1 — Acteurs identifiés dans le code source",
    "Tableau 2.2 — Besoins fonctionnels et état d'implémentation",
    "Tableau 2.3 — Exigences non fonctionnelles et éléments de preuve",
    "Tableau 2.4 — Matrice de traçabilité besoins → code",
    "Tableau 3.1 — Répartition des responsabilités Scrum individuelles",
    "Tableau 3.2 — Product Backlog",
    "Tableau 3.3 — Planification des sprints",
    "Tableau 4.1 — Composants de l'architecture et responsabilités",
    "Tableau 4.2 — Tables de la base de données et rôles",
    "Tableau 4.3 — Principales relations et cardinalités",
    "Tableau 5.1 — Outils : statut de vérification",
    "Tableau 5.2 — Technologies effectivement présentes dans package.json",
    "Tableau 5.3 — Routes frontend et gardes associés",
    "Tableau 6.1 — Inventaire des tests automatisés",
    "Tableau 6.2 — Campagne de tests récapitulative",
    "Tableau 7.1 — Décomposition des activités (WBS)",
    "Tableau 7.2 — Calcul CPM : dates au plus tôt/tard et marges",
    "Tableau 7.3 — Comparaison Gantt / PERT appliquée à WatchTower",
    "Tableau 8.1 — Estimation des ressources et coûts",
    "Tableau 9.1 — Difficultés et solutions réellement mises en œuvre",
    "Tableau A.1 — Endpoints REST représentatifs",
    "Tableau A.2 — Captures d'écran retenues et scénarios associés",
]
for label in TABLES_LIST:
    par = p(label, size=9.5, space_after=1)
    par.paragraph_format.tab_stops.add_tab_stop(Cm(13.4))
    par.add_run("\t[[TAB]]")

h1("Liste des acronymes et abréviations")
table(["Acronyme", "Signification"], [
    ("API", "Application Programming Interface (interface de programmation applicative)"),
    ("BDD", "Base de données"),
    ("CPM", "Critical Path Method (méthode du chemin critique)"),
    ("CRUD", "Create, Read, Update, Delete (créer, lire, modifier, supprimer)"),
    ("CSRF", "Cross-Site Request Forgery (falsification de requête intersite)"),
    ("ERD", "Entity-Relationship Diagram (diagramme entité-association)"),
    ("FK", "Foreign Key (clé étrangère)"),
    ("HTTP", "Hypertext Transfer Protocol"),
    ("HTTPS", "HTTP over TLS"),
    ("IDE", "Integrated Development Environment (environnement de développement intégré)"),
    ("JSON", "JavaScript Object Notation"),
    ("JWT", "JSON Web Token"),
    ("KPI", "Key Performance Indicator (indicateur clé de performance)"),
    ("ORM", "Object-Relational Mapping (mapping objet-relationnel)"),
    ("PERT", "Program Evaluation and Review Technique"),
    ("PK", "Primary Key (clé primaire)"),
    ("RBAC", "Role-Based Access Control (contrôle d'accès fondé sur les rôles)"),
    ("REST", "Representational State Transfer"),
    ("SHA-256", "Secure Hash Algorithm 256 bits"),
    ("SQL", "Structured Query Language"),
    ("UML", "Unified Modeling Language"),
    ("UTC", "Universal Coordinated Time"),
    ("Vite", "Outil de compilation et de serveur de développement frontend"),
    ("Zod", "Bibliothèque de validation de schémas TypeScript/JavaScript"),
], widths=[2.6, 12.8], fontsize=7.4)

# ===========================================================================
# CHAPITRE 1 — INTRODUCTION GÉNÉRALE ET CONTEXTE
# ===========================================================================
h1("Chapitre 1 — Introduction générale et contexte du projet")

h2("1.1 Contexte général de la gestion de projets informatiques")
p("La gestion de projets informatiques consiste à coordonner des ressources "
  "humaines et techniques autour d'un objectif délimité, avec des contraintes "
  "de portée, de délai et de qualité. Dans les équipes de développement, "
  "cette coordination s'appuie sur trois dimensions étroitement liées : la "
  "planification des activités, la répartition des responsabilités et le suivi "
  "de l'avancement [7]. Lorsque ces dimensions sont traitées dans des outils "
  "distincts — tableur pour le planning, messagerie pour les décisions, "
  "documents textuels pour le suivi — l'information se fragmente rapidement.")
p("La centralisation de ces données dans une unique application web apporte "
  "une valeur ajoutée double. D'une part, elle établit une source de vérité "
  "partagée : un projet, une tâche, un membre ou une échéance n'existent plus "
  "qu'à un seul endroit, avec un identifiant et un état déterminés. D'autre "
  "part, elle rend possible le calcul automatique d'indicateurs de synthèse — "
  "nombre de tâches terminées, taux de progression, tâches en retard — qui "
  "seraient coûteux à produire manuellement et rapidement obsolètes.")

h2("1.2 Difficultés rencontrées dans le suivi des projets")
p("L'absence d'outil centralisé se manifeste par plusieurs symptômes que la "
  "problématique du projet identifie explicitement : une mauvaise répartition "
  "des tâches, des retards dans la réalisation des projets, un manque de "
  "visibilité sur l'avancement, des difficultés de communication et une "
  "mauvaise gestion des priorités. Ces symptômes ne sont pas indépendants : "
  "une tâche non attribuée n'a pas de responsable identifiable, son échéance "
  "n'est donc pas surveillée, et le retard qui en résulte n'est détecté "
  "qu'après coup.")
p("Un deuxième facteur de difficulté tient à la granularité des permissions. "
  "Dans un projet, tous les participants ne disposent pas des mêmes droits : "
  "certains créent des projets, d'autres gèrent les membres, d'autres encore "
  "se contentent de consulter les tâches qui leur sont confiées. Une "
  "application qui ne distingue pas ces niveaux de responsabilité expose "
  "l'utilisateur à des erreurs de manipulation et augmente le risque de "
  "modifications non désirées.")

h2("1.3 Problématique")
p("La problématique retenue pour ce projet est la suivante :")
p("« Comment concevoir et développer une application web centralisée "
  "permettant de faciliter la planification, l'organisation et le suivi des "
  "projets informatiques ? »",
  align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, bold=True, color=NAVY)
p("Cette question générale se décline en trois sous-questions. Comment "
  "modéliser les données d'un projet de manière à représenter fidèlement les "
  "relations entre utilisateurs, projets, tâches et commentaires ? Comment "
  "exposer ces données par une interface HTTP cohérente et sécurisée ? Enfin, "
  "comment offrir à chaque profil une vue adaptée à son rôle sans dupliquer "
  "la logique d'autorisation ?")

h2("1.4 Solution proposée")
p("La solution développée est WatchTower, une application web organisée en "
  "une interface React et une API REST Express connectée à MySQL 8. Elle "
  "permet aux utilisateurs de créer et gérer leurs projets, de définir les "
  "dates de début et de fin, d'organiser les tâches, d'attribuer des "
  "responsabilités, de fixer des priorités et des échéances, de suivre "
  "l'avancement global et de gérer les membres des équipes. L'interface est "
  "disponible en français et en anglais, avec un thème clair et un thème "
  "sombre, tous deux stockés dans les préférences de l'utilisateur.")
p("Le choix d'une architecture à pages React côté client et à routeurs "
  "Express côté serveur permet de séparer la présentation de la logique "
  "métier. Les données ne sont jamais modifiées directement depuis le "
  "navigateur : toute mutation passe par un endpoint validé, authentifié et "
  "autorisé.")

h2("1.5 Objectifs généraux et objectifs spécifiques")
p("L'objectif général du projet est de fournir un outil centralisé qui réduit "
  "la dispersion de l'information et améliore la visibilité sur l'avancement "
  "des projets. Les objectifs spécifiques, vérifiables dans le code livré, "
  "sont les suivants :")
bullet("Mettre en place une authentification sécurisée par cookies HttpOnly, "
       "avec jeton d'accès JWT à courte durée et session de rafraîchissement "
       "hachée stockée en base.")
bullet("Définir trois rôles globaux (ADMIN, PROJECT_MANAGER, TEAM_MEMBER) et "
       "deux rôles projet (MANAGER, MEMBER), appliqués de manière uniforme "
       "aux routes sensibles.")
bullet("Modéliser les projets, les tâches, les commentaires, les membres, les "
       "notifications et les journaux dans un schéma relationnel cohérent.")
bullet("Offrir des vues de synthèse : tableau de bord, rapports, calendrier "
       "et timeline, calculées à partir des données accessibles à l'utilisateur.")
bullet("Automatiser la validation des entrées et la vérification des droits "
       "afin de limiter les incohérences de données.")
bullet("Constituer une suite de tests d'intégration couvrant les parcours "
       "critiques et produire des preuves visuelles par captures d'écran.")

h2("1.6 Périmètre fonctionnel")
p("Le périmètre effectivement implémenté couvre huit ensembles : "
  "l'authentification et la gestion du profil, le tableau de bord, la gestion "
  "des projets, la gestion des tâches et des commentaires, la gestion des "
  "membres, les notifications, les vues de synthèse (rapports, calendrier, "
  "timeline, activité) et les préférences d'interface. L'API expose au total "
  "46 endpoints fonctionnels sous le préfixe /api/v1, auxquels s'ajoute "
  "GET /api/v1/health.")
p("Sont explicitement hors périmètre : l'envoi d'e-mails, la vérification "
  "d'adresse, l'authentification à deux facteurs, la messagerie instantanée, "
  "l'export de rapports, l'upload de fichiers et l'application mobile. Ces "
  "fonctions n'existent pas dans le code livré et ne sont pas présentées "
  "comme réalisées.")

h2("1.7 Utilisateurs concernés")
p("Trois profils correspondent aux rôles globaux déclarés dans la migration "
  "initiale. L'administrateur dispose d'un accès complet à tous les projets "
  "et à l'administration des comptes. Le chef de projet peut créer des "
  "projets et gérer ceux qu'il possède ou dans lesquels il est membre "
  "MANAGER. Le membre d'équipe consulte les projets auxquels il appartient, "
  "modifie le statut des tâches et publie des commentaires. Aucun quatrième "
  "rôle n'est implémenté.")

h2("1.8 Présentation générale de WatchTower")
p("Le nom WatchTower évoque la fonction de supervision assurée par "
  "l'application : elle observe l'état des projets, signale les échéances et "
  "consolide les indicateurs d'avancement. Le logo original du projet, "
  "conservé sans modification dans docs/report/assets, est reproduit sur la "
  "page de garde. L'interface s'organise autour d'une barre latérale "
  "donnant accès aux différentes vues et d'un en-tête de page ; les parcours "
  "sont décrits au chapitre 5 et illustrés par les captures des figures 5.1 "
  "à 5.12.")

h2("1.9 Organisation du rapport")
p("Le chapitre 2 analyse les besoins et identifie les acteurs à partir du "
  "code. Le chapitre 3 présente la méthodologie Scrum adaptée et la "
  "planification prévisionnelle. Le chapitre 4 est consacré à la conception "
  "et aux modèles UML et relationnels. Le chapitre 5 décrit la réalisation "
  "technique et intègre les captures d'écran. Le chapitre 6 traite des tests "
  "et de la validation qualité. Les chapitres 7 et 8 présentent la "
  "planification Gantt/PERT et l'estimation des coûts. Les chapitres 9 et 10 "
  "reposent les difficultés, les perspectives d'évolution et la conclusion. "
  "Des annexes et une bibliographie ferment le document.")

# ===========================================================================
# CHAPITRE 2 — ANALYSE DES BESOINS
# ===========================================================================
h1("Chapitre 2 — Analyse des besoins et spécification fonctionnelle")

h2("2.1 Identification des acteurs")
p("Les acteurs sont identifiés à partir de l'énumération role de la table "
  "users et des gardes requireRoles présentes dans les routeurs. Le tableau "
  "2.1 synthétise leurs responsabilités réelles.")
table(["Acteur", "Déclenchement dans le code", "Responsabilités observées"], [
    ("ADMIN", "requireRoles(['ADMIN']) et contrôles canManage",
     "Accès à tous les projets et tâches ; administration des rôles et statuts "
     "de comptes ; annuaire complet ; toutes les mutations non archivées."),
    ("PROJECT_MANAGER", "requireRoles(['ADMIN','PROJECT_MANAGER']) à la création projet",
     "Création de projets ; gestion des projets possédés ou dont il est "
     "manager projet ; annuaire utilisateurs en champs limités ; liste des "
     "membres pour le sélecteur."),
    ("TEAM_MEMBER", "Rôle par défaut à l'inscription",
     "Consultation des projets dont il est membre ; changement de statut des "
     "tâches ; publication et édition de ses commentaires ; gestion de son "
     "profil et de ses préférences."),
], widths=[3.0, 5.2, 7.2], fontsize=9.0,
   caption="Tableau 2.1 — Acteurs identifiés dans le code source")
p("Un acteur technique supplémentaire intervient dans les diagrammes de "
  "séquence : le service de tâches planifiées du serveur, qui balaie les "
  "échéances au démarrage et toutes les heures. Il n'est pas un rôle "
  "utilisateur mais un composant du système.")

h2("2.2 Besoins fonctionnels")
p("Le tableau 2.2 confronte les besoins attendus à l'implémentation constatée. "
  "La colonne « État » distingue les fonctions réellement présentes des "
  "comportements limités ou absents.")
table(["Module", "Besoin", "Implémentation constatée", "État"], [
    ("Authentification", "Inscription",
     "POST /auth/register ; rôle forcé à TEAM_MEMBER ; mot de passe haché bcrypt.",
     "Réalisé"),
    ("Authentification", "Connexion / déconnexion",
     "POST /auth/login et /auth/logout ; cookies wt_access et wt_refresh ; "
     "rotation du refresh ; audit LOGIN_* .", "Réalisé"),
    ("Authentification", "Mot de passe oublié / vérification",
     "POST /auth/forgot-password et /auth/reset-password ; GET /auth/verify. "
     "Aucun envoi d'e-mail ; jeton renvoyé en développement.", "Réalisé (limite)"),
    ("Authentification", "Profil utilisateur",
     "GET/PATCH /users/me, /users/me/password, /users/me/preferences.", "Réalisé"),
    ("Dashboard", "Indicateurs synthétiques",
     "GET /reports/summary : totalProjects, totalTasks, completedTasks, "
     "pendingTasks, overdueTasks, overallProgress, répartitions.", "Réalisé"),
    ("Dashboard", "Statistiques et graphiques",
     "Répartition par statut et priorité fournie en JSON ; rendu graphique "
     "côté client dans ReportsPage.", "Réalisé"),
    ("Projets", "Création / modification",
     "POST et PATCH /projects ; validation des dates ; création interdite en "
     "ARCHIVED.", "Réalisé"),
    ("Projets", "Suppression",
     "DELETE /projects archive (status ARCHIVED + archived_at) ; aucune "
     "suppression physique, aucun désarchivage par l'API.", "Réalisé (limite)"),
    ("Projets", "Dates et progression",
     "start_date, due_date ; progression calculée par requête "
     "(terminées / total), non stockée.", "Réalisé"),
    ("Tâches", "CRUD et priorités",
     "Routes /projects/:id/tasks et /tasks ; statuts TODO, IN_PROGRESS, "
     "IN_REVIEW, DONE ; priorités LOW à URGENT.", "Réalisé"),
    ("Tâches", "Suppression",
     "Soft delete via tasks.deleted_at ; aucune restauration exposée.",
     "Réalisé (limite)"),
    ("Tâches", "Changement de statut",
     "PATCH /tasks/:id/status ; tout membre autorisé ; completed_at recalculé ; "
     "aucune machine à états.", "Réalisé (limite)"),
    ("Équipes", "Membres et responsabilités",
     "GET/POST/DELETE /projects/:id/members ; rôles projet MANAGER/MEMBER ; "
     "retrait qui désaffecte les tâches.", "Réalisé"),
    ("Équipes", "Attribution des tâches",
     "assignee_id doit être un utilisateur actif et membre du projet "
     "(sauf propriétaire).", "Réalisé"),
    ("Commentaires", "Publication et édition",
     "POST/GET/PATCH/DELETE sur /comments et /tasks/:id/comments ; "
     "soft delete ; projet archivé en lecture seule.", "Réalisé"),
    ("Notifications", "Alertes et lecture",
     "TASK_ASSIGNED, TASK_STATUS_CHANGED, PROJECT_INVITE, TASK_OVERDUE, "
     "TASK_DUE_SOON ; compteur non lus ; dédup par tâche et par jour.", "Réalisé"),
    ("Synthèses", "Calendrier et timeline",
     "GET /calendar/events et /timeline/projects ; filtrage par plage de dates "
     "pour le calendrier uniquement.", "Réalisé"),
    ("Préférences", "Langue, thème, notifications",
     "Colonnes preferred_language, preferred_theme, notification_prefs ; "
     "interface FR/EN et thèmes clair/sombre.", "Réalisé"),
], widths=[2.4, 3.3, 8.4, 1.3], fontsize=8.3,
   caption="Tableau 2.2 — Besoins fonctionnels et état d'implémentation")

h2("2.3 Besoins non fonctionnels")
table(["Exigence", "Manifestation dans le projet", "Preuve dans les artefacts"], [
    ("Sécurité", "Cookies HttpOnly, SameSite=Lax, CSRF par origine, Helmet, "
     "limiteurs de débit, hachage bcrypt et SHA-256, RBAC.",
     "server/src/app.js, middleware/auth.js, utils/cookies.js, services/authService.js"),
    ("Performance", "Index composites sur les colonnes filtrées ; pagination "
     "plafonnée à 100 ; agrégats calculés en SQL.",
     "migration 003_performance_indexes.sql, utils/pagination.js, repositories/"),
    ("Maintenabilité", "Séparation routes / services / repositories / middlewares "
     "et schémas Zod centralisés.", "server/src/modules/, server/src/services/, "
     "server/src/validation/schemas.js"),
    ("Ergonomie", "Navigation latérale, états de chargement, messages d'erreur, "
     "deux thèmes et deux langues.", "client/src/components/, client/src/i18n/, "
     "client/src/styles/ThemeContext.jsx"),
    ("Disponibilité", "Endpoint /health public renvoyant 200 si la base répond, "
     "503 sinon ; arrêt gracieux.", "server/src/app.js, server/src/server.js"),
    ("Fiabilité", "Transactions sur les créations projets/tâches et la rotation "
     "de session ; contraintes d'unicité SQL.", "modules/projects, modules/tasks, "
     "migrations 001 et 002"),
    ("Évolutivité", "API sans état côté client, routes modulaires, migrations "
     "versionnées.", "server/src/app.js, server/src/database/migrate.js"),
    ("Compatibilité", "Application web exécutée dans le navigateur via Vite ; "
     "aucun test multi-navigateur automatisé disponible.",
     "Screenshots/ (78 captures), rapport QA du projet"),
    ("Adaptabilité responsive", "Mise en forme Tailwind CSS 4 à classes utilitaires "
     "et grilles adaptatives.", "client/src/styles/index.css, composants layout/"),
], widths=[2.3, 7.2, 5.9], fontsize=8.5,
   caption="Tableau 2.3 — Exigences non fonctionnelles et éléments de preuve")
p("La compatibilité multi-navigateur et l'accessibilité ne disposent pas de "
  "résultats de test automatisés dans le dépôt : elles sont donc signalées "
  "comme non vérifiées plutôt que comme validées.")

h2("2.4 Diagramme global de cas d'utilisation UML")
p("Le diagramme de la figure 2.1 place les trois acteurs à l'extérieur de la "
  "frontière du système et les cas d'utilisation à l'intérieur. Les relations "
  "d'inclusion traduisent une étape obligatoire : toute mutation passe par "
  "l'authentification et par le contrôle d'accès. La relation d'extension "
  "entre « Gérer les tâches » et « Recevoir une notification » modélise un "
  "effet conditionnel : la notification n'est produite que si les préférences "
  "de l'utilisateur l'autorisent et si l'acteur n'est pas le destinataire.")
figure(EXPORT / "figure_2_1_cas_utilisation.png",
       "Figure 2.1 — Diagramme global des cas d'utilisation de WatchTower", 15.0)
h3("Description des principaux cas d'utilisation")
table(["Cas d'utilisation", "Acteur principal", "Déroulement nominal"], [
    ("S'authentifier", "Les trois acteurs",
     "Saisie des identifiants → POST /auth/login → cookies posés → session active."),
    ("Créer un projet", "ADMIN, PROJECT_MANAGER",
     "Formulaire → validation Zod → transaction INSERT projet + membre MANAGER + activité."),
    ("Gérer les membres", "ADMIN, propriétaire ou manager projet",
     "Sélection d'un utilisateur actif → ajout → notification PROJECT_INVITE ; "
     "le retrait désaffecte ses tâches."),
    ("Créer et attribuer une tâche", "ADMIN ou manager projet",
     "Saisie titre/priorité/échéance → vérification du responsable → INSERT "
     "→ notification d'attribution."),
    ("Changer le statut d'une tâche", "Tout membre du projet",
     "Sélection du statut → PATCH /tasks/:id/status → completed_at recalculé → "
     "notification au propriétaire et aux managers."),
    ("Consulter le tableau de bord", "Les trois acteurs",
     "Chargement parallèle de /projects, /tasks, /reports/summary et /activity "
     "→ affichage des KPI et des listes."),
    ("Recevoir une notification", "Les trois acteurs",
     "Génération à la demande ou par le balayage horaire → lecture filtrée par "
     "utilisateur → marquage comme lu."),
], widths=[4.0, 3.7, 7.7], fontsize=7.6)

h2("2.5 Matrice de traçabilité")
p("La matrice suivante établit le lien entre les besoins de la conception "
  "initiale et les artefacts réellement livrés. Elle constitue la référence "
  "utilisée pour éviter qu'une fonction prévue soit décrite comme réalisée.")
table(["Fonctionnalité prévue", "Implémentation réelle", "Fichiers concernés", "État"], [
    ("Authentification sécurisée", "Cookies HttpOnly, JWT 15 min, refresh haché 7 j, "
     "bcrypt 12 rounds, rotation.", "modules/auth, services/authService.js, utils/cookies.js, "
     "migration 002", "Réalisé"),
    ("Contrôle d'accès par rôles", "3 rôles globaux, 2 rôles projet, gardes sur les "
     "routeurs.", "services/accessControl.js, middleware/auth.js", "Réalisé"),
    ("Tableau de bord et KPI", "Agrégats calculés dans reportsRouter, affichés par "
     "DashboardPage.", "modules/insights/insights.routes.js, features/dashboard/", "Réalisé"),
    ("CRUD projets", "Création, lecture, mise à jour, archivage ; pas de suppression "
     "physique.", "modules/projects/projects.routes.js", "Réalisé"),
    ("Gestion des membres", "Ajout, retrait, rôles projet, unicité du couple "
     "projet/utilisateur.", "repositories/projectRepository.js, migration 001", "Réalisé"),
    ("CRUD tâches et Kanban", "Création, édition, soft delete, statuts et priorités, "
     "vue Kanban.", "modules/tasks/, features/tasks/KanbanPage.jsx", "Réalisé"),
    ("Commentaires", "Création, édition par auteur/admin, soft delete, projet "
     "archivé bloqué.", "modules/tasks/tasks.routes.js", "Réalisé"),
    ("Notifications", "5 types, préférences, dédup par tâche/jour, compteur non lus.",
     "services/notificationService.js, modules/notifications/", "Réalisé"),
    ("Calendrier et timeline", "Échéances tâches/projets et projets avec dates.",
     "modules/insights/insights.routes.js, features/calendar/, features/timeline/", "Réalisé"),
    ("FR/EN et thèmes", "Préférences persistées en base, contexte React dédié.",
     "client/src/i18n/, client/src/styles/ThemeContext.jsx", "Réalisé"),
    ("Rapports PDF/Excel", "Aucun endpoint ni composant d'export.", "—", "Non réalisé"),
    ("Notifications temps réel", "Génération à la demande, au démarrage et horaire ; "
     "aucun WebSocket.", "services/deadlineService.js", "Non réalisé"),
    ("Rôles avancés personnalisables", "Énumération fixe de 3 rôles globaux.",
     "migration 001, middleware/auth.js", "Non réalisé"),
    ("Vérification d'e-mail / 2FA", "Aucun code correspondant.", "—", "Non réalisé"),
], widths=[3.3, 6.6, 4.3, 1.2], fontsize=8.1,
   caption="Tableau 2.4 — Matrice de traçabilité besoins → code")

# ===========================================================================
# CHAPITRE 3 — MÉTHODOLOGIE ET PLANIFICATION
# ===========================================================================
h1("Chapitre 3 — Méthodologie et planification du projet")

h2("3.1 Présentation de Scrum et adaptation individuelle")
p("Scrum est un cadre de travail itératif et incrémental structuré autour de "
  "sprints de durée fixe, d'un backlog priorisé et de trois responsabilités : "
  "Product Owner, Scrum Master et Developer [7]. Dans le cadre d'un projet "
  "individuel, ces trois responsabilités sont assumées par la même personne. "
  "Il s'agit donc d'une adaptation volontaire de Scrum, et non d'une équipe "
  "Scrum classique : les cérémonies sont conservées dans leur logique mais "
  "réduites à leur dimension de discipline personnelle.")
p("Cette adaptation présente un avantage et un risque. L'avantage est la "
  "réactivité : la décision fonctionnelle, l'organisation technique et "
  "l'implémentation sont prises sans délai de coordination. Le risque est "
  "l'absence de regard extérieur sur les choix effectués ; la revue de sprint "
  "et les tests automatisés prennent alors une importance particulière, car "
  "ils remplacent partiellement la critique collective.")
table(["Rôle Scrum", "Responsabilité", "Traduction dans WatchTower"], [
    ("Product Owner", "Définition des besoins et priorités",
     "Backlog produit, choix du périmètre fonctionnel, priorisation des "
     "fonctions de gestion des projets et des tâches."),
    ("Scrum Master", "Organisation et suivi de la méthode",
     "Découpage en cinq sprints plus une semaine de livraison, suivi des "
     "jalons, tenue des cérémonies adaptées."),
    ("Developer", "Conception, développement et tests",
     "Réalisation du frontend React, de l'API Express, des migrations SQL, "
     "de la suite Vitest/Supertest et des diagrammes."),
], widths=[3.0, 4.7, 7.7], fontsize=9.0,
   caption="Tableau 3.1 — Répartition des responsabilités Scrum individuelles")

h2("3.2 Product Backlog")
p("Le backlog suivant est reconstitué à partir des modules effectivement "
  "livrés. L'estimation est exprimée en semaines de travail et la priorité "
  "relative est donnée à titre de planification prévisionnelle.")
table(["ID", "Fonctionnalité", "Description", "Priorité", "Estimation", "Sprint"], [
    ("PB-01", "Socle projet", "Configuration Node/Vite, scripts, environnement, migrations.",
     "Haute", "1 s.", "S1"),
    ("PB-02", "Modélisation", "Schéma SQL, diagrammes UML et matrice de traçabilité.",
     "Haute", "1 s.", "S1"),
    ("PB-03", "Authentification", "Inscription, connexion, JWT, refresh haché, déconnexion.",
     "Haute", "1 s.", "S2"),
    ("PB-04", "RBAC", "Rôles globaux et rôles projet, gardes sur les routeurs.",
     "Haute", "1 s.", "S2"),
    ("PB-05", "Dashboard", "KPI, activité, tâches et projets accessibles.",
     "Moyenne", "1 s.", "S3"),
    ("PB-06", "Projets", "CRUD, archivage, dates, progression calculée.",
     "Haute", "2 s.", "S3"),
    ("PB-07", "Membres", "Ajout, retrait, rôles projet, notifications d'invitation.",
     "Haute", "1 s.", "S3–S4"),
    ("PB-08", "Tâches", "CRUD, priorités, statuts, soft delete, commentaires.",
     "Haute", "2 s.", "S4"),
    ("PB-09", "Kanban", "Vue par colonnes de statut et changement par glisser-déposer.",
     "Haute", "1 s.", "S4"),
    ("PB-10", "Notifications", "Types, préférences, dédup, compteur non lus.",
     "Moyenne", "1 s.", "S4"),
    ("PB-11", "Synthèses", "Rapports, calendrier, timeline, fil d'activité.",
     "Moyenne", "1 s.", "S4"),
    ("PB-12", "Préférences", "Langue FR/EN, thème clair/sombre, préférences de notification.",
     "Moyenne", "1 s.", "S4"),
    ("PB-13", "Tests", "Suite Vitest/Supertest, validation API et RBAC.",
     "Haute", "2 s.", "S5"),
    ("PB-14", "Documentation", "Rapport technique, diagrammes, annexes.",
     "Moyenne", "2 s.", "S5"),
    ("PB-15", "Livraison", "Vérification finale et préparation de la soutenance.",
     "Haute", "1 s.", "S12"),
], widths=[1.5, 2.6, 7.3, 1.6, 1.6, 1.4], fontsize=8.3,
   caption="Tableau 3.2 — Product Backlog")

h2("3.3 Sprint Planning")
p("Le découpage ci-dessous est une planification prévisionnelle en semaines "
  "relatives. Aucune date calendaire n'est supposée : les semaines S1 à S12 "
  "sont des repères d'ordonnancement, cohérents avec les figures 7.1 et 7.2.")
table(["Sprint", "Période", "Objectif", "Livrables attendus"], [
    ("Sprint 1", "Semaines 1–2", "Analyse, conception et configuration",
     "Cahier des charges fonctionnel, schéma relationnel, diagrammes UML, "
     "socle Node/Vite et migrations initiales."),
    ("Sprint 2", "Semaines 3–4", "Authentification et dashboard initial",
     "Endpoints /auth, cookies sécurisés, gardes RBAC, première version du "
     "tableau de bord."),
    ("Sprint 3", "Semaines 5–6", "Gestion des projets",
     "CRUD projets, gestion des membres, archivage, calcul de progression, "
     "pages React correspondantes."),
    ("Sprint 4", "Semaines 7–9", "Gestion des tâches et équipes",
     "CRUD tâches, tableau Kanban, commentaires, notifications, calendrier, "
     "timeline, rapports et préférences."),
    ("Sprint 5", "Semaines 10–11", "Tests, amélioration et finalisation",
     "Suite de tests d'intégration, corrections, validation du build et du lint, "
     "rédaction du rapport."),
    ("Livraison", "Semaine 12", "Rapport, diagrammes et présentation",
     "Versions DOCX et PDF du rapport, exports des diagrammes, dossier de "
     "captures et support de soutenance."),
], widths=[2.2, 2.8, 4.6, 5.8], fontsize=8.6,
   caption="Tableau 3.3 — Planification des sprints")
p("Les sprints 1 et 2 posent les fondations : spécification, modélisation et "
  "socle de sécurité avant toute donnée métier. Les sprints 3 et 4 livrent le "
  "domaine fonctionnel — projets, membres, tâches, Kanban, commentaires, "
  "notifications et vues de synthèse — avec les chevauchements indiqués dans "
  "le Gantt de la figure 7.1.")
p("Le sprint 5 bascule sur la vérification (Vitest/Supertest, cas limites, "
  "soft delete, déduplication) et la consolidation du rapport. La semaine de "
  "livraison finalise les diagrammes, le document Word, son export PDF et le "
  "support de présentation.")

h2("3.4 Activités Scrum")
h3("Product Backlog")
p("Le backlog est maintenu comme une liste ordonnée d'éléments décrivant un "
  "résultat observable. Sa priorisation tient compte des dépendances "
  "techniques : l'authentification précède le contrôle d'accès, qui précède "
  "lui-même la gestion des projets.")
h3("Sprint Planning")
p("En début de sprint, les éléments du backlog retenus sont détaillés en "
  "tâches, puis estimés. En adaptation individuelle, cette étape joue aussi "
  "le rôle d'auto-engagement : la charge est dimensionnée pour rester "
  "réaliste compte tenu des autres obligations de l'étudiant.")
h3("Daily Scrum adapté")
p("Le daily est remplacé par un point quotidien de 10 à 15 minutes : état "
  "des tâches, obstacle éventuel, décision du jour. Sa fonction est de "
  "rendre explicite ce qui pourrait rester implicite dans un travail solitaire.")
h3("Sprint Review")
p("En fin de sprint, les fonctionnalités livrées sont confrontées au backlog. "
  "Les captures d'écran du dossier Screenshots constituent les preuves "
  "fonctionnelles de cette revue : chaque scénario QA est associé à une "
  "image nommée de manière explicite (connexion, création de projet, Kanban, "
  "notifications, etc.).")
h3("Sprint Retrospective")
p("La rétrospective identifie les ajustements méthodologiques : découpage "
  "plus fin des tâches, ajout de tests sur les cas limites ou clarification "
  "des règles de rôle. Les difficultés documentées au chapitre 9 en sont le "
  "reflet synthétique.")

# ===========================================================================
# CHAPITRE 4 — CONCEPTION ET MODÉLISATION
# ===========================================================================
h1("Chapitre 4 — Conception et modélisation du système")

h2("4.1 Architecture générale")
p("L'architecture vérifiée dans le dépôt correspond au modèle client-serveur "
  "pressenti : le navigateur exécute une application React servie par Vite, "
  "qui communique en HTTP avec une API REST Express au format JSON, laquelle "
  "adresse une base MySQL 8 par le pilote mysql2. En production, le serveur "
  "Express dessert également les fichiers compilés du frontend. Le point "
  "d'entrée est server/src/app.js, qui enregistre les middlewares puis monte "
  "les routeurs sous /api/v1.")
figure(EXPORT / "figure_4_1_architecture.png",
       "Figure 4.1 — Architecture technique globale de WatchTower", 16.4)
table(["Composant", "Responsabilité", "Localisation"], [
    ("Interface React", "Pages et composants, gardes de rôle côté client, "
     "formulaires, thèmes et traductions.", "client/src/App.jsx, client/src/features/"),
    ("apiClient / watchtowerApi", "Appels fetch avec credentials, gestion du "
     "repli 401 et rafraîchissement, wrappers d'endpoints.", "client/src/services/"),
    ("Express app", "Helmet, CORS, garde d'origine, JSON, limiteurs, montage "
     "des routeurs, /health.", "server/src/app.js"),
    ("Middlewares", "authenticate, requireRoles, validate (Zod), gestion "
     "d'erreurs et 404.", "server/src/middleware/, server/src/utils/"),
    ("Routeurs métier", "auth, users, projects, tasks/comments, notifications, "
     "insights.", "server/src/modules/"),
    ("Services", "authService, accessControl, notificationService, "
     "deadlineService.", "server/src/services/"),
    ("Repositories", "Requêtes SQL paramétrées, agrégats, tris en liste blanche.",
     "server/src/repositories/"),
    ("Pool MySQL", "Connexion, fuseau UTC, lecture des DATE en chaînes.",
     "server/src/database/pool.js"),
    ("Migrations", "Quatre scripts SQL versionnés et table de suivi "
     "schema_migrations.", "server/src/database/migrations/"),
], widths=[3.4, 7.6, 4.4], fontsize=8.5,
   caption="Tableau 4.1 — Composants de l'architecture et responsabilités")

h2("4.2 Diagramme global de classes UML")
p("Le dépôt ne contient pas de classes métier déclarées : il n'y a ni ORM ni "
  "modèles orientés objet côté serveur. Le diagramme de la figure 4.2 doit "
  "donc être lu comme un modèle de classes du domaine, dont les attributs "
  "sont dérivés des migrations SQL et des sérialiseurs, et dont les "
  "comportements sont portés par les services et repositories. Aucune "
  "opération n'a été ajoutée artificiellement et aucune relation "
  "d'héritage n'est représentée, car le code n'en déclare aucune.")
figure(EXPORT / "figure_4_3_classes.png",
       "Figure 4.2 — Modèle de classes du domaine (classes persistantes)", 15.0)
p("Trois classes principales structurent le domaine. User porte l'identité, "
  "le rôle global, les préférences de langue, de thème et de notification. "
  "Project porte l'état du projet, ses dates, son propriétaire et la date "
  "d'archivage. Task porte le statut, la priorité, le responsable, le "
  "créateur, l'échéance et la date de suppression logique. ProjectMember "
  "matérialise l'association many-to-many entre User et Project avec un rôle "
  "projet. Comment, Notification et ActivityLog complètent le domaine "
  "fonctionnel ; UserSession, PasswordResetToken et AuditLog relèvent du "
  "domaine technique de la sécurité et de la traçabilité.")

h2("4.3 Schéma de la base de données")
p("La base comprend dix tables fonctionnelles déclarées dans les migrations "
  "001 à 004, auxquelles s'ajoute la table de suivi schema_migrations créée "
  "par le runner. Toutes les clés primaires sont des BIGINT auto-incrémentés, "
  "le moteur est InnoDB et l'encodage utf8mb4_unicode_ci. La figure 4.3 "
  "représente l'intégralité des tables et de leurs relations.")
figure(EXPORT / "figure_4_4_erd.png",
       "Figure 4.3 — Schéma relationnel MySQL (10 tables)", 16.4)
table(["Table", "Rôle", "Particularités"], [
    ("users", "Identités et rôles globaux", "email unique ; ENUM de 3 rôles ; "
     "préférences JSON ajoutées en 002."),
    ("projects", "Projets et archivage", "owner_id RESTRICT ; 5 statuts ; "
     "archived_at ; aucune suppression logique."),
    ("project_members", "Association projet-utilisateur", "UNIQUE(project_id,user_id) ; "
     "rôle MANAGER ou MEMBER."),
    ("tasks", "Tâches du projet", "4 statuts, 4 priorités ; assignee_id SET NULL ; "
     "deleted_at ajouté en 004."),
    ("comments", "Commentaires de tâche", "auteur RESTRICT ; deleted_at ; "
     "contenu 1 à 5000 caractères via Zod."),
    ("notifications", "Notifications utilisateur", "payload JSON ; clé de dédup "
     "UNIQUE(user_id, dedup_key) ; référence polymorphe sans FK."),
    ("activity_logs", "Journal fonctionnel", "acteur SET NULL ; projet et tâche "
     "en cascade ; 10 types d'actions."),
    ("password_reset_tokens", "Jetons de réinitialisation", "hash SHA-256 ; "
     "expires_at et used_at."),
    ("user_sessions", "Sessions de rafraîchissement", "token_hash CHAR(64) unique ; "
     "expires_at, revoked_at, last_used_at."),
    ("audit_logs", "Journal de sécurité", "details JSON ; acteur SET NULL ; "
     "aucun endpoint de lecture."),
], widths=[3.3, 4.0, 8.1], fontsize=8.4,
   caption="Tableau 4.2 — Tables de la base de données et rôles")
table(["Relation", "Cardinalité", "Clé étrangère", "Suppression"], [
    ("users → projects (propriétaire)", "1 : 0..N", "projects.owner_id", "RESTRICT"),
    ("users ↔ projects (membres)", "N : M", "project_members", "CASCADE"),
    ("projects → tasks", "1 : 0..N", "tasks.project_id", "CASCADE"),
    ("users → tasks (assigné)", "1 : 0..N (optionnel)", "tasks.assignee_id", "SET NULL"),
    ("users → tasks (créateur)", "1 : 0..N", "tasks.created_by", "RESTRICT"),
    ("tasks → comments", "1 : 0..N", "comments.task_id", "CASCADE"),
    ("users → comments (auteur)", "1 : 0..N", "comments.author_id", "RESTRICT"),
    ("users → notifications", "1 : 0..N", "notifications.user_id", "CASCADE"),
    ("users → user_sessions", "1 : 0..N", "user_sessions.user_id", "CASCADE"),
    ("users → password_reset_tokens", "1 : 0..N", "password_reset_tokens.user_id", "CASCADE"),
    ("users / projects / tasks → activity_logs", "0..1 : 0..N", "acteur / projet / tâche",
     "SET NULL / CASCADE"),
    ("users → audit_logs", "0..1 : 0..N", "audit_logs.actor_id", "SET NULL"),
], widths=[5.4, 3.2, 3.9, 2.9], fontsize=8.4,
   caption="Tableau 4.3 — Principales relations et cardinalités")
p("Aucune relation 1:1 n'est déclarée. La relation many-to-many entre "
  "utilisateurs et projets est matérialisée par la table d'association "
  "project_members. La progression d'un projet n'est pas stockée : elle est "
  "recalculée à chaque sérialisation selon la formule "
  "round(tâches terminées / tâches actives × 100), avec 0 lorsqu'aucune tâche "
  "n'existe.")

h2("4.4 Diagrammes de séquence UML")
p("Les cinq scénarios ci-dessous sont construits à partir des appels réels "
  "des routeurs et des services. Les participants sont l'utilisateur, "
  "l'interface React, l'API REST, les middlewares ou services métier lorsque "
  "le code les mobilise, et la base de données. Les flèches pleines "
  "représentent les appels ; les flèches en pointillés les retours.")

h3("4.4.1 Inscription et connexion")
figure(EXPORT / "figure_4_5_sequence_auth.png",
       "Figure 4.4 — Séquence : inscription et connexion", 13.0)
p("L'inscription valide le schéma Zod, refuse un doublon d'e-mail, hache le "
  "mot de passe avec bcrypt (12 rounds en configuration normale) et insère "
  "un utilisateur avec le rôle TEAM_MEMBER, quel que soit le rôle éventuellement "
  "transmis par le client. La connexion recharge l'utilisateur, vérifie le "
  "hash, écrit un audit LOGIN_SUCCESS, crée une session de rafraîchissement "
  "dont seul le hash SHA-256 est conservé, puis pose les cookies wt_access "
  "et wt_refresh. Aucun jeton n'est renvoyé dans le corps JSON.")

h3("4.4.2 Création d'un projet")
figure(EXPORT / "figure_4_6_sequence_projet.png",
       "Figure 4.5 — Séquence : création d'un projet", 13.0)
p("La création passe par authenticate puis requireRoles(['ADMIN',"
  "'PROJECT_MANAGER']). Le schéma Zod contrôle la longueur du nom, la plage "
  "des dates et l'énumération de statut ; le statut ARCHIVED est refusé à la "
  "création. La transaction insère le projet, ajoute le créateur comme membre "
  "MANAGER et écrit une activité PROJECT_CREATED.")

h3("4.4.3 Création et attribution d'une tâche")
figure(EXPORT / "figure_4_7_sequence_tache.png",
       "Figure 4.6 — Séquence : création et attribution d'une tâche", 13.0)
p("Après vérification du droit canManage et de l'absence d'archivage, le "
  "routeur contrôle que le responsable désigné est un utilisateur actif et "
  "un membre du projet, sauf s'il en est le propriétaire. L'insertion de la "
  "tâche, l'activité TASK_CREATED et la notification TASK_ASSIGNED "
  "appartiennent à la même transaction.")

h3("4.4.4 Modification du statut d'une tâche")
figure(EXPORT / "figure_4_8_sequence_statut.png",
       "Figure 4.7 — Séquence : modification du statut d'une tâche", 13.0)
p("Tout membre du projet peut modifier le statut, y compris par la route "
  "dédiée PATCH /tasks/:id/status. Si le statut demandé est identique au "
  "statut courant, aucune activité ni notification n'est produite. Sinon, "
  "completed_at est positionné pour DONE et remis à null pour tout autre "
  "statut ; une notification est envoyée au propriétaire et aux managers du "
  "projet, hors acteur et selon la préférence statusChange.")

h3("4.4.5 Consultation du tableau de bord")
figure(EXPORT / "figure_4_9_sequence_dashboard.png",
       "Figure 4.8 — Séquence : consultation du tableau de bord", 13.0)
p("DashboardPage déclenche plusieurs appels parallèles vers /projects, "
  "/tasks, /reports/summary et /activity, avec une limite de 100 éléments "
  "pour éviter une troncature des vues globales. Le serveur applique la "
  "visibilité propre à l'utilisateur, puis calcule les indicateurs : "
  "totaux, terminées, en attente, en retard, progression globale et "
  "répartitions par statut et priorité.")

h2("4.5 Diagrammes complémentaires")
p("L'architecture de la figure 4.1 remplit déjà le rôle de vue des "
  "composants et de vue de déploiement logique : elle montre le navigateur, "
  "le serveur Vite en développement ou le serveur Express en production, le "
  "pool de connexions MySQL et la base. Aucun diagramme de déploiement "
  "supplémentaire n'est ajouté, car le dépôt ne contient pas de "
  "configuration d'hébergement, de conteneur ou d'infrastructure cloud "
  "déployée. Les choix d'infrastructure restent donc à confirmer.")

# ===========================================================================
# CHAPITRE 5 — RÉALISATION TECHNIQUE
# ===========================================================================
h1("Chapitre 5 — Réalisation technique")

h2("5.1 Environnement de développement")
p("L'environnement est déduit des fichiers de configuration et des scripts "
  "du dépôt. Le projet requiert Node.js 20 ou supérieur et npm 10 ou "
  "supérieur, avec MySQL 8 pour la base de développement et une base "
  "distincte pour les tests. Les scripts npm centralisent le démarrage, la "
  "compilation, le lint, les tests, les migrations et l'amorçage de données "
  "de démonstration.")
p("Le tableau 5.1 distingue les outils dont l'usage est confirmé par les "
  "artefacts de ceux dont aucune trace n'a été trouvée. Cette distinction "
  "répond à l'exigence de ne pas attribuer à l'étudiant un outil qu'il n'a "
  "pas nécessairement employé. Les diagrammes du présent rapport ont été "
  "produits pour l'occasion par des scripts Python générant du SVG, puis "
  "rasterisés avec le navigateur Chrome en mode headless ; leurs sources sont "
  "conservées dans docs/report/diagrams/source/.")
table(["Outil", "Statut vérifié", "Élément de preuve ou réserve"], [
    ("Node.js et npm", "Confirmé", "Engines du README, scripts package.json, "
     "dépendances installées."),
    ("MySQL 8", "Confirmé", "Migrations SQL, pilote mysql2, configuration DB_NAME "
     "et TEST_DB_NAME."),
    ("Git / GitHub", "À confirmer", "Fichiers de configuration présents, mais le "
     "dossier analysé n'est pas un dépôt Git actif ; aucun historique de commits "
     "n'est consultable."),
    ("Éditeur de code (VS Code ou autre)", "À confirmer", "Aucun fichier de "
     "configuration d'éditeur propre au projet dans le dossier livré."),
    ("Antigravity, Google AI Studio, Figma", "Non confirmé", "Aucune trace "
     "d'utilisation dans les artefacts ; ces outils ne sont pas présentés "
     "comme employés."),
    ("Postman", "Non confirmé", "Aucune collection ni fichier d'environnement "
     "Postman dans le dépôt ; les tests API sont implémentés en Supertest."),
    ("Draw.io, PlantUML, Mermaid", "Non confirmé", "Aucun fichier source de "
     "diagramme issu de ces outils ; les sources du rapport sont des scripts Python."),
    ("Chrome headless", "Confirmé pour le rapport", "Utilisé uniquement pour "
     "rasteriser les SVG en PNG haute résolution."),
], widths=[4.0, 3.0, 8.4], fontsize=8.4,
   caption="Tableau 5.1 — Outils : statut de vérification")

h2("5.2 Technologies utilisées")
p("Le tableau 5.2 liste les dépendances réellement déclarées dans le fichier "
  "package.json unique, à la racine du projet. Les versions indiquées "
  "correspondent aux contraintes de ce fichier.")
table(["Composant", "Technologie", "Utilisation observée"], [
    ("Frontend", "React 19.3.1", "Composants, contexte d'authentification, "
     "navigation et pages fonctionnelles."),
    ("Routage frontend", "react-router-dom 7.18.6", "Routes publiques et "
     "protégées, gardes de rôle, redirections."),
    ("Compilation frontend", "Vite 8.3.8", "Serveur de développement et "
     "génération des fichiers statiques."),
    ("Styles", "Tailwind CSS 4.1.12", "Classes utilitaires, thèmes clair et "
     "sombre, mise en page responsive."),
    ("Icônes et animations", "lucide-react, motion", "Icônes d'interface et "
     "transitions visuelles."),
    ("Langage", "JavaScript (ES modules)", "Fichiers .jsx et .js sur les deux "
     "couches."),
    ("Environnement serveur", "Node.js", "Exécution du serveur Express et des "
     "scripts de migration."),
    ("Framework backend", "Express 5.1.0", "Routeurs HTTP, middlewares, "
     "servage des fichiers compilés."),
    ("Base de données", "MySQL 8 / mysql2 3.24.6", "Stockage relationnel et "
     "requêtes paramétrées."),
    ("Validation", "Zod 4.6.7", "Schémas de params, query et body centralisés."),
    ("Authentification", "jsonwebtoken 9, bcryptjs 3", "JWT HS256 et hachage "
     "des mots de passe."),
    ("Sécurité HTTP", "helmet 8, cors 2.8, express-rate-limit 8", "En-têtes, "
     "origines autorisées et limitation de débit."),
    ("Tests", "Vitest 4, Supertest 7, jsdom 27", "Tests de fondation et "
     "d'intégration API."),
    ("Qualité de code", "ESLint 9, eslint-plugin-react-hooks", "Script npm run lint."),
    ("Variables d'environnement", "dotenv 18, cross-env 10", "Configuration "
     "par .env et scripts multi-environnements."),
    ("API et format", "REST / JSON", "Préfixe /api/v1, enveloppe "
     "{ success, data, meta } ou { success, error }."),
    ("Génération du rapport", "python-docx, Chrome headless", "Création du "
     "document Word et rasterisation des diagrammes SVG du rapport."),
], widths=[3.4, 4.3, 7.7], fontsize=8.2,
   caption="Tableau 5.2 — Technologies effectivement présentes dans package.json")

h2("5.3 Réalisation du frontend")
p("L'application React est organisée en couches. Le composant App.jsx "
  "définit les fournisseurs de contexte (ThemeProvider, I18nProvider, "
  "AuthProvider), le BrowserRouter et l'ensemble des routes. Le dossier "
  "components/ contient la coque applicative (AppShell) et les composants "
  "d'interface génériques, tandis que le dossier features/ regroupe les "
  "domaines fonctionnels : auth, dashboard, projects, tasks, calendar, "
  "timeline, reports, team, notifications et settings.")
p("La protection des pages est centralisée dans ProtectedShell. Lors du "
  "chargement de l'état d'authentification, un squelette de chargement est "
  "affiché ; un utilisateur non authentifié est redirigé vers /login, et un "
  "utilisateur dont le rôle n'appartient pas à allowedRoles est redirigé vers "
  "l'accueil. C'est le cas de la route /team, réservée à ADMIN et "
  "PROJECT_MANAGER — cohérent avec la capture de la figure 5.12. Les routes "
  "publiques /login, /register, /forgot-password et /reset-password utilisent "
  "PublicOnlyRoute et renvoient un utilisateur déjà connecté vers l'accueil.")
table(["Route frontend", "Garde", "Composant"], [
    ("/login, /register", "PublicOnlyRoute", "LoginPage, RegisterPage"),
    ("/forgot-password, /reset-password", "PublicOnlyRoute", "PasswordResetPages"),
    ("/", "ProtectedShell", "DashboardPage"),
    ("/projects, /projects/:projectId", "ProtectedShell", "ProjectsPage, ProjectDetailPage"),
    ("/tasks", "ProtectedShell", "MyTasksPage"),
    ("/kanban", "ProtectedShell", "KanbanPage"),
    ("/calendar, /timeline, /reports", "ProtectedShell", "CalendarPage, TimelinePage, ReportsPage"),
    ("/team", "ProtectedShell + ADMIN/PROJECT_MANAGER", "TeamPage"),
    ("/notifications, /settings", "ProtectedShell", "NotificationsPage, SettingsPage"),
], widths=[5.2, 5.1, 5.1], fontsize=8.5,
   caption="Tableau 5.3 — Routes frontend et gardes associés")
p("La communication avec l'API est encapsulée dans apiClient.js, qui utilise "
  "fetch avec credentials: 'include' afin d'envoyer les cookies HttpOnly. En "
  "cas de réponse 401, le client tente un rafraîchissement avant de rejouer "
  "la requête, ce qui met en œuvre le repli décrit au chapitre 4. Le module "
  "watchtowerApi.js fournit les fonctions d'appel par domaine. Les "
  "formulaires s'appuient sur les états React et sur les messages d'erreur "
  "renvoyés par le serveur ; les données sont affichées sous forme de listes, "
  "de cartes, de tableaux ou de vues calendrier selon le module. Le contexte "
  "I18nContext gère la langue et ThemeContext le thème, tous deux persistés "
  "via les préférences utilisateur.")

h2("5.4 Réalisation du backend")
p("Le serveur est structuré en modules. server/src/app.js configure la pile "
  "de middlewares dans un ordre significatif : Helmet, CORS avec "
  "credentials, garde de vérification de l'origine pour les méthodes "
  "mutantes, parseur JSON, parseur de cookies, limiteurs de débit, puis "
  "montage des routeurs. server/src/server.js gère le démarrage, la "
  "connexion à la base, le balayage des échéances, le serveur Vite en "
  "développement et l'arrêt gracieux.")
p("Les routeurs mettent en œuvre le contrôle d'accès. authenticate résout "
  "l'utilisateur courant à partir du cookie d'accès ou, à défaut, d'une "
  "session de rafraîchissement active ; requireRoles vérifie le rôle issu de "
  "la base et non celui du JWT, si bien qu'un changement de rôle prend effet "
  "immédiatement. Le service accessControl.js centralise les prédicats "
  "canView, canManage, canChangeStatus et les refus liés à l'archivage. "
  "validate.js applique les schémas Zod et expose les valeurs parsées dans "
  "req.valid.")
p(" Les domaines sont répartis comme suit : auth (8 endpoints), users (9), "
  "projects (9), tasks et comments (12), notifications (4), insights (4), "
  "auxquels s'ajoute le endpoint public /health. Les services portent la "
  "logique transversale : création et rotation des sessions, décisions "
  "d'autorisation, génération de notifications et balayage des échéances. "
  "Les repositories concentrent les requêtes SQL paramétrées et les listes "
  "blanches de tris, ce qui évite l'injection SQL via sortBy. Les erreurs "
  "sont normalisées par errorHandler.js en codes stables (VALIDATION_ERROR, "
  "UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, "
  "UNPROCESSABLE_ENTITY, TOO_MANY_*, DATABASE_UNAVAILABLE) sans exposer "
  "de requête SQL, de pile d'exécution ni de nom de base.")

h2("5.5 Réalisation de la base de données")
p("La connexion est assurée par un pool mysql2 qui force le fuseau UTC sur "
  "chaque session afin que CURRENT_TIMESTAMP et UTC_TIMESTAMP() soient "
  "cohérents. Les colonnes DATE sont lues comme des chaînes AAAA-MM-JJ, "
  "format attendu par les schémas Zod pour start_date et due_date. Le runner "
  "de migrations applique les fichiers SQL dans l'ordre alphabétique et "
  "enregistre leur version dans schema_migrations.")
p("Quatre migrations se succèdent. La 001 crée le socle relationnel et huit "
  "tables. La 002 ajoute les préférences de notification, le champ payload "
  "des notifications et la table user_sessions. La 003 ajoute quatre index "
  "de performance. La 004 introduit tasks.deleted_at et la table audit_logs. "
  "Les contraintes d'intégrité sont principalement portées par les clés "
  "étrangères et les index uniques : email, couple projet/utilisateur, hash "
  "de session et clé de déduplication des notifications. Aucune contrainte "
  "CHECK explicite n'est déclarée ; les domaines de valeurs sont assurés par "
  "les ENUM et par la validation Zod.")

h2("5.6 Intégration frontend/backend")
p("Un exemple représentatif de requête est la création d'une tâche. Le "
  "client envoie :")
code_block('POST /api/v1/projects/12/tasks\n'
           'Content-Type: application/json\n'
           '{ "title": "Rédiger le cahier des charges", "priority": "HIGH",\n'
           '  "assigneeId": 7, "dueDate": "2027-01-15T17:00:00.000Z" }')
p("Le serveur répond avec l'enveloppe standard, notamment :")
code_block('{ "success": true,\n'
           '  "data": { "id": 41, "projectId": 12, "title": "Rédiger le cahier des charges",\n'
           '           "status": "TODO", "priority": "HIGH", "assigneeId": 7,\n'
           '           "taskCount": 6, "completedTaskCount": 2, "progress": 33 },\n'
           '  "meta": {} }')
p("Les noms de champs ci-dessus reprennent les sérialiseurs du dépôt. Un "
  "second exemple est la consultation des indicateurs :")
code_block('GET /api/v1/reports/summary\n'
           '{ "success": true, "data": {\n'
           '    "totalProjects": 3, "totalTasks": 18, "completedTasks": 7,\n'
           '    "pendingTasks": 11, "overdueTasks": 2, "overallProgress": 39,\n'
           '    "tasksByStatus": { "TODO": 6, "IN_PROGRESS": 5,\n'
           '                       "IN_REVIEW": 0, "DONE": 7 },\n'
           '    "tasksByPriority": { "LOW": 3, "MEDIUM": 8,\n'
           '                         "HIGH": 5, "URGENT": 2 } } }')
p("Ces valeurs numériques sont données à titre d'illustration de la forme "
  "du payload ; elles ne constituent pas un relevé réel de la base de "
  "démonstration. La structure des clés, elle, correspond exactement au "
  "code de reportsRouter.")

h2("5.7 Intégration des captures d'écran")
p("Les douze captures retenues proviennent du dossier Screenshots fourni "
  "(78 fichiers au total). Elles ont été sélectionnées pour couvrir les "
  "principaux modules sans duplication inutile. Leurs légendes décrivent le "
  "scénario QA associé au nom de fichier ; elles ne sont pas utilisées pour "
  "attester d'une fonctionnalité non visible.")

h3("5.7.1 Authentification et interface")
figure(SHOTS / "00_login_page.png",
       "Figure 5.1 — Page de connexion (capture QA 00_login_page)", 10.2)
p("Cette capture illustre l'entrée dans l'application : la page de connexion "
  "est une route publique, accessible avant authentification. Le parcours "
  "qu'elle amorce correspond à POST /auth/login et à la pose des cookies "
  "décrite en figure 4.4.")
figure(SHOTS / "01_login_dark_theme.png",
       "Figure 5.2 — Interface en thème sombre (capture QA 01_login_dark_theme)", 10.2)
p("La capture du thème sombre atteste de la prise en charge de la préférence "
  "preferred_theme. Le choix est conservé dans la table users et reappliqué "
  "au chargement par ThemeContext.")

h3("5.7.2 Tableau de bord et projets")
figure(SHOTS / "02_admin_dashboard.png",
       "Figure 5.3 — Tableau de bord administrateur (capture QA 02_admin_dashboard)", 10.2)
p("Le tableau de bord constitue la vue d'accueil après authentification. Il "
  "consolide les indicateurs obtenus depuis /reports/summary et les listes "
  "chargées en parallèle, conformément à la figure 4.8.")
figure(SHOTS / "03_admin_projects_list.png",
       "Figure 5.4 — Liste des projets (capture QA 03_admin_projects_list)", 10.2)
p("La liste des projets correspond à GET /projects. Pour un administrateur, "
  "la visibilité n'est pas restreinte ; pour les autres rôles, le repository "
  "filtre sur le propriétaire ou l'appartenance au projet.")
figure(SHOTS / "04_admin_new_project_form.png",
       "Figure 5.5 — Formulaire de création de projet (capture QA 04_admin_new_project_form)", 10.2)
p("Le formulaire de création collecte les champs validés ensuite par "
  "createProjectSchema : nom, description, dates et statut. La création est "
  "réservée à ADMIN et PROJECT_MANAGER.")
figure(SHOTS / "08_admin_project_detail.png",
       "Figure 5.6 — Détail d'un projet et gestion des membres (capture QA 08_admin_project_detail)", 10.2)
p("La vue de détail donne accès aux informations du projet et à ses membres. "
  "Elle s'appuie sur GET /projects/:projectId et GET /projects/:projectId/members.")

h3("5.7.3 Tâches et commentaires")
figure(SHOTS / "12_admin_kanban_board.png",
       "Figure 5.7 — Tableau Kanban des tâches (capture QA 12_admin_kanban_board)", 10.2)
p("Le tableau Kanban organise les tâches selon les quatre statuts de l'ENUM. "
  "Le déplacement d'une carte déclenche PATCH /tasks/:id/status, dont la "
  "séquence est donnée en figure 4.7.")
figure(SHOTS / "17_admin_task_comment_posted.png",
       "Figure 5.8 — Commentaire publié sur une tâche (capture QA 17_admin_task_comment_posted)", 10.2)
p("Cette capture montre le résultat d'une publication de commentaire. Le "
  "contenu est validé entre 1 et 5000 caractères et le commentaire est "
  "rattaché à la tâche par comments.task_id.")

h3("5.7.4 Synthèses et notifications")
figure(SHOTS / "21_admin_reports.png",
       "Figure 5.9 — Rapports et agrégats (capture QA 21_admin_reports)", 10.2)
p("La page de rapports exploite les agrégats calculés côté serveur : répartition "
  "par statut et par priorité, totaux et progression. Aucune exportation PDF "
  "ou Excel n'est proposée.")
figure(SHOTS / "24_admin_notifications.png",
       "Figure 5.10 — Centre de notifications (capture QA 24_admin_notifications)", 10.2)
p("Le centre de notifications affiche les événements générés pour "
  "l'utilisateur courant et permet de les marquer comme lus. Le compteur "
  "non lus provient de GET /notifications/unread-count.")

h3("5.7.5 Préférences, rôles et contrôle d'accès")
figure(SHOTS / "29_admin_settings_preferences.png",
       "Figure 5.11 — Préférences utilisateur (capture QA 29_admin_settings_preferences)", 10.2)
p("Les préférences regroupent la langue, le thème et les notifications. "
  "Elles sont persistées par PATCH /users/me/preferences et relues via "
  "/auth/me.")
figure(SHOTS / "67_member_projects_readonly.png",
       "Figure 5.12 — Vue projets en lecture seule pour un membre (capture QA 67_member_projects_readonly)", 10.2)
p("Cette capture illustre la visibilité réduite d'un TEAM_MEMBER : seuls les "
  "projets auxquels il appartient sont accessibles, et les actions de "
  "gestion ne lui sont pas proposées. Elle constitue une preuve visuelle des "
  "règles de RBAC décrites au chapitre 2.")
p("Les autres captures du dossier couvrent notamment la recherche et le "
  "filtrage des projets, la modification des tâches, le calendrier, la "
  "timeline, la sécurité du compte, l'archivage, les trois rôles et la "
  "déconnexion. Elles ne sont pas reproduites ici pour éviter une "
  "illustration redondante.")

# ===========================================================================
# CHAPITRE 6 — TESTS ET VALIDATION QUALITÉ
# ===========================================================================
h1("Chapitre 6 — Tests et validation qualité")

h2("6.1 Stratégie de test")
p("La stratégie observée dans le dépôt repose sur deux niveaux. Les tests de "
  "fondation vérifient les propriétés structurelles de l'API : disponibilité "
  "du service, format uniforme des erreurs, rejet d'un JSON malformé et "
  "présence des en-têtes de sécurité. Les tests d'intégration exercent "
  "l'application Express réelle contre une base MySQL de test, avec des "
  "agents HTTP authentifiés pour représenter les trois rôles.")
p("Cette stratégie privilégie le comportement observable plutôt que les "
  "détails d'implémentation : les assertions portent sur les codes de statut, "
  "la forme des enveloppes JSON, l'état persisté après mutation et "
  "l'inaccessibilité des ressources d'autrui. Aucun test unitaire de composant "
  "React n'est présent dans le dossier livré.")

h2("6.2 Infrastructure de test")
p("La configuration Vitest fixe NODE_ENV=test, désactive le parallélisme des "
  "fichiers et porte des timeouts de 20 et 30 secondes. BCRYPT_ROUNDS est "
  "réduit à 4 pour accélérer les hachages. Avant la suite, prepareDatabase "
  "applique les migrations une seule fois puis vide les tables ; resetData "
  "tronque dix tables avec FOREIGN_KEY_CHECKS désactivé. Chaque test recrée "
  "trois comptes — ADMIN, PROJECT_MANAGER et TEAM_MEMBER — et trois agents "
  "connectés. Le test de limitation de débit construit une application "
  "séparée avec le rate limiting activé, car les limiteurs sont neutralisés "
  "en environnement de test.")
table(["Fichier", "Nombre de cas", "Portée"], [
    ("server/tests/foundation.test.js", "4", "Santé, 404 uniforme, JSON invalide, "
     "en-têtes Helmet."),
    ("server/tests/api.integration.test.js", "25", "API MySQL réelle : authentification, "
     "RBAC, projets, tâches, notifications, audit, limites."),
    ("Total déclaré dans le dépôt", "29", "Décompte statique des appels it( dans les "
     "deux fichiers."),
], widths=[5.4, 2.6, 7.4], fontsize=8.8,
   caption="Tableau 6.1 — Inventaire des tests automatisés")

h2("6.3 Campagne de vérification et résultats")
p("Une campagne de vérification antérieure, consignée dans le suivi du "
  "projet, a reporté la réussite des commandes npm run lint, npm run build et "
  "npm test avec les 29 cas réussis (29/29), ainsi qu'une réponse GET "
  "/api/v1/health indiquant status: ok et la base connectée. Ces résultats "
  "sont rapportés tels quels. L'environnement dans lequel ce rapport a été "
  "produit ne dispose pas d'instance MySQL active : les tests n'ont donc pas "
  "été rejoués ici, et aucun nouveau taux de réussite n'est calculé.")
table(["ID", "Fonctionnalité", "Scénario vérifié", "Résultat attendu",
       "Résultat obtenu", "Statut"], [
    ("T-01", "Santé API", "GET /api/v1/health", "200, service et état base",
     "Conforme (QA : 200, base connectée)", "PASS"),
    ("T-02", "Erreurs", "Endpoint inconnu", "404, code NOT_FOUND",
     "Conforme à l'assertion", "PASS"),
    ("T-03", "Validation", "JSON malformé", "400, code INVALID_JSON",
     "Conforme à l'assertion", "PASS"),
    ("T-04", "Sécurité HTTP", "En-têtes Helmet", "nosniff et SAMEORIGIN",
     "Conforme à l'assertion", "PASS"),
    ("T-05", "Inscription", "Tentative d'injection du rôle ADMIN", "Rôle TEAM_MEMBER",
     "Conforme à l'assertion", "PASS"),
    ("T-06", "Connexion", "Mauvais mot de passe", "Erreur générique, cookies absents",
     "Conforme à l'assertion", "PASS"),
    ("T-07", "Session", "Logout puis refresh", "401", "Conforme à l'assertion", "PASS"),
    ("T-08", "RBAC", "Routes protégées sans cookie", "401", "Conforme à l'assertion", "PASS"),
    ("T-09", "Annuaire", "TEAM_MEMBER appelle /users", "403",
     "Conforme à l'assertion", "PASS"),
    ("T-10", "Préférences", "Persistance langue/thème/préférences", "Valeurs relues",
     "Conforme à l'assertion", "PASS"),
    ("T-11", "Mot de passe", "Changement puis ancien login", "Ancien refusé",
     "Conforme à l'assertion", "PASS"),
    ("T-12", "Projets", "Création puis accès d'un non-membre", "403",
     "Conforme à l'assertion", "PASS"),
    ("T-13", "Dates", "dueDate antérieure à startDate", "422",
     "Conforme à l'assertion", "PASS"),
    ("T-14", "Membres", "Retrait du propriétaire", "422",
     "Conforme à l'assertion", "PASS"),
    ("T-15", "Tâches", "Assigné non membre du projet", "422",
     "Conforme à l'assertion", "PASS"),
    ("T-16", "Statut", "Membre change le statut mais pas le titre", "200 puis 403",
     "Conforme à l'assertion", "PASS"),
    ("T-17", "Progression", "Tâche passée en DONE", "completedAt et progression 100",
     "Conforme à l'assertion", "PASS"),
    ("T-18", "Archivage", "Mutations sur projet archivé", "409",
     "Conforme à l'assertion", "PASS"),
    ("T-19", "Notifications", "Accès crois à une notification", "404",
     "Conforme à l'assertion", "PASS"),
    ("T-20", "Insights", "Summary, activité, timeline, calendrier", "Payloads structurés",
     "Conforme à l'assertion", "PASS"),
    ("T-21", "Pagination", "page=2&limit=2 et limit=500", "Meta cohérent puis 400",
     "Conforme à l'assertion", "PASS"),
    ("T-22", "Refresh", "Rejeu d'un ancien jeton", "401",
     "Conforme à l'assertion", "PASS"),
    ("T-23", "Reset", "Rejeu d'un jeton de réinitialisation", "400",
     "Conforme à l'assertion", "PASS"),
    ("T-24", "Sécurité", "Origin étranger sur mutation", "403",
     "Conforme à l'assertion", "PASS"),
    ("T-25", "Injection", "Recherche avec ' OR 1=1 --", "Traitée comme donnée",
     "Conforme à l'assertion", "PASS"),
    ("T-26", "Limite de débit", "11e échec de connexion", "429 TOO_MANY_LOGIN_ATTEMPTS",
     "Conforme à l'assertion", "PASS"),
    ("T-27", "Soft delete", "Tâche supprimée puis relue", "404 et agrégats mis à jour",
     "Conforme à l'assertion", "PASS"),
    ("T-28", "Déduplication", "Relecture d'échéances le même jour", "Une seule notification",
     "Conforme à l'assertion", "PASS"),
    ("T-29", "Audit", "Événements de connexion et d'administration", "Lignes dans audit_logs",
     "Conforme à l'assertion", "PASS"),
], widths=[1.3, 2.4, 4.8, 3.2, 3.3, 1.4], fontsize=7.6,
   caption="Tableau 6.2 — Campagne de tests récapitulative")
p("Statuts : PASS = assertion vérifiée lors de la campagne reportée ; "
  "FAIL = échec constaté ; NOT TESTED = absence de preuve. Aucun cas n'est "
  "classé FAIL dans le rapport de campagne disponible. Les éléments sans "
  "preuve d'exécution, comme la compatibilité multi-navigateur ou "
  "l'accessibilité automatisée, relèvent de NOT TESTED et n'apparaissent pas "
  "comme PASS dans le tableau.")

h2("6.4 Validation fonctionnelle par captures")
p("Les captures 5.1 à 5.12 constituent une seconde forme de validation : "
  "elles couvrent l'authentification, le thème sombre, le tableau de bord, "
  "la liste et la création de projets, le détail de projet, le Kanban, les "
  "commentaires, les rapports, les notifications, les préférences et la vue "
  "en lecture seule d'un membre. Elles confirment visuellement l'existence "
  "des écrans et des parcours associés, mais ne démontrent pas, à elles "
  "seules, les règles métier internes : celles-ci sont vérifiées par les "
  "tests d'intégration.")

h2("6.5 Limites de la validation")
bullet("Aucun test unitaire de composant React n'est livré.")
bullet("Aucun test de compatibilité entre navigateurs ni d'accessibilité "
       "automatique n'est disponible.")
bullet("Les performances ne font pas l'objet de mesures de charge : seuls "
       "des index et une pagination ont été ajoutés.")
bullet("Les limiteurs de débit étant désactivés en test, le comportement 429 "
       "est vérifié sur une application dédiée, pas sur l'application "
       "utilisée par les autres tests.")
bullet("Les valeurs chiffrées de la campagne sont celles reportées dans le "
       "suivi du projet ; elles n'ont pas été reproduites pendant la rédaction "
       "de ce rapport.")

# ===========================================================================
# CHAPITRE 7 — PLANIFICATION TEMPORELLE
# ===========================================================================
h1("Chapitre 7 — Planification temporelle : Gantt et PERT")

h2("7.1 Décomposition des activités")
p("La décomposition ci-dessous utilise les douze activités A à L déjà "
  "présentes dans les figures 7.1 et 7.2. Les durées sont exprimées en "
  "semaines relatives. Les prédécesseurs définissent un réseau acyclique "
  "dont le calcul est détaillé en 7.3.")
table(["ID", "Désignation", "Durée", "Début", "Fin", "Prédécesseurs", "Livrable"], [
    ("A", "Analyse des besoins et spécification", "1 s.", "S1", "S1", "—",
     "Cahier des charges fonctionnel"),
    ("B", "Conception et modélisation UML/ERD", "1 s.", "S2", "S2", "A",
     "Diagrammes de conception"),
    ("C", "Socle technique, migrations et API", "1 s.", "S3", "S3", "B",
     "Serveur Express + schéma MySQL"),
    ("D", "Authentification, JWT et RBAC", "1 s.", "S4", "S4", "C",
     "Endpoints /auth et gardes"),
    ("E", "Tableau de bord et préférences", "1 s.", "S5", "S5", "D",
     "Dashboard, FR/EN, thèmes"),
    ("F", "Projets et gestion des membres", "2 s.", "S5", "S6", "D",
     "CRUD projets et membres"),
    ("G", "Tâches et tableau Kanban", "2 s.", "S7", "S8", "F",
     "Tâches, statuts, commentaires"),
    ("H", "Calendrier, timeline et rapports", "1 s.", "S7", "S7", "F",
     "Vues de synthèse serveur"),
    ("I", "Tests d'intégration et assurance qualité", "2 s.", "S9", "S10", "E, G, H",
     "Suite Vitest/Supertest + preuves"),
    ("J", "Documentation et rapport technique", "2 s.", "S8", "S9", "H",
     "Rapport, diagrammes, annexes"),
    ("K", "Corrections et durcissement final", "1 s.", "S11", "S11", "I, J",
     "Version candidate validée"),
    ("L", "Livraison et soutenance", "1 s.", "S12", "S12", "K",
     "Livrables finaux"),
], widths=[1.1, 4.4, 1.3, 1.2, 1.2, 2.1, 4.1], fontsize=8.0,
   caption="Tableau 7.1 — Décomposition des activités (WBS)")

h2("7.2 Diagramme de Gantt")
p("Le Gantt de la figure 7.1 représente les douze semaines, les cinq sprints "
  "et la semaine de livraison. Les activités E et F démarrent en parallèle "
  "après l'authentification D ; G et H démarrent après F. Les tests I "
  "recouvrent partiellement la documentation J. Les jalons M1 à M4 "
  "correspondent à la fin du socle authentifié (S4), au MVP fonctionnel "
  "(S8), à la version candidate (S11) et à la livraison (S12).")
figure(EXPORT / "figure_7_1_gantt.png",
       "Figure 7.1 — Diagramme de Gantt prévisionnel sur 12 semaines", 16.4)
p("La lecture du Gantt répond à la question « quand » : elle donne la "
  "période d'exécution de chaque tâche, les chevauchements et les jalons. "
  "Les repères S1 à S12 sont relatifs ; aucune date calendaire n'est "
  "introduite.")

h2("7.3 Diagramme PERT et chemin critique")
p("Le réseau PERT de la figure 7.2 utilise exactement les mêmes durées et "
  "dépendances. Les dates au plus tôt (ES, EF) et au plus tard (LS, LF) sont "
  "calculées par la méthode du chemin critique [8] :")
bullet("ES = maximum des EF des prédécesseurs ; pour une activité sans "
       "prédécesseur, ES = 0.")
bullet("EF = ES + durée.")
bullet("LF = minimum des LS des successeurs ; pour une activité sans "
       "successeur, LF = durée totale du projet.")
bullet("LS = LF − durée ; marge = LS − ES.")
table(["Activité", "Durée", "ES", "EF", "LS", "LF", "Marge", "Critique"], [
    ("A", "1", "0", "1", "0", "1", "0", "Oui"),
    ("B", "1", "1", "2", "1", "2", "0", "Oui"),
    ("C", "1", "2", "3", "2", "3", "0", "Oui"),
    ("D", "1", "3", "4", "3", "4", "0", "Oui"),
    ("E", "1", "4", "5", "7", "8", "3", "Non"),
    ("F", "2", "4", "6", "4", "6", "0", "Oui"),
    ("G", "2", "6", "8", "6", "8", "0", "Oui"),
    ("H", "1", "6", "7", "7", "8", "1", "Non"),
    ("I", "2", "8", "10", "8", "10", "0", "Oui"),
    ("J", "2", "7", "9", "8", "10", "1", "Non"),
    ("K", "1", "10", "11", "10", "11", "0", "Oui"),
    ("L", "1", "11", "12", "11", "12", "0", "Oui"),
], widths=[2.0, 1.7, 1.5, 1.5, 1.5, 1.5, 1.7, 2.0], fontsize=8.8,
   caption="Tableau 7.2 — Calcul CPM : dates au plus tôt/tard et marges")
figure(EXPORT / "figure_7_2_pert.png",
       "Figure 7.2 — Réseau PERT et chemin critique", 16.4)
p("La durée calculée du chemin critique est de 12 semaines, ce qui est "
  "cohérent avec la durée prévisionnelle globale de 12 semaines. Le chemin "
  "critique est A → B → C → D → F → G → I → K → L. Les activités non "
  "critiques disposent d'une marge de 3 semaines pour E et de 1 semaine pour "
  "H et J. Toute autre répartition des marges contredirait les dépendances "
  "déclarées dans le tableau 7.1.")

h2("7.4 Comparaison entre Gantt et PERT")
table(["Critère", "Gantt", "PERT"], [
    ("Objectif", "Planification temporelle", "Analyse des dépendances"),
    ("Représentation", "Barres chronologiques", "Réseau d'activités"),
    ("Durées", "Visibilité des périodes", "Calcul des échéances"),
    ("Dépendances", "Visualisation des relations", "Analyse du chemin critique"),
    ("Utilité", "Suivi du planning", "Analyse des risques temporels"),
], widths=[3.0, 6.0, 6.4], fontsize=8.8,
   caption="Tableau 7.3 — Comparaison Gantt / PERT appliquée à WatchTower")
p("Appliqués à WatchTower, les deux outils ne sont pas redondants. Le Gantt "
  "permet de vérifier la cohérence du découpage en sprints : les activités "
  "F et G occupent deux semaines chacune et s'enchaînent, tandis que E et H "
  "viennent combler les périodes parallèles. Le PERT, lui, révèle que le "
  "chemin critique passe obligatoirement par les tâches et les tests : un "
  "retard de G se répercute directement sur I, K et donc sur la livraison, "
  "alors qu'un retard d'une semaine sur E peut être absorbé par sa marge de "
  "trois semaines.")
p("Le Gantt sert donc au suivi opérationnel hebdomadaire et à la "
  "communication du planning, tandis que le PERT sert à identifier les "
  "activités dont la dérive doit être surveillée en priorité. Leur "
  "complémentarité est renforcée ici par le caractère individuel du projet : "
  "les marges ne correspondent pas à des ressources humaines multiples, mais "
  "à des plages de travail disponibles pour l'étudiant.")

# ===========================================================================
# CHAPITRE 8 — ESTIMATION DES COÛTS ET DES RESSOURCES
# ===========================================================================
h1("Chapitre 8 — Estimation des coûts et des ressources")

h2("8.1 Ressources humaines")
p("Le projet étant individuel, une seule personne assume les trois rôles "
  "Scrum décrits au chapitre 3. Les responsabilités couvrent l'analyse des "
  "besoins, la modélisation, le développement frontend et backend, la "
  "conception des migrations, la rédaction des tests, la vérification "
  "qualitative et la production du rapport. Cette concentration suppose une "
  "charge de travail soutenue sur douze semaines et justifie les "
  "chevauchements d'activités visibles dans le Gantt.")
p("Aucune équipe externe, aucun stagiaire et aucun prestataire n'est "
  "mentionné dans les artefacts du projet. L'estimation financière du temps "
  "est donc une valeur théorique de valorisation du travail, et non le "
  "reflet d'une rémunération effective.")

h2("8.2 Ressources matérielles et logicielles")
p("Les ressources matérielles nécessaires sont un ordinateur capable "
  "d'exécuter Node.js, Vite et un serveur MySQL local, ainsi qu'une "
  "connexion Internet pour l'installation des dépendances et la "
  "consultation de la documentation officielle. Les ressources logicielles "
  "sont toutes des bibliothèques ou des outils distribués librement : Node.js, "
  "npm, React, Vite, Tailwind CSS, Express, MySQL, Zod, Vitest et ESLint. "
  "Le README fournit une procédure de démarrage de MySQL par conteneur Docker, "
  "mais aucun fichier de configuration de déploiement n'est livré.")
p("L'hébergement, le nom de domaine, le certificat TLS, les sauvegardes et la "
  "gestion des secrets restent à définir avant toute mise en production "
  "éventuelle. Aucun coût de ce type n'est engagé dans le projet tel qu'il "
  "a été réalisé.")

h2("8.3 Estimation financière")
p("Le tableau 8.1 distingue trois catégories : les ressources déjà "
  "disponibles et gratuites, le temps de développement valorisé de manière "
  "hypothétique, et les dépenses éventuelles de déploiement non engagées. "
  "La devise retenue pour l'estimation est l'euro (EUR). L'hypothèse de "
  "charge est de 20 heures par semaine sur 12 semaines, soit 240 heures, "
  "valorisées à 15 EUR de l'heure à titre indicatif. Ces chiffres ne "
  "correspondent à aucune facture.")
table(["Ressource", "Quantité", "Coût unitaire", "Coût total"], [
    ("Temps de développement (hypothèse)", "240 h", "15 EUR/h (hyp.)", "3 600 EUR"),
    ("Ordinateur (déjà disponible)", "1", "0 EUR (amorti)", "0 EUR"),
    ("Connexion Internet (déjà disponible)", "1", "0 EUR (hyp.)", "0 EUR"),
    ("Node.js, npm, React, Vite, Tailwind, Express, Zod", "1 lot", "0 EUR (open source)",
     "0 EUR"),
    ("MySQL 8 local ou conteneur Docker", "1", "0 EUR (open source)", "0 EUR"),
    ("Éditeur de code et chrome headless", "1 lot", "0 EUR (hyp.)", "0 EUR"),
    ("Hébergement et nom de domaine (perspective)", "1 an", "à confirmer", "à confirmer"),
    ("Total chiffré hors déploiement", "—", "—", "3 600 EUR"),
], widths=[7.0, 2.6, 3.4, 2.4], fontsize=8.8,
   caption="Tableau 8.1 — Estimation des ressources et coûts")
p("Le total chiffré de 3 600 EUR ne doit pas être interprété comme un budget "
  "dépensé : il valorise le temps de travail selon une hypothèse pédagogique. "
  "Les seules dépenses potentielles concernent un futur déploiement "
  "(hébergement, domaine, certificat, sauvegardes) et ne peuvent être "
  "chiffrées sans choix d'infrastructure, lesquels restent à confirmer.")

# ===========================================================================
# CHAPITRE 9 — DIFFICULTÉS ET AMÉLIORATIONS
# ===========================================================================
h1("Chapitre 9 — Difficultés rencontrées et améliorations")

h2("9.1 Difficultés rencontrées")
p("Les difficultés ci-dessous sont celles qui ressortent objectivement des "
  "artefacts livrés : choix de conception, mécanismes de sécurité et limites "
  "explicitement documentées. Elles ne sont pas présentées comme des "
  "anecdotes de travail non attestées.")
bullet("Conception de l'architecture : répartir les responsabilités entre "
       "composants React, routeurs Express, services et repositories sans "
       "dupliquer la logique d'autorisation.")
bullet("Cohérence du contrôle d'accès : distinguer les trois rôles globaux "
       "des deux rôles projet, tout en garantissant qu'un chef de projet ne "
       "gère que les projets qu'il possède ou dont il est manager.")
bullet("Sécurité de l'authentification : concilier un JWT d'accès à courte "
       "durée, une session de rafraîchissement hachée et révoquable, et un "
       "repli automatique en cas d'expiration sans provoquer de courses "
       "entre requêtes concurrentes.")
bullet("Intégrité après suppression : la suppression logique des tâches "
       "doit les retirer des listes, du détail, des agrégats et des "
       "échéances, tout en conservant commentaires et journal d'activité.")
bullet("Notifications d'échéance : éviter les doublons lors de lectures "
       "répétées ou du balayage horaire, et respecter les préférences "
       "utilisateur sans notifier l'acteur d'une action.")
bullet("Validation et erreurs : maintenir des schémas Zod cohérents sur "
       "toutes les routes et normaliser les réponses d'erreur sans exposer "
       "d'information de base de données.")
bullet("Contrainte propre au travail individuel : assurer simultanément les "
       "rôles de Product Owner, Scrum Master et Developer, et compenser "
       "l'absence de revue collective par des tests automatisés.")

h2("9.2 Solutions apportées")
table(["Difficulté", "Solution réellement mise en œuvre", "Localisation"], [
    ("Autorisation dispersée", "Centralisation des prédicats canView, canManage, "
     "canChangeStatus et des refus d'archivage dans un service unique.",
     "server/src/services/accessControl.js"),
    ("Rôle du JWT obsolète", "Rechargement de l'utilisateur en base à chaque "
     "requête ; les décisions lisent req.user.role issu de la base.",
     "services/authService.js, middleware/auth.js"),
    ("Rotation du refresh", "Révocation de l'ancien hash et création du nouveau "
     "dans une transaction ; le repli d'accès ne fait pas tourner le refresh.",
     "modules/auth/auth.routes.js, services/authService.js"),
    ("Cohérence du soft delete", "Filtre deleted_at IS NULL sur lectures, agrégats "
     "et échéances ; conservation des commentaires et activités.",
     "repositories/, modules/tasks/"),
    ("Doublons de notifications", "Clé de déduplication par tâche et par jour UTC "
     "avec INSERT IGNORE et index UNIQUE(user_id, dedup_key).",
     "services/notificationService.js, migration 001"),
    ("Validation hétérogène", "Schémas Zod partagés et middleware validate appliqué "
     "à params, query et body.", "server/src/validation/, utils/validate.js"),
    ("Traçabilité des erreurs", "Gestionnaire d'erreurs normalisé avec codes stables "
     "et journal d'audit sans secrets.", "utils/errors.js, middleware/errorHandler.js, "
     "repositories/auditRepository.js"),
], widths=[3.6, 7.6, 4.2], fontsize=8.2,
   caption="Tableau 9.1 — Difficultés et solutions réellement mises en œuvre")

h2("9.3 Améliorations futures")
p("Les perspectives suivantes sont clairement distinctes de l'existant : "
  "elles ne sont pas implémentées dans le code livré.")
bullet("Déploiement cloud : définir l'hébergement, HTTPS, les sauvegardes et "
       "la gestion des secrets, absents du dépôt.")
bullet("Notifications en temps réel : remplacer la génération à la demande "
       "et le balayage horaire par un canal WebSocket ou Server-Sent Events.")
bullet("Rôles avancés : rendre les permissions configurables au lieu de "
       "s'appuyer sur une énumération fixe de trois rôles globaux.")
bullet("Rapports analytiques et export : ajouter des filtres temporels et "
       "un export PDF ou Excel, aujourd'hui absents du serveur et du client.")
bullet("Machines à états : valider les transitions de statut des projets et "
       "des tâches au lieu d'accepter toute valeur de l'ENUM.")
bullet("Tests automatisés plus complets : tests de composants React, "
       "compatibilité multi-navigateur, accessibilité et mesures de charge.")
bullet("Durcissement de la sécurité : consigner les audits dans une interface "
       "d'administration, ajouter une politique de rétention, envisager la "
       "vérification d'e-mail et l'authentification à deux facteurs.")
bullet("Envoi d'e-mails : remplacer le jeton de réinitialisation exposé en "
       "développement par un fournisseur de messagerie configuré.")

# ===========================================================================
# CHAPITRE 10 — CONCLUSION GÉNÉRALE
# ===========================================================================
h1("Chapitre 10 — Conclusion générale")
p("La problématique de départ portait sur la conception d'une application "
  "web centralisée facilitant la planification, l'organisation et le suivi "
  "de projets informatiques. Le travail réalisé apporte une réponse concrète "
  "sous la forme de WatchTower, application full-stack dont l'audit complet "
  "a constitué le point de départ de ce rapport.")
p("La solution développée couvre les fonctions attendues : authentification "
  "sécurisée, contrôle d'accès par rôles, gestion des projets et des membres, "
  "gestion des tâches et des commentaires, tableau de bord, notifications et "
  "vues de synthèse. L'architecture retenue — React, API REST Express, MySQL "
  "— est vérifiée dans le code et documentée par les diagrammes des figures "
  "4.1 à 4.3 et par les cinq scénarios de séquence des figures 4.4 à 4.8. "
  "La démarche Scrum adaptée, la matrice de traçabilité et la planification "
  "Gantt/PERT à douze semaines assurent la cohérence entre les besoins, le "
  "développement et les livrables.")
p("Sur le plan technique, le projet démontre la maîtrise d'une chaîne "
  "complète : modélisation relationnelle, migrations versionnées, validation "
  "des entrées, sécurité des sessions, transactions, tests d'intégration et "
  "documentation. Sur le plan pédagogique, la conduite individuelle d'un "
  "projet de cette ampleur a imposé une discipline de planification et de "
  "vérification, notamment par des tests automatisés destinés à compenser "
  "l'absence de revue collective.")
p("Les limites demeurent réelles et ont été documentées sans dissimulation : "
  "absence de machine à états pour les transitions, notifications d'échéance "
  "générées à la demande, suppression logique sans restauration, absence "
  "d'export, de messagerie instantanée et de déploiement défini. Autant "
  "d'axes d'évolution réalistes, présentés au chapitre 9 comme des "
  "perspectives et non comme des fonctionnalités accomplies.")
p("En définitive, WatchTower constitue un système cohérent et vérifiable, "
  "dont la valeur principale réside dans la centralisation des données de "
  "projet et dans la qualité de la traçabilité entre le besoin, le code, "
  "les tests et les preuves visuelles réunies dans ce rapport.")

# ===========================================================================
# ANNEXES
# ===========================================================================
h1("Annexes")

h2("Annexe A — Exemples d'endpoints REST")
p("Les endpoints ci-dessous sont reproduits à partir des routeurs du dépôt. "
  "Le préfixe complet est /api/v1.")
table(["Méthode", "Chemin", "Rôle requis", "Effet"], [
    ("POST", "/auth/register", "Public", "Création d'un compte TEAM_MEMBER."),
    ("POST", "/auth/login", "Public", "Cookies wt_access et wt_refresh."),
    ("GET", "/auth/me", "Authentifié", "Utilisateur courant et préférences."),
    ("GET", "/users", "PM ou ADMIN", "Annuaire (champs limités pour PM)."),
    ("POST", "/projects", "ADMIN ou PM", "Création et membre MANAGER."),
    ("GET", "/projects/:projectId", "Membre/propriétaire/ADMIN", "Détail et membres."),
    ("POST", "/projects/:projectId/members", "canManage", "Ajout d'un membre actif."),
    ("POST", "/projects/:projectId/tasks", "canManage", "Tâche et notification d'attribution."),
    ("PATCH", "/tasks/:taskId/status", "Tout membre", "Changement de statut."),
    ("POST", "/tasks/:taskId/comments", "Accès à la tâche", "Commentaire."),
    ("GET", "/notifications/unread-count", "Authentifié", "Compteur de non lus."),
    ("GET", "/reports/summary", "Authentifié", "KPI agrégés."),
    ("GET", "/calendar/events", "Authentifié", "Échéances dans une plage."),
    ("GET", "/timeline/projects", "Authentifié", "Projets et dates."),
    ("GET", "/health", "Public", "État du service et de la base."),
], widths=[2.0, 5.6, 3.8, 4.0], fontsize=8.3,
   caption="Tableau A.1 — Endpoints REST représentatifs")

h2("Annexe B — Extraits SQL significatifs")
p("Extrait de la migration 001 — table d'association des membres :")
code_block("CREATE TABLE project_members (\n"
           "  id BIGINT NOT NULL AUTO_INCREMENT,\n"
           "  project_id BIGINT NOT NULL,\n"
           "  user_id BIGINT NOT NULL,\n"
           "  project_role ENUM('MANAGER','MEMBER') NOT NULL DEFAULT 'MEMBER',\n"
           "  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"
           "  PRIMARY KEY (id),\n"
           "  UNIQUE KEY uq_project_members_pair (project_id, user_id),\n"
           "  CONSTRAINT fk_pm_project FOREIGN KEY (project_id)\n"
           "    REFERENCES projects(id) ON DELETE CASCADE,\n"
           "  CONSTRAINT fk_pm_user FOREIGN KEY (user_id)\n"
           "    REFERENCES users(id) ON DELETE CASCADE\n"
           ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")
p("Extrait de la migration 004 — suppression logique et audit :")
code_block("ALTER TABLE tasks ADD COLUMN deleted_at DATETIME NULL;\n"
           "ALTER TABLE tasks ADD INDEX idx_tasks_deleted_at (deleted_at);\n"
           "CREATE TABLE audit_logs (\n"
           "  id BIGINT NOT NULL AUTO_INCREMENT,\n"
           "  actor_id BIGINT NULL,\n"
           "  action VARCHAR(80) NOT NULL,\n"
           "  details JSON NULL,\n"
           "  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n"
           "  PRIMARY KEY (id),\n"
           "  KEY idx_audit_created_at (created_at),\n"
           "  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)\n"
           "    REFERENCES users(id) ON DELETE SET NULL\n"
           ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")

h2("Annexe C — Extrait de test")
p("Le fragment suivant, fidèle au style des tests d'intégration, illustre la "
  "vérification du refus d'un responsable non membre :")
code_block("it('rejette un responsable qui n’est pas membre du projet', async () => {\n"
           "  const project = await createProjectAs(manager);\n"
           "  const outsider = await createUser('TEAM_MEMBER');\n"
           "  const response = await manager\n"
           "    .post(`/api/v1/projects/${project.id}/tasks`)\n"
           "    .send({ title: 'Tâche de test', assigneeId: outsider.id });\n"
           "  expect(response.status).toBe(422);\n"
           "  expect(response.body.error.code).toBe('UNPROCESSABLE_ENTITY');\n"
           "});")
p("Le code réel du dépôt couvre ce cas dans api.integration.test.js avec la "
  "même structure d'assertion, ainsi que les vingt-huit autres scénarios "
  "récapitulés au tableau 6.2.")

h2("Annexe D — Structure des dossiers")
code_block("WatchTower/\n"
           "├── client/src/\n"
           "│   ├── components/     (layout, ui)\n"
           "│   ├── features/       (auth, dashboard, projects, tasks, calendar,\n"
           "│   │                    timeline, reports, team, notifications, settings)\n"
           "│   ├── i18n/           (contextes et ressources FR/EN)\n"
           "│   ├── services/       (apiClient, watchtowerApi)\n"
           "│   └── styles/         (thèmes, Tailwind)\n"
           "├── server/src/\n"
           "│   ├── app.js, server.js\n"
           "│   ├── config/, middleware/, utils/\n"
           "│   ├── database/       (pool, migrate, seed, migrations/)\n"
           "│   ├── modules/        (auth, users, projects, tasks, notifications, insights)\n"
           "│   ├── repositories/   (requêtes SQL)\n"
           "│   └── services/       (auth, accessControl, notification, deadline)\n"
           "├── server/tests/       (foundation, api.integration, helpers)\n"
           "├── Screenshots/        (78 captures QA)\n"
           "└── docs/report/        (rapport, assets, diagrams/source, diagrams/export)")

h2("Annexe E — Captures d'écran retenues")
table(["Figure", "Fichier source", "Scénario QA"], [
    ("5.1", "00_login_page.png", "Page de connexion"),
    ("5.2", "01_login_dark_theme.png", "Thème sombre"),
    ("5.3", "02_admin_dashboard.png", "Tableau de bord administrateur"),
    ("5.4", "03_admin_projects_list.png", "Liste des projets"),
    ("5.5", "04_admin_new_project_form.png", "Création de projet"),
    ("5.6", "08_admin_project_detail.png", "Détail de projet"),
    ("5.7", "12_admin_kanban_board.png", "Tableau Kanban"),
    ("5.8", "17_admin_task_comment_posted.png", "Commentaire publié"),
    ("5.9", "21_admin_reports.png", "Rapports"),
    ("5.10", "24_admin_notifications.png", "Notifications"),
    ("5.11", "29_admin_settings_preferences.png", "Préférences"),
    ("5.12", "67_member_projects_readonly.png", "Vue membre en lecture seule"),
], widths=[2.2, 6.6, 6.6], fontsize=8.6,
   caption="Tableau A.2 — Captures d'écran retenues et scénarios associés")
p("Toutes les images sont issues du dossier Screenshots du projet. Les "
  "légendes s'appuient sur le nom de fichier attribué lors de la campagne "
  "QA ; aucune capture n'a été générée ni modifiée pour ce rapport.")

# ===========================================================================
# BIBLIOGRAPHIE
# ===========================================================================
h1("Bibliographie")
REFS = [
    ("React — Documentation officielle", "https://react.dev/"),
    ("Node.js — Documentation officielle", "https://nodejs.org/en/docs/"),
    ("Express — Documentation officielle", "https://expressjs.com/fr/"),
    ("MySQL 8.0 Reference Manual", "https://dev.mysql.com/doc/refman/8.0/en/"),
    ("Object Management Group — Unified Modeling Language (UML)",
     "https://www.omg.org/spec/UML/"),
    ("The Scrum Guide", "https://scrumguides.org/"),
    ("MDN Web Docs — Web Technologies", "https://developer.mozilla.org/"),
    ("Vite — Documentation officielle", "https://vite.dev/"),
    ("Tailwind CSS — Documentation officielle", "https://tailwindcss.com/docs"),
    ("React Router — Documentation officielle", "https://reactrouter.com/"),
    ("Zod — Documentation officielle", "https://zod.dev/"),
    ("jsonwebtoken (auth0) — Dépôt officiel", "https://github.com/auth0/node-jsonwebtoken"),
    ("bcryptjs — Dépôt officiel", "https://github.com/dcodeIO/bcrypt.js"),
    ("mysql2 — Dépôt officiel", "https://github.com/sidorares/node-mysql2"),
    ("Helmet — Documentation officielle", "https://helmetjs.github.io/"),
    ("express-rate-limit — Dépôt officiel", "https://github.com/express-rate-limit/express-rate-limit"),
    ("Vitest — Documentation officielle", "https://vitest.dev/"),
    ("Supertest — Dépôt officiel", "https://github.com/ladjs/supertest"),
    ("ESLint — Documentation officielle", "https://eslint.org/docs/latest/"),
    ("Python Docx — Documentation officielle", "https://python-docx.readthedocs.io/"),
]
for index, (title, url) in enumerate(REFS, start=1):
    par = doc.add_paragraph()
    par.paragraph_format.left_indent = Cm(0.8)
    par.paragraph_format.first_line_indent = Cm(-0.8)
    par.paragraph_format.space_after = Pt(4)
    run = par.add_run(f"[{index}] {title}. ")
    run.font.size = Pt(10.5)
    url_run = par.add_run(url)
    url_run.font.size = Pt(9.5)
    url_run.font.color.rgb = INDIGO
p("Références internes du projet : README.md et dossier AGENT/ "
  "(01_PRD.md, 02_ARCHITECTURE.md, 05_SECURITY_CHECKLIST.md, "
  "06_API_SPECIFICATION.md, 07_DATABASE_SCHEMA.md, 08_TEST_PLAN.md), "
  "migrations SQL et code source du dépôt WatchTower.",
  size=10, italic=True, color=MUTED)

# ---------------------------------------------------------------------------
doc.core_properties.title = "Rapport technique — WatchTower"
doc.core_properties.author = "Samer Rayen Ncib"
doc.core_properties.subject = "Projet individuel — application web de gestion de projets"
doc.core_properties.keywords = "WatchTower; gestion de projet; React; Express; MySQL; UML; Scrum"
doc.save(DOCX)
print("DOCX généré :", DOCX)
