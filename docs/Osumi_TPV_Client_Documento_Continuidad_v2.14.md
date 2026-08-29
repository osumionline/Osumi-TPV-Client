# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.14  
**Fecha:** 29 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal, Ventas 1–11 y Ventas 12C.1–12C.7 están completados, probados y subidos. En TicketBAI ordinario están completados **12C.8A**, **12C.8B**, **12C.8C**, **12C.8D** y **12C.8E.1–12C.8E.2**. La integración real contra TicketBaiWS TEST ha sido validada con un flujo auténtico `PENDING → pendiente_remoto → reconcile() → OK → aceptada`, con ticket fiscal, referencia TicketBAI y QR correctos. El siguiente punto es **12C.8E.3 — reintento manual**.

> **Regla crítica de entorno:** el producto sigue usando `production` por defecto. Durante el desarrollo y todas las pruebas manuales actuales se debe asumir `app_data.json → ticketBai.environment = "test"` para evitar envíos fiscales reales. Cuando se usa TEST, también debe utilizarse el **token de TEST** correspondiente; un token de producción contra TEST devuelve `TOKEN error`. No cambiar el default del producto ni añadir selector de entorno a la UI.

---

# 1. Propósito

Este documento debe permitir abrir una conversación nueva desde cero y continuar Osumi TPV Client sin reconstruir el contexto anterior.

Usarlo junto con el código actual de `main`. Si GitHub Raw parece stale o no se puede verificar frescura, pedir solo los archivos actuales necesarios y tratarlos como fuente de verdad.

---

# 2. Estado resumido

```text
Installation + importación .otpv v2               ✅
Startup                                           ✅
Auditoría + Refactor A–E                          ✅
Ventas 1–11                                       ✅

Ventas 12 — Postventa                             🟦
  12A Análisis funcional legacy                   ✅
  12B Diseño funcional                            ✅ salvo devoluciones TicketBAI
  12C Implementación                              🟦
    12C.1 Histórico — infraestructura             ✅
    12C.2 Histórico — filtros/listado/totales     ✅
    12C.3 Histórico — detalle                     ✅
    12C.4 Correcciones postventa                  ✅
    12C.5 Pipeline documental                     ✅
    12C.6 Impresión                               ✅
    12C.7 Email                                   ✅

    12C.8 TicketBAI ordinario                     🟦
      12C.8A Modelo/mapping/legacy                ✅
      12C.8B Infraestructura backend              ✅
      12C.8C Envío automático post-COMMIT         ✅
        12C.8C.1 Caso de uso + wiring             ✅
        12C.8C.2 Activación real post-COMMIT      ✅
      12C.8D Ticket fiscal + PDF                  ✅
        12C.8D.1 Snapshot + representación        ✅
        12C.8D.2A Semántica async/PENDING         ✅
        12C.8D.2B Orden/versionado post-COMMIT    ✅
      12C.8E Histórico + reconciliación/reintento 🟦
        12C.8E.1 Estado TicketBAI en Histórico    ✅
        12C.8E.2 Reconciliación remota            ✅
        12C.8E.3 Reintento manual                 🟦 SIGUIENTE
        12C.8E.4 UI + regeneración documental     ⬜
      12C.8F Prueba real TEST + cierre            🟦
        Envío real PENDING + ticket fiscal        ✅
        Reconciliación real PENDING → OK          ✅
        Reintento manual real                     ⬜
        Cierre integral                           ⬜

    12C.9 TicketBAI devoluciones/mixtas           ⏸️ Berein
    12C.10 Regresión integral                     ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física, no bloqueante
```

Todo lo marcado ✅ pasó su batería de tests/pruebas y está subido al repositorio.

---

# 3. Repositorios y entorno

| Elemento | Valor |
| --- | --- |
| Cliente | https://github.com/osumionline/Osumi-TPV-Client |
| Frontend antiguo | https://github.com/osumionline/Osumi-TPV |
| Backend antiguo | https://github.com/osumionline/TPV-API |
| API futura | https://github.com/osumionline/TPV-Client-API |
| SDK TicketBaiWS | https://github.com/osumionline/ticketbaiws |
| SO | Windows 11 |
| Editor | VS Code |
| Zona | Europe/Madrid |

