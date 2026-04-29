import React, { useState, useMemo } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { MonthlyTable } from '../components/reports/MonthlyTable';
import { CategoryTable } from '../components/reports/CategoryTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../utils/formatters';
import {
  generateMonthlySummary,
  generateCategorySummary,
  exportToExcel,
  exportToCSV,
  downloadFile,
} from '../services/exportService';

export const ReportsPage: React.FC = () => {
  const invoices = useInvoiceStore((state) => state.invoices);

  // Date range filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filter invoices by date range
  const filteredInvoices = useMemo(() => {
    if (!startDate && !endDate) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return invoiceDate >= start && invoiceDate <= end;
      }
      
      if (startDate) {
        const start = new Date(startDate);
        return invoiceDate >= start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        return invoiceDate <= end;
      }
      
      return true;
    });
  }, [invoices, startDate, endDate]);

  // Generate summaries
  const monthlySummary = useMemo(
    () => generateMonthlySummary(filteredInvoices),
    [filteredInvoices]
  );

  const categorySummary = useMemo(
    () => generateCategorySummary(filteredInvoices),
    [filteredInvoices]
  );

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, invoice) => ({
        count: acc.count + 1,
        netAmount: acc.netAmount + invoice.netAmount,
        ivaAmount: acc.ivaAmount + invoice.ivaAmount,
        exemptAmount: acc.exemptAmount + invoice.exemptAmount,
        otherTaxes: acc.otherTaxes + invoice.otherTaxes,
        totalAmount: acc.totalAmount + invoice.totalAmount,
      }),
      {
        count: 0,
        netAmount: 0,
        ivaAmount: 0,
        exemptAmount: 0,
        otherTaxes: 0,
        totalAmount: 0,
      }
    );
  }, [filteredInvoices]);

  // Export handlers
  const handleExportExcel = () => {
    const dateRange =
      startDate && endDate
        ? { from: new Date(startDate), to: new Date(endDate) }
        : undefined;

    const excelData = exportToExcel(invoices, {
      includeMonthlySheet: true,
      includeCategorySheet: true,
      dateRange,
    });

    const filename = `reporte-comprobantes-${new Date().toISOString().split('T')[0]}.xlsx`;
    downloadFile(excelData, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const handleExportCSV = () => {
    const csvData = exportToCSV(filteredInvoices);
    const filename = `reporte-comprobantes-${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvData, filename, 'text/csv;charset=utf-8;');
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Reportes</h1>
        <p className="text-gray-600">
          Resumen de gastos por período y categoría
        </p>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Filtrar por rango de fechas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Fecha inicio"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Fecha fin"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={handleClearFilters}
              className="w-full"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Grand Total Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Total Acumulado
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-600">Comprobantes</p>
            <p className="text-xl font-bold text-gray-900">{grandTotal.count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Neto</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(grandTotal.netAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">IVA</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(grandTotal.ivaAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Exento</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(grandTotal.exemptAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Otros Impuestos</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(grandTotal.otherTaxes)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(grandTotal.totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Resumen Mensual
        </h2>
        <MonthlyTable summaries={monthlySummary} />
      </div>

      {/* Category Summary Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Resumen por Categoría
        </h2>
        <CategoryTable summaries={categorySummary} />
      </div>

      {/* Export Buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Exportar Datos
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleExportExcel} className="flex-1">
            <svg
              className="w-5 h-5 mr-2 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar a Excel
          </Button>
          <Button onClick={handleExportCSV} variant="secondary" className="flex-1">
            <svg
              className="w-5 h-5 mr-2 inline-block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar a CSV
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Los archivos Excel incluyen hojas adicionales con resúmenes mensuales y por categoría.
        </p>
      </div>
    </div>
  );
};
