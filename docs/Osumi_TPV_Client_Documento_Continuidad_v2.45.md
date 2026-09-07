# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.45  
**Fecha:** 7 de septiembre de 2026  
**Base de continuidad:** `v2.45 + main` una vez este documento se suba al repositorio.

---

# 1. Estado general del proyecto

TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**.

El **Hito 13 — Artículos** está completamente terminado, validado y subido al repositorio ✅.

El **Hito 14 — Clientes** queda oficialmente **✅ CERRADO** tras completar la regresión integral final. No queda funcionalidad conocida pendiente dentro de este hito.

El **Hito 15 — Almacén** está actualmente **🟦 EN DESARROLLO**.

Se divide funcionalmente en tres pestañas independientes:

```text
Inventario
Caducidades
Imprenta
```

Por ahora se desarrolla **solo Inventario**.

```text
Inventario   → ✅ CERRADO
Caducidades  → 🟦 PLANIFICADO / SIGUIENTE
Imprenta     → placeholder
```

Inventario queda cerrado tras completar:

```text
15A Base de Almacén
15B Dominio + consulta Inventario
15C Pantalla Inventario
15D Drafts inline + cálculos
15E Persistencia
15F CSV
15G Vista de impresión
15H Integración + regresión Inventario
```

Durante 15H se añadió blindaje automatizado de persistencia y se corrigió una comparación `null === null` en la validación de códigos adicionales alfanuméricos.

El siguiente bloque exacto es:

```text
15I.1 — Dominio + esquema de Caducidades
```

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

15 Almacén                                        🟦 EN DESARROLLO
  15A Base de Almacén                             ✅
  15B Dominio + consulta Inventario               ✅
  15C Pantalla Inventario                         ✅
  15D Drafts inline + cálculos                    ✅
  15E Persistencia                                ✅
  15F CSV                                         ✅
  15G Vista de impresión                          ✅
  15H Integración + regresión Inventario          ✅
  15I Caducidades                                 🟦 PLANIFICADO
    15I.1 Dominio + esquema                       ⬅️ SIGUIENTE
    15I.2 Consulta + filtros + totales            ⬜
    15I.3 Pantalla principal                      ⬜
    15I.4 Alta de caducidad                       ⬜
    15I.5 Baja / reversión                        ⬜
    15I.6 Informe agrupado                        ⬜
    15I.7 Impresión + regresión                   ⬜
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

# 7.1 Estado implementado de Inventario

Hasta `main` actual quedan cerrados y validados los bloques:

```text
15A Base de Almacén                  ✅
15B Dominio + consulta Inventario    ✅
15C Pantalla Inventario              ✅
15D Drafts inline + cálculos         ✅
15E Persistencia                     ✅
15F CSV                              ✅
15G Vista de impresión               ✅
15H Integración + regresión          ✅
```

## 7.1.1 Base y navegación

Existe:

```text
/almacen
```

con pestañas:

```text
Inventario
Caducidades
Imprenta
```

`Caducidades` e `Imprenta` continúan únicamente como placeholders.

## 7.1.2 Consulta masiva

Inventario ya consulta SQLite mediante dominio específico de Almacén.

La respuesta contiene:

```text
rows
totalRows
mediaMargenMicroporcentaje
totalPucMicros
totalPvpCents
```

La consulta implementa:

- proveedor;
- marca;
- categoría explícita exacta;
- texto libre;
- descuento;
- paginación SQLite;
- categorías por artículo;
- existencia de código adicional;
- aviso sin ventas en 12 meses;
- agregados globales del conjunto filtrado.

El aviso de 12 meses cuenta únicamente ventas positivas. Una devolución reciente no considera al artículo como vendido.

## 7.1.3 Pantalla

La barra superior está compactada en una única línea en escritorio:

```text
[Proveedor] [Marca] [Categoría] [Buscar] [X] Con descuento
                                      [Columnas] [Guardar todos] [CSV] [Imprimir]
```

Las acciones globales se muestran como botones de icono.

Columnas visibles por defecto:

```text
Localizador
Proveedor
Marca
Referencia
Nombre
Stock
PUC
PVP
Margen
Código de barras
Opciones
```

Desactivadas por defecto, pero seleccionables:

```text
Categoría
Precio albarán
```

`Opciones` continúa siempre visible y fuera del selector.

## 7.1.4 Edición tipo hoja de cálculo

Los campos editables trabajan con:

```text
snapshot persistido
+
draft local
```

En inputs:

