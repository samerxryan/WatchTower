"""Figures 4.3 and 4.4 - domain class model and MySQL relational schema."""
from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))

from svgkit import (  # noqa: E402
    SVG, NAVY, INDIGO, CYAN, SLATE, MUTED, BORDER, GRID, WHITE, BG,
    RED, GREEN, AMBER, VIOLET, FONT, MONO,
)

EXPORT = Path(__file__).resolve().parents[1] / "export"

# =========================================================== 4.3 CLASSES
svg = SVG(1240, 940)
svg.text(40, 28, "Modèle de classes du domaine (classes persistantes)", size=15,
         weight="700", fill=NAVY)
svg.text(1200, 28, "Attributs dérivés des migrations 001–004 ; aucun ORM, comportement dans les services",
         size=10.5, fill=MUTED, anchor="end")

CLASSES = {
    "User": (40, 62, 285, "« entité »  User", [
        "+ id : BIGINT «PK»", "+ fullName : VARCHAR(120)", "+ email : VARCHAR(255) «UQ»",
        "+ passwordHash : VARCHAR(255)", "+ role : ADMIN | PROJECT_MANAGER | TEAM_MEMBER",
        "+ avatarUrl : VARCHAR(500)", "+ isActive : BOOLEAN", "+ preferredLanguage : fr | en",
        "+ preferredTheme : light | dark", "+ notificationPrefs : JSON",
        "+ createdAt / updatedAt : DATETIME",
    ]),
    "Project": (405, 62, 300, "« entité »  Project", [
        "+ id : BIGINT «PK»", "+ name : VARCHAR(160)", "+ description : TEXT",
        "+ status : PLANNING | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED",
        "+ startDate / dueDate : DATE", "+ ownerId : BIGINT «FK»",
        "+ archivedAt : DATETIME", "+ createdAt / updatedAt : DATETIME",
    ]),
    "Task": (785, 62, 405, "« entité »  Task", [
        "+ id : BIGINT «PK»", "+ projectId : BIGINT «FK»", "+ title : VARCHAR(180)",
        "+ description : TEXT", "+ status : TODO | IN_PROGRESS | IN_REVIEW | DONE",
        "+ priority : LOW | MEDIUM | HIGH | URGENT", "+ assigneeId : BIGINT «FK, nullable»",
        "+ createdBy : BIGINT «FK»", "+ dueDate / completedAt : DATETIME",
        "+ deletedAt : DATETIME «soft delete»", "+ createdAt / updatedAt : DATETIME",
    ]),
    "ProjectMember": (405, 340, 300, "« association »  ProjectMember", [
        "+ id : BIGINT «PK»", "+ projectId : BIGINT «FK»", "+ userId : BIGINT «FK»",
        "+ projectRole : MANAGER | MEMBER", "+ joinedAt : DATETIME",
    ]),
    "Comment": (785, 340, 405, "« entité »  Comment", [
        "+ id : BIGINT «PK»", "+ taskId : BIGINT «FK»", "+ authorId : BIGINT «FK»",
        "+ content : TEXT", "+ createdAt / updatedAt : DATETIME", "+ deletedAt : DATETIME",
    ]),
    "Notification": (40, 340, 285, "« entité »  Notification", [
        "+ id : BIGINT «PK»", "+ userId : BIGINT «FK»", "+ type : VARCHAR(60)",
        "+ title / message : VARCHAR", "+ payload : JSON", "+ relatedEntityType / Id",
        "+ dedupKey : VARCHAR(120) «UQ»", "+ isRead / readAt", "+ createdAt : DATETIME",
    ]),
    "UserSession": (40, 600, 285, "« technique »  UserSession", [
        "+ id : BIGINT «PK»", "+ userId : BIGINT «FK»", "+ tokenHash : CHAR(64) «UQ»",
        "+ userAgent / ipAddress", "+ expiresAt / revokedAt / lastUsedAt", "+ createdAt : DATETIME",
    ]),
    "PasswordResetToken": (405, 555, 300, "« technique »  PasswordResetToken", [
        "+ id : BIGINT «PK»", "+ userId : BIGINT «FK»", "+ tokenHash : VARCHAR(255)",
        "+ expiresAt : DATETIME", "+ usedAt : DATETIME", "+ createdAt : DATETIME",
    ]),
    "ActivityLog": (785, 530, 405, "« technique »  ActivityLog", [
        "+ id : BIGINT «PK»", "+ actorId : BIGINT «FK, nullable»",
        "+ projectId / taskId : BIGINT «FK, nullable»", "+ action : VARCHAR(80)",
        "+ description : VARCHAR(500)", "+ createdAt : DATETIME",
    ]),
    "AuditLog": (405, 755, 300, "« technique »  AuditLog", [
        "+ id : BIGINT «PK»", "+ actorId : BIGINT «FK, nullable»",
        "+ action : VARCHAR(80)", "+ details : JSON", "+ createdAt : DATETIME",
    ]),
}


