# Osumi TPV Client — Documento de continuidad v2.98

**Fecha:** 24 de noviembre de 2026  
**Repositorio Client:** <https://github.com/osumionline/Osumi-TPV-Client> — rama `main`  
**Ruta prevista:** `docs/osumi-tpv-continuidad-v2.98.md`  
**Documento anterior:** `docs/osumi-tpv-continuidad-v2.97.md` (13/11/2026)  
**HEAD Client verificado:** `365716ef978003399764d322185b4e62f28df7ab` — Correcciones en tests de A6.10.  
**Repositorio API auxiliar:** `igorosabel/indomable-api` (privado), rama `feature/hito-22-sync-online`.  
**HEAD API verificado:** `f1a401c05d17c7d02d6743e1aff1b33da974492a` — A6.4 — Líneas comerciales en pedidos pendientes.

> **PUNTO DE REANUDACIÓN: A6.10 CERRADO; siguiente A6.11.** El Client ya contiene preparación de pedidos, persistencia comercial, TicketBAI pos-COMMIT, reconciliación, ACK condicionado, paginación y configuración operativa. Aún falta conectar los servicios a la composición real de Electron y ejecutar el flujo real. No existe todavía una sincronización automática operativa ni un cierre extremo a extremo del Hito 22. El desarrollador confirma todos los tests satisfactorios y el push de las correcciones de A6.10.

## 0. Uso y precedencia

Esta versión sustituye a v2.97 como punto principal de reanudación. Conserva sus decisiones y actualiza A6.7–A6.10. Consultar v2.97 para el detalle original de A6.1–A6.6, v2.96 para S1 y contexto histórico, y `docs/indomable-api-continuidad-v1.3.md` de la API para el cierre de A3. Las versiones anteriores no son una descripción del HEAD actual.

Orden de precedencia: código y HEAD reales de GitHub; decisiones explícitas del usuario; esta continuidad; documentos y conversaciones anteriores. Verificar ambos repositorios cuando un bloque sea cruzado. La validación local la realiza el desarrollador, no el asistente. Distinguir código implementado, tests confirmados y prueba funcional real. No inventar numeración ni dar por cerrados hitos sin evidencia.

## 1. Estado general y alcance de la primera versión

| Área | Estado al 24/11/2026 |
| --- | --- |
| Hitos 16–20: Compras, Gestión, Caja, Permisos e Informes | Cerrados |
| Hito 21: TPV Backup | Cerrado; formato `.otpv` v3 |
| PT-LOG | Cerrado; PT-LOG.6 descartado expresamente |
| PT-PLAT Windows/Linux | Aceptado en alcance acordado |
| Hito 22: S1.A–S1.G | Fundamentos locales terminados |
| API: A1–A3, consolidación A4 y A5 mínima | Preparación suficiente; no abrir nuevas auditorías por inercia |
| API: A6.2–A6.4 | Endpoints y snapshots disponibles en rama de desarrollo |
| Client: A6.5.1–A6.10 | Implementados y publicados; A6.10 cerrado tras correcciones |
| Composición real y ejecución controlada | Siguiente bloque A6.11 |
| IVA histórico de portes en API | Pendiente para pedidos con gastos de envío positivos |
| Scheduler y observabilidad | Pendientes |
| TPV → tienda: stock y precios | Pendiente de diseño e implementación |
| Pruebas reales, transición Legacy, distribución y publicación | Pendientes |
| Variantes en Client y catálogo web maestro desde TPV | Pospuestos hasta después del lanzamiento |

No confundir el avance de la importación de pedidos con el cierre de todo el Hito 22. No asignar un porcentaje global de desarrollo sin estimación fundada. No se ha recuperado una numeración definitiva de los hitos posteriores al 22: conservarlos como pendientes de planificación, sin inventarla.

### 1.1. Decisiones inamovibles

