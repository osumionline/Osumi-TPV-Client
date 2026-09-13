# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.56  
**Fecha:** 13 de septiembre de 2026  
**Base de continuidad:** `v2.56 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.55.md`

---

# 1. Estado general del proyecto

La aplicación sigue desarrollándose como **Osumi TPV Client**, versión de escritorio del TPV construida con Angular + Electron + SQLite/TypeORM.

```text
Installation + importación .otpv v2               ✅
Startup                                           ✅
Auditoría + Refactor A–E                          ✅

Ventas 1–11                                       ✅
Ventas 12 — Postventa                             🟦
  12C.8 TicketBAI ordinario                       ✅ CERRADO
  12C.9 TicketBAI devoluciones/mixtas             ⏸️ BEREIN
  12C.10 Regresión integral final                 ⬜

13 Artículos                                      ✅ HITO CERRADO
14 Clientes                                       ✅ HITO CERRADO
15 Almacén                                        ✅ HITO CERRADO

REF Pausa técnica pre-Hito 16                     ✅ CERRADA
CTRL Normalización de controles                   ✅ CERRADA

16 Compras                                        🟦 EN DESARROLLO
  16.1 Base de Compras + históricos               ✅
  16.2 Backend listados de Pedidos                ✅
  16.3 Pantalla principal de Pedidos              ✅
  16.4 Ficha Pedido: cabecera + persistencia      ✅ CERRADO
  16.5 Líneas + buscador de artículos             ✅ CERRADO
  16.6 Motor económico global                     ✅ CERRADO
  16.7 Dirty state + navegación segura            ✅ CERRADO
  16.8 Integración Pedido → Artículos             ✅ CERRADO
    16.8A Recuperar artículo de Pedido por ID      ✅
    16.8B Flujo visible Pedido ↔ Artículos         ✅
  16.9 PDFs                                       ✅ CERRADO
    16.9A Lectura de PDFs                         ✅
    16.9B Adjuntar + almacenamiento gestionado    ✅
    16.9C Panel renderer                          ✅
    16.9D Abrir + eliminar seguro                 ✅
  16.10 Recepción atómica                         ⬅️ SIGUIENTE
  16.11 Pedido recepcionado                       ⬜
  16.12 Regresión integral de Pedidos             ⬜
  16.13 Marcas                                    ⬜
  16.14 Proveedores                               ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

El **Hito 15 — Almacén**, la pausa REF y CTRL siguen cerrados. No reabrirlos por ajustes de Compras salvo regresión real.

Desde `v2.55` se han cerrado por completo la integración Pedido ↔ Artículos y la gestión de PDFs. Un Pedido guardado y limpio ya puede crear un artículo nuevo y recuperarlo por ID al volver; los recepcionados ocultan por completo la zona de Localizador/alta de artículo. Los PDFs ya se leen, adjuntan, validan, almacenan, abren y eliminan de forma segura tanto en pendientes como en recepcionados. El punto activo pasa a ser **16.10 — Recepción atómica**, el primer bloque que aplicará efectos canónicos sobre Artículos.

# 2. Punto exacto de continuación

Están cerrados, validados funcionalmente y subidos a `main`:

```text
16.1
16.2
16.3
CTRL.1
CTRL.2
16.4
16.5 completo
16.6 completo
16.7 completo
16.8 completo
16.9 completo
```

El siguiente punto exacto es:

```text
16.10 — Recepción atómica del Pedido
```

Estado previo ya preparado:

```text
Pedido pendiente
→ cabecera + líneas + economía persistidas
→ dirty/navigation guard
→ artículos nuevos por flujo Pedido ↔ Artículos
→ PDFs gestionados independientemente
→ Guardar NO modifica Artículos canónicos

Recepcionar
→ será el único momento que aplique stock/precios/barcode/histórico
```

Reglas de recepción ya acordadas y que no deben reinterpretarse:

```text
Proveedor obligatorio
al menos una línea
TODAS las líneas con unidades > 0
artículos reales/activos y coherentes
nuevos códigos adicionales globalmente únicos

una única transacción
→ releer artículos canónicos
→ capturar stock previo
→ sumar unidades
→ actualizar PALB / PUC / PVP canónicos
→ persistir código adicional pendiente si procede
→ crear histórico ARTICULO tipo PEDIDO = 3
→ enlazar histórico con id_pedido
→ fijar stock_actual_snapshot / stock_final_snapshot
→ fijar fecha_recepcionado real
→ marcar pedido recepcionado
→ COMMIT

cualquier error
→ ROLLBACK completo
```

Principios especialmente importantes antes de empezar `16.10`:

- **Guardar borrador ≠ Recepcionar**. No mover efectos canónicos al guardado normal.
- `Abono` sigue siendo solo tipo documental; no convertir la recepción en lógica de devolución.
- No permitir recepcionar si existe alguna línea con `unidades = 0`.
- El stock previo debe releerse dentro de la transacción; el valor mostrado mientras el Pedido estaba abierto no es autoridad para la recepción.
- Los snapshots nuevos deben representar exactamente el stock inmediatamente anterior y posterior a esa recepción.
- El código adicional pendiente solo se vuelve canónico al recepcionar y debe validarse de nuevo contra la unicidad global dentro de la operación.
- `historico_articulo.tipo = PEDIDO = 3` y debe quedar relacionado con `id_pedido`.
- No desarrollar Marcas ni Proveedores hasta cerrar Pedidos.

Por tamaño y riesgo, `16.10` debe dividirse en mini-hitos pequeños pero completos. Antes del primer patch hay que revisar `main` actual de:

```text
schema de pedido / linea_pedido / articulo / codigo_barras / historico_articulo
TypeOrmPedidosRepository
repositorios/servicios que ya escriben Artículos e históricos
constantes de tipo histórico PEDIDO = 3
fixtures TypeORM actuales
```

No empezar por la UI de `Recepcionar`. Primero cerrar contrato, validaciones y transacción backend; después exponer IPC/renderer y, por último, regresión funcional de rollback y snapshots.

# 3. Repositorios y referencias

## 3.1 Cliente actual

```text
https://github.com/osumionline/Osumi-TPV-Client
```

Siempre revisar `main` actual antes de proponer un patch.

## 3.2 TPV antiguo — referencia funcional para Compras

Repositorio:

```text
https://github.com/osumionline/Osumi-TPV
```

Referencias especialmente útiles para Pedidos:

```text
Modelo:
https://github.com/osumionline/Osumi-TPV/blob/main/src/app/model/compras/pedido.model.ts

Componente:
https://github.com/osumionline/Osumi-TPV/blob/main/src/app/modules/compras/pages/pedido/pedido.component.ts

HTML:
https://github.com/osumionline/Osumi-TPV/blob/main/src/app/modules/compras/pages/pedido/pedido.component.html
```

El TPV antiguo sirve para **paridad funcional y numérica**, no como arquitectura a copiar literalmente.

Cuando exista contradicción entre:

```text
código antiguo
vs.
decisión explícita tomada para el nuevo cliente
```

prevalece la decisión explícita documentada aquí.

## 3.3 SDK TicketBAI

```text
https://github.com/osumionline/ticketbaiws
```

No tocar `12C.9` sin nueva información de Berein.

---

# 4. Convenciones de trabajo

## 4.1 Angular / TypeScript

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- Usar APIs modernas como `viewChild()` signal cuando encaje.
- Aplicación zoneless.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Templates con `@if`, `@for`, `@switch`.
- Todo método TS/JS nuevo lleva JSDoc breve.
- No dejar líneas en blanco innecesarias entre propiedades relacionadas.
- Sí separar visualmente métodos y responsabilidades distintas.
- Evitar `@HostListener`; preferir `host` cuando aplique.
- Si Angular marca una API como deprecated y existe sustitución moderna estable, usar la API moderna. Ejemplo ya aplicado: `Router.currentNavigation()` signal en vez de `getCurrentNavigation()`.

## 4.2 Forma de trabajar

El usuario aplica manualmente los cambios, ejecuta tests/build/lint y sube commits.

El asistente:

- revisa siempre `main` actual antes de proponer cambios;
- no hace commits;
- no abre PR;
- no avanza de mini-hito hasta confirmación explícita;
- prefiere **bloques pequeños pero completos** frente a mega-bloques;
- si un cambio modifica una interfaz, en el mismo bloque incluye todos los fakes/mocks/fixtures afectados;
- si se proponen tests, se entrega el código concreto de los tests, no solo una lista textual de casos;
- si un nuevo método necesita JSDoc, el patch lo incluye;
- no deja adaptaciones necesarias implícitas para que el usuario las deduzca;
- archivo nuevo: contenido completo;
- archivo existente: fragmento actual reconocible → fragmento nuevo;
- cuando hay imports nuevos, se indican explícitamente todos los imports necesarios;
- no hace falta indicar en qué posición física colocar cada import;
- VSCode/Prettier se encargan de ordenar imports/formato al guardar.

## 4.3 Imports

Regla obligatoria para imports internos del proyecto:

```text
SIEMPRE ruta absoluta mediante alias
```

Incluso cuando dos archivos estén en la misma carpeta:

```ts
// NO
import type X from './x.interface';

// SÍ
import type X from '@backend/.../x.interface';
```

No introducir imports relativos entre archivos del proyecto en patches nuevos.

Los imports de paquetes externos (`@angular/...`, `typeorm`, `vitest`, `node:*`, etc.) conservan naturalmente sus rutas de paquete.

Cuando el asistente diga que hay que añadir imports:

```text
→ debe proporcionar el código exacto de esos imports
→ no necesita indicar "ponlo antes/después de..."
```

## 4.4 Exports

```text
1 export  → default export
>1 export → named exports
```

También se aplica a `*.private.ts`.

## 4.5 Batería habitual

Frontend:

```bash
npm test
npm run build
npm run lint
```

Electron/backend/contracts/repositories/IPC:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Cross-layer:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
npm run lint
```

`npm test` ya incorpora `--watch=false`.

# 5. SQLite durante desarrollo

Hasta la primera versión estable:

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones.

Ante cambios incompatibles:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear instalación
→ reimportar .otpv
```

Las migraciones reales se incorporarán cuando exista una primera versión estable con usuarios reales.

Compras ya cuenta con base de esquema/importación legacy adelantada, pero se puede ajustar durante el desarrollo manteniendo esta política.

---

# 6. TicketBAI

## 6.1 Ordinario

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Principios cerrados:

- SDK `@osumi/ticketbaiws`.
- Producción por defecto.
- Desarrollo manual mediante configuración TEST.
- No añadir selector de entorno TicketBAI a la UI.
- `PENDING` es resultado válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite reenvío directo.
- `error_temporal` se reconcilia antes de actuar.
- `error_permanente` informa sin mutación automática.
- Un fallo TicketBAI posterior al COMMIT no revierte una venta comercial confirmada.

## 6.2 Devoluciones / ventas mixtas

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️
```

Sigue bloqueado por Berein. No reabrir ni inventar contrato para este punto hasta disponer de información suficiente.

## 6.3 Facturas de cliente

```text
Factura de cliente ≠ operación TicketBAI
```

Crear, editar, emitir, previsualizar, imprimir, enviar o anular una factura de cliente no llama por sí mismo a TicketBAI.

---

# 7. Hitos cerrados relevantes

## 7.1 Hito 13 — Artículos

```text
✅ CERRADO
```

La ficha de Artículos es el destino canónico cuando otros módulos quieren abrir el detalle de un artículo.

Patrón existente:

```text
ArticulosService.cargarPorId(idArticulo)
→ si existe/carga correctamente
→ router.navigate(['/articulos'])
```

Inventario y Caducidades ya reutilizan este patrón.

Artículos también será destino desde Compras para:

```text
Pedido
→ crear artículo nuevo
→ guardar artículo
→ ofrecer retorno al pedido
→ añadir artículo recién creado
```

## 7.2 Hito 14 — Clientes

```text
✅ CERRADO
```

Incluye búsqueda/selección, workspace, formulario, persistencia, ventas, estadísticas, consumo mensual, facturas, editor, emisión, preview, PDF, impresión, email, anulación e integración final con Ventas.

## 7.3 Hito 15 — Almacén

```text
✅ CERRADO
```

```text
Inventario  ✅
Caducidades ✅
Imprenta    ✅ beta física
```

La consideración `beta física` de Imprenta se refiere exclusivamente a futura calibración real de márgenes/hojas/impresora y no bloquea el proyecto.

---

# 8. Pausa técnica pre-Hito 16 — CERRADA

La pausa técnica posterior a Almacén queda oficialmente cerrada.

Objetivos completados:

1. centralizar conceptos compartidos;
2. introducir `*.private.ts`;
3. estructurar Almacén por subdominios;
4. separar backend real de Inventario/Caducidades/Imprenta;
5. revisar hotspots por responsabilidad;
6. recuperar comportamientos del TPV antiguo;
7. dejar una arquitectura de referencia antes de comenzar Compras.

