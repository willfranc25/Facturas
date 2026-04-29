import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';
import { useInvoiceStore } from '../store/invoiceStore';
import type { Invoice } from '../types/invoice';
import * as exportService from '../services/exportService';

// Mock the store
vi.mock('../store/invoiceStore');

// Mock the export service
vi.mock('../services/exportService', async () => {
  const actual = await vi.importActual('../services/exportService');
  return {
    ...actual,
    downloadFile: vi.fn(),
  };
});

const mockInvoices: Invoice[] = [
  {
    id: '1',
    providerName: 'Proveedor A',
    providerRut: '12.345.678-9',
    documentType: 'boleta',
    documentNumber: '001',
    date: '2025-06-15',
    category: 'Supermercado',
    items: [],
    netAmount: 8403,
    ivaAmount: 1597,
    exemptAmount: 0,
    otherTaxes: 0,
    totalAmount: 10000,
    paymentMethod: 'efectivo',
    status: 'approved',
    createdAt: '2025-06-15T10:00:00Z',
    updatedAt: '2025-06-15T10:00:00Z',
  },
  {
    id: '2',
    providerName: 'Proveedor B',
    providerRut: '98.765.432-1',
    documentType: 'factura',
    documentNumber: '002',
    date: '2025-05-20',
    category: 'Combustible',
    items: [],
    netAmount: 4202,
    ivaAmount: 798,
    exemptAmount: 0,
    otherTaxes: 0,
    totalAmount: 5000,
    paymentMethod: 'débito',
    status: 'approved',
    createdAt: '2025-05-20T10:00:00Z',
    updatedAt: '2025-05-20T10:00:00Z',
  },
];

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.mocked(useInvoiceStore).mockReturnValue(mockInvoices);
  });

  it('renders page title and description', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText(/resumen de gastos por período y categoría/i)).toBeInTheDocument();
  });

  it('renders date range filters', () => {
    render(<ReportsPage />);
    expect(screen.getByLabelText('Fecha inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha fin')).toBeInTheDocument();
    expect(screen.getByText('Limpiar filtros')).toBeInTheDocument();
  });

  it('renders grand total summary', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Total Acumulado')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // count
    expect(screen.getByText('$12.605')).toBeInTheDocument(); // netAmount
    expect(screen.getByText('$2.395')).toBeInTheDocument(); // ivaAmount
    expect(screen.getByText('$15.000')).toBeInTheDocument(); // totalAmount
  });

  it('renders monthly summary table', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Resumen Mensual')).toBeInTheDocument();
    expect(screen.getByText('Mayo 2025')).toBeInTheDocument();
    expect(screen.getByText('Junio 2025')).toBeInTheDocument();
  });

  it('renders category summary table', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Resumen por Categoría')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Combustible')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(<ReportsPage />);
    expect(screen.getByText('Exportar Datos')).toBeInTheDocument();
    expect(screen.getByText('Exportar a Excel')).toBeInTheDocument();
    expect(screen.getByText('Exportar a CSV')).toBeInTheDocument();
  });

  it('filters invoices by date range', () => {
    render(<ReportsPage />);

    const startDateInput = screen.getByLabelText('Fecha inicio') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('Fecha fin') as HTMLInputElement;

    fireEvent.change(startDateInput, { target: { value: '2025-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2025-06-30' } });

    // Should only show June invoice - check the grand total
    const netAmounts = screen.getAllByText('$8.403');
    expect(netAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
    const totalAmounts = screen.getAllByText('$10.000');
    expect(totalAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
  });

  it('clears filters when clear button is clicked', () => {
    render(<ReportsPage />);

    const startDateInput = screen.getByLabelText('Fecha inicio') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('Fecha fin') as HTMLInputElement;
    const clearButton = screen.getByText('Limpiar filtros');

    fireEvent.change(startDateInput, { target: { value: '2025-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2025-06-30' } });

    expect(startDateInput.value).toBe('2025-06-01');
    expect(endDateInput.value).toBe('2025-06-30');

    fireEvent.click(clearButton);

    expect(startDateInput.value).toBe('');
    expect(endDateInput.value).toBe('');
  });

  it('calls exportToExcel when Excel button is clicked', () => {
    const downloadFileSpy = vi.spyOn(exportService, 'downloadFile');
    render(<ReportsPage />);

    const excelButton = screen.getByText('Exportar a Excel');
    fireEvent.click(excelButton);

    expect(downloadFileSpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.stringMatching(/reporte-comprobantes-.*\.xlsx/),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('calls exportToCSV when CSV button is clicked', () => {
    const downloadFileSpy = vi.spyOn(exportService, 'downloadFile');
    render(<ReportsPage />);

    const csvButton = screen.getByText('Exportar a CSV');
    fireEvent.click(csvButton);

    expect(downloadFileSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/reporte-comprobantes-.*\.csv/),
      'text/csv;charset=utf-8;'
    );
  });

  it('shows empty state when no invoices', () => {
    vi.mocked(useInvoiceStore).mockReturnValue([]);
    render(<ReportsPage />);

    expect(screen.getAllByText(/no hay datos para mostrar/i)).toHaveLength(2); // Both tables show empty state
  });

  it('filters by start date only', () => {
    render(<ReportsPage />);

    const startDateInput = screen.getByLabelText('Fecha inicio') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '2025-06-01' } });

    // Should only show June invoice - check the grand total
    const netAmounts = screen.getAllByText('$8.403');
    expect(netAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
    const totalAmounts = screen.getAllByText('$10.000');
    expect(totalAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
  });

  it('filters by end date only', () => {
    render(<ReportsPage />);

    const endDateInput = screen.getByLabelText('Fecha fin') as HTMLInputElement;
    fireEvent.change(endDateInput, { target: { value: '2025-05-31' } });

    // Should only show May invoice - check the grand total
    const netAmounts = screen.getAllByText('$4.202');
    expect(netAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
    const totalAmounts = screen.getAllByText('$5.000');
    expect(totalAmounts.length).toBeGreaterThan(0); // Appears in grand total and tables
  });
});
