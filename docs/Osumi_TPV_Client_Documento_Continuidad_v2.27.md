# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.27  
**Fecha:** 2 de septiembre de 2026  
**Estado:** TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**. El **Hito 13 — Artículos** continúa en frontend. Todo `13B — Infraestructura backend` está cerrado, incluido `13B.6E — unificación total de imágenes en WebP`. `13C — Workspace y carga de artículos`, `13D — General`, `13E — WEB`, `13F — Códigos de barras`, `13G — Observaciones`, `13H — Histórico` y **`13I — Baja / duplicado / acciones` están cerrados y validados ✅**. `13J — Estadísticas` está en curso: **`13J.1 — Backend + consulta agregada` ✅** está completado y probado; el siguiente paso exacto es **`13J.2 — Gráfica + filtros`**, usando Apache ECharts mediante `ngx-echarts`, con ventas netas, filtros Tipo/Mes/Año y series temporales con huecos a cero.

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
  13J Estadísticas                                🟦
    13J.1 Backend + consulta agregada              ✅
    13J.2 Gráfica + filtros                       🟦 SIGUIENTE
  13K Integración con Ventas                      ⬜

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

`13J — Estadísticas` está **en curso 🟦**. El backend agregado está cerrado y probado; falta la representación visual.

Objetivo funcional acordado para un artículo:

```text
                    gráfica de barras

Tipo: [Unidades / Importe]
Mes:  [mes concreto / Todos]
Año:  [año concreto / Todos]
```

La gráfica debe actualizarse automáticamente al cambiar cualquiera de los tres selectores, sin botón Aplicar.

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

`13J.1 — Backend + consulta agregada` ✅ ya implementa:

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

Decisión de librería para `13J.2`:

```text
Apache ECharts + ngx-echarts
```

Motivos:

- `ngx-echarts` dispone de línea compatible con Angular 22 y funcionamiento zoneless;
- Apache ECharts usa licencia Apache 2.0;
- se evita introducir la licencia comercial condicionada por ingresos de ApexCharts;
- deja una base reutilizable para estadísticas generales futuras del TPV.

`ng-apexcharts` no se usará para esta implementación.

Diseño previsto para `13J.2`:

- gráfica de barras;
- tres `MatSelect`: Tipo, Mes y Año;
- refresco inmediato al cambiar un filtro;
- total visible sobre/junto a la gráfica (`N unidades` o importe formateado en euros);
- tooltip adaptado a unidades/importe;
- eje Y entero para unidades;
- importes formateados en euros sin perder precisión interna;
- protección frente a respuestas IPC fuera de orden si el usuario cambia filtros rápidamente;
- estado vacío cuando no haya datos;
- Estadísticas será de solo lectura, no forma parte del `ArticuloDraft` y nunca genera `dirty`;
- la sección no debe ofrecerse a artículos nuevos todavía no persistidos.

No se ha fijado todavía de forma explícita la selección inicial de Año/Mes/Tipo; decidirla al construir `13J.2` en lugar de asumirla silenciosamente.

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

El histórico conserva información aunque el artículo sea dado de baja. Para artículos nuevos todavía no persistidos no se realiza llamada IPC y se muestra un estado informativo.

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

# 25. Integración futura con Ventas

Se implementará en:

```text
13K Integración con Ventas
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
→ no llamar a IPC
→ mostrar estado “El histórico estará disponible cuando el artículo se haya guardado por primera vez”
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

# 28J. 13J — Estadísticas 🟦 EN CURSO

La funcionalidad nunca llegó a completarse en el TPV legacy, por lo que para el cliente nuevo se ha definido desde cero manteniendo una UI sencilla.

Roadmap:

```text
13J.1 Backend + consulta agregada ✅
13J.2 Gráfica + filtros          🟦 SIGUIENTE
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

`13J.1` está cerrado ✅ y todavía no produce cambios visuales.

## 28J.4 Librería y UI decididas para 13J.2

Usar:

```text
Apache ECharts
+
ngx-echarts (rama compatible con Angular 22)
```

No usar `ng-apexcharts` para esta implementación. Aunque técnicamente es viable, ApexCharts usa actualmente una licencia comercial condicionada por ingresos; ECharts usa Apache 2.0 y encaja mejor con un proyecto open source que puede incorporar módulos comerciales.

La futura implementación debe incluir:

