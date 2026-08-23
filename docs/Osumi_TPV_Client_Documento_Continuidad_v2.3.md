# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.3  
**Fecha:** 23 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal y los bloques **Ventas 1–11** están completados, probados y subidos. **Ventas 12 — Postventa** está en fase de diseño: 12A y 12B.1–12B.3 están cerrados y el punto actual es **12B.4 — Envío por email**. La pausa técnica para evolucionar el formato `.otpv` a **v2** y añadir configuración local de **SMTP/TicketBAI** al Client está completada y validada end-to-end con una importación real. La única validación heredada pendiente sigue siendo la **prueba física con Star TSP100/TSP143 de 80 mm**, no bloqueante.

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
- **Ventas 11E — Ticket definitivo + QR + PDF + impresión**, incluida regresión funcional real.
- **Ventas 11F — Regresión completa + cierre**.
- **Ventas 12A — Análisis funcional legacy + inventario inicial**.
- **Ventas 12B.1 — Histórico de ventas: comportamiento y modelo funcional**.
- **Ventas 12B.2 — Política/artefacto histórico del ticket (diseño)**.
- **Ventas 12B.3 — Reimpresión y ticket regalo (diseño)**.
- **Pausa técnica `.otpv` v2 — SMTP/TicketBAI en importación e instalación manual**, completada y validada.

Todos los bloques **Ventas 1–11** han sido probados con la aplicación real y están subidos al repositorio. Ventas 12 ya está iniciado y se encuentra en diseño. La única comprobación pendiente de Ventas 11 es la prueba física con la impresora térmica Star TSP100/TSP143 de 80 mm; no bloquea Postventa.

---

## 2. Estado actual del proyecto

- Aplicación de escritorio: **Electron + Angular**.
- Backend local: **Node.js/TypeScript dentro de Electron**.
- Persistencia local: **SQLite mediante TypeORM y better-sqlite3**.
- Instalación desde cero: completada.
- Importación desde Osumi TPV antiguo mediante `.otpv` **formatVersion 2**: completada y validada con un paquete real.
- Transformación de las 33 tablas legacy: completada.
- Importación de imágenes, iconos, PDF, logo, configuración y secretos: completada. El `.otpv` v2 incorpora `plugin_config.json` para SMTP y TicketBAI.
- Promoción atómica desde staging a la instalación definitiva: completada.
- `ApplicationStateService`, `/startup` y precarga global: completados.
- Conexión SQLite operativa persistente durante la sesión: implementada.
- Protocolo interno `osumi://assets/...`: implementado; sirve logo instalado, ficheros históricos y assets estáticos permitidos de la aplicación con resolución segura.
- Las ventas abiertas viven en memoria en `VentasService` y sobreviven a la navegación entre módulos.
- Refactor transversal A–E: completado, probado y subido.
- Buscador de artículos: clic en el nombre añade inmediatamente un único artículo y cierra el buscador; los checks mantienen la selección múltiple.
- Ventas 10: finalización económica, pagos múltiples, efectivo/cambio, reembolsos, reservas e infraestructura documental/impresión completados.
- Ventas 11: persistencia transaccional real, ticket definitivo, PDF histórico, postprocesos y regresión completados.
- Tras persistir una venta con cliente se invalida la caché de sus estadísticas para que la siguiente consulta refleje la nueva operación.
- `app_data.json` dispone de `frasesTicket: string[]`; instalaciones/configuraciones anteriores se normalizan a `[]` y las importaciones legacy también parten de `[]`.
- Implementación actual: los tickets de venta históricos se almacenan en `assets/files/ventas/tickets/{idVenta}.pdf` y siguen siendo **write-once**. En Ventas 12B.2 se ha diseñado su evolución futura hacia un PDF vigente versionado, pero todavía no está implementada.
- Punto actual: **Ventas 12B.4 — Envío por email**, tras cerrar la pausa técnica `.otpv` v2.

Validación de hardware pendiente y no bloqueante:

- impresora prevista: **Star TSP100 Cutter / TSP143**;
- papel: **80 mm**;
- pendiente comprobar físicamente márgenes, longitud, legibilidad del QR, logo, redes, textos y comportamiento del corte;
- cuando exista acceso al hardware debe retomarse esta prueba sin reabrir Ventas 11 funcionalmente salvo que aparezca una regresión real.

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

### 6.2 Configuración documental del ticket de venta

`app_data.json` contiene además:

```json
{
  "frasesTicket": []
}
```

Reglas:

- es un array de strings opcional;
- en instalación se edita mediante un textarea, **una frase por línea**;
- líneas vacías se eliminan;
- cada frase se imprime centrada en el pie del ticket;
- configuraciones existentes anteriores al campo se cargan como `frasesTicket: []`;
- una importación `.otpv` legacy inicializa `frasesTicket: []`, porque el formato antiguo no contenía este dato;
- no se incrustan textos comerciales heredados del TPV antiguo como reglas globales: cada tienda decide sus propias frases.

El ticket utiliza como nombre principal `appData.nombre`, no `nombreComercial`.

Las redes opcionales disponibles son:

- Twitter;
- Facebook;
- Instagram;
- Web.

Solo se muestran las configuradas. Los iconos reutilizan los assets SVG de la propia aplicación a través del protocolo seguro `osumi://assets/app/...`.


### 6.3 Formato `.otpv` v2 + configuración SMTP/TicketBAI ✅

Durante Ventas 12 se hizo una pausa técnica para ampliar el importador/configuración antes de implementar el envío de tickets por email y el tramo fiscal.

