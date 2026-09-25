// Колесо фортуни: випадковий жанр → перемішаний плейлист цього жанру.

// ================================================================
// КОЛЕСО ФОРТУНИ: випадковий жанр -> перемішаний плейлист цього жанру
// (окрема сторінка page-wheel, а не модалка — відкривається через showPage('wheel'))

// ================================================================
// Приглушена, "коштовна" палітра в тон золотому акценту сайту — замість
// яскравих іграшкових кольорів звичайного колеса фортуни.
const WHEEL_COLORS = [
  '#c8a96e','#8a6fb0','#4f8c6f','#b5555a','#5b84a8','#c98a4b',
  '#6fa89e','#9a6b8f','#7d9153','#b0703f','#5f6fa0','#a3824f',
];
// wheelAllGenres — весь пул, перемішаний раз при відкритті; wheelGenres — перші N з нього.
// Зміна кількості обрізає той самий порядок, а не перемішує наново.
let wheelAllGenres = [];
let wheelGenres = [];
let wheelResultGenre = null;
let wheelSpinning = false;
let currentWheelSongs = [];

function _shuffledCopy(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Колір сегмента: до 10 жанрів — підібрана палітра; більше — HSL за "золотим кутом"
// (~137.5°), щоб сусідні сектори не зливались, як при звичайному i/n*360.
function _wheelSegColor(i, n){
  if(n <= WHEEL_COLORS.length) return WHEEL_COLORS[i % WHEEL_COLORS.length];
  // Приглушено (38%/42%), узгоджено з кураторською палітрою вище.
  return `hsl(${Math.round((i*137.508) % 360)}deg 38% 42%)`;
}

// Жанр бере участь у колесі лише якщо в ньому є щонайменше 5 пісень — інакше
// плейлист по цьому жанру виходив би заскладно коротким.
function _eligibleWheelGenres(){
  const counts = {};
  for(const s of songs) for(const g of s.genres) counts[g] = (counts[g] || 0) + 1;
  return Object.keys(counts).filter(g => counts[g] >= 5);
}

// true лише після того, як користувач сам змінив поле (onWheelCountChange) —
// без цього прапорця openWheelPage() щоразу бачив у полі вже НЕПОРОЖНЄ (хай і
// дефолтне з HTML) значення "2" і ніколи не підставляв нормальний дефолт 10.
let wheelCountTouched = false;

// ─── Режими: 'random' — N випадкових жанрів (від 5 пісень); 'custom' — жанри,
// які користувач обрав сам (будь-які, де є хоч одна пісня). Вибір пам'ятає браузер.
let wheelMode = 'random';
let wheelCustomGenres = [];
try {
  wheelMode = localStorage.getItem('wheel.mode') === 'custom' ? 'custom' : 'random';
  wheelCustomGenres = JSON.parse(localStorage.getItem('wheel.customGenres') || '[]').filter(g => typeof g === 'string');
} catch(e){ /* приватне вікно — без запам'ятовування */ }
function _saveWheelPrefs(){
  try {
    localStorage.setItem('wheel.mode', wheelMode);
    localStorage.setItem('wheel.customGenres', JSON.stringify(wheelCustomGenres));
  } catch(e){}
}
// Жанри з кількістю пісень — для вікна вибору (від найпоширеніших).
function _wheelGenreCounts(){
  const counts = new Map();
  for(const s of songs) for(const g of s.genres) counts.set(g, (counts.get(g) || 0) + 1);
  return [...counts.entries()].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
}
function _resetWheelResult(){
  wheelResultGenre = null;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
  document.querySelectorAll('.wheel-legend-item.winner').forEach(el=>el.classList.remove('winner'));
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}
function setWheelMode(mode){
  if(wheelSpinning || mode === wheelMode) return;
  wheelMode = mode;
  _saveWheelPrefs();
  _syncWheelModeUi();
  _resetWheelResult();
  if(mode === 'custom') _applyWheelCustom(); else _applyWheelCount();
}
function _syncWheelModeUi(){
  const custom = wheelMode === 'custom';
  document.getElementById('wheel-mode-random').classList.toggle('active', !custom);
  document.getElementById('wheel-mode-custom').classList.toggle('active', custom);
  document.getElementById('wheel-count-row').style.display = custom ? 'none' : '';
  document.getElementById('wheel-custom-row').style.display = custom ? '' : 'none';
}
function _applyWheelCustom(){
  const available = new Set(songs.flatMap(s => s.genres));
  wheelGenres = wheelCustomGenres.filter(g => available.has(g));
  _redrawWheel();
  const chips = document.getElementById('wheel-custom-chips');
  chips.innerHTML = wheelGenres.length
    ? wheelGenres.map((g,i) => `<span class="wheel-chip" style="--chip:${_wheelSegColor(i, wheelGenres.length)}">${esc(abbrGenre(g))}<button type="button" onclick="removeWheelCustomGenre(${i})" aria-label="×">×</button></span>`).join('')
    : `<span class="wheel-custom-empty">${esc(t('wheel.customEmpty'))}</span>`;
  document.getElementById('wheel-spin-btn').disabled = wheelGenres.length < 2;
}
function removeWheelCustomGenre(i){
  if(wheelSpinning) return;
  const g = wheelGenres[i];
  wheelCustomGenres = wheelCustomGenres.filter(x => x !== g);
  _saveWheelPrefs();
  _resetWheelResult();
  _applyWheelCustom();
}
function openWheelGenrePicker(){
  if(wheelSpinning) return;
  document.getElementById('wheel-genres-search').value = '';
  renderWheelGenrePicker();
  document.getElementById('wheel-genres-modal-overlay').classList.add('open');
}
function renderWheelGenrePicker(){
  const q = document.getElementById('wheel-genres-search').value.trim().toLowerCase();
  const selected = new Set(wheelCustomGenres);
  const list = _wheelGenreCounts().filter(([g]) => !q || g.toLowerCase().includes(q) || abbrGenre(g).toLowerCase().includes(q));
  document.getElementById('wheel-genres-list').innerHTML = list.length
    ? list.map(([g, n]) => `<button type="button" class="wheel-genre-opt${selected.has(g) ? ' selected' : ''}" data-genre="${esc(g)}" onclick="toggleWheelCustomGenre(this.dataset.genre)"><span>${esc(abbrGenre(g))}</span><span class="wheel-genre-n">${n}</span></button>`).join('')
    : `<div class="wheel-custom-empty">${esc(t('wheel.nothingFound'))}</div>`;
  document.getElementById('wheel-genres-count').textContent = t('wheel.selectedCount').replace('{n}', wheelCustomGenres.length);
}
function toggleWheelCustomGenre(g){
  wheelCustomGenres = wheelCustomGenres.includes(g) ? wheelCustomGenres.filter(x => x !== g) : [...wheelCustomGenres, g];
  renderWheelGenrePicker();
}
function clearWheelGenrePicker(){
  wheelCustomGenres = [];
  renderWheelGenrePicker();
}
function closeWheelGenrePicker(){
  _closeModalAnimated('wheel-genres-modal-overlay');
  _saveWheelPrefs();
  _resetWheelResult();
  _applyWheelCustom();
}
document.getElementById('wheel-genres-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeWheelGenrePicker();
});

