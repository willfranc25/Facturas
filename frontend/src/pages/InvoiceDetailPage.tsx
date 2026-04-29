import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoiceStore } from '../store/invoiceStore';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRutDisplay,
  getDocumentTypeLabel,
} from '../utils/formatters';
import type { Invoice } from '../types/invoice';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { invoices, updateInvoice } = useInvoiceStore();

  // Load invoice data
  useEffect(() => {
    if (id) {
      const foundInvoice = invoices.find((inv) => inv.id === id);
      setInvoice(foundInvoice || null);
    }
  }, [id, invoices]);

  // Handle status change to approved
  const handleApprove = async () => {
    if (!invoice) return;

    setIsUpdating(true);
    try {
      await updateInvoice(invoice.id, { status: 'approved' });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle navigation to edit mode
  const handleEdit = () => {
    if (invoice) {
      navigate(`/invoices/${invoice.id}/edit`);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/invoices');
  };

  if (!invoice) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">
            {id ? 'Comprobante no encontrado' : 'ID de comprobante no especificado'}
          </p>
          <Button variant="secondary" onClick={handleBack} className="mt-4">
            Volver a Comprobantes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Detalle de Comprobante
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {getDocumentTypeLabel(invoice.documentType)} N° {invoice.documentNumber || 'S/N'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleBack}>
            Volver
          </Button>
          <Button variant="secondary" onClick={handleEdit}>
            Editar
          </Button>
          {invoice.status !== 'approved' && (
            <Button
              variant="primary"
              onClick={handleApprove}
              loading={isUpdating}
              disabled={isUpdating}
            >
              Aprobar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Invoice details */}
        <div className="space-y-6">
          {/* Status and dates card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Estado</h2>
              <Badge status={invoice.status} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Creado:</span>
                <span className="text-gray-900 font-medium">
                  {formatDateTime(invoice.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actualizado:</span>
                <span className="text-gray-900 font-medium">
                  {formatDateTime(invoice.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Provider information card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Información del Proveedor
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Nombre</label>
                <p className="text-base font-medium text-gray-900">
                  {invoice.providerName || 'No especificado'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">RUT</label>
                <p className="text-base font-medium text-gray-900">
                  {invoice.providerRut ? formatRutDisplay(invoice.providerRut) : 'No especificado'}
                </p>
              </div>
            </div>
          </div>

          {/* Document information card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Información del Documento
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Tipo de Documento</label>
                <p className="text-base font-medium text-gray-900">
                  {getDocumentTypeLabel(invoice.documentType)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Número de Documento</label>
                <p className="text-base font-medium text-gray-900">
                  {invoice.documentNumber || 'No especificado'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Fecha</label>
                <p className="text-base font-medium text-gray-900">
                  {formatDate(invoice.date)}
                  {invoice.time && ` - ${invoice.time}`}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Categoría</label>
                <p className="text-base font-medium text-gray-900">{invoice.category}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Método de Pago</label>
                <p className="text-base font-medium text-gray-900 capitalize">
                  {invoice.paymentMethod}
                </p>
              </div>
            </div>
          </div>

          {/* Amounts card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Montos</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monto Neto:</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(invoice.netAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IVA (19%):</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(invoice.ivaAmount)}
                </span>
              </div>
              {invoice.exemptAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto Exento:</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(invoice.exemptAmount)}
                  </span>
                </div>
              )}
              {invoice.otherTaxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Otros Impuestos:</span>
                  <span className="text-gray-900 font-medium">
                    {formatCurrency(invoice.otherTaxes)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-gray-900 font-semibold">Total:</span>
                <span className="text-gray-900 font-bold text-lg">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Items table */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Detalle de Ítems
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 font-medium">
                        Descripción
                      </th>
                      <th className="px-3 py-2 text-right text-gray-600 font-medium">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-right text-gray-600 font-medium">
                        P. Unit.
                      </th>
                      <th className="px-3 py-2 text-right text-gray-600 font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-900">{item.description}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Notas</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* OCR Text (collapsible) */}
          {invoice.rawOcrText && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={() => setIsOcrExpanded(!isOcrExpanded)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-semibold text-gray-800">
                  Texto OCR Original
                </h2>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    isOcrExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isOcrExpanded && (
                <div className="mt-4">
                  <textarea
                    readOnly
                    value={invoice.rawOcrText}
                    className="w-full h-48 px-3 py-2 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-md resize-none"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Image */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {invoice.imageUrl ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Imagen del Comprobante
                </h2>
                <a
                  href={invoice.imageUrl}
                  download={`comprobante-${invoice.documentNumber || invoice.id}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                  title="Descargar imagen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </a>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={invoice.imageUrl}
                  alt="Comprobante"
                  className="w-full h-auto object-contain bg-gray-50"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Imagen del Comprobante
              </h2>
              <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500">No hay imagen disponible</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
