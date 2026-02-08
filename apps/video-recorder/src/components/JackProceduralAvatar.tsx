/**
 * JackProceduralAvatar — Procedural 3D pirate avatar (Three.js)
 *
 * @version 1.0.0
 * @date    2026-02-07
 * @changelog
 *   v1.0.0 — Initial pirate avatar: head, hat, eyepatch, beard, coat,
 *             gold chain, compass background, lip-sync mouth, blink,
 *             head sway, particle effects, "J" chest emblem.
 *
 * Pure procedural geometry — no VRM/GLTF files needed.
 * Used by GabberLiveSession for real-time AI avatar rendering.
 */
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

export interface JackProceduralAvatarProps {
  isSpeaking: boolean;
  currentViseme: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

// ── Pirate JACK palette ──
const SKIN_COLOR = 0xc68642;
const COAT_COLOR = 0x222222;
const HAT_COLOR = 0x222222;
const GOLD = 0xdaa520;
const GOLD_BRIGHT = 0xffd700;
const ACCENT_RED = 0x8b0000;
const EYE_WHITE = 0xeeeedd;
const EYE_IRIS = 0x3d2b1f;
const LIP_COLOR = 0x6b3a2a;
const COMPASS_BG = 0x0a2040;

/**
 * Viseme → mouth-shape mapping.
 */
function getVisemeMouth(viseme: string): { openY: number; width: number } {
  switch (viseme?.toLowerCase()) {
    case "aa":
      return { openY: 0.12, width: 0.08 };
    case "e":
    case "ee":
      return { openY: 0.06, width: 0.1 };
    case "i":
    case "ih":
      return { openY: 0.04, width: 0.09 };
    case "o":
    case "oh":
      return { openY: 0.1, width: 0.06 };
    case "u":
    case "ou":
      return { openY: 0.07, width: 0.04 };
    default:
      return { openY: 0, width: 0.07 };
  }
}

const JackProceduralAvatar: React.FC<JackProceduralAvatarProps> = ({
  isSpeaking,
  currentViseme,
  backgroundColor = "#060608",
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const elapsedRef = useRef(0);

  // Animated refs
  const mouthRef = useRef<THREE.Mesh | null>(null);
  const mouthMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const leftEyelidRef = useRef<THREE.Mesh | null>(null);
  const rightEyelidRef = useRef<THREE.Mesh | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const chestEmissiveRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Latest prop snapshots for animation loop
  const isSpeakingRef = useRef(isSpeaking);
  const visemeRef = useRef(currentViseme);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);
  useEffect(() => {
    visemeRef.current = currentViseme;
  }, [currentViseme]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const w = width || rect.width || 800;
    const h = height || rect.height || 600;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);
    camera.position.set(0, 1.52, 2.4);
    camera.lookAt(0, 1.38, 0);

    // ── Renderer ──
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

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0x404060, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.1);
    keyLight.position.set(2, 3, 2.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6688aa, 0.4);
    fillLight.position.set(-2, 1.5, 1);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffd700, 0.3);
    rimLight.position.set(0, 2.5, -2);
    scene.add(rimLight);

    // ── Build avatar ──
    const avatar = new THREE.Group();

    // -- Torso --
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.21, 0.5, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: COAT_COLOR,
      roughness: 0.8,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 1.0, 0);
    avatar.add(torso);

    // -- Shoulders --
    for (const side of [-1, 1]) {
      const sGeo = new THREE.CapsuleGeometry(0.06, 0.28, 8, 8);
      const sMat = new THREE.MeshStandardMaterial({
        color: COAT_COLOR,
        roughness: 0.8,
      });
      const shoulder = new THREE.Mesh(sGeo, sMat);
      shoulder.position.set(side * 0.28, 1.22, 0);
      shoulder.rotation.z = Math.PI / 2;
      avatar.add(shoulder);
    }

    // -- Neck --
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12);
    const neckMat = new THREE.MeshStandardMaterial({
      color: SKIN_COLOR,
      roughness: 0.8,
    });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.set(0, 1.3, 0);
    avatar.add(neck);

    // ━━━ Pirate Hat ━━━
    const hatGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.18, 24);
    const hatMat = new THREE.MeshStandardMaterial({
      color: HAT_COLOR,
      roughness: 0.9,
    });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.set(0, 1.72, -0.02);
    avatar.add(hat);

    // Gold trim torus
    const trimGeo = new THREE.TorusGeometry(0.3, 0.018, 8, 30);
    const trimMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.8,
      roughness: 0.2,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 1.64, -0.02);
    avatar.add(trim);

    // Skull emblem on hat
    const skullGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const skullMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const skull = new THREE.Mesh(skullGeo, skullMat);
    skull.position.set(0, 1.67, 0.3);
    avatar.add(skull);

    // Crossbones
    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      const bGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
      });
      const bone = new THREE.Mesh(bGeo, bMat);
      bone.position.set(0, 1.665, 0.3);
      bone.rotation.z = angle;
      avatar.add(bone);
    }

    // ━━━ Hair (sides) ━━━
    const hairColor = 0x1a0a00;
    const hairGeo = new THREE.CylinderGeometry(0.03, 0.015, 0.22, 8);
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.9,
    });
    for (const side of [-1, 1]) {
      const strand = new THREE.Mesh(hairGeo, hairMat);
      strand.position.set(side * 0.16, 1.52, -0.02);
      strand.rotation.z = side * 0.15;
      avatar.add(strand);
    }
    // Top hair
    const hairTopGeo = new THREE.SphereGeometry(0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairTopMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.9,
    });
    const hairTop = new THREE.Mesh(hairTopGeo, hairTopMat);
    hairTop.position.set(0, 1.62, -0.02);
    avatar.add(hairTop);

    // ━━━ Gold earring ━━━
    const earringGeo = new THREE.TorusGeometry(0.025, 0.004, 8, 20);
    const earringMat = new THREE.MeshStandardMaterial({
      color: GOLD_BRIGHT,
      metalness: 0.9,
      roughness: 0.15,
    });
    const earring = new THREE.Mesh(earringGeo, earringMat);
    earring.position.set(-0.17, 1.52, 0.04);
    earring.rotation.y = Math.PI / 3;
    avatar.add(earring);

    // ━━━ Gold chain ━━━
    const chainGeo = new THREE.TorusGeometry(0.12, 0.006, 8, 28);
    const chainMat = new THREE.MeshStandardMaterial({
      color: GOLD,
      metalness: 0.85,
      roughness: 0.2,
    });
    const chain = new THREE.Mesh(chainGeo, chainMat);
    chain.position.set(0, 1.18, 0.12);
    chain.rotation.x = Math.PI / 2;
    avatar.add(chain);

    // ━━━ Compass rose background ━━━
    const compassBgGeo = new THREE.CircleGeometry(0.6, 32);
    const compassBgMat = new THREE.MeshStandardMaterial({
      color: COMPASS_BG,
      roughness: 0.95,
    });
    const compassBg = new THREE.Mesh(compassBgGeo, compassBgMat);
    compassBg.position.set(0, 1.5, -0.5);
    scene.add(compassBg);

    // Aggressive stance tilt
    avatar.rotation.z = -Math.PI / 60;

    // ━━━ HEAD ━━━
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.52, 0);
    headGroupRef.current = headGroup;

    const headGeo = new THREE.SphereGeometry(0.16, 32, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: SKIN_COLOR,
      roughness: 0.7,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 1.05, 0.95);
    headGroup.add(head);

    // Eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.025, 16, 12);
      const eyeMat = new THREE.MeshStandardMaterial({
        color: EYE_WHITE,
        roughness: 0.3,
      });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.055, 0.02, 0.13);
      headGroup.add(eye);

      const irisGeo = new THREE.SphereGeometry(0.014, 12, 10);
      const irisMat = new THREE.MeshStandardMaterial({
        color: EYE_IRIS,
        roughness: 0.4,
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * 0.055, 0.02, 0.15);
      headGroup.add(iris);

      const pupilGeo = new THREE.SphereGeometry(0.007, 8, 6);
      const pupilMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.1,
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.055, 0.02, 0.158);
      headGroup.add(pupil);

      // Eyelids
      const eyelidGeo = new THREE.BoxGeometry(0.06, 0.004, 0.02);
      const eyelidMat = new THREE.MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.8,
      });
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.position.set(side * 0.055, 0.04, 0.135);
      eyelid.visible = false;
      headGroup.add(eyelid);
      if (side === -1) leftEyelidRef.current = eyelid;
      if (side === 1) rightEyelidRef.current = eyelid;
    }

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.015, 0.04, 8);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xa86930,
      roughness: 0.8,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.01, 0.155);
    nose.rotation.x = -Math.PI / 6;
    headGroup.add(nose);

    // Mouth
    const mouthGeo = new THREE.PlaneGeometry(0.07, 0.01);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: LIP_COLOR,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.05, 0.14);
    headGroup.add(mouth);
    mouthRef.current = mouth;
    mouthMaterialRef.current = mouthMat;

    // Ears
    for (const side of [-1, 1]) {
      const earGeo = new THREE.SphereGeometry(0.02, 8, 6);
      const earMat = new THREE.MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.8,
      });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * 0.155, 0, 0);
      ear.scale.set(0.5, 1, 0.6);
      headGroup.add(ear);
    }

    avatar.add(headGroup);

    // ━━━ Chest "J" emblem ━━━
    const cSize = 128;
    const emblemCanvas = document.createElement("canvas");
    emblemCanvas.width = cSize;
    emblemCanvas.height = cSize;
    const ctx = emblemCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      cSize / 2, cSize / 2, 0,
      cSize / 2, cSize / 2, cSize / 2,
    );
    grad.addColorStop(0, "#ffd700");
    grad.addColorStop(1, "#b8860b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cSize / 2, cSize / 2, cSize / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0a00";
    ctx.font = `bold ${cSize * 0.56}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("J", cSize / 2, cSize / 2 + 2);

    const emblemTexture = new THREE.CanvasTexture(emblemCanvas);
    const emblemMat = new THREE.MeshStandardMaterial({
      map: emblemTexture,
      emissive: new THREE.Color(GOLD),
      emissiveIntensity: 0.2,
      roughness: 0.4,
      metalness: 0.3,
    });
    chestEmissiveRef.current = emblemMat;
    const emblemGeo = new THREE.CircleGeometry(0.06, 24);
    const emblem = new THREE.Mesh(emblemGeo, emblemMat);
    emblem.position.set(0, 1.08, 0.22);
    avatar.add(emblem);

    // ━━━ Arms ━━━
    for (const side of [-1, 1]) {
      const armGeo = new THREE.CapsuleGeometry(0.04, 0.35, 8, 8);
      const armMat = new THREE.MeshStandardMaterial({
        color: COAT_COLOR,
        roughness: 0.8,
      });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(side * 0.32, 0.95, 0);
      arm.rotation.z = side * 0.15;
      avatar.add(arm);

      const handGeo = new THREE.SphereGeometry(0.035, 12, 8);
      const handMat = new THREE.MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.8,
      });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.set(side * 0.36, 0.72, 0);
      avatar.add(hand);
    }

    scene.add(avatar);

    // ── Ground ──
    const groundGeo = new THREE.CircleGeometry(3, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050508,
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.55;
    scene.add(ground);

    // ── Particles ──
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 2 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMat = new THREE.PointsMaterial({
      color: GOLD_BRIGHT,
      size: 0.008,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Animation loop ──
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      elapsedRef.current += delta;
      const t = elapsedRef.current;

      // Head sway
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
        headGroupRef.current.rotation.x = Math.sin(t * 0.3) * 0.02;
        headGroupRef.current.position.y =
          1.52 + Math.sin(t * 1.2) * 0.003;
      }

      // Blink
      const blinkPhase = Math.sin(t * 0.3);
      const shouldBlink =
        blinkPhase > 0.985 || Math.sin(t * 0.7 + 2) > 0.995;
      if (leftEyelidRef.current) leftEyelidRef.current.visible = shouldBlink;
      if (rightEyelidRef.current)
        rightEyelidRef.current.visible = shouldBlink;

      // Mouth (viseme-driven)
      if (mouthRef.current) {
        const { openY, width: mouthWidth } = isSpeakingRef.current
          ? getVisemeMouth(visemeRef.current)
          : { openY: 0, width: 0.07 };

        const currentScale = mouthRef.current.scale;
        const targetScaleX = mouthWidth / 0.07;
        const targetScaleY = Math.max(1, 1 + openY * 12);
        currentScale.x += (targetScaleX - currentScale.x) * 0.15;
        currentScale.y += (targetScaleY - currentScale.y) * 0.15;

        const targetY = -0.05 - openY * 0.3;
        mouthRef.current.position.y +=
          (targetY - mouthRef.current.position.y) * 0.15;

        if (mouthMaterialRef.current) {
          const darkness = openY > 0.02 ? 0x1a0a05 : LIP_COLOR;
          mouthMaterialRef.current.color.setHex(
            THREE.MathUtils.lerp(
              mouthMaterialRef.current.color.getHex(),
              darkness,
              0.1,
            ),
          );
        }
      }

      // Emblem glow
      if (chestEmissiveRef.current) {
        chestEmissiveRef.current.emissiveIntensity =
          0.15 +
          Math.sin(t * 1.5) * 0.1 +
          (isSpeakingRef.current ? 0.2 : 0);
      }

      // Particle drift
      const posAttr = particles.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3 + 1] += Math.sin(t * 0.8 + i) * 0.0003;
        posAttr.array[i * 3] += Math.cos(t * 0.2 + i * 0.5) * 0.00015;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize ──
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      const nw = width || r.width;
      const nh = height || r.height;
      if (nw > 0 && nh > 0) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      ro.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, [backgroundColor, width, height]);

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

export default JackProceduralAvatar;