function openWheelPage(){
  _syncWheelModeUi();
  wheelAllGenres = _shuffledCopy(_eligibleWheelGenres());
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  countInput.max = total || 1;
  // За замовчуванням — досить мало, щоб підписи одразу читались; хочете
  // більше (аж до всіх жанрів бази) — підкрутіть число самі.
  countInput.min = Math.min(2, total || 1);
  const defaultCount = Math.max(1, Math.min(10, total));
  countInput.value = wheelCountTouched
    ? Math.min(Math.max(countInput.min, parseInt(countInput.value) || defaultCount), total || 1)
    : defaultCount;
  document.getElementById('wheel-count-max').textContent = `/ ${total}`;
  wheelSpinning = false;
  document.getElementById('wheel-spin-btn').disabled = false;
  if(wheelMode === 'custom') _applyWheelCustom(); else _applyWheelCount();
  _resetWheelResult();
}

// Хрестик на картці результату — ховає її й миттєво знімає розмиття з диска
// (сам .wheel-disc.revealed прибирає filter з transition саме для цього).
function closeWheelResult(){
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
}

// Викликається при зміні поля "Кількість жанрів на колесі" — обрізає той
// самий перемішаний пул і перемальовує колесо (без нового спіну/результату).
function onWheelCountChange(){
  if(wheelSpinning) return;
  wheelCountTouched = true;
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  const min = parseInt(countInput.min) || 1;
  if(_sanitizeIntInput(countInput, min, total || 1) === null) return; // ще друкує/порожньо
  _applyWheelCount();
  wheelResultGenre = null;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-disc').classList.remove('revealed');
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}
function _applyWheelCount(){
  const v = parseInt(document.getElementById('wheel-count').value) || wheelAllGenres.length;
  wheelGenres = wheelAllGenres.slice(0, v);
  document.getElementById('wheel-spin-btn').disabled = wheelSpinning;
  _redrawWheel();
}
function _redrawWheel(){
  renderWheelDisc();
  renderWheelLegend();
  const disc = document.getElementById('wheel-disc');
  disc.style.transition = 'none';
  disc.style.transform = 'rotate(0deg)';
  requestAnimationFrame(()=>{ disc.style.transition = ''; });
}

