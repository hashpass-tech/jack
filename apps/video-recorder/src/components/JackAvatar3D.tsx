/**
 * JackAvatar3D — A Three.js 3D avatar for Remotion compositions
 *
 * Renders the JACK character as an animated 3D scene
 * with lip-sync, idle animations, and presentation mode.
 *
 * Used inside Remotion <ThreeCanvas> for video recording/rendering.
 */
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";

interface JackAvatar3DProps {
  /** Current viseme for lip-sync */
  viseme?: string;
  /** Whether the avatar is speaking */
  isSpeaking?: boolean;
  /** Idle animation intensity (0-1) */
  idleIntensity?: number;
  /** Look-at target [x, y, z] */
  lookAt?: [number, number, number];
}

const JackAvatar3D: React.FC<JackAvatar3DProps> = ({
  viseme = "sil",
  isSpeaking = false,
  idleIntensity = 1.0,
  lookAt = [0, 1.2, 5],
}) => {
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const { scene } = useThree();
  const elapsedRef = useRef(0);

  // Load VRM model
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load("/models/jack-avatar.vrm", (gltf) => {
      const vrm = gltf.userData.vrm as VRM;
      if (!vrm) return;

      vrm.scene.position.set(0, -0.8, 0);
      vrm.scene.rotation.set(0, Math.PI, 0);
      vrm.scene.scale.set(1, 1, 1);

      scene.add(vrm.scene);
      vrmRef.current = vrm;

      // Create animation mixer
      mixerRef.current = new THREE.AnimationMixer(vrm.scene);

      // Set up look-at
      if (vrm.lookAt) {
        vrm.lookAt.target = new THREE.Object3D();
        vrm.lookAt.target.position.set(...lookAt);
        scene.add(vrm.lookAt.target);
      }
    });

    return () => {
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [scene, lookAt]);

  // Animation frame
  useFrame((_, delta) => {
    elapsedRef.current += delta;

    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    const vrm = vrmRef.current;
    if (!vrm?.expressionManager) return;

    const em = vrm.expressionManager;

    // Reset mouth expressions
    em.setValue(VRMExpressionPresetName.Aa, 0);
    em.setValue(VRMExpressionPresetName.Oh, 0);
    em.setValue(VRMExpressionPresetName.Ee, 0);
    em.setValue(VRMExpressionPresetName.Ih, 0);
    em.setValue(VRMExpressionPresetName.Ou, 0);

    // Apply viseme
    if (isSpeaking && viseme !== "sil") {
      const v = viseme.toLowerCase();
      if (v === "aa") em.setValue(VRMExpressionPresetName.Aa, 0.8);
      else if (v === "e") em.setValue(VRMExpressionPresetName.Ee, 0.8);
      else if (v === "i" || v === "ih")
        em.setValue(VRMExpressionPresetName.Ih, 0.8);
      else if (v === "o" || v === "oh")
        em.setValue(VRMExpressionPresetName.Oh, 0.7);
      else if (v === "u" || v === "ou")
        em.setValue(VRMExpressionPresetName.Ou, 0.7);
    }

    // Idle breathing
    const breathe = Math.sin(elapsedRef.current * 1.5) * 0.003 * idleIntensity;
    if (vrm.humanoid) {
      const chest = vrm.humanoid.getNormalizedBoneNode("chest");
      if (chest) {
        chest.position.y += breathe;
      }
    }

    // Blinking
    const shouldBlink =
      Math.sin(elapsedRef.current * 0.3) > 0.98 ||
      Math.sin(elapsedRef.current * 0.7 + 2) > 0.99;
    em.setValue(VRMExpressionPresetName.Blink, shouldBlink ? 1.0 : 0.0);

    // Subtle head sway
    if (vrm.humanoid) {
      const head = vrm.humanoid.getNormalizedBoneNode("head");
      if (head) {
        head.rotation.y = Math.sin(elapsedRef.current * 0.5) * 0.02 * idleIntensity;
        head.rotation.x = Math.sin(elapsedRef.current * 0.3) * 0.01 * idleIntensity;
      }
    }

    em.update();
    vrm.update(delta);
  });

  return null;
};

export default JackAvatar3D;
