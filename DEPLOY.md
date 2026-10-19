# AI Concept Coach deployment notes

## Fastest path: Render + SQLite persistent disk

This project is ready to deploy as a Render web service.

Important files:
- `render.yaml`: Render Blueprint config
- `server.js`: respects `PORT` and `SQLITE_DB_PATH`
- `/healthz`: health check endpoint

## What to do in Render

1. Push this folder to a Git repository.
2. In Render, create a new Blueprint or Web Service from that repo.
3. Confirm the service settings from `render.yaml`:
   - Runtime: Node
   - Start command: `npm start`
   - Health check: `/healthz`
   - Persistent disk mount: `/var/data`
4. Deploy.
5. After deploy finishes, open the generated `onrender.com` URL.

## Persistent data

The SQLite file should live at:

`/var/data/concept-coach.db`

Locally, if `SQLITE_DB_PATH` is not set, the app falls back to:

`data/concept-coach.db`

## Optional next step for production

If you want real email login, replace the fake user switcher with Supabase Auth and migrate the SQLite tables to Postgres.
