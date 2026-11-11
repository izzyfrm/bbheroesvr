# Basketball Heroes — Website

Marketing site for **Basketball Heroes**, a VR basketball game with superhero energy, built in Unity 6.6 for Meta Quest.

- Static site in `public/`: `index.html`, `privacy.html`, `terms.html`, `css/style.css`, `js/main.js`
- No build step. Served by a Cloudflare Worker (static assets) — config in `wrangler.jsonc`, deploy with `npx wrangler deploy`. Custom domains: bbheroesvr.com + www.
- 3D ball, hoop and halftone background built with three.js (vendored in `public/js/vendor/`), smooth scrolling via Lenis; fonts from Google Fonts (Archivo).

X: https://x.com/BBHeroesVR · Discord: https://discord.gg/UDTt6UsswX
