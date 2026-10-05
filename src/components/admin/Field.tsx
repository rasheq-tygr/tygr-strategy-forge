import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="editor-field">
      <span className="editor-field-label">{label}</span>
      {children}
      {hint ? <span className="editor-field-hint">{hint}</span> : null}
    </label>
  );
}

type TextFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export function TextField({ label, hint, value, onChange, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <input value={value} onChange={(event) => onChange(event.target.value)} {...rest} />
    </Field>
  );
}

type AreaFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">;

export function AreaField({ label, hint, value, onChange, ...rest }: AreaFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} {...rest} />
    </Field>
  );
}

type SelectFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export function SelectField({ label, hint, value, onChange, options }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
