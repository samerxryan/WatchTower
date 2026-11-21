"""Figures 7.1 et 7.2 - Gantt et réseau PERT calculés (12 semaines)."""
from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import (  # noqa: E402
    SVG, NAVY, INDIGO, SLATE, MUTED, BORDER, GRID, WHITE, RED, GREEN, CYAN,
)

EXPORT = Path(__file__).resolve().parents[1] / "export"

# id, désignation, durée, semaine de début, prédécesseurs, livrable, sprint
TASKS = [
    ("A", "Analyse des besoins et spécification", 1, 1, [], "Cahier des charges fonctionnel", "S1"),
    ("B", "Conception et modélisation UML/ERD", 1, 2, ["A"], "Diagrammes de conception", "S1"),
    ("C", "Socle technique, migrations et API", 1, 3, ["B"], "Serveur Express + schéma MySQL", "S2"),
    ("D", "Authentification, JWT et RBAC", 1, 4, ["C"], "Endpoints /auth et gardes de rôle", "S2"),
    ("E", "Tableau de bord et préférences", 1, 5, ["D"], "Dashboard KPI, FR/EN, thèmes", "S3"),
    ("F", "Projets et gestion des membres", 2, 5, ["D"], "CRUD projets et project_members", "S3"),
    ("G", "Tâches et tableau Kanban", 2, 7, ["F"], "CRUD tâches, statuts, commentaires", "S4"),
    ("H", "Calendrier, timeline et rapports", 1, 7, ["F"], "Vues de synthèse côté serveur", "S4"),
    ("I", "Tests d'intégration et assurance qualité", 2, 9, ["E", "G", "H"], "Suite Vitest/Supertest + preuves QA", "S4–S5"),
    ("J", "Documentation et rapport technique", 2, 10, ["H"], "Rapport, diagrammes, annexes", "S5"),
    ("K", "Corrections et durcissement final", 1, 11, ["I", "J"], "Version candidate validée", "S5"),
    ("L", "Livraison et préparation de la soutenance", 1, 12, ["K"], "Livrables finaux", "Livraison"),
]

# ---------------------------------------------------------- calcul CPM
DURATION = {tid: dur for tid, _, dur, _, _, _, _ in TASKS}
PREDS = {tid: pred for tid, _, _, _, pred, _, _ in TASKS}
ES, EF = {}, {}
for tid, _, dur, _, preds, _, _ in TASKS:
    ES[tid] = max((EF[p] for p in preds), default=0)
    EF[tid] = ES[tid] + dur
PROJECT_DURATION = max(EF.values())
LS, LF = {}, {}
for tid, _, dur, _, preds, _, _ in reversed(TASKS):
    successors = [other for other, _, _, _, ps, _, _ in TASKS if tid in ps]
    LF[tid] = min((LS[s] for s in successors), default=PROJECT_DURATION)
    LS[tid] = LF[tid] - dur
FLOAT = {tid: LS[tid] - ES[tid] for tid in DURATION}
CRITICAL = {tid for tid in DURATION if FLOAT[tid] == 0}

print("CPM duration:", PROJECT_DURATION)
for tid, _, _, _, _, _, _ in TASKS:
    print(tid, "ES", ES[tid], "EF", EF[tid], "LS", LS[tid], "LF", LF[tid],
          "float", FLOAT[tid], "critical" if tid in CRITICAL else "")

# ================================================================= GANTT
g = SVG(1400, 860)
g.text(40, 27, "Planning Gantt prévisionnel — 12 semaines", size=15, weight="700",
       fill=NAVY)
g.text(1360, 27, "Les semaines sont des repères relatifs ; aucune date calendaire n'est supposée.",
       size=10.2, fill=MUTED, anchor="end")

# en-têtes sprints
sprints = [("Sprint 1", 1, 2, "#EEF2FF"), ("Sprint 2", 3, 4, "#E0F2FE"),
           ("Sprint 3", 5, 6, "#F0FDF4"), ("Sprint 4", 7, 9, "#FEFCE8"),
           ("Sprint 5", 10, 11, "#F5F3FF"), ("Livraison", 12, 12, "#FFF7ED")]
