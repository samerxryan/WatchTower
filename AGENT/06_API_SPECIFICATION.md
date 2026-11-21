# WatchTower — Spécification de l'API REST

**Base path proposé :** `/api/v1`  
**Format :** JSON  
**Authentification :** JWT pour les routes protégées

Cette spécification définit le contrat initial. Les routes peuvent être ajustées avant implémentation, mais toute modification doit être répercutée dans le frontend, les tests et ce document.

> **Statut :** implémenté et validé par des tests d'intégration. Les blocs « Implémentation » ci-dessous décrivent les décisions concrètes prises lors du développement.

## 1. Conventions

- Les noms de ressources sont au pluriel.
- Les identifiants sont des `BIGINT` cohérents dans tout le projet.
- Les dates sont échangées au format ISO 8601 (les colonnes `DATE` au format `AAAA-MM-JJ`).
- Les réponses sont en JSON sauf indication contraire.
- Les listes volumineuses sont paginées.
- Le serveur calcule les champs dérivés tels que la progression.
- Ne jamais faire confiance au rôle ou à l'identifiant d'utilisateur fourni dans le corps de la requête.

## 2. Codes HTTP

| Code | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 204 | Succès sans contenu |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Permission insuffisante |
| 404 | Ressource inexistante ou non accessible |
| 409 | Conflit |
| 422 | Validation métier échouée |
| 429 | Trop de requêtes |
| 500 | Erreur serveur |

## 3. Format de réponse

Succès :

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Erreur :

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données fournies sont invalides.",
    "details": []
  }
}
```

Ne pas renvoyer de stack trace ou de détails internes au client en production.

## 4. Authentification

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Créer un compte avec rôle standard uniquement |
| POST | `/auth/login` | Public | Connexion |
| POST | `/auth/refresh` | Session de rafraîchissement | Renouveler l'accès et faire tourner la session |
| POST | `/auth/logout` | Authentifié | Déconnexion/révocation selon stratégie |
| POST | `/auth/forgot-password` | Public | Demander une réinitialisation |
| POST | `/auth/reset-password` | Public avec token temporaire | Réinitialiser le mot de passe |
| GET | `/auth/me` | Authentifié | Utilisateur courant |
| GET | `/auth/verify` | Authentifié | Vérifier la validité du jeton d'accès |

Ne jamais accepter un rôle `ADMIN` depuis l'inscription publique.

**Implémentation :** l'accès est un JWT `HttpOnly` de 15 minutes ; la session de rafraîchissement est un jeton opaque aléatoire de 7 jours stocké uniquement sous forme de hash SHA-256 dans `user_sessions`. `POST /auth/refresh` révoque l'ancien jeton et en émet un nouveau (rotation), ce qui évite au frontend de gérer une logique de nouvelle tentative. `POST /auth/logout`, un changement de mot de passe et une réinitialisation révoquent la session ; la désactivation d'un compte révoque toutes ses sessions. Le jeton d'accès déjà émis reste cryptographiquement valide jusqu'à son expiration (15 minutes maximum), comportement standard d'un JWT sans état.

## 5. Utilisateurs

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/users/me` | Authentifié | Profil courant |
| PATCH | `/users/me` | Authentifié | Modifier son profil |
| PATCH | `/users/me/password` | Authentifié | Modifier son mot de passe |
| GET | `/users` | Admin, Project Manager (champs limités) | Lister les utilisateurs |
| GET | `/users/:id` | Admin ou accès autorisé | Détail utilisateur |
| PATCH | `/users/:id/role` | Admin | Modifier le rôle |
| PATCH | `/users/:id/status` | Admin | Activer/désactiver un compte |

**Écart documenté :** `GET /users` est également accessible aux Project Managers parce que le sélecteur de membres d'un projet a besoin de l'annuaire. Ils ne reçoivent qu'un sous-ensemble de champs (`id`, `fullName`, `email`, `role`, `avatarUrl`, `isActive`) ; les préférences, dates de création et données d'administration restent réservées aux Admins. L'administration complète des comptes demeure admin-only.