No seguir refactorizando por inercia al iniciar Hito 16.

---

# 9. REF.1 — Constantes y utilidades compartidas ✅

## 9.1 Meses

Existe:

```text
src/app/constants/date.constants.ts
```

Con `MonthOption` y `MONTH_OPTIONS`.

Utilidades:

```text
formatMonthName()
formatShortMonthName()
```

Reutilizadas en Caducidades, estadísticas e informes.

## 9.2 Paginación

Existe:

```text
electron/contracts/shared/pagination.constants.ts
```

Con:

```text
PAGE_SIZE_OPTIONS = [20, 50, 100, 200]
```

Defaults locales:

```text
Inventario   20
Caducidades  50
```

Compras reutilizará estas mismas opciones.

## 9.3 Formatters

Existe:

```text
src/app/utils/format.utils.ts
```

Con:

```text
formatEuros()
formatInteger()
formatDecimal()
```

---

# 10. REF.2 — Convención `*.private.ts` ✅

Regla:

```text
declaración module-scoped
+
uso exclusivo de un consumidor
→ <consumer>.private.ts
```

Puede contener:

```text
interfaces/types internos
constantes
mapas/configuración estática
helpers puros exclusivos del consumidor
fragmentos SQL/SELECT constantes exclusivos de una clase/repository
```

Ejemplo ya consolidado en Compras:

```text
PEDIDO_ARTICULO_SELECT
→ typeorm-pedidos.repository.private.ts
→ no ensucia TypeOrmPedidosRepository
```

La regla no es “todo a `.private.ts`”.

No mover métodos de clase solo para reducir líneas. No crear sidecar vacío ni por obligación. Estado y comportamiento de instancia permanecen en la clase.

Los imports de un `.private.ts` siguen la misma regla general:

```text
imports internos
→ alias absoluto
```

# 11. REF.3/REF.4 — Almacén por subdominio ✅

## 11.1 Renderer

```text
src/app/modules/almacen/
  components/
    warehouse-tabs/
  pages/
    warehouse/

  inventario/
  caducidades/
  imprenta/
```

`Warehouse` y `WarehouseTabs` permanecen arriba por ser composición transversal.

## 11.2 Workspace

La ubicación real actual es:

```text
src/app/services/almacen-workspace.service.ts
```

No usar la ruta antigua/documental:

```text
src/app/modules/almacen/services/...
```

`AlmacenWorkspaceService` conserva:

```text
sección activa
estado de Inventario
estado de Caducidades
```

No se mezcla con:

```text
src/app/services/almacen.service.ts
```

que sigue siendo la fachada Angular hacia IPC/casos de uso.

## 11.3 Backend

Patrón consolidado:

```text
InventarioService
→ InventarioRepository
→ TypeOrmInventarioRepository

CaducidadesService
→ CaducidadesRepository
→ TypeOrmCaducidadesRepository

ImprentaService
→ ImprentaRepository
→ TypeOrmImprentaRepository
```

Se eliminaron las antiguas piezas agregadas:

```text
AlmacenService backend
AlmacenRepository
TypeOrmAlmacenRepository
```

Este patrón es la referencia para Compras:

```text
FeatureService
→ FeatureRepository
→ TypeOrmFeatureRepository
```

Servicios secundarios deben depender de providers estrechos cuando solo necesiten una capacidad.

---

# 12. REF.5 — Hotspots ✅

Regla consolidada:

```text
tamaño = señal
tamaño ≠ motivo suficiente para refactor
```

Antes de extraer:

```text
¿hay una responsabilidad con nombre propio?
```

Si no, el tamaño no basta.

Ejemplos ya extraídos con responsabilidad real:

```text
InventarioDraftManager
fixture TypeORM de Almacén
*.private.ts donde existe contenido genuinamente privado
```

No dividir `application-composition.ts` solo por longitud.

---

# 13. REF.6 — Paridad funcional pre-Compras ✅

## 13.1 REF.6A — Última venta + cambio

En el flotante del total de Ventas:

```text
Última venta: XX,XX €        Cambio: YY,YY €
```

Resumen de sesión en `VentasService`:

```text
UltimaVentaResumen
  totalCents
  cambioCents
```

Sobrevive a navegación durante la sesión y desaparece al cerrar la aplicación.

## 13.2 REF.6B — Inventario → Artículos + estado de sesión

Se conserva:

```text
proveedor
marca
categoría
texto
con descuento
página
tamaño de página
columnas visibles
drafts no guardados
```

Nombre clicable:

```text
Inventario
→ nombre
→ ArticulosService.cargarPorId(row.id)
→ /articulos
```

Fila dirty:

```text
no navegar
→ guardar o deshacer primero
```

## 13.3 REF.6C — Caducidades → Artículos + estado de sesión

Se conserva:

```text
año
mes
marca
nombre/texto
página
tamaño de página
```

Nombre clicable:

```text
Caducidades
→ nombre
→ ArticulosService.cargarPorId(row.idArticulo)
→ /articulos
```

Se usa `idArticulo` del histórico; no se resuelve por nombre/localizador.

## 13.4 REF.6D — Autofocus Imprenta

Cada vez que se entra en Imprenta:

```text
→ buscador recibe foco
```

La solución final usa el momento posterior al render para evitar el estado visual incorrecto de `MatFormField` observado al enfocar demasiado pronto en aplicación zoneless.

No reabrir el enfoque inicial mediante `ngAfterViewInit()` directo si reaparece el problema visual del label/placeholder.

---

# 14. Tipos de histórico de artículo — contrato conocido

Durante la planificación de Compras se recuperó el significado real de los tipos legacy:

```text
VENTA          = 1
VENTA_SYNC     = 2
PEDIDO         = 3
ARTICULO       = 4
INVENTARIO     = 5
INVENTARIO_ALL = 6
CADUCIDAD      = 7
```

Semántica:

```text
1 VENTA
→ modificación de stock causada por una venta

2 VENTA_SYNC
→ venta introducida mediante sincronización
→ funcionalidad futura

3 PEDIDO
→ modificación causada por recepcionar un pedido

4 ARTICULO
→ modificación realizada desde la pantalla de Artículos

5 INVENTARIO
→ modificación desde Almacén/Inventario guardando una línea individual

6 INVENTARIO_ALL
→ modificación desde Almacén/Inventario mediante Guardar todos

7 CADUCIDAD
→ merma/reversión de caducidad
```

Durante `16.1` hay que:

- crear/ubicar una fuente estable para estos valores;
- revisar las escrituras actuales;
- corregir Artículos/Inventario/Ventas/Caducidades donde proceda;
- garantizar especialmente la distinción `INVENTARIO=5` vs `INVENTARIO_ALL=6`;
- dejar `PEDIDO=3` preparado para la recepción;
- no reinterpretar `VENTA_SYNC=2` hasta llegar a sincronización.

---

# 15. Hito 16 — Compras

Compras se compone de tres subapartados:

```text
Pedidos
Marcas
Proveedores
```

Orden de trabajo:

```text
primero Pedidos
→ cerrar completamente

después Marcas
→ definir contrato antes de desarrollar

después Proveedores
→ definir contrato antes de desarrollar
```

Hasta llegar a ellos:

```text
Marcas       → placeholder
Proveedores  → placeholder
```

---

# 16. Pedidos — conceptos generales

Un pedido representa una compra realizada a un proveedor.

Estados funcionales:

```text
pedido guardado / pendiente
→ borrador
→ todavía no recepcionado
→ NO afecta a artículos, precios ni stock reales

pedido recepcionado
→ compra cerrada económicamente
→ stock/precios correspondientes ya aplicados
→ líneas históricas congeladas
```

Tipos documentales:

```text
Albarán
Factura
Abono
```

Son **meramente informativos**.

No existe comportamiento distinto por seleccionar Albarán, Factura o Abono.

---

# 17. Pantalla principal de Pedidos

Contiene dos listados:

```text
Pedidos guardados
Pedidos recepcionados
```

Botón superior:

```text
Nuevo pedido
```

Pulsar una fila de cualquiera de las tablas:

```text
→ abre pantalla de Pedido
```

## 17.1 Filtros

Cada listado dispone de:

```text
Fecha desde
Fecha hasta
Proveedor
Albarán / número
Importe desde
Importe hasta
```

Aclaraciones:

- Fecha desde/hasta filtra por `fecha_pedido`.
- El filtro denominado visualmente Albarán/número busca el campo de texto libre `numero`.
- Busca ese número independientemente de que el tipo sea Albarán, Factura o Abono.
- Usar paginación compartida:

```text
20 / 50 / 100 / 200
```

## 17.2 Pedidos guardados — columnas

```text
Fecha pedido
Proveedor
Tipo
Importe
```

Tipo se presenta junto al número:

```text
Factura: ORD-1077436
Albarán: ...
Abono: ...
```

## 17.3 Pedidos recepcionados — columnas

```text
Fecha recepcionado
Fecha pedido
Fecha pago
Proveedor
Tipo
Importe
UE
```

Si `ue = true`:

```text
→ mostrar icono/bandera UE
```

## 17.4 Observaciones en listado

Si existen observaciones:

```text
columna Proveedor
→ icono de información
→ tooltip con las observaciones
```

---

# 18. Estado de sesión del listado de Pedidos

Por coherencia con Inventario/Caducidades, conservar durante la sesión:

```text
filtros de Pedidos guardados
página de Pedidos guardados
tamaño de página de Pedidos guardados

filtros de Pedidos recepcionados
página de Pedidos recepcionados
tamaño de página de Pedidos recepcionados
```

No persistir estos datos en SQLite solo para navegación.

Patrón:

```text
datos canónicos
→ backend / SQLite

estado visual de sesión
→ workspace Angular

estado efímero
→ componente
```

---

# 19. Pantalla de Pedido — estructura

La pantalla se divide en:

1. barra superior;
2. datos/cabecera del pedido;
3. tabla de líneas;
4. buscador/alta de artículo;
5. parte inferior:
   - PDFs;
   - Observaciones;
   - Totales.

---

# 20. Barra superior de Pedido

Contiene:

```text
← volver
Pedido 123 / Nuevo pedido
mensaje “Guardado” cuando proceda
Eliminar
Guardar
```

El orden visual actual de la zona derecha es deliberado:

```text
mensaje guardado
→ Eliminar
→ Guardar
```

para que el feedback no aparezca entre ambos botones.

`Eliminar`:

```text
solo pedido guardado todavía no recepcionado
→ pedir confirmación
```

Pedido recepcionado:

```text
no se puede eliminar desde este flujo
```

La navegación de salida está protegida por `16.7` cuando existe dirty state.

# 21. Cabecera de Pedido

Campos:

## 21.1 Proveedor

```text
Proveedor (*)
```

- Obligatorio para guardar.
- Combo de proveedores.
- Icono de alta rápida/navegación a proveedor cuando se desarrolle la capacidad correspondiente.

## 21.2 Forma de pago

El combo se compone de:

```text
Domiciliación bancaria
Transferencia bancaria
+
tipos de pago definidos por el usuario
```

Ejemplo:

```text
Efectivo
Tarjeta
Paypal
...
```

No crear un catálogo rígido adicional para todas las opciones antiguas.

Implementación cerrada en `16.4`:

```text
pedido.id_tipo_pago
→ referencia opcional a tipo_pago configurable

pedido.forma_pago
→ snapshot textual histórico
```

Pedidos nuevos:

```text
Domiciliación bancaria
Transferencia bancaria
→ id_tipo_pago = NULL
→ forma_pago = literal correspondiente

tipo de pago configurable
→ id_tipo_pago = ID real
→ forma_pago = snapshot del nombre canónico
```

Importación legacy correcta:

```text
metodo_pago 0 → Domiciliación bancaria
metodo_pago 1 → Tarjeta
metodo_pago 2 → Paypal
metodo_pago 3 → Al contado
metodo_pago 4 → Transferencia bancaria

id_tipo_pago → NULL
forma_pago   → snapshot
```

No reinterpretar nunca el índice legacy como ID de `tipo_pago`.

Si el tipo configurable se renombra después:

```text
pedido histórico
→ conserva su forma_pago snapshot
```

## 21.3 Tipo documental

Opciones:

```text
Albarán
Factura
Abono
```

A su lado:

```text
campo numero
```

Placeholder dinámico:

```text
Número albarán
Número factura
Número abono
```

El tipo no cambia la lógica del pedido.

## 21.4 R.E.

Check:

```text
Recargo de Equivalencia
```

Si está desmarcado:

```text
→ solo IVA
→ RE no se aplica
```

Si está marcado:

```text
→ mostrar/aplicar RE
```

IVA y RE están ligados por parejas fiscales.

Cambiar IVA:

```text
→ selecciona automáticamente su RE correspondiente
```

Cambiar RE:

```text
→ selecciona automáticamente su IVA correspondiente
```

En pedido recepcionado:

```text
R.E. queda congelado
```

## 21.5 UE

Check:

```text
Pedido europeo
```

El comportamiento definitivo se documenta en la sección de motor económico.

En pedido recepcionado:

```text
UE sigue siendo informativo/editable
```

aunque visualmente modifica cómo se presenta el total.

## 21.6 Fechas

```text
Fecha pedido
→ default: día actual
→ editable

Fecha pago
→ datepicker
→ puede ser opcional
```

`fecha_pedido` es la fecha real/documental del pedido, no necesariamente la fecha de creación del registro SQLite.

## 21.7 Columnas

Selector para mostrar/ocultar columnas opcionales de la tabla.

Configuración persistida **junto al pedido**.

---

# 22. Tabla de Pedido — columnas

Columnas posibles:

```text
Ordenar
Localizador
Descripción
Referencia
Marca
Código de barras
Unidades
Stock
Stock final
Precio albarán
Descuento
Subtotal
IVA + RE
PUC
Total
PVP
Margen
Borrar
```

Alineación visual cerrada:

```text
Orden                               centrado
Localizador                         izquierda
Descripción                         izquierda
Referencia                          izquierda
Marca                               izquierda
Código de barras                    centrado
Unidades                            centrado
Stock actual                        centrado
Stock final                         centrado
Precio albarán                      centrado
Descuento                           centrado
Subtotal                            centrado
IVA + RE                            centrado
PUC                                 centrado
Total                               centrado
PVP                                 centrado
Margen                              centrado
Borrar                              centrado
```

La misma alineación se aplica a `<th>` y `<td>`.

Precedente CSS importante: la regla genérica de la tabla para `th/td { text-align: left; }` tiene más especificidad que una clase aislada. Para Código de barras e IVA+RE se usa una regla contextual dentro de `.purchase-order-lines__table`, evitando `!important`.

## 22.1 Columnas opcionales

El selector `Columnas` controla:

```text
Ordenar
Referencia
Marca
Código de barras
Stock actual
Stock final
Descuento
IVA
```

`Subtotal` es columna base y siempre visible.

## 22.2 Persistencia

Las columnas visibles/ocultas se guardan con el pedido.

No son una preferencia global de usuario.

# 23. Líneas de Pedido

## 23.1 Estado editable

Pedido pendiente:

```text
líneas editables
```

Pedido recepcionado:

```text
líneas solo lectura
```

## 23.2 Orden

Si `Ordenar` está visible:

```text
icono subir
icono bajar
```

El orden se persiste.

## 23.3 Artículo duplicado

Si se intenta añadir un artículo que ya existe en el pedido:

```text
NO crear segunda línea
→ localizar línea existente
→ enfocar campo Unidades
```

## 23.4 Nueva línea

Al añadir artículo:

```text
unidades iniciales = 0
```

Motivo:

```text
un error de selección no debe implicar stock futuro accidentalmente
```

## 23.5 Eliminar línea

Pedido pendiente:

```text
→ confirmación
→ eliminar
```

Pedido recepcionado:

```text
→ no permitido
```

---

# 24. Buscador de artículos en Pedido

El comportamiento actual ya replica el patrón compartido de **Ventas** y **Artículos**.

Debajo de la tabla existe un campo pequeño:

```text
Localizador
→ ancho visual aproximado 6–10 caracteres
→ autofocus al entrar en una ficha editable
```

Resolución exacta:

```text
introducir localizador + Enter
→ resolver
→ añadir línea

introducir acceso directo + Enter
→ resolver
→ añadir línea

introducir código de barras + Enter
→ resolver
→ añadir línea
```

Búsqueda libre:

```text
empezar a escribir una letra
→ abrir ArticleSearchComponent
→ contexto="pedidos"
→ texto inicial = contenido previo + tecla escrita
```

`ArticleSearchComponent` es ahora reutilizado por:

```text
Ventas
Artículos
Pedidos
```

En contexto Pedidos:

```text
→ usa ComprasService.searchPedidoArticulos()
→ devuelve PedidoArticuloInterface
→ permite seleccionar uno o varios artículos
→ selección múltiple añade varias líneas
```

No resolver un artículo seleccionado por el modal volviendo a pasar su localizador por la resolución exacta: el modal ya devuelve el artículo de Pedido correcto y volver a resolver podría colisionar con la prioridad acceso directo/localizador.

Al añadir:

```text
unidades = 0
```

Si el artículo ya existe en el pedido:

```text
NO crear segunda línea
→ localizar la existente
→ enfocar y seleccionar Unidades
```

El autofocus usa el momento posterior al render y no `ngAfterViewInit()` directo, siguiendo el patrón ya consolidado tras el problema visual de Imprenta.

# 25. Datos de cada línea

## 25.1 Localizador

Identidad/localizador del artículo.

## 25.2 Descripción

El nombre/descripción del artículo.

Si el artículo canónico tiene:

```text
mostrar_observaciones_pedidos = true
+
observaciones no vacías
```

la descripción muestra a su lado:

```text
mat-icon info_outline
→ tooltip con las observaciones
```

Se replicó la UX ya utilizada en Ventas/listado de Pedidos. No abrir alertas ni diálogos al añadir el artículo.

`observacionesPedido` es un dato derivado de lectura del artículo canónico actual y **no se persiste dentro de `linea_pedido`**. Por eso también funciona al reabrir un Pedido guardado.

Para mantener la celda correctamente alineada como tabla, el `<td>` no se convierte en flex; se usa un contenedor interior flex para texto + icono.

## 25.3 Referencia y Marca

Snapshots/información útil para identificar el artículo dentro del pedido.

## 25.4 Código de barras adicional

Si el artículo no tiene código adicional:

```text
→ campo para introducir uno
```

Si ya tiene código(s) adicional(es):

```text
→ indicador informativo
→ no introducir otro desde Compras
```

El código introducido en un pedido pendiente:

```text
NO modifica Artículos todavía
```

Al recepcionar:

```text
→ validar unicidad global
→ persistirlo en el artículo
```

## 25.5 Unidades

```text
cantidad recibida/solicitada a aplicar al recepcionar
```

Pendiente:

```text
puede ser 0 mientras se edita
```

Recepción:

```text
TODAS las líneas deben ser > 0
```

## 25.6 Stock

Pedido pendiente:

```text
stock canónico actual del artículo
```

Al reabrir un borrador:

```text
→ releer stock actual
```

Pedido recepcionado:

```text
snapshot de stock previo a la recepción
```

No mostrar el stock actual meses después.

## 25.7 Stock final

Pedido pendiente:

```text
stock actual + unidades
```

Pedido recepcionado:

```text
snapshot del stock final producido por la recepción
```

## 25.8 Precio albarán

Por defecto:

```text
valor actual del artículo
```

Editable en pendiente.

Modificarlo:

```text
→ recalcular PUC de la línea
```

No modifica el artículo canónico hasta Recepcionar.

## 25.9 Descuento de línea

Porcentaje aplicado a la línea.

Afecta a:

```text
base de la línea
PUC
IVA / RE derivados
totales
```

## 25.10 IVA + RE

Selectores ligados.

RE solo tiene efecto cuando el pedido tiene `R.E.` activo.

## 25.11 PUC

Coste unitario calculado a partir del precio albarán descontado y sus impuestos aplicables según la lógica legacy.

## 25.12 Total

```text
unidades × PUC
```

con la precisión/redondeos acordes al modelo económico interno.

## 25.13 PVP

Por defecto:

```text
PVP actual del artículo
```

Editable en pendiente.

No modifica el artículo canónico hasta Recepcionar.

## 25.14 Margen

Calculado a partir del PVP y PUC de la línea.

---

# 26. Modelo económico — precisión

El esquema actual trabaja con unidades enteras y precios/importes con precisión interna suficiente, incluyendo microeuros/puntos básicos donde corresponda.

Principio:

```text
mantener precisión interna
→ redondear/formatear para UI
```

No introducir cálculos basados en strings formateados.

Centralizar cálculos en una responsabilidad propia en vez de dispersarlos por el componente.

---

# 27. Modelo económico — descuentos de línea y global

## 27.1 Descuento de línea

Para una línea:

```text
precio albarán descontado =
  precio albarán × (1 - descuento línea)
```

Este descuento afecta al PUC.

## 27.2 Descuento global

El descuento global se aplica proporcionalmente a la base de todas las líneas.

Conceptualmente:

```text
base línea tras descuentos =
  unidades
  × precio albarán
  × (1 - descuento línea)
  × (1 - descuento global)
```

Los IVA/RE del total del pedido se calculan sobre las bases ya afectadas por el descuento global.

El descuento global:

```text
NO modifica el PUC unitario almacenado/calculado de la línea
NO modifica Total beneficios
```

Esta peculiaridad se mantiene por compatibilidad con el TPV antiguo.

## 27.3 Fórmula conceptual global

```text
Subtotal descontado
+ Portes
+ IVAs
+ REs
= Total factura
```

Equivalentemente, partiendo del subtotal previo al descuento global:

```text
Subtotal × (1 - descuento global)
+ portes
+ IVAs
+ REs
```

donde los impuestos de las líneas corresponden a bases ya afectadas por el descuento global.

---

# 28. Portes

`Portes` es un campo económico editable mientras el pedido no esté recepcionado.

Se comporta como una línea fiscal ficticia:

```text
unidades = 1
base = importe portes
IVA = 21 %
```

Si `R.E.` está marcado:

```text
RE = 5,2 %
```

Los portes:

- se suman a la base/subtotal correspondiente;
- generan IVA 21 %;
- generan RE 5,2 % si procede;
- no reciben el descuento global;
- sí participan en la fórmula legacy de `Media margen`;
- no participan en `Total beneficios`.

---

# 29. R.E. — comportamiento económico

Si `R.E. = false`:

```text
IVA se aplica
RE no se aplica
```

Si `R.E. = true`:

```text
IVA se aplica
RE se aplica
```

Parejas conocidas según fiscalidad utilizada por el proyecto, por ejemplo:

```text
IVA 21 % ↔ RE 5,2 %
IVA 10 % ↔ RE 1,4 %
...
```

No duplicar tablas fiscales en múltiples componentes; centralizar si son compartidas.

En pedido recepcionado:

```text
R.E. no se puede cambiar
```

porque afectaría a valores económicos históricos.

---

# 30. UE — comportamiento definitivo de compatibilidad

Se adopta expresamente la **opción A**, compatible con el TPV antiguo.

Marcar `UE`:

```text
NO elimina internamente IVA/RE de los cálculos legacy
NO altera el PUC calculado de las líneas
NO cambia los porcentajes guardados
```

Visualmente:

```text
IVA / RE continúan visibles
→ se muestran sombreados/desenfatizados

Total factura
→ se sigue mostrando con IVA/RE

Total sin IVA
→ aparece como línea adicional
→ corresponde al total/base sin IVA/RE
```

Ejemplo legacy:

```text
Subtotal        25,74 €
IVA 10 %         2,57 €
RE 1,4 %         0,36 €

Total factura   28,67 €
Total sin IVA   25,74 €
```

Esta decisión es deliberada para:

- mantener paridad con pedidos legacy;
- evitar diferencias entre TPV antiguo y nuevo;
- conservar el mismo PUC que históricamente se obtenía al recepcionar.

No reinterpretar UE como “PUC sin impuestos” en el nuevo cliente.

---

# 31. Totales de Pedido

El bloque inferior de Totales está implementado y usa exclusivamente `PurchaseOrderTotalsCalculator` como fuente económica global.

Contenido actual:

```text
Total líneas
Total artículos
Total beneficios
Total PVP
Portes
Media margen

Subtotal
Desglose IVA
Desglose RE
Descuento global
Total factura
Total sin IVA (solo UE)
```

El componente visual es:

```text
PurchaseOrderTotalsComponent
```

y recibe los totales derivados desde la ficha; no mantiene un segundo estado económico canónico.

Estética cerrada:

```text
cabecera “Totales”
dos columnas en escritorio
sin líneas horizontales entre cada fila
borde exterior + divisor vertical
responsive a una columna
```

Los editores de Portes y Descuento global usan `type="text" + inputmode="decimal"` y presentan `€` / `%` como suffix visual dentro del propio control, flotando a la derecha. El valor editable comienza a la izquierda y el control ocupa todo el hueco disponible.

## 31.1 Total líneas

```text
número de líneas del pedido
```

Una línea con `unidades = 0` cuenta como línea pero no genera artículos, base fiscal ni importe.

## 31.2 Total artículos

```text
Σ unidades
```

## 31.3 Total beneficios

```text
Σ [unidades × (PVP - PUC)]
```

Solo líneas del pedido.

No incluye:

```text
portes
descuento global
```

## 31.4 Total PVP

```text
Σ (unidades × PVP)
```

## 31.5 Media margen — lógica legacy

No usar media simple.

```text
totalPvp = Σ (unidades × PVP)

totalPuc =
  Σ (unidades × PUC)
  + portes

mediaMargen =
  totalPvp === 0
    ? 0
    : 100 × (totalPvp - totalPuc) / totalPvp
```

