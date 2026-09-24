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
async function loadTopSongsPage(){
  const tbody=document.getElementById('top-songs-body');
  try{
    const list = await fetch('/api/stats/top-songs?limit=100').then(r=>r.json());
    currentTopSongs = list;
    if(!list.length){
      tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
      return;
    }
    const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
    tbody.innerHTML=list.map((s,i)=>{
      const isPlay=s.id===curId;
      const btnIcon=isPlay&&isPlaying()?ROW_PAUSE_ICON:ROW_PLAY_ICON;
      return `<tr data-id="${s.id}" class="${isPlay?'playing-row':''}">
        <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
          <button class="play-row-btn${isPlay?' is-playing':''}" data-icon="${btnIcon===ROW_PAUSE_ICON?'pause':'play'}" onclick="toggleOrPlay(${s.id}, playFromTop)">${btnIcon}</button>
        </td>
        <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td class="td-artist" data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
        <td class="td-title" data-label="${t('table.title')}">${esc(s.title)}</td>
        <td class="td-album" data-label="${t('table.album')}">${s.album?`<span class="badge album">${esc(s.album)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td class="duration-col td-plays" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      </tr>`;
    }).join('');
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
  }
}
