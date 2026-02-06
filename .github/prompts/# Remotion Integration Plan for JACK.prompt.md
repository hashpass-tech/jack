# Remotion Integration Plan for JACK

## Overview

Add programmatic video compositions to JACK's landing page and dashboard to create dynamic, evolving explanations of each layer with voice-over narration.

**Goals**:
1. Create animated video compositions for each JACK layer (Intent, Solver, Privacy, Execution, Settlement)
2. Embed videos in layer detail modals
3. Add subtle animated overlays on 3D scene
4. Generate voice-over narrations programmatically
5. Export videos for marketing/documentation

---

## Architecture

### New Workspace Structure
```
apps/
  remotion/              # New Remotion playground
    package.json
    remotion.config.ts
    tsconfig.json
    public/              # Static assets
    src/
      index.ts           # Entry point
      Root.tsx           # Remotion compositions registry
      compositions/      # Video compositions
        IntentLayer.tsx
        SolverLayer.tsx
        PrivacyLayer.tsx
        ExecutionLayer.tsx
        SettlementLayer.tsx
        FullStackDemo.tsx
      components/        # Reusable video components
        AnimatedText.tsx
        LayerTransition.tsx
        CodeBlock.tsx
        BenefitsList.tsx
        NetworkDiagram.tsx
      assets/            # Video assets
        voice-overs/
        graphics/
        fonts/
      utils/
        timing.ts
        animations.ts
    scripts/
      generate-voice-overs.ts
      render-all.ts
      render-preview.ts
```

### Integration Points

**Landing Page** (`apps/landing/LandingPage.tsx`):
- Add `<Player>` component from `@remotion/player` in layer modals
- Trigger video playback when modal opens
- Sync 3D layer selection with video playback

**Dashboard** (`apps/dashboard`):
- Embed explainer videos in help tooltips
- Add animated onboarding flow
- Tutorial videos for intent creation

---

## Phase 1: Setup Remotion Workspace (2 hours)

### 1. Create New App Structure

```bash
mkdir -p apps/remotion/src/compositions
mkdir -p apps/remotion/src/components
mkdir -p apps/remotion/src/assets/voice-overs
mkdir -p apps/remotion/src/utils
mkdir -p apps/remotion/scripts
mkdir -p apps/remotion/public/previews
```

### 2. Initialize Package

**File**: `apps/remotion/package.json`
```json
{
  "name": "@jack/remotion",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts",
    "preview": "remotion preview src/index.ts",
    "render:all": "tsx scripts/render-all.ts",
    "render:previews": "tsx scripts/render-preview.ts",
    "voices": "tsx scripts/generate-voice-overs.ts"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "4.0.418",
    "@remotion/cli": "4.0.418",
    "@remotion/player": "4.0.418",
    "@remotion/renderer": "4.0.418",
    "@remotion/google-fonts": "4.0.418",
    "@remotion/media-utils": "4.0.418",
    "@remotion/shapes": "4.0.418",
    "@remotion/transitions": "4.0.418",
    "@remotion/paths": "4.0.418"
  },
  "devDependencies": {
    "@remotion/eslint-plugin": "4.0.418",
    "@types/react": "^18.3.3",
    "@types/node": "^25.2.0",
    "typescript": "^5.0.0",
    "tsx": "^4.21.0"
  }
}
```

### 3. Create TypeScript Config

**File**: `apps/remotion/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "scripts"],
  "exclude": ["node_modules"]
}
```

### 4. Create Remotion Config

**File**: `apps/remotion/remotion.config.ts`
```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
Config.setPort(9000);
Config.setPublicDir('./public');
```

### 5. Create Entry Point

