/**
 * Pre-demo validation checklist.
 * Run before every presentation: npx tsx scripts/checklist.ts
 * Exits 0 if all checks pass, 1 if any critical check fails.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createSign } from 'crypto';

// Scripts are always invoked from the monorepo root
const ROOT = process.cwd();

// ── Colours ───────────────────────────────────────────────────────────────────
const G = '\x1b[32m'; const R = '\x1b[31m'; const Y = '\x1b[33m';
const B = '\x1b[34m'; const W = '\x1b[1m';  const N = '\x1b[0m';

const pass  = (msg: string) => console.log(`  ${G}✓${N}  ${msg}`);
const fail  = (msg: string) => console.log(`  ${R}✗${N}  ${msg}`);
const warn  = (msg: string) => console.log(`  ${Y}⚠${N}  ${msg}`);
const head  = (msg: string) => console.log(`\n${B}${W}${msg}${N}`);

let criticalFailed = false;
const markFail = (msg: string) => { fail(msg); criticalFailed = true; };

// ── Load .env ─────────────────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

// ── Check 1: .env keys ────────────────────────────────────────────────────────
function checkEnv(env: Record<string, string>): void {
  head('1 · Environment Variables');

  const required: Array<[string, string]> = [
    ['BUNQ_API_KEY',      'bunq sandbox API key'],
    ['ANTHROPIC_API_KEY', 'Anthropic / Claude API key'],
    ['BUNQ_SANDBOX_URL',  'bunq sandbox base URL'],
    ['DB_PATH',           'SQLite database path'],
    ['PORT',              'daemon port'],
  ];
  const optional: Array<[string, string]> = [
    ['ELEVENLABS_API_KEY', 'ElevenLabs STT/TTS (voice features)'],
    ['OLLAMA_URL',         'Ollama local embeddings'],
    ['WEBHOOK_PUBLIC_URL', 'public webhook tunnel'],
  ];

  for (const [key, label] of required) {
    if (env[key]) pass(`${key} — ${label}`);
    else markFail(`${key} is missing — ${label}`);
  }
  for (const [key, label] of optional) {
    if (env[key]) pass(`${key} — ${label}`);
    else warn(`${key} not set — ${label}`);
  }
}

// ── Check 2: Critical files ───────────────────────────────────────────────────
function checkFiles(): void {
  head('2 · Critical Files');

  const files = [
    ['packages/daemon/src/bunq/signing.ts',          'RSA signing module'],
    ['packages/daemon/src/bunq/execute.ts',           'single write gateway'],
    ['packages/daemon/src/memory/db.ts',              'SQLite connection'],
    ['packages/daemon/src/heartbeat/loop.ts',         'heartbeat loop'],
    ['packages/daemon/src/oracle/index.ts',           'risk oracle'],
    ['packages/daemon/src/intervention/engine.ts',    'intervention engine'],
    ['packages/frontend/src/App.tsx',                 'frontend entry'],
    ['packages/frontend/src/components/BunqsyScore.tsx', 'BUNQSY score component'],
  ];

  for (const [rel, label] of files) {
    const abs = join(ROOT, rel);
    if (existsSync(abs)) pass(`${rel.split('/').pop()} — ${label}`);
    else markFail(`MISSING: ${rel} (${label})`);
  }
}

// ── Check 3: SQLite database ──────────────────────────────────────────────────
async function checkDatabase(env: Record<string, string>): Promise<void> {
  head('3 · SQLite Database');

  const dbPath = join(ROOT, env['DB_PATH'] ?? 'bunqsy.db');
  if (!existsSync(dbPath)) {
    warn('Database file not found — will be created on first daemon start');
    return;
  }

  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });

    const EXPECTED_TABLES = [
      'sessions', 'transactions', 'patterns', 'user_profile',
      'goals', 'interventions', 'execution_plans', 'tick_log',
      'dream_sessions', 'score_log', 'forecast_cache',
    ];

    const rows = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table'`
    ).all() as Array<{ name: string }>;

    const existing = new Set(rows.map(r => r.name));
    let missing = 0;

    for (const table of EXPECTED_TABLES) {
      if (existing.has(table)) pass(`table: ${table}`);
      else { warn(`table missing: ${table} — run daemon once to apply schema`); missing++; }
    }

    const tickCount = db.prepare(`SELECT COUNT(*) as n FROM tick_log`).get() as { n: number } | undefined;
    if ((tickCount?.n ?? 0) > 0) pass(`tick_log has ${tickCount!.n} entries`);
    else warn('tick_log is empty — daemon has not run a heartbeat yet');

    db.close();
    if (missing === 0) pass('All expected tables present');
  } catch (err: unknown) {
    warn(`Could not open DB: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Check 4: Signing (local, no API call) ─────────────────────────────────────
async function checkSigning(): Promise<void> {
  head('4 · Signing Module (local)');

  try {
    const { generateKeyPair, signRequestBody, verifyWebhookSignature } = await import(
      join(ROOT, 'packages/daemon/src/bunq/signing.ts')
    ) as {
      generateKeyPair: () => { privateKeyPem: string; publicKeyPem: string };
      signRequestBody: (body: string, key: string) => string;
      verifyWebhookSignature: (body: string, sig: string, pub: string) => boolean;
    };

    const { privateKeyPem, publicKeyPem } = generateKeyPair();
    pass('RSA-2048 key pair generated');

    const body = JSON.stringify({ test: true, ts: Date.now() });
    const sig  = signRequestBody(body, privateKeyPem);
    pass(`Request body signed (${sig.length} chars base64)`);

    const valid = verifyWebhookSignature(body, sig, publicKeyPem);
    if (valid) pass('Signature round-trip verified');
    else markFail('Signature verification failed — signing module is broken');

    // Quick sanity: Node crypto createSign must produce SHA256
    const direct = createSign('SHA256');
    direct.update(body);
    const directSig = direct.sign(privateKeyPem, 'base64');
    if (directSig === sig) pass('Signature matches Node crypto reference');
    else markFail('Signature mismatch vs Node crypto — algorithm drift detected');

  } catch (err: unknown) {
    markFail(`Signing module error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Check 5: Daemon health (optional — only if already running) ───────────────
async function checkDaemon(env: Record<string, string>): Promise<void> {
  head('5 · Daemon Health (skip if not started)');

  const port = env['PORT'] ?? '3001';
  const base  = `http://localhost:${port}`;

  try {
    const scoreRes = await fetch(`${base}/api/score`, { signal: AbortSignal.timeout(2000) });
    if (scoreRes.ok) {
      const score = await scoreRes.json() as { value?: number } | null;
      pass(`GET /api/score → ${scoreRes.status} (score: ${score?.value ?? 'none yet'})`);
    } else {
      warn(`GET /api/score → ${scoreRes.status} — unexpected status`);
    }

    const ivRes = await fetch(`${base}/api/interventions`, { signal: AbortSignal.timeout(2000) });
    if (ivRes.ok) pass(`GET /api/interventions → ${ivRes.status}`);
    else warn(`GET /api/interventions → ${ivRes.status}`);

  } catch {
    warn(`Daemon not reachable on :${port} — start it with: bash scripts/start-demo.sh`);
  }
}

// ── Check 6: Script inventory ─────────────────────────────────────────────────
function checkScripts(): void {
  head('6 · Demo Scripts');

  const scripts = [
    ['scripts/generate-sandbox-key.ts', 'generate bunq sandbox key'],
    ['scripts/test-signing.ts',         'Phase 0 gate (signing + install)'],
    ['scripts/validate-phase-0.ts',     'Phase 0 gate (full session)'],
    ['scripts/reset-demo.ts',           'wipe database for clean demo'],
    ['scripts/seed-demo.ts',            'seed demo transactions'],
    ['scripts/start-demo.sh',           'one-command launcher'],
    ['scripts/checklist.ts',            'this checklist'],
  ];

  for (const [rel, label] of scripts) {
    const abs = join(ROOT, rel);
    if (existsSync(abs)) pass(`${rel.split('/').pop()} — ${label}`);
    else markFail(`MISSING: ${rel}`);
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\n${B}${W}════════════════════════════════════════════${N}`);
  console.log(`${B}${W}  BUNQSY Pre-Demo Checklist — bunq HK 7.0  ${N}`);
  console.log(`${B}${W}════════════════════════════════════════════${N}`);

  const env = loadEnv();

  checkEnv(env);
  checkFiles();
  await checkDatabase(env);
  await checkSigning();
  await checkDaemon(env);
  checkScripts();

  console.log('');
  if (criticalFailed) {
    console.log(`${R}${W}╔══════════════════════════════════╗${N}`);
    console.log(`${R}${W}║  ✗  PRE-DEMO CHECKS FAILED       ║${N}`);
    console.log(`${R}${W}╚══════════════════════════════════╝${N}`);
    console.log(`  Fix the ${R}✗${N} items above before presenting.\n`);
    process.exit(1);
  } else {
    console.log(`${G}${W}╔══════════════════════════════════╗${N}`);
    console.log(`${G}${W}║  ✓  ALL CHECKS PASSED — GO DEMO  ║${N}`);
    console.log(`${G}${W}╚══════════════════════════════════╝${N}`);
    console.log(`  Run: ${W}bash scripts/start-demo.sh${N}\n`);
    process.exit(0);
  }
}

main().catch((e: unknown) => {
  console.error(`\n${R}Unexpected error:${N}`, e instanceof Error ? e.message : e);
  process.exit(1);
});
