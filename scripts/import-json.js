'use strict';
// import-json.js — Import a chores.json-formatted file into the database.
//
// Usage:
//   DATABASE_URL=postgres://localhost/kid_chores_dev node scripts/import-json.js <path-to-json> [--clear]
//
// Options:
//   --clear   Drop all existing data before importing

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (_) {}
}

const fs = require('fs');
const { Pool } = require('pg');

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const clearFirst = args.includes('--clear');

if (!filePath) {
  console.error('Usage: node scripts/import-json.js <path-to-json> [--clear]');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (clearFirst) {
      console.log('Clearing existing data ...');
      await client.query('DELETE FROM completions');
      await client.query('DELETE FROM notes');
      await client.query('DELETE FROM chores');
      await client.query('DELETE FROM weeks');
      await client.query('DELETE FROM users');
    }

    // Import users
    const users = data.users || {};
    for (const [username, info] of Object.entries(users)) {
      await client.query(
        `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
         ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
        [username, info.password, info.role]
      );
    }

    // Import chores — delete existing entries for all affected users first, then insert
    const chores = data.chores || {};
    const choreUsernames = Object.keys(chores);
    if (choreUsernames.length > 0) {
      await client.query(
        'DELETE FROM chores WHERE username = ANY($1)',
        [choreUsernames]
      );
    }
    for (const [username, choreList] of Object.entries(chores)) {
      for (const chore of choreList) {
        await client.query(
          `INSERT INTO chores (username, chore_id, name, rating_type) VALUES ($1, $2, $3, $4)`,
          [username, chore.id, chore.name, chore.ratingType || 'binary']
        );
      }
    }

    // Import completions
    const completions = data.completions || {};
    for (const [username, days] of Object.entries(completions)) {
      for (const [day, choreMap] of Object.entries(days)) {
        for (const [choreId, completed] of Object.entries(choreMap)) {
          await client.query(
            `INSERT INTO completions (username, day, chore_id, completed) VALUES ($1, $2, $3, $4)
             ON CONFLICT (username, day, chore_id) DO UPDATE SET completed = EXCLUDED.completed`,
            [username, day, parseInt(choreId, 10), JSON.stringify(completed)]
          );
        }
      }
    }

    // Import notes
    const notes = data.notes || {};
    for (const [username, note] of Object.entries(notes)) {
      await client.query(
        `INSERT INTO notes (username, note) VALUES ($1, $2)
         ON CONFLICT (username) DO UPDATE SET note = EXCLUDED.note`,
        [username, note]
      );
    }

    // Import weeks
    const weeks = data.weeks || [];
    for (const week of weeks) {
      const startDate = week.startDate || week.start_date;
      const snapshot = week.chores || null;
      await client.query(
        `INSERT INTO weeks (start_date, frozen, chores_snapshot) VALUES ($1, $2, $3)
         ON CONFLICT (start_date) DO UPDATE SET frozen = EXCLUDED.frozen, chores_snapshot = EXCLUDED.chores_snapshot`,
        [startDate, week.frozen || false, snapshot ? JSON.stringify(snapshot) : null]
      );
    }

    await client.query('COMMIT');
    console.log('Import complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
