// Виконавці: каталог, пошук, сторінка виконавця з дискографією й підпискою.

// ================================================================
// ВИКОНАВЦІ: каталог, пошук, сторінка виконавця з дискографією й підпискою
// ================================================================
let artistsSearchTimer = null;
function onArtistsSearchInput(){
  clearTimeout(artistsSearchTimer);
  artistsSearchTimer = setTimeout(loadArtistsPage, 350);
}
// Каталог приходить увесь і вже відсортований сервером; малюємо порціями — виконавців тисячі.
const ARTISTS_CHUNK = 60;
const ARTIST_SORTS = ['songs', 'plays', 'followers', 'name', 'name_desc', 'new'];
let _artistsAll = [], _artistsShown = 0, _artistsReq = 0;
function _artistsSortValue(){
  const sel = document.getElementById('artists-sort');
  if(!sel.dataset.ready){ // вибір сортування пам'ятається між візитами (лише зручність — без нього типове)
    try { const saved = localStorage.getItem('artistsSort'); if(ARTIST_SORTS.includes(saved)) sel.value = saved; } catch(e) {}
    sel.dataset.ready = '1';
  }
  return sel.value;
}
function onArtistsSortChange(v){
  try { localStorage.setItem('artistsSort', v); } catch(e) {}
  loadArtistsPage();
}
function loadArtistsPage(){
  const q = document.getElementById('artists-search').value.trim();
  const sort = _artistsSortValue();
  const req = ++_artistsReq;
  fetch(`/api/artists?sort=${sort}${q ? '&q=' + encodeURIComponent(q) : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    if(req !== _artistsReq) return; // уже прийшла новіша відповідь (інший пошук чи сортування)
    _artistsAll = list; _artistsShown = 0;
    document.getElementById('artists-list').innerHTML = '';
    document.getElementById('artists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('artists-count').textContent = list.length ? t('artists.total').replace('{n}', list.length) : '';
    showMoreArtists();
  }).catch(()=>{});
}
function _artistCardLine(a){
  return [countLabel('count.songs', a.songCount),
    a.playCount ? countLabel('count.plays', a.playCount) : null,
    a.followerCount ? countLabel('count.followers', a.followerCount) : null].filter(Boolean).join(' · ');
}
function showMoreArtists(){
  const next = _artistsAll.slice(_artistsShown, _artistsShown + ARTISTS_CHUNK);
  _artistsShown += next.length;
  document.getElementById('artists-list').insertAdjacentHTML('beforeend', next.map(a=>`
    <div class="artist-tile" role="button" tabindex="0" onclick="openArtistPage(${a.id})" onkeydown="if(event.key==='Enter')openArtistPage(${a.id})">
      ${_artistAvatarHtml(a.name, a.imageUrl, 'sm')}<div class="artist-tile-main"><strong title="${esc(a.name)}">${esc(a.name)}</strong><span>${esc(_artistCardLine(a))}</span></div>
    </div>`).join(''));
  document.getElementById('artists-more').style.display = _artistsShown < _artistsAll.length ? '' : 'none';
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
    if(currentArtist?.id !== a.id){ const q = document.getElementById('artist-songs-search'); if(q) q.value = ''; }
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
    `<b>${a.songCount}</b> ${esc(plural('count.songs', a.songCount))}`,
    albums ? `<b>${albums}</b> ${esc(plural('count.albums', albums))}` : null,
    `<b>${a.followerCount}</b> ${esc(plural('count.followers', a.followerCount))}`,
    plays ? `<b>${plays}</b> ${esc(plural('count.plays', plays))}` : null,
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
  document.getElementById('artist-suggest-btn').style.display = currentUser?.authenticated && !currentUser?.isAdmin ? '' : 'none';
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
    songs.sort(_albumTrackOrder);
    return { name, songs, year: _albumYear(songs), cover: songs.find(s => s.albumCover)?.albumCover || _songThumb(songs.find(s => s.youtubeVideoId)) };
  }).sort((x,y) => y.year.localeCompare(x.year));
}
// Порядок як в оригіналі (номер треку); без номера — за датою, потім за назвою.
function _albumTrackOrder(x, y){
  return (x.trackNumber ?? 1e4) - (y.trackNumber ?? 1e4) || (x.release||'').localeCompare(y.release||'') || x.title.localeCompare(y.title);
}
// Рік альбому — його власна дата; інакше найраніша пісня (сингл міг вийти раніше за альбом).
function _albumYear(songs){
  const d = songs.find(s => s.albumRelease)?.albumRelease || songs.map(s => s.release || '').filter(Boolean).sort()[0] || '';
  return d.slice(0, 4);
}
function _renderArtistAlbums(){
  const albums = _artistAlbums();
  document.getElementById('artist-albums-section').style.display = albums.length ? '' : 'none';
  // Картка відкриває альбом (список пісень), кнопка ▶ на обкладинці — одразу грає.
  document.getElementById('artist-albums').innerHTML = albums.map((al, i) => `
    <div class="artist-album" role="button" tabindex="0" onclick="openArtistAlbum(${i})" onkeydown="if(event.key==='Enter')openArtistAlbum(${i})" title="${esc(t('album.open'))}">
      <span class="artist-album-cover">${al.cover ? `<img src="${al.cover}" alt="" loading="lazy">` : '<svg class="icon"><use href="#icon-disc"/></svg>'}<button type="button" class="artist-album-play" onclick="event.stopPropagation();playArtistAlbum(${i})" title="${esc(t('artist.playAll'))}" aria-label="${esc(t('artist.playAll'))}"><svg class="icon icon-filled"><use href="#icon-play"/></svg></button></span>
      <strong title="${esc(al.name)}">${esc(al.name)}</strong>
      <span>${al.year && al.year !== '0001' ? al.year + ' · ' : ''}${esc(countLabel('count.songs', al.songs.length))}</span>
    </div>`).join('');
}
// Пошук у дискографії: усі слова запиту мають знайтись у назві, альбомі, виконавцях, жанрах чи році.
function _artistShownSongs(){
  const words = (document.getElementById('artist-songs-search')?.value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!words.length) return currentArtistSongs;
  return currentArtistSongs.filter(s => {
    const hay = `${s.title} ${s.album || ''} ${s.artist} ${s.genres.join(' ')} ${(s.release || '').slice(0, 4)}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
let _artistSearchTimer = null;
function onArtistSongsSearch(){
  clearTimeout(_artistSearchTimer);
  _artistSearchTimer = setTimeout(_renderArtistDiscography, 120);
}
function _renderArtistDiscography(){
  const shown = _artistShownSongs();
  const searching = shown !== currentArtistSongs;
  document.getElementById('artist-disco-search').style.display = currentArtistSongs.length > 6 ? '' : 'none';
  document.getElementById('artist-disco-count').textContent = searching
    ? t('artist.found').replace('{n}', shown.length).replace('{total}', currentArtistSongs.length)
    : countLabel('count.songs', currentArtistSongs.length);
  if(!shown.length){
    document.getElementById('artist-songs-body').innerHTML = `<tr><td colspan="4" class="empty-cell">${esc(t('table.empty'))}</td></tr>`;
    return;
  }
  document.getElementById('artist-songs-body').innerHTML = shown.map(s=>`
    <tr>
      <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromArtist)" title="${t('profile.playBtn')}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button></td>
      <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
      <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
    </tr>`).join('');
}
// Опис мовою інтерфейсу; якщо його немає — іншою мовою, аби не лишати сторінку порожньою.
function _artistBio(a){
  return currentLang === 'en' ? (a.bioEn || a.bio) : (a.bio || a.bioEn);
}
function _renderArtistBio(){
  const bio = _artistBio(currentArtist);
  const el = document.getElementById('artist-bio');
  el.classList.toggle('empty-bio', !bio);
  if(bio) el.innerHTML = _bioHtml(bio);
  else el.textContent = t(currentUser?.isAdmin ? 'artist.noBioAdmin' : 'artist.noBio');
}
// Опис з Вікіпедії: без службових позначок («[коли?]», «[1]»), рядок «Джерело: Вікіпедія — URL» — посиланням.
function _bioHtml(bio){
  const text = bio.replace(/\[(?:\d+|[^\]\n]{1,25}\?|citation needed|уточнити|джерело не вказано[^\]\n]*)\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ').trim();
  const m = /\n?\s*(?:Джерело|Source):\s*(.+?)\s+[—–-]\s+(https?:\/\/\S+)\s*$/.exec(text);
  if(!m) return esc(text);
  const name = /^(вікіпедія|wikipedia)$/i.test(m[1]) ? t('artist.wikipedia') : m[1];
  return `${esc(text.slice(0, m.index).trim())}<span class="artist-bio-source">${esc(t('artist.source'))}: `
    + `<a href="${esc(m[2])}" target="_blank" rel="noopener noreferrer">${esc(name)}</a></span>`;
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
        <span class="artist-similar-main"><strong>${esc(a.name)}</strong><span>${esc(countLabel('count.songs', a.songCount))} · ${a.score}%</span></span>
      </div>`).join('');
  }).catch(()=>{ document.getElementById('artist-similar-section').style.display = 'none'; });
}

function _playArtistQueue(queue, id){
  if(!queue.length) return;
  playerQueue = queue.slice();
  playerIndex = Math.max(0, playerQueue.findIndex(s=>s.id===id));
  _loadCurrent();
}
function playFromArtist(id){ _playArtistQueue(_artistShownSongs(), id); }
function playArtistSong(id, from){ _playArtistQueue(from === 'popular' ? _artistPopularSongs() : currentArtistSongs, id); }
function playArtistAlbum(i){ const al = _artistAlbums()[i]; if(al) _playArtistQueue(al.songs, al.songs[0].id); }
// ─── Альбом: обкладинка, рік, пісні — подивитись, а не лише ввімкнути ─────
let _openAlbumIdx = null;
function _durSeconds(d){
  const p = String(d || '').split(':').map(Number);
  return p.length === 3 ? p[0]*3600 + p[1]*60 + p[2] : p.length === 2 ? p[0]*60 + p[1] : 0;
}
function openArtistAlbum(i){
  const al = _artistAlbums()[i];
  if(!al) return;
  _openAlbumIdx = i;
  const total = al.songs.reduce((sum, s) => sum + _durSeconds(s.duration), 0);
  const plays = al.songs.reduce((sum, s) => sum + (s.playCount || 0), 0);
  const cover = document.getElementById('album-cover');
  cover.innerHTML = al.cover ? `<img src="${al.cover}" alt="">` : '<svg class="icon"><use href="#icon-disc"/></svg>';
  document.getElementById('album-bg').style.backgroundImage = al.cover ? `url("${al.cover}")` : '';
  const title = document.getElementById('album-title');
  title.textContent = al.name;
  title.title = al.name;
  // Довгі назви (бувають на сотні символів) — дрібніше, дуже довгі — у 3 рядки з розгортанням по кліку.
  title.classList.toggle('long', al.name.length > 40 && al.name.length <= 90);
  title.classList.toggle('xlong', al.name.length > 90);
  title.classList.remove('expanded');
  document.getElementById('album-artist').textContent = currentArtist?.name || '';
  document.getElementById('album-meta').textContent = [
    al.year && al.year !== '0001' ? al.year : null,
    countLabel('count.songs', al.songs.length),
    total ? t('album.minutes').replace('{n}', Math.max(1, Math.round(total / 60))) : null,
    plays ? countLabel('count.plays', plays) : null,
  ].filter(Boolean).join(' · ');
  const curId = playerQueue[playerIndex]?.id;
  document.getElementById('album-tracks').innerHTML = al.songs.map((s, k) => `
    <div class="album-track${s.id === curId ? ' playing' : ''}" onclick="playAlbumTrack(${k})">
      <span class="album-track-n"><span>${k + 1}</span><svg class="icon icon-filled"><use href="#icon-play"/></svg></span>
      <span class="album-track-main"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}</span></span>
      <span class="album-track-plays" title="${esc(t('table.plays'))}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount || 0}</span>
      <span class="album-track-dur">${esc(_shortDuration(s.duration))}</span>
      <button type="button" class="q-btn" onclick="event.stopPropagation();addToQueue(${s.id})" title="${esc(t('queue.add'))}"><svg class="icon"><use href="#icon-plus"/></svg></button>
    </div>`).join('');
  document.getElementById('album-modal-overlay').classList.add('open');
}
function closeAlbumModal(){ _closeModalAnimated('album-modal-overlay'); }
function _openAlbum(){ return _openAlbumIdx == null ? null : _artistAlbums()[_openAlbumIdx]; }
function playAlbumTrack(k){ const al = _openAlbum(); if(al){ _playArtistQueue(al.songs, al.songs[k].id); openArtistAlbum(_openAlbumIdx); } }
function playOpenAlbum(shuffleIt){
  const al = _openAlbum();
  if(!al) return;
  const list = shuffleIt ? _shuffledCopy(al.songs) : al.songs;
  _playArtistQueue(list, list[0].id);
  openArtistAlbum(_openAlbumIdx);
}
function queueOpenAlbum(){ const al = _openAlbum(); if(al) addManyToQueue(al.songs.map(s => s.id)); }

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
  document.getElementById('artist-edit-bio-en').value = currentArtist.bioEn || '';
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
    const bioEn = document.getElementById('artist-edit-bio-en').value;
    let r = await fetch(`/api/artists/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio, bioEn }) });
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