- Osumi TPV Client es genérico; Indomable Store es la primera implementación de un backend compatible, no una dependencia ni un adaptador específico del Client. Usar `tienda-online` y `TiendaOnline…`.
- El Client inicia HTTPS hacia la tienda. Reutilizar `AppData.ventaOnline`, `AppData.urlApi` y `InstallationSecretsData.secretApi`; no duplicar secretos ni fijar dominios en código.
- Una venta online es una venta del TPV: registro e histórico general, stock, empleado estructural «Tienda online», sin caja y sin cliente local. TicketBAI cuando corresponda, después del COMMIT comercial. No altera acumulados de Caja.
- Mantener simples las soluciones: volumen de referencia de 5–10 pedidos al mes, servidor único, sin HA. Consultar antes de migraciones importantes, refactors masivos o infraestructura nueva. No diseñar colas distribuidas por defecto.
- Primero terminar los hitos de la versión actual y lanzar el Client. Variantes del catálogo local y TPV como fuente maestra de productos, categorías y marcas quedan para una fase posterior. No retirar ahora la gestión de catálogo de Indomable. El stock y precios sí forman parte de la sincronización actual.
- Legacy de producción permanece operativo; no activar automáticamente las rutas nuevas ni cambiar producción durante estas pruebas.

## 2. Fundamentos locales S1 y backend A6.1–A6.4

| Bloque | Resultado | Commit |
| --- | --- | --- |
| S1.A | Identidad y origen de venta | `427f3b492218` |
| S1.B | Empleado estructural Tienda online | `cad86eed81c8` |
| S1.B.1 | Compatibilidad importación Legacy | `c20d6a03a326` |
| S1.C.1 | Ventas presenciales con origen explícito | `973c8ffafe02` |
| S1.C.2 | `saveOnline()` transaccional, líneas, pagos y stock | `199ac9b56069` |
| S1.D | Histórico de ventas online sin Caja | `7311bda7a1ae` |
| S1.E | Protección postventa según origen | `63b8977da85` |
| S1.F | Validación económica | `1f2cb9361b17` |
| S1.G | Integridad de artículo/localizador | `750a5d62c614` |
| A6.1 | Diseño del contrato | Decisión de proyecto |
| A6.2 (API) | Middleware y endpoints TPV | `6cbddcf78a21`, corrección `9d7f2b20190a` |
| A6.3 (API) | Snapshots de línea al checkout | `b40918629a8e` |
| A6.4 (API) | Líneas comerciales en pedidos pendientes | `f1a401c05d17` |

`saveOnline()` valida el comando, persiste en una transacción SQLite, utiliza la secuencia compartida y descuenta stock sin Caja. Es idempotente por referencia externa y total: un total distinto rechaza; no equivale a una comparación exhaustiva de todas las líneas con el mismo total. Mantener esta limitación visible y no ampliar la arquitectura sin valorar necesidad. Los tipos de pago resueltos deben ser compatibles con la restricción `fisico` vigente; no inventar equivalencias.

La BD local aún es de desarrollo; los cambios del esquema original se realizaron con `DATABASE_SCHEMA_VERSION = 1`. No añadir migraciones por rutina; reevaluar compatibilidad antes de actualizaciones de instalaciones reales.

### 2.1. Protocolo HTTP v1

Rutas reales de la API: `src/Routes/Tpv.php`, prefijo `/tpv`, no `src/Routes/Api.php`. `TpvSyncMiddleware` exige `Authorization: Bearer <64 caracteres hexadecimales minúsculos>`, contra el extra `tpv_sync_token` del `Config_dev.json` o `Config_prod.json` activo. El `secretApi` protegido debe coincidir. No registrar ni copiar secretos en documentación.

- `POST {urlApi}/tpv/orders/pending`, cuerpo `{"afterId":0}`. Respuesta `status:'ok'`, `version:1`, `orders`. Máximo 20 pedidos, ID ascendente, `id > afterId`, pedidos pagados elegibles (`status` admitidos 1, 2, 3, `sync IN (0,1)`, `payed_at IS NOT NULL`).
- Pedido: `id`, `reference`, `paidAt` civil `YYYY-MM-DD HH:mm:ss` sin offset, `paymentMethod`, `productsTotalCents`, `shippingCents`, `totalCents`, `items` y, en el contrato actual del Client, `shippingVatBps` nullable (ausencia se interpreta como `null`).
- Línea: `productId`, `sizeId`, `colorId`, `quantity`, `name`, `brand`, `localizador` (cadena, conserva ceros iniciales), `ivaBps`, `amountBeforeCents`, `discountCents`, `lineTotalCents`. Campos históricos pueden llegar a `null`; no inventar snapshots.
- `POST {urlApi}/tpv/orders/ack`, cuerpo `{"id":123}`; respuesta `{"status":"ok","acknowledged":true}`. Idempotente para pedidos pagados elegibles; marca `sync=2`.

