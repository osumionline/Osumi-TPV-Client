# Osumi TPV Client — Documento de continuidad v2.96

**Fecha:** 22 de octubre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio:** https://github.com/osumionline/Osumi-TPV-Client  
**Ruta propuesta:** `docs/osumi-tpv-continuidad-v2.96.md`  
**Documento anterior:** `docs/osumi-tpv-continuidad-v2.95.md`  
**HEAD verificado del Client:** `750a5d62c61478a7f6baf55c3e34dd03298b5b09` — «S1.G — Integridad entre las líneas online y los artículos locales».

> **Situación al cierre:** Hito 22 iniciado. **S1.A–S1.G implementados, probados por el usuario y subidos a `main`.** La infraestructura de persistencia local de ventas online está preparada; **la sincronización con Indomable Store todavía no existe y el procesamiento TicketBAI todavía no está conectado a las ventas online**. El siguiente frente acordado es **auditar y modernizar `indomable-api` en su rama de desarrollo**, antes de crear los contratos de sincronización. El usuario solicitará un documento de continuidad específico de ese backend en el siguiente intercambio.

## 0. Alcance, fuente de verdad y uso

Esta v2.96 **sustituye a v2.95 como documento principal** para retomar el Client. Conserva el contexto esencial de los hitos ya terminados y actualiza el Hito 22 con el desarrollo verificado hasta la fecha. La v2.95 continúa siendo el registro más pormenorizado de TPV Backup, logging y compatibilidad multiplataforma; no descartarla para consultar decisiones históricas.

**Precedencia:** código real del repositorio y su `main` actual → documento de continuidad vigente → conversaciones previas. Los SHA representan una fotografía, no sustituyen consultar GitHub al reanudar. ChatGPT utiliza GitHub en lectura; el usuario aplica cambios, ejecuta pruebas y realiza los commits.

---

# 1. Estado general del proyecto

| Área | Situación | Observaciones |
| --- | --- | --- |
| Hito 16 — Compras | Cerrado | Conservar implementación y contratos existentes |
| Hito 17 — Gestión | Cerrado | No reabrir sin motivos concretos |
| Hito 18 — Caja | Cerrado | Ventas presenciales operan con caja; online **sin caja** |
| Empleado por venta | Cerrado | Ampliado en S1 con empleado estructural |
| Hito 19 — Permisos | Cerrado | Mantener restricciones |
| Hito 20 — Caja > Informes | Cerrado | Histórico general incluye ventas online; acumulados de caja, no |
| Hito 21 — TPV Backup | Cerrado | Paquete `.otpv` v3, backup local/remoto, restauración, scheduler |
| PT-LOG | Cerrado | PT-LOG.6 descartado expresamente |
| PT-PLAT Windows/Linux | Cerrado/aceptado | Probado también mediante uso real en Ubuntu; distribución empaquetada, aplazada |
| **Hito 22 — Sincronización online: S1.A–S1.G** | **Hecho y validado** | Preparación de datos y persistencia local |
| Hito 22 — Contratos, comunicación y ACK | Pendiente | Depende de revisión del backend |
| Hito 22 — Envío de stock y precios | Pendiente | Definir contrato y planificación |
| **TicketBAI para ventas online** | **Obligatorio, pendiente de integración** | Invocación posterior al COMMIT, reutilizando infraestructura existente |
| Electron `protocol.registerSource()` | Seguimiento separado | No adoptar mientras sea experimental |

**Batería de validación habitual del usuario:**

```bash
npm run build:electron
npm run test:electron
npm run test
npm run build:desktop
npm run lint
```

Los bloques de Hito 22 han pasado los tests, compilaciones y lint que el usuario ejecutó y confirmó antes de subir cada commit. Esta afirmación no equivale a una prueba real de sincronización HTTP ni de emisión TicketBAI para pedidos online: **esas rutas todavía no están implementadas**.

---

# 2. Hito 22: propósito y decisiones de diseño

## 2.1. Modelo funcional acordado

El TPV cliente inicia conexiones HTTPS hacia la tienda online; la tienda ofrece los pedidos ya pagados y pendientes de importar. El Client transforma cada pedido en una venta local definitiva y confirma a la tienda su incorporación (**ACK**) cuando corresponda. La importación debe ser idempotente y tolerar reintentos. Más adelante se enviarán precios y stock desde el Client hacia la tienda con una planificación adecuada.

