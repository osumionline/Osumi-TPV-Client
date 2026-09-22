# Osumi TPV Client — Documento de continuidad v2.80

**Fecha:** 22 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento sustituye a `docs/osumi-tpv-continuidad-v2.79.md`.

Su objetivo es permitir retomar el desarrollo sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

- Cada respuesta de desarrollo contiene **una sola unidad pequeña y autocontenida**.
- Antes de cada bloque:
  1. resumir lo terminado;
  2. indicar el punto actual;
  3. indicar lo pendiente;
  4. explicar qué hace exactamente la unidad actual.
- Antes de proponer código dependiente del repositorio, revisar siempre `main`.
- No inventar rutas, clases, helpers, APIs ni contratos.
- Archivo nuevo: contenido completo.
- Archivo existente: bloque exacto, localización y contexto suficiente.
- Los tests de una unidad se implementan en esa misma unidad.
- El usuario ejecuta siempre la batería completa:

  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```

- No continuar si hay tests/builds fallando.
- Tras verde + push, volver a revisar `main` antes del siguiente bloque.
- No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique objetivo y comportamiento heredado.
- Todo método público nuevo debe llevar JSDoc.
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

## Convención de exports

Regla expresa del usuario:

```text
1 único símbolo exportado por archivo
→ usar siempre export default

2 o más símbolos exportados por archivo
→ usar exports nominales
→ NO usar ningún export default
```

Aplica a:

- interfaces;
- tipos;
- funciones;
- clases;
- constantes;
- cualquier otro símbolo exportado.

No mezclar `export default` con otros exports cuando un archivo exporta más de un símbolo.

## Angular

- Angular 22.1.7.
- standalone.
- zoneless.
- signals.
- `input()` / `output()`.
- `inject()`.
- `computed()` / `effect()` cuando proceda.
- `@if` / `@for`.
- Signal Forms.
- `viewChild()` signal.
- evitar APIs legacy salvo necesidad real.
- servicios propios con `@Service()`.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer/frontend: globals según configuración actual.
- Aislar hijos pesados en specs del padre cuando el hijo ya tiene tests propios.
- Caso consolidado: `PaymentTypeStatisticsComponent` se sustituye por stub en el spec de `ManagementPaymentTypesComponent` para no inicializar ECharts/`ResizeObserver` en JSDOM.

# 2. Repositorios y acceso

## Osumi TPV

- Cliente nuevo: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

## Indomable Store

Repositorios disponibles para estudiar la sincronización futura:

- Panel Angular: `https://github.com/igorosabel/indomable-admin`
- Backend Osumi Framework: `https://github.com/igorosabel/indomable-api`
- Frontend tienda: `https://github.com/igorosabel/indomable-frontend`

**Regla expresa del usuario:** todos los repositorios GitHub tratados en el proyecto, incluidos `osumionline/*` e `igorosabel/*`, deben manejarse en **modo estrictamente de solo lectura** desde ChatGPT. No crear commits, ramas, PRs, issues, comentarios ni modificar archivos.

La GitHub App `ChatGPT Codex Connector` está instalada también en la cuenta `igorosabel`; el acceso de lectura funciona correctamente.

---

# 3. Estado general

## Cerrado

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell/rutas ✅
  - 17.2 Auth backend empleados ✅
  - 17.3 Sesión/permisos ✅
  - 17.4 Ajustes ✅
  - 17.5 Empleados ✅
  - 17.6 Tipos de pago ✅
- Corrección foco modal Gestión ✅
- Ventas/Empleados inicial ✅
- Retirada total del antiguo flag `empleados` ✅
- 18 Caja ✅ **CERRADO EN EL ALCANCE ACORDADO**
  - 18.1–18.10 ✅
- B3 — Selector de empleado integrado en la venta ✅
  - B3.1 nueva venta normal ✅
  - B3.2 reservas + limpieza del selector modal ✅

`Informes` continúa deliberadamente como placeholder. No bloquea el cierre del hito 18 porque el usuario pidió no diseñarlo todavía.

## Siguiente hito

- **19 — Simplificación y aplicación definitiva de permisos** 🔨

La definición funcional ya está cerrada.

Plan:

```text
19.1 — Nuevo catálogo con IDs string
       + schema
       + contratos/modelos
       + importador legacy

19.2 — Ventas
       ventas.modificar_importes

19.3 — Gestión
       gestion.ajustes
       gestion.tipos_pago
       gestion.empleados
       gestion.copias_seguridad

19.4 — Regresión final
```

## Pendiente posterior

- resto de desarrollo funcional de la aplicación ⏳
- Sincronización Indomable Store ↔ Osumi TPV 📋 **pospuesta hasta terminar la aplicación**
- TicketBAI 12C.9 ⏸ pendiente de Berein.

# 4. Punto exacto de continuidad

Último commit confirmado en `main` al generar esta versión:

```text
f8d8498b463735f2d2503bd6f8ded62fa65a21e8
Terminado B3.2
```

Commits inmediatamente anteriores relevantes:

```text
5959aa8c1f4519c99ccdb7915245d928a6d1b940
Terminado B3.1

e8e8ec8ccf7e7a2fd705b90bd086880e1770caad
Actualizado documento de continuidad tras Cerrar caja y actualizaciones de librerías

eda8361e3d5eadc0ca4e230fc8b333685ec6bfe4
Terminado Caja 18
```

El usuario confirmó para B3:

- batería completa de tests/build/lint correcta;
- pruebas funcionales correctas;
- nueva venta con varios empleados funcionando;
- reservas con varios empleados funcionando;
- selector integrado visualmente aprobado;
- cambios subidos a `main`.

## Siguiente paso exacto

El siguiente bloque es:

```text
19.1 — Nuevo catálogo de permisos con IDs string
```

Alcance de 19.1:

- sustituir los identificadores numéricos por claves `string`;
- simplificar el catálogo a cinco permisos;
- actualizar schema SQLite;
- actualizar contratos/modelos/repositories/services afectados;
- adaptar Gestión > Empleados;
- adaptar importador legacy;
- conservar bypass de administrador;
- tests de regresión.

No aplicar todavía los permisos funcionalmente en Ventas o Gestión; eso queda para 19.2 y 19.3.

# 5. Ventas / Empleados — estado definitivo ✅

La antigua configuración `empleados` ha desaparecido por completo.

## Regla funcional final

```text
0 empleados
→ error / no se puede iniciar venta

1 empleado
→ la venta se crea directamente con ese empleado

2 o más empleados
→ la venta se crea inmediatamente con empleado = null
→ la pestaña aparece blanca con texto negro
→ el selector de empleado se muestra dentro del contenido de esa venta
```

La selección de empleado **ya no es un modal global** y no bloquea la navegación por la aplicación.

El usuario puede dejar una venta pendiente de empleado y navegar a:

- Caja;
- Almacén;
- Artículos;
- Compras;
- Clientes;
- Gestión;
- cualquier otro apartado disponible.

## Pestaña pendiente

`SalesTabsComponent` ya utiliza:

```text
empleado == null
→ background #ffffff
→ text #000000
```

Al seleccionar un empleado:

```text
VentasService.asignarEmpleado(...)
```

actualiza la venta y la pestaña adopta automáticamente:

- color del empleado;
- color de texto del empleado.

## Contenido de la venta

Mientras:

```text
venta.empleado === null
```

se muestra:

