import React, { useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { apiClient } from '../services/apiClient';
import { storageService, openDB, uploadImage } from '../services/storageService';
import type { Invoice, VLMHealthStatus } from '../types/invoice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const SettingsPage: React.FC = () => {
  const [vlmHealth, setVlmHealth] = useState<VLMHealthStatus | null>(null);
  const [isCheckingVLM, setIsCheckingVLM] = useState(false);
  const [vlmError, setVlmError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{ success: number; errors: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCheckVLMHealth = async () => {
    setIsCheckingVLM(true);
    setVlmError(null);
    setVlmHealth(null);

    try {
      const health = await apiClient.checkVLMHealth();
      setVlmHealth(health);
    } catch (error) {
      setVlmError(
        error instanceof Error ? error.message : 'Error al verificar el estado del VLM'
      );
    } finally {
      setIsCheckingVLM(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setClearSuccess(false);

    try {
      await storageService.clearAllInvoices();
      setClearSuccess(true);
      setTimeout(() => {
        setShowClearModal(false);
        setClearSuccess(false);
      }, 2000);
    } catch (error) {
      alert(
        `Error al limpiar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setIsClearing(false);
    }
  };

  const exportLocalData = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);

    try {
      const db = await openDB();
      const invoices = await new Promise<unknown[]>((resolve, reject) => {
        const transaction = db.transaction('invoices', 'readonly');
        const store = transaction.objectStore('invoices');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as unknown[]);
        request.onerror = () => reject(request.error);
      });

      const json = JSON.stringify(invoices, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const today = new Date().toISOString().slice(0, 10);
      const filename = `invoices-export-${today}.json`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();

      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Error desconocido al exportar los datos'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const importFromJson = async (file: File) => {
    setIsImporting(true);
    setImportProgress(null);
    setImportSummary(null);
    setImportError(null);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
      });

      const invoices: Invoice[] = JSON.parse(text);

      if (!Array.isArray(invoices)) {
        throw new Error('El archivo JSON no contiene un arreglo de comprobantes.');
      }

      const total = invoices.length;
      let success = 0;
      let errors = 0;

      for (let i = 0; i < invoices.length; i++) {
        const invoice = { ...invoices[i] };
        setImportProgress({ current: i + 1, total });

        try {
          // If imageUrl is base64, upload to Supabase Storage first
          if (invoice.imageUrl && invoice.imageUrl.startsWith('data:')) {
            try {
              const response = await fetch(invoice.imageUrl);
              const blob = await response.blob();
              const publicUrl = await uploadImage(invoice.id, blob);
              if (publicUrl) {
                invoice.imageUrl = publicUrl;
              } else {
                invoice.imageUrl = undefined;
              }
            } catch {
              // If image upload fails, continue without image
              invoice.imageUrl = undefined;
            }
          }

          await storageService.importInvoice(invoice);
          success++;
        } catch {
          errors++;
        }
      }

      setImportSummary({ success, errors });
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : 'Error desconocido al importar los datos'
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void importFromJson(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuración</h1>

      {/* Backend URL Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Configuración del Backend
        </h2>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">URL del backend configurada:</p>
          <p className="text-lg font-mono bg-gray-100 px-4 py-2 rounded border border-gray-300">
            {API_BASE_URL}
          </p>
        </div>
      </section>

      {/* VLM Health Check Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Estado del Servicio VLM
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Verifica el estado del servicio de visión-lenguaje utilizado para
          extraer datos de las imágenes.
        </p>

        <Button
          onClick={handleCheckVLMHealth}
          loading={isCheckingVLM}
          disabled={isCheckingVLM}
        >
          Verificar Estado del VLM
        </Button>

        {/* VLM Health Status Display */}
        {vlmHealth && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">
              ✓ Servicio VLM Disponible
            </h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>
                <span className="font-medium">Modelo:</span>{' '}
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                  {vlmHealth.model ?? '—'}
                </span>
              </p>
              <p>
                <span className="font-medium">Modo:</span>{' '}
                {vlmHealth.mode === 'local' ? 'Local (Ollama)' : 'Remoto'}
              </p>
              <p>
                <span className="font-medium">Endpoint:</span>{' '}
                <span className="font-mono text-xs">{vlmHealth.endpoint}</span>
              </p>
              {vlmHealth.responseTimeMs !== undefined && (
                <p>
                  <span className="font-medium">Tiempo de respuesta:</span>{' '}
                  {vlmHealth.responseTimeMs} ms
                </p>
              )}
            </div>
          </div>
        )}

        {/* VLM Error Display */}
        {vlmError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">✗ Error de Conexión</h3>
            <p className="text-sm text-gray-700">{vlmError}</p>
          </div>
        )}
      </section>

      {/* Data Management Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Exportar Datos Locales
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Descarga todos los comprobantes almacenados en la base de datos local del navegador
          (IndexedDB) como un archivo JSON. Útil para migrar tus datos a la nube.
        </p>

        <Button
          onClick={exportLocalData}
          loading={isExporting}
          disabled={isExporting}
        >
          Exportar datos locales
        </Button>

        {exportSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              ✓ Datos exportados correctamente. Revisa tu carpeta de descargas.
            </p>
          </div>
        )}

        {exportError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">✗ Error al exportar</p>
            <p className="text-sm text-gray-700 mt-1">{exportError}</p>
          </div>
        )}
      </section>

      {/* Import Data Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Importar Datos a la Nube
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Carga un archivo JSON exportado previamente para importar los comprobantes a Supabase.
          Las imágenes en formato base64 se subirán automáticamente a Supabase Storage.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          data-testid="import-file-input"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          loading={isImporting}
          disabled={isImporting}
        >
          {isImporting ? 'Importando...' : 'Seleccionar archivo JSON'}
        </Button>

        {/* Progress indicator */}
        {isImporting && importProgress && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800">
              Importando {importProgress.current} de {importProgress.total}...
            </p>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Import summary */}
        {importSummary && (
          <div className={`mt-4 p-4 rounded-lg border ${importSummary.errors === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className="text-sm font-medium text-gray-800">
              ✓ Importación finalizada: {importSummary.success} comprobante{importSummary.success !== 1 ? 's' : ''} importado{importSummary.success !== 1 ? 's' : ''}
              {importSummary.errors > 0 && `, ${importSummary.errors} error${importSummary.errors !== 1 ? 'es' : ''}`}.
            </p>
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">✗ Error al importar</p>
            <p className="text-sm text-gray-700 mt-1">{importError}</p>
          </div>
        )}
      </section>

      {/* Clear Data Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Gestión de Datos
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Elimina todos los comprobantes almacenados en el navegador. Esta acción no se
          puede deshacer.
        </p>

        <Button variant="danger" onClick={() => setShowClearModal(true)}>
          Limpiar Todos los Datos
        </Button>
      </section>

      {/* Clear Data Confirmation Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => !isClearing && setShowClearModal(false)}
        title="Confirmar Limpieza de Datos"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowClearModal(false)}
              disabled={isClearing}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleClearData}
              loading={isClearing}
              disabled={isClearing}
            >
              Confirmar Limpieza
            </Button>
          </>
        }
      >
        {clearSuccess ? (
          <div className="text-center py-4">
            <div className="text-green-600 text-5xl mb-2">✓</div>
            <p className="text-lg font-semibold text-gray-800">
              Datos eliminados correctamente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar todos los comprobantes almacenados?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Advertencia: Esta acción no se puede deshacer
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Se eliminarán permanentemente todos los comprobantes, imágenes y datos
                asociados de la base de datos local.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
