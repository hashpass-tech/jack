# syntax=docker/dockerfile:1
FROM node:22.22.0-slim AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard

RUN pnpm install --frozen-lockfile
RUN pnpm --filter dashboard build

WORKDIR /app/apps/dashboard

EXPOSE 8080
ENV NODE_ENV=production

CMD ["pnpm", "start", "-p", "8080"]
