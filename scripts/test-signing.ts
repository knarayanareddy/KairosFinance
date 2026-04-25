import 'dotenv/config';
import { createSession } from '../packages/daemon/src/bunq/auth.js';

/**
 * Phase 0 Validation Script
 * Verifies that the bunq API Key is valid and the signing logic is working.
 */
async function validatePhase0() {
  console.log('🛡️ Starting Phase 0 Security Validation...');
  
  const apiKey = process.env.BUNQ_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: BUNQ_API_KEY is not set in .env');
    process.exit(1);
  }

  console.log('📡 Attempting to register device and create session...');
  
  try {
    const session = await createSession(apiKey);
    console.log('✅ PHASE 0 GATE PASSED');
    console.log(`👤 User ID: ${session.userId}`);
    console.log(`🔑 Session Token (truncated): ${session.sessionToken.substring(0, 8)}...`);
    console.log(`⏰ Expires At: ${session.expiresAt.toISOString()}`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ PHASE 0 GATE FAILED');
    
    try {
      const parsed = JSON.parse(err.message);
      console.error(`📍 Failure Point: ${parsed.step}`);
      console.error(`📊 HTTP Status: ${parsed.status}`);
      console.error(`📄 Response: ${parsed.body}`);
    } catch {
      console.error(`📝 Error Detail: ${err.message}`);
    }
    
    process.exit(1);
  }
}

validatePhase0();
