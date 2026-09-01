# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.21  
**Fecha:** 1 de septiembre de 2026  
**Estado:** TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**. El **Hito 13 — Artículos** continúa en frontend. Todo `13B — Infraestructura backend` está cerrado, incluido `13B.6E — unificación total de imágenes en WebP`. `13C — Workspace y carga de artículos` está cerrado y probado. `13D — General` queda cerrado como mini-hito funcional: estructura interna, datos generales, IVA/RE, motor entero de precios, descuento y creación rápida de Marca/Proveedor están implementados y validados. Antes de avanzar al siguiente apartado de Artículos se realizará una pasada específica de retoques de diseño y funcionalidad sobre General.

> **Regla crítica de entorno TicketBAI:** el producto usa `production` por defecto. Durante desarrollo/pruebas manuales se usa `app_data.json → ticketBai.environment = "test"` junto con el token TEST correspondiente. No añadir selector de entorno a la UI.

---

# 1. Estado resumido

```text
Installation + importación .otpv v2               ✅
Startup                                           ✅
Auditoría + Refactor A–E                          ✅
Ventas 1–11                                       ✅

Ventas 12 — Postventa                             🟦
  12A Análisis funcional legacy                   ✅
  12B Diseño funcional                            ✅ salvo devoluciones TicketBAI
  12C Implementación                              🟦
    12C.1 Histórico — infraestructura             ✅
    12C.2 Histórico — filtros/listado/totales     ✅
    12C.3 Histórico — detalle                     ✅
    12C.4 Correcciones postventa                  ✅
    12C.5 Pipeline documental                     ✅
    12C.6 Impresión                               ✅
    12C.7 Email                                   ✅
    12C.8 TicketBAI ordinario                     ✅ CERRADO
    12C.9 TicketBAI devoluciones/mixtas           ⏸️ Berein
    12C.10 Regresión integral final               ⬜

13 Artículos                                      🟦
  13A Análisis funcional y diseño                 ✅
  13B Infraestructura backend                     ✅
    13B.1 Categorías N:M + import legacy          ✅
    13B.2 Dominio/contratos Artículos             ✅
    13B.3 Lectura y resolución                    ✅
    13B.4 Guardado transaccional                  ✅
      13B.4A Alta + localizador                   ✅
      13B.4B Edición + stock/histórico            ✅
    13B.5 Baja lógica                             ✅
    13B.6 Infraestructura común imágenes/WebP     ✅
      13B.6A Procesador común WebP                ✅
      13B.6B Storage común + tabla archivo        ✅
      13B.6C Staging de imágenes                  ✅
      13B.6D Fotos de Artículos                   ✅
        13B.6D1 Persistencia transaccional fotos  ✅
        13B.6D2 Promoción + ArticulosService      ✅
          13B.6D2A Promoción staging → files      ✅
          13B.6D2B ArticulosService.save()        ✅
      13B.6E Unificación TOTAL imágenes WebP      ✅
  13C Workspace y carga de artículos              ✅
    13C.1 Puente operativo Electron               ✅
    13C.2 Workspace Angular                       ✅
    13C.3 Página + pestañas                       ✅
    13C.4 Apertura/resolución                     ✅
  13D General                                     ✅ MINI-HITO CERRADO
    13D.1 Estructura + datos generales            ✅
    13D.2 IVA/RE + motor de precios               ✅
      13D.2A AppData común renderer               ✅
      13D.2B Motor entero de precios              ✅
      13D.2C UI fiscalidad/precios                ✅
    13D.3 Descuento                               ✅
    13D.4 Creación rápida Marca/Proveedor         ✅
      13D.4A Backend/API/servicios                ✅
      13D.4B Modales + integración General        ✅
  13D.R Retoques diseño/funcionalidad General     🟦 SIGUIENTE
  13E Códigos de barras                           ⬜
  13F Observaciones                               ⬜
  13G Histórico                                   ⬜
  13H Baja / duplicado / acciones                 ⬜
  13I Estadísticas                                ⏸️ diseño posterior
  13J Integración con Ventas                      ⬜

14 Clientes                                       ⬜
15 Almacén                                        ⬜
16 Compras                                        ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física, no bloqueante
```
---

# 2. Convenciones de trabajo

- Angular standalone.
- Signals, `computed()`, `input()`, `output()`, `inject()`.
- Angular 22: no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No `any`; usar `unknown` cuando corresponda.
- `@if`, `@for`, `@switch`.
- Líneas en blanco solo estructurales.
- Una propiedad por línea, sin líneas en blanco entre propiedades relacionadas.
- Todo método TS/JS nuevo lleva JSDoc breve.
- Archivo nuevo: mostrar completo.
- Archivo existente: mostrar siempre fragmento actual → fragmento nuevo.
- Trabajar en lotes coherentes, no micro-pasos.
- Revisar `main` o archivos actuales antes de proponer patches.
- No avanzar sin confirmación del usuario.

- Convención de exports TypeScript:
  - si un archivo exporta **un único elemento**, usar `export default`;
  - si exporta **varios elementos**, usar exports nombrados para todos y **ningún `default`**.
- Mantener esta regla también para interfaces, tipos, constantes y clases.

Batería habitual:

```bash
npm test
npm run test:electron
npm run typecheck:electron
npm run build
npm run lint
```

Si se toca Electron/preload/IPC:

```bash
npm run build:desktop
```

---

# 3. Política SQLite durante desarrollo

Todavía no hay usuarios reales y el usuario es el único usuario de desarrollo.

Regla cerrada:

```text
DATABASE_SCHEMA_VERSION = 1
```

Debe permanecer en **1 durante todo el desarrollo previo al primer lanzamiento**, incluso aunque haya cambios incompatibles de esquema.

Por ahora:

```text
sin migraciones
```

Ante cualquier cambio incompatible:

```text
DATABASE_SCHEMA_VERSION sigue en 1
→ borrar datos/base local
→ recrear instalación
→ reimportar .otpv
```

