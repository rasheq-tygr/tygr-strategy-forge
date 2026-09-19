import { useEffect } from "react";
import { consumeGoogleRedirect, googleOauthErrorMessage, startGoogleRedirect } from "../lib/google";

type Props = {
  clientId: string;
  onError?: (message: string) => void;
};

function GoogleMark() {
  return (
    <svg className="btn-google-mark" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.8 2.716v2.258h2.908C16.958 14.2 17.64 11.9 17.64 9.2z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.186l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.963L3.964 7.295C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * Visible "Continue with Google" control. Uses an OAuth redirect for an ID token
 * so the button still appears on http:// (GIS iframes often stay blank there).
 */
export function GoogleSignIn({ clientId, onError }: Props) {
  useEffect(() => {
    const { error } = consumeGoogleRedirect();
    if (error) onError?.(googleOauthErrorMessage(error));
  }, [onError]);

  if (!clientId) return null;

  return (
    <div className="google-signin">
      <button type="button" className="btn-google" onClick={() => startGoogleRedirect(clientId)}>
        <GoogleMark />
        Continue with Google
      </button>
    </div>
  );
}
