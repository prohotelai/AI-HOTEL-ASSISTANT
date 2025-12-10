FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY apps/ai-engine ./apps/ai-engine
COPY packages ./packages

RUN npm install
RUN npm run build --workspace ai-engine

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/ai-engine/dist ./dist
COPY --from=builder /app/apps/ai-engine/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/index.js"]
