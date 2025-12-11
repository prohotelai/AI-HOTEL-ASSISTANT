# Merge & Organization Action Plan

**Project**: AI Hotel Assistant  
**Current State**: 6 branches with 23,203+ lines of code, 0 files in main  
**Goal**: Consolidate work into production-ready main branch

---

## 🎯 Executive Summary

**Problem**: All Copilot work exists on separate branches. Main branch is empty.

**Solution**: Systematic merge strategy starting with most complete implementation.

**Timeline**: 4 weeks to fully integrated system

**Risk Level**: 🟡 Medium (requires careful integration, but work is well-documented)

---

## 📋 Pre-Merge Checklist

### ✅ Completed
- [x] Analyzed all branches
- [x] Documented all changes
- [x] Identified TODOs and incomplete sections
- [x] Created merge action plan

### 🔲 Required Before ANY Merge
- [ ] **Team decision on architecture**: Monorepo vs Simple App?
- [ ] **Choose base branch**: Starter (recommended) or Scaffold?
- [ ] **Set up development environment**: PostgreSQL, Redis, API keys
- [ ] **Create test database**: For migration testing
- [ ] **Set up code review process**: Who reviews what?
- [ ] **Define "done" criteria**: When is a merge complete?

---

## 🚀 Phase 1: Foundation (Week 1)

### Goal: Get basic working app in main branch

### Step 1.1: Merge Base Implementation
**Branch**: `origin/copilot/create-ai-hotel-assistant-starter`  
**Why**: Most complete, production build works, excellent docs

```bash
# Create merge branch
git checkout -b merge/starter-to-main main
git merge origin/copilot/create-ai-hotel-assistant-starter --no-ff

# Review all files
# Fix any conflicts (shouldn't be any)

# Test locally
npm install
npm run build
npx prisma generate
# Set up .env with test credentials

# Create PR for review
gh pr create --title "Merge Starter Implementation" \
  --body "Merges complete starter branch. See COPILOT_WORK_SUMMARY.md"
```

**Files to Review Carefully**:
- `app/api/chat/route.ts` - Contains TODO for OpenAI integration
- `prisma/schema.prisma` - Database schema
- `.env.example` - Required environment variables
- `package.json` - All dependencies

**Testing Checklist**:
- [ ] `npm install` succeeds
- [ ] `npm run build` succeeds
- [ ] `npx prisma generate` succeeds
- [ ] App starts with `npm run dev`
- [ ] Can register a new hotel
- [ ] Can login as hotel admin
- [ ] Can access chat page
- [ ] Chat sends messages (placeholder response)
- [ ] Dashboard loads
- [ ] Widget demo page loads

**Time Estimate**: 1-2 days

---

### Step 1.2: Fix Critical TODO - OpenAI Integration
**File**: `app/api/chat/route.ts`

**Current Code** (Line 54-56):
```typescript
// TODO: Replace with actual OpenAI API call
// This is a placeholder response
const aiResponse = `Thank you for your message: "${message}". 
  This is a placeholder response...`
```

**Fix Required**:
```typescript
// Add at top of file
import OpenAI from 'openai'

// In route handler
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Replace placeholder with:
const completion = await openai.chat.completions.create({
  model: hotel.openaiModel || 'gpt-4',
  messages: [
    {
      role: 'system',
      content: `You are a helpful AI assistant for ${hotel.name}. 
                Help guests with their questions about the hotel.`,
    },
    {
      role: 'user',
      content: message,
    },
  ],
  temperature: 0.7,
  max_tokens: 500,
})

const aiResponse = completion.choices[0].message.content
```

**Testing**:
- [ ] Set OPENAI_API_KEY in .env
- [ ] Send test message
- [ ] Verify GPT response
- [ ] Check token usage in response
- [ ] Verify error handling

**Time Estimate**: 2-4 hours

---

### Step 1.3: Environment Setup Documentation
**Create**: `DEPLOYMENT.md`

