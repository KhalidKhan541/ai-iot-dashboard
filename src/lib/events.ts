export type EventCallback<T = unknown> = (data: T) => void;
export type UnsubscribeFn = () => void;

export interface EventOptions {
  once?: boolean;
  priority?: number;
}

interface ListenerEntry<T = unknown> {
  callback: EventCallback<T>;
  options: EventOptions;
}

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<keyof Events, ListenerEntry[]>();
  private maxListeners = 100;

  on<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>,
    options?: EventOptions
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const entries = this.listeners.get(event)!;
    if (entries.length >= this.maxListeners) {
      console.warn(`Max listeners (${this.maxListeners}) exceeded for event: ${String(event)}`);
    }

    const entry: ListenerEntry<Events[K]> = { callback, options: options ?? {} };
    entries.push(entry);
    entries.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));

    return () => {
      const idx = entries.indexOf(entry);
      if (idx !== -1) entries.splice(idx, 1);
    };
  }

  once<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>
  ): UnsubscribeFn {
    return this.on(event, callback, { once: true });
  }

  off<K extends keyof Events>(event: K, callback?: EventCallback<Events[K]>): void {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const entries = this.listeners.get(event);
    if (!entries) return;

    const idx = entries.findIndex((e) => e.callback === callback);
    if (idx !== -1) entries.splice(idx, 1);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): boolean {
    const entries = this.listeners.get(event);
    if (!entries || entries.length === 0) return false;

    const toRemove: ListenerEntry[] = [];

    for (const entry of entries) {
      try {
        entry.callback(data);
        if (entry.options.once) {
          toRemove.push(entry);
        }
      } catch (error) {
        console.error(`Error in event listener for "${String(event)}":`, error);
      }
    }

    for (const entry of toRemove) {
      const idx = entries.indexOf(entry);
      if (idx !== -1) entries.splice(idx, 1);
    }

    return true;
  }

  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  eventNames(): (keyof Events)[] {
    return Array.from(this.listeners.keys());
  }

  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  pipe<K extends keyof Events, L extends keyof Events>(
    sourceEvent: K,
    targetEvent: L,
    transformer?: (data: Events[K]) => Events[L]
  ): UnsubscribeFn {
    return this.on(sourceEvent, (data) => {
      const transformed = transformer ? transformer(data) : (data as unknown as Events[L]);
      this.emit(targetEvent, transformed);
    });
  }

  buffer<K extends keyof Events>(
    event: K,
    maxSize: number,
    flushCallback: (items: Events[K][]) => void
  ): UnsubscribeFn {
    const buffer: Events[K][] = [];

    return this.on(event, (data) => {
      buffer.push(data);
      if (buffer.length >= maxSize) {
        flushCallback([...buffer]);
        buffer.length = 0;
      }
    });
  }

  debounce<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>,
    delay: number
  ): UnsubscribeFn {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return this.on(event, (data) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(data), delay);
    });
  }

  throttle<K extends keyof Events>(
    event: K,
    callback: EventCallback<Events[K]>,
    limit: number
  ): UnsubscribeFn {
    let inThrottle = false;

    return this.on(event, (data) => {
      if (!inThrottle) {
        callback(data);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    });
  }

  filter<K extends keyof Events>(
    event: K,
    predicate: (data: Events[K]) => boolean,
    callback: EventCallback<Events[K]>
  ): UnsubscribeFn {
    return this.on(event, (data) => {
      if (predicate(data)) {
        callback(data);
      }
    });
  }

  map<K extends keyof Events, R>(
    event: K,
    transformer: (data: Events[K]) => R,
    callback: EventCallback<R>
  ): UnsubscribeFn {
    return this.on(event, (data) => {
      callback(transformer(data));
    });
  }
}

export interface EventBusEvents {
  "device:data": { deviceId: string; data: Record<string, unknown>; timestamp: number };
  "device:status": { deviceId: string; status: "online" | "offline" | "error" };
  "device:alert": { deviceId: string; alertId: string; severity: string; message: string };
  "dashboard:update": { dashboardId: string; widgetId?: string };
  "alert:triggered": { alertId: string; deviceId: string; severity: string };
  "alert:acknowledged": { alertId: string; userId: string };
  "user:login": { userId: string; timestamp: number };
  "user:logout": { userId: string; timestamp: number };
  "system:error": { code: string; message: string; details?: unknown };
  "notification:push": { title: string; body: string; data?: Record<string, unknown> };
}

export const eventBus = new EventEmitter<EventBusEvents>();

export function createEventBus<Events extends Record<string, unknown>>(): EventEmitter<Events> {
  return new EventEmitter<Events>();
}

export type EventHandler<T> = (data: T) => void | Promise<void>;

export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private emitter = new EventEmitter<Events>();

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): UnsubscribeFn {
    return this.emitter.on(event, handler);
  }

  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): UnsubscribeFn {
    return this.emitter.once(event, handler);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.emitter.emit(event, data);
  }

  off<K extends keyof Events>(event: K, handler?: EventHandler<Events[K]>): void {
    this.emitter.off(event, handler);
  }
}

export interface DeviceEvents {
  "data:received": { deviceId: string; values: Record<string, number> };
  "data:batch": { deviceId: string; values: Array<{ timestamp: number; values: Record<string, number> }> };
  "connection:open": { deviceId: string };
  "connection:close": { deviceId: string; reason?: string };
  "connection:error": { deviceId: string; error: string };
}

export const deviceEvents = new TypedEventEmitter<DeviceEvents>();
