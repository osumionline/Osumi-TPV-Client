# Osumi TPV Client — Documento de continuidad v2.73

**Fecha:** 20 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento sustituye a `docs/osumi-tpv-continuidad-v2.72.md`.

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
- No inventar:
  - rutas;
  - nombres de archivos;
  - clases;
  - helpers;
  - APIs;
  - contratos.
- Archivo nuevo:
  - entregar el contenido completo.
- Archivo existente con cambio parcial:
  - indicar bloque exacto a localizar;
  - indicar qué sustituir o dónde añadir;
  - incluir suficiente contexto.
- Los tests que pertenecen a una unidad se implementan en esa misma unidad.
- El usuario ejecuta:
  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```
  y confirma antes de avanzar.
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
- `@if` / `@for`.
- Signal Forms.
- `viewChild()` signal.
- Evitar APIs legacy como `@ViewChild` salvo necesidad real.
- Servicios propios con `@Service()`.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer/frontend: pueden usarse globals de Vitest según la configuración actual.

---

# 2. Entorno y repositorios

## Repositorios

- Cliente nuevo:
  `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI:
  `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua:
  `https://github.com/osumionline/TPV-API`
- SDK TicketBAI:
  `https://github.com/osumionline/ticketbaiws`

## Stack actual

- Angular 22.1.7.
- Angular Material 22.1.7.
- Electron + TypeScript.
- SQLite / TypeORM.
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
  - 17.6 Tipos de pago:
    - 17.6.1 infraestructura / lectura / memoria / startup ✅
    - 17.6.2 estructura visual ✅
    - 17.6.3 formulario Datos + logo ✅
    - 17.6.4 alta + edición + baja ✅

## Pendiente dentro de 17.6 Tipos de pago

- **17.6.5 Ordenación persistente** ⏳
- **17.6.6 Estadísticas** ⏳
- **17.6.7 Regresión final** ⏳

## Pendiente global

- 18 Caja ⏳
  - no iniciar sin que el usuario explique primero el objetivo y el comportamiento antiguo.
- 19 Enforcement global de roles/permisos ⏳
- TicketBAI 12C.9:
  - pausado hasta respuesta o actualización de Berein.

---

# 4. Punto exacto de continuidad

Estado funcional confirmado por el usuario:

- **17.6.4c.2b terminado**.
- Batería completa pasada correctamente.
- Cambios subidos al repositorio por el usuario.
- Por tanto:
  - **17.6.4 queda CERRADO**;
  - el siguiente bloque funcional es **17.6.5 — orden**.

## Nota sobre el estado remoto visible al generar este documento

En el momento de crear esta v2.73, la consulta remota disponible todavía mostraba como último commit visible:

`ed8ae0fad76be19aaccca76413da54e46a893ec1`  
**“Terminado Gestión 17.6.4c.2a”**

Sin embargo, el usuario confirmó expresamente después que:

- 17.6.4c.2b pasó todos los tests;
- los cambios fueron subidos al repositorio.

No se inventa el hash de ese commit final porque todavía no era visible en la consulta remota utilizada al generar este documento.

Al retomar el desarrollo, revisar primero `main` y sustituir esta referencia mental por el hash real ya sincronizado.

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

Decisión funcional:

- **el permiso 19 controla todo el apartado Tipos de pago**:
  - acceso;
  - alta;
  - edición;
  - baja;
  - orden;
  - estadísticas.

No crear permisos nuevos para subacciones de Tipos de pago.

El enforcement global fino queda para el hito 19; no mezclarlo con el cierre funcional de 17.6.

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

No mezclar esta limpieza con Tipos de pago.

---

# 8. Tipos de pago — comportamiento funcional definitivo

## Lateral

- Buscador.
- Lista de tipos configurables cargada desde memoria.
- Handle visual de arrastre.
- Botón **“Añadir nuevo tipo de pago”**.

## Área principal

Estado inicial:

- bienvenida / instrucción para seleccionar.

Al seleccionar o crear:

- `DATOS`.
- `ESTADÍSTICAS`.

## Campos de Datos

- `nombre`
  - obligatorio.
- `afectaCaja`
- `fisico`
- logo
  - obligatorio para tipos configurables.

## Slug

- interno;
- no visible;
- no editable;
- generado automáticamente desde `nombre`;
- se vuelve a calcular al guardar.

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

- `slug === 'efectivo'`.

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

Baja lógica actual:

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

El pipeline:

1. staging;
2. validación;
3. procesamiento Sharp;
4. conversión a WebP;
5. promoción a almacenamiento administrado;
6. persistencia de `archivo`;
7. asociación mediante `tipo_pago.id_archivo`.

Validaciones del pipeline existente:

- tamaño máximo;
- límite de píxeles;
- JPEG / PNG / WebP;
- no animación / multipágina;
- autoorientación;
- salida WebP.

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

Repository inicial:

- lectura activa;
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

Lectura:

```ts
getAll()
```

## Renderer

`src/app/services/tipos-pago/tipos-pago.service.ts`

Mantiene:

- maestro global como signal readonly;
- `loaded`;
- `load()`;
- `reload()`;
- `clear()`;
- `findById()`;
- `findByPublicId()`;
- `findBySlug()`.

La colección se mantiene ordenada por:

1. `orden`;
2. nombre;
3. id.

## Startup

El maestro se carga al inicio de la aplicación.

El startup global pasó a **7 pasos** incluyendo Tipos de pago.

Regla:

- Efectivo permanece dentro del maestro global.

---

# 14. 17.6.2 — estructura visual ✅

Pantalla:

`src/app/modules/gestion/pages/management-payment-types/`

Componentes principales:

- header;
- lateral;
- buscador;
- listado;
- handle visual;
- botón Nuevo;
- área de bienvenida;
- editor;
- tabs `DATOS` / `ESTADÍSTICAS`;
- responsive.

Reglas implementadas:

- Efectivo filtrado fuera de Gestión.
- Búsqueda solo contra memoria.
- Seleccionar un tipo abre Datos.
- Crear uno nuevo abre Datos.
- Cambiar desde Estadísticas a otro tipo vuelve a Datos.
- Foco automático en Nombre.

La pestaña Estadísticas continúa siendo placeholder hasta 17.6.6.

El drag handle es todavía visual: la ordenación real pertenece a 17.6.5.

---

# 15. 17.6.3 — formulario Datos + logo ✅

## Signal Form

Modelo:

- `mode: 'create' | 'edit'`
- `nombre`
- `afectaCaja`
- `fisico`
- `foto`

Validaciones:

- nombre obligatorio;
- trim vacío no válido;
- máximo 100 caracteres;
- logo obligatorio.

## Selección / alta

Seleccionar tipo:

- carga valores persistidos;
- resetea dirty;
- abre Datos;
- foco en Nombre.

Alta:

- valores iniciales:
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
- se conserva el estado actual;
- se muestra el error.

## Logo

`FilesService` expone staging para iconos de tipos de pago.

Comportamiento:

- selector nativo;
- preview inmediata;
- sustituir imagen;
- si existe staging anterior, primero se limpia de forma segura;
- si falla la nueva imagen, se conserva la anterior;
- al destruir el componente se intenta limpiar un staging todavía propiedad del renderer.

---

# 16. 17.6.4 — CRUD completo ✅

**17.6.4 está cerrado.**

Se implementaron todas las capas:

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

---

# 17. 17.6.4a — repository SQLite CRUD ✅

`TipoPagoRepository` expone actualmente:

```ts
findAll()
findById(id)
existsActiveBySlug(slug, excludeId)
create(command)
update(id, command)
deactivate(id)
```

## Create

Transacción:

- valida `ArchivoCreateRecord`;
- inserta `archivo`;
- obtiene el orden siguiente;
- inserta `tipo_pago`;
- genera `public_id`;
- devuelve el registro persistido.

Orden nuevo:

- `MAX(orden)` de tipos activos/no eliminados + 1.

Esto reproduce la intención del TPV antiguo, evitando el SQL defectuoso heredado.

## Update

- exige registro activo;
- mantiene el asset actual si no se envía `nuevoLogo`;
- crea asset nuevo si se proporciona;
- actualiza:
  - nombre;
  - slug;
  - afectaCaja;
  - fisico;
  - updated_at;
- conserva `orden`;
- el asset anterior no se borra físicamente en esta operación.

## Deactivate

- exige registro activo;
- `activo = 0`;
- `deleted_at`;
- `updated_at`;
- mantiene la referencia del asset histórico.

El repository, por diseño, no concentra la regla estructural de Efectivo; esa protección está en aplicación.

---

# 18. 17.6.4b.1 — application service + contratos ✅

Contratos públicos:

## Alta

`CrearTipoPagoCommand`

- `nombre`
- `afectaCaja`
- `fisico`
- `logoStagingId`

## Edición

`ActualizarTipoPagoCommand`

- `nombre`
- `afectaCaja`
- `fisico`
- `logoStagingId: string | null`

