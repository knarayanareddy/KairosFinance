Spec compliance matrix (audit grid) for KAIROS Finance v2.0
This is a checklist-style, implementation-audit matrix that enumerates the files, functions, types, routes, and WS messages explicitly mentioned in:

completebuildspecificationnew.md 
1
prefixinstructionsnew.md 
2
Where the docs reference a type/module but do not define its exact fields, I mark it as “Referenced; fields not specified here” rather than guessing.

A) Global “laws” (apply to every file)
Rule / invariant	What it concretely means in code	Where it’s stated
Phase order is mandatory	Don’t scaffold later phases before earlier phases complete; Phase 0 gate blocks everything else	
1
Phase 0 signing gate	scripts/test-signing.ts must print ✅ and exit 0 before any Phase 1+ work	
1
Plan-before-act	No bunq write without an ExecutionPlan, narration, and explicit user confirmation	
1
Single write gateway	Only packages/daemon/src/bunq/execute.ts may do bunq POST/PUT/DELETE	
1
Worker isolation (Dream Mode)	Dream worker is forked; must not import execute.ts / do bunq writes; parent must kill after 10 minutes	
1
Bounded sub-agents	Each oracle sub-agent has hard token budget; only fraud-shadow calls Claude, and only above a signal threshold	
1
Append-only logs	Tick log + intervention log are insert-only per constitution (DB schema also reflects “append-only intent”)	
1
Strict TS + Zod validation	No any; validate bunq responses + Claude outputs + WS envelopes via Zod	
1
Environment awareness via BUNQ_ENV	Sandbox bypasses webhook IP filtering; production enforces bunq CIDR 185.40.108.0/22	
1
Explainability required	Interventions/verdicts/dream briefing must include plain-English Claude narration	
1
Import boundary on execute.ts	execute.ts must not be imported broadly—only certain modules may import it	
2
B) Repo-level compliance map (all files mentioned)
This table lists every file path called out in the spec’s monorepo tree + prefix blocks, grouped by phase ownership. 
1

B1) Root + shared package (cross-cutting)
Artifact	Owner phase	Purpose	Inputs → Outputs	Non-negotiables	Failure modes (what to surface)
CLAUDE.md	Global	Copy of constitutional rules; highest authority at runtime	N/A	Must match Section 2 “Constitutional Rules”	Drift from spec → agents violate constraints
.env.example	Global	Canonical env var list	env vars → runtime behavior	Must include BUNQ_ENV, ports, models, weights	Missing vars → clear config errors
specs/CompleteBuildSpecification.md	Global	Single source of truth	N/A	Overrides prompts	Misread → wrong architecture
specs/PrefixInstructions.md	Global	Session scope + gates	N/A	Blocks touching out-of-scope files per session	Scope creep → broken integration
packages/shared/src/types/bunq.ts	Phase 1	Zod + TS shapes for bunq responses (referenced)	bunq JSON → validated typed objects	All bunq responses validated here	Zod parse errors → must bubble as “upstream contract mismatch”
packages/shared/src/types/events.ts	Phase 1–3	Internal event bus types (referenced)	webhook/heartbeat events → typed events	Keep daemon/frontend separated	Event mismatch → runtime logic gaps
packages/shared/src/types/memory.ts	Phase 2	DB row types (referenced)	sqlite rows → typed objects	Must align with schema.sql	Schema drift → subtle bugs
packages/shared/src/types/oracle.ts	Phase 4	Oracle types: agent names, votes, verdict	state → votes/verdict	Must match UI expectations for ordering/labels	Missing agent/vote fields → UI break
packages/shared/src/types/plan.ts	Phase 1	ExecutionPlan / ExecutionStep types	planner/handlers → plan	Plan-before-act enforced through lifecycle	Plan shape mismatch → cannot execute safely
packages/shared/src/types/ws.ts	Phase 3+	WSMessage envelope union	daemon emits → frontend reduces	Envelope must be {type,payload}; validate payload	Invalid messages → UI should ignore + log
packages/shared/src/index.ts	Global	Shared exports	TS build graph	Avoid circular barrels	Circular deps → build/runtime errors
C) Phase-by-phase compliance matrix
Phase 0 — Signing gate (HARD GATE)
Source of truth: signing contract + gate script requirements. 
1

