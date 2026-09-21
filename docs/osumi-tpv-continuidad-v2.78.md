# Osumi TPV Client — Documento de continuidad v2.78

**Fecha:** 21 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento sustituye a `docs/osumi-tpv-continuidad-v2.77.md`.

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

---

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
- 17 Gestión ✅ hasta 17.6
- Corrección foco modal Gestión ✅
- Ventas/Empleados ✅
- Retirada total del antiguo flag `empleados` ✅
- 18 Caja:
  - 18.1 Shell ✅
  - 18.2 Histórico embebido ✅
  - 18.3 Lectura de Salidas ✅
  - 18.4 CRUD de Salidas ✅
    - 18.4a backend/API ✅
    - 18.4b interfaz ✅
  - 18.5 Datos calculados del cierre ✅
  - 18.6 UI de cierre + recuento ✅
    - 18.6a pantalla + snapshot ✅
    - 18.6b recuento físico ✅

## En curso / siguiente

- 18 Caja 🔨
  - **18.7 — Desglose por tipos de pago — SIGUIENTE**
  - 18.8 cierre transaccional ⏳
  - 18.9 regresión final ⏳
- `Informes` sigue como placeholder.

## Pendiente posterior

- 19 Enforcement global de permisos ⏳
- resto de desarrollo funcional ⏳
- Sincronización Indomable Store ↔ Osumi TPV 📋 **pospuesta hasta terminar la aplicación**
- TicketBAI 12C.9 ⏸ pendiente de Berein.

# 4. Punto exacto de continuidad

Último commit confirmado en `main`:

```text
212699cf8c41389fc545ade1b18572856e8e3624
Terminado Caja 18.6
```

Commits recientes del bloque Caja:

```text
02bb6d4ca3025e2fe62c15f89ea7fc0a2172b63a
Terminado Caja 18.6a

444fefc44fb13b347cc511c8ebe4da5a8de53141
Terminado Caja 18.5

eb3b1d4a562ff71215bfbfc2bc19c56a5e69103d
Actualizado documento de continuidad tras 18.4

d5888ac594ec608f9ec0214efaf109b7d717c7d4
Terminado Caja 18.4b
```

El usuario confirmó para 18.5 y 18.6:

- batería completa `test/build/test:electron/build:electron/lint` correcta;
- pruebas funcionales correctas;
- interfaz de cierre y recuento funcionando;
- cambios subidos a `main`.

## Siguiente paso exacto

```text
18.7 — Desglose por tipos de pago
```

Objetivo:

- usar `CajaCierreInterface.tiposPago`;
- mostrar tarjetas por tipo excepto `slug = 'efectivo'`;
- mostrar Ventas siempre;
- desplegar Operaciones, Importe real y Diferencia;
- inicializar Importe real con Ventas;
- no persistir todavía el cierre.

# 5. Corrección Ventas / Empleados ✅

La antigua configuración `empleados` ha desaparecido por completo.

## Regla definitiva

```text
0 empleados  → error / no se puede iniciar venta
1 empleado   → asignación automática
2 o más      → selector de empleado
```

Se aplica a:

- nueva venta;
- venta procedente de reservas.

`EmployeeSelectorComponent` se reutiliza para el caso de más de un empleado.

## Limpieza realizada

El flag se eliminó de:

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

No debe quedar rastro funcional del antiguo campo.

No crear compatibilidad legacy futura para este flag: no existe una versión en producción que la requiera.

---

# 6. Gestión y permisos

`GestionSessionService` mantiene sesión temporal de Gestión.

- `empleadoId`
- `authenticatedAt`
- `expiresAt`
- duración fija: 10 minutos desde login.

No se renueva por actividad.

Permisos relevantes:

- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos
- 22 Borrar empleados
- 23 Modificar permisos
- 24 Estadísticas empleados
- 25 Copias de seguridad

Administradores tienen bypass mediante `hasPerm()` / `hasAnyPerm()`.

El enforcement global fino sigue reservado para el hito 19.

