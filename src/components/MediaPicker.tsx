import { useState } from "react";
import { uploadImage } from "../lib/api";
import { searchUnsplash, type UnsplashPhoto } from "../lib/unsplash";

type Props = {
  value: string;
  onChange: (url: string, credit?: string) => void;
  label?: string;
  compact?: boolean;
};

export function MediaPicker({ value, onChange, label = "Image", compact = false }: Props) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const onSearch = async () => {
    setBusy("search");
    setError("");
    try {
      setPhotos(await searchUnsplash(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy("");
    }
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const url = await uploadImage(file);
      onChange(url, "Uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={`editor-media${compact ? " is-compact" : ""}`}>
      <div className="editor-media-head">
        <div>
          <p className="editor-field-label">{label}</p>
          <p className="editor-field-hint">Upload, paste a URL, or pull from Unsplash.</p>
        </div>
        {value ? <img className="editor-media-preview" src={value} alt="" /> : null}
      </div>
      <div className={compact ? "editor-grid-2" : undefined}>
        <label className="editor-field">
          <span className="editor-field-label">Image URL</span>
          <input value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
        <label className="editor-field">
          <span className="editor-field-label">Upload file</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
        </label>
      </div>
      <div className="editor-media-search">
        <label className="editor-field">
          <span className="editor-field-label">Search Unsplash</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => void onSearch()} disabled={busy === "search"}>
          {busy === "search" ? "Searching…" : busy === "upload" ? "Uploading…" : "Pull from Unsplash"}
        </button>
      </div>
      {error ? <p className="editor-error">{error}</p> : null}
      {photos.length ? (
        <div className="media-grid">
          {photos.map((p) => (
            <button type="button" key={p.id} onClick={() => onChange(p.regular, `${p.credit} / Unsplash`)}>
              <img src={p.thumb} alt={p.alt} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
