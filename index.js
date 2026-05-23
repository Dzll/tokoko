const express = require('express');
const session = require('express-session');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

let systemPrompt = `Kamu adalah asisten virtual Tokoko, sebuah toko sembako (toko kelontong) yang menjual berbagai kebutuhan pokok sehari-hari.

INFORMASI TOKO:
- Nama: Tokoko
- Jam buka: Senin - Sabtu 07:00 - 21:00, Minggu 08:00 - 18:00
- Lokasi: Jl. Merdeka No. 123, Jakarta
- Telepon: 021-12345678
- Melayani: Pembelian langsung di toko, dan delivery via Gojek/Grab (ongkir ditanggung pembeli) dengan minimum belanja Rp50.000
- Pembayaran: Tunai, QRIS, transfer bank (BCA/Mandiri/BNI)

DAFTAR PRODUK DAN HARGA:
Beras:
- Beras Premium 5kg - Rp68.000
- Beras Medium 5kg - Rp58.000
- Beras Merah 3kg - Rp45.000

Minyak:
- Minyak Goreng Sania 2L - Rp32.000
- Minyak Goreng Filma 2L - Rp34.000
- Minyak Goreng Bimoli 2L - Rp36.000

Gula:
- Gula Pasir Gulaku 1kg - Rp16.000
- Gula Pasir Lokal 1kg - Rp14.000

Telur:
- Telur Ayam Negeri 1kg - Rp28.000
- Telur Ayam Kampung 1kg - Rp45.000

Tepung:
- Tepung Terigu Segitiga Biru 1kg - Rp12.000
- Tepung Terigu Kunci Biru 1kg - Rp11.000
- Tepung Beras Rose Brand 500g - Rp9.000

Mie Instan:
- Indomie Goreng per bungkus - Rp3.500
- Indomie Kuah per bungkus - Rp3.500
- Mie Sedap per bungkus - Rp3.500

Minuman:
- Susu Kental Manis Frisian Flag 370g - Rp12.000
- Susu Kental Manis Indomilk 370g - Rp11.000
- Teh Botol Sosro 350ml - Rp5.000
- Air Mineral Aqua 600ml - Rp3.500
- Kopi Kapal Api 250g - Rp22.000

Sembako Lainnya:
- Garam Dolpin 250g - Rp3.000
- Kecap Manis Bango 520ml - Rp15.000
- Saos Sambal Indofood 330ml - Rp12.000
- Sabun Mandi Lifebuoy 75g - Rp4.500
- Shampoo Clear 70ml - Rp5.000
- Pasta Gigi Pepsodent 75g - Rp7.000

CARA BERTANGGUNG JAWAB:
1. Jika ditanya produk yang tidak ada di daftar, katakan dengan sopan bahwa produk tersebut sedang tidak tersedia
2. Jika ditanya soal stok, katakan stok tersedia (kecuali disebutkan habis)
3. Jawab dengan ramah, sopan, dan singkat seperti penjaga toko
4. Gunakan bahasa Indonesia sehari-hari yang santun
5. Jika ditanya harga, sebutkan harga terbaru
6. Berikan rekomendasi produk bila diminta
7. Jangan membahas topik di luar konteks toko sembako
8. Jika pelanggan memesan, catat pesanannya dan informasikan total harga
9. WAJIB gunakan format HTML berikut untuk semua jawaban yang mengandung daftar produk:
   - Awali dengan salam (Pagi/Siang/Sore/Malam) sesuai waktu
   - Gunakan tag <ul> dan <li> untuk setiap daftar produk. Nama produk pakai <strong>
   - Akhiri dengan tawaran bantuan
   - Jangan pernah pakai karakter * atau - untuk list, WAJIB pakai <ul>/<li>
   - Contoh format WAJIB ditiru:
     Pagi, Kak! Ini pilihan beras yang tersedia:
     <ul>
       <li><strong>Beras Premium 5kg</strong> — Rp68.000</li>
       <li><strong>Beras Medium 5kg</strong> — Rp58.000</li>
       <li><strong>Beras Merah 3kg</strong> — Rp45.000</li>
     </ul>
     Mau pesan yang mana, Kak? Stok ready semua.`;

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
  if (req.method === 'GET') return res.redirect('/admin');
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/admin', (req, res) => {
  if (req.session.admin) return res.redirect('/admin/dashboard');
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Login - Tokoko</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>* { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-green-200">
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
      <h1 class="text-2xl font-bold text-gray-800">Admin Tokoko</h1>
      <p class="text-gray-500 text-sm mt-1">Masuk untuk mengelola prompt</p>
    </div>
    <form action="/admin/login" method="POST" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input type="text" name="username" required
          class="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input type="password" name="password" required
          class="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <button type="submit"
        class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-semibold text-sm transition shadow-md">
        Masuk
      </button>
    </form>
    <p class="text-center text-xs text-gray-400 mt-6">
      <a href="/" class="text-green-600 hover:underline">&larr; Kembali ke Tokoko</a>
    </p>
  </div>
</body>
</html>
  `);
});

app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect('/admin/dashboard');
  }
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Login - Tokoko</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>* { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-green-200">
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">❌</div>
      <h1 class="text-2xl font-bold text-gray-800">Login Gagal</h1>
      <p class="text-red-500 text-sm mt-1">Username atau password salah</p>
    </div>
    <form action="/admin/login" method="POST" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input type="text" name="username" required
          class="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input type="password" name="password" required
          class="w-full px-4 py-3 bg-gray-100 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <button type="submit"
        class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-semibold text-sm transition shadow-md">
        Coba Lagi
      </button>
    </form>
    <p class="text-center text-xs text-gray-400 mt-6">
      <a href="/" class="text-green-600 hover:underline">&larr; Kembali ke Tokoko</a>
    </p>
  </div>
</body>
</html>
  `);
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  const escapedPrompt = systemPrompt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard Admin - Tokoko</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>* { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen p-6">
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Dashboard Admin</h1>
        <p class="text-gray-500 text-sm">Kelola system prompt Tokoko</p>
      </div>
      <form action="/admin/logout" method="POST">
        <button type="submit"
          class="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition shadow-md">
          Logout
        </button>
      </form>
    </div>

    <div class="bg-white rounded-3xl shadow-2xl p-6 border border-green-200">
      <form action="/admin/update-prompt" method="POST" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">System Prompt (Training Data)</label>
          <textarea name="prompt" rows="30"
            class="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm text-gray-700 font-mono leading-relaxed border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500">${escapedPrompt}</textarea>
        </div>
        <div class="flex gap-3">
          <button type="submit"
            class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-semibold text-sm transition shadow-md">
            Simpan Perubahan
          </button>
          <a href="/"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-2xl font-semibold text-sm transition text-center">
            Kembali ke Chat
          </a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
  `);
});

app.post('/admin/update-prompt', requireAdmin, express.urlencoded({ extended: false }), (req, res) => {
  systemPrompt = req.body.prompt;
  model = createModel();
  res.redirect('/admin/dashboard');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin');
  });
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tokoko - Chatbot Sembako</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', sans-serif; }
    .chat-box { scroll-behavior: smooth; }
    .msg-bot { background: #f3f4f6; border-radius: 18px 18px 18px 4px; }
    .msg-user { background: #22c55e; color: white; border-radius: 18px 18px 4px 18px; }
    .typing-dot { animation: bounce 1.4s infinite ease-in-out both; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
    #input:focus { outline: none; }
  </style>
</head>
  <body class="bg-gradient-to-br from-green-50 to-emerald-100 min-h-screen flex flex-col items-center justify-center p-4">
  <div class="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-green-200">
    <div class="bg-gradient-to-r from-green-600 to-emerald-600 p-5 flex items-center gap-4">
      <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">🏪</div>
      <div>
        <h1 class="text-white font-bold text-lg">Tokoko</h1>
        <p class="text-green-200 text-sm">Toko Sembako Online</p>
      </div>
      <div class="ml-auto flex gap-2">
        <span class="w-3 h-3 bg-green-300 rounded-full inline-block"></span>
        <span class="text-green-200 text-xs">Online</span>
      </div>
    </div>

    <div id="chat" class="chat-box h-[420px] overflow-y-auto p-5 space-y-4 bg-gray-50"></div>

    <div id="typing" class="hidden px-5 pb-2">
      <div class="flex gap-3 items-center">
        <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">T</div>
        <div class="bg-gray-200 rounded-2xl px-4 py-3 flex gap-1.5">
          <span class="typing-dot w-2 h-2 bg-gray-500 rounded-full inline-block"></span>
          <span class="typing-dot w-2 h-2 bg-gray-500 rounded-full inline-block"></span>
          <span class="typing-dot w-2 h-2 bg-gray-500 rounded-full inline-block"></span>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 p-4 bg-white">
      <form id="form" class="flex gap-3">
        <input id="input" type="text" placeholder="Tanya harga beras, stok minyak..." autocomplete="off"
          class="flex-1 px-4 py-3 bg-gray-100 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm transition shadow-md">
          Kirim
        </button>
      </form>
      <div class="flex items-center justify-between mt-3 px-1">
        <p class="text-xs text-gray-400">Ditenagai oleh Google AI Studio</p>
        <div class="flex gap-2">
          <a href="/admin" class="text-xs text-gray-400 hover:text-green-600 transition">Admin</a>
          <button id="clearBtn" class="text-xs text-red-500 hover:text-red-700 font-semibold transition">Hapus Chat</button>
        </div>
      </div>
    </div>
  </div>

  <div id="confirmModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden">
    <div class="bg-white rounded-3xl shadow-2xl p-6 mx-4 max-w-sm w-full border border-red-200">
      <div class="text-center">
        <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">Hapus Percakapan?</h3>
        <p class="text-sm text-gray-500 mb-6">Semua riwayat chat akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>
        <div class="flex gap-3">
          <button id="modalCancel" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold text-sm transition">Batal</button>
          <button id="modalConfirm" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-semibold text-sm transition shadow-md">Ya, Hapus</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'tokoko_chat';
    const EXPIRY_MS = 12 * 60 * 60 * 1000;

    const chat = document.getElementById('chat');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const typing = document.getElementById('typing');

    function saveMessages() {
      const messages = [];
      chat.querySelectorAll('.flex').forEach(row => {
        const isBot = row.querySelector('.msg-bot');
        const textEl = row.querySelector(isBot ? '.msg-bot' : '.msg-user');
        if (textEl) messages.push({ role: isBot ? 'bot' : 'user', text: textEl.innerHTML });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(STORAGE_KEY + '_time', Date.now().toString());
    }

    function loadMessages() {
      const time = localStorage.getItem(STORAGE_KEY + '_time');
      if (time && Date.now() - parseInt(time) > EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY + '_time');
        return;
      }
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return;
      try {
        const messages = JSON.parse(data);
        messages.forEach(m => addMessage(m.text, m.role, true));
      } catch (e) {}
    }

    function addMessage(text, role, isRestore) {
      const div = document.createElement('div');
      if (role === 'bot') {
        div.className = 'flex gap-3';
        div.innerHTML = \`
          <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">T</div>
          <div class="msg-bot p-4 max-w-[85%] text-sm text-gray-700 leading-relaxed">\${text}</div>
        \`;
      } else {
        div.className = 'flex gap-3 flex-row-reverse';
        div.innerHTML = \`
          <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">K</div>
          <div class="msg-user p-4 max-w-[85%] text-sm leading-relaxed">\${text}</div>
        \`;
      }
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
      if (!isRestore) saveMessages();
    }

    loadMessages();
    if (!chat.children.length) {
      addMessage('Halo! Selamat datang di <strong>Tokoko</strong> 🏪<br><br>Saya asisten virtual Tokoko. Silakan tanya soal stok, harga, atau belanja kebutuhan sembako ya!', 'bot', true);
      saveMessages();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (!msg) return;

      addMessage(msg, 'user');
      input.value = '';
      typing.classList.remove('hidden');
      chat.scrollTop = chat.scrollHeight;

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        typing.classList.add('hidden');
        addMessage(data.reply, 'bot');
      } catch {
        typing.classList.add('hidden');
        addMessage('Maaf, terjadi kesalahan. Silakan coba lagi.', 'bot');
      }
    });

    const modal = document.getElementById('confirmModal');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    document.getElementById('clearBtn').addEventListener('click', () => {
      modal.classList.remove('hidden');
    });

    modalCancel.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    modalConfirm.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + '_time');
      chat.innerHTML = '';
      addMessage('Halo! Selamat datang di <strong>Tokoko</strong> 🏪<br><br>Saya asisten virtual Tokoko. Silakan tanya soal stok, harga, atau belanja kebutuhan sembako ya!', 'bot', true);
      saveMessages();
      modal.classList.add('hidden');
    });
  </script>
</body>
</html>
  `);
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

app.listen(port, () => {
  console.log(`Tokoko chatbot running at http://localhost:${port}`);
});
