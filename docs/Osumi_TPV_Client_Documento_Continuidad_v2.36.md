# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.36  
**Fecha:** 5 de septiembre de 2026  
**Estado:** TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**. El **Hito 13 — Artículos está completamente terminado, validado y subido al repositorio ✅**. El **Hito 14 — Clientes está en curso 🟦**: `14A–14I` están terminados y `14J.1–14J.2` también están cerrados, validados y subidos. Facturas ya dispone de relaciones activas/históricas, listado completo, ventas elegibles y persistencia transaccional de borradores con reconciliación segura de caché. El siguiente paso exacto es **`14J.3 — modal Angular del editor de factura`**. `14K — Emisión y documentos` continúa pendiente. Clientes no realiza ni realizará ninguna operación TicketBAI.

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

13 Artículos                                      ✅ HITO CERRADO
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
  13D.R Retoques diseño/funcionalidad General     ✅
    13D.R1 Accesos directos                       ✅
    13D.R2 General compacto                       ✅
  13E WEB                                         ✅ MINI-HITO CERRADO
    13E.1 Contenido WEB                            ✅
    13E.2 Fotos 0..N                               ✅
      13E.2A Staging + galería 0..N               ✅
      13E.2B Crop + ciclo de vida staging         ✅
  13F Códigos de barras                           ✅ MINI-HITO CERRADO
  13G Observaciones                               ✅ MINI-HITO CERRADO
  13H Histórico                                   ✅ MINI-HITO CERRADO
    13H.1 Backend + API paginada                  ✅
    13H.2 Tabla + orden + paginación              ✅
  13I Baja / duplicado / acciones                 ✅ MINI-HITO CERRADO
    13I.1 Guardar / Cancelar global               ✅
    13I.2 Duplicar                                ✅
    13I.3 Baja lógica                             ✅
  13J Estadísticas                                ✅ MINI-HITO CERRADO
    13J.1 Backend + consulta agregada              ✅
    13J.2 Gráfica + filtros                       ✅
  13K Integración con Ventas                      ✅ MINI-HITO CERRADO

14 Clientes                                       🟦 EN CURSO
  14A Documento de continuidad y plan             ✅
  14B Base del apartado Clientes                  ✅
    14B.1 Navegación y página base               ✅
    14B.2 Estado persistente de una ficha         ✅
  14C Búsqueda y selección                        ✅
    14C.1 Cliente persistido → draft editable     ✅
    14C.2 Modal y búsqueda local                  ✅
    14C.3 Protección al sustituir ficha           ✅
  14D Workspace y formulario                     ✅
    14D.1 Secciones y sección activa              ✅
    14D.2 Formulario compartido                   ✅
    14D.3 Integración, dirty y Cancelar           ✅
  14E Persistencia y mantenimiento                ✅ CERRADO
    14E.1 CREATE + reconciliación segura          ✅
    14E.2 Facturación, validación y guardado      ✅
    14E.3 UPDATE completo                         ✅
    14E.4 Pulido final de UX                      ✅
    14E.5 Baja lógica + bloqueo borradores        ✅
      14E.5.1 Backend transaccional               ✅
      14E.5.2 Contrato + IPC + preload            ✅
      14E.5.3 Servicio Angular + UI               ✅
    14E.6 Documento protección datos + cierre     ✅
  14F Ventas del cliente                          ✅ CERRADO
    14F.1 Consulta backend filtrada por cliente   ✅
    14F.2 Filtros y listado                       ✅
    14F.3 Selección y detalle documental          ✅
    14F.4 Reimpresión, email y pulido final       ✅
  14G Estadísticas generales                      ✅ CERRADO
    14G.1 Backend, agregados y contratos          ✅
      14G.1A Consultas SQLite y top               ✅
      14G.1B Jerarquía anual, beneficio y margen  ✅
    14G.2 API, IPC, preload y servicio Angular    ✅
    14G.3 Renderer                                ✅
      14G.3A Total general en backend             ✅
      14G.3B Carga lazy, estados y tablas         ✅
      14G.3C Acordeón, meses, total y pulido      ✅
  14H Consumo mensual                             ✅ CERRADO
    14H.1 Backend, series y contratos             ✅
      14H.1A Consulta SQLite y contrato interno   ✅
      14H.1B Contrato público y series completas  ✅
    14H.2 API, IPC, preload y servicio Angular    ✅
    14H.3 Renderer                                ✅
      14H.3A Componente, gráfica, filtros/estados ✅
      14H.3B Integración y validación final       ✅
  14I Dominio y listado de facturas               ✅ CERRADO
    14I.0 Revisión funcional guiada y legacy      ✅
    14I.1 Persistencia y relaciones históricas    ✅
      14I.1A Esquema + importación legacy         ✅
      14I.1B Consumidores + regresiones           ✅
    14I.2 Dominio, contratos y repository         ✅
      14I.2A Modelo interno + consulta SQLite     ✅
      14I.2B Contrato público + application svc   ✅
    14I.3 API, IPC, preload y servicio Angular    ✅
      14I.3A Puente Electron                      ✅
      14I.3B Caché/estado Angular                 ✅
    14I.4 Listado Angular                         ✅
  14J Editor de factura                           🟦 EN CURSO
    14J.1 Ventas disponibles                      ✅ CERRADO
      14J.1A Repository SQLite                    ✅
      14J.1B Contrato + application service       ✅
      14J.1C API + IPC + preload                  ✅
      14J.1D Servicio Angular                     ✅
    14J.2 Persistencia de borradores              ✅ CERRADO
      14J.2A Creación transaccional               ✅
      14J.2B Actualización transaccional          ✅
      14J.2C Eliminación transaccional            ✅
      14J.2D Integración completa                 ✅
        14J.2D1 Application service/contratos    ✅
        14J.2D2 API + IPC + preload              ✅
        14J.2D3 Angular + reconciliación caché   ✅
    14J.3 Modal Angular                           ⬜ SIGUIENTE
    14J.4 Dirty y convivencia con la ficha        ⬜
  14K Emisión y documentos                        ⬜
    14K.1 Emisión transaccional                   ⬜
    14K.2 Documento y previsualización            ⬜
    14K.3 PDF inmutable                           ⬜
    14K.4 Impresión y email                       ⬜
    14K.5 Anulación                               ⬜
    14K.6 Integración y cierre                    ⬜
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
- Cuando haya que añadir un import, indicar únicamente el import nuevo; no especificar su posición entre otros imports, porque Prettier los ordena automáticamente al guardar.
- Trabajar en lotes coherentes, no micro-pasos.
- Revisar `main` o archivos actuales antes de proponer patches.
- No avanzar sin confirmación del usuario.
- En cada bloque, incluir un pequeño resumen de situación: qué está terminado, cuál es el punto actual y qué queda.
- El usuario aplica manualmente los cambios, ejecuta los comandos y sube los commits. El asistente no ejecuta comandos `npm`/`ng`, no hace commits y no abre pull requests.

- Convención de exports TypeScript:
  - si un archivo exporta **un único elemento**, usar `export default`;
  - si exporta **varios elementos**, usar exports nombrados para todos y **ningún `default`**.
- Mantener esta regla también para interfaces, tipos, constantes y clases.

Batería habitual, seleccionando solo las comprobaciones pertinentes al cambio:

Frontend Angular:

```bash
npm test
npm run build
npm run lint
```

`npm test` ya incorpora `--watch=false` en `package.json`; no volver a añadirlo al comando.

Backend/Electron, contratos, repositorios, IPC o preload:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

`npm run build:electron` ya ejecuta internamente `npm run typecheck:electron`. Este último puede solicitarse de forma aislada cuando solo se quiera una comprobación rápida de tipos. `npm run build:desktop` se reserva para una comprobación integral del paquete de escritorio cuando resulte necesaria.

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

`13 — Artículos` está completamente cerrado. **Clientes** se introduce entre Artículos y Almacén y ya está en curso. Su análisis ha confirmado que la ficha básica es pequeña, pero Facturas requiere un bloque propio por su selección de ventas, estados, cierre transaccional y generación documental.

---

# 6. Hito 13 — Artículos ✅ COMPLETADO

El hito completo está implementado, validado funcional y visualmente y subido al repositorio. No reabrirlo salvo regresión o requisito nuevo.

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
- la primera foto añadida pasa a ser principal si todavía no existe una principal;
- puede cambiarse la foto principal sin alterar el orden;
- las fotos pueden reordenarse y el draft mantiene `orden` normalizado;
- las imágenes nuevas pasan por crop libre antes de entrar en staging;
- después del crop, el staging común convierte siempre a WebP canónico mediante Sharp;
- eliminar una foto staged elimina también su temporal;
- eliminar una foto persistida la elimina del draft y la relación se resolverá en el guardado global del artículo;
- cerrar/cancelar una ficha descartando cambios limpia los staged nuevos;
- sustituir un borrador por un artículo localizado también limpia sus staged pendientes;
- navegar a otro módulo sin descartar la ficha **no** elimina sus staged: el workspace debe conservar el estado;
- desactivar `Venta online` **oculta WEB pero no borra sus datos**;
- al reactivar `Venta online`, deben recuperarse descripciones, configuración y fotos.

La base actual ya contiene los campos web y las relaciones de archivos necesarias; no crear modelos paralelos innecesarios.

**Regla de guardado:** WEB no dispone de un botón ni de un flujo de guardado propio. `mostrarEnWeb`, descripciones y `fotos` forman parte del mismo `ArticuloDraft` que GENERAL y el resto de apartados; las acciones inferiores globales (`Guardar`, `Cancelar`, `Duplicar`, etc.) operan sobre el artículo completo.

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

El margen continúa siendo editable en el nuevo cliente. Además, junto a su campo existe un botón que abre un modal de **sugerencias de margen**. El modal usa `AppData.marginList` y muestra para cada margen configurado el PVP que resultaría con el PUC actual. Al seleccionar una sugerencia:

```text
margen elegido
→ ArticuloPriceCalculator
→ recalcular PVP
→ recalcular descuento si está activo
→ cerrar modal
```

La UI monetaria y porcentual muestra y permite introducir **como máximo 2 decimales**, aunque Precio albarán, PUC y márgenes conservan internamente su precisión de microescala. No reducir la precisión persistida solo porque la presentación sea de dos decimales.

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

Existe un `MatSlideToggle` de descuento, visualmente coherente con `Venta online`.

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

`13F — Códigos de barras` está **cerrado ✅**.

La pestaña edita el mismo `ArticuloDraft`; **añadir o borrar una tarjeta no persiste nada todavía**. La sincronización real con SQLite queda dentro del guardado global del artículo.

## Código obligatorio por localizador

Siempre existe un código visual por defecto basado en el localizador.

Se representa como QR mediante `angularx-qrcode`.

Reglas:

- obligatorio;
- no editable;
- no eliminable;
- derivado del localizador;
- tarjeta visualmente diferenciada del resto;
- no muestra icono de borrar.

Para un artículo nuevo no existe QR definitivo hasta que el backend genere el localizador. La tarjeta principal se mantiene visible e indica que el código se generará al guardar.

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

UX definitiva:

- al entrar en la pestaña, foco automático en `Nuevo código de barras`;
- el input acepta escritura manual o lector USB;
- `Enter` añade inmediatamente el código al draft;
- después de añadir, el input queda vacío y recupera el foco;
- los códigos se muestran en tarjetas, tres por fila en pantallas amplias;
- cada tarjeta muestra QR + valor del código + icono de borrar;
- los códigos existentes no se editan inline: se añaden o eliminan;
- borrar una tarjeta solo modifica el draft, no SQLite.

Validación local:

- no permitir vacío;
- no permitir duplicados dentro del mismo draft;
- un código adicional no puede coincidir con el localizador actual;
- un código adicional no puede coincidir con el acceso directo actual.

La validación definitiva de colisiones globales sigue en backend durante el guardado, incluyendo otros códigos, localizadores y accesos directos activos.

---

# 20. Estadísticas

`13J — Estadísticas` está **cerrado y validado ✅**.

La pestaña ofrece una lectura rápida de la evolución histórica de un artículo persistido mediante una gráfica de barras y tres filtros:

```text
Tipo: [Unidades / Importe]
Mes:  [mes concreto / Todos]
Año:  [año concreto / Todos]
```

La gráfica se actualiza automáticamente al cambiar cualquiera de los tres selectores, sin botón Aplicar. La selección inicial definitiva es:

```text
Tipo = Unidades
Mes  = Todos
Año  = año actual
```

Semántica definitiva de `Tipo`:

```text
Unidades → SUM(linea_venta.unidades)
Importe  → SUM(linea_venta.importe_micros)
```

Las devoluciones se representan con unidades/importes negativos y **restan** en la agregación. Por tanto las estadísticas muestran **venta neta histórica**, no venta bruta.

El importe se obtiene de la línea histórica de venta, no del PVP actual del artículo. Internamente continúa en microeuros y solo se formatea a euros en renderer.

Combinaciones acordadas de Año/Mes:

| Año | Mes | Resolución / barras |
| --- | --- | --- |
| año concreto | mes concreto | un punto por cada día de ese mes |
| año concreto | Todos | enero…diciembre de ese año |
| Todos | mes concreto | ese mes comparado entre años |
| Todos | Todos | todos los meses cronológicos de todos los años |

Ejemplos:

```text
2026 + Septiembre
→ 1, 2, 3 ... 30 de septiembre de 2026

2026 + Todos
→ Ene ... Dic 2026

Todos + Septiembre
→ Sep 2024 | Sep 2025 | Sep 2026

Todos + Todos
→ Ene 2024 | Feb 2024 | ... | Dic 2026
```

Los huecos temporales deben existir explícitamente con valor `0`:

- todos los días de un mes concreto;
- los 12 meses de un año concreto;
- años intermedios sin ventas cuando se compara un mes o toda la serie histórica.

La serie se construye en backend; el renderer no descarga ventas individuales para reagruparlas.

`13J.1 — Backend + consulta agregada` ✅ implementa:

- contratos `ArticuloEstadisticasConsulta`, `ArticuloEstadisticasPoint`, `ArticuloEstadisticasResultado`;
- `tipo = unidades | importe`;
- `year` y `month` nullable para representar `Todos`;
- `availableYears` con rango continuo entre primer y último año con ventas;
- puntos con `year`, `month`, `day` nullable y `value`;
- `value` = unidades o microeuros según tipo;
- SQL agregado sobre `linea_venta` + `venta`;
- exclusión de ventas con `venta.deleted_at IS NOT NULL`;
- devolución neta mediante SUM de valores positivos/negativos;
- relleno de períodos sin actividad con cero en `ArticulosService` mediante utilidad pura;
- validación de id de artículo, tipo, año 1..9999 y mes 1..12;
- API/IPC/preload/servicio Angular ya expuestos;
- tests unitarios y de repository SQLite cerrados.

`13J.2 — Gráfica + filtros` ✅ usa:

```text
echarts ^6.1.0
ngx-echarts ^22.0.0
```

La integración es standalone y modular: registra únicamente barras, grid, tooltip y `CanvasRenderer` mediante `provideEchartsCore`. ECharts queda limitado a presentación; no consulta ventas individuales ni reagrupa datos en renderer.

La UI definitiva incluye:

- gráfica de barras;
- total visible en la cabecera como `N unidades` o importe formateado en euros;
- `MatSelect` para Tipo, Mes y Año;
- tooltips adaptados a unidades/importe;
- eje Y entero para unidades;
- microeuros convertidos a euros únicamente en la frontera de presentación;
- protección mediante secuencia de petición frente a respuestas IPC fuera de orden;
- estado de carga, error con reintento y estado sin ventas netas;
- etiquetas del eje X adaptadas a las cuatro combinaciones de Año/Mes;
- resize automático de la gráfica.

Diseño final validado:

- bloque compacto para evitar scroll;
- gráfica de `275px` de altura;
- cabecera reducida a `Ventas del artículo` y el valor total;
- eliminados el subtítulo `Evolución histórica según los filtros seleccionados` y la etiqueta `Total`;
- filtros compactos en la zona inferior;
- `month = null` y `year = null` mantienen la semántica de `Todos`;
- los selectores Mes y Año usan `canSelectNullableOptions` para que Angular Material muestre `Todos` también con el panel cerrado.

La pestaña es de solo lectura, no forma parte del `ArticuloDraft` y nunca genera `dirty`. Estadísticas e Histórico no se ofrecen en artículos nuevos sin persistir.

La implementación y los retoques visuales fueron probados por el usuario y subidos al repositorio.

---

# 21. Histórico

`13H — Histórico` está **cerrado ✅**.

Es una sección de solo lectura sobre movimientos ya persistidos y **no forma parte del `ArticuloDraft` ni modifica `dirty`**.

Columnas definitivas:

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

La consulta se pagina y ordena realmente en SQLite con tamaños:

```text
20 · 50 · 100 · 200
```

`MatTable` solo presenta la página actual; `MatSort` y `MatPaginator` solicitan nuevas páginas al backend.

Tipos conocidos:

```text
1 → Venta
2 → Venta (web)
3 → Pedido
4 → Manual
5 → Inventario
6 → Inventario (múltiple)
otro → Tipo N
```

El histórico conserva información aunque el artículo sea dado de baja. La sección no se ofrece en artículos nuevos todavía no persistidos; el componente conserva además la protección defensiva de no realizar una llamada IPC si recibe un draft sin id.