En Indomable, `order_product` conserva `name_snapshot`, `brand_snapshot`, `localizador_snapshot`, `iva_bps_snapshot`, además de importes originales; migración de desarrollo `db/migrations/20261106_order_product_snapshots.sql`. Los datos históricos incompletos se bloquean si son imprescindibles. `indomable:<id>` y `cards`/`paypal` son valores de este backend, no requisitos del protocolo genérico. La API actual todavía no proporciona el IVA histórico del envío: un pedido con portes positivos y sin ese IVA queda bloqueado. No aplicar 21 % por defecto.

## 3. Client: historial de A6.5 a A6.10

| Bloque | Entrega | Commit Client |
| --- | --- | --- |
| A6.5.1 | Contrato remoto y parser | `aa64dc38f5ce` |
| A6.5.2a | Resolución exacta por localizador | `03a0ad5ef4f1` |
| A6.5.2b | Mapper económico | `040c7f36ebdf` |
| A6.6 | Transporte HTTP y preparación por página | `8fb31998380f` |
| A6.7 | Preparación completa de ventas online | `9e6eb63f7a2d` |
| A6.8 | Persistencia comercial y procesamiento TicketBAI | `a577005cd929` |
| A6.9 | Confirmación remota, estados fiscales y recuperación | `14e9c9ea6ebe` |
| A6.10 | Configuración operativa | `eabbf1b01545` |
| A6.10 correcciones | Normalización JSON y fixture de backup | `365716ef9780` |

### 3.1. A6.5–A6.6: recepción y preparación de líneas

En `electron/backend/application/tienda-online/`:

- `tienda-online-pedidos-pendientes.parser.ts`: valida respuesta externa, estructura, fechas civiles, páginas de hasta 20, IDs y referencias, importes e invariantes; no es el validador del comando comercial final.
- `tienda-online-articulo-resolver.ts`: localizador remoto en cadena de dígitos, entero seguro positivo, admite ceros iniciales; consulta exacta.
- `tienda-online-lineas.mapper.ts`: datos comerciales históricos de la tienda, coste local, importes en microeuros. `pvpMicros = amountBeforeCents * 10_000 / quantity` solo si es exacto; importe y descuento fijo en microeuros; `descuentoBps=0`, `regalo=false`. No recalcular con catálogo actual.
- `tienda-online-pedidos.service.ts`: prepara páginas, líneas y posteriormente comandos; devuelve los bloqueados con su motivo, sin ACK ni cursor permanente.

Contratos en `electron/backend/contracts/tienda-online/`: `tienda-online-pedidos-pendientes.interface.ts`, `tienda-online-articulos.repository.interface.ts`, `tienda-online-pedidos.client.interface.ts`.

Infraestructura: `electron/infrastructure/tienda-online/http-tienda-online-pedidos.client.ts` (`fromConfiguration()`, POST, token, timeout, validación HTTP/JSON, ACK; HTTPS salvo loopback, no redirecciones, credenciales ni query/fragmento en URL). `electron/infrastructure/database/typeorm/typeorm-ventas-articulos.repository.ts` usa `findByLocalizador()` específico; no reemplazar por `resolveByCode()` que acepta otros códigos.

### 3.2. A6.7: comando completo de venta

`electron/backend/application/tienda-online/tienda-online-venta-command.builder.ts` (`TiendaOnlineVentaCommandBuilder`) recibe un repositorio de tipos de pago y `TiendaOnlineImportacionContexto` (`fuenteId`, `zonaHoraria`, `metodosPago`).

- Identidad estable por SHA-256 de `JSON.stringify([fuenteId, order.reference])`; `publicId` con prefijo `venta-online-`, `referenciaExterna` con `tienda-online-`. La fuente no debe cambiar al cambiar URL o credenciales. Cambiarla tras importar pedidos puede romper idempotencia; no hacerlo sin decisión operativa.
- Convierte la fecha civil de pago a ISO UTC mediante zona horaria explícita; rechaza fechas inválidas, horas inexistentes o ambiguas por cambios horarios. No usar zona local del ordenador por defecto.
- Pagos: equivalencias explícitas de método remoto a slug local; exige correspondencia única con tipo `fisico`. Si el total es cero, no genera cobros. Efectivo con entregado igual al importe y cambio cero; otros medios con entregado `null` y cambio cero.
- Portes: línea libre «Gastos de envío», sin artículo (`articuloPublicId=null`, `localizador=0`), sin stock, una unidad y coste cero; requiere `shippingVatBps` histórico válido para importe positivo. No inferir IVA. El parser admite la ausencia del campo como `null` por compatibilidad.
- Valida el comando mediante `VentaOnlineCommandValidator`. No escribe ni llama a servicios remotos. `TiendaOnlinePedidosService.prepareCommandsPage()` prepara comandos e identifica bloqueados por pedido.

