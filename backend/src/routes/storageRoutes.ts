import { Router } from 'express';
import type { Request, Response } from 'express';
import { serverStorage } from '../services/serverStorage';

export const storageRoutes = Router();

// GET /api/storage/invoices — return all server-side invoices (saved via Telegram)
storageRoutes.get('/invoices', async (_req: Request, res: Response) => {
  try {
    const invoices = await serverStorage.getAllInvoices();
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/storage/invoices — save an invoice from the web app
storageRoutes.post('/invoices', async (req: Request, res: Response) => {
  const data = req.body;
  if (!data) {
    res.status(400).json({ success: false, error: 'No data provided' });
    return;
  }
  try {
    const saved = await serverStorage.saveInvoice(data);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/storage/invoices/:id
storageRoutes.delete('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await serverStorage.deleteInvoice(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});