El descuento global no modifica este cálculo.

## 31.6 Subtotal global

Se obtiene sumando las bases fiscales ya afectadas por descuento de línea y descuento global, más portes.

Los portes no reciben descuento global.

## 31.7 Subtotal por línea

Existe una columna base `Subtotal` entre Descuento e IVA.

Fórmula única, expuesta por `PurchaseOrderTotalsCalculator.calcularSubtotalLineaMicros()`:

```text
unidades
× PALB
× (1 - descuento línea)
× (1 - descuento global)
```

No incluye IVA ni RE.

La misma base exacta alimenta el motor fiscal global; no existe una fórmula duplicada en el template.

## 31.8 IVA / RE

Mostrar desglose por parejas fiscales.

R.E. OFF:

```text
RE almacenado en línea
→ se conserva
→ no se aplica al PUC ni a totales
```

R.E. ON:

```text
RE participa
```

Los portes se agrupan con IVA 21 % / RE 5,2 % cuando corresponde.

## 31.9 Descuento global

Campo porcentual editable solo en pendiente.

Se aplica sobre las líneas, no sobre portes.

No altera el PUC unitario almacenado/calculado.

## 31.10 Total factura

Pendiente:

```text
base líneas tras descuentos
+ portes
+ IVA
+ RE efectivo
```

El importe se recalcula al construir `PedidoSaveCommand` y se persiste en `pedido.importe_micros`, por lo que el listado de Pedidos refleja el valor actualizado después de guardar.

Recepcionado:

```text
mostrar/preservar importe histórico persistido
→ no reconstruirlo con fórmulas actuales
```

## 31.11 Total sin IVA

Solo se muestra si `UE = true`.

Corresponde al subtotal/base sin IVA/RE. `UE` no elimina los impuestos del cálculo legacy ni modifica PUC.

## 31.12 Precisión y regresión cerrada

El calculador global usa enteros escalados + `BigInt` para productos/divisiones.

Está cubierto por regresiones combinadas de:

```text
varios IVAs
varios REs
descuento línea
descuento global
portes
R.E. ON/OFF
líneas con 0 unidades
beneficios
PVP
media margen legacy
UE
persistencia del importe
```

PUC y Total se muestran a 2 decimales, aunque internamente sigan en microeuros. Por ello una variación pequeña al activar/desactivar RE puede no verse en el PUC redondeado de una línea concreta, aunque sí exista internamente y se refleje en Total/Margen.

# 32. Pedido pendiente — reglas

Un pedido pendiente es un borrador.

Puede guardarse si:

```text
Proveedor presente
```

Puede tener:

```text
0 líneas
líneas con unidades 0
campos opcionales vacíos
```

Guardar un borrador:

```text
NO cambia stock
NO cambia PALB del artículo
NO cambia PUC del artículo
NO cambia PVP del artículo
NO añade código de barras al artículo
NO crea históricos de stock
```

Los datos del pedido son su propio snapshot editable hasta Recepcionar.

---

# 33. Dirty state y navegación segura

`16.7` está implementado y cerrado.

No se mantiene un booleano dirty manual. Se construye una huella canónica mediante:

```text
buildPurchaseOrderDirtyFingerprint(state, lines)
```

La huella contiene únicamente datos persistibles y normalizados:

```text
cabecera persistible
portes
descuento global
columnas visibles ordenadas
líneas persistibles
orden real según posición del array
```

No incluye datos visuales/canónicos externos que no deben producir falsos dirty, por ejemplo:

```text
stock actual releído
stock final derivado
observacionesPedido
nombre/marca/referencia actuales
flags visuales
importe derivado del pendiente
```

El componente mantiene:

```text
cleanFingerprint
+
computed dirty
```

Al cargar un Pedido o tras una relectura canónica posterior a Guardar:

```text
markCurrentStateClean()
```

## Navegación Angular

Existe un contrato reusable:

```text
PendingChangesAware
```

y un guard:

```text
pendingChangesGuard
```

aplicado a:

```text
/compras/pedido
/compras/pedido/:idPedido
```

Si no hay cambios:

```text
→ navegar directamente
```

Si hay cambios:

```text
→ DialogService.confirm
→ aceptar = descartar y salir
→ cancelar = permanecer
```

Durante `processing()` la salida se bloquea.

## Cerrar/recargar Electron

El componente usa `host` moderno, no `@HostListener`:

```text
(window:beforeunload)
```

con confirmación nativa de Chromium cuando hay cambios pendientes.

## Guardar nuevo Pedido

La huella se marca limpia **antes** del `router.navigate(... replaceUrl)` al ID recién creado, evitando que el propio redirect active el guard.

## Eliminar

Tras eliminar se marca limpio antes de navegar, de modo que no aparece una segunda confirmación de cambios sin guardar después de la confirmación de borrado.

El dirty state cubre cambios de cabecera, líneas, orden, unidades, economía, Portes y Descuento global sin necesidad de llamadas `markDirty()` dispersas.

# 34. Pedido → crear nuevo Artículo ✅ CERRADO

El flujo está completamente implementado y validado:

```text
Pedido guardado + limpio + pendiente
→ icono + junto al Localizador
→ Artículos
→ crear borrador nuevo automáticamente
→ usuario guarda
→ preguntar si quiere volver al Pedido
→ volver al Pedido original
→ recuperar artículo por idArticulo exacto
→ añadir línea con unidades = 0
→ enfocar/select Unidades
→ Pedido queda dirty hasta Guardar
```

## 34.1 Recuperación exacta por ID ✅

Vertical completa:

```text
ComprasService.getPedidoArticuloById(idArticulo)
→ preload
→ IPC
→ PedidosService.getPedidoArticuloById()
→ PedidosRepository.getPedidoArticuloById()
→ TypeOrmPedidosRepository
```

La consulta reutiliza `PEDIDO_ARTICULO_SELECT`, exige artículo activo y evita cualquier ambigüedad con `acceso_directo`/`localizador`.

No sustituir este retorno por `resolvePedidoArticulo(localizador)`.

## 34.2 Contexto explícito de navegación ✅

Existe el contrato compartido:

```text
PurchaseOrderArticleFlowState
  idPedido
  idArticulo
```

con utilidades de parsing/validación y una clave explícita de estado de navegación.

No se usan heurísticas por URL ni estado global oculto.

## 34.3 Salida desde Pedido ✅

El botón `+` solo puede iniciar el flujo cuando:

```text
Pedido tiene id persistido
Pedido NO está recepcionado
Pedido está limpio
no hay processing en curso
```

Un Pedido dirty debe guardarse o descartarse primero.

## 34.4 Artículos ✅

Al entrar con contexto de Pedido:

```text
→ ArticulosService.crearBorrador()
→ se crea una ficha nueva específica para el flujo
```

Al guardar esa ficha nueva se pregunta si se desea volver al Pedido.

Si el usuario elige No:

```text
→ permanece en Artículos
→ no modifica el Pedido
```

Si el usuario cierra/descarta la ficha contextual, se limpia el contexto de creación para no producir retornos accidentales posteriores.

## 34.5 Retorno al Pedido ✅

Al volver:

```text
idPedido debe coincidir con el Pedido actual
idArticulo debe ser válido
→ ComprasService.getPedidoArticuloById(idArticulo)
→ addPurchaseOrderArticles(...)
```

Si el artículo ya estuviera en líneas:

```text
→ no duplicar
→ enfocar Unidades de la existente
```

Si es nuevo:

```text
→ unidades = 0
→ línea renderer nueva
→ foco Unidades
→ fingerprint pasa a dirty
```

El estado persistido se marca limpio **antes** de incorporar el artículo retornado; así la línea nueva queda correctamente detectada como cambio pendiente.

## 34.6 Pedido recepcionado — ajuste visual definitivo ✅

En recepcionados no se muestran controles que nunca podrán usarse:

```text
Localizador
botón + Crear artículo
buscador asociado
```

Se usa `showArticleEntry = !order.recepcionado` en vez de limitarse a deshabilitarlos.

No usar `disabled()` para decidir esta visibilidad, porque `disabled()` también puede ser temporal durante `processing()` y no debe hacer desaparecer la zona en un Pedido pendiente mientras se guarda.

# 35. PDFs de Pedido ✅ CERRADO

La gestión completa de PDFs está implementada tanto para Pedidos pendientes como recepcionados.

```text
leer
adjuntar
almacenar
listar
abrir
eliminar
limpiar físicamente cuando corresponde
```

Los PDFs son documentación independiente del snapshot económico/stock y **no forman parte del dirty fingerprint**: adjuntar/eliminar persiste inmediatamente.

## 35.1 Modelo SQLite y contrato público ✅

Se reutiliza el esquema adelantado:

```text
archivo
pedido_archivo
```

Tipos de relación:

```text
albaran
factura
abono
documento
otro
```

El renderer recibe `PedidoArchivoInterface` con metadata segura:

```text
id de pedido_archivo
publicId de la relación
 tipo
nombre
mimeType
sizeBytes
createdAt
```

No se exponen al renderer:

```text
relative_path
internal_name
id_archivo
ruta absoluta
```

## 35.2 Lectura ✅

Vertical completa:

```text
ComprasService.getPedidoArchivos(idPedido)
→ preload / IPC
→ PedidosService
→ TypeOrmPedidosRepository
→ pedido_archivo + archivo
```

Solo devuelve:

```text
pedido activo
archivo activo
purpose = order_document
mime_type = application/pdf
```

Para nombre visible se prioriza `original_name` y se usa `internal_name` como fallback.

## 35.3 Adjuntar y almacenamiento gestionado ✅

Flujo:

```text
diálogo nativo Electron
→ seleccionar un único PDF
→ validar fichero
→ máximo 100 MB
→ validar firma %PDF-
→ SHA-256 en streaming
→ files/orders/<publicId>.pdf
→ INSERT archivo
→ INSERT pedido_archivo
```

Convenciones:

```text
purpose = order_document
mimeType = application/pdf
files/orders
internalName = <archivoPublicId>.pdf
```

El almacenamiento no carga el PDF completo en memoria.

Si la copia física se completa pero falla la persistencia SQLite:

```text
→ limpiar la copia física
→ propagar el error
```

El peor caso ante una interrupción abrupta entre filesystem y SQLite puede ser un fichero físico huérfano, nunca una referencia SQLite activa a un fichero destruido deliberadamente.

El tipo de `pedido_archivo` nuevo se toma del tipo documental **persistido** del Pedido.

Por eso `Adjuntar PDF` requiere:

```text
Pedido persistido
Pedido limpio
sin processing
```

No exige que el Pedido sea pendiente: un recepcionado también puede adjuntar documentación.

## 35.4 Panel renderer ✅

Existe `PurchaseOrderFilesComponent` en el footer junto a Totales.

Muestra:

```text
nombre
etiqueta de tipo
tamaño legible
icono PDF
acciones
```

Pedido nuevo sin guardar:

```text
→ panel PDFs no aparece todavía
```

Pedido persistido:

```text
→ panel visible
```

Adjuntar, abrir o eliminar no marca dirty porque son operaciones persistidas inmediatamente.

## 35.5 Abrir ✅

El renderer envía exclusivamente:

```text
idPedido
idPedidoArchivo
```

Backend valida que esa relación pertenezca exactamente al Pedido y resuelve `archivoPublicId`.

`FilePedidoArchivoStorage.open()` construye la ruta gestionada y usa `shell.openPath()` con la aplicación predeterminada del sistema.

Un fichero ausente (`ENOENT`) se normaliza a:

```text
El PDF solicitado no está disponible.
```

No filtrar rutas locales/errores `ENOENT` crudos al renderer.

## 35.6 Eliminación segura y PDFs compartidos ✅

Eliminar requiere confirmación en renderer.

Transacción lógica:

```text
validar idPedido + idPedidoArchivo
→ DELETE pedido_archivo
→ contar referencias restantes al mismo id_archivo
```

Si quedan referencias:

```text
→ conservar archivo lógico
→ conservar PDF físico
```

Si NO quedan referencias:

```text
→ soft-delete archivo (deleted_at)
→ COMMIT
→ intentar borrar físicamente files/orders/<archivoPublicId>.pdf
```

Esto protege especialmente documentos legacy que puedan compartir el mismo `archivo` entre varias relaciones.

El borrado físico ocurre después de que SQLite ya esté consistente. Si el filesystem falla al eliminar un fichero ya desvinculado, se registra el error y puede quedar un fichero huérfano, pero no se revierte una operación lógica ya correcta ni se deja una referencia activa rota.

## 35.7 Pedido recepcionado ✅

Los PDFs siguen siendo gestionables:

```text
adjuntar
abrir
eliminar
```

porque son documentación/información y no modifican stock, economía ni históricos.

# 36. Recepcionar Pedido

`Recepcionar` cierra económicamente el pedido.

Es irreversible desde este flujo.

Antes:

```text
pedir confirmación explícita
```

