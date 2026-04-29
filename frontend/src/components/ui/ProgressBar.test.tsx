import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders progress bar', () => {
    render(<ProgressBar />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('has default aria-label when no label provided', () => {
    render(<ProgressBar />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Cargando');
  });

  it('displays custom label text', () => {
    render(<ProgressBar label="Procesando imagen..." />);
    expect(screen.getByText('Procesando imagen...')).toBeInTheDocument();
  });

  it('uses custom label for aria-label', () => {
    render(<ProgressBar label="Uploading file" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-label', 'Uploading file');
  });

  it('applies custom className', () => {
    render(<ProgressBar className="my-4" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('my-4');
  });

  it('renders animation styles', () => {
    const { container } = render(<ProgressBar />);
    const style = container.querySelector('style');
    expect(style).toBeInTheDocument();
    expect(style?.textContent).toContain('@keyframes progress');
  });

  it('renders without label text', () => {
    render(<ProgressBar />);
    expect(screen.queryByText(/procesando/i)).not.toBeInTheDocument();
  });
});
