import { Link } from "react-router-dom";
import { useSite } from "../context/SiteContext";

export function EditChrome() {
  const { editMode, dirty, status, error, save, lock, content } = useSite();
  if (!editMode) return null;

  const label =
    status === "saving"
      ? content.admin.saving
      : status === "saved"
        ? content.admin.saved
        : dirty
          ? content.admin.unsaved
          : content.admin.save;

  return (
    <div className="edit-chrome">
      <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{error || label}</span>
      <button type="button" onClick={() => void save()} disabled={status === "saving"}>
        {content.admin.save}
      </button>
      <Link to="/admin">Editors</Link>
      <button type="button" onClick={lock}>
        Lock
      </button>
    </div>
  );
}