Las ventas online **son ventas del TPV**. Se distinguen por su procedencia operativa, pero deben incorporarse al histórico y pasar por TicketBAI cuando esté configurado. No se debe confundir «pedido pagado en web» con «venta ya fiscalizada por la web»: el responsable de registrar y tramitar TicketBAI en este diseño es el Client.

## 2.2. Identidad y relaciones locales

| Campo o relación | Venta presencial (`tpv`) | Venta online (`online`) |
| --- | --- | --- |
| `venta.origen` | `'tpv'` | `'online'` |
| `venta.referencia_externa` | `NULL` | Identidad del pedido web |
| `venta.id_caja` | Requerida | `NULL` |
| `venta.id_empleado` | Empleado humano | Empleado estructural «Tienda online» |
| `venta.id_cliente` | Según operación | `NULL` en el flujo importado inicial |
| Numeración de venta | Secuencia existente | Misma secuencia existente |
| `created_at` | Fecha de la venta presencial | `pagadaAt` normalizado desde `payed_at` |
| Stock e histórico | Sí | Sí |
| Acumulados de Caja | Sí | **No** |
| Histórico económico general | Sí | Sí |
| TicketBAI | Flujo existente | **Pendiente de conectarse al importador** |

Se estableció una restricción de unicidad por `(origen, referencia_externa)` para identificar un mismo pedido online y evitar duplicados. El guardado revisa la existencia y compara el importe; el validador se ejecuta incluso en los reintentos. Una referencia repetida con importe diferente se rechaza. **Todavía no existe comparación exhaustiva del contenido de dos versiones del mismo pedido**: evaluar si el contrato remoto la requiere.

La presencia de varios empleados se deduce del número de empleados humanos aplicables; no recuperar `app_data.json.empleados` como fuente de verdad. El empleado de sistema no debe seleccionarse en operaciones presenciales. El importador legacy debe seguir siendo compatible.

---

# 3. Registro de implementación: S1.A–S1.G

Todos los commits siguientes se localizaron en `main`, por este orden:

| Bloque | Resultado funcional | Commit |
| --- | --- | --- |
| **S1.A** | Esquema de origen/identidad de ventas, referencias externas y unicidad online; actualización de librerías incluida en commit | `427f3b4922183d532fb2a746c0ad637396cbfd45` |
| **S1.B** | Empleado estructural «Tienda online», instalación y repositorio | `cad86eed81c8737bf3eae871b04d53a46257ee83` |
| **S1.B.1** | Compatibilidad del importador legacy con empleado de sistema y fallback humano | `c20d6a03a32661e126d64b029c62416794a73289` |
| **S1.C.1** | Identidad presencial explícita `origen='tpv'`; impedir empleado estructural al guardar ventas presenciales | `973c8ffafe0221151a87271265927a751e8bde32` |
| **S1.C.2** | Contrato `GuardarVentaOnlineRecordCommand` y `saveOnline()` transaccional, sin caja, empleado de sistema, idempotencia, líneas/pagos, stock y tests | `199ac9b56069c6093467ac8481df41a8987a83cb` |
| **S1.D** | Consultas de histórico: incluir detalle de ventas sin caja, agregar ventas online a totales generales, mantener separados acumulados de caja | `7311bda7a1ae7e23a772d62591a3b26a3ab111e1` |
| **S1.E** | Conservar origen en el detalle interno; restringir cambios postventa de cliente/medio de pago en ventas online, tanto en capacidades como en repositorio | `63b8977da85d57e43bf406525d47e36709803c63` |
| **S1.F** | `VentaOnlineCommandValidator`: coherencia económica de líneas y pagos, cantidades, importes seguros, devoluciones/reservas excluidas y tests | `1f2cb9361b170e033015f1951a6a92957c6381d1` |
| **S1.G** | Integridad entre artículo local y `localizador` para líneas online; rechazo transaccional y pruebas de no efectos | `750a5d62c61478a7f6baf55c3e34dd03298b5b09` |

## 3.1. Arquitectura relevante

