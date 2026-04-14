# Scout — Docker / Nosana deployment

## Build image locally
npm run docker:build

## Run locally
Requires `.env` at repo root (see `.env.example` if present; at minimum: `HELIUS_API_KEY`).

npm run docker:run
# Open http://localhost:3001 (UI + API)
# Open http://localhost:3000 (ElizaOS chat)

## Push to Docker Hub
docker login
npm run docker:push

## Deploy to Nosana
1. Push image to Docker Hub (`tonestech/scout:latest`)
2. Edit `nosana-job.json` — replace `HELIUS_API_KEY` placeholder with your real key
3. Go to https://deploy.nosana.com
4. Upload the edited `nosana-job.json`
5. Submit. Copy the deployment URL (exposes port 3001 — the Scout UI)

## Troubleshooting
- **Container exits immediately** — check logs for `[start.sh]` messages. If sidecar logs appear but no "Backend Server" log from eliza within 60s, eliza's first boot may be slow on first pull; restart should be fast.
- **`.eliza/` not writable** — the Dockerfile chmods it to 777 at build; if a mounted volume overrides this, ensure the volume permissions allow write.
- **`wait -n: not found`** — start.sh uses bash 4.3+; alpine's `bash` package is 5.x so this should not happen. If it does, the `#!/usr/bin/env bash` shebang may have resolved to `sh`; check `apk info bash`.
