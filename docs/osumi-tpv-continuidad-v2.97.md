# Osumi TPV Client — Documento de continuidad v2.97

**Fecha:** 13 de noviembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio del Client:** <https://github.com/osumionline/Osumi-TPV-Client>  
**Rama del Client:** `main`  
**Ruta prevista:** `docs/osumi-tpv-continuidad-v2.97.md`  
**Documento anterior:** `docs/osumi-tpv-continuidad-v2.96.md` (22/10/2026)  
**HEAD verificado del Client al redactar:** `8fb31998380fd1d9ed4b6fbe5d32dbf36bd81412` — «Terminado A6.6 — Comunicación HTTP y preparación de pedidos».  
**Repositorio auxiliar:** `igorosabel/indomable-api` (privado), rama `feature/hito-22-sync-online`.  
**HEAD verificado de la API al redactar:** `f1a401c05d17c7d02d6743e1aff1b33da974492a` — «A6.4 — Líneas comerciales en pedidos pendientes».  
**Continuidad propia de la API:** `docs/indomable-api-continuidad-v1.3.md` (documento anterior a A6; consultar también la rama real).

> **ESTADO DE REANUDACIÓN — Hito 22 EN CURSO.** La infraestructura local de ventas online (S1.A–S1.G) está hecha y probada. La API de desarrollo ofrece autenticación, listado paginado de pedidos pagados con sus líneas y ACK (A6.2–A6.4). El Client ya dispone de contrato remoto genérico, parser, resolución estricta de artículos por localizador, mapeo de líneas, cliente HTTP y preparación por página (A6.5.1–A6.6). **Todavía NO existe una importación operativa que guarde las ventas descargadas, procese TicketBAI y envíe ACK con una política definida.** No marcar completo el Hito 22 ni declarar la sincronización extremo a extremo validada.

---

## 0. Cómo utilizar este documento

Esta v2.97 **sustituye a v2.96 como referencia principal** del Client y conserva las decisiones y el estado histórico necesario para reanudar el desarrollo. No elimina el valor de v2.96: sus secciones de S1 y la versión v2.95 siguen conteniendo detalles históricos de pruebas, backup, logging y plataformas.

**Orden de precedencia en cualquier reanudación:** (1) código y HEAD reales de GitHub; (2) este documento; (3) documentos anteriores y continuidad de la API; (4) conversaciones previas. Un SHA documentado es una fotografía: comprobar GitHub antes de proponer cambios. Los tests figuran como satisfactorios **por confirmación del usuario**, no porque el asistente los haya ejecutado.

**Separación obligatoria de repositorios:** el Client está en `osumionline/Osumi-TPV-Client`, normalmente `main`; el backend de tienda usado para el desarrollo está en `igorosabel/indomable-api`, rama `feature/hito-22-sync-online`. No mezclar sus cambios, configuraciones, tests ni documentos.

---

## 1. Estado general y límites del alcance

| Área | Estado a 13/11/2026 | Nota |
| --- | --- | --- |
| Hitos 16–20 — Compras, Gestión, Caja, Permisos e Informes | Cerrados | No reabrir por mejoras laterales sin motivo funcional |
| Hito 21 — TPV Backup | Cerrado | `.otpv` v3, backups locales/remotos, restauración y scheduler |
| PT-LOG | Cerrado | PT-LOG.6 descartado expresamente |
| PT-PLAT Windows/Linux | Aceptado | Verificado en Windows y Ubuntu; instaladores definitivos pospuestos |
| Hito 22 — S1.A–S1.G: persistencia local de ventas online | **Completado** | `saveOnline()`, idempotencia, stock, histórico, sin caja |
| Backend auxiliar — A1–A3/A4 y A6.2–A6.4 | **Avanzado en desarrollo** | Auditado/modernizado a OFW 9.12.1; endpoints TPV en rama feature |
| Client — A6.5.1–A6.6 | **Completado y subido** | Se pueden **descargar y preparar** pedidos; aún sin importación |
| Construcción completa de comando de venta online | **Pendiente** | Pagos, transporte, fecha y validaciones finales |
| Orquestación de importación comercial y ACK | **Pendiente** | COMMIT, idempotencia, recuperación, ACK condicionado |
| TicketBAI de ventas online | **Obligatorio y pendiente de integrar** | Después del COMMIT comercial, usando servicio fiscal existente |
| Scheduler y seguimiento operativo de sincronización | Pendiente | Control de errores, no duplicados y reintentos |
| Sincronización TPV → tienda de stock/precios | Pendiente | Diseñar después del flujo de pedidos |
| Pruebas HTTP reales entre Client y API y salida a producción | Pendientes | Desarrollo ≠ despliegue validado |
| Variantes **en el catálogo del Client** | **Pospuestas expresamente** | Nueva fase tras terminar hitos y lanzar el Client |
| TPV como fuente maestra del catálogo web | **Pospuesto expresamente** | Novedad futura, no alterar el alcance actual |