Arquitectura: Angular → contratos públicos → preload/IPC → backend Electron/Node → application services → repositories/infraestructura → SQLite/filesystem/safeStorage/servicios externos.

---

# 4. Convenciones y workflow obligatorio

- Angular standalone, signals, `computed`, `input()`, `output()`, `inject()`.
- Angular 22: no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- `@if`, `@for`, `@switch`.
- TypeScript estricto; **no `any`**.
- `unknown` cuando corresponda.
- `export default` solo con un único export.
- **Líneas en blanco solo para separar conceptos o bloques estructurales.**
- En interfaces, objetos, argumentos, arrays de propiedades y estructuras relacionadas: **una propiedad por línea, sin líneas en blanco entre ellas**.
- Angular y Electron/backend mantienen utilidades separadas.
- Evitar abstracciones prematuras.
- Archivo nuevo: completo.
- Archivo existente: ruta + punto exacto de cambio.
- Al pedir modificar código existente, mostrar siempre:
  1. fragmento actual reconocible;
  2. fragmento nuevo;
  3. ubicación inequívoca.
- **Todo método TS/JS añadido o propuesto lleva JSDoc breve**, incluidos helpers privados y fakes de test.

Al empezar cualquier fase/subpaso:

1. mostrar estado completo con ✅ / 🟦 / ⬜ / ⏸️;
2. explicar objetivo en 1–2 párrafos;
3. revisar `main` o archivos actuales;
4. trabajar en lotes coherentes de varios archivos;
5. ante ambigüedad funcional/fiscal/UX/documental/arquitectónica, preguntar antes;
6. no avanzar sin confirmación.

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

El usuario aplica cambios, prueba, ejecuta batería y sube antes de continuar.

---

# 5. Política actual de esquema SQLite durante desarrollo

La aplicación sigue en desarrollo y **no hay usuarios reales**.

Por tanto:

- no implementar migraciones de base de datos por ahora;
- cuando cambie el esquema de forma incompatible:
  - actualizar la versión de esquema;
  - borrar los datos locales;
  - crear la instalación de cero;
  - importar nuevamente un `.otpv`.

Esta política es deliberada y evita introducir infraestructura de migraciones prematuramente.

Cuando la aplicación tenga usuarios reales, esta decisión deberá revisarse.

**Cambio aplicado durante TicketBAI:**

```text
DATABASE_SCHEMA_VERSION
1 → 2
```

Motivo: añadir `pendiente_remoto` al `CHECK` de `venta_ticketbai.estado`.

---

# 6. Hitos cerrados que no deben reabrirse

## 6.1 Installation / `.otpv` v2 ✅

Configuración:

```text
app_data.json
├── emailSmtp
└── ticketBai
    ├── nif
    └── environment

secrets.json mediante safeStorage
├── emailSmtpPass
└── ticketBaiToken
```

Política TicketBAI:

```text
default producto                  → production
importación .otpv legacy          → production
app_data antiguo sin environment  → production
edición manual environment=test   → respetada
valor inválido                    → error
```

Durante desarrollo:

```text
environment = test
→ usar también token TEST
```

No exponer selector de entorno en Installation/UI.

## 6.2 Ventas 1–11 ✅

Persistencia comercial, stock, caja, pagos, reservas, devoluciones, ticket, PDF e impresión están cerrados.

Regla central:

```text
COMMIT comercial
→ la venta ya es definitiva
→ cualquier fallo posterior nunca hace rollback ni permite repetir save()
```

## 6.3 Ventas 12C.1–12C.7 ✅

Cerrados:

- Histórico;
- filtros/listado/totales;
- detalle;
- cambio cliente/pago;
- `ticket_revision` / `ticket_pdf_revision`;
- `{id}.pdf` vigente y `{id}_{timestamp}.pdf` histórico;
- ticket regalo;
- reimpresión y reparación documental;
- email SMTP;
- SMTP real validado;
- prefill del email actual del cliente sin persistirlo.

