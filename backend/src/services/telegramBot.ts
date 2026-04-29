import { Telegraf, Context, Markup } from 'telegraf';
import { CallbackQuery } from 'telegraf/types';
import axios from 'axios';
import { config } from '../config';
import { vlmService } from './vlmService';
import { serverStorage } from './serverStorage';
import type { Invoice, InvoiceCategory, DocumentType, PaymentMethod } from '../types/invoice';

// ── Session ────────────────────────────────────────────────────────────────────

interface UserSession {
  pendingInvoice: Partial<Invoice> | null;
  pendingImageBuffer: Buffer | null;
  expiresAt: number | null;
  awaitingFieldEdit: keyof Partial<Invoice> | null; // waiting for free-text correction
}

const sessions = new Map<number, UserSession>();
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSession(userId: number): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      pendingInvoice: null,
      pendingImageBuffer: null,
      expiresAt: null,
      awaitingFieldEdit: null,
    });
  }
  return sessions.get(userId)!;
}

function createSession(userId: number, invoice: Partial<Invoice>, imageBuffer: Buffer): void {
  sessions.set(userId, {
    pendingInvoice: invoice,
    pendingImageBuffer: imageBuffer,
    expiresAt: Date.now() + SESSION_TTL_MS,
    awaitingFieldEdit: null,
  });
}

function clearSession(userId: number): void {
  sessions.set(userId, {
    pendingInvoice: null,
    pendingImageBuffer: null,
    expiresAt: null,
    awaitingFieldEdit: null,
  });
}

function isSessionExpired(session: UserSession): boolean {
  return session.expiresAt !== null && Date.now() > session.expiresAt;
}

// ── Bot ────────────────────────────────────────────────────────────────────────

export const bot = new Telegraf(config.telegram.botToken);

// ── Authorization ──────────────────────────────────────────────────────────────

bot.use(async (ctx: Context, next) => {
  const allowedIds = config.telegram.allowedUserIds;
  if (allowedIds.length === 0) return next();
  const userId = ctx.from?.id;
  if (!userId || !allowedIds.includes(userId)) {
    await ctx.reply('⛔ Acceso denegado.');
    return;
  }
  return next();
});

// ── Main menu keyboard ─────────────────────────────────────────────────────────

const MAIN_MENU = Markup.keyboard([
  ['📸 Subir comprobante', '📋 Mis comprobantes'],
  ['📊 Reporte del mes', '❓ Ayuda'],
]).resize();

// ── /start ─────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  await ctx.reply(
    `👋 ¡Hola ${ctx.from?.first_name || ''}! Soy tu asistente de facturas.\n\nUsa los botones para navegar:`,
    MAIN_MENU
  );
});

// ── /help ──────────────────────────────────────────────────────────────────────

bot.help(async (ctx) => {
  await ctx.reply(
    '📖 *Cómo usar el bot:*\n\n' +
    '📸 Envía una foto de tu boleta o factura\n' +
    '✅ Revisa los datos extraídos y confirma\n' +
    '✏️ Corrige cualquier campo con los botones\n' +
    '📋 Consulta tus comprobantes guardados\n' +
    '📊 Ve el resumen mensual de gastos',
    { parse_mode: 'Markdown', ...MAIN_MENU }
  );
});

// ── Text button handlers ───────────────────────────────────────────────────────

bot.hears('❓ Ayuda', async (ctx) => {
  await ctx.reply(
    '📖 *Cómo usar el bot:*\n\n' +
    '📸 Envía una foto de tu boleta o factura\n' +
    '✅ Revisa los datos extraídos y confirma\n' +
    '✏️ Corrige cualquier campo con los botones\n' +
    '📋 Consulta tus comprobantes guardados\n' +
    '📊 Ve el resumen mensual de gastos',
    { parse_mode: 'Markdown', ...MAIN_MENU }
  );
});

bot.hears('📸 Subir comprobante', async (ctx) => {
  await ctx.reply('📸 Envía la foto de tu boleta o factura ahora.', Markup.removeKeyboard());
});

bot.hears('📋 Mis comprobantes', async (ctx) => {
  await handleList(ctx);
});

bot.hears('📊 Reporte del mes', async (ctx) => {
  await handleReport(ctx, null, null);
});

// ── Photo handler ──────────────────────────────────────────────────────────────

bot.on('photo', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;

  const processingMsg = await ctx.reply('⏳ Procesando imagen con IA...');

  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data as ArrayBuffer);

    const invoiceData = await vlmService.extractInvoiceData(imageBuffer);
    createSession(userId, invoiceData, imageBuffer);

    // Delete "processing" message
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});

    await sendSummaryWithButtons(ctx, invoiceData);
  } catch (err) {
    console.error('[TelegramBot] Error processing photo:', err);
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});
    await ctx.reply('❌ Error al procesar la imagen. Intenta de nuevo.', MAIN_MENU);
  }
});

