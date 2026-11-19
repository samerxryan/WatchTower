# WatchTower — Spécification de l'API REST

**Base path proposé :** `/api/v1`  
**Format :** JSON  
**Authentification :** JWT pour les routes protégées

Cette spécification définit le contrat initial. Les routes peuvent être ajustées avant implémentation, mais toute modification doit être répercutée dans le frontend, les tests et ce document.

## 1. Conventions

- Les noms de ressources sont au pluriel.
- Les identifiants sont des UUID ou des identifiants numériques cohérents dans tout le projet. Choisir une stratégie unique avant les migrations.
- Les dates sont échangées au format ISO 8601.
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
| POST | `/auth/logout` | Authentifié | Déconnexion/révocation selon stratégie |
| POST | `/auth/forgot-password` | Public | Demander une réinitialisation |
| POST | `/auth/reset-password` | Public avec token temporaire | Réinitialiser le mot de passe |
| GET | `/auth/me` | Authentifié | Utilisateur courant |

Ne jamais accepter un rôle `ADMIN` depuis l'inscription publique.

## 5. Utilisateurs

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/users/me` | Authentifié | Profil courant |
| PATCH | `/users/me` | Authentifié | Modifier son profil |
| PATCH | `/users/me/password` | Authentifié | Modifier son mot de passe |
| GET | `/users` | Admin | Lister les utilisateurs |
| GET | `/users/:id` | Admin ou accès autorisé | Détail utilisateur |
| PATCH | `/users/:id/role` | Admin | Modifier le rôle |
| PATCH | `/users/:id/status` | Admin | Activer/désactiver un compte |

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

## 7. Tâches

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/projects/:projectId/tasks` | Membre autorisé | Lister les tâches du projet |
| POST | `/projects/:projectId/tasks` | Manager autorisé | Créer une tâche |
| GET | `/tasks/:taskId` | Utilisateur autorisé | Détail tâche |
| PATCH | `/tasks/:taskId` | Utilisateur autorisé selon champ | Modifier une tâche |
| DELETE | `/tasks/:taskId` | Manager autorisé | Supprimer une tâche |
| PATCH | `/tasks/:taskId/status` | Utilisateur autorisé | Changer le statut |

Champs possibles d'une tâche :
`title`, `description`, `status`, `priority`, `dueDate`, `assigneeId`, `projectId`.

Le backend doit vérifier que le responsable assigné appartient au projet.

## 8. Commentaires et activité

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/tasks/:taskId/comments` | Accès à la tâche | Lister les commentaires |
| POST | `/tasks/:taskId/comments` | Accès à la tâche | Ajouter un commentaire |
| PATCH | `/comments/:commentId` | Auteur ou Admin selon politique | Modifier un commentaire |
| DELETE | `/comments/:commentId` | Auteur/Manager/Admin selon politique | Supprimer un commentaire |
| GET | `/projects/:projectId/activity` | Membre autorisé | Consulter l'activité du projet |

## 9. Notifications

| Méthode | Endpoint | Accès | Description |
|---|---|---|---|
| GET | `/notifications` | Authentifié | Lister les notifications du compte |
| GET | `/notifications/unread-count` | Authentifié | Compteur non lu |
| PATCH | `/notifications/:notificationId/read` | Propriétaire | Marquer comme lue |
| PATCH | `/notifications/read-all` | Authentifié | Tout marquer comme lu |

Un utilisateur ne peut jamais lire ou modifier les notifications d'un autre utilisateur.

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

Les règles d'accès détaillées doivent rester cohérentes avec `01_PRD.md` et `05_SECURITY_CHECKLIST.md`.
