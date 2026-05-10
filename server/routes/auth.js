const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = users[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    await pool.query('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)', [id, email, hashedPassword, name || '']);
    
    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
    res.json({ token, user: { id, email, name: name || '' } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: !!user.is_admin } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const [users] = await pool.query('SELECT id, email, name, is_admin FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { currentPassword, newPassword } = req.body;
    
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    if (!(await bcrypt.compare(currentPassword, users[0].password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.userId]);
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC');
    const [profiles] = await pool.query('SELECT user_id, COUNT(*) as profile_count FROM profiles GROUP BY user_id');
    
    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user_id] = p.profile_count; });
    
    const usersWithProfiles = users.map(u => ({
      ...u,
      profile_count: profileMap[u.id] || 0
    }));
    
    res.json({ users: usersWithProfiles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', adminAuth, async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    await pool.query('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)', [id, email, hashedPassword, name || '']);
    
    const [newUser] = await pool.query('SELECT id, email, name, is_admin, created_at FROM users WHERE id = ?', [id]);
    res.json({ user: newUser[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id/password', adminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password required' });
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;