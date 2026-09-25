// Плеєр: YouTube-плеєр і файли ком'юніті, черга, Media Session, відео-попап,
// текст пісні (караоке), біжучий рядок, перетягування й розгортання попапа.

// ================================================================
// PLAYER
// ================================================================
let ytPlayer=null,ytReady=false;
let playerQueue=[],playerIndex=0;
// Прапорець "пісню вже зараховано як прослухану" — скидається при переключенні на нову пісню.
let listenLogged=false;
// userIntendedPlaying: чи музика МАЄ грати за наміром користувача — відрізняє реальний
// play/pause від технічних onStateChange під час синхронізації відео-попапу.
let userIntendedPlaying=true;
let ticker=null,pendingVid=null;
let shuffle=false,repeat=false,seekDrag=false;
// Гучність зберігається в localStorage — інакше плеєр щоразу стартував на 80%.
const _savedVol = localStorage.getItem('volume');
let vol = _savedVol !== null ? parseInt(_savedVol) : 80;
// 'yt' — прихований YouTube-плеєр; 'file' — <audio> для завантажених файлів
// пісень ком'юніті. Усе керування (пауза, перемотка, гучність, тікер) іде
// через хелпери _p*(), які звертаються до активного з двох.
let playerMode = 'yt';
const fileAudio = document.getElementById('file-audio');
function _pReady(){ return playerMode==='file' ? !!fileAudio.src : (ytPlayer&&ytReady); }
function _pTime(){ return playerMode==='file' ? (fileAudio.currentTime||0) : ytPlayer.getCurrentTime(); }
function _pDuration(){ return playerMode==='file' ? (isFinite(fileAudio.duration)?fileAudio.duration:0) : ytPlayer.getDuration(); }
function _pSeek(sec){ if(playerMode==='file') fileAudio.currentTime = sec; else ytPlayer.seekTo(sec,true); }
function _pPlay(){ try{ if(playerMode==='file') fileAudio.play().catch(()=>{}); else if(ytPlayer&&ytReady) ytPlayer.playVideo(); }catch(e){} }
function _pPause(){ try{ if(playerMode==='file') fileAudio.pause(); else if(ytPlayer&&ytReady) ytPlayer.pauseVideo(); }catch(e){} }
function _stopFileAudio(){ fileAudio.pause(); fileAudio.removeAttribute('src'); fileAudio.load(); }

fileAudio.addEventListener('playing', ()=>{
  if(playerMode!=='file') return;
  userIntendedPlaying=true;
  setPP(true);startTick();setLoad(false);setEQ(true);
  document.getElementById('p-dur').textContent=fmtSec(_pDuration());
  refreshPlayingState();
});
fileAudio.addEventListener('pause', ()=>{
  if(playerMode!=='file' || fileAudio.ended) return;
  userIntendedPlaying=false;
  setPP(false);stopTick();setEQ(false);refreshPlayingState();
});
fileAudio.addEventListener('ended', ()=>{
  if(playerMode!=='file') return;
  setPP(false);stopTick();setEQ(false);
  if(repeat){ fileAudio.currentTime=0; fileAudio.play().catch(()=>{}); }
  else playerNext();
});
fileAudio.addEventListener('waiting', ()=>{ if(playerMode==='file') setLoad(true); });
fileAudio.addEventListener('error', ()=>{
  if(playerMode!=='file' || !fileAudio.getAttribute('src')) return;
  setLoad(false);
  const s=playerQueue[playerIndex];
  if(s) _setMarqueeText(document.getElementById('p-title'), s.title+t('audio.notFoundSuffix'));
});

function onYouTubeIframeAPIReady(){
  // Той самий плеєр і для звуку, і для відео в попапі (див. VIDEO POPUP) —
  // розмір задає контейнер (#video-popup-frame), тож 100%/100%. Закритий попап
  // лишає його 1px — YouTube тоді сам бере найнижчу якість (менше трафіку).
  ytPlayer=new YT.Player('yt-iframe',{
    height:'100%',width:'100%',
    playerVars:{autoplay:0,controls:0,disablekb:1,rel:0,modestbranding:1,iv_load_policy:3,playsinline:1},
    events:{
      onReady:()=>{
        ytReady=true;
        ytPlayer.setVolume(vol);
        if(pendingVid){_load(pendingVid);pendingVid=null;}
      },
      onStateChange:onState
    }
  });
}

function onState(e){
  // stopVideo() при переході на файловий плеєр теж дає події — вони вже не про поточну пісню.
  if(playerMode!=='yt') return;
  const S=YT.PlayerState;
  if(e.data===S.PLAYING){
    userIntendedPlaying=true;
    setPP(true);startTick();setLoad(false);setEQ(true);
    document.getElementById('p-dur').textContent=fmtSec(ytPlayer.getDuration());
    refreshPlayingState();
  }else if(e.data===S.PAUSED){
    userIntendedPlaying=false;
    setPP(false);stopTick();setEQ(false);refreshPlayingState();
  }else if(e.data===S.ENDED){
    setPP(false);stopTick();setEQ(false);
    if(repeat){ytPlayer.seekTo(0);ytPlayer.playVideo();}
    else playerNext();
  }else if(e.data===S.BUFFERING){
    setLoad(true);
  }
}

function playSong(id){
  playerQueue=(displayedSongs.length?displayedSongs:songs).slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}

