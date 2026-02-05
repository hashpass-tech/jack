FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard ./apps/dashboard
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter dashboard build

FROM node:22-bookworm-slim AS runner

WORKDIR /workspace

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/apps/dashboard ./apps/dashboard
COPY --from=builder /workspace/packages ./packages

RUN corepack enable

WORKDIR /workspace/apps/dashboard
ENV NODE_ENV=production
ENV PORT=8080

CMD ["pnpm", "start"]
