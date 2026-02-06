import React from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { staticFile } from "remotion";

interface NarrationAudioProps {
  /** Filename in public/audio/narration/ (e.g. "scene1-key-management.mp3") */
  filename: string;
  /** Volume 0–1 (default 0.85) */
  volume?: number;
  /** Delay in frames before narration starts (default 15) — allows scene to fade in first */
  delayFrames?: number;
}

/**
 * Narration voice-over audio component.
 * Plays a pre-generated TTS audio file with volume ducking at scene boundaries.
 */
export const NarrationAudio: React.FC<NarrationAudioProps> = ({
  filename,
  volume = 0.85,
  delayFrames = 15,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Duck volume at start and end of scene for smooth transitions
  const fadeIn = interpolate(frame, [delayFrames, delayFrames + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const dynamicVolume = volume * fadeIn * fadeOut;

  return (
    <Audio
      src={staticFile(`audio/narration/${filename}`)}
      volume={dynamicVolume}
      startFrom={0}
    />
  );
};