**Principio de negocio:** la venta online, una vez importada, es una venta del TPV, pero **no una operación de Caja**. Debe constar en histórico general, descontar stock con integridad y pasar por TicketBAI cuando corresponda. El Client inicia las conexiones HTTPS hacia el backend: la tienda no necesita entrar en el equipo local.

---

## 2. Decisiones de producto y arquitectura que NO deben perderse

### 2.1. El Client es genérico: Indomable no es una dependencia

**Decisión explícita y reciente del usuario:** Osumi TPV Client será utilizado con **distintas tiendas online**. Indomable Store solo es la primera implementación del servidor de sincronización utilizada durante el desarrollo.

- **No** crear clases, interfaces, carpetas, servicios, tests o configuraciones del Client llamados `Indomable` ni acoplarlo a sus modelos internos.
- Nombres de dominio elegidos en el Client: `tienda-online`, `TiendaOnline…`, contratos de protocolo genéricos.
- Cada backend de comercio debe **implementar el protocolo HTTP acordado**; el Client **no** debe crear un conector distinto por marca o plataforma sin una nueva decisión.
- La instalación ya tiene `AppData.ventaOnline`, `AppData.urlApi` y el secreto protegido `InstallationSecretsData.secretApi`. Reutilizarlos: **no crear una segunda configuración ni guardar credenciales en código**.
- La URL de la API se obtiene de la configuración; no fijarla a un dominio de Indomable.
- La referencia remota `reference` y el medio de pago `paymentMethod` son **cadenas genéricas**. El parser NO exige el formato `indomable:<id>` ni restringe el método a `cards`/`paypal`. El adaptador posterior resuelve equivalencias de pago.
- El protocolo remoto actual es **v1**; los endpoints de la primera implementación son `POST /tpv/orders/pending` y `POST /tpv/orders/ack` bajo `urlApi`.

**Cuestión pendiente a resolver antes de persistir:** `venta.referencia_externa` es única dentro del origen `online`, pero distintos servidores podrían reutilizar la misma referencia. Definir cómo se identifica de forma estable una fuente de tienda y cómo se evita una colisión si una instalación cambia de `urlApi`. No concatenar arbitrariamente una URL que pueda cambiar, sin analizar continuidad/idempotencia.

### 2.2. Límites de la primera versión y siguientes etapas

El usuario decidió **terminar todos los hitos actuales, publicar el Client y solo entonces desarrollar novedades**. Por ello:

1. Terminar el Hito 22, el resto de hitos pendientes y pruebas de salida, sin ampliar requisitos estructurales.
2. Lanzar Osumi TPV Client, sustituyendo el TPV Legacy cuando esté preparado.
3. En una fase posterior incorporar al Client **variantes de productos** (tallas, colores u otros atributos) y evolucionar para que el TPV sea la **fuente maestra** de productos, marcas, categorías, precios y stock en la tienda online.

**No iniciar ahora** una remodelación del catálogo del Client para variantes ni retirar del admin de Indomable sus funciones de catálogo. El backend Indomable sí admite actualmente variantes y puede emitir el localizador concreto de la referencia comprada; el Client sigue tratando cada artículo como una entidad singular. Las líneas remotas llevan `productId`, `sizeId`, `colorId` a efectos del contrato, pero la identidad operativa actual del Client se resuelve por `localizador` exacto.

### 2.3. Complejidad y alcance

Priorizar soluciones simples proporcionadas al contexto real: tráfico de la tienda usado para desarrollo bajo (históricamente unos 5–10 pedidos/mes), backend y BD en un único servidor, sin requisitos actuales de alta disponibilidad. No proponer colas distribuidas, infraestructura HA, workers u otros subsistemas porque sí. Consultar antes de cambios estructurales, migraciones importantes o complejidad elevada.

En la API, la sincronización Legacy de producción sigue existiendo; las rutas nuevas TPV se desarrollaron en la rama feature. **No activar nuevos flujos sobre producción ni modificar el Legacy por accidente.**

---

## 3. Hito 22 — Fundamentos locales ya completados (S1.A–S1.G)

Conservar el historial y estos contratos al integrar el flujo remoto:

| Bloque | Funcionalidad validada | Commit Client |
| --- | --- | --- |
| S1.A | `venta.origen`, `venta.referencia_externa`, identidad online y unicidad | `427f3b492218` |
| S1.B | Empleado estructural «Tienda online» | `cad86eed81c8` |
| S1.B.1 | Compatibilidad importador Legacy con empleado de sistema y fallback | `c20d6a03a326` |
| S1.C.1 | Ventas presenciales con `origen='tpv'` y empleado humano | `973c8ffafe02` |
| S1.C.2 | `GuardarVentaOnlineRecordCommand` y `saveOnline()` transaccional, sin caja, idempotente, con líneas/pagos/stock | `199ac9b56069` |
| S1.D | Histórico incluye ventas online en totales generales, sin afectar acumulados de Caja | `7311bda7a1ae` |
| S1.E | Prohibiciones postventa para cambio de cliente/medio de pago en origen online | `63b8977da85` |
| S1.F | `VentaOnlineCommandValidator` económico y comercial | `1f2cb9361b17` |
| S1.G | Validación de correspondencia de artículo local y localizador durante `saveOnline()` | `750a5d62c614` |

**Características de `saveOnline()` verificadas en el código:**

- Valida `referenciaExterna` y `pagadaAt` como ISO con `Z` antes de guardar; usa `VentaOnlineCommandValidator` incluso en reintentos.
- Comprueba existencia por referencia externa; reintentos con mismo total no crean otra venta; un total diferente provoca rechazo. **No comprueba todavía la identidad completa de todas las líneas de un reintento**.
- Inserta venta `origen='online'`, `id_caja=NULL`, empleado estructural, secuencia compartida, fecha asociada a `pagadaAt`.
- Inserta líneas y pagos, valida vínculo artículo–localizador, actualiza stock e histórico transaccionalmente.
- **No actualiza** acumulados de caja o `caja_tipo`.
- **No realiza TicketBAI** ni ACK por su cuenta. Es responsabilidad del orquestador posterior al COMMIT.
- En su forma actual, `resolveTiposPago()` requiere un tipo local activo y `fisico=1`: es una limitación real a resolver para pagos de tienda (ver §7).

**Regla SQLite del periodo de desarrollo:** la base local aún no se considera de producción; los ajustes del esquema original se hicieron directamente manteniendo `DATABASE_SCHEMA_VERSION = 1`. **No introducir migraciones ni elevar versión de esquema por rutina**; reevaluar compatibilidad y migración antes de distribuir actualizaciones a instalaciones reales.

---

## 4. Backend de tienda usado en desarrollo — trabajo realizado después de v2.96

**Repositorio:** `igorosabel/indomable-api` (privado), rama `feature/hito-22-sync-online`.

La auditoría y puesta al día previstas en v2.96 se ejecutaron antes de iniciar la sincronización: OFW 9.12.1, PHP 8.5, PHPUnit 13.4, tests unitarios/integración, revisión de middleware, checkout, pagos, stock y variantes. El documento de continuidad **propio del backend** (`v1.3`) detalla A1–A3 y decisiones de mantenimiento; está fechado antes de estos bloques A6. Consultar **siempre el código actual** para detalles que aún no estén en ese documento.

### 4.1. Cambios A6 relevantes

| Bloque | Resultado | Commit backend |
| --- | --- | --- |
| A6.1 | Diseño y separación del primer contrato de sincronización | Decisión de proyecto; no inferir un commit exclusivo |
| A6.2 | Middleware `TpvSyncMiddleware`; rutas POST de consulta y ACK; servicio `TpvSyncService`; pruebas | `6cbddcf78a21`, corrección test `9d7f2b20190a` |
| A6.3 | Snapshots de línea en `order_product` y captura en checkout | `b40918629a8e` |
| A6.4 | `pending()` devuelve también las líneas comerciales originales | `f1a401c05d17` |

**Rutas:** las rutas TPV están en **`src/Routes/Tpv.php`**, con prefijo `/tpv`, **no** en `src/Routes/Api.php`. El test `TpvSyncRoutesTest` fue adaptado para leer esa ruta específica; no volver a revertir esta organización.

**Seguridad:** `TpvSyncMiddleware` valida `Authorization: Bearer <64 caracteres hexadecimales minúsculos>` contra el extra `tpv_sync_token` de la configuración OFW activa. Si está ausente o mal formado, rechaza. El token se configura centralmente en `Config_dev.json` / `Config_prod.json` según política del backend; **no volcar secretos en documentación, ejemplos ni logs**. El `secretApi` protegido del Client debe coincidir con el token del backend al realizar pruebas reales.

**`TpvSyncService::pending(afterId)`**: máximo **20** pedidos por página, ID ascendente, `id > afterId`; selecciona pedidos pagados con estados admitidos (1, 2, 3), `sync IN (0,1)` y `payed_at IS NOT NULL`. Devuelve fecha civil MariaDB `DATETIME` sin offset, método de pago, totales en céntimos y `items`. Lee las líneas en una consulta adicional para la página; **no reconsulta el catálogo para inventar snapshots**. Un pedido antiguo puede tener campos nuevos a `null`.

