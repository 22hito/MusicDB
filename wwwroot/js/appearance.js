// Вигляд: тема, колір обкладинки в інтерфейсі, сторінка налаштувань (PREFS).

// ================================================================
// THEME (світла/темна)
// ================================================================
const THEME_ICONS = { dark: 'moon', gray: 'contrast', light: 'sun', system: 'monitor' };
// "Системна" — не окрема палітра, а вибір світлої/темної за налаштуванням ОС.
const _systemLightMq = window.matchMedia('(prefers-color-scheme: light)');
function _resolveTheme(theme){ return theme === 'system' ? (_systemLightMq.matches ? 'light' : 'dark') : theme; }
_systemLightMq.addEventListener?.('change', () => { if(localStorage.getItem('theme') === 'system') selectTheme('system'); });
function applyTheme(theme){
  const resolved = _resolveTheme(theme);
  // Тимчасово вимикаємо всі hover-transition, щоб зміна теми клацала миттєво.
  document.documentElement.classList.add('theme-switching');
  document.documentElement.setAttribute('data-theme', resolved);
  localStorage.setItem('theme', theme);
  // Колір рядка стану браузера/PWA — під фон активної теми, а не завжди чорний.
  // Hex, а не значення --bg: воно в oklch(), який meta theme-color розуміють не всі браузери.
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta) themeMeta.setAttribute('content', THEME_META_COLORS[resolved] || THEME_META_COLORS.dark);
  _paintArtworkColor();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-switching');
  }));
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if(icon) icon.innerHTML = `<svg class="icon"><use href="#icon-${THEME_ICONS[theme] || THEME_ICONS.dark}"/></svg>`;
  if(label){ label.setAttribute('data-i18n', 'theme.' + theme); label.textContent = t('theme.' + theme); }
  document.querySelectorAll('#theme-dropdown [data-theme-option]').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-theme-option') === theme);
  });
  syncSettingsUI();
}
const THEME_META_COLORS = { dark: '#090c14', gray: '#474c56', light: '#f8f4ec' };
// Остання точка натискання — з неї "розкривається" нова тема колом.
let _lastPointer = null;
document.addEventListener('pointerdown', e => { _lastPointer = { x: e.clientX, y: e.clientY }; }, true);
function selectTheme(theme){
  if(!document.startViewTransition || _reducedMotion() || _resolveTheme(theme) === document.documentElement.getAttribute('data-theme')){
    applyTheme(theme);
    return;
  }
  const { x, y } = _lastPointer || { x: window.innerWidth - 120, y: 28 };
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  document.documentElement.classList.add('theme-vt');
  const vt = document.startViewTransition(() => applyTheme(theme));
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(()=>{});
  vt.finished.finally(() => document.documentElement.classList.remove('theme-vt'));
}

