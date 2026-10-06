import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function Accordion({ title, subtitle, open, onToggle, actions, children }: Props) {
  return (
    <article className={`editor-accordion${open ? " is-open" : ""}`}>
      <div className="editor-accordion-head">
        <button type="button" className="editor-accordion-toggle" aria-expanded={open} onClick={onToggle}>
          <span className="editor-accordion-chevron" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          <span className="editor-accordion-titles">
            <strong>{title}</strong>
            {subtitle ? <span className="editor-accordion-subtitle">{subtitle}</span> : null}
          </span>
        </button>
        {actions ? <div className="editor-inline-actions">{actions}</div> : null}
      </div>
      {open ? <div className="editor-accordion-body">{children}</div> : null}
    </article>
  );
}
