import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { invoiceRoutes }  from './routes/invoiceRoutes';
import { vlmRoutes }      from './routes/vlmRoutes';
import { telegramRoutes } from './routes/telegramRoutes';
import { storageRoutes }  from './routes/storageRoutes';
import { errorHandler }   from './middleware/errorHandler';
import { config }         from './config';
import { bot }            from './services/telegramBot';

const app = express();

// CORS configurable via variable de entorno CORS_ORIGINS
app.use(cors({
  origin: config.server.corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));

// Health check para Render
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/invoices',  invoiceRoutes);
app.use('/api/vlm',       vlmRoutes);
app.use('/api/telegram',  telegramRoutes);
app.use('/api/storage',   storageRoutes);

app.use(errorHandler);

export { app };

export function startServer(): void {
  app.listen(config.server.port, () => {
    console.log(`[Server] Running on port ${config.server.port} (${config.server.nodeEnv})`);
    console.log(`[Server] CORS origins: ${config.server.corsOrigins.join(', ')}`);
    console.log(`[Supabase] URL: ${config.supabase.url}`);
  });

  if (!config.telegram.botToken) {
    console.log('[Telegram] No token configured, bot disabled.');
    return;
  }

  if (config.telegram.webhookUrl) {
    bot.telegram.setWebhook(config.telegram.webhookUrl).then(() => {
      console.log(`[Telegram] Webhook set: ${config.telegram.webhookUrl}`);
    });
  } else {
    bot.launch({ dropPendingUpdates: true }).then(() => {
      console.log('[Telegram] Bot started in polling mode.');
    }).catch((err) => {
      console.error('[Telegram] Failed to start bot:', err);
    });
    process.once('SIGINT',  () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
}

if (require.main === module) {
  startServer();
}
