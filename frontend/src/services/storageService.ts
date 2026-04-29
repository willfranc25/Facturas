import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Invoice } from '../types/invoice';
import { SAMPLE_INVOICES } from '../data/sampleData';

export class StorageError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(message);
    this.name = 'StorageError';
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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

export async function uploadImage(id: string, file: File | Blob): Promise<string | null> {
  const path = `${id}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'image/jpeg',
  });
  if (error) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImageBuffer(id: string, buffer: ArrayBuffer): Promise<string | null> {
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  return uploadImage(id, blob);
}

export async function deleteImage(id: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([`${id}.jpg`]);
}

// --- CRUD operations ---

async function initialize(): Promise<void> {
  try {
    const { data, error } = await supabase.from(TABLE).select('id').limit(1);
    if (error) throw error;
    if (data && data.length === 0) {
      const rows = SAMPLE_INVOICES.map((inv) => toRow(inv));
      const { error: insertError } = await supabase.from(TABLE).insert(rows);
      if (insertError) throw insertError;
    }
  } catch (err) {
    throw new StorageError(
      `Failed to initialize: ${err instanceof Error ? err.message : String(err)}`,
      'initialize'
    );
  }
}

async function saveInvoice(
  data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Invoice> {
  try {
    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert({ ...toRow(data), created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw error;
    return fromRow(inserted as InvoiceRow);
  } catch (err) {
    throw new StorageError(
      `Failed to save invoice: ${err instanceof Error ? err.message : String(err)}`,
      'saveInvoice'
    );
  }
}

async function importInvoice(invoice: Invoice): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(toRow(invoice), { onConflict: 'id' });
    if (error) throw error;
  } catch (err) {
    throw new StorageError(
      `Failed to import invoice: ${err instanceof Error ? err.message : String(err)}`,
      'importInvoice'
    );
  }
}

async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...toRow(updates), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error(`Invoice with id "${id}" not found`);
    return fromRow(data as InvoiceRow);
  } catch (err) {
    throw new StorageError(
      `Failed to update invoice: ${err instanceof Error ? err.message : String(err)}`,
      'updateInvoice'
    );
  }
}

async function deleteInvoice(id: string): Promise<void> {
  try {
    await deleteImage(id);
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    throw new StorageError(
      `Failed to delete invoice: ${err instanceof Error ? err.message : String(err)}`,
      'deleteInvoice'
    );
  }
}

async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as InvoiceRow[]).map(fromRow);
  } catch (err) {
    throw new StorageError(
      `Failed to get all invoices: ${err instanceof Error ? err.message : String(err)}`,
      'getAllInvoices'
    );
  }
}

async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as InvoiceRow) : null;
  } catch (err) {
    throw new StorageError(
      `Failed to get invoice by id: ${err instanceof Error ? err.message : String(err)}`,
      'getInvoiceById'
    );
  }
}

async function clearAllInvoices(): Promise<void> {
  try {
    const { error } = await supabase.from(TABLE).delete().neq('id', '');
    if (error) throw error;
  } catch (err) {
    throw new StorageError(
      `Failed to clear all invoices: ${err instanceof Error ? err.message : String(err)}`,
      'clearAllInvoices'
    );
  }
}

export const storageService = {
  initialize,
  saveInvoice,
  importInvoice,
  updateInvoice,
  deleteInvoice,
  getAllInvoices,
  getInvoiceById,
  clearAllInvoices,
};

// Also export openDB for backward compatibility with SettingsPage migration code
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('invoice-manager-db', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