**Content**:
```markdown
# Deployment Guide

## Required Environment Variables

### Database
- DATABASE_URL: PostgreSQL connection string
  Example: postgresql://user:pass@localhost:5432/hotel_ai

### Authentication
- NEXTAUTH_SECRET: Random secret for NextAuth
  Generate: openssl rand -base64 32
- NEXTAUTH_URL: Your app URL
  Example: http://localhost:3000

### OpenAI
- OPENAI_API_KEY: Your OpenAI API key
  Get from: https://platform.openai.com/api-keys

### Pinecone (for RAG - optional initially)
- PINECONE_API_KEY: Your Pinecone API key
- PINECONE_ENVIRONMENT: Pinecone environment
- PINECONE_INDEX: Index name

## Local Development Setup

1. Clone repo
2. Copy .env.example to .env
3. Fill in environment variables
4. Run: npm install
5. Run: npx prisma migrate dev
6. Run: npx prisma db seed
7. Run: npm run dev

## Production Deployment

[To be completed based on chosen platform]
```

**Time Estimate**: 1-2 hours

---

## 🤖 Phase 2: AI Engine Integration (Week 2)

### Goal: Add sophisticated AI capabilities with RAG

### Step 2.1: Analyze AI Engine Code
**Branch**: `origin/copilot/implement-ai-hotel-assistant-v2`

**Review These Files**:
1. `apps/ai-engine/src/lib/rag.ts` - RAG pipeline
2. `apps/ai-engine/src/lib/tools.ts` - AI tools (121 lines)
3. `apps/ai-engine/src/lib/pinecone.ts` - Vector store
4. `apps/ai-engine/src/lib/openai.ts` - OpenAI client
5. `apps/ai-engine/src/workers/embedWorker.ts` - Background jobs

**Decision Point**: 
- **Option A**: Keep AI in Next.js API routes (simpler)
- **Option B**: Extract to separate service (more scalable)

**Recommendation**: Option A initially, migrate to B when scaling

**Time Estimate**: 4 hours

---

### Step 2.2: Integrate RAG Pipeline
**Target**: Enhance `app/api/chat/route.ts` with RAG

**Tasks**:
1. Copy RAG utility functions to `lib/rag.ts`
2. Copy Pinecone client to `lib/pinecone.ts`
3. Copy tokenizer to `lib/tokenizer.ts`
4. Add to chat endpoint:
   ```typescript
   // Retrieve relevant context from Pinecone
   const context = await retrieveContext(message, hotel.id)
   
   // Add context to system message
   const systemMessage = `You are a helpful AI assistant for ${hotel.name}.
   
   Relevant information:
   ${context}
   
   Use this information to answer the guest's question.`
   ```

**New Dependencies**:
- `@pinecone-database/pinecone`
- `tiktoken` (for tokenization)

**Testing**:
- [ ] Ingest sample hotel data to Pinecone
- [ ] Query returns relevant results
- [ ] Chat uses context in responses
- [ ] Handles missing context gracefully

**Time Estimate**: 1-2 days

---

### Step 2.3: Implement AI Tools
**Source**: `apps/ai-engine/src/lib/tools.ts`

**Tools to Integrate**:
1. **bookRoom** - Room booking capability
2. **getFAQ** - Common questions
3. **orderRoomService** - F&B orders
4. **conciergeRequest** - Concierge services

**Integration**:
```typescript
// In chat route
const tools = [
  {
    type: 'function',
    function: {
      name: 'bookRoom',
      description: 'Book a room for guest',
      parameters: {
        type: 'object',
        properties: {
          checkIn: { type: 'string' },
          checkOut: { type: 'string' },
          roomType: { type: 'string' },
        },
      },
    },
  },
  // ... more tools
]

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: tools,
  tool_choice: 'auto',
})

