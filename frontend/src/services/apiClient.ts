import axios, { AxiosError, AxiosInstance } from 'axios';
import type { Invoice, VLMHealthStatus } from '../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 120 seconds — Moondream on CPU can be slow
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      
      if (axiosError.response) {
        // Server responded with error status
        const message =
          axiosError.response.data?.message ||
          axiosError.response.data?.error ||
          `Server error: ${axiosError.response.status}`;
        throw new ApiError(message, axiosError.response.status, error);
      } else if (axiosError.request) {
        // Request made but no response received
        throw new ApiError(
          'No se pudo conectar con el servidor. Verifica tu conexión a internet. Si el servidor acaba de iniciar, puede tardar hasta 60 segundos (cold start).',
          undefined,
          error
        );
      }
    }
    
    // Unknown error
    throw new ApiError(
      error instanceof Error ? error.message : 'Error desconocido',
      undefined,
      error
    );
  }

  /**
   * Extract invoice data from an image file
   */
  async extractInvoiceData(imageFile: File): Promise<{
    success: boolean;
    data: Partial<Invoice>;
    warning?: string;
    extractionMethod?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await this.client.post<{
        success: boolean;
        data: Partial<Invoice>;
        warning?: string;
        extractionMethod?: string;
      }>('/api/invoices/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Check VLM service health status
   */
  async checkVLMHealth(): Promise<VLMHealthStatus> {
    try {
      const response = await this.client.get<VLMHealthStatus>('/api/vlm/health');
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Fetch invoices saved server-side (e.g. via Telegram bot)
   */
  async getServerInvoices(): Promise<Invoice[]> {
    try {
      const response = await this.client.get<{ success: boolean; data: Invoice[] }>('/api/storage/invoices');
      return response.data.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
