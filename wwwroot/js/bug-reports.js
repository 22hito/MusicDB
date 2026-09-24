// Баг-репорти: модалка зі скріншотами, вкладка в адмінці, переглядач скріншотів.

// ================================================================
// БАГ-РЕПОРТИ: меню профілю → модалка; адміни — вкладка в адмін-панелі
// ================================================================
function openBugReportModal(){
  document.getElementById('bug-report-text').value = '';
  document.getElementById('bug-report-context').checked = true;
  document.getElementById('bug-context-preview').open = false;
  _syncBugContextPreview();
  _bugShots = [];
  _renderBugShots();
  document.getElementById('bug-report-status').textContent = '';
  document.getElementById('bug-report-send').disabled = false;
  document.getElementById('bug-report-modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('bug-report-text').focus(), 50);
}
function closeBugReportModal(){ _closeModalAnimated('bug-report-modal-overlay'); }
// ─── Скріншоти (до 3, до 5 МБ): вибір файлу або вставка з буфера ───
const BUG_SHOTS_MAX = 3, BUG_SHOT_MAX_BYTES = 5 * 1024 * 1024;
let _bugShots = [];
function _addBugShots(files){
  const status = document.getElementById('bug-report-status');
  status.textContent = '';
  for(const f of files){
    if(_bugShots.length >= BUG_SHOTS_MAX) break;
    if(!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) continue;
    if(f.size > BUG_SHOT_MAX_BYTES){ status.textContent = t('bugs.shotTooBig'); continue; }
    // Вставлене з буфера приходить як "image.png" — даємо унікальне ім'я з правильним розширенням.
    const ext = f.type.split('/')[1].replace('jpeg', 'jpg');
    _bugShots.push({ file: new File([f], `screenshot-${Date.now()}-${_bugShots.length}.${ext}`, { type: f.type }), url: URL.createObjectURL(f) });
  }
  _renderBugShots();
}
function _removeBugShot(i){
  URL.revokeObjectURL(_bugShots[i].url);
  _bugShots.splice(i, 1);
  _renderBugShots();
}
function _renderBugShots(){
  document.getElementById('bug-shots-list').innerHTML = _bugShots.map((s, i) => `
    <div class="bug-shot"><img src="${s.url}" alt=""><button type="button" onclick="_removeBugShot(${i})" aria-label="${t('modal.cancel')}">×</button></div>`).join('');
  document.getElementById('bug-shots-add').style.display = _bugShots.length >= BUG_SHOTS_MAX ? 'none' : '';
}
document.addEventListener('paste', e => {
  if(!document.getElementById('bug-report-modal-overlay')?.classList.contains('open')) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if(files.length){ e.preventDefault(); _addBugShots(files); }
});

// Показуємо рівно ті рядки, що підуть у звіт (раніше галочка була "чорною скринькою").
function _syncBugContextPreview(){
  const on = document.getElementById('bug-report-context').checked;
  document.getElementById('bug-context-preview').style.display = on ? '' : 'none';
  if(on) document.getElementById('bug-context-pre').textContent = _bugContext();
}
document.getElementById('bug-report-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBugReportModal();
});
// Технічний контекст — те, що зазвичай доводиться перепитувати: де, що грало, чим.
function _bugContext(){
  const s = playerQueue[playerIndex];
  const page = document.querySelector('.page.active')?.id?.replace('page-', '') || '?';
  return [
    `page: ${page}`,
    `url: ${location.href}`,
    s ? `song: #${s.id} ${s.artist} — ${s.title} (${playerMode}${playerMode==='yt' && currentVid ? ' ' + currentVid : ''}, ${isPlaying() ? 'playing' : 'paused'})` : 'song: —',
    `video popup: ${videoPopupOpen ? 'open' : 'closed'}`,
    `viewport: ${innerWidth}x${innerHeight} @${devicePixelRatio}`,
    `lang: ${currentLang}, theme: ${document.documentElement.getAttribute('data-theme')}`,
    `realtime: ${rtConn?.state || 'n/a'}`,
    `ua: ${navigator.userAgent}`,
  ].join('\n');
}
function submitBugReport(){
  const text = document.getElementById('bug-report-text').value.trim();
  const status = document.getElementById('bug-report-status');
  if(text.length < 10){ status.textContent = t('bugs.tooShort'); return; }
  const btn = document.getElementById('bug-report-send');
  btn.disabled = true;
  const context = document.getElementById('bug-report-context').checked ? _bugContext() : null;
  // Зі скріншотами — multipart на окремий ендпоінт, без них — звичайний JSON.
  let req;
  if(_bugShots.length){
    const fd = new FormData();
    fd.append('description', text);
    if(context) fd.append('context', context);
    _bugShots.forEach(s => fd.append('screenshots', s.file));
    req = fetch('/api/bug-reports/with-screenshots', { method:'POST', body: fd });
  } else {
    req = fetch('/api/bug-reports', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ description: text, context }) });
  }
  req
    .then(r=>{
      if(r.status === 429){ status.textContent = t('bugs.tooMany'); btn.disabled = false; return; }
      if(!r.ok){ status.textContent = t('msg.connectionError'); btn.disabled = false; return; }
      closeBugReportModal();
      showToast(t('bugs.thanks'));
    })
    .catch(()=>{ status.textContent = t('msg.connectionError'); btn.disabled = false; });
}