```text
focus
→ seleccionar todo

escribir
→ no confirmar todavía

blur
→ validar
→ confirmar
→ recalcular si corresponde
→ dirty

Intro
→ validar
→ confirmar
→ recalcular
→ dirty
→ saltar al mismo campo de la fila inferior
→ seleccionar todo
```

Esto se aplica a:

```text
Stock
Precio albarán
PUC
PVP
Código adicional
```

La selección de Categorías se aplica directamente al cambiar la selección.

La tabla conserva la identidad de fila mediante `trackBy` por artículo para evitar pérdida de foco al actualizar drafts.

Los drafts sobreviven al cambio de página y se mantienen asociados al conjunto filtrado correspondiente.

## 7.1.5 Dirty y Reset

Una modificación real produce:

```text
celda dirty
→ fila dirty
→ Reset habilitado
→ Guardar fila habilitado
→ Guardar todos habilitado
```

Los cálculos derivados también pueden marcar dirty:

```text
PUC / Precio albarán / PVP
→ Margen derivado dirty si cambia
```

Entrar y salir de un campo sin modificarlo no genera dirty.

`Reset` restaura toda la fila al snapshot persistido.

## 7.1.6 Totales reactivos

La pantalla utiliza:

```text
agregados persistidos globales
+
deltas de drafts del conjunto filtrado
```

Por tanto:

```text
Media margen
Total PUC
Total PVP
```

se actualizan al confirmar una edición, sin cargar todo el inventario en Angular.

## 7.1.7 Persistencia

La escritura usa un dominio específico de Almacén y no reutiliza el guardado completo de ficha de Artículos.

Operaciones disponibles:

```text
Guardar fila
Guardar todos
Baja lógica
Añadir primer código adicional
```

`Guardar todos` es atómico:

```text
todas las filas dirty válidas
→ una transacción
→ COMMIT

si una falla
→ ROLLBACK completo
→ todas continúan dirty
```

La escritura modifica únicamente los campos necesarios.

Categorías:

```text
sincronización N:M explícita
```

Stock:

```text
actualiza stock
+
crea histórico manual equivalente al dominio Artículos
```

Código adicional:

```text
solo puede añadirse si no existe ya otro adicional activo
+
se valida unicidad global
+
se evita colisión con localizador / acceso directo
```

Baja:

```text
soft-delete artículo
+
soft-delete códigos activos
+
histórico conservado
```

Tras una persistencia desde Inventario se reconcilian posibles fichas abiertas en `ArticulosService`, preservando cambios locales dirty si existieran.

## 7.1.8 CSV

La exportación CSV está cerrada y reutiliza una consulta de reporte compartida.

Flujo:

```text
filtros actuales
+
columnas seleccionadas
→ snapshot persistido completo
→ todas las filas filtradas
→ diálogo nativo Guardar como
→ CSV
```

Reglas implementadas:

- no exporta drafts sin guardar;
- no se limita a la página visible;
- no incluye `Opciones`;
- respeta exactamente las columnas seleccionadas y su orden;
- reutiliza los mismos filtros de Inventario;
- exporta los códigos adicionales activos reales;
- usa UTF-8 con BOM;
- usa `;` como separador;
- usa coma decimal;
- protege textos que podrían interpretarse como fórmulas de hoja de cálculo.

La capa de reportes devuelve también:

```text
totalRows
mediaMargenMicroporcentaje
totalPucMicros
totalPvpCents
```

aunque los totales no forman parte del CSV. Esa frontera se reutiliza para impresión.

## 7.1.9 Vista de impresión

La vista de impresión está cerrada.

Flujo:

```text
clic Imprimir
→ filtros actuales
→ columnas seleccionadas
→ getInventarioReport()
→ snapshot persistido completo
→ BrowserWindow independiente
```

La BrowserWindow muestra:

```text
tabla limpia
+
todas las filas filtradas
+
columnas seleccionadas
+
Media margen
+
Total PUC
+
Total PVP
+
botón Imprimir
```

Reglas implementadas:

- usa exclusivamente valores persistidos;
- no conoce drafts;
- el snapshot queda fijado al abrir la ventana;
- cambiar después filtros/drafts en la ventana principal no altera la vista abierta;
- no incluye `Opciones`;
- no abre automáticamente el diálogo de impresión;
- el botón propio `Imprimir` abre el diálogo estándar del sistema;
- configuración inicial A4 apaisado;
- no usa impresora térmica;
- cabecera de tabla preparada para repetirse entre páginas;
- preload mínimo;
- superficie IPC reducida;
- autorización de IPC ligada al `webContents.id` de la ventana.

