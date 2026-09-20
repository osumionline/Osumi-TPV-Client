# Osumi TPV Client — Documento de continuidad v2.75

**Fecha:** 21 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento sustituye a `docs/osumi-tpv-continuidad-v2.74.md`.

Su objetivo es permitir retomar el desarrollo sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

- Cada respuesta de desarrollo contiene **una sola unidad pequeña y autocontenida**.
- Antes de cada bloque: resumir terminado, indicar punto actual, pendiente y explicar qué hace la unidad.
- Antes de proponer código dependiente del repositorio, revisar siempre `main`.
- No inventar rutas, clases, helpers, APIs ni contratos.
- Archivo nuevo: contenido completo.
- Archivo existente: bloque exacto, localización y contexto suficiente.
- Los tests de una unidad se implementan en esa misma unidad.
- El usuario ejecuta la batería completa:

  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```

- No continuar si hay tests/builds fallando.
- Tras verde + push, volver a revisar `main` antes del siguiente bloque.
- No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique objetivo y comportamiento heredado.
- Todo método público nuevo debe llevar JSDoc.
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

## Angular

- Angular 22.1.7.
- standalone.
- zoneless.
- signals.
- `input()` / `output()`.
- `inject()`.
- `computed()` / `effect()` cuando proceda.
- `@if` / `@for`.
- Signal Forms.
- `viewChild()` signal.
- evitar APIs legacy salvo necesidad real.
- servicios propios con `@Service()`.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer/frontend: globals según configuración actual.
- Aislar hijos pesados en specs del padre cuando el hijo ya tiene tests propios.
- Caso consolidado: `PaymentTypeStatisticsComponent` se sustituye por stub en el spec de `ManagementPaymentTypesComponent` para no inicializar ECharts/`ResizeObserver` en JSDOM.

---

# 2. Repositorios y acceso

## Osumi TPV

- Cliente nuevo: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

## Indomable Store

Repositorios disponibles para estudiar la sincronización futura:

- Panel Angular: `https://github.com/igorosabel/indomable-admin`
- Backend Osumi Framework: `https://github.com/igorosabel/indomable-api`
- Frontend tienda: `https://github.com/igorosabel/indomable-frontend`

**Regla expresa del usuario:** tratar estos repositorios en **modo estrictamente de solo lectura**. No crear commits, ramas, PRs, issues, comentarios ni modificar archivos.

La GitHub App `ChatGPT Codex Connector` quedó instalada también en la cuenta `igorosabel` y el acceso de lectura funciona.

---

# 3. Estado general

## Cerrado

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell/rutas ✅
  - 17.2 Auth backend empleados ✅
  - 17.3 Sesión/permisos ✅
  - 17.4 Ajustes ✅
  - 17.5 Empleados ✅ **CERRADO**
  - 17.6 Tipos de pago ✅ **CERRADO**
    - 17.6.1 infraestructura/lectura/memoria/startup ✅
    - 17.6.2 estructura visual ✅
    - 17.6.3 Datos + logo ✅
    - 17.6.4 CRUD ✅
    - 17.6.5 orden persistente ✅
    - 17.6.6 estadísticas ✅
    - 17.6.7 regresión final ✅

## Pausa técnica posterior a 17.6

- Foco del modal de login de Gestión ✅ **CERRADO**
- Ventas/Empleados: simplificar selección de empleado ⏳ **SIGUIENTE**

## Pendiente global

- 18 Caja ⏳
- 19 Enforcement global de permisos ⏳
- Sincronización Indomable Store ↔ Osumi TPV 📋 **PLANIFICADA, NO INICIADA**
- TicketBAI 12C.9 ⏸ hasta respuesta/actualización de Berein.

---

# 4. Punto exacto de continuidad

Último commit confirmado en `main` al generar esta versión:

```text
fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709
Corrección modal login en Gestión
```

El usuario confirmó tests y prueba funcional correctos para esa corrección.

## Siguiente paso exacto

Antes de Caja hay un único ajuste inmediato:

> **Eliminar la dependencia del check “Usar empleados” y basar Ventas exclusivamente en el número real de empleados disponibles.**

Regla acordada:

```text
0 empleados  → error / no se puede iniciar la venta
1 empleado   → asignación automática
2 o más      → mostrar siempre selector de empleado
```

