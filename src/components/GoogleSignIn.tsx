import { useEffect, useRef, useState } from "react";
import {
  decodeIdToken,
  googleClientId,
  isAllowedEditor,
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from "../lib/google";

type Props = {
  onCredential: (token: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

/**
 * Renders the official "Sign in with Google" button (Google Identity Services).
 * Restricts the returned account to the editor allowlist before handing the
 * ID token to the caller. Returns null when no client ID is configured.
 */
export function GoogleSignIn({ onCredential, onError }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const clientId = googleClientId();
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!clientId || !holder.current) return;
    let cancelled = false;
    const target = holder.current;

    const handle = (response: GoogleCredentialResponse) => {
      const token = response.credential;
      if (!token) {
        onError?.("Google sign-in was cancelled.");
        return;
      }
      const identity = decodeIdToken(token);
      if (!identity || !identity.emailVerified) {
        onError?.("Could not verify that Google account.");
        return;
      }
      if (!isAllowedEditor(identity.email)) {
        onError?.(`${identity.email} is not an approved editor.`);
        return;
      }
      void onCredential(token);
    };

    loadGoogleIdentity()
      .then((id) => {
        if (cancelled) return;
        id.initialize({
          client_id: clientId,
          callback: handle,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        target.innerHTML = "";
        id.renderButton(target, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signin_with",
          logo_alignment: "left",
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Google sign-in is unavailable right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential, onError]);

  if (!clientId) return null;

  return (
    <div className="google-signin">
      <div ref={holder} className="google-signin-button" aria-label="Sign in with Google" />
      {loadError ? <p className="google-signin-error">{loadError}</p> : null}
    </div>
  );
}
