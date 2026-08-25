# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.6  
**Fecha:** 25 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal y los bloques **Ventas 1–11** están completados, probados y subidos. En **Ventas 12 — Postventa**, el análisis 12A y el diseño 12B están cerrados salvo la semántica TicketBAI de devoluciones/operaciones mixtas, pendiente de Berein. La implementación 12C está avanzada: **12C.1 — Infraestructura del Histórico**, **12C.2 — Filtros/listado/totales** y **12C.3 — Detalle** están completados, probados y subidos. **12C.4 — Correcciones postventa** está en curso: contratos, servicio backend, repository transaccional y tests SQLite reales están implementados, probados y subidos; el siguiente paso es completar tests del servicio y realizar el wiring **composition root + IPC + preload + Angular + UI** para cambiar cliente y tipo de pago. La prueba física con **Star TSP100/TSP143 de 80 mm** sigue pendiente y no bloquea el desarrollo.

---

## 1. Propósito del documento

Este documento reúne el contexto técnico y funcional necesario para continuar el desarrollo de Osumi TPV Client aunque se abra una conversación nueva o cambie la persona que trabaja en el proyecto.

Debe tratarse como un documento vivo. Al completar un bloque principal de Ventas, cambiar una decisión arquitectónica o cerrar un hito relevante, se actualizarán la versión, el estado actual, las decisiones y el siguiente paso.

> **Regla de continuidad:** al terminar cada bloque principal de Ventas se entregará una versión actualizada de este documento. Debe contener qué está terminado, el bloque actual, lo pendiente, decisiones relevantes, limitaciones conocidas y suficiente contexto para retomar el trabajo desde cero.

---

## 2. Estado general del proyecto

- Aplicación de escritorio: **Electron + Angular**.
- Backend local: **Node.js/TypeScript dentro de Electron**.
- Persistencia: **SQLite mediante TypeORM y better-sqlite3**.
- Instalación desde cero: completada.
- Importación legacy mediante `.otpv` **formatVersion 2**: completada y validada con paquetes reales.
- Startup y precarga global: completados.
- Auditoría transversal + Refactor A–E: completados.
- Ventas 1–11: completados, probados y subidos.
- Ventas 12A: completado.
- Ventas 12B: diseño cerrado salvo TicketBAI para devoluciones/mixtas.
- Ventas 12C.1: completado.
- Ventas 12C.2: completado.
- Ventas 12C.3: completado.
- Ventas 12C.4: **en curso**; backend y tests SQLite reales completados.
- Hardware Star TSP100/TSP143 80 mm: prueba física pendiente y no bloqueante.

Estado resumido:

```text
Installation + importación .otpv v2          ✅
Startup                                     ✅
Auditoría + Refactor A–E                    ✅
Ventas 1–11                                ✅
Ventas 12A                                 ✅
Ventas 12B.1–12B.5                         ✅
Ventas 12B.6 ordinarias                    ✅ diseño
Ventas 12B.6 devoluciones/mixtas           ⏸️ Berein
Ventas 12B.7                               ✅
Ventas 12C.1 Histórico infraestructura      ✅
Ventas 12C.2 Filtros/listado/totales        ✅
Ventas 12C.3 Detalle                        ✅
Ventas 12C.4 Correcciones postventa         🟦 actual
Ventas 12C.5 Pipeline documental            ⬜
Ventas 12C.6 Impresión                      ⬜
Ventas 12C.7 Email                          ⬜
Ventas 12C.8 TicketBAI ordinario            ⬜
Ventas 12C.9 TicketBAI devoluciones         ⏸️ Berein
Ventas 12C.10 Regresión/cierre              ⬜
```

---

## 3. Repositorios y entorno

| Elemento | Valor |
| --- | --- |
| Cliente nuevo | https://github.com/osumionline/Osumi-TPV-Client |
| Frontend antiguo | https://github.com/osumionline/Osumi-TPV |
| Backend antiguo | https://github.com/osumionline/TPV-API |
| API remota futura | https://github.com/osumionline/TPV-Client-API |
| Sistema habitual | Windows 11 |
| Editor | Visual Studio Code |
| Zona horaria | Europe/Madrid |

Antes de proponer cambios sobre archivos existentes debe revisarse el contenido actual de `main` siempre que GitHub sea fiable. Si GitHub Raw devuelve contenido stale/cacheado o no puede garantizarse que sea el último commit, pedir al usuario únicamente los archivos actuales necesarios y tratarlos como fuente de verdad.

El usuario aplica los cambios localmente, prueba manualmente, ejecuta la batería de tests y después sube los cambios al repositorio antes de continuar.

---

## 4. Arquitectura y convenciones

### 4.1 Separación de responsabilidades

