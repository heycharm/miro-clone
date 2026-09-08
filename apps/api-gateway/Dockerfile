FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci

RUN npx turbo run build --filter=api-gateway...


FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/api-gateway/package.json ./apps/api-gateway/package.json
COPY --from=builder /app/apps/api-gateway/dist ./apps/api-gateway/dist

COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

USER node

EXPOSE 4000

CMD ["node", "apps/api-gateway/dist/index.js"]