// Форми: заявка на пісню, автозаповнення з iTunes, редагування заявки й пісні адміном.

// ================================================================
// FORMS

// ================================================================
// Форма заявки доступна лише авторизованим — інакше пропонуємо спочатку увійти.
// kind ('catalog'|'community') — з якої таблиці прийшли; без нього лишається попередній вибір.
function openRequestPage(kind){
  if(!currentUser?.authenticated){
    confirmLogin('msg.confirmLoginForRequest');
    return;
  }
  if(kind) setSongFormKind('req', kind);
  showPage('request');
}

// Форми заявки ('req') і адмінського додавання ('add'): таблиця_1 чи таблиця_2.
const songFormKind = { req: 'catalog', add: 'catalog' };
function setSongFormKind(prefix, kind){
  songFormKind[prefix] = kind === 'community' ? 'community' : 'catalog';
  const isCommunity = songFormKind[prefix] === 'community';
  document.getElementById(`${prefix}-kind-catalog`).classList.toggle('active', !isCommunity);
  document.getElementById(`${prefix}-kind-community`).classList.toggle('active', isCommunity);
  document.getElementById(`${prefix}-community-fields`).style.display = isCommunity ? '' : 'none';
}
// Тривалість (і назва, якщо порожня) — одразу з самого файлу, щоб не вводити вручну.
function onCommunityAudioSelected(prefix){
  const file = document.getElementById(`${prefix}-audio`).files[0];
  if(!file) return;
  const titleEl = document.getElementById(`${prefix}-title`);
  if(!titleEl.value.trim()) titleEl.value = file.name.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(file);
  const probe = new Audio();
  probe.preload = 'metadata';
  probe.onloadedmetadata = () => {
    const d = Math.round(probe.duration);
    if(isFinite(d) && d > 0){
      const hh = String(Math.floor(d/3600)).padStart(2,'0'), mm = String(Math.floor(d%3600/60)).padStart(2,'0'), ss = String(d%60).padStart(2,'0');
      document.getElementById(`${prefix}-duration`).value = `${hh}:${mm}:${ss}`;
    }
    URL.revokeObjectURL(url);
  };
  probe.onerror = () => URL.revokeObjectURL(url);
  probe.src = url;
}
// multipart-тіло для /api/requests/community і /api/songs/community; null — не вистачає файлу/відео.
function _buildCommunityForm(prefix, fields){
  const file = document.getElementById(`${prefix}-audio`).files[0];
  const youtube = document.getElementById(`${prefix}-youtube`).value.trim();
  if(!file && !youtube){ alert(t('msg.communityNeedsFileOrVideo')); return null; }
  if(file && file.size > 25*1024*1024){ alert(t('msg.audioTooLarge')); return null; }
  const fd = new FormData();
  Object.entries(fields).forEach(([k,v])=>{ if(v!=null) fd.append(k, v); });
  if(youtube) fd.append('youtubeVideo', youtube);
  if(file) fd.append('audio', file);
  return fd;
}
function _clearCommunityFields(prefix){
  document.getElementById(`${prefix}-audio`).value = '';
  document.getElementById(`${prefix}-youtube`).value = '';
}
// Кнопка на час завантаження файлу — fetch не дає прогресу, тож хоча б явний стан.
function _setBusy(btnId, busy){
  const btn = document.getElementById(btnId);
  if(!btn) return;
  if(busy){ btn.dataset.label = btn.textContent; btn.textContent = t('msg.uploading'); btn.disabled = true; }
  else { if(btn.dataset.label) btn.textContent = btn.dataset.label; btn.disabled = false; }
}