**File**: `apps/remotion/src/index.ts`
```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

**File**: `apps/remotion/src/Root.tsx`
```tsx
import React from 'react';
import { Composition } from 'remotion';
import { IntentLayerExplanation } from './compositions/IntentLayer';
import { SolverLayerExplanation } from './compositions/SolverLayer';
import { PrivacyLayerExplanation } from './compositions/PrivacyLayer';
import { ExecutionLayerExplanation } from './compositions/ExecutionLayer';
import { SettlementLayerExplanation } from './compositions/SettlementLayer';
import { FullStackDemo } from './compositions/FullStackDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Individual layer explanations (15s each) */}
      <Composition
        id="IntentLayer"
        component={IntentLayerExplanation}
        durationInFrames={450}  // 15s at 30fps
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accentColor: '#F2B94B'
        }}
      />
      
      <Composition
        id="SolverLayer"
        component={SolverLayerExplanation}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accentColor: '#38BDF8'
        }}
      />
      
      <Composition
        id="PrivacyLayer"
        component={PrivacyLayerExplanation}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accentColor: '#A855F7'
        }}
      />
      
      <Composition
        id="ExecutionLayer"
        component={ExecutionLayerExplanation}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accentColor: '#34D399'
        }}
      />
      
      <Composition
        id="SettlementLayer"
        component={SettlementLayerExplanation}
        durationInFrames={450}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          accentColor: '#EF4444'
        }}
      />
      
      {/* Full stack demo (60s) */}
      <Composition
        id="FullStackDemo"
        component={FullStackDemo}
        durationInFrames={1800}  // 60s at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

### 6. Update PNPM Workspace

**File**: `pnpm-workspace.yaml` (add)
```yaml
packages:
  - '.'
  - 'apps/**'
  - 'packages/*'
  - 'contracts'
  - 'docs'
```

### 7. Install Dependencies

```bash
cd apps/remotion
pnpm install
```

---

## Phase 2: Create Reusable Components (2 hours)

### AnimatedText Component

**File**: `apps/remotion/src/components/AnimatedText.tsx`
```tsx
import React, { CSSProperties } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const AnimatedText: React.FC<{
  text: string;
  fontSize: number;
  color: string;
  delay?: number;
  style?: CSSProperties;
}> = ({ text, fontSize, color, delay = 0, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 }
  });

  const translateY = spring({
    frame: frame - delay,
    fps,
    from: 30,
    to: 0,
    config: { damping: 200 }
  });

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight: 700,
        opacity,
        transform: `translateY(${translateY}px)`,
        textAlign: 'center',
        ...style
      }}
    >
      {text}
    </div>
  );
};
```

### CodeBlock Component

**File**: `apps/remotion/src/components/CodeBlock.tsx`
```tsx
import React from 'react';
import { interpolate, Easing } from 'remotion';

export const CodeBlock: React.FC<{
  code: string;
  language: string;
  accentColor: string;
  animateFrom: number;
}> = ({ code, language, accentColor, animateFrom }) => {
  const lines = code.split('\n');
  
  return (
    <div
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 30,
        fontFamily: 'monospace',
        fontSize: 20,
        lineHeight: 1.6,
        border: `2px solid ${accentColor}40`,
        maxWidth: 800
      }}
    >
      {lines.map((line, i) => {
        const charDelay = i * 3;
        const visibleChars = Math.floor(
          interpolate(
            animateFrom,
            [charDelay, charDelay + 20],
            [0, line.length],
            { extrapolateRight: 'clamp', easing: Easing.ease }
          )
        );
        
        return (
          <div key={i} style={{ color: '#e0e0e0' }}>
            {line.slice(0, visibleChars)}
            <span
              style={{
                opacity: visibleChars < line.length ? 1 : 0,
                color: accentColor
              }}
            >
              ▌
            </span>
          </div>
        );
      })}
    </div>
  );
};
```

### LayerTransition Component

