import { useEffect, useState, type FormEvent } from "react";
import { useSite } from "../../context/SiteContext";
import { Editable } from "../../components/Editable";
import { GoogleSignIn } from "../../components/GoogleSignIn";
import { googleClientId, resolveGoogleClientId } from "../../lib/google";

export function AdminLogin({ onUnlocked }: { onUnlocked: () => void }) {
  const { unlock, content, error: siteError } = useSite();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(() => googleClientId());
  const [googleChecked, setGoogleChecked] = useState(() => Boolean(googleClientId()));
  const hasGoogle = Boolean(clientId);
  const shownError = error || siteError;

  useEffect(() => {
    let cancelled = false;
    void resolveGoogleClientId().then((id) => {
      if (cancelled) return;
      setClientId(id);
      setGoogleChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await unlock(password);
    if (ok) onUnlocked();
    else setError("Invalid password");
  };

  return (
    <div className="login-box">
      <p className="eyebrow">Editor</p>
      <h1 className="display-lg" style={{ fontSize: "2rem" }}>
        <Editable path="admin.loginTitle" />
      </h1>
      <p>
        <Editable path="admin.loginBody" multiline />
      </p>

      {!googleChecked && !hasGoogle ? <p className="google-signin-pending">Checking Google sign-in…</p> : null}

      {hasGoogle ? (
        <>
          <GoogleSignIn clientId={clientId} onError={setError} />
          {shownError ? <p style={{ color: "#b45309" }}>{shownError}</p> : null}
        </>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)}>
        <label>
          <span className="sr-only">{content.admin.passwordLabel}</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder={content.admin.passwordLabel}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {!hasGoogle && shownError ? <p style={{ color: "#b45309" }}>{shownError}</p> : null}
        <button className="btn btn-primary" type="submit">
          {content.admin.submit}
        </button>
      </form>
    </div>
  );
}
