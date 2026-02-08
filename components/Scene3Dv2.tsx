
/// <reference types="@react-three/fiber" />
import React, { useRef, useMemo, useState } from 'react';
import { useFrame, ThreeEvent, useThree } from '@react-three/fiber';
import { Float, Sparkles, useTexture, Image, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import jackUrl from '@/apps/landing/public/Jack.png';

interface Scene3DProps {
    onViewDetails?: (layerName: string) => void;
    selectedLayer: number | null;
    onSelect: (index: number | null) => void;
    cinematicSpin?: boolean;
}

const Scene3Dv2: React.FC<Scene3DProps> = ({ onViewDetails, selectedLayer, onSelect, cinematicSpin = false }) => {
    const { viewport } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const spinStartRef = useRef<number | null>(null);
    const spinBaseY = useRef(0);

    // Scale factor for mobile
    const isMobile = viewport.width < 5;
    const baseScale = isMobile ? viewport.width / 5.5 : 0.8;
    const groupYOffset = isMobile ? 0.8 : -0.2;

    // Load texture
    const texture = useTexture(jackUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const layers = useMemo(() => [
        { text: "INTENT", color: "#F2B94B", radius: 1.8, rotation: [Math.PI / 2, 0.2, 0], speed: 0.4 },
        { text: "ROUTE", color: "#38BDF8", radius: 2.6, rotation: [Math.PI / 2.2, -0.3, 0], speed: 0.3 },
        { text: "CONSTRAINTS", color: "#F2B94B", radius: 3.4, rotation: [Math.PI / 1.8, 0.1, 0], speed: 0.2 },
        { text: "SETTLEMENT", color: "#38BDF8", radius: 4.2, rotation: [Math.PI / 2.5, 0.4, 0], speed: 0.15 },
    ], []);

    useFrame((state) => {
        if (!groupRef.current) return;

        if (cinematicSpin) {
            // Capture start state once
            if (spinStartRef.current === null) {
                spinStartRef.current = state.clock.getElapsedTime();
                spinBaseY.current = groupRef.current.rotation.y;
            }
            const elapsed = state.clock.getElapsedTime() - spinStartRef.current;
            const duration = 4.5; // slow, cinematic sweep
            const t = Math.min(elapsed / duration, 1);

            // Ease-in-out quintic — very smooth acceleration/deceleration
            const ease = t < 0.5
                ? 16 * t * t * t * t * t
                : 1 - Math.pow(-2 * t + 2, 5) / 2;

            // Exact 360° sweep (no overshoot — cleaner look)
            const sweep = Math.PI * 2;
            groupRef.current.rotation.y = spinBaseY.current + ease * sweep;

            // Very gentle tilt for subtle parallax depth
            const targetX = Math.sin(elapsed * 0.8) * 0.06;
            groupRef.current.rotation.x = THREE.MathUtils.lerp(
                groupRef.current.rotation.x,
                targetX,
                0.03
            );
        } else {
            // Reset cinematic tracking
            spinStartRef.current = null;
            // Smooth return to mouse parallax via lerp (avoids snap)
            const { x, y } = state.mouse;
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.15, 0.04);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.1, 0.04);
        }
    });

    return (
        <group ref={groupRef} position={[0, groupYOffset, 0]} scale={[baseScale, baseScale, baseScale]}>
            {/* The "Jack" Hero - Standard Mesh for better transparency handling */}
            <Billboard position={[0, 0.5, 0]} renderOrder={1}>
                <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                    <mesh>
                        <planeGeometry args={[3.8, 3.8]} />
                        <meshBasicMaterial
                            map={texture}
                            transparent={true}
                            depthWrite={false}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                </Float>
            </Billboard>

            {/* The 4 Architectural Layers - Elevated renderOrder ensures they draw ON TOP of the hero */}
            <group position={[0, 0.5, 0]} renderOrder={10}>
                {layers.map((layer, i) => (
                    <LayerRing
                        key={i}
                        {...layer}
                        isSelected={selectedLayer === i}
                        onSelect={() => onSelect(selectedLayer === i ? null : i)}
                        onViewDetails={() => onViewDetails?.(layer.text)}
                    />
                ))}

                {/* Enhanced Environmental Dust */}
                <Sparkles count={150} scale={15} size={1.5} speed={0.2} opacity={0.4} color="#38BDF8" />
                <Sparkles count={100} scale={12} size={2.5} speed={0.1} opacity={0.3} color="#F2B94B" />
            </group>
        </group>
    );
};

