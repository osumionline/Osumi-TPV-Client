# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.15  
**Fecha:** 30 de agosto de 2026  
**Estado:** Installation, importación legacy, Startup, auditoría/refactor transversal, Ventas 1–11 y Ventas 12C.1–12C.7 están completados, probados y subidos. En TicketBAI ordinario están completados **12C.8A**, **12C.8B**, **12C.8C**, **12C.8D** y **12C.8E completo**. La integración real contra TicketBaiWS TEST ha sido validada con flujo auténtico `PENDING → pendiente_remoto → reconcile() → OK → aceptada`, primero desde DevTools y después desde la UI de Histórico. El siguiente bloque funcional pendiente es **12C.8F — cierre integral**, manteniendo la prueba real de `resend()` sobre rechazo auténtico como pendiente no bloqueante, y después **12C.9 — devoluciones/mixtas TicketBAI**, bloqueado hasta respuesta de Berein.

> **Regla crítica de entorno:** el producto sigue usando `production` por defecto. Durante el desarrollo y las pruebas manuales actuales se debe asumir `app_data.json → ticketBai.environment = "test"` para evitar envíos fiscales reales. Cuando se usa TEST, también debe utilizarse el **token TEST** correspondiente. No cambiar el default del producto ni añadir selector de entorno a la UI.

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
      12C.8D Ticket fiscal + PDF                  ✅
      12C.8E Histórico + reconciliación/reintento ✅
        12C.8E.1 Estado en Histórico              ✅
        12C.8E.2 Reconciliación remota            ✅
        12C.8E.3 Reintento manual                 ✅
        12C.8E.4 UI + regeneración documental     ✅

      12C.8F Prueba real TEST + cierre            🟦
        Envío real PENDING + ticket fiscal        ✅
        Reconciliación real PENDING → OK          ✅
        Reconciliación desde UI Histórico         ✅
        Reintento real sobre rechazo auténtico    ⏸️ no hay caso real
        Regresión integral                        ✅
        Cierre documental                         🟦 SIGUIENTE

    12C.9 TicketBAI devoluciones/mixtas           ⏸️ Berein
    12C.10 Regresión integral final               ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física, no bloqueante
```

Todo lo marcado ✅ pasó su batería correspondiente y está subido al repositorio.

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

Arquitectura:

```text
Angular
→ contratos públicos
→ preload/IPC
→ backend Electron/Node
→ application services
→ repositories/infraestructura
→ SQLite/filesystem/safeStorage/servicios externos
```

---

# 4. Convenciones y workflow obligatorio

- Angular standalone, signals, `computed`, `input()`, `output()`, `inject()`.
- Angular 22: no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- `@if`, `@for`, `@switch`.
- TypeScript estricto; **no `any`**.
- `unknown` cuando corresponda.
- `export default` solo con un único export.
- **Líneas en blanco solo para separar conceptos o bloques estructurales.**
- En interfaces, objetos, argumentos y estructuras relacionadas: una propiedad por línea, sin líneas en blanco entre ellas.
- Angular y Electron/backend mantienen utilidades separadas.
- Evitar abstracciones prematuras.
- Archivo nuevo: completo.
- Archivo existente: ruta + punto exacto de cambio.
- Al modificar código existente, mostrar siempre fragmento actual → fragmento nuevo.
- **Todo método TS/JS añadido o propuesto lleva JSDoc breve**, incluidos helpers privados y fakes de test.

Al empezar cualquier fase/subpaso:

1. mostrar estado completo con ✅ / 🟦 / ⬜ / ⏸️;
2. explicar objetivo brevemente;
3. revisar `main` o archivos actuales;
4. trabajar en lotes coherentes;
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

---

# 5. Política actual de esquema SQLite

La aplicación sigue en desarrollo y **no hay usuarios reales**.

Por tanto:

- no implementar migraciones todavía;
- ante un cambio incompatible:
  - actualizar versión de esquema;
  - borrar datos locales;
  - reinstalar/recrear;
  - reimportar `.otpv`.

Cuando haya usuarios reales, revisar esta política.

Cambio aplicado durante TicketBAI:

```text
DATABASE_SCHEMA_VERSION
1 → 2
```

Motivo:

```text
venta_ticketbai.estado
→ añadir pendiente_remoto al CHECK
```

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

Política:

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
→ token TEST
```