Artifact	Required exports / behavior	Inputs → Outputs	Invariants	Failure modes (required behavior)
packages/daemon/src/bunq/signing.ts	generateKeyPair(), signRequestBody(body, privateKeyPem), verifyWebhookSignature(body, sig, bunqPublicKeyPem)	body string → base64 signature; verify returns boolean	Must sign request body string using RSA-SHA256; 2048-bit keys; base64 output	If verify throws, catch and return false (don’t crash) 
1
scripts/test-signing.ts	Executes bunq sandbox /installation and /device-server, prints ✅ success line	env + bunq sandbox → exit code 0/1	Must refuse moving to Phase 1 unless ✅ printed	On non-200 → print ❌ with status and exit 1 
1
Phase 1 — bunq integration layer (auth/client/execute/webhook/accounts)
Core contracts for session lifecycle, read-only client, single write gateway, and webhook security. 
1

File	Must contain (functions/classes)	Inputs → Outputs	Invariants	Failure modes to handle explicitly
packages/daemon/src/bunq/auth.ts	BunqSession interface; createSession(apiKey); refreshSessionIfNeeded(session)	API key → BunqSession	Must perform bunq installation→device-server→session-server flow and persist/reload from DB	Expiring session: refresh if within ~30 mins of expiry; on failure, surface auth error and stop daemon startup 
1
packages/daemon/src/bunq/client.ts	class BunqClient with get<T>(path), getAccounts(), getTransactions(accountId,count?), getCards(), getScheduledPayments(accountId)	session + paths → validated bunq data	GET-only methods; validate via Zod in shared bunq types; auto-refresh session	If Zod validation fails: treat as contract mismatch; log and fail request, not silent fallback 
1
packages/daemon/src/bunq/execute.ts	ExecutionStep, ExecutionPlan; createExecutionPlan(steps,narratedText); confirmPlan(planId); executePlan(planId)	confirmed plan → bunq writes + step results	ONLY place with bunq POST/PUT/DELETE; executePlan must assert status === CONFIRMED; steps sequential	If plan not confirmed → throw; if step fails → record step result with error message; never partially hide failures 
1
packages/daemon/src/bunq/webhook.ts	validateWebhookRequest(rawBody, headers, session); parseWebhookEvent(rawBody); isAllowedOrigin(remoteIp); registerWebhookUrl(client, session, publicUrl)	raw webhook → internal event; public URL → bunq registration	Sandbox: skip IP filtering; Production: enforce CIDR 185.40.108.0/22; signature validation always; must trigger immediate heartbeat	If origin invalid or signature invalid → reject; never accept unsigned requests; never hardcode env behavior 
1
packages/daemon/src/bunq/accounts.ts	getAllAccounts, getPrimaryAccount, getSavingsAccounts, getTotalBalance	BunqClient → MonetaryAccount data / numbers	Read-only; used by recall, jars, score	If bunq GET fails: bubble error to caller; don’t fabricate accounts 
1
packages/daemon/src/routes/webhook.ts	Route: POST /api/webhook	HTTP → internal event + force tick	Must use webhook.ts validation + parsing	On invalid: return non-200 with clear reason (don’t 200) 
1
packages/daemon/src/routes/confirm.ts	POST /api/confirm/:planId, DELETE /api/confirm/:planId, POST /api/confirm/:planId/action	confirm/cancel/action → plan status + execution	This is one of the very few places allowed to call execute.ts pathway	If plan missing/wrong status: return 4xx + message; never run execute on PENDING 
1
packages/daemon/src/routes/score.ts	GET /api/score fallback	HTTP → latest score	Must reflect last computed KAIROSScore	If no score yet: return safe default + timestamp (implementation choice; spec implies “REST fallback”) 
1
packages/daemon/src/routes/ws.ts	WS upgrade handler at /ws	WS connect → event stream	Must emit messages matching WS union	Bad payloads must be prevented via Zod before emit 
1
packages/daemon/src/index.ts	Bootstrap: init DB, createSession, register fastify plugins, register routes, startHeartbeat, registerWebhookUrl if configured	env → running daemon	Must register multipart+websocket; log startup summary; listen on PORT	If auth/db init fails: crash early with clear log, not partial startup 
2
Import constraint (Phase 1+): execute.ts must only be imported from routes/confirm.ts, voice/executor.ts, and intervention/handlers/*.ts (per prefix instructions). 
2

Phase 2 — SQLite data model + memory helpers
Schema tables and DB initialization are explicitly defined. 
1

Artifact	Must do	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/memory/schema.sql	Create tables: sessions, transactions, patterns, pattern_embeddings(vec0), user_profile, goals, interventions, execution_plans, execution_step_results, tick_log, dream_sessions, score_log, forecast_cache	N/A	Must reflect append-only intent for logs + plans; embeddings table is vec0 virtual table	Schema drift breaks Zod/TS types; migration strategy not specified here—so changes must be cautious 
1
packages/daemon/src/memory/db.ts	getDb() singleton; enable WAL + foreign keys; exec schema.sql	env(DB_PATH) → sqlite handle	Must journal_mode=WAL and foreign_keys=ON	If DB open/schema exec fails: crash early with clear message 
1
packages/daemon/src/memory/transactions.ts	Transaction cache read/write helpers (referenced)	bunq payments → rows; queries → Transaction[]	Must align with transactions schema	If bunq ID types mismatch (string vs number): normalize consistently
packages/daemon/src/memory/patterns.ts	Pattern CRUD + confidence updates (referenced)	patterns JSON/templates → DB	Must match patterns schema fields (trigger_conditions, intervention_template, confidence, counters)	Bad JSON in stored templates must be detected (Zod recommended by constitution) 
1
packages/daemon/src/memory/profile.ts	UserProfile + goals helpers (referenced)	DB → profile/goals	Must align with user_profile + goals tables	Missing singleton profile row: create defaults or handle null (spec implies defaults via schema) 
1
packages/daemon/src/memory/interventions.ts	Intervention log helpers (referenced)	intervention payloads → insert rows	Append-only intent; store oracle_votes JSON	Update vs insert tension: schema has status, resolved_at; constitution says “append-only log rows” (treat updates as exceptional/minimal) 
1
packages/daemon/src/memory/vector.ts	sqlite-vec embedding search helpers (referenced)	text/embedding → nearest patterns	Uses pattern_embeddings vec0	If sqlite-vec missing: fail with install guidance; don’t silently disable matching 
1
Phase 3 — Heartbeat loop + KAIROS Score
Tick cadence, “shouldReason” gating, and WS emission are defined. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/heartbeat/loop.ts	startHeartbeat(deps); tick every 30s; REASON_INTERVAL_TICKS=10; compute score every tick; run oracle only when state changed/interval/webhook forced; don’t stack interventions	BunqClient+DB → WS events	30s tick; heavy reasoning about every ~5 min; skip if activeInterventionId non-null	If a tick fails, log duration/error; ensure next ticks still run (implementation detail; spec shows setInterval model) 
1
packages/daemon/src/heartbeat/recall.ts	recall(client, db): Promise<RecalledState>	bunq+DB → RecalledState	Must produce the minimal “slice” listed in RecalledState interface	If recall returns incomplete state, score/oracle become unreliable; treat as hard error 
1
packages/daemon/src/heartbeat/kairos-score.ts	KAIROSScoreComponents, KAIROSScore, computeKAIROSScore(state)	RecalledState → score + components + trend	Trend must be `rising	falling
packages/daemon/src/heartbeat/tick-log.ts	Append tick log writer	tick results → tick_log insert	Append-only	Insert failures should not crash the daemon if you can still safely proceed (implementation choice; constitution emphasizes log integrity) 
1
packages/shared/src/types/ws.ts	WSMessage union includes KAIROS_SCORE etc	typed messages → validated envelope	Must include PLAN_CREATED + FORECAST_READY in union	If frontend receives unknown type: ignore + log 
1
Phase 4 — Risk Oracle (6 agents) + aggregator + per-vote WS streaming
Oracle vote shapes + required live emission are explicit. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/oracle/agents/balance-sentinel.ts	Deterministic rule using balance vs rent+weekly spend	RecalledState → OracleVote	No LLM	If profile/rent missing: degrade gracefully or warn; don’t fabricate 
1
.../velocity-analyzer.ts	Deterministic spend velocity vs rolling average	RecalledState → OracleVote	No LLM	Missing history → return WARN with low confidence (inference; doc doesn’t specify fallback) 
1
.../pattern-matcher.ts	Uses sqlite-vec similarity search	RecalledState → OracleVote	“not Claude”	sqlite-vec unavailable → must error clearly; otherwise agent becomes blind 
1
.../subscription-watcher.ts	Deterministic duplicate subscription detection (referenced)	state → vote	No LLM	Missing recurring markers → rely on local pattern heuristics
.../rent-proximity-guard.ts	Deterministic rent due proximity risk (referenced)	state → vote	No LLM	Missing rent schedule → cannot guard rent
.../fraud-shadow.ts	Fraud signal checklist; score thresholds; only Claude when signal score >= 3	state → OracleVote	Only oracle agent allowed to call Claude (prefix)	If Claude fails: still return INTERVENE/WARN based on deterministic signal score; don’t block pipeline 
1
packages/daemon/src/oracle/aggregator.ts	aggregateVotes(votes): OracleVerdict with weighted formula	OracleVote[] → OracleVerdict	INTERVENE 2x, WARN 1x, CLEAR 0.3x	Votes missing or <6: verdict must still be computed or the UI hangs (spec doesn’t state partial handling, but UI expects a verdict after “all 6”) 
1
packages/daemon/src/oracle/index.ts	Orchestrator: run agents concurrently; emit each ORACLE_VOTE as each resolves; emit ORACLE_VERDICT after all	RecalledState → WSMessage stream	Do not batch vote emission	If any agent fails: decide whether to continue with degraded set (not specified); safest is “catch per-agent and emit a WARN vote with low confidence” (inference) 
1
packages/shared/src/types/oracle.ts	OracleAgentName, OracleVoteVerdict, OracleVote, OracleVerdict	typed votes	Must include all 6 agent names	Missing agent name breaks UI fixed ordering 
1
Phase 5 — Intervention engine + handlers + Claude explainer
Explainer output is mandatory UI-visible narration. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/intervention/explainer.ts	Claude narration generator for interventions	verdict+state → 2–3 sentence explanation	Explainability not optional	Claude failure: must fall back to a deterministic “minimum viable explanation” (inference; doc mandates narration but doesn’t specify fallback) 
1
.../handlers/low-balance.ts	Low-balance intervention logic (referenced)	verdict/state → InterventionRecord	Must store narration + votes	Missing rent/profile → weaker messaging
.../handlers/impulse-buy.ts	Impulse spend intervention logic (referenced)	verdict/state → record	Must not execute writes without plan confirmation	“Plan-before-act” always 
1
.../handlers/salary-received.ts	Salary landing intervention (ties into Phase 10 jars)	state → intervention/plan trigger	Should later wire jar agent	Mis-detect salary → repeated jar offers (must avoid via “last 2 hours” rule in prefix) 
2
.../handlers/subscription-duplicate.ts	Duplicate subscription intervention (referenced)	state → record	No writes without confirmation	N/A
.../handlers/fraud-block.ts	fraudBlockHandler(verdict,state,wsEmit) creates draft-payment plan + sends INTERVENTION payload type FRAUD_BLOCK	verdict+state → InterventionRecord + PENDING plan	Fraud path uses draft_payment modality and special UI	Must not execute without explicit allow/block action later 
1
.../handlers/dream-suggestion.ts	Dream-driven suggestions handler (referenced)	dream output → intervention	Dream explainability required	N/A
packages/daemon/src/intervention/engine.ts	Modality selection (selectModality) + dispatch to correct handler	verdict+state+deps → intervention	Don’t stack interventions; set/clear active intervention ID	Bug here cascades: heartbeat will stop intervening if active id never cleared 
1
Phase 6 — Core frontend (KAIROSScore, OracleVotingPanel, InterventionCard)
UI behavior is tightly specified (animations, fixed ordering, expandability). 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/frontend/src/hooks/useWebSocket.ts	WS connect + reconnect; validate envelope types	WS → app state	Must work with {type,payload}	WS drop: exponential backoff; UI should show “idle / reconnecting” state (inference)
packages/frontend/src/hooks/useKAIROSScore.ts	Reduce KAIROS_SCORE messages into state	WSMessage → score state	KAIROSScore component receives data exclusively via this hook	Missing score → component may show 0 until first tick 
2
components/KAIROSScore.tsx	Animated score + 4 component bars + trend arrow + breakpoints	KAIROSScore → UI	Breakpoints: green>70, amber 40–70, red<40	Bad payload types must be rejected before reaching UI 
2
components/OracleVotingPanel.tsx	6 fixed rows; animate each row on ORACLE_VOTE arrival; show verdict after all 6	votes stream → animated panel	Must reset when new run starts; use Map<OracleAgentName,OracleVote>	If votes arrive out-of-order: still render in fixed row order 
2
components/InterventionCard.tsx	Slide-up card on INTERVENTION; show narration; expandable “Why” with votes	INTERVENTION payload → actions	Narration prominent; action buttons depend on type	If user confirms: must hit confirm route (never local “fake confirm”) 
2
App.tsx	Compose core dashboard layout	state → page	Must show Tier-1 components on load	Missing WS: should still mount UI (DoD expects visible components) 
2
Phase 7 — Voice pipeline (STT → planner → plan execution on confirm)
End-to-end contract is specified both in the build spec and prefix instructions. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/voice/stt.ts	Run whisper.cpp via execFile using WHISPER_MODEL_PATH	audio file path → transcript string	Local-first STT	Missing model/binary: throw clear config error (not empty transcript) 
2
packages/daemon/src/voice/planner.ts	Claude planner (model claude-opus-4-5, max_tokens 400 per prefix) → ExecutionPlan JSON validated via Zod	transcript + current balance/accounts → ExecutionPlan	Must parse via ExecutionPlanSchema (prefix)	Invalid JSON/schema mismatch: throw "Voice planner: Claude returned invalid ExecutionPlan structure" 
2
packages/daemon/src/voice/executor.ts	Calls confirmPlan() then executePlan()	planId → execution results	Only called after user confirms; not called from voice route	Execution errors must persist step results; return failure to UI via confirm route 
2
packages/daemon/src/routes/voice.ts	POST /api/voice accepts multipart field "audio"; temp file lifecycle; creates PENDING plan; emits PLAN_CREATED	audio upload → {planId,narratedText,steps}	Must NOT execute; only plan	Must clean temp file in finally even on error 
2
packages/frontend/src/components/VoiceOrb.tsx	UI state machine: idle→recording→processing→plan-received→idle; shows plan card w confirm/cancel	user audio → confirm/cancel actions	Confirm calls POST /api/confirm/:planId	If confirm fails: show error and return to plan-received or idle (implementation choice; not specified) 
2
Phase 8 — Receipt vision pipeline
Contract: extract → verify ±2% → categorize → optional match + suggestion. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/receipt/extractor.ts	Claude Vision → ReceiptData	image → structured receipt	Must extract merchant/total/line items/currency/date	Claude parse errors: must reject request with clear message (inference) 
1
.../verifier.ts	Self-verification: line items sum to total within ±2%	ReceiptData → {verified:boolean, discrepancy?}	±2% tolerance	If unverified: return verified=false but still return extracted receipt (implied by response shape) 
1
.../categorizer.ts	Category + match to recent bunq tx; enrich local record	receipt + tx history → category/match/suggestion	Local-first enrichment	No match: return matched=false (don’t force) 
1
routes/receipt.ts	POST /api/receipt multipart "image"; temp file cleanup	upload → {receipt,verified,matchedTransactionId?,suggestion?}	Always cleanup temp file	Large image errors: return 413/4xx (implementation choice) 
2
components/ReceiptScanner.tsx	Capture via <input capture="environment">; preview; POST; show receipt card; suggestion CTA can trigger voice plan flow	user capture → UI	Suggestion button ties into planning flow	If backend returns verified=false: show warning badge, not silent 
2
Phase 9 — Dream Mode (scheduler + manual trigger + worker + DNA card)
Worker constraints + message protocol are spelled out. 
2

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
dream/scheduler.ts	node-cron schedule at 2am user timezone (referenced)	time → triggers dream	Worker isolation	Cron misfire: allow manual trigger anyway
dream/trigger.ts	Fork worker; insert dream session row; send DREAM_UPDATE; on COMPLETE update DB and send DREAM_COMPLETE; trigger forecast regen after completion (prefix)	manual/scheduled trigger → session lifecycle + WS	Parent kills worker after 10 minutes	If killed: update dream_sessions status KILLED; emit error status 
1
dream/worker.ts	Read-only DB access; Claude call for insights/pattern updates/new patterns/briefing/suggestions; send PROGRESS/COMPLETE messages	DB → structured results	Must NOT import execute.ts or do bunq writes	Any accidental import/write is a spec violation; if Claude fails: send {type:'ERROR', message} 
2
dream/dna.ts	Separate Claude call generates 4–6 word Financial DNA string	dream context → dnaCard string	Must return only phrase; no punctuation except commas (per spec snippet)	If Claude returns extra text: trim/validate 
1
routes/dream.ts	POST /api/dream/trigger, GET /api/dream/latest	HTTP → session start / latest completed	Must return immediately for trigger and later WS completes	If no completed session: GET latest returns 404 or null payload (implementation choice) 
1
components/DreamTrigger.tsx	Button fires POST trigger; listens for DREAM_COMPLETE via App state	user action → modal open	Must animate “Dreaming…” state	Network fail: show retry
components/DreamBriefing.tsx	Modal with briefing text + DNA badge + 3 suggestion cards + dismiss	DREAM_COMPLETE payload → UI	Explainability required	Missing fields: show placeholders, not crash 
2
Phase 10 — Savings Jar Agent (salary landing → multi-transfer plan)
Spec + prefix define salary detection and Claude split schema. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/jars/agent.ts	runSavingsJarAgent(state, wsEmit); salary detection rules; load savings accounts; Claude split → ExecutionPlan with multiple SAVINGS_TRANSFER steps; emit PLAN_CREATED	state → plan	Must create PENDING plan only; execution happens on confirm	Salary retriggering must be prevented (prefix: within last 2 hours) 
2
intervention/handlers/salary-received.ts (modified)	Wire jar agent trigger	salary intervention → jar plan offer	Must remain within plan-before-act	If jar accounts missing: still narrate and skip plan creation
Phase 11 — Forecast engine + route + chart + hook
Forecast is explicitly “not ML” and cached in forecast_cache. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
forecast/engine.ts	ForecastPoint, ForecastEvent, generateForecast(state); algorithm applying deterministic events + avg spend + variance + pattern-based impulse risk	state → 30-point forecast	Must cache for 6 hours; regenerate on dream completion/salary/large tx/refresh query	Cache corruption: regenerate; don’t serve invalid JSON 
1
routes/forecast.ts	GET /api/forecast with refresh=true	HTTP → ForecastPoint[]	Must return 30 objects	If forecast generation fails: return 500 with message; don’t return partial array 
2
hooks/useForecast.ts	Fetches forecast; listens for FORECAST_READY and refetches	WS + HTTP → forecast UI state	Must refetch on WS event	If WS missing: still fetch on mount 
2
components/ForecastChart.tsx	Recharts ComposedChart; line + confidence band + event markers + tooltip + rent threshold line	ForecastPoint[] → UI	Must show 30 points and rent threshold line	If profile/rent missing: hide threshold line with notice (inference) 
2
Phase 12 — FraudBlock full-screen flow (hold-to-confirm)
FraudBlock is a full-screen overlay with 2-second hold-to-confirm and allow/block actions. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
components/FraudBlock.tsx	Full-screen modal; show fraud signals + narration; two actions with 2s hold	FRAUD_BLOCK intervention + planId → allow/block HTTP call	Must call POST /api/confirm/:planId with `action:'allow'	'block'` (spec text references allow/block path)
routes/confirm.ts (action endpoint)	POST /api/confirm/:planId/action handles allow/block semantics	action → execute/cancel draft payment	bunq write only via execute.ts	If plan not draft-payment: 400; if already executed: 409 
1
Phase 13 — Pattern promotion after confirmed interventions
Docs define “offerPatternPromotion” and prefix block adds Claude “NO_PATTERN” protocol + confidence=0.4. 
1

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
packages/daemon/src/patterns/promotion.ts	Ask Claude if confirmed intervention is reusable; accept JSON or NO_PATTERN; insert pattern with confidence 0.4; generate embedding	intervention summary → new pattern row + embedding	Must only run after CONFIRMED	If Claude returns invalid JSON: treat as NO_PATTERN or error (prefix implies schema match required) 
2
intervention/engine.ts (modified)	After status updates to CONFIRMED, call offerPatternPromotion(...).catch(console.error)	confirmation → optional pattern insert	Must not block confirmation path	Promotion failure must not break main flow 
2
Phase 14 — Multi-account intelligence (primary + savings + joint)
Prefix block specifies new APIs and updated RecalledState shape. 
2

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
bunq/accounts.ts (extended)	getJointAccounts(client), getAllAccountsSummary(client) + AccountSummary interface	bunq accounts → summarized list	Must classify account type CURRENT/SAVINGS/JOINT; include goal linkage metadata	If joint not supported in sandbox: return empty list with log (inference) 
2
heartbeat/recall.ts (modified)	Add allAccounts: AccountSummary[] to RecalledState; replace prior accounts usage	bunq+DB → expanded recalled state	Score goals component uses goal progress from summaries	If summaries missing: fallback to primary only while warning (inference) 
2
oracle/agents/balance-sentinel.ts (modified)	Factor totalBalance; don’t count goal-locked savings toward “health”	expanded state → vote	Must respect goalLinked rule	Misclassification of goal-linked → incorrect risk score 
2
Phase 15 — Demo polish + reset/seed/start/checklist + sandbox-only reset route
Prefix block specifies scripts + sandbox-only route registration. 
2

Artifact	Must implement	Inputs → Outputs	Invariants	Failure modes
scripts/reset-demo.ts	Reset demo state fast (<5s)	DB → cleared state	Sandbox-only utilities should not run in production	If DB locked: retry/exit with clear message 
2
scripts/seed-demo.ts	Seed realistic dataset	N/A → DB seeded	Must support demo beats (fraud tx, salary, rent, etc.)	If seed incomplete: demo script breaks 
1
scripts/start-demo.sh	One-command boot incl tunnel	shell env → running stack	Must be reproducible	If tunnel missing: print install/setup hints 
2
scripts/checklist.ts	Automated pre-demo checks; prints “✅ All N checks passed”	env+services → pass/fail	Must be used for Session C DoD	If any check fails: non-zero exit 
2
packages/daemon/src/routes/demo-reset (implied)	POST /api/demo/reset route	HTTP → reset DB	Must only register in sandbox	If accidentally enabled in prod: security issue 
2
packages/daemon/src/index.ts (modified)	Register demo-reset route only when BUNQ_ENV==='sandbox'	env → routes	Sandbox-only condition required	If BUNQ_ENV mis-set: route availability changes 
2
Frontend polish files	Add animations, prefers-reduced-motion, reset button wiring	UI state → better demo	Must keep all earlier DoD passing	Animation regressions → usability issues 
2
D) Canonical daemon routes + WS contract (cross-check list)
D1) REST routes (must exist as specified)
Route	Purpose	Phase owner	Notes
POST /api/webhook	bunq event receiver	1	Must validate signature; may bypass IP filter in sandbox 
1
POST /api/voice	audio → ExecutionPlan	7	Must return plan only, not execute 
1
POST /api/receipt	image → ReceiptData	8	Returns {receipt, verified, ...} 
1
POST /api/dream/trigger	start dream worker	9	Must return immediately + then WS completes 
1
GET /api/dream/latest	latest completed dream	9	Used by UI (implied) 
1
GET /api/forecast (+ refresh=true)	30-day forecast	11	Uses cache; 30 items 
1
GET /api/score	REST fallback	3	Latest KAIROSScore 
1
POST /api/confirm/:planId	confirm & execute plan	1	Must run via execute.ts gateway 
1
DELETE /api/confirm/:planId	cancel plan	1	Cancels pending plan 
1
POST /api/confirm/:planId/action	fraud allow/block	12	For FraudBlock hold-to-confirm flow 
1
WS /ws	realtime event stream	3	Emits score/votes/verdict/intervention/dream/plan/forecast events 
1
D2) WebSocket message types (must match union)
WS type	Payload type	When emitted
KAIROS_SCORE	KAIROSScore	every heartbeat tick 
1
ORACLE_VOTE	OracleVote	as each sub-agent resolves (streaming) 
1
ORACLE_VERDICT	OracleVerdict	after all 6 votes 
1
INTERVENTION	InterventionPayload	when verdict INTERVENE 
1
DREAM_UPDATE	{sessionId,status}	dream started 
1
DREAM_COMPLETE	DreamBriefingPayload	dream finished 
1
PLAN_CREATED	ExecutionPlan	voice/jars plan ready 
1
FORECAST_READY	ForecastPoint[]	forecast regenerated 
1
E) Session gates (Prefix blocks) as an audit checklist
These aren’t “code artifacts,” but they’re compliance requirements for how the build must be executed and when you’re allowed to move on.

Session	Allowed phases	Hard gate	Definition-of-done anchor
A (Block A)	0–6	Phase 0 signing ✅ must pass	UI shows KAIROSScore + Oracle panel skeleton; WS tick within ~35s; routes registered; tsc clean 
2
B (Block B)	7–11	Must not touch Session A files unless bugfix	Voice returns plan; receipt returns receipt+verified; dream completes in ~30s; forecast 30 points; tsc clean 
2
C (Block C)	12–15	Must complete full 3-minute demo under 3 minutes	checklist.ts passes; start-demo.sh works; reset-demo fast; FraudBlock hold works; multi-account visible; tsc clean 
2