// Якщо клікнута пісня вже завантажена — перемикаємо пауза/відтворення замість перезапуску черги.
function toggleOrPlay(id, playFn){
  const curId = playerQueue.length && playerQueue[playerIndex] ? playerQueue[playerIndex].id : null;
  if(curId === id) playerToggle();
  else playFn(id);
}

// playerQueue обмежуємо піснями плейлиста — next/prev/shuffle працюють лише в його межах.
let currentPlaylistSongs = [];
function playFromPlaylist(id){
  if(!currentPlaylistSongs.length) return;
  playerQueue=currentPlaylistSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
function playPlaylistFromStart(){
  if(!currentPlaylistSongs.length) return;
  playFromPlaylist(currentPlaylistSongs[0].id);
}

function _loadCurrent(){
  const s=playerQueue[playerIndex];if(!s)return;
  listenLogged=false;
  userIntendedPlaying=true;
  _setMarqueeText(document.getElementById('p-title'), s.title);
  _setMarqueeHtml(document.getElementById('p-artist'), artistLinksHtml(s));
  document.getElementById('p-album').textContent=s.album||t('table.single');
  document.getElementById('player-cover-img').style.display='none';
  document.getElementById('player-cover-ph').style.display='block';
  document.getElementById('player-bar').classList.add('visible');
  document.body.classList.add('player-open');
  document.getElementById('btn-edit-current').style.display = currentUser?.isAdmin ? '' : 'none';
  const favBtn = document.getElementById('btn-fav-current');
  const plBtn = document.getElementById('btn-playlist-current');
  favBtn.style.display = currentUser?.authenticated ? '' : 'none';
  plBtn.style.display = currentUser?.authenticated ? '' : 'none';
  favBtn.classList.toggle('active', favoriteIds.has(s.id));
  favBtn.querySelector('svg').setAttribute('fill', favoriteIds.has(s.id) ? 'currentColor' : 'none');
  document.getElementById('btn-rate-current').style.display = '';
  setLoad(true);setEQ(false);setPP(false);
  document.getElementById('player-seek-filled').style.width='0%';
  document.getElementById('player-seek-thumb').style.left='0%';
  document.getElementById('p-cur').textContent='0:00';
  document.getElementById('p-dur').textContent='0:00';

  // Пісня таблиці_2 з завантаженим файлом — грає власний <audio>, без YouTube.
  if(s.audioUrl){
    if(playerMode==='yt'){ try{ if(ytPlayer&&ytReady) ytPlayer.stopVideo(); }catch(e){} }
    if(videoPopupOpen) closeVideoPopup();
    playerMode='file';
    currentVid=null;
    // Є ще й YouTube-відео — кнопка відео активна: перемикає пісню на відео (_switchFileSongToVideo).
    document.getElementById('btn-video').classList.toggle('disabled', !s.youtubeVideoId);
    refreshPlayingState();
    if(karaokeOpen) loadKaraokeLyrics();
    _updateMediaSessionMetadata(s, null);
    fileAudio.volume = vol/100;
    fileAudio.src = s.audioUrl;
    fileAudio.play().catch(()=>{ setLoad(false); setPP(false); });
    return;
  }
  if(playerMode==='file') _stopFileAudio();
  playerMode='yt';
  document.getElementById('btn-video').classList.remove('disabled');
  refreshPlayingState();
  if(karaokeOpen) loadKaraokeLyrics();

  // Якщо videoId вже закешовано в базі — беремо напряму, без нового запиту до YouTube Search API.
  // Ком'юніті-пісні не шукаємо автоматично: відео до них вказує лише автор/адмін.
  const vidPromise = s.youtubeVideoId
    ? Promise.resolve(s.youtubeVideoId)
    : s.source === 'community' ? Promise.resolve(null)
    : fetchVid(s.artist,s.title).then(vid=>{
        if(vid) _cacheYoutubeVideo(s.id, vid);
        return vid;
      });

  _updateMediaSessionMetadata(s, null);

  vidPromise.then(vid=>{
    if(!vid){setLoad(false);_setMarqueeText(document.getElementById('p-title'), s.title+t('video.notFoundSuffix'));return;}
    currentVid = vid;
    _onVidReady(vid);
    const img=document.getElementById('player-cover-img');
    img.src='https://img.youtube.com/vi/'+vid+'/mqdefault.jpg';
    img.style.display='block';
    _applyArtworkColor(vid);
    document.getElementById('player-cover-ph').style.display='none';
    _updateMediaSessionMetadata(s, vid);
    if(ytReady)_load(vid);else pendingVid=vid;
    // Нативний попап (Electron) не підхоплює зміну пісні сам — без цього
    // лишалось би старе відео, а нове тим часом почало б грати ще й тут (два звуки одразу).
    if(_electronPopoutActive&&window.electronAPI?.openVideoPopout)window.electronAPI.openVideoPopout(vid,0,vol,false);
  });
}
// Фонове збереження знайденого videoId — не блокує відтворення, best-effort.
function _cacheYoutubeVideo(songId, videoId){
  fetch(`/api/songs/${songId}/youtube-video`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({videoId})
  }).catch(()=>{});
}

