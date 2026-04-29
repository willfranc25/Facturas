export type DocumentType =
  | 'boleta'
  | 'factura'
  | 'boleta_electronica'
  | 'factura_electronica'
  | 'otro';

export type PaymentMethod =
  | 'efectivo'
  | 'débito'
  | 'crédito'
  | 'transferencia'
  | 'otro';

export type InvoiceStatus = 'pending' | 'reviewed' | 'approved';

export type InvoiceCategory =
  | 'Supermercado'
  | 'Combustible'
  | 'Transporte'
  | 'Servicios básicos'
  | 'Arriendo'
  | 'Comida'
  | 'Insumos de trabajo'
  | 'Equipamiento'
  | 'Marketing'
  | 'Internet/Telefonía'
  | 'Otros';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  providerName: string;
  providerRut: string;
  documentType: DocumentType;
  documentNumber: string;
  date: string; // ISO 8601: YYYY-MM-DD
  time?: string; // HH:MM
  category: InvoiceCategory;
  items: InvoiceItem[];
  netAmount: number;
  ivaAmount: number;
  exemptAmount: number;
  otherTaxes: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  imageUrl?: string;
  rawOcrText?: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  month?: number;
  year?: number;
  category?: InvoiceCategory;
  providerSearch?: string;
  status?: InvoiceStatus;
}

export interface MonthlySummary {
  year: number;
  month: number;
  count: number;
  netAmount: number;
  ivaAmount: number;
  exemptAmount: number;
  otherTaxes: number;
  totalAmount: number;
}

export interface CategorySummary {
  category: InvoiceCategory;
  count: number;
  netAmount: number;
  ivaAmount: number;
  totalAmount: number;
}

export interface DashboardMetrics {
  currentMonth: {
    totalAmount: number;
    ivaAmount: number;
    netAmount: number;
    count: number;
  };
  last12Months: MonthlySummary[];
  byCategory: CategorySummary[];
  recentInvoices: Invoice[];
}

export interface VLMHealthStatus {
  available: boolean;
  mode: 'local' | 'remote';
  endpoint: string;
  model?: string;
  responseTimeMs?: number;
}
