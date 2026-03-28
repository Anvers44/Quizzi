// Web Audio API — beep simple, pas de fichier externe nécessaire
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playBeep(freq = 880, duration = 0.08, volume = 0.3) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

// Bip urgent pour les 5 dernières secondes
export function playTickBeep() {
  playBeep(660, 0.06, 0.2);
}

// Vibration mobile
export function vibrate(pattern: number | number[] = 80) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}
