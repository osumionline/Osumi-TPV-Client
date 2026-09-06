# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.42  
**Fecha:** 7 de septiembre de 2026  
**Base de continuidad:** `v2.42 + main` una vez este documento se suba al repositorio.

---

# 1. Estado general del proyecto

TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**.

El **Hito 13 — Artículos** está completamente terminado, validado y subido al repositorio ✅.

El **Hito 14 — Clientes** queda oficialmente **✅ CERRADO** tras completar la regresión integral final. No queda funcionalidad conocida pendiente dentro de este hito.

El siguiente gran bloque es:

```text
HITO 15 — ALMACÉN
```

Se divide funcionalmente en tres pestañas independientes:

```text
Inventario
Caducidades
Imprenta
```

Por ahora se desarrollará **solo Inventario**.

```text
Caducidades → placeholder
Imprenta    → placeholder
```

La planificación funcional y técnica de Inventario ya está cerrada y se recoge en este documento.

---

# 2. Estado resumido

```text
Installation + importación .otpv v2               ✅
Startup                                           ✅
Auditoría + Refactor A–E                          ✅

Ventas 1–11                                       ✅
Ventas 12 — Postventa                             🟦
  12C.8 TicketBAI ordinario                       ✅ CERRADO
  12C.9 TicketBAI devoluciones/mixtas             ⏸️ Berein
  12C.10 Regresión integral final                 ⬜

13 Artículos                                      ✅ HITO CERRADO

14 Clientes                                       ✅ HITO CERRADO
  14A Documento de continuidad y plan             ✅
  14B Base del apartado Clientes                  ✅
  14C Búsqueda y selección                        ✅
  14D Workspace y formulario                     ✅
  14E Persistencia y mantenimiento                ✅
  14F Ventas del cliente                          ✅
  14G Estadísticas generales                      ✅
  14H Consumo mensual                             ✅
  14I Dominio y listado de facturas               ✅
  14J Editor de factura                           ✅
  14K Emisión y documentos                        ✅
    14K.1 Emisión transaccional                   ✅
    14K.2 Documento y previsualización            ✅
    14K.3 PDF definitivo inmutable                ✅
    14K.4 Impresión y email                       ✅
    14K.5 Anulación                               ✅
    14K.6 Integración final con Ventas            ✅
      14K.6A “Imprimir factura” tras venta        ✅
      14K.6B Regresión integral + cierre          ✅

15 Almacén                                        🟦 PLANIFICADO
  15A Base de Almacén                             ⬅️ SIGUIENTE
  15B Dominio + consulta Inventario               ⬜
  15C Pantalla Inventario                         ⬜
  15D Drafts inline + cálculos                    ⬜
  15E Persistencia                                ⬜
  15F CSV                                         ⬜
  15G Vista de impresión                          ⬜
  15H Integración + regresión Inventario          ⬜
  15I Caducidades                                 ⬜ PLACEHOLDER
  15J Imprenta                                    ⬜ PLACEHOLDER

16 Compras                                        ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

---

# 3. Convenciones de trabajo

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Templates con `@if`, `@for`, `@switch`.
- Todo método TS/JS nuevo lleva JSDoc breve.
- No dejar líneas en blanco entre propiedades/atributos relacionados.
- Sí separar visualmente métodos y bloques de responsabilidades diferentes.
- Archivo nuevo: mostrar contenido completo.
- Archivo existente: mostrar fragmento actual reconocible → fragmento nuevo.
- Para imports: indicar solo imports nuevos; Prettier ordena.
- Trabajar en lotes coherentes, no micro-pasos.
- Revisar siempre `main` actual antes de proponer patches.
- No avanzar al siguiente mini-hito sin confirmación explícita del usuario.
- Al comenzar cada bloque, incluir un resumen visible de:
  - terminado;
  - punto actual;
  - pendiente.
- El usuario aplica cambios manualmente, ejecuta tests/build/lint y sube commits.
- El asistente no hace commits ni PRs.

## Convención de exports

- Un único elemento exportado → `export default`.
- Varios elementos exportados → exports nombrados, sin `default`.

## Comandos habituales

Frontend:

```bash
npm test
npm run build
npm run lint
```

Backend/Electron/contratos/repository/IPC/preload:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Batería completa cross-layer:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
npm run lint
```

