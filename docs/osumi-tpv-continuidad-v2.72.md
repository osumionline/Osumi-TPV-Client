# Osumi TPV Client — Documento de continuidad
**Versión 2.72 — 18 de septiembre de 2026**

## 1. Forma de trabajo — reglas obligatorias

Este proyecto se desarrolla de forma jerárquica: secciones principales → bloques → sub-bloques.

Reglas de trabajo acordadas:

- Repositorio principal: `osumionline/Osumi-TPV-Client`, rama `main`.
- El usuario desarrolla localmente, prueba los cambios y realiza commit/push.
- **Cada respuesta de desarrollo debe contener una sola unidad pequeña y autocontenida.**
- Es preferible dividir un bloque si con ello se reduce el riesgo.
- Antes de proponer código que dependa del estado actual, revisar `main` en GitHub.
- No asumir que existe una ruta, clase, contrato, helper o archivo: verificarlo primero.
- Si se pide crear un archivo nuevo, proporcionar siempre **el contenido completo**.
- Si se modifica un archivo existente con un cambio parcial:
  - indicar exactamente el bloque a localizar;
  - decir qué sustituir o dónde añadir;
  - incluir contexto suficiente para evitar ambigüedad.
- No proponer archivos o tests “para más adelante” si pertenecen a la unidad actual: o se hacen en ese bloque o no se plantean todavía.
- El usuario prueba cada unidad y confirma antes de avanzar.
- **Antes de cada nuevo bloque de desarrollo**, incluir:
  1. una lista breve de lo ya terminado, punto actual y lo pendiente;
  2. un solo párrafo corto explicando exactamente qué se hará en ese punto.
- **No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique primero qué quiere y cómo funcionaba en el TPV antiguo.**
- El usuario dirige el producto y la migración. No inventar funcionalidades por analogía.
- Todo método público nuevo debe llevar JSDoc. Si se toca una clase/interfaz y hay métodos públicos sin JSDoc, completarlos también.
- Angular moderno: standalone, zoneless, signals, `input()/output()`, `inject()`, `computed()`, `@if/@for`, Signal Forms.
- Evitar APIs Angular legacy. `viewChild()` signal es válido.
- Servicios propios Angular con `@Service()`.
- Tests Electron con Vitest imports; frontend admite globals.
- Batería completa habitual:
  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

---

## 2. Entorno y estructura

### Repositorios
- Nuevo cliente: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

### Estado técnico
- Angular **22.1.7**
- Angular Material **22.1.7**
- Electron + TypeScript
- SQLite / TypeORM
- Secrets operacionales con Electron `safeStorage`

### Aliases renderer
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

### Aliases Electron
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

No asumir rutas antiguas: revisar siempre `main`.

---

## 3. Estado general de hitos

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell + navegación + rutas ✅
  - 17.2 autenticación backend de empleados ✅
  - 17.3 portada + sesión temporal + permisos ✅
  - 17.4 Ajustes ✅
  - **17.5 Empleados ✅ CERRADO DEFINITIVAMENTE**
  - **17.6 Tipos de pago — EN CURSO**
    - **17.6.1a lectura backend tipada ✅**
    - **siguiente: 17.6.1b composición + IPC/preload de lectura**
    - 17.6.1c servicio renderer + carga en startup
    - 17.6.2 estructura visual
    - 17.6.3 formulario Datos + logo
    - 17.6.4 alta, edición y baja
    - 17.6.5 orden
    - 17.6.6 estadísticas
    - 17.6.7 regresión
- 18 Caja — pendiente; no iniciar sin dirección del usuario
- 19 enforcement global de roles/permisos — pendiente
- TicketBAI 12C.9 pausado hasta respuesta/actualización de Berein.

Punto de continuidad actual en `main`:
- `e4899a7860112a54847a0b32670d3d6db8287526` — **“Terminado Gestión Empleados”**
- `887003ab40322d20497ecd4c58af4e8f3395d5f0` — **“Terminado Gestión 17.6.1a y actualizado documento de continuidad tras Gestión Empleados”**

---

# 4. Gestión — sesión y permisos

## Sesión temporal
`GestionSessionService` mantiene:
- `empleadoId`
- `authenticatedAt`
- `expiresAt`

Duración fija: **10 minutos desde login**.

