/**
 * JackAvatarComposition — Remotion composition for the 3D JACK avatar
 *
 * Renders the JACK character in a Three.js scene as a Remotion video.
 * Supports both square (1080x1080) and landscape (1920x1080) layouts.
 */
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import JackAvatar3D from "../../src/components/JackAvatar3D";
import { JACK_BRAND, COLORS } from "../../config/themes";
import { BOLD_FONT, REGULAR_FONT, MONOSPACE_FONT } from "../../config/fonts";

export interface JackAvatarCompositionProps {
  theme: "light" | "dark";
  title: string;
  subtitle: string;
  showAvatar: boolean;
  visemeSequence?: Array<{ frame: number; viseme: string }>;
}

/**
 * Get the interpolated viseme for the current frame from a pre-recorded sequence
 */
function getVisemeAtFrame(
  frame: number,
  sequence: Array<{ frame: number; viseme: string }>,
): string {
  if (!sequence || sequence.length === 0) return "sil";

  let viseme = "sil";
  for (const entry of sequence) {
    if (entry.frame <= frame) {
      viseme = entry.viseme;
    } else {
      break;
    }
  }
  return viseme;
}

const JackAvatarComposition: React.FC<JackAvatarCompositionProps> = ({
  theme = "dark",
  title = "JACK Kernel",
  subtitle = "DeFi Settlement Layer",
  showAvatar = true,
  visemeSequence = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const colors = COLORS[theme];
  const currentViseme = getVisemeAtFrame(frame, visemeSequence);
  const isSpeaking = currentViseme !== "sil";

  // Title entrance animation
  const titleEnter = spring({
    fps,
    frame,
    config: { damping: 200 },
    durationInFrames: 30,
  });

  const titleOpacity = interpolate(titleEnter, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleEnter, [0, 1], [40, 0]);

  // Subtitle entrance (delayed)
  const subtitleEnter = spring({
    fps,
    frame: Math.max(0, frame - 15),
    config: { damping: 200 },
    durationInFrames: 30,
  });

  const subtitleOpacity = interpolate(subtitleEnter, [0, 1], [0, 1]);

  // Exit animation
  const exitStart = durationInFrames - 30;
  const exitProgress =
    frame > exitStart
      ? interpolate(frame, [exitStart, durationInFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const exitOpacity = 1 - exitProgress;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.BACKGROUND,
        opacity: exitOpacity,
      }}
    >
      {/* 3D Avatar Scene */}
      {showAvatar && (
        <AbsoluteFill>
          <ThreeCanvas
            width={width}
            height={height}
            orthographic={false}
            camera={{
              fov: 35,
              position: [0, 1.2, 2.5],
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 3, 2]} intensity={1.0} />
            <directionalLight
              position={[-2, 1, -1]}
              intensity={0.4}
              color="#88aaff"
            />
            <directionalLight
              position={[0, 2, -3]}
              intensity={0.3}
              color={JACK_BRAND.PRIMARY}
            />
            <JackAvatar3D
              viseme={currentViseme}
              isSpeaking={isSpeaking}
              idleIntensity={1.0}
            />
          </ThreeCanvas>
        </AbsoluteFill>
      )}

      {/* Title overlay */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0 60px 100px",
          }}
        >
          <div
            style={{
              textAlign: "center",
              opacity: titleOpacity,
              transform: `translateY(${titleTranslateY}px)`,
            }}
          >
            <h1
              style={{
                ...BOLD_FONT,
                fontSize: width > 1200 ? 64 : 48,
                color: colors.TEXT_COLOR,
                margin: 0,
                lineHeight: 1.1,
                textShadow: "0 2px 20px rgba(0,0,0,0.5)",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                ...REGULAR_FONT,
                fontSize: width > 1200 ? 28 : 22,
                color: JACK_BRAND.PRIMARY,
                margin: "12px 0 0",
                opacity: subtitleOpacity,
                letterSpacing: 2,
              }}
            >
              {subtitle}
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Bottom brand bar */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "0 0 24px",
        }}
      >
        <div
          style={{
            ...MONOSPACE_FONT,
            fontSize: 14,
            color: colors.MUTED_TEXT,
            opacity: titleOpacity * 0.6,
          }}
        >
          jackkernel.xyz
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default JackAvatarComposition;
