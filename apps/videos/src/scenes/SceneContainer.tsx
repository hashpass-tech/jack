import React from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CameraRig } from "../components/CameraRig";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
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
