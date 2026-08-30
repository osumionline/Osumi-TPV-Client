# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.16  
**Fecha:** 30 de agosto de 2026  
**Estado:** TicketBAI ordinario queda **cerrado ✅**. Están completados y probados `12C.8A` a `12C.8F`, incluyendo envío post-COMMIT, soporte `PENDING`, ticket/PDF fiscal, reconciliación, reintento manual, Histórico, capacidades, regeneración documental, diagnóstico persistido y auditoría final de cierre. `12C.9 — TicketBAI devoluciones/mixtas` permanece **⏸️ bloqueado por Berein**. La prueba real de `invoices.resend()` sobre un rechazo auténtico queda como comprobación futura no bloqueante.

> **Regla crítica de entorno:** el producto usa `production` por defecto. Durante desarrollo/pruebas manuales actuales se usa `app_data.json → ticketBai.environment = "test"` junto con el **token TEST** correspondiente. No cambiar el default ni añadir selector de entorno a la UI.

## 1. Estado resumido

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

    12C.8 TicketBAI ordinario                     ✅
      12C.8A Modelo/mapping/legacy                ✅
      12C.8B Infraestructura backend              ✅
      12C.8C Envío automático post-COMMIT         ✅
      12C.8D Ticket fiscal + PDF                  ✅
      12C.8E Histórico + reconciliación/reintento ✅
      12C.8F Cierre integral                      ✅

    12C.9 TicketBAI devoluciones/mixtas           ⏸️ Berein
    12C.10 Regresión integral final               ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física, no bloqueante
```

## 2. Convenciones de trabajo

- Angular standalone, signals, `computed`, `input()`, `output()`, `inject()`.
- Angular 22: no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto; no `any`.
- `unknown` cuando corresponda.
- Líneas en blanco solo estructurales.
- Una propiedad por línea, sin líneas en blanco entre propiedades relacionadas.
- Todo método TS/JS nuevo lleva JSDoc breve.
- Archivo nuevo: completo.
- Archivo existente: mostrar fragmento actual → fragmento nuevo.
- Trabajar en lotes coherentes.
- Revisar `main` antes de patches.
- No avanzar sin confirmación del usuario.

Batería habitual:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Si se toca Electron/preload/IPC:

```bash
npm run build:desktop
```

## 3. Política SQLite durante desarrollo

No hay usuarios reales todavía.

```text
sin migraciones por ahora
```

Ante cambios incompatibles:

```text
actualizar versión de esquema
→ borrar datos locales
→ recrear instalación
→ reimportar .otpv
```

Versión actual:

```text
DATABASE_SCHEMA_VERSION = 2
```

## 4. TicketBAI ordinario — decisiones fiscales cerradas

```text
simplificada                 → true
serie                         → TPV01
numero                        → venta.numero padded a 6
rectificativa                 → false
retencion                     → 0
modo_recargo_equivalencia    → true
total_factura                 → totalCents / 100
```

Cliente: no se envían datos fiscales del cliente.

Líneas:

```text
descripcion      → snapshot nombre
cantidad         → unidades
importe_unitario → PVP sin IVA, 4 decimales
tipo_iva         → ivaBps / 100
tipo_req         → 0
```

Descuento:

```text
línea positiva
+
línea negativa "Descuento - {nombre}"
```

## 5. SDK

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
  no devuelve estado fiscal definitivo
```

## 6. Estados persistidos

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

Identidad fiscal congelada:

```text
entorno
nif_emisor
serie
numero
```

## 7. Regla post-COMMIT

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

Un fallo TicketBAI nunca hace rollback ni permite repetir `save()`.

## 8. Ticket/PDF fiscal

Visible para:

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

Ticket normal: QR comercial + QR fiscal.

Ticket regalo: sin identificativo/QR fiscal; conserva QR comercial.

## 9. Reconciliación

```ts
reconcile(idVenta: number): Promise<void>
```

Usa identidad fiscal congelada.

Estados reconciliables:

```text
pendiente_remoto
enviando
error_temporal
```

Resultados:

```text
GET PENDING → pendiente_remoto
GET OK      → aceptada
GET ERROR   → rechazada
```

Si falla GET: no modificar estado local.

## 10. Reintento manual

```ts
retry(idVenta: number): Promise<void>
```

Solo desde:

```text
rechazada
```

Flujo:

```text
rechazada
→ beginManualAttempt()
→ enviando
→ resend()
→ acknowledgement
→ reconcile() posterior
```

Política:

```text
error_temporal   → reconcile primero
error_permanente → corregir causa/intervención
rechazada        → resend permitido
```

Prueba real `resend()`:

```text
⏸️ pendiente de rechazo auténtico
```

No fabricar uno modificando SQLite.

## 11. Histórico

Estado público:

```ts
type VentaHistoricoTicketBaiEstado =
  | 'no_aplica'
  | 'correcto'
  | 'pendiente'
  | 'incidencia';
```

Capacidades:

```text
estado interno       procesar   comprobar   reintentar
──────────────────────────────────────────────────────
pendiente               sí          no          no
pendiente_remoto        no          sí          no
enviando                no          sí          no
error_temporal          no          sí          no
rechazada               no          no          sí
error_permanente        no          no          no
```

El renderer no conoce estados internos.

## 12. Regla visual definitiva

Listado:

```text
correcto    → sin icono
no_aplica   → sin icono
pendiente   → sin icono
incidencia  → icono rojo
```

Detalle:

```text
correcto
→ silencioso

no_aplica
→ silencioso

pendiente
→ "TicketBAI pendiente"

incidencia
→ "Incidencia TicketBAI"
→ ultimo_error persistido
```

## 13. Regeneración documental

```ts
ensureCurrentPdf(idVenta: number): Promise<void>
```

```text
PDF vigente existe
→ no renderizar

PDF vigente no existe
→ snapshot
→ renderPdf()
→ savePdf(ticketRevision)
```

## 14. Correcciones finales de auditoría 12C.8F

### Recuperación de `pendiente` con identidad congelada

Venta nueva usa configuración actual y congela identidad.

Venta `pendiente` ya existente continúa con:

```text
entorno/nif/serie/numero congelados
```

Así `processInitial()`, `reconcile()` y `retry()` son coherentes.

### `ticket_revision` basado en visibilidad fiscal

Regla definitiva:

```text
ticket_revision cambia cuando cambia
el contenido fiscal VISIBLE del documento
```

Casos:

```text
PENDING inicial                         → rev +1
PENDING repetido mismo artefacto        → rev +0
PENDING → OK mismo artefacto            → rev +0
PENDING → ERROR                         → rev +1
ERROR → retry → OK mismo artefacto      → rev +1
ERROR → retry → PENDING mismo artefacto → rev +1
```

### Diagnóstico persistido

El Histórico expone `ticketBaiUltimoError` para que una incidencia conserve contexto tras reinicios.

## 15. Pruebas reales

```text
create()
→ PENDING
→ pendiente_remoto
→ ticket fiscal
```

Después:

```text
Histórico
→ Comprobar TicketBAI
→ GET OK
→ aceptada
```

Validado correctamente en TEST.

## 16. Batería integral final

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
npm run build:desktop
```

Correcta.

## 17. Estado formal

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Única comprobación futura no bloqueante:

```text
invoices.resend() real
→ cuando exista rechazo auténtico en TEST
```

## 18. Bloque pendiente

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
```

No implementar hasta disponer de respuesta/documentación suficiente.

## 19. Próximo punto

El roadmap disponible no define todavía un bloque funcional posterior a `12C.9/12C.10`.

Mientras Berein no desbloquee `12C.9`, el siguiente trabajo debe ser un bloque general de Osumi TPV fuera de TicketBAI, definido a partir del roadmap global del proyecto.

## 20. Notas críticas

1. SDK actual: `@osumi/ticketbaiws` 1.0.1.
2. PENDING es válido.
3. No HTTP ad-hoc.
4. No exponer token al renderer.
5. Desarrollo: TEST + token TEST.
6. Producción por defecto.
7. Identidad fiscal congelada.
8. No create ciego tras fallo ambiguo.
9. Solo `rechazada` permite resend.
10. `error_temporal` se reconcilia primero.
11. `error_permanente` muestra causa y no muta automáticamente.
12. Correcto/no_aplica permanecen silenciosos.
13. Solo incidencia genera icono rojo.
14. `ticket_revision` sigue visibilidad fiscal.
15. Nunca servir silenciosamente PDF fiscal obsoleto.
16. Fallo TicketBAI nunca revierte venta comercial.
17. Resolución manual no auto-imprime.
18. Sin usuarios reales: no migraciones; borrar/reimportar `.otpv`.

## 21. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.14 | 29/08/2026 | PENDING, post-COMMIT, Histórico y reconciliación |
| 2.15 | 30/08/2026 | 12C.8E completo, retry, UI y regeneración documental |
| **2.16** | **30/08/2026** | **12C.8 TicketBAI ordinario cerrado; auditoría final, identidad congelada en pendiente, revisión por visibilidad fiscal y diagnóstico persistido** |

## 22. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.16.

Estado:
- Ventas 12C.1–12C.7 ✅
- 12C.8 TicketBAI ordinario ✅ CERRADO
- 12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
- 12C.10 regresión integral final ⬜

Puntos críticos:
- @osumi/ticketbaiws 1.0.1.
- Flujo real validado:
  create → PENDING → pendiente_remoto → ticket fiscal → Histórico → Comprobar → GET → OK → aceptada.
- Retry manual implementado con resend() + reconcile() posterior.
- Solo rechazada permite resend.
- Error temporal se reconcilia primero.
- Error permanente muestra ultimo_error y no ofrece mutación automática.
- Identidad fiscal congelada se usa también al recuperar un pendiente local.
- ticket_revision cambia según visibilidad fiscal del documento.
- Correcto/no_aplica quedan silenciosos en Histórico.
- Solo incidencia muestra icono rojo.
- ensureCurrentPdf() mantiene PDF vigente.
- Fallo TicketBAI nunca revierte la venta comercial.
- Desarrollo TicketBAI: environment=test + token TEST.
- Sin usuarios reales no se implementan migraciones.
- La prueba real de resend queda pendiente hasta disponer de rechazo auténtico; no es bloqueante.
- No tocar devoluciones/mixtas hasta Berein.
- Mantener estado ✅/🟦/⬜/⏸️, revisar main antes de patches, JSDoc en métodos nuevos, no any y trabajar en lotes coherentes.
- Para cambios en archivos existentes, mostrar fragmento actual → fragmento nuevo.
- Líneas en blanco solo estructurales.

Siguiente paso:
- Elegir el siguiente bloque funcional general de Osumi TPV fuera de TicketBAI mientras 12C.9 siga bloqueado.
```

---

**Fin del documento de continuidad v2.16.**