// ── Inline button callbacks ────────────────────────────────────────────────────

bot.action('confirm_invoice', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);

  if (!session.pendingInvoice) {
    await ctx.reply('❌ No hay comprobante pendiente. Envía una foto primero.', MAIN_MENU);
    return;
  }

  if (isSessionExpired(session)) {
    clearSession(userId);
    await ctx.reply('⏰ Sesión expirada. Envía una nueva foto.', MAIN_MENU);
    return;
  }

  const now = new Date().toISOString();
  const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
    providerName: session.pendingInvoice.providerName || 'Desconocido',
    providerRut: session.pendingInvoice.providerRut || '',
    documentType: (session.pendingInvoice.documentType as DocumentType) || 'otro',
    documentNumber: session.pendingInvoice.documentNumber || '',
    date: session.pendingInvoice.date || now.slice(0, 10),
    time: session.pendingInvoice.time,
    category: (session.pendingInvoice.category as InvoiceCategory) || 'Otros',
    items: session.pendingInvoice.items || [],
    netAmount: session.pendingInvoice.netAmount || 0,
    ivaAmount: session.pendingInvoice.ivaAmount || 0,
    exemptAmount: session.pendingInvoice.exemptAmount || 0,
    otherTaxes: session.pendingInvoice.otherTaxes || 0,
    totalAmount: session.pendingInvoice.totalAmount || 0,
    paymentMethod: (session.pendingInvoice.paymentMethod as PaymentMethod) || 'otro',
    status: 'reviewed',
    notes: session.pendingInvoice.notes,
  };

  serverStorage.saveInvoice(invoiceData, session.pendingImageBuffer ?? undefined);
  clearSession(userId);

  // Edit the message to remove buttons
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});

  const confirmMsg =
    `✅ *¡Comprobante guardado!*\n\n` +
    `🏪 ${invoiceData.providerName}\n` +
    `📅 ${invoiceData.date}\n` +
    `🏷️ ${invoiceData.category}\n` +
    `💰 Total: $${invoiceData.totalAmount.toLocaleString('es-CL')}\n\n` +
    `Ya está disponible en la aplicación web 🌐`;

  await ctx.reply(confirmMsg, {
    parse_mode: 'Markdown',
    ...MAIN_MENU,
  });
});

bot.action('cancel_invoice', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  clearSession(userId);
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  await ctx.reply('🗑️ Comprobante descartado.', MAIN_MENU);
});

// Edit field buttons
bot.action('edit_provider', async (ctx) => {
  await ctx.answerCbQuery();
  await askForFieldValue(ctx, 'providerName', '🏪 Escribe el nombre del proveedor:');
});

bot.action('edit_date', async (ctx) => {
  await ctx.answerCbQuery();
  await askForFieldValue(ctx, 'date', '📅 Escribe la fecha (formato YYYY-MM-DD, ej: 2025-06-15):');
});

bot.action('edit_total', async (ctx) => {
  await ctx.answerCbQuery();
  await askForFieldValue(ctx, 'totalAmount', '💰 Escribe el monto total:');
});

bot.action('edit_category', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  if (!session.pendingInvoice) {
    await ctx.reply('❌ No hay comprobante pendiente.', MAIN_MENU);
    return;
  }

  // Show category selection buttons
  await ctx.reply(
    '🏷️ Selecciona la categoría:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Supermercado', 'cat_Supermercado'), Markup.button.callback('⛽ Combustible', 'cat_Combustible')],
      [Markup.button.callback('🚌 Transporte', 'cat_Transporte'), Markup.button.callback('💡 Servicios básicos', 'cat_Servicios básicos')],
      [Markup.button.callback('🏠 Arriendo', 'cat_Arriendo'), Markup.button.callback('🍽️ Comida', 'cat_Comida')],
      [Markup.button.callback('💼 Insumos trabajo', 'cat_Insumos de trabajo'), Markup.button.callback('🖥️ Equipamiento', 'cat_Equipamiento')],
      [Markup.button.callback('📣 Marketing', 'cat_Marketing'), Markup.button.callback('📡 Internet/Tel.', 'cat_Internet/Telefonía')],
      [Markup.button.callback('📦 Otros', 'cat_Otros')],
    ])
  );
});

bot.action('edit_rut', async (ctx) => {
  await ctx.answerCbQuery();
  await askForFieldValue(ctx, 'providerRut', '🪪 Escribe el RUT del proveedor (ej: 76.354.771-9):');
});

