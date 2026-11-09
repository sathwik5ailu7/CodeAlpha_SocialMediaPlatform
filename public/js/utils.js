// Pulse Social Media Utilities

const API_BASE = '';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

// User Search logic in header
function setupUserSearch() {
  const searchInput = document.getElementById('userSearchInput');
  const dropdown = document.getElementById('searchDropdown');
  if (!searchInput || !dropdown) return;

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();
    if (!q) {
      dropdown.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await api(`/api/users/search/all?q=${encodeURIComponent(q)}`);
        if (res.users.length === 0) {
          dropdown.innerHTML = '<div style="padding:10px; font-size:0.85rem; color:#64748b;">No creators found</div>';
        } else {
          dropdown.innerHTML = res.users.map(u => `
            <a href="/profile.html?u=${u.username}" class="search-result-item">
              <img src="${u.avatar}" alt="avatar">
              <div>
                <strong>${u.name}</strong>
                <div style="font-size:0.75rem; color:#64748b;">@${u.username}</div>
              </div>
            </a>
          `).join('');
        }
        dropdown.classList.add('active');
      } catch (err) {
        console.error(err);
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

// Common navbar sync
function syncNavbarUser() {
  const user = getUser();
  const authLinks = document.getElementById('authLinks');
  const userMenu = document.getElementById('userMenu');
  const navAvatar = document.getElementById('navAvatar');
  const navUsername = document.getElementById('navUsername');
  const myProfileLink = document.getElementById('myProfileLink');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    if (authLinks) authLinks.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (navAvatar) navAvatar.src = user.avatar;
    if (navUsername) navUsername.textContent = user.name.split(' ')[0];
    if (myProfileLink) myProfileLink.href = `/profile.html?u=${user.username}`;
  } else {
    if (authLinks) authLinks.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}
