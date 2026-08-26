# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.10  
**Fecha:** 26 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal y los bloques **Ventas 1–11** están completados, probados y subidos. En **Ventas 12 — Postventa**, el análisis 12A y el diseño 12B están cerrados salvo la semántica TicketBAI de devoluciones/operaciones mixtas, pendiente de Berein. La implementación 12C está muy avanzada: **12C.1–12C.6** están completados, probados y subidos. En **12C.7 — Email**, los subbloques **12C.7A — Configuración + secretos + infraestructura SMTP** y **12C.7B — Caso de uso backend de envío** están completados, con batería de tests verde y cambios subidos. El siguiente paso exacto es **12C.7C — Wiring IPC + Angular + UI de Histórico**, que conectará el `SecretStorage` operacional, `NodemailerEmailSender` y `VentasTicketEmailService`, añadirá el canal IPC y permitirá introducir un destinatario manual de un solo uso, reparar el PDF vigente si hiciera falta y solicitar su envío. La prueba física con **Star TSP100/TSP143 de 80 mm** sigue pendiente y no bloquea el desarrollo.

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
- Ventas 12C.4: completado, probado manualmente y subido.
- Ventas 12C.5: completado, probado manualmente y subido.
- Ventas 12C.6: completado, probado y subido; prueba física Star pendiente/no bloqueante.
- Ventas 12C.7A: completado, probado y subido — configuración `ticketEmail`, compatibilidad, `EmailSender` y Nodemailer.
- Ventas 12C.7B: completado, probado y subido — caso de uso backend `VentasTicketEmailService`.
- Ventas 12C.7C: **siguiente subbloque** — composition root, IPC/preload, Angular y UI Histórico.
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
Ventas 12C.4 Correcciones postventa         ✅
Ventas 12C.5 Pipeline documental            ✅
Ventas 12C.6 Impresión                      ✅
Ventas 12C.7 Email                          🟦 en curso
  12C.7A Config + secretos + SMTP            ✅
  12C.7B Caso de uso backend                 ✅
  12C.7C IPC + Angular + UI Histórico         🟦 siguiente
  12C.7D Prueba SMTP real y cierre            ⬜
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

## 8.4 12C.4 — Correcciones postventa ✅

Este bloque permite modificar ciertos datos de una venta ya persistida sin reabrir la operación comercial. Está **completado, probado y subido**.

Se mantienen casos de uso separados:

```text
cambiar cliente
cambiar tipo de pago
```

No existe un `updateVenta()` genérico.

### 8.4.1 Contratos y backend ✅

Implementados:

```text
electron/contracts/ventas/venta-postventa.interface.ts
electron/backend/contracts/ventas/ventas-postventa.repository.interface.ts
electron/backend/application/ventas/ventas-postventa.service.ts
electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.ts
```

El servicio valida comandos, delega la escritura y relee el detalle autoritativo mediante `VentasHistoricoService`.

### 8.4.2 Cambiar cliente ✅

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

- si existe relación en `factura_venta`, se rechaza;
- se puede asignar, sustituir o quitar cliente;
- seleccionar el mismo cliente es no-op;
- backend revalida aunque Angular muestre la capacidad habilitada.

### 8.4.3 Cambiar tipo de pago ✅

Condiciones autoritativas:

```text
total != 0
+ exactamente 1 venta_pago
+ caja original abierta
+ nuevo tipo activo y físico
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
calcular descuento firmado
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
importe_real_cents
```

Normalización:

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

El cierre teórico usa el **importe aplicado del pago**, nunca el efectivo entregado.

### 8.4.4 Tests backend ✅

Existe spec SQLite real:

```text
electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.spec.ts
```

Cubre:

1. cambiar y quitar cliente;
2. venta facturada bloqueada;
3. efectivo → tarjeta;
4. tarjeta → efectivo;
5. devolución → efectivo;
6. multipago bloqueado;
7. caja original cerrada;
8. rollback completo si falla después de retirar el impacto anterior.

También se añadió spec unitario de `VentasPostventaService`, validando normalización, delegación, detalle actualizado y errores previos al repository.

### 8.4.5 Wiring desktop/Angular ✅

Completado:

```text
composition root
IPC channels
registerVentasIpc
VentasApi
preload
VentasPostventaService Angular
```

Los dos casos de uso devuelven `VentaHistoricoDetalle` actualizado directamente desde backend.

### 8.4.6 UI de postventa ✅

Las dos primeras capacidades del detalle son acciones reales.

**Cambiar cliente**:

- reutiliza `ClientSelectorComponent`;
- el selector admite un `overlayZIndex` configurable para aparecer sobre el Histórico;
- permite seleccionar, crear o quitar cliente;
- la creación conserva la impresión del documento de protección de datos;
- tras COMMIT se invalidan estadísticas del cliente anterior y del nuevo;
- después se refresca la consulta histórica visible.

**Cambiar tipo de pago**:

- usa selector inline dentro del detalle, no otro modal;
- muestra solo medios físicos alternativos disponibles;
- no ofrece el tipo ya usado;
- backend sigue siendo autoridad final;
- tras COMMIT actualiza detalle y refresca listado/resumen/totales por tipo de pago.

Mientras se guarda una corrección se bloquean interacciones conflictivas. Los fallos de refresco posteriores al COMMIT se muestran como aviso sin deshacer la corrección ya confirmada.

### 8.4.7 Validación final ✅

El usuario confirmó:

```text
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Todos pasan. El wiring Electron también fue validado previamente con `npm run build:desktop`.

La aplicación se probó manualmente y los flujos de corrección de cliente y tipo de pago funcionan correctamente. Todos los cambios están subidos al repositorio.

## 8.5 12C.5 — Pipeline documental postventa ✅

Este bloque convierte el ticket PDF de Ventas 11, originalmente write-once, en un documento **vigente + versiones históricas archivadas**, con control explícito de revisión documental y protección frente a carreras entre Angular, SQLite y filesystem. Está **completado, probado manualmente y subido**.

### 8.5.1 Revisión documental en `venta` ✅

Se añadieron a `venta`:

```text
ticket_revision     INTEGER NOT NULL DEFAULT 1
ticket_pdf_revision INTEGER NOT NULL DEFAULT 0
```

Invariantes:

```text
ticket_revision >= 1
ticket_pdf_revision >= 0
ticket_pdf_revision <= ticket_revision
```

Semántica:

```text
ticket_revision
= versión de los datos comerciales/fiscales que debería representar el ticket

ticket_pdf_revision
= última revisión que SQLite sabe materializada correctamente como PDF vigente
```

Venta recién persistida:

```text
1 / 0
```

PDF generado correctamente:

```text
1 / 1
```

### 8.5.2 Integración transaccional con Postventa ✅

`TypeOrmVentasPostventaRepository` incrementa `ticket_revision` dentro de la misma transacción SQLite cuando cambia materialmente:

- el cliente;
- el único tipo de pago.

Los no-op no incrementan revisión. Si la corrección hace rollback, la revisión tampoco cambia.

Así nunca puede confirmarse una corrección comercial con una revisión documental antigua.

### 8.5.3 Snapshot documental revision-aware ✅

`VentaTicketRecord` y `VentaTicketInterface` incluyen:

```text
ticketRevision
ticketPdfRevision
```

`TypeOrmVentasTicketsRepository` los recupera junto al snapshot comercial.

El guardado de PDF ya no recibe solo `idVenta + pdf`; recibe también la revisión exacta que produjo ese documento:

```text
savePdf(idVenta, expectedRevision, pdf)
```

### 8.5.4 Protección frente a carreras ✅

Flujo:

```text
getTicket() → revisión N
↓
construir HTML
↓
renderPdf()
↓
savePdf(idVenta, N, pdf)
```

Backend relee SQLite antes de tocar filesystem. Si `ticket_revision !== N`, rechaza el PDF como obsoleto.

Después de guardar físicamente, `markPdfRevision(idVenta, N)` confirma la revisión solo si `ticket_revision` sigue siendo N. Si otra operación incrementó la revisión durante el guardado, el PDF no se marca como vigente.

SQLite es la fuente de verdad; no se pretende una transacción distribuida ficticia entre SQLite y filesystem. Una inconsistencia física queda detectable por:

```text
ticket_revision != ticket_pdf_revision
```

### 8.5.5 Versionado físico de PDFs ✅

Política final:

```text
{id}.pdf             → PDF vigente
{id}_{timestamp}.pdf → revisión anterior archivada e inmutable
```

El timestamp es compatible con Windows.

El storage:

1. valida y escribe el nuevo PDF en temporal;
2. si existe `{id}.pdf`, lo renombra a histórico;
3. promueve el temporal como `{id}.pdf`;
4. si falla la promoción, intenta restaurar el PDF anterior;
5. limpia temporales sin ocultar el error principal.

También expone `exists(idVenta)`. Si SQLite marca una revisión como materializada pero el archivo ha desaparecido físicamente, se permite regenerarlo.

### 8.5.6 Regeneración tras correcciones postventa ✅

Después del COMMIT de cambio de cliente o pago, `HistoricalSalesComponent` intenta regenerar el PDF mediante `VentaTicketDocumentService`.

Es una tarea post-COMMIT no crítica:

```text
corrección guardada
↓
regeneración PDF
   ├─ éxito → ticket_revision == ticket_pdf_revision
   └─ fallo → corrección sigue válida y se muestra aviso