Debe aplicarse a:

- nueva venta;
- venta procedente de reservas;
- cualquier flujo actual de Ventas que dependa de `appData.empleados`.

El flag `empleados` puede retirarse completamente si la revisión final de usos confirma que ya no tiene otra función real.

Después:

```text
18 Caja
```

---

# 5. Corrección del modal de login de Gestión ✅

Problema:

- tras contraseña incorrecta el código hacía `.focus()`;
- `loading` seguía en `true`;
- el input seguía `disabled`;
- el foco no podía volver realmente.

Solución:

- detectar `invalid_password`;
- limpiar contraseña y mostrar error;
- finalizar `loading`;
- recuperar foco con `afterNextRender()` cuando el input ya está habilitado.

Cobertura añadida:

1. input deshabilitado durante autenticación;
2. respuesta `invalid_password`;
3. input vuelve a habilitarse;
4. foco real vuelve al campo de contraseña.

Commit:

```text
fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709
Corrección modal login en Gestión
```

Punto cerrado.

---

# 6. Empleados — ajuste transversal pendiente

17.5 sigue cerrado funcionalmente:

- lectura;
- alta;
- edición;
- baja lógica;
- autenticación;
- scrypt;
- bcrypt legacy con migración;
- último administrador protegido;
- permisos 1–25;
- autogestión;
- feedback y foco.

El ajuste pendiente no reabre 17.5: modifica cómo **Ventas** elige empleado.

## Decisión

No usar el check/flag `empleados`.

Política única:

```text
0 → bloquear/informar
1 → asignar directamente
>1 → selector
```

`EmployeeSelectorComponent` ya existe y debe reutilizarse.

Debe revisarse la retirada de `empleados` de:

- `AppData`;
- instalación;
- Ajustes;
- comandos/mappers;
- Ventas;
- tests.

Compatibilidad:

- un `app_data.json` antiguo con `"empleados": true/false` puede seguir cargándose ignorando esa propiedad;
- no crear migración únicamente por esto.

---

# 7. Gestión y permisos

`GestionSessionService` mantiene sesión temporal de Gestión.

- `empleadoId`
- `authenticatedAt`
- `expiresAt`
- duración fija: 10 minutos desde login.

No se renueva por actividad.

Permisos relevantes:

- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos
- 22 Borrar empleados
- 23 Modificar permisos
- 24 Estadísticas empleados
- 25 Copias de seguridad

Administradores tienen bypass mediante `hasPerm()` / `hasAnyPerm()`.

El enforcement global fino sigue reservado para el hito 19.

---

# 8. Tipos de pago — estado definitivo

17.6 está cerrado.

Incluye:

- maestro global;
- Efectivo estructural;
- búsqueda;
- alta/edición/baja lógica;
- slug interno;
- logo/staging/WebP;
- drag & drop;
- persistencia transaccional del orden;
- rollback optimista;
- estadísticas;
- filtros temporales;
- ECharts;
- protección ante respuestas obsoletas;
- tests y pruebas funcionales.

## Efectivo estructural

- nombre `Efectivo`
- slug `efectivo`
- `afectaCaja = true`
- `orden = 0`
- `fisico = true`
- sin logo

Está en el maestro global pero oculto en Gestión; no se edita, elimina ni reordena.

## Flags

`afectaCaja` se conectará a 18 Caja.

`fisico = true` significa disponible en venta presencial.

---

# 9. TicketBAI / SDK

SDK:

```text
@osumi/ticketbaiws
```

Estado:

- versión 1.0.1;
- ESM only;
- tests OK;
- README general;
- documentación exhaustiva en `docs/`.

12C.9 sigue pausado hasta respuesta/actualización de Berein.

---

# 10. Sincronización futura — alcance del análisis

La sincronización Indomable Store ↔ Osumi TPV se ha estudiado **antes de implementarla**.

Código revisado en lectura:

```text
igorosabel/indomable-admin
igorosabel/indomable-api
osumionline/TPV-API
osumionline/Osumi-TPV-Client
osumionline/plugin-token
```

`indomable-admin` es el panel Angular.

El backend real es:

```text
igorosabel/indomable-api
```