- Angular: UI, formularios y estado de presentación.
- Backend Electron/Node: validaciones, negocio, persistencia y recursos del sistema.
- Contratos IPC públicos: `electron/contracts`, organizados por dominio.
- Contratos internos backend: `electron/backend/contracts`, organizados por dominio.
- Composition root explícito.
- Utilidades Angular y backend separadas.
- No introducir una capa ejecutable `shared` salvo necesidad real.
- Evitar abstracciones genéricas prematuras.
- Un read repository no debe convertirse en repository de escritura solo por comodidad: en Postventa se ha mantenido separado `VentasHistoricoRepository` de `VentasPostventaRepository`.

### 4.2 Convenciones TypeScript / Angular

- Angular standalone + signals.
- `inject()` en lugar de DI por constructor en Angular.
- `input()` / `output()` modernos.
- `@if`, `@for`, `@switch`.
- Tipado estricto; no usar `any`.
- `unknown` cuando corresponda.
- `export default` solo si el archivo exporta exactamente un elemento; si hay varios exports, deben ser nombrados.
- Líneas en blanco para separar conceptos, no propiedades consecutivas del mismo objeto.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush` en Angular 22.
- **Todo método TypeScript/JavaScript añadido o propuesto debe tener JSDoc breve**, incluidos helpers privados.
- Archivo nuevo: entregar completo.
- Archivo existente: indicar ruta y ubicación exacta de inserción/reemplazo.

### 4.3 Workflow acordado

Al comenzar cada fase/bloque/subpaso:

1. mostrar la lista completa del bloque con ✅ / 🟦 / ⬜ / ⏸️;
2. explicar en uno o dos párrafos el objetivo actual;
3. revisar `main` o usar archivos adjuntos actuales;
4. implementar en **lotes pequeños pero coherentes de varios archivos**, evitando micro-pasos innecesarios;
5. detenerse ante una ambigüedad funcional, fiscal, UX, documental o arquitectónica real;
6. no inventar reglas de negocio;
7. no avanzar de bloque sin confirmación del usuario.

Batería habitual:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Si se toca Electron/preload/IPC/empaquetado:

```bash
npm run build:desktop
```

---

## 5. Hitos de infraestructura ya cerrados

### 5.1 Installation + `.otpv` v2 ✅

La instalación/importación legacy está cerrada. El formato soportado por el Client es `formatVersion = 2`.

El paquete incluye configuración opcional de plugins mediante `plugin_config.json`:

```json
{
  "email_smtp": null,
  "ticketbai": null
}
```

O, si existen:

```json
{
  "email_smtp": {
    "host": "...",
    "port": 587,
    "secure": "tls",
    "user": "...",
    "pass": "..."
  },
  "ticketbai": {
    "token": "...",
    "nif": "..."
  }
}
```

Persistencia en Client:

```text
app_data.json
├── emailSmtp
│   ├── host
│   ├── port
│   ├── secure
│   └── user
└── ticketBai
    └── nif

