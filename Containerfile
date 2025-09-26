# syntax=docker/dockerfile:1.7-labs

# Multi-stage UBI9 Node.js image with non-root user and minimal runtime

FROM registry.access.redhat.com/ubi9/nodejs-20:latest AS builder

# OCI Labels for provenance
LABEL org.opencontainers.image.title="horreum-mcp" \
      org.opencontainers.image.description="Model Context Protocol server for Horreum (builder)" \
      org.opencontainers.image.source="https://github.com/dustinblack/horreum-mcp" \
      org.opencontainers.image.licenses="Apache-2.0"

ENV NODE_ENV=development \
    NPM_CONFIG_LOGLEVEL=warn \
    NODE_OPTIONS=--jitless \
    ROLLUP_SKIP_NODEJS_NATIVE=1

WORKDIR /app

# Install deps (skip lifecycle scripts to avoid prepare running under QEMU)
COPY package.json package-lock.json ./
# Use cache mounts for faster installs in local/CI builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-optional

# Copy sources and build
COPY tsconfig.json tsconfig.vitest.json tsup.config.ts vitest.config.ts ./
COPY src ./src
COPY openapi ./openapi
# Use TypeScript compiler to avoid Rollup native binary under QEMU
RUN --mount=type=cache,target=/root/.npm \
    npx tsc -p tsconfig.json

# Reinstall production-only dependencies to stage clean runtime deps
RUN rm -rf node_modules
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --no-optional

# --- Runtime image ---
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

# OCI Labels for runtime image
LABEL org.opencontainers.image.title="horreum-mcp" \
      org.opencontainers.image.description="Model Context Protocol server for Horreum" \
      org.opencontainers.image.source="https://github.com/dustinblack/horreum-mcp" \
      org.opencontainers.image.licenses="Apache-2.0"

ENV NODE_ENV=production \
    HTTP_MODE_ENABLED=true \
    LOG_LEVEL=info \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=256 --jitless"

WORKDIR /app

# Copy production dependencies prepared in builder to avoid running npm under QEMU
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy compiled artifacts only
COPY --from=builder /app/build ./build

# Create a non-root user and fix permissions (uid 10001 to match OpenShift constraints)
USER 0
RUN useradd -r -u 10001 appuser \ 
    && chown -R appuser:0 /app \ 
    && chmod -R g=u /app
USER appuser

# Expose HTTP transport port
EXPOSE 3000

# Healthcheck (requires HTTP mode). To disable, override in run args.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# Termination signal
STOPSIGNAL SIGTERM

# Default command runs HTTP transport; override via env if needed
CMD ["node", "./build/index.js"]