---

# 22. Observaciones

`13G — Observaciones` está **cerrado ✅**.

Campos implementados:

```text
Observaciones
Mostrar en Ventas
Mostrar en Pedidos
```

La pestaña usa:

- un textarea amplio para el texto único de observaciones;
- `MatSlideToggle` para `Mostrar en Ventas`;
- `MatSlideToggle` para `Mostrar en Pedidos`;
- disposición en dos columnas en pantallas amplias: texto a la izquierda y opciones de visibilidad a la derecha.

Los tres campos modifican directamente el mismo `ArticuloDraft` mediante `ArticuloDraftPatch`, participan en el `dirty` global y **no tienen guardado independiente**.

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

Se usa el mismo texto de observaciones. Los toggles permanecen conceptualmente independientes de que el texto esté vacío o no.

---

# 23. Baja

`13I.3 — Baja lógica` está **cerrado ✅**.

Acción:

```text
Dar de baja
```

Solo está disponible para artículos persistidos. La sección `BAJA` no se muestra en una ficha nueva.

No se permite ejecutar la baja con cambios locales pendientes:

```text
dirty = true
→ Guardar o Cancelar primero
```

La UI explica que el artículo dejará de estar disponible en el TPV pero sus datos históricos permanecerán, y solicita confirmación explícita antes de ejecutar la operación.

Flujo implementado:

```text
BAJA
→ confirmación
→ ArticulosApi.deactivate(id)
→ IPC / preload
→ backend ArticulosService.deactivate()
→ transacción SQLite
→ cerrar pestaña solo tras éxito
```

Semántica persistente:

```text
soft delete articulo
+ soft delete codigos_barras activos
+ conservar historico_articulo
+ conservar categorías/relaciones históricas
+ conservar relaciones de fotos y assets archivo/WebP
```

El acceso directo no necesita ponerse físicamente a `null`: las resoluciones normales filtran artículos activos, por lo que deja de ser utilizable al quedar el artículo dado de baja.

Tras una baja correcta la pestaña desaparece. No se muestra diálogo adicional de éxito porque el cierre de la ficha es la confirmación visual. Si backend falla, la pestaña permanece abierta y puede reintentarse.

Un artículo dado de baja deja de resolverse/buscarse como activo mediante localizador, código adicional o acceso directo.

---

# 24. Acciones inferiores

`13I — Baja / duplicado / acciones` está **cerrado y validado ✅**.

```text
Duplicar     ✅
Cancelar     ✅
Guardar      ✅
Dar de baja  ✅
```

La barra inferior es global a toda la ficha y permanece fuera de las secciones internas.

## Duplicar — ✅

```text
Artículo persistido + limpio
→ confirmación
→ nueva pestaña temporal
→ copiar configuración reutilizable
→ resetear identidades/datos exclusivos
→ NO persistir
```

La copia nace con:

```text
id = null
publicId = null
localizador = null
stock = 0
accesoDirecto = null
códigos adicionales = []
referencia = ''
observaciones = ''
dirty = true
```

Las fotos persistidas se reutilizan mediante nuevas relaciones `articulo_archivo` al mismo asset `archivo`; no se duplica físicamente el WebP.

## Cancelar — ✅

```text
confirmación
→ limpiar staged nuevos
→ restaurar baseSnapshot
→ dirty = false
```

Después de Guardar, el estado persistido devuelto por backend pasa a ser el nuevo snapshot base.

## Guardar — ✅

Persiste el `ArticuloDraft` completo mediante una única acción global.

Si cambia stock en un artículo existente:

```text
actualizar artículo
+
crear histórico de stock tipo 4
```

Tras éxito se muestra durante 4 segundos:

```text
Artículo guardado correctamente
```

El mensaje desaparece antes si la ficha vuelve a modificarse.

## Dar de baja — ✅

```text
artículo persistido + limpio
→ pestaña BAJA
→ confirmación explícita
→ deactivate transaccional
→ cerrar pestaña tras éxito
```

La acción está bloqueada cuando `dirty=true` y no existe para artículos nuevos. La baja hace soft delete del artículo y de sus códigos activos, conservando histórico, categorías, relaciones de fotos y assets WebP.

## Guardar y cerrar

No existe actualmente como acción implementada en el bloque `13I`; el flujo actual separa Guardar de cerrar pestaña. No añadirlo salvo que se decida explícitamente más adelante.

---

# 25. Integración con Ventas

`13K — Integración con Ventas` está **cerrado y validado ✅**.

Desde una línea de venta:

```text
click sobre el nombre de una línea normal de artículo
→ ArticulosService.cargarPorId(idArticulo)
→ cargar o activar la ficha
→ navegar a /articulos
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

Reglas definitivas:

- solo se aplica a líneas normales con `idArticulo`;
- si la ficha ya está abierta, se activa sin recargarla y conserva `draft`, `dirty`, cambios locales y sección activa;
- si no está abierta, se carga y abre una única pestaña;
- una señal `openingArticle` evita dobles aperturas concurrentes;
- si el artículo ya no está disponible, se muestra aviso y Ventas permanece activa;
- antes de navegar se deja preparado el foco del Localizador para continuar el flujo al volver a Ventas;
- el workspace de Ventas conserva durante la sesión la venta abierta y todas sus líneas;
- las ramas especiales de Varios, Devolución y Reserva mantienen su comportamiento anterior;
- el icono y tooltip de observaciones permanecen independientes de la acción de abrir la ficha.

La integración fue probada, recibió un último retoque visual no funcional y todos los cambios fueron subidos al repositorio.

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

Workspace Angular implementado:

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

## 28.9 Limpieza física de fotos persistidas huérfanas — pendiente

Al eliminar una **foto ya persistida** de un artículo y guardar globalmente la ficha:

```text
DELETE relación articulo_archivo
```

Por ahora no se elimina automáticamente:

```text
fila archivo
fichero físico
```

La limpieza segura de esos huérfanos definitivos debe coordinarse fuera del repository para no mezclar filesystem y transacciones SQLite de forma insegura. Esta deuda es distinta del staging temporal de `13E.2B`, cuyo ciclo de vida sí está cerrado.

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

## 28.11 Import legacy y resto de imágenes — ✅ cerrado en 13B.6E

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

Regla de pestañas al buscar desde una ficha nueva:

```text
Artículo nuevo
→ usar su campo Localizador para buscar/resolver
→ el primer artículo encontrado REUTILIZA esa misma pestaña
```

Si el artículo localizado ya estaba abierto:

```text
borrador origen nuevo se cierra
→ se activa la pestaña existente
→ nunca se crea duplicado
```

Si desde el buscador se seleccionan varios artículos, el primero reutiliza la pestaña nueva de origen y los siguientes se abren mediante el comportamiento normal del workspace. Buscar desde una ficha ya persistida no sustituye esa ficha: abre o activa la pestaña del artículo localizado.

Cuando todo el contenido del Localizador está seleccionado y se pulsa una letra, la consulta comienza por esa letra; no se concatena el localizador persistido con el texto de búsqueda.

Un artículo ya abierto nunca genera una segunda pestaña.

---

# 28C. 13D — General ✅ MINI-HITO COMPLETAMENTE CERRADO

General queda completamente cerrado y validado, incluida la pasada final `13D.R` de diseño y funcionalidad. No reabrir este apartado salvo regresión o requisito nuevo.

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
Venta online
Stock
Stock mínimo
Stock máximo
Lote óptimo
```

**Acceso directo ya no se edita como campo de General.** Se gestiona desde un modal específico accesible mediante un icono junto al Localizador; ver `28C.9`.

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

Presentación/edición final:

```text
importes monetarios → máximo 2 decimales visibles/editables
márgenes/porcentajes → máximo 2 decimales visibles/editables
precisión interna PALB/PUC/márgenes → se conserva en microescala
```

La edición de precios y márgenes recalcula **mientras se escribe** cuando el texto ya representa un decimal completo. Estados transitorios como `12,`, `12.`, `-` o campo vacío no disparan cálculo hasta completarse o perder el foco. Al recibir foco, los campos decimales seleccionan todo su contenido una sola vez; un segundo click con el foco ya activo permite colocar el cursor normalmente. Los campos de Stock usan el mismo comportamiento de selección al foco.

`marginList` se usa como sugerencia, no como restricción. Además existe un modal de Márgenes que muestra, para cada margen configurado, el PVP calculado con el PUC actual; seleccionar una opción aplica ese margen, actualiza PVP y cierra el modal.

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


## 28C.9 13D.R1 — Accesos directos ✅

El campo `accesoDirecto` continúa formando parte del artículo persistido, pero **ya no aparece como input en General**.

Junto al Localizador existe un icono de gestión de accesos directos que abre un modal global.

El modal muestra:

```text
Acceso directo | Artículo | Borrar
```

Permite:

- consultar todos los accesos directos asignados a artículos activos;
- borrar cualquiera de ellos;
- si la ficha actual corresponde a un artículo ya persistido, asignarle o cambiarle su acceso directo;
- si la ficha actual es un artículo nuevo todavía no guardado, consultar la lista pero no asignar acceso todavía.

Las modificaciones de acceso directo son **persistencia inmediata**, independientes del botón Guardar de la ficha. El backend reutiliza la validación central del espacio comercial para impedir colisiones con otros accesos, localizadores o códigos de barras.

Si el artículo afectado está abierto en el workspace, `ArticulosService` sincroniza el nuevo acceso tanto en `draft` como en `baseSnapshot`, preservando cualquier otro cambio local dirty. Por tanto:

```text
Nombre modificado localmente → dirty
cambiar acceso directo desde modal → COMMIT inmediato
Cancelar cambios de ficha → restaura Nombre
                           → NO restaura el acceso anterior
```

La lista se refresca después del cambio. Si el COMMIT ha funcionado pero falla la recarga posterior, la UI informa expresamente de que el cambio se guardó pero no se pudo refrescar la lista; no presenta falsamente la operación como fallida.

## 28C.10 13D.R2 — General compacto ✅

La maquetación final de GENERAL busca densidad operativa, inspirada funcionalmente en el TPV legacy pero manteniendo la estética del cliente nuevo.

Decisiones cerradas:

- controles superiores y numéricos de tamaño contenido, sin estirarse para ocupar toda la pantalla;
- algo de aire entre grupos para que la pantalla se vea llena pero no abarrotada;
- eliminación de títulos intermedios como `Fiscalidad y precios` y `Stock y planificación`;
- grupos reconocibles por posición y etiquetas de los propios campos;
- `Venta online` usa `MatSlideToggle`;
- `Descuento` usa `MatSlideToggle`;
- Categorías usa `mat-select multiple`;
- el panel del multiselect no queda limitado al ancho estrecho del trigger y permite leer nombres largos;
- se mantiene la representación jerárquica mediante sangría visual;
- Precio albarán, PUC, Margen, PVP y campos de descuento muestran como máximo dos decimales;
- la precisión interna del dominio no se reduce por esa presentación;
- los campos decimales recalculan durante `(input)` salvo estados transitorios de escritura;
- al obtener foco se selecciona el contenido de importes/márgenes y campos de stock, pero no se vuelve a seleccionar con clicks posteriores mientras conservan el foco;
- junto al Margen existe un botón para abrir el modal de sugerencias de `marginList`;
- el Margen permanece editable directamente además de poder elegirse desde el modal.

La disposición final validada queda conceptualmente así:

```text
Marca              IVA             RE              Venta online
Proveedor          Categorías      Referencia

Precio albarán     Descuento                       Stock
PUC                 Descuento %                     Stock mínimo
Margen + sugerencias Margen dto.                    Stock máximo
PVP                 PVP dto.                        Lote óptimo
```

`13D.R2` ha sido validado funcional y visualmente por el usuario y cierra definitivamente General.

---

# 28D. 13E — WEB ✅ MINI-HITO COMPLETAMENTE CERRADO

`13E` queda cerrado y validado funcionalmente por el usuario.

La pestaña `WEB` sigue siendo una sección del mismo workspace de Artículos; **no representa una entidad ni un formulario independiente**.

Regla conceptual cerrada:

```text
ArticuloWorkspaceTab
  └─ ArticuloDraft único
       ├─ GENERAL
       ├─ WEB
       ├─ CÓDIGOS DE BARRAS
       ├─ OBSERVACIONES
       └─ resto de apartados

Guardar / Cancelar / Duplicar
→ operan sobre el artículo completo
→ NO existe "guardar WEB"
```

## 28D.1 13E.1 — Contenido WEB ✅

Cuando `ventaOnline = true`, aparece dinámicamente la sección `WEB`.

Campos implementados:

```text
Mostrar en web
Descripción corta
Descripción larga
```

Reglas cerradas:

- `Mostrar en web` usa `MatSlideToggle`;
- las descripciones actualizan directamente el `ArticuloDraft` mediante `ArticuloDraftPatch`;
- cualquier cambio participa en el `dirty` global de la ficha;
- desactivar `Venta online` oculta WEB y devuelve la sección activa a GENERAL si era necesario;
- ocultar WEB **no borra** `mostrarEnWeb`, descripciones ni fotos;
- al reactivar `Venta online`, el contenido reaparece intacto;
- varias fichas abiertas conservan su contenido WEB de forma independiente durante la sesión.

## 28D.2 13E.2A — Staging + galería 0..N ✅

WEB se organiza en dos columnas en pantallas amplias:

```text
izquierda → Mostrar en web + descripciones
derecha   → Fotos
```

La galería soporta:

- selección múltiple desde file picker;
- drag & drop;
- `0..N` fotos;
- preview de persistidas y staged;
- primera foto principal automática cuando no existe otra;
- elección explícita de principal;
- reordenación;
- eliminación;
- visualización de nombre, dimensiones y tamaño;
- draft actualizado de forma atómica por colección de fotos.

El renderer dispone de una API específica de archivos temporales:

```text
files.stageArticleImage()
files.discardStagedImage()
```

El renderer no decide el `purpose`; el proceso principal fuerza:

```text
article_image
```

La imagen entra por `ImageStagingService`, que aplica el procesador común Sharp y deja el staging en WebP canónico.

Regla global que sigue vigente:

```text
TODAS las imágenes persistidas por Osumi TPV → WebP
```

## 28D.3 13E.2B — Crop ✅

Antes de crear staging, cada imagen pasa por un modal de recorte.

Flujo:

```text
seleccionar/arrastrar imágenes
→ crop secuencial por imagen
→ confirmar todos los crops
→ staging
→ Sharp → WebP canónico
→ incorporar lote al draft
```

Decisiones:

- crop libre, sin proporción obligatoria;
- el resultado temporal del crop puede ser PNG/blob en memoria;
- ese formato intermedio **no se persiste**;
- la salida sigue pasando por `stageArticleImage()` y Sharp;
- un lote de varias fotos solo se incorpora al draft cuando ha terminado correctamente;
- cancelar durante el crop cancela el lote y, como todavía no existe staging, no hay temporales que limpiar;
- si el staging falla a mitad de un lote, se descartan los staged ya creados y no se incorpora parcialmente el lote al draft.

## 28D.4 Ciclo de vida del staging ✅

Se cerró también el ciclo de vida de las imágenes temporales.

Reglas:

```text
eliminar foto staged del draft
→ discardStagedImage()
→ eliminar del draft
```

```text
Cancelar cambios globales
→ identificar stagingId presentes en draft pero no en baseSnapshot
→ descartar temporales
→ restaurar snapshot
```

```text
Cerrar pestaña confirmando descarte
→ limpiar staged pendientes
→ cerrar pestaña
```

```text
Artículo nuevo con fotos staged
→ buscar/resolver otro artículo desde Localizador
→ limpiar staged del borrador
→ reutilizar/cerrar pestaña origen según regla del workspace
```

```text
navegar Ventas ↔ Artículos
→ NO descartar staging
→ la ficha sigue viva en el workspace
```

Durante un staging asíncrono, si el componente desaparece antes de incorporar el resultado al draft, las imágenes staged creadas se descartan para evitar temporales huérfanos.

## 28D.5 Guardado global de WEB/Fotos

No existe un `13E.3 Guardado/validación WEB` independiente.

El backend ya soporta las fotos dentro del guardado transaccional global de Artículos:

```text
ArticuloDraft completo
→ ArticuloSaveInterface
→ ArticulosService.save()
→ prepare staged → storage definitivo
→ transacción SQLite del artículo + relaciones/fotos
→ commit
→ descartar staging consumido
→ getById() fresco
```

Si SQLite falla después de preparar copias definitivas:

```text
rollback de copias definitivas
→ staging se conserva
→ el usuario puede reintentar el guardado global
```

Si SQLite confirma commit y falla una limpieza temporal posterior, el guardado **sigue considerándose correcto**.

Por tanto, la persistencia definitiva de WEB está integrada con las acciones inferiores globales del artículo ya implementadas en `13I.1`; no debe aparecer ningún botón Guardar dentro de WEB.

**`13E — WEB` queda cerrado ✅.**

---

# 28E. 13F — Códigos de barras ✅ MINI-HITO COMPLETAMENTE CERRADO

`13F` queda cerrado y validado funcional y visualmente por el usuario.

La pestaña forma parte del mismo `ArticuloDraft`; no existe guardado propio.

UX definitiva:

