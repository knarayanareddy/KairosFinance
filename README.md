# BUNQSY Finance

**An always-on background financial guardian for bunq users.**

Built for bunq Hackathon 7.0. BUNQSY does not wait for prompts — it monitors your accounts in real time, detects risk and behavioural patterns, consolidates knowledge while you sleep, and intervenes proactively before damage is done.

---

## Architecture

BUNQSY is a TypeScript monorepo managed with Turborepo:

```
packages/
  daemon/     — Fastify backend, bunq API, heartbeat, oracle, AI reasoning
  frontend/   — React + Vite dashboard
  shared/     — Zod schemas and TypeScript types shared across both packages
scripts/      — Validation, seeding, and demo launch utilities
```

### Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+, Fastify 5, TypeScript ESM |
| Database | SQLite (better-sqlite3, WAL mode), sqlite-vec for embeddings |
| Frontend | React 18, Vite 5, Recharts |
| bunq API | REST v1, RSA-2048 + SHA-256 request signing |
| AI reasoning | Anthropic Claude (Haiku 4.5 for oracle/narration, Sonnet for receipts) |
| Voice | ElevenLabs scribe_v1 (STT), eleven_turbo_v2_5 (TTS) |
| Embeddings | Ollama + nomic-embed-text (local, optional) |
| Real-time | WebSocket (`@fastify/websocket`) |

---

## Core Features

### Heartbeat Loop
The daemon runs a configurable tick (default 60 s, env `HEARTBEAT_INTERVAL_MS`) that:
1. Fetches all monetary accounts and syncs new transactions into SQLite
2. Builds `AccountSummary` records for every active account (Phase 14 multi-account intelligence)
3. Computes the **BUNQSY Score** (0–100) from four weighted components
4. Runs the **Risk Oracle** — six concurrent sub-agents each casting a typed vote
5. Dispatches an **Intervention** if the oracle says to act
6. Appends an append-only tick log and score log entry

### BUNQSY Score
Weighted composite score updated every heartbeat:

| Component | Weight | What it measures |
|---|---|---|
| Balance | 35% | Runway months vs estimated monthly spend (or salary ratio if configured) |
| Velocity | 25% | Today's spend vs 30-day average daily spend |
| Goals | 25% | Progress toward savings goals, time-weighted against target dates |
| Upcoming | 15% | Proximity to rent due date; recurring subscription coverage ratio |

Score weights are tunable via environment variables (`SCORE_WEIGHT_*`).

### Risk Oracle — Six Sub-Agents
All agents run concurrently. Each has a hard budget of 800 input + 200 output tokens. They cannot call each other and cannot execute writes. They return a typed `OracleVote`.

| Agent | What it detects |
|---|---|
| `balance-sentinel` | Low balance, overdraft risk, joint-account unusual spend |
| `velocity-analyzer` | Intraday spend spikes (1.5× – 4× historical average) |
| `fraud-shadow` | Anomalous transaction patterns — the only LLM-calling agent |
| `subscription-watcher` | New recurring charges, subscription cost creep, salary ratio |
| `rent-proximity-guard` | Upcoming rent deadline vs current balance |
| `pattern-matcher` | Vector (Ollama) or SQL matching against learned user patterns |

Votes are aggregated by `oracle/aggregator.ts`. An intervention fires when `shouldIntervene = true` on any vote AND the aggregate risk score ≥ 50.

### Intervention Engine
When the oracle triggers, the engine:
1. Checks for an already-active intervention (no stacking)
2. Routes to the correct handler based on `interventionType`
3. Generates a plain-English narration via Claude Haiku (constitutional requirement)
4. Persists an append-only intervention row (status = `SHOWN`)
5. Emits to all connected WebSocket clients

Intervention types and their handlers:

| Type | Handler | Action |
|---|---|---|
| `BALANCE_LOW`, `BALANCE_CRITICAL`, `RENT_WARNING`, `RENT_CRITICAL` | `low-balance` | Informational card; no plan |
| `VELOCITY_SPIKE`, `PATTERN_MATCH` | `impulse-buy` | Voice or card modality based on risk score |
| `FRAUD`, `FREEZE_CARD` | `fraud-block` | Searches for a cancellable draft payment; creates `CANCEL_DRAFT` execution plan |
| `SALARY` | `salary-received` | Delegates to the Savings Jar Agent; creates multi-account transfer plan |
| `SUBSCRIPTION` | `subscription-duplicate` | Recurring charge review card |
| `DREAM` | `dream-suggestion` | Surfaces insights from the most recent Dream session |