def draw_class(name: str) -> tuple[int, int, int, int]:
    x, y, w, title, rows = CLASSES[name]
    h = 34 + len(rows) * 16 + 9
    fill = "#EEF2FF" if name in ("User", "Project", "Task") else "#F8FAFC"
    stroke = INDIGO if name in ("User", "Project", "Task") else BORDER
    svg.rect(x, y, w, h, fill=fill, stroke=stroke, sw=1.35, rx=7)
    svg.rect(x, y, w, 30, fill=stroke, stroke="none", rx=7)
    svg.rect(x, y + 22, w, 8, fill=stroke, stroke="none")
    svg.text(x + 11, y + 21, title, size=11.6, weight="700", fill=WHITE, family=FONT)
    for index, row in enumerate(rows):
        svg.text(x + 11, y + 47 + index * 16, row, size=10.1, fill=NAVY, family=MONO)
    return x, y, w, h


def mult(x: float, y: float, value: str) -> None:
    svg.rect(x - 13, y - 8, 26, 15, fill=WHITE, stroke="none")
    svg.text(x, y + 4, value, size=9.8, weight="700", fill=INDIGO, anchor="middle")


for name in CLASSES:
    draw_class(name)

# associations (traits continus, pas de navigabilité ajoutée)
svg.line(325, 130, 405, 130, stroke=INDIGO, sw=1.6, marker_end="hollow")
mult(342, 122, "1")
mult(388, 122, "0..*")
svg.text(365, 116, "possède", size=9.5, fill=MUTED, anchor="middle")

svg.line(325, 200, 405, 470, stroke=INDIGO, sw=1.4, marker_end="hollow")
mult(338, 244, "1")
mult(392, 448, "0..*")

svg.line(555, 207, 555, 340, stroke=INDIGO, sw=1.5, marker_end="hollow")
mult(572, 230, "1")
mult(572, 330, "0..*")
svg.text(568, 286, "appartient", size=9.5, fill=MUTED)

svg.line(705, 130, 785, 130, stroke=INDIGO, sw=1.5, marker_end="hollow")
mult(722, 122, "1")
mult(768, 122, "0..*")
svg.text(745, 116, "contient", size=9.5, fill=MUTED, anchor="middle")

svg.path("M 260 286 L 260 313 L 990 313 L 990 283", stroke=INDIGO, sw=1.3,
         marker_end="hollow")
mult(290, 305, "1")
mult(960, 305, "0..*")
svg.text(625, 307, "crée / assigne (createdBy, assigneeId)", size=9.5, fill=MUTED,
         anchor="middle")

svg.line(990, 283, 990, 340, stroke=INDIGO, sw=1.4, marker_end="hollow")
mult(1008, 305, "1")
mult(1008, 336, "0..*")

svg.line(180, 286, 180, 340, stroke=INDIGO, sw=1.4, marker_end="hollow")
mult(197, 305, "1")
mult(197, 336, "0..*")

