import { useEffect, useRef } from 'react';

// Ambient animated equalizer for the hero. Decorative only.
// Falls back to a single static frame when reduced motion is requested.
export default function Waveform({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const size = () => {
      const parent = canvas.parentElement;
      if (!parent) return null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || parent.clientWidth;
      const h = canvas.clientHeight || 120;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };

    let ctxSize = size();

    const roundBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    };

    const drawWave = (t: number) => {
      if (!ctxSize) return;
      const { ctx, w, h } = ctxSize;
      ctx.clearRect(0, 0, w, h);
      const bars = 46;
      const bw = w / bars;
      const mid = h / 2;
      for (let i = 0; i < bars; i++) {
        const phase = t * 0.0016 + i * 0.42;
        let amp = Math.sin(phase) * 0.5 + 0.5;
        amp = amp * amp;
        const bh = 6 + amp * (h * 0.82);
        const x = i * bw + bw * 0.28;
        ctx.fillStyle = i > bars * 0.68 ? '#E1341E' : '#CFCCC7';
        roundBar(ctx, x, mid - bh / 2, bw * 0.44, bh, Math.min(bw * 0.22, 3));
      }
    };

    if (reduce) {
      drawWave(1200);
    } else {
      const loop = (t: number) => {
        drawWave(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onResize = () => {
      ctxSize = size();
      if (reduce) drawWave(1200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
