import { EMBLEM_MARK_PATH, EMBLEM_MARK_RATIO, EMBLEM_MARK_VIEWBOX } from "../lib/emblem";

type Props = { size?: number; className?: string; title?: string };

/** TYGR Ventures geometric tiger-head emblem. Defaults to the brand orange. */
export function TigerMark({ size = 30, className, title }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={Math.round(size * EMBLEM_MARK_RATIO)}
      viewBox={EMBLEM_MARK_VIEWBOX}
      fill="none"
      overflow="visible"
      style={{ color: "var(--tygr-orange)" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={EMBLEM_MARK_PATH} />
    </svg>
  );
}
