FROM node:20-alpine AS builder
WORKDIR /app

# Root workspace metadata
COPY package.json turbo.json tsconfig.base.json ./

# App-specific configs
COPY apps/dashboard/package.json apps/dashboard/next.config.mjs apps/dashboard/tailwind.config.ts apps/dashboard/postcss.config.mjs apps/dashboard/tsconfig.json apps/dashboard/next-env.d.ts apps/dashboard/styles ./apps/dashboard/
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard

RUN npm install
RUN npm run build --workspace dashboard

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/package.json ./apps/dashboard/package.json

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "dashboard"]
