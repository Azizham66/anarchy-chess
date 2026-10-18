// Procedural Web Audio sound effects — zero audio files, zero network latency.
// Ported from the v1.1 prototype's "knock" synth and extended per move kind.

export type SoundKind = 'move' | 'capture' | 'emu' | 'jump' | 'trample' | 'check' | 'win' | 'lose' | 'draw' | 'click';

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
let enabled = (() => {
  try {
    return localStorage.getItem('anarch-sound') !== 'off';
  } catch {
    return true;
  }
})();

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem('anarch-sound', on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

function audio(): { ac: AudioContext; dest: AudioNode } | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      out = comp;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return { ac: ctx, dest: out as AudioNode };
  } catch {
    return null;
  }
}

export function playSound(kind: SoundKind): void {
  if (!enabled) return;
  const a = audio();
  if (!a) return;
  const { ac, dest } = a;
  const t = ac.currentTime;
  const sr = ac.sampleRate;

  const noise = (at: number, d: number, type: BiquadFilterType, f: number, v: number, pw: number) => {
    const n = Math.max(1, Math.floor(sr * d));
    const buf = ac.createBuffer(1, n, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, pw);
    const src = ac.createBufferSource();
    const fl = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = buf;
    fl.type = type;
    fl.frequency.value = f;
    g.gain.value = v;
    src.connect(fl);
    fl.connect(g);
    g.connect(dest);
    src.start(at);
  };
  const tone = (at: number, f0: number, f1: number, d: number, v: number, type: OscillatorType = 'sine') => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + d);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + d + 0.02);
  };
  const knock = (at: number, v: number, lp: number, body: number, d: number) => {
    noise(at, d, 'lowpass', lp, v * 1.6, 4);
    tone(at, body, body * 0.55, d, v * 0.7);
    noise(at, 0.008, 'highpass', 2500, v * 0.4, 2);
  };

  try {
    switch (kind) {
      case 'move':
        knock(t, 0.9, 1100, 180, 0.07);
        break;
      case 'capture':
        knock(t, 1.2, 900, 130, 0.1);
        knock(t + 0.05, 0.8, 1400, 210, 0.06);
        break;
      case 'emu':
        knock(t, 0.8, 1200, 190, 0.07);
        tone(t + 0.03, 1320, 1760, 0.22, 0.09, 'sine');
        tone(t + 0.07, 1980, 2640, 0.2, 0.05, 'triangle');
        break;
      case 'jump':
        knock(t, 0.9, 1000, 160, 0.07);
        tone(t + 0.06, 420, 840, 0.09, 0.16, 'triangle');
        knock(t + 0.13, 1.1, 800, 120, 0.1);
        break;
      case 'trample':
        knock(t, 1.4, 700, 95, 0.16);
        [0.03, 0.07, 0.1, 0.14].forEach((d) => noise(t + d, 0.012, 'highpass', 1800 + Math.random() * 1500, 0.5, 2));
        break;
      case 'check':
        knock(t, 0.9, 1100, 180, 0.07);
        tone(t + 0.08, 880, 880, 0.25, 0.2);
        tone(t + 0.18, 1047, 1047, 0.35, 0.18);
        break;
      case 'win':
        knock(t, 1, 800, 150, 0.1);
        [392, 494, 587, 784].forEach((f, i) => tone(t + 0.12 + i * 0.11, f, f, 0.5, 0.2, 'triangle'));
        break;
      case 'lose':
        knock(t, 1, 700, 120, 0.12);
        [440, 392, 349, 262].forEach((f, i) => tone(t + 0.12 + i * 0.14, f, f * 0.98, 0.55, 0.18, 'triangle'));
        break;
      case 'draw':
        knock(t, 1, 800, 150, 0.1);
        [440, 554].forEach((f, i) => tone(t + 0.12 + i * 0.15, f, f, 0.6, 0.16, 'sine'));
        break;
      case 'click':
        noise(t, 0.012, 'highpass', 3000, 0.25, 2);
        break;
    }
  } catch {
    /* audio is best-effort */
  }
}
