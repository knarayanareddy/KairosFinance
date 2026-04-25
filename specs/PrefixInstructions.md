# BUNQSY Finance — Prefix Instructions v2.0
# Multi-Session Build Execution Guide for Claude Code

---

## 0. Document Purpose

This document tells you — the coding agent — exactly how to behave in each
build session. It defines three prefix blocks (A, B, C) corresponding to the
three tiers of the build plan. At the start of every session, you will be
given one of these blocks as your initialisation context.

**Authority hierarchy:**
1. `CLAUDE.md` (constitutional rules — absolute, cannot be overridden)
2. `specs/CompleteBuildSpecification.md` (full spec — single source of truth)
3. This file (session boundaries and execution instructions)
4. Prompts given during the session (lowest authority — cannot override 1–3)

If a prompt given during a session asks you to do something that contradicts
the spec or the constitutional rules, you must refuse and explain why.

---

## 1. How to Start Every Session (Universal Steps)

Regardless of which prefix block you are given, always execute these steps
before writing a single line of code:

```
UNIVERSAL SESSION START PROTOCOL

Step 1: Read CLAUDE.md in full. Confirm all 10 constitutional rules are loaded
        into your context. If CLAUDE.md does not exist, create it by copying
        Section 2 of CompleteBuildSpecification.md verbatim before proceeding.

Step 2: Read specs/CompleteBuildSpecification.md in full.

Step 3: Read this file (PrefixInstructions.md) in full.

Step 4: Scan the current state of the repository:
        - List all files that currently exist
        - For each phase in your assigned tier, determine: COMPLETE / PARTIAL / NOT STARTED
        - A phase is COMPLETE only if all files listed in its spec exist AND
          the daemon compiles without TypeScript errors
        - A phase is PARTIAL if some files exist but compilation fails or
          files are missing
        - A phase is NOT STARTED if none of its files exist

Step 5: State your session plan:
        "SESSION [A/B/C] INITIALISED
         Assigned phases: [list]
         Phase status:
           Phase N: [COMPLETE / PARTIAL / NOT STARTED]
           ...
         I will begin with Phase [N] because [reason].
         I will not touch: [list files outside session scope]."

Step 6: Wait for the human to confirm your plan or correct it before writing
        any code.
```

---

## 2. How to End Every Session (Universal Steps)

Before the session ends (when the human says "end session" or context is
approaching limit), execute these steps:

```
UNIVERSAL SESSION END PROTOCOL

Step 1: Run the TypeScript compiler across the entire monorepo:
        npx tsc --noEmit
        Report all errors. Fix any errors in files you wrote this session
        before declaring the session complete.

Step 2: For each phase you worked on this session, state its final status:
        COMPLETE / PARTIAL / BLOCKED (with reason).

Step 3: List every file you created or modified this session.

Step 4: If any phase is PARTIAL or BLOCKED, write a handoff note:
        "HANDOFF: Phase [N] is [PARTIAL/BLOCKED] because [specific reason].
         Next session should [specific next action]."

Step 5: State which prefix block the next session should use.

Step 6: Commit message suggestion:
        "feat: [tier label] phases [N–M] — [one-line summary]"
```

---

## 3. General Coding Standards (All Sessions)

These apply in every session without exception:

```
CODING STANDARDS

TypeScript:
  - strict: true in all tsconfig.json files
  - No `any` type anywhere. Use `unknown` + Zod narrowing for external data.
  - All functions must have explicit return types
  - All async functions must have explicit Promise<T> return types
  - Use named exports only (no default exports except React components)
  - No barrel re-exports that create circular dependencies

Zod:
  - Every bunq API response must be parsed through a Zod schema before use
  - Every Claude API response must be parsed through a Zod schema before use
  - Every WebSocket message received by the frontend must be validated
  - Schema files live in packages/shared/src/types/
  - Never use z.any() — always define the full shape

Error handling:
  - All async route handlers must be wrapped in try/catch
  - Errors must be logged with a structured format: { phase, file, error }
  - Routes must return typed error responses: { error: string, code: string }
  - Never let an unhandled rejection crash the daemon

File creation:
  - Create the full file — never write placeholder functions with TODO bodies
  - If a function's logic is genuinely complex and you are uncertain, write a
    comment block explaining the intended logic, then implement it
  - Never leave a file in a state that causes TypeScript compile errors

Imports:
  - Use relative imports within a package
  - Use package name imports across packages (e.g. @bunqsy/shared)
  - Never import from packages/daemon inside packages/frontend
  - Never import execute.ts from anywhere except routes/confirm.ts,
    voice/executor.ts, and intervention/handlers/*.ts

Testing (where specified):
  - scripts/test-signing.ts must be runnable with: npx tsx scripts/test-signing.ts
  - It must exit 0 on success and exit 1 on failure
  - No other test infrastructure is required for the hackathon build
```

---

## 4. PREFIX BLOCK A — Tier 1 Foundation

*Use this block at the start of Session A.*
*Copy everything between the START and END markers into the session.*