// Розмір шрифту підписів масштабуємо під кількість секторів — інакше текст накладається сам на себе.
function _wheelLabelFontSize(n){
  if(n <= 8) return 14;
  if(n <= 16) return 12.5;
  if(n <= 28) return 11;
  if(n <= 45) return 9.8;
  if(n <= 65) return 8.8;
  return 8;
}

// Підписи позиціонуються окремо від фарбування диска й перемальовуються через
// ResizeObserver (не одноразово в renderWheelDisc) — clientWidth диска одразу
// після showPage()/View Transition не завжди встигає влаштуватись на фінальний
// розмір (звідси стійкий баг "підписи впритул до хаба", що повертався попри
// правильну формулу — сама формула рахувала на ЗАНИЖЕНОМУ discR). ResizeObserver
// гарантовано спрацює ще раз, щойно диск отримає свій справжній розмір.
let _wheelDiscResizeObserver = null;
function renderWheelDisc(){
  const disc = document.getElementById('wheel-disc');
  const n = wheelGenres.length;
  if(!n){ disc.style.background = ''; disc.innerHTML = ''; return; }
  const segAngle = 360/n;
  const gradientParts = wheelGenres.map((g,i)=>`${_wheelSegColor(i,n)} ${i*segAngle}deg ${(i+1)*segAngle}deg`).join(', ');
  disc.style.background = `conic-gradient(${gradientParts})`;
  _renderWheelLabels(disc);
  if(!_wheelDiscResizeObserver){
    _wheelDiscResizeObserver = new ResizeObserver(() => _renderWheelLabels(disc));
    _wheelDiscResizeObserver.observe(disc);
  }
}
function _renderWheelLabels(disc){
  const n = wheelGenres.length;
  if(!n) return;
  const segAngle = 360/n;
  // "По центру сектора" — кутове центрування (mid, бісектриса сектора), не радіальне.
  const hubR = (document.getElementById('wheel-hub')?.clientWidth || 0)/2;
  const discR = disc.clientWidth/2;
  if(!discR) return; // диск ще без розміру (0 у момент переходу сторінки) — дочекаємось ResizeObserver
  // Шрифт — пропорційно розміру колеса (на телефоні колесо ~260px, на моніторі до 860px).
  const baseFont = _wheelLabelFontSize(n) * Math.min(1.35, Math.max(0.72, discR / 220));
  // Підпис починається якомога ближче до хаба, але не там, де сектор вужчий за
  // рядок тексту (дуга сектора ≥ 1.3 висоти шрифту) — інакше сусіди злипаються.
  const minArcR = (1.3 * baseFont * n) / (2 * Math.PI);
  const startR = Math.max(hubR + 10, minArcR);
  // Довжина до обідка — більше підпису не можна (раніше довгі назви вилазили за колесо).
  const avail = Math.max(20, discR - startR - Math.max(8, discR * 0.05));
  disc.innerHTML = wheelGenres.map((g,i)=>{
    const mid = i*segAngle + segAngle/2;
    // rotate(θ) translate(r,0) дивиться на кут (90+θ) від верху — щоб отримати mid, беремо θ = mid-90.
    const rot = mid - 90;
    const label = abbrGenre(g);
    // Довга назва спершу зменшує шрифт (до 8px), щоб уміститись; далі — трикрапка
    // (повна назва є в легенді поруч). 0.62em — середня ширина жирного символу.
    const fontSize = Math.max(8, Math.min(baseFont, avail / (label.length * 0.62)));
    return `<span class="wheel-seg-label" title="${esc(g)}" style="font-size:${fontSize.toFixed(1)}px;max-width:${Math.floor(avail)}px;transform:rotate(${rot}deg) translate(${startR.toFixed(1)}px, -50%);">${esc(label)}</span>`;
  }).join('');
}

