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

// ─── Час у часовому поясі глядача ─────────────────────────────────────────
// API віддає час у UTC рядком "yyyy-MM-dd HH:mm" (без позначки поясу) — раніше його показували як є,
// тож у Києві відповідь о 09:52 виглядала як 06:52. Тепер: "щойно", "12 хв тому", "14:05",
// "вчора, 14:05", "28 вер, 14:05"; повна дата — у підказці (title) через fmtTimeFull.
function parseUtc(stamp){
  if(!stamp) return null;
  const s = String(stamp).trim();
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  return isNaN(d) ? null : d;
}
// Форматери Intl — по одному на мову й вигляд (створювати їх на кожен виклик дорого).
const _dtf = {};
function _fmt(kind){
  const key = `${currentLang}:${kind}`;
  if(!_dtf[key]){
    const loc = currentLang === 'en' ? 'en-GB' : 'uk-UA';
    const opts = { time: { hour: '2-digit', minute: '2-digit' }, day: { day: 'numeric', month: 'short' }, year: { day: 'numeric', month: 'short', year: 'numeric' },
      full: { dateStyle: 'long', timeStyle: 'short' }, month: { month: 'long', year: 'numeric' } }[kind];
    _dtf[key] = new Intl.DateTimeFormat(loc, opts);
  }
  return _dtf[key];
}
function _sameDay(a, b){ return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtTime(stamp){
  const d = parseUtc(stamp);
  if(!d) return stamp || '';
  const now = new Date(), en = currentLang === 'en';
  const min = Math.floor((now - d) / 60000);
  if(min >= 0 && min < 1) return en ? 'just now' : 'щойно';
  if(min >= 0 && min < 60) return en ? `${min} min ago` : `${min} хв тому`;
  const time = _fmt('time').format(d);
  if(_sameDay(d, now)) return time;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if(_sameDay(d, y)) return `${en ? 'yesterday' : 'вчора'}, ${time}`;
  return d.getFullYear() === now.getFullYear() ? `${_fmt('day').format(d)}, ${time}` : _fmt('year').format(d);
}
function fmtTimeFull(stamp){
  const d = parseUtc(stamp);
  return d ? _fmt('full').format(d) : (stamp || '');
}
// <time> з місцевим часом і повною датою в підказці.
function timeHtml(stamp, cls = ''){
  const d = parseUtc(stamp);
  return `<time${cls ? ` class="${cls}"` : ''}${d ? ` datetime="${d.toISOString()}"` : ''} title="${esc(fmtTimeFull(stamp))}">${esc(fmtTime(stamp))}</time>`;
}
// Групи для довгих списків (історія): сьогодні / вчора / цього тижня / місяць рік.
function dayGroupLabel(date){
  const now = new Date(), en = currentLang === 'en';
  if(_sameDay(date, now)) return en ? 'Today' : 'Сьогодні';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if(_sameDay(date, y)) return en ? 'Yesterday' : 'Вчора';
  if((now - date) / 86400000 < 7) return en ? 'This week' : 'Цього тижня';
  return _fmt('month').format(date).replace(/^./, c => c.toUpperCase());
}