`npm test` ya incorpora `--watch=false`; no añadirlo.

---

# 4. Política SQLite durante desarrollo

Hasta la primera versión estable con usuarios reales:

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones todavía.

Si aparece un cambio incompatible:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear instalación
→ reimportar .otpv
```

Las migraciones reales comenzarán tras la primera versión estable.

---

# 5. TicketBAI — estado

## 5.1 Ordinario

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Principios cerrados:

- `@osumi/ticketbaiws` 1.0.1.
- `production` es el entorno por defecto.
- Desarrollo manual mediante `app_data.json → ticketBai.environment = "test"` y token TEST.
- No añadir selector de entorno TicketBAI a UI.
- PENDING es resultado válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite `resend()`.
- `error_temporal` se reconcilia antes de actuar.
- `error_permanente` informa y no muta automáticamente.
- Un fallo TicketBAI no revierte una venta comercial confirmada.

## 5.2 Devoluciones/mixtas

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️
```

Bloqueado hasta respuesta/documentación de Berein.

## 5.3 Facturas de cliente

Regla crítica:

```text
Factura de cliente ≠ operación TicketBAI
```

Crear, editar, emitir, previsualizar, imprimir, enviar o anular una factura de cliente no llama a TicketBAI.

---

# 6. Hito 14 — Clientes ✅ CERRADO

El Hito 14 queda oficialmente terminado tras completar la regresión funcional y automática.

## 6.1 Workspace

Existe un único workspace de cliente que conserva:

- cliente activo;
- draft;
- `baseSnapshot`;
- dirty;
- sección activa.

Cambiar/cerrar/crear ficha con dirty requiere confirmación.

Secciones:

```text
Datos
Facturación
Facturas
Ventas
Estadísticas
Consumo mensual
```

Cliente nuevo no persistido: solo Datos/Facturación.

## 6.2 Persistencia

- Draft compartido.
- Guardar/Cancelar global.
- Solo nombre obligatorio.
- Facturación alternativa preservada aunque `factIgual = true`.
- Si `factIgual = false`, se validan datos alternativos.
- CREATE/UPDATE transaccionales.
- Reconciliación post-COMMIT.
- Baja lógica.
- Baja bloqueada si existen borradores activos de factura.
- Históricos conservados.

## 6.3 Ventas / estadísticas

Cerrados:

- histórico de ventas;
- detalle histórico;
- ticket/PDF;
- reimpresión;
- email;
- estadísticas generales;
- jerarquía anual/mensual;
- consumo mensual.

## 6.4 Facturas

Estados:

```text
borrador
emitida
anulada
```

Relación factura ↔ venta:

```text
venta
→ 0..1 relación activa de factura
→ 0..N relaciones históricas inactivas
```

Una venta solo puede estar en una factura activa.

Las relaciones históricas inactivas no bloquean futuras facturas.

## 6.5 Numeración

- Serie actual `''`.
- Número global por serie.
- Asignado solo al emitir.
- Nunca se reutiliza.
- Factura anulada conserva número.
- Formato visible:

```text
numero_AÑO
```

Ejemplo:

```text
21_2026
```

## 6.6 Preview

La previsualización no es PDF.

Es una BrowserWindow Electron interactiva:

- logo;
- `nombreComercial`;
- cliente;
- ventas inicialmente contraídas;
- despliegue individual;
- despliegue/contracción global;
- resumen fiscal;
- `PREVISUALIZACIÓN`;
- botón Facturar.

Tras emitir:

```text
PAGADO
```

## 6.7 PDF definitivo

Formato definitivo:

```text
A4 vertical
```

Características:

- inmutable;
- cabecera con `nombreComercial`;
- solo filas resumen de ventas;
- no contiene líneas de artículos;
- `PAGADO`.

Ruta:

```text
files/clientes/facturas/<facturaPublicId>.pdf
```

Nunca sobrescribir PDF definitivo ya materializado.

## 6.8 Impresión y email

Impresión:

```text
PDF canónico
→ diálogo estándar del sistema
```

No usa térmica.

Email:

```text
PDF / cabecera factura     → AppData.nombreComercial
From name                  → AppData.nombre
Asunto                     → AppData.nombre
Cuerpo                     → AppData.nombre
```

El destinatario inicial parte de `workspace.baseSnapshot.email`.