Durante la integración de 15G se corrigieron además dos registros IPC duplicados accidentales en `application-composition.ts` (`registerApplicationIpc` y `registerArticulosIpc`). El composition root vuelve a registrar una única vez cada superficie IPC.

## 7.1.10 Regresión final

15H queda cerrado.

Se añadieron tests de regresión específicos para:

- escritura reducida;
- categorías;
- stock negativo;
- histórico manual de stock;
- código adicional;
- unicidad global de códigos;
- atomicidad real de Guardar todos;
- rollback;
- baja lógica;
- conservación del histórico;
- validaciones de `AlmacenService`.

Durante esta regresión se detectó un bug real en la validación de códigos alfanuméricos:

```text
codigo alfanumérico
→ numericCode = null
→ acceso_directo = null
→ null === null
→ falso positivo de colisión
```

Se corrigió exigiendo que `numericCode !== null` antes de compararlo con localizador/acceso directo.

Tras la corrección:

```text
tests Electron       ✅
build Electron       ✅
tests Angular        ✅
build Angular        ✅
lint                  ✅
regresión funcional  ✅
```

Inventario queda oficialmente:

```text
✅ CERRADO
```

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

Configuración inicial:

```text
Categoría        → oculta
Precio albarán   → oculto
resto de columnas de datos → visibles
Opciones         → siempre visible
```

---

# 12. Inventario — edición inline

Cada fila trabaja con:

```text
snapshot persistido
+
draft local
```

## 12.1 Foco y confirmación

En campos numéricos/textuales editables:

```text
focus
→ seleccionar todo el contenido
```

La escritura no modifica el draft en cada pulsación.

La confirmación se realiza mediante:

```text
blur
o
Intro
```

Al confirmar:

```text
validar
→ actualizar draft
→ recalcular valores derivados
→ actualizar dirty
→ actualizar totales
```

Al pulsar `Intro`:

```text
confirmar
→ saltar al mismo campo editable de la fila inferior
→ seleccionar todo
```

El objetivo es reproducir un flujo de trabajo tipo hoja de cálculo para edición rápida de columnas.

En la última fila visible, `Intro` confirma pero no cambia automáticamente de página.

## 12.2 Dirty

Si una celda cambia realmente tras confirmar:

```text
celda dirty
→ fondo resaltado
→ fila dirty
→ Reset habilitado
→ Guardar habilitado
```

Entrar y salir de un editor sin modificar el valor no genera dirty.

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

Está implementado como operación atómica:

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

Está implementada la misma semántica de histórico manual ya existente en Artículos.

Guardar una fila modifica únicamente los campos reducidos de Inventario y no reescribe innecesariamente toda la ficha de artículo.

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

El backend respeta la unicidad global de códigos activos y evita también colisiones comerciales con localizador/acceso directo.

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

En la pantalla principal, los totales se actualizan con los drafts al confirmar la edición:

```text
editar Stock / PUC / PVP
→ blur o Intro
→ actualizar draft
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
Exportar CSV
```

Está implementada mediante una consulta de reporte persistida.

Usa:

```text
mismos filtros actuales
+
solo columnas seleccionadas
+
solo valores persistidos
+
todas las filas filtradas
```

No exporta drafts sin guardar.

No exporta columna `Opciones`.

No se limita a la página actual.

Formato:

```text
UTF-8 + BOM
separador ;
coma decimal
```

El archivo se guarda mediante diálogo nativo del sistema.

---

# 22. Inventario — vista de impresión

Acción global:

```text
Imprimir
```

Está implementada con este flujo:

```text
clic Imprimir
→ obtener snapshot persistido
→ abrir BrowserWindow independiente
→ tabla limpia
→ columnas seleccionadas
→ filas filtradas persistidas
→ totales
→ botón Imprimir
→ diálogo normal del sistema
```

El diálogo no se lanza automáticamente al abrir.

No usa impresora térmica.

La ventana de impresión no replica navegación, filtros ni controles de edición de la aplicación.

La configuración inicial de impresión es:

```text
A4 apaisado
```

sin impedir que el usuario cambie opciones en el diálogo estándar.

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

No se reutiliza directamente el guardado completo de `ArticulosRepository.update()`.

Inventario dispone de dominio específico y reducido.

Estado actual:

```text
AlmacenRepository
  searchInventario()
  saveInventarioRows()
  deactivateArticulo()
```

La capa application expone además:

```text
saveInventarioRow()
saveInventarioRows()
deactivateArticulo()
```

La lectura está optimizada para tabla masiva y evita N+1.

La escritura modifica únicamente:

```text
categorías
stock
precio albarán
PUC
PVP
margen
código adicional nuevo
```

según los cambios reales.

Pendiente para reportes:

```text
getInventarioReport()
```

que se abordará con CSV / impresión.

---

# 24. Hoja de ruta Hito 15

## 15A — Base de Almacén

```text
✅ CERRADO
```

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

```text
✅ CERRADO
```

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

```text
✅ CERRADO
```

Implementado:

- filtros;
- selector columnas;
- tabla;
- paginación;
- totales;
- estados loading/error/empty;
- toolbar compacta en una línea;
- acciones globales con icon buttons;
- Categoría y Precio albarán ocultos por defecto.

Los filtros consultan backend.

No se filtran miles de artículos en Angular.

---

## 15D — Drafts inline + cálculos

```text
✅ CERRADO
```

Implementado:

- snapshot persistido;
- draft por fila;
- selección de input al foco;
- confirmación por blur / Intro;
- navegación vertical tipo Excel con Intro;
- identidad de filas estable mediante trackBy;
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

```text
✅ CERRADO
```

Implementado:

```text
Guardar fila
Guardar todos
Baja
Código adicional
Histórico de stock
```

`Guardar todos` es atómico.

La persistencia:

- usa escritura reducida;
- valida categorías activas;
- respeta unicidad global de códigos;
- evita segundo código adicional;
- conserva stock negativo;
- genera histórico manual de stock;
- realiza baja lógica de artículo y códigos;
- reconcilia posibles fichas abiertas en `ArticulosService` sin sobrescribir cambios locales dirty.

---

## 15F — CSV

```text
✅ CERRADO
```

Implementado:

```text
filtros actuales
+
columnas seleccionadas
+
todas las filas filtradas
+
valores persistidos
+
sin drafts
→ diálogo nativo Guardar como
→ CSV UTF-8 con BOM
```

La consulta de reporte se comparte con 15G.

---

## 15G — Vista de impresión

```text
✅ CERRADO
```

Implementado:

```text
snapshot persistido
→ BrowserWindow independiente
→ tabla limpia
→ columnas seleccionadas
→ todas las filas filtradas
→ Media margen
→ Total PUC
→ Total PVP
→ botón Imprimir
→ diálogo estándar
```

La ventana usa preload mínimo, superficie IPC reducida y autorización por `webContents.id`.

Impresión:

```text
A4 apaisado por defecto
no térmica
no diálogo automático al abrir
```

---

## 15H — Integración + regresión Inventario

```text
✅ CERRADO
```

Validado:

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
- Categoría y Precio albarán están ocultos por defecto.
- La barra superior de Inventario se mantiene compacta en una sola línea en escritorio.
- Las acciones globales usan botones de icono.
- Los inputs no confirman en cada pulsación.
- `blur` confirma una edición.
- `Intro` confirma y avanza al mismo campo de la fila inferior.
- Entrar/salir sin cambio no genera dirty.
- Las filas de tabla mantienen identidad estable por artículo para no perder foco.
- Los drafts sobreviven a cambios de página.
- Guardar fila y Guardar todos ya están implementados.
- Guardar todos es transaccional y sin éxito parcial.
- El histórico manual de stock conserva la semántica del módulo Artículos.
- La baja lógica desactiva también códigos activos.
- La persistencia desde Inventario reconcilia fichas abiertas de Artículos preservando cambios locales pendientes.
- CSV usa una consulta de reporte persistida compartida con impresión.
- CSV usa UTF-8 con BOM, `;` y coma decimal.
- CSV exporta códigos adicionales activos reales, no el check visual.
- La vista de impresión recibe un snapshot persistido al abrirse.
- La vista de impresión no cambia aunque después cambien filtros o drafts en la ventana principal.
- La impresión usa BrowserWindow independiente, preload mínimo e IPC restringido por `webContents.id`.
- La impresión parte de A4 apaisado y usa el diálogo estándar del sistema.

# 26. Caducidades — requisitos cerrados

Caducidades es un registro histórico de mercancía retirada por vencimiento y del valor económico perdido por la tienda.

No es la misma funcionalidad que:

```text
articulo.fecha_caducidad
```

