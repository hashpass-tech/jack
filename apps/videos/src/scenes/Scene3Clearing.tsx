import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[2];

// ─── 3D content: descending ledger blocks + verification octahedron + settlement ring ───
const Clearing3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 120, mass: 1.2 },
  });

  const blockCount = 5;

  return (
    <>
      <ParticleField count={130} color={COLORS.green} spread={8} speed={0.2} />

      {/* Settling blocks (ledger entries descending into position) */}
      {Array.from({ length: blockCount }).map((_, i) => {
        const blockEntrance = spring({
          frame: frame - i * 12,
          fps,
          config: { damping: 80, mass: 0.8 },
        });
        const targetY = (i - (blockCount - 1) / 2) * 0.38;
        const y = interpolate(blockEntrance, [0, 1], [targetY + 4, targetY]);

        return (
          <mesh
            key={i}
            position={[0, y, 0]}
            rotation={[0, t * 0.08 + i * 0.12, 0]}
            scale={blockEntrance}
          >
            <boxGeometry args={[1.6, 0.13, 1.1]} />
            <meshStandardMaterial
              color={COLORS.green}
              emissive={COLORS.green}
              emissiveIntensity={0.15 + i * 0.08}
              transparent
              opacity={0.35 + i * 0.12}
            />
          </mesh>
        );
      })}

      {/* Wireframe verification octahedron floating above */}
      <group
        position={[0, 1.6, 0]}
        rotation={[t * 0.5, t * 0.35, 0]}
        scale={entrance * 0.45}
      >
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={COLORS.green}
            emissive={COLORS.green}
            emissiveIntensity={0.9}
            wireframe
          />
        </mesh>
      </group>

      {/* Inner glow for octahedron */}
      <mesh position={[0, 1.6, 0]} scale={entrance * 0.25}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={COLORS.green}
          emissive={COLORS.green}
          emissiveIntensity={0.5}
          transparent
          opacity={0.18}
        />
      </mesh>

      {/* Settlement ring */}
      <mesh rotation={[Math.PI / 2, 0, -t * 0.15]} scale={entrance}>
        <torusGeometry args={[1.9, 0.02, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.green}
          emissive={COLORS.green}
          emissiveIntensity={0.35}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Second ring (tilted) */}
      <mesh rotation={[0.5, t * 0.1, Math.PI / 5]} scale={entrance}>
        <torusGeometry args={[2.2, 0.014, 16, 100]} />
        <meshStandardMaterial
          color={COLORS.green}
          transparent
          opacity={0.25}
        />
      </mesh>
    </>
  );
};

export const Scene3Clearing: React.FC = () => (
  <SceneContainer
    subtitles={scene.subtitles}
    accentColor={scene.accentColor}
    secondaryColor={scene.secondaryColor}
  >
    <Clearing3D />
  </SceneContainer>
);