El formato legacy soportado por el Client es ahora **exclusivamente `formatVersion = 2`**. No se mantiene compatibilidad con `.otpv` v1 porque el proyecto sigue en desarrollo y no existen instalaciones externas que lo requieran.

El paquete v2 exige:

```text
manifest.json
  formatVersion = 2
  schemaVersion = legacy-2026-07
  contents.pluginConfig = true

plugin_config.json        obligatorio
checksums.json            incluye SHA-256 de plugin_config.json
```

El inspector acepta como estados válidos del informe:

```text
success
success_with_warnings
```

`plugin_config.json` contiene siempre las claves:

```json
{
  "email_smtp": null,
  "ticketbai": null
}
```

O, cuando están configuradas:

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

Semántica de importación:

- plugin `null` → integración no configurada;
- plugin existente con algún campo `null` → configuración existente pero incompleta;
- los valores legacy se importan sin `trim`, URL decode ni transformaciones previas;
- contraseña SMTP y token TicketBAI nunca deben aparecer en logs, errores, `app_data.json` ni UI de diagnóstico.

Persistencia en el Client:

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

Los modelos normalizados son:

```text
emailSmtp: EmailSmtpConfig | null
ticketBai: TicketBaiConfig | null
emailSmtpPass: string | null
ticketBaiToken: string | null
```

La instalación manual también permite configurar ambas integraciones de forma opcional.

SMTP:

- activación Sí/No;
- host;
- puerto, por defecto 587;
- usuario;
- contraseña, almacenada solo en secretos;
- selector cerrado de seguridad:
  - `none` → Sin cifrado;
  - `tls` → TLS / STARTTLS;
  - `ssl` → SSL / TLS implícito.

TicketBAI:

- activación Sí/No;
- NIF;
- token, almacenado solo en secretos.

Si una integración está desactivada, su configuración se guarda como `null` y no se envía su secreto.

Validación completada:

- batería técnica completa;
- instalación manual con los nuevos controles;
- importación end-to-end de un `.otpv` v2 real;
- `emailSmtp` y `ticketBai` comprobados en `app_data.json`;
- secretos comprobados como no presentes en texto plano;
- arranque y uso normal de la instalación importada correctos.

Esta pausa técnica queda **cerrada**. La configuración SMTP necesaria para Ventas 12B.4 ya está disponible localmente y no depende de `TPV-Client-API`.

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

Esta recapitulación debe aparecer al comenzar **cada fase, bloque, subapartado o paso**. Debe mostrarse el listado completo del bloque actual, marcar qué está completado, indicar exactamente el paso en curso y todo lo pendiente. Después deben añadirse uno o dos párrafos explicando qué se va a resolver en el paso actual antes de entrar en implementación.

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
11. ✅ **Persistencia transaccional**.
    - ✅ 11A — Análisis y diseño de la transacción.
    - ✅ 11B — Contratos + mapper de GuardarVenta + trazabilidad SQLite.
    - ✅ 11C — Caso de uso backend + transacción SQLite.
    - ✅ 11D — IPC + Angular + Finalizar venta.
    - ✅ 11E — Ticket definitivo + QR + PDF + impresión.
      - ⚠️ prueba física Star TSP100/TSP143 de 80 mm pendiente, **no bloqueante**.
    - ✅ 11F — Regresión completa + cierre.
12. 🟦 **Postventa**.
    - ✅ 12A — Análisis funcional legacy + inventario del estado actual.
    - 🟦 12B — Diseño funcional y arquitectura nueva.
      - ✅ 12B.1 — Histórico de ventas: comportamiento y modelo funcional.
      - ✅ 12B.2 — Artefacto/política histórica del ticket.
      - ✅ 12B.3 — Reimpresión y ticket regalo.
      - 🟦 **12B.4 — Envío por email.**
      - ⬜ 12B.5 — Facturación.
      - ⬜ 12B.6 — TicketBAI / estado fiscal.
      - ⬜ 12B.7 — Integración UI.
    - ⬜ 12C en adelante — Implementación por subbloques, a concretar tras cerrar 12B.

Pausa técnica intermedia ya cerrada:

- ✅ `.otpv` `formatVersion = 2`;
- ✅ `plugin_config.json` obligatorio y checksum validado;
- ✅ importación SMTP/TicketBAI;
- ✅ secretos protegidos mediante `safeStorage`;
- ✅ SMTP/TicketBAI configurables en instalación manual;
- ✅ importación real `.otpv` v2 validada end-to-end.

Hitos transversales ya cerrados:

- ✅ auditoría arquitectónica tras Ventas 9;
- ✅ Refactor A–E;
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

## 11.9 PDF histórico — completado en Ventas 11 ✅

Ventas 10 dejó preparada la infraestructura `renderPdf()`. Ventas 11 completó el objetivo: cada venta persistida genera un **artefacto histórico definitivo**.

Flujo final:

```text
venta persistida
→ ID definitivo
→ snapshot releído desde SQLite
→ ticket definitivo
→ PDF
→ almacenamiento write-once
```

Ubicación:

```text
assets/files/ventas/tickets/{idVenta}.pdf
```

El archivo no se regenera ni sobrescribe si ya existe. Esto permite que Postventa pueda reutilizar exactamente el documento original para reimpresión o email aunque en el futuro cambien logo, datos del negocio o plantilla.

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

# 12. Ventas 11 — Persistencia transaccional ✅ COMPLETADO

## 12.1 Estado final del bloque

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

✅ 11E — Ticket definitivo + QR + PDF + impresión
   ✅ 11E.1 — Snapshot persistido del ticket
   ✅ 11E.2 — Exposición IPC + servicio Angular
   ✅ 11E.3 — QR local + HTML print-native de 80 mm
   ✅ 11E.4 — PDF histórico + impresión silenciosa
   ✅ 11E.5 — Orquestación post-COMMIT y errores no bloqueantes
   ✅ 11E.6 — Regresión funcional real
   ⚠️ 11E.6.4 — Prueba física de 80 mm pendiente, no bloqueante

