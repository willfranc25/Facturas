# Documento de Requerimientos: cloud-migration

## Introducción

Esta migración transforma la arquitectura de `invoice-expense-manager` desde un modelo local (IndexedDB en el navegador + archivos JSON/imágenes en disco del servidor) a una arquitectura 100% en la nube, usando servicios gratuitos. El objetivo principal es que cualquier usuario autorizado pueda acceder a la aplicación desde cualquier dispositivo sin depender de que la PC del propietario esté encendida.

**Stack de destino:**
- **Base de datos:** Supabase (tier gratuito) — PostgreSQL para facturas, Supabase Storage para imágenes.
- **Backend:** Render.com (tier gratuito) — servidor Node.js/Express con OCR y bot de Telegram.
- **Frontend:** Vercel (tier gratuito) — aplicación React/Vite.

**Alcance de la migración:** Se reemplazan únicamente las capas de persistencia (`storageService.ts`, `serverStorage.ts`) y la configuración de despliegue. Los componentes React, el parser, el exportService, el VLM_Service y el bot de Telegram conservan su lógica de negocio sin cambios.

---

## Glosario

- **Sistema**: La aplicación invoice-expense-manager migrada a la nube (frontend en Vercel + backend en Render + datos en Supabase).
- **Supabase**: Plataforma BaaS (Backend-as-a-Service) que provee una base de datos PostgreSQL gestionada y un servicio de almacenamiento de objetos (Supabase Storage), ambos accesibles mediante el SDK oficial `@supabase/supabase-js`.
- **Supabase_DB**: La base de datos PostgreSQL de Supabase donde se persisten los registros de facturas (tabla `invoices`).
- **Supabase_Storage**: El servicio de almacenamiento de objetos de Supabase donde se guardan las imágenes de comprobantes en un bucket público.
- **Supabase_Client**: Instancia del SDK `@supabase/supabase-js` configurada con `SUPABASE_URL` y `SUPABASE_ANON_KEY`, usada tanto en el frontend como en el backend.
- **SupabaseStorageService**: Módulo que reemplaza a `storageService.ts` en el frontend, implementando la misma interfaz pública pero usando Supabase_Client en lugar de IndexedDB.
- **SupabaseServerStorage**: Módulo que reemplaza a `serverStorage.ts` en el backend, implementando la misma interfaz pública pero usando Supabase_Client en lugar de archivos JSON/disco.
- **Render**: Plataforma de hosting en la nube donde se despliega el servidor Node.js/Express (backend).
- **Vercel**: Plataforma de hosting en la nube donde se despliega la aplicación React/Vite (frontend).
- **SUPABASE_URL**: Variable de entorno con la URL del proyecto Supabase (ej. `https://xxxx.supabase.co`).
- **SUPABASE_ANON_KEY**: Variable de entorno con la clave pública anónima del proyecto Supabase.
- **BACKEND_URL**: Variable de entorno del frontend con la URL pública del backend en Render (ej. `https://invoice-manager.onrender.com`).
- **Invoice**: Entidad de datos que representa un comprobante registrado (sin cambios respecto al sistema original).
- **imageUrl**: Campo del Invoice que en la arquitectura en la nube contiene una URL pública de Supabase Storage en lugar de una cadena base64 o ruta local.
- **Migración de datos**: Proceso de transferir los comprobantes existentes en IndexedDB/JSON local hacia Supabase_DB.
- **Cold start**: Latencia inicial del servidor en Render (tier gratuito) cuando el servicio lleva inactivo más de 15 minutos.

---

## Requerimientos

### Requerimiento 1: Reemplazar IndexedDB por Supabase en el frontend

**User Story:** Como usuaria, quiero que mis comprobantes se guarden en la nube, para poder acceder a ellos desde cualquier dispositivo sin depender de la PC del administrador.

#### Criterios de Aceptación

