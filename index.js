const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5003;
const DATA_FILE = path.join(__dirname, 'chores.json');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read data file:', err.message);
    throw new Error('Data store unavailable');
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ username, role: user.role });
});

// GET /api/users
app.get('/api/users', (req, res) => {
  const data = readData();
  const users = Object.entries(data.users).map(([username, info]) => ({
    username,
    role: info.role,
  }));
  res.json(users);
});

// GET /api/weeks
app.get('/api/weeks', (req, res) => {
  const data = readData();
  const weeks = (data.weeks || []).slice().sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  );
  res.json(weeks);
});

// POST /api/weeks — create a new week entry (admin only)
// Body: { username, password, startDate }
app.post('/api/weeks', (req, res) => {
  const { username, password, startDate } = req.body;
  const data = readData();
  const user = data.users[username];
  if (!user || user.password !== password || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin credentials required' });
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return res.status(400).json({ error: 'Invalid startDate format (expected YYYY-MM-DD)' });
  }
  if (!data.weeks) data.weeks = [];
  if (data.weeks.find(w => w.startDate === startDate)) {
    return res.status(409).json({ error: 'Week already exists' });
  }
  const newWeek = { startDate, frozen: false };
  data.weeks.push(newWeek);
  writeData(data);
  res.json(newWeek);
});

// POST /api/weeks/:weekStart/freeze — freeze a week, snapshotting current chore lists (admin only)
// Body: { username, password }
app.post('/api/weeks/:weekStart/freeze', (req, res) => {
  const { weekStart } = req.params;
  const { username, password } = req.body;
  const data = readData();
  const user = data.users[username];
  if (!user || user.password !== password || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin credentials required' });
  }
  if (!data.weeks) {
    return res.status(404).json({ error: 'Week not found' });
  }
  const week = data.weeks.find(w => w.startDate === weekStart);
  if (!week) {
    return res.status(404).json({ error: 'Week not found' });
  }
  week.frozen = true;
  week.chores = {};
  for (const [uname, chores] of Object.entries(data.chores)) {
    week.chores[uname] = chores.map(c => ({ ...c }));
  }
  writeData(data);
  res.json({ ok: true });
});

// GET /api/chores/:username
// Optional query param: ?weekStart=YYYY-MM-DD — if the given week is frozen, returns the frozen chore snapshot
app.get('/api/chores/:username', (req, res) => {
  const { username } = req.params;
  const { weekStart } = req.query;
  const data = readData();
  let chores = data.chores[username] || [];
  if (weekStart && data.weeks) {
    const week = data.weeks.find(w => w.startDate === weekStart);
    if (week && week.frozen && week.chores && week.chores[username]) {
      chores = week.chores[username];
    }
  }
  const completions = data.completions[username] || {};
  const note = (data.notes && data.notes[username]) || '';
  res.json({ chores, completions, note });
});

// POST /api/chores/:username/check
// Body: { choreId, day, completed }
app.post('/api/chores/:username/check', (req, res) => {
  const { username } = req.params;
  const { choreId, day, completed } = req.body;
  const data = readData();

  if (!data.completions[username]) {
    data.completions[username] = {};
  }
  if (!data.completions[username][day]) {
    data.completions[username][day] = {};
  }
  data.completions[username][day][choreId] = completed;

  writeData(data);
  res.json({ ok: true });
});

// POST /api/chores/:username/list
// Body: { chores: [ { id, name }, ... ] }
app.post('/api/chores/:username/list', (req, res) => {
  const { username } = req.params;
  const { chores } = req.body;
  const data = readData();
  data.chores[username] = chores;
  writeData(data);
  res.json({ ok: true });
});

// POST /api/notes/:username
// Body: { note }
app.post('/api/notes/:username', (req, res) => {
  const { username } = req.params;
  const { note } = req.body;
  const data = readData();
  if (!data.notes) data.notes = {};
  data.notes[username] = note;
  writeData(data);
  res.json({ ok: true });
});

// POST /api/reset — clears all completions and notes (admin only)
app.post('/api/reset', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  const user = data.users[username];
  if (!user || user.password !== password || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin credentials required' });
  }
  data.completions = {};
  data.notes = {};
  writeData(data);
  res.json({ ok: true });
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