**File**: `apps/remotion/src/components/LayerTransition.tsx`
```tsx
import React from 'react';
import { interpolate } from 'remotion';

export const LayerTransition: React.FC<{
  from: string;
  to: string;
  progress: number;
  accentColor: string;
}> = ({ from, to, progress, accentColor }) => {
  const arrowOpacity = interpolate(progress, [0.3, 0.5], [0, 1]);
  const toOpacity = interpolate(progress, [0.6, 0.8], [0, 1]);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      <Box text={from} color="#666" opacity={1} />
      
      <svg width="100" height="40" style={{ opacity: arrowOpacity }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={accentColor} />
          </marker>
        </defs>
        <line
          x1="0"
          y1="20"
          x2="90"
          y2="20"
          stroke={accentColor}
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
      </svg>
      
      <Box text={to} color={accentColor} opacity={toOpacity} />
    </div>
  );
};

const Box: React.FC<{
  text: string;
  color: string;
  opacity: number;
}> = ({ text, color, opacity }) => (
  <div
    style={{
      padding: '20px 40px',
      border: `2px solid ${color}`,
      borderRadius: 8,
      color,
      fontSize: 32,
      fontWeight: 600,
      opacity,
      minWidth: 200,
      textAlign: 'center'
    }}
  >
    {text}
  </div>
);
```

### BenefitsList Component

**File**: `apps/remotion/src/components/BenefitsList.tsx`
```tsx
import React from 'react';
import { spring, useVideoConfig } from 'remotion';

export const BenefitsList: React.FC<{
  items: string[];
  accentColor: string;
  startFrame: number;
}> = ({ items, accentColor, startFrame }) => {
  const { fps } = useVideoConfig();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {items.map((item, i) => {
        const delay = i * 15; // Stagger by 0.5s
        const opacity = spring({
          frame: startFrame - delay,
          fps,
          config: { damping: 200 }
        });
        
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              opacity
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: accentColor
              }}
            />
            <span style={{ fontSize: 36, color: '#ffffff' }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};
```

---

## Phase 3: Create Layer Compositions (8 hours)

### Intent Layer Video (15 seconds)

**File**: `apps/remotion/src/compositions/IntentLayer.tsx`

```tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  Sequence
} from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { CodeBlock } from '../components/CodeBlock';
import { LayerTransition } from '../components/LayerTransition';
import { BenefitsList } from '../components/BenefitsList';

export const IntentLayerExplanation: React.FC<{
  accentColor: string;
}> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing breakdown (30fps):
  // 0-90: Intro text fade in (3s)
  // 90-180: Code example appears (3s)
  // 180-270: Transformation animation (3s)
  // 270-360: Benefits list (3s)
  // 360-450: Fade out (3s)

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Voice-over audio */}
      <Audio src="/voice-overs/intent-layer.mp3" />
      
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)`,
          opacity: spring({
            frame: frame - 30,
            fps,
            config: { damping: 200 }
          })
        }}
      />

      {/* Sequence 1: Title (0-3s) */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <AnimatedText
            text="INTENT LAYER"
            fontSize={72}
            color={accentColor}
            delay={0}
          />
          <AnimatedText
            text="Express what you want, not how to do it"
            fontSize={32}
            color="#ffffff"
            delay={30}
            style={{ marginTop: 20 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 2: Code Example (3-6s) */}
      <Sequence from={90} durationInFrames={90}>
        <AbsoluteFill style={{ padding: 60, justifyContent: 'center' }}>
          <CodeBlock
            code={`const intent = {
  from: "Arbitrum",
  to: "Base",
  swap: {
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountIn: "1000"
  },
  constraints: {
    minAmountOut: "0.45",
    maxSlippage: "0.5%",
    deadline: Date.now() + 300000
  }
}`}
            language="typescript"
            accentColor={accentColor}
            animateFrom={frame - 90}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 3: Transformation (6-9s) */}
      <Sequence from={180} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <LayerTransition
            from="User Intent"
            to="Execution Plan"
            progress={interpolate(frame - 180, [0, 90], [0, 1])}
            accentColor={accentColor}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 4: Benefits (9-12s) */}
      <Sequence from={270} durationInFrames={90}>
        <AbsoluteFill style={{ padding: 60, justifyContent: 'center' }}>
          <BenefitsList
            items={[
              'No manual route planning',
              'Privacy-first by design',
              'Automatic optimization',
              'Cross-chain abstraction'
            ]}
            accentColor={accentColor}
            startFrame={frame - 270}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Sequence 5: Outro (12-15s) */}
      <Sequence from={360} durationInFrames={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: interpolate(frame - 360, [0, 90], [1, 0])
          }}
        >
          <AnimatedText
            text="JACK handles the rest"
            fontSize={48}
            color={accentColor}
            delay={0}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