// Handle tool calls
if (completion.choices[0].message.tool_calls) {
  // Execute tool and return result
}
```

**Time Estimate**: 2-3 days

---

## 🔐 Phase 3: Backend Consolidation (Week 2-3)

### Goal: Unified backend architecture

### Step 3.1: Compare Backend Implementations

**Analysis Needed**:
| Feature | Starter (Next.js API) | Core (Express) | Decision |
|---------|----------------------|----------------|----------|
| Auth | NextAuth.js | JWT middleware | ? |
| Multi-tenant | Prisma relations | Tenant middleware | ? |
| RBAC | Session-based | Role middleware | ? |
| API Routes | App Router | Express routes | ? |

**Recommendation**:
- Use NextAuth.js from Starter (better Next.js integration)
- Add RBAC middleware from Core to Next.js API routes
- Keep Prisma schema from Starter (more complete)
- Merge audit logging from Core

**Time Estimate**: 1 day planning, 2-3 days implementation

---

### Step 3.2: Merge Prisma Schemas

**Files to Compare**:
1. Starter: `prisma/schema.prisma` (157 lines, 5 models + NextAuth)
2. Core: `prisma/schema.prisma` (113 lines, 5 models, no NextAuth)

**Merge Strategy**:
```bash
# Compare schemas
git show origin/copilot/create-ai-hotel-assistant-starter:prisma/schema.prisma > /tmp/starter-schema.prisma
git show origin/copilot/implement-core-system-layer:prisma/schema.prisma > /tmp/core-schema.prisma
diff /tmp/starter-schema.prisma /tmp/core-schema.prisma
```

**Models to Keep/Merge**:
- ✅ Hotel (Starter - more complete with widget config)
- ✅ User (Starter - NextAuth compatible)
- ✅ Conversation, Message (Starter - unique to that branch)
- 🔄 Role, UserRole (Core - add to Starter)
- 🔄 AuditLog (Core - add to Starter)
- ✅ NextAuth models (Starter - keep)

**Time Estimate**: 4-6 hours

---

### Step 3.3: Add RBAC Middleware

**Source**: `src/middlewares/roles.js` from Core branch

**Integration**:
```typescript
// lib/rbac.ts
export enum Permission {
  MANAGE_USERS = 'manage:users',
  MANAGE_HOTEL = 'manage:hotel',
  VIEW_ANALYTICS = 'view:analytics',
  MANAGE_CONTENT = 'manage:content',
}

export enum Role {
  SUPER_ADMIN = 'super_admin',
  HOTEL_ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  USER = 'user',
}

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.HOTEL_ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_HOTEL,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_CONTENT,
  ],
  // ... more roles
}

// Middleware
export function requirePermission(permission: Permission) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userPermissions = rolePermissions[session.user.role as Role]
    if (!userPermissions.includes(permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
}
```

**Usage**:
```typescript
// app/api/admin/users/route.ts
import { requirePermission, Permission } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  await requirePermission(Permission.MANAGE_USERS)(request)
  // ... rest of handler
}
```

**Time Estimate**: 1-2 days

---

## 🎫 Phase 4: Tickets System (Week 3-4)

### Goal: Complete ticketing functionality

### Step 4.1: Implement Prisma Schema
**Source**: `docs/module-01-tickets.md` from tickets branch

**Models to Add**:
```prisma
model GuestQRToken {
  id        String   @id @default(cuid())
  hotelId   String
  guestId   String
  roomId    String
  tokenHash String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  usedAt    DateTime?
  
  hotel Hotel @relation(fields: [hotelId], references: [id])
  @@index([tokenHash])
  @@index([hotelId, guestId, roomId])
}

model Ticket {
  id           String         @id @default(cuid())
  hotelId      String
  source       TicketSource
  status       TicketStatus   @default(OPEN)
  priority     TicketPriority @default(MEDIUM)
  title        String
  description  String?
  guestId      String?
  roomId       String?
  createdById  String?
  assignedToId String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  hotel    Hotel            @relation(fields: [hotelId], references: [id])
  comments TicketComment[]
  audits   TicketAudit[]
  tags     TicketTagOnTicket[]
  
  @@index([hotelId, status, priority])
  @@index([hotelId, assignedToId])
}

