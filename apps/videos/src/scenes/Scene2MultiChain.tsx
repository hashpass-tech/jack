import React, { useMemo } from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { ParticleField } from "../components/ParticleField";
import { SceneContainer } from "./SceneContainer";
import { SCENES } from "../data/scenes";
import { COLORS } from "../constants";

const scene = SCENES[2]; // Layer 2

/**
 * Scene 2 — Layer 2: Multi-Chain Connectivity (0:08–0:14, 180 frames)
 *
 * Visual: 6 node spheres in a semicircle connected by curved tube arcs.
 * An intent-packet (bright point + trail) travels across 2 hops.
 * Nodes glow when the packet arrives.
 */

// Semicircle layout for N nodes
const NODE_COUNT = 6;
const ARC_RADIUS = 2.4;

const getNodePos = (i: number): [number, number, number] => {
  const angle = (i / (NODE_COUNT - 1)) * Math.PI - Math.PI / 2;
  return [Math.cos(angle) * ARC_RADIUS, Math.sin(angle) * 0.6 - 0.2, Math.sin(angle) * ARC_RADIUS * 0.3];
};

/** Simple curved tube between two points via a midpoint raised in Y */
const ArcTube: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  opacity?: number;
}> = ({ from, to, color, opacity = 0.35 }) => {
  const curve = useMemo(() => {
    const mid: [number, number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.6,
      (from[2] + to[2]) / 2,
    ];
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(...mid),
      new THREE.Vector3(...to),
    );
  }, [from, to]);

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 32, 0.012, 8, false),
    [curve],
  );

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

export const MultiChain3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 100, mass: 1.0 },
  });

  const nodes = useMemo(() => {
    return Array.from({ length: NODE_COUNT }, (_, i) => getNodePos(i));
  }, []);

  // Packet hop 1: node 1 → node 3 (frames 30–80)
  // Packet hop 2: node 3 → node 5 (frames 80–130)
  const hop1Progress = interpolate(frame, [30, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hop2Progress = interpolate(frame, [80, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Determine packet position
  let packetPos: [number, number, number];
  if (frame < 30) {
    packetPos = nodes[1];
  } else if (frame <= 80) {
    packetPos = [
      nodes[1][0] + (nodes[3][0] - nodes[1][0]) * hop1Progress,
      nodes[1][1] + (nodes[3][1] - nodes[1][1]) * hop1Progress + Math.sin(hop1Progress * Math.PI) * 0.5,
      nodes[1][2] + (nodes[3][2] - nodes[1][2]) * hop1Progress,
    ];
  } else if (frame <= 130) {
    packetPos = [
      nodes[3][0] + (nodes[5][0] - nodes[3][0]) * hop2Progress,
      nodes[3][1] + (nodes[5][1] - nodes[3][1]) * hop2Progress + Math.sin(hop2Progress * Math.PI) * 0.5,
      nodes[3][2] + (nodes[5][2] - nodes[3][2]) * hop2Progress,
    ];
  } else {
    packetPos = nodes[5];
  }

  // Node glow: which nodes have been "arrived at"
  const nodeGlow = (i: number) => {
    if (i === 1 && frame >= 25) return 1.2;
    if (i === 3 && frame >= 75) return 1.2;
    if (i === 5 && frame >= 125) return 1.2;
    return 0.15;
  };

  return (
    <>
      <ParticleField count={120} color={COLORS.cyan} spread={10} speed={0.25} />

      {/* ── Nodes ── */}
      {nodes.map((pos, i) => (
        <mesh key={i} position={pos} scale={entrance * 0.14}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={nodeGlow(i)}
          />
        </mesh>
      ))}

      {/* ── Arcs between adjacent nodes ── */}
      {nodes.slice(0, -1).map((from, i) => (
        <ArcTube key={i} from={from} to={nodes[i + 1]} color={COLORS.cyan} />
      ))}
      {/* Skip-one arcs for visual density */}
      <ArcTube from={nodes[0]} to={nodes[2]} color={COLORS.cyan} opacity={0.15} />
      <ArcTube from={nodes[2]} to={nodes[4]} color={COLORS.cyan} opacity={0.15} />
      <ArcTube from={nodes[1]} to={nodes[4]} color={COLORS.gold} opacity={0.12} />

      {/* ── Traveling intent packet ── */}
      {frame >= 25 && frame <= 140 && (
        <>
          <mesh position={packetPos} scale={0.07}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={COLORS.white}
              emissive={COLORS.white}
              emissiveIntensity={3}
            />
          </mesh>
          {/* Glow halo around packet */}
          <mesh position={packetPos} scale={0.18}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
              color={COLORS.cyan}
              emissive={COLORS.cyan}
              emissiveIntensity={1.5}
              transparent
              opacity={0.15}
            />
          </mesh>
        </>
      )}

      {/* ── Faint compass core in background ── */}
      <mesh position={[0, -0.3, -3]} rotation={[Math.PI / 2, 0, frame / fps * 0.2]} scale={0.4}>
        <torusGeometry args={[1, 0.03, 16, 60]} />
        <meshStandardMaterial
          color={COLORS.gold}
          emissive={COLORS.gold}
          emissiveIntensity={0.25}
          transparent
          opacity={0.15}
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
    camera={{ distance: 5, orbitSpeed: 0.05, panX: [-1.5, 1.5] }}
    narrationFile="scene2-multi-chain.mp3"
    narrationDelay={12}
    entryWhoosh
  >
    <MultiChain3D />
  </SceneContainer>
);