Osumi Framework 9 / PHP 8.2.

---

# 11. Sincronización antigua

## Web → TPV

`indomable-api` usa `WebService::syncSale()`:

- busca pedidos `sync IN (0, 1)`;
- construye token;
- llama al TPV antiguo;
- recibe estado por pedido;
- `ok` → `sync = 2`;
- error → `sync = 1`.

Dependencias heredadas:

- PC alcanzable desde Internet;
- IP/dominio;
- NAT/puertos;
- Apache local;
- resolución manual en algunos entornos.

## TPV → Web

El TPV antiguo envía:

- `localizador`;
- stock;
- PVP;
- PVP descuento.

`indomable-api` actualiza el catálogo mediante `SyncStockComponent` / `BackendService::updateStockPrice()`.

---

# 12. Arquitectura futura acordada

**No implementada todavía.**

La conexión la iniciará siempre Osumi TPV Client:

```text
Osumi TPV Client / Electron
        │
        │ HTTPS
        ▼
indomablestore.com / indomable-api
```

No habrá servidor local expuesto en el TPV.

Se eliminan como requisito:

- entrada desde Internet al PC;
- NAT/port forwarding;
- IP dinámica;
- `hosts`;
- Apache local para recibir ventas.

## Ciclo conceptual

```text
arranca TPV
    ↓
si venta online está activa
    ↓
consulta ventas pagadas pendientes
    ↓
procesa cada pedido
    ↓
confirma resultados
    ↓
sincroniza stock/precios
    ↓
espera X minutos
    ↓
repite
```

Si el TPV está apagado o sin Internet:

- los pedidos permanecen pendientes;
- al reabrir/reconectar se recuperan en el siguiente ciclo.

El TPV estará normalmente siempre abierto, pero el diseño debe tolerar que no lo esté.

---

# 13. `Order.sync` — semántica actual y futura

Modelo actual:

```text
-1 = no sincronizar todavía / no pagado
 0 = nuevo
 1 = error
 2 = ok
```

En la práctica, al confirmar Redsys/PayPal el código pone directamente:

```text
sync = 1
```

Por tanto `1` actúa también como pendiente/reintento.

## Semántica futura acordada

```text
-1 = no pagado / no sincronizable
 0 = pendiente de primera sincronización
 1 = error / pendiente de reintento
 2 = sincronizado
```

No modificar todavía.

---

# 14. Réplica económica exacta de la venta

Objetivo:

> La venta en Osumi TPV debe representar exactamente la venta realizada en Indomable Store.

No recalcular usando el PVP actual del TPV.

`OrderProduct` ya conserva:

- `num`
- `amount_before`
- `discount`
- `amount_after`

`Order` ya conserva:

- `method`
- `shipment`
- `shipment_cost`
- `ordered_at`
- `payed_at`
- `amount_before`
- `discount`
- `amount_after`
- `sync`

## Descuento

Para la importación se priorizará el importe histórico real.

Conceptualmente:

```text
descuentoBps = 0
importeDescuentoMicros = descuento histórico real
```

No es necesario reconstruir si procedía de promoción, cupón u otra regla.

---

# 15. Snapshot histórico a ampliar en `indomable-api`

Actualmente `order_product` congela importes, pero no congela toda la identidad del producto.

Se ha acordado guardar también al crear el pedido:

```text
localizador
nombre
marca
iva
```

Motivo: un pedido puede sincronizarse horas/días después y el catálogo puede haber cambiado.

Ejemplo a evitar:

```text
día 1: venta al 10 % IVA
día 2: producto cambia a 21 %
día 3: TPV importa el pedido
```

La venta debe conservar el 10 % original.

---

# 16. PUC en ventas online

Decisión cerrada:

- Indomable Store no necesita conocer el PUC.
- El PUC se toma del artículo del TPV al importar.

Flujo:

```text
localizador recibido
    ↓
artículo TPV
    ↓
articuloPublicId
PUC actual
```

De la web llegan los datos históricos de venta:

- PVP;
- IVA;
- descuento;
- importe;
- unidades.

---

# 17. Fecha de la venta online

Decisión cerrada:

> Usar `Order.payed_at`, no la hora de sincronización.

Así estadísticas e histórico reflejan cuándo ocurrió realmente la compra.

