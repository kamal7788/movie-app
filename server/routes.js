const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const { authMiddleware } = require('./auth');
require('dotenv').config();

const router = express.Router();

function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: Create User ---
router.post('/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hash]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error('Admin create user error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: List Users ---
router.get('/admin/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: Make Admin ---
router.post('/admin/users/:userId/make-admin', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [req.params.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: Delete User ---
router.delete('/admin/users/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1 AND id != $2', [req.params.userId, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: Update User ---
router.put('/admin/users/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = req.params.userId;

    // Check user exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    // Check username/email uniqueness
    if (username || email) {
      const dup = await pool.query(
        'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
        [email || '', username || '', userId]
      );
      if (dup.rows.length > 0) return res.status(409).json({ error: 'Username or email already exists' });
    }

    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    }
    if (username) await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
    if (email) await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);

    res.json({ ok: true });
  } catch (e) {
    console.error('Admin update user error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin: Remove Admin ---
router.post('/admin/users/:userId/remove-admin', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.userId) === req.user.id) return res.status(400).json({ error: 'Cannot remove own admin' });
    await pool.query('UPDATE users SET is_admin = false WHERE id = $1', [req.params.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Profile: Change Own Password ---
router.post('/profile/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both fields required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Profile: Get own profile (is_admin included) ---
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Favorites ---
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 ORDER BY added_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const { tmdb_id, media_type, title, poster_path } = req.body;
    await pool.query(
      `INSERT INTO favorites (user_id, tmdb_id, media_type, title, poster_path)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING`,
      [req.user.id, tmdb_id, media_type || 'movie', title, poster_path]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/favorites/:tmdbId/:mediaType', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3',
      [req.user.id, req.params.tmdbId, req.params.mediaType]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Watch History ---
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT ON (tmdb_id, media_type) * FROM watch_history WHERE user_id = $1 ORDER BY tmdb_id, media_type, updated_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/history', authMiddleware, async (req, res) => {
  try {
    const { tmdb_id, media_type, title, poster_path, backdrop_path, season, episode, progress_seconds, duration_seconds } = req.body;
    await pool.query(
      `INSERT INTO watch_history (user_id, tmdb_id, media_type, title, poster_path, backdrop_path, season, episode, progress_seconds, duration_seconds, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (user_id, tmdb_id, media_type, season, episode)
       DO UPDATE SET progress_seconds = $9, duration_seconds = $10, updated_at = NOW()`,
      [req.user.id, tmdb_id, media_type || 'movie', title, poster_path, backdrop_path, season || 1, episode || 1, progress_seconds || 0, duration_seconds || 0]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/history/:tmdbId/:mediaType/:season/:episode', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM watch_history WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3 AND season = $4 AND episode = $5',
      [req.user.id, req.params.tmdbId, req.params.mediaType, req.params.season, req.params.episode]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Watchlist ---
router.get('/watchlist', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM watchlist WHERE user_id = $1 ORDER BY added_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/watchlist', authMiddleware, async (req, res) => {
  try {
    const { tmdb_id, media_type, title, poster_path } = req.body;
    await pool.query(
      `INSERT INTO watchlist (user_id, tmdb_id, media_type, title, poster_path)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING`,
      [req.user.id, tmdb_id, media_type || 'movie', title, poster_path]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/watchlist/:tmdbId/:mediaType', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM watchlist WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3',
      [req.user.id, req.params.tmdbId, req.params.mediaType]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
