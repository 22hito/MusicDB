// "Схожий смак": люди з подібними улюбленими піснями й виконавцями + граф смаків.

// ================================================================
// СХОЖИЙ СМАК (GET /api/users/taste)
// Сервер рахує схожість з улюблених (♥) і прослуханих пісень: виконавці,
// жанри й спільні улюблені. Назовні — лише відсоток і кілька спільних
// виконавців, без повних списків чужих улюблених.
// ================================================================
let tasteData = null;

function loadTastePage(){
  const authed = !!currentUser?.authenticated;
  document.getElementById('taste-login-hint').style.display = authed ? 'none' : '';
  document.getElementById('taste-content').style.display = authed ? '' : 'none';
  if(!authed) return;
  const list = document.getElementById('taste-list');
  if(!tasteData) list.innerHTML = `<div class="hint">${esc(t('taste.loading'))}</div>`;
  fetch('/api/users/taste').then(r=>r.ok?r.json():null).then(d=>{
    if(!d) return;
    tasteData = d;
    _renderTastePage();
  }).catch(()=>{ list.innerHTML = `<div class="hint">${esc(t('msg.connectionError'))}</div>`; });
}

function _renderTastePage(){
  const d = tasteData;
  const noData = d.myItemCount === 0;
  document.getElementById('taste-no-data').style.display = noData ? '' : 'none';
  document.getElementById('taste-no-matches').style.display = !noData && !d.matches.length ? '' : 'none';
  const canGraph = d.nodes.length >= 2;
  document.querySelectorAll('.taste-graph-btn').forEach(b => { b.disabled = !canGraph; });
  document.getElementById('taste-list').innerHTML = d.matches.map(m => {
    const artists = m.sharedArtists.map(a => `<a href="/artist/${a.id}" onclick="event.preventDefault();event.stopPropagation();openArtistPage(${a.id})">${esc(a.name)}</a>`).join(', ');
    const parts = [];
    parts.push(artists ? `${esc(t('taste.sharedArtists'))} ${artists}` : esc(t('taste.similarGenres')));
    if(m.sharedFavorites > 0) parts.push(esc(t('taste.sharedFavorites').replace('{n}', m.sharedFavorites)));
    const friend = m.relationshipStatus === 'friends' ? `<span class="badge">${esc(t('taste.friendBadge'))}</span>` : '';
    return `
      <div class="taste-card" onclick="openUserProfilePage(${m.userId})">
        ${_friendAvatarHtml(m.avatarUrl)}
        <div class="taste-main">
          <div class="taste-name"><strong>${esc(m.displayName)}</strong>${friend}</div>
          <div class="taste-shared">${parts.join(' · ')}</div>
        </div>
        <div class="taste-score" style="--p:${m.score}" title="${esc(t('taste.scoreHint'))}"><span>${m.score}%</span></div>
      </div>`;
  }).join('');
}

// Два графи: 'people' — люди, ближче = схожіший смак; 'artists' — люди разом зі
// своїми улюбленими виконавцями (видно, хто кого слухає й де перетинаються).
const TASTE_ME_COLOR = '#c8a96e', TASTE_FRIEND_COLOR = '#4f8c6f', TASTE_ARTIST_COLOR = '#8a6fb0';
function openTasteGraph(mode){
  const d = tasteData;
  if(!d || d.nodes.length < 2) return;
  const people = d.nodes.map(n => ({ kind: 'user', ...n }));
  const idx = new Map(people.map((p,i) => [p.userId, i]));
  const peopleSim = new Map();
  for(const e of d.edges){ if(idx.has(e.a) && idx.has(e.b)) peopleSim.set(`${idx.get(e.a)}:${idx.get(e.b)}`, e.weight); }
  const pSim = (i,j) => peopleSim.get(i<j ? `${i}:${j}` : `${j}:${i}`) || 0;
  const personColor = (p,i) => p.isMe ? TASTE_ME_COLOR : p.relationshipStatus === 'friends' ? TASTE_FRIEND_COLOR : WHEEL_COLORS[(i % (WHEEL_COLORS.length-1)) + 1];
  const personLabel = p => `${p.displayName}${p.isMe ? ` (${t('taste.you')})` : ''}${p.topArtists.length ? ' — ' + p.topArtists.map(a=>a.name).join(', ') : ''}`;
  const openPerson = p => { closeGraph(); if(p.isMe) showPage('profile'); else openUserProfilePage(p.userId); };

  let items = people, simFn = pSim;
  if(mode === 'artists'){
    const artists = new Map();
    people.forEach(p => p.topArtists.forEach(a => { if(!artists.has(a.id)) artists.set(a.id, { kind: 'artist', id: a.id, name: a.name }); }));
    const artistItems = [...artists.values()];
    items = [...people, ...artistItems];
    const n = people.length;
    const artistIdx = new Map(artistItems.map((a,k) => [a.id, n + k]));
    // Людина — її топ-виконавці (перший важить найбільше); людина — людина слабше, щоб не заступали.
    const link = new Map();
    people.forEach((p,i) => p.topArtists.forEach((a,r) => link.set(`${i}:${artistIdx.get(a.id)}`, 1 - r*0.2)));
    simFn = (i,j) => {
      if(i < n && j < n) return pSim(i,j) * 0.6;
      if(i >= n && j >= n) return 0;
      return link.get(i < j ? `${i}:${j}` : `${j}:${i}`) || 0;
    };
  }
  const labelFn = it => it.kind === 'artist' ? it.name : personLabel(it);
  const colorFn = (it,i) => it.kind === 'artist' ? TASTE_ARTIST_COLOR : personColor(it, i);
  const onClickFn = it => { if(it.kind === 'artist'){ closeGraph(); openArtistPage(it.id); } else openPerson(it); };
  const shortLabel = it => it.kind === 'artist' ? it.name : (it.isMe ? t('taste.you') : it.displayName);
  const me = people.findIndex(p => p.isMe);
  _openGraphModal(t(mode === 'artists' ? 'taste.graphTitleArtists' : 'taste.graphTitlePeople'),
    items, simFn, labelFn, colorFn, onClickFn, { nodeLabels: shortLabel, ring: me >= 0 ? [me] : [] });
}
