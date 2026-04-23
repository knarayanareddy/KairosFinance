🏦 KAIROS Finance — Complete Build Specification
The Always-On Background Financial Guardian | bunq Hackathon 7.0
AI-Agent Ready · Spec-Driven · Production-Grade
📋 SECTION 0: On the Altura Spec-Driven Approach — Should You Use It?
Short answer: Yes, absolutely — and it's a near-perfect fit for this project. Here's exactly how and why.

The Altura methodology's core insight is that human cognitive energy should be front-loaded into specs, not spread across code reviews. For a hackathon, this is counterintuitive at first glance — you have 24-48 hours, why write specs? The answer is: because you're using a coding agent to build everything. Without a spec, your coding agent will:

Hallucinate API contracts (especially the bunq signature requirement)
Duplicate logic across the webhook layer and the heartbeat loop
Create inconsistent database schemas between the Pattern Brain and the Risk Oracle
Build the wrong abstraction boundaries between read-only agents and write-enabled ones
The Altura approach directly solves every one of these failure modes. Here's how it maps to KAIROS Finance specifically:

Altura Step	KAIROS Finance Equivalent	Why Critical
Monorepo	Single repo: /daemon, /frontend, /specs, /memory	Coding agent needs full context to wire bunq webhooks to the heartbeat loop without cross-repo confusion
CLAUDE.md	Global rules: bunq signature requirements, plan-before-act enforcement, no direct payment execution without confirmation receipt	Prevents agent from skipping the confirmation gate on payments — a catastrophic bug
Markdown DSL	:::STRICT_REQUIREMENT::: blocks in every spec file	Forces agent to treat bunq API constraints as non-negotiable, not optional
Scout & Compress	Run before each agent task: "find existing bunq client code, SQLite schema, and agent loop before writing new code"	Prevents duplicate webhook handlers and duplicate DB schemas
Spec PR → Code	Write all specs in this document first → agent builds from specs	The 23-stage pipeline you already have here IS your spec
The one modification for a hackathon context: collapse Steps 5 and 6 (Spec → Review) into a single pass. Since you're solo or a small team, the spec review IS you reading this document. The rest of the pipeline runs at full speed.

This entire document IS your Spec Kit. Every component below is written at the Markdown DSL level of precision the coding agent needs. The folder structure maps directly to the /specs/ directory Altura describes.

📁 SECTION 1: Monorepo Structure
This is the first thing your coding agent should scaffold. Everything flows from this.

text

kairos-finance/
│
├── CLAUDE.md                          # Constitutional law for all AI agents
├── .env.example                       # All env vars documented
├── package.json                       # Turborepo root
├── turbo.json                         # Build pipeline config
│
├── specs/                             # Altura Spec-Kit (this document, exploded)
│   ├── 00-architecture.md
│   ├── 01-webhook-ingestion.md
│   ├── 02-kairos-heartbeat.md
│   ├── 03-pattern-brain.md
│   ├── 04-risk-oracle.md
│   ├── 05-dream-mode.md
│   ├── 06-intervention-engine.md
│   ├── 07-voice-pipeline.md
│   ├── 08-receipt-vision.md
│   ├── 09-frontend.md
│   └── data-model.md
│
├── packages/
│   ├── daemon/                        # The KAIROS daemon (Node.js + Fastify)
│   │   ├── src/
│   │   │   ├── index.ts               # Daemon entry point
│   │   │   ├── webhook/               # bunq webhook ingestion
│   │   │   ├── heartbeat/             # KAIROS loop
│   │   │   ├── pattern-brain/         # Hermes-style memory
│   │   │   ├── risk-oracle/           # Simulation sub-agents
│   │   │   ├── dream-mode/            # autoDream nightly pass
│   │   │   ├── intervention/          # Multi-modal output engine
│   │   │   ├── bunq/                  # bunq API client (typed)
│   │   │   ├── memory/                # SQLite + sqlite-vec layer
│   │   │   └── agents/                # Claude SDK agent wrappers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/                      # React + WebRTC voice UI
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── VoiceOrb.tsx       # Voice command trigger
│   │   │   │   ├── ReceiptScanner.tsx # Camera → Vision pipeline
│   │   │   │   ├── InterventionCard.tsx
│   │   │   │   ├── DreamBriefing.tsx  # Morning report
│   │   │   │   └── ConfirmationModal.tsx
│   │   │   └── hooks/
│   │   │       ├── useBunqWebSocket.ts
│   │   │       └── useVoice.ts
│   │   └── package.json
│   │
│   └── shared/                        # Shared types between daemon + frontend
│       ├── src/
│       │   ├── types/
│       │   │   ├── bunq.ts            # bunq API response types
│       │   │   ├── events.ts          # Internal event bus types
│       │   │   ├── interventions.ts   # Intervention payload types
│       │   │   └── memory.ts          # Pattern Brain schema types
│       └── package.json
📜 SECTION 2: CLAUDE.md — The Constitutional Law
This file goes in the repo root. It is the first thing your coding agent reads on every task. This is the Altura "Global System Rules" guardrail applied to KAIROS Finance.

Markdown

# KAIROS Finance — CLAUDE.md
# Constitutional rules for ALL AI agents working in this codebase.
# These rules are NON-NEGOTIABLE. Never deviate from them.

## 1. TYPESCRIPT RULES
- Strict TypeScript always. No `any` types. No implicit returns.
- Every bunq API response must be typed against /packages/shared/src/types/bunq.ts
- Every async function must handle errors explicitly (no unhandled promise rejections)

## 2. THE GOLDEN RULE: PLAN BEFORE ACT
# This is the most important rule in this codebase.
# Inspired by the Claude Code internal architecture (plan/act phase separation).
:::STRICT_REQUIREMENT:::
- The KAIROS daemon MUST NEVER execute a bunq payment, transfer, or mutation
  WITHOUT first generating a plan, narrating it to the user, and receiving
  explicit confirmation (voice "yes" OR button tap).
- Only ONE code path should ever call bunq POST /payment or POST /draft-payment:
  packages/daemon/src/bunq/execute.ts → executePlan()
- All other modules are READ-ONLY with respect to bunq mutations.
- If you are implementing any agent and are unsure whether to read or write:
  default to READ. Escalate to execute.ts with a confirmation gate.
:::END_STRICT_REQUIREMENT:::

## 3. BUNQ API RULES
- Every bunq API request MUST include: X-Bunq-Client-Signature header (RSA-SHA256)
- Session tokens expire. Always check token validity before API calls.
  Use packages/daemon/src/bunq/session.ts → getValidSession()
- Webhook callbacks from bunq originate from IP range 185.40.108.0/22 ONLY.
  Validate this on every incoming webhook or reject with 403.
- Never log full bunq API responses (contain PII). Log only event type + account ID.

## 4. AGENT ARCHITECTURE RULES
- Risk Oracle sub-agents are READ-ONLY. They call bunq GET endpoints only.
  They output INTERVENE | CLEAR. They never call executePlan().
- Pattern Brain writes only to SQLite (local). Never to bunq directly.
- Dream Mode runs in a forked process (child_process). 
  It MUST NOT block the main KAIROS heartbeat loop.
- Each agent has a bounded context window. Do NOT pass full transaction history
  to sub-agents. Pass only the minimum slice needed for their task.

## 5. MEMORY RULES
- SQLite database lives at: packages/daemon/data/kairos.db
- All schema migrations in: packages/daemon/src/memory/migrations/
- Vector embeddings use sqlite-vec extension. 
  Never use a cloud embedding API — use local-only Ollama nomic-embed-text.
- Pattern files (Markdown) live at: packages/daemon/data/patterns/
  Naming convention: {category}_{pattern-name}.md (e.g. habit_coffee_overrun.md)

## 6. SECURITY RULES
- API keys, bunq private keys, and session tokens NEVER in code. .env only.
- bunq private key (RSA) stored at: /run/secrets/bunq_private_key (prod)
  or BUNQ_PRIVATE_KEY env var (dev, base64-encoded PEM)
