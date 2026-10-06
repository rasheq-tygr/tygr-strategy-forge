import { useSite } from "../context/SiteContext";
import { TEXT_SIZES, normalizeTextSize, type TextSize } from "../lib/textSize";

type Props = {
  path: string;
  label?: string;
};

/** Inline S/M/L control, visible only while the editor is unlocked. */
export function TypeSizeControl({ path, label = "Text size" }: Props) {
  const { editMode, get, set } = useSite();
  if (!editMode) return null;

  const current = normalizeTextSize(get(path));

  return (
    <div className="type-size-control" role="group" aria-label={label}>
      <span className="type-size-control-label">{label}</span>
      {TEXT_SIZES.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? "is-on" : undefined}
          aria-pressed={current === option.value}
          onClick={() => set(path, option.value as TextSize)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
