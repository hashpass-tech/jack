import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[1];

// ─── 3D content: central hub sphere + orbiting chain nodes + connecting rings ───
const MultiChain3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 120, mass: 1.2 },
  });

  // Chain node positions — 4 nodes orbiting the centre
  const chains = [0, 1, 2, 3].map((i) => {
    const angle = (i / 4) * Math.PI * 2 + t * 0.28;
    const y = Math.sin(t * 0.45 + i * 1.6) * 0.55;
    return {
      x: Math.cos(angle) * 2.1,
      y,
      z: Math.sin(angle) * 2.1,
      color: i % 2 === 0 ? COLORS.blue : COLORS.gold,
    };
  });

  return (
    <>
      <ParticleField count={160} color={COLORS.blue} spread={9} speed={0.3} />

      {/* Central hub sphere */}
      <mesh scale={entrance * 0.35}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.blue}
          emissive={COLORS.blue}
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* Glow halo around hub */}
      <mesh scale={entrance * 0.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.blue}
          emissive={COLORS.blue}
          emissiveIntensity={0.3}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Chain nodes */}
      {chains.map((c, i) => (
        <mesh
          key={i}
          position={[c.x, c.y, c.z]}
          scale={entrance * 0.22}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={c.color}
            emissive={c.color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Connecting ring (horizontal) */}
      <mesh rotation={[Math.PI / 2, 0, t * 0.18]} scale={entrance}>
        <torusGeometry args={[2.1, 0.018, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.blue}
          emissive={COLORS.blue}
          emissiveIntensity={0.35}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Outer ring (tilted) */}
      <mesh rotation={[Math.PI / 3, t * 0.1, 0]} scale={entrance}>
        <torusGeometry args={[2.6, 0.012, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.blue}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Cross ring (perpendicular) */}
      <mesh rotation={[0, t * 0.12, Math.PI / 2.5]} scale={entrance}>
        <torusGeometry args={[2.35, 0.014, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.2}
          transparent
          opacity={0.35}
        />
      </mesh>
    </>
  );
};

export const Scene2MultiChain: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
  >
    <MultiChain3D />
  </SceneContainer>
);