```

### Solver Layer Video

**File**: `apps/remotion/src/compositions/SolverLayer.tsx`

```tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  Sequence
} from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { BenefitsList } from '../components/BenefitsList';

export const SolverLayerExplanation: React.FC<{
  accentColor: string;
}> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Audio src="/voice-overs/solver-layer.mp3" />
      
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)`,
          opacity: spring({ frame: frame - 30, fps, config: { damping: 200 } })
        }}
      />

      {/* Title */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <AnimatedText
            text="SOLVER LAYER"
            fontSize={72}
            color={accentColor}
            delay={0}
          />
          <AnimatedText
            text="Competitive autonomous execution"
            fontSize={32}
            color="#ffffff"
            delay={30}
            style={{ marginTop: 20 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Solver Network Visualization (3-9s) */}
      <Sequence from={90} durationInFrames={180}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <SolverNetwork
            accentColor={accentColor}
            animationProgress={interpolate(frame - 90, [0, 180], [0, 1])}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Benefits (9-12s) */}
      <Sequence from={270} durationInFrames={90}>
        <AbsoluteFill style={{ padding: 60, justifyContent: 'center' }}>
          <BenefitsList
            items={[
              'Multiple solvers compete',
              'Best execution guaranteed',
              'Bond-backed reliability',
              'Real-time optimization'
            ]}
            accentColor={accentColor}
            startFrame={frame - 270}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Outro (12-15s) */}
      <Sequence from={360} durationInFrames={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: interpolate(frame - 360, [0, 90], [1, 0])
          }}
        >
          <AnimatedText
            text="Competition ensures excellence"
            fontSize={48}
            color={accentColor}
            delay={0}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const SolverNetwork: React.FC<{
  accentColor: string;
  animationProgress: number;
}> = ({ accentColor, animationProgress }) => {
  const solvers = ['Yellow Fusion+', 'Cross Bridge', 'Quick Route'];
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {solvers.map((name, i) => {
        const delay = i * 0.2;
        const opacity = interpolate(animationProgress, [delay, delay + 0.2], [0, 1]);
        
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              opacity
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: 32, color: '#ffffff' }}>{name}</div>
            {i === 0 && (
              <div
                style={{
                  marginLeft: 20,
                  padding: '8px 16px',
                  backgroundColor: `${accentColor}30`,
                  borderRadius: 4,
                  fontSize: 20,
                  color: accentColor,
                  opacity: interpolate(animationProgress, [0.8, 1], [0, 1])
                }}
              >
                ✓ Winner
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### Privacy Layer Video

**File**: `apps/remotion/src/compositions/PrivacyLayer.tsx`

```tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  Sequence
} from 'remotion';
import { AnimatedText } from '../components/AnimatedText';
import { BenefitsList } from '../components/BenefitsList';

