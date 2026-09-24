// Головна: таблиці пісень (каталог і ком'юніті), фільтри/сортування, улюблені,
// адмінське об'єднання дублікатів жанрів.

// ================================================================
// RENDER SONGS
// ================================================================
let shuffleActive = false;
let shuffleOrderMap = new Map();
let sortKey = null;
let sortDir = 1;
let displayedSongs = [];

function sortSongs(key){
  if(sortKey===key){ sortDir=-sortDir; }
  else { sortKey=key; sortDir=1; }
  if(shuffleActive){
    shuffleActive=false;
    shuffleOrderMap=new Map();
    document.getElementById('shuffle-table-btn').classList.remove('active');
  }
  document.querySelectorAll('th.sortable').forEach(th=>{
    th.classList.remove('sort-asc','sort-desc');
    if(th.getAttribute('data-sort-key')===sortKey) th.classList.add(sortDir>0?'sort-asc':'sort-desc');
  });
  renderSongs();
}

function _sortVal(s, key){
  switch(key){
    case 'genres': return s.genres.length?s.genres[0].toLowerCase():'';
    case 'album': return (s.album||'').toLowerCase();
    case 'plays': return s.playCount ?? 0;
    case 'rating': return s.avgRating ?? -1;
    case 'submitter': return (s.submittedBy?.displayName || '').toLowerCase();
    case 'artist': case 'title': return s[key].toLowerCase();
    default: return s[key];
  }
}
// Порівняння текстів для сортування — приводить до нижнього регістру, інакше
// великі й малі літери сортуються окремими блоками замість "Aa, Бб...".
function _textSortCmp(a, b){
  const la = String(a).toLowerCase(), lb = String(b).toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : 0;
}

// ================================================================
// АДМІН: ШІ-об'єднання дублікатів жанрів (POST /api/genres/normalize)
// ================================================================
function normalizeGenres(){
  const btn = document.getElementById('normalize-genres-btn');
  const originalHtml = btn.innerHTML; // innerHTML, не textContent — кнопка тепер містить ще й <svg class="icon">
  btn.disabled = true;
  btn.textContent = t('admin.normalizeGenresRunning');

  fetch('/api/genres/normalize', { method: 'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.errorNormalizeGenres')); return null; }
      return r.json();
    })
    .then(data=>{
      if(!data) return;
      if(data.error){
        alert(t('admin.normalizeGenresError') + '\n\n' + data.error);
      } else if(data.mergedCount === 0){
        alert(t('admin.normalizeGenresNone'));
      } else {
        alert(t('admin.normalizeGenresDone').replace('{count}', data.mergedCount) + '\n\n' + data.mergedPairs.join('\n'));
      }
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>{ btn.disabled = false; btn.innerHTML = originalHtml; });
}

// ================================================================
// FAVORITES (улюблені пісні) — доступно будь-якому авторизованому
// ================================================================
let favoriteIds = new Set();
function loadFavoriteIds(){
  fetch('/api/favorites').then(r=>r.ok?r.json():[]).then(list=>{
    favoriteIds = new Set(list.map(s=>s.id));
    renderSongs();
  }).catch(()=>{});
}
function toggleFavorite(musicId, btn){
  const isFav = favoriteIds.has(musicId);
  const method = isFav ? 'DELETE' : 'POST';
  fetch(`/api/favorites/${musicId}`, { method })
    .then(r=>{
      if(!r.ok) return;
      if(isFav) favoriteIds.delete(musicId); else favoriteIds.add(musicId);
      if(btn){
        btn.classList.toggle('active', !isFav);
        const svg = btn.querySelector('svg');
        if(svg) svg.setAttribute('fill', !isFav ? 'currentColor' : 'none');
      }
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ГОЛОВНА ТАБЛИЦЯ_2 (пісні від ком'юніті) — та сама сторінка "Головна",
// перемикач лише змінює, яку з двох таблиць показувати.
// ================================================================
function showHome(source){
  source = source === 'community' ? 'community' : 'catalog';
  if(source !== homeSource){
    homeSource = source;
    // Перемішування — порядок конкретної таблиці, в іншій воно не має сенсу.
    if(shuffleActive) toggleShuffleTable();
    document.getElementById('filter-genre').value = '';
    albumFilter = '';
  }
  _applyHomeSourceUi();
  showPage('home');
}
function _applyHomeSourceUi(){
  const isCommunity = homeSource === 'community';
  document.getElementById('home-source-catalog').classList.toggle('active', !isCommunity);
  document.getElementById('home-source-community').classList.toggle('active', isCommunity);
  document.getElementById('th-submitter').style.display = isCommunity ? '' : 'none';
  document.getElementById('home-community-hint').style.display = isCommunity ? '' : 'none';
  const pre = document.getElementById('home-heading-pre');
  const accent = document.getElementById('home-heading-accent');
  const addBtn = document.getElementById('home-add-btn');
  pre.setAttribute('data-i18n', isCommunity ? 'home.heading.communityPre' : 'home.heading.pre');
  accent.setAttribute('data-i18n', isCommunity ? 'home.heading.communityAccent' : 'home.heading.accent');
  addBtn.setAttribute('data-i18n', isCommunity ? 'home.addOwnSongBtn' : 'home.addRequestBtn');
  pre.textContent = t(pre.getAttribute('data-i18n'));
  accent.textContent = t(accent.getAttribute('data-i18n'));
  addBtn.textContent = t(addBtn.getAttribute('data-i18n'));
}

// Публічні профілі — лише для залогінених (UsersController [Authorize]).
function openUserProfileOrLogin(userId){
  if(!currentUser?.authenticated){
    confirmLogin();
    return;
  }
  openUserProfilePage(userId);
}
