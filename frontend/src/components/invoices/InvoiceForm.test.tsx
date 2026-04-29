import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceForm } from './InvoiceForm';
import type { Invoice } from '../../types/invoice';

// Mock the store
vi.mock('../../store/invoiceStore', () => ({
  useInvoiceStore: vi.fn(() => ({
    addInvoice: vi.fn(),
  })),
}));

describe('InvoiceForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultInitialData: Partial<Invoice> = {
    providerName: 'Test Provider',
    providerRut: '12.345.678-5',
    documentType: 'boleta',
    documentNumber: '123456',
    date: '2025-06-15',
    category: 'Supermercado',
    netAmount: 8403,
    ivaAmount: 1597,
    exemptAmount: 0,
    otherTaxes: 0,
    totalAmount: 10000,
    paymentMethod: 'efectivo',
    notes: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with initial data', () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test Provider')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12.345.678-5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
  });

  it('validates RUT in real-time', async () => {
    render(
      <InvoiceForm
        initialData={{}}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const rutInput = screen.getByLabelText(/RUT del Proveedor/i);

    // Enter invalid RUT
    fireEvent.change(rutInput, { target: { value: '12.345.678-0' } });

    await waitFor(() => {
      expect(screen.getByText(/RUT inválido/i)).toBeInTheDocument();
    });

    // Enter valid RUT
    fireEvent.change(rutInput, { target: { value: '12.345.678-5' } });

    await waitFor(() => {
      expect(screen.queryByText(/RUT inválido/i)).not.toBeInTheDocument();
    });
  });

  it('recalculates total and shows warning when inconsistent', async () => {
    render(
      <InvoiceForm
        initialData={{
          netAmount: 8403,
          ivaAmount: 1597,
          exemptAmount: 0,
          otherTaxes: 0,
          totalAmount: 12000, // Inconsistent total
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Should show warning about inconsistency
    await waitFor(() => {
      expect(screen.getByText(/Advertencia/i)).toBeInTheDocument();
    });
  });

  it('does not show warning when total is consistent', () => {
    render(
      <InvoiceForm
        initialData={{
          netAmount: 8403,
          ivaAmount: 1597,
          exemptAmount: 0,
          otherTaxes: 0,
          totalAmount: 10000, // Consistent total
        }}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText(/Advertencia/i)).not.toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    render(
      <InvoiceForm
        initialData={{}}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Guardar Comprobante/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/La fecha es requerida/i)).toBeInTheDocument();
      expect(screen.getByText(/El total es requerido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('assigns status "pending" when no edits are made', async () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Guardar Comprobante/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
    });
  });

  it('assigns status "reviewed" when user makes edits', async () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Make an edit - use more specific label text
    const providerInput = screen.getByPlaceholderText('Nombre del proveedor');
    fireEvent.change(providerInput, { target: { value: 'Modified Provider' } });

    const submitButton = screen.getByRole('button', { name: /Guardar Comprobante/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'reviewed',
          providerName: 'Modified Provider',
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('displays image preview when provided', () => {
    const imageUrl = 'data:image/png;base64,test';
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        imagePreview={imageUrl}
      />
    );

    const image = screen.getByAltText('Comprobante');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', imageUrl);
  });

  it('updates amounts when user changes them', async () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const netInput = screen.getByLabelText(/Monto Neto/i);
    fireEvent.change(netInput, { target: { value: '5000' } });

    await waitFor(() => {
      expect(netInput).toHaveValue('5000');
    });
  });

  it('allows submission with valid data', async () => {
    render(
      <InvoiceForm
        initialData={defaultInitialData}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Guardar Comprobante/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          providerName: 'Test Provider',
          date: '2025-06-15',
          category: 'Supermercado',
          totalAmount: 10000,
        })
      );
    });
  });

  it('shows all required field labels with asterisks', () => {
    render(
      <InvoiceForm
        initialData={{}}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Fecha \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Categoría \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Total \*/i)).toBeInTheDocument();
  });
});