// Нормалізація для звірки релевантності: без регістру, діакритики й пунктуації.
function _normForMatch(s){
  return (s||'').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .replace(new RegExp('[^a-z0-9\\u0400-\\u04FF\\s]','g'),' ')
    .replace(/\s+/g,' ').trim();
}
function _significantWords(s){
  return _normForMatch(s).split(' ').filter(w=>w.length>2);
}
// Відео справді про ЦЮ пісню — вимагаємо, щоб більшість значущих слів із назви пісні були в назві відео.
function _isRelevantVideo(item,title){
  const nItem=_normForMatch(item.snippet?.title);
  const titleWords=_significantWords(title);
  if(!titleWords.length) return true;
  const matched=titleWords.filter(w=>nItem.includes(w)).length;
  return (matched/titleWords.length) >= 0.6;
}
async function _searchYoutube(q){
  // Пробуємо ключі по черзі — якщо один вичерпав денну квоту (403/429), переходимо на наступний.
  for(let attempt=0; attempt<ytApiKeys.length; attempt++){
    const key=ytApiKeys[ytApiKeyIdx];
    try{
      const r=await fetch(
        // maxResults=10 — більший пул кандидатів для відсіювання перезаливів.
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${key}`,
        {signal:AbortSignal.timeout(8000)}
      );
      if(r.ok){
        const d=await r.json();
        return d.items||[];
      }
      if((r.status===403||r.status===429) && ytApiKeys.length>1){
        ytApiKeyIdx=(ytApiKeyIdx+1)%ytApiKeys.length;
        continue; // квота — пробуємо наступний ключ
      }
      return []; // інша помилка (мережа/невалідний ключ) — сенсу пробувати ще нема
    }catch(e){ return []; }
  }
  return []; // усі ключі вичерпали квоту
}
async function fetchVid(artist,title){
  if(!ytApiKeys.length) return null;
  const artistLower=artist.toLowerCase();
  // "live"/"interview"/"teaser" тощо проходять перевірку релевантності, але не є студійною піснею.
  const badWords=['cover','reaction','lyric','lyrics','8d audio','slowed','reverb','nightcore','1 hour','remix','karaoke','instrumental','tiktok','sped up','unofficial','fan made','fan-made','bootleg','live','interview','making of','teaser','behind the scenes','performance','acoustic'];

  function scoreItem(item){
    const t=(item.snippet?.title||'').toLowerCase();
    const ch=(item.snippet?.channelTitle||'').toLowerCase();
    // Канал артиста, VEVO, авто-канал "Artist - Topic" або "official" в назві — ознаки офіційного джерела.
    const channelLooksOfficial = ch.includes(artistLower)||ch.includes('vevo')||ch.includes(' - topic')||ch.includes('official');
    let s=0;
    if(channelLooksOfficial) s+=4;
    // "official video" у назві саме по собі нічого не гарантує — довіряємо лише коли канал справді офіційний.
    if(t.includes('official video')||t.includes('official music video')) s+=channelLooksOfficial?2:-2;
    else if(t.includes('official')) s+=channelLooksOfficial?1:-1;
    if(badWords.some(w=>t.includes(w))) s-=5;
    return s;
  }

  try{
    let items=await _searchYoutube(`${artist} ${title} official video`);
    let relevant=items.filter(it=>_isRelevantVideo(it,title));
    if(!relevant.length){
      // Друга спроба без "official video" — деякі малі канали не використовують цю фразу.
      items=await _searchYoutube(`${artist} ${title}`);
      relevant=items.filter(it=>_isRelevantVideo(it,title));
    }
    if(!relevant.length) return null; // краще "відео не знайдено", ніж програти не ту пісню

    const best=relevant.sort((a,b)=>scoreItem(b)-scoreItem(a))[0];
    return best.id.videoId;
  }catch(e){}
  return null;
}

function _load(vid, startSeconds = 0){
  ytPlayer.loadVideoById(startSeconds > 0 ? { videoId: vid, startSeconds } : vid);
  // loadVideoById завжди стартує відтворення, ігноруючи autoplay:0 — коли звук
  // веде нативний попап (Electron), одразу глушимо тут, інакше грає з двох вікон.
  if(_electronPopoutActive)try{ytPlayer.pauseVideo();}catch(e){}
}

function playerToggle(){
  if(playerMode==='file'){ if(fileAudio.paused) _pPlay(); else _pPause(); return; }
  if(!ytPlayer||!ytReady)return;
  const st=ytPlayer.getPlayerState();
  if(st===YT.PlayerState.PLAYING)ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

function playerNext(){
  if(!playerQueue.length)return;
  if(shuffle)playerIndex=Math.floor(Math.random()*playerQueue.length);
  else playerIndex=(playerIndex+1)%playerQueue.length;
  _loadCurrent();
}

function playerPrev(){
  if(!playerQueue.length)return;
  try{if(_pReady()&&_pTime()>3){_pSeek(0);return;}}catch(e){}
  playerIndex=(playerIndex-1+playerQueue.length)%playerQueue.length;
  _loadCurrent();
}

// ================================================================
// MEDIA SESSION (апаратні клавіші відтворення, системний "зараз грає" оверлей ОС) — працює навіть поза фокусом.
// ================================================================
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('play', _pPlay);
  navigator.mediaSession.setActionHandler('pause', _pPause);
  navigator.mediaSession.setActionHandler('previoustrack', playerPrev);
  navigator.mediaSession.setActionHandler('nexttrack', playerNext);
  navigator.mediaSession.setActionHandler('stop', playerClose);
}
function _updateMediaSessionMetadata(song, videoId){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album || '',
    artwork: videoId ? [
      {src:`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, sizes:'320x180', type:'image/jpeg'},
      {src:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, sizes:'480x360', type:'image/jpeg'}
    ] : []
  });
}