bot.action('edit_payment', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  if (!session.pendingInvoice) {
    await ctx.reply('❌ No hay comprobante pendiente.', MAIN_MENU);
    return;
  }

  await ctx.reply(
    '💳 Selecciona el método de pago:',
    Markup.inlineKeyboard([
      [Markup.button.callback('💵 Efectivo', 'pay_efectivo'), Markup.button.callback('💳 Débito', 'pay_débito')],
      [Markup.button.callback('💳 Crédito', 'pay_crédito'), Markup.button.callback('🏦 Transferencia', 'pay_transferencia')],
      [Markup.button.callback('📦 Otro', 'pay_otro')],
    ])
  );
});

// Category selection callbacks
const CATEGORIES: InvoiceCategory[] = [
  'Supermercado', 'Combustible', 'Transporte', 'Servicios básicos',
  'Arriendo', 'Comida', 'Insumos de trabajo', 'Equipamiento',
  'Marketing', 'Internet/Telefonía', 'Otros',
];

for (const cat of CATEGORIES) {
  bot.action(`cat_${cat}`, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    const session = getSession(userId);
    if (!session.pendingInvoice) return;
    session.pendingInvoice.category = cat;
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await sendSummaryWithButtons(ctx, session.pendingInvoice);
  });
}

// Payment method callbacks
const PAYMENT_METHODS: PaymentMethod[] = ['efectivo', 'débito', 'crédito', 'transferencia', 'otro'];

for (const method of PAYMENT_METHODS) {
  bot.action(`pay_${method}`, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    const session = getSession(userId);
    if (!session.pendingInvoice) return;
    session.pendingInvoice.paymentMethod = method;
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await sendSummaryWithButtons(ctx, session.pendingInvoice);
  });
}

// ── List handler ───────────────────────────────────────────────────────────────

bot.command('list', async (ctx) => {
  await handleList(ctx);
});

async function handleList(ctx: Context, month?: number | null, year?: number | null): Promise<void> {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const all = await serverStorage.getAllInvoices();
  const filtered = all.filter((inv) => {
    const d = new Date(inv.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  }).slice(0, 10);

  if (filtered.length === 0) {
    await ctx.reply(
      `📋 No hay comprobantes para ${String(m).padStart(2, '0')}/${y}.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('◀️ Mes anterior', `list_${m === 1 ? 12 : m - 1}_${m === 1 ? y - 1 : y}`)],
      ])
    );
    return;
  }

  const lines = filtered.map((inv, i) =>
    `${i + 1}. *${inv.date}* — ${inv.providerName}\n   ${inv.category} | $${inv.totalAmount.toLocaleString('es-CL')}`
  );

  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;

  await ctx.reply(
    `📋 *Comprobantes ${String(m).padStart(2, '0')}/${y}:*\n\n${lines.join('\n\n')}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`◀️ ${String(prevM).padStart(2, '0')}/${prevY}`, `list_${prevM}_${prevY}`),
          Markup.button.callback(`▶️ ${String(nextM).padStart(2, '0')}/${nextY}`, `list_${nextM}_${nextY}`),
        ],
        [Markup.button.callback('📊 Ver reporte', `report_${m}_${y}`)],
      ]),
    }
  );
}

// Pagination callbacks
bot.action(/^list_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const match = (ctx.callbackQuery as CallbackQuery.DataQuery).data.match(/^list_(\d+)_(\d+)$/);
  if (!match) return;
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  await handleList(ctx, parseInt(match[1]), parseInt(match[2]));
});

bot.action(/^report_(\d+)_(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const match = (ctx.callbackQuery as CallbackQuery.DataQuery).data.match(/^report_(\d+)_(\d+)$/);
  if (!match) return;
  await handleReport(ctx, parseInt(match[1]), parseInt(match[2]));
});

// ── Report handler ─────────────────────────────────────────────────────────────

bot.command('report', async (ctx) => {
  await handleReport(ctx, null, null);
});