// Легенда — той самий список назв, що й на диску, але списком, для звірки з обрізаними підписами.
function renderWheelLegend(){
  const n = wheelGenres.length;
  document.getElementById('wheel-legend').innerHTML = wheelGenres.map((g,i)=>`
    <div class="wheel-legend-item" id="wheel-legend-item-${i}">
      <span class="wheel-legend-swatch" style="background:${_wheelSegColor(i,n)}"></span>
      <span>${esc(g)}</span>
    </div>`).join('');
}

// Санітайзер для числових полів колеса (type="text", бо type="number" пропускає
// невалідний проміжний ввід): викидає нецифрові символи, затискає ЛИШЕ зверху
// (max) під час друку. Нижню межу (min) тут НЕ підіймаємо — інакше перша
// цифра нижче min (напр. "1" при min=2) миттєво перетворювалась би на "2" ще
// до того, як дописати другу цифру, і "12" ніколи не вдавалось би ввести.
// Нижню межу перевіряємо остаточно на blur — _restoreIntInputIfEmpty.
function _sanitizeIntInput(el, min, max){
  const digitsOnly = el.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if(digitsOnly === ''){
    if(el.value !== '') el.value = '';
    return null;
  }
  let v = parseInt(digitsOnly, 10);
  if(v > max) v = max;
  const str = String(v);
  if(el.value !== str) el.value = str;
  return v;
}
function _restoreIntInputIfEmpty(el){
  const min = parseInt(el.min) || 1;
  const max = parseInt(el.max) || 99;
  const v = el.value.trim() === '' ? min : Math.max(min, Math.min(max, parseInt(el.value, 10) || min));
  if(String(v) !== el.value) el.value = String(v);
}
function _clampWheelSecInput(el){
  _sanitizeIntInput(el, parseInt(el.min) || 1, parseInt(el.max) || 99);
}
// На blur — якщо після редагування одного поля min > max, підтягуємо ІНШЕ
// поле до відредагованого (а не просто відкидаємо/забороняємо ввід), щоб
// діапазон завжди лишався коректним: "4 — 3" перетворюється на "4 — 4"
// (якщо редагували min) або "3 — 3" (якщо редагували max).
function _syncWheelSecRange(changedEl){
  const minEl = document.getElementById('wheel-sec-min');
  const maxEl = document.getElementById('wheel-sec-max');
  const minV = parseInt(minEl.value, 10);
  const maxV = parseInt(maxEl.value, 10);
  if(!Number.isNaN(minV) && !Number.isNaN(maxV) && minV > maxV){
    if(changedEl === minEl) maxEl.value = String(minV);
    else minEl.value = String(maxV);
  }
}

