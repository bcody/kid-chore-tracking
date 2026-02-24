'use strict';
// export-prod-json.js — Export all production DB data as a JSON file matching
// the old chores.json format.
//
// Usage:
//   DATABASE_URL=$(heroku config:get DATABASE_URL --app <your-app>) node scripts/export-prod-json.js

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const client = await pool.connect();
  try {
    const [usersRes, choresRes, completionsRes, notesRes, weeksRes] = await Promise.all([
      client.query('SELECT username, password, role FROM users'),
      client.query('SELECT username, chore_id, name, rating_type FROM chores ORDER BY username, chore_id'),
      client.query('SELECT username, day, chore_id, completed FROM completions'),
      client.query('SELECT username, note FROM notes'),
      client.query('SELECT start_date, frozen, chores_snapshot FROM weeks ORDER BY start_date DESC'),
    ]);

    // Build users object
    const users = {};
    for (const row of usersRes.rows) {
      users[row.username] = { password: row.password, role: row.role };
    }

    // Build chores object
    const chores = {};
    for (const row of choresRes.rows) {
      if (!chores[row.username]) chores[row.username] = [];
      const chore = { id: row.chore_id, name: row.name };
      if (row.rating_type && row.rating_type !== 'binary') chore.ratingType = row.rating_type;
      chores[row.username].push(chore);
    }

    // Build completions object
    const completions = {};
    for (const row of completionsRes.rows) {
      if (!completions[row.username]) completions[row.username] = {};
      if (!completions[row.username][row.day]) completions[row.username][row.day] = {};
      completions[row.username][row.day][row.chore_id] = row.completed;
    }

    // Build notes object
    const notes = {};
    for (const row of notesRes.rows) {
      notes[row.username] = row.note;
    }

    // Build weeks array
    const weeks = weeksRes.rows.map(row => {
      const week = { startDate: row.start_date, frozen: row.frozen };
      if (row.chores_snapshot) week.chores = row.chores_snapshot;
      return week;
    });

    const output = { users, chores, completions, notes, weeks };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `prod-export-${timestamp}.json`);
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
    console.log(`Exported to: ${outFile}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
