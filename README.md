# daedalus

An infinite sliding lightbox of projects made under daedalus: calendAI, Scrapify, status of ai, dmphotos and Washtag (coming soon).

Plain static HTML, no build step. Set in DM Sans.

## Edit

Projects live in the `PROJECTS` array near the bottom of `index.html`: name, url, a very short caption and a screenshot path. Leave `url` empty to show a project as coming soon.

## Screenshots

`shots/` holds real screenshots of each live site. The Screenshots workflow refreshes them every Monday; run it from the Actions tab to refresh now. Add a new site to `scripts/screenshots.mjs` as well as to `PROJECTS`.

## Deploy

Import this repository at vercel.com/new. Framework preset: Other. No build command, output directory is the repo root. Every push to `main` redeploys.
