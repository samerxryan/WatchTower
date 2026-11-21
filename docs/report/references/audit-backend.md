# Audit technique du backend - WatchTower

> **Périmètre** : `server/src/**`, `server/tests/**`, migrations SQL, `package.json`, `vitest.config.js`, documentation `AGENT/*.md`, `README.md`.
> **Mode** : lecture seule. Aucun test, serveur ou script de migration n'a été exécuté pendant cet audit. Les constats sont issus de la lecture statique du code.
> **Date** : 2026-11-21.
> **Convention de citation** : `chemin/fichier.js:Ldébut-Lfin` désigne des concepts ou blocs de lignes, pas une citation littérale.

## 1. Acteurs, rôles et règles d'accès

### 1.1 Rôles globaux

Source : `server/src/database/migrations/001_initial_schema.sql:9`, `server/src/utils/schemas.js:4`.

| Rôle | Nature | Portée |
|---|---|---|
| `ADMIN` | Rôle global | Contourne les contrôles d'appartenance projet/tâche ; seul rôle autorisé à changer un rôle global ou le statut d'un compte. |
| `PROJECT_MANAGER` | Rôle global | Peut créer des projets et consulter l'annuaire utilisateurs en champs limités. N'obtient **aucun** droit implicite sur un projet dont il n'est ni propriétaire ni membre `MANAGER`. |
| `TEAM_MEMBER` | Rôle global, défaut | Accès aux projets dont il est propriétaire ou membre ; peut changer le statut des tâches accessibles et commenter. |

L'inscription publique force `TEAM_MEMBER` côté serveur (`server/src/modules/auth/auth.routes.js:42-49`) ; un `role` fourni dans le corps est ignoré par le schéma Zod (`server/src/modules/auth/auth.schemas.js:8-12`).

### 1.2 Rôles de projet

Source : `project_members.project_role ENUM('MANAGER','MEMBER')` (`server/src/database/migrations/001_initial_schema.sql:38`).

- Le propriétaire (`projects.owner_id`) est traité comme `MANAGER` même sans ligne `project_members` (`server/src/services/accessControl.js:8`, `:45`).
- À la création d'un projet, une ligne `project_members` `MANAGER` est créée pour le propriétaire (`server/src/modules/projects/projects.routes.js:99-102`).
- Le propriétaire ne peut pas être retiré du projet (`projects.routes.js:282-284`).

### 1.3 Prédicats d'autorisation

Source : `server/src/services/accessControl.js:4-76`.

