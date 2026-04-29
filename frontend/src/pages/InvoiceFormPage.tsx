import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { useInvoiceStore } from '../store/invoiceStore';
import type { Invoice } from '../types/invoice';

export const InvoiceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { invoices, addInvoice, updateInvoice } = useInvoiceStore();

  const [initialData, setInitialData] = useState<Partial<Invoice>>({});
  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      if (id) {
        // Edit mode: load existing invoice
        const invoice = invoices.find((inv) => inv.id === id);
        if (invoice) {
          setInitialData(invoice);
          setImagePreview(invoice.imageUrl);
        }
      } else {
        // New mode: check for data from upload page in sessionStorage
        const storedData = sessionStorage.getItem('invoiceFormData');
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
            setInitialData(parsedData);
            setImagePreview(parsedData.imageUrl);
            // Clear sessionStorage after loading
            sessionStorage.removeItem('invoiceFormData');
          } catch (error) {
            console.error('Error parsing stored invoice data:', error);
          }
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [id, invoices]);

  // Handle save
  const handleSave = async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (id) {
        // Update existing invoice
        await updateInvoice(id, invoiceData);
      } else {
        // Create new invoice
        await addInvoice(invoiceData);
      }
      // Navigate to invoices list after successful save
      navigate('/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      // Error is handled by the store and displayed in the form
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Clear sessionStorage if present
    sessionStorage.removeItem('invoiceFormData');
    // Navigate back to invoices list
    navigate('/invoices');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <InvoiceForm
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        imagePreview={imagePreview}
      />
    </div>
  );
};
