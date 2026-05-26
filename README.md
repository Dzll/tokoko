# Tokoko — Chatbot Toko Sembako

Chatbot toko sembako berbasis **Node.js + Express + Google Gemini AI**. Pelanggan bisa nanya harga, stok, dan belanja kebutuhan sembako lewat chat. Admin bisa update data toko langsung dari dashboard.

---

## Fitur

### 🗣️ Chat dengan AI
- Tanya harga, stok, rekomendasi produk sembako
- Bahasa Indonesia, respon ramah seperti penjaga toko
- Daftar produk dan harga dikelola lewat system prompt

### 💾 Riwayat Chat Tersimpan
- Chat auto-save ke **localStorage** browser
- Tahan **12 jam** — refresh halaman chat tidak hilang
- Tombol **Hapus Chat** dengan modal konfirmasi

### 🔐 Admin Dashboard
- Login dengan username & password (diatur di `.env`)
- Edit **system prompt** (data produk, harga, aturan) lewat UI
- Simpan → model AI langsung pakai data terbaru

---

## Struktur File Penting

```
tokoko/
├── prompt.txt            # System Prompt — edit langsung atau via admin
├── .env                  # Konfigurasi API key, port, login admin
├── public/
│   ├── chat.html         # Halaman chat
│   ├── chat.js           # Logic chat (localStorage, modal, timer)
│   ├── style.css         # Style chat
│   └── admin/
│       ├── login.html    # Halaman login admin
│       └── dashboard.html # Halaman edit prompt
└── index.js              # Server Express + API
```

---

## Persiapan

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env (lihat contoh di bawah)
# 3. Jalankan aplikasi
npm start
```

### Konfigurasi `.env`

```
GOOGLE_API_KEY=isi_api_key_kamu_disini
PORT=3000
ADMIN_USERNAME=admin_tokoko
ADMIN_PASSWORD=admin
```

| Variabel | Keterangan |
|---|---|
| `GOOGLE_API_KEY` | Ambil dari [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `PORT` | Port server (default: 3000) |
| `ADMIN_USERNAME` | Username login admin |
| `ADMIN_PASSWORD` | Password login admin |

### System Prompt (`prompt.txt`)

Semua data toko, daftar produk, harga, dan aturan respons chatbot ada di file **`prompt.txt`**. Ada 2 cara edit:

| Cara | Keterangan |
|---|---|
| **Manual** | Buka `prompt.txt`, edit, simpan, restart server (`npm start`) |
| **Via Admin** | Login ke `/admin`, edit di dashboard, klik **Simpan** — langsung aktif |

> ⚠️ Jika edit manual, server harus direstart. Jika via admin, perubahan langsung aktif tanpa restart.

---

## Menjalankan Aplikasi

```bash
# Mode produksi
npm start

# Mode development (auto-restart saat ada perubahan)
npm run dev
```

Buka **http://localhost:3000** di browser.

---

## Cara Penggunaan

### Chat dengan Tokoko

Ketik pertanyaan di kolom chat, contoh:

```
Harga beras premium berapa?
Stok minyak goreng masih ada?
Saya mau pesan 2 kg telur ayam negeri
Ada rekomendasi minuman? 
```

Chat akan tersimpan otomatis selama **12 jam** (refresh halaman tetap ada). Tiap bubble chat dilengkapi jam.

Untuk menghapus riwayat, klik **Hapus Chat** → konfirmasi di modal.

### Admin Dashboard

Buka **http://localhost:3000/admin**

#### Login
Masukkan `username` dan `password` (sesuai yang diatur di `.env`).

#### Edit System Prompt
1. Setelah login, buka halaman **Dashboard**
2. Edit teks di kolom **System Prompt** — ubah harga, tambah produk, ubah aturan, dll
3. Klik **Simpan Perubahan**
4. Data tersimpan ke `prompt.txt` dan chatbot langsung merespons dengan data baru

#### Logout
Klik tombol **Logout** di pojok kanan atas dashboard.

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Backend | Node.js, Express |
| AI Model | Google Gemini 2.5 Flash |
| Frontend | Tailwind CSS (CDN) |
| Session | express-session |
| Storage Chat | localStorage (12 jam) |
