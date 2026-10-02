// Спілкування: особисті повідомлення, запити на листування, гілки обговорень.

// ================================================================
// ОСОБИСТІ ПОВІДОМЛЕННЯ + ОБГОВОРЕННЯ (сторінка "Спілкування")
// ================================================================
let chatTab = 'threads';
let currentChatUserId = null;
let _chatPartnerName = '';
let currentThreadId = null;

function openChatPage(tab){
  if(tab) chatTab = tab;
  showPage('chat');
}
function loadChatPage(){ switchChatTab(chatTab); }
// Вкладки: Обговорення · Друзі · Особисті (у "Особистих" — підвкладки Чати / Запити).
function switchChatTab(tab){
  const authed = !!currentUser?.authenticated;
  if(tab==='requests' && !authed) tab = 'dm'; // там же й підказка "увійдіть"
  chatTab = tab;
  const main = tab==='requests' ? 'dm' : tab;
  ['threads','friends','dm'].forEach(k=> document.getElementById(`chat-tab-${k}`).classList.toggle('active', main===k));
  ['threads','friends','dm','requests'].forEach(k=>{
    document.getElementById(`chat-${k}-section`).style.display = tab===k ? '' : 'none';
  });
  document.getElementById('chat-dm-subtabs').style.display = authed && main==='dm' ? '' : 'none';
  document.getElementById('chat-sub-dm').classList.toggle('active', tab==='dm');
  document.getElementById('chat-sub-requests').classList.toggle('active', tab==='requests');
  if(document.getElementById('page-chat').classList.contains('active')) _routerOnShowPage('chat');
  if(tab==='friends'){
    document.getElementById('chat-friends-login-hint').style.display = authed ? 'none' : '';
    document.getElementById('chat-friends-body').style.display = authed ? '' : 'none';
    if(authed) loadFriendsPage();
  } else if(tab==='dm'){
    document.getElementById('chat-dm-login-hint').style.display = authed ? 'none' : '';
    document.getElementById('chat-dm-layout').style.display = authed ? '' : 'none';
    if(!authed) return;
    loadConversations();
    if(currentChatUserId != null) loadDmThread();
  } else if(tab==='requests'){
    loadDmRequests();
  } else {
    if(currentThreadId != null) loadThreadDetail(); else closeThreadDetail();
  }
}
function openDirectChat(userId){
  if(!currentUser?.authenticated){
    confirmLogin();
    return;
  }
  if(userId == null) return;
  if(currentChatUserId !== userId) _chatPartnerName = '';
  currentChatUserId = userId;
  openChatPage('dm');
}
function refreshDmBadge(){
  if(!currentUser?.authenticated) return;
  const setBadge = (id, n) => {
    const b = document.getElementById(id);
    if(!b) return;
    b.textContent = n > 99 ? '99+' : n;
    b.style.display = n > 0 ? '' : 'none';
  };
  fetch('/api/messages/unread-count').then(r=>r.ok?r.json():null).then(d=>{
    if(!d) return;
    setBadge('dm-badge', d.unread + d.requests);
    _unreadCounts.dm = d.unread + d.requests;
    _updateTitleBadge();
    setBadge('chat-tab-dm-badge', d.unread + d.requests);
    setBadge('chat-sub-dm-badge', d.unread);
    setBadge('chat-tab-requests-badge', d.requests);
  }).catch(()=>{});
}
// SignalR: новий/схвалений/відхилений запит на листування.
function onDmRequestsEvent(otherUserId, name){
  refreshDmBadge();
  // name приходить лише з новим запитом (схвалення/відхилення — без нього).
  if(name) showToast(t('toast.dmRequest').replace('{name}', name), () => openChatPage('requests'));
  if(!document.getElementById('page-chat')?.classList.contains('active')) return;
  if(chatTab==='requests') loadDmRequests();
  if(chatTab==='dm'){ loadConversations(); if(currentChatUserId === otherUserId) loadDmThread(); }
}
function loadDmRequests(){
  fetch('/api/messages/requests').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('chat-requests-empty').style.display = list.length ? 'none' : '';
    document.getElementById('chat-requests-list').innerHTML = list.map(r=>`
      <div class="dm-request-card">
        ${r.avatarUrl ? `<img src="${esc(r.avatarUrl)}" alt="">` : avatarHtml(null, r.displayName, 'chat-conv-ph')}
        <div class="dm-request-main">
          <div><a href="#" class="artist-link" onclick="openUserProfilePage(${r.userId});return false;"><strong>${esc(r.displayName)}</strong></a> <span class="hint">· ${timeHtml(r.createdAt)}</span></div>
          <div class="dm-request-preview">${esc(r.preview)}</div>
        </div>
        <div class="dm-request-actions">
          <button class="btn btn-primary" onclick="respondDmRequest(${r.userId}, true)">${t('chat.acceptRequest')}</button>
          <button class="btn btn-outline" onclick="respondDmRequest(${r.userId}, false)">${t('chat.declineRequest')}</button>
        </div>
      </div>`).join('');
    refreshDmBadge();
  }).catch(()=>{});
}
function respondDmRequest(userId, accept){
  fetch(`/api/messages/requests/${userId}/${accept ? 'accept' : 'decline'}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      if(accept){ _chatPartnerName = ''; currentChatUserId = userId; switchChatTab('dm'); }
      else loadDmRequests();
      refreshDmBadge();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// SignalR: нове повідомлення в будь-якому діалозі (моє з іншої вкладки або вхідне).
function onDirectMessageEvent(otherUserId, name){
  const viewing = document.getElementById('page-chat')?.classList.contains('active') && chatTab==='dm' && currentChatUserId === otherUserId;
  if(name && !viewing) showToast(t('toast.dm').replace('{name}', name), () => openDirectChat(otherUserId));
  const chatOpen = document.getElementById('page-chat')?.classList.contains('active') && chatTab==='dm';
  if(chatOpen){
    loadConversations();
    if(currentChatUserId === otherUserId) loadDmThread(); // він і позначить прочитаним
    else refreshDmBadge();
  } else refreshDmBadge();
}
function loadConversations(){
  fetch('/api/messages/conversations').then(r=>r.ok?r.json():[]).then(list=>{
    const wrap = document.getElementById('chat-conversations');
    // Щойно відкрита з профілю розмова ще без повідомлень — показуємо її першою.
    const showPending = currentChatUserId != null && !list.some(c=>c.userId===currentChatUserId);
    document.getElementById('chat-conversations-empty').style.display = (list.length || showPending) ? 'none' : '';
    const item = c => `
      <div class="chat-conv${c.userId===currentChatUserId?' active':''}" onclick="selectConversation(${c.userId})">
        ${c.avatarUrl ? `<img src="${esc(c.avatarUrl)}" alt="">` : avatarHtml(null, c.displayName, 'chat-conv-ph')}
        <div class="chat-conv-main">
          <div class="chat-conv-top"><strong>${esc(c.displayName)}</strong>${c.unreadCount?`<span class="count-badge">${c.unreadCount}</span>`:''}</div>
          <div class="chat-conv-last">${c.state==='pending_outgoing'?`<span class="badge">${esc(t('chat.pendingLabel'))}</span> `:''}${c.lastFromMe?`${esc(t('chat.you'))}: `:''}${esc(c.lastMessage)}</div>
        </div>
      </div>`;
    wrap.innerHTML = (showPending ? item({userId:currentChatUserId, displayName:_chatPartnerName||'…', avatarUrl:null, lastMessage:t('chat.newConversation'), lastFromMe:false, unreadCount:0}) : '')
      + list.map(item).join('');
    const current = list.find(c=>c.userId===currentChatUserId);
    if(current){ _chatPartnerName = current.displayName; document.getElementById('chat-dm-partner').textContent = current.displayName; }
  }).catch(()=>{});
}
function selectConversation(userId){
  if(currentChatUserId !== userId) _chatPartnerName = '';
  currentChatUserId = userId;
  document.querySelectorAll('.chat-conv').forEach(el=>el.classList.remove('active'));
  loadDmThread();
  loadConversations();
}
function loadDmThread(){
  const id = currentChatUserId;
  if(id == null) return;
  document.getElementById('chat-dm-empty').style.display = 'none';
  document.getElementById('chat-dm-panel').style.display = '';
  document.getElementById('chat-dm-layout').classList.add('has-conv');
  const partner = document.getElementById('chat-dm-partner');
  partner.onclick = (e)=>{ e.preventDefault(); openUserProfilePage(id); };
  if(_chatPartnerName) partner.textContent = _chatPartnerName;
  else fetch(`/api/users/${id}`).then(r=>r.ok?r.json():null).then(u=>{
    if(u && currentChatUserId===id){ _chatPartnerName = u.displayName; partner.textContent = u.displayName; loadConversations(); }
  }).catch(()=>{});
  fetch(`/api/messages/${id}`).then(r=>r.ok?r.json():null).then(thread=>{
    if(!thread || currentChatUserId !== id) return;
    const list = thread.messages;
    // Не-другу: перше повідомлення — запит; далі чекаємо схвалення.
    const hint = document.getElementById('chat-dm-state-hint');
    const hintKey = { none: 'chat.state.none', pending_outgoing: 'chat.state.pendingOutgoing', declined: 'chat.state.declined', pending_incoming: 'chat.state.pendingIncoming' }[thread.state];
    hint.textContent = hintKey ? t(hintKey) : '';
    hint.style.display = hintKey ? '' : 'none';
    document.getElementById('chat-dm-input-row').style.display = thread.canSend ? '' : 'none';
    const box = document.getElementById('chat-dm-messages');
    list.forEach(m => { if(m.song && !_chatSharedSongs.some(s => s.id === m.song.id)) _chatSharedSongs.push(_normalizeSharedSong(m.song)); });
    const msgHtml = m => `<div class="chat-msg${m.isMine?' mine':''}${m.attachment?.kind === 'image' && !m.body ? ' media' : ''}" data-id="${m.id}">`
      + (m.song ? _chatSongHtml(m.song) : '')
      + (m.attachment ? _chatAttachmentHtml(m.attachment, m.id) : '')
      + (m.body ? `<div class="chat-msg-body">${esc(m.body)}</div>` : '')
      + `<div class="chat-msg-time">${timeHtml(m.createdAt)}</div></div>`;
    // Нове повідомлення лише дописуємо: перемальовування всієї розмови зупиняло аудіо й відео, що грали.
    const prev = _chatMessages, samePartner = box.dataset.partner === String(id);
    const prefix = samePartner && prev.length && prev.length <= list.length && prev.every((m, i) => list[i].id === m.id);
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
    _chatMessages = list;
    box.dataset.partner = String(id);
    if(prefix){
      if(list.length > prev.length) box.insertAdjacentHTML('beforeend', list.slice(prev.length).map(msgHtml).join(''));
      if(nearBottom || list.length > prev.length && list[list.length - 1].isMine) box.scrollTop = box.scrollHeight;
    } else {
      box.innerHTML = list.length ? list.map(msgHtml).join('') : `<div class="empty" style="padding:2rem 1rem;">${t('chat.startConversation')}</div>`;
      box.scrollTop = box.scrollHeight;
      box.dataset.stick = '1';
    }
    refreshDmBadge();
  }).catch(()=>{});
}
// "Видалити чат у себе": переписка зникає лише в мене; нове повідомлення поверне розмову.
// Телефон: розмова відкрита на весь екран — "назад" повертає до списку розмов.
function closeDmConversation(){
  currentChatUserId = null;
  _chatPartnerName = '';
  document.getElementById('chat-dm-panel').style.display = 'none';
  document.getElementById('chat-dm-empty').style.display = '';
  document.getElementById('chat-dm-layout').classList.remove('has-conv');
  loadConversations();
}
async function deleteChatForMe(){
  const id = currentChatUserId;
  if(id == null || !await confirmModal({ title: t('chat.clearTitle'), text: t('chat.clearConfirm'), confirmLabel: t('chat.clearBtn') })) return;
  fetch(`/api/messages/${id}`, { method:'DELETE' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      closeDmConversation();
      refreshDmBadge();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function onChatInputKeydown(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendDirectMessage(); }
}
function sendDirectMessage(){
  const input = document.getElementById('chat-dm-input');
  const body = input.value.trim();
  const { file, song } = _chatPending;
  if((!body && !file && !song) || currentChatUserId == null) return;
  // З файлом чи піснею — multipart на /rich; просто текст — як раніше.
  let req;
  if(file || song){
    const fd = new FormData();
    if(body) fd.append('body', body);
    if(song) fd.append('musicId', song.id);
    if(file) fd.append('file', file, file.name);
    req = fetch(`/api/messages/${currentChatUserId}/rich`, { method:'POST', body: fd });
  } else {
    req = fetch(`/api/messages/${currentChatUserId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) });
  }
  const btn = document.getElementById('chat-dm-send');
  btn.disabled = true;
  if(file) btn.textContent = t('chat.sending');
  req.then(async r=>{
      if(r.status === 409 || r.status === 403){ loadDmThread(); return; } // запит ще не схвалено / відхилено — підказка вже пояснить
      if(r.status === 400 && file){ alert(t('chat.fileRejected')); return; }
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      input.value = '';
      _chatPending = { file: null, song: null };
      _renderChatPending();
      loadDmThread();
      loadConversations();
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>{ btn.disabled = false; btn.textContent = t('chat.sendBtn'); });
}

