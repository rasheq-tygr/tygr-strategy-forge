import { useState } from "react";
import { uploadImage } from "../lib/api";
import { searchUnsplash, type UnsplashPhoto } from "../lib/unsplash";

type Props = {
  value: string;
  onChange: (url: string, credit?: string) => void;
};

export function MediaPicker({ value, onChange }: Props) {
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
    <div>
      {value ? <img src={value} alt="" style={{ maxHeight: 120, marginBottom: 8 }} /> : null}
      <input
        placeholder="Image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void onUpload(e.target.files?.[0])}
        />
        <input
          placeholder="Search Unsplash"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" onClick={() => void onSearch()} disabled={busy === "search"}>
          {busy === "search" ? "Searching…" : "Pull from Unsplash"}
        </button>
      </div>
      {error ? <p style={{ color: "#b45309" }}>{error}</p> : null}
      {photos.length ? (
        <div className="media-grid" style={{ marginTop: 10 }}>
          {photos.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => onChange(p.regular, `${p.credit} / Unsplash`)}
            >
              <img src={p.thumb} alt={p.alt} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
