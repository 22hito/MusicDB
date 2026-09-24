// Батл рояль: турнір на вибування з плейлиста (16/32/64), крок назад, чемпіон.

// ================================================================
// БАТЛ РОЯЛЬ: одиночне вибування з плейлиста (16/32/64 учасників)
// ================================================================
const BATTLE_SIZES = [16, 32, 64];
let battleRound = [];    // пісні поточного раунду (парна кількість, i та i+1 — пара)
let battleWinners = [];  // переможці поточного раунду, стають battleRound наступного
let battleMatchIndex = 0;
let battleLeftPlayer = null, battleRightPlayer = null;
let battlePlayersReady = false;
let battleHoverModeActive = false;
let battleInitialSize = 0;   // розмір турніру на старті — для стрічки прогресу
let battleTransitioning = false; // йде анімація вибору — ігноруємо повторні кліки/клавіші
let battleChampionSong = null;
// Знімки стану перед кожним вибором — для "Крок назад" (обрав не ту пісню).
let battleHistory = [];
function _syncBattleUndo(){
  ['battle-undo-btn', 'battle-undo-btn-m'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn) btn.disabled = !battleHistory.length;
  });
}

// ─── Телефон (≤768px): вигляд як у мобільному застосунку ───────────────────
// Одна рамка з відео тієї пісні, яку слухають (кнопка "Послухати" на картці),
// картки поруч, "Крок назад"/"Вийти" внизу. Плеєри й логіка — ті самі, що на ПК;
// на ПК ці елементи приховані CSS-ом, тож там усе як було.
let battleActiveSide = null; // 'a' | 'b' — чиє відео в рамці; null — підказка
function _battleSidePlaying(side){
  if(_isBattleAudioSide(side)) return !_battleAudio(side).paused;
  const p = side === 'a' ? battleLeftPlayer : battleRightPlayer;
  try{ return p?.getPlayerState?.() === YT.PlayerState.PLAYING; }catch(e){ return false; }
}
function _renderBattleListen(){
  const row = document.querySelector('#battle-split .battle-media-row');
  row?.classList.toggle('m-idle', !battleActiveSide);
  document.querySelectorAll('#battle-split .battle-video-wrap').forEach((w, i) =>
    w.classList.toggle('m-active', battleActiveSide === (i ? 'b' : 'a')));
  document.querySelectorAll('#battle-split .battle-side').forEach((el, i) => {
    const side = i ? 'b' : 'a';
    el.classList.toggle('m-current', battleActiveSide === side);
    const use = el.querySelector('.battle-listen-btn use');
    if(use) use.setAttribute('href', _battleSidePlaying(side) ? '#icon-pause' : '#icon-play');
  });
}
function listenBattleSide(i){
  const side = i ? 'b' : 'a';
  const playing = _battleSidePlaying(side);
  battleActiveSide = side;
  _renderBattleListen();
  if(_isBattleAudioSide(side)){ toggleBattleMini(side); return; }
  const p = side === 'a' ? battleLeftPlayer : battleRightPlayer;
  try{ playing ? p.pauseVideo() : p.playVideo(); }catch(e){}
}
async function exitBattle(){
  if(document.getElementById('battle-champion').style.display === 'none'){
    const ok = await confirmModal({ title: t('battle.exit'), text: t('battle.exitConfirm'), confirmLabel: t('battle.exit') });
    if(!ok) return;
  }
  closeBattle();
}
function undoBattle(){
  if(battleTransitioning || !battleHistory.length) return;
  const prev = battleHistory.pop();
  battleRound = prev.round;
  battleWinners = prev.winners;
  battleMatchIndex = prev.matchIndex;
  battleChampionSong = null;
  document.getElementById('battle-champion').style.display = 'none';
  document.getElementById('battle-split').style.display = 'flex';
  _syncBattleUndo();
  loadBattleMatch();
}