```text
EmployeeSelectorComponent
```

embebido dentro de la propia venta.

Cuando el empleado deja de ser `null` se muestra:

```text
SaleWorkspaceComponent
```

## Reservas

B3.2 unificó también el flujo de reservas.

Regla:

```text
1 empleado
→ crearVentaDesdeReservas(empleado, ...)

2+ empleados
→ crearVentaDesdeReservas(null, ...)
→ pestaña pendiente
→ selector embebido
```

Ya no existen para este flujo:

```text
selectingEmployee
pendingReservasLoad
selector global modal
```

`EmployeeSelectorComponent` quedó como componente exclusivamente embebido.

## Cliente

Mientras una venta no tiene empleado asignado:

```text
venta.empleado === null
```

la acción de Cliente permanece deshabilitada.

## Limpieza histórica

El antiguo flag `empleados` fue eliminado de:

- `AppData`;
- instalación;
- Gestión > Ajustes;
- contratos;
- mappers;
- validadores;
- formularios;
- Ventas;
- tests;
- importador `.otpv`;
- exportador `.otpv`;
- compatibilidad temporal de `JsonAppDataRepository`.

No crear compatibilidad legacy futura para este flag.

# 6. Gestión y permisos

## Estado actual

`GestionSessionService` mantiene una sesión temporal de Gestión:

- `empleadoId`
- `authenticatedAt`
- `expiresAt`
- duración fija: 10 minutos desde login.

No se renueva por actividad.

Los administradores tienen bypass mediante las comprobaciones de permisos existentes.

Actualmente los permisos siguen almacenados como identificadores numéricos hasta implementar 19.1:

```text
empleado_permiso.id_permiso INTEGER
EmpleadoRecord.permisos: readonly number[]
```

Esto debe cambiar en el siguiente bloque.

## Decisión funcional definitiva para el hito 19

Se abandona la idea de aplicar permisos a multitud de apartados operativos.

Motivo:

> En un comercio prima la rapidez. Introducir identificaciones adicionales en Marcas, Proveedores, Artículos, Clientes, Compras, Caja, etc. generaría demasiada fricción y probablemente llevaría a conceder todos los permisos o compartir una cuenta administradora.

Los permisos quedarán restringidos a dos ámbitos donde ya existe una identidad natural:

```text
Ventas
→ usa el empleado ya asignado a la venta

Gestión
→ usa el empleado autenticado en GestionSessionService
```

El resto de la aplicación no tendrá enforcement de permisos.

## Nuevo catálogo definitivo

### Ventas

```text
ventas.modificar_importes
```

Nombre visible:

```text
Modificar importes, descuentos o descuentos directos.
```

Semántica:

Permite modificar el importe directo de un artículo en una venta y aplicar descuentos directos.

No requiere ninguna identificación adicional porque la venta ya tiene un empleado asignado.

### Gestión

```text
gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

Semántica:

```text
gestion.ajustes
→ modificar ajustes generales de la aplicación

gestion.tipos_pago
→ modificar tipos de pago

gestion.empleados
→ acceder y gestionar empleados como una capacidad única

gestion.copias_seguridad
→ acceder y gestionar copias de seguridad
```

Gestión continúa requiriendo autenticación como hasta ahora.

## Administradores

Regla:

```text
admin = true
→ acceso completo / bypass de permisos
```

No es necesario asignar explícitamente las cinco claves a un administrador.

## IDs string

Decisión cerrada:

> Los nuevos permisos utilizarán claves `string` estables en lugar de IDs numéricos.

Claves definitivas:

```text
ventas.modificar_importes
gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

Ventajas buscadas:

- significado visible directamente en código y SQLite;
- no depender de numeraciones;
- poder añadir/eliminar permisos sin renumerar;
- evitar huecos históricos;
- contratos más expresivos.

Previsión para 19.1:

```text
EmpleadoPermissionDefinition.id
number → string

EmpleadoRecord.permisos
readonly number[] → readonly string[]

empleado_permiso
id_permiso INTEGER → permiso TEXT
```

No crear migración de versión: el proyecto sigue antes de la primera versión estable y `DATABASE_SCHEMA_VERSION = 1`.

## Importación legacy

Mapeo definitivo acordado:

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
```

Cualquier otro permiso antiguo se descarta:

```text
2–17
21–24
cualquier otro ID no reconocido
→ no se importa
```

Decisión especialmente importante:

```text
20
```

deja de significar únicamente “crear empleados” y se utiliza como origen legacy para conceder la nueva capacidad global:

```text
gestion.empleados
```

Los antiguos permisos:

```text
21 modificar empleado
22 borrar empleado
23 modificar permisos
24 estadísticas empleado
```

no conceden nada en el nuevo modelo.

## Plan de implementación

```text
19.1 — catálogo string + schema + contratos + importador
19.2 — Ventas: ventas.modificar_importes
19.3 — Gestión: cuatro permisos
19.4 — regresión final
```

# 7. Tipos de pago — estado definitivo

17.6 está cerrado.

Incluye:

- maestro global;
- Efectivo estructural;
- búsqueda;
- alta/edición/baja lógica;
- slug interno;
- logo/staging/WebP;
- drag & drop;
- persistencia transaccional del orden;
- rollback optimista;
- estadísticas;
- filtros temporales;
- ECharts;
- protección ante respuestas obsoletas;
- tests y pruebas funcionales.

## Efectivo estructural

- nombre `Efectivo`
- slug `efectivo`
- `afectaCaja = true`
- `orden = 0`
- `fisico = true`
- sin logo

Está en el maestro global pero oculto en Gestión; no se edita, elimina ni reordena.

## Semántica de `afectaCaja`

Esta semántica se mantiene para 18 Caja.

No significa “es el tipo Efectivo”.

Significa:

> Los pagos realizados con ese tipo incrementan el efectivo teórico de la caja.

Por tanto cualquier tipo de pago con:

```text
afectaCaja = true
```

se suma al bloque de “Ventas efectivo” del cierre.

---

# 8. TicketBAI / SDK

SDK:

```text
@osumi/ticketbaiws
```

Estado:

- versión 1.0.1;
- ESM only;
- tests OK;
- README general;
- documentación exhaustiva en `docs/`.

12C.9 sigue pausado hasta respuesta/actualización de Berein.

---

# 9. Sincronización Indomable Store — prioridad actual

La arquitectura de sincronización se ha estudiado y documentado, pero la prioridad ha cambiado explícitamente.

Decisión del usuario:

> No se implementará sincronización/conectividad con la tienda online hasta terminar el desarrollo funcional de la aplicación.

Por tanto:

```text
18 Caja ✅
↓
B3 selector empleado integrado ✅
↓
19 simplificación/aplicación de permisos
↓
resto de desarrollo funcional
↓
aplicación funcionalmente terminada
↓
sincronización Indomable Store ↔ Osumi TPV
```

No iniciar ningún bloque S1–S10 mientras la aplicación principal siga en desarrollo.

La planificación existente se conserva para retomarla después.

# 10. Sincronización futura — arquitectura acordada

**Planificada, no iniciada.**

La conexión la iniciará siempre Osumi TPV Client:

```text
Osumi TPV Client / Electron
        │
        │ HTTPS
        ▼
