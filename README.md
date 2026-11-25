# World – Géo (PWA)

App web installable sur iPhone pour apprendre les 194 pays du jeu (nom, capitale, drapeau, localisation, trait d’identité) et, depuis la v5, **205 végétaux et animaux de Munich** à reconnaître sur photo.
Elle est en français, fonctionne hors ligne et enregistre la progression sur l’appareil.

## Installation sur iPhone
1. Ouvrir l’URL HTTPS de l’app dans **Safari**.
2. Bouton **Partager** → **Sur l’écran d’accueil** → Ajouter.
3. Ouvrir l’app une fois en ligne : tout est mis en cache (environ 3,5 Mo) ; ensuite elle marche hors ligne.

La progression est stockée sur l’appareil, dans l’app installée. Changer d’URL fait repartir de zéro ; l’export/import est dans l’onglet Paramètres.

## Version 5.2 — chants et cris
- **64 animaux ont un son** : 58 oiseaux, plus renard, chevreuil (aboiement), sanglier, écureuil, crapaud commun et grenouille rousse. Chacun a 1 à 3 extraits différents, 180 en tout, entre 3 et 12 s (10,5 s en moyenne), pour 14 Mo. Les insectes, papillons, escargots, araignées et reptiles de la liste n'ont pas de son caractéristique : ils n'en ont pas.
- **Fiche et introduction** : bloc « Chant et cris » avec un bouton lecture/pause par extrait, une barre d'avancement, l'auteur, la licence et le lien source. **Corrigé** : « Écouter » la bonne espèce, et après une erreur aussi l'espèce choisie, pour comparer.
- **Nouvelles questions**, réservées aux espèces qui ont un son :
  - « Quel animal fait ce son ? » : 4 propositions avec photo et nom. Elle apparaît quand la stabilité FSRS de la carte atteint 2 jours.
  - « Quel est son chant ou son cri ? » : photo et nom, puis 3 sons (4 à partir de 8 jours de stabilité), chacun avec « Écouter » et « Choisir ». Elle apparaît à partir de 5 jours de stabilité.
  - Les pièges sont des espèces proches qui ont un son : confusions passées, sosies de la fiche, même groupe (les mésanges entre elles).
  - Dans le mélange, une carte bien connue reçoit environ 1 question sur 4 en son, une carte jeune aucune. Les questions sonores sont notées par FSRS comme les autres, avec des seuils de temps plus longs, puisqu'il faut écouter.
  - Défi « Chants et cris » dans Défis (animaux).
- **Lecture** : uniquement au toucher, jamais automatique. Un seul son à la fois : en lancer un arrête le précédent, et changer d'écran ou de question coupe le son.
  - **Mode silencieux de l'iPhone** : les sons passent par le lecteur audio de Safari (élément `<audio>`) et l'app demande `navigator.audioSession.type = 'playback'` (iOS 17 et plus) : en principe ils restent audibles, au volume « médias ». Si le volume est à zéro, on n'entend rien, mais rien ne casse : le bouton, l'indicateur et les réponses marchent. Le petit bip des réponses (Paramètres → Signal des réponses) reste muet en mode silencieux. Ce comportement n'a pas pu être vérifié sur un vrai iPhone.
- **Réglage « Questions sonores »** (Paramètres → Végétaux et animaux), actif par défaut : quand il est coupé, plus aucune question sonore ni défi « Chants et cris ». Les boutons « Écouter » des fiches restent, et ne jouent que si on les touche.
- **Hors ligne** : les sons sont exclus du précache. Ils vont dans un cache séparé `worldsounds-v1` à la première écoute, ou tous d'un coup avec « Télécharger tous les sons pour le hors-ligne (≈ 14 Mo) ». Le service worker répond aux requêtes partielles (Range → 206) qu'exige Safari pour l'audio.
- **Sources** : iNaturalist (178 extraits) et Wikimedia Commons (2), sous CC BY 136, CC0 40, CC BY-SA 4. Le détail est dans `LICENCES-SONS.md`. xeno-canto n'a pas servi : son API exige une clé et la plupart de ses enregistrements sont sous licence NC.
- **Installation** : `world-sounds-1.zip` contient `sounds/<espèce>/<n>.m4a`. Le décompresser à la racine de l'app, comme les zips de photos.

