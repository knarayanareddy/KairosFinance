# Spec compliance matrix (audit grid) for BUNQSY Finance v2.0

This is a checklist-style audit matrix enumerating the **files, functions, types, routes, and WS messages**
explicitly mentioned in:

- **[CBS]** `completebuildspecificationnew.md`
- **[PREFIX]** `prefixinstructionsnew.md`

When the docs reference a type/module but do not define its exact fields, this matrix marks it as
**“Referenced; fields not specified here”** rather than guessing.

---

## Legend (provenance tags)

- **[CBS]** = `completebuildspecificationnew.md`
- **[PREFIX]** = `prefixinstructionsnew.md`
- **(Inference)** = recommended implementation detail, **not** explicitly mandated

---

# A) Global “laws” (apply to every file)

| Rule / invariant | What it means in code | Source |
|---|---|---|
| Phase order is mandatory | Don’t scaffold later phases before earlier phases complete; Phase 0 gate blocks everything else | [CBS], [PREFIX] |
| Phase 0 signing gate | `scripts/test-signing.ts` must print **"✅ PHASE 0 GATE PASSED"** and exit 0 before Phase 1+ | [CBS], [PREFIX] |
| Plan-before-act | No bunq write without an `ExecutionPlan`, narration, and explicit user confirmation | [CBS], [PREFIX] |
| Single write gateway | Only `packages/daemon/src/bunq/execute.ts` may do bunq POST/PUT/DELETE | [CBS], [PREFIX] |
| Worker isolation (Dream Mode) | Dream worker is forked; must not import `execute.ts` or make bunq writes; parent kills after 10 minutes | [CBS], [PREFIX] |
| Bounded sub-agents | Each oracle sub-agent has token budget; **only fraud-shadow** calls Claude and only when signal score ≥ 3 | [CBS], [PREFIX] |
| Append-only logs (intent) | Tick log + intervention log are treated as history; inserts preferred | [CBS] |
| Strict TS + Zod validation | No `any`; validate bunq responses + Claude outputs + WS envelopes with Zod | [CBS], [PREFIX] |
| Environment-aware webhook security | Sandbox may bypass IP filtering; Production enforces bunq CIDR `185.40.108.0/22` | [CBS] |
| Explainability | Interventions/verdicts/dream briefing require plain-English narration | [CBS], [PREFIX] |
| Import boundary on `execute.ts` | Never import `execute.ts` except: `routes/confirm.ts`, `voice/executor.ts`, `intervention/handlers/*.ts` | [PREFIX] |

---

# B) Repo-level compliance map (files mentioned)

> Note: Some paths are “target architecture” referenced by the spec tree; they may not exist yet in your repo.

## B1) Root + shared package (cross-cutting)

| Artifact | Owner phase | Purpose | Inputs → Outputs | Non-negotiables | Failure modes to surface |
|---|---:|---|---|---|---|
| `CLAUDE.md` | Global | Constitutional law | N/A | Must match spec rules | Drift → agents violate constraints |
| `.env.example` | Global | Canonical env vars | env → runtime behavior | Must include bunq env, ports, model keys, weights | Missing vars → clear config errors |
| `completebuildspecificationnew.md` | Global | Single source of truth | N/A | Overrides prompts + prefix | Misread → wrong architecture |
| `prefixinstructionsnew.md` | Global | Session scope + gates | N/A | Blocks touching out-of-scope files per session | Scope creep → integration breaks |
| `packages/shared/src/types/bunq.ts` | 1 | bunq Zod + TS shapes (referenced) | bunq JSON → typed objects | Validate bunq responses here | Zod mismatch → contract break |
| `packages/shared/src/types/events.ts` | 1–3 | Internal event bus types | events → typed events | Keep daemon/frontend separated | Event mismatch → runtime gaps |
| `packages/shared/src/types/memory.ts` | 2 | DB row types | sqlite rows → typed objects | Must align with `schema.sql` | Schema drift → subtle bugs |
| `packages/shared/src/types/oracle.ts` | 4 | Oracle vote/verdict types | state → votes/verdict | Must match UI ordering/labels | Missing agent names breaks UI |
| `packages/shared/src/types/plan.ts` | 1 | ExecutionPlan types | planner/handlers → plan | Enforce plan-before-act lifecycle | Plan mismatch → unsafe execution |
| `packages/shared/src/types/ws.ts` | 3+ | WS envelope union | daemon emits → frontend reduces | Envelope `{type,payload}`; validate | Invalid message → UI must ignore |
| `packages/shared/src/index.ts` | Global | Shared exports | TS build graph | Avoid circular barrels | Circular deps break builds |