Las migraciones y el incremento real de `DATABASE_SCHEMA_VERSION` empezarán cuando exista una primera versión estable con usuarios reales.
---

# 4. TicketBAI ordinario — estado cerrado

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Flujo real validado:

```text
create()
→ PENDING
→ pendiente_remoto
→ ticket/PDF fiscal
→ Histórico
→ Comprobar TicketBAI
→ GET
→ OK
→ aceptada
```

Principios cerrados:

- `@osumi/ticketbaiws` 1.0.1.
- PENDING es válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite `resend()`.
- `error_temporal` se reconcilia primero.
- `error_permanente` muestra diagnóstico y no muta automáticamente.
- `ticket_revision` sigue la visibilidad fiscal del documento.
- Correcto/no_aplica permanecen silenciosos en Histórico.
- Fallo TicketBAI nunca revierte la venta comercial.
- `ensureCurrentPdf()` mantiene documento vigente.
- La prueba real de `resend()` queda pendiente de un rechazo auténtico en TEST y no bloquea el proyecto.

Pendiente:

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
```

No implementar hasta disponer de respuesta/documentación suficiente.

---

# 5. Nuevo roadmap funcional

Mientras TicketBAI de devoluciones/mixtas siga bloqueado, el desarrollo continúa fuera de TicketBAI.

Roadmap acordado:

```text
13 Artículos
14 Clientes
15 Almacén
16 Compras
```

**Clientes** se introduce entre Artículos y Almacén. Se espera que sea un módulo pequeño y permita cerrar rápidamente esa parte antes de entrar en Almacén.

---

# 6. Hito 13 — Artículos

## 6.1 Objetivo general

Artículos no es un CRUD simple.

Es un **workspace persistente durante la ejecución de la aplicación** para:

- consultar artículos;
- crear artículos;
- modificar artículos;
- duplicarlos;
- gestionar sus códigos de barras;
- consultar histórico;
- mantener observaciones;
- dar de baja artículos;
- mantener varias fichas abiertas simultáneamente.

Su comportamiento de pestañas es conceptualmente similar al módulo Ventas.

---

# 7. Workspace de pestañas

El módulo permite tener varios artículos abiertos.

Ejemplo:

```text
[Artículo A] [Artículo B] [Artículo nuevo] [+]
```

## Artículo persistido

Solo puede existir **una pestaña por artículo existente en base de datos**.

Si se pide abrir un artículo que ya está abierto:

```text
openArticle(id)
→ encontrar pestaña existente
→ activarla
```

Nunca abrir una segunda pestaña del mismo artículo.

## Artículo nuevo

Puede haber una o varias pestañas de artículos aún no persistidos.

Cada una debe tener una identidad temporal propia.

## Persistencia del workspace

El estado debe conservarse únicamente **durante la ejecución actual de la aplicación**.

Si el usuario hace:

```text
Artículos
→ Ventas
→ Clientes
→ Artículos
```

debe encontrar:

- las mismas pestañas;
- la misma pestaña activa;
- los mismos valores editados;
- los artículos nuevos todavía sin guardar;
- el mismo estado de los formularios.

No es necesario conservar estos borradores después de cerrar completamente Osumi TPV.

Usar un mecanismo similar al ya utilizado para conservar el estado del módulo Ventas.

---

# 8. Cabecera de ficha de artículo

Cada pestaña contiene una cabecera con:

```text
Localizador
Nombre
```

## Localizador

Para artículos existentes:

- identifica el artículo;
- funciona también como entrada del buscador de artículos;
- su UX debe ser equivalente al campo de nueva línea de **Ventas**;
- al empezar a escribir texto se abre el mismo buscador de artículos, reutilizando componente/patrón si encaja;
- Enter sobre localizador, acceso directo o código de barras resuelve y carga el artículo;
- si el artículo ya tiene pestaña abierta, se activa la existente.

Para artículos nuevos:

- el usuario **no puede introducir manualmente un localizador**;
- el backend genera automáticamente el nuevo localizador al crear/persistir el artículo.

Semántica legacy confirmada:

```text
YY + número 0001..9999
```

Ejemplo:

```text
año 2026 + secuencia 0123
→ 260123
```

La implementación nueva mantiene esa semántica pero evita la recursión: genera un punto inicial aleatorio y busca iterativamente una combinación libre, comprobando colisiones.

## Nombre

Campo editable del artículo.

---

# 9. Pestañas internas de una ficha

```text
GENERAL
CÓDIGOS DE BARRAS
ESTADÍSTICAS
HISTÓRICO
OBSERVACIONES
BAJA

