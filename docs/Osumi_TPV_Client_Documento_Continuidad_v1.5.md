# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 1.5  
**Fecha:** 15 de agosto de 2026  
**Estado:** Installation, importación legacy y Startup completados y probados. En el módulo **Ventas** están completados los bloques 1 a 9. El siguiente bloque planificado es **Ventas 10 — Finalización y pagos**, aunque antes de iniciarlo el usuario quiere revisar otro asunto.

## 1. Propósito del documento

Este documento reúne el contexto técnico y funcional necesario para continuar el desarrollo de Osumi TPV Client aunque se abra una conversación nueva o cambie la persona que trabaja en el proyecto.

Debe tratarse como un documento vivo. Al completar un bloque principal del plan de Ventas, cambiar una decisión arquitectónica o cerrar un hito, se actualizarán la versión, el estado actual, las decisiones y el siguiente paso.

> **Importante:** A partir de esta versión, al terminar **cada bloque principal de Ventas** se entregará una versión actualizada de este documento. Debe contener siempre la recapitulación completa del plan, qué está terminado, cuál es el bloque siguiente y las decisiones técnicas necesarias para retomar el desarrollo desde cero si cambia la conversación.

Los grandes hitos completados hasta ahora son:

- **Installation + importación legacy**.
- **Startup + precarga inicial de datos**.
- **Ventas 1 — Contexto operativo**.
- **Ventas 2 — Modelo de venta en curso + workspace persistente**.
- **Ventas 3 — Consulta/búsqueda de artículos y accesos directos**.
- **Ventas 4 — Estructura visual del módulo**.
- **Ventas 5 — Operaciones sobre líneas**.
- **Ventas 6 — Clientes y estadísticas rápidas**.
- **Ventas 7 — Varios**.
- **Ventas 8 — Devoluciones**.
- **Ventas 9 — Reservas**.

Todos ellos han sido probados por el usuario con la aplicación real. Los bloques anteriores están subidos al repositorio; Ventas 9 ha quedado funcionalmente validado y debe subirse junto con esta actualización documental si todavía no se ha hecho.

## 2. Estado actual del proyecto

- Aplicación de escritorio: Electron + Angular.
- Backend local: Node.js/TypeScript dentro de Electron.
- Persistencia local: SQLite mediante TypeORM y better-sqlite3.
- Instalación desde cero: completada.
- Importación desde Osumi TPV antiguo mediante `.otpv`: completada.
- Transformación de las 33 tablas legacy: completada.
- Importación de imágenes, iconos, documentos PDF, logo, configuración y secretos: completada.
- Promoción atómica desde staging a la instalación definitiva: completada.
- Comprobación inicial del estado de instalación mediante `ApplicationStateService`: completada.
- Ruta `/startup` y flujo de arranque visual: completados.
- Precarga global en memoria de marcas, proveedores, empleados, clientes, categorías y provincias: completada.
- Conexión SQLite operativa persistente durante la ejecución: implementada.
- Protocolo interno `osumi://assets/...` para recursos de la instalación: implementado y probado.
- Módulo Ventas operativo hasta el final del bloque 9.
- Las ventas abiertas viven en memoria en `VentasService` y sobreviven a la navegación entre módulos.
- El siguiente bloque funcional planificado es **Ventas 10 — Finalización y pagos**.

## 3. Repositorios y entorno

| Elemento | Valor |
| --- | --- |
| Cliente de escritorio | https://github.com/osumionline/Osumi-TPV-Client |
| Frontend antiguo | https://github.com/osumionline/Osumi-TPV |
| Backend antiguo | https://github.com/osumionline/TPV-API |
| API remota futura | https://github.com/osumionline/TPV-Client-API |
| Ruta local principal | `C:\Users\anacp\Documents\Angular\Osumi\Osumi-TPV-Client` |
| Sistema habitual | Windows 11 |
| Editor | Visual Studio Code |
| Zona horaria | Europe/Madrid |

Los repositorios activos usados como referencia (`Osumi-TPV`, `TPV-API` y `Osumi-TPV-Client`) se mantienen actualizados en GitHub. Antes de pedir archivos al usuario se debe consultar la versión actual del repositorio cuando sea posible. Solo se pedirán archivos cuando exista código local no subido, recursos no presentes en GitHub o una decisión funcional que el código no permita resolver.

Cuando GitHub Raw parezca devolver contenido en caché, usar un query string de cache-busting para consultar el estado actual.

## 4. Arquitectura objetivo

Osumi TPV Client es la evolución instalable de Osumi TPV. La primera etapa es monopuesto y local; la arquitectura debe permitir evolucionar a multipuesto sin duplicar la lógica de negocio.

- Angular se ocupa de interfaz, estado de presentación y formularios.
- El backend Electron/Node concentra lógica de negocio, validación y persistencia.
- El frontend envía acciones o comandos con payloads tipados.
- Una capa de persistencia decidirá en el futuro si la acción se ejecuta contra SQLite local o contra una API remota OFW.
- La selección local/remota dependerá de la configuración y licencia del equipo.
- La futura API remota reutilizará la misma semántica de acciones y reglas de negocio.
- Los contratos que cruzan Electron IPC viven en `electron/contracts` y se organizan por dominio.
- Los contratos internos del backend viven en `electron/backend/contracts` y también se organizan por dominio.

> **Principio arquitectónico:** la lógica de negocio no debe quedar repartida entre componentes Angular ni depender de detalles de SQLite.

## 5. Convenciones de desarrollo

- Angular moderno: componentes standalone, signals, `computed`, `input`/`output` e `inject()`.
- Control flow moderno: `@if`, `@for` y `@switch`.
- Tipado estricto; evitar `any` y preferir tipos explícitos incluso cuando TypeScript pueda inferirlos.
- No usar carpeta `core`. Servicios en `src/app/services`, guards en `src/app/guards`.
- Agrupación por dominio, por ejemplo `src/app/model/clientes/` o `src/app/model/ventas/`.
- `export default` cuando un archivo exporta un único elemento; exports nombrados cuando contiene varios.
- SCSS con anidamiento cuando mejora la legibilidad.
- En Angular 22 no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- Aliases activos: `@env`, `@app/*`, `@backend/*`, `@desktop-contracts/*` y los aliases específicos ya definidos en el proyecto.
- En código existente se debe indicar la ubicación exacta usando símbolos o fragmentos presentes en la versión actual.
- Los archivos nuevos se entregan completos.
- No asumir que un fragmento propuesto anteriormente continúa existiendo sin comprobarlo.
- Usar líneas en blanco para separar bloques lógicos, evitando fragmentación vertical innecesaria.
- La UI no debe depender de renders accidentales: cuando se muta un modelo vivo debe existir una notificación reactiva explícita.

## 6. Installation e importación legacy completadas

### 6.1 Selección, inspección e integridad

- Diálogo nativo para seleccionar `.otpv`.
- Inspección segura del ZIP y prevención de rutas peligrosas.
- Inventario de archivos, versiones, tablas y filas.
- SHA-256 del paquete y verificación de checksums.
- Revalidación antes de importar.

### 6.2 Análisis del dump

- Lector incremental de `database.sql`.
- Interpretación tipada de `INSERT`, `NULL`, números, booleanos y textos escapados.
- Detección de duplicados, referencias inválidas y restricciones incompatibles con SQLite.

### 6.3 Revisión y decisiones

- Informe previo a la importación.
- Resolución de conflictos bloqueantes.
- Decisiones manuales y automáticas validadas antes de importar.

### 6.4 Transformación

- Worker independiente y SQLite temporal.
- Importadores por fases con transacciones y rollback.
- Catálogo, artículos, etiquetas, códigos, caducidades e imágenes.
- Clientes, reservas, facturas y relaciones.
- Cajas, recuentos, movimientos, ventas, líneas, pagos y TicketBAI.
- Pedidos, líneas, vistas y documentos PDF.
- Histórico de artículos y almacén.

### 6.5 Activación definitiva

- Transformación de `app_data.json`.
- Separación y cifrado de secretos mediante `safeStorage`.
- Conversión del logo a PNG.
- Preparación de secuencias de tickets y facturas.
- Validación global de SQLite.
- Promoción atómica de base, archivos, logo, secretos y configuración.
- Recuperación ante promoción interrumpida.

