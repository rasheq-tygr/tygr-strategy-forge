import { useEffect, useRef, type ElementType, type KeyboardEvent } from "react";
import { useSite } from "../context/SiteContext";

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

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  const onBlur = () => {
    const next = ref.current?.textContent ?? "";
    if (next !== value) set(path, next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <Tag
      ref={ref}
      className={`is-editable ${className || ""}`.trim()}
      contentEditable
      suppressContentEditableWarning
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      data-edit-path={path}
    >
      {value}
    </Tag>
  );
}
