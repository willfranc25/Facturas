# Plan de Implementación: invoice-expense-manager

## Overview

Implementación incremental de la aplicación full-stack para gestión de facturas y boletas chilenas. El orden sigue la cadena de dependencias: tipos compartidos → servicios core → backend → frontend → integración final.

## Tasks

- [x] 1. Configuración base del proyecto y tipos compartidos
  - Inicializar monorepo con `frontend/` y `backend/` usando sus respectivos `package.json`
  - Configurar TypeScript (`tsconfig.json`) en ambos proyectos
  - Configurar Vite + TailwindCSS en `frontend/`
  - Configurar Vitest + fast-check en ambos proyectos
  - Crear `frontend/src/types/invoice.ts` con todos los tipos: `DocumentType`, `PaymentMethod`, `InvoiceStatus`, `InvoiceCategory`, `InvoiceItem`, `Invoice`, `InvoiceFilters`, `MonthlySummary`, `CategorySummary`, `DashboardMetrics`
  - Crear `frontend/src/data/categories.ts` con el arreglo de categorías predefinidas
  - Crear `backend/src/config.ts` leyendo variables de entorno (`VLM_MODE`, `VLM_LOCAL_URL`, `VLM_REMOTE_URL`, `VLM_TIMEOUT_MS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_ALLOWED_USER_IDS`, `PORT`)
  - Crear `backend/.env.example` con todas las variables documentadas
  - _Requirements: 11.1, 13.1_

- [x] 2. Utilidades del frontend
  - [x] 2.1 Implementar `frontend/src/utils/rutValidator.ts`
    - Función `validateRut(rut: string): boolean` con algoritmo módulo 11 chileno
    - Función `formatRut(rut: string): string` que normaliza al formato `XX.XXX.XXX-X`
    - _Requirements: 4.3_

  - [ ]* 2.2 Escribir property test para rutValidator (Property 10)
    - **Property 10: Validación del dígito verificador del RUT**
    - Generar RUTs con `fc.integer({ min: 1000000, max: 99999999 })` y calcular DV correcto; verificar que `validateRut` retorna `true`. Mutar el DV y verificar que retorna `false`.
    - **Validates: Requirements 4.3**

  - [x] 2.3 Implementar `frontend/src/utils/calculations.ts`
    - Función `calculateTotal(net, iva, exempt, other): number`
    - Función `validateAmountConsistency(invoice: Partial<Invoice>): boolean` — retorna `true` si `|total - (net+iva+exempt+other)| <= 1`
    - _Requirements: 4.4, 4.5_

  - [ ]* 2.4 Escribir property tests para calculations (Properties 11 y 12)
    - **Property 11: Cálculo de total en tiempo real** — `fc.nat() × 4`, verificar `calculateTotal(n,i,e,o) === n+i+e+o`
    - **Property 12: Advertencia de inconsistencia de montos** — generar invoices con diferencia > 1, verificar que `validateAmountConsistency` retorna `false`
    - **Validates: Requirements 4.4, 4.5**

  - [x] 2.5 Implementar `frontend/src/utils/formatters.ts`
    - `formatCurrency(amount: number): string` — formato CLP con separadores de miles
    - `formatDate(dateStr: string): string` — de ISO a `DD/MM/YYYY`
    - `formatRutDisplay(rut: string): string`
    - _Requirements: 6.2_

- [x] 3. Checkpoint — Verificar que todos los tests de utilidades pasan
  - Ejecutar `vitest --run` en `frontend/`. Asegurarse de que todos los tests pasan antes de continuar.

