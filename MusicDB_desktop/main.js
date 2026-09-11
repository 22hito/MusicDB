const { app, BrowserWindow, globalShortcut, Menu, shell } = require('electron');
const path = require('path');

const SITE_URL = 'https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/';

// Google-логін у цьому вікні виглядає для Google як "новий пристрій" (окрема
// сесія/куки від звичайного браузера), тож він вимагає найсильнішу з
// доступних перевірок — ключ безпеки/Windows Hello (WebAuthn), що спливає як
// нативне вікно "Windows Security". Electron не завжди коректно завершує цей
// цикл при скасуванні, тож вікно вилазить знову й знову. Прибираємо ознаки
// підтримки WebAuthn зі сторінки — Google бачить, що це "не підтримується",
// і сам переходить до звичайного способу входу (пароль/код на телефон/резервні коди).
const DISABLE_WEBAUTHN_JS = `(function(){
  try {
    if (window.PublicKeyCredential) {
      Object.defineProperty(window, 'PublicKeyCredential', { get: () => undefined, configurable: true });
    }
    if (navigator.credentials) {
      navigator.credentials.get = function(){ return Promise.reject(new DOMException('WebAuthn unavailable', 'NotAllowedError')); };
      navigator.credentials.create = function(){ return Promise.reject(new DOMException('WebAuthn unavailable', 'NotAllowedError')); };
    }
  } catch(e) {}
})();`;

// Сайт ховає посилання "Завантажити застосунок" у навбарі, коли бачить цей
// прапорець — незручно пропонувати встановити застосунок людині, яка вже в
// ньому сидить. localStorage (а не querystring) — переживає повноекранні
// навігації логіну через accounts.google.com і назад.
const MARK_DESKTOP_APP_JS = `try { localStorage.setItem('isDesktopApp', '1'); } catch(e) {}`;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 480,
    minHeight: 480,
    title: "N'Owl",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0d0d0f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Google блокує OAuth-логін, якщо в User-Agent видно "Electron/x.x.x"
  // (позначка "вбудований webview") — прибираємо цей токен, лишаючи
  // звичайний Chrome UA, інакше вхід через Google впаде з
  // "This browser or app may not be secure".
  const ua = mainWindow.webContents.getUserAgent().replace(/\s*Electron\/\S+/, '');
  mainWindow.webContents.setUserAgent(ua);

  // Google-логін проходить через кілька навігацій (accounts.google.com і
  // назад на сайт) — виконуємо на КОЖНІЙ, а не лише один раз при завантаженні.
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(DISABLE_WEBAUTHN_JS).catch(() => {});
    mainWindow.webContents.executeJavaScript(MARK_DESKTOP_APP_JS).catch(() => {});
  });

  mainWindow.loadURL(SITE_URL);

  // Посилання, що мають відкриватись у новому вікні (напр. "Переглянути на
  // YouTube" з адмінського редактора), відкриваємо в системному браузері —
  // застосунок не повинен перетворюватись на повноцінний веб-браузер.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Виконує JS у вже завантаженій сторінці. Функції плеєра (playerNext,
// playerPrev, playerToggle, playerClose) — звичайні function-декларації в
// топрівневому інлайн-скрипті сайту, тож вони автоматично доступні як
// window.playerNext і т.д. — той самий код, що й на сайті, без жодних змін
// на боці бекенду/фронтенду.
function runInPage(js) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(js).catch(() => {});
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  // Апаратні клавіші відтворення (наступна/попередня/пауза) на клавіатурі чи
  // навушниках — те, що НЕМОЖЛИВО надійно перехопити зі звичайної вкладки
  // браузера через Chromium-специфічне обмеження Media Session API для
  // YouTube-based відтворення (навіть на youtube.com next/prev не долітають
  // без розширення браузера). У Electron, на відміну від сайту, дозволено
  // реєструвати справжні глобальні хоткеї на рівні ОС — працює навіть коли
  // застосунок згорнутий і у фокусі, наприклад, гра.
  globalShortcut.register('MediaNextTrack', () => runInPage('window.playerNext && window.playerNext();'));
  globalShortcut.register('MediaPreviousTrack', () => runInPage('window.playerPrev && window.playerPrev();'));
  globalShortcut.register('MediaPlayPause', () => runInPage('window.playerToggle && window.playerToggle();'));
  globalShortcut.register('MediaStop', () => runInPage('window.playerClose && window.playerClose();'));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
