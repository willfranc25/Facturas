import { v4 as uuidv4 } from 'uuid';
import type { Invoice, InvoiceItem, DocumentType, PaymentMethod, InvoiceCategory } from '../types/invoice';

// Keywords por categoría
const CATEGORY_KEYWORDS: Record<InvoiceCategory, string[]> = {
  Supermercado: ['supermercado', 'cencosud', 'jumbo', 'lider', 'líder', 'unimarc', 'santa isabel', 'tottus', 'walmart', 'acuenta', 'mayorista'],
  Combustible: ['combustible', 'bencina', 'copec', 'shell', 'petrobras', 'enex', 'gasolina', 'diesel', 'gasolinera', 'estacion de servicio', 'estación de servicio', 'octanos', 'litro', 'litros', 'petroleo', 'petróleo', 'wanpetrol', 'terpel'],
  Transporte: ['transporte', 'taxi', 'uber', 'cabify', 'didi', 'metro', 'bus', 'transantiago', 'red movilidad', 'bip', 'peaje', 'estacionamiento', 'parking'],
  'Servicios básicos': ['agua', 'luz', 'electricidad', 'gas', 'enel', 'chilectra', 'aguas andinas', 'metrogas', 'cge', 'essbio', 'sanitaria'],
  Arriendo: ['arriendo', 'arrendamiento', 'renta', 'alquiler', 'inmobiliaria', 'propiedad'],
  Comida: ['restaurant', 'restaurante', 'cafe', 'cafetería', 'comida', 'almuerzo', 'cena', 'desayuno', 'delivery', 'rappi', 'pedidosya', 'uber eats', 'mcdonalds', 'burger', 'pizza', 'sushi'],
  'Insumos de trabajo': ['insumos', 'papelería', 'papeleria', 'oficina', 'toner', 'tinta', 'papel', 'lapiz', 'lápiz', 'cuaderno', 'carpeta', 'fotocopias'],
  Equipamiento: ['equipamiento', 'computador', 'laptop', 'monitor', 'teclado', 'mouse', 'impresora', 'scanner', 'telefono', 'teléfono', 'celular', 'tablet', 'falabella', 'ripley', 'paris', 'abcdin'],
  Marketing: ['marketing', 'publicidad', 'diseño', 'diseño grafico', 'imprenta', 'banner', 'flyer', 'redes sociales', 'google ads', 'facebook ads'],
  'Internet/Telefonía': ['internet', 'telefonia', 'telefonía', 'movistar', 'entel', 'claro', 'wom', 'vtr', 'gtd', 'fibra', 'banda ancha', 'plan movil', 'plan móvil'],
  Otros: [],
};

