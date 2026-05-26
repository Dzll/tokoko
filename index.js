const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const PROMPT_PATH = path.join(__dirname, 'prompt.txt');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

let systemPrompt = fs.readFileSync(PROMPT_PATH, 'utf8');

function createModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });
}

let model = createModel();

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'tokoko-secret-default',
  resave: false,
  saveUninitialized: false,
}));

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login.html');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/admin', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard.html');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect('/admin/dashboard.html');
  }
  res.redirect('/admin/login.html?error=1');
});

app.get('/admin/dashboard.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/api/prompt', requireAdmin, (req, res) => {
  res.json({ prompt: systemPrompt });
});

app.post('/admin/update-prompt', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  systemPrompt = req.body.prompt;
  fs.writeFileSync(PROMPT_PATH, systemPrompt, 'utf8');
  model = createModel();
  res.redirect('/admin/dashboard.html');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login.html');
  });
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Pesan tidak boleh kosong.' });

  try {
    const result = await model.generateContent(message);
    const reply = result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Tokoko chatbot running at http://localhost:${port}`);
});
