type Props = { size?: number; className?: string };

/** Placeholder mark — swap when the SoftRiver lockup arrives. */
export function TigerMark({ size = 28, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path d="M10 46h12l4-8 6 14 6-14 4 8h12" stroke="#f5f3ef" strokeWidth="2" />
      <path d="M18 40 32 12l14 28" stroke="#f97316" strokeWidth="3.2" />
      <path d="M24 40 32 24l8 16" stroke="#f5f3ef" strokeWidth="2" />
      <rect x="28" y="28" width="8" height="8" fill="#f97316" transform="rotate(45 32 32)" />
    </svg>
  );
}
