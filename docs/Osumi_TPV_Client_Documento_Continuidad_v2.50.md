# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.50  
**Fecha:** 10 de septiembre de 2026  
**Base de continuidad:** `v2.50 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.49.md`

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

REF Pausa técnica pre-Hito 16                     🟦 EN DESARROLLO
  REF.1 Constantes y utilidades compartidas       ✅
  REF.2 Convención *.private.ts                   ✅
  REF.3 Reorganización estructural de Almacén     ✅
  REF.4 Backend por subdominio                    ✅
  REF.5 Revisión de hotspots                      ✅
  REF.6 Paridad funcional pre-Compras             🟦
    REF.6A Última venta + cambio                   ✅
    REF.6B Inventario → Artículos + estado sesión ✅
    REF.6C Caducidades → Artículos + estado       ⬅️ SIGUIENTE
    REF.6D Imprenta: autofocus buscador            ⬜
  REF.7 Cierre pausa técnica                      ⬜

16 Compras                                        ⬜ NO INICIADO

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

El **Hito 15 — Almacén** continúa oficialmente cerrado desde el punto de vista funcional. La pausa técnica posterior no reabre el hito: reorganiza arquitectura, extrae responsabilidades reutilizables y recupera pequeños comportamientos del TPV antiguo antes de comenzar Compras.

---

# 2. Punto exacto de continuación

El siguiente mini-hito es:

```text
REF.6C — Caducidades → Artículos + estado de sesión
```

Objetivos ya acordados:

```text
Caducidades
→ nombre de artículo clicable
→ cargar ficha mediante ArticulosService
→ navegar a /articulos

Durante toda la sesión conservar:
→ año
→ mes
→ marca
→ texto/nombre
→ página
→ tamaño de página
```

La sección activa general de Almacén ya queda persistida durante la sesión desde REF.6B. Si el usuario abandona Almacén estando en Caducidades, al volver debe regresar a Caducidades.

Después:

```text
REF.6D — Imprenta
→ cada vez que se entra en la pestaña Imprenta
→ foco inmediato en el buscador
```

Finalmente:

```text
REF.7
→ regresión integral de la pausa técnica
→ revisión final de convenciones
→ documento de continuidad final
→ inicio de Hito 16 — Compras
```

No avanzar a REF.6D ni REF.7 sin confirmación del usuario tras tests y prueba funcional de REF.6C.

---

# 3. Convenciones de trabajo

## 3.1 Angular / TypeScript

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Templates con `@if`, `@for`, `@switch`.
- Todo método TS/JS nuevo lleva JSDoc breve.
- No dejar líneas en blanco innecesarias entre propiedades relacionadas.
- Sí separar visualmente métodos y responsabilidades distintas.

## 3.2 Forma de trabajar

El usuario aplica manualmente los cambios, ejecuta tests/build/lint y sube commits.

El asistente:

- revisa siempre `main` actual antes de proponer cambios;
- no hace commits;
- no abre PR;
- no avanza de mini-hito hasta confirmación explícita;
- archivo nuevo: contenido completo;
- archivo existente: fragmento actual reconocible → fragmento nuevo;
- imports: indicar solo los imports nuevos salvo sustitución necesaria.

## 3.3 Exports

```text
1 export  → default export
>1 export → named exports
```

También se aplica a `*.private.ts`.

## 3.4 Batería habitual

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

---

# 4. SQLite durante desarrollo

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

---

# 5. TicketBAI

## 5.1 Ordinario

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