function playerClose(){
  if(videoPopupOpen) closeVideoPopup();
  if(karaokeOpen) toggleKaraoke();
  try{if(ytPlayer&&ytReady)ytPlayer.stopVideo();}catch(e){}
  _stopFileAudio();
  playerMode='yt';
  stopTick();setEQ(false);
  currentVid = null;
  document.getElementById('btn-rate-current').style.display = 'none';
  document.getElementById('player-bar').classList.remove('visible');
  document.body.classList.remove('player-open');
  _applyArtworkColor(null);
  document.documentElement.removeAttribute('data-playing');
  _setGlowProgress(0);
  playerQueue=[];refreshPlayingState();
  if('mediaSession' in navigator){ navigator.mediaSession.playbackState='none'; navigator.mediaSession.metadata=null; }
  const anchor = document.getElementById('ms-anchor');
  if(anchor) anchor.pause();
}

function toggleShuffle(){shuffle=!shuffle;document.getElementById('btn-shuffle').classList.toggle('lit',shuffle);}
function toggleRepeat(){repeat=!repeat;document.getElementById('btn-repeat').classList.toggle('lit',repeat);}

function setVolume(v){
  vol=parseInt(v);
  localStorage.setItem('volume', vol);
  if(ytPlayer&&ytReady)try{ytPlayer.setVolume(vol);}catch(e){}
  fileAudio.volume = vol/100;
  document.getElementById('vw1').style.display=vol===0?'none':'';
  document.getElementById('vw2').style.display=vol<50?'none':'';
  // Нативний попап (Electron) грає звук сам, окремим вікном/процесом — синхронізуємо його гучність теж.
  if(_electronPopoutActive&&window.electronAPI?.setPopoutVolume)window.electronAPI.setPopoutVolume(vol);
}

// SEEK
function seekStart(e){
  seekDrag=true;seekMove(e);
  document.addEventListener('mousemove',seekMove);
  document.addEventListener('mouseup',seekEnd);
  document.addEventListener('touchmove',seekMove,{passive:false});
  document.addEventListener('touchend',seekEnd);
}
function seekMove(e){
  if(!seekDrag)return;
  if(e.preventDefault)e.preventDefault();
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width))*100;
  document.getElementById('player-seek-filled').style.width=pct+'%';
  document.getElementById('player-seek-thumb').style.left=pct+'%';
  try{if(_pReady())document.getElementById('p-cur').textContent=fmtSec(_pDuration()*pct/100);}catch(e){}
}
function seekEnd(e){
  seekDrag=false;
  document.removeEventListener('mousemove',seekMove);
  document.removeEventListener('mouseup',seekEnd);
  document.removeEventListener('touchmove',seekMove);
  document.removeEventListener('touchend',seekEnd);
  if(!_pReady())return;
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.changedTouches?e.changedTouches[0].clientX:(e.clientX||0);
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width));
  try{_pSeek(_pDuration()*pct);}catch(ex){}
}

function startTick(){
  stopTick();
  ticker=setInterval(()=>{
    if(!_pReady()||seekDrag)return;
    try{
      const c=_pTime(),d=_pDuration();
      if(d>0){
        const p=(c/d*100).toFixed(2);
        document.getElementById('player-seek-filled').style.width=p+'%';
        document.getElementById('player-seek-thumb').style.left=p+'%';
        document.getElementById('p-cur').textContent=fmtSec(c);
        _setGlowProgress(p);

        // Зараховуємо як прослухану після 20с або половини тривалості (що раніше).
        if(!listenLogged && currentUser?.authenticated){
          const threshold=Math.min(20,d/2);
          if(c>=threshold){
            listenLogged=true;
            const s=playerQueue[playerIndex];
            if(s) fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({musicId:s.id})}).catch(()=>{});
          }
        }
      }
    }catch(e){}
  },500);
}
function stopTick(){if(ticker){clearInterval(ticker);ticker=null;}}

