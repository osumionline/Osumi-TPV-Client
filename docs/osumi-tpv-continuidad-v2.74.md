# Osumi TPV Client — Documento de continuidad v2.74

**Fecha:** 20 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento sustituye a `docs/osumi-tpv-continuidad-v2.73.md`.

Su objetivo es permitir retomar el desarrollo en una conversación nueva sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo de Osumi TPV Client se realiza de forma incremental y controlada.

Reglas de trabajo:

- Cada respuesta de desarrollo debe contener **una sola unidad pequeña y autocontenida**.
- Antes de cada bloque:
  1. resumir brevemente lo ya terminado;
  2. indicar el punto actual;
  3. indicar lo pendiente;
  4. explicar en un único párrafo qué hace exactamente la unidad actual.
- Antes de proponer código que dependa del estado del repositorio, revisar siempre el `main` actual.
- No inventar rutas, nombres de archivos, clases, helpers, APIs ni contratos.
- Archivo nuevo: entregar el contenido completo.
- Archivo existente con cambio parcial: indicar bloque exacto a localizar, qué sustituir o dónde añadir y suficiente contexto.
- Los tests que pertenecen a una unidad se implementan en esa misma unidad.
- El usuario ejecuta siempre la batería completa:

  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```

- No continuar si hay tests o builds fallando: primero se corrige exclusivamente la unidad actual.
- Después de una unidad verde y subida al repositorio, volver a revisar `main` antes del siguiente bloque.
- No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique:
  - qué quiere;
  - cómo funcionaba en el TPV antiguo.
- El usuario dirige producto y migración; no inventar funcionalidades por analogía.
- Todo método público nuevo debe llevar JSDoc.
- Si al tocar una interfaz/clase hay métodos públicos sin JSDoc, completarlos.
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

## Angular

Usar Angular moderno:

- Angular 22.1.7.
- standalone.
- zoneless.
- signals.
- `input()` / `output()`.
- `inject()`.
- `computed()`.
- `effect()` cuando sea apropiado.
- `@if` / `@for`.
- Signal Forms.
- `viewChild()` signal.
- Evitar APIs legacy como `@ViewChild` salvo necesidad real.
- Servicios propios con `@Service()`.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer/frontend: pueden usarse globals de Vitest según la configuración actual.
- Los specs de componentes padre deben aislar componentes hijos pesados cuando el hijo ya dispone de sus propios tests. Caso concreto ya aplicado: `PaymentTypeStatisticsComponent` se sustituye por un stub dentro del spec de `ManagementPaymentTypesComponent` para evitar inicializar ECharts/`ResizeObserver` en JSDOM.

---

# 2. Entorno y repositorios

## Repositorios

- Cliente nuevo: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

## Stack actual

- Angular 22.1.7.
- Angular Material 22.1.7.
- Angular CDK 22.1.7.
- Electron + TypeScript.
- SQLite / TypeORM.
- ECharts + `ngx-echarts` para estadísticas.
- `safeStorage` de Electron para secretos operacionales.
- Node moderno en CI / runtime según configuración del proyecto.

## Aliases renderer

- `@env/*`
- `@app/*`
- `@constants/*`
- `@guards/*`
- `@interfaces/*`
- `@model/*`
- `@modules/*`
- `@pipes/*`
- `@services/*`
- `@utils/*`
- `@desktop-contracts/*`

## Aliases Electron

- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

Nunca asumir rutas antiguas: revisar `main`.

---

# 3. Estado general de hitos

## Cerrados

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell + navegación + rutas ✅
  - 17.2 Autenticación backend de empleados ✅
  - 17.3 Portada + sesión temporal + permisos ✅
  - 17.4 Ajustes ✅
  - 17.5 Empleados ✅ **CERRADO DEFINITIVAMENTE**
  - 17.6 Tipos de pago ✅ **CERRADO DEFINITIVAMENTE**
    - 17.6.1 infraestructura / lectura / memoria / startup ✅
    - 17.6.2 estructura visual ✅
    - 17.6.3 formulario Datos + logo ✅
    - 17.6.4 alta + edición + baja ✅
    - 17.6.5 orden persistente ✅
    - 17.6.6 estadísticas ✅
    - 17.6.7 regresión final ✅

## Pendiente global

- 18 Caja ⏳
  - **no iniciar ni diseñar todavía**;
  - antes el usuario debe explicar objetivo, comportamiento deseado y funcionamiento del TPV antiguo.
- 19 Enforcement global de roles/permisos ⏳
- TicketBAI 12C.9 ⏸
  - pausado hasta respuesta o actualización de Berein.

---

# 4. Punto exacto de continuidad

Estado funcional confirmado por el usuario:

- **17.6 Tipos de pago está terminado por completo**.
- La regresión final pasó correctamente.
- La batería completa pasó correctamente.
- Las pruebas funcionales pasaron correctamente.
- Los cambios finales están subidos a `main`.

Commit de cierre visible al generar esta versión:

```text
ef79cb84820cf2736ef5d0d5d473ec4df51a7549
Terminado Gestión 17.6
```

Por tanto:

- **17.6 queda CERRADO DEFINITIVAMENTE**.
- No hay una unidad técnica pendiente dentro de Tipos de pago.
- El siguiente bloque global previsto es **18 Caja**, pero no debe abrirse hasta que el usuario describa primero la funcionalidad y el comportamiento heredado.

---

# 5. Gestión — sesión y permisos

`GestionSessionService` mantiene una sesión temporal de Gestión.

Datos principales:

- `empleadoId`
- `authenticatedAt`
- `expiresAt`

Duración fija:

- **10 minutos desde login**.

Reglas:

- no se renueva por actividad;
- no existe timer que expulse al usuario mientras una página permanece abierta;
- se comprueba al entrar o reentrar en páginas protegidas;
- “Cambiar empleado” limpia la sesión inmediatamente.

El empleado efectivo se resuelve contra `EmpleadosService` mediante su id.

## Permisos de Gestión

- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos de empleados
- 22 Borrar empleados
- 23 Modificar permisos de empleados
- 24 Consultar estadísticas de empleados
- 25 Copias de seguridad

Administradores:

- bypass mediante `hasPerm()` / `hasAnyPerm()`.

## Tipos de pago

Decisión funcional definitiva:

- **el permiso 19 controla todo el apartado Tipos de pago**:
  - acceso;
  - alta;
  - edición;
  - baja;
  - orden;
  - estadísticas.

No crear permisos nuevos para subacciones de Tipos de pago.

El enforcement global fino queda para el hito 19; no mezclarlo retrospectivamente con 17.6.

---

# 6. Empleados — cerrado definitivamente

17.5 está terminado, probado y validado funcionalmente.

Incluye:

- lectura;
- alta;
- edición;
- baja lógica;
- autenticación;
- scrypt actual;
- bcrypt legacy con migración al autenticar;
- protección del último administrador;
- permisos 1–25;
- separación estricta de permisos de crear / modificar / borrar / permisos;
- autogestión;
- feedback;
- foco en Nombre;
- navegación correcta al perder permisos.

No quedan tareas dentro de 17.5.

---

# 7. Ajustes — estado

17.4 está funcionalmente terminado.

Incluye:

- AppData público.
- Secrets con `safeStorage`.
- Revelación controlada.
- Logo.
- SMTP.
- TicketBAI.
- Impresora local.

Deuda técnica deliberada:

- `ConfigurationUpdateCommand.integrations` sigue opcional temporalmente por compatibilidad.

No mezclar esta limpieza con otros hitos.

---

# 8. Tipos de pago — comportamiento funcional definitivo

Pantalla:

`src/app/modules/gestion/pages/management-payment-types/`

## Lateral

- Buscador.
- Lista de tipos configurables cargada desde memoria.
- Drag & drop real mediante Angular CDK.
- Handle `drag_indicator` como punto de arrastre.
- Botón **“Añadir nuevo tipo de pago”**.

## Área principal

Estado inicial:

- bienvenida / instrucción para seleccionar.

Al seleccionar o crear:

- `DATOS`.
- `ESTADÍSTICAS`.

Al seleccionar otro tipo mientras se está en Estadísticas:

- vuelve a `DATOS`;
- actualiza selección;
- recupera foco en Nombre cuando finaliza la animación de Material.

## Campos de Datos

- `nombre`
  - obligatorio;
  - trim vacío no válido;
  - máximo 100 caracteres.
- `afectaCaja`
- `fisico`
- logo
  - obligatorio para tipos configurables.

## Slug

- interno;
- no visible;
- no editable;
- generado automáticamente desde `nombre`;
- se recalcula al guardar;
- la generación queda alineada deliberadamente con el comportamiento histórico de `OTools::slugify()`.

## Baja

- lógica;
- conserva histórico;
- conserva referencias históricas;
- deja de aparecer en nuevas operaciones.

---

# 9. Efectivo — regla estructural definitiva

Efectivo existe como un `tipo_pago` real y estructural:

- nombre: `Efectivo`
- slug: `efectivo`
- `afectaCaja = true`
- `orden = 0`
- `fisico = true`
- sin logo

Reglas:

- **sí** forma parte del maestro global en memoria;
- **no** aparece en Gestión > Tipos de pago;
- no se edita;
- no se elimina;
- no se reordena;
- no necesita logo.

La reconstrucción legacy y futuros módulos de Ventas/Caja dependen de él.

La exclusión se realiza en la capa específica de Gestión, no en `getAll()`.

Backend:

- protege también Efectivo;
- no se confía únicamente en que la UI lo oculte.

Identidad estable:

```text
slug === 'efectivo'
```

---

# 10. Significado de los flags

## `afectaCaja`

Confirmado contra el TPV/API antiguos.

- `true`:
  - el medio tiene impacto en caja / efectivo según la semántica heredada.
- `false`:
  - se trata como otro medio de pago.

Este flag deberá conectarse correctamente cuando se implemente el bloque 18 Caja sobre `venta_pago`.

## `fisico`

Confirmado contra el TPV antiguo.

- `true`:
  - disponible en una venta presencial.
- `false`:
  - no debe aparecer como opción de pago físico.

No eliminar ni reinterpretar estos campos.

---

# 11. Base de datos — `tipo_pago`

Esquema relevante:

- `id` INTEGER PK AUTOINCREMENT.
- `public_id` TEXT UNIQUE.
- `id_archivo` nullable, FK a `archivo`, `ON DELETE SET NULL`.
- `nombre` TEXT NOT NULL.
- `slug` TEXT NOT NULL COLLATE NOCASE.
- `afecta_caja` 0/1.
- `orden` INTEGER.
- `fisico` 0/1.
- `activo` 0/1.
- `created_at`.
- `updated_at`.
- `deleted_at`.

Índice de slug activo:

```sql
uq_tipo_pago_slug_activo
ON tipo_pago(slug COLLATE NOCASE)
WHERE deleted_at IS NULL
```

Baja lógica:

- `activo = 0`;
- `deleted_at = timestamp`;
- `updated_at = timestamp`.

`venta_pago.id_tipo_pago` conserva la referencia histórica y utiliza FK restrictiva, por lo que el borrado físico no es la estrategia correcta.

---

# 12. Assets de Tipos de pago

Purpose:

```text
payment_type_icon
```

Directorio final:

```text
files/payment-types/
```

Formatos de entrada admitidos:

- JPEG.
- PNG.
- WebP.

Pipeline:

1. staging;
2. validación;
3. procesamiento Sharp;
4. conversión a WebP;
5. promoción a almacenamiento administrado;
6. persistencia de `archivo`;
7. asociación mediante `tipo_pago.id_archivo`.

Validaciones del pipeline:

- tamaño máximo;
- límite de píxeles;
- JPEG / PNG / WebP;
- no animación / multipágina;
- autoorientación;
- salida WebP.

Ownership:

- antes de guardar, el staging pertenece al renderer;
- si backend confirma el guardado, backend lo ha consumido/promocionado;
- el componente deja `logoStagingId = null`;
- un fallo de guardado conserva staging para reintentar;
- un fallo previo al commit revierte el fichero final preparado.

---

# 13. 17.6.1 — infraestructura, lectura y memoria ✅

Este bloque está cerrado.

## Backend

`TipoPagoRecord` contiene:

- `id`
- `publicId`
- `nombre`
- `slug`
- `fotoRelativePath`
- `afectaCaja`
- `orden`
- `fisico`

Lectura repository:

- tipos activos;
- `LEFT JOIN archivo`;
- `activo = 1`;
- `deleted_at IS NULL`;
- logo solo si el asset sigue activo;
- orden por:
  1. `orden`;
  2. nombre NOCASE;
  3. id.

## Application service

`TiposPagoService.getAll()`:

- convierte `TipoPagoRecord` → `TipoPagoInterface`;
- transforma rutas con `AssetUrlBuilder`;
- incluye Efectivo.

## IPC / preload

Existe `TiposPagoApi` y exposición mediante:

```ts
window.osumiDesktop.tiposPago
```

## Renderer

`src/app/services/tipos-pago/tipos-pago.service.ts`

Mantiene maestro global como signal readonly y expone carga/búsqueda/mutaciones.

## Startup

El maestro se carga al inicio de la aplicación.

El startup global pasó a **7 pasos** incluyendo Tipos de pago.

---

# 14. 17.6.2 — estructura visual ✅

Pantalla principal:

`src/app/modules/gestion/pages/management-payment-types/`

Incluye:

- header;
- lateral;
- buscador;
- listado;
- handle de drag;
- botón Nuevo;
- área de bienvenida;
- editor;
- tabs `DATOS` / `ESTADÍSTICAS`;
- responsive.

Reglas:

- Efectivo filtrado fuera de Gestión.
- Búsqueda solo contra memoria.
- Seleccionar un tipo abre Datos.
- Crear uno nuevo abre Datos.
- Cambiar desde Estadísticas a otro tipo vuelve a Datos.
- Foco automático en Nombre.
- El handle inicialmente visual quedó posteriormente convertido en drag real durante 17.6.5.
- La pestaña Estadísticas inicialmente placeholder quedó sustituida por la implementación real durante 17.6.6.

---

# 15. 17.6.3 — formulario Datos + logo ✅

## Signal Form

Modelo:

- `mode: 'create' | 'edit'`
- `nombre`
- `afectaCaja`
- `fisico`
- `foto`

## Selección / alta

Seleccionar tipo:

- carga valores persistidos;
- resetea dirty;
- abre Datos;
- foco en Nombre.

Alta:

- nombre vacío;
- `afectaCaja = false`;
- `fisico = true`;
- `foto = null`.

## Cancelar

Edición:

- descarta staging pendiente;
- restaura datos persistidos.

Alta:

- descarta staging;
- vuelve al estado inicial sin selección.

Si falla el descarte del staging:

- no se cambia de ficha;
- se conserva estado;
- se muestra error.

## Logo

Comportamiento:

- selector nativo;
- preview inmediata;
- sustituir imagen;
- staging anterior se limpia de forma segura;
- si falla nueva imagen, se conserva la anterior;
- al destruir componente se intenta limpiar un staging todavía propiedad del renderer.

---

# 16. 17.6.4 — CRUD completo ✅

17.6.4 quedó cerrado con todas las capas:

1. repository SQLite;
2. application service;
3. contratos públicos;
4. composición;
5. IPC;
6. preload;
7. renderer service;
8. interfaz Guardar;
9. baja con confirmación;
10. lifecycle de staging;
11. tests.

## Repository

`TipoPagoRepository` terminó exponiendo, además de las lecturas posteriores de estadísticas:

```ts
findAll()
findById(id)
existsActiveBySlug(slug, excludeId)
create(command)
update(id, command)
reorder(ids)
deactivate(id)
findEstadisticas(query)
```

## Create

- transacción;
- valida asset;
- inserta `archivo`;
- obtiene orden siguiente;
- inserta `tipo_pago`;
- genera `public_id`;
- devuelve persistido.

Nueva alta:

- `MAX(orden)` activo/no eliminado + 1.

## Update

- exige registro activo;
- conserva asset si no llega logo nuevo;
- crea asset nuevo si procede;
- actualiza nombre, slug, flags y timestamps;
- conserva `orden`.

## Deactivate

- soft delete;
- histórico conservado;
- Efectivo protegido en application service.

## Application service

Implementa CRUD con:

- trim/longitud;
- booleanos;
- id positivo;
- existencia;
- slug activo único;
- logo obligatorio;
- protección de Efectivo;
- promoción/rollback de assets.

## Renderer

Alta/edición/baja actualizan el maestro en memoria sin recarga completa.

## UI

Guardar:

- alta y edición reales;
- canonicaliza con respuesta backend;
- feedback 4 segundos;
- errores mediante `DialogService.alert`.

Baja:

- confirmación warning;
- soft delete;
- limpieza posterior de staging;
- no revierte una baja ya confirmada aunque falle cleanup.

---

# 17. 17.6.5 — orden persistente ✅

**Bloque cerrado y validado funcionalmente.**

## Contrato

`ReordenarTiposPagoCommand` contiene:

```ts
readonly ids: readonly number[];
```

Regla:

- debe contener **todos** los ids de tipos configurables activos;
- exactamente una vez;
- Efectivo no puede aparecer.

## Repository

`reorder(ids)`:

- ejecuta en transacción SQLite;
- valida de nuevo el conjunto configurable activo dentro de la transacción;
- conserva Efectivo con `orden = 0`;
- asigna configurables `1..N`;
- devuelve el maestro activo canónico ya ordenado.

Mensaje de mismatch:

```text
El orden recibido no coincide con los tipos de pago configurables activos.
```

## Backend application service

- normaliza ids;
- rechaza ids inválidos;
- rechaza duplicados;
- compara contra maestro actual;
- delega persistencia atómica;
- devuelve contratos públicos canónicos.

## IPC / preload

Canal:

```text
tipos-pago:reorder
```

Expuesto como:

```ts
window.osumiDesktop.tiposPago.reorder(command)
```

## Renderer

`TiposPagoService.reorder()`:

- signal `reordering`;
- snapshot exacto del maestro actual;
- actualización optimista inmediata;
- llama a Electron;
- si OK adopta respuesta canónica backend;
- si falla restaura **exactamente** el snapshot anterior;
- bloquea reorder concurrente.

## UI

Angular CDK DragDrop:

- `CdkDropList`;
- `CdkDrag`;
- `CdkDragHandle`;
- `moveItemInArray`.

Reglas:

- solo configurables;
- Efectivo nunca entra en el comando;
- drag solo desde handle;
- **con búsqueda activa no se puede reordenar**;
- sin botón Guardar;
- persistencia inmediata;
- durante reorder se bloquean acciones incompatibles;
- si falla, renderer hace rollback y UI muestra error.

No se deja nunca UI y SQLite divergentes.

---

# 18. 17.6.6 — estadísticas ✅

**Bloque cerrado y validado funcionalmente.**

Componente específico:

`src/app/modules/gestion/components/payment-type-statistics/`

La lógica estadística se mantuvo fuera de `ManagementPaymentTypesComponent` para no sobrecargar el padre.

## Fuente de datos

Tablas:

- `venta_pago`
- `venta`

Importe del tipo:

```text
venta_pago.importe_cents
```

Fecha:

```text
venta.created_at
```

Ventas borradas:

- se excluyen con `venta.deleted_at IS NULL`.

## Semántica

### Importe total

- suma neta de `venta_pago.importe_cents` del tipo y período.
- devoluciones/pagos negativos participan con signo negativo.

### Operaciones

```sql
COUNT(DISTINCT vp.id_venta)
```

Por tanto:

- una venta con varias filas del mismo tipo cuenta una sola operación;
- se evita inflar el contador por fragmentación de líneas de pago.

### Importe medio

```text
totalImporteCents / operaciones
```

Redondeado a céntimos.

### Porcentaje

Contrato:

```text
porcentajeTotalBps
```

- 10000 = 100,00 %.
- numerador: importe neto del tipo.
- denominador: importe neto de **todos** los cobros del mismo período.
- si total global es 0, porcentaje = 0.

## Períodos

Mismo patrón consolidado que Marcas:

- mes + año → buckets diarios;
- año + `month = null` → 12 buckets mensuales;
- `year = null`, `month = null` → buckets anuales.

Regla:

- no puede existir mes sin año.

UI:

- inicializa mes y año actuales;
- selector Mes;
- selector Año;
- Año = Todos fuerza Mes = Todos;
- años disponibles se completan y se añade año actual/seleccionado cuando procede.

## Contrato público

Consulta:

```ts
TipoPagoEstadisticasConsulta
```

- `idTipoPago`
- `year`
- `month`

Resultado:

```ts
TipoPagoEstadisticasResultado
```

- `availableYears`
- `points`
- `totalImporteCents`
- `operaciones`
- `importeMedioCents`
- `porcentajeTotalBps`

Puntos:

- `year`
- `month`
- `day`
- `importeCents`

Se rellenan huecos temporales a cero.

## IPC / preload

Canal:

```text
tipos-pago:get-estadisticas
```

Expuesto como:

```ts
window.osumiDesktop.tiposPago.getEstadisticas(consulta)
```

Renderer:

```ts
TiposPagoService.getEstadisticas(consulta)
```

No modifica el maestro global.

## UI estadística

Pestaña real con:

- filtros Mes/Año;
- Importe total;
- Operaciones;
- Importe medio;
- Porcentaje del total;
- gráfico de evolución ECharts;
- loading;
- estado sin actividad;
- error + Reintentar.

La consulta solo se realiza cuando la pestaña Estadísticas está realmente activa.

## Concurrencia de consultas

`PaymentTypeStatisticsComponent` usa `requestSequence`.

Regla:

- si llega tarde una respuesta antigua después de lanzar una consulta más reciente, se ignora;
- nunca puede sobrescribir el resultado actual.

Esta regla quedó protegida explícitamente en 17.6.7.

---

# 19. 17.6.7 — regresión final ✅

**Cerrada sin cambios funcionales adicionales en producción.**

La revisión final comprobó:

- contratos públicos;
- canales IPC;
- preload;
- renderer;
- maestro global;
- Efectivo;
- CRUD;
- staging;
- reorder;
- búsqueda + reorder;
- estadísticas;
- ausencia de placeholders funcionales antiguos;
- ausencia de tests duplicados en el spec principal.

## Test añadido en regresión

Se añadió cobertura para garantizar que:

- consulta A queda pendiente;
- consulta B posterior termina primero;
- B se adopta;
- A termina después;
- A se ignora por obsoleta.

Protege directamente `requestSequence`.

## Incidencia de tests ECharts resuelta

Durante 17.6.6 apareció en JSDOM:

```text
Error: please install a polyfill for ResizeObserver
```

No era un fallo funcional.

Causa:

- el spec del componente padre montaba el componente real de estadísticas;
- `ngx-echarts` intentaba inicializar `ResizeObserver`, inexistente en JSDOM.

Solución definitiva:

- **no** añadir polyfill global;
- sustituir `PaymentTypeStatisticsComponent` por un stub únicamente en `ManagementPaymentTypesComponent` spec;
- mantener los tests propios del componente estadístico separados.

Esto respeta mejor el aislamiento de tests.

## Validación final

El usuario confirmó en verde:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

Además confirmó pruebas funcionales correctas.

Por tanto:

> **17.6 Tipos de pago está cerrado definitivamente.**

---

# 20. API final de Tipos de pago

## `TiposPagoApi`

Expone:

```ts
getAll()
getEstadisticas(consulta)
create(command)
update(id, command)
reorder(command)
deactivate(id)
```

## Canales IPC

```text
tipos-pago:get-all
tipos-pago:get-estadisticas
tipos-pago:create
tipos-pago:update
tipos-pago:reorder
tipos-pago:deactivate
```

Todos los handlers:

- ejecutan `assertTrustedSender`;
- delegan en application service;
- no duplican lógica de negocio.

## Preload

Todo se expone bajo:

```ts
window.osumiDesktop.tiposPago
```

---

# 21. Renderer final — `TiposPagoService`

Responsabilidades actuales:

```ts
load()
reload()
clear()

getEstadisticas(consulta)

create(command)
update(id, command)
reorder(command)
deactivate(id)

findById(id)
findByPublicId(publicId)
findBySlug(slug)
```

Signals principales:

- maestro readonly;
- `loaded`;
- `reordering`.

Reglas importantes:

- CRUD actualiza memoria sin recarga completa;
- reorder es optimista con rollback exacto;
- estadísticas son lectura independiente y no modifican maestro;
- orden canónico por `orden`, luego nombre, luego id.

---

# 22. Tests cubiertos en 17.6

## Repository

- lectura;
- findById;
- slug activo;
- alta;
- orden siguiente;
- asset;
- edición;
- conservar logo;
- reemplazar logo;
- baja lógica;
- reorder transaccional;
- Efectivo en orden 0;
- validación del conjunto de reorder;
- agregados estadísticos;
- pagos mixtos;
- varias filas del mismo tipo en una venta;
- devoluciones negativas;
- exclusión de ventas eliminadas;
- total global del período.

## Application service

- mapping;
- Efectivo;
- create con slug;
- logo obligatorio;
- slug duplicado;
- update conservando logo;
- update reemplazando logo;
- tipos legacy sin logo;
- Efectivo no editable;
- Efectivo no eliminable;
- deactivate;
- rollback de asset;
- reorder válido;
- reorder incompleto/duplicado/Efectivo;
- consulta estadística;
- validación de período;
- serie temporal;
- medias/porcentaje.

## Renderer service

- carga única;
- reload;
- búsquedas;
- create en memoria;
- update en memoria;
- deactivate en memoria;
- clear;
- reorder optimista;
- adopción de respuesta canónica;
- rollback exacto;
- bloqueo de reorder concurrente;
- estadísticas sin modificar maestro;
- propagación de errores estadísticos.

## Componente Gestión

- Efectivo oculto;
- búsqueda;
- selección;
- alta;
- cambio a Datos;
- foco Nombre;
- validación logo;
- preview;
- reemplazo de staging;
- cancelación;
- error de imagen;
- create;
- update conservando logo;
- update cambiando logo;
- ownership staging;
- feedback;
- baja confirmada;
- cancelación de baja;
- reorder;
- búsqueda bloquea reorder;
- error de reorder.

## Componente estadísticas

- no consulta si tab inactiva;
- carga período actual al activar;
- Año Todos → histórico completo;
- error;
- formatos de las cuatro métricas;
- protección ante respuestas obsoletas.

---

# 23. Diferencias frente al TPV antiguo ya resueltas

## Guardado

TPV antiguo:

- alta/edición compartían acción;
- slug recalculado al guardar;
- `getNewTipoPagoOrden()` pretendía MAX + 1;
- logo reemplazable.

Nuevo cliente:

- contratos explícitos create/update;
- application service tipado;
- transacciones SQLite;
- pipeline de assets gestionado;
- slug automático;
- orden nuevo MAX + 1;
- errores y rollback definidos.

## Baja

TPV antiguo:

- `deleted_at`.

Nuevo:

- `activo = 0`;
- `deleted_at`;
- histórico preservado.

## Imágenes

Antiguo:

- conversión WebP.

Nuevo:

- staging seguro;
- validación de formato;
- Sharp;
- WebP;
- asset administrado;
- ownership y cleanup definidos.

## Orden

Nuevo cliente añade una semántica explícita y segura:

- Efectivo estructural en orden 0;
- configurables 1..N;
- reorder transaccional;
- UI optimista con rollback.

## Estadísticas

Nuevo cliente formaliza:

- período tipado;
- importes en céntimos;
- operaciones por venta distinta;
- devoluciones con signo;
- porcentaje en basis points;
- agregación diaria/mensual/anual;
- huecos a cero;
- protección contra respuestas obsoletas.

---

# 24. TicketBAI / SDK

SDK:

```text
@osumi/ticketbaiws
```

Estado:

- versión 1.0.1;
- ESM only;
- tests OK;
- README general;
- documentación exhaustiva por dominio en `docs/`.

Inconsistencias de Berein reportadas.

12C.9:

- pausado;
- no reabrir hasta respuesta o actualización de Berein.

---

# 25. Exportación legacy `.otpv`

El exportador antiguo incluye:

- dump MariaDB;
- app_data;
- logo;
- fotos artículos;
- marcas;
- proveedores;
- iconos de tipos de pago;
- PDFs pedidos;
- SMTP;
- TicketBAI.

Tipos de pago:

- iconos exportados;
- importador nuevo soporta `tipo_pago`;
- purpose `payment_type_icon`;
- asociación a `id_archivo`.

Impresora:

- no se exporta;
- es configuración local de máquina.

---

# 26. Commits relevantes del cierre de 17.6

Secuencia visible relevante:

```text
377c3826c55a6a0797339f7737ba5dff40a4dc54
Terminado Gestión 17.6.5a

5b861ae89aaedfc6900264f506545df0f5ec4d08
Terminado Gestión 17.6.5b

0869ac18621374ceb0eb95a4fa0d92074475600d
Terminado Gestión 17.6.5

56dc38ecc989d56f945812395e1f520017381b7d
Terminado Gestión 17.6.6a

77d963faaa89fe279c37d8880a7ff9c6d1409b8d
Terminado Gestión 17.6.6b

dce1c4f3174cb9d2fecbbd15620fee22ddcb8a70
Terminado Gestión 17.6.6

ef79cb84820cf2736ef5d0d5d473ec4df51a7549
Terminado Gestión 17.6
```

El último commit anterior al generar este documento es el cierre completo de Tipos de pago.

---

# 27. Resumen ejecutivo para retomar

Estado:

```text
✅ 16 Compras

✅ 17.1 Gestión shell/rutas
✅ 17.2 auth backend empleados
✅ 17.3 sesión/permisos
✅ 17.4 Ajustes
✅ 17.5 Empleados — CERRADO
✅ 17.6 Tipos de pago — CERRADO
   ✅ 17.6.1 lectura + IPC + memoria + startup
   ✅ 17.6.2 estructura visual
   ✅ 17.6.3 Datos + logo
   ✅ 17.6.4 CRUD completo
   ✅ 17.6.5 orden persistente
   ✅ 17.6.6 estadísticas
   ✅ 17.6.7 regresión final

⏳ 18 Caja
⏳ 19 enforcement global permisos
⏸ TicketBAI 12C.9
```

## Estado exacto de Tipos de pago

```text
✅ maestro global
✅ Efectivo estructural
✅ buscador
✅ alta
✅ edición
✅ baja lógica
✅ slug interno
✅ logo/staging/WebP
✅ orden drag & drop
✅ persistencia transaccional de orden
✅ rollback optimista
✅ estadísticas completas
✅ filtros temporales
✅ ECharts
✅ protección de respuestas obsoletas
✅ tests + build + lint
✅ pruebas funcionales
```

---

# 28. Siguiente paso exacto

**No hay código que escribir todavía.**

El próximo hito global previsto es:

```text
18 Caja
```

Pero, respetando la regla de dirección del proyecto, antes de diseñarlo o tocar código debe ocurrir esto:

1. el usuario explica qué debe cubrir Caja en el cliente nuevo;
2. el usuario explica cómo se utilizaba Caja en el TPV antiguo;
3. se revisan los repositorios actuales y legacy relevantes;
4. se contrastan modelos/tablas/operaciones ya existentes;
5. se resuelven decisiones funcionales;
6. entonces se divide 18 Caja en unidades pequeñas.

No adelantar contratos, UI, cálculos ni lógica de Caja por analogía.

El flag `afectaCaja` y `venta_pago` ya están preparados conceptualmente para ese futuro bloque, pero su comportamiento concreto debe definirse antes de implementar.

---

# 29. Regla final de dirección

Para cualquier módulo heredado:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se resuelven dudas funcionales;
4. se acuerdan decisiones;
5. se define plan;
6. se implementa por bloques pequeños;
7. el usuario valida;
8. se continúa solo después de verde y push.

Estado al cerrar esta v2.74:

- **17.5 Empleados: CERRADO DEFINITIVAMENTE.**
- **17.6 Tipos de pago: CERRADO DEFINITIVAMENTE.**
- **Commit de cierre: `ef79cb84820cf2736ef5d0d5d473ec4df51a7549`.**
- **Siguiente hito previsto: 18 Caja, todavía sin abrir.**
- No iniciar Caja ni otros bloques funcionales sin dirección expresa del usuario.