```text
entrar en CÓDIGOS DE BARRAS
→ foco automático en Nuevo código de barras
→ escribir o escanear
→ Enter / Añadir
→ tarjeta aparece inmediatamente en el draft
```

Visualmente:

- `angularx-qrcode` genera los QR;
- tres tarjetas por fila en pantallas amplias;
- código por defecto en tarjeta diferenciada, sin borrar;
- códigos adicionales en tarjetas con QR, valor e icono de borrar;
- no existe edición inline de códigos ya añadidos.

Código por defecto:

```text
localizador
→ fila real codigo_barras
→ por_defecto = 1
```

Para un artículo nuevo, la tarjeta principal se muestra como pendiente hasta disponer del localizador generado por backend.

Los adicionales son `0..N` y solo modifican `codigosBarrasAdicionales` del draft. Añadir/eliminar no escribe SQLite; el guardado global sincronizará altas y bajas lógicas.

Validación local cerrada:

- vacío no permitido;
- duplicado dentro de la ficha no permitido;
- no coincidir con localizador actual;
- no coincidir con acceso directo actual.

La validación global de colisiones permanece en backend.

---

# 28F. 13G — Observaciones ✅ MINI-HITO COMPLETAMENTE CERRADO

`13G` queda cerrado y validado funcional y visualmente por el usuario.

Contenido:

```text
Observaciones
Mostrar en Pedidos
Mostrar en Ventas
```

Implementación:

- textarea amplio para el texto;
- `MatSlideToggle` para Pedidos;
- `MatSlideToggle` para Ventas;
- diseño de dos columnas en pantallas amplias;
- los cambios actualizan directamente el mismo `ArticuloDraft`;
- participa en el `dirty` global;
- no existe guardado/cancelación independiente de Observaciones.

La intención funcional futura se mantiene:

```text
Mostrar en Ventas = true
→ la línea de venta podrá mostrar icono/tooltip con observaciones

Mostrar en Pedidos = true
→ la línea de pedido podrá mostrar icono/tooltip con observaciones
```

---

# 28G. 13H — Histórico ✅ MINI-HITO COMPLETAMENTE CERRADO

`13H` queda cerrado y validado funcional y visualmente por el usuario.

A diferencia de General/WEB/Códigos/Observaciones, Histórico **no forma parte del `ArticuloDraft`** y nunca modifica el estado `dirty` de una ficha. Es una consulta de movimientos ya persistidos.

## 28G.1 Backend + API paginada — ✅

Se añadió un contrato público específico para Histórico con:

```text
ArticuloHistoricoConsulta
ArticuloHistoricoItem
ArticuloHistoricoResultado
ArticuloHistoricoSortField
ArticuloHistoricoSortDirection
```

La consulta incluye:

```text
idArticulo
pagina
num
orderBy
orderDirection
```

Tamaños permitidos, manteniendo la UX legacy:

```text
20 · 50 · 100 · 200
```

El repository ejecuta ordenación y paginación reales en SQLite:

```text
WHERE id_articulo = ?
ORDER BY <columna permitida> ASC|DESC, id ASC|DESC
LIMIT ?
OFFSET ?
```

La columna SQL nunca procede directamente del renderer: existe un mapa cerrado de campos públicos → columnas SQL. La dirección se reduce explícitamente a `ASC` / `DESC`.

Datos devueltos por movimiento:

```text
id
publicId
tipo
stockPrevio
diferencia
stockFinal
idVenta
idPedido
idMermaCaducidad
pucMicros
pvpMicros
createdAt
```

Se conserva `idMermaCaducidad` en el contrato aunque la UI inicial no lo muestre, para no perder información histórica útil para futuros módulos.

La API está expuesta por toda la cadena:

```text
TypeOrmArticulosRepository.findHistorico()
→ ArticulosService.getHistorico()
→ IPC articulos:get-historico
→ preload
→ ArticulosApi.getHistorico()
→ ArticulosService Angular
```

Validaciones backend:

- id de artículo entero positivo;
- página >= 1;
- tamaño solo 20/50/100/200;
- campo de orden permitido;
- dirección `asc` o `desc`;
- offset dentro de rango seguro.

El histórico legacy puede contener tipos no perfectamente normalizados. Regla cerrada:

```text
no reinterpretar ni corregir datos importados
→ mostrar el valor persistido
```

## 28G.2 Tabla, orden y paginación — ✅

Componente:

```text
ArticleHistoryComponent
```

UI definitiva:

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

`MatTable` se limita a presentar la página recibida. `MatSort` y `MatPaginator` disparan nuevas consultas a SQLite; no se usa `MatTableDataSource` para ordenar otra vez en frontend.

Orden inicial:

```text
createdAt DESC
```

Al cambiar el orden:

```text
volver a página 1
→ solicitar página remota con nuevo orderBy/orderDirection
```

Al paginar:

```text
pageIndex + 1
→ backend calcula offset
```

Se añadió protección frente a respuestas fuera de orden mediante un contador/secuencia de petición: una respuesta antigua no puede sobrescribir el resultado de una consulta posterior.

Etiquetas de tipo:

```text
1 → Venta
2 → Venta (web)
3 → Pedido
4 → Manual
5 → Inventario
6 → Inventario (múltiple)
otro → Tipo N
```

El cambio manual de stock generado desde la ficha sigue creando histórico **tipo 4**.

Artículo nuevo:

```text
id = null
→ ocultar Histórico en las pestañas disponibles
→ protección defensiva del componente: no llamar a IPC
```

Artículo persistido sin movimientos:

```text
→ estado vacío específico
```

Entrar/salir de Histórico recrea el componente y refresca naturalmente la información persistida.

## 28G.3 MatPaginator en castellano — ✅

`LOCALE_ID = es-ES` no traduce por sí solo `MatPaginator`.

Se añadió un `MatPaginatorIntl` global:

```text
SpanishPaginatorIntlService
```

Textos definitivos:

```text
Elementos por página:
Primera página
Página anterior
Página siguiente
Última página
1 – 20 de N
```

Esto también corrigió el tooltip del botón de última página y deja cualquier paginador futuro de la aplicación traducido globalmente.

**`13H — Histórico` queda cerrado ✅.**

---

# 28H. Refinamiento UX — foco automático en Localizador ✅

Tras cerrar Histórico se añadió un refinamiento pequeño al workspace.

Regla definitiva:

```text
Nuevo artículo desde pantalla vacía
→ foco automático en Localizador

pulsar + para crear otra pestaña nueva
→ foco automático en Localizador
```

El foco se aplica cuando la pestaña activa pasa a ser un draft nuevo y se identifica por su `idTemporal`, evitando reenfocar el campo en cada modificación del draft.

Al volver desde un artículo persistido a una pestaña nueva ya existente, Localizador vuelve a recibir foco, lo que mantiene preparado el flujo de teclado/lector.

No se fuerza foco al abrir un artículo persistido desde búsqueda o resolución.

---

# 28I. 13I — Baja / duplicado / acciones ✅ MINI-HITO COMPLETAMENTE CERRADO

`13I` queda cerrado y validado funcionalmente por el usuario:

```text
13I.1 Guardar / Cancelar global ✅
13I.2 Duplicar                  ✅
13I.3 Baja lógica               ✅
```

## 28I.1 Guardar / Cancelar global — ✅

Por primera vez toda la ficha de Artículos es persistible mediante una única acción global.

Se añadió el mapper/validador:

```text
createArticuloSaveCommand(draft)
```

Responsabilidad:

```text
ArticuloDraft
→ validación mínima de renderer
→ ArticuloSaveInterface
```

Validaciones renderer cerradas:

- nombre obligatorio;
- marca obligatoria;
- fiscalidad IVA/RE obligatoria.

Los strings opcionales se normalizan:

```text
trim()
vacío → null
```

El comando incluye conjuntamente:

```text
GENERAL
WEB
fotos
códigos adicionales
observaciones
stock
precios/fiscalidad
categorías
acceso directo
```

Se expuso `ArticulosService.save()` existente al renderer:

```text
ArticulosApi.save()
→ IPC articulos:save
→ preload
→ servicio Angular
```

`ArticulosService.guardar(idTemporal)`:

```text
requireTab()
→ createArticuloSaveCommand()
→ window.osumiDesktop.articulos.save()
→ backend transaccional existente
→ reemplazarTrasGuardado()
```

Tras guardar:

```text
nuevo artículo
→ backend genera localizador
→ crea código por defecto = localizador
→ promociona staging de fotos
→ devuelve artículo fresco
→ draft/baseSnapshot se reconstruyen
→ dirty = false
```

Para un artículo existente:

```text
UPDATE transaccional
→ getById() fresco
→ nuevo baseSnapshot
→ dirty = false
```

Si falla validación o backend:

```text
draft intacto
staging intacto
puede corregirse/reintentarse
```

### Barra global inferior

Se añadió un footer común a toda la ficha, independiente de la sección activa:

```text
[acciones izquierda]                         [Cancelar] [Guardar]
```

`Guardar` y `Cancelar` trabajan sobre el artículo completo, nunca sobre una pestaña interna concreta.

Durante una acción persistente:

```text
processingTabId
→ bloquear acciones repetidas
→ Guardando… mientras la operación está pendiente
```

`Cancelar`:

```text
confirmación
→ descartar staging pendiente
→ restaurar baseSnapshot
→ dirty = false
```

Se reutiliza `descartarCambios()` de `13E.2B`, por lo que cancelar una ficha con fotos temporales no deja staged huérfanos.

### Feedback de guardado — ✅

Como el guardado suele ser muy rápido, se añadió confirmación visual no intrusiva:

```text
Artículo guardado correctamente │ Cancelar │ Guardar
```

Comportamiento:

```text
guardado OK
→ mensaje durante 4 segundos
→ desaparece automáticamente
```

Si el usuario vuelve a modificar esa ficha antes:

```text
→ el mensaje desaparece inmediatamente
→ Guardar vuelve a habilitarse por dirty
```

El feedback pertenece a la pestaña concreta guardada; cambiar a otro artículo no muestra el mensaje en la ficha equivocada.

## 28I.2 Duplicar — ✅

Duplicar conserva la filosofía legacy: **no escribe nada en SQLite al pulsar el botón**. Crea una nueva pestaña editable/draft.

Reglas de disponibilidad:

```text
solo artículo persistido
solo ficha limpia (dirty = false)
sin staging temporal pendiente
```

Si hay cambios, primero Guardar o Cancelar.

Transformación definitiva del draft duplicado:

```text
id                       → null
publicId                 → null
localizador              → null
nombre                   → "<original> (copia)"
referencia               → ''
stock                    → 0
accesoDirecto            → null
codigosBarrasAdicionales → []
observaciones            → ''
```

Se conservan:

```text
marca
proveedor
categorías
PALB / PUC / PVP
IVA / RE
márgenes
descuento
stockMin / stockMax / loteOptimo
ventaOnline
mostrarEnWeb
descripciones WEB
fotos
flags de observaciones
```

El acceso directo **no se copia** aunque el legacy lo hiciera implícitamente, porque en el cliente nuevo es único y provocaría colisión.

La nueva pestaña:

```text
activeSection = general
baseSnapshot = createEmptyArticuloDraft()
dirty = true
```

Por tanto:

```text
Duplicar
→ nueva ficha editable sin persistir
→ Guardar habilitado inmediatamente
```

Cancelar sobre la copia revierte conceptualmente la operación y deja la pestaña como un artículo nuevo vacío.

### Reutilización segura de fotos persistidas

El backend original de creación solo aceptaba fotos nuevas provenientes de staging. Para poder duplicar sin reescribir físicamente los WebP se amplió la creación de artículos para aceptar también fotos persistidas reutilizables.

Regla de almacenamiento:

```text
NO copiar físicamente el WebP
```

`archivo` representa el asset inmutable y `articulo_archivo` la relación con cada artículo. Un duplicado puede crear otra relación al mismo `archivo`:

```text
Artículo original ─┐
                   ├─ articulo_archivo → archivo → foto.webp
Artículo copia ────┘
```

Orden y principal siguen siendo independientes porque viven en `articulo_archivo`.

Validaciones añadidas al crear con foto persistida:

- el archivo debe existir;
- `deleted_at IS NULL`;
- `purpose = article_image`;
- no repetir el mismo id de archivo dentro de la colección;
- las fotos nuevas siguen validándose como WebP de artículo.

`insertPhotos()` soporta ahora ambos casos:

```text
idArchivo != null
→ reutilizar asset persistido

nuevoArchivo != null
→ INSERT archivo nuevo
```

Consecuencia importante:

```text
eliminar una foto de la copia y guardar
→ elimina solo su relación articulo_archivo
→ la foto del original permanece intacta
```

### Footer tras Duplicar

La disposición actual queda:

```text
Duplicar           Artículo guardado correctamente │ Cancelar │ Guardar
```

`Duplicar` solo aparece/está disponible para artículos persistidos limpios.

## 28I.3 Baja lógica — ✅

Se expuso el caso de uso backend ya existente hasta renderer:

```text
ArticulosApi.deactivate(idArticulo)
→ IPC articulos:deactivate
→ preload
→ ArticulosService.darDeBaja(idTemporal)
```

Reglas cerradas:

- solo artículo persistido;
- ficha obligatoriamente limpia (`dirty=false`);
- la sección `BAJA` se oculta en drafts nuevos;
- mensaje explicativo antes de la acción;
- confirmación explícita;
- `processingTabId` bloquea dobles ejecuciones;
- cerrar la pestaña únicamente después de respuesta correcta del backend;
- ante error, mantener la pestaña abierta.

Persistencia:

```text
articulo.deleted_at = timestamp
codigo_barras activos.deleted_at = timestamp
```

Se conservan:

```text
historico_articulo
articulo_categoria
articulo_archivo
archivo / WebP
ventas y pedidos históricos
```

El acceso directo queda inutilizable automáticamente porque las resoluciones filtran `articulo.deleted_at IS NULL`.

Tras éxito no se añadió un segundo diálogo: desaparecer la pestaña confirma visualmente la baja.

**`13I — Baja / duplicado / acciones` queda cerrado ✅.**

---

# 28J. 13J — Estadísticas ✅ MINI-HITO COMPLETAMENTE CERRADO

La funcionalidad nunca llegó a completarse en el TPV legacy, por lo que para el cliente nuevo se ha definido desde cero manteniendo una UI sencilla.

Roadmap:

```text
13J.1 Backend + consulta agregada ✅
13J.2 Gráfica + filtros          ✅
```

## 28J.1 Diseño funcional acordado

La pestaña mostrará una gráfica de barras y tres selectores en su zona inferior:

```text
Tipo: Unidades | Importe
Mes:  Enero..Diciembre | Todos
Año:  <años disponibles> | Todos
```

Cambiar cualquiera de ellos debe actualizar la gráfica inmediatamente.

Semántica temporal:

| Año | Mes | Serie |
| --- | --- | --- |
| concreto | concreto | días 1..N del mes |
| concreto | Todos | 12 meses del año |
| Todos | concreto | mismo mes en cada año |
| Todos | Todos | todos los meses de todos los años en orden cronológico |

No agrupar todos los eneros/septiembres de años distintos en una única barra.

Huecos sin ventas = `0`. Los años intermedios entre primera y última actividad también se conservan aunque no tengan ventas.

## 28J.2 Métrica de negocio

Estadísticas = **ventas netas**:

```text
Unidades → SUM(linea_venta.unidades)
Importe  → SUM(linea_venta.importe_micros)
```

Las devoluciones usan valores negativos y restan. El importe es el histórico real de la línea de venta y no se recalcula con el PVP actual.

Las ventas dadas de baja (`venta.deleted_at IS NOT NULL`) quedan excluidas.

## 28J.3 13J.1 Backend + consulta agregada — ✅

Contratos públicos añadidos:

```text
ArticuloEstadisticasTipo
ArticuloEstadisticasConsulta
ArticuloEstadisticasPoint
ArticuloEstadisticasResultado
```

Consulta pública:

```text
idArticulo
 tipo = unidades | importe
 year = number | null
 month = 1..12 | null
```

Resultado:

```text
tipo
availableYears
points[]
  year
  month
  day | null
  value
total
```

`value` y `total` significan:

```text
unidades → entero de unidades
importe  → microeuros
```

El repository recibe una query interna con `metric = units | amount` y ejecuta agregación SQLite sobre `linea_venta` + `venta` mediante `strftime()`.

Resolución SQL:

```text
year != null && month != null
→ GROUP BY año + mes + día

cualquier otra combinación
→ GROUP BY año + mes
```

La consulta de años disponibles se hace independientemente de los filtros actuales para conocer todo el rango histórico del artículo.

La utilidad pura `createArticuloEstadisticasResult()` transforma los agregados existentes en una serie completa:

- rellena días faltantes del mes;
- rellena los 12 meses de un año;
- crea años intermedios entre mínimo y máximo;
- rellena períodos inexistentes con `0`;
- calcula `total` a partir de la serie final.

Se evita usar `Date` para calcular días de meses/años 0..99; se implementó cálculo gregoriano explícito de año bisiesto.

Validación de aplicación:

- id artículo entero positivo;
- tipo válido;
- año `null` o entero 1..9999;
- mes `null` o entero 1..12.

Cadena expuesta:

```text
ArticulosRepository.findEstadisticas()
→ ArticulosService.getEstadisticas()
→ ArticulosApi.getEstadisticas()
→ IPC articulos:get-estadisticas
→ preload
→ servicio Angular getEstadisticas()
```

