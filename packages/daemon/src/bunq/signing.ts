import crypto from 'crypto';

export interface SigningKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
}

/**
 * Generates a new RSA-2048 key pair in PEM format.
 * Used for bunq request signing and webhook validation.
 */
export function generateKeyPair(): SigningKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey };
}

/**
 * Signs the request body string using the private key.
 * Algorithm: RSA with SHA-256
 * Format: Base64
 */
export function signRequestBody(body: string, privateKeyPem: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(body);
  sign.end();
  return sign.sign(privateKeyPem, 'base64');
}

/**
 * Verifies a webhook signature using the bunq public key.
 */
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
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}
