/**
 * Phase 3: 성격 레이더 차트 — SVG 기반
 */
import { motion } from 'framer-motion';

interface PersonalityRadarProps {
  warmth: number;
  logic: number;
  creativity: number;
  energy: number;
  humor: number;
  size?: number;
}

const TRAITS = ['Warmth', 'Logic', 'Creative', 'Energy', 'Humor'];
const ANGLES = TRAITS.map((_, i) => (Math.PI * 2 * i) / TRAITS.length - Math.PI / 2);

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export function PersonalityRadar({ warmth, logic, creativity, energy, humor, size = 160 }: PersonalityRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const values = [warmth, logic, creativity, energy, humor];

  const dataPoints = values.map((v, i) => {
    const r = (v / 100) * maxR;
    return polarToXY(ANGLES[i], r, cx, cy);
  });
  const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {/* Grid */}
        {gridLevels.map((level) => {
          const pts = ANGLES.map((a) => polarToXY(a, maxR * level, cx, cy));
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return <path key={level} d={d} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity={0.3} />;
        })}

        {/* Axis lines */}
        {ANGLES.map((a, i) => {
          const end = polarToXY(a, maxR, cx, cy);
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity={0.2} />;
        })}

        {/* Data polygon */}
        <motion.path
          d={pathD}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}

        {/* Labels */}
        {ANGLES.map((a, i) => {
          const label = polarToXY(a, maxR + 16, cx, cy);
          return (
            <text
              key={i}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize="8"
              fontWeight="600"
            >
              {TRAITS[i]}
            </text>
          );
        })}

        {/* Value labels */}
        {dataPoints.map((p, i) => (
          <text
            key={`v-${i}`}
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            className="fill-primary"
            fontSize="7"
            fontWeight="bold"
          >
            {values[i]}
          </text>
        ))}
      </svg>
    </div>
  );
}