secrets.json (safeStorage)
├── emailSmtpPass
└── ticketBaiToken
```

Si un plugin no existe, se conserva `null` de forma explícita.

### 5.2 Startup ✅

Flujo:

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

Startup precarga marcas, proveedores/comerciales, empleados/permisos, clientes, categorías y provincias. Los artículos se consultan bajo demanda.

### 5.3 Auditoría + Refactor A–E ✅

Cerrados:

- A — Dinero y porcentajes.
- B — Utils Angular + contratos.
- C — Infraestructura SQLite.
- D — UI + Bootstrap.
- E — Limpieza final.

Decisiones importantes:

- no convertir `VentaLineaEnCurso` en strategies mientras siga siendo cohesiva;
- no dividir prematuramente `SaleWorkspaceComponent`;
- no crear una abstracción genérica de todos los servicios `load/reload`;
- no crear un framework visual propio.

---

## 6. Ventas 1–11 — Estado consolidado ✅

### Ventas 1 — Contexto operativo

Empleado activo, caja y contexto operativo necesarios para vender.

### Ventas 2 — Venta en curso + workspace persistente

`VentasService` es propietario de las ventas abiertas. `VentaEnCurso` contiene negocio y `VentaWorkspaceState` continuidad de UI.

### Ventas 3 — Búsqueda de artículos

- localizador + Enter añade;
- búsqueda textual abre selector;
- clic en nombre añade uno y cierra;
- checks permiten selección múltiple.

### Ventas 4 — UI estructural

Pestañas, workspace, líneas, localizador, total, continuidad visual.

### Ventas 5 — Operaciones sobre líneas

Precedencia económica:

```text
1. Regalo
2. Importe manual
3. Promoción
4. Descuento directo €
5. Descuento porcentual manual
6. Descuento cliente
7. PVP
```

Microeuros para economía interna y puntos básicos para porcentajes.

### Ventas 6 — Clientes

Selector, cambio/eliminación, alta rápida, estadísticas rápidas y caché.

### Ventas 7 — Varios

Línea libre:

```text
idArticulo       = null
articuloPublicId = null
localizador      = 0
marca            = "Varios"
pucMicros        = 0
```

### Ventas 8 — Devoluciones

QR comercial compatible con legacy:

```text
venta 123 → QR "-123"
```

Las devoluciones pueden mezclarse con compra nueva y producir total positivo, negativo o cero.

### Ventas 9 — Reservas

Persistencia, stock, cancelación, carga en venta y reconciliación posterior.

### Ventas 10 — Finalización y pagos

Modelo separado:

```text
VentaEnCurso
VentaFinalizacionEnCurso
VentaFinalizacionResultado
```

Soporta N pagos, efectivo/cambio, reembolsos, total cero y reservas.

El modal fue rediseñado y probado:

- dos columnas;
- resumen de artículos;
- flujo rápido de efectivo;
- N pagos;
- selector único de acción;
- `No imprimir ticket`;
- reservas integradas;
- errores contextuales;
- foco automático.

### Ventas 11 — Persistencia transaccional

Cerrado end-to-end:

- `GuardarVentaCommand` + mapper;
- transacción SQLite real;
- venta, líneas y pagos;
- stock + histórico de artículo;
- devoluciones y reservas;
- caja + `caja_tipo`;
- secuencia documental;
- idempotencia;
- rollback completo antes del COMMIT;
- snapshot documental desde SQLite;
- QR comercial `-idVenta`;
- HTML 80 mm;
- PDF histórico write-once;
- impresión silenciosa;
- post-COMMIT no bloqueante;
- invalidación de estadísticas de cliente;
- nueva venta automática.

PDF actual:

```text
assets/files/ventas/tickets/{idVenta}.pdf
```

Pendiente no bloqueante: prueba física Star TSP100/TSP143 de 80 mm.

---

# 7. Ventas 12 — Postventa

## 7.1 12A — Análisis funcional legacy ✅

Se inventarió el comportamiento histórico, reimpresión, cliente, pagos, documento, email, facturación y TicketBAI antes de diseñar la nueva arquitectura.

## 7.2 12B — Diseño funcional ✅ salvo TicketBAI devoluciones

### 12B.1 Histórico

No será una ruta independiente. Se abre desde el importe/total de Ventas mediante modal.

Dos pestañas:

- Histórico de ventas — funcional;
- Salidas caja — placeholder por ahora.

Filtros:

- Fecha / Rango;
- Fecha por defecto = hoy;
- anterior/siguiente;
- rango con inicio/fin y búsqueda;
- backend valida `desde <= hasta`.

Listado:

```text
Fecha/hora | Importe | Tipo(s) pago
```

- pagos múltiples: `Efectivo + Tarjeta`;
- icono cliente con tooltip;
- icono TicketBAI solo para incidencia/error;
- selección resaltada.

Resumen:

- total;
- ticket medio + número de ventas;
- total dinámico por tipo de pago;
- beneficio.

Beneficio autoritativo:

```text
importe final vendido - coste
```

con signo.

### 12B.2 Política documental

Actual Ventas 11:

```text
{id}.pdf
```

Diseño futuro 12C.5:

```text
{id}.pdf             → versión vigente
{id}_{timestamp}.pdf → versión anterior archivada e inmutable
```

No borrar primero. Si una revisión documental falla, la versión anterior debe seguir existiendo.

### 12B.3 Reimpresión y ticket regalo

Cualquier ticket nuevo o legacy debe poder reimprimirse/enviarse.

Ticket regalo:

- se genera bajo demanda;
- no se persiste como histórico separado;
- mantiene negocio, fecha, referencia, empleado, artículos/cantidades, QR comercial y datos fiscales aplicables;
- oculta cliente, precios, descuentos, importes, total, pagos, entregado/cambio e IVA;
- marca clara `TICKET REGALO`;
- en operación mixta incluye solo líneas positivas;
- devolución pura: deshabilitado.

### 12B.4 Email

Envío local desde Electron/backend mediante SMTP. No depende de TPV-Client-API.

- destinatario manual de un solo uso;
- no se persiste;
- `From`: `emailSmtp.user`;
- nombre visible: `appData.nombre`;
- adjunta siempre el PDF vigente;
- contrato backend previsto: `EmailSender`;
- librería probable: Nodemailer.

Valores por defecto:

```text
Asunto: {nombreNegocio} - Ticket {referencia}
Cuerpo: Adjuntamos el ticket correspondiente a su compra.
        Gracias por su confianza.
