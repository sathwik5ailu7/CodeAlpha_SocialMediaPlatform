const { getDB, initDB } = require('./setup');
const bcrypt = require('bcryptjs');

function seedDB() {
  initDB();
  const db = getDB();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('Database already seeded.');
    return;
  }

  const hashPassword = (pw) => bcrypt.hashSync(pw, 10);

  // Seed Users
  const users = [
    ['alex_dev', 'Alex Morgan', 'alex@example.com', hashPassword('demo123'), 'Full Stack Developer & Tech Enthusiast 💻 Exploring the frontiers of web dev!', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'],
    ['ananya_dev', 'Ananya Sharma', 'ananya@example.com', hashPassword('demo123'), 'Frontend artisan | React & UI/UX lover 🎨 Coffee over everything ☕', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'],
    ['rahul_tech', 'Rahul Verma', 'rahul@example.com', hashPassword('demo123'), 'Building open source projects 🚀 AI & Cloud engineering.', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200'],
    ['priya_codes', 'Priya Patel', 'priya@example.com', hashPassword('demo123'), 'Software Engineer @ Bengaluru. Bookworm 📚 & traveler ✈️', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200']
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (username, name, email, password, bio, avatar)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const userIds = [];
  users.forEach(u => {
    const res = insertUser.run(...u);
    userIds.push(res.lastInsertRowid);
  });

  // Seed Follows
  const insertFollow = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
  insertFollow.run(userIds[0], userIds[1]); // alex follows ananya
  insertFollow.run(userIds[0], userIds[2]); // alex follows rahul
  insertFollow.run(userIds[1], userIds[0]); // ananya follows alex
  insertFollow.run(userIds[2], userIds[0]); // rahul follows alex
  insertFollow.run(userIds[3], userIds[0]); // priya follows alex
  insertFollow.run(userIds[3], userIds[1]); // priya follows ananya

  // Seed Posts
  const insertPost = db.prepare('INSERT INTO posts (user_id, content, image) VALUES (?, ?, ?)');
  const p1 = insertPost.run(userIds[0], 'Super excited to start working on the CodeAlpha internship tasks! Full stack web development is truly thrilling when you build both client and server from scratch. 🔥🚀', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800');
  const p2 = insertPost.run(userIds[1], 'Sunday workspace vibes ✨ Keep coding, stay inspired, and never stop learning new frameworks.', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800');
  const p3 = insertPost.run(userIds[2], 'Just deployed a new microservice! SQLite + Express makes prototyping lightning fast ⚡ What is your go-to lightweight stack?', '');
  const p4 = insertPost.run(userIds[3], 'Morning view from the tech summit today in Bengaluru! Great conversations on the future of generative UI and developer tooling. 🌇', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800');

  // Seed Comments
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  insertComment.run(p1.lastInsertRowid, userIds[1], 'All the best Alex! You got this! 💪');
  insertComment.run(p1.lastInsertRowid, userIds[2], 'Great job! Keep us posted with your progress.');
  insertComment.run(p2.lastInsertRowid, userIds[0], 'Love the setup aesthetics Ananya! ✨');
  insertComment.run(p3.lastInsertRowid, userIds[0], 'Totally agree, SQLite + Node is a beast for prototypes!');

  // Seed Likes
  const insertLike = db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)');
  insertLike.run(p1.lastInsertRowid, userIds[1]);
  insertLike.run(p1.lastInsertRowid, userIds[2]);
  insertLike.run(p1.lastInsertRowid, userIds[3]);
  insertLike.run(p2.lastInsertRowid, userIds[0]);
  insertLike.run(p2.lastInsertRowid, userIds[2]);
  insertLike.run(p3.lastInsertRowid, userIds[0]);
  insertLike.run(p4.lastInsertRowid, userIds[0]);
  insertLike.run(p4.lastInsertRowid, userIds[1]);

  console.log('✅ Database seeded with users, posts, comments, likes, and follows!');
  console.log('   Demo login: alex@example.com / demo123 (or ananya@example.com / demo123)');
}

seedDB();
