"""Figure 4.1 - architecture technique réelle de WatchTower."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import (  # noqa: E402
    SVG, NAVY, INDIGO, INDIGO_LIGHT, CYAN, SLATE, MUTED, BORDER, GRID,
    WHITE, BG, RED, GREEN, AMBER, CYAN_LIGHT, boxed_title,
)

W, H = 1240, 860
svg = SVG(W, H)

# ------------------------------------------------------------------ légende
svg.text(40, 26, "Architecture logique en trois couches", size=15,
         weight="700", fill=NAVY)
svg.text(1200, 26, "Source : code source WatchTower (client/src, server/src)",
         size=10.5, fill=MUTED, anchor="end")

# ================================================================ CLIENT
svg.rect(40, 44, 1160, 222, fill="#F5F3FF", stroke="#C7D2FE", sw=1.4, rx=14)
svg.text(60, 70, "NAVIGATEUR — APPLICATION MONOPAGE REACT 19", size=13,
         weight="700", fill=INDIGO)
svg.text(60, 87, "Vite 8 en développement · build statique servi par Express en production",
         size=10.5, fill=SLATE)

client_boxes = [
    (60, 104, 200, 138, "React Router 7", [
        "Routes publiques : /login,",
        "/register, /forgot-password,",
        "/reset-password",
        "Routes protégées + garde",
        "de rôle (/team)",
    ], "#EEF2FF"),
    (276, 104, 330, 138, "Pages et composants métier", [
        "Dashboard · Projets · Détail projet",
        "Mes tâches · Kanban · Calendrier",
        "Timeline · Rapports · Équipe",
        "Notifications · Réglages",
    ], "#EEF2FF"),
    (622, 104, 260, 138, "Contextes transverses", [
        "AuthContext : session, login/logout",
        "ThemeContext : clair / sombre",
        "I18nContext : français / anglais",
        "Composants UI : Button, Modal,",
        "DataState, SemanticLabels",
    ], "#EEF2FF"),
    (898, 104, 282, 138, "apiClient.js", [
        "fetch('/api/v1' + chemin)",
        "credentials: 'include'",
        "401 → un seul refresh mutualisé",
        "puis rejeu de la requête",
        "Événement auth-expired",
    ], "#EEF2FF"),
]
for x, y, w, h, title, rows, fill in client_boxes:
    svg.rect(x, y, w, h, fill=fill, stroke="#A5B4FC", sw=1.2, rx=9)
    svg.text(x + 12, y + 24, title, size=12.5, weight="700", fill=NAVY)
    svg.lines(x + 12, y + 46, rows, size=10.6, leading=16.2, fill=SLATE)

# ============================================================ PROTOCOLE
svg.line(620, 266, 620, 318, stroke=INDIGO, sw=2.4, marker_end="arrow-indigo")
svg.rect(430, 274, 380, 36, fill=WHITE, stroke="#A5B4FC", rx=8)
svg.text(620, 297, "HTTPS · JSON · REST — /api/v1", size=12.5, weight="700",
         fill=INDIGO, anchor="middle")
svg.text(830, 286, "Cookies HttpOnly :", size=10.4, fill=SLATE, weight="600")
svg.text(830, 301, "wt_access (JWT 15 min) · wt_refresh (7 j, haché)", size=10.4, fill=SLATE)

# ================================================================ SERVEUR
svg.rect(40, 318, 1160, 330, fill="#F0F9FF", stroke="#BAE6FD", sw=1.4, rx=14)
svg.text(60, 344, "SERVEUR — NODE.JS 20+ ET EXPRESS 5", size=13, weight="700",
         fill=CYAN)
svg.text(60, 361, "API REST découpée en modules ; aucune requête SQL n'est écrite dans le frontend",
         size=10.5, fill=SLATE)

# middleware
svg.rect(60, 374, 1120, 48, fill="#E0F2FE", stroke="#7DD3FC", sw=1.1, rx=8)
svg.text(74, 394, "Chaîne de middlewares", size=11.5, weight="700", fill=CYAN)
svg.text(74, 411, "Helmet · CORS avec identifiants · cookie-parser · JSON (1 Mo) · garde d'origine · limiteurs de débit",
         size=10.5, fill=SLATE)
svg.text(1162, 411, "60/15 min · 10/15 min · 5/h", size=10, fill=MUTED, anchor="end")

# routers
svg.text(60, 446, "Routeurs montés sous /api/v1", size=10.5, weight="700", fill=CYAN)
routers = [
    ("auth.routes.js", "8 endpoints"),
    ("users.routes.js", "9 endpoints"),
    ("projects.routes.js", "9 endpoints"),
    ("tasks + comments", "12 endpoints"),
    ("notifications", "4 endpoints"),
    ("insights.routes.js", "4 endpoints"),
]
rx0, ry, rw, rh, gap = 60, 454, 176, 44, 13
for index, (name, count) in enumerate(routers):
    x = rx0 + index * (rw + gap)
    svg.rect(x, ry, rw, rh, fill=WHITE, stroke="#7DD3FC", sw=1.2, rx=8)
    svg.text(x + 10, ry + 19, name, size=11.2, weight="700", fill=NAVY)
    svg.text(x + 10, ry + 34, count, size=10, fill=MUTED)

# middleware auth + validation band
svg.rect(60, 512, 1120, 40, fill=WHITE, stroke="#BAE6FD", sw=1.1, rx=8)
svg.text(74, 530, "authenticate (JWT ou session de rafraîchissement) · requireRoles(ADMIN, PROJECT_MANAGER)",
         size=10.6, weight="600", fill=NAVY)
svg.text(74, 545, "validate({ params, query, body }) avec schémas Zod · erreurs normalisées { success:false, error:{ code, message, details } }",
         size=10.2, fill=SLATE)

# services
services = [
    ("authService", "bcrypt 12 tours · JWT\nsessions opaques hachées"),
    ("accessControl", "RBAC projet / tâche\nrègles d'archivage"),
    ("notificationService", "affectation · statut\néchéances dédupliquées"),
    ("repositories", "SQL paramétré\nwithTransaction"),
]
sx = 60
for name, desc in services:
    svg.rect(sx, 566, 268, 62, fill="#F8FAFC", stroke="#7DD3FC", sw=1.1, rx=8)
    svg.text(sx + 12, 585, name, size=11.5, weight="700", fill=CYAN)
    svg.text(sx + 12, 601, desc.split("\n")[0], size=9.9, fill=SLATE)
    svg.text(sx + 12, 615, desc.split("\n")[1], size=9.9, fill=SLATE)
    sx += 281

# ============================================================ MYSQL
svg.line(620, 648, 620, 692, stroke=GREEN, sw=2.4, marker_end="arrow-green")
svg.rect(520, 656, 200, 34, fill=WHITE, stroke="#86EFAC", rx=8)
svg.text(620, 678, "SQL — pool mysql2 · transactions", size=11.5, weight="700",
         fill=GREEN, anchor="middle")

svg.rect(40, 692, 1160, 118, fill="#F0FDF4", stroke="#BBF7D0", sw=1.4, rx=14)
svg.text(60, 718, "MYSQL 8 — BASE watchtower_db", size=13, weight="700",
         fill=GREEN)
svg.text(60, 735, "InnoDB · utf8mb4_unicode_ci · horodatages UTC · migrations versionnées 001 → 004",
         size=10.5, fill=SLATE)
tables = [
    "users", "projects", "project_members", "tasks", "comments",
    "notifications", "activity_logs", "user_sessions",
    "password_reset_tokens", "audit_logs",
]
tx, ty = 60, 750
for index, table in enumerate(tables):
    col = index % 5
    row = index // 5
    x = tx + col * 220
    y = ty + row * 25
    svg.rect(x, y, 202, 20, fill=WHITE, stroke="#86EFAC", sw=1, rx=5)
    svg.text(x + 8, y + 14, table, size=9.8, fill=NAVY, family="'Cascadia Mono', Consolas, monospace")

# note
svg.rect(40, 822, 1160, 26, fill="#FFF7ED", stroke="#FED7AA", rx=6)
svg.text(52, 839, "Règle structurante : le navigateur ne dialogue jamais directement avec MySQL ; l'API valide, autorise et journalise chaque opération.",
         size=10.2, fill=AMBER)

svg.save(Path(__file__).resolve().parents[1] / "export" / "figure_4_1_architecture.svg")
print("architecture SVG written")
