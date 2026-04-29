import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders input with label', () => {
    render(<Input label="Name" />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('renders without label', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('applies error styling when error is present', () => {
    render(<Input label="Email" error="Invalid email" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveClass('border-red-500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('supports text type by default', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('supports number type', () => {
    render(<Input label="Age" type="number" />);
    const input = screen.getByLabelText(/age/i);
    expect(input).toHaveAttribute('type', 'number');
  });

  it('supports date type', () => {
    render(<Input label="Date" type="date" />);
    const input = screen.getByLabelText(/date/i);
    expect(input).toHaveAttribute('type', 'date');
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input label="Name" onChange={handleChange} />);
    
    const input = screen.getByLabelText(/name/i);
    await user.type(input, 'John');
    
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('John');
  });

  it('can be disabled', () => {
    render(<Input label="Name" disabled />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-gray-100');
  });

  it('applies custom className', () => {
    render(<Input label="Name" className="custom-input" />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveClass('custom-input');
  });

  it('forwards additional props to input element', () => {
    render(<Input label="Name" placeholder="Enter name" maxLength={50} />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveAttribute('placeholder', 'Enter name');
    expect(input).toHaveAttribute('maxLength', '50');
  });

  it('links error message to input via aria-describedby', () => {
    render(<Input label="Email" error="Invalid email" id="email-input" />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-describedby', 'email-input-error');
  });
});
