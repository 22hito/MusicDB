// Топ 100 найпрослуханіших пісень.

// ================================================================
// TOP 100 (найпрослуханіші — GET /api/stats/top-songs)
// ================================================================
let currentTopSongs = [];
function playFromTop(id){
  if(!currentTopSongs.length) return;
  playerQueue=currentTopSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
// Топ 100: подіум (1–3) і список. Уся картка вмикає пісню (посилання й кнопки — окремо).
function _topFavHtml(s){
  if(!currentUser?.authenticated) return '';
  const fav = favoriteIds.has(s.id);
  return `<button class="btn-icon-fav top-fav${fav?' active':''}" aria-label="${t('profile.favToggle')}" title="${t('profile.favToggle')}" onclick="toggleFavorite(${s.id}, this)"><svg viewBox="0 0 24 24" fill="${fav?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button>`;
}
function _topCoverHtml(s, cls){
  const thumb = _songThumb(s);
  return `<span class="${cls}${thumb ? '' : ' no-thumb'}"${thumb ? '' : ` style="--av:${avatarColor(s.artist)}"`}>${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : '<svg class="icon"><use href="#icon-music"/></svg>'}<span class="top-play" data-icon="play">${ROW_PLAY_ICON}</span></span>`;
}
function _topClick(e, id){
  if(e.target.closest('a, button')) return;
  toggleOrPlay(id, playFromTop);
}
function _topPodiumHtml(s, i){
  return `<div class="top-item top-podium-card rank-${i+1}" data-id="${s.id}" onclick="_topClick(event, ${s.id})">
    ${_topCoverHtml(s, 'top-podium-cover')}
    <span class="top-medal">${i+1}</span>
    <span class="top-podium-info"><strong title="${esc(s.title)}">${esc(s.title)}</strong><span>${artistLinksHtml(s)}</span></span>
    <span class="top-podium-foot"><span class="top-plays"><svg class="icon"><use href="#icon-headphones"/></svg> <b>${s.playCount ?? 0}</b> ${esc(t('top.listeners'))}</span>${_topFavHtml(s)}</span>
  </div>`;
}
function _topRowHtml(s, i, max){
  const pct = Math.max(4, Math.round(((s.playCount || 0) / max) * 100));
  return `<div class="top-item top-row" data-id="${s.id}" onclick="_topClick(event, ${s.id})">
    <span class="top-rank">${i+1}</span>
    ${_topCoverHtml(s, 'top-cover')}
    <span class="top-main"><strong>${esc(s.title)}</strong><span>${artistLinksHtml(s)}</span></span>
    <span class="top-album">${s.album ? `<span class="badge album">${esc(s.album)}</span>` : `<span class="top-single">${t('table.single')}</span>`}</span>
    <span class="top-score"><span class="top-bar"><span style="width:${pct}%"></span></span><span class="top-plays"><svg class="icon"><use href="#icon-headphones"/></svg> ${s.playCount ?? 0}</span></span>
    ${_topFavHtml(s)}
  </div>`;
}
async function loadTopSongsPage(){
  const podium = document.getElementById('top-podium'), list = document.getElementById('top-list');
  const empty = `<div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div>`;
  try{
    const data = await fetch('/api/stats/top-songs?limit=100').then(r=>r.json());
    currentTopSongs = data;
    if(!data.length){ podium.innerHTML = ''; list.innerHTML = empty; return; }
    const max = data[0].playCount || 1;
    podium.innerHTML = data.slice(0, 3).map(_topPodiumHtml).join('');
    list.innerHTML = data.slice(3).map((s, i) => _topRowHtml(s, i + 3, max)).join('');
    refreshPlayingState();
  }catch(e){
    podium.innerHTML = '';
    list.innerHTML = empty;
  }
}