La interacción exacta con numeración/TicketBAI se revisará cuando se implemente.

---

# 18. Empleado estructural “Tienda online”

Decisión cerrada para la sincronización futura.

Crear un empleado estructural real:

```text
Tienda online
```

Características:

- existe en `empleado` para mantener FK e histórico;
- no aparece en Gestión > Empleados;
- no aparece en selector presencial;
- no inicia sesión de Gestión;
- no se edita;
- no se elimina;
- no requiere contraseña/permisos de uso humano.

No implementarlo durante la corrección inmediata de Ventas/Empleados salvo que se decida expresamente adelantarlo.

---

# 19. Caja y origen de ventas online

Decisión:

```text
venta presencial → id_caja != NULL
venta online     → id_caja = NULL
```

Actualmente `venta` tiene:

```sql
id_caja INTEGER NOT NULL
```

Y `GuardarVentaCommand` exige `cajaPublicId`.

La futura sincronización deberá adaptar esquema, contratos, validaciones y repository para permitir caja nula solo donde corresponda.

Seguimos antes de la primera versión estable, por lo que puede modificarse el esquema v1 sin diseñar aún una migración histórica.

---

# 20. Origen e idempotencia

La venta deberá distinguir origen y referencia externa.

Diseño conceptual:

```text
origen = tpv | online
referencia_externa = id del pedido online
```

Para online debe existir unicidad equivalente a:

```text
(origen = online, referencia_externa)
```

Escenario protegido:

```text
TPV guarda pedido 537
    ↓
se corta Internet antes del ACK
    ↓
web lo mantiene pendiente
    ↓
lo reenvía
    ↓
TPV detecta 537 ya importado
    ↓
NO duplica la venta
    ↓
responde OK
```

`sync` en la web no sustituye a esta garantía local.

---

# 21. Cliente y alcance inicial

Primera versión:

```text
id_cliente = NULL
```

No sincronizar clientes todavía.

Alcance inicial:

- importar ventas pagadas.

Fuera de alcance:

- cancelaciones;
- devoluciones;
- reembolsos automáticos;
- matching/alta de clientes.

---

# 22. Artículos e identificadores

Clave compartida entre sistemas:

```text
localizador
```

Se mantiene para resolver artículos.

No usar ids internos entre sistemas.

---

# 23. Tipos de pago online

No usar ids SQLite.

Usar:

```text
tipoPagoPublicId
```

`indomable-api` ya tiene configuración conceptual:

```text
pay_method_cards
pay_method_paypal
```

Plan futuro:

```text
pay_method_cards  → publicId tipo pago
pay_method_paypal → publicId tipo pago
```

Los tipos de pago online ya existen y sus estadísticas ya funcionan; no crear subsistema estadístico adicional.

---

# 24. Gastos de envío

El sistema antiguo ya los representaba mediante localizador configurado en `shipment_methods`.

Mantener la idea de línea económica explícita.

Si `shipment_cost > 0`:

```text
localizador = localizador del método de envío
unidades = 1
importe = shipment_cost histórico
```

No recalcular con PVP actual del TPV.

Si el coste es cero, no es obligatorio generar una línea económica de cero.

---

# 25. Seguridad futura

`indomable-api` usa `osumionline/plugin-token`.

`OToken` implementa:

- HS256;
- payload firmado;
- `iat`;
- `exp`;
- HMAC SHA-256.

Matiz:

- la firma se serializa en hexadecimal;
- Node puede reproducirla con `node:crypto`;
- no asumir compatibilidad directa con una librería JWT estándar sin respetar este formato.

Plan:

- HTTPS;
- secreto compartido;
- token de corta duración;
- `iat`;
- `exp`;
- propósito `tpv-sync` o equivalente;
- request id/nonce si se considera necesario al cerrar contrato.

El secreto seguirá protegido con `safeStorage` en el cliente.

---

# 26. Contrato conceptual

No fijar todavía nombres definitivos de endpoints.

## Pull

TPV pregunta por ventas pagadas pendientes.

Web devuelve lote de pedidos pendientes/reintento con datos suficientes para construir la venta histórica.

## ACK

Resultado individual:

```text
[
  { id: 537, status: "ok" },
  { id: 541, status: "error" }
]
```

