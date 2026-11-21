"""Génère la présentation de soutenance WatchTower et le script oral associé.

Sources : rapport technique final, schémas réellement présents dans le dépôt,
captures QA du dossier Screenshots et logo officiel du projet.
"""
from __future__ import annotations

from pathlib import Path
import re

from PIL import Image
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from pptx import Presentation
from pptx.dml.color import RGBColor as PP_RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt as PP_Pt

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ASSETS = OUT / "Assets"
SHOTS = ROOT / "Screenshots"
EXPORT = ROOT / "docs" / "report" / "diagrams" / "export"

PPTX = OUT / "Presentation_WatchTower_Soutenance.pptx"
NOTES_DOCX = OUT / "Notes_Presentateur_WatchTower.docx"

FONT = "Segoe UI"

NAVY = "0F2449"
INDIGO = "3B4FBA"
CYAN = "0E798E"
SLATE = "334155"
MUTED = "64748B"
LIGHT = "F4F7FB"
WHITE = "FFFFFF"
BORDER = "D9E2F0"
PALE_INDIGO = "EEF2FF"
PALE_CYAN = "ECFEFF"
PALE_AMBER = "FFF7ED"
GREEN = "2F9E44"

SLIDE_W = 13.333
SLIDE_H = 7.5

prs = Presentation()
prs.slide_width = Inches(SLIDE_W)
prs.slide_height = Inches(SLIDE_H)
prs.core_properties.title = "WatchTower — Présentation de soutenance"
prs.core_properties.author = "Samer Rayen Ncib"
prs.core_properties.subject = "Rapport technique de projet — WatchTower"

SLIDE_NOTES: list[tuple[str, str, str]] = []


# ---------------------------------------------------------------------------
# utilitaires
# ---------------------------------------------------------------------------


def rgb(value: str) -> PP_RGBColor:
    value = value.lstrip("#")
    return PP_RGBColor(int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def set_name(shape, name: str) -> None:
    try:
        shape._element.nvSpPr.cNvPr.set("name", name)
    except Exception:
        pass


def add_rect(slide, x, y, w, h, fill, line=None, line_w=1.0, rounded=False, name=None):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    if line:
        shape.line.color.rgb = rgb(line)
        shape.line.width = PP_Pt(line_w)
    else:
        shape.line.fill.background()
    if name:
        set_name(shape, name)
    return shape


def add_text(slide, text, x, y, w, h, size=14, color=NAVY, bold=False,
             align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP, font=FONT,
             italic=False, margin=0.03, line_spacing=1.08, name=None):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        set_name(tb, name)
    tf = tb.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = Inches(margin)
    tf.margin_right = Inches(margin)
    tf.margin_top = Inches(margin)
    tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = valign
    for index, line in enumerate(text.split("\n")):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        p.space_after = PP_Pt(2)
        run = p.add_run()
        run.text = line
        run.font.name = font
        run.font.size = PP_Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = rgb(color)
    return tb


def add_bullets(slide, items, x, y, w, h, size=14, color=SLATE,
                marker=INDIGO, gap=6, name=None):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        set_name(tb, name)
    tf = tb.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = Inches(0.03)
    tf.margin_right = Inches(0.03)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    for index, item in enumerate(items):
        p = tf.paragraphs[0] if index == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = 1.05
        p.space_after = PP_Pt(gap)
        r0 = p.add_run()
        r0.text = "—  "
        r0.font.name = FONT
        r0.font.size = PP_Pt(size)
        r0.font.bold = True
        r0.font.color.rgb = rgb(marker)
        r1 = p.add_run()
        r1.text = item
        r1.font.name = FONT
        r1.font.size = PP_Pt(size)
        r1.font.color.rgb = rgb(color)
    return tb


def add_line(slide, x1, y1, x2, y2, color=BORDER, width=1.2,
             arrow=False, dash=False, name=None):
    line = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2)
    )
    line.line.color.rgb = rgb(color)
    line.line.width = PP_Pt(width)
    if dash:
        line.line.dash_style = MSO_LINE_DASH_STYLE.DASH
    if arrow:
        ln = line._element.spPr.ln
        tail = ln.find(qn("a:tailEnd"))
        if tail is None:
            from pptx.oxml.xmlchemy import OxmlElement
            tail = OxmlElement("a:tailEnd")
            ln.append(tail)
        tail.set("type", "triangle")
        tail.set("w", "med")
        tail.set("len", "med")
    if name:
        set_name(line, name)
    return line


def add_image_fit(slide, path: Path, x, y, w, h, name=None):
    with Image.open(path) as image:
        iw, ih = image.size
    scale = min(w / iw, h / ih)
    nw, nh = iw * scale, ih * scale
    px = x + (w - nw) / 2
    py = y + (h - nh) / 2
    shape = slide.shapes.add_picture(str(path), Inches(px), Inches(py),
                                     width=Inches(nw), height=Inches(nh))
    if name:
        set_name(shape, name)
    return shape


def add_logo(slide, x, y, w, dark_plate=True):
    if dark_plate:
        add_rect(slide, x - 0.10, y - 0.08, w + 0.20, 0.86, WHITE)
    return add_image_fit(slide, ASSETS / "WatchTower_Logo.png", x, y, w, 0.70)


def add_part_indicator(slide, current, dark=False):
    base_x = 10.72
    for index in range(5):
        color = CYAN if index == current - 1 else (MUTED if dark else BORDER)
        add_rect(slide, base_x + index * 0.34, 0.42, 0.24, 0.08, color)


def add_footer(slide, number, dark=False):
    color = "94A3B8" if dark else MUTED
    add_text(slide, "WatchTower  ·  Soutenance de projet", 0.75, 7.08, 6.0, 0.24,
             size=9, color=color)
    add_text(slide, f"{number:02d}", 12.05, 7.05, 0.5, 0.26,
             size=9, color=color, align=PP_ALIGN.RIGHT)


def new_slide(part, title, subtitle=None, dark=False):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = rgb(NAVY if dark else WHITE)
    number = len(prs.slides)
    label_color = "7DD3FC" if dark else CYAN
    title_color = WHITE if dark else NAVY
    sub_color = "CBD5E1" if dark else MUTED
    add_text(slide, f"PARTIE {part}  /  05", 0.75, 0.28, 4.0, 0.24,
             size=9.5, color=label_color, bold=True)
    add_text(slide, title, 0.75, 0.56, 11.3, 0.62,
             size=26, color=title_color, bold=True, name="anim_title")
    if subtitle:
        add_text(slide, subtitle, 0.75, 1.18, 11.4, 0.38,
                 size=12.5, color=sub_color)
    add_part_indicator(slide, part, dark)
    add_line(slide, 0.75, 1.62, 12.58, 1.62,
             color="334155" if dark else BORDER, width=1.0)
    add_footer(slide, number, dark)
    return slide


