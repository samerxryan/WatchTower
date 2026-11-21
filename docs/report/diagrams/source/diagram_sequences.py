"""Figures 4.5 Ã  4.9 - cinq diagrammes de sÃ©quence vÃ©rifiÃ©s dans le code."""
from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import (  # noqa: E402
    SVG, NAVY, INDIGO, SLATE, MUTED, BORDER, WHITE, BG, RED, GREEN,
)

EXPORT = Path(__file__).resolve().parents[1] / "export"
H = 1040
TOP = 130
BOTTOM = 840


def sequence(filename: str, title: str, participants: list[list[str]],
             messages: list[dict], notes: list[dict],
             activations: list[tuple[int, int, int]], sources: str) -> None:
    svg = SVG(1240, H)
    svg.text(40, 28, title, size=15, weight="700", fill=NAVY)
    svg.text(1200, 28, sources, size=10.2, fill=MUTED, anchor="end")

    n = len(participants)
    step = 950 / (n - 1)
    xs = [145 + index * step for index in range(n)]
    box_w = min(172, step - 18)

    for index, label_lines in enumerate(participants):
        x = xs[index]
        svg.rect(x - box_w / 2, 46, box_w, 62,
                 fill="#EEF2FF" if index in (0, n - 1) else "#F8FAFC",
                 stroke=INDIGO if index in (0, n - 1) else BORDER, sw=1.35, rx=8)
        start = 70 - (len(label_lines) - 1) * 6
        for line_index, line in enumerate(label_lines):
            svg.text(x, start + line_index * 12, line, size=10.4,
                     weight="700" if line_index == 0 else "normal",
                     fill=NAVY, anchor="middle")
        svg.line(x, 108, x, BOTTOM, stroke="#94A3B8", sw=1.1, dash="5 5")

    for idx, y1, y2 in activations:
        x = xs[idx]
        svg.rect(x - 7, y1, 14, y2 - y1, fill="#E0E7FF", stroke=INDIGO,
                 sw=1, opacity=0.85)

    for number, message in enumerate(messages, start=1):
        src = xs[message["from"]]
        dst = xs[message["to"]]
        y = message["y"]
        dashed = message.get("dashed", False)
        color = message.get("color", SLATE)
        if src == dst:
            svg.path(f"M {src} {y} L {src + 24} {y} L {src + 24} {y + 16} L {src + 6} {y + 16}",
                     stroke=color, sw=1.35, dash="5 4" if dashed else None,
                     marker_end="open")
            label_x = src + 30
            anchor = "start"
        else:
            marker = "open" if not dashed else "open"
            svg.line(src, y, dst, y, stroke=color, sw=1.4,
                     dash="6 4" if dashed else None, marker_end=marker)
            label_x = (src + dst) / 2
            anchor = "middle"
        label = message["label"]
        approx = len(label) * 5.25
        svg.rect(label_x - approx / 2 - 4 if anchor == "middle" else label_x - 3,
                 y - 13, approx + 8, 14, fill=WHITE, stroke="none")
        svg.text(label_x, y - 3, label, size=10.0, fill=color, anchor=anchor,
                 weight="600" if not dashed else "normal")
        svg.circle(52, y, 9, fill="#F1F5F9", stroke=BORDER)
        svg.text(52, y + 3.2, str(number), size=8.6, fill=MUTED, anchor="middle")

    for note in notes:
        x, y, w = note["x"], note["y"], note["w"]
        lines = note["lines"]
        h = 18 + len(lines) * 15
        fill = note.get("fill", "#FFFBEB")
        stroke = note.get("stroke", "#FCD34D")
        svg.rect(x, y, w, h, fill=fill, stroke=stroke, sw=1.1, rx=6)
        svg.text(x + 10, y + 16, lines[0], size=9.6, weight="700", fill=NAVY)
        for index, line in enumerate(lines[1:], start=1):
            svg.text(x + 10, y + 16 + index * 15, line, size=9.3, fill=SLATE)

    svg.line(40, 975, 1200, 975, stroke=BORDER, sw=1)
    svg.text(40, 998, "Lecture : les flÃ¨ches pleines sont des appels, les flÃ¨ches en pointillÃ©s des retours ; les bandes verticales reprÃ©sentent l'activation du composant.",
             size=9.6, fill=MUTED)
    svg.save(EXPORT / filename)


