import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateWarning } from './DuplicateWarning';
import type { Invoice } from '../../types/invoice';

const mockInvoice: Invoice = {
  id: '123',
  providerName: 'Cencosud Retail S.A.',
  providerRut: '76.354.771-9',
  documentType: 'boleta',
  documentNumber: '123456',
  date: '2025-06-15',
  category: 'Supermercado',
  items: [],
  netAmount: 8403,
  ivaAmount: 1597,
  exemptAmount: 0,
  otherTaxes: 0,
  totalAmount: 10000,
  paymentMethod: 'débito',
  status: 'pending',
  createdAt: '2025-06-15T10:00:00.000Z',
  updatedAt: '2025-06-15T10:00:00.000Z',
};

describe('DuplicateWarning', () => {
  it('renders warning message with duplicate invoice data', () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarning
        duplicate={mockInvoice}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Posible comprobante duplicado')).toBeInTheDocument();
    expect(screen.getByText(/Cencosud Retail S.A./)).toBeInTheDocument();
    expect(screen.getByText(/123456/)).toBeInTheDocument();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  it('calls onContinue when "Continuar de todas formas" is clicked', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarning
        duplicate={mockInvoice}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    const continueButton = screen.getByRole('button', {
      name: /continuar de todas formas/i,
    });
    await user.click(continueButton);

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when "Cancelar" is clicked', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarning
        duplicate={mockInvoice}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('displays formatted date in Chilean locale', () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarning
        duplicate={mockInvoice}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    // The date should be formatted as DD-MM-YYYY in Chilean locale
    const dateText = screen.getByText(/15-06-2025|15\/06\/2025/);
    expect(dateText).toBeInTheDocument();
  });

  it('has proper ARIA attributes for accessibility', () => {
    const onContinue = vi.fn();
    const onCancel = vi.fn();

    render(
      <DuplicateWarning
        duplicate={mockInvoice}
        onContinue={onContinue}
        onCancel={onCancel}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