### Single Write Gateway
**`packages/daemon/src/bunq/execute.ts` is the only file permitted to make POST/PUT/DELETE requests to the bunq API.** All write operations must pass through `createExecutionPlan → confirmPlan → executePlan`. This is enforced architecturally — every other module only reads.

Write operations require explicit user confirmation (UI tap or voice "yes") before `executePlan` is called.

### Dream Mode
Runs nightly at 02:00 in the user's timezone (configurable). Executes in a **forked child process** with a 10-minute kill timeout. The worker:
- Analyses transaction history for repeatable patterns
- Updates pattern confidence scores
- Generates a DNA card ("financial personality snapshot")
- Produces three actionable suggestions
- Is constitutionally isolated — cannot import `execute.ts`

### Voice Interface
- **STT**: ElevenLabs `scribe_v1` — accepts audio upload via `POST /api/voice`
- **NLU**: Claude Haiku converts transcript to a typed `ExecutionPlan`
- **TTS**: ElevenLabs `eleven_turbo_v2_5` via `POST /api/voice/speak`
- Voice ID is configurable via `ELEVENLABS_VOICE_ID` (default: Sarah)

### Receipt Scanner
`POST /api/receipt` accepts a photo upload. Claude 3.5 Sonnet extracts line items, a verifier checks totals within ±2%, and a categorizer matches the receipt to a stored transaction and generates a spending insight.

### 30-Day Forecast
`GET /api/forecast` generates a day-by-day balance projection for the next 30 days. Results are cached for 6 hours. The engine considers salary, rent, recurring subscriptions, and estimated impulse spending derived from pattern confidence scores.

### Multi-Account Intelligence (Phase 14)
Every heartbeat builds an `AccountSummary` for each active account:
- **Classification**: `primary` | `savings` | `joint` | `other`
- **Recent tx count**: 7-day window from local cache
- **Unusual spend flag**: joint accounts — outflow > €200 in 24 h
- **Goal linkage**: savings accounts linked to a goal show progress 0–1

Exposed via `GET /api/accounts` and rendered live in the frontend dashboard (refreshes every 30 s).

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/score` | Latest BUNQSY score with component breakdown |
| `GET` | `/api/accounts` | Multi-account summaries (Phase 14) |
| `GET` | `/api/interventions` | Recent intervention history (last 20) |
| `POST` | `/api/confirm/:planId` | Confirm + execute, or allow (cancel) a plan |
| `POST` | `/api/dismiss/:interventionId` | Dismiss an active intervention |
| `GET` | `/api/forecast` | 30-day balance forecast (6 h cache) |
| `POST` | `/api/voice` | Upload audio → transcribe → plan |
| `POST` | `/api/voice/speak` | Text → ElevenLabs TTS audio |
| `POST` | `/api/receipt` | Upload receipt image → extract + categorise |
| `POST` | `/api/dream/trigger` | Manually trigger Dream Mode |
| `GET` | `/api/dream/latest` | Latest completed Dream session |
| `POST` | `/api/webhook` | bunq event webhook receiver |
| `POST` | `/api/demo/reset` | Wipe and re-seed demo data |
| `POST` | `/api/demo/salary` | Simulate salary-in transaction |
| `POST` | `/api/demo/fraud` | Simulate fraud transaction |
| `WS` | `/ws` | Real-time event stream (`score_update`, `intervention`, `oracle_vote`, `tick`) |

---

## Database Schema

SQLite with WAL mode. 11 tables, all append-only where noted.

| Table | Purpose |
|---|---|
| `sessions` | bunq session tokens and RSA key pairs |
| `transactions` | Cached bunq payments (upsert on sync) |
| `patterns` | Learned behavioural patterns with confidence scores |
| `user_profile` | Singleton row — name, salary, rent, timezone, voice settings |
| `goals` | Savings goals with target amounts, dates, and jar account links |
| `interventions` | Append-only intervention history |
| `execution_plans` | Append-only write plans (PENDING → CONFIRMED → EXECUTED) |
| `execution_step_results` | Append-only per-step bunq API results |
| `tick_log` | Append-only heartbeat tick history |
| `score_log` | Append-only BUNQSY score history with component breakdown |
| `forecast_cache` | Single mutable row — current 30-day forecast |
| `pattern_embeddings` | sqlite-vec virtual table for semantic pattern matching (optional) |

---

## Getting Started

### Prerequisites
- Node.js 20+
- A bunq sandbox API key (free at [bunq.com/en/developer](https://www.bunq.com/en/developer))
- An Anthropic API key
- An ElevenLabs API key (for voice features)
- Ollama running locally (optional — for vector-based pattern matching)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd KairosFinance
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in BUNQ_API_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY

# 3. Validate bunq sandbox connection (Phase 0 gate)
npx tsx scripts/validate-phase-0.ts

# 4. Launch everything
bash scripts/start-demo.sh
```

