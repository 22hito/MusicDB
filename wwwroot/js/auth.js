// Конфіг і вхід (initApp, currentUser, шапка), дзвіночок сповіщень.

// ================================================================
// CONFIG & AUTH
// ================================================================
let currentUser = null;
// Кілька ключів для автоматичної ротації, коли поточний впирається у денний ліміт квоти.
// Ключі приходять лише з /config (initApp). Раніше тут були вписані ключі —
// їх знайшов GitGuardian у публічному репозиторії; не повертати.
let ytApiKeys = [];
let ytApiKeyIdx = 0;

// Мінімальний час показу сплешу — на швидкому з'єднанні дані готові за
// лічені мс, і сплеш без цього блимнув би непомітною смугою замість того,
// щоб просто плавно зникнути (миготіння відчувається гірше, ніж коротка затримка).
const _splashStart = performance.now();
function _hideSplash(){
  const el = document.getElementById('app-splash');
  if(!el) return;
  const elapsed = performance.now() - _splashStart;
  setTimeout(() => {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 450);
  }, Math.max(0, 350 - elapsed));
}

let appVersion = ''; // версія N'Owl з /config — показується в налаштуваннях
async function initApp() {
  const [cfgRes, meRes] = await Promise.all([
    fetch('/config').then(r=>r.ok?r.json():{}).catch(()=>({})),
    fetch('/auth/me').then(r=>r.ok?r.json():{authenticated:false}).catch(()=>({authenticated:false}))
  ]);
  if(cfgRes.youtubeApiKeys && cfgRes.youtubeApiKeys.length) ytApiKeys = cfgRes.youtubeApiKeys;
  if(cfgRes.version) appVersion = cfgRes.version;
  currentUser = meRes;
  if(currentUser?.authenticated){
    try {
      const profile = await fetch('/api/profile').then(r=>r.ok?r.json():null);
      if(profile){ currentUser.displayName = profile.displayName; currentUser.avatarUrl = profile.avatarUrl; }
    } catch(e) {}
  }
  try {
    await loadSongs();
  } catch(e) {
    console.error('loadSongs error:', e);
  }
  renderAuthArea();
  renderSongs();
  await updateStats();
  _initRouter();
  _hideSplash();
}

function renderAuthArea() {
  const area = document.getElementById('auth-area');
  const isAdmin = currentUser?.isAdmin;
  const authed = currentUser?.authenticated;
  document.body.classList.toggle('admin-mode', !!isAdmin);
  document.body.classList.toggle('authed-mode', !!authed);

  document.getElementById('tab-request').style.display = authed ? '' : 'none';
  document.getElementById('tab-recommendations').style.display = authed ? '' : 'none';
  const thAction = document.getElementById('th-action');
  if(thAction) thAction.style.display = isAdmin ? '' : 'none';
  const thFav = document.getElementById('th-fav');
  if(thFav) thFav.style.display = authed ? '' : 'none';
  const normalizeBtn = document.getElementById('normalize-genres-btn');
  if(normalizeBtn) normalizeBtn.style.display = isAdmin ? '' : 'none';
  const btnEditCurrent = document.getElementById('btn-edit-current');
  if(btnEditCurrent) btnEditCurrent.style.display = (isAdmin && playerQueue[playerIndex]) ? '' : 'none';
  const btnRateCurrent = document.getElementById('btn-rate-current');
  if(btnRateCurrent) btnRateCurrent.style.display = playerQueue[playerIndex] ? '' : 'none';

  if(authed) loadFavoriteIds(); else favoriteIds = new Set();

  if (authed) {
    const avatarSrc = currentUser.avatarUrl || currentUser.picture;
    const displayLabel = currentUser.displayName || currentUser.name || currentUser.email || '';
    const pic = avatarSrc
      ? `<img src="${avatarSrc}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);object-fit:cover;">`
      : avatarHtml(null, displayLabel, 'nav-avatar');
    area.innerHTML = `
      <div class="dropdown" id="notif-dropdown" style="margin-right:0.3rem;">
        <button class="dropdown-toggle" onclick="toggleDropdown(event,'notif-dropdown'); onOpenNotifDropdown();" title="${t('notif.bellTitle')}">
          <svg class="icon"><use href="#icon-bell"/></svg><span id="notif-badge" class="badge" style="display:none;margin-left:2px;"></span>
        </button>
        <div class="dropdown-menu" id="notif-list" style="min-width:320px;max-height:420px;overflow-y:auto;"></div>
      </div>
      <button class="dropdown-toggle nav-dm-btn" onclick="openChatPage('dm')" title="${t('chat.tab.dm')}" style="margin-right:0.3rem;">
        <svg class="icon"><use href="#icon-chat"/></svg><span id="dm-badge" class="badge" style="display:none;margin-left:2px;"></span>
      </button>
      <div class="dropdown" id="profile-dropdown">
        <button class="dropdown-toggle" onclick="if(_isPhoneLayout()){ showPage('profile'); return; } toggleDropdown(event,'profile-dropdown')" title="${t('nav.profile')}" style="height:auto;padding:0.25rem 0.6rem 0.25rem 0.3rem;">
          ${pic}
          <span class="nav-profile-name" style="color:var(--muted);font-size:0.78rem;font-family:var(--font-ui);">${esc(displayLabel)}</span>
        </button>
        <div class="dropdown-menu">
          <button onclick="showPage('profile')" data-i18n="nav.profile">${t('nav.profile')}</button>
          <button onclick="showPage('settings')" id="tab-settings" class="nav-menu-item" data-i18n="nav.settings">${t('nav.settings')}</button>
          <button onclick="openChatPage('friends')" data-i18n="nav.friends">${t('nav.friends')}</button>
          <button onclick="openChatPage('dm')" data-i18n="nav.messages">${t('nav.messages')}</button>
          <button onclick="openBugReportModal()"><svg class="icon"><use href="#icon-bug"/></svg> ${t('bugs.menu')}</button>
          ${isAdmin?`<button onclick="showPage('admin-hub')" id="tab-admin-hub" class="nav-menu-item"><svg class="icon"><use href="#icon-settings"/></svg> ${t('nav.adminHub')}<span id="admin-requests-badge" class="badge" style="display:none;margin-left:auto;"></span></button>`:''}
        </div>
      </div>
      ${isAdmin?'<span class="nav-admin-tag" style="background:var(--accent);color:var(--on-accent);font-size:0.65rem;font-family:var(--font-ui);padding:0.15rem 0.5rem;border-radius:4px;font-weight:700;">ADMIN</span>':''}
      <button class="nav-logout-btn" onclick="logout()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:0.3rem 0.75rem;font-size:0.72rem;font-family:var(--font-ui);cursor:pointer;">${t('auth.logout')}</button>
    `;
    refreshNotifBadge();
    refreshDmBadge();
    if(isAdmin){ refreshAdminRequestsBadge(); refreshBugsBadge(); }
  } else {
    area.innerHTML = `
      <button onclick="login()" class="nav-login-btn">
        ${t('auth.loginBtn')}
      </button>
    `;
  }
}