**`TpvSyncService::acknowledge(id)`**: idempotente para pedidos pagados elegibles; marca `sync=2`. Su existencia **no autoriza** que el Client lo utilice antes de completar las garantías del flujo comercial/fiscal.

**Snapshots A6.3 en `order_product`:** `name_snapshot`, `brand_snapshot`, `localizador_snapshot`, `iva_bps_snapshot`. Cuatro campos anulables, conservados al checkout para producto simple o variante. Migración de desarrollo: `db/migrations/20261106_order_product_snapshots.sql`. Los importes originales de línea (`amount_before`, `discount`, `amount_after`) ya existían; no duplicarlos. La API manda importes de línea en céntimos y `ivaBps` en puntos básicos.

### 4.2. Protocolo HTTP v1 existente

`POST {urlApi}/tpv/orders/pending` con `Authorization: Bearer <secretApi>` y cuerpo `{"afterId":0}`. Respuesta con `status:'ok'`, `version:1`, `orders:[...]`. Cada pedido lleva:

- `id` entero positivo, `reference` identificador textual remoto, `paidAt` cadena `YYYY-MM-DD HH:mm:ss` **sin zona horaria**, `paymentMethod` texto.
- `productsTotalCents`, `shippingCents`, `totalCents` en céntimos.
- `items[]` con `productId`, `sizeId`, `colorId`, `quantity`, `name`, `brand`, `localizador` (cadena conservando ceros iniciales), `ivaBps`, `amountBeforeCents`, `discountCents`, `lineTotalCents`.
- Snapshots comerciales y algunos importes originales pueden ser `null` en pedidos históricos; parser acepta `null`, **adaptador de importación no debe inventarlos**.

`POST {urlApi}/tpv/orders/ack` con `{"id":123}` y respuesta `{"status":"ok","acknowledged":true}` cuando se confirma. En el Client ya está implementado el transporte de ACK, **pero no se invoca automáticamente**.

El backend real devuelve referencias como `indomable:<id>` y métodos `cards`/`paypal`. **El contrato genérico del Client no exige esos valores concretos**: corresponde a cada backend compatible emitir valores estables y al adaptador comercial resolverlos.

La API Legacy sigue fuera del rediseño de estos endpoints; revisar su seguridad/despliegue cuando toque reemplazarla. No afirmar que la API de producción está ya sincronizando con el nuevo Client.

---

## 5. Client — bloques completados tras v2.96

**Todos los siguientes bloques fueron aplicados, probados por el usuario y subidos al repositorio `main`.**

| Bloque | Entrega | Commit Client |
| --- | --- | --- |
| A6.5.1 | Contratos genéricos de respuesta HTTP v1, parser validante y tests | `aa64dc38f5ce` |
| A6.5.2a | Resolver exacto del artículo por `localizador` numérico, consulta específica TypeORM y tests | `03a0ad5ef4f1` |
| A6.5.2b | Mapper económico de líneas remotas a `GuardarVentaLineaRecordCommand[]` y tests | `040c7f36ebdf` |
| **A6.6** | Cliente HTTP genérico, carga desde configuración, consulta/ACK técnico, servicio de preparación de páginas y pruebas | **`8fb31998380f`** |

### 5.1. Mapa de archivos actuales (rutas exactas)

**Contratos**

- `electron/backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface.ts`: `TiendaOnlineLineaPedido`, `TiendaOnlinePedidoPendiente`, `TiendaOnlinePedidosPendientesResponse`.
- `electron/backend/contracts/tienda-online/tienda-online-articulos.repository.interface.ts`: consulta exacta por localizador.
- `electron/backend/contracts/tienda-online/tienda-online-pedidos.client.interface.ts`: `pending(afterId)` y `acknowledge(orderId)`.
- `electron/backend/contracts/ventas/guardar-venta-online-record-command.interface.ts`: destino comercial interno existente (`GuardarVentaOnlineRecordCommand`).

**Aplicación**