- Validate all webhook payloads against bunq's public key before processing.

## 7. CODE QUALITY RULES
- No console.log in production paths. Use the structured logger:
  import { logger } from '@kairos/shared/logger'
- All API call failures implement retry with exponential backoff (max 3 retries)
- If an API call fails after 3 retries, trigger INTERVENE with reason "API_UNAVAILABLE"
  and queue the action for retry when connectivity is restored.

## 8. SCOUT BEFORE YOU CODE
Before implementing ANY new file, run this mental check:
"Does equivalent logic already exist in /packages/daemon/src/bunq/,
 /packages/daemon/src/memory/, or /packages/shared/src/types/?"
If yes: REUSE and EXTEND. Do not create duplicate modules.
🗄️ SECTION 3: Complete Data Model
TypeScript

// packages/shared/src/types/memory.ts
// This is the canonical data model for the entire system.
// The coding agent must generate SQLite migrations from this.

// ─── TRANSACTIONS (warm-start cache from bunq) ────────────────────────────
interface Transaction {
  id: string;                    // bunq payment ID
  monetaryAccountId: number;
  amount: number;                // always in EUR cents (integer)
  currency: 'EUR';
  counterpartyName: string;
  counterpartyIban: string;
  description: string;
  merchantCategory?: string;     // MCC code if card transaction
  merchantName?: string;         // cleaned merchant name
  timestamp: number;             // Unix ms
  type: 'PAYMENT_IN' | 'PAYMENT_OUT' | 'CARD_TRANSACTION' | 'MUTATION';
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hourOfDay: number;             // 0-23
  embedding?: Float32Array;      // sqlite-vec embedding for similarity search
}

// ─── PATTERNS (Hermes-style Financial Skill Files) ────────────────────────
interface Pattern {
  id: string;                    // uuid
  slug: string;                  // e.g. 'habit_coffee_overrun'
  category: PatternCategory;
  markdownPath: string;          // path to .md file in data/patterns/
  triggerConditions: TriggerCondition[];
  confidenceScore: number;       // 0.0 - 1.0, increases with confirmed interventions
  hitCount: number;              // how many times this pattern fired
  confirmedCount: number;        // how many times user confirmed the intervention
  lastTriggered?: number;        // Unix ms
  createdAt: number;
  updatedAt: number;
}

type PatternCategory =
  | 'impulse_buy'
  | 'subscription_duplicate'
  | 'low_balance_risk'
  | 'salary_splurge'
  | 'rent_proximity_risk'
  | 'spending_velocity_anomaly'
  | 'recurring_bill_upcoming'
  | 'savings_goal_drift'
  | 'merchant_anomaly';

interface TriggerCondition {
  field: keyof Transaction | 'account_balance' | 'hour_of_day' | 'days_until_rent';
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'regex';
  value: string | number;
  logicalOperator?: 'AND' | 'OR';
}

// ─── USER PROFILE & GOALS ─────────────────────────────────────────────────
interface UserProfile {
  id: string;
  bunqUserId: number;
  monthlyIncomeEstimate: number; // EUR cents, updated on each salary detection
  salaryDayEstimate: number;     // day of month (1-31)
  rentAmount?: number;           // EUR cents
  rentDayEstimate?: number;      // day of month
  rentPayeeIban?: string;
  savingsGoals: SavingsGoal[];
  investmentPreferences: InvestmentPreferences;
  voiceEnabled: boolean;
  timezone: string;              // e.g. 'Europe/Amsterdam'
  createdAt: number;
  updatedAt: number;
}

interface SavingsGoal {
  id: string;
  name: string;                  // e.g. 'Holiday Fund'
  targetAmount: number;          // EUR cents
  currentAmount: number;         // EUR cents
  targetDate?: number;           // Unix ms
  bunqSavingsJarId?: number;    // linked bunq Savings Jar ID
}

interface InvestmentPreferences {
  riskTolerance: 'low' | 'medium' | 'high';
  preferGreenFunds: boolean;
  defaultSplit: {                // e.g. { savings: 30, investment: 70 }
    savings: number;
    investment: number;
  };
  linkedInvestmentIban?: string; // e.g. Peaks or DeGiro IBAN
}

// ─── INTERVENTIONS (audit log) ────────────────────────────────────────────
interface InterventionRecord {
  id: string;
  patternId?: string;            // which pattern triggered this
  triggerEventId?: string;       // which transaction triggered this
  type: InterventionType;
  modality: 'voice' | 'push' | 'soft_block' | 'draft_payment' | 'auto_save';
  message: string;
  riskScore: number;             // 0.0 - 1.0 from Risk Oracle
  oracleVotes: OracleVote[];    // individual sub-agent votes
  userResponse: 'confirmed' | 'dismissed' | 'pending' | 'timeout';
  timestamp: number;
  resolvedAt?: number;
}

type InterventionType =
  | 'LOW_BALANCE_ALERT'
  | 'IMPULSE_BUY_DETECTED'
  | 'SUBSCRIPTION_DUPLICATE'
  | 'RENT_PROXIMITY_WARNING'
  | 'SALARY_RECEIVED'
  | 'SPENDING_VELOCITY_ALERT'
  | 'MERCHANT_ANOMALY'
  | 'SAVINGS_GOAL_DRIFT'
  | 'DREAM_SUGGESTION';

interface OracleVote {
  agentName: string;
  verdict: 'INTERVENE' | 'CLEAR';
  reasoning: string;             // max 100 chars — bounded context output
  confidence: number;            // 0.0 - 1.0
}

// ─── PLANS (plan-before-act) ──────────────────────────────────────────────
interface ExecutionPlan {
  id: string;
  createdBy: 'voice_command' | 'intervention_engine' | 'dream_mode';
  steps: PlanStep[];
  narratedText: string;          // what the agent speaks back to user
  status: 'pending_confirmation' | 'confirmed' | 'executed' | 'cancelled';
  expiresAt: number;             // plans expire after 5 minutes
  executedAt?: number;
  createdAt: number;
}

interface PlanStep {
  order: number;
  type: 'bunq_read' | 'bunq_transfer' | 'bunq_savings_jar' | 'bunq_draft_payment';
  endpoint: string;
  payload?: Record<string, unknown>;
  description: string;           // human-readable: "Transfer €450 to Easy Savings jar"
  status: 'pending' | 'executed' | 'failed';
}

// ─── DREAM MODE OUTPUT ────────────────────────────────────────────────────
interface DreamSession {
  id: string;
  date: string;                  // YYYY-MM-DD
  memoriesConsolidated: number;
  patternsRefined: number;
  suggestionsGenerated: Suggestion[];
  morningBriefingText: string;   // narrated at app open
  delivered: boolean;
}

interface Suggestion {
  type: 'redirect_spend' | 'cancel_subscription' | 'increase_savings' | 'investment_opportunity';
  title: string;
  body: string;
  actionable: boolean;
  linkedPlan?: ExecutionPlan;
}
🌐 SECTION 4: The bunq Integration Layer
This is the most critical module to get right. A single missing header will cause every API call to fail silently. The coding agent must implement this before anything else.

4.1 Authentication & Session Management
text

:::STRICT_REQUIREMENT:::
bunq API authentication is a 3-step process. ALL THREE steps must complete
before any other API call is made. This is not optional.

Step 1: Installation
  POST /v1/installation
  Body: { "client_public_key": "<RSA-2048 public key PEM>" }
  Response: installation token + server public key
  Store: installationToken, serverPublicKey in SQLite

Step 2: Device Registration
  POST /v1/device-server
  Headers: X-Bunq-Client-Authentication: <installationToken>
  Body: { "description": "KAIROS Finance Daemon", "secret": "<API_KEY>",
          "permitted_ips": ["*"] }
  Response: device ID