def msg(frm: int, to: int, y: int, label: str, **kwargs) -> dict:
    return {"from": frm, "to": to, "y": y, "label": label, **kwargs}


# ---------------------------------------------------------- 4.5 inscription
sequence(
    "figure_4_5_sequence_auth.svg",
    "ScÃ©nario 1 â€” inscription et connexion",
    [
        ["Utilisateur", ""], ["Interface React", "RegisterPage / LoginPage"],
        ["API REST", "auth.routes.js"], ["authService", ""],
        ["MySQL 8", "users, user_sessions, audit_logs"],
    ],
    [
        msg(0, 1, 150, "Renseigne l'inscription et soumet"),
        msg(1, 2, 196, "POST /api/v1/auth/register"),
        msg(2, 2, 242, "validate(registerSchema) â€” Zod", color=INDIGO),
        msg(2, 4, 288, "userRepository.emailExists(email)"),
        msg(4, 2, 334, "absent", dashed=True),
        msg(2, 3, 380, "hashPassword(password) â€” bcrypt 12"),
        msg(3, 2, 426, "passwordHash", dashed=True),
        msg(2, 4, 472, "INSERT users (role = TEAM_MEMBER)"),
        msg(4, 2, 518, "ligne crÃ©Ã©e", dashed=True),
        msg(2, 1, 564, "201 { success, data: { user } }", dashed=True),
        msg(1, 0, 610, "Redirection vers /login", dashed=True),
        msg(0, 1, 656, "Saisit email / mot de passe et se connecte"),
        msg(1, 2, 702, "POST /api/v1/auth/login"),
        msg(2, 4, 748, "findUserByEmail + INSERT audit LOGIN_SUCCESS"),
        msg(4, 2, 794, "utilisateur actif + hash", dashed=True),
        msg(2, 3, 840, "verifyPassword puis createSession"),
    ],
    [
        {"x": 830, "y": 870, "w": 370, "lines": [
            "Retour de connexion (suite)",
            "authService â†’ MySQL : INSERT user_sessions(token_hash)",
            "authService â†’ API : JWT wt_access + token wt_refresh",
            "API â†’ React : 200 + cookies HttpOnly (SameSite=Lax)",
            "React â†’ Utilisateur : session active, navigation vers /",
        ], "fill": "#E0F2FE", "stroke": "#7DD3FC"},
    ],
    [(2, 190, 570), (3, 374, 430), (4, 280, 340)],
    "server/src/modules/auth/auth.routes.js Â· services/authService.js Â· repositories/userRepository.js",
)

# ------------------------------------------------------------ 4.6 projet
sequence(
    "figure_4_6_sequence_projet.svg",
    "ScÃ©nario 2 â€” crÃ©ation d'un projet",
    [
        ["Utilisateur", "rÃ´le ADMIN ou PROJECT_MANAGER"],
        ["Interface React", "ProjectsPage"],
        ["Middlewares", "authenticate + requireRoles"],
        ["API REST", "projects.routes.js"],
        ["MySQL 8", "projects, project_members, activity_logs"],
    ],
    [
        msg(0, 1, 150, "Remplit le formulaire et valide"),
        msg(1, 3, 196, "POST /api/v1/projects"),
        msg(3, 2, 242, "authenticate puis requireRoles(...)"),
        msg(2, 3, 288, "req.user (id, role)", dashed=True),
        msg(3, 3, 334, "validate(createProjectSchema) + validateDateRange", color=INDIGO),
        msg(3, 4, 380, "BEGIN Â· INSERT projects (owner_id = req.user.id)"),
        msg(4, 3, 426, "projectId", dashed=True),
        msg(3, 4, 472, "INSERT project_members (projectRole = MANAGER)"),
        msg(3, 4, 518, "INSERT activity_logs PROJECT_CREATED Â· COMMIT"),
        msg(4, 3, 564, "transaction validÃ©e", dashed=True),
        msg(3, 1, 610, "201 { success, data: projet sÃ©rialisÃ© }", dashed=True),
        msg(1, 0, 656, "Liste actualisÃ©e, accÃ¨s au dÃ©tail", dashed=True),
    ],
    [
        {"x": 690, "y": 870, "w": 510, "lines": [
            "RÃ¨gles vÃ©rifiÃ©es dans projects.routes.js",
            "Un projet ne peut pas Ãªtre crÃ©Ã© directement ARCHIVED.",
            "La date de fin ne peut pas prÃ©cÃ©der la date de dÃ©but.",
            "Le crÃ©ateur est inscrit comme propriÃ©taire et MANAGER du projet.",
        ], "fill": "#EEF2FF", "stroke": "#A5B4FC"},
    ],
    [(3, 190, 570), (2, 236, 292), (4, 374, 568)],
    "server/src/modules/projects/projects.routes.js Â· repositories/projectRepository.js",
)

