# Збирається з кореня монорепо: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
WORKDIR /repo
RUN npm i -g pnpm@12.9.1
COPY . .
RUN pnpm install --frozen-lockfile --filter "@musicdb/api..."
RUN pnpm --filter @musicdb/api build
# Лише продакшн-залежності API (пакети робочого простору вже вбудовані в бандл).
RUN pnpm --filter @musicdb/api deploy --legacy --prod /out

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787 MIGRATIONS_DIR=/app/drizzle AUTO_MIGRATE=true
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/packages/db/drizzle ./drizzle
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/server.js"]