✅ 11F — Regresión completa + cierre
```

Ventas 11 está cerrado funcional y técnicamente. La prueba física de impresora queda registrada como validación de hardware futura y no impide comenzar Ventas 12.

---

## 12.2 11A — Diseño de la transacción ✅

Principio final:

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

Cualquier fallo antes del COMMIT implica **ROLLBACK completo**. QR, PDF, impresión, invalidación de cachés y otras salidas son posteriores al COMMIT.

Decisiones principales:

- el backend trata el payload Angular como no confiable y revalida todos los datos autoritativos;
- `cajaPublicId` representa la caja concreta con la que se inició la operación y debe seguir abierta;
- la numeración utiliza `secuencia_documento`, sincronizada con el máximo histórico importado;
- `VentaEnCurso.idTemporal` se utiliza como `venta.public_id` e idempotency key;
- un reintento después de un COMMIT ya realizado devuelve la misma venta sin repetir efectos;
- TicketBAI queda fuera de esta transacción comercial.

---

## 12.3 11B — Contratos, mapper y trazabilidad ✅

### `GuardarVentaCommand`

Archivo:

```text
electron/contracts/ventas/guardar-venta-command.interface.ts
```

Transporta `publicId` públicos, nunca IDs internos de SQLite, e incluye caja, empleado, cliente, venta origen de devolución, reservas origen, total, líneas y pagos.

### Snapshot de descuento

Las líneas ordinarias persisten una representación inequívoca del descuento. Las líneas históricas procedentes de reserva/devolución pueden conservar simultáneamente porcentaje e importe económico histórico.

### Trazabilidad SQLite

El esquema canónico incorpora:

```text
venta.id_venta_origen_devolucion
linea_venta.id_linea_venta_origen_devolucion
linea_venta.id_linea_reserva_origen
venta_reserva(id_venta, id_reserva)
```

`linea_venta` impide que una línea sea simultáneamente devolución y reserva. `venta_reserva` permite varias reservas por venta y evita consumir una misma reserva desde dos ventas.

### Regla de esquema pre-release

Mientras el producto siga greenfield y sin versiones distribuidas:

- no crear migraciones todavía;
- modificar el esquema canónico;
- recrear la base de desarrollo cuando cambie el esquema;
- mantener `DATABASE_SCHEMA_VERSION = 1`;
- introducir migraciones cuando exista una versión publicada que deba actualizarse.

---

## 12.4 11C — Transacción SQLite real ✅

La frontera de aplicación queda:

```text
Angular
→ GuardarVentaCommand
→ VentasPersistenciaService backend
→ GuardarVentaRecordCommand
→ TypeOrmVentasPersistenciaRepository
→ transacción SQLite
```

Dentro de la transacción se resuelven y validan autoritativamente:

- caja concreta aún abierta;
- empleado activo;
- cliente si existe;
- venta y línea exacta origen de devolución;
- reservas y cliente propietario;
- líneas concretas de reserva;
- artículos;
- tipos de pago activos/físicos;
- semántica de efectivo mediante `tipo_pago.slug`;
- `afecta_caja` desde SQLite.

### Numeración e idempotencia

`secuencia_documento` se sincroniza con `MAX(numero)` histórico antes de incrementar y se actualiza dentro de la transacción.

Antes de crear efectos se busca `venta.public_id = command.publicId`:

- mismo `publicId` + mismo total → devolver la venta ya persistida;
- no repetir líneas, pagos, stock, histórico ni caja;
- mismo `publicId` + total distinto → rechazar por inconsistencia.

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

Cada movimiento de artículo genera `historico_articulo` con stock previo/final, diferencia, venta y precios históricos.

### Devoluciones

La devolución referencia la **línea histórica exacta**. `unidades_devueltas` se acumula y nunca puede superar las unidades originales.

El movimiento de stock conserva precios históricos de la línea de origen.

### Reservas

Las reservas ya descontaron stock al crearse. Al venderlas se reconcilia:

```text
diferencia = unidadesFinales - unidadesReservadas
```

Se recorren todas las líneas originales, incluso las eliminadas visualmente. Una línea eliminada equivale a `unidadesFinales = 0` y restaura completamente el stock inmovilizado.

La cabecera de reserva queda con borrado lógico, las líneas se conservan como histórico y `venta_reserva` registra qué venta la consumió.

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
- para efectivo se usa el importe aplicado, nunca el dinero entregado;
- `importe_real_cents` pertenece al recuento/cierre físico y no se toca durante ventas;
- cada tipo utilizado incrementa una operación;
- en pago mixto el descuento se distribuye proporcionalmente por `abs(importeCents)` y el último pago absorbe el residual de redondeo.

---

## 12.7 Tests backend y regresión transaccional ✅

Existe un runner Vitest específico para Electron/backend:

```text
electron/vitest.config.ts
scripts/test-electron.mjs
```

Comandos:

```bash
npm run test:electron
npm run test:electron:vitest
```

`npm run test:electron` es el comando seguro porque recompila `better-sqlite3` para Node, ejecuta la suite y en `finally` lo reconstruye para Electron.

La regresión usa SQLite real temporal y cubre, entre otros:

- venta normal;
- stock/histórico;
- caja y reparto de descuento;
- idempotencia;
- rollback provocado al final de la transacción;
- devolución parcial acumulativa y exceso rechazado;
- reserva con cantidad reducida y línea eliminada;
- total cero/regalo sin pagos;
- snapshot persistido del ticket.

Se añadieron además tests específicos para impresión, almacenamiento histórico de PDF y servicios post-COMMIT.

---

## 12.8 11D — Wiring completo y prueba end-to-end ✅

`GuardarVentaResult` expone:

```text
id
publicId
serie
numero
totalCents
fecha
```

El `id` numérico se expone deliberadamente porque el QR compatible con devoluciones usa `-id`.

Flujo:

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
```

