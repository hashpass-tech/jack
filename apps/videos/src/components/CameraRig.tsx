import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import * as THREE from "three";

interface CameraRigProps {
  distance?: number;
  /** Optional: orbit speed in radians per second */
  orbitSpeed?: number;
  /** Optional: dolly-in range [startDistance, endDistance] */
  dolly?: [number, number];
  /** Optional: pan offset [startX, endX] */
  panX?: [number, number];
  /** Optional: vertical offset */
  lookAtY?: number;
}

/**
 * Animated camera rig — supports orbit, dolly, and pan.
 * Must be placed inside a <ThreeCanvas>.
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  distance = 5,
  orbitSpeed = 0,
  dolly,
  panX,
  lookAtY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { invalidate } = useThree();
  const camera = useThree((s) => s.camera);
  const t = frame / fps;

  useEffect(() => {
    // Dolly
    const d = dolly
      ? interpolate(frame, [0, durationInFrames], dolly, {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : distance;

    // Pan
    const px = panX
      ? interpolate(frame, [0, durationInFrames], panX, {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

    // Orbit
    const angle = orbitSpeed * t;

    camera.position.set(
      px + Math.sin(angle) * d,
      0.2,
      Math.cos(angle) * d,
    );
    camera.near = 0.1;
    camera.far = 100;
    camera.lookAt(new THREE.Vector3(px * 0.3, lookAtY, 0));
  }, [camera, frame, fps, t, distance, orbitSpeed, dolly, panX, durationInFrames, lookAtY]);

  // Force Three.js to re-render on every Remotion frame
  useEffect(() => {
    invalidate();
  }, [frame, invalidate]);

  return null;
};
