# daedalus productions

Infinite sliding lightboxes of projects by daedalus productions, on three pages: /software (the home page: calendAI, Scrapify, status of ai, Washtag), /hardware (NATO CUAS, coming soon) and /it (Make a Change Homes, dmphotos).

Plain static HTML, no build step. Set in DM Sans.

## Edit

Projects live in the `PROJECTS` array near the bottom of `index.html`: page, name, url, a very short caption and a screenshot path. `vercel.json` rewrites /hardware, /software and /it to the same page. Leave `url` empty for a project that has not launched.

## Screenshots

`shots/` holds real screenshots. The Screenshots workflow refreshes the public sites (status of ai, with an 8-second clip of its animations; dmphotos and Washtag in dark mode) every Monday; run it from the Actions tab to refresh now. calendAI (History page, dark mode) and Scrapify (dashboard) need sign-in, so their shots were taken from local copies of each app with a mock account and mock data, and the workflow leaves them alone.

## Deploy

Live at https://daedalus.productions

Import this repository at vercel.com/new. Framework preset: Other. No build command, output directory is the repo root. Every push to `main` redeploys.
