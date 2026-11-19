# WatchTower — Plan de test et critères de validation

**Objectif :** vérifier que les fonctionnalités répondent au PRD, que les rôles sont correctement appliqués et que les données restent cohérentes.

## 1. Stratégie

Combiner :
- tests unitaires des fonctions et services ;
- tests d'intégration des routes API et de la base ;
- tests frontend des composants et interactions essentielles ;
- tests end-to-end des parcours critiques ;
- vérifications manuelles de responsive, accessibilité et sécurité.

Choisir les outils en fonction des dépendances déjà présentes. Propositions possibles : Vitest ou Jest, Supertest pour Express, React Testing Library et Playwright. Ne pas ajouter tous ces outils sans vérifier la configuration du dépôt.

## 2. Environnements de test

- Base MySQL dédiée aux tests, séparée des données de développement.
- Variables d'environnement de test.
- Données de test synthétiques.
- Nettoyage ou rollback entre les tests.
- Aucun secret réel dans les fixtures.

## 3. Tests d'authentification

| ID | Scénario | Résultat attendu |
|---|---|---|
| AUTH-01 | Inscription avec données valides | Compte créé avec rôle standard |
| AUTH-02 | Inscription avec email déjà utilisé | Rejet contrôlé |
| AUTH-03 | Connexion valide | Session/token délivré selon stratégie |
| AUTH-04 | Mot de passe incorrect | Erreur générique, aucun accès |
| AUTH-05 | Accès à une route sans token | 401 |
| AUTH-06 | Token invalide/expiré | 401 |
| AUTH-07 | Déconnexion | Session invalidée selon stratégie |
| AUTH-08 | Réinitialisation avec token expiré | Rejet contrôlé |
| AUTH-09 | Inscription demandant le rôle Admin | Rôle privilégié refusé |

## 4. Tests RBAC

| ID | Scénario | Résultat attendu |
|---|---|---|
| RBAC-01 | Admin consulte les utilisateurs | Autorisé |
| RBAC-02 | Team Member tente de lister tous les utilisateurs | Refusé |
| RBAC-03 | Project Manager modifie son projet | Autorisé selon propriété/permission |
| RBAC-04 | Team Member modifie un projet non autorisé | Refusé |
| RBAC-05 | Utilisateur accède à un projet dont il n'est pas membre | Refusé |
| RBAC-06 | Utilisateur tente de modifier son rôle | Refusé |
| RBAC-07 | Team Member consulte une tâche autorisée | Autorisé |
| RBAC-08 | Utilisateur consulte les notifications d'un autre compte | Refusé |

## 5. Tests des projets

- [ ] Créer un projet avec les champs obligatoires.
- [ ] Refuser un nom vide.
- [ ] Modifier un projet autorisé.
- [ ] Refuser la modification par un utilisateur non autorisé.
- [ ] Ajouter un membre.
- [ ] Empêcher un doublon de membre.
- [ ] Retirer un membre selon les permissions.
- [ ] Vérifier la cohérence des dates.
- [ ] Vérifier la liste des projets selon le rôle.

## 6. Tests des tâches et Kanban

- [ ] Créer une tâche dans un projet accessible.
- [ ] Refuser la création dans un projet inaccessible.
- [ ] Vérifier les quatre statuts.
- [ ] Vérifier les quatre priorités.
- [ ] Affecter une tâche à un membre du projet.
- [ ] Refuser l'affectation à une personne qui n'est pas membre.
- [ ] Déplacer une tâche d'une colonne à l'autre.
- [ ] Vérifier les permissions de changement de statut.
- [ ] Vérifier la date limite et le signalement d'une tâche en retard.
- [ ] Vérifier que la progression du projet est recalculée correctement.

## 7. Tests du dashboard, calendrier et Timeline

- [ ] Le dashboard affiche les tâches de l'utilisateur connecté.
- [ ] Les échéances à venir sont correctes.
- [ ] Les projets récents sont filtrés selon les droits.
- [ ] Les activités affichées sont accessibles à l'utilisateur.
- [ ] Les vues mois, semaine et jour affichent les bonnes dates.
- [ ] La Timeline respecte les dates de début et de fin.
- [ ] Les changements de fuseau/date ne décalent pas incorrectement les échéances.

## 8. Tests notifications et collaboration

- [ ] Une attribution génère la notification attendue.
- [ ] Une tâche terminée génère la notification attendue.
- [ ] Une échéance proche génère une notification selon la règle configurée.
- [ ] Une tâche en retard est signalée selon la règle configurée.
- [ ] Le compteur non lu est exact.
- [ ] Marquer une notification comme lue met à jour son état.
- [ ] Un utilisateur ne peut pas lire les notifications d'un autre.
- [ ] Un membre autorisé peut commenter une tâche.
- [ ] Un utilisateur non autorisé ne peut pas lire les commentaires.
- [ ] Les actions importantes sont inscrites dans l'historique.

## 9. Tests paramètres et interface

- [ ] Le changement Light/Dark fonctionne sur les pages principales.
- [ ] La préférence de thème est conservée.
- [ ] Le changement FR/EN traduit les éléments d'interface.
- [ ] Les préférences sont conservées.
- [ ] Les formulaires affichent les erreurs de validation.
- [ ] Les boutons ont des états loading/disabled adaptés.
- [ ] Les états vides, erreurs et chargements sont présents.
- [ ] La sidebar est utilisable sur desktop et mobile.
- [ ] Les principaux parcours sont navigables au clavier.

## 10. Tests de sécurité

- [ ] Validation contre les entrées malformées.
- [ ] Requêtes SQL paramétrées/ORM.
- [ ] Rate limiting sur les routes sensibles.
- [ ] CORS limité aux origines prévues.
- [ ] Aucun secret dans le dépôt.
- [ ] Aucun mot de passe ou token dans les logs.
- [ ] Tentatives d'accès horizontal entre utilisateurs refusées.
- [ ] Tentatives d'escalade de privilèges refusées.
- [ ] Réponses d'erreur sans informations internes.

## 11. Tests end-to-end — parcours prioritaires

### Parcours 1 : Project Manager
1. Se connecter.
2. Créer un projet.
3. Ajouter des membres.
4. Créer une tâche.
5. Attribuer la tâche à un membre.
6. Vérifier que le projet et la tâche apparaissent dans les vues attendues.

### Parcours 2 : Team Member
1. Se connecter.
2. Consulter les projets accessibles.
3. Ouvrir une tâche assignée.
4. Modifier son statut.
5. Ajouter un commentaire.
6. Vérifier la mise à jour du Kanban et de l'activité.

### Parcours 3 : Administrator
1. Se connecter.
2. Consulter les utilisateurs.
3. Modifier un rôle autorisé.
4. Vérifier que les permissions effectives correspondent au nouveau rôle.
5. Vérifier qu'un utilisateur standard ne peut pas effectuer cette action.

## 12. Critères de sortie

La version est prête pour démonstration lorsque :
- les parcours critiques passent ;
- aucune erreur bloquante connue ne subsiste ;
- les tests d'autorisation critiques passent ;
- les données affichées proviennent de l'API et de MySQL ;
- les principales pages fonctionnent en Light et Dark ;
- les principales pages sont disponibles en français et en anglais ;
- les instructions d'installation et de lancement sont à jour ;
- les limites connues sont documentées.

Ne jamais annoncer un taux de réussite ou une couverture de tests sans exécution et mesure réelle.
