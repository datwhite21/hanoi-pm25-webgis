# =============================================================================
# HANOI PM2.5 WEBGIS — PRODUCTION DOCKERFILE FOR BACKEND API (@hanoi-pm25/api)
# =============================================================================
FROM node:22-alpine

WORKDIR /app

# Copy monorepo manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install workspace dependencies
RUN npm install

# Copy source code and database migrations/seeds
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY database ./database
COPY scripts ./scripts

# Verify TypeScript compilation
RUN npm --workspace=@hanoi-pm25/shared run typecheck && \
    npm --workspace=@hanoi-pm25/api run typecheck

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["npm", "run", "start:api"]
