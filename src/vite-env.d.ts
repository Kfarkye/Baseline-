/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVACY_POLICY_URL: string
  readonly VITE_TERMS_OF_SERVICE_URL: string
  readonly VITE_APP_SUPPORT_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
