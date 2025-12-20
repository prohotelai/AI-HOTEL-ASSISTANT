# Knowledge Base Admin Module - Test Coverage Plan

## Test Files Created

### 1. `/tests/admin/knowledgeBaseUpload.test.ts`
**Coverage Areas:**
- RBAC enforcement (reject unauthenticated, staff; allow owner/manager)
- Zod validation (title, categoryId, file type, file size)
- Upload workflow (draft/published status mapping, file metadata, events)
- Binary storage stub verification

### 2. `/tests/admin/knowledgeBaseEdit.test.ts`
**Coverage Areas:**
- RBAC enforcement (reject reception, staff; allow owner/manager)
- Hotel-scoped document access (cross-tenant protection, 404 handling)
- Update workflow (title, category, status transitions, metadata preservation)
- Event emission (document.updated with action='edit')

### 3. `/tests/admin/knowledgeBaseArchive.test.ts`
**Coverage Areas:**
- RBAC enforcement (owner/manager access only)
- Archive toggle logic (READY→ARCHIVED, ARCHIVED→READY, reject draft statuses)
- Audit logging (KB_DOCUMENT_ARCHIVED, KB_DOCUMENT_RESTORED events)
- Metadata updates (actorId, timestamp, preservation of existing fields)

### 4. `/tests/admin/knowledgeBaseClient.test.tsx`
**Coverage Areas:**
- Hook behavior (useUploadDocument, useEditDocument, useArchiveDocument)
- Loading state management (isLoading, activeId tracking)
- Success/error callbacks and router.refresh()
- Modal interactions (open, prefill, loading spinners, banners)
- Form validation (Zod schemas, field-specific errors, file constraints)

## Implementation Status

✅ API route handlers with RBAC
✅ Client hooks with fetch logic
✅ Form validation schemas
✅ Event bus integration
✅ Audit logging stub
✅ Loading states and error handling
✅ Success banners with icons
✅ Modal workflows

## TODO: Test Implementation

All test files include comprehensive TODO markers for:
- Mocking NextAuth sessions with various roles
- Mocking Prisma queries and responses
- Mocking fetch responses and FormData
- Asserting event emissions
- Testing UI state changes
- Validating RBAC enforcement at every layer

## Running Tests

```bash
# Run all admin tests
npm run test tests/admin/

# Run specific test suite
npm run test tests/admin/knowledgeBaseUpload.test.ts

# Watch mode
npm run test:watch tests/admin/
```

## Integration Points

**Backend:**
- `requireOwnerOrManager()` helper in utils.ts
- `recordKnowledgeBaseAudit()` in knowledgeBaseAudit.ts
- Event bus events: `knowledgeBase.document.updated`, `knowledgeBase.audit.logged`

**Frontend:**
- Three custom hooks for mutations
- Banner state management with success/error/info variants
- Router refresh after successful mutations
- Form validation with Zod and field-specific error display

**Future Enhancements:**
- Binary storage service integration (AWS S3, Azure Blob, etc.)
- Vector cleanup jobs on archive/restore
- Embedding refresh triggers for status changes
- KnowledgeBaseAudit Prisma model and UI
- CSV export for document inventory
- Bulk operations (archive multiple, batch upload)
