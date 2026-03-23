FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY apps/web/package.json                   ./apps/web/
COPY packages/db/package.json                ./packages/db/
COPY packages/ui/package.json                ./packages/ui/
COPY packages/eslint-config/package.json     ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/db exec prisma generate --schema=./prisma/schema.prisma

RUN mkdir -p apps/web/public

ENV NODE_ENV=production
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules              ./node_modules
COPY --from=builder /app/packages                  ./packages
COPY --from=builder /app/apps/web/.next            ./apps/web/.next
COPY --from=builder /app/apps/web/public           ./apps/web/public
COPY --from=builder /app/apps/web/node_modules     ./apps/web/node_modules
COPY --from=builder /app/apps/web/package.json     ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.mjs  ./apps/web/next.config.mjs
COPY --from=builder /app/package.json              ./
COPY --from=builder /app/pnpm-workspace.yaml       ./

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
