const encoder = new TextEncoder();

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

export async function createSessionToken(payload, secret) {
  const key = await getKey(secret);
  const dataB64 = b64encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(dataB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${dataB64}.${sigB64}`;
}

export async function verifySessionToken(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataB64, sigB64] = parts;
  try {
    const key = await getKey(secret);
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(dataB64)
    );
    if (!valid) return null;
    return JSON.parse(b64decode(dataB64));
  } catch {
    return null;
  }
}
