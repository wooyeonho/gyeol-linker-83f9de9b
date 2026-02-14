'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { PersonalityParams, VisualState } from '@/lib/gyeol/types';

export interface VoidCanvasProps {
  gen?: number;
  personality?: PersonalityParams;
  visualState?: VisualState | null;
  isThinking?: boolean;
  isListening?: boolean;
}

const defaultPersonality: PersonalityParams = {
  warmth: 50,
  logic: 50,
  creativity: 50,
  energy: 50,
  humor: 50,
};

interface VoidParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  delay: number;
}

function VoidCanvas({
  gen = 1,
  personality = defaultPersonality,
  isThinking = false,
  isListening = false,
}: VoidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<VoidParticle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const stateRef = useRef({ isThinking, isListening, gen, personality });

  stateRef.current = { isThinking, isListening, gen, personality };

  const creativity = personality.creativity / 100;
  const humor = personality.humor / 100;
  const totalTraits = Object.values(personality).reduce((a, b) => a + b, 0);
  const particleCount = Math.min(80, 20 + Math.floor((totalTraits / 500) * 60));
  const coreRadius = gen <= 1 ? 8 : gen === 2 ? 25 : gen === 3 ? 40 : gen === 4 ? 50 : 60;
  const pR = Math.round(79 + (176 * (1 - (creativity + humor) / 2)));
  const pG = Math.round(70 + (185 * (1 - (creativity + humor) / 2)));
  const pB = 229;

  const initParticles = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const out: VoidParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * Math.min(w, h) * 0.35;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      out.push({
        x, y, baseX: x, baseY: y,
        vx: 0, vy: 0,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
        delay: i * 0.15,
      });
    }
    particlesRef.current = out;
  }, [particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      initParticles(canvas.offsetWidth, canvas.offsetHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    const startTime = Date.now();

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const t = (Date.now() - startTime) / 1000;
      const { isThinking: thinking, isListening: listening } = stateRef.current;
      const speed = thinking ? 3 : listening ? 2 : 1;

      ctx.clearRect(0, 0, w, h);

      const pulse = 0.7 + 0.3 * Math.sin(t * speed);
      const glowSize = coreRadius * 3 * pulse;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      grad.addColorStop(0, `rgba(${pR},${pG},${pB},${(0.3 * pulse).toFixed(2)})`);
      grad.addColorStop(0.5, `rgba(${pR},${pG},${pB},${(0.1 * pulse).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
      ctx.fill();

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * pulse);
      coreGrad.addColorStop(0, `rgba(255,255,255,${(0.9 * pulse).toFixed(2)})`);
      coreGrad.addColorStop(0.6, `rgba(${pR},${pG},${pB},${(0.7 * pulse).toFixed(2)})`);
      coreGrad.addColorStop(1, `rgba(${pR},${pG},${pB},0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * pulse, 0, Math.PI * 2);
      ctx.fill();

      const parts = particlesRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const pt = t + p.delay;
        const tx = p.baseX + 10 * Math.sin(pt * 0.5);
        const ty = p.baseY + 10 * Math.cos(pt * 0.3);
        const dx = mx - p.x;
        const dy = my - p.y;
        const dm = Math.sqrt(dx * dx + dy * dy);
        if (dm < 100 && dm > 0) {
          const f = (100 - dm) / 100;
          p.vx -= (dx / dm) * f * 2;
          p.vy -= (dy / dm) * f * 2;
        }
        p.vx += (tx - p.x) * 0.02;
        p.vy += (ty - p.y) * 0.02;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        const pa = p.alpha * (0.6 + 0.4 * Math.sin(pt * 0.8));
        ctx.fillStyle = `rgba(${pR},${pG},${pB},${pa.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const ddx = a.x - b.x;
          const ddy = a.y - b.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist < 80) {
            ctx.strokeStyle = `rgba(${pR},${pG},${pB},${((1 - dist / 80) * 0.15).toFixed(3)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [coreRadius, pR, pG, pB, initParticles]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}

export default VoidCanvas;
