🚀 KAIROS Finance — Claude Code Prefix Instructions
The Complete "Boot Sequence" to Paste Before Your Build Spec
⚠️ CRITICAL META-NOTES BEFORE YOU PASTE ANYTHING
Three things to understand about Claude Code before you begin, grounded in current best practices:

1. CLAUDE.md is advisory, not law. CLAUDE.md is advisory. Claude follows it about 80% of the time.
1
 More precisely, Claude Code injects your CLAUDE.md with the note: "this context may or may not be relevant to your tasks — you should not respond to this context unless it is highly relevant." As a result, Claude will ignore the contents of your CLAUDE.md if it decides it is not relevant to its current task.
2
 This is why your prefix prompt (which goes directly into the conversation, not just CLAUDE.md) is the highest-signal instruction Claude will receive. The prefix below is engineered specifically for this.

2. Context window is your biggest enemy. Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills. The context window holds your entire conversation, including every message, every file Claude reads, and every command output. A single debugging session or codebase exploration might generate and consume tens of thousands of tokens. When the context window is getting full, Claude may start "forgetting" earlier instructions or making more mistakes.
3
 This is why the build is broken into phases — each phase is a fresh session after a /compact.

3. CLAUDE.md instructions should be minimal and universally applicable. Your CLAUDE.md file should contain as few instructions as possible — ideally only ones which are universally applicable to your task. All else being equal, an LLM performs better when its context window is full of focused, relevant context. Since CLAUDE.md goes into every single session, ensure its contents are as universally applicable as possible.
2
 The CLAUDE.md in your spec is already correctly scoped — do not pad it further.

📋 HOW TO USE THIS DOCUMENT
The 3-Session Structure
This build is too large for one Claude Code session. Structure it as 3 sessions with /compact between each:

text

SESSION 1: Paste PREFIX BLOCK A + Spec Sections 0-7  (Scaffolding → Pattern Brain)
SESSION 2: Paste PREFIX BLOCK B + Spec Sections 8-11 (Dream Mode → Intervention Engine)  
SESSION 3: Paste PREFIX BLOCK C + Spec Sections 12-16 (Frontend → Demo)
Each session begins with its own prefix block below. Each block is self-contained — it re-establishes context without assuming the previous session is in memory.

🟢 PREFIX BLOCK A — SESSION 1
Paste this FIRST, then immediately paste Spec Sections 0 through 7
text

═══════════════════════════════════════════════════════════════════════
KAIROS FINANCE — SESSION 1 OF 3
CODING AGENT BOOT SEQUENCE — READ EVERY WORD BEFORE WRITING A SINGLE LINE
═══════════════════════════════════════════════════════════════════════

YOU ARE: A senior TypeScript engineer building KAIROS Finance — an always-on
financial intelligence daemon for the bunq Hackathon 7.0. This is a real,
production-bound project. Build it as if lives depend on the correctness
of every payment operation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — WHAT YOU ARE BUILDING (Read this in full, then refer back)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KAIROS Finance is a persistent, always-on financial guardian daemon that:
  1. Listens to a bunq bank account 24/7 via real-time webhooks
  2. Runs a KAIROS Heartbeat Loop every 30 seconds (Recall → Reason → React)
  3. Maintains a self-improving Pattern Brain in SQLite (Hermes-style memory)
  4. Runs a multi-agent Risk Oracle that spawns 5 bounded sub-agents
  5. Runs a nightly Dream Mode in a forked child process
  6. Delivers interventions via Voice, Push, Soft Block, or Draft Payment
  7. Processes voice commands via Whisper → Plan → Confirm → Execute flow
  8. Processes receipt photos via Claude Vision → Verify → Categorize flow
  9. NEVER executes a bunq payment without plan narration + user confirmation

HACKATHON MISSION PILLARS being addressed:
  ✅ PILLAR 1: Hear a voice command to invest → plan → confirm → execute
  ✅ PILLAR 2: See a receipt → extract → verify → categorize → log to bunq jar
  ✅ PILLAR 3: Proactively intervene before a bad financial decision occurs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — THE GOLDEN RULES (These override everything else. Always.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOLDEN RULE 1 — SCOUT BEFORE YOU CODE
  Before writing ANY new file or function, run these checks mentally:
  a) Does this logic already exist somewhere in the codebase?
  b) Is there a type in /packages/shared/src/types/ I should use instead of creating new?
  c) Is there a bunq client function in /packages/daemon/src/bunq/ I should call?
  If yes to any: REUSE and EXTEND. Never duplicate.
  If starting fresh: search first, code second. Always.

GOLDEN RULE 2 — PLAN BEFORE ACT (The most important rule in this codebase)
  The KAIROS daemon MUST NEVER execute a bunq payment, transfer, savings jar
  creation, or ANY write operation WITHOUT:
    Step 1: Generating a complete ExecutionPlan with all steps enumerated
    Step 2: Setting plan.status = 'pending_confirmation'
    Step 3: Narrating the plan back to the user in plain English (or TTS)
    Step 4: Receiving explicit user confirmation ('yes' voice OR button tap)
    Step 5: Only THEN calling executePlan() in packages/daemon/src/bunq/execute.ts
  
  Only ONE file may call bunq write endpoints: packages/daemon/src/bunq/execute.ts
  All other modules are READ-ONLY with respect to bunq.
  If you are ever unsure whether to read or write: DEFAULT TO READ.