+ WEB cuando Venta online = activado
```

La estructura funcional del legacy se conserva como referencia.

La estética puede modernizarse sin perder estas responsabilidades.

---

# 10. General

## 10.1 Marca

- Obligatoria.
- Seleccionable mediante combo.
- Puede crearse una nueva marca directamente desde Artículos.

La creación rápida usa un modal.

Campos del modal de Marca:

```text
Nombre (*) obligatorio
Teléfono
Email
Dirección
Web
Observaciones
Crear un proveedor para esta marca [checkbox]
```

Si se marca:

```text
Crear un proveedor para esta marca
```

al guardar:

1. se crea la marca;
2. se crea un proveedor con los mismos datos;
3. la nueva marca queda asignada al nuevo proveedor.

La nueva marca debe quedar disponible inmediatamente en la ficha del artículo.

---

# 11. Proveedor

Puede crearse un proveedor directamente desde Artículos mediante modal.

Campos:

```text
Nombre (*) obligatorio
Dirección
Email
Web
Teléfono
Observaciones
Marcas del proveedor [0..N]
```

El modal permite seleccionar qué marcas pertenecen al proveedor.

La nueva entidad debe quedar disponible inmediatamente en la ficha del artículo.

---

# 12. Categorías

El legacy permitía una única categoría opcional.

El nuevo cliente debe mejorar esto:

```text
Artículo ↔ Categoría = N:M
```

Cardinalidad:

```text
artículo → 0..N categorías
```

Reglas:

- ninguna categoría es obligatoria;
- todas son equivalentes;
- no existe categoría principal;
- el orden no tiene significado funcional.

El modelo debe soportar una tabla de relación equivalente a:

```text
articulo_categoria
```

Durante importación/adaptación del esquema legacy:

```text
id_categoria antiguo
→ una relación articulo_categoria
```

No diseñar migraciones todavía; aplicar política de recreación/reimportación mientras no haya usuarios reales.

---

# 13. IVA y RE

Ambos son obligatorios.

Se seleccionan mediante combos.

Son parte de los cálculos de compra/precio.

---

# 14. Venta online y pestaña WEB

`Venta online` indica que el artículo se gestiona como producto preparado para una futura integración con tiendas online.

La integración real con tiendas online todavía **no está diseñada**; por ahora los datos son informativos.

Al activar `Venta online` aparece una pestaña adicional:

```text
WEB
```

Campos WEB:

```text
Mostrar en web
Descripción corta
Descripción larga
Fotos 0..N
```

## Mostrar en web

Permite distinguir:

```text
Venta online = sí
Mostrar en web = no
```

de modo que el producto pueda prepararse completamente antes de publicarse.

## Descripciones

- `Descripción corta`.
- `Descripción larga`.

## Fotos

- pueden existir `0..N`;
- deben persistirse como archivos físicos y relacionarse en SQLite;
- desactivar `Venta online` **oculta WEB pero no borra sus datos**;
- al reactivar `Venta online`, deben recuperarse descripciones, configuración y fotos.

La base actual ya contiene los campos web y las relaciones de archivos necesarias; no crear modelos paralelos innecesarios.

---

# 15. Referencia

Referencia ofrecida por fabricante/proveedor.

Campo informativo/editable.

---

# 16. Sistema de precios

Campos:

```text
Precio albarán
PUC
Margen
PVP
```

## PUC

Confirmado:

```text
PUC = precio albarán + IVA + RE
```

Conceptualmente:

```text
PUC = precioAlbaran × (1 + IVA + RE)
```

Ejemplo legacy:

```text
precio albarán = 0,59 €
IVA            = 21 %
RE             = 5,2 %
PUC            ≈ 0,74 €
```

## Margen

El legacy usa margen sobre precio de venta:

```text
margen =
(PVP - PUC) / PVP × 100
```

Ejemplo:

```text
PUC = 0,74 €
PVP = 1,00 €
margen = 26 %
```

## Relaciones de edición

Al cambiar **Precio albarán**:

```text
recalcular PUC
→ mantener margen
→ recalcular PVP
```

Al cambiar **PUC**:

```text
recalcular Precio albarán según IVA + RE
→ mantener margen
→ recalcular PVP
```

Al cambiar **PVP**:

```text
recalcular margen
```

Al cambiar **Margen**:

```text
recalcular PVP
```

La lógica debe centralizarse y definir precisión/redondeos de forma única.

Evitar floats encadenados arbitrariamente en Angular.

---

# 17. Descuento

Existe un toggle de descuento.

Cuando está activado aparecen:

```text
Descuento %
Margen (dto)
PVP (dto)
```

Conceptualmente:

```text
PVP descuento =
PVP × (1 - descuento / 100)
```

y:

```text
margen descuento =
(PVP descuento - PUC) / PVP descuento × 100
```

Estos campos también están relacionados.

La precisión/redondeo definitiva se fijará en el diseño técnico.

---

# 18. Stock y planificación

Campos:

```text
Stock
Stock mínimo
Stock máximo
Lote óptimo
```

## Stock

Es editable desde General.

Si al guardar:

```text
stock formulario != stock persistido
```

el usuario ha realizado una corrección manual.

La operación debe:

1. actualizar stock;
2. crear un registro de histórico/movimiento.

Nunca modificar stock silenciosamente.

## Stock mínimo

Informativo por ahora.

## Stock máximo

Informativo por ahora.

## Lote óptimo

Informativo por ahora.

Visión futura:

```text
stock mínimo
stock máximo
lote óptimo
→ posibles pedidos automáticos a proveedores
```

No implementar automatización todavía.

---

# 19. Códigos de barras

## Código obligatorio por localizador

Siempre existe un código visual por defecto basado en el localizador.

Se representa como QR.

Reglas:

- obligatorio;
- no eliminable;
- derivado del localizador.

Para un artículo nuevo no existe QR definitivo hasta que el backend genere el localizador.

La auditoría confirmó que el código por defecto **sí es una fila real de `codigo_barras`**:

```text
codigo = String(localizador)
por_defecto = 1
```

El backend crea el artículo y su código por defecto dentro de la misma transacción. El renderer nunca decide qué código es el predeterminado.

## Códigos adicionales

```text
0..N
```

Pueden añadirse o eliminarse libremente.

---

# 20. Estadísticas

El apartado existía visualmente, pero nunca llegó a implementarse.

Por tanto:

```text
13I Estadísticas ⏸️
```

Se diseñará al final del módulo.

---

# 21. Histórico

Debe mostrar movimientos de stock.

Ejemplos:

```text
Venta
Venta web
Pedido
Inventario / ajuste
```

Datos observados:

```text
Fecha
Tipo
Stock previo
Diferencia
Stock final
PUC
PVP
Venta
Pedido
```

Debe conservar información histórica aunque el artículo sea dado de baja.

---

# 22. Observaciones

Campos:

```text
Observaciones
Mostrar en Ventas
Mostrar en Pedidos
```

Si `Mostrar en Ventas` está activo:

```text
línea de venta
→ icono
→ tooltip con observaciones
```

Si `Mostrar en Pedidos` está activo:

```text
línea de pedido
→ icono
→ tooltip con observaciones
```

Se usa el mismo texto de observaciones.

---

# 23. Baja

Acción:

```text
Dar de baja
```

Debe pedir confirmación.

Es un borrado lógico:

```text
soft delete
```

El artículo deja de estar disponible para uso normal, pero no se eliminan históricos.

---

# 24. Acciones inferiores

```text
Duplicar
Cancelar
Guardar
Guardar y cerrar
```

## Duplicar

```text
Artículo persistido
→ Duplicar
→ nueva pestaña temporal
→ copiar datos
→ NO copiar localizador
→ NO persistir
```

Hasta Guardar:

```text
id = null
localizador = null
```

## Cancelar

Restaura el snapshot base.

Después de Guardar, el estado persistido pasa a ser el nuevo snapshot base.

## Guardar

Persiste modificaciones.

Si cambia stock:

```text
actualizar artículo
+
crear histórico de stock
```

## Guardar y cerrar

```text
Guardar
→ cerrar pestaña
```

---

# 25. Integración futura con Ventas

Se implementará en:

```text
13J Integración con Ventas
```

Desde una línea de venta:

```text
click nombre artículo
→ navegar a Artículos
→ abrir/enfocar artículo
```

Si ya está abierto:

```text
activar pestaña existente
```

Si no:

```text
cargar y abrir
```

Nunca duplicar una pestaña de un artículo persistido.

---

# 26. Separación Artículos / Almacén

Artículos puede:

- mostrar stock;
- permitir corrección manual;
- generar histórico de esa corrección.

Almacén será responsable después de:

- inventarios;
- movimientos;
- entradas/salidas;
- caducidades;
- herramientas operativas de stock.

---

# 27. Arquitectura de Artículos e infraestructura ya implementada

Mantener:

```text
Angular
↓
contratos públicos
↓
preload / IPC
↓
backend Electron
↓
application service
↓
repositories
↓
SQLite
```

Workspace Angular futuro:

```text
tabs
activeTab
drafts
base snapshots
dirty state
```

Backend de Artículos ya implementado:

```text
ArticulosRepository / TypeOrmArticulosRepository
→ lectura detalle
→ resolución por acceso directo/localizador/código
→ alta transaccional
→ edición transaccional
→ sincronización categorías
→ sincronización códigos adicionales
→ código por defecto protegido
→ histórico manual de stock
→ baja lógica
→ persistencia transaccional de fotos
```

Decisiones ya cerradas:

- `articulo_categoria` sustituye el antiguo `articulo.id_categoria`.
- Import legacy convierte `categoryId` en una relación N:M.
- `DATABASE_SCHEMA_VERSION` permanece en 1.
- Localizador generado por backend: `YYxxxx`, no editable.
- Solo una pestaña por artículo persistido.
- Código por defecto persistido en `codigo_barras`.
- Códigos adicionales son editables y se dan de baja lógicamente al eliminarlos.
- Un cambio manual de stock en edición genera `historico_articulo`.
- Tipo histórico de modificación desde Artículos: valor legacy `4`.
- El alta con stock inicial **no genera** histórico: no existe stock previo persistido.
- Baja de artículo = soft delete del artículo y de sus códigos activos.
- La baja conserva categorías, relaciones de archivos, archivos físicos e histórico.
- Fotos de Artículos reutilizan `archivo + articulo_archivo`; no crear tablas paralelas.
- `articulo_archivo` conserva `orden` y `principal`.
- Máximo una foto principal por artículo.
- Las fotos nuevas se insertan en la misma transacción SQLite del alta/edición del artículo.
- Las fotos eliminadas dejan de relacionarse con el artículo, pero su limpieza física/registro huérfano se coordina fuera del repository.

## Histórico manual de stock

Cuando:

```text
stock BD != stock guardado
```

se crea un movimiento con:

```text
tipo = 4
stock_previo
diferencia
stock_final
puc_micros
pvp_micros
```

El PVP histórico se almacena en microeuros.

## Tipos de histórico

`historico-articulo.constants.ts` usa ahora un único objeto semántico con `as const` y export default:

```ts
const HISTORICO_ARTICULO_TIPO = {
  ARTICULO: 4,
} as const;

