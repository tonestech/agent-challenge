<div align="center">

# Scout

**Self-hosted crypto research analyst for Solana tokens, running on the Nosana decentralized GPU network.**

*Stop trusting centralized rug-checkers with your due diligence. Own the tool. Own the data. Own the compute.*

[Live Deployment on Nosana](https://3VUfSFidB3v8NvGCEhgYMAQ1ho4bLa1VQPYwUGd7GGNT.node.k8s.prd.nos.ci) · [Docker Image](https://hub.docker.com/r/tonestech/scout) · [Built with ElizaOS v2](https://github.com/elizaos/eliza)

[![Nosana](https://img.shields.io/badge/Deployed%20on-Nosana-14F195)](https://nosana.com)
[![ElizaOS](https://img.shields.io/badge/Framework-ElizaOS%20v2-7B3FE4)](https://github.com/elizaos/eliza)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

</div>

---

## What is Scout?

Scout is an autonomous agent that investigates any Solana SPL token and returns a structured risk verdict — authorities, holder concentration, liquidity depth, age, market pressure — in the voice of a crypto analyst who has seen too many rugs.

Paste a token symbol or mint address. Wait ~30 seconds. Get live on-chain data from Helius, market data from DexScreener, a 0–100 risk score, and a sharp, opinionated verdict from the agent.

Unlike `rugcheck.xyz` or any other centralized due-diligence site, Scout runs on infrastructure **you control**:

- **Your Helius key.** Your API budget, your rate limit.
- **Your Nosana node.** Decentralized GPU network on Solana, not AWS.
- **Your agent.** Forkable, rebrandable, extensible. Change the persona, swap the data sources, add your own red-flag heuristics.

This is what the [OpenClaw](https://nosana.com/blog/builders-challenge-elizaos/) movement looks like in practice: reclaim personal AI from Big Tech rent seekers. Don't rent safety. Own it.

## Features

- **Live on-chain investigation** — Helius DAS (`getAsset`, `getTokenLargestAccounts`, `getTokenSupply`) for authorities, supply, and holder concentration. DexScreener for price, liquidity, volume, FDV, pair age.
- **Risk scoring** — weighted red-flag evaluator across 5 severity tiers (CRITICAL / HIGH / MEDIUM / LOW / POSITIVE) produces a 0–100 score with a color-coded verdict band.
- **LLM-generated verdicts** — Qwen3.5 served by the Nosana inference endpoint generates verdicts in Scout's voice: 4 parsed sections (headline, good, bad, vibe) with bullet-point evidence.
- **Dual-mode interface:**
  - **Scout UI** (port 3001) — React + Tailwind dark terminal aesthetic. Structured analysis with risk gauge, parsed verdict, signals, on-chain metrics grid. The primary interface.
  - **ElizaOS chat** (port 3000) — conversational agent for general due-diligence theory and framework discussion. Self-aware about its limits: redirects users to the Scout UI for live-data queries rather than fabricating numbers from training memory.
- **Self-hosted end-to-end** — one Docker image, one Nosana job. No SaaS backend, no data harvesting, no rent extraction.

## Live demo

Active deployment:
**https://3VUfSFidB3v8NvGCEhgYMAQ1ho4bLa1VQPYwUGd7GGNT.node.k8s.prd.nos.ci**

Try these tokens to see the full range of verdicts:

- `BONK` — mature meme coin, authorities revoked, low risk verdict
- `WIF` — popular Solana token with active market
- Any mint address you want to investigate

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   React UI (Vite)       │  HTTP   │  Scout Sidecar (Express) │
│   Served statically     │ ──────→ │  Port 3001 — UI + API    │
└─────────────────────────┘         └────────────┬─────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          │                      │                      │
                          ▼                      ▼                      ▼
              ┌────────────────────┐  ┌──────────────────┐   ┌─────────────────────┐
              │  Helius DAS RPC    │  │   DexScreener    │   │   Nosana LLM        │
              │  On-chain metadata │  │   Market data    │   │   Qwen3.5 inference │
              └────────────────────┘  └──────────────────┘   └─────────────────────┘

┌──────────────────────────┐
│   ElizaOS Agent          │
│   Port 3000 — chat       │
│   Dual-mode persona      │
└──────────────────────────┘

       Both processes run inside one container, supervised by tini + bash trap.
```

Two processes share the container, coordinated by `docker/start.sh` under `tini` as PID 1. If either child dies the trap fires, kills the other, and the script exits non-zero so Nosana can restart cleanly.

## Quick start (local)

Prerequisites: Node 20+ or Bun 1.1+, a Helius API key ([free tier](https://dashboard.helius.dev/)).

```bash
git clone https://github.com/tonestech/agent-challenge.git
cd agent-challenge

# Copy the env template and fill in your HELIUS_API_KEY
cp .env.example .env
# Edit .env — at minimum set HELIUS_API_KEY

# Install deps (root + UI)
npm install
(cd ui && npm install)

# Run both services (ElizaOS :3000 + Sidecar :3001 + Vite :5173)
bun run dev:all
```

Open `http://localhost:5173` for the UI in development mode (proxies `/api` to the sidecar), or `http://localhost:3001` for the production-like bundle served by the sidecar directly.

## Deploy your own instance on Nosana

1. **Build and push the Docker image** (or reuse the published one at `docker.io/tonestech/scout:latest`):

```bash
   npm run docker:build
   docker login
   npm run docker:push
```

2. **Edit `nosana-job.json`** — replace the `HELIUS_API_KEY` placeholder with your real key. Keep the other env vars unless you're swapping the LLM endpoint.

3. **Deploy via `deploy.nosana.com`:**
   - Sign in with your account (or connect a Solana wallet)
   - Create a new deployment → Configure → paste the contents of `nosana-job.json`
   - Pick a GPU tier (any tier works — Scout is CPU-bound; the GPU requirement is a scheduling artifact)
   - Submit

4. **Wait ~2 minutes** for the image to pull and both services to start. Your public URL will appear in the deployment overview under Endpoints, port 3001.

Full details: see [`README.Docker.md`](README.Docker.md).

## Tech stack

| Layer | Tech |
|---|---|
| Agent framework | ElizaOS v2 with `@elizaos/plugin-bootstrap` and `@elizaos/plugin-openai` |
| LLM inference | Qwen3.5 on Nosana's OpenAI-compatible endpoint (no GPU billing from Scout itself) |
| On-chain data | Helius DAS API (`getAsset`, `getTokenLargestAccounts`, `getTokenSupply`) with exponential backoff retry |
| Market data | DexScreener token pairs API |
| Backend | Express 4 sidecar on port 3001, TypeScript via `tsx` runtime |
| Frontend | React 18 + Vite 5 + Tailwind v4, zero CSS framework bloat |
| Container | Multi-stage Docker build on `node:20-slim`, supervised by `tini` + bash trap |
| Deployment | Nosana decentralized GPU network, one-container one-job topology |

## How Scout addresses the judging criteria

<details>
<summary><strong>Technical Implementation (25%)</strong></summary>

- ElizaOS v2 used as designed: character file, `plugin-openai` for inference, `plugin-bootstrap` for default runtime, custom `ANALYZE_SOLANA_TOKEN` action registered against the agent runtime.
- Robust error handling: exponential backoff retry on Helius `-32603` errors, graceful null fallbacks for unavailable holder data, typed error responses from the sidecar API.
- TypeScript end-to-end with strict mode, type-sharing between server and UI via mirrored types, runtime execution via `tsx` (no brittle compile step in production).
- Dual-process container architecture with proper signal handling (tini + bash trap + `wait -n`), ensuring the whole container dies if either service dies so Nosana can restart cleanly.

</details>

<details>
<summary><strong>Nosana Integration (25%)</strong></summary>

- LLM inference exclusively via Nosana's OpenAI-compatible Qwen3.5 endpoint — no external API keys for language models, no OpenAI spend.
- Single-container deployment designed for Nosana's job scheduler: one exposed port, environment-variable-driven config, writable SQLite at `/app/.eliza`, image size under 400 MB for fast cold starts.
- `nosana-job.json` included in the repo, parametrized for any user to redeploy their own instance with their own Helius key.
- Multi-stage Docker build minimizes image size and build-time dependencies; runtime image only contains what's needed to serve.

</details>

<details>
<summary><strong>Usefulness & UX (25%)</strong></summary>

- Solves a real problem: Solana token due diligence before buying is usually either a tedious manual process (multiple tabs, copy-paste addresses) or outsourced to centralized services that collect your queries as data.
- UI designed for clarity under latency: the ~30s LLM generation time is filled with rotating status messages, elapsed timer, and skeleton placeholders. Users never wonder if the page is stuck.
- Risk gauge + parsed verdict sections + signal cards + on-chain metrics grid make the output scannable. Dark terminal aesthetic signals "serious tool" not "toy demo."
- Dual-mode agent: chat for theory and frameworks, UI for live analysis. The agent is self-aware about which mode fits which question, and redirects rather than fabricating.

</details>

<details>
<summary><strong>Creativity & Originality (15%)</strong></summary>

- Voice: Scout's sarcastic-but-useful analyst persona is distinctive and deliberately avoids both the cheerleader emoji voice ("To the moon 🚀💎") and the compliance-disclaimer voice ("not financial advice, DYOR"). It reads like a senior analyst who's tired but engaged.
- The "two modes, one agent" design pattern — chat for conceptual questions, UI for specific data — is a pragmatic response to the limitation that small open-source LLMs have unreliable tool-use. Instead of fighting the model, Scout teaches it to delegate.
- Self-hosted-first framing aligns with the OpenClaw movement: the product is not just a tool, it's a position on how personal AI should work.

</details>

<details>
<summary><strong>Documentation (10%)</strong></summary>

- This README covers what the project is, why it exists, how it's architected, how to run it locally, how to deploy it, and what technical decisions were made.
- [`README.Docker.md`](README.Docker.md) covers containerization details.
- Inline code comments explain non-obvious decisions (`src/sidecar.ts` routing, the dead-code warning in `src/api/analyze.ts` explaining the pivot to the sidecar architecture).
- `nosana-job.json` ships ready to edit and redeploy.

</details>

## Project status

Scout was built for the [Nosana x ElizaOS Builders Challenge](https://earn.superteam.fun/listing/nosana-builders-elizaos-challenge) (March–April 2026). The live deployment is kept running during the judging window. The code is open and MIT-licensed — clone, fork, rebrand, extend.

Roadmap ideas (not in scope for the bounty):

- Historical tracking per token (graph risk score over time)
- Alert mode (webhook when a watched token crosses a risk threshold)
- Plugin ecosystem for custom red-flag rules (user-defined heuristics)
- Twitter / Discord bot wrappers around the same analyzer core

## Credits

- **Nosana** — decentralized GPU network, inference endpoints, and the bounty that funded this build
- **ElizaOS** — the agent framework that makes self-hosted agents buildable in a weekend
- **Helius** — on-chain data for Solana
- **DexScreener** — market data across Solana DEXes

## License

MIT — see [LICENSE](LICENSE). Fork it, modify it, deploy it, ship it.