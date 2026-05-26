const express = require('express');
const session = require('express-session');
const path = require('path');
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
