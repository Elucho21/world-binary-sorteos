// Synthesized background "music" for the live draw — same Web Audio
// oscillator approach as lib/win-chime.ts, just with a looping melody
// instead of one-shot effects. These are short 8-bit-style tunes, not
// real instrument recordings — no audio files/libraries involved.

export type MusicTrackId = "alegre" | "epica" | "gamer" | "terror";

interface NoteStep {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

export interface MusicTrack {
  id: MusicTrackId;
  label: string;
  steps: NoteStep[];
}

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  alegre: {
    id: "alegre",
    label: "Alegre",
    steps: [
      { freq: 523.25, duration: 0.16, type: "triangle" },
      { freq: 659.25, duration: 0.16, type: "triangle" },
      { freq: 783.99, duration: 0.16, type: "triangle" },
      { freq: 1046.5, duration: 0.16, type: "triangle" },
      { freq: 783.99, duration: 0.16, type: "triangle" },
      { freq: 659.25, duration: 0.16, type: "triangle" },
    ],
  },
  epica: {
    id: "epica",
    label: "Épica",
    steps: [
      { freq: 261.63, duration: 0.9, type: "sawtooth", gain: 0.045 },
      { freq: 329.63, duration: 0.9, type: "sawtooth", gain: 0.045 },
      { freq: 392.0, duration: 0.9, type: "sawtooth", gain: 0.045 },
      { freq: 523.25, duration: 1.1, type: "sawtooth", gain: 0.055 },
    ],
  },
  gamer: {
    id: "gamer",
    label: "Gamer",
    steps: [
      { freq: 523.25, duration: 0.09, type: "square" },
      { freq: 659.25, duration: 0.09, type: "square" },
      { freq: 783.99, duration: 0.09, type: "square" },
      { freq: 659.25, duration: 0.09, type: "square" },
      { freq: 523.25, duration: 0.09, type: "square" },
      { freq: 659.25, duration: 0.09, type: "square" },
      { freq: 783.99, duration: 0.09, type: "square" },
      { freq: 987.77, duration: 0.09, type: "square" },
    ],
  },
  terror: {
    id: "terror",
    label: "Terror",
    steps: [
      { freq: 220, duration: 1.1, type: "sine", gain: 0.05 },
      { freq: 233.08, duration: 1.1, type: "triangle", gain: 0.04 },
      { freq: 220, duration: 1.1, type: "sine", gain: 0.05 },
      { freq: 155.56, duration: 1.3, type: "triangle", gain: 0.04 },
    ],
  },
};

function loopDurationSeconds(track: MusicTrack) {
  return track.steps.reduce((sum, s) => sum + s.duration, 0);
}

export function playMusicLoop(
  ctx: AudioContext | null,
  trackId: MusicTrackId,
  targetSeconds = 240
): OscillatorNode[] {
  if (!ctx) return [];
  const track = MUSIC_TRACKS[trackId];
  const nodes: OscillatorNode[] = [];
  try {
    const loopDuration = loopDurationSeconds(track);
    const repeats = Math.max(1, Math.ceil(targetSeconds / loopDuration));
    let time = ctx.currentTime;
    for (let r = 0; r < repeats; r++) {
      for (const step of track.steps) {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = step.type ?? "sine";
        osc.frequency.value = step.freq;
        const peak = step.gain ?? 0.05;
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(peak, time + Math.min(0.03, step.duration / 4));
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + step.duration);
        osc.connect(gainNode).connect(ctx.destination);
        osc.start(time);
        osc.stop(time + step.duration + 0.02);
        nodes.push(osc);
        time += step.duration;
      }
    }
  } catch {
    // Autoplay/audio blocked — silently skip, it's a non-essential flourish.
  }
  return nodes;
}

export function stopMusic(nodes: OscillatorNode[]) {
  for (const osc of nodes) {
    try {
      osc.stop();
    } catch {
      // already stopped or never started
    }
  }
}