## Version 5.1 — photos entières
- Les photos d’espèces ne sont plus recadrées : elles s’affichent entières (`object-fit: contain`, fond neutre selon le thème), dans des cases au format de chaque photo. C’est le cas partout : grilles de réponses, question photo → nom, introduction, corrigé, fiche, liste et confusions.
- Grilles « quelle photo ? » et « laquelle est laquelle ? » : 2 colonnes seulement si chaque photo garde au moins 150 px de large, sinon 1 colonne pleine largeur (on fait défiler).
- **Loupe** (coin haut droit de chaque photo-réponse) : ouvre la photo en plein écran **sans répondre**. Pincer pour zoomer (jusqu’à ×5), glisser pour se déplacer, double toucher pour ×2,5 ou revenir à ×1, puis « ✕ Fermer ». Un toucher simple sur la photo reste la réponse. Dans la question photo → nom, l’introduction et la fiche, toucher la photo l’agrandit.
- 23 photos où l’animal est minuscule ou caché passent en fin de rotation. Elles ne sont plus montrées en introduction ni comme pièges, mais restent dans la fiche, en dernier. Elles ont été présélectionnées par CLIP puis vérifiées à l’œil : liste dans `world-build/nature/far_demote.json`.

## Version 5 — Végétaux et animaux de Munich
L’accueil a maintenant trois domaines : **Géographie**, **Végétaux de Munich** (106 espèces : arbres feuillus, conifères, arbustes et lianes, fleurs et herbacées) et **Animaux de Munich** (99 espèces : oiseaux, oiseaux d’eau, mammifères, insectes, papillons, araignées/amphibiens/reptiles/escargots). La liste complète est dans `ESPECES.md`.

**Fonctionnement**
- Introduction progressive façon Anki : **5 nouvelles espèces par jour** par défaut (3/5/8/12 dans Paramètres → Végétaux et animaux), les plus courantes à Munich d’abord ; limite de révisions par jour (60 par défaut).
- Chaque nouvelle espèce est d’abord **présentée** (3 photos, noms FR/DE/latin, 3 critères diagnostiques, confusions possibles), puis interrogée une ou deux questions plus tard avec une photo **jamais vue**, puis rappelée en fin de séance.
- Types de questions qui se durcissent avec la maturité de la carte FSRS : photo → nom (d’abord), puis nom → photo et critère → espèce, puis « laquelle est laquelle ? » (deux espèces proches côte à côte), puis 6 propositions au lieu de 4.
- Propositions pièges tirées des **groupes de confusion** (même groupe, confusions déclarées, erreurs passées).
- Après une erreur : les deux espèces côte à côte et **« Comment les distinguer »** ; l’espèce ratée revient dans la séance.
- Photo différente à chaque révision (historique par espèce, jamais deux fois de suite la même).
- Fiche espèce : galerie de 6 photos avec auteur et licence, critères, mois d’observation, où la voir à Munich, anecdote, **confusions cliquables** (retour = retour exact au défi), lien iNaturalist.
- Catégories cliquables (à réviser, difficiles, en apprentissage, en consolidation, maîtrisées, à découvrir, visibles ce mois-ci), statistiques par domaine, prévision par jour, notes des 30 derniers jours.
- Onglet **Sortie** : un « défi sortie » de saison, les espèces visibles ce mois-ci, et des liens vers iNaturalist, Flora Incognita et Merlin pour vérifier sur le terrain. Filtre de saison optionnel (fin novembre : arbres par l’écorce et la silhouette, oiseaux d’eau hivernants, oiseaux des mangeoires…).
- Paramètres → « Comment apprendre » explique la méthode dans l’app.
- Les cartes nature partagent le même moteur FSRS-6, la même sauvegarde (clé `N:<espèce>`) et l’export/import ; la progression v4 est conservée telle quelle.

