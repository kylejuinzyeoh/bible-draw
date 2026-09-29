import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, TextStack, W, beatPulse, clamp01, draw, fontFamily, glow, lerp, settle, snap} from '../shared';

// 285–360: "I don't write code." Glyphs scatter → dissolve into lines → prompt box types "build me…".
const GLYPHS = ['{ }', '</>', ';', '{', '}', '</>', ';', '{ }', '</>', ';', '{', '}', '</>', ';', '{ }', '</>'];
const ORIGIN = {x: 540, y: 900};
const BOX = {x: 140, y: 1130, w: 800, h: 160};

const SPOTS = GLYPHS.map((g, i) => {
  const a = (i / GLYPHS.length) * Math.PI * 2 + random(`ga${i}`) * 0.35;
  const r = 300 + random(`gr${i}`) * 220;
  const x = Math.min(990, Math.max(90, ORIGIN.x + Math.cos(a) * r));
  const y = ORIGIN.y + Math.sin(a) * r * 1.5;
  const ex = BOX.x + 40 + (i / (GLYPHS.length - 1)) * (BOX.w - 80);
  const ey = y < BOX.y + BOX.h / 2 ? BOX.y : BOX.y + BOX.h;
  return {
    g,
    x,
    y,
    rot: (random(`gt${i}`) - 0.5) * 70,
    size: 70 + random(`gs${i}`) * 60,
    color: i % 2 ? C.violet : C.cyan,
    path: `M${x} ${y} C${x} ${(y + ey) / 2} ${ex} ${(y + ey) / 2} ${ex} ${ey}`,
  };
});

const T1 = 'build';
const T2 = ' me…';

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const burst = snap(frame, 0);
  const drift = 1 + 0.06 * settle(frame, 8, 30);
  const dissolve = draw(frame, 30, 10);
  const head = clamp01(snap(frame, 30));
  const tail = clamp01(snap(frame, 45));
  const box = draw(frame, 30, 12);
  const hit = frame >= 45 ? beatPulse(frame) : 0;

  const n1 = frame < 45 ? 0 : Math.min(T1.length, Math.floor((frame - 45) / 2) + 1);
  const n2 = frame < 60 ? 0 : Math.min(T2.length, Math.floor((frame - 60) / 2) + 1);
  const typing = (frame >= 45 && n1 < T1.length) || (frame >= 60 && n2 < T2.length);
  const cursorOn = typing || frame % 15 < 8;

  return (
    <AbsoluteFill>
      <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.5}}>
        {dissolve < 1
          ? SPOTS.map((s, i) => (
              <text
                key={i}
                x={lerp(ORIGIN.x, s.x, burst * drift)}
                y={lerp(ORIGIN.y, s.y, burst * drift)}
                fontFamily={fontFamily}
                fontWeight={800}
                fontSize={s.size * (1 - 0.5 * dissolve)}
                fill={s.color}
                textAnchor="middle"
                dominantBaseline="middle"
                opacity={Math.min(1, burst * 3) * (1 - dissolve)}
                transform={`rotate(${s.rot * burst} ${lerp(ORIGIN.x, s.x, burst * drift)} ${lerp(ORIGIN.y, s.y, burst * drift)})`}
                style={{filter: `blur(${dissolve * 10}px) ${glow(s.color, 10)}`}}
              >
                {s.g}
              </text>
            ))
          : null}
        {frame >= 30 && tail < 1
          ? SPOTS.map((s, i) => (
              <path
                key={i}
                d={s.path}
                fill="none"
                stroke={s.color}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={`${Math.max(0.001, head - tail)} 2`}
                strokeDashoffset={-tail}
                style={{filter: glow(s.color, 8)}}
              />
            ))
          : null}
      </svg>

      <svg width={W} height={1920} style={{position: 'absolute'}}>
        <rect
          x={BOX.x}
          y={BOX.y}
          width={BOX.w}
          height={BOX.h}
          rx={28}
          fill={C.cyan}
          fillOpacity={0.06 * box + 0.08 * hit}
          stroke={C.cyan}
          strokeWidth={4}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - box}
          style={{filter: glow(C.cyan, 12 + 20 * hit)}}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: BOX.x + 44,
          top: BOX.y,
          height: BOX.h,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          fontFamily,
          fontSize: 64,
          fontWeight: 700,
          color: C.text,
          opacity: box,
          whiteSpace: 'pre',
        }}
      >
        <span style={{color: C.cyan, fontWeight: 900}}>{'>'}</span>
        <span>
          {T1.slice(0, n1)}
          {T2.slice(0, n2)}
        </span>
        <span
          style={{
            marginLeft: -18,
            width: 8,
            height: 70,
            background: C.cyan,
            opacity: cursorOn ? 1 : 0,
            boxShadow: `0 0 16px ${C.cyan}`,
          }}
        />
      </div>

      <TextStack
        size={130}
        y={-230}
        lines={[[{t: 'I don’t', at: 0}], [{t: 'write code.', at: 15}]]}
      />
      <AbsoluteFill style={{background: C.cyan, opacity: interpolate(hit, [0, 1], [0, 0.06])}} />
    </AbsoluteFill>
  );
};
