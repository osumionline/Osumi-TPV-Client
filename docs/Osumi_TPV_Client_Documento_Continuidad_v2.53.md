# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.53  
**Fecha:** 11 de septiembre de 2026  
**Base de continuidad:** `v2.53 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.52.md`

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

16 Compras                                        🟦 EN DESARROLLO
  16.1 Base de Compras + históricos               ✅
  16.2 Backend listados de Pedidos                ✅
  16.3 Pantalla principal de Pedidos              ✅

  CTRL Normalización controles pre-16.4           ✅ CERRADA
    CTRL.1 Primera pasada global                  ✅
    CTRL.2 Segunda pasada Artículos               ✅

  16.4 Ficha Pedido: cabecera + persistencia      ✅ CERRADO

  16.5 Líneas + buscador de artículos             🟦 EN DESARROLLO
    16.5A.1 Schema líneas + snapshots stock       ✅
    16.5A.2 Lectura backend de líneas             ✅
    16.5A.3 Resolución/búsqueda artículos          🟦
      16.5A.3.1 Repository TypeORM                ✅
      16.5A.3.2 Service + API/IPC/preload         ⬅️ SIGUIENTE

  16.6 Motor económico                            ⬜
  16.7 Dirty state + navegación segura            ⬜
  16.8 Integración Pedido → Artículos             ⬜
  16.9 PDFs                                       ⬜
  16.10 Recepción atómica                         ⬜
  16.11 Pedido recepcionado                       ⬜
  16.12 Regresión integral de Pedidos             ⬜
  16.13 Marcas                                    ⬜
  16.14 Proveedores                               ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

El **Hito 15 — Almacén**, la pausa técnica REF y la normalización CTRL están cerrados. No reabrirlos por ajustes de Compras salvo regresión real.

# 2. Punto exacto de continuación

Están cerrados y validados:

```text
16.1
16.2
16.3
CTRL.1
CTRL.2
16.4
16.5A.1
16.5A.2
16.5A.3.1
```

El siguiente punto exacto es:

```text
16.5A.3.2 — Application Service + contrato público
             + ComprasApi + IPC + preload + fachada Angular
```

Objetivo:

```text
exponer al renderer la resolución exacta de artículos
+
exponer búsqueda libre de artículos
+
normalizar entrada en PedidosService
+
añadir tests completos de service/fakes
+
mantener toda la cadena tipada
```

Todavía NO implementar en este paso:

```text
tabla editable de líneas
persistencia de líneas
autofocus del buscador
duplicados/foco Unidades
recepción
motor económico
```

Estado ya disponible en Repository:

```text
resolvePedidoArticulo()
→ prioridad:
   acceso directo
   localizador
   código de barras activo

searchPedidoArticulos()
→ búsqueda por slug normalizado
```

El record recuperado contiene:

```text
id/publicId
localizador
nombre
referencia
marca
stock
PALB
PUC
PVP en microeuros
margen
IVA
RE
existencia de código adicional
observaciones
flag mostrar observaciones en Pedidos
```

Importante:

```text
PEDIDO_ARTICULO_SELECT
→ está en typeorm-pedidos.repository.private.ts
→ NO dentro de la clase repository
```

Después de validar `16.5A.3.2`, volver a revisar `main` y decidir el siguiente bloque pequeño de `16.5`.

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
Eliminar
Guardar
```

`Eliminar`:

```text
solo pedido guardado todavía no recepcionado
→ pedir confirmación
```

Pedido recepcionado:

```text
no se puede eliminar desde este flujo
```

---

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

El resto se considera base/obligatorio salvo que durante la implementación el diseño final requiera un pequeño ajuste acordado.

## 22.2 Persistencia

Las columnas visibles/ocultas se guardan con el pedido.

No son una preferencia global de usuario.

---

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

Debajo de la tabla:

```text
campo Localizador / búsqueda
+
icono añadir artículo
```

Comportamiento análogo a Ventas/Artículos:

```text
localizador
acceso directo
escritura libre
→ búsqueda de artículos
```

Al entrar en la ficha editable:

```text
→ foco por defecto en este campo
```

La solución de autofocus debe respetar el ciclo de render real de Angular/Material y evitar repetir el problema visual corregido en Imprenta.

---

# 25. Datos de cada línea

## 25.1 Localizador

Identidad/localizador del artículo.

## 25.2 Descripción

Nombre/descripción del artículo.

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

Bloque inferior:

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
Recepcionar
```

