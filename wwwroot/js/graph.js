// Граф схожості (картки статистики на головній): розкладка й малювання на <canvas>.

// ================================================================
// ГРАФ СХОЖОСТІ: композиції / жанри / альбоми / сингли

// ================================================================
// Малюємо на <canvas> (раніше — SVG із тисячами <line>: кожен зсув/зум і
// наведення перемальовували десятки тисяч DOM-елементів — звідси лаги).
// Розкладка рахується порціями (~8 мс на кадр), тож вікно не замерзає, а граф
// плавно "осідає"; на вузол лишаємо лише найсильніші зв'язки.
const GRAPH_SIM_THRESHOLD = 0.15;
const GRAPH_TOP_K = 8;          // скільки найсильніших ребер лишаємо на вузол
const GRAPH_FRAME_BUDGET = 8;   // мс обчислень розкладки на кадр
let _g = null;                  // поточний граф (див. _startGraph)
let _graphView = { x: 0, y: 0, scale: 1 };
let _graphRaf = 0, _graphDirty = false;

function _graphCanvas(){ return document.getElementById('graph-canvas'); }
function _graphRequestDraw(){
  if(_graphDirty) return;
  _graphDirty = true;
  requestAnimationFrame(() => { _graphDirty = false; _graphDraw(); });
}
function _graphApplyView(){ _graphRequestDraw(); }
function _graphResetView(){
  _graphView = { x: 0, y: 0, scale: 1 };
  _graphRequestDraw();
}
function _graphZoomAt(px, py, factor){
  const newScale = Math.min(8, Math.max(0.4, _graphView.scale*factor));
  const f = newScale/_graphView.scale;
  _graphView.x = px - (px-_graphView.x)*f;
  _graphView.y = py - (py-_graphView.y)*f;
  _graphView.scale = newScale;
  _graphRequestDraw();
}
function _graphZoomBy(factor){
  const c = _graphCanvas();
  _graphZoomAt(c.clientWidth/2, c.clientHeight/2, factor);
}

// Координати вузла на екрані (CSS-пікселі канви): вписування розкладки в рамку + зсув/масштаб користувача.
function _graphScreen(i){
  const f = _g.fit, v = _graphView;
  return [v.x + v.scale*(f.ox + f.s*_g.xs[i]), v.y + v.scale*(f.oy + f.s*_g.ys[i])];
}
// Вписує поточну розкладку в розмір канви (з відступом) — перераховується, поки граф "осідає".
// Кола-позначки (opts.rings) теж мають уміститись, тож їх межі враховуються.
function _graphFit(){
  const c = _graphCanvas(), n = _g.n, pad = 24;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let i=0;i<n;i++){ const x=_g.xs[i], y=_g.ys[i]; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  if(_g.rings){
    const R = Math.max(..._g.rings.map(r => r.r));
    minX = Math.min(minX, _g.cx-R); maxX = Math.max(maxX, _g.cx+R); minY = Math.min(minY, _g.cy-R); maxY = Math.max(maxY, _g.cy+R);
  }
  const w = c.clientWidth || 700, h = c.clientHeight || 500;
  const padB = _g.nodeLabels ? pad + 22 : pad; // місце під підписи нижніх вузлів
  const s = Math.min((w-pad*2)/Math.max(1,maxX-minX), (h-pad-padB)/Math.max(1,maxY-minY), 2);
  _g.fit = { s, ox: (w - s*(maxX+minX))/2, oy: pad + ((h-pad-padB) - s*(maxY-minY))/2 - s*minY };
}
// Радіус вузла на екрані: базовий × масштаб × власний розмір вузла (opts.sizes).
function _graphNodeR(i){
  const r = _g.radius * Math.min(2.2, Math.max(1, Math.sqrt(_graphView.scale)));
  return _g.sizes ? r * _g.sizes[i] : r;
}