GOLDEN RULE 3 — BOUNDED CONTEXTS FOR SUB-AGENTS
  Risk Oracle sub-agents receive ONLY the data they need for their specific check.
  No sub-agent receives the full transaction history.
  Each sub-agent's output is max 150 tokens. Structured JSON only.
  Sub-agents call NO write operations. They return INTERVENE | CLEAR + reasoning.

GOLDEN RULE 4 — DREAM MODE IS ISOLATED
  Dream Mode always runs in child_process.fork(). NEVER inline.
  It must not block the heartbeat loop. Ever.
  Dream Mode has a hard 10-minute timeout. Kill the child if exceeded.

GOLDEN RULE 5 — BUNQ AUTHENTICATION IS NON-NEGOTIABLE
  Every bunq API request (except /installation) requires:
  - X-Bunq-Client-Signature: RSA-SHA256 signature of the full request
  - X-Bunq-Client-Authentication: valid session token
  - Session tokens expire. Always call getValidSession() before every API call.
  - Only accept webhooks from IP range 185.40.108.0/22. Reject all others with 403.
  These are not optional. A missing header means a rejected API call. Every time.

GOLDEN RULE 6 — NO SECRETS IN CODE
  API keys, bunq private key (RSA PEM), session tokens = .env ONLY.
  Log only event type + account ID. Never log full bunq payloads (they contain PII).
  All sensitive values accessed via process.env. Never hardcoded. Never.

GOLDEN RULE 7 — ALL API CALLS HAVE RETRY LOGIC
  Every bunq API call must use exponential backoff: max 3 retries.
  Base delay: 1000ms. Multiplier: 2. Max delay: 10000ms.
  On 401: refresh session and retry once before giving up.
  On failure after all retries: log error, trigger INTERVENE with 'API_UNAVAILABLE'.

GOLDEN RULE 8 — STRICT TYPESCRIPT EVERYWHERE
  No 'any' types. No implicit any. No non-null assertions (!.) unless absolutely proven safe.
  Every async function explicitly handles errors.
  Every function has a typed return signature.
  tsconfig: strict: true, noImplicitAny: true, strictNullChecks: true.

GOLDEN RULE 9 — NO CONSOLE.LOG IN PRODUCTION PATHS
  Use the structured logger: import { logger } from '@kairos/shared/logger'
  The logger wraps pino with level-based output.
  console.log is acceptable ONLY in scripts/ and seed files.

GOLDEN RULE 10 — NEVER ADD UNREQUESTED FEATURES
  Build exactly what the spec says. No extra error handling "just in case."
  No abstractions for hypothetical future requirements.
  No refactoring code you didn't touch.
  The minimum correct implementation is the right implementation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — HOW TO WORK (Your operating procedure for this session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — READ THE FULL SPEC FIRST
  Before writing a single file: read every section of the build spec below.
  Build a mental map of all dependencies between components.
  Understand the data model fully before writing any schema.
  Only start coding after you have read everything.

STEP 2 — FOLLOW THE PHASE ORDER EXACTLY
  The build spec contains phases 0 through 11. Build them in order.
  Do not skip ahead. Do not build Phase 3 before Phase 2 is complete.
  Each phase depends on the previous. Order matters.

STEP 3 — ANNOUNCE WHAT YOU ARE DOING
  Before starting each phase, say: "Starting Phase X: [name]"
  After completing each task within a phase, say: "✅ Task X.Y complete: [what you built]"
  If you encounter ambiguity in the spec, say: "❓ Ambiguity in [section]: [question]"
  Then make the most reasonable decision and state what you chose.

STEP 4 — VERIFY EACH PHASE BEFORE MOVING ON
  After completing each phase, run a self-check:
  a) Do all imports resolve correctly?
  b) Does the TypeScript compile without errors? (run: npx tsc --noEmit)
  c) Does this phase introduce any bunq write calls outside execute.ts?
  d) Are all new functions typed with explicit return types?
  Only proceed to the next phase if all checks pass.

STEP 5 — WRITE IMPORTANT THINGS DOWN
  When you learn something critical during implementation (e.g., a bunq API
  quirk, a dependency version conflict, a schema decision), write it to:
  specs/IMPLEMENTATION_NOTES.md
  This file persists across sessions and is your cross-session memory.