function setPP(playing){
  document.getElementById('ico-play').style.display=playing?'none':'';
  document.getElementById('ico-pause').style.display=playing?'':'none';
  if('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  // Без власного елемента, що теж "грає", Chrome віддає активну media session чужому iframe (youtube.com).
  const anchor = document.getElementById('ms-anchor');
  if(anchor){ if(playing) anchor.play().catch(()=>{}); else anchor.pause(); }
}
function setLoad(on){document.getElementById('p-loading').style.display=on?'inline':'none';}
function setEQ(on){
  document.getElementById('player-cover-eq').classList.toggle('on',on);
  document.getElementById('player-cover').classList.toggle('glow',on);
  // Сяйво сторінки "дихає", поки грає, і тьмяніє на паузі.
  document.documentElement.toggleAttribute('data-playing', !!on);
}
// Прогрес пісні → "комета" в плеєрі (--p) і в сяйві сторінки (--pn, 0..1).
// Тікер кличе це двічі на секунду, а "комета" їде з transition 1.1с — тобто
// рухалась (і перемальовувала сяйво під навбаром із backdrop-filter) без
// упину. Оновлюємо лише після зсуву ≥2% (≈ раз на 5с для 4-хв пісні) або скидання.
let _glowLastPct = -100;
function _setGlowProgress(pct){
  if(pct !== 0 && Math.abs(pct - _glowLastPct) < 2) return;
  _glowLastPct = pct;
  const bar = document.getElementById('player-bar');
  if(bar) bar.style.setProperty('--p', pct + '%');
  const amb = document.getElementById('ambient');
  if(amb) amb.style.setProperty('--pn', (pct / 100).toFixed(4));
}

// ================================================================
// VIDEO POPUP

// ================================================================
// ОДИН плеєр: ytPlayer живе всередині #video-popup-frame і дає і звук, і
// відео. Відкрити/закрити попап = лише показати/сховати його контейнер (CSS),
// без другого плеєра й без синхронізації. Раніше тут був окремий беззвучний
// popupPlayer, який кожні 5с перемотувався до ytPlayer: обидва тягнули те
// саме відео (подвійний трафік), кожна перемотка перебуферизовувала відео,
// воно відставало, його знову перемотували — звідси лаги й звуку, й відео.
let videoPopupOpen = false;
let currentVid = null;

function toggleVideoPopup() {
  if (playerMode === 'file') { _switchFileSongToVideo(); return; }
  if (videoPopupOpen) closeVideoPopupByUser();
  else openVideoPopup();
}
// Відео закрив сам користувач (кнопка відео / хрестик): пісня з файлом повертається
// з YouTube на свій файл з того самого моменту — файл грає й у фоні (телефон, згорнуте вікно).
function closeVideoPopupByUser() {
  closeVideoPopup();
  const s = playerQueue[playerIndex];
  if (playerMode !== 'yt' || !s?.audioUrl || !currentVid || currentVid !== s.youtubeVideoId) return;
  let at = 0, wasPlaying = false;
  try { at = ytPlayer.getCurrentTime() || 0; wasPlaying = isPlaying(); ytPlayer.stopVideo(); } catch(e){}
  playerMode = 'file';
  currentVid = null;
  fileAudio.volume = vol / 100;
  fileAudio.src = s.audioUrl;
  fileAudio.addEventListener('loadedmetadata', () => { try { fileAudio.currentTime = at; } catch(e){} }, { once: true });
  if (wasPlaying) fileAudio.play().catch(() => { setLoad(false); setPP(false); });
  else { setLoad(false); setPP(false); setEQ(false); }
}

// Пісня ком'юніті з файлом і YouTube-відео водночас: грає файл, а кнопка відео
// перемикає її на YouTube з того самого моменту й відкриває відео.
function _switchFileSongToVideo() {
  const s = playerQueue[playerIndex];
  const vid = s?.youtubeVideoId;
  if (!vid) return; // лише файл — відео нема
  const at = fileAudio.currentTime || 0;
  _stopFileAudio();
  playerMode = 'yt';
  setLoad(true);
  _onVidReady(vid);
  const img = document.getElementById('player-cover-img');
  img.src = 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg';
  img.style.display = 'block';
  document.getElementById('player-cover-ph').style.display = 'none';
  _applyArtworkColor(vid);
  _updateMediaSessionMetadata(s, vid);
  if (ytReady) _load(vid, at); else pendingVid = vid;
  openVideoPopup();
}

// ================================================================
// МІНІ-ПЛЕЄР ФАЙЛУ: прослуховування адміном (заявка ком'юніті, файл у редагуванні
// пісні) — замість стандартного <audio controls> браузера. Один спільний <audio>:
// грає лише один міні-плеєр; основний плеєр на цей час стає на паузу.
// ================================================================
const miniAudio = new Audio();
miniAudio.preload = 'none';
let miniAudioOwner = null;     // .mini-audio, що зараз завантажений у miniAudio
let miniAudioPendingSeek = null;
// Гучність міні-плеєрів — спільна й окрема від основного плеєра; браузер її пам'ятає.
let miniAudioVol = 80, miniAudioMuted = false;
try { const v = parseInt(localStorage.getItem('miniAudio.vol'), 10); if(v >= 0 && v <= 100) miniAudioVol = v; } catch(e){}
const MINI_VOL_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const MINI_VOL_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>';
function miniAudioHtml(src){
  const off = miniAudioMuted || miniAudioVol === 0;
  return `<div class="mini-audio" data-src="${esc(src)}">
    <button type="button" class="mini-audio-btn" onclick="toggleMiniAudio(this.parentElement)" aria-label="Play"><svg class="icon icon-filled"><use href="#icon-play"/></svg></button>
    <div class="mini-audio-bar" onclick="seekMiniAudio(event, this.parentElement)"><div class="mini-audio-fill"></div></div>
    <span class="mini-audio-time">0:00</span>
    <span class="mini-audio-volwrap">
      <button type="button" class="mini-audio-mute" onclick="toggleMiniAudioMute()" aria-label="${esc(t('player.volume'))}">${off ? MINI_VOL_OFF : MINI_VOL_ON}</button>
      <span class="mini-audio-volpop"><span class="mini-audio-volbox"><input type="range" class="mini-audio-vol" min="0" max="100" value="${miniAudioMuted ? 0 : miniAudioVol}" oninput="setMiniAudioVolume(this.value)" aria-label="${esc(t('player.volume'))}"></span></span>
    </span>
  </div>`;
}
function _syncMiniAudioVolume(){
  miniAudio.volume = miniAudioVol / 100;
  miniAudio.muted = miniAudioMuted;
  const off = miniAudioMuted || miniAudioVol === 0;
  document.querySelectorAll('.mini-audio').forEach(el => {
    el.querySelector('.mini-audio-mute').innerHTML = off ? MINI_VOL_OFF : MINI_VOL_ON;
    const range = el.querySelector('.mini-audio-vol');
    if(document.activeElement !== range) range.value = miniAudioMuted ? 0 : miniAudioVol;
  });
}
function setMiniAudioVolume(v){
  miniAudioVol = Math.max(0, Math.min(100, parseInt(v, 10) || 0));
  miniAudioMuted = false;
  try { localStorage.setItem('miniAudio.vol', String(miniAudioVol)); } catch(e){}
  _syncMiniAudioVolume();
}
function toggleMiniAudioMute(){
  if(miniAudioVol === 0){ miniAudioVol = 60; miniAudioMuted = false; }
  else miniAudioMuted = !miniAudioMuted;
  _syncMiniAudioVolume();
}
function _renderMiniAudio(){
  const el = miniAudioOwner;
  if(!el) return;
  if(!document.body.contains(el)){ stopMiniAudio(); return; } // таблицю заявок перемалювали
  const d = isFinite(miniAudio.duration) ? miniAudio.duration : 0;
  el.querySelector('.mini-audio-fill').style.width = d ? `${miniAudio.currentTime / d * 100}%` : '0%';
  el.querySelector('.mini-audio-time').textContent = d ? `${fmtSec(miniAudio.currentTime)} / ${fmtSec(d)}` : fmtSec(miniAudio.currentTime);
  el.querySelector('.mini-audio-btn use').setAttribute('href', miniAudio.paused ? '#icon-play' : '#icon-pause');
  el.classList.toggle('playing', !miniAudio.paused);
}
function _resetMiniAudioUi(el){
  if(!el) return;
  el.classList.remove('playing');
  el.querySelector('.mini-audio-fill').style.width = '0%';
  el.querySelector('.mini-audio-time').textContent = '0:00';
  el.querySelector('.mini-audio-btn use').setAttribute('href', '#icon-play');
}
function stopMiniAudio(){
  miniAudio.pause();
  _resetMiniAudioUi(miniAudioOwner);
  miniAudioOwner = null;
  miniAudioPendingSeek = null;
  miniAudio.removeAttribute('src');
  miniAudio.load();
}
function toggleMiniAudio(el){
  if(miniAudioOwner === el && !miniAudio.paused){ miniAudio.pause(); return; }
  if(miniAudioOwner !== el){ stopMiniAudio(); miniAudioOwner = el; miniAudio.src = el.dataset.src; }
  if(isPlaying()) _pPause(); // основний плеєр — на паузу, щоб не грало два звуки
  _syncMiniAudioVolume();
  miniAudio.play().catch(()=>{});
}
function seekMiniAudio(e, el){
  const rect = e.currentTarget.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if(miniAudioOwner !== el){ miniAudioPendingSeek = frac; toggleMiniAudio(el); return; }
  if(isFinite(miniAudio.duration)) miniAudio.currentTime = frac * miniAudio.duration;
  else miniAudioPendingSeek = frac;
}
miniAudio.addEventListener('loadedmetadata', () => {
  if(miniAudioPendingSeek != null && isFinite(miniAudio.duration)) miniAudio.currentTime = miniAudioPendingSeek * miniAudio.duration;
  miniAudioPendingSeek = null;
  _renderMiniAudio();
});
['timeupdate', 'play', 'pause', 'ended'].forEach(ev => miniAudio.addEventListener(ev, _renderMiniAudio));
// Заграв основний плеєр (файл) чи міні-плеєр батлу — міні-плеєр замовкає.
document.addEventListener('play', e => { if(e.target !== miniAudio && e.target.id !== 'ms-anchor') miniAudio.pause(); }, true);

// ================================================================
// КАРАОКЕ: текст поточної пісні (вводить вручну адмін — див. edit-song-lyrics)
// ================================================================
let karaokeOpen = false;
function toggleKaraoke(){
  karaokeOpen = !karaokeOpen;
  document.getElementById('karaoke-panel').classList.toggle('open', karaokeOpen);
  document.getElementById('btn-karaoke').classList.toggle('active', karaokeOpen);
  if(karaokeOpen) loadKaraokeLyrics();
}
// ─── Біжучий рядок: текст, що не влазить, іде по колу (як на табло) ───
// Вміст загортаємо в .mq-track > .mq-inner; якщо він ширший за контейнер —
// додаємо копію (.mq-clone) через проміжок і безперервно зсуваємо доріжку на
// ширину тексту + проміжок: коли копія доходить до початку, цикл непомітно
// починається знову. Якщо влазить — звичайний статичний текст. Перераховується
// при зміні розміру (ResizeObserver): поворот екрана / звуження вікна.
const MQ_GAP = 48; // px між кінцем тексту і його копією
const _mqObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(e => {
  const w = Math.round(e.contentRect.width);
  if(e.target._mqW === w) return; // власні зміни (копія, клас) розмір не міняють — не зациклюємось
  e.target._mqW = w;
  _mqMeasure(e.target);
})) : null;
function _marquee(el){
  if(!el) return;
  if(!el.querySelector(':scope > .mq-track')){
    const track = document.createElement('span');
    track.className = 'mq-track';
    const inner = document.createElement('span');
    inner.className = 'mq-inner';
    while(el.firstChild) inner.appendChild(el.firstChild);
    track.appendChild(inner);
    el.appendChild(track);
    el.classList.add('mq');
    _mqObserver?.observe(el);
  }
  _mqMeasure(el);
}
function _mqMeasure(el){
  const track = el.querySelector(':scope > .mq-track');
  const inner = track?.querySelector(':scope > .mq-inner');
  if(!inner) return;
  track.querySelector(':scope > .mq-clone')?.remove();
  el.classList.remove('mq-on');
  // У inline-елемента scrollWidth = 0 — міряємо фактичну ширину тексту.
  const textW = Math.ceil(inner.getBoundingClientRect().width);
  if(el.clientWidth > 0 && textW - el.clientWidth > 2){
    const clone = inner.cloneNode(true);
    clone.className = 'mq-inner mq-clone';
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    const shift = textW + MQ_GAP;
    el.style.setProperty('--mq-gap', `${MQ_GAP}px`);
    el.style.setProperty('--mq-shift', `${shift}px`);
    el.style.setProperty('--mq-dur', `${(shift / 40 + 1.2).toFixed(1)}s`); // ~40px/с + пауза на старті кола
    el.classList.add('mq-on');
  }
}
// Той самий елемент отримує новий текст через textContent/innerHTML — обгортку
// треба відновити, тож після зміни викликаємо _marquee() ще раз.
function _setMarqueeText(el, text){ if(!el) return; el.textContent = text; _marquee(el); }
function _setMarqueeHtml(el, html){ if(!el) return; el.innerHTML = html; _marquee(el); }