Ticket regalo nunca lleva QR/bloque TicketBAI.

---

# 7. TicketBAI ordinario — decisiones cerradas

Solo ventas ordinarias. Devoluciones y operaciones mixtas siguen bloqueadas hasta respuesta de Berein.

Mapping:

```text
simplificada                 → true
serie                         → TPV01
numero                        → venta.numero padded a 6
rectificativa                 → false
retencion                     → 0
modo_recargo_equivalencia    → true
total_factura                 → totalCents / 100
```

Cliente: no se envían datos fiscales aunque exista cliente.

Línea:

```text
descripcion      → snapshot nombre
cantidad         → unidades
importe_unitario → PVP sin IVA, 4 decimales
tipo_iva         → ivaBps / 100
tipo_req         → 0
```

Descuentos: línea positiva + línea negativa `Descuento - {nombre}`.

El mapper deriva el descuento efectivo desde:

```text
pvp_micros * unidades - importe_micros
```

No añadir `req_bps`. No derivar RE desde `AppData.reList`. No inventar flags fiscales opcionales.

Regalo ordinario: artículo positivo + descuento completo negativo = 0.

---

# 8. SDK `@osumi/ticketbaiws` 1.0.1 ✅

Versión utilizada:

```text
@osumi/ticketbaiws 1.0.1
```

La 1.0.1 corrigió el bloqueo que existía en 1.0.0:

```text
Berein
→ PENDING + huella + QR + URL

SDK 1.0.0
→ lo trataba como respuesta inválida

SDK 1.0.1
→ PENDING válido
→ conserva huella/QR/URL
```

Semántica relevante:

```text
create()
  OK      → válido
  PENDING → válido
  ERROR   → TicketBaiWsApiError

get()
  return.status = OK | PENDING | ERROR

resend()
  disponible para reencolar una factura existente
```

No forzar `sincrono: true`.

No HTTP ad-hoc a Berein. Todo pasa por el SDK.

---

# 9. 12C.8A ✅ — configuración, modelo, legacy y mapping

Contrato:

```ts
type TicketBaiEnvironment = 'test' | 'production';

interface TicketBaiConfig {
  readonly nif: string | null;
  readonly environment: TicketBaiEnvironment;
}
```

`venta_ticketbai` conserva identidad congelada:

```text
entorno
nif_emisor
serie
numero
```

Estados actuales:

```text
no_aplica
legacy
pendiente
enviando
pendiente_remoto
aceptada
rechazada
error_temporal
error_permanente
anulada
```

Importación legacy:

```text
hay huella/qr/url
→ legacy
→ entorno production
→ serie TPV01
→ numero padded 6
→ nif_emisor null

sin datos fiscales
→ no_aplica
```

No fiscalizar retrospectivamente ventas antiguas sin datos. No inventar NIF histórico.

---

# 10. 12C.8B ✅ — infraestructura backend

Encapsulado tras:

```text
TicketBaiClient
TicketBaiClientConfiguration
TicketBaiCreateInvoiceRequest
TicketBaiCreateInvoiceResult
TicketBaiGetInvoiceResult
TicketBaiInvoiceReference
```

Errores normalizados:

```text
rejected
temporary
permanent
```

Adaptador:

```text
TicketBaiWsTicketBaiClient
```

Mapper:

```text
VentaTicketBaiMapper
```

Repository:

```text
VentasTicketBaiRepository
TypeOrmVentasTicketBaiRepository
```

Garantías:

- idempotencia;
- identidad congelada;
- no transacción SQLite durante red;
- no auto-retry;
- `legacy/no_aplica` no se transforman;
- `PENDING` conserva artefacto fiscal;
- reconciliación nunca recrea a ciegas.

---

# 11. 12C.8C ✅ — envío automático post-COMMIT

`VentaPostCommitService` integra ya TicketBAI.

Orden protegido por tests:

```text
COMMIT comercial
↓
estadísticas
↓
reservas si corresponde
↓
TicketBAI
↓
PDF
↓
impresión si imprimirTicket = true
```

Regla crítica:

```text
TicketBAI falla
→ NO rollback
→ warning al usuario
→ PDF continúa
→ impresión continúa si corresponde
```

`imprimirTicket` **se conserva**:

```text
true  → imprimir
false → no imprimir
```

Declinar la impresión física no evita TicketBAI ni la generación del PDF.

---

# 12. Política cerrada ante fallo TicketBAI

Si TicketBAI falla y no se obtiene huella/QR/URL:

```text
venta comercial válida ✅
estado fiscal de incidencia ✅
mostrar warning al usuario ✅
generar PDF sin bloque TicketBAI ✅
imprimir ticket sin QR fiscal si imprimirTicket = true ✅
Histórico mostrará incidencia TicketBAI ✅
reconciliar/reintentar posteriormente desde Histórico ✅
```

Nunca bloquear la entrega del ticket comercial por un fallo fiscal post-COMMIT.

El ticket sin QR no se considera una emisión TicketBAI correctamente finalizada; la incidencia permanece abierta hasta resolverse.

Cuando se resuelva posteriormente:

```text
si aparece/cambia artefacto fiscal
→ ticket_revision++
→ regeneración documental posterior
```

El reintento/reconciliación manual **no auto-imprime**.

---

# 13. 12C.8D ✅ — ticket fiscal, PENDING y versionado

## 13.1 Snapshot

`VentaTicketInterface` contiene:

```ts
ticketBai: VentaTicketBaiDocumentInterface | null;
```

Datos:

```text
serie
numero
identificativo
qr
url
```

El snapshot expone bloque fiscal para:

```text
pendiente_remoto
aceptada
legacy
```

No lo expone para:

```text
rechazada
error_temporal
error_permanente
enviando
pendiente
no_aplica
```

## 13.2 Referencia documental

Opción A aprobada:

```text
venta.numero = 15
TicketBAI = TPV01 / 000015

ticket:
F. simplificada TPV01-000015
```

## 13.3 Ticket normal

Conviven:

```text
QR comercial local → -idVenta
QR fiscal          → Base64 devuelto por Berein
```

Bloque fiscal al pie:

```text
identificativo
QR TicketBAI (~34 mm)
```

La URL no se imprime como texto.

## 13.4 Ticket regalo

Puede usar la referencia fiscal de la venta original, pero:

- no identificativo TicketBAI;
- no QR fiscal;
- conserva QR comercial.

## 13.5 Semántica PENDING

Flujo real:

```text
pendiente
  ↓
enviando
  ↓
┌─────────────────────┬────────────────────┐
│ PENDING             │ OK                 │
↓                     ↓
pendiente_remoto      aceptada
│                     │
│ huella/QR/URL        │ huella/QR/URL
└──── documento fiscal listo ───────────────┘
```

Regla documental:

```text
primera aparición de huella + QR + URL
→ ticket_revision++
```

Puede ocurrir en `PENDING`.

Después:

```text
pendiente_remoto → aceptada
```

si el artefacto fiscal no cambia:

```text
NO ticket_revision++
```

Si cambia huella/QR/URL:

```text
ticket_revision++
```

Esta semántica está cubierta por tests SQLite.

---

# 14. Prueba real TicketBaiWS TEST ✅

Se realizó una venta ordinaria real contra TEST:

```text
producto: 3,80 €
entregado: 4,00 €
cambio: 0,20 €
```

TicketBaiWS devolvió:

```json
{
  "result": "PENDING",
  "return": {
    "huella_tbai": "TBAI-...",
    "qr": "...",
    "url": "https://batuz.eus/QRTBAI/..."
  },
  "msg": null
}
```

Persistencia comprobada:

```text
estado = pendiente_remoto
huella != null
qr != null
url != null
respuesta_payload = respuesta completa
ticket_revision = revisión fiscal vigente
ticket_pdf_revision = misma revisión tras generar PDF
```

Ticket físico/PDF comprobado:

```text
referencia fiscal correcta
identificativo TicketBAI
QR TicketBAI correcto
QR comercial sigue presente
```

El importe fiscal enviado fue correctamente `3.80`; el efectivo entregado y el cambio no forman parte del importe de factura.