// ... other ticket models (Comment, Audit, Tag, etc.)
```

**Migration**:
```bash
npx prisma migrate dev --name add_tickets_system
```

**Time Estimate**: 4 hours

---

### Step 4.2: Build Ticket API Endpoints

**Endpoints to Create**:

1. **POST /api/qr/generate**
   ```typescript
   // app/api/qr/generate/route.ts
   export async function POST(req: NextRequest) {
     const { hotelId, guestId, roomId, expiresInMinutes = 60 } = await req.json()
     
     // Validate guest is in room
     // Generate JWT token
     // Hash and store in GuestQRToken
     // Return QR code URL
   }
   ```

2. **POST /api/qr/validate**
   ```typescript
   // app/api/qr/validate/route.ts
   export async function POST(req: NextRequest) {
     const { token } = await req.json()
     
     // Verify JWT signature
     // Check if token is unused and not expired
     // Mark as used
     // Create guest session
     // Return session token
   }
   ```

3. **POST /api/tickets**
   ```typescript
   // app/api/tickets/route.ts
   export async function POST(req: NextRequest) {
     const session = await getServerSession(authOptions)
     const { title, description, priority, tags, roomId } = await req.json()
     
     // Create ticket
     // Add audit log
     // Trigger notifications
     // Return ticket
   }
   ```

4. **GET /api/tickets** (list with filters)
5. **GET /api/tickets/[id]** (single ticket)
6. **PATCH /api/tickets/[id]** (update with audit)
7. **POST /api/tickets/[id]/comments** (add comment)
8. **POST /api/tickets/[id]/attachments** (upload files)

**Time Estimate**: 3-4 days

---

### Step 4.3: Build Ticket Dashboard UI

**Components to Create**:

```
components/tickets/
├── TicketList.tsx         # List view with filters
├── TicketCard.tsx         # Individual ticket card
├── TicketDetail.tsx       # Full ticket view
├── TicketForm.tsx         # Create/edit form
├── CommentThread.tsx      # Comments section
└── QRCodeGenerator.tsx    # QR code UI

app/tickets/
├── page.tsx               # Tickets list
├── [id]/
│   └── page.tsx          # Ticket detail
└── new/
    └── page.tsx          # Create ticket
```

**Dashboard Page**:
```tsx
// app/dashboard/page.tsx - add tickets section
<div className="space-y-6">
  <TicketStats hotelId={session.user.hotelId} />
  <TicketList
    hotelId={session.user.hotelId}
    filters={{ status: 'OPEN' }}
  />
</div>
```

**Time Estimate**: 2-3 days

---

### Step 4.4: Integrate with Chat

**Goal**: Allow guests to create tickets from chat

**Implementation**:
```typescript
// app/api/chat/route.ts
// Add ticket creation tool
const tools = [
  {
    type: 'function',
    function: {
      name: 'createTicket',
      description: 'Create a support ticket for guest request',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        },
        required: ['title', 'description'],
      },
    },
  },
]

// Handle tool call
if (toolCall.function.name === 'createTicket') {
  const args = JSON.parse(toolCall.function.arguments)
  const ticket = await prisma.ticket.create({
    data: {
      hotelId: session.user.hotelId,
      guestId: session.user.id,
      source: 'AI_AGENT',
      ...args,
    },
  })
  
  return {
    role: 'function',
    name: 'createTicket',
    content: JSON.stringify({ ticketId: ticket.id, success: true }),
  }
}
```

**Time Estimate**: 1 day

---

## 🔄 Phase 5: Polish & Production (Week 4+)

### Step 5.1: Testing

**Test Coverage Needed**:
- [ ] Unit tests for utilities
- [ ] API route tests
- [ ] Component tests
- [ ] E2E tests (Playwright)
- [ ] Load testing

**Test Structure**:
```
tests/
├── unit/
│   ├── lib/rag.test.ts
│   ├── lib/rbac.test.ts
│   └── lib/tokenizer.test.ts
├── integration/
│   ├── api/chat.test.ts
│   ├── api/tickets.test.ts
│   └── api/auth.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── chat.spec.ts
    └── tickets.spec.ts
