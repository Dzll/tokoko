const STORAGE_KEY = 'tokoko_chat';
const EXPIRY_MS = 12 * 60 * 60 * 1000;

const chat = document.getElementById('chat');
const form = document.getElementById('form');
const input = document.getElementById('input');
const typing = document.getElementById('typing');
const modal = document.getElementById('confirmModal');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

function formatTime(date) {
  return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
}

function saveMessages() {
  const messages = [];
  chat.querySelectorAll('.flex').forEach(row => {
    const isBot = row.querySelector('.msg-bot');
    const textEl = row.querySelector(isBot ? '.msg-bot' : '.msg-user');
    const timeEl = row.querySelector('.msg-time');
    if (textEl) messages.push({ role: isBot ? 'bot' : 'user', text: textEl.innerHTML, time: timeEl ? timeEl.textContent : '' });
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
    messages.forEach(m => addMessage(m.text, m.role, true, m.time));
  } catch (e) {}
}

function addMessage(text, role, isRestore, time) {
  const t = time || formatTime(new Date());
  const div = document.createElement('div');
  if (role === 'bot') {
    div.className = 'flex gap-3';
    div.innerHTML = `
      <div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">T</div>
      <div class="msg-bot p-4 pb-2 max-w-[85%] text-sm text-gray-700 leading-relaxed">${text}
        <div class="msg-time text-[10px] text-gray-400 mt-1 text-right">${t}</div>
      </div>
    `;
  } else {
    div.className = 'flex gap-3 flex-row-reverse';
    div.innerHTML = `
      <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">K</div>
      <div class="msg-user p-4 pb-2 max-w-[85%] text-sm leading-relaxed">${text}
        <div class="msg-time text-[10px] text-green-200 mt-1 text-right">${t}</div>
      </div>
    `;
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