export default HISTORICO_ARTICULO_TIPO;
```

No añadir valores legacy no confirmados.

## Precisión monetaria

Usar las escalas existentes del proyecto:

```text
MONEY_SCALE       = 100
UNIT_PRICE_SCALE  = 1_000_000
```

Evitar floats encadenados.

No copiar directamente modelos mutables ni lógica legacy.
---

# 28. Infraestructura común de imágenes — regla global

Regla funcional definitiva para Osumi TPV Client:

> **Toda imagen utilizada o cargada por la aplicación debe almacenarse físicamente en WebP.**

Ya no se limita a fotografías gestionadas mediante la tabla `archivo`.

Aplica a:

```text
Artículos
Marcas
Proveedores
Tipos de pago / iconos
Logo de empresa
cualquier futuro módulo o pantalla con imágenes
```

También aplica a todos los caminos de entrada:

```text
importación .otpv
selección/carga desde UI
staging de drafts
futuras importaciones o módulos
```

No mantener rutas especiales que conserven PNG/JPEG si el resultado termina persistido por Osumi TPV.

## 28.1 Procesador común WebP — ✅

Dependencia:

```text
sharp ^0.35.3
```

`sharp` se externaliza en el build Electron.

Contrato:

```text
ImageProcessor
ProcessedImage
```

Regla de exports:

```text
si un archivo exporta un único elemento → default
si exporta varios → todos nombrados, ningún default
```

`SharpImageProcessor`:

- acepta JPEG, PNG y WebP;
- convierte siempre a `image/webp`;
- calidad WebP: 85;
- effort: 4;
- aplica orientación EXIF mediante `rotate()`;
- conserva dimensiones originales, sin resize;
- rechaza input vacío;
- limita input a 50 MB;
- limita input a 100.000.000 píxeles;
- rechaza imágenes animadas/multipágina;
- devuelve Buffer WebP, MIME, extensión `.webp`, tamaño, SHA-256, ancho y alto.

Los tests generan PNG válido mediante `sharp`; el fixture Base64 inicial se descartó por incompatibilidad de decodificación completa con libpng.

## 28.2 Storage definitivo — ✅

Infraestructura:

```text
ProcessedImage
↓
FilesystemImageFileStorage
↓
assets/files/<purpose>/<uuid>.webp
```

Purposes actuales:

```text
article_image
brand_image
provider_image
payment_type_icon
```

Mapeo:

```text
article_image      → files/articles/
brand_image        → files/brands/
provider_image     → files/providers/
payment_type_icon  → files/payment-types/
```

`FilesystemImageFileStorage`:

- escribe primero `<archivo>.tmp`;
- usa escritura exclusiva;
- hace `rename` final;
- valida `publicId`;
- protege contra path traversal;
- expone `save()` y `delete()`.

`ImageAssetsService` coordina:

```text
imagen original
→ ImageProcessor
→ storage definitivo
→ TypeOrmArchivosRepository
```

Si falla SQLite después de escribir el fichero:

```text
borrar fichero definitivo
```

Si también falla esa limpieza:

```text
AggregateError
→ conserva error SQLite
→ conserva error de cleanup
→ cleanupError como cause
```

## 28.3 Tabla `archivo` — ✅

Se reutiliza la tabla existente:

```text
purpose
original_name
internal_name
relative_path
mime_type
size_bytes
sha256
width
height
```

La inserción común se centraliza en:

```text
typeorm-archivo.utils.ts
→ insertArchivo(queryRunner, command)
```

Esto permite insertar archivos dentro de la misma transacción SQLite del dominio que los consume.

## 28.4 Staging — ✅

Flujo:

```text
draft nuevo
↓
seleccionar imagen
↓
convertir inmediatamente a WebP
↓
staging/files/draft-images/<uuid>.webp
↓
registro en memoria
```

`ImageStagingService` mantiene un `Map` en memoria con:

```text
stagingId
purpose
originalName
relativePath
mimeType
sizeBytes
sha256
width
height
```

El renderer nunca suministra rutas físicas ni SHA-256 como fuente de verdad.

Contrato público staged:

```text
stagingId
purpose
originalName
url
mimeType
sizeBytes
width
height
```

`FilesystemImageStagingStorage`:

- guarda WebP en `staging/files/draft-images/`;
- soporta `save`, `read`, `delete`;
- protege rutas contra escapes.

`ElectronAssetUrlBuilder` y `osumi://assets/` permiten preview del staging:

```text
osumi://assets/staging/draft-images/<uuid>.webp
```

Los restos de staging de ejecuciones anteriores se limpian mediante `FileInstallationFinalizer.recover()`.

## 28.5 Registro staged desacoplado — ✅

Contrato:

```text
StagedImageRegistry
```

Responsabilidad:

```ts
getRecord(stagingId): StagedImageRecord | null
```

`ImageStagingService` lo implementa.

También implementa el contrato pequeño:

```text
StagedImageDiscarder
→ discard(stagingId)
```

Esto permite que otros servicios dependan de capacidades concretas y no de la clase completa.

## 28.6 Promoción staging → storage definitivo — ✅

Contrato:

```text
ImageAssetPromoter
```

Implementación:

```text
ImageAssetPromotionService
```

Flujo:

```text
stagingId
↓
StagedImageRegistry.getRecord()
↓
ImageStagingStorage.read()
↓
verificar tamaño + SHA-256
↓
copiar WebP ya procesado
↓
FilesystemImageFileStorage
↓
files/<purpose>/<nuevo-uuid>.webp
↓
PreparedImageAsset
  ├─ stagingId
  └─ ArchivoCreateRecord
```

No se vuelve a ejecutar Sharp.

La imagen staged se conserva mientras se prepara la copia definitiva.

Semántica:

```text
SQLite COMMIT ✅
→ consumir/borrar staging

SQLite ROLLBACK ❌
→ borrar copia definitiva
→ conservar staging para reintentar
```

`ImageAssetPromotionService.rollback()` elimina copias definitivas preparadas que no pudieron persistirse.

## 28.7 Fotos de Artículos — persistencia SQLite ✅

`ArticuloSaveRecord` incorpora:

```text
fotos[]
```

Cada foto backend:

```text
idArchivo
nuevoArchivo
orden
principal
```

Semántica:

```text
persistida:
  idArchivo != null
  nuevoArchivo = null

nueva:
  idArchivo = null
  nuevoArchivo = ArchivoCreateRecord
```

Contrato renderer:

```text
id
stagingId
orden
principal
```

El renderer no maneja rutas físicas, SHA-256 ni `ArchivoCreateRecord`.

`TypeOrmArticulosRepository`:

### CREATE

```text
INSERT articulo
→ códigos/categorías
→ INSERT archivo de fotos nuevas
→ INSERT articulo_archivo
→ establecer principal
```

### UPDATE

```text
validar fotos
→ quitar relaciones omitidas
→ reset principal
→ reordenar existentes
→ insertar archivos nuevos
→ insertar relaciones nuevas
→ establecer principal final
```

Todo bajo la misma transacción SQLite.

Validaciones:

- orden entero >= 0;
- máximo una foto principal;
- foto persistida debe pertenecer al artículo;
- foto nueva debe tener `purpose = article_image`;
- MIME `image/webp`;
- ruta bajo `files/articles/`;
- sin ids/publicIds duplicados.

## 28.8 ArticulosService.save() — ✅

`ArticulosService` depende de contratos pequeños:

```text
ArticulosRepository
AssetUrlBuilder
ImageAssetPromoter
StagedImageDiscarder
```

Flujo definitivo:

```text
ArticuloSaveInterface
↓
validar fotos públicas
↓
fotos existentes:
  id → idArchivo
fotos nuevas:
  stagingId → ImageAssetPromoter.prepare()
↓
ArticuloSaveRecord
↓
repository.create() / update()
↓
SQLite COMMIT
```

