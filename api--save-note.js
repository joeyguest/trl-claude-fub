// api/save-note.js
// Saves Claude responses back to FUB as notes
// DEPLOY THIS FILE TO: api/save-note.js in your Vercel project

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { personId, note } = req.body;

  if (!personId || !note) {
    return res.status(400).json({ error: 'personId and note required' });
  }

  const FUB_API_KEY = process.env.FUB_API_KEY;

  if (!FUB_API_KEY) {
    return res.status(500).json({ error: 'FUB API key not configured' });
  }

  try {
    const response = await fetch('https://api.followupboss.com/v1/notes', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(FUB_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personId: parseInt(personId),
        body: `[TRL Claude]\n\n${note}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('FUB note save error:', error);
      return res.status(500).json({ error: 'Failed to save note to FUB' });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, noteId: data.id });
  } catch (err) {
    console.error('Save note error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}