Un fallo anterior al COMMIT mantiene la venta abierta y permite reintento. Después del COMMIT ningún postproceso puede volver a convertir la operación en pendiente.

Pruebas manuales completadas:

- venta normal en efectivo;
- pago mixto;
- total cero;
- devolución parcial real;
- venta procedente de reserva;
- cierre de la operación terminada;
- creación de una única nueva venta;
- continuidad de foco;
- efectos reales sobre SQLite.

---

## 12.9 11E.1–11E.2 — Snapshot documental e IPC ✅

El ticket definitivo **no se construye desde `VentaEnCurso`**.

Después del COMMIT:

```text
GuardarVentaResult.id
→ ventas:get-ticket
→ TypeOrmVentasTicketsRepository
→ SQLite
→ VentaTicketInterface
```

`VentaTicketInterface` contiene únicamente datos documentales:

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

No incluye stock, PUC ni trazabilidad interna de reserva/devolución.

El snapshot se expone de extremo a extremo mediante composition root, IPC `ventas:get-ticket`, preload/`VentasApi` y `VentasTicketsService` Angular.

---

## 12.10 11E.3 — QR local + ticket HTML de 80 mm ✅

El QR comercial compatible con devoluciones mantiene exactamente:

```text
venta id 123
→ contenido QR "-123"
```

Se utiliza generación local de QR y SVG, sin servicios externos.

El builder del ticket:

```text
src/app/model/ventas/venta-ticket-document.builder.ts
```

produce HTML print-native de **80 mm** a partir de `VentaTicketInterface + AppData`.

Contenido final validado:

- logo de la empresa;
- `appData.nombre` como nombre principal;
- dirección/población;
- CIF/NIF y teléfono;
- redes configuradas: Twitter, Facebook, Instagram y Web, con iconos;
- título `TICKET` o `DEVOLUCIÓN` según el total;
- referencia;
- fecha/hora local del terminal a partir del instante UTC persistido;
- empleado;
- cliente opcional;
- líneas, cantidades, PVP, descuentos y regalos;
- total;
- pagos;
- entregado y cambio cuando corresponda;
- desglose de IVA;
- QR `-id`;
- frases personalizadas `frasesTicket`, una por línea y centradas.

Todo texto dinámico se escapa con `escapeHtml()`.

### IVA en devoluciones

El desglose se calcula sobre importes **firmados** persistidos. Una devolución compensa base y cuota en lugar de convertirlas artificialmente a positivas como hacía el legacy.

Las pruebas manuales confirmaron que los signos negativos en devolución son correctos y aceptables visualmente.

### Assets documentales

El protocolo `osumi://assets/...` sirve:

- `osumi://assets/logo` → logo instalado;
- `osumi://assets/files/...` → ficheros de la instalación;
- `osumi://assets/app/...` → assets estáticos permitidos de la aplicación.

La resolución evita traversal y escapes por symlinks mediante comprobación de rutas reales.

---

## 12.11 Configuración `frasesTicket` ✅

`AppData` incluye:

```ts
readonly frasesTicket: readonly string[];
```

Instalación:

- textarea opcional;
- una frase por línea;
- Angular convierte a array;
- backend vuelve a normalizar;
- las líneas vacías se eliminan.

Compatibilidad:

- `app_data.json` anterior sin el campo → se carga como `[]`;
- importación `.otpv` antigua → `frasesTicket: []`;
- no requiere reinstalar ni cambiar `DATABASE_SCHEMA_VERSION`.

---

## 12.12 11E.4 — PDF histórico + impresión silenciosa ✅

### Almacenamiento histórico

Contrato:

```text
VentaTicketPdfStorage
```

Implementación:

```text
FileVentaTicketPdfStorage
```

Ubicación:

```text
assets/files/ventas/tickets/{idVenta}.pdf
```

Reglas:

- creación de directorios automática;
- escritura mediante temporal + `rename`;
- validación de ID;
- validación de firma `%PDF-`;
- límite defensivo de 10 MB;
- **write-once**: si el PDF existe, no se sobrescribe.

Esto garantiza que una plantilla futura no modifique un ticket histórico ya emitido.

### Generación

```text
VentaTicketDocumentService.generateAndSavePdf(idVenta)
→ getTicket(idVenta)
→ buildVentaTicketDocument()
→ printing.renderPdf()
→ Uint8Array
→ ventas:save-ticket-pdf
→ validación backend de que la venta existe
→ FileVentaTicketPdfStorage
```

### Impresión

```text
VentaTicketDocumentService.print(idVenta)
→ getTicket(idVenta)
→ mismo HTML definitivo
→ printing.printTicket()
→ impresión silenciosa
```

PDF e impresión usan exactamente el mismo builder documental.

---

## 12.13 11E.5 — Post-COMMIT no bloqueante ✅

`VentaPostCommitService` encapsula los trabajos posteriores al COMMIT:

```text
invalidar estadísticas del cliente si existe
→ recargar reservas si procede
→ generar/conservar PDF
→ intentar imprimir
```

Cada trabajo es independiente y sus errores se convierten en warnings.

Regla crítica:

```text
save() falla antes del COMMIT
→ venta sigue abierta
→ se puede reintentar

save() devuelve GuardarVentaResult
→ venta YA terminada
→ ningún fallo posterior puede repetir save()
```

Si hay incidencias post-COMMIT:

```text
venta guardada
→ mostrar aviso "Venta finalizada"
→ usuario acepta
→ completedEvent
→ cerrar operación
→ crear UNA nueva venta
→ foco localizador
```

El PDF se intenta aunque después falle la impresora, y la impresión se intenta aunque haya fallado la generación/almacenamiento del PDF.

---

## 12.14 Estadísticas del cliente — invalidación final ✅

`ClientesService` cachea estadísticas rápidas por `publicId`.

Tras persistir una venta con cliente:

```text
COMMIT
→ ClientesService.invalidateEstadisticas(clientePublicId)
```

Si existe una petición antigua todavía en curso, se espera a que termine antes de eliminar su resultado. La siguiente selección del cliente fuerza una consulta nueva y refleja la venta recién realizada.

La prueba manual confirmó que no es necesario reiniciar la aplicación ni recargar todos los clientes.

---

## 12.15 Regresión funcional final ✅

Se verificaron durante Ventas 11:

- venta normal;
- pago en efectivo;
- pago mixto;
- efectivo entregado y cambio;
- total cero/regalo;
- devolución parcial;
- devolución netamente negativa;
- venta procedente de reserva;
- reconciliación de stock;
- consumo y recarga de reservas;
- caja;
- histórico de artículo;
- idempotencia;
- rollback transaccional;
- snapshot documental releído desde SQLite;
- QR `-id` y recuperación de devolución mediante ese código;
- HTML de 80 mm;
- logo, redes y frases personalizadas;
- desglose de IVA firmado;
- PDF histórico write-once;
- ausencia de impresora como error no bloqueante;
- nueva venta automática después de completar;
- recuperación del foco en el localizador;
- invalidación y recarga real de estadísticas del cliente.

Batería final habitual:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```

El usuario confirmó que pasa al cierre del bloque.

### Pendiente de hardware

No se ha podido validar todavía físicamente la impresión en:

```text
Star TSP100 Cutter / TSP143
papel 80 mm
```

Cuando exista acceso a la impresora, comprobar:

- impresión silenciosa real;
- ancho/márgenes;
- longitud del ticket;
- logo y redes;
- líneas largas;
- QR escaneable desde papel;
- frases personalizadas;
- corte final.

Esta prueba queda **pendiente y no bloquea Ventas 12**.

---

## 12.16 TicketBAI / TicketBaiWS

Existe la librería propia publicada:

```text
@osumi/ticketbaiws
```

Reglas:

- reutilizarla cuando llegue el tramo fiscal/Postventa;
- no crear un cliente HTTP ad hoc en el Client;
- el ticket comercial actual no contiene todavía el QR fiscal de TicketBAI;
- cuando se integre TicketBAI, revisar la respuesta/documentación de Berein y posibles cambios del SDK antes de fijar contratos definitivos;
- el QR comercial `-id` para devoluciones y el futuro QR fiscal de TicketBAI son conceptos distintos y deben coexistir cuando corresponda.

---

# 13. Ventas 12 — Postventa 🟦 EN DISEÑO

## 13.1 Estado del bloque

```text
12A — Análisis funcional legacy + inventario              ✅
12B — Diseño funcional y arquitectura                    🟦
  12B.1 — Histórico de ventas                            ✅
  12B.2 — Artefacto/política histórica del ticket        ✅ diseño
  12B.3 — Reimpresión y ticket regalo                    ✅ diseño
  12B.4 — Envío por email                                🟦 actual
  12B.5 — Facturación                                    ⬜
  12B.6 — TicketBAI / estado fiscal                      ⬜
  12B.7 — Integración UI                                 ⬜
12C+ — Implementación                                    ⬜
```

La pausa técnica `.otpv` v2 que interrumpió temporalmente 12B.4 está terminada. Debe retomarse Postventa exactamente en **12B.4 — Envío por email**.

## 13.2 Entrada al histórico

El Histórico no será una ruta independiente. Se abre como modal desde la pantalla de Ventas al hacer clic en el importe de la venta, actualmente el `div.sale__amount`.

El modal contiene dos pestañas:

```text
Histórico de ventas   ← funcional en este bloque
Salidas caja          ← placeholder; se desarrollará más adelante
```

## 13.3 Filtros del histórico

Parte superior:

- selector `Fecha / Rango`;
- `Fecha` es el modo por defecto;
- datepicker con la fecha actual;
- botones anterior/siguiente para cambiar de día y consultar directamente;
- en modo `Rango`, datepicker inicio + datepicker fin + botón Buscar;
- validar `desde <= hasta`.

## 13.4 Listado y resúmenes

Columna izquierda:

```text
Fecha/hora | Importe | Tipo(s) de pago
```

Reglas:

- una venta con varios medios de pago muestra, por ejemplo, `Efectivo + VISA`;
- si tiene cliente, mostrar icono con tooltip del nombre;
- la venta seleccionada queda resaltada.

Resúmenes bajo la lista:

- total del día/rango;
- ticket medio = total / número de ventas;
- total dinámico por cada tipo de pago utilizado;
- beneficio.

Definición de beneficio confirmada:

```text
importe final vendido - coste
```

Debe respetarse el signo y calcularse de forma autoritativa en backend/SQLite.

## 13.5 Detalle de la venta

Columna derecha:

```text
Localizador
Marca
Descripción
Cantidad
PVP
Descuento
Importe
```

Fila final de totales:

- sumatorio de cantidad;
- sumatorio de importe;
- conservar también información total de descuento cuando corresponda.

El histórico debe usar un **modelo de lectura**, no `VentaEnCurso`.

Diseño propuesto:

```text
consulta fecha/rango
→ VentaHistoricoResumen[] + ResumenHistorico