1. THE SupabaseStorageService SHALL exponer exactamente la misma interfaz pública que el `storageService` original: `saveInvoice`, `updateInvoice`, `deleteInvoice`, `getAllInvoices`, `getInvoiceById`, `importInvoice`, `clearAllInvoices` e `initialize`.
2. WHEN se llama a `saveInvoice` con un Invoice válido, THE SupabaseStorageService SHALL insertar un registro en la tabla `invoices` de Supabase_DB y retornar el Invoice guardado con su `id` asignado.
3. WHEN se llama a `getAllInvoices`, THE SupabaseStorageService SHALL retornar todos los comprobantes de Supabase_DB ordenados por `date` descendente.
4. WHEN se llama a `getInvoiceById` con un `id` existente, THE SupabaseStorageService SHALL retornar el Invoice correspondiente desde Supabase_DB.
5. WHEN se llama a `updateInvoice` con un `id` existente y campos a actualizar, THE SupabaseStorageService SHALL actualizar el registro en Supabase_DB y retornar el Invoice actualizado con `updatedAt` renovado.
6. WHEN se llama a `deleteInvoice` con un `id` existente, THE SupabaseStorageService SHALL eliminar el registro de Supabase_DB.
7. IF una operación de Supabase_DB falla (error de red, error de autenticación, violación de restricción), THEN THE SupabaseStorageService SHALL lanzar un `StorageError` descriptivo con el nombre de la operación fallida, sin lanzar excepciones no controladas.
8. THE SupabaseStorageService SHALL inicializarse con los datos de prueba predefinidos si la tabla `invoices` está vacía al primer inicio de la aplicación.
9. FOR ALL Invoice guardados con `saveInvoice`, llamar a `getInvoiceById` con el mismo `id` SHALL retornar un objeto con los mismos valores en todos los campos (propiedad round-trip de persistencia en la nube).

---

### Requerimiento 2: Reemplazar almacenamiento de imágenes base64 por Supabase Storage

**User Story:** Como usuaria, quiero que las imágenes de mis comprobantes se guarden en la nube, para poder verlas desde cualquier dispositivo.

#### Criterios de Aceptación

1. WHEN el usuario guarda un comprobante con imagen, THE SupabaseStorageService SHALL subir el archivo de imagen al bucket `invoice-images` de Supabase_Storage y almacenar la URL pública resultante en el campo `imageUrl` del Invoice.
2. THE SupabaseStorageService SHALL nombrar cada imagen con el patrón `{invoice_id}.jpg` dentro del bucket `invoice-images`.
3. WHEN se llama a `deleteInvoice`, THE SupabaseStorageService SHALL eliminar también el archivo de imagen correspondiente de Supabase_Storage si existe.
4. IF la subida de imagen a Supabase_Storage falla, THEN THE SupabaseStorageService SHALL guardar el Invoice sin imagen (campo `imageUrl` como `null`) y retornar una advertencia al caller, sin bloquear el guardado del comprobante.
5. THE Sistema SHALL mostrar las imágenes de comprobantes usando la URL pública de Supabase_Storage directamente en el elemento `<img>`, sin necesidad de decodificar base64.
6. FOR ALL imágenes subidas a Supabase_Storage, la URL pública retornada SHALL ser accesible mediante una petición HTTP GET sin autenticación.

---

### Requerimiento 3: Reemplazar serverStorage.ts por Supabase en el backend

**User Story:** Como administrador, quiero que el bot de Telegram guarde los comprobantes en Supabase, para que los datos sean accesibles desde el frontend en la nube.

#### Criterios de Aceptación

1. THE SupabaseServerStorage SHALL exponer exactamente la misma interfaz pública que el `serverStorage` original: `getAllInvoices`, `getInvoiceById`, `saveInvoice`, `updateInvoice`, `deleteInvoice`.
2. WHEN el Telegram_Bot llama a `saveInvoice` con datos de comprobante e imagen (Buffer), THE SupabaseServerStorage SHALL subir la imagen a Supabase_Storage y guardar el Invoice con la URL pública en Supabase_DB.
3. WHEN el Telegram_Bot llama a `getAllInvoices`, THE SupabaseServerStorage SHALL retornar todos los comprobantes desde Supabase_DB ordenados por `date` descendente.
4. IF una operación de Supabase falla en el backend, THEN THE SupabaseServerStorage SHALL lanzar un error descriptivo que el Telegram_Bot pueda capturar y reportar al usuario.
5. THE SupabaseServerStorage SHALL usar las variables de entorno `SUPABASE_URL` y `SUPABASE_ANON_KEY` para inicializar el Supabase_Client; IF alguna de estas variables no está definida al iniciar el servidor, THEN THE Backend SHALL registrar un error crítico en el log y terminar el proceso.

