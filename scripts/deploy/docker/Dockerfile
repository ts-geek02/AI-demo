# =============================================================================
# Dockerfile — ai-demo (Node.js + Express + TypeScript)
# Multi-stage build: builder → runner
# =============================================================================

# FIXME: update the Node.js version to match your .nvmrc or engines field in package.json
ARG NODE_VERSION=20

# -----------------------------------------------------------------------------
# Stage 1 — Builder
# Installs all dependencies and compiles TypeScript + CSS
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for the build)
RUN npm ci

# Copy source files
COPY tsconfig.json tsconfig.scripts.json tailwind.config.js ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Build CSS
RUN npm run css:build

# -----------------------------------------------------------------------------
# Stage 2 — Runner
# Lean production image — no devDependencies, no source files
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner

# FIXME: set to "production" or "staging"
ARG NODE_ENV=production
ARG PORT=3000

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

WORKDIR /app

# Copy manifests and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE ${PORT}

# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check — matches the /health endpoint in src/index.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
