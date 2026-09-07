/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDIT_PASSWORD?: string;
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_BOOKING_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ALLOWED_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