## 5.2 Devoluciones / ventas mixtas

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️
```

Sigue bloqueado por Berein. No reabrir ni inventar contrato para este punto hasta disponer de información suficiente.

## 5.3 Facturas de cliente

```text
Factura de cliente ≠ operación TicketBAI
```

Crear, editar, emitir, previsualizar, imprimir, enviar o anular una factura de cliente no llama por sí mismo a TicketBAI.

---

# 6. Hitos cerrados relevantes

## 6.1 Hito 13 — Artículos

```text
✅ CERRADO
```

La ficha de Artículos es el destino canónico cuando otros módulos quieren abrir el detalle de un artículo.

Patrón existente en Ventas:

```text
ArticulosService.cargarPorId(idArticulo)
→ si existe/carga correctamente
→ router.navigate(['/articulos'])
```

REF.6B reutiliza este patrón desde Inventario y REF.6C deberá reutilizarlo desde Caducidades.

## 6.2 Hito 14 — Clientes

```text
✅ CERRADO
```

Incluye búsqueda/selección, workspace, formulario, persistencia, ventas, estadísticas, consumo mensual, facturas, editor, emisión, preview, PDF, impresión, email, anulación e integración final con Ventas.

## 6.3 Hito 15 — Almacén

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

# 7. Inventario — estado funcional consolidado

Inventario dispone de filtros por proveedor, marca, categoría exacta, texto y descuento, con paginación SQLite, categorías por artículo, aviso sin ventas en 12 meses y agregados globales del conjunto filtrado.

Columnas:

```text
Localizador
Proveedor
Marca
Referencia
Categoría
Nombre
Stock
Precio albarán
PUC
PVP
Margen
Código de barras
Opciones
```

Ocultas por defecto:

```text
Categoría
Precio albarán
```

`Opciones` no forma parte del selector.

Edición tipo hoja de cálculo:

- stock;
- precio albarán;
- PUC;
- PVP;
- código adicional;
- categorías.

```text
focus → seleccionar contenido

blur / Enter
→ validar
→ confirmar
→ recalcular
→ dirty

Enter
→ avanzar al mismo campo de la siguiente fila
```

Cascadas:

```text
Precio albarán → PUC + margen; no toca PVP
PUC             → Precio albarán + margen; no toca PVP
PVP             → margen
```

Persistencia:

- Guardar fila.
- Guardar todos atómico.
- Stock genera histórico.
- Código adicional con unicidad global.
- Baja lógica.
- Reconciliación con `ArticulosService`.

CSV:

- todas las filas filtradas;
- columnas seleccionadas;
- solo persistido;
- BOM UTF-8;
- `;`;
- coma decimal;
- protección frente a fórmulas.

Impresión:

- snapshot persistido;
- BrowserWindow independiente;
- A4 horizontal;
- diálogo estándar;
- no térmica;
- autorización IPC por `webContents.id`.

---

# 8. Caducidades — estado funcional consolidado

Caducidades es histórico de pérdidas mediante `merma_caducidad`.

Conserva snapshot histórico de artículo, localizador, marca, nombre, unidades, PUC, PVP, fecha de baja y metadatos necesarios.

Tipo de histórico:

```text
CADUCIDAD = 7
```

La importación legacy enriquece históricos, pero no resta stock ni recrea histórico tipo 7.

Filtros:

```text
Año
Mes
Marca
Nombre
```

Se permite mes sin año. Las marcas históricas/inactivas necesarias siguen disponibles.

Paginación:

```text
20 / 50 / 100 / 200
default: 50
```

Alta:

```text
artículo activo + stock > 0
→ reread canónico backend
→ decremento de stock
→ histórico tipo 7
→ transacción
```

Reversión:

```text
restaura stock
+
histórico tipo 7 positivo
+
precios snapshot originales
+
enlace con caducidad original
```

Protección contra doble reversión y funcionamiento aunque el artículo haya sido dado de baja.

Informe:

```text
Año → Mes → Marca
```

BrowserWindow independiente, A4 estándar, impresión del estado expandido visible.

---

# 9. Imprenta — estado funcional consolidado

Diseñador efímero de una única hoja A4 de etiquetas.

Búsqueda por nombre, localizador y códigos de barras. Solo artículos activos; no exige stock positivo.

Modelo:

- una entrada por artículo;
- cantidad de etiquetas;
- `Hueco` como slot vacío independiente;
- drag & drop;
- el artículo mueve su bloque;
- eliminar artículo con confirmación;
- hueco inmediato;
- `Limpiar` con confirmación y conservación de configuración.

Capacidad:

```text
filas × columnas
1..10 × 1..10
default 5 × 4
```

Orientación portrait/landscape sin auto-swap.

Si al reducir filas/columnas queda contenido fuera, se conserva contenido, aparece error y se bloquea Terminar/Imprimir.

Preview:

- QR con localizador;
- nombre;
- marca opcional;
- PVP opcional;
- guías de huecos/libres solo en diseñador.

`Terminar` envía IDs/cantidades/huecos/configuración. Electron valida, relee valores persistidos y crea snapshot inmutable de una página.

Salida final:

- huecos/libres blancos;
- QR;
- nombre;
- marca;
- PVP;
- botón `IMPRIMIR`.

Impresión:

```text
silent: false
printBackground: true
pageSize: A4
orientation: snapshot
scaleFactor: 100
margins: none
```

Cancelar el diálogo no es error.

Pendiente:

```text
REF.6D → foco inmediato en buscador cada vez que se entra en Imprenta
```

---

# 10. Pausa técnica pre-Hito 16

Objetivos:

1. centralizar conceptos compartidos;
2. introducir `*.private.ts`;
3. estructurar Almacén por subdominios;
4. separar backend real de Inventario/Caducidades/Imprenta;
5. revisar hotspots por responsabilidad;
6. recuperar comportamientos del TPV antiguo;
7. cerrar con regresión integral.

---

# 11. REF.1 — Constantes y utilidades compartidas ✅

## 11.1 Meses

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

## 11.2 Paginación

Existe:

```text
electron/contracts/shared/pagination.constants.ts
```

Con:

```text
PAGE_SIZE_OPTIONS = [20, 50, 100, 200]
```

Compartido frontend/backend. Defaults locales:

```text
Inventario 20
Caducidades 50
```

También se corrigió el Histórico de Artículos para usar esta constante.

## 11.3 Formatters

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

Se eliminaron formatters duplicados en Almacén, estadísticas y legacy import.

---

# 12. REF.2 — Convención `*.private.ts` ✅

Regla:

```text
declaración module-scoped
+
uso exclusivo de un consumidor
→ <consumer>.private.ts
```

Puede contener interfaces/types internos, constantes, mapas/configuración estática y helpers puros exclusivos del consumidor.

No mover métodos de clase solo para reducir líneas. No crear sidecar vacío ni por obligación. Estado y comportamiento de instancia permanecen en la clase.

Ejemplos Almacén:

```text
inventory.component.private.ts
caducidades.component.private.ts
caducidad-create.component.private.ts
imprenta.component.private.ts
warehouse-tabs.component.private.ts
inventory-print.component.private.ts
imprenta-print.component.private.ts
```

`caducidad-report.component.ts` no recibió sidecar porque no lo necesitaba.

También se aplicó en casos claros de Artículos, Clientes y Ventas.

---

# 13. REF.3 — Reorganización estructural de Almacén ✅

## 13.1 Contracts públicos

```text
electron/contracts/almacen/
  almacen-api.interface.ts
  inventario/
  caducidades/
  imprenta/
