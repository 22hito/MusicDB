// Навігація: випадні меню, перемикання сторінок (showPage), мобільний таббар і пошук,
// маршрутизація через History API (кожна сторінка має власну адресу).

// ================================================================
// DROPDOWNS (тема / мова)
// ================================================================
function toggleDropdown(evt, id){
  evt.stopPropagation();
  document.querySelectorAll('.dropdown.open').forEach(d=>{ if(d.id !== id) d.classList.remove('open'); });
  document.getElementById(id).classList.toggle('open');
}
document.addEventListener('click', (e)=>{
  document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
  if(!e.target.closest('#nav-search')) _hideNavSearch();
});

let songs = [];          // головна таблиця_1 (каталог)
let communitySongs = []; // головна таблиця_2 (пісні від ком'юніті)
let homeSource = 'catalog';
let requests = [];
// Пісні таблиці, що зараз відкрита на "Головній".
function activeSongs(){ return homeSource === 'community' ? communitySongs : songs; }
// Пошук пісні в обох таблицях — для модалок редагування/видалення/оцінки.
function _findSong(id){
  return songs.find(x=>x.id===id) || communitySongs.find(x=>x.id===id)
    || playerQueue.find(x=>x.id===id) || currentTopSongs.find(x=>x.id===id) || null;
}

// ================================================================
// NAVIGATION

// ================================================================
// ─── Мобільна навігація (як у застосунку): таббар, розгортний пошук ───
// Той самий поріг, що й у css/mobile-app.css.
function _isPhoneLayout(){ return window.matchMedia('(max-width: 768px)').matches; }
function toggleMobileSearch(force){
  const open = force ?? !document.body.classList.contains('m-search-open');
  document.body.classList.toggle('m-search-open', open);
  if(open) setTimeout(() => document.getElementById('nav-search-input')?.focus(), 30);
}
// Лічильники на вкладках таббару — з бейджів шапки: Спілкування — ЛС, запити й запити в друзі,
// Адмін — заявки, що чекають, + відкриті баг-репорти (як у застосунку).
function _syncTabbarBadges(){
  const num = id => {
    const el = document.getElementById(id);
    return el && el.style.display !== 'none' ? parseInt(el.textContent, 10) || 0 : 0;
  };
  const set = (toId, n) => {
    const to = document.getElementById(toId);
    if(!to) return;
    to.textContent = n > 99 ? '99+' : n || '';
    to.classList.toggle('show', n > 0);
  };
  set('mtab-chat-badge', num('dm-badge') + num('chat-tab-friends-badge'));
  set('mtab-admin-badge', num('admin-requests-badge') + num('admin-bugs-badge'));
}
if(typeof MutationObserver === 'function'){
  const _badgeObs = new MutationObserver(() => _syncTabbarBadges());
  const _watchBadges = () => ['dm-badge', 'chat-tab-friends-badge', 'admin-requests-badge', 'admin-bugs-badge'].forEach(id => {
    const el = document.getElementById(id);
    if(el && !el._mtabWatched){ el._mtabWatched = true; _badgeObs.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] }); }
  });
  new MutationObserver(() => { _watchBadges(); _syncTabbarBadges(); }).observe(document.getElementById('auth-area'), { childList: true });
}

