import { useEffect, useState } from "react";

export function useTimer(startedAt: number, timeLimit: number): number {
  const [timeLeft, setTimeLeft] = useState(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    return Math.max(0, Math.ceil(timeLimit - elapsed));
  });

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(timeLimit - elapsed)));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [startedAt, timeLimit]);

  return timeLeft;
}
