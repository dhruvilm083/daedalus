# daedalus

A one-page showcase of projects made under daedalus: calendAI, Scrapify, status of ai, dmphotos and Washtag (coming soon).

Plain static HTML, no build step. Set in DM Sans.

## Edit

Projects live in the `PROJECTS` array near the bottom of `index.html`. Each entry has a name, domain, type, one-line summary and description. Leave `domain` empty to show a project as coming soon; fill it in at launch.

To use a real screenshot instead of the drawn preview, drop a 16:9 image in `shots/` and set that project's `shot` field, for example `shot: "shots/calendai.png"`.

## Deploy

Import this repository at vercel.com/new. Framework preset: Other. No build command, output directory is the repo root. Every push to `main` redeploys.