svg.path("M 40 220 L 20 220 L 20 690 L 40 690", stroke=SLATE, sw=1.2,
         marker_end="hollow")
mult(65, 680, "1")
mult(65, 600, "0..*")

svg.path("M 325 240 L 345 240 L 345 640 L 405 640", stroke=SLATE, sw=1.2,
         marker_end="hollow")
mult(365, 632, "1")
mult(392, 632, "0..*")

svg.path("M 1190 130 L 1215 130 L 1215 620 L 1190 620", stroke=SLATE, sw=1.2,
         marker_end="hollow")
mult(1168, 612, "0..*")

svg.path("M 20 690 L 20 810 L 405 810", stroke=SLATE, sw=1.2, marker_end="hollow")
mult(65, 802, "1")
mult(390, 802, "0..*")

svg.path("M 705 180 L 740 180 L 740 600 L 785 600", stroke=SLATE, sw=1.2,
         marker_end="hollow")

svg.rect(40, 892, 1160, 34, fill="#FFF7ED", stroke="#FED7AA", rx=6)
svg.text(52, 914, "Remarque méthodologique : il n'existe pas de classes métier déclarées dans le code. Les rectangles ci-dessus sont des classes de domaine issues du schéma relationnel et des sérialiseurs ; les opérations sont portées par les modules repositories/ et services/, non par des méthodes de classe.",
         size=9.8, fill=AMBER)

svg.save(EXPORT / "figure_4_3_classes.svg")

# ================================================================ 4.4 ERD
svg = SVG(1240, 760)
svg.text(40, 26, "Schéma relationnel MySQL — 10 tables (migrations 001 à 004)",
         size=15, weight="700", fill=NAVY)
svg.text(1200, 26, "PK = clé primaire · FK = clé étrangère · UQ = contrainte d'unicité",
         size=10.3, fill=MUTED, anchor="end")

