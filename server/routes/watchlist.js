const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

router.get('/', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const watchlist = db.get('watchlist').filter({ userId: decoded.userId, profileId: req.query.profileId }).value();
    res.json({ watchlist });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { profileId, mediaId, mediaType, title, poster, progress, completed } = req.body;

    const existing = db.get('watchlist').find({ userId: decoded.userId, profileId, mediaId }).value();
    if (existing) {
      db.get('watchlist').find({ userId: decoded.userId, profileId, mediaId })
        .assign({ progress, completed, updatedAt: new Date() })
        .write();
      return res.json({ item: db.get('watchlist').find({ userId: decoded.userId, profileId, mediaId }).value() });
    }

    const item = {
      id: require('uuid').v4(),
      userId: decoded.userId,
      profileId,
      mediaId,
      mediaType,
      title,
      poster,
      progress: progress || 0,
      completed: completed || false,
      addedAt: new Date(),
      updatedAt: new Date()
    };

    db.get('watchlist').push(item).write();
    res.json({ item });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.delete('/:mediaId', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { profileId } = req.query;
    db.get('watchlist').remove({ userId: decoded.userId, profileId, mediaId: req.params.mediaId }).write();
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;