The start script:
- Validates `.env`
- Kills stale processes on ports 3001 / 5173
- Starts the daemon and polls `/api/score` until it responds
- Starts the Vite frontend
- Opens the dashboard at `http://localhost:5173`

### Manual Start

```bash
# Terminal 1 — daemon
cd packages/daemon
npm run dev

# Terminal 2 — frontend
cd packages/frontend
npm run dev
```

### Pre-Demo Checklist

```bash
npx tsx scripts/checklist.ts
```

Checks environment variables, critical files, SQLite tables, RSA signing round-trip, live daemon health, and script inventory. Exits 0 if all pass.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BUNQ_ENV` | Yes | `sandbox` | `sandbox` or `production` |
| `BUNQ_API_KEY` | Yes | — | bunq sandbox or production API key |
| `BUNQ_SANDBOX_URL` | Yes | — | `https://public-api.sandbox.bunq.com/v1` |
| `BUNQ_PRODUCTION_URL` | No | — | `https://api.bunq.com/v1` |
| `BUNQ_DEVICE_DESCRIPTION` | No | `KairosFinance-Dev` | Device label in bunq |
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `ELEVENLABS_API_KEY` | Yes* | — | Required for voice features |
| `ELEVENLABS_VOICE_ID` | No | Sarah | Override TTS voice |
| `DB_PATH` | Yes | `./bunqsy.db` | SQLite database path |
| `PORT` | Yes | `3001` | Daemon HTTP/WS port |
| `HEARTBEAT_INTERVAL_MS` | No | `60000` | Tick interval (ms) |
| `OLLAMA_URL` | No | `http://localhost:11434` | Ollama base URL for embeddings |
| `OLLAMA_EMBED_MODEL` | No | `nomic-embed-text` | Ollama model for pattern embedding |
| `WEBHOOK_PUBLIC_URL` | No | — | Public URL for bunq webhook registration |
| `SCORE_WEIGHT_BALANCE` | No | `0.35` | Balance component weight |
| `SCORE_WEIGHT_VELOCITY` | No | `0.25` | Velocity component weight |
| `SCORE_WEIGHT_GOALS` | No | `0.25` | Goals component weight |
| `SCORE_WEIGHT_UPCOMING` | No | `0.15` | Upcoming obligations weight |

---

## Scripts

| Script | Command | Purpose |
|---|---|---|
| Start demo | `bash scripts/start-demo.sh` | One-command launch (daemon + frontend) |
| Pre-demo check | `npx tsx scripts/checklist.ts` | Validate everything before presenting |
| Phase 0 gate | `npx tsx scripts/validate-phase-0.ts` | Confirm bunq sandbox session is live |
| Signing test | `npx tsx scripts/test-signing.ts` | RSA sign + install step only |
| Generate key | `npx tsx scripts/generate-sandbox-key.ts` | Generate a new bunq sandbox API key |
| Reset demo | `npx tsx scripts/reset-demo.ts` | Wipe database for a clean demo |
| Seed demo | `npx tsx scripts/seed-demo.ts` | Seed realistic transaction history |

