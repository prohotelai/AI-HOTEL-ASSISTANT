/**
 * AsyncStorage configuration and keys
 * Centralized storage key management for mobile app
 */

// Base prefix for all storage keys
const STORAGE_PREFIX = '@pms_mobile'

// Auth keys
export const STORAGE_KEYS = {
  // Auth
  USER: `${STORAGE_PREFIX}:user`,
  TOKEN: `${STORAGE_PREFIX}:token`,
  HOTEL_ID: `${STORAGE_PREFIX}:hotelId`,
  
  // Queue
  QUEUE: `${STORAGE_PREFIX}:queue`,
  SYNC_TIMESTAMP: `${STORAGE_PREFIX}:syncTimestamp`,
  
  // App State
  APP_FIRST_LAUNCH: `${STORAGE_PREFIX}:firstLaunch`,
  LAST_SYNC: `${STORAGE_PREFIX}:lastSync`,
  OFFLINE_SINCE: `${STORAGE_PREFIX}:offlineSince`,
  
  // Cache
  ROOMS_CACHE: `${STORAGE_PREFIX}:roomsCache`,
  TASKS_CACHE: `${STORAGE_PREFIX}:tasksCache`,
  WORKORDERS_CACHE: `${STORAGE_PREFIX}:workordersCache`,
  CACHE_TIMESTAMP: `${STORAGE_PREFIX}:cacheTimestamp`,
}

// Zustand persistence config for authStore and queueStore
export const PERSIST_CONFIG = {
  name: 'pms-mobile-store',
  partialize: (state: any) => ({
    // Auth store
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    
    // Queue store
    queue: state.queue,
  })
}

// Cache configuration
export const CACHE_CONFIG = {
  ROOMS_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  TASKS_CACHE_TTL: 3 * 60 * 1000, // 3 minutes
  WORKORDERS_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  PHOTOS_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
}

// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
}

// Sync configuration
export const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  AUTO_SYNC_INTERVAL: 30000, // 30 seconds
  BATCH_SYNC_LIMIT: 10, // Sync max 10 actions at a time
  NETWORK_DEBOUNCE: 2000, // 2 seconds before syncing after reconnect
}

// App feature flags
export const FEATURE_FLAGS = {
  OFFLINE_MODE: true,
  AUTO_SYNC: true,
  PHOTO_UPLOAD: true,
  WORKORDER_ASSIGNMENT: true,
  TASK_DEPENDENCIES: true,
  QR_CODE_CHECKIN: true,
}

export default {
  STORAGE_KEYS,
  PERSIST_CONFIG,
  CACHE_CONFIG,
  API_CONFIG,
  SYNC_CONFIG,
  FEATURE_FLAGS,
}
