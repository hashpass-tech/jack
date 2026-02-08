FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard ./apps/dashboard
COPY packages ./packages
COPY components ./components
COPY CHANGELOG.md ./CHANGELOG.md

ARG NEXT_PUBLIC_IS_TESTNET=false
ARG NEXT_PUBLIC_CDN_URL
ENV NEXT_PUBLIC_IS_TESTNET=$NEXT_PUBLIC_IS_TESTNET
ENV NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @jack-kernel/sdk build && pnpm --filter dashboard build

FROM node:22-bookworm-slim AS runner

WORKDIR /workspace

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /workspace/apps/dashboard ./apps/dashboard
COPY --from=builder /workspace/packages ./packages
COPY --from=builder /workspace/components ./components

RUN corepack enable

WORKDIR /workspace/apps/dashboard
ENV NODE_ENV=production
ENV PORT=8080

CMD ["pnpm", "start"]
