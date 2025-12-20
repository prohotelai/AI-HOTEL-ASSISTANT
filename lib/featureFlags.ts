// Feature flags for Phase 0-9 implementation
// Controls which features are enabled based on database schema completion

export const FEATURE_FLAGS = {
  // Phase 0: Foundation (Complete)
  MULTI_TENANT: true,
  AUTHENTICATION: true,
  RBAC: true,
  AI_ASSISTANT: true,
  BILLING_UI: true,
  QR_AUTH: true,

  // Phase 1: Security Models (✅ COMPLETE)
  AUDIT_LOGGING: true,          // ✅ AuditLog model added
  RATE_LIMITING: true,          // ✅ RateLimitEntry model added
  BRUTE_FORCE_PROTECTION: true, // ✅ BruteForceAttempt model added

  // Phase 2: PMS Data Core (✅ COMPLETE)
  PMS_CORE: true,               // ✅ Room, RoomType, Booking, Guest models added

  // Phase 3: Availability & Booking Engine
  BOOKING_ENGINE: false,        // Requires: Phase 2 + availability logic
  AVAILABILITY_QUERIES: false,  // Requires: RoomAvailability model

  // Phase 4: Housekeeping & Maintenance
  HOUSEKEEPING: false,          // Requires: HousekeepingTask model
  MAINTENANCE: false,           // Requires: MaintenanceRequest model

  // Phase 5: Billing & Folios
  PMS_BILLING: false,           // Requires: Folio, FolioCharge, Payment, Invoice models

  // Phase 6: AI + PMS Integration
  AI_PMS_INTEGRATION: false,    // Requires: Phase 2-5 complete

  // Phase 7: Ticketing System (Optional)
  TICKET_SYSTEM: false,         // Requires: Ticket, TicketComment, TicketAudit models

  // Phase 8: Knowledge Base (Optional)
  KNOWLEDGE_BASE: false,        // Requires: KB models

  // Phase 9: Staff Management (Optional)
  STAFF_INVITATIONS: false,     // Requires: StaffInvitation model
  STAFF_PROFILES: false,        // Requires: StaffProfile, Department models
} as const;

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Helper to get current phase status
export function getCurrentPhase(): {
  phase: number;
  name: string;
  complete: boolean;
} {
  if (!FEATURE_FLAGS.PMS_CORE) {
    return { phase: 1, name: "Core Security Models", complete: true };
  }
  if (!FEATURE_FLAGS.BOOKING_ENGINE) {
    return { phase: 2, name: "PMS Data Core", complete: true };
  }
  if (!FEATURE_FLAGS.HOUSEKEEPING) {
    return { phase: 3, name: "Availability & Booking Engine", complete: true };
  }
  if (!FEATURE_FLAGS.PMS_BILLING) {
    return { phase: 4, name: "Housekeeping & Maintenance", complete: true };
  }
  if (!FEATURE_FLAGS.AI_PMS_INTEGRATION) {
    return { phase: 5, name: "Billing & Folios", complete: true };
  }
  if (!FEATURE_FLAGS.TICKET_SYSTEM && !FEATURE_FLAGS.KNOWLEDGE_BASE) {
    return { phase: 6, name: "AI + PMS Integration", complete: true };
  }
  return { phase: 9, name: "All Phases", complete: true };
}

// Feature group helpers
export const SECURITY_READY = 
  FEATURE_FLAGS.AUDIT_LOGGING && 
  FEATURE_FLAGS.RATE_LIMITING && 
  FEATURE_FLAGS.BRUTE_FORCE_PROTECTION;

export const PMS_READY = 
  FEATURE_FLAGS.PMS_CORE && 
  FEATURE_FLAGS.BOOKING_ENGINE && 
  FEATURE_FLAGS.HOUSEKEEPING && 
  FEATURE_FLAGS.MAINTENANCE && 
  FEATURE_FLAGS.PMS_BILLING;

export const FULL_SYSTEM_READY = 
  SECURITY_READY && 
  PMS_READY && 
  FEATURE_FLAGS.AI_PMS_INTEGRATION;
