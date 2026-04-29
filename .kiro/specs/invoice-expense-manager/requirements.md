# Documento de Requerimientos

## Introducción

Sistema para gestión de facturas y boletas orientado a la declaración de impuestos en Chile. La aplicación permite subir imágenes de comprobantes desde la interfaz web o desde un bot de Telegram, extraer datos estructurados mediante el modelo de visión Moondream2 (con OCR Tesseract.js como fallback), corregirlos manualmente, registrarlos contablemente, agruparlos por categoría y generar reportes exportables a Excel/CSV. La interfaz web usa IndexedDB para persistencia local; el bot de Telegram se comunica con un backend que expone la misma lógica de negocio.

---

## Glosario

- **Sistema**: La aplicación invoice-expense-manager en su conjunto (interfaz web + backend + bot).
- **Comprobante**: Documento tributario (boleta o factura) subido por el usuario.
- **Moondream2**: Modelo de visión-lenguaje (VLM) que recibe una imagen y un prompt de texto y retorna datos estructurados. Es el motor principal de extracción de datos.
- **VLM_Service**: Módulo del backend que se comunica con el servidor Moondream2 (vía API local con Ollama o API remota) para analizar imágenes de comprobantes.
- **OCR_Engine**: Módulo basado en Tesseract.js que extrae texto de imágenes. Actúa como fallback cuando el VLM_Service no está disponible.
- **Parser**: Módulo `invoiceParser.ts` que interpreta el texto OCR y extrae campos estructurados mediante expresiones regulares. Actúa como fallback del VLM_Service.
- **Storage**: Módulo `storageService.ts` que gestiona la persistencia en IndexedDB.
- **Export_Service**: Módulo `exportService.ts` que genera archivos Excel y CSV.
- **Backend**: Servidor Node.js/Express que expone la API REST consumida por la interfaz web y el Telegram_Bot.
- **Telegram_Bot**: Bot de Telegram que permite gestionar comprobantes mediante comandos y mensajes de foto.
- **Telegram_API**: API oficial de Telegram (Bot API) usada para recibir y enviar mensajes.
- **Invoice**: Entidad de datos que representa un comprobante registrado.
- **InvoiceItem**: Línea de detalle dentro de un comprobante (descripción, cantidad, precio unitario, total).
- **RUT**: Rol Único Tributario, identificador fiscal chileno con formato `XX.XXX.XXX-X`.
- **IVA**: Impuesto al Valor Agregado (19% en Chile).
- **Estado**: Valor del campo `status` de un Invoice: `pending`, `reviewed` o `approved`.
- **Categoría**: Clasificación del gasto asignada a cada comprobante.
- **Dashboard**: Pantalla principal con resumen de métricas y gráficos.
- **Usuario**: Persona que opera la aplicación (vía interfaz web o Telegram_Bot).

---

## Requerimientos

### Requerimiento 1: Carga de imagen de comprobante

**User Story:** Como usuario, quiero subir una foto o imagen de una factura o boleta, para que el sistema pueda procesarla y registrar el gasto.

#### Criterios de Aceptación

1. THE Sistema SHALL aceptar archivos de imagen en formatos JPEG, PNG y WEBP con tamaño máximo de 10 MB.
2. WHEN el usuario selecciona un archivo de imagen válido, THE Sistema SHALL mostrar un preview de la imagen antes de iniciar el OCR.
3. WHEN el usuario selecciona un archivo que no es imagen o supera 10 MB, THE Sistema SHALL mostrar un mensaje de error descriptivo y no iniciar el OCR.
4. THE Sistema SHALL permitir seleccionar archivos mediante clic en un área de carga o mediante arrastrar y soltar (drag & drop).
5. WHEN el usuario carga una imagen, THE Sistema SHALL verificar si existe un comprobante con el mismo proveedor, número de documento y total; IF se detecta un duplicado, THEN THE Sistema SHALL mostrar una advertencia al usuario antes de guardar.

---

### Requerimiento 2: Extracción de datos mediante Moondream2 (con fallback OCR)

**User Story:** Como usuario, quiero que el sistema extraiga automáticamente los datos del comprobante desde la imagen usando inteligencia artificial, para reducir la carga de ingreso manual con mayor precisión que el OCR tradicional.

#### Criterios de Aceptación