STEP 6 — USE PLAN MODE FOR ANYTHING STRUCTURAL
  For any task that involves creating multiple files or touching the database
  schema: enter plan mode first. Map out every file you will touch.
  Only start implementing after the plan is clear.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — DOMAIN GLOSSARY (Do not confuse these terms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ExecutionPlan      = a structured list of bunq operations awaiting confirmation
                       Status: pending_confirmation → confirmed → executed | cancelled
                       Lives in: packages/daemon/src/bunq/execute.ts
                       Created by: voice-agent, intervention engine, dream mode
                       Executed by: executePlan() ONLY — after explicit user confirm

  Pattern            = a Markdown file describing a repeatable spending behavior
                       Stored in: packages/daemon/data/patterns/*.md
                       Managed by: Pattern Brain (pattern-brain module)
                       Grows smarter: confidence increases with confirmed interventions

  OracleVote         = the output of a single Risk Oracle sub-agent
                       Fields: agentName, verdict (INTERVENE|CLEAR), confidence, reasoning
                       Max reasoning length: 100 characters

  OracleResult       = the aggregated output of all 5 oracle sub-agents
                       Verdict: INTERVENE if 3+ agents vote INTERVENE OR riskScore > 0.7

  Intervention       = an action taken by the Intervention Engine toward the user
                       Modalities: voice | push | soft_block | draft_payment
                       Logged in: InterventionRecord in SQLite

  Tick               = one iteration of the KAIROS Heartbeat Loop (every 30s)
                       Logged to: append-only tick_logs table in SQLite

  DraftPayment       = a bunq payment that is created but NOT confirmed
                       Used for: soft blocks on suspicious transactions
                       bunq endpoint: POST /draft-payment (not POST /payment)

  SavingsJar         = a bunq savings goal/sub-account for ring-fencing money
                       Used for: receipt categorization, investment splits

  SessionToken       = bunq's temporary auth token (expires after ~1h of inactivity)
                       Managed by: packages/daemon/src/bunq/session.ts → getValidSession()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — TECHNOLOGY DECISIONS (Do not deviate from these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Runtime:         Node.js 22 (LTS)
  Framework:       Fastify 5.x (not Express — Fastify's async model fits the daemon)
  Language:        TypeScript 5.x, strict mode
  Monorepo:        Turborepo with packages/daemon, packages/frontend, packages/shared
  Database:        better-sqlite3 + sqlite-vec extension
  Embeddings:      Ollama local (nomic-embed-text) — NEVER a cloud embedding API
  LLM (primary):   @anthropic-ai/sdk → claude-opus-4-5 (planning, vision, dream)
  LLM (sub-agents):@anthropic-ai/sdk → claude-haiku-4-5 (oracle agents — speed/cost)
  Voice STT:       whisper.cpp via node bindings or shell exec to local whisper binary
  Voice TTS:       ElevenLabs API (demo quality) with espeak-ng fallback (offline)
  Scheduler:       node-cron 3.x
  Process forking: Node.js built-in child_process.fork()
  WebSocket:       ws 8.x (native — no socket.io)
  Frontend:        React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
  Package manager: pnpm (workspaces)
  Env management:  dotenv for development, process.env for all access

  DO NOT use:
  ❌ Express (use Fastify)
  ❌ Prisma or any ORM (use better-sqlite3 directly with typed queries)
  ❌ Any cloud embedding service (use Ollama local only)
  ❌ Socket.io (use ws directly)
  ❌ Any state management library in frontend (React state is sufficient)
  ❌ axios (use native fetch or Fastify's built-in)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — ENVIRONMENT VARIABLES (All must exist in .env.example)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # bunq credentials
  BUNQ_API_KEY=                    # bunq Personal Access Token
  BUNQ_PRIVATE_KEY=                # RSA-2048 private key, base64-encoded PEM
  BUNQ_ENVIRONMENT=sandbox         # 'sandbox' for hackathon, 'production' for live
  BUNQ_USER_ID=                    # Retrieved after authentication, stored in DB
  BUNQ_MONETARY_ACCOUNT_ID=        # Primary account ID to monitor
  WEBHOOK_URL=                     # HTTPS URL for bunq to send events to

  # LLM
  ANTHROPIC_API_KEY=               # Anthropic API key for Claude

  # Voice
  ELEVENLABS_API_KEY=              # ElevenLabs for TTS (optional, falls back to espeak)
  ELEVENLABS_VOICE_ID=             # Voice ID from ElevenLabs dashboard
  WHISPER_MODEL_PATH=              # Path to local whisper.cpp model file

  # Ollama (local embeddings)
  OLLAMA_BASE_URL=http://localhost:11434

  # Application
  PORT=3000                        # Daemon HTTP port
  NODE_ENV=development
  LOG_LEVEL=info
  DB_PATH=./data/kairos.db         # SQLite database file path
  PATTERNS_PATH=./data/patterns    # Directory for pattern Markdown files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — COMMON COMMANDS (Run these exactly as shown)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Install all dependencies from root
  pnpm install

  # Run TypeScript type check (no emit) — run after every phase
  cd packages/daemon && npx tsc --noEmit
  cd packages/frontend && npx tsc --noEmit
  cd packages/shared && npx tsc --noEmit

  # Start daemon in development
  cd packages/daemon && pnpm dev

  # Start frontend in development
  cd packages/frontend && pnpm dev

  # Run database migrations
  cd packages/daemon && pnpm db:migrate

  # Seed demo data
  cd packages/daemon && pnpm db:seed

  # Build all packages
  pnpm build (from root)

  # Expose webhook URL for local development (required for bunq to call you)
  npx cloudflared tunnel --url http://localhost:3000
  # OR: ngrok http 3000

  # Check Ollama is running with correct model
  ollama list | grep nomic-embed-text
  # If not: ollama pull nomic-embed-text

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — THIS SESSION'S SCOPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS SESSION COVERS: Spec Sections 0–7
  ✅ Phase 0: Monorepo scaffold + CLAUDE.md + all shared types + SQLite migrations
  ✅ Phase 1: Full bunq integration layer (auth, signing, webhooks, read client, execute.ts)
  ✅ Phase 2: Full memory layer (transactions, patterns, profiles, interventions, plans)
  ✅ Phase 3: KAIROS Heartbeat Loop
  ✅ Phase 4: Risk Oracle (all 5 sub-agents + aggregator + default pattern seeds)

THIS SESSION DOES NOT COVER: Sections 8–16 (reserved for Sessions 2 and 3)
Do not implement Dream Mode, Voice Pipeline, Receipt Pipeline, or Frontend in this session.
If you complete all phases ahead of schedule: write additional unit tests or refine
type definitions. Do not start the next session's scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9 — BEFORE YOU WRITE YOUR FIRST FILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do this sequence now, in order:
  1. Read the full build spec below from beginning to end
  2. Confirm you understand by outputting a 5-bullet summary of what you will build
  3. List any ambiguities or gaps you see in the spec (be honest — none is acceptable too)
  4. Ask any clarifying questions BEFORE starting (max 3 questions)
  5. Then begin Phase 0 with: "Starting Phase 0: Monorepo Scaffolding"

If you do not have clarifying questions: say "No questions. Starting Phase 0." and begin.

ONE THING ABOVE ALL ELSE:
  The bunq plan-before-act gate is sacred. Nothing executes without confirmation.
  If you ever find yourself writing code that calls a bunq write endpoint
  without going through execute.ts and a confirmed ExecutionPlan:
  STOP. Delete that code. Rethink. Start again from the plan phase.

═══════════════════════════════════════════════════════════════════════
END OF PREFIX BLOCK A — THE BUILD SPEC FOLLOWS IMMEDIATELY BELOW
═══════════════════════════════════════════════════════════════════════

[PASTE SPEC SECTIONS 0–7 HERE]
🟡 PREFIX BLOCK B — SESSION 2
Open a fresh Claude Code session. Paste this FIRST, then paste Spec Sections 8–13
text

═══════════════════════════════════════════════════════════════════════
KAIROS FINANCE — SESSION 2 OF 3
CONTINUING BUILD — READ BEFORE CODING
═══════════════════════════════════════════════════════════════════════

CONTEXT: Session 1 completed Phases 0–4 (Monorepo, bunq integration, memory
layer, heartbeat loop, and Risk Oracle). The codebase now exists at:
  packages/daemon/    — Node.js Fastify daemon (partially built)
  packages/frontend/  — React app (scaffolded but empty)
  packages/shared/    — Shared types (fully built)
  specs/IMPLEMENTATION_NOTES.md — Read this first for Session 1 decisions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — MANDATORY CODEBASE ORIENTATION (Do this before writing anything)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run these commands NOW and read the output before touching a single file:
  1. cat specs/IMPLEMENTATION_NOTES.md       (read Session 1 decisions)
  2. cat CLAUDE.md                           (re-read the constitutional rules)
  3. find packages/daemon/src -name "*.ts" | head -40   (see what exists)
  4. cat packages/shared/src/types/memory.ts (confirm data model)
  5. cat packages/daemon/src/bunq/execute.ts (confirm the ONE write gateway)

Only after reading all five outputs: begin Phase 5.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE GOLDEN RULES — Re-stated (these apply to every session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🔴 PLAN BEFORE ACT: Only execute.ts calls bunq write endpoints. Always.
  🔴 SCOUT BEFORE CODE: Search for existing implementations before writing new.
  🔴 DREAM MODE IS FORKED: child_process.fork() only. Never inline. Never blocking.
  🔴 SUB-AGENTS ARE BOUNDED: Max 150 token output per oracle agent. JSON only.
  🔴 BUNQ SIGNATURES ON EVERY REQUEST: No exceptions. Missing = 400 error.
  🔴 NO PII IN LOGS: Log only event type + account ID. Never full payloads.
  🔴 NO UNREQUESTED FEATURES: Build the spec exactly. Nothing extra.
  🔴 TYPESCRIPT STRICT: No 'any'. No implicit types. Explicit return types everywhere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS SESSION'S SCOPE — Phases 5 through 9
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Phase 5: Dream Mode (worker + scheduler + forked process)
  ✅ Phase 6: Pattern Brain Learning (maybeCreateNewPattern + self-refinement)
  ✅ Phase 7: Intervention Engine (all handlers + WebSocket push)
  ✅ Phase 8: Voice Pipeline (Whisper STT + Planning Agent + TTS + confirm route)
  ✅ Phase 9: Receipt Vision Pipeline (Vision extraction + self-verification + categorize)

NOT IN SCOPE: Frontend (Phase 10) — reserved for Session 3.
Do not start the frontend. If you finish all 5 phases: write integration
tests for the voice pipeline. Do not start Session 3 scope.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIFIC GUIDANCE FOR THIS SESSION'S PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 5 — Dream Mode:
  The worker runs in a child_process.fork(). The parent (heartbeat/index.ts)
  calls fork('./src/dream-mode/worker.js') and sets a 10-minute kill timer.
  The worker has NO network access to bunq — read-only DB access only.
  The worker produces a DreamSession object and sends it via process.send().
  The parent saves it via storeDreamSession() and logs the outcome.
  The node-cron schedule reads timezone from UserProfile.timezone.

PHASE 6 — Pattern Learning:
  maybeCreateNewPattern() is called ONLY from the intervention result handler,
  ONLY when userResponse === 'confirmed'. Not on dismissed interventions.
  Claude decides (via claude-haiku-4-5) if the intervention is a repeatable pattern.
  If yes: write a new .md file to data/patterns/ following the exact Markdown
  format shown in Spec Section 6.1. Filename: {category}_{slug}.md.
  Embed the pattern using Ollama nomic-embed-text and store in pattern_embeddings.

PHASE 7 — Intervention Engine:
  The modality decision matrix (selectModality) runs BEFORE any Claude call.
  SALARY_RECEIVED always uses 'voice' modality regardless of time of day.
  IMPULSE_BUY_DETECTED always uses 'draft_payment' — never a confirmed payment.
  The WebSocket server lives at ws://localhost:3000/ws/:userId.
  Send InterventionRecord objects over the socket. Frontend listens on this.

PHASE 8 — Voice Pipeline:
  The voice route accepts multipart/form-data with field 'audio' (WAV or WebM).
  Whisper transcription happens via local binary: shell exec to whisper.cpp.
  The Planning Agent uses claude-opus-4-5 with max_tokens: 1000.
  The plan is saved with status 'pending_confirmation' and returns to frontend.
  The confirm route (POST /api/plans/:planId/confirm) calls executePlan().
  Plans expire after 5 minutes. Check expiry before executing.
  TTS: Try ElevenLabs first. On failure or missing API key: fall back to espeak-ng.

PHASE 9 — Receipt Vision:
  Pass image as base64 to claude-opus-4-5 vision (as per Spec Section 10).
  Self-verification: if lineItems exist and sum ≠ total (>€1 discrepancy): flag.
  findRelevantSavingsJar() maps merchantCategory to the closest savings goal name.
  If no jar matches: still return the extraction, just without a suggested plan.
  Return both extraction and optional plan to frontend in one JSON response.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFICATION GATE — Run before ending this session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before declaring Session 2 complete:
  □ Run: cd packages/daemon && npx tsc --noEmit (must pass with 0 errors)
  □ Confirm: Dream Mode worker is forked, not inlined
  □ Confirm: No bunq write calls exist outside execute.ts
  □ Confirm: Voice route saves plan as 'pending_confirmation' before returning
  □ Confirm: Oracle agents use claude-haiku-4-5, not claude-opus-4-5
  □ Confirm: All new pattern files follow the Markdown DSL from Spec Section 6.1
  □ Update: specs/IMPLEMENTATION_NOTES.md with any decisions made this session

═══════════════════════════════════════════════════════════════════════
END OF PREFIX BLOCK B — PASTE SPEC SECTIONS 8–13 BELOW THIS LINE
═══════════════════════════════════════════════════════════════════════

[PASTE SPEC SECTIONS 8–13 HERE]
🔵 PREFIX BLOCK C — SESSION 3
Open a fresh Claude Code session. Paste this FIRST, then paste Spec Sections 14–17
text

═══════════════════════════════════════════════════════════════════════
KAIROS FINANCE — SESSION 3 OF 3
FINAL SESSION — FRONTEND + INTEGRATION + DEMO POLISH
═══════════════════════════════════════════════════════════════════════

CONTEXT: Sessions 1 and 2 completed the full daemon backend:
  - bunq integration layer with authentication, signing, webhooks
  - KAIROS Heartbeat Loop (30s Recall→Reason→React)
  - Pattern Brain (SQLite + sqlite-vec + Markdown pattern files)
  - Risk Oracle (5 sub-agents: balance-sentinel, velocity-analyzer,
    pattern-matcher, subscription-watcher, rent-proximity-guard)
  - Dream Mode (nightly forked child process, 2am cron)
  - Intervention Engine (voice, push, soft_block, draft_payment)
  - Voice Pipeline (Whisper → Plan → Confirm → Execute)
  - Receipt Vision Pipeline (Vision → Verify → Categorize → Log)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — MANDATORY ORIENTATION (Before touching the frontend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run these now:
  1. cat specs/IMPLEMENTATION_NOTES.md        (all cross-session decisions)
  2. cat packages/daemon/src/index.ts         (all available API routes)
  3. cat packages/shared/src/types/interventions.ts  (intervention payload shapes)
  4. cat packages/shared/src/types/memory.ts  (ExecutionPlan + DreamSession types)

The frontend must call ONLY routes that exist in the daemon.
Do not invent new routes. If you need a new endpoint: implement it in the
daemon first, document it in IMPLEMENTATION_NOTES.md, then build the frontend call.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE GOLDEN RULES — Final session re-statement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🔴 CONFIRMATION GATE IS SACRED: The frontend MUST show ConfirmationModal
     before calling POST /api/plans/:planId/confirm. No silent confirmations.
     No auto-confirms on timer. User must tap or say "yes" explicitly.

  🔴 VOICE IS NON-BLOCKING: The VoiceOrb must not freeze the UI while waiting
     for Whisper transcription. Show a loading state. Play back TTS when ready.

  🔴 WEBSOCKET RECONNECTS: The useBunqWebSocket hook must reconnect on disconnect
     with exponential backoff. Interventions cannot be missed due to a dropped socket.

  🔴 CAMERA PERMISSIONS: ReceiptScanner must handle getUserMedia permission
     denial gracefully. Show a clear "enable camera" prompt. Never crash.

  🔴 NO UNREQUESTED FEATURES: Build the 5 components in the spec. Not 6.
     No extra pages. No settings screen. No onboarding flow.
     The demo needs: VoiceOrb, InterventionCard, ReceiptScanner,
     DreamBriefing, ConfirmationModal. That is all.

  🔴 SHADCN COMPONENTS ONLY: Use shadcn/ui primitives (Card, Button, Badge,
     Dialog, Sheet) as the base for all custom components. Do not install
     additional component libraries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS SESSION'S SCOPE — Phases 10 and 11
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Phase 10: Full React frontend (5 components + 2 hooks + App.tsx)
  ✅ Phase 11: Integration + startup sequence + demo data seeding + tunnel setup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIFIC GUIDANCE FOR PHASE 10 — FRONTEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VoiceOrb.tsx:
  - Large circular button, center of screen. Pulsing animation when idle.
  - Active (recording): ring animation, live transcription text below.
  - Loading (processing): spinner overlay on orb.
  - Response: plays back TTS audio, then shows plan card below orb.
  - Plan card shows: narratedText, list of steps, "Confirm" and "Cancel" buttons.
  - On Confirm: POST /api/plans/:planId/confirm → show success animation.
  - On Cancel: DELETE /api/plans/:planId → orb returns to idle.
  - Audio recording: use MediaRecorder API → send blob to POST /api/voice.

InterventionCard.tsx:
  - Fixed bottom sheet (slides up from bottom of screen).
  - Shows: intervention type badge, risk score bar, message, oracle votes list.
  - Oracle votes: each shown as a small pill (INTERVENE=red, CLEAR=green + reasoning).
  - Buttons: "Dismiss" (sends dismissed to POST /api/interventions/:id/respond)
             "Got it" (sends confirmed)
             "Tell me more" (expands to show full oracle reasoning)
  - Auto-dismisses after 60 seconds if no interaction (sends 'timeout').

ReceiptScanner.tsx:
  - Camera button → opens camera view (getUserMedia, video element).
  - Capture button → takes photo → converts to base64 → POST /api/receipt.
  - Loading state while processing.
  - Results panel: merchant name, amount, category badge, date.
  - If plan returned: shows savings jar suggestion with Confirm button.
  - Anomaly flag (if present): shows as yellow warning banner.

DreamBriefing.tsx:
  - Full-screen modal, appears on mount if GET /api/dream/today returns a session.
  - Auto-plays morning briefing audio (morningBriefingText via TTS endpoint).
  - Shows 3 suggestion cards (type badge + title + body).
  - Each actionable suggestion has a "Do it" button → creates and confirms plan.
  - "Got it, thanks" button dismisses the modal.

ConfirmationModal.tsx:
  - Reusable modal used by both VoiceOrb and DreamBriefing for plan confirmation.
  - Shows plan steps as a numbered list with icons per step type.
  - Large "Confirm" button (green) and "Cancel" button (ghost/text).
  - Shows expiry countdown: "This plan expires in 4:32".
  - On expire: auto-closes, shows "Plan expired — please repeat your request."

useBunqWebSocket.ts hook:
  - Connects to ws://localhost:3000/ws/${userId} on mount.
  - On message: parse InterventionRecord → call setActiveIntervention(intervention).
  - Reconnect on disconnect: exponential backoff (1s, 2s, 4s, 8s, max 30s).
  - Expose: { activeIntervention, dismissIntervention, isConnected }.

useVoice.ts hook:
  - Manages MediaRecorder lifecycle: start, stop, getAudioBlob.
  - Exposes: { isRecording, startRecording, stopRecording, audioBlob }.
  - On stopRecording: sends blob to POST /api/voice, returns { plan, audioBase64 }.
  - Auto-plays the returned audioBase64 via Audio API.

App.tsx layout:
  ┌──────────────────────────────────────┐
  │  KAIROS Finance    ● Live  [status]  │  ← header
  ├──────────────────────────────────────┤
  │                                      │
  │            [ VoiceOrb ]              │  ← center hero
  │                                      │
  │  [Receipt Scanner]  [Dream Briefing] │  ← action buttons below
  │                                      │
  └──────────────────────────────────────┘
  [InterventionCard]                        ← fixed bottom, hidden until fired
  [ConfirmationModal]                       ← overlay, hidden until plan exists
  [DreamBriefing]                           ← full-screen overlay, shows on open

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIFIC GUIDANCE FOR PHASE 11 — INTEGRATION + DEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Startup sequence in packages/daemon/src/index.ts:
  Ordered boot:
    1. Load .env
    2. Verify DB exists + run pending migrations
    3. bunq: Installation → Device Registration → Session Creation
    4. bunq: Register webhook categories (KAIROS_WEBHOOK_CATEGORIES)
    5. Warm-start: fetch last 200 transactions → store in SQLite
    6. Start Fastify server on PORT
    7. Start KAIROS Heartbeat Loop (startHeartbeatLoop)
    8. Schedule Dream Mode (scheduleDreamMode at 2am user timezone)
    9. Log: "KAIROS Finance daemon online — watching account {accountId}"

Demo seed script (packages/daemon/scripts/seed-demo.ts):
  Creates a realistic 90-day transaction history for the sandbox account:
  - Regular salary: €3,200 on the 25th of each month
  - Fixed costs: rent (€950), subscriptions (Spotify €9.99, Netflix €15.99)
  - Variable spend: groceries, food delivery, coffee, transport
  - 3 planted anomalies:
      a) Duplicate Spotify charge (triggers subscription-watcher)
      b) Late-night €89 purchase at unfamiliar merchant (triggers pattern-matcher)
      c) Rent due in 4 days + large purchase incoming (triggers balance-sentinel)
  - Pre-seeds 5 patterns with hitCount=8-14, confirmedCount=7-12 (shows learning)
  - Pre-seeds 1 completed DreamSession with 3 suggestions

Tunnel setup (add to README.md):
  For bunq sandbox webhook delivery during the hackathon:
    Option A: npx cloudflared tunnel --url http://localhost:3000
    Option B: ngrok http 3000
  Copy the HTTPS URL → set as WEBHOOK_URL in .env → restart daemon.
  bunq sandbox will then deliver webhook events to your local machine.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMO READINESS CHECKLIST — The definition of done for this project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before declaring the project complete, walk through this demo sequence
and confirm every step works end-to-end:

  DEMO STEP 1 — RECEIPT VISION (0:00 – 0:30)
  □ Open app → DreamBriefing modal appears with morning audio
  □ Tap "Got it" → modal dismisses
  □ Tap Receipt Scanner → camera opens
  □ Point at a printed receipt → tap capture
  □ Extraction appears: merchant, amount, category
  □ Savings jar suggestion appears → tap Confirm
  □ bunq API call executes (visible in daemon logs)
  □ Success state shown in UI

  DEMO STEP 2 — VOICE INVESTMENT (0:30 – 1:15)
  □ Tap VoiceOrb → recording begins (pulsing animation)
  □ Speak: "Move 30% of my bonus to savings and invest the rest"
  □ Orb shows loading state during Whisper + planning
  □ TTS response plays back the plan
  □ Plan card shows with confirm/cancel buttons
  □ Tap Confirm → executePlan() fires
  □ Both bunq transfers execute (visible in daemon logs)
  □ Confirmation TTS plays back

  DEMO STEP 3 — PROACTIVE INTERVENTION (1:15 – 2:00)
  □ Trigger the seeded anomaly (simulated webhook or manual bunq sandbox payment)
  □ InterventionCard slides up from bottom within 30 seconds of heartbeat tick
  □ Oracle votes visible (4x INTERVENE, 1x CLEAR)
  □ Risk score bar visible
  □ Voice alert plays (if voice modality selected)
  □ Tap "Got it" → pattern confidence updates in logs
  □ New pattern created (if novel) → visible in data/patterns/

  FINAL CHECK
  □ cd packages/daemon && npx tsc --noEmit → 0 errors
  □ cd packages/frontend && npx tsc --noEmit → 0 errors
  □ KAIROS status endpoint (GET /api/status) returns correctly
  □ IMPLEMENTATION_NOTES.md updated with any final decisions

═══════════════════════════════════════════════════════════════════════
END OF PREFIX BLOCK C — PASTE SPEC SECTIONS 14–17 BELOW THIS LINE
═══════════════════════════════════════════════════════════════════════

[PASTE SPEC SECTIONS 14–17 HERE]
🧯 EMERGENCY RECOVERY PROMPTS
When things go wrong mid-session (and they will), paste the exact prompt that matches your situation:

🔴 When the agent starts writing duplicate bunq client code:
text

STOP. Do not write any more code yet.

Run: find packages/daemon/src/bunq -name "*.ts"
Read every file in that directory.

A bunq client already exists. Your job is to EXTEND it, not duplicate it.
Identify which function already exists that covers what you need.
Only write new code for functionality that is provably absent.
🔴 When the agent writes a payment execution without a confirmation gate:
text

STOP. This is a Golden Rule violation.

You have written code that calls a bunq write endpoint without going through
execute.ts and an ExecutionPlan confirmation gate.

Delete all of that code now.

The correct sequence is:
  1. Build the ExecutionPlan object (steps, narratedText, expiresAt)
  2. Save it with status 'pending_confirmation'
  3. Return it to the caller — DO NOT execute it
  4. Execution ONLY happens in execute.ts when called from the confirm route
     after receiving user confirmation

Rewrite the function following this sequence.
🔴 When Dream Mode is written as inline/synchronous code:
text

STOP. Dream Mode must ALWAYS run in a forked child process.

The reason: Dream Mode runs a large Claude claude-opus-4-5 call that takes 20-60 seconds.
Running it inline would block the KAIROS heartbeat loop for that entire duration.
The heartbeat loop must never be blocked. Ever.

Delete the inline implementation.
Implement Dream Mode as:
  - Parent: child_process.fork('./src/dream-mode/worker.js') with 10-min kill timer
  - Worker: standalone process with its own DB connection, no heartbeat access
  - Communication: worker calls process.send(dreamSession) when complete
🔴 When the session context is getting full and output quality is degrading:
text

Before we continue, run /compact with these instructions:
"Preserve: the list of completed phases, all files created, the Golden Rules
(especially: plan-before-act, execute.ts as sole write gateway, dream mode
must be forked), the bunq authentication state, and any open tasks.
Discard: all intermediate reasoning, draft code that was rewritten, and
exploratory discussions."

After compacting, confirm: what phases are complete, what is in progress,
and what the next task is.
🔴 When the TypeScript compiler reports errors after a phase:
text

Run: cd packages/daemon && npx tsc --noEmit 2>&1

Paste the full output here. Fix every error before proceeding.
Do not move to the next phase until this command exits with code 0.

Priority order for fixing errors:
  1. Type errors in packages/shared/src/types/ (fix these first — they cascade)
  2. Import errors (wrong paths, missing exports)
  3. Missing return types
  4. Null safety issues (do not use ! assertions — fix the type properly)
🔴 When the agent invents a new API route not in the spec:
text

STOP. You are building something that was not asked for.

The complete list of API routes is defined in Spec Section 13.
Do not add routes outside that list unless you:
  1. Identify a concrete gap that prevents a specified feature from working
  2. State explicitly what is missing and why it is necessary
  3. Receive confirmation before implementing

If the frontend needs data: check if an existing route already provides it first.
📌 ADDITIONAL POWER USER TIPS FOR YOUR SESSION
Based on current Claude Code best practices, here are things to do around your sessions:

1. Name your sessions. Use /rename kairos-session-1 and /color green (or /color yellow for Session 2, /color blue for Session 3). When running parallel sessions, naming and coloring them takes five seconds and saves you from typing into the wrong terminal.
1

2. Use Plan Mode for every structural task. Always use plan mode, give Claude a way to verify.
4
 Trigger it explicitly by saying "enter plan mode" before any phase that touches multiple files or the database schema.

3. Background long-running commands. When Claude kicks off a long bash command (a test suite, a build, a migration), press Ctrl+B to send it to the background. Claude continues working while the process runs, and you can keep chatting.
1

4. Use subagents for exploration, not implementation. Delegate research with "use subagents to investigate X." They explore in a separate context, keeping your main conversation clean for implementation.
3
 Use this when you need Claude to scan the entire codebase for a pattern without polluting your build context.

5. Give Claude raw data, not interpretations. Paste the error log, CI output, or terminal output directly and say "fix." Claude reads logs from distributed systems and traces where things break. Your interpretation adds abstraction that often loses the detail Claude needs to pinpoint the root cause. Give Claude the raw data and get out of the way.
1

6. Start fresh sessions if output quality drops. Sessions degrade because accumulated context from earlier work drowns out your current instructions. The five seconds it takes to /clear and write a focused starting prompt saves you from 30 minutes of diminishing returns.
1

7. Hooks for deterministic enforcement. Use hooks for actions that must happen every time with zero exceptions. Hooks run scripts automatically at specific points in Claude's workflow. Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens.
3
 Consider a PostToolUse hook that runs tsc --noEmit after every file write.

8. The shift that wins hackathons. The developer's role has moved from context management to outcome specification. What remains, more clearly than before, is the higher-order work: deciding what to build, reviewing the proposed approach, and validating the result.
5
 Your job during the build is to be the judge of output quality, not the author of every line. Read what the agent produces. Challenge it. Make it prove things work. That is how you win.

🏁 FINAL ASSEMBLY CHECKLIST
Print this and tick each box as you complete it:

text

PRE-SESSION SETUP
  □ bunq sandbox account created (bunq.com → Developer → Sandbox)
  □ bunq API key generated from sandbox dashboard
  □ RSA-2048 key pair generated (openssl genrsa -out private.pem 2048)
  □ Anthropic API key available
  □ Ollama installed and running (ollama serve)
  □ nomic-embed-text model pulled (ollama pull nomic-embed-text)
  □ whisper.cpp compiled or whisper binary available
  □ pnpm installed globally (npm install -g pnpm)
  □ Node.js 22 installed (node --version → v22.x)
  □ cloudflared or ngrok installed for tunnel

SESSION 1 COMPLETE WHEN:
  □ Monorepo scaffolded with all directories from Spec Section 1
  □ CLAUDE.md written at repo root
  □ All shared types in packages/shared/src/types/
  □ All SQLite migrations written and runnable
  □ bunq auth flow implemented and tested against sandbox
  □ Request signer implemented (all 8 required headers)
  □ Webhook receiver route implemented with IP validation
  □ execute.ts implemented as sole write gateway
  □ All memory stores implemented (transactions, patterns, profiles, plans)
  □ KAIROS Heartbeat Loop running (30s interval, Recall→Reason→React)
  □ All 5 Risk Oracle agents implemented + aggregator
  □ 5 default pattern seed files written to data/patterns/
  □ tsc --noEmit passes with 0 errors in all packages

SESSION 2 COMPLETE WHEN:
  □ Dream Mode worker implemented in forked child process
  □ node-cron 2am schedule wired to fork()
  □ Pattern Brain learning implemented (maybeCreateNewPattern)
  □ All intervention handlers implemented (5 types)
  □ WebSocket server implemented at /ws/:userId
  □ Voice route implemented (multipart → Whisper → Plan → Return)
  □ Plan confirm route implemented (→ executePlan())
  □ Receipt route implemented (Vision → Verify → Categorize → Plan)
  □ tsc --noEmit passes with 0 errors

SESSION 3 COMPLETE WHEN:
  □ VoiceOrb component implemented with MediaRecorder
  □ InterventionCard component with oracle votes + dismiss/confirm
  □ ReceiptScanner component with camera + capture + results
  □ DreamBriefing modal with audio + 3 suggestions
  □ ConfirmationModal with plan steps + expiry countdown
  □ useBunqWebSocket hook with reconnect logic
  □ useVoice hook with recording + TTS playback
  □ App.tsx layout wired with all components
  □ Startup sequence in daemon/src/index.ts (9-step boot)
  □ Demo seed script written and runnable
  □ Tunnel setup documented in README.md
  □ Demo script walk-through tested end-to-end
  □ tsc --noEmit passes with 0 errors in all packages
  □ IMPLEMENTATION_NOTES.md complete and accurate
  □ .env.example complete with all variables documented
That is your complete Claude Code engagement toolkit. 
