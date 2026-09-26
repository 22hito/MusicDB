// Власний профіль: дані, аватарка, улюблені, плейлисти; додавання пісні в плейлист;
// спільні модальні вікна (confirmModal, _closeModalAnimated).

// ================================================================
// PROFILE (профіль, улюблені, плейлисти)
// ================================================================
let profileAvatarValue = null;   // поточне значення аватарки, яке буде надіслано при збереженні
let profileGooglePicture = null; // фото з Google-акаунту (фолбек, якщо своєї аватарки нема)
// Картка профілю (як у застосунку): аватар натисканням, нікнейм і "Зберегти" — прямо тут.
let _profileLabel = '';
function _renderProfileAvatar(){
  const shown = profileAvatarValue || profileGooglePicture;
  const picEl = document.getElementById('profile-view-picture');
  const picPh = document.getElementById('profile-view-picture-ph');
  // .avatar-initials задає display з !important — тож при фото знімаємо клас, а не лише ховаємо.
  if(shown){ picEl.src = shown; picEl.style.display = ''; picPh.style.display = 'none'; picPh.classList.remove('avatar-initials'); picPh.textContent = ''; }
  else { picEl.style.display = 'none'; picPh.style.display = ''; fillAvatarPlaceholder(picPh, _profileLabel); }
  document.getElementById('profile-avatar-remove').style.display = profileAvatarValue ? '' : 'none';
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
    _renderProfileAvatar();
    document.getElementById('profile-stat-listened').textContent = p.totalListened;
    document.getElementById('profile-stat-favorites').textContent = p.favoritesCount;
    document.getElementById('profile-stat-playlists').textContent = p.playlistsCount;

    const genresWrap = document.getElementById('profile-top-genres-wrap');
    if(p.topGenres && p.topGenres.length){
      document.getElementById('profile-top-genres').innerHTML = p.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
      genresWrap.style.display = 'block';
    } else genresWrap.style.display = 'none';
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
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
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
function openAddToPlaylistModal(musicId){
  addToPlaylistMusicId = musicId;
  document.getElementById('add-to-playlist-new-name').value = '';
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    const wrap = document.getElementById('add-to-playlist-list');
    document.getElementById('add-to-playlist-empty').style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="addSongToExistingPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');
    document.getElementById('add-to-playlist-modal-overlay').classList.add('open');
  }).catch(()=>{ alert(t('msg.connectionError')); });
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
function addSongToExistingPlaylist(playlistId){
  if(!addToPlaylistMusicId) return;
  fetch(`/api/playlists/${playlistId}/songs/${addToPlaylistMusicId}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      closeAddToPlaylistModal();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function createPlaylistAndAdd(){
  const name = document.getElementById('add-to-playlist-new-name').value.trim();
  if(!name){ alert(t('msg.fillRequiredFields')); return; }
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
    .then(r=>r.ok?r.json():null)
    .then(playlist=>{
      if(!playlist){ alert(t('msg.connectionError')); return; }
      return addSongToExistingPlaylist(playlist.id);
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
