import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders select with label', () => {
    render(<Select label="Category" options={mockOptions} />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Category" options={mockOptions} />);
    const select = screen.getByLabelText(/category/i);
    expect(select.querySelectorAll('option')).toHaveLength(3);
  });

  it('renders placeholder option when provided', () => {
    render(
      <Select
        label="Category"
        options={mockOptions}
        placeholder="Select an option"
      />
    );
    expect(screen.getByText(/select an option/i)).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <Select label="Category" options={mockOptions} error="Required field" />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('applies error styling when error is present', () => {
    render(
      <Select label="Category" options={mockOptions} error="Required field" />
    );
    const select = screen.getByLabelText(/category/i);
    expect(select).toHaveClass('border-red-500');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles value selection', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select label="Category" options={mockOptions} onChange={handleChange} />
    );
    
    const select = screen.getByLabelText(/category/i);
    await user.selectOptions(select, 'option2');
    
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('displays selected value', () => {
    render(
      <Select label="Category" options={mockOptions} value="option2" />
    );
    const select = screen.getByLabelText(/category/i) as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('can be disabled', () => {
    render(<Select label="Category" options={mockOptions} disabled />);
    const select = screen.getByLabelText(/category/i);
    expect(select).toBeDisabled();
  });

  it('applies custom className', () => {
    render(
      <Select label="Category" options={mockOptions} className="custom-select" />
    );
    const select = screen.getByLabelText(/category/i);
    expect(select).toHaveClass('custom-select');
  });

  it('links error message to select via aria-describedby', () => {
    render(
      <Select
        label="Category"
        options={mockOptions}
        error="Required"
        id="category-select"
      />
    );
    const select = screen.getByLabelText(/category/i);
    expect(select).toHaveAttribute('aria-describedby', 'category-select-error');
  });

  it('renders without label', () => {
    render(<Select options={mockOptions} placeholder="Choose" />);
    expect(screen.getByText(/choose/i)).toBeInTheDocument();
  });
});