**Implémentation :** le Profil Project Manager peut consulter le détail public d'un utilisateur, mais ne peut ni changer un rôle ni activer/désactiver un compte. Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé, et un compte ne peut pas se désactiver lui-même.

## 6. Projets

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/projects` | Utilisateur authentifié | Lister les projets accessibles |
| POST | `/projects` | Project Manager/Admin selon règle | Créer un projet |
| GET | `/projects/:projectId` | Membre autorisé/Admin | Détail projet |
| PATCH | `/projects/:projectId` | Manager autorisé/Admin | Modifier un projet |
| DELETE | `/projects/:projectId` | Manager autorisé/Admin | Archiver/supprimer selon règle |
| GET | `/projects/:projectId/members` | Membre autorisé | Lister les membres |
| POST | `/projects/:projectId/members` | Manager autorisé | Ajouter un membre |
| DELETE | `/projects/:projectId/members/:userId` | Manager autorisé | Retirer un membre |

**Implémentation :** `DELETE /projects/:projectId` archive le projet (soft delete) ; le propriétaire du projet ne peut pas être retiré de ses membres. Un projet archivé devient **lecture seule** : toute modification du projet, de ses membres, de ses tâches ou de ses commentaires renvoie `409 CONFLICT`. La progression est calculée côté serveur : `ROUND(tâches terminées / total × 100)`, avec `0` lorsqu'il n'y a aucune tâche.

## 7. Tâches

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/tasks` | Utilisateur authentifié | Lister toutes les tâches accessibles (Kanban, tableau de bord) |
| GET | `/projects/:projectId/tasks` | Membre autorisé | Lister les tâches du projet |
| POST | `/projects/:projectId/tasks` | Manager autorisé | Créer une tâche |
| GET | `/tasks/:taskId` | Utilisateur autorisé | Détail tâche |
| PATCH | `/tasks/:taskId` | Utilisateur autorisé selon champ | Modifier une tâche |
| DELETE | `/tasks/:taskId` | Manager autorisé | Supprimer une tâche |
| PATCH | `/tasks/:taskId/status` | Utilisateur autorisé | Changer le statut |

Champs possibles d'une tâche :
`title`, `description`, `status`, `priority`, `dueDate`, `assigneeId`, `projectId`.

Le backend doit vérifier que le responsable assigné appartient au projet.

**Implémentation :** `GET /tasks` renvoie l'union des tâches des projets accessibles, filtrée par `projectId`, `status`, `priority`, `assigneeId` et `search`. Seuls les Admins et les Project Managers peuvent modifier tous les champs d'une tâche ou la supprimer. Tout membre du projet peut changer le statut via `PATCH /tasks/:taskId` (si le corps ne contient que `status`) ou `PATCH /tasks/:taskId/status`, afin de préserver l'UX du Kanban ; l'édition complète reste réservée aux Managers et Admins. Le passage à `DONE` renseigne `completedAt`, un retour depuis `DONE` le remet à `null`. `DELETE /tasks/:taskId` est une **suppression logique** (`deleted_at`) : la tâche disparaît de toutes les listes et du calcul de progression, mais ses commentaires et son historique d'activité sont conservés.

## 8. Commentaires et activité

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/tasks/:taskId/comments` | Accès à la tâche | Lister les commentaires |
| POST | `/tasks/:taskId/comments` | Accès à la tâche | Ajouter un commentaire |
| PATCH | `/comments/:commentId` | Auteur ou Admin selon politique | Modifier un commentaire |
| DELETE | `/comments/:commentId` | Auteur/Manager/Admin selon politique | Supprimer un commentaire |
| GET | `/projects/:projectId/activity` | Membre autorisé | Consulter l'activité du projet |
| GET | `/activity` | Authentifié | Fil d'activité global filtré aux ressources accessibles |

**Implémentation :** la suppression d'un commentaire est logique (`deleted_at`) ; les commentaires supprimés n'apparaissent plus dans les listes. L'auteur ou un Admin peut modifier un commentaire ; l'auteur, un Manager du projet ou un Admin peut le supprimer. `GET /activity` accepte `projectId` en filtre facultatif et reste soumis aux permissions. Création/modification/suppression de projet, membres et tâches, ainsi que les changements de statut, alimentent `activity_logs`.

## 9. Notifications

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/notifications` | Authentifié | Lister les notifications du compte |
| GET | `/notifications/unread-count` | Authentifié | Compteur non lu |
| PATCH | `/notifications/:notificationId/read` | Propriétaire | Marquer comme lue |
| PATCH | `/notifications/read-all` | Authentifié | Tout marquer comme lu |

