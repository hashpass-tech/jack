import React from "react";
import { Composition, Sequence } from "remotion";
import { Scene1KeyMgmt } from "./scenes/Scene1KeyMgmt";
import { Scene2MultiChain } from "./scenes/Scene2MultiChain";
import { Scene3Clearing } from "./scenes/Scene3Clearing";
import { Scene4Automation } from "./scenes/Scene4Automation";
import { Scene5Outro } from "./scenes/Scene5Outro";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  FPS,
  SCENE_DURATION,
  OUTRO_DURATION,
  TOTAL_DURATION,
} from "./constants";

// ─── Full combined composition ───
const JACKLayeredExplainer: React.FC = () => (
  <>
    <Sequence from={0} durationInFrames={SCENE_DURATION}>
      <Scene1KeyMgmt />
    </Sequence>
    <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
      <Scene2MultiChain />
    </Sequence>
    <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
      <Scene3Clearing />
    </Sequence>
    <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
      <Scene4Automation />
    </Sequence>
    <Sequence from={SCENE_DURATION * 4} durationInFrames={OUTRO_DURATION}>
      <Scene5Outro />
    </Sequence>
  </>
);

// ─── Remotion Root — registers all compositions ───
export const RemotionRoot: React.FC = () => (
  <>
    {/* Individual scene compositions (for isolated rendering) */}
    <Composition
      id="Scene1KeyManagement"
      component={Scene1KeyMgmt}
      durationInFrames={SCENE_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene2MultiChain"
      component={Scene2MultiChain}
      durationInFrames={SCENE_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene3Clearing"
      component={Scene3Clearing}
      durationInFrames={SCENE_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
    <Composition
      id="Scene4Automation"
      component={Scene4Automation}
      durationInFrames={SCENE_DURATION}
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

    {/* Full 33-second explainer (all 5 scenes sequenced) */}
    <Composition
      id="JACKLayeredExplainer"
      component={JACKLayeredExplainer}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  </>
);
