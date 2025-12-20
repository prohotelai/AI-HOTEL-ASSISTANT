import { Session } from 'next-auth'

export const ROLES = ['owner', 'manager', 'reception', 'staff', 'ai_agent'] as const
export type Role = (typeof ROLES)[number]

export enum Permission {
  TICKETS_VIEW = 'tickets:view',
  TICKETS_CREATE = 'tickets:create',
  TICKETS_ASSIGN = 'tickets:assign',
  TICKETS_UPDATE = 'tickets:update',
  TICKETS_COMMENT = 'tickets:comment',
  TICKETS_INTERNAL_NOTE = 'tickets:internal-note',
  TICKETS_AUTOMATION = 'tickets:automation',
  TICKETS_TAGS = 'tickets:tags',
  KNOWLEDGE_BASE_VIEW = 'knowledge-base:view',
  KNOWLEDGE_BASE_MANAGE = 'knowledge-base:manage',
  PMS_VIEW = 'pms:view',
  PMS_SYNC = 'pms:sync',
  PMS_BOOKINGS_READ = 'pms:bookings.read',
  PMS_BOOKINGS_WRITE = 'pms:bookings.write',
  PMS_ROOMS_READ = 'pms:rooms.read',
  PMS_ROOMS_WRITE = 'pms:rooms.write',
  PMS_GUESTS_READ = 'pms:guests.read',
  PMS_GUESTS_WRITE = 'pms:guests.write',
  PMS_CONFIG_MANAGE = 'pms:config.manage',
  ADMIN_VIEW = 'admin:view',
  ADMIN_MANAGE = 'admin:manage',
  STAFF_VIEW = 'staff:view',
  STAFF_CREATE = 'staff:create',
  STAFF_EDIT = 'staff:edit',
  STAFF_DELETE = 'staff:delete',
  STAFF_INVITE = 'staff:invite',
  HR_NOTES_VIEW = 'hr-notes:view',
  HR_NOTES_CREATE = 'hr-notes:create',
  PERFORMANCE_VIEW = 'performance:view',
  PERFORMANCE_EDIT = 'performance:edit'
}

// Permission matrix ordered by most privileged role first
const rolePermissions: Record<Role, Permission[]> = {
  owner: [
    Permission.TICKETS_VIEW,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_ASSIGN,
    Permission.TICKETS_UPDATE,
    Permission.TICKETS_COMMENT,
    Permission.TICKETS_INTERNAL_NOTE,
    Permission.TICKETS_AUTOMATION,
    Permission.TICKETS_TAGS,
    Permission.KNOWLEDGE_BASE_VIEW,
    Permission.KNOWLEDGE_BASE_MANAGE,
    Permission.PMS_VIEW,
    Permission.PMS_SYNC,
    Permission.PMS_BOOKINGS_READ,
    Permission.PMS_BOOKINGS_WRITE,
    Permission.PMS_ROOMS_READ,
    Permission.PMS_ROOMS_WRITE,
    Permission.PMS_GUESTS_READ,
    Permission.PMS_GUESTS_WRITE,
    Permission.PMS_CONFIG_MANAGE,
    Permission.ADMIN_VIEW,
    Permission.ADMIN_MANAGE,
    Permission.STAFF_VIEW,
    Permission.STAFF_CREATE,
    Permission.STAFF_EDIT,
    Permission.STAFF_DELETE,
    Permission.STAFF_INVITE,
    Permission.HR_NOTES_VIEW,
    Permission.HR_NOTES_CREATE,
    Permission.PERFORMANCE_VIEW,
    Permission.PERFORMANCE_EDIT
  ],
  manager: [
    Permission.TICKETS_VIEW,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_ASSIGN,
    Permission.TICKETS_UPDATE,
    Permission.TICKETS_COMMENT,
    Permission.TICKETS_INTERNAL_NOTE,
    Permission.TICKETS_AUTOMATION,
    Permission.TICKETS_TAGS,
    Permission.KNOWLEDGE_BASE_VIEW,
    Permission.KNOWLEDGE_BASE_MANAGE,
    Permission.PMS_VIEW,
    Permission.PMS_SYNC,
    Permission.PMS_BOOKINGS_READ,
    Permission.PMS_BOOKINGS_WRITE,
    Permission.PMS_ROOMS_READ,
    Permission.PMS_GUESTS_READ,
    Permission.ADMIN_VIEW,
    Permission.STAFF_VIEW,
    Permission.STAFF_CREATE,
    Permission.STAFF_EDIT,
    Permission.STAFF_INVITE,
    Permission.HR_NOTES_VIEW,
    Permission.HR_NOTES_CREATE,
    Permission.PERFORMANCE_VIEW,
    Permission.PERFORMANCE_EDIT
  ],
  reception: [
    Permission.TICKETS_VIEW,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_ASSIGN,
    Permission.TICKETS_UPDATE,
    Permission.TICKETS_COMMENT,
    Permission.TICKETS_INTERNAL_NOTE,
    Permission.TICKETS_TAGS,
    Permission.KNOWLEDGE_BASE_VIEW,
    Permission.PMS_VIEW,
    Permission.PMS_BOOKINGS_READ,
    Permission.PMS_ROOMS_READ,
    Permission.PMS_GUESTS_READ,
    Permission.STAFF_VIEW
  ],
  staff: [
    Permission.TICKETS_VIEW,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_COMMENT,
    Permission.KNOWLEDGE_BASE_VIEW,
    Permission.STAFF_VIEW
  ],
  ai_agent: [
    Permission.TICKETS_VIEW,
    Permission.TICKETS_CREATE,
    Permission.TICKETS_COMMENT,
    Permission.TICKETS_AUTOMATION,
    Permission.KNOWLEDGE_BASE_VIEW
  ]
}

export function permissionsForRole(role: string | undefined | null): Permission[] {
  if (!role) return []
  const normalized = role.toLowerCase() as Role
  return rolePermissions[normalized] ?? []
}

export function hasPermission(role: string | undefined | null, permission: Permission) {
  return permissionsForRole(role).includes(permission)
}

export function ensureHotelSession(session: Session | null) {
  if (!session?.user?.id || !session.user.hotelId) {
    throw new Error('Hotel-scoped session required')
  }

  return {
    userId: session.user.id,
    hotelId: session.user.hotelId as string,
    role: session.user.role?.toLowerCase() ?? 'staff'
  }
}

export function assertPermission(session: Session | null, permission: Permission) {
  const context = ensureHotelSession(session)
  if (!hasPermission(context.role, permission)) {
    const err = new Error('Forbidden')
    ;(err as any).status = 403
    throw err
  }
  return context
}