Un utilisateur ne peut jamais lire ou modifier les notifications d'un autre utilisateur.

**Implémentation :** chaque notification stocke un `payload` JSON structuré (identifiants, noms, statuts) afin que le frontend puisse la rendre en FR ou EN. Les notifications d'échéance (`TASK_DUE_SOON`, `TASK_OVERDUE`) sont générées à la demande lors de la lecture, ainsi que lors d'un balayage UTC au démarrage et toutes les heures ; elles sont dédupliquées par tâche et par jour via `dedup_key`. Les projets archivés et les tâches supprimées sont exclus du balayage. Les préférences `assigned`, `dueSoon` et `statusChange` filtrent les créations. Un changement de statut notifie le responsable (sauf si c'est l'acteur) ainsi que le propriétaire et les managers du projet ; un `TASK_COMPLETED` est donc émis même lorsque le responsable termine sa propre tâche.

## 10. Calendrier, Timeline et rapports

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/calendar/events` | Authentifié | Événements visibles dans une plage de dates |
| GET | `/timeline/projects` | Authentifié | Projets accessibles avec dates |
| GET | `/reports/summary` | Authentifié | Statistiques simples selon les droits |

Paramètres calendrier recommandés :
- `from` : début de période ISO 8601 ;
- `to` : fin de période ISO 8601 ;
- `projectId` : filtre facultatif, soumis aux permissions.

## 11. Paramètres et préférences

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/users/me/preferences` | Authentifié | Lire langue, thème et préférences |
| PATCH | `/users/me/preferences` | Authentifié | Modifier langue, thème et préférences |

Valeurs initiales :
- langue : `fr` ou `en` ;
- thème : `light` ou `dark`.

## 12. Pagination et filtres

Pour les listes :
- `page` : numéro de page ;
- `limit` : nombre d'éléments, avec plafond côté serveur ;
- `sortBy` : champ autorisé ;
- `sortOrder` : `asc` ou `desc` ;
- filtres documentés par ressource.

Exemple de réponse paginée :

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## 13. Exigences transversales

- Authentification et autorisation appliquées côté backend.
- Validation des paramètres, query strings et corps JSON.
- Rate limiting sur authentification et endpoints sensibles.
- Vérification de propriété/appartenance des ressources.
- Transactions pour les opérations qui modifient plusieurs tables.
- Tests d'intégration des endpoints.
- Documentation mise à jour à chaque évolution du contrat.

**Implémentation :**

- Authentification par cookies `HttpOnly` (`wt_access`, `wt_refresh`), `SameSite=Lax`, `Secure` en production. Aucun jeton n'est stocké dans `localStorage`.
- Garde CSRF par vérification de l'en-tête `Origin` sur les requêtes mutantes ; les origines autorisées viennent de `CORS_ORIGIN`. Les requêtes sans `Origin` (curl, tests) restent autorisées.
- Rate limiting : 60 requêtes/15 min sur `/auth`, 10/15 min sur `/auth/login`, 5/h sur `/auth/forgot-password` (désactivé pratiquement en environnement de test).
- Validation Zod des `params`, `query` et `body` ; les valeurs validées sont exposées via `req.valid`.
- Toutes les opérations multi-tables utilisent des transactions MySQL.
- Identifiants en `BIGINT` sur l'ensemble du schéma.

Les règles d'accès détaillées doivent rester cohérentes avec `01_PRD.md` et `05_SECURITY_CHECKLIST.md`.