| Prédicat | Formule exacte |
|---|---|
| `project.canView` | `ADMIN` OU propriétaire OU membre (`member_role` non nul). |
| `project.canManage` | `ADMIN` OU propriétaire OU `member_role === 'MANAGER'`. |
| `project.writable` | `projects.status !== 'ARCHIVED'`. |
| `task.canView` | `ADMIN` OU propriétaire du projet OU membre du projet. |
| `task.canManage` | `ADMIN` OU propriétaire du projet OU `member_role === 'MANAGER'`. |
| `task.canChangeStatus` | `ADMIN` OU propriétaire du projet OU membre du projet (tout membre, pas seulement l'assigné). |

Un utilisateur hors projet reçoit `403 FORBIDDEN` sur un projet/tâche existant ; une ressource inexistante reçoit `404 NOT_FOUND` (`accessControl.js:20-31`, `:61-69`).

### 1.4 Matrice opérationnelle

| Opération | ADMIN | Propriétaire | MANAGER projet | MEMBER projet | Hors projet |
|---|---|---|---|---|---|
| Voir projet, membres, activité projet | oui | oui | oui | oui | non (403) |
| Modifier / archiver le projet | oui | oui | oui | non | non |
| Ajouter / retirer un membre | oui | oui | oui | non | non |
| Créer une tâche | oui | oui | oui | non | non |
| Voir une tâche | oui | oui | oui | oui | non |
| Modifier tous les champs d'une tâche | oui | oui | oui | non | non |
| Changer uniquement le statut d'une tâche | oui | oui | oui | oui | non |
| Supprimer une tâche (soft delete) | oui | oui | oui | non | non |
| Créer / lire un commentaire | oui | oui | oui | oui | non |
| Modifier un commentaire | auteur ou ADMIN | auteur ou ADMIN | auteur ou ADMIN | auteur ou ADMIN | non |
| Supprimer un commentaire | auteur ou ADMIN | auteur, MANAGER, ADMIN | auteur, MANAGER, ADMIN | auteur seulement | non |
| Lister l'annuaire `/users` | oui (complet) | selon rôle global | oui si rôle global PM (champs publics) | non | non |
| Changer rôle / statut d'un compte | oui | non | non | non | non |

Le propriétaire et le `MANAGER` projet cumulent les droits de gestion ; le rôle global `PROJECT_MANAGER` ne suffit pas.

### 1.5 Règles transverses

- Authentification obligatoire sur tous les routeurs sauf `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify` (`server/src/app.js:103-130`, `server/src/modules/auth/auth.routes.js`).
- `authenticate` résout l'utilisateur depuis le cookie d'accès, puis en repli depuis la session de rafraîchissement (`server/src/middleware/auth.js:8-19`, `server/src/services/authService.js:70-104`).
- `requireRoles` vérifie le rôle global après authentification (`middleware/auth.js:21-31`).
- L'identifiant fourni par le client ne prouve jamais l'accès : chaque route projet/tâche recharge la ligne avec le contexte d'appartenance (`projectRepository.findProjectAccess`, `taskRepository.findTaskAccess`).

## 2. Inventaire des endpoints

Base path : `/api/v1` (`server/src/app.js:101-132`). Toutes les réponses suivent `{ success, data, meta }` ou `{ success: false, error: { code, message, details } }` (`server/src/middleware/errorHandler.js:4-51`). Les listes paginées renvoient `meta = { page, limit, total, totalPages }` (`server/src/utils/pagination.js:22-29`).

Légende validation : `id` = entier positif coercé (`server/src/utils/schemas.js:11`) ; `page` >= 1 ; `limit` 1-100 ; `sortOrder` `asc|desc` ; `sortBy` contrôlé par liste blanche (`pagination.js:9-20`, `schemas.js:45-50`).

**Total : 46 endpoints** (8 auth, 9 users, 9 projects, 11 tasks/comments, 4 notifications, 4 insights, 1 health).

### 2.1 Module Auth - préfixe `/api/v1/auth`

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| POST | `/register` | Public | body `fullName` 2-120, `email` valide <=255, `password` 8-128 | `201` ; force `TEAM_MEMBER` ; hash bcrypt ; email dupliqué -> `409 CONFLICT` ; aucun cookie émis. |
| POST | `/login` | Public + limiteur 10/15 min | body `email`, `password` 1-128 | `200` ; erreur générique `401` ; audit `LOGIN_SUCCESS` / `LOGIN_FAILED` ; crée une session de rafraîchissement et pose `wt_access` + `wt_refresh`. |
| POST | `/refresh` | Cookie `wt_refresh` actif | Aucune validation Zod | `200` ; recherche la session par hash, révoque l'ancien jeton et en crée un nouveau dans une transaction (rotation) ; repose les deux cookies. |
| POST | `/logout` | Cookie `wt_refresh` optionnel | Aucune | `200` ; révoque la session si présente, efface les cookies ; idempotent. |
| GET | `/me` | `authenticate` | Aucune | `200` ; utilisateur complet sérialisé avec préférences. |
| POST | `/forgot-password` | Public + limiteur 5/h | body `email` | `200` générique ; si compte actif, invalide les anciens jetons, crée un jeton 30 min et audite ; en dev, renvoie `resetToken` sauf `EXPOSE_RESET_TOKEN=false`. |
| POST | `/reset-password` | Public + jeton | body `token` 10-255, `newPassword` 8-128 | `200` ; jeton invalide/expiré/réutilisé -> `400 INVALID_RESET_TOKEN` ; met à jour le hash, consomme le jeton, révoque toutes les sessions, audite, efface les cookies. |
| GET | `/verify` | Cookie `wt_access` | Aucune | `200 { valid: true }` si le JWT est valide et le compte actif ; sinon `401`. |

### 2.2 Module Users - préfixe `/api/v1/users`

Tout le routeur est derrière `authenticate` (`server/src/modules/users/users.routes.js:26`).

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/me` | Authentifié | Aucune | Profil complet. |
| PATCH | `/me` | Authentifié | body `fullName` optionnel 2-120, `avatarUrl` optionnel nullable, URL `http(s)` ou chemin relatif ; au moins un champ | Met à jour le profil ; un `role` injecté est ignoré ; `400` si aucun champ. |
| PATCH | `/me/password` | Authentifié | body `currentPassword` 1-128, `newPassword` 8-128 | Vérifie l'ancien mot de passe (`400 INVALID_PASSWORD`), révoque toutes les sessions, en crée une nouvelle, audite `PASSWORD_CHANGED`, repose les cookies. |
| GET | `/me/preferences` | Authentifié | Aucune | Renvoie `preferredLanguage`, `preferredTheme`, `notificationPrefs`. |
| PATCH | `/me/preferences` | Authentifié | body `preferredLanguage` enum, `preferredTheme` enum, `notificationPrefs` objet booléen ; au moins un champ | Fusionne les préférences de notification avec les valeurs existantes. |
| GET | `/` | `ADMIN`, `PROJECT_MANAGER` | query pagination + `search` <=120, `role` enum, `isActive` `true|false`, `sortBy` enum | `ADMIN` reçoit le profil complet ; `PROJECT_MANAGER` reçoit `serializePublicUser` sans préférences ni dates. |
| GET | `/:id` | Authentifié ; `ADMIN`/PM tout compte, `TEAM_MEMBER` soi-même | params `id` | `403` pour un autre profil en tant que `TEAM_MEMBER` ; `404` si inexistant ; détail complet seulement pour `ADMIN`. |
| PATCH | `/:id/role` | `ADMIN` | params `id`, body `role` enum | Refuse de retirer le dernier admin actif (`409`) ; audite `ROLE_CHANGED` ; ne révoque pas les sessions. |
| PATCH | `/:id/status` | `ADMIN` | params `id`, body `isActive` booléen | Auto-désactivation -> `400 SELF_DEACTIVATION` ; dernier admin actif -> `409` ; désactivation révoque toutes les sessions ; audite `USER_STATUS_CHANGED`. |

### 2.3 Module Projects - préfixe `/api/v1/projects`

Tout le routeur est derrière `authenticate` (`server/src/modules/projects/projects.routes.js:30`).

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/` | Authentifié | query pagination + `status` enum, `search` <=160, `ownerId` id, `sortBy` enum | Liste filtrée par visibilité (`ADMIN` tout ; sinon propriétaire ou membre) ; agrégats `member_count`, `task_count` (hors tâches supprimées), `completed_task_count` ; progression calculée. |
| POST | `/` | `ADMIN`, `PROJECT_MANAGER` | body `name` 1-160, `description` <=5000 nullable, `status` enum, `startDate`/`dueDate` `AAAA-MM-JJ` nullables | `201` ; statut `ARCHIVED` interdit à la création (`422`) ; `dueDate < startDate` -> `422` ; propriétaire = utilisateur courant ; ajoute le propriétaire comme `MANAGER` ; activité `PROJECT_CREATED`. |
| GET | `/:projectId` | Membre/propriétaire/`ADMIN` | params `projectId` | `403` hors projet ; renvoie le projet et la liste complète des membres. |
| GET | `/:projectId/activity` | Membre/propriétaire/`ADMIN` | params + query pagination | Activité du projet, 20 par défaut, tri décroissant. |
| PATCH | `/:projectId` | `canManage` + projet non archivé | params + body partiel non vide (`name`, `description`, dates, `status`) | `409` si archivé ; revalide la plage de dates avec les valeurs existantes ; `status=ARCHIVED` renseigne `archived_at` ; activité `PROJECT_UPDATED`. |
| DELETE | `/:projectId` | `canManage` | params | Archive le projet (`status=ARCHIVED`, `archived_at=UTC`) ; si déjà archivé, `200` sans nouvelle activité ; ne supprime jamais physiquement ; activité `PROJECT_ARCHIVED`. |
| GET | `/:projectId/members` | Membre/propriétaire/`ADMIN` | params | Liste des membres, managers en premier puis nom. |
| POST | `/:projectId/members` | `canManage` + projet non archivé | params + body `userId` id, `projectRole` enum optionnel (défaut `MEMBER`) | Cible active obligatoire sinon `404` ; doublon -> `409` ; notification `PROJECT_INVITE` + activité `MEMBER_ADDED` ; `201`. |
| DELETE | `/:projectId/members/:userId` | `canManage` + projet non archivé | params `projectId`, `userId` | Propriétaire -> `422` ; membre absent -> `404` ; désassigne toutes ses tâches du projet ; activité `MEMBER_REMOVED`. |

### 2.4 Module Tasks et Comments

Deux routeurs montés : `/api/v1/projects/:projectId/tasks` (`mergeParams`) et `/api/v1/tasks` ; les commentaires standalone sont sous `/api/v1/comments`. Tous derrière `authenticate` (`server/src/modules/tasks/tasks.routes.js:36-42`).

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/projects/:projectId/tasks` | Membre/propriétaire/`ADMIN` | params + query pagination, `status`, `priority`, `assigneeId`, `search` <=180, `sortBy` enum | Tâches non supprimées du projet, filtres et tri. |
| POST | `/projects/:projectId/tasks` | `canManage` + projet non archivé | params + body `title` 1-180, `description` <=10000 nullable, `status` enum, `priority` enum, `assigneeId` id/null, `dueDate` ISO/null | `201` ; défauts `TODO`/`MEDIUM` ; `completedAt` si `DONE` ; assigné actif et membre (sauf propriétaire) sinon `422` ; activité + notification d'attribution. |
| GET | `/tasks` | Authentifié | query pagination + `status`, `priority`, `assigneeId`, `projectId`, `search`, `sortBy` | Union des tâches des projets accessibles, hors tâches supprimées. |
| GET | `/tasks/:taskId` | Membre/propriétaire/`ADMIN` | params `taskId` | `404` si supprimée ; `403` hors projet. |
| PATCH | `/tasks/:taskId` | `canManage` pour tous les champs ; tout membre si le corps ne contient que `status` | params + body partiel non vide (`title`, `description`, `status`, `priority`, `assigneeId`, `dueDate`) | `409` si projet archivé ; assignation revalidée (`422`) ; `completedAt` recalculé ; activité `TASK_UPDATED` ; notifications de statut/assignation selon changements. |
| PATCH | `/tasks/:taskId/status` | `canChangeStatus` (tout membre) + projet non archivé | params + body `status` enum | `200` ; si statut identique, aucun audit/activité/notification ; sinon `completedAt` recalculé, activité `STATUS_CHANGED` ou `TASK_COMPLETED`, notifications. |
| DELETE | `/tasks/:taskId` | `canManage` + projet non archivé | params | Suppression logique (`deleted_at`) ; activité `TASK_DELETED` avec `task_id = NULL` ; commentaires et activité conservés. |
| GET | `/tasks/:taskId/comments` | Accès à la tâche | params | Commentaires non supprimés, ordre chronologique. |
| POST | `/tasks/:taskId/comments` | Accès à la tâche + projet non archivé | params + body `content` 1-5000 | `201` ; auteur = utilisateur courant. |
| PATCH | `/comments/:commentId` | Auteur ou `ADMIN` | params + body `content` 1-5000 | `404` si commentaire supprimé ; accès à la tâche requis ; `409` si projet archivé ; `403` sinon. |
| DELETE | `/comments/:commentId` | Auteur, `canManage` projet ou `ADMIN` | params | Suppression logique (`deleted_at`) ; `404` si déjà supprimé ; `409` si projet archivé. |

### 2.5 Module Notifications - préfixe `/api/v1/notifications`

Tout le routeur est derrière `authenticate` (`server/src/modules/notifications/notifications.routes.js:15`). Chaque requête est strictement limitée aux notifications de `req.user.id`.

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/` | Authentifié | query pagination + `unread` `true|false` | Génère d'abord les notifications d'échéance de l'utilisateur, puis liste les siennes ; non lues d'abord, puis `created_at DESC`. |
| GET | `/unread-count` | Authentifié | Aucune | Génère les échéances puis renvoie `{ count }`. |
| PATCH | `/read-all` | Authentifié | Aucune | Marque toutes les notifications non lues de l'utilisateur ; renvoie le nombre modifié. |
| PATCH | `/:notificationId/read` | Propriétaire de la notification | params `notificationId` | `404` si la notification appartient à un autre compte ; marque comme lue ; renvoie la notification ou `null`. |

### 2.6 Module Insights - `/reports`, `/activity`, `/calendar`, `/timeline`

Tous derrière `authenticate` (`server/src/modules/insights/insights.routes.js:19-22`).

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/reports/summary` | Authentifié | Aucune | Agrège les projets et tâches accessibles : totaux, terminées, en attente, en retard, progression globale, répartition par statut/priorité. |
| GET | `/activity` | Authentifié | query pagination + `projectId` optionnel | Fil global filtré aux projets accessibles ou aux actions de l'utilisateur ; un `projectId` inaccessible renvoie une liste vide `200`, pas `403`. |
| GET | `/calendar/events` | Authentifié | query `from`/`to` `AAAA-MM-JJ`, `projectId` optionnel | Vérifie l'accès si `projectId` est fourni ; renvoie les échéances de tâches (`TASK_DUE`) et de projets (`PROJECT_DUE`) dans la plage, triées par date. |
| GET | `/timeline/projects` | Authentifié | Aucune | Projets accessibles avec `startDate`/`dueDate` pour la Timeline. Aucun filtre de dates. |

### 2.7 Santé

| Méthode | Chemin | Auth / rôles | Validation | Comportement clé |
|---|---|---|---|---|
| GET | `/health` | Public | Aucune | `SELECT 1` ; `200` si connecté, `503` sinon ; n'expose ni nom de base ni code d'erreur (`server/src/app.js:103-118`). |

### 2.8 Endpoints explicitement absents

Aucun endpoint n'existe pour : création d'utilisateur par un admin, suppression de compte, vérification d'email, gestion de sessions multi-appareils, lecture/export des `audit_logs`, restauration d'une tâche supprimée, discussions de projet distinctes, paramètres globaux, export de rapport, upload de fichier. Ces absences sont constatées par lecture des routeurs ; elles ne sont pas des endpoints oubliés dans cet inventaire.

## 3. Base de données

### 3.1 Conventions et moteur

- MySQL 8, InnoDB, `utf8mb4_unicode_ci`, identifiants `BIGINT AUTO_INCREMENT` (`server/src/database/migrations/001_initial_schema.sql:1-17`).
- Horodatages `DATETIME` (pas `TIMESTAMP`), interprétés en UTC : le pool force `SET time_zone = '+00:00'` et `timezone: 'Z'` (`server/src/database/pool.js:12-36`).
- Les colonnes `DATE` sont lues en chaînes `AAAA-MM-JJ` (`pool.js:22-24`).
- Les migrations sont appliquées dans l'ordre alphabétique et suivies dans `schema_migrations` (`server/src/database/migrate.js:30-60`).
- Aucune contrainte `CHECK` explicite ; les domaines sont portés par les `ENUM` et par Zod.
- Les suppressions physiques de `users` ne sont pas exposées par l'API ; les FK `ON DELETE RESTRICT` protègent les propriétaires/créateurs/auteurs.

### 3.2 Tables

#### `users`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK, auto-increment |
| `full_name` | `VARCHAR(120)` | NOT NULL |
| `email` | `VARCHAR(255)` | NOT NULL, UNIQUE `uq_users_email` |
| `password_hash` | `VARCHAR(255)` | NOT NULL (bcrypt) |
| `role` | `ENUM('ADMIN','PROJECT_MANAGER','TEAM_MEMBER')` | NOT NULL, défaut `TEAM_MEMBER` |
| `avatar_url` | `VARCHAR(500)` | NULL |
| `is_active` | `BOOLEAN` | NOT NULL, défaut `TRUE` |
| `preferred_language` | `ENUM('fr','en')` | NOT NULL, défaut `fr` |
| `preferred_theme` | `ENUM('light','dark')` | NOT NULL, défaut `light` |
| `notification_prefs` | `JSON` | NULL, ajouté par `002` |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |
| `updated_at` | `DATETIME` | NOT NULL, `ON UPDATE CURRENT_TIMESTAMP` |

Index : `uq_users_email` ; `idx_users_active_role (is_active, role)` ajouté par `003`.

#### `projects`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `name` | `VARCHAR(160)` | NOT NULL |
| `description` | `TEXT` | NULL |
| `status` | `ENUM('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED')` | NOT NULL, défaut `PLANNING` |
| `start_date` | `DATE` | NULL |
| `due_date` | `DATE` | NULL |
| `owner_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE RESTRICT` |
| `created_at` / `updated_at` | `DATETIME` | NOT NULL, `updated_at` auto |
| `archived_at` | `DATETIME` | NULL |

Index : `idx_projects_owner_status (owner_id, status)` ; `idx_projects_due_date (due_date)` ajouté par `003`.

#### `project_members`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `project_id` | `BIGINT` | NOT NULL, FK `projects(id)` `ON DELETE CASCADE` |
| `user_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE CASCADE` |
| `project_role` | `ENUM('MANAGER','MEMBER')` | NOT NULL, défaut `MEMBER` |
| `joined_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |

Contraintes : UNIQUE `uq_project_members_pair (project_id, user_id)` ; index `idx_project_members_user (user_id)`.

#### `tasks`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `project_id` | `BIGINT` | NOT NULL, FK `projects(id)` `ON DELETE CASCADE` |
| `title` | `VARCHAR(180)` | NOT NULL |
| `description` | `TEXT` | NULL |
| `status` | `ENUM('TODO','IN_PROGRESS','IN_REVIEW','DONE')` | NOT NULL, défaut `TODO` |
| `priority` | `ENUM('LOW','MEDIUM','HIGH','URGENT')` | NOT NULL, défaut `MEDIUM` |
| `assignee_id` | `BIGINT` | NULL, FK `users(id)` `ON DELETE SET NULL` |
| `created_by` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE RESTRICT` |
| `due_date` | `DATETIME` | NULL |
| `created_at` / `updated_at` | `DATETIME` | NOT NULL, `updated_at` auto |
| `completed_at` | `DATETIME` | NULL |
| `deleted_at` | `DATETIME` | NULL, ajouté par `004` |

Index : `idx_tasks_project_status (project_id, status)`, `idx_tasks_assignee_status (assignee_id, status)`, `idx_tasks_due_date (due_date)` ; `idx_tasks_deleted_at (deleted_at)` ajouté par `004`.

#### `comments`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `task_id` | `BIGINT` | NOT NULL, FK `tasks(id)` `ON DELETE CASCADE` |
| `author_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE RESTRICT` |
| `content` | `TEXT` | NOT NULL |
| `created_at` / `updated_at` | `DATETIME` | NOT NULL, `updated_at` auto |
| `deleted_at` | `DATETIME` | NULL |

Index : `idx_comments_task_created (task_id, created_at)`.

#### `notifications`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `user_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE CASCADE` |
| `type` | `VARCHAR(60)` | NOT NULL |
| `title` | `VARCHAR(180)` | NOT NULL |
| `message` | `VARCHAR(500)` | NOT NULL |
| `payload` | `JSON` | NULL, ajouté par `002` |
| `related_entity_type` | `VARCHAR(40)` | NULL (référence polymorphe) |
| `related_entity_id` | `BIGINT` | NULL (sans FK) |
| `dedup_key` | `VARCHAR(120)` | NULL |
| `is_read` | `BOOLEAN` | NOT NULL, défaut `FALSE` |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |
| `read_at` | `DATETIME` | NULL |

Contraintes : UNIQUE `uq_notifications_dedup (user_id, dedup_key)` ; index `idx_notifications_user_read_created (user_id, is_read, created_at)`.

#### `activity_logs`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `actor_id` | `BIGINT` | NULL, FK `users(id)` `ON DELETE SET NULL` |
| `project_id` | `BIGINT` | NULL, FK `projects(id)` `ON DELETE CASCADE` |
| `task_id` | `BIGINT` | NULL, FK `tasks(id)` `ON DELETE CASCADE` |
| `action` | `VARCHAR(80)` | NOT NULL |
| `description` | `VARCHAR(500)` | NOT NULL |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |

Index : `idx_activity_project_created (project_id, created_at)` ; `idx_activity_created_at (created_at)` et `idx_activity_actor_created (actor_id, created_at)` ajoutés par `003`.

#### `password_reset_tokens`

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `user_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE CASCADE` |
| `token_hash` | `VARCHAR(255)` | NOT NULL (SHA-256 hex en pratique) |
| `expires_at` | `DATETIME` | NOT NULL |
| `used_at` | `DATETIME` | NULL |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |

Index : `idx_reset_tokens_hash (token_hash)` ; `idx_reset_tokens_user_active (user_id, used_at, expires_at)` ajouté par `002`.

#### `user_sessions` (migration `002`)

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `user_id` | `BIGINT` | NOT NULL, FK `users(id)` `ON DELETE CASCADE` |
| `token_hash` | `CHAR(64)` | NOT NULL, UNIQUE `uq_user_sessions_token` (SHA-256 hex) |
| `user_agent` | `VARCHAR(255)` | NULL |
| `ip_address` | `VARCHAR(64)` | NULL |
| `expires_at` | `DATETIME` | NOT NULL |
| `revoked_at` | `DATETIME` | NULL |
| `last_used_at` | `DATETIME` | NULL |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |

Index : `idx_user_sessions_user_active (user_id, revoked_at, expires_at)`.

#### `audit_logs` (migration `004`)

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `BIGINT` | PK |
| `actor_id` | `BIGINT` | NULL, FK `users(id)` `ON DELETE SET NULL` |
| `action` | `VARCHAR(80)` | NOT NULL |
| `details` | `JSON` | NULL |
| `created_at` | `DATETIME` | NOT NULL, défaut `CURRENT_TIMESTAMP` |

Index : `idx_audit_created_at (created_at)`.

#### `schema_migrations` (créée par le runner, pas par un fichier SQL)

`version VARCHAR(120) PRIMARY KEY`, `applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` (`server/src/database/migrate.js:30-35`).

### 3.3 Relations et cardinalités

| Relation | Cardinalité | FK / mécanisme | Suppression |
|---|---|---|---|
| `users` -> `projects` (propriétaire) | 1..N | `projects.owner_id` | `RESTRICT` |
| `users` <-> `projects` (membres) | N..N | `project_members(project_id, user_id)` | `CASCADE` des deux côtés |
| `projects` -> `tasks` | 1..N | `tasks.project_id` | `CASCADE` |
| `users` -> `tasks` (assigné) | 1..N, optionnel | `tasks.assignee_id` | `SET NULL` |
| `users` -> `tasks` (créateur) | 1..N | `tasks.created_by` | `RESTRICT` |
| `tasks` -> `comments` | 1..N | `comments.task_id` | `CASCADE` (mais soft delete applicatif de la tâche) |
| `users` -> `comments` (auteur) | 1..N | `comments.author_id` | `RESTRICT` |
| `users` -> `notifications` | 1..N | `notifications.user_id` | `CASCADE` |
| `users` -> `user_sessions` | 1..N | `user_sessions.user_id` | `CASCADE` |
| `users` -> `password_reset_tokens` | 1..N | `password_reset_tokens.user_id` | `CASCADE` |
| `users` -> `activity_logs` (acteur) | 1..N, optionnel | `activity_logs.actor_id` | `SET NULL` |
| `projects` -> `activity_logs` | 1..N, optionnel | `activity_logs.project_id` | `CASCADE` |
| `tasks` -> `activity_logs` | 1..N, optionnel | `activity_logs.task_id` | `CASCADE` |
| `users` -> `audit_logs` (acteur) | 1..N, optionnel | `audit_logs.actor_id` | `SET NULL` |

La relation `notifications` -> entité liée est polymorphe (`related_entity_type`, `related_entity_id`) sans contrainte FK (`001_initial_schema.sql:86-88`).

### 3.4 Apports par migration

| Migration | Apports |
|---|---|
| `001_initial_schema.sql` | Crée `users`, `projects`, `project_members`, `tasks`, `comments`, `notifications`, `activity_logs`, `password_reset_tokens`, leurs FK, UNIQUE et index de base. |
| `002_auth_sessions_preferences.sql` | `users.notification_prefs JSON` ; `notifications.payload JSON` ; table `user_sessions` ; index `idx_reset_tokens_user_active`. |
| `003_performance_indexes.sql` | `idx_activity_created_at`, `idx_activity_actor_created`, `idx_projects_due_date`, `idx_users_active_role`. |
| `004_soft_delete_and_audit.sql` | `tasks.deleted_at` + `idx_tasks_deleted_at` ; table `audit_logs` + `idx_audit_created_at`. |

### 3.5 Notes de schéma

- `projects` n'a pas de `deleted_at` : la suppression est un archivage (`status=ARCHIVED`, `archived_at`).
- `tasks` et `comments` utilisent un soft delete applicatif ; aucune restauration n'est exposée.
- Les agrégats de progression ne sont pas stockés ; ils sont calculés par requête (`projectRepository.js:12-16`).
- `notifications.dedup_key` est NULL pour les notifications d'attribution/statut ; MySQL autorise plusieurs NULL dans un index UNIQUE, donc seule la déduplication des échéances est effective.
- Les migrations DDL sont exécutées dans une transaction (`migrate.js:50-59`), mais MySQL effectue un commit implicite sur les ordres DDL : une migration multi-instructions interrompue peut laisser un état partiel.

## 4. Cycle de vie de l'authentification

### 4.1 Cookies

Source : `server/src/utils/cookies.js:3-32`, `server/src/config/env.js:68-78`.

| Cookie | Contenu | Durée | Attributs |
|---|---|---|---|
| `wt_access` | JWT d'accès HS256 | 15 min (`ACCESS_COOKIE_MAX_AGE_MS`) | `HttpOnly`, `Secure` si `COOKIE_SECURE=true` ou production, `SameSite=Lax`, `Path=/api/v1`, sans `Domain` |
| `wt_refresh` | Jeton opaque de 48 octets (`base64url`) | `JWT_REFRESH_DAYS` jours (7 par défaut) | Mêmes attributs |

- `clearAuthCookies` réutilise exactement les mêmes options de base, donc le `Path` correspond (`cookies.js:28-32`).
- `Secure` dépend de `env.jwt.cookieSecure` (`env.js:72`) ; en production il est forcé à `true`.
- Aucun jeton n'est renvoyé dans le corps JSON de login/refresh ; seul le cookie est posé.
- La durée du cookie d'accès est fixe (15 min) alors que `JWT_EXPIRES_IN` est configurable (`env.js:70`). En cas d'écart, le repli refresh réémet un cookie d'accès.

### 4.2 JWT d'accès

Source : `server/src/services/authService.js:21-41`.

- Algorithme `HS256`, secret `JWT_SECRET` (>= 32 caractères exige en production ; secret éphémère aléatoire en dev/test si absent, `env.js:10-20`).
- Claims : `sub` = id utilisateur, `role`, `typ: 'access'`, `iss: 'watchtower'`, `aud: 'watchtower-web'`, `exp`.
- Vérification stricte de l'émetteur, de l'audience et de l'algorithme (`authService.js:35-41`).
- Le claim `role` n'est pas utilisé pour autoriser : `resolveAuthenticatedUser` recharge l'utilisateur en base et `requireRoles` lit `req.user.role` issu de la base (`authService.js:74-79`, `middleware/auth.js:21-31`). Un changement de rôle est donc effectif immédiatement, malgré un claim potentiellement obsolète.
- Aucun `jti`, aucune liste de révocation : un JWT déjà émis reste valide jusqu'à expiration (limite documentée README:138).

### 4.3 Session de rafraîchissement

Source : `server/src/services/authService.js:43-56`, `server/src/repositories/sessionRepository.js`.

1. `createSession` génère un jeton opaque (`crypto.randomBytes(48).toString('base64url')`), calcule son SHA-256 hex (`utils/tokens.js:3-9`), fixe `expires_at = now + refreshDays`, enregistre `user_agent` (255 max) et `ip_address` (64 max).
2. `findActiveSessionWithUser` exige `revoked_at IS NULL`, `expires_at > UTC_TIMESTAMP()` et joint `users` (`sessionRepository.js:16-33`). Le contrôle `!session.is_active` porte sur `users.is_active`.
3. `POST /auth/refresh` révoque l'ancien hash puis crée une nouvelle session dans une transaction (`auth.routes.js:110-113`) : rotation à chaque refresh.
4. Le repli d'authentification (`resolveAuthenticatedUser`) touche `last_used_at` et émet un nouveau cookie d'accès **sans** faire tourner le refresh, pour éviter les courses entre requêtes frontend concurrentes (`authService.js:64-104`).
5. Révocation : logout (`auth.routes.js:125-135`), changement de mot de passe (`users.routes.js:61-71`), reset (`auth.routes.js:209-218`), désactivation (`users.routes.js:230-234`).
6. Nettoyage : suppression des sessions expirées depuis plus de 7 jours au démarrage (`sessionRepository.js:66-72`, `server.js:71-73`). Pas de purge périodique.
7. Aucun endpoint de gestion des sessions (lister/révoquer un appareil), aucune limite du nombre de sessions actives, aucune détection de réutilisation de famille de jetons.

### 4.4 Jetons de réinitialisation

Source : `server/src/modules/auth/auth.routes.js:148-226`, `server/src/repositories/resetTokenRepository.js`.

- Jeton opaque de 32 octets (`createOpaqueToken(32)`), stocké uniquement sous forme SHA-256 hex.
- Durée `RESET_TOKEN_MINUTES` (30 par défaut, `env.js:84`).
- Demande : réponse générique `200` que le compte existe ou non (`auth.routes.js:154-161`).
- Un seul jeton actif par utilisateur : verrou `SELECT ... FOR UPDATE` sur `users` puis invalidation des jetons actifs avant création (`auth.routes.js:167-176`, `userRepository.js:113-115`).
- Utilisation : recherche `used_at IS NULL AND expires_at > UTC_TIMESTAMP()` (`resetTokenRepository.js:23-36`), mise à jour du mot de passe, `markResetTokenUsed`, invalidation des autres jetons, révocation de toutes les sessions, audit `PASSWORD_RESET_COMPLETED`.
- En dev/test, le jeton brut est renvoyé dans la réponse et journalisé si `env.security.exposeResetToken` est vrai (`env.js:81-83`, `auth.routes.js:178-186`). Défaut : vrai hors production, désactivable par `EXPOSE_RESET_TOKEN=false`.
- Aucun envoi d'email : le flux est volontairement local/démo.

### 4.5 Rate limiting

Source : `server/src/app.js:27-99`, `server/src/config/env.js:86-88`.

| Portée | Fenêtre | Limite | Code d'erreur |
|---|---|---|---|
| `/api/v1/auth` (toutes les routes auth) | 15 min | 60 | `TOO_MANY_REQUESTS` |
| `/api/v1/auth/login` | 15 min | 10 | `TOO_MANY_LOGIN_ATTEMPTS` |
| `/api/v1/auth/forgot-password` | 60 min | 5 | `TOO_MANY_RESET_REQUESTS` |

- Les limiteurs sont chaînés : une connexion consomme le quota global `/auth` **et** le quota `/login`.
- `standardHeaders: true`, `legacyHeaders: false` ; réponse JSON au format d'erreur standard.
- En environnement de test, les limiteurs sont neutralisés (`limit = 10_000`) sauf `RATE_LIMIT_ENABLED=true` (`app.js:30`, `env.js:86-88`).
- `trust proxy` est `false` par défaut : `X-Forwarded-For` n'est pas pris en compte sans `TRUST_PROXY` explicite (`env.js:38-47`, `app.js:47-48`). Le test d'intégration vérifie qu'un XFF usurpé ne contourne pas la limite.
- Aucun verrouillage par compte, aucune limitation des inscriptions au-delà du quota global `/auth`, aucun `skipSuccessfulRequests`.

### 4.6 Protection CSRF, origine et CORS

Source : `server/src/middleware/auth.js:33-49`, `server/src/app.js:57-71`.

- Garde `verifyRequestOrigin` appliquée globalement après `express.json` : pour toute méthode autre que `GET`, `HEAD`, `OPTIONS`, si l'en-tête `Origin` est présent il doit appartenir à `env.corsOrigins` ; sinon `403 FORBIDDEN`.
- Les requêtes **sans** `Origin` sont autorisées (curl, serveur à serveur, tests). Il n'y a ni jeton CSRF double soumission ni vérification `Referer`.
- `corsOrigins` provient de `CORS_ORIGIN` (liste séparée par virgules) ou de `APP_URL` (`env.js:55-58`).
- CORS : `credentials: true`, origine autorisée seulement si dans la liste ; une origine inconnue ne reçoit pas d'en-tête CORS, mais la requête peut tout de même atteindre l'API pour un client non-navigateur.
- `SameSite=Lax` sur les deux cookies réduit l'envoi cross-site sur les requêtes mutantes, mais ne remplace pas un jeton CSRF.
- Helmet est activé ; la CSP est désactivée hors production (`app.js:50-55`).

### 4.7 Journal d'audit

Source : `server/src/repositories/auditRepository.js`, migrations `004`.

| Action | Déclencheur | Acteur | Détails |
|---|---|---|---|
| `LOGIN_FAILED` | Email inconnu, compte inactif ou mot de passe faux | NULL | `{ reason: 'invalid_credentials' }` |
| `LOGIN_SUCCESS` | Mot de passe valide | utilisateur | aucun |
| `PASSWORD_RESET_REQUESTED` | Demande de reset pour compte actif | utilisateur | aucun |
| `PASSWORD_RESET_COMPLETED` | Reset réussi | utilisateur | aucun |
| `PASSWORD_CHANGED` | Changement via `/users/me/password` | utilisateur | aucun |
| `ROLE_CHANGED` | Admin change un rôle | admin | `{ userId, previousRole, nextRole }` |
| `USER_STATUS_CHANGED` | Admin active/désactive | admin | `{ userId, isActive }` |

- Les détails sont sérialisés en JSON ; le commentaire du repository interdit explicitement mots de passe, jetons et URL complètes (`auditRepository.js:3-6`).
- Aucun audit pour `register`, `logout`, `refresh`, les projets, les tâches ou les commentaires.
- Aucun endpoint de lecture/export ; aucune politique de rétention documentée.
- `LOGIN_SUCCESS` est inséré **avant** `createSession` (`auth.routes.js:76-80`) : si la création de session échoue, l'audit de succès reste présent.
- `activity_logs` est un journal fonctionnel distinct, non un journal de sécurité.

### 4.8 Synthèse des transitions d'authentification

| Événement | Cookie d'accès | Session refresh | Audit |
|---|---|---|---|
| Register | non émis | non créée | aucun |
| Login réussi | émis (15 min) | créée (7 j) | `LOGIN_SUCCESS` |
| Login échoué | non | non | `LOGIN_FAILED` |
| Refresh | réémis | ancienne révoquée, nouvelle créée | aucun |
| Repli access expiré | réémis | conservée, `last_used_at` mis à jour | aucun |
| Logout | effacé | révoquée si cookie présent | aucun |
| Changement de mot de passe | réémis | toutes révoquées puis une nouvelle | `PASSWORD_CHANGED` |
| Reset mot de passe | effacé | toutes révoquées | `PASSWORD_RESET_REQUESTED` + `PASSWORD_RESET_COMPLETED` |
| Désactivation admin | non modifié côté client | toutes révoquées | `USER_STATUS_CHANGED` |
| Changement de rôle | non modifié | non révoquée | `ROLE_CHANGED` |

## 5. Règles métier

### 5.1 Projets : visibilité, gestion, écriture

- **Visibilité** : `ADMIN` voit tout ; sinon `owner_id = user.id` OU présence dans `project_members` (`projectRepository.js:24-35`). La liste et le détail appliquent la même règle ; un non-membre reçoit `403`.
- **Création** : réservée aux rôles globaux `ADMIN` et `PROJECT_MANAGER` (`projects.routes.js:74-77`). Le créateur devient propriétaire et membre `MANAGER`.
- **Gestion** : `canManage` = admin, propriétaire ou membre `MANAGER` (`accessControl.js:16`). Un `PROJECT_MANAGER` global qui n'est ni propriétaire ni manager projet ne peut pas modifier un projet.
- **Écriture** : tout projet `ARCHIVED` est en lecture seule. Les mutations projet, membres, tâches et commentaires lèvent `409 CONFLICT` (`accessControl.js:34-38`, `:72-76`).
- **Archivage** : `DELETE /projects/:id` archive, ne supprime pas. Un projet déjà archivé renvoie `200` sans nouvelle activité. Aucun endpoint de désarchivage ; une fois `ARCHIVED`, `PATCH` est bloqué par `assertProjectWritable`, donc le statut ne peut plus changer.
- **Dates** : `dueDate < startDate` -> `422 UNPROCESSABLE_ENTITY` à la création et à la mise à jour, en tenant compte des valeurs existantes non modifiées (`projects.routes.js:42-48`, `:165-167`).
- **Transition de statut projet** : aucune machine à états. `PATCH` accepte n'importe quelle valeur de l'ENUM (sauf si le projet est déjà archivé) ; passer à `ARCHIVED` renseigne `archived_at`.
- **Membres** : ajout d'un utilisateur actif uniquement ; doublon interdit par `UNIQUE(project_id,user_id)` et vérification applicative (`409`). Le retrait désassigne toutes ses tâches du projet (`projectRepository.js:228-235`) et journalise l'activité.

### 5.2 Tâches : permissions et assignation

- **Création** : `canManage` + projet non archivé. L'assigné, s'il est fourni, doit être un utilisateur actif ; s'il n'est pas le propriétaire du projet, il doit être membre (`tasks.routes.js:61-76`). Sinon `422` avec détail `assigneeId`.
- **Lecture** : `canView` ; les tâches supprimées sont exclues (`deleted_at IS NULL`) et répondent `404`.
- **Modification complète** : `canManage` (admin, propriétaire, manager projet). Les champs modifiables sont `title`, `description`, `status`, `priority`, `assigneeId`, `dueDate` (`tasks.routes.js:78-87`).
- **Modification statut seul** : tout membre du projet peut appeler `PATCH /tasks/:id` avec un corps ne contenant que `status`, ou `PATCH /tasks/:id/status` (`tasks.routes.js:260-270`, `:333-347`). Le nom de variable `actingAsAssignee` est trompeur : la condition réelle est `canChangeStatus`, qui inclut tout membre, pas seulement l'assigné.
- **Suppression** : `canManage` ; soft delete uniquement.
- **Projet archivé** : création, modification, changement de statut, suppression, commentaires -> `409`.
- **Assignation après retrait d'un membre** : les tâches sont désassignées (`assignee_id = NULL`), donc plus de notification d'échéance pour cet utilisateur.

### 5.3 Transitions de statut des tâches

- Statuts autorisés : `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE` (`schemas.js:6`).
- Aucune machine à états : toute transition vers n'importe quel statut de l'ENUM est acceptée, y compris `DONE -> TODO` et `TODO -> DONE`.
- `completed_at` est fixé à `new Date()` lors d'un passage à `DONE`, et remis à `NULL` pour tout autre statut (`tasks.routes.js:209-217`, `:278-280`).
- Si le statut demandé est identique au statut courant, `applyStatusChange` retourne la ligne sans activité ni notification (`tasks.routes.js:204-207`).
- Les transitions ne sont pas contraintes par le rôle projet au-delà de `canChangeStatus` : un simple membre peut rouvrir une tâche terminée.
- La documentation `AGENT/07_DATABASE_SCHEMA.md:171` demande que les transitions soient validées par le backend ; seule la validité ENUM l'est.

### 5.4 Commentaires

- **Création/lecture** : tout utilisateur ayant accès à la tâche. La création exige un projet non archivé.
- **Modification** : auteur ou `ADMIN` uniquement (`tasks.routes.js:423-426`). Un manager projet ne peut pas modifier le commentaire d'un autre.
- **Suppression** : auteur, `ADMIN`, propriétaire du projet ou manager projet (`canManage`) (`tasks.routes.js:447-450`).
- **Soft delete** : `comments.deleted_at` ; les listes filtrent `deleted_at IS NULL` ; un commentaire supprimé est `404` en modification/suppression.
- **Contenu** : 1 à 5000 caractères après trim ; pas d'assainissement HTML côté backend (le frontend doit échapper).
- **Projet archivé** : création, modification et suppression renvoient `409`.

### 5.5 Soft delete

| Entité | Mécanisme | Effet API | Conservation |
|---|---|---|---|
| Tâche | `tasks.deleted_at` (`004`) | Disparaît des listes, du détail (`404`), des agrégats de progression, des rapports et des échéances | Commentaires et `activity_logs` conservés ; activité de suppression avec `task_id = NULL` |
| Commentaire | `comments.deleted_at` (`001`) | Disparaît des listes, `404` en édition/suppression | Ligne conservée |
| Projet | `status=ARCHIVED`, `archived_at` | Reste visible, lecture seule | Toutes les données conservées |

Aucune purge automatique, aucune restauration, aucun endpoint « corbeille ». La suppression d'un projet n'efface ni tâches ni commentaires.

### 5.6 Calcul de progression

Source : `server/src/utils/serializers.js:64-87`, `server/src/repositories/projectRepository.js:12-16`.

- `taskCount` = nombre de tâches du projet avec `deleted_at IS NULL`.
- `completedTaskCount` = tâches `deleted_at IS NULL AND status = 'DONE'`.
- `progress = taskCount === 0 ? 0 : Math.round(completedTaskCount / taskCount * 100)`.
- La progression est recalculée à chaque sérialisation de projet (liste, détail, rapports, timeline) ; aucune colonne n'est stockée.
- `GET /reports/summary` calcule une progression globale sur l'ensemble des tâches accessibles, pas une moyenne des progressions projet (`insights.routes.js:35-39`).
- Les tâches de projets archivés ne sont pas exclues des agrégats de projet ni du rapport global : la condition porte sur `deleted_at`, pas sur `projects.status`.

### 5.7 Échéances, notifications et déduplication

**Détection** (`taskRepository.js:192-223`) :

- En retard : `assignee_id = user`, tâche non supprimée, projet non archivé, statut `<> DONE`, `due_date < UTC_TIMESTAMP()`.
- Échéance proche : mêmes filtres, `due_date >= UTC_TIMESTAMP()` et `<= UTC_TIMESTAMP() + 24 HOUR`. La fenêtre de 24 h est codée en dur dans l'appel (`notificationService.js:132`).

**Déclenchement** :

- À la demande lors de `GET /notifications` et `GET /notifications/unread-count` (`notifications.routes.js:27`, `:48`).
- Au démarrage du serveur si la base est connectée et hors test (`server.js:58-74`).
- Toutes les heures via `setInterval(60 * 60 * 1000)`, timer `unref` (`deadlineService.js:28-36`, `server.js:76`).
- Le balayage parcourt tous les utilisateurs actifs et ignore ceux dont `notificationPrefs.dueSoon` est faux (`deadlineService.js:10-22`).

**Déduplication** :

- Clés `task_overdue:{taskId}:{YYYY-MM-DD}` et `task_due_soon:{taskId}:{YYYY-MM-DD}` en UTC (`notificationService.js:7-9`, `:149`, `:167`).
- Insertion `INSERT IGNORE` + UNIQUE `(user_id, dedup_key)` (`notificationRepository.js:16-33`). Une notification maximum par tâche, par utilisateur et par jour UTC.
- Les notifications d'attribution et de changement de statut n'ont pas de `dedup_key` (NULL), donc chaque événement crée une ligne.

**Destinataires** :

- `TASK_ASSIGNED` : assigné, sauf si acteur, et si `assigned` est vrai (`notificationService.js:17-40`).
- `TASK_STATUS_CHANGED` / `TASK_COMPLETED` : assigné + propriétaire + managers projet, hors acteur, une fois par utilisateur, si `statusChange` est vrai (`notificationService.js:42-97`, `projectRepository.js:180-195`).
- `PROJECT_INVITE` : membre ajouté actif ; **ne consulte pas** `notificationPrefs` (`notificationService.js:99-119`).
- `TASK_OVERDUE` / `TASK_DUE_SOON` : uniquement l'assigné, si `dueSoon` est vrai.

**Contenu** : `title`/`message` sont rédigés en anglais ; un `payload` JSON structuré (ids, noms, statuts) permet au frontend de rendre en FR/EN (`notificationService.js:28-34`). Les messages stockés ne sont pas localisés.

### 5.8 Activité, rapports, calendrier, timeline

- **Activité** : écrite pour `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_ARCHIVED`, `MEMBER_ADDED`, `MEMBER_REMOVED`, `TASK_CREATED`, `TASK_UPDATED`, `STATUS_CHANGED`, `TASK_COMPLETED`, `TASK_DELETED` (`activityRepository.js` et appels dans les routes). Aucune activité pour les commentaires, l'authentification ou les notifications.
- **Visibilité activité globale** : admin tout ; sinon journal de l'acteur OU journal d'un projet dont l'utilisateur est membre/propriétaire (`activityRepository.js:43-62`).
- **Rapports** : `totalProjects`, `totalTasks`, `completedTasks`, `pendingTasks` (= total - terminées), `overdueTasks`, `overallProgress`, `projects`, `tasksByStatus`, `tasksByPriority` (`insights.routes.js:24-66`). Aucun filtre de date.
- **Calendrier** : deux types d'événements, `TASK_DUE` (date/heure de `due_date`) et `PROJECT_DUE` (date de `due_date`), filtre `from`/`to` par comparaison de chaînes `AAAA-MM-JJ` (`insights.routes.js:114-163`). Si `from > to`, aucun contrôle : liste vide.
- **Timeline** : renvoie tous les projets accessibles avec leurs dates, sans filtre (`insights.routes.js:171-177`).

### 5.9 Validation, pagination et erreurs

- Validation Zod systématique des `params`, `query`, `body` via `validate({ ... })` ; les valeurs parsées sont exposées dans `req.valid` (`server/src/utils/validate.js:15-39`). Les schémas ne sont pas `.strict()` : les champs inconnus du corps sont supprimés.
- Pagination : `page` défaut 1, `limit` défaut 20, plafond 100 ; `limit=500` est rejeté en `400` par le schéma avant le plafonnement (`pagination.js:9-20`, test `api.integration.test.js:480-481`).
- Tris : liste blanche par repository (`projectRepository.js:3-22`, `taskRepository.js:3-25`, `userRepository.js:8-20`), donc pas d'injection SQL via `sortBy`.
- Recherche : `LIKE '%...%'` paramétré ; les caractères `%` et `_` ne sont pas échappés (effet de wildcard, pas d'injection).
- Codes d'erreur : `VALIDATION_ERROR` 400, `INVALID_JSON` 400, `INVALID_PASSWORD` 400, `INVALID_RESET_TOKEN` 400, `SELF_DEACTIVATION` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `UNPROCESSABLE_ENTITY` 422, `TOO_MANY_*` 429, `INTERNAL_ERROR` 500, `DATABASE_UNAVAILABLE` 503 (`utils/errors.js`, `errorHandler.js`).
- Les erreurs MySQL de connexion sont converties en `503 DATABASE_UNAVAILABLE` sans fuite de credentials (`errorHandler.js:28-38`). Le handler 404 ne reflète jamais l'URL (`notFound.js:3-7`).

## 6. Inventaire des tests

### 6.1 Décompte et infrastructure

| Fichier | Nombre de `it()` | Portée |
|---|---:|---|
| `server/tests/foundation.test.js` | 4 | Santé, 404, JSON invalide, en-têtes Helmet |
| `server/tests/api.integration.test.js` | 25 | API réelle sur MySQL de test, auth, RBAC, projets, tâches, notifications, audit |
| **Total** | **29** | Vérifié statiquement par recherche des `it(` dans les deux fichiers |

- Aucun test n'a été exécuté pendant cet audit ; aucun taux de réussite ni couverture n'est affirmé.
- Configuration : `NODE_ENV=test`, `BCRYPT_ROUNDS=4`, `fileParallelism: false`, timeouts 20 s / 30 s (`vitest.config.js:4-14`).
- Les tests d'intégration nécessitent une base MySQL accessible via `TEST_DB_NAME` (`watchtower_test` par défaut, `env.js:64-66`). `prepareDatabase` applique les migrations une fois puis vide les tables (`server/tests/helpers.js:23-44`) ; `resetData` tronque 10 tables sur une connexion dédiée avec `FOREIGN_KEY_CHECKS=0` (`helpers.js:8-19`, `:31-44`).
- `beforeEach` recrée trois comptes (`ADMIN`, `PROJECT_MANAGER`, `TEAM_MEMBER`) et trois agents connectés (`api.integration.test.js:59-82`). Mot de passe commun : `Password123!`.
- Le test de rate limiting construit une application séparée avec `rateLimiting: true` (`api.integration.test.js:685`).

### 6.2 `foundation.test.js` (4 tests)

| Ligne | Test | Vérifie |
|---:|---|---|
| 12 | Health sans fuite | `GET /api/v1/health` renvoie 200 ou 503, `data.service = 'WatchTower API'`, `data.database.connected` booléen. |
| 22 | 404 uniforme | Endpoint inconnu -> 404 avec `{ success:false, error:{ code:'NOT_FOUND', message, details:[] } }`. |
| 37 | JSON malformé | Corps `{"broken":` -> 400 `INVALID_JSON`. |
| 55 | Helmet | `X-Content-Type-Options: nosniff` et `X-Frame-Options: SAMEORIGIN`. |

### 6.3 `api.integration.test.js` (25 tests)

| Ligne | Test | Vérifie |
|---:|---|---|
| 88 | Inscription | Rôle `ADMIN` injecté ignoré -> `TEAM_MEMBER` ; pas de `passwordHash` ; préférences par défaut ; doublon -> `409`. |
| 110 | Login/logout | Erreur générique sur mauvais mot de passe ; cookies `wt_access`/`wt_refresh` HttpOnly ; `/auth/me` avec cookie d'accès ; logout puis refresh -> `401`. |
| 142 | Accès non authentifié | `/projects`, `/tasks`, `/users`, `/notifications` sans cookie -> `401` ; JWT falsifié -> `401`. |
| 155 | Annuaire utilisateurs | `TEAM_MEMBER` -> `403` ; PM -> `200` avec champs publics ; admin -> champs complets ; auto-modification de rôle ignorée ; changement de rôle par membre -> `403`. |
| 187 | Préférences | Persistance langue/thème et fusion `notificationPrefs` ; relecture via `/auth/me`. |
| 208 | Changement de mot de passe | Ancien mot de passe faux -> `400 INVALID_PASSWORD` ; succès ; ancien login refusé ; nouveau login accepté. |
| 236 | Projets et visibilité | Création -> propriétaire, `memberCount=1`, `progress=0` ; projet invisible pour non-membre (`403`) ; ajout de membre puis détail avec 2 membres ; admin voit tout. |
| 267 | Dates et gestion | Dates inversées -> `422` ; nom vide -> `400` ; un manager ne peut pas modifier le projet d'un admin (`403`). |
| 286 | Règles de membres | Ajout `201` ; doublon `409` ; utilisateur inexistant `404` ; retrait du propriétaire `422` ; retrait d'un membre `200` puis accès `403`. |
| 313 | Tâches, assignation, commentaires, progression | Assigné non-membre -> `422` ; création avec assigné membre ; membre change le statut ; membre ne peut pas éditer le titre (`403`) ; manager édite ; commentaire créé/listé/supprimé logiquement ; `DONE` remplit `completedAt` ; progression 100. |
| 379 | Projet archivé | `DELETE` -> `ARCHIVED` ; `PATCH` -> `409` ; création de tâche -> `409` ; commentaire -> `409`. |
| 403 | Notifications d'attribution | Notification `TASK_ASSIGNED` non lue ; accès croisé admin -> `404` ; compteur non lu ; marquage lu ; `read-all` ; compteur à 0. |
| 434 | Insights | `reports/summary` (totaux, statut, progression) ; activité globale et projet ; timeline ; calendrier avec `TASK_DUE`. |
| 469 | Pagination | `page=2&limit=2` -> 1 élément et meta `{page:2,limit:2,total:3,totalPages:2}` ; `limit=500` -> `400`. |
| 484 | Liste des tâches | Un manager, un membre et un admin voient les tâches accessibles via `GET /tasks`. |
| 503 | Rotation refresh | Refresh -> nouveau cookie différent ; rejeu de l'ancien -> `401` ; JWT expiré seul -> `401` ; JWT expiré + refresh valide -> `200` et nouveau cookie d'accès. |
| 542 | Reset mot de passe | Jeton expiré -> `400 INVALID_RESET_TOKEN` ; nouveau jeton -> reset `200` ; rejeu -> `400` ; ancien mot de passe refusé ; nouveau accepté. |
| 588 | `/auth/verify` | Jeton valide -> `valid:true` ; après désactivation du compte -> `401`. |
| 607 | Statut vs édition | Tout membre peut changer le statut (`IN_REVIEW`) ; édition de priorité refusée (`403`) ; manager autorisé ; outsider ne voit pas la tâche (`403`). |
| 639 | Administration utilisateurs | Dernier admin ne peut être rétrogradé (`409`) ni se désactiver (`400`) ; profil étranger `403` ; profil propre `200` ; avatar `javascript:` refusé (`400`) ; URL https acceptée. |
| 667 | Origine et injection | `Origin` étranger sur mutation -> `403` ; recherche `' OR 1=1 --` traitée comme donnée (0 résultat) ; 404 sans réflexion du paramètre `token`. |
| 684 | Rate limit login | 10 échecs avec XFF variés -> `401`, 11e tentative -> `429 TOO_MANY_LOGIN_ATTEMPTS`. |
| 703 | Soft delete tâche | Suppression -> détail `404`, liste vide, `taskCount=0` ; `deleted_at` renseigné ; commentaire et activité conservés en base. |
| 739 | Préférences et dédup | `statusChange=false` et `dueSoon=false` suppriment les notifications correspondantes ; tâche en retard -> une seule `TASK_OVERDUE` avec clé `task_overdue:` ; relecture ne duplique pas ; `TASK_COMPLETED` reçu par le manager. |
| 801 | Audit | Écriture de `LOGIN_FAILED`, `LOGIN_SUCCESS`, `ROLE_CHANGED`, `USER_STATUS_CHANGED` dans `audit_logs`. |

## 7. Limites connues

### 7.1 Limites explicitement documentées

| Limite | Source | Description |
|---|---|---|
| Jeton de reset exposé en développement | `README.md:135-138`, `env.js:81-83` | `POST /auth/forgot-password` renvoie `resetToken` et le journalise hors production, faute de fournisseur email ; désactivable par `EXPOSE_RESET_TOKEN=false`. |
| JWT d'accès non révocable | `README.md:138`, `AGENT/06_API_SPECIFICATION.md:79` | Le logout révoque la session refresh et efface les cookies, mais un access JWT déjà émis reste cryptographiquement valide jusqu'à 15 min. |
| Annuaire accessible aux Project Managers | `README.md:139`, `AGENT/06_API_SPECIFICATION.md:93` | `GET /users` est ouvert aux PM pour le sélecteur de membres, avec un sous-ensemble de champs ; l'administration complète reste admin-only. Écart documenté par rapport au tableau initial. |
| Notifications d'échéance à la demande + horaires | `README.md:140`, `AGENT/06_API_SPECIFICATION.md:155` | Génération lors de la lecture des notifications, au démarrage et toutes les heures ; déduplication par tâche et par jour. |
| Suppression logique des tâches | `README.md:141`, `AGENT/06_API_SPECIFICATION.md:129` | Les tâches supprimées disparaissent des vues et de la progression, mais commentaires et activité restent en base. |
| Arrêt gracieux | `README.md:142` | `SIGTERM`/`SIGINT` arrêtent le scheduler, Vite et le pool MySQL, avec sortie forcée après 10 s (`server.js:78-107`). |
| Périmètre hors MVP | `AGENT/01_PRD.md:193-203` | Chat privé temps réel, visioconférence, notifications email, 2FA, intégrations externes, facturation, export PDF/Excel, application mobile native : non prévus. |
| Pas d'audit professionnel | `AGENT/05_SECURITY_CHECKLIST.md:3`, `:92-94` | La checklist est une base de développement, pas un audit externe ; les limites restantes doivent être documentées et l'app ne doit pas être déclarée prête en production avec une vulnérabilité critique. |
| Déploiement non présumé | `AGENT/02_ARCHITECTURE.md:193-195` | Hébergement, HTTPS, sauvegardes, secrets, migrations et restauration restent à définir avant production. |
| Pas de taux de réussite sans exécution | `AGENT/08_TEST_PLAN.md:160` | Interdiction d'annoncer un taux de réussite ou une couverture sans mesure réelle. |
| Décisions de schéma initialement à confirmer | `AGENT/07_DATABASE_SCHEMA.md:196-203` | Identifiants BIGINT, ORM, soft delete, politique de création de projet, calcul de progression, conservation après archivage. Le code tranche : BIGINT, mysql2 brut (pas d'ORM), archivage projet + soft delete tâche/commentaire, progression calculée. |
| Secret JWT éphémère hors production | `env.js:10-20` | Sans `JWT_SECRET` valide, un secret aléatoire est généré par processus : les jetons deviennent invalides après redémarrage. |
| Rate limiting désactivé en test | `env.js:86-88`, `.env.example` | Les limiteurs sont neutralisés sauf `RATE_LIMIT_ENABLED=true` ; le comportement 429 est testé via une app dédiée. |
| `trust proxy` désactivé par défaut | `env.js:38-47` | `X-Forwarded-For` n'est honoré que si `TRUST_PROXY` est explicitement configuré, pour éviter l'usurpation d'IP et le contournement des limites. |

### 7.2 Constats d'audit non documentés

Les points suivants sont des observations de lecture, non validées par exécution. Ils ne sont pas présentés comme des vulnérabilités critiques.

1. **Durée du cookie d'accès fixe** : `ACCESS_COOKIE_MAX_AGE_MS` vaut toujours 15 min (`cookies.js:3`), alors que `JWT_EXPIRES_IN` est configurable (`env.js:70`). Un JWT plus long que le cookie est rechargé via le refresh ; un JWT plus court laisse un cookie invalide jusqu'au repli.
2. **Les connexions réussies consomment le quota** : les limiteurs n'utilisent pas `skipSuccessfulRequests` (`app.js:81-87`). Dix logins valides en 15 min suffisent à bloquer le onzième.
3. **`mark read` peut renvoyer `null`** : après marquage, la route relit les 100 notifications les plus récentes et cherche l'id (`notifications.routes.js:73-83`). Une notification ancienne déjà lue peut être marquée mais renvoyée avec `data: null`.
4. **Transitions de projet non validées** : `PATCH /projects/:id` accepte toute valeur de l'ENUM (`projects.routes.js:174-179`), sans machine à états. Un projet archivé ne peut plus être modifié, donc ne peut pas être désarchivé via l'API.
5. **`PROJECT_INVITE` ignore les préférences** : `notifyProjectMemberAdded` ne lit pas `notificationPrefs` (`notificationService.js:99-119`), alors que `AGENT/06_API_SPECIFICATION.md:155` indique que les préférences filtrent les créations.
6. **Archives incluses dans les rapports/calendrier** : `listAllProjectsForUser` et `listAllTasksForUser` ne filtrent pas `projects.status` (`projectRepository.js:73-83`, `taskRepository.js:95-107`) ; les rapports et le calendrier incluent donc les projets archivés, contrairement aux notifications d'échéance qui les excluent.
7. **Activité de suppression détachée** : `TASK_DELETED` est inséré avec `task_id = NULL` (`tasks.routes.js:360-371`), donc la ligne n'est plus rattachable à la tâche par FK ; seule la description la référence.
8. **`findTaskById` neutralise `member_role`** : la jointure utilise `pm.user_id = 0` (`taskRepository.js:114`), donc le champ `member_role` est toujours NULL dans les réponses unitaires. Le sérialiseur ne l'utilise pas, mais le contexte de rôle est perdu.
9. **Audit de succès avant session** : `LOGIN_SUCCESS` est écrit avant `createSession` (`auth.routes.js:76-80`) ; un échec de création de session laisserait un audit de succès.
10. **Rotation refresh non atomique côté lecture** : `POST /auth/refresh` lit la session active puis révoque/crée dans une transaction (`auth.routes.js:97-113`). Deux refresh concurrents peuvent tous deux lire la session avant révocation et créer deux nouvelles sessions ; il n'y a pas de détection de réutilisation ni d'invalidation de famille.
11. **Pas de contrainte d'unicité de session active** : `user_sessions` n'interdit pas plusieurs sessions actives par utilisateur ; aucun plafond ni endpoint de révocation individuelle.
12. **Migrations DDL non réellement atomiques** : l'enveloppe `beginTransaction`/`commit` (`migrate.js:50-59`) n'empêche pas les commits implicites MySQL sur `ALTER TABLE`/`CREATE TABLE`.
13. **`GET /activity?projectId=` inaccessible** : renvoie `200` avec une liste vide au lieu de `403` (`insights.routes.js:72-90`), contrairement aux routes projet qui vérifient l'accès.
14. **Pas de pagination** sur les membres de projet (`projectRepository.js:164-173`) ni sur les commentaires (`commentRepository.js:3-12`).
15. **Pas de verrouillage par compte** : la limitation de connexion est par IP (clé par défaut d'express-rate-limit), pas par email ; un attaquant distribué peut cibler un compte.
16. **Fenêtre « due soon » fixe** : 24 h codées en dur (`notificationService.js:132`), non configurable.
17. **Messages de notification en anglais** : les colonnes `title`/`message` sont en anglais (`notificationService.js:26-27`, `:78-81`) ; la localisation est laissée au frontend via `payload`.
18. **Pas de lecture des audits** : `audit_logs` n'a aucun endpoint ni politique de rétention ; les administrateurs ne peuvent pas consulter la piste d'audit via l'API.
19. **Pas de vérification d'email, de 2FA, de gestion de mot de passe oublié par email** : cohérent avec le périmètre académique, mais à documenter avant production.
20. **Recherche non échappée pour `%`/`_`** : les motifs `LIKE` sont paramétrés (pas d'injection SQL) mais les wildcards utilisateur ne sont pas neutralisés (`projectRepository.js:50-54`, `taskRepository.js:64-68`).
