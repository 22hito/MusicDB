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
function switchChatTab(tab){
  const authed = !!currentUser?.authenticated;
  if(tab==='requests' && !authed) tab = 'dm'; // там же й підказка "увійдіть"
  chatTab = tab;
  ['dm','requests','threads'].forEach(k=>{
    document.getElementById(`chat-tab-${k}`).classList.toggle('active', tab===k);
    document.getElementById(`chat-${k}-section`).style.display = tab===k ? '' : 'none';
  });
  document.getElementById('chat-tab-requests').style.display = authed ? '' : 'none';
  if(tab==='dm'){
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
    setBadge('chat-tab-dm-badge', d.unread);
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
        ${r.avatarUrl ? `<img src="${esc(r.avatarUrl)}" alt="">` : `<span class="chat-conv-ph"><svg class="icon"><use href="#icon-user"/></svg></span>`}
        <div class="dm-request-main">
          <div><a href="#" class="artist-link" onclick="openUserProfilePage(${r.userId});return false;"><strong>${esc(r.displayName)}</strong></a> <span class="hint">· ${esc(r.createdAt)}</span></div>
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
        ${c.avatarUrl ? `<img src="${esc(c.avatarUrl)}" alt="">` : `<span class="chat-conv-ph"><svg class="icon"><use href="#icon-user"/></svg></span>`}
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
    box.innerHTML = list.length
      ? list.map(m=>`<div class="chat-msg${m.isMine?' mine':''}"><div class="chat-msg-body">${esc(m.body)}</div><div class="chat-msg-time">${esc(m.createdAt)}</div></div>`).join('')
      : `<div class="empty" style="padding:2rem 1rem;">${t('chat.startConversation')}</div>`;
    box.scrollTop = box.scrollHeight;
    refreshDmBadge();
  }).catch(()=>{});
}
// "Видалити чат у себе": переписка зникає лише в мене; нове повідомлення поверне розмову.
async function deleteChatForMe(){
  const id = currentChatUserId;
  if(id == null || !await confirmModal({ title: t('chat.clearTitle'), text: t('chat.clearConfirm'), confirmLabel: t('chat.clearBtn') })) return;
  fetch(`/api/messages/${id}`, { method:'DELETE' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      currentChatUserId = null;
      _chatPartnerName = '';
      document.getElementById('chat-dm-panel').style.display = 'none';
      document.getElementById('chat-dm-empty').style.display = '';
      loadConversations();
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
  if(!body || currentChatUserId == null) return;
  fetch(`/api/messages/${currentChatUserId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) })
    .then(r=>{
      if(r.status === 409 || r.status === 403){ loadDmThread(); return; } // запит ще не схвалено / відхилено — підказка вже пояснить
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      input.value = '';
      loadDmThread();
      loadConversations();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ─── Гілки обговорень ────────────────────────────────────────────────────
let threadsSearchTimer = null;
function onThreadsSearchInput(){
  clearTimeout(threadsSearchTimer);
  threadsSearchTimer = setTimeout(loadThreads, 300);
}
function _userLinkHtml(u){
  if(!u) return `<span style="color:var(--muted)">${esc(t('threads.deletedUser'))}</span>`;
  return `<a href="#" class="artist-link" onclick="event.stopPropagation();openUserProfileOrLogin(${u.userId});return false;">${esc(u.displayName)}</a>`;
}
function loadThreads(){
  const q = document.getElementById('threads-search').value.trim();
  document.getElementById('threads-new-btn').style.display = currentUser?.authenticated ? '' : 'none';
  fetch(`/api/threads${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('threads-empty').style.display = list.length ? 'none' : '';
    document.getElementById('threads-list').innerHTML = list.map(th=>`
      <div class="ext-search-item thread-card" onclick="openThread(${th.id})">
        <div class="es-main">
          <strong>${esc(th.title)}</strong>
          <span>${t('threads.by')} ${_userLinkHtml(th.author)} · ${esc(th.createdAt)}</span>
        </div>
        <div class="es-meta">
          <span class="es-year"><svg class="icon"><use href="#icon-chat"/></svg> ${th.postCount}</span>
          <span class="es-year">${t('threads.lastActivity')} ${esc(th.lastPostAt)}</span>
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
function openThread(id){
  currentThreadId = id;
  chatTab = 'threads';
  if(!document.getElementById('page-chat').classList.contains('active')) showPage('chat');
  else loadThreadDetail();
}
function closeThreadDetail(){
  currentThreadId = null;
  document.getElementById('thread-detail-view').style.display = 'none';
  document.getElementById('threads-list-view').style.display = '';
  loadThreads();
}
function _canModerate(author){
  return !!currentUser?.isAdmin || (!!author && author.userId === currentUser?.userId);
}
function _deleteBtnHtml(onclick){
  return `<button class="btn-icon-danger" onclick="event.stopPropagation();${onclick}" title="${t('modal.confirmDelete')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg></button>`;
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
    document.getElementById('thread-detail-title').textContent = th.title;
    document.getElementById('thread-detail-meta').innerHTML = `${_userLinkHtml(th.author)} · ${esc(th.createdAt)}`;
    document.getElementById('thread-detail-body').textContent = th.body;
    document.getElementById('thread-detail-actions').innerHTML = _canModerate(th.author) ? _deleteBtnHtml(`deleteThread(${th.id})`) : '';
    document.getElementById('thread-posts').innerHTML = th.posts.map(p=>`
      <div class="thread-post">
        <div class="thread-post-head"><div class="thread-post-meta">${_userLinkHtml(p.author)} · ${esc(p.createdAt)}</div>${_canModerate(p.author) ? _deleteBtnHtml(`deleteThreadPost(${p.id})`) : ''}</div>
        <div class="thread-post-body">${esc(p.body)}</div>
      </div>`).join('');
  }).catch(()=>{});
}
function replyToThread(){
  const input = document.getElementById('thread-reply-input');
  const body = input.value.trim();
  if(!body || currentThreadId == null) return;
  fetch(`/api/threads/${currentThreadId}/posts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body }) })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      input.value = '';
      loadThreadDetail();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
async function deleteThread(id){
  if(!await confirmModal({ title: t('modal.deleteShortTitle'), text: t('threads.confirmDeleteThread'), confirmLabel: t('modal.confirmDelete') })) return;
  fetch(`/api/threads/${id}`, { method:'DELETE' }).then(r=>{ if(r.ok) closeThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}
async function deleteThreadPost(postId){
  if(!await confirmModal({ title: t('modal.deleteShortTitle'), text: t('threads.confirmDeletePost'), confirmLabel: t('modal.confirmDelete') })) return;
  fetch(`/api/threads/posts/${postId}`, { method:'DELETE' }).then(r=>{ if(r.ok) loadThreadDetail(); else alert(t('msg.connectionError')); }).catch(()=>{});
}