Reglas:
- no se renueva por actividad;
- no existe timer que expulse mientras la página está abierta;
- se valida al entrar/reentrar en páginas protegidas;
- “Cambiar empleado” limpia la sesión inmediatamente.

El empleado efectivo se resuelve desde `EmpleadosService` usando el id; la sesión no mantiene una copia completa.

## Permisos de Gestión
- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos de empleados
- 22 Borrar empleados
- 23 Modificar permisos de empleados
- 24 Consultar estadísticas de empleados
- 25 Copias de seguridad

Admin tiene bypass mediante `hasPerm()` / `hasAnyPerm()`.

---

# 5. Empleados — CERRADO DEFINITIVAMENTE

Todo el apartado de Empleados está implementado, probado automáticamente y validado funcionalmente.

## Backend
`EmpleadosService` backend:
- `getAll()`
- `create()`
- `update()`
- `deactivate()`
- `authenticate()`

Política:
- contraseña obligatoria en altas;
- scrypt actual;
- bcrypt legacy aceptado y migrado al autenticar;
- nombres activos únicos case-insensitive;
- color `#RRGGBB`;
- permisos 1–25 normalizados;
- baja lógica;
- protección del último administrador.

## Renderer
`EmpleadosService` mantiene la colección en memoria y expone:
- `load()`
- `reload()`
- `clear()`
- `authenticate()`
- `create()`
- `update()`
- `deactivate()`
- `findById()`
- `findByPublicId()`

## Import legacy
- bcrypt válido → `bcrypt_legacy`;
- sin contraseña utilizable → contraseña inicial `123456`, hasheada con scrypt;
- warning final específico;
- permiso 25 sintético para empleados legacy activos.

## Pantalla
Estructura:
- columna lateral con búsqueda;
- lista de empleados;
- nuevo empleado;
- área principal;
- pestaña `DATOS`;
- pestaña `PERMISOS`.

Datos:
- nombre;
- contraseña;
- confirmación;
- color.

Permisos:
- catálogo 1–25;
- agrupados;
- tooltips;
- admin con 25 permisos visibles y deshabilitados;
- separación estricta 21 / 23.

Guardado:
- create/update real;
- contraseña vacía en edición conserva contraseña;
- feedback inline **“Empleado guardado correctamente”** durante 4 segundos.

Borrado:
- permiso 22;
- confirmación;
- baja lógica;
- autoborrado bloqueado;
- último administrador protegido en backend.

Autogestión:
- conserva cualquiera de 20–24 → permanece en Empleados;
- pierde todos 20–24 → vuelve a `/gestion`;
- la sesión temporal se conserva.

## Ajuste UX final: foco en Nombre
Al:
- seleccionar un empleado;
- pulsar “Nuevo empleado”;

se activa la pestaña `DATOS` y se coloca automáticamente el foco en el campo **Nombre**.

Caso importante resuelto:
1. seleccionar empleado A;
2. cambiar a `PERMISOS`;
3. seleccionar empleado B;
4. la pantalla vuelve a `DATOS`;
5. **Nombre recibe el foco correctamente**.

Implementación moderna:
- `viewChild()` signal;
- `afterNextRender()`;
- `MatTabGroup`;
- `animationDone`;
- flag interno `nombreFocusPending`.

No se usa `@ViewChild` legacy ni `setTimeout` para resolver la transición.

El test del flujo `A → PERMISOS → B` simula expresamente `handleTabAnimationDone()` porque el entorno unitario no reproduce la animación de navegador de Angular Material igual que la aplicación real.

## Validación final
Completado correctamente:
- tests renderer;
- build renderer;
- tests Electron;
- build Electron;
- lint;
- pruebas funcionales manuales completas.

**No quedan tareas pendientes en 17.5 Empleados.**

Commit de cierre:
`e4899a7860112a54847a0b32670d3d6db8287526`

---

# 6. Ajustes — estado actual

17.4 está funcionalmente terminado.

Incluye:
- AppData público;
- secrets con `safeStorage`;
- revelación controlada;
- logo;
- SMTP;
- TicketBAI;
- impresora local.

Pequeña deuda técnica deliberadamente pendiente:
`ConfigurationUpdateCommand.integrations` sigue opcional por compatibilidad temporal.

No mezclar esta limpieza con Tipos de pago.

