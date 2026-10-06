# Збирається з кореня монорепо: docker build -f apps/web/Dockerfile .
FROM node:24-slim AS build
WORKDIR /repo
RUN npm i -g pnpm@12.9.1
COPY . .
RUN pnpm install --frozen-lockfile --filter "@musicdb/web..."
RUN pnpm --filter @musicdb/web build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