Tests cerrados:

- mes bisiesto completo;
- 12 meses de un año con ceros;
- año intermedio sin ventas;
- traducción `importe → amount`;
- validación de mes inválido antes de SQLite;
- agregación SQLite real de unidades/importes;
- devoluciones negativas restan;
- ventas soft-deleted quedan fuera.

`13J.1` está cerrado ✅ y alimenta exclusivamente la representación visual de `13J.2`.

## 28J.4 13J.2 — Gráfica + filtros — ✅

Dependencias instaladas:

```text
echarts ^6.1.0
ngx-echarts ^22.0.0
```

La integración usa la API modular de ECharts con `BarChart`, `GridComponent`, `TooltipComponent` y `CanvasRenderer`, registrada localmente mediante `provideEchartsCore`. No se usa `ng-apexcharts`: ECharts mantiene licencia Apache 2.0 y encaja con el carácter open source del proyecto y su posible ampliación comercial.

Componente:

```text
ArticleStatisticsComponent
```

Selección inicial definitiva:

```text
Tipo  = unidades
Mes   = null → Todos
Año   = año actual
```

La lista de años combina `availableYears` con el año actualmente seleccionado, ordenada de forma descendente. Cambiar Tipo, Mes o Año solicita inmediatamente una nueva serie al backend.

La UI implementa:

- gráfica de barras responsive;
- total formateado como unidades enteras o euros con dos decimales;
- `MatSelect` Tipo/Mes/Año;
- tooltips específicos;
- eje Y con `minInterval = 1` para unidades;
- etiquetas del eje X según la resolución temporal;
- overlay de carga;
- error con acción Reintentar;
- estado `No hay ventas netas para el período seleccionado`;
- `requestSequence` para impedir que una respuesta antigua sobrescriba otra más reciente.

Los importes permanecen en microeuros en el resultado. Solo `toChartValue()`/`microsToEuros()` los convierten a euros para ECharts y para su presentación.

Regla de estado:

```text
Estadísticas
→ solo lectura
→ fuera de ArticuloDraft
→ nunca dirty
```

Estadísticas e Histórico se ocultan para drafts nuevos sin id.

## 28J.5 Ajuste visual definitivo — ✅

Tras validar la primera versión se compactó el bloque para que la pantalla no necesite scroll en la resolución de trabajo.

Diseño final:

```text
Ventas del artículo                            418,77 €

                  gráfica

        Tipo           Mes           Año
```

Cambios cerrados:

- altura de gráfica: `275px`;
- márgenes internos de ECharts reducidos;
- cabecera y filtros compactos;
- eliminado el subtítulo `Evolución histórica según los filtros seleccionados`;
- eliminada la etiqueta `Total`, manteniendo visible el valor;
- `month = null` y `year = null` continúan representando `Todos`;
- Mes y Año usan `[canSelectNullableOptions]="true"` para que Material muestre `Todos` en el trigger cerrado.

La batería automática y las pruebas funcionales/visuales fueron correctas. Todos los cambios están subidos al repositorio.

**`13J — Estadísticas` queda cerrado ✅.**

---

# 28K. 13K — Integración con Ventas ✅ MINI-HITO COMPLETAMENTE CERRADO

La integración permite abrir la ficha de un artículo directamente desde una línea normal del workspace de Ventas.

Flujo definitivo:

```text
Ventas
→ click nombre de artículo de una línea normal
→ ArticulosService.cargarPorId(linea.idArticulo)
→ abrir o activar una única pestaña
→ Router.navigate(['/articulos'])
```

Se reutiliza el comportamiento ya cerrado del workspace:

```text
ficha abierta
→ activar pestaña existente
→ NO recargar desde SQLite
→ preservar cambios locales dirty y sección activa

ficha no abierta
→ cargar artículo persistido
→ crear una única pestaña
```

La implementación pertenece íntegramente al renderer; no necesita contratos, IPC ni backend nuevos.

Reglas cerradas:

- solo las líneas normales con `idArticulo` abren Artículos;
- `openingArticle` bloquea dobles clicks/aperturas concurrentes;
- primero se comprueba/carga la ficha y después se navega;
- si el artículo ya no está disponible, se avisa al usuario sin abandonar Ventas;
- el campo Localizador de Ventas queda preparado para recuperar el flujo al volver;
- el workspace de Ventas conserva la venta abierta, líneas, cliente y demás estado de sesión;
- Varios conserva su editor;
- Devolución conserva su editor;
- Reserva conserva su comportamiento;
- el tooltip de observaciones sigue separado del tooltip/acción de abrir la ficha.

El nombre de artículo se presenta como una acción clickable con feedback visual. Tras la implementación se aplicó un pequeño retoque final de diseño sin alterar la semántica descrita.

Se validaron los casos de ficha ya abierta, ficha dirty, varias fichas, artículo no abierto, regreso a Ventas, líneas especiales, observaciones y artículo dado de baja. Todos los cambios fueron subidos al repositorio.

**`13K — Integración con Ventas` queda cerrado ✅.**

Con ello, **todo el Hito 13 — Artículos queda terminado y cerrado ✅**.

---

# 29. Hito 14 — Clientes 🟦 EN CURSO

El análisis funcional y técnico está cerrado. El módulo conservará el modelo mental útil del TPV legacy, pero se implementará sobre la arquitectura actual y corregirá sus problemas de consultas, estado, precisión monetaria, integridad y documentación.

Esta versión toma como nueva base funcional el estado de `main` contrastado hasta el commit `8be974b`, que cierra `14J.2D3 — servicio Angular y reconciliación de caché`. Después se ha limpiado la duplicación accidental de tres tests de `clientes.service.spec.ts`, sin cambio funcional. Todo `14I`, `14J.1` y `14J.2` queda validado; el siguiente bloque es `14J.3 — modal Angular`.

## 29.1 Objetivo y alcance

Clientes gestiona las fichas de los clientes registrados en el TPV.

No se mostrará una lista permanente de todos los clientes. El flujo principal será:

```text
Clientes
→ estado inicial casi vacío
→ Buscar cliente o Nuevo cliente
→ seleccionar/crear
→ mostrar una única ficha de cliente
```

Solo puede existir un cliente activo en el workspace de Clientes. No habrá pestañas independientes para varios clientes como en Artículos.

El estado se conservará durante la ejecución de la aplicación:

- cliente seleccionado;
- cliente nuevo todavía no persistido;
- sección activa;
- draft y baseSnapshot;
- estado dirty;
- datos ya cargados de secciones de solo lectura cuando sigan vigentes.

Navegar a otro módulo y volver no debe perder este estado. Intentar buscar otro cliente, crear uno nuevo, quitar la ficha o descartarla con cambios pendientes exige confirmación.

## 29.2 Forma de trabajo acordada

El desarrollo continuará manualmente y por mini-hitos:

1. El asistente revisa el main y los archivos actuales antes de cada propuesta.
2. Se acuerda el objetivo del mini-hito.
3. Para archivos nuevos se entrega el contenido completo.
4. Para archivos existentes se muestra un fragmento actual identificable y cómo debe quedar.
5. Cuando haya que añadir imports, basta con indicar cuáles son; Prettier los ordena automáticamente al guardar y no es necesario describir entre qué imports deben colocarse.
6. El usuario aplica manualmente los cambios.
7. El usuario ejecuta las comprobaciones, valida visual y funcionalmente y comunica cualquier ajuste propio.
8. No se avanza al siguiente mini-hito hasta recibir su confirmación.
9. Cada propuesta comienza o termina con un resumen breve de lo completado, el bloque actual y los bloques pendientes.

El asistente no hará commits ni pull requests. Puede leer los repositorios legacy y actual para fundamentar las propuestas.

Los tests, typecheck, lint y builds pertinentes se ejecutarán en cada mini-hito y no se acumularán para el cierre.

## 29.3 Infraestructura actual reutilizable y estado real

El repositorio nuevo dispone actualmente de:

- carga completa de clientes durante `ApplicationStartupService`;
- `ClientesService` Angular con colección reactiva en memoria, búsqueda por id/publicId y caché de estadísticas rápidas;
- ruta `/clientes`, navegación activa desde `HeaderComponent` y página standalone propia;
- workspace reactivo persistente durante la sesión para una única ficha;
- `ClienteWorkspace` con identidad persistida nullable, `draft`, `baseSnapshot`, `dirty` y `activeSection`;
- creación de borrador nuevo, apertura de cliente persistido, cambio de sección, cancelación y cierre;
- modal `ClientSearchComponent` con búsqueda normalizada totalmente en memoria;
- pestañas `ClientSectionTabsComponent` con visibilidad condicionada por persistencia;
- `ClientFormComponent` signal-based compartido con la creación rápida desde Ventas;
- modelo inicial, mapper cliente → formulario, mapper formulario → comando y utilidades de clonado/comparación;
- validación global y condicional de Datos/Datos de facturación;
- CREATE y UPDATE completos en repository/service/API/IPC/preload/Angular;
- persistencia transaccional y validación backend con solo nombre obligatorio;
- unicidad case-insensitive de DNI/CIF entre clientes activos, excluyendo el propio cliente durante UPDATE;
- descuento presentado como porcentaje y persistido en puntos básicos;
- reconciliación post-COMMIT sin `reload()` obligatorio y conservando la instancia de `Cliente` ya referenciada por Ventas;
- guardado y Cancelar globales, bloqueo de interacciones durante escritura y feedback temporal de éxito;
- baja lógica transaccional de clientes con bloqueo atómico cuando existan facturas activas en estado borrador;
- contrato `deactivate`, canal IPC, preload, servicio Angular y acción de baja completamente operativos;
- reconciliación post-COMMIT de la baja: eliminación de la colección activa, invalidación de estadísticas y cierre de ficha;
- preservación de ficha, colección y cachés cuando la baja es rechazada;
- datos alternativos de facturación conservados aunque `factIgual` esté activo;
- estadísticas rápidas de últimas compras y top de artículos, con caché e invalidación tras guardar ventas;
- documento de protección de datos integrado en la ficha usando `AppData`, el cliente canónico persistido y los nombres de provincia;
- consulta del Histórico ampliada con filtro opcional `clientePublicId`, aplicado de forma coherente al listado, pagos y todos sus agregados;
- pestaña Ventas completamente operativa con periodo explícito, listado firmado, selección accesible, detalle histórico de líneas y pagos, reimpresión y envío de ticket por email;
- protección frente a respuestas antiguas tanto en la carga del listado como en la del detalle;
- acciones documentales vinculadas siempre a la venta de su propia fila, independientemente de la selección del panel derecho;
- nombre del email del ticket unificado: remitente y `{nombreNegocio}` usan `AppData.nombre`;
- estadísticas generales específicas para la ficha de Clientes, expuestas mediante `getEstadisticasGenerales(publicId)` sin sobrecargar la carga inicial de clientes;
- consultas SQLite para últimos artículos, top y suma mensual/anual, con ventas soft-deleted excluidas y devoluciones incluidas con signo negativo;
- jerarquía pública de sumas por años y meses, beneficio y margen calculados en backend, más un total general igualmente calculado antes de llegar al renderer;
- `ClientGeneralStatisticsComponent` con carga lazy, protección frente a respuestas antiguas, estados completos, dos tablas superiores, acordeón anual y total general;
- años y meses reales disponibles ordenados cronológicamente, acordeón inicialmente cerrado y limitado a un único año abierto;
- presentación segura de márgenes no calculables mediante `—`, diferenciación de valores negativos y alineación final de Mes a la izquierda y columnas numéricas a la derecha;
- corrección local de apilamiento del buscador de clientes para que su overlay permanezca por encima de las cabeceras sticky de las tablas;
- consulta específica de consumo mensual por `clientePublicId`, año y mes nullable, agregada en SQLite sobre el importe real de las líneas de venta;
- exclusión de ventas soft-deleted e inclusión de devoluciones con signo negativo también en Consumo mensual;
- series temporales completas con días, doce meses, comparación del mismo mes entre años o todos los meses cronológicos según los filtros;
- períodos sin actividad rellenados con cero y `availableYears` continuo entre el primer y el último año real;
- `ClienteConsumoMensualResultado` con puntos en microeuros y total calculado de forma segura fuera del renderer;
- puente completo `ClientesApi` → IPC → preload → `ClientesService.getConsumoMensual()`;
- `ClientMonthlyConsumptionComponent` con ECharts/ngx-echarts modular, CanvasRenderer, filtros Mes/Año, total, tooltips y selección inicial año actual + Todos los meses;
- estados independientes de carga, vacío y error/reintento, protección frente a respuestas fuera de orden e invalidación al destruir el componente;
- integración lazy de Consumo mensual dentro de Estadísticas sin formar parte del draft ni generar dirty;
- tablas `factura` y `factura_venta` con estados borrador/emitida/anulada, `fecha_emision`, `fecha_anulacion`, instantánea de facturación e importación legacy;
- `factura_venta.activa` distingue relaciones vigentes de relaciones históricas;
- índice único parcial sobre `id_venta WHERE activa = 1`, que permite conservar 0..N relaciones históricas y como máximo una activa;
- importación legacy adaptada: factura numerada eliminada → `anulada`, fecha de eliminación → `fecha_anulacion`, relación histórica inactiva y factura visible;
- Histórico considera `facturada` únicamente cuando existe una relación activa;
- cambiar el cliente de una venta facturada está permitido y no altera sus relaciones ni sus documentos ya emitidos;
- `ClienteFacturasRepository` y `TypeOrmClienteFacturasRepository` operativos para listado, ventas disponibles y CRUD de borradores;
- contrato público `ClienteFacturaInterface` con estado, número oficial `numero_año`, fechas, importe y capacidades derivadas en backend;
- listado de Facturas lazy y cacheado en `ClientesService`, con protección frente a respuestas antiguas, invalidación y reintento;
- `ClientInvoicesComponent` operativo con estados Borrador/Emitida/Anulada, columnas Factura/Fecha/Importe/Estado/Acciones y botón Nueva factura;
- email e impresión visibles solo para emitidas; email se deshabilita si SMTP no está configurado;
- `Nueva factura` se bloquea cuando la ficha del cliente tiene cambios sin guardar;
- consulta de ventas disponibles por cliente y borrador, excluyendo ventas eliminadas, devoluciones, operaciones mixtas y relaciones activas ajenas;
- las ventas del propio borrador se incluyen y se marcan como seleccionadas; las relaciones históricas anuladas no bloquean;
- pagos de cada venta disponible se recuperan ordenados para el editor y se conserva el id interno de venta para reutilizar el detalle histórico;
- creación de borrador transaccional: exige 1..N ventas, revalida disponibilidad, recalcula importe desde SQLite, copia datos de facturación canónicos y crea relaciones activas;
- actualización transaccional: solo borradores del cliente activo, mantiene ventas propias, elimina relaciones retiradas, añade nuevas elegibles y recalcula el importe;
- eliminación transaccional: soft delete de la factura borrador + eliminación física de sus relaciones `factura_venta`, liberando inmediatamente las ventas;
- application service, contratos públicos, IPC y preload exponen crear/actualizar/eliminar borradores;
- `ClientesService` Angular reconcilia el resultado de escrituras confirmadas directamente en la caché, esperando lecturas anteriores cuando sea necesario y sin depender de un `reload()` post-COMMIT.

Todavía faltan:

- `14J.3` modal Angular del editor de factura;
- `14J.4` dirty propio del modal y convivencia con la ficha;
- `14K` emisión, previsualización, PDF definitivo, impresión/email, anulación e integración final.

## 29.4 Entrada, búsqueda y selección ✅

El estado inicial mostrará:

- título Clientes;
- acción Buscar cliente;
- acción Nuevo cliente;
- mensaje para elegir un cliente mediante el buscador.

La búsqueda se hará exclusivamente en el renderer sobre ClientesService.clientes().

Regla cerrada:

```text
buscar cliente
→ NO IPC
→ NO backend
→ NO SQLite
→ filtrar colección ya cargada en memoria
```

El texto se normalizará igual que en el selector de Ventas y buscará al menos en:

- nombre y apellidos;
- DNI/CIF;
- teléfono;
- email.

La lista podrá mostrar nombre, teléfono y fecha de última venta. Se implementarán foco inicial, navegación cómoda, estado sin resultados y selección inequívoca.

Seleccionar un cliente cerrará el modal y mostrará su ficha. Nuevo cliente abrirá directamente una ficha vacía.

Estado implementado y validado:

- ruta `/clientes` protegida con `readyApplicationGuard`;
- opción Clientes operativa en la cabecera;
- estado vacío con acciones Buscar y Nuevo cliente;
- el buscador no muestra resultados hasta escribir texto;
- filtrado normalizado por nombre, DNI/CIF, teléfono o email;
- resultados con nombre, teléfono y fecha de última venta;
- foco inicial en el campo de búsqueda;
- seleccionar el mismo cliente solo cierra el modal;
- sustituir una ficha dirty exige confirmación;
- crear otra ficha o cerrar la actual con dirty también exige confirmación.

## 29.5 Estructura de la ficha ✅

La ficha tendrá estas secciones:

```text
DATOS
DATOS DE FACTURACIÓN
FACTURAS
VENTAS
ESTADÍSTICAS
```

