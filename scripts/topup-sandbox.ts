import 'dotenv/config';
import { createSession } from '../packages/daemon/src/bunq/auth.ts';

/**
 * Sandbox Top-Up Script v2 (Sugar Daddy Edition)
 * Requests €500 from sugardaddy@bunq.com.
 */
async function topupSandbox() {
  console.log('🍭 Connecting to Sugar Daddy for Sandbox funds...');
  
  const apiKey = process.env.BUNQ_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: BUNQ_API_KEY is not set');
    process.exit(1);
  }

  try {
    const session = await createSession(apiKey);
    const baseUrl = process.env.BUNQ_SANDBOX_URL ?? 'https://public-api.sandbox.bunq.com/v1';

    // Step 1: Get the Monetary Account ID
    console.log('📡 Fetching monetary accounts...');
    const accRes = await fetch(`${baseUrl}/user/${session.userId}/monetary-account`, {
      headers: { 'X-Bunq-Client-Authentication': session.sessionToken }
    });
    
    const accData = await accRes.json();
    const account = accData.Response?.[0]; // Get the first account
    const accountId = account?.MonetaryAccountBank?.id || account?.MonetaryAccountSavings?.id;

    if (!accountId) {
      throw new Error('Could not find a valid monetary account ID');
    }

    console.log(`✅ Found account ID: ${accountId}`);

    // Step 2: Send Request Inquiry to Sugar Daddy
    console.log('💸 Sending request to sugardaddy@bunq.com...');
    const reqRes = await fetch(`${baseUrl}/user/${session.userId}/monetary-account/${accountId}/request-inquiry`, {
      method: 'POST',
      headers: {
        'X-Bunq-Client-Authentication': session.sessionToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount_inquired: { value: '500.00', currency: 'EUR' },
        counterparty_alias: {
          type: 'EMAIL',
          value: 'sugardaddy@bunq.com',
          name: 'Sugar Daddy'
        },
        description: 'Funding my Bunqsy Demo',
        allow_bunqme: true
      })
    });

    if (!reqRes.ok) {
      const err = await reqRes.text();
      throw new Error(`Inquiry failed (${reqRes.status}): ${err}`);
    }

    console.log('💰 ✅ SUCCESS! Sugar Daddy has been invoiced for €500.');
    console.log('The funds should appear in your Sandbox account immediately.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Top-up failed:', err.message);
    process.exit(1);
  }
}

topupSandbox();
