// Переглядач вкладень просто на сайті (замість нової вкладки): фото з наближенням і гортанням,
// відео, PDF і текст. Фото: коліщатко / подвійний клік / щипок — наближення, перетягування — зсув,
// ← / → і свайп — сусідні фото розмови, Esc і свайп униз — закрити.

// items: [{ kind: 'image'|'video'|'pdf'|'text', src, name, download }]
let _mv = null;

function openMediaViewer(items, index = 0){
  if(!items?.length) return;
  _mv = { items, index: Math.max(0, Math.min(items.length - 1, index)), k: 1, x: 0, y: 0, opener: document.activeElement };
  const el = document.getElementById('media-viewer');
  el.hidden = false;
  document.documentElement.classList.add('mv-open');
  requestAnimationFrame(() => el.classList.add('open'));
  _mvRender();
  document.getElementById('mv-close').focus();
}
function closeMediaViewer(){
  const el = document.getElementById('media-viewer');
  if(!_mv || el.hidden) return;
  el.classList.remove('open');
  document.documentElement.classList.remove('mv-open');
  const opener = _mv.opener;
  _mv = null;
  setTimeout(() => { if(!_mv){ el.hidden = true; document.getElementById('mv-stage').innerHTML = ''; } }, 180);
  opener?.focus?.();
}
function mediaViewerStep(dir){
  if(!_mv || _mv.items.length < 2) return;
  _mv.index = (_mv.index + dir + _mv.items.length) % _mv.items.length;
  _mvRender();
}
function _mvRender(){
  const it = _mv.items[_mv.index];
  _mv.k = 1; _mv.x = 0; _mv.y = 0;
  const many = _mv.items.length > 1;
  document.getElementById('mv-count').textContent = many ? `${_mv.index + 1} / ${_mv.items.length}` : '';
  document.getElementById('mv-name').textContent = it.name || '';
  const dl = document.getElementById('mv-download');
  dl.href = it.download || it.src;
  dl.setAttribute('download', it.name || '');
  document.querySelectorAll('#media-viewer .mv-nav').forEach(b => { b.hidden = !many; });
  document.getElementById('mv-zoom').hidden = it.kind !== 'image';
  const stage = document.getElementById('mv-stage');
  stage.dataset.kind = it.kind;
  if(it.kind === 'image'){
    stage.innerHTML = `<img class="mv-img" src="${esc(it.src)}" alt="${esc(it.name || '')}" draggable="false">`;
    _mvApply();
  } else if(it.kind === 'video'){
    stage.innerHTML = `<video class="mv-video" src="${esc(it.src)}" controls autoplay playsinline></video>`;
  } else if(it.kind === 'pdf'){
    stage.innerHTML = `<iframe class="mv-frame" src="${esc(it.src)}" title="${esc(it.name || 'PDF')}"></iframe>`;
  } else {
    stage.innerHTML = `<pre class="mv-text">${esc(t('notif.loading'))}</pre>`;
    const idx = _mv.index;
    fetch(it.src).then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(text => { if(_mv?.index === idx) stage.querySelector('.mv-text').textContent = text; })
      .catch(() => { if(_mv?.index === idx) stage.querySelector('.mv-text').textContent = t('chat.previewFailed'); });
  }
}
// Наближення лише transform-ом (GPU), межі — щоб фото не «вилітало» за екран.
function _mvApply(){
  const img = document.querySelector('#mv-stage .mv-img');
  if(!img || !_mv) return;
  if(_mv.k <= 1){ _mv.k = 1; _mv.x = 0; _mv.y = 0; }
  else {
    const w = img.offsetWidth, h = img.offsetHeight; // розмір без transform
    const maxX = Math.max(0, (w * _mv.k - innerWidth) / 2 + 40), maxY = Math.max(0, (h * _mv.k - innerHeight) / 2 + 40);
    _mv.x = Math.max(-maxX, Math.min(maxX, _mv.x)); _mv.y = Math.max(-maxY, Math.min(maxY, _mv.y));
  }
  img.style.transform = `translate(${_mv.x}px, ${_mv.y}px) scale(${_mv.k})`;
  img.classList.toggle('zoomed', _mv.k > 1);
  document.getElementById('mv-zoom').setAttribute('aria-pressed', String(_mv.k > 1));
}
function _mvZoomAt(cx, cy, k){
  const img = document.querySelector('#mv-stage .mv-img');
  if(!img) return;
  const nk = Math.max(1, Math.min(5, k));
  const r = img.getBoundingClientRect();
  // Точка під курсором лишається на місці.
  const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
  const f = nk / _mv.k;
  _mv.x -= ox * (f - 1); _mv.y -= oy * (f - 1); _mv.k = nk;
  _mvApply();
}
function mediaViewerToggleZoom(){
  if(!_mv) return;
  if(_mv.k > 1){ _mv.k = 1; _mvApply(); } else _mvZoomAt(innerWidth / 2, innerHeight / 2, 2.5);
}

