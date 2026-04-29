import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { InvoicesPage } from './InvoicesPage';
import { useInvoiceStore } from '../store/invoiceStore';
import type { Invoice } from '../types/invoice';

// Mock the store
vi.mock('../store/invoiceStore');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('InvoicesPage', () => {
  const mockLoadInvoices = vi.fn();
  const mockDeleteInvoice = vi.fn();
  const mockUpdateInvoice = vi.fn();
  const mockSetFilters = vi.fn();
  const mockGetFilteredInvoices = vi.fn();
  const mockClearError = vi.fn();

  const sampleInvoice: Invoice = {
    id: '1',
    providerName: 'Cencosud S.A.',
    providerRut: '76.354.771-9',
    documentType: 'boleta',
    documentNumber: '123456',
    date: '2025-06-15',
    category: 'Supermercado',
    items: [],
    netAmount: 8403,
    ivaAmount: 1597,
    exemptAmount: 0,
    otherTaxes: 0,
    totalAmount: 10000,
    paymentMethod: 'débito',
    status: 'pending',
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    (useInvoiceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadInvoices: mockLoadInvoices,
      deleteInvoice: mockDeleteInvoice,
      updateInvoice: mockUpdateInvoice,
      filters: {},
      setFilters: mockSetFilters,
      getFilteredInvoices: mockGetFilteredInvoices,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });

    mockGetFilteredInvoices.mockReturnValue([]);
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <InvoicesPage />
      </BrowserRouter>
    );
  };

  it('renders page title', () => {
    renderPage();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
  });

  it('loads invoices on mount', () => {
    renderPage();
    expect(mockLoadInvoices).toHaveBeenCalledTimes(1);
  });

  it('renders filters component', () => {
    renderPage();
    expect(screen.getByLabelText(/mes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useInvoiceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadInvoices: mockLoadInvoices,
      deleteInvoice: mockDeleteInvoice,
      updateInvoice: mockUpdateInvoice,
      filters: {},
      setFilters: mockSetFilters,
      getFilteredInvoices: mockGetFilteredInvoices,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    });

    renderPage();
    expect(screen.getByText(/cargando comprobantes/i)).toBeInTheDocument();
  });

  it('shows error message when error exists', () => {
    (useInvoiceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadInvoices: mockLoadInvoices,
      deleteInvoice: mockDeleteInvoice,
      updateInvoice: mockUpdateInvoice,
      filters: {},
      setFilters: mockSetFilters,
      getFilteredInvoices: mockGetFilteredInvoices,
      isLoading: false,
      error: 'Error al cargar los comprobantes',
      clearError: mockClearError,
    });

    renderPage();
    expect(screen.getByText('Error al cargar los comprobantes')).toBeInTheDocument();
  });

  it('clears error when close button is clicked', () => {
    (useInvoiceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadInvoices: mockLoadInvoices,
      deleteInvoice: mockDeleteInvoice,
      updateInvoice: mockUpdateInvoice,
      filters: {},
      setFilters: mockSetFilters,
      getFilteredInvoices: mockGetFilteredInvoices,
      isLoading: false,
      error: 'Error al cargar los comprobantes',
      clearError: mockClearError,
    });

    renderPage();
    const closeButton = screen.getByLabelText(/cerrar mensaje de error/i);
    fireEvent.click(closeButton);

    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('navigates to upload page when new button is clicked', () => {
    renderPage();
    const newButton = screen.getByRole('button', { name: /nuevo comprobante/i });
    fireEvent.click(newButton);

    expect(mockNavigate).toHaveBeenCalledWith('/upload');
  });

  it('displays invoices in table on desktop', () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);

    renderPage();

    // Desktop table should be rendered (hidden on mobile)
    expect(screen.getAllByText('Cencosud S.A.').length).toBeGreaterThan(0);
  });

  it('opens delete confirmation modal when delete is clicked', async () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);

    renderPage();

    const deleteButtons = screen.getAllByTitle('Eliminar');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/confirmar eliminación/i)).toBeInTheDocument();
      expect(
        screen.getByText(/¿estás seguro de que deseas eliminar este comprobante/i)
      ).toBeInTheDocument();
    });
  });

  it('deletes invoice when confirmed', async () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);
    mockDeleteInvoice.mockResolvedValue(undefined);

    renderPage();

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Eliminar');
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    await waitFor(() => {
      const confirmButtons = screen.getAllByRole('button', { name: /eliminar/i });
      // Find the button in the modal (not the delete icon buttons)
      const confirmButton = confirmButtons.find(btn => 
        btn.textContent === 'Eliminar' && !btn.querySelector('svg')
      );
      fireEvent.click(confirmButton!);
    });

    await waitFor(() => {
      expect(mockDeleteInvoice).toHaveBeenCalledWith('1');
    });
  });

  it('closes modal when cancel is clicked', async () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);

    renderPage();

    // Open delete modal
    const deleteButtons = screen.getAllByTitle('Eliminar');
    fireEvent.click(deleteButtons[0]);

    // Cancel deletion
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.queryByText(/confirmar eliminación/i)).not.toBeInTheDocument();
    });
  });

  it('navigates to detail page when view is clicked', () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);

    renderPage();

    const viewButton = screen.getByTitle('Ver detalle');
    fireEvent.click(viewButton);

    expect(mockNavigate).toHaveBeenCalledWith('/invoices/1');
  });

  it('navigates to edit page when edit is clicked', () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);

    renderPage();

    const editButton = screen.getByTitle('Editar');
    fireEvent.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/invoices/1/edit');
  });

  it('updates invoice status when changed', async () => {
    mockGetFilteredInvoices.mockReturnValue([sampleInvoice]);
    mockUpdateInvoice.mockResolvedValue(undefined);

    renderPage();

    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(
      (select) => (select as HTMLSelectElement).value === 'pending'
    );

    fireEvent.change(statusSelect!, { target: { value: 'approved' } });

    await waitFor(() => {
      expect(mockUpdateInvoice).toHaveBeenCalledWith('1', { status: 'approved' });
    });
  });

  it('clears all filters when clear filters is clicked', () => {
    (useInvoiceStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      loadInvoices: mockLoadInvoices,
      deleteInvoice: mockDeleteInvoice,
      updateInvoice: mockUpdateInvoice,
      filters: { month: 6, year: 2025 },
      setFilters: mockSetFilters,
      getFilteredInvoices: mockGetFilteredInvoices,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    });

    renderPage();

    const clearButton = screen.getByRole('button', { name: /limpiar filtros/i });
    fireEvent.click(clearButton);

    expect(mockSetFilters).toHaveBeenCalledWith({
      month: undefined,
      year: undefined,
      category: undefined,
      providerSearch: undefined,
      status: undefined,
    });
  });

  it('shows empty state when no invoices match filters', () => {
    mockGetFilteredInvoices.mockReturnValue([]);

    renderPage();

    expect(screen.getAllByText(/no se encontraron comprobantes/i).length).toBeGreaterThan(0);
  });
});
