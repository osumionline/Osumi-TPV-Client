# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.49  
**Fecha:** 9 de septiembre de 2026  
**Base de continuidad:** `v2.49 + main` una vez este documento se suba al repositorio.

---

# 1. Estado general del proyecto

TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**.

El **Hito 13 — Artículos** está completamente terminado, validado y subido al repositorio ✅.

El **Hito 14 — Clientes** queda oficialmente **✅ CERRADO** tras completar la regresión integral final. No queda funcionalidad conocida pendiente dentro de este hito.

El **Hito 15 — Almacén** queda oficialmente **✅ CERRADO** tras completar Inventario, Caducidades e Imprenta y ejecutar la regresión funcional final de los tres subapartados.

Se divide funcionalmente en tres pestañas independientes:

```text
Inventario
Caducidades
Imprenta
```

Estado definitivo:

```text
Inventario   → ✅ CERRADO
Caducidades  → ✅ CERRADO
Imprenta     → ✅ CERRADO (beta física)
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

Caducidades queda también completamente cerrado tras completar:

```text
15I.1 Dominio + esquema
15I.2 Consulta + filtros + totales
15I.3 Pantalla principal
15I.4 Alta de caducidad
15I.5 Baja / reversión
15I.6 Informe agrupado
15I.7 Impresión + regresión
```

Durante `15I.5` se añadió la reversión transaccional de una caducidad, restaurando stock y creando histórico inverso tipo 7. La vista de histórico de Artículos se actualizó para mostrar `Caducidad` en lugar de `Tipo 7`.

Durante `15I.6–15I.7` se añadió el informe histórico agrupado `Año → Mes → Marca` en BrowserWindow independiente, con snapshot persistido, estado expandido local e impresión exacta del estado visible mediante diálogo estándar.

Antes de iniciar el **Hito 16 — Compras** se abre una **pausa técnica de refactorización y orden arquitectónico**. Su objetivo es convertir lo aprendido en Almacén en una convención reutilizable para Compras y siguientes desarrollos.

El siguiente punto exacto es:

```text
REF.1 — Constantes y utilidades compartidas
```

Imprenta queda funcionalmente cerrada como diseñador efímero de una única página A4 de etiquetas. Se mantiene la consideración **beta física** únicamente para futuros ajustes de márgenes/calibración cuando se pruebe con impresora y hojas reales.

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

15 Almacén                                        ✅ HITO CERRADO
  15A Base de Almacén                             ✅
  15B Dominio + consulta Inventario               ✅
  15C Pantalla Inventario                         ✅
  15D Drafts inline + cálculos                    ✅
  15E Persistencia                                ✅
  15F CSV                                         ✅
  15G Vista de impresión                          ✅
  15H Integración + regresión Inventario          ✅
  15I Caducidades                                 ✅ CERRADO
    15I.1 Dominio + esquema                       ✅
    15I.2 Consulta + filtros + totales            ✅
    15I.3 Pantalla principal                      ✅
    15I.4 Alta de caducidad                       ✅
    15I.5 Baja / reversión                        ✅
    15I.6 Informe agrupado                        ✅
    15I.7 Impresión + regresión                   ✅
  15J Imprenta                                    ✅ CERRADO
    15J.1 Base + búsqueda                         ✅
    15J.2 Diseñador efímero                       ✅
    15J.3 Previsualización + capacidad            ✅
    15J.4 Snapshot + ventana de impresión         ✅
    15J.5 Impresión + regresión beta              ✅

REF Pausa técnica pre-Hito 16                    🟦 EN DESARROLLO
  REF.1 Constantes y utilidades compartidas       ⬅️ SIGUIENTE
  REF.2 Convención *.private.ts                   ⬜
  REF.3 Reorganización estructural de Almacén     ⬜
  REF.4 Backend por subdominio                    ⬜
  REF.5 Revisión de hotspots                      ⬜
  REF.6 Cierre + convención arquitectónica        ⬜

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

Estado definitivo:

```text
Inventario   → ✅ CERRADO
Caducidades  → ✅ CERRADO
Imprenta     → ✅ CERRADO (beta física)
```

Los tres dominios quedan funcionalmente cerrados. No deben reabrirse sin un requisito nuevo. La única deuda explícita de Imprenta es la calibración física opcional cuando existan pruebas con impresora/hojas reales; no bloquea el cierre del hito.

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

`Inventario`, `Caducidades` e `Imprenta` son pestañas funcionales cerradas. El Hito 15 no tiene subapartados activos.

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

Estado funcional **al cerrar 15A**:

```text
Inventario   → contenedor inicial
Caducidades  → placeholder
Imprenta     → placeholder
```

En aquel mini-hito todavía no se desarrolló lógica de negocio; el estado actual de cada pestaña se recoge al inicio de este documento.

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
✅ CERRADO
```

Implementado y validado de extremo a extremo:

```text
snapshot histórico
consulta + filtros + totales
alta transaccional
baja / reversión transaccional
histórico tipo 7
informe Año → Mes → Marca
BrowserWindow independiente
impresión del estado visible
regresión integral
```

---

## 15J — Imprenta

```text
✅ CERRADO
```

Implementado y validado de extremo a extremo:

```text
búsqueda de artículos
artículos + cantidades + huecos
drag & drop
previsualización A4
capacidad de una única página
snapshot canónico
BrowserWindow independiente
diálogo estándar de impresión
regresión integral
```

Mini-hitos cerrados:

```text
15J.1 Base + búsqueda                         ✅
15J.2 Diseñador efímero                      ✅
15J.3 Previsualización + capacidad           ✅
15J.4 Snapshot + ventana de impresión        ✅
15J.5 Impresión + regresión beta             ✅
```

La funcionalidad queda cerrada. Solo permanece como pendiente no bloqueante la calibración física futura con impresora y hojas reales, si fuese necesaria.

---

# 25. Decisiones de Inventario que no deben reabrirse sin requisito nuevo

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