function loadKaraokeLyrics(){
  const textEl = document.getElementById('karaoke-text');
  const emptyEl = document.getElementById('karaoke-empty');
  const s = playerQueue[playerIndex];
  textEl.textContent = '';
  emptyEl.style.display = 'none';
  if(!s) return;
  fetch(`/api/songs/${s.id}/lyrics`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const text = d && d.lyrics ? d.lyrics : '';
      if(!text){ emptyEl.style.display = 'block'; return; }
      textEl.textContent = text;
    })
    .catch(() => { emptyEl.style.display = 'block'; });
}

// ================================================================
// VIDEO POPUP: перенесення в окреме вікно ОС (Document Picture-in-Picture)

// ================================================================
// Document Picture-in-Picture прибрано з веб-версії — фонове відтворення воно
// не рятує (YouTube-embed так само призупиняється у фоні), а лише "перенести на
// інший монітор" не варте повторюваних багів. У Electron лишається справжнє
// нативне вікно ОС через window.electronAPI — геть інший, надійніший механізм.
let _electronPopoutActive = false;
if (window.electronAPI && window.electronAPI.onVideoPopoutClosed) {
  window.electronAPI.onVideoPopoutClosed(() => {
    _electronPopoutActive = false;
    document.getElementById('btn-video')?.classList.remove('active');
  });
}