Durante SMTP se integra con el `processing()` global.

## 6.9 Anulación

Transición:

```text
emitida
→ anulada
```

La anulación:

- conserva serie;
- conserva número;
- conserva fecha emisión;
- conserva snapshot;
- conserva PDF;
- establece `fecha_anulacion`;
- transforma relaciones activas a históricas;
- libera ventas.

UI:

```text
Emitida → botón Anular rojo
Anulada → sin imprimir/email/anular
```

## 6.10 Venta → Factura

Opción del modal:

```text
Imprimir factura
```

Requisitos:

```text
✅ cliente asignado
✅ venta ordinaria
✅ importe positivo
✅ no devolución
✅ no venta mixta
```

Flujo:

```text
Finalizar venta
→ Imprimir factura
→ COMMIT venta
→ TicketBAI habitual
→ PDF ticket
→ imprimir ticket
→ crear+emitir factura de ESA venta
→ materializar PDF
→ diálogo estándar A4
```

La factura automática contiene exclusivamente la venta recién terminada.

La creación es atómica y no deja borrador intermedio.

Fallos post-COMMIT no revierten venta ni factura ya emitida.

## 6.11 Regresión final

La regresión integral fue ejecutada y validada.

Resultado:

```text
14K.6B ✅
14K ✅
HITO 14 — CLIENTES ✅ CERRADO
```

---

# 7. Hito 15 — Almacén

El apartado Almacén se divide en tres pestañas:

```text
Inventario
Caducidades
Imprenta
```

Por ahora:

```text
Inventario   → desarrollo completo
Caducidades  → placeholder
Imprenta     → placeholder
```

Caducidades e Imprenta son dominios independientes y no deben diseñarse todavía.

---

# 8. Inventario — objetivo funcional

Inventario es una vista rápida y operativa sobre todo el inventario de la tienda.

Debe estar optimizada para trabajar con una cantidad elevada de artículos.

La pantalla contiene:

1. filtros;
2. selector de columnas;
3. acciones globales;
4. tabla editable;
5. acciones por fila;
6. paginación;
7. totales.

Referencia visual aportada por el usuario:

```text
ALMACÉN

[ Inventario ] [ Caducidades ] [ Imprenta ]

Proveedor | Marca | Categoría | Nombre, etiquetas... | Con descuento

Columnas [...]                     Guardar todos | Exportar CSV | Imprimir

TABLA

Paginación

Media margen | Total PUC | Total PVP
```

La estética debe adaptarse al cliente actual, no copiar literalmente la aplicación antigua.

---

# 9. Inventario — columnas

Columnas funcionales:

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

## 9.1 Columnas editables

```text
Categoría
Stock
Precio albarán
PUC
PVP
Código de barras
```

## 9.2 Columna Opciones

`Opciones`:

- siempre visible en pantalla;
- no forma parte del selector de columnas;
- no se exporta a CSV;
- no se incluye en impresión.

Contiene:

```text
Reset
Guardar
Borrar
Aviso sin ventas 12 meses
```

---

# 10. Inventario — filtros

Filtros superiores:

```text
Proveedor
Marca
Categoría
Texto libre
Con descuento
```

Se combinan entre sí.

## 10.1 Proveedor

Filtro exacto por proveedor.

## 10.2 Marca

Filtro exacto por marca.

## 10.3 Categoría

Filtro por asociación explícita a esa categoría.

Regla:

```text
seleccionar categoría padre
≠
seleccionar automáticamente categorías hijas
```

Nunca hay cascada padre → hijos.

Un artículo pertenece únicamente a las categorías que el usuario haya asignado explícitamente.

## 10.4 Texto

Buscar por:

```text
nombre
localizador
referencia
códigos de barras
etiquetas
```

## 10.5 Con descuento

```text
OFF → todos
ON  → solo artículos con descuento
```

El criterio se basa en la existencia del precio de descuento persistido.

---

# 11. Inventario — selector de columnas

Debe existir un combo de selección múltiple para indicar qué columnas de datos son visibles.

Afecta a:

```text
tabla principal
CSV
vista de impresión
```

No afecta a:

```text
Opciones
```

porque Opciones siempre está visible únicamente en la tabla principal y nunca se exporta/imprime.

La configuración de columnas es de presentación, no modifica el query funcional de filtros/totales salvo en reportes.

