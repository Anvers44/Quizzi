import { useEffect, useState } from "react";

// Supporte la pause : quand paused=true, le timer se fige
export function useTimer(
  startedAt: number,
  timeLimit: number,
  paused?: boolean,
): number {
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(0, Math.ceil(timeLimit - elapsed));
  });

  useEffect(() => {
    if (paused) return; // fige le timer
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(timeLimit - elapsed)));
    };
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [startedAt, timeLimit, paused]);

  return timeLeft;
}
