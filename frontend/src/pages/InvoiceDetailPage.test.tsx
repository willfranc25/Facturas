import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { InvoiceDetailPage } from './InvoiceDetailPage';
import { useInvoiceStore } from '../store/invoiceStore';
import type { Invoice } from '../types/invoice';

// Mock the invoice store
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

const mockInvoice: Invoice = {
  id: 'test-invoice-1',
  providerName: 'Cencosud Retail S.A.',
  providerRut: '76.354.771-9',
  documentType: 'boleta',
  documentNumber: '123456',
  date: '2025-06-15',
  time: '14:30',
  category: 'Supermercado',
  items: [
    {
      id: 'item-1',
      description: 'Pan integral',
      quantity: 2,
      unitPrice: 1500,
      total: 3000,
    },
    {
      id: 'item-2',
      description: 'Leche descremada',
      quantity: 1,
      unitPrice: 1200,
      total: 1200,
    },
  ],
  netAmount: 8403,
  ivaAmount: 1597,
  exemptAmount: 0,
  otherTaxes: 0,
  totalAmount: 10000,
  paymentMethod: 'débito',
  imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  rawOcrText: 'CENCOSUD RETAIL S.A.\nRUT: 76.354.771-9\nBOLETA N° 123456\nFECHA: 15/06/2025\nTOTAL: $10.000',
  status: 'reviewed',
  notes: 'Compra semanal de supermercado',
  createdAt: '2025-06-15T14:30:00.000Z',
  updatedAt: '2025-06-15T14:35:00.000Z',
};

describe('InvoiceDetailPage', () => {
  const mockUpdateInvoice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Setup default mock implementation
    vi.mocked(useInvoiceStore).mockReturnValue({
      invoices: [mockInvoice],
      updateInvoice: mockUpdateInvoice,
      filters: {},
      isLoading: false,
      error: null,
      loadInvoices: vi.fn(),
      addInvoice: vi.fn(),
      deleteInvoice: vi.fn(),
      setFilters: vi.fn(),
      getFilteredInvoices: vi.fn(),
      clearError: vi.fn(),
    });
  });

  const renderWithRouter = (invoiceId: string) => {
    window.history.pushState({}, '', `/invoices/${invoiceId}`);
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        </Routes>
      </BrowserRouter>
    );
  };

  it('should display invoice details correctly', () => {
    renderWithRouter('test-invoice-1');

    // Check that main elements are displayed
    expect(screen.getByText('Detalle de Comprobante')).toBeInTheDocument();
    expect(screen.getByText('Cencosud Retail S.A.')).toBeInTheDocument();
    expect(screen.getByText('76.354.771-9')).toBeInTheDocument();
  });

  it('should display the original invoice image', () => {
    renderWithRouter('test-invoice-1');

    const image = screen.getByAltText('Comprobante');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', mockInvoice.imageUrl);
  });

  it('should display all accounting fields', () => {
    renderWithRouter('test-invoice-1');

    // Check amounts
    expect(screen.getByText('Monto Neto:')).toBeInTheDocument();
    expect(screen.getByText('IVA (19%):')).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();

    // Check category
    expect(screen.getByText('Supermercado')).toBeInTheDocument();

    // Check payment method
    expect(screen.getByText('débito')).toBeInTheDocument();
  });

  it('should display invoice items table', () => {
    renderWithRouter('test-invoice-1');

    expect(screen.getByText('Detalle de Ítems')).toBeInTheDocument();
    expect(screen.getByText('Pan integral')).toBeInTheDocument();
    expect(screen.getByText('Leche descremada')).toBeInTheDocument();
  });

  it('should display collapsible OCR text', async () => {
    const user = userEvent.setup();

    renderWithRouter('test-invoice-1');

    const ocrButton = screen.getByText('Texto OCR Original');
    expect(ocrButton).toBeInTheDocument();

    // OCR text should not be visible initially
    expect(screen.queryByDisplayValue(/CENCOSUD RETAIL/)).not.toBeInTheDocument();

    // Click to expand
    await user.click(ocrButton);

    // OCR text should now be visible
    await waitFor(() => {
      expect(screen.getByDisplayValue(/CENCOSUD RETAIL/)).toBeInTheDocument();
    });
  });

  it('should display createdAt and updatedAt timestamps', () => {
    renderWithRouter('test-invoice-1');

    expect(screen.getByText('Creado:')).toBeInTheDocument();
    expect(screen.getByText('Actualizado:')).toBeInTheDocument();
  });

  it('should have a button to change status to approved', async () => {
    const user = userEvent.setup();

    renderWithRouter('test-invoice-1');

    const approveButton = screen.getByRole('button', { name: /Aprobar/i });
    expect(approveButton).toBeInTheDocument();

    await user.click(approveButton);

    await waitFor(() => {
      expect(mockUpdateInvoice).toHaveBeenCalledWith('test-invoice-1', {
        status: 'approved',
      });
    });
  });

  it('should not show approve button if status is already approved', () => {
    const approvedInvoice = { ...mockInvoice, status: 'approved' as const };

    vi.mocked(useInvoiceStore).mockReturnValue({
      invoices: [approvedInvoice],
      updateInvoice: mockUpdateInvoice,
      filters: {},
      isLoading: false,
      error: null,
      loadInvoices: vi.fn(),
      addInvoice: vi.fn(),
      deleteInvoice: vi.fn(),
      setFilters: vi.fn(),
      getFilteredInvoices: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter('test-invoice-1');

    const approveButton = screen.queryByRole('button', { name: /Aprobar/i });
    expect(approveButton).not.toBeInTheDocument();
  });

  it('should have a button to navigate to edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter('test-invoice-1');

    const editButton = screen.getByRole('button', { name: /Editar/i });
    expect(editButton).toBeInTheDocument();

    await user.click(editButton);

    expect(mockNavigate).toHaveBeenCalledWith('/invoices/test-invoice-1/edit');
  });

  it('should display message when invoice is not found', () => {
    vi.mocked(useInvoiceStore).mockReturnValue({
      invoices: [],
      updateInvoice: mockUpdateInvoice,
      filters: {},
      isLoading: false,
      error: null,
      loadInvoices: vi.fn(),
      addInvoice: vi.fn(),
      deleteInvoice: vi.fn(),
      setFilters: vi.fn(),
      getFilteredInvoices: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter('non-existent-id');

    expect(screen.getByText('Comprobante no encontrado')).toBeInTheDocument();
  });

  it('should display placeholder when no image is available', () => {
    const invoiceWithoutImage = { ...mockInvoice, imageUrl: undefined };

    vi.mocked(useInvoiceStore).mockReturnValue({
      invoices: [invoiceWithoutImage],
      updateInvoice: mockUpdateInvoice,
      filters: {},
      isLoading: false,
      error: null,
      loadInvoices: vi.fn(),
      addInvoice: vi.fn(),
      deleteInvoice: vi.fn(),
      setFilters: vi.fn(),
      getFilteredInvoices: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter('test-invoice-1');

    expect(screen.getByText('No hay imagen disponible')).toBeInTheDocument();
  });

  it('should display notes when available', () => {
    renderWithRouter('test-invoice-1');

    expect(screen.getByText('Notas')).toBeInTheDocument();
    expect(screen.getByText('Compra semanal de supermercado')).toBeInTheDocument();
  });
});
