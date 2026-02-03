
/// <reference types="@react-three/fiber" />
import React, { useRef, useMemo, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Float, Sparkles, useTexture, Image, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import jackUrl from '@/apps/landing/public/Jack.png';

const Scene3Dv2: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const [selectedLayer, setSelectedLayer] = useState<number | null>(null);

    // Load texture
    const texture = useTexture(jackUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const layers = useMemo(() => [
        { text: "INTENT", color: "#F2B94B", radius: 2.2, rotation: [Math.PI / 2, 0.2, 0], speed: 0.4 },
        { text: "ROUTE", color: "#38BDF8", radius: 3.2, rotation: [Math.PI / 2.2, -0.3, 0], speed: 0.3 },
        { text: "CONSTRAINTS", color: "#F2B94B", radius: 4.2, rotation: [Math.PI / 1.8, 0.1, 0], speed: 0.2 },
        { text: "SETTLEMENT", color: "#38BDF8", radius: 5.2, rotation: [Math.PI / 2.5, 0.4, 0], speed: 0.15 },
    ], []);

    useFrame((state) => {
        const { x, y } = state.mouse;
        if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.15, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.1, 0.1);
        }
    });

    return (
        <group ref={groupRef} position={[0, -0.5, 0]}>
            {/* The "Jack" Hero */}
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                <Image
                    url={jackUrl}
                    scale={[4.8, 4.8]}
                    transparent
                    position={[0, 0.5, 0]}
                    side={THREE.DoubleSide}
                />
            </Float>

            {/* The 4 Architectural Layers */}
            <group position={[0, 0.5, 0]}>
                {layers.map((layer, i) => (
                    <LayerRing
                        key={i}
                        {...layer}
                        isSelected={selectedLayer === i}
                        onSelect={() => setSelectedLayer(selectedLayer === i ? null : i)}
                    />
                ))}

                {/* Environmental Dust */}
                <Sparkles count={100} scale={10} size={2} speed={0.2} opacity={0.5} color="#F2B94B" />
                <Sparkles count={50} scale={12} size={4} speed={0.1} opacity={0.3} color="#38BDF8" />
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
    onSelect: () => void
}> = ({ text, color, radius, rotation, speed, isSelected, onSelect }) => {
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
                {/* The Orbital Line - Interactive */}
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
                                    fontSize={0.35}
                                    color="#FFFFFF"
                                    anchorX="left"
                                    anchorY="middle"
                                    outlineWidth={0.03}
                                    outlineColor={color}
                                >
                                    {text}
                                </Text>

                                {/* Call to Action Layer */}
                                <group position={[0, -0.4, 0]}>
                                    <Text
                                        fontSize={0.18}
                                        color={color}
                                        anchorX="left"
                                        fillOpacity={0.9}
                                        letterSpacing={0.1}
                                    >
                                        {"\u27F6"} VIEW DETAILS
                                    </Text>
                                    <mesh position={[1, 0, -0.1]}>
                                        <planeGeometry args={[2.5, 0.4]} />
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
