import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";

/**
 * Sets up the camera and forces Three.js re-renders on each Remotion frame.
 * Must be placed inside a <ThreeCanvas>.
 */
export const CameraRig: React.FC<{ distance?: number }> = ({
  distance = 5,
}) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const { invalidate } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, distance);
    camera.near = 0.1;
    camera.far = 100;
    camera.lookAt(0, 0, 0);
  }, [camera, distance]);

  // Force Three.js to re-render on every Remotion frame
  useEffect(() => {
    invalidate();
  }, [frame, invalidate]);

  return null;
};
