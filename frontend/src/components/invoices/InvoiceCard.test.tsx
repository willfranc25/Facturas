import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceCard } from './InvoiceCard';
import type { Invoice } from '../../types/invoice';

describe('InvoiceCard', () => {
  const mockOnView = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

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

  const defaultProps = {
    invoice: sampleInvoice,
    onView: mockOnView,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invoice data', () => {
    render(<InvoiceCard {...defaultProps} />);

    expect(screen.getByText('15/06/2025')).toBeInTheDocument();
    expect(screen.getByText('Cencosud S.A.')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    render(<InvoiceCard {...defaultProps} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('displays formatted amounts', () => {
    render(<InvoiceCard {...defaultProps} />);

    expect(screen.getByText(/\$\s*8\.403/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*1\.597/)).toBeInTheDocument();
    expect(screen.getByText(/\$\s*10\.000/)).toBeInTheDocument();
  });

  it('calls onView when Ver button is clicked', () => {
    render(<InvoiceCard {...defaultProps} />);

    const viewButton = screen.getByRole('button', { name: /ver/i });
    fireEvent.click(viewButton);

    expect(mockOnView).toHaveBeenCalledWith('1');
  });

  it('calls onEdit when Editar button is clicked', () => {
    render(<InvoiceCard {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<InvoiceCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Eliminar');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('renders different status badges correctly', () => {
    const { rerender } = render(<InvoiceCard {...defaultProps} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    rerender(
      <InvoiceCard
        {...defaultProps}
        invoice={{ ...sampleInvoice, status: 'reviewed' }}
      />
    );
    expect(screen.getByText('Revisado')).toBeInTheDocument();

    rerender(
      <InvoiceCard
        {...defaultProps}
        invoice={{ ...sampleInvoice, status: 'approved' }}
      />
    );
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
  });

  it('truncates long provider names', () => {
    const longNameInvoice = {
      ...sampleInvoice,
      providerName: 'Very Long Provider Name That Should Be Truncated In The Card View',
    };

    render(<InvoiceCard {...defaultProps} invoice={longNameInvoice} />);

    const providerElement = screen.getByText(longNameInvoice.providerName);
    expect(providerElement).toHaveClass('truncate');
  });

  it('shows all three action buttons', () => {
    render(<InvoiceCard {...defaultProps} />);

    expect(screen.getByRole('button', { name: /ver/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByTitle('Eliminar')).toBeInTheDocument();
  });
});