---

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
18 Caja
↓
19 permisos
↓
resto de desarrollo funcional
↓
aplicación funcionalmente terminada
↓
sincronización Indomable Store ↔ Osumi TPV
```

No iniciar ningún bloque S1–S10 mientras la aplicación principal siga en desarrollo.

La planificación existente se conserva para retomarla después.

---

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

Estado actual:

```text
Histórico de ventas  ✅
Salidas caja         ✅
Cerrar caja          🔨 bloque superior + recuento implementados
Informes             📋 placeholder
```

Dentro de `Cerrar caja`:

```text
snapshot económico        ✅
bloque superior           ✅
recuento monedas/billetes ✅
tipos de pago inferiores  ⏳ 18.7
cierre transaccional      ⏳ 18.8
```

## Informes

No diseñar todavía. Esperar a que el usuario defina el comportamiento deseado.

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

El cierre es único; no recuperar la antigua separación `Tienda | Web | Totales`.

Componente actual:

```text
CashClosingComponent
```

Servicio renderer:

```text
CajaCierreService
```

Contrato:

```text
CajaCierreInterface
CajaCierreTipoPagoInterface
CajaCierreConsulta
```

Estado:

```text
18.5 ✅ snapshot económico canónico
18.6 ✅ bloque superior + recuento
18.7 ⏳ tarjetas por tipos de pago
18.8 ⏳ persistencia/cierre real
```

La pantalla ya carga la caja abierta mediante `VentasContextService`, muestra la apertura y todos los importes principales y permite realizar el recuento físico. Todavía no persiste ni cierra la caja.

# 19. Cerrar caja — bloque superior

Mostrar:

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

Es:

```text
caja.importe_apertura_cents
```

## Ventas efectivo

No significa solo el tipo de pago Efectivo.

Es la suma de pagos de la caja cuyos tipos tengan:

```text
afectaCaja = true
```

La semántica está confirmada por el TPV antiguo.

## Salidas caja

Suma de movimientos activos:

```text
tipo = 'salida'
```

pertenecientes a la caja.

## Saldo final teórico

Fórmula:

```text
saldoFinal =
  saldoInicial
  + ventasQueAfectanCaja
  - salidasCaja
