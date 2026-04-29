import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceFilters } from './InvoiceFilters';
import type { InvoiceFilters as IInvoiceFilters } from '../../types/invoice';

describe('InvoiceFilters', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultProps = {
    filters: {} as IInvoiceFilters,
    onFiltersChange: mockOnFiltersChange,
    onClearFilters: mockOnClearFilters,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter controls', () => {
    render(<InvoiceFilters {...defaultProps} />);

    expect(screen.getByLabelText(/mes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/proveedor/i)).toBeInTheDocument();
  });

  it('calls onFiltersChange when month is selected', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const monthSelect = screen.getByLabelText(/mes/i);
    fireEvent.change(monthSelect, { target: { value: '6' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ month: 6 });
  });

  it('calls onFiltersChange when year is selected', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const yearSelect = screen.getByLabelText(/año/i);
    fireEvent.change(yearSelect, { target: { value: '2025' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ year: 2025 });
  });

  it('calls onFiltersChange when category is selected', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const categorySelect = screen.getByLabelText(/categoría/i);
    fireEvent.change(categorySelect, { target: { value: 'Supermercado' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ category: 'Supermercado' });
  });

  it('calls onFiltersChange when status is selected', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const statusSelect = screen.getByLabelText(/estado/i);
    fireEvent.change(statusSelect, { target: { value: 'approved' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ status: 'approved' });
  });

  it('calls onFiltersChange when provider search text is entered', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const providerInput = screen.getByLabelText(/proveedor/i);
    fireEvent.change(providerInput, { target: { value: 'Cencosud' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ providerSearch: 'Cencosud' });
  });

  it('shows clear filters button when filters are active', () => {
    const activeFilters: IInvoiceFilters = {
      month: 6,
      year: 2025,
    };

    render(<InvoiceFilters {...defaultProps} filters={activeFilters} />);

    const clearButton = screen.getByRole('button', { name: /limpiar filtros/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('does not show clear filters button when no filters are active', () => {
    render(<InvoiceFilters {...defaultProps} />);

    const clearButton = screen.queryByRole('button', { name: /limpiar filtros/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('calls onClearFilters when clear button is clicked', () => {
    const activeFilters: IInvoiceFilters = {
      month: 6,
      category: 'Supermercado',
    };

    render(<InvoiceFilters {...defaultProps} filters={activeFilters} />);

    const clearButton = screen.getByRole('button', { name: /limpiar filtros/i });
    fireEvent.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
  });

  it('displays selected filter values', () => {
    const activeFilters: IInvoiceFilters = {
      month: 6,
      year: 2025,
      category: 'Combustible',
      status: 'reviewed',
      providerSearch: 'Shell',
    };

    render(<InvoiceFilters {...defaultProps} filters={activeFilters} />);

    const monthSelect = screen.getByLabelText(/mes/i) as HTMLSelectElement;
    const yearSelect = screen.getByLabelText(/año/i) as HTMLSelectElement;
    const categorySelect = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    const statusSelect = screen.getByLabelText(/estado/i) as HTMLSelectElement;
    const providerInput = screen.getByLabelText(/proveedor/i) as HTMLInputElement;

    expect(monthSelect.value).toBe('6');
    expect(yearSelect.value).toBe('2025');
    expect(categorySelect.value).toBe('Combustible');
    expect(statusSelect.value).toBe('reviewed');
    expect(providerInput.value).toBe('Shell');
  });

  it('clears month filter when empty option is selected', () => {
    render(<InvoiceFilters {...defaultProps} filters={{ month: 6 }} />);

    const monthSelect = screen.getByLabelText(/mes/i);
    fireEvent.change(monthSelect, { target: { value: '' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ month: undefined });
  });
});