// Сторінка "Батл рояль" у навбарі: власні плейлисти (якщо залогінені) + публічні чужі.
function openBattlePage(){
  const ownSection = document.getElementById('battle-page-own-login-hint');
  const ownEmpty = document.getElementById('battle-page-own-empty');
  const ownList = document.getElementById('battle-page-own-list');
  if(currentUser?.authenticated){
    ownSection.style.display = 'none';
    fetch('/api/playlists').then(r=>r.ok?r.json():[]).then(list=>{
      ownEmpty.style.display = list.length ? 'none' : '';
      ownList.innerHTML = list.map(p=>`
        <div class="battle-pl-card" onclick="startBattleFromPlaylist(${p.id})">
          <div class="battle-pl-icon"><svg class="icon"><use href="#icon-headphones"/></svg></div>
          <div class="battle-pl-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
          ${p.isPublic?`<span class="badge">${t('battle.publicBadge')}</span>`:''}
          <svg class="icon battle-pl-arrow"><use href="#icon-arrow-right"/></svg>
        </div>`).join('');
    }).catch(()=>{});
  } else {
    ownSection.style.display = '';
    ownEmpty.style.display = 'none';
    ownList.innerHTML = '';
  }
  fetch('/api/playlists/public').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('battle-page-public-empty').style.display = list.length ? 'none' : '';
    document.getElementById('battle-page-public-list').innerHTML = list.map(p=>`
      <div class="battle-pl-card battle-pl-card-community" onclick="startBattleFromPlaylist(${p.id})">
        <div class="battle-pl-icon"><svg class="icon"><use href="#icon-globe"/></svg></div>
        <div class="battle-pl-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')} — ${esc(p.ownerLabel)}</span></div>
        <svg class="icon battle-pl-arrow"><use href="#icon-arrow-right"/></svg>
      </div>`).join('');
  }).catch(()=>{});
}
// currentPlaylistSongs — той самий "поточний плейлист", яким користується і сторінка плейлиста.
function startBattleFromPlaylist(id){
  fetch(`/api/playlists/${id}`).then(r=>r.ok?r.json():null).then(p=>{
    if(!p) return;
    currentPlaylistId = id;
    currentPlaylistSongs = p.songs;
    openBattleSetup();
  }).catch(()=>{ alert(t('msg.connectionError')); });
}

function openBattleSetup(){
  const count = currentPlaylistSongs.length;
  const sizes = BATTLE_SIZES.filter(sz => count >= sz);
  const body = document.getElementById('battle-setup-body');
  if(!sizes.length){
    body.innerHTML = `<div class="modal-body-text">${t('battle.notEnough')}</div>`;
  } else {
    body.innerHTML = `<div class="modal-body-text">${t('battle.chooseSize')}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:6px;flex-wrap:wrap;">
        ${sizes.map(sz=>`<button type="button" class="btn btn-outline" onclick="startBattleRoyale(${sz})">${sz}</button>`).join('')}
      </div>`;
  }
  document.getElementById('battle-setup-modal-overlay').classList.add('open');
}
function closeBattleSetup(){
  _closeModalAnimated('battle-setup-modal-overlay');
}

function startBattleRoyale(size){
  if(typeof YT === 'undefined' || !YT.Player){
    // YouTube IFrame API міг ще не підвантажитись — пробуємо ще раз за секунду.
    setTimeout(()=>startBattleRoyale(size), 1000);
    return;
  }
  closeBattleSetup();
  battleRound = _shuffledCopy(currentPlaylistSongs).slice(0, size);
  battleWinners = [];
  battleMatchIndex = 0;
  battleInitialSize = size;
  battleTransitioning = false;
  battleHistory = [];
  _syncBattleUndo();
  // Ставимо головний плеєр на паузу на час турніру — щоб не було потрійного звуку.
  if(ytPlayer && ytReady){ try{ ytPlayer.pauseVideo(); }catch(e){} }
  if(playerMode === 'file') _pPause();
  document.getElementById('battle-champion').style.display = 'none';
  document.getElementById('battle-split').style.display = 'flex';
  document.getElementById('battle-modal-overlay').classList.add('open');
  _ensureBattlePlayers(()=>{ loadBattleMatch(); });
}

// YT.Player створюємо один раз і перевикористовуємо між матчами — перестворення
// iframe на кожен матч повільніше й дає спалахи "чорного екрана".
function _ensureBattlePlayers(cb){
  if(battlePlayersReady){
    // Слухачі наведення теж вішаємо лише один раз тут, інакше накопичувались би з кожним матчем.
    cb();
    return;
  }
  let readyCount = 0;
  function onEither(){ readyCount++; if(readyCount===2){ battlePlayersReady=true; _wireBattleHoverListeners(); cb(); } }
  // autoplay:0 + cueVideoById нижче — обидва відео лежать на паузі на початку раунду.
  // mute:0 — звук керується тим самим повзунком гучності, що й в основному плеєрі.
  // controls:1 — рідні контроли YouTube (плеєр лишається "чужим", свій
  // play/pause-оверлей і прогрес-бар прибрані на прохання користувача).
  battleLeftPlayer = new YT.Player('battle-yt-a', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('a', e) }
  });
  battleRightPlayer = new YT.Player('battle-yt-b', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('b', e) }
  });
}

