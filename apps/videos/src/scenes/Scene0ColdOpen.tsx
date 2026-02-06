import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[0]; // Cold Open

/**
 * Scene 0 — Cold Open (0:00–0:02, 60 frames)
 * Central compass-core: glowing gold ring + star shape
 * Faint cross-chain arcs around it
 * Text: JACK / XChain Exec Kernel
 */
const CompassCore3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 80, mass: 0.6 },
  });

  // Glow crescendo over the 2 seconds
  const glow = interpolate(frame, [0, durationInFrames], [0.3, 1.2], {
    extrapolateRight: "clamp",
  });

  return (
    <>
      <ParticleField count={80} color={COLORS.gold} spread={10} speed={0.15} />

      {/* ── Central gold ring (compass) ── */}
      <mesh rotation={[Math.PI / 2, 0, t * 0.6]} scale={entrance * 0.85}>
        <torusGeometry args={[0.8, 0.04, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={glow}
        />
      </mesh>

      {/* ── Inner ring (thinner) ── */}
      <mesh rotation={[Math.PI / 2, 0, -t * 0.3]} scale={entrance * 0.65}>
        <torusGeometry args={[0.8, 0.02, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={glow * 0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* ── Central star / compass point (octahedron) ── */}
      <mesh
        rotation={[0, t * 1.2, Math.PI / 4]}
        scale={entrance * 0.22}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={glow * 1.5}
        />
      </mesh>

      {/* ── Compass glow core ── */}
      <mesh scale={entrance * 0.15}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={glow * 2}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* ── Cross-chain arcs (4 faint cyan arcs) ── */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          rotation={[
            Math.PI / 2 + i * 0.4,
            t * 0.1,
            (i * Math.PI) / 2,
          ]}
          scale={entrance}
        >
          <torusGeometry args={[1.5 + i * 0.15, 0.008, 8, 60, Math.PI * 0.6]} />
          <meshStandardMaterial
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={0.3}
            transparent
            opacity={0.2 + i * 0.05}
          />
        </mesh>
      ))}
    </>
  );
};

export const Scene0ColdOpen: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
    camera={{ distance: 4.5, orbitSpeed: 0.15 }}
    narrationFile="scene0-cold-open.mp3"
    narrationDelay={8}
    narrationVolume={0.9}
  >
    <CompassCore3D />
  </SceneContainer>
);