Para un cliente nuevo solo se mostrarán Datos y Datos de facturación. Facturas, Ventas y Estadísticas requieren un cliente persistido.

Guardar y Cancelar serán acciones globales del draft de cliente, no acciones independientes por pestaña.

La ficha básica reutilizará un único modelo y esquema de validación compartido con la creación rápida de cliente desde Ventas. No habrá dos reglas de negocio diferentes para crear el mismo cliente.

Estado implementado y validado:

- las cinco secciones existen y la sección activa forma parte del workspace;
- Datos y Datos de facturación están operativas;
- Facturas ya dispone de listado real lazy/cacheado; el editor modal comienza en `14J.3`. Ventas y Estadísticas están completamente operativas;
- un borrador nuevo solo permite Datos y Datos de facturación;
- tras el primer guardado, la misma ficha obtiene identidad persistida y habilita las cinco secciones;
- el formulario se mantiene montado al alternar Datos/Facturación, evitando perder estado local;
- las acciones Guardar y Cancelar están en el footer global de la ficha.

## 29.6 Datos generales, facturación y mantenimiento ✅

Datos generales:

- nombre y apellidos;
- DNI/CIF;
- teléfono;
- email;
- descuento;
- dirección;
- código postal;
- población;
- provincia;
- observaciones.

Solo nombre y apellidos es obligatorio. Esto permite crear fichas rápidas.

Datos de facturación incluye el selector Mismos datos para la facturación.

Cuando está activo:

- los datos efectivos de facturación se derivan de los datos generales;
- los datos alternativos quedan ocultos;
- los valores alternativos previamente introducidos se conservan para poder recuperarlos al desmarcar la opción.

Cuando está desactivado se muestran nombre/razón social, DNI/CIF, teléfono, email, dirección, código postal, población y provincia específicos de facturación.

Persistencia:

- CREATE y UPDATE se validan también en backend;
- después del COMMIT, el cliente devuelto se incorpora o reemplaza directamente en la colección en memoria;
- el éxito no depende de una recarga posterior innecesaria;
- draft y baseSnapshot se actualizan con la instancia canónica;
- dirty pasa a false.

Cancelar restaura baseSnapshot después de confirmar si hay cambios.

Estado implementado y validado hasta `14E.6`:

- `ClienteFormModel` contiene todos los campos generales y alternativos de facturación;
- `factIgual` oculta los campos alternativos, pero ni el mapper renderer ni el backend los destruyen;
- los campos alternativos solo participan en la validación cuando `factIgual === false`;
- la validación global marca todos los campos, identifica la primera sección inválida, navega hasta ella y enfoca el nombre cuando corresponde;
- el mapper normaliza strings opcionales a `null` y convierte las provincias opcionales a ids numéricos válidos;
- `ClientesService.guardar()` decide CREATE/UPDATE según la identidad del workspace;
- una identidad incoherente —solo id o solo publicId— se rechaza antes de escribir;
- CREATE y UPDATE comparten normalización y validación backend;
- UPDATE busca por `publicId`, exige cliente activo y conserva `ultimaVenta`;
- el UPDATE se realiza dentro de transacción y devuelve la versión canónica persistida;
- la unicidad de DNI/CIF excluye el `publicId` del propio cliente durante UPDATE;
- la reconciliación espera cualquier carga global previa para impedir que una respuesta antigua pise el COMMIT;
- al actualizar se muta la instancia de `Cliente` ya existente, preservando referencias activas desde Ventas;
- la colección en memoria se reordena por nombre y, en empate, por id;
- tras guardar, `draft` y `baseSnapshot` nacen de la respuesta canónica, `dirty=false` y se conserva la sección activa;
- Guardar solo se habilita cuando existe una modificación válida pendiente;
- mientras se guarda, formulario, pestañas, búsqueda, alta, cierre, Cancelar y Guardar quedan bloqueados en template y también mediante defensas TypeScript;
- tras éxito se muestra `Cliente guardado correctamente` durante cuatro segundos; cualquier nueva edición lo retira;
- el temporizador de feedback se limpia al destruir la página;
- cada nueva ficha vuelve a enfocar Nombre y apellidos aunque el formulario ya estuviera montado;
- las pruebas renderer usan Vitest (`vi` cuando se necesitan spies), nunca Jasmine.

Baja implementada y validada:

- siempre es lógica: asigna `cliente.deleted_at` y `updated_at`;
- repository comprueba y ejecuta la baja en una única transacción;
- el `UPDATE` incorpora un `NOT EXISTS` sobre facturas activas en estado `borrador`, evitando una carrera entre comprobación y escritura;
- devuelve internamente `deactivated`, `has_draft_invoices` o `not_found`, que application service traduce a éxito o mensajes de dominio claros;
- conserva ventas, facturas, relaciones `factura_venta` y demás información histórica;
- contrato, IPC y preload exponen `clientes.deactivate(publicId)`;
- solo se permite sobre clientes persistidos, limpios y activos;
- la UI solicita confirmación y bloquea el resto de acciones durante la operación;
- tras el COMMIT, `ClientesService` espera lecturas globales anteriores, invalida estadísticas, retira el cliente de la colección activa y cierra su ficha;
- si backend rechaza la baja —incluido el caso de facturas en borrador— la ficha, la colección y las cachés permanecen intactas;
- el cliente dado de baja desaparece también del buscador, porque este trabaja sobre la misma colección activa en memoria.

Documento de protección de datos implementado y validado:

- la antigua acción «Imprimir LOPD» se presenta como **Documento de protección de datos**;
- reutiliza `ClienteProteccionDatosPrintService` y `buildClienteProteccionDatosDocument`;
- solo aparece para clientes persistidos y queda bloqueada con dirty o mientras exista otra operación en curso;
- nunca imprime directamente el draft: resuelve el `Cliente` canónico mediante `publicId` y verifica también su id;
- usa la configuración global de `AppData` y los nombres de provincia cargados por `ProvinciasService`;
- contempla datos generales y datos de facturación alternativos cuando `factIgual === false`;
- conserva la apertura síncrona de la ventana desde el click para evitar bloqueos de ventanas emergentes;
- cualquier ausencia de datos o fallo al abrir la ventana se presenta mediante un mensaje claro sin modificar la ficha.

La regresión funcional completa de Datos, Facturación, Crear, Actualizar, Cancelar, Buscar, Cerrar, Baja y Documento de protección de datos ha sido validada por el usuario. **`14E — Persistencia y mantenimiento` queda cerrado ✅.**

## 29.7 Ventas del cliente ✅

La pestaña Ventas está implementada, validada funcional y visualmente y subida al repositorio. Es una sección documental de solo lectura y no forma parte del draft editable del cliente, por lo que consultarla nunca genera dirty.

Backend y contrato:

- `VentaHistoricoConsulta` acepta el filtro opcional `clientePublicId`;
- omitirlo conserva sin cambios el Histórico global de Ventas;
- backend normaliza y valida el identificador recibido;
- `VentasHistoricoRepository.findByPeriod()` acepta el filtro nullable;
- SQLite resuelve el id interno del cliente a partir de su `publicId`;
- el filtro se aplica exactamente igual al listado, los pagos, el total, el ticket medio, el beneficio y los totales por tipo de pago;
- las fechas continúan siendo intervalos civiles locales con extremo final exclusivo en SQLite;
- las ventas soft-deleted permanecen excluidas;
- no se ha creado un endpoint ni un pipeline paralelo específico de Clientes.

Renderer y experiencia de uso:

- `ClientSalesComponent` se monta exclusivamente para un cliente persistido;
- el periodo inicial es el mes local actual, con Desde y Hasta explícitos;
- la búsqueda exige ambas fechas y rechaza rangos invertidos;
- cada nueva consulta limpia la selección y protege la UI frente a respuestas anteriores fuera de orden;
- se muestran ventas y devoluciones con fecha/hora, referencia, importe firmado, tipos de pago y opciones;
- las devoluciones se distinguen visualmente y conservan su importe negativo;
- seleccionar una fila carga el snapshot histórico completo y permite consultar líneas y pagos mediante `HistoricalSaleDetailComponent` en modo `readonly`;
- el listado y el detalle tienen estados de carga, vacío, error y reintento;
- la fila puede seleccionarse también mediante teclado;
- la distribución usa listado a la izquierda y detalle a la derecha, apilándose en ventanas estrechas;
- las anchuras fijas de fecha, referencia, importe y opciones mantienen visibles los botones sin scroll horizontal; el tipo de pago ocupa el espacio restante.

Acciones documentales:

- cada botón conserva y utiliza el id de la venta de su propia fila; nunca depende de `selectedVentaId`;
- reimprimir reutiliza `VentaTicketDocumentService.reprint()` y el pipeline documental vigente;
- enviar reutiliza `HistoricalSaleEmailFormComponent` y `VentaTicketEmailService.send()`;
- el formulario de email se abre en el panel derecho y propone el email canónico persistido del cliente;
- si SMTP no está configurado, la acción queda deshabilitada con información contextual;
- durante impresión o envío se bloquean consultas, selección y demás acciones para evitar solapamientos;
- éxito y error producen feedback específico sin modificar la ficha ni ejecutar operaciones TicketBAI;
- remitente y variable `{nombreNegocio}` de las plantillas del ticket —incluido el asunto predeterminado— usan `AppData.nombre`;
- `AppData.nombreComercial` no se utiliza en el email del ticket y queda reservado para documentos oficiales que lo requieran.

Se reutilizaron y reforzaron los componentes del Histórico sin alterar sus usos existentes. Los tests backend, repository SQLite, renderer, build y lint, así como las pruebas funcionales de listado, detalle, impresión, email y diseño, fueron correctos. **`14F — Ventas del cliente` queda cerrado ✅.**

## 29.8 Estadísticas generales ✅

`14G — Estadísticas generales` está completamente implementado y validado. La sección es de solo lectura, queda fuera del draft del cliente y nunca genera dirty.

### Backend y semántica económica

`ClienteRepository` mantiene las consultas rápidas existentes y añade `findSumaVentas(publicId)`. `ClientesService.getEstadisticasGenerales(publicId)` compone en paralelo los tres bloques necesarios para la ficha completa:

- `findUltimasVentas(publicId, 20)` devuelve las últimas líneas compradas, ordenadas por venta descendente y línea descendente;
- `findTopVentas(publicId, 10)` agrupa unidades e importe real en SQLite;
- `findSumaVentas(publicId)` agrega PUC y PVP real por año y mes.

Las consultas resuelven al cliente activo mediante `publicId`, excluyen ventas soft-deleted y conservan las devoluciones con sus unidades e importes negativos.

El top usa el orden definitivo:

```text
importe real DESC
→ unidades DESC
→ nombre COLLATE NOCASE
```

Se corrige así el TPV legacy, que daba prioridad a las unidades pese a presentar el importe como magnitud principal.

La semántica económica implementada es:

- PUC = `SUM(linea_venta.puc_micros × linea_venta.unidades)`;
- PVP = `SUM(linea_venta.importe_micros)`, es decir, importe real después de descuentos;
- Beneficio = PVP real − PUC;
- Margen = Beneficio / PVP real;
- si PVP es cero, el margen es `null` y la UI muestra `—`.

SQLite devuelve registros mensuales con dinero entero. El application service:

- valida años, meses e importes como enteros seguros;
- ordena meses y años ascendentemente;
- agrupa los meses reales disponibles dentro de cada año, sin inventar meses vacíos en este resumen;
- calcula los totales anuales con sumas seguras;
- calcula `beneficioMicros` y `margenMicroporcentaje` para mes, año y total general;
- utiliza `BigInt` y división redondeada para el margen, evitando floats encadenados;
- devuelve total general cero con margen `null` cuando no existen ventas.

El total general se calcula en backend a partir de los acumulados anuales. Angular no reagrupa ni recalcula importes de negocio.

### Contratos y puente Electron

`cliente-estadisticas.interface.ts` conserva `ClienteEstadisticasInterface` para las estadísticas rápidas y añade la jerarquía completa:

```text
ClienteEstadisticasGeneralesInterface
├── ultimasVentas[]
├── topVentas[]
├── sumaVentas[]
│   └── año
│       └── months[]
└── sumaVentasTotal
```

Meses, años y total comparten `ClienteSumaVentasValoresInterface`, con:

- `pucMicros`;
- `pvpMicros`;
- `beneficioMicros`;
- `margenMicroporcentaje: number | null`.

El método `getEstadisticasGenerales(publicId)` está conectado de extremo a extremo mediante:

- contrato `ClientesApi`;
- canal `clientes:get-estadisticas-generales`;
- handler IPC protegido por remitente permitido;
- preload `window.osumiDesktop.clientes`;
- método directo de `ClientesService` Angular.

No se incorpora esta carga completa al startup ni a las estadísticas rápidas utilizadas desde Ventas.

### Renderer y experiencia de uso

`ClientGeneralStatisticsComponent` se monta únicamente al activar Estadísticas sobre un cliente persistido y realiza entonces la consulta lazy. Dispone de:

- estado de carga;
- estado de error con reintento;
- estados vacíos independientes para cada bloque;
- invalidación de respuestas antiguas mediante un identificador incremental de petición;
- invalidación adicional al destruir el componente;
- importes presentados desde microeuros mediante los pipes ya existentes.

La interfaz final contiene:

1. **Últimos artículos comprados**, con un máximo de 20 líneas y columnas Fecha, Localizador, Nombre, Unidades, PVP e Importe.
2. **Artículos más comprados**, con Localizador, Nombre, Unidades e Importe.
3. **Suma de ventas**, con un acordeón de años, desglose mensual y total general siempre visible bajo el acordeón.

En Suma de ventas:

- todos los años comienzan cerrados;
- solo puede permanecer abierto un año cada vez;
- cada cabecera anual muestra PUC, PVP, Beneficio y Margen;
- al desplegar se muestran únicamente los meses con actividad;
- el total general permanece visible aunque ningún año esté abierto;
- los márgenes se presentan con dos decimales y `null` como `—`;
- los valores negativos se diferencian visualmente;
- Mes queda alineado a la izquierda y todas las columnas numéricas, incluidas sus cabeceras, a la derecha;
- las tablas superiores tienen altura limitada, cabecera sticky y scroll interno;
- la distribución se adapta a anchuras menores sin perder legibilidad.

Se corrigió además el `z-index` local del buscador de clientes: su overlay usa una capa superior a las cabeceras sticky y vuelve a cubrir correctamente todo el contenido de Estadísticas.

Los tests de repository SQLite, application service, contratos/servicios renderer y componente Angular, junto con typecheck/build/lint y las pruebas funcionales y visuales, han sido validados. **`14G — Estadísticas generales` queda cerrado ✅.**

### Consumo mensual — 14H cerrado ✅

La cuarta parte de Estadísticas, que había quedado incompleta en el TPV antiguo, está implementada como un bloque específico e independiente de `14G`.

Backend y contrato:

- `ClienteConsumoMensualRepositoryQuery` transporta `publicId`, `year` y `month` nullable;
- `ClienteRepository.findConsumoMensual()` agrega `SUM(linea_venta.importe_micros)` en SQLite;
- se incluyen únicamente clientes activos y ventas no soft-deleted;
- las devoluciones participan con su importe negativo;
- una consulta independiente obtiene los años reales disponibles;
- la agregación es diaria cuando año y mes son concretos, y mensual en el resto de combinaciones;
- los valores procedentes de SQLite se validan como enteros seguros;
- `ClienteConsumoMensualConsulta`, `ClienteConsumoMensualPoint` y `ClienteConsumoMensualResultado` constituyen el contrato público;
- `createClienteConsumoMensualResult()` completa todos los huecos temporales con cero, genera años intermedios y calcula `totalMicros` de forma segura;
- febrero respeta correctamente los años bisiestos;
- año válido: `1..9999`; mes válido: `1..12`; `null` significa Todos.

Resoluciones temporales definitivas:

- año + mes → todos los días del mes;
- año + Todos → los doce meses;
- Todos + mes → ese mes para cada año de la serie continua;
- Todos + Todos → todos los meses cronológicos desde el primer año real hasta el último.

Puente de escritorio:

- `ClientesService.getConsumoMensual()` normaliza y valida la consulta antes de acceder al repository;
- `ClientesApi.getConsumoMensual()` expone el contrato público;
- el canal `clientes:get-consumo-mensual`, su handler con validación de sender y el preload tipado completan el puente;
- `ClientesService` Angular ofrece un método directo sin duplicar estado ni lógica de negocio.

Renderer:

- `ClientMonthlyConsumptionComponent` es standalone y está integrado al final de `ClientGeneralStatisticsComponent`;
- se carga lazy únicamente al entrar en la pestaña Estadísticas de un cliente persistido;
- selección inicial: año local actual y Todos los meses;
- cualquier cambio en Mes o Año refresca automáticamente la consulta;
- `availableYears` mantiene visible el año seleccionado y se presenta en orden descendente;
- ECharts ^6.1.0 y ngx-echarts ^22.0.0 se usan de forma modular con `BarChart`, `GridComponent`, `TooltipComponent` y `CanvasRenderer`;
- la gráfica recibe puntos ya completos y se limita a convertir microeuros a euros, generar etiquetas y presentar barras/tooltips;
- el total del período procede directamente del backend;
- la gráfica conserva los datos anteriores bajo el overlay mientras carga un nuevo filtro;
- las respuestas IPC antiguas se descartan mediante una secuencia incremental;
- destruir el componente invalida cualquier respuesta pendiente;
- error y reintento son propios del consumo y no dependen del estado de `14G`;
- un período completamente a cero muestra un estado vacío específico;
- la consulta es de solo lectura, no forma parte del `ClienteWorkspace` y nunca genera dirty;
- el buscador de clientes continúa cubriendo correctamente la gráfica y el resto de Estadísticas.