---

# C) Phase-by-phase compliance matrix

## Phase 0 — Signing gate (HARD GATE)

| Artifact | Required exports / behavior | Inputs → Outputs | Invariants | Failure modes |
|---|---|---|---|---|
| `packages/daemon/src/bunq/signing.ts` | `generateKeyPair()`, `signRequestBody(body, privateKeyPem)`, `verifyWebhookSignature(body, sig, bunqPublicKeyPem)` | body string → base64 signature; verify → boolean | Must follow CBS exact contract (uses `createSign('SHA256')`) | `verifyWebhookSignature` catches and returns `false` |
| `scripts/test-signing.ts` | Calls bunq sandbox `/installation` then `/device-server`; prints ✅ line on success | env + bunq sandbox → exit 0/1 | Must block Phase 1 if not ✅ | On non-200: print ❌ + status, exit 1 |

---

## Phase 1 — bunq integration layer

| File | Must contain | Inputs → Outputs | Invariants | Failure modes |
|---|---|---|---|---|
| `packages/daemon/src/bunq/auth.ts` | `BunqSession`; `createSession(apiKey)`; `refreshSessionIfNeeded(session)` | API key → BunqSession | Installation→device→session flow; persist/reload | Refresh near expiry; fail startup clearly if auth fails |
| `packages/daemon/src/bunq/client.ts` | `class BunqClient` with GET-only helpers (`getAccounts`, `getTransactions`, etc.) | session+path → validated data | **GET-only**; Zod-validate responses | Zod failure must surface “contract mismatch” |
| `packages/daemon/src/bunq/execute.ts` | `createExecutionPlan`, `confirmPlan`, `executePlan`, `cancelPlan` | CONFIRMED plan → bunq writes + step results | **ONLY** bunq write gateway | If not CONFIRMED: throw; record per-step errors |
| `packages/daemon/src/bunq/webhook.ts` | `validateWebhookRequest`, `parseWebhookEvent`, `isAllowedOrigin`, `registerWebhookUrl` | raw webhook → internal event | Sandbox bypass IP filter; prod CIDR; signature always | Reject invalid origin/signature; force immediate heartbeat tick |
| `packages/daemon/src/bunq/accounts.ts` | `getAllAccounts`, `getPrimaryAccount`, `getSavingsAccounts`, `getTotalBalance` | BunqClient → accounts/balances | Read-only | If bunq GET fails: bubble error |
| `packages/daemon/src/routes/webhook.ts` | `POST /api/webhook` | HTTP → event + force tick | Must validate signature | Invalid should return non-200 |
| `packages/daemon/src/routes/confirm.ts` | confirm/cancel/action endpoints | HTTP → plan status + execute | One of few allowed to call gateway | Never execute PENDING plan |
| `packages/daemon/src/routes/score.ts` | `GET /api/score` fallback | HTTP → latest score | Matches last BUNQSYScore | If not computed yet: return clear empty state (Inference) |
| `packages/daemon/src/routes/ws.ts` | WS upgrade handler at `/ws` | WS → stream | Must emit only validated WSMessage | Prevent bad payloads via Zod |
| `packages/daemon/src/index.ts` | daemon bootstrap | env → running daemon | init DB, session, plugins, routes, heartbeat | Fail fast on DB/auth init errors |

**Import constraint:** do not import `execute.ts` except allowed list. ([PREFIX])

---

## Phase 2 — SQLite data model + memory helpers

| Artifact | Must do | Invariants |
|---|---|---|
| `packages/daemon/src/memory/schema.sql` | Create tables: `sessions`, `transactions`, `patterns`, `pattern_embeddings` (vec0), `user_profile`, `goals`, `interventions`, `execution_plans`, `execution_step_results`, `tick_log`, `dream_sessions`, `score_log`, `forecast_cache` | Keep schema aligned with shared types |
| `packages/daemon/src/memory/db.ts` | singleton `getDb()`; WAL + FK ON; execute schema.sql | Must set `journal_mode=WAL` and `foreign_keys=ON` |
| `packages/daemon/src/memory/transactions.ts` | transaction cache helpers | Align with schema |
| `packages/daemon/src/memory/patterns.ts` | pattern CRUD + confidence updates | Validate JSON templates (Inference) |
| `packages/daemon/src/memory/profile.ts` | user profile + goals | Handle missing profile row |
| `packages/daemon/src/memory/interventions.ts` | intervention log helpers | Store votes JSON; preserve history |
| `packages/daemon/src/memory/vector.ts` | sqlite-vec embedding search | Fail loudly if sqlite-vec missing |