function showPage(n){
  const doSwitch = () => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-menu-item, #tab-home').forEach(b=>b.classList.remove('active'));
    document.getElementById('page-'+n).classList.add('active');
    // Таблиця_2 живе на тій самій сторінці "Головна" — підсвічуємо її пункт меню.
    const tab = document.getElementById(n==='home' && homeSource==='community' ? 'tab-community' : 'tab-'+n);
    if(tab) tab.classList.add('active');
  };
  _hideNavSearch();
  document.body.classList.remove('m-search-open');
  document.documentElement.setAttribute('data-page', n);
  _routerOnShowPage(n);
  // View Transitions API — нативний крос-фейд між сторінками (Chrome/Edge,
  // а отже й Electron). Без підтримки (Firefox/Safari) просто миттєво
  // перемикає, як і раніше — жодного regressions, лише бонус там, де є.
  if(document.startViewTransition && !_reducedMotion()){
    // Швидкий перехід на ще одну сторінку перериває попередню анімацію — це
    // нормально, але без catch браузер кидав у консоль "AbortError: Transition was skipped".
    document.startViewTransition(doSwitch).ready.catch(() => {});
  }
  else doSwitch();
  // Важкий перерендер відкладаємо на наступний кадр — інакше перехід між сторінками виглядає як підвисання.
  requestAnimationFrame(()=>{
    if(n==='home'){renderSongs();updateStats().catch(console.error);}
    if(n==='top') loadTopSongsPage();
    if(n==='admin-hub'){ switchAdminHubTab(_pendingAdminHubTab || 'requests'); _pendingAdminHubTab = null; renderRequests(); }
    if(n==='profile') loadProfilePage();
    if(n==='recommendations') loadRecommendationsPage();
    if(n==='wheel') openWheelPage();
    if(n==='battle') openBattlePage();
    if(n==='taste') loadTastePage();
    if(n==='artists') loadArtistsPage();
    if(n==='artist') loadArtistPage();
    if(n==='user-profile') loadUserProfilePage();
    if(n==='settings') loadSettingsPage();
    if(n==='chat') loadChatPage();
  });
}

