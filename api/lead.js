module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { personId } = req.query;

  if (!personId) {
    return res.status(400).json({ error: 'personId required' });
  }

  const FUB_API_KEY = process.env.FUB_API_KEY;

  if (!FUB_API_KEY) {
    return res.status(500).json({ error: 'FUB API key not configured' });
  }

  const headers = {
    'Authorization': 'Basic ' + Buffer.from(FUB_API_KEY + ':').toString('base64'),
    'Content-Type': 'application/json',
  };

  const BASE = 'https://api.followupboss.com/v1';

  try {
    const [notesRes, callsRes, tasksRes, eventsRes] = await Promise.all([
      fetch(BASE + '/notes?personId=' + personId + '&limit=20', { headers }),
      fetch(BASE + '/calls?personId=' + personId + '&limit=20', { headers }),
      fetch(BASE + '/tasks?personId=' + personId + '&limit=20', { headers }),
      fetch(BASE + '/events?personId=' + personId + '&limit=30', { headers }),
    ]);

    const [notesData, callsData, tasksData, eventsData] = await Promise.all([
      notesRes.ok ? notesRes.json() : { notes: [] },
      callsRes.ok ? callsRes.json() : { calls: [] },
      tasksRes.ok ? tasksRes.json() : { tasks: [] },
      eventsRes.ok ? eventsRes.json() : { events: [] },
    ]);

    const noteCount = notesData.notes?.length || 0;
    const callCount = callsData.calls?.length || 0;
    const openTasks = (tasksData.tasks || []).filter(t => !t.isCompleted).length;
    const summary = noteCount + ' note' + (noteCount !== 1 ? 's' : '') + ', ' + callCount + ' call' + (callCount !== 1 ? 's' : '') + ', ' + openTasks + ' open task' + (openTasks !== 1 ? 's' : '') + '.';

    return res.status(200).json({
      summary,
      notes: (notesData.notes || []).map(n => ({ id: n.id, body: n.body, created: n.created })),
      calls: (callsData.calls || []).map(c => ({ id: c.id, created: c.created, duration: c.duration, outcome: c.outcome, note: c.note, transcript: c.transcript || null })),
      tasks: (tasksData.tasks || []).map(t => ({ id: t.id, name: t.name, dueDate: t.dueDate, isCompleted: t.isCompleted })),
      events: (eventsData.events || []).map(e => ({ id: e.id, type: e.type, description: e.description, created: e.created })),
    });
  } catch (err) {
    console.error('Lead fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch lead data', details: err.message });
  }
};