El tratamiento fiscal de fechas originales frente a expedición, numeración y pedidos antiguos debe comprobarse con casos reales antes de producción. No convertir una prueba de mapper en garantía normativa.

### 3.3. A6.8: persistencia comercial y TicketBAI

`electron/backend/application/tienda-online/tienda-online-importacion.service.ts` (`TiendaOnlineImportacionService.importPage(afterId=0)`) consume `prepareCommandsPage()`, guarda cada comando con `VentasPersistenciaRepository.saveOnline()` y solo tras recibir la venta persistida invoca `VentasTicketBaiService.processInitial(venta.id)`.

Estados por pedido: `blocked`, `persistence-error`, `fiscal-error`, `fiscal-step-completed`. Un error fiscal no deshace el COMMIT ni interrumpe los siguientes pedidos. Se conserva `ventaId` cuando ya existe la venta. `fiscal-step-completed` significa que terminó la llamada sin excepción, **no** que TicketBAI aceptó la factura. No hay ACK en este servicio. Reutilizar el servicio fiscal y su idempotencia, no crear otra implementación de TicketBAI.

### 3.4. A6.9: ACK, reconciliación y recuperación

`electron/backend/application/tienda-online/tienda-online-sincronizacion.service.ts` (`TiendaOnlineSincronizacionService.runOnce(maxPaginas=25)`) reutiliza el importador, `VentasTicketBaiRepository.findByVentaId()`, `VentasTicketBaiService.reconcile()` y `TiendaOnlinePedidosClient.acknowledge()`.

- Cada pasada empieza en `afterId=0`; el cursor existe solo durante esa ejecución. No persistir un cursor que pueda saltarse pedidos sin ACK. Se valida orden y progreso de página, hasta 20 pedidos; límite de páginas validado entre 1 y 100, por defecto 25.
- Procesa páginas y consulta estado fiscal persistido antes de ACK. Si procede, reconcilia `enviando`, `pendiente_remoto` y `error_temporal`, y vuelve a consultar el registro.
- ACK autorizado solo en `aceptada`, o en `no_aplica` si la política explícita es `aceptada-o-no-aplica`. La otra política es `solo-aceptada`. No confirmar ausencia de registro, estados ambiguos, pendientes, rechazados ni anulados.
- No reintentar automáticamente facturas rechazadas ni forzar nuevo envío inicial. No equiparar ausencia de excepción con aceptación fiscal.
- Estados resultado: `blocked`, `persistence-error`, `fiscal-error`, `fiscal-not-ready`, `ack-error`, `acknowledged`. Incluye identificadores, estado fiscal y error; resumen con páginas, cursor final, límite alcanzado y resultados. Los ACK fallidos y pedidos pendientes vuelven a aparecer desde el servidor.
- No incorpora composición, ejecución periódica ni exclusión de ejecuciones simultáneas. Los errores generales de página pueden abortar la pasada; prever gestión operativa en integración/scheduler. El límite de páginas es una salvaguarda, no un cursor duradero; valorar acumulación de bloqueados si alguna vez impide alcanzar pedidos posteriores, sin sobrediseñar el volumen actual.

### 3.5. A6.10: configuración operativa y compatibilidad

Se añade `TiendaOnlineSyncConfig` en `electron/contracts/configuration/tienda-online-sync-config.ts`:

| Campo | Significado |
| --- | --- |
| `fuenteId` | Identidad estable de la tienda |
| `zonaHoraria` | Zona reconocida por `Intl.DateTimeFormat` |
| `metodosPago` | Mapa explícito remoto → slug local |
| `politicaAck` | `solo-aceptada` o `aceptada-o-no-aplica` |

