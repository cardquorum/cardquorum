# ============================================================
# CardQuorum — single-image production build
# ============================================================
# Build:   docker build -t cardquorum .
# Run:     docker run -p 3000:3000 --env-file .env cardquorum
# ============================================================

# --- Stage 0: Node + pnpm (build stages only; the runtime image never has pnpm) ---
# Node 25+ no longer bundles corepack, so install the version pinned in "packageManager"
FROM node:26-alpine AS base
WORKDIR /app
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager.split('+')[0]")"

# --- Stage 1: Install dependencies ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage 2: Build frontend + backend ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm nx build frontend --configuration=production
RUN pnpm nx run backend:prune

# Remove non-runtime files from workspace_modules copies (src, tests, build intermediates)
RUN find dist/apps/backend/workspace_modules -mindepth 1 -maxdepth 4 \
      \( -name "src" \
      -o -name "out-tsc" \
      -o -name "migrations" \
      -o -name "tsconfig*.json" \
      -o -name "vitest.config.*" \
      -o -name "drizzle.config.*" \
      -o -name "eslint.config.*" \
      -o -name "project.json" \
      \) -exec rm -rf {} +

# --- Stage 3: Production dependencies ---
# Outside /app so pnpm doesn't see the workspace root and run its lifecycle scripts
FROM base AS prod-deps
WORKDIR /prod
# Built backend: generated package.json, pruned pnpm-lock.yaml, workspace_modules/
COPY --from=builder /app/dist/apps/backend ./
RUN pnpm install --prod

# --- Stage 4: Production runtime ---
FROM node:26-alpine AS runtime
WORKDIR /app

# Copy the built backend with its production node_modules
COPY --from=prod-deps /prod ./
# Copy the built frontend SPA
COPY --from=builder /app/dist/apps/frontend/browser ./public
# Copy the entrypoint script
COPY --chmod=755 apps/backend/docker-entrypoint.sh ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/healthz', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
