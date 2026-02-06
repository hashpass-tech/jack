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

const scene = SCENES[5]; // Outro

/**
 * Scene 5 — Outro (0:27–0:32, 150 frames)
 *
 * Visual:
 *  - Central compass core (gold torus + octahedron) — callback to cold open
 *  - Simplified icons from all 4 layers orbiting the compass:
 *      Layer 1 (cyan sphere = key orb)
 *      Layer 2 (small arc tube node cluster)
 *      Layer 3 (small ring with tick = settlement)
 *      Layer 4 (capsule pill = execution)
 *  - Gentle zoom out, glow crescendo
 */
const Outro3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 100, mass: 1.2 },
  });

  // Glow crescendo: grows over time
  const crescendo = interpolate(
    frame,
    [0, durationInFrames * 0.85],
    [0.5, 1.5],
    { extrapolateRight: "clamp" },
  );

  // Layer icon orbit radius
  const orbitR = 2.2;
  const orbitSpeed = 0.18;

  // 4 layer icons, evenly spaced
  const layers = [
    { color: COLORS.cyan, label: "key" },
    { color: COLORS.cyan, label: "nodes" },
    { color: COLORS.gold, label: "ring" },
    { color: COLORS.gold, label: "capsule" },
  ] as const;

  return (
    <>
      <ParticleField
        count={200}
        color={COLORS.gold}
        spread={10}
        speed={0.3}
      />

      {/* ── Central compass core ── */}
      {/* Outer gold torus */}
      <mesh
        rotation={[Math.PI / 2, 0, t * 0.15]}
        scale={entrance * (0.8 + crescendo * 0.15)}
      >
        <torusGeometry args={[0.9, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.8 * crescendo}
        />
      </mesh>
      {/* Inner torus */}
      <mesh
        rotation={[Math.PI / 2, 0, -t * 0.2]}
        scale={entrance * (0.6 + crescendo * 0.1)}
      >
        <torusGeometry args={[0.55, 0.025, 12, 48]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.5 * crescendo}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Core octahedron star */}
      <mesh
        rotation={[t * 0.3, t * 0.2, 0]}
        scale={entrance * 0.22}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={1.2 * crescendo}
        />
      </mesh>
      {/* Core glow sphere — crescendo */}
      <mesh scale={entrance * (0.3 + crescendo * 0.35)}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.5 * crescendo}
          transparent
          opacity={0.08 + crescendo * 0.08}
        />
      </mesh>

      {/* ── Orbiting layer icons ── */}
      {layers.map((layer, i) => {
        const angle = (i / layers.length) * Math.PI * 2 + t * orbitSpeed;
        const x = Math.cos(angle) * orbitR;
        const z = Math.sin(angle) * orbitR;
        const y = Math.sin(t * 0.5 + i * 1.5) * 0.2;
        const layerEntrance = spring({
          frame: frame - i * 8,
          fps,
          config: { damping: 80, mass: 0.6 },
        });

        return (
          <group key={i} position={[x, y, z]} scale={layerEntrance}>
            {/* Layer 1: Key orb (sphere) */}
            {layer.label === "key" && (
              <>
                <mesh scale={0.15}>
                  <sphereGeometry args={[1, 12, 12]} />
                  <meshStandardMaterial
                    color={COLORS.cyan}
                    emissive={COLORS.cyan}
                    emissiveIntensity={1}
                  />
                </mesh>
                {/* Lock ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]} scale={0.2}>
                  <torusGeometry args={[1, 0.08, 8, 24]} />
                  <meshStandardMaterial
                    color={COLORS.cyan}
                    emissive={COLORS.cyan}
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.6}
                  />
                </mesh>
              </>
            )}

            {/* Layer 2: Node cluster (3 small spheres in triangle) */}
            {layer.label === "nodes" && (
              <>
                {[0, 1, 2].map((n) => {
                  const na = (n / 3) * Math.PI * 2;
                  return (
                    <mesh
                      key={n}
                      position={[
                        Math.cos(na) * 0.12,
                        Math.sin(na) * 0.12,
                        0,
                      ]}
                      scale={0.06}
                    >
                      <sphereGeometry args={[1, 8, 8]} />
                      <meshStandardMaterial
                        color={COLORS.cyan}
                        emissive={COLORS.cyan}
                        emissiveIntensity={0.8}
                      />
                    </mesh>
                  );
                })}
              </>
            )}

            {/* Layer 3: Settlement ring with tick */}
            {layer.label === "ring" && (
              <>
                <mesh rotation={[Math.PI / 2, 0, t * 0.4]}>
                  <torusGeometry args={[0.14, 0.015, 8, 24]} />
                  <meshStandardMaterial
                    color={COLORS.gold}
                    emissive={COLORS.gold}
                    emissiveIntensity={0.8}
                  />
                </mesh>
                {/* Tick mark */}
                <mesh position={[0.14, 0, 0]} scale={0.03}>
                  <boxGeometry args={[1, 0.3, 0.3]} />
                  <meshStandardMaterial
                    color={COLORS.gold}
                    emissive={COLORS.gold}
                    emissiveIntensity={0.5}
                  />
                </mesh>
              </>
            )}

            {/* Layer 4: Capsule pill */}
            {layer.label === "capsule" && (
              <mesh rotation={[0, 0, Math.PI / 2]} scale={0.08}>
                <capsuleGeometry args={[1, 1.8, 6, 12]} />
                <meshStandardMaterial
                  color={COLORS.gold}
                  emissive={COLORS.gold}
                  emissiveIntensity={1}
                />
              </mesh>
            )}

            {/* Glow halo per icon */}
            <mesh scale={0.3}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshStandardMaterial
                color={layer.color}
                emissive={layer.color}
                emissiveIntensity={0.3 * crescendo}
                transparent
                opacity={0.06}
              />
            </mesh>
          </group>
        );
      })}

      {/* ── Faint connection lines (compass → each layer icon) ── */}
      {layers.map((layer, i) => {
        const angle = (i / layers.length) * Math.PI * 2 + t * orbitSpeed;
        const x = Math.cos(angle) * orbitR * 0.5;
        const z = Math.sin(angle) * orbitR * 0.5;
        return (
          <mesh
            key={`line-${i}`}
            position={[x, 0, z]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[orbitR, 0.004, 0.004]} />
            <meshStandardMaterial
              color={layer.color}
              emissive={layer.color}
              emissiveIntensity={0.2}
              transparent
              opacity={0.08}
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
    camera={{ distance: 5, orbitSpeed: 0.08, dolly: [4, 6.5] }}
  >
    <Outro3D />
  </SceneContainer>
);
