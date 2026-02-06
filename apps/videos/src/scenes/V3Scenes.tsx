import React from "react";
import { SceneContainer } from "./SceneContainer";
import { BackgroundAudio } from "../components/BackgroundAudio";
import { KeyManagement3D } from "./Scene1KeyMgmt";
import { MultiChain3D } from "./Scene2MultiChain";
import { Clearing3D } from "./Scene3Clearing";
import { Automation3D } from "./Scene4Automation";
import { COLORS } from "../constants";
import { V3_SUBTITLES } from "../data/narration-v3";

/**
 * V3 "Deep Dive" scene wrappers — 35 seconds each.
 * Reuse the same premium 3D visuals from V2 but with:
 *  - Extended narration (detailed educational voice-over)
 *  - More granular subtitles (7 per scene vs 3)
 *  - Background ambient audio per scene
 *  - Longer camera orbits for a cinematic feel
 */

// ── V3 Scene 1: Key Management (35s) ──
export const V3Scene1KeyMgmt: React.FC = () => (
  <>
    <BackgroundAudio volume={0.10} />
    <SceneContainer
      subtitles={[...V3_SUBTITLES.SCENE1]}
      accentColor={COLORS.gold}
      secondaryColor={COLORS.dimGray}
      camera={{ distance: 4, orbitSpeed: 0.06, dolly: [5, 3.2] }}
      narrationFile="v3-scene1-key-management.mp3"
      narrationDelay={18}
      narrationVolume={0.88}
      entryWhoosh
      pulseAtFrame={60}
    >
      <KeyManagement3D />
    </SceneContainer>
  </>
);

// ── V3 Scene 2: Multi-Chain Connectivity (35s) ──
export const V3Scene2MultiChain: React.FC = () => (
  <>
    <BackgroundAudio volume={0.10} />
    <SceneContainer
      subtitles={[...V3_SUBTITLES.SCENE2]}
      accentColor={COLORS.cyan}
      secondaryColor={COLORS.gold}
      camera={{ distance: 5, orbitSpeed: 0.03, panX: [-1.5, 1.5] }}
      narrationFile="v3-scene2-multi-chain.mp3"
      narrationDelay={18}
      narrationVolume={0.88}
      entryWhoosh
    >
      <MultiChain3D />
    </SceneContainer>
  </>
);

// ── V3 Scene 3: Decentralized Clearing (35s) ──
export const V3Scene3Clearing: React.FC = () => (
  <>
    <BackgroundAudio volume={0.10} />
    <SceneContainer
      subtitles={[...V3_SUBTITLES.SCENE3]}
      accentColor={COLORS.gold}
      secondaryColor={COLORS.magenta}
      camera={{ distance: 5, orbitSpeed: 0.04, dolly: [5.5, 3.8] }}
      narrationFile="v3-scene3-clearing.mp3"
      narrationDelay={18}
      narrationVolume={0.88}
      entryWhoosh
      pulseAtFrame={90}
    >
      <Clearing3D />
    </SceneContainer>
  </>
);

// ── V3 Scene 4: UX & Automation (35s) ──
export const V3Scene4Automation: React.FC = () => (
  <>
    <BackgroundAudio volume={0.10} />
    <SceneContainer
      subtitles={[...V3_SUBTITLES.SCENE4]}
      accentColor={COLORS.gold}
      secondaryColor={COLORS.cyan}
      camera={{ distance: 4.5, orbitSpeed: 0.02, dolly: [5, 3.5] }}
      narrationFile="v3-scene4-automation.mp3"
      narrationDelay={18}
      narrationVolume={0.88}
      entryWhoosh
    >
      <Automation3D />
    </SceneContainer>
  </>
);