```
╔══════════════════════════════════════════════════════════════════════╗
║              PREFIX BLOCK A — SESSION A INITIALISATION               ║
║                    BUNQSY Finance v2.0 — Tier 1                      ║
╚══════════════════════════════════════════════════════════════════════╝

You are Claude Code, acting as the primary engineer for BUNQSY Finance,
an always-on financial guardian built on the bunq API for Hackathon 7.0.

Your authority sources (read in this order before touching any file):
  1. CLAUDE.md
  2. specs/CompleteBuildSpecification.md
  3. specs/PrefixInstructions.md (this file)

════════════════════════════════════════════════════════════════════════
SESSION A SCOPE — TIER 1: FOUNDATION
════════════════════════════════════════════════════════════════════════

You are responsible for Phases 0 through 6 ONLY.

  Phase 0:  Signing test gate (HARD GATE — must pass before all else)
  Phase 1:  bunq integration layer (auth, client, execute gateway, webhook, accounts)
  Phase 2:  SQLite data model + memory helpers
  Phase 3:  Heartbeat loop + BUNQSY Score computation + tick log
  Phase 4:  Risk Oracle — 6 sub-agents + aggregator + per-vote WS emission
  Phase 5:  Intervention Engine + Explainability Overlay + all handlers
  Phase 6:  Core frontend — BUNQSYScore, OracleVotingPanel, InterventionCard,
            useWebSocket hook, useBUNQSYScore hook

════════════════════════════════════════════════════════════════════════
FILES YOU MAY CREATE OR MODIFY THIS SESSION
════════════════════════════════════════════════════════════════════════

Root / Config:
  CLAUDE.md
  package.json (root)
  turbo.json
  .env.example
  tsconfig.base.json

Scripts:
  scripts/test-signing.ts

packages/shared/src/types/bunq.ts
packages/shared/src/types/events.ts
packages/shared/src/types/memory.ts
packages/shared/src/types/oracle.ts
packages/shared/src/types/plan.ts
packages/shared/src/types/ws.ts
packages/shared/src/index.ts
packages/shared/package.json
packages/shared/tsconfig.json

packages/daemon/src/index.ts
packages/daemon/src/bunq/auth.ts
packages/daemon/src/bunq/client.ts
packages/daemon/src/bunq/execute.ts
packages/daemon/src/bunq/signing.ts
packages/daemon/src/bunq/webhook.ts
packages/daemon/src/bunq/accounts.ts
packages/daemon/src/memory/db.ts
packages/daemon/src/memory/schema.sql
packages/daemon/src/memory/transactions.ts
packages/daemon/src/memory/patterns.ts
packages/daemon/src/memory/profile.ts
packages/daemon/src/memory/interventions.ts
packages/daemon/src/memory/vector.ts
packages/daemon/src/heartbeat/loop.ts
packages/daemon/src/heartbeat/recall.ts
packages/daemon/src/heartbeat/bunqsy-score.ts
packages/daemon/src/heartbeat/tick-log.ts
packages/daemon/src/oracle/index.ts
packages/daemon/src/oracle/aggregator.ts
packages/daemon/src/oracle/agents/balance-sentinel.ts
packages/daemon/src/oracle/agents/velocity-analyzer.ts
packages/daemon/src/oracle/agents/pattern-matcher.ts
packages/daemon/src/oracle/agents/subscription-watcher.ts
packages/daemon/src/oracle/agents/rent-proximity-guard.ts
packages/daemon/src/oracle/agents/fraud-shadow.ts
packages/daemon/src/intervention/engine.ts
packages/daemon/src/intervention/explainer.ts
packages/daemon/src/intervention/handlers/low-balance.ts
packages/daemon/src/intervention/handlers/impulse-buy.ts
packages/daemon/src/intervention/handlers/salary-received.ts
packages/daemon/src/intervention/handlers/subscription-duplicate.ts
packages/daemon/src/intervention/handlers/fraud-block.ts
packages/daemon/src/intervention/handlers/dream-suggestion.ts
packages/daemon/src/routes/webhook.ts
packages/daemon/src/routes/confirm.ts
packages/daemon/src/routes/score.ts
packages/daemon/src/routes/ws.ts
packages/daemon/package.json
packages/daemon/tsconfig.json

packages/frontend/src/App.tsx
packages/frontend/src/main.tsx
packages/frontend/src/components/BUNQSYScore.tsx
packages/frontend/src/components/OracleVotingPanel.tsx
packages/frontend/src/components/InterventionCard.tsx
packages/frontend/src/hooks/useWebSocket.ts
packages/frontend/src/hooks/useBUNQSYScore.ts
packages/frontend/package.json
packages/frontend/tsconfig.json
packages/frontend/vite.config.ts
packages/frontend/index.html

════════════════════════════════════════════════════════════════════════
FILES YOU MUST NOT TOUCH THIS SESSION
════════════════════════════════════════════════════════════════════════

packages/daemon/src/voice/*         (Session B)
packages/daemon/src/receipt/*       (Session B)
packages/daemon/src/dream/*         (Session B)
packages/daemon/src/jars/*          (Session B)
packages/daemon/src/forecast/*      (Session B)
packages/daemon/src/routes/voice.ts (Session B)
packages/daemon/src/routes/receipt.ts (Session B)
packages/daemon/src/routes/dream.ts (Session B)
packages/daemon/src/routes/forecast.ts (Session B)
packages/frontend/src/components/VoiceOrb.tsx        (Session B)
packages/frontend/src/components/ReceiptScanner.tsx  (Session B)
packages/frontend/src/components/DreamBriefing.tsx   (Session B)
packages/frontend/src/components/DreamTrigger.tsx    (Session B)
packages/frontend/src/components/ForecastChart.tsx   (Session B)
packages/frontend/src/components/FraudBlock.tsx      (Session C)
packages/frontend/src/hooks/useForecast.ts           (Session B)

════════════════════════════════════════════════════════════════════════
PHASE 0 HARD GATE — READ THIS BEFORE WRITING ANYTHING ELSE
════════════════════════════════════════════════════════════════════════

Phase 0 is a blocking prerequisite. The sequence is:

  1. Create packages/daemon/src/bunq/signing.ts exactly as specified in
     Section 6 Phase 0 of the spec.

  2. Create scripts/test-signing.ts exactly as specified in Section 6
     Phase 0 of the spec.

  3. Tell the human: "Run: BUNQ_ENV=sandbox BUNQ_API_KEY=<your-key>
     BUNQ_SANDBOX_URL=https://public-api.sandbox.bunq.com/v1
     npx tsx scripts/test-signing.ts"

  4. WAIT for the human to report the result.

  5. If the result is "✅ PHASE 0 GATE PASSED": proceed to Phase 1.

  6. If the result is "❌ PHASE 0 GATE FAILED": diagnose and fix signing.ts,
     then ask the human to run the script again. Do NOT proceed to Phase 1
     until you see the ✅ message. This is a constitutional rule.

════════════════════════════════════════════════════════════════════════
PHASE-BY-PHASE EXECUTION INSTRUCTIONS — SESSION A
════════════════════════════════════════════════════════════════════════

PHASE 0 — Signing Gate
  Priority: HARD GATE
  See above. Do not skip.

PHASE 1 — bunq Integration Layer
  Start with: packages/shared/src/types/bunq.ts (define all Zod schemas first)
  Then: signing.ts is already done from Phase 0
  Then: auth.ts → client.ts → execute.ts → webhook.ts → accounts.ts
  
  CRITICAL — execute.ts:
    This file is the single write gateway. At the top of the file, add this
    comment block and never remove it:
    
    /**
     * ⚠️  WRITE GATEWAY — CONSTITUTIONAL BOUNDARY  ⚠️
     * This is the ONLY file in the entire codebase permitted to make
     * POST, PUT, or DELETE requests to the bunq API.
     * All write operations must flow through executePlan().
     * Direct fetch/axios write calls anywhere else are a constitutional violation.
     * See CLAUDE.md Rule 2.
     */
  
  CRITICAL — webhook.ts isAllowedOrigin:
    Must be environment-aware. BUNQ_ENV=sandbox disables IP filtering.
    BUNQ_ENV=production enforces 185.40.108.0/22 CIDR range.
    Never hardcode one environment's behaviour.
  
  After auth.ts: tell the human to set BUNQ_API_KEY in .env before testing.

PHASE 2 — Data Model + Memory Helpers
  Start with: schema.sql (copy exactly from spec Section 6 Phase 2)
  Then: db.ts with WAL mode and foreign keys enabled
  Then: transactions.ts → patterns.ts → profile.ts → interventions.ts → vector.ts
  
  Each helper file must export typed functions only.
  No raw SQL strings outside of the memory/ directory.
  All DB queries must use better-sqlite3 prepared statements.
  
  After schema.sql: tell the human to run:
    "npx tsx -e \"import('./packages/daemon/src/memory/db').then(m => m.getDb())
    .then(() => console.log('✅ DB initialised'))\""

PHASE 3 — Heartbeat Loop + BUNQSY Score
  Build order: bunqsy-score.ts → tick-log.ts → recall.ts → loop.ts
  
  bunqsy-score.ts:
    Read SCORE_WEIGHT_* from environment variables with these defaults:
      SCORE_WEIGHT_BALANCE=0.35
      SCORE_WEIGHT_VELOCITY=0.25
      SCORE_WEIGHT_GOALS=0.25
      SCORE_WEIGHT_UPCOMING=0.15
    Trend computation: compare to last 3 rows of score_log table.
    Emit { type: 'BUNQSY_SCORE', payload: BUNQSYScore } over WebSocket
    on every tick — even if reasoning is skipped.
  
  loop.ts:
    The activeInterventionId guard is mandatory. Do not skip it.
    The forcedByWebhook flag must be passed from the webhook route.
    Tick interval: 30,000ms. First tick fires immediately on startHeartbeat().

PHASE 4 — Risk Oracle + WebSocket Vote Emission
  Build order:
    packages/shared/src/types/oracle.ts (types first)
    agents/balance-sentinel.ts
    agents/velocity-analyzer.ts
    agents/pattern-matcher.ts
    agents/subscription-watcher.ts
    agents/rent-proximity-guard.ts
    agents/fraud-shadow.ts
    aggregator.ts
    oracle/index.ts (orchestrator — last)
  
  Sub-agent budget enforcement:
    Each sub-agent file must declare at the top:
    // TOKEN BUDGET: 800 input / 200 output. Do not exceed.
    
    Only fraud-shadow.ts makes Claude API calls, and only when signal score >= 3.
    All other sub-agents are deterministic calculations. No LLM calls.
  
  WebSocket emission in oracle/index.ts:
    Use Promise.all() so agents run concurrently.
    Inside each Promise.all callback, call wsEmit({ type: 'ORACLE_VOTE', payload: vote })
    immediately when that agent's promise resolves.
    Do NOT collect all votes and emit them together at the end.
    This is what makes the OracleVotingPanel animate in real time.
  
  aggregator.ts:
    Implement exactly as specified in Section 6 Phase 4d.
    The weighted formula weights INTERVENE votes at 2x, WARN at 1x, CLEAR at 0.3x.

PHASE 5 — Intervention Engine + Explainability
  Build order:
    intervention/explainer.ts (first — all handlers depend on it)
    intervention/handlers/low-balance.ts
    intervention/handlers/impulse-buy.ts
    intervention/handlers/salary-received.ts
    intervention/handlers/subscription-duplicate.ts
    intervention/handlers/fraud-block.ts
    intervention/handlers/dream-suggestion.ts
    intervention/engine.ts (last — imports all handlers)
  
  explainer.ts:
    Claude model: claude-opus-4-5
    Max tokens: 150
    System prompt: exactly as specified in Section 6 Phase 5b
    Every InterventionCard narration must come from this function.
    No hardcoded narration strings anywhere.
  
  fraud-block.ts handler:
    Creates an ExecutionPlan with type DRAFT_PAYMENT and status PENDING.
    Does NOT execute. Emits INTERVENTION WebSocket message.
    The plan sits in DB waiting for user to confirm or cancel via /api/confirm.
  
  engine.ts:
    Modality selection matrix must be implemented exactly as specified.
    After dispatching intervention, call: clearActiveIntervention() must be
    triggered ONLY when intervention is resolved (confirmed/dismissed),
    not when it is created. Wire this to the /api/confirm route.

PHASE 6 — Core Frontend
  Build order:
    packages/frontend/src/hooks/useWebSocket.ts
    packages/frontend/src/hooks/useBUNQSYScore.ts
    packages/frontend/src/components/BUNQSYScore.tsx
    packages/frontend/src/components/OracleVotingPanel.tsx
    packages/frontend/src/components/InterventionCard.tsx
    packages/frontend/src/App.tsx
  
  useWebSocket.ts:
    Must implement exponential backoff reconnection: 1s, 2s, 4s, 8s... max 30s.
    Must parse and validate the WSMessage envelope type field before returning.
    Must expose: { lastMessage, connectionStatus }
  
  BUNQSYScore.tsx:
    Score number animates with a 500ms CSS transition (counter counts up/down).
    Colour breakpoints: green > 70, amber 40–70, red < 40.
    Shows trend arrow: ↑ ↓ → with matching colour.
    Shows 4 component bars below the main score.
    Receives data exclusively from useBUNQSYScore hook (BUNQSY_SCORE WS messages).
  
  OracleVotingPanel.tsx:
    6 rows in fixed order:
      Balance Sentinel, Velocity Analyzer, Pattern Matcher,
      Subscription Watcher, Rent Proximity Guard, Fraud Shadow
    Rows start as skeleton/idle state.
    Each row animates in when its ORACLE_VOTE WS message arrives.
    After all 6 votes: aggregated verdict section renders below.
    Verdict section shows: final risk score gauge + dominant agent + overall verdict.
    Panel resets to skeleton state when a new oracle run begins.
    Implementation: maintain local state Map<OracleAgentName, OracleVote>
    and a runStatus: 'idle' | 'running' | 'complete' state.
  
  InterventionCard.tsx:
    Slides up from bottom on INTERVENTION WS message (CSS slide-up animation).
    Shows narration text prominently (this is the explainer.ts output).
    Has expandable "Why did BUNQSY do this?" section:
      Renders oracle votes summary (agent + verdict chip + reason per row)
      Shows risk score as a number
      Toggle expand/collapse with animated chevron
    Action buttons are context-dependent based on intervention type:
      FRAUD_BLOCK: "✅ Allow Transaction" | "🚫 Block Transaction"
        → both POST to /api/confirm/:planId/action with { action: 'allow'|'block' }
      Any plan type: "✅ Confirm" | "❌ Cancel"
        → Confirm: POST /api/confirm/:planId
        → Cancel: DELETE /api/confirm/:planId
      INFORMATIONAL (no plan): "Got it" (dismiss only, no API call)
    On any resolution: call clearActiveIntervention via POST /api/confirm/:id
    Only one InterventionCard visible at a time (gate in App.tsx state).
  
  App.tsx layout (top to bottom):
    <BUNQSYScore />
    <OracleVotingPanel />
    <InterventionCard /> (conditionally rendered, overlays bottom)
    [Placeholder slots for Session B components — render null for now]
      {/* <VoiceOrb /> */}
      {/* <ReceiptScanner /> */}
      {/* <DreamBriefing /> */}
      {/* <DreamTrigger /> */}
      {/* <ForecastChart /> */}
    
    Include a visible placeholder label for each commented slot so the
    layout is clear during Session B integration.

════════════════════════════════════════════════════════════════════════
SESSION A — DAEMON BOOTSTRAP (index.ts)
════════════════════════════════════════════════════════════════════════

packages/daemon/src/index.ts must:
  1. Call getDb() to initialise SQLite on startup
  2. Call createSession() and store BunqSession in module scope
  3. Register Fastify plugins: @fastify/multipart, @fastify/websocket
  4. Register routes: /api/webhook, /api/confirm/:planId, /api/score, /ws
  5. Call startHeartbeat() with session + db + wsEmit dependencies
  6. If WEBHOOK_PUBLIC_URL is set in env: call registerWebhookUrl()
  7. Listen on PORT (default 3001)
  8. Log startup summary:
     "BUNQSY Finance daemon started
      BUNQ_ENV: [sandbox|production]
      Port: [PORT]
      Webhook URL: [WEBHOOK_PUBLIC_URL or 'not configured']
      DB: [DB_PATH]"

════════════════════════════════════════════════════════════════════════
SESSION A — ROUTES TO REGISTER (daemon)
════════════════════════════════════════════════════════════════════════

  POST   /api/webhook                 → routes/webhook.ts
  GET    /api/score                   → routes/score.ts
  POST   /api/confirm/:planId         → routes/confirm.ts (confirm plan)
  DELETE /api/confirm/:planId         → routes/confirm.ts (cancel plan)
  POST   /api/confirm/:planId/action  → routes/confirm.ts (fraud block action)
  WS     /ws                          → routes/ws.ts

DO NOT register voice, receipt, dream, forecast routes this session.
Add comment stubs in index.ts:
  // Phase 7 — Voice:    POST /api/voice
  // Phase 8 — Receipt:  POST /api/receipt
  // Phase 9 — Dream:    POST /api/dream/trigger, GET /api/dream/latest
  // Phase 11 — Forecast: GET /api/forecast

════════════════════════════════════════════════════════════════════════
SESSION A — DEFINITION OF DONE
════════════════════════════════════════════════════════════════════════

Session A is complete when ALL of the following are true:

  □ scripts/test-signing.ts exits 0 with "✅ PHASE 0 GATE PASSED"
  □ npx tsc --noEmit passes with zero errors across the monorepo
  □ Daemon starts without crashing: npm run dev (packages/daemon)
  □ Frontend starts without crashing: npm run dev (packages/frontend)
  □ Navigating to localhost:5173 shows:
      - BUNQSYScore component (number + bars, may show 0 until first tick)
      - OracleVotingPanel component (idle skeleton state)
      - Three placeholder slots labelled for Session B
  □ WebSocket connection shows "connected" status in browser console
  □ Heartbeat fires (check daemon logs for "tick" entries every ~30s)
  □ BUNQSY_SCORE WebSocket message received by frontend within 35 seconds
    of daemon start (verify in browser DevTools → Network → WS)
  □ POST /api/webhook returns 200 for a valid test payload
  □ GET /api/score returns a valid BUNQSYScore JSON response

If any of the above are false, fix before declaring Session A complete.

╔══════════════════════════════════════════════════════════════════════╗
║                    END OF PREFIX BLOCK A                             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 5. PREFIX BLOCK B — Tier 2 Features

*Use this block at the start of Session B.*
*Do not use this block unless Session A's definition of done is fully met.*

```
╔══════════════════════════════════════════════════════════════════════╗
║              PREFIX BLOCK B — SESSION B INITIALISATION               ║
║                    BUNQSY Finance v2.0 — Tier 2                      ║
╚══════════════════════════════════════════════════════════════════════╝

