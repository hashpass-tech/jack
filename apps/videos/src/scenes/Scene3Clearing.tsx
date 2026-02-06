import React, { useMemo } from "react";
import {
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { DoubleSide } from "three";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[3]; // Layer 3

/**
 * Scene 3 — Layer 3: Decentralized Clearing (0:14–0:21, 210 frames)
 *
 * Visual:
 *  - Central rotating ring with tick marks (gold) = settlement engine
 *  - Two inbound streams (cyan + magenta) converge into ring
 *  - Policy gate (thin plane) flashes green on allow (optional red reject first)
 *  - Outbound stream (gold/white) exits cleanly
 */
const Clearing3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 100, mass: 1.0 },
  });

  // Streams approach (0–90 frames), gate event (90–120), output (120–210)
  const streamProgress = interpolate(frame, [0, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Policy gate: brief red reject (90–99), then green allow (99–120)
  const isRejectPhase = frame >= 90 && frame < 99;
  const isAllowPhase = frame >= 99 && frame < 130;
  const gateColor = isRejectPhase
    ? COLORS.red
    : isAllowPhase
      ? "#22C55E"
      : COLORS.dimGray;
  const gateOpacity = isRejectPhase || isAllowPhase ? 0.5 : 0.08;

  // Output stream after allow
  const outputProgress = interpolate(frame, [110, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tick marks around the ring
  const TICK_COUNT = 24;

  return (
    <>
      <ParticleField count={100} color={COLORS.gold} spread={8} speed={0.18} />

      {/* ── Central settlement ring ── */}
      <mesh rotation={[Math.PI / 2, 0, t * 0.35]} scale={entrance}>
        <torusGeometry args={[1.2, 0.04, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* ── Tick marks around ring ── */}
      {Array.from({ length: TICK_COUNT }).map((_, i) => {
        const angle = (i / TICK_COUNT) * Math.PI * 2 + t * 0.35;
        const r = 1.2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
            rotation={[0, -angle, 0]}
            scale={entrance}
          >
            <boxGeometry args={[0.015, 0.08, 0.06]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.4}
            />
          </mesh>
        );
      })}

      {/* ── Inbound stream: Cyan (from left) ── */}
      {Array.from({ length: 10 }).map((_, i) => {
        const p = (i / 10 + streamProgress * 0.5) % 1;
        const x = interpolate(p, [0, 1], [-4, -0.1]);
        const y = Math.sin(p * Math.PI * 3 + i) * 0.12;
        const opacity = interpolate(p, [0, 0.3, 0.9, 1], [0, 0.6, 0.6, 0]);
        return (
          <mesh key={`cyan-${i}`} position={[x, y, 0.3]} scale={0.04}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={COLORS.cyan}
              emissive={COLORS.cyan}
              emissiveIntensity={1.5}
              transparent
              opacity={opacity * streamProgress}
            />
          </mesh>
        );
      })}

      {/* ── Inbound stream: Magenta (from right) ── */}
      {Array.from({ length: 10 }).map((_, i) => {
        const p = (i / 10 + streamProgress * 0.5) % 1;
        const x = interpolate(p, [0, 1], [4, 0.1]);
        const y = Math.sin(p * Math.PI * 3 + i + 2) * 0.12;
        const opacity = interpolate(p, [0, 0.3, 0.9, 1], [0, 0.6, 0.6, 0]);
        return (
          <mesh key={`mag-${i}`} position={[x, y, -0.3]} scale={0.04}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={COLORS.magenta}
              emissive={COLORS.magenta}
              emissiveIntensity={1.5}
              transparent
              opacity={opacity * streamProgress}
            />
          </mesh>
        );
      })}

      {/* ── Policy gate (thin vertical plane) ── */}
      <mesh position={[0, 0, 0]} scale={entrance}>
        <planeGeometry args={[0.08, 2.8]} />
        <meshStandardMaterial
          color={gateColor}
          emissive={gateColor}
          emissiveIntensity={isRejectPhase || isAllowPhase ? 2 : 0.1}
          transparent
          opacity={gateOpacity}
          side={DoubleSide}
        />
      </mesh>

      {/* ── Outbound stream (gold/white, downward) ── */}
      {outputProgress > 0 &&
        Array.from({ length: 8 }).map((_, i) => {
          const p = (i / 8 + outputProgress * 0.6) % 1;
          const y = interpolate(p, [0, 1], [0, -3.5]);
          const opacity = interpolate(p, [0, 0.2, 0.8, 1], [0, 0.7, 0.7, 0]);
          return (
            <mesh key={`out-${i}`} position={[0, y, 0]} scale={0.05}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial
                color={COLORS.gold}
                emissive={COLORS.gold}
                emissiveIntensity={2}
                transparent
                opacity={opacity * outputProgress}
              />
            </mesh>
          );
        })}

      {/* ── Glow on allow confirmation ── */}
      {isAllowPhase && (
        <mesh scale={interpolate(frame - 99, [0, 20], [0.5, 2.5])}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="#22C55E"
            emissive="#22C55E"
            emissiveIntensity={1}
            transparent
            opacity={interpolate(frame - 99, [0, 30], [0.2, 0], {
              extrapolateRight: "clamp",
            })}
          />
        </mesh>
      )}
    </>
  );
};

export const Scene3Clearing: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
    camera={{ distance: 5, orbitSpeed: 0.06, dolly: [5.5, 4.2] }}
    narrationFile="scene3-clearing.mp3"
    narrationDelay={12}
    entryWhoosh
    pulseAtFrame={90}
  >
    <Clearing3D />
  </SceneContainer>
);