## 7. Tablas legacy transformadas

El paquete legacy contiene 33 tablas y todas están cubiertas por el importador.

| Dominio | Tablas legacy |
| --- | --- |
| Catálogo | `articulo`, `codigo_barras`, `categoria`, `marca`, `etiqueta`, `etiqueta_web`, `articulo_etiqueta`, `articulo_etiqueta_web`, `foto`, `articulo_foto` |
| Stock e histórico | `caducidad`, `historico_articulo`, `historico_almacen` |
| Ventas | `venta`, `linea_venta` |
| Caja | `caja`, `caja_tipo`, `pago_caja` |
| Compras | `pedido`, `linea_pedido`, `pdf_pedido`, `vista_pedido` |
| Proveedores | `proveedor`, `comercial`, `proveedor_marca` |
| Clientes y facturación | `cliente`, `factura`, `factura_venta`, `reserva`, `linea_reserva` |
| Gestión | `empleado`, `empleado_rol`, `tipo_pago` |

## 8. Decisiones globales ya tomadas

- SQLite se crea completa; no se usan migraciones durante Installation.
- Los IDs legacy se conservan cuando resulta seguro y útil.
- Los `public_id` de la importación se generan de forma determinista a partir del origen; las entidades creadas durante el funcionamiento normal usan UUID nuevos.
- Precios se almacenan en céntimos o microeuros según la precisión necesaria.
- Porcentajes se almacenan en puntos básicos o microporcentaje.
- Efectivo es un tipo de pago explícito.
- Los archivos reciben nombres internos y se validan por tamaño y SHA-256.
- `app_data.json` es el último marcador de una instalación promovida correctamente.
- Los secretos no se guardan en texto plano en `app_data.json`.
- Referencias opcionales inválidas pueden normalizarse a `NULL` con advertencia; las esenciales provocan error.
- La base operativa se mantiene conectada durante la sesión mediante `TypeOrmApplicationDatabase`.
- Los servicios Angular de dominios precargados son propietarios de sus signals y recargan sus datos tras futuras operaciones CRUD.
- `ApplicationStartupService` orquesta la precarga, pero no almacena los datos de dominio.
- Los DTO que atraviesan IPC transportan strings directamente; no se usa `urlencode/urldecode`.

## 9. Startup completado

### 9.1 Flujo

```text
Arranque
  ↓
ApplicationStateService
  ├─ not-installed      → /instalacion
  ├─ incomplete/invalid → /estado-aplicacion
  └─ ready              → /startup
                              ↓
                     ApplicationStartupService
                              ↓
                          datos listos
                              ↓
                           /ventas
```

### 9.2 Datos precargados

Startup carga secuencialmente:

1. Marcas.
2. Proveedores + comerciales.
3. Empleados + permisos.
4. Clientes.
5. Categorías.
6. Provincias.

Los artículos **no** se precargan globalmente.

### 9.3 Servicios de dominio

Patrón general:

```text
SQLite
  ↓
Repository backend
  ↓
Application Service backend
  ↓
IPC
  ↓
preload.ts / window.osumiDesktop
  ↓
Service Angular
  ↓
DTO → modelo
  ↓
Signal readonly
```

### 9.4 Assets internos

El protocolo `osumi://assets` sirve recursos internos de la instalación y protege frente a path traversal y enlaces simbólicos fuera del directorio permitido.

### 9.5 Clientes en Startup

Startup carga solo la ficha base del cliente y `ultimaVenta`. Facturas, reservas, ventas detalladas y estadísticas quedan fuera de la precarga. `ultimaVenta` se calcula de forma agregada y `descuento_bps` cruza al frontend como porcentaje.

## 10. Plan maestro del módulo Ventas — recapitulación obligatoria

Esta recapitulación debe aparecer al comenzar cada nuevo bloque de desarrollo y mantenerse actualizada en este documento.

1. ✅ **Contexto operativo**
   - ✅ 1A — Lectura del contexto operativo.
   - ✅ 1B — Apertura de caja.
2. ✅ **Modelo de venta en curso + workspace persistente**.
3. ✅ **Consulta/búsqueda de artículos y accesos directos**.
4. ✅ **Estructura visual del módulo Ventas**.
5. ✅ **Operaciones sobre líneas**.
   - ✅ 5A — API del modelo/servicio.
   - ✅ 5B — Edición inline y foco.
   - ✅ 5C — Regalo y descuentos especiales.
   - ✅ 5D — Pruebas de regresión e integración.
6. ✅ **Clientes y estadísticas rápidas**.
   - ✅ 6A — Cliente en la venta + descuento por capas.
   - ✅ 6B — Selector y asociación de cliente.
   - ✅ 6C — Alta rápida + documento de protección de datos.
   - ✅ 6D — Estadísticas rápidas.
7. ✅ **Varios**.
   - ✅ 7A — Modelo funcional y operaciones de dominio.
   - ✅ 7B — Editor de Varios + integración con `0 + Intro`.
   - ✅ 7C — Edición desde la línea + pruebas de integración.
8. ✅ **Devoluciones**.
   - ✅ 8A — Consulta de la venta original y modelo de lectura.
   - ✅ 8B — Modelo de devolución dentro de la venta en curso.
   - ✅ 8C — Selector de líneas/unidades + integración con localizador.
   - ✅ 8D — Reapertura/edición + pruebas finales.
9. ✅ **Reservas**.
   - ✅ 9A — Consulta y gestión de reservas.
   - ✅ 9B — Reserva cargada dentro de `VentaEnCurso`.
   - ✅ 9C — Gestor de reservas + carga en una nueva venta.
   - ✅ 9D — Creación/persistencia de reservas + stock.
10. ⬜ **Finalización y pagos — siguiente bloque planificado**.
11. ⬜ **Persistencia transaccional**.
12. ⬜ **Postventa**.

> **Estado exacto al cerrar esta versión:** Ventas 1–9 están implementados y probados. El siguiente bloque planificado es **Ventas 10 — Finalización y pagos**, pero antes de iniciarlo el usuario quiere revisar otro asunto.

## 11. Ventas 1 — Contexto operativo ✅

### 11.1 Lectura del contexto

Antes de operar con una venta se resuelve el contexto necesario de la aplicación: empleado activo, caja y datos operativos necesarios para la sesión.

### 11.2 Apertura de caja

Se implementó el flujo de apertura de caja necesario para permitir la operativa de Ventas. El módulo de Caja completo queda para su hito específico; Ventas solo resuelve aquí el requisito previo que necesita para trabajar.

## 12. Ventas 2 — Venta en curso y workspace persistente ✅

### 12.1 Propiedad del estado

`VentasService` es propietario de las ventas abiertas durante la sesión.

- Las ventas abiertas sobreviven al navegar a otros módulos.
- Al volver a `/ventas` se reconstruyen las pestañas con todas sus líneas.
- Se restaura la venta/pestaña activa.
- Se restaura el foco/interacción en el punto donde estaba el usuario.

### 12.2 Separación negocio / presentación

`VentaEnCurso` representa el agregado de negocio de la venta. El estado de continuidad de interfaz vive aparte en `VentaWorkspaceState`.

El workspace contiene actualmente, entre otros:

- `focusTarget`;
- `totalPosition`;
- `clienteEstadisticasExpanded`.

Esta separación debe mantenerse en los bloques posteriores.

### 12.3 Reactividad de modelos vivos

`VentaEnCurso` y `VentaLineaEnCurso` son objetos vivos y mutables durante la sesión. Se detectó que crear únicamente un array exterior nuevo en `VentasService` no garantizaba que un hijo Angular que recibía la misma instancia de `VentaEnCurso` se renderizase inmediatamente.

Síntoma reproducido: al borrar una línea mediante un diálogo de confirmación, el modelo quedaba modificado pero la línea seguía visible hasta otro clic.

Corrección aplicada:

- `VentasService.notifyVentasChanged()` continúa notificando cambios del conjunto.
- `SaleWorkspaceComponent` utiliza una vista reactiva (`ventaView`) que depende explícitamente del signal de ventas y se invalida aunque la referencia del agregado siga siendo la misma.
- Las operaciones de UI que deben devolver al usuario al flujo de venta fuerzan también el `focusTarget` apropiado.

