import { EMBLEM_PATH, EMBLEM_RATIO, EMBLEM_VIEWBOX } from "../lib/emblem";

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
      style={{ color: "var(--tygr-orange)" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path fill="currentColor" fillRule="evenodd" d={EMBLEM_PATH} />
    </svg>
  );
}
