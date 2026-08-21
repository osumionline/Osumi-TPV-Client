# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.1  
**Fecha:** 21 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal y los bloques **Ventas 1–10** están completados. En **Ventas 11 — Persistencia transaccional** están completados **11A, 11B, 11C y 11D**. Dentro de **11E — Ticket definitivo + QR + PDF + impresión**, está completado **11E.1 — snapshot persistido del ticket**. El siguiente paso exacto es **11E.2 — exposición IPC + servicio Angular del ticket**. Después quedarán 11E.3–11E.6, 11F y Ventas 12 — Postventa.

---

## 1. Propósito del documento

Este documento reúne el contexto técnico y funcional necesario para continuar el desarrollo de Osumi TPV Client aunque se abra una conversación nueva o cambie la persona que trabaja en el proyecto.

Debe tratarse como un documento vivo. Al completar un bloque principal del plan de Ventas, cambiar una decisión arquitectónica o cerrar un hito, se actualizarán la versión, el estado actual, las decisiones y el siguiente paso.

> **Regla de continuidad:** al terminar cada bloque principal de Ventas se entregará una versión actualizada de este documento. Debe incluir la recapitulación completa del plan, qué está terminado, cuál es el bloque siguiente, decisiones relevantes, limitaciones conocidas y el contexto suficiente para retomar el trabajo desde cero.

Hitos principales completados:

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
- **Auditoría transversal de arquitectura tras Ventas 9**.
- **Refactor A — Dinero y porcentajes**.
- **Refactor B — Utils Angular + contratos**.
- **Refactor C — Infraestructura SQLite**.
- **Refactor D — UI + Bootstrap**.
- **Refactor E — Limpieza final**.
- **Ajuste UX del buscador de artículos**.
- **Ventas 10 — Finalización y pagos**.
- **Ventas 11A — Análisis y diseño de la transacción**.
- **Ventas 11B — Contratos + mapper de GuardarVenta + trazabilidad SQLite**.
- **Ventas 11C — Caso de uso backend + transacción SQLite**, incluida regresión real contra SQLite.
- **Ventas 11D — IPC + Angular + Finalizar venta**, incluida prueba manual end-to-end.
- **Ventas 11E.1 — Snapshot persistido del ticket definitivo**.

Los hitos cerrados hasta 11D han sido probados con la aplicación real y están subidos al repositorio. 11E.1 está implementado y validado; antes de continuar debe revisarse siempre el `main` actual.

---

## 2. Estado actual del proyecto

- Aplicación de escritorio: **Electron + Angular**.
- Backend local: **Node.js/TypeScript dentro de Electron**.
- Persistencia local: **SQLite mediante TypeORM y better-sqlite3**.
- Instalación desde cero: completada.
- Importación desde Osumi TPV antiguo mediante `.otpv`: completada.
- Transformación de las 33 tablas legacy: completada.
- Importación de imágenes, iconos, PDF, logo, configuración y secretos: completada.
- Promoción atómica desde staging a la instalación definitiva: completada.
- `ApplicationStateService`, `/startup` y precarga global: completados.
- Conexión SQLite operativa persistente durante la sesión: implementada.
- Protocolo interno `osumi://assets/...`: implementado y probado.
- Las ventas abiertas viven en memoria en `VentasService` y sobreviven a la navegación entre módulos.
- Refactor transversal A–E: completado, probado y subido.
- Buscador de artículos: clic en el nombre añade inmediatamente un único artículo y cierra el buscador; los checks mantienen la selección múltiple.
- Ventas 10: finalización económica, pagos múltiples, efectivo/cambio, reembolsos, reservas e infraestructura de impresión/PDF completados.
- Ventas 11A–11D: persistencia transaccional real completada, conectada de extremo a extremo y validada manualmente.
- Ventas 11E.1: snapshot persistido del ticket definitivo completado.
- Siguiente paso: **Ventas 11E.2 — exposición IPC + servicio Angular del ticket**.
- Después: **11E.3–11E.6**, **11F — regresión completa y cierre**, y **Ventas 12 — Postventa**.

Validación de hardware pendiente y no bloqueante:

- Impresora de pruebas futura: **Star TSP100 Cutter / TSP143**.
- Papel: **80 mm**.
- Debe verificarse físicamente longitud del ticket, márgenes y comportamiento del corte cuando haya acceso a la impresora.

---

## 3. Repositorios y entorno

| Elemento | Valor |
| --- | --- |
| Cliente de escritorio | https://github.com/osumionline/Osumi-TPV-Client |
| Frontend antiguo | https://github.com/osumionline/Osumi-TPV |
| Backend antiguo | https://github.com/osumionline/TPV-API |
| API remota futura | https://github.com/osumionline/TPV-Client-API |
| Sistema habitual | Windows 11 |
| Editor | Visual Studio Code |
| Zona horaria | Europe/Madrid |

Antes de proponer cambios sobre archivos existentes debe revisarse el contenido actual de `main`. Si GitHub Raw parece devolver una versión en caché, usar un query string de cache-busting.

No pedir de nuevo archivos que ya estén actualizados y accesibles salvo que exista código local no subido o recursos externos que no estén en el repositorio.

---

## 4. Arquitectura objetivo

Osumi TPV Client es la evolución instalable de Osumi TPV. La primera etapa es monopuesto y local, pero la arquitectura debe permitir evolucionar a multipuesto sin duplicar la lógica de negocio.

- Angular se ocupa de interfaz, estado de presentación y formularios.
- El backend Electron/Node concentra validaciones, lógica de negocio y persistencia.
- El frontend envía acciones/comandos con payloads tipados.
- La persistencia podrá decidir en el futuro entre SQLite local y una API remota OFW.
- Los contratos IPC viven en `electron/contracts`, organizados por dominio.
- Los contratos internos de backend viven en `electron/backend/contracts`, organizados por dominio.
- El composition root de Electron mantiene el wiring explícito.
- No introducir una capa ejecutable `shared` entre Angular y Electron salvo una necesidad real y clara.
- Utilidades Angular y utilidades backend permanecen separadas.
- No crear abstracciones genéricas prematuras cuando el patrón todavía tenga diferencias de dominio relevantes.

> **Principio:** la lógica de negocio no debe quedar repartida entre componentes Angular ni depender de detalles concretos de SQLite.

---

## 5. Convenciones de desarrollo

- Angular moderno: standalone, signals, `computed`, `input`/`output`, `inject()`.
- Control flow moderno: `@if`, `@for`, `@switch`.
- Tipado estricto; evitar `any`.
- Preferencia por tipos explícitos.
- Sin carpeta `core`; servicios en `src/app/services`, guards en `src/app/guards`.
- Organización por dominio.
- **`export default` solo si el archivo exporta un único elemento. Si exporta más de uno, todos deben ser exports nombrados.**
- Usar líneas en blanco para separar **conceptos o bloques lógicos**, no para separar propiedades consecutivas de un mismo objeto o estructura.
- SCSS anidado cuando mejora la legibilidad.
- En Angular 22 no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- Archivo nuevo: entregar completo.
- Archivo existente: indicar ruta y ubicación exacta respecto a símbolos presentes en el archivo actual.
- No asumir que fragmentos de respuestas anteriores siguen existiendo.
- No depender de renders accidentales: los modelos mutables vivos deben tener notificación reactiva explícita.
- Mantener accesibilidad: no `autofocus` HTML, evitar elementos no interactivos con `(click)`, usar controles reales y gestión explícita de foco.

Aliases relevantes:

- frontend: `@env`, `@app/*`, `@model/*`, `@services/*`, `@utils/*`, `@constants/*`, `@pipes/*`;
- backend: `@backend/*`, `@infrastructure/*`, `@desktop-contracts/*`.

---

## 6. Installation e importación legacy ✅

La instalación y la migración `.otpv` están cerradas.

Incluyen:

- selección e inspección segura del paquete;
- checksums SHA-256;
- lector incremental de `database.sql`;
- validación de referencias y restricciones;
- revisión previa de conflictos;
- transformación en worker y SQLite temporal;
- importación de catálogo, stock, clientes, ventas, reservas, facturas, caja, pedidos, histórico, archivos y TicketBAI legacy;
- transformación de `app_data.json`;
- separación/cifrado de secretos;
- conversión de logo;
- promoción atómica;
- recuperación ante promoción interrumpida.

El paquete legacy contiene 33 tablas y todas están cubiertas.

### 6.1 Configuración local de impresora

Desde Ventas 10 existe una configuración local adicional:

```text
config/
├── app_data.json
└── printing_settings.json
```

`printing_settings.json`:

```json
{
  "schemaVersion": 1,
  "ticketPrinterDeviceName": null
}
```

Reglas:

- es **local del terminal**;
- es opcional;
- no forma parte del `.otpv`;
- una importación puede terminar perfectamente sin impresora;
- su ausencia equivale a `ticketPrinterDeviceName: null`;
- el identificador persistido es el `deviceName` real del sistema, no solo el nombre amigable;
- si la impresora configurada desaparece temporalmente, no se borra automáticamente la configuración.

Pendiente de UX futura:

- añadir un bloque pequeño de **Impresión / Impresora de tickets** en la zona ya existente donde se configuran datos del negocio/instalación;
- combo opcional con las impresoras disponibles;
- no crear una pantalla independiente solo para la impresora;
- un `.otpv` importado no debe suponer que la impresora del equipo anterior existe en el nuevo.

---

## 7. Startup ✅

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

Startup precarga:

1. marcas;
2. proveedores y comerciales;
3. empleados y permisos;
4. clientes;
5. categorías;
6. provincias.

Los artículos no se precargan globalmente.

Las ventas abiertas se mantienen en `VentasService` y sobreviven a la navegación.

---

## 8. Plan maestro del módulo Ventas

Esta recapitulación debe aparecer al comenzar cada fase, bloque o subapartado.

1. ✅ **Contexto operativo**
   - ✅ 1A — Lectura del contexto operativo.
   - ✅ 1B — Apertura de caja.
2. ✅ **Modelo de venta en curso + workspace persistente**.
3. ✅ **Consulta/búsqueda de artículos y accesos directos**.
4. ✅ **Estructura visual del módulo Ventas**.
5. ✅ **Operaciones sobre líneas**.
6. ✅ **Clientes y estadísticas rápidas**.
7. ✅ **Varios**.
8. ✅ **Devoluciones**.
9. ✅ **Reservas**.
10. ✅ **Finalización y pagos**.
    - ✅ 10A — Modelo de finalización y pagos.
    - ✅ 10B — Interfaz genérica de finalización.
    - ✅ 10C — Efectivo, cambio y reembolsos.
    - ✅ 10D — Reserva desde finalización.
    - ✅ 10E — Contrato definitivo y regresión.
11. 🟦 **Persistencia transaccional — en curso**.
    - ✅ 11A — Análisis y diseño de la transacción.
    - ✅ 11B — Contratos + mapper de GuardarVenta.
      - ✅ 11B.1 — `GuardarVentaCommand`.
      - ✅ 11B.2 — Snapshot persistente del descuento.
      - ✅ 11B.3 — Mapper `VentaEnCurso + VentaFinalizacionResultado`.
      - ✅ 11B.4 — Tests completos del mapper.
      - ✅ 11B.5 — Trazabilidad SQLite de devolución/reserva.
    - ✅ 11C — Caso de uso backend + transacción SQLite.
      - ✅ 11C.1 — Contratos internos.
      - ✅ 11C.2 — Validación/normalización backend.
      - ✅ 11C.3 — Venta + numeración + líneas + pagos.
      - ✅ 11C.4 — Stock + histórico + devoluciones + reservas.
      - ✅ 11C.5 — Acumulados de caja.
      - ✅ 11C.6 — Regresión transaccional con SQLite real.
    - ✅ 11D — IPC + Angular + Finalizar venta.
      - ✅ 11D.1 — Composition root + IPC backend.
      - ✅ 11D.2 — Preload + Desktop API.
      - ✅ 11D.3 — Servicio Angular de persistencia.
      - ✅ 11D.4 — Integración con Finalizar venta.
      - ✅ 11D.5 — Prueba manual end-to-end.
    - 🟦 11E — Ticket definitivo + QR + PDF + impresión.
      - ✅ 11E.1 — Snapshot persistido del ticket.
      - 🟦 11E.2 — Exposición IPC + servicio Angular.
      - ⬜ 11E.3 — QR local + documento HTML de 80 mm.
      - ⬜ 11E.4 — PDF + impresión silenciosa.
      - ⬜ 11E.5 — Orquestación post-COMMIT y errores no bloqueantes.
      - ⬜ 11E.6 — Prueba física y regresión.
    - ⬜ 11F — Regresión completa + cierre.
12. ⬜ **Postventa**.

Hitos transversales ya cerrados:

- ✅ auditoría arquitectónica tras Ventas 9;
- ✅ Refactor A;
- ✅ Refactor B;
- ✅ Refactor C;
- ✅ Refactor D;
- ✅ Refactor E;
- ✅ ajuste UX del buscador de artículos.

---

## 9. Resumen de Ventas 1–9

### 9.1 Ventas 1 — Contexto operativo ✅

Ventas resuelve previamente el empleado activo, caja y contexto necesario para operar. La apertura de caja requerida por Ventas está implementada; el módulo Caja completo queda para su hito propio.

### 9.2 Ventas 2 — Venta en curso + workspace ✅

`VentasService` es propietario de las ventas abiertas.

`VentaEnCurso` representa negocio y `VentaWorkspaceState` representa continuidad de UI.

Se conserva:

- pestaña activa;
- líneas;
- foco;
- posición del total;
- estado de estadísticas del cliente;
- continuidad al salir y volver a `/ventas`.

### 9.3 Ventas 3 — Búsqueda de artículos ✅

Los artículos se consultan bajo demanda.

UX final:

- localizador + Enter añade artículo;
- búsqueda textual abre selector;
- clic en el **nombre** añade inmediatamente ese artículo y cierra;
- checks permiten seleccionar N artículos y añadirlos juntos.

### 9.4 Ventas 4 — Estructura visual ✅

Incluye:

- pestañas;
- creación/cambio/cierre de ventas;
- workspace;
- tabla de líneas;
- localizador;
- total flotante;
- continuidad visual.

### 9.5 Ventas 5 — Operaciones sobre líneas ✅

`VentaLineaEnCurso` concentra las reglas económicas.

Precedencia:

```text
1. Regalo → 0
2. Importe manual
3. Promoción
4. Descuento directo €
5. Descuento porcentual manual
6. Descuento cliente
7. PVP
```

Economía interna:

- microeuros para cálculos;
- entradas de usuario redondeadas a céntimos;
- porcentajes en puntos básicos.

### 9.6 Ventas 6 — Clientes ✅

`VentaEnCurso` tiene `cliente: Cliente | null`.

Se implementaron:

- selector;
- cambio/eliminación;
- descuento cliente por capas;
- alta rápida;
- documento de protección de datos;
- estadísticas rápidas y caché.

El documento de protección de datos es **interactivo** y sigue usando una ventana visible + `window.print()`. Esto es intencional y distinto de los tickets operativos del TPV.

### 9.7 Ventas 7 — Varios ✅

`0 + Intro` abre un editor para una línea libre real.

Una línea Varios:

```text
idArticulo       = null
articuloPublicId = null
localizador      = 0
marca            = "Varios"
pucMicros        = 0
```

IVA por defecto:

```text
21 % si existe
si no → IVA configurado más alto
```

Cada Varios es independiente.

### 9.8 Ventas 8 — Devoluciones ✅