```

### 12B.5 Facturación

Diferida al futuro módulo Clientes/Facturación. Postventa solo debe respetar el hecho de que una venta facturada ya no puede cambiar de cliente.

### 12B.6 TicketBAI

Ventas ordinarias:

- `simplificada: true` incluso con cliente;
- envío automático post-COMMIT si está configurado;
- fallo fiscal nunca invalida la venta;
- ticket puede imprimirse sin QR fiscal si el envío falla;
- reintento manual solo desde Histórico;
- no se reintenta automáticamente más tarde;
- éxito en reintento actualiza estado fiscal y genera nueva versión PDF;
- no auto-imprime después del reintento.

Debe usarse **`@osumi/ticketbaiws`**.

Devoluciones/operaciones mixtas: **bloqueadas hasta respuesta de Berein**.

### 12B.7 Integración UI

El backend expone capacidades derivadas; Angular no debe reproducir reglas:

```text
puedeCambiarCliente
puedeCambiarTipoPago
puedeImprimirTicketRegalo
puedeReintentarTicketBai
```

---

# 8. Ventas 12C — Implementación

## 8.1 12C.1 — Infraestructura del Histórico ✅

### 8.1.1 Snapshot histórico de localizador y marca

Antes de implementar Histórico se amplió `linea_venta`:

```text
localizador INTEGER NOT NULL DEFAULT 0
marca       TEXT NOT NULL DEFAULT 'Sin marca'
```

Decisiones:

- ambos son snapshot histórico;
- ventas nuevas guardan valores exactos al finalizar;
- importación legacy congela la mejor información disponible en el momento de migración;
- Histórico **no JOINea artículo/marca mutable** para mostrarlos;
- fallback legacy: `localizador = 0`, `marca = 'Sin marca'`;
- Varios nuevo: `localizador = 0`, `marca = 'Varios'`.

Contratos `GuardarVenta` y mapper Angular se actualizaron. Backend valida marca no vacía.

### 8.1.2 Contratos públicos del Histórico

Archivo:

```text
electron/contracts/ventas/venta-historico.interface.ts
```

Incluye:

- `VentaHistoricoConsulta`;
- `VentaHistoricoResumen`;
- `VentaHistoricoPagoResumen`;
- `VentaHistoricoTotalTipoPago`;
- `ResumenHistorico`;
- `VentasHistoricoResultado`;
- `VentaHistoricoCliente`;
- `VentaHistoricoPago`;
- `VentaHistoricoLinea`;
- `VentaHistoricoCapacidades`;
- `VentaHistoricoDetalle`.

Fechas de consulta: civil `YYYY-MM-DD`. Backend convierte a intervalo UTC `[inicio, finExclusive)` respetando zona local y DST.

Economía:

- líneas: microeuros;
- venta/pagos/resúmenes: céntimos.

### 8.1.3 Read repository

```text
electron/backend/contracts/ventas/ventas-historico.repository.interface.ts
```

Métodos:

```text
findByPeriod(desde, hastaExclusive)
findDetalleByVentaId(idVenta)
```

Implementación:

```text
electron/infrastructure/database/typeorm/typeorm-ventas-historico.repository.ts
```

Características:

- SQL parametrizado;
- listado y pagos sin N+1;
- agregados por periodo;
- beneficio firmado;
- detalle completo;
- `facturada` mediante `factura_venta`;
- `cajaAbierta` desde la caja original;
- snapshots de líneas sin joins al catálogo mutable;
- incidencia TicketBAI temporalmente `false` hasta 12C.8.

### 8.1.4 Servicio backend

```text
electron/backend/application/ventas/ventas-historico.service.ts
```

Responsabilidades:

- validación estricta de fechas;
- conversión local→UTC correcta incluso con DST;
- mapping records → contratos públicos;
- derivación de capacidades;
- cálculo de totales de detalle.

Capacidades actuales:

```text
puedeCambiarCliente       = !facturada
puedeCambiarTipoPago      = totalCents != 0 && numeroPagos == 1 && cajaAbierta
puedeImprimirTicketRegalo = tieneLineasPositivas
puedeReintentarTicketBai  = tieneIncidenciaTicketBai
```

### 8.1.5 Descuento efectivo en detalle

Se detectó que `importe_descuento_micros` persistido puede ser `0` en descuentos porcentuales aunque el importe final ya refleje el descuento.

Por ello el detalle público deriva el descuento económico efectivo como:

```text
abs(pvp * unidades) - abs(importe final)
```

con mínimo 0.

Los regalos **no se cuentan como descuento** en esta presentación: se muestran como `Regalo`.

### 8.1.6 IPC / preload / composition

Implementado:

```text
ventas:get-historico
ventas:get-historico-detalle
```

`VentasApi` y preload exponen:

```text
getHistorico(consulta)
getHistoricoDetalle(idVenta)
```

Composition root construye `TypeOrmVentasHistoricoRepository` + `VentasHistoricoService`.

### 8.1.7 Angular

Servicio:

```text
src/app/services/ventas-historico.service.ts
```

Modal:

```text
src/app/modules/ventas/components/historical-sales/
```

Se abre al pulsar el importe total de Ventas y devuelve el foco al localizador al cerrar.

---

## 8.2 12C.2 — Filtros, listado y totales ✅

Completado y probado manualmente:

- hoy;
- anterior/siguiente;
- días sin ventas;
- rango;
- multipago;
- cliente;
- devoluciones;
- resumen económico.

UX final del listado:

- la columna Fecha/hora usa `max-content` porque su ancho máximo es conocido;
- Importe mantiene ancho controlado;
- Tipo(s) de pago recibe el espacio sobrante;
- iconos cliente/TicketBAI aparecen **antes** del texto de pago, no en una columna independiente;
- esto evita scroll horizontal artificial;
- etiquetas de pago pueden truncarse con ellipsis solo si realmente no caben.

---

## 8.3 12C.3 — Detalle ✅

### 8.3.1 Carga bajo demanda

Al seleccionar una venta se llama a `getHistoricoDetalle(idVenta)`.

El componente padre usa `detailRequestId` para descartar respuestas antiguas si el usuario selecciona varias ventas rápidamente o cambia filtros durante la carga.

Estados:

- cargando;
- error + reintentar;
- detalle;
- sin selección.

### 8.3.2 Componente de detalle

Nuevo:

```text
src/app/modules/ventas/components/historical-sale-detail/
```

Muestra:

- cabecera compacta: `Venta {referencia}  dd/MM/yyyy HH:mm` + total;
- tabla de líneas;
- acciones/capacidades postventa;
- empleado/cliente;
- pagos.

Jerarquía UX final:

```text
1. Venta + fecha + total
2. Líneas
3. Acciones postventa
4. Empleado / Cliente
5. Pagos
```

La tabla muestra snapshots:

```text
Loc. | Marca | Descripción | Cant. | PVP | Descuento | Importe
```

### 8.3.3 Filosofía de tamaño de modales

Durante el ajuste visual se fijó un criterio general para Osumi TPV:

> Los modales que funcionan como **workspace** deben utilizar gran parte del viewport. Los modales compactos son la excepción.

Histórico usa aproximadamente:

```text
width: 95vw
height: 95vh
```

con límites para no salirse del viewport.

Reparto aproximado:

```text
Listado  ≈ 36 %
Detalle  ≈ 64 %
```

En pantallas estrechas se apilan.

La aplicación antigua usaba una clase `modal-wide { width:95%; height:95%; }`; esa filosofía se mantiene como referencia.

Para nuevos modales personalizados debe revisarse primero **Osumi Angular Tools / OverlayService**. No crear de nuevo un overlay/backdrop manual si la librería ya cubre el caso. No migrar todos los modales existentes de golpe solo por uniformidad.

### 8.3.4 Estado final de 12C.3

Completado, probado, visualmente validado y subido al repositorio.

---

## 8.4 12C.4 — Correcciones postventa 🟦 ACTUAL

Este bloque permite modificar ciertos datos de una venta ya persistida sin reabrir la operación comercial.

Se mantienen **casos de uso separados**:

```text
cambiar cliente
cambiar tipo de pago
```

No existe un `updateVenta()` genérico.

### 8.4.1 Contratos públicos ✅

Nuevo:

```text
electron/contracts/ventas/venta-postventa.interface.ts
```

Contratos:

```text
VentaPostventaCambiarClienteCommand
VentaPostventaCambiarTipoPagoCommand
```

### 8.4.2 Contrato backend ✅

Nuevo:

```text
electron/backend/contracts/ventas/ventas-postventa.repository.interface.ts
```

Métodos:

```text
cambiarCliente(idVenta, clientePublicId)
cambiarTipoPago(idVenta, tipoPagoPublicId)
```

### 8.4.3 Servicio backend ✅

Nuevo:

```text
electron/backend/application/ventas/ventas-postventa.service.ts
```

Responsabilidades:

- validar `idVenta`;
- normalizar/validar publicIds;
- delegar escritura al repository;
- releer el detalle autoritativo mediante `VentasHistoricoService`;
- devolver `VentaHistoricoDetalle` actualizado.

### 8.4.4 Repository transaccional ✅

Nuevo:

```text
electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.ts
```

#### Cambiar cliente

Regla:

```text
venta no facturada
        ↓
