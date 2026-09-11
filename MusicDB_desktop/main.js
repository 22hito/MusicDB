const { app, BrowserWindow, globalShortcut, Menu, shell } = require('electron');
const path = require('path');

const SITE_URL = 'https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net/';

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
