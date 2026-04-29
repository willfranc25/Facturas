import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Total Gastado" value="$ 100.000" />);
    
    expect(screen.getByText('Total Gastado')).toBeInTheDocument();
    expect(screen.getByText('$ 100.000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <MetricCard
        title="Total Gastado"
        value="$ 100.000"
        subtitle="Mes actual"
      />
    );
    
    expect(screen.getByText('Mes actual')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const icon = <svg data-testid="test-icon" />;
    render(<MetricCard title="Total" value="100" icon={icon} />);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    render(<MetricCard title="Total" value="100" trend="up" />);
    
    expect(screen.getByText('Aumento')).toBeInTheDocument();
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('renders down trend correctly', () => {
    render(<MetricCard title="Total" value="100" trend="down" />);
    
    expect(screen.getByText('Disminución')).toBeInTheDocument();
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('renders neutral trend correctly', () => {
    render(<MetricCard title="Total" value="100" trend="neutral" />);
    
    expect(screen.getByText('Sin cambios')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('accepts numeric value', () => {
    render(<MetricCard title="Count" value={42} />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders without optional props', () => {
    render(<MetricCard title="Simple Card" value="Value" />);
    
    expect(screen.getByText('Simple Card')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });
});