No exponer selector de entorno en Installation/UI.

## 6.2 Ventas 1–11 ✅

Persistencia comercial, stock, caja, pagos, reservas, devoluciones, ticket, PDF e impresión están cerrados.

Regla central:

```text
COMMIT comercial
→ venta definitiva
→ cualquier fallo posterior nunca hace rollback
→ nunca permite repetir save()
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

Descuentos:

```text
línea positiva
+
línea negativa "Descuento - {nombre}"
```

El mapper deriva descuento efectivo desde:

```text
pvp_micros * unidades - importe_micros
```

No añadir `req_bps`. No derivar RE desde `AppData.reList`. No inventar flags fiscales opcionales.

---

# 8. SDK `@osumi/ticketbaiws` 1.0.1 ✅

Versión utilizada:

```text
@osumi/ticketbaiws 1.0.1
```

Semántica:

```text
create()
  OK      → válido
  PENDING → válido
  ERROR   → TicketBaiWsApiError

get()
  return.status = OK | PENDING | ERROR

resend()
  PUT reset-tbai/
  reencola factura existente
  NO devuelve el estado fiscal final
```

Consecuencia:

```text
resend()
→ acknowledgement técnico
→ estado local enviando
→ reconcile() posterior
→ GET decide PENDING / OK / ERROR
```

No forzar `sincrono: true`.

No HTTP ad-hoc a Berein.

---

# 9. Modelo TicketBAI y estados ✅

`venta_ticketbai` conserva:

```text
entorno
nif_emisor
serie
numero
```

Estados:

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

No fiscalizar retrospectivamente ventas antiguas sin datos.

---

# 10. Envío automático post-COMMIT ✅

Orden:

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

Regla:

```text
TicketBAI falla
→ NO rollback
→ warning
→ PDF continúa
→ impresión continúa si corresponde
```

`imprimirTicket` se conserva.

---

# 11. Política ante fallo TicketBAI ✅

Si falla TicketBAI y no se obtiene huella/QR/URL:

```text
venta comercial válida
estado fiscal de incidencia
warning visible
PDF sin bloque fiscal
ticket físico sin QR fiscal si corresponde
Histórico mostrará incidencia
resolución posterior desde Histórico
```

Nunca bloquear el ticket comercial por fallo fiscal post-COMMIT.

Éxito posterior:

```text
si aparece/cambia artefacto
→ ticket_revision++
→ PDF vigente debe regenerarse
```

La resolución manual no auto-imprime.

---

# 12. Ticket fiscal y PENDING ✅

`VentaTicketInterface` contiene:

```ts
ticketBai: VentaTicketBaiDocumentInterface | null;
```

Snapshot fiscal visible para:

```text
pendiente_remoto
aceptada
legacy
```

No visible para:

```text
rechazada
error_temporal
error_permanente
enviando
pendiente
no_aplica
```

Referencia aprobada:

```text
TPV01-000015
```

Ticket normal:

```text
QR comercial local
+
QR fiscal TicketBAI
```

Ticket regalo:

```text
sin identificativo TicketBAI
sin QR fiscal
con QR comercial
```

Regla de revisión:

```text
primera aparición huella + QR + URL
→ ticket_revision++

pendiente_remoto → aceptada
mismo artefacto
→ no ticket_revision++

artefacto cambia
→ ticket_revision++
```

---

# 13. Prueba real TEST inicial ✅

Venta ordinaria real:

```text
importe venta: 3,80 €
entregado: 4,00 €
cambio: 0,20 €
```

Berein devolvió:

```text
PENDING
+ huella
+ QR
+ URL
```

Persistencia:

```text
estado = pendiente_remoto
huella != null
qr != null
url != null
respuesta_payload = respuesta completa
```

Ticket/PDF:

```text
referencia fiscal correcta
identificativo TicketBAI
QR fiscal correcto
QR comercial presente
```

Importe fiscal enviado:

```text
3.80
```

No incluye entregado/cambio.

---

# 14. 12C.8E.1 ✅ — estado TicketBAI en Histórico

Estado público:

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

---

# 15. 12C.8E.2 ✅ — reconciliación remota

Contrato:

```text
TicketBaiClient.getInvoice()
```

Adaptador:

```text
client.invoices.get({ serie, numero })
```

Mapping:

```text
PENDING → pending
OK      → accepted
ERROR   → rejected
```

Identidad usada:

```text
venta_ticketbai.entorno
venta_ticketbai.nif_emisor
venta_ticketbai.serie
venta_ticketbai.numero
```

No usa NIF/entorno actual de `app_data`.

Estados reconciliables:

```text
pendiente_remoto
enviando
error_temporal
```

Reglas:

```text
GET PENDING
→ pendiente_remoto

