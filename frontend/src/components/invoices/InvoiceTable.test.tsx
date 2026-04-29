import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceTable } from './InvoiceTable';
import type { Invoice } from '../../types/invoice';

describe('InvoiceTable', () => {
  const mockOnView = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnStatusChange = vi.fn();

  const defaultProps = {
    invoices: [],
    onView: mockOnView,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onStatusChange: mockOnStatusChange,
  };

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
  });

  it('shows empty state when no invoices', () => {
    render(<InvoiceTable {...defaultProps} />);

    expect(screen.getByText(/no se encontraron comprobantes/i)).toBeInTheDocument();
  });

  it('renders invoice data in table', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    expect(screen.getByText('Cencosud S.A.')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('15/06/2025')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    const viewButton = screen.getByTitle('Ver detalle');
    fireEvent.click(viewButton);

    expect(mockOnView).toHaveBeenCalledWith('1');
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    const editButton = screen.getByTitle('Editar');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    const deleteButton = screen.getByTitle('Eliminar');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('calls onStatusChange when status is changed', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    const statusSelects = screen.getAllByRole('combobox');
    const statusSelect = statusSelects.find(
      (select) => (select as HTMLSelectElement).value === 'pending'
    );

    expect(statusSelect).toBeDefined();
    fireEvent.change(statusSelect!, { target: { value: 'approved' } });

    expect(mockOnStatusChange).toHaveBeenCalledWith('1', 'approved');
  });

  it('displays formatted currency values', () => {
    render(<InvoiceTable {...defaultProps} invoices={[sampleInvoice]} />);

    // Check that currency formatting is applied (Chilean format uses $ and dots)
    expect(screen.getByText(/\$\s*8\.403/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*1\.597/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*10\.000/)).toBeInTheDocument();
  });

  it('paginates invoices when more than 10 items', () => {
    const manyInvoices = Array.from({ length: 15 }, (_, i) => ({
      ...sampleInvoice,
      id: `invoice-${i}`,
      providerName: `Provider ${i}`,
    }));

    render(<InvoiceTable {...defaultProps} invoices={manyInvoices} />);

    // Should show pagination controls
    expect(screen.getByText(/página 1 de 2/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
  });

  it('navigates to next page when next button is clicked', () => {
    const manyInvoices = Array.from({ length: 15 }, (_, i) => ({
      ...sampleInvoice,
      id: `invoice-${i}`,
      providerName: `Provider ${i}`,
    }));

    render(<InvoiceTable {...defaultProps} invoices={manyInvoices} />);

    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(nextButton);

    expect(screen.getByText(/página 2 de 2/i)).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const manyInvoices = Array.from({ length: 15 }, (_, i) => ({
      ...sampleInvoice,
      id: `invoice-${i}`,
    }));

    render(<InvoiceTable {...defaultProps} invoices={manyInvoices} />);

    const previousButton = screen.getByRole('button', { name: /anterior/i });
    expect(previousButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const manyInvoices = Array.from({ length: 15 }, (_, i) => ({
      ...sampleInvoice,
      id: `invoice-${i}`,
    }));

    render(<InvoiceTable {...defaultProps} invoices={manyInvoices} />);

    // Navigate to last page
    const nextButton = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });

  it('truncates long provider names', () => {
    const longNameInvoice = {
      ...sampleInvoice,
      providerName: 'Very Long Provider Name That Should Be Truncated In The Table View',
    };

    render(<InvoiceTable {...defaultProps} invoices={[longNameInvoice]} />);

    const providerCell = screen.getByText(longNameInvoice.providerName);
    expect(providerCell).toHaveClass('truncate');
  });
});