1. WHEN el usuario confirma la imagen cargada, THE VLM_Service SHALL enviar la imagen junto con un prompt estructurado al servidor Moondream2 para extraer los campos del comprobante.
2. THE VLM_Service SHALL solicitar a Moondream2 los campos: nombre del proveedor, RUT del proveedor, tipo de documento, número de documento, fecha, hora, monto neto, monto IVA, monto exento, otros impuestos, total, método de pago e ítems de detalle.
3. WHEN el VLM_Service recibe la respuesta de Moondream2, THE Sistema SHALL parsear el JSON retornado y pre-rellenar el formulario de revisión con los datos extraídos.
4. WHILE el VLM_Service procesa la imagen, THE Sistema SHALL mostrar un indicador de progreso al usuario.
5. IF el VLM_Service no está disponible o retorna un error, THEN THE Sistema SHALL activar el fallback: ejecutar el OCR_Engine con Tesseract.js y luego el Parser para extraer los campos.
6. IF tanto el VLM_Service como el OCR_Engine fallan, THEN THE Sistema SHALL mostrar el formulario de revisión manual con todos los campos vacíos y un mensaje descriptivo del error.
7. THE VLM_Service SHALL exponer una función `extractInvoiceData(imageBuffer: Buffer): Promise<Partial<Invoice>>` que retorne los campos detectados sin lanzar excepciones no controladas.
8. FOR ALL imágenes de comprobantes válidas, llamar a `extractInvoiceData` dos veces sobre la misma imagen SHALL producir resultados con los mismos campos numéricos (propiedad de consistencia).

---

### Requerimiento 3: Parser de comprobantes chilenos

**User Story:** Como usuario, quiero que el sistema reconozca automáticamente el formato de boletas y facturas chilenas, para que los datos se pre-rellenen correctamente.

#### Criterios de Aceptación

1. THE Parser SHALL detectar RUTs chilenos con el patrón `XX.XXX.XXX-X` o variantes sin puntos.
2. THE Parser SHALL detectar fechas en formatos `DD/MM/YYYY`, `DD-MM-YYYY` y `DD/MM/YY`.
3. THE Parser SHALL detectar montos precedidos por palabras clave como `TOTAL`, `NETO`, `IVA`, `EXENTO`, `SUBTOTAL` (insensible a mayúsculas).
4. THE Parser SHALL detectar el número de documento precedido por palabras clave como `BOLETA`, `FACTURA`, `N°`, `NRO`, `FOLIO`.
5. THE Parser SHALL detectar el método de pago cuando el texto contenga palabras como `EFECTIVO`, `DÉBITO`, `CRÉDITO`, `TRANSFERENCIA`.
6. WHERE el texto OCR contiene líneas con patrón `descripción cantidad precio_unitario total`, THE Parser SHALL extraer esas líneas como InvoiceItems.
7. THE Parser SHALL exponer una función `parseInvoiceText(rawText: string): Partial<Invoice>` que retorne los campos detectados sin lanzar excepciones.
8. FOR ALL textos de entrada válidos, ejecutar `parseInvoiceText` dos veces sobre el mismo texto SHALL producir resultados idénticos (propiedad idempotente).

---

### Requerimiento 4: Revisión y corrección manual de datos

**User Story:** Como usuario, quiero revisar y corregir los datos extraídos por el OCR antes de guardar el comprobante, para asegurar la exactitud contable.

#### Criterios de Aceptación

1. WHEN el OCR_Engine completa el procesamiento, THE Sistema SHALL mostrar un formulario editable pre-rellenado con los datos detectados por el Parser.
2. THE Sistema SHALL permitir editar los campos: nombre del proveedor, RUT, tipo de documento, número de documento, fecha, categoría, monto neto, monto IVA, monto exento, otros impuestos, total, método de pago y notas.
3. THE Sistema SHALL validar que el RUT ingresado cumpla el formato `XX.XXX.XXX-X` usando el algoritmo de verificación del dígito verificador chileno.
4. WHEN el usuario modifica los campos de monto neto, IVA, monto exento u otros impuestos, THE Sistema SHALL recalcular y mostrar el total esperado en tiempo real.
5. IF la diferencia entre el total ingresado y la suma de (neto + IVA + exento + otros impuestos) supera $1, THEN THE Sistema SHALL mostrar una advertencia de inconsistencia sin bloquear el guardado.
6. THE Sistema SHALL requerir que los campos fecha, categoría y total sean completados antes de permitir guardar.
7. WHEN el usuario guarda el comprobante, THE Sistema SHALL asignar el estado `pending` si no fue modificado manualmente, o `reviewed` si el usuario editó al menos un campo.