No volver a depender de eventos secundarios para que Angular repinte mutaciones internas.

## 13. Ventas 3 — Búsqueda de artículos y accesos directos ✅

- Los artículos no se precargan globalmente en Startup.
- Ventas dispone de consulta/búsqueda específica de artículos.
- Se conservan los accesos directos/localizadores necesarios para un TPV rápido.
- Introducir un localizador y pulsar Enter permite añadir el artículo a la venta.
- Si el mismo artículo ya existe en la venta, se incrementa la cantidad en lugar de crear una línea duplicada cuando corresponde.
- El input de localizador recupera foco tras las operaciones que terminan una interacción de venta.

## 14. Ventas 4 — Estructura visual ✅

Se implementó la estructura visual principal del módulo:

- pestañas de ventas abiertas;
- creación y cambio de venta;
- acciones superiores;
- workspace de la venta activa;
- tabla/listado de líneas;
- localizador para introducir artículos;
- total flotante y posición persistente por workspace.

Ajustes visuales relevantes:

- El módulo ocupa la altura disponible sin introducir scroll vertical global innecesario.
- Las pestañas pueden desplazarse horizontalmente, ocultando visualmente la scrollbar.
- El botón de cliente se estira a la altura interna de la barra para no cubrir el borde inferior al hacer hover.

## 15. Ventas 5 — Operaciones sobre líneas ✅

### 15.1 Modelo económico

`VentaLineaEnCurso` expone operaciones de dominio en lugar de permitir mutaciones externas arbitrarias.

Operaciones principales:

- cambiar/incrementar cantidad;
- regalo;
- importe manual;
- descuento promocional;
- descuento directo en euros;
- descuento porcentual manual;
- descuento procedente del cliente.

### 15.2 Precedencia económica

La precedencia actual es:

```text
1. Regalo → 0
2. Importe manual
3. Promoción del artículo
4. Descuento directo en €
5. Descuento porcentual manual
6. Descuento porcentual del cliente
7. PVP
```

Decisiones importantes:

- Regalo oculta temporalmente otros estados económicos sin destruirlos.
- Importe manual puede ocultar temporalmente descuentos porcentuales.
- Promoción impide otras modificaciones económicas incompatibles hasta retirarla.
- El descuento promocional escala correctamente con cantidad.
- Descuento directo en € es un importe fijo de línea.
- Descuento directo elimina el porcentaje manual, pero conserva la capa de descuento del cliente.
- Eliminar el directo permite que vuelva a emerger el descuento del cliente.
- Los totales suman microeuros primero y redondean a céntimos después.

### 15.3 Unidades monetarias

- Valores económicos internos: microeuros.
- Entradas de usuario en euros: se redondean a céntimos antes de convertir a microeuros.
- Porcentajes manuales se convierten a puntos básicos.

### 15.4 Permisos

El ID para modificaciones directas de importes se centralizó en:

```text
electron/contracts/permissions/permission-ids.constants.ts
```

La modificación directa de importes/descuentos en euros requiere el permiso `ventas.modificarImportes` salvo administrador. El descuento porcentual y el regalo conservan la semántica del TPV antiguo y no requieren ese permiso.

### 15.5 Edición y foco

La edición inline soporta cantidad, importe, porcentaje y descuento directo. `VentaWorkspaceState.focusTarget` permite restaurar el input concreto al volver al módulo o después de una actualización reactiva.

Eliminar una línea desde la papelera, tras confirmación, la elimina inmediatamente de la vista y devuelve el foco al localizador.

### 15.6 Pruebas

Se añadieron pruebas del modelo de línea y de `VentasService` para:

- promociones;
- regalos;
- importes manuales;
- descuentos manuales/directos;
- cantidades y validaciones;
- suma precisa de totales;
- artículos repetidos;
- comportamiento del foco;
- capas de descuento de cliente;
- estado independiente del workspace entre ventas.

La batería completa pasa al cerrar el bloque.

## 16. Ventas 6 — Clientes y estadísticas rápidas ✅

### 16.1 Cliente dentro de `VentaEnCurso`

`VentaEnCurso` mantiene `cliente: Cliente | null`.

Al asignar un cliente:

- se guarda en la venta;
- su descuento se aplica como capa de cliente a todas las líneas existentes;
- las líneas nuevas reciben automáticamente esa capa.

Al quitar el cliente, la capa de cliente se pone a cero sin destruir un posible override manual de la línea.

### 16.2 Descuentos por capas

`VentaLineaEnCurso` diferencia:

- `descuentoClienteBps`;
- `descuentoManualBps`;
- `descuentoBps` como getter del porcentaje efectivo.

El manual tiene prioridad sobre el del cliente, pero no destruye el valor subyacente.

La UI muestra el origen del descuento:

- icono de cliente cuando procede de la ficha;
- acción `restart_alt` cuando existe override manual;
- restaurar el override hace reaparecer el porcentaje del cliente.

Un override manual de `0 %` es distinto de no tener override.

### 16.3 Selector de clientes

`ClientSelectorComponent` permite:

- buscar por nombre, DNI/CIF, teléfono o email;
- búsqueda sin distinguir mayúsculas/acentos;
- seleccionar cliente;
- cambiar cliente;
- quitar cliente;
- cancelar por botón o backdrop accesible.

El backdrop es un `<button>` real para cumplir las reglas de accesibilidad de Angular ESLint.

Al seleccionar, quitar o cancelar, el selector se cierra y el foco vuelve al localizador de la venta.

### 16.4 Alta rápida reutilizable

Se implementó una vertical completa:

```text
Angular
  ↓
CrearClienteCommand
  ↓
window.osumiDesktop.clientes.create()
  ↓
IPC
  ↓
ClientesService backend
  ↓
ClienteRepository
  ↓
SQLite
```

Características:

- Nombre es el único dato obligatorio.
- Email es opcional y solo se valida si se rellena.
- Strings opcionales vacíos se normalizan a `null`.
- DNI/CIF activo se comprueba para evitar duplicados y SQLite mantiene la integridad.
- Descuento se convierte de porcentaje a bps en backend.
- `publicId` nuevo se genera con UUID.
- Se devuelven los datos completos del cliente creado.

### 16.5 `ClientesService.create()` Angular

Después de crear:

1. espera una lectura previa pendiente si existiese;
2. fuerza `reload()`;
3. busca el cliente por `publicId`;
4. devuelve la **instancia canónica** presente en `ClientesService.clientes()`.

La venta no conserva una copia aislada de la respuesta IPC.

### 16.6 Formulario reutilizable

`ClientFormComponent` vive bajo el dominio Clientes y no conoce Ventas ni Electron.

- Usa Angular Signal Forms.
- Modelo, valores iniciales, schema y mapper están separados.
- Soporta datos personales, dirección, provincia, descuento, observaciones y datos de facturación.
- `factIgual` decide si los campos alternativos de facturación se persisten o se envían como `null`.
- Provincias reutilizan `ProvinciasService`.

### 16.7 Guardar y seleccionar

El selector tiene modos `search` y `create`.

Tras crear correctamente:

```text
ClientForm
  ↓
ClientSelector
  ↓
ClientesService.create()
  ↓
Cliente canónico
  ↓
createdEvent/select
  ↓
SalesComponent
  ↓
asignar cliente
  ↓
aplicar descuentos
  ↓
cerrar selector
```

Los errores de creación se muestran dentro del selector y no destruyen el formulario.

### 16.8 Documento de protección de datos

Se decidió mantener el comportamiento práctico del TPV antiguo de generar inmediatamente un documento al crear la ficha, pero se reformuló jurídicamente.

No se trata como un “consentimiento LOPD general”. El documento se titula:

**Ficha de cliente e información sobre protección de datos**

Incluye:

- datos del responsable/empresa;
- datos del cliente;
- huecos imprimibles para campos no rellenados;
- datos de facturación si son distintos;
- información sobre responsable, finalidades, legitimación, conservación, destinatarios, derechos y decisiones automatizadas;
- constancia de entrega de información;
- fecha y firma.

No se imprimen `descuento` ni `observaciones`, por ser datos internos del comercio.

La firma deja constancia de recepción de la información; no se presenta como autorización general para cualquier tratamiento ni para publicidad.

