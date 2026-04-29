import dotenv from 'dotenv';

dotenv.config();

// Validación de variables requeridas al inicio
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;
for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    console.error(`[Config] ERROR CRÍTICO: La variable de entorno "${varName}" no está definida.`);
    process.exit(1);
  }
}

export const config = {
  supabase: {
    url:     process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  vlm: {
    mode:       (process.env.VLM_MODE as 'local' | 'remote') || 'local',
    localUrl:   process.env.VLM_LOCAL_URL || 'http://localhost:11434',
    localModel: process.env.VLM_LOCAL_MODEL || 'llava',
    remoteUrl:  process.env.VLM_REMOTE_URL || '',
    timeoutMs:  parseInt(process.env.VLM_TIMEOUT_MS || '120000', 10),
  },
  telegram: {
    botToken:       process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl:     process.env.TELEGRAM_WEBHOOK_URL || '',
    allowedUserIds: (process.env.TELEGRAM_ALLOWED_USER_IDS || '')
      .split(',')
      .filter(Boolean)
      .map(Number),
  },
  server: {
    port:    parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};