---

### Requerimiento 5: Gestión de comprobantes (CRUD)

**User Story:** Como usuario, quiero ver, editar y eliminar mis comprobantes registrados, para mantener el registro contable actualizado.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar todos los comprobantes en una tabla con columnas: fecha, proveedor, categoría, neto, IVA, total, estado y acciones.
2. THE Sistema SHALL permitir filtrar la lista por mes, año, categoría, proveedor (búsqueda parcial) y estado.
3. WHEN el usuario aplica un filtro, THE Sistema SHALL actualizar la lista en menos de 500 ms sin recargar la página.
4. THE Sistema SHALL permitir al usuario cambiar el estado de un comprobante a `approved` desde la vista de detalle o la lista.
5. WHEN el usuario solicita eliminar un comprobante, THE Sistema SHALL mostrar un diálogo de confirmación antes de proceder.
6. WHEN el usuario confirma la eliminación, THE Storage SHALL eliminar el comprobante y su imagen asociada de IndexedDB.
7. THE Sistema SHALL permitir editar todos los campos de un comprobante existente desde la vista de detalle.
8. WHEN se guarda una edición, THE Sistema SHALL actualizar el campo `updatedAt` con la fecha y hora actuales.

---

### Requerimiento 6: Vista de detalle de comprobante

**User Story:** Como usuario, quiero ver todos los datos de un comprobante en una sola pantalla, para verificar la información registrada.

#### Criterios de Aceptación

1. WHEN el usuario selecciona un comprobante, THE Sistema SHALL mostrar la imagen original del comprobante.
2. THE Sistema SHALL mostrar todos los campos contables del comprobante: proveedor, RUT, tipo, número, fecha, categoría, neto, IVA, exento, otros impuestos, total, método de pago, notas y estado.
3. WHERE el comprobante tiene InvoiceItems registrados, THE Sistema SHALL mostrar la tabla de ítems con descripción, cantidad, precio unitario y total por ítem.
4. THE Sistema SHALL mostrar el texto OCR original en un área de texto de solo lectura colapsable.
5. THE Sistema SHALL mostrar las fechas de creación (`createdAt`) y última modificación (`updatedAt`) del comprobante.

---

### Requerimiento 7: Dashboard con métricas y gráficos

**User Story:** Como usuario, quiero ver un resumen visual de mis gastos del mes actual, para tener una visión rápida de mi situación financiera.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar en el Dashboard las métricas del mes actual: total gastado, total IVA, total neto y cantidad de comprobantes.
2. THE Sistema SHALL mostrar un gráfico de torta o barras con el desglose de gastos por categoría del mes actual.
3. THE Sistema SHALL mostrar un gráfico de barras con el total gastado por mes de los últimos 12 meses.
4. THE Sistema SHALL mostrar una lista de los últimos 5 comprobantes cargados con fecha, proveedor, categoría y total.
5. WHEN no existen comprobantes registrados, THE Sistema SHALL mostrar datos de prueba predefinidos en el Dashboard para ilustrar las funcionalidades.
6. WHEN el usuario navega al Dashboard, THE Sistema SHALL calcular las métricas leyendo los datos actuales desde Storage.

---

### Requerimiento 8: Reportes por período y categoría

**User Story:** Como usuario, quiero generar reportes de gastos por mes y por categoría, para preparar mi declaración de impuestos.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar en la pantalla de Reportes una tabla con totales por mes: neto, IVA, exento, otros impuestos y total.
2. THE Sistema SHALL mostrar una tabla con totales por categoría: cantidad de comprobantes, neto, IVA y total.
3. THE Sistema SHALL permitir filtrar los reportes por rango de fechas (mes inicio y mes fin).
4. WHEN el usuario selecciona un período, THE Sistema SHALL recalcular los totales del reporte en menos de 1 segundo.
5. THE Sistema SHALL mostrar el total general acumulado de todos los períodos seleccionados.

---

### Requerimiento 9: Exportación a Excel y CSV

**User Story:** Como usuario, quiero exportar mis comprobantes y resúmenes a Excel o CSV, para compartirlos con mi contador o importarlos a otras herramientas.

#### Criterios de Aceptación

