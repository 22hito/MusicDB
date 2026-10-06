"use client";
import { useEffect, useState } from "react";

/**
 * Телефон чи планшет (сенсор без наведення). Там важливо, що грає у фоні — з вимкненим екраном чи згорнутою
 * вкладкою грають лише пісні з файлом; на комп'ютері фонове відтворення працює завжди.
 * До монтування — false (як на сервері), щоб не було розбіжності гідратації.
 */
export function useTouchDevice() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return touch;
}
