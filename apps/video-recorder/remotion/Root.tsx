/**
 * Remotion Root — Registers all compositions for the JACK Video Recorder
 *
 * Compositions:
 * - JackAvatar: Square (1080x1080) avatar scene
 * - JackAvatarLandscape: Landscape (1920x1080) avatar scene
 * - DashboardWalkthrough: JACK narrates the dashboard (1920x1080, 90s)
 * - DashboardWalkthroughSquare: Square variant (1080x1080, 90s)
 * - Intro / IntroLandscape: Animated intro card
 * - EndCard / EndCardLandscape: Animated end card
 * - FullSubmission: Complete submission video (Intro → Dashboard → EndCard)
 */
import { Composition, Sequence } from "remotion";
import JackAvatarComposition from "./compositions/JackAvatarComposition";
import IntroComposition from "./compositions/IntroComposition";
import EndCardComposition from "./compositions/EndCardComposition";
import DashboardWalkthroughComposition from "./compositions/DashboardWalkthroughComposition";
import { FPS } from "../config/fps";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Remotion v4 strict typing requires casting FC<Props> → any for Composition component prop
const JackAvatar = JackAvatarComposition as any;
const Intro = IntroComposition as any;
const EndCard = EndCardComposition as any;
const DashboardWalkthrough = DashboardWalkthroughComposition as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Duration constants (in frames at 30fps)
const INTRO_DURATION = 90; // 3 seconds
const AVATAR_DURATION = 1800; // 60 seconds
const WALKTHROUGH_DURATION = 5402; // ~180 seconds (audio-driven, v1.0.4 pirate en-GB-Thomas)
const ENDCARD_DURATION = 150; // 5 seconds

