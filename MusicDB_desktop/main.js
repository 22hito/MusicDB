const { app, BrowserWindow, globalShortcut, Menu, shell, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const SITE_URL = 'https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/';

// ================================================================
// АВТООНОВЛЕННЯ (electron-updater, через GitHub Releases)
// ================================================================
// Не форсуємо оновлення одразу — тихо завантажуємо у фоні (стандартна
// поведінка autoDownload) і застосовуємо, коли користувач сам закриє
// застосунок наступного разу (autoInstallOnAppQuit — теж стандартна
// поведінка), як і просив користувач. Кнопка "Перезапустити зараз" — лише
// зручність, не обов'язкова дія.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function initAutoUpdater() {
  // У неспакованому вигляді (npm start під час розробки) electron-updater
  // не має де шукати релізи й тільки шумить помилками в консоль — сенсу
  // перевіряти нема, оновлюються лише встановлені (packaged) копії.
  if (!app.isPackaged) return;

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: "N'Owl — оновлення завантажено",
      message: `Доступна нова версія застосунку (${info.version}).`,
      detail: 'Вона встановиться автоматично, коли ви наступного разу закриєте застосунок. Можна перезапустити зараз, щоб оновити одразу.',
      buttons: ['Перезапустити зараз', 'Пізніше'],
      defaultId: 1,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('autoUpdater error:', err);
  });

  const checkForUpdates = () => autoUpdater.checkForUpdates().catch((err) => {
    console.error('checkForUpdates failed:', err);
  });

  // Перша перевірка — трохи згодом після старту, щоб не заважати вже
  // й так навантаженому мережею запуску (логін, завантаження пісень).
  // Далі — раз на 4 години, щоб ловити реліз, який вийшов, поки застосунок
  // уже відкритий і працює (саме так, як просив користувач), а не тільки
  // при наступному холодному запуску.
  setTimeout(checkForUpdates, 15_000);
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
}

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
      // Прапорець "це десктопний застосунок" (localStorage.isDesktopApp) —
      // тут, а не на dom-ready, бо preload виконується ДО коду сторінки на
      // кожній навігації, тож встигає ще до того, як навбар перевірить його,
      // включно з найпершим холодним запуском.
      preload: path.join(__dirname, 'preload.js'),
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
  });

  mainWindow.loadURL(SITE_URL);

  // Посилання, що мають відкриватись у новому вікні (напр. "Переглянути на
  // YouTube" з адмінського редактора), відкриваємо в системному браузері —
  // застосунок не повинен перетворюватись на повноцінний веб-браузер.
  // Document Picture-in-Picture (попап "перенести в окреме вікно" на сайті)
  // теж проходить через цей самий handler з url="about:blank" — без перевірки
  // http(s) shell.openExternal валилася на порожньому/не-http url і забирала
  // з собою увесь процес, тож pop-out у застосунку не працював узагалі.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (popoutWindow && !popoutWindow.isDestroyed()) popoutWindow.close();
  });
}

// ================================================================
// ВІДЕО "В ОКРЕМЕ ВІКНО": справжнє нативне BrowserWindow ОС
// ================================================================
// Document Picture-in-Picture (веб-API, який використовує сайт у звичайному
// браузері) в Electron 32 не є надійним — requestWindow або не створює
// вікно, або сама спроба валить процес. Нативне вікно Electron натомість
// перетягується на будь-який монітор і змінюється в розмірі за краї так
// само, як будь-яке інше вікно ОС, — саме цього і треба.
let popoutWindow = null;

// Перша версія рендерила сирий <iframe src="youtube.com/embed/..."> всередині
// data:-документа — YouTube відповідав помилкою 153 ("Помилка конфігурації
// відеопрогравача"), бо в data:-документа "null" origin, який офіційний
// плеєр YouTube відхиляє. Замість власної мінімальної реалізації плеєра
// вікно тепер відкриває справжню сторінку НАШОГО домену (wwwroot/popout.html),
// яка використовує офіційний IFrame Player API — той самий механізм, що вже
// надійно працює в основному плеєрі й попапі на сайті.
function buildPopoutUrl(videoId, startSeconds) {
  const t = Math.max(0, Math.floor(Number(startSeconds) || 0));
  return `${SITE_URL}popout.html?v=${encodeURIComponent(videoId)}&t=${t}`;
}

ipcMain.handle('video-popout:open', (_event, videoId, startSeconds) => {
  if (!videoId) return false;

  // Звук у головному вікні йде з ЙОГО ytPlayer (попап на сайті сам по собі
  // завжди німий) — без паузи тут звучало б одразу з двох вікон, коли нове
  // вікно отримує власний, повноцінний, озвучений плеєр.
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(
      'try { if (typeof ytPlayer !== "undefined" && ytPlayer && ytReady) ytPlayer.pauseVideo(); } catch(e) {}'
    ).catch(() => {});
  }

  if (popoutWindow && !popoutWindow.isDestroyed()) {
    popoutWindow.loadURL(buildPopoutUrl(videoId, startSeconds));
    popoutWindow.focus();
    return true;
  }
  popoutWindow = new BrowserWindow({
    width: 480,
    height: 320,
    minWidth: 240,
    minHeight: 160,
    title: "N'Owl",
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  popoutWindow.setMenuBarVisibility(false);
  popoutWindow.loadURL(buildPopoutUrl(videoId, startSeconds));
  popoutWindow.on('closed', () => {
    popoutWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('video-popout:closed');
  });
  return true;
});

ipcMain.handle('video-popout:close', () => {
  if (popoutWindow && !popoutWindow.isDestroyed()) popoutWindow.close();
  return true;
});

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
  initAutoUpdater();

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
