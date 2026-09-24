// Виконавці: каталог, пошук, сторінка виконавця з дискографією й підпискою.

// ================================================================
// ВИКОНАВЦІ: каталог, пошук, сторінка виконавця з дискографією й підпискою
// ================================================================
let artistsSearchTimer = null;
function onArtistsSearchInput(){
  clearTimeout(artistsSearchTimer);
  artistsSearchTimer = setTimeout(loadArtistsPage, 350);
}
function loadArtistsPage(){
  const q = document.getElementById('artists-search').value.trim();
  fetch(`/api/artists${q ? '?q=' + encodeURIComponent(q) : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('artists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('artists-list').innerHTML = list.map(a=>`
      <div class="ext-search-item" onclick="openArtistPage(${a.id})">
        <div class="es-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('artists.songsWord')}</span></div>
      </div>`).join('');
  }).catch(()=>{});
}
let currentArtistId = null;
let currentArtistSongs = [];
function openArtistPage(id){
  currentArtistId = id;
  showPage('artist');
}
function loadArtistPage(){
  const id = currentArtistId;
  if(id == null) return;
  document.getElementById('artist-content').style.display = 'none';
  document.getElementById('artist-not-found').style.display = 'none';
  fetch(`/api/artists/${id}`).then(r=>r.ok?r.json():null).then(a=>{
    if(!a){ document.getElementById('artist-not-found').style.display = ''; return; }
    document.getElementById('artist-content').style.display = '';
    document.getElementById('artist-name').textContent = a.name;
    document.getElementById('artist-follower-count').textContent = `${a.followerCount} ${t('artist.followers')}`;
    const btn = document.getElementById('artist-follow-btn');
    btn.innerHTML = a.isFollowing ? `<svg class="icon"><use href="#icon-check"/></svg> ${esc(t('artist.unfollowBtn'))}` : esc(t('artist.followBtn'));
    btn.classList.toggle('active', !!a.isFollowing);
    btn.style.display = currentUser?.authenticated ? '' : 'none';

    fetch(`/api/artists/${id}/songs`).then(r=>r.ok?r.json():[]).then(songs=>{
      currentArtistSongs = songs;
      document.getElementById('artist-songs-body').innerHTML = songs.map(s=>`
        <tr>
          <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromArtist)" title="${t('profile.playBtn')}">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          </button></td>
          <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
          <td data-label="${t('table.title')}">${esc(s.title)}</td>
          <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        </tr>`).join('');
    }).catch(()=>{});
  }).catch(()=>{ document.getElementById('artist-not-found').style.display = ''; });
}
function playFromArtist(id){
  if(!currentArtistSongs.length) return;
  playerQueue = currentArtistSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function toggleArtistFollow(){
  if(!currentUser?.authenticated){ login(); return; }
  const id = currentArtistId;
  if(id == null) return;
  const btn = document.getElementById('artist-follow-btn');
  const wasFollowing = btn.classList.contains('active');
  const method = wasFollowing ? 'DELETE' : 'POST';
  fetch(`/api/artists/${id}/follow`, { method })
    .then(r=>{ if(r.ok) loadArtistPage(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