No existen actualmente consentimientos opcionales de marketing. Si el producto incorpora en el futuro campañas, newsletter, SMS u otras finalidades basadas en consentimiento, se diseñarán consentimientos separados por finalidad.

### 16.9 Impresión

Tras **Guardar y seleccionar** un cliente recién creado:

1. el cliente queda persistido y asociado a la venta;
2. se abre una nueva ventana imprimible;
3. se construye HTML escapando todos los datos dinámicos;
4. se ejecuta automáticamente `window.print()`;
5. la ventana conserva botones para volver a imprimir o cerrar.

Un fallo al abrir/imprimir nunca revierte ni presenta como fallida la creación del cliente, porque el registro ya está persistido.

### 16.10 Estadísticas rápidas

Se conservó la idea del TPV antiguo de mostrar:

- **Últimas ventas**;
- **Top ventas**.

Pero se eliminó la carga ineficiente de todo el histórico en PHP.

SQLite realiza consultas específicas:

- últimas 20 líneas compradas mediante `ORDER BY + LIMIT`;
- top 10 artículos mediante `SUM + GROUP BY + LIMIT`.

Los contratos mantienen importes en microeuros.

### 16.11 Caché de estadísticas

`ClientesService` mantiene una caché de estadísticas por `publicId` separada del modelo `Cliente`.

El estado distingue:

- `data`;
- `loading`;
- `error`.

Además:

- deduplica peticiones simultáneas;
- permite `loadEstadisticas()` usando caché;
- permite `reloadEstadisticas()` forzado;
- conserva datos previos si falla una recarga;
- invalida respuestas antiguas mediante una generación cuando se ejecuta `clear()`.

Después de Ventas 11, cuando se persista una venta, se podrá forzar la recarga del histórico del cliente.

### 16.12 UI de estadísticas

`ClientStatisticsComponent` muestra el histórico en un panel inferior izquierdo con dos columnas, manteniendo libre la zona del total flotante.

- Aparece solo cuando la venta tiene cliente.
- Puede plegarse/desplegarse.
- El estado plegado pertenece al workspace de cada venta.
- Cambiar de pestaña conserva el estado específico de esa venta.
- Un cliente nuevo muestra histórico vacío.
- Error de carga ofrece reintento.
- Cambiar de cliente reutiliza la caché cuando ya existe.

`Cliente.publicId` es `string | null`, por lo que el componente comprueba explícitamente `null` antes de cargar o recargar estadísticas; no se usa non-null assertion.

## 17. Ventas 7 — Varios ✅

### 17.1 Entrada desde el localizador

El código especial `0 + Intro` abre el editor de una línea libre **Varios**.

A diferencia del TPV antiguo, la línea **no se crea antes de confirmar el editor**:

```text
0 + Intro
  ↓
Editor Varios
  ├─ Cancelar → la venta no cambia
  └─ Guardar  → se crea la línea
```

Con ello se corrigió el fallo legacy por el que cancelar podía dejar una línea `Varios` de 0 € dentro de la venta.

Los localizadores negativos siguen reservados para **Ventas 8 — Devoluciones**.

### 17.2 Modelo de dominio

Se añadió `VentaVariosData` con:

- `descripcion`;
- `pvpMicros`;
- `ivaBps`.

`VentaLineaEnCurso` dispone de:

- `fromVarios(data)`;
- getter `esVarios`;
- `setDatosVarios(data)`.

Una línea Varios se representa realmente como línea libre y **no como un artículo ficticio con ID 0**:

```text
idArticulo       = null
articuloPublicId = null
localizador      = 0
marca            = "Varios"
stock            = null
cantidad         = 1
pucMicros        = 0
```

Esto encaja con el esquema SQLite nuevo, donde `linea_venta.id_articulo` puede ser `NULL`.

Cada ejecución de `0 + Intro` crea siempre una línea independiente. Los Varios nunca se agrupan automáticamente entre sí.

### 17.3 Reglas económicas

Decisiones funcionales fijadas:

- cualquier empleado que pueda vender puede introducir un Varios;
- no se exige el permiso `ventas.modificarImportes` para indicar su PVP;
- el PVP puede ser `0 €`;
- el nombre es obligatorio y debe tener entre 1 y 200 caracteres;
- cantidad inicial `1`;
- el Varios puede utilizar después las operaciones normales de línea: cantidad, regalo y descuentos;
- al crearse mediante `VentaEnCurso.addLinea()`, recibe automáticamente la capa de descuento del cliente activo;
- editar nombre/PVP/IVA no destruye cantidad, regalo ni las capas de descuento existentes;
- si existe un descuento directo fijo, no se permite reducir el PVP hasta dejar el descuento por encima del importe base de la línea.

### 17.4 IVA por defecto

La regla acordada para un nuevo Varios es deliberadamente conservadora:

1. si `21 %` está configurado en `appData.ivaList`, se selecciona `21 %`;
2. si no existe `21 %`, se selecciona **el IVA más alto configurado**.

La razón funcional es evitar que un despiste seleccione por defecto un tipo inferior al que finalmente corresponda.

La regla está encapsulada y probada mediante:

- `getVariosIvaOptionsBps()`;
- `getDefaultVariosIvaBps()`.

Se detectó además un problema visual con el `<select matNativeControl>`: aunque el signal contenía correctamente `2100` bps, el navegador dejaba seleccionada la primera opción creada por el `@for`. Se corrigió haciendo que cada `<option>` declare explícitamente:

```html
[selected]="optionIvaBps === ivaBps()"
```

Los tests del helper ya demostraban que el cálculo era correcto; el fallo estaba únicamente en la representación del `<select>`.

### 17.5 Editor reutilizable

`VariosEditorComponent` permite crear y editar una línea Varios usando el mismo formulario:

- nombre;
- PVP;
- IVA.

En creación:

- título `Introducir Varios`;
- nombre inicial `Varios`;
- PVP inicial `0`;
- IVA según la regla anterior;
- foco inicial en PVP con el contenido seleccionado.

En edición:

- título `Editar Varios`;
- se cargan nombre, PVP e IVA actuales;
- no se recalcula ningún IVA por defecto.

El estado se modela con `VentaVariosEditorState`:

```text
lineaIdTemporal = null   → creación
lineaIdTemporal = string → edición
```

El `SaleWorkspaceComponent` impide la restauración automática del foco al localizador mientras el editor está abierto.

### 17.6 Edición desde la línea

La descripción de un Varios se representa como acción interactiva.

Al hacer clic:

```text
línea Varios
  ↓
clic en descripción
  ↓
Editar Varios
  ↓
Guardar
  ↓
misma instancia de VentaLineaEnCurso actualizada
```

Los artículos normales conservan la descripción puramente informativa y no abren este editor.

Cancelar una edición no modifica ningún dato.

Guardar o cancelar termina devolviendo al usuario al flujo normal del TPV y al localizador.

### 17.7 Servicio y reactividad

`VentasService` expone:

- `agregarVarios(...)`;
- `actualizarVarios(...)`.

`agregarVarios()` no busca líneas previas equivalentes y crea siempre una nueva.

`actualizarVarios()` exige que la línea sea realmente `esVarios`, por lo que no puede utilizarse como vía para modificar artículos normales.

Las operaciones notifican mediante el mismo mecanismo reactivo de Ventas ya corregido en bloques anteriores, por lo que los cambios se reflejan inmediatamente sin depender de clics o renders secundarios.

### 17.8 Persistencia

Ventas 7 no introduce todavía escritura en backend/IPC/SQLite.

Las líneas Varios viven dentro de la venta en curso igual que las demás líneas. Su persistencia real se realizará en **Ventas 11 — Persistencia transaccional**.

El esquema ya está preparado:

- `linea_venta.id_articulo` puede ser `NULL`;
- `nombre_articulo` conserva la descripción;
- PVP e importe se almacenan en microeuros;
- IVA se almacena en puntos básicos.

### 17.9 Pruebas y validación

Se añadieron pruebas para:

- creación de línea Varios;
- PVP `0`;
- validación de descripción/PVP/IVA;
- conservación de cantidad, regalo y descuentos durante edición;
- protección del descuento directo frente a una reducción incompatible de PVP;
- líneas Varios independientes;
- aplicación del descuento de cliente;
- actualización sin sustituir la instancia;
- recálculo del total;
- rechazo de `actualizarVarios()` sobre un artículo normal;
- regla de IVA por defecto.

