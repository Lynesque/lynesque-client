import { useEffect, useRef, useState } from 'react';

export function useTimeline(duration = 7) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef(0);
  const startedFrom = useRef(0);

  useEffect(() => {
    if (!playing) return;
    startedAt.current = performance.now();
    startedFrom.current = time;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - startedAt.current) / 1000;
      const next = (startedFrom.current + elapsed) % duration;
      setTime(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

  const seek = (next: number) => {
    setTime(Math.max(0, Math.min(duration, next)));
    startedAt.current = performance.now();
    startedFrom.current = next;
  };

  return { time, playing, setPlaying, seek };
}