cliente nuevo activo o null
        ↓
UPDATE venta.id_cliente
        ↓
COMMIT
```

- si la venta aparece en `factura_venta`, se rechaza;
- se permite quitar cliente (`null`);
- seleccionar el mismo cliente es no-op;
- backend vuelve a validar todo aunque Angular muestre capacidad disponible.

#### Cambiar tipo de pago

Condiciones:

```text
venta activa
+ total != 0
+ exactamente 1 venta_pago
+ caja original abierta
+ nuevo tipo de pago activo y físico
```

Transacción:

```text
resolver venta + caja original
↓
resolver único pago
↓
resolver tipo anterior histórico
↓
resolver tipo nuevo activo/físico
↓
calcular descuento firmado de la venta
↓
retirar impacto de caja_tipo anterior
↓
añadir impacto a caja_tipo nuevo
↓
ajustar caja.importe_cierre_teorico_cents si cambia afecta_caja
↓
normalizar venta_pago
↓
UPDATE venta_pago + venta.updated_at
↓
COMMIT
```

No se modifican:

```text
caja.ventas_cents
caja.beneficios_cents
caja.descuentos_cents
linea_venta
stock
historico_articulo
```

La operación económica no cambia: solo cambia la clasificación/canal del pago.

`importe_real_cents` tampoco se toca; corresponde al recuento físico/cierre.

#### Normalización de pago

```text
efectivo → no efectivo
entregado = null
cambio = 0

