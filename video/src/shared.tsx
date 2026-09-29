import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';

export const {fontFamily} = loadFont('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

export const C = {
  bg: '#07090F',
  cyan: '#22D3EE',
  violet: '#8B5CF6',
  text: '#E5E7EB',
} as const;

export const W = 1080;
export const H = 1920;
export const FPS = 30;
export const BEAT = 15; // 120 BPM @ 30fps

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Sharp on-beat hit: high stiffness, low damping.
export const snap = (frame: number, at: number) =>
  spring({frame: frame - at, fps: FPS, config: {stiffness: 520, damping: 18, mass: 0.6}});

// Small ease-out settle after a hit.
export const settle = (frame: number, at: number, len = 30) =>
  interpolate(frame, [at, at + len], [0, 1], {...CLAMP, easing: Easing.out(Easing.cubic)});

// Quick ease-out draw, for lines that should finish inside one beat.
export const draw = (frame: number, at: number, len = 12) =>
  interpolate(frame, [at, at + len], [0, 1], {...CLAMP, easing: Easing.bezier(0.16, 1, 0.3, 1)});

// 1 on every beat, decaying before the next one.
export const beatPulse = (frame: number) => Math.exp(-((frame % BEAT) / BEAT) * 6);

export const glow = (color: string, r = 14) => `drop-shadow(0 0 ${r}px ${color})`;

export type Pt = [number, number];

export const pointAt = (pts: Pt[], t: number): Pt => {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let d = clamp01(t) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : Math.min(1, d / lens[i]);
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
};

// ---------- Kinetic type ----------

export type Chunk = {t: string; at: number; color?: string; underlineAt?: number};

const Underline: React.FC<{at: number; frame: number; size: number}> = ({at, frame, size}) => {
  const p = draw(frame, at, 14);
  if (frame < at) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: -size * 0.1, height: size * 0.07}}>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 99,
          background: C.cyan,
          transform: `scaleX(${p})`,
          transformOrigin: 'left',
          boxShadow: `0 0 24px ${C.cyan}, 0 0 60px ${C.cyan}88`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${p * 100}%`,
          width: size * 0.16,
          height: size * 0.16,
          marginLeft: -size * 0.08,
          marginTop: -size * 0.08,
          borderRadius: 99,
          background: '#fff',
          opacity: 1 - settle(frame, at + 10, 10),
          boxShadow: `0 0 20px #fff, 0 0 40px ${C.cyan}`,
        }}
      />
    </div>
  );
};

const Slam: React.FC<{c: Chunk; frame: number; size: number}> = ({c, frame, size}) => {
  const s = snap(frame, c.at);
  const scale = interpolate(s, [0, 1], [1.9, 1]) * (1 + 0.035 * settle(frame, c.at + 6, 40));
  const opacity = frame < c.at ? 0 : 1;
  const blur = Math.max(0, (1 - s) * 14);
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        whiteSpace: 'pre',
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.04,
        letterSpacing: '-0.035em',
        color: c.color ?? C.text,
        opacity,
        transform: `scale(${scale})`,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        textShadow: c.color
          ? `0 0 30px ${c.color}99, 0 6px 40px rgba(7,9,15,0.95)`
          : '0 6px 40px rgba(7,9,15,0.95), 0 0 12px rgba(7,9,15,0.8)',
      }}
    >
      {c.t}
      {c.underlineAt !== undefined ? <Underline at={c.underlineAt} frame={frame} size={size} /> : null}
    </span>
  );
};

export const TextStack: React.FC<{lines: Chunk[][]; size: number; y?: number}> = ({lines, size, y = 0}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', transform: `translateY(${y}px)`}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily}}>
        {lines.map((line, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'center', gap: size * 0.26}}>
            {line.map((c, j) => (
              <Slam key={j} c={c} frame={frame} size={size} />
            ))}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Horizontal light streak ----------

export const Streak: React.FC<{at: number; y: number; dir?: 1 | -1; color?: string}> = ({
  at,
  y,
  dir = 1,
  color = C.cyan,
}) => {
  const frame = useCurrentFrame();
  if (frame < at || frame > at + 30) return null;
  const p = interpolate(frame, [at, at + 10], [0, 1], {...CLAMP, easing: Easing.out(Easing.quad)});
  const len = 460;
  const x = dir === 1 ? -len + p * (W + len) : W - p * (W + len);
  const trace = 1 - settle(frame, at + 4, 24);
  return (
    <>
      <div style={{position: 'absolute', top: y, left: 0, width: W, height: 1, background: color, opacity: 0.35 * trace}} />
      <div
        style={{
          position: 'absolute',
          top: y - 1.5,
          left: x,
          width: len,
          height: 4,
          borderRadius: 4,
          opacity: p < 1 ? 0.9 : 0,
          background: `linear-gradient(${dir === 1 ? 90 : 270}deg, transparent, ${color} 80%, #fff)`,
          filter: glow(color, 10),
        }}
      />
    </>
  );
};