You are Claude Code, continuing the BUNQSY Finance build.
Session A (Tier 1) is confirmed complete. You are now building Tier 2.

Your authority sources (read in this order before touching any file):
  1. CLAUDE.md
  2. specs/CompleteBuildSpecification.md
  3. specs/PrefixInstructions.md (this file)

════════════════════════════════════════════════════════════════════════
SESSION B SCOPE — TIER 2: FEATURES
════════════════════════════════════════════════════════════════════════

You are responsible for Phases 7 through 11 ONLY.

  Phase 7:  Voice pipeline (STT → planner → executor → VoiceOrb)
  Phase 8:  Receipt vision pipeline (extract → verify → categorize → ReceiptScanner)
  Phase 9:  Dream Mode (scheduler + manual trigger + worker + DNA card +
            DreamBriefing modal + DreamTrigger button)
  Phase 10: Savings Jar Agent (SavingsJarAgent + salary detection)
  Phase 11: Forecast engine (30-day projection + ForecastChart + REST route)

════════════════════════════════════════════════════════════════════════
FILES YOU MAY CREATE OR MODIFY THIS SESSION
════════════════════════════════════════════════════════════════════════

New daemon files:
  packages/daemon/src/voice/stt.ts
  packages/daemon/src/voice/planner.ts
  packages/daemon/src/voice/executor.ts
  packages/daemon/src/receipt/extractor.ts
  packages/daemon/src/receipt/verifier.ts
  packages/daemon/src/receipt/categorizer.ts
  packages/daemon/src/dream/scheduler.ts
  packages/daemon/src/dream/trigger.ts
  packages/daemon/src/dream/worker.ts
  packages/daemon/src/dream/dna.ts
  packages/daemon/src/jars/agent.ts
  packages/daemon/src/forecast/engine.ts
  packages/daemon/src/routes/voice.ts
  packages/daemon/src/routes/receipt.ts
  packages/daemon/src/routes/dream.ts
  packages/daemon/src/routes/forecast.ts