---

# 7. Tipos de pago — comportamiento acordado

El apartado tiene la misma estructura general que Empleados.

## Columna lateral
- buscador superior;
- listado de tipos de pago;
- datos cargados en memoria al arrancar;
- orden manual;
- drag handle;
- botón **“Añadir nuevo tipo de pago”** al pie.

## Área principal
Estado inicial:
- mensaje de bienvenida / selección.

Tras seleccionar o crear:
- pestaña `DATOS`;
- pestaña `ESTADÍSTICAS`.

## Datos
Cada tipo configurable tiene:
- nombre obligatorio;
- `afectaCaja`;
- `fisico`;
- logo obligatorio.

Slug:
- interno;
- no visible;
- no editable;
- generado automáticamente desde nombre.

## Borrado
- baja lógica;
- conservar histórico;
- conservar referencias en ventas/pagos;
- dejar de aparecer en nuevas operaciones.

## Permiso
**El permiso 19 controla todo Tipos de pago:**
- acceso;
- alta;
- edición;
- baja;
- reordenado;
- estadísticas.

No crear nuevos permisos.

---

# 8. Significado confirmado de los flags

## `afectaCaja`
Confirmado contra el TPV/API antiguos.

Semántica heredada:
- `true` → el medio se considera que afecta al efectivo/caja;
- `false` → se contabiliza como otro medio de pago.

Esta semántica deberá trasladarse al nuevo bloque de Caja sobre el modelo `venta_pago`.

## `fisico`
Confirmado contra el TPV antiguo.

- `true` → disponible al finalizar una venta presencial;
- `false` → no aparece como opción de pago presencial.

---

# 9. Efectivo — regla estructural definitiva

En el TPV nuevo, Efectivo es un `tipo_pago` real:
- nombre `Efectivo`;
- slug `efectivo`;
- `afectaCaja = true`;
- `orden = 0`;
- `fisico = true`;
- sin logo.

Es estructural y la reconstrucción legacy de pagos depende de él.

## Decisión definitiva
**Efectivo NO aparece en Gestión > Tipos de pago.**

Por tanto:
- no se edita desde esa pantalla;
- no se elimina;
- no se reordena;
- no necesita logo.

Sin embargo:
- **sí permanece en el maestro interno global cargado en memoria**;
- Ventas/Caja pueden necesitarlo como tipo real.

La exclusión de Efectivo debe hacerse en la capa/presentación específica de Gestión, no eliminándolo del maestro global.

---

# 10. Tipos de pago — búsqueda y orden

## Búsqueda
Si el buscador tiene texto:
- se puede seleccionar;
- **no se puede reordenar**.

## Reordenado
Sin filtro:
- drag & drop;
- recalcular `orden`;
- actualizar memoria;
- persistir inmediatamente;
- sin botón Guardar.

Si falla persistencia:
- no dejar UI y DB divergentes;
- restaurar o recargar el orden fiable.

Efectivo no participa visualmente en el reorder de Gestión.

---

# 11. Tipos de pago — Estadísticas acordadas

La pestaña `ESTADÍSTICAS` se implementará en el nuevo TPV.

El TPV antiguo la tenía prevista pero nunca llegó a implementarse.

Alcance acordado:
- importe total cobrado con ese tipo;
- número de pagos/operaciones;
- importe medio por operación;
- evolución temporal;
- porcentaje del total de cobros representado por ese tipo;
- selector de periodo.

Fuente principal:
- `venta_pago`;
- relación con `venta`;
- fechas históricas.

El diseño exacto del selector temporal y de los gráficos se cerrará dentro de 17.6.6.

---

# 12. Infraestructura previa ya existente

Antes de empezar 17.6 ya existían:

`electron/contracts/configuration/tipos-pago/tipo-pago.interface.ts`

Campos:
- `id`
- `publicId`
- `nombre`
- `slug`
- `foto`
- `afectaCaja`
- `orden`
- `fisico`

También existe:
`src/app/model/tipos-pago/tipo-pago.model.ts`

Además, el import legacy ya soporta:
- registros `tipo_pago`;
- nombre;
- slug;
- afecta_caja;
- orden;
- fisico;
- activo/baja;
- logos con purpose `payment_type_icon`;
- relación mediante `id_archivo`.