---

## Phase 3 — Heartbeat loop + BUNQSY Score

| Artifact | Must implement | Invariants |
|---|---|---|
| `packages/daemon/src/heartbeat/loop.ts` | tick every 30s; reason every 10 ticks or forced; don’t stack interventions | `TICK_INTERVAL_MS=30_000`, `REASON_INTERVAL_TICKS=10`, `activeInterventionId` guard |
| `packages/daemon/src/heartbeat/recall.ts` | `recall(client, db): Promise<RecalledState>` | Must produce minimal slice from CBS |
| `packages/daemon/src/heartbeat/bunqsy-score.ts` | compute score + components + trend | **Conflict note:** CBS trend compares to last 3 **tick_log** rows; PREFIX says **score_log**. Authority order implies follow CBS unless you update docs. |
| `packages/daemon/src/heartbeat/tick-log.ts` | append tick log writer | Insert-only behavior for history tables |
| `packages/shared/src/types/ws.ts` | WSMessage union includes PLAN_CREATED + FORECAST_READY | Must match CBS union |

---

## Phase 4 — Risk Oracle (6 agents) + streaming votes

| Artifact | Must implement | Invariants |
|---|---|---|
| `oracle/agents/balance-sentinel.ts` | deterministic vote | No LLM |
| `oracle/agents/velocity-analyzer.ts` | deterministic vote | No LLM |
| `oracle/agents/pattern-matcher.ts` | vec search → vote | No LLM |
| `oracle/agents/subscription-watcher.ts` | deterministic vote | No LLM |
| `oracle/agents/rent-proximity-guard.ts` | deterministic vote | No LLM |
| `oracle/agents/fraud-shadow.ts` | signal checklist; Claude only if score ≥ 3 | Only agent allowed to call Claude |
| `oracle/aggregator.ts` | weighted aggregation | weights: INTERVENE 2x, WARN 1x, CLEAR 0.3x |
| `oracle/index.ts` | run concurrently; emit ORACLE_VOTE as each resolves; emit verdict after all | **Do not batch** ORACLE_VOTE emission |

---

## Phase 5 — Intervention engine + explainability

| Artifact | Must implement | Invariants |
|---|---|---|
| `intervention/explainer.ts` | Claude narration generator | PREFIX: no hardcoded narration strings; must come from this function |
| `intervention/engine.ts` | select modality + dispatch handlers | Must coordinate with heartbeat `activeInterventionId` |
| `handlers/*` | low-balance, impulse-buy, salary-received, subscription-duplicate, fraud-block, dream-suggestion | Plan-before-act always |

---

## Phase 6 — Core frontend

| Artifact | Must implement | Invariants |
|---|---|---|
| `hooks/useWebSocket.ts` | WS connect + exponential backoff | PREFIX specifies backoff pattern |
| `hooks/useBUNQSYScore.ts` | reduce BUNQSY_SCORE into state | score only from WS |
| `components/BUNQSYScore.tsx` | animated score + bars + trend arrow | breakpoints: green>70, amber 40–70, red<40 |
| `components/OracleVotingPanel.tsx` | 6 fixed rows; animate on votes | no vote batching |
| `components/InterventionCard.tsx` | slide-up; narration + “Why” | confirm/cancel call daemon routes |
| `App.tsx` | compose dashboard | Tier-1 visible on load |

---

## Phase 7 — Voice pipeline

| Artifact | Must implement | Invariants |
|---|---|---|
| `voice/stt.ts` | whisper.cpp transcript | local-first STT |
| `voice/planner.ts` | Claude model `claude-opus-4-5`; max tokens 400; Zod parse ExecutionPlan | Throw exact error string on schema mismatch per PREFIX |
| `voice/executor.ts` | confirmPlan → executePlan | Never called from routes/voice.ts |
| `routes/voice.ts` | `POST /api/voice` multipart `"audio"` returns PENDING plan + emits PLAN_CREATED | Must not execute |

---