Step 3: Session Creation
  POST /v1/session-server
  Headers: X-Bunq-Client-Authentication: <installationToken>
  Body: { "secret": "<API_KEY>" }
  Response: sessionToken (expires after 1 hour of inactivity)
  Store: sessionToken with expiry timestamp

Session refresh strategy:
  - Track last API call timestamp
  - If lastCall > 55 minutes ago: pre-emptively refresh session
  - On 401 response: refresh session and retry once
  - Implement in: packages/daemon/src/bunq/session.ts
:::END_STRICT_REQUIREMENT:::
4.2 Request Signing
text

:::STRICT_REQUIREMENT:::
EVERY bunq API request (except installation POST) must be signed.
Unsigned requests are rejected with 400.

Signature algorithm:
  1. Concatenate: HTTP_METHOD + "\n" + endpoint + "\n" + headers_sorted + "\n\n" + body
  2. Sign with RSA-SHA256 using bunq private key
  3. Base64 encode the signature
  4. Add header: X-Bunq-Client-Signature: <base64_signature>

Required headers on every signed request:
  - Cache-Control: no-cache
  - User-Agent: KAIROSFinance/1.0
  - X-Bunq-Language: en_US
  - X-Bunq-Region: nl_NL
  - X-Bunq-Client-Request-Id: <uuid-per-request>
  - X-Bunq-Geolocation: 0 0 0 0 000
  - X-Bunq-Client-Authentication: <sessionToken>
  - X-Bunq-Client-Signature: <computed>

Implement in: packages/daemon/src/bunq/signer.ts
Export: signRequest(method, endpoint, headers, body) => signedHeaders
:::END_STRICT_REQUIREMENT:::
4.3 Webhook Registration
TypeScript

// packages/daemon/src/bunq/webhooks.ts
// Run this ONCE at daemon startup to register all webhook categories.

const KAIROS_WEBHOOK_CATEGORIES = [
  'PAYMENT',                    // incoming + outgoing payments
  'MUTATION',                   // all account mutations
  'CARD_TRANSACTION_SUCCESSFUL', // card swipes
  'CARD_TRANSACTION_FAILED',    // declined cards (risk signal)
  'DRAFT_PAYMENT',              // draft payment status changes
  'SAVINGS',                    // savings jar changes
] as const;

// Registration endpoint (per-account):
// POST /v1/user/{userId}/monetary-account/{accountId}/notification-filter-url
// Body:
{
  "notification_filters": KAIROS_WEBHOOK_CATEGORIES.map(cat => ({
    "category": cat,
    "notification_target": process.env.WEBHOOK_URL  // must be HTTPS
  }))
}

// SECURITY: Only accept webhooks from bunq's IP range
// 185.40.108.0/22 — validate in middleware before processing
// Certificate pinning recommended for production
4.4 Webhook Payload Structure
TypeScript

// What bunq sends to your WEBHOOK_URL on every event
interface BunqWebhookPayload {
  NotificationUrl: {
    target_url: string;
    category: string;
    event_type: 'PAYMENT' | 'MUTATION' | 'CARD_TRANSACTION_SUCCESSFUL' | ...;
    object: {
      Payment?: BunqPayment;
      MasterCardAction?: BunqCardAction;
      // ... other event objects
    };
  };
}

interface BunqPayment {
  id: number;
  monetary_account_id: number;
  amount: { value: string; currency: 'EUR' };
  alias: { iban: string; display_name: string };
  counterparty_alias: { iban: string; display_name: string };
  description: string;
  type: 'BUNQ' | 'IDEAL' | 'SEPA' | 'SEPA_CREDIT_TRANSFER';
  sub_type: 'PAYMENT' | 'REQUEST' | 'BILLING';
  created: string; // ISO 8601
  updated: string;
}
4.5 Key bunq API Endpoints for KAIROS Finance
text

READ (safe, no confirmation needed):
  GET /v1/user/{userId}/monetary-account
    → list all accounts + balances

  GET /v1/user/{userId}/monetary-account/{accountId}/payment
    → transaction history (paginated, use ?count=200&older_id={id})

  GET /v1/user/{userId}/monetary-account/{accountId}/card
    → linked cards

  GET /v1/user/{userId}/monetary-account/{accountId}/savings-goal
    → savings goals + jars

WRITE (requires plan + confirmation gate — ALWAYS):
  POST /v1/user/{userId}/monetary-account/{accountId}/payment
    → execute a payment (requires plan confirmation)
    Body: { "amount": {"value": "100.00", "currency": "EUR"},
            "counterparty_alias": {"type": "IBAN", "value": "<iban>", "name": "<name>"},
            "description": "<description>" }

  POST /v1/user/{userId}/monetary-account/{accountId}/draft-payment
    → create a draft (no immediate execution, user must approve in app)
    → USE THIS for soft blocks — it holds the payment without executing

  POST /v1/user/{userId}/monetary-account/{accountId}/savings-goal
    → create a new savings goal/jar

  POST /v1/user/{userId}/monetary-account/{monetaryAccountId}/payment
    → internal transfer between own accounts (e.g. to savings jar)
⚡ SECTION 5: The KAIROS Heartbeat Loop
This is the central nervous system of the daemon. Everything else feeds into or out of this loop.

KAIROS, as revealed in the leaked source, is a persistent autonomous agent mode. It runs on periodic <tick> prompts, maintains daily append-only logs, subscribes to GitHub webhooks, and spawns background daemon workers. The source states it "becomes more autonomous when terminal unfocused." It includes a /dream skill and five-minute cron refreshes.
1

We adapt this architecture directly for financial context:

TypeScript

// packages/daemon/src/heartbeat/loop.ts
// The KAIROS Finance Heartbeat — runs every 30 seconds
// Inspired directly by the KAIROS <tick> prompt architecture from the leaked source.

import { Anthropic } from '@anthropic-ai/sdk';
import { getRecentTransactions } from '../memory/transactions';
import { getUserProfile } from '../memory/profile';
import { runRiskOracle } from '../risk-oracle';
import { getActivePatterns } from '../pattern-brain';
import { triggerIntervention } from '../intervention';
import { logger } from '@kairos/shared/logger';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const MAX_BLOCKING_BUDGET_MS = 15_000; // 15s — mirrors KAIROS's 15s budget from source

interface HeartbeatContext {
  tick: number;
  lastTransactionId?: string;
  lastBalance: number;
  activeInterventionId?: string;
}

export async function startHeartbeatLoop(userId: string): Promise<void> {
  const ctx: HeartbeatContext = {
    tick: 0,
    lastBalance: 0,
  };

  logger.info({ userId }, 'KAIROS heartbeat loop starting');

  setInterval(async () => {
    const tickStart = Date.now();
    ctx.tick++;

    try {
      await runHeartbeatTick(userId, ctx);
    } catch (err) {
      logger.error({ err, tick: ctx.tick }, 'Heartbeat tick failed');
    }

    const elapsed = Date.now() - tickStart;
    if (elapsed > MAX_BLOCKING_BUDGET_MS) {
      logger.warn({ elapsed, tick: ctx.tick }, 'Heartbeat exceeded blocking budget');
    }
  }, HEARTBEAT_INTERVAL_MS);
}