let _bugFilter = 'open';
function setBugFilter(f){
  _bugFilter = f;
  ['open','resolved','all'].forEach(k => document.getElementById(`bugs-filter-${k}`).classList.toggle('active', k===f));
  loadBugReports();
}
function refreshBugsBadge(){
  if(!currentUser?.isAdmin) return;
  fetch('/api/bug-reports/open-count').then(r=>r.ok?r.json():0).then(n=>{
    const b = document.getElementById('admin-bugs-badge');
    if(b){ b.textContent = n > 99 ? '99+' : n; b.style.display = n > 0 ? '' : 'none'; }
  }).catch(()=>{});
}
function loadBugReports(){
  fetch(`/api/bug-reports?status=${_bugFilter}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('bugs-empty').style.display = list.length ? 'none' : '';
    document.getElementById('bugs-list').innerHTML = list.map(b=>`
      <div class="bug-card${b.status==='resolved'?' resolved':''}">
        <div class="bug-card-head">
          <span class="badge${b.status==='open'?' source-community':''}">${t('bugs.status.' + b.status)}</span>
          ${b.reporter ? `<a href="#" class="artist-link" onclick="openUserProfilePage(${b.reporter.userId});return false;">${esc(b.reporter.displayName)}</a>` : ''}
          <span class="hint" style="margin:0;">${esc(b.createdAt)}</span>
          <span style="flex:1"></span>
          <button class="btn btn-outline" style="font-size:0.7rem;padding:0.3rem 0.7rem;" onclick="setBugStatus(${b.id}, '${b.status==='open'?'resolved':'open'}')">${t(b.status==='open' ? 'bugs.resolveBtn' : 'bugs.reopenBtn')}</button>
          <button class="btn btn-outline bug-delete-btn" onclick="deleteBugReport(${b.id})" title="${t('bugs.deleteBtn')}" aria-label="${t('bugs.deleteBtn')}"><svg class="icon"><use href="#icon-trash"/></svg></button>
        </div>
        <div class="bug-card-body">${esc(b.description)}</div>
        ${b.screenshotCount ? `<div class="bug-card-shots">${Array.from({ length: b.screenshotCount }, (_, i) =>
          `<button type="button" class="bug-card-shot" onclick="openShotViewer(${b.id}, ${b.screenshotCount}, ${i})"><img src="/api/bug-reports/${b.id}/screenshots/${i}" alt="${t('bugs.shotsTitle')} ${i + 1}" loading="lazy"></button>`).join('')}</div>` : ''}
        ${b.context ? `<details class="bug-card-context"><summary>${t('bugs.contextTitle')}</summary><pre>${esc(b.context)}</pre></details>` : ''}
        ${b.resolvedBy ? `<div class="hint">${t('bugs.resolvedBy')}: ${esc(b.resolvedBy.displayName)}</div>` : ''}
      </div>`).join('');
  }).catch(()=>{});
}
// ─── Переглядач скріншотів: модальне вікно зі стрілками (← → / Esc) ───
let _shotViewer = null; // { id, count, index }
function openShotViewer(id, count, index){
  _shotViewer = { id, count, index };
  _renderShotViewer();
  document.getElementById('shot-viewer').classList.add('open');
}
function closeShotViewer(){
  document.getElementById('shot-viewer').classList.remove('open');
  _shotViewer = null;
}
function stepShotViewer(d){
  if(!_shotViewer) return;
  _shotViewer.index = (_shotViewer.index + d + _shotViewer.count) % _shotViewer.count;
  _renderShotViewer();
}
function _renderShotViewer(){
  const v = _shotViewer;
  document.getElementById('shot-viewer-img').src = `/api/bug-reports/${v.id}/screenshots/${v.index}`;
  const many = v.count > 1;
  document.getElementById('shot-viewer-prev').style.display = many ? '' : 'none';
  document.getElementById('shot-viewer-next').style.display = many ? '' : 'none';
  document.getElementById('shot-viewer-count').textContent = many ? `${v.index + 1} / ${v.count}` : '';
}
document.addEventListener('keydown', e => {
  if(!_shotViewer) return;
  if(e.key === 'Escape'){ e.preventDefault(); closeShotViewer(); }
  else if(e.key === 'ArrowLeft'){ e.preventDefault(); stepShotViewer(-1); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); stepShotViewer(1); }
});
async function deleteBugReport(id){
  if(!await confirmModal({ title: t('bugs.deleteTitle'), text: t('bugs.deleteConfirm'), confirmLabel: t('bugs.deleteBtn') })) return;
  fetch(`/api/bug-reports/${id}`, { method:'DELETE' })
    .then(r=>{ if(r.ok){ loadBugReports(); refreshBugsBadge(); } else alert(t('msg.connectionError')); })
    .catch(()=>alert(t('msg.connectionError')));
}
function setBugStatus(id, status){
  fetch(`/api/bug-reports/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    .then(r=>{ if(r.ok){ loadBugReports(); refreshBugsBadge(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