- `electron/backend/application/tienda-online/tienda-online-pedidos-pendientes.parser.ts`: parsea `unknown` a protocolo v1 con validación de estado, página de máximo 20, IDs/referencias duplicados, fechas civiles, estructura e importes.
- `electron/backend/application/tienda-online/tienda-online-articulo-resolver.ts`: exige localizador remoto en forma de cadena de dígitos, entero seguro y positivo; permite ceros iniciales y localiza artículo exacto.
- `electron/backend/application/tienda-online/tienda-online-lineas.mapper.ts`: genera líneas internas a partir de snapshots históricos; coste del artículo local, pero nombre/marca/IVA e importes del pedido remoto; rechaza datos incompletos, importes inconsistentes y unitarios imposibles de expresar en microeuros exactos.
- `electron/backend/application/tienda-online/tienda-online-pedidos.service.ts`: `preparePage(afterId=0)` descarga, parsea y transforma las líneas. Devuelve `TiendaOnlinePaginaPreparada` con `nextAfterId`, `hasMore` y pedidos `lines-ready` o `blocked`. **No guarda ventas, no marca cursor persistente, no ejecuta ACK ni TicketBAI.**
- `electron/backend/application/ventas/venta-online-command.validator.ts`: validador de venta **ya normalizada**, no del HTTP externo.
- `electron/backend/application/ventas/ventas-ticket-bai.service.ts`: servicio fiscal existente, **aún no conectado al importador online**.

**Infraestructura**

- `electron/infrastructure/tienda-online/http-tienda-online-pedidos.client.ts`: usa `urlApi` + `secretApi` sin nombre de plataforma; construcción `fromConfiguration()`, POST autenticado, timeout, validación de HTTP/JSON y método ACK. Exige token hexadecimal de 64 caracteres; HTTPS salvo `localhost`/loopback; prohíbe credenciales, query y fragmento en URL y redirects HTTP.
- `electron/infrastructure/database/typeorm/typeorm-ventas-articulos.repository.ts`: `findByLocalizador()` exclusivo, separado de `resolveByCode()`. El buscador ordinario admite accesos directos/códigos de barras y **no es apto para importación automática**.
- `electron/infrastructure/database/typeorm/typeorm-ventas-persistencia.repository.ts`: `saveOnline()` existe desde S1, aún no invocado por la sincronización.

**Pruebas nuevas verificadas por el usuario**

- `electron/backend/application/tienda-online/tienda-online-pedidos-pendientes.parser.spec.ts`
- `electron/backend/application/tienda-online/tienda-online-articulo-resolver.spec.ts`
- `electron/backend/application/tienda-online/tienda-online-lineas.mapper.spec.ts`
- `electron/backend/application/tienda-online/tienda-online-pedidos.service.spec.ts`
- `electron/infrastructure/database/typeorm/typeorm-ventas-articulos.repository.spec.ts`
- `electron/infrastructure/tienda-online/http-tienda-online-pedidos.client.spec.ts`

### 5.2. Qué se ha comprobado y qué no

**Sí comprobado por las suites y commits comunicados:** formato del protocolo, invariantes económicos básicos, localizador exacto, rechazo de variantes/snapshots sin identidad suficiente, recuperación por página, aislamiento de pedidos `blocked`, autenticación y forma de las peticiones HTTP simuladas, respuesta de ACK técnico. Los tests del repositorio de artículos usan SQLite temporal.

**No comprobado todavía:** comunicación HTTP real entre ambos sistemas, integración efectiva de `ConfigurationService`/`SecretStorage` con un proceso lanzado por Electron, persistencia real de una venta descargada, TicketBAI de la venta importada, condiciones del ACK, scheduler ni sincronización TPV → tienda.

**Detalles que no deben confundirse:** `nextAfterId` es un cursor **solo de la página preparada**, no una marca de sincronización persistida. Un pedido `blocked` se devuelve identificado con un error; no se confirma en la tienda. `hasMore` se calcula si la página contiene 20 pedidos; no significa que todos se hayan importado. Cualquier futura estrategia de paginación debe garantizar que un bloqueado pueda reintentarse y no se pierda por avanzar permanentemente el cursor.

---

## 6. Contrato de persistencia y economía de las líneas

### 6.1. Mapeo ya construido

`TiendaOnlineLineasMapper` transforma cada `TiendaOnlineLineaPedido` al contrato interno:

| Campo interno | Fuente/regla |
| --- | --- |
| `articuloPublicId`, `localizador` | Artículo local resuelto de forma exacta |
| `nombre`, `marca` | Snapshots originales de la tienda |
| `pucMicros` | Coste del artículo en el TPV |
| `pvpMicros` | `amountBeforeCents × 10.000 / quantity`; solo si la división es exacta |
| `importeMicros` | `lineTotalCents × 10.000` |
| `importeDescuentoMicros` | `discountCents × 10.000` |
| `descuentoBps` | 0; se usa descuento económico fijo |
| `ivaBps` | Snapshot histórico de la tienda |
| `unidades` | Cantidad original positiva |
| `regalo` | `false` (descuento íntegro ≠ regalo necesariamente) |
| Origen devolución/reserva | `null` |