- Perfil opcional `AppData.tiendaOnlineSync?: TiendaOnlineSyncConfig \| null`; las instalaciones anteriores siguen siendo válidas. El repositorio JSON normaliza ausencia a `null` al cargar. Un perfil inválido persistido se rechaza.
- `ConfigurationUpdateCommand.ventaOnline.sync` permite ausencia (compatibilidad: conservar perfil si sigue activa), `null` (eliminar) o perfil válido. `ConfigurationService` deja perfil y URL vacíos cuando la venta online está desactivada (perfil `null`, URL `''`).
- No elegir política de ACK automáticamente. No duplicar `urlApi` o `secretApi` en el perfil. La UI permite configurar los cuatro campos y equivalencias en líneas `cards=visa` (ejemplo; comprobar slug real), con validación compartida. `parseTiendaOnlineMetodosPago()` admite hasta 20 entradas, rechaza duplicados y formatos inválidos; no sustituir identificadores por otros inventados.
- En Angular se modificaron `src/app/model/configuracion/settings-form.model.ts`, `settings-form.initial-value.ts`, `settings-form.schema.ts`, `settings-command.mapper.ts` y `src/app/modules/gestion/pages/management-settings/management-settings.component.{ts,html}`.
- En Electron se modificaron `configuration.service.ts`, `configuration-update-command.validator.ts`, contratos `app-data.interface.ts`, `configuration-update-command.interface.ts`, repositorio `json-app-data.repository.ts` y se compartió el tipo de política con el sincronizador.
- **La configuración no pone en marcha la sincronización:** A6.11 debe leerla y componer los servicios con dependencias reales.

#### Incidencias resueltas en A6.10

1. `json-app-data.repository.spec.ts`: instalación antigua devolvía `undefined` en lugar de `null`. Solución en `JsonAppDataRepository.load()`: `tiendaOnlineSync: parsed.tiendaOnlineSync ?? null`.
2. `yazl-otpv-v3-payload.builder.spec.ts`: la comparación profunda del JSON portable fallaba por la nueva propiedad normalizada. Se actualizó `createAppData()` con `tiendaOnlineSync: null`, sin cambiar la aserción ni el generador del backup. El perfil es configuración portable; no quitarlo del backup.

Ambos cambios están publicados en `365716ef9780`. El usuario confirma todos los tests satisfactorios tras las correcciones; el último comando con fallo comunicado era `npm run test:electron`. No consta en este cierre una nueva prueba funcional real del formulario Angular o una sincronización HTTP real. Mantener la validación cruzada cuando se pruebe la integración completa.

### 3.6. Pruebas disponibles y límites

Cada servicio de `electron/backend/application/tienda-online/` (parser, resolver, mapper, preparación, builder, importador y sincronizador) tiene su `.spec.ts`. También hay tests del cliente HTTP, repositorio TypeORM de artículos, contrato de configuración, servicio de configuración y repositorio JSON. El backup conserva su test de payload cifrado.

Comprobado por el código y confirmaciones de desarrollo: preparación, normalización, idempotencia local, fiscalidad posterior al COMMIT, ACK según estado, paginación/reintento, validación y persistencia de configuración. No confundir tests de componentes o fakes con una ejecución real de Electron + API + SQLite + TicketBAI. No consta que las nuevas rutas estén desplegadas en producción, ni que se haya probado el ciclo real completo.

## 4. Próximas unidades funcionales

La secuencia de A6.11 en adelante refleja la planificación recuperada y la ordenación propuesta en la conversación de continuidad. **La numeración A6.12–A6.15 es orientativa** y se puede ajustar al revisar el código y las decisiones del usuario; no constituye un alcance cerrado de cada implementación. Entregar bloques funcionales completos, no un archivo por mensaje.

### A6.11 — Integración operativa de servicios (siguiente)

Objetivo: que Electron pueda construir y ejecutar el flujo A6.6–A6.9 usando la configuración operativa real, con pruebas, sin activar todavía una tarea automática periódica.

1. Revisar `electron/bootstrap/application-composition.ts`, `electron/bootstrap/application-composition.interface.ts`, `electron/main.ts`, `ConfigurationService`, `AppDataRepository`, `SecretStorage` y la composición real de ventas/repositorios/TicketBAI antes de proponer código.
2. Comprobar las condiciones de ejecución: venta online activada, perfil completo y válido, URL y secreto configurados. No conectar una instalación antigua o desactivada ni escoger valores fiscales por defecto. Diferenciar desactivación de error de configuración.
3. Componer `HttpTiendaOnlinePedidosClient`, resolver, mapper, servicio de pedidos, builder con contexto estable, importador y sincronizador; reutilizar repositorios TypeORM y servicio fiscal existentes.
4. Proporcionar una entrada de ejecución controlada en Main y resultado verificable. Decidir la forma concreta de invocación tras revisar la composición; no presupone que haga falta una pantalla nueva, IPC público ni un botón. Proteger de solapamientos si se permite más de una invocación.
5. Añadir pruebas del flujo compuesto/entrada real con dependencias controladas: desactivado, configuración ausente o inválida, uso de perfil y credenciales, pedido exitoso, fallo y recuperación. Mantener tokens y datos personales fuera de logs.
6. No ejecutar aún un scheduler automático ni afirmar que toda la API está lista. Para la primera comprobación real usar un pedido de prueba sin portes o con IVA de envío conocido; si los portes impiden avanzar, coordinar antes A6.12.

