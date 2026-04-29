import { Router } from 'express';
import type { Request, Response } from 'express';
import { vlmService } from '../services/vlmService';

export const vlmRoutes = Router();

// GET /api/vlm/health
vlmRoutes.get('/health', async (_req: Request, res: Response) => {
  const status = await vlmService.checkHealth();
  res.status(200).json(status);
});