// ================================================================
// EXTERNAL SEARCH (iTunes) — автозаповнення форми запиту/додавання
// ================================================================
let extSearchTimer = null;
function onRequestSearchInput(){
  clearTimeout(extSearchTimer);
  extSearchTimer = setTimeout(()=>runExternalSearch('req'), 450);
}
let addExtSearchTimer = null;
function onAddSearchInput(){
  clearTimeout(addExtSearchTimer);
  addExtSearchTimer = setTimeout(()=>runExternalSearch('add'), 450);
}
let editReqExtSearchTimer = null;
function onEditReqSearchInput(){
  clearTimeout(editReqExtSearchTimer);
  editReqExtSearchTimer = setTimeout(()=>runExternalSearch('edit-req'), 450);
}
function renderExtSearchItem(it, idx, prefix){
  const genreBadges = (it.genre||'').split(',').map(g=>g.trim()).filter(Boolean)
    .map(g=>`<span class="es-genre-badge">${esc(g)}</span>`).join('');
  return `
    <div class="ext-search-item" onclick="applyExternalResult('${prefix}',${idx})">
      <div class="es-main">
        <strong>${esc(it.artist)}</strong>
        <span>${esc(it.title)}</span>
        ${it.album?`<span><svg class="icon"><use href="#icon-disc"/></svg> ${esc(it.album)}</span>`:''}
      </div>
      <div class="es-meta">
        ${it.release?`<span class="es-year">${esc(it.release.slice(0,4))}</span>`:''}
        ${genreBadges}
        ${it.duration?`<span class="es-year">${esc(it.duration)}</span>`:''}
      </div>
    </div>`;
}
// Кеш результатів на префікс форми (req/add/edit-req).
const _extSearchCaches = {};
function runExternalSearch(prefix){
  const artistId = `${prefix}-artist`;
  const titleId = `${prefix}-title`;
  const albumId = `${prefix}-album`;
  // Форма "Надіслати запит" (prefix 'req') історично без префікса в id панелі.
  const panelId = prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`;
  const resultsId = prefix==='req' ? 'ext-search-results' : `${prefix}-ext-search-results`;

  const artist = document.getElementById(artistId).value.trim();
  const title = document.getElementById(titleId).value.trim();
  const album = document.getElementById(albumId).value.trim();
  const query = `${artist} ${title} ${album}`.trim();
  const panel = document.getElementById(panelId);
  const results = document.getElementById(resultsId);

  if(query.length < 2){
    panel.style.display = 'none';
    results.innerHTML = '';
    return;
  }

  const params = new URLSearchParams({ artist, title, album });
  fetch(`/api/external-search?${params.toString()}`)
    .then(r=>r.ok?r.json():[])
    .then(items=>{
      if(!items.length){ panel.style.display='none'; results.innerHTML=''; return; }
      results.innerHTML = items.map((it,idx)=>renderExtSearchItem(it, idx, prefix)).join('');
      _extSearchCaches[prefix] = items;
      panel.style.display = 'block';
    })
    .catch(()=>{ panel.style.display='none'; });
}
function applyExternalResult(prefix, idx){
  const it = (_extSearchCaches[prefix]||[])[idx];
  if(!it) return;
  document.getElementById(`${prefix}-artist`).value = it.artist || '';
  document.getElementById(`${prefix}-title`).value = it.title || '';
  if(it.release) document.getElementById(`${prefix}-release`).value = it.release;
  if(it.duration) document.getElementById(`${prefix}-duration`).value = it.duration;
  // Альбом підставляємо тільки якщо реальний — бекенд уже відфільтрував фейкові "Назва - Single".
  document.getElementById(`${prefix}-album`).value = it.album || '';
  document.getElementById(prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`).style.display = 'none';

  // iTunes дає лише один загальний жанр — жанр запитуємо в ШІ тільки для обраної пісні,
  // не для всього списку підказок (щадимо квоту безкоштовного Gemini).
  const genresField = document.getElementById(`${prefix}-genres`);
  const genresHint = document.getElementById(`${prefix}-genres-hint`);
  genresField.value = it.genre || '';
  const originalHint = genresHint.textContent;
  genresHint.textContent = t('extsearch.analyzingGenres');
  genresHint.style.color = 'var(--accent2)';
  const params = new URLSearchParams({ artist: it.artist||'', title: it.title||'', hint: it.genre||'' });
  fetch(`/api/external-search/genres?${params.toString()}`)
    .then(r=>r.ok?r.json():null)
    .then(genreStr=>{
      if(genreStr) genresField.value = genreStr;
    })
    .catch(()=>{})
    .finally(()=>{ genresHint.textContent = originalHint; genresHint.style.color = ''; });
}