TABLES = {
    "users": (40, 58, 260, [
        ("PK", "id", "BIGINT"), ("", "full_name", "VARCHAR(120)"),
        ("UQ", "email", "VARCHAR(255)"), ("", "password_hash", "VARCHAR(255)"),
        ("", "role", "ENUM(3 valeurs)"), ("", "is_active", "BOOLEAN"),
        ("", "preferred_language", "ENUM(fr,en)"), ("", "preferred_theme", "ENUM(light,dark)"),
        ("+", "notification_prefs", "JSON (002)"), ("", "created_at", "DATETIME"),
    ]),
    "projects": (350, 58, 280, [
        ("PK", "id", "BIGINT"), ("", "name", "VARCHAR(160)"), ("", "description", "TEXT"),
        ("", "status", "ENUM(5 valeurs)"), ("", "start_date", "DATE"),
        ("", "due_date", "DATE"), ("FK", "owner_id", "BIGINT → users.id"),
        ("", "archived_at", "DATETIME"), ("", "created_at", "DATETIME"),
    ]),
    "tasks": (680, 58, 300, [
        ("PK", "id", "BIGINT"), ("FK", "project_id", "BIGINT → projects.id"),
        ("", "title", "VARCHAR(180)"), ("", "status", "ENUM(4 valeurs)"),
        ("", "priority", "ENUM(4 valeurs)"), ("FK", "assignee_id", "BIGINT → users.id NULL"),
        ("FK", "created_by", "BIGINT → users.id"), ("", "due_date", "DATETIME"),
        ("+", "deleted_at", "DATETIME (004)"), ("", "created_at", "DATETIME"),
    ]),
    "notifications": (1020, 58, 190, [
        ("PK", "id", "BIGINT"), ("FK", "user_id", "BIGINT → users.id"),
        ("", "type", "VARCHAR(60)"), ("", "title", "VARCHAR(180)"),
        ("", "message", "VARCHAR(500)"), ("+", "payload", "JSON (002)"),
        ("UQ", "dedup_key", "VARCHAR(120)"), ("", "is_read", "BOOLEAN"),
    ]),
    "project_members": (40, 320, 260, [
        ("PK", "id", "BIGINT"), ("FK", "project_id", "BIGINT → projects.id"),
        ("FK", "user_id", "BIGINT → users.id"),
        ("UQ", "uq_pair", "(project_id,user_id)"), ("", "project_role", "ENUM(MANAGER,MEMBER)"),
        ("", "joined_at", "DATETIME"),
    ]),
    "activity_logs": (350, 320, 280, [
        ("PK", "id", "BIGINT"), ("FK", "actor_id", "BIGINT → users.id NULL"),
        ("FK", "project_id", "BIGINT → projects.id"),
        ("FK", "task_id", "BIGINT → tasks.id"), ("", "action", "VARCHAR(80)"),
        ("", "description", "VARCHAR(500)"), ("", "created_at", "DATETIME"),
    ]),
    "comments": (680, 335, 300, [
        ("PK", "id", "BIGINT"), ("FK", "task_id", "BIGINT → tasks.id"),
        ("FK", "author_id", "BIGINT → users.id"), ("", "content", "TEXT"),
        ("", "deleted_at", "DATETIME"), ("", "created_at", "DATETIME"),
    ]),
    "user_sessions": (40, 540, 260, [
        ("PK", "id", "BIGINT"), ("FK", "user_id", "BIGINT → users.id"),
        ("UQ", "token_hash", "CHAR(64)"), ("", "expires_at", "DATETIME"),
        ("", "revoked_at", "DATETIME"), ("", "last_used_at", "DATETIME"),
        ("", "created_at", "DATETIME"),
    ]),
    "password_reset_tokens": (350, 535, 280, [
        ("PK", "id", "BIGINT"), ("FK", "user_id", "BIGINT → users.id"),
        ("", "token_hash", "VARCHAR(255)"), ("", "expires_at", "DATETIME"),
        ("", "used_at", "DATETIME"), ("", "created_at", "DATETIME"),
    ]),
    "audit_logs": (680, 545, 300, [
        ("PK", "id", "BIGINT"), ("FK", "actor_id", "BIGINT → users.id NULL"),
        ("", "action", "VARCHAR(80)"), ("", "details", "JSON"),
        ("", "created_at", "DATETIME"),
    ]),
}

COLORS = {"PK": AMBER, "FK": INDIGO, "UQ": GREEN, "+": VIOLET}


def draw_table(name: str) -> None:
    x, y, w, rows = TABLES[name]
    h = 27 + len(rows) * 14 + 7
    svg.rect(x, y, w, h, fill=WHITE, stroke=INDIGO if name in ("users", "projects", "tasks") else BORDER,
             sw=1.35, rx=6)
    svg.rect(x, y, w, 25, fill=NAVY if name in ("users", "projects", "tasks") else SLATE,
             stroke="none", rx=6)
    svg.rect(x, y + 18, w, 7, fill=NAVY if name in ("users", "projects", "tasks") else SLATE,
             stroke="none")
    svg.text(x + 9, y + 18, name, size=11.4, weight="700", fill=WHITE, family=MONO)
    for index, (key, column, typ) in enumerate(rows):
        yy = y + 39 + index * 14
        svg.text(x + 9, yy, key, size=9, weight="700" if key else "normal",
                 fill=COLORS.get(key, "#94A3B8"), family=MONO)
        svg.text(x + 32, yy, column, size=9.4, fill=NAVY, family=MONO)
        svg.text(x + w - 8, yy, typ, size=8.6, fill=MUTED, family=MONO, anchor="end")


for name in TABLES:
    draw_table(name)