export const PrivacyLayerExplanation: React.FC<{
  accentColor: string;
}> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      <Audio src="/voice-overs/privacy-layer.mp3" />
      
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, transparent 70%)`,
          opacity: spring({ frame: frame - 30, fps, config: { damping: 200 } })
        }}
      />

      {/* Title */}
      <Sequence from={0} durationInFrames={90}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <AnimatedText
            text="PRIVACY LAYER"
            fontSize={72}
            color={accentColor}
            delay={0}
          />
          <AnimatedText
            text="Confidential constraint enforcement"
            fontSize={32}
            color="#ffffff"
            delay={30}
            style={{ marginTop: 20 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Encryption Visualization (3-9s) */}
      <Sequence from={90} durationInFrames={180}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <EncryptionFlow
            accentColor={accentColor}
            animationProgress={interpolate(frame - 90, [0, 180], [0, 1])}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Benefits (9-12s) */}
      <Sequence from={270} durationInFrames={90}>
        <AbsoluteFill style={{ padding: 60, justifyContent: 'center' }}>
          <BenefitsList
            items={[
              'MEV protection',
              'Encrypted constraints',
              'Privacy-preserving proofs',
              'Fhenix FHE integration'
            ]}
            accentColor={accentColor}
            startFrame={frame - 270}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Outro */}
      <Sequence from={360} durationInFrames={90}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            opacity: interpolate(frame - 360, [0, 90], [1, 0])
          }}
        >
          <AnimatedText
            text="Privacy without compromise"
            fontSize={48}
            color={accentColor}
            delay={0}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const EncryptionFlow: React.FC<{
  accentColor: string;
  animationProgress: number;
}> = ({ accentColor, animationProgress }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 60 }}>
      <DataBox
        label="Plain"
        content="minOut: 0.45"
        locked={false}
        opacity={interpolate(animationProgress, [0, 0.2], [0, 1])}
      />
      
      <Arrow
        color={accentColor}
        opacity={interpolate(animationProgress, [0.3, 0.5], [0, 1])}
      />
      
      <DataBox
        label="Encrypted"
        content="🔒 [ENCRYPTED]"
        locked={true}
        opacity={interpolate(animationProgress, [0.6, 0.8], [0, 1])}
        color={accentColor}
      />
    </div>
  );
};

const DataBox: React.FC<{
  label: string;
  content: string;
  locked: boolean;
  opacity: number;
  color?: string;
}> = ({ label, content, locked, opacity, color = '#666' }) => (
  <div style={{ opacity, textAlign: 'center' }}>
    <div style={{ fontSize: 24, color: '#888', marginBottom: 10 }}>{label}</div>
    <div
      style={{
        padding: '30px 40px',
        border: `2px solid ${color}`,
        borderRadius: 8,
        fontSize: 28,
        color: locked ? color : '#fff',
        minWidth: 250
      }}
    >
      {content}
    </div>
  </div>
);

const Arrow: React.FC<{ color: string; opacity: number }> = ({ color, opacity }) => (
  <svg width="80" height="40" style={{ opacity }}>
    <defs>
      <marker
        id="arrow-privacy"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="3"
        orient="auto"
      >
        <polygon points="0 0, 10 3, 0 6" fill={color} />
      </marker>
    </defs>
    <line
      x1="0"
      y1="20"
      x2="70"
      y2="20"
      stroke={color}
      strokeWidth="3"
      markerEnd="url(#arrow-privacy)"
    />
  </svg>
);
```

### Execution Layer & Settlement Layer

**Similar structure** - create:
- `apps/remotion/src/compositions/ExecutionLayer.tsx`
- `apps/remotion/src/compositions/SettlementLayer.tsx`

With appropriate visualizations for:
- Execution: Cross-chain routing diagram with bridges
- Settlement: Uniswap v4 hook policy check flow

---

## Phase 4: Voice-Over Integration (3 hours)

### 1. Voice-Over Scripts

**File**: `apps/remotion/scripts/voice-scripts.ts`

```typescript
export const voiceScripts = {
  'intent-layer': `The Intent Layer is where users express their cross-chain goals.
Instead of manually selecting routes and venues, you simply describe what you want.
JACK's autonomous kernel handles the complexity, finding the optimal path while respecting your constraints.
Express intent, not implementation.`,
  
  'solver-layer': `The Solver Layer is powered by competitive autonomous agents.
Multiple solvers bid to fulfill your intent, optimizing for speed, cost, and reliability.
The winning solver posts a bond and executes your cross-chain transaction.
Competition ensures the best execution, every time.`,
  
  'privacy-layer': `The Privacy Layer protects your execution strategy from MEV extraction.
Using Fhenix's confidential compute, your constraints remain encrypted on-chain.
Solvers prove constraint satisfaction without revealing sensitive details.
Privacy without compromising verifiability.`,
  
  'execution-layer': `The Execution Layer orchestrates your multi-chain journey.