indomablestore.com / indomable-api
```

No habrá servidor local expuesto en el TPV.

Se eliminan como requisito:

- entrada desde Internet al PC;
- NAT/port forwarding;
- IP dinámica;
- `hosts`;
- Apache local para recibir ventas.

## Ciclo conceptual

```text
arranca TPV
    ↓
si venta online está activa
    ↓
consulta ventas pagadas pendientes
    ↓
procesa cada pedido
    ↓
confirma resultados
    ↓
sincroniza stock/precios
    ↓
espera X minutos
    ↓
repite
```

Si el TPV está apagado o sin Internet:

- los pedidos permanecen pendientes;
- se recuperan en el siguiente ciclo.

---

# 11. Sincronización futura — decisiones cerradas

## Pedido

- fecha económica: `Order.payed_at`;
- `id_cliente = NULL`;
- solo ventas pagadas en primera versión;
- cancelaciones/devoluciones/reembolsos fuera de alcance inicial.

## Artículos

Clave compartida:

```text
localizador
```

Snapshot a ampliar en `indomable-api`:

```text
localizador
nombre
marca
iva
```

Importes históricos ya disponibles:

- `amount_before`
- `discount`
- `amount_after`

## PUC

- no lo envía la web;
- se toma del artículo local del TPV al importar.

## Tipo de pago

Usar identificador estable:

```text
tipoPagoPublicId
```

No usar ids SQLite entre sistemas.

## Empleado

Empleado estructural futuro:

```text
Tienda online
```

Debe quedar oculto para uso humano.

## Caja

Venta online futura:

```text
id_caja = NULL
```

Venta presencial:

```text
id_caja != NULL
```

## Idempotencia

Diseño conceptual:

```text
origen = tpv | online
referencia_externa = id pedido online
```

Un reintento del mismo pedido no puede crear una segunda venta.

## Seguridad

- HTTPS;
- secreto compartido;
- `safeStorage`;
- formato compatible con `osumionline/plugin-token`;
- HMAC SHA-256;
- `iat`;
- `exp`;
- propósito/request id cuando se cierre contrato.

## Stock

No copiar el snapshot absoluto antiguo sin resolver la carrera de concurrencia.

---

# 12. Sincronización futura — plan S1–S10

Aparcado hasta finalizar la aplicación.

## S1 — Modelo TPV

- origen;
- referencia externa;
- idempotencia;
- `id_caja` nullable online;
- empleado “Tienda online”.

## S2 — Snapshot `indomable-api`

- localizador;
- nombre;
- marca;
- IVA;
- normalizar `sync`.

## S3 — API versionada

- pull;
- ACK;
- lotes;
- errores;
- autenticación.

## S4 — Cliente HTTP Electron

- configuración;
- token;
- timeouts;
- errores.

## S5 — Importador de ventas

- idempotencia;
- resolver artículos;
- resolver tipo pago;
- PUC local;
- snapshots;
- validación;
- persistencia;
- TicketBAI/documentos.

## S6 — Scheduler

- startup;
- intervalo;
- exclusión mutua;
- recuperación/reintento.

## S7 — ACK

- resultado por pedido;
- `sync = 2` éxito;
- `sync = 1` error/reintento.

## S8 — Stock/precios

- resolver concurrencia;
- contrato tipado.

## S9 — Observabilidad

- último intento;
- último éxito;
- último error.

## S10 — Retirada legacy

- llamadas web → TPV;
- `sync_url`;
- `DoSync`;
- `ForceSync`;
- infraestructura de exposición del PC.

---

# 13. 18 Caja — alcance funcional acordado

El apartado Caja tiene cuatro pestañas:

```text
1. Histórico de ventas
2. Salidas caja
3. Cerrar caja
4. Informes
```

Estado final del hito:

```text
Histórico de ventas  ✅
Salidas caja         ✅
Cerrar caja          ✅
Informes             📋 placeholder intencionado
```

`18 Caja` se considera **cerrado en el alcance acordado**.

## Histórico

Reutiliza `HistoricalSalesComponent` en modo embebido.

## Salidas caja

CRUD completo sobre `movimiento_caja tipo='salida'`.

## Cerrar caja

Completo:

```text
snapshot económico          ✅
bloque superior             ✅
recuento monedas/billetes   ✅
tipos de pago inferiores    ✅
confirmación                ✅
cierre transaccional        ✅
contexto post-cierre        ✅
nueva apertura              ✅
compatibilidad legacy       ✅
rediseño compacto           ✅
regresión final             ✅
```

## Informes

No diseñar todavía.

Debe seguir como placeholder hasta que el usuario defina expresamente:

- qué informes necesita;
- qué datos deben mostrar;
- filtros;
- impresión/exportación;
- referencia del sistema anterior si procede.

No inferir requisitos a partir del TPV antiguo.

# 14. 18 Caja — Histórico de ventas

El TPV antiguo reutilizaba el mismo componente de histórico tanto:

- dentro de Caja;
- como en el modal abierto desde Ventas.

El cliente nuevo mantiene esa misma idea.

Componente:

```text
HistoricalSalesComponent
```

## Implementación terminada

Se añadió el input:

```text
embedded: boolean
```

con valor por defecto:

```text
false
```

### Modal desde Ventas

Se conserva:

- backdrop;
- panel overlay;
- cabecera;
- botón cerrar;
- pestañas internas del modal;
- comportamiento postventa existente;
- foco inicial del botón de cierre;
- Escape/cierre;
- detalle;
- TicketBAI;
- impresión;
- ticket regalo;
- email;
- cambio de cliente;
- cambio de tipo de pago.

No se duplicó ninguna consulta ni acción.

### Embebido en Caja

Con:

```html
<otpv-historical-sales [embedded]="true" />
```

se elimina visualmente:

- backdrop;
- posicionamiento modal;
- cabecera modal;
- botón cerrar;
- pestañas internas.

Se muestra directamente el panel de Histórico de ventas.

La antigua pestaña interna placeholder `Salidas caja` no aparece en modo embebido porque Caja ya tiene su propia pestaña real.

## Detalles técnicos consolidados

- En modo embebido `close()` no emite.
- El foco inicial del botón cerrar solo se aplica en modo modal.
- El wrapper no conserva la clase global `.overlay` al estar embebido, porque esa clase es `position: fixed`.
- El layout responsive del modal no se aplica al modo embebido.
- El histórico mantiene sus filtros Fecha/Rango y su comportamiento previo.
- Existen tests que protegen ambos modos.

Estado:

```text
18.2 ✅ CERRADO
```

# 15. 18 Caja — Salidas de caja

Objetivo:

Registrar retiradas manuales de efectivo realizadas durante una caja abierta.

Ejemplos:

- comprar folios;
- pagar algo en mano;
- pagar a un repartidor;
- cualquier gasto que requiera sacar efectivo físicamente.

Componente renderer actual:

```text
CashOutflowsComponent
```

Servicio renderer:

```text
CajaSalidasService
```

## Filtros

La cabecera quedó alineada visual y funcionalmente con `HistoricalSalesComponent`.

Dos modos:

### Fecha

- botones `Fecha` / `Rango` como selector de modo;
- `<input type="date">` nativo;
- calendario nativo del sistema;
- botones anterior/siguiente;
- carga automática al cambiar de día.

### Rango

- fecha desde;
- fecha hasta;
- botón Buscar.

Validación:

```text
desde <= hasta
```

La consulta usa fechas civiles `YYYY-MM-DD`.

## Layout

Dos columnas.

### Izquierda

Listado de salidas:

- concepto;
- fecha/hora;
- importe;
- icono de candado cuando la salida pertenece a una caja cerrada.

Debajo:

```text
Nueva salida de caja
```

Si no existe caja abierta:

- el histórico sigue siendo consultable;
- no se permite crear una salida nueva.

### Derecha

Formulario Signal Forms:

- concepto obligatorio;
- descripción opcional;
- importe obligatorio.

Acciones:

- Eliminar;
- Cancelar;
- Guardar.

Las salidas de cajas cerradas se muestran en modo solo lectura.

## Flujo de alta

Al crear:

1. se usa la caja abierta actual;
2. backend asigna fecha/hora actual;
3. se persiste;
4. el filtro vuelve al día actual, conservando el modo Fecha/Rango;
5. se refresca el listado;
6. la salida recién creada queda seleccionada;
7. el formulario queda preparado para corregirla o eliminarla;
8. aparece durante 4 segundos:

```text
Salida de caja guardada correctamente
```

No aparece diálogo modal de éxito al guardar.

## Flujo de edición

Al editar:

- se conserva el `publicId`;
- se conserva la fecha original;
- se actualiza el listado en memoria;
- la salida sigue seleccionada;
- el formulario se resetea al snapshot persistido;
- aparece el mismo feedback inferior durante 4 segundos.

No aparece diálogo modal de éxito.

## Flujo de borrado

Al borrar:

1. se pide confirmación;
2. backend realiza baja lógica;
3. se muestra diálogo de éxito;
4. se refresca el filtro actualmente visible;
5. no se selecciona automáticamente ninguna otra salida.

La confirmación y el diálogo de éxito de eliminación sí deben mantenerse.

## Cancelar

- en alta, restaura el formulario vacío;
- en edición, restaura los datos persistidos de la salida seleccionada.

## Feedback

El patrón de guardado replica el usado en Artículos:

- señal temporal;
- texto verde en el footer;
- duración 4 segundos;
- desaparece al iniciar otra operación.

Estado:

```text
18.4b ✅ CERRADO
```

# 16. Salidas de caja — modelo nuevo

El esquema actual utiliza:

```text
movimiento_caja
```

Campos relevantes:

- `public_id`
- `id_caja`
- `id_empleado`
- `tipo`
- `concepto`
- `importe_cents`
- `descripcion`
- `created_at`
- `updated_at`
- `deleted_at`

Para este subapartado:

```text
tipo = 'salida'
```

No existe ni debe crearse una tabla paralela equivalente a `pago_caja`.

## Contratos implementados

Lectura:

```text
SalidaCajaConsulta
SalidaCajaInterface
```

Escritura:

```text
CrearSalidaCajaCommand
ActualizarSalidaCajaCommand
EliminarSalidaCajaCommand
```

`CajaApi` expone:

```text
getSalidas()
createSalida()
updateSalida()
deleteSalida()
```

## Persistencia

`TypeOrmCajaRepository` implementa:

```text
findSalidasByPeriod()
createSalida()
updateSalida()
deleteSalida()
```

Reglas:

- alta/edición/borrado se ejecutan transaccionalmente;
- alta genera `public_id` UUID;
- alta usa `new Date().toISOString()` como `created_at`;
- edición conserva `created_at`;
- borrado usa `deleted_at`;
- solo se recuperan movimientos activos;
- solo se recuperan `tipo = 'salida'`;
- orden: fecha descendente + `id` descendente.

Después de cualquier alta/edición/baja se reconstruye:

```text
caja.movimientos_salida_cents
```

mediante la suma real de movimientos activos de esa caja.

No se mantiene mediante deltas acumulativos.

Esto conserva la base coherente antes del cierre, aunque 18.5/18.8 volverán a calcular los valores canónicos al cerrar.

## Validación de aplicación

Backend normaliza:

- `cajaPublicId`;
- `publicId`;
- `concepto.trim()`;
- descripción vacía → `null`.

Reglas:

```text
concepto: 1..250 caracteres tras trim
importeCents: entero seguro > 0
```

El renderer usa:

```text
eurosToCents()
centsToEuros()
```

No se implementó una selección de empleado para Salidas:

```text
movimiento_caja.id_empleado = NULL
```

El esquema lo permite y el usuario no ha definido un flujo de empleado para esta operación.

No inventar uno.

## Compatibilidad legacy

El importador ya transforma:

```text
pago_caja
→ movimiento_caja tipo 'salida'
```

Por tanto el histórico importado está alineado con el modelo nuevo.

# 17. Salidas de caja — editabilidad

El TPV antiguo impedía modificar salidas pertenecientes a cajas ya cerradas.

El cliente nuevo conserva y refuerza esa regla.

## Regla definitiva

### Caja abierta

Salida perteneciente a la caja activa:

- editable;
- eliminable;
- guardable.

### Caja cerrada

Salida perteneciente a una caja ya cerrada:

- visible;
- consultable;
- **solo lectura**;
- no editable;
- no eliminable.

Motivo:

Modificarla alteraría retrospectivamente los importes de un cierre ya consolidado.

## Lectura canónica

La query de lectura obtiene:

```text
editable =
  caja.cierre IS NULL
