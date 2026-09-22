// Мінімальний service worker — лише для встановлюваності (PWA-критерії
// Chrome вимагають зареєстрований SW із fetch-хендлером). Даних НЕ кешує:
// сайт живе оновленнями в реальному часі (SignalR, прослуховування,
// сповіщення), тож офлайн-кеш тут дав би застарілі дані замість користі.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  // ЛИШЕ свій origin. fetch(), викликаний ЗСЕРЕДИНИ SW (як тут, у
  // respondWith), підпадає під CSP connect-src, а не під img-src/style-src/
  // script-src — тож крос-доменні ресурси (шрифти Google, мініатюри YouTube,
  // signalr з jsdelivr), явно дозволені в img-src/style-src/script-src,
  // однаково блокувались би вужчим connect-src, щойно SW їх перехоплював.
  // Це й ламало відтворення музики та підвантаження шрифтів для будь-кого,
  // чий SW уже встиг захопити контроль над сторінкою.
  if (new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(fetch(event.request));
  }
});