# 25.1 Caducidades — estado implementado hasta v2.48

## 25.1.1 15I.1 — Dominio + esquema ✅

Cerrado y validado.

`merma_caducidad` conserva snapshot histórico de:

```text
id artículo
localizador
id marca
nombre marca
nombre artículo
unidades
PUC
PVP
fecha de baja
```

Se mantiene:

```text
DATABASE_SCHEMA_VERSION = 1
sin migraciones pre-release
```

La importación legacy se corrigió para enriquecer las caducidades que ya importaba `LegacyImportCatalogImporter`, evitando una segunda importación duplicada.

Para caducidades legacy:

```text
PUC / PVP / fecha
→ históricos reales del origen

localizador / marca / nombre
→ mejor snapshot reconstruible desde el catálogo importado
```

La importación legacy:

```text
NO resta stock
NO crea historico_articulo tipo 7
```

porque el stock del `.otpv` ya representa el estado real del TPV antiguo.

Se añadió:

```text
HISTORICO_ARTICULO_TIPO.CADUCIDAD = 7
```

para las caducidades nuevas del cliente.

## 25.1.2 15I.2 — Consulta + filtros + totales ✅

Cerrado y validado.

Lectura disponible de extremo a extremo:

```text
SQLite
→ TypeOrmAlmacenRepository
→ AlmacenService
→ IPC
→ preload
→ AlmacenService Angular
```

Operaciones:

```text
searchCaducidades()
getCaducidadFilterOptions()
```

Filtros:

```text
Año
Mes
Marca histórica
Nombre snapshot
```

Reglas:

- Año/Mes usan `fecha_baja`.
- Mes puede utilizarse sin Año.
- Marca filtra por `id_marca_snapshot`.
- Nombre busca sobre `articulo_nombre_snapshot`.
- Las marcas históricas continúan disponibles aunque ya no existan/estén activas en el catálogo actual.
- La página y los agregados se consultan por separado.
- No existe N+1.

Resultado:

```text
rows
totalRows
totalUnidades
totalPvpCents
totalPucMicros
```

## 25.1.3 15I.3 — Pantalla principal ✅

Cerrado y validado.

La pestaña real:

```text
Almacén → Caducidades
```

ya muestra:

```text
[Año] [Mes] [Marca] [Nombre]
                     [Añadir caducidad] [Crear informe]

Localizador | Marca | Nombre | Unidades | PVP | PUC | Total PVP | Opciones
```

Incluye:

- filtros remotos;
- debounce en Nombre;
- paginación 20/50/100/200;
- 50 filas por defecto;
- loading/error/empty;
- totales globales filtrados;
- orden por fecha más reciente;
- botón Añadir visible;
- botón Crear informe todavía deshabilitado;
- opción Eliminar todavía deshabilitada.

## 25.1.4 15I.4 — Alta de caducidad ✅

Cerrado y validado.

La arquitectura de alta está implementada de extremo a extremo.

Contrato renderer:

```text
idArticulo
unidades
```

El renderer no envía snapshots ni precios canónicos.

El backend relee el artículo dentro de la transacción y crea:

```text
merma_caducidad con snapshot
+
stock -= unidades
+
historico_articulo tipo 7
→ COMMIT
```

El histórico queda vinculado mediante:

```text
id_merma_caducidad
```

Existe buscador específico por:

```text
localizador
nombre
referencia
código de barras
```

Solo devuelve artículos:

```text
activos
+
stock > 0
```

La misma condición se vuelve a comprobar en backend al confirmar, leyendo el stock canónico dentro de la transacción.

Regla definitiva de unidades:

```text
1 <= unidades <= stock disponible
```

Por tanto una nueva caducidad no puede provocar por sí misma stock negativo.

Ejemplos:

```text
stock 5
unidades 5
→ permitido
→ stock final 0

stock 5
unidades 6
→ rechazado
→ no caducidad
→ no histórico
→ stock intacto
```

El modal nuevo queda cerrado con:

- autofocus programático real al abrir en `Buscar artículo`;
- resultados limitados a artículos con stock positivo;
- selección clara del artículo;
- Stock / PUC / PVP / Unidades en una sola fila en escritorio;
- validación visual si las unidades superan el stock;
- botón Añadir deshabilitado mientras el valor sea inválido;
- responsive en resoluciones menores;
- backdrop accesible implementado mediante botón real, sin handlers `click` sobre elementos no interactivos;
- lint Angular limpio.

El alta:

```text
relee artículo canónico
→ valida activo
→ valida stock > 0
→ valida unidades <= stock
→ snapshot
→ INSERT merma_caducidad
→ UPDATE stock
→ INSERT historico_articulo tipo 7
→ COMMIT
```

Si falla cualquier paso:

```text
ROLLBACK completo
```

También se reconcilian fichas abiertas de Artículos usando el mecanismo existente y preservando cambios locales dirty.

15I.4 queda oficialmente:

```text
✅ CERRADO
```


## 25.1.5 15I.5 — Baja / reversión ✅

Cerrado y validado.

Eliminar una caducidad realiza:

```text
confirmación
→ localizar caducidad activa
→ stock += unidades
→ histórico tipo 7 con diferencia positiva
→ soft-delete merma_caducidad
→ COMMIT
```

Reglas cerradas:

- no existe `DELETE` físico;
- una caducidad ya eliminada no puede revertirse de nuevo;
- la reversión funciona aunque el artículo esté dado de baja lógica;
- PUC/PVP del histórico inverso proceden del snapshot de la caducidad original;
- el histórico queda vinculado por `id_merma_caducidad`;
- cualquier fallo provoca rollback completo;
- se reconcilian fichas abiertas de Artículos preservando cambios locales dirty.

La vista de histórico de Artículos reconoce:

```text
HISTORICO_ARTICULO_TIPO.CADUCIDAD = 7
→ “Caducidad”
```

