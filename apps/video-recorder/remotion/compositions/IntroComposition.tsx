/**
 * IntroComposition — Animated intro for JACK submission video
 *
 * Features:
 * - Particle field background
 * - JACK logo animation
 * - Title reveal with spring physics
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { JACK_BRAND, COLORS } from "../../config/themes";
import { BOLD_FONT, MONOSPACE_FONT } from "../../config/fonts";

export interface IntroCompositionProps {
  theme: "light" | "dark";
  projectName: string;
  tagline: string;
}

const IntroComposition: React.FC<IntroCompositionProps> = ({
  theme = "dark",
  projectName = "JACK Kernel",
  tagline = "Autonomous DeFi Settlement Network",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const colors = COLORS[theme];

  // Logo scale-in
  const logoScale = spring({
    fps,
    frame,
    config: { damping: 12, mass: 0.8 },
    durationInFrames: 40,
  });

  // Logo rotation
  const logoRotation = interpolate(
    spring({ fps, frame, config: { damping: 200 }, durationInFrames: 60 }),
    [0, 1],
    [Math.PI * 2, 0],
  );

  // Title enter
  const titleProgress = spring({
    fps,
    frame: Math.max(0, frame - 20),
    config: { damping: 200 },
    durationInFrames: 30,
  });

  // Tagline enter
  const taglineProgress = spring({
    fps,
    frame: Math.max(0, frame - 35),
    config: { damping: 200 },
    durationInFrames: 30,
  });

  // Background glow pulse
  const glowOpacity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.15, 0.35],
  );

  // Exit fade
  const exitFade =
    frame > durationInFrames - 20
      ? interpolate(
          frame,
          [durationInFrames - 20, durationInFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.BACKGROUND,
        overflow: "hidden",
        opacity: exitFade,
      }}
    >
      {/* Radial glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${JACK_BRAND.PRIMARY}${Math.round(
            glowOpacity * 255,
          )
            .toString(16)
            .padStart(2, "0")} 0%, transparent 60%)`,
        }}
      />

      {/* Grid lines */}
      <AbsoluteFill style={{ opacity: 0.05 }}>
        <svg width={width} height={height}>
          {Array.from({ length: 20 }).map((_, i) => (
            <React.Fragment key={i}>
              <line
                x1={0}
                y1={(i * height) / 20}
                x2={width}
                y2={(i * height) / 20}
                stroke={colors.TEXT_COLOR}
                strokeWidth={0.5}
              />
              <line
                x1={(i * width) / 20}
                y1={0}
                x2={(i * width) / 20}
                y2={height}
                stroke={colors.TEXT_COLOR}
                strokeWidth={0.5}
              />
            </React.Fragment>
          ))}
        </svg>
      </AbsoluteFill>

      {/* Logo */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${logoScale}) rotate(${logoRotation}rad)`,
            marginBottom: 120,
          }}
        >
          <svg width="120" height="120" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="jackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={JACK_BRAND.PRIMARY} />
                <stop offset="100%" stopColor={JACK_BRAND.SECONDARY} />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke="url(#jackGrad)"
              strokeWidth="4"
            />
            <text
              x="60"
              y="72"
              textAnchor="middle"
              fontSize="42"
              fontWeight="800"
              fill="url(#jackGrad)"
              fontFamily="-apple-system, sans-serif"
            >
              J
            </text>
          </svg>
        </div>
      </AbsoluteFill>

      {/* Title */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 60,
        }}
      >
        <h1
          style={{
            ...BOLD_FONT,
            fontSize: width > 1200 ? 72 : 56,
            color: colors.TEXT_COLOR,
            margin: 0,
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          {projectName}
        </h1>
        <p
          style={{
            ...MONOSPACE_FONT,
            fontSize: width > 1200 ? 24 : 18,
            color: JACK_BRAND.PRIMARY,
            margin: "20px 0 0",
            opacity: taglineProgress,
            transform: `translateY(${interpolate(taglineProgress, [0, 1], [20, 0])}px)`,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {tagline}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default IntroComposition;
