// Дрібні спільні утиліти (екранування HTML тощо).

// ================================================================
// HELPERS
// ================================================================
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Скорочення довгих назв жанрів лише для відображення (у базі й фільтрах лишається повна назва).
function abbrGenre(name){return String(name).replace(/alternative/gi,'alt');}
// "00:04:16" → "4:16" — для компактних карток (години лишаються, якщо є).
function shortDur(d){return String(d||'').replace(/^00:0?(?=\d:)/,'');}

// Аватар користувача без фото (ні з Google, ні свого) — ініціали на кольоровому тлі,
// колір стабільний для імені (та сама палітра, що в колеса й виконавців).
const AVATAR_COLORS = ['#c8a96e','#8a6fb0','#4f8c6f','#b5555a','#5b84a8','#c98a4b','#6fa89e','#9a6b8f','#7d9153','#b0703f','#5f6fa0','#a3824f'];
function avatarColor(name){
  let h = 0;
  for(const ch of String(name || '?')) h = (h*31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarInitials(name){
  const words = String(name || '').trim().split(/[\s._\-@]+/).filter(Boolean);
  return words.slice(0, 2).map(w => [...w][0]).join('').toUpperCase() || '?';
}
// <img> з фото або кружечок з ініціалами; cls — клас розміру/місця (friend-avatar, chat-conv-ph…).
function avatarHtml(url, name, cls = 'friend-avatar'){
  return url
    ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="${cls} avatar-initials" style="--av:${avatarColor(name)}">${esc(avatarInitials(name))}</span>`;
}
// Заглушка з фіксованим id (сторінки профілів): ініціали й колір замість силуету.
function fillAvatarPlaceholder(el, name){
  if(!el) return;
  el.classList.add('avatar-initials');
  el.style.setProperty('--av', avatarColor(name));
  el.textContent = avatarInitials(name);
}
