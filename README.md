# Basketball Heroes — Website

Marketing site for **Basketball Heroes**, a VR basketball game with superhero energy, built in Unity 6.6 for Meta Quest.

- Static site in `public/`: `index.html`, `privacy.html`, `terms.html`, `css/style.css`, `js/main.js`
- No build step. Served by a Cloudflare Worker (static assets) — config in `wrangler.jsonc`, deploy with `npx wrangler deploy`. Custom domains: bbheroesvr.com + www.
- Smooth scrolling via [Lenis](https://github.com/darkroomengineering/lenis) (CDN, optional); fonts from Google Fonts.

X: https://x.com/BBHeroesVR · Discord: https://discord.gg/UDTt6UsswX