(() => {
  const root = document.getElementById('media-viewer');
  const stage = document.getElementById('mv-stage');
  if(!root || !stage) return;
  // Клік по тлі (не по самому фото/кнопках) — закрити.
  root.addEventListener('click', e => { if(e.target === root || e.target === stage) closeMediaViewer(); });
  document.addEventListener('keydown', e => {
    if(!_mv) return;
    if(e.key === 'Escape'){ e.preventDefault(); closeMediaViewer(); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); mediaViewerStep(-1); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); mediaViewerStep(1); }
    else if((e.key === '+' || e.key === '=') && stage.dataset.kind === 'image') _mvZoomAt(innerWidth / 2, innerHeight / 2, _mv.k * 1.5);
    else if(e.key === '-' && stage.dataset.kind === 'image') _mvZoomAt(innerWidth / 2, innerHeight / 2, _mv.k / 1.5);
    else if(e.key === 'Tab'){ // фокус лишається всередині вікна
      const f = [...root.querySelectorAll('button:not([hidden]), a[href], video, iframe')].filter(x => x.offsetParent !== null);
      if(!f.length) return;
      const i = f.indexOf(document.activeElement);
      if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
      else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
    }
  });
  stage.addEventListener('wheel', e => {
    if(!_mv || stage.dataset.kind !== 'image') return;
    e.preventDefault();
    _mvZoomAt(e.clientX, e.clientY, _mv.k * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
  }, { passive: false });
  stage.addEventListener('dblclick', e => {
    if(!_mv || stage.dataset.kind !== 'image') return;
    if(_mv.k > 1){ _mv.k = 1; _mvApply(); } else _mvZoomAt(e.clientX, e.clientY, 2.5);
  });
  // Перетягування (наближене фото), щипок двома пальцями, свайпи (ненаближене): вліво/вправо — сусіднє, вниз — закрити.
  const pts = new Map();
  let g = null;
  stage.addEventListener('pointerdown', e => {
    if(!_mv || stage.dataset.kind !== 'image' || !e.target.closest('.mv-img, .mv-stage')) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    stage.setPointerCapture(e.pointerId);
    const im = stage.querySelector('.mv-img');
    if(im) im.style.transition = 'none'; // під пальцем — без запізнення
    const [a, b] = [...pts.values()];
    g = pts.size === 2
      ? { pinch: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: _mv.k, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }
      : { x0: e.clientX, y0: e.clientY, x: _mv.x, y: _mv.y, t: performance.now() };
  });
  stage.addEventListener('pointermove', e => {
    if(!g || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const img = stage.querySelector('.mv-img');
    if(g.pinch && pts.size === 2){
      const [a, b] = [...pts.values()];
      _mvZoomAt(g.mx, g.my, g.k * (Math.hypot(a[0] - b[0], a[1] - b[1]) / g.d));
      return;
    }
    if(g.pinch) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if(_mv.k > 1){ _mv.x = g.x + dx; _mv.y = g.y + dy; _mvApply(); return; }
    // Ненаближене: фото їде за пальцем (свайп униз — ще й тьмяніє тло).
    if(img){ img.style.transition = 'none'; img.style.transform = `translate(${dx}px, ${Math.max(0, dy)}px)`; }
    root.style.backgroundColor = `rgba(4, 6, 12, ${(0.96 * Math.max(0.35, 1 - Math.max(0, dy) / 600)).toFixed(3)})`;
  });
  const end = e => {
    if(!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if(!g) return;
    const was = g; g = pts.size ? g : null;
    const img = stage.querySelector('.mv-img');
    if(img && !pts.size) img.style.transition = '';
    if(was.pinch || !_mv || _mv.k > 1 || pts.size) return;
    root.style.backgroundColor = '';
    const dx = e.clientX - was.x0, dy = e.clientY - was.y0, dt = Math.max(1, performance.now() - was.t);
    const fast = Math.abs(dx) / dt > 0.4 || Math.abs(dy) / dt > 0.4; // швидкий змах рахується й на коротку відстань
    if(dy > 120 || (fast && dy > 40 && Math.abs(dy) > Math.abs(dx))) closeMediaViewer();
    else if(Math.abs(dx) > 80 || (fast && Math.abs(dx) > 30)) mediaViewerStep(dx < 0 ? 1 : -1);
    else _mvApply();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
})();
