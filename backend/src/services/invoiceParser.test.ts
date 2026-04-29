import { describe, it, expect } from 'vitest';
import { parseInvoiceText } from './invoiceParser';

describe('parseInvoiceText', () => {
  it('texto vacío → retorna {}', () => {
    expect(parseInvoiceText('')).toEqual({});
    expect(parseInvoiceText('   ')).toEqual({});
  });

  it('texto con RUT → extrae providerRut', () => {
    const text = 'RUT: 76.354.771-9\nAlgún texto';
    const result = parseInvoiceText(text);
    expect(result.providerRut).toBe('76.354.771-9');
  });

  it('texto con RUT sin puntos → extrae providerRut', () => {
    const text = 'PROVEEDOR 76354771-9';
    const result = parseInvoiceText(text);
    expect(result.providerRut).toBe('76354771-9');
  });

  it('texto con fecha DD/MM/YYYY → extrae date en ISO', () => {
    const text = 'FECHA: 15/06/2025';
    const result = parseInvoiceText(text);
    expect(result.date).toBe('2025-06-15');
  });

  it('texto con fecha DD-MM-YYYY → extrae date en ISO', () => {
    const text = 'FECHA: 15-06-2025';
    const result = parseInvoiceText(text);
    expect(result.date).toBe('2025-06-15');
  });

  it('texto con fecha DD/MM/YY → extrae date en ISO con año expandido', () => {
    const text = 'FECHA: 15/06/25';
    const result = parseInvoiceText(text);
    expect(result.date).toBe('2025-06-15');
  });

  it('texto con TOTAL → extrae totalAmount', () => {
    const text = 'TOTAL: $10.000';
    const result = parseInvoiceText(text);
    expect(result.totalAmount).toBe(10000);
  });

  it('texto con NETO e IVA → extrae netAmount e ivaAmount', () => {
    const text = 'NETO: 8.403\nIVA: 1.597\nTOTAL: 10.000';
    const result = parseInvoiceText(text);
    expect(result.netAmount).toBe(8403);
    expect(result.ivaAmount).toBe(1597);
    expect(result.totalAmount).toBe(10000);
  });

  it('texto con BOLETA → extrae documentType: boleta', () => {
    const text = 'BOLETA N° 123456';
    const result = parseInvoiceText(text);
    expect(result.documentType).toBe('boleta');
  });

  it('texto con FACTURA ELECTRONICA → extrae documentType: factura_electronica', () => {
    const text = 'FACTURA ELECTRONICA N° 789';
    const result = parseInvoiceText(text);
    expect(result.documentType).toBe('factura_electronica');
  });

  it('texto con BOLETA ELECTRÓNICA → extrae documentType: boleta_electronica', () => {
    const text = 'BOLETA ELECTRÓNICA N° 456';
    const result = parseInvoiceText(text);
    expect(result.documentType).toBe('boleta_electronica');
  });

  it('texto con EFECTIVO → extrae paymentMethod: efectivo', () => {
    const text = 'Pago: EFECTIVO';
    const result = parseInvoiceText(text);
    expect(result.paymentMethod).toBe('efectivo');
  });

  it('texto con DÉBITO → extrae paymentMethod: débito', () => {
    const text = 'Forma de pago: DÉBITO';
    const result = parseInvoiceText(text);
    expect(result.paymentMethod).toBe('débito');
  });

  it('texto con TRANSFERENCIA → extrae paymentMethod: transferencia', () => {
    const text = 'Pago: TRANSFERENCIA';
    const result = parseInvoiceText(text);
    expect(result.paymentMethod).toBe('transferencia');
  });

  it('texto con número de documento → extrae documentNumber', () => {
    const text = 'FOLIO: 98765';
    const result = parseInvoiceText(text);
    expect(result.documentNumber).toBe('98765');
  });

  it('texto con proveedor con S.A. en primeras líneas → extrae providerName', () => {
    const text = 'Cencosud Retail S.A.\nRUT: 76.354.771-9\nFECHA: 15/06/2025';
    const result = parseInvoiceText(text);
    expect(result.providerName).toBe('Cencosud Retail S.A.');
  });

  it('texto con ítems → extrae InvoiceItem[]', () => {
    const text = 'Leche 2 1.200 2.400\nPan 3 500 1.500';
    const result = parseInvoiceText(text);
    expect(result.items).toBeDefined();
    expect(result.items!.length).toBe(2);
    expect(result.items![0].description).toBe('Leche');
    expect(result.items![0].quantity).toBe(2);
    expect(result.items![0].unitPrice).toBe(1200);
    expect(result.items![0].total).toBe(2400);
  });

  it('cada ítem tiene un id único (uuid)', () => {
    const text = 'Leche 2 1.200 2.400\nPan 3 500 1.500';
    const result = parseInvoiceText(text);
    const ids = result.items!.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('texto con keyword de supermercado → categoría Supermercado', () => {
    const text = 'Cencosud Retail S.A.\nTOTAL: 5.000';
    const result = parseInvoiceText(text);
    expect(result.category).toBe('Supermercado');
  });

  it('texto sin keywords conocidas → categoría Otros', () => {
    const text = 'TOTAL: 1.000';
    const result = parseInvoiceText(text);
    expect(result.category).toBe('Otros');
  });

  it('boleta Cencosud simulada → extrae múltiples campos', () => {
    const text = [
      'Cencosud Retail S.A.',
      'RUT: 76.354.771-9',
      'BOLETA ELECTRONICA N° 123456',
      'FECHA: 15/06/2025',
      'HORA: 14:30',
      'Leche 2 1.200 2.400',
      'Pan 3 500 1.500',
      'NETO: 3.277',
      'IVA: 623',
      'TOTAL: 3.900',
      'EFECTIVO',
    ].join('\n');

    const result = parseInvoiceText(text);

    expect(result.providerName).toBe('Cencosud Retail S.A.');
    expect(result.providerRut).toBe('76.354.771-9');
    expect(result.documentType).toBe('boleta_electronica');
    expect(result.documentNumber).toBe('123456');
    expect(result.date).toBe('2025-06-15');
    expect(result.time).toBe('14:30');
    expect(result.netAmount).toBe(3277);
    expect(result.ivaAmount).toBe(623);
    expect(result.totalAmount).toBe(3900);
    expect(result.paymentMethod).toBe('efectivo');
    expect(result.category).toBe('Supermercado');
    expect(result.items!.length).toBe(2);
  });

  it('idempotencia — llamar dos veces con el mismo texto produce resultados idénticos', () => {
    const text = [
      'Cencosud Retail S.A.',
      'RUT: 76.354.771-9',
      'BOLETA N° 999',
      'FECHA: 01/01/2025',
      'TOTAL: 15.000',
      'EFECTIVO',
    ].join('\n');

    const result1 = parseInvoiceText(text);
    const result2 = parseInvoiceText(text);

    // Items have random UUIDs, compare without them
    const { items: items1, ...rest1 } = result1;
    const { items: items2, ...rest2 } = result2;

    expect(rest1).toEqual(rest2);
    expect(items1?.length).toBe(items2?.length);
  });

  it('texto con caracteres especiales no lanza excepción', () => {
    expect(() => parseInvoiceText('!@#$%^&*()_+{}|:<>?')).not.toThrow();
    expect(() => parseInvoiceText('\x00\x01\x02')).not.toThrow();
  });
});