La instalación nueva ya crea Efectivo como tipo estructural.

---

# 13. 17.6.1a — lectura backend tipada ✅

Este bloque ya está implementado y probado.

Commit:
`887003ab40322d20497ecd4c58af4e8f3395d5f0`

## Nuevos archivos

### `electron/backend/domain/tipos-pago/tipo-pago-record.interface.ts`
`TipoPagoRecord`:
- `id`
- `publicId`
- `nombre`
- `slug`
- `fotoRelativePath`
- `afectaCaja`
- `orden`
- `fisico`

### `electron/backend/contracts/tipos-pago/tipo-pago.repository.interface.ts`
Actualmente define:
- `findAll(): Promise<readonly TipoPagoRecord[]>`

### `electron/infrastructure/database/typeorm/typeorm-tipo-pago.repository.ts`
Implementa la lectura SQLite.

Consulta:
- `tipo_pago`;
- `LEFT JOIN archivo`;
- solo `activo = 1`;
- solo `deleted_at IS NULL`;
- logo solo si `archivo.deleted_at IS NULL`;
- orden: `orden`, nombre NOCASE, id.

Convierte:
- `afecta_caja` → boolean;
- `fisico` → boolean;
- `relative_path` → `fotoRelativePath`.

### `electron/backend/application/tipos-pago/tipos-pago.service.ts`
Expone:
- `getAll()`

Convierte `TipoPagoRecord` a `TipoPagoInterface` y pasa el logo por `AssetUrlBuilder`.

## Decisión importante de arquitectura
`getAll()` **incluye Efectivo**.

Esto es intencionado:
- forma parte del maestro global;
- puede no tener logo;
- se necesita internamente.

La pantalla Gestión filtrará Efectivo más adelante.

## Tests
`tipos-pago.service.spec.ts` cubre:
- transformación de ruta de logo;
- mapeo completo;
- conservación de Efectivo;
- Efectivo sin logo.

17.6.1a pasó:
- tests Electron;
- build Electron;
- lint.

---

# 14. Siguiente bloque exacto — 17.6.1b

**Este es el siguiente trabajo a realizar.**

Objetivo:
conectar la lectura backend de Tipos de pago con el renderer a través de la infraestructura Electron existente.

Debe incluir como una unidad pequeña y autocontenida:
- composición en `application-composition.ts`;
- instancia `TypeOrmTipoPagoRepository`;
- instancia `TiposPagoService`;
- nuevo canal IPC de `getAll`;
- registro IPC;
- contrato `TiposPagoApi` si todavía no existe;
- incorporación a `OsumiDesktopApi`;
- preload con `tiposPago.getAll()`.

Todavía **no** debe:
- crear `TiposPagoService` renderer;
- cargar en startup;
- hacer CRUD;
- hacer reorder;
- tocar UI.

Eso corresponde a bloques posteriores.

Antes de entregar código:
- revisar de nuevo `main`;
- verificar nombres/rutas exactos;
- seguir el patrón actual de Empleados/Categorías.

---

# 15. 17.6.1c — renderer + startup

Después de 17.6.1b:

Objetivo:
cargar el maestro completo de Tipos de pago en memoria al arrancar la aplicación.

Incluye:
- servicio renderer de Tipos de pago;
- signal readonly del maestro;
- `loaded`;
- `load()`;
- `reload()`;
- `clear()`;
- conversión `TipoPagoInterface` → modelo `TipoPago`;
- incorporación a `ApplicationStartupService`;
- aumento de `totalSteps`;
- paso “Cargando tipos de pago…”;
- tests renderer/startup.

Regla:
- el maestro global incluye Efectivo.

La colección configurable para Gestión excluirá `slug === 'efectivo'` en la pantalla/selector correspondiente, no en `getAll()` backend.

---

# 16. 17.6.2 — estructura visual

Objetivo:
crear la pantalla base siguiendo la composición consolidada de Empleados.

Incluye:
- ruta/página;
- header;
- lateral;
- buscador;
- listado en memoria;
- selección;
- handle visual;
- botón Nuevo;
- mensaje inicial;
- tabs Datos/Estadísticas;
- responsive;
- guard/permiso 19.

Reglas:
- Efectivo oculto;
- buscar no consulta backend;
- si hay filtro, reorder deshabilitado.

---

