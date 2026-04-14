# syntax=docker/dockerfile:1.6

# ---------- Stage 1: server dependencies ----------
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
# --ignore-scripts avoids a broken postinstall chain in @elizaos/plugin-ollama
# that invokes `bun` before `bun` has unpacked its own binary. We then install
# bun's binary manually (required by the elizaos CLI) and rebuild native
# addons (better-sqlite3 needs node-gyp compilation).
RUN npm install --no-audit --no-fund --loglevel=error --ignore-scripts \
 && node node_modules/bun/install.js \
 && npm rebuild better-sqlite3 --no-audit --no-fund --loglevel=error

# ---------- Stage 2: UI build ----------
FROM node:20-slim AS ui-build
WORKDIR /app/ui
COPY ui/package.json ui/package-lock.json* ./
RUN npm install --no-audit --no-fund --loglevel=error
COPY ui/ ./
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      tini bash ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
COPY characters ./characters
COPY --from=ui-build /app/ui/dist ./ui/dist
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# ElizaOS SQLite / cache directory — must be writable
RUN mkdir -p /app/.eliza && chmod 777 /app/.eliza

ENV NODE_ENV=production \
    SERVER_PORT=3000 \
    SIDECAR_PORT=3001

EXPOSE 3000 3001

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/start.sh"]