**Méthode (recherche sur l’apprentissage des catégories naturelles)**
- *Exemples variés et entrelacés* : apprendre des peintres ou des oiseaux en mélangeant les catégories plutôt qu’en bloc améliore la reconnaissance de nouveaux exemples (Kornell & Bjork 2008, *Psychological Science* 19(6) ; Wahlheim, Dunlosky & Jacoby 2011, *Memory & Cognition* 39(5) sur les oiseaux ; Kang & Pashler 2012, *Applied Cognitive Psychology* 26). D’où plusieurs photos par espèce, jamais la même deux fois de suite, et des séances qui mélangent les espèces.
- *Entrelacer surtout les espèces semblables* : le bénéfice tient à la comparaison entre catégories proches (Carvalho & Goldstone 2014, *Memory & Cognition* 42(3) ; Birnbaum, Kornell, Bjork & Bjork 2013, *Memory & Cognition* 41). D’où les groupes de confusion, les pièges proches et les questions « laquelle est laquelle ? ».
- *Retour immédiat et contrastif* : montrer la bonne espèce à côté de celle choisie aide à apprendre les traits qui les séparent (Jacoby, Wahlheim & Coane 2010, *JEP:LMC* 36(6)).
- *Récupération active et espacement* (FSRS-6, comme pour la géographie).
- *Critères diagnostiques* explicites et *pont vers le terrain* (défi sortie, applis d’identification).

**Photos** : 1 230 photos iNaturalist (6 par espèce) sous CC0, CC BY ou CC BY-SA, choisies parmi les observations de Munich/Haute-Bavière puis d’Europe, filtrées automatiquement (similarité image-texte CLIP, doublons) puis relues sur planches contact (mains, spécimens morts, plumes, figurines, sujets trop lointains retirés). WebP 600 px, ~28 Ko en moyenne, 34 Mo au total. Attributions : `LICENCES-PHOTOS.md`. Hors ligne : le code et les données sont précachés ; les photos sont mises en cache au fil de l’eau (espèces déjà vues + prochaines espèces), ou toutes d’un coup via Paramètres → « Télécharger toutes les photos ».

**Installation des fichiers** : `world-app.zip` contient le code et les données ; les photos sont dans `world-photos-1.zip` et `world-photos-2.zip`. Décompresser les trois **dans le même dossier racine** de l’app (les zips photos contiennent `photos/<espèce>/<n>.webp`).

## Version 4
- **Mode « Apprendre » masqué par défaut.** L'accueil ne propose plus « Apprendre le monde » ni « Apprendre par continent » ; le réglage Paramètres → Révisions → « Afficher le mode Apprendre » le rétablit. Les défis alimentent FSRS : chaque pays rencontré en défi devient une carte de mémoire.
- **Accueil recentré** sur « Cartes à réviser » (réviser maintenant, réviser les cartes difficiles, 7 catégories touchables) et sur les **Défis** (5 défis rapides + personnaliser, défis par continent). Sur un continent, « Réviser ce continent » remplace la séance d'apprentissage.
- **Catégories touchables partout** : tuiles de l'accueil et des statistiques, prévision par jour, maîtrise par compétence, notes des 30 derniers jours, étiquettes des fiches (maîtrisée, difficile, très difficile, en apprentissage, facile), badges des défis. Chacune ouvre la liste précise (pays + compétence, drapeau, rappel prédit, échéance, filtre par compétence) ; chaque ligne ouvre la fiche, « retour » restaure la liste (filtre et défilement) ; « Réviser ces cartes » lance une révision ciblée.
- Tous les éléments touchables sont de vrais `<button>` (audit automatique sous WebKit avec gestes tactiles).

## Version 3
- **Défi « continent » supprimé** (trop facile). L’ancienne progression de ce défi est archivée dans la sauvegarde, pas effacée.
- **Révision espacée FSRS-6** (le modèle d’Anki, portage de py-fsrs 6.3.3, poids par défaut) à la place des boîtes fixes. Il y a une carte mémoire par pays et par compétence (capitale, drapeau, localisation), avec sa stabilité, sa difficulté, sa date de retour et ses erreurs.
  - La note est déduite de la réponse : une erreur vaut « À revoir », une réponse lente « Difficile », une réponse normale « Bien » et une réponse très rapide « Facile ». Les seuils se règlent dans Paramètres (rapide / normal / lent).
  - Les cartes dues passent d’abord, en commençant par le rappel prédit le plus faible ; les cartes souvent ratées remontent.
  - Une carte ratée revient quelques questions plus tard dans la même séance.
  - Les mauvaises réponses choisies servent ensuite de propositions pièges.
  - La rétention cible se règle à 85, 90 ou 95 %.
