# WatchTower — Schéma de base de données MySQL

**SGBD :** MySQL  
**Modèle :** relationnel  
**Objectif :** stocker les utilisateurs, projets, membres, tâches, commentaires, notifications et activités.

Le schéma ci-dessous est une proposition initiale. Choisir un type d'identifiant unique (UUID ou BIGINT) et l'utiliser partout. Les exemples utilisent `BIGINT` pour rester simples dans un projet académique.

## 1. Conventions

- Tables au pluriel et noms `snake_case`.
- Clés primaires `id`.
- Dates stockées en UTC lorsque possible.
- `created_at` et `updated_at` sur les entités modifiables.
- Clés étrangères explicites.
- Index sur les clés étrangères et les champs de recherche fréquents.
- Contraintes `UNIQUE` pour les identifiants uniques.
- Utiliser `DECIMAL` uniquement pour des valeurs décimales exactes ; ne pas utiliser de flottants pour des montants.
- Les mots de passe sont stockés sous forme de hash uniquement.

## 2. Tables

### 2.1 `users`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK, auto increment |
| full_name | VARCHAR(120) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| role | ENUM('ADMIN','PROJECT_MANAGER','TEAM_MEMBER') | NOT NULL |
| avatar_url | VARCHAR(500) | NULL |
| is_active | BOOLEAN | NOT NULL, défaut TRUE |
| preferred_language | ENUM('fr','en') | défaut 'fr' |
| preferred_theme | ENUM('light','dark') | défaut 'light' |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

Le rôle ne doit pas être modifiable par la route de profil standard.

### 2.2 `projects`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| name | VARCHAR(160) | NOT NULL |
| description | TEXT | NULL |
| status | ENUM('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED') | NOT NULL |
| start_date | DATE | NULL |
| due_date | DATE | NULL |
| owner_id | BIGINT | FK users.id, NOT NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |
| archived_at | DATETIME | NULL |

La progression est calculée à partir des tâches, selon une règle métier définie, et ne doit pas être mise à jour indépendamment sans justification.

### 2.3 `project_members`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK projects.id |
| user_id | BIGINT | FK users.id |
| project_role | ENUM('MANAGER','MEMBER') | NOT NULL |
| joined_at | DATETIME | NOT NULL |

Contrainte unique : `(project_id, user_id)`.

Cette table permet de vérifier l'appartenance d'un utilisateur à un projet.

### 2.4 `tasks`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| project_id | BIGINT | FK projects.id, NOT NULL |
| title | VARCHAR(180) | NOT NULL |
| description | TEXT | NULL |
| status | ENUM('TODO','IN_PROGRESS','IN_REVIEW','DONE') | NOT NULL |
| priority | ENUM('LOW','MEDIUM','HIGH','URGENT') | NOT NULL |
| assignee_id | BIGINT | FK users.id, NULL |
| created_by | BIGINT | FK users.id, NOT NULL |
| due_date | DATETIME | NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |
| completed_at | DATETIME | NULL |

Le backend doit garantir que `assignee_id`, s'il est renseigné, appartient au projet concerné.

### 2.5 `comments`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| task_id | BIGINT | FK tasks.id, NOT NULL |
| author_id | BIGINT | FK users.id, NOT NULL |
| content | TEXT | NOT NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |
| deleted_at | DATETIME | NULL |

La suppression logique peut être utilisée pour conserver la traçabilité, selon la politique retenue.

### 2.6 `notifications`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK users.id, NOT NULL |
| type | VARCHAR(60) | NOT NULL |
| title | VARCHAR(180) | NOT NULL |
| message | VARCHAR(500) | NOT NULL |
| related_entity_type | VARCHAR(40) | NULL |
| related_entity_id | BIGINT | NULL |
| is_read | BOOLEAN | NOT NULL, défaut FALSE |
| created_at | DATETIME | NOT NULL |
| read_at | DATETIME | NULL |

`related_entity_type` et `related_entity_id` constituent une référence polymorphe ; si l'intégrité référentielle stricte est requise, remplacer ce mécanisme par des colonnes FK explicites ou une conception dédiée.

### 2.7 `activity_logs`

| Champ | Type indicatif | Contraintes |
|---|---|---|
| id | BIGINT | PK |
| actor_id | BIGINT | FK users.id, NULL si compte supprimé |
| project_id | BIGINT | FK projects.id, NULL |
| task_id | BIGINT | FK tasks.id, NULL |
| action | VARCHAR(80) | NOT NULL |
| description | VARCHAR(500) | NOT NULL |
| created_at | DATETIME | NOT NULL |

Ne pas enregistrer de secrets ou de données sensibles dans les descriptions.

### 2.8 Table optionnelle `password_reset_tokens`

À ajouter si le flux de réinitialisation est inclus :
- `id` ;
- `user_id` FK ;
- `token_hash` ;
- `expires_at` ;
- `used_at` ;
- `created_at`.

Le token brut ne doit pas être stocké.

## 3. Relations

```text
users 1 ----- N projects              (owner_id)
users N ----- N projects              (via project_members)
projects 1 -- N tasks
users 1 ----- N tasks                 (assignee_id)
users 1 ----- N tasks                 (created_by)
tasks 1 ------ N comments
users 1 ----- N comments              (author_id)
users 1 ----- N notifications
users 1 ----- N activity_logs         (actor_id)
projects 1 -- N activity_logs
tasks 1 ------ N activity_logs
```

## 4. Règles d'intégrité

- Un email utilisateur est unique.
- Un utilisateur ne peut être membre deux fois du même projet.
- Une tâche appartient à un seul projet.
- Un responsable de tâche doit être membre du projet.
- Les dates doivent être cohérentes (date de fin non antérieure à la date de début).
- Les transitions de statut doivent être validées par le backend.
- Les suppressions doivent respecter les dépendances et la politique d'archivage.
- Les données liées à un projet ne sont accessibles qu'aux utilisateurs autorisés.

## 5. Index recommandés

- `users(email)` unique.
- `projects(owner_id, status)`.
- `project_members(project_id, user_id)` unique.
- `project_members(user_id)`.
- `tasks(project_id, status)`.
- `tasks(assignee_id, status)`.
- `tasks(due_date)`.
- `comments(task_id, created_at)`.
- `notifications(user_id, is_read, created_at)`.
- `activity_logs(project_id, created_at)`.

## 6. Migrations et données initiales

- Créer les tables via des migrations versionnées.
- Ne pas modifier manuellement la base de production sans migration.
- Prévoir un script de seed uniquement pour le développement et les tests.
- Les comptes de démonstration doivent utiliser des mots de passe fictifs documentés et ne jamais être déployés en production.
- Ne pas inclure de vraies données personnelles dans le seed.

## 7. Décisions à confirmer avant implémentation

1. Identifiants : BIGINT ou UUID.
2. ORM : Prisma ou Sequelize.
3. Suppression : archivage/soft delete ou suppression réelle par entité.
4. Politique exacte de création de projet et d'attribution des rôles.
5. Calcul officiel de la progression du projet.
6. Conservation des commentaires et logs après archivage.
