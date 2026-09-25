// Виконавці: каталог, пошук, сторінка виконавця з дискографією й підпискою.

// ================================================================
// ВИКОНАВЦІ: каталог, пошук, сторінка виконавця з дискографією й підпискою
// ================================================================
let artistsSearchTimer = null;
function onArtistsSearchInput(){
  clearTimeout(artistsSearchTimer);
  artistsSearchTimer = setTimeout(loadArtistsPage, 350);
}
function loadArtistsPage(){
  const q = document.getElementById('artists-search').value.trim();
  fetch(`/api/artists${q ? '?q=' + encodeURIComponent(q) : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('artists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('artists-list').innerHTML = list.map(a=>`
      <div class="ext-search-item" onclick="openArtistPage(${a.id})">
        ${_artistAvatarHtml(a.name, a.imageUrl, 'xs')}<div class="es-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('artists.songsWord')}</span></div>
      </div>`).join('');
  }).catch(()=>{});
}
let currentArtistId = null;
let currentArtistSongs = [];
function openArtistPage(id){
  currentArtistId = id;
  showPage('artist');
}
// ─── Сторінка виконавця ──────────────────────────────────────────────────
// Шапка (фото або ініціали, статистика, жанри, дії), "Популярне", альбоми,
// повна дискографія, "Про виконавця" і схожі виконавці. Опис і фото — адмін.
let currentArtist = null;

// Ініціали на кольоровому тлі, якщо фото нема: колір стабільний для імені.
function _artistAvatarHtml(name, imageUrl, size = ''){
  const cls = `artist-avatar${size ? ' ' + size : ''}`;
  if(imageUrl) return `<span class="${cls}"><img src="${esc(imageUrl)}" alt="" loading="lazy"></span>`;
  let h = 0; for(const ch of name) h = (h*31 + ch.codePointAt(0)) >>> 0;
  const initials = name.split(/[\s&,/+-]+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase() || '?';
  return `<span class="${cls} artist-avatar-ph" style="--av:${WHEEL_COLORS[h % WHEEL_COLORS.length]}">${esc(initials)}</span>`;
}
function _songThumb(s){ return s?.youtubeVideoId ? `https://img.youtube.com/vi/${s.youtubeVideoId}/mqdefault.jpg` : null; }

function loadArtistPage(){
  const id = currentArtistId;
  if(id == null) return;
  document.getElementById('artist-content').style.display = 'none';
  document.getElementById('artist-not-found').style.display = 'none';
  Promise.all([
    fetch(`/api/artists/${id}`).then(r=>r.ok?r.json():null),
    fetch(`/api/artists/${id}/songs`).then(r=>r.ok?r.json():[]),
  ]).then(([a, list])=>{
    if(id !== currentArtistId) return; // уже відкрили іншого
    if(!a){ document.getElementById('artist-not-found').style.display = ''; return; }
    currentArtist = a;
    currentArtistSongs = list.slice().sort((x,y) => (y.release||'').localeCompare(x.release||''));
    document.getElementById('artist-content').style.display = '';
    _renderArtistHero();
    _renderArtistPopular();
    _renderArtistAlbums();
    _renderArtistDiscography();
    _renderArtistBio();
    _loadSimilarArtists(id);
  }).catch(()=>{ document.getElementById('artist-not-found').style.display = ''; });
}

function _renderArtistHero(){
  const a = currentArtist, list = currentArtistSongs;
  document.getElementById('artist-name').textContent = a.name;
  document.getElementById('artist-avatar').outerHTML = _artistAvatarHtml(a.name, a.imageUrl).replace('<span class="artist-avatar', '<span id="artist-avatar" class="artist-avatar');
  const cover = a.imageUrl || _songThumb(list.find(s => s.youtubeVideoId));
  document.getElementById('artist-hero-bg').style.backgroundImage = cover ? `url("${cover}")` : '';
  const albums = new Set(list.filter(s => s.album).map(s => s.album)).size;
  const plays = list.reduce((sum, s) => sum + (s.playCount || 0), 0);
  const years = list.map(s => (s.release || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y) && y !== '0001').sort();
  const stats = [
    `<b>${a.songCount}</b> ${esc(t('artists.songsWord'))}`,
    albums ? `<b>${albums}</b> ${esc(t('artist.albumsWord'))}` : null,
    `<b>${a.followerCount}</b> ${esc(t('artist.followers'))}`,
    plays ? `<b>${plays}</b> ${esc(t('artist.listenersWord'))}` : null,
    years.length ? `${years[0]}${years.at(-1) !== years[0] ? '–' + years.at(-1) : ''}` : null,
  ].filter(Boolean);
  document.getElementById('artist-stats').innerHTML = stats.map(s => `<span>${s}</span>`).join('');
  const genreCounts = new Map();
  list.forEach(s => s.genres.forEach(g => genreCounts.set(g, (genreCounts.get(g) || 0) + 1)));
  document.getElementById('artist-genres').innerHTML = [...genreCounts.entries()].sort((x,y) => y[1]-x[1]).slice(0, 6)
    .map(([g]) => `<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
  const btn = document.getElementById('artist-follow-btn');
  btn.innerHTML = a.isFollowing ? `<svg class="icon"><use href="#icon-check"/></svg> ${esc(t('artist.unfollowBtn'))}` : esc(t('artist.followBtn'));
  btn.classList.toggle('active', !!a.isFollowing);
  btn.style.display = currentUser?.authenticated ? '' : 'none';
  document.getElementById('artist-edit-btn').style.display = currentUser?.isAdmin ? '' : 'none';
}

// Найпрослуханіші 5 (за унікальними слухачами, далі — за оцінкою).
function _artistPopularSongs(){
  return currentArtistSongs.slice().sort((x,y) => (y.playCount||0)-(x.playCount||0) || (y.avgRating||0)-(x.avgRating||0)).slice(0, 5);
}
function _renderArtistPopular(){
  const top = _artistPopularSongs();
  document.getElementById('artist-popular-section').style.display = top.length ? '' : 'none';
  document.getElementById('artist-popular').innerHTML = top.map((s,i) => {
    const thumb = _songThumb(s);
    return `
      <div class="artist-pop-row" onclick="playArtistSong(${s.id}, 'popular')">
        <span class="artist-pop-n">${i+1}</span>
        <span class="artist-pop-cover">${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : '<svg class="icon"><use href="#icon-music"/></svg>'}</span>
        <span class="artist-pop-main"><strong>${esc(s.title)}</strong><span>${esc(s.album || t('table.single'))}</span></span>
        <span class="artist-pop-plays" title="${esc(t('table.plays'))}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount || 0}</span>
        <span class="artist-pop-dur">${esc(_shortDuration(s.duration))}</span>
      </div>`;
  }).join('');
}
function _shortDuration(d){
  const m = /^(\d+):(\d+):(\d+)/.exec(d || '');
  if(!m) return d || '';
  const h = +m[1], min = +m[2], sec = m[3];
  return h ? `${h}:${String(min).padStart(2,'0')}:${sec}` : `${min}:${sec}`;
}

function _artistAlbums(){
  const map = new Map();
  for(const s of currentArtistSongs){
    if(!s.album) continue;
    if(!map.has(s.album)) map.set(s.album, []);
    map.get(s.album).push(s);
  }
  return [...map.entries()].map(([name, songs]) => {
    songs.sort((x,y) => (x.release||'').localeCompare(y.release||'') || x.title.localeCompare(y.title));
    return { name, songs, year: (songs[0].release || '').slice(0, 4), cover: _songThumb(songs.find(s => s.youtubeVideoId)) };
  }).sort((x,y) => y.year.localeCompare(x.year));
}
function _renderArtistAlbums(){
  const albums = _artistAlbums();
  document.getElementById('artist-albums-section').style.display = albums.length ? '' : 'none';
  document.getElementById('artist-albums').innerHTML = albums.map((al, i) => `
    <button type="button" class="artist-album" onclick="playArtistAlbum(${i})">
      <span class="artist-album-cover">${al.cover ? `<img src="${al.cover}" alt="" loading="lazy">` : '<svg class="icon"><use href="#icon-disc"/></svg>'}<span class="artist-album-play"><svg class="icon icon-filled"><use href="#icon-play"/></svg></span></span>
      <strong title="${esc(al.name)}">${esc(al.name)}</strong>
      <span>${al.year && al.year !== '0001' ? al.year + ' · ' : ''}${al.songs.length} ${esc(t('artists.songsWord'))}</span>
    </button>`).join('');
}
function _renderArtistDiscography(){
  document.getElementById('artist-songs-body').innerHTML = currentArtistSongs.map(s=>`
    <tr>
      <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromArtist)" title="${t('profile.playBtn')}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button></td>
      <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
      <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
    </tr>`).join('');
}
function _renderArtistBio(){
  const bio = currentArtist.bio;
  const el = document.getElementById('artist-bio');
  el.classList.toggle('empty-bio', !bio);
  el.textContent = bio || t(currentUser?.isAdmin ? 'artist.noBioAdmin' : 'artist.noBio');
}
function _loadSimilarArtists(id){
  const wrap = document.getElementById('artist-similar');
  wrap.innerHTML = '';
  fetch(`/api/artists/${id}/similar`).then(r=>r.ok?r.json():[]).then(list=>{
    if(id !== currentArtistId) return;
    document.getElementById('artist-similar-section').style.display = list.length ? '' : 'none';
    wrap.innerHTML = list.map(a => `
      <div class="artist-similar-item" onclick="openArtistPage(${a.id})">
        ${_artistAvatarHtml(a.name, a.imageUrl, 'xs')}
        <span class="artist-similar-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${esc(t('artists.songsWord'))} · ${a.score}%</span></span>
      </div>`).join('');
  }).catch(()=>{ document.getElementById('artist-similar-section').style.display = 'none'; });
}

function _playArtistQueue(queue, id){
  if(!queue.length) return;
  playerQueue = queue.slice();
  playerIndex = Math.max(0, playerQueue.findIndex(s=>s.id===id));
  _loadCurrent();
}
function playFromArtist(id){ _playArtistQueue(currentArtistSongs, id); }
function playArtistSong(id, from){ _playArtistQueue(from === 'popular' ? _artistPopularSongs() : currentArtistSongs, id); }
function playArtistAlbum(i){ const al = _artistAlbums()[i]; if(al) _playArtistQueue(al.songs, al.songs[0].id); }
function playArtistAll(shuffle){
  const list = shuffle ? _shuffledCopy(currentArtistSongs) : currentArtistSongs;
  if(list.length) _playArtistQueue(list, list[0].id);
}

// ─── Адмін: опис і фото виконавця ─────────────────────────────────────────
let _artistEditFile = null, _artistEditRemove = false;
function openArtistEditModal(){
  if(!currentUser?.isAdmin || !currentArtist) return;
  _artistEditFile = null; _artistEditRemove = false;
  document.getElementById('artist-edit-file').value = '';
  document.getElementById('artist-edit-bio').value = currentArtist.bio || '';
  document.getElementById('artist-edit-status').textContent = '';
  _renderArtistEditPreview(currentArtist.imageUrl);
  document.getElementById('artist-edit-modal-overlay').classList.add('open');
}
function _renderArtistEditPreview(url){
  document.getElementById('artist-edit-preview').outerHTML =
    _artistAvatarHtml(currentArtist.name, url, 'sm').replace('<span class="artist-avatar', '<span id="artist-edit-preview" class="artist-avatar');
  document.getElementById('artist-edit-remove').style.display = url ? '' : 'none';
}
function onArtistPhotoSelected(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ document.getElementById('artist-edit-status').textContent = t('artist.photoTooLarge'); input.value = ''; return; }
  _artistEditFile = file; _artistEditRemove = false;
  _renderArtistEditPreview(URL.createObjectURL(file));
}
function removeArtistPhoto(){
  _artistEditFile = null; _artistEditRemove = true;
  document.getElementById('artist-edit-file').value = '';
  _renderArtistEditPreview(null);
}
function closeArtistEditModal(){ _closeModalAnimated('artist-edit-modal-overlay'); }
async function saveArtistEdit(){
  const id = currentArtist?.id;
  if(id == null) return;
  const btn = document.getElementById('artist-edit-save');
  const status = document.getElementById('artist-edit-status');
  btn.disabled = true; status.textContent = t('msg.uploading');
  try {
    const bio = document.getElementById('artist-edit-bio').value;
    let r = await fetch(`/api/artists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio }) });
    if(r.ok && _artistEditFile){
      const fd = new FormData(); fd.append('image', _artistEditFile);
      r = await fetch(`/api/artists/${id}/image`, { method: 'PUT', body: fd });
    } else if(r.ok && _artistEditRemove){
      r = await fetch(`/api/artists/${id}/image`, { method: 'DELETE' });
    }
    if(!r.ok){ status.textContent = t('msg.connectionError') + (r.status === 400 ? ' ' + await r.text() : ''); return; }
    closeArtistEditModal();
    loadArtistPage();
  } catch(e){
    status.textContent = t('msg.connectionError');
  } finally {
    btn.disabled = false;
  }
}
document.getElementById('artist-edit-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeArtistEditModal();
});
function toggleArtistFollow(){
  if(!currentUser?.authenticated){ login(); return; }
  const id = currentArtistId;
  if(id == null) return;
  const btn = document.getElementById('artist-follow-btn');
  const wasFollowing = btn.classList.contains('active');
  const method = wasFollowing ? 'DELETE' : 'POST';
  fetch(`/api/artists/${id}/follow`, { method })
    .then(r=>{ if(r.ok) loadArtistPage(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
