# WatchTower — Design System

**Direction :** SaaS minimaliste premium  
**Positionnement :** Professional + Modern  
**Logo :** concept de tour géométrique stylisée  
**Palette :** Dark Navy + Indigo

## 1. Principes de design

- Clarté avant décoration.
- Hiérarchie visuelle nette.
- Espaces généreux et alignements cohérents.
- Composants réutilisables.
- Contrastes accessibles.
- Animations discrètes et utiles.
- Interface responsive.
- Même structure fonctionnelle en Light et Dark.

## 2. Couleurs de marque

| Token | Valeur | Usage |
|---|---|---|
| `brand.navy` | `#111827` | Navy principal |
| `brand.indigo` | `#6366F1` | Action et accent principal |
| `brand.indigoLight` | `#A5B4FC` | Accent clair |
| `brand.indigoDark` | `#4338CA` | Accent foncé |
| `neutral.white` | `#FFFFFF` | Surface claire |
| `neutral.offWhite` | `#F8FAFC` | Fond clair |

### Thème Light (proposition initiale)

| Token | Valeur |
|---|---|
| `bg` | `#F8FAFC` |
| `surface` | `#FFFFFF` |
| `surfaceMuted` | `#F1F5F9` |
| `text` | `#111827` |
| `textMuted` | `#64748B` |
| `border` | `#E2E8F0` |
| `primary` | `#6366F1` |
| `primaryHover` | `#4F46E5` |

### Thème Dark (proposition initiale)

| Token | Valeur |
|---|---|
| `bg` | `#0B1120` |
| `surface` | `#111827` |
| `surfaceMuted` | `#1F2937` |
| `text` | `#F8FAFC` |
| `textMuted` | `#9CA3AF` |
| `border` | `#273449` |
| `primary` | `#818CF8` |
| `primaryHover` | `#A5B4FC` |

Les valeurs sont des tokens de départ. Vérifier les contrastes réels des combinaisons avant livraison.

## 3. Couleurs sémantiques

| État | Couleur indicative | Usage |
|---|---|---|
| Success | `#16A34A` | Terminé, succès |
| Warning | `#D97706` | Échéance proche, attention |
| Danger | `#DC2626` | Erreur, tâche en retard |
| Info | `#2563EB` | Information |
| Neutral | `#64748B` | Brouillon, état neutre |

Ne pas communiquer un statut uniquement par la couleur : ajouter un libellé ou une icône.

## 4. Typographie

Police recommandée : **Inter** (ou police système sans-serif si Inter n'est pas disponible).

Hiérarchie indicative :
- H1 : 28–32 px, poids 600/700.
- H2 : 22–24 px, poids 600.
- H3 : 18–20 px, poids 600.
- Corps : 14–16 px, poids 400.
- Légende : 12–13 px, poids 400.
- Boutons : 14 px, poids 500/600.

Ne pas multiplier les polices. Conserver une échelle cohérente.

## 5. Espacements et formes

Échelle d'espacement recommandée : 4, 8, 12, 16, 24, 32, 40, 48 px.

- Rayon petit : 6 px.
- Rayon standard : 10 px.
- Rayon carte : 12–16 px.
- Bordures fines et discrètes.
- Ombres légères, uniquement pour créer une hiérarchie.
- Largeur de contenu adaptée aux écrans larges, sans étirer excessivement les tableaux.

## 6. Boutons

### Primary
- Fond Indigo.
- Texte blanc.
- Utilisé pour l'action principale d'un écran.

### Secondary
- Fond de surface ou transparent.
- Bordure discrète.
- Utilisé pour les actions secondaires.

### Ghost
- Sans fond permanent.
- Pour les actions secondaires dans les barres d'outils.

### Danger
- Couleur sémantique rouge.
- Réservé aux suppressions ou actions sensibles.
- Confirmation requise pour les actions destructives.

Tous les boutons doivent présenter les états hover, focus, active, disabled et loading.

## 7. Composants communs

Créer des composants réutilisables pour :
- Sidebar et navigation ;
- Topbar ;
- boutons ;
- champs de formulaire ;
- menus déroulants ;
- modales et confirmations ;
- badges de statut et priorité ;
- cartes KPI ;
- tableaux ;
- pagination ;
- avatars ;
- menus contextuels ;
- notifications/toasts ;
- états vides ;
- skeletons de chargement ;
- messages d'erreur.

## 8. Navigation

Sidebar classique :
- logo WatchTower en haut ;
- liens principaux ;
- éléments actifs clairement identifiables ;
- séparation éventuelle des liens secondaires ;
- profil et paramètres en bas.

Topbar :
- titre de page ;
- bouton Light/Dark ;
- sélecteur Français/English ;
- notifications avec compteur ;
- menu de profil.

Les éléments visibles dépendent du rôle, mais le backend reste responsable de l'autorisation.

## 9. Composants métier

### Projets — List View
Colonnes proposées :
- nom du projet ;
- responsable ;
- statut ;
- progression ;
- date limite ;
- actions.

### Tâches — Kanban
Colonnes :
- To Do ;
- In Progress ;
- In Review ;
- Done.

Carte de tâche :
- titre ;
- priorité ;
- responsable ;
- date limite ;
- indicateur de retard si nécessaire.

### Dashboard productivité
Sections :
- My Tasks ;
- Upcoming Deadlines ;
- Recent Projects ;
- Recent Activity.

### Calendrier et Timeline
- vues Month, Week et Day pour le calendrier ;
- Timeline avec dates de début/fin ;
- légende claire ;
- navigation clavier et alternative textuelle lorsque nécessaire.

## 10. Thèmes et langues

- Le thème choisi doit être appliqué de manière cohérente à toutes les pages.
- Le choix du thème doit être conservé entre les sessions selon une stratégie documentée.
- Toutes les chaînes visibles doivent passer par le système de traduction.
- Langues initiales : français (`fr`) et anglais (`en`).
- Prévoir les formats de date adaptés à la langue.
- Ne pas traduire les données saisies par les utilisateurs automatiquement.

## 11. Accessibilité et responsive

- Contraste suffisant.
- Focus clavier visible.
- Labels explicites sur les champs.
- Boutons avec nom accessible.
- Ne pas dépendre uniquement de la couleur.
- Tableaux utilisables sur petits écrans (défilement ou présentation adaptée).
- Sidebar transformée en navigation mobile accessible.
- Zones interactives suffisamment grandes.

## 12. Règles de cohérence

Aucun écran ne doit introduire une nouvelle couleur, police, taille de bouton ou rayon sans raison. Ajouter toute évolution au présent document avant de la généraliser.