Los microeuros son enteros seguros; no recalcular precios con el catálogo actual, no redondear los datos históricos silenciosamente. Snapshots `null` admitidos por el parser **se rechazan en el mapper cuando son imprescindibles para una venta válida**.

### 6.2. Cuestiones de coherencia pendientes

- **Transporte:** `shippingCents` se recibe como importe separado, no aparece como línea interna todavía. `VentaOnlineCommandValidator` exige igualdad entre total de líneas y total pagado: una venta con portes positivos no podrá guardarse hasta decidir cómo representarlos fiscal/comercialmente y con qué IVA histórico. **No aplicar 21 % por defecto.**
- **Descuentos/redondeo:** mantener igualdad entre importes de línea, total, pagos y desglose fiscal; evaluar descuentos por pedido no asignados a líneas, promociones, cupones y unitarios no representables exactamente. Rechazar explícitamente casos ambiguos, no inventar importes.
- **Pagos:** `paymentMethod` remoto es texto libre estable dentro de cada backend; `GuardarVentaPagoRecordCommand` exige `tipoPagoPublicId` local, `importeCents`, `entregadoCents`, `cambioCents`. Resolver equivalencias contra tipos activos sin asumir que PayPal o Redsys corresponden automáticamente a un slug local. `saveOnline()` actualmente valida `fisico=1` en `resolveTiposPago()`: decidir política/ajuste mínimo para medios online.
- **Fechas:** `paidAt` remoto es `DATETIME` local **sin zona horaria**, pero `saveOnline()` exige un instante ISO UTC (`...Z`). Definir zona horaria de la tienda y conversiones verificables. No convertir con la zona horaria del ordenador sin decisión; considerar horario de verano y fechas ambiguas.
- **Fiscalidad:** fecha original de pago vs. fecha de expedición/envío TicketBAI, numeración y antigüedad de pedidos. Revisar el comportamiento del mapper fiscal existente y normativa aplicable antes de importar pedidos históricos reales.
- **Identidad múltiple de fuentes:** definir la estrategia para `referenciaExterna` al conectar distintos backends y qué ocurre si cambia la URL configurada.
- **Importación parcial:** un artículo ausente, un IVA histórico nulo, una equivalencia de pago indefinida o un transporte no representable deben bloquear ese pedido sin pérdida y sin ACK.
- **Reintentos:** `saveOnline()` es idempotente por referencia + total, pero no compara todas las líneas: valorar si se requiere una barrera extra ante cambios de contenido con igual total.

---

## 7. Próximas unidades funcionales — orden de trabajo propuesto

**No crear un nuevo bloque de una sola clase por mensaje.** El usuario pidió explícitamente avanzar en **entregas funcionales completas**, incluso si tocan varios archivos, reservando ZIP solo para cambios realmente voluminosos. La división entre unidades siguientes obedece a garantías comerciales/operativas, no a comodidad de producción de archivos.

### 7.1. Próxima unidad prioritaria: adaptación completa + preparación de guardado

**Objetivo:** pasar de `TiendaOnlinePedidoConLineas` a un `GuardarVentaOnlineRecordCommand` completo y válido, con tests integrados, **sin adelantar garantías fiscales o políticas de ACK no acordadas**.

Incluir coherentemente en el mismo bloque según las decisiones funcionales:

1. Resolver métodos de pago remotos contra tipos locales configurados, con errores claros y sin valores por defecto inventados.
2. Definir la representación económica/fiscal de `shippingCents > 0`; acordar qué dato adicional necesita el protocolo si el IVA de envío no puede deducirse históricamente.
3. Convertir la fecha del pedido a `pagadaAt` inequívoco, con política de zona horaria conocida y tests de horario de verano.
4. Construir identificador de venta y referencia externa estables e idempotentes, sin colisiones entre fuentes.
5. Crear el comando completo (`lineas`, `pagos`, total) y validarlo con `VentaOnlineCommandValidator`; probar casos buenos, rechazos y reintentos. No duplicar mappers existentes.
6. Actualizar, si es necesario, backend y Client **por separado** y con sus suites. Si falta información remota imprescindible, primero concretar el contrato y el ajuste mínimo correspondiente.

**Atención:** hay **decisiones abiertas reales** (IVA del envío, zona horaria, equivalencias de pago y referencia multifuente). No resolverlas con supuestos ni prometer una importación lista para producción antes de tratarlas. Un bloqueo explícito y probado puede ser una política temporal, pero no debe presentarse como soporte de casos que aún no maneja.

### 7.2. Importador y persistencia comercial

Con el comando completo validado, conectar las dependencias a la configuración/secretos reales y ejecutar `saveOnline()` en SQLite. Respetar unicidad e idempotencia, numeración, stock e histórico; mantener ventas online fuera de Caja. Probar reintentos y fallos antes/después de COMMIT. No confundir la prueba de un repositorio aislado con todo el proceso de sincronización.

