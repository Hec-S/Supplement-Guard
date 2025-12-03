/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GCP_PROJECT_ID: string;
  readonly VITE_GCP_API_KEY: string;
  readonly VITE_DOCAI_LOCATION: string;
  readonly VITE_DOCAI_PROCESSOR_ID: string;
  readonly VITE_ENABLE_DOCUMENT_AI: string;
  readonly VITE_ENABLE_ENHANCED_OCR: string;
  readonly VITE_ENABLE_PDF_PREPROCESSING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}