## 36.1 Validaciones

Debe existir:

```text
Proveedor
al menos una línea
TODAS las líneas con unidades > 0
```

No permitir recepcionar si cualquier línea tiene `0`.

Además, validar:

- referencias reales de artículos;
- códigos adicionales;
- consistencia económica necesaria;
- datos fiscales que requiera cada línea.

## 36.2 Operación atómica

Dentro de una única transacción:

```text
1. releer artículos canónicos
2. validar que todos siguen disponibles/son coherentes
3. validar unicidad global de nuevos códigos de barras
4. capturar stock previo
5. sumar unidades al stock
6. actualizar precios del artículo según la línea
7. persistir nuevo código adicional si procede
8. crear histórico PEDIDO = 3
9. enlazar histórico con id_pedido
10. guardar snapshot stock previo/final de cada línea
11. fijar fecha_recepcionado
12. marcar pedido como recepcionado
13. COMMIT
```

Ante cualquier fallo:

```text
ROLLBACK completo
```

No debe existir estado parcialmente recepcionado.

## 36.3 Fecha de recepción

```text
fecha_recepcionado
→ momento/día real en que se pulsa Recepcionar
```

No se toma de `fecha_pedido`.

---

# 37. Efectos canónicos al Recepcionar

Solo en este momento se aplican al artículo real:

```text
stock
precio albarán
PUC
PVP
nuevo código adicional
```

Regla esencial:

```text
Guardar pedido pendiente ≠ modificar artículo
Recepcionar pedido        = aplicar cambios canónicos
```

El histórico creado usa:

```text
tipo = PEDIDO = 3
id_pedido = pedido recepcionado
```

---

# 38. Pedido recepcionado — snapshot histórico

Tras recepcionar:

```text
líneas
cantidades
precios
impuestos
descuentos
stock previo
stock final
portes
R.E.
datos económicos
```

quedan congelados.

Al abrirlo meses después:

```text
Stock
→ stock que había justo antes de aquella recepción

Stock final
→ stock que quedó tras aquella recepción
```

No releer el stock actual para sustituir estos snapshots.

---

# 39. Pedido recepcionado — qué sigue editable

La recepción congela lo que afecta a:

```text
economía
stock
histórico
```

Siguen siendo modificables los datos informativos acordados de cabecera, con la excepción de R.E.

En particular:

```text
Proveedor                 editable
Forma de pago             editable
Tipo                      editable
Número                    editable
Fecha pedido              editable
Fecha pago                editable
UE                        editable
Columnas/presentación     editable si no afecta al snapshot económico
Observaciones             editable
PDFs                      editable

R.E.                      NO editable
Líneas                    NO editables
Portes                    NO editable
Descuento global          NO editable
valores económicos        NO editables
```

Guardar un pedido recepcionado:

```text
→ solo actualiza información permitida
→ NUNCA vuelve a tocar stock
→ NUNCA vuelve a crear históricos
→ NUNCA recalcula/aplica precios canónicos
```

---

# 40. Base de datos existente para Compras

Existe trabajo previo del esquema/importación `.otpv` y ya ha sido ampliado durante `16.4`, `16.5` y `16.6`.

Conceptos presentes:

```text
pedido
linea_pedido
pedido_archivo
vista_pedido
marca
proveedor
proveedor_marca
```

Además:

```text
historico_articulo
→ dispone de relación id_pedido
```

## 40.1 Cabecera de Pedido

`pedido` distingue:

```text
id_tipo_pago
→ relación opcional al catálogo configurable

forma_pago
→ snapshot textual de la forma de pago usada
```

Y ya persiste economía global del borrador:

```text
importe_micros
portes_micros
descuento_bps
```

Semántica:

```text
pedido pendiente
→ Guardar recalcula/persiste importe
→ persiste Portes y Descuento global

pedido recepcionado
→ esos tres valores quedan congelados
→ editar información permitida no los reescribe
```

## 40.2 Líneas

`linea_pedido` contiene ya:

```text
orden
stock_actual_snapshot
stock_final_snapshot

unidades
PALB
PUC
PVP
margen
IVA
RE
descuento
código de barras
snapshot de nombre
```

Semántica de stock:

```text
pendiente
→ snapshots NULL
→ Stock actual se relee del artículo canónico
→ Stock final = stock canónico + unidades

recepcionado nuevo
→ usar stock_actual_snapshot
→ usar stock_final_snapshot

recepcionado legacy sin snapshots
→ NULL
→ NO inventar valores usando stock actual
```

Guardado de borrador:

```text
línea existente
→ conserva id/public_id/id_articulo/nombre snapshot
→ actualiza únicamente campos editables

línea nueva
→ public_id nuevo
→ artículo activo obligatorio
→ snapshot nombre desde artículo canónico
→ snapshots stock = NULL

línea eliminada del renderer
→ DELETE de linea_pedido dentro de la misma transacción
```

La sincronización de líneas y cabecera ocurre dentro de una única transacción. Si falla una línea nueva o cualquier validación, se revierte también la cabecera.

El índice de líneas está preparado para:

```text
id_pedido
orden
id
```

No se impone `UNIQUE(id_pedido, orden)` para evitar colisiones temporales durante reordenaciones.

## 40.3 Importación legacy de líneas

El TPV antiguo no almacenaba snapshots históricos de stock.

Por tanto:

```text
stock_actual_snapshot = NULL
stock_final_snapshot  = NULL
```

El `orden` se reconstruye de manera estable durante importación a partir del orden de IDs legacy.

## 40.4 Vista de columnas

`vista_pedido` persiste configuración de columnas opcionales.

IDs opcionales conocidos:

```text
1  Ordenar
4  Referencia
5  Marca
6  Código de barras
8  Stock actual
9  Stock final
11 Descuento
13 IVA
```

`Subtotal` es base y no forma parte de esta lista opcional.

## 40.5 Archivos de Pedido

La gestión documental usa:

```text
archivo
pedido_archivo
```

`archivo` contiene metadata física/lógica del recurso gestionado; `pedido_archivo` contiene la relación y tipo documental.

Convención para PDFs de Pedido:

```text
purpose = order_document
mime_type = application/pdf
relative_path = files/orders/<publicId>.pdf
```

`pedido_archivo` puede compartir un mismo `id_archivo` entre varias relaciones importadas. Por ello eliminar una relación **no implica** borrar automáticamente `archivo` ni el fichero físico: solo se limpian cuando ya no existen referencias.

`archivo` usa baja lógica (`deleted_at`); `pedido_archivo` se elimina físicamente porque es una relación sin `deleted_at`.

Principio durante desarrollo:

```text
DATABASE_SCHEMA_VERSION = 1
→ ajustar schema cuando haga falta
→ borrar/recrear instalación si el cambio es incompatible
→ sin migraciones todavía
```

# 41. Plan Hito 16 — visión general

```text
16.1  Base Compras + históricos                   ✅
16.2  Backend listados                            ✅
16.3  UI listados                                 ✅

CTRL.1 Controles globales                         ✅
CTRL.2 Artículos / quick creates                  ✅

16.4  Cabecera/persistencia Pedido                ✅
16.5  Líneas/búsqueda                             ✅ CERRADO
16.6  Motor económico global                      ✅ CERRADO
16.7  Dirty/navigation guard                      ✅ CERRADO
16.8  Integración con Artículos                   ✅ CERRADO
16.9  PDFs                                        ✅ CERRADO
16.10 Recepción atómica                           ⬅️ SIGUIENTE
16.11 Pedido recepcionado                         ⬜
16.12 Regresión Pedidos                           ⬜
16.13 Marcas                                      ⬜
16.14 Proveedores                                 ⬜
```

Cada bloque:

```text
revisar main
→ implementar bloque pequeño pero completo
→ adaptar contracts/fakes/specs afectados en el mismo bloque
→ tests
→ build/lint
→ prueba funcional cuando exista UI
→ confirmación explícita
→ siguiente
```

No reabrir `16.5`, `16.6`, `16.7`, `16.8` o `16.9` salvo regresión real. El siguiente trabajo pertenece a `16.10`.

Por tamaño y riesgo, no implementar `16.10` como un único mega-patch: primero contrato/validaciones y transacción backend; después exposición y UI; finalmente regresión cross-layer/rollback.

# 42. 16.1 — Base de Compras + auditoría de históricos ✅ CERRADO

Estado validado:

```text
ruta /compras activa
tabs Pedidos / Marcas / Proveedores
Marcas y Proveedores como placeholders

históricos centralizados:
VENTA          1
VENTA_SYNC     2
PEDIDO         3
ARTICULO       4
INVENTARIO     5
INVENTARIO_ALL 6
CADUCIDAD      7

Inventario:
Guardar fila   → tipo 5
Guardar todos  → tipo 6
```

Objetivos cumplidos:

## Renderer

```text
activar botón/ruta Compras

src/app/modules/compras/
→ composición base
→ Pedidos
→ Marcas placeholder
→ Proveedores placeholder
```

La estructura concreta se decidirá mirando `main`, sin crear carpetas artificiales de un solo archivo.

## Históricos

Centralizar:

```text
VENTA          1
VENTA_SYNC     2
PEDIDO         3
ARTICULO       4
INVENTARIO     5
INVENTARIO_ALL 6
CADUCIDAD      7
```

Auditar:

```text
Ventas
Artículos
Inventario → guardar fila
Inventario → guardar todos
Caducidades
```

Corregir donde proceda.

`PEDIDO=3` quedará definido para la futura recepción, pero todavía no implementar recepción en 16.1.

---

# 43. 16.2 — Backend de listados de Pedidos ✅ CERRADO

Estado validado:

```text
ComprasService
→ preload
→ IPC
→ PedidosService
→ PedidosRepository
→ TypeOrmPedidosRepository
→ SQLite

searchPedidosGuardados()
searchPedidosRecepcionados()
getPedidoFilterOptions()
```

Los proveedores disponibles para filtros incluyen activos y proveedores históricos todavía referenciados por pedidos.

Implementación consolidada:

```text
PedidosService
→ PedidosRepository
→ TypeOrmPedidosRepository
```

Más:

```text
contracts
IPC
preload/fachada si procede
composition root
tests repository/service
```

Dos consultas:

```text
guardados
recepcionados
```

Filtros:

```text
fecha pedido desde/hasta
proveedor
numero
importe desde/hasta
```

Paginación:

```text
20 / 50 / 100 / 200
```

Orden estable.

---

# 44. 16.3 — Pantalla principal de Pedidos ✅ CERRADO

Estado validado funcionalmente:

```text
Pedidos guardados
Pedidos recepcionados
Nuevo pedido

filtros independientes
paginación 20 / 50 / 100 / 200
workspace independiente de ambos listados
tooltip de observaciones
icono UE
tipo + número
navegación a carcasa de Pedido
```

Decisión final importante sobre fechas:

```text
<label>
  <span>...</span>
  <input type="date">
</label>
```

- Fechas nativas Chromium/Electron.
- Valor `YYYY-MM-DD`.
- No `MatDatepicker`.
- No `matInput`.
- No envolver fechas en `mat-form-field`.
- El aspecto visual se resolverá mediante los estilos globales acordados en CTRL.

La carcasa de:

```text
/compras/pedido
/compras/pedido/:idPedido
```

ya existe y será completada en `16.4`.

Implementación consolidada:

```text
tabs Compras
Pedidos activa

Pedidos guardados
Pedidos recepcionados
Nuevo pedido
```

Incluye:

- filtros;
- paginación;
- tooltips de observaciones;
- icono UE;
- tipo + número;
- navegación al pedido;
- workspace de sesión independiente para ambos listados.

Marcas y Proveedores siguen placeholders.

---

# 45. CTRL — Normalización de controles pre-16.4 ✅ CERRADA

La normalización visual previa a la ficha de Pedido se completó y validó.

Objetivo conseguido:

```text
reducir CSS duplicado
+
fijar gramática visual común
+
evitar nuevos estilos paralelos durante Compras
```

## 45.1 Fuente canónica

Existe:

```text
src/styles/controls.scss
```

Primitivas consolidadas:

```text
.otpv-field
.otpv-field__label
.otpv-control
.otpv-control--textarea
.otpv-mat-field--compact
.otpv-table-control
.otpv-table-control--dirty
.otpv-table-control--invalid
```

Token visual introducido:

```text
--control-border-color
```

Los controles nativos normales usan un borde con peso visual coherente con Material outlined.

## 45.2 Convenciones cerradas

```text
Fecha
→ input type="date" nativo
→ YYYY-MM-DD
→ sin MatDatepicker

Entero
→ input type="number"
→ step="1"

Dinero / decimal / porcentaje
→ input type="text"
→ inputmode="decimal"
→ parsing explícito compatible con coma

Select simple
→ nativo cuando basta

Select múltiple/overlay complejo
→ mat-select

Checkbox
→ elección booleana

Slide toggle
→ activar/desactivar modo inmediato

Edición compacta en tabla
→ .otpv-table-control
```

