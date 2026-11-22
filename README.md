# World – Géo (PWA)

App web installable sur iPhone pour apprendre les 194 pays du jeu : nom, capitale, drapeau, localisation, plus un trait d’identité par pays.
Elle est en français, fonctionne hors ligne et enregistre la progression sur l’appareil.

## Installation sur iPhone
1. Ouvrir l’URL HTTPS de l’app dans **Safari**.
2. Bouton **Partager** → **Sur l’écran d’accueil** → Ajouter.
3. Ouvrir l’app une fois en ligne : tout est mis en cache (environ 3,5 Mo) ; ensuite elle marche hors ligne.

La progression est stockée sur l’appareil, dans l’app installée. Changer d’URL fait repartir de zéro ; l’export/import est dans Réglages.

## Hébergement (fichiers statiques, aucun serveur nécessaire)
Déposer le contenu de ce dossier (ou `world-app.zip`) à la racine d’un hébergeur HTTPS :
- **GitHub Pages** (compte GitHub gratuit) : dépôt public → Settings → Pages → branche `main`, dossier racine.
- **Netlify** : glisser le dossier sur app.netlify.com/drop. Sans compte, l’URL reste protégée par un mot de passe temporaire et doit être réclamée dans l’heure (inscription gratuite).
- **Cloudflare Pages** / **Vercel** : compte gratuit, import du dossier ou du dépôt.
- **Sans compte, temporaire** : `cloudflared tunnel --url http://localhost:8765` donne une URL `trycloudflare.com` aléatoire, valable tant que la machine tourne. Ça suffit pour une première installation, mais l’URL change à chaque lancement.

## Test local
`python3 -m http.server 8765` dans ce dossier, puis http://localhost:8765

## Structure
`index.html`, `css/app.css`, `js/app.js` (vanilla JS, sans dépendance), `data/countries.json`, `data/geo.json`, `flags/*.svg`, `fonts/`, `icons/`, `manifest.webmanifest`, `sw.js` (cache hors ligne versionné).
Sources et licences : voir `LICENCES.md`.