```

Un fallo documental nunca revierte cliente, pago, Caja ni la venta.

### 8.5.7 Tests y validación final ✅

Se añadieron/ajustaron tests para:

- revisión inicial `1 / 0`;
- incremento de revisión en cambios postventa reales;
- ausencia de incremento en errores/rollback;
- snapshot de ticket con revisiones;
- rechazo de revisión obsoleta antes de guardar;
- idempotencia si revisión y archivo ya están materializados;
- regeneración si falta físicamente el PDF;
- rechazo si la revisión cambia durante el guardado;
- versionado físico y archivo del PDF anterior;
- propagación de la revisión exacta desde Angular al backend.

El usuario confirmó batería completa verde, prueba manual correcta, valores `ticket_revision` / `ticket_pdf_revision` correctos en SQLite y PDFs vigentes/históricos correctamente creados. Todos los cambios están subidos.

---

# 9. Reglas funcionales de Postventa que no deben perderse

## 9.1 Cambio de cliente

- permitido si la venta no está facturada;
- asignar o quitar cliente;
- backend revalida aunque la UI lo muestre habilitado;
- después del cambio deben invalidarse estadísticas del cliente anterior y del nuevo;
- tras un cambio material, `ticket_revision` aumenta dentro de la transacción y el PDF se regenera post-COMMIT mediante el pipeline de 12C.5.

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

12C.5 está cerrado. Cualquier corrección que modifique el contenido documental incrementa `ticket_revision` dentro de la misma transacción SQLite.

El PDF vigente se materializa después del COMMIT. Si la regeneración funciona, `ticket_pdf_revision` alcanza la misma revisión. Si falla, la corrección permanece guardada y el desfase entre ambas revisiones identifica que el PDF está pendiente/desactualizado.

Nunca revertir una venta o corrección por un fallo de generación/archivo del PDF.

---

# 10. Diseño de los siguientes bloques

## 10.1 12C.5 — Pipeline documental postventa ✅

Cerrado. Política final:

```text
{id}.pdf             → versión vigente
{id}_{timestamp}.pdf → versión anterior archivada e inmutable
```

SQLite mantiene `ticket_revision` y `ticket_pdf_revision`; el guardado es revision-aware y las correcciones postventa regeneran el ticket tras COMMIT sin comprometer la operación comercial.

Este mismo mecanismo queda preparado para una futura aceptación/reintento TicketBAI que modifique el contenido fiscal del ticket.

## 10.2 12C.6 — Impresión ✅

Cerrado, probado y subido. El bloque se dividió en tres piezas coherentes.

### 10.2.1 Ticket regalo efímero ✅

- builder propio `venta-gift-ticket-document.builder.ts`;
- se genera desde el snapshot persistido de la venta;
- no crea PDF histórico, no toca `ticket_revision` ni `ticket_pdf_revision`;
- se imprime mediante el pipeline HTML de impresión silenciosa ya existente;
- conserva cabecera del negocio, fecha, referencia, empleado, artículos/cantidades, QR comercial local y frases;
- oculta cliente, PVP, descuentos, importes de línea, total, pagos, entregado/cambio e IVA;
- muestra `TICKET REGALO`;
- en operación mixta incluye solo líneas con `unidades > 0`;
- devolución pura: UI deshabilitada por capacidad backend y builder rechaza defensivamente una operación sin líneas positivas;
- **nunca debe incorporar QR ni datos específicos de TicketBAI**. El QR que conserva es exclusivamente el QR comercial/local asociado a `-idVenta`.

### 10.2.2 Reimpresión exacta del PDF vigente ✅

La reimpresión histórica no reconstruye HTML si existe un PDF vigente. Flujo:

```text
Histórico → Reimprimir
  ↓
VentasTicketsService.getCurrentPdf(idVenta)
  ├─ revisión DB vigente + archivo presente → devuelve exactamente esos bytes
  └─ ausente/desactualizado → null
                               ↓
                    generateAndSavePdf(idVenta)
                               ↓
                    pipeline revision-aware 12C.5
                               ↓
                    volver a leer PDF vigente
  ↓
PrintingService.printPdf(pdf)
  ↓
