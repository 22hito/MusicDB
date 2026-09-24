// Оцінки (0–100) і рецензії.

// ================================================================
// ОЦІНКИ (0–100, тимчасово) І РЕЦЕНЗІЇ
// ================================================================
let ratingMusicId = null;
function openRatingModal(id){
  if(id == null) return;
  ratingMusicId = id;
  const s = _findSong(id);
  document.getElementById('rating-song-label').textContent = s ? `${s.artist} — ${s.title}` : '';
  document.getElementById('rating-summary').textContent = t('notif.loading');
  document.getElementById('rating-reviews').innerHTML = '';
  document.getElementById('rating-modal-overlay').classList.add('open');
  _loadRatingModal();
}
function closeRatingModal(){
  _closeModalAnimated('rating-modal-overlay');
  ratingMusicId = null;
}
document.getElementById('rating-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeRatingModal();
});
function _syncRatingNumber(el){
  let v = parseInt(el.value, 10);
  if(isNaN(v)) return;
  v = Math.max(0, Math.min(100, v));
  document.getElementById('rating-score').value = v;
}
function _setRatingInputs(score, review){
  document.getElementById('rating-score').value = score;
  document.getElementById('rating-score-num').value = score;
  document.getElementById('rating-review').value = review || '';
}
function _loadRatingModal(){
  const id = ratingMusicId;
  const authed = !!currentUser?.authenticated;
  document.getElementById('rating-form').style.display = authed ? '' : 'none';
  document.getElementById('rating-login-hint').style.display = authed ? 'none' : '';
  fetch(`/api/songs/${id}/ratings`).then(r=>r.ok?r.json():null).then(d=>{
    if(!d || ratingMusicId !== id) return;
    document.getElementById('rating-summary').textContent = d.avgRating != null
      ? t('rating.summary').replace('{avg}', d.avgRating).replace('{count}', d.ratingCount)
      : t('rating.noRatings');
    if(d.mine) _setRatingInputs(d.mine.score, d.mine.review);
    else _setRatingInputs(70, '');
    document.getElementById('rating-delete-btn').style.display = d.mine ? '' : 'none';
    document.getElementById('rating-reviews').innerHTML = d.reviews.length
      ? d.reviews.map(rv=>`
        <div class="rating-review">
          <div class="rating-review-head">
            ${_userLinkHtml(rv.user)}
            <span class="rating-chip has-rating"><svg class="icon"><use href="#icon-star"/></svg> ${rv.score}</span>
            <span class="rating-review-date">${esc(rv.updatedAt)}</span>
            ${currentUser?.isAdmin && rv.user.userId !== currentUser?.userId ? _deleteBtnHtml(`adminDeleteReview(${rv.user.userId})`) : ''}
          </div>
          <div class="rating-review-body">${esc(rv.review)}</div>
        </div>`).join('')
      : `<div class="hint">${t('rating.noReviews')}</div>`;
    _applyRatingSummary(id, d.avgRating, d.ratingCount);
  }).catch(()=>{});
}
function saveRating(){
  const id = ratingMusicId;
  const score = Math.max(0, Math.min(100, parseInt(document.getElementById('rating-score-num').value, 10) || 0));
  const review = document.getElementById('rating-review').value.trim();
  fetch(`/api/songs/${id}/ratings`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ score, review: review || null }) })
    .then(r=>{
      if(r.status===401){ login(); return; }
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      _loadRatingModal();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteMyRating(){
  fetch(`/api/songs/${ratingMusicId}/ratings`, { method:'DELETE' })
    .then(r=>{ if(r.ok || r.status===404) _loadRatingModal(); })
    .catch(()=>{});
}
async function adminDeleteReview(userId){
  if(!await confirmModal({ title: t('modal.deleteShortTitle'), text: t('rating.confirmAdminDelete'), confirmLabel: t('modal.confirmDelete') })) return;
  fetch(`/api/songs/${ratingMusicId}/ratings?userId=${userId}`, { method:'DELETE' })
    .then(r=>{ if(r.ok) _loadRatingModal(); })
    .catch(()=>{});
}
// Нове середнє (з модалки чи SignalR ratingChanged) — точково в обох таблицях.
function _applyRatingSummary(musicId, avg, count){
  let changed = false;
  [songs, communitySongs, playerQueue, currentTopSongs].forEach(list=>list.forEach(s=>{
    if(s.id === musicId && (s.avgRating !== avg || s.ratingCount !== count)){ s.avgRating = avg; s.ratingCount = count; changed = true; }
  }));
  if(changed) renderSongs();
  if(ratingMusicId === musicId && document.getElementById('rating-modal-overlay').classList.contains('open')){
    const summary = document.getElementById('rating-summary');
    summary.textContent = avg != null ? t('rating.summary').replace('{avg}', avg).replace('{count}', count) : t('rating.noRatings');
  }
}