---

### Requerimiento 4: Esquema de base de datos en Supabase

**User Story:** Como administrador, quiero que la tabla de facturas en Supabase refleje fielmente el modelo de datos existente, para no tener que modificar los componentes React ni el parser.

#### Criterios de Aceptación

1. THE Supabase_DB SHALL contener una tabla `invoices` con columnas que correspondan a todos los campos del tipo `Invoice` de TypeScript: `id` (UUID, PK), `provider_name`, `provider_rut`, `document_type`, `document_number`, `date`, `time`, `category`, `items` (JSONB), `net_amount`, `iva_amount`, `exempt_amount`, `other_taxes`, `total_amount`, `payment_method`, `image_url`, `raw_ocr_text`, `status`, `notes`, `created_at`, `updated_at`.
2. THE SupabaseStorageService SHALL mapear los nombres de columnas snake_case de Supabase_DB a los nombres camelCase del tipo `Invoice` de TypeScript al leer datos, y viceversa al escribir.
3. THE Supabase_DB SHALL tener un índice en la columna `date` para optimizar las consultas de ordenamiento y filtrado por período.
4. THE Supabase_DB SHALL tener Row Level Security (RLS) deshabilitado o configurado con una política que permita todas las operaciones con la `SUPABASE_ANON_KEY`, dado que la aplicación no implementa autenticación de usuarios en esta versión.

---

### Requerimiento 5: Actualizar apiClient.ts para apuntar al backend en Render

**User Story:** Como usuaria, quiero que el frontend se comunique con el backend desplegado en Render, para que el OCR y el bot de Telegram funcionen desde la nube.

#### Criterios de Aceptación

1. THE apiClient SHALL leer la URL base del backend desde la variable de entorno `VITE_API_BASE_URL`; IF la variable no está definida, THEN THE apiClient SHALL usar `http://localhost:3001` como valor por defecto.
2. THE Sistema SHALL configurar `VITE_API_BASE_URL` con la URL pública del backend en Render (ej. `https://invoice-manager.onrender.com`) en el entorno de producción de Vercel.
3. THE apiClient SHALL mantener el timeout de 120 segundos para las llamadas a `/api/invoices/extract`, para tolerar el cold start del servidor en Render y el tiempo de procesamiento OCR.
4. WHEN el backend en Render está en cold start y tarda más de 30 segundos en responder, THE Sistema SHALL mostrar al usuario un mensaje informativo indicando que el servidor está iniciando y que la espera puede tomar hasta 60 segundos.

---

### Requerimiento 6: Variables de entorno y configuración de despliegue

**User Story:** Como administrador, quiero que todas las credenciales y URLs se gestionen mediante variables de entorno, para no exponer secretos en el código fuente.

#### Criterios de Aceptación

1. THE Backend SHALL requerir las siguientes variables de entorno en Render: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_ALLOWED_USER_IDS`, `PORT`, `NODE_ENV`.
2. THE Frontend SHALL requerir las siguientes variables de entorno en Vercel: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. THE Sistema SHALL incluir archivos `.env.example` actualizados tanto en `backend/` como en `frontend/` con todas las variables requeridas y comentarios descriptivos, sin valores reales.
4. IF alguna variable de entorno requerida del backend no está definida al iniciar el servidor, THEN THE Backend SHALL registrar un mensaje de error que indique exactamente qué variable falta y terminar el proceso con código de salida 1.
5. THE Sistema SHALL incluir los archivos `.env` y `.env.local` en `.gitignore` para evitar que las credenciales sean commiteadas al repositorio.

---

### Requerimiento 7: Configuración de CORS para comunicación Vercel–Render

**User Story:** Como administrador, quiero que el backend en Render acepte peticiones del frontend en Vercel, para que la aplicación funcione correctamente en producción.

#### Criterios de Aceptación

1. THE Backend SHALL configurar CORS para aceptar peticiones desde el dominio de Vercel del frontend (ej. `https://invoice-manager.vercel.app`) en el entorno de producción.
2. THE Backend SHALL aceptar peticiones desde `http://localhost:5173` en el entorno de desarrollo local.
3. THE Backend SHALL leer los orígenes permitidos desde una variable de entorno `CORS_ORIGINS` (lista separada por comas); IF la variable no está definida, THEN THE Backend SHALL usar `http://localhost:5173` como valor por defecto.
4. THE Backend SHALL incluir los headers CORS necesarios (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) en todas las respuestas, incluyendo las respuestas a peticiones preflight OPTIONS.