1. THE Export_Service SHALL generar un archivo Excel (.xlsx) con una hoja que contenga todos los comprobantes del período seleccionado, con columnas: fecha, proveedor, RUT, tipo, número, categoría, neto, IVA, exento, otros impuestos, total, método de pago, estado y notas.
2. THE Export_Service SHALL generar un archivo Excel con una hoja de resumen mensual: mes, cantidad de comprobantes, neto, IVA, total.
3. THE Export_Service SHALL generar un archivo Excel con una hoja de resumen por categoría: categoría, cantidad, neto, IVA, total.
4. THE Export_Service SHALL generar un archivo CSV con los mismos datos del listado completo de comprobantes.
5. WHEN el usuario solicita una exportación, THE Sistema SHALL generar y descargar el archivo en menos de 5 segundos para conjuntos de hasta 1000 comprobantes.
6. THE Export_Service SHALL exponer funciones puras que reciban un arreglo de Invoice y retornen el contenido del archivo, sin efectos secundarios adicionales.
7. FOR ALL arreglos de Invoice válidos, exportar a Excel y luego parsear el archivo resultante SHALL producir los mismos valores numéricos originales (propiedad round-trip de datos numéricos).

---

### Requerimiento 10: Persistencia con IndexedDB

**User Story:** Como usuario, quiero que mis datos se guarden localmente en el navegador, para no perder la información al cerrar la aplicación.

#### Criterios de Aceptación

1. THE Storage SHALL usar IndexedDB como mecanismo de persistencia para almacenar objetos Invoice incluyendo la imagen en formato base64 o Blob.
2. THE Storage SHALL exponer las operaciones: `saveInvoice`, `updateInvoice`, `deleteInvoice`, `getAllInvoices` y `getInvoiceById`.
3. WHEN se llama a `saveInvoice` con un Invoice válido, THE Storage SHALL persistir el objeto y retornar el Invoice guardado con su `id` asignado.
4. WHEN se llama a `getAllInvoices`, THE Storage SHALL retornar todos los comprobantes ordenados por `date` descendente.
5. IF una operación de IndexedDB falla, THEN THE Storage SHALL retornar un error descriptivo sin lanzar excepciones no controladas.
6. FOR ALL Invoice guardados con `saveInvoice`, llamar a `getInvoiceById` con el mismo `id` SHALL retornar un objeto con los mismos valores (propiedad round-trip de persistencia).
7. THE Storage SHALL inicializar la base de datos con los datos de prueba predefinidos si la base de datos está vacía al primer inicio.

---

### Requerimiento 11: Categorización de gastos

**User Story:** Como usuario, quiero asignar una categoría a cada comprobante, para agrupar y analizar mis gastos por tipo.

#### Criterios de Aceptación

1. THE Sistema SHALL proveer las siguientes categorías predefinidas: Supermercado, Combustible, Transporte, Servicios básicos, Arriendo, Comida, Insumos de trabajo, Equipamiento, Marketing, Internet/Telefonía, Otros.
2. THE Sistema SHALL requerir que cada comprobante tenga exactamente una categoría asignada antes de ser guardado.
3. WHEN el Parser detecta palabras clave asociadas a una categoría (ej. `COMBUSTIBLE`, `BENCINA` → Combustible), THE Parser SHALL pre-seleccionar esa categoría en el formulario de revisión.
4. THE Sistema SHALL mostrar la distribución de gastos por categoría en el Dashboard y en los Reportes.

---

### Requerimiento 12: Interfaz responsive y navegación

**User Story:** Como usuario, quiero usar la aplicación tanto en computador como en celular, para registrar gastos desde cualquier dispositivo.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar un sidebar lateral de navegación en pantallas con ancho mayor o igual a 768 px.
2. WHEN el ancho de pantalla es menor a 768 px, THE Sistema SHALL reemplazar el sidebar por un menú hamburguesa en la parte superior.
3. THE Sistema SHALL incluir las siguientes rutas de navegación: Dashboard (`/`), Cargar Comprobante (`/upload`), Comprobantes (`/invoices`), Reportes (`/reports`) y Configuración (`/settings`).
4. THE Sistema SHALL mantener el estado de los filtros activos al navegar entre páginas dentro de la misma sesión.
5. THE Sistema SHALL mostrar indicadores visuales de estado diferenciados: `pending` en amarillo, `reviewed` en azul y `approved` en verde.

---

### Requerimiento 13: Servidor Moondream2 y configuración del VLM_Service

**User Story:** Como administrador del sistema, quiero configurar el servidor Moondream2 que analiza las imágenes, para poder elegir entre una instancia local (Ollama) o una API remota según el entorno de despliegue.

