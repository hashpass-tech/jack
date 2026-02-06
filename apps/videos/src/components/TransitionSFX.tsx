import React from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { staticFile } from "remotion";

interface TransitionSFXProps {
  /** Frame at which to play the whoosh */
  atFrame?: number;
  /** "whoosh" | "pulse" */
  type?: "whoosh" | "pulse";
  /** Volume 0–1 */
  volume?: number;
}

/**
 * One-shot SFX — plays a transition whoosh or UI pulse at a specific frame.
 */
export const TransitionSFX: React.FC<TransitionSFXProps> = ({
  atFrame = 0,
  type = "whoosh",
  volume = 0.35,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Only render audio after the trigger frame
  if (frame < atFrame) return null;

  // Quick fade out if near scene end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const filename = type === "whoosh" ? "sfx/whoosh.mp3" : "sfx/pulse.mp3";

  return (
    <Audio
      src={staticFile(`audio/${filename}`)}
      volume={volume * fadeOut}
      startFrom={0}
    />
  );
};
