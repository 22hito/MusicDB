/**
 * N'Owl для Windows — головний процес.
 *
 * Інтерфейс вбудований у застосунок і відкривається з власного протоколу app://nowl (не сайт у вікні).
 * Запити інтерфейсу до /v1/* головний процес пересилає на API (nowl.pp.ua) зі своєю сесією: cookie входу
 * зберігаються в профілі застосунку. Плюс те, чого немає в браузері: трей, кнопки на панелі завдань,
 * згортання в трей зі звуком, посилання nowl://, автооновлення з релізів GitHub.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  Notification,
  nativeImage,
  nativeTheme,
  net,
  protocol,
  session,
  shell,
  Tray,
} from "electron";
import { autoUpdater } from "electron-updater";
import { type PlayerState, registerIpc } from "./ipc";

const API = (process.env.NOWL_API ?? "https://nowl.pp.ua").replace(/\/$/, "");
const APP_ORIGIN = "app://nowl";
const RENDERER = join(__dirname, "renderer");
const ASSETS = app.isPackaged
  ? join(process.resourcesPath, "app.asar", "assets")
  : join(__dirname, "..", "assets");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);
app.setAppUserModelId("com.nowl.desktop");
if (!app.requestSingleInstanceLock()) app.quit();
app.setAsDefaultProtocolClient("nowl");

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let state: PlayerState = { playing: false, title: null, artist: null, hasTrack: false };

// ─── Протокол app:// : статика інтерфейсу + пересилання API ─────────────────────────────────

const HOP = new Set(["host", "origin", "referer", "connection", "content-length", "cookie"]);

/** Куди веде перенаправлення (net.fetch з redirect: "manual" не показує адресу). */
function redirectTarget(target: string): Promise<{ status: number; location: string } | null> {
  return new Promise((resolve) => {
    const r = net.request({ url: target, redirect: "manual", useSessionCookies: true });
    r.on("redirect", (status, _method, location) => {
      resolve({ status, location });
      r.abort();
    });
    r.on("response", () => resolve(null));
    r.on("error", () => resolve(null));
    r.end();
  });
}

