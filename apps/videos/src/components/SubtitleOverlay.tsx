import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceGrotesk } = loadSpaceGrotesk();
const { fontFamily: inter } = loadInter();

interface SubtitleOverlayProps {
  subtitles: string[];
  accentColor: string;
}

/**
 * Renders the exact on-screen subtitle text with spring entrance & fade exit.
 * Only one subtitle is visible at a time.
 */
export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  subtitles,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Divide available time into equal slots per subtitle
  const marginStart = 12;
  const marginEnd = 15;
  const available = durationInFrames - marginStart - marginEnd;
  const slotDuration = Math.floor(available / subtitles.length);

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center" }}
    >
      {subtitles.map((text, index) => {
        const startFrame = marginStart + index * slotDuration;
        const endFrame = startFrame + slotDuration;

        // Spring entrance
        const enterProgress = spring({
          frame: frame - startFrame,
          fps,
          config: { damping: 100, mass: 0.5, stiffness: 80 },
        });

        // Fade out (last 12 frames of the slot)
        const exitProgress = interpolate(
          frame,
          [endFrame - 12, endFrame],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const opacity = enterProgress * exitProgress;

        if (frame < startFrame || frame >= endFrame + 3 || opacity <= 0.01)
          return null;

        const isTitle = index === 0;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              bottom: isTitle ? 160 : 110,
              opacity,
              transform: `translateY(${(1 - enterProgress) * 35}px)`,
              textAlign: "center",
              width: "100%",
              padding: "0 140px",
            }}
          >
            <p
              style={{
                color: isTitle ? accentColor : "#F8FAFC",
                fontSize: isTitle ? 52 : 36,
                fontFamily: isTitle ? spaceGrotesk : inter,
                fontWeight: isTitle ? 800 : 600,
                letterSpacing: isTitle ? "0.06em" : "0.015em",
                textTransform: isTitle ? "uppercase" : "none",
                textShadow: "0 4px 40px rgba(0,0,0,0.85)",
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {text}
            </p>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
