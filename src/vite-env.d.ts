/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path of the CommerceFlow API. Defaults to the same-origin `/api/v1`. */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