Electron imprime el PDF materializado
```

Detalles:

- `VentaTicketPdfStorage` expone `read(idVenta)` además de `exists/save`;
- `getCurrentPdf` comprueba `ticket_revision == ticket_pdf_revision` antes de leer y vuelve a comprobar después para descartar carreras;
- si falta físicamente `{id}.pdf` o está desactualizado, Angular repara primero mediante el pipeline 12C.5;
- una reimpresión correcta no incrementa revisiones ni crea una revisión histórica nueva;
- el renderer Electron carga temporalmente los bytes PDF en una `BrowserWindow` oculta y los envía silenciosamente a la impresora configurada;
- el temporal se elimina al finalizar;
- `PrintingService` comparte la misma validación de impresora para HTML y PDF;
- los errores de impresión nunca modifican venta, Caja ni revisiones documentales.

La prueba física Star TSP100/TSP143 80 mm sigue pendiente. Sin impresora se validó que el flujo llega correctamente al error de impresora y que no altera revisiones/archivos indebidamente.

### 10.2.3 Refactor documental común ✅

Se creó `src/app/model/tickets/ticket-document-shared.utils.ts` para extraer solo duplicación demostrada entre builders:

- resolución de nombre fiscal/comercial;
- cabecera del negocio;
- logo/redes en variante `branded`;
- cabecera simple en variante `plain`;
- frases de ticket;
- formato compartido de fecha/importes/porcentajes.

Se mantienen builders independientes para venta, reserva y regalo. No existe un builder genérico con flags de negocio.

Diferencias preservadas:

- venta y regalo: cabecera `branded`, logo, nombre fiscal y redes;
- reserva: cabecera `plain`, sin logo ni redes, prioriza `nombreComercial`;
- reserva mantiene su tratamiento temporal propio;
- venta mantiene economía/IVA/pagos;
- regalo mantiene exclusión económica y exclusión explícita de TicketBAI.

## 10.3 12C.7 — Email 🟦 EN CURSO

El bloque se ha dividido en cuatro subbloques para mantener separadas configuración, caso de uso, wiring/UI y validación real.

### 10.3.1 12C.7A — Configuración + secretos + infraestructura SMTP ✅

Completado, probado y subido.

#### Configuración persistida

Se añadió una configuración propia para el contenido del email, separada deliberadamente del transporte SMTP:

```text
appData.emailSmtp
├── host
├── port
├── secure
└── user

appData.ticketEmail
├── subjectTemplate
└── bodyTemplate

secrets.json (safeStorage)
└── emailSmtpPass
```

`emailSmtp` sigue representando exclusivamente **cómo conectar con el servidor**. `ticketEmail` representa **qué asunto/cuerpo enviar**.

Valores por defecto:

```text
Asunto:
{nombreNegocio} - Ticket {referencia}

Cuerpo:
Adjuntamos el ticket correspondiente a su compra.
Gracias por su confianza.
```

Variables admitidas:

```text
{nombreNegocio}
{referencia}
```

No se admiten variables arbitrarias. Frontend y backend validan las plantillas.

#### Compatibilidad hacia atrás

`AppData` actual exige siempre `ticketEmail`, pero las fuentes antiguas se normalizan al entrar:

- `JsonAppDataRepository`: si un `app_data.json` anterior no contiene `ticketEmail`, aplica los valores por defecto;
- importación `.otpv`: `YauzlLegacyImportPackageConfigurationReader` construye `ticketEmail` con los defaults, porque el paquete legacy no conocía esta configuración;
- los fixtures `AppData` existentes se actualizaron para representar el modelo normalizado actual.

No se hizo opcional `ticketEmail` en el dominio actual solo para acomodar formatos antiguos.

#### Installation

La nueva instalación permite configurar en el paso SMTP:

- host;
- puerto;
- seguridad `none | tls | ssl`;
- usuario;
- contraseña;
- asunto del email;
- cuerpo del email.

El formulario muestra las variables permitidas y valida asunto/cuerpo cuando SMTP está activo. El comando de instalación incluye un bloque `ticketEmail`, que `installation-app-data.mapper.ts` conserva en `AppData`. La contraseña SMTP sigue entrando exclusivamente por `InstallationSecretsData.emailSmtpPass`.

#### Almacenamiento seguro

La infraestructura existente ya cubría la necesidad:

```text
ElectronSafeStorageSecretStorage
  ↓
safeStorage de Electron
  ↓
