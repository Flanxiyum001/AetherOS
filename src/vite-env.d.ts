/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base path under which the site is served, e.g. '/Aether/' on GitHub Pages. */
  readonly VITE_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