```

No se infiere editabilidad mediante fechas.

La relación se obtiene directamente de:

```text
movimiento_caja.id_caja
```

## Protección de escritura

Renderer recibe `editable`, pero no es la barrera de seguridad.

Alta, edición y borrado envían:

```text
cajaPublicId
```

Backend exige:

1. que esa caja exista y continúe abierta;
2. en edición/borrado, que el movimiento:
   - exista;
   - sea `tipo = 'salida'`;
   - no esté borrado;
   - pertenezca exactamente a esa caja.

Por tanto un estado obsoleto del renderer no permite alterar una caja cerrada ni una salida de otra caja.

## Renderer

- sin caja abierta se puede consultar, pero no crear;
- salida cerrada muestra candado;
- formulario cerrado usa estado readonly de Signal Forms;
- Guardar/Eliminar quedan deshabilitados;
- backend sigue validando aunque la UI se manipule.

Estado:

```text
18.3 lectura ✅
18.4 protección CRUD ✅
```

# 18. 18 Caja — Cerrar caja

El cierre está **terminado y validado funcionalmente**.

No recupera la antigua separación:

```text
Tienda | Web | Totales
```

El nuevo sistema realiza un único cierre integrado.

Componente renderer:

```text
CashClosingComponent
```

Servicio renderer:

```text
CajaCierreService
```

Contratos principales:

```text
CajaCierreInterface
CajaCierreTipoPagoInterface
CajaCierreConsulta