no efectivo → efectivo, venta positiva
entregado = importe aplicado
cambio = 0

no efectivo → efectivo, devolución
entregado = null
cambio = 0
```

Si el usuario selecciona el mismo tipo actual: no-op.

#### `afecta_caja`

El cierre teórico se ajusta usando **importe aplicado del pago**, no efectivo entregado.

```text
impacto = importeCents si tipoPago.afecta_caja == 1
impacto = 0            en otro caso
```

Se resta el impacto anterior y se añade el nuevo.

### 8.4.5 Tests SQLite reales ✅

Nuevo:

```text
electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.spec.ts
```

Usa SQLite temporal real + esquema completo.

Casos ya probados:

1. cambiar cliente de una venta no facturada;
2. quitar cliente (`null`);
3. rechazar cambio de cliente en venta facturada;
4. efectivo → tarjeta;
5. tarjeta → efectivo;
6. devolución → efectivo sin `entregado` ni `cambio`;
7. rechazar pagos múltiples;
8. rechazar caja original cerrada;
9. rollback completo si falla después de retirar el impacto anterior.

El test de rollback fuerza un overflow al sumar la operación al nuevo `caja_tipo`. Se comprueba que al fallar también se revierten:

- la resta previa del tipo antiguo;
- el cierre teórico;
- `venta_pago`.

El usuario confirmó que:

```text
npm run test:electron
npm run typecheck:electron
```

pasan y que los cambios están subidos al repositorio.

### 8.4.6 Pendiente de 12C.4

Siguiente lote:

1. **spec unitario breve de `VentasPostventaService`;**
2. wiring backend/desktop:
   - composition root;
   - IPC;
   - channels;
   - `VentasApi`;
   - preload;
3. servicio Angular de postventa;
4. UI real de las dos acciones:
   - cambiar cliente;
   - cambiar tipo de pago;
5. invalidar estadísticas cacheadas del cliente anterior y nuevo cuando cambia cliente;
6. refrescar detalle/listado/resumen tras una corrección;
7. batería completa y prueba manual;
8. cerrar 12C.4.

**Importante:** antes de conectar Angular debe revisarse el archivo real actual `src/app/services/clientes.service.ts`. En el último intercambio se recibió por error su spec en lugar del servicio. El spec confirma que existe `invalidateEstadisticas(publicId)` y que una invalidación obliga a consultar de nuevo, pero para el wiring se debe usar el archivo actual real.

---

# 9. Reglas funcionales de Postventa que no deben perderse

## 9.1 Cambio de cliente

- permitido si la venta no está facturada;
- asignar o quitar cliente;
- backend revalida aunque la UI lo muestre habilitado;
- después del cambio deben invalidarse estadísticas del cliente anterior y del nuevo;
- no regenerar todavía PDF en 12C.4: la política documental llega en 12C.5.

## 9.2 Cambio de pago

Solo:

```text
total != 0
+ exactamente 1 pago
+ caja original abierta
```

No permitir:

- venta sin pago;
- venta multipago;
- total cero;
- caja cerrada;
- tipo nuevo inactivo/no físico/eliminado.

Todas las mutaciones de Caja deben estar dentro de la misma transacción SQLite.

## 9.3 Documento histórico tras correcciones

En 12C.4 una corrección puede dejar el PDF actual conceptualmente desactualizado.

No intentar resolverlo parcialmente.

12C.5 introducirá la revisión/versionado documental y será el punto correcto para regenerar/archivar PDFs tras cambios postventa.

---

# 10. Diseño de los siguientes bloques

## 10.1 12C.5 — Pipeline documental postventa

Implementar:

```text
{id}.pdf             → vigente
{id}_{timestamp}.pdf → archivo de versión anterior
```

Casos que pueden provocar revisión:

- cambio de cliente;
- cambio de pago;
- TicketBAI aceptado/reintentado;
- otros cambios documentales futuros.

Nunca borrar primero el documento vigente.

## 10.2 12C.6 — Impresión

- reimprimir ticket vigente;
- ticket regalo bajo demanda;
- impresión silenciosa con infraestructura existente;
- fallo de impresión no cambia la venta.

## 10.3 12C.7 — Email

- backend SMTP local;
- destinatario manual;
- adjuntar PDF vigente;
- sin persistir email introducido;
- errores de SMTP no modifican venta.

## 10.4 12C.8 — TicketBAI ordinario

- integrar `@osumi/ticketbaiws`;
- persistir estado en `venta_ticketbai`;
- envío post-COMMIT;
- incidencia visible en Histórico;
- reintento manual;
- regeneración/versionado PDF después de aceptación.

## 10.5 12C.9 — TicketBAI devoluciones

⏸️ Bloqueado hasta respuesta de Berein sobre semántica fiscal de devoluciones/operaciones mixtas.

## 10.6 12C.10 — Regresión integral

Batería técnica + pruebas manuales de todos los flujos de Postventa antes de cerrar Ventas 12.

---

# 11. UI / modales — criterio actualizado

A partir de los ajustes de Histórico se adopta esta regla de diseño:

### Workspace modal / modal grande

Para:

- Histórico;
- Reservas;
- búsquedas grandes;
- gestión con tablas;
- flujos complejos.

Usar gran porcentaje del viewport, aproximadamente 95 %, salvo razón específica.

### Modal normal/compacto

Para:

- confirmaciones;
- formularios cortos;
- selectores sencillos.

### Osumi Angular Tools

El proyecto usa la librería **Osumi Angular Tools**.

Para futuros modales con componentes personalizados, revisar `OverlayService` y el soporte de `Modal.css` antes de crear un overlay propio.

La aplicación antigua usaba:

```scss
.modal-wide {
  width: 95%;
  height: 95%;
}
```

La nueva aplicación no tiene por qué reutilizar exactamente esa clase, pero sí la filosofía de aprovechar el viewport.

No hacer una migración masiva de modales existentes mientras Postventa está en curso.

---

# 12. Testing y regresión

Tests principales:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Si se toca Electron/preload/IPC/packaging:

```bash
npm run build:desktop
```

Pruebas manuales relevantes para Histórico ya realizadas:

- hoy;
- anterior/siguiente;
- día vacío;
- rango;
- multipago;
- cliente;
- devolución;
- selección rápida de ventas;
- detalle correcto de la última selección;
- descuentos;
- Varios;
- cliente/sin cliente;
- layout amplio.

Pruebas manuales que deberán añadirse al cerrar 12C.4:

- asignar cliente a venta sin cliente;
- cambiar cliente existente;
- quitar cliente;
- venta facturada bloqueada;
- efectivo → tarjeta;
- tarjeta → efectivo;
- retorno → efectivo;
- caja cerrada;
- multipago;
- total cero;
- refresco de icono/cliente/pago en listado;
- refresco de detalle;
- estadísticas de cliente viejo/nuevo invalidadas.

---

# 13. Limitaciones / bloqueos conocidos

1. **TicketBAI devoluciones/operaciones mixtas**: pendiente de Berein.
2. **Star TSP100/TSP143 80 mm**: prueba física pendiente, no bloqueante.
3. **PDF postventa**: hasta 12C.5 sigue vigente la infraestructura write-once de Ventas 11; no implementar soluciones parciales durante 12C.4.
4. GitHub Raw puede devolver contenido cacheado/stale; si no se puede verificar frescura, usar archivos adjuntos actuales.

---

# 14. Próximo paso exacto

Continuar por:

# Ventas 12C.4 — Correcciones postventa

Estado de entrada al siguiente turno:

```text
Contratos públicos postventa                   ✅
VentasPostventaRepository                      ✅
VentasPostventaService                         ✅
TypeOrmVentasPostventaRepository               ✅
Cambio cliente transaccional                   ✅
Cambio tipo pago + caja_tipo                   ✅
Normalización efectivo/no efectivo             ✅
Ajuste cierre teórico                          ✅
Tests SQLite reales                            ✅
Tests servicio backend                         ⬜ siguiente
Composition root / IPC / preload              ⬜
Servicio Angular                               ⬜
UI cambiar cliente                             ⬜
UI cambiar tipo pago                           ⬜
Invalidación estadísticas cliente             ⬜
Refresco histórico                             ⬜
Regresión completa 12C.4                       ⬜
```

Orden recomendado:

1. crear spec unitario breve de `VentasPostventaService`;
2. revisar archivos actuales de composition/IPC/preload/`VentasApi`;
3. añadir wiring completo;
4. revisar `src/app/services/clientes.service.ts` real;
5. implementar servicio Angular y UI de ambas acciones;
6. invalidar estadísticas del cliente antiguo/nuevo;
7. refrescar detalle y consulta actual tras cambios;
8. ejecutar batería completa;
9. prueba manual;
10. cerrar 12C.4 y actualizar de nuevo este documento.

---

# 15. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” versión 2.6 como contexto principal.

Estado general:
- Installation + importación `.otpv` v2: completadas y probadas.
- Startup: completado.
- Auditoría transversal + Refactor A–E: completados.
- Ventas 1–11: completados, probados y subidos.
- Ventas 12A y diseño 12B: cerrados salvo TicketBAI para devoluciones/operaciones mixtas, pendiente de Berein.
- Ventas 12C.1 — Infraestructura del Histórico: completado.
- Ventas 12C.2 — Filtros/listado/totales: completado.
- Ventas 12C.3 — Detalle: completado.
- Ventas 12C.4 — Correcciones postventa: EN CURSO.

Histórico actual:
- modal desde el importe de Ventas;
- Fecha/Rango;
- listado con fecha, importe, iconos cliente/TicketBAI y tipos de pago;
- agregados total/ticket medio/tipos de pago/beneficio;
- detalle bajo demanda con protección frente a respuestas stale;
- snapshots localizador/marca persistidos en `linea_venta`;
- líneas + capacidades postventa;
- modal workspace grande ~95vw/95vh y reparto aprox. 36/64 listado/detalle;
- 12C.1–12C.3 están probados y subidos.

12C.4 ya tiene implementados y subidos:
- `venta-postventa.interface.ts`;
- `ventas-postventa.repository.interface.ts`;
- `ventas-postventa.service.ts`;
- `typeorm-ventas-postventa.repository.ts`;
- capacidad de cambio de pago exige total != 0 + un único pago + caja original abierta;
- cambio de cliente bloqueado si facturada;
- cambio de pago traslada `caja_tipo` y `importe_cierre_teorico_cents` dentro de una sola transacción;
- normalización efectivo/no efectivo;
- tests SQLite reales para cliente, efectivo↔tarjeta, devolución, multipago, caja cerrada y rollback completo;
- `npm run test:electron` y `npm run typecheck:electron` pasan.

Siguiente paso exacto:
1. añadir spec unitario breve de `VentasPostventaService`;
2. wiring composition root + IPC + channels + `VentasApi` + preload;
3. servicio Angular;
4. UI real de Cambiar cliente y Cambiar tipo de pago;
5. invalidar estadísticas del cliente anterior/nuevo;
6. refrescar detalle/listado/resumen;
7. batería completa y prueba manual;
8. cerrar 12C.4.

Para la UI, antes de modificar clientes, revisar el archivo real actual `src/app/services/clientes.service.ts`; en el intercambio anterior se recibió accidentalmente su spec en lugar del servicio.

Reglas de trabajo:
- al inicio de cada bloque/subpaso, mostrar lista completa ✅/🟦/⬜/⏸️ y explicar el objetivo;
- revisar `main` antes de modificar archivos; si GitHub está cacheado/stale, pedir solo los archivos actuales necesarios;
- implementar en lotes pequeños pero coherentes de varios archivos;
- no inventar decisiones funcionales;
- todo método TS/JS añadido debe tener JSDoc breve;
- `export default` solo para un único export por archivo;
- strict typing, sin `any`;
- no avanzar hasta confirmación del usuario.

Batería:
`npm test`
`npm run test:electron`
`npm run typecheck:electron`
`npm run build`
`npm run lint`
`npm run build:desktop` si se toca Electron/preload/IPC.

TicketBAI futuro debe usar `@osumi/ticketbaiws`.
La prueba física Star TSP100/TSP143 de 80 mm sigue pendiente pero no bloquea Postventa.
```

---

# 16. Registro de versiones recientes

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.2 | 23-08-2026 | Ventas 11 cerrado; inicio de Postventa. |
| 2.3 | 23-08-2026 | Avance del diseño 12B y configuración SMTP/TicketBAI. |
| 2.4 | 23-08-2026 | Diseño 12B prácticamente cerrado; pausa para rediseño de Finalizar venta. |
| 2.5 | 24-08-2026 | Rediseño Finalizar venta cerrado; 12C listo para comenzar. |
| **2.6** | **25-08-2026** | **12C.1, 12C.2 y 12C.3 completados. 12C.4 avanzado: contratos, servicio backend, repository transaccional y tests SQLite reales completados y subidos. Siguiente: tests del servicio + wiring IPC/Angular/UI.** |
