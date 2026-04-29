import type { InvoiceStatus, DocumentType } from '../types/invoice';
import { formatRut } from './rutValidator';

/**
 * Formatea un número como moneda CLP chilena.
 * Ejemplo: 1234567 → "$ 1.234.567"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a formato DD/MM/YYYY.
 * Retorna el string original si no puede parsear.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  // Validate that parts look like a date: year 4 digits, month/day 1-2 digits
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return dateStr;
  }
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/**
 * Formatea una fecha ISO 8601 completa a DD/MM/YYYY HH:MM.
 * Ejemplo: "2025-06-15T14:32:00.000Z" → "15/06/2025 14:32"
 */
export function formatDateTime(isoStr: string): string {
  if (!isoStr) return isoStr;
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formatea un RUT para display (re-exporta lógica de rutValidator).
 */
export function formatRutDisplay(rut: string): string {
  return formatRut(rut);
}

/**
 * Retorna el label del status en español.
 */
export function getStatusLabel(status: InvoiceStatus): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'reviewed':
      return 'Revisado';
    case 'approved':
      return 'Aprobado';
    default:
      return status;
  }
}

/**
 * Retorna las clases Tailwind para el badge de status.
 */
export function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'reviewed':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Retorna la etiqueta en español para un tipo de documento.
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  switch (type) {
    case 'boleta':
      return 'Boleta';
    case 'factura':
      return 'Factura';
    case 'boleta_electronica':
      return 'Boleta Electrónica';
    case 'factura_electronica':
      return 'Factura Electrónica';
    case 'otro':
      return 'Otro';
    default:
      return type;
  }
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Retorna el nombre del mes en español (1-based).
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return '';
  return MONTH_NAMES[month - 1];
}
