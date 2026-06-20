const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

async function waitForDB(retries = 20, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connected');
      return true;
    } catch (e) {
      console.log(`Waiting for database... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database');
}

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT false,
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

    // Create default admin if no users exist
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, email, password_hash, is_admin) VALUES ($1, $2, $3, true)',
        ['admin', 'admin@streamflix.local', hash]
      );
      console.log('Default admin created: admin@streamflix.local / admin123');
    }

    console.log('Migrations complete');
  } finally {
    client.release();
  }
}

module.exports = { pool, waitForDB, migrate };
