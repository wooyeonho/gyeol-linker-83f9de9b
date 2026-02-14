'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { PersonalityParams, VisualState } from '@/lib/gyeol/types';

function Core({ gen, personality, isThinking, isListening }: { gen: number; personality: PersonalityParams; isThinking: boolean; isListening: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [pulse, setPulse] = useState(0);
  const primary = useMemo(() => new THREE.Color('#FFFFFF'), []);
  const secondary = useMemo(() => new THREE.Color('#4F46E5'), []);
  const mixColor = useMemo(() => {
    const c = new THREE.Color();
    c.lerpColors(primary, secondary, (personality.creativity / 100 + personality.humor / 100) / 2);
    return c;
  }, [primary, secondary, personality.creativity, personality.humor]);
  const radius = useMemo(() => {
    if (gen <= 1) return 0.03;
    if (gen === 2) return 0.1;
    if (gen === 3) return 0.2;
    if (gen === 4) return 0.25;
    return 0.3;
  }, [gen]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = isThinking ? 3 : isListening ? 2 : 1;
    setPulse(0.7 + 0.3 * Math.sin(t * speed));
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.1 * pulse;
  });

  return (
    <group>
      <Sphere ref={glowRef} args={[radius * 2.5, 16, 16]}>
        <meshBasicMaterial color={mixColor.getStyle()} transparent opacity={0.2} depthWrite={false} />
      </Sphere>
      <Sphere ref={meshRef} args={[radius, 32, 32]}>
        <meshBasicMaterial color={mixColor.getStyle()} />
      </Sphere>
    </group>
  );
}

function Particle({ delay }: { delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => {
    const r = 1.5 + Math.random() * 1.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)] as [number, number, number];
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + delay;
    ref.current.position.x = pos[0] + 0.1 * Math.sin(t * 0.5);
    ref.current.position.y = pos[1] + 0.1 * Math.cos(t * 0.3);
    ref.current.position.z = pos[2] + 0.1 * Math.sin(t * 0.4);
  });
  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.01, 8, 8]} />
      <meshBasicMaterial color="#4F46E5" transparent opacity={0.4} />
    </mesh>
  );
}

export interface VoidCanvasProps {
  gen?: number;
  personality?: PersonalityParams;
  visualState?: VisualState | null;
  isThinking?: boolean;
  isListening?: boolean;
}

const defaultPersonality: PersonalityParams = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

export default function VoidCanvas({ gen = 1, personality = defaultPersonality, isThinking = false, isListening = false }: VoidCanvasProps) {
  const particleCount = Math.min(50, 10 + Math.floor((Object.values(personality).reduce((a, b) => a + b, 0) / 500) * 40));
  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 2]} intensity={1} />
        <Float speed={0.5} floatIntensity={0.2}>
          <Core gen={gen} personality={personality} isThinking={isThinking} isListening={isListening} />
        </Float>
        {Array.from({ length: particleCount }, (_, i) => (
          <Particle key={i} delay={i * 0.2} />
        ))}
      </Canvas>
    </div>
  );
}