Si la persistencia falla:

```text
rollback de TODAS las copias definitivas preparadas
→ staging NO se consume
→ usuario puede reintentar
```

Si un rollback individual falla:

```text
se intentan igualmente los demás
→ AggregateError conserva error original + errores de rollback
```

Si SQLite hace commit:

```text
discard staging mediante Promise.allSettled()
→ un fallo de limpieza temporal NO convierte en fallido un guardado ya confirmado
→ getById()
→ devolver ArticuloInterface fresco
```

Esto evita que un fallo posterior al commit induzca al usuario a repetir una operación ya persistida.

## 28.9 Limpieza de fotos quitadas — pendiente

Al eliminar una foto de un artículo:

```text
DELETE relación articulo_archivo
```

Por ahora no se elimina automáticamente:

```text
fila archivo
fichero físico
```

La limpieza segura de huérfanos debe coordinarse fuera del repository para no mezclar filesystem y transacciones SQLite de forma insegura.

## 28.10 Logo de empresa — NUEVA REGLA OBLIGATORIA

El comportamiento actual del logo, que históricamente se guardaba como:

```text
assets/logo.png
```

debe cambiar.

Regla cerrada:

```text
logo persistido por Osumi TPV
→ SIEMPRE WebP
```

Debe aplicarse en ambos flujos:

```text
1. importación de .otpv
2. selección/cambio de logo desde Configuración
```

El logo deberá pasar por el mismo procesador común WebP (`ImageProcessor` / Sharp) antes de escribirse.

El almacenamiento, URL/protocolo y contratos del logo deben actualizarse para dejar de depender de `.png`.

No conservar una excepción PNG para el logo.

## 28.11 Import legacy y resto de imágenes — siguiente

`13B.6E` ya no significa únicamente “convertir fotos legacy de `archivo`”.

Debe auditar **todos los caminos de imágenes** y garantizar WebP en destino.

Alcance mínimo:

```text
- article_image legacy
- brand_image legacy
- provider_image legacy
- payment_type_icon legacy
- logo importado desde .otpv
- logo añadido/cambiado desde Configuración
```

Cualquier otra ruta de imagen encontrada durante la auditoría debe incorporarse al mismo principio.

---
---

# 28A. 13B.6E — unificación TOTAL de imágenes en WebP ✅

`13B.6E` quedó finalmente cerrado.

Regla global confirmada y aplicada:

```text
Toda imagen persistida por Osumi TPV
→ WebP
```

Quedan cubiertos:

```text
- article_image legacy
- brand_image legacy
- provider_image legacy
- payment_type_icon legacy
- logo desde .otpv
- logo seleccionado/cambiado desde Configuración
```

El logo deja de depender de `assets/logo.png` y se persiste como WebP pasando por el `ImageProcessor` común.

La importación legacy:

1. valida tamaño y SHA-256 de los bytes originales del `.otpv`;
2. procesa después la imagen con `SharpImageProcessor`;
3. guarda exclusivamente `.webp`;
4. persiste en `archivo` MIME, tamaño, SHA-256 y dimensiones del WebP final.

Incluso un WebP legacy vuelve a pasar por Sharp para que toda imagen persistida por el nuevo cliente atraviese el mismo pipeline canónico.

Commit de cierre conocido:

```text
860e659a5171b99bc6b82b790b90743546276a34
```

---

# 28B. 13C — Workspace y carga de Artículos ✅

## 28B.1 Puente operativo Electron

`ArticulosService` quedó conectado al grafo operativo:

```text
Angular
↓
window.osumiDesktop.articulos
↓
preload
↓
IPC
↓
ArticulosService
↓
TypeOrmArticulosRepository
↓
SQLite
```

Operaciones expuestas inicialmente:

```text
getById(idArticulo)
resolveByCode(codigo)
```

`resolveByCode()` resuelve:

```text
localizador
acceso directo
código de barras
```

## 28B.2 Workspace Angular

Existe un `ArticulosService` Angular singleton que mantiene durante la sesión:

```text
tabs[]
activeTabId
activeTab
drafts
baseSnapshot
dirty
activeSection
```

Reglas implementadas:

- varias pestañas para artículos nuevos;
- identidad temporal UUID para cada draft nuevo;
- una sola pestaña por artículo persistido;
- volver a abrir un artículo ya abierto activa la pestaña existente sin recargar BD ni perder cambios locales;
- Cancelar restaura `baseSnapshot`;
- tras Guardar, el artículo fresco sustituye draft/snapshot y `dirty = false`;
- la pestaña/sección activa sobreviven a navegación Ventas ↔ Artículos mientras la app siga abierta.

## 28B.3 Página y pestañas

Ruta activa:

```text
/articulos
```

El Header ya navega a Artículos.

La página incluye barra de pestañas persistentes, botón `+`, selección/cierre y confirmación cuando se intenta cerrar una ficha dirty.

## 28B.4 Apertura y resolución

El campo Localizador funciona también como entrada operacional:

```text
texto/letras
→ buscador compartido con Ventas

Enter con localizador/acceso directo/barcode
→ resolveByCode()
→ abrir/enfocar ficha
```

El buscador de Ventas se reutiliza con contexto `articulos` y permite abrir uno o varios resultados.

Un artículo ya abierto nunca genera una segunda pestaña.

---

# 28C. 13D — General ✅ MINI-HITO CERRADO

General queda funcionalmente cerrado antes de una pasada específica de retoques de diseño/UX.

## 28C.1 Secciones internas

Cada ficha conserva su sección activa de forma independiente:

```text
GENERAL
WEB cuando Venta online = sí
CÓDIGOS DE BARRAS
ESTADÍSTICAS
HISTÓRICO
OBSERVACIONES
BAJA
```

`activeSection` es estado de UI del workspace y no participa en `dirty`.