## 31.1 Total líneas

```text
número de líneas del pedido
```

## 31.2 Total artículos

```text
Σ unidades
```

## 31.3 Total beneficios

Mantener:

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

Mantener la lógica anterior para evitar diferencias visibles entre TPV antiguo y nuevo:

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

Esta decisión sustituye la primera idea de usar media aritmética simple.

## 31.6 Subtotal

Debe reflejar la base económica correspondiente según descuentos y portes conforme al motor económico definitivo.

## 31.7 IVA / RE

Mostrar desglose por tipos.

## 31.8 Descuento global

Campo porcentual.

Se aplica sobre las líneas, no sobre portes.

## 31.9 Total factura

```text
bases de líneas tras descuento global
+ portes
+ IVA
+ RE
```

## 31.10 Total sin IVA

Solo se muestra si `UE = true`.

Mantener paridad visual/numérica legacy.

---

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

No conservar silenciosamente un pedido dirty como workspace completo.

Si el usuario intenta abandonar una ficha con cambios no guardados:

```text
¡Atención, tienes cambios sin guardar!
En caso de que salgas se perderán,
¿quieres continuar?
```

Debe cubrir:

```text
botón volver
header a Ventas
header a Artículos
header a Clientes
header a Almacén
header a Caja
Configuración
cualquier otra navegación real fuera del pedido
```

Si acepta:

```text
→ descartar cambios no guardados
→ navegar
```

Si cancela:

```text
→ permanecer en Pedido
```

El guard debe detectar diferencias reales respecto al snapshot persistido.

No marcar dirty por simples relecturas o normalizaciones equivalentes.

---

# 34. Pedido → crear nuevo Artículo

Junto al buscador/localizador:

```text
icono +
→ crear artículo
```

Regla:

```text
antes de salir
→ pedido debe estar guardado
```

No transportar un pedido dirty oculto a Artículos.

Flujo acordado:

```text
Pedido guardado
→ crear nuevo Artículo
→ abrir ficha nueva en Artículos
→ usuario guarda el artículo

después de guardar:
“¿Quieres volver al pedido 123 y añadir este artículo recién creado?”
```

Si acepta:

```text
→ volver a /compras/pedido/123
→ cargar pedido persistido
→ añadir artículo recién creado
→ unidades = 0
→ enfocar Unidades
```

Si rechaza:

```text
→ permanecer en Artículos
```

Implementar mediante un contexto de retorno explícito de sesión/navegación.

No copiar literalmente mecanismos temporales del TPV antiguo si la arquitectura actual permite una solución más limpia.

---

# 35. PDFs de Pedido

Parte inferior:

```text
PDFs
→ Adjuntar PDF
→ listado
→ abrir/previsualizar
→ eliminar
```

Casos típicos:

```text
albarán recibido por email
factura
documentación original del proveedor
```

## 35.1 Persistencia

La base de datos guarda referencia/metadatos.

El archivo debe persistirse físicamente en almacenamiento controlado por Electron.

No depender de la ruta original elegida por el usuario.

## 35.2 Eliminación

Eliminar:

```text
→ pedir confirmación
→ eliminar relación
→ borrar físicamente cuando corresponda
```

Evitar dejar archivos huérfanos.

## 35.3 Pedido recepcionado

Los PDFs siguen siendo editables:

```text
se pueden añadir
se pueden eliminar
```

porque son documentación/información, no valores económicos ni de stock.

---

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

Existe trabajo previo del esquema/importación `.otpv` y ya ha sido ampliado durante `16.4` y `16.5`.

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

Esta separación protege datos históricos y evita reinterpretar índices del TPV antiguo.

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
→ snapshots pueden ser NULL
→ Stock actual se relee del artículo canónico
→ Stock final = stock canónico + unidades

recepcionado nuevo
→ usar stock_actual_snapshot
→ usar stock_final_snapshot

