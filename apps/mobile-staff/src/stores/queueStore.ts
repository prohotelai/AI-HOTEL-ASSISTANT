import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SyncQueue } from '../sync/SyncQueue'

export interface QueuedAction {
  id: string
  type: 'CREATE_TASK' | 'UPDATE_TASK' | 'UPDATE_WORKORDER' | 'UPLOAD_PHOTO'
  data: any
  timestamp: number
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED'
  error?: string
  retries: number
}

interface QueueState {
  queue: QueuedAction[]
  isOnline: boolean
  isSyncing: boolean
  addAction: (type: QueuedAction['type'], data: any) => Promise<void>
  removeAction: (id: string) => Promise<void>
  setOnlineStatus: (online: boolean) => void
  syncQueue: () => Promise<void>
  loadQueue: () => Promise<void>
}

const syncQueue = new SyncQueue()

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,

  addAction: async (type: QueuedAction['type'], data: any) => {
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      status: 'PENDING',
      retries: 0
    }

    const newQueue = [...get().queue, action]
    set({ queue: newQueue })

    // Persist to storage
    await AsyncStorage.setItem('syncQueue', JSON.stringify(newQueue))

    // If online, try to sync immediately
    if (get().isOnline) {
      await get().syncQueue()
    }
  },

  removeAction: async (id: string) => {
    const newQueue = get().queue.filter((a) => a.id !== id)
    set({ queue: newQueue })
    await AsyncStorage.setItem('syncQueue', JSON.stringify(newQueue))
  },

  setOnlineStatus: (online: boolean) => {
    set({ isOnline: online })
    if (online) {
      get().syncQueue()
    }
  },

  syncQueue: async () => {
    const queue = get().queue
    if (queue.length === 0) return

    set({ isSyncing: true })

    for (const action of queue) {
      if (action.status === 'COMPLETED') continue

      try {
        set({
          queue: get().queue.map((a) =>
            a.id === action.id ? { ...a, status: 'SYNCING' } : a
          )
        })

        const result = await syncQueue.syncAction(action)

        set({
          queue: get().queue.map((a) =>
            a.id === action.id ? { ...a, status: 'COMPLETED' } : a
          )
        })
      } catch (error: any) {
        set({
          queue: get().queue.map((a) =>
            a.id === action.id
              ? {
                  ...a,
                  status: 'FAILED',
                  error: error.message,
                  retries: a.retries + 1
                }
              : a
          )
        })
      }
    }

    // Save to storage
    await AsyncStorage.setItem('syncQueue', JSON.stringify(get().queue))
    set({ isSyncing: false })
  },

  loadQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem('syncQueue')
      if (stored) {
        set({ queue: JSON.parse(stored) })
      }
    } catch (error) {
      console.error('Load queue error:', error)
    }
  }
}))