- [x] 4. invoiceParser (backend — servicio core)
  - [x] 4.1 Implementar `backend/src/services/invoiceParser.ts`
    - Función `parseInvoiceText(rawText: string): Partial<Invoice>`
    - Regex para RUT chileno (con y sin puntos)
    - Regex para fechas `DD/MM/YYYY`, `DD-MM-YYYY`, `DD/MM/YY`
    - Regex para montos precedidos por `TOTAL`, `NETO`, `IVA`, `EXENTO`, `SUBTOTAL` (case-insensitive)
    - Regex para número de documento: `BOLETA`, `FACTURA`, `N°`, `NRO`, `FOLIO`
    - Regex para método de pago: `EFECTIVO`, `DÉBITO`, `CRÉDITO`, `TRANSFERENCIA`
    - Extracción de `InvoiceItem[]` desde líneas con patrón `descripción cantidad precio total`
    - Pre-selección de categoría por palabras clave (`COMBUSTIBLE`, `BENCINA`, `SUPERMERCADO`, etc.)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.3_

  - [ ]* 4.2 Escribir property tests para invoiceParser (Properties 6, 7, 8, 9)
    - **Property 6: Extracción de campos del parser** — generar strings con patrones de RUT/fecha/monto y verificar extracción correcta
    - **Property 7: Extracción de ítems del parser** — `fc.array(arbitraryInvoiceItemLine())`, verificar que `items.length >= 1`
    - **Property 8: Robustez del parser** — `fc.string()` arbitrario, verificar que nunca lanza excepción
    - **Property 9: Idempotencia del parser** — `fc.string()`, verificar `parseInvoiceText(t) deepEqual parseInvoiceText(t)`
    - **Validates: Requirements 3.1–3.8**

- [x] 5. VLM_Service y OCR_Engine (backend)
  - [x] 5.1 Implementar `backend/src/services/ocrEngine.ts`
    - Clase `OCREngine` con método `ocrImage(imageBuffer: Buffer): Promise<string>`
    - Integración con Tesseract.js (`tesseract.js`)
    - Manejo de errores: capturar excepciones y retornar string vacío con log
    - _Requirements: 2.5_

  - [x] 5.2 Implementar `backend/src/services/vlmService.ts`
    - Clase `VLMService` implementando la interfaz `{ extractInvoiceData, checkHealth }`
    - Modo local: llamada HTTP a Ollama `POST /api/generate` con modelo `moondream`
    - Modo remoto: llamada a `VLM_REMOTE_URL`
    - Prompt estructurado para extracción de campos chilenos (según diseño)
    - Parseo de respuesta JSON; si falla, intento por regex antes de activar fallback
    - Fallback a `OCREngine` + `invoiceParser` ante timeout, error de red o JSON inválido
    - Timeout configurable (`VLM_TIMEOUT_MS`, default 30 s)
    - Jerarquía de errores: `VLMServiceError`, `VLMTimeoutError`, `VLMInvalidResponseError`
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.7, 13.1, 13.4, 13.5, 13.6_

  - [ ]* 5.3 Escribir property tests para VLM_Service (Properties 3, 4, 5)
    - **Property 3: Robustez de extractInvoiceData** — `fc.uint8Array()` arbitrario con mock de Moondream2, verificar que la promesa siempre resuelve
    - **Property 4: Consistencia de extractInvoiceData** — llamar dos veces sobre el mismo buffer (mock), verificar campos numéricos iguales
    - **Property 5: Activación del fallback ante error del VLM** — `fc.constantFrom(timeoutError, networkError, invalidJsonError)`, verificar que retorna `Partial<Invoice>` sin lanzar
    - **Validates: Requirements 2.5, 2.7, 2.8, 13.5, 13.6**

- [x] 6. Middleware y configuración del servidor Express
  - Implementar `backend/src/middleware/upload.ts` con Multer: aceptar JPEG/PNG/WEBP, máx 10 MB; rechazar otros con HTTP 400
  - Implementar `backend/src/middleware/errorHandler.ts`: captura errores no controlados, responde HTTP 500 con mensaje genérico y loguea detalle
  - Implementar `backend/src/utils/logger.ts`: logger estructurado (JSON) con campos `timestamp`, `imageSize`, `responseTimeMs`, `extractionMethod`, `success`, `error`
  - _Requirements: 1.1, 1.3, 13.7_

  - [ ]* 6.1 Escribir property test para validación de imagen (Property 1)
    - **Property 1: Validación de formato de imagen**
    - Generar `fc.uint8Array()` con MIME types arbitrarios y tamaños; verificar que el middleware acepta exactamente JPEG/PNG/WEBP ≤ 10 MB y rechaza el resto
    - **Validates: Requirements 1.1, 1.3**

- [x] 7. Rutas del backend y app Express
  - Implementar `backend/src/routes/invoiceRoutes.ts`: `POST /api/invoices/extract` — recibe imagen vía Multer, llama a `VLMService.extractInvoiceData`, retorna `Partial<Invoice>`; responde 422 con `warning` si se usó fallback
  - Implementar `backend/src/routes/vlmRoutes.ts`: `GET /api/vlm/health` — llama a `VLMService.checkHealth`, retorna `VLMHealthStatus`
  - Implementar `backend/src/app.ts`: monta rutas, CORS, JSON body parser, errorHandler
  - _Requirements: 2.1, 2.4, 2.6, 13.2, 13.3_