La integración del componente real se sustituye por un componente mínimo en el spec del padre para no inicializar CanvasRenderer en ese test. La lógica asíncrona del componente real dispone de pruebas propias para carga inicial, filtros, valores inválidos, respuestas fuera de orden, error, reintento y período vacío.

Todos los tests Electron/Angular, builds, lint y las pruebas funcionales y visuales de las cuatro combinaciones de filtros han sido validados por el usuario. **`14H — Consumo mensual` queda cerrado ✅.**

## 29.9 Facturas: significado de dominio

Las facturas de Clientes son agrupaciones posteriores de ventas ya realizadas.

Reglas cerradas:

- cada venta ya está cobrada;
- cada venta ya ha seguido su flujo TicketBAI;
- crear, editar, cerrar, imprimir o enviar una factura de Clientes no cobra nada;
- Clientes no realiza ninguna llamada ni operación TicketBAI;
- la factura sirve como justificante oficial de la tienda sobre las compras agrupadas;
- finalizar una factura no modifica las ventas incluidas;
- el importe se deriva de las ventas persistidas.

Cardinalidad correcta:

```text
Factura → 1..N ventas
Venta   → 0..1 factura activa
Venta   → 0..N facturas anuladas históricas
```

Por tanto:

- una factura puede y debe agrupar una o varias ventas;
- una misma venta no puede pertenecer simultáneamente a más de una factura activa;
- una factura anulada conserva sus relaciones históricas, pero deja de bloquear sus ventas;
- `14I.1` ya sustituyó el UNIQUE global sobre `factura_venta.id_venta` por una restricción parcial sobre relaciones activas;
- nunca debe interpretarse como una única venta por factura.

Ventas elegibles:

- pertenecen al cliente de la factura;
- no están soft-deleted;
- son ventas positivas ordinarias;
- no son devoluciones;
- no tienen relación activa con ninguna otra factura;
- las operaciones mixtas con componente de devolución quedan fuera mientras su dominio permanezca pendiente;
- al editar un borrador, sus ventas ya asociadas continúan seleccionables.

La UI mostrará únicamente ventas disponibles y las pertenecientes al propio borrador. No mostrará en gris ventas bloqueadas por otras facturas. Las devoluciones siguen apareciendo en Ventas y restando en Estadísticas, pero nunca pueden incorporarse a una factura.

Estados:

- borrador: editable;
- emitida: finalizada e inmutable;
- anulada: inmutable, consultable y conservada para trazabilidad.

Borrador:

- exige al menos una venta para guardarse;
- permite añadir y quitar ventas disponibles;
- muestra el detalle de la venta seleccionada;
- puede previsualizarse;
- puede eliminarse;
- al eliminarlo, sus ventas quedan disponibles de nuevo.

La numeración es global para todas las facturas, no por cliente. La fuente de verdad es `secuencia_documento` con tipo `factura` y serie. En una instalación sin facturas se usa `facturaInicial`; si ese dato no existe o no es válido, se adopta `1`. El número solo se consume al finalizar y nunca se reutiliza, tampoco después de una anulación. El formato visible será `numero_año`.

Emitir/finalizar debe realizar en una única transacción:

1. validar cliente y borrador;
2. validar que todas las ventas siguen siendo elegibles;
3. recalcular el importe desde SQLite;
4. obtener los datos efectivos de facturación;
5. guardar la instantánea de facturación;
6. asignar serie, número y fecha de emisión;
7. cambiar el estado a emitida.

Después del COMMIT, la factura es de solo consulta. La finalización materializa además un PDF definitivo que debe conservarse de forma inmutable. Impresión y email consumen ese PDF y son acciones documentales posteriores e independientes: no cambian el estado, no cobran y no ejecutan TicketBAI.

El documento de previsualización es temporal, muestra la marca `PREVISUALIZACIÓN` y conserva el botón Facturar. Si el borrador tiene cambios, se guarda antes de abrir la ventana. Facturar desde el modal o desde la previsualización ejecuta el mismo caso de uso. La vista final permite plegar/desplegar ventas; al imprimir o generar el PDF se ocultan los controles y se despliega todo.

El PDF congela la representación definitiva de los datos del negocio, datos de facturación del cliente, ventas, líneas, impuestos e importes. Los únicos cambios admitidos posteriormente sobre una venta desde Histórico —cliente asignado o forma de pago— no alteran líneas ni importes y no modifican la factura ni su PDF.

El email de una factura emitida abre un formulario cuyo destinatario inicial es el email actual del cliente, no la dirección congelada en la factura. El usuario puede modificarlo antes de enviar y ese cambio no muta cliente, factura ni PDF. Por tratarse de documentación oficial, asunto y cuerpo usan `AppData.nombreComercial`.

Anular una factura emitida debe realizar en una única transacción:

1. comprobar que continúa emitida;
2. cambiar el estado a anulada y registrar la fecha de anulación;
3. convertir sus relaciones con ventas en históricas/inactivas;
4. liberar esas ventas para nuevas facturas.

La factura anulada conserva número, fecha, importe, PDF y relaciones históricas. Permanece consultable, pero no puede modificarse, imprimirse ni enviarse por email. Si una venta liberada ha cambiado de cliente, será elegible para el cliente que tenga asignado en ese momento. Una nueva factura que la incluya recibirá un número nuevo.

La UI de factura mantendrá el patrón útil del legacy:

- listado de ventas a la izquierda;
- detalle de la venta seleccionada a la derecha;
- selección múltiple en borradores;
- consulta sin controles de edición en emitidas/anuladas.

El listado incorpora las columnas Factura, Fecha, Importe, Estado y Acciones. Un borrador muestra `Borrador`; una emitida o anulada muestra su número oficial, nunca el id interno. La fecha de un borrador es su creación y la de una emitida/anulada es su fecha de emisión. Solo las emitidas ofrecen email e impresión en la tabla.

Títulos del editor:

- nueva sin guardar: `Nueva factura`;
- borrador persistido: `Borrador de factura`;
- emitida/anulada: `Factura numero_año`.

La creación o finalización de facturas exige un cliente persistido y sin cambios pendientes en la ficha, para que los datos efectivos de facturación procedan siempre del estado canónico guardado.

## 29.10 Correcciones respecto al TPV legacy

No se portarán literalmente estos comportamientos:

| Legacy | Nueva implementación |
| --- | --- |
| El buscador llamaba al backend aunque los clientes estaban cargados | Filtrado exclusivo en memoria |
| Al seleccionar cliente se cargaba todo a la vez | Carga lazy por pestaña |
| impresa representaba a la vez impresión y cierre | estado explícito; impresa no gobierna la mutabilidad |
| La columna Factura y el título del modal mostraban el id interno | Borrador o número oficial `numero_año`; nunca el id interno |
| Facturas actualizaba relaciones sin una transacción única | Guardado y emisión transaccionales |
| Número de factura mediante MAX + 1 sin protección | Numeración transaccional por serie y restricción UNIQUE |
| Una venta quedaba bloqueada incluso si la factura se anulaba | Relación histórica inactiva y venta nuevamente disponible |
| El listado mezclaba ventas disponibles y bloqueadas en gris | Mostrar únicamente disponibles y las propias del borrador |
| Cierre e impresión eran la misma operación | Emisión, materialización PDF e impresión son conceptos separados |
| El asunto del email utilizaba el id interno | Número oficial y `AppData.nombreComercial` |
| Totales y márgenes con floats y cálculo en renderer | Agregación SQLite y dinero entero |
| Años limitados al actual y cuatro anteriores | Años reales disponibles |
| Todos/Todos significaba mes actual | Filtros explícitos y coherentes |
| Botón de ticket actuaba sobre ventaSelected | Acción vinculada a su fila |
| Top ordenado principalmente por unidades | Top ordenado por importe real |
| Consumo mensual vacío | Gráfica funcional completa |
| Borrado de cliente con mensaje contradictorio | Soft delete que preserva asociaciones y documentos |

## 29.11 Plan de implementación 14A–14K

### 14A — Documento de continuidad y plan ✅

La versión 2.29 cerró el análisis funcional, las decisiones y la secuencia de trabajo.

### 14B — Base del apartado Clientes ✅ CERRADO

- `14B.1` navegación, activación en cabecera, ruta y página base ✅;
- `14B.2` estado persistente de una única ficha en `ClientesService` ✅;
- estado inicial sin lista masiva ✅;
- nuevo borrador y cierre de ficha ✅.

### 14C — Búsqueda y selección ✅ CERRADO

- `14C.1` apertura de cliente persistido como draft editable ✅;
- `14C.2` modal, búsqueda totalmente en memoria, foco y estados ✅;
- `14C.3` confirmación al sustituir una ficha dirty ✅;
- seleccionar, cerrar y crear cliente nuevo ✅.

### 14D — Workspace y formulario ✅ CERRADO

- `14D.1` pestañas y sección activa persistente ✅;
- `14D.2` adaptación del formulario signal-based compartido ✅;
- `14D.3` integración del formulario, cálculo dirty y Cancelar ✅;
- `draft`/`baseSnapshot` independientes ✅;
- Datos y Datos de facturación sobre un único modelo ✅.

### 14E — Persistencia y mantenimiento ✅ CERRADO

#### 14E.1 — Creación y reconciliación segura ✅

- CREATE desde el workspace;
- espera de cargas previas potencialmente obsoletas;
- incorporación post-COMMIT a la colección sin `reload()` obligatorio;
- orden estable y preservación de referencias.

#### 14E.2 — Facturación, validación y guardado global ✅

- `14E.2.1` conservación renderer/backend de datos alternativos de facturación ✅;
- `14E.2.2A` validación condicional de facturación ✅;
- `14E.2.2B.1` persistencia canónica del workspace tras guardar ✅;
- `14E.2.2B.2` Guardar global, validación entre pestañas, bloqueo de UI y feedback ✅.

#### 14E.3 — Actualización de clientes ✅

- `14E.3.1` UPDATE transaccional en backend ✅;
- `14E.3.2` contrato, canal IPC y preload ✅;
- `14E.3.3` selección CREATE/UPDATE y reconciliación Angular ✅;
- modificar una ficha persistida y guardarla está validado funcionalmente ✅.

#### 14E.4 — Pulido final de UX ✅

- feedback `Cliente guardado correctamente` durante cuatro segundos;
- foco renovado en Nombre y apellidos al crear cada nuevo borrador;
- acciones bloqueadas durante guardado tanto visualmente como en handlers;
- limpieza del temporizador al abandonar la página;
- test de foco con Vitest `vi.spyOn`;
- tests, build, lint y pruebas funcionales validados por el usuario.

#### 14E.5 — Baja lógica y bloqueo por borradores ✅

- `14E.5.1` repository y application service transaccionales ✅;
- `14E.5.2` contrato, canal IPC y preload ✅;
- `14E.5.3` servicio Angular, reconciliación y UI ✅;
- bloqueo atómico mediante `NOT EXISTS` cuando existan facturas activas en estado borrador ✅;
- soft delete sin borrar ni desasociar ventas, facturas o relaciones históricas ✅;
- acción exclusiva para clientes persistidos y limpios, con confirmación y estado `Dando de baja…` ✅;
- éxito: retirar de colección/caché y cerrar ficha; fallo: conservar todo el estado activo ✅;
- tests backend, Electron/TypeScript, renderer y pruebas funcionales validados ✅.

#### 14E.6 — Documento de protección de datos y cierre funcional ✅

- `ClienteProteccionDatosPrintService` y el builder existente integrados en la ficha ✅;
- documento generado con `AppData`, cliente canónico persistido y provincias resueltas ✅;
- acción denominada `Documento de protección de datos`, nunca `Imprimir LOPD` ✅;
- visible solo para persistidos y bloqueada con dirty o procesamiento activo ✅;
- pestañas, formulario y acciones usan el bloqueo común `processing()` ✅;
- errores de configuración, identidad o apertura de ventana controlados ✅;
- regresión funcional integral y todos los tests/build/lint validados por el usuario ✅.

### 14F — Ventas del cliente ✅ CERRADO

#### 14F.1 — Contrato y consulta backend filtrada por cliente ✅

- filtro opcional `clientePublicId` incorporado al contrato existente;
- validación y normalización en application service;
- filtrado SQLite uniforme sobre ventas, pagos y agregados;
- Histórico global preservado al omitir el filtro;
- cobertura de service y repository SQLite validada.

#### 14F.2 — Filtros y listado ✅

- `ClientSalesComponent` standalone integrado en la ficha;
- periodo explícito Desde/Hasta, inicializado al mes actual;
- validación de rango, carga, vacío, error y protección frente a respuestas antiguas;
- tabla con fecha, referencia, importe firmado y tipos de pago;
- ventas y devoluciones visibles sin afectar al draft.

#### 14F.3 — Selección y detalle documental ✅

- selección por click y teclado;
- carga lazy del snapshot histórico completo;
- reutilización de `HistoricalSaleDetailComponent` en modo `readonly`;
- estados de carga, ausencia, error y reintento;
- paneles adaptables y detalle independiente de la edición del cliente.

#### 14F.4 — Reimpresión, email y pulido final ✅

- acciones vinculadas al id de su propia fila;
- reimpresión mediante el pipeline documental existente;
- email mediante formulario y servicio postventa ya cerrados;
- destinatario inicial obtenido del cliente canónico;
- bloqueo cuando SMTP no está configurado y durante operaciones activas;
- feedback de éxito/error;
- tabla compactada para mantener visibles las opciones sin scroll horizontal;
- `AppData.nombre` unificado como nombre del remitente y valor de `{nombreNegocio}` en las plantillas del ticket;
- todos los tests y pruebas funcionales validados y cambios subidos.

### 14G — Estadísticas generales ✅ CERRADO

#### 14G.1 — Backend, agregados y contratos ✅

- `14G.1A` consultas SQLite de últimos artículos, top y sumas mensuales ✅;
- máximo 20 líneas recientes y 10 posiciones de top ✅;
- top ordenado por importe real, unidades y nombre ✅;
- devoluciones con signo negativo y ventas soft-deleted excluidas ✅;
- `14G.1B` contrato público jerárquico por años/meses ✅;
- beneficio y margen calculados con enteros seguros y `BigInt` ✅;
- margen `null` cuando PVP es cero ✅.

#### 14G.2 — API, IPC, preload y servicio Angular ✅

- `ClientesApi.getEstadisticasGenerales(publicId)` ✅;
- canal IPC y handler con validación de sender ✅;
- preload tipado ✅;
- método directo en `ClientesService` Angular ✅;
- estadísticas rápidas existentes preservadas ✅.

#### 14G.3 — Renderer ✅

- `14G.3A` total general calculado en backend para PUC, PVP, beneficio y margen ✅;
- `14G.3B` componente lazy, estados, reintento, protección frente a respuestas antiguas y dos tablas superiores ✅;
- `14G.3C` acordeón anual, desglose mensual, un único año abierto, total general y estados vacíos ✅;
- años cerrados inicialmente y ordenados ascendentemente ✅;
- meses reales con nombres en castellano ✅;
- valores negativos y margen no calculable representados de forma segura ✅;
- Mes alineado a la izquierda y columnas numéricas a la derecha ✅;
- responsive final y overlay del buscador por encima de cabeceras sticky ✅;
- tests y pruebas funcionales/visuales validados por el usuario ✅.

### 14H — Consumo mensual ✅ CERRADO

#### 14H.1 — Backend, series y contratos ✅

- `14H.1A` consulta SQLite agregada y contrato interno ✅;
- `14H.1B` contrato público, series completas, total y application service ✅;
- importe real en microeuros, devoluciones negativas y ventas soft-deleted excluidas ✅;
- años intermedios y períodos sin actividad completados con cero ✅;
- cuatro resoluciones temporales Mes/Año y años bisiestos cubiertos ✅.

#### 14H.2 — API, IPC, preload y servicio Angular ✅

- `ClientesApi.getConsumoMensual()` ✅;
- canal y handler IPC con sender validado ✅;
- preload tipado ✅;
- método directo en `ClientesService` Angular ✅;
- prueba funcional del puente completo validada desde Electron ✅.

#### 14H.3 — Renderer ✅

- `14H.3A` componente autónomo con ECharts, filtros, total y estados ✅;
- carga inicial año actual + Todos los meses ✅;
- refresco automático y protección frente a respuestas fuera de orden ✅;
- `14H.3B` integración independiente dentro de Estadísticas ✅;
- estado vacío, error/reintento, tooltips, responsive y overlay validados ✅;
- lectura lazy sin modificar el draft ni generar dirty ✅;
- tests y pruebas funcionales/visuales validados por el usuario ✅.

### 14I — Dominio y listado de facturas ✅ CERRADO

#### 14I.0 — Revisión funcional guiada y contraste legacy ✅

