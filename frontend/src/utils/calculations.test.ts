import { describe, it, expect } from 'vitest';
import {
  calculateTotal,
  validateAmountConsistency,
  detectDuplicate,
  calculateDashboardMetrics,
} from './calculations';
import type { Invoice } from '../types/invoice';

const baseInvoice: Invoice = {
  id: '1',
  providerName: 'Proveedor SA',
  providerRut: '12.345.678-5',
  documentType: 'factura',
  documentNumber: 'F-001',
  date: '2025-01-15',
  category: 'Supermercado',
  items: [],
  netAmount: 1000,
  ivaAmount: 190,
  exemptAmount: 0,
  otherTaxes: 0,
  totalAmount: 1190,
  paymentMethod: 'efectivo',
  status: 'pending',
  createdAt: '2025-01-15T10:00:00.000Z',
  updatedAt: '2025-01-15T10:00:00.000Z',
};

describe('calculateTotal', () => {
  it('suma los 4 componentes correctamente', () => {
    expect(calculateTotal(1000, 190, 0, 0)).toBe(1190);
    expect(calculateTotal(0, 0, 0, 0)).toBe(0);
    expect(calculateTotal(100, 200, 300, 400)).toBe(1000);
  });

  it('nunca lanza excepción', () => {
    expect(() => calculateTotal(0, 0, 0, 0)).not.toThrow();
    expect(() => calculateTotal(-100, 50, 0, 0)).not.toThrow();
  });
});

describe('validateAmountConsistency', () => {
  it('retorna true cuando los montos son consistentes', () => {
    expect(validateAmountConsistency({
      totalAmount: 1190,
      netAmount: 1000,
      ivaAmount: 190,
      exemptAmount: 0,
      otherTaxes: 0,
    })).toBe(true);
  });

  it('retorna true cuando la diferencia es <= 1 (redondeo)', () => {
    expect(validateAmountConsistency({
      totalAmount: 1191,
      netAmount: 1000,
      ivaAmount: 190,
      exemptAmount: 0,
      otherTaxes: 0,
    })).toBe(true);
  });

  it('retorna false cuando la diferencia supera $1', () => {
    expect(validateAmountConsistency({
      totalAmount: 1500,
      netAmount: 1000,
      ivaAmount: 190,
      exemptAmount: 0,
      otherTaxes: 0,
    })).toBe(false);
  });

  it('retorna true si algún campo es undefined', () => {
    expect(validateAmountConsistency({ totalAmount: 1000 })).toBe(true);
    expect(validateAmountConsistency({})).toBe(true);
    expect(validateAmountConsistency({ netAmount: 1000, ivaAmount: 190 })).toBe(true);
  });
});

describe('detectDuplicate', () => {
  it('detecta duplicado exacto', () => {
    const result = detectDuplicate([baseInvoice], {
      providerName: 'Proveedor SA',
      documentNumber: 'F-001',
      totalAmount: 1190,
    });
    expect(result).toBe(baseInvoice);
  });

  it('detecta duplicado con diferente capitalización y espacios', () => {
    const result = detectDuplicate([baseInvoice], {
      providerName: '  proveedor sa  ',
      documentNumber: 'F-001',
      totalAmount: 1190,
    });
    expect(result).toBe(baseInvoice);
  });

  it('retorna null si no hay duplicado', () => {
    expect(detectDuplicate([baseInvoice], {
      providerName: 'Otro Proveedor',
      documentNumber: 'F-001',
      totalAmount: 1190,
    })).toBeNull();
  });

  it('retorna null si algún campo del newInvoice es undefined', () => {
    expect(detectDuplicate([baseInvoice], { providerName: 'Proveedor SA' })).toBeNull();
    expect(detectDuplicate([baseInvoice], {})).toBeNull();
  });

  it('retorna null si la lista está vacía', () => {
    expect(detectDuplicate([], {
      providerName: 'Proveedor SA',
      documentNumber: 'F-001',
      totalAmount: 1190,
    })).toBeNull();
  });
});

describe('calculateDashboardMetrics', () => {
  it('retorna estructura correcta con lista vacía', () => {
    const metrics = calculateDashboardMetrics([]);
    expect(metrics.currentMonth.count).toBe(0);
    expect(metrics.currentMonth.totalAmount).toBe(0);
    expect(metrics.last12Months).toHaveLength(12);
    expect(metrics.byCategory).toHaveLength(0);
    expect(metrics.recentInvoices).toHaveLength(0);
  });

  it('retorna máximo 5 comprobantes recientes', () => {
    const invoices: Invoice[] = Array.from({ length: 8 }, (_, i) => ({
      ...baseInvoice,
      id: String(i),
      createdAt: `2025-01-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
    }));
    const metrics = calculateDashboardMetrics(invoices);
    expect(metrics.recentInvoices).toHaveLength(5);
  });

  it('ordena recentInvoices por createdAt descendente', () => {
    const invoices: Invoice[] = [
      { ...baseInvoice, id: 'a', createdAt: '2025-01-01T10:00:00.000Z' },
      { ...baseInvoice, id: 'b', createdAt: '2025-01-03T10:00:00.000Z' },
      { ...baseInvoice, id: 'c', createdAt: '2025-01-02T10:00:00.000Z' },
    ];
    const metrics = calculateDashboardMetrics(invoices);
    expect(metrics.recentInvoices[0].id).toBe('b');
    expect(metrics.recentInvoices[1].id).toBe('c');
    expect(metrics.recentInvoices[2].id).toBe('a');
  });

  it('agrupa correctamente por categoría', () => {
    const invoices: Invoice[] = [
      { ...baseInvoice, id: '1', category: 'Combustible', totalAmount: 500 },
      { ...baseInvoice, id: '2', category: 'Combustible', totalAmount: 300 },
      { ...baseInvoice, id: '3', category: 'Supermercado', totalAmount: 200 },
    ];
    const metrics = calculateDashboardMetrics(invoices);
    const combustible = metrics.byCategory.find((c) => c.category === 'Combustible');
    expect(combustible?.count).toBe(2);
    expect(combustible?.totalAmount).toBe(800);
  });
});