CerrarCajaCommand
CerrarCajaRecuentoCommand
CerrarCajaTipoPagoCommand
```

Estado definitivo:

```text
18.5  ✅ snapshot económico canónico
18.6  ✅ bloque superior + recuento
18.7  ✅ tarjetas por tipos de pago
18.8  ✅ persistencia/cierre real
18.9  ✅ rediseño compacto
18.10 ✅ regresión final
```

La pantalla:

- carga la caja abierta actual;
- muestra importes económicos canónicos;
- permite recuento físico;
- permite revisar importes reales de otros tipos de pago;
- calcula diferencias;
- solicita confirmación;
- ejecuta cierre transaccional;
- limpia y recarga el contexto;
- deja el TPV sin caja abierta;
- no abre automáticamente la siguiente caja.

Una nueva venta solo puede iniciarse después de abrir otra caja.

# 19. Cerrar caja — bloque superior

El bloque superior definitivo muestra:

- Saldo inicial
- Ventas efectivo
- Salidas caja
- Saldo final
- Importe real
- Retirado
- Diferencia
- Entrada
- Saldo siguiente caja

## Saldo inicial

Fuente:

```text
caja.importe_apertura_cents
```

## Ventas efectivo

No significa únicamente el tipo Efectivo.

Es:

```text
SUM(venta_pago.importe_cents)
WHERE tipo_pago.afecta_caja = true
```

dentro de la caja exacta.

Por tanto cualquier tipo con:

```text
afectaCaja = true
```

incrementa el efectivo teórico.

## Salidas caja

Suma canónica de:

```text
movimiento_caja
tipo = 'salida'
deleted_at IS NULL
id_caja = caja actual
```

## Saldo final teórico

```text
saldoFinalTeorico =
  saldoInicial
  + ventasQueAfectanCaja
  - salidasCaja
```

## Diseño final

Tras el repaso 18.9, el bloque se presenta de forma compacta:

- los nueve conceptos caben en una única fila en pantallas amplias;
- inputs de Retirado/Entrada tienen anchura contenida;
- tipografía y espaciados se redujeron para priorizar densidad;
- breakpoints conservan la legibilidad en portátil.

El usuario validó este diseño comparándolo con la densidad del TPV antiguo.

# 20. Importe real y recuento físico

`Importe real` se calcula exclusivamente desde el recuento de efectivo físico.

No se envía como una cifra independiente al backend.

## Denominaciones

Monedas:

```text
1 c
2 c
5 c
10 c
20 c
50 c
1 €
2 €
```

Billetes:

```text
5 €
10 €
20 €
50 €
100 €
200 €
500 €
```

Total:

```text
15 denominaciones
```

Existe además una constante compartida de contrato con los valores admitidos en céntimos.

## Modelo renderer

`CajaCierreFormModel.recuento` mantiene una cantidad:

```text
number | null
```

por denominación.

Regla importante:

```text
todos null    → todavía no se ha realizado recuento
algún valor 0 → recuento realizado; el total real puede ser 0 €
```

Cada cantidad debe ser:

```text
entero seguro >= 0
```

`importeRealCents` es un `computed()`:

```text
SUM(cantidad × valor_centimos)
```

Se protegen multiplicaciones y sumas frente a desbordamientos de `Number.MAX_SAFE_INTEGER`.

## Persistencia

Al cerrar se envían las denominaciones introducidas:

```text
valorCents
cantidad
```

Backend:

1. valida la denominación;
2. rechaza duplicados;
3. recalcula él mismo el total real;
4. persiste `caja_recuento` con:

```text
momento = 'cierre'
valor_centimos
cantidad
```

El renderer no puede declarar un total físico distinto del recuento enviado.

## Diseño final

18.9 compactó el recuento para su uso real:

- campos estrechos pensados para unidades;
- monedas y billetes agrupados;
- varias denominaciones en una misma fila;
- inputs alineados a la derecha;
- no se desperdicia ancho de pantalla con controles gigantes.

# 21. Retirado, Diferencia, Entrada y saldo siguiente

## Retirado

Campo renderer:

```text
retiradoEuros
```

Conversión:

```text
retiradoCents
```

Persistencia final:

```text
caja.importe_retirado_cents
```

## Entrada

Campo renderer:

```text
entradaEuros
```

Persistencia final:

```text
caja.movimientos_entrada_cents
```

## Diferencia de efectivo

```text
diferencia =
  importeReal
  + retirado
  - saldoFinalTeorico
```

Comportamiento visual:

- positiva → verde;
- negativa → rojo;
- sin recuento → `—`.

Si la diferencia es negativa, la confirmación de cierre muestra un aviso específico antes de continuar.

## Saldo siguiente caja

```text
saldoSiguiente =
  importeReal
  + entrada
```

La siguiente caja hereda exactamente:

```text
cajaAnterior.importe_cierre_real_cents
+
cajaAnterior.movimientos_entrada_cents
```

Regresión final verificada:

```text
125,00 € reales
+ 10,00 € entrada
= 135,00 € apertura siguiente
```

No se abre automáticamente la nueva caja al cerrar.

# 22. Cerrar caja — tipos de pago inferiores

18.7 está **cerrado**.

Debajo del efectivo se muestran los tipos de pago asociados a la caja excepto el Efectivo estructural:

```text
slug === 'efectivo'
```

## Cada tarjeta

Cerrada:

- nombre;
- Ventas.

Desplegada:

- Operaciones;
- Ventas;
- Importe real;
- Diferencia.

## Importe real

Inicialización:

```text
importeRealCents = importeVentasCents
```

El usuario puede modificarlo manualmente.

Puede ser negativo para conservar correctamente devoluciones.

## Diferencia

```text
diferencia =
  importeRealCents
  - importeVentasCents
```

## Estado renderer

Se mantiene separado del contrato canónico recibido.

Identidad:

```text
publicId
```

Dato enviado al cerrar:

```text
tipoPagoPublicId
importeRealCents
```

## Inclusión

No se excluyen tipos por:

- 0 operaciones;
- 0 € de ventas;
- `afectaCaja`;
- estado activo actual.

Solo se excluye visualmente el Efectivo estructural.

## Diseño final

18.9 cambió las tarjetas a una rejilla compacta con:

```text
auto-fill + ancho mínimo razonable
align-items: start
```

Consecuencias:

- caben varios tipos por fila;
- expandir una tarjeta no estira visualmente las vecinas;
- el input de Importe real tiene anchura contenida;
- se mantiene una alta densidad de información en portátil.

# 23. Tipos de pago y caja

El esquema utiliza:

```text
caja_tipo
```

Al abrir una caja nueva se crean filas para todos los tipos de pago activos.

Durante una venta nueva, si se utiliza un tipo que todavía no tiene fila, la persistencia de ventas puede materializar su `caja_tipo`.

## Corrección importante descubierta con caja legacy

Se detectó una caja abierta importada desde el TPV antiguo donde:

```text
tipo_pago
→ contenía Efectivo, VISA, VISA(web), Bizum, Paypal, Paypal(web)...

caja_tipo de la caja abierta
→ contenía solo Efectivo

venta_pago de esa misma caja
→ sí contenía el resto de tipos realmente utilizados
```

Motivo:

> En el TPV antiguo `caja_tipo` se consolidaba al cerrar. Una caja legacy que seguía abierta podía no tener todavía esas filas.

Regla definitiva para construir los tipos asociados al cierre:

```text
tipos de la caja =
  tipos presentes en caja_tipo
  UNION
  tipos realmente utilizados por venta_pago
  en ventas activas de esa caja