function _onBattleStateChange(side, e){
  // cueVideoById скидає гучність/mute асинхронно ПІСЛЯ повернення виклику — тому
  // застосовуємо unMute/setVolume тут, коли CUED справді настав, а не одразу за cueVideoById.
  if(e.data === YT.PlayerState.CUED){
    try{ e.target.unMute(); e.target.setVolume(vol); }catch(err){}
  }
  _renderBattleListen();
  // Двоє одночасно не мають грати: щойно один переходить у PLAYING — ставимо другий на паузу.
  if(e.data !== YT.PlayerState.PLAYING) return;
  const other = side === 'a' ? battleRightPlayer : battleLeftPlayer;
  try{ other && other.pauseVideo(); }catch(err){}
  _stopBattleMinis();
}

// "Режим наведення": навів курсор на відео — грає, вивів — пауза.
function toggleBattleHoverMode(){
  battleHoverModeActive = !battleHoverModeActive;
  document.getElementById('battle-hover-toggle-btn').classList.toggle('active', battleHoverModeActive);
}
function _wireBattleHoverListeners(){
  const wrapA = document.querySelector('#battle-yt-a').closest('.battle-video-wrap');
  const wrapB = document.querySelector('#battle-yt-b').closest('.battle-video-wrap');
  const wire = (wrap, getPlayer, side) => {
    wrap.addEventListener('mouseenter', () => {
      if(!battleHoverModeActive) return;
      if(_isBattleAudioSide(side)){ _battleAudio(side).play().catch(()=>{}); return; }
      try{ getPlayer().playVideo(); }catch(e){}
    });
    wrap.addEventListener('mouseleave', () => {
      if(!battleHoverModeActive) return;
      if(_isBattleAudioSide(side)){ _battleAudio(side).pause(); return; }
      try{ getPlayer().pauseVideo(); }catch(e){}
    });
  };
  wire(wrapA, () => battleLeftPlayer, 'a');
  wire(wrapB, () => battleRightPlayer, 'b');
}

// Стрічка прогресу: сегмент на кожен розмір раунду від старту до фіналу
// (16→8→4→2→1), поточний підсвічений, пройдені — позначені як завершені.
function _renderBattleProgress(){
  const el = document.getElementById('battle-progress-ribbon');
  if(!el || !battleInitialSize) return;
  const sizes = [];
  for(let s = battleInitialSize; s >= 1; s = s/2) sizes.push(s);
  el.innerHTML = sizes.map(s => {
    const cls = s === battleRound.length ? 'current' : (s > battleRound.length ? 'done' : '');
    return `<span class="battle-progress-seg ${cls}">${s}</span>`;
  }).join('<span class="battle-progress-sep"></span>');
}

async function loadBattleMatch(){
  _renderBattleProgress();
  const a = battleRound[battleMatchIndex*2];
  const b = battleRound[battleMatchIndex*2+1];
  document.getElementById('battle-round-label').textContent =
    `${t('battle.roundLabel')}${battleRound.length} → ${battleRound.length/2}`;
  document.getElementById('battle-match-label').textContent = `· ${battleMatchIndex + 1}/${battleRound.length/2}`;
  battleActiveSide = null;
  _renderBattleListen();
  _setMarqueeText(document.getElementById('battle-a-artist'), a.artist);
  _setMarqueeText(document.getElementById('battle-a-title'), a.title);
  _setMarqueeText(document.getElementById('battle-b-artist'), b.artist);
  _setMarqueeText(document.getElementById('battle-b-title'), b.title);
  document.getElementById('battle-a-notfound').style.display = 'none';
  document.getElementById('battle-b-notfound').style.display = 'none';

  _stopBattleMinis();
  const [vidA, vidB] = await Promise.all([_resolveBattleVid(a), _resolveBattleVid(b)]);
  _loadBattleSide(battleLeftPlayer, 'battle-a-notfound', vidA, 'a', a);
  _loadBattleSide(battleRightPlayer, 'battle-b-notfound', vidB, 'b', b);
}