```

---

# 20. Importe real y recuento físico

`Importe real` ya se calcula exclusivamente a partir del recuento físico.

Al pulsarlo se despliega/contrae el bloque de monedas y billetes.

## Denominaciones implementadas

Monedas:

```text
1 c · 2 c · 5 c · 10 c · 20 c · 50 c · 1 € · 2 €
```

Billetes:

```text
5 € · 10 € · 20 € · 50 € · 100 € · 200 € · 500 €
```

Total: **15 denominaciones**.

## Modelo

`CajaCierreFormModel.recuento` contiene una cantidad `number | null` por denominación.

Regla importante:

```text
todos null    → todavía no se ha realizado el recuento
algún valor 0 → recuento realizado; el efectivo real puede ser 0 €
```

Cada cantidad debe ser un entero seguro `>= 0`.

`importeRealCents` es un `computed()`:

```text
SUM(cantidad × valor_centimos)
```

Se protegen productos y sumas frente a desbordamientos de `Number.MAX_SAFE_INTEGER`.

## Interacción

- `recuentoOpen` controla el desplegable;
- el total se actualiza de forma reactiva;
- al enfocar una cantidad se selecciona todo su contenido;
- el layout separa Monedas y Billetes y es responsive.

## Persistencia futura

18.8 mapeará este estado directamente a `caja_recuento`:

```text
momento = 'cierre'
valor_centimos = denominación
cantidad = cantidad introducida
```

No existe persistencia del recuento todavía.

# 21. Retirado, Diferencia, Entrada y saldo siguiente

Ya están implementados reactivamente en `CashClosingComponent`.

## Retirado

Campo Signal Forms:

```text
retiradoEuros
```

Conversión:

```text
retiradoCents = eurosToCents(retiradoEuros)
```

Persistencia prevista:

```text
caja.importe_retirado_cents
```

## Entrada

Campo:

```text
entradaEuros
```

Persistencia prevista:

```text
caja.movimientos_entrada_cents
```

## Diferencia

```text
diferencia = importeReal + retirado - saldoFinalTeorico
```

Solo existe cuando se ha realizado el recuento. Positiva se muestra verde; negativa, roja.

## Saldo siguiente caja

```text
saldoSiguiente = importeReal + entrada
```

La apertura existente de la siguiente caja ya usa:

```text
importe_cierre_real_cents + movimientos_entrada_cents
```

por lo que la semántica coincide.

# 22. Cerrar caja — tipos de pago inferiores

Este es el **siguiente bloque: 18.7**.

18.5 ya entrega `CajaCierreInterface.tiposPago[]` con:

```text
publicId
nombre
slug
afectaCaja
orden
operaciones
importeVentasCents
```

## Inclusión

Excluir únicamente:

```text
slug === 'efectivo'
```

No excluir por cero operaciones, cero importe, `afectaCaja` o estado activo actual.

## Tarjeta cerrada

- nombre;
- Ventas.

## Tarjeta abierta

- Ventas;
- Operaciones;
- Importe real;
- Diferencia.

Inicialización:

```text
importeReal = importeVentas
```

Diferencia:

```text
importeReal - importeVentas
```

No persistir todavía. La escritura de `caja_tipo.importe_real_cents` pertenece a 18.8.

# 23. Tipos de pago y caja

El esquema actual ya contiene `caja_tipo`.

Al abrir una caja se inicializan filas para tipos activos; si durante la caja aparece un tipo nuevo y se utiliza en una venta, el guardado de ventas crea su fila.

18.5 usa `caja_tipo` para determinar qué tipos pertenecen al cierre, pero recalcula sus datos económicos desde `venta` + `venta_pago`:

```text
importe = SUM(venta_pago.importe_cents)
operaciones = COUNT(DISTINCT venta.id)
```

Se excluyen ventas borradas y las devoluciones conservan su signo.

El contrato incluye también Efectivo; 18.7 excluirá de la UI inferior únicamente:

```text
slug = 'efectivo'
```

No crear una estructura paralela.

# 24. Cierre — origen de cálculos

Regla definitiva:

> Los importes económicos canónicos se recalculan en backend; no se confía en los valores enviados por el renderer.

## 18.5 implementado

`TypeOrmCajaRepository.findCierre()` obtiene dentro de una transacción de lectura:

- saldo inicial desde `caja`;
- pagos que afectan caja desde `venta_pago` + `tipo_pago.afecta_caja`;
- salidas desde `movimiento_caja`;
- importes por tipo desde `venta_pago`;
- operaciones por tipo con `COUNT(DISTINCT venta.id)`.

No confía como fuente canónica en acumulados como:

```text
caja.movimientos_salida_cents
caja.importe_cierre_teorico_cents
caja_tipo.operaciones
caja_tipo.importe_total_cents
```

Los tests SQLite verifican esta independencia.

## 18.8 pendiente

Al confirmar el cierre, backend deberá recalcular de nuevo dentro de la misma transacción de escritura para evitar cerrar con un snapshot obsoleto.

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

Ya existen `CajaService`, `TypeOrmCajaRepository` y `CajaApi`.

## Apertura ✅

- reutiliza caja abierta si existe;
- crea una nueva si no;
- calcula saldo inicial desde la caja anterior;
- inicializa `caja_tipo`.

## Salidas ✅

Lectura y CRUD completos, con IPC/preload/renderer, baja lógica, protección de caja cerrada y reconciliación de `movimientos_salida_cents`.

## Cierre — lectura canónica ✅

18.5 añadió:

```text
CajaService.getCierre()
TypeOrmCajaRepository.findCierre()
CajaApi.getCierre()
CajaCierreService
```

El snapshot contiene:

```text
saldoInicialCents
ventasAfectanCajaCents
salidasCajaCents
saldoFinalTeoricoCents
tiposPago[]
```

Por tipo:

```text
publicId
nombre
slug
afectaCaja
orden
operaciones
importeVentasCents
```

Reglas:

- `venta.id_caja` como asociación canónica;
- ventas borradas excluidas;
- devoluciones firmadas;
- todos los tipos `afecta_caja = 1` suman al efectivo teórico;
- operaciones deduplicadas por venta;
- acumulados previos no son fuente canónica.

## Renderer de cierre ✅ parcial

`CashClosingComponent` ya implementa bloque principal y recuento.

Pendiente:

```text
18.7 tipos de pago inferiores
18.8 cierre transaccional
```

# 28. Apertura y venta

Regla funcional:

> Una vez cerrada la caja no se puede hacer una venta hasta volver a abrir una nueva.

El comportamiento de venta debe seguir dependiendo de la existencia de una caja abierta.

El cierre debe dejar:

```text
caja.cierre != NULL
```

La siguiente venta debe forzar/solicitar nueva apertura según el flujo ya existente.

---

# 29. Importación legacy de Caja

El importador nuevo ya conserva:

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

Transformaciones importantes:

```text
pago_caja
→ movimiento_caja tipo 'salida'
```

El efectivo implícito del sistema antiguo se materializa como tipo estructural Efectivo.

No reabrir la migración legacy salvo que 18 revele un caso real no cubierto.

---

# 30. 18 Caja — plan de implementación

## 18.1 — Shell ✅
Commit `495efcee83e37c3ac64495f6cac1cad963ddb07e`.

## 18.2 — Histórico embebido ✅
Commit `be3c07d2526121e7ddc71d82671d8299e1068d13`.

## 18.3 — Lectura Salidas ✅
Commit `9b588024cafb218fb0ac6805a9db04760dc46d79`.

## 18.4 — CRUD Salidas ✅

- 18.4a backend/API: `3ddf0f05883df9f866762b7804fca969b6fb9c0f`
- 18.4b interfaz: `d5888ac594ec608f9ec0214efaf109b7d717c7d4`

## 18.5 — Datos calculados del cierre ✅

Implementado:

- contrato/record de cierre;
- `findCierre()`;
- `getCierre()`;
- IPC/preload;
- `CajaCierreService`;
- cálculo canónico desde caja/ventas/pagos/movimientos;
- tipos de pago con operaciones e importes;
- pruebas SQLite con esquema completo.

Commit:

```text
444fefc44fb13b347cc511c8ebe4da5a8de53141
Terminado Caja 18.5
```

## 18.6 — UI de cierre + recuento ✅

### 18.6a — pantalla + snapshot ✅

- `CashClosingComponent`;
- integración en Caja;
- loading/error/sin caja;
- 9 conceptos principales;
- Retirado/Entrada;
- fórmulas de Diferencia/Saldo siguiente;
- tests aislados.

Commit `02bb6d4ca3025e2fe62c15f89ea7fc0a2172b63a`.

### 18.6b — recuento físico ✅

- desplegable desde Importe real;
- 15 denominaciones;
- `number | null` por cantidad;
- entero no negativo;
- cálculo reactivo del importe real;
- distinción “sin contar” / “0 € reales”;
- actualización de diferencia y saldo siguiente;
- responsive + tests.

Commit:

```text
212699cf8c41389fc545ade1b18572856e8e3624
Terminado Caja 18.6
```

## 18.7 — Desglose por tipos de pago 🔨 SIGUIENTE

- tarjetas por tipo salvo Efectivo;
- Ventas;
- Operaciones;
- Importe real editable;
- Diferencia;
- sin persistencia.

## 18.8 — Cierre transaccional ⏳

- comando y validación;
- recálculo canónico dentro de transacción;
- persistir `caja`, `caja_tipo`, `caja_recuento`;
- entrada/retirada;
- marcar cierre;
- actualizar contexto;
- impedir venta hasta nueva apertura.

## 18.9 — Regresión final ⏳

Cubrir caja importada/nueva, salidas, pagos simples/mixtos, `afectaCaja`, devoluciones, recuento, tipos de pago, cierre y nueva apertura.

# 31. 18 Caja — decisiones explícitamente no abiertas todavía

No diseñar todavía:

- Informes;
- nuevos tipos de informes;
- impresión de cierre;
- exportación específica de cierres;
- permisos finos específicos de Caja;
- sincronización con tienda online;
- cambios de multi-terminal más allá de respetar `id_terminal`;
- observaciones de cierre si el usuario no las solicita.

No inventar requisitos.

---

# 32. 18 Caja — referencias visuales aportadas

El usuario aportó capturas del TPV antiguo para:

- Histórico de ventas;
- Salidas caja;
- Cerrar caja.

Estas capturas sirven como referencia de:

- estructura;
- jerarquía;
- distribución;
- comportamiento general.

No es obligatorio copiar literalmente el diseño visual antiguo.

El nuevo apartado debe mantener coherencia con la interfaz actual de Osumi TPV Client.

---

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
eb3b1d4a562ff71215bfbfc2bc19c56a5e69103d  Continuidad tras 18.4
444fefc44fb13b347cc511c8ebe4da5a8de53141  Terminado Caja 18.5
02bb6d4ca3025e2fe62c15f89ea7fc0a2172b63a  Terminado Caja 18.6a
212699cf8c41389fc545ade1b18572856e8e3624  Terminado Caja 18.6
```