---

# 15. 12C.8E.1 ✅ — estado TicketBAI en Histórico

El Histórico ya tenía placeholders:

```text
tieneIncidenciaTicketBai
puedeReintentarTicketBai
```

Ahora se añadió un estado simplificado público:

```ts
type VentaHistoricoTicketBaiEstado =
  | 'no_aplica'
  | 'correcto'
  | 'pendiente'
  | 'incidencia';
```

Mapping:

```text
sin fila / no_aplica
→ no_aplica

aceptada / legacy / anulada
→ correcto

pendiente / pendiente_remoto
→ pendiente

enviando / rechazada / error_temporal / error_permanente
→ incidencia
```

Reglas:

```text
pendiente
→ NO incidencia
→ NO puedeReintentarTicketBai

incidencia
→ tieneIncidenciaTicketBai = true
→ puedeReintentarTicketBai = true
```

La futura UI podrá distinguir:

```text
correcto
→ OK

pendiente
→ acción "Comprobar TicketBAI"

incidencia
→ icono rojo / resolución

no_aplica
→ sin TicketBAI
```

---

# 16. 12C.8E.2 ✅ — reconciliación remota

Se añadió al contrato interno:

```text
TicketBaiClient.getInvoice()
```

Adaptador:

```text
TicketBaiWsTicketBaiClient
→ client.invoices.get({ serie, numero })
```

Mapping:

```text
return.status = PENDING → pending
return.status = OK      → accepted
return.status = ERROR   → rejected
```

## 16.1 Identidad congelada

La reconciliación usa:

```text
venta_ticketbai.entorno
venta_ticketbai.nif_emisor
venta_ticketbai.serie
venta_ticketbai.numero
```

**No** usa el entorno/NIF actual de `app_data`.

Ejemplo:

```text
venta enviada originalmente a TEST
→ siempre se reconcilia contra TEST
```

aunque después la configuración global cambie.

El token sí se obtiene del almacenamiento seguro actual.

## 16.2 Estados reconciliables

```text
pendiente_remoto
enviando
error_temporal
```

Estados definitivos no se consultan automáticamente.

## 16.3 Reglas de reconciliación

```text
GET → PENDING
→ pendiente_remoto
→ actualizar artefacto/payload
→ ticket_revision solo si artefacto cambia

GET → OK
→ aceptada
→ aceptado_at
→ ticket_revision solo si artefacto cambia

GET → ERROR
→ rechazada
→ si veníamos de pendiente_remoto:
     ticket_revision++
     snapshot deja de exponer TicketBAI
→ si veníamos de estado sin artefacto visible:
     no cambia revisión
```

Si falla el propio `GET`:

```text
no sabemos nada nuevo
→ no modificar estado local
→ propagar error
```

## 16.4 Bridge completo

La reconciliación está expuesta por:

```text
IPC channel
VentasApi
preload
VentaTicketBaiService Angular
```

Método público:

```ts
reconcile(idVenta: number): Promise<void>
```

## 16.5 Prueba real TEST

Sobre la venta real anterior:

```text
estado inicial: pendiente_remoto
↓
window.osumiDesktop.ventas.reconcileTicketBai(idVenta)
↓
TicketBaiWS get()
↓
OK
↓
estado final: aceptada
```

Comprobado:

```text
aceptado_at != null
huella / qr / url sin cambios
ticket_revision sin cambios
```

Esto valida de extremo a extremo:

```text
create()
→ PENDING
→ pendiente_remoto
→ ticket fiscal
→ reconcile()
→ GET
→ OK
→ aceptada
```

---

# 17. 12C.8E.3 — próximo paso exacto

**Siguiente punto: reintento manual.**

Principios cerrados:

```text
pendiente_remoto
enviando
error_temporal
→ reconcile()
→ nunca resend/create a ciegas
```

```text
rechazada
→ candidata a resend()
```

```text
error_permanente
→ no reintentar automáticamente
→ corregir primero la causa/configuración
```

```text
aceptada
legacy
no_aplica
anulada
→ sin reintento
```

SDK disponible:

```text
invoices.resend({ serie, numero })
```

Objetivo de 12C.8E.3:

1. añadir `resendInvoice()` al `TicketBaiClient`;
2. implementar adaptador con `invoices.resend()`;
3. mantener identidad fiscal congelada;
4. usar `beginManualAttempt()` para proteger concurrencia/idempotencia;
5. procesar resultado:
   - `PENDING → pendiente_remoto`;
   - `OK → aceptada`;
   - `ERROR → rechazada`;
6. no auto-imprimir;
7. actualizar revisión si aparece/cambia artefacto;
8. tests;
9. exponer por IPC/preload/Angular;
10. prueba real TEST si existe un caso seguro.

**No implementar `create()` a ciegas como reintento.**

---

# 18. 12C.8E.4 — pendiente después del reintento

UI de Histórico:

```text
correcto
→ indicador normal/OK

pendiente
→ acción Comprobar TicketBAI

incidencia
→ icono de error
→ acción resolver/reintentar

no_aplica
→ sin indicador fiscal
```

Tras una resolución que cambie/aparezca artefacto:

```text
ticket_revision cambia
→ regenerar PDF
```

El éxito manual:

```text
NO auto-imprime
```

La reimpresión será acción explícita del usuario.

---

# 19. Devoluciones/mixtas TicketBAI ⏸️

Siguen bloqueadas hasta respuesta/documentación de Berein.

No reutilizar automáticamente el flujo ordinario.

No modificar el mapper ordinario para aceptar devoluciones/mixtas sin decisión fiscal explícita.

---

# 20. Notas para mi “yo del futuro”

1. **No mezclar SDK y Client.** El SDK se desarrolla en otra conversación; aquí se consume la versión publicada.
2. SDK actual requerido: `@osumi/ticketbaiws` 1.0.1.
3. **PENDING es válido** y puede traer huella/QR/URL.
4. No forzar `sincrono: true`.
5. **No HTTP ad-hoc a Berein.**
6. No exponer token al renderer.
7. Default real = production; desarrollo = test manual.
8. **TEST requiere token TEST.**
9. QR comercial y QR fiscal son distintos y pueden convivir.
10. Opción A de referencia aprobada: `TPV01-000015`.
11. Ticket regalo jamás lleva bloque fiscal TicketBAI.
12. Mapping fiscal parte de snapshot persistido.
13. No auto-retry.
14. No create ciego tras timeout/error ambiguo.
15. `pendiente_remoto → aceptada` con mismo artefacto no incrementa revisión.
16. Si cambia artefacto, sí incrementa revisión.
17. No marcar PDF vigente si no coincide con `ticket_revision`.
18. **Fallo TicketBAI nunca bloquea el ticket comercial.**
19. Si TicketBAI falla: warning + PDF/ticket sin QR fiscal + incidencia en Histórico.
20. Reconciliación usa identidad fiscal congelada.
21. Fallo del GET no modifica estado local.
22. Éxito manual no auto-imprime.
23. `pendiente` no es incidencia.
24. `incidencia` sí habilita resolución/reintento.
25. Devoluciones/mixtas siguen bloqueadas por Berein.
26. Mientras no haya usuarios reales, **no implementar migraciones de BD**; borrar datos y reimportar `.otpv`.
27. GitHub Raw ha estado stale: pedir archivos concretos actuales si hay duda.
28. El usuario prefiere lotes coherentes, no micro-pasos.
29. Al indicar cambios, siempre fragmento actual → fragmento nuevo.
30. Líneas en blanco solo estructurales; no entre propiedades relacionadas.

---

# 21. Limitaciones/bloqueos

1. Devoluciones/mixtas TicketBAI bloqueadas hasta Berein.
2. Reintento manual (`resend`) todavía pendiente.
3. UI final de estado/incidencia TicketBAI en Histórico pendiente.
4. Regeneración documental posterior a resolución manual pendiente.
5. Star TSP100/TSP143 80 mm: prueba física pendiente/no bloqueante.
6. GitHub Raw puede estar stale.
7. Toda prueba real TicketBAI durante desarrollo debe usar `environment = "test"` y token TEST.

