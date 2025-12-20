# AI Hotel Assistant - Multi-Tenant SaaS Starter

A comprehensive multi-tenant SaaS platform offering AI-powered conversational agents for hotels. Built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and Neon PostgreSQL.

## 🚀 Features

- **Multi-Tenant Architecture**: Secure, isolated data for each hotel
- **ChatGPT-like Interface**: Modern chat UI for guest interactions
- **Embeddable Widget**: Easy-to-integrate chat widget for hotel websites
- **User Authentication**: NextAuth.js with credentials provider
- **Database**: Prisma ORM with Neon PostgreSQL
- **Modern UI**: Tailwind CSS with responsive design
- **Ready for AI**: Structured for OpenAI and Pinecone integration
- **Billing Ready**: Prepared for Stripe integration
- **Knowledge Base Ingestion**: Tenant-scoped sources, documents, and embedding queues
- **RAG Chat Orchestration**: Retrieval-augmented GPT responses with tool scaffolding
- **AI Widget SDK**: Drop-in browser bundle with chat, voice, localization, and telemetry

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma + Neon PostgreSQL
- **Authentication**: NextAuth.js
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DATABASE_URL="postgresql://user:password@your-neon-host/ai_hotel_assistant"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

5. Generate Prisma client:
```bash
npm run db:generate
```

6. Push database schema:
```bash
npm run db:push
```
## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

## 📁 Project Structure

```
ai-hotel-assistant/
├── app/                      # Next.js 14 app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # NextAuth.js authentication
│   │   ├── chat/            # Chat API endpoint
│   │   ├── conversations/   # Conversations API
│   │   ├── hotels/          # Hotels API
│   │   └── register/        # User registration
│   ├── chat/                # Chat interface page
│   ├── dashboard/           # User dashboard
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── widget-demo/         # Widget demo page
│   └── page.tsx             # Home page
├── components/
│   ├── chat/                # Chat components
│   ├── ui/                  # Reusable UI components
│   └── widget/              # Embeddable widget
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── utils.ts             # Utility functions
│   ├── ai/                  # AI retrieval & OpenAI utilities
│   ├── knowledgeBase/       # Document chunking utilities
│   ├── queues/              # BullMQ queues (tickets, knowledge base)
│   └── services/            # Domain services (tickets, knowledge base)
├── prisma/
│   └── schema.prisma        # Database schema
└── types/                   # TypeScript type definitions
```

## 🗄️ Database Schema

The application uses a multi-tenant architecture with the following models:

- **Hotel**: Tenant entity with configuration
- **User**: Users with role-based access
- **Conversation**: Chat sessions
- **Message**: Individual chat messages
- **Account/Session**: NextAuth.js models

## 🔐 Authentication

The app uses NextAuth.js with credentials provider. Users can:
- Register with email/password
- Each registration creates a new hotel (tenant)
- Login with email/password
- Role-based access control (user, admin, super_admin)

## 💬 Chat System

### Main Chat Interface
- ChatGPT-like interface at `/chat`
- Message history
- Real-time responses
- Multi-conversation support

### Embeddable Widget
- Demo at `/widget-demo`
- Customizable branding per hotel
- Anonymous guest support
- Floating chat button

## 🧩 AI Widget SDK (Module 6)
- Built as a standalone package in `widget-sdk/` with Vite library mode.
- Emits ESM, UMD, and IIFE bundles so hotels can load it via bundlers or a plain `<script>` tag.
- Provides chat, optional voice capture/playback (browser Speech APIs), localization (EN/ES/FR built-in), theming tokens, event tracking, and permission-aware actions.
- Build and test commands:

```bash
npm run widget:build
npm run widget:test
```

- Minimal integration example:

```html
<script src="/path/to/widget-sdk.iife.js"></script>
<script>
	const widget = window.ProHotelAIWidget.createWidget({
		hotelId: 'hotel_123',
		apiBaseUrl: 'https://app.yourhotel.com',
		defaultLanguage: 'en',
		enableVoice: true,
		permissions: ['tickets:create'],
		theme: { accentColor: '#f97316' }
	})

	widget.on('message:received', ({ content }) => {
		console.log('Assistant replied:', content)
	})
</script>
```

- For module consumers using ESM:

```ts
import { createWidget } from '@prohotelai/widget-sdk'

const widget = createWidget({
	hotelId: 'hotel_123',
	apiBaseUrl: 'https://app.yourhotel.com'
})
```

## 🔌 API Endpoints

- `POST /api/chat` - Send chat messages
- `GET /api/conversations` - Get user conversations
- `GET /api/hotels?slug=hotel-slug` - Get hotel by slug
- `POST /api/register` - Register new user and hotel
- `/api/auth/*` - NextAuth.js routes

## 🎨 Customization

### Widget Branding
Each hotel can customize:
- Widget color
- Widget title
- Logo and branding

Configure in the Hotel model through the dashboard (to be implemented).

## 🚧 Future Integrations

The codebase is prepared for:

### OpenAI Integration
- Placeholder AI responses in `/api/chat`
- Ready for GPT-4 integration
- Token tracking implemented

### Pinecone Vector Database
- Schema includes fields for knowledge base
- Ready for semantic search
- Document embedding support

### Stripe Billing
- User roles prepared for subscription tiers
- Webhook endpoints can be added
- Usage tracking foundation in place

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create migration
- `npm run db:studio` - Open Prisma Studio
- `npm run widget:build` - Build the standalone widget bundles
- `npm run widget:test` - Run widget package unit tests

## 🔒 Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - Secret for NextAuth.js

Optional (for future use):
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - Override default chat model (defaults to gpt-4o-mini)
- `OPENAI_BASE_URL` - Alternate OpenAI-compatible endpoint
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX` - Pinecone index name
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 🆘 Support

For issues and questions, please open an issue on GitHub.