// ─── Вкладення й пісні в особистих повідомленнях ─────────────────────────
const CHAT_MAX_FILE = 20 * 1024 * 1024;
let _chatPending = { file: null, song: null };
let _chatSharedSongs = []; // пісні з повідомлень — щоб _findSong знаходив їх для черги й плеєра
function _normalizeSharedSong(s){
  return { ...s, genres: s.genres || [], artists: s.artists || [], source: s.source || 'catalog', playCount: s.playCount || 0 };
}
function _fmtBytes(n){
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
function _songThumbUrl(s){ return s?.youtubeVideoId ? `https://i.ytimg.com/vi/${encodeURIComponent(s.youtubeVideoId)}/mqdefault.jpg` : null; }
function _chatSongHtml(s){
  const thumb = _songThumbUrl(s);
  return `<div class="chat-song">
    ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<span class="chat-song-ph"><svg class="icon"><use href="#icon-music"/></svg></span>`}
    <span class="chat-song-main"><strong>${esc(s.artist)}</strong><span>${esc(s.title)}</span></span>
    <button type="button" class="chat-song-btn" onclick="playSharedSong(${s.id})" title="${esc(t('profile.playBtn'))}" aria-label="${esc(t('profile.playBtn'))}"><svg class="icon icon-filled"><use href="#icon-play"/></svg></button>
    <button type="button" class="chat-song-btn" onclick="addToQueue(${s.id})" title="${esc(t('queue.add'))}" aria-label="${esc(t('queue.add'))}"><svg class="icon"><use href="#icon-queue"/></svg></button>
  </div>`;
}
// Вкладення в повідомленні — кожен тип так, як людині зручно ним користуватись:
// фото — мініатюра, відкривається у переглядачі на сайті (наближення, гортання фото розмови);
// аудіо — наш міні-плеєр (один звук за раз, основний плеєр — на паузу) з назвою й «Завантажити»;
// відео — прямо в розмові + «на весь екран»; PDF і текст — «Переглянути» на сайті; решта — картка з типом і розміром.
function _attExt(name){ const m = /\.([a-z0-9]{1,5})$/i.exec(name || ''); return m ? m[1].toUpperCase() : 'FILE'; }
function _attType(a){
  const ext = _attExt(a.name);
  if(a.kind !== 'file') return a.kind;
  if(ext === 'PDF' || a.contentType === 'application/pdf') return 'pdf';
  if(ext === 'TXT' || a.contentType === 'text/plain') return 'text';
  return 'file';
}
function _attDownload(a){ return `${a.url}${a.url.includes('?') ? '&' : '?'}download=true`; }
function _attInline(a){ return `${a.url}${a.url.includes('?') ? '&' : '?'}inline=true`; }
function _attFileCard(a, actions){
  return `<div class="chat-att-card">
    <span class="chat-att-type" data-ext="${esc(_attExt(a.name))}">${esc(_attExt(a.name))}</span>
    <span class="chat-att-main"><strong title="${esc(a.name)}">${esc(a.name)}</strong><small>${esc(_fmtBytes(a.size))}</small></span>
    ${actions}
  </div>`;
}
function _attDlBtn(a){
  return `<a class="chat-att-act" href="${esc(_attDownload(a))}" download="${esc(a.name)}" title="${esc(t('player.download'))}" aria-label="${esc(t('player.download'))}: ${esc(a.name)}"><svg class="icon" aria-hidden="true"><use href="#icon-download"/></svg></a>`;
}
function _chatAttachmentHtml(a, msgId){
  const type = _attType(a);
  if(type === 'image')
    return `<button type="button" class="chat-att-img" data-msg="${msgId}" onclick="openChatMedia(${msgId})" aria-label="${esc(t('chat.openImage'))}: ${esc(a.name)}">
      <img src="${esc(a.url)}" alt="${esc(a.name)}" loading="lazy" decoding="async" onload="_chatMediaLoaded(this)" onerror="_chatMediaLoaded(this)"></button>`;
  if(type === 'audio')
    return `<div class="chat-att-audio">
      <div class="chat-att-audio-head"><svg class="icon" aria-hidden="true"><use href="#icon-music"/></svg><strong title="${esc(a.name)}">${esc(a.name.replace(/\.[a-z0-9]{1,5}$/i, ''))}</strong><small>${esc(_fmtBytes(a.size))}</small></div>
      ${miniAudioHtml(a.url)}
    </div>`;
  if(type === 'video')
    return `<div class="chat-att-video">
      <video src="${esc(a.url)}" controls preload="metadata" playsinline onloadedmetadata="_chatMediaLoaded(this)"></video>
      <div class="chat-att-video-meta"><span title="${esc(a.name)}">${esc(a.name)} · ${esc(_fmtBytes(a.size))}</span>
        <button type="button" class="chat-att-act" onclick="openChatMedia(${msgId})" title="${esc(t('chat.fullscreen'))}" aria-label="${esc(t('chat.fullscreen'))}"><svg class="icon" aria-hidden="true"><use href="#icon-external"/></svg></button>
        ${_attDlBtn(a)}</div>
    </div>`;
  if(type === 'pdf' || type === 'text')
    return _attFileCard(a, `<button type="button" class="chat-att-view" onclick="openChatMedia(${msgId})">${esc(t('chat.preview'))}</button>${_attDlBtn(a)}`);
  return _attFileCard(a, _attDlBtn(a));
}
// Фото й відео довантажуються вже після прокрутки донизу й зсували розмову вгору — поки людина
// не прокрутила вище сама, тримаємо низ розмови (останні повідомлення) на місці.
function _chatMediaLoaded(el){
  el.parentElement?.classList.add('loaded');
  const box = document.getElementById('chat-dm-messages');
  if(box && box.dataset.stick !== '0') box.scrollTop = box.scrollHeight;
}
(() => {
  const box = document.getElementById('chat-dm-messages');
  box?.addEventListener('scroll', () => { box.dataset.stick = box.scrollHeight - box.scrollTop - box.clientHeight < 80 ? '1' : '0'; }, { passive: true });
})();
// Переглядач: фото — уся галерея розмови (гортати стрілками/свайпом), інші типи — поодинці.
let _chatMessages = [];
function openChatMedia(msgId){
  const m = _chatMessages.find(x => x.id === msgId);
  if(!m?.attachment) return;
  const a = m.attachment, type = _attType(a);
  if(type === 'image'){
    const imgs = _chatMessages.filter(x => x.attachment && _attType(x.attachment) === 'image');
    openMediaViewer(imgs.map(x => ({ kind: 'image', src: x.attachment.url, name: x.attachment.name, download: _attDownload(x.attachment) })), imgs.indexOf(m));
    return;
  }
  if(type === 'video'){
    document.querySelectorAll('#chat-dm-messages video').forEach(v => v.pause());
    openMediaViewer([{ kind: 'video', src: a.url, name: a.name, download: _attDownload(a) }]);
    return;
  }
  // PDF: вбудований переглядач браузера є не всюди (на Android його нема) — тоді просто відкриваємо файл.
  if(type === 'pdf' && navigator.pdfViewerEnabled === false){ window.open(_attInline(a), '_blank', 'noopener'); return; }
  openMediaViewer([{ kind: type, src: _attInline(a), name: a.name, download: _attDownload(a) }]);
}
// Прикріплене до повідомлення, що пишеться: чипи над полем вводу.
function _renderChatPending(){
  const box = document.getElementById('chat-dm-pending');
  const { file, song } = _chatPending;
  const chip = (icon, text, clear) => `<span class="chat-pending-chip"><svg class="icon"><use href="#icon-${icon}"/></svg><span>${esc(text)}</span><button type="button" onclick="${clear}" aria-label="×">×</button></span>`;
  box.innerHTML = (song ? chip('music', `${song.artist} — ${song.title}`, "_chatPending.song=null;_renderChatPending()") : '')
    + (file ? chip('paperclip', `${file.name} · ${_fmtBytes(file.size)}`, "_chatPending.file=null;_renderChatPending()") : '');
  box.style.display = song || file ? '' : 'none';
}
function onChatFilePicked(file){
  if(!file) return;
  if(file.size > CHAT_MAX_FILE){ alert(t('chat.fileTooBig')); return; }
  _chatPending.file = file;
  _renderChatPending();
  document.getElementById('chat-dm-input').focus();
}
// Картинка з буфера (Ctrl+V) і перетягування файлу на розмову — теж вкладення.
(() => {
  const input = document.getElementById('chat-dm-input');
  const panel = document.getElementById('chat-dm-panel');
  if(!input || !panel) return;
  input.addEventListener('paste', e => {
    const file = [...(e.clipboardData?.files || [])][0];
    if(file){ e.preventDefault(); onChatFilePicked(file); }
  });
  panel.addEventListener('dragover', e => { if(e.dataTransfer?.types?.includes('Files')){ e.preventDefault(); panel.classList.add('drop'); } });
  panel.addEventListener('dragleave', e => { if(e.target === panel) panel.classList.remove('drop'); });
  panel.addEventListener('drop', e => {
    panel.classList.remove('drop');
    const file = e.dataTransfer?.files?.[0];
    if(file){ e.preventDefault(); onChatFilePicked(file); }
  });
})();
// Пісня в повідомлення: пошук по обох таблицях.
function openChatSongPicker(){
  const input = document.getElementById('chat-song-search');
  input.value = '';
  _renderChatSongResults();
  document.getElementById('chat-song-modal-overlay').classList.add('open');
  setTimeout(() => input.focus(), 30);
}
function _searchSongs(q, limit = 30){
  const all = [...(songs || []), ...(communitySongs || [])];
  const norm = s => (s || '').toLowerCase();
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hits = words.length ? all.filter(s => { const hay = norm(`${s.artist} ${s.title} ${s.album || ''}`); return words.every(w => hay.includes(w)); }) : all.slice().sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  return hits.slice(0, limit);
}
function _renderChatSongResults(){
  const q = document.getElementById('chat-song-search').value;
  const list = _searchSongs(q);
  document.getElementById('chat-song-results').innerHTML = list.length
    ? list.map(s => `<button type="button" class="chat-pick" onclick="pickChatSong(${s.id})">${_pickSongInner(s)}</button>`).join('')
    : `<div class="hint" style="padding:0.6rem;">${esc(t('chat.songNotFound'))}</div>`;
}
function _pickSongInner(s){
  const thumb = _songThumbUrl(s);
  return `${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy">` : `<span class="chat-song-ph"><svg class="icon"><use href="#icon-music"/></svg></span>`}<span class="chat-song-main"><strong>${esc(s.artist)}</strong><span>${esc(s.title)}</span></span>`;
}
function pickChatSong(id){
  const s = _findSong(id);
  if(!s) return;
  _chatPending.song = s;
  _renderChatPending();
  _closeModalAnimated('chat-song-modal-overlay');
  document.getElementById('chat-dm-input').focus();
}
// ▶ на пісні з повідомлення. У окремому вікні чату — грає основне вікно сайту (якщо воно відкрите).
function playSharedSong(id){
  const s = _findSong(id);
  if(!s) return;
  try {
    if(document.documentElement.hasAttribute('data-popout') && window.opener && !window.opener.closed && window.opener.playSongObject){
      window.opener.playSongObject(s);
      window.opener.focus();
      return;
    }
  } catch(e){ /* інший origin — граємо тут */ }
  playSongObject(s);
}
function playSongObject(s){
  playerQueue = [s];
  playerIndex = 0;
  _loadCurrent();
}
// Чат в окремому вікні: компактне вікно лише з розмовами (html[data-popout] ховає решту сайту).
function popoutChat(){
  const url = `/chat/dm?popout=1${currentChatUserId != null ? `&with=${currentChatUserId}` : ''}`;
  const w = window.open(url, 'nowl-chat', 'popup=yes,width=480,height=760');
  if(w) w.focus();
}

// ─── «Надіслати в чат» з вікна «Додати в плейлист» ───────────────────────
let _shareSongId = null, _shareTargets = [];
async function openShareSongModal(songId){
  const s = _findSong(songId);
  if(!s) return;
  _shareSongId = songId;
  document.getElementById('share-song-preview').innerHTML = _pickSongInner(s);
  document.getElementById('share-song-note').value = '';
  document.getElementById('share-song-search').value = '';
  document.getElementById('share-song-targets').innerHTML = `<div class="hint" style="padding:0.6rem;">…</div>`;
  document.getElementById('share-song-modal-overlay').classList.add('open');
  const [convs, friends] = await Promise.all([
    fetch('/api/messages/conversations').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('/api/friends').then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  const byId = new Map();
  convs.filter(c => c.state !== 'pending_outgoing' && c.state !== 'declined')
    .forEach(c => byId.set(c.userId, { userId: c.userId, name: c.displayName, avatarUrl: c.avatarUrl }));
  friends.forEach(f => { if(!byId.has(f.userId)) byId.set(f.userId, { userId: f.userId, name: f.displayName, avatarUrl: f.avatarUrl }); });
  _shareTargets = [...byId.values()];
  _renderShareTargets();
}
function _renderShareTargets(){
  const q = document.getElementById('share-song-search').value.trim().toLowerCase();
  const list = _shareTargets.filter(p => !q || p.name.toLowerCase().includes(q));
  document.getElementById('share-song-targets').innerHTML = list.length
    ? list.map(p => `<button type="button" class="chat-pick" onclick="shareSongTo(${p.userId}, this)">${p.avatarUrl ? `<img class="round" src="${esc(p.avatarUrl)}" alt="">` : avatarHtml(null, p.name, 'chat-conv-ph')}<span class="chat-song-main"><strong>${esc(p.name)}</strong></span><svg class="icon chat-pick-go"><use href="#icon-arrow-right"/></svg></button>`).join('')
    : `<div class="hint" style="padding:0.6rem;">${esc(t('chat.shareNoTargets'))}</div>`;
}
function shareSongTo(userId, btn){
  const target = _shareTargets.find(p => p.userId === userId);
  const fd = new FormData();
  fd.append('musicId', _shareSongId);
  const note = document.getElementById('share-song-note').value.trim();
  if(note) fd.append('body', note);
  btn.disabled = true;
  fetch(`/api/messages/${userId}/rich`, { method:'POST', body: fd })
    .then(r => {
      if(!r.ok){ alert(r.status === 409 || r.status === 403 ? t('chat.state.pendingOutgoing') : t('msg.connectionError')); return; }
      _closeModalAnimated('share-song-modal-overlay');
      showToast(t('chat.shareSent').replace('{name}', target?.name || ''), () => openDirectChat(userId));
    })
    .catch(() => alert(t('msg.connectionError')))
    .finally(() => { btn.disabled = false; });
}

// ─── Гілки обговорень ────────────────────────────────────────────────────
// Автор гілки й ті, хто в ній відповідав, — учасники: їм приходять сповіщення про нові дописи
// (дзвіночок → «Обговорення»). На кожен допис можна відповісти окремо — над відповіддю цитата.
let threadsSearchTimer = null;
let _threadData = null;       // відкрита гілка (для цитат і «Відповісти»)
let _threadReplyTo = null;    // допис, на який відповідаємо (null — уся гілка)
let _threadFocusPost = null;  // допис, до якого прокрутити (перехід зі сповіщення)
function onThreadsSearchInput(){
  clearTimeout(threadsSearchTimer);
  threadsSearchTimer = setTimeout(loadThreads, 300);
}
function _userLinkHtml(u){
  if(!u) return `<span class="thread-deleted">${esc(t('threads.deletedUser'))}</span>`;
  return `<a href="#" class="artist-link" onclick="event.stopPropagation();openUserProfileOrLogin(${u.userId});return false;">${esc(u.displayName)}</a>`;
}
function loadThreads(){
  const q = document.getElementById('threads-search').value.trim();
  document.getElementById('threads-new-btn').style.display = currentUser?.authenticated ? '' : 'none';
  fetch(`/api/threads${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('threads-empty').style.display = list.length ? 'none' : '';
    document.getElementById('threads-list').innerHTML = list.map(th=>`
      <div class="thread-card${th.unread ? ' unread' : ''}" role="button" tabindex="0" onclick="openThread(${th.id})" onkeydown="if(event.key==='Enter')openThread(${th.id})">
        ${avatarHtml(th.author?.avatarUrl, th.author?.displayName || '?', 'thread-avatar')}
        <div class="thread-card-main">
          <strong>${esc(th.title)}</strong>
          <span class="thread-card-meta">${_userLinkHtml(th.author)} · ${t('threads.lastActivity')} ${timeHtml(th.lastPostAt)}</span>
        </div>
        <div class="thread-card-side">
          <span class="thread-count" title="${esc(t('threads.repliesTitle'))}"><svg class="icon"><use href="#icon-chat"/></svg>${th.postCount}</span>
          ${th.unread ? `<span class="count-badge">${esc(t('threads.newCount').replace('{n}', th.unread))}</span>` : ''}
        </div>
      </div>`).join('');
  }).catch(()=>{});
}
// Кнопка "Нова гілка" лише відкриває форму (і ховається, поки та відкрита);
// закриває — "Скасувати" у формі або Esc.
function openNewThreadForm(){
  if(!currentUser?.authenticated){ confirmLogin(); return; }
  document.getElementById('thread-new-form').style.display = '';
  document.getElementById('threads-new-btn').style.display = 'none';
  document.getElementById('thread-new-title').focus();
}
function closeNewThreadForm(){
  document.getElementById('thread-new-title').value = '';
  document.getElementById('thread-new-body').value = '';
  document.getElementById('thread-new-form').style.display = 'none';
  document.getElementById('threads-new-btn').style.display = '';
}
document.getElementById('thread-new-form').addEventListener('keydown', e => {
  if(e.key === 'Escape'){ e.preventDefault(); closeNewThreadForm(); }
});
function createThread(){
  const title = document.getElementById('thread-new-title').value.trim();
  const body = document.getElementById('thread-new-body').value.trim();
  if(!title || !body){ alert(t('msg.fillRequiredFields')); return; }
  fetch('/api/threads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, body }) })
    .then(r=>r.ok?r.json():null)
    .then(th=>{
      if(!th){ alert(t('msg.connectionError')); return; }
      closeNewThreadForm();
      openThread(th.id);
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// postId — прокрутити до допису й підсвітити його (перехід зі сповіщення).
function openThread(id, postId){
  if(currentThreadId !== id){ _threadReplyTo = null; _renderReplyChip(); }
  currentThreadId = id;
  _threadFocusPost = postId ?? null;
  chatTab = 'threads';
  if(!document.getElementById('page-chat').classList.contains('active')) showPage('chat');
  else loadThreadDetail();
}
function closeThreadDetail(){
  currentThreadId = null;
  _threadData = null;
  _threadReplyTo = null;
  document.getElementById('thread-detail-view').style.display = 'none';
  document.getElementById('threads-list-view').style.display = '';
  loadThreads();
}
function _canModerate(author){
  return !!currentUser?.isAdmin || (!!author && author.userId === currentUser?.userId);
}
function _deleteBtnHtml(onclick){
  return `<button type="button" class="btn-icon-danger" onclick="event.stopPropagation();${onclick}" title="${t('modal.confirmDelete')}" aria-label="${t('modal.confirmDelete')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg></button>`;
}
function _threadPostHtml(p, th){
  const mine = !!p.author && p.author.userId === currentUser?.userId;
  const op = !!th.author && p.author?.userId === th.author.userId;
  const quote = p.replyTo ? `
    <button type="button" class="thread-quote" onclick="scrollToThreadPost(${p.replyTo.postId})">
      <span class="thread-quote-name"><svg class="icon"><use href="#icon-reply"/></svg>${esc(p.replyTo.author?.displayName || t('threads.deletedUser'))}</span>
      <span class="thread-quote-text">${esc(p.replyTo.snippet)}</span>
    </button>` : '';
  return `
    <article class="thread-post${mine ? ' mine' : ''}" id="thread-post-${p.id}">
      ${avatarHtml(p.author?.avatarUrl, p.author?.displayName || '?', 'thread-avatar')}
      <div class="thread-bubble">
        <div class="thread-post-head">
          <span class="thread-author">${_userLinkHtml(p.author)}${op ? `<span class="thread-op-badge">${esc(t('threads.authorBadge'))}</span>` : ''}</span>
          ${timeHtml(p.createdAt, 'thread-time')}
        </div>
        ${quote}
        <div class="thread-post-body">${esc(p.body)}</div>
        <div class="thread-post-actions">
          <button type="button" class="thread-action" onclick="startThreadReply(${p.id})"><svg class="icon"><use href="#icon-reply"/></svg>${esc(t('threads.replyBtn'))}</button>
          ${_canModerate(p.author) ? _deleteBtnHtml(`deleteThreadPost(${p.id})`) : ''}
        </div>
      </div>
    </article>`;
}
function loadThreadDetail(){
  const id = currentThreadId;
  if(id == null) return;
  document.getElementById('threads-list-view').style.display = 'none';
  document.getElementById('thread-detail-view').style.display = '';
  const authed = !!currentUser?.authenticated;
  document.getElementById('thread-reply-row').style.display = authed ? '' : 'none';
  document.getElementById('thread-reply-login-hint').style.display = authed ? 'none' : '';
  fetch(`/api/threads/${id}`).then(r=>r.ok?r.json():null).then(th=>{
    if(currentThreadId !== id) return;
    if(!th){ closeThreadDetail(); return; }
    _threadData = th;
    document.getElementById('thread-detail-title').textContent = th.title;
    document.getElementById('thread-detail-meta').innerHTML =
      `${avatarHtml(th.author?.avatarUrl, th.author?.displayName || '?', 'thread-avatar sm')}<span class="thread-author-text">${_userLinkHtml(th.author)}${timeHtml(th.createdAt, 'thread-time')}</span>`;
    document.getElementById('thread-detail-body').textContent = th.body;
    document.getElementById('thread-detail-actions').innerHTML =
      (authed ? `<button type="button" class="thread-follow${th.isFollowing ? ' on' : ''}" aria-pressed="${!!th.isFollowing}" onclick="toggleThreadFollow()" title="${esc(t('threads.followHint'))}"><svg class="icon"><use href="#icon-bell"/></svg>${esc(t(th.isFollowing ? 'threads.following' : 'threads.follow'))}</button>` : '')
      + (_canModerate(th.author) ? _deleteBtnHtml(`deleteThread(${th.id})`) : '');
    document.getElementById('thread-replies-title').textContent = th.posts.length
      ? `${t('threads.repliesTitle')} · ${th.posts.length}` : t('threads.noReplies');
    document.getElementById('thread-posts').innerHTML = th.posts.map(p => _threadPostHtml(p, th)).join('');
    if(_threadFocusPost != null){ const pid = _threadFocusPost; _threadFocusPost = null; requestAnimationFrame(() => scrollToThreadPost(pid)); }
    // Сервер позначив гілку прочитаною — оновлюємо дзвіночок.
    if(authed) refreshNotifBadge();
  }).catch(()=>{});
}
function scrollToThreadPost(postId){
  const el = document.getElementById(`thread-post-${postId}`);
  if(!el) return;
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth; // перезапуск підсвітки
  el.classList.add('flash');
}
function startThreadReply(postId){
  if(!currentUser?.authenticated){ confirmLogin(); return; }
  _threadReplyTo = _threadData?.posts.find(p => p.id === postId) || null;
  _renderReplyChip();
  document.getElementById('thread-reply-input').focus();
}
function cancelThreadReply(){ _threadReplyTo = null; _renderReplyChip(); }
function _renderReplyChip(){
  const chip = document.getElementById('thread-reply-chip');
  const input = document.getElementById('thread-reply-input');
  if(!chip || !input) return;
  const p = _threadReplyTo;
  chip.style.display = p ? '' : 'none';
  chip.innerHTML = p ? `<svg class="icon"><use href="#icon-reply"/></svg><span><strong>${esc(p.author?.displayName || t('threads.deletedUser'))}</strong>: ${esc(p.body)}</span><button type="button" onclick="cancelThreadReply()" aria-label="${esc(t('modal.cancel'))}">×</button>` : '';
  input.placeholder = p ? t('notif.thread.replyTo').replace('{name}', p.author?.displayName || '…') : t('threads.replyPlaceholder');
}
function onThreadReplyKeydown(e){
  if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); replyToThread(); }
  else if(e.key === 'Escape' && _threadReplyTo){ e.preventDefault(); cancelThreadReply(); }
}
// Поле росте з текстом (до межі в CSS), а не прокручується в трьох рядках.
function _autoGrow(el){ el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
function replyToThread(){
  const input = document.getElementById('thread-reply-input');
  const body = input.value.trim();
  if(!body || currentThreadId == null) return;
  const btn = document.getElementById('thread-send-btn');
  btn.disabled = true;
  fetch(`/api/threads/${currentThreadId}/posts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body, replyToPostId: _threadReplyTo?.id ?? null }) })
    .then(r=>r.ok?r.json():null)
    .then(post=>{
      if(!post){ alert(t('msg.connectionError')); return; }
      input.value = '';
      _autoGrow(input);
      _threadReplyTo = null;
      _renderReplyChip();
      _threadFocusPost = post.id;
      loadThreadDetail();
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>{ btn.disabled = false; });
}
function toggleThreadFollow(){
  const th = _threadData;
  if(!th) return;
  const next = !th.isFollowing;
  fetch(`/api/threads/${th.id}/follow`, { method: next ? 'POST' : 'DELETE' })
    .then(r => { if(r.ok){ th.isFollowing = next; loadThreadDetail(); } else alert(t('msg.connectionError')); })
    .catch(() => alert(t('msg.connectionError')));
}
async function deleteThread(id){
  if(!await confirmModal({ title: t('modal.deleteShortTitle'), text: t('threads.confirmDeleteThread'), confirmLabel: t('modal.confirmDelete') })) return;
  fetch(`/api/threads/${id}`, { method:'DELETE' }).then(r=>{ if(r.ok) closeThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}
async function deleteThreadPost(postId){
  if(!await confirmModal({ title: t('modal.deleteShortTitle'), text: t('threads.confirmDeletePost'), confirmLabel: t('modal.confirmDelete') })) return;
  fetch(`/api/threads/posts/${postId}`, { method:'DELETE' }).then(r=>{ if(r.ok) loadThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}
