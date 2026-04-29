/**
 * serverStorage.ts
 * Supabase-based storage for the backend (used by Telegram bot and API routes).
 * Invoices → Supabase PostgreSQL (table: invoices)
 * Images   → Supabase Storage (bucket: invoice-images)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import type { Invoice } from '../types/invoice';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'invoice-images';
const TABLE  = 'invoices';

// --- Supabase row type (snake_case) ---

type InvoiceRow = {
  id: string;
  provider_name: string;
  provider_rut: string;
  document_type: string;
  document_number: string;
  date: string;
  time: string | null;
  category: string;
  items: unknown;
  net_amount: number;
  iva_amount: number;
  exempt_amount: number;
  other_taxes: number;
  total_amount: number;
  payment_method: string;
  image_url: string | null;
  raw_ocr_text: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toRow(inv: Partial<Invoice> & { id?: string; createdAt?: string; updatedAt?: string }): Partial<InvoiceRow> {
  return {
    ...(inv.id        && { id: inv.id }),
    ...(inv.providerName   !== undefined && { provider_name:   inv.providerName }),
    ...(inv.providerRut    !== undefined && { provider_rut:    inv.providerRut }),
    ...(inv.documentType   !== undefined && { document_type:   inv.documentType }),
    ...(inv.documentNumber !== undefined && { document_number: inv.documentNumber }),
    ...(inv.date           !== undefined && { date:            inv.date }),
    ...(inv.time           !== undefined && { time:            inv.time ?? null }),
    ...(inv.category       !== undefined && { category:        inv.category }),
    ...(inv.items          !== undefined && { items:           inv.items }),
    ...(inv.netAmount      !== undefined && { net_amount:      inv.netAmount }),
    ...(inv.ivaAmount      !== undefined && { iva_amount:      inv.ivaAmount }),
    ...(inv.exemptAmount   !== undefined && { exempt_amount:   inv.exemptAmount }),
    ...(inv.otherTaxes     !== undefined && { other_taxes:     inv.otherTaxes }),
    ...(inv.totalAmount    !== undefined && { total_amount:    inv.totalAmount }),
    ...(inv.paymentMethod  !== undefined && { payment_method:  inv.paymentMethod }),
    ...(inv.imageUrl       !== undefined && { image_url:       inv.imageUrl ?? null }),
    ...(inv.rawOcrText     !== undefined && { raw_ocr_text:    inv.rawOcrText ?? null }),
    ...(inv.status         !== undefined && { status:          inv.status }),
    ...(inv.notes          !== undefined && { notes:           inv.notes ?? null }),
    ...(inv.createdAt      !== undefined && { created_at:      inv.createdAt }),
    ...(inv.updatedAt      !== undefined && { updated_at:      inv.updatedAt }),
  };
}

function fromRow(row: InvoiceRow): Invoice {
  return {
    id:             row.id,
    providerName:   row.provider_name,
    providerRut:    row.provider_rut,
    documentType:   row.document_type as Invoice['documentType'],
    documentNumber: row.document_number,
    date:           row.date,
    time:           row.time ?? undefined,
    category:       row.category as Invoice['category'],
    items:          row.items as Invoice['items'],
    netAmount:      row.net_amount,
    ivaAmount:      row.iva_amount,
    exemptAmount:   row.exempt_amount,
    otherTaxes:     row.other_taxes,
    totalAmount:    row.total_amount,
    paymentMethod:  row.payment_method as Invoice['paymentMethod'],
    imageUrl:       row.image_url ?? undefined,
    rawOcrText:     row.raw_ocr_text ?? undefined,
    status:         row.status as Invoice['status'],
    notes:          row.notes ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

// --- Image helpers ---

async function uploadImageBuffer(id: string, buffer: Buffer): Promise<string | null> {
  const path = `${id}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: true, contentType: 'image/jpeg' });
  if (error) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// --- CRUD operations ---

export const serverStorage = {
  async getAllInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false });
    if (error) throw new Error(`getAllInvoices failed: ${error.message}`);
    return (data as InvoiceRow[]).map(fromRow);
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`getInvoiceById failed: ${error.message}`);
    return data ? fromRow(data as InvoiceRow) : null;
  },

  async saveInvoice(
    data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>,
    imageBuffer?: Buffer
  ): Promise<Invoice> {
    const now = new Date().toISOString();
    const id = uuidv4();

    let imageUrl = data.imageUrl ?? null;
    if (imageBuffer && imageBuffer.length > 0) {
      const url = await uploadImageBuffer(id, imageBuffer);
      if (url) imageUrl = url;
    }

    const row = {
      ...toRow({ ...data, imageUrl: imageUrl ?? undefined }),
      id,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(`saveInvoice failed: ${error.message}`);
    return fromRow(inserted as InvoiceRow);
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toRow(updates), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return fromRow(data as InvoiceRow);
  },

  async deleteInvoice(id: string): Promise<boolean> {
    await supabase.storage.from(BUCKET).remove([`${id}.jpg`]);
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  },

  /** Maintained for compatibility — no longer serves static files */
  getImagesDir(): string {
    return '';
  },
};