Semántica:

- `null` en edición:
  - conservar el logo persistido.

## Application service

`TiposPagoService` backend implementa:

- `getAll()`
- `create()`
- `update()`
- `deactivate()`

### Validación

- nombre trim;
- longitud máxima 100;
- booleanos reales;
- id positivo;
- existencia del tipo;
- unicidad del slug activo;
- logo obligatorio para configurables;
- protección de Efectivo.

Mensaje estructural:

```text
El tipo de pago Efectivo es estructural y no puede modificarse.
```

## Slug

Se genera internamente desde nombre.

Comportamiento aproximado deliberadamente alineado con `OTools::slugify()` del Osumi Framework antiguo:

- transliteración de caracteres especiales;
- acentos normalizados;
- `ñ` → `n`;
- diéresis germana tratada con equivalencias;
- ligaduras;
- lowercase;
- separación con guiones;
- eliminación de puntuación especial;
- máximo 100 caracteres.

El usuario no edita el slug.

## Promoción de imágenes

Flujo de `create/update`:

1. `prepare(stagingId, 'payment_type_icon')`;
2. repository persiste asset + tipo;
3. si commit OK:
   - se descarta staging;
4. si falla antes de persistir:
   - rollback del fichero final preparado;
5. si falla también el rollback:
   - `AggregateError`.

Esto evita dejar un asset final huérfano si falla SQLite.

---

# 19. 17.6.4b.2 — IPC / preload ✅

Canales:

```text
tipos-pago:get-all
tipos-pago:create
tipos-pago:update
tipos-pago:deactivate
```

Cada handler:

- ejecuta `assertTrustedSender`;
- delega en `TiposPagoService`.

`TiposPagoApi` expone:

```ts
getAll()
create(command)
update(id, command)
deactivate(id)
```

Preload:

```ts
window.osumiDesktop.tiposPago
```

No contiene lógica de negocio.

---

# 20. 17.6.4c.1 — renderer CRUD + memoria ✅

`TiposPagoService` renderer expone ahora:

```ts
load()
reload()
clear()

create(command)
update(id, command)
deactivate(id)

findById()
findByPublicId()
findBySlug()
```

## Alta

- llama a Electron;
- acepta como canónica la respuesta persistida;
- convierte a modelo;
- inserta en signal;
- reordena;
- no recarga todo el maestro.

## Edición

- llama a Electron;
- sustituye en memoria la instancia antigua por la persistida;
- reordena;
- no hace `reload()`.

## Baja

- llama a Electron;
- si resuelve correctamente:
  - elimina el tipo del maestro renderer.

Si una mutación falla:

- el signal no se modifica.

---

# 21. 17.6.4c.2a — Guardar alta/edición ✅

La pantalla ya guarda realmente.

Signals principales añadidos:

- `savingTipoPago`
- `saveSuccessful`

`canSaveTipoPago` contempla:

- guardado en curso;
- procesamiento de logo;
- formulario inválido;
- alta sin staging;
- edición sin cambios.

## Alta

`saveTipoPago()`:

- marca formulario touched;
- valida;
- exige staging;
- construye `CrearTipoPagoCommand`;
- llama a `TiposPagoService.create()`;
- adopta el tipo persistido;
- pasa de create a edit;
- selecciona el resultado;
- resetea el formulario;
- limpia dirty.

## Edición

Construye:

```ts
ActualizarTipoPagoCommand
```

Si no se cambió logo:

```ts
logoStagingId: null
```

Si hay reemplazo:

```ts
logoStagingId: '<staging>'
```

## Ownership del staging

Regla importante:

- antes de guardar:
  - el renderer es propietario del staging;
- si el backend guarda correctamente:
  - el backend ha consumido/promocionado ese staging;
  - el componente pone `logoStagingId = null`;
  - `destroy` no debe intentar descartarlo otra vez;
- si guardar falla:
  - el staging permanece;
  - el usuario puede reintentar.

## Feedback

Tras guardar:

```text
Tipo de pago guardado correctamente
```

durante 4 segundos.

Errores:

- `DialogService.alert`;
- mensaje normalizado con `getErrorMessage()`.

---

# 22. 17.6.4c.2b — baja desde UI ✅

La baja real está terminada y validada.

## Confirmación

Antes de eliminar:

- diálogo de confirmación;
- modo warning;
- botón “Eliminar”;
- botón “Cancelar”.

El mensaje informa de que:

- dejará de estar disponible para nuevas operaciones;
- se conservará el histórico.

## Estado

Signal:

- `deletingTipoPago`.

