# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.13  
**Fecha:** 28 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal, Ventas 1–11 y Ventas 12C.1–12C.7 están completados, probados y subidos. En TicketBAI ordinario están completados **12C.8A**, **12C.8B**, **12C.8C.1** y **12C.8D.1**. El desarrollo del Client queda en **pausa técnica** antes de activar el envío real post-COMMIT porque `@osumi/ticketbaiws` 1.0.0 no modela correctamente las respuestas asíncronas `PENDING` de Berein. El SDK se corregirá en una conversación independiente y se publicará como **1.0.1**. Cuando esa versión esté disponible, retomar desde **12C.8D.2A / 12C.8C.2**.

> **Regla crítica de entorno:** el producto sigue usando `production` por defecto. Durante el desarrollo y todas las pruebas manuales actuales se debe asumir `app_data.json → ticketBai.environment = "test"` para evitar envíos fiscales reales. No cambiar el default del producto ni añadir selector de entorno a la UI.

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

    12C.8 TicketBAI ordinario                     🟦 EN PAUSA TÉCNICA
      12C.8A Modelo/mapping/legacy                ✅
      12C.8B Infraestructura backend              ✅
      12C.8C Envío automático post-COMMIT         🟦
        12C.8C.1 Caso de uso + wiring             ✅
        12C.8C.2 Activación real post-COMMIT      ⬜ tras SDK 1.0.1
      12C.8D Ticket fiscal + PDF                  🟦
        12C.8D.1 Snapshot + representación        ✅
        12C.8D.2A Semántica async/PENDING         ⏸️ SDK 1.0.1
        12C.8D.2B Orden/versionado post-COMMIT    ⬜
      12C.8E Histórico + reconciliación/reintento ⬜
      12C.8F Prueba real TEST + cierre            ⬜

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


# 4. Convenciones y workflow obligatorio

- Angular standalone, signals, `computed`, `input()`, `output()`, `inject()`.
- Angular 22: no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- `@if`, `@for`, `@switch`.
- TypeScript estricto; **no `any`**.
- `unknown` cuando corresponda.
- `export default` solo con un único export.
- Líneas en blanco para separar conceptos, no propiedades relacionadas.
- Angular y Electron/backend mantienen utilidades separadas.
- Evitar abstracciones prematuras.
- Archivo nuevo: completo.
- Archivo existente: ruta + punto exacto de cambio.
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

# 5. Hitos cerrados que no deben reabrirse

## 5.1 Installation / `.otpv` v2 ✅

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

Durante el desarrollo actual el usuario cambia manualmente a `test`.

No exponer selector de entorno en Installation/UI.

## 5.2 Ventas 1–11 ✅

Persistencia comercial, stock, caja, pagos, reservas, devoluciones, ticket, PDF e impresión están cerrados.

Regla central:

```text
COMMIT comercial
→ la venta ya es definitiva
→ cualquier fallo posterior nunca hace rollback ni permite repetir save()
```

## 5.3 Ventas 12C.1–12C.7 ✅

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


# 6. TicketBAI ordinario — decisiones cerradas

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

El mapper actual deriva el descuento efectivo desde:

```text
pvp_micros * unidades - importe_micros
```

No añadir `req_bps`. No derivar RE desde `AppData.reList`. No inventar flags fiscales opcionales.

Regalo ordinario: artículo positivo + descuento completo negativo = 0.

---

# 7. 12C.8A ✅ — configuración, modelo, legacy y mapping

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
aceptada
rechazada
error_temporal
error_permanente
anulada
```

Tras descubrir `PENDING`, probablemente habrá que añadir `pendiente_remoto`.

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

Se validó borrando datos locales y reimportando un `.otpv` real.

---

# 8. 12C.8B ✅ — infraestructura backend

SDK instalado actualmente:

```text
@osumi/ticketbaiws 1.0.0
```

Encapsulado tras:

```text
TicketBaiClient
TicketBaiClientConfiguration
TicketBaiCreateInvoiceRequest
TicketBaiCreateInvoiceResult
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

Parte del snapshot persistido y excluye devoluciones/mixtas.

Repository:

```text
VentasTicketBaiRepository
TypeOrmVentasTicketBaiRepository
```

Operaciones:

```text
findByVentaId
initializeNoAplica
initializePending
beginInitialAttempt
beginManualAttempt
markAccepted
markFailure
```

