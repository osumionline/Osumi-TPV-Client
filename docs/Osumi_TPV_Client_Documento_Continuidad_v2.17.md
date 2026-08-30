# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.17  
**Fecha:** 30 de agosto de 2026  
**Estado:** TicketBAI ordinario permanece **cerrado ✅**. Se abre un nuevo gran hito: **13 — Artículos**, cuyo análisis funcional inicial queda definido a partir del comportamiento real del TPV legacy y de las explicaciones del usuario. `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**.

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
    12C.8 TicketBAI ordinario                     ✅
    12C.9 TicketBAI devoluciones/mixtas           ⏸️ Berein
    12C.10 Regresión integral final               ⬜

13 Artículos                                      🟦 NUEVO HITO
  13A Análisis funcional y diseño                 🟦
    13A.1 Workspace/pestañas                      ✅ definido
    13A.2 Modelo funcional                        ✅ definido
    13A.3 Reglas de precios                       ✅ definido
    13A.4 Categorías múltiples                    ✅ definido
    13A.5 Persistencia de estado UI               ✅ definido
    13A.6 Marca/proveedor desde Artículos          ✅ definido
    13A.7 Diseño técnico/contratos                ⬜ SIGUIENTE
  13B Infraestructura backend                     ⬜
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

Todavía no hay usuarios reales.

Por tanto:

```text
sin migraciones por ahora
```

Ante cambios incompatibles:

```text
actualizar versión de esquema
→ borrar datos locales
→ recrear instalación
→ reimportar .otpv
```

Versión actual:

```text
DATABASE_SCHEMA_VERSION = 2
```

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
- funciona también como buscador;
- el usuario puede escribir un localizador o acceso directo;
- al pulsar Enter se busca/carga el artículo correspondiente.

Para artículos nuevos:

- el usuario **no puede introducir manualmente un localizador**;
- el backend genera automáticamente el nuevo localizador al crear/persistir el artículo;
- existe una función legacy/backend para esta generación que se localizará durante la implementación.

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

# 14. Venta online

Por ahora es informativo.

Indica si el artículo se vende en la tienda online.

No desarrollar todavía integración real con tienda online.

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

Durante diseño técnico se revisará si este QR es solo derivado o si el legacy lo persistía también en `codigo_barras`.

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

# 27. Arquitectura prevista

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

Workspace Angular:

```text
tabs
activeTab
drafts
base snapshots
dirty state
```

Backend:

```text
lectura
validación persistente
generación localizador
persistencia
relaciones
histórico stock
baja lógica
```

No copiar directamente modelos mutables ni lógica legacy.

---

# 28. Próximo paso exacto

```text
13A.7 — Diseño técnico y contratos de Artículos
```

Antes de tocar Angular:

1. revisar esquema SQLite real de `articulo`, `codigo_barras`, categorías y relaciones, marca, proveedor, proveedor/marca, `historico_articulo` y tablas complementarias;
2. localizar la función existente que genera localizadores;
3. revisar repositories usados por Ventas;
4. definir contratos de resumen, detalle, guardado, códigos e histórico;
5. definir precisión/redondeo de cálculos;
6. diseñar el workspace de pestañas siguiendo el patrón de Ventas.

No implementar Estadísticas todavía.

---

# 29. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.14 | 29/08/2026 | PENDING, post-COMMIT, Histórico y reconciliación |
| 2.15 | 30/08/2026 | 12C.8E completo, retry, UI y regeneración documental |
| 2.16 | 30/08/2026 | 12C.8 TicketBAI ordinario cerrado |
| **2.17** | **30/08/2026** | **Inicio Hito 13 Artículos: workspace, precios, stock, categorías múltiples, códigos, observaciones, baja, Marca/Proveedor y roadmap 13→16** |

---

# 30. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.17.

Estado:
- Ventas 12C.1–12C.8 ✅
- 12C.9 TicketBAI devoluciones/mixtas ⏸️ Berein
- Hito 13 Artículos 🟦
- Próximo punto: 13A.7 diseño técnico/contratos.

Roadmap:
13 Artículos
14 Clientes
15 Almacén
16 Compras

Artículos es un workspace de pestañas persistente durante la ejecución.
Solo puede existir una pestaña por artículo persistido.
Puede haber varias pestañas de artículos nuevos temporales.
El localizador de un artículo nuevo lo genera el backend al guardar.
El localizador de un artículo existente funciona como buscador por localizador/acceso directo.
Categorías pasan de 0..1 a 0..N, todas equivalentes, sin principal.
PUC = precio albarán + IVA + RE.
Precio albarán, PUC, margen y PVP se recalculan entre sí.
El descuento añade descuento %, margen descuento y PVP descuento.
Si cambia stock al guardar, hay que persistir el nuevo stock y crear histórico.
Stock mínimo, máximo y lote óptimo son informativos por ahora.
Existe QR obligatorio derivado del localizador y códigos adicionales 0..N.
Observaciones tienen flags independientes para Ventas y Pedidos.
Baja = soft delete.
Duplicar crea un borrador nuevo sin id/localizador y no persiste hasta Guardar.
Cancelar restaura snapshot base.
Guardar y cerrar persiste y cierra.
Desde Ventas se abrirá/enfocará la pestaña del artículo, sin duplicarla.
Marca y Proveedor pueden crearse desde Artículos mediante modal.
Crear Marca puede opcionalmente crear un proveedor con los mismos datos y asignarle esa marca.
Crear Proveedor permite seleccionar sus marcas.
Estadísticas no se implementaron en legacy y se diseñarán al final.
La persistencia del workspace solo dura mientras la aplicación está abierta.
Antes de implementar, revisar esquema SQLite, repositorios existentes y función de generación de localizador.

Convenciones:
- Angular standalone/signals/inject/input/output.
- No any.
- JSDoc breve para todo método TS/JS nuevo.
- Revisar main antes de patches.
- Archivo existente: fragmento actual → nuevo.
- Líneas en blanco solo estructurales.
- Trabajar por lotes coherentes y no avanzar sin confirmación.
```

---

**Fin del documento de continuidad v2.17.**