Web:

```text
ok    → sync = 2
error → sync = 1
```

Un pedido defectuoso no bloquea los demás.

## Stock/precios

TPV envía:

```text
localizador
stock
pvp
pvpDescuento
```

Después de importar las ventas pendientes.

---

# 27. Concurrencia de stock — problema detectado

El sistema antiguo usa snapshots absolutos.

Riesgo:

```text
TPV lee stock = 10
    ↓
cliente online compra 2
    ↓
web queda en 8
    ↓
llega snapshot antiguo del TPV = 10
    ↓
web vuelve a 10  ❌
```

Mitigación básica acordada para el orden del ciclo:

1. pull ventas;
2. importar;
3. ACK;
4. recalcular stock local;
5. enviar stock/precios.

Aun así queda una pequeña carrera.

Antes de implementar stock debe estudiarse una solución determinista:

- deltas/movimientos;
- revisión/versionado;
- timestamps;
- mecanismo equivalente basado en histórico.

**No copiar `SyncStock` antiguo sin resolver este punto.**

---

# 28. Ejecución periódica

La sincronización residirá en backend Electron, no en Angular.

Comportamiento esperado:

- ejecución al arrancar si integración activa;
- repetición cada X minutos;
- intervalo configurable;
- no lanzar dos ciclos simultáneos;
- errores de red no destruyen estado;
- siguiente ciclo reintenta.

No se necesita servicio de Windows separado para el uso previsto.

---

# 29. Reutilización de persistencia

Una venta online debe entrar por la lógica central de ventas siempre que sea posible.

Evitar:

- segundo sistema de persistencia;
- duplicar validaciones;
- duplicar TicketBAI;
- duplicar snapshots;
- duplicar lógica de stock.

Habrá que adaptar la persistencia para soportar:

```text
caja nullable
origen online
referencia externa
empleado estructural
fecha histórica payed_at
```

sin debilitar ventas presenciales.

---

# 30. Plan de implementación futura

**Plan aprobado conceptualmente. No iniciar ahora.**

## S1 — Modelo TPV

- origen;
- referencia externa;
- idempotencia;
- `id_caja` nullable para online;
- empleado “Tienda online”;
- contratos/tests.

## S2 — Snapshot en `indomable-api`

- localizador;
- nombre;
- marca;
- IVA;
- normalizar `sync`;
- tests.

## S3 — Contrato API versionado

- pull;
- ACK;
- lotes;
- errores;
- autenticación;
- tests backend.

## S4 — Cliente HTTP Electron

- configuración;
- `safeStorage`;
- token/firma;
- timeouts;
- errores.

## S5 — Importador de ventas

Por pedido:

1. comprobar idempotencia;
2. resolver localizadores;
3. resolver tipo de pago;
4. obtener PUC local;
5. construir snapshots;
6. validar total;
7. persistir;
8. stock;
9. documentos/TicketBAI mediante flujo central;
10. producir resultado individual.

## S6 — Scheduler

- startup;
- intervalo;
- exclusión mutua;
- recuperación;
- reintentos.

## S7 — ACK

- confirmar cada pedido;
- `sync = 2` éxito;
- `sync = 1` error/reintento;
- caída antes del ACK segura por idempotencia.

## S8 — Stock/precios

- resolver concurrencia;
- abandonar formato concatenado legacy;
- contrato tipado.

## S9 — Observabilidad/Ajustes

- último intento;
- último éxito;
- último error;
- posible “Sincronizar ahora” si resulta útil.

## S10 — Retirada legacy

Cuando el nuevo sistema esté estable:

- retirar llamadas web → TPV;
- retirar dependencia de `sync_url`;
- revisar/eliminar `DoSync` y `ForceSync` según proceda;
- retirar infraestructura de IP/Apache local que ya no sea necesaria.

---

# 31. Hallazgos independientes en `indomable-api`

No mezclar automáticamente con sincronización.

## Posible bug `reduceStock()`

Actualmente parece hacer:

```php
$prod->stock = ($prod->stock - 1);
```

Y equivalente para `ProductSizeColor`.

Parece ignorar `OrderProduct.num`, por lo que una compra de varias unidades podría descontar solo una.

Antes de modificar:

- reproducir;
- escribir test;
- confirmar comportamiento real.

## Posible bug `getProductPrice()` + cupón

El método multiplica primero importes por `num` y el descuento de cupón parece volver a multiplicar por `num`.

Antes de modificar:

- caso cupón + `num > 1`;
- prueba concreta;
- no asumir bug sin validación.

---

# 32. Caja — siguiente hito tras la corrección

18 Caja sigue pendiente.

Secuencia acordada:

```text
1. cerrar Ventas/Empleados
2. usuario explica Caja deseada
3. revisar TPV antiguo
4. revisar esquema/código actual
5. resolver decisiones funcionales
6. dividir 18 en unidades pequeñas
7. implementar secuencialmente
```

Ya existen piezas relacionadas:

- `caja`;
- `venta.id_caja`;
- `venta_pago`;
- `tipo_pago.afectaCaja`.

No inferir automáticamente comportamiento solo por estas estructuras.

---

# 33. Commits recientes relevantes

```text
ef79cb84820cf2736ef5d0d5d473ec4df51a7549
Terminado Gestión 17.6

fc738cf4ec788b4ae2ee703e2786f6487dd6e641
Actualizo documento de continuidad tras 17.6

fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709
Corrección modal login en Gestión
```

Último `main` confirmado para esta v2.75:

```text
fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709
```

---

# 34. Resumen ejecutivo

```text
✅ 16 Compras

✅ 17.1 Gestión shell/rutas
✅ 17.2 auth backend empleados
✅ 17.3 sesión/permisos
✅ 17.4 Ajustes
✅ 17.5 Empleados — CERRADO
✅ 17.6 Tipos de pago — CERRADO

✅ Pausa técnica A
   Foco tras contraseña incorrecta en login de Gestión

🔨 Pausa técnica B — SIGUIENTE
   Ventas / Empleados
   - retirar “Usar empleados”
   - 0 empleados → error
   - 1 empleado → automático
   - >1 empleados → selector siempre
   - aplicar también a reservas
   - retirar flag de AppData/Ajustes/instalación si procede

⏳ 18 Caja
⏳ 19 enforcement global permisos

📋 Sincronización Indomable Store ↔ Osumi TPV
   PLANIFICADA / NO INICIADA
   - pull desde Electron
   - cola durable web
   - idempotencia por pedido
   - empleado estructural “Tienda online”
   - caja NULL
   - cliente NULL
   - localizador como clave de artículos
   - tipoPagoPublicId
   - fecha payed_at
   - snapshot histórico ampliado
   - PUC local TPV
   - solo ventas en primera versión
   - stock/precios TPV → web
   - resolver carrera de stock antes de implementar

⏸ TicketBAI 12C.9
```

---

# 35. Siguiente paso exacto

El siguiente trabajo de código **no es Caja ni sincronización**.

Es:

> **Ventas / Empleados: retirar el check “Usar empleados” y derivar el comportamiento del número real de empleados.**

Antes de codificar:

1. revisar `main` recién actualizado;
2. localizar todos los usos de `appData.empleados`;
3. confirmar qué contratos/configuración dejan de contener el flag;
4. aplicar el cambio como unidad pequeña;
5. añadir tests;
6. usuario ejecuta batería completa;
7. no avanzar hasta verde + push.

Tras cerrarlo:

```text
18 Caja
```

La sincronización online queda aparcada y documentada para una etapa posterior.

---

# 36. Regla final de dirección

Para cualquier módulo heredado:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se resuelven dudas;
4. se acuerdan decisiones;
5. se define plan;
6. se implementa por bloques pequeños;
7. el usuario valida;
8. se continúa solo después de verde y push.

Estado al cerrar esta v2.75:

- **17.5 Empleados: CERRADO.**
- **17.6 Tipos de pago: CERRADO.**
- **Corrección foco modal Gestión: CERRADA.**
- **Siguiente cambio: Ventas/Empleados 0/1/>1 y retirada del flag.**
- **Después: 18 Caja.**
- **Sincronización Indomable Store ↔ Osumi TPV: planificada, no iniciada.**
- **Último commit confirmado: `fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709`.**
- No iniciar sincronización ni Caja antes de cerrar la corrección inmediata de Ventas/Empleados.
