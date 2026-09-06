type Props = { size?: number; className?: string; title?: string };

const RATIO = 31 / 50;

/** TYGR brand tiger-eye mark. Inherits color via `currentColor`. */
export function TigerMark({ size = 28, className, title }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={Math.round(size * RATIO)}
      viewBox="0 0 50 31"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M24.9215 0C38.3673 0 48.9322 14.0431 49.3753 14.6418C49.7389 15.1308 49.7389 15.7896 49.3753 16.2776C48.9322 16.8764 38.3673 30.9194 24.9215 30.9194C11.4747 30.9194 0.715872 16.8764 0.272725 16.2777C-0.0909083 15.7896 -0.0909083 15.1309 0.272725 14.6418C0.715872 14.0431 11.4747 0 24.9215 0ZM14.5458 15.4597C14.5458 20.8837 19.3079 25.2976 24.9215 25.2976C30.5351 25.2976 35.1033 20.8837 35.1033 15.4597C35.1033 10.0356 30.5351 5.62166 24.9215 5.62166C19.3079 5.62166 14.5458 10.0356 14.5458 15.4597ZM20.3633 15.4596C20.3633 13.1351 22.5141 11.2434 24.9208 11.2434C27.3266 11.2434 29.2844 13.1351 29.2844 15.4596C29.2844 17.7851 27.3266 19.6759 24.9208 19.6759C22.5141 19.6759 20.3633 17.7851 20.3633 15.4596Z"
        fill="currentColor"
      />
    </svg>
  );
}
