# Anarch Chess

Client-side implementation of Anarch Chess. The board rules, AI search, evaluation,
post-game analysis, and AI worker run in the browser. Match archive requests
use `/api` when a backend is available and fall back to `localStorage` when it
is not.

## Local development

```powershell
npm ci
npm run dev
```

The frontend-only command is useful when you do not need match persistence.
For the complete local application, including the reconstructed TypeScript
SQLite API:

```powershell
npm run build
npm run server
```

Then open `http://127.0.0.1:8787/`. The server serves the production frontend,
the `/api/matches` and `/api/stats` endpoints, and creates
`data/anarch-chess.sqlite` automatically. Node 24 includes the SQLite driver,
so SQLite does not need to be installed separately.

During UI development, run `npm run dev` and `npm run server` in separate
terminals. Vite proxies `/api` to port `8787`.

To run the compiler checks separately:

```powershell
npm run typecheck
```

## Netlify

Create a Netlify site from this repository with the base directory set to
`anarch-chess`. The included [netlify.toml](./netlify.toml) builds the Vite
application and rewrites SPA routes to `index.html`.

Equivalent settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: `anarch-chess`

## Render

Create a Render Web Service using the included
[render.yaml](./render.yaml). It serves the built frontend and the SQLite API
from one Node process:

- Root directory: `anarch-chess`
- Build command: `npm ci && npm run build`
- Start command: `npm run server`
- Node version: 24
- `DATA_DIR`: `./data`

The Node server rewrites unknown frontend GET routes to `index.html`, so direct
navigation to `/rules` and `/about` works. For production persistence, attach a
Render persistent disk at `/opt/render/project/src/anarch-chess/data`; otherwise
the database is reset when the service is redeployed.

