import React from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { staticFile } from "remotion";
import { BACKGROUND_AUDIO } from "../data/narration";

interface BackgroundAudioProps {
  /** Override the default ambient file path */
  ambientFile?: string;
  /** Override the default volume */
  volume?: number;
}

/**
 * Background ambient audio — plays a looping dark drone beneath the narration.
 * Uses Remotion's <Audio> with loop + volume fading.
 */
export const BackgroundAudio: React.FC<BackgroundAudioProps> = ({
  ambientFile = BACKGROUND_AUDIO.ambientFile,
  volume = BACKGROUND_AUDIO.ambientVolume,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in at the start, fade out at the end
  const fadeIn = interpolate(
    frame,
    [0, BACKGROUND_AUDIO.fadeInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const fadeOut = interpolate(
    frame,
    [durationInFrames - BACKGROUND_AUDIO.fadeOutFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const dynamicVolume = volume * fadeIn * fadeOut;

  return (
    <Audio
      src={staticFile(ambientFile)}
      volume={dynamicVolume}
      loop
    />
  );
};
