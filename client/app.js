const socket = io();

// State
let currentUser = null;
let activeChatUser = null;
let token = localStorage.getItem('token');

// DOM Elements
const authView = document.getElementById('auth-view');
const chatView = document.getElementById('chat-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const usersList = document.getElementById('users-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const activeChatContainer = document.getElementById('active-chat-container');
const noChatSelected = document.getElementById('no-chat-selected');
const chatUsername = document.getElementById('chat-username');
const chatStatus = document.getElementById('chat-status');
const chatAvatar = document.getElementById('chat-avatar');
const myProfileTrigger = document.getElementById('my-profile-trigger');
const profileModal = document.getElementById('profile-modal');
const closeModal = document.querySelector('.close-modal');
const logoutBtn = document.getElementById('logout-btn');
const myAvatarThumb = document.getElementById('my-avatar-thumb');
const myUsernameDisplay = document.getElementById('my-username-display');
const editAvatarPreview = document.getElementById('edit-avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const saveProfileBtn = document.getElementById('save-profile-btn');
const editBio = document.getElementById('edit-bio');
const searchInput = document.getElementById('user-search');

// Initialization
function init() {
    if (token) {
        fetchCurrentUser();
    } else {
        showAuth();
    }
}

// Tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
    });
});

// Auth Logic
async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'x-auth-token': token }
        });
        if (res.ok) {
            currentUser = await res.json();
            showChat();
        } else {
            logout();
        }
    } catch (err) {
        logout();
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            currentUser = { _id: data.userId, username: data.username }; // Basic info until fetchCurrentUser
            fetchCurrentUser(); // Get full profile
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            fetchCurrentUser();
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error(err);
    }
});

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    showAuth();
    if (socket) socket.emit('disconnect'); // actually just reloading page is easier or let socket handle it
    location.reload();
}

logoutBtn.addEventListener('click', logout);

// View Switching
function showAuth() {
    authView.classList.remove('hidden');
    chatView.classList.add('hidden');
}

function showChat() {
    authView.classList.add('hidden');
    chatView.classList.remove('hidden');

    // Setup Profile
    myAvatarThumb.src = currentUser.avatar || 'https://via.placeholder.com/40';
    myUsernameDisplay.textContent = currentUser.username;

    // Register Socket
    socket.emit('register', currentUser._id);

    // Fetch Users
    fetchUsers();
}

// User List
let allUsers = [];

async function fetchUsers() {
    try {
        const res = await fetch('/api/users', {
            headers: { 'x-auth-token': token }
        });
        allUsers = await res.json();
        renderUsers(allUsers);
    } catch (err) {
        console.error(err);
    }
}

function renderUsers(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('div');
        li.className = `user-item ${activeChatUser && activeChatUser._id === user._id ? 'active' : ''}`;
        li.innerHTML = `
            <img src="${user.avatar || 'https://via.placeholder.com/40'}" class="avatar-thumb">
            <div class="user-info">
                <span class="user-name">${user.username}</span>
                <span class="user-status"><span class="status-dot ${user.isOnline ? 'online' : ''}"></span>${user.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            ${user.unread ? '<span class="badge">!</span>' : ''} 
        `;
        li.onclick = () => selectUser(user);
        usersList.appendChild(li);
    });
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => u.username.toLowerCase().includes(term));
    renderUsers(filtered);
});

// Chat Logic
async function selectUser(user) {
    activeChatUser = user;
    renderUsers(allUsers); // Re-render to highlight active

    noChatSelected.classList.add('hidden');
    activeChatContainer.classList.remove('hidden');

    chatUsername.textContent = user.username;
    chatAvatar.src = user.avatar || 'https://via.placeholder.com/40';
    chatStatus.textContent = user.isOnline ? 'Online' : 'Offline'; // In a real app, subscribe to status updates

    await fetchMessages(user._id);
}

async function fetchMessages(userId) {
    try {
        const res = await fetch(`/api/messages/${userId}`, {
            headers: { 'x-auth-token': token }
        });
        const messages = await res.json();
        renderMessages(messages);
    } catch (err) {
        console.error(err);
    }
}

function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        appendMessage(msg);
    });
    scrollToBottom();
}

function appendMessage(msg) {
    const div = document.createElement('div');
    const isSent = msg.sender === currentUser._id;
    div.className = `message ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = `
        ${msg.content}
        <span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    messagesContainer.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !activeChatUser) return;

    try {
        const res = await fetch(`/api/messages/${activeChatUser._id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({ content })
        });
        const msg = await res.json();
        appendMessage(msg); // Append locally
        messageInput.value = '';
    } catch (err) {
        console.error(err);
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Socket Events
socket.on('newMessage', (msg) => {
    if (activeChatUser && (msg.sender === activeChatUser._id || msg.sender === currentUser._id)) {
        // If chatting with this user, append
        if (msg.sender !== currentUser._id) { // Avoid double append if we sent it (handled by post response)
            appendMessage(msg);
        }
    } else {
        // Show notification or badge
        // update user list to show unread?
    }
});

socket.on('userStatus', ({ userId, status }) => {
    // Update local user list
    const user = allUsers.find(u => u._id === userId);
    if (user) {
        user.isOnline = status === 'online';
        renderUsers(allUsers);

        if (activeChatUser && activeChatUser._id === userId) {
            chatStatus.textContent = status === 'online' ? 'Online' : 'Offline';
        }
    }
});

// Profile Modal
myProfileTrigger.addEventListener('click', () => {
    profileModal.classList.remove('hidden');
    editBio.value = currentUser.bio || '';
    editAvatarPreview.src = currentUser.avatar || 'https://via.placeholder.com/100';
});

closeModal.addEventListener('click', () => {
    profileModal.classList.add('hidden');
});

// Avatar Upload Preview
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => editAvatarPreview.src = e.target.result;
        reader.readAsDataURL(file);
    }
});

// Save Profile
saveProfileBtn.addEventListener('click', async () => {
    const bio = editBio.value;
    const file = avatarInput.files[0];

    try {
        // Update Bio
        if (bio !== currentUser.bio) {
            await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ bio })
            });
            currentUser.bio = bio;
        }

        // Upload Avatar
        if (file) {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await fetch('/api/users/avatar', {
                method: 'POST',
                headers: { 'x-auth-token': token },
                body: formData
            });
            const data = await res.json();
            currentUser.avatar = data.avatar;
        }

        profileModal.classList.add('hidden');
        myAvatarThumb.src = currentUser.avatar;
        alert('Profile updated!');
    } catch (err) {
        console.error(err);
        alert('Error updating profile');
    }
});

// Start
init();