```

`almacen-api.interface.ts` permanece como fachada común al renderer.

## 13.2 Backend contracts/domain

Organizados por:

```text
inventario/
caducidades/
imprenta/
```

## 13.3 Angular

```text
src/app/modules/almacen/
  components/
    warehouse-tabs/
  pages/
    warehouse/

  inventario/
    components/inventory/
    pages/inventory-print/

  caducidades/
    components/caducidades/
    components/caducidad-create/
    pages/caducidad-report/

  imprenta/
    components/imprenta/
    pages/imprenta-print/
```

`Warehouse` y `WarehouseTabs` permanecen arriba por ser composición transversal.

## 13.4 Models

```text
src/app/model/almacen/
  almacen-section.type.ts
  inventario/
  imprenta/
```

No crear carpetas sin contenido real.

## 13.5 IPC

```text
electron/ipc/almacen/
  register-almacen-ipc.ts
  register-inventario-print-ipc.ts
  register-caducidad-report-ipc.ts
  register-imprenta-print-ipc.ts
```

`channels.ts` y `assert-trusted-sender.ts` siguen en raíz IPC.

## 13.6 Adaptadores Electron

```text
electron/infrastructure/electron/almacen/
```

Sin subcarpetas artificiales de un solo archivo.

## 13.7 Preloads

```text
electron/preloads/
```

Contiene preloads especializados de factura, Inventario, Caducidades e Imprenta.

El preload principal permanece en:

```text
electron/preload.ts
```

Los nombres compilados de preload se mantienen, por lo que las BrowserWindows no cambian su ruta runtime.

---

# 14. REF.4 — Backend por subdominio ✅

Antes:

```text
AlmacenService
→ AlmacenRepository
→ TypeOrmAlmacenRepository
```

Ahora:

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

Se eliminaron:

```text
AlmacenService backend
AlmacenRepository
TypeOrmAlmacenRepository
```

No confundir con `src/app/services/almacen.service.ts`, que sigue siendo la fachada Angular hacia `AlmacenApi`.

## 14.1 Application

```text
electron/backend/application/almacen/
  validate-optional-id.ts

  inventario/
    inventario.service.ts
    inventario.service.private.ts
    inventario-csv.builder.ts
    inventario-csv.service.ts
    inventario-print.service.ts

  caducidades/
    caducidades.service.ts
    caducidad-report.service.ts

  imprenta/
    imprenta.service.ts
    imprenta-print.service.ts
