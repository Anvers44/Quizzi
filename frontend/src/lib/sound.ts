/**
 * sound.ts — Web Audio beeps + vibration
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
  // Play a silent buffer to fully unlock iOS
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

// Settings-aware beep
function isEnabled(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem("quiz_settings") || "{}");
    return s.soundEnabled !== false; // default true
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
 * @param frequency Hz
 * @param duration  ms
 * @param type      oscillator type
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

  // Auto-unlock on call (works if we're inside a gesture chain)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

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

/** Countdown tick (high beep) */
export function playTickBeep(): void {
  playBeep(880, 80, "sine", 0.25);
}

/** Final beep before time-out (lower, more urgent) */
export function playUrgentBeep(): void {
  playBeep(440, 150, "square", 0.3);
}

/** Power used / received */
export function playPowerSound(): void {
  playBeep(660, 120, "triangle", 0.35);
  setTimeout(() => playBeep(990, 80, "triangle", 0.2), 130);
}

/** Correct answer */
export function playCorrectSound(): void {
  playBeep(523, 80, "sine", 0.3); // C5
  setTimeout(() => playBeep(659, 80, "sine", 0.3), 90); // E5
  setTimeout(() => playBeep(784, 120, "sine", 0.3), 180); // G5
}

/** Wrong answer */
export function playWrongSound(): void {
  playBeep(300, 200, "sawtooth", 0.2);
}

/** Countdown start (beginning of round) */
export function playCountdownStart(): void {
  playBeep(660, 100, "sine", 0.2);
}

/**
 * Vibrate. Safe on all browsers:
 * - Android Chrome: works
 * - iOS: silently ignored (no support)
 * - Desktop: silently ignored
 */
export function vibrate(pattern: number | number[]): void {
  if (!isVibrationEnabled()) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}