GET OK
→ aceptada

GET ERROR
→ rechazada
```

Si falla GET:

```text
no modificar estado local
```

Bridge completo:

```text
IPC
VentasApi
preload
VentaTicketBaiService Angular
```

Método Angular:

```ts
reconcile(idVenta: number): Promise<void>
```

Prueba real:

```text
pendiente_remoto
→ reconcile()
→ OK
→ aceptada
```

Comprobado:

```text
aceptado_at != null
huella / qr / url iguales
ticket_revision sin cambios
```

---

# 16. 12C.8E.3 ✅ — reintento manual

Regla central:

```text
rechazada
→ retry()
→ beginManualAttempt()
→ enviando
→ invoices.resend()
→ acknowledgement
→ reconcile() posterior
```

Solo `rechazada` puede iniciar `beginManualAttempt()`.

No pueden hacer resend directo:

```text
error_temporal
error_permanente
pendiente_remoto
enviando
aceptada
legacy
no_aplica
anulada
```

Política:

```text
error_temporal
→ reconcile primero

error_permanente
→ corregir causa

rechazada
→ resend permitido
```

Errores del resend:

```text
rejected
→ rechazada

temporary
→ error_temporal

permanent
→ error_permanente

error no normalizado
→ dejar enviando
→ reconciliar después
```

Se protege doble reintento/concurrencia:

```text
primer beginManualAttempt()
→ rechazada → enviando

segundo beginManualAttempt()
→ null
→ no segundo resend
```

`resend()` exitoso no cambia revisión documental por sí mismo.

Bridge completo:

```text
IPC
VentasApi
preload
VentaTicketBaiService Angular
```

Método Angular:

```ts
retry(idVenta: number): Promise<void>
```

Prueba real contra rechazo auténtico:

```text
⏸️ pendiente
```

No se fabricó modificando SQLite una factura aceptada.

---

# 17. 12C.8E.4 ✅ — UI y regeneración documental

## 17.1 Capacidades públicas

El renderer no conoce estados internos de persistencia.

Recibe:

```text
puedeProcesarTicketBai
puedeComprobarTicketBai
puedeReintentarTicketBai
```

Matriz:

```text
estado interno       procesar   comprobar   reintentar
──────────────────────────────────────────────────────
pendiente               sí          no          no
pendiente_remoto        no          sí          no
enviando                no          sí          no
error_temporal          no          sí          no
rechazada               no          no          sí
error_permanente        no          no          no
aceptada/legacy         no          no          no
no_aplica/anulada       no          no          no
```

Cubierta con tests SQLite reales.

## 17.2 Acciones en Histórico

El componente detalle solo emite intenciones.

El componente padre ejecuta:

```text
Procesar TicketBAI
→ processInitial()

Comprobar TicketBAI
→ reconcile()

Reintentar TicketBAI
→ retry()
```

Después de cualquier operación:

```text
garantizar PDF vigente
→ refrescar detalle
→ refrescar listado
```

Incluso si la acción lanza error, el detalle/listado se refrescan porque la persistencia puede haber cambiado antes del error.

## 17.3 Regla visual definitiva

**TicketBAI correcto/no aplicable debe permanecer silencioso.**

Listado:

```text
correcto    → sin icono
no_aplica   → sin icono
pendiente   → sin icono
incidencia  → icono rojo TicketBAI
```

Detalle:

```text
correcto
→ sin mensaje

no_aplica
→ sin mensaje

pendiente
→ "TicketBAI pendiente"
→ acción disponible según capacidades

incidencia
→ "Incidencia TicketBAI"
→ acción disponible según capacidades
```

Motivo: la inmensa mayoría de ventas serán correctas; mostrar un icono verde en todas genera ruido visual innecesario.

## 17.4 Regeneración documental

Nuevo método:

```ts
ensureCurrentPdf(idVenta: number): Promise<void>
```

Semántica:

```text
getCurrentPdf() != null
→ no renderizar