async function proxy(req: Request, url: URL): Promise<Response> {
  // Картинки з нашого сховища: API відповідає перенаправленням на підписане посилання — віддаємо його браузеру.
  if (req.method === "GET" && url.pathname.startsWith("/v1/media/")) {
    const to = await redirectTarget(`${API}${url.pathname}${url.search}`);
    if (to) return new Response(null, { status: 302, headers: { location: to.location } });
  }
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!HOP.has(k.toLowerCase())) headers.set(k, v);
  });
  // better-auth перевіряє Origin; для API ми — сайт.
  headers.set("origin", API);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const res = await net.fetch(`${API}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    ...(hasBody ? { body: await req.arrayBuffer() } : {}),
    credentials: "include",
  });
  return res;
}

function serveStatic(url: URL): Promise<Response> {
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = normalize(join(RENDERER, rel));
  // Поза текою інтерфейсу — ні; невідомий шлях — index.html (маршрути інтерфейсу).
  const target = file.startsWith(RENDERER) && rel && existsSync(file) ? file : join(RENDERER, "index.html");
  return net.fetch(pathToFileURL(target).toString());
}

function registerProtocol() {
  protocol.handle("app", (req) => {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/v1/")) return proxy(req, url);
    return serveStatic(url);
  });
}

/** YouTube-плеєр хоче справжнього джерела, а сховище аудіо — дозволу CORS для app://nowl. */
function patchNetwork() {
  const ses = session.defaultSession;
  ses.webRequest.onBeforeSendHeaders(
    {
      urls: [
        "*://*.youtube.com/*",
        "*://*.youtube-nocookie.com/*",
        "*://*.googlevideo.com/*",
        "*://*.ytimg.com/*",
      ],
    },
    (details, cb) => {
      details.requestHeaders.Referer = `${API}/`;
      cb({ requestHeaders: details.requestHeaders });
    },
  );
  ses.webRequest.onHeadersReceived({ urls: ["https://*/*"] }, (details, cb) => {
    const h = details.responseHeaders ?? {};
    const fromApp = details.webContentsId === win?.webContents.id;
    const hasAcao = Object.keys(h).some((k) => k.toLowerCase() === "access-control-allow-origin");
    if (fromApp && !hasAcao && ["xmlhttprequest", "media", "image"].includes(details.resourceType)) {
      h["Access-Control-Allow-Origin"] = [APP_ORIGIN];
    }
    cb({ responseHeaders: h });
  });
}

// ─── Вікно ─────────────────────────────────────────────────────────────────────────────────

type Bounds = { x?: number; y?: number; width: number; height: number; maximized?: boolean };
const boundsFile = () => join(app.getPath("userData"), "window.json");
function loadBounds(): Bounds {
  try {
    return JSON.parse(readFileSync(boundsFile(), "utf8")) as Bounds;
  } catch {
    return { width: 1360, height: 860 };
  }
}
function saveBounds() {
  if (!win) return;
  const b = win.getNormalBounds();
  try {
    writeFileSync(boundsFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch {}
}

function icon(name: string) {
  return nativeImage.createFromPath(join(ASSETS, name));
}

function createWindow(path = "/") {
  const b = loadBounds();
  nativeTheme.themeSource = "dark";
  win = new BrowserWindow({
    ...b,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "N'Owl",
    icon: icon("icon.png"),
    backgroundColor: "#090c14",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#00000000", symbolColor: "#c9cbd6", height: 40 },
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  if (b.maximized) win.maximize();
  win.once("ready-to-show", () => win?.show());
  win.loadURL(`${APP_ORIGIN}${path}`);

  // Зовнішні посилання — у браузері; вхід через Google — у цьому ж вікні (cookie лягають у сесію застосунку).
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (url.startsWith(APP_ORIGIN) || isAuthFlow(url)) return;
    e.preventDefault();
    void shell.openExternal(url);
  });
  // Після входу через Google API повертає на сайт — показуємо ту саму сторінку в застосунку.
  win.webContents.on("did-navigate", (_e, url) => {
    if (url.startsWith(`${API}/`) && !url.startsWith(`${API}/v1/`)) {
      const u = new URL(url);
      win?.loadURL(`${APP_ORIGIN}${u.pathname}${u.search}`);
    }
  });

  win.on("close", (e) => {
    saveBounds();
    if (quitting) return;
    // Закриття вікна — у трей, музика грає далі.
    e.preventDefault();
    win?.hide();
    if (state.playing) notifyOnce();
  });
  win.on("page-title-updated", (e) => e.preventDefault());
  updateWindowChrome();
}

let notified = false;
function notifyOnce() {
  if (notified || !Notification.isSupported()) return;
  notified = true;
  new Notification({
    title: "N'Owl грає далі",
    body: "Застосунок у треї — клацніть значок, щоб відкрити.",
    icon: icon("icon.png"),
  }).show();
}

function isAuthFlow(url: string) {
  return (
    url.startsWith(`${API}/v1/auth/`) ||
    url.startsWith("https://accounts.google.com/") ||
    url.startsWith("https://accounts.youtube.com/")
  );
}

function show(path?: string) {
  if (!win) return createWindow(path);
  if (path) win.loadURL(`${APP_ORIGIN}${path}`);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ─── Плеєр: трей, кнопки на панелі завдань, заголовок ──────────────────────────────────────

function command(cmd: "toggle" | "next" | "prev") {
  win?.webContents.send("player:command", cmd);
}

function trayMenu(): MenuItemConstructorOptions[] {
  const now = state.title ? `${state.title}${state.artist ? ` — ${state.artist}` : ""}` : "Нічого не грає";
  return [
    { label: now.length > 60 ? `${now.slice(0, 57)}…` : now, enabled: false },
    { type: "separator" },
    {
      label: state.playing ? "Пауза" : "Відтворити",
      enabled: state.hasTrack,
      click: () => command("toggle"),
    },
    { label: "Наступна", enabled: state.hasTrack, click: () => command("next") },
    { label: "Попередня", enabled: state.hasTrack, click: () => command("prev") },
    { type: "separator" },
    { label: "Відкрити N'Owl", click: () => show() },
    {
      label: "Вийти",
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ];
}

function updateWindowChrome() {
  tray?.setContextMenu(Menu.buildFromTemplate(trayMenu()));
  tray?.setToolTip(state.title ? `${state.title} — ${state.artist ?? ""}` : "N'Owl");
  if (!win) return;
  win.setTitle(state.title ? `${state.title} — ${state.artist ?? ""} · N'Owl` : "N'Owl");
  if (process.platform === "win32") {
    win.setThumbarButtons(
      state.hasTrack
        ? [
            { tooltip: "Попередня", icon: icon("prev.png"), click: () => command("prev") },
            {
              tooltip: state.playing ? "Пауза" : "Відтворити",
              icon: icon(state.playing ? "pause.png" : "play.png"),
              click: () => command("toggle"),
            },
            { tooltip: "Наступна", icon: icon("next.png"), click: () => command("next") },
          ]
        : [],
    );
  }
}

function createTray() {
  tray = new Tray(icon("tray.png"));
  tray.on("click", () => show());
  updateWindowChrome();
}

// ─── Запуск ────────────────────────────────────────────────────────────────────────────────

/** nowl://track/abc → /track/abc */
function deepLinkPath(argv: string[]) {
  const link = argv.find((a) => a.startsWith("nowl://"));
  if (!link) return undefined;
  const u = new URL(link);
  return `/${u.host}${u.pathname}`.replace(/\/+$/, "") || "/";
}

app.on("second-instance", (_e, argv) => show(deepLinkPath(argv)));
app.on("before-quit", () => {
  quitting = true;
});
app.on("window-all-closed", () => {
  // Лишаємося в треї.
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // Google не пускає вхід у вбудованих вікнах із «Electron» у User-Agent — представляємося звичайним Chrome.
  app.userAgentFallback = app.userAgentFallback.replace(
    /\s(Electron|N'Owl|nowl-desktop|@musicdb\/desktop)\/\S+/gi,
    "",
  );
  registerProtocol();
  patchNetwork();
  registerIpc({
    onState(next) {
      state = next;
      updateWindowChrome();
    },
    window: () => win,
  });
  createWindow(deepLinkPath(process.argv));
  createTray();
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    void autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => void autoUpdater.checkForUpdates().catch(() => {}), 6 * 3600_000);
  }
});
