import React from "react";
import {
  spring,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[4];

// ─── 3D content: expanding rings + central glow + orbiting multi-color dodecahedrons ───
const Outro3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 100, mass: 1.5 },
  });

  // Slow expansion over the scene
  const expandProgress = interpolate(
    frame,
    [0, durationInFrames * 0.75],
    [0, 1],
    { extrapolateRight: "clamp" },
  );

  const ringColors = [COLORS.gold, COLORS.blue, COLORS.green];

  return (
    <>
      <ParticleField
        count={280}
        color={COLORS.gold}
        spread={11}
        speed={0.45}
      />

      {/* Central bright sphere */}
      <mesh scale={entrance * (0.35 + expandProgress * 0.25)}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Central glow halo */}
      <mesh scale={entrance * (0.7 + expandProgress * 0.4)}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.4}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Three expanding rings — one per accent colour (gold, blue, green) */}
      {ringColors.map((color, i) => (
        <mesh
          key={i}
          rotation={[
            Math.PI / 2 + i * 0.35,
            t * 0.18 * (i + 1),
            i * (Math.PI / 3),
          ]}
          scale={entrance * (1 + expandProgress * 0.4)}
        >
          <torusGeometry args={[1.6 + i * 0.45, 0.02, 16, 100]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.55}
            transparent
            opacity={0.65}
          />
        </mesh>
      ))}

      {/* Orbiting multi-colour dodecahedrons (representing all layers) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + t * 0.25;
        const r = 2.6 + Math.sin(t + i) * 0.35;
        const color =
          i % 3 === 0
            ? COLORS.gold
            : i % 3 === 1
              ? COLORS.blue
              : COLORS.green;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * r,
              Math.sin(t * 0.4 + i * 0.8) * 0.6,
              Math.sin(angle) * r,
            ]}
            rotation={[t + i, t * 0.4 + i, 0]}
            scale={entrance * 0.1}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.85}
            />
          </mesh>
        );
      })}
    </>
  );
};

export const Scene5Outro: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
  >
    <Outro3D />
  </SceneContainer>
);