La pestaña registra hechos ya ocurridos:

```text
X unidades de este artículo se han retirado
porque han caducado
```

Es un CRUD sin actualización:

```text
Create
Read
Delete
```

No existe edición de registros.

Una entrada incorrecta se elimina y, si procede, se crea otra correctamente.

## 26.1 Modelo histórico / snapshot

Cada caducidad debe conservar un snapshot de todos los datos utilizados por esta funcionalidad en el momento del alta.

Debe conservar al menos:

```text
id artículo
localizador
id marca
nombre marca
nombre artículo
unidades
PUC unitario
PVP unitario
fecha de baja
```

Además conserva:

```text
public_id
created_at
updated_at
deleted_at
```

y puede mantenerse `observaciones` aunque inicialmente no exista UI para editarlo.

El objetivo es que cambios posteriores en:

```text
nombre artículo
localizador
marca
PUC
PVP
```

no alteren el histórico de pérdidas.

Ejemplo:

```text
hoy:
  artículo = Pienso Adulto
  PUC      = 8,00 €
  PVP      = 12,00 €

caducidad registrada
→ queda congelada con esos valores

dentro de seis meses:
  nombre cambia
  PUC = 10,00 €
  PVP = 15,00 €

registro antiguo
→ sigue mostrando Pienso Adulto
→ sigue usando 8,00 € / 12,00 €
```

La SQLite actual ya dispone de una tabla conceptual `merma_caducidad`, pero durante 15I.1 debe ampliarse para soportar el snapshot completo acordado.

Durante desarrollo pre-estable:

```text
DATABASE_SCHEMA_VERSION = 1
sin migraciones
```

Si el cambio de esquema resulta incompatible:

```text
borrar SQLite local
→ reimportar .otpv
```

La importación legacy debe revisarse en 15I.1 para construir correctamente los snapshots históricos a partir de los datos realmente disponibles en el exportado.

## 26.2 Fecha

El usuario no introduce una fecha de caducidad.

La fecha funcional es:

```text
momento en el que se registra la pérdida
```

Año y mes de filtros/informe corresponden a ese momento.

Para registros nuevos:

```text
fecha_baja
≈
created_at
```

`fecha_baja` será el timestamp de negocio utilizado para filtros, ordenación y agrupaciones.

## 26.3 Stock e histórico

Crear una caducidad afecta al stock.

Ejemplo:

```text
stock actual = 10
caducidad    = 3
→ stock final = 7
```

La operación debe ser atómica:

```text
crear merma_caducidad
+
restar unidades al stock
+
crear historico_articulo
→ COMMIT
```

Si falla cualquier paso:

```text
ROLLBACK completo
```

El histórico debe identificar semánticamente que el movimiento procede de una caducidad.

No reutilizar silenciosamente un tipo incorrecto si existe o debe definirse un tipo específico.

El movimiento registra conceptualmente:

```text
stock previo
diferencia negativa
stock final
PUC snapshot
PVP snapshot
motivo caducidad
```

Las unidades introducidas deben ser:

```text
entero
> 0
```

No se bloqueará el alta porque las unidades superen el stock actual.

El dominio admite stock negativo y una caducidad puede evidenciar una discrepancia real de inventario.

## 26.4 Eliminación / reversión

Eliminar una caducidad significa corregir un registro incorrecto.

La eliminación será lógica:

```text
deleted_at != null
```

No se borra físicamente el histórico de caducidades.

Al eliminar:

```text
soft-delete caducidad
+
devolver unidades al stock
+
crear histórico inverso de stock
→ misma transacción
```

Ejemplo:

```text
stock actual      = 7
caducidad borrada = 3
→ stock final     = 10
```

El histórico inverso usa la semántica de reversión de la caducidad original.

Una caducidad ya eliminada no puede revertirse dos veces.

La reversión debe seguir siendo posible aunque el artículo esté dado de baja lógicamente, ya que la fila del artículo se conserva como histórico.

Tras alta o eliminación se debe reconciliar cualquier ficha abierta del artículo, reutilizando el patrón existente de `ArticulosService` y preservando cambios locales dirty.

## 26.5 Pantalla principal

La pestaña:

```text
Almacén
→ Caducidades
```

deja de ser placeholder.

Barra superior:

```text
[Año] [Mes] [Marca] [Nombre artículo]
                        [Añadir caducidad] [Crear informe]
```

El aspecto debe seguir el lenguaje visual actual de Almacén/Inventario, no copiar literalmente el TPV antiguo.