Routes are dynamically selected across bridges, DEXs, and liquidity pools.
Each step is monitored in real-time with automatic fallback handling.
Seamless cross-chain execution, from start to settlement.`,
  
  'settlement-layer': `The Settlement Layer enforces policies at the final swap.
Uniswap v4 hooks check slippage bounds, oracle prices, and custom rules.
If constraints aren't met, the transaction reverts on-chain.
Policy enforcement you can trust, backed by smart contracts.`
};
```

### 2. Voice-Over Generator (Optional)

**File**: `apps/remotion/scripts/generate-voice-overs.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { voiceScripts } from './voice-scripts';

// Example using ElevenLabs (requires API key)
async function generateVoiceOvers() {
  console.log('Voice-over generation script');
  console.log('Option 1: Use ElevenLabs API');
  console.log('Option 2: Use Google TTS');
  console.log('Option 3: Record manually');
  console.log('\nScripts ready for generation:');
  
  for (const [name, text] of Object.entries(voiceScripts)) {
    console.log(`\n📝 ${name}:`);
    console.log(text);
    console.log(`   Duration: ~${text.split(' ').length / 2.5}s`);
  }
  
  console.log('\nSave MP3 files to: apps/remotion/public/voice-overs/');
}

generateVoiceOvers();
```

---

## Phase 5: Landing Page Integration (4 hours)

### 1. Install Player in Landing

```bash
cd apps/landing
pnpm add @remotion/player
```

### 2. Update Layer Modal with Video

**File**: `apps/landing/LandingPage.tsx` (add to imports)

```tsx
import { Player } from '@remotion/player';
import { lazy } from 'react';
```

**Add composition mapping function:**

```tsx
const getCompositionForLayer = (layerName: string) => {
  const mapping: Record<string, any> = {
    'INTENT': lazy(() => import('@jack/remotion/src/compositions/IntentLayer')),
    'ROUTE': lazy(() => import('@jack/remotion/src/compositions/SolverLayer')),
    'CONSTRAINTS': lazy(() => import('@jack/remotion/src/compositions/PrivacyLayer')),
    'EXECUTION': lazy(() => import('@jack/remotion/src/compositions/ExecutionLayer')),
    'SETTLEMENT': lazy(() => import('@jack/remotion/src/compositions/SettlementLayer'))
  };
  return mapping[layerName];
};

const getAccentColorForLayer = (layerName: string): string => {
  const colors: Record<string, string> = {
    'INTENT': '#F2B94B',
    'ROUTE': '#38BDF8',
    'CONSTRAINTS': '#A855F7',
    'EXECUTION': '#34D399',
    'SETTLEMENT': '#EF4444'
  };
  return colors[layerName] || '#F2B94B';
};
```

**Update modal JSX (find the layer modal section):**

```tsx
{activeModalLayer && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="relative bg-black border border-[#F2B94B]/30 rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      {/* Close button */}
      <button
        onClick={() => setActiveModalLayer(null)}
        className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl"
      >
        ✕
      </button>
      
      {/* Video Player */}
      <div className="mb-6 rounded-lg overflow-hidden">
        <Player
          component={getCompositionForLayer(activeModalLayer)}
          durationInFrames={450}
          fps={30}
          compositionWidth={1280}
          compositionHeight={720}
          controls
          autoPlay
          loop={false}
          style={{
            width: '100%',
            aspectRatio: '16/9'
          }}
          inputProps={{
            accentColor: getAccentColorForLayer(activeModalLayer)
          }}
        />
      </div>
      
      {/* Layer explanation text */}
      <h2 className="text-3xl font-bold mb-4" style={{ color: getAccentColorForLayer(activeModalLayer) }}>
        {activeModalLayer} LAYER
      </h2>
      <p className="text-white/80 text-lg leading-relaxed">
        {layerExplanations[activeModalLayer]}
      </p>
    </div>
  </div>
)}
```

