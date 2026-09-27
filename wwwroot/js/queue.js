// Черга плеєра: "Моя черга" (додане вручну — грає першим і не губиться, коли вмикаєш
// інший список), "Далі" з поточного списку, "Нещодавно прослухані" (з сервера —
// ті самі, що й у застосунку; гостю — з цього пристрою), пошук, щоб зібрати свою чергу.

// ================================================================
// ЧЕРГА
// ================================================================
let userQueue = [];          // додані вручну — грають перед рештою списку
let _shuffledRef = null;     // список, який уже перемішано (shuffle)
let _unshuffledQueue = null; // порядок до перемішування — повертається, коли shuffle вимкнули
let _queueOpen = false;
let _recentServer = [];      // [{ song, listenedAt }]
const _RECENT_LOCAL_KEY = 'recentPlays';
const _QUEUE_UPCOMING_MAX = 40;

// "Перемішати" — як у Spotify: решту списку перемішано наперед, тож "Далі" видно.
function _shuffleUpcoming(){
  const cur = playerQueue[playerIndex];
  if(!cur) return;
  _unshuffledQueue = playerQueue.slice();
  const rest = playerQueue.filter((_, i) => i !== playerIndex);
  playerQueue = [cur, ..._shuffledCopy(rest)];
  playerIndex = 0;
  _shuffledRef = playerQueue;
}
function _unshuffle(){
  const cur = playerQueue[playerIndex];
  if(_unshuffledQueue && cur){
    const i = _unshuffledQueue.findIndex(s => s.id === cur.id);
    if(i >= 0){ playerQueue = _unshuffledQueue; playerIndex = i; }
  }
  _unshuffledQueue = null;
  _shuffledRef = null;
}
// Новий список при увімкненому shuffle (клік по пісні в таблиці тощо) — теж перемішуємо.
function _queueBeforeLoad(){
  if(shuffle && playerQueue.length > 1 && playerQueue !== _shuffledRef) _shuffleUpcoming();
}
function _queueAfterLoad(s){
  _pushRecentLocal(s);
  if(_queueOpen) renderQueuePanel();
}
// Наступна: спершу "Моя черга", далі — список.
function _takeFromUserQueue(){
  if(!userQueue.length) return false;
  const s = userQueue.shift();
  if(playerQueue.length){ playerQueue.splice(playerIndex + 1, 0, s); playerIndex++; }
  else { playerQueue = [s]; playerIndex = 0; }
  return true;
}

function _pushRecentLocal(s){
  try{
    const ids = JSON.parse(localStorage.getItem(_RECENT_LOCAL_KEY) || '[]').filter(id => id !== s.id);
    ids.unshift(s.id);
    localStorage.setItem(_RECENT_LOCAL_KEY, JSON.stringify(ids.slice(0, 30)));
  }catch(e){}
}
function _recentItems(){
  if(currentUser?.authenticated) return _recentServer;
  try{
    return JSON.parse(localStorage.getItem(_RECENT_LOCAL_KEY) || '[]').map(id => _findSong(id)).filter(Boolean).map(song => ({ song, listenedAt: null }));
  }catch(e){ return []; }
}
function loadRecentHistory(){
  if(!currentUser?.authenticated) return Promise.resolve([]);
  return fetch('/api/history?limit=30').then(r=>r.ok?r.json():[]).then(list=>{ _recentServer = list; return list; }).catch(()=>[]);
}