- [x] 8. Telegram Bot
  - [x] 8.1 Implementar `backend/src/services/telegramBot.ts`
    - Inicializar bot con Telegraf usando `TELEGRAM_BOT_TOKEN`
    - Middleware de autorización: verificar `TELEGRAM_ALLOWED_USER_IDS`; rechazar con mensaje de acceso denegado
    - Handler `/start`: mensaje de bienvenida con lista de comandos
    - Handler `/help`: descripción de todos los comandos
    - Handler de foto / `/upload` + foto: descargar imagen de Telegram API, llamar a `VLMService.extractInvoiceData`, responder con resumen y solicitar confirmación
    - Handler `/confirmar`: guardar comprobante pendiente con `status: 'reviewed'`
    - Handler `/corregir <campo> <valor>`: actualizar campo en sesión y mostrar resumen actualizado
    - Handler `/list [mes año]`: listar últimos 10 comprobantes o del mes indicado
    - Handler `/report [mes año]`: resumen del mes actual o indicado
    - Handler de mensajes no reconocidos: responder con lista de comandos
    - Timeout de sesión: descartar datos pendientes tras 10 minutos e notificar al usuario
    - _Requirements: 14.1–14.15_

  - Implementar `backend/src/routes/telegramRoutes.ts`: `POST /api/telegram/webhook` — recibe updates de Telegram API y los pasa al bot
  - _Requirements: 14.14_

- [x] 9. Checkpoint — Verificar que todos los tests del backend pasan
  - Ejecutar `vitest --run` en `backend/`. Asegurarse de que todos los tests pasan antes de continuar.

- [x] 10. storageService (frontend)
  - [x] 10.1 Implementar `frontend/src/services/storageService.ts`
    - Inicializar IndexedDB `invoice-manager-db` v1 con object store `invoices` (keyPath `id`, índices `date`, `category`, `status`, `providerName`)
    - `initialize()`: abrir DB; si está vacía, insertar datos de prueba de `sampleData.ts`
    - `saveInvoice(data)`: generar UUID v4 para `id`, asignar `createdAt`/`updatedAt`, persistir y retornar `Invoice`
    - `updateInvoice(id, updates)`: actualizar campos y `updatedAt`, retornar `Invoice` actualizado
    - `deleteInvoice(id)`: eliminar registro
    - `getAllInvoices()`: retornar todos ordenados por `date` descendente
    - `getInvoiceById(id)`: retornar `Invoice | null`
    - Capturar todos los errores de IndexedDB y retornar `StorageError` descriptivo
    - _Requirements: 10.1–10.7_

  - [ ]* 10.2 Escribir property tests para storageService (Properties 16, 17, 18)
    - **Property 16: Round-trip de eliminación** — `arbitraryInvoice()`, guardar y eliminar, verificar que `getInvoiceById` retorna `null`
    - **Property 17: Actualización de `updatedAt`** — guardar invoice, llamar `updateInvoice`, verificar que `updatedAt` nuevo >= anterior
    - **Property 18: Round-trip de persistencia en IndexedDB** — `arbitraryInvoice()`, guardar y recuperar, verificar que todos los campos coinciden
    - **Validates: Requirements 5.6, 5.8, 10.3, 10.6**

- [x] 11. exportService (frontend)
  - [x] 11.1 Implementar `frontend/src/services/exportService.ts`
    - `exportToExcel(invoices, options?): Uint8Array` usando `xlsx`: hoja de comprobantes, hoja de resumen mensual, hoja de resumen por categoría (según `options`)
    - `exportToCSV(invoices): string`: generar CSV con todos los campos del listado
    - `generateMonthlySummary(invoices): MonthlySummary[]`
    - `generateCategorySummary(invoices): CategorySummary[]`
    - Funciones puras sin efectos secundarios
    - _Requirements: 9.1–9.6_

  - [ ] 11.2 Escribir property tests para exportService (Properties 19 y 20)
    - **Property 19: Pureza del exportService** — `fc.array(arbitraryInvoice())`, llamar `exportToCSV` dos veces, verificar strings idénticos
    - **Property 20: Round-trip de exportación a Excel** — exportar a Excel y parsear con `xlsx`, verificar que los valores numéricos coinciden con los originales
    - **Validates: Requirements 9.6, 9.7**

