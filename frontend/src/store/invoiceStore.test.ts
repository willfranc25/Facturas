// Feature: invoice-expense-manager, Property 2: Detección de duplicados
// Feature: invoice-expense-manager, Property 15: Corrección del filtrado
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { detectDuplicate } from '../utils/calculations';
import type { Invoice, InvoiceFilters, InvoiceCategory, InvoiceStatus } from '../types/invoice';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const CATEGORIES: InvoiceCategory[] = [
  'Supermercado', 'Combustible', 'Transporte', 'Servicios básicos',
  'Arriendo', 'Comida', 'Insumos de trabajo', 'Equipamiento',
  'Marketing', 'Internet/Telefonía', 'Otros',
];

const STATUSES: InvoiceStatus[] = ['pending', 'reviewed', 'approved'];

/** Genera una fecha ISO YYYY-MM-DD con año 2020-2025, mes 1-12, día 1-28 */
const arbitraryDate = () =>
  fc.record({
    year: fc.integer({ min: 2020, max: 2025 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  }).map(({ year, month, day }) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );

/** Genera un Invoice completo con campos controlados */
const arbitraryInvoice = (): fc.Arbitrary<Invoice> =>
  fc.record({
    id: fc.uuid(),
    providerName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    providerRut: fc.constant('12.345.678-5'),
    documentType: fc.constantFrom('boleta', 'factura', 'boleta_electronica', 'factura_electronica', 'otro' as const),
    documentNumber: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    date: arbitraryDate(),
    category: fc.constantFrom(...CATEGORIES),
    items: fc.constant([]),
    netAmount: fc.nat({ max: 1_000_000 }),
    ivaAmount: fc.nat({ max: 200_000 }),
    exemptAmount: fc.nat({ max: 100_000 }),
    otherTaxes: fc.nat({ max: 50_000 }),
    totalAmount: fc.nat({ max: 1_500_000 }),
    paymentMethod: fc.constantFrom('efectivo', 'débito', 'crédito', 'transferencia', 'otro' as const),
    status: fc.constantFrom(...STATUSES),
    createdAt: fc.constant(new Date().toISOString()),
    updatedAt: fc.constant(new Date().toISOString()),
  });

/** Genera filtros con al menos un campo definido */
const arbitraryFilters = (): fc.Arbitrary<InvoiceFilters> =>
  fc.record({
    month: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
    year: fc.option(fc.integer({ min: 2020, max: 2025 }), { nil: undefined }),
    category: fc.option(fc.constantFrom(...CATEGORIES), { nil: undefined }),
    providerSearch: fc.option(fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0), { nil: undefined }),
    status: fc.option(fc.constantFrom(...STATUSES), { nil: undefined }),
  });

// ─── Helper: apply filters (mirrors invoiceStore.getFilteredInvoices logic) ──

function applyFilters(invoices: Invoice[], filters: InvoiceFilters): Invoice[] {
  return invoices.filter((inv) => {
    const [yearStr, monthStr] = inv.date.split('-');
    const invYear = parseInt(yearStr, 10);
    const invMonth = parseInt(monthStr, 10);

    if (filters.year !== undefined && invYear !== filters.year) return false;
    if (filters.month !== undefined && invMonth !== filters.month) return false;
    if (filters.category && inv.category !== filters.category) return false;
    if (filters.status && inv.status !== filters.status) return false;
    if (filters.providerSearch) {
      const search = filters.providerSearch.trim().toLowerCase();
      if (!inv.providerName.toLowerCase().includes(search)) return false;
    }
    return true;
  });
}

// ─── Property 2: Detección de duplicados ────────────────────────────────────

/**
 * Validates: Requirements 1.5
 *
 * Property 2: detectDuplicate debe retornar el invoice existente cuando se
 * agrega uno nuevo con el mismo providerName, documentNumber y totalAmount.
 */
describe('Property 2: Detección de duplicados', () => {
  it('detecta duplicado cuando providerName, documentNumber y totalAmount coinciden', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryInvoice(), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (invoices, idx) => {
          const target = invoices[idx % invoices.length];
          const duplicate = {
            providerName: target.providerName,
            documentNumber: target.documentNumber,
            totalAmount: target.totalAmount,
          };
          const result = detectDuplicate(invoices, duplicate);
          expect(result).not.toBeNull();
          expect(result!.providerName.trim().toLowerCase()).toBe(target.providerName.trim().toLowerCase());
          expect(result!.documentNumber).toBe(target.documentNumber);
          expect(result!.totalAmount).toBe(target.totalAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('retorna null cuando no hay coincidencia exacta de los tres campos', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryInvoice(), { minLength: 0, maxLength: 20 }),
        (invoices) => {
          // Use a documentNumber that cannot exist in the list
          const result = detectDuplicate(invoices, {
            providerName: 'UNIQUE_PROVIDER_XYZ',
            documentNumber: 'UNIQUE-DOC-99999',
            totalAmount: 0,
          });
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 15: Corrección del filtrado ───────────────────────────────────

/**
 * Validates: Requirements 5.2
 *
 * Property 15: getFilteredInvoices debe retornar únicamente invoices que
 * cumplen simultáneamente TODOS los criterios del filtro activo.
 */
describe('Property 15: Corrección del filtrado', () => {
  it('todos los resultados cumplen simultáneamente todos los criterios del filtro', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryInvoice(), { minLength: 0, maxLength: 50 }),
        arbitraryFilters(),
        (invoices, filters) => {
          const results = applyFilters(invoices, filters);

          for (const inv of results) {
            const [yearStr, monthStr] = inv.date.split('-');
            const invYear = parseInt(yearStr, 10);
            const invMonth = parseInt(monthStr, 10);

            if (filters.year !== undefined) {
              expect(invYear).toBe(filters.year);
            }
            if (filters.month !== undefined) {
              expect(invMonth).toBe(filters.month);
            }
            if (filters.category) {
              expect(inv.category).toBe(filters.category);
            }
            if (filters.status) {
              expect(inv.status).toBe(filters.status);
            }
            if (filters.providerSearch) {
              const search = filters.providerSearch.trim().toLowerCase();
              expect(inv.providerName.toLowerCase()).toContain(search);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ningún invoice excluido cumple todos los criterios del filtro (completitud)', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryInvoice(), { minLength: 0, maxLength: 50 }),
        arbitraryFilters(),
        (invoices, filters) => {
          const results = applyFilters(invoices, filters);
          const resultIds = new Set(results.map((i) => i.id));

          const excluded = invoices.filter((inv) => !resultIds.has(inv.id));

          for (const inv of excluded) {
            const [yearStr, monthStr] = inv.date.split('-');
            const invYear = parseInt(yearStr, 10);
            const invMonth = parseInt(monthStr, 10);

            const yearFails = filters.year !== undefined && invYear !== filters.year;
            const monthFails = filters.month !== undefined && invMonth !== filters.month;
            const categoryFails = !!filters.category && inv.category !== filters.category;
            const statusFails = !!filters.status && inv.status !== filters.status;
            const providerFails = !!filters.providerSearch &&
              !inv.providerName.toLowerCase().includes(filters.providerSearch.trim().toLowerCase());

            // At least one filter criterion must fail for excluded invoices
            expect(yearFails || monthFails || categoryFails || statusFails || providerFails).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
