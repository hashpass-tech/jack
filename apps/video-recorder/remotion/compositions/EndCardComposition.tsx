/**
 * EndCardComposition — Animated end card for JACK submission video
 *
 * Features:
 * - Call-to-action links
 * - Social media handles
 * - Fade-in and out transitions
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { JACK_BRAND, COLORS } from "../../config/themes";
import { BOLD_FONT, REGULAR_FONT, MONOSPACE_FONT } from "../../config/fonts";

export interface EndCardCompositionProps {
  theme: "light" | "dark";
  links: Array<{ label: string; url: string }>;
  socialHandle: string;
}

const EndCardComposition: React.FC<EndCardCompositionProps> = ({
  theme = "dark",
  links = [
    { label: "Website", url: "jackkernel.xyz" },
    { label: "Docs", url: "docs.jackkernel.xyz" },
    { label: "GitHub", url: "github.com/jack-kernel" },
  ],
  socialHandle = "@JACKKernel",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const colors = COLORS[theme];

  // Enter animation
  const enterProgress = spring({
    fps,
    frame,
    config: { damping: 200 },
    durationInFrames: 30,
  });

  // Exit fade
  const exitOpacity =
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
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      {/* Background accent */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 40%, ${JACK_BRAND.PRIMARY}15 0%, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          textAlign: "center",
          opacity: enterProgress,
          transform: `translateY(${interpolate(enterProgress, [0, 1], [40, 0])}px)`,
        }}
      >
        {/* Thank you */}
        <h2
          style={{
            ...BOLD_FONT,
            fontSize: width > 1200 ? 56 : 42,
            color: colors.TEXT_COLOR,
            margin: "0 0 16px",
          }}
        >
          Thank You
        </h2>

        <p
          style={{
            ...REGULAR_FONT,
            fontSize: 20,
            color: colors.MUTED_TEXT,
            margin: "0 0 48px",
          }}
        >
          Built with JACK Kernel
        </p>

        {/* Links */}
        <div
          style={{
            display: "flex",
            gap: 32,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {links.map((link, i) => {
            const linkEnter = spring({
              fps,
              frame: Math.max(0, frame - 10 - i * 8),
              config: { damping: 200 },
              durationInFrames: 20,
            });

            return (
              <div
                key={link.label}
                style={{
                  opacity: linkEnter,
                  transform: `translateY(${interpolate(linkEnter, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    ...REGULAR_FONT,
                    fontSize: 14,
                    color: colors.MUTED_TEXT,
                    marginBottom: 4,
                  }}
                >
                  {link.label}
                </div>
                <div
                  style={{
                    ...MONOSPACE_FONT,
                    fontSize: 18,
                    color: JACK_BRAND.PRIMARY,
                    padding: "8px 20px",
                    border: `1px solid ${JACK_BRAND.PRIMARY}44`,
                    borderRadius: 8,
                  }}
                >
                  {link.url}
                </div>
              </div>
            );
          })}
        </div>

        {/* Social */}
        <p
          style={{
            ...MONOSPACE_FONT,
            fontSize: 16,
            color: colors.MUTED_TEXT,
            marginTop: 48,
          }}
        >
          {socialHandle}
        </p>
      </div>
    </AbsoluteFill>
  );
};

export default EndCardComposition;
