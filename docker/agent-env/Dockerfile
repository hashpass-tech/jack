# syntax=docker/dockerfile:1
#
# Agent environment images.
# Goal: reproducible tooling for Codex/agent work without mutating host machines.
#
# Build targets:
# - base      : node + pnpm + common CLI tools
# - ui        : base (placeholder for UI-specific deps)
# - sdk       : base (placeholder for SDK-specific deps)
# - contracts : base + Foundry (forge/cast/anvil/chisel)

FROM node:22.22.0-slim AS base

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    jq \
    ripgrep \
    unzip \
    xz-utils \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

RUN mkdir -p /workspace \
  && chown -R node:node /workspace

USER node
WORKDIR /workspace

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH

CMD ["bash"]

FROM base AS ui

FROM base AS sdk

FROM base AS contracts

USER root

# Install Foundry as root, then copy binaries to /usr/local/bin so non-root users can execute them.
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"

RUN foundryup \
  && cp /root/.foundry/bin/forge /usr/local/bin/forge \
  && cp /root/.foundry/bin/cast /usr/local/bin/cast \
  && cp /root/.foundry/bin/anvil /usr/local/bin/anvil \
  && cp /root/.foundry/bin/chisel /usr/local/bin/chisel \
  && chmod +x /usr/local/bin/forge /usr/local/bin/cast /usr/local/bin/anvil /usr/local/bin/chisel \
  && rm -rf /root/.foundry

USER node
