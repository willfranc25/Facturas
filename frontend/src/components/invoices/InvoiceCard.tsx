import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Invoice } from '../../types/invoice';

export interface InvoiceCardProps {
  invoice: Invoice;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header: Date and Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500">Fecha</p>
          <p className="text-base font-medium text-gray-900">{formatDate(invoice.date)}</p>
        </div>
        <Badge status={invoice.status} />
      </div>

      {/* Provider */}
      <div className="mb-3">
        <p className="text-sm text-gray-500">Proveedor</p>
        <p className="text-base font-medium text-gray-900 truncate" title={invoice.providerName}>
          {invoice.providerName}
        </p>
      </div>

      {/* Category */}
      <div className="mb-3">
        <p className="text-sm text-gray-500">Categoría</p>
        <p className="text-base text-gray-700">{invoice.category}</p>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Neto</p>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.netAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">IVA</p>
          <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.ivaAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onView(invoice.id)} className="flex-1 text-sm">
          Ver
        </Button>
        <Button variant="secondary" onClick={() => onEdit(invoice.id)} className="flex-1 text-sm">
          Editar
        </Button>
        <button
          onClick={() => onDelete(invoice.id)}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Eliminar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
