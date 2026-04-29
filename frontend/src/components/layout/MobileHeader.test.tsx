import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MobileHeader } from './MobileHeader';

describe('MobileHeader', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  const defaultProps = {
    isMenuOpen: false,
    onToggleMenu: vi.fn(),
    onCloseMenu: vi.fn(),
  };

  it('renders header with brand name', () => {
    renderWithRouter(<MobileHeader {...defaultProps} />);

    expect(screen.getByText('Invoice Manager')).toBeInTheDocument();
  });

  it('renders hamburger button when menu is closed', () => {
    renderWithRouter(<MobileHeader {...defaultProps} />);

    const button = screen.getByLabelText('Abrir menú');
    expect(button).toBeInTheDocument();
  });

  it('renders close button when menu is open', () => {
    renderWithRouter(<MobileHeader {...defaultProps} isMenuOpen={true} />);

    const button = screen.getByLabelText('Cerrar menú');
    expect(button).toBeInTheDocument();
  });

  it('calls onToggleMenu when hamburger button is clicked', () => {
    const onToggleMenu = vi.fn();
    renderWithRouter(
      <MobileHeader {...defaultProps} onToggleMenu={onToggleMenu} />
    );

    const button = screen.getByLabelText('Abrir menú');
    fireEvent.click(button);

    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('does not render navigation drawer when menu is closed', () => {
    renderWithRouter(<MobileHeader {...defaultProps} isMenuOpen={false} />);

    // Navigation links should not be visible
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders navigation drawer when menu is open', () => {
    renderWithRouter(<MobileHeader {...defaultProps} isMenuOpen={true} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Cargar Comprobante')).toBeInTheDocument();
    expect(screen.getByText('Comprobantes')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  it('calls onCloseMenu when backdrop is clicked', () => {
    const onCloseMenu = vi.fn();
    const { container } = renderWithRouter(
      <MobileHeader {...defaultProps} isMenuOpen={true} onCloseMenu={onCloseMenu} />
    );

    // Find the backdrop by its specific class
    const backdrop = container.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    expect(backdrop).toBeInTheDocument();
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCloseMenu).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onCloseMenu when a navigation link is clicked', () => {
    const onCloseMenu = vi.fn();
    renderWithRouter(
      <MobileHeader {...defaultProps} isMenuOpen={true} onCloseMenu={onCloseMenu} />
    );

    const dashboardLink = screen.getByText('Dashboard');
    fireEvent.click(dashboardLink);

    expect(onCloseMenu).toHaveBeenCalledTimes(1);
  });

  it('renders all navigation links with correct hrefs', () => {
    renderWithRouter(<MobileHeader {...defaultProps} isMenuOpen={true} />);

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

  it('renders icons for each navigation item', () => {
    const { container } = renderWithRouter(
      <MobileHeader {...defaultProps} isMenuOpen={true} />
    );

    const navLinks = container.querySelectorAll('nav a');
    expect(navLinks.length).toBe(5);

    navLinks.forEach((link) => {
      const svg = link.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('renders footer in drawer', () => {
    renderWithRouter(<MobileHeader {...defaultProps} isMenuOpen={true} />);

    expect(screen.getByText(/© 2025 Invoice Manager/i)).toBeInTheDocument();
  });
});
