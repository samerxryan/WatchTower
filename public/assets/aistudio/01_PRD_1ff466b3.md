# WatchTower — Product Requirements Document (PRD)

**Version :** 1.0  
**Statut :** Base de référence fonctionnelle  
**Type de produit :** Application web SaaS de gestion de projets  
**Méthodologie de développement :** Scrum adapté à un projet individuel

## 1. Vision du produit

WatchTower est une application web de gestion de projets et de tâches destinée à aider une organisation ou une équipe à planifier son travail, répartir les responsabilités, suivre l'avancement et centraliser la collaboration.

La plateforme doit offrir une expérience **professionnelle, moderne, minimaliste et premium**, avec une interface bilingue français/anglais et les thèmes clair/sombre.

## 2. Problématique

La gestion de projets à l'aide de fichiers, de messages dispersés et d'outils non centralisés peut rendre difficile :
- le suivi des tâches et des échéances ;
- l'identification des responsables ;
- la visibilité sur l'avancement des projets ;
- la coordination entre les membres ;
- la traçabilité des changements.

WatchTower centralise ces opérations dans une seule application.

## 3. Objectifs

1. Permettre aux utilisateurs de s'authentifier et d'accéder uniquement aux fonctions autorisées.
2. Organiser les projets dans une vue liste.
3. Gérer les tâches dans un tableau Kanban.
4. Fournir un tableau de bord orienté productivité.
5. Faciliter la collaboration au moyen de commentaires et d'un historique d'activité.
6. Visualiser les échéances dans un calendrier et les périodes de projet dans une Timeline.
7. Afficher des statistiques simples et des notifications intégrées.
8. Fournir une interface bilingue et un choix de thème.

## 4. Utilisateurs et rôles

### 4.1 Administrator
- Gérer les comptes utilisateurs.
- Attribuer ou modifier les rôles selon les règles de sécurité.
- Consulter les données globales nécessaires à l'administration.
- Gérer les paramètres globaux autorisés.

### 4.2 Project Manager
- Créer et modifier les projets dont il est responsable.
- Ajouter ou retirer des membres de ses projets, selon les règles définies.
- Créer, attribuer et organiser les tâches.
- Suivre l'avancement, les échéances, les commentaires et l'activité du projet.

### 4.3 Team Member
- Consulter les projets auxquels il appartient.
- Consulter et mettre à jour les tâches qui lui sont accessibles.
- Modifier le statut des tâches selon les permissions.
- Ajouter des commentaires et consulter l'activité autorisée.

**Principe impératif :** les permissions sont vérifiées côté serveur. Masquer un bouton dans le frontend ne constitue jamais un contrôle d'accès.

## 5. Périmètre fonctionnel

### 5.1 Authentification et compte
- Inscription.
- Connexion et déconnexion.
- Réinitialisation du mot de passe via un mécanisme sécurisé.
- Authentification par JWT.
- Gestion des rôles et permissions (RBAC).
- Protection des routes frontend et des endpoints backend.
- Consultation et modification du profil.
- Changement du mot de passe.

### 5.2 Projets
- Créer, consulter, modifier et archiver un projet.
- Champs minimum : nom, description, statut, date de début, date limite, responsable et progression calculée.
- Afficher les projets sous forme de tableau (List View).
- Consulter le détail d'un projet et ses membres.
- Restreindre l'accès aux projets selon le rôle et l'appartenance.