Durante la baja se bloquean:

- guardar;
- cambiar de ficha;
- alta;
- selector de logo;
- acciones incompatibles.

## Flujo correcto

1. seleccionar tipo configurable;
2. confirmar baja;
3. llamar a `TiposPagoService.deactivate(id)`;
4. backend ejecuta soft delete;
5. servicio renderer lo retira del maestro;
6. componente:
   - limpia selección;
   - sale de create/edit;
   - resetea formulario;
7. si existía staging pendiente:
   - se limpia después de la baja;
   - se utiliza `Promise.allSettled`;
   - un fallo de cleanup no intenta revertir una baja ya confirmada.

## Fallo de baja

Si `deactivate()` falla:

- el tipo sigue en memoria;
- la ficha permanece abierta;
- el staging pendiente se conserva;
- se muestra error;
- puede reintentarse.

## Cancelación

Si el usuario cancela el diálogo:

- no se llama al backend;
- no cambia la selección;
- no cambia memoria;
- no se descarta staging.

---

# 23. Tests de 17.6.4

Se han cubierto, entre otros:

## Repository

- lectura;
- findById;
- slug activo;
- alta;
- order siguiente;
- asset;
- edición;
- conservar logo;
- reemplazar logo;
- baja lógica.

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
- rollback de asset ante fallo.

## Renderer service

- carga única;
- reload;
- búsquedas;
- create en memoria;
- update en memoria;
- deactivate en memoria;
- orden canónico;
- clear.

## Componente

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
- create real;
- update conservando logo;
- update cambiando logo;
- ownership del staging tras save;
- feedback 4 segundos;
- baja confirmada;
- cancelación de baja;
- limpieza única de staging.

## Validación final

Tras 17.6.4c.2b el usuario confirmó en verde:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

Por tanto **17.6.4 está cerrado**.

---

# 24. Diferencias frente al TPV antiguo ya resueltas

## Guardado

TPV antiguo:

- alta y edición compartían acción;
- slug recalculado al guardar;
- `getNewTipoPagoOrden()` pretendía MAX + 1;
- logo podía reemplazarse.

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

---

# 25. 17.6.5 — siguiente bloque: orden persistente

**Este es el siguiente trabajo a realizar.**

Objetivo funcional ya acordado:

- ordenar manualmente tipos configurables mediante drag & drop;
- persistir inmediatamente;
- no usar botón Guardar;
- Efectivo no participa;
- con búsqueda activa no se puede reordenar;
- si falla persistencia:
  - no dejar UI y DB divergentes;
  - restaurar o recargar el orden fiable.

## Secuencia recomendada de implementación

Mantener unidades pequeñas.

### 17.6.5a — backend de persistencia de orden

Antes de tocar Angular CDK:

- revisar `main`;
- diseñar contrato mínimo de reorder;
- ampliar repository;
- persistencia transaccional;
- normalizar órdenes de configurables;
- mantener Efectivo en `orden = 0`;
- proteger Efectivo;
- tests backend.

Todavía sin UI.

### 17.6.5b — IPC/preload + renderer service

- canal;
- API;
- preload;
- método renderer;
- actualización segura de memoria;
- estrategia ante fallo.

### 17.6.5c — drag & drop UI

- Angular CDK DragDrop;
- solo cuando `searchTerm.trim() === ''`;
- handle actual pasa a ser funcional;
- persistencia inmediata;
- feedback/loading si hace falta;
- rollback/reload fiable ante fallo;
- tests.

Esta subdivisión es orientativa y debe confirmarse revisando `main` antes de cada bloque.

---

# 26. Regla del orden

Efectivo:

- siempre fuera del reorder de Gestión;
- sigue dentro del maestro global;
- `orden = 0`.

Configurables:

- se muestran por `orden`;
- nuevas altas obtienen `MAX(orden activo) + 1`.

Durante reorder:

- recalcular posiciones coherentes;
- persistir de forma atómica si es posible;
- no permitir drag con filtro activo.

Si persistence falla:

- restaurar el snapshot anterior o recargar desde backend;
- nunca dejar la lista visual con un orden que SQLite no tenga.

---

# 27. 17.6.6 — Estadísticas pendiente

La pestaña existe visualmente, pero todavía es placeholder.

Alcance funcional ya acordado:

- importe total cobrado con el tipo;
- número de pagos/operaciones;
- importe medio;
- evolución temporal;
- porcentaje del total de cobros;
- selector de periodo.

Fuente:

- `venta_pago`;
- relación con `venta`;
- fechas históricas.