# 17. 17.6.3 — formulario Datos + logo

Signal Form:
- nombre;
- afectaCaja;
- fisico;
- logo.

Reglas:
- nombre obligatorio;
- logo obligatorio para tipos configurables;
- alta sin logo inválida;
- edición conserva logo existente;
- cambio de logo con preview;
- slug automático interno;
- Guardar/Cancelar;
- dirty state;
- feedback **“Tipo de pago guardado correctamente”**.

Reutilizar el pipeline seguro de imágenes existente:
- staging;
- promoción;
- `archivo`;
- `id_archivo`;
- purpose `payment_type_icon`.

---

# 18. 17.6.4 — alta, edición y baja

Objetivo:
cerrar CRUD funcional.

Incluye:
- comandos públicos;
- repository create/update/deactivate;
- validaciones backend;
- slug automático;
- assets;
- IPC/preload;
- renderer;
- upsert inmediato en memoria;
- baja lógica;
- confirmación;
- errores;
- tests.

Reglas:
- no permitir modificar/eliminar Efectivo por caminos indirectos;
- conservar histórico;
- logo obligatorio para configurables.

---

# 19. 17.6.5 — orden

Objetivo:
drag & drop persistente.

Incluye:
- Angular CDK DragDrop;
- solo cuando búsqueda está vacía;
- memoria inmediata;
- persistencia inmediata;
- rollback/reload ante fallo;
- normalización del campo `orden`;
- tests.

Efectivo:
- permanece en maestro global;
- no participa en la lista visual;
- no puede moverse.

---

# 20. 17.6.6 — estadísticas

Implementar:
- contrato de consulta;
- repository/backend;
- selector de periodo;
- total cobrado;
- operaciones;
- importe medio;
- evolución temporal;
- porcentaje sobre el total;
- estados loading / sin datos / error;
- UI y gráficos;
- tests.

Fuente:
- `venta_pago`;
- `venta`.

---

# 21. 17.6.7 — regresión final

Comprobar como mínimo:
- startup;
- memoria;
- Efectivo presente internamente;
- Efectivo oculto en Gestión;
- búsqueda;
- selección;
- alta;
- logo obligatorio;
- edición;
- `afectaCaja`;
- `fisico`;
- slug;
- baja lógica;
- histórico;
- permiso 19;
- reorder;
- filtro sin reorder;
- recuperación ante fallo de reorder;
- estadísticas;
- consumo futuro desde Ventas de `fisico = true`;
- batería completa.

---

# 22. Consideraciones técnicas de Tipos de pago

## Activos
La lectura operativa usa:
- `activo = 1`;
- `deleted_at IS NULL`.

Los tipos dados de baja siguen existiendo para histórico.

## Assets
Import legacy:
- purpose `payment_type_icon`;
- tabla `archivo`;
- `id_archivo`.

El nuevo CRUD debe seguir el almacenamiento administrado existente.

## Ventas
`fisico = true` determinará los tipos alternativos disponibles al finalizar una venta presencial.

## Caja
`afectaCaja` se mantiene porque será relevante para el bloque 18 Caja.

## Efectivo
Usar `slug === 'efectivo'` como identidad estable salvo que durante implementación se cree una constante compartida equivalente.

El backend de mutación debe protegerlo aunque la UI ya lo oculte.

---

# 23. TicketBAI / SDK

SDK:
- `@osumi/ticketbaiws`
- versión 1.0.1
- ESM only
- tests OK
- README general + docs por dominio.

Las inconsistencias de Berein ya fueron reportadas.

12C.9:
- pausado;
- no reabrir hasta respuesta/actualización de Berein.

---

# 24. Exportación legacy `.otpv`

Incluye:
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
- configuración local de máquina.

---

# 25. Regla de dirección de desarrollo

Para módulos heredados:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se resuelven dudas funcionales;
4. se acuerdan decisiones;
5. se define plan;
6. se implementa por bloques pequeños.

Estado al cerrar este documento:

- **17.5 Empleados: CERRADO DEFINITIVAMENTE.**
- **17.6 Tipos de pago: bloque activo.**
- **17.6.1a: terminado.**
- **Siguiente unidad exacta: 17.6.1b — composición + IPC/preload de lectura.**
- No abrir Caja ni otros apartados hasta que el usuario los explique y dirija.