---

# 12. Inventario — edición inline

Cada fila trabaja con:

```text
snapshot persistido
+
draft local
```

## 12.1 Foco

En campos numéricos/textuales editables:

```text
focus
→ seleccionar todo el contenido
```

equivalente funcional a:

```html
onfocus="this.select()"
```

En Angular se implementará de forma adecuada, sin usar inline handlers antiguos.

## 12.2 Dirty

Si una celda cambia:

```text
celda dirty
→ fondo resaltado
→ fila dirty
→ Reset habilitado
→ Guardar habilitado
```

## 12.3 Reset

```text
Reset
→ restaura esa fila al snapshot persistido
```

## 12.4 Guardar fila

```text
Guardar
→ persiste solo esa fila
→ actualiza snapshot
→ limpia dirty
```

## 12.5 Guardar todos

Debe ser atómico:

```text
todas las filas dirty válidas
→ una transacción
→ COMMIT todas
```

Si una falla:

```text
ROLLBACK de todas
→ filas permanecen dirty
→ usuario corrige y reintenta
```

No se acepta éxito parcial.

---

# 13. Inventario — cálculos de precios

Campos relacionados:

```text
Precio albarán
PUC
PVP
Margen
```

El esquema actual almacena:

- Precio albarán en microeuros.
- PUC en microeuros.
- PVP en céntimos.
- Margen derivado.

## 13.1 Precio albarán → PUC

Conceptualmente:

```text
PUC = Precio albarán × (1 + IVA + RE)
```

Debe usar los mismos cálculos y precisión ya existentes en el dominio de precios.

Ejemplos de referencia aportados:

```text
Precio albarán 17,52
IVA 21 %
PUC ≈ 21,20
```

y:

```text
Precio albarán 16,95
IVA 21 %
RE 5,2 %
PUC ≈ 21,39
```

## 13.2 Margen

Conceptualmente:

```text
Margen = (PVP - PUC) / PVP × 100
```

Ejemplo:

```text
PUC    21,20
PVP    34,90
Margen 39,26 %
```

## 13.3 Cascada exacta de cambios

Regla cerrada:

```text
editar Precio albarán
→ recalcular PUC
→ recalcular Margen
→ PVP NO cambia
```

```text
editar PUC
→ recalcular Precio albarán
→ recalcular Margen
→ PVP NO cambia
```

```text
editar PVP
→ recalcular Margen
→ Precio albarán NO cambia
→ PUC NO cambia
```

No se mantiene margen previo al cambiar Precio albarán o PUC.

El PVP solo cambia si el usuario modifica explícitamente PVP.

## 13.4 Centralización

No duplicar fórmulas ad hoc dentro del componente.

Debe reutilizarse o extraerse una lógica común coherente con la ya implementada en precios.

---

# 14. Inventario — Categoría inline

La columna Categoría utiliza selección múltiple.

Debe permitir:

```text
0..N categorías
```

No existe selección automática de descendientes.

Cada modificación de categorías marca la fila dirty.

La persistencia actualizará las relaciones N:M de ese artículo dentro de la misma operación de guardado de fila.

---

# 15. Inventario — Stock

Stock es editable.

Debe admitir valores negativos si el dominio actual ya los admite.

Cuando cambia:

```text
persistir nuevo stock
+
crear histórico manual de stock
```

Debe conservarse la semántica ya existente en Artículos para los cambios manuales.

Guardar una fila no debe reescribir innecesariamente toda la ficha de artículo.

---

# 16. Inventario — Código de barras

Comportamiento cerrado:

## 16.1 Solo código por defecto

Si el artículo tiene únicamente el código por defecto:

```text
mostrar input
→ permite introducir un código adicional
```

## 16.2 Ya tiene código adicional

Si existe al menos un código adicional activo:

```text
mostrar ✓
```

No mostrar editor.

Inventario no administra ni elimina códigos adicionales ya existentes.

Una vez se añade correctamente el primero:

```text
input desaparece
→ aparece ✓
```

El backend debe volver a respetar la unicidad global de códigos activos.

---

# 17. Inventario — Baja

Acción por fila:

```text
Borrar
```

Realiza baja lógica de artículo.

Debe preservar histórico.

