import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyTable } from './MonthlyTable';
import type { MonthlySummary } from '../../types/invoice';

describe('MonthlyTable', () => {
  it('renders empty state when no summaries provided', () => {
    render(<MonthlyTable summaries={[]} />);
    expect(screen.getByText(/no hay datos para mostrar/i)).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    const summaries: MonthlySummary[] = [
      {
        year: 2025,
        month: 6,
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        exemptAmount: 0,
        otherTaxes: 0,
        totalAmount: 11900,
      },
    ];

    render(<MonthlyTable summaries={summaries} />);

    expect(screen.getByText('Período')).toBeInTheDocument();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
    expect(screen.getByText('Neto')).toBeInTheDocument();
    expect(screen.getByText('IVA')).toBeInTheDocument();
    expect(screen.getByText('Exento')).toBeInTheDocument();
    expect(screen.getByText('Otros Impuestos')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders monthly summary data correctly', () => {
    const summaries: MonthlySummary[] = [
      {
        year: 2025,
        month: 6,
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        exemptAmount: 500,
        otherTaxes: 100,
        totalAmount: 12500,
      },
    ];

    render(<MonthlyTable summaries={summaries} />);

    expect(screen.getByText('Junio 2025')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$10.000')).toBeInTheDocument();
    expect(screen.getByText('$1.900')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$12.500')).toBeInTheDocument();
  });

  it('renders multiple monthly summaries', () => {
    const summaries: MonthlySummary[] = [
      {
        year: 2025,
        month: 5,
        count: 3,
        netAmount: 5000,
        ivaAmount: 950,
        exemptAmount: 0,
        otherTaxes: 0,
        totalAmount: 5950,
      },
      {
        year: 2025,
        month: 6,
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        exemptAmount: 0,
        otherTaxes: 0,
        totalAmount: 11900,
      },
    ];

    render(<MonthlyTable summaries={summaries} />);

    expect(screen.getByText('Mayo 2025')).toBeInTheDocument();
    expect(screen.getByText('Junio 2025')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    const summaries: MonthlySummary[] = [
      {
        year: 2025,
        month: 1,
        count: 1,
        netAmount: 1234567,
        ivaAmount: 234567,
        exemptAmount: 0,
        otherTaxes: 0,
        totalAmount: 1469134,
      },
    ];

    render(<MonthlyTable summaries={summaries} />);

    expect(screen.getByText('$1.234.567')).toBeInTheDocument();
    expect(screen.getByText('$234.567')).toBeInTheDocument();
    expect(screen.getByText('$1.469.134')).toBeInTheDocument();
  });
});
