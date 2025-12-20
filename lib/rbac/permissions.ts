/**
 * RBAC Permission Registry
 * 
 * Defines all available permissions across the system.
 * Permissions are organized by group (domain/feature area).
 * 
 * Naming convention: `{group}.{resource}.{action}`
 * Examples: pms.bookings.create, tickets.assign, crm.staff.update
 */

export enum PermissionGroup {
  PMS = 'pms',
  HOUSEKEEPING = 'housekeeping',
  MAINTENANCE = 'maintenance',
  TICKETS = 'tickets',
  CRM = 'crm',
  AI_ENGINE = 'ai',
  WIDGET = 'widget',
  SYSTEM = 'system',
}

export interface Permission {
  key: string
  name: string
  description?: string
  group: PermissionGroup
  resource: string
  action: string
}

/**
 * Complete Permission Registry (~50 permissions)
 * Organized by group for easy discovery and management
 */
export const PERMISSIONS: Record<string, Permission> = {
  // ============ PMS PERMISSIONS (9) ============
  'pms.read': {
    key: 'pms.read',
    name: 'View PMS Information',
    description: 'Read-only access to PMS data',
    group: PermissionGroup.PMS,
    resource: 'pms',
    action: 'read',
  },
  'pms.bookings.read': {
    key: 'pms.bookings.read',
    name: 'View Bookings',
    description: 'View booking information and history',
    group: PermissionGroup.PMS,
    resource: 'bookings',
    action: 'read',
  },
  'pms.bookings.create': {
    key: 'pms.bookings.create',
    name: 'Create Bookings',
    description: 'Create new guest bookings',
    group: PermissionGroup.PMS,
    resource: 'bookings',
    action: 'create',
  },
  'pms.bookings.update': {
    key: 'pms.bookings.update',
    name: 'Update Bookings',
    description: 'Modify booking details',
    group: PermissionGroup.PMS,
    resource: 'bookings',
    action: 'update',
  },
  'pms.bookings.delete': {
    key: 'pms.bookings.delete',
    name: 'Delete Bookings',
    description: 'Cancel or delete bookings',
    group: PermissionGroup.PMS,
    resource: 'bookings',
    action: 'delete',
  },
  'pms.checkin': {
    key: 'pms.checkin',
    name: 'Check In Guests',
    description: 'Perform guest check-in operations',
    group: PermissionGroup.PMS,
    resource: 'checkin',
    action: 'create',
  },
  'pms.checkout': {
    key: 'pms.checkout',
    name: 'Check Out Guests',
    description: 'Perform guest check-out operations',
    group: PermissionGroup.PMS,
    resource: 'checkout',
    action: 'create',
  },
  'pms.rooms.update': {
    key: 'pms.rooms.update',
    name: 'Update Room Status',
    description: 'Update room availability and status',
    group: PermissionGroup.PMS,
    resource: 'rooms',
    action: 'update',
  },
  'pms.billing.manage': {
    key: 'pms.billing.manage',
    name: 'Manage Billing',
    description: 'Create charges, invoices, and process payments',
    group: PermissionGroup.PMS,
    resource: 'billing',
    action: 'update',
  },

  // ============ HOUSEKEEPING PERMISSIONS (3) ============
  'housekeeping.tasks.read': {
    key: 'housekeeping.tasks.read',
    name: 'View Housekeeping Tasks',
    description: 'View task assignments and status',
    group: PermissionGroup.HOUSEKEEPING,
    resource: 'tasks',
    action: 'read',
  },
  'housekeeping.tasks.assign': {
    key: 'housekeeping.tasks.assign',
    name: 'Assign Housekeeping Tasks',
    description: 'Create and assign housekeeping tasks',
    group: PermissionGroup.HOUSEKEEPING,
    resource: 'tasks',
    action: 'create',
  },
  'housekeeping.status.update': {
    key: 'housekeeping.status.update',
    name: 'Update Task Status',
    description: 'Mark tasks as in-progress, completed, or approved',
    group: PermissionGroup.HOUSEKEEPING,
    resource: 'status',
    action: 'update',
  },

  // ============ MAINTENANCE PERMISSIONS (3) ============
  'maintenance.workorders.read': {
    key: 'maintenance.workorders.read',
    name: 'View Work Orders',
    description: 'View maintenance work orders',
    group: PermissionGroup.MAINTENANCE,
    resource: 'workorders',
    action: 'read',
  },
  'maintenance.workorders.create': {
    key: 'maintenance.workorders.create',
    name: 'Create Work Orders',
    description: 'Create new maintenance work orders',
    group: PermissionGroup.MAINTENANCE,
    resource: 'workorders',
    action: 'create',
  },
  'maintenance.workorders.update': {
    key: 'maintenance.workorders.update',
    name: 'Update Work Orders',
    description: 'Update work order status and details',
    group: PermissionGroup.MAINTENANCE,
    resource: 'workorders',
    action: 'update',
  },

  // ============ TICKETS PERMISSIONS (5) ============
  'tickets.read': {
    key: 'tickets.read',
    name: 'View Tickets',
    description: 'View support tickets',
    group: PermissionGroup.TICKETS,
    resource: 'tickets',
    action: 'read',
  },
  'tickets.create': {
    key: 'tickets.create',
    name: 'Create Tickets',
    description: 'Create new support tickets',
    group: PermissionGroup.TICKETS,
    resource: 'tickets',
    action: 'create',
  },
  'tickets.assign': {
    key: 'tickets.assign',
    name: 'Assign Tickets',
    description: 'Assign tickets to staff members',
    group: PermissionGroup.TICKETS,
    resource: 'tickets',
    action: 'assign',
  },
  'tickets.update': {
    key: 'tickets.update',
    name: 'Update Tickets',
    description: 'Update ticket details and status',
    group: PermissionGroup.TICKETS,
    resource: 'tickets',
    action: 'update',
  },
  'tickets.close': {
    key: 'tickets.close',
    name: 'Close Tickets',
    description: 'Close resolved tickets',
    group: PermissionGroup.TICKETS,
    resource: 'tickets',
    action: 'delete',
  },

  // ============ STAFF CRM PERMISSIONS (4) ============
  'crm.staff.read': {
    key: 'crm.staff.read',
    name: 'View Staff Profiles',
    description: 'View staff information and profiles',
    group: PermissionGroup.CRM,
    resource: 'staff',
    action: 'read',
  },
  'crm.staff.update': {
    key: 'crm.staff.update',
    name: 'Update Staff Profiles',
    description: 'Modify staff information',
    group: PermissionGroup.CRM,
    resource: 'staff',
    action: 'update',
  },
  'crm.kpi.update': {
    key: 'crm.kpi.update',
    name: 'Manage KPIs',
    description: 'Set and update key performance indicators',
    group: PermissionGroup.CRM,
    resource: 'kpi',
    action: 'update',
  },
  'crm.notes.create': {
    key: 'crm.notes.create',
    name: 'Add Staff Notes',
    description: 'Create notes on staff profiles',
    group: PermissionGroup.CRM,
    resource: 'notes',
    action: 'create',
  },

  // ============ AI ENGINE PERMISSIONS (2) ============
  'ai.chat.use': {
    key: 'ai.chat.use',
    name: 'Use AI Chat',
    description: 'Access AI chat features',
    group: PermissionGroup.AI_ENGINE,
    resource: 'chat',
    action: 'create',
  },
  'ai.admin.config': {
    key: 'ai.admin.config',
    name: 'Configure AI Engine',
    description: 'Manage AI system configuration',
    group: PermissionGroup.AI_ENGINE,
    resource: 'admin',
    action: 'update',
  },

  // ============ WIDGET PERMISSIONS (2) ============
  'widget.guest.session': {
    key: 'widget.guest.session',
    name: 'Guest Widget Access',
    description: 'Access widget as guest',
    group: PermissionGroup.WIDGET,
    resource: 'guest',
    action: 'create',
  },
  'widget.staff.session': {
    key: 'widget.staff.session',
    name: 'Staff Widget Access',
    description: 'Access widget as staff member',
    group: PermissionGroup.WIDGET,
    resource: 'staff',
    action: 'create',
  },

  // ============ SYSTEM PERMISSIONS (2) ============
  'system.audit.read': {
    key: 'system.audit.read',
    name: 'View Audit Logs',
    description: 'View system audit and activity logs',
    group: PermissionGroup.SYSTEM,
    resource: 'audit',
    action: 'read',
  },
  'system.settings.update': {
    key: 'system.settings.update',
    name: 'Manage System Settings',
    description: 'Update hotel and system configuration',
    group: PermissionGroup.SYSTEM,
    resource: 'settings',
    action: 'update',
  },
}

/**
 * Get all permissions for a given group
 */
export function getPermissionsByGroup(
  group: PermissionGroup
): Permission[] {
  return Object.values(PERMISSIONS).filter((p) => p.group === group)
}

/**
 * Get all permissions
 */
export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS)
}

/**
 * Get permission by key
 */
export function getPermission(key: string): Permission | undefined {
  return PERMISSIONS[key]
}

/**
 * Validate permission key exists
 */
export function isValidPermission(key: string): boolean {
  return key in PERMISSIONS
}

/**
 * Get all unique groups
 */
export function getAllGroups(): PermissionGroup[] {
  const groups = new Set(
    Object.values(PERMISSIONS).map((p) => p.group)
  )
  return Array.from(groups)
}