Debe respetar la semántica ya existente del módulo Artículos, incluida la baja de códigos activos si esa es la regla actual.

La UI debe pedir confirmación antes de una operación destructiva.

---

# 18. Inventario — Aviso 12 meses

En la última columna aparece un triángulo amarillo solo cuando:

```text
el artículo no ha tenido ventas en los últimos 12 meses
```

Incluye:

```text
artículo nunca vendido
→ mostrar aviso
```

El cálculo debe realizarse eficientemente en la consulta principal, evitando N consultas por artículo.

Preferencia técnica:

```text
EXISTS / MAX fecha venta
```

sobre venta + líneas históricas.

---

# 19. Inventario — Totales

En la parte inferior:

```text
Media margen
Total PUC
Total PVP
```

## 19.1 Media margen

```text
media aritmética del margen de todos los productos filtrados
```

No solo de la página visible.

## 19.2 Total PUC

```text
Σ stock × PUC
```

de todas las líneas filtradas.

## 19.3 Total PVP

```text
Σ stock × PVP
```

de todas las líneas filtradas.

No usar `pvp_descuento` para este total.

## 19.4 Drafts

En la pantalla principal, los totales se actualizan en tiempo real con los drafts:

```text
editar Stock / PUC / PVP
→ actualizar inmediatamente
  Media margen
  Total PUC
  Total PVP
```

Sin esperar a guardar.

Sin embargo:

```text
CSV
Impresión
```

usan exclusivamente valores persistidos.

---

# 20. Inventario — paginación

La consulta principal debe estar paginada en SQLite.

No cargar todo el inventario en Angular.

Resultado conceptual:

```text
rows
totalRows
mediaMargen
totalPuc
totalPvp
```

Los totales corresponden al conjunto filtrado completo, no a la página.

La UI tendrá selector de resultados por página y navegación.

---

# 21. Inventario — CSV

Acción global:

```text
Exportar a Excel
```

El resultado será un archivo CSV.

Debe usar:

```text
mismos filtros actuales
+
solo columnas seleccionadas
+
solo valores persistidos
```

No exportar drafts sin guardar.

No exportar columna Opciones.

No limitarse a la página actual si el usuario está filtrando un conjunto mayor.

Debe exportar el conjunto filtrado completo.

---

# 22. Inventario — vista de impresión

Acción global:

```text
Imprimir
```

Flujo cerrado:

```text
clic Imprimir
→ abrir ventana nueva
→ tabla limpia
→ columnas seleccionadas
→ filas filtradas persistidas
→ totales
→ botón Imprimir
→ diálogo normal del sistema
```

No lanzar el diálogo automáticamente al abrir.

No usar impresora térmica.

La ventana de impresión no replica navegación, filtros ni controles de edición de la aplicación.

## 22.1 Totales de impresión

Mostrar:

```text
Media margen
Total PUC
Total PVP
```

## 22.2 Datos

La impresión usa exclusivamente datos persistidos.

Si hay drafts sin guardar en pantalla:

```text
pantalla principal → muestra drafts
impresión          → muestra persistido
```

---

# 23. Arquitectura propuesta para Inventario

No reutilizar directamente el guardado completo de `ArticulosRepository.update()` para cada celda.

Inventario debe tener un dominio específico y reducido.

Conceptualmente:

```text
AlmacenRepository
  searchInventario()
  saveInventarioRow()
  saveInventarioRows()
  deactivateArticulo()
  getInventarioReport()
```

La lectura debe estar optimizada para tabla masiva.

La escritura debe modificar únicamente:

```text
categorías
stock
precio albarán
PUC
PVP
código adicional nuevo
```

según los cambios reales.

---

# 24. Hoja de ruta Hito 15

## 15A — Base de Almacén

Objetivo:

```text
activar /almacen
crear página Almacén
crear tabs:
  Inventario
  Caducidades
  Imprenta
```

Estado funcional:

```text
Inventario   → contenedor inicial
Caducidades  → placeholder
Imprenta     → placeholder
```

No desarrollar aún lógica de negocio.

---

## 15B — Dominio + consulta Inventario

Crear:

- contratos públicos;
- contratos backend;
- repository específico;
- implementación TypeORM;
- service application;
- API;
- IPC;
- preload;
- tests.

Consulta con:

```text
filtro proveedor
filtro marca
filtro categoría exacta
filtro texto
filtro descuento
paginación
categorías por artículo
tiene código adicional
sin ventas 12 meses
totales globales
```

No edición todavía.

---

## 15C — Pantalla Inventario

Construir:

- filtros;
- selector columnas;
- tabla;
- paginación;
- totales;
- estados loading/error/empty.

Los filtros consultan backend.

No filtrar miles de artículos en Angular.

---

## 15D — Drafts inline + cálculos

Añadir:

- snapshot persistido;
- draft por fila;
- selección de input al foco;
- dirty por celda;
- dirty por fila;
- fondo resaltado;
- Reset;
- selección múltiple de categorías;
- edición Stock;
- edición Precio albarán;
- edición PUC;
- edición PVP;
- input código adicional;
- Margen derivado;
- cascada de precios cerrada;
- totales reactivos con drafts.

---

## 15E — Persistencia

Añadir:

```text
Guardar fila
Guardar todos
Baja
Código adicional
Histórico de stock
```

`Guardar todos` atómico.

Reconciliar posibles fichas ya abiertas en `ArticulosService` si es necesario para no dejar datos canónicos incoherentes en memoria.

---

## 15F — CSV

Crear exportación persistida:

```text
filtros actuales
+
columnas seleccionadas
+
todas las filas filtradas
+
sin drafts
```

Resultado CSV descargable/guardable según patrón desktop que corresponda.

---

## 15G — Vista de impresión

Crear BrowserWindow independiente:

```text
snapshot persistido
→ tabla limpia
→ columnas seleccionadas
→ Media margen
→ Total PUC
→ Total PVP
→ botón Imprimir
→ diálogo estándar
```

Preload mínimo y superficie IPC reducida.

---

## 15H — Integración + regresión Inventario

Validar:

```text
filtros combinados
categoría exacta
búsqueda
descuento
paginación
selector columnas
dirty
reset
guardar fila
guardar todos
rollback
categorías
stock
histórico stock
precio albarán
PUC
PVP
margen
código adicional
baja
aviso 12 meses
totales
CSV
impresión
persistencia tras reinicio
```

Si todo queda limpio:

```text
Inventario ✅ CERRADO
```

---

## 15I — Caducidades

```text
PLACEHOLDER
```

No diseñar todavía.

Se explicará funcionalmente en otro bloque.

---

## 15J — Imprenta

```text
PLACEHOLDER
```

No diseñar todavía.

Se explicará funcionalmente en otro bloque.

---

# 25. Decisiones de Inventario que no deben reabrirse sin requisito nuevo

- Caducidades e Imprenta son placeholders por ahora.
- Categorías son N:M explícitas.
- Nunca seleccionar automáticamente categorías hijas.
- Opciones siempre visible.
- Opciones no exportable ni imprimible.
- Campos editables:
  - Categoría;
  - Stock;
  - Precio albarán;
  - PUC;
  - PVP;
  - Código de barras.
- Margen derivado, no editable.
- Editar Precio albarán:
  - recalcula PUC;
  - recalcula Margen;
  - no cambia PVP.
- Editar PUC:
  - recalcula Precio albarán;
  - recalcula Margen;
  - no cambia PVP.
- Editar PVP:
  - recalcula Margen;
  - no cambia Precio albarán;
  - no cambia PUC.
- Guardar todos es atómico.
- CSV e impresión usan solo valores persistidos.
- Pantalla usa drafts para totales en tiempo real.
- Código adicional:
  - input si solo existe default;
  - ✓ si existe cualquier adicional.
- Inventario no administra/elimina códigos adicionales ya existentes.
- Aviso amarillo si no hay ventas en últimos 12 meses.
- Nunca vendido también muestra aviso.
- `Con descuento` filtra artículos con precio descuento persistido.
- Totales calculados sobre conjunto filtrado completo.
- Total PUC = Σ stock × PUC.
- Total PVP = Σ stock × PVP.
- Media margen = media de márgenes filtrados.
- CSV contiene todas las filas filtradas, no solo página.
- Impresión contiene todas las filas filtradas persistidas y columnas seleccionadas.
- Vista impresión tiene botón propio Imprimir.
- Diálogo de impresión es estándar del sistema.
- Impresión de Inventario no usa impresora térmica.

---

# 26. Próximo bloque exacto