El usuario realizó además pruebas manuales completas de creación, cancelación, edición, varios independientes, descuentos, regalo, borrado y selección de IVA. La batería completa (`test`, `typecheck:electron`, `build`, `lint`) pasa y los cambios están subidos al repositorio.

## 18. Ventas 8 — Devoluciones ✅

### 18.1 Compatibilidad con tickets y QR legacy

Los tickets existentes codifican en su QR el `id` interno de la venta como número negativo:

```text
venta.id = 123
QR       = -123
```

Esta nomenclatura debe mantenerse porque existen tickets antiguos todavía en circulación.

La importación legacy conserva explícitamente los identificadores originales de `venta` y `linea_venta`, por lo que una venta histórica importada mantiene el mismo `id` y los QR existentes siguen siendo válidos.

En el renderer:

```text
-123
  ↓
se reconoce como devolución
  ↓
se elimina el signo
  ↓
getDevolucion(123)
```

El signo negativo es una convención de entrada del TPV; el backend trabaja siempre con el identificador positivo.

### 18.2 Read model histórico y consulta vertical

Se creó una consulta específica para recuperar únicamente la información necesaria para una devolución.

El contrato `VentaDevolucionInterface` incluye:

- cabecera de la venta original;
- `id` y `publicId`;
- serie y número;
- fecha;
- cliente;
- total original;
- pagos originales;
- líneas históricas con datos económicos;
- unidades compradas;
- unidades ya devueltas;
- unidades todavía disponibles.

La vertical está separada en:

- contrato público de Electron;
- record interno de backend;
- `VentasDevolucionesRepository`;
- implementación TypeORM;
- `VentasDevolucionesService`;
- IPC `ventas:get-devolucion`;
- preload `window.osumiDesktop.ventas.getDevolucion(idVenta)`;
- servicio Angular de consulta.

No se cargan históricos completos para realizar una devolución.

### 18.3 Control de unidades ya devueltas

El nuevo flujo corrige una limitación del TPV antiguo.

Para cada línea positiva original se calcula:

```text
unidadesDisponibles =
    max(unidades - unidadesDevueltas, 0)
```

Ejemplo:

```text
compradas             3
devueltas previamente 1
disponibles            2
```

No se permite devolver más de esas 2 unidades.

Las líneas completamente devueltas no desaparecen del selector. Se muestran como información histórica con:

```text
unidadesDisponibles = 0
```

y quedan deshabilitadas.

Las líneas históricas con cantidad no positiva tampoco pueden volver a devolverse.

### 18.4 Modelo de devolución dentro de `VentaEnCurso`

Se añadieron:

- `VentaDevolucionOrigen`;
- `VentaLineaDevolucionOrigen`;
- `VentaDevolucionSeleccion`.

`VentaEnCurso` mantiene como máximo un `devolucionOrigen` activo.

Cada `VentaLineaEnCurso` de devolución mantiene una referencia exacta a su `linea_venta` histórica mediante ID/publicId y conserva además:

- unidades originales;
- unidades devueltas previamente;
- unidades disponibles;
- importe histórico final;
- información histórica de descuento;
- estado histórico de regalo.

La cantidad real dentro de la venta en curso es negativa:

```text
1 unidad devuelta → cantidad = -1
2 unidades        → cantidad = -2
```

La UI de selección trabaja con cantidades positivas y utiliza `setUnidadesDevolucion()` como única vía válida de modificación.

El getter `esDevolucion` distingue estas líneas de las ordinarias.

`esVarios` excluye expresamente las devoluciones, ya que una devolución de un antiguo Varios puede tener artículo nulo y localizador `0` sin ser un Varios editable.

### 18.5 Economía histórica exacta

Una devolución no utiliza:

- precio actual del artículo;
- descuento actual del cliente;
- descuento manual actual;
- promociones actuales.

El importe a devolver parte del **importe histórico final realmente cobrado** en `linea_venta.importe_micros`.

Las devoluciones parciales utilizan un reparto proporcional acumulativo. En lugar de redondear cada unidad de forma independiente, se calcula la diferencia entre dos acumulados proporcionales.

Esto garantiza que, si finalmente se devuelven todas las unidades mediante varias operaciones parciales, la suma de las devoluciones reproduce exactamente el importe histórico de la línea, sin perder ni duplicar microeuros por redondeo.

`importeFinalMicros` de una devolución es siempre el negativo del importe histórico que corresponda devolver.

### 18.6 Protección del dominio

Las líneas de devolución quedan blindadas frente a operaciones ordinarias.

No se permite utilizar sobre ellas:

- `setCantidad()`;
- `setRegalo()`;
- importe manual;
- descuento de cliente;
- descuento porcentual manual;
- descuento directo;
- eliminación de descuento promocional.

Estas restricciones viven en el propio modelo mediante `requireNotDevolucion(...)`, no solamente en la interfaz.

Una devolución sí puede cambiar sus unidades, pero únicamente mediante:

```text
setUnidadesDevolucion(unidades)
```

que valida el máximo disponible.

El cliente actual de la venta tampoco altera económicamente las líneas de devolución.

### 18.7 Una venta de origen por pestaña, otras ventas libres

Regla funcional acordada:

- una misma `VentaEnCurso` solo puede tener una venta histórica de origen en devolución a la vez;
- mientras exista esa devolución no se puede cargar otro ticket distinto en la misma pestaña;
- otras pestañas de venta pueden abrirse y utilizarse normalmente.

Eliminar la última línea de devolución libera `devolucionOrigen`, por lo que esa pestaña vuelve a poder iniciar una devolución de otro ticket.

### 18.8 Devolución y compra en la misma operación

Se mantiene el flujo habitual de cambio:

```text
Artículo devuelto   -20 €
Artículo nuevo      +35 €
-------------------------
TOTAL                15 €
```

`VentaEnCurso.totalMicros` suma naturalmente importes positivos y negativos.

`VentasService.agregarArticulos()` excluye las líneas de devolución al buscar un artículo existente. Por ello, devolver un artículo y escanear después ese mismo artículo como compra genera dos líneas independientes:

```text
-1 Camiseta
+1 Camiseta
```

y nunca incrementa accidentalmente la línea negativa.

### 18.9 Selector de devolución

`ReturnSelectorComponent` muestra:

- ticket;
- fecha;
- cliente;
- total histórico;
- uno o varios medios de pago;
- todas las líneas originales;
- unidades compradas;
- unidades ya devueltas;
- unidades disponibles;
- cantidad que se desea devolver;
- PVP;
- descuento histórico;
- importe histórico.

Seleccionar una línea propone por defecto todas las unidades todavía disponibles, aunque el usuario puede reducir la cantidad.

El selector permite seleccionar todas las líneas devolvibles.

No permite continuar sin al menos una línea válida.

Cancelar no modifica la venta.

Las líneas de devolución se diferencian visualmente en el workspace y sus controles económicos ordinarios están deshabilitados u ocultos.

### 18.10 Integración con el localizador

Los códigos negativos quedan reservados a devoluciones:

```text
-123 + Intro / QR
      ↓
consulta venta.id = 123
      ↓
selector de devolución
      ↓
selección de líneas/unidades
      ↓
líneas negativas en VentaEnCurso
```

Si el ticket no existe, el código no es válido o esa pestaña ya contiene una devolución de otro ticket, se muestra un error controlado y el foco regresa al localizador.

### 18.11 Reapertura y edición

Una devolución cargada puede volver a abrirse haciendo clic en la descripción de cualquiera de sus líneas.

La edición no conserva una copia histórica arbitrariamente vieja. Se vuelve a consultar el ticket por su `id`, se comprueba su `publicId` y se reconstruye la selección actual mediante los identificadores exactos de las líneas de origen.

`ReturnSelectorComponent` admite `initialSelection` y muestra las líneas/cantidades actuales ya marcadas.

Al confirmar:

- las líneas de devolución anteriores se sustituyen por la nueva selección;
- las líneas normales de compra permanecen intactas.

Cancelar la edición no modifica nada.