por lo que ya no aparece `Tipo 7`.

## 25.1.6 15I.6 — Informe agrupado ✅

Cerrado y validado.

El botón `Crear informe` usa exactamente los filtros visibles en el momento del clic y obtiene desde SQLite un snapshot persistido agrupado:

```text
Año DESC
  Mes DESC
    Marca A-Z
```

Cada nivel contiene:

```text
Unidades
PVP total perdido
PUC total perdido
```

La BrowserWindow es independiente y utiliza:

```text
preload mínimo
IPC reducido
autorización por webContents.id
snapshot inmutable
```

Todos los años y meses comienzan cerrados. El estado expandido vive exclusivamente en el renderer de la ventana.

## 25.1.7 15I.7 — Impresión + regresión ✅

Cerrado y validado.

La ventana del informe incorpora botón `Imprimir` y utiliza el diálogo estándar del sistema.

Regla principal:

```text
se imprime exactamente el DOM visible
```

Por tanto:

```text
año cerrado → no imprime sus meses
mes cerrado → no imprime sus marcas
```

El propio botón de impresión se oculta mediante CSS de impresión.

No usa impresora térmica y cancelar el diálogo no se trata como error.

Tras la batería completa y la regresión funcional:

```text
15I.7 ✅
15I — CADUCIDADES ✅ CERRADO
```

---

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

Solo pueden iniciarse nuevas caducidades sobre artículos cuyo stock canónico actual sea:

```text
stock > 0
```

Los artículos con stock `0` o negativo no deben aparecer como candidatos y el backend debe volver a validar esta condición al confirmar.

Regla definitiva de unidades:

```text
1 <= unidades <= stock canónico disponible
```

No se permite registrar más unidades caducadas que las realmente disponibles.

Por tanto:

```text
stock inicial = 5
unidades = 5
→ permitido
→ stock final = 0

stock inicial = 5
unidades = 6
→ rechazado
```

El stock negativo sigue siendo válido en el dominio general de artículos, pero una nueva caducidad no puede ser la operación que lo provoque.

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

[Stock actual] [PUC actual] [PVP actual] [Unidades]

[Cancelar] [Añadir]
```

Al abrirse el modal:

```text
focus inmediato → Buscar artículo
```

Solo se pueden seleccionar artículos activos con:

```text
stock > 0
```

El campo Unidades debe cumplir:

```text
1 <= unidades <= stock mostrado
```

y el backend vuelve a validar esta relación contra el stock canónico al guardar.

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
→ comprobar que sigue activo
→ comprobar que stock > 0
→ comprobar unidades <= stock
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
✅ CERRADO
```

### 15I.2 — Consulta + filtros + totales

```text
✅ CERRADO
```

### 15I.3 — Pantalla principal

```text
✅ CERRADO
```

### 15I.4 — Alta de caducidad

```text
✅ CERRADO
```

### 15I.5 — Baja / reversión

```text
✅ CERRADO
```

Implementado:

- confirmación;
- soft-delete;
- restauración de stock;
- histórico inverso tipo 7;
- PUC/PVP snapshot;
- transacción y rollback;
- protección contra doble reversión;
- reversión incluso con artículo soft-deleted;
- reconciliación Artículos.

### 15I.6 — Informe agrupado

```text
✅ CERRADO
```

Implementado:

- consulta filtrada agregada;
- Año → Mes → Marca;
- años y meses descendentes;
- marcas alfabéticas;
- totales por nivel y generales;
- niveles cerrados inicialmente;
- BrowserWindow segura con snapshot persistido.

### 15I.7 — Impresión + regresión

```text
✅ CERRADO
```

Implementado:

- botón Imprimir;
- diálogo estándar;
- impresión del estado expandido visible;
- botón oculto en papel;
- cancelación sin error;
- batería completa;
- regresión funcional final.

Caducidades queda oficialmente:

```text
✅ CERRADO
```

---

# 27. Imprenta — implementación final ✅ CERRADA

Imprenta es un diseñador efímero para preparar una única hoja A4 de etiquetas adhesivas.

No crea históricos ni persiste composiciones/configuración en SQLite.

Flujo definitivo:

```text
entrar en Imprenta
→ buscar artículos
→ construir lista de artículos/huecos
→ ordenar y ajustar cantidades
→ configurar hoja
→ previsualizar
→ Terminar
→ backend valida y relee artículos persistidos
→ snapshot canónico inmutable
→ BrowserWindow independiente
→ botón Imprimir
→ diálogo estándar
```

La primera versión se considera **beta** hasta poder probar físicamente distintas impresoras y hojas de etiquetas.

## 27.1 Distribución de la pantalla

La pestaña se divide en tres áreas:

```text
Izquierda  → Buscador
Centro     → Elementos seleccionados
Derecha    → Previsualización + configuración + acciones
```

El diseño debe seguir el lenguaje visual actual de Osumi TPV Client y usar la aplicación antigua únicamente como referencia funcional.

## 27.2 Buscador de artículos

Campo superior de texto con búsqueda remota por:

```text
nombre
localizador
códigos de barras activos
```

Reglas:

- solo artículos activos;
- debounce de búsqueda;
- seleccionar un resultado lo añade inmediatamente a la lista central;
- un artículo ya seleccionado no vuelve a aparecer en resultados;
- un mismo artículo solo puede existir una vez como elemento de la lista;
- el buscador debe devolver únicamente los datos necesarios para esta funcionalidad.

La infraestructura actual ya dispone de patrones de búsqueda de artículos reutilizables. Imprenta tendrá una consulta coherente con Almacén en lugar de acoplar su UI al dominio de Ventas.

## 27.3 Lista central / diseño efímero

El estado de la composición vive únicamente en Angular.

Cada elemento es uno de:

```text
Artículo
Hueco
```

### Artículo

Muestra:

```text
handle de arrastre
nombre
marca, si existe
cantidad
eliminar
```