getCurrentPdf() == null
→ buildDocument()
→ renderPdf()
→ savePdf(ticketRevision)
```

Se reutiliza tras correcciones postventa y tras acciones TicketBAI.

Casos:

```text
PENDING → OK mismo artefacto
→ revisión no cambia
→ PDF no se regenera

aparece/cambia artefacto
→ revisión cambia
→ PDF se regenera

PENDING visible → ERROR
→ revisión cambia
→ PDF se regenera sin bloque fiscal
```

Si regenerar falla:

```text
warning
→ estado comercial/fiscal no se revierte
→ PDF permanece obsoleto
```

La reimpresión y el email conservan además reparación perezosa del PDF.

---

# 18. Validación manual real desde Histórico ✅

Se realizó una nueva venta TEST.

Resultado inicial:

```text
PENDING
→ pendiente_remoto
```

En Histórico:

```text
detalle:
TicketBAI pendiente
[Comprobar TicketBAI]
```

Al pulsar:

```text
Comprobar TicketBAI
→ reconcile()
→ Berein OK
→ aceptada
```

La UI se actualizó correctamente.

Tras el ajuste visual definitivo:

```text
venta aceptada
→ sin icono verde
→ sin mensaje TicketBAI
→ sin botones fiscales
```

Todo funcionó correctamente.

---

# 19. Batería integral tras 12C.8E ✅

Ejecutada y correcta:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```

Cambios subidos a `main`.

---

# 20. 12C.8F — punto siguiente

Estado:

```text
Envío real PENDING + ticket fiscal             ✅
Reconciliación real PENDING → OK               ✅
Reconciliación desde UI Histórico              ✅
Batería integral                               ✅
Reintento real sobre rechazo auténtico         ⏸️
Cierre documental / revisión final             🟦 SIGUIENTE
```

El reintento real no debe bloquear el avance:

- no hay caso real rechazado;
- no se debe fabricar contra Berein modificando SQLite;
- queda preparado para probarse cuando aparezca un rechazo auténtico.

Siguiente trabajo recomendable:

1. revisar si queda algún fleco documental/técnico de 12C.8;
2. actualizar documentación interna si procede;
3. marcar 12C.8F cerrado salvo prueba real resend pendiente no bloqueante;
4. continuar con 12C.9 solo cuando Berein responda sobre devoluciones/mixtas;
5. si Berein sigue sin responder, decidir siguiente bloque funcional fuera de TicketBAI.

---

# 21. Devoluciones/mixtas TicketBAI ⏸️

Siguen bloqueadas hasta respuesta/documentación de Berein.

No reutilizar automáticamente el flujo ordinario.

No modificar el mapper ordinario para aceptar devoluciones/mixtas sin decisión fiscal explícita.

---

# 22. Notas para mi “yo del futuro”

1. No mezclar SDK y Client.
2. SDK actual: `@osumi/ticketbaiws` 1.0.1.
3. PENDING es válido y puede traer huella/QR/URL.
4. No forzar `sincrono: true`.
5. No HTTP ad-hoc a Berein.
6. No exponer token al renderer.
7. Default real = production.
8. Desarrollo = test manual + token TEST.
9. QR comercial y fiscal pueden convivir.
10. Referencia fiscal aprobada: `TPV01-000015`.
11. Ticket regalo jamás lleva bloque fiscal TicketBAI.
12. No auto-retry.
13. No create ciego tras timeout/error ambiguo.
14. `pendiente_remoto → aceptada` con mismo artefacto no incrementa revisión.
15. Si cambia artefacto, sí incrementa revisión.
16. Fallo TicketBAI nunca bloquea ticket/PDF comercial.
17. Si falla TicketBAI: warning + documento sin QR fiscal + incidencia.
18. Reconciliación usa identidad fiscal congelada.
19. Fallo GET no modifica estado local.
20. `resend()` no decide estado fiscal; requiere `reconcile()`.
21. Solo `rechazada` puede hacer resend manual.
22. `error_temporal` se reconcilia primero.
23. `error_permanente` requiere corregir causa.
24. Éxito manual no auto-imprime.
25. Renderer no conoce estados internos fiscales.
26. UI normal debe ser silenciosa: correcto/no_aplica no muestran iconos.
27. Solo incidencias TicketBAI generan icono rojo en listado.
28. Pendiente se muestra en detalle con su acción.
29. `ensureCurrentPdf()` evita regeneración innecesaria.
30. Nunca servir silenciosamente un PDF fiscal viejo.
31. Devoluciones/mixtas siguen bloqueadas por Berein.
32. Sin usuarios reales: no migraciones; borrar e importar `.otpv`.
33. GitHub Raw puede estar stale.
34. Lotes coherentes, no micro-pasos.
35. Cambios siempre fragmento actual → fragmento nuevo.
36. Líneas en blanco solo estructurales.
37. Todos los métodos TS/JS nuevos con JSDoc.

