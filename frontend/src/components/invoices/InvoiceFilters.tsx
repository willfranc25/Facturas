import React from 'react';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CATEGORIES } from '../../data/categories';
import type { InvoiceFilters as InvoiceFiltersType, InvoiceCategory, InvoiceStatus } from '../../types/invoice';

export interface InvoiceFiltersProps {
  filters: InvoiceFiltersType;
  onFiltersChange: (filters: Partial<InvoiceFiltersType>) => void;
  onClearFilters: () => void;
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const STATUSES: Array<{ value: InvoiceStatus; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'reviewed', label: 'Revisado' },
  { value: 'approved', label: 'Aprobado' },
];

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }));

  const categoryOptions = CATEGORIES.map((cat) => ({
    value: cat,
    label: cat,
  }));

  const handleMonthChange = (value: string) => {
    onFiltersChange({ month: value ? parseInt(value, 10) : undefined });
  };

  const handleYearChange = (value: string) => {
    onFiltersChange({ year: value ? parseInt(value, 10) : undefined });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ category: value ? (value as InvoiceCategory) : undefined });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ status: value ? (value as InvoiceStatus) : undefined });
  };

  const handleProviderSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ providerSearch: e.target.value || undefined });
  };

  const hasActiveFilters =
    filters.month !== undefined ||
    filters.year !== undefined ||
    filters.category !== undefined ||
    filters.status !== undefined ||
    (filters.providerSearch !== undefined && filters.providerSearch.trim() !== '');

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Month filter */}
        <Select
          label="Mes"
          options={MONTHS}
          value={filters.month ? String(filters.month) : ''}
          onChange={handleMonthChange}
          placeholder="Todos los meses"
        />

        {/* Year filter */}
        <Select
          label="Año"
          options={years}
          value={filters.year ? String(filters.year) : ''}
          onChange={handleYearChange}
          placeholder="Todos los años"
        />

        {/* Category filter */}
        <Select
          label="Categoría"
          options={categoryOptions}
          value={filters.category || ''}
          onChange={handleCategoryChange}
          placeholder="Todas las categorías"
        />

        {/* Status filter */}
        <Select
          label="Estado"
          options={STATUSES}
          value={filters.status || ''}
          onChange={handleStatusChange}
          placeholder="Todos los estados"
        />

        {/* Provider search */}
        <Input
          label="Proveedor"
          type="text"
          placeholder="Buscar proveedor..."
          value={filters.providerSearch || ''}
          onChange={handleProviderSearchChange}
        />
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  );
};