Cantidad:

```text
entero >= 1
```

Cada artículo se repite en la previsualización tantas veces como indique su cantidad.

El elemento completo se mueve como un bloque al reordenarlo.

Eliminar artículo:

```text
requiere confirmación
```

### Hueco

Botón superior:

```text
Hueco
```

Cada pulsación añade exactamente un único elemento vacío.

Reglas:

- cada hueco ocupa una celda;
- cada hueco es reordenable;
- para varios huecos se pulsa varias veces;
- eliminar un hueco no requiere confirmación;
- en la previsualización puede identificarse visualmente como `HUECO`;
- en la salida final se imprime como celda completamente vacía.

## 27.4 Reordenación

Usar Angular CDK Drag & Drop.

El proyecto ya incluye `@angular/cdk`.

La lista ordenada es la fuente de verdad de la secuencia de impresión.

Ejemplo:

```text
Artículo A × 2
Hueco
Artículo B × 3
```

se aplana como:

```text
A | A | vacío | B | B | B
```

## 27.5 Configuración de página

Formato fijo:

```text
A4
```

Valores iniciales:

```text
Filas        = 5
Columnas     = 4
Orientación  = Vertical
Mostrar PVP  = Sí
```

Límites configurables mediante constantes:

```text
MAX_FILAS    = 10
MAX_COLUMNAS = 10
```

Los valores deben ser enteros positivos.

Orientaciones:

```text
Vertical
Horizontal
```

Cambiar orientación:

```text
NO intercambia filas y columnas
solo cambia la geometría A4 disponible
```

## 27.6 Capacidad

Capacidad de la única página:

```text
capacidad = filas × columnas
```

Ocupación:

```text
Σ cantidades de artículos
+
número de huecos
```

No existen páginas automáticas adicionales.

Si el usuario quiere más etiquetas:

```text
imprime otra tirada
o
limpia la lista y crea otro diseño
```

Al aumentar cantidades, no se debe permitir superar la capacidad vigente.

Si el usuario reduce filas/columnas y la composición existente deja de caber:

```text
conservar la composición
→ mostrar error visible
→ deshabilitar Imprimir
→ usuario corrige configuración o contenido
```

Nunca eliminar automáticamente elementos para hacerlos caber.

La previsualización siempre representa una única hoja con `filas × columnas` celdas.

## 27.7 Acción Limpiar

Debe existir una acción:

```text
Limpiar
```

Su efecto es exclusivamente:

```text
vaciar artículos + huecos
```

Debe conservar:

```text
filas
columnas
orientación
Mostrar PVP
```

Esto permite preparar rápidamente una nueva tirada manteniendo la misma hoja/configuración.

Imprimir no limpia automáticamente el diseño.

## 27.8 Previsualización

La parte derecha representa proporcionalmente una única hoja A4.

La cuadrícula usa:

```text
filas
columnas
orientación
```

Para esta primera versión beta:

```text
sin márgenes configurables
sin gutters configurables
sin plantillas físicas por fabricante
```

La cuadrícula ocupa conceptualmente todo el ancho y alto de A4.

La calibración física se revisará tras pruebas con impresora y hojas reales, ya que algunas impresoras pueden imponer áreas no imprimibles.

Celdas no utilizadas al final de la hoja permanecen vacías.

## 27.9 Etiqueta

Cada etiqueta de artículo contiene:

```text
QR del localizador
Nombre
Marca, solo si existe
PVP, solo si Mostrar PVP = Sí
```

El PVP utilizado es el PVP normal persistido (`pvpCents`), no el precio de descuento.

Propuesta inicial de composición:

```text
┌─────────────────────────────┐
│ ┌──────────┐  NOMBRE DEL    │
│ │          │  ARTÍCULO      │
│ │    QR    │                │
│ │          │  Marca         │
│ └──────────┘                │
│                    16,20 €  │
└─────────────────────────────┘
```

Criterios visuales:

- QR a la izquierda, aproximadamente 35–40 % del ancho disponible;
- nombre destacado y legible;
- marca secundaria y omitida completamente si está vacía;
- PVP destacado en la zona inferior derecha cuando esté activo;
- si PVP está desactivado, no reservar artificialmente su espacio;
- adaptación sencilla de tamaños al espacio de cada celda.

La previsualización y la salida final deben reutilizar la misma representación de etiqueta para minimizar diferencias WYSIWYG.

El proyecto ya dispone de `angularx-qrcode`, por lo que no se necesita introducir otra dependencia para generar QR. Preferencia inicial: SVG para conservar nitidez de impresión.

## 27.10 Datos canónicos al imprimir

La composición del renderer es efímera y puede conservar temporalmente datos de presentación para previsualizar.

Sin embargo, al pulsar Terminar:

```text
renderer envía:
  orden de elementos
  ids de artículos
  cantidades
  huecos
  filas
  columnas
  orientación
  mostrarPvp
```

El backend debe volver a leer los artículos persistidos seleccionados antes de crear el documento definitivo.

Datos canónicos de etiqueta:

```text
localizador
nombre
marca actual
PVP actual
```

No confiar en nombre/marca/PVP enviados por el renderer como fuente definitiva.

Si un artículo ya no existe o ya no está activo en ese momento:

```text
rechazar preparación de la impresión
→ no abrir documento parcial
→ informar al usuario
```

La salida final es un snapshot. Cambios posteriores en el diseñador o en los artículos no modifican una ventana de impresión ya abierta.

## 27.11 BrowserWindow de impresión

Flujo:

```text
Diseñador válido
→ snapshot canónico
→ BrowserWindow independiente
→ una única página A4
→ botón Imprimir
```

La ventana debe reutilizar el patrón seguro ya establecido por Inventario/Caducidades:

```text
preload mínimo
contextIsolation
sandbox
IPC reducido
autorización por webContents.id
```

No lanzar el diálogo automáticamente al abrir.

