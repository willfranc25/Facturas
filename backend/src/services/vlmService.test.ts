import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios before importing the service
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock ocrEngine and invoiceParser for fallback tests
vi.mock('./ocrEngine', () => ({
  ocrEngine: {
    ocrImage: vi.fn().mockResolvedValue('TOTAL: 10.000\nFECHA: 01/06/2025'),
  },
}));

vi.mock('./invoiceParser', () => ({
  parseInvoiceText: vi.fn().mockReturnValue({ totalAmount: 10000, date: '2025-06-01' }),
}));

import { VLMService } from './vlmService';

describe('VLMService.extractInvoiceData', () => {
  let service: VLMService;

  beforeEach(() => {
    service = new VLMService();
    vi.clearAllMocks();
  });

  it('retorna Partial<Invoice> cuando Ollama responde con JSON válido', async () => {
    const mockData = {
      providerName: 'Cencosud S.A.',
      providerRut: '76.354.771-9',
      documentType: 'boleta',
      totalAmount: 10000,
      date: '2025-06-01',
    };

    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { response: JSON.stringify(mockData) },
    });

    const result = await service.extractInvoiceData(Buffer.from('fake-image'));

    expect(result).toMatchObject(mockData);
  });

  it('activa fallback y retorna Partial<Invoice> cuando Ollama falla con error de red', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('Network Error'));

    const result = await service.extractInvoiceData(Buffer.from('fake-image'));

    // Fallback returns what parseInvoiceText returns
    expect(result).toMatchObject({ totalAmount: 10000, date: '2025-06-01' });
  });

  it('activa fallback cuando la respuesta de Ollama no es JSON válido', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { response: 'Lo siento, no puedo procesar esta imagen.' },
    });

    const result = await service.extractInvoiceData(Buffer.from('fake-image'));

    // Fallback returns what parseInvoiceText returns
    expect(result).toMatchObject({ totalAmount: 10000, date: '2025-06-01' });
  });

  it('nunca lanza excepción con cualquier input', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('Unexpected crash'));

    const inputs = [
      Buffer.alloc(0),
      Buffer.from(''),
      Buffer.from('not-an-image'),
      Buffer.alloc(1024 * 1024), // 1 MB de ceros
    ];

    for (const input of inputs) {
      await expect(service.extractInvoiceData(input)).resolves.toBeDefined();
    }
  });
});