```

Esto conserva simultáneamente:

- tipos asociados con 0 operaciones desde `caja_tipo`;
- tipos realmente usados aunque falte su fila legacy.

## Al cerrar

Backend ejecuta una reconciliación:

```text
ensureCajaTipoRowsForUsedPaymentTypes(...)
```

que materializa en `caja_tipo` los tipos utilizados por ventas activas y todavía ausentes.

Después actualiza canónicamente:

```text
operaciones
importe_total_cents
importe_real_cents
importe_descuento_cents
```

No se filtran tipos históricos por `activo` o `deleted_at` si pertenecen realmente a la caja.

# 24. Cierre — origen de cálculos

Regla definitiva:

> Los importes económicos canónicos se recalculan en backend; nunca se confía en snapshots económicos enviados por el renderer.

## Lectura previa

`TypeOrmCajaRepository.findCierre()` trabaja dentro de transacción y recalcula:

- saldo inicial;
- ventas que afectan caja;
- salidas;
- tipos asociados;
- operaciones por tipo;
- importes por tipo.

Fuente:

```text
caja
venta
linea_venta
venta_pago
tipo_pago
caja_tipo
movimiento_caja
```

No confía en acumulados previos como:

```text
caja.movimientos_salida_cents
caja.importe_cierre_teorico_cents
caja_tipo.operaciones
caja_tipo.importe_total_cents
```

## Escritura definitiva

`TypeOrmCajaRepository.close()` vuelve a recalcular dentro de **la misma transacción de escritura**:

- ventas;
- beneficios;
- descuentos;
- pagos que afectan caja;
- salidas;
- saldo teórico;
- operaciones por tipo;
- importes por tipo.

Renderer aporta solo:

- `cajaPublicId`;
- retirada;
- entrada;
- recuento físico;
- importes reales de otros tipos de pago.

Backend calcula el importe real de efectivo a partir del recuento.

## Venta legacy de total 0 €

Se descubrió un caso real y frecuente:

```text
venta.total_cents = 0
descuento != 0
num_pagos = 1
venta_pago.importe_cents = 0
```

En la base real había 584 ventas de este tipo.

El importador legacy conserva intencionadamente un pago de 0 € para recordar el medio de pago original.

Regla final para repartir descuentos:

```text
si totalWeight > 0
→ reparto proporcional normal

si totalWeight = 0 y hay exactamente 1 pago
→ todo el descuento pertenece a ese único tipo

si totalWeight = 0 y hay varios pagos
→ error: reparto ambiguo
```

Esta corrección tiene test de regresión específico.

## Resultado

El cierre funciona correctamente con:

- ventas normales;
- pagos mixtos;
- devoluciones;
- descuentos;
- ventas 100 % descontadas;
- tipos legacy ausentes de `caja_tipo`;
- acumulados previos deliberadamente incorrectos.

# 25. Cierre — relación directa con `id_caja`

El TPV antiguo buscaba ventas por intervalo:

```text
apertura <= venta.created_at <= cierre
```

El cliente nuevo debe aprovechar:

```text
venta.id_caja
```

Por tanto los cálculos del cierre se basarán directamente en la caja concreta.

Ventajas:

- asociación inequívoca;
- menos errores por límites de fecha;
- mejor soporte para devoluciones;
- mejor soporte multi-terminal futuro;
- queries más claras.

---

# 26. Estado actual del esquema de Caja

El cliente nuevo ya tiene estas tablas:

```text
caja
caja_tipo
caja_recuento
movimiento_caja
```

## `caja`

Ya incluye:

- `public_id`
- `id_terminal`
- empleados apertura/cierre
- `apertura`
- `cierre`
- ventas
- beneficios
- descuentos
- movimientos entrada/salida
- importe apertura
- cierre teórico
- cierre real
- retirado
- observaciones

## `caja_tipo`

Ya preparado para desglose de tipos de pago.

## `caja_recuento`

Ya preparado para monedas/billetes.

## `movimiento_caja`

Ya preparado para entradas/salidas manuales.

Por tanto 18 debe explotar el esquema existente antes de plantear cambios.

---

# 27. Estado actual del backend de Caja

Backend de Caja completo para el alcance acordado.

Componentes principales:

```text
CajaService
TypeOrmCajaRepository
CajaApi
```

## Apertura ✅

`open()`:

- reutiliza caja abierta si existe;
- crea una nueva si no;
- calcula saldo inicial desde la caja cerrada anterior;
- inicializa `caja_tipo` para tipos activos.

Saldo de nueva apertura:

```text
importe_cierre_real_cents
+
movimientos_entrada_cents
```

## Salidas ✅

Lectura + CRUD completos:

- query por fecha/rango;
- alta;
- edición;
- baja lógica;
- caja abierta obligatoria para mutaciones;
- reconciliación de acumulado;
- IPC/preload/renderer.

## Snapshot de cierre ✅

```text
CajaService.getCierre()
TypeOrmCajaRepository.findCierre()
CajaApi.getCierre()
CajaCierreService
```

Datos:

```text
saldoInicialCents
ventasAfectanCajaCents
salidasCajaCents
saldoFinalTeoricoCents
tiposPago[]
```

## Cierre transaccional ✅

Contrato:

```text
CerrarCajaCommand
CerrarCajaRecuentoCommand
CerrarCajaTipoPagoCommand
```

Persistencia:

- valida comando;
- valida denominaciones;
- recalcula datos canónicos;
- reconcilia `caja_tipo` legacy;
- recalcula descuentos/beneficios/ventas;
- calcula importe real desde recuento;
- actualiza `caja_tipo`;
- persiste `caja_recuento`;
- actualiza `caja`;
- marca `cierre`;
- todo dentro de transacción.

## Renderer de cierre ✅

`CashClosingComponent`:

- carga snapshot;
- recuento;
- tipos de pago;
- diferencias;
- validación `canClose`;
- confirmación;
- aviso especial por diferencia negativa;
- llamada a `CajaCierreService.close()`;
- limpia contexto inmediatamente tras éxito de SQLite;
- recarga contexto;
- muestra resultado al usuario.

Estado:

```text
apertura              ✅
salidas               ✅
snapshot cierre       ✅
recuento              ✅
tipos pago            ✅
cierre transaccional  ✅
post-cierre           ✅
nueva apertura        ✅
```

# 28. Apertura y venta

Regla funcional final:

> Una vez cerrada la caja no se puede hacer una venta hasta volver a abrir una nueva.

Al cerrar:

```text
caja.cierre != NULL
```

`VentasContextRepository` solo devuelve caja abierta cuando:

```text
cierre IS NULL
```

Renderer:

```text
VentasContextService.puedeVender()
```

solo es `true` cuando:

- contexto cargado;
- terminal existente;
- caja abierta existente;
- Efectivo estructural disponible.

Después del cierre:

1. `CajaCierreService.close()` termina;
2. `VentasContextService.clear()` elimina inmediatamente el contexto obsoleto;
3. se ejecuta `reload()`;
4. `cajaAbierta = null`;
5. `puedeVender = false`.

`SalesComponent.nuevaVenta()` retorna sin crear nada si:

```text
puedeVender() === false
```

No se abre una caja automáticamente.

El usuario debe abrir una nueva caja mediante el flujo ya existente.

## Regresión final

18.10 verifica:

```text
cerrar caja
→ findCierre() devuelve null
→ abrir nueva caja
→ saldo inicial = real anterior + entrada anterior
→ solo existe una caja abierta
→ caja_tipo se reinicializa
```

y también:

```text
puedeVender = false
→ nuevaVenta() no crea venta
```

# 29. Importación legacy de Caja

El importador conserva:

- cajas antiguas;
- cierres;
- `caja_tipo`;
- recuentos;
- salidas;
- importe retirado;
- importe de entrada;
- saldo inicial;
- cierre teórico;
- cierre real.

Transformación:

```text
pago_caja
→ movimiento_caja tipo 'salida'
```

El efectivo implícito antiguo se materializa como tipo estructural Efectivo.

## Compatibilidad adicional descubierta durante 18

### Caja abierta legacy con `caja_tipo` incompleto

Una caja que permaneció abierta en el sistema antiguo puede tener:

```text
caja_tipo
→ solo Efectivo
```

aunque sus `venta_pago` utilicen otros tipos.

El cierre nuevo no confía exclusivamente en `caja_tipo`.

Usa:

```text
caja_tipo UNION tipos usados por venta_pago
```

y materializa filas faltantes al cerrar.

### Ventas legacy de total 0 €

El importador puede conservar:

```text
venta.total_cents = 0
venta_pago.importe_cents = 0
```

con un único pago para preservar el medio de pago original.

Si la venta tiene descuento, todo el descuento se asigna a ese único tipo de pago.

No modificar manualmente bases importadas para estos casos: el backend nuevo los soporta directamente.

No reabrir la migración legacy salvo aparición de otro caso real no cubierto.

# 30. 18 Caja — plan de implementación

El hito 18 está **cerrado**.

## 18.1 — Shell ✅

Commit:

```text
495efcee83e37c3ac64495f6cac1cad963ddb07e
```

## 18.2 — Histórico embebido ✅

Commit:

```text
be3c07d2526121e7ddc71d82671d8299e1068d13
```

## 18.3 — Lectura Salidas ✅

Commit:

```text
9b588024cafb218fb0ac6805a9db04760dc46d79
```

## 18.4 — CRUD Salidas ✅

```text
18.4a backend/API
3ddf0f05883df9f866762b7804fca969b6fb9c0f

