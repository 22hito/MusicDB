// Виконується ДО будь-якого коду самої сторінки, на кожній навігації —
// сайт ховає посилання "Завантажити застосунок" у навбарі, коли бачить цей
// прапорець, але лише якщо він встигає з'явитись ДО того, як інлайн-скрипт
// у навбарі його перевірить (той скрипт виконується під час парсингу HTML,
// тобто ДО події dom-ready — прапорець, виставлений тільки на dom-ready,
// запізнювався саме на першому холодному запуску застосунку).
try { localStorage.setItem('isDesktopApp', '1'); } catch (e) {}

// Справжнє нативне вікно ОС для "перенести відео в окреме вікно" — на
// відміну від сайту, тут НЕ покладаємось на Document Picture-in-Picture API
// (Electron 32 підтримує його ненадійно: requestWindow або мовчки не
// створює вікно, або сама спроба валила ввесь процес через баг у
// setWindowOpenHandler головного процесу). Нативне BrowserWindow-вікно
// перетягується на будь-який монітор і змінює розмір за краї так само, як
// будь-яке інше вікно ОС — саме цього просив користувач.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  openVideoPopout: (videoId, startSeconds) => ipcRenderer.invoke('video-popout:open', videoId, startSeconds),
  closeVideoPopout: () => ipcRenderer.invoke('video-popout:close'),
  onVideoPopoutClosed: (cb) => ipcRenderer.on('video-popout:closed', () => cb()),
});