---

### Requerimiento 8: Migración de datos existentes

**User Story:** Como usuaria, quiero que los comprobantes que ya tengo registrados en la aplicación local se transfieran a la nube, para no perder mi historial de gastos.

#### Criterios de Aceptación

1. THE Sistema SHALL proveer una función de exportación en la página de Configuración que permita al usuario descargar todos los comprobantes de IndexedDB como un archivo JSON.
2. THE Sistema SHALL proveer una función de importación en la página de Configuración que permita al usuario cargar el archivo JSON exportado y guardar cada comprobante en Supabase_DB mediante `importInvoice`.
3. WHEN el usuario importa un archivo JSON de comprobantes, THE SupabaseStorageService SHALL usar `upsert` (insertar o actualizar por `id`) para evitar duplicados si el comprobante ya existe en Supabase_DB.
4. WHEN la importación finaliza, THE Sistema SHALL mostrar un resumen con la cantidad de comprobantes importados exitosamente y la cantidad de errores, si los hubiera.
5. IF un comprobante del archivo JSON tiene un `imageUrl` con datos base64, THEN THE SupabaseStorageService SHALL subir la imagen a Supabase_Storage durante la importación y actualizar el campo `imageUrl` con la URL pública resultante.

---

### Requerimiento 9: Despliegue del backend en Render

**User Story:** Como administrador, quiero desplegar el backend en Render, para que el servidor OCR y el bot de Telegram estén disponibles 24/7 sin depender de mi PC.

#### Criterios de Aceptación

1. THE Backend SHALL incluir un archivo `render.yaml` en la raíz del repositorio con la configuración del servicio web de Render: nombre del servicio, entorno (`node`), directorio raíz (`backend`), comando de build (`npm install && npm run build`) y comando de inicio (`npm start`).
2. THE Backend SHALL exponer el puerto definido en la variable de entorno `PORT` (Render asigna este valor automáticamente); IF `PORT` no está definida, THE Backend SHALL usar el puerto `3001` como valor por defecto.
3. THE Backend SHALL configurar el webhook de Telegram apuntando a la URL pública de Render (`https://{servicio}.onrender.com/api/telegram/webhook`) en el entorno de producción.
4. THE Backend SHALL incluir un endpoint `GET /health` que retorne HTTP 200 con `{"status": "ok"}` para que Render pueda verificar que el servicio está activo.
5. WHEN el servidor inicia en Render, THE Backend SHALL registrar en el log la URL pública del servicio, el modo VLM configurado y el estado de conexión con Supabase.

---

### Requerimiento 10: Despliegue del frontend en Vercel

**User Story:** Como administrador, quiero desplegar el frontend en Vercel, para que la interfaz web esté disponible públicamente desde cualquier dispositivo.

#### Criterios de Aceptación

