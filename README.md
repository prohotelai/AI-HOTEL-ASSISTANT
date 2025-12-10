# AI Hotel Assistant V2

Monorepo scaffold for the AI Hotel Assistant SaaS platform. This is a foundational setup only—no business logic is implemented yet.

## Structure

```
/apps
  /dashboard    # Next.js 15 App Router dashboard
  /ai-engine    # Node.js/Express backend for AI orchestration
  /widget-sdk   # Vanilla JS SDK bundle for embedding
/packages
  /ui           # Shared Shadcn/Tailwind UI components
  /config       # Environment & runtime configuration helpers
  /utils        # Reusable utilities
  /types        # Shared TypeScript type definitions
```

## Getting Started

1. Install Node.js 20+.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run development tasks with Turborepo:
   ```bash
   npm run dev
   npm run lint
   npm run build
   npm run test
   ```

## Docker

Each app has its own `Dockerfile` for container builds under `apps/*/Dockerfile`.

## CI/CD

GitHub Actions workflow `.github/workflows/ci.yml` runs lint, build, and test across the workspace.

## Notes

- TypeScript-first with shared base config (`tsconfig.base.json`).
- ESLint + Prettier are preconfigured at the root.
- TailwindCSS + Shadcn UI are set up for the dashboard and shared UI package.

Developers can now begin implementing features on top of this scaffold.
