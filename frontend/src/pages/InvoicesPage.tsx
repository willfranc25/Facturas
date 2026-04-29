import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceStore } from '../store/invoiceStore';
import { InvoiceFilters } from '../components/invoices/InvoiceFilters';
import { InvoiceTable } from '../components/invoices/InvoiceTable';
import { InvoiceCard } from '../components/invoices/InvoiceCard';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import type { InvoiceStatus } from '../types/invoice';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loadInvoices,
    deleteInvoice,
    updateInvoice,
    filters,
    setFilters,
    getFilteredInvoices,
    isLoading,
    error,
    clearError,
  } = useInvoiceStore();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInvoices = getFilteredInvoices();

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleView = (id: string) => {
    navigate(`/invoices/${id}`);
  };

  const handleEdit = (id: string) => {
    navigate(`/invoices/${id}/edit`);
  };

  const handleDeleteClick = (id: string) => {
    setInvoiceToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteInvoice(invoiceToDelete);
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
    } catch (err) {
      // Error is handled by the store
      console.error('Error deleting invoice:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setInvoiceToDelete(null);
  };

  const handleStatusChange = async (id: string, status: InvoiceStatus) => {
    try {
      await updateInvoice(id, { status });
    } catch (err) {
      console.error('Error updating invoice status:', err);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      month: undefined,
      year: undefined,
      category: undefined,
      providerSearch: undefined,
      status: undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Comprobantes</h1>
        <Button variant="primary" onClick={() => navigate('/upload')}>
          + Nuevo Comprobante
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
            aria-label="Cerrar mensaje de error"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Cargando comprobantes...</p>
        </div>
      )}

      {/* Desktop table view */}
      {!isLoading && (
        <div className="hidden md:block">
          <InvoiceTable
            invoices={filteredInvoices}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Mobile card view */}
      {!isLoading && (
        <div className="md:hidden space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No se encontraron comprobantes con los filtros aplicados.</p>
            </div>
          ) : (
            filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Confirmar eliminación"
        actions={
          <>
            <Button variant="secondary" onClick={handleDeleteCancel} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={isDeleting}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          ¿Estás seguro de que deseas eliminar este comprobante? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
};