- `electron/backend/contracts/ventas/guardar-venta-online-record-command.interface.ts`: comando de venta online **ya normalizado**.
- `electron/backend/application/ventas/venta-online-command.validator.ts`: validación interna de consistencia económica y restricciones de la primera fase.
- `electron/infrastructure/database/typeorm/typeorm-ventas-persistencia.repository.ts`: `saveOnline()`, comprobaciones de referencia, identidad local y escritura transaccional. Reutiliza componentes de la persistencia presencial sin abrir ni alterar caja.
- `electron/infrastructure/database/typeorm/typeorm-ventas-historico.repository.ts`: histórico y detalle de ventas online y presenciales.
- `electron/backend/application/ventas/ventas-historico.service.ts`: derivación de capacidades postventa según el origen.
- `electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.ts`: restricciones autoritativas para cambios de cliente y pago online.
- `electron/infrastructure/database/typeorm/typeorm-ventas-tickets.repository.ts`: recuperación del snapshot documental de la venta; su consulta no exige caja.
- `electron/backend/application/ventas/ventas-ticket-bai.service.ts`: ciclo fiscal existente, con `processInitial()`, `reconcile()` y `retry()`; **todavía no integrado desde la importación online**.
- `electron/backend/application/ventas/venta-ticket-bai.mapper.ts`: mapeo del ticket persistido al payload fiscal ordinario.

**Tests relevantes**:

- `electron/infrastructure/database/typeorm/typeorm-ventas-persistencia.repository.spec.ts`
- `electron/backend/application/ventas/venta-online-command.validator.spec.ts`
- `electron/backend/application/ventas/ventas-historico.service.spec.ts`
- `electron/infrastructure/database/typeorm/typeorm-ventas-postventa.repository.spec.ts`
- Tests existentes de `VentasTicketBaiService` y `VentaTicketBaiMapper`.

## 3.2. Incidencias de pruebas ya resueltas

Durante S1.C.2 se amplió la interfaz `VentasPersistenciaRepository`; hubo que actualizar también el fake `TestVentasPersistenciaRepository` de `ventas-persistencia.service.spec.ts` con `saveOnline()`. En S1.E se ajustaron los fixtures de histórico que ahora requieren `origen` y el tipo de `id_caja` tras comprobar `NULL`. En S1.F cambió el orden de comprobación: la validación económica sucede antes de comparar el importe del pedido previamente importado, por lo que se adaptó el caso de prueba a un reintento económicamente coherente pero conflictivo. En S1.G cambió el mensaje esperado cuando falta un artículo, porque se detecta antes de insertar nada. **Todas estas correcciones quedaron dentro de sus respectivos commits y fueron validadas.**

## 3.3. Política SQLite durante desarrollo

La base SQLite del entorno actual **no se considera de producción** y el usuario puede reinicializarla. Durante S1 se han ajustado los `CREATE TABLE` originales directamente, conservando `DATABASE_SCHEMA_VERSION = 1`: **no introducir migraciones ni subir la versión de esquema para estos cambios** salvo nueva decisión. Antes de una distribución a instalaciones reales habrá que reevaluar explícitamente estrategia de migraciones/compatibilidad.

---

# 4. TicketBAI para pedidos online — DECISIÓN CERRADA, INTEGRACIÓN PENDIENTE

**Decisión del usuario (22/10/2026):** «Las ventas online acaban siendo ventas del TPV, de modo que hay que mandarlas a TicketBAI».

La revisión del código constató lo siguiente:

1. `saveOnline()` consolida la venta comercial en SQLite, pero **no** ejecuta TicketBAI.
2. El repositorio de tickets puede leer la venta online, independientemente de su caja nula.
3. El mapper fiscal existente trabaja con el snapshot de venta persistida y configura los datos de la operación ordinaria.
4. `VentasTicketBaiService.processInitial()` conserva la identidad fiscal, inicia el envío y evita repetición de intentos iniciales completados. Ya existen `reconcile()` y `retry()` para estados que los admiten.
5. La orquestación actual de venta presencial tiene su propia llamada al flujo fiscal; la importación online todavía no tiene orquestador.

**Arquitectura acordada:** futuro orquestador de sincronización → `saveOnline()` → **COMMIT local** → `VentasTicketBaiService.processInitial(idVenta)` cuando proceda → registro/gestión de estado fiscal y continuación de la sincronización. **No** incrustar llamadas de red TicketBAI dentro de la transacción SQLite ni duplicar el servicio fiscal existente.

**Reglas de fallo:** un error fiscal posterior al COMMIT no debe borrar ni duplicar la venta ni sus movimientos de stock. Los reintentos de importación nunca deben provocar nuevas ventas o un segundo envío fiscal inicial indebido. La condición exacta del ACK remoto deberá definirse explícitamente; **no se ha acordado aún si exige éxito fiscal o solo persistencia comercial**. No inferirlo.

