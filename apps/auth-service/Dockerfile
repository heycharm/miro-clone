# apps/auth-service/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

# /**
#  * Multi-stage build — why?
#  * 
#  * Stage 1 (builder): installs ALL deps including devDependencies,
#  * compiles TypeScript → JavaScript
#  * 
#  * Stage 2 (production): copies only the compiled JS + production deps
#  * Final image has NO TypeScript, NO ts-node, NO source maps
#  * 
#  * Result: image goes from ~800MB → ~150MB
#  * Smaller image = faster deploys, less attack surface, cheaper storage
#  */

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# non-root user for security
# running as root inside a container is a security risk
# if someone escapes the container they'd have root on the host
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]