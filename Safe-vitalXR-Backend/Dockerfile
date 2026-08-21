# ==========================================
# Safe Vitals XR Backend - Multi-stage Dockerfile
# Production-ready, secure, non-root container
# ==========================================

# ── Stage 1: Build ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# Prune devDependencies to keep production image light
RUN npm prune --production

# ── Stage 2: Production Runtime ──────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper PID 1 signal forwarding (graceful shutdown)
RUN apk add --no-cache dumb-init

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user and group
USER node

# Copy runtime dependencies from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose backend service port
EXPOSE 4000

# Run with dumb-init for graceful shutdown signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
