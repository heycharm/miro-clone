FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci

RUN npx turbo run build --filter=auth-service...


FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./

COPY apps/auth-service/package.json ./apps/auth-service/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN npm ci --workspace=auth-service --include-workspace-root=false

COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=builder /app/apps/auth-service/.sequelizerc ./apps/auth-service/.sequelizerc
COPY --from=builder /app/apps/auth-service/src/migrations ./apps/auth-service/src/migrations
COPY --from=builder /app/apps/auth-service/src/config/sequelize.config.js ./apps/auth-service/src/config/sequelize.config.js

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

USER node

EXPOSE 3001

CMD ["node", "apps/auth-service/dist/index.js"]