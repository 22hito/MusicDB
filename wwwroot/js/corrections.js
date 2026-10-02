// Запити на правку: користувач повідомляє, що в пісні чи на сторінці виконавця щось неправильне або неточне,
// чи надає файл пісні; адміни розглядають у вкладці «Правки» адмін-панелі. Самі дані правлять адміни.

// ================================================================
// ЗАПИТ НА ПРАВКУ: вікно (прапорець у рядку пісні, «Запропонувати правку» у виконавця) і «Мої запити»
// ================================================================
const CORR_SONG_FIELDS = ['genres', 'album', 'release', 'duration', 'title', 'video', 'lyrics', 'audio', 'other'];
const CORR_ARTIST_FIELDS = ['bio', 'photo', 'name', 'other'];
let _corrTarget = null; // { musicId } | { artistId } + label

function _openCorrectionModal(target){
  if(!currentUser?.authenticated){ showToast(t('corr.loginNeeded')); return; }
  _corrTarget = target;
  const fields = target.musicId ? CORR_SONG_FIELDS : CORR_ARTIST_FIELDS;
  document.getElementById('corr-field').innerHTML = fields.map(f => `<option value="${f}">${esc(t('corr.field.' + f))}</option>`).join('');
  document.getElementById('corr-target').textContent = target.label;
  document.getElementById('corr-message').value = '';
  document.getElementById('corr-source').value = '';
  document.getElementById('corr-audio').value = '';
  document.getElementById('corr-status').textContent = '';
  document.getElementById('corr-send').disabled = false;
  document.getElementById('corr-title').textContent = t('corr.title');
  document.getElementById('corr-form').style.display = '';
  document.getElementById('corr-mine').style.display = 'none';
  _syncCorrectionField();
  _syncCorrectionAudio();
  document.getElementById('correction-modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('corr-message').focus(), 50);
}
function suggestSongCorrection(id){
  const s = [...songs, ...communitySongs].find(x => x.id === id) || currentArtistSongs.find(x => x.id === id);
  if(s) _openCorrectionModal({ musicId: s.id, label: `${s.artist} — ${s.title}` });
}
function suggestArtistCorrection(){
  if(currentArtist) _openCorrectionModal({ artistId: currentArtist.id, label: currentArtist.name });
}
function closeCorrectionModal(){ _closeModalAnimated('correction-modal-overlay'); }

// Для «файлу пісні» потрібен сам файл, а опис — за бажанням; для решти — опис обов'язковий.
function _syncCorrectionField(){
  const audio = document.getElementById('corr-field').value === 'audio';
  document.getElementById('corr-audio-group').style.display = audio ? '' : 'none';
  document.getElementById('corr-message-label').textContent = t(audio ? 'corr.messageOptional' : 'corr.messageLabel');
  document.getElementById('corr-message').placeholder = t('corr.placeholder.' + document.getElementById('corr-field').value);
}
function _syncCorrectionAudio(){
  const f = document.getElementById('corr-audio').files[0];
  document.getElementById('corr-audio-name').textContent = f ? f.name : t('corr.audioPick');
}
function submitCorrection(){
  const field = document.getElementById('corr-field').value;
  const message = document.getElementById('corr-message').value.trim();
  const source = document.getElementById('corr-source').value.trim();
  const file = document.getElementById('corr-audio').files[0];
  const status = document.getElementById('corr-status');
  if(field === 'audio' && !file){ status.textContent = t('corr.audioNeeded'); return; }
  if(field !== 'audio' && message.length < 5){ status.textContent = t('corr.tooShort'); return; }
  if(source && !/^https?:\/\/\S+$/i.test(source)){ status.textContent = t('corr.badSource'); return; }
  if(file && file.size > 25 * 1024 * 1024){ status.textContent = t('corr.audioTooBig'); return; }
  const fd = new FormData();
  if(_corrTarget.musicId) fd.append('musicId', _corrTarget.musicId); else fd.append('artistId', _corrTarget.artistId);
  fd.append('field', field);
  fd.append('message', message);
  if(source) fd.append('sourceUrl', source);
  if(field === 'audio' && file) fd.append('audio', file);
  const btn = document.getElementById('corr-send');
  btn.disabled = true;
  status.textContent = file ? t('corr.uploading') : '';
  fetch('/api/corrections', { method: 'POST', body: fd })
    .then(async r => {
      if(r.status === 429){ status.textContent = t('corr.tooMany'); btn.disabled = false; return; }
      if(!r.ok){ status.textContent = (await r.text().catch(() => '')) || t('msg.connectionError'); btn.disabled = false; return; }
      closeCorrectionModal();
      showToast(t('corr.thanks'));
    })
    .catch(() => { status.textContent = t('msg.connectionError'); btn.disabled = false; });
}

// «Мої запити»: стан і відповідь адміна (з меню профілю або з вікна запиту).
function openMyCorrections(){
  if(!currentUser?.authenticated) return;
  document.getElementById('correction-modal-overlay').classList.add('open');
  showMyCorrections();
}
function showMyCorrections(){
  document.getElementById('corr-title').textContent = t('corr.mine');
  document.getElementById('corr-form').style.display = 'none';
  document.getElementById('corr-mine').style.display = '';
  const list = document.getElementById('corr-mine-list');
  list.innerHTML = `<div class="hint">${esc(t('notif.loading'))}</div>`;
  fetch('/api/corrections/mine').then(r => r.ok ? r.json() : []).then(items => {
    list.innerHTML = items.length ? items.map(c => `
      <div class="corr-mine-item">
        <div class="corr-mine-head"><span class="badge corr-status ${c.status}">${esc(t('corr.status.' + c.status))}</span>
          <strong>${esc(c.targetLabel)}</strong><span class="hint" style="margin:0">${esc(t('corr.field.' + c.field))} · ${timeHtml(c.createdAt)}</span></div>
        ${c.message ? `<div class="corr-mine-text">${esc(c.message)}</div>` : ''}
        ${c.adminNote ? `<div class="corr-note"><b>${esc(t('corr.adminReply'))}:</b> ${esc(c.adminNote)}</div>` : ''}
      </div>`).join('') : `<div class="empty" style="padding:1.2rem 0"><span>${esc(t('corr.emptyMine'))}</span></div>`;
  }).catch(() => { list.innerHTML = `<div class="hint">${esc(t('msg.connectionError'))}</div>`; });
}

// ================================================================
// АДМІН: вкладка «Правки» — перевірити, відкрити пісню/виконавця, прикріпити наданий файл, відповісти
// ================================================================
let _corrFilter = 'open';
function setCorrectionFilter(f){
  _corrFilter = f;
  ['open', 'done', 'rejected', 'all'].forEach(k => document.getElementById(`corr-filter-${k}`).classList.toggle('active', k === f));
  loadCorrections();
}
function refreshCorrectionsBadge(){
  if(!currentUser?.isAdmin) return;
  fetch('/api/corrections/open-count').then(r => r.ok ? r.json() : 0).then(n => {
    const b = document.getElementById('admin-corrections-badge');
    if(b){ b.textContent = n > 99 ? '99+' : n; b.style.display = n > 0 ? '' : 'none'; }
  }).catch(() => {});
}
function loadCorrections(){
  fetch(`/api/corrections?status=${_corrFilter}`).then(r => r.ok ? r.json() : []).then(list => {
    document.getElementById('corrections-empty').style.display = list.length ? 'none' : '';
    document.getElementById('corrections-list').innerHTML = list.map(c => {
      const open = c.status === 'open';
      const target = c.musicId
        ? (currentUser?.isAdmin ? `<a href="#" class="artist-link" onclick="openEditSongModal(${c.musicId});return false;">${esc(c.targetLabel)}</a>` : esc(c.targetLabel))
        : `<a href="#" class="artist-link" onclick="openArtistPage(${c.artistId});return false;">${esc(c.targetLabel)}</a>`;
      return `
      <div class="bug-card corr-card${open ? '' : ' resolved'}">
        <div class="bug-card-head">
          <span class="badge corr-status ${c.status}">${esc(t('corr.status.' + c.status))}</span>
          <span class="badge">${esc(t('corr.field.' + c.field))}</span>
          ${c.requester ? `<a href="#" class="artist-link" onclick="openUserProfilePage(${c.requester.userId});return false;">${esc(c.requester.displayName)}</a>` : ''}
          <span class="hint" style="margin:0;">${timeHtml(c.createdAt)}</span>
          <span style="flex:1"></span>
          <button class="btn btn-outline bug-delete-btn" onclick="deleteCorrection(${c.id})" title="${esc(t('bugs.deleteBtn'))}" aria-label="${esc(t('bugs.deleteBtn'))}"><svg class="icon"><use href="#icon-trash"/></svg></button>
        </div>
        <div class="corr-card-target">${target}</div>
        ${c.message ? `<div class="bug-card-body">${esc(c.message)}</div>` : ''}
        ${c.sourceUrl ? `<div class="corr-card-source">${esc(t('artist.source'))}: <a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.sourceUrl)}</a></div>` : ''}
        ${c.hasAudio ? `<div class="corr-card-audio"><audio controls preload="none" src="/api/corrections/${c.id}/audio"></audio>
          ${c.musicId && open ? `<button class="btn btn-primary" onclick="applyCorrectionAudio(${c.id})">${esc(t('corr.applyAudio'))}</button>` : ''}</div>` : ''}
        ${c.adminNote ? `<div class="corr-note"><b>${esc(t('corr.adminReply'))}:</b> ${esc(c.adminNote)}</div>` : ''}
        ${open ? `<div class="corr-card-actions">
          <input type="text" id="corr-note-${c.id}" maxlength="1000" placeholder="${esc(t('corr.notePlaceholder'))}">
          <button class="btn btn-outline" onclick="resolveCorrection(${c.id}, 'done')">${esc(t('corr.doneBtn'))}</button>
          <button class="btn btn-outline" onclick="resolveCorrection(${c.id}, 'rejected')">${esc(t('corr.rejectBtn'))}</button>
        </div>` : `<div class="corr-card-actions">
          ${c.resolvedBy ? `<span class="hint" style="margin:0">${esc(t('bugs.resolvedBy'))}: ${esc(c.resolvedBy.displayName)}</span>` : ''}
          <span style="flex:1"></span>
          <button class="btn btn-outline" style="font-size:0.72rem" onclick="resolveCorrection(${c.id}, 'open')">${esc(t('bugs.reopenBtn'))}</button>
        </div>`}
      </div>`;
    }).join('');
  }).catch(() => {});
}
function resolveCorrection(id, status){
  const note = document.getElementById(`corr-note-${id}`)?.value.trim() || null;
  fetch(`/api/corrections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }) })
    .then(r => { if(r.ok){ loadCorrections(); refreshCorrectionsBadge(); } else showToast(t('msg.connectionError')); })
    .catch(() => showToast(t('msg.connectionError')));
}
async function applyCorrectionAudio(id){
  if(!await confirmModal({ title: t('corr.applyAudio'), text: t('corr.applyAudioConfirm'), confirmLabel: t('corr.applyAudio'), danger: false })) return;
  fetch(`/api/corrections/${id}/apply-audio`, { method: 'POST' })
    .then(r => { if(r.ok){ loadCorrections(); refreshCorrectionsBadge(); showToast(t('corr.audioApplied')); } else showToast(t('msg.connectionError')); })
    .catch(() => showToast(t('msg.connectionError')));
}
async function deleteCorrection(id){
  if(!await confirmModal({ title: t('corr.deleteTitle'), text: t('corr.deleteConfirm'), confirmLabel: t('bugs.deleteBtn') })) return;
  fetch(`/api/corrections/${id}`, { method: 'DELETE' })
    .then(r => { if(r.ok){ loadCorrections(); refreshCorrectionsBadge(); } else showToast(t('msg.connectionError')); })
    .catch(() => showToast(t('msg.connectionError')));
}