18.4b interfaz
d5888ac594ec608f9ec0214efaf109b7d717c7d4
```

## 18.5 — Datos calculados del cierre ✅

- contrato/record;
- lectura canónica;
- IPC/preload;
- renderer service;
- caja exacta por `id_caja`;
- devoluciones firmadas;
- tipos con `afectaCaja`;
- operaciones deduplicadas;
- acumulados previos ignorados.

Commit:

```text
444fefc44fb13b347cc511c8ebe4da5a8de53141
```

## 18.6 — UI + recuento ✅

### 18.6a

- pantalla;
- snapshot;
- 9 conceptos;
- Retirado/Entrada;
- Diferencia/Saldo siguiente.

Commit:

```text
02bb6d4ca3025e2fe62c15f89ea7fc0a2172b63a
```

### 18.6b

- 15 denominaciones;
- `number | null`;
- validación;
- importe real reactivo;
- distinción sin recuento / 0 €.

Commit:

```text
212699cf8c41389fc545ade1b18572856e8e3624
```

## 18.7 — Tipos de pago ✅

- tarjetas por tipo;
- Efectivo excluido del bloque inferior;
- Ventas;
- Operaciones;
- Importe real editable;
- Diferencia;
- negativos soportados;
- estado renderer separado.

Commit:

```text
a1928d90dcf632917aae83b4c47dbfb02c3ca4b8
Terminado Caja 18.7
```

## 18.8 — Cierre transaccional ✅

### 18.8a — backend/API/persistencia

- contrato de cierre;
- denominaciones compartidas;
- validación;
- recálculo canónico;
- `caja_recuento`;
- `caja_tipo`;
- `caja`;
- IPC/preload/API;
- servicio renderer.

Commit:

```text
6948155e1d99d7acd1b66d01a97e5013c77311ae
Terminado Caja 18.8a
```

### 18.8b — renderer

- `canClose`;
- construcción del comando;
- confirmación;
- aviso por diferencia negativa;
- ejecución;
- `clear()` + `reload()`;
- estado sin caja abierta tras cierre;
- mensaje de éxito/error.

Commits relevantes:

```text
c5434f05c9cb3477c5af677ed8a6489fc91eb2e8
Terminado 18.8b

c8520d9831fa8773f355909eeab794a36aa88627
Terminado Caja 18.8
```

Durante validación real se corrigió además:

- caja legacy con `caja_tipo` incompleto;
- reconciliación de tipos usados desde `venta_pago`.

## 18.9 — Repaso final de diseño ✅

Objetivo:

Recuperar la densidad de información del TPV antiguo sin copiar literalmente su interfaz.

Resultado aprobado:

- resumen superior compacto;
- 9 conceptos en una fila en pantalla amplia;
- recuento con inputs pequeños;
- monedas/billetes compactos;
- varias tarjetas de pago por fila;
- tarjetas independientes al expandirse;
- input de importe real reducido;
- menor espaciado vertical;
- responsive para portátil.

El usuario indicó que el diseño final queda **perfecto**.

## 18.10 — Regresión final ✅

Cubierto:

- caja importada;
- caja nueva;
- salidas;
- pagos simples/mixtos;
- `afectaCaja`;
- devoluciones;
- recuento;
- tipos de pago;
- tipos legacy ausentes de `caja_tipo`;
- ventas legacy de total 0 €;
- descuentos;
- cierre;
- cierre doble rechazado;
- nueva apertura;
- saldo heredado;
- una única caja abierta;
- bloqueo de nueva venta sin caja.

Commit final del hito:

```text
eda8361e3d5eadc0ca4e230fc8b333685ec6bfe4
Terminado Caja 18
```

# 31. 18 Caja — decisiones que siguen fuera de alcance

Aunque el hito 18 está cerrado, siguen sin diseñarse expresamente:

- Informes;
- nuevos tipos de informes;
- impresión específica del cierre;
- exportación específica de cierres;
- permisos finos específicos de Caja más allá del futuro hito 19;
- sincronización con tienda online;
- cambios de multi-terminal más allá de respetar `id_terminal`;
- observaciones de cierre si el usuario no las solicita.

No inventar requisitos.

`Informes` continúa como placeholder hasta una definición funcional explícita del usuario.

# 32. 18 Caja — referencias visuales aportadas

El usuario aportó capturas del TPV antiguo para:

- Histórico de ventas;
- Salidas caja;
- Cerrar caja;
- recuento físico;
- tarjetas/tipos de pago.

Sirvieron como referencia de:

- jerarquía;
- densidad;
- distribución;
- comportamiento general.

Decisión visual final:

> El nuevo cliente no copia literalmente el TPV antiguo, pero debe conservar su capacidad para mostrar muchas cifras de forma compacta en un portátil de mostrador.

18.9 ajustó específicamente:

- resumen de 9 valores;
- tamaños de inputs;
- espaciados;
- número de tarjetas por fila;
- comportamiento independiente al expandir tarjetas.

El usuario aprobó el resultado final.

# 33. Commits recientes relevantes

```text
ef79cb84820cf2736ef5d0d5d473ec4df51a7549  Terminado Gestión 17.6
fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709  Corrección modal login Gestión
6e9f20dd98e32e290db8a41acafcef44ab9ef3d5  Selector empleado Ventas
282417b8b6b0ee2deaeee63111376d07c217d03b  Terminada limpieza `empleados`