El botón de la BrowserWindow abre:

```text
diálogo estándar del sistema
```

No usar impresora térmica.

Configuración inicial de impresión:

```text
pageSize = A4
landscape = orientación === Horizontal
márgenes = ninguno / mínima adaptación beta
```

La impresión contiene exactamente una página.

El propio botón `Imprimir` no aparece en papel.

## 27.12 Persistencia

Imprenta no necesita nuevas tablas ni cambios de esquema.

No persistir:

```text
lista seleccionada
huecos
cantidades
filas
columnas
orientación
mostrar PVP
```

Por tanto:

```text
DATABASE_SCHEMA_VERSION = 1
```

permanece sin cambios.

## 27.13 Arquitectura implementada

La implementación final mantiene una API agregada de Almacén y añade piezas específicas de Imprenta.

Contratos compartidos principales:

```text
electron/contracts/almacen/imprenta-articulo.interface.ts
electron/contracts/almacen/imprenta-print.interface.ts
electron/contracts/almacen/imprenta-print-api.interface.ts
```

Backend/application:

```text
AlmacenService
  searchImprentaArticulos()
  getImprentaPrintArticulos()

ImprentaPrintService
  valida command
  relee datos canónicos
  expande cantidades/huecos
  rellena slots libres
  crea snapshot de una sola página
```

Persistencia actual:

```text
AlmacenRepository / TypeOrmAlmacenRepository
  searchImprentaArticulos()
  getImprentaPrintArticulos()
```

Renderer principal:

```text
ImprentaComponent
  búsqueda
  estado efímero
  selección única
  cantidades
  huecos
  drag & drop
  configuración
  capacidad
  preview A4
  acción Terminar
```

Salida independiente:

```text
ElectronImprentaPrintWindow
ImprentaPrintService
imprenta-print-preload
register-imprenta-print-ipc
ImprentaPrintComponent
```

Seguridad/aislamiento:

```text
contextIsolation = true
nodeIntegration = false
sandbox = true
preload mínimo
IPC autorizado por webContents.id
```

La BrowserWindow mantiene el snapshot en main process. El renderer de impresión solo puede obtener ese snapshot e iniciar la impresión estándar.

No se creó un componente visual compartido de etiqueta entre diseñador y ventana final; ambos renderers mantienen representaciones equivalentes adaptadas a su contexto. Este hecho no afecta al comportamiento cerrado y puede revisarse únicamente si aparece una necesidad real.

## 27.14 Mini-hitos

### 15J.1 — Base + búsqueda ✅

Implementado:

- pestaña Imprenta real;
- búsqueda por nombre, localizador y códigos de barras activos;
- artículos activos sin restricción de stock;
- exclusión backend de artículos ya seleccionados antes del límite de resultados;
- contratos/IPC/preload/service Angular;
- debounce + descarte de respuestas obsoletas;
- tests SQL/application.

### 15J.2 — Diseñador efímero ✅

Implementado:

- selección única de artículos;
- cantidad inicial 1 y edición de cantidad;
- Hueco individual;
- Angular CDK Drag & Drop;
- artículo movido como bloque;
- eliminación de artículo con confirmación;
- eliminación de Hueco inmediata;
- Limpiar vacía lista y conserva configuración;
- estado 100 % efímero en Angular.

### 15J.3 — Previsualización + capacidad ✅

Implementado:

- defaults 5×4, vertical y PVP visible;
- máximos 10×10 mediante constantes;
- A4 vertical/horizontal sin intercambio automático de filas/columnas;
- capacidad estricta de una sola página;
- si reducir dimensiones provoca overflow, el diseño se conserva y queda inválido;
- nuevas cantidades/huecos no pueden superar capacidad válida;
- QR del localizador;
- nombre, marca opcional y PVP opcional;
- preview con slots de artículo, HUECO y LIBRE;
- Limpiar conserva toda la configuración.

### 15J.4 — Snapshot + BrowserWindow ✅

Implementado:

- command mínimo con ids/cantidades/huecos/configuración;
- validación completa en backend;
- relectura canónica de localizador/nombre/marca/PVP;
- artículo inactivo/desaparecido aborta toda la preparación;
- duplicados/overflow/dimensiones/orientación inválida rechazados;
- snapshot inmutable de exactamente `filas × columnas` slots;
- BrowserWindow independiente;
- preload mínimo e IPC por `webContents.id`;
- cambios posteriores del diseñador no alteran la ventana abierta.

### 15J.5 — Impresión + regresión beta ✅

Implementado y validado:

- botón Imprimir en BrowserWindow;
- `webContents.print()` con diálogo estándar;
- A4 explícito;
- orientación tomada del snapshot canónico;
- `scaleFactor = 100`;
- márgenes lógicos `none` para la beta;
- cancelación del diálogo sin error;
- controles ocultos mediante `@media print`;
- huecos/libres completamente blancos en papel;
- batería completa y regresión funcional final.

Resultado:

```text
15J — IMPRENTA ✅ CERRADO
HITO 15 — ALMACÉN ✅ CERRADO
```

Pendiente no bloqueante:

```text
calibración física futura con impresora/hojas reales
```

---

# 28. Próximo bloque exacto

Antes del Hito 16 se ejecuta una pausa técnica de refactorización.

Siguiente punto exacto:

```text
REF.1 — Constantes y utilidades compartidas
```

Objetivo global de la pausa:

```text
reducir duplicaciones reales
+
separar declaraciones privadas de clases
+
ordenar Almacén por subdominios
+
dividir backend Almacén en services/repositories específicos
+
dejar convenciones como plantilla de Compras
```

No introducir funcionalidad nueva ni cambios de esquema durante este bloque.

Regla de trabajo:

```text
0 cambios de comportamiento
0 cambios de esquema
0 migraciones
```

Antes de proponer patches de `REF.1`:

