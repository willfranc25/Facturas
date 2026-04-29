import axios from 'axios';
import { config } from '../config';
import { ocrEngine } from './ocrEngine';
import { parseInvoiceText } from './invoiceParser';
import type { Invoice } from '../types/invoice';

// ── Error classes ──────────────────────────────────────────────────────────────

export class VLMServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'VLMServiceError';
  }
}

export class VLMTimeoutError extends VLMServiceError {
  constructor(ms: number) {
    super(`VLM timeout after ${ms}ms`);
    this.name = 'VLMTimeoutError';
  }
}

export class VLMInvalidResponseError extends VLMServiceError {
  constructor(raw: string) {
    super(`Invalid VLM response: ${raw.slice(0, 100)}`);
    this.name = 'VLMInvalidResponseError';
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VLMHealthStatus {
  available: boolean;
  mode: 'local' | 'remote';
  endpoint: string;
  model?: string;
  responseTimeMs?: number;
}

interface VLMLog {
  timestamp: string;
  imageSize: number;
  responseTimeMs: number;
  extractionMethod: 'moondream2' | 'ocr_fallback';
  success: boolean;
  error: string | null;
}

// ── Prompt ─────────────────────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are analyzing a Chilean invoice or receipt image. Extract the data and respond with ONLY a JSON object, no other text.

JSON format:
{"providerName":"string or null","providerRut":"XX.XXX.XXX-X format or null","documentType":"boleta or factura or boleta_electronica or factura_electronica or otro or null","documentNumber":"string or null","date":"YYYY-MM-DD or null","time":"HH:MM or null","netAmount":number or null,"ivaAmount":number or null,"exemptAmount":number or null,"otherTaxes":number or null,"totalAmount":number or null,"paymentMethod":"efectivo or debito or credito or transferencia or otro or null","category":"Supermercado or Combustible or Transporte or Servicios básicos or Arriendo or Comida or Insumos de trabajo or Equipamiento or Marketing or Internet/Telefonía or Otros","items":[{"description":"string","quantity":number,"unitPrice":number,"total":number}]}

Rules:
- providerRut: look for RUT, R.U.T. followed by numbers like 12.345.678-9
- date: convert DD/MM/YYYY to YYYY-MM-DD
- netAmount: look for NETO or MONTO NETO
- ivaAmount: look for IVA (19%)
- otherTaxes: look for IMPUESTO COMBUSTIBLE, IMPUESTO ESPECIFICO, IMPUESTO ADICIONAL — this is a separate tax line, NOT the IVA
- totalAmount: look for TOTAL or MONTO TOTAL (the final amount paid)
- paymentMethod: RED COMPRA means debito, EFECTIVO means efectivo
- category: infer from context — gas stations/bencina/combustible/ENEX/Copec/Shell = Combustible; supermarkets/Cencosud/Jumbo/Lider = Supermercado; restaurants/food = Comida; etc.
- Return null for any field not visible in the image`;

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Supermercado', 'Combustible', 'Transporte', 'Servicios básicos',
  'Arriendo', 'Comida', 'Insumos de trabajo', 'Equipamiento',
  'Marketing', 'Internet/Telefonía', 'Otros',
] as const;

// Map common VLM responses (English or variant Spanish) to valid categories
const CATEGORY_MAP: Record<string, string> = {
  'supermarket': 'Supermercado',
  'grocery': 'Supermercado',
  'fuel': 'Combustible',
  'gas': 'Combustible',
  'gasoline': 'Combustible',
  'petrol': 'Combustible',
  'bencina': 'Combustible',
  'transport': 'Transporte',
  'transportation': 'Transporte',
  'taxi': 'Transporte',
  'utilities': 'Servicios básicos',
  'utility': 'Servicios básicos',
  'rent': 'Arriendo',
  'food': 'Comida',
  'restaurant': 'Comida',
  'office supplies': 'Insumos de trabajo',
  'supplies': 'Insumos de trabajo',
  'equipment': 'Equipamiento',
  'marketing': 'Marketing',
  'internet': 'Internet/Telefonía',
  'phone': 'Internet/Telefonía',
  'telephony': 'Internet/Telefonía',
  'other': 'Otros',
  'others': 'Otros',
};

function normalizeCategory(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  // Check exact match first
  if (VALID_CATEGORIES.includes(raw as typeof VALID_CATEGORIES[number])) return raw;
  // Try lowercase map
  const lower = raw.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  // Partial match
  for (const valid of VALID_CATEGORIES) {
    if (lower.includes(valid.toLowerCase()) || valid.toLowerCase().includes(lower)) {
      return valid;
    }
  }
  return undefined;
}

function tryParseJson(raw: string): Partial<Invoice> | null {
  // Direct parse
  try {
    return JSON.parse(raw) as Partial<Invoice>;
  } catch {
    // Try to extract JSON block via regex
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Partial<Invoice>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function logRequest(entry: VLMLog): void {
  console.log('[VLMService]', JSON.stringify(entry));
}

// ── VLMService ─────────────────────────────────────────────────────────────────

export class VLMService {
  async extractInvoiceData(imageBuffer: Buffer): Promise<Partial<Invoice>> {
    const startTime = Date.now();
    const imageSize = imageBuffer.length;

    // ── Attempt Moondream2 ───────────────────────────────────────────────────
    try {
      const base64Image = imageBuffer.toString('base64');
      let rawResponse: string;

      if (config.vlm.mode === 'local') {
        const response = await axios.post(
          `${config.vlm.localUrl}/api/generate`,
          { model: config.vlm.localModel, prompt: EXTRACTION_PROMPT, images: [base64Image], stream: false },
          { timeout: config.vlm.timeoutMs }
        );
        rawResponse = response.data.response as string;
      } else {
        const response = await axios.post(
          config.vlm.remoteUrl,
          { prompt: EXTRACTION_PROMPT, image: base64Image },
          { timeout: config.vlm.timeoutMs }
        );
        rawResponse = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);
      }

      const parsed = tryParseJson(rawResponse);
      if (!parsed) {
        throw new VLMInvalidResponseError(rawResponse);
      }

      // Normalize category if VLM returned it
      const rawCategory = (parsed as Record<string, unknown>).category;
      const normalizedCategory = normalizeCategory(rawCategory);
      if (normalizedCategory) {
        (parsed as Record<string, unknown>).category = normalizedCategory;
      } else {
        delete (parsed as Record<string, unknown>).category;
      }

      logRequest({
        timestamp: new Date().toISOString(),
        imageSize,
        responseTimeMs: Date.now() - startTime,
        extractionMethod: 'moondream2',
        success: true,
        error: null,
      });

      return parsed;
    } catch (err) {
      // ── OCR fallback ───────────────────────────────────────────────────────
      const errorMsg = err instanceof Error ? err.message : String(err);
      try {
        const ocrText = await ocrEngine.ocrImage(imageBuffer);
        const parsed = parseInvoiceText(ocrText);

        logRequest({
          timestamp: new Date().toISOString(),
          imageSize,
          responseTimeMs: Date.now() - startTime,
          extractionMethod: 'ocr_fallback',
          success: true,
          error: errorMsg,
        });

        return parsed;
      } catch (ocrErr) {
        logRequest({
          timestamp: new Date().toISOString(),
          imageSize,
          responseTimeMs: Date.now() - startTime,
          extractionMethod: 'ocr_fallback',
          success: false,
          error: ocrErr instanceof Error ? ocrErr.message : String(ocrErr),
        });

        return {};
      }
    }
  }

  async checkHealth(): Promise<VLMHealthStatus> {
    const startTime = Date.now();

    if (config.vlm.mode === 'local') {
      try {
        await axios.get(`${config.vlm.localUrl}/api/tags`, { timeout: 5000 });
        return {
          available: true,
          mode: 'local',
          endpoint: config.vlm.localUrl,
          model: config.vlm.localModel,
          responseTimeMs: Date.now() - startTime,
        };
      } catch {
        return {
          available: false,
          mode: 'local',
          endpoint: config.vlm.localUrl,
          model: config.vlm.localModel,
          responseTimeMs: Date.now() - startTime,
        };
      }
    } else {
      try {
        await axios.head(config.vlm.remoteUrl, { timeout: 5000 });
        return {
          available: true,
          mode: 'remote',
          endpoint: config.vlm.remoteUrl,
          responseTimeMs: Date.now() - startTime,
        };
      } catch {
        return {
          available: false,
          mode: 'remote',
          endpoint: config.vlm.remoteUrl,
          responseTimeMs: Date.now() - startTime,
        };
      }
    }
  }
}

export const vlmService = new VLMService();
