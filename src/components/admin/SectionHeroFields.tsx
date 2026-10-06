import { MediaPicker } from "../MediaPicker";
import { TextField } from "./Field";

export type SectionHeroValue = {
  image?: string;
  imageAlt?: string;
  imageCredit?: string;
  imagePosition?: string;
};

export function SectionHeroFields({
  value,
  onChange,
}: {
  value: SectionHeroValue;
  onChange: (patch: SectionHeroValue) => void;
}) {
  return (
    <div className="editor-image-panel">
      <MediaPicker
        compact
        label="Hero photo"
        value={value.image ?? ""}
        onChange={(url, credit) =>
          onChange({ image: url, imageCredit: credit || value.imageCredit })
        }
      />
      <div className="editor-grid-2">
        <TextField
          label="Hero alt text"
          value={value.imageAlt ?? ""}
          onChange={(imageAlt) => onChange({ imageAlt })}
        />
        <TextField
          label="Hero credit"
          value={value.imageCredit ?? ""}
          onChange={(imageCredit) => onChange({ imageCredit })}
        />
        <TextField
          label="Object position"
          value={value.imagePosition ?? ""}
          onChange={(imagePosition) => onChange({ imagePosition })}
          hint='Optional, e.g. "center top".'
          placeholder="center top"
        />
      </div>
    </div>
  );
}