recepcionado legacy sin snapshots
→ NULL
→ NO inventar valores usando stock actual
```

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
16.2  Backend listados                           ✅
16.3  UI listados                                ✅

CTRL.1 Controles globales                         ✅
CTRL.2 Artículos / quick creates                  ✅

16.4  Cabecera/persistencia Pedido                ✅

16.5  Líneas/búsqueda                             🟦
  16.5A.1 Schema orden + snapshots stock          ✅
  16.5A.2 Lectura backend líneas                  ✅
  16.5A.3 Resolución/búsqueda artículos           🟦
    16.5A.3.1 TypeORM                             ✅
    16.5A.3.2 Service + API/IPC/preload            ⬅️

16.6  Motor económico                             ⬜
16.7  Dirty/navigation guard                      ⬜
16.8  Integración con Artículos                   ⬜
16.9  PDFs                                        ⬜
16.10 Recepción atómica                           ⬜
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

Guardar:

```text
construye PedidoSaveCommand
→ backend valida
→ persiste
→ renderer relee getPedido()
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

## 46.8 Aún pendiente fuera de 16.4

No confundir la cabecera ya cerrada con funcionalidades posteriores:

```text
líneas
buscador artículos
motor económico
dirty/navigation guard
Pedido → Artículos
PDFs
recepción
```

# 47. 16.5 — Líneas + buscador de artículos 🟦 EN DESARROLLO

Objetivo funcional completo de `16.5`:

- búsqueda por localizador;
- acceso directo;
- búsqueda libre;
- autofocus;
- añadir línea con unidades `0`;
- evitar duplicados;
- enfocar `Unidades` si ya existe;
- columnas configurables;
- orden;
- eliminación;
- stock actual/final;
- snapshots editables de PALB/PUC/PVP;
- código adicional pendiente;
- persistencia de líneas.

No recepcionar todavía en `16.5`.

## 47.1 16.5A.1 — Schema líneas + snapshots stock ✅

Añadido a `linea_pedido`:

```text
orden INTEGER
stock_actual_snapshot INTEGER NULL
stock_final_snapshot INTEGER NULL
```

Índice:

```text
(id_pedido, orden, id)
```

No usar `UNIQUE(id_pedido, orden)`.

Importación legacy:

```text
orden
→ reconstruido establemente por pedido

stock_actual_snapshot
stock_final_snapshot
→ NULL
```

Razón:

```text
TPV antiguo no guardaba esos stocks
→ no inventar historia
```

## 47.2 16.5A.2 — Lectura backend de líneas ✅

Cadena completa:

```text
SQLite
→ TypeOrmPedidosRepository.getPedidoLineas()
→ PedidosService
→ ComprasApi
→ IPC
→ preload
→ ComprasService renderer
```

Contrato público:

```text
PedidoLineaInterface
```

Reglas de stock:

```text
PENDIENTE
stockActual
→ articulo.stock actual

stockFinal
→ articulo.stock + unidades

RECEPCIONADO NUEVO
stockActual
→ stock_actual_snapshot

stockFinal
→ stock_final_snapshot

RECEPCIONADO LEGACY SIN SNAPSHOTS
→ NULL / NULL
→ nunca sustituir por stock actual
```

Datos de línea:

```text
nombreArticulo
→ snapshot persistido en linea_pedido

localizador
referencia
marca
→ datos actuales del artículo vinculado si sigue existiendo
```

Orden:

```text
ORDER BY orden, id
```

Tests cubren:

```text
pendiente ignora snapshots accidentales y usa stock canónico
recepcionado usa snapshots
legacy sin vínculo/snapshot devuelve NULL
```

## 47.3 16.5A.3.1 — Repository resolución/búsqueda artículos ✅

Existe:

```text
PedidoArticuloRecord
```

Métodos de `PedidosRepository` / `TypeOrmPedidosRepository`:

```text
resolvePedidoArticulo(codigo, codigoNumerico)
searchPedidoArticulos(searchPattern)
```

Resolución exacta:

```text
si código numérico:
1. acceso_directo
2. localizador
3. código de barras activo

si no numérico:
→ código de barras activo
```

Búsqueda libre:

```text
articulo.slug LIKE pattern
→ solo artículos activos
→ orden nombre NOCASE, id
```

Datos devueltos:

```text
id
publicId
localizador
nombre
referencia
marcaNombre
stock
palbMicros
pucMicros
pvpMicros
margenMicroporcentaje
ivaBps
recargoEquivalenciaBps
tieneCodigoBarrasAdicional
observaciones
mostrarObservacionesPedidos
```

PVP canónico:

```text
articulo.pvp_cents
→ convertido a microeuros para línea de Pedido
```

Códigos adicionales:

```text
solo cuenta código_barras
por_defecto = 0
AND deleted_at IS NULL
```

Observaciones:

```text
se recupera texto
+
mostrar_observaciones_pedidos
```

Decisión estructural:

```text
PEDIDO_ARTICULO_SELECT
→ typeorm-pedidos.repository.private.ts
```

No dejar constantes SQL grandes exclusivas de una clase dentro de la clase principal.

## 47.4 16.5A.3.2 — SIGUIENTE

Implementar de forma completa:

```text
contrato público de artículo para Pedido
PedidosService:
  resolución exacta
  búsqueda libre
  normalización/validación de entrada

FakePedidosRepository actualizado
tests completos PedidosService

ComprasApi
IPC channel + handler
preload
ComprasService renderer
```

Regla de trabajo:

```text
si se amplía PedidosRepository/ComprasApi
→ adaptar en el mismo bloque TODOS los fakes/mocks afectados
```

Todos los imports internos nuevos:

```text
→ alias absoluto
→ nunca ./archivo
```

Todavía NO crear tabla renderer en este bloque.

## 47.5 Reglas funcionales que siguen vigentes para la futura UI

Nueva línea:

```text
unidades = 0
```

Artículo duplicado:

```text
NO crear segunda línea
→ localizar existente
→ enfocar Unidades
```

Pedido pendiente:

```text
Stock = canónico actual
Stock final = Stock + unidades
```

Pedido recepcionado:

```text
usar snapshots
→ nunca reemplazarlos por stock actual
```

Código adicional:

```text
si artículo no tiene adicional
→ permitir introducir uno pendiente

si ya tiene adicional(es)
→ mostrar indicador
→ no permitir añadir otro desde Compras
```

No hacer canónico ese código hasta Recepción.

# 48. 16.6 — Motor económico

Crear responsabilidad específica para cálculos.

Cubrir con tests exhaustivos:

```text
descuento línea
descuento global
IVA
RE
IVA ↔ RE
R.E. activo/inactivo
PUC
PVP
margen línea
subtotal
totales
varios tipos de IVA
portes
portes + RE
Total beneficios
Total PVP
Media margen legacy
UE
Total sin IVA
redondeos/precisión
```

Contrastar casos reales contra el TPV antiguo.

---

# 49. 16.7 — Dirty state + navegación segura

Implementar detección de dirty contra snapshot persistido.

Bloquear navegación accidental mediante confirmación.

Cubrir:

```text
volver
tabs/header
otras rutas
crear artículo
```

No convertir el workspace en un autosave de pedido.

---

# 50. 16.8 — Integración Pedido → Artículos

Flujo:

```text
pedido guardado
→ +
→ Artículos / nueva ficha
→ guardar artículo
→ preguntar retorno
→ volver + añadir artículo
→ unidades 0
→ foco Unidades
```

Definir contexto de retorno explícito.

No mezclarlo con borradores sin guardar.

---

# 51. 16.9 — PDFs

Implementar:

```text
selección PDF
copia a almacenamiento controlado
referencia DB
listado
apertura
eliminación
limpieza física
```

Debe funcionar en:

```text
pedido pendiente
pedido recepcionado
```

---

# 52. 16.10 — Recepción atómica

Implementar la transacción completa.

Validaciones:

```text
proveedor
líneas > 0
todas unidades > 0
artículos válidos
códigos únicos
```

Efectos:

```text
stock
PALB
PUC
PVP
código adicional
histórico PEDIDO=3
snapshot de stock
fecha recepción
estado recepcionado
```

Todo o nada.

Tests cross-layer obligatorios.

---

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
- No permitir líneas duplicadas del mismo artículo dentro del pedido; dirigir a la existente.
- No reinterpretar `Abono` como devolución: es tipo documental.
- No reinterpretar `metodo_pago` legacy como ID de `tipo_pago`.
- `forma_pago` de Pedido es snapshot histórico; no destruirlo por renombrar el catálogo.
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
2. revisar siempre `main` actual antes de proponer cambios;
3. confirmar que:
   - Hitos 13, 14 y 15 están cerrados;
   - REF está cerrada;
   - CTRL está cerrada;
   - `16.1`, `16.2`, `16.3` y `16.4` están cerrados;
   - `16.5A.1`, `16.5A.2` y `16.5A.3.1` están cerrados;
4. no reimplementar esos bloques;
5. continuar exactamente con:

```text
16.5A.3.2
→ Application Service
→ contrato público
→ ComprasApi
→ IPC
→ preload
→ ComprasService renderer
→ tests completos
```

