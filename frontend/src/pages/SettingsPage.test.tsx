import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { apiClient } from '../services/apiClient';
import { storageService, openDB, uploadImage } from '../services/storageService';
import type { VLMHealthStatus } from '../types/invoice';

vi.mock('../services/apiClient');
vi.mock('../services/storageService');

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings page with all sections', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Configuración del Backend')).toBeInTheDocument();
    expect(screen.getByText('Estado del Servicio VLM')).toBeInTheDocument();
    expect(screen.getByText('Gestión de Datos')).toBeInTheDocument();
  });

  it('displays the backend URL', () => {
    render(<SettingsPage />);

    // Should display the default URL or the one from env
    const urlElement = screen.getByText(/http:\/\/localhost:3001/);
    expect(urlElement).toBeInTheDocument();
  });

  it('checks VLM health and displays success status', async () => {
    const mockHealth: VLMHealthStatus = {
      available: true,
      mode: 'local',
      endpoint: 'http://localhost:11434',
      responseTimeMs: 45,
    };

    vi.mocked(apiClient.checkVLMHealth).mockResolvedValue(mockHealth);

    render(<SettingsPage />);

    const checkButton = screen.getByRole('button', { name: /Verificar Estado del VLM/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('✓ Servicio VLM Disponible')).toBeInTheDocument();
    });

    expect(screen.getByText('Local (Ollama)')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:11434')).toBeInTheDocument();
    expect(screen.getByText('45 ms')).toBeInTheDocument();
  });

  it('checks VLM health and displays remote mode', async () => {
    const mockHealth: VLMHealthStatus = {
      available: true,
      mode: 'remote',
      endpoint: 'https://api.example.com/vlm',
      responseTimeMs: 120,
    };

    vi.mocked(apiClient.checkVLMHealth).mockResolvedValue(mockHealth);

    render(<SettingsPage />);

    const checkButton = screen.getByRole('button', { name: /Verificar Estado del VLM/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('Remoto')).toBeInTheDocument();
    });

    expect(screen.getByText('https://api.example.com/vlm')).toBeInTheDocument();
  });

  it('displays error when VLM health check fails', async () => {
    const errorMessage = 'No se pudo conectar con el servidor';
    vi.mocked(apiClient.checkVLMHealth).mockRejectedValue(new Error(errorMessage));

    render(<SettingsPage />);

    const checkButton = screen.getByRole('button', { name: /Verificar Estado del VLM/i });
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('✗ Error de Conexión')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('opens confirmation modal when clicking clear data button', () => {
    render(<SettingsPage />);

    const clearButton = screen.getByRole('button', { name: /Limpiar Todos los Datos/i });
    fireEvent.click(clearButton);

    expect(screen.getByText('Confirmar Limpieza de Datos')).toBeInTheDocument();
    expect(
      screen.getByText(/¿Estás seguro de que deseas eliminar todos los comprobantes/)
    ).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Advertencia: Esta acción no se puede deshacer/)).toBeInTheDocument();
  });

  it('clears all data when confirmed', async () => {
    vi.mocked(storageService.clearAllInvoices).mockResolvedValue();

    render(<SettingsPage />);

    // Open modal
    const clearButton = screen.getByRole('button', { name: /Limpiar Todos los Datos/i });
    fireEvent.click(clearButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Confirmar Limpieza/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(storageService.clearAllInvoices).toHaveBeenCalledTimes(1);
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Datos eliminados correctamente')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking cancel', () => {
    render(<SettingsPage />);

    // Open modal
    const clearButton = screen.getByRole('button', { name: /Limpiar Todos los Datos/i });
    fireEvent.click(clearButton);

    expect(screen.getByText('Confirmar Limpieza de Datos')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    // Modal should be closed
    expect(screen.queryByText('Confirmar Limpieza de Datos')).not.toBeInTheDocument();
  });

  it('displays alert when clearing data fails', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const errorMessage = 'Failed to clear database';
    vi.mocked(storageService.clearAllInvoices).mockRejectedValue(new Error(errorMessage));

    render(<SettingsPage />);

    // Open modal
    const clearButton = screen.getByRole('button', { name: /Limpiar Todos los Datos/i });
    fireEvent.click(clearButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Confirmar Limpieza/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage)
      );
    });

    alertSpy.mockRestore();
  });

  it('disables buttons while VLM check is in progress', async () => {
    vi.mocked(apiClient.checkVLMHealth).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SettingsPage />);

    const checkButton = screen.getByRole('button', { name: /Verificar Estado del VLM/i });
    fireEvent.click(checkButton);

    // Button should be disabled while loading
    expect(checkButton).toBeDisabled();
  });

  it('disables buttons while clearing data', async () => {
    vi.mocked(storageService.clearAllInvoices).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SettingsPage />);

    // Open modal
    const clearButton = screen.getByRole('button', { name: /Limpiar Todos los Datos/i });
    fireEvent.click(clearButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Confirmar Limpieza/i });
    fireEvent.click(confirmButton);

    // Buttons should be disabled while clearing
    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeDisabled();
    });
  });
});