# ------------------------------------------------------ 4.7 tÃ¢che + assignÃ©
sequence(
    "figure_4_7_sequence_tache.svg",
    "ScÃ©nario 3 â€” crÃ©ation et attribution d'une tÃ¢che",
    [
        ["Utilisateur", "ADMIN ou MANAGER de projet"],
        ["Interface React", "KanbanPage / formulaire"],
        ["API REST", "projectTasksRouter"],
        ["accessControl", "services/accessControl.js"],
        ["notificationService", "services/notificationService.js"],
        ["MySQL 8", "tasks, comments, activity_logs, notifications"],
    ],
    [
        msg(0, 1, 150, "CrÃ©e une tÃ¢che et choisit un responsable"),
        msg(1, 2, 196, "POST /projects/:projectId/tasks"),
        msg(2, 2, 242, "authenticate + validate(createTaskSchema)", color=INDIGO),
        msg(2, 5, 288, "findProjectAccess(projectId, userId)"),
        msg(5, 2, 334, "projet + member_role", dashed=True),
        msg(2, 3, 380, "assertProjectAccess(manage) + assertProjectWritable"),
        msg(3, 2, 426, "canManage = vrai", dashed=True),
        msg(2, 5, 472, "findUserById + findMember(assigneeId)"),
        msg(5, 2, 518, "responsable actif et membre", dashed=True),
        msg(2, 5, 564, "BEGIN Â· INSERT tasks (status = TODO)"),
        msg(2, 5, 610, "INSERT activity_logs TASK_CREATED"),
        msg(2, 4, 656, "notifyTaskAssigned(...)"),
        msg(4, 5, 702, "INSERT notifications TASK_ASSIGNED"),
        msg(5, 2, 748, "COMMIT", dashed=True),
        msg(2, 1, 794, "201 { success, data: tÃ¢che }", dashed=True),
        msg(1, 0, 840, "Carte affichÃ©e dans la colonne TODO", dashed=True),
    ],
    [],
    [(2, 190, 752), (3, 374, 430), (4, 650, 706), (5, 282, 752)],
    "server/src/modules/tasks/tasks.routes.js Â· services/accessControl.js Â· services/notificationService.js",
)