Compatibilidad QR legacy:

```text
venta 123
QR    -123
```

La venta histórica se carga como devolución conservando economía histórica y límite de unidades devueltas.

Una devolución puede mezclarse con compras nuevas.

El total final puede ser positivo, negativo o cero.

### 9.9 Ventas 9 — Reservas ✅

Se implementaron:

- lectura/gestión de reservas;
- carga de reserva en `VentaEnCurso`;
- gestor;
- creación transaccional de reserva;
- disminución de stock;
- cancelación y restitución de stock.

Reglas relevantes:

- cliente obligatorio;
- no se crea una nueva reserva desde una venta procedente de reservas;
- no se permite reservar una venta con devoluciones;
- Varios puede formar parte de una reserva sin afectar stock;
- `reservasOrigen` se conserva aunque se eliminen visualmente líneas cargadas, porque Ventas 11 necesitará reconciliar el origen.

---

## 10. Auditoría transversal y Refactor A–E ✅

Después de Ventas 9 se auditó el estado completo de `main`.

Objetivos:

- extraer constantes y helpers dispersos;
- reducir duplicación real;
- agrupar utilidades por dominio;
- mejorar infraestructura SQLite;
- limpiar UI/bootstrap;
- evitar abstracciones genéricas prematuras.

Decisiones de arquitectura:

- utilidades Angular y backend separadas;
- no crear `shared` ejecutable salvo necesidad clara;
- no dividir `VentaLineaEnCurso` en strategies mientras siga siendo cohesiva;
- no dividir todavía `SaleWorkspaceComponent` antes de cerrar Ventas 12;
- no abstraer genéricamente todos los servicios `load/reload` mientras tengan comportamientos diferentes;
- `@osumi/tools` no condiciona la arquitectura del Client.

Todos los refactors A–E se completaron, probaron y subieron.

---

# 11. Ventas 10 — Finalización y pagos ✅

## 11.1 Objetivo

Ventas 10 separa claramente:

```text
VentaEnCurso
→ operación comercial viva

VentaFinalizacionEnCurso
→ liquidación temporal editable

VentaFinalizacionResultado
→ snapshot económico definitivo
```

La finalización temporal no modifica ni persiste una venta ordinaria por sí sola.

La persistencia real de una venta empieza en Ventas 11.

---

## 11.2 10A — Modelo de finalización y pagos ✅

### `VentaPagoEnCurso`

Representa un pago temporal:

- `tipoPago`;
- `tipoPagoPublicId`;
- `importeCents`;
- `entregadoCents`;
- `cambioCents`;
- `esEfectivo`.

Reglas:

- `importeCents !== 0`;
- enteros seguros;
- efectivo identificado por slug `efectivo`;
- pago no efectivo no admite `entregado`;
- devolución en efectivo no admite dinero entregado por el cliente;
- efectivo positivo admite `entregado >= importe`;
- `cambio = entregado - importe`.

### `VentaFinalizacionEnCurso`

Mantiene N pagos ordenados.

Invariantes:

- mismo tipo de pago como máximo una vez;
- suma de `importeCents` no puede superar el total;
- signo compatible con el total;
- venta positiva → pagos positivos;
- devolución neta → pagos negativos internamente;
- total cero → `pagos = []`;
- `completa` cuando `pendienteCents === 0`.

Operaciones:

- `addPago()`;
- `updatePago()`;
- `removePago()`.

Las actualizaciones inválidas son atómicas: no sustituyen el pago anterior.

---

## 11.3 10B — Interfaz genérica ✅

Se creó:

```text
src/app/modules/ventas/components/sale-finalization/
├── sale-finalization.component.ts
├── sale-finalization.component.html
└── sale-finalization.component.scss
```

Características:

- overlay;
- resumen Total / Pagado-Reembolsado / Pendiente;
- tipos de pago físicos ordenados por `orden`;
- selección rápida del pendiente completo;
- edición de importes;
- eliminación;
- selección del contenido del input al enfocarlo;
- cantidades visualmente positivas en devolución aunque internamente sean negativas;
- cancelación destruye el modelo temporal.

La finalización ya dispone de botón funcional para **Finalizar venta / devolución / operación** desde Ventas 11D. El modal produce `VentaFinalizacionResultado`, el workspace persiste la operación y solo tras el COMMIT emite `completedEvent`.

### Nota UX

El usuario ha expresado dudas sobre el aspecto final que está tomando el modal.

Decisión:

- no rediseñarlo en mitad del desarrollo;
- cerrar primero flujo, persistencia y salidas;
- reevaluar composición/jerarquía visual cuando la funcionalidad completa de venta esté dentro.

---

## 11.4 10C — Efectivo, cambio y reembolsos ✅

En efectivo positivo se distingue:

```text
importeCents
→ cantidad aplicada a la venta

entregadoCents
→ efectivo físico entregado por el cliente

cambioCents
→ entregado - aplicado
```

Ejemplo:

```text
Total venta:          60 €
VISA:                 30 €
Efectivo aplicado:    20 €
PayPal:               10 €
Efectivo entregado:   50 €
Cambio:               30 €
```

El resumen sigue mostrando:

```text
Pagado:    60 €
Pendiente:  0 €
Cambio:    30 €
```

Nunca se suman los 50 € entregados como si fueran importe de venta.

Si se modifica el importe aplicado de un pago en efectivo, el `entregado` se resetea al nuevo importe y el cambio vuelve a cero. Esto evita conservar accidentalmente un valor físico antiguo y generar un cambio ficticio.

### Reembolsos

Ejemplo:

```text
devolución histórica  -40 €
compra nueva           +15 €
total                  -25 €
```

La UI puede mostrar:

```text
Efectivo 10 €
VISA     15 €
```

pero internamente:

```text
-1000
-1500
```

Para una devolución no aparecen `Entregado` ni `Cambio`.

### Total cero

Una operación con total `0` se considera completa con `pagos = []`.

---

## 11.5 10D — Reserva desde finalización ✅

La reserva **no es un medio de pago**. Es una salida alternativa de la finalización.

Dos variantes:

```text
Reserva
→ persistir reserva
→ imprimir comprobante

Reserva sin ticket
→ persistir reserva
→ no imprimir
```

La persistencia de reservas ya existente se reutiliza mediante `ReservasService.createFromVenta()`.

Orden obligatorio:

```text
persistir reserva
→ stock actualizado
→ opcionalmente imprimir
→ cerrar operación
```

Nunca cerrar la venta antes de saber si la reserva se ha persistido.

### Elegibilidad

La UI explica por qué no se puede reservar, pero el mapper/backend sigue siendo la autoridad defensiva.

Bloqueos:

- sin cliente;
- venta con devolución;
- venta procedente de reservas;
- sin líneas;
- cantidades no positivas.

Los pagos temporales elegidos en el modal no afectan a una reserva.

---

## 11.6 Comprobante de reserva ✅

Se creó un builder HTML específico para un ticket de reserva.

Contenido:

- datos del negocio;
- número de reserva;
- fecha;
- cliente;
- líneas;
- cantidades;
- precio unitario;
- total;
- `PENDIENTE DE PAGO`;
- aviso de que no es ticket/factura de venta.

Los datos dinámicos se escapan con `escapeHtml()`.

El documento es **print-native** a 80 mm:

- no tiene toolbar;
- no tiene fondo de preview;
- no usa `100vh`;
- no contiene botones;
- sirve directamente para PDF o impresión térmica.

---

## 11.7 Infraestructura documental e impresión ✅

Ventas 10 introdujo un dominio backend `printing`.

### Contratos principales

```text
electron/contracts/printing/
├── printer.interface.ts
├── printing-settings.interface.ts
└── printing-api.interface.ts
```

Contratos backend:

```text
electron/backend/contracts/printing/
├── printer.provider.interface.ts
├── printing-settings.repository.interface.ts
└── html-document-renderer.interface.ts
```

