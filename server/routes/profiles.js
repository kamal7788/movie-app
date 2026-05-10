const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

router.get('/', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const profiles = db.get('profiles').filter({ userId: decoded.userId }).value();
    res.json({ profiles });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { name, avatar, color } = req.body;
    
    const profiles = db.get('profiles').filter({ userId: decoded.userId }).value();
    if (profiles.length >= 5) return res.status(400).json({ error: 'Max 5 profiles allowed' });

    const profile = {
      id: uuidv4(),
      userId: decoded.userId,
      name: name || 'New Profile',
      avatar: avatar || 'default',
      color: color || '#e50914',
      createdAt: new Date()
    };

    db.get('profiles').push(profile).write();
    res.json({ profile });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { name, avatar, color } = req.body;
    
    const profile = db.get('profiles').find({ id: req.params.id, userId: decoded.userId }).value();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    db.get('profiles').find({ id: req.params.id })
      .assign({ name: name || profile.name, avatar: avatar || profile.avatar, color: color || profile.color })
      .write();

    res.json({ profile: db.get('profiles').find({ id: req.params.id }).value() });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.delete('/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    db.get('profiles').remove({ id: req.params.id, userId: decoded.userId }).write();
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;