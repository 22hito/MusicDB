// "Схожий смак": ваш смак, люди з подібними улюбленими піснями й виконавцями, карта смаку.

// ================================================================
// СХОЖИЙ СМАК (GET /api/users/taste)
// Сервер рахує схожість з улюблених (♥) і прослуханих пісень: виконавці,
// жанри й спільні улюблені. Назовні — лише відсоток і кілька спільних
// виконавців, без повних списків чужих улюблених.
// ================================================================
let tasteData = null;
let tasteFilter = 'all'; // 'all' | 'friends' | 'others'

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

function setTasteFilter(f){
  tasteFilter = f;
  _renderTasteList();
}

function _renderTastePage(){
  const d = tasteData;
  const noData = d.myItemCount === 0;
  document.getElementById('taste-no-data').style.display = noData ? '' : 'none';
  // "Ваш смак": мої виконавці (посилання), жанри, скільки пісень у смаку.
  const me = document.getElementById('taste-me');
  me.style.display = noData ? 'none' : '';
  if(!noData){
    const artists = (d.myTopArtists || []).map(a =>
      `<button type="button" class="taste-me-artist" onclick="openArtistPage(${a.id})">${_artistAvatarHtml(a.name, null, 'xs')}<span>${esc(a.name)}</span></button>`).join('');
    const genres = (d.myTopGenres || []).map(g => `<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
    document.getElementById('taste-me-artists').innerHTML = artists || `<span class="hint">—</span>`;
    document.getElementById('taste-me-genres').innerHTML = genres;
    document.getElementById('taste-me-stats').textContent =
      t('taste.meStats').replace('{fav}', d.myFavorites || 0).replace('{n}', d.myItemCount);
  }
  const canGraph = d.nodes.length >= 2;
  document.querySelectorAll('.taste-mode').forEach(b => { b.disabled = !canGraph; });
  _renderTasteList();
}

function _renderTasteList(){
  const d = tasteData;
  const matches = d.matches.filter(m => tasteFilter === 'all' || (tasteFilter === 'friends') === (m.relationshipStatus === 'friends'));
  document.querySelectorAll('#taste-filter button').forEach(b => b.classList.toggle('active', b.dataset.f === tasteFilter));
  document.getElementById('taste-filter').style.display = d.matches.length ? '' : 'none';
  const empty = document.getElementById('taste-no-matches');
  empty.style.display = d.myItemCount !== 0 && !matches.length ? '' : 'none';
  empty.querySelector('span').textContent = t(d.matches.length ? 'taste.filterEmpty' : 'taste.noMatches');
  document.getElementById('taste-list').innerHTML = matches.map(m => {
    const artists = m.sharedArtists.map(a => `<a href="/artist/${a.id}" onclick="event.preventDefault();event.stopPropagation();openArtistPage(${a.id})">${esc(a.name)}</a>`).join(', ');
    const parts = [artists ? `${esc(t('taste.sharedArtists'))} ${artists}` : esc(t('taste.similarGenres'))];
    if(m.sharedFavorites > 0) parts.push(esc(t('taste.sharedFavorites').replace('{n}', m.sharedFavorites)));
    const friend = m.relationshipStatus === 'friends' ? `<span class="badge">${esc(t('taste.friendBadge'))}</span>` : '';
    const actions = [
      m.sharedArtists.length ? `<button type="button" class="btn btn-outline taste-act" onclick="event.stopPropagation();playTasteShared(${m.userId}, this)"><svg class="icon icon-filled"><use href="#icon-play"/></svg> ${esc(t('taste.playShared'))}</button>` : '',
      m.relationshipStatus === 'none' ? `<button type="button" class="btn btn-outline taste-act" onclick="event.stopPropagation();tasteAddFriend(${m.userId}, this)">${esc(t('friends.addBtn'))}</button>` : '',
      m.relationshipStatus === 'pending_outgoing' ? `<span class="taste-act-note">${esc(t('taste.requestSent'))}</span>` : '',
    ].join('');
    return `
      <div class="taste-card" onclick="openUserProfilePage(${m.userId})">
        <div class="taste-card-top">
          ${_friendAvatarHtml(m.avatarUrl, m.displayName)}
          <div class="taste-main">
            <div class="taste-name"><strong>${esc(m.displayName)}</strong>${friend}</div>
            <div class="taste-shared">${parts.join(' · ')}</div>
          </div>
          <div class="taste-score" style="--p:${m.score}" title="${esc(t('taste.scoreHint'))}"><span>${m.score}%</span></div>
        </div>
        ${actions ? `<div class="taste-actions-row">${actions}</div>` : ''}
      </div>`;
  }).join('');
}

// "Слухати спільне": пісні виконавців, яких любите обоє, — перемішаним списком.
async function playTasteShared(userId, btn){
  const m = tasteData?.matches.find(x => x.userId === userId);
  if(!m || !m.sharedArtists.length) return;
  btn.disabled = true;
  try {
    const lists = await Promise.all(m.sharedArtists.map(a => fetch(`/api/artists/${a.id}/songs`).then(r=>r.ok?r.json():[]).catch(()=>[])));
    const seen = new Set();
    const queue = _shuffledCopy(lists.flat().filter(s => !seen.has(s.id) && seen.add(s.id)));
    if(!queue.length) return;
    playerQueue = queue;
    playerIndex = 0;
    _loadCurrent();
  } finally {
    btn.disabled = false;
  }
}
function tasteAddFriend(userId, btn){
  btn.disabled = true;
  fetch('/api/friends/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ targetUserId: userId }) })
    .then(r => {
      if(!r.ok){ btn.disabled = false; return; }
      const m = tasteData.matches.find(x => x.userId === userId);
      if(m) m.relationshipStatus = 'pending_outgoing';
      _renderTasteList();
    })
    .catch(() => { btn.disabled = false; });
}

// ─── Графи ───────────────────────────────────────────────────────────────
// 'people' — карта смаку: ви в центрі, люди на відстані за збігом (кола 75/50/25%),
// поруч — ті, хто любить того самого виконавця; розмір — активність.
// 'artists' — люди разом зі своїми топ-виконавцями; ви закріплені в центрі,
// розмір виконавця — скільки людей його люблять, спільні з вами — золотий обідок.
const TASTE_FRIEND_COLOR = '#4f8c6f', TASTE_ARTIST_COLOR = '#8a6fb0';
const TASTE_R_MIN = 70, TASTE_R_MAX = 270;

function _tasteRadius(score){ return TASTE_R_MIN + (1 - Math.max(0, Math.min(100, score)) / 100) * (TASTE_R_MAX - TASTE_R_MIN); }

function openTasteGraph(mode){
  const d = tasteData;
  if(!d || d.nodes.length < 2) return;
  const people = d.nodes.map(n => ({ kind: 'user', ...n }));
  const meIdx = people.findIndex(p => p.isMe);
  const idx = new Map(people.map((p,i) => [p.userId, i]));
  const peopleSim = new Map();
  for(const e of d.edges){ if(idx.has(e.a) && idx.has(e.b)) peopleSim.set(`${idx.get(e.a)}:${idx.get(e.b)}`, e.weight); }
  const pSim = (i,j) => peopleSim.get(i<j ? `${i}:${j}` : `${j}:${i}`) || 0;
  const personSize = p => p.isMe ? 1.7 : 0.9 + Math.min(0.9, Math.sqrt(p.itemCount || 0) / 6);
  const personLabel = p => p.isMe
    ? `${p.displayName} (${t('taste.you')})`
    : `${p.displayName} — ${p.score}%${p.topArtists.length ? ' · ' + p.topArtists.map(a=>a.name).join(', ') : ''}`;
  const openPerson = p => { closeGraph(); if(p.isMe) showPage('profile'); else openUserProfilePage(p.userId); };
  const marks = new Map();
  people.forEach((p,i) => { if(p.relationshipStatus === 'friends') marks.set(i, TASTE_FRIEND_COLOR); });

  if(mode !== 'artists'){
    // Радіальна розкладка: кут — групами за першим улюбленим виконавцем, радіус — за збігом.
    const others = people.map((p,i) => i).filter(i => i !== meIdx)
      .sort((a,b) => (people[a].topArtists[0]?.name || '~').localeCompare(people[b].topArtists[0]?.name || '~') || people[b].score - people[a].score);
    const positions = people.map(() => [400, 300]);
    others.forEach((i, k) => {
      // Зсув на пів кроку — верх (де підписи кіл 75/50/25%) лишається вільним.
      const ang = -Math.PI/2 + ((k + 0.5) / others.length) * Math.PI * 2;
      const r = _tasteRadius(people[i].score);
      positions[i] = [400 + Math.cos(ang) * r, 300 + Math.sin(ang) * r];
    });
    _openGraphModal(t('taste.graphTitlePeople'), people, pSim, personLabel,
      p => p.isMe ? '#c8a96e' : avatarColor(p.displayName), openPerson, {
        positions, radius: 11, sizes: people.map(personSize), ring: meIdx >= 0 ? [meIdx] : [], marks,
        images: people.map(p => p.avatarUrl), initials: people.map(p => avatarInitials(p.displayName)),
        avatarColors: people.map(p => avatarColor(p.displayName)),
        nodeLabels: p => p.isMe ? t('taste.you') : p.displayName,
        rings: [75, 50, 25].map(s => ({ r: _tasteRadius(s), label: `${s}%` })), radialLabels: true,
        hint: t('taste.mapHint'),
      });
    return;
  }

  const artists = new Map();
  people.forEach(p => p.topArtists.forEach(a => {
    if(!artists.has(a.id)) artists.set(a.id, { kind: 'artist', id: a.id, name: a.name, fans: 0 });
    artists.get(a.id).fans++;
  }));
  const artistItems = [...artists.values()];
  const items = [...people, ...artistItems];
  const n = people.length;
  const artistIdx = new Map(artistItems.map((a,k) => [a.id, n + k]));
  const link = new Map();
  people.forEach((p,i) => p.topArtists.forEach((a,r) => link.set(`${i}:${artistIdx.get(a.id)}`, 1 - r*0.2)));
  const simFn = (i,j) => {
    if(i < n && j < n) return pSim(i,j) * 0.6;
    if(i >= n && j >= n) return 0;
    return link.get(i < j ? `${i}:${j}` : `${j}:${i}`) || 0;
  };
  const mine = new Set((d.myTopArtists || []).map(a => a.id));
  artistItems.forEach((a,k) => { if(mine.has(a.id)) marks.set(n + k, '#c8a96e'); });
  _openGraphModal(t('taste.graphTitleArtists'), items, simFn,
    it => it.kind === 'artist' ? `${it.name} — ${t('taste.fans').replace('{n}', it.fans)}` : personLabel(it),
    it => it.kind === 'artist' ? TASTE_ARTIST_COLOR : it.isMe ? '#c8a96e' : avatarColor(it.displayName),
    it => { if(it.kind === 'artist'){ closeGraph(); openArtistPage(it.id); } else openPerson(it); }, {
      pin: meIdx >= 0 ? meIdx : null, radius: 10, ring: meIdx >= 0 ? [meIdx] : [], marks,
      sizes: items.map(it => it.kind === 'artist' ? 0.7 + Math.min(0.9, (it.fans - 1) * 0.3) : personSize(it)),
      images: items.map(it => it.kind === 'artist' ? null : it.avatarUrl),
      initials: items.map(it => it.kind === 'artist' ? avatarInitials(it.name) : avatarInitials(it.displayName)),
      avatarColors: items.map(it => it.kind === 'artist' ? TASTE_ARTIST_COLOR : avatarColor(it.displayName)),
      nodeLabels: it => it.kind === 'artist' ? it.name : (it.isMe ? t('taste.you') : it.displayName),
      hint: t('taste.artistsHint'),
    });
}
