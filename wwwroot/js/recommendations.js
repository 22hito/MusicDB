// Персональні рекомендації.

// ================================================================
// RECOMMENDATIONS
// ================================================================
function openRecommendationsPage(){
  if(!currentUser?.authenticated){
    confirmLogin();
    return;
  }
  showPage('recommendations');
}
function loadRecommendationsPage(){
  document.getElementById('rec-loading').style.display = 'block';
  document.getElementById('rec-empty').style.display = 'none';
  document.getElementById('rec-list').innerHTML = '';

  fetch(`/api/recommendations?lang=${encodeURIComponent(currentLang)}`).then(r=>r.json()).then(list=>{
    document.getElementById('rec-loading').style.display = 'none';
    if(!list.length){ document.getElementById('rec-empty').style.display = ''; return; }
    document.getElementById('rec-list').innerHTML = list.map(item=>{
      const s = item.song;
      return `
      <div class="rec-item" onclick="playSong(${s.id})">
        <div class="rec-main">
          <strong>${esc(s.artist)}</strong>
          <span class="rec-title">${esc(s.title)}</span>
          ${item.reason?`<span class="rec-reason">${esc(item.reason)}</span>`:''}
        </div>
        <div class="es-meta">
          ${s.genres.map(g=>`<span class="es-genre-badge">${esc(abbrGenre(g))}</span>`).join('')}
        </div>
      </div>`;
    }).join('');
  }).catch(()=>{
    document.getElementById('rec-loading').style.display = 'none';
  });
}

function toggleShuffleTable(){
  shuffleActive = !shuffleActive;
  const btn = document.getElementById('shuffle-table-btn');
  if(shuffleActive){
    const ids = activeSongs().map(s=>s.id);
    for(let i=ids.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    shuffleOrderMap = new Map(ids.map((id,idx)=>[id, idx]));
    btn.classList.add('active');
  } else {
    shuffleOrderMap = new Map();
    btn.classList.remove('active');
  }
  renderSongs();
}
