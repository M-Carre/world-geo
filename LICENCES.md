# Licences et sources — World – Géo

Application personnelle, non officielle, inspirée d’un jeu de cartes de géographie. Aucun lien avec ses éditeurs ; le logo et le nom de l’app sont propres à ce projet.

| Élément | Source | Licence |
|---|---|---|
| Liste et numéros des 194 pays | Liste des emplacements (FR) de The World Game (PDF public) | Numérotation reprise comme référence d’apprentissage |
| Drapeaux (`flags/`) | flag-icons, Panayiotis Lipiridis | MIT |
| Fond de carte (`data/geo.json`) | Natural Earth (domaine public) via world-atlas, Mike Bostock | ISC |
| Capitales, points culminants | Wikidata, corrigés à la main | CC0 |
| Population (2024) | Banque mondiale, SP.POP.TOTL | CC BY 4.0 |
| Superficies, frontières terrestres, noms FR | mledoze/countries | ODbL 1.0 |
| Police Montserrat (`fonts/`) | The Montserrat Project Authors | SIL OFL 1.1 |
| Traits d’identité | Rédigés pour l’app | — |
| Textes « En savoir plus » (`data/wiki.json`) | Wikipédia en français : introduction de l’article de chaque pays (révision du 22/11/2026, numéro de révision stocké par pays), contributeurs de Wikipédia | **CC BY-SA 4.0**. Texte modifié : extrait brut, notes, prononciations et graphies non latines retirées, introduction tronquée à 350 mots environ ou complétée par le début des sections Géographie et Histoire. Chaque fiche porte « Source : Wikipédia » avec le lien vers l’article. Ces textes dérivés restent sous CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/deed.fr) |
| Langues officielles, monnaie, régime politique | Wikidata (P37, P38, P122, valeurs actuelles) | CC0 |
| Algorithme de révision espacée (`js/fsrs.js`) | Portage JavaScript de **FSRS-6** d’après **py-fsrs 6.3.3** (Open Spaced Repetition, https://github.com/open-spaced-repetition/py-fsrs), avec les 21 poids par défaut publiés ; formules décrites dans le wiki awesome-fsrs, « The Algorithm » (https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm) | MIT (Copyright © Open Spaced Repetition) |

Les tests unitaires de `js/fsrs.js` comparent ses sorties à celles de py-fsrs 6.3.3 exécuté en Python.
