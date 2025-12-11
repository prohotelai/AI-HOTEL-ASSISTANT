# Simple production image
FROM node:20-alpine AS base
WORKDIR /app
COPY ../../package.json ../../package-lock.json* ./ || true
COPY . .
RUN npm install --omit=dev && npm run build
CMD ["node", "dist/index.js"]