describe('SettingsPage – export local data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the export section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Exportar Datos Locales')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar datos locales/i })).toBeInTheDocument();
  });

  it('exports data and shows success message', async () => {
    const mockInvoices = [{ id: '1', providerName: 'Test' }];

    const mockGetAll = {
      result: mockInvoices,
      onsuccess: null as ((e: Event) => void) | null,
      onerror: null as ((e: Event) => void) | null,
    };
    const mockStore = {
      getAll: () => {
        setTimeout(() => mockGetAll.onsuccess?.({} as Event), 0);
        return mockGetAll;
      },
    };
    const mockTransaction = { objectStore: () => mockStore };
    const mockDb = { transaction: () => mockTransaction };

    vi.mocked(openDB).mockResolvedValue(mockDb as unknown as IDBDatabase);

    // URL.createObjectURL is not available in jsdom — assign directly
    const mockUrl = 'blob:mock-url';
    URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
    URL.revokeObjectURL = vi.fn();

    const mockAnchorClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: mockAnchorClick } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });

    render(<SettingsPage />);

    const exportButton = screen.getByRole('button', { name: /Exportar datos locales/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/Datos exportados correctamente/i)).toBeInTheDocument();
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchorClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);

    createElementSpy.mockRestore();
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
  });

  it('shows error message when export fails', async () => {
    vi.mocked(openDB).mockRejectedValue(new Error('IndexedDB not available'));

    render(<SettingsPage />);

    const exportButton = screen.getByRole('button', { name: /Exportar datos locales/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('✗ Error al exportar')).toBeInTheDocument();
      expect(screen.getByText('IndexedDB not available')).toBeInTheDocument();
    });
  });

  it('disables export button while exporting', async () => {
    vi.mocked(openDB).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<SettingsPage />);

    const exportButton = screen.getByRole('button', { name: /Exportar datos locales/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportButton).toBeDisabled();
    });
  });

  it('uses correct filename format with today\'s date', async () => {
    const mockInvoices = [{ id: '1' }];
    const mockGetAll = {
      result: mockInvoices,
      onsuccess: null as ((e: Event) => void) | null,
      onerror: null as ((e: Event) => void) | null,
    };
    const mockStore = {
      getAll: () => {
        setTimeout(() => mockGetAll.onsuccess?.({} as Event), 0);
        return mockGetAll;
      },
    };
    const mockTransaction = { objectStore: () => mockStore };
    const mockDb = { transaction: () => mockTransaction };

    vi.mocked(openDB).mockResolvedValue(mockDb as unknown as IDBDatabase);

    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
    URL.revokeObjectURL = vi.fn();

    let capturedDownload = '';
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = { href: '', click: vi.fn() } as unknown as HTMLAnchorElement;
        Object.defineProperty(anchor, 'download', {
          set(v: string) { capturedDownload = v; },
          get() { return capturedDownload; },
        });
        return anchor;
      }
      return originalCreateElement(tag);
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar datos locales/i }));

    await waitFor(() => {
      expect(screen.getByText(/Datos exportados correctamente/i)).toBeInTheDocument();
    });

    const today = new Date().toISOString().slice(0, 10);
    expect(capturedDownload).toBe(`invoices-export-${today}.json`);

    createElementSpy.mockRestore();
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
  });
});

describe('SettingsPage – import JSON to Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the import section', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Importar Datos a la Nube')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seleccionar archivo JSON/i })).toBeInTheDocument();
  });

  it('imports invoices from a JSON file and shows success summary', async () => {
    vi.mocked(storageService.importInvoice).mockResolvedValue();

    const invoices = [
      { id: 'inv-1', providerName: 'Proveedor A', imageUrl: undefined },
      { id: 'inv-2', providerName: 'Proveedor B', imageUrl: undefined },
    ];

    const file = new File([JSON.stringify(invoices)], 'invoices.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Importación finalizada/i)).toBeInTheDocument();
    });

    expect(storageService.importInvoice).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/2 comprobantes importados/i)).toBeInTheDocument();
    // uploadImage should NOT have been called since no base64 images
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('uploads base64 images to Supabase Storage during import', async () => {
    vi.mocked(storageService.importInvoice).mockResolvedValue();
    vi.mocked(uploadImage).mockResolvedValue('https://supabase.example.com/invoice-images/inv-1.jpg');

    // Mock fetch for base64 data URL
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
    } as Response);

    const invoices = [
      { id: 'inv-1', providerName: 'Proveedor A', imageUrl: 'data:image/jpeg;base64,/9j/abc123' },
    ];

    const file = new File([JSON.stringify(invoices)], 'invoices.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Importación finalizada/i)).toBeInTheDocument();
    });

    expect(uploadImage).toHaveBeenCalledWith('inv-1', expect.any(Blob));
    expect(storageService.importInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'https://supabase.example.com/invoice-images/inv-1.jpg' })
    );
  });

  it('counts errors when importInvoice fails for some invoices', async () => {
    vi.mocked(storageService.importInvoice)
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce();

    const invoices = [
      { id: 'inv-1', providerName: 'A' },
      { id: 'inv-2', providerName: 'B' },
      { id: 'inv-3', providerName: 'C' },
    ];

    const file = new File([JSON.stringify(invoices)], 'invoices.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Importación finalizada/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/2 comprobantes importados/i)).toBeInTheDocument();
    expect(screen.getByText(/1 error/i)).toBeInTheDocument();
  });

  it('shows error when JSON file is invalid', async () => {
    const file = new File(['not valid json {{{'], 'bad.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('✗ Error al importar')).toBeInTheDocument();
    });
  });

  it('shows error when JSON is not an array', async () => {
    const file = new File([JSON.stringify({ id: 'inv-1' })], 'bad.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('✗ Error al importar')).toBeInTheDocument();
      expect(screen.getByText(/no contiene un arreglo/i)).toBeInTheDocument();
    });
  });

  it('disables the import button while importing', async () => {
    vi.mocked(storageService.importInvoice).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    const invoices = [{ id: 'inv-1', providerName: 'A' }];
    const file = new File([JSON.stringify(invoices)], 'invoices.json', { type: 'application/json' });

    render(<SettingsPage />);

    const input = screen.getByTestId('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Seleccionar archivo JSON|Importando/i });
      expect(btn).toBeDisabled();
    });
  });
});