Filtros:

```text
Año
Mes
Marca
Nombre artículo
```

Reglas:

- Año: año de `fecha_baja`.
- Mes: mes de `fecha_baja`.
- Marca: usa la identidad histórica del registro.
- Nombre: busca sobre el nombre snapshot.
- filtros combinables;
- consulta en SQLite;
- no filtrar el dataset completo en Angular.

Mes puede utilizarse con o sin año.

Los filtros disponibles deben permitir seguir accediendo a marcas históricas presentes en caducidades aunque una marca haya sido posteriormente desactivada.

## 26.6 Tabla

Columnas:

```text
Localizador
Marca
Nombre
Unidades
PVP
PUC
Total PVP
Opciones
```

Valores:

```text
PVP       = precio unitario snapshot
PUC       = precio unitario snapshot
Total PVP = unidades × PVP
```

`Opciones` contiene únicamente:

```text
Eliminar
```

No hay edición inline.

Antes de eliminar debe existir confirmación.

Orden por defecto:

```text
fecha_baja DESC
id DESC
```

de forma que los registros más recientes aparezcan primero.

## 26.7 Paginación y totales

La consulta principal será paginada en SQLite.

Tamaños previstos:

```text
20
50
100
200
```

Valor inicial recomendado:

```text
50
```

Los totales se calculan sobre todo el conjunto filtrado, nunca solo sobre la página visible.

Pie:

```text
Total unidades
Total PVP
Total PUC
```

Fórmulas:

```text
Total unidades = Σ unidades

Total PVP =
Σ (unidades × PVP unitario snapshot)

Total PUC =
Σ (unidades × PUC unitario snapshot)
```

Estos totales representan el valor económico histórico perdido.

## 26.8 Modal “Añadir caducidad”

No reutilizar el aspecto visual del modal antiguo.

Crear un modal compacto y coherente con la aplicación actual.

Contenido conceptual:

```text
Buscar artículo
↓
lista de coincidencias

artículo seleccionado
  localizador
  marca
  nombre
  stock actual
  PUC actual
  PVP actual

Unidades [   ]

[Cancelar] [Añadir]
```

Solo se pueden seleccionar artículos activos.

El buscador debe reutilizar patrones/servicios de búsqueda de artículos existentes siempre que encajen.

Búsqueda recomendada:

```text
localizador
nombre
referencia
código de barras
```

Al confirmar:

```text
leer artículo persistido actual
→ construir snapshot
→ crear caducidad
→ restar stock
→ histórico
→ cerrar modal
→ refrescar lista/totales
```

No confiar en precios o stock enviados únicamente desde el renderer: el backend debe volver a leer el estado canónico del artículo al persistir.

## 26.9 Informe

Botón:

```text
Crear informe
```

Debe respetar exactamente los filtros activos de la pantalla en el momento del clic.

Flujo:

```text
filtros actuales
→ consulta agregada persistida
→ snapshot
→ BrowserWindow independiente
```

No agrupar miles de registros en Angular si SQLite puede devolver el agregado directamente.

La jerarquía es:

```text
Año
  Mes
    Marca
```

Columnas:

```text
Descripción
Unidades
PVP
PUC
```

En el informe:

```text
PVP = valor total perdido de venta
PUC = valor total perdido de compra
```

No son precios unitarios.

Cada nivel contiene sus agregados:

```text
Año
→ unidades / PVP / PUC del año

Mes
→ unidades / PVP / PUC del mes

Marca
→ unidades / PVP / PUC de la marca
```

Al final:

```text
Totales generales
```

Orden:

```text
años   → más reciente a más antiguo
meses  → diciembre a enero
marcas → alfabético
```

Estado inicial:

```text
todos los años cerrados
todos los meses cerrados
```

Al abrir un año aparecen sus meses.

Al abrir un mes aparecen sus marcas.

El estado expandido/plegado vive únicamente en el renderer de la ventana de informe.

## 26.10 Impresión del informe

La BrowserWindow incluye un botón:

```text
Imprimir
```

No lanzar impresión automáticamente.

Al pulsarlo:

```text
imprimir exactamente el estado visible
```

Por tanto:

```text
año cerrado
→ sus meses no se imprimen

mes cerrado
→ sus marcas no se imprimen
```

No crear una segunda representación especial para papel.

La única adaptación de impresión necesaria es evitar que el propio botón `Imprimir` aparezca en la salida.

Usar:

```text
diálogo estándar del sistema
```

