import { EMBLEM_BLOCKS, EMBLEM_RATIO, EMBLEM_VIEWBOX } from "../lib/emblem";

type Props = { size?: number; className?: string; title?: string };

/** TYGR Ventures geometric tiger-head emblem. Defaults to the brand orange. */
export function TigerMark({ size = 30, className, title }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={Math.round(size * EMBLEM_RATIO)}
      viewBox={EMBLEM_VIEWBOX}
      fill="none"
      style={{ color: "var(--tygr-orange-glow)" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {EMBLEM_BLOCKS.map((d) => (
        <path key={d.slice(0, 24)} fill="currentColor" d={d} />
      ))}
    </svg>
  );
}