### Configuración local

Repository:

```text
JsonPrintingSettingsRepository
```

Archivo:

```text
printing_settings.json
```

Escritura atómica mediante `.tmp` + `rename`.

### Listado de impresoras

`ElectronPrinterProvider` usa:

```text
webContents.getPrintersAsync()
```

Angular recibe:

- `deviceName`;
- `displayName`;
- `description`.

`deviceName` es el valor persistido y usado para impresión.

### Renderer oculto

`ElectronHtmlDocumentRenderer` crea una `BrowserWindow`:

```text
show: false
```

Seguridad:

- `nodeIntegration: false`;
- `contextIsolation: true`;
- `sandbox: true`;
- bloquea aperturas/navegaciones externas.

El HTML se carga mediante `data:text/html`.

La ventana se destruye siempre al terminar.

### HTML → PDF

El renderer mide la altura real del documento y ejecuta:

```text
webContents.printToPDF()
```

Resultado backend: `Buffer`.

Contrato IPC: `Uint8Array`.

El motor PDF está probado desde DevTools y genera un PDF real `%PDF-`.

### Impresión silenciosa

Se utiliza:

```text
webContents.print({
  silent: true,
  deviceName,
  ...
})
```

El usuario:

- no ve diálogo;
- no elige impresora;
- no ve ventana auxiliar;
- no tiene que cerrar nada.

La impresora se resuelve desde `printing_settings.json`.

### Error de impresora

`PrintingService.printTicket()` distingue:

- no hay impresora configurada;
- la impresora configurada ya no está disponible;
- fallo del trabajo de impresión.

Estos errores **no invalidan una reserva/venta ya persistida**.

---

## 11.8 Dos caminos de impresión distintos

Debe mantenerse esta separación:

### Documentos interactivos

Ejemplo: protección de datos del cliente.

```text
HTML
→ ventana visible
→ window.print()
→ usuario decide impresora
```

Infraestructura:

```text
printHtmlDocument()
```

### Documentos operativos TPV

Ejemplo: reserva / futuro ticket de venta.

```text
HTML
→ Electron oculto
→ impresión silenciosa
```

Infraestructura:

```text
window.osumiDesktop.printing.printTicket()
```

No reemplazar el primer modelo por el segundo indiscriminadamente.

---

## 11.9 PDF histórico — decisión preparada, no completada

La infraestructura `renderPdf()` existe y está probada.

Sin embargo, una reserva no genera un PDF para descartarlo inmediatamente.

Para ventas ordinarias se quiere que el PDF se convierta en un **artefacto histórico definitivo**:

```text
venta persistida
→ ID definitivo
→ ticket definitivo
→ PDF
→ almacenar
```

Motivos:

- email desde finalización;
- email desde histórico;
- reimpresión;
- conservar exactamente el documento original aunque cambien más adelante logo, datos o plantilla.

No regenerar años después un ticket histórico usando una plantilla nueva si ya puede conservarse el original.

La integración concreta del PDF histórico se está cerrando en **Ventas 11E**. La reutilización postventa del PDF quedará para Ventas 12.

---

## 11.10 Error de impresión y cierre ✅

Semántica fijada:

```text
FALLA PERSISTENCIA
→ operación NO terminada
→ venta sigue abierta
→ no imprimir
```

```text
PERSISTENCIA OK + IMPRESIÓN OK
→ operación terminada
→ cerrar
→ nueva venta
```

```text
PERSISTENCIA OK + IMPRESIÓN FALLA
→ operación YA terminada
→ mostrar aviso
→ después cerrar
→ nueva venta
```

El error IPC técnico:

```text
Error invoking remote method 'printing:print-ticket': Error: ...
```

se normaliza en `getErrorMessage()` para que el usuario vea solo el mensaje funcional.

Ejemplo final:

> **Reserva creada**  
> La reserva se ha creado correctamente, pero no se ha podido imprimir el comprobante. No hay una impresora de tickets configurada.

El `completedEvent` se emite después de aceptar el aviso para que la nueva venta recupere correctamente el foco.

---

## 11.11 Operación completada vs cerrar pestaña ✅

Regla funcional crítica:

```text
OPERACIÓN COMPLETADA
(venta / reserva / devolución)
→ cerrar esa operación
→ crear UNA nueva venta vacía
→ dejarla activa
```

Pero:

```text
CERRAR/CANCELAR MANUALMENTE UNA PESTAÑA
→ cerrar la pestaña
→ NO crear otra
```

Motivo:

una venta puede abrirse como pestaña auxiliar para consultar precios. Debe poder cerrarse sin que nazca otra automáticamente.

Implementación:

```text
completedEvent
→ SalesComponent.completeVenta()
→ cerrarVenta()
→ nuevaVenta()
```

El cierre manual sigue usando un camino distinto.

Con varias pestañas:

```text
Venta A
Venta B  ← se completa
Venta C auxiliar
```

resultado:

```text
Venta A
Venta C
Venta D nueva y activa
```

Cerrar manualmente C no crea E.

---

## 11.12 Foco tras completar operación ✅

La aplicación debe quedar inmediatamente preparada para el siguiente cliente.

Después de completar una operación:

- se crea nueva venta;
- queda activa;
- el foco termina en el localizador.

Si hay un aviso de impresión, la creación de la siguiente venta se retrasa hasta que el usuario acepte ese aviso para que el diálogo no robe el foco.

---

## 11.13 `VentaFinalizacionResultado` ✅

Se introdujo un snapshot económico independiente de los modelos temporales.

Archivo:

```text
src/app/model/ventas/venta-finalizacion-resultado.interface.ts
```

Exporta **dos tipos nombrados**:

- `VentaPagoFinalizado`;
- `VentaFinalizacionResultado`.

No hay `default` porque el archivo exporta más de un elemento.

Contrato conceptual:

```text
VentaFinalizacionResultado
├── totalCents
└── pagos[]
    ├── tipoPagoPublicId
    ├── importeCents
    ├── entregadoCents
    └── cambioCents
```

No transporta:

- `TipoPago` completo;
- `slug`;
- `afectaCaja`;
- `fisico`;
- otros datos que el backend puede resolver autoritativamente.

### `toResultado()`

`VentaFinalizacionEnCurso.toResultado()`:

- exige que la liquidación esté completa;
- conserva signos negativos de reembolsos;
- devuelve `pagos: []` para total cero;
- crea un snapshot independiente;
- no conserva referencias mutables a los pagos temporales.

Este resultado es la entrada económica efectiva de la persistencia implementada en Ventas 11.

---

## 11.14 Campos de `venta_pago` aún sin semántica de UI

El esquema ya contiene:

- `importe_cents`;
- `entregado_cents`;
- `cambio_cents`;
- `saldo_resultante_cents`;
- `referencia`;
- `orden`.

Ventas 10 ha fijado semántica para:

- `importe_cents`;
- `entregado_cents`;
- `cambio_cents`;
- `orden`.

No inventar todavía uso para:

- `saldo_resultante_cents`;
- `referencia`.

Se definirán cuando exista un caso funcional real.

---

## 11.15 Regresión de Ventas 10 ✅

Se verificaron:

- venta positiva;
- pagos múltiples;
- no sobrepago en medios no efectivos;
- efectivo entregado/cambio;
- cambio separado del total pagado;
- reembolso neto;
- varios medios en devolución;
- total cero;
- cancelar y reabrir finalización;
- reserva;
- reserva sin ticket;
- bloqueos de reserva;
- stock;
- Varios en reserva;
- impresión sin impresora;
- impresora configurada pero desaparecida;
- mensajes de error legibles;
- operación completada vs cierre manual;
- creación automática de nueva venta;
- foco en localizador;
- snapshot `toResultado()`.

Batería técnica:

```bash
npm test
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```

pasa al cierre del bloque.

---

# 12. Ventas 11 — Persistencia transaccional 🟦 EN CURSO