x0, week_w = 455, 74
for label, first, last, fill in sprints:
    x = x0 + (first - 1) * week_w
    w = (last - first + 1) * week_w
    g.rect(x, 52, w - 2, 26, fill=fill, stroke=BORDER, sw=1, rx=4)
    g.text(x + w / 2, 69, label, size=10.5, weight="700", fill=NAVY, anchor="middle")

for week in range(1, 13):
    x = x0 + (week - 1) * week_w
    g.line(x, 82, x, 690, stroke=GRID, sw=1)
    g.rect(x, 82, week_w - 2, 24, fill="#F8FAFC", stroke=BORDER, sw=1)
    g.text(x + week_w / 2, 99, f"S{week}", size=10.2, weight="700", fill=SLATE,
           anchor="middle")
g.line(x0 + 12 * week_w, 82, x0 + 12 * week_w, 690, stroke=GRID, sw=1)

row_y0, row_h = 112, 45
for index, (tid, name, dur, start, preds, deliverable, sprint) in enumerate(TASKS):
    y = row_y0 + index * row_h
    if index % 2 == 0:
        g.rect(40, y - 4, 1360, row_h - 2, fill="#FAFBFD", stroke="none")
    g.rect(40, y - 2, 26, 22, fill=NAVY if tid in CRITICAL else INDIGO,
           stroke="none", rx=5)
    g.text(53, y + 13, tid, size=10.5, weight="700", fill=WHITE, anchor="middle")
    g.text(76, y + 13, name, size=10.4, fill=NAVY)
    g.text(76, y + 28, f"Livrable : {deliverable}", size=8.6, fill=MUTED)
    g.text(392, y + 17, f"{dur} s.", size=9.4, fill=SLATE, anchor="end")
    bx = x0 + (start - 1) * week_w + 3
    bw = dur * week_w - 8
    color = INDIGO if tid in CRITICAL else CYAN
    g.rect(bx, y + 3, bw, 25, fill=color, stroke="none", rx=5)
    g.text(bx + bw / 2, y + 20, f"{tid} · {dur} s.", size=9.2, fill=WHITE,
           weight="700", anchor="middle")
    if preds:
        g.text(bx + bw + 8, y + 20, "← " + ",".join(preds), size=8.8, fill=MUTED)
    g.line(40, y + row_h - 4, 1400, y + row_h - 4, stroke=GRID, sw=0.7)

# jalons
milestones = [(4, "M1 : socle + authentification"), (8, "M2 : MVP fonctionnel"),
              (11, "M3 : version candidate"), (12, "M4 : livraison finale")]
for week, label in milestones:
    x = x0 + week * week_w - 2
    g.path(f"M {x} 668 L {x + 9} 678 L {x} 688 L {x - 9} 678 Z",
           fill=RED, stroke=RED, sw=1)
    g.text(x + 14, 682, label, size=9.3, fill=RED, weight="600")

g.rect(40, 710, 1360, 130, fill="#F8FAFC", stroke=BORDER, sw=1, rx=8)
g.text(56, 732, "Légende et lecture", size=11.5, weight="700", fill=NAVY)
g.rect(56, 744, 26, 14, fill=INDIGO, stroke="none", rx=3)
g.text(90, 756, "Activité du chemin critique (marge nulle)", size=10, fill=SLATE)
g.rect(390, 744, 26, 14, fill=CYAN, stroke="none", rx=3)
g.text(424, 756, "Activité avec marge (activité non critique)", size=10, fill=SLATE)
g.path("M 740 751 L 749 758 L 740 765 L 731 758 Z", fill=RED, stroke=RED)
g.text(760, 756, "Jalon de fin de phase ou de livraison", size=10, fill=SLATE)
g.text(56, 782, "Les chevauchements sont volontaires : les activités E, F et G démarrent en parallèle après l'authentification, puis les tests I"
       " recouvrent partiellement la documentation J.", size=9.8, fill=SLATE)
g.text(56, 803, "Les prédécesseurs indiqués à droite des barres correspondent exactement aux dépendances utilisées pour le réseau PERT de la figure 7.2.",
       size=9.8, fill=SLATE)
g.text(56, 824, "Hypothèse : une « semaine » est l'unité de planification ; l'étudiant unique assume les trois rôles Scrum, d'où les chevauchements entre activités.",
       size=9.8, fill=MUTED)
