// Synthesizes the BuildStory soundtrack: public/audio/music.wav + public/audio/sfx.wav.
// 120 BPM, locked to the video's 15-frame beat grid. Run: npm run audio
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 44100;
const FPS = 30;
const LEN = 15;
const N = SR * LEN;
const BEAT = 0.5; // seconds
const TAU = Math.PI * 2;

// ---------- utils ----------
let seed = 7;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const fr = (frame) => frame / FPS; // frame -> seconds
const bus = () => ({L: new Float32Array(N), R: new Float32Array(N)});

// Place a mono buffer on a stereo bus. pan: number or (i => -1..1).
const place = (b, t, mono, gain = 1, pan = 0) => {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < mono.length; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    const p = typeof pan === 'function' ? pan(i / mono.length) : pan;
    const a = ((p + 1) * Math.PI) / 4;
    b.L[s] += mono[i] * gain * Math.cos(a);
    b.R[s] += mono[i] * gain * Math.sin(a);
  }
};

// TPT state-variable filter; cutoff may be a function of sample index.
const svf = (x, cutoff, q = 0.7, mode = 'lp') => {
  const out = new Float32Array(x.length);
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(18000, Math.max(20, typeof cutoff === 'function' ? cutoff(i / SR) : cutoff));
    const g = Math.tan((Math.PI * fc) / SR);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x[i] - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    out[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x[i] - k * v1 - v2;
  }
  return out;
};

const gen = (dur, fn) => {
  const out = new Float32Array(Math.round(dur * SR));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
};

const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));

// Freeverb-style reverb on a stereo bus, returns wet bus.
const reverb = (b, size = 0.84, damp = 0.35) => {
  const wet = bus();
  const combs = [1116, 1188, 1277, 1356];
  const aps = [556, 441];
  for (const [ch, spread] of [['L', 0], ['R', 23]]) {
    const x = b[ch];
    const y = wet[ch];
    for (const d0 of combs) {
      const d = d0 + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      let lp = 0;
      for (let i = 0; i < N; i++) {
        const o = buf[idx];
        lp = o * (1 - damp) + lp * damp;
        buf[idx] = x[i] + lp * size;
        y[i] += o * 0.25;
        idx = (idx + 1) % d;
      }
    }
    for (const d0 of aps) {
      const d = d0 + spread;
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const o = buf[idx];
        const v = y[i];
        buf[idx] = v + o * 0.5;
        y[i] = o - v;
        idx = (idx + 1) % d;
      }
    }
  }
  return wet;
};

const mixInto = (dst, src, gain = 1, env) => {
  for (let i = 0; i < N; i++) {
    const g = gain * (env ? env[i] : 1);
    dst.L[i] += src.L[i] * g;
    dst.R[i] += src.R[i] * g;
  }
};