seleccionar venta
→ getDetalle(idVenta)
→ VentaHistoricoDetalle
```

No cargar todas las líneas de todas las ventas de un rango cuando no son necesarias.

## 13.6 Modificaciones postventa permitidas

### Cambiar tipo de pago

Solo cuando:

```text
exactamente 1 pago
+
caja original todavía abierta
=
acción habilitada
```

Casos:

```text
0 pagos / total cero     → deshabilitado
1 pago + caja abierta    → habilitado
1 pago + caja cerrada    → deshabilitado
2+ pagos                 → deshabilitado
```

La operación debe ser transaccional y corregir no solo `venta_pago`, sino también los acumulados de caja correspondientes al tipo anterior/nuevo y el cierre teórico cuando proceda.

Normalización acordada:

```text
Efectivo → no efectivo
entregado = null
cambio = 0

No efectivo → efectivo, venta positiva
entregado = importe aplicado
cambio = 0

No efectivo → efectivo, devolución
entregado = null
cambio = 0
```

### Cambiar/asignar cliente

- permitido mientras la venta no forme parte de una factura;
- si la venta ya está facturada, la acción debe quedar bloqueada;
- una corrección de cliente deberá invalidar las estadísticas cacheadas del cliente anterior y del nuevo cuando se implemente.

No crear un `updateVenta()` genérico. Cliente y tipo de pago deben ser casos de uso expresivos distintos porque sus efectos de negocio son diferentes.

## 13.7 Política documental diseñada en 12B.2

**Importante:** esto está diseñado, pero todavía no implementado. La implementación actual de Ventas 11 sigue siendo write-once.

Objetivo futuro:

```text
{idVenta}.pdf
→ PDF vigente según los datos actuales de la venta

{idVenta}_{timestamp}.pdf
→ versiones anteriores archivadas e inmutables
```

Las versiones archivadas:

- no se muestran en la aplicación;
- no participan en reimpresión/email;
- no se borran automáticamente;
- pueden recuperarse manualmente desde la carpeta si alguna vez hace falta.

Para detectar persistentemente si el PDF coincide con la venta se ha diseñado una revisión documental, conceptualmente:

```text
ticket_revision
ticket_pdf_revision
```

Cambios de cliente/pago incrementan la revisión del ticket. El PDF se regenera post-COMMIT. Si la regeneración falla, la corrección de negocio permanece y el sistema sabe que el PDF vigente debe repararse antes de reutilizarlo.

Ventas legacy sin PDF histórico deben poder generar su PDF desde el snapshot persistido cuando se necesite. Regla final de negocio:

> **Cualquier ticket, nuevo o legacy, debe poder reimprimirse y enviarse.**

Para ventas legacy con información TicketBAI, cuando llegue el tramo fiscal se deberán representar en el ticket los datos fiscales históricos ya almacenados. Eso no adelanta la comunicación fiscal completa.

## 13.8 Reimpresión y ticket regalo

### Ticket normal

Debe representar siempre los **datos actuales persistidos** de la venta. Si cliente/pago se corrigieron, la reimpresión no debe mostrar los datos originales obsoletos.

La simple reimpresión no debe crear versiones documentales nuevas si el PDF ya está actualizado.

### Ticket regalo

Es una representación bajo demanda, no un artefacto PDF histórico persistente.

Conserva:

- logo y datos del negocio;
- redes;
- fecha/hora;
- referencia;
- empleado;
- artículos y cantidades;
- QR comercial;
- frases personalizadas;
- información TicketBAI cuando corresponda.

Oculta:

- cliente;
- PVP;
- descuentos;
- importes de línea;
- total;
- pagos;
- entregado/cambio;
- desglose de IVA.

Debe mostrar claramente `TICKET REGALO`.

Operaciones con devoluciones:

- operación mixta → mostrar solo líneas de compra con cantidad positiva;
- devolución pura → acción Ticket regalo deshabilitada porque no existen líneas positivas.

## 13.9 Acciones del histórico

Acciones previstas:

```text
Imprimir ticket
Imprimir ticket regalo
Generar factura
Enviar ticket por email
Devolución
```

`Obtener imagen ticket` desaparece: no se traslada al Client nuevo.

`Generar factura` debe reservarse visualmente pero su comportamiento se revisará más adelante junto al módulo de Clientes/Facturación; no implementar prematuramente.

`Devolución` reutilizará el flujo de devoluciones ya validado en Ventas 8/11: cerrar modal, cargar la venta persistida como origen de devolución y continuar con el selector existente.

## 13.10 12B.4 — Envío por email 🟦 ACTUAL

Decisión arquitectónica cerrada:

```text
Electron/backend local
→ SMTP
→ servidor de correo del comercio
→ cliente
```

El envío **no depende de `TPV-Client-API`**. Debe funcionar en pequeños puestos/tiendas sin servidor remoto asociado.

La configuración necesaria ya está implementada en Installation/importación `.otpv` v2:

```text
appData.emailSmtp
secrets.emailSmtpPass
```

Regla documental:

- el email adjunta siempre el PDF vigente;
- antes de enviar se debe garantizar que exista y corresponda a la revisión actual;
- si el PDF ya está actualizado, enviar no debe regenerarlo innecesariamente.

Comportamiento funcional conocido:

- venta con cliente y email → usar inicialmente ese email;
- venta sin cliente → preguntar si se quiere asignar cliente o introducir una dirección manual;
- el PDF actual del ticket será el adjunto.

Decisiones que **siguen abiertas y deben aclararse antes de implementar 12B.4**:

1. qué hacer si la venta tiene cliente asignado pero ese cliente no tiene email: introducir dirección manual, ofrecer editar/asignar cliente u otra UX;
2. si asunto/cuerpo del email serán textos fijos del Client o configurables por tienda.

Por la regla general del proyecto, no asumir ninguna de estas dos decisiones: preguntar y cerrar antes de continuar.

## 13.11 Facturación

Pendiente. Conocemos que:

- el legacy permitía generar una factura directa desde una venta;
- el módulo Clientes también agrupa varias ventas en una factura;
- la venta facturada ya no puede cambiar de cliente.

La acción del histórico puede dejarse reservada hasta revisar el módulo de Clientes/Facturación completo.

## 13.12 TicketBAI

Existe la librería propia:

```text
@osumi/ticketbaiws
```

Reglas:

- reutilizarla; no crear cliente HTTP ad hoc;
- distinguir QR comercial `-id` y QR/huella fiscal;
- representar datos fiscales legacy ya almacenados cuando corresponda;
- revisar documentación/respuesta de Berein y estado de la librería antes de fijar la integración fiscal definitiva.

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


### PDF histórico de venta

Ventas 11 añadió:

```text
assets/files/ventas/tickets/{idVenta}.pdf
```

Es write-once y debe ser la fuente documental preferente de Postventa para:

- reimpresión exacta;
- envío por email;
- conservación histórica.

No regenerar un ticket histórico si su PDF definitivo ya existe.

### Assets del ticket

El protocolo `osumi://assets/...` permite al renderer documental acceder de forma controlada al logo instalado y a iconos estáticos de la aplicación. El ticket de venta utiliza esta infraestructura para logo y redes sociales.


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