// ================================================================
// СПОВІЩЕННЯ (дзвіночок) — підписки на виконавців

// ================================================================
// Бейдж/список — події виконавців + вхідні запити дружби; запити зникають зі списку при прийнятті/відхиленні.
function refreshNotifBadge(){
  const badge = document.getElementById('notif-badge');
  if(!badge) return;
  Promise.all([
    fetch('/api/notifications?limit=1').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.isAdmin ? fetch('/api/admin-notifications?limit=1').then(r=>r.ok?r.json():null).catch(()=>null) : Promise.resolve(null)
  ]).then(([notif, incoming, adminNotif])=>{
    const count = (notif?.unreadCount || 0) + (incoming?.length || 0) + (adminNotif?.unreadCount || 0);
    const fb = document.getElementById('chat-tab-friends-badge');
    if(fb){ fb.textContent = incoming?.length || ''; fb.style.display = incoming?.length ? '' : 'none'; }
    if(count > 0){ badge.textContent = count > 99 ? '99+' : count; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
    _unreadCounts.notif = count;
    _updateTitleBadge();
  });
}
// Непрочитане (сповіщення + повідомлення + запити) видно й у назві вкладки —
// коли сайт відкритий у фоні, "(3) N'Owl" одразу показує, що щось прийшло.
const _unreadCounts = { notif: 0, dm: 0 };
function _updateTitleBadge(){
  const n = currentUser?.authenticated ? _unreadCounts.notif + _unreadCounts.dm : 0;
  const base = t('page.title');
  document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${base}` : base;
}

// Короткі спливаючі сповіщення (нове повідомлення, запит у друзі, дія адміна).
function showToast(text, onClick){
  let box = document.getElementById('toast-stack');
  if(!box){
    box = document.createElement('div');
    box.id = 'toast-stack';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'toast';
  el.textContent = text;
  const close = () => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 250); };
  el.onclick = () => { close(); onClick?.(); };
  box.appendChild(el);
  while(box.children.length > 4) box.firstElementChild.remove();
  setTimeout(close, 6000);
}
function _notifEventText(type){
  if(type === 'song_added') return t('notif.event.songAdded');
  if(type === 'song_removed') return t('notif.event.songRemoved');
  if(type === 'lyrics_added') return t('notif.event.lyricsAdded');
  return type;
}
// "hito схвалює запит", "hito додав" — дієслово залежить від типу події адмін-журналу.
function _adminEventText(n){
  const actor = n.actor ? `<strong>${esc(n.actor.displayName)}</strong>` : `<strong>${esc(t('adminNotif.someone'))}</strong>`;
  const verb = t('adminNotif.' + n.eventType);
  const src = n.source === 'community' ? ` <span class="badge source-community">${t('home.source.community')}</span>` : '';
  return `${actor} ${esc(verb)}${src}`;
}
function onOpenNotifDropdown(){
  const list = document.getElementById('notif-list');
  list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.loading')}</div>`;
  Promise.all([
    fetch('/api/notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.isAdmin ? fetch('/api/admin-notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null) : Promise.resolve(null)
  ]).then(([d, incoming, adminData])=>{
    const recent = d?.recent || [];
    const adminRecent = adminData?.recent || [];
    const adminUnread = adminData?.unreadCount || 0;
    if(!recent.length && !incoming.length && !adminRecent.length){
      list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.empty')}</div>`;
      return;
    }
    const incomingHtml = incoming.map(r=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;" onclick="openUserProfilePage(${r.userId})">
        <div style="font-size:0.8rem;"><strong>${esc(r.displayName)}</strong><div style="font-size:0.72rem;color:var(--muted);">${t('friends.incomingRequestLabel')}</div></div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-primary" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
    const notifHtml = recent.map(n=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;" onclick="openArtistPage(${n.artistId})">
        <div>
          <div style="font-size:0.8rem;"><strong>${esc(n.artistName)}</strong> — ${_notifEventText(n.eventType)}</div>
          <div style="font-size:0.75rem;color:var(--muted);">${esc(n.songLabel)}</div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">${esc(n.createdAt)}</div>
        </div>
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.15rem 0.4rem;flex-shrink:0;" title="${t('notif.markOneRead')}" onclick="event.stopPropagation();markOneNotificationRead(${n.id})"><svg class="icon"><use href="#icon-check"/></svg></button>
      </div>`).join('');
    // Непрочитані адмін-події йдуть першими в списку (сортування — новіші вгорі).
    const adminHtml = adminRecent.length ? `
      <div class="notif-section-title">${t('adminNotif.sectionTitle')}</div>
      ${adminRecent.map((n,i)=>`
      <div class="notif-item${i<adminUnread?' unread':''}" onclick="openAdminHub('${n.eventType}')">
        <div style="font-size:0.8rem;">${_adminEventText(n)}</div>
        <div style="font-size:0.75rem;color:var(--muted);">${esc(n.label)}</div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">${esc(n.createdAt)}</div>
      </div>`).join('')}
      ${(recent.length || incoming.length) ? `<div class="notif-section-title">${t('notif.sectionTitle')}</div>` : ''}` : '';
    list.innerHTML = `
      ${(recent.length || adminUnread) ? `<div style="display:flex;justify-content:flex-end;padding:0.3rem 0.5rem;">
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.6rem;" onclick="markAllNotificationsRead()">${t('notif.markAllRead')}</button>
      </div>` : ''}
      ${adminHtml}${incomingHtml}${notifHtml}
    `;
  });
}
function markAllNotificationsRead(){
  Promise.all([
    fetch('/api/notifications/mark-read', { method:'POST' }),
    currentUser?.isAdmin ? fetch('/api/admin-notifications/mark-read', { method:'POST' }) : Promise.resolve()
  ]).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}
// Кількість заявок, що чекають розгляду — біля пункту "Адмін-панель" у меню профілю.
function refreshAdminRequestsBadge(){
  const badge = document.getElementById('admin-requests-badge');
  if(!badge || !currentUser?.isAdmin) return;
  fetch('/api/requests').then(r=>r.ok?r.json():[]).then(list=>{
    badge.textContent = list.length > 99 ? '99+' : list.length;
    badge.style.display = list.length ? '' : 'none';
  }).catch(()=>{});
}
function markOneNotificationRead(eventId){
  fetch(`/api/notifications/${eventId}/mark-read`, { method:'POST' }).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}

function login() { window.location.href = '/auth/login'; }

// Обидві головні таблиці разом — будь-яка мутація (підтвердження заявки,
// редагування) може зачепити будь-яку з них.
async function loadSongs() {
  const [res, communityRes] = await Promise.all([fetch('/api/songs'), fetch('/api/songs?source=community')]);
  if (!res.ok) throw new Error('songs fetch failed');
  songs = await res.json();
  if (communityRes.ok) communitySongs = await communityRes.json();
}

async function logout() {
  await fetch('/auth/logout', {method:'POST'});
  currentUser = {authenticated:false};
  // Перепідключення — щоб сервер вивів з'єднання з групи користувача/адмінів.
  if(rtConn){ _rtManualStop = true; rtConn.stop().finally(() => { _rtManualStop = false; _startRealtime(); }); }
  renderAuthArea();
  // Go to home, re-render
  showPage('home');
}
