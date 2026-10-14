const crypto = require('crypto');

// Sure Send signs the raw Base64 `context` string (not the decoded JSON)
// with HMAC SHA-256 using the widget secret, hex encoded.
function hmacMatches(key, data, signature) {
  const a = Buffer.from(crypto.createHmac('sha256', key).update(data).digest('hex'), 'utf8');
  const b = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyContext(context, signature, maxAgeSeconds) {
  const rawSecret = process.env.SURE_SEND_WIDGET_SECRET;
  const secret = rawSecret && rawSecret.trim();
  if (!secret) return { ok: false, status: 500, error: 'Widget secret not configured' };
  if (typeof context !== 'string' || typeof signature !== 'string' || !context || !signature) {
    return { ok: false, status: 400, error: 'Missing context or signature' };
  }

  // The docs' examples key the HMAC with the secret string, but the secret is
  // 64 hex chars, so also accept the hex-decoded 32-byte form.
  const keys = [secret];
  if (/^[0-9a-fA-F]{64}$/.test(secret)) keys.push(Buffer.from(secret, 'hex'));
  if (!keys.some(k => hmacMatches(k, context, signature))) {
    return { ok: false, status: 401, error: 'Invalid signature' };
  }

  let parsed;
  try {
    const b64 = context.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
    parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    return { ok: false, status: 400, error: 'Malformed context' };
  }

  if (maxAgeSeconds && parsed.timestamp) {
    const age = (Date.now() - new Date(parsed.timestamp).getTime()) / 1000;
    if (!(age < maxAgeSeconds)) return { ok: false, status: 401, error: 'Context expired, reload the contact' };
  }

  return { ok: true, context: parsed };
}

module.exports = { verifyContext };
