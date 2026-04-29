# Plan de Implementación: cloud-migration

## Resumen

Migración de `invoice-expense-manager` desde almacenamiento local (IndexedDB + archivos JSON en disco) a una arquitectura 100% en la nube usando Supabase (base de datos + storage), Render (backend) y Vercel (frontend), todos en tier gratuito. Se reemplazan únicamente las capas de persistencia y la configuración de despliegue; los componentes React, el parser OCR, el exportService, el VLM Service y el bot de Telegram no requieren cambios.

## Tareas

- [x] 1. Instalar dependencias y configurar variables de entorno
  - Agregar `@supabase/supabase-js` como dependencia en `frontend/package.json` y `backend/package.json`
  - Actualizar `frontend/.env.example` con las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_BASE_URL`
  - Actualizar `backend/.env.example` con las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `CORS_ORIGINS`
  - Verificar que `.env` y `.env.local` estén en `.gitignore`
  - _Requerimientos: 6.1, 6.2, 6.3, 6.5_

- [x] 2. Actualizar `backend/src/config.ts` con validación de variables requeridas y soporte CORS configurable
  - Agregar bloque de validación de `SUPABASE_URL` y `SUPABASE_ANON_KEY` con `process.exit(1)` si faltan
  - Agregar campo `supabase` con `url` y `anonKey` al objeto `config`
  - Agregar campo `corsOrigins` al objeto `config.server` leyendo desde `CORS_ORIGINS` con fallback a `http://localhost:5173`
  - _Requerimientos: 3.5, 6.4, 7.3_

- [x] 3. Actualizar `backend/src/app.ts` con CORS configurable y endpoint `/health`
  - Reemplazar `app.use(cors())` por `app.use(cors({ origin: config.server.corsOrigins, ... }))` usando los orígenes del config
  - Eliminar la línea `app.use('/api/storage/images', express.static(...))` (ya no se sirven archivos locales)
  - Agregar endpoint `GET /health` que retorne `{ status: 'ok' }` con HTTP 200
  - Actualizar los logs de inicio para mostrar URL pública, modo VLM y URL de Supabase
  - _Requerimientos: 7.1, 7.2, 7.4, 9.4, 9.5_

- [x] 4. Implementar `SupabaseServerStorage` en `backend/src/services/serverStorage.ts`
  - [x] 4.1 Implementar las funciones de mapeo `toRow` y `fromRow` (camelCase ↔ snake_case) y el tipo `InvoiceRow`
    - Definir el tipo `InvoiceRow` con todos los campos en snake_case
    - Implementar `toRow(inv)` que convierte un `Invoice` a `Partial<InvoiceRow>`
    - Implementar `fromRow(row)` que convierte un `InvoiceRow` a `Invoice`
    - _Requerimientos: 4.2, 11.3_

  - [ ]* 4.2 Escribir test de propiedad para el mapeo camelCase ↔ snake_case
    - **Propiedad 6: Round-trip de mapeo camelCase ↔ snake_case**
    - Generar `Invoice` arbitrarios con fast-check y verificar que `fromRow(toRow(invoice))` produce un objeto con los mismos valores
    - **Valida: Requerimiento 4.2**

  - [x] 4.3 Implementar `uploadImageBuffer` y las operaciones CRUD del `serverStorage`
    - Inicializar `SupabaseClient` con `process.env.SUPABASE_URL` y `process.env.SUPABASE_ANON_KEY`
    - Implementar `uploadImageBuffer(id, buffer)` que sube al bucket `invoice-images` y retorna la URL pública
    - Implementar `getAllInvoices`, `getInvoiceById`, `saveInvoice`, `updateInvoice`, `deleteInvoice` usando el Supabase_Client
    - Mantener `getImagesDir()` retornando `''` por compatibilidad
    - _Requerimientos: 3.1, 3.2, 3.3, 3.4, 11.2_

  - [ ]* 4.4 Escribir tests unitarios para `SupabaseServerStorage` con mock del Supabase_Client
    - Mockear `@supabase/supabase-js` con vitest
    - Verificar que cada operación CRUD llama al cliente con los parámetros correctos
    - Verificar que los errores del cliente se propagan como errores descriptivos (req. 3.4)
    - _Requerimientos: 3.1, 3.4, 13.1_

- [x] 5. Checkpoint — Verificar backend
  - Asegurarse de que `npm run build` en `backend/` compila sin errores de TypeScript
  - Asegurarse de que `npm test` en `backend/` pasa todos los tests existentes y los nuevos
  - Preguntar al usuario si hay dudas antes de continuar.