const LayerRing: React.FC<{
    text: string,
    color: string,
    radius: number,
    rotation: any,
    speed: number,
    isSelected: boolean,
    onSelect: () => void,
    onViewDetails: () => void,
}> = ({ text, color, radius, rotation, speed, isSelected, onSelect, onViewDetails }) => {
    const ringRef = useRef<THREE.Group>(null);
    const torusRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (ringRef.current) {
            // Slower rotation when selected to focus on details
            ringRef.current.rotation.z += speed * 0.005 * (isSelected ? 0.2 : 1);
        }

        // Intense Activation Animation for the Ring
        if (torusRef.current) {
            if (isSelected) {
                const pulse = 1 + Math.sin(time * 8) * 0.02;
                torusRef.current.scale.set(pulse, pulse, pulse);
                (torusRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 5 + Math.sin(time * 8) * 2;
                (torusRef.current.material as THREE.MeshStandardMaterial).opacity = 1;
            } else {
                torusRef.current.scale.set(1, 1, 1);
                (torusRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 2 : 0.4;
                (torusRef.current.material as THREE.MeshStandardMaterial).opacity = hovered ? 0.8 : 0.4;
            }
        }
    });

    return (
        <group rotation={rotation}>
            <group ref={ringRef}>
                <mesh
                    ref={torusRef}
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    onPointerOver={() => setHovered(true)}
                    onPointerOut={() => setHovered(false)}
                >
                    <torusGeometry args={[radius, isSelected ? 0.04 : 0.02, 16, 100]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        transparent
                        depthWrite={false}
                    />
                </mesh>

                {/* The "Incrusted" Text Node */}
                <group position={[radius, 0, 0]}>
                    <mesh
                        onClick={(e) => { e.stopPropagation(); onSelect(); }}
                        onPointerOver={() => setHovered(true)}
                        onPointerOut={() => setHovered(false)}
                    >
                        <sphereGeometry args={[0.15, 16, 16]} />
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={isSelected ? 15 : 2}
                        />
                    </mesh>

                    {/* Billboarded Name Display & CTA - Always faces camera */}
                    {isSelected && (
                        <Billboard position={[0, 0, 0]}>
                            <group position={[0.4, 0, 0]}>
                                <Text
                                    fontSize={0.28}
                                    color="#FFFFFF"
                                    anchorX="left"
                                    anchorY="middle"
                                    outlineWidth={0.03}
                                    outlineColor={color}
                                >
                                    {text}
                                </Text>

                                {/* Call to Action Layer */}
                                <group
                                    position={[0, -0.4, 0]}
                                    onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                    onPointerOver={() => (document.body.style.cursor = 'pointer')}
                                    onPointerOut={() => (document.body.style.cursor = 'auto')}
                                >
                                    <Text
                                        fontSize={0.14}
                                        color={color}
                                        anchorX="left"
                                        fillOpacity={0.9}
                                        letterSpacing={0.1}
                                    >
                                        {"\u27F6"} VIEW DETAILS
                                    </Text>
                                    <mesh position={[1, 0, -0.1]}>
                                        <planeGeometry args={[2, 0.3]} />
                                        <meshBasicMaterial color={color} transparent opacity={0.15} />
                                    </mesh>
                                </group>
                            </group>
                        </Billboard>
                    )}
                </group>

                {/* Decorative Ticks */}
                {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
                    <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
                        <boxGeometry args={[0.06, 0.1, 0.06]} />
                        <meshStandardMaterial color={color} opacity={0.5} transparent />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

export default Scene3Dv2;