## 12.1 Estado actual del bloque

```text
✅ 11A — Análisis y diseño de la transacción

✅ 11B — Contratos + mapper de GuardarVenta
   ✅ 11B.1 — GuardarVentaCommand
   ✅ 11B.2 — Snapshot persistente del descuento
   ✅ 11B.3 — Mapper VentaEnCurso + finalización
   ✅ 11B.4 — Tests completos del mapper
   ✅ 11B.5 — Esquema SQLite de trazabilidad

✅ 11C — Caso de uso backend + transacción SQLite
   ✅ 11C.1 — Contratos internos
   ✅ 11C.2 — Validación y normalización backend
   ✅ 11C.3 — Venta + numeración + líneas + pagos
   ✅ 11C.4 — Stock + histórico + devoluciones + reservas
   ✅ 11C.5 — Acumulados de caja
   ✅ 11C.6 — Regresión transaccional

✅ 11D — IPC + Angular + Finalizar venta
   ✅ 11D.1 — Composition root + IPC backend
   ✅ 11D.2 — Preload + Desktop API
   ✅ 11D.3 — Servicio Angular de persistencia
   ✅ 11D.4 — Integración con Finalizar venta
   ✅ 11D.5 — Prueba manual end-to-end

🟦 11E — Ticket definitivo + QR + PDF + impresión
   ✅ 11E.1 — Snapshot persistido del ticket
   🟦 11E.2 — Exposición IPC + servicio Angular
   ⬜ 11E.3 — QR local + documento HTML de 80 mm
   ⬜ 11E.4 — PDF + impresión silenciosa
   ⬜ 11E.5 — Orquestación post-COMMIT y errores no bloqueantes
   ⬜ 11E.6 — Prueba física y regresión

⬜ 11F — Regresión completa + cierre
```

El bloque ya ha superado la parte crítica de persistencia y conexión end-to-end. El trabajo actual no debe reabrir la transacción salvo que aparezca una regresión real: ahora el foco está en construir el documento definitivo **a partir de la venta ya persistida** y ejecutar los postprocesos después del COMMIT.

---

## 12.2 11A — Diseño de la transacción ✅

Se revisaron el esquema actual, repositories y flujo legacy de `SaveVenta`. La implementación nueva no replica la arquitectura antigua; conserva únicamente su comportamiento funcional relevante.

Principio de la operación:

```text
validar comando
→ BEGIN TRANSACTION
→ numerar
→ venta
→ líneas
→ pagos
→ stock / histórico
→ devoluciones
→ reservas
→ caja
→ COMMIT
```

Cualquier fallo antes del commit implica **ROLLBACK completo**. QR, PDF, impresión y demás salidas documentales ocurren siempre después.

Decisiones principales:

- el backend trata el payload Angular como no confiable y revalida todos los datos autoritativos;
- `cajaPublicId` representa la caja concreta con la que se inició la operación, y debe seguir abierta;
- la numeración usa `secuencia_documento`, no `MAX(numero)+1` como mecanismo principal;
- la secuencia se sincroniza con el máximo histórico importado para convivir con datos legacy;
- `VentaEnCurso.idTemporal` se utiliza como `venta.public_id` e idempotency key;
- un reintento después de un COMMIT ya realizado devuelve la misma venta sin repetir stock, caja, pagos ni histórico;
- la persistencia de una venta procedente de reserva **no** llama a `ReservasRepository.deleteReserva()`, porque esa operación tiene otra semántica y su propia transacción;
- TicketBAI queda fuera de la transacción comercial de este bloque.

---

## 12.3 11B — Contratos, mapper y trazabilidad ✅

### `GuardarVentaCommand`

Archivo:

```text
electron/contracts/ventas/guardar-venta-command.interface.ts
```

Contiene tres exports nombrados:

- `GuardarVentaPagoCommand`;
- `GuardarVentaLineaCommand`;
- `GuardarVentaCommand`.

Transporta `publicId` públicos, nunca IDs internos de SQLite. Incluye caja, empleado, cliente, venta origen de devolución, reservas origen, total, líneas y pagos.

### Snapshot de descuento

Archivo:

```text
src/app/model/ventas/venta-linea-descuento-snapshot.ts
```

Las líneas ordinarias persisten una representación inequívoca del descuento. Las líneas históricas procedentes de reserva/devolución pueden conservar simultáneamente porcentaje e importe económico histórico.

### Mapper

Archivo:

```text
src/app/model/ventas/guardar-venta-command.mapper.ts
```

Convierte:

```text
VentaEnCurso
+
VentaFinalizacionResultado
+
cajaPublicId
→
GuardarVentaCommand
```

Casos cubiertos por tests:

- artículo normal + Varios + pagos múltiples;
- total cero sin pagos;
- reserva histórica con cantidad modificada;
- línea reservada eliminada visualmente;
- devoluciones parciales sucesivas;
- caja vacía;
- empleado/cliente no persistidos;
- venta sin líneas;
- snapshot de finalización desactualizado.

### Trazabilidad SQLite

El esquema canónico se amplió directamente —sin migraciones— con:

```text
venta.id_venta_origen_devolucion

linea_venta.id_linea_venta_origen_devolucion
linea_venta.id_linea_reserva_origen

venta_reserva(id_venta, id_reserva)
```

`linea_venta` impide que una línea sea simultáneamente devolución y reserva. `venta_reserva` permite varias reservas por venta y `UNIQUE(id_reserva)` impide consumir una misma reserva desde dos ventas.

### Regla de esquema durante desarrollo pre-release

El proyecto todavía no tiene usuarios ni versiones distribuidas. Por decisión explícita del usuario:

- **no crear migraciones de esquema durante esta fase greenfield**;
- modificar directamente el esquema canónico;
- recrear la base de desarrollo cuando sea necesario;
- mantener `DATABASE_SCHEMA_VERSION = 1` mientras esta sea la primera versión no publicada;
- introducir una estrategia de migraciones cuando exista una versión distribuida que deba actualizarse.

Se borró la carpeta de datos local y se realizó una instalación completa nueva importando el `.otpv` real. La creación del nuevo esquema y la importación legacy terminaron correctamente.

---

## 12.4 11C — Transacción SQLite real ✅

### Frontera de aplicación

Angular construye `GuardarVentaCommand`. El backend lo normaliza en `VentasPersistenciaService` y genera `GuardarVentaRecordCommand`.

El repository:

```text
electron/infrastructure/database/typeorm/
typeorm-ventas-persistencia.repository.ts
```

posee la unidad transaccional completa mediante `runDataSourceTransaction()`.

### Resoluciones autoritativas

Dentro de la transacción se resuelven y validan:

- caja concreta aún abierta;
- empleado activo;
- cliente existente si lo hay;
- venta origen de devolución;
- línea exacta origen de devolución;
- reservas y cliente propietario;
- líneas concretas de reserva;
- artículos;
- tipos de pago activos/físicos;
- semántica de efectivo mediante `tipo_pago.slug`;
- `afecta_caja` desde SQLite.

No se confía en que Angular indique qué pago es efectivo ni qué tipos afectan caja.

### Numeración

`secuencia_documento` se inicializa/sincroniza con el `MAX(numero)` histórico de `venta` antes de incrementar. Esto permite continuar correctamente tras importar un `.otpv` antiguo aunque la tabla de secuencia no estuviera inicializada por el legacy.

La secuencia se actualiza dentro de la misma transacción: si falla posteriormente stock/caja/reserva, también vuelve atrás.

### Idempotencia

Antes de crear efectos se busca `venta.public_id = command.publicId`.

- si ya existe con el mismo total, se devuelve la venta persistida;
- no se repiten líneas, pagos, stock, histórico ni caja;
- si existe el mismo `publicId` con otro total, se rechaza por inconsistencia.

---

## 12.5 Stock, histórico, devoluciones y reservas ✅

Convención única:

```text
stockFinal = stockPrevio - diferencia
```

Ejemplos:

```text
venta 3 unidades          diferencia =  3 → stock -3
devolución 2 unidades     diferencia = -2 → stock +2
reserva 5 → vende 3       diferencia = -2 → stock +2
reserva 5 → vende 7       diferencia =  2 → stock -2
reserva 5 → vende 5       diferencia =  0 → stock igual
```

Cada movimiento de artículo genera `historico_articulo` con tipo de venta `1`, stock previo/final, diferencia, venta y precios históricos.

### Devoluciones

La devolución utiliza la **línea histórica exacta**, no `venta + artículo`.

`unidades_devueltas` se acumula:

```text
original 4
ya devueltas 1
nueva devolución 2
→ acumulado 3
```

Si una nueva devolución supera las unidades originales, falla toda la transacción.

El movimiento de stock usa los precios históricos de la línea original.

### Reservas

Las reservas ya descontaron stock al crearse. Al venderlas se reconcilia:

```text
diferencia = unidadesFinales - unidadesReservadas
```

Se recorren **todas las líneas originales de la reserva**, incluso las eliminadas visualmente de la venta. Una línea reservada eliminada equivale a `unidadesFinales = 0` y restaura completamente el stock inmovilizado.

La cabecera de reserva queda con borrado lógico después de la reconciliación; sus líneas se conservan como histórico. `venta_reserva` deja constancia de qué venta la consumió.

---

## 12.6 Caja y pagos ✅

Acumulados implementados:

```text
caja.ventas_cents
caja.beneficios_cents
caja.descuentos_cents
caja.importe_cierre_teorico_cents

caja_tipo.operaciones
caja_tipo.importe_total_cents
caja_tipo.importe_descuento_cents
```

Reglas:

- `ventas_cents += totalCents` firmado;
- beneficio = importe final de línea - coste firmado;
- descuentos se acumulan con signo;
- solo tipos con `afecta_caja = 1` modifican el cierre teórico;
- para efectivo se usa el **importe aplicado**, nunca el dinero entregado;
- `importe_real_cents` no se toca durante ventas: pertenece al recuento/cierre físico;
- cada tipo utilizado incrementa una operación;
- en pago mixto, el descuento se distribuye proporcionalmente según `abs(importeCents)` y el último pago absorbe el residual de redondeo.

---

## 12.7 Tests backend y regresión transaccional ✅

Se añadió un runner Vitest específico para Electron/backend:

```text
electron/vitest.config.ts
scripts/test-electron.mjs
```

Scripts:

```bash
npm run test:electron
npm run test:electron:vitest
```

`better-sqlite3` es un addon nativo y Electron/Node utilizan ABIs diferentes. El wrapper público `test:electron` hace:

```text
rebuild better-sqlite3 para Node
→ ejecutar Vitest
→ finally
→ electron-rebuild para Electron
```

En npm 12 fue necesario aprobar explícitamente el script de instalación:

```json
"allowScripts": {
  "better-sqlite3@12.11.1": true
}
```

No usar `test:electron:vitest` como comando habitual sin saber en qué ABI está compilado `better-sqlite3`; el comando seguro es `npm run test:electron`.

La regresión real usa archivos SQLite temporales, no mocks. Cubre:

- venta normal completa;
- stock/histórico;
- caja y reparto de descuento;
- idempotencia;
- rollback provocado al final de la transacción;
- devolución parcial acumulativa y exceso rechazado;
- reserva con cantidad reducida y línea eliminada;
- total cero/regalo sin pagos;
- snapshot persistido del ticket añadido en 11E.1.

Tras 11E.1 la suite backend contiene **7 tests** y el usuario confirmó que pasan. Al final del runner aparece `Rebuild Complete` y la aplicación Electron arranca correctamente después.

Batería habitual desde este punto:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```

---

## 12.8 11D — Wiring completo y prueba end-to-end ✅

Se añadió el resultado público:

```text
GuardarVentaResult
├── id
├── publicId
├── serie
├── numero
├── totalCents
└── fecha
```

El `id` numérico se expone deliberadamente porque el QR compatible con devoluciones será `-id`.

Flujo final implementado:

```text
SaleFinalizationComponent
→ VentaFinalizacionResultado
→ SaleWorkspaceComponent
→ VentasPersistenciaService Angular
→ window.osumiDesktop.ventas.save()
→ preload
→ IPC ventas:save
→ VentasPersistenciaService backend
→ TypeOrmVentasPersistenciaRepository
→ COMMIT
→ completedEvent
→ SalesComponent.completeVenta()
→ cerrar venta terminada
→ crear UNA nueva venta vacía
→ foco al localizador
```

`SaleFinalizationComponent` bloquea mutaciones/cierre mientras se persiste.

Un fallo antes del COMMIT mantiene la venta abierta y permite reintento. Un postproceso posterior nunca debe convertir una venta ya confirmada en una venta pendiente.

Si la venta procedía de reservas, `ReservasService.reload()` fuerza una lectura realmente posterior al COMMIT para eliminar del cache las reservas consumidas.

### Pruebas manuales end-to-end completadas

El usuario confirmó correctamente desde la interfaz:

- venta normal en efectivo;
- pago mixto;
- total cero;
- devolución parcial real;
- venta procedente de reserva;
- cierre de la operación terminada;
- creación de una única nueva venta;
- continuidad de foco;
- efectos reales sobre SQLite.

Con esto 11D se considera cerrado.

---

## 12.9 11E — Ticket definitivo + QR + PDF + impresión 🟦

Principio fijado:

> El ticket definitivo **no se construye desde `VentaEnCurso`**. Después del COMMIT se utiliza `GuardarVentaResult.id` para volver a leer de SQLite la venta realmente persistida y construir un snapshot documental autoritativo.

Esto evita que el ticket dependa de un modelo mutable que va a desaparecer y garantiza número, fecha, líneas y pagos exactamente persistidos.

### 11E.1 — Snapshot persistido del ticket ✅

Contratos creados:

```text
electron/contracts/ventas/venta-ticket.interface.ts
electron/backend/domain/ventas/venta-ticket-record.interface.ts
electron/backend/contracts/ventas/ventas-tickets.repository.interface.ts
```

Servicio/backend:

```text
electron/backend/application/ventas/ventas-tickets.service.ts
electron/infrastructure/database/typeorm/typeorm-ventas-tickets.repository.ts
```

`VentaTicketInterface` contiene únicamente datos necesarios para el documento:

```text
id / publicId
serie / numero
fecha
empleadoNombre
clienteNombre
totalCents
pagos[]
  nombre
  importeCents
  entregadoCents
  cambioCents
lineas[]
  nombre
  pvpMicros
  ivaBps
  importeMicros
  descuentoBps
  importeDescuentoMicros
  unidades
  regalo