Altura normal canónica:

```text
40 px
```

Editor de tabla:

```text
~30 px
```

## 45.3 CTRL.1 completado

Migrado/centralizado:

```text
Clientes → Ventas
Compras → filtros Pedidos
Inventario
Caducidades
```

Incluyó:

```text
fechas nativas compartidas
Material compacto compartido
importes filtros Compras con inputmode decimal
base global de editor compacto de tabla
```

## 45.4 CTRL.2 completado

Migrado:

```text
ArticleGeneral
ArticleNotes
BrandQuickCreate
ProviderQuickCreate
```

Se eliminó CSS repetido de inputs/selects/textarea cuando la apariencia era realmente la misma.

`ClientForm`, Imprenta, `forms.scss` completo y layouts generales quedaron fuera de alcance deliberadamente.

## 45.5 Principio resultante

```text
apariencia y estados compartidos
→ controls.scss

layout / ancho / colocación
→ componente
```

No crear componentes Angular triviales solo para envolver controles HTML.

CTRL queda cerrada. No reabrirla por diferencias visuales menores sin una necesidad real.

# 46. 16.4 — Ficha Pedido: cabecera + persistencia básica ✅ CERRADO

`16.4` está implementado, probado funcionalmente y subido a `main`.

## 46.1 Backend/modelo

Cadena disponible:

```text
ComprasService renderer
→ preload
→ IPC
→ PedidosService
→ PedidosRepository
→ TypeOrmPedidosRepository
→ SQLite
```

Casos de uso cerrados:

```text
getPedido()
getPedidoFormOptions()
savePedido()
deletePedido()
```

Proveedor obligatorio para guardar.

Pedido pendiente:

```text
puede guardarse con 0 líneas
→ NO modifica stock
→ NO modifica precios canónicos
→ NO crea histórico
```

Pedido recepcionado:

```text
R.E. congelado
→ resto de campos informativos permitidos puede guardarse
→ guardar NO reaplica stock/precios/históricos
```

## 46.2 Forma de pago y compatibilidad legacy

Modelo:

```text
id_tipo_pago
→ opcional

forma_pago
→ snapshot textual
```

Built-ins del nuevo Pedido:

```text
Domiciliación bancaria
Transferencia bancaria
```

Más:

```text
tipos de pago configurables activos
```

Mapping legacy fijado y cubierto por test integral:

```text
0 → Domiciliación bancaria
1 → Tarjeta
2 → Paypal
3 → Al contado
4 → Transferencia bancaria
```

Pedidos legacy:

```text
id_tipo_pago = NULL
forma_pago   = snapshot
```

Índice desconocido:

```text
pedido se conserva
forma_pago = NULL
warningCount++
```

No reinterpretar esos índices como IDs de `tipo_pago`.

## 46.3 Cabecera renderer

Rutas:

```text
/compras/pedido
/compras/pedido/:idPedido
```

Campos funcionales:

```text
Proveedor *
Forma de pago
Tipo
Número
R.E.
UE
Fecha pedido
Fecha pago
Columnas
Observaciones
```

Nuevo pedido:

```text
tipo = Albarán
fecha pedido = hoy
columnas opcionales iniciales = Ordenar + Marca
```

Proveedores históricos:

```text
si el proveedor del pedido ya no está activo
→ se añade como opción histórica
```

Formas de pago históricas:

```text
se conserva snapshot exacto
→ no se reinterpreta según catálogo actual
```

Los `<select>` nativos usan selección explícita por opción para que valores cargados asíncronamente queden visualmente seleccionados.

## 46.4 Guardado

Guardar (ampliado posteriormente por 16.5/16.6):

```text
construye PedidoSaveCommand con cabecera + líneas + economía global
→ backend valida
→ transacción SQLite
→ renderer relee getPedido() + getPedidoLineas()
→ usa estado canónico persistido
```

Primer guardado:

```text
/compras/pedido
→ save
→ /compras/pedido/:id
→ replaceUrl
```

Feedback:

```text
Pedido guardado correctamente
→ visible ~4 segundos
→ desaparece al volver a editar
```

Para transportar el feedback tras el primer guardado se usa:

```text
Router.currentNavigation()
```

No usar `Router.getCurrentNavigation()` deprecated.

## 46.5 Eliminación

Solo existe botón Eliminar cuando:

```text
pedido.id !== NULL
AND
pedido.recepcionado = false
```

Flujo:

```text
confirmación
→ deletePedido()
→ baja lógica
→ /compras con replaceUrl
```

Pedido nuevo:

```text
sin botón Eliminar
```

Pedido recepcionado:

```text
sin botón Eliminar
```

## 46.6 Alta rápida de Proveedor

Se reutiliza:

```text
ProviderQuickCreateComponent
ProveedoresService
MarcasService
```

Comportamiento:

```text
+ proveedor
→ carga perezosa de marcas
→ abre modal
→ crea proveedor
→ lo incorpora al combo
→ lo selecciona
→ NO guarda automáticamente el Pedido
```

El componente reutilizable dejó de documentarse como exclusivo de Artículos.

## 46.7 Columnas opcionales

IDs persistidos:

```text
1  Ordenar
4  Referencia
5  Marca
6  Código de barras
8  Stock actual
9  Stock final
11 Descuento
13 IVA
```

Nuevo pedido:

```text
visibles inicialmente
→ 1 Ordenar
→ 5 Marca
```

## 46.8 Funcionalidad posterior — estado actual

La cabecera de `16.4` no debe confundirse con los bloques posteriores, aunque varios ya estén cerrados:

```text
16.5 líneas/buscador                 ✅
16.6 motor económico                 ✅
16.7 dirty/navigation                ✅
16.8 Pedido ↔ Artículos              ✅
16.9 PDFs                            ✅
16.10 recepción atómica              ⬅️ SIGUIENTE
```

No reabrir la cabecera para implementar la recepción salvo que exista una dependencia real y explícita.

# 47. 16.5 — Líneas + buscador de artículos ✅ CERRADO

Objetivo completo cerrado:

```text
leer líneas existentes
buscar/resolver artículos
editar líneas en memoria
persistir altas/cambios/bajas/orden
mostrar observaciones
mantener economía unitaria
sin producir efectos canónicos hasta Recepcionar
```

## 47.1 16.5A.1 — Schema líneas + snapshots stock ✅

`linea_pedido` incorpora orden y snapshots de stock para futuras recepciones nuevas.

Recepcionados legacy sin snapshots devuelven `NULL`; no se inventa historia.

## 47.2 16.5A.2 — Lectura backend de líneas ✅

Existe la vertical `getPedidoLineas()` completa.

Pendiente:

```text
Stock actual → artículo canónico actual
Stock final  → stock + unidades
```

Recepcionado:

```text
Stock actual/final → snapshots persistidos
```

Además la lectura devuelve `observacionesPedido` derivada del artículo actual cuando el flag de Pedidos está activo.

## 47.3 16.5A.3 — Resolución/búsqueda de artículos ✅

Resolución exacta por:

```text
acceso directo
localizador
barcode activo
```

Búsqueda libre por slug normalizado.

Contrato `PedidoArticuloInterface` incluye todos los datos necesarios para crear una línea, código adicional y observaciones.

## 47.4 16.5B.1–B.5 — Renderer base ✅

Cerrado:

```text
mostrar líneas
Localizador + Enter
ArticleSearchComponent compartido
selección múltiple
unidades = 0
Stock final reactivo
duplicado → foco Unidades
subir/bajar
borrar con confirmación
código adicional pendiente
```

## 47.5 Observaciones de artículo ✅

La primera propuesta de alertas al añadir se descartó.

UX definitiva:

```text
Descripción + info_outline
→ hover
→ matTooltip con observación
```

Solo aparece cuando `mostrarObservacionesPedidos` está activo y hay texto.

No se persisten observaciones dentro de la línea.

## 47.6 16.5B.6 — Economía unitaria ✅

`PurchaseOrderLineCalculator` es fuente única de:

```text
PALB
Descuento línea
IVA/RE efectivo
PUC
PVP
Margen
Total = unidades × PUC
```

Precisión:

```text
microeuros
basis points
microporcentaje
BigInt
```

Editores:

```text
PALB / PVP hasta 6 decimales
Descuento hasta 2 decimales
```

IVA/RE se emparejan desde `appData.ivaList/reList`:

```text
4 ↔ 0,5
10 ↔ 1,4
21 ↔ 5,2
```

R.E. OFF conserva RE almacenado pero no lo aplica.

Fiscalidades históricas fuera de AppData se mantienen visibles.

Precedente UI consolidado para selects nativos reactivos:

```html
<option [selected]="...">
```

PUC y Total se muestran a 2 decimales sin reducir precisión interna.

## 47.7 16.5B.7 — Persistencia de líneas ✅

`PedidoSaveCommand` incluye `lineas` y `savePedido()` guarda cabecera + columnas + líneas dentro de la misma transacción.

Persistencia cubre:

```text
líneas nuevas
líneas modificadas
líneas eliminadas
orden normalizado
unidades
barcode pendiente
PALB / PUC / PVP / margen
IVA / RE / descuento
```

Reglas:

```text
nueva línea exige artículo activo
nombre snapshot se toma al insertar
existente no puede cambiar de artículo
bajas se eliminan del borrador
snapshots stock siguen NULL
```

Después de guardar, renderer relee:

```text
getPedido()
getPedidoLineas()
```

por lo que las líneas nuevas reciben sus IDs/publicIds persistidos reales.

Rollback integral probado si falla cualquier línea.

Pedido recepcionado ignora cualquier intento de reescritura de líneas.

Guardar pendiente **NO**:

```text
modifica stock canónico
modifica PALB/PUC/PVP canónicos
crea barcode canónico
crea histórico PEDIDO
fija snapshots de recepción
```

Con esto `16.5` queda cerrado.

# 48. 16.6 — Motor económico global ✅ CERRADO

`16.6` está completamente implementado, validado y cerrado.

## 48.1 PurchaseOrderTotalsCalculator ✅

Responsabilidad global separada de `PurchaseOrderLineCalculator`.

Calcula:

```text
Total líneas
Total artículos
Total beneficios
Total PVP
Portes
Media margen legacy
Subtotal
IVA por tipos
RE por tipos
Descuento global
Total factura
Total sin IVA
Subtotal por línea
```

Usa `BigInt` y enteros escalados; no calcula sobre strings formateados.

## 48.2 Economía global persistida ✅

`pedido` ya transporta/persiste:

```text
importeMicros
portesMicros
descuentoGlobalBps
```

Pendiente:

```text
buildPurchaseOrderSaveCommand()
→ recalcula totalFacturaMicros
→ importeMicros
```

Recepcionado:

```text
importe/portes/descuento quedan congelados
→ no reconstruir historia
```

El listado de Pedidos recibe el importe actualizado después de guardar.

## 48.3 UI Totales ✅

Existe `PurchaseOrderTotalsComponent`.

Diseño definitivo:

```text
dos columnas
sin separadores horizontales internos
Portes con suffix € dentro del control
Descuento global con suffix % dentro del control
```

Portes y Descuento solo editables en pendiente.

## 48.4 Subtotal por línea ✅

Columna base, siempre visible.

```text
unidades × PALB × descuento línea × descuento global
```

sin IVA/RE.

Se calcula mediante el mismo motor global que alimenta las bases fiscales.

## 48.5 Reglas fiscales cerradas ✅

```text
Descuento global
→ líneas sí
→ portes no
→ PUC no

Portes
→ IVA 21 %
→ RE 5,2 % si R.E.

Total beneficios
→ solo líneas
→ sin portes/descuento global

Media margen
→ fórmula legacy ponderada + portes

UE
→ no elimina IVA/RE
→ no cambia PUC
→ añade Total sin IVA
```

## 48.6 Regresión económica ✅

Tests y pruebas funcionales cubren escenarios combinados de varios IVA/RE, descuentos, portes, línea 0, RE ON/OFF, UE, persistencia y redondeos.

Observación visual confirmada: una bajada real de PUC al desactivar RE puede quedar ocultada por el formato de 2 decimales en una línea de importe pequeño; el valor interno sí cambia y Total/Margen lo reflejan. No aumentar decimales por este motivo.

`16.6` no debe reabrirse salvo regresión real.

# 49. 16.7 — Dirty state + navegación segura ✅ CERRADO

`16.7` está completamente implementado, validado y cerrado.

Elementos:

```text
buildPurchaseOrderDirtyFingerprint()
PendingChangesAware
pendingChangesGuard
cleanFingerprint
dirty computed
window:beforeunload
```

La huella compara el estado persistible normalizado, no datos visuales derivados.

Cubre:

```text
cabecera
líneas
orden
unidades
barcode pendiente
economía
Portes
Descuento global
columnas visibles
```

No produce dirty por releer stock, observaciones de artículo u otros datos no persistibles.

Guardar/releer:

```text
→ markCurrentStateClean()
```