1. revisar `main` actual;
2. localizar todas las definiciones repetidas de meses y paginación;
3. localizar formatters duplicados que tengan semántica realmente común;
4. distinguir global/shared frente a defaults locales;
5. evitar globalizar constantes solo porque coincidan dos veces;
6. aplicar el lote completo;
7. ejecutar batería adecuada;
8. no avanzar a `REF.2` sin confirmación del usuario.

---

# 29. Prompt de relevo

Si este chat alcanza el límite, continuar con este contexto:

```text
Estamos desarrollando Osumi TPV Client.
La base de continuidad es el documento v2.49 + el main actual del repositorio.

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
- Hito 13 Artículos ✅ cerrado.
- Hito 14 Clientes ✅ cerrado.
- Hito 15 Almacén ✅ cerrado.
- Inventario ✅ cerrado.
- Caducidades ✅ cerrado.
- Imprenta ✅ cerrado funcionalmente; beta física únicamente para futura calibración.
- Hito 16 Compras todavía no iniciado.
- bloque activo: pausa técnica de refactorización pre-Hito 16.
- siguiente punto exacto: REF.1 Constantes y utilidades compartidas.

Imprenta — cierre:
- diseñador efímero de una sola página A4;
- búsqueda por nombre/localizador/códigos activos;
- artículos únicos + cantidades + huecos + drag & drop;
- defaults 5×4, vertical, PVP sí; máximos 10×10;
- capacidad estricta de una página;
- overflow por reducción de filas/columnas conserva diseño y bloquea Terminar;
- preview QR(localizador)+nombre+marca opcional+PVP opcional;
- Terminar envía solo ids/cantidades/huecos/configuración;
- backend relee datos persistidos actuales;
- snapshot inmutable;
- BrowserWindow independiente, preload mínimo, IPC por webContents.id;
- impresión A4 estándar, no térmica;
- cancelación del diálogo no es error;
- Hito 15 cerrado.

Auditoría técnica cerrada antes de v2.49:
- meses repetidos en varios componentes/informes;
- paginación estándar [20,50,100,200] repetida en frontend y backend;
- Intl.NumberFormat y otros formatters repetidos;
- muchas interfaces/types/constantes privadas incrustadas antes de clases;
- electron/contracts/almacen, backend/contracts/almacen y backend/domain/almacen necesitan subcarpetas Inventario/Caducidades/Imprenta;
- TypeOrmAlmacenRepository ~1900 líneas y mezcla los tres subdominios;
- AlmacenService backend ~700 líneas y mezcla providers/lógica de los tres subdominios;
- InventoryComponent ~1500 líneas: aplicar *.private.ts ahora, pero no dividirlo funcionalmente todavía;
- application-composition y preload pueden ser grandes por naturaleza y no se dividen solo por tamaño.

Convenciones nuevas acordadas:
1. Global/shared solo con reutilización semántica real.
2. Si algo solo sirve al archivo X → X.private.ts.
3. *.private.ts puede contener interfaces, types, constantes, maps/tablas y helpers puros exclusivos.
4. No mover métodos de clase solo para adelgazar archivos.
5. Crear carpeta de subdominio cuando exista un subdominio real con varias piezas relacionadas.
6. Las fachadas comunes permanecen en la raíz.
7. No crear carpetas de un solo archivo sin necesidad real.
8. API agregada no implica mega-service/mega-repository.
9. Tamaño es señal, no regla.
10. Compras y nuevos desarrollos deben nacer ya bajo estas convenciones.

Roadmap pausa técnica:
REF.1 Constantes y utilidades compartidas       ← SIGUIENTE
REF.2 Convención *.private.ts
REF.3 Reorganización estructural de Almacén
REF.4 Backend por subdominio
REF.5 Revisión de hotspots
REF.6 Cierre + convención arquitectónica

Split backend acordado para REF.4:
- InventarioRepository / TypeOrmInventarioRepository / InventarioService
- CaducidadesRepository / TypeOrmCaducidadesRepository / CaducidadesService
- ImprentaRepository / TypeOrmImprentaRepository / ImprentaService
- mantener AlmacenApi como fachada agregada del renderer
- mantener compatibilidad funcional del IPC público

No iniciar Hito 16 Compras hasta cerrar la pausa técnica.
```

---

# 30. Pausa técnica pre-Hito 16 — auditoría y roadmap

Antes de comenzar Compras se realiza un refactor estructural sin cambios funcionales.

Objetivos:

```text
eliminar duplicaciones semánticas reales
ordenar declaraciones privadas
organizar Almacén por subdominios
separar mega-services / mega-repositories
convertir el resultado en plantilla arquitectónica para Compras
```

## 30.1 Principios

Durante toda la pausa:

```text
0 funcionalidad nueva
0 cambios de comportamiento intencionados
0 cambios de esquema
0 migraciones
DATABASE_SCHEMA_VERSION = 1
```

Cada lote termina con tests/build/lint y validación funcional cuando corresponda.

## 30.2 Hallazgo — meses

Existen listas de meses repetidas en distintos componentes e informes, incluyendo variantes con nombre largo y abreviatura.

Crear una fuente canónica compartida con datos equivalentes a:

```text
value
label
shortLabel
```

Destino previsto:

```text
src/app/constants/date.constants.ts
```

No mantener arrays manuales independientes de meses largos/cortos/opciones.

## 30.3 Hallazgo — paginación

La lista estándar:

```text
20, 50, 100, 200
```

está repetida en frontend y backend de Almacén.

Al ser una regla usada por Angular y Electron, debe vivir en contratos compartidos, previsiblemente:

```text
electron/contracts/shared/pagination.constants.ts
```

Los defaults siguen siendo locales por pantalla:

```text
Inventario  → 20
Caducidades → 50
```

## 30.4 Hallazgo — formatters

Hay múltiples `Intl.NumberFormat` equivalentes para EUR, enteros y decimales.

Criterio:

```text
conversión monetaria de dominio → money.utils.ts
formato visual genérico          → format.utils.ts o equivalente
```

