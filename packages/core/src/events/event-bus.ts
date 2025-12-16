import type { EventBus, EventHandler, MaestroEvent } from "../types/events.js";

/**
 * In-memory implementation of the event bus
 *
 * Simple pub/sub for workflow events. Suitable for local development.
 * For production, swap with Redis-backed implementation.
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private anyHandlers: Set<EventHandler> = new Set();

  /**
   * Emit an event to all subscribed handlers
   */
  async emit(event: MaestroEvent): Promise<void> {
    const typeHandlers = this.handlers.get(event.type);

    // Call type-specific handlers
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        await handler(event);
      }
    }

    // Call any-event handlers
    for (const handler of this.anyHandlers) {
      await handler(event);
    }
  }

  /**
   * Subscribe to a specific event type
   */
  on<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventHandler): void {
    this.anyHandlers.add(handler);
  }

  /**
   * Unsubscribe from a specific event type
   */
  off<T extends MaestroEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<MaestroEvent, { type: T }>>
  ): void {
    this.handlers.get(eventType)?.delete(handler as EventHandler);
  }

  /**
   * Unsubscribe from all events
   */
  offAny(handler: EventHandler): void {
    this.anyHandlers.delete(handler);
  }

  /**
   * Remove all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }
}