function parseAmount(str: string): number {
  // Remove thousand separators (dots) and convert comma decimal to dot
  // Handles Chilean format: 1.234.567 or 1.234,56
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function extractRut(text: string): string | undefined {
  // RUT preceded by keywords (including R.U.T without spaces)
  const rutWithKeyword = /(?:RUT|R\.U\.T\.?|PROVEEDOR|EMISOR|RUT\s*CLIENTE)[:\s]*(\d{1,2}\.?\d{3}\.?\d{3}-[\dKk]|\d{7,8}-[\dKk])/i;
  const match = text.match(rutWithKeyword);
  if (match) return match[1];

  // Fallback: any RUT-like pattern (formatted XX.XXX.XXX-X or unformatted XXXXXXXX-X)
  // Exclude RUT CLIENTE (customer RUT) — prefer provider RUT from first lines
  const lines = text.split('\n');
  for (const line of lines.slice(0, 8)) {
    const rut = line.match(/\b(\d{1,2}\.\d{3}\.\d{3}-[\dKk]|\d{7,8}-[\dKk])\b/);
    if (rut && !/CLIENTE/i.test(line)) return rut[1];
  }

  // Last resort: any RUT in the text
  const anyRut = text.match(/\b(\d{1,2}\.\d{3}\.\d{3}-[\dKk]|\d{7,8}-[\dKk])\b/);
  if (anyRut) return anyRut[1];

  return undefined;
}

function extractDate(text: string): string | undefined {
  // Try with keyword first: FECHA, EMISION, DATE
  const withKeyword = /(?:FECHA|DATE|EMISION|EMISIÓN|FECHA\s+DE\s+EMISION)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i;
  let match = text.match(withKeyword);

  // Fallback: standalone date pattern DD/MM/YYYY or DD-MM-YYYY
  if (!match) {
    const standalone = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/;
    match = text.match(standalone);
  }

  if (!match) return undefined;

  const raw = match[1];
  const sep = raw.includes('/') ? '/' : '-';
  const parts = raw.split(sep);
  const day = parts[0];
  const month = parts[1];
  let year = parts[2];

  if (year.length === 2) {
    year = parseInt(year) >= 50 ? `19${year}` : `20${year}`;
  }

  return `${year}-${month}-${day}`;
}

function extractTime(text: string): string | undefined {
  const timePattern = /(?:HORA|TIME|HOUR)[:\s]*(\d{2}:\d{2})(?::\d{2})?/i;
  const match = text.match(timePattern);
  if (match) return match[1];

  // Fallback: standalone HH:MM:SS pattern
  const standalone = /\b(\d{2}:\d{2}):\d{2}\b/;
  const m2 = text.match(standalone);
  return m2 ? m2[1] : undefined;
}

function extractAmountField(text: string, keyword: string): number | undefined {
  // Match keyword followed by optional spaces, $, and number
  // Also handles "MONTO NETO", "MONTO TOTAL", etc.
  const pattern = new RegExp(
    `(?:MONTO\\s+)?${keyword}[:\\s]*\\$?\\s*([\\d.,]+)`,
    'i'
  );
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = parseAmount(match[1]);
  return isNaN(value) ? undefined : value;
}

function extractOtherTaxes(text: string): number | undefined {
  // Capture impuestos adicionales: IMPUESTO COMBUSTIBLE, IMPUESTO ADICIONAL, IMPUESTO ESPECIFICO, etc.
  const pattern = /IMPUESTO\s+(?:COMBUSTIBLE|ADICIONAL|ESPECIFICO|ESPECÍFICO|AL\s+COMBUSTIBLE)[:\s]*\$?\s*([\d.,]+)/i;
  const match = text.match(pattern);
  if (match) {
    const value = parseAmount(match[1]);
    if (!isNaN(value)) return value;
  }
  // Also try "IMP. COMBUSTIBLE" or "IMP COMBUSTIBLE"
  const shortPattern = /IMP\.?\s+COMBUSTIBLE[:\s]*\$?\s*([\d.,]+)/i;
  const m2 = text.match(shortPattern);
  if (m2) {
    const value = parseAmount(m2[1]);
    if (!isNaN(value)) return value;
  }
  return undefined;
}

function extractDocumentNumber(text: string): string | undefined {
  // Handles: BOLETA N°123, BOLETA ELECTRONICA No:123, FOLIO 123, N° 123, NRO 123
  const pattern = /(?:BOLETA\s+ELECTRONICA\s+No|BOLETA\s+ELECTRÓNICA\s+No|FACTURA\s+ELECTRONICA\s+No|FACTURA\s+ELECTRÓNICA\s+No|BOLETA|FACTURA|N[°º]|NRO|FOLIO|N\s*[°º])[:\s#]*(\d+)/i;
  const match = text.match(pattern);
  return match ? match[1] : undefined;
}

function extractDocumentType(text: string): DocumentType | undefined {
  const upper = text.toUpperCase();
  if (upper.includes('FACTURA ELECTRONICA') || upper.includes('FACTURA ELECTRÓNICA')) return 'factura_electronica';
  if (upper.includes('BOLETA ELECTRONICA') || upper.includes('BOLETA ELECTRÓNICA')) return 'boleta_electronica';
  if (upper.includes('FACTURA')) return 'factura';
  if (upper.includes('BOLETA')) return 'boleta';
  return undefined;
}

function extractPaymentMethod(text: string): PaymentMethod | undefined {
  const upper = text.toUpperCase();
  // RED COMPRA = tarjeta de débito
  if (upper.includes('RED COMPRA') || upper.includes('REDCOMPRA')) return 'débito';
  if (upper.includes('EFECTIVO')) return 'efectivo';
  if (upper.includes('DEBITO') || upper.includes('DÉBITO')) return 'débito';
  if (upper.includes('CREDITO') || upper.includes('CRÉDITO')) return 'crédito';
  if (upper.includes('TRANSFERENCIA')) return 'transferencia';
  return undefined;
}

function extractProviderName(text: string): string | undefined {
  const lines = text.split('\n');
  // Look in first 6 lines for a company name pattern
  const companyPattern = /S\.A\.|SPA|LTDA|E\.I\.R\.L|SpA|S\.P\.A\.|LTDA\./i;
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (trimmed && companyPattern.test(trimmed)) {
      // Clean up trailing punctuation and extra spaces
      return trimmed.replace(/[,;]+$/, '').trim();
    }
  }

  // Fallback: first non-empty line that looks like a name (not a RUT or address)
  for (const line of lines.slice(0, 4)) {
    const trimmed = line.trim();
    if (
      trimmed.length > 3 &&
      !/^\d/.test(trimmed) &&           // doesn't start with digit
      !/RUT|R\.U\.T/i.test(trimmed) &&  // not a RUT line
      !/FECHA|HORA/i.test(trimmed)       // not a date/time line
    ) {
      return trimmed;
    }
  }

  return undefined;
}

function extractItems(text: string): InvoiceItem[] {
  const items: InvoiceItem[] = [];

  // Pattern 1: description  qty  unitPrice  total (one or more spaces between columns)
  // Skips summary rows (TOTAL, NETO, IVA, etc.)
  const linePattern = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s+([\d.,]+)\s+([\d.,]+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(text)) !== null) {
    const description = match[1].trim();
    const quantity = parseFloat(match[2].replace(',', '.'));
    const unitPrice = parseAmount(match[3]);
    const total = parseAmount(match[4]);

    // Skip lines that look like summary rows
    if (/^(TOTAL|NETO|IVA|EXENTO|SUBTOTAL|MONTO)/i.test(description)) continue;

    if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total) && total > 0) {
      items.push({ id: uuidv4(), description, quantity, unitPrice, total });
    }
  }

  // Pattern 2: Chilean fuel receipt — "descripcion  cantidad x precio  unidad  valor"
  if (items.length === 0) {
    const fuelPattern = /^(.+?)\s+([\d.,]+)\s+[xX]\s+([\d.,]+)\s+\w+\s+([\d.,]+)$/gm;
    while ((match = fuelPattern.exec(text)) !== null) {
      const description = match[1].trim();
      const quantity = parseAmount(match[2]);
      const unitPrice = parseAmount(match[3]);
      const total = parseAmount(match[4]);
      if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(total) && total > 0) {
        items.push({ id: uuidv4(), description, quantity, unitPrice, total });
      }
    }
  }

  return items;
}

