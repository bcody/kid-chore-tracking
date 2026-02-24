const pool = require('./db');

async function init() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chores (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username),
        chore_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        rating_type TEXT NOT NULL DEFAULT 'binary'
      );

      CREATE TABLE IF NOT EXISTS completions (
        username TEXT NOT NULL REFERENCES users(username),
        day TEXT NOT NULL,
        chore_id INTEGER NOT NULL,
        completed JSONB,
        PRIMARY KEY (username, day, chore_id)
      );

      CREATE TABLE IF NOT EXISTS notes (
        username TEXT PRIMARY KEY REFERENCES users(username),
        note TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS weeks (
        start_date TEXT PRIMARY KEY,
        frozen BOOLEAN NOT NULL DEFAULT FALSE,
        chores_snapshot JSONB
      );
    `);

    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO users (username, password, role) VALUES
          ('dkc', 'dkc', 'kid'),
          ('skc', 'skc', 'kid'),
          ('admin', 'admin', 'admin');
      `);
      console.log('Seeded initial users');
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