def new_diagram_slide(part, title, source):
    """Mise en page compacte réservée aux visuels extraits du rapport."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = rgb(WHITE)
    number = len(prs.slides)
    add_text(slide, f"PARTIE {part}  /  05", 0.75, 0.20, 4.0, 0.22,
             size=9.5, color=CYAN, bold=True)
    add_text(slide, title, 0.75, 0.43, 11.3, 0.50,
             size=24, color=NAVY, bold=True, name="anim_title")
    add_text(slide, source, 0.75, 0.95, 11.4, 0.26,
             size=10.5, color=MUTED)
    add_part_indicator(slide, part, False)
    add_line(slide, 0.75, 1.27, 12.58, 1.27, color=BORDER, width=1.0)
    add_footer(slide, number, False)
    return slide


def add_note(title, duration, text):
    SLIDE_NOTES.append((title, duration, text))


def add_card(slide, x, y, w, h, title, body, accent=INDIGO,
             fill=WHITE, title_color=NAVY, body_color=SLATE,
             title_size=14, body_size=11.5, name=None):
    add_rect(slide, x, y, w, h, fill, line=BORDER)
    add_rect(slide, x, y, 0.07, h, accent)
    add_text(slide, title, x + 0.22, y + 0.14, w - 0.35, 0.34,
             size=title_size, color=title_color, bold=True)
    add_text(slide, body, x + 0.22, y + 0.54, w - 0.38, h - 0.62,
             size=body_size, color=body_color, line_spacing=1.10,
             name=name)


def add_table(slide, headers, rows, x, y, w, h, col_widths=None,
              font_size=11, header_size=11, row_h=None):
    shape = slide.shapes.add_table(len(rows) + 1, len(headers),
                                   Inches(x), Inches(y), Inches(w), Inches(h))
    table = shape.table
    if col_widths:
        total = sum(col_widths)
        for idx, cw in enumerate(col_widths):
            table.columns[idx].width = Inches(w * cw / total)
    if row_h:
        for idx in range(len(rows) + 1):
            table.rows[idx].height = Inches(row_h)
    for c_idx, label in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.text = str(label)
        cell.fill.solid()
        cell.fill.fore_color.rgb = rgb(NAVY)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        cell.margin_left = Inches(0.06)
        cell.margin_right = Inches(0.06)
        for p in cell.text_frame.paragraphs:
            p.alignment = PP_ALIGN.LEFT
            for r in p.runs:
                r.font.name = FONT
                r.font.size = PP_Pt(header_size)
                r.font.bold = True
                r.font.color.rgb = rgb(WHITE)
    for r_idx, row in enumerate(rows, start=1):
        for c_idx, value in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.text = str(value)
            cell.fill.solid()
            cell.fill.fore_color.rgb = rgb(WHITE if r_idx % 2 else LIGHT)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.margin_left = Inches(0.06)
            cell.margin_right = Inches(0.06)
            for p in cell.text_frame.paragraphs:
                p.alignment = PP_ALIGN.LEFT
                for r in p.runs:
                    r.font.name = FONT
                    r.font.size = PP_Pt(font_size)
                    r.font.color.rgb = rgb(SLATE)
                    if c_idx == 0:
                        r.font.bold = True
                        r.font.color.rgb = rgb(NAVY)
    return table


def add_stick_actor(slide, cx, cy, label, role, color=NAVY):
    head = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx - 0.09),
                                  Inches(cy - 0.52), Inches(0.18), Inches(0.18))
    head.fill.solid(); head.fill.fore_color.rgb = rgb(WHITE)
    head.line.color.rgb = rgb(color); head.line.width = PP_Pt(1.5)
    add_line(slide, cx, cy - 0.34, cx, cy + 0.06, color, 1.6)
    add_line(slide, cx - 0.20, cy - 0.22, cx + 0.20, cy - 0.22, color, 1.6)
    add_line(slide, cx, cy + 0.06, cx - 0.17, cy + 0.34, color, 1.6)
    add_line(slide, cx, cy + 0.06, cx + 0.17, cy + 0.34, color, 1.6)
    add_text(slide, label, cx - 0.85, cy + 0.40, 1.7, 0.28,
             size=10.5, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, role, cx - 0.85, cy + 0.64, 1.7, 0.24,
             size=8.5, color=MUTED, align=PP_ALIGN.CENTER)


def add_use_case(slide, cx, cy, label, fill=PALE_INDIGO):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx - 0.62),
                                   Inches(cy - 0.24), Inches(1.24), Inches(0.48))
    shape.fill.solid(); shape.fill.fore_color.rgb = rgb(fill)
    shape.line.color.rgb = rgb(INDIGO); shape.line.width = PP_Pt(1.1)
    tf = shape.text_frame
    tf.clear(); tf.word_wrap = True
    tf.margin_left = Inches(0.03); tf.margin_right = Inches(0.03)
    tf.margin_top = Inches(0.01); tf.margin_bottom = Inches(0.01)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    r = p.add_run(); r.text = label
    r.font.name = FONT; r.font.size = PP_Pt(8.2); r.font.color.rgb = rgb(NAVY)
    return shape


# ===========================================================================
# 1 — COUVERTURE
# ===========================================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.background.fill.solid(); slide.background.fill.fore_color.rgb = rgb(NAVY)
add_rect(slide, 10.55, 0, 0.10, 7.5, INDIGO)
add_rect(slide, 11.05, 0, 0.03, 7.5, CYAN)
add_rect(slide, 11.35, 0, 0.16, 7.5, "1E3A8A")
add_logo(slide, 0.90, 0.65, 3.60)
add_text(slide, "WatchTower", 0.90, 1.95, 11.3, 0.95,
         size=44, color=WHITE, bold=True, name="anim_title")
add_text(slide, "Plateforme web de gestion de projets et de suivi des tâches",
         0.92, 2.92, 10.8, 0.48, size=19, color="BFDBFE")
add_rect(slide, 0.92, 3.62, 2.10, 0.045, CYAN)
add_text(slide, "Soutenance universitaire — Rapport technique de projet",
         0.92, 3.86, 10.4, 0.34, size=13.5, color="CBD5E1")
add_text(slide, "Samer Rayen Ncib", 0.92, 4.55, 7.0, 0.42,
         size=18, color=WHITE, bold=True)
add_text(slide, "Projet individuel  ·  Durée prévisionnelle : 12 semaines",
         0.92, 5.02, 9.5, 0.32, size=12.5, color="CBD5E1")
add_text(slide, "Établissement : à compléter     Encadrant : à compléter",
         0.92, 5.52, 10.0, 0.32, size=11.5, color="94A3B8")
add_text(slide, "Année universitaire : 2026–2027 (à confirmer)",
         0.92, 5.88, 10.0, 0.30, size=11.5, color="94A3B8")
add_note("Couverture", "0:20",
         "Bonjour, je vous présente WatchTower, une plateforme web de gestion de projets et de suivi des tâches. "
         "Ce travail a été réalisé en projet individuel par Samer Rayen Ncib, sur une durée prévisionnelle de douze semaines. "
         "Les informations d’établissement, d’encadrant et d’année universitaire sont laissées à confirmer, conformément au rapport.")

# ===========================================================================
# 2 — PLAN
# ===========================================================================
slide = new_slide(1, "Plan de la présentation", "Cinq parties, du contexte aux perspectives")
parts = [
    ("01", "Cadre du projet", "Problème, solution, plateforme"),
    ("02", "Conception et planning", "Scrum, besoins, diagrammes, Gantt/PERT"),
    ("03", "Choix techniques", "Stack, architecture, échanges"),
    ("04", "Réalisation", "Interfaces, fonctionnalités, tests"),
    ("05", "Conclusion", "Bilan, limites, perspectives"),
]
for index, (num, label, desc) in enumerate(parts):
    x = 0.80 + index * 2.52
    add_rect(slide, x, 2.35, 2.18, 2.55, WHITE, line=BORDER)
    add_rect(slide, x, 2.35, 2.18, 0.10, INDIGO if index % 2 == 0 else CYAN)
    add_text(slide, num, x + 0.18, 2.62, 1.0, 0.55, size=27, color=INDIGO, bold=True)
    add_text(slide, label, x + 0.18, 3.28, 1.90, 0.60, size=14, color=NAVY, bold=True)
    add_text(slide, desc, x + 0.18, 3.95, 1.88, 0.75, size=10.5, color=MUTED)
    if index < 4:
        add_line(slide, x + 2.18, 3.60, x + 2.48, 3.60, color=INDIGO, width=1.6, arrow=True)
add_text(slide, "25 minutes  ·  29 diapositives  ·  démonstrations incluses",
         0.80, 5.45, 11.7, 0.38, size=13, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Plan de la présentation", "0:20",
         "La présentation suit cinq parties. Je commencerai par le cadre du projet, puis la conception et la planification. "
         "Je présenterai ensuite les choix techniques, la réalisation avec des captures réelles, et enfin le bilan et les perspectives. "
         "La durée totale prévue est de vingt-cinq minutes.")

# ===========================================================================
# 3 — CONTEXTE
# ===========================================================================
slide = new_slide(1, "Contexte général", "La gestion de projet multiplie les informations à synchroniser")
items = [
    ("Projets", "Objectifs, périodes, statuts et propriétaires"),
    ("Tâches", "Priorités, responsables, échéances et commentaires"),
    ("Équipe", "Membres, rôles, notifications et visibilité"),
]
for index, (title, body) in enumerate(items):
    x = 0.85 + index * 4.05
    add_card(slide, x, 2.15, 3.55, 2.20, title, body,
             accent=[INDIGO, CYAN, "6366F1"][index])
add_line(slide, 2.62, 4.35, 6.66, 4.85, color=BORDER, width=1.4, arrow=True)
add_line(slide, 6.66, 4.85, 10.72, 4.35, color=BORDER, width=1.4, arrow=True)
add_rect(slide, 3.55, 5.05, 6.25, 0.90, NAVY)
add_text(slide, "Besoin de centralisation, de visibilité et de suivi des échéances",
         3.75, 5.25, 5.85, 0.50, size=16, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
add_note("Contexte général", "0:40",
         "Dans un projet informatique, les informations ne se limitent pas à une liste de tâches. "
         "Il faut suivre des projets, des périodes, des responsables, des priorités et des commentaires. "
         "Lorsque ces données sont dispersées, la visibilité diminue et le respect des échéances devient plus difficile. "
         "C’est précisément ce besoin de centralisation qui motive WatchTower.")

# ===========================================================================
# 4 — PROBLÉMATIQUE
# ===========================================================================
slide = new_slide(1, "Problématique", "Sans outil centralisé, la coordination devient fragile", dark=True)
add_text(slide, "AVANT", 0.95, 2.05, 5.2, 0.32, size=12, color="FCA5A5", bold=True)
add_bullets(slide, [
    "Informations dispersées entre projets et tâches",
    "Répartition des responsabilités peu claire",
    "Avancement difficile à visualiser",
    "Communication et coordination complexes",
    "Risque de retard sur les échéances",
], 0.95, 2.42, 5.25, 3.0, size=13.5, color="E2E8F0", marker="F87171", name="anim_before")
add_rect(slide, 6.55, 2.00, 0.03, 3.25, "475569")
add_text(slide, "BESOIN", 7.05, 2.05, 5.2, 0.32, size=12, color="7DD3FC", bold=True)
add_bullets(slide, [
    "Une vue unique des projets et des tâches",
    "Des responsabilités explicitement attribuées",
    "Une progression calculée et consultable",
    "Des notifications pour les événements clés",
    "Une visibilité adaptée à chaque rôle",
], 7.05, 2.42, 5.25, 3.0, size=13.5, color="E2E8F0", marker="38BDF8", name="anim_after")
add_rect(slide, 1.15, 5.70, 11.05, 0.80, INDIGO)
add_text(slide, "Comment concevoir une application web centralisée facilitant la planification, l’organisation et le suivi de projets informatiques ?",
         1.42, 5.85, 10.50, 0.52, size=14, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)
add_note("Problématique", "0:45",
         "Le problème n’est pas seulement le nombre de tâches, mais la dispersion des informations. "
         "Sans vue centralisée, il est difficile de savoir qui fait quoi, où en est un projet et quelles échéances approchent. "
         "La question centrale est donc la suivante : comment concevoir une application web centralisée qui facilite la planification, l’organisation et le suivi de projets informatiques ? "
         "Je passe maintenant à la réponse apportée par WatchTower.")

# ===========================================================================
# 5 — SOLUTION
# ===========================================================================
slide = new_slide(1, "Solution proposée", "Une plateforme centralisée autour du projet")
hub_x, hub_y = 5.72, 3.55
add_rect(slide, hub_x - 1.20, hub_y - 0.48, 2.40, 0.96, NAVY)
add_text(slide, "WatchTower", hub_x - 1.10, hub_y - 0.30, 2.20, 0.50,
         size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER,
         valign=MSO_ANCHOR.MIDDLE, name="anim_hub")
spokes = [
    (1.05, 2.25, "Projets", "Création, dates, progression"),
    (1.05, 4.60, "Tâches", "Priorités, statuts, échéances"),
    (9.25, 2.25, "Membres", "Rôles et affectations"),
    (9.25, 4.60, "Suivi", "KPI, rapports, activité"),
]
for x, y, title, body in spokes:
    add_card(slide, x, y, 2.95, 1.18, title, body, title_size=12.5, body_size=10)
for x, y in [(4.00, 2.84), (4.00, 5.00), (9.25, 2.84), (9.25, 5.00)]:
    add_line(slide, x, y, hub_x, hub_y if y < 4 else hub_y + 0.20,
             color=INDIGO, width=1.4, arrow=False)
add_text(slide, "Centraliser pour rendre le travail visible, organisé et traçable.",
         2.35, 6.18, 8.65, 0.42, size=15, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
add_note("Solution proposée", "0:45",
         "WatchTower répond à cette problématique en regroupant les projets, les tâches, les membres et les indicateurs dans une seule application. "
         "La plateforme ne se contente pas d’afficher des listes : elle relie les tâches aux projets, les responsables aux équipes et les événements aux notifications. "
         "L’objectif est de rendre le travail visible, organisé et traçable.")

# ===========================================================================
# 6 — PRÉSENTATION DE LA PLATEFORME
# ===========================================================================
slide = new_slide(1, "La plateforme WatchTower", "Une application full-stack centrée sur le suivi")
add_rect(slide, 0.75, 1.88, 4.55, 4.85, NAVY)
add_text(slide, "Objectif", 1.05, 2.20, 3.9, 0.30, size=11, color="7DD3FC", bold=True)
add_text(slide, "Centraliser la planification, l’organisation et le suivi des projets.",
         1.05, 2.52, 3.95, 0.80, size=16, color=WHITE, bold=True)
add_text(slide, "Fonctions clés", 1.05, 3.55, 3.9, 0.30, size=11, color="7DD3FC", bold=True)
add_bullets(slide, [
    "Projets et progression",
    "Tâches, statuts et priorités",
    "Membres et rôles projet",
    "Tableau de bord et notifications",
], 1.05, 3.90, 3.95, 1.90, size=12.5, color="E2E8F0", marker="38BDF8")
add_text(slide, "Public cible : porteurs de projets, managers et membres d’équipe.",
         1.05, 5.95, 3.95, 0.55, size=11, color="CBD5E1")
add_rect(slide, 5.55, 1.88, 7.03, 4.85, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "02_admin_dashboard.png", 5.78, 2.08, 6.57, 4.20,
              name="anim_dashboard")
add_text(slide, "Vue d’ensemble réelle du tableau de bord administrateur (capture QA).",
         5.78, 6.35, 6.55, 0.25, size=9.5, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Présentation de la plateforme", "0:50",
         "Cette capture montre le tableau de bord administrateur tel qu’il apparaît dans l’application. "
         "La plateforme s’adresse aux personnes qui portent un projet, aux managers qui répartissent le travail et aux membres qui consultent ou mettent à jour leurs tâches. "
         "La valeur ajoutée est la réunion, dans une même interface, de la vue projets, de la vue tâches, des indicateurs et des accès selon le rôle.")

# ===========================================================================
# 7 — MÉTHODOLOGIE
# ===========================================================================
slide = new_slide(2, "Méthodologie Scrum adaptée", "Une adaptation individuelle, pas une équipe Scrum classique")
roles = [
    ("Product Owner", "Définition des besoins et priorisation du backlog", INDIGO),
    ("Scrum Master", "Organisation des sprints et suivi de la méthode", CYAN),
    ("Developer", "Conception, développement, tests et documentation", "6366F1"),
]
for index, (title, body, color) in enumerate(roles):
    x = 0.85 + index * 4.05
    add_card(slide, x, 2.10, 3.55, 2.05, title, body, accent=color,
             title_size=14, body_size=11.5)
add_text(slide, "Une seule personne assume les trois responsabilités.",
         0.85, 4.45, 11.65, 0.38, size=15, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
cycle = ["Backlog", "Sprint Planning", "Daily adapté", "Review", "Rétrospective"]
for index, label in enumerate(cycle):
    x = 0.95 + index * 2.48
    add_rect(slide, x, 5.15, 2.05, 0.72, WHITE, line=BORDER)
    add_text(slide, label, x + 0.10, 5.32, 1.85, 0.34, size=11, color=NAVY,
             bold=True, align=PP_ALIGN.CENTER)
    if index < 4:
        add_line(slide, x + 2.05, 5.51, x + 2.43, 5.51, color=INDIGO, width=1.5, arrow=True)
add_note("Méthodologie Scrum adaptée", "0:45",
         "Le projet suit une adaptation individuelle de Scrum. Une seule personne occupe les rôles de Product Owner, Scrum Master et Developer. "
         "Le backlog fixe les priorités, la planification découpe le travail en sprints, un point quotidien remplace le daily, et chaque fin de sprint donne lieu à une revue et à une rétrospective. "
         "Les tests automatisés compensent l’absence de revue collective.")

# ===========================================================================
# 8 — PRODUCT BACKLOG
# ===========================================================================
slide = new_slide(2, "Product Backlog", "Éléments reconstitués à partir des modules effectivement livrés")
rows = [
    ("PB-01", "Socle projet", "Configuration Node/Vite, scripts, migrations", "Haute", "S1", "Livré"),
    ("PB-02", "Modélisation", "Schéma SQL, UML et matrice de traçabilité", "Haute", "S1", "Livré"),
    ("PB-03", "Authentification", "Inscription, connexion, JWT, refresh haché", "Haute", "S2", "Livré"),
    ("PB-04", "RBAC", "Rôles globaux et rôles projet", "Haute", "S2", "Livré"),
    ("PB-05", "Dashboard", "KPI, activité, projets et tâches", "Moyenne", "S3", "Livré"),
    ("PB-06", "Projets", "CRUD, archivage, dates, progression", "Haute", "S3", "Livré"),
    ("PB-08", "Tâches", "CRUD, priorités, statuts, commentaires", "Haute", "S4", "Livré"),
    ("PB-09", "Kanban", "Vue par colonnes et changement de statut", "Haute", "S4", "Livré"),
    ("PB-13", "Tests", "Suite Vitest/Supertest et validation API", "Haute", "S5", "Livré"),
]
add_table(slide, ["ID", "Fonctionnalité", "Description courte", "Priorité", "Sprint", "État"],
          rows, 0.80, 1.95, 11.75, 4.55,
          col_widths=[0.9, 2.0, 5.0, 1.2, 0.9, 0.9], font_size=10.5, header_size=10.5)
add_text(slide, "Estimation détaillée du backlog : 1 à 2 semaines par élément (rapport, tableau 3.2).",
         0.85, 6.62, 11.6, 0.28, size=10, color=MUTED)
add_note("Product Backlog", "0:40",
         "Le backlog est présenté ici de manière synthétique. Il est reconstitué à partir des modules réellement livrés, afin de ne pas transformer une intention en résultat. "
         "Les éléments les plus prioritaires concernent le socle technique, l’authentification, le contrôle d’accès, puis les projets et les tâches. "
         "Chaque élément est associé à un sprint prévisionnel et à un état de livraison.")

# ===========================================================================
# 9 — SPRINT PLANNING
# ===========================================================================
slide = new_slide(2, "Sprint Planning", "Douze semaines relatives, sans date calendaire inventée")
sprints = [
    ("Sprint 1 · S1–S2", "Analyse, conception et configuration", "Cahier des charges, UML/ERD, socle"),
    ("Sprint 2 · S3–S4", "Authentification et dashboard initial", "/auth, cookies, RBAC, KPI"),
    ("Sprint 3 · S5–S6", "Gestion des projets", "CRUD, membres, archivage"),
    ("Sprint 4 · S7–S9", "Gestion des tâches et équipes", "Kanban, commentaires, notifications"),
    ("Sprint 5 · S10–S11", "Tests, amélioration et finalisation", "Vitest/Supertest, build, rapport"),
    ("Livraison · S12", "Documentation et soutenance", "Rapport, diagrammes, présentation"),
]
add_line(slide, 1.15, 2.72, 12.10, 2.72, color=BORDER, width=2.0)
for index, (period, objective, deliverable) in enumerate(sprints):
    x = 0.80 + index * 2.02
    dot = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x + 0.80), Inches(2.56),
                                 Inches(0.32), Inches(0.32))
    dot.fill.solid(); dot.fill.fore_color.rgb = rgb(INDIGO if index < 5 else CYAN)
    dot.line.fill.background()
    add_text(slide, period, x, 2.05, 2.0, 0.32, size=11, color=NAVY,
             bold=True, align=PP_ALIGN.CENTER)
    add_rect(slide, x, 3.05, 1.92, 2.45, WHITE, line=BORDER)
    add_rect(slide, x, 3.05, 1.92, 0.07, INDIGO if index < 5 else CYAN)
    add_text(slide, objective, x + 0.13, 3.30, 1.66, 1.05,
             size=10.5, color=NAVY, bold=True)
    add_text(slide, deliverable, x + 0.13, 4.45, 1.66, 0.85,
             size=9.2, color=MUTED)
add_note("Sprint Planning", "0:40",
         "La planification est exprimée en semaines relatives S1 à S12. Les deux premiers sprints posent le socle et la sécurité. "
         "Les sprints 3 et 4 livrent le domaine fonctionnel : projets, membres, tâches, Kanban et vues de synthèse. "
         "Le cinquième sprint est consacré aux tests et à la consolidation du rapport, et la semaine 12 aux livrables finaux.")

# ===========================================================================
# 10 — BESOINS FONCTIONNELS
# ===========================================================================
slide = new_slide(2, "Besoins fonctionnels", "Six groupes de fonctionnalités réellement présentes")
groups = [
    ("Authentification & accès", "Inscription, connexion, déconnexion, profil, JWT et rôles."),
    ("Projets", "Création, modification, archivage, dates et progression calculée."),
    ("Tâches", "Création, édition, suppression logique, priorités et statuts."),
    ("Membres", "Ajout, retrait, rôles projet et attribution des tâches."),
    ("Suivi & synthèses", "Dashboard, KPI, rapports, calendrier, timeline et activité."),
    ("Notifications & préférences", "Notifications filtrées, langue FR/EN et thèmes clair/sombre."),
]
for index, (title, body) in enumerate(groups):
    col = index % 3
    row = index // 3
    x = 0.85 + col * 4.05
    y = 2.00 + row * 2.25
    add_card(slide, x, y, 3.55, 1.85, title, body,
             accent=[INDIGO, CYAN, "6366F1"][col], title_size=13, body_size=11)
add_text(slide, "Statuts de tâches implémentés : TODO · IN_PROGRESS · IN_REVIEW · DONE",
         0.85, 6.55, 11.6, 0.30, size=10.5, color=MUTED)
add_note("Besoins fonctionnels", "0:35",
         "Les besoins fonctionnels se regroupent en six familles. L’authentification et le contrôle d’accès précèdent l’accès aux données métier. "
         "Viennent ensuite les projets, les tâches et les membres, puis les vues de synthèse et les préférences. "
         "À noter que le code implémente quatre statuts de tâches, et non seulement les trois statuts souvent cités dans la description initiale.")

# ===========================================================================
# 11 — BESOINS NON FONCTIONNELS ET ACTEURS
# ===========================================================================
slide = new_slide(2, "Acteurs et besoins non fonctionnels", "Les rôles réels et les exigences transverses")
add_text(slide, "ACTEURS", 0.90, 1.95, 5.3, 0.30, size=11, color=CYAN, bold=True)
actors = [
    ("ADMIN", "Accès global et gestion des comptes/rôles"),
    ("PROJECT_MANAGER", "Crée et gère ses projets"),
    ("TEAM_MEMBER", "Consulte et agit sur les tâches autorisées"),
]
for index, (name, role) in enumerate(actors):
    y = 2.35 + index * 1.20
    add_rect(slide, 0.90, y, 5.35, 0.95, WHITE, line=BORDER)
    add_rect(slide, 0.90, y, 0.07, 0.95, [INDIGO, CYAN, "6366F1"][index])
    add_text(slide, name, 1.15, y + 0.12, 4.9, 0.30, size=12.5, color=NAVY, bold=True)
    add_text(slide, role, 1.15, y + 0.48, 4.9, 0.32, size=10.5, color=MUTED)
add_text(slide, "BESOINS NON FONCTIONNELS", 6.75, 1.95, 5.6, 0.30,
         size=11, color=CYAN, bold=True)
nfr = [
    "Sécurité : JWT, refresh haché, Helmet, CORS et RBAC",
    "Performance : index SQL, pagination et requêtes paramétrées",
    "Maintenabilité : routeurs, services et repositories séparés",
    "Ergonomie : navigation latérale, chargement et messages d’erreur",
    "Disponibilité : endpoint /health public",
    "Fiabilité : transactions et contraintes d’unicité SQL",
]
add_bullets(slide, nfr, 6.75, 2.35, 5.65, 3.85, size=11.5, color=SLATE, gap=8)
add_text(slide, "Compatibilité multi-navigateur et accessibilité automatisée : non vérifiées dans les artefacts.",
         6.75, 6.35, 5.65, 0.45, size=9.5, color=MUTED, italic=True)
add_note("Acteurs et besoins non fonctionnels", "0:35",
         "Le code identifie trois rôles globaux et deux rôles projet. L’accès effectif dépend toutefois de l’appartenance au projet, pas uniquement du rôle global. "
         "Parmi les besoins non fonctionnels, la sécurité et la fiabilité sont directement vérifiables dans le code. "
         "En revanche, la compatibilité multi-navigateur et l’accessibilité automatisée ne disposent pas de preuves et sont donc signalées comme non vérifiées.")

# ===========================================================================
# 12 — CAS D’UTILISATION
# ===========================================================================
slide = new_diagram_slide(
    2, "Diagramme global de cas d’utilisation",
    "Visuel original extrait du rapport technique — figure 2.1, page 11")
add_rect(slide, 0.80, 1.40, 7.12, 5.50, "FCFDFF", line=BORDER)
add_image_fit(slide, ASSETS / "report_use_case_page11.png",
              0.86, 1.46, 7.00, 5.38, name="anim_diagram")
add_rect(slide, 8.12, 1.40, 4.42, 5.50, LIGHT, line=BORDER)
add_text(slide, "LECTURE DU DIAGRAMME ORIGINAL", 8.38, 1.62, 3.90, 0.28,
         size=11, color=CYAN, bold=True)
add_bullets(slide, [
    "Quatre acteurs : visiteur, membre, chef de projet, administrateur.",
    "Les cas d’utilisation sont ceux de la figure 2.1 du rapport.",
    "Acteurs, cas, relations et associations conservés à l’identique.",
], 8.38, 2.04, 3.90, 2.35, size=11, gap=9)
add_rect(slide, 8.38, 4.55, 3.90, 2.00, WHITE, line=BORDER)
add_text(slide, "Règles d’accès documentées", 8.62, 4.75, 3.42, 0.30,
         size=11.5, color=NAVY, bold=True)
add_text(slide, "Rôles globaux : ADMIN, PROJECT_MANAGER, TEAM_MEMBER. "
               "Rôles projet : OWNER, MEMBER.",
         8.62, 5.15, 3.42, 1.15, size=10.2, color=SLATE)
add_note("Diagramme global de cas d’utilisation", "0:50",
         "Je projette ici la figure 2.1 du rapport technique, extraite directement du PDF : aucun acteur ni cas d’utilisation n’a été redessiné. "
         "On retrouve quatre acteurs extérieurs à la frontière du système : visiteur, membre, chef de projet et administrateur. "
         "Les relations et associations affichées sont exactement celles du rapport, et le panneau de droite rappelle les rôles globaux et projet.")

# ===========================================================================
# 13 — CLASSES
# ===========================================================================
slide = new_diagram_slide(
    2, "Modèle de classes du domaine",
    "Visuel original extrait du rapport technique — figure 4.2, page 16")
add_rect(slide, 0.80, 1.40, 7.55, 5.50, "FCFDFF", line=BORDER)
add_image_fit(slide, ASSETS / "report_classes_page16.jpg",
              0.88, 1.46, 7.39, 5.38, name="anim_diagram")
add_rect(slide, 8.58, 1.40, 3.96, 5.50, LIGHT, line=BORDER)
add_text(slide, "DIX CLASSES PRÉSENTES", 8.84, 1.62, 3.44, 0.28,
         size=11, color=CYAN, bold=True)
add_text(slide,
         "User\nProject\nTask\nNotification\nProjectMember\nComment\n"
         "UserSession\nPasswordResetToken\nActivityLog\nAuditLog",
         8.84, 2.02, 3.44, 3.25, size=11.5, color=NAVY, line_spacing=1.24,
         name="anim_classes")
add_text(slide, "Aucune classe fusionnée ni simplifiée : le visuel du rapport est inséré tel quel.",
         8.84, 5.55, 3.44, 1.00, size=10, color=MUTED, italic=True)
add_note("Modèle de classes du domaine", "0:50",
         "Je projette la figure 4.2 du rapport, extraite directement du PDF, sans simplification ni fusion de classes. "
         "Le modèle contient User, Project, Task, Notification, ProjectMember, Comment, UserSession, PasswordResetToken, ActivityLog et AuditLog. "
         "Le rapport précise qu’il s’agit de classes persistantes dérivées des migrations : les comportements sont portés par les services et repositories, pas par des méthodes de classe.")

# ===========================================================================
# 14 — GANTT
# ===========================================================================
slide = new_diagram_slide(
    2, "Diagramme de Gantt",
    "Visuel original extrait du rapport technique — figure 7.1, page 31")
add_rect(slide, 0.80, 1.40, 11.73, 5.50, "FCFDFF", line=BORDER)
add_image_fit(slide, ASSETS / "report_gantt_page31.png",
              0.92, 1.46, 11.49, 5.38, name="anim_diagram")
add_note("Diagramme de Gantt", "0:45",
         "Je projette la figure 7.1 du rapport, extraite directement du PDF : les douze activités, les semaines S1 à S12 et les jalons sont ceux du planning documenté. "
         "Aucune période ni aucune dépendance n’a été modifiée. "
         "Le Gantt permet de voir les chevauchements, notamment le démarrage parallèle des activités E et F après l’authentification.")

# ===========================================================================
# 15 — PERT
# ===========================================================================
slide = new_diagram_slide(
    2, "Diagramme PERT",
    "Visuel original extrait du rapport technique — figure 7.2, page 32")
add_rect(slide, 0.80, 1.40, 11.73, 5.50, "FCFDFF", line=BORDER)
add_image_fit(slide, ASSETS / "report_pert_page32.png",
              0.92, 1.46, 11.49, 5.38, name="anim_diagram")
add_note("Diagramme PERT", "0:45",
         "Je projette la figure 7.2 du rapport, extraite directement du PDF. "
         "Les activités, les durées, les dépendances, les marges et le chemin critique sont exactement ceux du rapport : aucune relation n’a été ajoutée. "
         "Ce réseau complète le Gantt en montrant quelles activités ne tolèrent aucun retard.")

# ===========================================================================
# 16 — COMPARAISON GANTT / PERT
# ===========================================================================
slide = new_slide(2, "Gantt et PERT : deux vues complémentaires", "Suivi du calendrier et analyse des dépendances")
rows = [
    ("Objectif", "Planification temporelle", "Analyse des dépendances"),
    ("Représentation", "Barres chronologiques", "Réseau d’activités"),
    ("Point fort", "Visualisation des périodes", "Identification du chemin critique"),
    ("Dépendances", "Chevauchements visibles", "Calcul ES, EF, LS, LF et marges"),
    ("Utilité pour WatchTower", "Suivi des sprints S1 à S12", "Anticipation des risques de retard"),
]
add_table(slide, ["Critère", "Gantt", "PERT"], rows,
          0.95, 2.10, 11.35, 3.95, col_widths=[2.6, 4.3, 4.5],
          font_size=12, header_size=12)
add_rect(slide, 1.45, 6.20, 10.35, 0.55, PALE_INDIGO, line=BORDER)
add_text(slide, "Synthèse : le Gantt répond à « quand », le PERT répond à « quoi doit précéder quoi ».",
         1.65, 6.32, 9.95, 0.30, size=12, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
add_note("Comparaison Gantt / PERT", "0:35",
         "Le Gantt et le PERT ne sont pas redondants. Le Gantt montre la répartition des activités dans le temps et les chevauchements. "
         "Le PERT met en évidence les dépendances et calcule le chemin critique. "
         "Pour WatchTower, le Gantt sert à suivre les sprints, tandis que le PERT sert à identifier les activités dont le retard impacterait la livraison finale.")

# ===========================================================================
# 17 — STACK
# ===========================================================================
slide = new_slide(3, "Stack technologique", "Technologies vérifiées dans le rapport et le code")
categories = [
    ("Frontend", ["react", "javascript", "tailwindcss", "vite"]),
    ("Backend", ["nodejs", "express"]),
    ("Données", ["mysql"]),
    ("Sécurité", ["jsonwebtokens"]),
    ("Outils", ["git", "github"]),
]
for index, (label, logos) in enumerate(categories):
    x = 0.85 + index * 2.52
    add_rect(slide, x, 2.00, 2.18, 3.55, WHITE, line=BORDER)
    add_rect(slide, x, 2.00, 2.18, 0.42, NAVY)
    add_text(slide, label, x, 2.06, 2.18, 0.28, size=11, color=WHITE,
             bold=True, align=PP_ALIGN.CENTER)
    for j, logo in enumerate(logos):
        lx = x + 0.35 + (j % 2) * 0.90
        ly = 2.65 + (j // 2) * 1.10
        add_image_fit(slide, ASSETS / f"logo_{logo}.png", lx, ly, 0.70, 0.70)
        add_text(slide, logo.replace("jsonwebtokens", "JWT").replace("tailwindcss", "Tailwind"),
                 lx - 0.18, ly + 0.72, 1.06, 0.24, size=8.5, color=MUTED,
                 align=PP_ALIGN.CENTER)
add_text(slide, "Outils non confirmés par les artefacts : Antigravity, Google AI Studio, Figma, Postman, Draw.io.",
         0.95, 5.90, 11.45, 0.42, size=10.5, color=MUTED, italic=True,
         align=PP_ALIGN.CENTER)
add_text(slide, "Les diagrammes du rapport ont été produits par scripts Python + SVG, puis rasterisés avec Chrome headless.",
         0.95, 6.35, 11.45, 0.30, size=9.5, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Stack technologique", "1:20",
         "La stack est celle qui est réellement vérifiée : React et Vite côté frontend, Node.js et Express côté serveur, MySQL pour les données, JWT et bcrypt pour la sécurité. "
         "Tailwind CSS assure la mise en forme et Zod la validation. "
         "Je précise que plusieurs outils cités dans la consigne initiale, comme Antigravity, Google AI Studio, Figma, Postman ou Draw.io, ne sont pas confirmés par les artefacts du dépôt ; ils ne sont donc pas présentés comme utilisés.")

# ===========================================================================
# 18 — ARCHITECTURE
# ===========================================================================
slide = new_slide(3, "Architecture globale", "Une architecture client-serveur vérifiée dans le code")
blocks = [
    (0.85, 2.20, 2.05, 1.20, "Utilisateur", "Navigateur", CYAN),
    (3.25, 2.20, 2.35, 1.20, "Frontend", "React + Vite", INDIGO),
    (6.05, 2.20, 2.50, 1.20, "API REST", "Express / JSON", INDIGO),
    (9.00, 2.20, 2.45, 1.20, "MySQL 8", "mysql2 + SQL", CYAN),
]
for x, y, w, h, title, sub, color in blocks:
    add_rect(slide, x, y, w, h, WHITE, line=color, line_w=1.5)
    add_rect(slide, x, y, w, 0.38, color)
    add_text(slide, title, x + 0.10, y + 0.06, w - 0.20, 0.26,
             size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, sub, x + 0.10, y + 0.55, w - 0.20, 0.45,
             size=11, color=NAVY, align=PP_ALIGN.CENTER)
    if x < 8:
        add_line(slide, x + w, y + 0.60, blocks[blocks.index((x, y, w, h, title, sub, color)) + 1][0] - 0.05,
                 y + 0.60, color=INDIGO, width=1.8, arrow=True)
add_rect(slide, 3.25, 4.10, 5.30, 0.72, PALE_INDIGO, line=BORDER)
add_text(slide, "Middlewares : authenticate · requireRoles · validate · gestion d’erreurs",
         3.45, 4.28, 4.90, 0.34, size=10.5, color=NAVY, align=PP_ALIGN.CENTER)
add_rect(slide, 6.05, 5.15, 2.50, 0.72, PALE_CYAN, line=BORDER)
add_text(slide, "Services + repositories", 6.25, 5.33, 2.10, 0.34,
         size=10.5, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
add_line(slide, 7.30, 3.40, 7.30, 4.10, color=INDIGO, width=1.4, arrow=True)
add_line(slide, 7.30, 4.82, 7.30, 5.15, color=INDIGO, width=1.4, arrow=True)
add_text(slide, "Préfixe API : /api/v1  ·  Réponses : { success, data, meta } ou { success, error }",
         1.15, 6.30, 11.0, 0.38, size=11, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Architecture globale", "1:20",
         "L’architecture est celle du code : le navigateur exécute une application React servie par Vite, qui communique en HTTP avec une API REST Express. "
         "Celle-ci utilise des routeurs, des middlewares, des services et des repositories avant d’adresser MySQL via le pilote mysql2. "
         "En production, le serveur Express dessert également les fichiers compilés du frontend. Le point d’entrée est server/src/app.js.")

# ===========================================================================
# 19 — ÉCHANGES
# ===========================================================================
slide = new_slide(3, "Fonctionnement d’un échange", "Le parcours d’une requête du clic à la réponse")
steps = [
    ("01", "Action utilisateur", "Un formulaire ou une navigation déclenche une opération."),
    ("02", "Requête HTTP", "React envoie une requête via apiClient avec credentials."),
    ("03", "Traitement Express", "Le routeur reçoit la requête sous /api/v1."),
    ("04", "Contrôles", "authenticate, requireRoles et validate vérifient la demande."),
    ("05", "Données", "Le repository exécute une requête SQL paramétrée."),
    ("06", "Réponse JSON", "Le serveur renvoie une enveloppe success ou error."),
    ("07", "Mise à jour UI", "React actualise l’état affiché et les indicateurs."),
]
for index, (num, title, body) in enumerate(steps):
    col = index % 4
    row = index // 4
    x = 0.85 + col * 3.05
    y = 2.05 + row * 2.20
    add_rect(slide, x, y, 2.70, 1.75, WHITE, line=BORDER)
    add_text(slide, num, x + 0.16, y + 0.12, 0.55, 0.32,
             size=16, color=INDIGO, bold=True)
    add_text(slide, title, x + 0.75, y + 0.14, 1.80, 0.30,
             size=11.5, color=NAVY, bold=True)
    add_text(slide, body, x + 0.17, y + 0.60, 2.38, 0.95,
             size=10.2, color=SLATE)
    if col < 3 and index < 6:
        add_line(slide, x + 2.70, y + 0.85, x + 3.00, y + 0.85,
                 color=INDIGO, width=1.6, arrow=True)
add_text(slide, "Exemple réel : POST /auth/login → cookies wt_access et wt_refresh → { success: true, data: ... }",
         0.90, 6.55, 11.55, 0.34, size=10.5, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Fonctionnement d’un échange", "1:20",
         "Une action dans l’interface déclenche une requête HTTP. Côté serveur, la requête passe par les middlewares d’authentification, de rôle et de validation avant d’atteindre la logique métier. "
         "Les repositories exécutent ensuite des requêtes SQL paramétrées. Le serveur renvoie une réponse JSON normalisée, et React met à jour l’interface. "
         "L’exemple typique est la connexion : POST /auth/login pose les cookies wt_access et wt_refresh.")

# ===========================================================================
# 20 — CONNEXION
# ===========================================================================
slide = new_slide(4, "Interface de connexion", "Authentification réelle et contrôle d’accès")
add_rect(slide, 0.85, 1.92, 7.65, 4.82, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "00_login_page.png", 1.05, 2.10, 7.25, 4.10,
              name="anim_login")
add_text(slide, "Capture QA 00_login_page", 1.05, 6.32, 7.25, 0.25,
         size=9.5, color=MUTED, align=PP_ALIGN.CENTER)
add_text(slide, "Ce que montre la capture", 8.95, 2.02, 3.55, 0.32,
         size=11, color=CYAN, bold=True)
add_bullets(slide, [
    "Page publique avant authentification",
    "Champs d’identifiants et accès au parcours /auth/login",
    "Pose des cookies après connexion",
], 8.95, 2.45, 3.55, 1.70, size=11.5, gap=8)
add_rect(slide, 8.95, 4.35, 3.55, 1.75, PALE_INDIGO, line=BORDER)
add_text(slide, "Sécurité vérifiée", 9.18, 4.52, 3.10, 0.30,
         size=11.5, color=NAVY, bold=True)
add_text(slide, "JWT 15 min · refresh haché 7 j · bcrypt 12 rounds · rotation de session.",
         9.18, 4.92, 3.10, 0.95, size=10.5, color=SLATE)
add_note("Interface de connexion", "1:00",
         "Cette capture correspond à la page de connexion réelle de l’application. C’est une route publique, accessible avant authentification. "
         "Le parcours appelle POST /auth/login, puis pose les cookies wt_access et wt_refresh. "
         "La sécurité vérifiée dans le code repose sur un JWT de courte durée, un jeton de rafraîchissement haché et révoquable, et un hachage bcrypt des mots de passe.")

# ===========================================================================
# 21 — DASHBOARD
# ===========================================================================
slide = new_slide(4, "Tableau de bord", "Vue d’ensemble des indicateurs et des accès")
add_rect(slide, 0.85, 1.92, 8.35, 4.82, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "02_admin_dashboard.png", 1.05, 2.08, 7.95, 4.20,
              name="anim_dash2")
add_text(slide, "Capture QA 02_admin_dashboard", 1.05, 6.33, 7.95, 0.25,
         size=9.5, color=MUTED, align=PP_ALIGN.CENTER)
kpis = [
    ("Projets", "Nombre total accessible"),
    ("Tâches", "En cours et terminées"),
    ("Retards", "Échéances dépassées"),
    ("Progression", "Taux global calculé"),
]
for index, (title, body) in enumerate(kpis):
    y = 2.05 + index * 1.12
    add_rect(slide, 9.55, y, 2.95, 0.92, WHITE, line=BORDER)
    add_rect(slide, 9.55, y, 0.06, 0.92, INDIGO if index % 2 == 0 else CYAN)
    add_text(slide, title, 9.78, y + 0.10, 2.5, 0.28,
             size=12, color=NAVY, bold=True)
    add_text(slide, body, 9.78, y + 0.44, 2.5, 0.32,
             size=9.5, color=MUTED)
add_note("Tableau de bord", "1:00",
         "Le tableau de bord est la vue d’accueil après authentification. Il consolide les indicateurs issus de /reports/summary et les listes chargées en parallèle. "
         "Les indicateurs portent sur les projets, les tâches en cours, les tâches terminées, les retards et la progression globale. "
         "Cette capture correspond à un administrateur ; pour les autres rôles, le serveur applique une visibilité filtrée.")

# ===========================================================================
# 22 — PROJETS
# ===========================================================================
slide = new_slide(4, "Gestion des projets", "Création, consultation et organisation des informations")
add_rect(slide, 0.85, 1.92, 7.15, 3.05, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "03_admin_projects_list.png", 1.02, 2.05, 6.80, 2.55,
              name="anim_projects")
add_text(slide, "Liste des projets — capture QA 03_admin_projects_list",
         1.02, 4.65, 6.80, 0.24, size=9, color=MUTED, align=PP_ALIGN.CENTER)
add_rect(slide, 0.85, 5.12, 7.15, 1.62, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "04_admin_new_project_form.png", 1.02, 5.22, 6.80, 1.18,
              name="anim_form")
add_text(slide, "Formulaire de création — capture QA 04_admin_new_project_form",
         1.02, 6.45, 6.80, 0.22, size=8.5, color=MUTED, align=PP_ALIGN.CENTER)
add_text(slide, "Opérations réelles", 8.45, 2.02, 4.0, 0.32,
         size=11, color=CYAN, bold=True)
add_bullets(slide, [
    "Création réservée à ADMIN et PROJECT_MANAGER",
    "Modification et archivage des projets",
    "Dates de début et d’échéance",
    "Progression calculée à la sérialisation",
    "Gestion des membres depuis le détail",
], 8.45, 2.45, 4.0, 3.35, size=11.2, gap=9)
add_text(slide, "Pas de suppression physique des projets : l’archivage est le mécanisme prévu.",
         8.45, 6.05, 4.0, 0.70, size=9.5, color=MUTED, italic=True)
add_note("Gestion des projets", "1:10",
         "La première capture montre la liste des projets, la seconde le formulaire de création. "
         "La création est réservée à l’administrateur et au chef de projet. Le formulaire collecte les champs validés ensuite par Zod. "
         "Le projet peut être modifié et archivé ; il n’existe pas de suppression physique. La progression n’est pas stockée, elle est recalculée lors de la sérialisation.")

# ===========================================================================
# 23 — TÂCHES ET KANBAN
# ===========================================================================
slide = new_slide(4, "Tâches et tableau Kanban", "Organisation du travail par statut")
add_rect(slide, 0.85, 1.92, 8.05, 4.82, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "12_admin_kanban_board.png", 1.05, 2.10, 7.65, 4.10,
              name="anim_kanban")
add_text(slide, "Vue Kanban — capture QA 12_admin_kanban_board",
         1.05, 6.33, 7.65, 0.25, size=9.5, color=MUTED, align=PP_ALIGN.CENTER)
add_text(slide, "Statuts implémentés", 9.25, 2.02, 3.2, 0.32,
         size=11, color=CYAN, bold=True)
statuses = [("TODO", "À faire"), ("IN_PROGRESS", "En cours"),
            ("IN_REVIEW", "En revue"), ("DONE", "Terminée")]
for index, (code, label) in enumerate(statuses):
    y = 2.45 + index * 0.78
    add_rect(slide, 9.25, y, 3.20, 0.62, WHITE, line=BORDER)
    add_rect(slide, 9.25, y, 0.06, 0.62, INDIGO if index < 3 else GREEN)
    add_text(slide, code, 9.48, y + 0.08, 1.85, 0.25,
             size=10.5, color=NAVY, bold=True)
    add_text(slide, label, 11.35, y + 0.08, 0.95, 0.25,
             size=9.5, color=MUTED, align=PP_ALIGN.RIGHT)
add_text(slide, "Le déplacement d’une carte déclenche PATCH /tasks/:id/status.",
         9.25, 5.70, 3.20, 0.80, size=10, color=SLATE)
add_note("Tâches et tableau Kanban", "1:10",
         "La vue Kanban organise les tâches selon les quatre statuts de l’énumération : TODO, IN_PROGRESS, IN_REVIEW et DONE. "
         "Le déplacement d’une carte déclenche la route PATCH /tasks/:id/status. "
         "Le serveur met à jour completedAt, journalise l’activité et génère une notification selon les préférences de l’utilisateur.")

# ===========================================================================
# 24 — ÉQUIPE ET COLLABORATION
# ===========================================================================
slide = new_slide(4, "Équipe et collaboration", "Membres, commentaires et notifications")
panels = [
    (SHOTS / "08_admin_project_detail.png", "Détail du projet et membres", "08_admin_project_detail"),
    (SHOTS / "17_admin_task_comment_posted.png", "Commentaire publié", "17_admin_task_comment_posted"),
    (SHOTS / "24_admin_notifications.png", "Centre de notifications", "24_admin_notifications"),
]
for index, (path, label, qa) in enumerate(panels):
    x = 0.85 + index * 4.05
    add_rect(slide, x, 1.95, 3.55, 3.35, LIGHT, line=BORDER)
    add_image_fit(slide, path, x + 0.12, 2.08, 3.31, 2.55, name=f"anim_collab{index}")
    add_text(slide, label, x + 0.15, 4.73, 3.25, 0.28,
             size=10.5, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
    add_text(slide, qa, x + 0.15, 5.02, 3.25, 0.20,
             size=8, color=MUTED, align=PP_ALIGN.CENTER)
add_rect(slide, 0.85, 5.60, 11.60, 1.05, PALE_INDIGO, line=BORDER)
add_text(slide, "L’accès effectif dépend de l’appartenance au projet : owner_id ou ligne project_members.",
         1.10, 5.82, 11.10, 0.32, size=12.5, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
add_text(slide, "Les notifications sont filtrées par utilisateur, préférences et déduplication par tâche/jour.",
         1.10, 6.18, 11.10, 0.28, size=10.5, color=MUTED, align=PP_ALIGN.CENTER)
add_note("Équipe et collaboration", "1:05",
         "Ces trois captures montrent la gestion des membres, la publication d’un commentaire et le centre de notifications. "
         "L’accès à un projet dépend de l’appartenance : propriétaire ou ligne dans project_members. "
         "Les notifications sont générées à la demande ou par balayage horaire, puis filtrées selon l’utilisateur et ses préférences, avec une déduplication par tâche et par jour.")

# ===========================================================================
# 25 — RAPPORTS ET PARAMÈTRES
# ===========================================================================
slide = new_slide(4, "Rapports et préférences", "Fonctionnalités complémentaires documentées")
add_rect(slide, 0.85, 1.95, 5.65, 3.45, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "21_admin_reports.png", 1.02, 2.10, 5.30, 2.70,
              name="anim_reports")
add_text(slide, "Rapports et agrégats — capture QA 21_admin_reports",
         1.02, 4.90, 5.30, 0.24, size=9, color=MUTED, align=PP_ALIGN.CENTER)
add_rect(slide, 6.80, 1.95, 5.65, 3.45, LIGHT, line=BORDER)
add_image_fit(slide, SHOTS / "29_admin_settings_preferences.png", 6.97, 2.10, 5.30, 2.70,
              name="anim_prefs")
add_text(slide, "Préférences utilisateur — capture QA 29_admin_settings_preferences",
         6.97, 4.90, 5.30, 0.24, size=9, color=MUTED, align=PP_ALIGN.CENTER)
add_bullets(slide, [
    "Rapports : agrégats calculés côté serveur, répartition par statut et priorité",
    "Préférences : langue FR/EN, thème clair/sombre et notifications",
    "Aucun export PDF ou Excel n’est proposé dans l’application livrée",
], 0.95, 5.65, 11.45, 1.05, size=11, gap=7)
add_note("Rapports et préférences", "0:55",
         "La page de rapports exploite les agrégats calculés côté serveur : totaux, progression et répartitions. "
         "La page de préférences regroupe la langue, le thème et les notifications. "
         "Je souligne qu’aucun export PDF ou Excel n’est disponible dans l’application livrée ; c’est une perspective et non une fonctionnalité réalisée.")

# ===========================================================================
# 26 — TESTS
# ===========================================================================
slide = new_slide(4, "Validation et tests", "Résultats reportés par la campagne QA antérieure")
add_rect(slide, 0.85, 1.95, 3.55, 2.10, NAVY)
add_text(slide, "29/29", 1.10, 2.25, 3.05, 0.80, size=42, color=WHITE,
         bold=True, align=PP_ALIGN.CENTER)
add_text(slide, "cas réussis", 1.10, 3.10, 3.05, 0.35, size=14, color="BFDBFE",
         align=PP_ALIGN.CENTER)
add_text(slide, "4 tests de fondation + 25 tests d’intégration",
         1.10, 3.52, 3.05, 0.30, size=9.5, color="CBD5E1", align=PP_ALIGN.CENTER)
categories = [
    ("Santé et erreurs", "/health, 404 uniforme, JSON invalide"),
    ("Sécurité", "Helmet, RBAC, origines, rate limiting"),
    ("Métier", "Projets, tâches, progression, archivage"),
    ("Persistance", "Soft delete, notifications, audit"),
]
for index, (title, body) in enumerate(categories):
    x = 4.75 + (index % 2) * 4.05
    y = 1.95 + (index // 2) * 1.55
    add_card(slide, x, y, 3.55, 1.30, title, body,
             accent=INDIGO if index % 2 == 0 else CYAN,
             title_size=11.5, body_size=10)
add_rect(slide, 0.85, 5.25, 11.60, 1.35, PALE_AMBER, line="FED7AA")
add_text(slide, "Contexte important", 1.10, 5.45, 3.0, 0.30,
         size=11.5, color="92400E", bold=True)
add_text(slide, "Résultat provenant du suivi QA antérieur : lint, build et npm test réussis, /health en status: ok. "
               "Les tests n’ont pas été rejoués pendant la rédaction du rapport, faute d’instance MySQL active. "
               "Compatibilité multi-navigateur et accessibilité automatisée : NOT TESTED.",
         1.10, 5.82, 11.05, 0.65, size=10.2, color="78350F")
add_note("Validation et tests", "0:40",
         "La campagne reportée indique vingt-neuf tests réussis sur vingt-neuf. Elle couvre la santé de l’API, les erreurs, l’authentification, le RBAC, les projets, les tâches, la sécurité et la persistance. "
         "Je précise que ce résultat provient du suivi QA antérieur et n’a pas été reproduit pendant la rédaction du rapport. "
         "La compatibilité multi-navigateur et l’accessibilité automatisée restent NOT TESTED.")

# ===========================================================================
# 27 — BILAN
# ===========================================================================
slide = new_slide(5, "Bilan du projet", "Une chaîne complète, de la modélisation à la validation")
metrics = [
    ("12", "semaines de planning"),
    ("3", "rôles globaux + 2 rôles projet"),
    ("10", "tables fonctionnelles MySQL"),
    ("29/29", "tests réussis (campagne reportée)"),
    ("12", "captures QA intégrées"),
    ("5", "scénarios de séquence"),
]
for index, (value, label) in enumerate(metrics):
    col = index % 3
    row = index // 3
    x = 0.85 + col * 4.05
    y = 2.05 + row * 1.75
    add_rect(slide, x, y, 3.55, 1.45, WHITE, line=BORDER)
    add_rect(slide, x, y, 0.07, 1.45, INDIGO if index % 2 == 0 else CYAN)
    add_text(slide, value, x + 0.25, y + 0.16, 3.05, 0.55,
             size=27, color=INDIGO if index % 2 == 0 else CYAN, bold=True)
    add_text(slide, label, x + 0.25, y + 0.78, 3.05, 0.45,
             size=10.5, color=MUTED)
add_text(slide, "Objectifs atteints : plateforme développée, architecture vérifiée, base intégrée et fonctionnalités principales réalisées.",
         0.95, 5.95, 11.45, 0.55, size=13, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
add_note("Bilan du projet", "1:10",
         "Le projet livre une application full-stack complète : frontend React, API Express, base MySQL, authentification, RBAC et fonctionnalités principales. "
         "La planification couvre douze semaines et cinq sprints. "
         "Les preuves incluent douze captures QA, cinq scénarios de séquence et une campagne de vingt-neuf tests réussis reportée dans le suivi projet.")

# ===========================================================================
# 28 — LIMITES ET PERSPECTIVES
# ===========================================================================
slide = new_slide(5, "Difficultés, limites et perspectives", "Séparer l’existant des évolutions futures")
add_text(slide, "LIMITES DOCUMENTÉES", 0.90, 1.95, 5.55, 0.30,
         size=11, color=CYAN, bold=True)
add_bullets(slide, [
    "Transitions de statut acceptées par l’ENUM, sans machine à états",
    "Notifications d’échéance à la demande ou par balayage horaire",
    "Pas d’export PDF/Excel ni de rapports analytiques avancés",
    "Pas de tests React, multi-navigateur ni d’accessibilité automatisée",
    "Hébergement, secrets et sauvegardes non définis",
], 0.90, 2.35, 5.55, 3.75, size=11, gap=9)
add_text(slide, "PERSPECTIVES", 6.85, 1.95, 5.55, 0.30,
         size=11, color=CYAN, bold=True)
add_bullets(slide, [
    "Déploiement cloud avec HTTPS et gestion des secrets",
    "Notifications en temps réel via WebSocket ou SSE",
    "Rôles et permissions configurables",
    "Filtres temporels et export des rapports",
    "Tests de composants, accessibilité et mesures de charge",
], 6.85, 2.35, 5.55, 3.75, size=11, gap=9, marker=GREEN)
add_rect(slide, 1.10, 6.25, 11.10, 0.52, PALE_INDIGO, line=BORDER)
add_text(slide, "Les perspectives ci-dessus ne sont pas implémentées dans le code livré.",
         1.30, 6.36, 10.70, 0.30, size=11.5, color=NAVY, bold=True,
         align=PP_ALIGN.CENTER)
add_note("Difficultés, limites et perspectives", "1:10",
         "Parmi les limites documentées, on trouve l’absence de machine à états, l’absence d’export, des notifications non temps réel et l’absence de tests de compatibilité. "
         "Les perspectives les plus réalistes sont le déploiement cloud, les notifications temps réel, des rôles configurables et des tests automatisés plus complets. "
         "Je les présente explicitement comme des évolutions futures, pas comme des fonctionnalités déjà livrées.")

# ===========================================================================
# 29 — CONCLUSION
# ===========================================================================
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.background.fill.solid(); slide.background.fill.fore_color.rgb = rgb(NAVY)
add_rect(slide, 10.55, 0, 0.10, 7.5, INDIGO)
add_rect(slide, 11.05, 0, 0.03, 7.5, CYAN)
add_rect(slide, 11.35, 0, 0.16, 7.5, "1E3A8A")
add_logo(slide, 0.90, 0.70, 3.60)
add_text(slide, "WatchTower", 0.90, 1.85, 9.5, 0.80,
         size=38, color=WHITE, bold=True, name="anim_title")
add_text(slide, "Une gestion de projets plus centralisée, organisée et transparente.",
         0.92, 2.75, 10.8, 0.70, size=20, color="BFDBFE")
add_rect(slide, 0.92, 3.72, 2.10, 0.045, CYAN)
add_text(slide, "La problématique de départ trouve une réponse concrète dans une application full-stack dont l’architecture, les données et les tests ont été vérifiés à partir du code.",
         0.92, 4.05, 9.55, 1.05, size=14, color="E2E8F0")
add_text(slide, "Merci pour votre attention", 0.92, 5.55, 9.5, 0.50,
         size=21, color=WHITE, bold=True)
add_text(slide, "Questions / Réponses", 0.92, 6.12, 9.5, 0.38,
         size=15, color="7DD3FC")
add_note("Conclusion et remerciements", "0:40",
         "Pour conclure, WatchTower apporte une réponse concrète au besoin de centralisation de la gestion de projets. "
         "L’architecture, les données et les fonctionnalités principales ont été vérifiés à partir du code, et les limites ont été présentées sans dissimulation. "
         "Je vous remercie pour votre attention et je suis à votre disposition pour vos questions.")


# ===========================================================================
# ANIMATIONS ET TRANSITIONS NATIVES (OOXML)
# ===========================================================================

P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


def build_timing_xml(shape_ids: list[str]) -> str:
    """Construit une séquence d'entrées en fondu, déclenchée en un seul clic."""
    chunks = [
        f'<p:timing xmlns:p="{P_NS}" xmlns:a="{A_NS}">',
        '<p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">',
        '<p:childTnLst><p:seq concurrent="1" nextAc="seek">',
        '<p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>',
        '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>',
        '</p:stCondLst><p:childTnLst>',
    ]
    ctn = 4
    for index, sid in enumerate(shape_ids):
        delay = index * 350
        chunks.extend([
            f'<p:par><p:cTn id="{ctn}" fill="hold"><p:stCondLst>',
            f'<p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>',
            '<p:animEffect transition="in" filter="fade"><p:cBhvr>',
            f'<p:cTn id="{ctn + 1}" dur="500" fill="hold"/>',
            f'<p:tgtEl><p:spTgt spid="{sid}"/></p:tgtEl>',
            '</p:cBhvr></p:animEffect>',
            '</p:childTnLst></p:cTn></p:par>',
        ])
        ctn += 2
    chunks.extend([
        '</p:childTnLst></p:cTn></p:par>',
        '</p:childTnLst></p:cTn>',
        '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>',
        '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>',
        '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>',
    ])
    return "".join(chunks)