def crow(x: float, y: float, direction: str, color: str = INDIGO) -> None:
    """Draw a crow's foot at (x,y), open toward the given direction."""
    if direction == "left":
        svg.line(x, y, x + 10, y - 6, stroke=color, sw=1.3)
        svg.line(x, y, x + 10, y + 6, stroke=color, sw=1.3)
        svg.line(x, y, x + 11, y, stroke=color, sw=1.3)
    elif direction == "right":
        svg.line(x, y, x - 10, y - 6, stroke=color, sw=1.3)
        svg.line(x, y, x - 10, y + 6, stroke=color, sw=1.3)
        svg.line(x, y, x - 11, y, stroke=color, sw=1.3)
    elif direction == "up":
        svg.line(x, y, x - 6, y + 10, stroke=color, sw=1.3)
        svg.line(x, y, x + 6, y + 10, stroke=color, sw=1.3)
        svg.line(x, y, x, y + 11, stroke=color, sw=1.3)


def rel(d: str, labels: list[tuple[float, float, str]], color: str = INDIGO) -> None:
    svg.path(d, stroke=color, sw=1.25)
    for x, y, label in labels:
        svg.rect(x - 19, y - 8, 38, 15, fill=WHITE, stroke="none")
        svg.text(x, y + 3, label, size=9.2, fill=color, weight="700", anchor="middle")


# users -> projects.owner_id
rel("M 300 110 L 350 110", [(325, 102, "1 : 0..*")])
crow(350, 110, "left")
# users -> project_members.user_id
rel("M 40 240 L 24 240 L 24 400 L 40 400", [(24, 388, "1 : 0..*")])
crow(40, 400, "left")
# projects -> project_members.project_id
rel("M 400 220 L 400 300 L 170 300 L 170 320", [(285, 292, "1 : 0..*")])
crow(170, 320, "up")
# projects -> tasks.project_id
rel("M 630 110 L 680 110", [(655, 102, "1 : 0..*")])
crow(680, 110, "left")
# users -> tasks.assignee_id / created_by
rel("M 250 220 L 250 295 L 810 295 L 810 240", [(540, 287, "1 : 0..*")])
crow(810, 240, "up")
# tasks -> comments
rel("M 830 245 L 830 335", [(850, 290, "1 : 0..*")])
crow(830, 335, "up")
# users -> notifications
rel("M 170 58 L 170 44 L 1115 44 L 1115 58", [(640, 37, "1 : 0..*")])
crow(1115, 58, "up")
# users -> activity_logs.actor_id
rel("M 60 220 L 60 290 L 490 290 L 490 320", [(275, 282, "0..1 : 0..*")])
crow(490, 320, "up")
# projects -> activity_logs
rel("M 480 220 L 480 320", [(505, 270, "0..1 : 0..*")])
crow(480, 320, "up")
# tasks -> activity_logs.task_id
rel("M 950 245 L 950 305 L 610 305 L 610 320", [(780, 297, "0..1 : 0..*")])
crow(610, 320, "up")
# users -> user_sessions
rel("M 24 240 L 24 660 L 40 660", [(24, 648, "1 : 0..*")])
crow(40, 660, "left")
# users -> password_reset_tokens
rel("M 300 200 L 325 200 L 325 600 L 350 600", [(325, 592, "1 : 0..*")])
crow(350, 600, "left")
# users -> audit_logs
rel("M 24 660 L 24 715 L 680 715 L 680 675", [(350, 707, "0..1 : 0..*")])
crow(680, 675, "up")

svg.rect(40, 730, 1170, 22, fill="#F0FDF4", stroke="#BBF7D0", rx=5)
svg.text(52, 745, "Cardinalités vérifiées dans 001_initial_schema.sql, 002_auth_sessions_preferences.sql et 004_soft_delete_and_audit.sql. Aucune relation 1:1 n'est déclarée ; la relation N:M projets ↔ utilisateurs est matérialisée par project_members.",
         size=9.6, fill=GREEN)

svg.save(EXPORT / "figure_4_4_erd.svg")
print("class + ERD SVG written")
