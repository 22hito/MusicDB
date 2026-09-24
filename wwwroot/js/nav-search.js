// Глобальний пошук у шапці: пісні (обидві таблиці), виконавці, люди.

// ================================================================
// ГЛОБАЛЬНИЙ ПОШУК У НАВБАРІ: пісні (обидві таблиці), виконавці, люди
// ================================================================
let navSearchTimer = null;
let navSearchSeq = 0;
let navSearchSongs = [];
function _hideNavSearch(){
  document.getElementById('nav-search-results')?.classList.remove('open');
}
function onNavSearchInput(){
  clearTimeout(navSearchTimer);
  const q = document.getElementById('nav-search-input').value.trim();
  if(q.length < 2){ navSearchSeq++; _hideNavSearch(); return; }
  navSearchTimer = setTimeout(()=>runNavSearch(q), 220);
}
function onNavSearchKeydown(e){
  if(e.key === 'Escape'){ _hideNavSearch(); e.target.blur(); }
  if(e.key === 'Enter'){ document.querySelector('#nav-search-results .nav-search-item')?.click(); }
}
async function runNavSearch(q){
  const seq = ++navSearchSeq;
  const ql = q.toLowerCase();
  navSearchSongs = [...songs, ...communitySongs].filter(s=>
    s.title.toLowerCase().includes(ql) || s.artist.toLowerCase().includes(ql) || (s.album||'').toLowerCase().includes(ql)
  ).slice(0, 6);
  const [artists, users] = await Promise.all([
    fetch(`/api/artists?q=${encodeURIComponent(q)}`).then(r=>r.ok?r.json():[]).catch(()=>[]),
    currentUser?.authenticated ? fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>r.ok?r.json():[]).catch(()=>[]) : Promise.resolve([])
  ]);
  if(seq !== navSearchSeq) return; // встигли надрукувати далі — ці результати застарілі
  const section = (title, html) => html ? `<div class="nav-search-section">${title}</div>${html}` : '';
  const songsHtml = navSearchSongs.map(s=>`
    <button type="button" class="nav-search-item" onclick="navSearchPlay(${s.id})">
      <svg class="icon icon-filled"><use href="#icon-play"/></svg>
      <span class="nsi-main"><strong>${esc(s.title)}</strong><span>${esc(s.artist)}</span></span>
      ${s.source==='community'?`<span class="badge source-community">${t('home.source.community')}</span>`:''}
    </button>`).join('');
  const artistsHtml = artists.slice(0, 5).map(a=>`
    <button type="button" class="nav-search-item" onclick="_hideNavSearch();openArtistPage(${a.id})">
      <svg class="icon"><use href="#icon-mic"/></svg>
      <span class="nsi-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('profile.songsWord')}</span></span>
    </button>`).join('');
  const usersHtml = users.map(u=>`
    <button type="button" class="nav-search-item" onclick="_hideNavSearch();openUserProfilePage(${u.userId})">
      ${u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" alt="">` : `<svg class="icon"><use href="#icon-user"/></svg>`}
      <span class="nsi-main"><strong>${esc(u.displayName)}</strong></span>
    </button>`).join('');
  const html = section(t('navSearch.songs'), songsHtml) + section(t('navSearch.artists'), artistsHtml) + section(t('navSearch.users'), usersHtml);
  const box = document.getElementById('nav-search-results');
  box.innerHTML = html || `<div class="nav-search-empty">${t('navSearch.empty')}${currentUser?.authenticated ? '' : `<div class="hint">${t('navSearch.loginForUsers')}</div>`}</div>`;
  box.classList.add('open');
}
function navSearchPlay(id){
  _hideNavSearch();
  playerQueue = navSearchSongs.slice();
  playerIndex = Math.max(0, playerQueue.findIndex(s=>s.id===id));
  _loadCurrent();
}
