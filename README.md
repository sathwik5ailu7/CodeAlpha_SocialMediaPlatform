# Pulse — Social Media Platform

A full-stack social media application built for the **CodeAlpha Full Stack Development Internship** (Task 2).

## 🚀 Features

- **User Authentication:** Secure JWT & bcrypt-based user registration and login.
- **Dynamic Feed:** Real-time updates with posts containing text and optional image URLs.
- **Like System:** Interactive like/unlike functionality with live counters.
- **Nested Comments:** Add, read, and track comments on every post.
- **Follow/Unfollow Network:** Follow your favorite creators with live follower/following counts.
- **User Profiles:** Full profile view with user avatars, bios, custom statistics, and profile editing.
- **Creator Search:** Search users across the platform in real-time.

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (Modern Responsive Flexbox/Grid), JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite (using `better-sqlite3` for high performance)
- **Security:** JSON Web Tokens (JWT), bcrypt password hashing

## 📦 Local Installation & Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd CodeAlpha_SocialMediaPlatform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Seed sample database:**
   ```bash
   npm run seed
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   Navigate to [http://localhost:5000](http://localhost:5000)

## 🔑 Demo Accounts

You can test with these pre-seeded accounts:
- **Username / Email:** `sathwik` or `sathwik@example.com` | **Password:** `demo123`
- **Username / Email:** `ananya_dev` or `ananya@example.com` | **Password:** `demo123`
- Or click **Sign Up** to create your own brand new creator profile!

## 📝 License
MIT
