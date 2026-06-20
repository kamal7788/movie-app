const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id INTEGER NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(500),
        poster_path VARCHAR(500),
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id, media_type)
      );

      CREATE TABLE IF NOT EXISTS watch_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id INTEGER NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(500),
        poster_path VARCHAR(500),
        backdrop_path VARCHAR(500),
        season INTEGER DEFAULT 1,
        episode INTEGER DEFAULT 1,
        progress_seconds INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id, media_type, season, episode)
      );

      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tmdb_id INTEGER NOT NULL,
        media_type VARCHAR(10) NOT NULL DEFAULT 'movie',
        title VARCHAR(500),
        poster_path VARCHAR(500),
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, tmdb_id, media_type)
      );
    `);
    console.log('Migrations complete');
  } finally {
    client.release();
  }
}

if (process.argv[2] === 'migrate') {
  migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { pool, migrate };
