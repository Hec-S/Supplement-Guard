export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  isNew?: boolean;
  isChanged?: boolean;
}

export interface Invoice {
  fileName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface ClaimData {
  id: string;
  originalInvoice: Invoice;
  supplementInvoice: Invoice;
  fraudScore: number;
  fraudReasons: string[];
  invoiceSummary: string;
}

// FIX: Add missing ImagePair interface used by ImageViewer.tsx
export interface ImagePair {
  id: string;
  description: string;
  originalUrl: string;
  supplementUrl: string;
  heatmapUrl: string;
}
