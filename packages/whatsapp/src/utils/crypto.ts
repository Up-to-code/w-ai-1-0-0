const encoder = new TextEncoder();

/** Converts an ArrayBuffer into lowercase hexadecimal text. */
export function bytesToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Computes a HMAC-SHA256 digest using Web Crypto. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(signature);
}

/** Creates Meta's appsecret_proof value for Graph API requests. */
export async function createAppSecretProof(accessToken: string, appSecret: string): Promise<string> {
  return hmacSha256Hex(appSecret, accessToken);
}

/** Compares two strings without early-returning on the first differing character. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

/** Verifies Meta's X-Hub-Signature-256 header against the raw webhook body. */
export async function verifyMetaSignature(rawBody: string, signatureHeader: string, appSecret: string): Promise<boolean> {
  const expected = `sha256=${await hmacSha256Hex(appSecret, rawBody)}`;
  return constantTimeEqual(expected, signatureHeader);
}