async function runHeartbeatTick(userId: string, ctx: HeartbeatContext): Promise<void> {
  // ── PHASE 1: RECALL ──────────────────────────────────────────────────────
  // Pull minimum necessary context — do NOT load all transactions every tick
  const [recentTransactions, userProfile, activePatterns, currentBalance] =
    await Promise.all([
      getRecentTransactions(userId, { limit: 50, since: 'last_tick' }),
      getUserProfile(userId),
      getActivePatterns(userId),
      getCurrentBalance(userId),
    ]);

  // ── PHASE 2: REASON ──────────────────────────────────────────────────────
  // Only run Risk Oracle if there's new activity OR balance changed
  const balanceChanged = Math.abs(currentBalance - ctx.lastBalance) > 0;
  const hasNewTransactions = recentTransactions.length > 0;

  if (!balanceChanged && !hasNewTransactions && ctx.tick % 10 !== 0) {
    // Skip full reasoning pass — nothing new happened
    // Still runs every 5 minutes (10 ticks × 30s) for proactive checks
    return;
  }

  // Run the Risk Oracle — spawns bounded sub-agents
  const oracleResult = await runRiskOracle({
    userId,
    transactions: recentTransactions,
    profile: userProfile,
    patterns: activePatterns,
    currentBalance,
    daysUntilRent: getDaysUntilRent(userProfile),
    currentHour: new Date().getHours(),
    currentDayOfWeek: new Date().getDay(),
  });

  // ── PHASE 3: REACT ───────────────────────────────────────────────────────
  if (oracleResult.verdict === 'INTERVENE' && !ctx.activeInterventionId) {
    const intervention = await triggerIntervention({
      userId,
      oracleResult,
      modality: selectModality(oracleResult, userProfile),
    });
    ctx.activeInterventionId = intervention.id;
    logger.info({ interventionId: intervention.id, type: oracleResult.interventionType },
      'Intervention triggered');
  }

  // Update context
  ctx.lastBalance = currentBalance;
  ctx.lastTransactionId = recentTransactions[0]?.id;

  // Persist tick to append-only daily log (mirrors KAIROS audit trail from leaked source)
  await appendToTickLog(userId, {
    tick: ctx.tick,
    timestamp: Date.now(),
    transactionsProcessed: recentTransactions.length,
    verdict: oracleResult.verdict,
    balanceEurCents: currentBalance,
  });
}
🧠 SECTION 6: The Pattern Brain (Hermes-Style Self-Improving Memory)
The Pattern Brain stores, retrieves, and refines behavioral patterns. It is the "memory" that makes KAIROS Finance smarter over time — unlike static rule systems.

6.1 Pattern File Format (Markdown DSL)
Markdown

<!-- data/patterns/impulse_buy_late_night_high_ticket.md -->
---
id: a3f2bc1d-...
slug: impulse_buy_late_night_high_ticket
category: impulse_buy
confidence: 0.87
hitCount: 14
confirmedCount: 12
created: 2026-04-20T22:14:00Z
updated: 2026-04-23T09:32:00Z
---

# Pattern: Late-Night High-Ticket Impulse Buy

## Trigger Conditions
- hour_of_day >= 21 AND hour_of_day <= 02
- amount > 5000 (EUR cents, i.e. €50+)
- merchant NOT IN user's recurring_merchants list
- day_of_week IN [4, 5, 6] (Thu, Fri, Sat)

## Context
This user consistently makes purchases above €50 at unfamiliar merchants
after 9pm on weekends. 12 of 14 such purchases were later flagged by
the user as impulse buys. Confidence: 87%.

## Intervention Template
"It's late and this is a new merchant for you. 
 You've flagged similar purchases before.
 Want to sleep on it? I'll save it as a draft."

## Action
- Create bunq draft payment (NOT confirmed payment)
- Notify via push + voice
- Offer "remind me tomorrow at 10am" option

## Refinement History
- 2026-04-21: Raised threshold from €30 to €50 after 3 false positives
- 2026-04-22: Added day_of_week condition to reduce weekday false positives
6.2 Pattern Storage & Vector Search
TypeScript

// packages/daemon/src/pattern-brain/store.ts
// SQLite + sqlite-vec for local-first, no-cloud pattern retrieval

import Database from 'better-sqlite3';
import { sqliteVec } from 'sqlite-vec';

// Schema (run via migration):
const PATTERNS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    markdown_path TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    hit_count INTEGER DEFAULT 0,
    confirmed_count INTEGER DEFAULT 0,
    trigger_conditions_json TEXT NOT NULL,
    last_triggered INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS pattern_embeddings
    USING vec0(embedding FLOAT[768]);
  -- 768 dimensions for nomic-embed-text (local Ollama)