```

**Time Estimate**: 1 week

---

### Step 5.2: Documentation

**Docs to Create/Update**:
1. **README.md** - Update with current features
2. **API_DOCUMENTATION.md** - All endpoints
3. **DEPLOYMENT.md** - Production deployment
4. **DEVELOPMENT.md** - Local development guide
5. **ARCHITECTURE.md** - System architecture
6. **CONTRIBUTING.md** - Contribution guidelines

**Time Estimate**: 2-3 days

---

### Step 5.3: CI/CD Setup

**GitHub Actions Workflows**:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build

# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: # Deploy to Vercel/AWS/etc
```

**Time Estimate**: 1-2 days

---

### Step 5.4: Production Deployment

**Deployment Checklist**:
- [ ] Choose hosting platform (Vercel recommended for Next.js)
- [ ] Set up production database (Neon, Supabase, or AWS RDS)
- [ ] Configure environment variables
- [ ] Set up Redis (for sessions/queue)
- [ ] Configure monitoring (Sentry, LogRocket, etc.)
- [ ] Set up error tracking
- [ ] Configure rate limiting
- [ ] Set up CDN for static assets
- [ ] Configure CORS
- [ ] Set up SSL/HTTPS
- [ ] Configure backups
- [ ] Set up staging environment

**Time Estimate**: 2-3 days

---

## 📊 Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| **Phase 1: Foundation** | Week 1 | Working app in main with OpenAI integration |
| **Phase 2: AI Engine** | Week 2 | RAG pipeline and AI tools functional |
| **Phase 3: Backend** | Week 2-3 | Consolidated backend with RBAC |
| **Phase 4: Tickets** | Week 3-4 | Complete ticketing system |
| **Phase 5: Polish** | Week 4+ | Production-ready deployment |

**Total Time**: 4-5 weeks with 1-2 developers

---

## 🚨 Risk Mitigation

### Risk 1: Merge Conflicts
**Mitigation**: 
- Merge one branch at a time
- Test thoroughly between merges
- Create backup branch before each merge

### Risk 2: Schema Migration Issues
**Mitigation**:
- Test migrations on separate database
- Have rollback plan
- Document schema changes

### Risk 3: API Key Costs
**Mitigation**:
- Set usage limits
- Monitor costs daily
- Implement rate limiting

### Risk 4: Incomplete Features
**Mitigation**:
- Use feature flags
- Keep TODOs documented
- Prioritize MVP features

---

## ✅ Definition of Done

### For Each Phase:
- [ ] All tests passing
- [ ] Code reviewed by team
- [ ] Documentation updated
- [ ] No critical TODOs remaining
- [ ] Deployed to staging
- [ ] User acceptance testing complete

### For Final Release:
- [ ] All phases complete
- [ ] Production deployment successful
- [ ] Monitoring set up
- [ ] User documentation complete
- [ ] Training materials prepared
- [ ] Support plan in place

---

## 📞 Decision Points

**Immediate Decisions Needed**:
1. ✅ Choose base branch (Recommend: Starter)
2. ✅ Architecture choice (Recommend: Monolith first, then scale)
3. 🔲 Testing strategy (Need team input)
4. 🔲 Deployment platform (Vercel vs AWS vs other?)
5. 🔲 Feature priority (Core AI vs Tickets first?)

**Future Decisions**:
6. 🔲 Monorepo migration timing
7. 🔲 Voice features priority
8. 🔲 Mobile app timeline
9. 🔲 WhatsApp integration timeline
10. 🔲 PMS integrations priority

---

## 📝 Next Steps

**Tomorrow**:
1. Review this plan with team
2. Make key decisions (architecture, platform, priorities)
3. Set up development environment
4. Start Phase 1

**This Week**:
1. Merge starter branch
2. Fix OpenAI TODO
3. Complete Phase 1 testing

**This Month**:
1. Complete Phases 1-3
2. Begin Phase 4
3. Plan production deployment

---

**Document Version**: 1.0  
**Last Updated**: December 11, 2025  
**Status**: 🟡 Awaiting team review and decisions
