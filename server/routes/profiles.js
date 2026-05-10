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
    const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [decoded.userId]);
    res.json({ profiles });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { name, avatar, color } = req.body;
    
    const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [decoded.userId]);
    if (profiles.length >= 5) return res.status(400).json({ error: 'Maximum 5 profiles allowed' });

    const id = uuidv4();
    await pool.query('INSERT INTO profiles (id, user_id, name, avatar, color) VALUES (?, ?, ?, ?, ?)', [
      id, decoded.userId, name || 'New Profile', avatar || 'default', color || '#e50914'
    ]);

    const [newProfile] = await pool.query('SELECT * FROM profiles WHERE id = ?', [id]);
    res.json({ profile: newProfile[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { name, avatar, color } = req.body;
    
    const [profiles] = await pool.query('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
    if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found' });

    await pool.query('UPDATE profiles SET name = ?, avatar = ?, color = ? WHERE id = ?', [
      name || profiles[0].name, avatar || profiles[0].avatar, color || profiles[0].color, req.params.id
    ]);

    const [updated] = await pool.query('SELECT * FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ profile: updated[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.delete('/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    await pool.query('DELETE FROM profiles WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;