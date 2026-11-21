"""Figure 4.2 - diagramme global de cas d'utilisation."""
from __future__ import annotations

import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import (  # noqa: E402
    SVG, NAVY, INDIGO, SLATE, MUTED, BORDER, WHITE,
)

W, H = 1240, 980
svg = SVG(W, H)

svg.text(40, 30, "Cas d'utilisation de WatchTower", size=15, weight="700", fill=NAVY)
svg.text(1200, 30, "Acteurs et règles issus de server/src/services/accessControl.js",
         size=10.5, fill=MUTED, anchor="end")

BX, BY, BW, BH = 285, 52, 690, 790
svg.rect(BX, BY, BW, BH, fill="#FCFDFF", stroke=INDIGO, sw=1.6, rx=18, dash="7 5")
svg.text(BX + BW / 2, BY + 28, "WatchTower — plateforme de gestion de projets",
         size=13, weight="700", fill=INDIGO, anchor="middle")
svg.text(BX + BW / 2, BY + 45, "Frontière du système", size=10, fill=MUTED,
         anchor="middle", italic=True)

RX, RY = 101, 35

UC = {
    "A1": (425, 135, ["S'inscrire"], "#EEF2FF"),
    "A2": (645, 135, ["Se connecter"], "#EEF2FF"),
    "A3": (855, 135, ["Réinitialiser", "le mot de passe"], "#EEF2FF"),
    "P1": (425, 260, ["Consulter", "ses projets"], "#F0F9FF"),
    "A4": (645, 260, ["Gérer son profil", "et ses préférences"], "#F0F9FF"),
    "A5": (855, 260, ["Se déconnecter"], "#F0F9FF"),
    "P5": (425, 385, ["Consulter le détail", "d'un projet"], "#F0F9FF"),
    "T5": (645, 385, ["Consulter le tableau", "de bord et les rapports"], "#F0F9FF"),
    "T4": (855, 385, ["Consulter le", "calendrier"], "#F0F9FF"),
    "T2": (425, 510, ["Changer le statut", "d'une tâche"], "#F0F9FF"),
    "T3": (645, 510, ["Commenter", "une tâche"], "#F0F9FF"),
    "T1": (855, 510, ["Créer ou modifier", "une tâche"], "#F5F3FF"),
    "P2": (425, 635, ["Créer ou modifier", "un projet"], "#F5F3FF"),
    "P4": (645, 635, ["Gérer les membres", "du projet"], "#F5F3FF"),
    "P3": (855, 635, ["Archiver", "un projet"], "#F5F3FF"),
    "I1": (645, 750, ["Contrôler les droits", "sur la tâche"], "#FFFFFF"),
    "AD1": (855, 750, ["Gérer les comptes", "et les rôles"], "#FEFCE8"),
}


def actor(cx: float, cy: float, name: str, role: str) -> tuple[float, float]:
    svg.circle(cx, cy - 27, 9.5, fill=WHITE, stroke=NAVY, sw=1.8)
    svg.line(cx, cy - 17, cx, cy + 5, stroke=NAVY, sw=2)
    svg.line(cx - 18, cy - 9, cx + 18, cy - 9, stroke=NAVY, sw=2)
    svg.line(cx, cy + 5, cx - 15, cy + 28, stroke=NAVY, sw=2)
    svg.line(cx, cy + 5, cx + 15, cy + 28, stroke=NAVY, sw=2)
    svg.text(cx, cy + 47, name, size=11.8, weight="700", fill=NAVY, anchor="middle")
    svg.text(cx, cy + 62, role, size=9.6, fill=MUTED, anchor="middle")
    return cx, cy - 6


def link(actor_pt: tuple[float, float], key: str,
         color: str = "#94A3B8", sw: float = 1.15) -> None:
    ax, ay = actor_pt
    cx, cy = UC[key][0], UC[key][1]
    dx, dy = cx - ax, cy - ay
    length = math.hypot(dx, dy)
    if length == 0:
        return
    ux, uy = dx / length, dy / length
    t = 1 / math.sqrt((ux / RX) ** 2 + (uy / RY) ** 2)
    ex, ey = cx - ux * t, cy - uy * t
    svg.line(ax, ay, ex, ey, stroke=color, sw=sw)


# ------------------------------------------------------------------ acteurs
p_visiteur = actor(125, 155, "Visiteur", "non authentifié")
p_membre = actor(125, 400, "Membre d'équipe", "TEAM_MEMBER")
p_chef = actor(125, 690, "Chef de projet", "PROJECT_MANAGER")
p_admin = actor(1115, 735, "Administrateur", "ADMIN")

# ------------------------------------------------------------ associations
for key in ("A1", "A2", "A3"):
    link(p_visiteur, key, color="#A5B4FC")
for key in ("P1", "A4", "A5", "P5", "T5", "T4", "T2", "T3"):
    link(p_membre, key, color="#7DD3FC")
for key in ("P1", "P5", "T5", "T4", "T2", "T3", "T1", "P2", "P4", "P3"):
    link(p_chef, key, color="#C4B5FD")
link(p_admin, "AD1", color="#FACC15", sw=1.5)

# include T2 -> I1 : contourne P2 et P4 par la gauche
svg.path("M 425 545 L 425 566 L 307 566 L 307 750 L 540 750",
         stroke=MUTED, sw=1.3, dash="6 4", marker_end="open")
svg.text(360, 558, "«include»", size=10.5, fill=MUTED, anchor="middle", italic=True)

# ------------------------------------------------------- ellipses (au-dessus)
for cx, cy, title, fill in UC.values():
    svg.ellipse(cx, cy, RX, RY, fill=fill, stroke=INDIGO, sw=1.35)
    start_y = cy - (len(title) - 1) * 6.4 + 4
    for index, line in enumerate(title):
        svg.text(cx, start_y + index * 12.8, line, size=10.5, fill=NAVY,
                 anchor="middle", weight="500")

# ---------------------------------------------------------------- légende
LX, LY = 40, 862
svg.rect(LX, LY, 1160, 92, fill="#F8FAFC", stroke=BORDER, sw=1, rx=10)
svg.text(LX + 16, LY + 22, "Lecture du diagramme", size=11.5, weight="700", fill=NAVY)
svg.text(LX + 16, LY + 40,
         "Le chef de projet cumule les cas d'utilisation du membre sur les projets qu'il possède ou gère ; "
         "l'administrateur dispose en plus des droits globaux de gestion.",
         size=10.2, fill=SLATE)
svg.text(LX + 16, LY + 57,
         "Aucune généralisation entre acteurs n'est utilisée : l'accès effectif dépend de l'appartenance au projet "
         "(owner_id ou ligne project_members), pas du seul rôle global.",
         size=10.2, fill=SLATE)
svg.text(LX + 16, LY + 76,
         "«include» : le changement de statut déclenche systématiquement le contrôle des droits (assertTaskAccess) "
         "avant toute écriture en base.",
         size=10.2, fill=MUTED, italic=True)

svg.save(Path(__file__).resolve().parents[1] / "export" / "figure_4_2_cas_utilisation.svg")
print("use case SVG written")