- [x] 6. Implementar `SupabaseStorageService` en `frontend/src/services/storageService.ts`
  - [x] 6.1 Implementar las funciones de mapeo `toRow`, `fromRow`, el tipo `InvoiceRow` y los helpers de imagen
    - Definir el tipo `InvoiceRow` con todos los campos en snake_case
    - Implementar `toRow` y `fromRow` (misma lógica que en el backend, independiente)
    - Implementar `uploadImage(id, file)` que sube un `File | Blob` al bucket `invoice-images` y retorna la URL pública
    - Implementar `deleteImage(id)` que elimina `{id}.jpg` del bucket
    - Exportar `uploadImage`, `uploadImageBuffer` y `deleteImage` para uso en migración de datos
    - _Requerimientos: 2.1, 2.2, 2.3, 4.2, 11.3_

  - [ ]* 6.2 Escribir test de propiedad para el mapeo camelCase ↔ snake_case (frontend)
    - **Propiedad 6: Round-trip de mapeo camelCase ↔ snake_case**
    - Generar `Invoice` arbitrarios con fast-check y verificar que `fromRow(toRow(invoice))` produce un objeto con los mismos valores
    - **Valida: Requerimiento 4.2**

  - [x] 6.3 Implementar las operaciones CRUD del `storageService` usando Supabase_Client
    - Inicializar `SupabaseClient` con `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
    - Implementar `initialize`: verificar si la tabla está vacía e insertar `SAMPLE_INVOICES` si lo está
    - Implementar `saveInvoice`: insertar en Supabase_DB y retornar el Invoice con `id` asignado
    - Implementar `importInvoice`: usar `upsert` con `onConflict: 'id'` para evitar duplicados
    - Implementar `updateInvoice`: actualizar en Supabase_DB y retornar el Invoice actualizado con `updatedAt` renovado
    - Implementar `deleteInvoice`: eliminar imagen de Supabase_Storage y luego el registro de Supabase_DB
    - Implementar `getAllInvoices`: retornar todos los registros ordenados por `date` descendente
    - Implementar `getInvoiceById`: retornar el registro o `null` si no existe
    - Implementar `clearAllInvoices`: eliminar todos los registros de Supabase_DB
    - Exportar `storageService` con exactamente los mismos nombres de métodos que el original
    - _Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.3, 2.4, 11.1_

  - [ ]* 6.4 Escribir test de propiedad: round-trip de persistencia
    - **Propiedad 1: Round-trip de persistencia**
    - Mockear Supabase_Client con vitest; generar `Invoice` arbitrarios con fast-check (≥50 iteraciones)
    - Verificar que `saveInvoice(invoice)` → `getInvoiceById(id)` retorna un objeto con los mismos valores en todos los campos
    - **Valida: Requerimientos 1.2, 1.4, 1.9, 13.2**

  - [ ]* 6.5 Escribir test de propiedad: actualización preserva campos y renueva `updatedAt`
    - **Propiedad 2: Actualización preserva campos y renueva updatedAt**
    - Generar `Invoice` y `updates` parciales arbitrarios con fast-check (≥50 iteraciones)
    - Verificar que `saveInvoice` → `updateInvoice(id, updates)` → `getInvoiceById(id)` retorna un Invoice con los valores de `updates` y `updatedAt` ≥ `updatedAt` anterior
    - **Valida: Requerimientos 1.5, 13.4**

  - [ ]* 6.6 Escribir test de propiedad: eliminación hace `getById` retornar `null`
    - **Propiedad 3: Eliminación hace getById retornar null**
    - Generar `Invoice` arbitrarios con fast-check (≥50 iteraciones)
    - Verificar que `saveInvoice` → `deleteInvoice(id)` → `getInvoiceById(id)` retorna `null`
    - **Valida: Requerimientos 1.6, 13.3**

  - [ ]* 6.7 Escribir test de propiedad: errores de Supabase se convierten en `StorageError`
    - **Propiedad 4: Errores de Supabase se convierten en StorageError**
    - Para cada operación CRUD, simular que el Supabase_Client retorna un error y verificar que se lanza un `StorageError` con el nombre de la operación en el campo `operation`
    - **Valida: Requerimientos 1.7, 12.3, 13.5**

  - [ ]* 6.8 Escribir test de propiedad: `getAllInvoices` retorna ordenado por `date` descendente
    - **Propiedad 5: getAllInvoices retorna ordenado por date descendente**
    - Generar listas de `Invoice` con fechas arbitrarias con fast-check (≥50 iteraciones)
    - Verificar que para todo par consecutivo `(a, b)` en el resultado, `a.date >= b.date`
    - **Valida: Requerimientos 1.3, 3.3**

  - [ ]* 6.9 Escribir test de propiedad: `importInvoice` es idempotente
    - **Propiedad 8: importInvoice es idempotente**
    - Generar `Invoice` arbitrarios con fast-check (≥50 iteraciones)
    - Verificar que llamar a `importInvoice(invoice)` dos veces consecutivas resulta en exactamente un registro y `getInvoiceById` retorna los valores de la segunda llamada
    - **Valida: Requerimiento 8.3**

  - [ ]* 6.10 Escribir test de propiedad: imagen subida genera URL con patrón correcto
    - **Propiedad 7: Imagen subida genera URL con patrón correcto**
    - Generar `Invoice` con imagen arbitraria con fast-check (≥50 iteraciones)
    - Verificar que el `imageUrl` del Invoice retornado contiene el `id` del Invoice y el nombre del bucket `invoice-images`
    - **Valida: Requerimientos 2.1, 2.2, 3.2**

- [x] 7. Actualizar `frontend/src/services/apiClient.ts` con mensaje de cold start
  - Actualizar el mensaje de error de red en el bloque `axiosError.request` para mencionar el cold start de Render (hasta 60 segundos)
  - _Requerimientos: 5.1, 5.3, 5.4, 12.2_

- [x] 8. Checkpoint — Verificar frontend
  - Asegurarse de que `npm run build` en `frontend/` compila sin errores de TypeScript ni de Vite
  - Asegurarse de que `npm test` en `frontend/` pasa todos los tests existentes y los nuevos
  - Preguntar al usuario si hay dudas antes de continuar.

- [x] 9. Implementar migración de datos en `frontend/src/pages/SettingsPage.tsx`
  - [x] 9.1 Agregar función de exportación de IndexedDB a JSON
    - Importar `openDB` y `getAllInvoices` del `storageService` original (o leer directamente de IndexedDB si ya fue reemplazado)
    - Implementar `exportLocalData()`: leer todos los comprobantes de IndexedDB y descargar como archivo JSON usando `URL.createObjectURL`
    - Agregar botón "Exportar datos locales" en la sección de configuración
    - _Requerimientos: 8.1_

  - [x] 9.2 Agregar función de importación de JSON a Supabase
    - Implementar `importFromJson(file)`: parsear el archivo JSON, iterar sobre los comprobantes y llamar a `storageService.importInvoice` para cada uno
    - Si un comprobante tiene `imageUrl` con datos base64, llamar a `uploadImage` para subirla a Supabase_Storage y actualizar el campo `imageUrl`
    - Mostrar un resumen al finalizar: cantidad de comprobantes importados exitosamente y cantidad de errores
    - Agregar input de archivo e indicador de progreso en la sección de configuración
    - _Requerimientos: 8.2, 8.3, 8.4, 8.5_

  - [ ]* 9.3 Escribir tests unitarios para las funciones de migración
    - Verificar que `exportLocalData` genera un JSON con la estructura correcta
    - Verificar que `importFromJson` llama a `storageService.importInvoice` por cada comprobante del archivo
    - Verificar que el resumen muestra correctamente los conteos de éxito y error
    - _Requerimientos: 8.1, 8.2, 8.4_

- [x] 10. Crear archivos de configuración de despliegue
  - [x] 10.1 Crear `render.yaml` en la raíz del repositorio
    - Definir el servicio web con `name`, `env: node`, `rootDir: backend`, `buildCommand`, `startCommand` y `healthCheckPath: /health`
    - Listar todas las variables de entorno requeridas con `sync: false` para las que contienen secretos
    - _Requerimientos: 9.1, 9.2_

  - [x] 10.2 Crear `frontend/vercel.json`
    - Configurar `framework: vite`, `outputDirectory: dist`
    - Agregar regla de rewrite `"/(.*)" → "/index.html"` para soporte de SPA routing
    - Agregar headers de seguridad `X-Content-Type-Options` y `X-Frame-Options`
    - _Requerimientos: 10.1, 10.3_

- [x] 11. Checkpoint final — Verificar integración completa
  - Ejecutar `npm run build` en `backend/` y `frontend/` sin errores
  - Ejecutar `npm test` en `backend/` y `frontend/` y verificar que todos los tests pasan
  - Verificar que `invoiceStore.ts` no requirió ninguna modificación
  - Verificar que `telegramBot.ts` y las rutas del backend no requirieron modificaciones
  - Preguntar al usuario si hay dudas antes de dar por completada la migración.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los tests de propiedad usan **fast-check** (ya disponible en ambos `package.json`) con al menos 50 iteraciones
- El Supabase_Client debe mockearse en todos los tests unitarios — no se realizan llamadas reales a Supabase
- Las funciones `toRow`/`fromRow` se duplican intencionalmente en frontend y backend para mantener independencia entre capas
- El esquema SQL de Supabase (tabla `invoices` + bucket `invoice-images`) debe crearse manualmente en el dashboard de Supabase antes de ejecutar las tareas — ver sección "Modelos de Datos" en `design.md`
