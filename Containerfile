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
    ROLLUP_SKIP_NODEJS_NATIVE=1
    # Note: --jitless applied only during npm install to prevent QEMU crashes
    # Runtime stage preserves WebAssembly support (required by undici)

WORKDIR /app

# Install only production deps (avoid running dev tooling under QEMU)
COPY package.json package-lock.json ./
# Ensure proper permissions for npm install
USER 0
# Use --jitless for cross-arch builds under QEMU to prevent V8 crashes
# while preserving WebAssembly support in the runtime stage
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS="--jitless" npm ci --omit=dev --ignore-scripts --no-optional \
    && chown -R 1001:0 /app/node_modules
USER 1001

# Copy prebuilt artifacts from build context
# Ensure you run `npm run build` before building the container
COPY build ./build

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
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=256"

WORKDIR /app

# Copy production dependencies prepared in builder to avoid running npm under QEMU
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY --from=builder /app/build ./build
COPY docker-entrypoint.sh ./

# Create a non-root user and fix permissions (uid 10001 to match OpenShift constraints)
USER 0
RUN useradd -r -u 10001 appuser \ 
    && chown -R appuser:0 /app \ 
    && chmod -R g=u /app \
    && chmod +x /app/docker-entrypoint.sh
USER appuser

# Expose HTTP transport port
EXPOSE 3000

# Healthcheck (requires HTTP mode). To disable, override in run args.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

# Termination signal
STOPSIGNAL SIGTERM

# Default command runs HTTP transport; override via env if needed
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "./build/index.js"]