Para **cada fase, bloque, subapartado o paso**:

1. mostrar primero el **listado completo del bloque actual**;
2. marcar explícitamente qué pasos están ✅ completados;
3. marcar exactamente cuál está 🟦 en curso;
4. mostrar todos los pasos ⬜ pendientes;
5. después del listado, explicar en **uno o dos párrafos** qué vamos a hacer en el paso actual y qué objetivo tiene;
6. revisar el código actual de `main` antes de proponer cambios sobre archivos existentes;
7. inventariar el comportamiento legacy cuando sea relevante;
8. separar comportamiento que se conserva de deuda técnica que no debe trasladarse;
9. definir contratos/responsabilidades;
10. implementar en pasos pequeños verificables;
11. probar;
12. no avanzar hasta confirmación del usuario;
13. tras cada bloque principal, actualizar y entregar este documento.

> **Regla de orientación obligatoria:** el listado completo del bloque y la explicación del paso actual deben aparecer **al comenzar cada paso**, no solo al comenzar un bloque principal.

> **Regla de continuidad:** esta misma instrucción debe mantenerse en futuras versiones del Documento de continuidad y relevo.

> **Regla de aclaración obligatoria:** ante cualquier duda funcional, de negocio, UX, fiscal, documental o arquitectónica que pueda afectar al resultado, **detener el desarrollo y preguntarla antes de continuar**. No rellenar ambigüedades ni asumir decisiones por cuenta propia. Esta regla debe conservarse explícitamente en futuras versiones del documento.

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
| **2.2** | **23 de agosto de 2026** | **Ventas 11 completado: persistencia transaccional, ticket definitivo desde snapshot SQLite, QR `-id`, HTML 80 mm, logo/redes/frases configurables, PDF histórico write-once, impresión silenciosa, post-COMMIT no bloqueante, invalidación de estadísticas de cliente y regresión final. Prueba física Star TSP100/TSP143 pendiente y no bloqueante. Siguiente: Ventas 12 — Postventa.** |
| **2.3** | **23 de agosto de 2026** | **Ventas 12 iniciado: 12A y 12B.1–12B.3 cerrados a nivel de diseño. Pausa técnica `.otpv` v2 completada: `plugin_config.json`, SMTP/TicketBAI, secretos con `safeStorage`, configuración en instalación manual e importación real end-to-end validada. Punto de reanudación: 12B.4 — Envío por email mediante SMTP local.** |

---

# 21. Próximo paso

El punto exacto de reanudación es:

# Ventas 12B.4 — Envío de ticket por email

Estado:

```text
Installation + importación `.otpv` v2            ✅
Configuración SMTP/TicketBAI local               ✅
Startup                                          ✅
Ventas 1–11                                      ✅
Ventas 12A                                       ✅
Ventas 12B.1 — Histórico                         ✅
Ventas 12B.2 — Política documental               ✅ diseño
Ventas 12B.3 — Reimpresión/ticket regalo         ✅ diseño
Ventas 12B.4 — Email                             🟦 actual
Ventas 12B.5 — Facturación                       ⬜
Ventas 12B.6 — TicketBAI                         ⬜
Ventas 12B.7 — Integración UI                    ⬜
```

La pausa técnica ya no bloquea el email: SMTP se configura localmente tanto en instalación manual como por importación `.otpv` v2, y la contraseña permanece en `secrets.json` cifrado.

Antes de diseñar el servicio SMTP definitivo deben aclararse dos decisiones funcionales pendientes:

1. UX cuando una venta tiene cliente asignado pero el cliente no tiene email;
2. asunto/cuerpo fijo o configurable por tienda.

Después de cerrar esas dos decisiones:

1. diseñar contrato backend de envío;
2. escoger/revisar la librería SMTP Node adecuada;
3. diseñar lectura segura de configuración/secreto sin exponerlos a Angular;
4. integrar la garantía de PDF vigente antes de adjuntarlo;
5. diseñar IPC y UX de envío/error/éxito;
6. implementar solo cuando 12B.4 quede funcionalmente cerrado.