```text
15A — Base de Almacén
```

Antes de proponer cambios:

1. revisar `main` actual;
2. revisar router/header actuales;
3. revisar estructura/patrón de páginas con tabs existentes;
4. decidir nombres concretos de componentes/ruta siguiendo convenciones actuales;
5. no implementar aún query de Inventario;
6. Caducidades e Imprenta solo placeholders.

Resultado esperado de 15A:

```text
Header → Almacén habilitado
/alma­cen → página funcional
Tabs:
  Inventario
  Caducidades
  Imprenta

Inventario → contenedor inicial
Caducidades → placeholder
Imprenta → placeholder
```

Después:

```text
15B — Dominio + consulta Inventario
```

---

# 27. Prompt de relevo

Si este chat alcanza el límite, continuar con este contexto:

```text
Estamos desarrollando Osumi TPV Client.
La base de continuidad es el documento v2.42 + el main actual del repositorio.

Reglas:
- revisar main antes de proponer patches;
- usuario aplica cambios y ejecuta tests;
- no hacer commits/PR;
- Angular 22 standalone, signals, strict TS, no any;
- métodos nuevos con JSDoc;
- no avanzar sin confirmación;
- empezar cada bloque con resumen de estado;
- DATABASE_SCHEMA_VERSION sigue en 1 y no hay migraciones pre-release.

Estado:
- Hito 13 Artículos cerrado.
- Hito 14 Clientes completamente cerrado tras regresión integral.
- siguiente gran hito: 15 Almacén.
- Almacén tiene tres pestañas: Inventario, Caducidades, Imprenta.
- desarrollar ahora solo Inventario.
- Caducidades e Imprenta quedan como placeholders.
- siguiente punto exacto: 15A Base de Almacén.

Inventario:
- filtros proveedor, marca, categoría exacta, texto, descuento;
- búsqueda por nombre/localizador/referencia/códigos/etiquetas;
- columnas:
  Localizador, Proveedor, Marca, Referencia, Categoría, Nombre,
  Stock, Precio albarán, PUC, PVP, Margen, Código barras, Opciones;
- editables:
  Categoría, Stock, Precio albarán, PUC, PVP, Código barras;
- Opciones siempre visible y no exportable/imprimible;
- categoría N:M explícita, nunca cascada a hijos;
- dirty por celda/fila, Reset, Guardar fila;
- Guardar todos atómico;
- stock conserva histórico manual;
- código adicional:
  input si solo default, check si ya existe adicional;
- sin ventas 12 meses → triángulo amarillo;
- precio albarán cambia PUC+margen, no PVP;
- PUC cambia precio albarán+margen, no PVP;
- PVP cambia margen, no los otros;
- totales pantalla reactivos con drafts:
  Media margen, Total PUC, Total PVP;
- CSV e impresión usan solo persistido;
- CSV = todas las filas filtradas + columnas seleccionadas;
- impresión = ventana independiente, tabla + 3 totales + botón imprimir + diálogo normal;
- no usar térmica.

Roadmap:
15A Base Almacén
15B Dominio + consulta Inventario
15C Pantalla Inventario
15D Drafts inline + cálculos
15E Persistencia
15F CSV
15G Vista impresión
15H Integración + regresión Inventario
15I Caducidades placeholder
15J Imprenta placeholder
```

---

# 28. Historial de continuidad

```text
v2.36
→ base previa antes del cierre de emisión/documentos

v2.37
→ 14J cerrado
→ 14K.1 emisión cerrada
→ 14K.2 preview interactiva cerrada

v2.38
→ 14K.3 PDF definitivo inmutable cerrado

v2.39
→ impresión/email desarrollados
→ PDF A4 vertical
→ criterio definitivo nombre/nombreComercial

v2.40
→ 14K.4 completamente cerrado
→ requisito Imprimir factura incorporado al roadmap

v2.41
→ 14K.5 anulación cerrada
→ 14K.6A Imprimir factura tras venta cerrada
→ pendiente solo 14K.6B

v2.42
→ Hito 14 Clientes oficialmente CERRADO
→ regresión integral 14K.6B validada
→ Hito 15 Almacén definido funcionalmente
→ Inventario completamente planificado
→ Caducidades e Imprenta quedan placeholders
→ siguiente bloque exacto: 15A Base de Almacén
```
