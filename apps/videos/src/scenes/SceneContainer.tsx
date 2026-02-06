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
import { COLORS } from "../constants";

interface SceneContainerProps {
  subtitles: string[];
  accentColor: string;
  secondaryColor?: string;
  children: React.ReactNode; // 3D content goes here
}

/**
 * Shared wrapper for every scene.
 *  – Dark background
 *  – ThreeCanvas with lighting + CameraRig
 *  – Scene-level fade in / out
 *  – Subtitle overlay (HTML layer on top of 3D)
 */
export const SceneContainer: React.FC<SceneContainerProps> = ({
  subtitles,
  accentColor,
  secondaryColor = COLORS.blue,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Smooth fade in / out at scene boundaries
  const opacity = interpolate(
    frame,
    [0, 18, durationInFrames - 18, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, opacity }}>
      {/* ─── 3D Canvas Layer ─── */}
      <AbsoluteFill>
        <ThreeCanvas linear width={width} height={height}>
          <CameraRig />
          <ambientLight intensity={0.35} />
          <pointLight
            position={[10, 10, 10]}
            intensity={1.2}
            color={accentColor}
          />
          <pointLight
            position={[-8, -5, -10]}
            intensity={0.35}
            color={secondaryColor}
          />
          {children}
        </ThreeCanvas>
      </AbsoluteFill>

      {/* ─── Subtitle Overlay (HTML) ─── */}
      <SubtitleOverlay subtitles={subtitles} accentColor={accentColor} />
    </AbsoluteFill>
  );
};