```

Los servicios secundarios dependen de providers estrechos cuando solo necesitan una capacidad.

## 14.2 TypeORM

```text
electron/infrastructure/database/typeorm/almacen/
  inventario/
    typeorm-inventario.repository.ts
    typeorm-inventario.repository.private.ts

  caducidades/
    typeorm-caducidades.repository.ts
    typeorm-caducidades.repository.private.ts

  imprenta/
    typeorm-imprenta.repository.ts
    typeorm-imprenta.repository.private.ts

  typeorm-almacen.repositories.spec.ts
  typeorm-almacen.repositories.fixture.ts
```

Cada repository implementa únicamente su contract.

`application-composition.ts` instancia los tres repositories por separado.

---

# 15. REF.5 — Revisión de hotspots ✅

Regla:

```text
tamaño = señal
tamaño ≠ motivo suficiente para refactor
```

## 15.1 InventarioDraftManager

Existe:

```text
src/app/model/almacen/inventario/inventario-draft-manager.ts
```

Responsable de:

- crear valores editables;
- reconciliar consultas con drafts;
- actualizar;
- resetear;
- eliminar drafts;
- detectar dirty;
- obtener drafts por filtro;
- construir clave de filtro;
- crear comando de guardado.

`InventoryComponent` mantiene UI/orquestación y el signal de drafts.

`InventarioPriceCalculator` mantiene cascadas de precios.

No se movieron interacción de inputs, focus/blur, Enter, parsing, errores de editor ni navegación de celdas.

## 15.2 Fixture TypeORM

Se extrajo el seed/schema de:

```text
typeorm-almacen.repositories.spec.ts
```

a:

```text
typeorm-almacen.repositories.fixture.ts
```

API pública:

```text
prepareAlmacenRepositoriesFixture(dataSource)
```

No se dividió artificialmente en múltiples fixtures.

## 15.3 Hotspots deliberadamente conservados

Se revisaron, entre otros:

- `InventoryComponent`;
- `HistoricalSalesComponent`;
- `SaleWorkspaceComponent`;
- `application-composition.ts`;
- `preload.ts`;
- repositories TypeORM;
- spec integrado.

No refactorizar únicamente por longitud.

---

# 16. REF.6 — Paridad funcional pre-Compras

```text
REF.6A ✅ Última venta + cambio
REF.6B ✅ Inventario → Artículos + estado sesión
REF.6C ⬅️ Caducidades → Artículos + estado
REF.6D ⬜ Autofocus Imprenta
```

---

# 17. REF.6A — Última venta + cambio ✅

En el flotante del total de la venta aparece una línea secundaria:

```text
Última venta: XX,XX €        Cambio: YY,YY €
```

Objetivo: poder responder rápidamente al cliente anterior sin interrumpir la venta actual ni abrir Histórico.

Existe resumen de sesión:

```text
UltimaVentaResumen
  totalCents
  cambioCents