# -------------------------------------------------------------- 4.8 statut
sequence(
    "figure_4_8_sequence_statut.svg",
    "ScÃ©nario 4 â€” modification du statut d'une tÃ¢che",
    [
        ["Utilisateur", "membre du projet"],
        ["Interface React", "KanbanPage"],
        ["API REST", "tasks.routes.js"],
        ["accessControl", "services/accessControl.js"],
        ["notificationService", "services/notificationService.js"],
        ["MySQL 8", "tasks, activity_logs, notifications"],
    ],
    [
        msg(0, 1, 150, "DÃ©place la carte vers IN_PROGRESS"),
        msg(1, 2, 196, "PATCH /tasks/:taskId/status { status }"),
        msg(2, 2, 242, "validate(updateTaskStatusSchema)", color=INDIGO),
        msg(2, 5, 288, "findTaskAccess(taskId, userId)"),
        msg(5, 2, 334, "tÃ¢che + projet + member_role", dashed=True),
        msg(2, 3, 380, "assertTaskAccess + ensureProjectWritableStatus"),
        msg(2, 3, 426, "canChangeStatus (membre autorisÃ©)"),
        msg(3, 2, 472, "autorisation accordÃ©e", dashed=True),
        msg(2, 5, 518, "BEGIN Â· UPDATE tasks (status, completed_at)"),
        msg(2, 5, 564, "INSERT activity_logs STATUS_CHANGED"),
        msg(2, 4, 610, "notifyTaskStatusChanged(...)"),
        msg(4, 5, 656, "SELECT propriÃ©taire + managers du projet"),
        msg(5, 4, 702, "destinataires actifs", dashed=True),
        msg(4, 5, 748, "INSERT notifications (1 par destinataire)"),
        msg(5, 2, 794, "COMMIT", dashed=True),
        msg(2, 1, 840, "200 { success, data: tÃ¢che }", dashed=True),
    ],
    [
        {"x": 830, "y": 870, "w": 370, "lines": [
            "RÃ¨gles vÃ©rifiÃ©es",
            "Un projet archivÃ© est en lecture seule.",
            "Aucune auto-notification de l'acteur.",
            "PrÃ©fÃ©rence statusChange respectÃ©e.",
        ], "fill": "#F0FDF4", "stroke": "#86EFAC"},
    ],
    [(2, 190, 844), (3, 374, 476), (4, 604, 752), (5, 282, 798)],
    "server/src/modules/tasks/tasks.routes.js Â· services/accessControl.js Â· services/notificationService.js",
)

# ------------------------------------------------------------ 4.9 dashboard
sequence(
    "figure_4_9_sequence_dashboard.svg",
    "ScÃ©nario 5 â€” consultation du tableau de bord",
    [
        ["Utilisateur", ""], ["Interface React", "DashboardPage"],
        ["apiClient", "services/apiClient.js"],
        ["API REST", "reports / projects / tasks / activity"],
        ["MySQL 8", "projects, tasks, activity_logs"],
    ],
    [
        msg(0, 1, 150, "Ouvre la page d'accueil /"),
        msg(1, 1, 196, "Promise.all : 4 appels parallÃ¨les", color=INDIGO),
        msg(1, 2, 242, "GET /projects?limit=100, /tasks?limit=100"),
        msg(1, 2, 288, "GET /reports/summary, /activity?limit=100"),
        msg(2, 3, 334, "fetch avec credentials: 'include'"),
        msg(3, 3, 380, "authenticate + contrÃ´le d'accÃ¨s par utilisateur", color=INDIGO),
        msg(3, 4, 426, "SELECT projets et tÃ¢ches accessibles"),
        msg(4, 3, 472, "lignes + agrÃ©gats member_count / task_count", dashed=True),
        msg(3, 3, 518, "calcul total, DONE, en retard, progression", color=INDIGO),
        msg(3, 2, 564, "200 { success, data, meta }", dashed=True),
        msg(2, 1, 610, "payloads JSON", dashed=True),
        msg(1, 0, 656, "KPI, tÃ¢ches, Ã©chÃ©ances, activitÃ©", dashed=True),
    ],
    [
        {"x": 700, "y": 870, "w": 500, "lines": [
            "Indicateurs calculÃ©s cÃ´tÃ© serveur dans reportsRouter :",
            "totalProjects Â· totalTasks Â· completedTasks Â· pendingTasks",
            "overdueTasks Â· overallProgress Â· tasksByStatus Â· tasksByPriority",
            "Le client utilise limit=100 pour Ã©viter une troncature des vues globales.",
        ], "fill": "#E0F2FE", "stroke": "#7DD3FC"},
    ],
    [(1, 190, 660), (2, 236, 570), (3, 374, 568), (4, 420, 476)],
    "client/src/features/dashboard/DashboardPage.jsx Â· server/src/modules/insights/insights.routes.js",
)

print("5 sequence SVGs written")