`;

// After each confirmed intervention: refine the pattern
export async function refinePattern(
  patternId: string,
  userResponse: 'confirmed' | 'dismissed'
): Promise<void> {
  const db = getDb();

  db.prepare(`
    UPDATE patterns
    SET
      hit_count = hit_count + 1,
      confirmed_count = confirmed_count + CASE WHEN ? = 'confirmed' THEN 1 ELSE 0 END,
      confidence = CAST(confirmed_count AS REAL) / CAST(hit_count AS REAL),
      updated_at = ?
    WHERE id = ?
  `).run(userResponse, Date.now(), patternId);

  // If confidence drops below 0.3: flag pattern for review / soft-disable
  // If confidence above 0.9: promote to high-priority (intervene earlier)
}
6.3 New Pattern Creation (Self-Improving Loop)
TypeScript

// packages/daemon/src/pattern-brain/learn.ts
// After a SUCCESSFUL intervention (user confirmed it was correct):
// Check if this was a one-off or represents a new pattern worth persisting.

export async function maybeCreateNewPattern(
  intervention: InterventionRecord,
  transactions: Transaction[]
): Promise<void> {
  // Only create patterns from confirmed interventions
  if (intervention.userResponse !== 'confirmed') return;

  // Ask Claude: "Does this intervention represent a repeatable pattern?"
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    system: `You are the Pattern Brain for a financial guardian AI.
             Your job is to analyze a confirmed financial intervention
             and determine if it represents a repeatable spending pattern.
             Respond in JSON only.`,
    messages: [{
      role: 'user',
      content: `
        Intervention type: ${intervention.type}
        Trigger transaction: ${JSON.stringify(intervention.triggerEventId)}
        Recent transaction context: ${JSON.stringify(transactions.slice(0, 10))}
        
        Is this a repeatable pattern? If yes, what are the trigger conditions?
        
        Respond: {
          "isPattern": boolean,
          "patternName": string,
          "category": PatternCategory,
          "triggerConditions": TriggerCondition[],
          "interventionTemplate": string
        }
      `
    }]
  });

  const result = JSON.parse(response.content[0].text);
  if (result.isPattern) {
    await createPatternFromLearning(result);
    logger.info({ patternName: result.patternName }, 'New pattern learned from intervention');
  }
}
🔮 SECTION 7: The Risk Oracle (Multi-Agent Simulation)
The Risk Oracle is a read-only multi-agent system. It spawns bounded sub-agents, each analyzing a different risk dimension, and aggregates their votes.

KAIROS allows Claude Code to operate as an always-on background agent. It handles background sessions and employs a process called autoDream. In this mode, the agent performs "memory consolidation" while the user is idle. The autoDream logic merges disparate observations, removes logical contradictions, and converts vague insights into absolute facts, ensuring that when the user returns, the agent's context is clean and highly relevant. The implementation of a forked subagent to run these tasks reveals a mature engineering approach to preventing the main agent's "train of thought" from being corrupted by its own maintenance routines.
2

We apply this same forked-subagent principle to our risk analysis:

TypeScript

// packages/daemon/src/risk-oracle/index.ts
// Spawns independent sub-agents, each with a BOUNDED context window.
// Only the aggregated result propagates — never the full sub-agent reasoning.

const ORACLE_AGENTS = [
  'balance-sentinel',      // Is current balance dangerously low?
  'velocity-analyzer',     // Is spend rate abnormally high?
  'pattern-matcher',       // Does this match a known bad pattern?
  'subscription-watcher',  // Is this a duplicate subscription?
  'rent-proximity-guard',  // Is rent at risk?
] as const;

export interface OracleInput {
  userId: string;
  transactions: Transaction[];      // last 50 only — bounded
  profile: UserProfile;
  patterns: Pattern[];
  currentBalance: number;
  daysUntilRent: number;
  currentHour: number;
  currentDayOfWeek: number;
}

export interface OracleResult {
  verdict: 'INTERVENE' | 'CLEAR';
  riskScore: number;                // 0.0 - 1.0
  interventionType?: InterventionType;
  votes: OracleVote[];
  reasoning: string;                // max 200 chars — brief output mode
}

export async function runRiskOracle(input: OracleInput): Promise<OracleResult> {
  // Run all agents in parallel — each gets ONLY the data it needs
  const votes = await Promise.all(
    ORACLE_AGENTS.map(agentName => runOracleAgent(agentName, input))
  );

  const interventionVotes = votes.filter(v => v.verdict === 'INTERVENE');
  const riskScore = interventionVotes.reduce((sum, v) => sum + v.confidence, 0) / votes.length;

  // Threshold: intervene if 3+ agents vote INTERVENE OR riskScore > 0.7
  const shouldIntervene = interventionVotes.length >= 3 || riskScore > 0.7;

  return {
    verdict: shouldIntervene ? 'INTERVENE' : 'CLEAR',
    riskScore,
    interventionType: shouldIntervene ? classifyInterventionType(votes) : undefined,
    votes,
    reasoning: synthesizeReasoning(votes),
  };
}

async function runOracleAgent(
  agentName: typeof ORACLE_AGENTS[number],
  input: OracleInput
): Promise<OracleVote> {
  const client = new Anthropic();

  // Each agent gets a MINIMAL context slice — not the full input
  const agentContext = buildAgentContext(agentName, input);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',   // Fast + cheap for sub-agents
    max_tokens: 150,              // Bounded output — brief mode
    system: getAgentSystemPrompt(agentName),
    messages: [{
      role: 'user',
      content: JSON.stringify(agentContext)
    }]
  });

  // Force structured output
  const result = JSON.parse(response.content[0].text) as {
    verdict: 'INTERVENE' | 'CLEAR';
    confidence: number;
    reasoning: string;
  };

  return {
    agentName,
    verdict: result.verdict,
    confidence: result.confidence,
    reasoning: result.reasoning.slice(0, 100), // hard cap
  };
}

// Example agent context builder — each agent sees only what it needs:
function buildAgentContext(
  agentName: typeof ORACLE_AGENTS[number],
  input: OracleInput
): Record<string, unknown> {
  switch (agentName) {
    case 'balance-sentinel':
      return {
        currentBalanceEur: input.currentBalance / 100,
        upcomingFixedCosts: estimateUpcomingFixedCosts(input.transactions),
        daysUntilRent: input.daysUntilRent,
        rentAmountEur: (input.profile.rentAmount ?? 0) / 100,
      };
    case 'velocity-analyzer':
      return {
        last7DaysSpend: calculateSpend(input.transactions, 7),
        prev7DaysSpend: calculateSpend(input.transactions, 14, 7),
        last24HoursSpend: calculateSpend(input.transactions, 1),
        avgDailySpend: calculateAvgDailySpend(input.transactions, 30),
      };
    case 'pattern-matcher':
      return {
        activePatterns: input.patterns.map(p => ({
          slug: p.slug,
          conditions: p.triggerConditions,
          confidence: p.confidenceScore,
        })),
        currentHour: input.currentHour,
        currentDayOfWeek: input.currentDayOfWeek,
        latestTransaction: input.transactions[0],
      };
    // ... etc
  }
}
🌙 SECTION 8: Dream Mode (autoDream)
The services/autoDream/ directory contains a memory consolidation system that runs during idle time. Claude literally "dreams," reorganizing and compressing accumulated session knowledge.
3

The scaffolding includes a /dream skill for nightly memory distillation, GitHub webhook subscriptions, and background daemon workers on a five-minute cron refresh. The nightly "dreaming" phase is handled by a separate subsystem called autoDream. The autoDream logic merges disparate observations, removes logical contradictions, and converts vague insights into absolute facts — pruning the memory store to ≤200 lines / 25KB per the source constraints.
4

We apply this directly as a nightly financial consolidation pass:

TypeScript

// packages/daemon/src/dream-mode/index.ts
// CRITICAL: This runs in a FORKED CHILD PROCESS.
// It must NEVER block the main heartbeat loop.
// Inspired by KAIROS's forked subagent pattern for memory consolidation.

import { fork } from 'child_process';
import * as cron from 'node-cron';

// Schedule: 2am every night in user's timezone
export function scheduleDreamMode(userId: string, timezone: string): void {
  cron.schedule('0 2 * * *', async () => {
    logger.info({ userId }, 'Dream Mode starting in forked process');

    const child = fork('./src/dream-mode/worker.js', [], {
      env: { ...process.env, DREAM_USER_ID: userId },
      silent: true,
    });

    child.on('message', (result: DreamSession) => {
      storeDreamSession(result);
      logger.info({ sessionId: result.id, suggestions: result.suggestionsGenerated.length },
        'Dream Mode complete');
    });

    child.on('error', (err) => {
      logger.error({ err }, 'Dream Mode worker crashed');
    });

    // Kill if it runs more than 10 minutes (safeguard)
    setTimeout(() => {
      if (!child.killed) child.kill();
    }, 10 * 60 * 1000);

  }, { timezone });
}

// packages/daemon/src/dream-mode/worker.ts
// Runs in the child process — full memory consolidation pass

async function runDreamSession(userId: string): Promise<DreamSession> {
  const client = new Anthropic();

  // Load the FULL week's data — only Dream Mode gets this much context
  const weekTransactions = await getTransactions(userId, { days: 7 });
  const allPatterns = await getAllPatterns(userId);
  const userProfile = await getUserProfile(userId);
  const savingsGoals = userProfile.savingsGoals;

  // Phase 1: Consolidate patterns (remove contradictions, merge similar patterns)
  const consolidationResponse = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    system: `You are the Dream Mode financial memory consolidation system.
             You run nightly to clean, consolidate, and improve the agent's
             financial understanding of this user.
             
             Your tasks:
             1. Review all patterns — identify any that contradict each other, merge them
             2. Identify any new patterns from this week's transactions
             3. Update confidence scores based on recent behavior
             4. Generate 3 specific, actionable financial suggestions
             5. Write a morning briefing (max 3 sentences, conversational)
             
             Output as JSON matching DreamSession schema.
             Memory constraint: suggestions must be specific to actual transaction data.
             No generic advice.`,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        weekTransactions: weekTransactions.slice(0, 100),
        patterns: allPatterns,
        savingsGoals,
        monthlyIncomeEstimate: userProfile.monthlyIncomeEstimate / 100,
      })
    }]
  });

  const session: DreamSession = JSON.parse(consolidationResponse.content[0].text);

  // Phase 2: Write refined patterns back to disk
  for (const refinedPattern of session.memoriesConsolidated > 0 ? await getRefinedPatterns() : []) {
    await writePatternFile(refinedPattern);
  }

  return session;
}
🎤 SECTION 9: Voice Pipeline (Hear → Plan → Confirm → Execute)
This covers hackathon pillar #1: "Hear a command to invest a bonus and execute it."

TypeScript

// packages/daemon/src/agents/voice-agent.ts
// The plan-before-act architecture — the most important safety pattern.
// Claude Code's leaked internals revealed: planning and execution are ALWAYS separate phases.

export async function processVoiceCommand(
  audioBuffer: Buffer,
  userId: string
): Promise<{ plan: ExecutionPlan; narratedResponse: string }> {

  // ── PHASE 1: TRANSCRIBE ──────────────────────────────────────────────────
  const transcript = await transcribeAudio(audioBuffer);
  logger.info({ transcript }, 'Voice command transcribed');

  // ── PHASE 2: READ CURRENT STATE (read-only) ──────────────────────────────
  const [accounts, profile, goals] = await Promise.all([
    bunqClient.getMonetaryAccounts(userId),
    getUserProfile(userId),
    getUserProfile(userId).then(p => p.savingsGoals),
  ]);

  const context = {
    transcript,
    accounts: accounts.map(a => ({
      id: a.id,
      description: a.description,
      balanceEur: a.balance.value,
    })),
    investmentPreferences: profile.investmentPreferences,
    savingsGoals: goals,
  };

  // ── PHASE 3: PLAN (Claude creates plan — NO execution yet) ───────────────
  const client = new Anthropic();
  const planResponse = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    system: `You are the KAIROS Finance planning agent.
             
             CRITICAL RULE: You are in PLANNING MODE ONLY.
             You create plans. You NEVER execute them.
             Plans are only executed after explicit user confirmation.
             
             Given the user's voice command and their current account state,
             create a step-by-step execution plan.
             
             Rules:
             - Always calculate exact EUR amounts (never "some" or "a portion")
             - Always reference specific account IDs from the provided accounts list
             - Include a human-readable narration the TTS engine will speak
             - Plans expire in 5 minutes
             - If the command is ambiguous, ask for clarification (don't guess)
             
             Output: JSON matching ExecutionPlan schema.
             The narratedText field must sound natural when spoken aloud.`,
    messages: [{
      role: 'user',
      content: JSON.stringify(context)
    }]
  });

  const plan: ExecutionPlan = {
    ...JSON.parse(planResponse.content[0].text),
    id: generateId(),
    status: 'pending_confirmation',
    createdBy: 'voice_command',
    expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: Date.now(),
  };

  // Save plan — it waits for confirmation
  await savePlan(plan);

  // Convert narration to speech
  const speechBuffer = await textToSpeech(plan.narratedText);

  return { plan, narratedResponse: plan.narratedText };
}

// ── PHASE 4: EXECUTE (only called after user says "yes" or taps confirm) ──
// packages/daemon/src/bunq/execute.ts
// This is the ONLY file in the entire codebase that calls bunq write endpoints.

export async function executePlan(planId: string, userId: string): Promise<void> {
  const plan = await getPlan(planId);

  if (!plan) throw new Error(`Plan ${planId} not found`);
  if (plan.status !== 'pending_confirmation') throw new Error('Plan not in confirmable state');
  if (Date.now() > plan.expiresAt) throw new Error('Plan expired — please restate command');

  // Mark as confirmed
  await updatePlanStatus(planId, 'confirmed');

  // Execute steps sequentially (not in parallel — financial operations must be ordered)
  for (const step of plan.steps) {
    try {
      await executeStep(step, userId);
      await updateStepStatus(planId, step.order, 'executed');
      logger.info({ planId, step: step.order, description: step.description }, 'Step executed');
    } catch (err) {
      await updateStepStatus(planId, step.order, 'failed');
      // Halt on first failure — do not continue partial execution
      throw new Error(`Step ${step.order} failed: ${err.message}`);
    }
  }

  await updatePlanStatus(planId, 'executed');

  // Update Pattern Brain with user's confirmed preferences
  await updateUserPreferences(userId, plan);
}
📸 SECTION 10: Receipt Vision Pipeline
Covers hackathon pillar #2: "See a receipt and instantly categorize it."

TypeScript

// packages/daemon/src/agents/receipt-agent.ts
// Multi-stage pipeline with self-verification

export interface ReceiptExtractionResult {
  merchantName: string;
  merchantCategory: string;
  amount: number;          // EUR cents
  currency: string;
  date: string;            // ISO 8601
  lineItems?: Array<{ description: string; amount: number }>;
  taxAmount?: number;
  confidence: number;      // 0.0 - 1.0
  anomalyFlag?: string;    // if something looks wrong
}

export async function processReceiptImage(
  imageBase64: string,
  userId: string
): Promise<{ extraction: ReceiptExtractionResult; plan?: ExecutionPlan }> {
  const client = new Anthropic();

  // ── STAGE 1: Vision Extraction ───────────────────────────────────────────
  const extractionResponse = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64,
          }
        },
        {
          type: 'text',
          text: `Extract all data from this receipt.
                 Return ONLY valid JSON matching this schema:
                 {
                   "merchantName": string,
                   "merchantCategory": string (e.g. "Food & Drink", "Transport", "Shopping"),
                   "amount": number (total in EUR cents, integer),
                   "currency": string,
                   "date": string (ISO 8601),
                   "lineItems": [{ "description": string, "amount": number }],
                   "taxAmount": number | null,
                   "confidence": number (0.0-1.0)
                 }
                 If you cannot read a field clearly, set confidence lower.`
        }
      ]
    }]
  });

  const extraction: ReceiptExtractionResult = JSON.parse(extractionResponse.content[0].text);

  // ── STAGE 2: Self-Verification ────────────────────────────────────────────
  // Check: does sum of line items ≈ total?
  if (extraction.lineItems && extraction.lineItems.length > 0) {
    const lineItemsTotal = extraction.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discrepancy = Math.abs(lineItemsTotal - extraction.amount);
    if (discrepancy > 100) { // > €1 discrepancy
      extraction.anomalyFlag = `Line items sum (€${lineItemsTotal/100}) doesn't match total (€${extraction.amount/100})`;
      extraction.confidence *= 0.7;
    }
  }

  // ── STAGE 3: Merchant Anomaly Check ─────────────────────────────────────
  const userMerchants = await getKnownMerchants(userId);
  const isNewMerchant = !userMerchants.includes(extraction.merchantName);
  if (isNewMerchant && extraction.amount > 5000) {
    extraction.anomalyFlag = `First time at ${extraction.merchantName}`;
  }

  // ── STAGE 4: Auto-Categorize & Suggest bunq Action ──────────────────────
  const profile = await getUserProfile(userId);
  const relevantJar = findRelevantSavingsJar(extraction.merchantCategory, profile.savingsGoals);

  let plan: ExecutionPlan | undefined;
  if (relevantJar) {
    // Suggest auto-logging to the relevant savings jar
    plan = {
      id: generateId(),
      createdBy: 'intervention_engine',
      status: 'pending_confirmation',
      narratedText: `I see a receipt from ${extraction.merchantName} for €${extraction.amount/100}. 
                     Want me to log this to your ${relevantJar.name} jar?`,
      steps: [{
        order: 1,
        type: 'bunq_transfer',
        description: `Note receipt: ${extraction.merchantName} €${extraction.amount/100}`,
        endpoint: `/v1/user/{userId}/monetary-account/{accountId}/payment`,
        payload: {
          description: `Receipt: ${extraction.merchantName} - ${extraction.date}`,
          // Internal transfer to update jar balance tracking
        },
        status: 'pending',
      }],
      expiresAt: Date.now() + 5 * 60 * 1000,
      createdAt: Date.now(),
    };
    await savePlan(plan);
  }

  return { extraction, plan };
}
🚨 SECTION 11: The Intervention Engine
TypeScript

