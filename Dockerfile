# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
#   Installs all dependencies, compiles the Vite frontend and ESBuilds the server
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached unless package*.json changes)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Production image
#   Lean Alpine image — only production dependencies + compiled assets
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# GCP Cloud Run injects $PORT at runtime (defaults to 8080)
# Our server reads process.env.PORT so this works automatically.
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
