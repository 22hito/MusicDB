/**
 * Реалтайм: WebSocket-з'єднання користувачів і доставка подій.
 * Один процес тримає з'єднання в пам'яті; для кількох інстансів publish іде через Postgres NOTIFY
 * (див. RealtimeHub.attachPostgres) — без Redis.
 */
import type { RealtimeEvent } from "@musicdb/contracts";

export interface RealtimeSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface Realtime {
  publish(userIds: string | string[], event: RealtimeEvent): void;
  broadcast(event: RealtimeEvent): void;
  publishToRole(role: "admin" | "moderator", event: RealtimeEvent): void;
}

export class RealtimeHub implements Realtime {
  private sockets = new Map<string, Set<RealtimeSocket>>();
  private roles = new Map<RealtimeSocket, string>();

  connect(userId: string, role: string, socket: RealtimeSocket) {
    let set = this.sockets.get(userId);
    if (!set) {
      set = new Set();
      this.sockets.set(userId, set);
    }
    set.add(socket);
    this.roles.set(socket, role);
    socket.send(JSON.stringify({ type: "hello", userId } satisfies RealtimeEvent));
  }

  disconnect(userId: string, socket: RealtimeSocket) {
    const set = this.sockets.get(userId);
    set?.delete(socket);
    if (set && set.size === 0) this.sockets.delete(userId);
    this.roles.delete(socket);
  }

  get connectionCount() {
    let n = 0;
    for (const set of this.sockets.values()) n += set.size;
    return n;
  }

  publish(userIds: string | string[], event: RealtimeEvent) {
    const data = JSON.stringify(event);
    for (const id of Array.isArray(userIds) ? userIds : [userIds]) {
      for (const socket of this.sockets.get(id) ?? []) this.safeSend(socket, data);
    }
  }

  broadcast(event: RealtimeEvent) {
    const data = JSON.stringify(event);
    for (const set of this.sockets.values()) for (const socket of set) this.safeSend(socket, data);
  }

  publishToRole(role: "admin" | "moderator", event: RealtimeEvent) {
    const data = JSON.stringify(event);
    for (const [socket, r] of this.roles) {
      if (r === "admin" || r === role) this.safeSend(socket, data);
    }
  }

  private safeSend(socket: RealtimeSocket, data: string) {
    try {
      socket.send(data);
    } catch {
      // з'єднання закрилось — приберемо при onClose
    }
  }
}

/** Заглушка для тестів: запам'ятовує події. */
export class RecordingRealtime implements Realtime {
  events: { to: string | string[] | "*" | `role:${string}`; event: RealtimeEvent }[] = [];
  publish(userIds: string | string[], event: RealtimeEvent) {
    this.events.push({ to: userIds, event });
  }
  broadcast(event: RealtimeEvent) {
    this.events.push({ to: "*", event });
  }
  publishToRole(role: "admin" | "moderator", event: RealtimeEvent) {
    this.events.push({ to: `role:${role}`, event });
  }
}
