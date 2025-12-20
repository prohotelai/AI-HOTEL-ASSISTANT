import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useQueueStore } from '../stores/queueStore'
import { AppState, AppStateStatus } from 'react-native'
import NetInfo from '@react-native-community/netinfo'

export function useInitializeApp() {
  const { restoreSession } = useAuthStore()
  const { loadQueue, setOnlineStatus, syncQueue } = useQueueStore()

  useEffect(() => {
    let appStateSubscription: any
    let unsubscribeNetInfo: any

    const initializeApp = async () => {
      // Restore auth session
      await restoreSession()

      // Load offline queue
      await loadQueue()

      // Monitor network status
      unsubscribeNetInfo = NetInfo.addEventListener((state) => {
        setOnlineStatus(!!state.isConnected)
        if (state.isConnected) {
          syncQueue()
        }
      })

      // Monitor app state changes
      const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // App came to foreground - try to sync
          await syncQueue()
        }
      }

      appStateSubscription = AppState.addEventListener('change', handleAppStateChange)
    }

    initializeApp()

    return () => {
      appStateSubscription?.remove()
      unsubscribeNetInfo?.()
    }
  }, [restoreSession, loadQueue, setOnlineStatus, syncQueue])

  return { initialized: true }
}