// ─── Дії ─────────────────────────────────────────────────────────────────
function addToQueue(id, next = false){
  const s = _findSong(id);
  if(!s) return;
  if(!playerQueue.length){ playerQueue = [s]; playerIndex = 0; _loadCurrent(); return; }
  if(next) userQueue.unshift(s); else userQueue.push(s);
  if(_queueOpen) renderQueuePanel();
  else showToast(t(next ? 'queue.addedNext' : 'queue.added').replace('{song}', `${s.artist} — ${s.title}`), () => toggleQueuePanel(true));
}
function addManyToQueue(ids){
  const list = ids.map(id => _findSong(id)).filter(Boolean);
  if(!list.length) return;
  if(!playerQueue.length){ playerQueue = list.slice(); playerIndex = 0; _loadCurrent(); return; }
  userQueue.push(...list);
  if(_queueOpen) renderQueuePanel();
  else showToast(t('queue.addedMany').replace('{n}', list.length), () => toggleQueuePanel(true));
}
function playNowFromQueue(kind, i){
  let s;
  if(kind === 'mine') s = userQueue.splice(i, 1)[0];
  else if(kind === 'recent') s = _recentItems()[i]?.song;
  if(!s) return;
  if(playerQueue.length){ playerQueue.splice(playerIndex + 1, 0, s); playerIndex++; }
  else { playerQueue = [s]; playerIndex = 0; }
  _loadCurrent();
}
function jumpToUpcoming(i){
  const idx = playerIndex + 1 + i;
  if(idx >= playerQueue.length) return;
  playerIndex = idx;
  _loadCurrent();
}
function moveInUserQueue(i, dir){
  const j = i + dir;
  if(j < 0 || j >= userQueue.length) return;
  [userQueue[i], userQueue[j]] = [userQueue[j], userQueue[i]];
  renderQueuePanel();
}
function removeFromUserQueue(i){ userQueue.splice(i, 1); renderQueuePanel(); }
function removeUpcoming(i){ playerQueue.splice(playerIndex + 1 + i, 1); renderQueuePanel(); }
function clearUserQueue(){ userQueue = []; renderQueuePanel(); }
function clearUpcoming(){ playerQueue = playerQueue.slice(0, playerIndex + 1); _shuffledRef = shuffle ? playerQueue : null; renderQueuePanel(); }
// "Нова черга": лишається лише поточна пісня — далі те, що додасте пошуком або кнопкою "+".
function startNewQueue(){
  userQueue = [];
  playerQueue = playerQueue.slice(playerIndex, playerIndex + 1);
  playerIndex = 0;
  _shuffledRef = shuffle ? playerQueue : null;
  renderQueuePanel();
  document.getElementById('queue-search-input')?.focus();
}

