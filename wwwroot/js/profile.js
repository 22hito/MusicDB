// Власний профіль: дані, аватарка, улюблені, плейлисти; додавання пісні в плейлист;
// спільні модальні вікна (confirmModal, _closeModalAnimated).

// ================================================================
// PROFILE (профіль, улюблені, плейлисти)
// ================================================================
let profileAvatarValue = null;   // поточне значення аватарки, яке буде надіслано при збереженні
let profileGooglePicture = null; // фото з Google-акаунту (фолбек, якщо своєї аватарки нема)
// Шапка профілю: аватар, ім'я, жанри; редагування (фото, нікнейм) — лише після "Редагувати".
let _profileLabel = '';
let _profileLoaded = null; // останні збережені значення — "Скасувати" повертає їх
function _renderProfileAvatar(){
  const shown = profileAvatarValue || profileGooglePicture;
  const picEl = document.getElementById('profile-view-picture');
  const picPh = document.getElementById('profile-view-picture-ph');
  // .avatar-initials задає display з !important — тож при фото знімаємо клас, а не лише ховаємо.
  if(shown){ picEl.src = shown; picEl.style.display = ''; picPh.style.display = 'none'; picPh.classList.remove('avatar-initials'); picPh.textContent = ''; }
  else { picEl.style.display = 'none'; picPh.style.display = ''; fillAvatarPlaceholder(picPh, _profileLabel); }
  document.getElementById('profile-avatar-remove').style.display = profileAvatarValue ? '' : 'none';
  // Тло шапки — розмите фото або колір імені.
  const bg = document.getElementById('profile-hero-bg');
  bg.style.backgroundImage = shown ? `url("${shown}")` : '';
  bg.style.setProperty('--av', avatarColor(_profileLabel));
}
function toggleProfileEdit(force){
  const hero = document.getElementById('profile-hero');
  const open = force ?? !hero.classList.contains('editing');
  if(!open && _profileLoaded){ // скасування — повертаємо збережене
    profileAvatarValue = _profileLoaded.avatarUrl;
    document.getElementById('profile-display-name').value = _profileLoaded.displayName;
    document.getElementById('profile-avatar-file').value = '';
    _renderProfileAvatar();
  }
  hero.classList.toggle('editing', open);
  document.getElementById('profile-edit').hidden = !open;
  document.getElementById('profile-avatar-file').disabled = !open;
  document.getElementById('profile-edit-btn').classList.toggle('active', open);
  if(open) document.getElementById('profile-display-name').focus();
}
// Лічильники: плавно "набігають" до значення (без анімації — якщо рух вимкнено).
function _countUp(el, target){
  target = +target || 0;
  if(_reducedMotion() || target < 2){ el.textContent = target; return; }
  const t0 = performance.now(), dur = 700;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
    if(k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function scrollToProfileSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior: _reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
// "Прослухано" — розгортає нещодавно прослухані (ті самі, що й у черзі плеєра).
function toggleProfileHistory(force){
  const sec = document.getElementById('profile-history-section');
  const open = force ?? sec.hidden;
  sec.hidden = !open;
  document.getElementById('profile-stat-btn-listened').setAttribute('aria-expanded', String(open));
  document.getElementById('profile-stat-btn-listened').classList.toggle('active', open);
  if(!open) return;
  const list = document.getElementById('profile-history-list');
  list.innerHTML = `<div class="q-empty">${esc(t('notif.loading'))}</div>`;
  loadRecentHistory().then(items => {
    document.getElementById('profile-history-play').style.display = items.length ? '' : 'none';
    // Лише 5 останніх — решта у вікні «Уся історія».
    list.innerHTML = items.length ? items.slice(0, PROFILE_HISTORY_PREVIEW).map((r, i) => _queueRowHtml(r.song, {
      onclick: `playProfileHistory(${i})`,
      meta: esc(_timeAgo(r.listenedAt)),
      acts: _qBtn('plus', t('queue.add'), `addToQueue(${r.song.id})`),
    })).join('') : `<div class="q-empty">${esc(t('queue.recentEmpty'))}</div>`;
    const total = _profileListened || items.length;
    const all = document.getElementById('profile-history-all');
    all.style.display = total > PROFILE_HISTORY_PREVIEW ? '' : 'none';
    all.textContent = t('history.showAll').replace('{n}', total);
  });
  scrollToProfileSection('profile-history-section');
}
const PROFILE_HISTORY_PREVIEW = 5;
let _profileListened = 0; // «Прослухано» з профілю — для підпису «Уся історія (N)»

// ─── Уся історія прослуховувань ──────────────────────────────────────────
const HISTORY_PAGE = 50;
let _history = [], _historyOffset = 0, _historyDone = false, _historyBusy = false;
function openHistoryModal(){
  _history = []; _historyOffset = 0; _historyDone = false;
  document.getElementById('history-search').value = '';
  document.getElementById('history-total').textContent = t('history.total').replace('{n}', _profileListened);
  document.getElementById('history-list').innerHTML = `<div class="q-empty">${esc(t('notif.loading'))}</div>`;
  document.getElementById('history-modal-overlay').classList.add('open');
  _loadHistoryPage();
}
function closeHistoryModal(){ _closeModalAnimated('history-modal-overlay'); }
function _loadHistoryPage(){
  if(_historyBusy || _historyDone) return;
  _historyBusy = true;
  fetch(`/api/history?limit=${HISTORY_PAGE}&offset=${_historyOffset}`).then(r => r.ok ? r.json() : []).catch(() => [])
    .then(page => {
      _historyOffset += HISTORY_PAGE;
      if(!page.length) _historyDone = true;
      const seen = new Set(_history.map(h => h.song.id));
      _history.push(...page.filter(h => !seen.has(h.song.id)));
    })
    .finally(() => { _historyBusy = false; renderHistoryModal(); });
}
function _historyShown(){
  const words = document.getElementById('history-search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.length ? _history.filter(h => words.every(w => `${h.song.artist} ${h.song.title}`.toLowerCase().includes(w))) : _history;
}
function renderHistoryModal(){
  const box = document.getElementById('history-list');
  const shown = _historyShown();
  let html = '', group = null;
  shown.forEach((h, i) => {
    const d = new Date(h.listenedAt);
    const g = dayGroupLabel(d);
    if(g !== group){ group = g; html += `<div class="history-group">${esc(g)}</div>`; }
    html += _queueRowHtml(h.song, {
      onclick: `playHistoryAt(${i})`,
      meta: `<time datetime="${d.toISOString()}" title="${esc(fmtTimeFull(h.listenedAt))}">${esc(_fmt('time').format(d))}</time>`,
      acts: _qBtn('plus', t('queue.add'), `addToQueue(${h.song.id})`),
    });
  });
  if(!shown.length && (_historyDone || _history.length)) html = `<div class="q-empty">${esc(t(_history.length ? 'table.empty' : 'queue.recentEmpty'))}</div>`;
  if(!_historyDone) html += `<div class="history-more" id="history-more">${_historyBusy ? esc(t('notif.loading')) : `<button type="button" class="btn btn-ghost" onclick="_loadHistoryPage()">${esc(t('history.loadOlder'))}</button>`}</div>`;
  box.innerHTML = html;
  // Довантаження, щойно низ списку видно (без обробника прокрутки на кожен піксель).
  const more = document.getElementById('history-more');
  if(more && !_historyBusy && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(entries => {
      if(entries.some(e => e.isIntersecting)){ io.disconnect(); _loadHistoryPage(); }
    }, { root: box, rootMargin: '200px' });
    io.observe(more);
  }
}
function playHistoryAt(i){
  const list = _historyShown().map(h => h.song);
  if(!list.length) return;
  playerQueue = list.slice();
  playerIndex = Math.min(i, list.length - 1);
  _loadCurrent();
}
function playHistoryAll(){ playHistoryAt(0); }
function queueHistoryAll(){ addManyToQueue(_historyShown().map(h => h.song.id)); }

function playProfileHistory(i){
  const list = _recentServer.map(r => r.song);
  if(!list.length) return;
  playerQueue = list.slice();
  playerIndex = Math.min(i, list.length - 1);
  _loadCurrent();
}
// Жанр із профілю — бібліотека, відфільтрована за ним.
function openLibraryGenre(g){
  showHome('catalog');
  const sel = document.getElementById('filter-genre');
  if([...sel.options].some(o => o.value === g)) sel.value = g;
  renderSongs();
}
function loadProfilePage(){
  fetch('/api/profile').then(r=>r.json()).then(p=>{
    _profileLabel = p.displayName || p.name || p.email;
    document.getElementById('profile-view-name').textContent = _profileLabel;
    document.getElementById('profile-view-email').textContent = p.email;
    document.getElementById('profile-view-admin').style.display = p.isAdmin ? '' : 'none';
    document.getElementById('profile-display-name').value = p.displayName || '';
    document.getElementById('profile-avatar-file').value = '';
    profileAvatarValue = p.avatarUrl || null;
    profileGooglePicture = p.picture || null;
    _profileLoaded = { displayName: p.displayName || '', avatarUrl: p.avatarUrl || null };
    _renderProfileAvatar();
    _profileListened = p.totalListened || 0;
    _countUp(document.getElementById('profile-stat-listened'), p.totalListened);
    _countUp(document.getElementById('profile-stat-favorites'), p.favoritesCount);
    _countUp(document.getElementById('profile-stat-playlists'), p.playlistsCount);
    document.getElementById('profile-top-genres').innerHTML = (p.topGenres || []).map(g=>
      `<button type="button" class="badge badge-filter" data-v="${esc(g)}" onclick="openLibraryGenre(this.dataset.v)" title="${esc(t('filter.byGenre'))}">${esc(abbrGenre(g))}</button>`).join('');
  }).catch(()=>{});

  loadProfileFavorites();
  loadProfilePlaylists();
}
// Конвертує обрану аватарку в base64 для прев'ю; надсилається лише при "Зберегти".
function onAvatarFileSelected(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profileAvatarValue = reader.result;
    _renderProfileAvatar();
  };
  reader.readAsDataURL(file);
}
function removeAvatar(){
  profileAvatarValue = null;
  document.getElementById('profile-avatar-file').value = '';
  _renderProfileAvatar();
}
function saveProfile(){
  const displayName = document.getElementById('profile-display-name').value.trim();
  fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ displayName: displayName || null, avatarUrl: profileAvatarValue }) })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      if(currentUser){ currentUser.displayName = displayName || null; currentUser.avatarUrl = profileAvatarValue; }
      _profileLoaded = { displayName, avatarUrl: profileAvatarValue };
      toggleProfileEdit(false);
      loadProfilePage();
      renderAuthArea();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// Улюблені відтворюються чергою — як у застосунку (▶ у кожному рядку).
