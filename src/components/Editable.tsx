import { useEffect, useRef, type ElementType, type KeyboardEvent, type MouseEvent } from "react";
import { useSite } from "../context/SiteContext";
import { readEditableText, writeEditableText } from "../lib/editableText";

type Props = {
  path: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
};

export function Editable({ path, as: Tag = "span", className, multiline = false }: Props) {
  const { get, set, editMode } = useSite();
  const value = get(path);
  const ref = useRef<HTMLElement>(null);
  const classes = [multiline ? "editable-multiline" : "", className].filter(Boolean).join(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    writeEditableText(el, value, multiline);
  }, [value, multiline]);

  if (!editMode) {
    return <Tag className={classes || undefined}>{value}</Tag>;
  }

  const onBlur = () => {
    const next = ref.current ? readEditableText(ref.current, multiline) : "";
    if (next !== value) set(path, next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  };

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Tag
      ref={ref}
      className={`is-editable ${classes}`.trim()}
      contentEditable
      suppressContentEditableWarning
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={onClick}
      data-edit-path={path}
    >
      {value}
    </Tag>
  );
}