## Phase 8 — Receipt vision pipeline

| Artifact | Must implement | Invariants |
|---|---|---|
| `receipt/extractor.ts` | Claude Vision extraction | Zod parse ReceiptData |
| `receipt/verifier.ts` | ±2% sum check | spec tolerance |
| `receipt/categorizer.ts` | category + optional tx match | enrich transaction if matched |
| `routes/receipt.ts` | `POST /api/receipt` | temp file cleanup |

---

## Phase 9 — Dream Mode

| Artifact | Must implement | Invariants |
|---|---|---|
| `dream/scheduler.ts` | node-cron at 2am | scheduled + manual |
| `dream/trigger.ts` | fork worker; kill after 10 minutes | worker isolation |
| `dream/worker.ts` | consolidation logic; no bunq writes; no forbidden imports | communicate via `process.send` |
| `dream/dna.ts` | Claude model `claude-opus-4-5`; returns ONLY 4–6 word phrase | validate output |

---

## Phase 10 — Savings Jar Agent

| Artifact | Must implement | Invariants |
|---|---|---|
| `jars/agent.ts` | detect salary; propose split; create PENDING plan; emit PLAN_CREATED | Must not execute |

---

## Phase 11 — Forecast engine

| Artifact | Must implement | Invariants |
|---|---|---|
| `forecast/engine.ts` | deterministic 30-day forecast; cache 6h | explicitly “NOT ML” |
| `routes/forecast.ts` | `GET /api/forecast` (+ refresh) returns 30 points | cache invalidation rules |

---

## Phase 12 — FraudBlock UI + allow/block

| Artifact | Must implement | Invariants |
|---|---|---|
| `components/FraudBlock.tsx` | full-screen; 2-second hold-to-confirm | allow/block routes |
| `routes/confirm.ts` | `POST /api/confirm/:planId/action` | bunq writes only via execute gateway |

---

## Phase 13 — Pattern promotion

| Artifact | Must implement | Invariants |
|---|---|---|
| `patterns/promotion.ts` | Claude “reusable?”; insert confidence 0.4; embedding | non-blocking |
| `intervention/engine.ts` | invoke promotion after CONFIRMED | don’t block main flow |

---

## Phase 14 — Multi-account intelligence

| Artifact | Must implement | Invariants |
|---|---|---|
| `bunq/accounts.ts` (extended) | joint accounts + summaries | classification consistent |
| `heartbeat/recall.ts` (extended) | include allAccounts summary | score/oracle must adapt |

---

## Phase 15 — Demo polish + scripts + sandbox-only reset route

| Artifact | Must implement | Invariants |
|---|---|---|
| `scripts/reset-demo.ts` | reset state < 5s and reseed | prints required ✅ line |
| `scripts/seed-demo.ts` | seed coherent demo data | supports demo beats |
| `scripts/start-demo.sh` | one-command startup | includes tunnel + daemons |
| `scripts/checklist.ts` | automated demo readiness checks | prints “✅ All N checks passed” |
| `POST /api/demo/reset` route | calls reset-demo logic | **sandbox-only** (403 in production) |

---

# D) Canonical API + WebSocket contract

## D1) REST routes

- `POST /api/webhook`
- `POST /api/voice`
- `POST /api/receipt`
- `POST /api/dream/trigger`
- `GET /api/dream/latest`
- `GET /api/forecast` (optional `?refresh=true`)
- `GET /api/score`
- `POST /api/confirm/:planId`
- `DELETE /api/confirm/:planId`
- `POST /api/confirm/:planId/action`
- `POST /api/demo/reset` (sandbox-only)

## D2) WebSocket message types

- `BUNQSY_SCORE`
- `ORACLE_VOTE`
- `ORACLE_VERDICT`
- `INTERVENTION`
- `DREAM_UPDATE`
- `DREAM_COMPLETE`
- `PLAN_CREATED`
- `FORECAST_READY`

---

# E) Session gates (Prefix blocks)

| Session | Allowed phases | Definition-of-done anchor |
|---|---:|---|
| A | 0–6 | signing gate passes; WS tick within ~35s; Tier-1 UI visible; `tsc --noEmit` clean |
| B | 7–11 | voice returns PENDING plan; receipt works; dream completes; forecast 30 points; `tsc` clean |
| C | 12–15 | FraudBlock hold works; reset/checklist/start scripts work; full 3-minute demo runs clean |
