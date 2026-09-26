// Друзі (пошук, запити, список) і публічний профіль іншого користувача.

// ================================================================
// ДРУЗІ: пошук людей, вхідні/надіслані запити, список друзів
// ================================================================
let friendsSearchTimer = null;
function onFriendsSearchInput(){
  clearTimeout(friendsSearchTimer);
  friendsSearchTimer = setTimeout(runFriendsSearch, 350);
}
function _friendActionButtonHtml(u){
  if(u.relationshipStatus === 'friends')
    return `<button class="btn btn-outline active" onclick="event.stopPropagation();unfriendUser(${u.userId})"><svg class="icon"><use href="#icon-check"/></svg> ${esc(t('friends.friendsBadge'))}</button>`;
  if(u.relationshipStatus === 'pending_outgoing')
    return `<button class="btn btn-outline" onclick="event.stopPropagation();alert('${esc(t('friends.pendingLabel'))}')" title="${t('friends.pendingLabel')}">${t('friends.pendingLabel')}</button>`;
  if(u.relationshipStatus === 'pending_incoming')
    return `<button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequestFromUser(${u.userId})">${t('friends.acceptBtn')}</button>`;
  return `<button class="btn btn-primary" onclick="event.stopPropagation();sendFriendRequest(${u.userId})">${t('friends.addBtn')}</button>`;
}
// Аватарка в рядках сторінки друзів (пошук, запити, друзі) — фото або ініціали.
function _friendAvatarHtml(url, name){
  return avatarHtml(url, name, 'friend-avatar');
}
function runFriendsSearch(){
  const q = document.getElementById('friends-search').value.trim();
  const wrap = document.getElementById('friends-search-results');
  const empty = document.getElementById('friends-search-empty');
  if(!q){ wrap.innerHTML = ''; empty.style.display = 'none'; return; }
  fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then(r=>r.ok?r.json():[]).then(list=>{
    empty.style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        ${_friendAvatarHtml(u.avatarUrl, u.displayName)}<div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        ${_friendActionButtonHtml(u)}
      </div>`).join('');
  }).catch(()=>{});
}
// Друзі — вкладка сторінки "Спілкування" (раніше окрема сторінка /friends).
function _friendsTabOpen(){
  return !!document.getElementById('page-chat')?.classList.contains('active') && chatTab === 'friends';
}
function loadFriendsPage(){
  if(!currentUser?.authenticated) return;
  document.getElementById('friends-search').value = '';
  document.getElementById('friends-search-results').innerHTML = '';

  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-incoming-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-incoming-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        ${_friendAvatarHtml(r.avatarUrl, r.displayName)}<div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-outgoing-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-outgoing-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        ${_friendAvatarHtml(r.avatarUrl, r.displayName)}<div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.cancelBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-list-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-list').innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        ${_friendAvatarHtml(u.avatarUrl, u.displayName)}<div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();unfriendUser(${u.userId})">${t('friends.unfriendBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});
}
function sendFriendRequest(targetUserId){
  fetch('/api/friends/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ targetUserId }) })
    .then(r=>{ if(r.ok){ runFriendsSearch(); if(_friendsTabOpen()) loadFriendsPage(); if(currentProfileUserId===targetUserId) loadUserProfilePage(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}/accept`, { method:'POST' })
    .then(r=>{ if(r.ok){ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequestFromUser(userId){
  // Пошук людей не знає requestId (лише статус) — знаходимо його через вхідні запити.
  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    const req = list.find(r=>r.userId===userId);
    if(req) acceptFriendRequest(req.requestId);
  }).catch(()=>{});
}
function cancelOrRejectFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); if(currentProfileUserId!=null) loadUserProfilePage(); })
    .catch(()=>{});
}
function unfriendUser(userId){
  fetch(`/api/friends/${userId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); if(currentProfileUserId===userId) loadUserProfilePage(); })
    .catch(()=>{});
}

// ================================================================
// ПУБЛІЧНИЙ ПРОФІЛЬ іншого користувача
// ================================================================
let currentProfileUserId = null;
function openUserProfilePage(userId){
  currentProfileUserId = userId;
  showPage('user-profile');
}
function loadUserProfilePage(){
  const id = currentProfileUserId;
  if(id == null) return;
  document.getElementById('user-profile-content').style.display = 'none';
  document.getElementById('user-profile-not-found').style.display = 'none';
  fetch(`/api/users/${id}`).then(r=>r.ok?r.json():null).then(u=>{
    if(!u){ document.getElementById('user-profile-not-found').style.display = ''; return; }
    document.getElementById('user-profile-content').style.display = '';
    document.getElementById('user-profile-name').textContent = u.displayName;
    document.getElementById('user-profile-member-since').textContent = u.memberSince ? `${t('profile.public.memberSince')} ${u.memberSince}` : '';
    const img = document.getElementById('user-profile-avatar');
    const ph = document.getElementById('user-profile-avatar-ph');
    if(u.avatarUrl){ img.src = u.avatarUrl; img.style.display = ''; ph.style.display = 'none'; }
    else { img.style.display = 'none'; ph.style.display = ''; fillAvatarPlaceholder(ph, u.displayName); }

    document.getElementById('user-profile-stat-listened').textContent = u.totalListened ?? 0;
    document.getElementById('user-profile-stat-favorites').textContent = u.favoritesCount ?? 0;
    document.getElementById('user-profile-stat-playlists').textContent = (u.publicPlaylists || []).length;

    const genresWrap = document.getElementById('user-profile-top-genres-wrap');
    if(u.topGenres && u.topGenres.length){
      genresWrap.style.display = '';
      document.getElementById('user-profile-top-genres').innerHTML = u.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
    } else {
      genresWrap.style.display = 'none';
    }

    const plEmpty = document.getElementById('user-profile-playlists-empty');
    const plList = document.getElementById('user-profile-playlists-list');
    const playlists = u.publicPlaylists || [];
    plEmpty.style.display = playlists.length ? 'none' : '';
    plList.innerHTML = playlists.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');

    document.getElementById('user-profile-message-btn').style.display = u.relationshipStatus === 'self' ? 'none' : '';
    const btn = document.getElementById('user-profile-action-btn');
    if(u.relationshipStatus === 'self'){
      btn.style.display = 'none';
    } else if(u.relationshipStatus === 'friends'){
      btn.style.display = ''; btn.className = 'btn btn-outline active'; btn.textContent = t('friends.unfriendBtn');
      btn.onclick = () => unfriendUser(id);
    } else if(u.relationshipStatus === 'pending_outgoing'){
      btn.style.display = ''; btn.className = 'btn btn-outline'; btn.textContent = t('friends.cancelBtn');
      btn.onclick = () => { fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
        const req = list.find(r=>r.userId===id); if(req) cancelOrRejectFriendRequest(req.requestId);
      }); };
    } else if(u.relationshipStatus === 'pending_incoming'){
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.acceptBtn');
      btn.onclick = () => acceptFriendRequestFromUser(id);
    } else {
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.addBtn');
      btn.onclick = () => sendFriendRequest(id);
    }
  }).catch(()=>{ document.getElementById('user-profile-not-found').style.display = ''; });
}
function onUserProfileActionClick(){ /* onclick встановлюється динамічно в loadUserProfilePage() */ }
