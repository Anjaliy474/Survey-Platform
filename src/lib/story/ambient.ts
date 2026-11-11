import type { Mood } from "@/lib/survey/types";

/** A soft pad chord per mood (Hz) and a noise colour, so no audio files are downloaded. */
const MOOD_SOUND: Record<Mood, { chord: number[]; noiseHz: number }> = {
  festive: { chord: [196, 247, 294], noiseHz: 900 },
  cosy: { chord: [174.6, 220, 261.6], noiseHz: 500 },
  adventure: { chord: [220, 277.2, 329.6], noiseHz: 1200 },
  space: { chord: [130.8, 196, 246.9], noiseHz: 300 },
  nature: { chord: [196, 246.9, 329.6], noiseHz: 1600 },
  retro: { chord: [220, 261.6, 329.6], noiseHz: 700 },
  everyday_india: { chord: [146.8, 220, 293.7], noiseHz: 800 },
};

const MAX_GAIN = 0.15;

/** Starts a gentle ambient loop; returns a function that fades it out and closes the context. */
export function startAmbient(mood: Mood): () => void {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => undefined;
  const ctx = new AudioCtx();
  const { chord, noiseHz } = MOOD_SOUND[mood];
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(MAX_GAIN, ctx.currentTime + 1);
  master.connect(ctx.destination);

  const oscillators = chord.map((hz, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = 0.22 / (i + 1);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08 + i * 0.03;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain).connect(g.gain);
    osc.connect(g).connect(master);
    osc.start();
    lfo.start();
    return [osc, lfo];
  });

  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = noiseHz;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.25;
  noise.connect(filter).connect(noiseGain).connect(master);
  noise.start();

  return () => {
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 0.6);
    window.setTimeout(() => {
      oscillators.flat().forEach((o) => o.stop());
      noise.stop();
      void ctx.close();
    }, 700);
  };
}