495efcee83e37c3ac64495f6cac1cad963ddb07e  Terminado Caja 18.1
be3c07d2526121e7ddc71d82671d8299e1068d13  Terminado Caja 18.2
9b588024cafb218fb0ac6805a9db04760dc46d79  Terminado Caja 18.3
3ddf0f05883df9f866762b7804fca969b6fb9c0f  Terminado Caja 18.4a
d5888ac594ec608f9ec0214efaf109b7d717c7d4  Terminado Caja 18.4b
444fefc44fb13b347cc511c8ebe4da5a8de53141  Terminado Caja 18.5
02bb6d4ca3025e2fe62c15f89ea7fc0a2172b63a  Terminado Caja 18.6a
212699cf8c41389fc545ade1b18572856e8e3624  Terminado Caja 18.6
a1928d90dcf632917aae83b4c47dbfb02c3ca4b8  Terminado Caja 18.7
6948155e1d99d7acd1b66d01a97e5013c77311ae  Terminado Caja 18.8a
c5434f05c9cb3477c5af677ed8a6489fc91eb2e8  Terminado 18.8b
c8520d9831fa8773f355909eeab794a36aa88627  Terminado Caja 18.8
eda8361e3d5eadc0ca4e230fc8b333685ec6bfe4  Terminado Caja 18

e8e8ec8ccf7e7a2fd705b90bd086880e1770caad  Continuidad tras Caja + librerías
5959aa8c1f4519c99ccdb7915245d928a6d1b940  Terminado B3.1
f8d8498b463735f2d2503bd6f8ded62fa65a21e8  Terminado B3.2
```

Último `main` confirmado para v2.80:

```text
f8d8498b463735f2d2503bd6f8ded62fa65a21e8
Terminado B3.2
```

No hay cambios locales pendientes conocidos al generar este documento.

# 34. Resumen ejecutivo

```text
✅ 16 Compras

✅ 17 Gestión
   ✅ 17.1–17.6
   ✅ corrección foco login
   ✅ eliminado flag `empleados`

✅ 18 Caja — CERRADO
   ✅ 18.1–18.10
   ✅ cierre transaccional
   ✅ compatibilidad legacy
   ✅ diseño compacto
   ✅ regresión final

✅ B3 Selector empleado integrado
   ✅ nueva venta normal
   ✅ reservas
   ✅ empleado pendiente por venta
   ✅ pestaña blanca mientras empleado = null
   ✅ selector dentro del contenido
   ✅ sin modal global bloqueante
   ✅ navegación libre por la aplicación

🔨 19 Simplificación y aplicación definitiva de permisos

   Catálogo acordado:
   - ventas.modificar_importes
   - gestion.ajustes
   - gestion.tipos_pago
   - gestion.empleados
   - gestion.copias_seguridad

   Legacy:
   1  → ventas.modificar_importes
   18 → gestion.ajustes
   19 → gestion.tipos_pago
   20 → gestion.empleados
   25 → gestion.copias_seguridad
   resto → descartar

   Plan:
   ▶️ 19.1 IDs string + schema/contratos/importador
   ⏳ 19.2 Ventas
   ⏳ 19.3 Gestión
   ⏳ 19.4 Regresión

📋 Informes de Caja
   placeholder intencionado

📋 Sincronización Indomable Store
   pospuesta hasta terminar la aplicación

⏸ TicketBAI 12C.9
```

Fuente de verdad:

```text
main
+
este documento
+
conversación actual
```

Antes de 19.1:

1. revisar de nuevo `main`;
2. localizar todos los usos actuales de permisos numéricos;
3. modificar una sola unidad pequeña;
4. tests completos;
5. no avanzar hasta verde + push.

# 35. Siguiente paso exacto

El siguiente trabajo de código es:

> **19.1 — Nuevo catálogo de permisos con IDs string**

La definición funcional ya está cerrada.

## Catálogo objetivo

```text
ventas.modificar_importes

gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

No crear otros permisos.

## Política general

```text
Ventas
→ utiliza el empleado ya asignado a la venta
→ no pide una identificación adicional

Gestión
→ login obligatorio como hasta ahora
→ permisos sobre el empleado autenticado

Admin
→ bypass completo

Resto de la aplicación
→ sin permisos
```

No introducir autenticación ni permisos en:

- Marcas;
- Proveedores;
- Artículos;
- Clientes;
- Compras;
- Caja;
- navegación general.

## Cambios técnicos de 19.1

Revisar primero todos los usos actuales de:

```text
id_permiso
readonly number[]
EmpleadoPermissionDefinition.id
permissionIds
hasPerm
hasAnyPerm
```

Objetivo:

```text
number
→ string
```

Esquema previsto:

```text
empleado_permiso.permiso TEXT
```

en sustitución del actual:

```text
empleado_permiso.id_permiso INTEGER
```

Actualizar:

- catálogo renderer;
- constantes compartidas;
- contratos;
- records;
- domain;
- repository;
- application services;
- IPC/preload si sus tipos lo requieren;
- formularios de empleados;
- tests;
- importador legacy.

No aplicar todavía la autorización funcional de 19.2/19.3 dentro de este bloque.

## Mapeo legacy obligatorio

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
```

Todo permiso antiguo fuera de esa lista:

```text
→ descartar
```

No intentar inferir equivalencias para 21–24.

## Sin migración

Seguimos antes de la primera versión estable:

```text
DATABASE_SCHEMA_VERSION = 1
```

Modificar el schema base y el importador; no crear migración.

## Procedimiento

1. revisar `main`;
2. inventariar referencias a permisos numéricos;
3. diseñar el contrato string mínimo;
4. implementar solo 19.1;
5. tests;
6. usuario ejecuta batería completa;
7. esperar verde + push antes de 19.2.

# 36. Regla final de dirección

Para cualquier módulo heredado:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se revisa el esquema/código actual;
4. se resuelven dudas;
5. se acuerdan decisiones;
6. se define plan;
7. se implementa por bloques pequeños;
8. el usuario valida;
9. solo se continúa después de verde + push.

Convención de exports obligatoria:

```text
1 export   → export default
2+ exports → solo exports nominales, sin default
```

Estado al cerrar v2.80:

- **17 Gestión: CERRADO en su alcance funcional previo.**
- **Flag `empleados`: ELIMINADO.**
- **18 Caja: CERRADO EN EL ALCANCE ACORDADO.**
- **B3 selector de empleado integrado: CERRADO.**
- **Nueva venta con 2+ empleados: venta pendiente, no modal.**
- **Reservas con 2+ empleados: venta pendiente, no modal.**
- **19 permisos: DEFINICIÓN FUNCIONAL CERRADA.**
- **19.1 IDs string + infraestructura: SIGUIENTE.**
- **19.2 Ventas: pendiente.**
- **19.3 Gestión: pendiente.**
- **19.4 regresión: pendiente.**
- **Informes de Caja: placeholder intencionado.**
- **Sincronización Indomable Store: pospuesta.**
- **TicketBAI 12C.9: pausado.**
- **Último commit confirmado: `f8d8498b463735f2d2503bd6f8ded62fa65a21e8`.**

Reglas funcionales de permisos ya fijadas:

```text
Ventas
→ ventas.modificar_importes

Gestión
→ gestion.ajustes
→ gestion.tipos_pago
→ gestion.empleados
→ gestion.copias_seguridad

Admin
→ bypass

Resto
→ sin permisos
```

Mapeo legacy:

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
resto → descartar
```

La siguiente conversación puede comenzar directamente con:

```text
Continuamos con 19.1 — permisos con IDs string.
```

Antes de escribir código:

```text
revisar main
+
inventariar usos numéricos actuales
+
mantener una sola unidad pequeña por respuesta
```