```

No incluye stock, PUC ni trazabilidad de reserva/devolución porque no son datos de impresión.

`TypeOrmVentasTicketsRepository.findByVentaId()` relee:

- cabecera de `venta`;
- empleado;
- cliente opcional;
- líneas persistidas ordenadas;
- pagos persistidos ordenados con `entregado` y `cambio`.

Se añadió un séptimo test backend que persiste una venta real y comprueba que el snapshot documental recuperado coincide exactamente con lo almacenado.

### 11E.2 — Siguiente paso exacto 🟦

Hay que exponer el snapshot de extremo a extremo:

```text
VentasTicketsService backend
→ composition root
→ IPC ventas:get-ticket
→ preload / VentasApi
→ servicio Angular de ticket
```

Después de 11E.2, tras `save()` Angular tendrá:

```text
GuardarVentaResult.id
→ getTicket(id)
→ VentaTicketInterface persistido
```

y se podrá entrar en 11E.3.

### 11E.3–11E.6 pendientes

11E.3:

- generar QR local con contenido exacto `-${ticket.id}`;
- construir HTML print-native de 80 mm;
- líneas, cantidades, PVP, descuentos, regalos, cliente, empleado, pagos, entregado, cambio y desglose de IVA;
- escapar todo texto dinámico.

11E.4:

- `renderPdf()` usando la infraestructura Electron oculta ya existente;
- conservar/decidir almacenamiento del PDF histórico;
- impresión silenciosa mediante la impresora configurada.

11E.5:

- orquestación estrictamente post-COMMIT;
- error de PDF/impresión no revierte la venta;
- aviso funcional y cierre posterior;
- evitar cualquier posibilidad de repetir la persistencia.

11E.6:

- regresión funcional;
- cuando haya hardware disponible, validar Star TSP100/TSP143, papel 80 mm, márgenes, longitud y corte.

---

## 12.10 PDF histórico y Postventa

La infraestructura `printing.renderPdf()` ya existe y funciona. Para ventas, el PDF debe ser un artefacto histórico real, no un buffer generado y descartado.

Objetivo conceptual:

```text
COMMIT venta
→ snapshot persistido
→ ticket definitivo
→ PDF definitivo
→ almacenar
→ imprimir / email / reimpresión futura
```

Motivos:

- reimpresión exacta;
- envío por email desde finalización o histórico;
- no regenerar años después un ticket con logos/datos/plantillas nuevas.

La creación/almacenamiento inicial se resolverá en 11E; la explotación del PDF desde histórico/postventa pertenece a Ventas 12.

---

## 12.11 TicketBAI / TicketBaiWS

Existe la librería propia publicada:

```text
@osumi/ticketbaiws
```

- npm: `@osumi/ticketbaiws`;
- GitHub: `osumionline/ticketbaiws`.

Reglas:

- reutilizarla cuando llegue la integración fiscal;
- no crear cliente HTTP ad hoc en el Client;
- no contaminar 11E con TicketBAI salvo que sea imprescindible para el ticket comercial;
- revisar la respuesta/documentación de Berein y posibles cambios del SDK al retomar el bloque fiscal.

---

## 12.12 Estadísticas de cliente — recordatorio

Tras persistir una venta real debe revisarse antes de cerrar Ventas 11 si la caché de estadísticas del cliente necesita invalidación/recarga. No olvidar este punto en **11F**.

---

# 13. Ventas 12 — Postventa ⬜

Pendiente.

Debe incluir/revisar:

- histórico de ventas;
- reimpresión;
- envío de ticket por email;
- reutilización del PDF histórico;
- facturación;
- TicketBAI/TicketBaiWS;
- otras acciones posteriores a una venta ya persistida.

En el TPV antiguo, el email adjuntaba el PDF del ticket. Esa capacidad debe recuperarse reutilizando el documento histórico de la venta.

---

# 14. Infraestructura de impresión — resumen de diseño

Modelo final:

```text
Angular
→ HTML ya construido
→ Printing API IPC
→ PrintingService backend
→ ElectronHtmlDocumentRenderer
```

Operaciones disponibles:

```text
getPrinters()
getSettings()
setTicketPrinterDeviceName()
renderPdf()
printTicket()
```

La impresora configurada:

- es opcional;
- es local del equipo;
- no bloquea la persistencia;
- no pertenece al `.otpv`.

Si no existe impresora configurada:

```text
venta/reserva puede quedar persistida
→ impresión falla
→ aviso
```

Nunca:

```text
sin impresora
→ rollback de operación ya guardada
```

---

# 15. Decisiones de UX pendientes

## 15.1 Modal de Finalizar

Funcionalmente está validado, pero existe una duda estética sobre la composición general.

No modificar todavía por impulso.

La confirmación y persistencia reales ya están presentes desde 11D. No rediseñar todavía en mitad de 11E. Revisarlo al cerrar 11E/11F, cuando estén presentes también el ticket definitivo, los errores de impresión y las salidas post-COMMIT. Entonces decidir si se simplifica, reorganiza por pasos, separa liquidación y acciones alternativas o cambia la jerarquía visual.

## 15.2 Impresora en configuración

Pendiente de UI.

Debe ser un apartado pequeño integrado en la pantalla/zona existente de configuración/instalación, no un módulo independiente.

---

# 16. Ajustes transversales relevantes

## 16.1 Menú de Electron

Menú superior eliminado.

DevTools en desarrollo se recuperó mediante:

- `Ctrl + Shift + I`;
- `F12`.

Solo cuando `!app.isPackaged`.

## 16.2 Foco

El TPV prioriza continuidad operativa.

Al terminar interacciones debe restaurarse foco explícitamente.

Especialmente:

```text
operación completada
→ nueva venta
→ localizador
```

## 16.3 Accesibilidad

- no `autofocus` HTML;
- backdrops interactivos como botones reales;
- overlays con foco controlado;
- cumplir `click-events-have-key-events` y reglas relacionadas.

## 16.4 Errores IPC

`getErrorMessage()` elimina el prefijo técnico de Electron:

```text
Error invoking remote method '...': Error:
```

para mostrar al usuario únicamente el mensaje funcional.

---

# 17. Método de trabajo obligatorio por bloque

Para cada fase, bloque o subapartado:

1. mostrar el **listado completo** del bloque actual;
2. marcar qué está completado;
3. indicar exactamente dónde estamos;
4. indicar todo lo que queda;
5. explicar en uno o dos párrafos qué resuelve el apartado actual;
6. revisar el código actual antes de proponer cambios;
7. inventariar el comportamiento legacy cuando sea relevante;
8. separar comportamiento que se conserva de deuda técnica que no debe trasladarse;
9. definir contratos/responsabilidades;
10. implementar en pasos pequeños verificables;
11. probar;
12. no avanzar hasta confirmación del usuario;
13. tras cada bloque principal, actualizar este documento.

> No asumir que la implementación antigua es el diseño correcto. Debe utilizarse como fuente funcional, no como arquitectura obligatoria.

---

# 18. Protocolo para cambios de código

- Archivo nuevo: completo.
- Archivo existente: ruta exacta y punto de inserción/reemplazo.
- Si un cambio es amplio y el archivo puede haberse movido, revisar primero `main`.
- Mantener tipado explícito.
- No usar `any`.
- Respetar reglas de exports:
  - un único export → puede ser `default`;
  - varios exports → todos nombrados.
- Líneas en blanco solo para separar conceptos/bloques lógicos.
- No fragmentar objetos con espacios verticales entre propiedades relacionadas.
- Mantener Angular y Electron/backend separados.
- `npm test` es finito (`ng test --watch=false`).
- `npm run test:watch` es interactivo.
- `npm run test:electron` ejecuta la suite backend contra SQLite real y gestiona automáticamente el ABI Node/Electron de `better-sqlite3`.
- No usar `test:electron:vitest` como comando habitual salvo que se haya preparado manualmente `better-sqlite3` para Node.

Batería habitual:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Si se toca Electron/backend, contratos desktop, preload, IPC o empaquetado:

```bash
npm run build:desktop
```

El usuario suele aplicar los cambios, probar manualmente, ejecutar batería, subir al repositorio y confirmar antes de continuar.

---

# 19. Fuentes de información

Fuente principal: código actual de:

- `osumionline/Osumi-TPV`;
- `osumionline/TPV-API`;
- `osumionline/Osumi-TPV-Client`.

También:

- este documento;
- explicación funcional del usuario;
- capturas;
- datos importados reales;
- decisiones tomadas durante el desarrollo;
- documentación de `@osumi/ticketbaiws` cuando llegue TicketBAI.

---

# 20. Registro de hitos

| Versión | Fecha | Hito |
| --- | --- | --- |
| 1.0 | 6 de agosto de 2026 | Installation e importación legacy completadas. Inicio del traspaso modular. |
| 1.1 | 9 de agosto de 2026 | Startup completado: arranque, conexión SQLite, assets y precarga global. |
| 1.2 | 13 de agosto de 2026 | Ventas 1–6 completados. |
| 1.3 | 13 de agosto de 2026 | Ventas 7 — Varios completado. |
| 1.4 | 14 de agosto de 2026 | Ventas 8 — Devoluciones completado. |
| 1.5 / 1.6 | 15 de agosto de 2026 | Ventas 9 — Reservas completado y documentado. |
| 1.7 / 1.8 | 16–18 de agosto de 2026 | Auditoría transversal y avance del refactor A–E. |
| 1.9 | 19 de agosto de 2026 | Refactor A–E completo + ajuste UX del buscador. Siguiente: Ventas 10. |
| 2.0 | 20 de agosto de 2026 | Ventas 10 — Finalización y pagos completado. Pagos múltiples, efectivo/cambio, reembolsos, reserva con/sin ticket, configuración local de impresora, PDF, impresión silenciosa, errores de impresión, nueva venta automática y snapshot definitivo. Siguiente: Ventas 11 — Persistencia transaccional. |
| **2.1** | **21 de agosto de 2026** | **Ventas 11A–11D completados: transacción SQLite real, trazabilidad de devoluciones/reservas, stock/histórico/caja, idempotencia, runner backend con SQLite real y wiring end-to-end hasta Angular. 11E.1 completado: snapshot persistido del ticket. Siguiente: 11E.2 — exposición IPC + servicio Angular del ticket.** |

---

# 21. Próximo paso

El siguiente subapartado es:

# Ventas 11E.2 — Exposición IPC + servicio Angular del ticket

Estado de entrada:

```text
Venta transaccional real                  ✅
GuardarVentaResult con ID definitivo      ✅
IPC save de venta                         ✅
Finalizar venta desde Angular             ✅
Pruebas manuales end-to-end               ✅
Snapshot persistido VentaTicketInterface  ✅
Lectura TypeORM del ticket                ✅
Test backend del snapshot                 ✅