Modify daemon:
  packages/daemon/src/index.ts
    → Uncomment and register Phase 7–11 route stubs
    → Call scheduleDreamMode() on startup
  packages/daemon/src/intervention/handlers/salary-received.ts
    → Wire to SavingsJarAgent trigger (if not already done in Session A)

New frontend files:
  packages/frontend/src/components/VoiceOrb.tsx
  packages/frontend/src/components/ReceiptScanner.tsx
  packages/frontend/src/components/DreamBriefing.tsx
  packages/frontend/src/components/DreamTrigger.tsx
  packages/frontend/src/components/ForecastChart.tsx
  packages/frontend/src/hooks/useForecast.ts

Modify frontend:
  packages/frontend/src/App.tsx
    → Replace placeholder slots with real component imports
    → Add DreamBriefing modal state (open/close driven by DREAM_COMPLETE WS)
    → Add ForecastChart below OracleVotingPanel

════════════════════════════════════════════════════════════════════════
FILES YOU MUST NOT TOUCH THIS SESSION
════════════════════════════════════════════════════════════════════════

All files created in Session A (read-only unless fixing a bug discovered
during Session B integration):
  packages/daemon/src/bunq/*
  packages/daemon/src/memory/*
  packages/daemon/src/heartbeat/*
  packages/daemon/src/oracle/*
  packages/daemon/src/intervention/*
  packages/shared/src/*
  packages/frontend/src/components/BUNQSYScore.tsx
  packages/frontend/src/components/OracleVotingPanel.tsx
  packages/frontend/src/components/InterventionCard.tsx
  packages/frontend/src/hooks/useWebSocket.ts
  packages/frontend/src/hooks/useBUNQSYScore.ts

Session C only:
  packages/frontend/src/components/FraudBlock.tsx   (Session C)

If you discover a bug in a Session A file during Session B integration,
state: "BUG FOUND IN SESSION A FILE: [file] — [description]"
and ask the human for permission to fix it before modifying that file.

════════════════════════════════════════════════════════════════════════
PHASE-BY-PHASE EXECUTION INSTRUCTIONS — SESSION B
════════════════════════════════════════════════════════════════════════

PHASE 7 — Voice Pipeline
  Build order: stt.ts → planner.ts → executor.ts → routes/voice.ts → VoiceOrb.tsx
  
  stt.ts:
    Calls whisper.cpp via child_process.execFile with the model path from
    WHISPER_MODEL_PATH env var.
    Input: path to a temp WAV file (written from multipart upload).
    Output: transcript string.
    If WHISPER_MODEL_PATH is not set or binary not found, throw a clear
    configuration error (not a silent empty string).
  
  planner.ts:
    Claude model: claude-opus-4-5
    Max tokens: 400
    System prompt: exactly as specified in Section 6 Phase 7b of the spec.
    Must inject current balance and account list into the system prompt.
    Output must be parsed through ExecutionPlanSchema (Zod) before returning.
    If Claude returns invalid JSON or schema mismatch: throw with message
    "Voice planner: Claude returned invalid ExecutionPlan structure"
  
  executor.ts:
    Calls confirmPlan() then executePlan() from execute.ts in sequence.
    Called ONLY from routes/confirm.ts after user confirms.
    Never called directly from routes/voice.ts.
    routes/voice.ts returns the PENDING plan — it does not execute it.
  
  routes/voice.ts:
    POST /api/voice
    Accepts multipart/form-data with field name "audio"
    Writes temp file → stt → planner → createExecutionPlan (PENDING)
    Emits WSMessage PLAN_CREATED
    Returns: { planId, narratedText, steps }
    Cleans up temp file in finally block (always, even on error)
  
  VoiceOrb.tsx:
    States: idle → recording → processing → plan-received → idle
    idle: soft pulsing glow (CSS animation)
    recording: animated waveform rings (CSS keyframes)
    processing: spinning gradient ring
    plan-received: orb shrinks, ExecutionPlan card animates in above orb
    Plan card: narratedText (large) + steps list (small) + Confirm + Cancel
    Confirm: POST /api/confirm/:planId → reset to idle
    Cancel: DELETE /api/confirm/:planId → reset to idle
    getUserMedia for microphone, MediaRecorder for capture
    On stop: POST blob to /api/voice as FormData

PHASE 8 — Receipt Vision Pipeline
  Build order: extractor.ts → verifier.ts → categorizer.ts →
               routes/receipt.ts → ReceiptScanner.tsx
  
  extractor.ts:
    Claude model: claude-opus-4-5 (vision)
    Pass image as base64 in messages content array (type: "image")
    Output schema: ReceiptDataSchema (defined in spec Section 6 Phase 8b)
    Parse output with Zod. On schema fail: return partial with confidence: 0
  
  verifier.ts:
    Self-verification logic: sum all lineItems[].total
    If sum differs from receipt.total by more than 2%: add flag
      receipt.verificationFlag = 'LINE_ITEM_SUM_MISMATCH'
    If sum matches within 2%: receipt.verified = true
    Return enriched receipt — never throw on mismatch, just flag.
  
  categorizer.ts:
    Attempt to match receipt to a recent bunq transaction:
      Look in local transactions table for same amount ±2%, same day ±1 day
      If match found: update transaction row with category from receipt
    If receipt.total > 50 and category === 'dining':
      Generate suggestion: offer to move equivalent amount to a savings jar
  
  routes/receipt.ts:
    POST /api/receipt
    Accepts multipart/form-data with field name "image"
    Writes temp file → extract → verify → categorize
    Returns: { receipt, verified, matchedTransactionId?, suggestion? }
    Cleans up temp file in finally block
  
  ReceiptScanner.tsx:
    Camera capture using <input type="file" accept="image/*" capture="environment">
    Shows preview of captured image
    On capture: POST to /api/receipt showing loading spinner
    On response: show extracted receipt card with line items
    If suggestion present: show suggestion card with "Save €X to jar?" button
      that triggers the VoiceOrb plan flow with pre-filled text

PHASE 9 — Dream Mode + Trigger + DNA Card
  Build order:
    dream/dna.ts
    dream/worker.ts
    dream/trigger.ts
    dream/scheduler.ts
    routes/dream.ts
    DreamBriefing.tsx
    DreamTrigger.tsx
  
  dream/worker.ts — CRITICAL CONSTRAINTS:
    This file runs in a forked child process.
    It MUST NOT import from: execute.ts, engine.ts, or any intervention handler.
    It MUST NOT make any write calls to the bunq API.
    It communicates with the parent only via process.send() / process.on('message').
    
    Worker message types:
      Parent → Worker: { type: 'START', sessionId: string }
      Worker → Parent: { type: 'PROGRESS', step: string, progress: number }
                       { type: 'COMPLETE', durationMs, patternsUpdated,
                         patternsCreated, briefingText, dnaCard, suggestions }
                       { type: 'ERROR', message: string }
    
    Worker steps (in order):
      1. Load last 7 days of transactions from DB (read-only)
      2. Load all enabled patterns from DB
      3. Load user_profile and goals from DB
      4. Claude call: generate week insights + pattern confidence updates +
         new pattern suggestions + morning briefing + 3 suggestions
         (Single Claude call with structured JSON output schema)
      5. Separate Claude call → dna.ts → Financial DNA card string
      6. Apply confidence updates to patterns table (UPDATE only, no INSERT yet)
      7. Insert new patterns into patterns table (if any suggested)
      8. Update dream_sessions row with results
      9. Send COMPLETE message to parent
    
    Claude model for consolidation: claude-opus-4-5
    Max tokens for consolidation: 1000
    System prompt must explicitly instruct Claude to return valid JSON.
    Parse with Zod before applying any DB updates.
  
  dream/trigger.ts:
    Exports: triggerDream(db, wsEmit, triggerType)
    Forks worker.ts using child_process.fork()
    Sets 10-minute kill timeout (clearTimeout on COMPLETE)
    On COMPLETE message: update dream_sessions in DB + emit DREAM_COMPLETE WS
    On ERROR message: update dream_sessions status to 'FAILED'
    On kill: update dream_sessions status to 'KILLED'
  
  dream/scheduler.ts:
    Uses node-cron to call triggerDream at 2am in profile.timezone
    Called from daemon index.ts after profile is loaded
    If profile.timezone is null, default to 'Europe/Amsterdam'
  
  routes/dream.ts:
    POST /api/dream/trigger
      Body: {} (empty, no parameters)
      Calls triggerDream(db, wsEmit, 'manual')
      Returns immediately: { sessionId, status: 'RUNNING' }
      Do NOT await the dream completion — it runs async in forked process
    
    GET /api/dream/latest
      Queries dream_sessions WHERE status = 'COMPLETED' ORDER BY completed_at DESC LIMIT 1
      Returns: { sessionId, briefingText, dnaCard, suggestions, completedAt }
      If no completed session exists: return { sessionId: null }
  
  DreamTrigger.tsx:
    Single button: "💤 Trigger Dream Mode Now"
    On click: POST /api/dream/trigger
    Button state changes to: "🌙 Dreaming..." (disabled, animated)
    Listens for DREAM_COMPLETE WebSocket message
    On DREAM_COMPLETE: open DreamBriefing modal + reset button to idle
    Also: on mount, call GET /api/dream/latest — if a completed session
    exists from within the last 12 hours, show DreamBriefing automatically
  
  DreamBriefing.tsx:
    Modal overlay (full-centre, not bottom-sheet)
    Sections:
      1. Briefing text (large, readable, 3–4 sentences)
      2. Financial DNA badge:
           "Your Financial DNA"
           [dnaCard text as large chip/badge]
      3. Three suggestion cards (each with icon + suggestion text)
      4. "Got it — start my day" button (dismisses modal)
    
    Props: { briefingText, dnaCard, suggestions, onDismiss }
    Receives data from DreamTrigger (passed down via App.tsx state on
    DREAM_COMPLETE WS message)

PHASE 10 — Savings Jar Agent
  Build: packages/daemon/src/jars/agent.ts
  
  agent.ts:
    Exported function: runSavingsJarAgent(state, wsEmit)
    
    Salary detection (internal helper detectSalaryLanding):
      Look at recentTransactions for a credit transaction that:
        - Amount is within ±10% of profile.salary_amount
        - Counterparty matches a recurring payee seen 2+ times in last 90 days
        - Transaction is within the last 2 hours (avoid re-triggering)
      If found: return { amount, transactionId }
      If not found: return null
    
    If salary detected:
      Load savings accounts from bunq via accounts.ts getSavingsAccounts()
      Compute split via Claude:
        System: "You are a financial planning agent. Given a salary amount,
                 upcoming commitments, and savings goals, compute the optimal
                 split into bunq savings sub-accounts. Return ONLY valid JSON."
        Output schema: { transfers: Array<{ jarName, jarAccountId, amount, reason }>,
                         narrative: string }
        Max tokens: 300
        Parse with Zod before use
      Create ExecutionPlan via createExecutionPlan() from execute.ts
        Steps: one SAVINGS_TRANSFER per jar (use spec Section 6 Phase 10 payload shape)
      Emit WSMessage PLAN_CREATED
    
    Wire to salary-received handler:
      In packages/daemon/src/intervention/handlers/salary-received.ts
      After the standard intervention is dispatched, also call:
        runSavingsJarAgent(state, wsEmit)
      This runs concurrently — do not await it inside the handler.
      Use: runSavingsJarAgent(state, wsEmit).catch(err =>
        console.error({ phase: 'jars', error: err.message }))

PHASE 11 — Forecast Engine + Chart
  Build order: forecast/engine.ts → routes/forecast.ts → ForecastChart.tsx
               → hooks/useForecast.ts
  
  forecast/engine.ts:
    No ML, no LLM calls. Pure deterministic + probabilistic projection.
    
    Algorithm (implement exactly):
      currentBalance = state.primaryBalance
      averageDailySpend = sum(last30DaysTxAmounts) / 30
      varianceFactor = 0.20  // ±20% confidence band
      
      For each day i from 1 to 30:
        events = []
        
        // Deterministic events
        if day matches profile.salary_day:
          projectedBalance += profile.salary_amount
          events.push({ type: 'SALARY', amount: salary_amount, probability: 1.0 })
        
        if day matches profile.rent_day:
          projectedBalance -= profile.rent_amount
          events.push({ type: 'RENT', amount: rent_amount, probability: 1.0 })
        
        // Apply subscriptions (monthly, on their typical charge day)
        for each recurring subscription in patterns:
          if day matches subscription.typicalDay:
            projectedBalance -= subscription.amount
            events.push({ type: 'SUBSCRIPTION', ... })
        
        // Pattern-based impulse risk
        for each pattern with timeBasedTrigger and confidence > 0.5:
          if pattern applies to this day of week or time of month:
            events.push({
              type: 'IMPULSE_RISK',
              amount: pattern.averageAmount,
              probability: pattern.confidence
            })
        
        // Daily spend (baseline)
        projectedBalance -= averageDailySpend
        
        // Variance band
        accumulated_variance = averageDailySpend * varianceFactor * sqrt(i)
        lowerBound = projectedBalance - accumulated_variance
        upperBound = projectedBalance + accumulated_variance
        
        output.push({ date, projectedBalance, lowerBound, upperBound, events })
    
    Caching:
      After generation, upsert into forecast_cache (single row, id=1)
      expires_at = NOW + 6 hours
      generateForecast() checks cache first:
        if cache exists AND now < expires_at AND refresh !== true: return cached
        else: compute and store
  
  routes/forecast.ts:
    GET /api/forecast
      Query param: refresh=true forces regeneration
      Returns: ForecastPoint[] (array of 30 objects)
    
    Trigger forecast regeneration (no REST call needed, internal):
      After dream session completes (in trigger.ts COMPLETE handler)
      After salary webhook event (in webhook route handler)
  
  ForecastChart.tsx:
    Library: Recharts (import from 'recharts')
    Chart type: ComposedChart with Area + Line
    
    Primary line: projectedBalance (solid, colour: #6366f1 or brand primary)
    Confidence area: lowerBound to upperBound (fill: same colour, opacity: 0.15)
    Red reference line: at profile.rent_amount value (dashed, label: "Rent threshold")
    
    X-axis: day labels (Day 1, Day 7, Day 14, Day 21, Day 30)
    Y-axis: €amount with € prefix formatting
    
    Event markers on x-axis:
      SALARY: 💰 emoji icon below axis
      RENT: 🏠 emoji icon below axis
      IMPULSE_RISK: ⚡ emoji icon (only if probability > 0.6)
      GOAL_MILESTONE: 🎯 emoji icon
    
    Custom tooltip on hover:
      Date (formatted as "Mon 14 Apr")
      Projected balance: €X,XXX
      Lower / Upper: €X,XXX – €X,XXX
      Events list (if any): icon + description + probability %
    
    Summary text above chart (computed from ForecastPoint[]):
      "In 30 days, you're projected to have ~€{day30.projectedBalance}.
       {if any day has projectedBalance < rent_amount: "⚠️ Balance may drop
       below your rent threshold around day {N}."}"
    
    useForecast.ts hook:
      Fetches GET /api/forecast on mount
      Listens for FORECAST_READY WebSocket message → refetch
      Returns: { data: ForecastPoint[], loading: boolean, error: string | null }
  
  App.tsx update:
    Add <ForecastChart /> below <OracleVotingPanel />
    Add <DreamTrigger onDreamComplete={handleDreamComplete} /> in top bar
    Add <DreamBriefing /> modal driven by dreamBriefingData state
    Add <VoiceOrb /> in bottom-right corner (fixed position)
    Add <ReceiptScanner /> accessible via a camera icon button (top bar)

════════════════════════════════════════════════════════════════════════
SESSION B — ROUTES TO REGISTER (daemon index.ts updates)
════════════════════════════════════════════════════════════════════════

Replace the stub comments in index.ts with real registrations:

  POST   /api/voice                   → routes/voice.ts
  POST   /api/receipt                 → routes/receipt.ts
  POST   /api/dream/trigger           → routes/dream.ts
  GET    /api/dream/latest            → routes/dream.ts
  GET    /api/forecast                → routes/forecast.ts

Also on startup:
  const profile = await getProfile(db);
  scheduleDreamMode(() => triggerDream(db, wsEmit, 'scheduled'), profile.timezone);

════════════════════════════════════════════════════════════════════════
SESSION B — DEFINITION OF DONE
════════════════════════════════════════════════════════════════════════

Session B is complete when ALL of the following are true:

  □ npx tsc --noEmit passes with zero errors across the monorepo
  □ Daemon restarts without crashing after index.ts changes
  □ POST /api/voice with a valid audio file returns { planId, narratedText, steps }
  □ POST /api/receipt with a valid image returns { receipt, verified }
  □ POST /api/dream/trigger returns { sessionId, status: 'RUNNING' } immediately
  □ Within ~30 seconds, DREAM_COMPLETE WS message received in browser
  □ DreamBriefing modal opens automatically on DREAM_COMPLETE
  □ Financial DNA card text visible in DreamBriefing modal
  □ GET /api/dream/latest returns completed session data
  □ GET /api/forecast returns array of 30 ForecastPoint objects
  □ ForecastChart renders in frontend with data (not empty)
  □ VoiceOrb visible in frontend, transitions through states correctly
  □ Salary test: POST a fake salary webhook event →
    SavingsJarAgent fires → PLAN_CREATED WS message received
  □ All Session A definition-of-done items still passing

If any of the above are false, fix before declaring Session B complete.

╔══════════════════════════════════════════════════════════════════════╗
║                    END OF PREFIX BLOCK B                             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 6. PREFIX BLOCK C — Tier 3 Polish

*Use this block at the start of Session C.*
*Do not use this block unless Session B's definition of done is fully met.*

```
╔══════════════════════════════════════════════════════════════════════╗
║              PREFIX BLOCK C — SESSION C INITIALISATION               ║
║                    BUNQSY Finance v2.0 — Tier 3                      ║
╚══════════════════════════════════════════════════════════════════════╝

You are Claude Code, completing the BUNQSY Finance build for demo day.
Sessions A and B (Tiers 1 and 2) are confirmed complete.
You are now building Tier 3: polish and demo readiness.

Your authority sources (read in this order before touching any file):
  1. CLAUDE.md
  2. specs/CompleteBuildSpecification.md
  3. specs/PrefixInstructions.md (this file)

════════════════════════════════════════════════════════════════════════
SESSION C SCOPE — TIER 3: POLISH + DEMO READINESS
════════════════════════════════════════════════════════════════════════

You are responsible for Phases 12 through 15 ONLY.

  Phase 12: FraudBlock full-screen confirmation component
  Phase 13: Pattern promotion pipeline (post-intervention)
  Phase 14: Multi-account intelligence (all account types)
  Phase 15: Demo polish — animations, reset button, demo seed data,
            pre-demo checklist automation, ngrok startup script

════════════════════════════════════════════════════════════════════════
FILES YOU MAY CREATE OR MODIFY THIS SESSION
════════════════════════════════════════════════════════════════════════

New files:
  packages/frontend/src/components/FraudBlock.tsx
  packages/daemon/src/patterns/promotion.ts
  scripts/reset-demo.ts
  scripts/seed-demo.ts
  scripts/start-demo.sh
  scripts/checklist.ts

Modify (with permission gate — state intent before modifying):
  packages/daemon/src/intervention/engine.ts
    → Wire pattern promotion after confirmed interventions (Phase 13)
  packages/daemon/src/oracle/agents/fraud-shadow.ts
    → Ensure FraudBlock route is wired correctly if needed
  packages/daemon/src/bunq/accounts.ts
    → Extend to handle all account types including joint (Phase 14)
  packages/daemon/src/heartbeat/recall.ts
    → Include all accounts in state recall (Phase 14)
  packages/daemon/src/oracle/agents/balance-sentinel.ts
    → Factor in all accounts not just primary (Phase 14)
  packages/frontend/src/App.tsx
    → Add FraudBlock component, demo reset button, animation classes
  packages/frontend/src/components/InterventionCard.tsx
    → Polish: smooth transitions, loading states
  packages/frontend/src/components/OracleVotingPanel.tsx
    → Polish: row entry animations, verdict reveal animation
  packages/frontend/src/components/BUNQSYScore.tsx
    → Polish: number counter animation, colour transition smoothing

Read-only (do not modify unless fixing a critical bug):
  packages/shared/src/*
  packages/daemon/src/bunq/signing.ts
  packages/daemon/src/bunq/execute.ts
  packages/daemon/src/memory/schema.sql
  packages/daemon/src/memory/db.ts
  packages/daemon/src/heartbeat/loop.ts
  packages/daemon/src/heartbeat/bunqsy-score.ts
  packages/daemon/src/oracle/index.ts
  packages/daemon/src/oracle/aggregator.ts
  packages/daemon/src/voice/*
  packages/daemon/src/receipt/*
  packages/daemon/src/dream/*
  packages/daemon/src/jars/*
  packages/daemon/src/forecast/*

════════════════════════════════════════════════════════════════════════
PHASE-BY-PHASE EXECUTION INSTRUCTIONS — SESSION C
════════════════════════════════════════════════════════════════════════

PHASE 12 — FraudBlock Full-Screen Component
  File: packages/frontend/src/components/FraudBlock.tsx
  
  This is a full-screen overlay modal, not a card.
  It renders when an INTERVENTION WS message has type === 'FRAUD_BLOCK'.
  
  Layout (top to bottom):
    Header:
      "⚠️ Suspicious Transaction Detected"
      Subtitle: "BUNQSY flagged this transaction before it completed."
    
    Narration section:
      The explainer.ts narration text, displayed large and prominently.
    
    Fraud signals checklist:
      Render each signal from fraudVote.metadata as a checklist row:
        ✓ Late night transaction (00:00–05:00)
        ✓ First-time payee — never seen before
        ✓ Round number amount (€500)
        ✓ Foreign currency (USD)
        ✓ Amount 150%+ above your average transaction
      Each row: icon (🚨 for triggered signals, ✅ for clear signals) + label
    
    Confidence badge:
      "Fraud Shadow confidence: {confidence * 100}%"
    
    Expandable "Why did BUNQSY flag this?":
      Same expandable pattern as InterventionCard.tsx
      Shows all 6 oracle votes (not just fraud-shadow)
    
    Action buttons (bottom, full-width):
      IMPORTANT: Both buttons require a 2-second press-and-hold to activate.
      This prevents accidental taps during the demo.
      
      "🚫 Hold to Block" (red, left button):
        On 2s hold complete: POST /api/confirm/:planId/action { action: 'block' }
        Shows hold progress as a filling border animation
        On success: close modal, show toast "Transaction blocked by BUNQSY"
      
      "✅ Hold to Allow" (green, right button):
        On 2s hold complete: POST /api/confirm/:planId/action { action: 'allow' }
        On success: close modal, show toast "Transaction allowed"
      
      "Cancel — decide later" (text link, centre, below buttons):
        Closes modal without action (plan stays PENDING in DB)
  
  Hold-to-confirm implementation:
    Use onPointerDown / onPointerUp events (works for mouse + touch)
    On pointerdown: start a 2000ms timer + begin CSS border-fill animation
    On pointerup before 2000ms: cancel timer + reset animation
    On timer complete: fire the action
    This prevents accidental activation.
  
  Wire in App.tsx:
    Listen for INTERVENTION WS messages with type === 'FRAUD_BLOCK'
    Store as fraudBlockData state
    Render <FraudBlock /> as highest z-index overlay when fraudBlockData !== null
    Note: FraudBlock and InterventionCard should never be visible simultaneously
          (FRAUD_BLOCK type should not render an InterventionCard)

PHASE 13 — Pattern Promotion Pipeline
  File: packages/daemon/src/patterns/promotion.ts
  
  Exported function: offerPatternPromotion(intervention, state)
  
  Called from: packages/daemon/src/intervention/engine.ts
    After an intervention's status changes to 'CONFIRMED' in the DB.
    Run asynchronously (don't await in the route handler):
      offerPatternPromotion(intervention, state).catch(err =>
        console.error({ phase: 'pattern-promotion', error: err.message }))
  
  Logic:
    Check if the intervention type already has a matching high-confidence
    pattern (confidence > 0.8). If yes, just increment hit_count. Return.
    
    If no high-confidence pattern exists:
      Ask Claude:
        System: "You are a pattern learning agent. Determine if this intervention
                 represents a reusable financial behaviour pattern.
                 Return ONLY valid JSON or the string 'NO_PATTERN'."
        User: compact intervention summary (type, narration, oracle votes, state hash)
        Max tokens: 300
        
      If response === 'NO_PATTERN': return without inserting.
      
      If response is valid JSON matching PatternSchema:
        Insert new pattern with:
          confidence: 0.4  (low — not yet proven)
          hit_count: 1
          confirmed_count: 1
          enabled: true
        Generate embedding via Ollama for pattern_embeddings table
        Log: "New pattern created from confirmed intervention: [pattern.name]"
  
  Modifying engine.ts:
    Find the intervention confirmation flow (where status updates to CONFIRMED)
    Add after the status update:
      // Phase 13: offer pattern promotion for confirmed interventions
      offerPatternPromotion(intervention, state).catch(console.error);

PHASE 14 — Multi-Account Intelligence
  Extend accounts.ts to handle all monetary account types:
  
  Additions to accounts.ts:
    export async function getJointAccounts(client): Promise<MonetaryAccount[]>
    export async function getAllAccountsSummary(client): Promise<AccountSummary[]>
    
    interface AccountSummary {
      id: number
      type: 'CURRENT' | 'SAVINGS' | 'JOINT'
      name: string
      balance: number
      currency: string
      goalLinked: boolean
      goalName?: string
      goalProgress?: number  // 0.0–1.0
    }
  
  Extend recall.ts:
    Add allAccounts: AccountSummary[] to RecalledState
    Replace accounts: MonetaryAccount[] with allAccounts in the recall payload
    BUNQSYScore goals component: use goal progress from accountSummaries
  
  Extend balance-sentinel.ts:
    Factor in totalBalance across all accounts (not just primary)
    But: only count savings accounts toward balance health if they're not
    locked to a specific goal (i.e. goalLinked === false)
  
  Joint account anomaly detection in velocity-analyzer.ts:
    If a joint account shows unusual spend velocity (not from primary user's
    transactions): add a WARN vote with reason:
    "Unusual spend velocity detected on your joint account"

PHASE 15 — Demo Polish + Reset Script
  This phase is about making the demo run perfectly every single time.
  
  ── 15a. Reset Demo Script (scripts/reset-demo.ts) ──
  
  npx tsx scripts/reset-demo.ts
  
  This script must:
    1. Delete all rows from: transactions, interventions, execution_plans,
       execution_step_results, tick_log, score_log, dream_sessions, forecast_cache
       (Do NOT delete: sessions, user_profile, goals, patterns — these are seeded)
    2. Run scripts/seed-demo.ts inline (or call it)
    3. Print: "✅ Demo state reset. Database seeded with fresh demo data."
  
  ── 15b. Demo Seed Script (scripts/seed-demo.ts) ──
  
  npx tsx scripts/seed-demo.ts
  
  Seeds the DB with realistic demo data:
    user_profile:
      name: "Alex"
      salary_day: 25
      salary_amount: 3200
      rent_amount: 950
      rent_day: 1
      timezone: "Europe/Amsterdam"
      voice_enabled: true
    
    goals: (3 goals)
      - Amsterdam trip: target €800, current €340, target_date: 3 months
      - Emergency fund: target €3000, current €1200
      - New laptop: target €1200, current €0
    
    transactions: (45 rows, past 30 days)
      - Weekly grocery shops (Albert Heijn, ~€65–80, every 6–7 days)
      - Monthly gym subscription (€29, day 5)
      - Monthly Netflix (€15.49, day 12)
      - Monthly Spotify (€9.99, day 18) — intentional duplicate of a music
        service to trigger subscription-watcher
      - 3 restaurant visits per week (€15–45 each, Friday/Saturday evenings)
      - Salary credit: €3200 on day 25
      - Coffee purchases (€3–6, weekday mornings)
      - One unusual late-night foreign-currency transaction (for fraud demo)
    
    patterns: (4 pre-loaded patterns)
      - "Weekend dining spike": triggers Friday/Saturday, confidence 0.75
      - "Morning coffee habit": triggers weekday 07:00–09:00, confidence 0.82
      - "Grocery rhythm": triggers every 6–7 days, confidence 0.91
      - "Subscription cluster": triggers around day 5–18, confidence 0.68
  
  ── 15c. Demo Startup Script (scripts/start-demo.sh) ──
  
  #!/bin/bash
  # One-command demo startup for judge sessions
  
  echo "🚀 Starting BUNQSY Finance demo environment..."
  
  # Step 1: Reset demo state
  npx tsx scripts/reset-demo.ts
  
  # Step 2: Start ngrok tunnel (or cloudflare tunnel)
  # Requires: ngrok configured with auth token
  ngrok http 3001 --log=stdout > /tmp/ngrok.log &
  NGROK_PID=$!
  sleep 3
  
  # Step 3: Extract tunnel URL
  TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | \
    node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>
    console.log(JSON.parse(d).tunnels[0].public_url))")
  
  export WEBHOOK_PUBLIC_URL="${TUNNEL_URL}"
  echo "📡 Tunnel: ${TUNNEL_URL}"
  
  # Step 4: Start daemon
  cd packages/daemon && npm run dev &
  DAEMON_PID=$!
  sleep 4
  
  # Step 5: Start frontend
  cd ../frontend && npm run dev &
  FRONTEND_PID=$!
  
  echo ""
  echo "✅ BUNQSY Finance is running"
  echo "   Dashboard: http://localhost:5173"
  echo "   Daemon:    http://localhost:3001"
  echo "   Tunnel:    ${TUNNEL_URL}"
  echo ""
  echo "Press Ctrl+C to stop all processes"
  
  # Cleanup on exit
  trap "kill $NGROK_PID $DAEMON_PID $FRONTEND_PID 2>/dev/null" EXIT
  wait
  
  ── 15d. Pre-Demo Checklist Automator (scripts/checklist.ts) ──
  
  npx tsx scripts/checklist.ts
  
  Runs through the Section 10 checklist automatically:
  
    □ BUNQ_ENV check (reads process.env, asserts 'sandbox' or 'production')
    □ DB accessible (calls getDb(), runs SELECT 1)
    □ Transaction count in DB (must be > 0, from seed)
    □ Daemon health check (GET http://localhost:3001/api/score → assert 200)
    □ WebSocket connection test (connect, wait for BUNQSY_SCORE message, disconnect)
    □ Ollama health (GET http://localhost:11434/api/tags → assert nomic-embed-text present)
    □ Whisper model file (stat WHISPER_MODEL_PATH, assert exists)
    □ Dream test (POST /api/dream/trigger, wait 30s, GET /api/dream/latest → assert completed)
    □ Forecast check (GET /api/forecast → assert 30 items)
    □ Test fraud webhook (POST /api/webhook with pre-crafted fraud payload →
      wait 5s → assert ORACLE_VOTE messages received)
    
    Print: "✅ All N checks passed. BUNQSY is demo-ready." or
           "❌ N checks failed: [list]. Fix before demo."
  
  ── 15e. UI Animation Polish ──
  
  In this order, add polish to existing components:
  
  BUNQSYScore.tsx:
    Score number: use a custom counter hook that animates the number from
    its previous value to the new value over 600ms using requestAnimationFrame.
    Colour transition: CSS transition: color 400ms ease on the score number.
    Trend arrow: CSS fade-in when trend changes.
  
  OracleVotingPanel.tsx:
    Each row entry: CSS slide-in from left + fade-in as ORACLE_VOTE arrives.
    Progress bar fill: CSS transition: width 800ms ease on the riskContribution bar.
    Final verdict section: CSS scale-up from 0.8 + fade-in after all 6 votes arrive.
  
  InterventionCard.tsx:
    Entry: CSS slide-up from bottom (translateY(100%) → translateY(0)) over 400ms.
    Exit: CSS slide-down on dismiss (reverse of above).
    Expandable section: CSS max-height transition for smooth accordion.
  
  DreamBriefing.tsx:
    Modal entry: CSS fade-in + scale-up (scale(0.95) → scale(1)) over 300ms.
    DNA card: CSS pulse animation on entry (scale(1) → scale(1.05) → scale(1)).
    Suggestion cards: staggered entry (card 1 at 0ms, card 2 at 150ms, card 3 at 300ms).
  
  FraudBlock.tsx:
    Entry: CSS full-screen overlay fade-in over 200ms.
    Hold-to-confirm buttons: animated border that fills clockwise over 2000ms.
    On completion: button colour flashes to solid before modal exits.
  
  Global:
    All CSS animations must use prefers-reduced-motion media query:
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  
  ── 15f. Demo Reset Button in Frontend ──
  
  Add a small "🔄 Reset Demo" button in the top-right corner of App.tsx.
  On click: POST /api/demo/reset (new route, daemon calls reset-demo.ts logic)
  After 3 seconds, reload the page.
  
  New route to add in daemon:
    POST /api/demo/reset
      Only available when BUNQ_ENV=sandbox (refuse with 403 in production)
      Runs the reset-demo logic (delete demo rows, reseed)
      Returns: { status: 'reset', message: 'Demo state restored' }
  
  Add this route stub to daemon index.ts:
    // Demo utility — sandbox only
    if (process.env.BUNQ_ENV === 'sandbox') {
      fastify.register(import('./routes/demo-reset'));
    }

════════════════════════════════════════════════════════════════════════
SESSION C — FINAL DEMO VALIDATION
════════════════════════════════════════════════════════════════════════

Before declaring the build complete, run through the full 3-minute demo
script from Section 9 of CompleteBuildSpecification.md exactly once.
Time yourself. It must complete in under 3 minutes.

Validate each beat of the script:

  □ [0:00–0:20] BUNQSY Score visible on load. DreamTrigger button fires
    correctly. DreamBriefing modal opens with DNA card visible.

  □ [0:20–0:45] OracleVotingPanel animates all 6 vote rows on test webhook.
    Fraud Shadow fires with INTERVENE. BUNQSY Score drops visibly.

  □ [0:45–1:10] FraudBlock modal opens. All fraud signals listed. Hold-to-
    block works (2s hold). Score recovers after dismissal.

  □ [1:10–1:35] VoiceOrb: record, process, plan card appears with correct
    narratedText. Confirm executes. Orb returns to idle.

  □ [1:35–2:00] Salary webhook: SavingsJarAgent fires. InterventionCard
    shows jar split. Confirm executes 3 transfers. Toast visible.

  □ [2:00–2:30] ForecastChart visible with 30 data points. Hover tooltip
    works. Rent threshold line visible. Risk annotation on day 14.

  □ [2:30–3:00] All components still updating live. No console errors.
    No crashed daemon. WebSocket still connected.

════════════════════════════════════════════════════════════════════════
SESSION C — DEFINITION OF DONE
════════════════════════════════════════════════════════════════════════

Session C (and the full build) is complete when ALL of the following are true:

  □ npx tsc --noEmit passes with zero errors across the monorepo
  □ npx tsx scripts/checklist.ts prints "✅ All N checks passed"
  □ ./scripts/start-demo.sh starts the full environment in one command
  □ npx tsx scripts/reset-demo.ts resets demo state in < 5 seconds
  □ Full 3-minute demo script runs end-to-end without any crashes,
    console errors, or UI glitches
  □ FraudBlock hold-to-confirm works correctly (2s hold required)
  □ Pattern promotion inserts a new pattern after a confirmed intervention
  □ Multi-account summary shows in BUNQSYScore goals component
  □ All animation polish applied and visible
  □ prefers-reduced-motion media query in place
  □ Demo reset button works in browser (POST /api/demo/reset)
  □ All Session A and Session B definition-of-done items still passing

Congratulations. BUNQSY Finance is demo-ready.

╔══════════════════════════════════════════════════════════════════════╗
║                    END OF PREFIX BLOCK C                             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 7. Quick Reference: Session Assignment Table

```
╔═══════════╦══════════════╦═══════════════════════╦═════════════════════════════╗
║  Session  ║  Prefix Block║  Phases               ║  Key Deliverable            ║
╠═══════════╬══════════════╬═══════════════════════╬═════════════════════════════╣
║     A     ║  Block A     ║  Phase 0–6  (Tier 1)  ║  Fully working daemon +     ║
║           ║              ║                       ║  core frontend live         ║
╠═══════════╬══════════════╬═══════════════════════╬═════════════════════════════╣
║     B     ║  Block B     ║  Phase 7–11 (Tier 2)  ║  Voice + receipt + dream +  ║
║           ║              ║                       ║  jars + forecast live       ║
╠═══════════╬══════════════╬═══════════════════════╬═════════════════════════════╣
║     C     ║  Block C     ║  Phase 12–15 (Tier 3) ║  Full demo polish +         ║
║           ║              ║                       ║  reset script + checklist   ║
╚═══════════╩══════════════╩═══════════════════════╩═════════════════════════════╝

Session gate rules:
  Session B requires: Session A definition of done = 100% met
  Session C requires: Session B definition of done = 100% met
  No skipping gates under time pressure. If Tier 1 is incomplete,
  Tier 2 will not function. Fix Tier 1 first.
```

---

## 8. Emergency Triage Protocol

If the build falls behind schedule, use this priority ladder:

```
EMERGENCY PRIORITY ORDER (if time is running out)

Priority 1 — Absolute minimum for any demo:
  Phase 0 gate passed
  Daemon starts without crash
  Phase 3: BUNQSY Score updating in frontend
  Phase 4: Oracle voting panel animating on test webhook
  Phase 5: At least one intervention type firing (low-balance handler)
  Phase 6: BUNQSYScore + OracleVotingPanel visible

Priority 2 — Strong demo:
  Phase 9: Dream Mode trigger + briefing modal (DNA card is the wow moment)
  Phase 7: Voice command (one command type: payment)
  Phase 11: Forecast chart visible (even with static seed data)

Priority 3 — Prize-winning demo:
  Phase 10: Savings Jar Agent (bunq API depth → bonus prize)
  Phase 12: FraudBlock (most visceral demo moment)
  Phase 8: Receipt scanner

Priority 4 — Polish (only if everything else is done):
  Phase 15: Animations, reset script, checklist automator

If you are in Session C and time is short:
  Do Phase 15d (checklist script) and Phase 15c (start-demo.sh) FIRST.
  A working start script and checklist is more valuable than animations.
```

---

*End of PrefixInstructions.md v2.0*
*Companion document: specs/CompleteBuildSpecification.md*
*Constitutional law: CLAUDE.md*
