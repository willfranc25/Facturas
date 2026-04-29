import type { Invoice, DashboardMetrics, MonthlySummary, CategorySummary } from '../types/invoice';

/**
 * Calcula el total sumando todos los componentes de monto.
 * Nunca lanza excepción.
 */
export function calculateTotal(
  netAmount: number,
  ivaAmount: number,
  exemptAmount: number,
  otherTaxes: number
): number {
  return netAmount + ivaAmount + exemptAmount + otherTaxes;
}

/**
 * Valida que el total del invoice sea consistente con la suma de sus componentes.
 * Retorna true si |totalAmount - (net + iva + exempt + other)| <= 1
 * Retorna true si alguno de los campos es undefined (no hay suficiente info para validar)
 */
export function validateAmountConsistency(invoice: Partial<Invoice>): boolean {
  const { totalAmount, netAmount, ivaAmount, exemptAmount, otherTaxes } = invoice;

  if (
    totalAmount === undefined ||
    netAmount === undefined ||
    ivaAmount === undefined ||
    exemptAmount === undefined ||
    otherTaxes === undefined
  ) {
    return true;
  }

  const computed = calculateTotal(netAmount, ivaAmount, exemptAmount, otherTaxes);
  return Math.abs(totalAmount - computed) <= 1;
}

/**
 * Detecta si un invoice es duplicado comparando con una lista existente.
 * Duplicado = mismo providerName (case-insensitive trim) + documentNumber + totalAmount
 * Ignora comparaciones si alguno de los campos del newInvoice es undefined/empty.
 */
export function detectDuplicate(
  existingInvoices: Invoice[],
  newInvoice: Partial<Invoice>
): Invoice | null {
  const { providerName, documentNumber, totalAmount } = newInvoice;

  if (!providerName || !documentNumber || totalAmount === undefined) {
    return null;
  }

  const normalizedNew = providerName.trim().toLowerCase();

  const match = existingInvoices.find(
    (inv) =>
      inv.providerName.trim().toLowerCase() === normalizedNew &&
      inv.documentNumber === documentNumber &&
      inv.totalAmount === totalAmount
  );

  return match ?? null;
}

/**
 * Valida que los campos requeridos estén presentes y no vacíos.
 * Campos requeridos: date, category, totalAmount
 */
export function validateRequiredFields(invoice: Partial<Invoice>): boolean {
  const { date, category, totalAmount } = invoice;

  if (!date || date.trim() === '') return false;
  if (!category || (category as string).trim() === '') return false;
  if (totalAmount === undefined || totalAmount === null) return false;

  return true;
}

/**
 * Asigna el status correcto al guardar.
 * Si wasModified=false → 'pending', si wasModified=true → 'reviewed'
 */
export function assignStatus(wasModified: boolean): 'pending' | 'reviewed' {
  return wasModified ? 'reviewed' : 'pending';
}

/**
 * Calcula métricas del dashboard a partir de una lista de invoices.
 */
export function calculateDashboardMetrics(invoices: Invoice[]): DashboardMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  // Métricas del mes actual
  const currentMonthInvoices = invoices.filter((inv) => {
    const [year, month] = inv.date.split('-').map(Number);
    return year === currentYear && month === currentMonth;
  });

  const currentMonthMetrics = {
    totalAmount: currentMonthInvoices.reduce((s, i) => s + i.totalAmount, 0),
    ivaAmount: currentMonthInvoices.reduce((s, i) => s + i.ivaAmount, 0),
    netAmount: currentMonthInvoices.reduce((s, i) => s + i.netAmount, 0),
    count: currentMonthInvoices.length,
  };

  // Últimos 12 meses
  const last12Months: MonthlySummary[] = [];
  for (let offset = 11; offset >= 0; offset--) {
    const d = new Date(currentYear, now.getMonth() - offset, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const monthInvoices = invoices.filter((inv) => {
      const [iy, im] = inv.date.split('-').map(Number);
      return iy === y && im === m;
    });
    last12Months.push({
      year: y,
      month: m,
      count: monthInvoices.length,
      netAmount: monthInvoices.reduce((s, i) => s + i.netAmount, 0),
      ivaAmount: monthInvoices.reduce((s, i) => s + i.ivaAmount, 0),
      exemptAmount: monthInvoices.reduce((s, i) => s + i.exemptAmount, 0),
      otherTaxes: monthInvoices.reduce((s, i) => s + i.otherTaxes, 0),
      totalAmount: monthInvoices.reduce((s, i) => s + i.totalAmount, 0),
    });
  }

  // Por categoría
  const categoryMap = new Map<string, CategorySummary>();
  for (const inv of invoices) {
    const existing = categoryMap.get(inv.category);
    if (existing) {
      existing.count += 1;
      existing.netAmount += inv.netAmount;
      existing.ivaAmount += inv.ivaAmount;
      existing.totalAmount += inv.totalAmount;
    } else {
      categoryMap.set(inv.category, {
        category: inv.category,
        count: 1,
        netAmount: inv.netAmount,
        ivaAmount: inv.ivaAmount,
        totalAmount: inv.totalAmount,
      });
    }
  }
  const byCategory: CategorySummary[] = Array.from(categoryMap.values());

  // Últimos 5 comprobantes por createdAt descendente
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return {
    currentMonth: currentMonthMetrics,
    last12Months,
    byCategory,
    recentInvoices,
  };
}