- [x] 12. apiClient y Zustand store (frontend)
  - Implementar `frontend/src/services/apiClient.ts`: wrapper sobre `fetch`/axios hacia `backend`; capturar errores de red y propagarlos al store
  - Implementar `frontend/src/store/invoiceStore.ts` con Zustand:
    - Estado: `invoices`, `filters`, `isLoading`, `error`
    - Acciones: `loadInvoices`, `addInvoice`, `updateInvoice`, `deleteInvoice`, `setFilters`, `getFilteredInvoices`
    - `getFilteredInvoices` aplica todos los filtros activos simultáneamente
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 12.1 Escribir property tests para filtrado (Properties 2 y 15)
    - **Property 2: Detección de duplicados** — `fc.array(arbitraryInvoice())` + invoice nuevo con mismos `providerName`/`documentNumber`/`totalAmount`, verificar que `detectDuplicate` retorna `true`
    - **Property 15: Corrección del filtrado** — `fc.array(arbitraryInvoice())` + `arbitraryFilters()`, verificar que todos los resultados cumplen simultáneamente todos los criterios del filtro
    - **Validates: Requirements 1.5, 5.2**

- [x] 13. Componentes UI base (frontend)
  - Implementar componentes en `frontend/src/components/ui/`:
    - `Button.tsx`: variantes `primary`, `secondary`, `danger`; estados `loading`, `disabled`
    - `Input.tsx`: con label, mensaje de error inline, soporte `type` text/number/date
    - `Select.tsx`: con opciones tipadas, label y error inline
    - `Modal.tsx`: overlay con título, contenido y acciones; cierre con Escape y click fuera
    - `Badge.tsx`: colores por `InvoiceStatus` (amarillo `pending`, azul `reviewed`, verde `approved`)
    - `ProgressBar.tsx`: barra de progreso indeterminada para estados de carga
  - _Requirements: 12.5_

- [x] 14. Componentes de layout y navegación (frontend)
  - Implementar `frontend/src/components/layout/AppLayout.tsx`: estructura principal con sidebar/header
  - Implementar `frontend/src/components/layout/Sidebar.tsx`: visible en ≥ 768 px; links a `/`, `/upload`, `/invoices`, `/reports`, `/settings`
  - Implementar `frontend/src/components/layout/MobileHeader.tsx`: menú hamburguesa visible en < 768 px
  - Configurar React Router en `frontend/src/App.tsx` con las rutas: `/`, `/upload`, `/invoices`, `/invoices/:id`, `/reports`, `/settings`
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 15. Página de carga de comprobante (frontend)
  - [x] 15.1 Implementar `frontend/src/pages/UploadInvoicePage.tsx`
    - Área de drag & drop y selector de archivo; validar JPEG/PNG/WEBP ≤ 10 MB en cliente
    - Preview de imagen antes de enviar
    - Llamada a `POST /api/invoices/extract` vía `apiClient`; mostrar `ProgressBar` durante procesamiento
    - Mostrar `DuplicateWarning` si se detecta duplicado
    - Al recibir `Partial<Invoice>`, navegar a `InvoiceForm` pre-rellenado
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4_

  - Implementar `frontend/src/components/invoices/DuplicateWarning.tsx`: alerta con datos del duplicado y botones "Continuar de todas formas" / "Cancelar"
  - _Requirements: 1.5_

- [x] 16. Formulario de revisión y guardado (frontend)
  - [x] 16.1 Implementar `frontend/src/components/invoices/InvoiceForm.tsx`
    - Props: `initialData: Partial<Invoice>`, `onSave`, `onCancel`, `imagePreview?`
    - Campos editables: proveedor, RUT (con validación módulo 11 en tiempo real), tipo, número, fecha, categoría, neto, IVA, exento, otros impuestos, total, método de pago, notas
    - Recalcular total en tiempo real al cambiar montos; mostrar advertencia si inconsistencia > $1
    - Validar campos requeridos (`date`, `category`, `totalAmount`) antes de permitir guardar
    - Asignar `status: 'pending'` si no hubo edición manual, `'reviewed'` si hubo al menos una edición
    - Llamar a `invoiceStore.addInvoice` al guardar
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 16.2 Escribir property tests para validación de campos (Properties 13 y 14)
    - **Property 13: Validación de campos requeridos** — `arbitraryInvoice()` con campos faltantes, verificar que la función de validación retorna `false`
    - **Property 14: Asignación de estado al guardar** — `fc.boolean()` (wasModified), verificar que el status asignado es correcto
    - **Validates: Requirements 4.6, 4.7**

