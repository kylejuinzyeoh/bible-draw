import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, Streak, TextStack} from '../shared';

// 0–60: "I never planned" / "to build AI."
const STREAKS: {at: number; y: number; dir: 1 | -1}[] = [
  {at: 0, y: 420, dir: 1},
  {at: 0, y: 1500, dir: -1},
  {at: 15, y: 760, dir: -1},
  {at: 15, y: 1240, dir: 1},
  {at: 30, y: 560, dir: 1},
  {at: 30, y: 1380, dir: -1},
  {at: 45, y: 300, dir: -1},
  {at: 45, y: 1620, dir: 1},
];

export const Scene1: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{opacity: 0.5}}>
      {STREAKS.map((s, i) => (
        <Streak key={i} {...s} />
      ))}
    </AbsoluteFill>
    <TextStack
      size={160}
      lines={[
        [{t: 'I never', at: 0}],
        [{t: 'planned', at: 15}],
        [{t: 'to build', at: 30}],
        [{t: 'AI.', at: 45, color: C.cyan}],
      ]}
    />
  </AbsoluteFill>
);