IPC getTicket                             ⬜
Preload / VentasApi getTicket             ⬜
Servicio Angular de ticket                ⬜
QR -id                                    ⬜
HTML 80 mm                                ⬜
PDF histórico                             ⬜
Impresión del ticket de venta             ⬜
```

Tarea inmediata:

1. revisar `main` actual;
2. registrar `VentasTicketsService` y `TypeOrmVentasTicketsRepository` en el composition root;
3. añadir canal `ventas:get-ticket`;
4. añadir handler IPC;
5. ampliar `VentasApi`;
6. ampliar `preload.ts`;
7. crear servicio Angular que recupere `VentaTicketInterface` por `idVenta`;
8. ejecutar batería completa;
9. no generar todavía QR/HTML hasta cerrar 11E.2.

No comenzar Ventas 12 ni reabrir la transacción de 11C salvo que aparezca una regresión demostrable.

---

# 22. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” versión 2.1 como contexto principal.

Installation + importación legacy y Startup están completados y probados. También están cerrados la auditoría transversal, Refactor A–E y el ajuste UX del buscador.

En Ventas están completados los bloques 1–10.

Ventas 11 está EN CURSO con este estado:

✅ 11A — Análisis y diseño de la transacción.
✅ 11B — Contratos + mapper de GuardarVenta + trazabilidad SQLite.
✅ 11C — Caso de uso backend + transacción SQLite completa.
✅ 11D — IPC + Angular + Finalizar venta + prueba manual end-to-end.
🟦 11E — Ticket definitivo + QR + PDF + impresión.
   ✅ 11E.1 — Snapshot persistido del ticket.
   🟦 11E.2 — Exposición IPC + servicio Angular.
   ⬜ 11E.3 — QR local + HTML 80 mm.
   ⬜ 11E.4 — PDF + impresión silenciosa.
   ⬜ 11E.5 — Post-COMMIT y errores no bloqueantes.
   ⬜ 11E.6 — Prueba física y regresión.
⬜ 11F — Regresión completa + cierre.
⬜ 12 — Postventa.

Decisiones críticas de Ventas 11:
- una venta se guarda en una única transacción SQLite: venta, líneas, pagos, stock, histórico, devolución, reserva y caja;
- cualquier fallo anterior al COMMIT hace rollback;
- QR/PDF/impresión son post-COMMIT y nunca revierten una venta guardada;
- VentaEnCurso.idTemporal es la idempotency key / venta.public_id;
- secuencia_documento se sincroniza con ventas legacy y se incrementa dentro de la transacción;
- devoluciones referencian venta y línea origen exactas y acumulan unidades_devueltas;
- reservas se reconcilian por diferencia y se conservan en venta_reserva;
- caja usa total/beneficio/descuento firmados y solo afecta cierre teórico según tipo_pago.afecta_caja;
- el descuento de pagos mixtos se reparte proporcionalmente y el último absorbe redondeo;
- no usar migraciones de esquema mientras la aplicación siga pre-release greenfield; DATABASE_SCHEMA_VERSION sigue en 1 y se recrea la DB de desarrollo cuando cambia el esquema.

Tests backend:
- existe npm run test:electron;
- usa Vitest + SQLite real;
- scripts/test-electron.mjs recompila better-sqlite3 para Node, ejecuta tests y en finally lo reconstruye para Electron;
- package.json contiene allowScripts para better-sqlite3@12.11.1;
- tras 11E.1 hay 7 tests backend pasando;
- la aplicación arranca correctamente después del runner.

11D está validado manualmente desde la UI con venta normal, pago mixto, total cero, devolución parcial y venta procedente de reserva. Tras COMMIT se cierra la operación, se crea UNA nueva venta vacía y vuelve el foco al localizador.

11E.1 creó:
- electron/contracts/ventas/venta-ticket.interface.ts
- electron/backend/domain/ventas/venta-ticket-record.interface.ts
- electron/backend/contracts/ventas/ventas-tickets.repository.interface.ts
- electron/backend/application/ventas/ventas-tickets.service.ts
- electron/infrastructure/database/typeorm/typeorm-ventas-tickets.repository.ts

El ticket definitivo NO debe construirse desde VentaEnCurso. Debe releerse desde SQLite usando GuardarVentaResult.id. El snapshot contiene cabecera definitiva, empleado, cliente, líneas y pagos persistidos.

El siguiente paso exacto es 11E.2:
VentasTicketsService backend → composition root → IPC ventas:get-ticket → preload/VentasApi → servicio Angular.
No generar todavía QR ni HTML hasta cerrar este subapartado.

Después, 11E.3 debe generar el QR compatible con devoluciones: venta id 123 → contenido QR “-123”, y construir el documento print-native de 80 mm.

La infraestructura printing ya existe desde Ventas 10: renderer Electron oculto, renderPdf() e impresión silenciosa. La impresora local es opcional. La validación física con Star TSP100/TSP143 y papel 80 mm sigue pendiente y no bloquea el desarrollo.

Para TicketBAI/TicketBaiWS reutilizar @osumi/ticketbaiws cuando llegue fiscal/postventa; no crear un cliente HTTP ad hoc.

Antes de cada fase/bloque/subapartado:
1. dame el listado completo;
2. marca lo completado;
3. indica dónde estamos;
4. indica todo lo pendiente;
5. explica brevemente el apartado actual.

Antes de modificar archivos existentes consulta siempre su versión actual en main. Si GitHub Raw parece cacheado, usa cache-busting.

Convenciones:
- tipado estricto, sin any;
- un archivo con varios exports no usa export default;
- líneas en blanco separan conceptos, no propiedades consecutivas de un objeto;
- Angular y backend Electron/Node mantienen utilidades separadas;
- no introducir abstractions genéricas prematuras;
- archivo nuevo: completo; archivo existente: fichero completo o bloques grandes/localizables.

Batería habitual:
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop

Al terminar cada bloque principal, después de que confirme que funciona y está subido, entrégame una nueva versión de este documento.
```