---

# 23. Limitaciones/bloqueos

1. Devoluciones/mixtas TicketBAI bloqueadas hasta Berein.
2. Prueba real `resend()` pendiente de un rechazo auténtico.
3. Star TSP100/TSP143 80 mm: prueba física pendiente/no bloqueante.
4. GitHub Raw puede estar stale.
5. Toda prueba real TicketBAI durante desarrollo usa TEST + token TEST.

---

# 24. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.12 | 28/08/2026 | 12C.8A + 12C.8B cerrados |
| 2.13 | 28/08/2026 | 12C.8C.1 + 12C.8D.1; pausa por PENDING |
| 2.14 | 29/08/2026 | SDK 1.0.1, PENDING completo, post-COMMIT, Histórico y reconciliación |
| **2.15** | **30/08/2026** | **12C.8E completo: reconciliación, retry, capacidades, UI, regeneración PDF y prueba real desde Histórico; batería integral verde** |

---

# 25. Próximo paso exacto en una nueva conversación

Continuar desde:

```text
12C.8F — cierre integral de TicketBAI ordinario
```

Objetivo:

1. revisar que no queden TODOs/flecos en 12C.8;
2. revisar documentación/estado de pruebas;
3. considerar `resend()` real como pendiente no bloqueante hasta disponer de rechazo auténtico;
4. cerrar formalmente 12C.8;
5. no empezar devoluciones/mixtas hasta respuesta de Berein.

Si Berein no ha respondido, decidir el siguiente bloque funcional general de Osumi TPV sin tocar 12C.9.

---

# 26. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.15.

Punto exacto:
- Ventas 12C.1–12C.7 ✅
- TicketBAI ordinario:
  - 12C.8A ✅
  - 12C.8B ✅
  - 12C.8C ✅
  - 12C.8D ✅
  - 12C.8E ✅
  - 12C.8F 🟦 cierre integral
- @osumi/ticketbaiws 1.0.1.
- PENDING está soportado correctamente.
- Flujo real validado:
  create → PENDING → pendiente_remoto → ticket fiscal → Histórico → Comprobar → GET → OK → aceptada.
- Retry manual está implementado mediante resend() + reconcile() posterior.
- Solo rechazada puede hacer resend.
- Error temporal se reconcilia primero.
- Error permanente exige corregir causa.
- No se ha hecho una prueba real resend porque no existe todavía un rechazo auténtico; no fabricar uno manipulando SQLite.
- La UI solo muestra icono TicketBAI en listado cuando hay incidencia.
- Correcto/no_aplica quedan silenciosos.
- Pendiente se muestra en detalle con su acción.
- La resolución TicketBAI garantiza PDF vigente mediante ensureCurrentPdf().
- Fallo TicketBAI nunca bloquea ticket/PDF comercial.
- Reconciliación usa identidad fiscal congelada.
- Desarrollo TicketBAI: environment=test y token TEST.
- Mientras no haya usuarios reales no se implementan migraciones de BD.
- Devoluciones/mixtas TicketBAI siguen bloqueadas hasta Berein.
- Mantén estado ✅/🟦/⬜/⏸️, revisa main antes de patches, JSDoc en todos los métodos TS/JS, no any y trabaja en lotes coherentes.
- Al indicar cambios en archivos existentes, muestra siempre fragmento actual → fragmento nuevo.
- Líneas en blanco solo estructurales.
```

---

**Fin del documento de continuidad v2.15.**