```

Vive en `VentasService`.

Propiedades:

- sobrevive a navegar a otros módulos;
- sobrevive al cierre de todas las ventas abiertas;
- se reemplaza al finalizar otra venta;
- desaparece al cerrar la aplicación;
- antes de la primera venta de sesión no se muestra.

Momento:

```text
COMMIT venta
→ registrar última venta
→ postprocesos
```

Por tanto un warning/fallo posterior no elimina una venta comercial ya confirmada.

Cambio:

```text
efectivo → cambio real
tarjeta  → 0,00 €
mixto    → suma de cambios registrados
```

---

# 18. REF.6B — Inventario → Artículos + estado de sesión ✅

El requisito inicial se generalizó: el estado no se conserva únicamente para ir a Artículos, sino para cualquier salida y regreso durante la sesión.

Ejemplos:

```text
Inventario → Clientes → Inventario
Inventario → Ventas → Inventario
Inventario → Artículos → Inventario
Inventario → Caducidades → Inventario
```

## 18.1 Estado conservado

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

No se guardan filas, totales, loading, errores, editor activo ni resultados backend.

Al volver:

```text
restaurar estado visual
→ releer backend
→ reconciliar
```

## 18.2 AlmacenWorkspaceService

Existe:

```text
src/app/modules/almacen/services/almacen-workspace.service.ts
```

Responsable de:

- estado visual de sesión;
- sección activa;
- estado de Inventario;
- clonación de estructuras mutables.

No se mezcló con `src/app/services/almacen.service.ts`, que sigue siendo fachada IPC/casos de uso.

## 18.3 Sección activa

También se conserva:

```text
inventory
expirations
printing
```

Ejemplo validado conceptualmente:

```text
Almacén → Caducidades
→ Clientes
→ Almacén
→ vuelve a Caducidades
```

## 18.4 Nombre clicable

En Inventario:

```text
clic nombre
→ ArticulosService.cargarPorId(row.id)
→ guardar workspace
→ navegar /articulos
→ ficha cargada
```

## 18.5 Protección dirty

Si la fila clicada está dirty:

```text
no navegar
→ avisar
→ guardar o deshacer primero
```

Los drafts de otras filas se conservan normalmente.

## 18.6 Regresión

Tests y pruebas funcionales pasaron, incluyendo filtros, paginación, columnas, drafts, salida/vuelta y apertura de Artículos.

---

# 19. REF.6C — Caducidades → Artículos + estado de sesión ⬅️ SIGUIENTE

Este es el siguiente punto exacto.

## 19.1 Nombre clicable

```text
nombre
→ clic
→ ArticulosService.cargarPorId(idArticulo)
→ navegar /articulos
→ abrir ficha
```

Usar `idArticulo` del histórico; no resolver por nombre/localizador.

Si el artículo no está disponible, mostrar aviso y permanecer en Caducidades.

## 19.2 Estado de sesión

Extender `AlmacenWorkspaceService` con estado específico de Caducidades:

```text
anio
mes
idMarca
nombre/texto
pagina
num
```

La sección activa ya está resuelta.

No guardar resultados ni totales; releer al recrear el componente.

Debe funcionar para:

```text
Caducidades → Artículos → Caducidades
Caducidades → Clientes → Caducidades
Caducidades → Ventas → Caducidades
Caducidades → Inventario → Caducidades
```

No hay drafts editables, por lo que es más sencillo que Inventario.

No mezclar REF.6D todavía.

---

# 20. REF.6D — Autofocus Imprenta ⬜

Requisito:

```text
al acceder a Imprenta
→ foco inmediato en el buscador
```

Debe ocurrir **cada vez que se entra**, no solo al arrancar o en la primera visita.

Tener en cuenta el ciclo de vida real del `@switch` de Warehouse.

---

# 21. REF.7 — Cierre de la pausa técnica ⬜

Una vez terminados REF.6C y REF.6D:

1. batería completa;
2. regresión funcional de Almacén;
3. regresión de última venta/cambio;
4. navegación Inventario/Caducidades → Artículos;
5. restauración de estados;
6. autofocus Imprenta;
7. revisión final de convenciones;
8. documento final;
9. cerrar REF;
10. iniciar Hito 16 — Compras.

---

# 22. Convenciones arquitectónicas resultantes

## 22.1 Compartido vs privado

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

## 22.2 Subdominios

Crear carpeta propia cuando existe un subdominio reconocible con varias piezas.

No crear una carpeta por archivo.

Las fachadas comunes pueden permanecer en la raíz.

## 22.3 Backend

Patrón de referencia para Compras:

```text
FeatureService
→ FeatureRepository
→ TypeOrmFeatureRepository
```

Servicios secundarios deben depender de providers estrechos.

## 22.4 Composition root

No dividir `application-composition.ts` solo por longitud. Su responsabilidad es hacer visible el grafo de dependencias.

## 22.5 Renderer state

```text
datos canónicos
→ backend / SQLite

estado visual de sesión
→ workspace service Angular

