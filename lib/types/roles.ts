/**
 * Role type definitions
 * Note: These are string-based for compatibility with databases that don't have the enum type
 */

export type SystemRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'RECEPTION' | 'STAFF' | 'GUEST' | 'AI_AGENT'

export const SystemRole = {
  OWNER: 'OWNER' as const,
  ADMIN: 'ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  RECEPTION: 'RECEPTION' as const,
  STAFF: 'STAFF' as const,
  GUEST: 'GUEST' as const,
  AI_AGENT: 'AI_AGENT' as const,
}
