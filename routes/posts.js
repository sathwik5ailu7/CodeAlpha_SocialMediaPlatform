const express = require('express');
const { getDB } = require('../db/setup');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET all posts (feed)
router.get('/', optionalAuth, (req, res) => {
  try {
    const db = getDB();
    const currentUserId = req.user ? req.user.id : 0;

    const posts = db.prepare(`
      SELECT 
        p.id, p.content, p.image, p.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all(currentUserId);

    res.json({ posts });
  } catch (err) {
    console.error('Fetch feed error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET single post with comments
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const db = getDB();
    const currentUserId = req.user ? req.user.id : 0;

    const post = db.prepare(`
      SELECT 
        p.id, p.content, p.image, p.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count,
        EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(currentUserId, req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comments = db.prepare(`
      SELECT 
        c.id, c.content, c.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
        EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(currentUserId, req.params.id);

    res.json({ post, comments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST new post
router.post('/', authenticateToken, (req, res) => {
  try {
    const { content, image } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }

    const db = getDB();
    const result = db.prepare(`
      INSERT INTO posts (user_id, content, image)
      VALUES (?, ?, ?)
    `).run(req.user.id, content.trim(), image ? image.trim() : '');

    const newPost = db.prepare(`
      SELECT 
        p.id, p.content, p.image, p.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        0 as likes_count, 0 as comments_count, 0 as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Post created', post: newPost });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// DELETE post
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST toggle like on post
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const postId = req.params.id;
    const userId = req.user.id;

    const existingLike = db.prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);

    let isLiked = false;
    if (existingLike) {
      db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      isLiked = true;
    }

    const { count } = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId);
    res.json({ isLiked, likesCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// POST add comment to post
router.post('/:id/comments', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const db = getDB();
    const result = db.prepare(`
      INSERT INTO comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.user.id, content.trim());

    const newComment = db.prepare(`
      SELECT 
        c.id, c.content, c.created_at,
        u.id as user_id, u.username, u.name, u.avatar,
        0 as likes_count, 0 as is_liked
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const { count } = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(req.params.id);

    res.status(201).json({ message: 'Comment added', comment: newComment, commentsCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// DELETE comment (only the author of the comment can delete)
router.delete('/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const comment = db.prepare('SELECT user_id, post_id FROM comments WHERE id = ?').get(req.params.commentId);

    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);

    const { count } = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').get(comment.post_id);

    res.json({ message: 'Comment deleted', commentsCount: count, postId: comment.post_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST toggle like on comment
router.post('/comments/:commentId/like', authenticateToken, (req, res) => {
  try {
    const db = getDB();
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const existingLike = db.prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?').get(commentId, userId);

    let isLiked = false;
    if (existingLike) {
      db.prepare('DELETE FROM comment_likes WHERE id = ?').run(existingLike.id);
      isLiked = false;
    } else {
      db.prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)').run(commentId, userId);
      isLiked = true;
    }

    const { count } = db.prepare('SELECT COUNT(*) as count FROM comment_likes WHERE comment_id = ?').get(commentId);
    res.json({ isLiked, likesCount: count });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment like status' });
  }
});

module.exports = router;
