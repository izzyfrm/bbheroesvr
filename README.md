# Basketball Heroes website

Marketing site for **Basketball Heroes**, a physics-based VR basketball game for Meta Quest 3 and 3S.

- Static site in `public/`: plain HTML, one stylesheet (`css/style.css`) and one small ES module (`js/main.js`). No framework, no build step.
- Served by a Cloudflare Worker with static assets. Config is in `wrangler.jsonc`, response headers (security headers, image caching) are in `public/_headers`. Custom domains: bbheroesvr.com and www.bbheroesvr.com.
- Smooth scrolling is [Lenis](https://github.com/darkroomengineering/lenis), vendored in `public/js/vendor/` and used on mouse devices only. Type is Archivo from Google Fonts.

## Run it locally

```bash
npx wrangler dev
```

Opens on http://localhost:8787 with the same routing, 404 page and headers as production.

If your local Wrangler is older than the compatibility date in `wrangler.jsonc` it refuses to start ("newest date supported by this server binary"). Either update it (`npm i -g wrangler`) or pass the newest date it supports, e.g. `wrangler dev --compatibility-date=2026-10-03`. This only affects local preview.

## Deploy

```bash
npx wrangler deploy
```

## Images

Every picture of the game is rendered from the Unity project (edit-mode renders of the real scene, using the game's own day/night cycle). The lossless masters live in the game project folder `Screenshots/Web/`; `public/img/` holds the JPEG exports. Each time-of-day frame comes from the same camera, set to one of the four presets in the in-game menu. The social card (`public/og.jpg`) and the icons were rendered from small HTML templates.

When you replace an image, keep the filename and the pixel size, or update the `width` and `height` attributes in `index.html`. Images are cached for a week (`public/_headers`), so a new file with a new name is the quickest way to bust the cache.

## Content notes

- Gameplay copy comes from the project docs in `Docs/`. Re-check it whenever the controls change.
- `privacy.html` and `terms.html` are working drafts. Replace them with reviewed versions before release.

X: https://x.com/BBHeroesVR · Discord: https://discord.gg/UDTt6UsswX
