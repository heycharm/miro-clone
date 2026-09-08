FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci

RUN npx turbo run build --filter=collab-service...


FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/collab-service/package.json ./apps/collab-service/package.json
COPY --from=builder /app/apps/collab-service/dist ./apps/collab-service/dist

COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

USER node

EXPOSE 3003

CMD ["node", "apps/collab-service/dist/index.js"]