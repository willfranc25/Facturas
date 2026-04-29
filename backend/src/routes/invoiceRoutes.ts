import { Router } from 'express';
import type { Request, Response } from 'express';
import { uploadMiddleware } from '../middleware/upload';
import { vlmService } from '../services/vlmService';

export const invoiceRoutes = Router();

// POST /api/invoices/extract
invoiceRoutes.post('/extract', uploadMiddleware, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No se recibió ninguna imagen.' });
    return;
  }

  const result = await vlmService.extractInvoiceData(req.file.buffer);

  // Detect if OCR fallback was used by checking for rawOcrText presence
  // vlmService logs extractionMethod; we expose it via a simple heuristic
  const usedFallback = !!(result as Record<string, unknown>).rawOcrText;

  const response: Record<string, unknown> = {
    success: true,
    data: result,
    extractionMethod: usedFallback ? 'ocr_fallback' : 'moondream2',
  };

  if (usedFallback) {
    response.warning = 'Se usó OCR como método de extracción alternativo. Revise los datos extraídos.';
  }

  res.status(200).json(response);
});