No usar impresora térmica.

No forzar una maquetación compleja específica de impresión.

## 26.11 Arquitectura prevista

Caducidades tendrá dominio propio dentro de Almacén.

Conceptualmente:

```text
CaducidadesRepository
  search()
  create()
  deactivate()
  getFilterOptions()
  getReport()
```

o equivalente integrado en `AlmacenRepository` si al revisar `main` resulta más coherente, evitando crear capas artificiales.

La lectura principal debe devolver conceptualmente:

```text
rows
totalRows
totalUnidades
totalPvpCents
totalPucMicros
```

El reporte debe devolver datos ya agrupados:

```text
years[]
  months[]
    brands[]
```

con sus acumulados.

Alta y baja necesitan transacciones SQLite.

La vista de informe reutilizará el patrón seguro ya establecido por Inventario:

```text
BrowserWindow independiente
preload mínimo
IPC reducido
snapshot persistido
```

## 26.12 Mini-hitos

### 15I.1 — Dominio + esquema

```text
⬅️ SIGUIENTE
```

- revisar `merma_caducidad` actual;
- ampliar snapshot histórico;
- revisar importación legacy;
- contratos;
- repository/application base;
- definir semántica del histórico de stock;
- tests de esquema/importación;
- mantener schema version 1.

### 15I.2 — Consulta + filtros + totales

- consulta paginada;
- año;
- mes;
- marca;
- nombre;
- opciones de filtros;
- totales globales filtrados;
- tests SQL.

### 15I.3 — Pantalla principal

- activar pestaña;
- filtros;
- tabla;
- paginación;
- totales;
- loading/error/empty;
- botón Añadir;
- botón Informe.

### 15I.4 — Alta de caducidad

- modal nuevo;
- buscador de artículos;
- selección;
- unidades;
- snapshot backend;
- decremento stock;
- histórico;
- transacción;
- reconciliación Artículos.

### 15I.5 — Baja / reversión

- confirmación;
- soft-delete;
- restaurar stock;
- histórico inverso;
- transacción;
- protección contra doble reversión;
- reconciliación Artículos.

### 15I.6 — Informe agrupado

- consulta filtrada agregada;
- Año → Mes → Marca;
- orden cerrado;
- totales por nivel;
- todos cerrados inicialmente;
- BrowserWindow.

### 15I.7 — Impresión + regresión

- botón Imprimir;
- diálogo estándar;
- imprimir estado expandido visible;
- ocultar botón en papel;
- tests finales;
- batería completa;
- regresión funcional;
- cerrar Caducidades.

---

# 27. Próximo bloque exacto

```text
15I.1 — Dominio + esquema de Caducidades
```

Antes de proponer cambios:

1. revisar `main` actual;
2. revisar esquema actual de `merma_caducidad`;
3. revisar cómo se importan actualmente las caducidades legacy;
4. revisar `historico_articulo` y sus tipos/consumidores;
5. revisar patrón de transacciones usado en Inventario;
6. revisar reconciliación con fichas abiertas de Artículos;
7. mantener `DATABASE_SCHEMA_VERSION = 1`;
8. no introducir migraciones pre-estable;
9. no activar todavía UI completa;
10. añadir tests antes de avanzar a 15I.2.

Resultado esperado:

```text
modelo histórico definitivo
+
snapshot completo
+
contratos
+
persistencia base preparada
+
importación legacy compatible
```

No empezar Imprenta hasta cerrar Caducidades.

---

# 28. Prompt de relevo

Si este chat alcanza el límite, continuar con este contexto:

```text
Estamos desarrollando Osumi TPV Client.
La base de continuidad es el documento v2.45 + el main actual del repositorio.

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
- Hito 15 Almacén en desarrollo.
- Almacén tiene tres pestañas: Inventario, Caducidades, Imprenta.
- desarrollar ahora solo Inventario.
- Caducidades e Imprenta quedan como placeholders.
- 15A Base Almacén cerrado.
- 15B Dominio + consulta Inventario cerrado.
- 15C Pantalla Inventario cerrado.
- 15D Drafts inline + cálculos cerrado.
- 15E Persistencia cerrado.
- 15F CSV cerrado.
- 15G Vista de impresión cerrado.
- 15H Integración + regresión Inventario cerrado.
- Inventario oficialmente cerrado.
- Caducidades funcionalmente definido y dividido en 15I.1–15I.7.
- Imprenta sigue placeholder.
- siguiente punto exacto: 15I.1 Dominio + esquema de Caducidades.

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
- edición textual confirmada en blur/Intro;
- Intro salta al mismo campo de la fila inferior;
- Categoría y Precio albarán ocultos por defecto;
- toolbar compacta de una sola línea con acciones icon button;
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

Caducidades — decisiones cerradas:
- CRUD sin Update.
- filtros: año de baja, mes de baja, marca histórica, nombre snapshot.
- tabla: Localizador, Marca, Nombre, Unidades, PVP unitario, PUC unitario, Total PVP, Opciones.
- totales globales: unidades, Σ unidades×PVP, Σ unidades×PUC.
- snapshot histórico de artículo/marca/localizador/nombre/PUC/PVP.
- alta resta stock y crea histórico en una transacción.
- unidades > 0; se permite superar stock y dejar stock negativo.
- baja es soft-delete, restaura stock y crea histórico inverso en una transacción.
- alta/baja reconcilian fichas abiertas de Artículos preservando dirty.
- informe respeta filtros actuales.
- informe agrupado Año → Mes → Marca.
- años desc, meses desc, marcas alfabéticas.
- años y meses cerrados por defecto.
- informe en BrowserWindow independiente con snapshot persistido.
- botón Imprimir; imprime exactamente el estado expandido visible.
- no impresora térmica; diálogo estándar.
- Imprenta no se diseña todavía.

Roadmap:
15A Base Almacén ✅
15B Dominio + consulta Inventario ✅
15C Pantalla Inventario ✅
15D Drafts inline + cálculos ✅
15E Persistencia ✅
15F CSV ✅
15G Vista impresión ✅
15H Integración + regresión Inventario ✅
15I Caducidades 🟦 PLANIFICADO
  15I.1 Dominio + esquema ⬅️ SIGUIENTE
  15I.2 Consulta + filtros + totales
  15I.3 Pantalla principal
  15I.4 Alta
  15I.5 Baja / reversión
  15I.6 Informe agrupado
  15I.7 Impresión + regresión
15J Imprenta placeholder
```

---

# 29. Historial de continuidad

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

v2.43
→ 15A Base de Almacén cerrado
→ 15B Dominio + consulta Inventario cerrado
→ 15C Pantalla Inventario cerrado
→ toolbar compacta en una línea
→ Categoría y Precio albarán ocultos por defecto
→ 15D Drafts inline + cálculos cerrado
→ confirmación por blur/Intro
→ navegación vertical tipo Excel con Intro
→ dirty y Reset validados
→ totales reactivos con drafts
→ 15E Persistencia cerrado
→ Guardar fila y Guardar todos implementados
→ Guardar todos atómico
→ histórico manual de stock
→ código adicional con unicidad global
→ baja lógica
→ reconciliación con fichas abiertas de Artículos
→ siguiente bloque exacto: 15F CSV

v2.44
→ 15F CSV cerrado
→ consulta de reportes persistida y reutilizable
→ CSV con filtros actuales + columnas seleccionadas + todas las filas filtradas
→ CSV solo usa persistido, nunca drafts
→ UTF-8 con BOM, separador ; y coma decimal
→ 15G Vista de impresión cerrada
→ BrowserWindow independiente con snapshot persistido
→ columnas seleccionadas + todas las filas filtradas + tres totales
→ botón Imprimir y diálogo estándar del sistema
→ A4 apaisado por defecto
→ preload mínimo e IPC restringido por webContents.id
→ corregidos registros IPC duplicados accidentales en composition root
→ siguiente bloque exacto: 15H Integración + regresión Inventario

v2.45
→ 15H Integración + regresión Inventario cerrado
→ tests de persistencia/rollback/baja/códigos reforzados
→ corregido falso positivo null===null en barcode alfanumérico
→ Inventario oficialmente CERRADO
→ requisitos de Caducidades cerrados
→ snapshot histórico completo de artículo/marca/precios
→ alta resta stock + histórico de stock
→ baja lógica restaura stock + histórico inverso
→ alta/baja atómicas
→ filtros Año/Mes/Marca/Nombre
→ tabla con Total PVP por línea
→ totales globales filtrados
→ informe respeta filtros y agrupa Año → Mes → Marca
→ años/meses cerrados por defecto
→ impresión del estado visible mediante BrowserWindow
→ Caducidades dividido en 15I.1–15I.7
→ Imprenta continúa placeholder
→ siguiente bloque exacto: 15I.1 Dominio + esquema
```
