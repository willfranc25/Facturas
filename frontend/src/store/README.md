# Invoice Store (Zustand)

Store global para gestión de comprobantes usando Zustand.

## Uso básico

```typescript
import { useInvoiceStore } from './invoiceStore';

function MyComponent() {
  // Seleccionar estado
  const invoices = useInvoiceStore((state) => state.invoices);
  const isLoading = useInvoiceStore((state) => state.isLoading);
  const error = useInvoiceStore((state) => state.error);
  
  // Seleccionar acciones
  const loadInvoices = useInvoiceStore((state) => state.loadInvoices);
  const addInvoice = useInvoiceStore((state) => state.addInvoice);
  
  // Usar en efectos
  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);
  
  return <div>{/* ... */}</div>;
}
```

## Acciones disponibles

### loadInvoices()

Carga todos los comprobantes desde IndexedDB.

```typescript
const loadInvoices = useInvoiceStore((state) => state.loadInvoices);

await loadInvoices();
```

### addInvoice(data)

Agrega un nuevo comprobante.

```typescript
const addInvoice = useInvoiceStore((state) => state.addInvoice);

await addInvoice({
  providerName: 'Cencosud',
  providerRut: '76.354.771-9',
  documentType: 'boleta',
  documentNumber: '123456',
  date: '2025-06-15',
  category: 'Supermercado',
  items: [],
  netAmount: 8403,
  ivaAmount: 1597,
  exemptAmount: 0,
  otherTaxes: 0,
  totalAmount: 10000,
  paymentMethod: 'débito',
  status: 'pending',
});
```

### updateInvoice(id, updates)

Actualiza un comprobante existente.

```typescript
const updateInvoice = useInvoiceStore((state) => state.updateInvoice);

await updateInvoice('invoice-id', {
  status: 'approved',
  notes: 'Revisado y aprobado',
});
```

### deleteInvoice(id)

Elimina un comprobante.

```typescript
const deleteInvoice = useInvoiceStore((state) => state.deleteInvoice);

await deleteInvoice('invoice-id');
```

### setFilters(filters)

Establece filtros para la lista de comprobantes.

```typescript
const setFilters = useInvoiceStore((state) => state.setFilters);

setFilters({
  month: 6,
  year: 2025,
  category: 'Supermercado',
  status: 'approved',
  providerSearch: 'cencosud',
});

// Limpiar un filtro específico
setFilters({ month: undefined });
```

### getFilteredInvoices()

Obtiene los comprobantes filtrados según los filtros activos.

```typescript
const getFilteredInvoices = useInvoiceStore((state) => state.getFilteredInvoices);

const filtered = getFilteredInvoices();
```

### clearError()

Limpia el mensaje de error.

```typescript
const clearError = useInvoiceStore((state) => state.clearError);

clearError();
```

## Ejemplo completo

```typescript
import { useInvoiceStore } from '../store/invoiceStore';
import { useEffect } from 'react';

function InvoiceList() {
  const invoices = useInvoiceStore((state) => state.invoices);
  const filters = useInvoiceStore((state) => state.filters);
  const isLoading = useInvoiceStore((state) => state.isLoading);
  const error = useInvoiceStore((state) => state.error);
  
  const loadInvoices = useInvoiceStore((state) => state.loadInvoices);
  const setFilters = useInvoiceStore((state) => state.setFilters);
  const getFilteredInvoices = useInvoiceStore((state) => state.getFilteredInvoices);
  const deleteInvoice = useInvoiceStore((state) => state.deleteInvoice);
  const clearError = useInvoiceStore((state) => state.clearError);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = getFilteredInvoices();

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este comprobante?')) {
      await deleteInvoice(id);
    }
  };

  if (isLoading) return <div>Cargando...</div>;
  
  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={clearError}>Cerrar</button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <label>
          Mes:
          <input
            type="number"
            min="1"
            max="12"
            value={filters.month ?? ''}
            onChange={(e) => setFilters({ month: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label>
          Año:
          <input
            type="number"
            value={filters.year ?? ''}
            onChange={(e) => setFilters({ year: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
      </div>

      <ul>
        {filteredInvoices.map((invoice) => (
          <li key={invoice.id}>
            {invoice.date} - {invoice.providerName} - ${invoice.totalAmount}
            <button onClick={() => handleDelete(invoice.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Filtrado

El store aplica todos los filtros activos simultáneamente:

- **month**: Filtra por mes (1-12)
- **year**: Filtra por año
- **category**: Filtra por categoría exacta
- **providerSearch**: Búsqueda parcial case-insensitive en el nombre del proveedor
- **status**: Filtra por estado exacto

Los comprobantes que no cumplan **todos** los criterios activos serán excluidos.
