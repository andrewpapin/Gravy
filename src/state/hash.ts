import { sha256 } from 'js-sha256';

const HEX = '0123456789abcdef';

// Synchronous (unlike the Web Crypto SubtleCrypto API) so it can run inline during state
// hydration/migration without turning the load path async.
export function randomSaltHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

export function hashWithSalt(value: string, salt: string): string {
  return sha256(`${salt}:${value}`);
}
