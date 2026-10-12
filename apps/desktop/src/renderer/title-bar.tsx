/**
 * Смуга заголовка вікна без системної рамки: за неї тягнуть вікно, праворуч — кнопки Windows
 * (згорнути, розгорнути, закрити) поверх. Колір кнопок підлаштовується під тему.
 */
import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { desktop } from "./bridge";

export function TitleBar() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const light =
      theme === "light" || (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    desktop?.setTitleBar({ color: "#00000000", symbolColor: light ? "#3a3d4a" : "#c9cbd6" });
  }, [theme]);
  return (
    <div
      aria-hidden
      className="desktop-drag pointer-events-auto fixed inset-x-0 top-0 z-[60] h-2"
      style={{ width: "env(titlebar-area-width, 100%)" }}
    />
  );
}
