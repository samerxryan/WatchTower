# WatchTower — Checklist de sécurité

Cette checklist constitue une base de développement sécurisé. Elle ne remplace pas un audit professionnel avant une mise en production réelle.

## 1. Authentification

- [ ] Les mots de passe sont hachés avec une bibliothèque reconnue et un algorithme adapté (ex. Argon2id ou bcrypt avec paramètres sûrs).
- [ ] Aucun mot de passe n'est stocké ou journalisé en clair.
- [ ] Les réponses de connexion ne révèlent pas si un email existe.
- [ ] Les tentatives de connexion sont limitées (rate limiting).
- [ ] Les erreurs d'authentification sont génériques.
- [ ] Les JWT sont signés avec un secret robuste ou une paire de clés correctement gérée.
- [ ] Les jetons ont une durée de vie limitée.
- [ ] La stratégie de révocation/déconnexion est définie.
- [ ] La réinitialisation de mot de passe utilise un jeton temporaire, à usage unique, stocké sous forme hachée et expirant rapidement.
- [ ] Les cookies d'authentification, si utilisés, sont `HttpOnly`, `Secure` en HTTPS et `SameSite` correctement configurés.
- [ ] Une protection CSRF adaptée est en place si l'authentification repose sur des cookies.

## 2. Autorisation et RBAC

- [ ] Chaque endpoint protégé vérifie l'identité.
- [ ] Chaque action vérifie le rôle et les permissions.
- [ ] L'accès à chaque projet est contrôlé par appartenance ou permission.
- [ ] Un Team Member ne peut pas accéder aux projets d'une autre équipe en modifiant un ID.
- [ ] Un utilisateur ne peut pas s'attribuer le rôle Admin via une requête de profil.
- [ ] Les opérations d'administration sont réservées aux administrateurs.
- [ ] Les vérifications sont faites côté serveur, pas uniquement dans React.
- [ ] Les accès refusés renvoient un code HTTP adapté (401 ou 403).

## 3. Validation et données

- [ ] Toutes les entrées API sont validées côté serveur.
- [ ] Les longueurs, formats, types et valeurs autorisées sont contrôlés.
- [ ] Les requêtes SQL sont paramétrées ou passent par un ORM correctement utilisé.
- [ ] Les tris et filtres dynamiques utilisent une liste blanche de champs autorisés.
- [ ] Les erreurs de validation ne révèlent pas de détails internes.
- [ ] Les contraintes d'intégrité sont définies dans MySQL.
- [ ] Les suppressions sensibles suivent une règle explicite (soft delete ou suppression réelle).
- [ ] Les opérations multi-tables critiques utilisent des transactions.

## 4. Sécurité web

- [ ] HTTPS est obligatoire en production.
- [ ] CORS autorise uniquement les origines nécessaires.
- [ ] Les en-têtes de sécurité sont configurés (ex. Helmet).
- [ ] Le rate limiting est appliqué aux routes sensibles.
- [ ] Une protection contre les injections SQL est en place.
- [ ] Le rendu échappe les contenus utilisateurs.
- [ ] Le contenu HTML fourni par l'utilisateur n'est pas injecté sans assainissement strict.
- [ ] Les uploads de fichiers ne sont pas activés sans règles de type, taille, stockage et contrôle antivirus appropriées.
- [ ] Les dépendances sont vérifiées et mises à jour raisonnablement.

## 5. Secrets et configuration

- [ ] Les secrets sont uniquement dans les variables d'environnement ou un gestionnaire de secrets.
- [ ] `.env` est dans `.gitignore`.
- [ ] `.env.example` contient uniquement des noms de variables et des valeurs fictives/non sensibles.
- [ ] Aucun secret n'apparaît dans le frontend.
- [ ] Aucun secret n'est commité dans Git.
- [ ] Les identifiants MySQL de production sont différents des identifiants de développement.
- [ ] Les erreurs détaillées sont désactivées en production.

## 6. Journaux et confidentialité

- [ ] Les logs ne contiennent ni mot de passe, ni token, ni secret.
- [ ] Les événements importants sont enregistrés avec l'identifiant de l'acteur et la date.
- [ ] L'accès aux journaux est limité.
- [ ] Les données personnelles collectées sont limitées au nécessaire.
- [ ] Une politique de conservation et de suppression est définie.
- [ ] Les utilisateurs ne peuvent consulter que les commentaires, notifications et activités autorisés.

## 7. Base de données et sauvegardes

- [ ] Le compte MySQL de l'application possède uniquement les privilèges nécessaires.
- [ ] Le compte administrateur MySQL n'est pas utilisé par l'application.
- [ ] Les migrations sont versionnées.
- [ ] Les sauvegardes sont configurées avant mise en production.
- [ ] Une restauration de sauvegarde a été testée.
- [ ] Les données de test ne contiennent pas de données personnelles réelles.

## 8. Tests de sécurité essentiels

- [ ] Accès à une route sans token.
- [ ] Token invalide ou expiré.
- [ ] Tentative d'accès à un projet non autorisé.
- [ ] Tentative de modification du rôle par un utilisateur standard.
- [ ] Tentative d'injection dans les champs.
- [ ] Tentatives répétées de connexion.
- [ ] Accès direct à un endpoint réservé à Admin.
- [ ] Vérification de l'absence de secrets dans le dépôt et les logs.

## 9. Règle de livraison

Ne pas déclarer l'application prête pour la production si une vulnérabilité critique ou une vérification de sécurité essentielle reste non traitée. Pour un projet académique local, documenter les limites restantes et ne pas prétendre avoir réalisé un audit externe.