#### Criterios de Aceptación

1. THE VLM_Service SHALL soportar dos modos de conexión configurables mediante variables de entorno: modo local (Ollama en `http://localhost:11434`) y modo remoto (URL de API externa).
2. THE Backend SHALL exponer un endpoint `GET /api/vlm/health` que retorne el estado de disponibilidad del servidor Moondream2.
3. WHEN el Backend inicia, THE VLM_Service SHALL verificar la conectividad con el servidor Moondream2 y registrar el resultado en el log de inicio.
4. THE VLM_Service SHALL construir el prompt enviado a Moondream2 solicitando una respuesta en formato JSON con los campos definidos en el Requerimiento 2.
5. IF la respuesta de Moondream2 no es JSON válido, THEN THE VLM_Service SHALL intentar extraer los campos mediante expresiones regulares sobre el texto retornado antes de activar el fallback OCR.
6. THE VLM_Service SHALL respetar un timeout configurable (por defecto 30 segundos) por solicitud; IF se supera el timeout, THEN THE VLM_Service SHALL activar el fallback OCR.
7. THE Backend SHALL registrar en log cada solicitud al VLM_Service con: timestamp, tamaño de imagen, tiempo de respuesta y modo de extracción utilizado (Moondream2 o fallback OCR).

---

### Requerimiento 14: Bot de Telegram para gestión de comprobantes

**User Story:** Como usuario, quiero gestionar mis comprobantes desde Telegram, para poder subir fotos, revisar datos y consultar reportes sin necesidad de abrir la interfaz web.

#### Criterios de Aceptación

1. THE Telegram_Bot SHALL responder al comando `/start` con un mensaje de bienvenida que liste los comandos disponibles.
2. THE Telegram_Bot SHALL responder al comando `/help` con la descripción de todos los comandos disponibles: `/start`, `/upload`, `/list`, `/report` y `/help`.
3. WHEN el usuario envía una foto directamente al chat o usa el comando `/upload` seguido de una imagen, THE Telegram_Bot SHALL descargar la imagen desde la Telegram_API y enviarla al VLM_Service para extracción de datos.
4. WHEN el VLM_Service retorna los datos extraídos, THE Telegram_Bot SHALL responder al usuario con un resumen de los campos detectados (proveedor, fecha, total, categoría sugerida) y solicitar confirmación.
5. WHEN el usuario responde con el comando `/confirmar`, THE Telegram_Bot SHALL guardar el comprobante en Storage con estado `reviewed` y confirmar el guardado al usuario.
6. WHEN el usuario responde con el comando `/corregir <campo> <valor>`, THE Telegram_Bot SHALL actualizar el campo indicado en el comprobante pendiente de confirmación y mostrar el resumen actualizado.
7. IF el usuario no confirma ni corrige el comprobante en un plazo de 10 minutos, THEN THE Telegram_Bot SHALL descartar los datos extraídos y notificar al usuario que la sesión expiró.
8. WHEN el usuario envía el comando `/list`, THE Telegram_Bot SHALL responder con los últimos 10 comprobantes registrados mostrando: fecha, proveedor, total y estado.
9. WHEN el usuario envía el comando `/list <mes> <año>` (ej. `/list 06 2025`), THE Telegram_Bot SHALL responder con todos los comprobantes del mes indicado.
10. WHEN el usuario envía el comando `/report`, THE Telegram_Bot SHALL responder con el resumen del mes actual: total gastado, total IVA, total neto y desglose por categoría.
11. WHEN el usuario envía el comando `/report <mes> <año>`, THE Telegram_Bot SHALL responder con el resumen del mes indicado.
12. IF el Telegram_Bot recibe un mensaje que no es foto ni comando reconocido, THEN THE Telegram_Bot SHALL responder con un mensaje indicando los comandos disponibles.
13. THE Telegram_Bot SHALL procesar solo mensajes provenientes de usuarios autorizados; IF un usuario no autorizado envía un mensaje, THEN THE Telegram_Bot SHALL responder con un mensaje de acceso denegado sin procesar la solicitud.
14. THE Backend SHALL exponer un endpoint `POST /api/telegram/webhook` para recibir actualizaciones de la Telegram_API mediante webhook.
15. FOR ALL fotos enviadas al Telegram_Bot, el flujo completo desde recepción de imagen hasta respuesta con datos extraídos SHALL completarse en menos de 60 segundos bajo condiciones normales de red.
