// Realtime (SignalR): живі оновлення без перезавантаження сторінки.

// ================================================================
// REALTIME (SignalR) — усі відкриті вкладки перезавантажують дані при мутації пісні/заявки.
// ================================================================
let rtConn = null;
if (window.signalR) {
  // withAutomaticReconnect() за замовчуванням робить лише 4 спроби (0/2/10/30с)
  // і здається назавжди: після рестарту сервера (деплой), сну ноутбука чи
  // обриву мережі вкладка лишалась без realtime до перезавантаження сторінки.
  // Тепер — безкінечно, з паузою до 30с.
  rtConn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/music')
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ctx => Math.min(30000, 1000 * 2 ** Math.min(ctx.previousRetryCount, 5)) })
    .build();

  rtConn.on('songsChanged', () => {
    loadSongs().then(() => { renderSongs(); updateStats(); }).catch(() => {});
    // Немає окремої SignalR-події на сповіщення — бейдж оновлюємо тут же.
    if(currentUser?.authenticated) refreshNotifBadge();
  });
  rtConn.on('requestsChanged', () => {
    if (currentUser?.isAdmin){ renderRequests(); refreshAdminRequestsBadge(); }
  });
  // Нова заявка / дія іншого адміна — лише для групи адмінів (MusicHub.AdminsGroup).
  rtConn.on('adminNotification', () => {
    refreshNotifBadge();
    // Текст події ("hito схвалює запит …") — з тієї ж стрічки, що й у дзвіночку.
    fetch('/api/admin-notifications?limit=1').then(r=>r.ok?r.json():null).then(d=>{
      const n = d?.recent?.[0];
      if(!n || d.unreadCount === 0) return;
      const tmp = document.createElement('div');
      tmp.innerHTML = _adminEventText(n);
      showToast(`${tmp.textContent.trim()}: ${n.label}`, () => openAdminHub(n.eventType));
    }).catch(()=>{});
    if(document.getElementById('notif-dropdown')?.classList.contains('open')) onOpenNotifDropdown();
  });
  rtConn.on('dmReceived', (fromUserId, name) => onDirectMessageEvent(fromUserId, name));
  rtConn.on('dmSent', (toUserId) => onDirectMessageEvent(toUserId));
  rtConn.on('dmRequestsChanged', (otherUserId, name) => onDmRequestsEvent(otherUserId, name));
  // Друзі: запит / прийняття / видалення — раніше інша сторона бачила це лише після перезавантаження.
  rtConn.on('friendsChanged', (otherUserId, name, kind) => {
    refreshNotifBadge();
    if(document.getElementById('notif-dropdown')?.classList.contains('open')) onOpenNotifDropdown();
    if(document.getElementById('page-friends')?.classList.contains('active')) loadFriendsPage();
    if(document.getElementById('page-user-profile')?.classList.contains('active') && currentProfileUserId === otherUserId) loadUserProfilePage();
    // Дружба змінює і право писати без запиту на листування.
    if(document.getElementById('page-chat')?.classList.contains('active') && chatTab === 'dm' && currentChatUserId === otherUserId) loadDmThread();
    if(name && kind === 'request') showToast(t('toast.friendRequest').replace('{name}', name), () => showPage('friends'));
    if(name && kind === 'accepted') showToast(t('toast.friendAccepted').replace('{name}', name), () => openUserProfilePage(otherUserId));
  });
  rtConn.on('threadsChanged', (threadId) => {
    if(!document.getElementById('page-chat')?.classList.contains('active') || chatTab !== 'threads') return;
    if(currentThreadId === threadId) loadThreadDetail();
    else if(currentThreadId == null) loadThreads();
  });
  rtConn.on('ratingChanged', (musicId, avg, count) => _applyRatingSummary(musicId, avg, count));
  rtConn.on('bugReportsChanged', () => {
    refreshBugsBadge();
    if(document.getElementById('admin-hub-bugs-section')?.style.display === '') loadBugReports();
  });

  // Після розриву могли пропустити події — один раз дотягуємо все актуальне.
  rtConn.onreconnected(() => _resyncRealtime(true));
  rtConn.onclose(() => { if(!_rtManualStop) setTimeout(_startRealtime, 5000); });
  _startRealtime();
}
let _rtManualStop = false;
// Перший старт теж може впасти (сервер саме перезапускається) — пробуємо ще.
function _startRealtime(){
  if(!rtConn || rtConn.state !== 'Disconnected') return;
  rtConn.start().catch(() => setTimeout(_startRealtime, 5000));
}
function _resyncRealtime(withSongs){
  if(currentUser?.authenticated){
    refreshNotifBadge();
    refreshDmBadge();
    if(currentUser.isAdmin){ refreshAdminRequestsBadge(); refreshBugsBadge(); renderRequests(); }
    if(document.getElementById('page-chat')?.classList.contains('active')) loadChatPage();
  }
  if(withSongs) loadSongs().then(() => { renderSongs(); updateStats(); }).catch(() => {});
}
// Повернулись на вкладку (браузер міг приспати з'єднання у фоні) — перевіряємо
// з'єднання й лічильники; не частіше разу на 30с, щоб не смикати API.
let _lastVisibleResync = 0;
document.addEventListener('visibilitychange', () => {
  if(document.hidden || !rtConn) return;
  _startRealtime();
  if(Date.now() - _lastVisibleResync > 30000){ _lastVisibleResync = Date.now(); _resyncRealtime(false); }
});
