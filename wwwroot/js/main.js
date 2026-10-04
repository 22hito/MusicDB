// Запуск застосунку — ОСТАННІМ, коли вже завантажені всі модулі.

// INIT
// Жорсткий запобіжник: якщо initApp() з якоїсь причини впаде/зависне,
// сплеш все одно ховається за 8с — інакше застряглий сплеш виглядав би
// як повністю непрацюючий сайт, що набагато гірше за втрачений момент polish.
setTimeout(_hideSplash, 8000);
// iframe_api (у <head>) з кешу браузера часто готовий РАНІШЕ, ніж завантажиться
// й виконаються скрипти js/*.js — тоді він уже викликав
// window.onYouTubeIframeAPIReady, коли її ще не існувало, і більше не викличе:
// без прапорця готовності плеєр не створився б при першому відтворенні. Доганяємо вручну.
if (window.YT && window.YT.Player && !ytPlayer) onYouTubeIframeAPIReady();
initApp().catch(err => { console.error('initApp error:', err); _hideSplash(); })
  // Плеєр YouTube — коли сайт уже намальовано й браузер вільний (див. _warmYtPlayer у js/player.js).
  // timeout — без нього анімації сторінки могли відкладати «вільну хвилину» скільки завгодно.
  .finally(() => setTimeout(() => (window.requestIdleCallback || (cb => cb()))(_warmYtPlayer, { timeout: 3000 }), 1000));
applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
applyLang(currentLang);
document.getElementById('vol-slider').value = vol;
document.getElementById('vw1').style.display = vol===0?'none':'';
document.getElementById('vw2').style.display = vol<50?'none':'';
_updatePopoutBtnVisibility();