---

# 22. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.9 | 26/08/2026 | Impresión cerrada; siguiente Email |
| 2.10 | 26/08/2026 | Email backend/config avanzado |
| 2.11 | 26/08/2026 | Email cerrado |
| 2.12 | 28/08/2026 | 12C.8A + 12C.8B cerrados |
| 2.13 | 28/08/2026 | 12C.8C.1 + 12C.8D.1 cerrados; pausa por PENDING |
| **2.14** | **29/08/2026** | **SDK 1.0.1, PENDING completo, post-COMMIT real, prueba TEST, Histórico fiscal y reconciliación PENDING → OK cerrados; siguiente reintento manual** |

---

# 23. Próximo paso exacto en una nueva conversación

Continuar desde:

```text
12C.8E.3 — Reintento manual TicketBAI
```

Antes de tocar código:

1. revisar `main` actual;
2. revisar API/tipos reales de `invoices.resend()` en `@osumi/ticketbaiws` 1.0.1;
3. mantener identidad fiscal congelada;
4. diseñar el flujo desde `rechazada`;
5. no reutilizar `create()` como retry;
6. no auto-imprimir tras éxito;
7. tests antes de UI;
8. después continuar con 12C.8E.4.

Archivos probables:

```text
electron/backend/contracts/ticket-bai/ticket-bai-client.interface.ts
electron/infrastructure/ticket-bai/ticket-bai-ws.client.ts
electron/backend/contracts/ventas/venta-ticket-bai-record-command.interface.ts
electron/backend/contracts/ventas/ventas-ticket-bai.repository.interface.ts
electron/infrastructure/database/typeorm/typeorm-ventas-ticket-bai.repository.ts
electron/backend/application/ventas/ventas-ticket-bai.service.ts
electron/ipc/channels.ts
electron/ipc/register-ventas-ipc.ts
electron/contracts/ventas/ventas-api.interface.ts
electron/preload.ts
src/app/services/venta-ticket-bai.service.ts
electron/backend/application/ventas/ventas-ticket-bai.service.spec.ts
electron/infrastructure/ticket-bai/ticket-bai-ws.client.spec.ts
electron/infrastructure/database/typeorm/typeorm-ventas-ticket-bai.repository.spec.ts
```

---

# 24. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.14.

Punto exacto:
- Ventas 12C.1–12C.7 ✅
- TicketBAI ordinario:
  - 12C.8A ✅
  - 12C.8B ✅
  - 12C.8C ✅
  - 12C.8D ✅
  - 12C.8E.1 ✅
  - 12C.8E.2 ✅
  - 12C.8E.3 🟦 siguiente
- @osumi/ticketbaiws 1.0.1 está publicada e instalada.
- PENDING está soportado correctamente.
- Se ha validado un envío real TEST:
  create → PENDING → pendiente_remoto → ticket con QR → reconcile → GET → OK → aceptada.
- La reconciliación usa entorno/NIF/serie/número congelados de venta_ticketbai.
- Fallo TicketBAI nunca bloquea PDF/ticket comercial.
- Si falla TicketBAI se muestra warning, se imprime sin QR fiscal y queda incidencia para Histórico.
- Histórico distingue no_aplica / correcto / pendiente / incidencia.
- Mientras no haya usuarios reales no se implementan migraciones de BD: se borran datos y se reimporta .otpv.
- Desarrollo TicketBAI: environment=test y token TEST.
- El siguiente punto es reintento manual usando invoices.resend(), nunca create() a ciegas.
- Éxito manual no auto-imprime.
- Devoluciones/mixtas TicketBAI siguen bloqueadas hasta Berein.
- Mantén estado ✅/🟦/⬜/⏸️ al inicio de cada paso, revisa main antes de patches, JSDoc en todos los métodos TS/JS, no any y trabaja en lotes coherentes.
- Al indicar cambios en archivos existentes, muestra siempre fragmento actual → fragmento nuevo.
- Líneas en blanco solo estructurales; nunca entre propiedades relacionadas.
```

---

**Fin del documento de continuidad v2.14.**