- explicación funcional completa y capturas legacy revisadas ✅;
- contraste con frontend/API antiguos, esquema, importadores y pipeline documental nuevos ✅;
- significado postventa, estados, numeración, listado, editor, documentos, email y anulación cerrados ✅;
- plan técnico definitivo de `14I–14K` acordado ✅.

#### 14I.1 — Persistencia y relaciones históricas ✅

`14I.1A — esquema e importación legacy` ✅:

- `factura` incorpora `fecha_anulacion`;
- el `CHECK` de estado exige coherencia completa: borrador sin número/emisión/anulación; emitida con número+emisión y sin anulación; anulada con número+emisión+anulación;
- `factura_venta` incorpora `activa INTEGER NOT NULL DEFAULT 1`;
- se elimina `UNIQUE(id_venta)` global y se sustituye por `uq_factura_venta_venta_activa` con `WHERE activa = 1`;
- una venta puede conservar múltiples relaciones históricas, pero como máximo una activa;
- la importación convierte facturas legacy numeradas y eliminadas en `anulada`, mueve la fecha legacy a `fecha_anulacion` y mantiene la factura visible con `deleted_at = NULL`;
- las relaciones de borradores/emitidas se importan activas y las de anuladas/inactivas como históricas;
- el booleano legacy de venta facturada solo se utiliza para detectar inconsistencias;
- `prepareDocumentSequences()` ya cubría correctamente mayor número importado vs `facturaInicial - 1`; no necesitó cambios;
- `DATABASE_SCHEMA_VERSION` permanece en `1` y la instalación se recreó/reimportó correctamente.

`14I.1B — consumidores y regresiones` ✅:

- Histórico considera `facturada` solo cuando existe `factura_venta.activa = 1`;
- cambiar el cliente de una venta facturada vuelve a estar permitido;
- el cambio de cliente conserva la relación de factura y los documentos históricos;
- pruebas SQLite confirman que una venta puede tener relaciones históricas múltiples y solo una relación activa simultánea;
- medio de pago no requirió cambios porque ya era independiente de Facturas.

#### 14I.2 — Dominio, contratos y repository ✅

`14I.2A` ✅:

- `ClienteFacturaRecord` y estado interno borrador/emitida/anulada;
- `ClienteFacturasRepository.findByClientePublicId()`;
- `TypeOrmClienteFacturasRepository` con consulta por cliente activo, exclusión de soft-deleted y orden por fecha visible;
- año de factura derivado de `fecha_emision` para facturas numeradas;
- tests SQLite para borradores, emitidas, anuladas, clientes inexistentes/inactivos y facturas eliminadas.

`14I.2B` ✅:

- contrato público `ClienteFacturaInterface`;
- `numeroFactura = numero_año` para emitidas/anuladas y `null` para borradores;
- fecha visible = creación en borrador, emisión en emitida/anulada;
- capacidades derivadas exclusivamente desde el estado canónico;
- borrador: editar/eliminar/previsualizar/facturar;
- emitida: imprimir/email/anular;
- anulada: solo consulta, sin acciones mutables/documentales;
- application service valida coherencia de número, fechas y estado antes de devolver el modelo público.

#### 14I.3 — API, IPC, preload y servicio Angular ✅

`14I.3A` ✅:

- `ClientesApi.getFacturas()`;
- canal `clientes:get-facturas` y handler con sender validado;
- `ClienteFacturasService` incorporado a la composición Electron;
- preload tipado hasta `window.osumiDesktop.clientes.getFacturas()`.

`14I.3B` ✅:

- `ClienteFacturasState` con `data/loading/error`;
- caché por `clientePublicId` en `ClientesService`;
- deduplicación de peticiones simultáneas;
- `loadFacturas`, `reloadFacturas` e `invalidateFacturas`;
- generación global para impedir que una respuesta anterior a `clear()` repueble el nuevo estado;
- baja de cliente invalida también sus facturas;
- error conservado y reintento sin destruir datos válidos previos.

#### 14I.4 — Listado Angular ✅

- `ClientInvoicesComponent` standalone integrado en la sección Facturas;
- carga lazy al entrar y conservación de caché al salir/volver;
- columnas Factura, Fecha, Importe, Estado y Acciones;
- estados carga, actualización, vacío y error/reintento;
- filas accesibles por click/teclado;
- borradores muestran `Borrador`, nunca su `publicId`;
- emitidas/anuladas muestran `numero_año`;
- solo emitidas muestran email e impresión;
- email se deshabilita cuando SMTP no está configurado;
- `Nueva factura` queda deshabilitado con cambios pendientes en la ficha del cliente;
- eventos de apertura/nueva/imprimir/email quedan preparados para `14J`/`14K` sin ejecutar todavía esas acciones.

**`14I — Dominio y listado de facturas` queda completamente cerrado ✅.**

### 14J — Editor de factura 🟦 EN CURSO

#### 14J.1 — Ventas disponibles ✅ CERRADO

`14J.1A — repository SQLite` ✅:

- modelo interno de venta disponible y pagos;
- consulta específica por cliente y borrador opcional;
- únicamente ventas positivas ordinarias, no eliminadas y sin devolución/componente mixto;
- una relación activa con otra factura bloquea la venta;
- relaciones históricas inactivas no bloquean;
- las ventas del propio borrador se recuperan y se marcan `incluidaEnBorrador = true`;
- pagos recuperados y ordenados;
- cliente inactivo, borrador ajeno/no editable y ventas no elegibles cubiertos por tests.

`14J.1B — contrato y application service` ✅:

- `ClienteFacturaVentasDisponiblesConsulta`;
- `ClienteFacturaVentaDisponibleInterface` y pagos públicos;
- se conserva `id` interno de la venta para reutilizar el detalle histórico existente;
- normalización y validación de cliente/borrador antes del repository;
- transformación del registro interno al contrato público.

`14J.1C — API, IPC y preload` ✅:

- `ClientesApi.getFacturaVentasDisponibles()`;
- canal IPC y handler con sender validado;
- preload tipado.

`14J.1D — servicio Angular` ✅:

- acceso directo desde `ClientesService` a la instantánea actual de ventas disponibles;
- no se mantiene una caché persistente de elegibilidad: cada apertura/edición puede consultar el estado actual.

#### 14J.2 — Persistencia de borradores ✅ CERRADO

`14J.2A — creación transaccional` ✅:

- exige al menos una venta y rechaza ids duplicados;
- exige cliente activo;
- revalida todas las ventas dentro de la transacción;
- recalcula el importe desde SQLite, nunca desde el renderer;
- copia la instantánea efectiva de facturación del cliente canónico;
- crea factura en estado borrador, sin número ni fecha de emisión/anulación;
- crea las relaciones activas `factura_venta`;
- una venta liberada por factura anulada puede reutilizarse;
- cualquier error revierte la operación completa.

`14J.2B — actualización transaccional` ✅:

- solo permite borradores activos pertenecientes al cliente;
- revalida la nueva selección dentro de la transacción;
- las ventas ya propias del borrador siguen siendo elegibles;
- elimina relaciones retiradas y crea las nuevas;
- recalcula `importe_cents` desde las ventas persistidas;
- emitidas, anuladas, borradores eliminados o de otro cliente se rechazan sin mutación parcial.

`14J.2C — eliminación transaccional` ✅:

- solo permite borrar borradores activos del cliente;
- la factura se conserva mediante soft delete;
- sus relaciones `factura_venta` se eliminan físicamente;
- las ventas quedan inmediatamente disponibles para otra factura;
- emitidas/anuladas/ajenas/inactivas se rechazan.

`14J.2D — integración completa` ✅:

- `14J.2D1`: comandos públicos, validación/normalización y casos de uso `createBorrador`, `updateBorrador`, `deleteBorrador` ✅;
- `14J.2D2`: API, canales IPC, handlers con sender validado y preload ✅;
- `14J.2D3`: métodos Angular `createFacturaBorrador`, `updateFacturaBorrador`, `deleteFacturaBorrador` ✅;
- tras un COMMIT, la factura confirmada por backend se inserta/sustituye directamente en la caché;
- eliminar retira el borrador de la caché;
- si una lectura anterior estaba pendiente, la reconciliación espera esa lectura antes de aplicar el resultado confirmado;
- no se hace depender una escritura ya confirmada de un `reload()` posterior;
- los tests de reconciliación duplicados accidentalmente en `clientes.service.spec.ts` fueron limpiados después del cierre funcional de `14J.2D3`.

**`14J.1` y `14J.2` quedan completamente cerrados ✅.**

#### 14J.3 — Modal Angular ⬜ SIGUIENTE

- ventas y selección múltiple a la izquierda;
- detalle de la venta activa a la derecha reutilizando el detalle histórico existente cuando encaje;
- nueva factura y borrador en modo edición;
- emitida y anulada en modo consulta;
- títulos `Nueva factura`, `Borrador de factura` y `Factura numero_año`;
- conectar los eventos ya preparados por `ClientInvoicesComponent`;
- acciones de borrador: Eliminar, Guardar, Previsualizar y Facturar, dejando la emisión/documentos reales para `14K`;
- acciones de emitida: Anular e Imprimir cuando `14K` las implemente;
- anulada sin acciones documentales;
- estados de carga/error durante la obtención de ventas y detalle.

#### 14J.4 — Dirty y convivencia con la ficha ⬜

- dirty propio del modal y confirmación al cerrar con cambios;
- bloqueo durante cualquier operación;
- guardado automático antes de previsualizar;
- creación/finalización solo con cliente persistido y ficha limpia;
- datos de facturación siempre procedentes del cliente canónico guardado.

### 14K — Emisión y documentos ⬜

#### 14K.1 — Emisión transaccional ⬜

- validar cliente, borrador y ventas dentro de la transacción;
- obtener el siguiente número de la secuencia global;
- usar `facturaInicial` cuando todavía no haya facturas y `1` como fallback;
- fijar serie, número y fecha de emisión;
- congelar datos efectivos de facturación del cliente;
- recalcular importe y cambiar el estado a emitida;
- consumir el número únicamente al finalizar y no reutilizarlo nunca.

#### 14K.2 — Documento y previsualización ⬜

- builder específico con `AppData.nombreComercial`, cliente, ventas, líneas, impuestos y totales;
- cálculos monetarios enteros fuera del renderer;
- previsualización temporal con marca visible y botón Facturar;
- misma operación de emisión desde modal o ventana de previsualización;
- sincronización con la ventana principal;
- vista final interactiva con ventas plegables/desplegables;
- controles ocultos y contenido desplegado en formato imprimible.

#### 14K.3 — PDF inmutable ⬜

- storage específico inspirado en el de tickets;
- creación y persistencia del PDF definitivo al finalizar;
- impresión/email desde los bytes almacenados;
- nunca sustituir el PDF de una factura emitida;
- reintento de materialización si falla después del COMMIT;
- materialización inicial bajo demanda para facturas legacy emitidas sin PDF.

#### 14K.4 — Impresión y email ⬜

- acciones exclusivas de facturas emitidas;
- formulario de email con la dirección actual del cliente como valor inicial;
- destinatario editable sin modificar cliente, factura ni PDF;
- asunto/cuerpo con `AppData.nombreComercial`;
- adjunto nombrado con el número oficial;
- anuladas sin impresión ni email.

#### 14K.5 — Anulación ⬜

- transición transaccional exclusiva de emitida a anulada;
- fecha de anulación;
- relaciones activas convertidas en históricas/inactivas;
- ventas liberadas y disponibles según su cliente actual;
- conservación de número, fecha, importe, PDF y detalle consultable;
- prohibición de modificar, imprimir o enviar;
- cualquier factura posterior recibe un número nuevo.

#### 14K.6 — Integración y cierre ⬜

- cobertura de estados, transiciones y conflictos entre borradores;
- numeración global y `facturaInicial`;
- anulación, trazabilidad y reutilización de ventas;
- previsualización, PDF, impresión y email;
- sincronización entre ventanas;
- regresión de ficha, Ventas y Estadísticas;
- confirmación explícita de cero operaciones TicketBAI;
- cierre completo del Hito 14.

## 29.12 Archivos clave actuales de Clientes

Navegación y página:

```text
src/app/app.routes.ts
src/app/components/header/header.component.ts
src/app/modules/clientes/pages/clients/
```

Workspace y servicio renderer:

```text
src/app/model/clientes/cliente-workspace.interface.ts
src/app/model/clientes/cliente-workspace-section.type.ts
src/app/services/clientes.service.ts
src/app/services/clientes.service.spec.ts
```

Formulario y mappers:

```text
src/app/model/clientes/cliente-form.model.ts
src/app/model/clientes/cliente-form.initial-value.ts
src/app/model/clientes/cliente-form.mapper.ts
src/app/model/clientes/cliente-form-command.mapper.ts
src/app/model/clientes/cliente-form.schema.ts
src/app/model/clientes/cliente-form.utils.ts
src/app/modules/clientes/components/client-form/
```

Búsqueda y secciones:

```text
src/app/modules/clientes/components/client-search/
src/app/modules/clientes/components/client-section-tabs/
```

Backend y puente Electron:

```text
electron/backend/application/clientes/clientes.service.ts
electron/backend/application/clientes/clientes.service.spec.ts
electron/backend/contracts/clientes/cliente-deactivate-result.type.ts
electron/backend/contracts/clientes/cliente.repository.interface.ts
electron/infrastructure/database/typeorm/typeorm-cliente.repository.ts
electron/contracts/clientes/crear-cliente-command.interface.ts
electron/contracts/clientes/actualizar-cliente-command.interface.ts
electron/contracts/clientes/clientes-api.interface.ts
electron/ipc/channels.ts
electron/ipc/register-clientes-ipc.ts
electron/preload.ts
```

Documento de protección de datos integrado:

```text
src/app/model/clientes/cliente-proteccion-datos-document.builder.ts
src/app/services/cliente-proteccion-datos-print.service.ts
```

Ventas del cliente y reutilización del Histórico:

```text
src/app/modules/clientes/components/client-sales/
src/app/modules/ventas/components/historical-sale-detail/
src/app/modules/ventas/components/historical-sale-email-form/
src/app/services/ventas-historico.service.ts
src/app/services/venta-ticket-document.service.ts
src/app/services/venta-ticket-email.service.ts
electron/contracts/ventas/venta-historico.interface.ts
electron/backend/application/ventas/ventas-historico.service.ts
electron/backend/application/ventas/ventas-ticket-email.service.ts
electron/backend/contracts/ventas/ventas-historico.repository.interface.ts
electron/infrastructure/database/typeorm/typeorm-ventas-historico.repository.ts
```

Estadísticas rápidas y generales de Clientes:

```text
src/app/model/clientes/cliente-estadisticas-state.interface.ts
src/app/services/clientes.service.ts
src/app/services/clientes.service.spec.ts
src/app/modules/clientes/components/client-general-statistics/
src/app/modules/clientes/pages/clients/clients.component.ts
src/app/modules/clientes/pages/clients/clients.component.html
src/app/modules/clientes/pages/clients/clients.component.scss
electron/contracts/clientes/cliente-estadisticas.interface.ts
electron/contracts/clientes/clientes-api.interface.ts
electron/backend/contracts/clientes/cliente-estadisticas-record.interface.ts
electron/backend/contracts/clientes/cliente.repository.interface.ts
electron/backend/application/clientes/clientes.service.ts
electron/backend/application/clientes/clientes.service.spec.ts
electron/infrastructure/database/typeorm/typeorm-cliente.repository.ts
electron/infrastructure/database/typeorm/typeorm-cliente.repository.spec.ts
electron/ipc/channels.ts
electron/ipc/register-clientes-ipc.ts
electron/preload.ts
```

Consumo mensual:

```text
electron/backend/contracts/clientes/cliente-consumo-mensual-query.interface.ts
electron/backend/contracts/clientes/cliente-estadisticas-record.interface.ts
electron/backend/contracts/clientes/cliente.repository.interface.ts
electron/backend/application/clientes/cliente-consumo-mensual.utils.ts
electron/backend/application/clientes/cliente-consumo-mensual.utils.spec.ts
electron/backend/application/clientes/clientes.service.ts
electron/backend/application/clientes/clientes.service.spec.ts
electron/infrastructure/database/typeorm/typeorm-cliente.repository.ts
electron/infrastructure/database/typeorm/typeorm-cliente.repository.spec.ts
electron/contracts/clientes/cliente-consumo-mensual.interface.ts
electron/contracts/clientes/clientes-api.interface.ts
electron/ipc/channels.ts
electron/ipc/register-clientes-ipc.ts
electron/preload.ts
src/app/services/clientes.service.ts
src/app/services/clientes.service.spec.ts
src/app/modules/clientes/components/client-monthly-consumption/
src/app/modules/clientes/components/client-general-statistics/
```

Base de persistencia, importación y documentos para Facturas:

```text
electron/infrastructure/database/schema/sales.database-schema.ts
electron/infrastructure/database/schema/complete-database-schema.tables.ts
electron/infrastructure/legacy-import/legacy-import-customer-data.importer.ts
electron/infrastructure/legacy-import/legacy-import-sale-payment-data.importer.ts
electron/infrastructure/database/typeorm/typeorm-legacy-import-database.ts
electron/backend/application/ventas/ventas-tickets.service.ts
electron/backend/contracts/ventas/venta-ticket-pdf-storage.interface.ts
electron/infrastructure/filesystem/file-venta-ticket-pdf.storage.ts
src/app/services/venta-ticket-document.service.ts
src/app/modules/ventas/components/historical-sale-detail/
```

