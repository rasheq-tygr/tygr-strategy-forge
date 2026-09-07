import { useState, type FormEvent } from "react";
import { useSite } from "../../context/SiteContext";
import { Editable } from "../../components/Editable";

export function AdminLogin({ onUnlocked }: { onUnlocked: () => void }) {
  const { unlock, content } = useSite();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await unlock(password);
    if (ok) onUnlocked();
    else setError("Invalid password");
  };

  return (
    <form className="login-box" onSubmit={(e) => void onSubmit(e)}>
      <p className="eyebrow">Editor</p>
      <h1 className="display-lg" style={{ fontSize: "2rem" }}>
        <Editable path="admin.loginTitle" />
      </h1>
      <p>
        <Editable path="admin.loginBody" multiline />
      </p>
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
      {error ? <p style={{ color: "#b45309" }}>{error}</p> : null}
      <button className="btn btn-primary" type="submit">
        {content.admin.submit}
      </button>
    </form>
  );
}
