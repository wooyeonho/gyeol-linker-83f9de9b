'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import type { PersonalityParams, VisualState } from '@/lib/gyeol/types';

const PERSONALITY_COLORS: Record<keyof PersonalityParams, string> = {
  warmth: '#F59E0B',
  logic: '#06B6D4',
  creativity: '#A855F7',
  energy: '#22C55E',
  humor: '#EAB308',
};

function personalityToColor(personality: PersonalityParams): THREE.Color {
  const entries = Object.entries(personality) as [keyof PersonalityParams, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0] ? PERSONALITY_COLORS[sorted[0][0]] : '#FFFFFF';
  const secondary = sorted[1]?.[0] ? PERSONALITY_COLORS[sorted[1][0]] : '#4F46E5';
  const c = new THREE.Color();
  c.lerpColors(new THREE.Color(primary), new THREE.Color(secondary), 0.5);
  return c;
}

function Core({ gen, personality, isThinking, isListening }: { gen: number; personality: PersonalityParams; isThinking: boolean; isListening: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [pulse, setPulse] = useState(0);
  const mixColor = useMemo(() => personalityToColor(personality), [personality]);
  const radius = useMemo(() => {
    if (gen <= 1) return 0.03;
    if (gen === 2) return 0.1;
    if (gen === 3) return 0.2;
    if (gen === 4) return 0.25;
    return 0.3;
  }, [gen]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = isThinking ? 5 : isListening ? 3 : 1;
    const amp = isThinking ? 0.4 : isListening ? 0.35 : 0.3;
    setPulse(0.7 + amp * Math.sin(t * speed));
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    const glowOpacity = isThinking ? 0.25 + 0.2 * pulse : 0.15 + 0.1 * pulse;
    if (glowRef.current) (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowOpacity;
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

function GlowRing({ radius, color }: { radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => {
    const g = new THREE.RingGeometry(radius * 0.9, radius * 1.1, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [radius]);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 0.2;
  });
  return (
    <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function OrbitalParticles({ count, radius, color }: { count: number; radius: number; color: string }) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({ angle: (i / count) * Math.PI * 2, speed: 0.3 + (i % 3) * 0.1 })), [count]);
  return (
    <group>
      {particles.map((p, i) => (
        <OrbitalDot key={i} baseAngle={p.angle} speed={p.speed} radius={radius} color={color} />
      ))}
    </group>
  );
}

function OrbitalDot({ baseAngle, speed, radius, color }: { baseAngle: number; speed: number; radius: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const r = radius * 1.8;
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + baseAngle;
    ref.current.position.x = r * Math.cos(t);
    ref.current.position.z = r * Math.sin(t);
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

function EnergyWave({ gen, color }: { gen: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const size = 0.15 + gen * 0.08;
  const geom = useMemo(() => {
    const g = new THREE.RingGeometry(size * 0.7, size, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.5;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.2 + 0.15 * Math.sin(t * 2);
  });
  return (
    <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function LightRays({ count, color }: { count: number; color: string }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[0, 0, 0]} rotation={[0, 0, angle]}>
            <planeGeometry args={[0.02, 0.4]} />
            <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function NebulaBg({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => new THREE.SphereGeometry(2.5, 32, 32), []);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  return (
    <mesh ref={ref} geometry={geom} scale={-1}>
      <meshBasicMaterial color={color} transparent opacity={0.03} side={THREE.BackSide} depthWrite={false} />
    </mesh>
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

function MessageRipple({ triggerAt, color }: { triggerAt: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const startClock = useRef<number>(0);
  const prevTrigger = useRef(0);
  const geom = useMemo(() => {
    const g = new THREE.RingGeometry(0.05, 0.08, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    if (triggerAt > 0 && triggerAt !== prevTrigger.current) {
      prevTrigger.current = triggerAt;
      startClock.current = state.clock.elapsedTime;
    }
    if (startClock.current === 0) return;
    const elapsed = state.clock.elapsedTime - startClock.current;
    if (elapsed < 0 || elapsed > 0.8) return;
    const scale = 1 + elapsed * 6;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - elapsed / 0.8);
  });
  return (
    <mesh ref={ref} geometry={geom} rotation={[-Math.PI / 2, 0, 0]} scale={1} visible={triggerAt > 0}>
      <meshBasicMaterial color={color} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export interface VoidCanvasProps {
  gen?: number;
  personality?: PersonalityParams;
  visualState?: VisualState | null;
  isThinking?: boolean;
  isListening?: boolean;
  /** 메시지 도착 시 Void 리플 연출 (timestamp) */
  pulseTrigger?: number;
}

const defaultPersonality: PersonalityParams = { warmth: 50, logic: 50, creativity: 50, energy: 50, humor: 50 };

export default function VoidCanvas({ gen = 1, personality = defaultPersonality, isThinking = false, isListening = false, pulseTrigger = 0 }: VoidCanvasProps) {
  const particleCount = Math.min(50, 10 + Math.floor((Object.values(personality).reduce((a, b) => a + b, 0) / 500) * 40));
  const color = useMemo(() => personalityToColor(personality).getStyle(), [personality]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[2, 2, 2]} intensity={1} />
        {gen >= 4 && <NebulaBg color={color} />}
        <Float speed={0.5} floatIntensity={0.2}>
          <MessageRipple triggerAt={pulseTrigger} color={color} />
          <Core gen={gen} personality={personality} isThinking={isThinking} isListening={isListening} />
          {gen >= 2 && <GlowRing radius={gen === 2 ? 0.15 : gen === 3 ? 0.28 : gen === 4 ? 0.35 : 0.4} color={color} />}
          {gen >= 3 && <EnergyWave gen={gen} color={color} />}
          {gen >= 3 && <OrbitalParticles count={12} radius={gen === 3 ? 0.25 : 0.35} color={color} />}
          {gen >= 4 && <LightRays count={8} color={color} />}
        </Float>
        {Array.from({ length: particleCount }, (_, i) => (
          <Particle key={i} delay={i * 0.2} />
        ))}
      </Canvas>
    </div>
  );
}
