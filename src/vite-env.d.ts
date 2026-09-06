/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDIT_PASSWORD?: string;
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  readonly VITE_BOOKING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