function _graphDraw(){
  if(!_g) return;
  const c = _graphCanvas();
  const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  if(!w || !h) return;
  if(c.width !== Math.round(w*dpr) || c.height !== Math.round(h*dpr)){ c.width = Math.round(w*dpr); c.height = Math.round(h*dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const n = _g.n, hov = _g.hover;
  const pos = new Float32Array(n*2);
  for(let i=0;i<n;i++){ const p = _graphScreen(i); pos[i*2]=p[0]; pos[i*2+1]=p[1]; }
  const edgeRgb = _g.edgeRgb;

  // Кола-позначки навколо центру (карта смаку: 75% / 50% / 25% збігу).
  if(_g.rings){
    const f = _g.fit, v = _graphView;
    const ccx = v.x + v.scale*(f.ox + f.s*_g.cx), ccy = v.y + v.scale*(f.oy + f.s*_g.cy);
    ctx.save();
    ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
    ctx.font = `600 10px ${_g.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for(const ring of _g.rings){
      const rr = ring.r * f.s * v.scale;
      ctx.beginPath(); ctx.arc(ccx, ccy, rr, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${edgeRgb},0.22)`; ctx.stroke();
      if(ring.label){ ctx.fillStyle = `rgba(${edgeRgb},0.75)`; ctx.fillText(ring.label, ccx, ccy - rr - 3); }
    }
    ctx.restore();
  }

  // Ребра — кількома пакетами за силою (один stroke на пакет, а не на ребро).
  const buckets = [[], [], [], []];
  for(const e of _g.edges){ buckets[Math.max(0, Math.min(3, Math.floor((e[2]-GRAPH_SIM_THRESHOLD)/0.2)))].push(e); }
  ctx.lineCap = 'round';
  buckets.forEach((list, b) => {
    if(!list.length) return;
    ctx.beginPath();
    for(const [i,j] of list){ ctx.moveTo(pos[i*2], pos[i*2+1]); ctx.lineTo(pos[j*2], pos[j*2+1]); }
    ctx.strokeStyle = `rgba(${edgeRgb},${hov != null ? 0.05 : (0.14 + b*0.09).toFixed(2)})`;
    ctx.lineWidth = 1 + b*0.5;
    ctx.stroke();
  });
  if(hov != null){
    ctx.beginPath();
    for(const j of _g.adj[hov]){ ctx.moveTo(pos[hov*2], pos[hov*2+1]); ctx.lineTo(pos[j*2], pos[j*2+1]); }
    ctx.strokeStyle = `rgba(${edgeRgb},0.8)`; ctx.lineWidth = 2; ctx.stroke();
  }

  const hl = hov != null ? new Set([hov, ..._g.adj[hov]]) : null;
  if(_g.rich){
    // Вузли з аватарками/ініціалами й різним розміром — поштучно (їх небагато).
    for(let i=0;i<n;i++){
      const x = pos[i*2], y = pos[i*2+1];
      const ri = _graphNodeR(i) * (i === hov ? 1.15 : 1);
      ctx.globalAlpha = hl && !hl.has(i) ? 0.3 : 1;
      const img = _g.images?.[i];
      ctx.beginPath(); ctx.arc(x, y, ri, 0, Math.PI*2);
      ctx.fillStyle = _g.avColors?.[i] || _g.colors[i]; ctx.fill();
      if(img && img.complete && img.naturalWidth){
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, ri, 0, Math.PI*2); ctx.clip();
        ctx.drawImage(img, x-ri, y-ri, ri*2, ri*2);
        ctx.restore();
      } else if(_g.initials?.[i]){
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.max(8, Math.round(ri*0.8))}px ${_g.serif}`;
        ctx.fillText(_g.initials[i], x, y + 1);
      }
      // Обідок: позначені вузли (друзі / спільні виконавці) — своїм кольором, решта — тонкий кольору вузла.
      const mark = _g.marks?.get(i);
      ctx.lineWidth = mark ? 2.5 : 1.5;
      ctx.strokeStyle = mark || _g.colors[i];
      ctx.beginPath(); ctx.arc(x, y, ri, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // Вузли — пакетами за кольором.
    const r = _graphNodeR(0);
    _g.colorGroups.forEach((idxs, color) => {
      ctx.beginPath();
      for(const i of idxs){ if(hl && hl.has(i)) continue; ctx.moveTo(pos[i*2]+r, pos[i*2+1]); ctx.arc(pos[i*2], pos[i*2+1], r, 0, Math.PI*2); }
      ctx.globalAlpha = hl ? 0.22 : 1;
      ctx.fillStyle = color; ctx.fill();
    });
    ctx.globalAlpha = 1;
    if(hl){
      for(const i of hl){
        const big = i === hov ? r*1.8 : r*1.25;
        ctx.beginPath(); ctx.arc(pos[i*2], pos[i*2+1], big, 0, Math.PI*2);
        ctx.fillStyle = _g.colors[i]; ctx.fill();
        ctx.lineWidth = i === hov ? 2 : 1; ctx.strokeStyle = _g.ringColor; ctx.stroke();
      }
    }
  }
  // Позначені вузли (напр. "ви" у графі смаків чи обрана пісня) — завжди з кільцем.
  if(_g.ring.length){
    ctx.lineWidth = 2; ctx.strokeStyle = _g.ringColor;
    for(const i of _g.ring){ ctx.beginPath(); ctx.arc(pos[i*2], pos[i*2+1], _graphNodeR(i)*1.45 + 3, 0, Math.PI*2); ctx.stroke(); }
  }
  // Підписи під вузлами — лише для невеликих графів (люди, виконавці), інакше каша.
  if(_g.nodeLabels){
    ctx.font = `500 11px ${_g.font}`;
    // Радіальні розкладки: підпис — назовні від центру (менше наповзань), центральний вузол — під ним.
    const f = _g.fit, v = _graphView;
    const ccx = v.x + v.scale*(f.ox + f.s*_g.cx), ccy = v.y + v.scale*(f.oy + f.s*_g.cy);
    for(let i=0;i<n;i++){
      ctx.globalAlpha = hl && !hl.has(i) ? 0.25 : 0.9;
      ctx.fillStyle = _g.textColor;
      const x = pos[i*2], y = pos[i*2+1], dx = x - ccx, dy = y - ccy, d = Math.hypot(dx, dy);
      const ri = _graphNodeR(i) * (_g.ring.includes(i) ? 1.45 : 1);
      if(_g.radialLabels && d > 1){
        const ux = dx / d, uy = dy / d;
        ctx.textAlign = Math.abs(ux) < 0.3 ? 'center' : ux > 0 ? 'left' : 'right';
        ctx.textBaseline = Math.abs(uy) < 0.3 ? 'middle' : uy > 0 ? 'top' : 'bottom';
        ctx.fillText(_g.nodeLabels[i], x + ux*(ri + 5), y + uy*(ri + 5));
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(_g.nodeLabels[i], x, y + ri + 6);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Один крок фізики (відштовхування всіх, притягання схожих, тяжіння до центру) —
// кожну пару рахуємо ОДИН раз і застосовуємо до обох вузлів. opts.pin — вузол, закріплений у центрі.
function _graphStep(){
  const { n, xs, ys, vx, vy, sim } = _g;
  const fx = _g.fx, fy = _g.fy;
  fx.fill(0); fy.fill(0);
  const repelK = _g.rich ? 9000 : 5000, springK = 0.02, centerK = 0.004;
  for(let i=0;i<n;i++){
    const xi = xs[i], yi = ys[i], row = i*n;
    for(let j=i+1;j<n;j++){
      const dx = xi-xs[j], dy = yi-ys[j];
      let d2 = dx*dx+dy*dy; if(d2<4) d2=4;
      const d = Math.sqrt(d2);
      let f = repelK/d2;             // відштовхування (уздовж напрямку i←j)
      const s = sim[row+j];
      if(s>0) f -= springK*s*d;      // пружина між схожими
      const ux = dx/d*f, uy = dy/d*f;
      fx[i]+=ux; fy[i]+=uy; fx[j]-=ux; fy[j]-=uy;
    }
  }
  const cx = _g.cx, cy = _g.cy;
  for(let i=0;i<n;i++){
    vx[i] = (vx[i] + fx[i] + (cx-xs[i])*centerK)*0.82;
    vy[i] = (vy[i] + fy[i] + (cy-ys[i])*centerK)*0.82;
    xs[i]+=vx[i]; ys[i]+=vy[i];
  }
  if(_g.pin != null){ xs[_g.pin] = cx; ys[_g.pin] = cy; vx[_g.pin] = vy[_g.pin] = 0; }
}
function _graphTick(){
  if(!_g) return;
  const t0 = performance.now();
  while(_g.iter < _g.maxIter && performance.now()-t0 < GRAPH_FRAME_BUDGET){ _graphStep(); _g.iter++; }
  _graphFit();
  _graphDraw();
  document.getElementById('graph-loading').style.display = 'none';
  if(_g.iter < _g.maxIter) _graphRaf = requestAnimationFrame(_graphTick);
}

// opts: nodeLabels(item) — підпис під вузлом; ring — індекси з кільцем; pin — вузол у центрі;
// positions — готова розкладка [[x,y]] (без фізики, центр 400×300); sizes — множник радіуса;
// images — URL фото; initials / avatarColors — ініціали на кольоровому тлі; marks — Map(індекс → колір обідка);
// rings — [{r, label}] кола-позначки навколо центру; radius — базовий радіус.
function _startGraph(items, simFn, labelFn, colorFn, onClickFn, opts = {}){
  cancelAnimationFrame(_graphRaf);
  const n = items.length;
  const sim = new Float32Array(n*n);
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const s = simFn(i,j); sim[i*n+j] = s; sim[j*n+i] = s; }
  // Ребра: лише помітна схожість і лише топ-K найсильніших для кожного вузла —
  // інакше при сотнях пісень зі спільними жанрами виходила суцільна павутина.
  const keep = new Set();
  for(let i=0;i<n;i++){
    const cand = [];
    for(let j=0;j<n;j++) if(j!==i && sim[i*n+j] >= GRAPH_SIM_THRESHOLD) cand.push(j);
    cand.sort((a,b) => sim[i*n+b]-sim[i*n+a]);
    for(const j of cand.slice(0, GRAPH_TOP_K)) keep.add(i<j ? i*n+j : j*n+i);
  }
  const edges = [], adj = Array.from({length:n}, () => []);
  for(const k of keep){ const i = Math.floor(k/n), j = k%n; edges.push([i, j, sim[k]]); adj[i].push(j); adj[j].push(i); }
  const colors = items.map((it,i) => colorFn(it,i));
  const colorGroups = new Map();
  colors.forEach((c,i) => { if(!colorGroups.has(c)) colorGroups.set(c, []); colorGroups.get(c).push(i); });
  const xs = new Float32Array(n), ys = new Float32Array(n);
  const R = 250;
  for(let i=0;i<n;i++){ const a = (i/n)*Math.PI*2; xs[i] = 400 + Math.cos(a)*R; ys[i] = 300 + Math.sin(a)*R; }
  if(opts.positions) opts.positions.forEach(([x, y], i) => { xs[i] = x; ys[i] = y; });
  const css = getComputedStyle(document.documentElement);
  const accent = (css.getPropertyValue('--accent') || '').trim();
  const nodeLabels = opts.nodeLabels && n <= 80
    ? items.map(it => { const s = String(opts.nodeLabels(it)); return s.length > 18 ? s.slice(0, 17) + '…' : s; })
    : null;
  const images = opts.images ? opts.images.map(u => {
    if(!u) return null;
    const im = new Image();
    im.referrerPolicy = 'no-referrer';
    im.onload = _graphRequestDraw;
    im.src = u;
    return im;
  }) : null;
  _g = {
    items, labelFn, onClick: onClickFn, n, sim, edges, adj, colors, colorGroups,
    xs, ys, vx: new Float32Array(n), vy: new Float32Array(n), fx: new Float32Array(n), fy: new Float32Array(n),
    cx: 400, cy: 300, iter: 0, maxIter: opts.positions ? 0 : n > 200 ? 110 : 160,
    radius: opts.radius || (n > 150 ? 3.5 : n > 50 ? 5.5 : 8), hover: null,
    edgeRgb: '200,169,110', ringColor: accent || '#fff', fit: { s: 1, ox: 0, oy: 0 },
    ring: opts.ring || [], nodeLabels, pin: opts.pin ?? null,
    rich: !!(opts.sizes || opts.images || opts.initials), sizes: opts.sizes || null, images,
    initials: opts.initials || null, avColors: opts.avatarColors || null, marks: opts.marks || null, rings: opts.rings || null,
    radialLabels: !!opts.radialLabels,
    textColor: (css.getPropertyValue('--text') || '').trim() || '#ddd', font: getComputedStyle(document.body).fontFamily || 'sans-serif',
    serif: (css.getPropertyValue('--font-serif') || '').trim() || 'serif',
  };
  _graphRaf = requestAnimationFrame(_graphTick);
}

// Найближчий вузол під курсором (у межах радіуса вузла + запас) — простий перебір, n ≤ кілька сотень.
function _graphHitTest(px, py){
  if(!_g) return null;
  let best = null, bestD = Infinity;
  for(let i=0;i<_g.n;i++){
    const [x,y] = _graphScreen(i);
    const d = (x-px)*(x-px)+(y-py)*(y-py);
    const lim = (_graphNodeR(i) + 5) ** 2;
    if(d <= lim && d < bestD){ bestD = d; best = i; }
  }
  return best;
}
function _graphSetHover(i, px, py){
  const tip = document.getElementById('graph-tooltip');
  if(i != null){
    tip.style.left = px + 'px'; tip.style.top = py + 'px';
  }
  if(_g.hover === i) return;
  _g.hover = i;
  if(i == null) tip.classList.remove('show');
  else { tip.textContent = _g.labelFn ? _g.labelFn(_g.items[i]) : ''; tip.classList.add('show'); }
  _graphCanvas().style.cursor = i == null ? '' : 'pointer';
  _graphRequestDraw();
}
function _graphNodeUnhover(){ if(_g) _graphSetHover(null); }

(function(){
  const wrap = document.getElementById('graph-canvas-wrap');
  const local = e => { const rect = wrap.getBoundingClientRect(); const z = _uiZoom(); return [(e.clientX-rect.left)/z, (e.clientY-rect.top)/z]; };
  let drag = null;
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const [x,y] = local(e);
    _graphZoomAt(x, y, e.deltaY < 0 ? 1.15 : 1/1.15);
  }, { passive: false });
  // Pointer events — і миша, і палець (телефон).
  wrap.addEventListener('pointerdown', e => {
    if(e.target.closest('.graph-zoom-controls')) return;
    drag = { x: e.clientX, y: e.clientY, vx: _graphView.x, vy: _graphView.y, moved: false };
    wrap.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', e => {
    if(!_g) return;
    const [x,y] = local(e);
    if(drag){
      const z = _uiZoom();
      const dx = (e.clientX-drag.x)/z, dy = (e.clientY-drag.y)/z;
      if(Math.abs(dx)+Math.abs(dy) > 4){ drag.moved = true; wrap.classList.add('panning'); }
      if(drag.moved){ _graphView.x = drag.vx+dx; _graphView.y = drag.vy+dy; _graphRequestDraw(); return; }
    }
    _graphSetHover(_graphHitTest(x, y), x, y);
  });
  const end = e => {
    if(!drag) return;
    const wasClick = !drag.moved;
    drag = null;
    wrap.classList.remove('panning');
    if(wasClick && _g && e.type === 'pointerup'){
      const [x,y] = local(e);
      const i = _graphHitTest(x, y);
      if(i != null && _g.onClick) _g.onClick(_g.items[i]);
    }
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('pointerleave', () => { if(!drag && _g) _graphSetHover(null); });
  if(typeof ResizeObserver === 'function') new ResizeObserver(() => { if(_g){ _graphFit(); _graphRequestDraw(); } }).observe(wrap);
})();

function _jaccard(setA, setB){
  if(!setA.size && !setB.size) return 0;
  let inter = 0;
  for(const x of setA) if(setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union ? inter/union : 0;
}
function _genreSet(song){ return new Set(song.genres.map(g=>g.toLowerCase())); }

function openSimilarityGraph(kind){
  let items, simFn, labelFn, colorFn, onClickFn, titleKey;

  if(kind === 'songs'){
    items = songs;
    const sets = items.map(_genreSet);
    simFn = (i,j) => _jaccard(sets[i], sets[j]);
    labelFn = s => `${s.artist} — ${s.title}`;
    colorFn = (s,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = s => { closeGraph(); playSong(s.id); };
    titleKey = 'graph.titleSongs';
  } else if(kind === 'genres'){
    const genreNames = [...new Set(songs.flatMap(s=>s.genres))];
    // Схожість жанрів = наскільки часто вони зустрічаються РАЗОМ у тих самих піснях.
    const songIdSets = genreNames.map(g => new Set(songs.filter(s=>s.genres.includes(g)).map(s=>s.id)));
    items = genreNames;
    simFn = (i,j) => _jaccard(songIdSets[i], songIdSets[j]);
    labelFn = g => abbrGenre(g);
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = g => { closeGraph(); showPage('home'); document.getElementById('filter-genre').value = g; renderSongs(); };
    titleKey = 'graph.titleGenres';
  } else { // 'albums' | 'singles'
    let groups;
    if(kind === 'albums'){
      const map = new Map();
      songs.forEach(s=>{
        if(!s.album) return;
        if(!map.has(s.album)) map.set(s.album, { name: s.album, songs: [], artists: new Set() });
        const g = map.get(s.album);
        g.songs.push(s); g.artists.add(s.artist);
      });
      groups = [...map.values()];
    } else {
      groups = songs.filter(s=>!s.album).map(s => ({ name: `${s.artist} — ${s.title}`, songs: [s], artists: new Set([s.artist]) }));
    }
    items = groups;
    const genreSets = groups.map(g => {
      const set = new Set();
      g.songs.forEach(s => s.genres.forEach(gn => set.add(gn.toLowerCase())));
      return set;
    });
    // Схожість альбомів/синглів: насамперед жанровий профіль, той самий виконавець — лише другорядний бонус.
    simFn = (i,j) => {
      const genreSim = _jaccard(genreSets[i], genreSets[j]);
      const a1 = groups[i].artists, a2 = groups[j].artists;
      const sameArtist = (a1.size===1 && a2.size===1 && [...a1][0]===[...a2][0]) ? 1 : 0;
      return genreSim*0.8 + sameArtist*0.2;
    };
    labelFn = g => g.name;
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = kind === 'albums'
      ? g => { closeGraph(); showPage('home'); document.getElementById('search').value = g.name; renderSongs(); }
      : g => { closeGraph(); playSong(g.songs[0].id); };
    titleKey = kind === 'albums' ? 'graph.titleAlbums' : 'graph.titleSingles';
  }

  _openGraphModal(t(titleKey), items, simFn, labelFn, colorFn, onClickFn);
}

function _openGraphModal(title, items, simFn, labelFn, colorFn, onClickFn, opts){
  document.getElementById('graph-title').textContent = title;
  document.getElementById('graph-loading').style.display = 'block';
  _g = null;
  const c = _graphCanvas(); c.getContext('2d').clearRect(0, 0, c.width, c.height);
  _graphView = { x: 0, y: 0, scale: 1 };
  document.getElementById('graph-modal-overlay').classList.add('open');
  // Старт на наступному кадрі — щоб вікно й "завантаження" встигли з'явитись.
  requestAnimationFrame(() => _startGraph(items, simFn, labelFn, colorFn, onClickFn, opts));
}

function closeGraph(){
  _closeModalAnimated('graph-modal-overlay');
  _graphNodeUnhover();
  cancelAnimationFrame(_graphRaf);
  _g = null;
}
document.getElementById('graph-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeGraph();
});