Criterio de salida: composición accesible y verificable en Electron, dependencias reales correctamente conectadas, ninguna sincronización inesperada, flujo controlado listo para pruebas reales. Revisión de código y propuesta en un único bloque lógico salvo complejidad justificada.

### A6.12 — Portes con IVA histórico en la API

Definir cómo se registra y conserva el IVA real del transporte al checkout y cómo lo emite `/tpv/orders/pending` como `shippingVatBps`. Revisar el código de Indomable y fiscalidad aplicable; no inventar un tipo ni asignarlo retroactivamente sin evidencia. El Client ya admite la propiedad y crea la línea libre, o bloquea si falta para portes positivos. Mantener compatibilidad con pedidos históricos sin datos. Valorar la migración mínima necesaria y consultar antes de cambios estructurales. Validar ambos repositorios según alcance.

### A6.13 — Scheduler, concurrencia y observabilidad

Planificación periódica en Main, control del ciclo de vida e instalación/configuración, exclusión de ejecuciones simultáneas, límite de páginas, recuperación después de fallos, resumen e incidencias observables. No bloquear Renderer. Reutilizar patrones existentes (p. ej. `electron/backend/application/backup/backup-automatic-scheduler.service.ts`) cuando proceda, sin copiar una infraestructura innecesaria. Definir cadencia y política de presentación/reintento antes de implementarlas. No filtrar credenciales, payloads sensibles ni datos personales.

### A6.14 — Stock y precios TPV → tienda

Diseñar protocolo genérico y autenticado para enviar stock y precios, identidad de artículos/variantes por localizador, reglas de autoridad, conflictos y reenvío seguro/idempotente. Coordinar especialmente la reducción de stock al pagar en tienda y al importar en TPV para evitar incoherencias o duplicaciones de decrementos al publicar existencias. Afecta a ambos repositorios. No convertirlo en remodelación del catálogo maestro ni implementar variantes en Client todavía. Revisar rutas `sync*` Legacy antes de reutilizar o retirar nada.

### A6.15 — Pruebas integrales y cierre del Hito 22

Pruebas reales en entorno de desarrollo: comunicación autenticada, importación e histórico, stock, portes/pagos/fechas, emisión TicketBAI, reconciliación, ACK, caída después de COMMIT y antes de ACK, desconexiones, duplicados, pedidos bloqueados, restauración/configuración y stock/precios en sentido inverso. Probar primero con credenciales y entorno fiscal de test. Revisar pedidos históricos y fecha fiscal/numeración. Preparar despliegue y transición Legacy sin coexistencia peligrosa de sincronizadores; comprobar accesibilidad de endpoints antiguos. No tocar producción sin plan acordado.

Después: completar hitos restantes, distribución/instaladores, actualizaciones, documentación operativa, pruebas finales y publicación. Acordar numeración y alcance exactos cuando corresponda. No adelantar variantes ni catálogo maestro.

## 5. Convenciones de colaboración y validación

- El asistente revisa el HEAD y propone código y pruebas; el usuario aplica, ejecuta, prueba funcionalmente y sube. No hacer commits automáticos. Confirmación de tests y push permite dar un bloque por terminado en su alcance.
- Archivos nuevos completos, JSDoc cuando corresponda; cambios en existentes con rutas exactas y búsquedas/reemplazos inequívocos. Tests completos cuando sea difícil ubicar el cambio. Código en conversación; ZIP solo para entregas realmente grandes. Evitar fragmentación artificial.
- TypeScript strict, aliases reales del repositorio, Angular standalone/Signals/Signal Forms según el código actual. No `any` ni casts inseguros para evitar el tipado. Actualizar fixtures cuando se amplíen contratos/normalizaciones.
- En PHP: `strict_types=1`, OFW 9.12.1, PHP 8.5, PHPUnit 13.4; PHPDoc completo en cada método nuevo/modificado (descripción, `@param` cuando corresponda y `@return` incluso `void`). Propiedades tipadas e `inject()` en constructor, no `inject(...)->metodo()` inline. Preferir ORM salvo razón concreta de transacción/concurrencia/caché. Separar los cambios y documentos de API y Client.

