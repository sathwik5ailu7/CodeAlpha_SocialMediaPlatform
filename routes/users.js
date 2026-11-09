const express = require('express');
const { getDB } = require('../db/setup');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET profile by username
router.get('/:username', optionalAuth, (req, res) => {
  try {
    const db = getDB();
    const currentUserId = req.user ? req.user.id : 0;

    const user = db.prepare(`
      SELECT id, username, name, bio, avatar, created_at,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts_count,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = users.id) as is_following
      FROM users
      WHERE username = ?
    `).get(currentUserId, req.params.username);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's posts
    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.image, p.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `).all(currentUserId, user.id);

    res.json({ user, posts });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// UPDATE profile (name, bio, avatar)
router.put('/me', authenticateToken, (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    const db = getDB();
    db.prepare(`
      UPDATE users 
      SET name = ?, bio = ?, avatar = ?
      WHERE id = ?
    `).run(name.trim(), bio || '', avatar || '', req.user.id);

    const updatedUser = db.prepare('SELECT id, username, name, email, bio, avatar FROM users WHERE id = ?').get(req.user.id);

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', authenticateToken, (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const followerId = req.user.id;

    if (targetUserId === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const db = getDB();
    const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, targetUserId);

    let isFollowing = false;
    if (existing) {
      db.prepare('DELETE FROM follows WHERE id = ?').run(existing.id);
      isFollowing = false;
    } else {
      db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(followerId, targetUserId);
      isFollowing = true;
    }

    const { count } = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(targetUserId);

    res.json({ isFollowing, followersCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update follow status' });
  }
});

// Search users
router.get('/search/all', (req, res) => {
  try {
    const query = req.query.q || '';
    const db = getDB();
    const users = db.prepare(`
      SELECT id, username, name, bio, avatar
      FROM users
      WHERE username LIKE ? OR name LIKE ?
      LIMIT 10
    `).all(`%${query}%`, `%${query}%`);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