Si una operación programática deja `ventaOnline = false` mientras `WEB` era la sección activa, el workspace vuelve a `general`.

## 28C.2 Datos generales básicos

Implementados en GENERAL:

```text
Marca *
Proveedor
Categorías 0..N
Referencia
Acceso directo
Venta online
Stock
Stock mínimo
Stock máximo
Lote óptimo
```

Marca es obligatoria a nivel funcional/backend. Proveedor sigue siendo opcional. Categorías son equivalentes y el orden no tiene significado.

Se corrigió un problema inicial de los `<select>` de Marca/Proveedor en la primera carga asíncrona: cada `<option>` declara explícitamente su `[selected]`, evitando que el valor se pierda cuando las opciones se insertan después de crear el select.

## 28C.3 AppData común en renderer

Configuración expone ahora:

```text
window.osumiDesktop.configuration.getAppData()
```

Existe `AppDataService` Angular cacheado, independiente de Ventas, que comparte una carga concurrente y mantiene:

```text
appData
loaded
```

Artículos ya no depende de `VentasContextService` para leer nombre comercial/fiscalidad.

Datos usados por General:

```text
tipoIva
ivaList
reList
marginList
```

Reglas fiscales de instalación:

```text
tipoIva = iva
→ reList vacía
→ RE efectivo = 0

tipoIva = re
→ ivaList[i] + reList[i] forman un par fiscal
```

No hardcodear tipos fiscales globales en la UI.

## 28C.4 Motor entero de precios

Existe `ArticuloPriceCalculator`, puro y testeado.

Escalas relevantes:

```text
Precio albarán / PUC = microeuros
PVP                  = céntimos
IVA / RE              = basis points
Margen                 = microporcentaje
```

Importante:

```text
1 punto porcentual = 1_000_000 microporcentaje
26 %               = 26_000_000
36,9 %             = 36_900_000
```

Relaciones implementadas:

```text
PALB cambia
→ recalcular PUC
→ mantener margen
→ recalcular PVP

PUC cambia
→ recalcular PALB
→ mantener margen
→ recalcular PVP

PVP cambia
→ recalcular margen

Margen cambia
→ recalcular PVP

IVA/RE cambian
→ mantener PALB
→ recalcular PUC
→ mantener margen
→ recalcular PVP
```

PUC conserva precisión de microeuros.

Ejemplo:

```text
PALB = 0,59 €
IVA  = 21 %
RE   = 5,2 %
PUC  = 0,74458 €
```

Los cálculos intermedios usan enteros/`BigInt`; no encadenar floats monetarios.

La UI convierte texto decimal con coma o punto directamente a enteros escalados mediante utilidades específicas.

`marginList` se usa como sugerencia, no como restricción.

Una fiscalidad histórica de un artículo que ya no figure en la configuración actual debe seguir mostrándose como opción válida de esa ficha.

## 28C.5 Descuento

No existe un campo persistido `descuento`.

Estado real:

```text
pvpDescuentoCents = null
margenDescuentoMicroporcentaje = null
→ descuento OFF

ambos con valor
→ descuento ON
```

`Descuento %` es derivado/editable de UI.

Relaciones implementadas:

```text
Descuento % cambia
→ recalcular PVP dto.
→ recalcular Margen dto.

PVP dto. cambia
→ recalcular descuento efectivo
→ recalcular Margen dto.

Margen dto. cambia
→ recalcular PVP dto.
→ recalcular descuento efectivo
```

Si cambia PALB, PUC, Margen o PVP normal con descuento activo:

```text
conservar descuento efectivo
→ recalcular PVP dto.
→ recalcular Margen dto.
```

Validaciones:

```text
0 % <= descuento <= 100 %
PVP dto. <= PVP normal
margen < 100 % cuando debe derivarse un PVP finito
```

## 28C.6 Creación rápida de Marca

Desde General existe botón `+` junto a Marca.

Modal:

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Crear un proveedor para esta marca [checkbox]
```

Backend:

```text
BEGIN
→ INSERT marca
→ si crearProveedor:
     INSERT proveedor con mismos datos
     INSERT proveedor_marca
