import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryTable } from './CategoryTable';
import type { CategorySummary } from '../../types/invoice';

describe('CategoryTable', () => {
  it('renders empty state when no summaries provided', () => {
    render(<CategoryTable summaries={[]} />);
    expect(screen.getByText(/no hay datos para mostrar/i)).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    const summaries: CategorySummary[] = [
      {
        category: 'Supermercado',
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        totalAmount: 11900,
      },
    ];

    render(<CategoryTable summaries={summaries} />);

    expect(screen.getByText('Categoría')).toBeInTheDocument();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
    expect(screen.getByText('Neto')).toBeInTheDocument();
    expect(screen.getByText('IVA')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders category summary data correctly', () => {
    const summaries: CategorySummary[] = [
      {
        category: 'Supermercado',
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        totalAmount: 11900,
      },
    ];

    render(<CategoryTable summaries={summaries} />);

    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$10.000')).toBeInTheDocument();
    expect(screen.getByText('$1.900')).toBeInTheDocument();
    expect(screen.getByText('$11.900')).toBeInTheDocument();
  });

  it('renders multiple category summaries', () => {
    const summaries: CategorySummary[] = [
      {
        category: 'Supermercado',
        count: 5,
        netAmount: 10000,
        ivaAmount: 1900,
        totalAmount: 11900,
      },
      {
        category: 'Combustible',
        count: 3,
        netAmount: 5000,
        ivaAmount: 950,
        totalAmount: 5950,
      },
    ];

    render(<CategoryTable summaries={summaries} />);

    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Combustible')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    const summaries: CategorySummary[] = [
      {
        category: 'Equipamiento',
        count: 1,
        netAmount: 1234567,
        ivaAmount: 234567,
        totalAmount: 1469134,
      },
    ];

    render(<CategoryTable summaries={summaries} />);

    expect(screen.getByText('$1.234.567')).toBeInTheDocument();
    expect(screen.getByText('$234.567')).toBeInTheDocument();
    expect(screen.getByText('$1.469.134')).toBeInTheDocument();
  });

  it('displays all category types correctly', () => {
    const summaries: CategorySummary[] = [
      {
        category: 'Supermercado',
        count: 1,
        netAmount: 1000,
        ivaAmount: 190,
        totalAmount: 1190,
      },
      {
        category: 'Combustible',
        count: 1,
        netAmount: 1000,
        ivaAmount: 190,
        totalAmount: 1190,
      },
      {
        category: 'Transporte',
        count: 1,
        netAmount: 1000,
        ivaAmount: 190,
        totalAmount: 1190,
      },
    ];

    render(<CategoryTable summaries={summaries} />);

    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Combustible')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });
});
