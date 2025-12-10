FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY apps/widget-sdk ./apps/widget-sdk
COPY packages ./packages

RUN npm install
RUN npm run build --workspace widget-sdk

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/widget-sdk/dist ./dist
COPY --from=builder /app/apps/widget-sdk/package.json ./package.json

CMD ["node", "-e", "console.log('Widget SDK bundle built. Mount via CDN or bundler.')"]