secrets.json cifrado
```

`ApplicationPaths` distingue:

```text
secretsFile
stagingSecretsFile
```

Durante 12C.7A **no se creó aún el storage operacional en el composition root**, porque todavía no existía un consumidor conectado. Ese wiring se hará en 12C.7C.

#### `EmailSender` + Nodemailer

Se añadió un contrato backend independiente de Ventas:

```text
electron/backend/contracts/email/email-sender.interface.ts
```

Conceptos principales:

```text
EmailSenderSmtpConfig
EmailSenderAttachment
EmailSendRequest
EmailSender
```

El contrato no conoce `AppData`, Ventas, `safeStorage` ni Histórico.

Implementación:

```text
electron/infrastructure/email/nodemailer-email.sender.ts
```

Se añadió Nodemailer al proyecto y se mantiene dentro del bundle Electron; `build-electron.mjs` no necesita externalizarlo.

Semántica de seguridad acordada:

```text
none → secure=false + ignoreTLS=true
tls  → secure=false + requireTLS=true
ssl  → secure=true
```

El adaptador:

- construye el adjunto desde `Uint8Array`/`Buffer`, no desde rutas o URLs;
- activa `disableFileAccess` y `disableUrlAccess`;
- cierra siempre el transporter;
- no propaga el error SMTP original al caller, para evitar filtrar credenciales o detalles sensibles.

Tests cubren `tls`, `ssl`, `none`, adjunto, cierre del transporter y sanitización del error.

### 10.3.2 12C.7B — Caso de uso backend de envío ✅

Completado, probado y subido.

Nuevo contrato público:

```text
electron/contracts/ventas/venta-ticket-email.interface.ts

VentaTicketEmailCommand
├── idVenta
└── destinatario
```

Nuevo caso de uso:

```text
electron/backend/application/ventas/ventas-ticket-email.service.ts
```

Dependencias:

```text
ConfigurationService
        +
SecretStorage operacional
        +
VentasTicketsService
        +
EmailSender
        ↓
VentasTicketEmailService
```

El storage operacional todavía no está conectado en composition root; en los tests se inyecta un fake. La conexión real se hará en 12C.7C.

#### Flujo autoritativo

```text
send({ idVenta, destinatario })
  ↓
validar idVenta + email manual
  ↓
ConfigurationService.load()
  ↓
validar appData.emailSmtp
  ↓
SecretStorage.load() → emailSmtpPass
  ↓
VentasTicketsService.getByVentaId()
  ↓
VentasTicketsService.getCurrentPdf()
  ├─ null → error: PDF vigente no disponible
  └─ bytes vigentes
  ↓
releer ticket y comprobar revisión
  ↓
renderizar plantillas
  ↓
EmailSender.send(...)
```

`VentasTicketEmailService` **no genera PDFs**. Si el vigente falta o está desactualizado, rechaza el envío. En 12C.7C Angular reparará primero el documento reutilizando `VentaTicketDocumentService.generateAndSavePdf()` y después volverá a solicitar el envío.

#### Destinatario y persistencia

- el destinatario se introduce manualmente para esa operación;
- se normaliza con `trim()` y se valida defensivamente;
- no se guarda en `venta`, `cliente`, `AppData` ni ningún otro almacenamiento;
- el backend no altera venta, Caja ni revisiones por un envío correcto o fallido.

#### Remitente y plantillas

- dirección `From`: usuario SMTP configurado;
- display name `From`: `appData.nombre`;
- `{nombreNegocio}`: prioriza `appData.nombreComercial`; fallback al nombre fiscal / `Osumi TPV`;
- `{referencia}`: serie + número con forma `A-456` cuando existe serie;
- adjunto: `ticket-{referencia}.pdf`, sanitizando la referencia para nombre de archivo.

#### Protección frente a PDF obsoleto

`VentasTicketsService.getCurrentPdf()` ya comprueba la revisión documental antes y después de leer el filesystem. El caso de uso hace además una última relectura del ticket antes de entregarlo a SMTP:

```text
getByVentaId()                → revisión N
getCurrentPdf()
  ├─ DB N/N
  ├─ leer {id}.pdf
  └─ DB N/N
getByVentaId()                → sigue N/N ?
  ├─ sí → preparar SMTP
  └─ no → cancelar