function spinWheel(){
  if(wheelSpinning || wheelGenres.length < (wheelMode === 'custom' ? 2 : 1)) return;
  const secMin = Math.max(1, Math.min(99, parseFloat(document.getElementById('wheel-sec-min').value) || 3));
  const secMax = Math.max(secMin, Math.min(99, parseFloat(document.getElementById('wheel-sec-max').value) || secMin));
  const duration = secMin + Math.random()*(secMax-secMin);

  wheelSpinning = true;
  document.getElementById('wheel-spin-btn').disabled = true;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';

  const n = wheelGenres.length;
  const segAngle = 360/n;
  const winnerIndex = Math.floor(Math.random()*n);
  // Сегмент winnerIndex опиняється під нерухомою стрілкою, коли rotation == 360 - mid (+ повні оберти).
  const fullSpins = Math.max(4, Math.round(duration*1.4)) + Math.floor(Math.random()*2);
  const mid = winnerIndex*segAngle + segAngle/2;
  const rotation = fullSpins*360 + (360 - mid);
  const disc = document.getElementById('wheel-disc');
  disc.classList.remove('revealed'); // прибрати розмиття з попереднього результату на час нового обертання
  disc.style.transitionDuration = `${duration}s`;
  disc.style.transform = `rotate(${rotation}deg)`;
  setTimeout(()=>{
    wheelSpinning = false;
    document.getElementById('wheel-spin-btn').disabled = false;
    wheelResultGenre = wheelGenres[winnerIndex];
    document.getElementById('wheel-result-genre').textContent = abbrGenre(wheelResultGenre);
    document.getElementById('wheel-result').style.display = 'flex';
    disc.classList.add('revealed'); // розмиває колесо, поки в центрі показано результат
    document.querySelectorAll('.wheel-legend-item.winner').forEach(el=>el.classList.remove('winner'));
    document.getElementById(`wheel-legend-item-${winnerIndex}`)?.classList.add('winner');
    renderWheelPlaylist();
  }, duration*1000 + 150);
}

