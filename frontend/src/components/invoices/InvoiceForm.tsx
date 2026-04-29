import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { validateRut, formatRut } from '../../utils/rutValidator';
import { calculateTotal, assignStatus } from '../../utils/calculations';
import { CATEGORIES } from '../../data/categories';
import type { Invoice, DocumentType, PaymentMethod, InvoiceCategory } from '../../types/invoice';

export interface InvoiceFormProps {
  initialData: Partial<Invoice>;
  onSave: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  imagePreview?: string;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'boleta', label: 'Boleta' },
  { value: 'factura', label: 'Factura' },
  { value: 'boleta_electronica', label: 'Boleta Electrónica' },
  { value: 'factura_electronica', label: 'Factura Electrónica' },
  { value: 'otro', label: 'Otro' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'débito', label: 'Débito' },
  { value: 'crédito', label: 'Crédito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

// Convert a number to string for the input, showing empty string instead of "0"
const numToStr = (v: number | undefined | null): string =>
  v != null && v !== 0 ? String(v) : '';

// Parse an amount string to number (empty string → 0)
const strToNum = (v: string): number => {
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  initialData,
  onSave,
  onCancel,
  imagePreview,
}) => {
  // Text fields
  const [providerName, setProviderName] = useState(initialData.providerName || '');
  const [providerRut, setProviderRut] = useState(initialData.providerRut || '');
  const [documentType, setDocumentType] = useState<DocumentType>(initialData.documentType || 'boleta');
  const [documentNumber, setDocumentNumber] = useState(initialData.documentNumber || '');
  const [date, setDate] = useState(initialData.date || '');
  const [category, setCategory] = useState<InvoiceCategory>(initialData.category || 'Otros');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData.paymentMethod || 'efectivo');
  const [notes, setNotes] = useState(initialData.notes || '');

  // Amount fields stored as strings so the user can clear and retype freely
  const [netAmount, setNetAmount] = useState(numToStr(initialData.netAmount));
  const [ivaAmount, setIvaAmount] = useState(numToStr(initialData.ivaAmount));
  const [exemptAmount, setExemptAmount] = useState(numToStr(initialData.exemptAmount));
  const [otherTaxes, setOtherTaxes] = useState(numToStr(initialData.otherTaxes));
  const [totalAmount, setTotalAmount] = useState(numToStr(initialData.totalAmount));

  // Validation state
  const [rutError, setRutError] = useState('');
  const [amountWarning, setAmountWarning] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [wasModified, setWasModified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const markAsModified = () => {
    if (!wasModified) setWasModified(true);
  };

  // RUT validation
  const handleRutChange = (value: string) => {
    setProviderRut(value);
    markAsModified();
    if (value.trim() === '') { setRutError(''); return; }
    if (!validateRut(value)) {
      setRutError('RUT inválido. Verifica el dígito verificador.');
    } else {
      setRutError('');
      const formatted = formatRut(value);
      if (formatted && formatted !== value) setProviderRut(formatted);
    }
  };

  // Amount change — only allow digits and one decimal separator
  const handleAmountChange = (
    field: 'net' | 'iva' | 'exempt' | 'other' | 'total',
    value: string
  ) => {
    markAsModified();
    if (value !== '' && !/^\d*[.,]?\d*$/.test(value)) return;
    switch (field) {
      case 'net':    setNetAmount(value);    break;
      case 'iva':    setIvaAmount(value);    break;
      case 'exempt': setExemptAmount(value); break;
      case 'other':  setOtherTaxes(value);  break;
      case 'total':  setTotalAmount(value);  break;
    }
  };

  // Consistency warning
  useEffect(() => {
    const net    = strToNum(netAmount);
    const iva    = strToNum(ivaAmount);
    const exempt = strToNum(exemptAmount);
    const other  = strToNum(otherTaxes);
    const total  = strToNum(totalAmount);
    const computed = calculateTotal(net, iva, exempt, other);
    const diff = Math.abs(total - computed);

    if (total > 0 && diff > 1) {
      setAmountWarning(
        `Advertencia: El total (${total.toLocaleString('es-CL')}) difiere de la suma de componentes (${computed.toLocaleString('es-CL')}) en ${diff.toLocaleString('es-CL')}.`
      );
    } else {
      setAmountWarning('');
    }
  }, [netAmount, ivaAmount, exemptAmount, otherTaxes, totalAmount]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!date || date.trim() === '') errors.date = 'La fecha es requerida';
    if (!category || category.trim() === '') errors.category = 'La categoría es requerida';
    const total = strToNum(totalAmount);
    if (total <= 0) errors.totalAmount = 'El total es requerido y debe ser mayor a 0';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        providerName,
        providerRut,
        documentType,
        documentNumber,
        date,
        time: initialData.time,
        category,
        items: initialData.items || [],
        netAmount:    strToNum(netAmount),
        ivaAmount:    strToNum(ivaAmount),
        exemptAmount: strToNum(exemptAmount),
        otherTaxes:   strToNum(otherTaxes),
        totalAmount:  strToNum(totalAmount),
        paymentMethod,
        imageUrl: imagePreview || initialData.imageUrl,
        rawOcrText: initialData.rawOcrText,
        status: assignStatus(wasModified),
        notes,
      };
      await onSave(invoiceData);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Revisar y Corregir Datos</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Proveedor"
              value={providerName}
              onChange={(e) => { setProviderName(e.target.value); markAsModified(); }}
              placeholder="Nombre del proveedor"
            />

            <Input
              label="RUT del Proveedor"
              value={providerRut}
              onChange={(e) => handleRutChange(e.target.value)}
              placeholder="12.345.678-9"
              error={rutError}
            />

            <Select
              label="Tipo de Documento"
              value={documentType}
              onChange={(value) => { setDocumentType(value as DocumentType); markAsModified(); }}
              options={DOCUMENT_TYPES}
            />

            <Input
              label="Número de Documento"
              value={documentNumber}
              onChange={(e) => { setDocumentNumber(e.target.value); markAsModified(); }}
              placeholder="123456"
            />

            <Input
              label="Fecha *"
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); markAsModified(); }}
              error={fieldErrors.date}
            />

            <Select
              label="Categoría *"
              value={category}
              onChange={(value) => { setCategory(value as InvoiceCategory); markAsModified(); }}
              options={CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
              error={fieldErrors.category}
            />

            {/* Amounts */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Montos</h3>
              <div className="space-y-3">
                <Input
                  label="Monto Neto"
                  type="text"
                  inputMode="numeric"
                  value={netAmount}
                  onChange={(e) => handleAmountChange('net', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="IVA (19%)"
                  type="text"
                  inputMode="numeric"
                  value={ivaAmount}
                  onChange={(e) => handleAmountChange('iva', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Monto Exento"
                  type="text"
                  inputMode="numeric"
                  value={exemptAmount}
                  onChange={(e) => handleAmountChange('exempt', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Otros Impuestos"
                  type="text"
                  inputMode="numeric"
                  value={otherTaxes}
                  onChange={(e) => handleAmountChange('other', e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Total *"
                  type="text"
                  inputMode="numeric"
                  value={totalAmount}
                  onChange={(e) => handleAmountChange('total', e.target.value)}
                  placeholder="0"
                  error={fieldErrors.totalAmount}
                />
              </div>

              {amountWarning && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex gap-2">
                  <svg className="h-5 w-5 text-yellow-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-yellow-800">{amountWarning}</p>
                </div>
              )}
            </div>

            <Select
              label="Método de Pago"
              value={paymentMethod}
              onChange={(value) => { setPaymentMethod(value as PaymentMethod); markAsModified(); }}
              options={PAYMENT_METHODS}
            />

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => { setNotes(e.target.value); markAsModified(); }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
                Guardar Comprobante
              </Button>
              <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">* Campos requeridos</p>
          </form>
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Imagen del Comprobante</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <img src={imagePreview} alt="Comprobante" className="w-full h-auto object-contain bg-gray-50" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
