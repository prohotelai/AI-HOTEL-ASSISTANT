/**
 * RBAC Role Hierarchy and Definitions
 * 
 * Defines the default roles for each hotel with their hierarchy levels.
 * Higher level = more permissions (cascade down).
 */

import { Permission, PermissionGroup } from './permissions'

export enum RoleKey {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  RECEPTION = 'reception',
  HOUSEKEEPING = 'housekeeping',
  MAINTENANCE = 'maintenance',
  STAFF = 'staff',
  GUEST = 'guest',
  AI_AGENT = 'ai_agent',
}

export interface RoleDefinition {
  key: RoleKey
  name: string
  level: number // 0-4, higher = more permissions
  description: string
  permissions: string[] // Array of permission keys
}

/**
 * Default role definitions for every hotel
 * These define the permission set for each role
 */
export const DEFAULT_ROLES: Record<RoleKey, RoleDefinition> = {
  // ============ ADMIN (Level 4: Full Access) ============
  [RoleKey.ADMIN]: {
    key: RoleKey.ADMIN,
    name: 'Admin',
    level: 4,
    description: 'Full system access. Can manage all hotel operations, staff, and system settings.',
    permissions: [
      // All PMS permissions
      'pms.read',
      'pms.bookings.read',
      'pms.bookings.create',
      'pms.bookings.update',
      'pms.bookings.delete',
      'pms.checkin',
      'pms.checkout',
      'pms.rooms.update',
      'pms.billing.manage',
      // All Housekeeping permissions
      'housekeeping.tasks.read',
      'housekeeping.tasks.assign',
      'housekeeping.status.update',
      // All Maintenance permissions
      'maintenance.workorders.read',
      'maintenance.workorders.create',
      'maintenance.workorders.update',
      // All Ticket permissions
      'tickets.read',
      'tickets.create',
      'tickets.assign',
      'tickets.update',
      'tickets.close',
      // All CRM permissions
      'crm.staff.read',
      'crm.staff.update',
      'crm.kpi.update',
      'crm.notes.create',
      // All AI permissions
      'ai.chat.use',
      'ai.admin.config',
      // All Widget permissions
      'widget.guest.session',
      'widget.staff.session',
      // All System permissions
      'system.audit.read',
      'system.settings.update',
    ],
  },

  // ============ MANAGER (Level 3: Broad Access) ============
  [RoleKey.MANAGER]: {
    key: RoleKey.MANAGER,
    name: 'Manager',
    level: 3,
    description: 'Manage daily hotel operations. Can supervise staff, manage tasks, and handle billing.',
    permissions: [
      // PMS access (all)
      'pms.read',
      'pms.bookings.read',
      'pms.bookings.create',
      'pms.bookings.update',
      'pms.checkin',
      'pms.checkout',
      'pms.rooms.update',
      'pms.billing.manage',
      // Housekeeping
      'housekeeping.tasks.read',
      'housekeeping.tasks.assign',
      'housekeeping.status.update',
      // Maintenance
      'maintenance.workorders.read',
      'maintenance.workorders.create',
      'maintenance.workorders.update',
      // Tickets
      'tickets.read',
      'tickets.create',
      'tickets.assign',
      'tickets.update',
      'tickets.close',
      // CRM
      'crm.staff.read',
      'crm.staff.update',
      'crm.kpi.update',
      'crm.notes.create',
      // AI
      'ai.chat.use',
      // Audit
      'system.audit.read',
    ],
  },

  // ============ SUPERVISOR (Level 2: Task Assignment) ============
  [RoleKey.SUPERVISOR]: {
    key: RoleKey.SUPERVISOR,
    name: 'Supervisor',
    level: 2,
    description: 'Supervise team operations. Can assign tasks, update status, and manage tickets.',
    permissions: [
      // PMS (read and check-in/out)
      'pms.read',
      'pms.bookings.read',
      'pms.checkin',
      'pms.checkout',
      // Housekeeping
      'housekeeping.tasks.read',
      'housekeeping.tasks.assign',
      'housekeeping.status.update',
      // Maintenance
      'maintenance.workorders.read',
      'maintenance.workorders.create',
      // Tickets
      'tickets.read',
      'tickets.assign',
      'tickets.update',
      // CRM (read and notes)
      'crm.staff.read',
      'crm.notes.create',
      // AI
      'ai.chat.use',
    ],
  },

  // ============ RECEPTION (Level 1: Front Desk) ============
  [RoleKey.RECEPTION]: {
    key: RoleKey.RECEPTION,
    name: 'Reception',
    level: 1,
    description: 'Front desk operations. Can check guests in/out, manage bookings, and handle guest issues.',
    permissions: [
      // PMS (core operations)
      'pms.read',
      'pms.bookings.read',
      'pms.bookings.create',
      'pms.checkin',
      'pms.checkout',
      // Tickets (create and view)
      'tickets.read',
      'tickets.create',
      // CRM (limited)
      'crm.staff.read',
      // AI
      'ai.chat.use',
      // Widget
      'widget.guest.session',
    ],
  },

  // ============ HOUSEKEEPING (Level 1: Housekeeping Staff) ============
  [RoleKey.HOUSEKEEPING]: {
    key: RoleKey.HOUSEKEEPING,
    name: 'Housekeeping',
    level: 1,
    description: 'Housekeeping operations. Can view and update room cleaning tasks.',
    permissions: [
      // PMS (room status)
      'pms.read',
      'pms.rooms.update',
      // Housekeeping
      'housekeeping.tasks.read',
      'housekeeping.status.update',
      // AI
      'ai.chat.use',
      // Widget
      'widget.staff.session',
    ],
  },

  // ============ MAINTENANCE (Level 1: Maintenance Staff) ============
  [RoleKey.MAINTENANCE]: {
    key: RoleKey.MAINTENANCE,
    name: 'Maintenance',
    level: 1,
    description: 'Maintenance operations. Can view and manage work orders.',
    permissions: [
      // PMS (room status)
      'pms.read',
      // Maintenance
      'maintenance.workorders.read',
      'maintenance.workorders.create',
      'maintenance.workorders.update',
      // AI
      'ai.chat.use',
      // Widget
      'widget.staff.session',
    ],
  },

  // ============ STAFF (Level 1: General Staff) ============
  [RoleKey.STAFF]: {
    key: RoleKey.STAFF,
    name: 'Staff',
    level: 1,
    description: 'General staff access. Can view tickets, participate in chat, and access basic features.',
    permissions: [
      // Tickets
      'tickets.read',
      // AI
      'ai.chat.use',
      // Widget
      'widget.staff.session',
    ],
  },

  // ============ GUEST (Level 0: Guest Access) ============
  [RoleKey.GUEST]: {
    key: RoleKey.GUEST,
    name: 'Guest',
    level: 0,
    description: 'Limited guest access. Can use widget and basic features.',
    permissions: [
      // AI
      'ai.chat.use',
      // Widget
      'widget.guest.session',
    ],
  },

  // ============ AI_AGENT (Special: System Use) ============
  [RoleKey.AI_AGENT]: {
    key: RoleKey.AI_AGENT,
    name: 'AI Agent',
    level: 4, // System role - high level for automation
    description: 'Automated AI agent. Used for system automation and internal operations.',
    permissions: [
      // AI
      'ai.chat.use',
      'ai.admin.config',
      // Minimal PMS read
      'pms.read',
    ],
  },
}

