# World – Géo (PWA)

App web installable sur iPhone pour apprendre les 194 pays du jeu : nom, capitale, drapeau, localisation, plus un trait d’identité par pays.
Elle est en français, fonctionne hors ligne et enregistre la progression sur l’appareil.

## Installation sur iPhone
1. Ouvrir l’URL HTTPS de l’app dans **Safari**.
2. Bouton **Partager** → **Sur l’écran d’accueil** → Ajouter.
3. Ouvrir l’app une fois en ligne : tout est mis en cache (environ 3,5 Mo) ; ensuite elle marche hors ligne.

La progression est stockée sur l’appareil, dans l’app installée. Changer d’URL fait repartir de zéro ; l’export/import est dans l’onglet Paramètres.

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
`index.html`, `css/app.css`, `js/app.js` (vanilla JS, sans dépendance), `js/fsrs.js` (FSRS-6), `data/wiki.json` (textes Wikipédia), `data/countries.json`, `data/geo.json`, `flags/*.svg`, `fonts/`, `icons/`, `manifest.webmanifest`, `sw.js` (cache hors ligne versionné).
Sources et licences : voir `LICENCES.md`.