// ─── Міні-плеєр батлу для треків ком'юніті без відео ─────────────────────
function _battleAudio(side){ return document.getElementById(`battle-audio-${side}`); }
function _battleWrap(side){ return document.getElementById(`battle-mini-${side}`).closest('.battle-video-wrap'); }
function _isBattleAudioSide(side){ return _battleWrap(side).classList.contains('audio-mode'); }
function _setBattleMiniMode(side, audioUrl){
  const audio = _battleAudio(side);
  _battleWrap(side).classList.toggle('audio-mode', !!audioUrl);
  if(audioUrl){ audio.src = audioUrl; audio.volume = vol/100; }
  else { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  _renderBattleMini(side);
}
function _stopBattleMinis(){ ['a','b'].forEach(s=>{ const au=_battleAudio(s); au.pause(); }); }
function _renderBattleMini(side){
  const audio = _battleAudio(side);
  const mini = document.getElementById(`battle-mini-${side}`);
  const d = isFinite(audio.duration) ? audio.duration : 0;
  mini.querySelector('.battle-mini-fill').style.width = d ? `${audio.currentTime/d*100}%` : '0%';
  mini.querySelector('.battle-mini-time').textContent = `${fmtSec(audio.currentTime)} / ${fmtSec(d)}`;
  mini.querySelector('.battle-mini-play use').setAttribute('href', audio.paused ? '#icon-play' : '#icon-pause');
  mini.classList.toggle('playing', !audio.paused);
}
function toggleBattleMini(side){
  const audio = _battleAudio(side);
  if(audio.paused) audio.play().catch(()=>{}); else audio.pause();
}
function seekBattleMini(side, e){
  const audio = _battleAudio(side);
  if(!isFinite(audio.duration)) return;
  const rect = e.currentTarget.getBoundingClientRect();
  audio.currentTime = Math.max(0, Math.min(1, (e.clientX-rect.left)/rect.width)) * audio.duration;
}
['a','b'].forEach(side=>{
  const audio = _battleAudio(side);
  ['timeupdate','pause','loadedmetadata','ended'].forEach(ev=>audio.addEventListener(ev, ()=>_renderBattleMini(side)));
  ['play','pause','ended'].forEach(ev=>audio.addEventListener(ev, _renderBattleListen));
  // Як і з відео: грає лише один бік — інший (відео чи міні-плеєр) на паузу.
  audio.addEventListener('play', ()=>{
    _renderBattleMini(side);
    const other = side === 'a' ? 'b' : 'a';
    _battleAudio(other).pause();
    try{ (side === 'a' ? battleRightPlayer : battleLeftPlayer)?.pauseVideo(); }catch(e){}
  });
});

async function _resolveBattleVid(song){
  if(song.youtubeVideoId) return song.youtubeVideoId;
  if(song.source === 'community') return null;
  const vid = await fetchVid(song.artist, song.title);
  if(vid) _cacheYoutubeVideo(song.id, vid);
  return vid;
}

function _loadBattleSide(player, notFoundElId, vid, side, song){
  // Трек ком'юніті лише з файлом — міні-плеєр замість "відео не знайдено".
  const audioOnly = !vid && song?.audioUrl;
  _setBattleMiniMode(side, audioOnly ? song.audioUrl : null);
  if(audioOnly){ try{ player.stopVideo(); }catch(e){} return; }
  if(!vid){
    try{ player.stopVideo(); }catch(e){}
    document.getElementById(notFoundElId).style.display = 'block';
    return;
  }
  // cueVideoById (не loadVideoById!) — завантажує кадр і лишає на паузі.
  player.cueVideoById(vid);
  // Початкова гучність — та сама, що в основному плеєрі (глобальна змінна vol).
  player.unMute();
  player.setVolume(vol);
}

function chooseBattleWinner(side){
  if(battleTransitioning) return;
  battleTransitioning = true;
  // Відео (в .battle-media-row) і інфо/кнопка (в .battle-details-row) тепер
  // окремі елементи для того самого боку — підсвічуємо/гасимо обидва разом.
  const videos = document.querySelectorAll('#battle-split .battle-video-wrap');
  const sides = document.querySelectorAll('#battle-split .battle-side');
  const flashEls = [videos[side], sides[side]];
  const fadeEls = [videos[1-side], sides[1-side]];
  flashEls.forEach(el => el?.classList.add('battle-winner-flash'));
  fadeEls.forEach(el => el?.classList.add('battle-loser-fade'));
  try{ battleLeftPlayer && battleLeftPlayer.pauseVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.pauseVideo(); }catch(e){}
  _stopBattleMinis();

  const winner = battleRound[battleMatchIndex*2 + side];
  battleHistory.push({ round: battleRound.slice(), winners: battleWinners.slice(), matchIndex: battleMatchIndex });
  _syncBattleUndo();
  battleWinners.push(winner);
  battleMatchIndex++;

  setTimeout(()=>{
    [...videos, ...sides].forEach(el => el.classList.remove('battle-winner-flash','battle-loser-fade'));
    battleTransitioning = false;
    if(battleMatchIndex*2 >= battleRound.length){
      if(battleWinners.length === 1){
        showBattleChampion(battleWinners[0]);
        return;
      }
      battleRound = battleWinners;
      battleWinners = [];
      battleMatchIndex = 0;
    }
    loadBattleMatch();
  }, 450);
}
// Клавіатура: ← / 1 — ліва пісня, → / 2 — права (лише поки турнір відкритий і йде матч, не чемпіон-екран).
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('battle-modal-overlay');
  if(!overlay || !overlay.classList.contains('open')) return;
  if(document.getElementById('battle-champion').style.display !== 'none') return;
  const tag = document.activeElement?.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undoBattle(); return; }
  if(e.key === 'ArrowLeft' || e.key === '1'){ e.preventDefault(); chooseBattleWinner(0); }
  else if(e.key === 'ArrowRight' || e.key === '2'){ e.preventDefault(); chooseBattleWinner(1); }
});

