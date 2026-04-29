import { create } from 'zustand';
import type { Invoice, InvoiceFilters } from '../types/invoice';
import { storageService } from '../services/storageService';
import { apiClient } from '../services/apiClient';

interface InvoiceStore {
  // State
  invoices: Invoice[];
  filters: InvoiceFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInvoices: () => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  setFilters: (filters: Partial<InvoiceFilters>) => void;
  getFilteredInvoices: () => Invoice[];
  clearError: () => void;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  // Initial state
  invoices: [],
  filters: {},
  isLoading: false,
  error: null,

  // Load all invoices — merges IndexedDB (web) + server file (Telegram)
  loadInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load from IndexedDB
      const localInvoices = await storageService.getAllInvoices();
      const localIds = new Set(localInvoices.map((inv) => inv.id));

      // Load from server (Telegram bot saves here)
      let serverInvoices: Invoice[] = [];
      try {
        serverInvoices = await apiClient.getServerInvoices();
      } catch {
        // Server may be unavailable — continue with local only
      }

      // Merge: add server invoices not already in IndexedDB, and save them locally
      const newFromServer: Invoice[] = [];
      for (const inv of serverInvoices) {
        if (!localIds.has(inv.id)) {
          newFromServer.push(inv);
          // Persist to IndexedDB preserving the original ID
          try {
            await storageService.importInvoice(inv);
          } catch {
            // ignore errors
          }
        }
      }

      const allInvoices = [...localInvoices, ...newFromServer].sort((a, b) =>
        b.date > a.date ? 1 : -1
      );

      set({ invoices: allInvoices, isLoading: false });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al cargar los comprobantes';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Add a new invoice
  addInvoice: async (invoiceData) => {
    set({ isLoading: true, error: null });
    try {
      const newInvoice = await storageService.saveInvoice(invoiceData);
      set((state) => ({
        invoices: [newInvoice, ...state.invoices].sort((a, b) => {
          if (b.date < a.date) return -1;
          if (b.date > a.date) return 1;
          return 0;
        }),
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al guardar el comprobante';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Update an existing invoice
  updateInvoice: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedInvoice = await storageService.updateInvoice(id, updates);
      set((state) => ({
        invoices: state.invoices
          .map((inv) => (inv.id === id ? updatedInvoice : inv))
          .sort((a, b) => {
            if (b.date < a.date) return -1;
            if (b.date > a.date) return 1;
            return 0;
          }),
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar el comprobante';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Delete an invoice
  deleteInvoice: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await storageService.deleteInvoice(id);
      set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar el comprobante';
      set({ error: errorMessage, isLoading: false });
      throw err;
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // Get filtered invoices based on active filters
  getFilteredInvoices: () => {
    const { invoices, filters } = get();
    
    return invoices.filter((invoice) => {
      // Filter by month
      if (filters.month !== undefined) {
        const invoiceMonth = new Date(invoice.date).getMonth() + 1;
        if (invoiceMonth !== filters.month) return false;
      }

      // Filter by year
      if (filters.year !== undefined) {
        const invoiceYear = new Date(invoice.date).getFullYear();
        if (invoiceYear !== filters.year) return false;
      }

      // Filter by category
      if (filters.category !== undefined) {
        if (invoice.category !== filters.category) return false;
      }

      // Filter by provider (partial search, case-insensitive)
      if (filters.providerSearch !== undefined && filters.providerSearch.trim() !== '') {
        const searchTerm = filters.providerSearch.toLowerCase().trim();
        const providerName = invoice.providerName.toLowerCase();
        if (!providerName.includes(searchTerm)) return false;
      }

      // Filter by status
      if (filters.status !== undefined) {
        if (invoice.status !== filters.status) return false;
      }

      return true;
    });
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },
}));