**Revisión pendiente de fechas fiscales:** los pedidos pueden estar pagados antes de que el TPV los importe. Es necesario revisar la interacción entre `payed_at`, fecha/hora fiscal del ticket, orden de numeración y requisitos TicketBAI antes de activar el flujo para datos reales. No asumir que una fecha histórica y una emisión posterior son intercambiables. Si exige asesoramiento normativo, contrastar fuente oficial.

**No se implementará ahora el enlace de TicketBAI aislado de la sincronización**; se implementará con su orquestación completa y pruebas de fallo/idempotencia. El requisito no está descartado ni marcado como terminado.

---

# 5. Pendientes y próximos hitos de Hito 22

## 5.1. Backend: auditoría antes de la integración (próximo frente activo)

El usuario dispone de una **rama de desarrollo separada en `indomable-api`** y desea aprovecharla para una auditoría y puesta al día, sin comprometer su rama principal. El plan acordado, a desarrollar en un **documento de continuidad propio de `indomable-api`**, comprende:

1. Diagnóstico e inventario de endpoints, estructura, configuración, dependencias, seguridad y tests.
2. Actualización del backend a **Osumi Framework 9.12.1** y adaptación de las piezas que lo requieran.
3. Auditoría de endpoints: contratos, autenticación/autorización, validación, errores, consultas y transacciones.
4. Incorporación progresiva de tests (desde el comienzo) y aumento sistemático de cobertura.
5. Limpieza, mantenimiento, tipado, rendimiento y documentación sin refactors estéticos masivos que oculten regresiones.
6. Solo después, preparación de contratos/funcionalidades de sincronización para Osumi TPV Client.

**No se han hecho cambios en `indomable-api` desde esta conversación.** Antes de programar allí, leer la rama realmente utilizada y su código. El documento específico se preparará en el siguiente turno, según petición del usuario. Los detalles de endpoints del backend aún no han sido auditados; no inventarlos aquí.

## 5.2. Sincronización aún por implementar

- Contrato HTTPS real para descubrir/descargar pedidos pagados pendientes, con autenticación, paginación/orden, versiones y tratamiento de errores.
- Adaptador de payload remoto hacia `GuardarVentaOnlineRecordCommand`, verificando importe, líneas, `localizador`, artículos, snapshots, tipos de pago y fecha de pago.
- Orquestación transaccional de la importación, ACK idempotente y recuperación ante interrupciones entre COMMIT local, procesamiento fiscal y ACK.
- Integración TicketBAI **obligatoria** posterior a la persistencia comercial, respetando los estados fiscales ya existentes.
- Política para pedidos con líneas no relacionadas con artículos locales, precios/promociones, pago online y cualquier discrepancia de snapshots. La actual excepción para líneas libres no equivale a una política de negocio definitiva.
- Planificador en el Client para intercambios HTTPS, control de concurrencia, límites, estado persistido y diagnóstico, sin bloquear la interfaz.
- Exportación de stock y precios del TPV hacia la tienda, reglas de conflictos y garantías de entrega.
- Pruebas de integración y funcionales reales con ambos repositorios, además de regresión general Windows/Linux.

**Cuestiones abiertas para resolver con el backend:** identidad y estados de pedidos, payload y versionado; tipos de pago (el repositorio local reutiliza la validación actual de tipos `fisico=1`, que puede no encajar con los medios de la tienda); ACK frente al procesamiento fiscal; fechas; reintentos; obligaciones de devolución/reembolso; reserva o disponibilidad de stock; comportamiento cuando hay errores parciales.

---

# 6. Hitos anteriores: contexto que debe preservarse

## 6.1. Hito 21 — Backup

Cerrado: paquete `.otpv` v3 (`manifest.json` + `payload.enc`), cifrado scrypt/AES-256-GCM, snapshot consistente de SQLite, restauración, backup local/remoto y scheduler. TPV Backup es *zero knowledge*: servidor sin clave de descifrado. Las configuraciones locales no portables (impresoras, logs, backups, temporales) no deben trasladarse sin criterio. Una restauración no sobrescribe una instalación ya configurada. El antiguo flag `app_data.json.empleados` se ignora; se deriva la presencia de varios empleados de la base de datos.

Documentación histórica y casos completos en `docs/osumi-tpv-continuidad-v2.95.md` y versiones anteriores.

## 6.2. PT-LOG

