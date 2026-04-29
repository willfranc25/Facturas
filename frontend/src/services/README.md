# Services

## apiClient

Wrapper sobre Axios para comunicación con el backend.

### Uso

```typescript
import { apiClient } from './apiClient';

// Extraer datos de una imagen
const result = await apiClient.extractInvoiceData(imageFile);
console.log(result.data); // Partial<Invoice>

// Verificar estado del VLM
const health = await apiClient.checkVLMHealth();
console.log(health.available); // boolean
```

### Manejo de errores

El cliente captura errores de red y los convierte en `ApiError`:

```typescript
try {
  await apiClient.extractInvoiceData(file);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message);
    console.error(error.statusCode);
  }
}
```

## storageService

Servicio para persistencia local con IndexedDB.

### Uso

```typescript
import * as storageService from './storageService';

// Inicializar (carga datos de prueba si está vacío)
await storageService.initialize();

// Guardar un comprobante
const invoice = await storageService.saveInvoice({
  providerName: 'Cencosud',
  // ... otros campos
});

// Obtener todos los comprobantes
const all = await storageService.getAllInvoices();

// Actualizar
await storageService.updateInvoice(id, { status: 'approved' });

// Eliminar
await storageService.deleteInvoice(id);
```

## exportService

Servicio para exportar comprobantes a Excel y CSV.

### Uso

```typescript
import * as exportService from './exportService';

// Exportar a Excel
const excelBuffer = exportService.exportToExcel(invoices, {
  includeMonthlySheet: true,
  includeCategorySheet: true,
});

// Exportar a CSV
const csvString = exportService.exportToCSV(invoices);

// Generar resúmenes
const monthlySummary = exportService.generateMonthlySummary(invoices);
const categorySummary = exportService.generateCategorySummary(invoices);
```
