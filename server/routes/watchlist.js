const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { profileId } = req.query;
    let watchlist;
    if (profileId) {
      [watchlist] = await pool.query('SELECT * FROM watchlist WHERE user_id = ? AND profile_id = ? ORDER BY added_at DESC', [decoded.userId, profileId]);
    } else {
      [watchlist] = await pool.query('SELECT * FROM watchlist WHERE user_id = ? ORDER BY added_at DESC', [decoded.userId]);
    }
    res.json({ watchlist });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { profileId, mediaId, mediaType, title, poster, progress, completed } = req.body;

    const [existing] = await pool.query('SELECT * FROM watchlist WHERE user_id = ? AND profile_id = ? AND media_id = ?', [decoded.userId, profileId, mediaId]);
    
    if (existing.length > 0) {
      await pool.query('UPDATE watchlist SET progress = ?, completed = ? WHERE id = ?', [
        progress || existing[0].progress, completed ? 1 : 0, existing[0].id
      ]);
      const [updated] = await pool.query('SELECT * FROM watchlist WHERE id = ?', [existing[0].id]);
      return res.json({ item: updated[0] });
    }

    const id = uuidv4();
    await pool.query('INSERT INTO watchlist (id, user_id, profile_id, media_id, media_type, title, poster, progress, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      id, decoded.userId, profileId, mediaId, mediaType, title, poster, progress || 0, completed ? 1 : 0
    ]);

    const [item] = await pool.query('SELECT * FROM watchlist WHERE id = ?', [id]);
    res.json({ item: item[0] });
  } catch (err) {
    console.error('Watchlist error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.delete('/:mediaId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { profileId } = req.query;
    if (profileId) {
      await pool.query('DELETE FROM watchlist WHERE user_id = ? AND profile_id = ? AND media_id = ?', [decoded.userId, profileId, req.params.mediaId]);
    } else {
      await pool.query('DELETE FROM watchlist WHERE user_id = ? AND media_id = ?', [decoded.userId, req.params.mediaId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;