// ================================================================
// КОЛІР ОБКЛАДИНКИ → інтерфейс (як Apple Music / Spotify)
// Беремо домінантний "живий" відтінок мініатюри YouTube (i.ytimg.com
// віддає Access-Control-Allow-Origin: *, тож canvas не "брудниться") і
// підфарбовуємо ним сяйво сторінки, плеєр і рядок, що грає. Зберігаємо
// лише відтінок (hue), а яскравість/насиченість бере тема — інакше на
// світлій темі колір з темної обкладинки був би нечитабельним.
// ================================================================
let _artHue = null;   // [основний, другий, третій] відтінки палітри обкладинки
let _lastArtVid = null;
function _rgbToOklchHue(r, g, b){
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B);
  const m = Math.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B);
  const s = Math.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B);
  const A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s;
  const Bb = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s;
  return { hue: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360, chroma: Math.hypot(A, Bb) };
}
function _paintArtworkColor(){
  const root = document.documentElement;
  if(_artHue == null || !PREFS.artColors){
    ['--art', '--art2', '--art3'].forEach(p => root.style.removeProperty(p));
    return;
  }
  const theme = root.getAttribute('data-theme');
  const lc = theme === 'light' ? '0.58 0.15' : theme === 'gray' ? '0.86 0.11' : '0.76 0.14';
  root.style.setProperty('--art', `oklch(${lc} ${_artHue[0].toFixed(1)})`);
  root.style.setProperty('--art2', `oklch(${lc} ${_artHue[1].toFixed(1)})`);
  root.style.setProperty('--art3', `oklch(${lc} ${_artHue[2].toFixed(1)})`);
}
function _applyArtworkColor(vid){
  _lastArtVid = vid || null;
  if(!vid){ _artHue = null; _paintArtworkColor(); return; }
  const im = new Image();
  im.crossOrigin = 'anonymous';
  im.onload = () => {
    try{
      const c = document.createElement('canvas'); c.width = 32; c.height = 18;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, 32, 18);
      const px = g.getImageData(0, 0, 32, 18).data;
      // 24 кошики відтінку, вага = насиченість × "не надто темний/світлий".
      const bins = new Array(24).fill(0), hueSum = new Array(24).fill(0);
      for(let i = 0; i < px.length; i += 4){
        const { hue, chroma } = _rgbToOklchHue(px[i], px[i+1], px[i+2]);
        const lum = (px[i]*0.299 + px[i+1]*0.587 + px[i+2]*0.114) / 255;
        const w = chroma * Math.max(0, 1 - Math.abs(lum - 0.55) * 1.6);
        const b = Math.floor(hue / 15) % 24;
        bins[b] += w; hueSum[b] += hue * w;
      }
      // Палітра з трьох кольорів: найсильніший кошик + наступні, що відстоять
      // від уже вибраних щонайменше на 45° (інакше це "той самий" колір).
      // Бракує контрастних відтінків — добудовуємо аналогічні (±40°).
      const order = bins.map((w, i) => i).sort((a, b) => bins[b] - bins[a]);
      const picked = [];
      for(const b of order){
        if(bins[b] < bins[order[0]] * 0.18) break;
        const h = hueSum[b] / bins[b];
        if(picked.every(p => Math.min(Math.abs(p - h), 360 - Math.abs(p - h)) >= 45)) picked.push(h);
        if(picked.length === 3) break;
      }
      // Майже монохромна обкладинка — лишаємо фірмовий акцент.
      if(!picked.length || bins[order[0]] <= 1.2){ _artHue = null; }
      else {
        const h0 = picked[0];
        _artHue = [h0, picked[1] ?? (h0 + 40) % 360, picked[2] ?? (h0 + 320) % 360];
      }
    }catch(e){ _artHue = null; }
    _paintArtworkColor();
  };
  im.onerror = () => { _artHue = null; _paintArtworkColor(); };
  im.src = 'https://i.ytimg.com/vi/' + encodeURIComponent(vid) + '/mqdefault.jpg';
}