- [x] 17. Listado y gestión de comprobantes (frontend)
  - Implementar `frontend/src/components/invoices/InvoiceFilters.tsx`: controles de filtro por mes, año, categoría, proveedor y estado; emite cambios al store
  - Implementar `frontend/src/components/invoices/InvoiceTable.tsx`: tabla paginada con columnas fecha, proveedor, categoría, neto, IVA, total, estado y acciones (ver, editar, eliminar, cambiar estado)
  - Implementar `frontend/src/components/invoices/InvoiceCard.tsx`: versión card para mobile
  - Implementar `frontend/src/pages/InvoicesPage.tsx`: combina `InvoiceFilters` + `InvoiceTable`; diálogo de confirmación antes de eliminar
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 18. Vista de detalle de comprobante (frontend)
  - Implementar `frontend/src/pages/InvoiceDetailPage.tsx`:
    - Mostrar imagen original del comprobante
    - Todos los campos contables, tabla de `InvoiceItem[]`, texto OCR colapsable, `createdAt`/`updatedAt`
    - Botón para cambiar estado a `approved`
    - Botón para editar (navega a `InvoiceForm` con datos pre-rellenados)
  - _Requirements: 5.4, 5.7, 6.1–6.5_

- [x] 19. Dashboard (frontend)
  - Implementar `frontend/src/components/dashboard/MetricCard.tsx`: props `title`, `value`, `subtitle`, `icon`, `trend`
  - Implementar `frontend/src/components/dashboard/CategoryPieChart.tsx`: gráfico de torta por categoría del mes actual (usando Recharts o similar)
  - Implementar `frontend/src/components/dashboard/MonthlyBarChart.tsx`: gráfico de barras de los últimos 12 meses
  - Implementar `frontend/src/pages/DashboardPage.tsx`: métricas del mes actual, gráficos, últimos 5 comprobantes; mostrar datos de prueba si no hay comprobantes
  - _Requirements: 7.1–7.6_

- [x] 20. Reportes y exportación (frontend)
  - Implementar `frontend/src/components/reports/MonthlyTable.tsx`: tabla de totales por mes
  - Implementar `frontend/src/components/reports/CategoryTable.tsx`: tabla de totales por categoría
  - Implementar `frontend/src/pages/ReportsPage.tsx`: filtro por rango de fechas, tablas de resumen, total acumulado, botones de exportación Excel y CSV
  - Conectar botones de exportación con `exportService.exportToExcel` / `exportToCSV` y disparar descarga del archivo
  - _Requirements: 8.1–8.5, 9.1–9.5_

- [x] 21. Página de configuración (frontend)
  - Implementar `frontend/src/pages/SettingsPage.tsx`:
    - Mostrar URL del backend configurada
    - Botón para verificar estado del VLM (`GET /api/vlm/health`) y mostrar resultado
    - Opción para limpiar todos los datos de IndexedDB (con confirmación)
  - _Requirements: 13.2_

- [ ] 22. Checkpoint final — Integración y tests completos
  - Ejecutar `vitest --run` en `frontend/` y `backend/`. Todos los tests deben pasar.
  - Verificar que el flujo completo funciona: upload de imagen → extracción → formulario pre-rellenado → guardado en IndexedDB → aparece en lista → exportación Excel/CSV.
  - Verificar que el bot de Telegram responde correctamente a `/start`, `/help`, foto y `/confirmar`.
  - Asegurarse de que no hay código huérfano sin integrar. Consultar al usuario si surgen dudas.

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requerimientos específicos para trazabilidad
- Los tests de propiedad usan fast-check con mínimo 100 iteraciones (`{ numRuns: 100 }`)
- Cada test PBT debe incluir el tag: `// Feature: invoice-expense-manager, Property N: <texto>`
- Los checkpoints en tareas 3, 9 y 22 garantizan validación incremental