antes del redirect de un Pedido nuevo.

Eliminar:

```text
→ confirmación de eliminación
→ marcar limpio
→ navegar
```

sin doble confirmación.

La navegación Angular usa diálogo propio y cerrar/recargar utiliza confirmación nativa de Chromium.

`16.7` no debe reabrirse salvo regresión real.

# 50. 16.8 — Integración Pedido → Artículos ✅ CERRADO

`16.8` está completamente implementado, probado y cerrado.

## 50.1 16.8A — Recuperar artículo de Pedido por ID ✅

Vertical completa disponible:

```text
TypeOrmPedidosRepository.getPedidoArticuloById()
PedidosRepository
PedidosService
ComprasApi
IPC
preload
ComprasService
```

Valida ID positivo/seguro, devuelve solo artículos activos y reutiliza `PEDIDO_ARTICULO_SELECT` + mapping canónico de `PedidoArticuloInterface`.

Motivo:

```text
retorno desde Artículos
→ conocer idArticulo exacto
→ recuperar exactamente ese artículo
```

No usar `resolvePedidoArticulo(localizador)` para el retorno.

## 50.2 16.8B — Flujo visible Pedido ↔ Artículos ✅

Existe contexto explícito:

```text
PurchaseOrderArticleFlowState
purchaseOrderArticleFlow
idPedido
idArticulo
```

Salida:

```text
Pedido guardado + limpio + pendiente
→ botón + junto a Localizador
→ /articulos
→ crearBorrador() específico
```

Guardado de artículo contextual:

```text
→ preguntar retorno
→ si No: permanecer en Artículos
→ si Sí: volver al idPedido origen con idArticulo
```

Retorno:

```text
getPedidoArticuloById(idArticulo)
→ addPurchaseOrderArticles()
→ nuevo: unidades 0 + focusUnits
→ duplicado: no duplicar + focusUnits existente
```

La línea retornada hace el Pedido dirty correctamente.

Pedido recepcionado:

```text
Localizador + botón + + buscador
→ no se renderizan
```

No mantenerlos simplemente deshabilitados.

# 51. 16.9 — PDFs ✅ CERRADO

`16.9` está completamente implementado, probado funcionalmente y cerrado.

## 51.1 16.9A — Lectura ✅

```text
pedido_archivo + archivo
→ TypeOrmPedidosRepository.getPedidoArchivos()
→ PedidosService
→ IPC/preload
→ ComprasService.getPedidoArchivos()
```

Solo PDFs activos `order_document`; rutas internas no se exponen al renderer.

## 51.2 16.9B — Adjuntar + almacenamiento ✅

`PedidoArchivosService` coordina:

```text
ElectronPedidoArchivoDialog
PedidoArchivoStorage
PedidoArchivosRepository
```

`FilePedidoArchivoStorage`:

```text
máximo 100 MB
firma %PDF-
SHA-256 streaming
files/orders/<archivoPublicId>.pdf
```

Persistencia lógica:

```text
archivo
+ pedido_archivo
```

Si SQLite falla después de copiar, se limpia el fichero físico recién creado.

## 51.3 16.9C — Panel renderer ✅

Existe `PurchaseOrderFilesComponent` en el footer de Pedido.

```text
nombre
 tipo
tamaño
Adjuntar PDF
```

Un Pedido nuevo sin ID no muestra todavía el panel.

Adjuntar requiere Pedido persistido + limpio; funciona también en recepcionados.

## 51.4 16.9D — Abrir + eliminar ✅

Abrir:

```text
idPedido + idPedidoArchivo
→ validar pertenencia exacta
→ resolver archivoPublicId
→ shell.openPath(ruta gestionada)
```

`ENOENT` se normaliza a un error funcional y no se filtra la ruta local.

Eliminar:

```text
confirmación renderer
→ DELETE pedido_archivo
→ contar otras referencias al mismo archivo
```

Con referencias restantes:

```text
→ conservar archivo y PDF físico
```

Sin referencias:

```text
→ soft-delete archivo
→ COMMIT
→ borrar PDF físico de forma best-effort
```

Este diseño protege archivos legacy compartidos.

Los PDFs no forman parte del dirty state porque adjuntar/eliminar persiste inmediatamente.

`16.9` no debe reabrirse salvo regresión real.

# 52. 16.10 — Recepción atómica ⬅️ SIGUIENTE

Este es el próximo hito activo y el primero que aplicará efectos canónicos sobre Artículos.

No comenzar por el botón/UI. Primero diseñar y probar la operación backend atómica.

## 52.1 Precondiciones conocidas

```text
Pedido existente
Pedido todavía pendiente
Proveedor válido
líneas > 0
TODAS las líneas con unidades > 0
artículos vinculados válidos/activos
nuevos códigos adicionales válidos y globalmente únicos
```

Cualquier dato que pueda haber cambiado desde que se cargó el Pedido debe releerse/validarse dentro de la transacción.

## 52.2 Efectos atómicos acordados

Dentro de una única transacción:

```text
1. bloquear/validar estado actual del Pedido según permita SQLite/arquitectura vigente
2. releer artículos canónicos de todas las líneas
3. validar que el Pedido sigue pendiente
4. validar unidades y consistencia de líneas
5. validar unicidad de códigos adicionales pendientes
6. capturar stock previo real
7. stock final = stock previo + unidades
8. actualizar stock canónico
9. actualizar PALB canónico
10. actualizar PUC canónico
11. actualizar PVP canónico
12. crear código adicional canónico si procede
13. crear histórico_articulo tipo PEDIDO = 3 por los cambios requeridos
14. enlazar histórico con id_pedido
15. fijar stock_actual_snapshot de cada línea
16. fijar stock_final_snapshot de cada línea
17. fijar fecha_recepcionado real
18. marcar Pedido como recepcionado
19. COMMIT
```

Ante cualquier fallo:

```text
ROLLBACK completo
```

No debe existir stock, precios, barcode, histórico o snapshots parcialmente aplicados.

## 52.3 Reglas que no deben cambiar

```text
Guardar borrador
→ NO stock
→ NO precios canónicos
→ NO barcode canónico
→ NO histórico PEDIDO

Recepcionar
→ único punto de aplicación canónica
```

`Abono` no altera esta semántica; sigue siendo un tipo documental informativo.

La recepción no debe inventar stock histórico a partir de valores visuales del renderer: los snapshots se construyen con el artículo canónico releído en la transacción.

## 52.4 Orden recomendado de trabajo

Antes del primer patch revisar `main` actual de:

```text
TypeOrmPedidosRepository
schema pedido / linea_pedido
schema articulo / codigo_barras
historico_articulo y sus writers actuales
constantes de tipo histórico
servicios/repositorios de Artículos
fixtures TypeORM de Compras/Artículos
```

Dividir `16.10` al menos conceptualmente en:

```text
16.10A contrato + validaciones/backend base
16.10B transacción TypeORM completa + rollback tests
16.10C IPC/preload/renderer + confirmación Recepcionar
16.10D regresión cross-layer y casos límite
```

Los nombres exactos pueden ajustarse tras revisar `main`; lo importante es no mezclar toda la recepción en un único bloque.

# 53. 16.11 — Pedido recepcionado

Implementar modo histórico:

```text
líneas readonly
stock snapshot
stock final snapshot
economía congelada
R.E. congelado
```

Permitir editar únicamente información no económica acordada.

Guardar después de recepción:

```text
sin efectos secundarios sobre artículos/históricos
```

---

# 54. 16.12 — Regresión integral de Pedidos

Antes de cerrar Pedidos:

## Datos legacy

Comparar pedidos importados reales con TPV antiguo.

## Listados

```text
guardados
recepcionados
filtros
paginación
workspace
UE
observaciones
```

## Borrador

```text
crear
guardar
cerrar/reabrir
líneas 0
sin efectos canónicos
```

## Líneas

```text
buscar
duplicado
orden
columnas
código adicional
precios
```

## Economía

```text
descuento línea
descuento global
varios IVA
RE
portes
UE
media margen legacy
totales
```

## Navegación

```text
dirty guard
crear Artículo
retorno
```

## PDFs

```text
añadir
abrir
eliminar
persistencia física
```

## Recepción

```text
confirmación
validación
transacción
stock
precios
histórico
snapshots
rollback
```

## Recepcionado

```text
readonly económico
edición informativa
reabrir posteriormente
no tocar stock de nuevo
```

Solo entonces:

```text
Pedidos ✅ CERRADO
```

---

# 55. 16.13 — Marcas

No desarrollar antes de cerrar Pedidos.

Cuando llegue el momento:

```text
usuario explica comportamiento legacy/objetivo
→ revisar código antiguo si aporta contexto
→ cerrar contrato
→ diseñar mini-plan
→ implementar
```

Hasta entonces:

```text
placeholder
```

---

# 56. 16.14 — Proveedores

Misma regla que Marcas.

No inventar todavía el contrato funcional.

Hasta entonces:

```text
placeholder
```

---

# 57. Convenciones arquitectónicas resultantes

## 57.1 Compartido vs privado

```text
global y estable
→ constants / utils

compartido dentro de dominio
→ shared/domain

exclusivo de consumidor
→ *.private.ts

estado/comportamiento de instancia
→ clase
```

Una constante SQL extensa exclusiva de un repository es un candidato claro a `.private.ts`.

## 57.2 Subdominios

Crear carpeta propia cuando existe un subdominio reconocible con varias piezas.

No crear una carpeta por archivo.

Las fachadas comunes pueden permanecer en la raíz.

## 57.3 Backend

Patrón de referencia:

```text
FeatureService
→ FeatureRepository
→ TypeOrmFeatureRepository
```

Servicios secundarios:

```text
→ providers estrechos
```

## 57.4 Composition root

No dividir `application-composition.ts` solo por longitud.

Su responsabilidad es mostrar el grafo de dependencias.

## 57.5 Renderer state

```text
datos canónicos
→ backend / SQLite

estado visual de sesión
→ workspace Angular

estado efímero
→ componente
```

## 57.6 Imports internos

```text
si el módulo pertenece al proyecto
→ usar alias absoluto

aunque origen y destino estén en la misma carpeta
→ seguir usando alias
```

El orden textual de imports no forma parte del patch: VSCode/Prettier lo normalizan.

## 57.7 Hotspots

Antes de extraer:

```text
¿hay una responsabilidad con nombre propio?
```

Si no, el tamaño no basta.

## 57.8 Bloques de implementación

Preferencia consolidada:

```text
bloque más pequeño
+
completo
>
mega-bloque con piezas implícitas
```

Completo significa incluir, cuando proceda:

```text
interfaces
implementación
imports
JSDoc
fakes/mocks
tests
fixtures
IPC/preload
compilación afectada
```

# 58. Decisiones que no deben revertirse


