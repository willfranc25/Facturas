import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useInvoiceStore } from '../store/invoiceStore';
import type { Invoice } from '../types/invoice';

// Mock the store
vi.mock('../store/invoiceStore');

// Mock the chart components to avoid Recharts rendering issues in tests
vi.mock('../components/dashboard/CategoryPieChart', () => ({
  CategoryPieChart: ({ data }: any) => (
    <div data-testid="category-pie-chart">
      CategoryPieChart with {data?.length || 0} categories
    </div>
  ),
}));

vi.mock('../components/dashboard/MonthlyBarChart', () => ({
  MonthlyBarChart: ({ data }: any) => (
    <div data-testid="monthly-bar-chart">
      MonthlyBarChart with {data?.length || 0} months
    </div>
  ),
}));

const mockInvoice: Invoice = {
  id: 'test-001',
  providerName: 'Test Provider',
  providerRut: '76.354.771-9',
  documentType: 'boleta',
  documentNumber: '123456',
  date: '2025-06-15',
  time: '14:30',
  category: 'Supermercado',
  items: [],
  netAmount: 8403,
  ivaAmount: 1597,
  exemptAmount: 0,
  otherTaxes: 0,
  totalAmount: 10000,
  paymentMethod: 'débito',
  status: 'approved',
  createdAt: '2025-06-15T14:30:00.000Z',
  updatedAt: '2025-06-15T14:30:00.000Z',
};

describe('DashboardPage', () => {
  const mockLoadInvoices = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [],
      loadInvoices: mockLoadInvoices,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('calls loadInvoices on mount', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(mockLoadInvoices).toHaveBeenCalledTimes(1);
  });

  it('renders dashboard title and description', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [mockInvoice],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Resumen de gastos y métricas')).toBeInTheDocument();
  });

  it('renders metric cards with correct titles', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [mockInvoice],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Total Gastado')).toBeInTheDocument();
    expect(screen.getByText('Total Neto')).toBeInTheDocument();
    expect(screen.getByText('Total IVA')).toBeInTheDocument();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
  });

  it('renders charts', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [mockInvoice],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('category-pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('monthly-bar-chart')).toBeInTheDocument();
  });

  it('renders recent invoices table', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [mockInvoice],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Últimos comprobantes')).toBeInTheDocument();
    expect(screen.getAllByText('Test Provider').length).toBeGreaterThan(0);
  });

  it('shows sample data notice when no invoices exist', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(
      screen.getByText(/No hay comprobantes aún/i)
    ).toBeInTheDocument();
  });

  it('does not show sample data notice when invoices exist', () => {
    (useInvoiceStore as any).mockReturnValue({
      invoices: [mockInvoice],
      loadInvoices: mockLoadInvoices,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(
      screen.queryByText(/No hay comprobantes aún/i)
    ).not.toBeInTheDocument();
  });
});