function showBattleChampion(song){
  try{ battleLeftPlayer && battleLeftPlayer.pauseVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.pauseVideo(); }catch(e){}
  battleChampionSong = song;
  document.getElementById('battle-champion-artist').textContent = song.artist;
  document.getElementById('battle-champion-title').textContent = song.title;
  document.getElementById('battle-split').style.display = 'none';
  document.getElementById('battle-champion').style.display = 'block';
  _battleConfetti();
  // Стрічка прогресу востаннє малювалась для матчу "2 → 1" (loadBattleMatch
  // більше не викликається після визначення чемпіона) — тож сегмент "1"
  // ніколи не підсвічувався, а "2" губив .current і лишався взагалі без
  // класу (не позначений завершеним, на відміну від 16/8/4). Проставляємо
  // все явно: усі, крім останнього, — .done; останній — .winner.
  const segs = document.querySelectorAll('#battle-progress-ribbon .battle-progress-seg');
  segs.forEach((seg, i) => {
    if(i === segs.length - 1){ seg.classList.remove('current', 'done'); seg.classList.add('winner'); }
    else { seg.classList.remove('current'); seg.classList.add('done'); }
  });
}
// Невеликий конфеті-вибух над карткою чемпіона — той самий прийом, що й на
// колесі фортуни (прості DOM-елементи з CSS-анімацією, самі прибираються).
function _battleConfetti(){
  const host = document.getElementById('battle-champion');
  if(!host) return;
  const colors = WHEEL_COLORS;
  for(let i=0; i<40; i++){
    const el = document.createElement('span');
    const angle = Math.random()*360;
    const dist = 80 + Math.random()*180;
    const dx = Math.cos(angle*Math.PI/180)*dist;
    const dy = Math.sin(angle*Math.PI/180)*dist;
    el.className = 'battle-confetti-piece';
    el.style.cssText = `top:38%;left:50%;width:${5+Math.random()*4}px;height:${5+Math.random()*4}px;` +
      `background:${colors[i%colors.length]};border-radius:${Math.random()<0.5?'50%':'2px'};` +
      `--dx:${dx}px;--dy:${dy}px;animation-duration:${0.7+Math.random()*0.5}s;`;
    host.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
// "Слухати переможця" — закриває турнір і одразу вмикає переможну пісню в основному плеєрі.
function playBattleChampion(){
  if(!battleChampionSong) return;
  const champion = battleChampionSong;
  closeBattle();
  // Не playSong(id): той шукає пісню в поточній таблиці, а переможець —
  // з плейлиста й може бути з будь-якої таблиці (або з жодної відкритої).
  playerQueue = [champion];
  playerIndex = 0;
  _loadCurrent();
}

function closeBattle(){
  _closeModalAnimated('battle-modal-overlay');
  try{ battleLeftPlayer && battleLeftPlayer.stopVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.stopVideo(); }catch(e){}
  _stopBattleMinis();
}
document.getElementById('battle-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattle();
});
document.getElementById('battle-setup-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattleSetup();
});
