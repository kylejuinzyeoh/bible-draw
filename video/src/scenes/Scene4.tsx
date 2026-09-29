import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, TextStack, W, beatPulse, clamp01, glow, lerp, snap} from '../shared';
import {CARD_TOTAL, ReportCard, cardSpot} from './Scene3';

// 210–285: "So I automated it." Cards collapse into nodes, a loop pipeline, pulses on every beat.
const CX = 540;
const CY = 960;
const RX = 430;
const RY = 640;
const NODE_ANGLES = [-90, -30, 30, 90, 150, 210];
const at = (deg: number): [number, number] => [CX + RX * Math.cos((deg * Math.PI) / 180), CY + RY * Math.sin((deg * Math.PI) / 180)];
const NODES = NODE_ANGLES.map(at);
const RING = `M${CX} ${CY - RY} A${RX} ${RY} 0 1 1 ${CX} ${CY + RY} A${RX} ${RY} 0 1 1 ${CX} ${CY - RY}`;
const INNER = `M${CX} ${CY - RY + 90} A${RX - 60} ${RY - 90} 0 1 0 ${CX} ${CY + RY - 90} A${RX - 60} ${RY - 90} 0 1 0 ${CX} ${CY - RY + 90}`;

const PULSE_START = 30;

// Each beat, every pulse jumps one node forward along the ring.
const pulseDeg = (frame: number, j: number) => {
  const f = Math.max(frame, PULSE_START);
  const k = Math.floor((f - PULSE_START) / 15);
  return -90 + (k + snap(f, PULSE_START + k * 15) + j * 2) * 60;
};

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const s = snap(frame, 0);
  const edge = clamp01(snap(frame, 15));
  const pulsesOn = frame >= PULSE_START;
  const pulses = [0, 1, 2].map((j) => pulseDeg(frame, j));

  return (
    <AbsoluteFill>
      {frame < 16 ? (
        <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.42}}>
          {Array.from({length: CARD_TOTAL}, (_, i) => {
            const from = cardSpot(i);
            const [nx, ny] = NODES[i % NODES.length];
            return (
              <ReportCard
                key={i}
                x={lerp(from.x, nx, s)}
                y={lerp(from.y, ny, s)}
                rot={lerp(from.rot, 0, s)}
                w={Math.max(20, lerp(260, 56, s))}
                h={Math.max(20, lerp(180, 56, s))}
                r={lerp(16, 28, clamp01(s))}
                content={1 - clamp01(s * 2)}
                opacity={1 - clamp01((frame - 6) / 8)}
              />
            );
          })}
        </svg>
      ) : null}

      <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.5}}>
        <path d={RING} fill="none" stroke={C.cyan} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - edge} style={{filter: glow(C.cyan, 10)}} />
        <path d={RING} fill="none" stroke="#fff" strokeWidth={3} strokeDasharray="6 26" strokeDashoffset={-frame * 4} opacity={edge * 0.7} />
        <path d={INNER} fill="none" stroke={C.violet} strokeWidth={2} strokeDasharray="3 18" strokeDashoffset={frame * 3} opacity={edge * 0.8} />
        {NODES.map(([x, y], n) => {
          const hit = pulsesOn
            ? Math.max(...pulses.map((d) => 1 - clamp01(Math.abs(((d - NODE_ANGLES[n] + 540) % 360) - 180) / 22)))
            : 0;
          const grow = clamp01(frame / 6) * Math.min(1.2, s);
          return (
            <g key={n} transform={`translate(${x} ${y}) scale(${grow * (1 + 0.25 * hit)})`}>
              <circle r={44} fill={C.cyan} opacity={0.2 * hit} />
              <circle r={28} fill={C.bg} stroke={hit > 0.5 ? '#fff' : C.cyan} strokeWidth={5} style={{filter: glow(C.cyan, 8 + 14 * hit)}} />
              <circle r={9} fill={n % 2 ? C.violet : C.cyan} />
            </g>
          );
        })}
      </svg>

      {pulsesOn ? (
        <svg width={W} height={1920} style={{position: 'absolute', opacity: 0.9}}>
          {[0, 1, 2].map((j) =>
            [4, 3, 2, 1, 0].map((lag) => {
              const [x, y] = at(pulseDeg(frame - lag, j));
              return (
                <circle
                  key={`${j}-${lag}`}
                  cx={x}
                  cy={y}
                  r={lag ? 12 - lag * 2 : 14}
                  fill={lag ? C.cyan : '#fff'}
                  opacity={lag ? 0.5 - lag * 0.1 : 1}
                  style={lag ? undefined : {filter: glow(C.cyan, 18)}}
                />
              );
            }),
          )}
        </svg>
      ) : null}

      <TextStack
        size={130}
        lines={[
          [{t: 'So I', at: 0}],
          [{t: 'automated', at: 15, color: C.cyan}],
          [{t: 'it.', at: 30}],
        ]}
      />
      <AbsoluteFill style={{background: C.cyan, opacity: 0.08 * beatPulse(frame) * (pulsesOn ? 1 : 0)}} />
    </AbsoluteFill>
  );
};
