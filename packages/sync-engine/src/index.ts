/**
 * Offline-first Sync Engine
 * Shared package for web and mobile apps
 * Handles queuing, retries, conflict resolution
 */

export interface SyncAction {
  id: string
  type: string
  data: any
  timestamp: number
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED'
  retries: number
  error?: string
}

export interface SyncConfig {
  maxRetries?: number
  retryDelay?: number
  conflictResolution?: 'LAST_WRITE_WINS' | 'CLIENT_PREFERRED' | 'SERVER_PREFERRED'
  onConflict?: (local: any, server: any) => any
}

export interface SyncResult {
  success: boolean
  action: SyncAction
  serverResponse?: any
  error?: string
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  conflictResolution: 'LAST_WRITE_WINS'
}

/**
 * SyncEngine manages offline actions and syncing
 */
export class SyncEngine {
  private queue: Map<string, SyncAction> = new Map()
  private config: SyncConfig
  private isOnline: boolean = true
  private syncInProgress: boolean = false
  private persistenceLayer: SyncPersistence
  private listeners: SyncListener[] = []

  constructor(persistence: SyncPersistence, config?: SyncConfig) {
    this.persistenceLayer = persistence
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Register a listener for sync events
   */
  onSyncEvent(listener: SyncListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Queue an action for syncing
   */
  async queueAction(type: string, data: any): Promise<SyncAction> {
    const action: SyncAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      status: 'PENDING',
      retries: 0
    }

    this.queue.set(action.id, action)
    await this.persistenceLayer.save(action)
    this.notifyListeners('action:queued', action)

    if (this.isOnline && !this.syncInProgress) {
      this.sync()
    }

    return action
  }

  /**
   * Sync all queued actions
   */
  async sync(): Promise<SyncResult[]> {
    if (this.syncInProgress) return []
    this.syncInProgress = true
    this.notifyListeners('sync:started', null)

    const results: SyncResult[] = []
    const actions = Array.from(this.queue.values())

    for (const action of actions) {
      if (action.status === 'COMPLETED') continue

      try {
        this.queue.set(action.id, { ...action, status: 'SYNCING' })
        this.notifyListeners('action:syncing', action)

        const result = await this.syncAction(action)

        if (result.success) {
          this.queue.set(action.id, { ...action, status: 'COMPLETED' })
          await this.persistenceLayer.delete(action.id)
          this.notifyListeners('action:synced', action)
          results.push(result)
        } else {
          throw new Error(result.error || 'Sync failed')
        }
      } catch (error: any) {
        const retries = action.retries + 1
        const shouldRetry = retries < (this.config.maxRetries || 3)

        const updatedAction: SyncAction = {
          ...action,
          status: shouldRetry ? 'PENDING' : 'FAILED',
          retries,
          error: error.message
        }

        this.queue.set(action.id, updatedAction)
        await this.persistenceLayer.save(updatedAction)
        this.notifyListeners('action:failed', updatedAction)

        results.push({
          success: false,
          action: updatedAction,
          error: error.message
        })
      }
    }

    this.syncInProgress = false
    this.notifyListeners('sync:completed', null)

    return results
  }

  /**
   * Sync a single action to server
   */
  private async syncAction(action: SyncAction): Promise<SyncResult> {
    const response = await fetch(this.getEndpointForAction(action.type), {
      method: this.getMethodForAction(action.type),
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Action': action.id,
        'X-Sync-Timestamp': action.timestamp.toString()
      },
      body: JSON.stringify(action.data)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Sync request failed')
    }

    const serverResponse = await response.json()

    return {
      success: true,
      action,
      serverResponse
    }
  }

  /**
   * Set online status
   */
  setOnlineStatus(online: boolean) {
    this.isOnline = online
    if (online && !this.syncInProgress) {
      this.sync()
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const all = Array.from(this.queue.values())
    return {
      total: all.length,
      pending: all.filter((a) => a.status === 'PENDING').length,
      syncing: all.filter((a) => a.status === 'SYNCING').length,
      failed: all.filter((a) => a.status === 'FAILED').length,
      completed: all.filter((a) => a.status === 'COMPLETED').length
    }
  }

  /**
   * Get failed actions (for manual retry)
   */
  getFailedActions(): SyncAction[] {
    return Array.from(this.queue.values()).filter((a) => a.status === 'FAILED')
  }

  /**
   * Manually retry a failed action
   */
  async retryAction(actionId: string) {
    const action = this.queue.get(actionId)
    if (!action) throw new Error('Action not found')

    this.queue.set(actionId, { ...action, status: 'PENDING', retries: 0 })
    await this.persistenceLayer.save(action)

    if (this.isOnline) {
      await this.sync()
    }
  }

  /**
   * Clear a queued action
   */
  async clearAction(actionId: string) {
    this.queue.delete(actionId)
    await this.persistenceLayer.delete(actionId)
    this.notifyListeners('action:cleared', { id: actionId })
  }

  private getEndpointForAction(type: string): string {
    // Map action types to API endpoints
    const endpoints: { [key: string]: string } = {
      'CREATE_TASK': '/api/mobile/tasks',
      'UPDATE_TASK': '/api/mobile/tasks',
      'CREATE_WORKORDER': '/api/mobile/workorders',
      'UPDATE_WORKORDER': '/api/mobile/workorders',
      'UPLOAD_PHOTO': '/api/mobile/photos'
    }
    return endpoints[type] || '/api/sync'
  }

  private getMethodForAction(type: string): 'POST' | 'PUT' {
    return type.startsWith('CREATE') ? 'POST' : 'PUT'
  }

  private notifyListeners(event: string, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }
}

/**
 * Persistence layer interface
 */
export interface SyncPersistence {
  save(action: SyncAction): Promise<void>
  delete(actionId: string): Promise<void>
  load(actionId: string): Promise<SyncAction | null>
  loadAll(): Promise<SyncAction[]>
  clear(): Promise<void>
}

/**
 * Sync event listener
 */
export type SyncListener = (event: string, data: any) => void

/**
 * In-memory persistence (for testing)
 */
export class InMemoryPersistence implements SyncPersistence {
  private store: Map<string, SyncAction> = new Map()

  async save(action: SyncAction): Promise<void> {
    this.store.set(action.id, action)
  }

  async delete(actionId: string): Promise<void> {
    this.store.delete(actionId)
  }

  async load(actionId: string): Promise<SyncAction | null> {
    return this.store.get(actionId) || null
  }

  async loadAll(): Promise<SyncAction[]> {
    return Array.from(this.store.values())
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}

/**
 * IndexedDB persistence (for web)
 */
export class IndexedDBPersistence implements SyncPersistence {
  private dbName = 'PMS_SyncEngine'
  private storeName = 'actions'
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' })
        }
      }
    })
  }

  async save(action: SyncAction): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(action)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async delete(actionId: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(actionId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async load(actionId: string): Promise<SyncAction | null> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(actionId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async loadAll(): Promise<SyncAction[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}