// packages/daemon/src/intervention/index.ts

type InterventionModality = 'voice' | 'push' | 'soft_block' | 'draft_payment';

function selectModality(
  oracleResult: OracleResult,
  profile: UserProfile
): InterventionModality {
  // Decision matrix — determines HOW to intervene
  if (oracleResult.riskScore > 0.85) return 'soft_block';    // High risk: hold the payment
  if (oracleResult.interventionType === 'SALARY_RECEIVED') return 'voice';
  if (oracleResult.interventionType === 'IMPULSE_BUY_DETECTED') return 'draft_payment';
  if (profile.voiceEnabled && isActiveHours()) return 'voice';
  return 'push';
}

// Intervention type → specific action map
const INTERVENTION_HANDLERS: Record<InterventionType, InterventionHandler> = {
  LOW_BALANCE_ALERT: async (ctx) => {
    // Voice: "Hey, you have €X until rent in Y days. Want to pause spending?"
    await sendVoiceAlert(ctx.userId, generateLowBalanceMessage(ctx));
  },

  IMPULSE_BUY_DETECTED: async (ctx) => {
    // Create draft payment (NOT confirmed) — holds without blocking
    const draft = await bunqClient.createDraftPayment(ctx.userId, {
      amount: ctx.transactionAmount,
      counterpartyIban: ctx.counterpartyIban,
      description: ctx.description,
    });
    await sendPushNotification(ctx.userId, {
      title: '⏸️ Purchase paused',
      body: `€${ctx.transactionAmount/100} held at ${ctx.merchantName}. Tap to review.`,
      actionUrl: `/interventions/${ctx.interventionId}`,
    });
  },

  SALARY_RECEIVED: async (ctx) => {
    // Proactive: "Your salary arrived! Want to run your usual savings split?"
    const investmentPlan = await buildInvestmentPlan(ctx.userId, ctx.transactionAmount);
    await sendVoiceAlert(ctx.userId, investmentPlan.narratedText);
  },

  SUBSCRIPTION_DUPLICATE: async (ctx) => {
    await sendPushNotification(ctx.userId, {
      title: '🔄 Duplicate subscription?',
      body: `${ctx.merchantName} charged again. Was this expected?`,
      actions: ['Yes, keep it', 'Flag for review'],
    });
  },

  DREAM_SUGGESTION: async (ctx) => {
    // Morning briefing delivery
    await sendVoiceAlert(ctx.userId, ctx.dreamSuggestion.morningBriefingText);
  },
};
🖥️ SECTION 12: Frontend Architecture
TypeScript