Cerrado. Main es escritor físico único; Renderer utiliza IPC; archivo JSON Lines, rotación, sanitización, cola y `flush()`. PT-LOG.6 (exportación de logs mediante UI) fue **descartado expresamente** y no debe volver a proponerse. Los errores secundarios de logging/cleanup no deben ocultar fallos primarios ni revertir transacciones completadas. No registrar credenciales, secretos ni datos personales de pedidos.

## 6.3. PT-PLAT

Aceptado tras batería automática Windows/Linux y prueba gráfica funcional real en Ubuntu: SQLite, Sharp, creación de ventas, impresión de tickets mediante CUPS/PDF, backup y restauración `.otpv`. Siguen aplazados los instaladores distribuidos y ensayos específicos de impresión A4/factura/impresoras térmicas; no bloquear Hito 22 por esos pendientes. No desactivar permanentemente Chromium sandbox ni GPU para remediar incidencias puntuales de la VM.

## 6.4. Otros seguimientos independientes

- `@osumi/ticketbaiws` publicado; revisar futuras respuestas/correcciones de documentación de Berein antes de cambiar integraciones.
- `protocol.registerSource()` de Electron continúa bajo seguimiento separado; adoptarlo solo cuando deje de ser experimental y tras evaluar su conveniencia.
- Distribución/empaquetado final de la aplicación: etapa posterior, no resuelta durante Hito 22.

---

# 7. Convenciones de trabajo y calidad

- **Consultar GitHub antes de cada bloque** y validar que `main`/la rama de trabajo no han avanzado. Leer métodos, tipos, helpers y fixtures completos implicados.
- **Bloques funcionales completos, no cambios diminutos arbitrarios**: el usuario aplica y comprueba una entrega coherente, confirma tests, hace commit y avisa para continuar.
- Proporcionar **tests escritos y ubicaciones exactas** para cada cambio, no limitarse a decir «añadir tests». Revisar *todos* los fixtures y fakes si se modifica una interfaz obligatoria; los errores TS ya ocurridos lo justifican.
- Para cambios existentes, indicar búsquedas/reemplazos inequívocos; para archivos nuevos, ruta y contenido completo. TypeScript estricto, aliases del proyecto, JSDoc cuando corresponda. No introducir `any` por comodidad, `!` o casts inseguros como solución a un `null` si puede hacerse una validación correcta.
- Antes del siguiente bloque, identificar **dónde estamos, qué hacemos, qué queda** y tratar dependencias reales, en lugar de emitir cambios aislados.
- El usuario ejecuta `npm run build:electron`, `npm run test:electron`, `npm run test`, `npm run build:desktop`, `npm run lint`, y las pruebas funcionales que correspondan.
- **No realizar commits directamente**. Todos los cambios y verificaciones de código del Client deben quedar trazados en el repositorio.
- No confundir tests de persistencia online en SQLite con comunicación remota, emisión fiscal o pruebas de integración end-to-end.
- Separar el trabajo en `indomable-api` del Client. **Antes de modificar el backend** escuchar y conservar el contexto del usuario y verificar su rama; ese paso es ahora el siguiente frente aprobado.

---

# 8. Punto exacto para reanudar

1. El usuario subirá `docs/osumi-tpv-continuidad-v2.96.md` a `main`. Verificar el HEAD nuevamente cuando lo confirme.
2. En el siguiente mensaje, generar **documento de continuidad independiente para `indomable-api`**: auditoría, migración a OFW 9.12.1, revisión de endpoints, tests, mantenimiento y, por último, integración con Client; mecánica de bloques, pruebas y commits.
3. Comenzar `indomable-api` por el **inventario y diagnóstico real de su rama de desarrollo**, sin improvisar endpoints ni alterar `main`.
4. Una vez saneado el backend, acordar contratos de sincronización y retomar Hito 22 del Client, incluyendo TicketBAI obligatorio después del COMMIT, ACK y gestión de fallos.
5. Continuar actualizando **ambos documentos por separado** conforme avance cada repositorio y las decisiones compartidas.

**No marcar Hito 22 completo.** El cierre actual corresponde a la **preparación local S1.A–S1.G**, no a una sincronización operativa.

---

# 9. Regla de continuidad

> Las ventas online son ventas del TPV, pero no operaciones de Caja. Deben conservar identidad e importes coherentes, mantenerse idempotentes, descontar stock de forma transaccional, aparecer en el histórico y pasar por TicketBAI mediante la futura orquestación posterior al COMMIT. El diseño remoto se hará sobre `indomable-api` actualizado y auditado, sin dar por implementados contratos que todavía no existen.
