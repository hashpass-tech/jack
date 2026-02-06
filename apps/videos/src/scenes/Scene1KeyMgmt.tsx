import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DoubleSide } from "three";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[1]; // Layer 1

/**
 * Scene 1 — Layer 1: Secure Key Management (0:02–0:08, 180 frames)
 *
 * Visual metaphor: sealed vault around a key orb
 *  - Key orb (emissive gold sphere)
 *  - Transparent dome shield closes → lock click
 *  - Lock ring (ring + notch) rotates 90° and snaps
 *  - Blocked red particles hit shield and bounce (subtle)
 *  - Key orb emits one pulse ring outward (signing)
 */
const KeyManagement3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Dome close animation: completes at ~frame 30 (1 s into scene)
  const domeClose = spring({
    frame,
    fps,
    config: { damping: 60, mass: 1.0 },
  });

  // Lock snap at frame 30
  const lockSnap = spring({
    frame: frame - 30,
    fps,
    config: { damping: 120, mass: 0.4, stiffness: 200 },
  });

  // Signing pulse at frame 60 (2 s into scene)
  const pulseFrame = frame - 60;
  const pulseProgress =
    pulseFrame > 0
      ? interpolate(pulseFrame, [0, 50], [0, 1], {
          extrapolateRight: "clamp",
        })
      : 0;
  const pulseOpacity =
    pulseFrame > 0
      ? interpolate(pulseFrame, [0, 50], [0.7, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <>
      <ParticleField count={100} color={COLORS.gold} spread={8} speed={0.2} />

      {/* ── Key Orb (small emissive gold sphere) ── */}
      <mesh scale={0.28}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={1.4}
        />
      </mesh>

      {/* ── Signing pulse ring (expands outward at frame 60) ── */}
      {pulseProgress > 0 && (
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          scale={0.3 + pulseProgress * 2.5}
        >
          <torusGeometry args={[1, 0.04, 8, 80]} />
          <meshStandardMaterial
            color={COLORS.gold}
            emissive={COLORS.gold}
            emissiveIntensity={2}
            transparent
            opacity={pulseOpacity}
          />
        </mesh>
      )}

      {/* ── Transparent dome shield ── */}
      <mesh scale={domeClose * 0.9}>
        <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={COLORS.white}
          transparent
          opacity={0.08}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI, 0, 0]} scale={domeClose * 0.9}>
        <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={COLORS.white}
          transparent
          opacity={0.08}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Lock ring ── */}
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          interpolate(lockSnap, [0, 1], [0, Math.PI / 2]),
        ]}
        scale={domeClose * 0.95}
      >
        <torusGeometry args={[1, 0.035, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* ── Lock notch (small box) ── */}
      <mesh
        position={[
          Math.cos(interpolate(lockSnap, [0, 1], [0, Math.PI / 2])) *
            0.95 *
            domeClose,
          0,
          Math.sin(interpolate(lockSnap, [0, 1], [0, Math.PI / 2])) *
            0.95 *
            domeClose,
        ]}
        scale={domeClose * 0.08}
      >
        <boxGeometry args={[1, 1.5, 1]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* ── Blocked red particles bouncing off shield ── */}
      {Array.from({ length: 5 }).map((_, i) => {
        const attackFrame = 40 + i * 22;
        const attackProgress =
          frame > attackFrame
            ? interpolate(frame - attackFrame, [0, 18], [0, 1], {
                extrapolateRight: "clamp",
              })
            : 0;
        const bounceBack =
          frame > attackFrame + 18
            ? interpolate(frame - attackFrame - 18, [0, 12], [0, 1], {
                extrapolateRight: "clamp",
              })
            : 0;

        if (attackProgress <= 0) return null;

        const angle = (i / 5) * Math.PI * 2 + 0.5;
        const startR = 3;
        const r =
          bounceBack > 0
            ? interpolate(bounceBack, [0, 1], [1.1, 2.5])
            : interpolate(attackProgress, [0, 1], [startR, 1.1]);

        const opacity =
          bounceBack > 0
            ? interpolate(bounceBack, [0, 1], [0.6, 0])
            : interpolate(attackProgress, [0, 1], [0, 0.6]);

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * r,
              Math.sin(angle + t) * 0.3,
              Math.sin(angle) * r,
            ]}
            scale={0.05}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={COLORS.red}
              emissive={COLORS.red}
              emissiveIntensity={1.5}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </>
  );
};

export const Scene1KeyMgmt: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
    camera={{ distance: 4, orbitSpeed: 0.12, dolly: [5, 3.8] }}
    narrationFile="scene1-key-management.mp3"
    narrationDelay={12}
    entryWhoosh
    pulseAtFrame={60}
  >
    <KeyManagement3D />
  </SceneContainer>
);
