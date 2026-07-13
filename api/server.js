const express = require('express');
const path = require('path');
const app = express();

// Increase parsing limits to handle custom base64 uploaded images seamlessly
app.use(express.json({ limit: '10mb' }));

// FIXED: Serve static assets correctly from the root-level public folder relative to /api
app.use(express.static(path.join(__dirname, '../public')));

// Persistent Mock Databases (In-Memory per cold start)
let users = [
    { username: "archit_codes", email: "archit@gmail.com", password: "password123", name: "Archit", bio: "Building dynamic software ecosystems 🚀", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", followers: ["nature_pixel"], following: ["design_studio"] },
    { username: "nature_pixel", email: "elena@gmail.com", password: "password123", name: "Elena Rostova", bio: "Landscape photographer 🌲📷", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", followers: ["archit_codes"], following: ["archit_codes"] },
    { username: "design_studio", email: "studio@gmail.com", password: "password123", name: "Studio Core", bio: "Minimalist spaces & clean interfaces.", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", followers: ["archit_codes"], following: [] }
];

let posts = [
    { id: "post_1", username: "nature_pixel", img: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800", caption: "Wandering through deep emerald paths. 🌲🍂", likes: ["archit_codes"], comments: [{ username: "archit_codes", text: "Stunning lighting control here!" }], timestamp: "2 hours ago" },
    { id: "post_2", username: "archit_codes", img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800", caption: "Engineering foundation nodes. 💻🔥", likes: ["nature_pixel"], comments: [], timestamp: "5 hours ago" }
];

let stories = [
    { username: "nature_pixel", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", content: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800" },
    { username: "design_studio", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150", content: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800" }
];

// --- AUTHENTICATION API ENDPOINTS ---

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: "All fields are required." });
    
    const formattedUser = username.toLowerCase().trim();
    if (users.find(u => u.username === formattedUser || u.email === email)) {
        return res.status(400).json({ success: false, message: "Username or Email already taken." });
    }

    users.push({
        username: formattedUser,
        email,
        password,
        name: username,
        bio: "Hello, I am new to Archgram!",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
        followers: [],
        following: []
    });
    return res.status(201).json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const formattedUser = username.toLowerCase().trim();
    const user = users.find(u => u.username === formattedUser && u.password === password);

    if (!user) return res.status(400).json({ success: false, message: "Invalid login credentials." });
    return res.json({ success: true, user: { username: user.username, email: user.email } });
});

// --- SOCIAL FEED CORE API ENDPOINTS ---

app.post('/api/user-context', (req, res) => {
    const user = users.find(u => u.username === req.body.username);
    if (!user) return res.status(404).json({ error: "Session expired." });
    res.json(user);
});

app.get('/api/posts', (req, res) => res.json(posts));
app.get('/api/stories', (req, res) => res.json(stories));

app.post('/api/posts', (req, res) => {
    const { img, caption, username } = req.body;
    if(!img || !caption || !username) return res.status(400).json({ error: "Missing required properties." });
    
    const newPost = { id: "post_" + Date.now(), username, img, caption, likes: [], comments: [], timestamp: "Just now" };
    posts.unshift(newPost);
    res.status(201).json(newPost);
});

app.post('/api/posts/:id/like', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    const { username } = req.body;
    if(!post) return res.status(404).json({ error: "Post missing." });
    
    const index = post.likes.indexOf(username);
    if(index === -1) post.likes.push(username);
    else post.likes.splice(index, 1);
    res.json({ likes: post.likes });
});

app.post('/api/posts/:id/comment', (req, res) => {
    const post = posts.find(p => p.id === req.params.id);
    const { username, text } = req.body;
    if(!post || !text) return res.status(400).json({ error: "Bad parameters request." });
    
    const c = { username, text };
    post.comments.push(c);
    res.status(201).json(c);
});

app.get('/api/users/:username', (req, res) => {
    const u = users.find(x => x.username === req.params.username);
    if(!u) return res.status(404).json({ error: "Not found." });
    res.json({ user: u, posts: posts.filter(p => p.username === req.params.username) });
});

app.post('/api/users/:username/follow', (req, res) => {
    const target = users.find(u => u.username === req.params.username);
    const me = users.find(u => u.username === req.body.myUsername);
    const index = me.following.indexOf(target.username);
    if(index === -1) { me.following.push(target.username); target.followers.push(me.username); }
    else { me.following.splice(index, 1); target.followers.splice(target.followers.indexOf(me.username), 1); }
    res.json({ followers: target.followers, following: me.following });
});

app.post('/api/profile/update', (req, res) => {
    const me = users.find(u => u.username === req.body.myUsername);
    const { name, bio, avatar } = req.body;
    if(name) me.name = name;
    if(bio) me.bio = bio;
    if(avatar) me.avatar = avatar;
    res.json({ success: true, user: me });
});

// FIXED: Adjust path to look up one level into the public directory for serverless deployment
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// FIXED: Export the express application instead of using app.listen() for Vercel functions
module.exports = app;