// packages/frontend/src/App.tsx
// Minimal, demo-optimized React UI

// Key components and their responsibilities:

// 1. VoiceOrb.tsx — The hero UI element
// - Large animated orb in center of screen
// - Tap to activate WebRTC microphone
// - Streams audio to /api/voice endpoint
// - Shows transcription in real-time
// - Plays back TTS response automatically
// - Displays plan for confirmation before execution
// - One-tap "Confirm" or "Cancel" buttons on plan cards

// 2. InterventionCard.tsx — Real-time intervention display
// - Slides up from bottom when Risk Oracle fires
// - Shows which agents voted INTERVENE (with reasoning)
// - Risk score visualization
// - Action buttons: "Got it", "Dismiss", "Tell me more"

// 3. ReceiptScanner.tsx — Camera integration
// - Camera API access (getUserMedia)
// - Photo capture → base64 → /api/receipt POST
// - Shows extraction results inline
// - Savings jar suggestion with one-tap confirm

// 4. DreamBriefing.tsx — Morning report modal
// - Appears on first app open after 6am if dream session completed
// - Auto-plays voice briefing
// - Shows 3 suggestions as tappable cards

// WebSocket connection for real-time intervention push:
// packages/frontend/src/hooks/useBunqWebSocket.ts
export function useBunqWebSocket(userId: string) {
  useEffect(() => {
    const ws = new WebSocket(`wss://${API_HOST}/ws/${userId}`);

    ws.onmessage = (event) => {
      const intervention: InterventionRecord = JSON.parse(event.data);
      // Trigger InterventionCard popup
      setActiveIntervention(intervention);
      // Play voice alert if voice-enabled
      if (intervention.modality === 'voice') {
        playVoiceAlert(intervention.message);
      }
    };

    return () => ws.close();
  }, [userId]);
}
🚀 SECTION 13: API Routes (Fastify)
TypeScript

// packages/daemon/src/index.ts — All API routes the frontend calls

const routes = [
  // Webhook receiver (bunq → daemon)
  POST  /webhooks/bunq
    → validate IP (185.40.108.0/22)
    → validate bunq signature
    → emit to internal event bus
    → 200 OK (must respond < 3s or bunq retries)

  // Voice command
  POST  /api/voice
    Body: multipart/form-data { audio: File }
    → transcribe → plan → return { plan, narratedText, audioBase64 }

  // Plan confirmation (user taps "Confirm")
  POST  /api/plans/:planId/confirm
    → executePlan(planId) → return execution receipts

  // Receipt upload
  POST  /api/receipt
    Body: multipart/form-data { image: File }
    → processReceiptImage → return { extraction, plan? }

  // Intervention response
  POST  /api/interventions/:id/respond
    Body: { response: 'confirmed' | 'dismissed' }
    → refinePattern → return acknowledgment

  // Real-time WebSocket (daemon → frontend push)
  WS    /ws/:userId
    → receives intervention events from internal event bus
    → forwards to connected frontend clients

  // Status / health (for demo)
  GET   /api/status
    → returns { heartbeatTick, lastIntervention, patternCount, dreamMode: boolean }
]
📐 SECTION 14: Complete Tech Stack Decision Matrix
Layer	Technology	Why This Specific Choice
Primary LLM	claude-opus-4-5	Best reasoning for planning agent and dream mode
Sub-Agent LLM	claude-haiku-4-5	Fast + cheap for Risk Oracle's 5 parallel agents
Vision	claude-opus-4-5 (vision)	Same API, no additional integration needed
Voice STT	OpenAI Whisper (local, via whisper.cpp)	No API cost, no latency, works offline
Voice TTS	ElevenLabs API or espeak-ng (local fallback)	ElevenLabs for demo quality, espeak for offline
Daemon Runtime	Node.js 22 + Fastify	Non-blocking I/O ideal for heartbeat loop
Agent SDK	@anthropic-ai/sdk (TypeScript)	Native streaming + tool use
Database	better-sqlite3 + sqlite-vec	Local-first, zero cloud deps, vector search
Memory	SQLite (transactions, patterns, plans, interventions)	Single file, no separate DB server needed
Embeddings	ollama + nomic-embed-text	100% local, no cloud API
Scheduler	node-cron	Dream Mode scheduling
Process fork	Node.js child_process.fork()	Dream Mode isolation (mirrors KAIROS pattern)
Frontend	React 19 + Vite + Tailwind CSS + shadcn/ui	Fast to build, looks polished
Real-time push	WebSocket (native ws)	Interventions need sub-100ms delivery
Camera API	getUserMedia (browser native)	Receipt scanning, no library needed
Monorepo	Turborepo	Fast builds, enforced boundaries
Deployment	AWS Lambda (webhook) + EC2 t3.small (daemon)	bunq provides AWS credits
Tunneling (dev)	ngrok or cloudflared	Expose webhook endpoint during hackathon
bunq SDK	Custom TypeScript client (not official SDK)	Official SDK is Python — we need TS control
🗺️ SECTION 15: Build Order for Your Coding Agent
This is the exact task sequence to hand to your coding agent. Each task maps to a spec file. Follow this order — later tasks depend on earlier ones.

text

PHASE 0: Scaffolding (30 mins)
  Task 0.1: Scaffold monorepo with Turborepo
            → Create all directories from Section 1
            → Install all dependencies
            → Configure TypeScript strict mode everywhere

  Task 0.2: Create CLAUDE.md from Section 2
  Task 0.3: Create all shared types from Section 3 (data-model.ts)
  Task 0.4: Create SQLite migrations from data model
            → transactions table
            → patterns table + pattern_embeddings virtual table
            → user_profiles table
            → interventions table
            → execution_plans table
            → dream_sessions table
            → tick_logs table (append-only)

PHASE 1: bunq Integration (45 mins)
  Task 1.1: Implement bunq authentication flow (Section 4.1)
            → Installation → Device Registration → Session Creation
            → Session refresh with 55-minute pre-emptive refresh
  Task 1.2: Implement request signer (Section 4.2)
            → RSA-SHA256 signing
            → All required headers
  Task 1.3: Implement webhook registration (Section 4.3)
            → Register all KAIROS_WEBHOOK_CATEGORIES on startup
  Task 1.4: Implement webhook receiver route (Section 13)
            → IP validation (185.40.108.0/22)
            → Signature verification
            → Parse BunqWebhookPayload → internal event bus
  Task 1.5: Implement bunq read client
            → getMonetaryAccounts, getTransactions, getCurrentBalance
            → Pagination support for transaction history
  Task 1.6: Implement execute.ts (Section 9, Phase 4)
            → executePlan() — the ONE write gateway
            → Sequential step execution with error halting

