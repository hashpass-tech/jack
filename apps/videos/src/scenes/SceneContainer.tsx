import React from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraRig } from "../components/CameraRig";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { NarrationAudio } from "../components/NarrationAudio";
import { TransitionSFX } from "../components/TransitionSFX";
import { COLORS, FOG_NEAR, FOG_FAR } from "../constants";

interface CameraProps {
  distance?: number;
  orbitSpeed?: number;
  dolly?: [number, number];
  panX?: [number, number];
  lookAtY?: number;
}

interface SceneContainerProps {
  subtitles: string[];
  accentColor: string;
  secondaryColor?: string;
  camera?: CameraProps;
  /** Narration audio filename (e.g. "scene1-key-management.mp3") */
  narrationFile?: string;
  /** Narration volume override (0–1) */
  narrationVolume?: number;
  /** Delay frames before narration starts */
  narrationDelay?: number;
  /** Play a whoosh SFX at scene entry */
  entryWhoosh?: boolean;
  /** Play a pulse SFX at a specific frame */
  pulseAtFrame?: number;
  children: React.ReactNode;
}

/**
 * Shared wrapper for every scene.
 *  – Dark background (#0B1020)
 *  – ThreeCanvas with fog + lighting + CameraRig
 *  – Scene-level fade in / out
 *  – Subtitle overlay (HTML layer on top of 3D)
 */
export const SceneContainer: React.FC<SceneContainerProps> = ({
  subtitles,
  accentColor,
  secondaryColor = COLORS.cyan,
  camera = {},
  narrationFile,
  narrationVolume,
  narrationDelay,
  entryWhoosh = false,
  pulseAtFrame,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Smooth fade in / out at scene boundaries
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, opacity }}>
      {/* ─── 3D Canvas Layer ─── */}
      <AbsoluteFill>
        <ThreeCanvas linear width={width} height={height}>
          {/* Fog */}
          <fog attach="fog" args={[COLORS.darkBg, FOG_NEAR, FOG_FAR]} />

          {/* Camera rig */}
          <CameraRig {...camera} />

          {/* Lighting — soft ambient + two-point coloured lights */}
          <ambientLight intensity={0.3} />
          <pointLight
            position={[8, 6, 8]}
            intensity={1.0}
            color={accentColor}
          />
          <pointLight
            position={[-6, -4, -8]}
            intensity={0.3}
            color={secondaryColor}
          />

          {children}
        </ThreeCanvas>
      </AbsoluteFill>

      {/* ─── Subtitle Overlay (HTML) ─── */}
      <SubtitleOverlay subtitles={subtitles} accentColor={accentColor} />

      {/* ─── Audio Layers ─── */}
      {narrationFile && (
        <Sequence from={narrationDelay ?? 15}>
          <NarrationAudio
            filename={narrationFile}
            volume={narrationVolume}
            delayFrames={0}
          />
        </Sequence>
      )}
      {entryWhoosh && (
        <TransitionSFX atFrame={0} type="whoosh" volume={0.3} />
      )}
      {pulseAtFrame !== undefined && (
        <TransitionSFX atFrame={pulseAtFrame} type="pulse" volume={0.25} />
      )}

      {/* ─── Vignette (CSS) ─── */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(11,16,32,0.65) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