Garantías:

- idempotencia;
- identidad congelada;
- `pendiente → enviando` adquirido una sola vez;
- no transacción SQLite durante red;
- no auto-retry;
- `legacy/no_aplica` no se transforman.

**Implementación actual previa a PENDING:**

```text
markAccepted()
→ huella/qr/url
→ ticket_revision++
```

Esta regla tendrá que cambiar si `PENDING` entrega ya el artefacto fiscal.


# 9. 12C.8C.1 ✅ — caso de uso + wiring

Servicio backend:

```text
VentasTicketBaiService.processInitial(idVenta)
```

Flujo:

```text
estado existente
↓
app_data
↓
ticketBaiToken desde safeStorage
↓
snapshot venta desde SQLite
↓
VentaTicketBaiMapper
↓
initializePending
↓
beginInitialAttempt
↓
TicketBaiClient.createInvoice
↓
markAccepted / markFailure
```

Reglas:

- TicketBAI no configurado → `no_aplica`;
- error/rechazo existente → no retry automático;
- secretos no cruzan IPC;
- renderer solo envía `idVenta`;
- error inesperado no normalizado puede dejar `enviando` para reconciliación.

Wiring hecho:

```text
application-composition.ts
IPC
register-ventas-ipc.ts
VentasApi
preload.ts
servicio Angular VentaTicketBaiService
```

**Importante:** el bridge existe pero todavía **NO se llama desde `VentaPostCommitService`**. Fue intencional para no activar envíos reales antes de cerrar la semántica y el pipeline documental.

---

# 10. 12C.8D.1 ✅ — snapshot y representación fiscal

`VentaTicketInterface` tiene ahora:

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

El campo es obligatorio; fixtures no fiscalizados deben usar `ticketBai: null`.

`TypeOrmVentasTicketsRepository` hace `LEFT JOIN venta_ticketbai`.

**Estado actual previo a PENDING:** solo expone datos documentales para:

```text
aceptada
legacy
```

Esto deberá ampliarse a `pendiente_remoto`.

## Referencia documental — opción A aprobada

Si existe identidad fiscal, esa es la referencia principal:

```text
venta.numero = 15
TicketBAI = TPV01 / 000015

ticket:
F. simplificada TPV01-000015
```

Sin TicketBAI se conserva referencia comercial.

## Ticket normal

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

## Ticket regalo

Puede usar la referencia fiscal de la venta original, pero:

- no identificativo TicketBAI;
- no QR fiscal;
- conserva QR comercial.

D.1 pasó tests y cambios están subidos.


# 11. BLOQUEO ACTUAL — SDK 1.0.0 y `PENDING`

TicketBaiWS/Berein trabaja por defecto con procesamiento asíncrono.

Una creación válida puede devolver:

```json
{
  "result": "PENDING",
  "return": {
    "huella_tbai": "TBAI-...",
    "qr": "...",
    "url": "..."
  },
  "msg": null
}
```

Aunque el procesamiento remoto siga pendiente, huella/QR/URL ya están disponibles.

El problema:

```text
Berein
→ PENDING + huella + QR + URL

@osumi/ticketbaiws 1.0.0
→ lo considera respuesta inválida
→ TicketBaiWsResponseError

Osumi TPV Client
→ perdería un artefacto fiscal válido
```

**No activar envío real post-COMMIT hasta corregirlo.**

Existe documento auxiliar:

```text
TicketBaiWS_v1.0.1_cambios_pendientes.md
```

El SDK se desarrollará en otra conversación.

Objetivo de 1.0.1:

```text
PENDING como respuesta válida
OK sigue válido
ERROR sigue → TicketBaiWsApiError
huella/QR/URL conservados en PENDING
sincrono?: boolean
tests
README/docs
npm check
publicar @osumi/ticketbaiws 1.0.1
```

Inconsistencia de documentación de Berein a registrar:

- algunas páginas dicen `OK | ERROR`;
- FAQ/ejemplos actuales muestran `PENDING`.


# 12. Diseño esperado cuando exista SDK 1.0.1

No codificar literalmente hasta revisar la API publicada.

## 12.1 Estado probable `pendiente_remoto`

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

Reconciliación posterior:

```text
pendiente_remoto
  ├─ get() → PENDING → sigue
  ├─ get() → OK      → aceptada
  └─ get() → ERROR   → incidencia/rechazo
```

## 12.2 Revisión documental

Regla actual:

```text
markAccepted → ticket_revision++
```

Regla esperada:

```text
primera aparición de huella + QR + URL
→ ticket_revision++
```

Esto puede ocurrir en `PENDING`.

Después:

```text
pendiente_remoto → aceptada
```

si los datos fiscales no cambian:

```text
NO incrementar ticket_revision otra vez
```

## 12.3 Snapshot

El ticket debería exponer bloque fiscal para:

```text
pendiente_remoto
aceptada
legacy
```

---

# 13. DECISIÓN ABIERTA — qué hacer si no obtenemos QR

No asumir respuesta futura.

Antes del descubrimiento de `PENDING`, el diseño decía:

```text
fallo fiscal
→ venta sigue válida
→ imprimir ticket comercial sin QR fiscal
```

Esto quedó **en revisión**.

Se planteó:

```text
COMMIT comercial ✅
↓
TicketBAI configurado
↓
no obtenemos huella/QR/URL
↓
venta sigue guardada ✅
estado fiscal de incidencia ✅
pero NO presentar una factura TicketBAI definitiva sin identificativo/QR
```

Posible alternativa:

```text
COMPROBANTE PROVISIONAL — PENDIENTE DE TICKETBAI
```

El usuario no llegó a confirmar esta política porque se decidió pausar el Client y corregir primero el SDK.

Cuando vuelva con 1.0.1:

1. revisar semántica real;
2. volver a plantear esta decisión si sigue siendo necesaria;
3. no conservar automáticamente la regla antigua.


# 14. Reconciliación/reintento pendiente

Principios ya acordados:

- no reintento automático posterior desde el Client;
- acción manual desde Histórico;
- éxito manual no auto-imprime.

Ante timeout/error ambiguo:

```text
consultar remoto por serie + numero
↓
existe OK
→ reconciliar

existe ERROR
→ resend

no existe
→ create
```

No hacer `create()` a ciegas tras timeout.

---

# 15. Orden post-COMMIT pendiente

Actualmente `VentaPostCommitService` hace, esencialmente:

```text
invalidar estadísticas
recargar reservas
generar PDF
imprimir
```

`VentaTicketBaiService` todavía no está integrado ahí.

Orden objetivo tras 1.0.1:

```text
COMMIT comercial
↓
TicketBAI
↓
si aparece artefacto fiscal
    actualizar revisión
    ↓
    generar PDF fiscal de esa revisión
    ↓
    imprimir
else
    aplicar política de incidencia que se decida
```

Nunca:

- transacción SQLite abierta durante red;
- rollback de venta por TicketBAI;
- marcar vigente un PDF cuyo contenido no corresponde a `ticket_revision`.

---

# 16. Próximo paso exacto en una nueva conversación

**Antes de tocar código preguntar si `@osumi/ticketbaiws` 1.0.1 ya está publicada.**

Si NO:

```text
mantener pausa técnica
```

Si SÍ:

1. revisar API/tipos/changelog reales de 1.0.1;
2. instalar/actualizar:
   `npm install @osumi/ticketbaiws@^1.0.1`;
3. revisar `main` actual;
4. adaptar contrato/adaptador a `OK | PENDING`;
5. añadir `pendiente_remoto` si sigue siendo correcto;
6. mover el incremento de `ticket_revision` al primer artefacto fiscal;
7. incluir `pendiente_remoto` en snapshot documental;
8. resolver explícitamente política sin QR;
9. cerrar orden TicketBAI → PDF → impresión;
10. activar `processInitial()` desde post-COMMIT;
11. tests/fakes;
12. batería completa;
13. primera prueba real **solo con `environment: "test"`**;
14. continuar con 12C.8E.

Archivos a revisar entonces:

```text
electron/backend/contracts/ticket-bai/*
electron/infrastructure/ticket-bai/ticket-bai-ws.client.ts
electron/backend/application/ventas/venta-ticket-bai.mapper.ts
electron/backend/application/ventas/ventas-ticket-bai.service.ts
electron/backend/domain/ventas/venta-ticket-bai-record.interface.ts
electron/backend/contracts/ventas/venta-ticket-bai-record-command.interface.ts
electron/backend/contracts/ventas/ventas-ticket-bai.repository.interface.ts
electron/infrastructure/database/typeorm/typeorm-ventas-ticket-bai.repository.ts
electron/infrastructure/database/typeorm/typeorm-ventas-tickets.repository.ts
electron/contracts/ventas/venta-ticket.interface.ts
src/app/services/venta-ticket-bai.service.ts
src/app/services/venta-post-commit.service.ts
src/app/services/venta-ticket-document.service.ts
src/app/model/ventas/venta-ticket-document.builder.ts
src/app/model/ventas/venta-gift-ticket-document.builder.ts
application-composition.ts
electron/ipc/channels.ts
electron/ipc/register-ventas-ipc.ts
electron/preload.ts
```


# 17. Notas para mi “yo del futuro”

1. **No mezclar SDK y Client.** El SDK se desarrolla en otra conversación; aquí se consume la versión publicada.
2. **No esquivar PENDING forzando `sincrono: true` permanentemente.** El producto debe soportar el modo asíncrono.
3. **No HTTP ad-hoc a Berein.** Todo pasa por `@osumi/ticketbaiws`.
4. **No exponer token al renderer.** Sigue en safeStorage.
5. **Default real = production; desarrollo = test manual.**
6. **QR comercial y QR fiscal son distintos** y pueden convivir.
7. **Opción A de referencia está aprobada:** ticket fiscalizado usa `TPV01-000015`.
8. **Ticket regalo jamás lleva bloque fiscal TicketBAI.**
9. **Mapping fiscal parte de snapshot persistido**, no modelos mutables.
10. **No auto-retry.**
11. **No create ciego tras timeout.**
12. **No doble incremento de revisión por PENDING → OK** si el artefacto no cambia.
13. **No marcar PDF vigente si no coincide con revisión.**
14. **La regla “imprimir sin QR si falla TicketBAI” está abierta/revisándose.**
15. **Devoluciones/mixtas siguen bloqueadas por Berein.**
16. GitHub Raw ha estado stale: pedir archivos concretos actuales si hay duda.
17. El usuario prefiere lotes coherentes, no micro-pasos.

---

# 18. Limitaciones/bloqueos

1. `@osumi/ticketbaiws` 1.0.0 no soporta bien `PENDING`.
2. Devoluciones/mixtas TicketBAI bloqueadas hasta Berein.
3. Política de documento sin QR pendiente de decisión.
4. Star TSP100/TSP143 80 mm: prueba física pendiente/no bloqueante.
5. GitHub Raw puede estar stale.
6. Toda prueba real TicketBAI durante desarrollo debe usar `test`.

---

# 19. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.9 | 26/08/2026 | Impresión cerrada; siguiente Email |
| 2.10 | 26/08/2026 | Email backend/config avanzado |
| 2.11 | 26/08/2026 | Email cerrado |
| 2.12 | 28/08/2026 | 12C.8A + 12C.8B cerrados |
| **2.13** | **28/08/2026** | **12C.8C.1 + 12C.8D.1 cerrados; pausa por PENDING; esperar SDK 1.0.1** |

---

# 20. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.13.

Punto exacto:
- Ventas 12C.1–12C.7 ✅
- TicketBAI ordinario:
  - 12C.8A ✅
  - 12C.8B ✅
  - 12C.8C.1 ✅
  - 12C.8D.1 ✅
  - 12C.8C.2 / 12C.8D.2 ⏸️ esperando @osumi/ticketbaiws 1.0.1
- SDK 1.0.0 trata PENDING como error aunque Berein puede devolver PENDING con huella/QR/URL válidos.
- El SDK se corrige en otra conversación.
- Antes de tocar el Client pregúntame si 1.0.1 ya está publicada.
- Si lo está, revisa su API real antes de diseñar los cambios.
- Durante desarrollo TicketBAI usar environment="test"; el default del producto sigue siendo production.
- La política de qué imprimir si no obtenemos QR sigue ABIERTA.
- Devoluciones/mixtas TicketBAI siguen bloqueadas hasta Berein.
- Mantén estado ✅/🟦/⬜/⏸️ al inicio de cada paso, revisa main antes de patches, JSDoc en todos los métodos TS/JS, no any y trabaja en lotes coherentes.
```

---

**Fin del documento de continuidad v2.13.**
