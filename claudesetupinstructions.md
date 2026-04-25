Using Claude to Build BunqsyFinance at the Hackathon
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