---

## Phase 6: Dashboard Integration (2 hours)

### 1. Onboarding Video

**File**: `apps/dashboard/src/components/OnboardingVideo.tsx`

```tsx
'use client';

import { Player } from '@remotion/player';
import { useState, lazy } from 'react';

const FullStackDemo = lazy(() => import('@jack/remotion/src/compositions/FullStackDemo'));

export const OnboardingVideo: React.FC = () => {
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && localStorage.getItem('onboarding-dismissed') === 'true'
  );
  
  if (dismissed) return null;
  
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding-dismissed', 'true');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl p-6 max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to JACK</h2>
        
        <Player
          component={FullStackDemo}
          durationInFrames={1800}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          controls
          autoPlay
          style={{ width: '100%', aspectRatio: '16/9' }}
        />
        
        <button
          onClick={handleDismiss}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-semibold"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};
```

### 2. Add to Dashboard

**File**: `apps/dashboard/src/components/Dashboard.tsx` (add)

```tsx
import { OnboardingVideo } from './OnboardingVideo';

// In component JSX:
<OnboardingVideo />
```

---

## Phase 7: Video Rendering Pipeline (2 hours)

### Render All Script

**File**: `apps/remotion/scripts/render-all.ts`

```typescript
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

const compositions = [
  'IntentLayer',
  'SolverLayer',
  'PrivacyLayer',
  'ExecutionLayer',
  'SettlementLayer',
  'FullStackDemo'
];

async function renderAll() {
  console.log('Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: path.join(__dirname, '../src/index.ts'),
    webpackOverride: (config) => config
  });
  
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const compositionId of compositions) {
    console.log(`\nRendering ${compositionId}...`);
    
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId
    });
    
    const outputPath = path.join(outputDir, `${compositionId}.mp4`);
    
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outputPath,
      concurrency: 4
    });
    
    console.log(`✓ Saved to ${outputPath}`);
  }
  
  console.log('\n✅ All videos rendered successfully!');
}

renderAll().catch(console.error);
```

---

## Timeline & Priority

### Day 1 (Setup + Core Components)
- [ ] Create `apps/remotion` workspace structure
- [ ] Install dependencies and configure
- [ ] Create entry point and Root.tsx
- [ ] Build reusable components (AnimatedText, CodeBlock, etc.)
- [ ] Test in Remotion Studio (`pnpm studio`)

### Day 2 (Layer Compositions + Voice)
- [ ] Implement all 5 layer compositions
- [ ] Create voice-over scripts
- [ ] Generate or record voice-overs
- [ ] Test compositions with audio sync

### Day 3 (Integration)
- [ ] Install Player in landing and dashboard
- [ ] Integrate videos into layer modals
- [ ] Add onboarding video
- [ ] Render final videos
- [ ] Test on staging environment

---

## Success Criteria

### Functional
- [ ] All 5 layer videos render without errors
- [ ] Videos play smoothly in modals
- [ ] Voice-over sync is accurate
- [ ] Player controls work (play/pause/scrub)
- [ ] Mobile layout is responsive

### Quality
- [ ] Videos match JACK brand aesthetic
- [ ] Animations are 60fps smooth
- [ ] Voice-over quality is professional
- [ ] Text is readable at all sizes
- [ ] Audio levels are consistent

### Performance
- [ ] Page load time impact <500ms
- [ ] Video loading is non-blocking
- [ ] No memory leaks on repeated plays
- [ ] Smooth playback on modern devices

---

## Resources

### Documentation
- [Remotion Docs](https://remotion.dev/docs)
- [Player API](https://remotion.dev/docs/player)
- [Audio Guide](https://remotion.dev/docs/using-audio)

### Voice Services
- [ElevenLabs](https://elevenlabs.io) - AI voice
- [Google TTS](https://cloud.google.com/text-to-speech)
- [OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech)

### Assets
- [Google Fonts](https://fonts.google.com)
- [Lucide Icons](https://lucide.dev)
