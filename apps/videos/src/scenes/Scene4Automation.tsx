import React from "react";
import {
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DoubleSide } from "three";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[4]; // Layer 4

/**
 * Scene 4 — Layer 4: UX & Automation (0:21–0:27, 180 frames)
 *
 * Visual:
 *  - Floating rounded "intent card" plane
 *  - Card flips into a horizontal pipeline track
 *  - 3 stage dots fill sequentially (cyan → gold → green)
 *  - Capsule (pill) moves along the track toward compass core
 */
const Automation3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 100, mass: 1.0 },
  });

  // Phase 1: card floats (0-40), Phase 2: card flips (40-70), Phase 3: pipeline runs (70-180)
  const cardFlipProgress = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardFlipAngle = cardFlipProgress * Math.PI / 2; // 0 → 90°

  // Stage dots fill: dot0 @ 75, dot1 @ 100, dot2 @ 125
  const STAGE_COLORS = [COLORS.cyan, COLORS.gold, "#22C55E"];
  const STAGE_FRAMES = [75, 100, 125];
  const STAGE_X = [-1.2, 0, 1.2]; // positions along track

  // Capsule movement along track after stages fill
  const capsuleX = interpolate(frame, [130, 170], [-1.8, 2.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const capsuleOpacity = interpolate(frame, [125, 135, 165, 175], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pipeline track opacity
  const trackOpacity = interpolate(frame, [50, 70], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <ParticleField count={80} color={COLORS.gold} spread={8} speed={0.25} />

      {/* ── Intent card (floating plane) ── */}
      {cardFlipProgress < 1 && (
        <group
          position={[0, 0.3, 0]}
          rotation={[cardFlipAngle, 0, 0]}
          scale={entrance}
        >
          {/* Card body */}
          <mesh>
            <planeGeometry args={[1.6, 1.0]} />
            <meshStandardMaterial
              color={COLORS.surface}
              emissive={COLORS.cyan}
              emissiveIntensity={0.15}
              transparent
              opacity={interpolate(cardFlipProgress, [0, 1], [0.7, 0])}
              side={DoubleSide}
            />
          </mesh>
          {/* Card border glow */}
          <mesh position={[0, 0, -0.001]}>
            <planeGeometry args={[1.65, 1.05]} />
            <meshStandardMaterial
              color={COLORS.cyan}
              emissive={COLORS.cyan}
              emissiveIntensity={0.6}
              transparent
              opacity={interpolate(cardFlipProgress, [0, 1], [0.15, 0])}
              side={DoubleSide}
            />
          </mesh>
          {/* Card header line */}
          <mesh position={[0, 0.3, 0.001]}>
            <planeGeometry args={[1.2, 0.04]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.8}
              transparent
              opacity={interpolate(cardFlipProgress, [0, 1], [0.9, 0])}
              side={DoubleSide}
            />
          </mesh>
          {/* Card body lines */}
          {[0, -0.2, -0.35].map((yOff, i) => (
            <mesh key={i} position={[-0.15, yOff, 0.001]}>
              <planeGeometry args={[0.9, 0.025]} />
              <meshStandardMaterial
                color={COLORS.dimGray}
                transparent
                opacity={interpolate(cardFlipProgress, [0, 1], [0.5, 0])}
                side={DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* ── Pipeline track (horizontal bar) ── */}
      <mesh position={[0, 0, 0]} scale={entrance}>
        <boxGeometry args={[4.5, 0.02, 0.06]} />
        <meshStandardMaterial
          color={COLORS.dimGray}
          emissive={COLORS.dimGray}
          emissiveIntensity={0.3}
          transparent
          opacity={trackOpacity}
        />
      </mesh>

      {/* ── Stage dots ── */}
      {STAGE_X.map((x, i) => {
        const fillProgress = spring({
          frame: frame - STAGE_FRAMES[i],
          fps,
          config: { damping: 60, mass: 0.5 },
        });
        const isFilled = frame >= STAGE_FRAMES[i];
        return (
          <group key={i}>
            {/* Dot ring (always visible once track appears) */}
            <mesh
              position={[x, 0, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={entrance}
            >
              <torusGeometry args={[0.12, 0.015, 8, 32]} />
              <meshStandardMaterial
                color={isFilled ? STAGE_COLORS[i] : COLORS.dimGray}
                emissive={isFilled ? STAGE_COLORS[i] : COLORS.dimGray}
                emissiveIntensity={isFilled ? 0.8 : 0.1}
                transparent
                opacity={trackOpacity > 0 ? 0.8 : 0}
              />
            </mesh>
            {/* Filled dot center */}
            {isFilled && (
              <mesh position={[x, 0, 0]} scale={fillProgress * 0.1}>
                <sphereGeometry args={[1, 12, 12]} />
                <meshStandardMaterial
                  color={STAGE_COLORS[i]}
                  emissive={STAGE_COLORS[i]}
                  emissiveIntensity={1.2}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ── Capsule (pill shape) traveling along track ── */}
      {capsuleOpacity > 0 && (
        <group position={[capsuleX, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} scale={0.08}>
            <capsuleGeometry args={[1, 2, 8, 16]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={1.5}
              transparent
              opacity={capsuleOpacity}
            />
          </mesh>
          {/* Capsule trail glow */}
          <mesh scale={0.15}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.6}
              transparent
              opacity={capsuleOpacity * 0.25}
            />
          </mesh>
        </group>
      )}

      {/* ── Faint compass core (destination) ── */}
      <mesh
        position={[2.8, 0, 0]}
        rotation={[0, t * 0.3, Math.PI / 4]}
        scale={entrance * 0.25}
      >
        <torusGeometry args={[1, 0.06, 8, 32]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.5}
          transparent
          opacity={0.2}
        />
      </mesh>
    </>
  );
};

export const Scene4Automation: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
    camera={{ distance: 4.5, orbitSpeed: 0.03 }}
    narrationFile="scene4-automation.mp3"
    narrationDelay={12}
    entryWhoosh
  >
    <Automation3D />
  </SceneContainer>
);
