# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.0  
**Fecha:** 20 de agosto de 2026  
**Estado:** Installation, importación legacy y Startup completados y probados. En el módulo **Ventas** están completados, probados y subidos los bloques **1 a 10**. La auditoría transversal de arquitectura, el refactor técnico **A–E** y el ajuste UX del buscador de artículos están también cerrados. El siguiente bloque funcional es **Ventas 11 — Persistencia transaccional**. Queda después **Ventas 12 — Postventa**.

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

Todos estos hitos han sido probados por el usuario con la aplicación real y están subidos al repositorio.

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
- Siguiente bloque: **Ventas 11 — Persistencia transaccional**.
- Después: **Ventas 12 — Postventa**.

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
11. 🟦 **Persistencia transaccional — siguiente bloque**.
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

La finalización sigue sin tener todavía un botón funcional para persistir una **venta ordinaria**. Se añadirá en Ventas 11 junto con el caso de uso real para evitar una UI muerta.

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

La integración concreta del PDF histórico pertenece a Ventas 11/12 según se cierre la frontera persistencia-postventa.

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

Este resultado será la entrada económica de Ventas 11.

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

# 12. Ventas 11 — Persistencia transaccional 🟦 SIGUIENTE

## 12.1 Objetivo

Convertir:

```text
VentaEnCurso
+
VentaFinalizacionResultado
```

en una venta real y coherente dentro de SQLite mediante **una transacción de negocio**.

Ventas 11 será la primera vez que la acción normal **Finalizar venta** persista una operación ordinaria.

No añadir antes un botón funcional de confirmación desconectado de este caso de uso.

---

## 12.2 Entrada conceptual

Frontend:

```text
VentaEnCurso
├── empleado
├── cliente
├── líneas
├── devolucionesOrigen
├── reservasOrigen
└── total

VentaFinalizacionResultado
├── totalCents
└── pagos[]
```

El backend no debe confiar ciegamente en Angular. Debe volver a validar los elementos autoritativos.

Validaciones mínimas previstas:

- empleado persistido y válido;
- caja sigue abierta;
- tipos de pago existen;
- tipos no repetidos;
- `venta.totalCents === finalizacion.totalCents`;
- suma de pagos igual al total;
- signos correctos;
- total cero implica `pagos = []`;
- referencias de artículos/devoluciones/reservas válidas.

---

## 12.3 Responsabilidades transaccionales pendientes

Ventas 11 debe analizar y resolver conjuntamente, como mínimo:

```text
venta
líneas de venta
pagos
stock
devoluciones
reservas consumidas
caja
```

### Stock

- artículos normales comprados reducen stock;
- Varios no modifica stock;
- devoluciones deben devolver stock según reglas históricas;
- reservas ya redujeron stock cuando se crearon;
- al convertir una reserva en venta debe reconciliarse correctamente el stock para no descontar dos veces.

### Reservas

`VentaEnCurso.reservasOrigen` se conserva aunque el usuario elimine líneas visibles procedentes de la reserva.

Ventas 11 debe decidir transaccionalmente:

- qué unidades reservadas terminan vendidas;
- qué unidades vuelven a stock;
- qué reservas se consumen/cancelan/actualizan;
- cómo evitar inconsistencias si una venta contiene varias reservas.

### Devoluciones

El backend debe respetar:

- venta origen;
- línea origen;
- unidades ya devueltas;
- nuevo acumulado devuelto;
- límites definidos en Ventas 8.

### Pagos y caja

El backend resolverá `tipoPagoPublicId` contra SQLite.

`afectaCaja` debe aplicarse desde el tipo de pago persistido, no desde datos que envíe Angular.

El efectivo ya lleva separadas las cantidades aplicado, entregado y cambio.

---

## 12.4 Orden de cierre de una venta

Orden conceptual deseado:

```text
1. validar comando
2. BEGIN TRANSACTION
3. persistir venta
4. persistir líneas
5. persistir pagos
6. reconciliar stock
7. aplicar devoluciones
8. reconciliar reservas
9. actualizar caja
10. COMMIT
```

Si cualquier parte falla:

```text
ROLLBACK
```

Solo después del `COMMIT` la operación comercial está terminada.

Nunca cerrar la pestaña antes del commit.

---

## 12.5 Ticket posterior a persistencia

Una venta necesita su ID definitivo antes de poder generar el QR compatible con devoluciones:

```text
venta.id = 123
QR       = -123
```

Por tanto, el ticket definitivo debe construirse **después de persistir la venta**.

Secuencia futura:

```text
COMMIT venta
→ obtener ID/número definitivo
→ construir ticket
→ QR
→ PDF histórico
→ impresión silenciosa si corresponde
→ completedEvent
→ nueva venta
```

Un fallo de impresión posterior no revierte la venta.

La persistencia del PDF histórico y la separación exacta entre Ventas 11 y Ventas 12 deben concretarse al diseñar la vertical.

---

## 12.6 TicketBAI / TicketBaiWS

Existe la librería publicada:

```text
@osumi/ticketbaiws
```

Recursos:

- npm: `@osumi/ticketbaiws`;
- GitHub: `osumionline/ticketbaiws`.

Regla:

- cuando llegue la integración fiscal/TicketBaiWS, reutilizar esta librería;
- no crear un cliente HTTP ad hoc dentro de Osumi TPV Client;
- la integración TicketBAI no debe contaminar prematuramente Ventas 11 si pertenece al bloque fiscal/postventa;
- revisar el estado de la documentación de Berein y posibles cambios del SDK cuando se llegue a ese punto.

