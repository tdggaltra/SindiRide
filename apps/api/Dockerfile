FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS development
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 3333
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 apiuser
COPY --from=builder --chown=apiuser:nodejs /app/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/prisma ./prisma
COPY --chown=apiuser:nodejs package*.json ./
USER apiuser
EXPOSE 3333
CMD ["node", "dist/server.js"]