// ================================================================
// НАЛАШТУВАННЯ ІНТЕРФЕЙСУ (сторінка page-settings)
// Зберігаються одним JSON у localStorage('prefs') — лише цей пристрій.
// Перше застосування (до відмальовки) робить inline-скрипт у <head>,
// тут — повторне застосування + синхронізація контролів сторінки.
// Тема й мова лишаються в окремих ключах 'theme'/'lang' (як і раніше).
// ================================================================
const PREF_DEFAULTS = {
  motion: 'system', artColors: true, glowFollow: true, glow: 100,
  accent: 'amber', uiScale: 100, autoScale: true, density: 'comfortable', highContrast: false, playerKeys: true,
};
const ACCENT_HUES = { amber: 78, coral: 38, rose: 5, lavender: 295, ocean: 235, emerald: 158 };
let PREFS = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('prefs') || '{}');
    // Міграція: "Розмір тексту" (fontScale) став "Розміром інтерфейсу" (uiScale).
    if(saved.fontScale != null && saved.uiScale == null) saved.uiScale = saved.fontScale;
    delete saved.fontScale;
    return { ...PREF_DEFAULTS, ...saved };
  }
  catch(e){ return { ...PREF_DEFAULTS }; }
})();
function _reducedMotion(){
  if(PREFS.motion === 'reduced') return true;
  if(PREFS.motion === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function applyPrefs(){
  const root = document.documentElement;
  const setAttr = (name, val) => val == null ? root.removeAttribute(name) : root.setAttribute(name, val);
  setAttr('data-motion', PREFS.motion === 'system' ? null : PREFS.motion);
  setAttr('data-density', PREFS.density === 'compact' ? 'compact' : null);
  setAttr('data-contrast', PREFS.highContrast ? 'high' : null);
  setAttr('data-glow-follow', PREFS.glowFollow ? '' : null);
  if(PREFS.uiScale !== 100) root.style.setProperty('--ui-scale', PREFS.uiScale / 100);
  else root.style.removeProperty('--ui-scale');
  setAttr('data-auto-scale', PREFS.autoScale ? null : 'off');
  root.style.setProperty('--ah', ACCENT_HUES[PREFS.accent] ?? ACCENT_HUES.amber);
  root.style.setProperty('--glow-k', PREFS.glow / 100);
  _paintArtworkColor();
}
function setPref(key, value){
  if(key === 'theme'){ selectTheme(value); return; }
  if(key === 'lang'){ selectLang(value); return; }
  PREFS[key] = value;
  try { localStorage.setItem('prefs', JSON.stringify(PREFS)); } catch(e){}
  applyPrefs();
  syncSettingsUI();
}
function resetPrefs(){
  PREFS = { ...PREF_DEFAULTS };
  try { localStorage.removeItem('prefs'); } catch(e){}
  applyPrefs();
  syncSettingsUI();
}
function syncSettingsUI(){
  const page = document.getElementById('page-settings');
  if(!page) return;
  const values = { ...PREFS, theme: localStorage.getItem('theme') || 'dark', lang: currentLang };
  page.querySelectorAll('[data-pref]').forEach(el => {
    const key = el.getAttribute('data-pref');
    const val = values[key];
    if(el.type === 'checkbox') el.checked = !!val;
    else if(el.type === 'range'){
      el.value = val;
      el.style.setProperty('--fill', ((val - el.min) / (el.max - el.min) * 100) + '%');
      const out = document.getElementById('pref-' + key + '-out');
      if(out) out.textContent = val + '%';
    } else {
      el.querySelectorAll('[data-value]').forEach(b => {
        const on = String(val) === b.getAttribute('data-value');
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
  });
}
function loadSettingsPage(){
  document.getElementById('app-version').textContent = appVersion ? `N'Owl ${appVersion}` : '';
  const link = document.getElementById('settings-profile-link');
  if(link) link.style.display = currentUser?.authenticated ? '' : 'none';
  syncSettingsUI();
}
// Делегування: один обробник на всю сторінку замість onclick на кожному контролі.
(() => {
  const page = document.getElementById('page-settings');
  if(!page) return;
  page.addEventListener('click', e => {
    const btn = e.target.closest('[data-pref] [data-value]');
    if(!btn) return;
    const key = btn.closest('[data-pref]').getAttribute('data-pref');
    const raw = btn.getAttribute('data-value');
    setPref(key, /^\d+$/.test(raw) ? parseInt(raw, 10) : raw);
  });
  page.addEventListener('change', e => {
    const el = e.target;
    if(el.type === 'checkbox' && el.dataset.pref) setPref(el.dataset.pref, el.checked);
  });
  page.addEventListener('input', e => {
    const el = e.target;
    if(el.type === 'range' && el.dataset.pref) setPref(el.dataset.pref, parseInt(el.value, 10));
  });
})();
applyPrefs();

// Клавіші плеєра: пробіл — пауза, Shift+←/→ — попередня/наступна, M — звук.
let _volBeforeMute = null;
document.addEventListener('keydown', e => {
  if(!PREFS.playerKeys || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if(tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if(!document.getElementById('player-bar')?.classList.contains('visible')) return;
  // Відкрите модальне вікно (батл тощо) має власні клавіші — не заважаємо.
  if(document.querySelector('.modal-overlay.open')) return;
  if(e.code === 'Space' && tag !== 'button' && tag !== 'a'){ e.preventDefault(); playerToggle(); }
  else if(e.shiftKey && e.key === 'ArrowRight'){ e.preventDefault(); playerNext(); }
  else if(e.shiftKey && e.key === 'ArrowLeft'){ e.preventDefault(); playerPrev(); }
  else if(!e.shiftKey && (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')){
    e.preventDefault();
    if(vol > 0){ _volBeforeMute = vol; setVolume(0); }
    else setVolume(_volBeforeMute || 80);
    const slider = document.getElementById('vol-slider');
    if(slider) slider.value = vol;
  }
});

// "/" або Ctrl/⌘+K — фокус на глобальний пошук (як у GitHub/Linear).
document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
  const isK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK');
  if(isK || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey)){
    const input = document.getElementById('nav-search-input');
    if(!input) return;
    e.preventDefault();
    input.focus();
    input.select();
  }
});
function fmtDate(d){const[y,m,day]=d.split('-');return`${day}.${m}.${y}`;}
function fmtSec(s){s=Math.floor(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