- gráfica de barras;
- total visible (`137 unidades` / `2.347,80 €`);
- `MatSelect` Tipo/Mes/Año;
- actualización automática al cambiar un selector;
- tooltip específico para unidades o importe;
- eje Y entero para Unidades;
- formato monetario solo en presentación, manteniendo microeuros en datos;
- protección frente a respuestas IPC fuera de orden;
- estado vacío;
- Estadísticas no genera `dirty` ni modifica `ArticuloDraft`;
- ocultar/no ofrecer Estadísticas en artículos nuevos no persistidos.

La selección inicial exacta de Tipo/Mes/Año **no se ha fijado todavía**; resolverla explícitamente al empezar `13J.2`.

---

# 29. Próximo paso exacto

```text
13J.2 — Gráfica + filtros
```

Estado previo cerrado:

```text
13D — General ✅
13E — WEB ✅
13F — Códigos de barras ✅
13G — Observaciones ✅
13H — Histórico ✅
13I — Baja / duplicado / acciones ✅
13J.1 — Backend + consulta agregada ✅
```

Antes de implementar, revisar `main` actual. `13J.2` debe instalar ECharts/ngx-echarts y consumir exclusivamente `ArticulosService.getEstadisticas()`; no debe volver a consultar o reagrupar ventas en renderer.

Primeras decisiones a cerrar al implementar:

- valores iniciales de Tipo/Mes/Año;
- presentación exacta de las etiquetas del eje X según cada combinación;
- comportamiento visual cuando `availableYears` esté vacío;
- altura/responsividad de la gráfica dentro del workspace.

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
| **2.21** | **01/09/2026** | **13B completo ✅; 13C Workspace/carga ✅; 13D General ✅ mini-hito cerrado: fiscalidad, motor entero de precios, descuento y creación rápida transaccional de Marca/Proveedor; siguiente paso: retoques de General antes del siguiente apartado de Artículos** |
| **2.22** | **01/09/2026** | **13D General cerrado definitivamente ✅: accesos directos globales junto a Localizador, persistencia inmediata y sincronización de tabs, General compacto, toggles Material, categorías multiselect, UI a 2 decimales con precisión interna preservada, recálculo en escritura, selección al foco, modal de márgenes y reutilización de pestaña nueva al buscar/resolver; siguiente en aquella versión: Códigos de barras (posteriormente desplazado a 13F al reincorporar WEB)** |
| **2.23** | **01/09/2026** | **Se reincorpora la pestaña WEB al roadmap como `13E` y pasa a ser el siguiente mini-hito; Códigos de barras y apartados posteriores se desplazan a `13F`–`13K`. WEB mantiene Mostrar en web, descripciones y fotos 0..N, conservando datos al desactivar Venta online.** |
| **2.24** | **01/09/2026** | **13E WEB ✅ mini-hito cerrado: contenido WEB, galería 0..N en columna derecha, file picker/drag&drop, principal y orden, staging común WebP, crop libre secuencial, rollback de lotes y ciclo de vida completo de temporales al eliminar/cancelar/cerrar/reutilizar borrador. Se elimina el concepto de “guardado WEB”: WEB forma parte del ArticuloDraft único y se guarda/cancela con las acciones globales del artículo. Siguiente: 13F Códigos de barras.** |
| **2.25** | **02/09/2026** | **13F Códigos de barras ✅ y 13G Observaciones ✅ cerrados. Códigos recupera UX legacy con foco automático, lector/Enter, tarjetas QR 3 por fila mediante angularx-qrcode, principal diferenciado no borrable y adicionales add/remove solo en draft. Observaciones añade textarea + toggles Material Pedidos/Ventas sobre el mismo ArticuloDraft. Siguiente: 13H Histórico.** |
| **2.26** | **02/09/2026** | **13H Histórico ✅ cerrado con API SQLite paginada/ordenada, MatTable/MatSort/MatPaginator remoto y MatPaginatorIntl global en castellano. Refinamiento UX: foco automático en Localizador al crear/activar drafts nuevos. 13I.1 Guardar/Cancelar global ✅ con mapper del draft, save IPC/preload, barra inferior, cleanup de staging y feedback “Artículo guardado correctamente” durante 4 s. 13I.2 Duplicar ✅: nueva pestaña dirty, identidades/stock/códigos/acceso/observaciones reseteados, configuración reutilizable conservada y fotos compartidas mediante nuevas relaciones al mismo asset `archivo`. Siguiente: 13I.3 Baja lógica.** |
| **2.27** | **02/09/2026** | **13I.3 Baja lógica ✅ y 13I completo ✅: sección solo para persistidos, bloqueo con dirty, confirmación, deactivate vía API/IPC/preload, soft delete artículo+códigos y cierre de pestaña tras éxito preservando histórico/fotos/relaciones. 13J Estadísticas iniciado: diseño acordado con Tipo Unidades/Importe, Mes/Año concretos o Todos, ventas netas con devoluciones negativas, huecos a cero y cuatro resoluciones temporales. 13J.1 backend agregado ✅: SUM SQLite, availableYears continuo, series completas, validación, API/IPC/preload/servicio Angular y tests. Decisión para 13J.2: Apache ECharts + ngx-echarts; siguiente paso gráfica + filtros.** |
---

