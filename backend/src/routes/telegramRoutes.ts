import { Router } from 'express';
import { bot } from '../services/telegramBot';

export const telegramRoutes = Router();

// POST /api/telegram/webhook — receives Telegram updates and passes them to the bot
telegramRoutes.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res);
});
