# JACK Protocol — Video Generator

Programmatic video generation for JACK protocol explainers using **Remotion + React Three Fiber**.

## Architecture

Each video scene is a self-contained Remotion composition with:
- **3D visuals** via `@remotion/three` + `@react-three/fiber`
- **Animated subtitles** with spring physics
- **Branded color palette** matching the JACK dashboard

## Commands

### Install dependencies

```bash
pnpm install
```

### Preview in Remotion Studio

```bash
pnpm dev
```

### Render individual scenes

```bash
pnpm render:scene1   # Layer 1: Secure Key Management
pnpm render:scene2   # Layer 2: Multi-Chain Connectivity
pnpm render:scene3   # Layer 3: Decentralized Clearing
pnpm render:scene4   # Layer 4: User Experience & Automation
pnpm render:scene5   # Outro
```

### Render full explainer video

```bash
pnpm render          # Combined 33-second explainer
pnpm render:all      # All individual scenes + combined
```

## Scene Breakdown

| Scene | Duration | Accent Color | Content |
|-------|----------|-------------|---------|
| 1 — Layer 1 | 7s | Gold | Secure Key Management |
| 2 — Layer 2 | 7s | Blue | Multi-Chain Connectivity |
| 3 — Layer 3 | 7s | Green | Decentralized Clearing |
| 4 — Layer 4 | 7s | Gold | User Experience & Automation |
| 5 — Outro | 5s | Gold | JACK Kernel reveal |

## Output

Rendered MP4 files are written to `out/`.

## Adding New Videos

1. Create a new scene in `src/scenes/`
2. Register it in `src/Root.tsx` as a `<Composition>`
3. Add a render script to `package.json`