- Écran **Statistiques** : cartes à réviser aujourd’hui, cartes maîtrisées, prévision sur 7 jours, maîtrise par compétence, cartes difficiles et rappel le plus faible. Chaque fiche affiche aussi l’état de mémorisation de ses compétences et un bouton « Réviser ce pays ».
- Fiches enrichies : un panneau dépliant **« En savoir plus »**, fermé par défaut, donne l’introduction Wikipédia (150 à 350 mots) ainsi que les langues, la monnaie et le régime. La source et la licence CC BY-SA 4.0 y sont indiquées. Tout est disponible hors ligne.
- **Ponts** entre les vues :
  - Après une réponse, la bonne réponse et la réponse choisie ouvrent leur fiche ; « retour » ramène exactement au défi, consultation non comptée.
  - Depuis une fiche, on ouvre les voisins (avec drapeau), la liste du continent depuis la capitale ou le continent, et la carte centrée sur le pays.
  - Le bilan liste les erreurs cliquables, et les statistiques ouvrent les fiches.
  - Le bouton retour de l’app et celui du navigateur restaurent l’état de chaque vue.
- La progression v1/v2 est migrée automatiquement sans perte. Une copie brute est gardée dans `worldgeo.v1.backup-v2`, et l’import accepte aussi les anciennes sauvegardes.

## Version 2
- La carte du monde garde la vue (zoom + position + continent) quand on ouvre une fiche puis qu’on revient, quand on change d’onglet et après fermeture de l’app (clé `worldgeo.mapview`). Le bouton ⟲ recentre.
- Onglet **Paramètres** : thème Jour / Nuit / Auto, taille du texte, animations, étiquettes de la carte (numéros / noms / aucune), nouveaux pays par séance, questions par défi, sons, export / import / réinitialisation. Préférences dans `worldgeo.prefs`, appliquées avant l’affichage.
- Mise en page robuste au zoom d’affichage de l’iPhone et aux grandes tailles de texte (testée de 280 à 390 px de large, police racine de 100 à 150 %).
- Une nouvelle version du service worker recharge l’app une fois pour s’afficher tout de suite.

## Hébergement (fichiers statiques, aucun serveur nécessaire)
Déposer le contenu de ce dossier (ou `world-app.zip`) à la racine d’un hébergeur HTTPS :
- **GitHub Pages** (compte GitHub gratuit) : dépôt public → Settings → Pages → branche `main`, dossier racine.
- **Netlify** : glisser le dossier sur app.netlify.com/drop. Sans compte, l’URL reste protégée par un mot de passe temporaire et doit être réclamée dans l’heure (inscription gratuite).
- **Cloudflare Pages** / **Vercel** : compte gratuit, import du dossier ou du dépôt.
- **Sans compte, temporaire** : `cloudflared tunnel --url http://localhost:8765` donne une URL `trycloudflare.com` aléatoire, valable tant que la machine tourne. Ça suffit pour une première installation, mais l’URL change à chaque lancement.

## Test local
`python3 -m http.server 8765` dans ce dossier, puis http://localhost:8765

## Structure
`index.html`, `css/app.css`, `js/app.js` (vanilla JS, sans dépendance), `js/fsrs.js` (FSRS-6), `data/wiki.json` (textes Wikipédia), `data/countries.json`, `data/geo.json`, `flags/*.svg`, `fonts/`, `icons/`, `manifest.webmanifest`, `sw.js` (cache hors ligne versionné), `data/nature.json` (espèces), `photos/<espèce>/<n>.webp`, `sounds/<espèce>/<n>.m4a`.
Sources et licences : voir `LICENCES.md`.