estado efímero
→ componente
```

No persistir filtros/paginación en SQLite solo para recuperar contexto de navegación.

## 22.6 Hotspots

Antes de extraer:

```text
¿hay una responsabilidad con nombre propio?
```

Si no, el tamaño no basta.

---

# 23. Estructuras especialmente importantes

## Angular Almacén

```text
src/app/modules/almacen/
  services/
    almacen-workspace.service.ts

  components/
    warehouse-tabs/

  pages/
    warehouse/

  inventario/
    components/inventory/
    pages/inventory-print/

  caducidades/
    components/caducidades/
    components/caducidad-create/
    pages/caducidad-report/

  imprenta/
    components/imprenta/
    pages/imprenta-print/
```

## Models

```text
src/app/model/almacen/
  almacen-section.type.ts

  inventario/
    inventario-draft.interface.ts
    inventario-draft-manager.ts
    inventario-price-calculator.ts
    inventario-workspace.interface.ts

  imprenta/
    imprenta-design-item.interface.ts
```

## Electron contracts

```text
electron/contracts/almacen/
  almacen-api.interface.ts
  inventario/
  caducidades/
  imprenta/
```

## Backend application

```text
electron/backend/application/almacen/
  inventario/
  caducidades/
  imprenta/
```

## Backend contracts/domain

```text
electron/backend/contracts/almacen/
  inventario/
  caducidades/
  imprenta/

electron/backend/domain/almacen/
  inventario/
  caducidades/
  imprenta/
```

## TypeORM

```text
electron/infrastructure/database/typeorm/almacen/
  inventario/
  caducidades/
  imprenta/
  typeorm-almacen.repositories.spec.ts
  typeorm-almacen.repositories.fixture.ts
```

## IPC / adapters / preloads

```text
electron/ipc/almacen/
electron/infrastructure/electron/almacen/
electron/preloads/
```

El preload principal sigue en:

```text
electron/preload.ts
```

---

# 24. Decisiones que no deben revertirse

- No volver a crear `AlmacenService` backend agregado.
- No volver a crear `AlmacenRepository`.
- No volver a crear `TypeOrmAlmacenRepository`.
- No mezclar contracts de los tres subdominios en una carpeta plana.
- No crear barrels para ocultar pertenencia al subdominio.
- No hacer `*.private.ts` obligatorio.
- No mover métodos a `.private.ts` solo por tamaño.
- No persistir estado visual de sesión en SQLite sin necesidad.
- No reabrir Hito 15 por estos ajustes.
- No iniciar Compras antes de cerrar REF.6/REF.7.
- No tocar TicketBAI 12C.9 sin información de Berein.
- No bloquear el proyecto por la prueba física Star.

---

# 25. Pendientes externos/no bloqueantes

```text
TicketBAI 12C.9
→ bloqueado por Berein

Star TSP100/TSP143
→ prueba física pendiente

Imprenta
→ calibración física A4/etiquetas futura
```

---

# 26. Cómo retomar

En una conversación nueva:

1. usar este documento como continuidad principal;
2. revisar `main` actual;
3. confirmar que el último punto cerrado es `REF.6B`;
4. continuar exactamente con:

```text
REF.6C — Caducidades → Artículos + estado de sesión
```

5. no reimplementar REF.1–REF.6B;
6. esperar tests + confirmación tras cada mini-hito;
7. tras REF.6D, ejecutar REF.7 y crear nuevo documento final.

---

# 27. Resumen ultracorto

```text
Proyecto: Osumi TPV Client
Continuidad: 10/09/2026
Base: v2.50 + main

Hito 13 Artículos ✅
Hito 14 Clientes ✅
Hito 15 Almacén ✅
TicketBAI ordinario ✅
TicketBAI devoluciones/mixtas ⏸️ Berein
Hito 16 Compras NO iniciado

Pausa técnica:
REF.1 ✅ shared constants/utils
REF.2 ✅ *.private.ts
REF.3 ✅ estructura por subdominio
REF.4 ✅ services/repositories TypeORM separados
REF.5 ✅ hotspots / DraftManager / fixture
REF.6A ✅ última venta + cambio
REF.6B ✅ Inventario → Artículos + estado sesión

SIGUIENTE:
REF.6C Caducidades → Artículos + estado sesión

DESPUÉS:
REF.6D autofocus buscador Imprenta
REF.7 regresión/cierre/documento final
Hito 16 Compras

Regla clave:
revisar main antes de cada patch y no avanzar sin confirmación.
```
