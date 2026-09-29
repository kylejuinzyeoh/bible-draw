import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, Streak, TextStack, W, fontFamily, settle} from '../shared';

// 360–450: "But I know" / "what's worth building." Underline draws, signature at 420.
export const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const sig = settle(frame, 60, 14);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 0.4}}>
        <Streak at={0} y={640} dir={1} />
        <Streak at={30} y={1330} dir={-1} color={C.violet} />
      </AbsoluteFill>
      <TextStack
        size={128}
        y={-40}
        lines={[
          [{t: 'But I know', at: 0}],
          [{t: 'what’s worth', at: 30}],
          [{t: 'building.', at: 30, color: C.cyan, underlineAt: 45}],
        ]}
      />
      <div
        style={{
          position: 'absolute',
          top: 1250,
          width: W,
          textAlign: 'center',
          fontFamily,
          fontSize: 42,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: C.text,
          opacity: sig * 0.85,
          transform: `translateY(${(1 - sig) * 24}px)`,
        }}
      >
        Kyle Yeoh <span style={{color: C.cyan}}>·</span> AI Builder
      </div>
    </AbsoluteFill>
  );
};
