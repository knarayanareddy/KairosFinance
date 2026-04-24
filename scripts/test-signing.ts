// Run with: npx tsx scripts/test-signing.ts
// Must print "✅ PHASE 0 GATE PASSED" before proceeding to Phase 1.
// Any other output means the signing implementation is broken.

async function runGate() {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    // dotenv not found, assuming environment variables are passed via CLI
  }

  const { generateKeyPair, signRequestBody } = await import(
    '../packages/daemon/src/bunq/signing'
  );

  console.log('--- PHASE 0: SIGNING TEST GATE ---');
  
  if (!process.env.BUNQ_API_KEY) {
    console.error('❌ PHASE 0 GATE FAILED — BUNQ_API_KEY is not set in .env');
    process.exit(1);
  }

  const keys = generateKeyPair();
  const testBody = JSON.stringify({ test: true });
  const signature = signRequestBody(testBody, keys.privateKeyPem);

  const sandboxUrl = process.env.BUNQ_SANDBOX_URL ?? 'https://public-api.sandbox.bunq.com/v1';

  console.log(`Connecting to: ${sandboxUrl}`);

  try {
    // 1. Register installation with bunq sandbox
    console.log('1. Registering installation...');
    const installRes = await fetch(
      `${sandboxUrl}/installation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_public_key: keys.publicKeyPem }),
      }
    );

    if (!installRes.ok) {
      const text = await installRes.text();
      console.error('❌ PHASE 0 GATE FAILED — installation call returned', installRes.status, text);
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

    console.log('   Installation token received.');

    // 2. Register device-server
    console.log('2. Registering device-server...');
    const deviceBody = JSON.stringify({
      description: 'KairosFinance-Gate-Test',
      secret: process.env.BUNQ_API_KEY,
      permitted_ips: ['*'],
    });
    const deviceSig = signRequestBody(deviceBody, keys.privateKeyPem);

    const deviceRes = await fetch(
      `${sandboxUrl}/device-server`,
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
      const text = await deviceRes.text();
      console.error('❌ PHASE 0 GATE FAILED — device-server returned', deviceRes.status, text);
      process.exit(1);
    }

    console.log('\n✅ PHASE 0 GATE PASSED — signing implementation is correct');
    console.log('   You may proceed to Phase 1.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ PHASE 0 GATE FAILED — unexpected error:', err.message);
    process.exit(1);
  }
}

runGate().catch((e) => {
  console.error('❌ unexpected error:', e.message);
  process.exit(1);
});
