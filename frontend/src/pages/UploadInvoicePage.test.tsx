import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { UploadInvoicePage } from './UploadInvoicePage';
import * as apiClientModule from '../services/apiClient';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock the apiClient
vi.mock('../services/apiClient', () => ({
  apiClient: {
    extractInvoiceData: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock the storageService
vi.mock('../services/storageService', () => ({
  storageService: {
    getAllInvoices: vi.fn().mockResolvedValue([]),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('UploadInvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload area with instructions', () => {
    renderWithRouter(<UploadInvoicePage />);

    expect(screen.getByText('Cargar Comprobante')).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG o WEBP hasta 10 MB/i)).toBeInTheDocument();
    expect(screen.getByText(/Instrucciones/i)).toBeInTheDocument();
  });

  it('shows error when file size exceeds limit', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UploadInvoicePage />);

    // Create a file larger than 10 MB
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/seleccionar archivo de imagen/i);

    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByText(/El archivo es demasiado grande/i)
      ).toBeInTheDocument();
    });
  });

  it('shows preview when valid file is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UploadInvoicePage />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/seleccionar archivo de imagen/i);

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('Vista previa')).toBeInTheDocument();
      expect(screen.getByText(/test\.jpg/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /procesar imagen/i })).toBeInTheDocument();
    });
  });

  it('shows processing indicator when uploading', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed API response
    vi.spyOn(apiClientModule.apiClient, 'extractInvoiceData').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: {
                  providerName: 'Test Provider',
                  totalAmount: 10000,
                },
              }),
            100
          )
        )
    );

    renderWithRouter(<UploadInvoicePage />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/seleccionar archivo de imagen/i);

    await user.upload(input, file);

    const processButton = await screen.findByRole('button', {
      name: /procesar imagen/i,
    });
    await user.click(processButton);

    expect(
      screen.getByText(/Procesando imagen y extrayendo datos/i)
    ).toBeInTheDocument();
  });

  it('allows canceling file selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UploadInvoicePage />);

    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/seleccionar archivo de imagen/i);

    await user.upload(input, file);

    const cancelButton = await screen.findByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Vista previa')).not.toBeInTheDocument();
      expect(screen.getByText(/JPEG, PNG o WEBP hasta 10 MB/i)).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    renderWithRouter(<UploadInvoicePage />);

    const dropZone = screen.getByRole('button', {
      name: /área de carga de archivos/i,
    });
    expect(dropZone).toHaveAttribute('tabIndex', '0');

    const fileInput = screen.getByLabelText(/seleccionar archivo de imagen/i);
    expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });
});
