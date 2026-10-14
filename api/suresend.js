// Pass-through proxy to the Sure Send Partner API.
// api.suresend.ai does not send CORS headers, so the browser can't call it
// directly. The user's token comes from their own localStorage on every
// request and is never stored here.

const BASE = 'https://api.suresend.ai/api/partner';
const UUID = '[0-9a-fA-F-]{8,64}';

const ALLOWED = {
  GET: [
    /^\/me$/,
    new RegExp(`^/people/${UUID}$`),
    /^\/notes$/,
    /^\/calls$/,
    new RegExp(`^/calls/${UUID}$`),
    new RegExp(`^/calls/${UUID}/transcript$`),
    /^\/emailMessages$/,
    new RegExp(`^/emailMessages/${UUID}$`),
    /^\/tasks$/,
  ],
  POST: [/^\/notes$/, /^\/tasks$/],
};

const ALLOWED_QUERY = ['personId', 'page', 'limit'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = req.headers['authorization'] || '';
  if (!/^Bearer suresendcrm_\S+$/.test(auth)) {
    return res.status(401).json({ error: 'Missing Sure Send token' });
  }

  const { method = 'GET', path, query, body } = req.body || {};
  const rules = ALLOWED[method];
  if (!rules || typeof path !== 'string' || !rules.some(r => r.test(path))) {
    return res.status(400).json({ error: 'Endpoint not allowed' });
  }

  const qs = new URLSearchParams();
  if (query && typeof query === 'object') {
    for (const k of ALLOWED_QUERY) {
      if (query[k] !== undefined && query[k] !== null) qs.set(k, String(query[k]));
    }
  }
  const url = BASE + path + (qs.toString() ? '?' + qs.toString() : '');

  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text || '{}');
  } catch (err) {
    console.error('Sure Send proxy error:', err);
    return res.status(502).json({ error: 'Could not reach Sure Send', details: err.message });
  }
};