function _updatePopoutBtnVisibility(){
  const btn = document.getElementById('video-popup-popout');
  const supported = !!(window.electronAPI && window.electronAPI.openVideoPopout);
  if (btn) btn.style.display = supported ? '' : 'none';
}

async function popOutVideoPopup(){
  if (_electronPopoutActive) return;
  if (!(window.electronAPI && window.electronAPI.openVideoPopout)) return;

  if (!currentVid) return;
  let startAt = 0;
  try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
  const ok = await window.electronAPI.openVideoPopout(currentVid, startAt, vol);
  if (ok) {
    _electronPopoutActive = true;
    document.getElementById('video-popup').classList.remove('open');
  }
}

// ================================================================
// VIDEO POPUP: розгортання розміру й перетягування по екрану
// ================================================================
function toggleVideoPopupFullscreen(){
  const popup = document.getElementById('video-popup');
  if (!document.fullscreenElement) {
    popup.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}
// Fullscreen API ховає все, що НЕ є нащадком fullscreen-елемента — тому на час
// fullscreen фізично переносимо вузол плеєр-бару всередину попапу, а після виходу повертаємо назад.
document.addEventListener('fullscreenchange', () => {
  const popup = document.getElementById('video-popup');
  const playerBar = document.getElementById('player-bar');
  const isFs = document.fullscreenElement === popup;
  document.getElementById('video-popup-fullscreen').classList.toggle('active', isFs);
  if (isFs) popup.appendChild(playerBar);
  else document.body.appendChild(playerBar);
});

// Масштаб інтерфейсу ("Розмір інтерфейсу" + автомасштаб) — це zoom на <body>.
// clientX/getBoundingClientRect() повертають ЕКРАННІ пікселі (уже помножені на
// zoom), а значення, записані в style (left/width/…), браузер множить на zoom
// ще раз. Без ділення на _uiZoom() вікно відео "тікало" від курсора при
// перетягуванні/розширенні, а граф і "прожектор" на картках — зміщувались.
function _uiZoom(){
  const z = parseFloat(getComputedStyle(document.body).zoom);
  return z > 0 ? z : 1;
}

let videoPopupExpanded = false;
function toggleVideoPopupSize(){
  videoPopupExpanded = !videoPopupExpanded;
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  // Явно перезаписуємо width/height — інакше inline-стиль від ручного перетягування переміг би клас.
  const rect = popup.getBoundingClientRect();
  const targetW = videoPopupExpanded ? Math.min(720, window.innerWidth * 0.9) : 320;
  const targetH = Math.round(targetW * 9 / 16) + header.offsetHeight * _uiZoom();
  // Попап за замовчуванням прив'язаний right/bottom — ростимо від поточного
  // правого-нижнього кута явними left/top, щоб не виштовхувати його за межі viewport.
  let newLeft = rect.right - targetW;
  let newTop = rect.bottom - targetH;
  newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - targetW - 8));
  newTop = Math.max(8, Math.min(newTop, window.innerHeight - targetH - 8));
  const z = _uiZoom();
  popup.style.right = 'auto';
  popup.style.bottom = 'auto';
  popup.style.left = (newLeft / z) + 'px';
  popup.style.top = (newTop / z) + 'px';
  popup.style.width = (targetW / z) + 'px';
  popup.style.height = (targetH / z) + 'px';
  document.getElementById('video-popup-expand').classList.toggle('active', videoPopupExpanded);
}