async function handleReport(ctx: Context, month: number | null, year: number | null): Promise<void> {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const allInvoices = await serverStorage.getAllInvoices();
  const filtered = allInvoices.filter((inv) => {
    const d = new Date(inv.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  });

  if (filtered.length === 0) {
    await ctx.reply(`📊 No hay comprobantes para ${String(m).padStart(2, '0')}/${y}.`, MAIN_MENU);
    return;
  }

  const totalGastado = filtered.reduce((s, i) => s + i.totalAmount, 0);
  const totalIva = filtered.reduce((s, i) => s + i.ivaAmount, 0);
  const totalNeto = filtered.reduce((s, i) => s + i.netAmount, 0);

  const byCategory: Record<string, number> = {};
  for (const inv of filtered) {
    byCategory[inv.category] = (byCategory[inv.category] || 0) + inv.totalAmount;
  }

  const categoryLines = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => `  • ${cat}: $${total.toLocaleString('es-CL')}`);

  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;

  await ctx.reply(
    `📊 *Reporte ${String(m).padStart(2, '0')}/${y}*\n\n` +
    `💰 Total: $${totalGastado.toLocaleString('es-CL')}\n` +
    `🧾 IVA: $${totalIva.toLocaleString('es-CL')}\n` +
    `📄 Neto: $${totalNeto.toLocaleString('es-CL')}\n` +
    `📦 Comprobantes: ${filtered.length}\n\n` +
    `📂 *Por categoría:*\n${categoryLines.join('\n')}`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`◀️ ${String(prevM).padStart(2, '0')}/${prevY}`, `report_${prevM}_${prevY}`),
          Markup.button.callback(`▶️ ${String(nextM).padStart(2, '0')}/${nextY}`, `report_${nextM}_${nextY}`),
        ],
        [Markup.button.callback('📋 Ver comprobantes', `list_${m}_${y}`)],
      ]),
    }
  );
}

// ── Free-text field editing ────────────────────────────────────────────────────

async function askForFieldValue(
  ctx: Context,
  field: keyof Partial<Invoice>,
  prompt: string
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = getSession(userId);
  if (!session.pendingInvoice) {
    await ctx.reply('❌ No hay comprobante pendiente.', MAIN_MENU);
    return;
  }
  session.awaitingFieldEdit = field;
  await ctx.reply(prompt, Markup.forceReply());
}

// Handle free-text replies for field editing
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const session = getSession(userId);
  const text = ctx.message.text;

  // Handle main menu buttons (already handled by hears above, but catch-all)
  if (text.startsWith('/')) return;

  // If waiting for a field value
  if (session.pendingInvoice && session.awaitingFieldEdit) {
    const field = session.awaitingFieldEdit;
    session.awaitingFieldEdit = null;

    // Parse numeric fields
    const numericFields: (keyof Invoice)[] = ['totalAmount', 'netAmount', 'ivaAmount', 'exemptAmount', 'otherTaxes'];
    if (numericFields.includes(field as keyof Invoice)) {
      const num = parseFloat(text.replace(/\./g, '').replace(',', '.'));
      if (isNaN(num)) {
        await ctx.reply('❌ Valor inválido. Escribe un número.');
        session.awaitingFieldEdit = field; // ask again
        return;
      }
      (session.pendingInvoice as Record<string, unknown>)[field as string] = num;
    } else {
      (session.pendingInvoice as Record<string, unknown>)[field as string] = text.trim();
    }

    await sendSummaryWithButtons(ctx, session.pendingInvoice);
    return;
  }

  // Unrecognized text
  await ctx.reply('❓ Usa los botones del menú o envía una foto de tu comprobante.', MAIN_MENU);
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function sendSummaryWithButtons(ctx: Context, invoice: Partial<Invoice>): Promise<void> {
  const summary =
    `📄 *Datos del comprobante:*\n\n` +
    `🏪 *Proveedor:* ${invoice.providerName || '—'}\n` +
    `🪪 *RUT:* ${invoice.providerRut || '—'}\n` +
    `📅 *Fecha:* ${invoice.date || '—'}\n` +
    `🏷️ *Categoría:* ${invoice.category || '—'}\n` +
    `💰 *Total:* $${(invoice.totalAmount ?? 0).toLocaleString('es-CL')}\n` +
    `📄 *Neto:* $${(invoice.netAmount ?? 0).toLocaleString('es-CL')}\n` +
    `🧾 *IVA:* $${(invoice.ivaAmount ?? 0).toLocaleString('es-CL')}\n` +
    (invoice.otherTaxes ? `⚡ *Otros imp.:* $${invoice.otherTaxes.toLocaleString('es-CL')}\n` : '') +
    `💳 *Pago:* ${invoice.paymentMethod || '—'}\n\n` +
    `¿Los datos son correctos?`;

  await ctx.reply(summary, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Confirmar y guardar', 'confirm_invoice'),
        Markup.button.callback('🗑️ Descartar', 'cancel_invoice'),
      ],
      [
        Markup.button.callback('✏️ Proveedor', 'edit_provider'),
        Markup.button.callback('📅 Fecha', 'edit_date'),
      ],
      [
        Markup.button.callback('💰 Total', 'edit_total'),
        Markup.button.callback('🏷️ Categoría', 'edit_category'),
      ],
      [
        Markup.button.callback('🪪 RUT', 'edit_rut'),
        Markup.button.callback('💳 Método pago', 'edit_payment'),
      ],
    ]),
  });
}
