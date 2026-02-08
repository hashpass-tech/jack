# JACK Video Recorder

> 3D Avatar Video Recorder powered by **Remotion** + **Three.js VRM** + **Gabber Real-Time AI**

A complete video production toolkit for creating the JACK Kernel submission video, featuring a 3D animated avatar character with real-time AI voice, vision, and lip-sync capabilities.

## Architecture

```
apps/video-recorder/
├── config/                     # Configuration files
│   ├── fps.ts                  # Frame rate & timing
│   ├── fonts.ts                # Typography config
│   ├── gabber.ts               # Gabber AI graph & credentials
│   ├── layout.ts               # Canvas dimensions
│   ├── themes.ts               # Color themes
│   └── visemes.ts              # Viseme mapping & bone rig
├── remotion/                   # Remotion compositions (video rendering)
│   ├── index.ts                # Remotion entry point
│   ├── Root.tsx                # Composition registry
│   └── compositions/
│       ├── JackAvatarComposition.tsx    # 3D avatar main scene
│       ├── IntroComposition.tsx         # Animated intro card
│       └── EndCardComposition.tsx       # End card with links
├── src/                        # Standalone SPA (Vite)
│   ├── main.tsx                # Vite entry point
│   ├── App.tsx                 # Recorder application
│   ├── index.css               # Global styles
│   └── components/
│       ├── VRMScene.tsx        # Three.js VRM rendering + lip-sync
│       ├── VRMAvatarDemo.tsx   # Gabber AI connection + controls
│       ├── JackAvatar3D.tsx    # R3F avatar for Remotion
│       └── RecorderControls.tsx # Recording UI controls
├── public/
│   ├── models/                 # VRM avatar models
│   └── animations/             # Mixamo FBX animations
├── index.html                  # SPA HTML entry
├── vite.config.ts              # Vite config (dev preview)
├── remotion.config.ts          # Remotion CLI config
├── package.json
└── tsconfig.json
```

## Features

### 3D Avatar Animation
- **VRM model** loading via `@pixiv/three-vrm`
- **Mixamo animation** retargeting to VRM humanoid skeleton
- **Idle animations**: breathing, blinking, head sway
- **Real-time lip-sync** via viseme mapping (Aa/Ee/Ih/Oh/Ou)
- **Smooth transitions** between expression states

### Real-Time AI (Gabber SDK)
- **WebRTC** low-latency voice connection
- **STT → LLM → TTS → Viseme** pipeline via Gabber graph
- **Live microphone** input with echo cancellation
- **AI speech output** with browser playback
- **Frame-perfect visemes** for mouth shapes

### Remotion Video Production
- **Square (1080×1080)** and **Landscape (1920×1080)** compositions
- **Intro animation** with logo, title, and grid
- **Avatar scene** with 3D character and overlays
- **End card** with links and social handles
- **Full submission** composition chaining Intro → Avatar → EndCard
- **Render to MP4** via Remotion CLI

## Quick Start

### 1. Install Dependencies

```bash
cd apps/video-recorder
pnpm install
```

### 2. Add Assets

Place your VRM model and Mixamo animations:
```
public/models/jack-avatar.vrm
public/animations/Talking.fbx
```

### 3. Remotion Studio (Preview & Render)

```bash
pnpm dev
```

This opens Remotion Studio where you can:
- Preview all compositions in real-time
- Adjust props and timing
- Render to MP4/WebM

### 4. Standalone Recorder UI

```bash
pnpm dev:preview
```

Opens the standalone recorder SPA at `http://localhost:3200` with:
- Live AI avatar mode (Gabber connection)
- Recording controls
- Scene selector

### 5. Render Final Video

```bash
# Render square avatar video
pnpm render

# Render landscape version
pnpm render:landscape

# Render both
pnpm render:all
```

## Remotion Compositions

| ID | Dimensions | Duration | Description |
|---|---|---|---|
| `JackAvatar` | 1080×1080 | 60s | Square avatar scene |
| `JackAvatarLandscape` | 1920×1080 | 60s | Landscape avatar scene |
| `Intro` | 1080×1080 | 3s | Animated intro |
| `IntroLandscape` | 1920×1080 | 3s | Landscape intro |
| `EndCard` | 1080×1080 | 5s | End card with links |
| `EndCardLandscape` | 1920×1080 | 5s | Landscape end card |
| `FullSubmission` | 1920×1080 | 68s | Complete video |

## Environment Variables

```env
GABBER_API_URL=https://api.gabber.dev/v1
GABBER_RUN_ID=jack-avatar-session
```

## Tech Stack

- **Remotion** v4 — Programmatic video rendering
- **Three.js** — 3D WebGL rendering
- **@pixiv/three-vrm** — VRM avatar support
- **@react-three/fiber** — React Three.js bindings
- **@gabber/client-react** — Real-time AI SDK
- **Vite** — Dev server for standalone preview
- **TypeScript** — End-to-end type safety

## Prerequisites

- Node.js 22+
- pnpm 8+
- A VRM avatar model (`.vrm` file)
- Mixamo animations (`.fbx` files)
- Gabber account (for real-time AI features)

## Production Tips

1. **Keep animations looping** — Avoid T-poses by never stopping the animation mixer
2. **Limit pixel ratio** — `Math.min(devicePixelRatio, 2)` prevents mobile thermal throttling
3. **Smooth viseme lerping** — Use `THREE.MathUtils.lerp` for gradual expression transitions
4. **ResizeObserver** — Handle canvas resizing dynamically
5. **Cleanup resources** — Always dispose renderers, geometries, and materials on unmount

## License

Part of the JACK Kernel monorepo. See root LICENSE for details.
