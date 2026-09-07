import { useState, type FormEvent } from "react";
import { useSite } from "../../context/SiteContext";
import { Editable } from "../../components/Editable";
import { GoogleSignIn } from "../../components/GoogleSignIn";
import { googleClientId } from "../../lib/google";

export function AdminLogin({ onUnlocked }: { onUnlocked?: () => void } = {}) {
  const { unlock, unlockWithGoogle, content } = useSite();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const hasGoogle = Boolean(googleClientId());
  const [showPassword, setShowPassword] = useState(!hasGoogle);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await unlock(password);
    if (ok) onUnlocked?.();
    else setError("Invalid password");
  };

  const onGoogleCredential = async (token: string) => {
    setError("");
    const ok = await unlockWithGoogle(token);
    if (ok) onUnlocked?.();
    else setError("That Google account is not an approved editor.");
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

      {hasGoogle ? (
        <>
          <GoogleSignIn onCredential={onGoogleCredential} onError={setError} />
          {error ? <p style={{ color: "#b45309" }}>{error}</p> : null}
          <button
            type="button"
            className="login-alt"
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide password option" : "Use edit password instead"}
          </button>
        </>
      ) : null}

      {showPassword ? (
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
          {!hasGoogle && error ? <p style={{ color: "#b45309" }}>{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {content.admin.submit}
          </button>
        </form>
      ) : null}
    </div>
  );
}