### 5.1. Matriz de comandos (mantener proporcionalidad)

Solo Electron (`electron/**` sin impacto cruzado):

```bash
npm run build:electron
npm run test:electron
```

`build:electron` ya ejecuta `typecheck:electron`; no pedirlo por duplicado. Un cambio solo en fixture puede validarse con `npm run test:electron`. No pedir automáticamente `ng lint`, build Angular o empaquetado de escritorio para cambios únicamente Electron.

Solo Angular (`src/**`): `npm run test`, `npm run build`, `npm run lint` conforme al alcance. Cambios cruzados (contratos compartidos, IPC/preload, integración general o cierre de hito): ambas baterías, y cuando corresponda `npm run build:desktop` y prueba funcional de escritorio. En PHP: `composer test`, `composer test:integration` según alcance; **integración solo en dev**, nunca producción.

## 6. Contexto histórico que debe preservarse

- Hito 21 TPV Backup: `.otpv` v3 (`manifest.json` + `payload.enc`), scrypt/AES-256-GCM, snapshot SQLite consistente, copias locales/remotas, restauración y scheduler. Zero knowledge: servidor no recibe clave de descifrado. Configuración portable (incluido perfil online) dentro del payload cifrado; no restaurar indiscriminadamente ajustes locales de impresión, logs o temporales ni sobrescribir una instalación configurada. Ver `docs/osumi-tpv-backup-v3.md` y documentos anteriores.
- PT-LOG: Main único escritor físico, Renderer usa IPC; JSON Lines, sanitización, rotación, cola y `flush()`. PT-LOG.6 exportación UI descartada. Fallos secundarios de log/cleanup no deben ocultar error primario ni deshacer un COMMIT.
- PT-PLAT: Windows y Ubuntu verificados, SQLite, Sharp, venta, impresión CUPS/PDF, backup/restore. Instaladores definitivos y comprobaciones particulares de impresoras aplazados; no desactivar sandbox/GPU como solución permanente.
- Empleados: no utilizar `app_data.json.empleados`. Inferir modo multiempleado de empleados humanos, excluyendo el empleado estructural online; mantener importador Legacy compatible.
- SDK `@osumi/ticketbaiws` publicado y utilizado en Client; revisar respuesta de Berein si afecta contratos. No reimplementar SDK dentro del importador online.
- Electron se mantiene en rama 44 por compatibilidad TypeORM/better-sqlite3 13; seguimiento separado. `protocol.registerSource()` experimental se evalúa fuera del Hito 22 cuando sea estable. OFW v10 depende de PHP 8.6 en Plesk Linux, también seguimiento separado.
- API: A3 cerrada en alcance, A3.39/40 de outbox de fotos descartadas; no reabrir sin evidencia. Revisar seguridad de sincronización Legacy antes de transición. No confundir ramas de desarrollo con despliegue real.

## 7. Resumen de reanudación inmediata

1. El usuario sube este documento a `docs/osumi-tpv-continuidad-v2.98.md`; verificar HEAD de `main` al reanudar.
2. A6.10 cerrado: no repetir los dos ajustes ni reimplementar contratos/configuración. La API sigue en A6.4.
3. Iniciar A6.11 revisando composición real de Electron y dependencias de los servicios existentes. Proponer una unidad funcional de integración controlada con tests, sin scheduler automático.
4. Mantener el IVA de portes como pendiente real, no confirmarlos si son positivos y el dato histórico no existe. Mantener política fiscal explícita, cursor temporal e idempotencia.
5. No declarar el Hito 22 terminado hasta completar ambos sentidos y las pruebas extremo a extremo.

**Regla esencial:** un Client genérico, distintas tiendas compatibles y un protocolo común. Pedido pagado → venta comercial local sin Caja → TicketBAI después del COMMIT → ACK únicamente según estado fiscal persistido y política acordada. Recuperación sin pérdida ni duplicación, con complejidad proporcionada al negocio.
