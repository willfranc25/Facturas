import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryPieChart } from './CategoryPieChart';
import type { CategorySummary } from '../../types/invoice';

describe('CategoryPieChart', () => {
  const mockData: CategorySummary[] = [
    {
      category: 'Supermercado',
      count: 5,
      netAmount: 50000,
      ivaAmount: 9500,
      totalAmount: 59500,
    },
    {
      category: 'Combustible',
      count: 3,
      netAmount: 30000,
      ivaAmount: 5700,
      totalAmount: 35700,
    },
  ];

  it('renders chart title', () => {
    render(<CategoryPieChart data={mockData} />);
    
    expect(screen.getByText('Gastos por Categoría')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<CategoryPieChart data={[]} />);
    
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  it('renders empty state when data is undefined', () => {
    render(<CategoryPieChart data={undefined as any} />);
    
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  it('renders chart with data', () => {
    render(<CategoryPieChart data={mockData} />);
    
    // Check that the chart title is rendered
    expect(screen.getByText('Gastos por Categoría')).toBeInTheDocument();
    // Component renders without errors - Recharts rendering in test env is limited
  });
});