Si la disponibilidad histórica hubiera cambiado y la selección actual superase el máximo recién consultado, se obliga a revisar la devolución.

### 18.12 Eliminación de líneas

Eliminar una línea individual de devolución funciona como en cualquier otra línea del workspace.

Si quedan otras líneas de la misma devolución, `devolucionOrigen` continúa activo.

Si se elimina la última:

```text
devolucionOrigen = null
```

y la venta queda liberada para iniciar otra devolución.

### 18.13 Persistencia pendiente

Ventas 8 no persiste todavía la nueva operación.

El esquema SQLite ya anticipa el flujo:

- `venta.total_cents` puede ser negativo;
- `venta_pago.importe_cents` puede ser negativo;
- `linea_venta.unidades` puede ser negativo;
- `linea_venta.unidades_devueltas` acumula las unidades que ya se han devuelto.

La escritura transaccional de la nueva venta y la actualización de `unidades_devueltas` de las líneas históricas se realizará en **Ventas 11 — Persistencia transaccional**.

La finalización económica y los pagos/refundos corresponden a **Ventas 10 — Finalización y pagos**.

### 18.14 Pruebas y validación

Se añadieron pruebas para, entre otros casos:

- creación de una línea de devolución;
- cantidad e importe negativos;
- devoluciones parciales;
- reparto acumulativo del importe histórico;
- rechazo de modificaciones económicas normales;
- exclusión del descuento del cliente;
- compra del mismo artículo que se está devolviendo;
- sustitución de una selección conservando compras normales;
- rechazo de un segundo ticket origen en la misma venta;
- liberación al eliminar la última línea.

El usuario probó además el método de consulta directamente desde DevTools con datos reales y realizó el flujo completo en la aplicación:

- lectura de QR/localizador negativo;
- selector;
- unidades disponibles;
- combinación con compras;
- reapertura;
- modificación;
- cancelación;
- eliminación;
- trabajo simultáneo con otras ventas.

Toda la batería de pruebas (`test`, `typecheck:electron`, `build`, `lint`) y las pruebas manuales han sido validadas. Los cambios están subidos al repositorio.

## 19. Ventas 9 — Reservas ✅

### 19.1 Reglas funcionales acordadas

Antes de implementar el bloque se revisó el comportamiento completo del TPV antiguo y se fijaron expresamente estas reglas para el Client:

- se pueden cargar varias reservas a la vez únicamente si pertenecen al mismo cliente;
- líneas de reservas distintas no se agrupan aunque correspondan al mismo artículo;
- una línea cargada desde reserva conserva exactamente su economía histórica;
- la cantidad final de una línea reservada puede ser menor, igual o mayor que la reservada;
- una venta cargada desde reserva puede añadir artículos nuevos;
- el cliente queda bloqueado mientras existan reservas cargadas;
- cargar reservas crea siempre una nueva pestaña;
- eliminar una línea o una reserva activa devuelve inmediatamente su stock;
- una venta que contiene devoluciones no puede convertirse en reserva;
- una venta que ya procede de reservas tampoco puede volver a reservarse;
- se mantienen conceptualmente las variantes `Reserva` y `Reserva sin ticket`, pero la elección visual y la impresión pertenecen a Ventas 10.

También se corrigieron dos fallos del TPV antiguo:

1. no se deduplican líneas de distintas reservas por `idArticulo`;
2. no se reaplica el descuento actual del cliente a una línea reservada.

### 19.2 API y read model independiente de Reservas

Reservas se implementó como dominio propio de Electron, separado de `VentasApi`.

Se añadieron contratos públicos para:

- `ReservaInterface`;
- `ReservaLineaInterface`;
- `ReservasApi`.

El read model de una reserva contiene:

- `id` y `publicId`;
- cliente;
- fecha;
- total;
- todas sus líneas;
- artículo/publicId cuando existe;
- localizador y marca;
- nombre histórico;
- PUC;
- PVP;
- IVA;
- importe final;
- descuento porcentual;
- descuento fijo histórico;
- unidades.

Hacia Angular los importes se expresan en microeuros. Internamente, el backend refleja la resolución real del esquema SQLite y transforma céntimos ↔ microeuros en la frontera correspondiente.

### 19.3 Consulta de reservas activas

Se creó la vertical completa:

```text
Angular ReservasService
        ↓
window.osumiDesktop.reservas
        ↓
IPC reservas:*
        ↓
ReservasService backend
        ↓
ReservasRepository
        ↓
SQLite
```

`findAllActive()` recupera únicamente reservas cuyo `deleted_at` es `NULL`, con sus líneas y datos del cliente/artículo.

Reservas no se precargan durante Startup. Son una función ocasional y el gestor fuerza una recarga al abrirse para trabajar con información actual.

### 19.4 Eliminación transaccional de líneas

Eliminar una línea activa de reserva:

1. inicia una transacción;
2. localiza la línea y su reserva;
3. devuelve al stock sus unidades si tiene artículo;
4. elimina la línea cuando quedan otras;
5. recalcula `reserva.total_cents` a partir de las líneas restantes;
6. confirma la transacción.

Si era la última línea, la operación equivale a cancelar la reserva completa y se aplica borrado lógico a la cabecera.

Esto corrige un fallo legacy: el backend antiguo devolvía stock y eliminaba la línea pero no recalculaba el total persistido de la reserva.

Una línea con `id_articulo = NULL` no modifica stock.

### 19.5 Cancelación transaccional de una reserva

Eliminar una reserva completa:

1. inicia una transacción;
2. recupera todas sus líneas;
3. restaura el stock de cada artículo;
4. aplica `deleted_at` y `updated_at` sobre la cabecera;
5. conserva `linea_reserva` como histórico;
6. confirma la transacción.

Ante cualquier error se ejecuta rollback.

Se usa soft-delete porque el esquema nuevo dispone expresamente de `reserva.deleted_at`.

### 19.6 Modelo de origen dentro de la venta

Se añadieron:

- `VentaLineaReservaOrigen`;
- `VentaReservaOrigen`.

Cada línea reservada conserva la identidad exacta de:

```text
reserva
linea_reserva
```

y el snapshot histórico necesario:

- unidades reservadas;
- importe histórico;
- descuento porcentual;
- descuento histórico fijo;
- artículo/publicId.

`VentaEnCurso.reservasOrigen` mantiene el snapshot completo de todas las reservas cargadas.

Este snapshot **no se elimina** aunque el usuario borre visualmente una línea reservada de la venta. Ventas 11 lo necesitará para reconciliar:

```text
unidades reservadas
vs.
unidades finalmente vendidas
```

sin recurrir al truco legacy de conservar líneas visibles con cantidad `0`.

### 19.7 `VentaLineaEnCurso.fromReserva()`

Una línea cargada desde reserva tiene:

```text
esReserva = true
esDevolucion = false
esVarios = false
```

La exclusión de `esVarios` es importante porque `linea_reserva.id_articulo` puede ser `NULL`.

La línea conserva:

- descripción histórica;
- PUC;
- PVP;
- IVA;
- importe histórico;
- descuento histórico;
- cantidad reservada;
- identidad exacta de reserva/línea.

No muestra stock ordinario porque esas unidades ya fueron inmovilizadas al crear la reserva.

### 19.8 Cantidad final de una línea reservada

Las líneas reservadas no usan `setCantidad()` directamente.

Su única vía válida es:

```text
setCantidadReserva(cantidad)
```

La cantidad debe ser un entero positivo pero puede ser:

- menor que la reservada;
- igual;
- mayor.

Ejemplo:

```text
reservadas 2
venta final 1 → Ventas 11 devolverá 1 al stock

reservadas 2
venta final 2 → sin ajuste adicional

reservadas 2
venta final 3 → Ventas 11 descontará 1 adicional
```

### 19.9 Economía histórica bloqueada

Una línea de reserva no recibe:

- descuento actual del cliente;
- importe manual nuevo;
- descuento manual nuevo;
- descuento directo nuevo;
- promociones nuevas;
- estado de regalo nuevo.

El dominio lo impide mediante `requireNotReserva(...)`.

`importeFinalMicros` utiliza `importeReservaMicros`, calculado proporcionalmente a partir del importe histórico reservado.

Si:

```text
2 unidades → 18 €
```

entonces:

```text
1 → 9 €
2 → 18 €
3 → 27 €
```

