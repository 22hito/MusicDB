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
  // Каталог — паралельно з усім іншим (браузер уже вантажить його з <link rel="preload"> в index.html),
  // а не після /config, /auth/me і профілю.
  const songsLoad = loadSongs().catch(e => console.error('loadSongs error:', e));
  const [cfgRes, meRes] = await Promise.all([
    fetch('/config').then(r=>r.ok?r.json():{}).catch(()=>({})),
    fetch('/auth/me').then(r=>r.ok?r.json():{authenticated:false}).catch(()=>({authenticated:false}))
  ]);
  if(cfgRes.youtubeApiKeys && cfgRes.youtubeApiKeys.length) ytApiKeys = cfgRes.youtubeApiKeys;
  if(cfgRes.version) appVersion = cfgRes.version;
  // Нік і аватарка (displayName, avatarUrl) — уже в /auth/me, без окремого /api/profile.
  currentUser = meRes;
  await songsLoad;
  appReady = true;
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
        <div class="dropdown-menu notif-menu" id="notif-list" onclick="event.stopPropagation()"></div>
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
          <button onclick="openMyCorrections()"><svg class="icon"><use href="#icon-flag"/></svg> ${t('corr.mine')}</button>
          ${isAdmin?`<button onclick="showPage('admin-hub')" id="tab-admin-hub" class="nav-menu-item"><svg class="icon"><use href="#icon-settings"/></svg> ${t('nav.adminHub')}<span id="admin-requests-badge" class="badge" style="display:none;margin-left:auto;"></span></button>`:''}
        </div>
      </div>
      ${isAdmin?'<span class="nav-admin-tag" style="background:var(--accent);color:var(--on-accent);font-size:0.65rem;font-family:var(--font-ui);padding:0.15rem 0.5rem;border-radius:4px;font-weight:700;">ADMIN</span>':''}
      <button class="nav-logout-btn" onclick="logout()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:0.3rem 0.75rem;font-size:0.72rem;font-family:var(--font-ui);cursor:pointer;">${t('auth.logout')}</button>
    `;
    refreshNotifBadge();
    refreshDmBadge();
    if(isAdmin){ refreshAdminRequestsBadge(); refreshBugsBadge(); refreshCorrectionsBadge(); }
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
// Усі лічильники (дзвіночок і листування) — одним запитом /api/notifications/badge. Виклики в тому самому
// завданні (на старті refreshNotifBadge і refreshDmBadge разом) ділять один запит; пізніші — завжди свіжий.
let _badgesPromise = null;
function _fetchBadges(){
  if(!_badgesPromise){
    _badgesPromise = fetch('/api/notifications/badge').then(r=>r.ok?r.json():null).catch(()=>null);
    setTimeout(()=>{ _badgesPromise = null; }, 0);
  }
  return _badgesPromise;
}
function refreshNotifBadge(){
  const badge = document.getElementById('notif-badge');
  if(!badge) return;
  _fetchBadges().then(b=>{
    if(!b) return;
    const count = b.artist + b.friendRequests + b.admin + b.threads;
    const fb = document.getElementById('chat-tab-friends-badge');
    if(fb){ fb.textContent = b.friendRequests || ''; fb.style.display = b.friendRequests ? '' : 'none'; }
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
// Дзвіночок: дві вкладки. «Загальні» — адмін-події, запити в друзі, нові пісні виконавців;
// «Обговорення» — нові дописи в гілках, де ви писали, з відповіддю просто звідси.
let _notifTab = 'general', _notifData = null, _notifReplyTo = null;
function _notifGo(fn){ document.getElementById('notif-dropdown')?.classList.remove('open'); fn(); }
function onOpenNotifDropdown(){
  const list = document.getElementById('notif-list');
  if(!list) return;
  if(!_notifData) list.innerHTML = `<div class="notif-loading">${t('notif.loading')}</div>`;
  Promise.all([
    fetch('/api/notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.isAdmin ? fetch('/api/admin-notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null) : Promise.resolve(null),
    fetch('/api/notifications/threads?limit=30').then(r=>r.ok?r.json():null).catch(()=>null)
  ]).then(([d, incoming, adminData, threadData])=>{
    const first = !_notifData;
    _notifData = { d, incoming, adminData, threadData };
    // Уперше відкриваємо ту вкладку, де є нове (обговорення — коли нове лише там).
    if(first){
      const general = (d?.unreadCount || 0) + incoming.length + (adminData?.unreadCount || 0);
      _notifTab = !general && threadData?.unreadCount ? 'threads' : 'general';
    }
    _renderNotif();
  });
}
function setNotifTab(tab){ _notifTab = tab; _notifReplyTo = null; _renderNotif(); }
function _renderNotif(){
  const list = document.getElementById('notif-list');
  if(!list || !_notifData) return;
  const { d, incoming, adminData, threadData } = _notifData;
  const recent = d?.recent || [], adminRecent = adminData?.recent || [], adminUnread = adminData?.unreadCount || 0;
  const threads = threadData?.recent || [], threadsUnread = threadData?.unreadCount || 0;
  const generalUnread = (d?.unreadCount || 0) + incoming.length + adminUnread;
  const badge = n => n ? `<span class="count-badge">${n > 99 ? '99+' : n}</span>` : '';
  const unreadHere = _notifTab === 'threads' ? threadsUnread : (d?.unreadCount || 0) + adminUnread;
  const head = `
    <div class="notif-head">
      <strong>${esc(t('notif.bellTitle'))}</strong>
      ${unreadHere ? `<button type="button" class="notif-markall" onclick="markAllNotificationsRead()"><svg class="icon"><use href="#icon-check"/></svg>${esc(t('notif.markAllRead'))}</button>` : ''}
    </div>
    <div class="seg-switch notif-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${_notifTab === 'general'}" class="${_notifTab === 'general' ? 'active' : ''}" onclick="setNotifTab('general')"><svg class="icon"><use href="#icon-bell"/></svg>${esc(t('notif.tab.general'))}${badge(generalUnread)}</button>
      <button type="button" role="tab" aria-selected="${_notifTab === 'threads'}" class="${_notifTab === 'threads' ? 'active' : ''}" onclick="setNotifTab('threads')"><svg class="icon"><use href="#icon-chat"/></svg>${esc(t('notif.tab.threads'))}${badge(threadsUnread)}</button>
    </div>`;
  const empty = (icon, text) => `<div class="notif-empty"><span class="notif-empty-icon"><svg class="icon"><use href="#icon-${icon}"/></svg></span>${esc(text)}</div>`;
  let body;
  if(_notifTab === 'threads'){
    body = threads.length ? threads.map(n => {
      const name = n.author?.displayName || t('threads.deletedUser');
      const verb = t(n.toMe ? 'notif.thread.toMe' : 'notif.thread.posted');
      const replying = _notifReplyTo === n.postId;
      const actions = n._sent
        ? `<div class="notif-sent"><svg class="icon"><use href="#icon-check"/></svg>${esc(t('notif.thread.sent'))}</div>`
        : replying ? `
          <div class="notif-composer">
            <textarea id="notif-reply-input" rows="2" maxlength="10000" placeholder="${esc(t('notif.thread.replyTo').replace('{name}', name))}" onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();sendNotifReply(${n.threadId},${n.postId});}"></textarea>
            <div class="notif-actions">
              <button type="button" class="btn btn-outline" onclick="notifReply(null)">${esc(t('modal.cancel'))}</button>
              <button type="button" class="btn btn-primary" id="notif-reply-send" onclick="sendNotifReply(${n.threadId},${n.postId})">${esc(t('notif.thread.send'))}</button>
            </div>
          </div>` : `
          <div class="notif-actions">
            <button type="button" class="btn btn-outline" onclick="notifReply(${n.postId})"><svg class="icon"><use href="#icon-reply"/></svg>${esc(t('notif.thread.reply'))}</button>
            <button type="button" class="btn btn-ghost" onclick="_notifGo(() => openThread(${n.threadId}, ${n.postId}))">${esc(t('notif.thread.open'))}</button>
          </div>`;
      return `
      <div class="notif-card${n.unread ? ' unread' : ''}">
        <button type="button" class="notif-card-main" onclick="_notifGo(() => openThread(${n.threadId}, ${n.postId}))">
          ${avatarHtml(n.author?.avatarUrl, name, 'notif-avatar')}
          <span class="notif-card-text"><span><strong>${esc(name)}</strong> ${esc(verb)} <em>«${esc(n.threadTitle)}»</em></span>${timeHtml(n.createdAt, 'notif-time')}</span>
          ${n.unread ? '<span class="notif-dot" aria-hidden="true"></span>' : ''}
        </button>
        <blockquote class="notif-quote">${esc(n.body)}</blockquote>
        ${actions}
      </div>`;
    }).join('') : empty('chat', t('notif.thread.empty'));
  } else {
    const adminHtml = adminRecent.map((n,i)=>`
      <button type="button" class="notif-row${i<adminUnread?' unread':''}" onclick="_notifGo(() => openAdminHub('${n.eventType}'))">
        <span class="notif-kind"><svg class="icon"><use href="#icon-settings"/></svg></span>
        <span class="notif-card-text"><span>${_adminEventText(n)}</span><span class="notif-sub">${esc(n.label)}</span>${timeHtml(n.createdAt, 'notif-time')}</span>
        ${i<adminUnread ? '<span class="notif-dot" aria-hidden="true"></span>' : ''}
      </button>`).join('');
    const incomingHtml = incoming.map(r=>`
      <div class="notif-card">
        <button type="button" class="notif-card-main" onclick="_notifGo(() => openUserProfilePage(${r.userId}))">
          ${avatarHtml(r.avatarUrl, r.displayName, 'notif-avatar')}
          <span class="notif-card-text"><strong>${esc(r.displayName)}</strong><span class="notif-sub">${t('friends.incomingRequestLabel')}</span></span>
          <span class="notif-dot" aria-hidden="true"></span>
        </button>
        <div class="notif-actions">
          <button type="button" class="btn btn-primary" onclick="acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button type="button" class="btn btn-outline" onclick="cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
    const artistHtml = recent.map(n=>`
      <div class="notif-row-wrap">
        <button type="button" class="notif-row unread" onclick="_notifGo(() => openArtistPage(${n.artistId}))">
          <span class="notif-kind"><svg class="icon"><use href="#icon-mic"/></svg></span>
          <span class="notif-card-text"><span><strong>${esc(n.artistName)}</strong> — ${_notifEventText(n.eventType)}</span><span class="notif-sub">${esc(n.songLabel)}</span>${timeHtml(n.createdAt, 'notif-time')}</span>
        </button>
        <button type="button" class="notif-check" title="${t('notif.markOneRead')}" aria-label="${t('notif.markOneRead')}" onclick="markOneNotificationRead(${n.id})"><svg class="icon"><use href="#icon-check"/></svg></button>
      </div>`).join('');
    body = adminRecent.length || incoming.length || recent.length
      ? (adminRecent.length ? `<div class="notif-section-title">${t('adminNotif.sectionTitle')}</div>${adminHtml}` : '')
        + ((incoming.length || recent.length) && adminRecent.length ? `<div class="notif-section-title">${t('notif.sectionTitle')}</div>` : '')
        + incomingHtml + artistHtml
      : empty('bell', t('notif.empty'));
  }
  list.innerHTML = head + `<div class="notif-body">${body}</div>`;
  if(_notifReplyTo != null) document.getElementById('notif-reply-input')?.focus();
}
function notifReply(postId){ _notifReplyTo = postId; _renderNotif(); }
function sendNotifReply(threadId, postId){
  const input = document.getElementById('notif-reply-input');
  const body = input?.value.trim();
  if(!body) return;
  const btn = document.getElementById('notif-reply-send');
  if(btn) btn.disabled = true;
  fetch(`/api/threads/${threadId}/posts`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ body, replyToPostId: postId }) })
    .then(r => {
      if(!r.ok){ alert(t('msg.connectionError')); if(btn) btn.disabled = false; return; }
      const n = _notifData?.threadData?.recent?.find(x => x.postId === postId);
      if(n) n._sent = true;
      _notifReplyTo = null;
      _renderNotif();
      refreshNotifBadge();
    })
    .catch(() => { alert(t('msg.connectionError')); if(btn) btn.disabled = false; });
}
function markAllNotificationsRead(){
  const reqs = _notifTab === 'threads'
    ? [fetch('/api/notifications/threads/mark-read', { method:'POST' })]
    : [fetch('/api/notifications/mark-read', { method:'POST' }), currentUser?.isAdmin ? fetch('/api/admin-notifications/mark-read', { method:'POST' }) : Promise.resolve()];
  Promise.all(reqs).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
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
  const [res, communityRes] = await Promise.all([fetch('/api/songs?format=cols'), fetch('/api/songs?source=community&format=cols')]);
  if (!res.ok) throw new Error('songs fetch failed');
  songs = _decodeCatalog(await res.json());
  if (communityRes.ok) communitySongs = _decodeCatalog(await communityRes.json());
}
// Каталог «стовпчиками» (format=cols): по масиву на поле, виконавці/альбоми/жанри — словниками,
// рідкісні поля — «індекс → значення». Утричі менший JSON і швидший розбір, ніж 18 000 об'єктів.
function _hms(sec){
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function _decodeCatalog(c){
  const n = c.id.length, out = new Array(n);
  const artists = c.artists || {}, source = c.source || {}, audio = c.audio || {}, rating = c.rating || {}, ratingCount = c.ratingCount || {}, submittedBy = c.submittedBy || {};
  for(let i = 0; i < n; i++){
    const artist = c.artistDict[c.artist[i]];
    let refs = artists[i];
    if(!refs){
      const ids = c.artistIds[i];
      if(ids){ const names = artist.split(',').map(x => x.trim()).filter(Boolean); refs = ids.map((id, k) => ({ id, name: names[k] })); }
    }
    out[i] = {
      id: c.id[i], artist, title: c.title[i], release: c.release[i], duration: _hms(c.dur[i]),
      genres: c.genres[i].map(g => c.genreDict[g]), album: c.album[i] >= 0 ? c.albumDict[c.album[i]] : null,
      trackNumber: c.track[i] || null, youtubeVideoId: c.yt[i] || null, playCount: c.plays[i] || 0,
      artists: refs || [], source: source[i] || 'catalog', audioUrl: audio[i] || null,
      avgRating: rating[i] ?? null, ratingCount: ratingCount[i] || 0, submittedBy: submittedBy[i] || null,
    };
  }
  return out;
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
