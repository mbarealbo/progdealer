// ProgDealer wordmark, "Gatefold" direction: a record label mark (mustard label,
// a petrol-teal quarter, the spindle hole) beside the name set in Young Serif.

interface LogoProps {
  height?: number;
  /** 'ink' for light backgrounds (default), 'paper' for dark backgrounds */
  tone?: 'ink' | 'paper';
  /** Only the record mark, without the wordmark */
  markOnly?: boolean;
  className?: string;
  title?: string;
}

export function LogoMark({ size = 36, tone = 'ink' }: { size?: number; tone?: 'ink' | 'paper' }) {
  const disc = tone === 'ink' ? '#24261F' : '#ECE7DC';
  const groove = tone === 'ink' ? '#4A4C42' : '#BDB4A2';
  const hole = tone === 'ink' ? '#ECE7DC' : '#24261F';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill={disc} />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke={groove} strokeWidth="0.8" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke={groove} strokeWidth="0.8" />
      <circle cx="20" cy="20" r="7.8" fill="#D49A12" />
      <path d="M20 12.2a7.8 7.8 0 0 1 7.8 7.8H20z" fill="#1F5C5A" />
      <circle cx="20" cy="20" r="1.8" fill={hole} />
    </svg>
  );
}

export default function Logo({ height = 32, tone = 'ink', markOnly = false, className, title = 'ProgDealer' }: LogoProps) {
  if (markOnly) {
    return (
      <span className={className} role="img" aria-label={title} style={{ display: 'inline-flex' }}>
        <LogoMark size={height} tone={tone} />
      </span>
    );
  }
  const disc = tone === 'ink' ? '#24261F' : '#ECE7DC';
  const groove = tone === 'ink' ? '#4A4C42' : '#BDB4A2';
  const hole = tone === 'ink' ? '#ECE7DC' : '#24261F';
  const word = tone === 'ink' ? '#24261F' : '#ECE7DC';
  const width = (height / 40) * 196;

  return (
    <svg width={width} height={height} viewBox="0 0 196 40" role="img" aria-label={title} className={className}>
      <circle cx="20" cy="20" r="19" fill={disc} />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke={groove} strokeWidth="0.8" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke={groove} strokeWidth="0.8" />
      <circle cx="20" cy="20" r="7.8" fill="#D49A12" />
      <path d="M20 12.2a7.8 7.8 0 0 1 7.8 7.8H20z" fill="#1F5C5A" />
      <circle cx="20" cy="20" r="1.8" fill={hole} />
      <text x="48" y="28.5" fontFamily="'Young Serif', Georgia, serif" fontSize="25" letterSpacing="-0.3" fill={word}>
        ProgDealer
      </text>
    </svg>
  );
}
