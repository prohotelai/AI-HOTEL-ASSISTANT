import { WidgetEvent, WidgetEventHandler, WidgetEventPayloads } from './types'

type HandlerMap = {
  [K in WidgetEvent]?: Set<WidgetEventHandler<K>>
}

export class WidgetEventBus {
  private handlers: HandlerMap = {}

  on<K extends WidgetEvent>(event: K, handler: WidgetEventHandler<K>): () => void {
    const set = (this.handlers[event] ??= new Set()) as Set<WidgetEventHandler<K>>
    set.add(handler)
    return () => this.off(event, handler)
  }

  off<K extends WidgetEvent>(event: K, handler: WidgetEventHandler<K>) {
    const set = this.handlers[event] as Set<WidgetEventHandler<K>> | undefined
    set?.delete(handler)
  }

  emit<K extends WidgetEvent>(event: K, payload: WidgetEventPayloads[K]) {
    const set = this.handlers[event] as Set<WidgetEventHandler<K>> | undefined
    set?.forEach((handler) => handler(payload))
    const globalEvent = new CustomEvent(`prohotelai:${event}`, { detail: payload })
    window.dispatchEvent(globalEvent)
  }
}
