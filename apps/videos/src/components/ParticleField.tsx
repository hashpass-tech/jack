import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { seededRandom } from "../constants";

interface ParticleFieldProps {
  count?: number;
  color?: string;
  spread?: number;
  speed?: number;
}

/**
 * A field of softly animated point-particles.
 * Uses deterministic seeded random for Remotion-safe re-renders.
 */
export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 150,
  color = "#F2B94B",
  spread = 8,
  speed = 0.3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pointsRef = useRef<THREE.Points>(null);

  // Deterministic base positions (stable across re-renders)
  const basePositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (seededRandom(i * 3 + 1) - 0.5) * spread;
      arr[i * 3 + 1] = (seededRandom(i * 3 + 2) - 0.5) * spread;
      arr[i * 3 + 2] = (seededRandom(i * 3 + 3) - 0.5) * spread;
    }
    return arr;
  }, [count, spread]);

  // Geometry created once
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, [count]);

  // Material created once
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.04,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    [color],
  );

  // Update positions imperatively each frame
  useEffect(() => {
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      attr.setXYZ(
        i,
        basePositions[i * 3] +
          Math.sin(t * speed + i * 0.2) * 0.2,
        basePositions[i * 3 + 1] +
          Math.cos(t * speed * 0.7 + i * 0.15) * 0.15,
        basePositions[i * 3 + 2] +
          Math.sin(t * speed * 0.9 + i * 0.1) * 0.2,
      );
    }
    attr.needsUpdate = true;
  }, [geometry, basePositions, count, t, speed]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
};
