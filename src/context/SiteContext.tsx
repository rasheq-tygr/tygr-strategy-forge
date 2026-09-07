import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import fallback from "../../public/content.json";
import {
  clearCredentials,
  getStoredGoogleToken,
  getStoredPassword,
  saveContent,
  storeGoogleToken,
  storePassword,
  verifyGoogleToken,
  verifyPassword,
} from "../lib/api";
import { decodeIdToken } from "../lib/google";
import { getByPath, setByPath } from "../lib/paths";
import { isSiteContent, type SiteContent } from "../types/content";

type Status = "idle" | "saving" | "saved" | "error";

type SiteContextValue = {
  content: SiteContent;
  editMode: boolean;
  unlocked: boolean;
  dirty: boolean;
  status: Status;
  error: string;
  get: (path: string) => string;
  set: (path: string, value: unknown) => void;
  replace: (next: SiteContent) => void;
  editorEmail: string;
  unlock: (password: string) => Promise<boolean>;
  unlockWithGoogle: (token: string) => Promise<boolean>;
  lock: () => void;
  save: () => Promise<void>;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(fallback as SiteContent);
  const [unlocked, setUnlocked] = useState(false);
  const [editorEmail, setEditorEmail] = useState("");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/content.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && isSiteContent(data)) setContent(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const googleToken = getStoredGoogleToken();
    if (googleToken) {
      verifyGoogleToken(googleToken).then((ok) => {
        if (ok) {
          setUnlocked(true);
          setEditorEmail(decodeIdToken(googleToken)?.email ?? "");
        } else {
          clearCredentials();
        }
      });
      return;
    }
    const stored = getStoredPassword();
    if (!stored) return;
    verifyPassword(stored).then((ok) => {
      if (ok) setUnlocked(true);
      else clearCredentials();
    });
  }, []);

  useEffect(() => {
    document.title = content.meta.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", content.meta.description);
  }, [content.meta.title, content.meta.description]);

  const get = useCallback(
    (path: string) => {
      const value = getByPath(content, path);
      return typeof value === "string" ? value : "";
    },
    [content],
  );

  const set = useCallback((path: string, value: unknown) => {
    setContent((prev) => setByPath(prev, path, value));
    setDirty(true);
    setStatus("idle");
  }, []);

  const replace = useCallback((next: SiteContent) => {
    setContent(next);
    setDirty(true);
    setStatus("idle");
  }, []);

  const unlock = useCallback(async (password: string) => {
    const ok = await verifyPassword(password);
    if (ok) {
      storePassword(password);
      setUnlocked(true);
      setEditorEmail("");
      setError("");
    }
    return ok;
  }, []);

  const unlockWithGoogle = useCallback(async (token: string) => {
    const ok = await verifyGoogleToken(token);
    if (ok) {
      storeGoogleToken(token);
      setUnlocked(true);
      setEditorEmail(decodeIdToken(token)?.email ?? "");
      setError("");
    }
    return ok;
  }, []);

  const lock = useCallback(() => {
    clearCredentials();
    setUnlocked(false);
    setEditorEmail("");
  }, []);

  const save = useCallback(async () => {
    setStatus("saving");
    setError("");
    try {
      await saveContent(content);
      setDirty(false);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
      throw err;
    }
  }, [content]);

  const value = useMemo<SiteContextValue>(
    () => ({
      content,
      editMode: unlocked,
      unlocked,
      dirty,
      status,
      error,
      get,
      set,
      replace,
      editorEmail,
      unlock,
      unlockWithGoogle,
      lock,
      save,
    }),
    [content, unlocked, editorEmail, dirty, status, error, get, set, replace, unlock, unlockWithGoogle, lock, save],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