// ─── Панель ──────────────────────────────────────────────────────────────
function toggleQueuePanel(force){
  _queueOpen = force ?? !_queueOpen;
  document.getElementById('queue-panel').classList.toggle('open', _queueOpen);
  document.getElementById('btn-queue')?.classList.toggle('lit', _queueOpen);
  if(_queueOpen){
    renderQueuePanel();
    loadRecentHistory().then(() => { if(_queueOpen) renderQueuePanel(); });
  }
}
function _queueRowHtml(s, { onclick, acts = '', meta = '' }){
  const thumb = _songThumb(s);
  return `<div class="q-row" onclick="${onclick}">
    <span class="q-cover">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : '<svg class="icon"><use href="#icon-music"/></svg>'}</span>
    <span class="q-main"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}${meta ? ` · ${meta}` : ''}</span></span>
    ${acts ? `<span class="q-acts" onclick="event.stopPropagation()">${acts}</span>` : ''}
  </div>`;
}
function _qBtn(icon, title, onclick, cls = ''){
  return `<button type="button" class="q-btn ${cls}" title="${esc(title)}" aria-label="${esc(title)}" onclick="${onclick}"><svg class="icon"><use href="#icon-${icon}"/></svg></button>`;
}
function _timeAgo(iso){
  if(!iso) return '';
  const sec = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(currentLang === 'en' ? 'en' : 'uk', { numeric: 'auto' });
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for(const [u, n] of units) if(Math.abs(sec) >= n) return rtf.format(Math.round(sec / n), u);
  return rtf.format(0, 'minute');
}
function renderQueuePanel(){
  const body = document.getElementById('queue-body');
  if(!body) return;
  const cur = playerQueue[playerIndex];
  const upcoming = playerQueue.slice(playerIndex + 1);
  const recentAll = _recentItems();
  const recent = recentAll.filter(r => r.song.id !== cur?.id);
  const section = (title, count, action, content) => `
    <div class="q-section">
      <div class="q-section-head"><span>${esc(title)}${count != null ? ` <b>${count}</b>` : ''}</span>${action || ''}</div>
      ${content}
    </div>`;
  const clearBtn = fn => `<button type="button" class="q-link" onclick="${fn}">${esc(t('queue.clear'))}</button>`;
  body.innerHTML = [
    cur ? section(t('queue.nowPlaying'), null, '', _queueRowHtml(cur, { onclick: 'playerToggle()' }).replace('class="q-row"', 'class="q-row q-current"')) : '',
    section(t('queue.mine'), userQueue.length || null, userQueue.length ? clearBtn('clearUserQueue()') : '',
      userQueue.length ? userQueue.map((s, i) => _queueRowHtml(s, {
        onclick: `playNowFromQueue('mine', ${i})`,
        acts: _qBtn('arrow-up', t('queue.up'), `moveInUserQueue(${i}, -1)`, i === 0 ? 'dim' : '') +
              _qBtn('arrow-down', t('queue.down'), `moveInUserQueue(${i}, 1)`, i === userQueue.length - 1 ? 'dim' : '') +
              _qBtn('x', t('queue.remove'), `removeFromUserQueue(${i})`),
      })).join('') : `<div class="q-empty">${esc(t('queue.mineEmpty'))}</div>`),
    section(t('queue.next'), upcoming.length || null, upcoming.length ? clearBtn('clearUpcoming()') : '',
      upcoming.length ? upcoming.slice(0, _QUEUE_UPCOMING_MAX).map((s, i) => _queueRowHtml(s, {
        onclick: `jumpToUpcoming(${i})`,
        acts: _qBtn('x', t('queue.remove'), `removeUpcoming(${i})`),
      })).join('') + (upcoming.length > _QUEUE_UPCOMING_MAX ? `<div class="q-empty">${esc(t('queue.more').replace('{n}', upcoming.length - _QUEUE_UPCOMING_MAX))}</div>` : '')
      : `<div class="q-empty">${esc(t('queue.nextEmpty'))}</div>`),
    section(t('queue.recent'), null, '',
      recent.length ? recent.slice(0, 20).map(r => _queueRowHtml(r.song, {
        onclick: `playNowFromQueue('recent', ${recentAll.indexOf(r)})`,
        meta: esc(_timeAgo(r.listenedAt)),
        acts: _qBtn('plus', t('queue.add'), `addToQueue(${r.song.id})`),
      })).join('') : `<div class="q-empty">${esc(t('queue.recentEmpty'))}</div>`),
  ].join('');
}

// Пошук, щоб додати пісню в чергу (обидві таблиці).
let _queueSearchTimer = null;
function onQueueSearchInput(){
  clearTimeout(_queueSearchTimer);
  _queueSearchTimer = setTimeout(() => {
    const q = document.getElementById('queue-search-input').value.trim().toLowerCase();
    const box = document.getElementById('queue-search-results');
    if(q.length < 2){ box.innerHTML = ''; box.style.display = 'none'; return; }
    const seen = new Set();
    const found = [...songs, ...communitySongs].filter(s => {
      if(seen.has(s.id)) return false;
      seen.add(s.id);
      return `${s.artist} ${s.title} ${s.album || ''}`.toLowerCase().includes(q);
    }).slice(0, 8);
    box.style.display = '';
    box.innerHTML = found.length ? found.map(s => _queueRowHtml(s, {
      onclick: `addToQueue(${s.id}); onQueueSearchAdded()`,
      acts: _qBtn('play', t('queue.playNext'), `addToQueue(${s.id}, true); onQueueSearchAdded()`) + _qBtn('plus', t('queue.add'), `addToQueue(${s.id}); onQueueSearchAdded()`),
    })).join('') : `<div class="q-empty">${esc(t('queue.searchEmpty'))}</div>`;
  }, 150);
}
function onQueueSearchAdded(){
  const input = document.getElementById('queue-search-input');
  input.value = '';
  onQueueSearchInput();
  input.focus();
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && _queueOpen) toggleQueuePanel(false); });