PHASE 2: Memory Layer (30 mins)
  Task 2.1: Implement transaction store (Section 6.2)
            → saveTransaction, getRecentTransactions, getTransactions
            → Warm-start on daemon startup: fetch last 200 transactions
  Task 2.2: Implement pattern store (Section 6.2)
            → createPattern, getActivePatterns, refinePattern
            → Write/read pattern Markdown files
  Task 2.3: Implement profile store
            → createUserProfile, getUserProfile, updateUserPreferences
  Task 2.4: Implement intervention store
            → saveIntervention, getIntervention, updateInterventionResponse
  Task 2.5: Implement plan store
            → savePlan, getPlan, updatePlanStatus, expirePlans (cleanup job)

PHASE 3: KAIROS Heartbeat (30 mins)
  Task 3.1: Implement heartbeat loop (Section 5)
            → startHeartbeatLoop with 30s interval
            → Recall → Reason → React phases
            → 15s blocking budget enforcement
            → Append-only tick log
  Task 3.2: Wire heartbeat to event bus
            → On webhook event: immediately trigger tick (don't wait 30s)

PHASE 4: Risk Oracle (45 mins)
  Task 4.1: Implement all 5 oracle agents (Section 7)
            → balance-sentinel, velocity-analyzer, pattern-matcher,
               subscription-watcher, rent-proximity-guard
            → Each with bounded context builder
            → claude-haiku-4-5, max_tokens: 150, JSON output
  Task 4.2: Implement oracle aggregator
            → Vote counting → riskScore → INTERVENE/CLEAR verdict
  Task 4.3: Seed default patterns (5 initial patterns)
            → impulse_buy_late_night_high_ticket.md
            → subscription_duplicate.md
            → low_balance_before_rent.md
            → salary_day_splurge.md
            → spending_velocity_anomaly.md

PHASE 5: Dream Mode (30 mins)
  Task 5.1: Implement dream worker (Section 8)
            → claude-opus-4-5 consolidation pass
            → Pattern refinement + suggestion generation
            → Morning briefing text generation
  Task 5.2: Implement dream scheduler
            → node-cron 2am schedule
            → child_process.fork() isolation
            → 10-minute kill safeguard

PHASE 6: Pattern Brain Learning (20 mins)
  Task 6.1: Implement maybeCreateNewPattern (Section 6.3)
            → Called after every confirmed intervention
            → Claude decides if pattern is worth persisting
            → Writes new pattern Markdown file

PHASE 7: Intervention Engine (30 mins)
  Task 7.1: Implement selectModality decision matrix (Section 11)
  Task 7.2: Implement all intervention handlers
            → LOW_BALANCE_ALERT, IMPULSE_BUY_DETECTED, SALARY_RECEIVED,
               SUBSCRIPTION_DUPLICATE, DREAM_SUGGESTION
  Task 7.3: Implement WebSocket push to frontend

PHASE 8: Voice Pipeline (30 mins)
  Task 8.1: Implement voice route POST /api/voice (Section 9)
            → Whisper.cpp transcription
            → Planning agent (claude-opus-4-5)
            → Save plan with pending_confirmation status
            → Return plan + TTS audio
  Task 8.2: Implement plan confirmation route POST /api/plans/:id/confirm
            → executePlan() call
            → Return execution receipts

PHASE 9: Receipt Pipeline (20 mins)
  Task 9.1: Implement receipt route POST /api/receipt (Section 10)
            → Vision extraction (claude-opus-4-5)
            → Self-verification (line items sum check)
            → Merchant anomaly check
            → Savings jar suggestion + plan creation

PHASE 10: Frontend (60 mins)
  Task 10.1: VoiceOrb component + useVoice hook
  Task 10.2: InterventionCard component + useBunqWebSocket hook
  Task 10.3: ReceiptScanner component
  Task 10.4: DreamBriefing component
  Task 10.5: ConfirmationModal (plan display + one-tap confirm)
  Task 10.6: App.tsx — wire all components, WebSocket connection

PHASE 11: Integration + Demo Polish (30 mins)
  Task 11.1: Startup sequence
             → Auth → webhook registration → warm-start transactions
             → Start heartbeat → schedule dream mode
  Task 11.2: Demo data seeding
             → Inject realistic transaction history for demo
             → Pre-seed 3 patterns with high confidence scores
             → Simulate salary + upcoming rent scenario
  Task 11.3: ngrok/cloudflared tunnel for webhook endpoint
🎬 SECTION 16: The Demo Script (3 Minutes)
This is what you show the judges. Every second is choreographed.

text

[0:00 - 0:30] THE SETUP
Show the app open. KAIROS status: "Watching • 847 transactions analyzed • 7 patterns learned"
Show the morning Dream Briefing already delivered:
"Good morning. You spent €340 on food delivery this month — €140 over your usual.
 Your rent is in 6 days and you have €1,847. Looking comfortable.
 I have one suggestion when you're ready."

[0:30 - 1:00] PILLAR 2: RECEIPT VISION
Tap the camera icon. Point phone at a printed receipt (pre-prepared).
Watch extraction appear: Merchant → Ikea. Amount → €234.50. Category → Home.
KAIROS: "First time at IKEA this month. Log €234.50 to your Home savings jar?"
Tap confirm. bunq transfer executes. "Done ✓"

[1:00 - 1:45] PILLAR 1: VOICE INVESTMENT
Tap the voice orb. Speak:
"My bonus just arrived — move 30% to savings and invest the rest in green funds"
Watch transcription appear in real time.
KAIROS speaks back: "Got it. €450 to your Easy Savings jar, €1,050 queued 
to your Peaks account. Shall I proceed?"
Tap "Confirm". Both bunq API calls execute. Confirmation read aloud.
Memory updated: "Bonus split preference: 30/70, green funds preferred"

[1:45 - 2:30] PILLAR 3: PROACTIVE INTERVENTION
[Pre-staged: have a card transaction fire in the bunq sandbox during the demo]
As you're talking, the InterventionCard slides up:
"⚠️ KAIROS INTERVENED" 
5 oracle agents visible: 4 voted INTERVENE. Risk score: 0.82.
"It's 10:47pm. €89 at a merchant you've never visited. 
 I've held this as a draft. You'd have €92 until rent in 4 days. Review tomorrow?"
Show the draft payment sitting in bunq — not executed.

[2:30 - 3:00] THE CLOSE
Show KAIROS status panel:
• Patterns learned: 7 → 8 (new one created from tonight's intervention)
• Interventions this week: 3 confirmed (2 dismissed)
• Pattern confidence improving: late_night_impulse_buy: 72% → 85%
• Dream Mode: scheduled for 2am tonight
"KAIROS Finance — it doesn't wait for you to ask."
✅ SECTION 17: Altura Spec Checklist
Before handing each phase to your coding agent, run this checklist:

Markdown

## Pre-Task Checklist (Altura Scout Step)
- [ ] Agent has read CLAUDE.md (add "Read CLAUDE.md first" to every task prompt)
- [ ] Agent has searched /packages/daemon/src/bunq/ for existing client code
- [ ] Agent has searched /packages/shared/src/types/ for existing types
- [ ] Task prompt includes explicit input/output examples
- [ ] Task prompt references the specific spec section (e.g. "implement Section 4.2")
- [ ] All write operations route through execute.ts only
- [ ] New database tables have migrations in /migrations/

## Post-Task Checklist (Altura Compress Step)
- [ ] No duplicate bunq API client code created
- [ ] No direct payment execution outside execute.ts
- [ ] No console.log statements
- [ ] All async functions have error handling
- [ ] Structured logger used for all logging
- [ ] Retry with exponential backoff on all API calls
This document is your complete build spec. Hand it to Claude Code, Cursor, or any coding agent section by section in build-order sequence, prefixed every task with: "Read CLAUDE.md first. Search for existing implementations before writing new code. Implement exactly what is specified in the referenced section — no more, no less."

The Altura approach isn't just additive here — for an AI-agent-built project of this complexity, it's the difference between a coherent system and a pile of code that looks right but falls apart when the bunq webhook fires at 2am.