const writeWav = (path, b, peak) => {
  let max = 0;
  for (let i = 0; i < N; i++) {
    b.L[i] = Math.tanh(b.L[i]);
    b.R[i] = Math.tanh(b.R[i]);
    max = Math.max(max, Math.abs(b.L[i]), Math.abs(b.R[i]));
  }
  const g = peak / (max || 1);
  const fade = SR * 0.02;
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const f = Math.min(1, (N - i) / fade);
    data.writeInt16LE(Math.round(b.L[i] * g * f * 32767), i * 4);
    data.writeInt16LE(Math.round(b.R[i] * g * f * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
};

// ---------- instruments ----------
const kick = (big = 1) => {
  let ph = 0;
  return gen(0.45, (t) => {
    ph += (45 + 120 * big * Math.exp(-t * 32)) / SR;
    return Math.tanh(1.6 * Math.sin(TAU * ph) * Math.exp(-t * 7.5) + noise() * Math.exp(-t * 500) * 0.35);
  });
};
const clap = () => {
  const raw = gen(0.3, (t) => {
    const burst = [0, 0.011, 0.022].some((o) => t >= o && t < o + 0.008) ? 1 : 0;
    return noise() * (burst + Math.exp(-(t - 0.022) * 22) * (t > 0.022 ? 0.8 : 0));
  });
  return svf(raw, 1400, 1.4, 'bp');
};
const hat = (open = false) => svf(gen(open ? 0.22 : 0.05, (t) => noise() * Math.exp(-t * (open ? 18 : 90))), 8000, 0.7, 'hp');
const bass = (m, dur) => {
  let p1 = 0;
  let p2 = 0;
  const f = hz(m);
  const raw = gen(dur, (t) => {
    p1 += f / SR;
    p2 += (f * 1.006) / SR;
    const env = Math.min(1, t / 0.004) * Math.min(1, (dur - t) / 0.02);
    return (saw(p1) + saw(p2)) * 0.5 * env + Math.sin(TAU * p1) * 0.6 * env;
  });
  return svf(raw, (t) => 160 + 1100 * Math.exp(-t * 14), 1.2);
};
const pad = (notes, dur, cutoff = 1500) => {
  const ph = notes.flatMap(() => [0, 0, 0]);
  const det = [0.994, 1, 1.006];
  const raw = gen(dur, (t) => {
    let v = 0;
    notes.forEach((m, n) =>
      det.forEach((d, k) => {
        const idx = n * 3 + k;
        ph[idx] += (hz(m) * d) / SR;
        v += saw(ph[idx]);
      }),
    );
    return (v / (notes.length * 3)) * Math.min(1, t / 0.25) * Math.min(1, (dur - t) / 0.3);
  });
  return svf(raw, cutoff, 0.8);
};
const pluck = (m) => {
  let ph = 0;
  const raw = gen(0.22, (t) => {
    ph += hz(m) / SR;
    return (ph % 1 < 0.5 ? 1 : -1) * Math.exp(-t * 16);
  });
  return svf(raw, (t) => 900 + 3500 * Math.exp(-t * 25), 1);
};
const bell = (m, dur = 1.6) =>
  gen(dur, (t) => {
    const f = hz(m);
    return (
      Math.sin(TAU * f * t) * Math.exp(-t * 3) +
      0.5 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6) +
      0.25 * Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 10)
    );
  });
const sweep = (dur, f0, f1, q = 2, shape = (x) => Math.sin(Math.PI * x)) =>
  svf(
    gen(dur, (t) => noise() * shape(t / dur)),
    (t) => f0 * (f1 / f0) ** (t / dur),
    q,
    'bp',
  );
const boom = (dur = 1.4) => {
  let ph = 0;
  const low = gen(dur, (t) => {
    ph += (32 + 70 * Math.exp(-t * 9)) / SR;
    return Math.sin(TAU * ph) * Math.exp(-t * 3);
  });
  const crack = svf(gen(dur, (t) => noise() * Math.exp(-t * 14)), 2500, 0.7);
  return low.map((v, i) => Math.tanh(1.4 * v + crack[i] * 0.6));
};
const blip = (f0, f1, dur = 0.09) => {
  let ph = 0;
  return gen(dur, (t) => {
    ph += (f0 * (f1 / f0) ** (t / dur)) / SR;
    return Math.sin(TAU * ph) * Math.exp(-t * (4 / dur));
  });
};
const keyClick = () => svf(gen(0.03, (t) => noise() * Math.exp(-t * 260)), 3500, 1.5, 'bp');
const glitch = () => {
  let hold = 0;
  let ph = 0;
  let f = 400;
  return gen(0.4, (t, i) => {
    if (i % 1400 === 0) f = 200 + rnd() * 1800;
    if (i % 6 === 0) hold = Math.round(noise() * 6) / 6;
    ph += f / SR;
    return ((ph % 1 < 0.5 ? 0.6 : -0.6) + hold * 0.5) * Math.exp(-t * 6) * (rnd() > 0.15 ? 1 : 0);
  });
};

