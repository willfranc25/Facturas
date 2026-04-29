import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
  };

  it('renders children content', () => {
    renderWithRouter(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders sidebar for desktop', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Sidebar should be in the document (hidden on mobile via CSS)
    const invoiceManagerTexts = screen.getAllByText('Invoice Manager');
    expect(invoiceManagerTexts.length).toBeGreaterThan(0);
    expect(screen.getByText('Gestión de Comprobantes')).toBeInTheDocument();
  });

  it('renders mobile header', () => {
    renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Mobile header should be present (visible on mobile via CSS)
    const hamburgerButtons = screen.getAllByLabelText(/menú/i);
    expect(hamburgerButtons.length).toBeGreaterThan(0);
  });

  it('applies correct layout classes', () => {
    const { container } = renderWithRouter(
      <AppLayout>
        <div>Content</div>
      </AppLayout>
    );

    // Check for main layout structure
    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('p-4', 'md:p-6', 'lg:p-8');
  });
});
