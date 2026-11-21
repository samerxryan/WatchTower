# Rapport de correction visuelle — WatchTower

**Date :** 21 novembre 2026  
**Source de vérité :** `C:\Users\samer\Desktop\Rapport_Technique_WatchTower Project individuel par Samer Rayen Ncib.pdf` (38 pages)  
**Présentation corrigée :** `WatchTower_Soutenance_Final.pptx` / `WatchTower_Soutenance_Final.pdf`

---

## 1. Méthode d'extraction

Les visuels ont été localisés dans le rapport par la légende de figure et le numéro de page, puis extraits directement des objets image du PDF (XObjects) avec `pypdf`. Aucun diagramme n'a été redessiné, simplifié ou interprété. Les fichiers extraits sont conservés dans `Assets/` et leur empreinte SHA-256 a été vérifiée dans le PPTX final.

## 2. Diagrammes remplacés

| Diapositive | Figure du rapport | Page | Fichier extrait | Dimensions | Empreinte (12 premiers hex) |
|---:|---|---:|---|---|---|
| 12 | Figure 2.1 — Cas d'utilisation | 11 | `Assets/report_use_case_page11.png` | 1180 × 933 | `0bfd5046d34a` |
| 13 | Figure 4.2 — Modèle de classes | 16 | `Assets/report_classes_page16.jpg` | 1180 × 895 | `fe3595574728` |
| 14 | Figure 7.1 — Gantt | 31 | `Assets/report_gantt_page31.png` | 1291 × 793 | `6f44894c6ffe` |
| 15 | Figure 7.2 — PERT | 32 | `Assets/report_pert_page32.png` | 1291 × 556 | `016af443cf0e` |

Actions réalisées :

- suppression totale des quatre diagrammes reconstruits avec des formes PowerPoint ;
- insertion des images extraites, sans modification de contenu, avec conservation stricte des proportions ;
- mise en page compacte dédiée sur ces quatre diapositives (en-tête réduit) afin d'afficher chaque visuel à la hauteur maximale disponible ;
- recadrage d'aucun élément fonctionnel : seules les marges blanches d'origine ont été conservées telles quelles ;
- vérification, pour la figure 4.2, de la présence des dix classes demandées : `User`, `Project`, `Task`, `Notification`, `ProjectMember`, `Comment`, `UserSession`, `PasswordResetToken`, `ActivityLog`, `AuditLog`. Aucune fusion ni simplification n'a été appliquée.

Les panneaux latéraux ajoutés aux diapositives 12 et 13 ne modifient pas les diagrammes : ils rappellent uniquement des informations déjà présentes dans le rapport (acteurs, rôles, liste des classes).

## 3. Vérification complète des captures d'écran (pages 23 à 28)

Chaque capture utilisée dans la présentation a été reliée à sa légende exacte dans le rapport puis comparée à l'image extraite du PDF (empreinte perceptuelle, distance nulle ou proche de zéro).

| Figure du rapport | Page | Capture QA | Diapositive(s) | Résultat |
|---|---:|---|---:|---|
| 5.1 | 23 | `00_login_page` | 20 | Identique |
| 5.2 | 23 | `01_login_dark_theme` | — | Vérifiée, non insérée |
| 5.3 | 24 | `02_admin_dashboard` | 6, 21 | Identique |
| 5.4 | 24 | `03_admin_projects_list` | 22 | Identique |
| 5.5 | 25 | `04_admin_new_project_form` | 22 | Identique |
| 5.6 | 25 | `08_admin_project_detail` | 24 | Identique |
| 5.7 | 26 | `12_admin_kanban_board` | 23 | Identique |
| 5.8 | 26 | `17_admin_task_comment_posted` | 24 | Identique |
| 5.9 | 27 | `21_admin_reports` | 25 | Identique |
| 5.10 | 27 | `24_admin_notifications` | 24 | Identique |
| 5.11 | 28 | `29_admin_settings_preferences` | 25 | Identique |
| 5.12 | 28 | `67_member_projects_readonly` | — | Vérifiée, non insérée |

Les dix captures insérées sont les fichiers originaux du dossier `Screenshots/` (1248 px de large environ), c'est-à-dire les sources exactes utilisées pour composer le rapport. Le PDF les ayant rééchantillonnées à 803 px, le fichier source original a été conservé pour éviter toute image floue sur vidéoprojecteur : le contenu de l'interface est rigoureusement identique, seule la résolution est supérieure. Aucune capture générée, maquette ou illustration générique n'est présente.

Les captures 5.2 et 5.12 existent dans le rapport mais n'ont pas été insérées afin de ne pas surcharger les diapositives de démonstration ; elles ne sont remplacées par aucun visuel fictif.

## 4. Éléments conservés

- Format 16:9, thème Dark Navy + Indigo, typographie Segoe UI, hiérarchie des titres et organisation en cinq parties.
- 29 diapositives, dont les titres et le fil narratif d'origine.
- Animations natives : fondu de transition sur 29/29 diapositives et apparitions progressives en fondu sur les éléments clés (29/29).
- Notes du présentateur intégrées au PPTX (29/29) et script oral détaillé dans `Notes_Presentateur_WatchTower.docx` ; durée cumulée 24 min 40 s.
- Contenus textuels, planning, résultats de tests (29/29, campagne antérieure) et limitations inchangés.

## 5. Contrôles qualité réalisés

1. Ouverture du PPTX par Microsoft PowerPoint via COM : 29 diapositives, aucune réparation signalée.
2. Export PDF complet : 29 pages.
3. Export des 29 diapositives en images PNG et génération d'une vue d'ensemble : `QA/ContactSheet_AllSlides.png`.
4. Vérification par empreinte SHA-256 de la présence des quatre visuels extraits dans le PPTX final.
5. Vérification de l'absence de chevauchement entre textes et entre images, et de toute forme hors cadre.
6. Vérification des 29 jeux de notes, des 29 séquences d'animation et des 29 transitions.
7. Contrôle de cohérence des intitulés de sprints, du chemin critique et des chiffres avec le rapport.

## 6. Points restant à confirmer

- Établissement, encadrant et année universitaire sur la couverture (champs volontairement laissés « à compléter », comme dans le rapport).
- La densité des diagrammes UML est celle du rapport original ; conformément à la consigne, elle n'a pas été réduite par redessin. La lisibilité a été optimisée par l'agrandissement maximal et la mise en page, sans altération du contenu.