```

No se intenta mantener una transacción SQLite abierta durante SMTP ni fingir atomicidad distribuida. La garantía práctica es no seleccionar conscientemente un PDF que ya esté marcado como obsoleto y volver a comprobar el snapshot inmediatamente antes del envío.

Tests cubren:

- envío correcto con configuración + secreto;
- destinatario normalizado;
- adjunto PDF vigente;
- SMTP no configurado;
- contraseña SMTP ausente;
- destinatario inválido;
- PDF vigente ausente;
- cambio de revisión durante la preparación.

El usuario confirmó batería verde y subió todos los cambios al repositorio.

### 10.3.3 12C.7C — Wiring IPC + Angular + UI Histórico 🟦 SIGUIENTE

Siguiente lote exacto:

1. crear `SecretStorage` operacional apuntando a `applicationPaths.secretsFile`;
2. instanciar `NodemailerEmailSender`;
3. instanciar `VentasTicketEmailService` con `ConfigurationService`, storage operacional, `VentasTicketsService` y `EmailSender`;
4. conectar el servicio al composition root;
5. añadir canal IPC de envío de ticket por email;
6. ampliar `VentasApi` y preload sin exponer configuración secreta ni contraseña;
7. crear/ajustar servicio Angular para solicitar el envío;
8. incorporar acción **Enviar por email** en el detalle Histórico;
9. pedir un email manual de un solo uso, con validación UI;
10. antes de enviar, comprobar si existe PDF vigente y, si falta/desactualizado, materializarlo mediante `VentaTicketDocumentService.generateAndSavePdf()`;
11. después solicitar el envío backend;
12. mostrar éxito/error sin modificar venta, Caja ni revisiones.

No se debe enviar HTML alternativo ni reconstruir un documento específico para correo. El adjunto es siempre el **PDF vigente materializado**.

### 10.3.4 12C.7D — Prueba SMTP real y cierre ⬜

Pendiente después del wiring/UI:

- batería completa;
- prueba manual con SMTP real/controlado;
- validar `none/tls/ssl` hasta donde permita el servidor de pruebas;
- comprobar adjunto recibido y nombre de archivo;
- comprobar asunto/cuerpo y sustitución de variables;
- comprobar error de credenciales/servidor sin mutaciones comerciales;
- comprobar reparación previa de PDF ausente/desactualizado;
- cerrar 12C.7 y actualizar este documento.

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

Pruebas manuales de 12C.4 realizadas y validadas:

- asignar/cambiar/quitar cliente;
- restricciones de capacidad aplicadas por backend;
- cambio de tipo de pago;
- normalización del pago;
- refresco de detalle/listado/resumen;
- UI de selector de cliente y selector inline de pago;
- invalidación post-COMMIT de estadísticas de cliente;
- flujo completo probado en aplicación real.

Los casos de caja cerrada, multipago, total cero, venta facturada y rollback están además cubiertos por backend/tests automatizados.

Pruebas manuales de 12C.5 realizadas y validadas:

- venta nueva termina con revisión documental/PDF sincronizadas tras generar el ticket;
- cambio de cliente incrementa revisión, regenera `{id}.pdf` y archiva la versión anterior;
- cambio de pago vuelve a incrementar revisión y archiva una segunda versión;
- `ticket_revision` y `ticket_pdf_revision` se comprobaron directamente en SQLite;
- los PDFs vigentes e históricos se comprobaron físicamente en el directorio de tickets;
- batería completa verde y cambios subidos al repositorio.

Pruebas manuales de 12C.6 realizadas y validadas:

- ticket regalo visible en Histórico y generado desde snapshot persistido;
- preview del ticket regalo validada mediante `renderPdf()` desde DevTools, sin persistir el documento;
- ticket regalo sin información económica/cliente y con QR comercial local;
- reimpresión de PDF vigente no modifica revisiones ni crea archivo histórico nuevo;
- ausencia física del PDF vigente fuerza reparación mediante 12C.5 antes de intentar imprimir;
- sin impresora física, el flujo alcanza correctamente el error de impresora configurada/no disponible sin mutar la venta;
- refactor compartido de builders conserva las diferencias de venta/reserva/regalo;
- batería automatizada verde y cambios subidos.

Pruebas de 12C.7A realizadas y validadas:

- compatibilidad de `app_data.json` sin `ticketEmail` mediante defaults;
- instalación nueva con asunto/cuerpo configurables y variables permitidas;
- validator frontend/backend rechaza variables no soportadas;
- importación `.otpv` legacy crea `ticketEmail` con defaults;
- `NodemailerEmailSender` cubre `tls`, `ssl`, `none`, adjuntos, cierre del transporter y sanitización de errores;
- `npm run typecheck:electron` detectó y se corrigió el constructor `AppData` del reader legacy;
- batería completa verde y cambios subidos.

Pruebas de 12C.7B realizadas y validadas:

- caso de uso backend envía configuración, secreto y PDF vigente al `EmailSender` fake;
- rechaza SMTP ausente, contraseña ausente, destinatario inválido y PDF vigente ausente;
- cancela si cambia la revisión mientras se prepara el envío;
- el destinatario no se persiste;
- batería de tests/typecheck/lint/build verde y cambios subidos.

La prueba SMTP real queda pendiente de 12C.7D, después del wiring IPC/UI.

---

# 13. Limitaciones / bloqueos conocidos

1. **TicketBAI devoluciones/operaciones mixtas**: pendiente de Berein.
2. **Star TSP100/TSP143 80 mm**: prueba física pendiente, no bloqueante. 12C.6 está funcionalmente cerrado sin esa validación de hardware.
3. **PDF postventa**: resuelto en 12C.5 mediante revisiones y versionado físico. Un fallo post-COMMIT puede dejar `ticket_revision != ticket_pdf_revision`, pero nunca invalida la venta/corrección.
4. **Email SMTP real**: la infraestructura y el caso de uso están probados con fakes; la prueba contra un servidor SMTP real/controlado queda para 12C.7D después del wiring/UI.
5. GitHub Raw puede devolver contenido cacheado/stale; si no se puede verificar frescura, usar archivos adjuntos actuales.

---

# 14. Próximo paso exacto

Continuar por:

# Ventas 12C.7C — Wiring IPC + Angular + UI Histórico

Estado de entrada al siguiente turno:

```text
12C.1 Infraestructura Histórico                ✅
12C.2 Filtros/listado/totales                 ✅
12C.3 Detalle                                 ✅
12C.4 Correcciones postventa                  ✅
12C.5 Pipeline documental                     ✅
12C.6 Impresión                               ✅
12C.7 Email                                   🟦 en curso
  12C.7A Config + secretos + SMTP             ✅
  12C.7B Caso de uso backend                  ✅
  12C.7C IPC + Angular + UI Histórico         🟦 siguiente
  12C.7D Prueba SMTP real y cierre            ⬜