### 7.3. TicketBAI posterior al COMMIT + política de ACK

**Decisión previa inamovible:** las ventas online deben pasar por TicketBAI cuando la instalación lo tenga configurado. Reutilizar `VentasTicketBaiService.processInitial(idVenta)`, `reconcile()` y `retry()`; **no** hacer una llamada fiscal dentro de la transacción SQL ni duplicar el módulo fiscal. Los errores posteriores al COMMIT no deben borrar ni duplicar la venta. Un reintento no debe emitir dos facturas iniciales.

**Pendiente de decisión explícita:** condición exacta del ACK: ¿persistencia comercial definitiva o qué estado fiscal? Definir el comportamiento ante fiscal pendiente, enviado, error, rechazo o reconciliación; registrar los estados mínimos para reanudar tras una caída. El endpoint ACK del backend ya existe, pero **no llamarlo antes de fijar esta regla**.

### 7.4. Ejecución periódica y manejo de errores

Crear orquestación y scheduler del Client, sin bloquear Renderer, con concurrencia limitada y estado observable. Diseñar paginación/reintentos de modo que un pedido bloqueado no se pierda tras avanzar `afterId`; diferenciar descarga, conversión, persistencia, fase fiscal y ACK. Evitar loops de peticiones, duplicados y divulgación de credenciales. Volumen conocido bajo; priorizar sencillez.

### 7.5. Envío de stock y precios TPV → tienda

Pendiente de diseñar contrato compatible con tiendas distintas, fuente y sentido de cambios, conflictos, marcas temporales y política de reenvío. No presuponer aquí la remodelación posterior de variantes o administración del catálogo maestro.

### 7.6. Cierre funcional y preparación de salida

Pruebas reales en entorno de desarrollo entre Client y API; simulación de desconexiones, errores fiscales y reintentos; verificar que Legacy no se ve afectado. Después completar hitos restantes, documentación de operación, seguridad de configuración y salida a producción. Distribución/instaladores definitivos y soporte de actualizaciones se abordan en la etapa correspondiente.

---

## 8. Convenciones actualizadas de colaboración y calidad

### 8.1. Reparto de responsabilidades

1. **ChatGPT** consulta el GitHub actual antes de cada bloque, analiza contratos y código implicado, propone una **unidad funcional coherente**, escribe los archivos/tests necesarios y especifica ubicaciones y validación.
2. **El usuario** aplica los cambios localmente, **ejecuta los tests y builds necesarios**, realiza las pruebas funcionales y hace los commits/push. Cuando confirma que todo ha pasado y está subido, considerar ese bloque terminado y avanzar.
3. El asistente **no tiene que ejecutar pruebas, preparar ejecuciones locales ni repetir «no he podido ejecutar las pruebas»**: está acordado que ese control lo realiza el usuario. No realizar commits del Client ni del backend.
4. Dar **archivos nuevos completos** y, para archivos existentes, búsquedas/reemplazos inequívocos. Si los cambios son pequeños o medianos, **código directamente en la conversación**; un ZIP solo si hay muchos archivos grandes o una cantidad de código que haga poco manejable el mensaje.
5. No dividir artificialmente cada archivo en una interacción: agrupar contratos, servicios, integración y tests en **bloques funcionales**. No añadir complejidad o refactors estéticos por inercia.
6. Respetar **TypeScript strict**, aliases del repositorio, JSDoc donde corresponda; no usar `any` o aserciones inseguras para esquivar el tipado. Mantener compatibilidad con servicios/fixtures y fakes existentes al ampliar interfaces.
7. Si se modifica PHP/OFW, documentar los métodos con PHPDoc completo y aprovechar las suites unitarias/integración adecuadas. Mantener el entorno de desarrollo protegido.
8. Mantener por separado documentos y cambios del Client y del backend; no sustituir decisiones confirmadas por propuestas nuevas no aprobadas.

### 8.2. **Matriz CORREGIDA de comandos de validación**

**Solo ficheros Electron (`electron/**`, sin impacto en Angular ni contratos compartidos):**

```bash
npm run build:electron
npm run test:electron
```

`build:electron` **ya ejecuta** `npm run typecheck:electron`, de modo que no hace falta lanzar ambos por sistema. Las suites de Angular (`npm run test`) y su build (`npm run build`/`build:desktop`) **no son necesarios por defecto** cuando el cambio es exclusivamente Electron. `npm run lint` usa `ng lint`; tampoco hace falta reclamarlo siempre para un bloque solo de Electron. Ejecutar el test específico Vitest puede ayudar a localizar fallos, pero no es requisito adicional si se pasa la suite Electron completa.