function detectCategory(text: string): InvoiceCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [InvoiceCategory, string[]][]) {
    if (category === 'Otros') continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'Otros';
}

export function parseInvoiceText(rawText: string): Partial<Invoice> {
  try {
    if (!rawText || rawText.trim() === '') return {};

    const result: Partial<Invoice> = {};

    const rut = extractRut(rawText);
    if (rut) result.providerRut = rut;

    const date = extractDate(rawText);
    if (date) result.date = date;

    const time = extractTime(rawText);
    if (time) result.time = time;

    // Extract amounts — order matters: MONTO TOTAL before TOTAL to avoid partial matches
    const netAmount = extractAmountField(rawText, 'NETO');
    if (netAmount !== undefined) result.netAmount = netAmount;

    const ivaAmount = extractAmountField(rawText, 'IVA');
    if (ivaAmount !== undefined) result.ivaAmount = ivaAmount;

    const exemptAmount = extractAmountField(rawText, 'EXENTO');
    if (exemptAmount !== undefined) result.exemptAmount = exemptAmount;

    const subtotal = extractAmountField(rawText, 'SUBTOTAL');
    if (subtotal !== undefined && result.netAmount === undefined) result.netAmount = subtotal;

    // Impuesto combustible / adicional → otherTaxes
    const otherTaxes = extractOtherTaxes(rawText);
    if (otherTaxes !== undefined) result.otherTaxes = otherTaxes;

    // Total: prefer "MONTO TOTAL" over bare "TOTAL" to avoid matching subtotals
    const totalAmount = extractAmountField(rawText, 'TOTAL');
    if (totalAmount !== undefined) result.totalAmount = totalAmount;

    const documentNumber = extractDocumentNumber(rawText);
    if (documentNumber) result.documentNumber = documentNumber;

    const documentType = extractDocumentType(rawText);
    if (documentType) result.documentType = documentType;

    const paymentMethod = extractPaymentMethod(rawText);
    if (paymentMethod) result.paymentMethod = paymentMethod;

    const providerName = extractProviderName(rawText);
    if (providerName) result.providerName = providerName;

    const items = extractItems(rawText);
    if (items.length > 0) result.items = items;

    result.category = detectCategory(rawText);

    return result;
  } catch {
    return {};
  }
}