def apply_native_animations(path: Path) -> None:
    """Ajoute un fondu de transition et des entrées progressives natives."""
    import zipfile
    from lxml import etree

    ns = {"p": P_NS, "a": A_NS}
    with zipfile.ZipFile(path, "r") as archive:
        payload = {item.filename: archive.read(item.filename) for item in archive.infolist()}

    slide_files = sorted(
        (name for name in payload if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
        key=lambda name: int(re.search(r"slide(\d+)\.xml", name).group(1)),
    )
    animated_slides = 0
    for name in slide_files:
        root = etree.fromstring(payload[name])
        shape_ids = [
            node.get("id")
            for node in root.xpath(".//p:cSld/p:spTree//p:cNvPr", namespaces=ns)
            if (node.get("name") or "").startswith("anim_") and node.get("id")
        ]
        for tag in ("transition", "timing"):
            for element in root.findall(f"p:{tag}", ns):
                root.remove(element)
        transition = etree.fromstring(
            f'<p:transition xmlns:p="{P_NS}" spd="med"><p:fade/></p:transition>'
            .encode("utf-8")
        )
        anchor = root.find("p:clrMapOvr", ns)
        if anchor is None:
            anchor = root.find("p:cSld", ns)
        position = list(root).index(anchor) + 1
        root.insert(position, transition)
        if shape_ids:
            timing = etree.fromstring(build_timing_xml(shape_ids).encode("utf-8"))
            root.insert(position + 1, timing)
            animated_slides += 1
        payload[name] = etree.tostring(
            root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in payload.items():
            archive.writestr(name, data)
    print(f"Animations natives : {animated_slides}/{len(slide_files)} diapositives")


# ===========================================================================
# NOTES DU PRÉSENTATEUR — DOCX
# ===========================================================================


def build_notes_docx() -> None:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)
    normal = doc.styles["Normal"]
    normal.font.name = "Segoe UI"
    normal.font.size = Pt(10.5)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Segoe UI")
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.25

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("Notes du présentateur\nWatchTower — Soutenance de projet")
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = RGBColor(0x0F, 0x24, 0x49)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = sub.add_run("Samer Rayen Ncib  ·  durée totale : 25 minutes  ·  29 diapositives")
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    doc.add_heading("Répartition du temps", level=1)
    timing = [
        ("Partie", "Diapositives", "Durée"),
        ("Cadre du projet", "1–6", "4 min"),
        ("Conception et planning", "7–16", "7 min"),
        ("Choix techniques", "17–19", "4 min"),
        ("Réalisation", "20–26", "7 min"),
        ("Conclusion et perspectives", "27–29", "3 min"),
    ]
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, value in enumerate(timing[0]):
        cell = table.rows[0].cells[idx]
        cell.text = value
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    for row in timing[1:]:
        cells = table.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].text = value

    doc.add_heading("Script oral détaillé", level=1)
    for index, (slide_title, duration, text) in enumerate(SLIDE_NOTES, start=1):
        heading = doc.add_heading(f"Diapositive {index:02d} — {slide_title}", level=2)
        for run in heading.runs:
            run.font.color.rgb = RGBColor(0x0F, 0x24, 0x49)
        p = doc.add_paragraph()
        r = p.add_run(f"Durée indicative : {duration}")
        r.bold = True
        r.font.color.rgb = RGBColor(0x3B, 0x4F, 0xBA)
        doc.add_paragraph(text)

    note = doc.add_paragraph()
    note.add_run("Remarque : ").bold = True
    note.add_run(
        "Les résultats de tests et les outils non confirmés sont présentés exactement comme dans le rapport technique final. "
        "Aucune fonctionnalité future n’est décrite comme réalisée."
    )
    doc.save(NOTES_DOCX)


def main() -> None:
    for index, slide in enumerate(prs.slides):
        title, duration, text = SLIDE_NOTES[index]
        notes = slide.notes_slide.notes_text_frame
        notes.text = f"{title} — durée indicative : {duration}\n\n{text}"
    prs.save(PPTX)
    apply_native_animations(PPTX)
    build_notes_docx()
    print(f"PPTX généré : {PPTX}")
    print(f"Notes générées : {NOTES_DOCX}")
    print(f"Slides : {len(prs.slides)}")


if __name__ == "__main__":
    main()
