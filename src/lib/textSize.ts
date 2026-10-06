export type TextSize = "s" | "m" | "l";

export const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
];

export function normalizeTextSize(value: unknown): TextSize {
  return value === "s" || value === "l" ? value : "m";
}

export function typeSizeClass(size: unknown, base = ""): string {
  return [base, `type-size-${normalizeTextSize(size)}`].filter(Boolean).join(" ");
}
