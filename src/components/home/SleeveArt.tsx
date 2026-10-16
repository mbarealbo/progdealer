import { motifFor, sleeveMirrored } from './sleeveMotifs';

// Generated record-sleeve artwork for shows without an image (motifs in sleeveMotifs).
export default function SleeveArt({ genre, seed, className }: { genre: string; seed: number; className?: string }) {
  const { bg, body } = motifFor(genre || 'Progressive Rock', seed)(seed);
  return (
    <svg className={className} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect x={0} y={0} width={100} height={100} fill={bg} />
      <g transform={sleeveMirrored(seed) ? 'translate(100 0) scale(-1 1)' : undefined}>{body}</g>
    </svg>
  );
}