12C.8 TicketBAI ordinario                     ⬜
12C.9 TicketBAI devoluciones                  ⏸️ Berein
12C.10 Regresión/cierre                       ⬜
```

Punto de partida exacto de 12C.7C:

1. `EmailSender` y `NodemailerEmailSender` ya existen y están probados;
2. `VentasTicketEmailService` ya existe y está probado de forma aislada;
3. `AppData.ticketEmail` es obligatorio en el modelo normalizado;
4. `JsonAppDataRepository` aplica defaults a configuraciones antiguas;
5. el importador `.otpv` crea `ticketEmail` con defaults;
6. `emailSmtpPass` ya se guarda/carga mediante `ElectronSafeStorageSecretStorage`;
7. todavía falta crear el `SecretStorage` **operacional** en composition root usando `applicationPaths.secretsFile`;
8. todavía falta instanciar `NodemailerEmailSender` y `VentasTicketEmailService` en el grafo real;
9. añadir IPC/API/preload para `sendTicketEmail(command)` sin exponer secretos;
10. Angular debe reparar el PDF si `getCurrentPdf(idVenta)` devuelve `null`, usando `generateAndSavePdf(idVenta)`, y después solicitar el envío;
11. Histórico debe permitir introducir un destinatario manual de un solo uso y lanzar la acción;
12. no persistir el destinatario manual;
13. mostrar éxito/error de manera postventa, sin tocar venta/Caja/revisiones;
14. el adjunto debe ser siempre el PDF vigente materializado, nunca HTML alternativo;
15. después realizar 12C.7D con SMTP real/controlado y cerrar Email.

Reglas cerradas:

```text
From.address = appData.emailSmtp.user
From.name    = appData.nombre
{nombreNegocio} prioriza appData.nombreComercial
{referencia} = serie-numero, por ejemplo A-456
adjunto      = ticket-{referencia}.pdf
```

El backend `VentasTicketEmailService` no genera PDFs: si el vigente no está disponible, falla. La reparación documental pertenece al flujo Angular ya existente y el backend vuelve a validar el PDF/revisión antes del SMTP.

---

# 15. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” versión 2.10 como contexto principal.

Estado general:
- Installation + importación `.otpv` v2: completadas y probadas.
- Startup: completado.
- Auditoría transversal + Refactor A–E: completados.
- Ventas 1–11: completados, probados y subidos.
- Ventas 12A y diseño 12B: cerrados salvo TicketBAI para devoluciones/operaciones mixtas, pendiente de Berein.
- Ventas 12C.1–12C.6: COMPLETADOS, probados y subidos.
- Ventas 12C.7A — Configuración + secretos + infraestructura SMTP: COMPLETADO, probado y subido.
- Ventas 12C.7B — Caso de uso backend de envío: COMPLETADO, probado y subido.
- Ventas 12C.7C — Wiring IPC + Angular + UI Histórico: SIGUIENTE.
- Ventas 12C.7D — Prueba SMTP real y cierre: pendiente.

12C.5 cerrado:
- `venta` tiene `ticket_revision` y `ticket_pdf_revision`;
- `{id}.pdf` es vigente y `{id}_{timestamp}.pdf` archiva versiones anteriores;
- guardado revision-aware y protección frente a carreras;
- postventa incrementa revisión dentro de la transacción y regenera PDF post-COMMIT;
- fallo documental nunca revierte la operación.

12C.6 cerrado:
- ticket regalo efímero, no persistido, sin cambios de revisión;
- ticket regalo: líneas positivas, sin cliente/economía/IVA/pagos, con QR comercial local;
- ticket regalo nunca llevará QR ni datos TicketBAI;
- reimpresión histórica usa exactamente el PDF vigente;
- PDF ausente/desactualizado se repara mediante pipeline 12C.5 antes de reimprimir;
- `PrintingService.printPdf()` imprime bytes PDF mediante Electron;
- fallo de impresión no modifica venta ni revisiones;
- refactor `ticket-document-shared.utils.ts` comparte piezas comunes sin fusionar builders;
- prueba física Star 80 mm sigue pendiente/no bloqueante.

12C.7A cerrado:
- `AppData` tiene `ticketEmail` separado de `emailSmtp`;
- defaults: `{nombreNegocio} - Ticket {referencia}` y cuerpo estándar de agradecimiento;
- variables soportadas: `{nombreNegocio}` y `{referencia}`;
- `JsonAppDataRepository` normaliza app_data antiguos con defaults;
- importación `.otpv` legacy también crea `ticketEmail` con defaults;
- Installation permite configurar asunto/cuerpo y los valida frontend/backend;
- contraseña SMTP sigue en `secrets.json` mediante Electron `safeStorage`;
- contrato backend `EmailSender` independiente de Ventas;
- implementación `NodemailerEmailSender` con:
  none → secure=false + ignoreTLS=true
  tls  → secure=false + requireTLS=true
  ssl  → secure=true
- Nodemailer no recibe rutas/URLs de adjuntos; se usan bytes y se bloquea file/url access;
- errores SMTP originales no se propagan para evitar filtrar información sensible.

12C.7B cerrado:
- contrato público `VentaTicketEmailCommand { idVenta, destinatario }`;
- servicio `VentasTicketEmailService` depende de `ConfigurationService`, `SecretStorage`, `VentasTicketsService` y `EmailSender`;
- valida destinatario manual y no lo persiste;
- valida SMTP + carga `emailSmtpPass` desde SecretStorage;
- obtiene snapshot y PDF vigente;
- vuelve a comprobar la revisión antes de entregar el documento al SMTP;
- `{nombreNegocio}` prioriza `nombreComercial`;
- From usa `emailSmtp.user` + display name `appData.nombre`;
- adjunto `ticket-{referencia}.pdf`;
- si no existe PDF vigente, el backend falla: NO lo genera;
- tests cubren envío correcto, SMTP/secreto/PDF ausentes, destinatario inválido y carrera de revisión;
- batería verde y cambios subidos.

Siguiente paso exacto — 12C.7C:
- crear `ElectronSafeStorageSecretStorage(applicationPaths.secretsFile)` operacional en composition root;
- instanciar `NodemailerEmailSender`;
- instanciar y conectar `VentasTicketEmailService`;
- añadir canal IPC, `VentasApi` y preload para envío;
- no exponer contraseña ni configuración sensible al renderer;
- Angular debe comprobar/reparar PDF vigente con el pipeline documental antes de solicitar envío;
- añadir acción “Enviar por email” en Histórico;
- introducir destinatario manual de un solo uso, no persistido;
- mostrar éxito/error sin modificar venta/Caja/revisiones;
- después ejecutar 12C.7D con SMTP real/controlado y cerrar Email.

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
| 2.6 | 25-08-2026 | 12C.1, 12C.2 y 12C.3 completados. 12C.4 avanzado: contratos, servicio backend, repository transaccional y tests SQLite reales completados y subidos. |
| 2.7 | 26-08-2026 | 12C.4 completado, probado manualmente y subido: backend transaccional, tests, IPC/preload, Angular, UI, invalidación de estadísticas y refresco Histórico. Siguiente: 12C.5 Pipeline documental postventa. |
| 2.8 | 26-08-2026 | 12C.5 completado y validado: revisiones documentales en SQLite, guardado revision-aware, versionado físico de PDFs, regeneración postventa y tests de carrera. Siguiente: 12C.6 Impresión/reimpresión y ticket regalo. |
| **2.9** | **26-08-2026** | **12C.6 completado y validado: ticket regalo efímero, reimpresión exacta/reparación del PDF vigente, impresión PDF binaria y refactor común de builders. Siguiente: 12C.7 Email.** |
| **2.10** | **26-08-2026** | **12C.7A y 12C.7B completados, probados y subidos: `ticketEmail`, compatibilidad legacy, `EmailSender` + Nodemailer y `VentasTicketEmailService` con PDF vigente, secreto seguro, plantillas y protección de revisión. Siguiente: 12C.7C IPC + Angular + UI Histórico.** |
