---
title: Setup (3 Steps)
sidebar_position: 2
---

# 3-Step Setup Guide

Follow these three steps to run the JACK stack locally.

## 1) Clone + Install

```bash
git clone https://github.com/hashpass-tech/JACK.git
cd JACK
pnpm install
```

## 2) Configure Environment

```bash
cp .env.production.example .env.local
# Update values in .env.local as needed
```

> Tip: `.env.testnet` contains the default testnet values if you want to mirror the hosted environment.

### Optional: Yellow Network ERC-7824 Callback Setup

For the dashboard callback endpoint (`POST /api/intents`) you can enforce provider auth plus Nitrolite channel guards:

```bash
# apps/dashboard/.env.local (or runtime env)
YELLOW_NETWORK_AUTH_TOKEN=...
YELLOW_NETWORK_SESSION_ID=...
YELLOW_NETWORK_CHANNEL_ID=0x...
YELLOW_NETWORK_ADJUDICATOR=0x...
YELLOW_NETWORK_CHALLENGE_PERIOD=3600
```

Notes:

- `YELLOW_NETWORK_CHANNEL_ID` is the ERC-7824 channel identifier and is preferred over the legacy `YELLOW_NETWORK_CHANNEL`.
- `YELLOW_NETWORK_ADJUDICATOR` and `YELLOW_NETWORK_CHALLENGE_PERIOD` are optional strict guards for incoming provider events.
- Payloads can include ERC-7824 metadata (`channelId`, `channelStatus`, `stateIntent`, `stateVersion`, `stateHash`) and these are persisted on the intent record.

## 3) Run the Apps

```bash
pnpm dev:landing   # http://localhost:3000
pnpm dev:dashboard # http://localhost:3001
pnpm dev:docs      # http://localhost:3002
```

For a single terminal, use:

```bash
pnpm dev:all
```
