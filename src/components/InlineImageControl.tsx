import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { uploadImage } from "../lib/api";

type Props = {
  path: string;
  creditPath?: string;
  label?: string;
};

/** Compact image setter for public-page edit mode. */
export function InlineImageControl({ path, creditPath, label = "Image" }: Props) {
  const { editMode, get, set } = useSite();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!editMode) return null;

  const value = get(path);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadImage(file);
      set(path, url);
      if (creditPath) set(creditPath, "Uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-image-control">
      <span className="inline-image-control-label">{label}</span>
      {value ? <img src={value} alt="" /> : null}
      <label className="inline-image-control-file">
        <span>{busy ? "Uploading…" : value ? "Replace" : "Add photo"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          disabled={busy}
          onChange={(event) => void onUpload(event.target.files?.[0])}
        />
      </label>
      <input
        className="inline-image-control-url"
        value={value}
        placeholder="https://…"
        aria-label={`${label} URL`}
        onChange={(event) => set(path, event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="inline-image-control-clear"
          onClick={() => {
            set(path, "");
            if (creditPath) set(creditPath, "");
          }}
        >
          Clear
        </button>
      ) : null}
      {error ? <span className="inline-image-control-error">{error}</span> : null}
    </div>
  );
}
