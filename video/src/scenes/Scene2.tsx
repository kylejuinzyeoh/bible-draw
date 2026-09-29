import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, Pt, TextStack, W, beatPulse, clamp01, fontFamily, glow, pointAt, snap} from '../shared';

// 60–105: "I was focused on sales." Chart draws up, counter 0 → 128% on the beats.
const PTS: Pt[] = [
  [60, 1560], [160, 1470], [260, 1500], [370, 1360], [470, 1290], [570, 1330],
  [680, 1120], [780, 960], [870, 1010], [950, 700], [1020, 520],
];
const LINE = PTS.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
const AREA = `${LINE} L1020 1720 L60 1720 Z`;

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const p = clamp01([0, 15, 30].reduce((a, b) => a + snap(frame, b), 0) / 3);
  const tip = pointAt(PTS, p);
  const pulse = beatPulse(frame);
  const value = Math.round(128 * p);

  return (
    <AbsoluteFill>
      <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.45}}>
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.cyan} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.cyan} stopOpacity={0} />
          </linearGradient>
          <clipPath id="reveal">
            <rect x={0} y={0} width={tip[0]} height={1920} />
          </clipPath>
        </defs>
        {[700, 1000, 1300, 1600].map((y) => (
          <line key={y} x1={60} x2={1020} y1={y} y2={y} stroke="#fff" strokeOpacity={0.12} strokeDasharray="4 12" />
        ))}
        <path d={AREA} fill="url(#area)" clipPath="url(#reveal)" />
        <path
          d={LINE}
          fill="none"
          stroke={C.cyan}
          strokeWidth={6}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - p}
          style={{filter: glow(C.cyan, 12)}}
        />
        <line x1={tip[0]} x2={tip[0]} y1={tip[1]} y2={1720} stroke={C.violet} strokeWidth={2} strokeDasharray="6 8" />
        <circle cx={tip[0]} cy={tip[1]} r={14 + 22 * pulse} fill={C.cyan} opacity={0.25 * pulse} />
        <circle cx={tip[0]} cy={tip[1]} r={12} fill="#fff" style={{filter: glow(C.cyan, 16)}} />
      </svg>

      <div
        style={{
          position: 'absolute',
          top: 300,
          width: W,
          textAlign: 'center',
          fontFamily,
          transform: `scale(${1 + 0.1 * pulse})`,
        }}
      >
        <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '0.3em', color: C.violet}}>SALES GROWTH</div>
        <div
          style={{
            fontSize: 200,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: C.cyan,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 40px ${C.cyan}88`,
          }}
        >
          {value}%
        </div>
      </div>

      <TextStack
        size={140}
        y={140}
        lines={[
          [{t: 'I was', at: 0}],
          [{t: 'focused', at: 0}],
          [
            {t: 'on', at: 15},
            {t: 'sales.', at: 15, color: C.cyan},
          ],
        ]}
      />
    </AbsoluteFill>
  );
};
