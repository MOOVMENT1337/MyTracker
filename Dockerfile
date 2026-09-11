# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS client-build
WORKDIR /build/TrackerWebApp/Client
COPY TrackerWebApp/Client/package.json TrackerWebApp/Client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY TrackerWebApp/Client/index.html TrackerWebApp/Client/vite.config.js ./
COPY TrackerWebApp/Client/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS server-build
WORKDIR /build/TrackerWebApp/Server
COPY TrackerWebApp/Server/package.json TrackerWebApp/Server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY TrackerWebApp/Server/tsconfig.json ./
COPY TrackerWebApp/Server/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app/TrackerWebApp/Server

COPY TrackerWebApp/Server/package.json TrackerWebApp/Server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

COPY --from=server-build /build/TrackerWebApp/Server/dist ./dist
COPY TrackerWebApp/Server/migrations ./migrations
COPY deploy/supabase-ca.crt ./certs/supabase-ca.crt
COPY --from=client-build /build/TrackerWebApp/Client/dist /app/TrackerWebApp/Client/dist
COPY deploy/entrypoint.sh /usr/local/bin/taskstate-entrypoint
RUN chmod 0755 /usr/local/bin/taskstate-entrypoint

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/local/bin/taskstate-entrypoint"]
CMD ["node", "dist/server.js"]