El descuento histórico fijo dispone también de un getter proporcional.

Esto evita reinterpretar a posteriori cómo se formó el precio reservado.

### 19.10 Cliente bloqueado y compras nuevas

`VentaEnCurso.setCliente()` y `clearCliente()` rechazan cambios mientras `tieneReservas` sea `true`.

Al cargar reservas se asigna el cliente directamente, sin ejecutar `setCliente()`, para evitar reaplicar su descuento actual a las líneas históricas.

Sin embargo, los artículos nuevos añadidos después siguen siendo líneas ordinarias y sí reciben el descuento actual del cliente.

Ejemplo:

```text
Camiseta reservada → conserva 18 € históricos
Pantalón nuevo     → usa descuento actual del cliente
```

### 19.11 Carga múltiple sin deduplicación

`crearVentaDesdeReservas()` valida antes de abrir ninguna pestaña que:

- existe al menos una reserva;
- todas pertenecen al mismo cliente persistido;
- no se repite una reserva;
- ninguna reserva está ya cargada en otra venta abierta;
- todas tienen líneas válidas.

Después crea una nueva venta y llama a `setReservas(...)`.

No existe deduplicación por artículo.

Dos reservas:

```text
Reserva A: Camiseta x1
Reserva B: Camiseta x2
```

producen:

```text
Camiseta x1 [A]
Camiseta x2 [B]
```

Si después se escanea otra Camiseta:

```text
Camiseta x1 [A]
Camiseta x2 [B]
Camiseta x1 [compra nueva]
```

y sucesivos escaneos incrementan únicamente la línea ordinaria.

### 19.12 Reserva cargada en una sola venta abierta

`VentasService.reservasCargadasPublicIds` expone los `publicId` de reservas que ya viven en alguna pestaña abierta.

Una reserva cargada:

- sigue visible en el gestor;
- puede inspeccionarse;
- aparece bloqueada;
- no puede volver a cargarse;
- no puede eliminarse ni modificarse desde el gestor.

Al cerrar la venta abierta, vuelve a quedar disponible.

La protección existe tanto en UI como en `VentasService`.

### 19.13 Gestor de reservas

Se creó `ReservationManagerComponent`.

Permite:

- listar reservas activas;
- seleccionar una para ver detalle;
- seleccionar varias del mismo cliente;
- cargar una sola reserva;
- cargar varias;
- eliminar líneas con confirmación;
- cancelar reservas completas con confirmación;
- identificar reservas ya cargadas mediante candado.

La incompatibilidad entre clientes se detecta al marcar la reserva, no únicamente al confirmar.

El detalle muestra:

- fecha;
- cliente;
- total;
- localizador;
- marca;
- descripción;
- unidades;
- PVP;
- descuento histórico;
- importe;
- acciones.

Las operaciones destructivas recargan después la colección canónica de `ReservasService`.

### 19.14 Apertura de nueva pestaña y empleado

El botón Reservas (`grading`) quedó activado en las pestañas de Ventas.

Cargar reservas no reutiliza la venta activa: crea siempre una nueva pestaña.

Se mantiene la misma política de empleado que en una venta ordinaria:

- si la configuración no exige selección, se utiliza directamente el empleado disponible;
- si hay que elegirlo, aparece el selector antes de crear la venta reservada.

La venta que estuviera activa antes permanece intacta.

### 19.15 Representación visual en el workspace

Las líneas procedentes de reserva:

- usan un fondo diferenciado;
- muestran icono `bookmark`;
- identifican visualmente su procedencia;
- permiten editar cantidad;
- deshabilitan regalo e importe;
- muestran descuento histórico de solo lectura;
- muestran `-` como stock.

El cliente queda visualmente bloqueado en la pestaña.

El usuario confirmó que el resultado visual es correcto y agradable.

### 19.16 Creación de una reserva desde una venta

Se añadió `CrearReservaCommand` como contrato público y `CrearReservaRecordCommand` como command interno.

El renderer no envía IDs SQLite ni un total redundante.

El command público contiene:

```text
clientePublicId
lineas[]
```

y cada línea incluye:

- artículo `publicId` o `null`;
- nombre;
- PUC;
- PVP;
- IVA;
- importe final;
- descuento porcentual;
- descuento fijo histórico;
- unidades.

El backend valida y normaliza toda la estructura y calcula `totalCents` a partir de sus líneas.

### 19.17 Snapshot económico al reservar

`mapVentaToCrearReservaCommand()` transforma una `VentaEnCurso` ordinaria en el snapshot persistible.

Reglas:

- descuento porcentual → conserva `descuentoBps`;
- descuento directo → conserva importe fijo;
- promoción → conserva importe fijo equivalente;
- importe manual → conserva la diferencia económica frente al importe base cuando corresponda;
- regalo → se representa como importe final `0` y descuento fijo equivalente al importe base.

Esto permite conservar el resultado económico aunque `linea_reserva` no tenga un flag específico `regalo`.

El mapper exige:

- cliente persistido;
- al menos una línea;
- cantidades positivas;
- ausencia de devoluciones;
- ausencia de reservas de origen.

Por tanto una venta con devolución o ya cargada desde reserva no puede generar otra reserva.

### 19.18 Persistencia transaccional de una reserva

`TypeOrmReservasRepository.create()` realiza en una única transacción:

```text
resolver cliente
    ↓
INSERT reserva
    ↓
por cada línea:
    resolver artículo si existe
    INSERT linea_reserva
    stock = stock - unidades
    ↓
COMMIT
```

Si cualquier paso falla:

```text
ROLLBACK
```

Los identificadores públicos de reserva y líneas se generan con UUID.

El repository devuelve el `publicId` de la nueva reserva.

Para Varios:

```text
articuloPublicId = null
id_articulo      = null
```

por lo que se crea la línea sin modificar stock.

No se impone stock mínimo: el modelo actual permite stock negativo.

### 19.19 Simetría del stock

El ciclo queda preparado de forma simétrica:

```text
CREAR RESERVA
stock = stock - unidades

ELIMINAR LÍNEA / CANCELAR RESERVA
stock = stock + unidades
```

Ambos extremos se realizan transaccionalmente.

La reconciliación entre unidades originalmente reservadas y unidades finalmente vendidas se mantiene pendiente para **Ventas 11 — Persistencia transaccional**.

### 19.20 Angular `ReservasService.createFromVenta()`

Angular dispone de:

```text
createFromVenta(venta)
```

que:

1. ejecuta el mapper;
2. espera cualquier carga pendiente;
3. llama a `window.osumiDesktop.reservas.create(...)`;
4. recarga la colección;
5. devuelve la instancia canónica recién creada.

Este método **no**:

- cierra la venta;
- imprime ticket;
- decide entre `Reserva` y `Reserva sin ticket`.

Ese orchestration pertenece a **Ventas 10 — Finalización y pagos**.

### 19.21 Pruebas y validación

Se añadieron pruebas para:

- snapshot de descuento porcentual;
- descuento directo;
- regalo;
- obligatoriedad de cliente;
- bloqueo de una venta procedente de reservas;
- economía histórica de `fromReserva()`;
- escalado de cantidad;
- bloqueo de operaciones económicas;
- Varios reservado no editable como Varios;
- líneas iguales de distintas reservas separadas;
- descuento actual solo para compras nuevas;
- compra nueva del mismo artículo separada;
- cliente bloqueado;
- conservación de `reservasOrigen` tras borrar líneas visibles;
- rechazo de reservas de clientes distintos;
- una reserva cargada en una sola venta abierta y liberación al cerrar.

Durante las pruebas apareció un único fallo en el test:

```text
impide crear otra reserva desde una venta procedente de reservas
```

El mapper validaba correctamente primero la obligatoriedad del cliente. El test no había preparado esa precondición y esperaba llegar directamente a la validación de `tieneReservas`.

La corrección fue añadir:

```text
venta.setCliente(createCliente())
```

al propio test. No se cambió el mapper ni el orden de sus validaciones.

Después de esa corrección:

- toda la batería de tests pasó;
- `typecheck:electron` pasó;
- build pasó;
- lint pasó;
- la creación real desde DevTools funcionó;
- el stock disminuyó al crear la reserva;
- al eliminarla volvió exactamente a su valor inicial.

