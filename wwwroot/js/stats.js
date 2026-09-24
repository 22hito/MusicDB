// Картки статистики на головній (кількість пісень, жанрів, альбомів, синглів).

// ================================================================
// STATS

// ================================================================
// Плавний відлік цифри від поточного значення до нового замість миттєвої підміни тексту.
function _animateCount(id, target){
  target = Number(target) || 0;
  const el = document.getElementById(id);
  const start = Number(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 700, t0 = performance.now();
  function tick(now){
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function updateStats(){
  const list=activeSongs();
  const ag=new Set(list.flatMap(s=>s.genres));
  const sel=document.getElementById('filter-genre');
  const cur=sel.value;
  sel.innerHTML=`<option value="">${t('filter.allGenres')}</option>`+[...ag].sort(_textSortCmp).map(g=>`<option value="${esc(g)}"${g===cur?' selected':''}>${esc(abbrGenre(g))}</option>`).join('');
  try {
    const st = await fetch(`/api/stats?source=${homeSource}`).then(r=>r.json());
    _animateCount('stat-songs', st.totalSongs);
    _animateCount('stat-genres', st.totalGenres);
    _animateCount('stat-albums', st.totalAlbums);
    _animateCount('stat-singles', st.singles);
  } catch {
    const aa=new Set(list.filter(s=>s.album).map(s=>s.album));
    _animateCount('stat-songs', list.length);
    _animateCount('stat-genres', ag.size);
    _animateCount('stat-albums', aa.size);
    _animateCount('stat-singles', list.filter(s=>!s.album).length);
  }
}

// "Прожектор" за курсором на статкартках — координати в CSS custom properties.
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const z = _uiZoom();
    card.style.setProperty('--mx', ((e.clientX - r.left) / z) + 'px');
    card.style.setProperty('--my', ((e.clientY - r.top) / z) + 'px');
  });
});
