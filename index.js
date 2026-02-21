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

// GET /api/chores/:username
app.get('/api/chores/:username', (req, res) => {
  const { username } = req.params;
  const data = readData();
  const chores = data.chores[username] || [];
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

// Serve React static build in production
const clientBuild = path.join(__dirname, 'client', 'build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
