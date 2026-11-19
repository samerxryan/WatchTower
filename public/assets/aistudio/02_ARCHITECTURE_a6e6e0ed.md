# WatchTower — Architecture technique

**Version :** 1.0  
**Architecture :** application web en trois couches (frontend, API backend, base de données)

## 1. Vue d'ensemble

```text
Navigateur
   |
   v
React (UI, routes, état, i18n)
   |
   | HTTPS / JSON / REST
   v
Node.js + Express (API)
   |-- Authentification JWT
   |-- Autorisation RBAC
   |-- Validation des entrées
   |-- Services métier
   |-- Accès aux données
   |
   v
MySQL (données persistantes)
```

Le frontend ne se connecte jamais directement à MySQL. Toute opération de données passe par l'API backend.

## 2. Frontend

Technologies :
- React ;
- JavaScript ;
- React Router ou solution équivalente ;
- bibliothèque de composants cohérente avec le Design System ;
- client HTTP centralisé ;
- solution i18n pour FR/EN.

Responsabilités :
- afficher les pages et composants ;
- gérer les formulaires et validations ergonomiques ;
- afficher les erreurs API ;
- gérer les préférences de langue et de thème ;
- protéger l'expérience de navigation selon le rôle ;
- ne jamais être la seule couche de contrôle d'accès.

Structure indicative :

```text
client/
  src/
    app/
    assets/
    components/
      layout/
      ui/
    features/
      auth/
      dashboard/
      projects/
      tasks/
      calendar/
      timeline/
      notifications/
      reports/
      settings/
    hooks/
    lib/
    services/
    i18n/
    styles/
```

Ne pas créer tous les dossiers vides à l'avance : ajouter les modules au fur et à mesure du développement.

## 3. Backend

Technologies :
- Node.js ;
- Express ;
- MySQL ;
- ORM recommandé : Prisma ou Sequelize, à choisir et documenter avant implémentation ;
- validation de schéma des requêtes ;
- bibliothèque de hachage de mots de passe reconnue.

Responsabilités :
- exposer l'API REST ;
- authentifier les utilisateurs ;
- autoriser chaque action selon le rôle et la ressource ;
- valider les données ;
- appliquer les règles métier ;
- interagir avec MySQL ;
- centraliser les erreurs ;
- enregistrer les événements d'activité utiles.

Structure indicative :

```text
server/
  src/
    config/
    middleware/
    modules/
      auth/
      users/
      projects/
      tasks/
      comments/
      notifications/
      reports/
    database/
    utils/
    app.js
    server.js
  tests/
```

Organiser le backend par domaine fonctionnel. Éviter les contrôleurs gigantesques et les requêtes SQL dispersées.

## 4. Base de données

MySQL est la source de vérité. Les principales entités sont :
- users ;
- projects ;
- project_members ;
- tasks ;
- comments ;
- notifications ;
- activity_logs.

Les relations et champs sont détaillés dans `07_DATABASE_SCHEMA.md`.

## 5. Flux d'une requête

1. L'utilisateur déclenche une action dans React.
2. Le frontend envoie une requête HTTPS à l'API.
3. Le middleware vérifie le token et identifie l'utilisateur.
4. Le middleware ou service vérifie les permissions et l'accès à la ressource.
5. Le validateur contrôle les données entrantes.
6. Le service métier exécute la règle demandée.
7. La couche d'accès aux données interagit avec MySQL.
8. L'API renvoie une réponse JSON avec un code HTTP approprié.
9. React met à jour l'interface ou affiche une erreur compréhensible.

## 6. Authentification et autorisation

- JWT signé côté serveur.
- Durée de vie courte pour le jeton d'accès.
- Stratégie de renouvellement à définir de façon sécurisée si nécessaire.
- Ne jamais stocker de mot de passe en clair.
- Pour une application web, privilégier un cookie `HttpOnly`, `Secure` et `SameSite` correctement configuré pour le stockage des jetons, avec une protection CSRF adaptée. Si une autre stratégie est choisie, la documenter et justifier ses risques.
- Vérifier le rôle et l'accès à la ressource sur chaque endpoint protégé.
- Un identifiant de ressource fourni par le client ne prouve jamais que l'utilisateur y a accès.

## 7. Gestion des erreurs

Format JSON uniforme recommandé :

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

Ne pas retourner les traces de pile, les requêtes SQL, les secrets ou les détails internes en production.

## 8. Configuration et environnements

Prévoir :
- développement local ;
- tests ;
- production (si déploiement).

Les paramètres sensibles sont fournis par variables d'environnement. Ajouter un `.env.example` sans valeur secrète. Le fichier `.env` réel doit être ignoré par Git.

## 9. Principes d'architecture

- Séparation claire des responsabilités.
- Validation côté serveur.
- Autorisation au niveau de la ressource.
- Requêtes paramétrées ou ORM.
- Pas de logique métier importante dans les composants React.
- Pas d'accès direct à la base depuis le navigateur.
- Tests des services et endpoints critiques.
- Migrations versionnées pour le schéma MySQL.
- Pas de sur-ingénierie : implémenter progressivement les besoins du PRD.

## 10. Déploiement

Le déploiement n'est pas présumé. Avant toute mise en production, définir l'hébergement, HTTPS, sauvegardes, gestion des secrets, migrations, journalisation et procédure de restauration. Ne jamais publier de secrets dans le dépôt Git.