export const RemotionRoot = () => {
  return (
    <>
      {/* === Square Compositions (1080x1080) === */}
      <Composition
        component={JackAvatar}
        id="JackAvatar"
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={AVATAR_DURATION}
        defaultProps={{
          theme: "dark" as const,
          title: "JACK Kernel",
          subtitle: "DeFi Settlement Layer",
          showAvatar: true,
          visemeSequence: [],
        }}
      />

      <Composition
        component={Intro}
        id="Intro"
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={INTRO_DURATION}
        defaultProps={{
          theme: "dark" as const,
          projectName: "JACK Kernel",
          tagline: "Autonomous DeFi Settlement Network",
        }}
      />

      <Composition
        component={EndCard}
        id="EndCard"
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={ENDCARD_DURATION}
        defaultProps={{
          theme: "dark" as const,
          links: [
            { label: "Website", url: "jackkernel.xyz" },
            { label: "Docs", url: "docs.jackkernel.xyz" },
            { label: "GitHub", url: "github.com/jack-kernel" },
          ],
          socialHandle: "@JACKKernel",
        }}
      />

      {/* === Landscape Compositions (1920x1080) === */}
      <Composition
        component={JackAvatar}
        id="JackAvatarLandscape"
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={AVATAR_DURATION}
        defaultProps={{
          theme: "dark" as const,
          title: "JACK Kernel",
          subtitle: "DeFi Settlement Layer",
          showAvatar: true,
          visemeSequence: [],
        }}
      />

      <Composition
        component={Intro}
        id="IntroLandscape"
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={INTRO_DURATION}
        defaultProps={{
          theme: "dark" as const,
          projectName: "JACK Kernel",
          tagline: "Autonomous DeFi Settlement Network",
        }}
      />

      <Composition
        component={EndCard}
        id="EndCardLandscape"
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={ENDCARD_DURATION}
        defaultProps={{
          theme: "dark" as const,
          links: [
            { label: "Website", url: "jackkernel.xyz" },
            { label: "Docs", url: "docs.jackkernel.xyz" },
            { label: "GitHub", url: "github.com/jack-kernel" },
          ],
          socialHandle: "@JACKKernel",
        }}
      />

      {/* === Full Submission Video === */}

      {/* Dashboard Walkthrough — JACK narrates the dashboard (landscape) */}
      <Composition
        component={DashboardWalkthrough}
        id="DashboardWalkthrough"
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={WALKTHROUGH_DURATION}
        defaultProps={{
          visemeSequence: [],
          captions: [
            { startFrame: 90, endFrame: 250, text: "Grrr! Welcome aboard, matey. I'm JACK, your DeFi settlement captain. Let me show you around the dashboard." },
            { startFrame: 260, endFrame: 500, text: "Arrr, this be the Create Intent tab \u2014 where every voyage across chains begins! Select your source, destination, token, and amount." },
            { startFrame: 510, endFrame: 740, text: "Intents abstract away all the bridge complexity. You set the destination, JACK charts the course. Grrr, smooth sailing!" },
            { startFrame: 760, endFrame: 1000, text: "The Executions tab shows your fleet in motion. Track each intent from pending through executing to settled. Arrr!" },
            { startFrame: 1010, endFrame: 1250, text: "Our agent-based execution guarantees atomic settlement. No partial fills, no stranded treasure. That's a captain's promise!" },
            { startFrame: 1260, endFrame: 1490, text: "You can drill into any execution to see the full lifecycle and transaction details." },
            { startFrame: 1510, endFrame: 1750, text: "Agent & Costs gives you full transparency \u2014 a wise pirate always knows where his gold goes!" },
            { startFrame: 1760, endFrame: 2000, text: "Budget tracking lets you set limits and monitor your spending as you navigate the DeFi sea." },
            { startFrame: 2010, endFrame: 2240, text: "Every doubloon is on-chain, verifiable, and transparent. Grrr \u2014 that's the JACK Kernel way!" },
            { startFrame: 2260, endFrame: 2500, text: "Ready to set sail? Connect your wallet and create your first settlement intent, matey!" },
            { startFrame: 2510, endFrame: 2690, text: "Visit testnet.jack.lukas.money to try it out. Grrr \u2014 the DeFi seas await! Let's gooo!" },
          ],
          dashboardScreenshots: {},
        }}
      />

      {/* Dashboard Walkthrough — Square variant */}
      <Composition
        component={DashboardWalkthrough}
        id="DashboardWalkthroughSquare"
        width={1080}
        height={1080}
        fps={FPS}
        durationInFrames={WALKTHROUGH_DURATION}
        defaultProps={{
          visemeSequence: [],
          captions: [],
          dashboardScreenshots: {},
        }}
      />

      {/* Full Submission: Intro → Dashboard Walkthrough → End Card */}
      <Composition
        id="FullSubmission"
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={INTRO_DURATION + WALKTHROUGH_DURATION + ENDCARD_DURATION}
        component={({ }) => {
          return (
            <>
              <Sequence from={0} durationInFrames={INTRO_DURATION}>
                <IntroComposition
                  theme="dark"
                  projectName="JACK Kernel"
                  tagline="Autonomous DeFi Settlement Network"
                />
              </Sequence>
              <Sequence from={INTRO_DURATION} durationInFrames={WALKTHROUGH_DURATION}>
                <DashboardWalkthroughComposition
                  visemeSequence={[]}
                  captions={[]}
                  dashboardScreenshots={{}}
                />
              </Sequence>
              <Sequence
                from={INTRO_DURATION + WALKTHROUGH_DURATION}
                durationInFrames={ENDCARD_DURATION}
              >
                <EndCardComposition
                  theme="dark"
                  links={[
                    { label: "Website", url: "jackkernel.xyz" },
                    { label: "Docs", url: "docs.jackkernel.xyz" },
                    { label: "GitHub", url: "github.com/jack-kernel" },
                  ]}
                  socialHandle="@JACKKernel"
                />
              </Sequence>
            </>
          );
        }}
      />
    </>
  );
};
