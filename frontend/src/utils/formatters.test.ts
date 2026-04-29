import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRutDisplay,
  getStatusLabel,
  getStatusColor,
  getDocumentTypeLabel,
} from './formatters';

describe('formatCurrency', () => {
  it('formatea montos CLP con separadores de miles', () => {
    const result = formatCurrency(1234567);
    // Intl.NumberFormat es-CL CLP produce "$ 1.234.567" o similar
    expect(result).toContain('1.234.567');
  });

  it('formatea montos pequeños', () => {
    const result = formatCurrency(1000);
    expect(result).toContain('1.000');
  });

  it('formatea cero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });
});

describe('formatDate', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY', () => {
    expect(formatDate('2025-06-15')).toBe('15/06/2025');
    expect(formatDate('2024-01-01')).toBe('01/01/2024');
  });

  it('retorna el string original si no puede parsear', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
    expect(formatDate('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('convierte ISO 8601 a DD/MM/YYYY HH:MM', () => {
    expect(formatDateTime('2025-06-15T14:32:00.000Z')).toBe('15/06/2025 14:32');
  });

  it('retorna el string original si no puede parsear', () => {
    expect(formatDateTime('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('formatRutDisplay', () => {
  it('formatea RUT al formato XX.XXX.XXX-X', () => {
    expect(formatRutDisplay('123456785')).toBe('12.345.678-5');
  });

  it('retorna string vacío para RUT inválido', () => {
    expect(formatRutDisplay('')).toBe('');
  });
});

describe('getStatusLabel', () => {
  it('retorna etiquetas en español', () => {
    expect(getStatusLabel('pending')).toBe('Pendiente');
    expect(getStatusLabel('reviewed')).toBe('Revisado');
    expect(getStatusLabel('approved')).toBe('Aprobado');
  });
});

describe('getStatusColor', () => {
  it('retorna clases Tailwind correctas', () => {
    expect(getStatusColor('pending')).toBe('bg-yellow-100 text-yellow-800');
    expect(getStatusColor('reviewed')).toBe('bg-blue-100 text-blue-800');
    expect(getStatusColor('approved')).toBe('bg-green-100 text-green-800');
  });
});

describe('getDocumentTypeLabel', () => {
  it('mapea tipos a etiquetas en español', () => {
    expect(getDocumentTypeLabel('boleta')).toBe('Boleta');
    expect(getDocumentTypeLabel('factura')).toBe('Factura');
    expect(getDocumentTypeLabel('boleta_electronica')).toBe('Boleta Electrónica');
    expect(getDocumentTypeLabel('factura_electronica')).toBe('Factura Electrónica');
    expect(getDocumentTypeLabel('otro')).toBe('Otro');
  });
});
