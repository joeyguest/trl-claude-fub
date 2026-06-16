module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, leadContext } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  const systemPrompt = `You are TRL Claude, an AI assistant embedded inside Follow Up Boss for Team Real Local, a Florida real estate team led by Joey Guest operating in Brevard, Orange, and Osceola counties on the Space Coast.

Your job is to help Joey and his team understand leads, take notes, plan follow-ups, and draft communications. You have full access to the lead's CRM data including notes, calls, tasks, and activity.

ABOUT THE TEAM:
- Team Real Local is brokered by Real, led by Joey Guest
- Primary markets: Space Coast (Brevard County), Central Florida (Orange and Osceola counties)
- Primary lead source: YouTube organic content
- CRM: Follow Up Boss

NOTE-TAKING STYLE (when generating call notes):
Write bullet points that are short and scannable. Include:
- Location interest and property criteria (area, price, lot size, HOA preference)
- Financial situation (budget, financing type, income situation)
- Motivation and timeline
- Personal context that affects the search (family, lifestyle, occupation)
- Relationship intel (referrals, co-buyers, connections)
- Concerns or objections raised
- Next steps at the bottom

Example style:
Palm Bay / DR Horton interest
Him and buddy Eli, might be a 2 for 1
Looking for 1+ acre, at least 0.5 acre minimum
Budget $400k, pre-approved to $450k
1099 long haul truck driver
Strong HOA aversion, 15 years of bad HOA experience
Has RV in Ohio, needs space to park truck and RV
Just him and wife, no kids, around 2000 sq ft
Next steps: Send non-HOA Palm Bay examples, follow up on Eli visit

COMMUNICATION STYLE:
- Direct and action-oriented
- No corporate filler phrases
- Casual but professional
- Get to the point

CURRENT LEAD CONTEXT:
${leadContext || 'No lead data loaded.'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return res.status(500).json({ error: 'Claude API error', details: error });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'No response';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};
