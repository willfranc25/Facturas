import React from 'react';
import type { Invoice } from '../../types/invoice';

export interface DuplicateWarningProps {
  duplicate: Invoice;
  onContinue: () => void;
  onCancel: () => void;
}

export const DuplicateWarning: React.FC<DuplicateWarningProps> = ({
  duplicate,
  onContinue,
  onCancel,
}) => {
  return (
    <div
      className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Posible comprobante duplicado
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p className="mb-2">
              Se encontró un comprobante con datos similares:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Proveedor:</strong> {duplicate.providerName}
              </li>
              <li>
                <strong>Número de documento:</strong> {duplicate.documentNumber}
              </li>
              <li>
                <strong>Total:</strong> ${duplicate.totalAmount.toLocaleString('es-CL')}
              </li>
              <li>
                <strong>Fecha:</strong> {new Date(duplicate.date).toLocaleDateString('es-CL')}
              </li>
            </ul>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={onContinue}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Continuar de todas formas
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
