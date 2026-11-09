// Pulse Profile Page Logic

document.addEventListener('DOMContentLoaded', () => {
  syncNavbarUser();
  setupUserSearch();

  const urlParams = new URLSearchParams(window.location.search);
  const loggedInUser = getUser();
  const targetUsername = urlParams.get('u') || (loggedInUser ? loggedInUser.username : null);

  if (!targetUsername) {
    window.location.href = '/login.html';
    return;
  }

  const profileAvatar = document.getElementById('profileAvatar');
  const profileFullName = document.getElementById('profileFullName');
  const profileHandle = document.getElementById('profileHandle');
  const profileBio = document.getElementById('profileBio');
  const statPosts = document.getElementById('statPosts');
  const statFollowers = document.getElementById('statFollowers');
  const statFollowing = document.getElementById('statFollowing');
  const profileActionContainer = document.getElementById('profileActionContainer');
  const userPostsStream = document.getElementById('userPostsStream');

  // Edit Modal elements
  const editProfileModal = document.getElementById('editProfileModal');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  const editProfileForm = document.getElementById('editProfileForm');
  const editNameInput = document.getElementById('editNameInput');
  const editBioInput = document.getElementById('editBioInput');
  const editAvatarInput = document.getElementById('editAvatarInput');

  let profileData = null;

  async function loadProfile() {
    try {
      const res = await api(`/api/users/${targetUsername}`);
      profileData = res.user;

      document.title = `${profileData.name} (@${profileData.username}) — Pulse`;
      profileAvatar.src = profileData.avatar;
      profileFullName.textContent = profileData.name;
      profileHandle.textContent = `@${profileData.username}`;
      profileBio.textContent = profileData.bio || 'No bio yet.';
      statPosts.textContent = profileData.posts_count;
      statFollowers.textContent = profileData.followers_count;
      statFollowing.textContent = profileData.following_count;

      // Determine Action Button (Edit Profile if self, Follow/Unfollow if other)
      const isSelf = loggedInUser && loggedInUser.username === profileData.username;
      if (isSelf) {
        profileActionContainer.innerHTML = `
          <button class="btn btn-outline" id="openEditBtn">
            <i class="fas fa-edit"></i> Edit Profile
          </button>
        `;
        document.getElementById('openEditBtn').addEventListener('click', openEditModal);
      } else {
        profileActionContainer.innerHTML = `
          <button class="btn ${profileData.is_following ? 'btn-outline' : 'btn-primary'}" id="followBtn">
            <i class="fas ${profileData.is_following ? 'fa-user-check' : 'fa-user-plus'}"></i>
            <span>${profileData.is_following ? 'Following' : 'Follow'}</span>
          </button>
        `;
        document.getElementById('followBtn').addEventListener('click', toggleFollow);
      }

      // Render Posts
      if (res.posts.length === 0) {
        userPostsStream.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No posts shared by this creator yet.</div>';
      } else {
        userPostsStream.innerHTML = res.posts.map(post => renderPostCard(post)).join('');
      }
    } catch (err) {
      userPostsStream.innerHTML = `<div style="color:#ef4444; padding:20px;">User not found or error loading profile.</div>`;
    }
  }

  // Toggle Follow
  async function toggleFollow() {
    if (!getToken()) {
      showToast('Please log in to follow creators', 'error');
      setTimeout(() => window.location.href = '/login.html', 1000);
      return;
    }

    try {
      const res = await api(`/api/users/${profileData.id}/follow`, { method: 'POST' });
      statFollowers.textContent = res.followersCount;
      const btn = document.getElementById('followBtn');
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');

      if (res.isFollowing) {
        btn.className = 'btn btn-outline';
        icon.className = 'fas fa-user-check';
        text.textContent = 'Following';
        showToast(`Now following @${profileData.username}`, 'success');
      } else {
        btn.className = 'btn btn-primary';
        icon.className = 'fas fa-user-plus';
        text.textContent = 'Follow';
        showToast(`Unfollowed @${profileData.username}`, 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // Edit Modal Handling
  function openEditModal() {
    editNameInput.value = profileData.name;
    editBioInput.value = profileData.bio || '';
    editAvatarInput.value = profileData.avatar || '';
    editProfileModal.classList.remove('hidden');
  }

  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', () => {
      editProfileModal.classList.add('hidden');
    });
  }

  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await api('/api/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            name: editNameInput.value.trim(),
            bio: editBioInput.value.trim(),
            avatar: editAvatarInput.value.trim() || profileData.avatar
          })
        });

        // Update local session
        const stored = getUser();
        stored.name = res.user.name;
        stored.avatar = res.user.avatar;
        localStorage.setItem('user', JSON.stringify(stored));

        showToast('Profile updated!', 'success');
        editProfileModal.classList.add('hidden');
        loadProfile();
        syncNavbarUser();
      } catch (err) {
        showToast(err.message || 'Failed to update profile', 'error');
      }
    });
  }

  loadProfile();
});