g.save(EXPORT / "figure_7_1_gantt.svg")

# ================================================================== PERT
p = SVG(1300, 560)
p.text(40, 27, "Réseau PERT — calcul des dates au plus tôt/tard et du chemin critique",
       size=15, weight="700", fill=NAVY)
p.text(1260, 27, f"Durée calculée du projet : {PROJECT_DURATION} semaines",
       size=11, weight="700", fill=RED, anchor="end")

POS = {
    "A": (45, 90), "B": (185, 90), "C": (325, 90), "D": (465, 90),
    "E": (615, 40), "F": (615, 170), "G": (615, 300),
    "H": (770, 110), "I": (770, 260),
    "J": (925, 90), "K": (925, 290),
    "L": (1100, 190),
}
NW, NH = 110, 76

edges = []
for tid, _, _, _, preds, _, _ in TASKS:
    for pred in preds:
        edges.append((pred, tid))

for src, dst in edges:
    x1, y1 = POS[src]
    x2, y2 = POS[dst]
    start = (x1 + NW, y1 + NH / 2)
    end = (x2, y2 + NH / 2)
    critical = src in CRITICAL and dst in CRITICAL
    color = RED if critical else "#94A3B8"
    mid_x = (start[0] + end[0]) / 2
    p.path(f"M {start[0]} {start[1]} L {mid_x} {start[1]} L {mid_x} {end[1]} L {end[0] - 8} {end[1]}",
           stroke=color, sw=2.3 if critical else 1.3,
           marker_end="arrow-red" if critical else "arrow-muted")

for tid, _, dur, _, _, _, _ in TASKS:
    x, y = POS[tid]
    critical = tid in CRITICAL
    fill = "#FEF2F2" if critical else "#F8FAFC"
    stroke = RED if critical else BORDER
    p.rect(x, y, NW, NH, fill=fill, stroke=stroke, sw=1.7 if critical else 1.2, rx=7)
    p.rect(x, y, NW, 20, fill=RED if critical else NAVY, stroke="none", rx=7)
    p.rect(x, y + 13, NW, 7, fill=RED if critical else NAVY, stroke="none")
    p.text(x + 8, y + 15, f"{tid} — {dur} s.", size=9.8, weight="700", fill=WHITE)
    p.text(x + 8, y + 34, f"ES {ES[tid]}  EF {EF[tid]}", size=9.2, fill=NAVY, family="Consolas, monospace")
    p.text(x + 8, y + 48, f"LS {LS[tid]}  LF {LF[tid]}", size=9.2, fill=SLATE, family="Consolas, monospace")
    p.text(x + 8, y + 64, "Marge 0" if critical else f"Marge {FLOAT[tid]}",
           size=9.2, weight="700", fill=RED if critical else GREEN)

p.rect(40, 420, 1220, 118, fill="#F8FAFC", stroke=BORDER, sw=1, rx=8)
p.text(56, 442, "Méthode de calcul", size=11.5, weight="700", fill=NAVY)
p.text(56, 460, "ES = maximum des EF des prédécesseurs ; EF = ES + durée ; LF = minimum des LS des successeurs ; LS = LF − durée ; marge = LS − ES.",
       size=9.8, fill=SLATE)
p.text(56, 479, "Chemin critique : " + " → ".join(tid for tid, _, _, _, _, _, _ in TASKS if tid in CRITICAL)
       + f"  (total {PROJECT_DURATION} semaines, toutes les marges y sont nulles).",
       size=10.2, weight="700", fill=RED)
p.text(56, 498, "Activités à marge : " + ", ".join(f"{tid} ({FLOAT[tid]} s.)" for tid in DURATION if tid not in CRITICAL)
       + ". Le réseau utilise exactement les mêmes durées et dépendances que le Gantt.",
       size=9.8, fill=SLATE)
p.text(56, 517, "Hypothèse de planification : durées exprimées en semaines relatives ; la durée du chemin critique est cohérente avec la durée prévisionnelle globale de 12 semaines.",
       size=9.5, fill=MUTED)
p.save(EXPORT / "figure_7_2_pert.svg")
print("gantt + pert SVG written")