No crear una constante global por cada formatter si una función común expresa mejor la intención.

## 30.5 Convención `*.private.ts`

Nueva regla arquitectónica:

```text
foo.component.ts
foo.component.private.ts
foo.component.html
foo.component.scss
```

También aplica a services/repositories cuando proceda:

```text
typeorm-inventario.repository.ts
typeorm-inventario.repository.private.ts
```

Puede contener:

- interfaces internas;
- types internos;
- constantes exclusivas del consumidor;
- maps/tablas estáticas;
- configuración estática;
- helpers puros exclusivos del archivo principal.

No debe contener métodos extraídos únicamente para reducir líneas de la clase.

Regla de promoción:

```text
1 consumidor                  → *.private.ts
varios dentro del dominio     → shared del dominio
concepto genérico aplicación  → constants/utils/shared contract
```

## 30.6 Reorganización por subdominios

### Contratos públicos Electron

Objetivo:

```text
electron/contracts/almacen/
  almacen-api.interface.ts

  inventario/
    ...

  caducidades/
    ...

  imprenta/
    ...
```

`almacen-api.interface.ts` permanece en raíz por ser fachada agregada.

### Backend contracts/domain/application

Aplicar el mismo principio:

```text
electron/backend/contracts/almacen/
  inventario/
  caducidades/
  imprenta/

electron/backend/domain/almacen/
  inventario/
  caducidades/
  imprenta/

electron/backend/application/almacen/
  inventario/
  caducidades/
  imprenta/
```

No crear carpetas solo por número de archivos; crear cuando exista subdominio real con varias piezas relacionadas.

### Angular Almacén

Objetivo aproximado:

```text
src/app/modules/almacen/
  components/
    warehouse-tabs/
  pages/
    warehouse/

  inventario/
    components/
    pages/

  caducidades/
    components/
    pages/

  imprenta/
    components/
    pages/
```

No renombrar componentes solo por homogeneizar idioma si no aporta valor.

### IPC / Electron adapters / preloads

Agrupar Almacén cuando existan varias piezas, evitando una carpeta por archivo:

```text
electron/ipc/almacen/
  register-almacen-ipc.ts
  register-inventario-print-ipc.ts
  register-caducidad-report-ipc.ts
  register-imprenta-print-ipc.ts

electron/infrastructure/electron/almacen/
  electron-inventario-csv-file-saver.ts
  electron-inventario-print-window.ts
  electron-caducidad-report-window.ts
  electron-imprenta-print-window.ts

electron/preloads/
  factura-preview-preload.ts
  inventario-print-preload.ts
  caducidad-report-preload.ts
  imprenta-print-preload.ts
```

El `preload.ts` principal permanece como fachada única por ahora.

## 30.7 Split backend acordado

La auditoría detecta que `TypeOrmAlmacenRepository` y `AlmacenService` ya mezclan tres subdominios claros.

Se acuerda un split real, no solo mover privados.

Objetivo conceptual:

```text
InventarioRepository
CaducidadesRepository
ImprentaRepository
```

Implementaciones:

```text
TypeOrmInventarioRepository
TypeOrmCaducidadesRepository
TypeOrmImprentaRepository
```

Servicios:

```text
InventarioService
CaducidadesService
ImprentaService
```

Relaciones:

```text
InventarioService   → InventarioRepository
CaducidadesService  → CaducidadesRepository
ImprentaService     → ImprentaRepository
```

Se mantiene:

```text
AlmacenApi
```

como fachada agregada del renderer y se mantiene compatible la superficie funcional del IPC.

Un helper SQLite auténticamente compartido puede promocionarse a utilidad TypeORM común; no duplicarlo entre repositories.

## 30.8 Hotspots detectados

Principales señales de tamaño/responsabilidad observadas en la auditoría:

```text
TypeOrmAlmacenRepository  ≈ 1900 líneas → separar por subdominio
InventoryComponent        ≈ 1500 líneas → *.private.ts ahora; no dividir flujo todavía
AlmacenService backend    ≈ 700 líneas  → separar por subdominio
historical-sales          ≈ 900 líneas  → deuda registrada, no tocar ahora
ventas.service            ≈ 640 líneas  → no tocar ahora
application-composition   ≈ 590 líneas  → mantener por ahora
caducidades.component     ≈ 590 líneas  → *.private.ts
imprenta.component        ≈ 580 líneas  → *.private.ts
preload.ts                ≈ 520 líneas  → mantener fachada por ahora
```

El tamaño es una señal, no una regla. Solo se divide cuando hay responsabilidades/subdominios claros.

No reorganizar retrospectivamente todo Ventas/Clientes en esta pausa. El patrón nuevo se aplica completamente a Almacén y se usa en Compras/nuevos desarrollos.

## 30.9 Roadmap definitivo

### REF.1 — Constantes y utilidades compartidas

```text
⬅️ SIGUIENTE
```

- meses;
- paginación;
- formatters;
- eliminar duplicaciones confirmadas;
- conservar defaults específicos donde corresponda;
- batería completa.

### REF.2 — Convención `*.private.ts`

```text
⬜
```

- Inventory;
- Caducidades;
- Imprenta;
- ventanas/reportes de Almacén donde proceda;
- estadísticas/casos claros detectados;
- no extraer métodos por adelgazar;
- batería completa.

### REF.3 — Reorganización estructural de Almacén

```text
⬜
```

- `electron/contracts`;
- backend contracts/domain/application;
- módulo Angular;
- IPC;
- adapters Electron;
- preloads;
- actualizar imports/build aliases si procede;
- sin cambio funcional;
- batería completa.

### REF.4 — Backend por subdominio

```text
⬜
```

