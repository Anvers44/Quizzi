/**
 * sound.ts — Web Audio beeps + vibration + background music
 *
 * Background music: soft lofi piano loop (inspired by peaceful ambient piano)
 *   • Piano synthesis : sine fundamental + 2nd harmonic + percussive envelope
 *   • Key  : G major  (G – D – Em – C)
 *   • Tempo: 80 BPM  — peaceful, breathing feel
 *
 * iOS requires AudioContext to be created/resumed inside a user-gesture handler.
 */

let _ctx: AudioContext | null = null;
let _unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return _ctx;
}

export function unlockAudio(): void {
  const ctx = getCtx();
  if (!ctx || _unlocked) return;
  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
      _unlocked = true;
    });
  } else {
    _unlocked = true;
  }
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

function isEnabled(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("quiz_settings") || "{}");
    return s.soundEnabled !== false;
  } catch {
    return true;
  }
}

function isVibrationEnabled(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("quiz_settings") || "{}");
    return s.vibrationEnabled !== false;
  } catch {
    return true;
  }
}

export function playBeep(
  frequency = 880,
  duration = 80,
  type: OscillatorType = "sine",
  volume = 0.3,
): void {
  if (!isEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration / 1000,
    );
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch {}
}

export function playTickBeep(): void {
  playBeep(880, 80, "sine", 0.25);
}
export function playUrgentBeep(): void {
  playBeep(440, 150, "square", 0.3);
}
export function playPowerSound(): void {
  playBeep(660, 120, "triangle", 0.35);
  setTimeout(() => playBeep(990, 80, "triangle", 0.2), 130);
}
export function playCorrectSound(): void {
  playBeep(523, 80, "sine", 0.3);
  setTimeout(() => playBeep(659, 80, "sine", 0.3), 90);
  setTimeout(() => playBeep(784, 120, "sine", 0.3), 180);
}
export function playWrongSound(): void {
  playBeep(300, 200, "sawtooth", 0.2);
}
export function playCountdownStart(): void {
  playBeep(660, 100, "sine", 0.2);
}