Último `main` confirmado para v2.78:

```text
212699cf8c41389fc545ade1b18572856e8e3624
```

No hay cambios locales pendientes conocidos al generar este documento.

# 34. Resumen ejecutivo

```text
✅ 16 Compras
✅ 17 Gestión hasta 17.6
✅ Ventas/Empleados + retirada flag `empleados`

🔨 18 Caja
   ✅ 18.1 Shell
   ✅ 18.2 Histórico embebido
   ✅ 18.3 Lectura Salidas
   ✅ 18.4 CRUD Salidas
   ✅ 18.5 Snapshot/calculados cierre
   ✅ 18.6 UI principal + recuento
      ✅ 18.6a pantalla/snapshot
      ✅ 18.6b 15 denominaciones
   ▶️ 18.7 Tipos de pago — SIGUIENTE
   ⏳ 18.8 Cierre transaccional
   ⏳ 18.9 Regresión final

✅ Cerrar caja actualmente
   - saldo inicial
   - ventas afectaCaja
   - salidas
   - saldo final teórico
   - retirado
   - entrada
   - recuento monedas/billetes
   - importe real
   - diferencia
   - saldo siguiente

⏳ 19 permisos
📋 Sincronización Indomable Store pospuesta
⏸ TicketBAI 12C.9
```

