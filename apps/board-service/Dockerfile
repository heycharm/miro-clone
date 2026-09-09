FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci

RUN npx turbo run build --filter=@miro/shared
RUN npx turbo run build --filter=board-service


FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/package.json ./

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/board-service/package.json ./apps/board-service/package.json

COPY --from=builder /app/apps/board-service/dist ./apps/board-service/dist

COPY --from=builder /app/apps/board-service/.sequelizerc ./apps/board-service/.sequelizerc

COPY --from=builder /app/apps/board-service/src/migrations ./apps/board-service/src/migrations

COPY --from=builder /app/apps/board-service/src/config/sequelize.config.js ./apps/board-service/src/config/sequelize.config.js

COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

USER node

EXPOSE 3002

CMD ["node", "apps/board-service/dist/index.js"]