# 31. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.27.

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
- 13D General ✅ CERRADO DEFINITIVAMENTE
- 13E WEB ✅ CERRADO
  - contenido WEB ✅
  - fotos 0..N ✅
  - crop + staging + cleanup ✅
- 13F Códigos de barras ✅ CERRADO
- 13G Observaciones ✅ CERRADO
- 13H Histórico ✅ CERRADO
  - backend + API paginada ✅
  - tabla + orden + paginación ✅
  - MatPaginator global en castellano ✅
- refinamiento UX: drafts nuevos enfocan Localizador automáticamente ✅
- 13I Baja / duplicado / acciones ✅ CERRADO
  - 13I.1 Guardar / Cancelar global ✅
  - feedback visual de guardado 4 s ✅
  - 13I.2 Duplicar ✅
  - 13I.3 Baja lógica ✅
- 13J Estadísticas 🟦
  - 13J.1 backend + consulta agregada ✅
  - 13J.2 gráfica + filtros 🟦 SIGUIENTE
- 13K Integración con Ventas ⬜

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
- Todo draft nuevo enfoca automáticamente el campo Localizador al crearse/activarse.
- Campo Localizador reutiliza buscador de Ventas; Enter resuelve localizador/acceso directo/barcode.
- Si búsqueda/resolución se inicia desde una pestaña de artículo nuevo, el primer artículo encontrado reutiliza esa misma pestaña; si ya estaba abierto, se cierra el borrador origen y se activa la existente.
- Acceso directo se gestiona desde un modal global junto al Localizador y se persiste inmediatamente.
- Categorías 0..N equivalentes.
- Marca obligatoria; Proveedor opcional.
- AppData global en renderer mediante AppDataService; Artículos no depende de VentasContextService.
- tipoIva=iva → RE efectivo 0. tipoIva=re → ivaList/reList son pares por índice.
- No hardcodear IVA/RE si la configuración de instalación ya los define.
- Precio albarán y PUC en microeuros; PVP en céntimos; IVA/RE en bps; margen en microporcentaje.
- 1 % = 1_000_000 microporcentaje.
- Motor de precios usa enteros/BigInt; evitar floats encadenados.
- UI de importes y porcentajes: máximo 2 decimales, sin reducir la precisión interna.
- Los decimales recalculan durante escritura salvo estados transitorios como `12,`, `12.`, `-` o vacío.
- Al recibir foco, importes/márgenes y stock seleccionan el contenido una vez; clicks posteriores con foco no reseleccionan.
- `marginList` alimenta el modal de sugerencias de margen; Margen sigue siendo editable directamente.
- PALB → PUC → mantener margen → PVP.
- PUC → PALB → mantener margen → PVP.
- PVP → margen. Margen → PVP.
- Descuento persistido mediante pvpDescuentoCents + margenDescuentoMicroporcentaje nullable; el porcentaje de descuento es derivado/editable de UI.
- Creación Marca+Proveedor y Proveedor+marcas se hace transaccionalmente en backend.
- Tras un COMMIT de creación no hacer depender el éxito de una recarga posterior innecesaria.
- Código por defecto = fila real codigo_barras basada en localizador.
- Códigos adicionales se añaden/eliminan solo en draft; no hay edición inline ni guardado independiente.
- La pestaña Códigos enfoca el input nuevo, acepta lector USB + Enter y muestra QR con angularx-qrcode en tarjetas 3 por fila.
- Observaciones usa textarea + MatSlideToggle independientes para Pedidos/Ventas sobre el mismo draft.
- Histórico NO forma parte del ArticuloDraft y nunca genera dirty.
- Histórico se pagina/ordena en SQLite, no en MatTableDataSource. Páginas 20/50/100/200.
- Tipos de histórico: 1 Venta, 2 Venta web, 3 Pedido, 4 Manual, 5 Inventario, 6 Inventario múltiple; desconocidos → `Tipo N`.
- MatPaginator usa SpanishPaginatorIntlService global para textos/tooltips en castellano.
- Cambio manual de stock crea historico_articulo tipo 4.
- Alta con stock inicial no genera histórico.
- Guardar/Cancelar son acciones globales de TODA la ficha, no de cada sección.
- createArticuloSaveCommand valida nombre, marca y fiscalidad y normaliza strings opcionales antes de ArticulosApi.save().
- Guardar llama al backend transaccional, reemplaza draft/baseSnapshot con el artículo fresco y deja dirty=false.
- Cancelar confirma, limpia staged nuevos y restaura baseSnapshot.
- Tras guardar correctamente se muestra “Artículo guardado correctamente” durante 4 segundos; desaparece antes si la ficha vuelve a cambiar.
- Duplicar solo se permite sobre artículo persistido limpio; crea una nueva pestaña dirty sin escribir SQLite.
- Duplicar resetea id/publicId/localizador, referencia, stock, acceso directo, códigos adicionales y observaciones; nombre pasa a “(copia)”.
- Duplicar conserva marca/proveedor/categorías/precios/fiscalidad/márgenes/descuento/stock min-max/lote/WEB/descripciones/fotos/flags de observaciones.
- Las fotos persistidas del duplicado reutilizan el mismo asset `archivo` y crean nuevas relaciones `articulo_archivo`; no se duplica físicamente el WebP.
- Baja solo aparece para artículos persistidos y exige dirty=false; confirma antes de ejecutar.
- Baja = soft delete artículo + códigos activos; conserva histórico/categorías/relaciones/fotos/assets.
- Tras baja correcta se cierra la pestaña; si falla backend, permanece abierta.
- Venta online muestra WEB; desactivarla oculta pero no borra datos.
- WEB NO tiene guardado propio: comparte el único ArticuloDraft y las acciones globales del artículo.
- Fotos WEB: crop libre → staging → Sharp/WebP; la galería mantiene orden y una única principal.
- Staged nuevos se limpian al eliminar, cancelar cambios, cerrar descartando o sustituir un borrador por un artículo localizado; navegar entre módulos no los descarta.
- Estadísticas es lectura persistida y NO debe formar parte de ArticuloDraft ni generar dirty.
- Estadísticas usa venta NETA: SUM(unidades) o SUM(importe_micros); devoluciones negativas restan y ventas soft-deleted se excluyen.
- Filtros Estadísticas: Tipo Unidades/Importe, Mes concreto/Todos, Año concreto/Todos; cualquier cambio refresca automáticamente.
- Año concreto + mes concreto → días; año concreto + Todos → 12 meses; Todos + mes → ese mes entre años; Todos + Todos → todos los meses cronológicos.
- Períodos sin actividad se rellenan con 0; availableYears completa también años intermedios.
- 13J.1 ya expone getEstadisticas() por repository/service/API/IPC/preload/Angular y devuelve series completas con value en unidades o microeuros.
- Para 13J.2 usar Apache ECharts + ngx-echarts compatible con Angular 22. No usar ng-apexcharts para esta implementación.
- ECharts debe limitarse a presentación: no reagrupar ventas ni recalcular estadísticas en renderer.
- 13J.2 debe mostrar gráfica de barras, total, MatSelect Tipo/Mes/Año, tooltips y protección ante respuestas IPC fuera de orden.
- Estadísticas no debe mostrarse en drafts nuevos sin id.
- La selección inicial exacta Tipo/Mes/Año aún debe decidirse explícitamente al comenzar 13J.2.

Convenciones:
- Angular standalone/signals/inject/input/output.
- No any; usar unknown.
- JSDoc breve para todo método TS/JS nuevo.
- Revisar main antes de patches.
- Archivo existente: fragmento actual → nuevo.
- Líneas en blanco solo estructurales.
- Trabajar por lotes coherentes y no avanzar sin confirmación.

Próximo paso exacto:
13J.2 — Gráfica + filtros.
```

---

**Fin del documento de continuidad v2.27.**