1. THE Frontend SHALL incluir un archivo `vercel.json` en el directorio `frontend/` con la configuración de build: framework `vite`, directorio de salida `dist`, y reglas de rewrite para que todas las rutas apunten a `index.html` (soporte de SPA routing).
2. THE Frontend SHALL construirse correctamente con el comando `npm run build` sin errores de TypeScript ni de Vite cuando las variables de entorno `VITE_API_BASE_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están definidas.
3. WHEN el usuario accede a cualquier ruta de la aplicación (ej. `/invoices`, `/reports`) directamente por URL, THE Frontend SHALL cargar la aplicación React correctamente sin retornar HTTP 404.
4. THE Frontend SHALL servirse sobre HTTPS en Vercel; IF el usuario accede por HTTP, THE Frontend SHALL redirigir automáticamente a HTTPS.

---

### Requerimiento 11: Compatibilidad con la interfaz existente sin cambios en componentes

**User Story:** Como desarrollador, quiero que la migración no requiera modificar los componentes React, el parser ni el exportService, para minimizar el riesgo de introducir regresiones.

#### Criterios de Aceptación

1. THE SupabaseStorageService SHALL exportar un objeto `storageService` con exactamente los mismos nombres de métodos y firmas de tipos que el `storageService` original, de modo que el `invoiceStore.ts` de Zustand no requiera ninguna modificación.
2. THE SupabaseServerStorage SHALL exportar un objeto `serverStorage` con exactamente los mismos nombres de métodos y firmas de tipos que el `serverStorage` original, de modo que el `telegramBot.ts` y las rutas del backend no requieran ninguna modificación.
3. THE Sistema SHALL mantener el tipo `Invoice` de TypeScript sin cambios; la conversión entre camelCase (TypeScript) y snake_case (Supabase_DB) SHALL ocurrir exclusivamente dentro de `SupabaseStorageService` y `SupabaseServerStorage`.
4. THE Sistema SHALL mantener la clase `StorageError` con la misma firma de constructor `(message: string, operation: string)` para que el manejo de errores existente en el store y los componentes siga funcionando sin cambios.

---

### Requerimiento 12: Manejo de errores de conectividad en la nube

**User Story:** Como usuaria, quiero recibir mensajes claros cuando hay problemas de conexión con la nube, para saber si el problema es temporal o requiere acción.

#### Criterios de Aceptación

1. IF el frontend no puede conectarse a Supabase_DB (error de red, credenciales inválidas), THEN THE Sistema SHALL mostrar un mensaje de error descriptivo en la interfaz indicando que no se pudo cargar la información y sugiriendo verificar la conexión a internet.
2. IF el frontend no puede conectarse al backend en Render (error de red, cold start), THEN THE apiClient SHALL retornar un `ApiError` con el mensaje "No se pudo conectar con el servidor. Verifica tu conexión a internet." y THE Sistema SHALL mostrarlo al usuario.
3. WHEN una operación de escritura en Supabase_DB falla por error de red, THE SupabaseStorageService SHALL lanzar un `StorageError` con el mensaje descriptivo del error de Supabase y el nombre de la operación fallida.
4. THE Sistema SHALL distinguir en los mensajes de error entre fallos de conectividad (error de red) y fallos de la operación (ej. registro no encontrado, violación de restricción), mostrando mensajes apropiados para cada caso.

---

### Requerimiento 13: Pruebas de la capa de persistencia en la nube

**User Story:** Como desarrollador, quiero que la nueva capa de persistencia tenga pruebas automatizadas, para verificar que el comportamiento es equivalente al de la implementación original con IndexedDB.

#### Criterios de Aceptación

1. THE SupabaseStorageService SHALL tener pruebas unitarias que verifiquen cada operación CRUD usando un mock del Supabase_Client, sin realizar llamadas reales a Supabase.
2. FOR ALL Invoice válidos, la secuencia `saveInvoice` → `getInvoiceById` SHALL retornar un objeto con los mismos valores en todos los campos (propiedad round-trip, verificada con fast-check usando al menos 50 iteraciones con datos generados aleatoriamente).
3. FOR ALL Invoice guardados, la secuencia `saveInvoice` → `deleteInvoice` → `getInvoiceById` SHALL retornar `null` (propiedad de eliminación, verificada con fast-check).
4. FOR ALL actualizaciones parciales, la secuencia `saveInvoice` → `updateInvoice(id, updates)` → `getInvoiceById` SHALL retornar un Invoice que contenga los valores de `updates` y tenga `updatedAt` mayor o igual al `updatedAt` anterior (propiedad de actualización, verificada con fast-check).
5. THE SupabaseStorageService SHALL manejar correctamente el caso en que el Supabase_Client retorna un error, lanzando un `StorageError` con el mensaje y la operación correctos.