### 5.3 Tâches et Kanban
- Créer, consulter, modifier et supprimer une tâche selon les permissions.
- Champs minimum : titre, description, statut, priorité, date limite, responsable et projet.
- Statuts : `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`.
- Priorités : `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Afficher les tâches en colonnes Kanban.
- Permettre une transition de statut contrôlée.
- Calculer la progression à partir des tâches terminées, selon une règle documentée.

### 5.4 Tableau de bord
Afficher en priorité :
- Mes tâches ;
- échéances à venir ;
- projets récents ;
- activité récente.

Le contenu doit être filtré selon les permissions de l'utilisateur connecté. Le tableau de bord n'affiche pas de données fictives en production.

### 5.5 Notifications
Notifications internes pour :
- attribution d'une tâche ;
- tâche terminée ;
- échéance proche ;
- tâche en retard ;
- invitation à un projet ;
- changement de statut.

Le centre de notifications affiche le compteur non lu et permet de marquer une notification comme lue. Les règles d'envoi et de déduplication doivent être documentées.

### 5.6 Calendrier et Timeline
- Vues calendrier : mois, semaine et jour.
- Afficher les dates des tâches et les échéances des projets.
- Vue Timeline montrant les dates de début et de fin des projets.
- Les données sont issues de la base de données et filtrées par permissions.

### 5.7 Rapports simples
- Nombre total de projets accessibles.
- Nombre de tâches terminées et en attente.
- Progression globale.
- Les indicateurs doivent être calculés à partir des données réelles.

### 5.8 Collaboration
- Commentaires sur les tâches.
- Discussions liées aux projets si elles sont implémentées comme fonctionnalité distincte.
- Historique d'activité pour les actions importantes.
- Les utilisateurs ne peuvent consulter que les discussions et activités auxquelles ils ont accès.

### 5.9 Paramètres
- Profil.
- Sécurité et mot de passe.
- Préférences de langue : français/anglais.
- Préférences de thème : clair/sombre.
- Préférences de notifications.
- Confidentialité.
- Gestion des utilisateurs et des rôles pour l'administrateur.
- Configuration des projets selon les permissions.

## 6. Navigation proposée

Sidebar classique :
1. Dashboard
2. Projects
3. My Tasks
4. Calendar
5. Timeline
6. Reports
7. Team / Members (selon rôle)
8. Notifications
9. Settings

Barre supérieure :
- titre ou fil d'Ariane de la page ;
- recherche si disponible ;
- bouton de thème ;
- sélecteur FR/EN ;
- notifications ;
- menu de profil.

Les entrées de navigation sont adaptées au rôle de l'utilisateur.

## 7. Identité visuelle

- Nom : **WatchTower**.
- Concept du logo : tour géométrique stylisée.
- Positionnement : Professional + Modern.
- Style : SaaS minimaliste premium.
- Palette : Dark Navy + Indigo.
- Thèmes : Light et Dark.
- Langues : Français et anglais.

Voir `04_DESIGN_SYSTEM.md` pour les tokens et composants.

## 8. Exigences non fonctionnelles

- Interface responsive pour desktop, tablette et mobile.
- Accessibilité : navigation clavier, labels, contrastes lisibles et états de focus.
- Validation des données côté client et côté serveur.
- Gestion cohérente des erreurs.
- Pagination des listes volumineuses.
- Requêtes SQL paramétrées via un ORM ou un mécanisme sûr.
- Journalisation sans mots de passe, tokens ou secrets.
- Code modulaire, documenté et testable.
- Configuration par variables d'environnement.
- Les dates sont stockées de manière cohérente (UTC recommandé) et affichées selon le fuseau de l'utilisateur.

## 9. Stack technique de référence

- Frontend : React et JavaScript.
- Backend : Node.js avec Express.
- Base de données : MySQL.
- API : REST/JSON.
- Authentification : JWT avec mots de passe hachés.
- Outils : Git/GitHub, Postman, Figma ou outil équivalent, Draw.io ou outil équivalent.

Les bibliothèques complémentaires doivent être proposées avec justification avant leur adoption.

## 10. Hors périmètre initial

Sauf décision ultérieure explicite :
- chat privé temps réel ;
- visioconférence ;
- notifications email ;
- authentification à deux facteurs ;
- intégrations externes (Google Calendar, Slack, etc.) ;
- facturation et abonnements SaaS ;
- export PDF/Excel avancé ;
- application mobile native.

## 11. Critères d'acceptation globaux

- Un utilisateur peut se connecter et ne voit que les ressources autorisées.
- Les rôles sont appliqués côté serveur.
- Un Project Manager peut gérer ses projets et leurs tâches.
- Un Team Member peut consulter les projets auxquels il appartient et mettre à jour les tâches autorisées.
- Les tâches apparaissent dans les bonnes colonnes Kanban.
- Le calendrier et la Timeline affichent les dates enregistrées.
- Les indicateurs sont calculés depuis MySQL.
- Les commentaires, notifications et activités sont associés aux bons utilisateurs et ressources.
- Le changement de langue et de thème fonctionne sur toutes les pages principales.
- Les tests critiques passent et les instructions de lancement sont documentées.

## 12. Priorisation conseillée

**MVP obligatoire :**
1. Authentification et RBAC.
2. Gestion des utilisateurs et des rôles.
3. CRUD projets et membres.
4. CRUD tâches et Kanban.
5. Dashboard productivité.
6. Profil, thème et langue.

**Itération suivante :**
7. Notifications internes.
8. Calendrier et Timeline.
9. Commentaires et historique.
10. Rapports simples et finitions.

La priorité réelle doit être confirmée avec le planning du projet et les exigences pédagogiques.
