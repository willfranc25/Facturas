import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiError } from '../services/apiClient';
import { ProgressBar } from '../components/ui/ProgressBar';
import { DuplicateWarning } from '../components/invoices/DuplicateWarning';
import type { Invoice } from '../types/invoice';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const UploadInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateInvoice, setDuplicateInvoice] = useState<Invoice | null>(null);
  const [extractedData, setExtractedData] = useState<Partial<Invoice> | null>(null);

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato de archivo no válido. Solo se permiten imágenes JPEG, PNG y WEBP.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo es demasiado grande. El tamaño máximo es 10 MB.';
    }
    return null;
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setDuplicateInvoice(null);
    setExtractedData(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Check for duplicates
  const checkForDuplicates = async (data: Partial<Invoice>): Promise<Invoice | null> => {
    // Import storageService dynamically to avoid circular dependencies
    const { storageService } = await import('../services/storageService');
    
    if (!data.providerName || !data.documentNumber || data.totalAmount === undefined) {
      return null;
    }

    const allInvoices = await storageService.getAllInvoices();
    const duplicate = allInvoices.find(
      (inv) =>
        inv.providerName === data.providerName &&
        inv.documentNumber === data.documentNumber &&
        inv.totalAmount === data.totalAmount
    );

    return duplicate || null;
  };

  // Handle upload and extraction
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Call API to extract invoice data
      const response = await apiClient.extractInvoiceData(selectedFile);

      if (!response.success) {
        throw new Error('Error al extraer datos del comprobante');
      }

      // Check for duplicates
      const duplicate = await checkForDuplicates(response.data);
      
      if (duplicate) {
        setDuplicateInvoice(duplicate);
        setExtractedData(response.data);
        setIsProcessing(false);
        return;
      }

      // Navigate to form with extracted data
      await navigateToForm(response.data);
    } catch (err) {
      setIsProcessing(false);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al procesar la imagen. Por favor, intenta nuevamente.');
      }
      console.error('Error extracting invoice data:', err);
    }
  };

  // Navigate to invoice form with pre-filled data
  const navigateToForm = async (data: Partial<Invoice>) => {
    // Convert blob URL to base64 so it survives navigation (blob URLs are revoked on unmount)
    let imageData: string | null = null;
    if (selectedFile) {
      imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      });
    }

    const formData = {
      ...data,
      imageUrl: imageData,
    };
    sessionStorage.setItem('invoiceFormData', JSON.stringify(formData));
    navigate('/invoices/new');
  };

  // Handle duplicate warning actions
  const handleContinueAnyway = async () => {
    if (extractedData) {
      await navigateToForm(extractedData);
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateInvoice(null);
    setExtractedData(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle click on drop zone
  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  // Clean up preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Cargar Comprobante</h1>

      {/* Error message */}
      {error && (
        <div
          className="bg-red-50 border-l-4 border-red-400 p-4 mb-6"
          role="alert"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate warning */}
      {duplicateInvoice && (
        <DuplicateWarning
          duplicate={duplicateInvoice}
          onContinue={handleContinueAnyway}
          onCancel={handleCancelDuplicate}
        />
      )}

      {/* Upload area */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {!selectedFile ? (
          <>
            {/* Drop zone */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors duration-200
                ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }
              `}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleDropZoneClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleDropZoneClick();
                }
              }}
              aria-label="Área de carga de archivos"
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                <span className="font-semibold text-blue-600">
                  Haz clic para seleccionar
                </span>{' '}
                o arrastra una imagen aquí
              </p>
              <p className="mt-2 text-xs text-gray-500">
                JPEG, PNG o WEBP hasta 10 MB
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Seleccionar archivo de imagen"
            />
          </>
        ) : (
          <>
            {/* Preview and actions */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Vista previa
              </h2>

              {/* Image preview */}
              {previewUrl && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={previewUrl}
                    alt="Vista previa del comprobante"
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  />
                </div>
              )}

              {/* File info */}
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Archivo:</strong> {selectedFile.name}
                </p>
                <p>
                  <strong>Tamaño:</strong>{' '}
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <ProgressBar label="Procesando imagen y extrayendo datos..." />
              )}

              {/* Action buttons */}
              {!isProcessing && (
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Procesar imagen
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setError(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Instrucciones
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Asegúrate de que la imagen sea clara y legible</li>
          <li>El comprobante debe estar completo y sin cortes</li>
          <li>Evita reflejos o sombras que dificulten la lectura</li>
          <li>
            Después de procesar, podrás revisar y corregir los datos extraídos
          </li>
        </ul>
      </div>
    </div>
  );
};
