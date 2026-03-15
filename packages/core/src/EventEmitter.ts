export class EventEmitter<
  Events extends Record<string, any>,
> {
  private listeners = new Map<keyof Events, Set<(payload: any) => void>>();

  on<EventName extends keyof Events>(
    eventName: EventName,
    handler: (payload: Events[EventName]) => void,
  ) {
    const listeners = this.listeners.get(eventName) ?? new Set();

    listeners.add(handler as (payload: any) => void);
    this.listeners.set(eventName, listeners);

    return () => this.off(eventName, handler);
  }

  off<EventName extends keyof Events>(
    eventName: EventName,
    handler: (payload: Events[EventName]) => void,
  ) {
    this.listeners.get(eventName)?.delete(handler as (payload: any) => void);
  }

  emit<EventName extends keyof Events>(
    eventName: EventName,
    payload: Events[EventName],
  ) {
    this.listeners.get(eventName)?.forEach((listener) => listener(payload));
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}
