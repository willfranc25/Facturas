import * as XLSX from 'xlsx';
import type { Invoice, MonthlySummary, CategorySummary } from '../types/invoice';

export interface ExportOptions {
  includeMonthlySheet?: boolean;
  includeCategorySheet?: boolean;
  dateRange?: { from: Date; to: Date };
}

// ─── Summary generators ───────────────────────────────────────────────────────

export function generateMonthlySummary(invoices: Invoice[]): MonthlySummary[] {
  const map = new Map<string, MonthlySummary>();

  for (const inv of invoices) {
    const [yearStr, monthStr] = inv.date.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const key = `${year}-${String(month).padStart(2, '0')}`;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.netAmount += inv.netAmount;
      existing.ivaAmount += inv.ivaAmount;
      existing.exemptAmount += inv.exemptAmount;
      existing.otherTaxes += inv.otherTaxes;
      existing.totalAmount += inv.totalAmount;
    } else {
      map.set(key, {
        year,
        month,
        count: 1,
        netAmount: inv.netAmount,
        ivaAmount: inv.ivaAmount,
        exemptAmount: inv.exemptAmount,
        otherTaxes: inv.otherTaxes,
        totalAmount: inv.totalAmount,
      });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function generateCategorySummary(invoices: Invoice[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();

  for (const inv of invoices) {
    const existing = map.get(inv.category);
    if (existing) {
      existing.count += 1;
      existing.netAmount += inv.netAmount;
      existing.ivaAmount += inv.ivaAmount;
      existing.totalAmount += inv.totalAmount;
    } else {
      map.set(inv.category, {
        category: inv.category,
        count: 1,
        netAmount: inv.netAmount,
        ivaAmount: inv.ivaAmount,
        totalAmount: inv.totalAmount,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'Fecha',
  'Proveedor',
  'RUT',
  'Tipo',
  'Número',
  'Categoría',
  'Neto',
  'IVA',
  'Exento',
  'Otros Impuestos',
  'Total',
  'Método de Pago',
  'Estado',
  'Notas',
];

function escapeCSVField(value: string | number | undefined | null): string {
  const str = value == null ? '' : String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function invoiceToCSVRow(inv: Invoice): string {
  const fields = [
    inv.date,
    inv.providerName,
    inv.providerRut,
    inv.documentType,
    inv.documentNumber,
    inv.category,
    inv.netAmount,
    inv.ivaAmount,
    inv.exemptAmount,
    inv.otherTaxes,
    inv.totalAmount,
    inv.paymentMethod,
    inv.status,
    inv.notes ?? '',
  ];
  return fields.map(escapeCSVField).join(';');
}

export function exportToCSV(invoices: Invoice[]): string {
  const rows = [CSV_HEADERS.join(';'), ...invoices.map(invoiceToCSVRow)];
  return rows.join('\n');
}

// ─── Excel ────────────────────────────────────────────────────────────────────

function invoicesToSheetData(invoices: Invoice[]): (string | number)[][] {
  const rows: (string | number)[][] = [CSV_HEADERS];
  for (const inv of invoices) {
    rows.push([
      inv.date,
      inv.providerName,
      inv.providerRut,
      inv.documentType,
      inv.documentNumber,
      inv.category,
      inv.netAmount,
      inv.ivaAmount,
      inv.exemptAmount,
      inv.otherTaxes,
      inv.totalAmount,
      inv.paymentMethod,
      inv.status,
      inv.notes ?? '',
    ]);
  }
  return rows;
}

function monthlySummaryToSheetData(summaries: MonthlySummary[]): (string | number)[][] {
  const headers = ['Año', 'Mes', 'Comprobantes', 'Neto', 'IVA', 'Exento', 'Otros Impuestos', 'Total'];
  const rows: (string | number)[][] = [headers];
  for (const s of summaries) {
    rows.push([s.year, s.month, s.count, s.netAmount, s.ivaAmount, s.exemptAmount, s.otherTaxes, s.totalAmount]);
  }
  return rows;
}

function categorySummaryToSheetData(summaries: CategorySummary[]): (string | number)[][] {
  const headers = ['Categoría', 'Comprobantes', 'Neto', 'IVA', 'Total'];
  const rows: (string | number)[][] = [headers];
  for (const s of summaries) {
    rows.push([s.category, s.count, s.netAmount, s.ivaAmount, s.totalAmount]);
  }
  return rows;
}

export function exportToExcel(invoices: Invoice[], options?: ExportOptions): Uint8Array {
  let filtered = invoices;

  if (options?.dateRange) {
    const { from, to } = options.dateRange;
    filtered = invoices.filter((inv) => {
      const d = new Date(inv.date);
      return d >= from && d <= to;
    });
  }

  const wb = XLSX.utils.book_new();

  const mainSheet = XLSX.utils.aoa_to_sheet(invoicesToSheetData(filtered));
  XLSX.utils.book_append_sheet(wb, mainSheet, 'Comprobantes');

  if (options?.includeMonthlySheet) {
    const summaries = generateMonthlySummary(filtered);
    const sheet = XLSX.utils.aoa_to_sheet(monthlySummaryToSheetData(summaries));
    XLSX.utils.book_append_sheet(wb, sheet, 'Resumen Mensual');
  }

  if (options?.includeCategorySheet) {
    const summaries = generateCategorySummary(filtered);
    const sheet = XLSX.utils.aoa_to_sheet(categorySummaryToSheetData(summaries));
    XLSX.utils.book_append_sheet(wb, sheet, 'Resumen Categorías');
  }

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[];
  return new Uint8Array(buffer);
}

// ─── Download helper ──────────────────────────────────────────────────────────

export function downloadFile(content: Uint8Array | string, filename: string, mimeType: string): void {
  const blob = new Blob([content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
