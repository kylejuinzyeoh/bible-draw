import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, TextStack, W, lerp, snap} from '../shared';

// 105–210: "Same reports." / "Same data." / "Every week." Cards duplicate on every beat.
export const CARD_WAVES = [2, 4, 7, 11, 15, 19, 24]; // cumulative card count per beat
export const CARD_TOTAL = CARD_WAVES[CARD_WAVES.length - 1];
const BARS = [0.45, 0.7, 0.55, 0.95, 0.65];

// Shuffled 4x6 slot grid with jitter, so every wave spreads across the frame.
const SLOTS = Array.from({length: CARD_TOTAL}, (_, i) => i).sort((a, b) => random(`slot${a}`) - random(`slot${b}`));

export const cardSpot = (i: number) => ({
  x: 170 + (SLOTS[i] % 4) * 247 + (random(`cx${i}`) - 0.5) * 90,
  y: 280 + Math.floor(SLOTS[i] / 4) * 276 + (random(`cy${i}`) - 0.5) * 90,
  rot: (random(`cr${i}`) - 0.5) * 18,
});

export const ReportCard: React.FC<{
  x: number;
  y: number;
  rot: number;
  scale?: number;
  w?: number;
  h?: number;
  r?: number;
  content?: number;
  opacity?: number;
}> = ({x, y, rot, scale = 1, w = 260, h = 180, r = 16, content = 1, opacity = 1}) => {
  const bw = (w - 36) / BARS.length;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} opacity={opacity}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={r} fill="#0D121E" stroke={C.cyan} strokeOpacity={0.6} strokeWidth={2} />
      {content > 0 ? (
        <g opacity={content}>
          <rect x={-w / 2 + 18} y={-h / 2 + 18} width={90} height={10} rx={5} fill={C.text} opacity={0.6} />
          <rect x={-w / 2 + 18} y={-h / 2 + 36} width={140} height={7} rx={3.5} fill={C.text} opacity={0.25} />
          {BARS.map((b, k) => (
            <rect
              key={k}
              x={-w / 2 + 18 + k * bw + 4}
              y={h / 2 - 16 - b * 90}
              width={bw - 8}
              height={b * 90}
              rx={3}
              fill={k === 3 ? C.violet : C.cyan}
              opacity={0.85}
            />
          ))}
        </g>
      ) : null}
    </g>
  );
};

const waveOf = (i: number) => CARD_WAVES.findIndex((c) => i < c);

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();

  const t = frame - 60; // shake on "Every week."
  const amp = t >= 0 ? 26 * Math.exp(-t / 3.5) : 0;
  const shake = `translate(${Math.sin(t * 2.7) * amp}px, ${Math.cos(t * 3.3) * amp * 0.6}px) rotate(${Math.sin(t * 1.9) * amp * 0.03}deg)`;

  return (
    <AbsoluteFill style={{transform: shake}}>
      <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.42}}>
        {Array.from({length: CARD_TOTAL}, (_, i) => {
          const wave = waveOf(i);
          const at = wave * 15;
          if (frame < at) return null;
          const s = snap(frame, at);
          const to = cardSpot(i);
          if (wave === 0) {
            return <ReportCard key={i} x={to.x} y={to.y} rot={to.rot} scale={lerp(1.5, 1, s)} opacity={Math.min(1, s * 2)} />;
          }
          const prev = CARD_WAVES[wave - 1];
          const from = cardSpot((i - prev) % prev);
          return <ReportCard key={i} x={lerp(from.x, to.x, s)} y={lerp(from.y, to.y, s)} rot={lerp(from.rot, to.rot, s)} />;
        })}
      </svg>
      <TextStack
        size={112}
        lines={[
          [{t: 'Same reports.', at: 0}],
          [{t: 'Same data.', at: 30}],
          [
            {t: 'Every', at: 60},
            {t: 'week.', at: 60, color: C.cyan},
          ],
        ]}
      />
    </AbsoluteFill>
  );
};
