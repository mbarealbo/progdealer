// ProgDealer wordmark — direction "Signal" (approved).
// An equalizer mark with one bar peaking in the accent colour.

interface LogoProps {
  height?: number;
  /** 'ink' for light backgrounds (default), 'paper' for dark backgrounds */
  tone?: 'ink' | 'paper';
  className?: string;
  title?: string;
}

export default function Logo({ height = 28, tone = 'ink', className, title = 'ProgDealer' }: LogoProps) {
  const markBg = tone === 'ink' ? '#191A1D' : '#F5F4F2';
  const bars = tone === 'ink' ? '#FFFFFF' : '#191A1D';
  const word = tone === 'ink' ? '#191A1D' : '#F5F4F2';
  const width = (height / 40) * 200;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 40"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect x="0" y="7" width="26" height="26" rx="7" fill={markBg} />
      <rect x="6" y="22" width="3.4" height="7" rx="1.7" fill={bars} />
      <rect x="11" y="16" width="3.4" height="13" rx="1.7" fill={bars} />
      <rect x="16" y="12" width="3.4" height="17" rx="1.7" fill="#E1341E" />
      <rect x="21" y="18" width="3.4" height="11" rx="1.7" fill={bars} />
      <text
        x="34"
        y="27"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="19"
        fontWeight="700"
        letterSpacing="-0.3"
        fill={word}
      >
        Prog<tspan fill="#E1341E">Dealer</tspan>
      </text>
    </svg>
  );
}
