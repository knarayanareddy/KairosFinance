/**
 * Helper script to generate a bunq Sandbox API key without using the mobile app.
 * Documentation: https://doc.bunq.com/#/sandbox-user
 */

async function generateSandboxKey() {
  console.log('--- GENERATING BUNQ SANDBOX API KEY ---');

  const url = 'https://public-api.sandbox.bunq.com/v1/sandbox-user-person';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'none',
        'User-Agent': 'KairosFinance-Setup-Script',
        'X-Bunq-Client-Request-Id': Date.now().toString(),
        'X-Bunq-Language': 'en_US',
        'X-Bunq-Region': 'en_US',
        'X-Bunq-Geolocation': '0 0 0 0 000'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('❌ FAILED to generate sandbox key:', response.status, text);
      process.exit(1);
    }

    const data = await response.json();
    const apiKey = data.Response.find((r: any) => r.ApiKey)?.ApiKey.api_key;

    if (!apiKey) {
      console.error('❌ FAILED: No api_key found in response payload');
      process.exit(1);
    }

    console.log('\n✅ SUCCESS! Your Sandbox API Key is:');
    console.log('--------------------------------------------------');
    console.log(apiKey);
    console.log('--------------------------------------------------\n');
    console.log('1. Copy the key above.');
    console.log('2. Open your .env file.');
    console.log('3. Paste it into the BUNQ_API_KEY field.');
    console.log('4. Run: npx tsx scripts/test-signing.ts');
    
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

generateSandboxKey();
