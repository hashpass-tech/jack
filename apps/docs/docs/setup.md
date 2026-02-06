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

## 3) Run the Apps

```bash
pnpm dev:landing   # http://localhost:3000
pnpm dev:dashboard # http://localhost:3001
```

For a single terminal, use:

```bash
pnpm dev:all
```
