import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: ReactNode;
  panel: ReactNode;
  disabled?: boolean;
};

type Props = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Optional trailing control in the tab row (e.g. Add image). */
  trailing?: ReactNode;
  className?: string;
};

export function Tabs({ tabs, activeId, onChange, trailing, className = "" }: Props) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div className={`editor-tabs ${className}`.trim()}>
      <div className="editor-tablist" role="tablist">
        <div className="editor-tablist-scroll">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === active?.id}
              className={tab.id === active?.id ? "editor-tab is-active" : "editor-tab"}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {trailing ? <div className="editor-tablist-trailing">{trailing}</div> : null}
      </div>
      <div className="editor-tabpanel" role="tabpanel">
        {active?.panel}
      </div>
    </div>
  );
}