- Imports internos del proyecto: usar siempre alias absolutos; no introducir imports relativos aunque los archivos estén en la misma carpeta.
- Cuando se soliciten imports, proporcionar todos los imports necesarios, pero no indicar su posición/orden físico porque VSCode/Prettier lo normalizan.
- Todo método TS/JS nuevo lleva JSDoc.
- Si una interfaz cambia, adaptar en el mismo bloque todos los fakes/mocks/specs necesarios para que compile.
- Si se anuncian casos de test, entregar su código; no dejar la implementación del test implícita.
- Preferir bloques pequeños pero completos.
- Constantes/mapas/fragmentos SQL exclusivos de una clase y con entidad propia pueden ir a su `.private.ts`; `PEDIDO_ARTICULO_SELECT` es precedente explícito.
- Fechas de la aplicación: usar `input type="date"` nativo con valor `YYYY-MM-DD`; no introducir `MatDatepicker` como patrón general.
- No envolver fechas nativas en `mat-form-field` únicamente por apariencia.
- Dinero/decimales/porcentajes: preferir `type="text" + inputmode="decimal"` cuando necesitemos parsing/formato europeo.
- Mantener apariencia compartida en `controls.scss` y layout/ancho en cada componente.
- No crear componentes Angular triviales únicamente para envolver controles nativos.
- No usar `Router.getCurrentNavigation()`; usar `Router.currentNavigation()` signal.
- No reabrir Hito 15 por ajustes de Compras.
- No reabrir la pausa REF ni CTRL por refactors oportunistas.
- No volver a crear `AlmacenService` backend agregado.
- No volver a crear `AlmacenRepository`.
- No volver a crear `TypeOrmAlmacenRepository`.
- No hacer `*.private.ts` obligatorio.
- No mover métodos a `.private.ts` solo por tamaño.
- No persistir estado visual de sesión en SQLite sin necesidad.
- No mantener pedidos dirty mediante autosave silencioso.
- No modificar artículos reales al guardar un pedido pendiente.
- No permitir recepción si alguna línea tiene `unidades = 0`.
- No permitir líneas duplicadas del mismo artículo dentro del pedido; dirigir a la existente y enfocar Unidades.
- Una línea nueva de Pedido empieza siempre con `unidades = 0`.
- El buscador de Pedido debe mantener la UX común con Ventas/Artículos: Enter resuelve código; comenzar a escribir abre `ArticleSearchComponent`.
- `ArticleSearchComponent` se comparte ahora entre Ventas, Artículos y Pedidos; no crear otro modal de búsqueda paralelo para Compras sin una necesidad real.
- En contexto Pedidos, el modal devuelve `PedidoArticuloInterface` y admite selección múltiple.
- No volver a resolver por localizador un `PedidoArticuloInterface` ya seleccionado en el modal.
- El `key` de `PurchaseOrderLineState` es identidad de renderer, no dato persistente de dominio.
- Reordenar/eliminar líneas en borrador normaliza `orden`; no imponer `UNIQUE(id_pedido, orden)` por posibles colisiones temporales.
- Un código adicional escrito en un pedido pendiente no se convierte en código canónico hasta Recepcionar.
- Si el artículo ya tiene código adicional activo, Compras no permite introducir otro desde la línea.
- No reinterpretar `Abono` como devolución: es tipo documental.
- No reinterpretar `metodo_pago` legacy como ID de `tipo_pago`.
- `forma_pago` de Pedido es snapshot histórico; no destruirlo por renombrar el catálogo.
- La precisión económica canónica de líneas se mantiene en enteros escalados: microeuros, basis points y microporcentaje.
- No reducir la precisión interna porque la UI muestre dos decimales.
- PUC y Total se presentan actualmente con dos decimales; su valor interno conserva microeuros.
- PALB y PVP editables pueden conservar hasta seis decimales internos; Descuento hasta dos decimales porcentuales.
- Las fórmulas unitarias de línea viven en `PurchaseOrderLineCalculator`; no duplicarlas en componentes/templates.
- IVA y RE son parejas fiscales construidas desde `appData.ivaList` y `appData.reList` por posición.
- Cambiar IVA selecciona su RE; cambiar RE selecciona su IVA cuando existe pareja configurada.
- Con R.E. desactivado, el RE se conserva en la línea pero no participa en el PUC.
- Al activar R.E., una línea legacy con IVA conocido puede recuperar el RE configurado correspondiente.
- Los valores fiscales históricos que ya no están en AppData deben seguir pudiendo mostrarse; no destruirlos.
- Para selects nativos cuyo valor cambia reactivamente por otra selección, usar selección explícita por `<option [selected]>` cuando sea necesario; es precedente consolidado en cabecera de Pedido e IVA/RE.
- No hacer que `UE` elimine IVA/RE del PUC legacy.
- No sustituir `Media margen` legacy por una media simple.
- No aplicar descuento global a portes.
- No incluir portes/descuento global en `Total beneficios`.
- No permitir modificar R.E. después de recepcionar.
- No releer stock actual para sustituir snapshots de un pedido recepcionado.
- Para recepcionados legacy sin snapshot de stock, devolver `NULL`; no inventar historia.
- No volver a aplicar stock/precios al editar información de un pedido recepcionado.
- No diseñar Marcas/Proveedores antes de cerrar su contrato funcional.
- No tocar TicketBAI 12C.9 sin información de Berein.
- No bloquear el proyecto por la prueba física Star.
- `16.5`, `16.6` y `16.7` están cerrados; no reabrirlos por refactors oportunistas.
- Guardar Pedido pendiente persiste cabecera + líneas + economía global atómicamente, pero sigue sin producir efectos canónicos sobre Artículos.
- Las líneas nuevas persistidas toman snapshot de nombre, conservan snapshots de stock en `NULL` y obtienen su identidad SQLite al releer tras Guardar.
- Las observaciones de artículo en líneas de Pedido se presentan con `info_outline` + tooltip; no usar alertas/dialogs y no persistir la observación en `linea_pedido`.
- El `<td>` de Descripción debe conservar semántica de celda de tabla; usar contenedor interior flex para texto + icono.
- `Subtotal` por línea es columna base siempre visible y se calcula en `PurchaseOrderTotalsCalculator`, no en el template.
- El descuento global modifica las bases/subtotales/factura, pero nunca el PUC unitario almacenado/calculado.
- `pedido.importe_micros`, `portes_micros` y `descuento_bps` son economía global persistida del borrador y quedan congelados al recepcionar.
- `PurchaseOrderTotalsCalculator` es la fuente única de agregados globales; no duplicar fórmulas en componentes.
- El bloque Totales no usa separadores horizontales internos; Portes/Descuento usan suffix visual dentro del input.
- Dirty state se deriva de una fingerprint persistible normalizada; no introducir `markDirty()` manual disperso salvo cambio de diseño justificado.
- `pendingChangesGuard` protege ambas rutas de Pedido y `beforeunload` protege cerrar/recargar.
- Para el retorno Artículos → Pedido usar `getPedidoArticuloById(idArticulo)`; no resolver el artículo recién creado por localizador.
- El flujo `16.8B` solo debe salir desde un Pedido guardado y limpio; no transportar un borrador dirty oculto a Artículos.

- `16.8` y `16.9` están cerrados; no reabrirlos salvo regresión real.
- El flujo Pedido → Artículos solo sale desde un Pedido persistido, limpio y pendiente; el retorno transporta `idPedido` + `idArticulo` explícitos.
- En un Pedido recepcionado la zona Localizador + alta de artículo no se renderiza; no mostrarla permanentemente deshabilitada.
- Los PDFs de Pedido usan almacenamiento gestionado `files/orders/<archivoPublicId>.pdf`; no conservar ni exponer la ruta original elegida por el usuario.
- Un PDF de Pedido nuevo debe validar tamaño máximo 100 MB, firma `%PDF-` y SHA-256 antes de registrar su relación.
- El renderer no recibe `relative_path`, `internal_name`, `id_archivo` ni rutas absolutas de PDFs.
- Los adjuntos no forman parte del dirty fingerprint: adjuntar, abrir y eliminar son operaciones inmediatas e independientes del Guardar del Pedido.
- Los PDFs siguen siendo gestionables después de recepcionar.
- No asumir que `pedido_archivo` es propietario exclusivo de `archivo`: archivos legacy pueden estar compartidos.
- Al eliminar una relación PDF, conservar archivo/fichero si quedan referencias; solo soft-delete `archivo` y borrar físicamente cuando queda huérfano.
- Abrir un PDF debe validar pertenencia exacta mediante `idPedido + idPedidoArchivo`; no aceptar un ID de relación de otro Pedido.
- Un `ENOENT` al abrir PDF debe convertirse en error funcional y no filtrar la ruta local.
- `16.10` es el único siguiente punto: no saltar a `16.11`, Marcas o Proveedores antes de cerrar la recepción atómica.

# 59. Pendientes externos/no bloqueantes

```text
TicketBAI 12C.9
→ bloqueado por Berein

Star TSP100/TSP143
→ prueba física pendiente

Imprenta
→ calibración física A4/etiquetas futura
```

---

# 60. Cómo retomar

En una conversación nueva:

1. usar este documento como continuidad principal;
2. revisar siempre `main` actual antes de proponer cambios; si GitHub Raw parece stale, usar una URL con parámetro `nocache` o pedir solo el archivo concreto si sigue habiendo duda;
3. confirmar que:
   - Hitos 13, 14 y 15 están cerrados;
   - REF está cerrada;
   - CTRL está cerrada;
   - `16.1–16.9` están cerrados;
4. no reimplementar ni reabrir esos bloques;
5. continuar exactamente con:

```text
16.10 — Recepción atómica
```

6. **antes de proponer el primer patch**, revisar el `main` actual de:

```text
TypeOrmPedidosRepository
PedidosService / repository contracts
schema pedido / linea_pedido
schema articulo / codigo_barras
historico_articulo
writers actuales de Artículos e históricos
constantes de tipo histórico PEDIDO = 3
fixtures/specs TypeORM relacionados
```

7. no empezar por la UI de Recepcionar;
8. definir primero un contrato/backend de recepción que pueda probarse sin renderer;
9. mantener toda mutación canónica dentro de una única transacción;
10. releer artículos/stock dentro de la transacción y no confiar en el stock mostrado al abrir la ficha;
11. validar de nuevo códigos adicionales pendientes contra unicidad global;
12. exigir todas las líneas con unidades > 0;
13. fijar snapshots de stock previo/final desde los valores canónicos de la recepción real;
14. crear histórico `PEDIDO = 3` enlazado al `id_pedido`;
15. actualizar stock + PALB + PUC + PVP canónicos únicamente al recepcionar;
16. cualquier error debe producir rollback integral;
17. después de cerrar backend/transacción, añadir IPC/preload/renderer y confirmación de Recepcionar;
18. mantener dirty/navigation guard actual; no crear autosave ni bypass general;
19. PDFs son independientes de la recepción y deben seguir gestionables en recepcionados;
20. todos los imports internos nuevos deben usar alias absolutos;
21. si se amplía una interfaz, adaptar en el mismo bloque fakes/mocks/specs;
22. todo método nuevo debe llevar JSDoc;
23. no dejar tests descritos sin código;
24. esperar tests + confirmación tras cada mini-hito;
25. después de `16.10`, continuar con `16.11 — Pedido recepcionado` y luego `16.12 — Regresión integral de Pedidos`;
26. no tocar Marcas/Proveedores hasta cerrar Pedidos;
27. no tocar TicketBAI `12C.9` sin información nueva de Berein.

# 61. Resumen ultracorto

```text
Proyecto: Osumi TPV Client
Continuidad: 13/09/2026
Base: v2.56 + main

Hito 13 Artículos ✅
Hito 14 Clientes ✅
Hito 15 Almacén ✅
REF ✅
CTRL controles ✅

TicketBAI ordinario ✅
TicketBAI devoluciones/mixtas ⏸️ Berein

Hito 16 Compras 🟦

16.1 Base + históricos ✅
16.2 Backend listados ✅
16.3 UI listados ✅
16.4 Cabecera Pedido ✅
16.5 Líneas/búsqueda ✅ CERRADO
16.6 Motor económico global ✅ CERRADO
16.7 Dirty/navigation ✅ CERRADO
16.8 Pedido ↔ Artículos ✅ CERRADO
16.9 PDFs ✅ CERRADO
16.10 Recepción atómica ⬅️ SIGUIENTE
16.11 Pedido recepcionado ⬜
16.12 Regresión Pedidos ⬜
16.13 Marcas ⬜
16.14 Proveedores ⬜

16.8 cerrado incluye:
→ getPedidoArticuloById() end-to-end
→ contexto explícito idPedido/idArticulo
→ + solo Pedido persistido + limpio + pendiente
→ crear borrador nuevo en Artículos
→ preguntar retorno tras Guardar
→ volver al Pedido original
→ añadir por ID, unidades 0, focusUnits
→ duplicado no duplica
→ recepcionado oculta Localizador + alta artículo

16.9 cerrado incluye:
→ getPedidoArchivos() end-to-end
→ PedidoArchivoInterface sin rutas internas
→ selector nativo PDF
→ máximo 100 MB
→ firma %PDF-
→ SHA-256 streaming
→ files/orders/<publicId>.pdf
→ archivo + pedido_archivo
→ limpieza física si falla alta SQLite
→ panel PDFs junto a Totales
→ adjuntar también en recepcionados
→ shell.openPath para abrir
→ ENOENT normalizado
→ confirmación de borrado
→ PDFs compartidos preservados mientras tengan referencias
→ archivo soft-delete + fichero físico solo al quedar huérfano
→ PDFs no forman parte del dirty state

SIGUIENTE 16.10:
Recepción atómica
→ validar Pedido pendiente + proveedor
→ líneas > 0
→ TODAS unidades > 0
→ releer artículos canónicos
→ validar códigos adicionales
→ snapshot stock previo
→ sumar stock
→ aplicar PALB/PUC/PVP canónicos
→ crear barcode adicional canónico
→ histórico PEDIDO = 3 + id_pedido
→ snapshot stock final
→ fecha_recepcionado real
→ marcar recepcionado
→ COMMIT
→ cualquier fallo = ROLLBACK total

Después:
→ 16.11 Pedido recepcionado
→ 16.12 Regresión Pedidos
→ 16.13 Marcas
→ 16.14 Proveedores

Reglas clave:
→ revisar main antes de cada patch
→ bloques pequeños pero completos
→ imports internos por alias absoluto
→ JSDoc en métodos nuevos
→ interfaces implican fakes/mocks/specs
→ tests siempre con código
→ Guardar borrador ≠ Recepcionar
→ PurchaseOrderLineCalculator = economía unitaria
→ PurchaseOrderTotalsCalculator = economía global
→ precisión interna en enteros escalados/BigInt
→ observaciones con tooltip, no alert
→ dirty por fingerprint, no booleanos manuales
→ retorno de artículo por ID, no localizador
→ PDFs gestionados, sin rutas renderer
→ recepción = único punto de efectos canónicos
→ test + build + lint + prueba funcional
→ confirmación
→ siguiente
```