Fuente de verdad:

```text
main + este documento + conversación actual
```

Antes de 18.7 revisar nuevamente `main`.

# 35. Siguiente paso exacto

> **18.7 — Desglose por tipos de pago**

Añadir debajo del bloque principal de `CashClosingComponent` el cierre de medios de pago distintos del Efectivo estructural.

## Fuente

`CajaCierreInterface.tiposPago[]` ya proporciona:

```text
publicId
nombre
slug
afectaCaja
orden
operaciones
importeVentasCents
```

## Inclusión

Mostrar todos los asociados a la caja excepto:

```text
slug === 'efectivo'
```

No filtrar por importe cero, operaciones cero, `afectaCaja` ni estado activo actual.

## UI

Tarjeta cerrada:

```text
[expandir] Nombre
Ventas: XX,XX €
```

Desplegada:

```text
Ventas
Operaciones
Importe real
Diferencia
```

## Estado editable

Inicializar:

```text
importeRealCents = importeVentasCents
```

Diferencia:

```text
importeRealCents - importeVentasCents
```

Mantener estado renderer por `publicId`; no mutar el contrato recibido. Dejar preparado el dato para 18.8:

```text
tipoPagoPublicId + importeRealCents
```

## Tests mínimos

- Efectivo no aparece;
- otro tipo `afectaCaja = true` sí aparece;
- tipo con 0 operaciones sigue disponible;
- reales inicializados desde ventas;
- editar real recalcula diferencia;
- expandir una tarjeta no afecta a las demás;
- importes negativos de devoluciones se representan correctamente.

## Fuera de alcance

No implementar todavía `close`, persistencia, confirmación final, actualización de contexto ni navegación post-cierre. Todo eso pertenece a 18.8.

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

Estado al cerrar v2.78:

- **17.5 Empleados: CERRADO.**
- **17.6 Tipos de pago: CERRADO.**
- **Ventas/Empleados: CERRADO.**
- **Flag `empleados`: ELIMINADO.**
- **18.1–18.6 Caja: CERRADOS.**
- **18.7 Desglose por tipos de pago: SIGUIENTE.**
- **18.8 Cierre transaccional: pendiente.**
- **18.9 Regresión final: pendiente.**
- **Informes de Caja: placeholder.**
- **19 permisos: pendiente.**
- **Sincronización Indomable Store: pospuesta.**
- **TicketBAI 12C.9: pausado.**
- **Último commit confirmado: `212699cf8c41389fc545ade1b18572856e8e3624`.**

La siguiente conversación puede comenzar directamente con:

```text
Continuamos con 18.7 — Desglose por tipos de pago.
```

Antes de escribir código, revisar de nuevo `main`.

