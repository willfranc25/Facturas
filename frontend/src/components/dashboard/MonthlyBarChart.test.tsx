import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyBarChart } from './MonthlyBarChart';
import type { MonthlySummary } from '../../types/invoice';

describe('MonthlyBarChart', () => {
  const mockData: MonthlySummary[] = [
    {
      year: 2025,
      month: 5,
      count: 10,
      netAmount: 100000,
      ivaAmount: 19000,
      exemptAmount: 0,
      otherTaxes: 0,
      totalAmount: 119000,
    },
    {
      year: 2025,
      month: 6,
      count: 8,
      netAmount: 80000,
      ivaAmount: 15200,
      exemptAmount: 0,
      otherTaxes: 0,
      totalAmount: 95200,
    },
  ];

  it('renders chart title', () => {
    render(<MonthlyBarChart data={mockData} />);
    
    expect(screen.getByText('Gastos Mensuales (Últimos 12 Meses)')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<MonthlyBarChart data={[]} />);
    
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when data is undefined', () => {
    render(<MonthlyBarChart data={undefined as any} />);
    
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  it('renders chart with data', () => {
    render(<MonthlyBarChart data={mockData} />);
    
    // Check that the chart title is rendered
    expect(screen.getByText('Gastos Mensuales (Últimos 12 Meses)')).toBeInTheDocument();
    // Component renders without errors - Recharts rendering in test env is limited
  });
});