// Плейлист показуємо одразу після зупинки колеса, ще до натискання "Слухати".
function renderWheelPlaylist(){
  if(!wheelResultGenre) return;
  currentWheelSongs = _shuffledCopy(songs.filter(s=>s.genres.includes(wheelResultGenre)));
  if(!currentWheelSongs.length) return; // жанри колеса й так беруться лише з наявних пісень
  document.getElementById('wheel-playlist-empty').style.display = 'none';
  document.getElementById('wheel-playlist-wrap').style.display = '';
  document.getElementById('wheel-playlist-title').textContent = `${abbrGenre(wheelResultGenre)} — ${currentWheelSongs.length}`;
  document.getElementById('wheel-playlist-body').innerHTML = currentWheelSongs.map(s=>`
    <tr>
      <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromWheel)" title="${t('profile.playBtn')}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button></td>
      <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
    </tr>`).join('');
}
function playFromWheel(id){
  if(!currentWheelSongs.length) return;
  playerQueue = currentWheelSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function playWheelFromStart(){
  if(!currentWheelSongs.length) return;
  playFromWheel(currentWheelSongs[0].id);
}

// Посилання на виконавців — s.artists уже розбитий по колаборантах; s.artist — фолбек для пісень без бекфілу.
function artistLinksHtml(s){
  return (s.artists && s.artists.length)
    ? s.artists.map(a => `<a href="#" class="artist-link" onclick="openArtistPage(${a.id});return false;">${esc(a.name)}</a>`).join(', ')
    : esc(s.artist);
}

// Нік автора пісні (таблиця_2) — веде на його публічний профіль.
function submitterLinkHtml(s){
  if(!s.submittedBy) return `<span style="color:var(--muted)">—</span>`;
  return `<a href="#" class="artist-link submitter-link" onclick="openUserProfileOrLogin(${s.submittedBy.userId});return false;"><svg class="icon"><use href="#icon-user"/></svg> ${esc(s.submittedBy.displayName)}</a>`;
}
function ratingChipHtml(s){
  const label = s.avgRating != null ? `${s.avgRating}<small>·${s.ratingCount}</small>` : '—';
  return `<button type="button" class="rating-chip${s.avgRating!=null?' has-rating':''}" onclick="openRatingModal(${s.id})" title="${t('rating.rateBtn')}"><svg class="icon"><use href="#icon-star"/></svg> ${label}</button>`;
}

const ROW_PAUSE_ICON=`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const ROW_PLAY_ICON=`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
// Зміна стану плеєра (play/pause/інша пісня) раніше перебудовувала ВСЮ таблицю
// (сотні рядків через innerHTML) — кілька разів на кожну пісню. Тепер лише
// перемикаємо клас рядка й іконку кнопки в уже намальованих таблицях.
function refreshPlayingState(){
  const curId = playerQueue.length && playerQueue[playerIndex] ? playerQueue[playerIndex].id : null;
  const playing = isPlaying();
  document.querySelectorAll('#songs-body tr[data-id], #top-songs-body tr[data-id]').forEach(tr => {
    const isCur = Number(tr.dataset.id) === curId;
    if(tr.classList.contains('playing-row') !== isCur) tr.classList.toggle('playing-row', isCur);
    const btn = tr.firstElementChild?.firstElementChild;
    if(!btn) return;
    const icon = isCur && playing ? 'pause' : 'play';
    if(btn.dataset.icon === icon && btn.classList.contains('is-playing') === isCur) return;
    btn.innerHTML = icon === 'pause' ? ROW_PAUSE_ICON : ROW_PLAY_ICON;
    btn.dataset.icon = icon;
    btn.classList.toggle('is-playing', isCur);
  });
}

// Пошук у таблиці: перемальовуємо сотні рядків, коли користувач зупинився
// друкувати, а не на кожну клавішу.
let _renderSongsTimer = null;
function debouncedRenderSongs(){
  clearTimeout(_renderSongsTimer);
  _renderSongsTimer = setTimeout(renderSongs, 150);
}

// Швидка фільтрація з самої таблиці: клік по бейджу жанру — той самий фільтр,
// що й список "Усі жанри" (повторний клік знімає); по альбому — окремий фільтр
// (альбомів сотні, тож у випадному списку їм не місце). Обидва — чипами над таблицею.
let albumFilter = '';
function filterByGenre(g){
  const sel = document.getElementById('filter-genre');
  sel.value = sel.value === g ? '' : g;
  renderSongs();
}
function filterByAlbum(a){
  albumFilter = albumFilter === a ? '' : a;
  renderSongs();
}
function clearQuickFilters(){
  document.getElementById('filter-genre').value = '';
  albumFilter = '';
  renderSongs();
}
function _renderActiveFilters(gf){
  const box = document.getElementById('active-filters');
  if(!box) return;
  const chips = [];
  if(gf) chips.push(`<button type="button" class="filter-chip" onclick="filterByGenre(this.dataset.v)" data-v="${esc(gf)}" title="${esc(t('filter.remove'))}"><span class="filter-chip-kind">${esc(t('filter.genre'))}:</span> ${esc(abbrGenre(gf))} <svg class="icon"><use href="#icon-x"/></svg></button>`);
  if(albumFilter) chips.push(`<button type="button" class="filter-chip album" onclick="filterByAlbum(this.dataset.v)" data-v="${esc(albumFilter)}" title="${esc(t('filter.remove'))}"><span class="filter-chip-kind">${esc(t('table.album'))}:</span> ${esc(albumFilter)} <svg class="icon"><use href="#icon-x"/></svg></button>`);
  if(chips.length > 1) chips.push(`<button type="button" class="filter-chip-clear" onclick="clearQuickFilters()">${esc(t('filter.clearAll'))}</button>`);
  box.innerHTML = chips.join('');
  box.hidden = chips.length === 0;
}

function renderSongs(){
  const srch=document.getElementById('search').value.toLowerCase();
  const gf=document.getElementById('filter-genre').value;
  _renderActiveFilters(gf);
  const isCommunity = homeSource === 'community';
  const filtered=activeSongs().filter(s=>{
    const mt=!srch||s.artist.toLowerCase().includes(srch)||s.title.toLowerCase().includes(srch)||(s.album&&s.album.toLowerCase().includes(srch))
      ||(isCommunity&&s.submittedBy&&s.submittedBy.displayName.toLowerCase().includes(srch));
    const mg=!gf||s.genres.includes(gf);
    const ma=!albumFilter||s.album===albumFilter;
    return mt&&mg&&ma;
  });
  const ordered = shuffleActive
    ? [...filtered].sort((a,b)=>(shuffleOrderMap.get(a.id) ?? Infinity) - (shuffleOrderMap.get(b.id) ?? Infinity))
    : sortKey
      ? [...filtered].sort((a,b)=>{
          const va=_sortVal(a,sortKey), vb=_sortVal(b,sortKey);
          if(va<vb) return -1*sortDir;
          if(va>vb) return 1*sortDir;
          return 0;
        })
      : filtered;
  // Черга відтворення слідує за тим, що зараз реально показано в таблиці (сортування/пошук).
  displayedSongs = ordered;
  const tbody=document.getElementById('songs-body');
  if(!ordered.length){
    tbody.innerHTML=`<tr><td colspan="13"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t(isCommunity?'table.communityEmpty':'table.empty')}</div></td></tr>`;
    return;
  }
  const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
  tbody.innerHTML=ordered.map((s,i)=>{
    const isPlay=s.id===curId;
    const btnIcon=isPlay&&isPlaying()?ROW_PAUSE_ICON:ROW_PLAY_ICON;
    return `<tr data-id="${s.id}" class="${isPlay?'playing-row':''}">
      <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
        <button class="play-row-btn${isPlay?' is-playing':''}" data-icon="${btnIcon===ROW_PAUSE_ICON?'pause':'play'}" onclick="toggleOrPlay(${s.id}, playSong)">${btnIcon}</button>
      </td>
      <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
      <td class="td-artist" data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
      <td class="td-title" data-label="${t('table.title')}">${esc(s.title)}</td>
      <td class="duration-col td-release" data-label="${t('table.release')}">${fmtDate(s.release)}</td>
      <td class="duration-col td-duration" data-label="${t('table.duration')}">${s.duration}</td>
      <td class="td-genres" data-label="${t('table.genres')}">${s.genres.map(g=>`<button type="button" class="badge badge-filter${g===gf?' active':''}" data-v="${esc(g)}" onclick="filterByGenre(this.dataset.v)" title="${esc(t('filter.byGenre'))}">${esc(abbrGenre(g))}</button>`).join('')}</td>
      <td class="td-album" data-label="${t('table.album')}">${s.album?`<button type="button" class="badge album badge-filter${s.album===albumFilter?' active':''}" data-v="${esc(s.album)}" onclick="filterByAlbum(this.dataset.v)" title="${esc(t('filter.byAlbum'))}">${esc(s.album)}</button>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
      <td class="duration-col td-plays" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      <td class="duration-col td-rating" data-label="${t('table.rating')}">${ratingChipHtml(s)}</td>
      ${isCommunity?`<td class="td-submitter" data-label="${t('table.submittedBy')}">${submitterLinkHtml(s)}</td>`:''}
      ${currentUser?.authenticated?`<td class="td-icon-trail" data-label=""><div style="display:flex;gap:6px;"><button class="btn-icon-fav${favoriteIds.has(s.id)?' active':''}" aria-label="${t('profile.favToggle')}" title="${t('profile.favToggle')}" onclick="toggleFavorite(${s.id}, this)"><svg viewBox="0 0 24 24" fill="${favoriteIds.has(s.id)?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button><button class="btn-icon-fav" aria-label="${t('profile.addToPlaylist')}" title="${t('profile.addToPlaylist')}" onclick="openAddToPlaylistModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div></td>`:''}
      ${currentUser?.isAdmin?`<td class="td-actions" data-label="${t('table.action')}"><div style="display:flex;gap:6px;"><button class="btn-icon-edit" aria-label="${t('admin.editBtn')}" title="${t('admin.editBtn')}" onclick="openEditSongModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></button><button class="btn-icon-danger" aria-label="${t('modal.confirmDelete')}" title="${t('modal.confirmDelete')}" onclick="confirmDeleteSong(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg></button></div></td>`:''}
    </tr>`;
  }).join('');
}

function isPlaying(){
  if(playerMode==='file') return !fileAudio.paused && !fileAudio.ended;
  try{return ytPlayer&&ytReady&&ytPlayer.getPlayerState()===YT.PlayerState.PLAYING;}catch(e){return false;}
}
