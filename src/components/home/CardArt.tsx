import { useEffect, useRef } from 'react';

interface CardArtProps {
  hue: number;
  seed: number;
  className?: string;
}

// Generated "album-art" style visual for events without an image:
// a two-tone gradient, concentric vinyl/soundwave arcs and an equalizer strip.
export default function CardArt({ hue, seed, className }: CardArtProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w === 0 || h === 0) {
        frame = requestAnimationFrame(draw);
        return;
      }
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `hsl(${hue}, 42%, 26%)`);
      g.addColorStop(1, `hsl(${(hue + 24) % 360}, 38%, 14%)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // concentric arcs (vinyl / soundwave)
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.4;
      const cx = w * 0.82;
      const cy = h * 0.5;
      for (let r = 10; r < 260; r += 13) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // equalizer strip
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (let b = 0; b < 9; b++) {
        const bh = 8 + ((seed * (b + 3)) % 34);
        ctx.fillRect(14 + b * 8, h - 14 - bh, 4, bh);
      }
      ctx.globalAlpha = 1;
    };

    draw();
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [hue, seed]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
