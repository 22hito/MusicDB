/**
 * Реалтайм-з'єднання з автоперепідключенням (експоненційна затримка з розкидом).
 * Працює в браузері й у React Native (там можна передати заголовки, напр. cookie сесії).
 */
import type { RealtimeEvent } from "@musicdb/contracts/client";

export type RealtimeOptions = {
  url: string;
  onEvent: (event: RealtimeEvent) => void;
  onStatus?: (status: "connecting" | "open" | "closed") => void;
  /** Лише React Native: заголовки рукостискання. */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
};

export function connectRealtime(opts: RealtimeOptions) {
  let socket: WebSocket | null = null;
  let attempt = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = async () => {
    if (stopped) return;
    opts.onStatus?.("connecting");
    const headers = await opts.headers?.();
    // Третій аргумент конструктора — розширення React Native; браузер його ігнорує.
    const Ctor = WebSocket as unknown as new (
      url: string,
      protocols?: string[],
      options?: { headers?: Record<string, string> },
    ) => WebSocket;
    socket = headers ? new Ctor(opts.url, undefined, { headers }) : new WebSocket(opts.url);
    socket.onopen = () => {
      attempt = 0;
      opts.onStatus?.("open");
    };
    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(String(msg.data)) as RealtimeEvent | { type: "ping" };
        if (data.type !== "ping") opts.onEvent(data as RealtimeEvent);
      } catch {
        // ігноруємо пошкоджені повідомлення
      }
    };
    socket.onclose = (ev) => {
      opts.onStatus?.("closed");
      socket = null;
      if (stopped || ev.code === 4401) return;
      const delay = Math.min(30_000, 1000 * 2 ** attempt) * (0.5 + Math.random());
      attempt++;
      timer = setTimeout(open, delay);
    };
    socket.onerror = () => socket?.close();
  };

  void open();

  return {
    close() {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    },
    /** Перепідключитися негайно (напр., вкладка знову активна або з'явилась мережа). */
    reconnect() {
      if (socket && socket.readyState <= 1) return;
      clearTimeout(timer);
      attempt = 0;
      void open();
    },
  };
}
