/**
 * sound.ts — Web Audio beeps + vibration + background music
 *
 * iOS requires AudioContext to be created/resumed inside a user-gesture handler.
 * Strategy: create the context lazily on first user interaction, then reuse it.
 * For vibration: navigator.vibrate is not supported on iOS at all — we skip silently.
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

// Call this on any user gesture (touch/click) to unlock audio on iOS
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

// Settings-aware
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

/**
 * Play a short beep.
 */
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

// ─── Background music ─────────────────────────────────────────
// Soft ambient pad using a I–vi–IV–V chord loop.
// Volume is intentionally low (0.025) so it doesn't mask sound effects.

let _bgActive = false;
let _bgTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Chord progression to loop: C – Am – F – G (each 2.5 s)
 * Frequencies are one octave lower than standard to stay ambient.
 */
const BG_CHORDS: number[][] = [
  [130.81, 164.81, 196.0], // C3 E3 G3
  [110.0, 130.81, 164.81], // A2 C3 E3
  [87.31, 110.0, 130.81], // F2 A2 C3
  [98.0, 123.47, 146.83], // G2 B2 D3
];
const BG_CHORD_DURATION = 2.5; // seconds per chord
const BG_VOLUME = 0.025;

function _scheduleLoop(): void {
  if (!_bgActive) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  BG_CHORDS.forEach((freqs, i) => {
    const start = now + i * BG_CHORD_DURATION;
    const dur = BG_CHORD_DURATION;
    freqs.forEach((freq) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(BG_VOLUME, start + 0.6);
        gain.gain.setValueAtTime(BG_VOLUME, start + dur - 0.6);
        gain.gain.linearRampToValueAtTime(0, start + dur);
        osc.start(start);
        osc.stop(start + dur);
      } catch {}
    });
  });

  const totalMs = BG_CHORDS.length * BG_CHORD_DURATION * 1000;
  // Re-schedule slightly before the loop ends to avoid silence gap
  _bgTimeout = setTimeout(_scheduleLoop, totalMs - 300);
}

/**
 * Start the background ambient music loop.
 * Safe to call multiple times — won't stack.
 */
export function startBackgroundMusic(): void {
  if (_bgActive) return;
  if (!isEnabled()) return;
  _bgActive = true;
  _scheduleLoop();
}

/**
 * Stop the background ambient music loop.
 */
export function stopBackgroundMusic(): void {
  _bgActive = false;
  if (_bgTimeout !== null) {
    clearTimeout(_bgTimeout);
    _bgTimeout = null;
  }
}
