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
  resave: true,
  saveUninitialized: true,
  cookie: { maxAge: 12 * 60 * 60 * 1000 },
}));

function requireAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.redirect('/admin/login.html');
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/admin', (req, res) => {
  if (req.session.admin) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.post('/admin/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.redirect('/');
  }
  res.redirect('/admin/login.html?error=1');
});

app.get('/admin/dashboard.html', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/api/admin/status', (req, res) => {
  res.json({ admin: !!req.session.admin });
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
    res.redirect('/');
  });
});

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: 'Pesan tidak boleh kosong.' });

  if (/^\/edit/i.test(message) && !req.session.admin) {
    return res.json({ reply: '🔒 Fitur edit harga hanya untuk admin. Silakan login dulu lewat menu <strong>Admin</strong> di footer chat.' });
  }

  if (req.session.admin) {
    const editFull = message.match(/^\/edit\s+(.+?)\s+(\d+)$/i);
    const editNoPrice = !editFull && message.match(/^\/edit\s+(.+)$/i);

    function findCandidates(query) {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const lines = systemPrompt.split('\n');
      const results = [];
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^-\s*(.+?)\s*-\s*Rp([\d.]+)/i);
        if (m) {
          const name = m[1].toLowerCase();
          if (words.every(w => name.includes(w))) {
            results.push({ index: i, name: m[1], price: 'Rp' + m[2] });
          }
        }
      }
      return results;
    }

    function updateProduct(index, newPrice) {
      const lines = systemPrompt.split('\n');
      const formatted = 'Rp' + newPrice.toLocaleString('id-ID');
      lines[index] = lines[index].replace(/(Rp)[\d.]+/i, '$1' + newPrice.toLocaleString('id-ID'));
      systemPrompt = lines.join('\n');
      fs.writeFileSync(PROMPT_PATH, systemPrompt, 'utf8');
      model = createModel();
      return formatted;
    }

    if (editFull) {
      const query = editFull[1].trim();
      const newPrice = parseInt(editFull[2]);
      const candidates = findCandidates(query);
      if (candidates.length === 0) {
        delete req.session.pendingEdit;
        return res.json({ reply: `❌ Produk "${query}" tidak ditemukan.` });
      }
      if (candidates.length === 1) {
        delete req.session.pendingEdit;
        const formatted = updateProduct(candidates[0].index, newPrice);
        return res.json({ reply: `✅ Harga ${candidates[0].name} berhasil diupdate menjadi ${formatted}` });
      }
      req.session.pendingEdit = { type: 'select', candidates, price: newPrice };
      const list = candidates.map((c, i) => `  <li><strong>${i + 1}.</strong> ${c.name} — ${c.price}</li>`).join('\n');
      return res.json({
        reply: `⚠️ Ditemukan ${candidates.length} produk. Mau update yang mana?<br><ul>${list}</ul>Ketik <strong>1</strong> sampai <strong>${candidates.length}</strong> untuk memilih.`
      });
    }

    if (editNoPrice) {
      const query = editNoPrice[1].trim();
      const candidates = findCandidates(query);
      if (candidates.length === 0) {
        delete req.session.pendingEdit;
        return res.json({ reply: `❌ Produk "${query}" tidak ditemukan.` });
      }
      if (candidates.length === 1) {
        req.session.pendingEdit = { type: 'price', product: candidates[0] };
        return res.json({ reply: `Harga <strong>${candidates[0].name}</strong> sekarang ${candidates[0].price}. Mau diubah jadi berapa?` });
      }
      req.session.pendingEdit = { type: 'select', candidates };
      const list = candidates.map((c, i) => `  <li><strong>${i + 1}.</strong> ${c.name} — ${c.price}</li>`).join('\n');
      return res.json({
        reply: `Produk yang cocok ada ${candidates.length}:<br><ul>${list}</ul>Mau update yang nomor berapa?`
      });
    }

    const numMatch = message.match(/^\d+$/);
    if (numMatch && req.session.pendingEdit) {
      const pe = req.session.pendingEdit;
      if (pe.type === 'select') {
        const idx = parseInt(numMatch[0]) - 1;
        if (idx >= 0 && idx < pe.candidates.length) {
          const selected = pe.candidates[idx];
          if (pe.price) {
            const formatted = updateProduct(selected.index, pe.price);
            delete req.session.pendingEdit;
            return res.json({ reply: `✅ Harga ${selected.name} berhasil diupdate menjadi ${formatted}` });
          }
          req.session.pendingEdit = { type: 'price', product: selected };
          return res.json({ reply: `Harga <strong>${selected.name}</strong> sekarang ${selected.price}. Mau diubah jadi berapa?` });
        }
        delete req.session.pendingEdit;
        return res.json({ reply: `❌ Pilihan tidak valid. Pilih nomor <strong>1</strong> sampai <strong>${pe.candidates.length}</strong>. Ketik <code>/edit</code> untuk memulai lagi.` });
      }
      if (pe.type === 'price') {
        const newPrice = parseInt(numMatch[0]);
        const formatted = updateProduct(pe.product.index, newPrice);
        delete req.session.pendingEdit;
        return res.json({ reply: `✅ Harga ${pe.product.name} berhasil diupdate menjadi ${formatted}` });
      }
    }

    if (req.session.pendingEdit) {
      const pe = req.session.pendingEdit;
      if (pe.type === 'select') {
        return res.json({
          reply: `❌ Ketik nomor <strong>1</strong> sampai <strong>${pe.candidates.length}</strong> untuk memilih produk.`
        });
      }
      if (pe.type === 'price') {
        return res.json({
          reply: `❌ Ketik harga barunya saja (angka), misal <strong>30000</strong>.`
        });
      }
    }
  }

  delete req.session.pendingEdit;

  const lines = systemPrompt.split('\n');

  // Parse all products from prompt
  const allProducts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^-\s*(.+?)\s*-\s*Rp([\d.]+)/i);
    if (m) {
      allProducts.push({ name: m[1], nameLower: m[1].toLowerCase(), price: 'Rp' + m[2] });
    }
  }

  // Harga query
  const hargaMatch = message.match(/^harga\s+(.+)$/i);
  if (hargaMatch) {
    const words = hargaMatch[1].toLowerCase().replace(/[?.!,;:]+/g, '').split(/\s+/).filter(Boolean);
    const results = allProducts.filter(p => words.every(w => p.nameLower.includes(w)));
    if (results.length > 0) {
      const list = results.map(r => `  <li><strong>${r.name}</strong> — ${r.price}</li>`).join('\n');
      return res.json({ reply: `Berikut harga produk yang cocok:<br><ul>${list}</ul>` });
    }
  }

  // Stok query
  const stokMatch = message.match(/^(?:stok|stock)\s+(.+)$/i);
  if (stokMatch) {
    const words = stokMatch[1].toLowerCase().replace(/[?.!,;:]+/g, '').split(/\s+/).filter(Boolean);
    const results = allProducts.filter(p => words.every(w => p.nameLower.includes(w)));
    if (results.length > 0) {
      const list = results.map(r => `  <li><strong>${r.name}</strong> — ${r.price} — stok tersedia</li>`).join('\n');
      return res.json({ reply: `Berikut stok produk yang tersedia:<br><ul>${list}</ul>` });
    }
  }

  // Check if message mentions any known product word
  const msgLowerClean = message.toLowerCase().replace(/[?.!,;:]+/g, '');
  const knownProductMentioned = allProducts.some(p => {
    const pWords = p.nameLower.split(/\s+/);
    return pWords.some(pw => msgLowerClean.includes(pw));
  });

  // Product but not in inventory
  const productQuery = message.match(/^(?:ada|jual|beli|cari|nyari|ketersediaan|butuh)\s+(.+)$/i)
    || message.match(/(?:ada|jual|beli|cari)\s+(.+)/i)
    || message.match(/^apakah\s+(?:ada|tersedia)\s+(.+)/i);
  if (productQuery && !knownProductMentioned) {
    const query = productQuery[1].trim().replace(/[?.!,;:]+$/, '');
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const anyMatch = allProducts.some(p => words.some(w => w.length > 2 && (w.includes(p.nameLower) || p.nameLower.includes(w))));
    if (!anyMatch) {
      const greeting = new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 18 ? 'Siang' : 'Malam';
      return res.json({ reply: `${greeting}, Kak! Maaf, <strong>${query}</strong> saat ini tidak tersedia di Tokoko. Kami hanya menjual sembako dan kebutuhan pokok sehari-hari. Ada yang bisa kami bantu lain?` });
    }
  }

  try {
    const result = await model.generateContent(message);
    const reply = result.response.text();
    res.json({ reply });
  } catch (err) {
    console.error(err);
    if (err.status === 429) {
      return res.json({ reply: 'Maaf, kuota Gemini sedang habis. Tanya <strong>"harga [produk]"</strong> atau <strong>"stok [produk]"</strong> untuk info langsung, atau tunggu beberapa saat.' });
    }
    res.status(500).json({ reply: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Tokoko chatbot running at http://localhost:${port}`);
});
