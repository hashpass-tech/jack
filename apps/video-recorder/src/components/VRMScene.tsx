/**
 * VRMScene — Three.js VRM Avatar with real-time viseme lip-sync
 *
 * Pure Three.js component that:
 * - Loads a VRM model
 * - Applies Mixamo animations retargeted to VRM rig
 * - Maps incoming visemes to VRM facial expressions
 * - Handles responsive canvas and cleanup
 */
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { MIXAMO_VRM_RIG_MAP } from "../../config/visemes";
import type { VisemeType } from "../../config/visemes";

export interface VRMSceneProps {
  /** Whether the avatar is currently speaking */
  isSpeaking: boolean;
  /** Current viseme for lip-sync (e.g. 'aa', 'oh', 'sil') */
  currentViseme: string;
  /** Path to VRM model file */
  modelPath?: string;
  /** Path to Mixamo FBX animation */
  animationPath?: string;
  /** Background color */
  backgroundColor?: string;
  /** Canvas width override */
  width?: number;
  /** Canvas height override */
  height?: number;
}

/**
 * Load Mixamo FBX animation and retarget to VRM humanoid skeleton
 */
const loadMixamoAnimation = async (
  url: string,
  vrm: VRM,
): Promise<THREE.AnimationClip | null> => {
  try {
    const { FBXLoader } = await import(
      "three/examples/jsm/loaders/FBXLoader.js"
    );
    const loader = new FBXLoader();

    return new Promise((resolve) => {
      loader.load(
        url,
        (asset) => {
          const clip = THREE.AnimationClip.findByName(
            asset.animations,
            "mixamo.com",
          );
          if (!clip) {
            // Fallback: use first animation
            const fallbackClip = asset.animations[0];
            if (!fallbackClip) {
              console.warn("No animations found in FBX");
              resolve(null);
              return;
            }
            resolve(retargetClip(fallbackClip, vrm));
            return;
          }
          resolve(retargetClip(clip, vrm));
        },
        undefined,
        (err) => {
          console.warn("Failed to load animation:", err);
          resolve(null);
        },
      );
    });
  } catch (err) {
    console.warn("FBXLoader not available:", err);
    return null;
  }
};

/**
 * Retarget animation tracks from Mixamo bones to VRM humanoid bones
 */
function retargetClip(clip: THREE.AnimationClip, vrm: VRM): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];

  clip.tracks.forEach((track) => {
    const splitName = track.name.split(".");
    const mixamoRigName = splitName[0];
    const vrmBoneName = MIXAMO_VRM_RIG_MAP[mixamoRigName];

    if (vrmBoneName) {
      const vrmNode = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName as any);
      if (vrmNode) {
        const propertyName = splitName.slice(1).join(".");
        if (propertyName.includes("quaternion")) {
          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNode.name}.${propertyName}`,
              Array.from(track.times),
              Array.from(track.values),
            ),
          );
        } else if (propertyName.includes("position")) {
          // Only retarget hips position
          if (vrmBoneName === "hips") {
            tracks.push(
              new THREE.VectorKeyframeTrack(
                `${vrmNode.name}.${propertyName}`,
                Array.from(track.times),
                Array.from(track.values).map((v, i) =>
                  i % 3 === 1 ? v * 0.01 : v * 0.01,
                ),
              ),
            );
          }
        }
      }
    }
  });

  return new THREE.AnimationClip("vrmAnimation", clip.duration, tracks);
}

const VRMScene: React.FC<VRMSceneProps> = ({
  isSpeaking,
  currentViseme,
  modelPath = "/models/jack-avatar.vrm",
  animationPath = "/animations/Talking.fbx",
  backgroundColor = "#0A0A0A",
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const frameIdRef = useRef<number>(0);
  const elapsedTimeRef = useRef(0);

  // Viseme props refs for animation loop access
  const isSpeakingRef = useRef(isSpeaking);
  const currentVisemeRef = useRef(currentViseme);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    currentVisemeRef.current = currentViseme;
  }, [currentViseme]);

  /**
   * Update mouth expressions based on current viseme
   */
  const updateMouthExpressions = useCallback(() => {
    const vrm = vrmRef.current;
    if (!vrm?.expressionManager) return;

    const em = vrm.expressionManager;

    // Reset all mouth expressions
    em.setValue(VRMExpressionPresetName.Aa, 0);
    em.setValue(VRMExpressionPresetName.Oh, 0);
    em.setValue(VRMExpressionPresetName.Ee, 0);
    em.setValue(VRMExpressionPresetName.Ih, 0);
    em.setValue(VRMExpressionPresetName.Ou, 0);

    // Apply current viseme if speaking
    const viseme = currentVisemeRef.current?.toLowerCase() as VisemeType;
    if (viseme && viseme !== "sil" && isSpeakingRef.current) {
      switch (viseme) {
        case "aa":
          em.setValue(VRMExpressionPresetName.Aa, 0.8);
          break;
        case "e":
          em.setValue(VRMExpressionPresetName.Ee, 0.8);
          break;
        case "i":
        case "ih":
          em.setValue(VRMExpressionPresetName.Ih, 0.8);
          break;
        case "o":
        case "oh":
          em.setValue(VRMExpressionPresetName.Oh, 0.7);
          break;
        case "u":
        case "ou":
          em.setValue(VRMExpressionPresetName.Ou, 0.7);
          break;
      }
    }

    // Natural blinking
    const shouldBlink = Math.sin(elapsedTimeRef.current * 0.3) > 0.98;
    em.setValue(VRMExpressionPresetName.Blink, shouldBlink ? 1.0 : 0.0);

    em.update();
  }, []);

  /**
   * Main scene setup
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const w = width || rect.width || 800;
    const h = height || rect.height || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // Camera — portrait-style framing
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 2.5);
    camera.lookAt(0, 1.0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 3, 2);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    fillLight.position.set(-2, 1, -1);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x00d4aa, 0.3);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    // Ground plane (subtle)
    const groundGeometry = new THREE.CircleGeometry(3, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load VRM model
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

    gltfLoader.load(
      modelPath,
      async (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          console.error("Failed to load VRM from GLTF");
          return;
        }

        // Position & orient the model
        vrm.scene.position.set(0, 0, 0);
        vrm.scene.rotation.set(0, Math.PI, 0);
        vrm.scene.scale.set(1, 1, 1);

        scene.add(vrm.scene);
        vrmRef.current = vrm;

        // Animation mixer
        const mixer = new THREE.AnimationMixer(vrm.scene);
        mixerRef.current = mixer;

        // Load talking animation
        const talkingClip = await loadMixamoAnimation(animationPath, vrm);
        if (talkingClip) {
          const action = mixer.clipAction(talkingClip);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.play();
          currentActionRef.current = action;
        }
      },
      (progress) => {
        const pct = ((progress.loaded / progress.total) * 100).toFixed(0);
        console.log(`Loading VRM: ${pct}%`);
      },
      (error) => {
        console.error("Error loading VRM:", error);
      },
    );

    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      elapsedTimeRef.current += delta;

      // Update animation mixer
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Update mouth expressions
      updateMouthExpressions();

      // Update VRM internals (bone constraints, spring bones, etc.)
      if (vrmRef.current) {
        vrmRef.current.update(delta);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const newW = width || rect.width;
      const newH = height || rect.height;
      if (newW > 0 && newH > 0) {
        renderer.setSize(newW, newH);
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(canvasRef.current);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      renderer.dispose();

      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
      }
      scene.clear();
    };
  }, [modelPath, animationPath, backgroundColor, width, height, updateMouthExpressions]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "100%",
        display: "block",
      }}
    />
  );
};

export default VRMScene;