Ventas 9 queda funcionalmente cerrado.

## 20. Ajustes transversales realizados durante Ventas

### 20.1 Menú de Electron

Se eliminó el menú superior de Electron mediante `Menu.setApplicationMenu(null)` para que Alt no vuelva a mostrar File/Edit/etc.

Como efecto secundario desapareció el acceso a DevTools que dependía del menú. Se restauró en desarrollo mediante `webContents.before-input-event`:

- `Ctrl + Shift + I`;
- `F12`.

Solo está activo cuando `!app.isPackaged`.

### 20.2 Foco del selector de cliente

Cerrar el selector por selección, eliminación o cancelación fuerza un nuevo `focusTarget` al localizador. Esto evita depender de que el valor anterior del workspace ya fuese `localizador`.

### 20.3 Accesibilidad

Se evita `autofocus` en HTML; el foco inicial se resuelve mediante `viewChild` + `afterNextRender`/efectos post-render.

Los overlays interactivos usan controles accesibles reales en vez de `<div (click)>` no focusables.

## 21. Método de trabajo por bloque

Para cada bloque se seguirá el ciclo:

1. Repasar el plan maestro completo: terminado, bloque actual y pendientes.
2. Explicar en uno o dos párrafos qué resuelve el bloque antes de implementar.
3. Inventariar el comportamiento equivalente en frontend/backend antiguos cuando sea necesario.
4. Revisar el código actual del cliente nuevo antes de proponer cambios.
5. Identificar comportamiento que se conserva y deuda técnica que no debe trasladarse.
6. Definir responsabilidades, contratos y casos de uso.
7. Implementar en vertical por piezas pequeñas y verificables.
8. Mejorar UX, accesibilidad, estados vacíos, errores y rendimiento.
9. Ejecutar pruebas y comprobar datos reales.
10. No avanzar hasta que el usuario confirme que funciona.
11. Al terminar un **bloque principal**, actualizar y entregar este documento.

> **Importante:** no asumir que la implementación antigua es el diseño correcto. Debe utilizarse como fuente funcional y rediseñarse cuando la arquitectura o UX lo justifiquen.

## 22. Fuentes de información

La fuente principal es el código actual de los repositorios GitHub:

- frontend antiguo: `osumionline/Osumi-TPV`;
- backend antiguo: `osumionline/TPV-API`;
- cliente nuevo: `osumionline/Osumi-TPV-Client`.

Además pueden utilizarse capturas, explicación funcional del usuario, datos reales importados, documentación de continuidad anterior y decisiones expresas tomadas durante el desarrollo.

No pedir de nuevo archivos ya disponibles y actualizados salvo necesidad concreta.

## 23. Protocolo para cambios de código

- Cambios en orden de compilación y en pasos pequeños verificables.
- Archivo nuevo: entregarlo completo.
- Archivo existente: indicar ruta y ubicación exacta antes/después de un símbolo actual.
- Revisar primero el repositorio cuando el contenido pueda haber cambiado.
- Tras cada paso significativo ejecutar:

```bash
npm test
npm run typecheck:electron
npm run build
npm run lint
```

- `npm run build:desktop` es útil cuando se toca Electron/backend o empaquetado.
- No existe un script `npm run typecheck`; el correcto es `npm run typecheck:electron`.
- No avanzar al bloque siguiente hasta que el actual funcione o sus limitaciones estén documentadas.
- El usuario suele probar manualmente, ejecutar la batería completa y subir los cambios antes de continuar.

## 24. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” como contexto principal.

Installation + importación legacy y Startup están completados y probados. En el módulo Ventas están completados y probados los bloques 1 a 9:
1. Contexto operativo.
2. Modelo de venta en curso + workspace persistente.
3. Consulta/búsqueda de artículos y accesos directos.
4. Estructura visual.
5. Operaciones sobre líneas.
6. Clientes y estadísticas rápidas.
7. Varios.
8. Devoluciones.
9. Reservas.

El siguiente bloque planificado es Ventas 10 — Finalización y pagos. Después quedan Persistencia transaccional y Postventa. Antes de iniciar Ventas 10, el usuario quiere revisar otro asunto.

Los repositorios de referencia son:
- Frontend antiguo: https://github.com/osumionline/Osumi-TPV
- Backend antiguo: https://github.com/osumionline/TPV-API
- Cliente nuevo: https://github.com/osumionline/Osumi-TPV-Client

Antes de empezar un bloque, dame la recapitulación completa del plan, indicando qué está terminado, el bloque actual y lo pendiente, y explica brevemente qué resolverá el bloque actual. Antes de proponer cambios sobre archivos existentes consulta su contenido actual en el repositorio.

Al terminar cada bloque principal, después de que confirme que funciona y que está subido, entrégame una versión actualizada de este documento de continuidad.

Cuando el usuario indique que quiere retomar el plan principal, debemos continuar por: Ventas 10 — Finalización y pagos.
```

## 25. Próximo paso

El siguiente bloque planificado del traspaso de Ventas es:

# Ventas 10 — Finalización y pagos

**No iniciarlo todavía automáticamente.** Al cerrar Ventas 9, el usuario ha indicado expresamente que antes quiere revisar otro asunto.

Cuando se retome el plan principal, Ventas 10 debe partir de todo lo ya construido:

- venta ordinaria;
- Varios;
- cliente;
- devoluciones;
- reservas cargadas;
- creación de reservas mediante `ReservasService.createFromVenta()`.

Este bloque tendrá que analizar primero el flujo completo de finalización del TPV antiguo y después diseñar el nuevo flujo para, como mínimo:

- calcular y presentar el total final;
- decidir entre venta normal y reserva;
- mantener las opciones `Reserva` y `Reserva sin ticket`;
- impedir reservar ventas con devoluciones o procedentes de reservas;
- seleccionar uno o varios tipos de pago;
- manejar efectivo y cambio;
- soportar total positivo, cero o negativo;
- resolver cómo se devuelve dinero en una devolución neta;
- permitir cambios donde convivan líneas negativas y positivas;
- determinar reglas de impresión de ticket;
- cerrar la pestaña únicamente después de una operación válida;
- conectar la creación de reservas ya implementada en Ventas 9;
- dejar preparado el command que Ventas 11 persistirá transaccionalmente.

Ventas 10 no debe asumir todavía que la venta normal ya se persiste: **Ventas 11 — Persistencia transaccional** sigue siendo responsable de la escritura definitiva de venta, líneas, pagos, stock, reservas consumidas y unidades devueltas.

Antes de proponer implementación de Ventas 10 se debe volver a revisar el frontend antiguo, TPV-API y el estado actual del repositorio Client, y fijar con el usuario cualquier comportamiento ambiguo.

## 26. Registro de hitos

| Versión | Fecha | Hito |
| --- | --- | --- |
| 1.0 | 6 de agosto de 2026 | Installation e importación legacy completadas. Inicio del traspaso modular. |
| 1.1 | 9 de agosto de 2026 | Startup completado: arranque, conexión SQLite operativa, assets internos y precarga global. |
| 1.2 | 13 de agosto de 2026 | Ventas 1–6 completados: contexto operativo, workspace persistente, búsqueda, estructura visual, operaciones de línea, clientes, alta rápida, protección de datos y estadísticas. Próximo bloque: Ventas 7 — Varios. |
| 1.3 | 13 de agosto de 2026 | Ventas 7 — Varios completado: línea libre real, creación/cancelación, editor reutilizable, IVA por defecto conservador, edición desde línea y pruebas. Próximo bloque: Ventas 8 — Devoluciones. |
| 1.4 | 14 de agosto de 2026 | Ventas 8 — Devoluciones completado: compatibilidad QR legacy, read model histórico, control de unidades disponibles, economía histórica exacta, selector, mezcla con compras y reapertura/edición. Próximo bloque: Ventas 9 — Reservas. |
| 1.5 | 15 de agosto de 2026 | Ventas 9 — Reservas completado: consulta y gestión transaccional, carga múltiple sin deduplicación, economía histórica, cliente bloqueado, gestor visual, creación de reservas y ciclo simétrico de stock. Próximo bloque planificado: Ventas 10 — Finalización y pagos; antes se revisará otro asunto con el usuario. |
