import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DoubleSide } from "three";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[3];

// ─── 3D content: spiral automation flow + agent icosahedron + floating UI planes ───
const Automation3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 120, mass: 1.2 },
  });

  const flowCount = 24;

  return (
    <>
      <ParticleField count={110} color={COLORS.gold} spread={8} speed={0.4} />

      {/* Automation flow — spiral of small spheres */}
      {Array.from({ length: flowCount }).map((_, i) => {
        const progress = ((i / flowCount + t * 0.12) % 1);
        const angle = progress * Math.PI * 4; // two full spirals
        const radius = 0.4 + progress * 1.6;
        const y = (progress - 0.5) * 3.2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              y,
              Math.sin(angle) * radius,
            ]}
            scale={entrance * (0.04 + progress * 0.06)}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.4 + progress * 0.6}
            />
          </mesh>
        );
      })}

      {/* Agent icosahedron — orbiting through the flow */}
      <mesh
        position={[
          Math.cos(t * 1.2) * 1.3,
          Math.sin(t * 0.6) * 0.6,
          Math.sin(t * 1.2) * 1.3,
        ]}
        rotation={[t * 0.8, t * 0.5, 0]}
        scale={entrance * 0.28}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={COLORS.blue}
          emissive={COLORS.blue}
          emissiveIntensity={0.65}
        />
      </mesh>

      {/* Agent glow halo */}
      <mesh
        position={[
          Math.cos(t * 1.2) * 1.3,
          Math.sin(t * 0.6) * 0.6,
          Math.sin(t * 1.2) * 1.3,
        ]}
        scale={entrance * 0.45}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={COLORS.blue}
          emissive={COLORS.blue}
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Floating interface planes */}
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + t * 0.08;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 2.4,
              (i - 1) * 0.85,
              Math.sin(angle) * 2.4,
            ]}
            rotation={[0, -angle + Math.PI, 0]}
            scale={entrance}
          >
            <planeGeometry args={[0.9, 0.55]} />
            <meshStandardMaterial
              color={COLORS.gold}
              emissive={COLORS.gold}
              emissiveIntensity={0.15}
              transparent
              opacity={0.12}
              side={DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Central axis ring */}
      <mesh rotation={[Math.PI / 2, 0, t * 0.15]} scale={entrance}>
        <torusGeometry args={[2, 0.015, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
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
  >
    <Automation3D />
  </SceneContainer>
);