**Cambios solo Angular (`src/**` / UI):** ejecutar la batería relevante de Angular (`npm run test`, `npm run build`, `npm run lint`) conforme al alcance.

**Cambios cruzados (Electron ↔ Angular, preload, IPC, contratos usados en ambos lados), integraciones generales o cierre de hito:** ejecutar ambas baterías y, cuando corresponda, `npm run build:desktop` y pruebas funcionales de escritorio.

**Backend PHP, solo en desarrollo:** `composer test` y `composer test:integration` según lo afectado; integración nunca sobre producción.

No pedir de forma mecánica cinco comandos completos después de cada modificación. La validación debe ser proporcional, sin reducir cobertura del área afectada.

---

## 9. Contexto histórico que debe seguir preservado

### 9.1. TPV Backup (Hito 21)

Cerrado: `.otpv` v3 (`manifest.json` + `payload.enc`), cifrado scrypt/AES-256-GCM, snapshot consistente SQLite, copias locales y remotas, restauración, scheduler. TPV Backup mantiene un modelo *zero knowledge*: el servidor no recibe la clave de descifrado. Ajustes locales no portables (impresoras, logs, rutas temporales) no deben restaurarse indiscriminadamente; no sobrescribir una instalación configurada. Referencia de mayor detalle: v2.95/v2.96.

### 9.2. PT-LOG y PT-PLAT

PT-LOG cerrado; Main es escritor físico único, Renderer usa IPC, JSON Lines, sanitización, rotación, cola y `flush()`. **PT-LOG.6 descartado**: no volver a proponer exportación de logs por UI. Los fallos secundarios de logging/cleanup no deben tapar errores primarios ni revertir COMMIT exitosos. No registrar tokens ni datos personales de pedidos.

Compatibilidad Windows/Linux aceptada tras tests automáticos y prueba real en Ubuntu, incluyendo impresoras CUPS/PDF, SQLite, Sharp, venta, backup/restore. Distribución e instaladores siguen aplazados; no bloquear Hito 22 por ellos.

### 9.3. Empleados, TicketBAI y trabajos independientes

- No usar `app_data.json.empleados`: inferir el modo multiempleado de **empleados humanos**, excluyendo el empleado estructural de tienda online; mantener importador Legacy compatible.
- `@osumi/ticketbaiws` publicado como SDK y usado en el Client; revisar correcciones futuras de Berein si afectan sus contratos.
- `protocol.registerSource()` de Electron está bajo seguimiento **independiente**; no adoptarlo durante Hito 22 mientras sea experimental y sin reevaluar conveniencia.
- La preparación de OFW 10 depende de PHP 8.6 disponible en Plesk Linux, seguimiento independiente; no incluirlo como dependencia de Hito 22.

---

## 10. Punto exacto para reanudar tras subir v2.97

1. El usuario subirá **este documento** a `docs/osumi-tpv-continuidad-v2.97.md` en `main`. Verificar el HEAD después de ese commit antes de reanudar.
2. **A6.6 queda terminado** por confirmación del usuario. El siguiente objetivo no es agregar otro helper aislado, sino una **unidad funcional completa de adaptación de pedido remoto → venta online normalizada**, con decisión explícita sobre transporte/IVA, pagos, fechas e identidad de origen y tests.
3. Revisar los archivos actuales enumerados en §5 y el backend v1 en §4, además de `saveOnline()` y TicketBAI existentes. No reimplementar los mappers, el repositorio de artículos, el parser o el HTTP ya completados.
4. Si falta información del backend para transportar el IVA de envío o la fecha de forma inequívoca, plantear la **modificación mínima y conjunta del contrato** y los tests por repositorio, sin suponer valores fiscales.
5. Tras construir comandos válidos, implementar **persistencia real + fiscal post-COMMIT + ACK conforme a política acordada**, con fallos/reintentos probados; después scheduler y stock/precios TPV → tienda.
6. **No dar por finalizada la sincronización ni TicketBAI online hasta pruebas reales de extremo a extremo.** Mantener Legacy de producción intacto hasta el plan de sustitución.

### Regla de continuidad esencial

> **Un Client, distintas tiendas online, un protocolo común.** Los pedidos pagados se descargan desde el TPV mediante HTTPS, se convierten a ventas locales coherentes, se guardan **sin caja**, descuentan stock y aparecen en histórico. Cuando corresponda, se procesan mediante TicketBAI **después del COMMIT**. El ACK remoto solo se envía cuando el sistema ha cumplido la condición comercial/fiscal acordada y es capaz de recuperarse de interrupciones. El usuario implementa, prueba y sube; el asistente prepara bloques funcionales completos basados en el código actual de GitHub.