export function vibrate(pattern: number | number[]): void {
  if (!isVibrationEnabled()) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

// ─── Background music — Soft Piano (Lofi / Peaceful) ─────────────────────────
//
//  Inspired by : calm ambient piano (lofi / Studio Ghibli feel)
//  Key    : G major  — G · D · Em · C   (I – V – vi – IV)
//  Tempo  : 80 BPM   — B = 0.75 s  |  H = 0.375 s  (8th note)
//
//  Piano synthesis:
//    osc1  sine @ fundamental          (vol × 1.0)
//    osc2  sine @ fundamental × 2      (vol × 0.22) — adds warmth/presence
//    Envelope: 3 ms snap → 70 ms initial decay → long natural tail
//              mimics a soft piano hammer strike

let _bgActive = false;
let _bgTimeout: ReturnType<typeof setTimeout> | null = null;

const BPM = 100;
const B = 60 / BPM; // 0.600 s — 1 beat
const H = B / 2; // 0.300 s — 8th note

const N = {
  _: 0,
  // ── Basse ─────────────────────────────────────
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  // ── Médium / Mélodie ──────────────────────────
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
} as const;
// ── Melody — 8 bars × 4 beats ────────────────────────────────────────────
//
//  Bar 1-2  Cmaj7 : saut G5→E5→C5 (ouverture lumineuse), réponse E5-D5-C5
//  Bar 3-4  Am7   : ligne A4-C5-B4-A4 (couleur mineure douce), montée vers E5
//  Bar 5-6  Dm7   : F5 comme note colorée, arpège D-F-A joyeux
//  Bar 7    G7    : lick dominant B4-D5-F4-G4 (tension heureuse)
//  Bar 8    Cmaj7 : résolution triomphale C5-E5-G4-C5
const BG_MELODY: [number, number][] = [
  // Bar 1 (Cmaj7)              — 4 beats = 2.40 s
  [N.G5, H],
  [N.E5, H],
  [N.C5, B],
  [N.E5, H],
  [N.D5, H],
  [N.C5, B],
  // Bar 2 (Cmaj7)              — 4 beats
  [N.E5, B + H],
  [N._, H],
  [N.D5, B],
  [N.C5, B],
  // Bar 3 (Am7)                — 4 beats
  [N.C5, H],
  [N.B4, H],
  [N.A4, B],
  [N.C5, H],
  [N.B4, H],
  [N.A4, B],
  // Bar 4 (Am7)                — 4 beats
  [N.E5, B + H],
  [N._, H],
  [N.G4, B],
  [N.A4, B],
  // Bar 5 (Dm7)                — 4 beats
  [N.F5, H],
  [N.E5, H],
  [N.D5, B],
  [N.F4, H],
  [N.A4, H],
  [N.C5, B],
  // Bar 6 (Dm7)                — 4 beats
  [N.D5, B + H],
  [N._, H],
  [N.F5, H],
  [N.E5, H],
  [N.D5, B],
  // Bar 7 (G7 — tension douce) — 4 beats
  [N.B4, H],
  [N.D5, H],
  [N.F4, H],
  [N.G4, H],
  [N.B4, B],
  [N.D5, B],
  // Bar 8 (Cmaj7 — home 🎉)    — 4 beats
  [N.C5, B],
  [N.E5, H],
  [N.G4, H],
  [N.C5, B + H],
  [N._, H],
];
// ── Bass — bossa nova (root ↔ quinte, rythmique et dansante) ─────────────
const BG_BASS: [number, number][] = [
  // Bars 1-2  Cmaj7
  [N.C3, B],
  [N.G3, B],
  [N.C3, B],
  [N.E3, B],
  [N.C3, B],
  [N.G3, B],
  [N.E3, B],
  [N.G3, B],
  // Bars 3-4  Am7
  [N.A2, B],
  [N.E3, B],
  [N.A2, B],
  [N.C3, B],
  [N.A2, B],
  [N.E3, B],
  [N.C3, B],
  [N.E3, B],
  // Bars 5-6  Dm7
  [N.D3, B],
  [N.A3, B],
  [N.D3, B],
  [N.F3, B],
  [N.D3, B],
  [N.A3, B],
  [N.F3, B],
  [N.A3, B],
  // Bars 7-8  G7 → Cmaj7
  [N.G2, B],
  [N.D3, B],
  [N.G2, B],
  [N.B2, B],
  [N.C3, B],
  [N.G3, B],
  [N.C3, B],
  [N.C3, B * 2],
  // Note: la dernière note dure 2 B pour équilibrer (G7 = 4B, C final = 4B)
  //       mais elle consomme 2 slots → on supprime le dernier [N.C3, B] ci-dessus
];
// ── Chord pads — tétrades lumineuses (sine, très doux) ───────────────────
const BG_CHORDS: [number[], number][] = [
  [[N.C3, N.E3, N.G3, N.B3], B * 4], // Cmaj7  (bar 1)
  [[N.C3, N.E3, N.G3, N.B3], B * 4], // Cmaj7  (bar 2)
  [[N.A2, N.C3, N.E3, N.G3], B * 4], // Am7    (bar 3)
  [[N.A2, N.C3, N.E3, N.G3], B * 4], // Am7    (bar 4)
  [[N.D3, N.F3, N.A3, N.C4], B * 4], // Dm7    (bar 5)
  [[N.D3, N.F3, N.A3, N.C4], B * 4], // Dm7    (bar 6)
  [[N.G2, N.B2, N.D3, N.F3], B * 4], // G7     (bar 7)
  [[N.C3, N.E3, N.G3, N.B3], B * 4], // Cmaj7  (bar 8)
];
const VOL_MELODY = 0.18; // mélodie légèrement plus présente
const VOL_BASS = 0.1;
const VOL_PAD = 0.01; // pad très discret sous les 4 sons
/**
 * _schedulePianoNote — synthesises a soft piano-like tone.
 *
 *  Two sine oscillators:
 *    osc1 @ freq      (fundamental)       — body of the sound
 *    osc2 @ freq × 2  (2nd harmonic)      — adds presence without harshness
 *
 *  Envelope:
 *    [0 → vol]  in 3 ms    (hammer strike, no click)
 *    [vol → vol×0.55] in 70 ms  (string settles after strike)
 *    [vol×0.55 → 0]  exponential over rest of note  (natural decay)
 */
function _schedulePianoNote(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  vol: number,
): void {
  if (freq === 0) return; // rest
  try {
    const master = ctx.createGain();
    master.connect(ctx.destination);

    // Fundamental
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = freq;
    g1.gain.value = 1.0;
    osc1.connect(g1);
    g1.connect(master);

    // 2nd harmonic — warmth without buzzing
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    g2.gain.value = 0.22;
    osc2.connect(g2);
    g2.connect(master);

    const attack = 0.003;
    const initialDecay = 0.07;
    const noteEnd = start + Math.max(dur, 0.12);

    master.gain.setValueAtTime(0, start);
    master.gain.linearRampToValueAtTime(vol, start + attack);
    master.gain.exponentialRampToValueAtTime(
      vol * 0.55,
      start + attack + initialDecay,
    );
    master.gain.exponentialRampToValueAtTime(0.0001, noteEnd * 0.94);

    osc1.start(start);
    osc1.stop(noteEnd);
    osc2.start(start);
    osc2.stop(noteEnd);
  } catch {}
}

function _scheduleLoop(): void {
  if (!_bgActive) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;

  // ── Channel 1 : Piano melody ──────────────────────────────────────────────
  let t = now;
  for (const [freq, dur] of BG_MELODY) {
    _schedulePianoNote(ctx, freq, t, dur, VOL_MELODY);
    t += dur;
  }
  const loopDuration = t - now;

  // ── Channel 2 : Piano bass ────────────────────────────────────────────────
  let bt = now;
  for (const [freq, dur] of BG_BASS) {
    _schedulePianoNote(ctx, freq, bt, dur, VOL_BASS);
    bt += dur;
  }

  // ── Channel 3 : Chord pads (sine wash, very soft) ─────────────────────────
  let ct = now;
  for (const [freqs, dur] of BG_CHORDS) {
    const fade = Math.min(0.45, dur * 0.12);
    freqs.forEach((freq) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ct);
        gain.gain.linearRampToValueAtTime(VOL_PAD, ct + fade);
        gain.gain.setValueAtTime(VOL_PAD, ct + dur - fade);
        gain.gain.linearRampToValueAtTime(0, ct + dur);
        osc.start(ct);
        osc.stop(ct + dur);
      } catch {}
    });
    ct += dur;
  }

  // Re-arm 300 ms before loop end for seamless looping
  _bgTimeout = setTimeout(_scheduleLoop, (loopDuration - 0.3) * 1000);
}

export function startBackgroundMusic(): void {
  if (_bgActive) return;
  if (!isEnabled()) return;
  _bgActive = true;
  _scheduleLoop();
}

export function stopBackgroundMusic(): void {
  _bgActive = false;
  if (_bgTimeout !== null) {
    clearTimeout(_bgTimeout);
    _bgTimeout = null;
  }
}
