import React from "react";
import { Composition, Sequence } from "remotion";
import { Scene0ColdOpen } from "./scenes/Scene0ColdOpen";
import { Scene1KeyMgmt } from "./scenes/Scene1KeyMgmt";
import { Scene2MultiChain } from "./scenes/Scene2MultiChain";
import { Scene3Clearing } from "./scenes/Scene3Clearing";
import { Scene4Automation } from "./scenes/Scene4Automation";
import { Scene5Outro } from "./scenes/Scene5Outro";
import { BackgroundAudio } from "./components/BackgroundAudio";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  COLD_OPEN_DURATION,
  SCENE1_DURATION,
  SCENE2_DURATION,
  SCENE3_DURATION,
  SCENE4_DURATION,
  OUTRO_DURATION,
  TOTAL_DURATION,
} from "./constants";
import { V2_DURATIONS, V2_TOTAL_DURATION } from "./data/narration";

// ─── Full combined composition (6 scenes, 32 seconds) ───
const JACKLayeredExplainer: React.FC = () => {
  let offset = 0;
  const seq = (duration: number) => {
    const from = offset;
    offset += duration;
    return { from, durationInFrames: duration };
  };

  return (
    <>
      <Sequence {...seq(COLD_OPEN_DURATION)}>
        <Scene0ColdOpen />
      </Sequence>
      <Sequence {...seq(SCENE1_DURATION)}>
        <Scene1KeyMgmt />
      </Sequence>
      <Sequence {...seq(SCENE2_DURATION)}>
        <Scene2MultiChain />
      </Sequence>
      <Sequence {...seq(SCENE3_DURATION)}>
        <Scene3Clearing />
      </Sequence>
      <Sequence {...seq(SCENE4_DURATION)}>
        <Scene4Automation />
      </Sequence>
      <Sequence {...seq(OUTRO_DURATION)}>
        <Scene5Outro />
      </Sequence>
    </>
  );
};

// ─── V2: Full combined composition with narration + background audio (42 s) ───
const JACKExplainerV2: React.FC = () => {
  let offset = 0;
  const seq = (duration: number) => {
    const from = offset;
    offset += duration;
    return { from, durationInFrames: duration };
  };

  return (
    <>
      {/* Background ambient drone (spans entire composition) */}
      <BackgroundAudio />

      <Sequence {...seq(V2_DURATIONS.COLD_OPEN)}>
        <Scene0ColdOpen />
      </Sequence>
      <Sequence {...seq(V2_DURATIONS.SCENE1)}>
        <Scene1KeyMgmt />
      </Sequence>
      <Sequence {...seq(V2_DURATIONS.SCENE2)}>
        <Scene2MultiChain />
      </Sequence>
      <Sequence {...seq(V2_DURATIONS.SCENE3)}>
        <Scene3Clearing />
      </Sequence>
      <Sequence {...seq(V2_DURATIONS.SCENE4)}>
        <Scene4Automation />
      </Sequence>
      <Sequence {...seq(V2_DURATIONS.OUTRO)}>
        <Scene5Outro />
      </Sequence>
    </>
  );
};

// ─── Remotion Root — registers all compositions ───
export const RemotionRoot: React.FC = () => (
  <>
    {/* Individual scene compositions (for isolated rendering / preview) */}
    <Composition
      id="Scene0ColdOpen"
      component={Scene0ColdOpen}
      durationInFrames={COLD_OPEN_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene1KeyManagement"
      component={Scene1KeyMgmt}
      durationInFrames={SCENE1_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene2MultiChain"
      component={Scene2MultiChain}
      durationInFrames={SCENE2_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene3Clearing"
      component={Scene3Clearing}
      durationInFrames={SCENE3_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene4Automation"
      component={Scene4Automation}
      durationInFrames={SCENE4_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene5Outro"
      component={Scene5Outro}
      durationInFrames={OUTRO_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />

    {/* Full 32-second explainer (all 6 scenes sequenced) */}
    <Composition
      id="JACKLayeredExplainer"
      component={JACKLayeredExplainer}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />

    {/* ══════════════════════════════════════════════════════════
        V2 — With narration + background audio + extended durations
        ══════════════════════════════════════════════════════════ */}
    <Composition
      id="V2Full"
      component={JACKExplainerV2}
      durationInFrames={V2_TOTAL_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene0"
      component={Scene0ColdOpen}
      durationInFrames={V2_DURATIONS.COLD_OPEN}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene1"
      component={Scene1KeyMgmt}
      durationInFrames={V2_DURATIONS.SCENE1}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene2"
      component={Scene2MultiChain}
      durationInFrames={V2_DURATIONS.SCENE2}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene3"
      component={Scene3Clearing}
      durationInFrames={V2_DURATIONS.SCENE3}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene4"
      component={Scene4Automation}
      durationInFrames={V2_DURATIONS.SCENE4}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="V2Scene5"
      component={Scene5Outro}
      durationInFrames={V2_DURATIONS.OUTRO}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  </>
);
