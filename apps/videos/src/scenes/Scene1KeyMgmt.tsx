import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[0];

// ─── 3D content: rotating wireframe dodecahedron + protective rings + orbiting keys ───
const KeyManagement3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 120, mass: 1.2 },
  });

  return (
    <>
      <ParticleField count={150} color={COLORS.gold} spread={8} speed={0.25} />

      {/* Central rotating wireframe dodecahedron = "cryptographic key complexity" */}
      <group scale={entrance} rotation={[t * 0.3, t * 0.5, t * 0.1]}>
        <mesh>
          <dodecahedronGeometry args={[0.75, 0]} />
          <meshStandardMaterial
            color={COLORS.gold}
            wireframe
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Inner glow sphere */}
      <mesh scale={entrance * 0.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.6}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Protective ring (horizontal) */}
      <mesh rotation={[Math.PI / 2, 0, t * 0.2]} scale={entrance}>
        <torusGeometry args={[1.3, 0.025, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Second ring (tilted) */}
      <mesh rotation={[0.4, t * 0.15, Math.PI / 4]} scale={entrance}>
        <torusGeometry args={[1.55, 0.018, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Orbiting key cubes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + t * 0.4;
        const r = 1.9;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * r,
              Math.sin(t * 0.5 + i * 1.05) * 0.35,
              Math.sin(angle) * r,
            ]}
            rotation={[t + i, t * 0.5 + i, 0]}
            scale={entrance * 0.12}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.9}
            />
          </mesh>
        );
      })}
    </>
  );
};

// ─── Exported scene component ───
export const Scene1KeyMgmt: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
  >
    <KeyManagement3D />
  </SceneContainer>
);
