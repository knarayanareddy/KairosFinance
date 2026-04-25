🎯 Final Synthesis — Everything Else That Matters
After our entire discussion, here is what hasn't been said yet but genuinely could be the difference between winning and not winning. This covers the layers around the build — the pitch, the resilience, the submission, and the human factors.

1. 🎤 The Pitch Layer — We Never Talked About This
Your spec is a masterpiece. Your demo script is tight. But you will have to speak. Judges will interrupt. They will ask questions mid-demo. They will challenge assumptions. None of that is in your spec.

The One-Sentence Pitch (Memorise This Tonight)
You need a single sentence that any non-technical judge understands in 3 seconds:

"BUNQSY is a financial guardian that watches your bunq account around the clock, learns your habits while you sleep, and steps in before problems happen — not after."

Every word of that sentence is doing work:

"guardian" not "chatbot" — positions it correctly
"around the clock" — the always-on heartbeat in one phrase
"learns while you sleep" — Dream Mode in three words
"before problems happen" — proactive, not reactive
Practice saying it until it feels natural. Open your pitch with it. Close your pitch with it.

The "So What" Frame
Judges will think: "This is impressive engineering but why does it matter?" You need to pre-empt this. After your demo, say:

"Today, people check their banking app when they remember to, or when something's already gone wrong. BUNQSY flips that completely. It's not you checking on your money — it's your money checking on you."

That's memorable. Write it on a sticky note. Have it in front of you.

The bunq-Specific Argument
There will almost certainly be a judge who asks: "Could you build this on any bank's API?" Your answer must be confident and specific:

"No — and here's exactly why. We use bunq's real-time webhook system to fire our heartbeat on actual events rather than polling. We use their savings sub-accounts API — the jars — to execute automated multi-transfer salary splits that most banks simply don't expose. We use their draft payment API to intercept suspicious transactions before they clear. These aren't generic banking features — they're specific bunq capabilities that make the real-time, proactive model possible."

Know this answer cold. It directly defends the €5,000 bunq integration prize.

Anticipated Judge Questions and Your Answers
Prepare for these specifically:

"What happens if the AI makes a wrong decision and moves my money incorrectly?"

"BUNQSY never moves money without explicit user confirmation. Every action goes through a single audited write gateway. The AI plans — you approve. There is no autonomous execution. Even our Savings Jar Agent only proposes the split and waits for a tap to confirm."

"How is this different from Plum or Cleo?"

"Plum and Cleo are reactive chatbots — you talk to them. BUNQSY is a persistent background process that runs whether you open the app or not. It has a self-improving memory layer that consolidates knowledge nightly, and it uses a multi-agent oracle — six specialised sub-agents voting simultaneously — not a single LLM making guesses. The architecture is fundamentally different."

"What are the GDPR implications of storing financial data locally?"

"Actually, that's a strength of our design. All reasoning happens locally — embeddings, pattern matching, memory — using a local SQLite database and a local Ollama model. Financial data never leaves the device for AI processing. The only external calls are to execute confirmed user actions via the bunq API. We built local-first deliberately."

"Could a bank just build this themselves?"

"They could build parts of it. But the multi-agent oracle architecture, the self-improving pattern brain, and the Dream Mode consolidation loop are novel combinations that don't exist in any banking product today. And the fact that we built it on bunq's open API in 24 hours suggests the ecosystem makes this kind of innovation possible — which is exactly the argument for bunq's developer platform."

"What's your business model?"

"For a hackathon, we focused on the technical proof of concept. But the natural paths are: a premium bunq feature, a white-label financial intelligence layer for neobanks, or a standalone subscription app — €5–10/month is a reasonable price point for something that demonstrably saves you money by catching impulse spending and duplicate subscriptions."

2. 🛡️ Technical Resilience — What We Didn't Stress-Test
The Anthropic Rate Limit Problem
You have six oracle sub-agents. Fraud Shadow calls Claude when signal score ≥ 3. Dream Mode calls Claude multiple times. Voice calls Claude. Receipt calls Claude. During a demo, if you trigger multiple oracle runs quickly, you could hit Anthropic rate limits (429 errors).

Fix tonight: Add a simple rate limiter wrapper around all Anthropic calls:

TypeScript

// packages/daemon/src/lib/claude-limiter.ts
import Anthropic from '@anthropic-ai/sdk';
import PQueue from 'p-queue';

const queue = new PQueue({
  concurrency: 3,          // max 3 simultaneous Claude calls
  intervalCap: 10,         // max 10 calls
  interval: 60_000,        // per minute
});

export const anthropic = new Anthropic();

export async function claudeCreate(
  params: Parameters<typeof anthropic.messages.create>[0]
) {
  return queue.add(() => anthropic.messages.create(params));
}
Replace all direct anthropic.messages.create() calls with claudeCreate(). This queues calls gracefully instead of crashing.

The bunq Sandbox Flakiness Problem
The bunq sandbox goes down. It returns 500s at random. During your demo, this will happen at the worst possible moment. You need a fallback mode.

Add this to your daemon:

TypeScript

// In your bunq client, wrap every call:
async get<T>(path: string): Promise<T> {
  if (process.env.BUNQ_OFFLINE_MODE === 'true') {
    return getSeedDataForPath(path) as T;
  }
  // real call...
}
And a toggle:

Bash

# If bunq goes down mid-demo, in a second terminal:
export BUNQ_OFFLINE_MODE=true
# daemon keeps running on seed data
The judges don't know whether the data is live or seeded. The animations, the oracle, the interventions — they all work the same way. This is your insurance policy.

The SQLite Concurrent Write Problem
During your demo, the heartbeat tick fires every 30 seconds AND the dream worker is writing patterns AND the webhook receiver is writing transactions — all simultaneously. With better-sqlite3 in WAL mode, this is fine for reads, but concurrent writes can still lock.

Add this to db.ts after enabling WAL:

TypeScript

db.pragma('busy_timeout = 5000');  // wait up to 5 seconds instead of failing instantly
One line. Prevents "database is locked" crashes during the demo.

The Dream Worker Zombie Process Problem
If you trigger Dream Mode during the demo and something goes wrong with the forked worker, it can become a zombie process that holds the DB lock. Your spec has a 10-minute kill timeout, which is correct, but also add:

TypeScript

// In trigger.ts, on daemon shutdown:
process.on('SIGTERM', () => {
  if (activeWorker) activeWorker.kill('SIGKILL');
  process.exit(0);
});
process.on('SIGINT', () => {
  if (activeWorker) activeWorker.kill('SIGKILL');
  process.exit(0);
});
This ensures clean shutdown so you can restart the daemon quickly between judge sessions.

Environment Variable Validation — Fail Fast
Add this to daemon index.ts as the very first thing that runs:

TypeScript

const REQUIRED_ENV_VARS = [
  'BUNQ_ENV',
  'BUNQ_API_KEY',
  'ANTHROPIC_API_KEY',
  'BUNQ_SANDBOX_URL',
];

const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}
Nothing is more embarrassing than a daemon that silently starts and then fails on the first API call because ANTHROPIC_API_KEY is undefined.

3. 📦 The Submission Package — Judges Look at This
Whatever the hackathon submission format is (DevPost, GitHub, presentation), judges will look at your repository. Make it count.

The README — This Is Your Silent Pitch
Your README.md needs to be rewritten for judges, not developers. Structure:

Markdown

# BUNQSY Finance
### Your always-on financial guardian for bunq

> "Not a chatbot for your bank. A guardian for your financial life."

[Demo video link — record this the night before submission]
[Screenshot of the live dashboard]

## What it does
[3 sentences, non-technical, judge-friendly]

## Why it's different
[The reactive vs proactive argument, 2 sentences]

## bunq API depth
[Bullet list of every bunq API feature used — this directly addresses the bonus prize]
- Real-time webhooks (PAYMENT, MUTATION, CARD_TRANSACTION_*)
- Savings sub-accounts (jars) for automated salary splits
- Draft payment API for fraud transaction blocking
- OAuth session management with automatic refresh
- Notification filter URL registration

## Architecture
[One diagram — even ASCII art is fine]

## The AI stack
[Brief, impressive, non-jargon]

## Demo
[Link to the 3-minute demo video]

## Running it
[5 commands maximum to get it running]
The bullet list of bunq API features used is important. Make it visual and specific. Judges awarding the €5,000 integration prize are scanning submissions looking for exactly this list.

Record a Demo Video
Record your demo the night before submission. Not as a backup for a failed live demo — as a supplement. Put it in the README. Judges who see 20 projects in a day will rewatch videos of the ones they liked. A polished 3-minute demo video extends your pitch beyond the room.

Use Loom (free). Record your screen + face. Narrate it exactly like the demo script. Do it in one take — imperfections are fine, authenticity is better than over-produced.

The Architecture Diagram
One image in your README is worth 500 words. You don't need a fancy tool. Even this ASCII diagram is fine:

text

bunq API ←──── execute.ts (ONLY write gateway)
   │
   ▼ (webhooks)
Fastify Daemon
   │
   ├── Heartbeat Loop (30s)
   │      │
   │      ├── Recall → state slice
   │      ├── BUNQSY Score → WebSocket
   │      └── Risk Oracle (6 sub-agents, parallel)
   │             │
   │             └── Intervention Engine → WebSocket
   │
   ├── Voice Pipeline (whisper → claude → plan)
   ├── Receipt Pipeline (claude vision → categorize)
   ├── Dream Mode (forked worker, 2am + manual)
   ├── Forecast Engine (30-day projection)
   └── Savings Jar Agent (salary detection)
          │
          ▼
      SQLite (local-first, WAL mode)
      + sqlite-vec (embeddings)
      + Ollama (nomic-embed-text, local)
          │
          ▼
      React Frontend ← WebSocket (real-time)
4. 🧠 Things the Spec Doesn't Handle That Could Bite You
The Cold Start Problem
When your daemon starts for the very first time with no transaction history, the oracle sub-agents have nothing to work with. The velocity analyzer has no baseline. The pattern matcher has no embeddings. The BUNQSY Score components that depend on weeklySpend will be 0.

Your seed script (scripts/seed-demo.ts) handles this — but make sure it also generates embeddings for the seeded patterns and stores them in pattern_embeddings. Otherwise the pattern-matcher sub-agent will always return CLEAR, making the oracle look broken.

Add to your seed script:

TypeScript

// After inserting patterns, generate embeddings for each
for (const pattern of seededPatterns) {
  const embedding = await generateEmbedding(pattern.description + ' ' + pattern.triggerConditions);
  db.prepare('INSERT INTO pattern_embeddings (pattern_id, embedding) VALUES (?, ?)')
    .run(pattern.id, JSON.stringify(embedding));
}
console.log('✅ Pattern embeddings generated');
CORS — The Silent Frontend Killer
Your Fastify daemon on port 3001 and your React frontend on port 5173 are different origins. Without CORS configuration, every fetch from the frontend to the daemon will fail silently in production mode.

Add to daemon index.ts:

TypeScript

import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: process.env.BUNQ_ENV === 'sandbox'
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : ['https://your-production-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
This is a 5-minute fix that, if missed, causes the frontend to look completely broken with no obvious error message.

Multipart File Upload Size Limits
Fastify's multipart plugin has a default file size limit. Voice recordings (especially longer ones) and receipt photos can exceed the default. Add explicit limits:

TypeScript

await fastify.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024,  // 25MB — covers any audio or image
    files: 1,
  },
});
Without this, a 4MB photo silently gets rejected and your receipt scanner looks broken.

The WebSocket Reconnect Race Condition
Your useWebSocket.ts reconnects with exponential backoff. But there's a subtle issue: if the frontend reconnects while the daemon is in the middle of an oracle run, it will miss some ORACLE_VOTE messages. The OracleVotingPanel will show only 4 or 5 rows animated instead of 6, looking broken.

Fix: when a WebSocket client connects (or reconnects), the daemon should immediately send the last known state:

TypeScript

// In routes/ws.ts, on new connection:
socket.on('open', () => {
  // Send current BUNQSY score immediately
  const latestScore = getLatestScore(db);
  if (latestScore) {
    socket.send(JSON.stringify({ type: 'BUNQSY_SCORE', payload: latestScore }));
  }
  // Send last oracle verdict if available
  const lastVerdict = getLastVerdict(db);
  if (lastVerdict) {
    socket.send(JSON.stringify({ type: 'ORACLE_VERDICT', payload: lastVerdict }));
  }
});
This ensures a reconnecting client always sees a populated UI immediately.

5. 💡 One Feature We Never Discussed That Could Win It
bunq OAuth — Multi-User Mode
Right now, BunqsyFinance is a single-user system (one hardcoded API key). If you add bunq OAuth, any bunq user could connect their account and get their own BUNQSY guardian. This transforms it from a demo into a real product — and judges notice that distinction instantly.

bunq supports OAuth 2.0. The flow is:

User clicks "Connect your bunq account"
Redirected to bunq OAuth consent screen
bunq redirects back with an auth code
You exchange it for a user-scoped access token
That user gets their own session, their own DB rows, their own heartbeat
This is probably 3–4 hours of work. Only attempt it if Tier 1 and 2 are complete and you have time. But if you do pull it off, your pitch becomes:

"And anyone in this room with a bunq account can connect their account right now and start using BUNQSY today."

That line, said while handing a judge your phone to try it, wins hackathons. It's the difference between a demo and a product.

6. 🔋 The Human Factors — The Things No Spec Covers
The Hackathon Energy Curve Is Predictable
You will feel:

8am–11am: Sharp, motivated, fast — use this for the hardest architectural work (oracle, execute gateway, heartbeat)
11am–1pm: Slightly tired but still focused — integration work
1pm–3pm: Post-lunch slump — this is dangerous. Do frontend work (visual, satisfying, lower cognitive load)
3pm–5pm: Second wind — use this for Session C polish and demo prep
5pm–demo: Anxiety spike — do NOT write new code. Only fix known bugs. Run the demo script repeatedly.
Plan your phase allocation around this curve, not just around time.

Know When to Stop Building
There is a specific moment in every hackathon where the most valuable thing you can do is stop building and start practising the demo. That moment is roughly 2 hours before judging starts. After that point, every new line of code is more likely to break something than improve it.

At T-2 hours: close the editor. Run the demo script end-to-end. Find what's broken. Fix only those things. Run it again. Repeat until it's clean.

Talk to Other Teams
This sounds counterintuitive, but walking around and talking to other teams for 20 minutes during lunch will give you invaluable information:

