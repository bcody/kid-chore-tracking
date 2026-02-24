if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5003;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT username, password, role FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ username: user.username, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT username, role FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/weeks
app.get('/api/weeks', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT start_date AS "startDate", frozen FROM weeks ORDER BY start_date DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get weeks error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/weeks — create a new week entry (admin only)
// Body: { username, password, startDate }
app.post('/api/weeks', async (req, res) => {
  const { username, password, startDate } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT password, role FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || user.password !== password || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin credentials required' });
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: 'Invalid startDate format (expected YYYY-MM-DD)' });
    }
    try {
      await pool.query(
        'INSERT INTO weeks (start_date, frozen) VALUES ($1, FALSE)',
        [startDate]
      );
    } catch (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ error: 'Week already exists' });
      }
      throw insertErr;
    }
    res.json({ startDate, frozen: false });
  } catch (err) {
    console.error('Create week error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/weeks/:weekStart/freeze — freeze a week, snapshotting current chore lists (admin only)
// Body: { username, password }
app.post('/api/weeks/:weekStart/freeze', async (req, res) => {
  const { weekStart } = req.params;
  const { username, password } = req.body;
  try {
    const userResult = await pool.query(
      'SELECT password, role FROM users WHERE username = $1',
      [username]
    );
    const user = userResult.rows[0];
    if (!user || user.password !== password || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin credentials required' });
    }
    const weekResult = await pool.query(
      'SELECT start_date FROM weeks WHERE start_date = $1',
      [weekStart]
    );
    if (weekResult.rows.length === 0) {
      return res.status(404).json({ error: 'Week not found' });
    }
    const choresResult = await pool.query(
      'SELECT username, chore_id, name, rating_type FROM chores ORDER BY username, chore_id'
    );
    const choresSnapshot = {};
    for (const row of choresResult.rows) {
      if (!choresSnapshot[row.username]) choresSnapshot[row.username] = [];
      const chore = { id: row.chore_id, name: row.name };
      if (row.rating_type !== 'binary') chore.ratingType = row.rating_type;
      choresSnapshot[row.username].push(chore);
    }
    await pool.query(
      'UPDATE weeks SET frozen = TRUE, chores_snapshot = $1 WHERE start_date = $2',
      [JSON.stringify(choresSnapshot), weekStart]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Freeze week error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/chores/:username
// Optional query param: ?weekStart=YYYY-MM-DD — if the given week is frozen, returns the frozen chore snapshot
app.get('/api/chores/:username', async (req, res) => {
  const { username } = req.params;
  const { weekStart } = req.query;
  try {
    let chores;
    if (weekStart) {
      const weekResult = await pool.query(
        'SELECT frozen, chores_snapshot FROM weeks WHERE start_date = $1',
        [weekStart]
      );
      const week = weekResult.rows[0];
      if (week && week.frozen && week.chores_snapshot && week.chores_snapshot[username]) {
        chores = week.chores_snapshot[username];
      }
    }
    if (!chores) {
      const choresResult = await pool.query(
        'SELECT chore_id, name, rating_type FROM chores WHERE username = $1 ORDER BY chore_id',
        [username]
      );
      chores = choresResult.rows.map(r => {
        const chore = { id: r.chore_id, name: r.name };
        if (r.rating_type !== 'binary') chore.ratingType = r.rating_type;
        return chore;
      });
    }
    const completionsResult = await pool.query(
      'SELECT day, chore_id, completed FROM completions WHERE username = $1',
      [username]
    );
    const completions = {};
    for (const row of completionsResult.rows) {
      if (!completions[row.day]) completions[row.day] = {};
      completions[row.day][row.chore_id] = row.completed;
    }
    const noteResult = await pool.query(
      'SELECT note FROM notes WHERE username = $1',
      [username]
    );
    const note = noteResult.rows[0] ? noteResult.rows[0].note : '';
    res.json({ chores, completions, note });
  } catch (err) {
    console.error('Get chores error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chores/:username/check
// Body: { choreId, day, completed }
app.post('/api/chores/:username/check', async (req, res) => {
  const { username } = req.params;
  const { choreId, day, completed } = req.body;
  try {
    await pool.query(
      `INSERT INTO completions (username, day, chore_id, completed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username, day, chore_id) DO UPDATE SET completed = EXCLUDED.completed`,
      [username, day, choreId, JSON.stringify(completed)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Check chore error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/chores/:username/list
// Body: { chores: [ { id, name }, ... ] }
app.post('/api/chores/:username/list', async (req, res) => {
  const { username } = req.params;
  const { chores } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM chores WHERE username = $1', [username]);
    for (const chore of chores) {
      await client.query(
        'INSERT INTO chores (username, chore_id, name, rating_type) VALUES ($1, $2, $3, $4)',
        [username, chore.id, chore.name, chore.ratingType || 'binary']
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update chore list error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// POST /api/notes/:username
// Body: { note }
app.post('/api/notes/:username', async (req, res) => {
  const { username } = req.params;
  const { note } = req.body;
  try {
    await pool.query(
      `INSERT INTO notes (username, note) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET note = EXCLUDED.note`,
      [username, note]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Save note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reset — clears all completions and notes (admin only)
app.post('/api/reset', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT password, role FROM users WHERE username = $1',
      [username]
    );
    const user = rows[0];
    if (!user || user.password !== password || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin credentials required' });
    }
    await pool.query('DELETE FROM completions');
    await pool.query('DELETE FROM notes');
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve React static build in production.
// All /api/* routes are registered above, so this catch-all only matches non-API requests.
const clientBuild = path.join(__dirname, 'client', 'build');
app.use(express.static(clientBuild));
app.get('*', apiLimiter, (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'), (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Client build not found. Run `npm run build` inside the client directory.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
