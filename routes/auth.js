const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/setup');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'codealpha_social_secret_key_2024';

// Register
router.post('/register', (req, res) => {
  try {
    const { username, name, email, password, bio } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'Username, name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      return res.status(400).json({ error: 'Valid username required (letters, numbers, underscore)' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, cleanUsername);
    if (existing) {
      return res.status(409).json({ error: 'Email or username already in use' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    const result = db.prepare(`
      INSERT INTO users (username, name, email, password, bio, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cleanUsername, name.trim(), email.trim(), hashedPassword, bio || '', defaultAvatar);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username: cleanUsername, name: name.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: result.lastInsertRowid, username: cleanUsername, name: name.trim(), avatar: defaultAvatar }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(emailOrUsername, emailOrUsername);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare(`
      SELECT id, username, name, email, bio, avatar, created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts_count
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