// ---------- music ----------
// A minor → F → C → G, resolving to C for the payoff line (beat 24 = frame 360).
const CHORDS = [
  {root: 45, pad: [57, 60, 64]},
  {root: 41, pad: [53, 57, 60]},
  {root: 48, pad: [55, 60, 64]},
  {root: 43, pad: [55, 59, 62]},
  {root: 45, pad: [57, 60, 64]},
  {root: 41, pad: [53, 57, 60]},
  {root: 48, pad: [55, 60, 64, 67]},
  {root: 48, pad: [55, 60, 64, 67]},
];
const chordAt = (beat) => CHORDS[Math.floor(beat / 4)];
const BREAK = [21, 22, 23]; // frames 315–359: kick drops, riser builds

const drums = bus();
const tonal = bus();
const send = bus();
const kickTimes = [];

for (let b = 0; b < 30; b++) {
  const t = b * BEAT;
  const inBreak = BREAK.includes(b);
  if (!inBreak) {
    place(drums, t, kick(b === 24 ? 1.4 : 1), b === 24 ? 1.1 : 0.9);
    kickTimes.push(t);
  }
  if (b >= 4 && b < 21) place(drums, t + BEAT / 2, hat(b >= 7), b >= 7 ? 0.22 : 0.18, 0.3);
  if (b >= 7 && b < 21) place(drums, t + BEAT / 4, hat(), 0.08, -0.3);
  if (b >= 7 && b < 21 && b % 2 === 1) place(drums, t, clap(), 0.5, -0.1);
  if (b === 26) place(drums, t, clap(), 0.55);

  const ch = chordAt(b);
  if (b < 4) place(tonal, t, bass(ch.root, 0.2), 0.55);
  else if (b < 21) {
    place(tonal, t, bass(ch.root, 0.22), 0.5);
    place(tonal, t + BEAT / 2, bass(ch.root + 12, 0.2), 0.4);
  } else if (b >= 24) place(tonal, t, bass(ch.root, 0.46), 0.5);

  if (b % 4 === 0 && b < 20) {
    const p = pad(ch.pad, 2.05, b < 4 ? 700 : 1500);
    place(tonal, t, p, 0.3, -0.2);
    place(send, t, p, 0.25);
  }
  if (b >= 14 && b < 21) {
    const tones = [...ch.pad, ch.pad[1] + 12];
    for (let s = 0; s < 4; s++) {
      const n = pluck(tones[(b * 4 + s) % tones.length] + 12);
      place(tonal, t + (s * BEAT) / 4, n, 0.14, s % 2 ? 0.4 : -0.4);
      place(send, t + (s * BEAT) / 4, n, 0.08);
    }
  }
}
// Break: filtered pad swell + noise riser into the drop.
{
  const p = pad(CHORDS[5].pad, 1.5, 600);
  place(tonal, 21 * BEAT, p, 0.3);
  place(send, 21 * BEAT, p, 0.3);
  const riser = sweep(1.5, 300, 9000, 3, (x) => x ** 2);
  place(tonal, 21 * BEAT, riser, 0.5);
  place(send, 21 * BEAT, riser, 0.3);
}
// Payoff pad: open C major, rings to the end.
{
  const p = pad([48, 55, 60, 64, 67, 71], 3.05, 2400);
  place(tonal, 24 * BEAT, p, 0.34);
  place(send, 24 * BEAT, p, 0.4);
}

// Sidechain duck on every kick → the pumping, up-tempo feel.
const duck = new Float32Array(N);
for (let i = 0, k = 0; i < N; i++) {
  const t = i / SR;
  while (k + 1 < kickTimes.length && kickTimes[k + 1] <= t) k++;
  const since = t - kickTimes[k];
  duck[i] = since >= 0 ? 1 - 0.65 * Math.exp(-since * 11) : 1;
}

const music = bus();
mixInto(music, drums, 1);
mixInto(music, tonal, 1, duck);
mixInto(music, reverb(send), 0.5, duck);
// Fade the tail over the last 20 frames.
for (let i = Math.round(fr(430) * SR); i < N; i++) {
  const g = 1 - (i / SR - fr(430)) / (LEN - fr(430));
  music.L[i] *= g;
  music.R[i] *= g;
}