let _profileFavorites = [];
function playFromFavorites(id){
  if(!_profileFavorites.length) return;
  playerQueue = _profileFavorites.slice();
  playerIndex = Math.max(0, playerQueue.findIndex(s=>s.id===id));
  _loadCurrent();
}
function loadProfileFavorites(){
  fetch('/api/favorites').then(r=>r.json()).then(list=>{
    _profileFavorites = list;
    const tbody = document.getElementById('profile-favorites-body');
    document.getElementById('profile-favorites-empty').style.display = list.length ? 'none' : '';
    const curId = playerQueue[playerIndex]?.id ?? null;
    tbody.innerHTML = list.map(s=>{
      const isPlay = s.id===curId;
      const btnIcon = isPlay&&isPlaying() ? ROW_PAUSE_ICON : ROW_PLAY_ICON;
      return `
      <tr data-id="${s.id}" class="${isPlay?'playing-row':''}">
        <td class="td-icon-lead" data-label=""><button class="play-row-btn${isPlay?' is-playing':''}" data-icon="${btnIcon===ROW_PAUSE_ICON?'pause':'play'}" onclick="toggleOrPlay(${s.id}, playFromFavorites)">${btnIcon}</button></td>
        <td class="td-artist" data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td class="td-title" data-label="${t('table.title')}">${esc(s.title)}</td>
        <td class="td-genres" data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-fav active" onclick="removeFavoriteFromProfile(${s.id})" title="${t('profile.favToggle')}"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button></td>
      </tr>`;
    }).join('');
  }).catch(()=>{});
}
function removeFavoriteFromProfile(musicId){
  fetch(`/api/favorites/${musicId}`, { method:'DELETE' }).then(()=>{
    favoriteIds.delete(musicId);
    loadProfileFavorites();
    loadProfilePage();
  }).catch(()=>{});
}
function loadProfilePlaylists(){
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    document.getElementById('profile-playlists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('profile-playlists-list').innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${countLabel('count.songs', p.songCount)}</span></div>
        <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation()">
          <button type="button" class="btn btn-outline${p.isPublic?' active':''}" style="font-size:0.7rem;padding:0.3rem 0.7rem;" onclick="togglePlaylistPublic(${p.id}, ${p.isPublic ? 'false' : 'true'})" title="${t('battle.togglePublicHint')}">${p.isPublic ? `<svg class="icon"><use href="#icon-globe"/></svg> ${esc(t('battle.publicBadge'))}` : `<svg class="icon"><use href="#icon-lock"/></svg> ${esc(t('battle.privateBadge'))}`}</button>
          <button class="btn-icon-danger" onclick="deletePlaylist(${p.id})" title="${t('modal.confirmDelete')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
          </button>
        </div>
      </div>`).join('');
  }).catch(()=>{});
}
// Новий плейлист — власне модальне вікно замість prompt()/confirm().
// Публічний плейлист видно іншим на сторінці "Батл рояль"; за замовчуванням — приватний.
function createPlaylist(){
  const form = document.getElementById('create-playlist-form');
  form.reset();
  _setCreatePlaylistError('');
  _onCreatePlaylistInput();
  document.getElementById('create-playlist-submit').disabled = false;
  document.getElementById('create-playlist-modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('create-playlist-name').focus(), 60);
}
function closeCreatePlaylistModal(){
  _closeModalAnimated('create-playlist-modal-overlay');
}
function _setCreatePlaylistError(msg){
  document.getElementById('create-playlist-error').textContent = msg;
  document.getElementById('create-playlist-name').toggleAttribute('aria-invalid', !!msg);
}
function _onCreatePlaylistInput(){
  const input = document.getElementById('create-playlist-name');
  document.getElementById('create-playlist-count').textContent = `${input.value.length}/${input.maxLength}`;
  if(input.value.trim()) _setCreatePlaylistError('');
}
function submitCreatePlaylist(e){
  e.preventDefault();
  const input = document.getElementById('create-playlist-name');
  const name = input.value.trim();
  if(!name){ _setCreatePlaylistError(t('playlistModal.nameRequired')); input.focus(); return; }
  const isPublic = document.querySelector('input[name="create-playlist-visibility"]:checked')?.value === 'public';
  const btn = document.getElementById('create-playlist-submit');
  btn.disabled = true;
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, isPublic }) })
    .then(r=>{
      if(!r.ok) throw new Error('HTTP ' + r.status);
      closeCreatePlaylistModal();
      loadProfilePlaylists();
    })
    .catch(()=>{ _setCreatePlaylistError(t('msg.connectionError')); btn.disabled = false; });
}
document.getElementById('create-playlist-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeCreatePlaylistModal();
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.getElementById('create-playlist-modal-overlay').classList.contains('open')) closeCreatePlaylistModal();
});
function deletePlaylist(id){
  fetch(`/api/playlists/${id}`, { method:'DELETE' }).then(()=>loadProfilePlaylists()).catch(()=>{});
}
// Перемикач публічності — окремою кнопкою на кожному плейлисті, а не лише при створенні.
function togglePlaylistPublic(id, makePublic){
  fetch(`/api/playlists/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isPublic: makePublic }) })
    .then(r=>{ if(r.ok) loadProfilePlaylists(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ADD TO PLAYLIST (з головної таблиці — кнопка "➕")
// ================================================================
let addToPlaylistMusicId = null;
let _addToPlaylistNames = {};
// Плейлист — випадаючим списком (раніше — стовпчик карток, що з кількома плейлистами займав усе вікно).
// Типово обраний той, у який додавали востаннє; «＋ Новий плейлист…» показує поле назви.
function openAddToPlaylistModal(musicId){
  addToPlaylistMusicId = musicId;
  document.getElementById('add-to-playlist-new-name').value = '';
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    _addToPlaylistNames = Object.fromEntries(list.map(p => [p.id, p.name]));
    let last = null;
    try { last = localStorage.getItem('lastPlaylistId'); } catch(e){}
    const select = document.getElementById('add-to-playlist-select');
    select.innerHTML = list.map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(countLabel('count.songs', p.songCount))}</option>`).join('')
      + `<option value="new">＋ ${esc(t('profile.newPlaylistOption'))}</option>`;
    select.value = list.some(p => String(p.id) === last) ? last : (list[0] ? String(list[0].id) : 'new');
    _syncAddToPlaylistMode();
    document.getElementById('add-to-playlist-modal-overlay').classList.add('open');
  }).catch(()=>{ alert(t('msg.connectionError')); });
}
function _syncAddToPlaylistMode(){
  const isNew = document.getElementById('add-to-playlist-select').value === 'new';
  document.getElementById('add-to-playlist-new-wrap').style.display = isNew ? '' : 'none';
  document.getElementById('add-to-playlist-submit').textContent = t(isNew ? 'profile.createAndAddBtn' : 'profile.addBtn');
  if(isNew) setTimeout(() => document.getElementById('add-to-playlist-new-name').focus(), 30);
}
function submitAddToPlaylist(){
  const value = document.getElementById('add-to-playlist-select').value;
  if(value === 'new') createPlaylistAndAdd();
  else addSongToExistingPlaylist(+value);
}
// Симетричний вихід для всіх модалок сайту: додає .closing (запускає
// modalOut-анімацію через CSS), і лише після її завершення знімає .open —
// без цього display:none спрацював би миттєво, а анімація не встигла б програтись.
// Вікно підтвердження в стилі сайту замість браузерного confirm(), що показував
// "Подтвердите действие на musicdb-…azurewebsites.net" мовою браузера.
// Повертає Promise<boolean>. Esc / клік повз вікно — "ні", Enter — "так".
const _TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
const _USER_ICON = '<svg class="icon"><use href="#icon-user"/></svg>';
let _confirmResolve = null;
function confirmModal({ title, text, confirmLabel, danger = true, iconHtml = null }){
  if(_confirmResolve) _confirmResolve(false); // попереднє, якщо лишилось відкритим
  const overlay = document.getElementById('confirm-modal-overlay');
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-text').textContent = text;
  const icon = document.getElementById('confirm-modal-icon');
  icon.innerHTML = iconHtml ?? (danger ? _TRASH_ICON : _USER_ICON);
  icon.classList.toggle('info', !danger);
  const ok = document.getElementById('confirm-modal-ok');
  ok.textContent = confirmLabel;
  ok.classList.toggle('neutral', !danger);
  overlay.classList.add('open');
  setTimeout(() => ok.focus(), 30);
  return new Promise(resolve => { _confirmResolve = resolve; });
}
// Повідомлення в тому ж вікні замість браузерного alert(): одна кнопка "Гаразд".
function infoModal({ title, text, icon = 'sparkle' }){
  const cancel = document.getElementById('confirm-modal-cancel');
  cancel.style.display = 'none';
  return confirmModal({ title, text, confirmLabel: t('modal.ok'), danger: false, iconHtml: `<svg class="icon"><use href="#icon-${icon}"/></svg>` })
    .finally(() => { cancel.style.display = ''; });
}
function _finishConfirm(result){
  if(!_confirmResolve) return;
  const resolve = _confirmResolve;
  _confirmResolve = null;
  _closeModalAnimated('confirm-modal-overlay');
  resolve(result);
}
document.getElementById('confirm-modal-ok').addEventListener('click', () => _finishConfirm(true));
document.getElementById('confirm-modal-cancel').addEventListener('click', () => _finishConfirm(false));
document.getElementById('confirm-modal-overlay').addEventListener('click', function(e){ if(e.target === this) _finishConfirm(false); });
document.addEventListener('keydown', e => {
  if(!_confirmResolve) return;
  if(e.key === 'Escape'){ e.preventDefault(); _finishConfirm(false); }
  else if(e.key === 'Enter'){ e.preventDefault(); _finishConfirm(true); }
});
// Типовий випадок: дія потребує входу.
function confirmLogin(textKey = 'msg.confirmLoginGeneric'){
  confirmModal({ title: t('auth.loginRequiredTitle'), text: t(textKey), confirmLabel: t('auth.loginBtn'), danger: false })
    .then(ok => { if(ok) login(); });
}

function _closeModalAnimated(overlayId){
  const overlay = document.getElementById(overlayId);
  if(!overlay || !overlay.classList.contains('open')) return;
  overlay.classList.add('closing');
  setTimeout(() => overlay.classList.remove('open', 'closing'), 200);
}

function closeAddToPlaylistModal(){
  _closeModalAnimated('add-to-playlist-modal-overlay');
  addToPlaylistMusicId = null;
}
document.getElementById('add-to-playlist-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeAddToPlaylistModal();
});
function addSongToExistingPlaylist(playlistId, name){
  if(!addToPlaylistMusicId) return;
  fetch(`/api/playlists/${playlistId}/songs/${addToPlaylistMusicId}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      try { localStorage.setItem('lastPlaylistId', String(playlistId)); } catch(e){}
      closeAddToPlaylistModal();
      showToast(t('profile.addedToPlaylist').replace('{name}', name || _addToPlaylistNames[playlistId] || ''), () => openPlaylist(playlistId));
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function createPlaylistAndAdd(){
  const input = document.getElementById('add-to-playlist-new-name');
  const name = input.value.trim();
  if(!name){ input.focus(); return; }
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
    .then(r=>r.ok?r.json():null)
    .then(playlist=>{
      if(!playlist){ alert(t('msg.connectionError')); return; }
      return addSongToExistingPlaylist(playlist.id, name);
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
let currentPlaylistId = null;
function openPlaylist(id){
  currentPlaylistId = id;
  fetch(`/api/playlists/${id}`).then(r=>r.json()).then(p=>{
    currentPlaylistSongs = p.songs;
    document.getElementById('playlist-detail-title').textContent = p.name;
    const tbody = document.getElementById('playlist-detail-body');
    document.getElementById('playlist-detail-empty').style.display = p.songs.length ? 'none' : '';
    document.getElementById('playlist-play-all-btn').style.display = p.songs.length ? '' : 'none';
    tbody.innerHTML = p.songs.map(s=>`
      <tr>
        <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromPlaylist)" title="${t('profile.playBtn')}">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
        </button></td>
        <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-danger" onclick="removeSongFromPlaylist(${id},${s.id})" title="${t('modal.confirmDelete')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
        </button></td>
      </tr>`).join('');
    showPage('playlist');
  }).catch(()=>{});
}
function removeSongFromPlaylist(playlistId, musicId){
  fetch(`/api/playlists/${playlistId}/songs/${musicId}`, { method:'DELETE' }).then(()=>openPlaylist(playlistId)).catch(()=>{});
}