---

## 12.7 Estadísticas de cliente

Después de persistir una venta real, debe reevaluarse la caché de estadísticas del cliente.

Probablemente se deba forzar recarga/invalidez del histórico correspondiente al cliente afectado.

No olvidar esta integración al cerrar Ventas 11.

---

## 12.8 Primer paso recomendado de Ventas 11

Antes de escribir código:

1. mostrar recapitulación completa del plan;
2. explicar Ventas 11;
3. inspeccionar el `main` actual;
4. inventariar el comportamiento legacy de persistencia/finalización;
5. revisar tablas y repositories actuales de venta, líneas, pagos, stock, caja, reservas y devoluciones;
6. definir un comando tipado de persistencia;
7. diseñar la transacción completa;
8. dividir Ventas 11 en subbloques verticales pequeños.

No fijar los subbloques definitivos hasta revisar el código actual.

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

Revisarlo cuando estén presentes:

- confirmación de venta real;
- persistencia;
- ticket;
- posibles opciones postventa.

Entonces decidir si se simplifica, reorganiza por pasos, separa liquidación y acciones alternativas o cambia la jerarquía visual.

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

Batería habitual:

```bash
npm test
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
| **2.0** | **20 de agosto de 2026** | **Ventas 10 — Finalización y pagos completado. Pagos múltiples, efectivo/cambio, reembolsos, reserva con/sin ticket, configuración local de impresora, PDF, impresión silenciosa, errores de impresión, nueva venta automática y snapshot definitivo. Siguiente: Ventas 11 — Persistencia transaccional.** |

---

# 21. Próximo paso

El siguiente bloque es:

# Ventas 11 — Persistencia transaccional

Estado de entrada:

```text
VentaEnCurso                    ✅
VentaFinalizacionEnCurso        ✅
VentaFinalizacionResultado      ✅
Reserva alternativa             ✅
Impresión silenciosa            ✅
Generación PDF                  ✅
Nueva venta tras completar      ✅

Persistencia venta ordinaria    ⬜
```

Primera tarea:

- revisar el estado actual del código;
- revisar persistencia legacy;
- revisar esquema/repositories actuales;
- diseñar el comando y la transacción;
- fijar subbloques de Ventas 11.

No comenzar Ventas 12 hasta que Ventas 11 esté implementado, probado, subido y este documento vuelva a actualizarse.

---

# 22. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” como contexto principal.

Installation + importación legacy y Startup están completados y probados.

En Ventas están completados y probados los bloques:
1. Contexto operativo.
2. Venta en curso + workspace persistente.
3. Búsqueda de artículos y accesos directos.
4. Estructura visual.
5. Operaciones sobre líneas.
6. Clientes y estadísticas.
7. Varios.
8. Devoluciones.
9. Reservas.
10. Finalización y pagos.

También están completados la auditoría transversal, el Refactor A–E y el ajuste UX del buscador de artículos.

Ventas 10 dejó preparado:
- VentaFinalizacionEnCurso;
- pagos múltiples;
- efectivo entregado y cambio;
- reembolsos;
- total cero;
- Reserva / Reserva sin ticket;
- impresora local opcional;
- listado de impresoras;
- renderer Electron oculto;
- HTML → PDF;
- impresión silenciosa;
- gestión de errores de impresión;
- completedEvent y nueva venta automática;
- VentaFinalizacionResultado como snapshot económico definitivo.

La impresión física con una Star TSP100/TSP143 de 80 mm queda pendiente de validación de hardware, pero no bloquea el desarrollo.

El siguiente bloque es Ventas 11 — Persistencia transaccional. Debe convertir VentaEnCurso + VentaFinalizacionResultado en una venta SQLite consistente y transaccional, incluyendo líneas, pagos, stock, devoluciones, reservas y caja. El backend debe revalidar todo lo autoritativo.

Después de persistir correctamente una venta se podrá construir el ticket definitivo usando el ID real (QR negativo compatible con devoluciones), generar/conservar PDF, imprimir silenciosamente y cerrar la operación. Un fallo de impresión nunca debe revertir una venta ya guardada.

Para TicketBAI/TicketBaiWS existe la librería publicada @osumi/ticketbaiws. Debe reutilizarse cuando llegue el bloque fiscal/postventa, evitando un cliente HTTP ad hoc.

Repositorios:
- Frontend antiguo: https://github.com/osumionline/Osumi-TPV
- Backend antiguo: https://github.com/osumionline/TPV-API
- Cliente nuevo: https://github.com/osumionline/Osumi-TPV-Client

Antes de cada fase/bloque/subapartado:
1. dame el listado completo;
2. marca lo completado;
3. indica dónde estamos;
4. indica lo pendiente;
5. explica brevemente el apartado actual.

Antes de modificar archivos existentes consulta siempre su versión actual.

Convenciones importantes:
- tipado estricto, sin any;
- si un archivo exporta más de un elemento, no usar export default;
- líneas en blanco para separar conceptos, no entre propiedades consecutivas del mismo objeto;
- Angular y backend Electron/Node mantienen utilidades separadas;
- no introducir abstracciones genéricas prematuras.

Al terminar cada bloque principal, después de que confirme que funciona y está subido, entrégame una nueva versión de este documento.
```