/**
 * Role hierarchy - roles can inherit permissions from lower-level roles
 * Higher level roles inherit from lower ones (e.g., Manager inherits from Supervisor)
 */
export function getRoleHierarchy(role: RoleDefinition): RoleDefinition[] {
  const hierarchy: RoleDefinition[] = [role]
  
  // Get all roles with lower level
  const lowerRoles = Object.values(DEFAULT_ROLES)
    .filter((r) => r.level < role.level)
    .sort((a, b) => b.level - a.level) // Sort descending by level
  
  return [...hierarchy, ...lowerRoles]
}

/**
 * Get all permissions for a role (including inherited)
 */
export function getRolePermissions(role: RoleDefinition): string[] {
  const hierarchy = getRoleHierarchy(role)
  const uniquePermissions = new Set<string>()
  
  hierarchy.forEach((r) => {
    r.permissions.forEach((p) => uniquePermissions.add(p))
  })
  
  return Array.from(uniquePermissions)
}

/**
 * Get role by key
 */
export function getRoleDefinition(key: RoleKey): RoleDefinition | undefined {
  return DEFAULT_ROLES[key]
}

/**
 * Get all role definitions
 */
export function getAllRoles(): RoleDefinition[] {
  return Object.values(DEFAULT_ROLES)
}

/**
 * Check if user role (by level) can assign a role
 * Higher level can assign lower level roles
 */
export function canAssignRole(
  assignerLevel: number,
  targetRoleLevel: number
): boolean {
  return assignerLevel > targetRoleLevel
}

/**
 * Get all roles that a user can assign (based on their role level)
 */
export function getAssignableRoles(userRoleLevel: number): RoleDefinition[] {
  return getAllRoles()
    .filter((role) => role.level < userRoleLevel)
    .sort((a, b) => b.level - a.level)
}