Pendiente definir en ese bloque:

- contrato exacto de consulta;
- periodos;
- bucket temporal;
- estados loading / error / sin datos;
- representación gráfica;
- tests.

No implementar estadísticas por analogía antes de revisar tablas y comportamiento deseado.

---

# 28. 17.6.7 — regresión final pendiente

Al cerrar Tipos de pago deberán comprobarse como mínimo:

- startup;
- maestro en memoria;
- Efectivo presente internamente;
- Efectivo oculto en Gestión;
- buscador;
- selección;
- foco Nombre;
- alta;
- nombre obligatorio;
- logo obligatorio;
- slug;
- reemplazo de logo;
- edición sin cambiar logo;
- `afectaCaja`;
- `fisico`;
- baja lógica;
- referencias históricas;
- permiso 19;
- orden;
- alta después de reorder;
- filtro sin reorder;
- recuperación ante fallo de reorder;
- estadísticas;
- futura disponibilidad de `fisico = true` en Ventas;
- batería completa.

---

# 29. TicketBAI / SDK

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

# 30. Exportación legacy `.otpv`

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

# 31. Commits relevantes visibles

Al generar este documento, los commits recientes visibles incluían:

- `3f85cc2ae1d3b0b19198ef5f88c2f02e13cb69d2`
  - Terminado Gestion 17.6.3a
- `a01855c60e51c85e7129c7ebeeeb6103cfed2de0`
  - Terminado Gestión 17.6.3b.1
- `d2682bb30dc1b617c908c03c8bf9c3dabacec234`
  - Terminado Gestión 17.6.3b
- `6890ce7c5f2a140a6d9e2f38f6ac88118d539ea6`
  - Terminado Gestión 17.6.4a
- `f300df87a511922d549e1f8347863fcd28d42090`
  - Terminado Gestión 17.6.4b.1
- `30658a6afa23ab715299759d36d32652f09e1448`
  - Terminado Gestión 17.6.4b
- `2403fc8f226f7a0bedfef642b632d3b47efabfe9`
  - Terminado Gestión 17.6.4c.1
- `ed8ae0fad76be19aaccca76413da54e46a893ec1`
  - Terminado Gestión 17.6.4c.2a

17.6.4c.2b:

- confirmado funcionalmente, testeado y subido por el usuario;
- hash todavía no visible en la consulta remota usada al generar esta versión.

---

# 32. Resumen ejecutivo para retomar

Estado:

```text
✅ 16 Compras

✅ 17.1 Gestión shell/rutas
✅ 17.2 auth backend empleados
✅ 17.3 sesión/permisos
✅ 17.4 Ajustes
✅ 17.5 Empleados — CERRADO

🔨 17.6 Tipos de pago
   ✅ 17.6.1 lectura + IPC + memoria + startup
   ✅ 17.6.2 estructura visual
   ✅ 17.6.3 Datos + logo
   ✅ 17.6.4 CRUD completo
      ✅ repository
      ✅ application service
      ✅ slug
      ✅ assets
      ✅ IPC/preload
      ✅ renderer memory
      ✅ Guardar
      ✅ baja
      ✅ staging lifecycle
      ✅ tests
   ⏳ 17.6.5 orden
   ⏳ 17.6.6 estadísticas
   ⏳ 17.6.7 regresión

⏳ 18 Caja
⏳ 19 enforcement global permisos
⏸ TicketBAI 12C.9
```

## Siguiente unidad exacta

**17.6.5a — persistencia backend del orden de Tipos de pago.**

Antes de escribir código:

1. revisar `main` actualizado;
2. confirmar el hash de cierre 17.6.4c.2b;
3. inspeccionar repository/contracts actuales;
4. inspeccionar patrones de reorder existentes si los hay;
5. definir una unidad backend pequeña:
   - contrato;
   - repository;
   - transacción;
   - protección Efectivo;
   - tests.

Todavía **no** hacer drag & drop en esa primera unidad.

---

# 33. Regla final de dirección

Para cualquier módulo heredado:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se resuelven dudas funcionales;
4. se acuerdan decisiones;
5. se define plan;
6. se implementa por bloques pequeños;
7. el usuario valida;
8. se continúa solo después de verde y push.

Estado al cerrar esta v2.73:

- **17.5 Empleados: CERRADO DEFINITIVAMENTE.**
- **17.6.4 Tipos de pago CRUD: CERRADO.**
- **Siguiente: 17.6.5a — backend del orden persistente.**
- No iniciar Caja ni otros bloques sin dirección expresa del usuario.
