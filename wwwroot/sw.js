// Мінімальний service worker — лише для встановлюваності (PWA-критерії
// Chrome вимагають зареєстрований SW із fetch-хендлером). Даних НЕ кешує:
// сайт живе оновленнями в реальному часі (SignalR, прослуховування,
// сповіщення), тож офлайн-кеш тут дав би застарілі дані замість користі.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