→ COMMIT
```

La nueva Marca se incorpora directamente al signal Angular y queda seleccionada en la ficha sin una recarga post-commit obligatoria.

Si también se crea proveedor, `ProveedoresService` se recarga para que quede disponible inmediatamente, pero no sustituye automáticamente el proveedor actual del artículo.

## 28C.7 Creación rápida de Proveedor

Desde General existe botón `+` junto a Proveedor.

Modal:

```text
Nombre *
Dirección
Email
Web
Teléfono
Observaciones
Marcas del proveedor [0..N]
```

Backend:

```text
BEGIN
→ validar marcas activas
→ INSERT proveedor
→ INSERT proveedor_marca 0..N
→ COMMIT
```

El nuevo proveedor se incorpora directamente al signal Angular y queda seleccionado automáticamente en la ficha.

## 28C.8 Regla post-commit en maestros

Tras crear Marca o Proveedor, el renderer no depende de un `reload()` para considerar exitosa una creación ya confirmada por SQLite.

El backend devuelve la entidad completa y el servicio Angular la incorpora al signal. Esto evita el patrón incorrecto:

```text
COMMIT ✅
→ reload falla ❌
→ UI aparenta fallo
→ usuario puede repetir una creación ya persistida
```

---

# 29. Próximo paso exacto

```text
13D.R — retoques de diseño y funcionalidad de General
```

Estado funcional de General antes de la pasada de retoques:

```text
- Marca obligatoria y seleccionable ✅
- Proveedor opcional ✅
- Categorías 0..N ✅
- Referencia ✅
- Acceso directo ✅
- Venta online ✅
- Stock / mínimo / máximo / lote óptimo ✅
- IVA/RE desde AppData ✅
- Precio albarán ↔ PUC ↔ Margen ↔ PVP ✅
- Descuento / margen dto. / PVP dto. ✅
- Creación rápida de Marca ✅
- Creación opcional de Proveedor junto a Marca ✅
- Creación rápida de Proveedor con 0..N marcas ✅
```

La pasada `13D.R` no pretende reabrir el dominio de General, sino ajustar la experiencia de uso y la presentación sobre una base funcional ya validada.

Después de cerrar esos retoques:

```text
13E — Códigos de barras
```

---

# 30. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.14 | 29/08/2026 | PENDING, post-COMMIT, Histórico y reconciliación |
| 2.15 | 30/08/2026 | 12C.8E completo, retry, UI y regeneración documental |
| 2.16 | 30/08/2026 | 12C.8 TicketBAI ordinario cerrado |
| 2.17 | 30/08/2026 | Inicio Hito 13 Artículos y roadmap 13→16 |
| 2.18 | 31/08/2026 | Backend Artículos hasta baja lógica; regla WebP; Sharp |
| 2.19 | 31/08/2026 | Storage, staging, persistencia fotos y promoción staged |
| **2.20** | **31/08/2026** | **ArticulosService.save() ✅; 13B.6D completo ✅; nueva regla global: TODAS las imágenes, incluido logo desde .otpv y Configuración, deben persistirse en WebP; 13B.6E pasa a unificación total de imágenes** |
| **2.21** | **01/09/2026** | **13B completo ✅; 13C Workspace/carga ✅; 13D General ✅ mini-hito cerrado: fiscalidad, motor entero de precios, descuento y creación rápida transaccional de Marca/Proveedor; siguiente paso: retoques de General antes de 13E** |
---

# 31. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.21.

Estado:
- Ventas 12C.1–12C.8 ✅
- 12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
- Hito 13 Artículos 🟦
- 13A análisis/diseño ✅
- 13B infraestructura backend completa ✅
  - categorías N:M ✅
  - lectura/resolución ✅
  - alta/edición/histórico/baja ✅
  - fotos/staging/storage/promoción ✅
  - unificación TOTAL de imágenes WebP ✅
- 13C Workspace y carga de artículos ✅
  - puente Electron ✅
  - workspace Angular ✅
  - página + pestañas ✅
  - apertura/resolución + buscador compartido ✅
- 13D General ✅ MINI-HITO CERRADO
  - estructura/secciones/datos básicos ✅
  - AppData común renderer ✅
  - IVA/RE desde configuración ✅
  - motor entero PALB/PUC/Margen/PVP ✅
  - descuento ✅
  - creación rápida Marca/Proveedor ✅
- 13D.R retoques de diseño/funcionalidad General 🟦 SIGUIENTE
- 13E Códigos de barras ⬜
- 13F Observaciones ⬜
- 13G Histórico ⬜
- 13H Baja / duplicado / acciones ⬜
- 13I Estadísticas ⏸️ diseño posterior
- 13J Integración con Ventas ⬜

Roadmap posterior:
14 Clientes
15 Almacén
16 Compras

Reglas críticas:
- DATABASE_SCHEMA_VERSION debe permanecer en 1 durante todo el desarrollo previo al primer lanzamiento.
- Si un archivo TS exporta un único elemento, usar export default. Si exporta varios elementos, todos nombrados y ninguno default.
- TODAS las imágenes persistidas por Osumi TPV deben ser WebP. No hay excepciones.
- El logo también es WebP desde .otpv y desde Configuración.
- Sharp: JPEG/PNG/WebP → WebP, calidad 85, effort 4, orientación EXIF, sin resize.
- Localizador nuevo: YY + 4 cifras, iterativo y no editable.
- Solo una pestaña por artículo persistido; drafts nuevos múltiples.
- El workspace Angular conserva tabs, activeTab, draft, baseSnapshot, dirty y activeSection durante la sesión.
- Reabrir un artículo ya abierto activa su pestaña y NO recarga BD ni pierde cambios locales.
- Campo Localizador reutiliza buscador de Ventas; Enter resuelve localizador/acceso directo/barcode.
- Categorías 0..N equivalentes.
- Marca obligatoria; Proveedor opcional.
- AppData global en renderer mediante AppDataService; Artículos no depende de VentasContextService.
- tipoIva=iva → RE efectivo 0. tipoIva=re → ivaList/reList son pares por índice.
- No hardcodear IVA/RE si la configuración de instalación ya los define.
- Precio albarán y PUC en microeuros; PVP en céntimos; IVA/RE en bps; margen en microporcentaje.
- 1 % = 1_000_000 microporcentaje.
- Motor de precios usa enteros/BigInt; evitar floats encadenados.
- PALB → PUC → mantener margen → PVP.
- PUC → PALB → mantener margen → PVP.
- PVP → margen. Margen → PVP.
- Descuento persistido mediante pvpDescuentoCents + margenDescuentoMicroporcentaje nullable; el porcentaje de descuento es derivado/editable de UI.
- Creación Marca+Proveedor y Proveedor+marcas se hace transaccionalmente en backend.
- Tras un COMMIT de creación no hacer depender el éxito de una recarga posterior innecesaria.
- Código por defecto = fila real codigo_barras basada en localizador.
- Cambio manual de stock crea historico_articulo tipo 4.
- Alta con stock inicial no genera histórico.
- Baja = soft delete artículo + códigos; conservar histórico/relaciones/fotos.
- Venta online muestra WEB; desactivarla oculta pero no borra datos.
- Estadísticas se diseñarán al final.

Convenciones:
- Angular standalone/signals/inject/input/output.
- No any; usar unknown.
- JSDoc breve para todo método TS/JS nuevo.
- Revisar main antes de patches.
- Archivo existente: fragmento actual → nuevo.
- Líneas en blanco solo estructurales.
- Trabajar por lotes coherentes y no avanzar sin confirmación.

Próximo paso exacto:
13D.R — revisar y retocar diseño/funcionalidad de GENERAL sin abrir todavía 13E.
```

---

**Fin del documento de continuidad v2.21.**