6. no crear todavía tabla de líneas en ese bloque;
7. todos los imports internos nuevos deben usar alias absolutos;
8. no indicar posición/orden de imports: entregar solo el código exacto necesario;
9. si se amplía una interfaz, adaptar en el mismo bloque fakes/mocks/specs;
10. todo método nuevo debe llevar JSDoc;
11. no dejar tests descritos sin código;
12. mantener `PEDIDO_ARTICULO_SELECT` en `typeorm-pedidos.repository.private.ts`;
13. usar el TPV antiguo solo como referencia funcional/paridad;
14. respetar las decisiones económicas y de compatibilidad de Pedidos;
15. esperar tests + confirmación tras cada bloque;
16. no avanzar a Marcas ni Proveedores antes de cerrar Pedidos.

# 61. Resumen ultracorto

```text
Proyecto: Osumi TPV Client
Continuidad: 11/09/2026
Base: v2.53 + main

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

16.4 incluye:
→ get/save/delete cabecera
→ proveedores y pagos históricos
→ forma_pago snapshot
→ mapping legacy pago 0..4 correcto
→ UI cabecera
→ fechas nativas
→ columnas opcionales
→ Guardar + feedback 4 s
→ Router.currentNavigation()
→ Eliminar pendiente
→ alta rápida Proveedor

16.5 🟦

16.5A.1 ✅
→ linea_pedido.orden
→ stock_actual_snapshot
→ stock_final_snapshot
→ import legacy snapshots NULL

16.5A.2 ✅
→ getPedidoLineas()
→ pendiente usa stock canónico
→ recepcionado usa snapshots
→ legacy sin snapshots devuelve NULL

16.5A.3.1 ✅
→ PedidoArticuloRecord
→ resolvePedidoArticulo()
→ searchPedidoArticulos()
→ acceso directo > localizador > barcode
→ búsqueda por slug
→ PVP cents → micros
→ barcode adicional
→ observaciones Pedidos
→ PEDIDO_ARTICULO_SELECT en .private.ts

SIGUIENTE:
16.5A.3.2
→ service
→ contrato público
→ ComprasApi
→ IPC
→ preload
→ ComprasService
→ tests completos

Convenciones nuevas IMPORTANTES:
→ imports internos SIEMPRE alias absoluto
→ incluso misma carpeta
→ entregar imports exactos
→ no indicar posición/orden de imports
→ VSCode/Prettier los ordenan
→ todo método nuevo con JSDoc
→ bloques pequeños pero completos
→ interfaz nueva/cambiada implica adaptar fakes/mocks/specs
→ tests propuestos deben venir con código
→ constantes/SQL privados con responsabilidad propia → .private.ts

Controles:
→ controls.scss fuente canónica
→ fecha nativa type=date
→ decimal text + inputmode=decimal
→ editor tabla global compacto

Históricos:
1 VENTA
2 VENTA_SYNC
3 PEDIDO
4 ARTICULO
5 INVENTARIO
6 INVENTARIO_ALL
7 CADUCIDAD

Pedidos:
→ pendiente = borrador sin efectos canónicos
→ nueva línea futura unidades 0
→ no duplicados
→ recepción exige todas unidades >0
→ histórico PEDIDO=3
→ recepcionado congela economía/stock
→ R.E. congelado
→ datos informativos siguen editables
→ dirty al salir se implementará en 16.7
→ crear Artículo/retorno se implementará en 16.8

Economía:
→ descuento línea afecta PUC
→ descuento global afecta bases/impuestos de líneas
→ descuento global no altera PUC
→ portes IVA 21 %, RE 5,2 % si aplica
→ portes fuera descuento global
→ Total beneficios solo líneas
→ Media margen fórmula legacy ponderada + portes
→ UE mantiene IVA/RE y PUC
→ UE añade Total sin IVA

Plan restante:
16.5A.3.2 Service/API búsqueda artículos
16.5 resto líneas + buscador/persistencia
16.6 Motor económico
16.7 Dirty/navigation
16.8 Pedido → Artículos
16.9 PDFs
16.10 Recepción
16.11 Recepcionado
16.12 Regresión Pedidos
16.13 Marcas
16.14 Proveedores

Regla clave:
revisar main antes de cada patch
→ bloque pequeño pero completo
→ tests
→ confirmación
→ siguiente.
```
