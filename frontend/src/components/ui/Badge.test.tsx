import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders pending status with yellow styling', () => {
    render(<Badge status="pending" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Pendiente');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-200');
  });

  it('renders reviewed status with blue styling', () => {
    render(<Badge status="reviewed" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Revisado');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800', 'border-blue-200');
  });

  it('renders approved status with green styling', () => {
    render(<Badge status="approved" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Aprobado');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-200');
  });

  it('has proper aria-label for accessibility', () => {
    render(<Badge status="pending" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Estado: Pendiente');
  });

  it('applies custom className', () => {
    render(<Badge status="approved" className="custom-badge" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('custom-badge');
  });

  it('maintains base styling with custom className', () => {
    render(<Badge status="reviewed" className="ml-2" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('ml-2', 'bg-blue-100', 'text-blue-800');
  });
});
