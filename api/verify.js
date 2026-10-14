const { verifyContext } = require('./_lib/signature');

// Verifies the signed widget context on page load. Sure Send recommends
// rejecting contexts older than 300 seconds.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context, signature } = req.body || {};
  const result = verifyContext(context, signature, 300);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  return res.status(200).json({ context: result.context });
};