(function initVideoPopupResize(){
  const popup = document.getElementById('video-popup');
  const MIN_W = 220, MIN_H = 160;

  document.querySelectorAll('.vp-resize').forEach((handle) => {
    const dir = handle.dataset.dir; // 'n','s','e','w','ne','nw','se','sw'
    let dragging = false, startX = 0, startY = 0, startRect = null, z = 1;

    handle.addEventListener('pointerdown', (e) => {
      if (document.fullscreenElement) return; // у fullscreen розмір фіксований
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startRect = popup.getBoundingClientRect();
      z = _uiZoom();
      // Фіксуємо left/top ОДРАЗУ (а не лише скидаємо right/bottom) — інакше
      // між pointerdown і першим pointermove попап на мить "стрибне" в
      // позицію за замовчуванням.
      popup.style.left = (startRect.left / z) + 'px';
      popup.style.top = (startRect.top / z) + 'px';
      popup.style.right = 'auto';
      popup.style.bottom = 'auto';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation(); // не даємо це ж pointerdown зачепити перетягування за шапку
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let width = startRect.width, height = startRect.height;
      let left = startRect.left, top = startRect.top;

      if (dir.includes('e')) width = startRect.width + dx;
      if (dir.includes('w')) width = startRect.width - dx;
      if (dir.includes('s')) height = startRect.height + dy;
      if (dir.includes('n')) height = startRect.height - dy;

      width = Math.max(MIN_W * z, Math.min(window.innerWidth * 0.98, width));
      height = Math.max(MIN_H * z, Math.min(window.innerHeight * 0.98, height));

      // Протилежний (нерухомий) край лишається на місці — координату рахуємо від нього.
      if (dir.includes('w')) left = startRect.right - width;
      if (dir.includes('n')) top = startRect.bottom - height;

      // Притискаємо до 0 — інакше шапка (єдина "ручка" переміщення) могла б виштовхнутись за екран.
      if (dir.includes('n') && top < 0) { height += top; top = 0; }
      if (dir.includes('w') && left < 0) { width += left; left = 0; }

      popup.style.width = (width / z) + 'px';
      popup.style.height = (height / z) + 'px';
      popup.style.left = (left / z) + 'px';
      popup.style.top = (top / z) + 'px';
    });
    const endDrag = (e) => {
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch(ex) {}
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });
})();

(function initVideoPopupDrag(){
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, z = 1;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // не тягнемо, якщо клік по кнопці
    const rect = popup.getBoundingClientRect();
    z = _uiZoom();
    // Переходимо з bottom/right-позиціювання на top/left, щоб рахувати зсув однаково.
    popup.style.left = (rect.left / z) + 'px';
    popup.style.top = (rect.top / z) + 'px';
    popup.style.right = 'auto';
    popup.style.bottom = 'auto';
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    header.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  header.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = popup.getBoundingClientRect();
    const margin = 40; // лишаємо хоч трохи попапу видимим за краєм екрана
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);
    newLeft = Math.max(margin - rect.width, Math.min(window.innerWidth - margin, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - margin, newTop));
    popup.style.left = (newLeft / z) + 'px';
    popup.style.top = (newTop / z) + 'px';
  });
  const endDrag = (e) => {
    dragging = false;
    try { header.releasePointerCapture(e.pointerId); } catch(ex) {}
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
})();

function openVideoPopup() {
  if (!currentVid) return;
  videoPopupOpen = true;
  document.getElementById('video-popup').classList.add('open');
  document.getElementById('btn-video').classList.add('active');
}

function closeVideoPopup() {
  if (_electronPopoutActive && window.electronAPI?.closeVideoPopout) {
    window.electronAPI.closeVideoPopout();
    _electronPopoutActive = false;
  }

  const popup = document.getElementById('video-popup');

  // Спершу ГАРАНТОВАНО виходимо з fullscreen, і лише потім ховаємо попап — інакше браузер "зависає".
  if (document.fullscreenElement === popup) {
    document.exitFullscreen?.().catch(() => {}).finally(_finishCloseVideoPopup);
  } else {
    _finishCloseVideoPopup();
  }
}
function _finishCloseVideoPopup() {
  videoPopupOpen = false;
  // Лише ховаємо контейнер — плеєр і звук не чіпаємо.
  document.getElementById('video-popup').classList.remove('open');
  document.getElementById('btn-video').classList.remove('active');
}

function _onVidReady(vid) {
  // Відкритий попап показує той самий плеєр — нове відео з'явиться в ньому само.
  currentVid = vid;
}
