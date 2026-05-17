/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DCM4CHEE_BASE: string
  readonly VITE_DCM4CHEE_HOST: string
  readonly VITE_DCM4CHEE_PORT: string
  readonly VITE_DCM4CHEE_AET:  string
  readonly VITE_SERVER_URL:    string
  readonly VITE_API_SECRET:    string
  readonly VITE_APP_NAME:      string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
