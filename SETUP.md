# Setup Guide - AI Hotel Assistant

This guide will help you set up the AI Hotel Assistant multi-tenant SaaS platform.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- A Neon PostgreSQL account (or any PostgreSQL database)
- Git installed

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/prohotelai/AI-HOTEL-ASSISTANT.git
cd AI-HOTEL-ASSISTANT

# Install dependencies
npm install
```

## Step 2: Database Setup

### Option A: Using Neon (Recommended)

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string

### Option B: Local PostgreSQL

If you're using a local PostgreSQL instance:
```
postgresql://username:password@localhost:5432/ai_hotel_assistant
```

## Step 3: Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure:

```env
# Database - REQUIRED
DATABASE_URL="your-neon-connection-string-here"

# NextAuth - REQUIRED
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-this-with-openssl-rand-base64-32"

# Optional: For future OpenAI integration
OPENAI_API_KEY="sk-..."

# Optional: For future Pinecone integration
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="..."
PINECONE_INDEX="..."

# Optional: For future Stripe integration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## Step 4: Database Schema

Generate Prisma client and push schema to database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

## Step 5: Seed Demo Data (Optional)

To create demo hotel and user:

```bash
npm run db:seed
```

This creates:
- **Hotel**: Demo Grand Hotel (slug: `demo-hotel`)
- **User**: admin@demograndhotel.com / demo1234

## Step 6: Run the Application

### Development Mode
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

## Available Routes

### Public Routes
- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/chat` - Chat demo (no auth required)
- `/widget-demo` - Widget demo page

### Protected Routes
- `/dashboard` - User dashboard (requires auth)

### API Routes
- `/api/auth/*` - NextAuth endpoints
- `/api/chat` - Chat API
- `/api/conversations` - Conversations API
- `/api/hotels` - Hotels API
- `/api/register` - Registration API

## Testing the Application

### 1. Register a New Hotel

1. Visit `http://localhost:3000/register`
2. Fill in:
   - Full name
   - Email
   - Password
   - Hotel name
3. Click "Create account"

### 2. Login

1. Visit `http://localhost:3000/login`
2. Use your credentials or demo credentials:
   - Email: `admin@demograndhotel.com`
   - Password: `demo1234`

### 3. Test Chat Interface

1. Visit `http://localhost:3000/chat`
2. Type a message
3. You'll receive a placeholder AI response

### 4. Test Widget

1. Visit `http://localhost:3000/widget-demo`
2. Click the blue chat button in bottom-right
3. Test the widget functionality

## Database Management

### View Database with Prisma Studio
```bash
npm run db:studio
```
Opens at [http://localhost:5555](http://localhost:5555)

### Create Migrations
```bash
npm run db:migrate
```

### Reset Database
```bash
npx prisma migrate reset
```

## Troubleshooting

### Build Errors

**Issue**: "Cannot find module '@prisma/client'"
```bash
npm run db:generate
```

**Issue**: ESLint version conflicts
```bash
npm install -D eslint@^8 eslint-config-next@14
```

### Database Errors

**Issue**: "Can't reach database server"
- Check DATABASE_URL in `.env`
- Ensure database is running
- Check network connectivity

**Issue**: Schema out of sync
```bash
npm run db:push
```

### Authentication Errors

**Issue**: "NEXTAUTH_SECRET not configured"
- Generate secret: `openssl rand -base64 32`
- Add to `.env` as NEXTAUTH_SECRET

## Next Steps

### Integrate OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env`: `OPENAI_API_KEY="sk-..."`
3. Update `/app/api/chat/route.ts` to use OpenAI API
4. Replace placeholder response with actual GPT call

### Integrate Pinecone

1. Create account at [Pinecone](https://www.pinecone.io/)
2. Create an index
3. Add credentials to `.env`
4. Implement vector storage for hotel knowledge base

### Integrate Stripe

1. Get keys from [Stripe Dashboard](https://dashboard.stripe.com/)
2. Add to `.env`
3. Implement subscription plans
4. Add webhook handling

## Production Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to:
- Railway
- Render
- Fly.io
- AWS/Azure/GCP

Ensure:
- Set all environment variables
- Configure PostgreSQL connection
- Set NODE_ENV=production

## Support

For issues:
1. Check existing GitHub issues
2. Open a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