// ================================================================
// МАРШРУТИЗАЦІЯ: кожна сторінка має власну адресу (History API)
// Раніше URL не змінювався взагалі — "назад/вперед" у браузері, кнопка
// миші "назад" (mouse4) і посилання на конкретну сторінку не працювали, а
// нова сторінка відкривалась на тій самій висоті прокрутки, що й попередня,
// тож виглядала як вікно поверх головної. Тепер: showPage() пише адресу в
// історію, popstate відкриває сторінку з адреси й відновлює прокрутку.
// Сервер віддає index.html на будь-який не-API шлях (MapFallbackToFile).
// ================================================================
const _PAGE_PATHS = {
  top: '/top', artists: '/artists', profile: '/profile',
  settings: '/settings', wheel: '/wheel', battle: '/battle', taste: '/taste',
  recommendations: '/recommendations', request: '/request', 'admin-hub': '/admin', explore: '/explore',
};
function _pathForPage(n){
  if(n === 'home') return homeSource === 'community' ? '/community' : '/';
  if(n === 'artist') return currentArtistId != null ? `/artist/${currentArtistId}` : '/artists';
  if(n === 'playlist') return currentPlaylistId != null ? `/playlist/${currentPlaylistId}` : '/profile';
  if(n === 'user-profile') return currentProfileUserId != null ? `/user/${currentProfileUserId}` : '/chat/friends';
  if(n === 'chat') return chatTab && chatTab !== 'threads' ? `/chat/${chatTab}` : '/chat';
  return _PAGE_PATHS[n] || '/';
}
function _parsePath(path){
  const p = (path || '/').replace(/\/+$/, '') || '/';
  let m;
  if(p === '/') return { page: 'home', source: 'catalog' };
  if(p === '/community') return { page: 'home', source: 'community' };
  if(p === '/profile/settings') return { page: 'profile' }; // стара адреса: нікнейм і аватар тепер у картці профілю
  if((m = p.match(/^\/artist\/(\d+)$/))) return { page: 'artist', id: +m[1] };
  if((m = p.match(/^\/playlist\/(\d+)$/))) return { page: 'playlist', id: +m[1] };
  if((m = p.match(/^\/user\/(\d+)$/))) return { page: 'user-profile', id: +m[1] };
  if((m = p.match(/^\/chat(?:\/(dm|requests|threads|friends))?$/))) return { page: 'chat', tab: m[1] || 'threads' };
  if(p === '/friends') return { page: 'chat', tab: 'friends' }; // стара адреса сторінки друзів
  const page = Object.keys(_PAGE_PATHS).find(k => _PAGE_PATHS[k] === p);
  return page ? { page } : { page: 'home', source: 'catalog' };
}
if('scrollRestoration' in history) history.scrollRestoration = 'manual';
// Сторінка, яку зараз відкриваємо З ІСТОРІЇ (назад/вперед/пряме посилання):
// для неї адресу не пушимо, а лише замінюємо. Не булевий прапорець, а назва
// сторінки — бо openPlaylist() тощо викликають showPage() асинхронно, після fetch.
let _routeRestoring = null;
let _routerReady = false;
function _routerOnShowPage(n){
  if(!_routerReady) return;
  const path = _pathForPage(n);
  if(_routeRestoring === n){
    _routeRestoring = null;
    history.replaceState({ page: n, scrollY: history.state?.scrollY || 0 }, '', path + location.search);
    _restoreScroll(history.state?.scrollY || 0);
    return;
  }
  if(path === location.pathname) return; // та сама сторінка (напр. повторний клік "Головна")
  // Запам'ятовуємо, де користувач був на попередній сторінці — "назад" поверне туди ж.
  history.replaceState({ ...(history.state || {}), scrollY: window.scrollY }, '');
  history.pushState({ page: n, scrollY: 0 }, '', path);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
// Вміст (таблиця, плейлист) може домальовуватись асинхронно — пробуємо кілька
// разів, поки сторінка не стане достатньо високою для збереженої позиції.
function _restoreScroll(y){
  if(!y){ window.scrollTo({ top: 0, behavior: 'instant' }); return; }
  let tries = 0;
  const attempt = () => {
    window.scrollTo({ top: y, behavior: 'instant' });
    if(Math.abs(window.scrollY - y) > 2 && ++tries < 12) setTimeout(attempt, 80);
  };
  requestAnimationFrame(attempt);
}
// Відкрити сторінку за адресою. authOnly-сторінки без входу → головна
// (а не confirm("Увійти?") при кожному "назад").
function _openRoute(r){
  const authed = !!currentUser?.authenticated;
  const needsAuth = ['profile', 'recommendations', 'request', 'user-profile', 'playlist'];
  if((needsAuth.includes(r.page) && !authed) || (r.page === 'admin-hub' && !currentUser?.isAdmin)){
    r = { page: 'home', source: 'catalog' };
    history.replaceState({ page: 'home', scrollY: 0 }, '', '/');
  }
  _routeRestoring = r.page;
  switch(r.page){
    case 'home': showHome(r.source); break;
    case 'artist': openArtistPage(r.id); break;
    case 'playlist': openPlaylist(r.id); break;
    case 'user-profile': openUserProfilePage(r.id); break;
    case 'chat': openChatPage(r.tab); break;
    default: showPage(r.page);
  }
}
window.addEventListener('popstate', () => {
  // Спершу закриваємо відкриті модальні вікна — "назад" не має лишати їх висіти над
  // іншою сторінкою. Їхніми ж функціями закриття: батл/граф зупиняють свої плеєри й таймери.
  const closers = {
    'battle-modal-overlay': closeBattle, 'battle-setup-modal-overlay': closeBattleSetup, 'graph-modal-overlay': closeGraph,
    'wheel-genres-modal-overlay': closeWheelGenrePicker, 'artist-edit-modal-overlay': closeArtistEditModal,
    'add-to-playlist-modal-overlay': closeAddToPlaylistModal, 'delete-modal-overlay': closeDeleteModal,
    'edit-request-modal-overlay': closeEditRequestModal, 'edit-song-modal-overlay': closeEditSongModal,
    'rating-modal-overlay': closeRatingModal, 'create-playlist-modal-overlay': closeCreatePlaylistModal,
  };
  document.querySelectorAll('.modal-overlay.open').forEach(o => {
    try { (closers[o.id] || (() => o.classList.remove('open')))(); } catch(e){ o.classList.remove('open'); }
  });
  _openRoute(_parsePath(location.pathname));
});
// Викликається з initApp(), коли вже відомо, хто залогінений.
function _initRouter(){
  _routerReady = true;
  const r = _parsePath(location.pathname);
  if(r.page === 'home' && r.source === 'catalog'){
    history.replaceState({ page: 'home', scrollY: 0 }, '', '/' + location.search);
    return;
  }
  _openRoute(r);
}
// Electron: бокові кнопки миші не прив'язані до історії автоматично (у браузерах —
// так, тому там не дублюємо, інакше один клік = два кроки назад).
if(localStorage.getItem('isDesktopApp') === '1'){
  window.addEventListener('mouseup', e => {
    if(e.button === 3){ e.preventDefault(); history.back(); }
    else if(e.button === 4){ e.preventDefault(); history.forward(); }
  });
}
