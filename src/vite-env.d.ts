/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de la API. Vacia en produccion, donde el front y la API comparten origen. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
