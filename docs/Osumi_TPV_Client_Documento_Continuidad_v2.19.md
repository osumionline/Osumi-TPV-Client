# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.19  
**Fecha:** 31 de agosto de 2026  
**Estado:** TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**. El **Hito 13 — Artículos** continúa en backend: lectura, resolución, alta, edición, histórico, baja lógica e infraestructura común de imágenes avanzadas. Ya están cerrados el procesado WebP, storage definitivo, staging, persistencia SQLite de fotos y preparación/promoción de imágenes staged. El siguiente punto exacto es `13B.6D2B — ArticulosService.save()`.

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
  13B Infraestructura backend                     🟦
    13B.1 Categorías N:M + import legacy          ✅
    13B.2 Dominio/contratos Artículos             ✅
    13B.3 Lectura y resolución                    ✅
    13B.4 Guardado transaccional                  ✅
      13B.4A Alta + localizador                   ✅
      13B.4B Edición + stock/histórico            ✅
    13B.5 Baja lógica                             ✅
    13B.6 Infraestructura común imágenes/WebP     🟦
      13B.6A Procesador común WebP                ✅
      13B.6B Storage común + tabla archivo        ✅
      13B.6C Staging de imágenes                  ✅
      13B.6D Fotos de Artículos                   🟦
        13B.6D1 Persistencia transaccional fotos  ✅
        13B.6D2 Promoción + ArticulosService      🟦
          13B.6D2A Promoción staging → files      ✅
          13B.6D2B ArticulosService.save()        🟦 SIGUIENTE
      13B.6E Adaptación import legacy             ⬜
  13C Workspace y carga de artículos              ⬜
  13D General                                     ⬜
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

Regla funcional cerrada para Osumi TPV Client:

> **Toda fotografía cargada por la aplicación debe convertirse a WebP antes de guardarse físicamente.**

Aplica a:

```text
Artículos
Marcas
Proveedores
futuros módulos con fotografías
```

No implementar conversiones aisladas por módulo: toda carga debe pasar por infraestructura común.

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

Regla de exports aplicada:

```text
image-processor.interface.ts
→ varios exports
→ todos nombrados
→ ningún default
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

Infraestructura cerrada:

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

Se reutiliza la tabla existente, sin cambios de esquema:

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

Esto permite reutilizar la inserción dentro de la propia transacción SQLite de Artículos.

## 28.4 Staging — ✅

Objetivo:

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

El renderer nunca debe suministrar rutas físicas ni SHA-256 como fuente de verdad.

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

`ElectronAssetUrlBuilder` y el protocolo `osumi://assets/` aceptan también staging:

```text
osumi://assets/staging/draft-images/<uuid>.webp
```

El startup actual limpia restos de staging de ejecuciones anteriores mediante `FileInstallationFinalizer.recover()`. No hace falta otro limpiador específico.

## 28.5 Registro staged desacoplado — ✅

Se creó:

```text
StagedImageRegistry
```

con una única responsabilidad:

```ts
getRecord(stagingId): StagedImageRecord | null
```

`ImageStagingService` implementa este contrato.

Esto evita que servicios de promoción dependan de la clase concreta `ImageStagingService` y elimina casts forzados en tests.

## 28.6 Promoción staging → storage definitivo — ✅

Servicio:

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

**No se vuelve a ejecutar Sharp**: el WebP staged ya está procesado.

La imagen original en staging se conserva mientras se prepara la copia definitiva.

Motivo:

```text
SQLite COMMIT ✅
→ consumir/borrar staging

SQLite ROLLBACK ❌
→ borrar copia definitiva
→ conservar staging para reintentar
```

`ImageAssetPromotionService.rollback()` elimina la copia definitiva preparada.

## 28.7 Fotos de Artículos — persistencia SQLite ✅

`ArticuloSaveRecord` incorpora:

```text
fotos[]
```

Cada foto backend es:

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

Nunca ambos ni ninguno.

Contrato renderer:

```text
id
stagingId
orden
principal
```

El renderer no maneja `ArchivoCreateRecord`.

`TypeOrmArticulosRepository`:

### CREATE

```text
INSERT articulo
→ códigos/categorías
→ INSERT archivo para fotos nuevas
→ INSERT articulo_archivo
→ principal final
```

Todo dentro de la misma transacción SQLite.

### UPDATE

```text
validar fotos actuales
→ quitar relaciones omitidas
→ poner principal=0
→ reordenar existentes
→ insertar archivos nuevos
→ insertar relaciones nuevas
→ establecer principal final
```

Validaciones:

- orden entero >= 0;
- como máximo una foto principal;
- una foto persistida debe pertenecer al artículo;
- una foto nueva debe ser `article_image`;
- MIME debe ser `image/webp`;
- ruta nueva debe pertenecer a `files/articles/`;
- evitar duplicados de ids persistidos/publicIds nuevos.

Las fotos eliminadas dejan de relacionarse con el artículo, pero el borrado físico y la limpieza de `archivo` se coordinan en capa superior, no dentro del repository.

## 28.8 Pendiente inmediato: ArticulosService.save()

Siguiente flujo a implementar:

```text
ArticuloSaveInterface
↓
resolver cada foto:
  existente → id
  nueva     → stagingId
↓
ImageAssetPromotionService.prepare()
↓
construir ArticuloSaveRecord
↓
repository.create/update
↓
si SQLite falla:
  rollback() de copias definitivas
  staging permanece
↓
si SQLite hace commit:
  discard() de staging consumido
↓
devolver ArticuloInterface fresco
```

También habrá que decidir/implementar la limpieza segura de archivos que queden huérfanos al eliminar fotos de un artículo.

## 28.9 Import legacy — pendiente

`13B.6E` deberá adaptar `.otpv` para que las imágenes legacy JPEG/PNG/WebP pasen por la misma infraestructura y terminen almacenadas como WebP canónico.

---
---

# 29. Próximo paso exacto

```text
13B.6D2B — ArticulosService.save()
```

Objetivos:

```text
- recibir ArticuloSaveInterface
- resolver fotos existentes vs stagingId
- preparar copias definitivas con ImageAssetPromotionService
- construir ArticuloSaveRecord
- llamar create/update
- rollback físico si SQLite falla
- consumir staging solo después de commit
- devolver ArticuloInterface fresco
```

Después:

```text
13B.6E — adaptar import legacy a WebP
```

Solo después se pasará a IPC/preload/Angular.
---

# 30. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.14 | 29/08/2026 | PENDING, post-COMMIT, Histórico y reconciliación |
| 2.15 | 30/08/2026 | 12C.8E completo, retry, UI y regeneración documental |
| 2.16 | 30/08/2026 | 12C.8 TicketBAI ordinario cerrado |
| 2.17 | 30/08/2026 | Inicio Hito 13 Artículos y roadmap 13→16 |
| 2.18 | 31/08/2026 | Backend Artículos hasta baja lógica; regla global WebP; Sharp; storage común en curso |
| **2.19** | **31/08/2026** | **Storage definitivo ✅, staging ✅, persistencia SQLite de fotos ✅, promoción staging→files ✅, StagedImageRegistry ✅; siguiente: ArticulosService.save()** |
---

# 31. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.19.

Estado:
- Ventas 12C.1–12C.8 ✅
- 12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
- Hito 13 Artículos 🟦
- 13A análisis/diseño ✅
- 13B.1 categorías N:M ✅
- 13B.2 dominio/contratos ✅
- 13B.3 lectura/resolución ✅
- 13B.4 alta/edición transaccional + histórico ✅
- 13B.5 baja lógica ✅
- 13B.6A procesador común WebP ✅
- 13B.6B storage definitivo + archivo ✅
- 13B.6C staging ✅
- 13B.6D1 persistencia transaccional de fotos ✅
- 13B.6D2A promoción staging→files ✅
- 13B.6D2B ArticulosService.save() 🟦 SIGUIENTE
- 13B.6E import legacy a WebP ⬜

Roadmap:
13 Artículos
14 Clientes
15 Almacén
16 Compras

Reglas críticas:
- DATABASE_SCHEMA_VERSION debe permanecer en 1 durante todo el desarrollo previo al primer lanzamiento. No crear migraciones todavía; ante cambios incompatibles borrar BD y reimportar .otpv.
- Si un archivo TS exporta un único elemento, usar export default. Si exporta varios elementos, todos son exports nombrados y ninguno default.
- Toda fotografía cargada en Osumi TPV debe convertirse a WebP mediante infraestructura común, nunca con lógica específica por módulo.
- Sharp: JPEG/PNG/WebP → WebP, calidad 85, effort 4, orientación EXIF, sin resize por ahora.
- Storage definitivo: assets/files/<purpose>/<uuid>.webp.
- Staging: staging/files/draft-images/<uuid>.webp, registro en memoria mediante ImageStagingService.
- StagedImageRegistry desacopla consulta de staged records.
- ImageAssetPromotionService copia staged→files, verifica tamaño/SHA-256 y NO vuelve a usar Sharp.
- La imagen staged no se consume hasta que SQLite hace commit.
- Si SQLite falla, borrar copias definitivas y conservar staging para reintento.
- Fotos de Artículos reutilizan archivo + articulo_archivo.
- CREATE/UPDATE de Artículos insertan archivo y articulo_archivo dentro de la misma transacción SQLite.
- Como máximo una foto principal; orden >= 0.
- Fotos quitadas del artículo pierden relación, pero la limpieza física/registro huérfano se coordina en capa superior.
- El campo Localizador reutilizará la UX/buscador de nueva línea de Ventas.
- Localizador nuevo: YY + 4 cifras, búsqueda iterativa de combinación libre, sin recursión.
- Solo una pestaña por artículo persistido; drafts nuevos pueden ser múltiples.
- Categorías 0..N, equivalentes, sin principal.
- PUC = precio albarán + IVA + RE.
- Código por defecto es fila real de codigo_barras y corresponde al localizador.
- Cambio manual de stock en edición crea historico_articulo tipo legacy 4.
- Alta con stock inicial no genera histórico.
- Baja = soft delete de artículo + códigos; conservar históricos/relaciones/fotos.
- Venta online muestra pestaña WEB con Mostrar en web, descripción corta/larga y fotos.
- Desactivar Venta online oculta WEB pero no elimina sus datos.
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
13B.6D2B — ArticulosService.save().
```

---

**Fin del documento de continuidad v2.19.**