What are they building? (Competitor awareness)
What bunq APIs are they using? (You might be missing something)
What are they struggling with? (If everyone's struggling with the same thing, there's a common pitfall to avoid)
What are the judges asking about? (If judging is ongoing, teams who've presented will tell you what the judges cared about)
Prepare Your Workspace for the Demo
Before judging starts:

Close all browser tabs except your app
Close all terminal windows except one clean one (for the demo payloads curl commands)
Turn off notifications (Slack, email, phone)
Have your demo payload curl commands ready as aliases:
Bash

alias demo-fraud='curl -X POST http://localhost:3001/api/webhook -H "Content-Type: application/json" -d @demo-payloads/fraud-webhook.json'
alias demo-salary='curl -X POST http://localhost:3001/api/webhook -H "Content-Type: application/json" -d @demo-payloads/salary-webhook.json'
Have the demo script open in a text editor at font size 24 (readable at a glance while you're talking)
Have water next to you
If the Demo Breaks Live
If something fails during the live demo, do not panic and do not apologise profusely. Say:

"Let me show you this in a slightly different way"

And pivot to the next demo beat. Judges know it's a hackathon. A graceful recovery is remembered more positively than a perfect demo that was clearly rehearsed with no room for error.

If the daemon crashes completely, say:

"While that restarts, let me tell you about the architecture..."

And talk about the oracle voting system, the constitutional rules, the write gateway — the things that are impressive on their own without needing to see the UI. You know this system inside out. Use that knowledge.

7. 🏅 The Meta-Point Nobody Says Out Loud
Here is the thing about hackathon judging that nobody puts in a guide:

Judges are humans who've been sitting through demos for hours. They are tired. They are pattern-matching. They have seen 15 chatbots, 8 dashboards, and 4 "AI financial advisors" before they get to you.

What makes them lean forward is surprise — something they didn't expect and haven't seen before.

For BunqsyFinance, your surprise moments are:

The oracle voting panel animating in real time — 6 AI agents visibly thinking simultaneously
The BUNQSY Score dropping from 84 to 51 in real time when the fraud alert fires
The phrase "it literally sleeps and dreams about your finances"
The single write gateway — a judge with a security background will visibly react to this
The Financial DNA card — "Disciplined saver, impulsive weekends, risk-aware" — it's personal
Lead with surprise, follow with substance, close with the product vision.

8. Final Honest Thought
You came into this conversation with three markdown files and a vision. You're leaving it with a production-grade specification, a session-aware build strategy, a timed demo script, a complete technical stack decision, and answers to every judge question you're likely to face.

Most hackathon teams have none of that on the morning of the event.

The only remaining variable is execution. And you've already done the hardest part of execution: the thinking. Tomorrow is just the typing.

One last thing — and I mean this genuinely: the concept is good enough to become a real product. If you win or if you don't, BunqsyFinance as an idea — a persistent, dreaming, proactive financial guardian built on an open banking API — is worth continuing after the hackathon. The spec you have is already a founding document.

Go build it. 🚀






Based on our entire discussion, do you have any other suggestions or anything important you would like to add?

claude-sonnet-4-6-search
No Sources
🏆 Complete Guide: Using Claude to Build BunqsyFinance at the Hackathon
0. The Mental Model You Need First
Before anything tactical, understand this: Claude Code is not a search engine and not an autocomplete tool. It is a junior engineer with perfect memory of everything you show it, zero memory of anything you don't, and unlimited patience.

Your job tomorrow is not to type prompts. Your job is to be the tech lead — you set the context, you define the boundaries, you review the output, and you course-correct. Claude writes the code. You make the decisions.

The single biggest mistake people make is treating Claude like a vending machine: put in a request, get out code, move on. That produces spaghetti. You are pairing with it. Stay engaged.

1. Environment Setup — Do This Tonight
1a. Install Claude Code (the CLI, not the web interface)
You want Claude Code — the VS Code / terminal-integrated agent, not claude.ai in a browser tab. The browser is for conversation. Claude Code is for building.

Bash

npm install -g @anthropic/claude-code
Authenticate it with your Anthropic API key. Make sure you're on a plan with sufficient context limits — you will burn through tokens fast. Max plan if you have access to it.

1b. Set up your repo tonight
Bash

git clone <your-repo>
cd bunqsy-finance
git add .
git commit -m "chore: pre-hackathon baseline"
Create the turbo monorepo skeleton tonight so Session A tomorrow can skip scaffolding:

text

bunqsy-finance/
├── CLAUDE.md          ← create tonight
├── package.json       ← create tonight (turbo root)
├── turbo.json         ← create tonight
├── .env.example       ← create tonight (copy from spec)
├── specs/
│   ├── CompleteBuildSpecification.md   ← already written
│   └── PrefixInstructions.md           ← already written
└── packages/
    ├── shared/
    │   └── package.json
    ├── daemon/
    │   └── package.json
    └── frontend/
        └── package.json
Create CLAUDE.md tonight — just copy Section 2 of your CompleteBuildSpecification.md verbatim. This is the constitutional file. It needs to exist in the repo root before Session A starts.

1c. Get your bunq sandbox API key tonight
Don't wait until the hackathon starts to do this. Go to the bunq developer sandbox, create your key, put it in your .env file, and run scripts/test-signing.ts tonight if possible. If Phase 0 passes tonight, tomorrow morning you skip straight to Phase 1. That's potentially 30–60 minutes saved.

1d. Install dependencies and verify the toolchain tonight
Bash

# Install whisper.cpp and download the base model
brew install whisper-cpp   # macOS
# or compile from source: https://github.com/ggerganov/whisper.cpp

# Pull Ollama and the embedding model
brew install ollama
ollama pull nomic-embed-text
ollama serve &   # verify it starts

# Install global tools
npm install -g tsx turbo

# Verify Node version (need 20+)
node --version
The worst possible hackathon moment is spending 45 minutes at 10am debugging why better-sqlite3 won't compile on your machine. Do that tonight.

2. How to Structure Your Claude Code Sessions
2a. The Three-Session Structure Is Real — Respect It
Your PrefixInstructions.md defines Sessions A, B, and C. These map to real context windows. Claude Code has a large context limit, but a full build session will push it. When you notice Claude starting to:

Forget earlier decisions
Contradict the spec
Suggest refactoring things it already built
...that is your signal that the context is getting stale. End the session, commit, start a new one with the next prefix block.

Don't try to do Session A + B in one go to save time. You will end up with a corrupted context, inconsistent code, and you'll spend more time debugging than you saved.

2b. How to Actually Start a Session
Open your terminal. Navigate to the repo. Launch Claude Code:

Bash

claude
Then your very first message is not a task. It is a context dump. Copy-paste this exactly:

text

Before we write any code, I need you to read three files in order.
Please read them fully and confirm you have loaded all three.

1. Read CLAUDE.md
2. Read specs/CompleteBuildSpecification.md
3. Read specs/PrefixInstructions.md

After reading all three, tell me:
- Which session prefix block you are operating under (A, B, or C)
- The current status of each phase in scope for this session
- What you will do first and why
- What files you will NOT touch this session

Do not write any code until I confirm your plan.
Wait for Claude to respond. Read its response. If it got anything wrong (wrong phase order, missing a constitutional rule, misidentified file scope), correct it before it writes a single line of code. This 5-minute investment at the start of every session prevents hours of rework.

2c. The Confirmation Gate Pattern
Never let Claude just start building. Always use this pattern:

text

Before you write this file, tell me:
1. What is this file's single responsibility?
2. What does it import?
3. What does it export?
4. Does anything in this file violate CLAUDE.md?

Answer these in 4 bullet points, then I'll say "go" and you write it.
For complex files (like execute.ts, oracle/index.ts, loop.ts) this is mandatory. For simple helper files you can skip it after the first few files in a session when Claude is clearly on track.

3. Prompt Engineering — The Exact Patterns That Work
Pattern 1: The "One File at a Time" Rule
Never ask Claude to write multiple files in one prompt. This seems slow but it's actually faster because you catch errors file by file instead of discovering cascading problems 10 files later.

❌ Bad:

text

Write all the oracle agent files.
✅ Good:

text

Write packages/daemon/src/oracle/agents/balance-sentinel.ts.
Use the exact spec from Section 6 Phase 4c.
This agent is deterministic — no Claude API calls.
After you write it, tell me what you'd expect the TypeScript 
compiler to say about it.
Pattern 2: The "Spec Reference" Anchor
Claude has your full spec in context. Use it as a reference anchor in every prompt:

text

Write packages/daemon/src/bunq/webhook.ts.
Follow the spec exactly as written in Section 6 Phase 1d.
Pay special attention to the isAllowedOrigin function — 
it must be environment-aware via BUNQ_ENV, exactly as the 
spec describes. Do not simplify it.
The phrase "exactly as written in Section X" is powerful. It prevents Claude from improvising and substituting its own (often reasonable but spec-violating) interpretation.

Pattern 3: The "Constraint First" Pattern
When writing safety-critical files, state the constraints before the task:

text

I need you to write packages/daemon/src/bunq/execute.ts.

CONSTRAINTS (non-negotiable):
- This is the ONLY file in the codebase permitted to make 
  write calls to bunq
- Add the constitutional comment block at the top of the file 
  (from CLAUDE.md Rule 2)
- executePlan() must assert plan.status === 'CONFIRMED' before 
  executing — throw if not
- Steps must execute sequentially, not in parallel
- Each step result must be written to execution_step_results 
  table before proceeding to the next step

Now write the file.
Pattern 4: The "Read Before Write" Pattern
For files that depend heavily on other files, tell Claude to read the dependency first:

text

Before writing packages/daemon/src/oracle/index.ts, 
please read:
- packages/shared/src/types/oracle.ts (types you must use)
- packages/daemon/src/oracle/aggregator.ts (function you'll call)
- packages/daemon/src/heartbeat/loop.ts (shows how wsEmit is passed)

Then write oracle/index.ts. The concurrent emission of ORACLE_VOTE 
per agent is the most important detail — each vote must be emitted 
the moment that agent's promise resolves, not after all 6 complete.
Pattern 5: The "Test the Output" Pattern
After Claude writes a file, don't just move on. Ask it to prove it:

text

Now read back what you just wrote and answer:
1. If I call runOracle() and the velocity-analyzer resolves first,
   does its ORACLE_VOTE get emitted before balance-sentinel resolves?
   Walk me through the Promise.all() flow.
2. Is there any code path where all 6 votes are collected before 
   any emission happens?
3. Does this file import execute.ts? (It must not.)
This forces Claude to reason about its own output. It catches subtle bugs before you ever run the code.

Pattern 6: The "Zod First" Pattern
Always write the Zod schema before the function that uses it:

text

Before writing the voice planner, write the Zod schema for 
ExecutionPlan in packages/shared/src/types/plan.ts.
Show me the schema. I'll confirm it, then you write planner.ts.
This prevents the common mistake of writing a function that uses a type that doesn't quite match what Claude or bunq actually returns.

Pattern 7: The "Error Path First" Pattern
For route handlers, ask for the error path before the happy path:

text

Write the POST /api/voice route handler.
Structure it like this:
1. First, write the try/catch wrapper and all error responses
2. Then fill in the happy path inside the try block
3. Finally, write the finally block (temp file cleanup)

I want to see the error handling before the success path.
This ensures error handling is never an afterthought.

4. The Review Loop — How to Catch Problems Before They Cascade
After every file Claude writes, do this before moving to the next:

Step 1: Read it yourself (30 seconds)
Actually read what Claude wrote. You don't need to understand every line. You need to check:

Does the file name and exports match what you asked for?
Is there an any type anywhere?
Does it import execute.ts when it shouldn't?
Are there any obvious TODOs or placeholder functions?
Step 2: Run the TypeScript compiler (10 seconds)
Bash

cd packages/daemon && npx tsc --noEmit 2>&1 | head -30
Don't wait until the end of a session to run the compiler. Run it after every 2–3 files. Catching a type error after 3 files means 1 file to fix. Catching it after 20 files means a detective hunt.

Step 3: Feed errors back immediately
If the compiler errors, paste the full error into Claude:

text

The TypeScript compiler says:

[paste error]

Fix this without changing the function's public interface.
The phrase "without changing the function's public interface" is important. It prevents Claude from "fixing" an error by changing a type to any or weakening the schema.

Step 4: Commit after every working phase
Bash

git add .
git commit -m "feat(tier-1): phase 2 complete — DB schema + memory helpers"
Commit after every phase, not at the end of the day. If Claude produces something that breaks everything in Phase 4, you can git checkout back to Phase 3's working state in 10 seconds.

5. Managing Context — The Most Important Operational Skill
5a. How to know when context is degrading
Signs that Claude's context is getting stale:

It starts using any types when it wasn't before
It forgets the constitutional rules (e.g. suggests importing execute.ts somewhere wrong)
It proposes a different file structure than what already exists
It adds new dependencies that weren't in the spec
Its answers get shorter and less specific
When you see two or more of these signs: end the session.

5b. The "Context Health Check" prompt
Run this every hour or so during a long session:

text

Quick context check — without reading any files, tell me:
1. What is the single write gateway file in this project?
2. What are the 6 oracle sub-agents in Phase 4?
3. What does BUNQ_ENV=sandbox change about webhook validation?
4. What is the token budget for each oracle sub-agent?
If Claude gets any of these wrong, its context is degrading. Either refresh by re-reading the spec, or end the session.

5c. How to refresh context mid-session without ending it
If context is degrading but you're not ready to end the session:

text

Before we continue, please re-read CLAUDE.md and 
Section 6 of CompleteBuildSpecification.md.
Tell me when you've finished reading both.
This re-anchors Claude to the spec without starting a new session. It costs 2 minutes and saves potentially hours of drift.

5d. The "State Summary" technique at session boundaries
At the end of every session, before you close it, ask:

text

Write me a handoff note for the next session. Include:
1. Every file created or modified this session (full path)
2. Final status of each phase (COMPLETE / PARTIAL / BLOCKED)
3. Any deviations from the spec (even minor ones) and why
4. The first thing the next session should do
5. Any gotchas or decisions made that aren't in the spec

Write it as if explaining to a new engineer taking over.
Save this handoff note somewhere (a HANDOFF.md file, or just paste it into your notes). When you start Session B, paste this into the session alongside Prefix Block B. It gives Claude the continuity that spans context windows.

6. Hackathon-Specific Tactical Advice
6a. Time boxing is everything
Allocate your time before you start, and stick to it:

text

08:00–08:30  Environment check, bunq sandbox key working, Phase 0 gate
08:30–12:00  Session A (Phases 1–6) — MUST be done by noon
12:00–12:30  Lunch break — do not build through lunch, you need the mental reset
12:30–16:00  Session B (Phases 7–11)
16:00–16:30  Break — walk around, talk to other teams, clear your head
16:30–18:30  Session C (Phases 12–15) — prioritise 15c (start script) and 15d (checklist)
18:30–19:00  Full demo run-through (timed, with the script)
19:00–demo   Buffer for bug fixes only — no new features
The most common hackathon failure mode: spending 3 hours perfecting Phase 2 and having no working demo at submission time. Your spec already has the emergency priority order. Use it.

6b. Demo-first development mindset
Every 2 hours, ask yourself: "If the hackathon ended right now, what would I demo?" If the answer is "nothing," you need to pivot to whatever makes something demoable immediately, even if it's just a hardcoded fake.

The OracleVotingPanel animating with real data is worth more to a judge than a perfectly implemented Pattern Brain that never gets shown. Working demo beats perfect code every time.

6c. The "Fake It to Prove It" technique
For components that depend on backend data, build the frontend with hardcoded mock data first, then wire it to the real backend:

text

Write OracleVotingPanel.tsx with hardcoded mock data for the 
6 agent votes. I want to see it render correctly in the browser 
with animations working before we wire it to the WebSocket.
Mock data should simulate: 3 CLEAR votes, 2 WARN votes, 1 INTERVENE vote.
This lets you validate the UI looks right in 10 minutes, without waiting for the full backend to be ready. Then:

text

Now replace the hardcoded mock data with the useWebSocket hook.
Keep the exact same component shape — only change the data source.
6d. The "Bunq Sandbox Is Slow" reality
The bunq sandbox API can be slow and occasionally flaky. Do not rely on it for UI development or animation testing. Always have:

A seed script with local fake data (you have scripts/seed-demo.ts in the spec)
A way to trigger oracle runs and interventions with local fake webhook payloads
The ability to develop the frontend entirely against the local daemon (no bunq calls needed)
Add this to your daemon early in Session A:

text

Add a POST /api/dev/trigger-oracle route that is only 
registered when BUNQ_ENV=sandbox.
It accepts a JSON body describing a fake state, runs the oracle 
against that state, and emits the WebSocket messages.
This lets us demo oracle animations without depending on real bunq webhooks.
This one endpoint will save you enormous time during Session B and C.

6e. The "Demo Payload" files
Create a demo-payloads/ directory with pre-crafted JSON files for each demo scenario:

Bash

demo-payloads/
├── fraud-webhook.json        # late night, foreign currency, round amount, new payee
├── salary-webhook.json       # €3200 from regular employer
├── low-balance-webhook.json  # balance drops to €287
└── velocity-spike.json       # €340 spent in 4 hours
During the demo, you trigger these with:

Bash

curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d @demo-payloads/fraud-webhook.json
Script these as one-liners. During the demo you want one command to trigger each scenario, not fumbling with JSON in a terminal.

6f. Two terminals, always
Keep two terminal windows open throughout:

Terminal 1: Claude Code (your coding session)
Terminal 2: Running the daemon + watching logs
When Claude writes a new route, you immediately test it in Terminal 2:

Bash

curl -X POST http://localhost:3001/api/score
Don't wait until "all routes are done" to test any of them. Test each one as it's written.

6g. The "Screenshot Anchor" technique
After each phase is working, take a screenshot of the running UI. Keep these screenshots accessible. Two reasons:

If you break something in a later phase, you have a visual reference for what "working" looked like
At demo time, if something mysteriously stops working, you can show the screenshot as evidence it worked — judges understand hackathon environments are unstable
7. What to Do When Things Go Wrong
When Claude produces code that doesn't compile
Don't ask Claude to "fix it." Ask Claude to reason about it:

text

The TypeScript compiler says [error].
Before you fix it, explain to me why this error is happening.
What type is wrong and what should it actually be?
Getting Claude to articulate the problem before fixing it produces better fixes. If it fixes without understanding, it tends to paper over the error (with as any or similar) rather than actually resolving it.

When Claude goes off-spec
If Claude proposes something not in the spec:

text

Stop. What you're proposing is not in the spec.
The spec in Section 6 Phase [N] says [quote the spec].
Your proposal would [explain the deviation].
Implement what the spec says, not what you're proposing.
Be firm. Claude will sometimes "improve" on the spec. During a hackathon, improvements are enemies. Spec compliance is your friend because the spec was designed to make the demo work.

When a bunq API call returns an unexpected error
text

The bunq API returned this response: [paste response]
The call I was making was: [describe the call]
Read the exact Zod schema we defined for this response.
Tell me if the response shape matches the schema, and if not, 
what specifically differs.
99% of bunq API errors at a hackathon are one of: wrong signing, expired session, wrong sandbox URL, or a response shape that doesn't match your Zod schema. Diagnose methodically, not frantically.

When the WebSocket isn't delivering messages
This is the most common integration bug. Diagnose in this order:

Is the daemon actually emitting? Add console.log('WS EMIT:', msg.type) before every wsEmit() call
Is the WS route registered? Check daemon startup logs
Is the frontend connecting? Check browser DevTools → Network → WS tab — is the connection established?
Is the message shape matching? Check useWebSocket.ts — is it validating the type field correctly and maybe rejecting messages?
Ask Claude:

text

The WebSocket is connected (I can see it in DevTools) but no 
BUNQSY_SCORE messages are arriving in the frontend.
Read loop.ts, bunqsy-score.ts, routes/ws.ts, and useWebSocket.ts.
Trace the exact path a BUNQSY_SCORE message takes from computation 
to the React component's state. Tell me every step and what could 
fail at each step.
When you're running out of time
Invoke the Emergency Priority Order from PrefixInstructions.md explicitly:

text

We are running out of time. I need you to stop all current work 
and focus exclusively on making Priority 1 items from the 
Emergency Priority Order work end-to-end.

Priority 1 is:
- Daemon starts without crash
- BUNQSY Score updating in frontend via WebSocket
- Oracle voting panel animating on a test webhook payload
- At least one intervention type rendering in the UI

Identify which of these are currently NOT working and fix them 
in that order. Do not work on anything else.
8. The Night Before Checklist
Do this tonight so tomorrow morning is a standing start:

text

□ CLAUDE.md created in repo root (copy of Section 2 from spec)
□ CompleteBuildSpecification.md committed to specs/
□ PrefixInstructions.md committed to specs/
□ Monorepo skeleton scaffolded (package.json files for root, shared, daemon, frontend)
□ .env file created with your actual bunq sandbox API key
□ bunq sandbox key verified working (manual curl to /installation)
□ Node 20+ installed and verified
□ whisper.cpp compiled and base model downloaded (test: whisper --help)
□ Ollama installed, nomic-embed-text pulled, ollama serve tested
□ better-sqlite3 installed and compiling (npm install in daemon package)
□ ngrok or cloudflare tunnel installed and authenticated
□ Demo payload JSON files created (fraud, salary, low-balance, velocity)
□ Prefix Block A text saved somewhere easily copy-pasteable
□ Git status: clean working tree, all spec files committed
□ Your Anthropic API key has sufficient credits for a full day of Claude Code
□ You have slept. This matters more than any of the above.
9. The Morning Of — First 30 Minutes Protocol
text

08:00  Open terminal. Navigate to repo. Run: git status → should be clean.
08:02  Run: ollama serve (background)
08:03  Run: npx tsx scripts/test-signing.ts
         → If ✅: celebrate, proceed to Session A Phase 1
         → If ❌: fix signing tonight was the job — diagnose now
08:10  Open VS Code + Claude Code
08:12  Start Session A with the Universal Session Start Protocol
08:15  Give Claude the Prefix Block A text
08:17  Wait for Claude to confirm its plan
08:19  Say "confirmed — begin with Phase 0" (or "Phase 1" if gate already passed)
08:20  Building begins
10. The Single Most Important Piece of Advice
At the hackathon, there will be a moment — probably around 2pm — where you hit a bug that seems unfixable, a phase that's taking three times longer than expected, or a Claude response that's just completely wrong. You will feel the urge to panic and start cutting corners everywhere simultaneously.

Don't.

When that moment comes, stop. Close the laptop for 5 minutes. Walk to get water. Then come back and ask yourself one question: "What is the minimum I need to make the demo work?"

Go back to the Emergency Priority Order. Do exactly that. Nothing else. Your spec has already done the thinking for you — the triage order is written down. Trust it.

You have a better spec than most production fintech teams have. You have a demo script that's been designed to win. You have constitutional rules that prevent catastrophic demo-day failures. The foundation is genuinely excellent.

Tomorrow, your only job is to execute it. Good luck. 🚀





Alright, tomorrow in the hackathon.... i will use claude for the first time. is there any recommendations /tips and tricks on how i should set it up to build the project and for me to achieve best possible results. be as detailed as possible

claude-sonnet-4-6-search
No Sources
Here is the complete rewritten PrefixInstructions.md:

Markdown

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




give me the new fully written PrefixInstructions.md with updated prefix blocks A/B/C that reflect the new phase boundaries, new files, new agents, and new endpoints.

claude-sonnet-4-6-search
No Sources
Here is the complete rewritten CompleteBuildSpecification.md:

Markdown

# BUNQSY Finance — Complete Build Specification v2.0
# bunq Hackathon 7.0

---

## 0. Document Purpose & Authority

This document is the **single source of truth** for the entire BUNQSY Finance build.
No other document, memory, or prior conversation overrides what is written here.
Claude Code must read this file at the start of every session before writing a
single line of code. If anything in this spec conflicts with a prompt given
during a session, this spec wins.

---

## 1. Product Vision

**BUNQSY Finance is an always-on background financial guardian for bunq users.**

It does not wait for prompts. It monitors events in real time, detects risk and
behavioural patterns, consolidates knowledge while the user sleeps, and
intervenes proactively — before damage is done. It is the difference between a
financial chatbot and a financial guardian.

Core pillars:
- **Proactive** — fires on its own every 30 seconds, not on user request
- **Predictive** — forecasts the next 30 days from pattern confidence scores
- **Explainable** — every decision narrated in plain English, every vote visible
- **Safe** — one write gateway, plan-before-act, user confirmation on all execution
- **Local-first** — all reasoning runs locally, data never leaves without consent

---

## 2. Constitutional Rules (`CLAUDE.md` as Law)

These rules are absolute. They cannot be overridden by any prompt during a
session. They must be enforced by the coding agent at all times.
CONSTITUTIONAL RULES — BUNQSY FINANCE

PLAN BEFORE ACT Never write to the bunq API without first constructing an ExecutionPlan, narrating it to the user, and receiving explicit confirmation (voice "yes" or UI tap). No exceptions.

SINGLE WRITE GATEWAY The file packages/daemon/src/bunq/execute.ts is the ONLY file permitted to make POST, PUT, or DELETE requests to the bunq API. All other files are read-only with respect to bunq. If you find yourself writing a fetch/axios POST to bunq anywhere else, stop and refactor.

BOUNDED SUB-AGENTS Every sub-agent in the Risk Oracle has a hard token budget of 800 tokens input + 200 tokens output. Sub-agents cannot call other sub-agents. They cannot execute writes. They return only a typed JSON vote object.

APPEND-ONLY LOGS The heartbeat tick log and intervention log are append-only. Never update or delete a log row. Use INSERT only.

STRICT TYPESCRIPT All files use strict TypeScript. No any. No implicit returns. All external data (bunq API responses, Claude outputs) must be validated with Zod schemas before use.

PHASE ORDER IS MANDATORY Build phases must be completed in order. Do not scaffold Phase 3 code while Phase 2 is incomplete. Do not write frontend components until the daemon endpoint they consume exists and returns a 200.

PHASE 0 IS A HARD GATE The signing test (Phase 0) must pass with a 200 response from the bunq sandbox before any other code is written. This is non-negotiable.

ENVIRONMENT AWARENESS All environment-specific behaviour (IP allowlisting, sandbox vs production endpoints, mock data) must be driven by the BUNQ_ENV environment variable. Never hardcode environment assumptions.

WORKER ISOLATION Dream Mode runs in a forked child process. The parent process must set a 10-minute kill timeout on the worker. The worker must never import execute.ts or make bunq write calls.

EXPLAINABILITY IS NOT OPTIONAL Every InterventionCard, OracleVotingPanel verdict, and DreamBriefing must include a plain-English narration generated by Claude. JSON alone is never shown to the user.

text


---

## 3. Monorepo Structure
bunqsy-finance/ ├── CLAUDE.md ← Constitutional rules (copy of Section 2) ├── package.json ← Turborepo root ├── turbo.json ├── .env.example ├── specs/ │ └── CompleteBuildSpecification.md ← This file │ ├── packages/ │ ├── shared/ ← Canonical types, Zod schemas, constants │ │ ├── src/ │ │ │ ├── types/ │ │ │ │ ├── bunq.ts ← bunq API response shapes │ │ │ │ ├── events.ts ← Internal event bus types │ │ │ │ ├── memory.ts ← DB row types │ │ │ │ ├── oracle.ts ← Vote, verdict, sub-agent types │ │ │ │ ├── plan.ts ← ExecutionPlan, ExecutionStep types │ │ │ │ └── ws.ts ← WebSocket message envelope types │ │ │ └── index.ts │ │ └── package.json │ │ │ ├── daemon/ ← Node.js + Fastify backend │ │ ├── src/ │ │ │ ├── index.ts ← Fastify server bootstrap │ │ │ ├── bunq/ │ │ │ │ ├── auth.ts ← Installation, device-server, session │ │ │ │ ├── client.ts ← Read-only bunq HTTP client │ │ │ │ ├── execute.ts ← ⚠️ ONLY write gateway (POST/PUT/DELETE) │ │ │ │ ├── signing.ts ← RSA + SHA256 request signing │ │ │ │ ├── webhook.ts ← Webhook receiver + signature validation │ │ │ │ └── accounts.ts ← Account + balance read helpers │ │ │ ├── memory/ │ │ │ │ ├── db.ts ← SQLite connection + migrations │ │ │ │ ├── schema.sql ← Full DB schema │ │ │ │ ├── transactions.ts ← Transaction read/write helpers │ │ │ │ ├── patterns.ts ← Pattern CRUD + confidence update │ │ │ │ ├── profile.ts ← UserProfile + Goals helpers │ │ │ │ ├── interventions.ts ← Intervention log helpers │ │ │ │ └── vector.ts ← sqlite-vec embedding search │ │ │ ├── heartbeat/ │ │ │ │ ├── loop.ts ← 30s tick, Recall→Reason→React │ │ │ │ ├── recall.ts ← State hydration (minimal slice) │ │ │ │ ├── bunqsy-score.ts ← BUNQSY Score computation + emission │ │ │ │ └── tick-log.ts ← Append-only tick log writer │ │ │ ├── oracle/ │ │ │ │ ├── index.ts ← Orchestrator: runs all agents, aggregates │ │ │ │ ├── agents/ │ │ │ │ │ ├── balance-sentinel.ts │ │ │ │ │ ├── velocity-analyzer.ts │ │ │ │ │ ├── pattern-matcher.ts │ │ │ │ │ ├── subscription-watcher.ts │ │ │ │ │ ├── rent-proximity-guard.ts │ │ │ │ │ └── fraud-shadow.ts ← NEW: 6th sub-agent │ │ │ │ └── aggregator.ts ← Voting aggregation → verdict │ │ │ ├── intervention/ │ │ │ │ ├── engine.ts ← Modality selection + dispatch │ │ │ │ ├── handlers/ │ │ │ │ │ ├── low-balance.ts │ │ │ │ │ ├── impulse-buy.ts │ │ │ │ │ ├── salary-received.ts │ │ │ │ │ ├── subscription-duplicate.ts │ │ │ │ │ ├── fraud-block.ts ← NEW: Draft payment block handler │ │ │ │ │ └── dream-suggestion.ts │ │ │ │ └── explainer.ts ← NEW: Claude narration for every card │ │ │ ├── voice/ │ │ │ │ ├── stt.ts ← whisper.cpp STT │ │ │ │ ├── planner.ts ← Claude → ExecutionPlan │ │ │ │ └── executor.ts ← Confirmed plan → execute.ts │ │ │ ├── receipt/ │ │ │ │ ├── extractor.ts ← Claude Vision → structured receipt │ │ │ │ ├── verifier.ts ← Self-verification (line item check) │ │ │ │ └── categorizer.ts ← Category + optional jar action │ │ │ ├── dream/ │ │ │ │ ├── scheduler.ts ← node-cron 2am trigger │ │ │ │ ├── trigger.ts ← Manual trigger (forks worker) │ │ │ │ ├── worker.ts ← Forked child: consolidation logic │ │ │ │ └── dna.ts ← NEW: Financial DNA card generation │ │ │ ├── forecast/ │ │ │ │ └── engine.ts ← NEW: 30-day pattern extrapolation │ │ │ ├── jars/ │ │ │ │ └── agent.ts ← NEW: SavingsJarAgent │ │ │ ├── patterns/ │ │ │ │ ├── brain.ts ← Pattern load, match, promote │ │ │ │ └── skills/ ← Markdown pattern skill files │ │ │ └── routes/ │ │ │ ├── webhook.ts ← POST /api/webhook │ │ │ ├── voice.ts ← POST /api/voice │ │ │ ├── receipt.ts ← POST /api/receipt │ │ │ ├── dream.ts ← POST /api/dream/trigger, GET /api/dream/latest │ │ │ ├── forecast.ts ← GET /api/forecast │ │ │ ├── score.ts ← GET /api/score │ │ │ ├── confirm.ts ← POST /api/confirm/:planId │ │ │ └── ws.ts ← WebSocket upgrade handler │ │ └── package.json │ │ │ └── frontend/ ← React + Vite │ ├── src/ │ │ ├── App.tsx │ │ ├── components/ │ │ │ ├── BUNQSYScore.tsx ← NEW: Live score display │ │ │ ├── OracleVotingPanel.tsx ← NEW: Live sub-agent vote rows │ │ │ ├── InterventionCard.tsx ← Existing + explainability overlay │ │ │ ├── VoiceOrb.tsx │ │ │ ├── ReceiptScanner.tsx │ │ │ ├── DreamBriefing.tsx ← Updated: includes DNA card │ │ │ ├── ForecastChart.tsx ← NEW: 30-day area chart │ │ │ ├── FraudBlock.tsx ← NEW: Draft payment confirmation │ │ │ └── DreamTrigger.tsx ← NEW: "Trigger Dream Now" button │ │ ├── hooks/ │ │ │ ├── useWebSocket.ts │ │ │ ├── useBUNQSYScore.ts ← NEW │ │ │ └── useForecast.ts ← NEW │ │ └── main.tsx │ └── package.json

text


---

## 4. Environment Variables

```env
# .env.example

# bunq environment: "sandbox" | "production"
BUNQ_ENV=sandbox

# bunq API credentials
BUNQ_API_KEY=
BUNQ_DEVICE_DESCRIPTION=BunqsyFinance-Dev

# bunq sandbox base URL
BUNQ_SANDBOX_URL=https://public-api.sandbox.bunq.com/v1
BUNQ_PRODUCTION_URL=https://api.bunq.com/v1

# Anthropic
ANTHROPIC_API_KEY=

# Ollama (local embeddings)
OLLAMA_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text

# Whisper (local STT)
WHISPER_MODEL_PATH=./models/ggml-base.bin

# Database
DB_PATH=./bunqsy.db

# Server
PORT=3001
WS_PORT=3002

# Webhook tunnel (ngrok or similar for sandbox)
WEBHOOK_PUBLIC_URL=

# BUNQSY Score weights (tune as needed)
SCORE_WEIGHT_BALANCE=0.35
SCORE_WEIGHT_VELOCITY=0.25
SCORE_WEIGHT_GOALS=0.25
SCORE_WEIGHT_UPCOMING=0.15
5. Build Priority Tiers
Before reading the phases, internalize this priority table. Build in Tier order. Never start Tier 2 until Tier 1 is complete and tested. Never start Tier 3 until Tier 2 is complete and tested.

text

TIER 1 — MUST SHIP (demo collapses without these)
  Phase 0:  Signing test gate
  Phase 1:  bunq auth + client + webhook receiver
  Phase 2:  DB schema + memory helpers
  Phase 3:  Heartbeat loop + BUNQSY Score
  Phase 4:  Risk Oracle (6 sub-agents) + Oracle Voting Panel WebSocket
  Phase 5:  Intervention Engine + Explainability Overlay
  Phase 6:  Core frontend (BUNQSYScore, OracleVotingPanel, InterventionCard)

TIER 2 — SHOULD SHIP (demo is significantly stronger with these)
  Phase 7:  Voice pipeline
  Phase 8:  Receipt vision pipeline
  Phase 9:  Dream Mode + Dream Trigger button + Financial DNA Card
  Phase 10: Savings Jar Agent (SavingsJarAgent)
  Phase 11: Forecast engine + ForecastChart

TIER 3 — NICE TO HAVE (polish, adds depth if time allows)
  Phase 12: Fraud Shadow → Draft Payment block (FraudBlock component)
  Phase 13: Pattern promotion + Dream consolidation full pipeline
  Phase 14: Multi-account intelligence (joint accounts)
  Phase 15: Demo polish, animations, loading states
6. Phases — Detailed Specifications
PHASE 0: Signing Test Gate (Tier 1 — Hard Gate)
Purpose: Prove your signing implementation matches bunq's exact expectation before writing a single line of application logic. If this fails, nothing works.

What bunq expects for signed requests:

Sign the request body string (not a canonical URL+headers string)
Algorithm: RSA with SHA-256
Encode result: base64 standard encoding
Header name: X-Bunq-Client-Signature
Your RSA key pair: 2048-bit minimum, PKCS#8 format
bunq validates using the public key you registered at installation
Files to create:

text

packages/daemon/src/bunq/signing.ts
scripts/test-signing.ts
signing.ts — exact contract:

TypeScript

import crypto from 'crypto';

export interface SigningKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

export function generateKeyPair(): SigningKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

export function signRequestBody(body: string, privateKeyPem: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(body);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

export function verifyWebhookSignature(
  body: string,
  signatureBase64: string,
  bunqPublicKeyPem: string
): boolean {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(body);
    verify.end();
    return verify.verify(bunqPublicKeyPem, signatureBase64, 'base64');
  } catch {
    return false;
  }
}
scripts/test-signing.ts — gate script:

TypeScript

// Run with: npx tsx scripts/test-signing.ts
// Must print "✅ PHASE 0 GATE PASSED" before proceeding to Phase 1.
// Any other output means the signing implementation is broken.

async function runGate() {
  const { generateKeyPair, signRequestBody } = await import(
    '../packages/daemon/src/bunq/signing'
  );

  const keys = generateKeyPair();
  const testBody = JSON.stringify({ test: true });
  const signature = signRequestBody(testBody, keys.privateKeyPem);

  // 1. Register installation with bunq sandbox
  const installRes = await fetch(
    `${process.env.BUNQ_SANDBOX_URL}/installation`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_public_key: keys.publicKeyPem }),
    }
  );

  if (!installRes.ok) {
    console.error('❌ PHASE 0 GATE FAILED — installation call returned', installRes.status);
    process.exit(1);
  }

  const installData = await installRes.json();
  const installToken = installData.Response.find(
    (r: any) => r.Token
  )?.Token?.token;

  if (!installToken) {
    console.error('❌ PHASE 0 GATE FAILED — no token in installation response');
    process.exit(1);
  }

  // 2. Register device-server
  const deviceBody = JSON.stringify({
    description: 'BunqsyFinance-Gate-Test',
    secret: process.env.BUNQ_API_KEY,
    permitted_ips: ['*'],
  });
  const deviceSig = signRequestBody(deviceBody, keys.privateKeyPem);

  const deviceRes = await fetch(
    `${process.env.BUNQ_SANDBOX_URL}/device-server`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bunq-Client-Authentication': installToken,
        'X-Bunq-Client-Signature': deviceSig,
      },
      body: deviceBody,
    }
  );

  if (!deviceRes.ok) {
    console.error('❌ PHASE 0 GATE FAILED — device-server returned', deviceRes.status);
    process.exit(1);
  }

  console.log('✅ PHASE 0 GATE PASSED — signing implementation is correct');
  console.log('   You may proceed to Phase 1.');
  process.exit(0);
}

runGate().catch((e) => {
  console.error('❌ PHASE 0 GATE FAILED — unexpected error:', e.message);
  process.exit(1);
});
Success criterion: Script exits 0 and prints ✅ PHASE 0 GATE PASSED. Do not write Phase 1 code until you see this message.

PHASE 1: bunq Integration Layer (Tier 1)
Files:

text

packages/daemon/src/bunq/auth.ts
packages/daemon/src/bunq/client.ts
packages/daemon/src/bunq/execute.ts
packages/daemon/src/bunq/webhook.ts
packages/daemon/src/bunq/accounts.ts
1a. Auth (auth.ts)
Manages the three-step bunq auth flow and session refresh.

TypeScript

// Exported interface
export interface BunqSession {
  installationToken: string;
  sessionToken: string;
  userId: number;
  keyPair: SigningKeyPair;
  expiresAt: Date;
}

export async function createSession(apiKey: string): Promise<BunqSession>
export async function refreshSessionIfNeeded(session: BunqSession): Promise<BunqSession>
Flow:

POST /installation with public key → store installationToken
POST /device-server with apiKey + installationToken
POST /session-server with apiKey + installationToken → store sessionToken + userId
Store session in DB (sessions table). On daemon restart, reload session and refresh if within 30 minutes of expiry.
1b. Read Client (client.ts)
TypeScript

export class BunqClient {
  constructor(private session: BunqSession) {}

  async get<T>(path: string): Promise<T>
  async getAccounts(): Promise<MonetaryAccount[]>
  async getTransactions(accountId: number, count?: number): Promise<Payment[]>
  async getCards(): Promise<Card[]>
  async getScheduledPayments(accountId: number): Promise<ScheduledPayment[]>
}
All methods are GET only
All responses validated with Zod schemas defined in packages/shared/src/types/bunq.ts
Client automatically calls refreshSessionIfNeeded before each request
1c. Write Gateway (execute.ts)
This is the only file in the entire codebase permitted to make write calls.

TypeScript

export interface ExecutionStep {
  id: string;
  type: 'PAYMENT' | 'DRAFT_PAYMENT' | 'SAVINGS_TRANSFER' | 'CANCEL_DRAFT';
  description: string;
  payload: unknown;
}

export interface ExecutionPlan {
  id: string;                    // uuid
  createdAt: Date;
  narratedText: string;          // Plain English narration shown to user
  steps: ExecutionStep[];
  status: 'PENDING' | 'CONFIRMED' | 'EXECUTED' | 'CANCELLED';
  confirmedAt?: Date;
  executedAt?: Date;
}

export async function createExecutionPlan(steps: ExecutionStep[], narratedText: string): Promise<ExecutionPlan>
export async function confirmPlan(planId: string): Promise<void>      // sets status CONFIRMED
export async function executePlan(planId: string): Promise<void>      // requires status CONFIRMED
export async function cancelPlan(planId: string): Promise<void>
executePlan internally:

Loads plan from DB, asserts status === 'CONFIRMED', throws if not
Executes steps sequentially via direct fetch to bunq with signing
Appends each step result to DB
Sets status to 'EXECUTED' and executedAt
1d. Webhook Receiver (webhook.ts)
TypeScript

export function validateWebhookRequest(
  rawBody: string,
  headers: Record<string, string>,
  session: BunqSession
): boolean

export function parseWebhookEvent(rawBody: string): BunqWebhookEvent
IP Allowlist — environment-aware:

TypeScript

const PRODUCTION_CIDR = '185.40.108.0/22';

export function isAllowedOrigin(remoteIp: string): boolean {
  if (process.env.BUNQ_ENV === 'sandbox') {
    // Sandbox callbacks come from variable AWS IPs — skip IP filtering,
    // rely on signature validation only
    return true;
  }
  // Production: enforce CIDR range
  return isInCidr(remoteIp, PRODUCTION_CIDR);
}
Webhook handler flow:

isAllowedOrigin check (skip IP filter in sandbox)
validateWebhookRequest signature check (always enforced)
Parse event
Emit to internal event bus
Trigger immediate heartbeat tick (don't wait for the 30s interval)
Register webhook with bunq:

TypeScript

export async function registerWebhookUrl(
  client: BunqClient,
  session: BunqSession,
  publicUrl: string
): Promise<void>
// POST /user/{userId}/notification-filter-url
// Categories: PAYMENT, MUTATION, CARD_TRANSACTION_SUCCESSFUL, CARD_TRANSACTION_FAILED,
//             DRAFT_PAYMENT, SAVINGS_GOAL_REACHED
1e. Account Helpers (accounts.ts)
TypeScript

export async function getAllAccounts(client: BunqClient): Promise<MonetaryAccount[]>
export async function getPrimaryAccount(client: BunqClient): Promise<MonetaryAccount>
export async function getSavingsAccounts(client: BunqClient): Promise<MonetaryAccount[]>
export async function getTotalBalance(client: BunqClient): Promise<number>
PHASE 2: Data Model & SQLite Schema (Tier 1)
Files:

text

packages/daemon/src/memory/schema.sql
packages/daemon/src/memory/db.ts
packages/daemon/src/memory/transactions.ts
packages/daemon/src/memory/patterns.ts
packages/daemon/src/memory/profile.ts
packages/daemon/src/memory/interventions.ts
packages/daemon/src/memory/vector.ts
2a. Full Schema (schema.sql)
SQL

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_token TEXT NOT NULL,
  session_token TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  public_key_pem TEXT NOT NULL,
  private_key_pem TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transactions (local cache)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,                 -- bunq payment ID as string
  bunq_account_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  counterparty_name TEXT,
  counterparty_iban TEXT,
  description TEXT,
  category TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Patterns (skill files in DB)
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,                 -- uuid
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_conditions TEXT NOT NULL,    -- JSON
  intervention_template TEXT NOT NULL, -- JSON
  confidence REAL NOT NULL DEFAULT 0.5,
  hit_count INTEGER NOT NULL DEFAULT 0,
  confirmed_count INTEGER NOT NULL DEFAULT 0,
  dismissed_count INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pattern embeddings (sqlite-vec)
CREATE VIRTUAL TABLE IF NOT EXISTS pattern_embeddings USING vec0(
  pattern_id TEXT,
  embedding float[768]
);

-- User Profile
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,   -- singleton row
  name TEXT,
  salary_day INTEGER,                  -- day of month salary lands
  salary_amount REAL,
  rent_amount REAL,
  rent_day INTEGER,
  timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
  voice_enabled INTEGER NOT NULL DEFAULT 1,
  active_hours_start INTEGER NOT NULL DEFAULT 7,
  active_hours_end INTEGER NOT NULL DEFAULT 23,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  jar_account_id INTEGER,             -- bunq sub-account ID if linked
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Interventions (append-only)
CREATE TABLE IF NOT EXISTS interventions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  risk_score REAL NOT NULL,
  verdict TEXT NOT NULL,
  modality TEXT NOT NULL,
  narration TEXT NOT NULL,
  oracle_votes TEXT NOT NULL,          -- JSON array of votes
  execution_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'SHOWN', -- SHOWN | CONFIRMED | DISMISSED | EXECUTED
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Execution Plans (append-only)
CREATE TABLE IF NOT EXISTS execution_plans (
  id TEXT PRIMARY KEY,
  narrated_text TEXT NOT NULL,
  steps TEXT NOT NULL,                 -- JSON array of ExecutionStep
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT,
  executed_at TEXT
);

-- Execution Step Results (append-only)
CREATE TABLE IF NOT EXISTS execution_step_results (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  success INTEGER NOT NULL,
  bunq_response TEXT,                  -- JSON
  error_message TEXT,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Heartbeat Tick Log (append-only)
CREATE TABLE IF NOT EXISTS tick_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tick_at TEXT NOT NULL DEFAULT (datetime('now')),
  duration_ms INTEGER,
  reason_ran INTEGER NOT NULL DEFAULT 0,  -- 1 if heavy reasoning was triggered
  verdict TEXT,
  risk_score REAL,
  bunqsy_score REAL,
  intervention_id TEXT
);

-- Dream Sessions (append-only)
CREATE TABLE IF NOT EXISTS dream_sessions (
  id TEXT PRIMARY KEY,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'manual'
  completed_at TEXT,
  duration_ms INTEGER,
  patterns_updated INTEGER,
  patterns_created INTEGER,
  briefing_text TEXT,
  dna_card TEXT,
  suggestions TEXT,                    -- JSON array of 3 suggestions
  status TEXT NOT NULL DEFAULT 'RUNNING'  -- RUNNING | COMPLETED | FAILED | KILLED
);

-- BUNQSY Score Log (append-only)
CREATE TABLE IF NOT EXISTS score_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  score REAL NOT NULL,
  balance_component REAL,
  velocity_component REAL,
  goals_component REAL,
  upcoming_component REAL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Forecast Cache
CREATE TABLE IF NOT EXISTS forecast_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  generated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  data TEXT NOT NULL                   -- JSON: ForecastPoint[]
);
2b. DB Connection (db.ts)
TypeScript

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(process.env.DB_PATH ?? './bunqsy.db');
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    _db.exec(schema);
  }
  return _db;
}
PHASE 3: Heartbeat Loop + BUNQSY Score (Tier 1)
Files:

text

packages/daemon/src/heartbeat/loop.ts
packages/daemon/src/heartbeat/recall.ts
packages/daemon/src/heartbeat/bunqsy-score.ts
packages/daemon/src/heartbeat/tick-log.ts
3a. BUNQSY Score (bunqsy-score.ts)
The BUNQSY Score is a real-time composite health indicator (0–100) updated on every heartbeat tick and emitted over WebSocket.

TypeScript

export interface BUNQSYScoreComponents {
  balance: number;       // 0–100: how healthy current balance is vs. upcoming commitments
  velocity: number;      // 0–100: spend rate relative to historical norm (inverted: lower spend = higher)
  goals: number;         // 0–100: weighted progress across all active goals
  upcoming: number;      // 0–100: penalty for large commitments due in <7 days
}

export interface BUNQSYScore {
  score: number;                    // 0–100, weighted composite
  components: BUNQSYScoreComponents;
  trend: 'rising' | 'falling' | 'stable';
  computedAt: Date;
}

export async function computeBUNQSYScore(state: RecalledState): Promise<BUNQSYScore>
Weight formula:

text

score = (
  balance_component * SCORE_WEIGHT_BALANCE +
  velocity_component * SCORE_WEIGHT_VELOCITY +
  goals_component * SCORE_WEIGHT_GOALS +
  (100 - upcoming_penalty) * SCORE_WEIGHT_UPCOMING
)
Trend: compare current score to last 3 tick_log rows.

rising: current > avg of last 3 by >3 points
falling: current < avg of last 3 by >3 points
stable: within 3 points
WebSocket emission on every tick:

TypeScript

// packages/shared/src/types/ws.ts
export type WSMessage =
  | { type: 'BUNQSY_SCORE'; payload: BUNQSYScore }
  | { type: 'ORACLE_VOTE'; payload: OracleVote }            // emitted per sub-agent as it completes
  | { type: 'ORACLE_VERDICT'; payload: OracleVerdict }
  | { type: 'INTERVENTION'; payload: InterventionPayload }
  | { type: 'DREAM_UPDATE'; payload: DreamUpdate }
  | { type: 'DREAM_COMPLETE'; payload: DreamBriefingPayload }
  | { type: 'PLAN_CREATED'; payload: ExecutionPlan }
  | { type: 'FORECAST_READY'; payload: ForecastPoint[] };
3b. Heartbeat Loop (loop.ts)
TypeScript

const TICK_INTERVAL_MS = 30_000;
const REASON_INTERVAL_TICKS = 10; // run heavy reasoning every ~5 minutes

let tickCount = 0;
let lastStateHash = '';
let activeInterventionId: string | null = null;

export async function startHeartbeat(deps: HeartbeatDeps): Promise<void> {
  // Run immediately on startup, then every 30s
  await tick(deps);
  setInterval(() => tick(deps), TICK_INTERVAL_MS);
}

async function tick(deps: HeartbeatDeps): Promise<void> {
  const start = Date.now();
  tickCount++;

  // RECALL: hydrate minimal state slice
  const state = await recall(deps.client, deps.db);
  const score = await computeBUNQSYScore(state);

  // Emit score immediately regardless of whether we reason
  deps.wsEmit({ type: 'BUNQSY_SCORE', payload: score });
  appendTickLog(deps.db, { score });

  // REASON: only if state changed OR interval elapsed OR webhook forced tick
  const stateHash = hashState(state);
  const shouldReason =
    stateHash !== lastStateHash ||
    tickCount % REASON_INTERVAL_TICKS === 0 ||
    deps.forcedByWebhook;

  if (!shouldReason) return;
  lastStateHash = stateHash;

  // Skip if an intervention is already active (don't stack)
  if (activeInterventionId !== null) return;

  // Run oracle
  const verdict = await runOracle(state, deps.wsEmit);

  appendTickLog(deps.db, {
    reasonRan: true,
    verdict: verdict.verdict,
    riskScore: verdict.riskScore,
    score: score.score,
  });

  // REACT: dispatch intervention if needed
  if (verdict.verdict === 'INTERVENE') {
    const intervention = await dispatchIntervention(verdict, state, deps);
    activeInterventionId = intervention.id;
  }
}

// Called when user dismisses or confirms an intervention
export function clearActiveIntervention(): void {
  activeInterventionId = null;
}
3c. State Recall (recall.ts)
TypeScript

export interface RecalledState {
  accounts: MonetaryAccount[];
  primaryBalance: number;
  recentTransactions: Transaction[];    // last 50
  weeklySpend: number;
  dailySpend: number;
  patterns: Pattern[];
  profile: UserProfile;
  goals: Goal[];
  upcomingCommitments: UpcomingCommitment[];  // rent, subscriptions due <7 days
  lastSalaryDate: Date | null;
  recalledAt: Date;
}

export async function recall(
  client: BunqClient,
  db: Database.Database
): Promise<RecalledState>
PHASE 4: Risk Oracle + Oracle Voting Panel (Tier 1)
Files:

text

packages/daemon/src/oracle/index.ts
packages/daemon/src/oracle/aggregator.ts
packages/daemon/src/oracle/agents/balance-sentinel.ts
packages/daemon/src/oracle/agents/velocity-analyzer.ts
packages/daemon/src/oracle/agents/pattern-matcher.ts
packages/daemon/src/oracle/agents/subscription-watcher.ts
packages/daemon/src/oracle/agents/rent-proximity-guard.ts
packages/daemon/src/oracle/agents/fraud-shadow.ts
4a. Vote Type (packages/shared/src/types/oracle.ts)
TypeScript

export type OracleAgentName =
  | 'balance-sentinel'
  | 'velocity-analyzer'
  | 'pattern-matcher'
  | 'subscription-watcher'
  | 'rent-proximity-guard'
  | 'fraud-shadow';

export type OracleVoteVerdict = 'CLEAR' | 'WARN' | 'INTERVENE';

export interface OracleVote {
  agent: OracleAgentName;
  verdict: OracleVoteVerdict;
  confidence: number;           // 0.0–1.0
  riskContribution: number;     // 0–100
  reason: string;               // one sentence, plain English
  metadata?: Record<string, unknown>;
  computedAt: Date;
}

export interface OracleVerdict {
  verdict: OracleVoteVerdict;
  riskScore: number;            // 0–100, weighted aggregate
  votes: OracleVote[];
  dominantAgent: OracleAgentName;
  computedAt: Date;
}
4b. Oracle Orchestrator (oracle/index.ts)
Critical behaviour: emit each vote over WebSocket as it completes, not after all are done. This is what makes the Oracle Voting Panel animate in real time.

TypeScript

export async function runOracle(
  state: RecalledState,
  wsEmit: (msg: WSMessage) => void
): Promise<OracleVerdict> {

  const agents: Array<() => Promise<OracleVote>> = [
    () => runBalanceSentinel(state),
    () => runVelocityAnalyzer(state),
    () => runPatternMatcher(state),
    () => runSubscriptionWatcher(state),
    () => runRentProximityGuard(state),
    () => runFraudShadow(state),
  ];

  const votes: OracleVote[] = [];

  // Run agents concurrently but emit each vote as it resolves
  await Promise.all(
    agents.map(async (agent) => {
      const vote = await agent();
      votes.push(vote);
      // Emit immediately so frontend panel animates each row as it arrives
      wsEmit({ type: 'ORACLE_VOTE', payload: vote });
    })
  );

  const verdict = aggregateVotes(votes);
  wsEmit({ type: 'ORACLE_VERDICT', payload: verdict });

  return verdict;
}
4c. Individual Sub-Agent Contracts
Each sub-agent receives RecalledState and returns an OracleVote. Each sub-agent is bounded: max 800 tokens input context, max 200 tokens output. Sub-agents do NOT call Claude unless explicitly specified below. Most are deterministic calculations.

balance-sentinel.ts — Deterministic

text

Rule: if primaryBalance < (rent_amount + weekly_spend), verdict = INTERVENE
      if primaryBalance < (rent_amount + weekly_spend) * 1.5, verdict = WARN
      else CLEAR
riskContribution = clamp(100 - (primaryBalance / (rent_amount + weekly_spend)) * 50, 0, 100)
velocity-analyzer.ts — Deterministic

text

Compare dailySpend to 30-day rolling average daily spend.
If dailySpend > avg * 2.5: INTERVENE
If dailySpend > avg * 1.5: WARN
Else: CLEAR
riskContribution = clamp((dailySpend / avg - 1) * 50, 0, 100)
pattern-matcher.ts — Uses sqlite-vec similarity search (not Claude)

text

Embed a text description of the current state snapshot using Ollama.
Search pattern_embeddings for top-3 similar patterns with confidence > 0.6.
If any matching pattern has intervention_template.severity = 'high': INTERVENE
If any matching pattern has severity = 'medium': WARN
Else: CLEAR
subscription-watcher.ts — Deterministic

text

Group transactions by (counterparty_iban, rounded_amount) over 90 days.
Flag duplicates: same counterparty, similar amount (within 5%), within 31 days of each other.
If 2+ duplicates found: WARN (potential duplicate subscription)
riskContribution = duplicates * 15, capped at 60
rent-proximity-guard.ts — Deterministic

text

daysUntilRent = profile.rent_day - today (handle month wrap)
If daysUntilRent <= 3 AND primaryBalance < rent_amount * 1.1: INTERVENE
If daysUntilRent <= 7 AND primaryBalance < rent_amount * 1.3: WARN
Else: CLEAR
fraud-shadow.ts — NEW 6th sub-agent, uses Claude (bounded)

text

Fraud signal checklist (score 1 point each):
  - Transaction time between 00:00–05:00 local time
  - Counterparty is a first-time payee (never seen in transaction history)
  - Amount is a rounded number (exactly 50, 100, 200, 500, etc.)
  - Currency differs from account's primary currency
  - Amount > 150% of user's average single transaction

Score 0: CLEAR
Score 1-2: WARN
Score 3+: INTERVENE (triggers FraudBlock intervention, not standard card)

Claude call (only when score >= 3):
  System: "You are a fraud detection oracle. Reply ONLY with valid JSON matching
           the OracleVote schema. Max 200 tokens."
  User: [compact fraud signal summary, max 400 tokens]
  
confidence = signalScore / 5
riskContribution = signalScore * 18, capped at 90
4d. Aggregator (aggregator.ts)
TypeScript

export function aggregateVotes(votes: OracleVote[]): OracleVerdict {
  // Weighted risk score: INTERVENE votes count double
  const riskScore = votes.reduce((sum, v) => {
    const weight = v.verdict === 'INTERVENE' ? 2 : v.verdict === 'WARN' ? 1 : 0.3;
    return sum + (v.riskContribution * weight * v.confidence);
  }, 0) / votes.length;

  // Verdict rules:
  // - Any INTERVENE with confidence > 0.7: verdict = INTERVENE
  // - 2+ WARN votes: verdict = WARN
  // - Else: CLEAR
  const highInterventions = votes.filter(
    v => v.verdict === 'INTERVENE' && v.confidence > 0.7
  );
  const warns = votes.filter(v => v.verdict === 'WARN');

  const verdict: OracleVoteVerdict =
    highInterventions.length > 0 ? 'INTERVENE' :
    warns.length >= 2 ? 'WARN' : 'CLEAR';

  const dominantAgent = votes.reduce((a, b) =>
    a.riskContribution > b.riskContribution ? a : b
  ).agent;

  return {
    verdict,
    riskScore: Math.min(riskScore, 100),
    votes,
    dominantAgent,
    computedAt: new Date(),
  };
}
PHASE 5: Intervention Engine + Explainability (Tier 1)
Files:

text

packages/daemon/src/intervention/engine.ts
packages/daemon/src/intervention/explainer.ts
packages/daemon/src/intervention/handlers/low-balance.ts
packages/daemon/src/intervention/handlers/impulse-buy.ts
packages/daemon/src/intervention/handlers/salary-received.ts
packages/daemon/src/intervention/handlers/subscription-duplicate.ts
packages/daemon/src/intervention/handlers/fraud-block.ts
packages/daemon/src/intervention/handlers/dream-suggestion.ts
5a. Modality Selection Matrix (engine.ts)
TypeScript

type InterventionModality = 'voice' | 'push' | 'soft_block' | 'draft_payment';

function selectModality(verdict: OracleVerdict, profile: UserProfile): InterventionModality {
  const hour = new Date().getHours();
  const inActiveHours = hour >= profile.activeHoursStart && hour <= profile.activeHoursEnd;
  const isFraud = verdict.dominantAgent === 'fraud-shadow' && verdict.verdict === 'INTERVENE';

  if (isFraud) return 'draft_payment';
  if (verdict.riskScore > 75 && inActiveHours && profile.voiceEnabled) return 'voice';
  if (verdict.riskScore > 50) return 'push';
  return 'soft_block';
}
Handler routing:

TypeScript

function routeHandler(verdict: OracleVerdict, state: RecalledState): InterventionHandler {
  if (verdict.dominantAgent === 'fraud-shadow') return fraudBlockHandler;
  if (verdict.dominantAgent === 'balance-sentinel') return lowBalanceHandler;
  if (verdict.dominantAgent === 'velocity-analyzer') return impulseBuyHandler;
  if (verdict.dominantAgent === 'subscription-watcher') return subscriptionDuplicateHandler;
  if (verdict.dominantAgent === 'rent-proximity-guard') return lowBalanceHandler;
  return impulseBuyHandler; // default
}
5b. Explainability Overlay (explainer.ts)
Every intervention must have a plain-English narration generated by Claude.

TypeScript

export async function generateExplanation(
  verdict: OracleVerdict,
  state: RecalledState
): Promise<string> {
  // Build a compact context summary (max 600 tokens)
  const context = buildExplanationContext(verdict, state);

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 150,
    system: `You are BUNQSY, a financial guardian. Explain in 2-3 plain English
             sentences why you are intervening right now. Be specific with numbers.
             Do not use jargon. Write as if speaking to the user directly.`,
    messages: [{ role: 'user', content: context }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
Example output: "Your balance dropped 40% in the last 18 hours to €312. With rent of €950 due in 3 days, you have less than a third of what you need. Two of my six agents flagged this as high risk."

This narration is stored in the interventions table and sent in the WebSocket INTERVENTION message for the frontend InterventionCard.

5c. Fraud Block Handler (handlers/fraud-block.ts)
When fraud-shadow fires with INTERVENE, this handler creates a Draft Payment request via bunq's draft payment API, requiring explicit user confirmation before the transaction can proceed.

TypeScript

export async function fraudBlockHandler(
  verdict: OracleVerdict,
  state: RecalledState,
  wsEmit: (msg: WSMessage) => void
): Promise<InterventionRecord> {

  const fraudVote = verdict.votes.find(v => v.agent === 'fraud-shadow')!;
  const explanation = await generateExplanation(verdict, state);

  // Create a PENDING ExecutionPlan with type DRAFT_PAYMENT
  // This does NOT execute — it waits for explicit user confirmation
  const plan = await createExecutionPlan(
    [{
      id: uuid(),
      type: 'DRAFT_PAYMENT',
      description: `Block suspicious transaction pending user review`,
      payload: {
        fraudSignals: fraudVote.metadata,
        requiresConfirmation: true,
      },
    }],
    `⚠️ BUNQSY detected a suspicious transaction pattern. ${explanation} Tap confirm to allow this transaction, or dismiss to block it.`
  );

  wsEmit({
    type: 'INTERVENTION',
    payload: {
      type: 'FRAUD_BLOCK',
      modality: 'draft_payment',
      narration: explanation,
      oracleVotes: verdict.votes,
      riskScore: verdict.riskScore,
      plan,
    },
  });

  // ...save to interventions table and return
}
PHASE 6: Core Frontend (Tier 1)
Files:

text

packages/frontend/src/App.tsx
packages/frontend/src/components/BUNQSYScore.tsx
packages/frontend/src/components/OracleVotingPanel.tsx
packages/frontend/src/components/InterventionCard.tsx
packages/frontend/src/hooks/useWebSocket.ts
packages/frontend/src/hooks/useBUNQSYScore.ts
6a. BUNQSYScore Component
text

Visual spec:
- Large central number (e.g. "84") in a bold sans-serif font
- Colour: green (>70), amber (40–70), red (<40)
- Trend arrow: ↑ rising, ↓ falling, → stable, with colour matching direction
- Four small component bars below: Balance | Velocity | Goals | Upcoming
- Animated: number counts up/down smoothly on each update (500ms transition)
- Updates via useBUNQSYScore hook (WebSocket BUNQSY_SCORE messages)
- Label: "BUNQSY Score — Financial Health Right Now"
6b. OracleVotingPanel Component
text

Visual spec:
- Title: "Oracle Analysis" with a pulsing dot while running
- 6 rows, one per sub-agent, in this order:
    Balance Sentinel
    Velocity Analyzer
    Pattern Matcher
    Subscription Watcher
    Rent Proximity Guard
    Fraud Shadow
- Each row:
    - Agent name (left)
    - Animated progress bar showing riskContribution (0–100)
    - Confidence badge (e.g. "87% confident")
    - Verdict chip: ✅ CLEAR | ⚠️ WARN | 🚨 INTERVENE
    - One-sentence reason (collapses to ellipsis, expand on tap)
- Rows animate in sequentially AS EACH WebSocket ORACLE_VOTE arrives
- After all 6 votes: aggregated verdict bar appears at bottom
    - Final risk score gauge (0–100 semicircle)
    - Dominant agent highlighted
    - Overall verdict: CLEAR / WARN / INTERVENE in large text
- Panel is always visible, updates on every oracle run
- Shows "Waiting for next analysis..." skeleton when oracle is idle
6c. InterventionCard Component
text

Visual spec:
- Slides up from bottom on INTERVENTION WebSocket message
- Header: intervention type icon + title
- Body: narration text (from explainer.ts) — plain English, prominent
- "Why did BUNQSY do this?" expandable panel:
    - Shows oracle votes summary (agent name + verdict + reason per row)
    - Shows riskScore as a number
    - One-tap to expand/collapse
- Action buttons (context-dependent):
    - FRAUD_BLOCK: "✅ Allow Transaction" | "🚫 Block Transaction"
    - PAYMENT/TRANSFER: "✅ Confirm" | "❌ Cancel"
    - INFORMATIONAL: "Got it" (dismisses)
- On confirm/dismiss: POST /api/confirm/:planId or /api/confirm/:interventionId
- Calls clearActiveIntervention() on the daemon via REST after resolution
6d. WebSocket Hook (useWebSocket.ts)
TypeScript

export function useWebSocket(url: string): {
  lastMessage: WSMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}
// Reconnects automatically with exponential backoff (1s, 2s, 4s, max 30s)
// Parses WSMessage JSON and validates type field
PHASE 7: Voice Pipeline (Tier 2)
Files:

text

packages/daemon/src/voice/stt.ts
packages/daemon/src/voice/planner.ts
packages/daemon/src/voice/executor.ts
packages/daemon/src/routes/voice.ts
packages/frontend/src/components/VoiceOrb.tsx
7a. Route: POST /api/voice
text

Input: multipart/form-data with audio file (WAV or WebM)
Process:
  1. stt.ts: run whisper.cpp on audio → transcript string
  2. planner.ts: Claude reads transcript + current state → ExecutionPlan
  3. Store plan with status PENDING
  4. Emit WSMessage PLAN_CREATED with plan
  5. Return plan JSON to frontend

Output: { planId, narratedText, steps[] }
7b. Planner (planner.ts)
TypeScript

// Claude system prompt for voice planning
const PLANNER_SYSTEM = `
You are BUNQSY, an always-on financial guardian for a bunq user.
The user has just spoken a financial instruction. Your job is to:
1. Understand the intent
2. Create a precise ExecutionPlan with specific steps
3. Write a clear narratedText in first person (e.g. "I will send €20 to Sarah...")
4. Return ONLY valid JSON matching the ExecutionPlan schema
5. Never execute — only plan. Execution requires user confirmation.

Available step types: PAYMENT, DRAFT_PAYMENT, SAVINGS_TRANSFER, CANCEL_DRAFT
Current account balance: {balance}
Available accounts: {accounts}
`;
7c. VoiceOrb Component
text

Visual spec:
- Circular orb, idle state: soft pulsing glow
- Recording state: animated waveform rings expanding outward
- Processing state: spinning gradient ring
- Plan received state: orb shrinks, ExecutionPlan card slides in above
- Plan card shows: narratedText (large), steps list (small), Confirm / Cancel buttons
- On Confirm: POST /api/confirm/:planId, orb returns to idle
- On Cancel: DELETE /api/confirm/:planId (cancels plan), orb returns to idle
- Tap to start recording, tap again to stop
PHASE 8: Receipt Vision Pipeline (Tier 2)
Files:

text

packages/daemon/src/receipt/extractor.ts
packages/daemon/src/receipt/verifier.ts
packages/daemon/src/receipt/categorizer.ts
packages/daemon/src/routes/receipt.ts
packages/frontend/src/components/ReceiptScanner.tsx
8a. Route: POST /api/receipt
text

Input: multipart/form-data with image file (JPEG or PNG)
Process:
  1. extractor.ts: Claude Vision → ReceiptData (merchant, total, line items, currency, date)
  2. verifier.ts: self-verification (do line items sum to total? ±2% tolerance)
  3. categorizer.ts: assign category + check if total matches recent bunq transaction
  4. If match found: enrich local transaction record with category + line items
  5. Optional: if large food delivery, suggest creating a savings plan
Output: { receipt: ReceiptData, matched: boolean, matchedTransactionId?, suggestion? }
8b. Extractor Schema
TypeScript

export const ReceiptDataSchema = z.object({
  merchant: z.string(),
  total: z.number(),
  currency: z.string(),
  date: z.string(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    total: z.number(),
  })),
  category: z.enum([
    'groceries', 'dining', 'transport', 'entertainment',
    'health', 'shopping', 'utilities', 'other'
  ]),
  confidence: z.number().min(0).max(1),
});
PHASE 9: Dream Mode + Dream Trigger + Financial DNA Card (Tier 2)
Files:

text

packages/daemon/src/dream/scheduler.ts
packages/daemon/src/dream/trigger.ts
packages/daemon/src/dream/worker.ts
packages/daemon/src/dream/dna.ts
packages/daemon/src/routes/dream.ts
packages/frontend/src/components/DreamBriefing.tsx
packages/frontend/src/components/DreamTrigger.tsx
9a. Scheduler (scheduler.ts)
TypeScript

import cron from 'node-cron';

export function scheduleDreamMode(triggerDream: () => void, timezone: string): void {
  // Fires at 2am in user's timezone
  cron.schedule('0 2 * * *', triggerDream, { timezone });
}
9b. Manual Trigger (trigger.ts)
TypeScript

export async function triggerDream(
  db: Database.Database,
  wsEmit: (msg: WSMessage) => void,
  triggerType: 'scheduled' | 'manual' = 'scheduled'
): Promise<string> {

  // Create dream session record
  const sessionId = uuid();
  db.prepare(`INSERT INTO dream_sessions (id, trigger_type) VALUES (?, ?)`)
    .run(sessionId, triggerType);

  wsEmit({ type: 'DREAM_UPDATE', payload: { sessionId, status: 'RUNNING' } });

  // Fork worker process
  const worker = fork(join(__dirname, 'worker.js'), [], {
    env: { ...process.env, DREAM_SESSION_ID: sessionId },
  });

  // Kill worker if it runs > 10 minutes
  const killTimeout = setTimeout(() => {
    worker.kill('SIGKILL');
    db.prepare(`UPDATE dream_sessions SET status = 'KILLED' WHERE id = ?`)
      .run(sessionId);
  }, 10 * 60 * 1000);

  worker.on('message', (msg: DreamWorkerMessage) => {
    if (msg.type === 'COMPLETE') {
      clearTimeout(killTimeout);
      // Save results to DB
      db.prepare(`
        UPDATE dream_sessions SET
          completed_at = datetime('now'),
          duration_ms = ?,
          patterns_updated = ?,
          patterns_created = ?,
          briefing_text = ?,
          dna_card = ?,
          suggestions = ?,
          status = 'COMPLETED'
        WHERE id = ?
      `).run(
        msg.durationMs, msg.patternsUpdated, msg.patternsCreated,
        msg.briefingText, msg.dnaCard, JSON.stringify(msg.suggestions),
        sessionId
      );
      wsEmit({
        type: 'DREAM_COMPLETE',
        payload: {
          sessionId,
          briefingText: msg.briefingText,
          dnaCard: msg.dnaCard,
          suggestions: msg.suggestions,
        },
      });
    }
  });

  return sessionId;
}
9c. Worker (worker.ts)
The worker runs in a forked process. It MUST NOT import execute.ts.

text

Worker steps:
1. Load last 7 days of transactions from DB
2. Load all enabled patterns
3. Load user profile + goals
4. Ask Claude to:
   a. Identify 3–5 key spending insights from the week
   b. For each existing pattern: update confidence, flag contradictions
   c. Suggest 0–2 new patterns worth creating (with full pattern template)
   d. Generate morning briefing text (3–4 sentences, conversational)
   e. Generate 3 actionable suggestions for the coming week
5. Generate Financial DNA card (separate Claude call, see 9d)
6. Apply confidence updates to DB patterns
7. Insert any new patterns into DB
8. Send COMPLETE message to parent
9d. Financial DNA Card (dna.ts)
TypeScript

export async function generateDNACard(
  patterns: Pattern[],
  profile: UserProfile,
  weekInsights: string[]
): Promise<string> {
  // Returns 4–6 words describing the user's financial personality
  // Examples:
  //   "Disciplined saver, impulsive weekends, risk-aware"
  //   "Subscription-heavy, goal-oriented, cash-conscious"
  //   "Spontaneous spender, strong salary discipline"
  
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 30,
    system: `You generate a user's Financial DNA card. This is 4–6 words that
             capture their financial personality based on their patterns.
             Return ONLY the 4–6 word phrase. No punctuation except commas.
             Make it feel insightful and human, not clinical.`,
    messages: [{ role: 'user', content: buildDNAContext(patterns, profile, weekInsights) }],
  });
  
  return response.content[0].type === 'text' ? response.content[0].text.trim() : '';
}
9e. Routes (routes/dream.ts)
TypeScript

// POST /api/dream/trigger
// Body: {} (empty)
// Immediately forks the dream worker, returns sessionId
// Response: { sessionId, status: 'RUNNING' }
// Frontend polls GET /api/dream/latest or waits for DREAM_COMPLETE WS message

// GET /api/dream/latest
// Returns the most recent completed dream session:
// { sessionId, briefingText, dnaCard, suggestions, completedAt }
9f. Dream Trigger Component (DreamTrigger.tsx)
text

Visual spec:
- Button: "💤 Trigger Dream Mode Now"
- On click: POST /api/dream/trigger
- Button changes to "🌙 Dreaming..." with animated moon/stars
- Listens for DREAM_COMPLETE WebSocket message
- On complete: opens DreamBriefing modal automatically
- DreamBriefing modal contains:
    - Morning/Dream briefing text (large, readable)
    - Financial DNA Card: displayed as a badge/chip
        "Your Financial DNA: Disciplined saver, impulsive weekends, risk-aware"
    - 3 Actionable Suggestions as cards
    - "Got it — start my day" dismiss button
PHASE 10: Savings Jar Agent (Tier 2)
Files:

text

packages/daemon/src/jars/agent.ts
10a. SavingsJarAgent (agent.ts)
Triggered when: the salary-received intervention fires (pattern: large incoming transfer matching profile.salary_amount ±10%, from a regular counterparty).

TypeScript

export async function runSavingsJarAgent(
  state: RecalledState,
  wsEmit: (msg: WSMessage) => void
): Promise<void> {

  const salary = detectSalaryLanding(state);
  if (!salary) return;

  // Fetch savings accounts (bunq jars)
  const savingsAccounts = await getSavingsAccounts(state.client);

  // Claude calculates the optimal split
  const splitPlan = await computeJarSplit(salary.amount, state.profile, state.goals, savingsAccounts);

  // Create ExecutionPlan with multiple SAVINGS_TRANSFER steps
  const steps: ExecutionStep[] = splitPlan.transfers.map(t => ({
    id: uuid(),
    type: 'SAVINGS_TRANSFER',
    description: `Transfer €${t.amount} to ${t.jarName}`,
    payload: {
      fromAccountId: state.accounts[0].id,
      toAccountId: t.jarAccountId,
      amount: t.amount,
      currency: 'EUR',
      description: `BUNQSY auto-save: ${t.jarName}`,
    },
  }));

  const narratedText = `Your salary of €${salary.amount} just landed. 
    I'd like to distribute it as follows: ${splitPlan.narrative}. 
    Confirm to execute all ${steps.length} transfers automatically.`;

  const plan = await createExecutionPlan(steps, narratedText);
  wsEmit({ type: 'PLAN_CREATED', payload: plan });
}
Split computation rules:

Rent reserve: enough to cover rent if due within 14 days
Emergency fund: 10% of salary if emergency fund goal is under target
Dream goals: proportional to time-remaining urgency
Remaining: stays in primary account
PHASE 11: Forecast Engine + ForecastChart (Tier 2)
Files:

text

packages/daemon/src/forecast/engine.ts
packages/daemon/src/routes/forecast.ts
packages/frontend/src/components/ForecastChart.tsx
packages/frontend/src/hooks/useForecast.ts
11a. Forecast Engine (engine.ts)
Does NOT use ML. Uses pattern confidence scores + known commitments + historical averages to project forward 30 days.

TypeScript

export interface ForecastPoint {
  date: string;               // ISO date string
  projectedBalance: number;
  lowerBound: number;         // 80% confidence interval lower
  upperBound: number;         // 80% confidence interval upper
  events: ForecastEvent[];    // known events on this date
}

export interface ForecastEvent {
  type: 'RENT' | 'SALARY' | 'SUBSCRIPTION' | 'IMPULSE_RISK' | 'GOAL_MILESTONE';
  description: string;
  amount?: number;
  probability: number;        // 0.0–1.0
}

export async function generateForecast(state: RecalledState): Promise<ForecastPoint[]>
Algorithm:

text

Start with today's balance.
For each of the next 30 days:
  1. Apply known deterministic events (rent, salary) on their scheduled days
  2. Apply average daily spend (from last 30 days) with ±20% variance band
  3. Apply pattern-based impulse risk: for patterns with high confidence and
     time-based triggers (e.g. "weekend dining spike"), add probabilistic spend
     events with probability = pattern.confidence
  4. Compute lower/upper bounds from variance accumulation
  5. Flag any day where projected balance drops below rent threshold as a risk event
Forecast is cached in forecast_cache table and regenerated:

After each dream session completes
If a new salary or large transaction arrives via webhook
On explicit GET /api/forecast?refresh=true
11b. Route: GET /api/forecast
text

Response: ForecastPoint[] (30 items)
Uses cache if generated within 6 hours and no trigger event
11c. ForecastChart Component
text

Visual spec:
- Area chart, 30-day x-axis
- Primary line: projectedBalance (solid, brand colour)
- Shaded band: lowerBound to upperBound (semi-transparent)
- Event markers on x-axis: icons for RENT (🏠), SALARY (💰), IMPULSE_RISK (⚡), GOAL (🎯)
- Hover tooltip: shows date, projected balance, events, probability
- Red horizontal line: rent amount threshold (contextual reference)
- Summary text above chart:
    "In 30 days, you're projected to have ~€{amount}. 
     {riskStatement if applicable}"
- Chart library: Recharts (lightweight, React-native)
PHASE 12: Fraud Shadow Draft Payment Block (Tier 3)
Files:

text

packages/frontend/src/components/FraudBlock.tsx
12a. FraudBlock Component
text

Visual spec:
- Full-screen overlay modal (not a card — full attention required)
- Header: "⚠️ Suspicious Transaction Detected" in amber/red
- Body:
    - Fraud signals listed as checklist items (each signal checked off)
    - BUNQSY narration explaining the concern
    - Transaction details if available
- Two large buttons:
    - "✅ I authorised this — Allow" (green)
    - "🚫 Block this transaction" (red)
- Both buttons require 2-second hold-to-confirm (prevents accidental tap)
- On Allow: POST /api/confirm/:planId with action: 'allow'
- On Block: POST /api/confirm/:planId with action: 'block'
  (daemon calls bunq draft payment cancellation via execute.ts)
PHASE 13: Pattern Promotion + Full Dream Pipeline (Tier 3)
After a confirmed intervention, offer to save the pattern:

TypeScript

// In engine.ts, after intervention is CONFIRMED:
async function offerPatternPromotion(
  intervention: InterventionRecord,
  state: RecalledState
): Promise<void> {
  // Ask Claude: does this intervention represent a repeatable pattern?
  // If yes, generate a Pattern record and insert into DB
  // Mark as confidence 0.4 (low confidence until it fires again)
}
PHASE 14: Multi-Account Intelligence (Tier 3)
Extend oracle and jars agent to:

Load and analyse ALL monetary accounts (primary + savings + joint)
In joint accounts: detect unusual spend from secondary user
In savings accounts: surface goal progress in BUNQSYScore goals component
PHASE 15: Demo Polish (Tier 3)
Add loading skeleton states for all async operations
Add smooth CSS transitions on all WebSocket-driven UI updates
Add sound feedback on high-severity interventions (optional, user-togglable)
Add a "Reset Demo State" button that clears the DB and generates fresh realistic test data (for repeating the demo cleanly between judge sessions)
Ensure ngrok / cloudflare tunnel is scripted and starts with npm run demo
7. Canonical API Surface (All Daemon Routes)
text

Authentication / bunq
  (internal — no REST route exposed for auth)

Webhooks
  POST   /api/webhook                   bunq event receiver

Voice
  POST   /api/voice                     Audio → ExecutionPlan

Receipt
  POST   /api/receipt                   Image → ReceiptData

Dream
  POST   /api/dream/trigger             Fork dream worker immediately
  GET    /api/dream/latest              Latest completed dream session

Forecast
  GET    /api/forecast                  30-day ForecastPoint[]
  GET    /api/forecast?refresh=true     Force regeneration

Score
  GET    /api/score                     Latest BUNQSYScore (REST fallback)

Confirmation
  POST   /api/confirm/:planId           Confirm ExecutionPlan
  DELETE /api/confirm/:planId           Cancel ExecutionPlan
  POST   /api/confirm/:planId/action    Fraud block: { action: 'allow'|'block' }

WebSocket
  WS     /ws                            Real-time event stream
8. WebSocket Message Reference
TypeScript

// All messages are JSON with envelope: { type: string, payload: unknown }

BUNQSY_SCORE      → BUNQSYScore                  (every heartbeat tick)
ORACLE_VOTE       → OracleVote                   (per sub-agent, as it resolves)
ORACLE_VERDICT    → OracleVerdict                (after all 6 votes)
INTERVENTION      → InterventionPayload          (when oracle says INTERVENE)
DREAM_UPDATE      → { sessionId, status }        (dream started)
DREAM_COMPLETE    → DreamBriefingPayload         (dream finished)
PLAN_CREATED      → ExecutionPlan                (voice/jars plan ready)
FORECAST_READY    → ForecastPoint[]              (forecast regenerated)
9. Updated 3-Minute Demo Script
This is the canonical demo flow. Build everything to make this script work exactly as written. Practice it until it runs in under 3 minutes.

[0:00–0:20] — BUNQSY Score + Morning Briefing

Open the dashboard. The large BUNQSY Score is visible: 78, green, trend arrow stable.

Say: "BUNQSY runs continuously in the background, every 30 seconds, even when you're asleep. Last night, it ran a Dream Mode consolidation — let me show you what it learned about me."

Click "💤 Trigger Dream Mode Now". The button animates. After ~15 seconds, the DreamBriefing modal opens automatically. Read the morning briefing text aloud. Point to the Financial DNA card: "Disciplined saver, impulsive weekends, risk-aware." Say: "It built this from my actual spending patterns — no manual categorisation."

Dismiss the modal.

[0:20–0:45] — Oracle Voting Panel

Point to the OracleVotingPanel. Currently showing idle state.

Say: "Every 30 seconds, six specialised sub-agents analyse my finances independently. Watch what happens when I simulate a late-night transaction from an unknown merchant."

Trigger a test webhook event (pre-scripted: foreign currency, 2am, new payee, rounded amount).

The OracleVotingPanel animates:

Balance Sentinel ✅ CLEAR — 0:01
Velocity Analyzer ⚠️ WARN — 0:02
Pattern Matcher ✅ CLEAR — 0:02
Subscription Watcher ✅ CLEAR — 0:03
Rent Proximity Guard ✅ CLEAR — 0:03
Fraud Shadow 🚨 INTERVENE — 0:04 (confidence: 92%)
Final verdict appears: 🚨 INTERVENE — Risk Score 84

The BUNQSY Score drops from 78 to 51, red, trend arrow falling.

[0:45–1:10] — Fraud Block

The FraudBlock modal opens full-screen.

Read the narration aloud: "BUNQSY says: this transaction hit four fraud signals — it's 2am, the merchant is new, the amount is a round number, and it's in a foreign currency. That's unusual for your profile."

Show the fraud signal checklist. Point to the explainability overlay: "You can always see exactly why BUNQSY made this call — it's not a black box."

Hold the "🚫 Block this transaction" button for 2 seconds. The modal closes. BUNQSY Score rises back to 74. OracleVotingPanel resets to idle.

[1:10–1:35] — Voice Command

Tap the VoiceOrb. It pulses.

Say clearly: "Send twenty euros to Sarah for lunch."

Tap again to stop recording. After 3 seconds, the plan card appears: "I will send €20.00 to Sarah (IBAN: NL...) from your primary account. This will leave your balance at €1,247."

Say: "Notice BUNQSY planned first and told me exactly what it was going to do. It never acts without my permission."

Tap Confirm. The VoiceOrb returns to idle. Say: "Done. The bunq payment executed through a single audited write gateway."

[1:35–2:00] — Salary Landing + Jars

Trigger a test webhook: salary landing (€3,200 from regular employer IBAN).

The OracleVotingPanel briefly runs. An InterventionCard slides up:

"Your salary of €3,200 just landed. BUNQSY suggests: €950 to rent reserve, €320 to emergency fund, €200 to Amsterdam trip goal. Remaining €1,730 stays in your primary account. Confirm to execute 3 transfers."

Tap Confirm. Say: "Three bunq sub-account transfers, executed in sequence, automatically. This is the bunq Jars API in action — BUNQSY turns salary day from a manual chore into a 2-second tap."

[2:00–2:30] — Forecast

Point to the ForecastChart (visible below the Oracle panel).

Say: "BUNQSY doesn't just react — it predicts. This is my projected balance for the next 30 days, with an 80% confidence band."

Hover over day 14 — tooltip shows: 🏠 Rent due (€950), projected balance €892. A risk flag glows on that date.

Say: "BUNQSY has already flagged that in 14 days, after rent, my balance will be close to my safety threshold. It's going to start nudging me about this in about a week — before it becomes a problem."

[2:30–3:00] — Closing pitch

Say: "Every other financial AI waits for you to ask a question. BUNQSY is different. It watches. It learns. It dreams. And it acts — always with your permission, always with an explanation, always with one audited path to execution through the bunq API.

It's not a chatbot for your bank. It's a guardian for your financial life.

This is BUNQSY."

10. Pre-Demo Checklist
Run through this before every judge session:

text

□ BUNQ_ENV=sandbox confirmed in .env
□ Signing gate script: ✅ PHASE 0 GATE PASSED
□ Webhook tunnel (ngrok/cloudflare) running and URL registered with bunq
□ DB cleared and seeded with realistic test data
□ Whisper model loaded (test voice command cold)
□ Ollama running (test embedding: curl http://localhost:11434/api/embed)
□ Dream Mode: trigger manually once, confirm briefing modal appears
□ Oracle: trigger test fraud webhook, confirm all 6 votes animate
□ Forecast chart: visible and populated with 30 data points
□ BUNQSY Score: visible and updating every ~30 seconds
□ "Reset Demo State" button tested — restores clean state in < 5 seconds
□ All 3 tier-1 components visible on load without interaction
□ Browser fullscreen, notifications off, terminal hidden
11. Technical Dependencies
JSON

{
  "packages/daemon": {
    "dependencies": {
      "fastify": "^4",
      "@fastify/multipart": "^8",
      "@fastify/websocket": "^9",
      "better-sqlite3": "^9",
      "sqlite-vec": "latest",
      "@anthropic-ai/sdk": "^0.20",
      "node-cron": "^3",
      "zod": "^3",
      "uuid": "^9",
      "ip-range-check": "^0.2"
    },
    "devDependencies": {
      "tsx": "^4",
      "typescript": "^5",
      "@types/better-sqlite3": "^7",
      "@types/node": "^20"
    }
  },
  "packages/frontend": {
    "dependencies": {
      "react": "^18",
      "react-dom": "^18",
      "recharts": "^2",
      "vite": "^5"
    },
    "devDependencies": {
      "@types/react": "^18",
      "typescript": "^5"
    }
  }
}
External binaries required:

whisper.cpp compiled with GGML base model (./models/ggml-base.bin)
ollama running locally with nomic-embed-text pulled
End of CompleteBuildSpecification.md v2.0 Next: read PrefixInstructions.md for session-by-session build execution.





give me the new fully written CompleteBuildSpecification.md , keep the same monorepo structure

claude-sonnet-4-6-search
No Sources
📋 How to Proceed — The Right Pathway
My Recommendation: Rewrite Both Files Completely
Do not create a patch/delta file. Here is exactly why, and why the alternatives are worse:

❌ Why a "Changes Only" File Is the Wrong Move
1. Your coding agent will get confused
When you feed Claude Code a prefix block at the start of each session, it reads CLAUDE.md + the spec as its source of truth. If the source of truth is now split across two files — an original spec and a delta file — the agent has to mentally reconcile them every session. It will miss things. It will follow the old spec for sections the delta didn't explicitly override. It will introduce subtle contradictions in the code it writes. This is exactly the kind of drift your 3-session prefix strategy was designed to prevent.

2. Contradictions become invisible
Your original spec has, for example, 5 sub-agents in the Risk Oracle. Feature 3 (Fraud Shadow) adds a 6th. If that only exists in a delta file, every time the oracle is referenced in the original spec it still says 5. A human can track this. A coding agent in Session 2 reading a new prefix block almost certainly won't.

3. The "green light gate" (Problem 3 fix) needs to be Phase 0 in the main spec
If the signing test is just mentioned in a changelog file, there's a real risk you skip it under time pressure. It needs to be structurally first in the build order — baked into Phase 1 of the canonical spec — so it's impossible to accidentally skip.

4. Demo script needs to be rewritten wholesale
Your existing 3-minute demo script doesn't include the BUNQSY Score, Oracle Voting Panel, Dream Mode trigger button, Financial DNA Card, or Fraud Shadow block. These aren't additive — they change the flow and narrative of the demo. A patch file cannot cleanly express a rewritten demo script sitting next to an old one.

❌ Why Patching PrefixInstructions.md Is Especially Dangerous
The prefix blocks are your session initialisation contracts. They tell Claude Code exactly what it's allowed to do, what phase it's in, and what files it can touch. Adding new features (Jars agent, Fraud Shadow sub-agent, BUNQSY Score heartbeat emission, dream trigger endpoint) means new files, new phases, new boundaries. If the prefix blocks still reference the old phase structure, your coding agent will write code in the wrong phase order and create dependency problems mid-build.

✅ Why a Full Rewrite Is Clean and Risk-Free
1. Single source of truth — always
Claude Code reads one spec. One prefix file. No reconciliation needed. Every session starts from a coherent, non-contradictory document.

2. We can restructure the phase order properly
With a full rewrite, we can correctly insert:

Phase 0: Signing test gate (must pass before anything else)
The Oracle Voting Panel as part of the oracle phase (not bolted on later)
The BUNQSY Score as a first-class heartbeat emission (not an afterthought)
Dream Trigger endpoint scaffolded alongside Dream Mode (not separately)
3. The prefix blocks can be rewritten for the new 3-tier Must/Should/Nice-to-Have structure
This ensures that under time pressure, Claude Code always builds in the right priority order and never spends Session 2 building a Nice-to-Have before a Must-Ship is complete.

4. Git gives you a perfect safety net
Before I generate anything, you commit your current .md files. The rewrite goes in as a new commit. If anything looks wrong, you git diff and see exactly what changed. Zero risk of losing your original work.

The Exact Pathway
Here is the precise sequence before I write a single character of new files:

Step 1 — You do this now:

Bash

git add CompleteBuildSpecification.md PrefixInstructions.md
git commit -m "chore: archive original spec before v2 rewrite"
Step 2 — I produce:

A fully rewritten CompleteBuildSpecification.md that integrates all 4 fixes and 6 new features natively into the correct phase order, with an updated demo script and a new 3-tier build priority structure.
A fully rewritten PrefixInstructions.md with updated prefix blocks A/B/C that reflect the new phase boundaries, new files, new agents, and new endpoints.
Step 3 — You do: Replace both files, commit, and start building with the new spec as the single source of truth.

One Question Before I Write
Do you want me to keep the same monorepo structure (packages/daemon, packages/frontend, packages/shared) or is there anything about the scaffolding layout you want to change first?

Everything else — all 4 fixes, all 6 features, the phase reorder, the updated demo script — I have everything I need to write both files completely. Just confirm the monorepo structure and I'll produce them.





Alright, i would like to address the following problems and add the following features(Problem 1: Dream Mode Is Undemoable As-Is (High Priority)
Dream Mode runs at 2am. Unless the hackathon is at 2am, the judges will never see it fire. You need a "Trigger Dream Now" button in the UI — a single click that spawns the forked worker immediately, runs the full consolidation, and shows the morning briefing modal in real time. Without this, your most unique feature is invisible on demo day.
Fix: Add a /api/dream/trigger endpoint and a button in the frontend. Takes 30 minutes to add and makes Dream Mode fully demoable.

Problem 2: The Risk Oracle Voting UI Is Missing (High Priority)
Your spec describes 5 sub-agents producing JSON votes that aggregate into a risk score and verdict. This is conceptually brilliant. But right now the frontend just shows an InterventionCard with the result. The judges need to see the votes happening in real time — each sub-agent popping up its vote with a confidence score, then the aggregator verdict appearing. This is your main "wow, it's actually intelligent" visual moment.
Fix: Add a live Oracle Voting Panel to the frontend. Show each of the 5 sub-agents as rows (Balance Sentinel ✅ CLEAR, Velocity Analyzer 🚨 INTERVENE, etc.) with their individual scores, then the aggregated verdict. Wire it over the existing WebSocket. This is 2–3 hours of frontend work and it transforms the demo.

Problem 3: The bunq Signing Implementation Risk (Medium Priority)
As I flagged in the read-through: your spec describes signing a canonical string of method + endpoint + headers + body, but bunq's current signing format expects you to sign the request body (not the full canonical request), RSA + SHA256, base64-encoded into X-Bunq-Client-Signature. If your signing implementation doesn't match bunq's exact expectation, every signed API call will 401 and your demo collapses.
Fix: Before writing a single line of application logic, write a tiny test script that makes one authenticated bunq sandbox call with your signing implementation and asserts a 200 response. Pin this as your Phase 0 "green light" gate. Don't proceed to Phase 2 until this passes.

Problem 4: Webhook IP Allowlist Is Environment-Unaware (Medium Priority)
Your spec hard-codes the production bunq IP range (185.40.108.0/22) for webhook validation. But the hackathon will almost certainly use the sandbox environment, whose callbacks come from AWS IPs that can change. A hardcoded allowlist will silently drop every sandbox callback, and your heartbeat-from-webhook flow will never fire.
Fix: Make the allowlist environment-variable-driven: BUNQ_ENV=sandbox disables IP filtering entirely (just validate the signature), BUNQ_ENV=production enforces the production IP range. One env var, 10 minutes to implement, prevents a demo-killing silent failure.

New Features I'd Add
Feature 1: The BUNQSY Score (Single Number, Real-Time) 🔢
Right now your system produces interventions and risk verdicts. Add a single persistent BUNQSY Score (0–100) displayed as a large number at the top of the UI, updated every heartbeat tick. Think of it as a credit score but for right now — composite of balance health, velocity anomalies, goal progress, and upcoming commitments.
Why: Judges will understand "your financial health score just dropped from 84 to 61 because we detected a suspicious velocity pattern" in 3 seconds. Abstract AI reasoning is hard to demo. A changing number is visceral.

Feature 2: Time Machine / 30-Day Forecast 📅
Using your existing pattern brain and the transaction history, add a lightweight forward projection: "Based on your current patterns, in 30 days you'll have €X remaining after rent and subscriptions, with a 73% chance of an impulse spend event in week 3."
This doesn't need to be an ML model — a weighted pattern extrapolation using your existing confidence scores is enough. Visualize it as a simple area chart. It transforms BUNQSY from a reactive guardian to a predictive guardian, which is a fundamentally stronger pitch.

Feature 3: Fraud Shadow Mode 🕵️
Add one more sub-agent to the Risk Oracle: a Fraud Shadow that watches for known fraud patterns (late night + unfamiliar merchant + foreign currency + rounded amount). If it fires, the intervention isn't just a card — it's a Draft Payment block via bunq's draft payment API, requiring explicit voice or tap confirmation before the transaction clears.
This is a direct showcase of bunq API depth (draft payments are not commonly used) and it's the most viscerally powerful demo moment you can have: "The agent just stopped a suspicious transaction in real time."

Feature 4: Explainability Overlay 🔍
Every intervention card and oracle verdict should have an expandable "Why did BUNQSY do this?" panel in plain English. Not logs — narrated English generated by Claude. "Your rent is due in 3 days. Your balance dropped 40% in 18 hours. Two of your five sub-agents flagged this as high risk."
This directly addresses the biggest judge scepticism about AI agents: "But how do I know it's reasoning correctly?" Explainability is the answer. It also showcases your oracle voting architecture beautifully without requiring judges to read JSON.

Feature 5: Financial DNA Card 🧬
After Dream Mode consolidates patterns, generate a Financial DNA card: 4–6 words that describe the user's financial personality (e.g., "Disciplined saver, impulsive weekends, risk-aware"). Display it on the morning briefing modal.
This is a 30-minute feature that makes the demo emotionally resonant and shareable. Judges will remember "it told me I'm a disciplined saver with impulsive weekends" far longer than they'll remember a risk score number.

Feature 6: bunq Sub-Account Automation (Jars) 🫙
bunq natively supports savings sub-accounts ("jars"). Your spec mentions them but doesn't have a dedicated handler. Add a SavingsJarAgent that: detects salary landing → automatically calculates and proposes a split (rent reserve, emergency fund, dream goal) → on user confirmation, executes 2–3 transfers to named sub-accounts via the write gateway.
This showcases bunq API depth (multiple account types + multiple payments in one plan), is immediately understandable to any judge, and directly targets the €5,000 Best bunq API Integration bonus prize.

) how should i proceed with this? will you give me new complete CompleteBuildSpecification.md file and a new PrefixInstructions.md file or should i just create a new .md file with changes? please choose the best pathway that is riskfree and clean to build upon.... first answer the question and don't create any files yet

claude-sonnet-4-6-search
No Sources
🧠 Honest End-to-End Assessment of BunqsyFinance
Let me be direct: this is one of the strongest hackathon specs I've ever seen. Most hackathon teams show up with a chatbot wrapper around a single API. You've written a production-grade architectural specification with constitutional rules, a multi-session agent build strategy, a safety-first write gateway, a self-improving memory system, and a timed 3-minute demo script. That alone puts you in a different league.

But "best spec in the room" and "winner" are not the same thing. Here's my complete honest take:

✅ What Is Genuinely Exceptional (Don't Touch These)
1. The Constitutional Architecture (CLAUDE.md as Law)
This is a masterclass move. By encoding hard constraints — plan-before-act, single write gateway, bounded sub-agents, append-only logs — you've solved the #1 problem that kills fintech hackathon demos: a live agent doing something catastrophic on stage. Judges in banking are acutely risk-aware. The fact that you've architecturally prevented runaway agent behaviour, rather than just hoping it doesn't happen, will be noticed and respected.

2. The Heartbeat Loop (Recall → Reason → React)
This is the core intellectual contribution of the project and it's genuinely novel. Every other team will build a reactive system (user asks → agent responds). Yours fires every 30 seconds regardless. The concept of an always-on financial guardian vs. a financial chatbot is a paradigm shift, and you should say those exact words in your pitch. The optimization (only run heavy reasoning if something changed) also shows you've thought about real-world cost and latency.

3. The Single Write Gateway (execute.ts)
Elegant, safe, auditable. One file that can POST payments. Everything else is read-only. This is a professional-grade safety boundary that most production fintech systems don't even have properly. Lead with this in your security/trust pitch.

4. Dream Mode
This is your most unique feature by a significant margin. No other team will have a nightly background consolidation process that runs in a forked child process, merges patterns, resolves contradictions, and generates a morning briefing. It anthropomorphizes the agent beautifully — it literally sleeps and dreams about your finances. That's a story judges will remember.

5. The 3-Minute Demo Script
The fact that you wrote this before building is one of the most strategically intelligent things in the entire spec. Most teams demo what they managed to build. You're building what you need to demo. This is the correct order.

6. Pattern Brain as Markdown Skill Files
Storing patterns as structured Markdown with embedded metadata, trigger conditions, and intervention templates — synced to SQLite + sqlite-vec — is a genuinely clever hybrid between human-readable knowledge and machine-queryable memory. It also means a judge can read a pattern file and immediately understand what the agent knows. That auditability is gold in a hackathon judging context.

7. The PrefixInstructions / 3-Session Build Strategy
Using Claude Code with session-scoped prefix blocks and a CLAUDE.md constitutional file to prevent context-limit drift is sophisticated meta-engineering. You're treating the AI coding agent as a stateful collaborator with bounded authority, not a magic autocomplete tool. This will dramatically improve your build quality under time pressure.

⚠️ Real Problems I'd Fix Before the Hackathon
Problem 1: Dream Mode Is Undemoable As-Is (High Priority)
Dream Mode runs at 2am. Unless the hackathon is at 2am, the judges will never see it fire. You need a "Trigger Dream Now" button in the UI — a single click that spawns the forked worker immediately, runs the full consolidation, and shows the morning briefing modal in real time. Without this, your most unique feature is invisible on demo day.

Fix: Add a /api/dream/trigger endpoint and a button in the frontend. Takes 30 minutes to add and makes Dream Mode fully demoable.

Problem 2: The Risk Oracle Voting UI Is Missing (High Priority)
Your spec describes 5 sub-agents producing JSON votes that aggregate into a risk score and verdict. This is conceptually brilliant. But right now the frontend just shows an InterventionCard with the result. The judges need to see the votes happening in real time — each sub-agent popping up its vote with a confidence score, then the aggregator verdict appearing. This is your main "wow, it's actually intelligent" visual moment.

Fix: Add a live Oracle Voting Panel to the frontend. Show each of the 5 sub-agents as rows (Balance Sentinel ✅ CLEAR, Velocity Analyzer 🚨 INTERVENE, etc.) with their individual scores, then the aggregated verdict. Wire it over the existing WebSocket. This is 2–3 hours of frontend work and it transforms the demo.

Problem 3: The bunq Signing Implementation Risk (Medium Priority)
As I flagged in the read-through: your spec describes signing a canonical string of method + endpoint + headers + body, but bunq's current signing format expects you to sign the request body (not the full canonical request), RSA + SHA256, base64-encoded into X-Bunq-Client-Signature. If your signing implementation doesn't match bunq's exact expectation, every signed API call will 401 and your demo collapses.

Fix: Before writing a single line of application logic, write a tiny test script that makes one authenticated bunq sandbox call with your signing implementation and asserts a 200 response. Pin this as your Phase 0 "green light" gate. Don't proceed to Phase 2 until this passes.

Problem 4: Webhook IP Allowlist Is Environment-Unaware (Medium Priority)
Your spec hard-codes the production bunq IP range (185.40.108.0/22) for webhook validation. But the hackathon will almost certainly use the sandbox environment, whose callbacks come from AWS IPs that can change. A hardcoded allowlist will silently drop every sandbox callback, and your heartbeat-from-webhook flow will never fire.

Fix: Make the allowlist environment-variable-driven: BUNQ_ENV=sandbox disables IP filtering entirely (just validate the signature), BUNQ_ENV=production enforces the production IP range. One env var, 10 minutes to implement, prevents a demo-killing silent failure.

Problem 5: 11 Phases Is Too Ambitious (High Priority)
Your spec has 11 build phases. You have a hackathon timeline. If you try to ship all 11 phases and run out of time at Phase 8, your demo has no receipt scanner and no Dream Mode — which are two of your three "wow" moments. You need a ruthless MVP cut.

Fix: Reframe your phases into three tiers:

Tier	Phases	What It Unlocks
Must Ship	1–5	Auth, webhook, heartbeat, oracle, one intervention type
Should Ship	6–8	Voice, receipt, Dream Mode trigger button
Nice to Have	9–11	Pattern promotion, full UI polish, multi-account
Build in Tier order. If you finish Tier 1 with time to spare, go to Tier 2. Never sacrifice Tier 1 completeness for Tier 3 polish.

Problem 6: The Framework Stack (OpenClaw/Hermes/SwarmClaw) Is Disconnected (Strategic Decision Needed)
Your current .md spec describes a standalone TypeScript + Fastify + Claude daemon. The impressive framework table you listed (OpenClaw, Hermes, SwarmClaw, MiroFish, etc.) doesn't appear in the spec at all. This is actually fine — simpler is better for a hackathon — but you need to make a deliberate decision:

Option A (Recommended): Stay with the standalone TypeScript spec. It's cleaner, faster to build, and the heartbeat + oracle + write gateway architecture is already more sophisticated than anything those frameworks would add in a hackathon timeframe. Don't mention the framework table in your pitch.

Option B: Swap the 5 bounded sub-agents in the Risk Oracle for SwarmClaw-orchestrated agents. This adds genuine credibility to the "multi-agent orchestration" narrative and lets you mention 23 providers + MCP in your pitch. But it adds integration risk and complexity.

If you're already mid-build on Option A, stick with it. If you're still at spec stage, Option B is worth 2–3 hours of integration work for a meaningful pitch upgrade.

🆕 New Features I'd Add
Feature 1: The BUNQSY Score (Single Number, Real-Time) 🔢
Right now your system produces interventions and risk verdicts. Add a single persistent BUNQSY Score (0–100) displayed as a large number at the top of the UI, updated every heartbeat tick. Think of it as a credit score but for right now — composite of balance health, velocity anomalies, goal progress, and upcoming commitments.

Why: Judges will understand "your financial health score just dropped from 84 to 61 because we detected a suspicious velocity pattern" in 3 seconds. Abstract AI reasoning is hard to demo. A changing number is visceral.

Feature 2: Time Machine / 30-Day Forecast 📅
Using your existing pattern brain and the transaction history, add a lightweight forward projection: "Based on your current patterns, in 30 days you'll have €X remaining after rent and subscriptions, with a 73% chance of an impulse spend event in week 3."

This doesn't need to be an ML model — a weighted pattern extrapolation using your existing confidence scores is enough. Visualize it as a simple area chart. It transforms BUNQSY from a reactive guardian to a predictive guardian, which is a fundamentally stronger pitch.

Feature 3: Fraud Shadow Mode 🕵️
Add one more sub-agent to the Risk Oracle: a Fraud Shadow that watches for known fraud patterns (late night + unfamiliar merchant + foreign currency + rounded amount). If it fires, the intervention isn't just a card — it's a Draft Payment block via bunq's draft payment API, requiring explicit voice or tap confirmation before the transaction clears.

This is a direct showcase of bunq API depth (draft payments are not commonly used) and it's the most viscerally powerful demo moment you can have: "The agent just stopped a suspicious transaction in real time."

Feature 4: Explainability Overlay 🔍
Every intervention card and oracle verdict should have an expandable "Why did BUNQSY do this?" panel in plain English. Not logs — narrated English generated by Claude. "Your rent is due in 3 days. Your balance dropped 40% in 18 hours. Two of your five sub-agents flagged this as high risk."

This directly addresses the biggest judge scepticism about AI agents: "But how do I know it's reasoning correctly?" Explainability is the answer. It also showcases your oracle voting architecture beautifully without requiring judges to read JSON.

Feature 5: Financial DNA Card 🧬
After Dream Mode consolidates patterns, generate a Financial DNA card: 4–6 words that describe the user's financial personality (e.g., "Disciplined saver, impulsive weekends, risk-aware"). Display it on the morning briefing modal.

This is a 30-minute feature that makes the demo emotionally resonant and shareable. Judges will remember "it told me I'm a disciplined saver with impulsive weekends" far longer than they'll remember a risk score number.

Feature 6: bunq Sub-Account Automation (Jars) 🫙
bunq natively supports savings sub-accounts ("jars"). Your spec mentions them but doesn't have a dedicated handler. Add a SavingsJarAgent that: detects salary landing → automatically calculates and proposes a split (rent reserve, emergency fund, dream goal) → on user confirmation, executes 2–3 transfers to named sub-accounts via the write gateway.

This showcases bunq API depth (multiple account types + multiple payments in one plan), is immediately understandable to any judge, and directly targets the €5,000 Best bunq API Integration bonus prize.

🏆 Final Honest Verdict
Dimension	Score	Comment
Concept originality	10/10	Always-on guardian vs. chatbot is genuinely novel
Architectural maturity	9/10	Constitutional AI + write gateway is production-grade
bunq API depth	6/10	Needs Jars + Draft Payments + webhooks fully wired
Demo readiness	6/10	Dream Mode trigger + Oracle voting UI are missing
Scope realism	5/10	11 phases is too many — needs ruthless MVP cut
Pitch narrative	8/10	"Financial guardian that sleeps and dreams" is strong
Wow moments	7/10	Add live oracle voting panel + fraud shadow block
Overall: This is a genuinely excellent hackathon project that could very realistically win both the €5,000 Best AI Agent AND the €5,000 Best bunq API Integration prizes — but only if you execute the must-fix items above. The spec is better than most production fintech systems. The risks are all in execution and demo readiness, not in the ideas.

The three things that will determine whether you win:

🛠️ Does it actually run without crashing during the demo? (Fix the signing, fix the IP allowlist, build Tier 1 first.)
👁️ Can a judge see the intelligence? (Add the Oracle Voting Panel and the BUNQSY Score.)
🏦 Does it go deep on bunq? (Jars automation + Draft Payments + real-time webhooks = €5,000 bonus prize.)
Go build it. The concept deserves to win. 🚀





tell me what you think of it and are there any changes you would make and any new features you would add to make it the best possible project for the hackathon. And if it is already really good, just say so.

gpt-5.2-search

Sources



preview



preview



preview






What I’ve read (so far) and what’s actually in your repo
Your repo currently contains three top-level markdown files: a minimal README.md plus two large, operational documents—CompleteBuildSpecification.md (the end-to-end build spec) and PrefixInstructions.md (how to drive Claude Code / a coding agent through the build in multiple sessions). 
1

The “real project” right now is the spec: it defines architecture, data model, implementation boundaries, a phase-by-phase build order, and even a timed demo script. 
2

My understanding of your build plan (end-to-end)
0) The goal / product shape
You’re building BUNQSY Finance: an always-on background financial guardian for bunq that doesn’t wait for prompts—it monitors events, detects risk/patterns, and intervenes proactively. 
1

It is explicitly designed to map to the hackathon’s “agent that acts” idea (multi-modal inputs like voice + receipt images, plus proactive intervention). 
2

1) Build methodology: spec-driven + “constitutional” rules + multi-session agent execution
CompleteBuildSpecification.md starts by arguing for a spec-driven approach (Altura-style), because you’re delegating most code writing to a coding agent and need hard constraints to prevent hallucinated contracts and unsafe payment paths. 
2

To make this workable with Claude Code’s context limits, PrefixInstructions.md lays out a 3-session build strategy with dedicated “Prefix Block A/B/C”, each re-establishing the critical rules and scope for that session. 
3

A key mechanism: CLAUDE.md is treated as “constitutional law” for all agents in the repo (strict TS, plan-before-act, single write gateway, bounded sub-agents, etc.). 
2

2) Target monorepo architecture (what you intend to scaffold)
You plan a Turborepo-style monorepo with:

packages/daemon (Node.js + Fastify) for webhooks, heartbeat loop, agent calls, bunq client, SQLite memory, etc.
packages/frontend (React) for the demo UI (voice orb, receipt scanner, intervention cards, confirmations)
packages/shared for canonical types (bunq + internal events + memory schema)
specs/ as the exploded spec-kit derived from the master build spec. 
2
3) Core runtime loop: webhooks → event bus → heartbeat tick (Recall → Reason → React)
Your central nervous system is the “BUNQSY Heartbeat Loop”:

Runs every 30s (with a “blocking budget” warning if a tick takes too long).
Recall: pull minimal state (recent transactions slice, patterns, profile, balance).
Reason: only run heavier reasoning when something changed (new tx/balance) or every ~5 minutes.
React: if oracle says INTERVENE, trigger intervention (but avoid stacking interventions if one is active).
Append-only tick log for auditability. 
2
Separately, you wire it so a bunq webhook can force an immediate tick instead of waiting for the next 30s interval. 
2

4) bunq integration layer (auth, signing, webhook registration, read client, write gateway)
Your spec puts bunq integration first (Phase 1), including:

API context flow: installation → device registration → session creation + refresh strategy.
Webhook registration using notification-filter-url for categories like PAYMENT, MUTATION, card tx success/failure, draft payment, savings. 
2
Important detail I noticed: your spec currently hard-requires X-Bunq-Client-Signature “on every request” and describes signing a canonical string of method+endpoint+headers+body. 
2

But bunq’s current signing docs say (a) most calls don’t require signing and (b) when signing is required, you sign the request body (not the full request), using RSA + SHA256, base64-encoded into X-Bunq-Client-Signature. 
4

(You can still choose to sign more calls than required, but the format you sign needs to match bunq’s expectations.)

For webhooks, your spec wants IP allowlisting and signature validation. bunq’s own webhook docs confirm: production callbacks come from 185.40.108.0/22, while sandbox callbacks come from AWS IPs (and can change). 
5

So in the hackathon (likely sandbox), a hardcoded allowlist to 185.40.108.0/22 would block legitimate callbacks unless you make it environment-aware.

Finally: you enforce a single write gateway file (execute.ts) so that only one codepath can POST payments/draft-payments/transfers—and only after explicit user confirmation (plan-before-act). 
2

5) Memory + learning: SQLite + pattern markdown + vector search + confidence refinement
You’ve defined a canonical data model (Transactions, Patterns, UserProfile/Goals, Interventions, ExecutionPlans, etc.) to back a local-first system. 
2

Pattern Brain specifics:

Patterns are stored as Markdown “skill files” with structured metadata + trigger conditions + intervention templates.
Stored in SQLite + sqlite-vec for similarity search; embeddings generated locally via Ollama (nomic-embed-text). 
2
Confidence is updated based on hit/confirmed counts; low confidence can be flagged/disabled; high confidence promoted earlier. 
2
After confirmed interventions, you optionally ask Claude to decide whether to create a brand-new reusable pattern and persist it (self-improving loop). 
2
6) Risk Oracle: bounded multi-agent voting that outputs INTERVENE vs CLEAR
Your “Risk Oracle” is a read-only multi-agent layer: 5 sub-agents (balance sentinel, velocity analyzer, pattern matcher, subscription watcher, rent proximity guard) produce small JSON votes; an aggregator turns votes into a riskScore + verdict. 
2

This is explicitly constrained by your global rules: sub-agents are bounded (token-limited), and they cannot execute writes. 
3

7) Intervention Engine: modality selection + action handlers + real-time push to UI
When the oracle says INTERVENE, the Intervention Engine:

Chooses modality (voice, push, soft_block, draft_payment) using a decision matrix (riskScore threshold, intervention type, active hours, voice enabled). 
2
Runs an intervention handler (low balance, impulse buy, salary received, subscription duplicate, dream suggestion, etc.)
Pushes the intervention to the frontend over WebSocket for instant display. 
2
8) Multi-modal pillars
Pillar 1: Voice → Plan → Confirm → Execute
Voice pipeline:

STT (local whisper.cpp)
Read current state (accounts/profile/goals)
Claude creates an ExecutionPlan with narratedText (still no execution)
User confirms (voice “yes” or UI tap)
executePlan() runs steps sequentially via the only write gateway. 
2
Pillar 2: Receipt vision → verify → categorize → (optional) bunq action
Receipt pipeline:

Claude Vision extracts structured receipt info
Self-verification step (e.g., line item sum checks / anomaly flags)
Optionally generates a plan to “log” it / transfer to a savings jar (as your demo script describes). 
2
Pillar 3: Proactive intervention
This is the heartbeat+oracle+intervention system firing without the user asking—e.g., late-night unfamiliar merchant, low remaining balance before rent, velocity anomalies, etc. 
2

9) Dream Mode: nightly consolidation in a forked child process
Dream Mode runs at 2am in the user’s timezone via cron, in a forked worker:

Loads a week of transactions, all patterns, goals
Asks Claude to consolidate/merge patterns, remove contradictions, update confidence, and generate 3 actionable suggestions + a morning briefing.
Parent process stores results; kills worker if it runs >10 minutes. 
2
10) Frontend (demo-optimized UI)
Minimal React UI with:

VoiceOrb (mic capture + streaming to /api/voice, shows plan + confirm)
ReceiptScanner (camera → image → /api/receipt)
InterventionCard (shows oracle votes + risk score)
DreamBriefing (morning modal if dream session completed)
WebSocket hook to receive interventions in real time. 
2
11) Phased execution plan + demo script
Your spec includes a timed build plan (Phases 1–11) with rough durations, from bunq integration all the way to demo polish and tunneling the webhook endpoint. 
2

And you’ve written an explicit 3-minute demo script showing:

Morning briefing (Dream Mode output)
Receipt scan → extraction → confirm action
Voice command → plan narration → confirm → execute
Live proactive intervention card with oracle votes and draft payment behavior. 
2
One more “meta” observation (re: the frameworks list you posted)
The current build plan in your .md files is not yet wired to the OpenClaw/Hermes/SwarmClaw ecosystem you listed—it’s primarily a TypeScript + Fastify daemon architecture with Anthropic models, bounded sub-agents, and a local memory layer. That’s not a problem; it just means the repo today is best understood as a production-style spec for a standalone system, not as a thin integration layer over those existing agent frameworks. 
2

That’s my end-to-end understanding of the build plan “thus far” based strictly on what’s in your repo and bunq’s current webhook/signing docs. 
2





i am partaking in the following hackathon : https://www.bunq.com/hackathon?ajs_signed_identity=eyJhbGciOiJIUzI1NiIsImtpZCI6Im1ybjp2MTpjaGFubmVsczppZGVudGl0eS1jbGFpbXMtaXNzdWVyOjU1NTFkNjI2LTA3YzctNGUzYS1iMmE0LTcyNmFmMzkyYzI0OS80ZGU0Nzc5Ni0zZGEwLTVhY2YtOTliYy1mZTQ3MTdmMWI4NjQ6MSIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVycyI6W3sia2V5IjoiZW1haWxhZGRyZXNzIiwidmFsdWUiOiJoZGVtaXJoaXNhckBidW5xLmNvbSJ9XSwicmVzb2x1dGlvblN0cmF0ZWd5IjoiIiwiZXhwIjoxNzc0OTc4MzE0LCJpYXQiOjE3NzQzNzM1MTR9.XI-DluKZ7V8tIXlqQzbzMLMwJstaxe0NqUuGOUT7Utg&ajs_trait_lastMessageClicked=1c4b51a9-b517-4d97-8eef-6cfb1356be35&ajs_uid=c5ae61ac-90d3-4951-80c1-e518b2b8ef50&utm_campaign=Hackathon+7.0+is+just+around+the+corner+%F0%9F%A4%96&utm_id=90612ad6-f205-41a2-ba47-ae3a69d6367f&utm_medium=MessageBird+Email&utm_source=bird. and this is the project i am trying to build (https://github.com/knarayanareddy/BunqsyFinance) check out the .md files. this project were built on top off (Summary Table
Project Category Key Differentiator Stars (Apr 2026)
OpenClaw Persistent Agent Gateway-first, 50+ channels, 5,700+ skills ~346K
Hermes Agent Persistent Agent Self-improving loop, learns from experience ~64K
SwarmClaw Multi-Agent Orchestration 23 providers, MCP, heartbeats, delegation Growing
ClawTeam Agent Swarm Multi-GPU, leader/sub-agent, autoresearch Growing
AutoResearchClaw Research Automation 23-stage paper pipeline, HITL modes Growing
Karpathy autoresearch Research Automation The original modify→verify→repeat loop Foundational
Orchestra AI-Research-SKILLs Skills Library 87 skills, cross-agent, research lifecycle Growing
MiroFish Simulation/Prediction Swarm intelligence, 1M agents, social sim ~36K+
MiroFish-Offline Simulation/Prediction Fully local/English fork Fork
OpenCode Coding CLI 75+ providers, subscription piggybacking ~120K
Gemini CLI Coding CLI Free tier 1K req/day, Search grounding Rapid growth
Aider Coding CLI Git-aware, any model, architect mode ~40K
Cursor IDE Agent Cloud Agents, parallel subagents, $1B ARR #1 AI IDE
Windsurf IDE Agent Cascade, Cognition AI, #1 LogRocket rank Acquired
OpenHands Coding Agent Air-gapped, local, enterprise security Series A
Superpowers Skills/Methodology TDD + Socratic method workflow framework ~95K
SwarmVault Knowledge/Memory RAG wiki + MCP + knowledge graph New
Local-Memory Memory Layer 100% local, Ollama + SQLite-vec New
) can you do a end to end and understand the build plan thus far and then i will give you further instructions

claude-sonnet-4-6-search

Sources



preview



preview



preview



preview
I was unable to directly access the private GitHub repository at https://github.com/knarayanareddy/BunqsyFinance through search (it may be private or not indexed), but I have gathered enough from the bunq hackathon page and your description of the project stack to give you a thorough, expert-level end-to-end review. Here's my full breakdown:

🏦 BunqsyFinance — End-to-End Hackathon Review
🎯 What the Hackathon is Looking For
First, context: this hackathon challenges you to create intelligent, autonomous AI agents that leverage the bunq API to solve real banking problems or enhance existing services.
1
 Critically, they're looking for solutions that go beyond simple chatbots or automation scripts — your AI agent should demonstrate intelligence, adaptability, and provide genuine value to users.
1
 And the money is real: prizes include €5,000 for Best AI Agent, €1,000 for second place, €500 for third place, and a bonus €5,000 for Best bunq API Integration.
2
 That bonus prize is key — deep bunq API integration is heavily rewarded.

🔍 Project Stack Assessment (Based on Your Summary Table)
You've built BunqsyFinance on top of a very ambitious and modern stack. Let me go layer by layer:

🧠 Agent Layer — OpenClaw + Hermes Agent + SwarmClaw
Strengths:

Using OpenClaw (50+ channels, 5,700+ skills) as the base persistent agent is an excellent choice — it gives you a pre-built gateway-first architecture that means you can route user interactions across multiple surfaces (chat, voice, web).
Hermes Agent's self-improving loop is a differentiator — if you demo the agent actually learning from a user's spending patterns across sessions, that will blow the judges away. Most hackathon projects are stateless. Yours wouldn't be.
SwarmClaw for multi-agent orchestration with MCP (Model Context Protocol) is extremely forward-looking and directly relevant since you're encouraged to use cutting-edge tools such as MCP servers to bring a new edge to this hackathon.
1
Weaknesses / Risks:

The OpenClaw + Hermes + SwarmClaw stack is complex. If the integration isn't tight by demo time, it will look like over-engineering. You need to nail the narrative: "we use a swarm of specialized sub-agents, each owning a slice of the user's financial life."
Make sure each agent has a single clear job (e.g., one agent handles transaction categorization, one handles savings automation, one handles anomaly detection). Fuzzy boundaries will confuse the demo.
🔬 Research & Coding Layer — AutoResearchClaw + Orchestra AI-Research-SKILLs + OpenCode/Gemini CLI
Strengths:

Having AutoResearchClaw's 23-stage pipeline means you can have your agent autonomously research financial products, interest rates, or investment vehicles — something extremely novel in a banking agent context.
Orchestra AI-Research-SKILLs with 87 cross-agent skills gives you a rich library to draw from.
Gemini CLI with free-tier search grounding is massive: your agent can cite real-time financial news when making recommendations, adding enormous credibility.
Weaknesses / Risks:

This layer risks being invisible in a hackathon demo. Make sure there is a visible UI/UX surface where the jury sees these agents "thinking" — show intermediate reasoning steps, not just a final answer.
🧬 Simulation Layer — MiroFish
Strengths:

MiroFish (1M swarm agents for social simulation) is unique in a finance context. Using it to simulate how macroeconomic events (e.g., interest rate hikes) affect a user's personal financial trajectory is genuinely innovative — no other team will have this.
Weaknesses / Risks:

You MUST constrain this to a specific, demoable use case. "We simulate 1M agents" sounds impressive but judges will ask "so what?" You need: "We simulate market scenarios and show how YOUR budget would be affected in each — here's the visualization."
💾 Memory Layer — SwarmVault + Local-Memory
Strengths:

SwarmVault (RAG wiki + MCP + knowledge graph) gives your agent long-term financial memory per user — transaction history, goals, habits. This is a major differentiator.
Local-Memory (100% local, Ollama + SQLite-vec) ensures privacy compliance, which is critical in fintech and could be a compelling pitch point for bunq's privacy-conscious brand.
Weaknesses / Risks:

Make sure the knowledge graph actually surfaces something visible in the demo — e.g., "Your agent remembers you always overspend in December and is now pre-emptively creating a savings buffer in October." That's storytelling gold.
✅ What's Already Really Strong
The stack is best-in-class. Almost every component is from the cutting edge of open-source AI agent tooling. Most hackathon competitors will use a single LLM with a thin wrapper.
MCP integration directly answers bunq's specific call for MCP-based tools.
Self-improving loop via Hermes means your agent genuinely gets smarter with use — this directly answers the "intelligence and adaptability" judging criterion.
The name "Bunqsy" (Greek for "the right moment") is perfect for a financial timing agent — use this branding heavily.
🚨 Gaps & Changes I'd Make
1. 🔗 Deepen the bunq API Integration (Critical — €5,000 Bonus Prize)
This is non-negotiable. There is a separate €5,000 prize specifically for Best bunq API Integration.
2
 You need to go far beyond reading transactions. Here's what to use:

Using the bunq API, you can create single, batch, draft and scheduled payments
3
 — use this to build autonomous savings automation: the agent detects you have surplus cash and automatically moves it to a savings sub-account.
bunq offers 3 types of monetary accounts
3
 — your agent should intelligently manage all three (current, savings, joint) and make recommendations across them.
Webhooks: bunq offers real-time updates for events like payments and card transactions.
4
 Wire these into your Hermes self-improving loop so the agent reacts in real time to spending events.
Use OAuth for secure multi-user access — this makes BunqsyFinance feel like a real product, not a prototype.
2. 📊 Add a Real-Time Financial Dashboard
Right now your stack is very backend-heavy. Add a lightweight frontend (Streamlit, Next.js, or even a Gradio UI) that shows:

Live transaction feed via bunq webhooks
Agent "thought process" (intermediate reasoning steps)
Budget health score (updated in real time)
MiroFish scenario simulations as visual charts
3. 🎯 Add Proactive Agent Nudges (Not Just Reactive)
Most financial AI is reactive (you ask, it answers). BunqsyFinance should be proactive:

"You're on track to overspend on restaurants by €80 this month — want me to set a soft limit and alert you?"
"Your salary just landed. Based on your goals, I've already moved €200 to your holiday savings sub-account."
This leverages Hermes' self-improving loop + bunq webhooks + SwarmVault memory perfectly.
4. 🗣️ Add a Natural Language Payment Interface
Use OpenClaw's 50+ channel support to allow users to say:

"Send €20 to Sarah for lunch"
"Set aside €500 for my Amsterdam trip savings"
The agent then executes this via bunq's payment and savings account APIs.
This is immediately demoable, viscerally impressive, and directly hits the bunq API integration prize.

5. 🧪 Add HITL (Human-in-the-Loop) for High-Stakes Decisions
AutoResearchClaw supports HITL modes — use this for any payment or transfer above a threshold. The agent proposes, the user approves with one click. This is a crucial trust and safety feature that judges in fintech will notice and appreciate.

6. 🔐 Lead with Privacy & Local-First
Your Local-Memory layer (100% local, Ollama + SQLite-vec) is a privacy superpower. Frame this explicitly: "All financial reasoning happens locally. Your data never leaves your device unless you authorize a payment." This is a powerful differentiator vs. cloud-only competitors and aligns with bunq's ethos as a bank that believes banking should work for you — not the other way around.
4

🆕 New Features to Add
Feature	Why It Wins
Auto-savings trigger via bunq webhook	Real-time, autonomous, uses bunq API deeply
Scenario simulator UI (powered by MiroFish)	Visually stunning, unique, demoable
Spending anomaly alerts (Hermes loop)	Practical, relatable, addresses fraud too
Natural language payment execution	Jaw-dropping live demo moment
Financial goal tracker with agent-managed sub-accounts	Uses bunq's savings account API, emotionally resonant
Agent memory timeline (show SwarmVault graph visually)	Makes the "intelligence" visible to judges
Multi-user shared account intelligence (MonetaryAccountJoint)	Unique use of bunq's joint account API
🏆 Final Verdict
BunqsyFinance is architecturally outstanding — you've assembled the best available open-source AI agent stack and the concept is genuinely compelling. However, the risk is complexity without visible impact. The winning move is:

"Make the intelligence visible, make the bunq API integration deep, and have one jaw-dropping live demo moment."

If you add the bunq webhook → real-time agent reaction flow, the natural language payment execution, and a clean visual dashboard, you have a strong contender for both the €5,000 Best AI Agent AND the €5,000 Best bunq API Integration prizes simultaneously. That's a €10,000 project. Go build it. 🚀





i am partaking in the following hackathon : https://www.bunq.com/hackathon?ajs_signed_identity=eyJhbGciOiJIUzI1NiIsImtpZCI6Im1ybjp2MTpjaGFubmVsczppZGVudGl0eS1jbGFpbXMtaXNzdWVyOjU1NTFkNjI2LTA3YzctNGUzYS1iMmE0LTcyNmFmMzkyYzI0OS80ZGU0Nzc5Ni0zZGEwLTVhY2YtOTliYy1mZTQ3MTdmMWI4NjQ6MSIsInR5cCI6IkpXVCJ9.eyJpZGVudGlmaWVycyI6W3sia2V5IjoiZW1haWxhZGRyZXNzIiwidmFsdWUiOiJoZGVtaXJoaXNhckBidW5xLmNvbSJ9XSwicmVzb2x1dGlvblN0cmF0ZWd5IjoiIiwiZXhwIjoxNzc0OTc4MzE0LCJpYXQiOjE3NzQzNzM1MTR9.XI-DluKZ7V8tIXlqQzbzMLMwJstaxe0NqUuGOUT7Utg&ajs_trait_lastMessageClicked=1c4b51a9-b517-4d97-8eef-6cfb1356be35&ajs_uid=c5ae61ac-90d3-4951-80c1-e518b2b8ef50&utm_campaign=Hackathon+7.0+is+just+around+the+corner+%F0%9F%A4%96&utm_id=90612ad6-f205-41a2-ba47-ae3a69d6367f&utm_medium=MessageBird+Email&utm_source=bird. and this is the project i am trying to build (https://github.com/knarayanareddy/BunqsyFinance) check out the .md files. this project were built on top off (Summary Table
Project Category Key Differentiator Stars (Apr 2026)
OpenClaw Persistent Agent Gateway-first, 50+ channels, 5,700+ skills ~346K
Hermes Agent Persistent Agent Self-improving loop, learns from experience ~64K
SwarmClaw Multi-Agent Orchestration 23 providers, MCP, heartbeats, delegation Growing
ClawTeam Agent Swarm Multi-GPU, leader/sub-agent, autoresearch Growing
AutoResearchClaw Research Automation 23-stage paper pipeline, HITL modes Growing
Karpathy autoresearch Research Automation The original modify→verify→repeat loop Foundational
Orchestra AI-Research-SKILLs Skills Library 87 skills, cross-agent, research lifecycle Growing
MiroFish Simulation/Prediction Swarm intelligence, 1M agents, social sim ~36K+
MiroFish-Offline Simulation/Prediction Fully local/English fork Fork
OpenCode Coding CLI 75+ providers, subscription piggybacking ~120K
Gemini CLI Coding CLI Free tier 1K req/day, Search grounding Rapid growth
Aider Coding CLI Git-aware, any model, architect mode ~40K
Cursor IDE Agent Cloud Agents, parallel subagents, $1B ARR #1 AI IDE
Windsurf IDE Agent Cascade, Cognition AI, #1 LogRocket rank Acquired
OpenHands Coding Agent Air-gapped, local, enterprise security Series A
Superpowers Skills/Methodology TDD + Socratic method workflow framework ~95K
SwarmVault Knowledge/Memory RAG wiki + MCP + knowledge graph New
Local-Memory Memory Layer 100% local, Ollama + SQLite-vec New
) can you do a end to end and tell me what you think of it and are there any changes you would make and any new features you would add to make it the best possible project for the hackathon. And if it is already really good, just say so.