// ---------- sfx (cue frames match the scenes) ----------
const sfx = bus();
const sfxSend = bus();
const cue = (frame, buf, gain, pan = 0, wet = 0) => {
  place(sfx, fr(frame), buf, gain, pan);
  if (wet) place(sfxSend, fr(frame), buf, gain * wet, pan);
};
// Whoosh that lands exactly on the beat (starts before the frame).
const whooshIn = (frame, gain = 0.35) => {
  const dur = 0.22;
  place(sfx, fr(frame) - dur, sweep(dur, 800, 6000, 1.5, (x) => x ** 2.5), gain);
};

// Word slams
[15, 30, 45, 60, 75, 105, 135, 210, 225, 240, 285, 300, 390].forEach((f) => whooshIn(f));
cue(0, boom(0.9), 0.5, 0, 0.3);
cue(45, blip(180, 60, 0.25), 0.5); // "AI." punch

// Scene 1 + 6 streaks: panned sweeps following the line direction
[
  [0, 1], [0, -1], [15, -1], [15, 1], [30, 1], [30, -1], [45, -1], [45, 1], [360, 1], [390, -1],
].forEach(([f, dir], n) =>
  place(sfx, fr(f), sweep(0.34, 1500 + n * 150, 7000, 2.5, (x) => Math.sin(Math.PI * x) * (1 - x)), 0.22, (x) => dir * (x * 2 - 1)),
);

// Scene 2: counter ticks (rising) + ding on 128%
[60, 75, 90].forEach((b, k) => {
  for (let f = b; f < b + 9; f += 2) cue(f, blip(1400 + k * 400 + (f - b) * 60, 1400 + k * 400 + (f - b) * 60, 0.03), 0.14);
});
cue(90, bell(88), 0.28, 0.2, 0.5);

// Scene 3: card pops on each beat, heavier as clutter grows; impact on 165
for (let k = 0; k < 7; k++) {
  const f = 105 + k * 15;
  for (let j = 0; j <= Math.min(3, k); j++) cue(f, blip(900 - j * 120, 260, 0.08), 0.16, (j % 2 ? 1 : -1) * 0.2 * j);
}
cue(165, boom(1.2), 0.85, 0, 0.35);

// Scene 4: collapse zip, line draw, data pulses
cue(210, sweep(0.3, 6000, 400, 2, (x) => (1 - x) ** 0.5 * Math.min(1, x * 20)), 0.35);
cue(225, blip(300, 1500, 0.45), 0.18, 0, 0.3);
[240, 255, 270].forEach((f, k) => cue(f, pluck(84 + k * 2), 0.22, [-0.5, 0.5, 0][k], 0.5));

// Scene 5: glyph glitch, dissolve shimmer, box lock, typing
cue(285, glitch(), 0.3);
cue(315, sweep(0.45, 3000, 12000, 6, (x) => Math.sin(Math.PI * x)), 0.25, 0, 0.4);
cue(330, blip(220, 110, 0.12), 0.35);
[330, 332, 334, 336, 338, 345, 347, 349, 351].forEach((f, k) => cue(f, keyClick(), 0.5, (k % 3) * 0.15 - 0.15));

// Scene 6: payoff impact, underline swoosh, signature chime
cue(360, boom(1.8), 1, 0, 0.5);
whooshIn(405, 0.25);
cue(405, sweep(0.35, 2000, 9000, 2, (x) => (1 - x) * Math.min(1, x * 15)), 0.22, (x) => x * 1.6 - 0.8);
cue(420, bell(76, 2), 0.18, -0.15, 0.6);
cue(420, bell(83, 2), 0.12, 0.15, 0.6);

mixInto(sfx, reverb(sfxSend, 0.8, 0.3), 0.5);

mkdirSync('public/audio', {recursive: true});
writeWav('public/audio/music.wav', music, 0.7);
writeWav('public/audio/sfx.wav', sfx, 0.89);
console.log('Wrote public/audio/music.wav and public/audio/sfx.wav');
