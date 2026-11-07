# syntax=docker/dockerfile:1

# ---- Build: install everything, compile shared + backend (tsc) and frontend (vite) ----------
FROM node:22-slim AS build
WORKDIR /app

# Toolchain for better-sqlite3's native addon, used only if no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Manifests first, so the dependency layer is cached until a package.json or the lockfile changes.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY . .
RUN npm run build \
  # Drop dev dependencies; the native addon stays compiled for this same base image.
  && npm prune --omit=dev

# ---- Runtime: compiled output and production dependencies only, as a non-root user ----------
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/hr.db
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/shared/package.json ./shared/
COPY --from=build --chown=node:node /app/shared/dist ./shared/dist
COPY --from=build --chown=node:node /app/backend/package.json ./backend/
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist

# SQLite lives on the container's disk: ephemeral, re-seeded deterministically on each fresh start.
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