Recordatorio de hardware:

- prueba física Star TSP100/TSP143 de 80 mm pendiente y no bloqueante.

---

# 22. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” versión 2.3 como contexto principal.

Estado general:
- Installation + importación legacy `.otpv` v2: completadas y probadas.
- Startup: completado.
- Auditoría transversal y Refactor A–E: completados.
- Ventas 1–11: completados y probados.
- Ventas 12 — Postventa: EN DISEÑO.

Ventas 11 cerró la persistencia transaccional de extremo a extremo: transacción SQLite real, venta/líneas/pagos/stock/histórico/caja, devoluciones/reservas, snapshot documental desde SQLite, QR comercial `-id`, HTML 80 mm, logo/redes/frases, PDF histórico actual write-once, impresión silenciosa, post-COMMIT no bloqueante e invalidación de estadísticas del cliente. Solo queda pendiente, sin bloquear, la prueba física con Star TSP100/TSP143 de 80 mm.

Ventas 12:
- 12A — análisis funcional legacy: COMPLETADO.
- 12B.1 — histórico de ventas: DISEÑO CERRADO.
- 12B.2 — política/artefacto histórico del ticket: DISEÑO CERRADO.
- 12B.3 — reimpresión y ticket regalo: DISEÑO CERRADO.
- 12B.4 — envío por email: PASO ACTUAL.
- 12B.5 — facturación: pendiente.
- 12B.6 — TicketBAI/estado fiscal: pendiente.
- 12B.7 — integración UI: pendiente.

Histórico de ventas:
- se abre en modal al hacer clic en `sale__amount` de Ventas;
- tabs: Histórico de ventas + Salidas caja placeholder;
- filtros Fecha/Rango con datepickers y navegación anterior/siguiente;
- listado con fecha, importe y tipos de pago; cliente mediante icono/tooltip;
- resúmenes de total, ticket medio, total por tipo de pago y beneficio;
- beneficio = importe final vendido - coste;
- detalle derecho con líneas y totales;
- varios pagos se muestran como `Efectivo + VISA`; el cambio de pago se deshabilita si hay más de uno;
- cambiar pago solo si existe exactamente un pago y la caja original sigue abierta; debe corregir caja transaccionalmente;
- cambiar cliente está prohibido si la venta ya forma parte de una factura.

Política documental diseñada para Postventa (NO implementada todavía; el storage actual sigue write-once):
- `{id}.pdf` será el PDF vigente;
- al regenerar por una corrección, el anterior se archivará como `{id}_{timestamp}.pdf`;
- las versiones antiguas no se muestran en UI;
- se plantea `ticket_revision` / `ticket_pdf_revision` para detectar PDF desactualizado;
- cualquier ticket nuevo o legacy debe acabar pudiendo reimprimirse y enviarse;
- ventas legacy con datos TicketBAI deben representar la información fiscal histórica cuando llegue el tramo fiscal.

Ticket regalo:
- mismo ticket base, pero sin cliente, precios, descuentos, importes, total, pagos ni IVA;
- muestra `TICKET REGALO`;
- en una operación mixta solo incluye líneas de compra con cantidad positiva;
- en una devolución pura queda deshabilitado;
- no se persiste como PDF histórico, se genera bajo demanda para imprimir.

Pausa técnica `.otpv` v2 COMPLETADA:
- el Client soporta exclusivamente formatVersion 2;
- `plugin_config.json` es obligatorio y su checksum se valida;
- se aceptan `success` y `success_with_warnings`;
- `email_smtp` y `ticketbai` pueden ser objeto o null;
- app_data.json guarda host/port/secure/user y nif;
- secrets.json cifrado con safeStorage guarda emailSmtpPass y ticketBaiToken;
- instalación manual permite activar SMTP y TicketBAI;
- seguridad SMTP es selector cerrado: none / tls / ssl;
- importación real de un `.otpv` v2 validada end-to-end.

Decisión de email:
- el propio Electron/backend local enviará por SMTP;
- no depender de TPV-Client-API porque puede haber instalaciones sin servidor asociado;
- el email adjuntará el PDF vigente de la venta.

Al retomar 12B.4 todavía hay que aclarar ANTES DE IMPLEMENTAR:
1. qué hacer si la venta tiene cliente pero ese cliente no tiene email;
2. si asunto/cuerpo del correo serán fijos o configurables por tienda.

TicketBAI:
- usar la librería propia `@osumi/ticketbaiws`;
- no crear cliente HTTP ad hoc;
- revisar documentación/respuesta de Berein antes del tramo fiscal.

Regla de trabajo obligatoria para CADA paso/subapartado:
1. mostrar primero el listado COMPLETO del bloque actual;
2. marcar completado / actual / pendiente;
3. explicar en 1–2 párrafos el objetivo del paso actual;
4. revisar `main` antes de modificar archivos existentes;
5. implementar en pasos pequeños y no avanzar hasta mi confirmación;
6. ante CUALQUIER duda funcional, negocio, UX, fiscal, documental o arquitectónica relevante, PAUSAR y preguntarme antes de asumir una decisión;
7. al cerrar cada bloque principal, actualizar este documento.

Convenciones:
- tipado estricto, sin any;
- varios exports → no default export;
- líneas en blanco separan conceptos, no propiedades del mismo objeto;
- utilidades Angular y Electron/backend separadas;
- no abstracciones genéricas prematuras;
- archivo nuevo completo; archivo existente con ruta y ubicación clara.

Batería habitual:
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```