---

# 30. Próximo paso exacto

```text
14J.3 — Modal Angular del editor de factura
```

Antes de proponer cambios:

- actualizar y revisar `main` y los componentes/servicios actuales de Clientes y Facturas;
- partir de que `14I`, `14J.1` y `14J.2` están cerrados y no reimplementar sus consultas ni su persistencia;
- conectar `newFacturaEvent` y `openFacturaEvent` del listado con un modal real;
- usar `ClientesService.getFacturaVentasDisponibles()` para obtener la selección actual de ventas;
- usar `createFacturaBorrador()`, `updateFacturaBorrador()` y `deleteFacturaBorrador()` como únicas escrituras de borrador desde Angular;
- reutilizar el detalle histórico de venta en la zona derecha siempre que sea compatible, evitando duplicar pipeline documental o consultas;
- mantener cuatro modos conceptuales: nueva, borrador editable, emitida consulta y anulada consulta;
- no implementar todavía la emisión transaccional ni el PDF definitivo dentro de `14J.3`: pertenecen a `14K`;
- respetar la ficha del cliente como fuente canónica: no crear/finalizar facturas con un cliente nuevo o con cambios sin guardar;
- mantener fuera de Facturas cualquier operación TicketBAI;
- presentar archivos nuevos completos y archivos existentes como fragmento actual → nuevo;
- al añadir imports, indicar únicamente los imports nuevos; Prettier decidirá su posición;
- líneas en blanco solo estructurales; no separar propiedades relacionadas de interfaces/tipos/clases con líneas vacías;
- indicar las pruebas exactas pertinentes al subbloque y esperar confirmación del usuario antes de avanzar.

`14J.2` está cerrado. El modal debe consumir la infraestructura existente, no introducir una segunda caché ni un segundo modelo de persistencia de borradores.

---

# 31. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.14 | 29/08/2026 | PENDING, post-COMMIT, Histórico y reconciliación |
| 2.15 | 30/08/2026 | 12C.8E completo, retry, UI y regeneración documental |
| 2.16 | 30/08/2026 | 12C.8 TicketBAI ordinario cerrado |
| 2.17 | 30/08/2026 | Inicio Hito 13 Artículos y roadmap 13→16 |
| 2.18 | 31/08/2026 | Backend Artículos hasta baja lógica; regla WebP; Sharp |
| 2.19 | 31/08/2026 | Storage, staging, persistencia fotos y promoción staged |
| **2.20** | **31/08/2026** | **ArticulosService.save() ✅; 13B.6D completo ✅; nueva regla global: TODAS las imágenes, incluido logo desde .otpv y Configuración, deben persistirse en WebP; 13B.6E pasa a unificación total de imágenes** |
| **2.21** | **01/09/2026** | **13B completo ✅; 13C Workspace/carga ✅; 13D General ✅ mini-hito cerrado: fiscalidad, motor entero de precios, descuento y creación rápida transaccional de Marca/Proveedor; siguiente paso: retoques de General antes del siguiente apartado de Artículos** |
| **2.22** | **01/09/2026** | **13D General cerrado definitivamente ✅: accesos directos globales junto a Localizador, persistencia inmediata y sincronización de tabs, General compacto, toggles Material, categorías multiselect, UI a 2 decimales con precisión interna preservada, recálculo en escritura, selección al foco, modal de márgenes y reutilización de pestaña nueva al buscar/resolver; siguiente en aquella versión: Códigos de barras (posteriormente desplazado a 13F al reincorporar WEB)** |
| **2.23** | **01/09/2026** | **Se reincorpora la pestaña WEB al roadmap como `13E` y pasa a ser el siguiente mini-hito; Códigos de barras y apartados posteriores se desplazan a `13F`–`13K`. WEB mantiene Mostrar en web, descripciones y fotos 0..N, conservando datos al desactivar Venta online.** |
| **2.24** | **01/09/2026** | **13E WEB ✅ mini-hito cerrado: contenido WEB, galería 0..N en columna derecha, file picker/drag&drop, principal y orden, staging común WebP, crop libre secuencial, rollback de lotes y ciclo de vida completo de temporales al eliminar/cancelar/cerrar/reutilizar borrador. Se elimina el concepto de “guardado WEB”: WEB forma parte del ArticuloDraft único y se guarda/cancela con las acciones globales del artículo. Siguiente: 13F Códigos de barras.** |
| **2.25** | **02/09/2026** | **13F Códigos de barras ✅ y 13G Observaciones ✅ cerrados. Códigos recupera UX legacy con foco automático, lector/Enter, tarjetas QR 3 por fila mediante angularx-qrcode, principal diferenciado no borrable y adicionales add/remove solo en draft. Observaciones añade textarea + toggles Material Pedidos/Ventas sobre el mismo ArticuloDraft. Siguiente: 13H Histórico.** |
| **2.26** | **02/09/2026** | **13H Histórico ✅ cerrado con API SQLite paginada/ordenada, MatTable/MatSort/MatPaginator remoto y MatPaginatorIntl global en castellano. Refinamiento UX: foco automático en Localizador al crear/activar drafts nuevos. 13I.1 Guardar/Cancelar global ✅ con mapper del draft, save IPC/preload, barra inferior, cleanup de staging y feedback “Artículo guardado correctamente” durante 4 s. 13I.2 Duplicar ✅: nueva pestaña dirty, identidades/stock/códigos/acceso/observaciones reseteados, configuración reutilizable conservada y fotos compartidas mediante nuevas relaciones al mismo asset `archivo`. Siguiente: 13I.3 Baja lógica.** |
| **2.27** | **02/09/2026** | **13I.3 Baja lógica ✅ y 13I completo ✅: sección solo para persistidos, bloqueo con dirty, confirmación, deactivate vía API/IPC/preload, soft delete artículo+códigos y cierre de pestaña tras éxito preservando histórico/fotos/relaciones. 13J Estadísticas iniciado: diseño acordado con Tipo Unidades/Importe, Mes/Año concretos o Todos, ventas netas con devoluciones negativas, huecos a cero y cuatro resoluciones temporales. 13J.1 backend agregado ✅: SUM SQLite, availableYears continuo, series completas, validación, API/IPC/preload/servicio Angular y tests. Decisión para 13J.2: Apache ECharts + ngx-echarts; siguiente paso gráfica + filtros.** |
| **2.28** | **02/09/2026** | **Hito 13 Artículos completamente cerrado ✅. 13J.2 añade gráfica de barras con ECharts/ngx-echarts, filtros reactivos Tipo/Mes/Año, total, tooltips, estados, protección ante respuestas fuera de orden y diseño compacto definitivo de 275 px; `null` representa Todos mediante `canSelectNullableOptions`. 13K integra las líneas normales de Ventas con la ficha de Artículos, abriendo o activando una única pestaña y preservando cambios dirty y el workspace de Ventas. Todo validado y subido. Siguiente hito: 14 Clientes.** |
| **2.29** | **02/09/2026** | **14A ✅. Análisis funcional y plan de Clientes cerrados. Se acuerdan workspace de un único cliente, búsqueda totalmente en memoria, CRUD con soft delete, Ventas reutilizando Histórico, estadísticas reales con gráfica y facturas como agrupaciones 1..N de ventas positivas ya cobradas. Cada venta pertenece como máximo a una factura; devoluciones y mixtas no son elegibles; Clientes no usa TicketBAI. Siguiente: 14B Base del apartado Clientes.** |
| **2.30** | **03/09/2026** | **Clientes 14B–14D y 14E.1–14E.4 terminados, validados y subidos ✅. Ya están operativos ruta/página, workspace persistente de una ficha, búsqueda local, protección dirty, secciones, formulario compartido, datos generales/facturación, CREATE, UPDATE transaccional, reconciliación post-COMMIT, Guardar/Cancelar global, validación entre pestañas, feedback de cuatro segundos, foco en nuevos borradores y defensas durante guardado. Siguiente: 14E.5 baja lógica y bloqueo por facturas en borrador.** |
| **2.31** | **03/09/2026** | **14E.5 y 14E.6 terminados, validados y subidos; `14E — Persistencia y mantenimiento` queda cerrado ✅. Baja lógica atómica con bloqueo por facturas en borrador, preservación completa del histórico, contrato/IPC/preload, reconciliación Angular post-COMMIT y UI confirmada. Documento de protección de datos integrado con cliente canónico, AppData y provincias. Nueva regla de trabajo: al añadir imports basta con indicar cuáles; Prettier decide su posición. Siguiente: 14F Ventas del cliente.** |
| **2.32** | **03/09/2026** | **`14F — Ventas del cliente` terminado, validado y subido ✅. El Histórico admite filtro opcional por `clientePublicId` aplicado en SQLite al listado, pagos y agregados. La pestaña ofrece fechas explícitas, importes firmados, selección accesible, detalle readonly, reimpresión y email reutilizando los pipelines existentes, con protección ante respuestas antiguas y acciones ligadas a su propia fila. Ajuste responsive final sin scroll horizontal. Remitente y `{nombreNegocio}` de los emails de tickets usan `AppData.nombre`; `nombreComercial` queda fuera de estas comunicaciones. Siguiente: 14G Estadísticas generales.** |
| **2.33** | **04/09/2026** | **`14G — Estadísticas generales` terminado y validado ✅. Consulta lazy específica con últimos 20 artículos, top por importe real y sumas SQLite por año/mes. PUC firmado, PVP real, beneficio, margen y total general se calculan en backend con enteros seguros/BigInt; devoluciones restan y ventas soft-deleted se excluyen. Renderer con estados, protección ante respuestas antiguas, tablas superiores, acordeón anual de apertura única, detalle mensual, total siempre visible, negativos, margen `null` como `—`, alineación final y overlay corregido. Siguiente: 14H Consumo mensual.** |
| **2.34** | **04/09/2026** | **`14H — Consumo mensual` terminado, validado y subido ✅. Consulta SQLite específica por cliente con importe real, devoluciones negativas y ventas soft-deleted excluidas; contrato público, series temporales completas, años intermedios, huecos a cero y total seguro; API/IPC/preload/servicio Angular; componente ECharts lazy con filtros Mes/Año, cuatro resoluciones temporales, total, tooltips, estados independientes y protección frente a respuestas antiguas. No genera dirty. El siguiente paso es `14I.0`: explicación funcional guiada, capturas y contraste cuidadoso de Facturas con el TPV antiguo antes de diseñar o implementar.** |
| **2.35** | **04/09/2026** | **`14I.0 — Revisión funcional guiada de Facturas` cerrado ✅. Facturas queda definida como agrupación postventa de 1..N ventas ya cobradas y completamente ajena a TicketBAI. Se acuerdan numeración global desde `facturaInicial`, estados Borrador/Finalizada/Anulada, listado con estado explícito, ventas disponibles, borradores editables, emisión transaccional, previsualización facturable, PDF definitivo inmutable, impresión/email desde el PDF y destinatario editable. Anular conserva número/PDF/relaciones históricas, bloquea impresión/email y libera las ventas mediante relaciones inactivas. Plan detallado `14I–14K` cerrado. Siguiente: `14I.1 — Persistencia y relaciones históricas`.** |
| **2.36** | **05/09/2026** | **`14I — Dominio y listado de facturas` cerrado ✅ y `14J.1–14J.2` cerrados ✅. Esquema con `fecha_anulacion` y relaciones activas/históricas mediante índice único parcial; import legacy adaptado; listado público/cacheado; ventas disponibles con reglas de elegibilidad; creación, actualización y eliminación transaccional de borradores; API/IPC/preload y reconciliación Angular post-COMMIT sin `reload()` obligatorio. Limpieza posterior de tests duplicados en `clientes.service.spec.ts`. Siguiente: `14J.3 — modal Angular del editor de factura`.** |

---

# 32. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.36.

Estado principal:
- Ventas 12C.1–12C.8 ✅
- 12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
- Hito 13 Artículos ✅ COMPLETAMENTE CERRADO
- Hito 14 Clientes 🟦 EN CURSO
  - 14A–14H ✅
  - 14I Dominio y listado de facturas ✅ CERRADO
    - 14I.0 revisión funcional guiada ✅
    - 14I.1 persistencia y relaciones históricas ✅
    - 14I.2 dominio/contratos/repository ✅
    - 14I.3 API/IPC/preload/Angular ✅
    - 14I.4 listado Angular ✅
  - 14J Editor de factura 🟦 EN CURSO
    - 14J.1 ventas disponibles ✅ CERRADO
    - 14J.2 persistencia de borradores ✅ CERRADO
      - creación transaccional ✅
      - actualización transaccional ✅
      - eliminación transaccional ✅
      - application service/API/IPC/preload/Angular ✅
      - reconciliación de caché post-COMMIT ✅
    - 14J.3 modal Angular ⬜ SIGUIENTE
    - 14J.4 dirty y convivencia con la ficha ⬜
  - 14K Emisión y documentos ⬜
- Roadmap posterior: 15 Almacén, 16 Compras.

Punto base de repositorio:
- estado funcional contrastado hasta el commit 8be974b, que cierra 14J.2D3;
- después se limpió una duplicación accidental de tres tests en clientes.service.spec.ts, sin cambio funcional.

Reglas críticas generales:
- Angular 22 standalone, signals/computed/input/output/inject.
- No añadir explícitamente ChangeDetectionStrategy.OnPush.
- TypeScript estricto; no any, usar unknown cuando corresponda.
- @if/@for/@switch.
- JSDoc breve en todo método TS/JS nuevo.
- Líneas en blanco solo estructurales; una propiedad por línea y sin líneas vacías entre propiedades relacionadas.
- Si un archivo exporta un único elemento → export default. Si exporta varios → todos nombrados y ningún default.
- Archivo nuevo: mostrar completo. Archivo existente: fragmento actual → fragmento nuevo.
- Para imports nuevos, indicar solo el import; Prettier ordena su posición.
- Trabajar por lotes coherentes, revisar main antes de patches y no avanzar sin confirmación.
- El usuario aplica cambios, ejecuta pruebas y hace commits; el asistente no hace commits/PR ni ejecuta npm/ng.
- Frontend habitual: npm test, npm run build, npm run lint.
- Backend/Electron: npm run test:electron, npm run build:electron, npm run lint.
- DATABASE_SCHEMA_VERSION permanece en 1 hasta la primera versión estable con usuarios; ante cambios incompatibles se recrea/reimporta la instalación.

Reglas cerradas de Clientes/Facturas:
- Cliente usa un único workspace persistente durante la sesión; cambiar/quitar/crear con dirty exige confirmación.
- Crear/finalizar una factura exige cliente persistido y ficha limpia para usar datos canónicos de facturación.
- Factura de Clientes = agrupación postventa de 1..N ventas ya cobradas.
- Clientes no cobra ni ejecuta TicketBAI al crear, editar, emitir, imprimir o enviar facturas.
- Venta → 0..1 factura activa y 0..N relaciones históricas de facturas anuladas.
- factura_venta.activa distingue relación vigente/histórica; índice único parcial permite como máximo una activa por venta.
- Borradores y emitidas conservan relaciones activas; anular las convertirá en históricas/inactivas y liberará las ventas.
- Solo ventas positivas ordinarias del cliente, no eliminadas, sin devolución/mixta y sin relación activa ajena son elegibles.
- Al editar un borrador, sus propias ventas siguen siendo elegibles y aparecen marcadas como incluidas.
- Relaciones históricas anuladas no bloquean una venta.
- Cambiar el cliente de una venta ya facturada está permitido y no altera relaciones/documentos históricos.
- Borrador: sin número oficial, editable; emitida: numero_año e inmutable; anulada: numero_año, inmutable y solo consulta.
- Listado Facturas ya está implementado y cacheado; borradores muestran “Borrador”, no publicId.
- Email/impresión del listado solo aparecen para emitidas; email se deshabilita sin SMTP.
- Nueva factura se bloquea si la ficha del cliente tiene cambios sin guardar.
- Crear borrador exige 1..N ventas, revalida en SQLite, recalcula importe y copia snapshot de facturación en una única transacción.
- Actualizar borrador sincroniza relaciones y recalcula importe de forma transaccional.
- Eliminar borrador hace soft delete de factura y borra sus relaciones, liberando ventas.
- Tras COMMIT de crear/actualizar/eliminar, ClientesService reconcilia directamente la caché; no depender de reload() posterior.
- La numeración futura de emisión es global por serie, desde facturaInicial o 1 como fallback, y nunca reutiliza números.
- 14K conservará emisión transaccional, previsualización, PDF definitivo inmutable, impresión/email desde ese PDF y anulación histórica.

Próximo paso exacto:
14J.3 — Modal Angular del editor de factura.

Para 14J.3:
- revisar main actual antes de proponer cambios;
- conectar eventos Nueva factura / abrir factura del ClientInvoicesComponent;
- usar getFacturaVentasDisponibles para la selección;
- usar create/update/deleteFacturaBorrador para persistencia;
- reutilizar HistoricalSaleDetailComponent o su patrón para el detalle de la venta seleccionada;
- nueva y borrador = edición; emitida/anulada = consulta;
- mantener dirty propio del modal para 14J.4 y no mezclarlo con el dirty de la ficha;
- no implementar todavía emisión/PDF real: eso pertenece a 14K.
```

---

**Fin del documento de continuidad v2.36.**
