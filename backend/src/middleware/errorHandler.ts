import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ErrorHandler]', err.message, err.stack);

  // Multer errors (file size, format)
  if (err instanceof multer.MulterError || err.message.includes('Formato no permitido')) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  res.status(500).json({ success: false, error: 'Error interno del servidor.' });
}
