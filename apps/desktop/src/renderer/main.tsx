/**
 * Інтерфейс застосунку. Налаштування (тема, акцент, мова, анімації) зберігаються в localStorage — їх
 * треба поставити на <html> до першого рендеру, бо сховище налаштувань сайту читає їх звідти.
 */
import "@fontsource-variable/inter";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./styles.css";
import { themeCss } from "@musicdb/tokens";

const KEY = "nowl-desktop-settings";
type Saved = { theme?: string; accent?: string; motion?: string; locale?: string };

function restore(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved;
  } catch {
    return {};
  }
}

const saved = restore();
const html = document.documentElement;
html.dataset.theme = saved.theme ?? "dark";
html.dataset.accent = saved.accent ?? "amber";
html.dataset.motion = saved.motion ?? "system";
html.lang =
  saved.locale ?? (navigator.language.startsWith("uk") || navigator.language.startsWith("ru") ? "uk" : "en");

const style = document.createElement("style");
style.id = "nowl-tokens";
style.textContent = themeCss();
document.head.prepend(style);

// Сайт пише налаштування в cookie (для серверного рендеру); тут — запам'ятовуємо в localStorage.
new MutationObserver(() => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        theme: html.dataset.theme,
        accent: html.dataset.accent,
        motion: html.dataset.motion,
        locale: html.lang,
      }),
    );
  } catch {}
}).observe(html, { attributes: true, attributeFilter: ["data-theme", "data-accent", "data-motion", "lang"] });

const { mount } = await import("./app");
mount(document.getElementById("root")!);
