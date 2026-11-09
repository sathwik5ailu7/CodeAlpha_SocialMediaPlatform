// Pulse Feed & Post Logic

document.addEventListener('DOMContentLoaded', () => {
  syncNavbarUser();
  setupUserSearch();

  const user = getUser();
  const postsStream = document.getElementById('postsStream');
  const postContent = document.getElementById('postContent');
  const publishPostBtn = document.getElementById('publishPostBtn');
  const addImageUrlBtn = document.getElementById('addImageUrlBtn');
  const urlInputBar = document.getElementById('urlInputBar');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const applyImageUrlBtn = document.getElementById('applyImageUrlBtn');
  const cancelImageUrlBtn = document.getElementById('cancelImageUrlBtn');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const refreshFeedBtn = document.getElementById('refreshFeedBtn');

  let currentPostImageUrl = '';

  // Mini profile card on left
  const miniProfileCard = document.getElementById('miniProfileCard');
  const profileSidebarLink = document.getElementById('profileSidebarLink');

  if (user && miniProfileCard) {
    if (profileSidebarLink) profileSidebarLink.href = `/profile.html?u=${user.username}`;
    const createPostAvatar = document.getElementById('createPostAvatar');
    if (createPostAvatar) createPostAvatar.src = user.avatar;

    // Load mini stats
    api('/api/auth/me').then(res => {
      const u = res.user;
      miniProfileCard.innerHTML = `
        <a href="/profile.html?u=${u.username}">
          <img src="${u.avatar}" alt="Avatar">
          <h4>${u.name}</h4>
          <div class="handle">@${u.username}</div>
        </a>
        <div class="mini-stats">
          <div class="mini-stat">
            <strong>${u.posts_count}</strong>
            <span>Posts</span>
          </div>
          <div class="mini-stat">
            <strong>${u.followers_count}</strong>
            <span>Followers</span>
          </div>
          <div class="mini-stat">
            <strong>${u.following_count}</strong>
            <span>Following</span>
          </div>
        </div>
      `;
    }).catch(() => {});
  } else if (miniProfileCard) {
    miniProfileCard.innerHTML = `
      <h4>Welcome to Pulse</h4>
      <p style="font-size:0.85rem; color:#64748b; margin:10px 0;">Sign in to create posts, like, and follow other creators.</p>
      <a href="/login.html" class="btn btn-primary btn-block btn-sm">Log In</a>
    `;
    if (profileSidebarLink) profileSidebarLink.href = '/login.html';
  }

  // Load Feed
  async function loadFeed() {
    if (!postsStream) return;
    try {
      const res = await api('/api/posts');
      if (res.posts.length === 0) {
        postsStream.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No posts yet. Be the first to share something!</div>';
        return;
      }
      postsStream.innerHTML = res.posts.map(post => renderPostCard(post)).join('');
    } catch (err) {
      postsStream.innerHTML = `<div style="color:#ef4444; padding:20px;">Failed to load posts: ${err.message}</div>`;
    }
  }

  // Render Post Card
  window.renderPostCard = function(post) {
    const isOwner = user && user.id === post.user_id;

    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-header">
          <a href="/profile.html?u=${post.username}" class="post-author">
            <img src="${post.avatar}" alt="${post.username}">
            <div class="post-author-info">
              <h4>${post.name}</h4>
              <div class="handle">@${post.username}</div>
            </div>
          </a>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="post-time">${timeAgo(post.created_at)}</span>
            ${isOwner ? `
              <button class="btn-icon" onclick="deletePost(${post.id})" title="Delete Post">
                <i class="fas fa-trash" style="font-size:0.85rem; color:#ef4444;"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div class="post-content">${escapeHTML(post.content)}</div>

        ${post.image ? `
          <div class="post-image">
            <img src="${post.image}" alt="Post image" loading="lazy">
          </div>
        ` : ''}

        <div class="post-actions">
          <button class="action-btn ${post.is_liked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike(${post.id})">
            <i class="${post.is_liked ? 'fas' : 'far'} fa-heart"></i>
            <span id="like-count-${post.id}">${post.likes_count}</span>
          </button>

          <button class="action-btn" onclick="toggleComments(${post.id})">
            <i class="far fa-comment"></i>
            <span id="comment-count-${post.id}">${post.comments_count}</span>
          </button>
        </div>

        <!-- Comments Container -->
        <div class="comments-section hidden" id="comments-section-${post.id}">
          <div class="comment-input-box">
            <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key==='Enter') submitComment(${post.id})">
            <button class="btn btn-primary btn-sm" onclick="submitComment(${post.id})">Send</button>
          </div>
          <div class="comments-list" id="comments-list-${post.id}">
            <div style="font-size:0.8rem; color:#64748b;">Loading comments...</div>
          </div>
        </div>
      </div>
    `;
  };

  // Helper: Escape HTML
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Toggle Like
  window.toggleLike = async function(postId) {
    if (!getToken()) {
      showToast('Please log in to like posts', 'error');
      return;
    }

    try {
      const res = await api(`/api/posts/${postId}/like`, { method: 'POST' });
      const btn = document.getElementById(`like-btn-${postId}`);
      const count = document.getElementById(`like-count-${postId}`);
      const icon = btn.querySelector('i');

      if (res.isLiked) {
        btn.classList.add('liked');
        icon.className = 'fas fa-heart';
      } else {
        btn.classList.remove('liked');
        icon.className = 'far fa-heart';
      }
      count.textContent = res.likesCount;
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle Comments & Load
  window.toggleComments = async function(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    const list = document.getElementById(`comments-list-${postId}`);
    const isHidden = section.classList.contains('hidden');

    if (isHidden) {
      section.classList.remove('hidden');
      try {
        const res = await api(`/api/posts/${postId}`);
        if (res.comments.length === 0) {
          list.innerHTML = '<div style="font-size:0.85rem; color:#64748b; padding:4px 0;">No comments yet. Write the first one!</div>';
        } else {
          list.innerHTML = res.comments.map(c => `
            <div class="comment-item">
              <a href="/profile.html?u=${c.username}">
                <img src="${c.avatar}" alt="${c.username}">
              </a>
              <div class="comment-bubble">
                <a href="/profile.html?u=${c.username}"><strong>${c.name}</strong></a>
                <span style="font-size:0.75rem; color:#94a3b8; margin-left:6px;">${timeAgo(c.created_at)}</span>
                <p>${escapeHTML(c.content)}</p>
              </div>
            </div>
          `).join('');
        }
      } catch (err) {
        list.innerHTML = `<div style="color:#ef4444;">Failed to load comments</div>`;
      }
    } else {
      section.classList.add('hidden');
    }
  };

  // Submit Comment
  window.submitComment = async function(postId) {
    if (!getToken()) {
      showToast('Please log in to leave comments', 'error');
      return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    try {
      const res = await api(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });

      input.value = '';
      const list = document.getElementById(`comments-list-${postId}`);
      const countEl = document.getElementById(`comment-count-${postId}`);
      countEl.textContent = res.commentsCount;

      const newCommentHTML = `
        <div class="comment-item">
          <a href="/profile.html?u=${res.comment.username}">
            <img src="${res.comment.avatar}" alt="${res.comment.username}">
          </a>
          <div class="comment-bubble">
            <a href="/profile.html?u=${res.comment.username}"><strong>${res.comment.name}</strong></a>
            <span style="font-size:0.75rem; color:#94a3b8; margin-left:6px;">just now</span>
            <p>${escapeHTML(res.comment.content)}</p>
          </div>
        </div>
      `;

      if (list.innerHTML.includes('No comments yet')) {
        list.innerHTML = newCommentHTML;
      } else {
        list.insertAdjacentHTML('beforeend', newCommentHTML);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Post
  window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await api(`/api/posts/${postId}`, { method: 'DELETE' });
      const el = document.getElementById(`post-${postId}`);
      if (el) el.remove();
      showToast('Post deleted', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Image URL Controls
  if (addImageUrlBtn) {
    addImageUrlBtn.addEventListener('click', () => {
      urlInputBar.classList.toggle('hidden');
      imageUrlInput.focus();
    });

    applyImageUrlBtn.addEventListener('click', () => {
      const val = imageUrlInput.value.trim();
      if (val) {
        currentPostImageUrl = val;
        imagePreview.src = val;
        imagePreviewContainer.classList.remove('hidden');
        urlInputBar.classList.add('hidden');
      }
    });

    cancelImageUrlBtn.addEventListener('click', () => {
      urlInputBar.classList.add('hidden');
    });

    removeImageBtn.addEventListener('click', () => {
      currentPostImageUrl = '';
      imagePreview.src = '';
      imagePreviewContainer.classList.add('hidden');
    });
  }

  // Publish Post
  if (publishPostBtn) {
    publishPostBtn.addEventListener('click', async () => {
      if (!getToken()) {
        showToast('Please log in to publish a post', 'error');
        setTimeout(() => window.location.href = '/login.html', 1000);
        return;
      }

      const content = postContent.value.trim();
      if (!content) {
        showToast('Please enter what you want to share', 'error');
        return;
      }

      publishPostBtn.disabled = true;
      publishPostBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

      try {
        const res = await api('/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            content,
            image: currentPostImageUrl
          })
        });

        postContent.value = '';
        currentPostImageUrl = '';
        imagePreviewContainer.classList.add('hidden');
        showToast('Post published! 🚀', 'success');
        
        // Prepend new post
        postsStream.insertAdjacentHTML('afterbegin', renderPostCard(res.post));
      } catch (err) {
        showToast(err.message || 'Failed to post', 'error');
      } finally {
        publishPostBtn.disabled = false;
        publishPostBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post';
      }
    });
  }

  if (refreshFeedBtn) {
    refreshFeedBtn.addEventListener('click', () => {
      loadFeed();
      showToast('Feed refreshed', 'info');
    });
  }

  // Load Suggested Users in right sidebar
  async function loadSuggested() {
    const container = document.getElementById('suggestedUsers');
    if (!container) return;
    try {
      const res = await api('/api/users/search/all');
      const filtered = user ? res.users.filter(u => u.id !== user.id) : res.users;
      if (filtered.length === 0) {
        container.innerHTML = '<div style="font-size:0.85rem; color:#64748b;">No suggestions right now</div>';
        return;
      }

      container.innerHTML = filtered.slice(0, 4).map(u => `
        <div class="suggested-user-row">
          <a href="/profile.html?u=${u.username}" class="suggested-user-info">
            <img src="${u.avatar}" alt="${u.username}">
            <div>
              <strong style="font-size:0.9rem; display:block;">${u.name}</strong>
              <span style="font-size:0.75rem; color:#64748b;">@${u.username}</span>
            </div>
          </a>
          <a href="/profile.html?u=${u.username}" class="btn btn-outline btn-sm">View</a>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = '';
    }
  }

  loadFeed();
  loadSuggested();
});
