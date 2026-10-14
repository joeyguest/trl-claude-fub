const crypto = require('crypto');

// Sure Send signs the raw Base64 `context` string (not the decoded JSON)
// with HMAC SHA-256 using the widget secret, hex encoded.
function verifyContext(context, signature, maxAgeSeconds) {
  const secret = process.env.SURE_SEND_WIDGET_SECRET;
  if (!secret) return { ok: false, status: 500, error: 'Widget secret not configured' };
  if (typeof context !== 'string' || typeof signature !== 'string' || !context || !signature) {
    return { ok: false, status: 400, error: 'Missing context or signature' };
  }

  const expected = crypto.createHmac('sha256', secret).update(context).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature.toLowerCase(), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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