---

## Frontend Dashboard

The React dashboard at `http://localhost:5173` displays:

- **BUNQSY Score ring** — live-updating score with component breakdown bars and trend indicator
- **Account tiles** — primary, savings, and goal accounts with progress bars
- **Quick action buttons** — Send, Receive, New (circular, branded)
- **Oracle Voting Panel** — live sub-agent vote stream with rationale and confidence bars
- **All Accounts panel** — Phase 14 live multi-account view (classification badges, unusual spend flags, goal progress)
- **30-Day Forecast chart** — balance projection with event markers
- **Spending This Month** — staggered category bars
- **Recent Transactions** — live from daemon cache
- **Detected Patterns** — confidence bars for learned behaviours
- **InterventionCard** — glassmorphism overlay with severity colour coding and confirm/dismiss actions
- **FraudBlock overlay** — full-screen modal for FRAUD / FREEZE_CARD interventions
- **VoiceOrb** — microphone capture → STT → plan execution
- **ReceiptScanner** — camera/file upload → AI extraction → transaction matching
- **Dream Mode trigger** — manual activation + briefing modal

All API calls proxy through Vite to `localhost:3001`. WebSocket connects to `/ws` for real-time score, intervention, and oracle vote events.

---

## Constitutional Rules

These rules are enforced architecturally and cannot be overridden:

1. **Plan-before-act** — No bunq write without a confirmed `ExecutionPlan`
2. **Single write gateway** — Only `execute.ts` makes POST/PUT/DELETE to bunq
3. **Bounded sub-agents** — 800 input + 200 output token hard budget per oracle agent
4. **Append-only logs** — `tick_log`, `score_log`, `interventions`, `execution_plans` are INSERT-only
5. **Strict TypeScript** — No `any`. All external data validated with Zod before use
6. **Worker isolation** — Dream Mode worker runs in a forked child process with a 10-minute kill timeout; it cannot import `execute.ts`
7. **Explainability** — Every intervention card includes a plain-English Claude narration

---

## Project Structure

```
packages/daemon/src/
  bunq/           auth, client, execute (write gateway), signing, webhook, accounts
  heartbeat/      loop, recall, bunqsy-score, tick-log
  oracle/         index (factory), aggregator, agents/
  intervention/   engine, explainer, handlers/, pattern-promotion
  memory/         db, schema.sql, transactions, profile, interventions, patterns, vector
  routes/         api, ws, voice, receipt, dream, forecast, demo
  voice/          stt, tts, planner
  receipt/        extractor, verifier, categorizer
  forecast/       engine
  dream/          trigger, worker, scheduler, dna
  jars/           agent
  state.ts        in-memory account summary cache (written per heartbeat tick)
  index.ts        boot, session management, Fastify server

packages/frontend/src/
  App.tsx
  components/     BunqsyScore, InterventionCard, OracleVotingPanel, FraudBlock,
                  ForecastChart, DreamBriefing, ReceiptScanner, VoiceOrb
  hooks/          useWebSocket, useLocalSim, useForecast

packages/shared/src/types/
  bunq.ts         API response schemas (Zod) + TaggedMonetaryAccount, AccountSummary
  memory.ts       DB row types
  oracle.ts       OracleVote, OracleVerdict
  plan.ts         ExecutionPlan, ExecutionStep
  ws.ts           WSMessage discriminated union
  forecast.ts     ForecastPoint
  receipt.ts      ReceiptData
```

---

## bunq Sandbox

The sandbox API is fully integrated:

- **Authentication**: 3-step protocol — installation (RSA key exchange) → device-server registration → session creation
- **Session persistence**: Active sessions stored in SQLite and restored on restart (5-minute expiry buffer)
- **Request signing**: Every API call signed with RSA-2048 + SHA-256 per bunq spec
- **BUNQ_ENV**: All endpoint selection driven by this variable — no hardcoded environment assumptions
- **Validated**: Phase 0 gate passes against `https://public-api.sandbox.bunq.com/v1`

To switch to production: set `BUNQ_ENV=production` and provide a production `BUNQ_API_KEY`.

---

*bunq Hackathon 7.0 — BUNQSY Finance*
