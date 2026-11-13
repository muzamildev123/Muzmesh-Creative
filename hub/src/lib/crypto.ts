// Encrypts the LinkedIn and X tokens before they reach the database (AES-256-GCM).
// The key is the TOKEN_KEY secret: 32 random bytes, base64. A database copy alone cannot post anything.
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64urlEncode = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64Decode = (s: string): Uint8Array<ArrayBuffer> => {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const keys = new Map<string, Promise<CryptoKey>>();
const importKey = (raw: string): Promise<CryptoKey> => {
  let k = keys.get(raw);
  if (!k) {
    const bytes = b64Decode(raw.trim());
    if (bytes.length !== 32) throw new Error('TOKEN_KEY must be 32 bytes, base64 encoded. Make one with: openssl rand -base64 32');
    k = crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
    keys.set(raw, k);
  }
  return k;
};

export const hasTokenKey = (key: string | undefined): key is string => {
  if (!key) return false;
  try { return b64Decode(key.trim()).length === 32; } catch { return false; }
};

export const encryptSecret = async (key: string, plain: string): Promise<string> => {
  if (!plain) return '';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(key), enc.encode(plain)));
  return `v1.${b64urlEncode(iv)}.${b64urlEncode(ct)}`;
};

export const decryptSecret = async (key: string, sealed: string): Promise<string> => {
  if (!sealed) return '';
  const [v, iv, ct] = sealed.split('.');
  if (v !== 'v1' || !iv || !ct) throw new Error('Unknown secret format.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64Decode(iv) }, await importKey(key), b64Decode(ct));
  return dec.decode(plain);
};

export { b64urlEncode, b64Decode };
