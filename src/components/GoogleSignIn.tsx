import { useEffect, useRef } from "react";
import {
  beginGoogleNonce,
  consumeGoogleRedirect,
  currentGoogleNonce,
  decodeIdToken,
  googleOauthErrorMessage,
  loadGoogleIdentity,
  redirectNonceMatches,
} from "../lib/google";

type Props = {
  clientId: string;
  onCredential: (token: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

/**
 * Official Google button. Identity Services checks the JavaScript origin, so
 * sign-in does not depend on an OAuth redirect URI.
 */
export function GoogleSignIn({ clientId, onCredential, onError }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    const { error } = consumeGoogleRedirect();
    if (error) onErrorRef.current?.(googleOauthErrorMessage(error));
  }, []);

  useEffect(() => {
    const target = holder.current;
    if (!clientId || !target) return;
    let cancelled = false;
    const nonce = beginGoogleNonce();

    loadGoogleIdentity()
      .then((id) => {
        if (cancelled) return;
        id.initialize({
          client_id: clientId,
          nonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: "popup",
          callback: (response) => {
            const token = response.credential || "";
            if (!token) {
              onErrorRef.current?.("Google sign-in was cancelled.");
              return;
            }
            const identity = decodeIdToken(token);
            if (!redirectNonceMatches(identity?.nonce, currentGoogleNonce())) {
              onErrorRef.current?.(googleOauthErrorMessage("nonce_mismatch"));
              return;
            }
            void onCredentialRef.current(token);
          },
        });
        target.replaceChildren();
        const width = Math.round(Math.min(400, Math.max(240, target.clientWidth || 320)));
        id.renderButton(target, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width,
          logo_alignment: "left",
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.("Google sign-in is unavailable right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className="google-signin">
      <div ref={holder} className="google-signin-button" />
    </div>
  );
}