function submitRequest(){
  if(!currentUser?.authenticated){alert(t('msg.needLoginForRequest'));login();return;}
  const a=document.getElementById('req-artist').value.trim();
  const t2=document.getElementById('req-title').value.trim();
  const r=document.getElementById('req-release').value;
  const d=document.getElementById('req-duration').value.trim();
  const al=document.getElementById('req-album').value.trim();
  const gr=document.getElementById('req-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const isCommunity = songFormKind.req === 'community';
  let request;
  if(isCommunity){
    const fd = _buildCommunityForm('req', {artist:a,title:t2,release:r,duration:d,genres:gr,album:al||null});
    if(!fd) return;
    request = {method:'POST',body:fd};
  } else {
    const body={artist:a,title:t2,release:r,duration:d,genres:gr.split(',').map(g=>g.trim()).filter(Boolean),albumTitle:al||null};
    request = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  }
  const clearReq = () => {
    ['req-artist','req-title','req-release','req-duration','req-album','req-genres'].forEach(i=>document.getElementById(i).value='');
    _clearCommunityFields('req');
    document.getElementById('ext-search-panel').style.display = 'none';
  };
  const showReqOk = () => { const el=document.getElementById('req-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  _setBusy('req-submit-btn', true);
  fetch(isCommunity ? '/api/requests/community' : '/api/requests', request)
    .then(async res=>{
      if(res.status===401){alert(t('msg.needLoginGeneric'));login();return;}
      if(!res.ok){alert(t('msg.errorSubmittingRequest') + (res.status===400 ? '\n' + await res.text() : ''));return;}
      clearReq(); showReqOk();
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>_setBusy('req-submit-btn', false));
}

// Підтаби всередині "Адмін-панелі" — перемикають ті самі блоки, що раніше були окремими вкладками навбару.
function switchAdminHubTab(tab){
  ['requests','add','bugs'].forEach(k=>{
    document.getElementById(`admin-hub-${k}-section`).style.display = tab===k ? '' : 'none';
    document.getElementById(`admin-hub-tab-${k}`).classList.toggle('active', tab===k);
  });
  if(tab==='bugs') loadBugReports();
}
// Зі сповіщення про баг-репорт — одразу на вкладку "Баг-репорти", решта — на заявки.
let _pendingAdminHubTab = null;
function openAdminHub(eventType){
  _pendingAdminHubTab = eventType === 'bug_reported' ? 'bugs' : null;
  showPage('admin-hub');
}
function renderRequests(){
  if(!currentUser?.isAdmin){
    document.getElementById('requests-table-wrap').style.display='none';
    document.getElementById('requests-empty').style.display='block';
    return;
  }
  fetch('/api/requests')
    .then(r=>{
      if(r.status===401||r.status===403){return [];}
      return r.json();
    })
    .catch(()=>[])
    .then(data=>{
      requests=data||[];
      const tbody=document.getElementById('requests-body');
      const wrap=document.getElementById('requests-table-wrap');
      const empty=document.getElementById('requests-empty');
      if(!requests.length){wrap.style.display='none';empty.style.display='block';return;}
      wrap.style.display='block';empty.style.display='none';
      tbody.innerHTML=requests.map((r,i)=>`
        <tr><td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td data-label="${t('table.artist')}"><strong>${esc(r.artist)}</strong></td><td data-label="${t('table.title')}">${esc(r.title)}</td>
        <td class="duration-col" data-label="${t('table.release')}">${fmtDate(r.release)}</td><td class="duration-col" data-label="${t('table.duration')}">${r.duration}</td>
        <td data-label="${t('table.genres')}">${r.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}${r.genreNamesOriginal?`<div style="color:var(--muted);font-size:0.7rem;margin-top:4px;">(${esc(r.genreNamesOriginal)})</div>`:''}</td>
        <td data-label="${t('table.album')}">${r.albumTitle?`<span class="badge album">${esc(r.albumTitle)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td data-label="${t('table.source')}"><div class="req-source-cell">
          <span class="badge${r.kind==='community'?' source-community':''}">${t(r.kind==='community'?'home.source.community':'home.source.catalog')}</span>
          ${r.requester?`<div class="hint">${t('table.submittedBy')}: <a href="#" class="artist-link" onclick="openUserProfilePage(${r.requester.userId});return false;">${esc(r.requester.displayName)}</a></div>`:''}
          ${r.audioUrl?`<audio controls preload="none" src="${esc(r.audioUrl)}" class="req-audio"></audio>`:''}
          ${r.kind==='community'&&r.youtubeVideoId?`<a class="artist-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(r.youtubeVideoId)}" target="_blank" rel="noopener"><svg class="icon icon-filled"><use href="#icon-play"/></svg> YouTube</a>`:''}
        </div></td>
        <td class="td-actions" data-label="${t('table.action')}"><div class="actions-td">
          <button class="btn btn-outline" onclick="openEditRequestModal(${r.id})" title="${t('admin.editBtn')}"><svg class="icon"><use href="#icon-pencil"/></svg></button>
          <button class="btn btn-success" onclick="approveRequest(${r.id})">${t('admin.approveBtn')}</button>
          <button class="btn btn-danger" onclick="rejectRequest(${r.id})">${t('admin.rejectBtn')}</button>
        </div></td></tr>`).join('');
    });
}
function approveRequest(id){
  fetch(`/api/requests/${id}/approve`,{method:'POST'})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorApprove'));return;}
      return r.json().then(data=>{
        if(data?.merged) alert(t('msg.approveMerged'));
        loadSongs().then(()=>{renderSongs();updateStats();});
        renderRequests();
      });
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteSong(id){
  if(playerQueue.length&&playerQueue[playerIndex]&&playerQueue[playerIndex].id===id) playerClose();
  fetch(`/api/songs/${id}`,{method:'DELETE'})
    .then(r=>{
      if(r.status===401){alert(t('msg.needLoginAdmin'));return;}
      if(!r.ok){alert(t('msg.errorDelete'));return;}
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// Кастомне модальне вікно підтвердження видалення (замість браузерного confirm()).
function confirmDeleteSong(id){
  const song = _findSong(id);
  const label = song ? `${song.artist} — ${song.title}` : t('modal.deleteDefaultLabel');
  document.getElementById('delete-modal-text').textContent =
    t('modal.deleteBodyTemplate').replace('{label}', label);
  const confirmBtn = document.getElementById('delete-modal-confirm');
  confirmBtn.onclick = function(){
    closeDeleteModal();
    deleteSong(id);
  };
  document.getElementById('delete-modal-overlay').classList.add('open');
}
function closeDeleteModal(){
  _closeModalAnimated('delete-modal-overlay');
}
document.getElementById('delete-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeDeleteModal();
});

function rejectRequest(id){
  fetch(`/api/requests/${id}`,{method:'DELETE'})
    .then(r=>{if(!r.ok)alert(t('msg.errorReject')); else renderRequests();})
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT REQUEST (адмін редагує заявку перед підтвердженням)
// ================================================================
function openEditRequestModal(id){
  const r = requests.find(x=>x.id===id);
  if(!r) return;
  document.getElementById('edit-req-artist').value = r.artist || '';
  document.getElementById('edit-req-title').value = r.title || '';
  document.getElementById('edit-req-release').value = r.release || '';
  document.getElementById('edit-req-duration').value = r.duration || '';
  document.getElementById('edit-req-album').value = r.albumTitle || '';
  document.getElementById('edit-req-genres').value = (r.genres||[]).join(', ');
  document.getElementById('edit-req-youtube').value = r.youtubeVideoId || '';
  document.getElementById('edit-req-ext-search-panel').style.display = 'none';
  _updateEditReqYoutubeLink();
  // Текст заявки — окремий, потенційно важкий ендпоінт (як і в піснях), підвантажуємо лише зараз.
  document.getElementById('edit-req-lyrics').value = '';
  fetch(`/api/requests/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-req-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-request-save-btn').onclick = function(){ saveEditRequest(id); };
  document.getElementById('edit-request-modal-overlay').classList.add('open');
}
// Аналог _updateEditSongYoutubeLink для модалки заявки — окрема функція,
// бо працює з іншими id полів.
function _updateEditReqYoutubeLink(){
  const val = document.getElementById('edit-req-youtube').value.trim();
  const link = document.getElementById('edit-req-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditRequestModal(){
  _closeModalAnimated('edit-request-modal-overlay');
}
document.getElementById('edit-request-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditRequestModal();
});
function saveEditRequest(id){
  const artist = document.getElementById('edit-req-artist').value.trim();
  const title = document.getElementById('edit-req-title').value.trim();
  const release = document.getElementById('edit-req-release').value;
  const duration = document.getElementById('edit-req-duration').value.trim();
  const album = document.getElementById('edit-req-album').value.trim();
  const genres = document.getElementById('edit-req-genres').value.trim();
  // Порожнє поле тут — навмисне очищення (як і в редагуванні пісні), не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-req-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    albumTitle: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-req-lyrics').value;
  fetch(`/api/requests/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorEditRequest'));return;}
      // Окремий ендпоінт, як і для пісень — текст не є частиною основного DTO заявки.
      fetch(`/api/requests/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      closeEditRequestModal();
      renderRequests();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT SONG (адмін редагує вже опубліковану пісню в головній таблиці)
// ================================================================
function editCurrentSong(){
  const s = playerQueue[playerIndex];
  if(!s) return;
  openEditSongModal(s.id);
}
function openEditSongModal(id){
  const s = _findSong(id);
  if(!s) return;
  // Заміна файлу — лише для пісень таблиці_2.
  const audioGroup = document.getElementById('edit-song-audio-group');
  const audioPreview = document.getElementById('edit-song-audio-preview');
  audioGroup.style.display = s.source === 'community' ? '' : 'none';
  document.getElementById('edit-song-audio').value = '';
  if(s.audioUrl){ audioPreview.src = s.audioUrl; audioPreview.style.display = ''; }
  else { audioPreview.removeAttribute('src'); audioPreview.style.display = 'none'; }
  document.getElementById('edit-song-artist').value = s.artist || '';
  document.getElementById('edit-song-title').value = s.title || '';
  document.getElementById('edit-song-release').value = s.release || '';
  document.getElementById('edit-song-duration').value = s.duration || '';
  document.getElementById('edit-song-album').value = s.album || '';
  document.getElementById('edit-song-genres').value = (s.genres||[]).join(', ');
  document.getElementById('edit-song-youtube').value = s.youtubeVideoId || '';
  _updateEditSongYoutubeLink();
  // Текст пісні не приходить разом з /api/songs (окремий, потенційно важкий
  // ендпоінт) — підвантажуємо лише зараз, при відкритті форми редагування.
  document.getElementById('edit-song-lyrics').value = '';
  fetch(`/api/songs/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-song-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-song-save-btn').onclick = function(){ saveEditSong(id); };
  document.getElementById('edit-song-modal-overlay').classList.add('open');
}
// Оновлює посилання "Переглянути на YouTube" наживо (приймає голий videoId або повний URL).
function _updateEditSongYoutubeLink(){
  const val = document.getElementById('edit-song-youtube').value.trim();
  const link = document.getElementById('edit-song-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditSongModal(){
  _closeModalAnimated('edit-song-modal-overlay');
}
document.getElementById('edit-song-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditSongModal();
});
function saveEditSong(id){
  const artist = document.getElementById('edit-song-artist').value.trim();
  const title = document.getElementById('edit-song-title').value.trim();
  const release = document.getElementById('edit-song-release').value;
  const duration = document.getElementById('edit-song-duration').value.trim();
  const album = document.getElementById('edit-song-album').value.trim();
  const genres = document.getElementById('edit-song-genres').value.trim();
  // Порожнє поле — навмисне очищення кешу, не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-song-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    album: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-song-lyrics').value;
  const newAudio = document.getElementById('edit-song-audio').files[0];
  fetch(`/api/songs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(async r=>{
      if(!r.ok){alert(t('msg.errorEditSong') + (r.status===400 ? '\n' + await r.text() : ''));return;}
      // Окремий ендпоінт — текст пісні не є частиною основного DTO.
      fetch(`/api/songs/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      if(newAudio){
        const fd = new FormData(); fd.append('audio', newAudio);
        const ar = await fetch(`/api/songs/${id}/audio`,{method:'PUT',body:fd});
        if(!ar.ok) alert(t('msg.errorEditSong') + '\n' + await ar.text());
      }
      closeEditSongModal();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

function addSong(){
  const a=document.getElementById('add-artist').value.trim();
  const t2=document.getElementById('add-title').value.trim();
  const r=document.getElementById('add-release').value;
  const d=document.getElementById('add-duration').value.trim();
  const al=document.getElementById('add-album').value.trim();
  const gr=document.getElementById('add-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const isCommunity = songFormKind.add === 'community';
  let request;
  if(isCommunity){
    const fd = _buildCommunityForm('add', {artist:a,title:t2,release:r,duration:d,genres:gr,album:al||null});
    if(!fd) return;
    request = {method:'POST',body:fd};
  } else {
    const body={artist:a,title:t2,release:r,duration:d,
      genres:gr.split(',').map(g=>g.trim()).filter(Boolean),album:al||null};
    request = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
  }
  const clearForm = () => {
    ['add-artist','add-title','add-release','add-duration','add-album','add-genres'].forEach(i=>document.getElementById(i).value='');
    _clearCommunityFields('add');
    document.getElementById('add-ext-search-panel').style.display = 'none';
  };
  const showOk = () => { const el=document.getElementById('add-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  _setBusy('add-submit-btn', true);
  fetch(isCommunity ? '/api/songs/community' : '/api/songs', request)
    .then(async res=>{
      if(res.status===401||res.status===403){alert(t('msg.needAdminRights'));return;}
      if(!res.ok){alert(t('msg.errorAddSong') + (res.status===400 ? '\n' + await res.text() : ''));return;}
      clearForm(); showOk();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>_setBusy('add-submit-btn', false));
}
