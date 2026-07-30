// Tiny synthesized sound effects via Web Audio API — no external audio files.
// A single AudioContext is shared across a whole draw sequence (ticks + final
// chime) so we don't spin up a new one for every tick.

type AudioCtxCtor = typeof AudioContext;

export function createAudioContext(): AudioContext | null {
  try {
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: AudioCtxCtor }).webkitAudioContext) as AudioCtxCtor;
    return new Ctor();
  } catch {
    return null;
  }
}

export function playTick(ctx: AudioContext | null, pitch = 700) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = pitch;
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(0.05, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.06);
  } catch {
    // Autoplay/audio blocked — silently skip, it's a non-essential flourish.
  }
}

export function playCountdownBeep(ctx: AudioContext | null, step: 3 | 2 | 1 | 0) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = step === 0 ? "sine" : "square";
    osc.frequency.value = step === 0 ? 880 : 440;
    const start = ctx.currentTime;
    const duration = step === 0 ? 0.35 : 0.15;
    gain.gain.setValueAtTime(0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch {
    // Autoplay/audio blocked — silently skip, it's a non-essential flourish.
  }
}

export function playWinChime(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  } catch {
    // Autoplay/audio blocked — silently skip, it's a non-essential flourish.
  }
}