- `InventarioRepository`;
- `CaducidadesRepository`;
- `ImprentaRepository`;
- TypeORM independiente por subdominio;
- `InventarioService`;
- `CaducidadesService`;
- `ImprentaService`;
- mantener `AlmacenApi` como fachada;
- mantener IPC funcionalmente compatible;
- tests específicos + batería completa + regresión Almacén.

### REF.5 — Revisión de hotspots tras el refactor

```text
⬜
```

- reevaluar `InventoryComponent`;
- reevaluar `application-composition`;
- reevaluar `preload`;
- comprobar si quedan separaciones claras;
- no dividir por dividir.

### REF.6 — Cierre y convención arquitectónica

```text
⬜
```

- batería integral;
- regresión Inventario;
- regresión Caducidades;
- regresión Imprenta;
- documentar convenciones definitivas;
- cerrar pausa técnica;
- dejar Hito 16 Compras listo para iniciar bajo la nueva plantilla.

---

# 31. Historial de continuidad

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

v2.46
→ 15I.1 Dominio + esquema cerrado
→ snapshot completo en merma_caducidad
→ importación legacy corregida sobre LegacyImportCatalogImporter existente
→ legacy no modifica stock ni crea histórico tipo 7
→ 15I.2 Consulta + filtros + totales cerrado
→ lectura histórica paginada + agregados globales
→ filtros Año/Mes/Marca histórica/Nombre snapshot
→ 15I.3 Pantalla principal cerrada
→ pestaña Caducidades real con filtros, tabla, paginación y totales
→ 15I.4 Alta implementada de extremo a extremo pero NO cerrada
→ alta = snapshot + decremento stock + histórico tipo 7 + transacción
→ reconciliación con fichas abiertas de Artículos
→ primera prueba real del modal detecta ajustes pendientes
→ autofocus inmediato en buscador pendiente
→ candidatos deben limitarse a stock > 0
→ backend debe rechazar alta si stock canónico <= 0
→ mantener permitido unidades > stock si el stock inicial es positivo
→ compactar Stock/PUC/PVP/Unidades en una sola fila
→ siguiente punto exacto: ajustes y cierre de 15I.4

v2.47
→ 15I.4 Alta de caducidad cerrado
→ autofocus programático real en Buscar artículo
→ buscador limitado a artículos activos con stock > 0
→ validación backend del stock canónico al confirmar
→ regla definitiva 1 <= unidades <= stock
→ caducidad nueva no puede provocar stock negativo
→ Stock / PUC / PVP / Unidades en una sola fila en escritorio
→ validación visual de exceso de unidades
→ backdrop accesible mediante botón real
→ lint Angular limpio
→ tests de alta actualizados a stock final no negativo
→ test específico de exceso de stock
→ alta mantiene transacción snapshot + stock + histórico tipo 7
→ puerto Angular de desarrollo cambiado de 4200 a 4500
→ siguiente punto exacto: 15I.5 Baja / reversión


v2.48
→ 15I.5 Baja / reversión de Caducidades cerrada
→ soft-delete + restauración de stock + histórico inverso tipo 7
→ doble reversión bloqueada
→ reversión permitida aunque artículo esté soft-deleted
→ PUC/PVP del histórico inverso desde snapshot original
→ histórico de Artículos muestra “Caducidad” en lugar de “Tipo 7”
→ 15I.6 Informe agrupado cerrado
→ filtros actuales + SQLite agregado Año → Mes → Marca
→ años/meses descendentes, marcas alfabéticas
→ BrowserWindow independiente con snapshot persistido
→ niveles cerrados inicialmente
→ 15I.7 Impresión + regresión cerrada
→ imprimir exactamente estado expandido visible
→ diálogo estándar, no térmica, cancelación sin error
→ Caducidades oficialmente CERRADO
→ Imprenta definida funcionalmente como diseñador efímero A4 de una sola página
→ tres áreas: buscador, seleccionados y previsualización
→ artículos únicos + huecos + cantidades + drag & drop
→ defaults 5×4, vertical, PVP sí; máximos 10×10 configurables
→ capacidad estricta de una página; overflow tras reducir configuración invalida impresión sin borrar diseño
→ Limpiar vacía contenido y conserva configuración
→ QR del localizador + nombre + marca opcional + PVP opcional
→ backend releerá datos canónicos al preparar la impresión
→ BrowserWindow final segura con diálogo estándar
→ primera versión Imprenta considerada beta hasta validación física
→ roadmap 15J.1–15J.5 cerrado
→ siguiente punto exacto: 15J.1 Base de Imprenta + búsqueda de artículos

v2.49
→ Hito 15 Almacén oficialmente CERRADO
→ 15J.1–15J.5 Imprenta cerrados y validados
→ búsqueda por nombre/localizador/códigos, artículos únicos y sin restricción de stock
→ diseñador efímero con cantidades, huecos y drag & drop
→ preview A4 5×4 por defecto, máximos 10×10, vertical/horizontal y PVP opcional
→ capacidad estricta de una página y overflow no destructivo
→ Terminar crea command mínimo y backend relee datos canónicos persistidos
→ snapshot inmutable + BrowserWindow segura + preload/IPC mínimos
→ impresión A4 mediante diálogo estándar, cancelación sin error
→ Imprenta queda beta solo para futura calibración física no bloqueante
→ Hito 16 Compras todavía no iniciado
→ se abre pausa técnica pre-Hito 16
→ auditoría detecta duplicación de meses, paginación y formatters
→ se adopta convención *.private.ts
→ se acuerda reorganización por subdominios Inventario/Caducidades/Imprenta
→ se acuerda split real de AlmacenService y AlmacenRepository en services/repositories específicos
→ AlmacenApi se mantiene como fachada agregada
→ TypeOrmAlmacenRepository e InventoryComponent quedan identificados como hotspots principales
→ no reorganizar retrospectivamente todo el histórico; aplicar patrón a Almacén y futuros desarrollos
→ roadmap REF.1–REF.6 cerrado
→ siguiente punto exacto: REF.1 Constantes y utilidades compartidas

```
