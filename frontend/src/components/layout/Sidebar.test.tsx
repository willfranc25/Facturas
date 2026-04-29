import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders all navigation links', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cargar Comprobante')).toBeInTheDocument();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  it('renders brand/logo section', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText('Invoice Manager')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Comprobantes')).toBeInTheDocument();
  });

  it('renders footer', () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByText(/© 2025 Invoice Manager/i)).toBeInTheDocument();
  });

  it('renders icons for each navigation item', () => {
    const { container } = renderWithRouter(<Sidebar />);

    // Each nav link should have an SVG icon
    const navLinks = container.querySelectorAll('nav a');
    expect(navLinks.length).toBe(5);

    navLinks.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('applies correct link structure', () => {
    renderWithRouter(<Sidebar />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/');

    const uploadLink = screen.getByText('Cargar Comprobante').closest('a');
    expect(uploadLink).toHaveAttribute('href', '/upload');

    const invoicesLink = screen.getByText('Comprobantes').closest('a');
    expect(invoicesLink).toHaveAttribute('href', '/invoices');

    const reportsLink = screen.getByText('Reportes').closest('a');
    expect(reportsLink).toHaveAttribute('href', '/reports');

    const settingsLink = screen.getByText('Configuración').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });
});
