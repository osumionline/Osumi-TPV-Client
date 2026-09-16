# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.66  
**Fecha:** 16 de septiembre de 2026  
**Base de continuidad:** `v2.66 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.65.md`

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
CTRL Normalización de controles                   ✅ CERRADA

16 Compras                                        🟦 EN DESARROLLO
  16.1–16.12 Pedidos                              ✅ CERRADO
  16.13 Marcas                                    ✅ HITO CERRADO
    16.13.1 Snapshot histórico Marca en Ventas    ✅
    16.13.2 Backend CRUD/soft-delete              ✅
    16.13.3 Infraestructura logo                  ✅
    16.13.4 Workspace + pantalla base             ✅
    16.13.5 Buscador en memoria                   ✅
    16.13.6 Ficha Datos                           ✅
    16.13.7 Backend Estadísticas                  ✅
    16.13.8 UI Estadísticas                       ✅
    16.13.9 Sincronización maestro global         ✅
      16.13.9A Marca eliminada / persistencia     ✅
      16.13.9B Selector + sync integral           ✅
    16.13.10 Regresión integral                   ✅

  16.14 Proveedores                               🟦 CASI CERRADO
    16.14.1 Auditoría + contrato backend          ✅
    16.14.2 CRUD backend completo                 ✅
    16.14.3 Infraestructura logo                  ✅
    16.14.4 Workspace + pantalla base             ✅
    16.14.5 Buscador en memoria                   ✅
    16.14.6 Ficha Datos                           ✅
    16.14.7 Pestaña Marcas                        ✅
    16.14.8 Comerciales backend                   ✅
    16.14.9 UI Comerciales                        ✅
    16.14.10 Sincronización global                ✅
    16.14.11 Regresión integral                   ⬅️ SIGUIENTE

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

`16.13 — Marcas` queda completamente cerrado, probado funcionalmente y subido a `main`.

`16.14.1–16.14.10 — Proveedores` están implementados, probados funcionalmente y subidos a `main`.

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

No reabrir hitos cerrados salvo regresión real demostrada.

---

# 2. Punto exacto de continuación

El siguiente mini-hito exacto es:

```text
16.14.11 — Regresión integral de Proveedores
```

No queda desarrollo funcional ordinario pendiente en Proveedores antes de esa regresión.

Objetivo de `16.14.11`:

```text
validar de extremo a extremo todo el contrato de Proveedores
→ renderer
→ workspace
→ backend
→ TypeORM
→ archivos/logo
→ maestro global
→ relaciones con Marcas
→ Comerciales
→ Artículos
→ Pedidos / consumidores históricos
→ persistencia tras reinicio
```

Si la regresión integral no descubre fallos reales:

```text
16.14 Proveedores ✅ CERRADO
16 Compras ✅ CERRADO
```

Tras ese cierre, no iniciar automáticamente otro gran hito sin acordar primero el siguiente bloque de trabajo.

---

# 3. Repositorios y referencias

## 3.1 Cliente actual

```text
https://github.com/osumionline/Osumi-TPV-Client
main
```

## 3.2 TPV antiguo — referencia funcional

Frontend:

```text
https://github.com/osumionline/Osumi-TPV
```

Backend:

```text
https://github.com/osumionline/TPV-API
```

El TPV antiguo sirve como referencia funcional, numérica y UX, pero **no como arquitectura a copiar literalmente**.

Ante contradicción entre comportamiento legacy y una decisión explícita del nuevo cliente, prevalece la decisión explícita del nuevo cliente.

## 3.3 SDK TicketBAI

```text
https://github.com/osumionline/ticketbaiws
```

No tocar `12C.9` sin nueva información de Berein.

---

# 4. GitHub connector — política obligatoria

El usuario dispone del complemento oficial de **GitHub** conectado a ChatGPT.

Se ha verificado correctamente el acceso de lectura a:

```text
osumionline/Osumi-TPV-Client
main
```

GitHub se usa **EXCLUSIVAMENTE EN MODO LECTURA** para revisar código, estructura, referencias, contratos, tests, commits, PRs existentes y CI.

Antes de proponer cualquier patch:

```text
→ revisar siempre main actual
→ trabajar sobre el código real
```

Aunque el conector exponga técnicamente operaciones de escritura, **NO deben utilizarse**.

Quedan prohibidas:

```text
crear commits
hacer push
crear/modificar ramas
crear/modificar pull requests
hacer merge
crear/modificar/borrar archivos
crear/modificar issues
añadir comentarios
añadir labels
cambiar reviewers
re-ejecutar workflows
modificar refs
cualquier otra acción mutante
```

Regla absoluta:

```text
ChatGPT
→ lectura
→ análisis
→ propuesta

Usuario
→ aplica cambios
→ prueba
→ commit
→ push
```

Para este proyecto se prefiere el GitHub connector frente al acceso web genérico.

Si el complemento falla:

```text
1. comunicar el error exacto;
2. distinguir fallo HTTP real de fallo de conexión/herramienta/permisos;
3. no asumir que GitHub está caído;
4. intentar solo las lecturas necesarias;
5. pedir únicamente los archivos concretos imprescindibles.
```

---

# 5. Convenciones de trabajo

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- Aplicación zoneless.
- Nuevo control flow: `@if`, `@for`, `@switch`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Preferir `inject()` cuando encaje.
- Preferir APIs Angular modernas.
- Evitar `@HostListener`; preferir `host`.
- Todo método nuevo lleva JSDoc breve.
- También los métodos nuevos declarados en interfaces llevan JSDoc.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.

Imports internos:

```text
→ SIEMPRE alias absoluto
```

Exports:

```text
1 export  → default
>1 export → named
```

Flujo:

```text
ChatGPT
→ revisa main
→ analiza
→ propone cambios y tests

Usuario
→ aplica
→ ejecuta tests/build/lint
→ prueba funcionalmente
→ commit
→ push
→ confirma
```

Archivo nuevo:

```text
→ contenido completo
```

Archivo existente:

```text
→ fragmento reconocible actual
→ reemplazo exacto
```

Preferencia actual del usuario:

```text
→ trabajar en bloques coherentes, suficientemente grandes
→ cada respuesta debe poder convertirse en un commit lógico
→ evitar microcambios innecesariamente fragmentados
```

---

# 6. Stack actual de referencia

Según `main` durante el desarrollo de Compras:

```text
Angular core/material/cdk            22.x
TypeScript                           6.x
Electron                             44.x
TypeORM                              1.x
better-sqlite3                       12.x
@osumi/ticketbaiws                   1.0.1+
ECharts                              6.x
ngx-echarts                          22.x
```

Antes de asumir una versión exacta, revisar `package.json` actual de `main`.

Batería cross-layer habitual:

```bash
npm run build
npm test
npm run build:electron
npm run test:electron
npm run lint
```

---

# 7. SQLite durante desarrollo

Hasta la primera versión estable:

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones.

Si un cambio es incompatible con la SQLite local:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear
→ reimportar .otpv
```

El desarrollo de Proveedores no ha requerido incrementar la versión del schema.

---

# 8. Reorganización canónica de servicios frontend

No asumir rutas planas antiguas.

```text
src/app/services/
├── almacen/
├── application/
├── articulos/
├── clientes/
├── compras/
│   ├ compras-workspace.service.spec.ts
│   ├ compras-workspace.service.ts
│   ├ compras.service.ts
│   ├ marcas.service.spec.ts
│   ├ marcas.service.ts
│   ├ proveedores.service.spec.ts
│   └ proveedores.service.ts
├── empleados/
└── ventas/
```

Antes de usar imports, comprobar `main`.

---

# 9. TicketBAI

```text
12C.8 TicketBAI ordinario ✅ CERRADO
12C.9 TicketBAI devoluciones/mixtas ⏸️ BEREIN
```

No inventar contrato de devoluciones/mixtas sin nueva información.

Principios del ordinario:

- SDK `@osumi/ticketbaiws`.
- Producción por defecto.
- Desarrollo manual mediante TEST.
- No selector de entorno en UI.
- `PENDING` es válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite reenvío directo.
- `error_temporal` se reconcilia antes de actuar.
- `error_permanente` informa sin mutación automática.
- Fallo posterior al COMMIT no revierte venta confirmada.

---

# 10. Hitos cerrados relevantes

```text
13 Artículos ✅
14 Clientes ✅
15 Almacén ✅
REF ✅
CTRL ✅
16.1–16.12 Pedidos ✅
16.13 Marcas ✅
16.14.1–16.14.10 Proveedores ✅
```

No reabrirlos salvo regresión real.

---

# 11. Marcas — contrato funcional final

`16.13 Marcas` queda **completamente cerrado**.

Marcas vive bajo Compras:

```text
PEDIDOS | MARCAS | PROVEEDORES
```

Welcome:

```text
Buscar
Nueva
```

Marca persistida:

```text
Datos
Estadísticas
```

Marca nueva:

```text
solo Datos
```

Campos:

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Logo
```

La pantalla completa de Marca no gestiona proveedores.

La creación rápida desde Artículos conserva `crearProveedor`.

---

# 12. Workspace de Marcas

Conserva:

```text
marcaId
marcaPublicId
draft
baseSnapshot
logoStagingId
activeSection
estadisticasFiltros
```

Dirty:

```text
computed
→ draft vs baseSnapshot
```

Salir a otra sección:

```text
→ sin confirmación
→ conserva Marca, draft, dirty, pestaña y filtros
```

Dentro de Marcas:

```text
otra Marca / Nueva / Cerrar con dirty
→ confirmación de descarte
```

---

# 13. Datos y logo de Marca

Formulario con Angular Signal Forms.

Validación:

```text
Nombre obligatorio
Nombre no puede ser solo espacios
Email opcional válido
```

Foco automático en Nombre al crear o abrir ficha.

Guardar:

```text
CREATE → crearProveedor = false
UPDATE → respuesta canónica
→ upsert maestro
→ draft/baseSnapshot
→ clean
```

Logo:

```text
purpose = brand_image
WebP
files/brands/
archivo
staging
```

Ciclo:

```text
stage
preview
keep
replace
remove
discard
promote
rollback
```

Renderer no conoce rutas físicas.

---

# 14. Soft-delete de Marca

Persistencia:

```text
marca.deleted_at = timestamp
marca.updated_at = timestamp
```

NO modifica:

```text
articulo.id_marca
proveedor_marca
marca.id_archivo
archivo
fichero físico
snapshots históricos
```

Tras baja:

```text
→ desaparece del maestro activo
→ desaparece del buscador
→ desaparece de nuevas selecciones
```

---

# 15. Snapshot histórico de Marca en Ventas

Fuente canónica:

```text
linea_venta.id_marca_snapshot
```

No usar:

```text
articulo.id_marca actual
linea_venta.marca textual
heurísticas por nombre
```

`id_marca_snapshot`:

```text
INTEGER NULL
sin FK
CHECK null o > 0
índice parcial
```

Ventas nuevas resuelven la Marca canónica server-side.

Varios:

```text
snapshot null
```

Devoluciones:

```text
heredan snapshot de línea origen
```

Legacy import:

```text
legacy article
→ artículo SQLite importado
→ id_marca
```

---

# 16. Estadísticas de Marca

Filtros:

```text
Mes
Año
Tipo = amount | units
```

Inicial:

```text
mes actual
año actual
amount
```

Granularidad:

```text
mes + año → días
Mes Todos + año → 12 meses
Año Todos → Mes Todos/deshabilitado → años
```

Salida:

```text
serie completa
total
availableYears
```

Huecos a cero y años intermedios completos.

Fuente:

```text
linea_venta.id_marca_snapshot
```

Regla de devoluciones:

```text
lv.unidades > 0 → cuenta
lv.unidades <= 0 → no cuenta
```

Por tanto:

```text
devolución pura → ignorada
mixta → solo líneas positivas
```

Aplica a importe y unidades.

Importe se mantiene en microeuros en backend y se convierte a euros solo en UI.

---

# 17. Maestro global de Marcas

Se carga al startup y se mantiene en memoria.

```text
CREATE → añadir inmediatamente
UPDATE → reconciliar inmediatamente
rename → reordenar inmediatamente
logo → sustituir canónica completa
soft-delete → eliminar inmediatamente
```

No depender de reinicio ni `getAll()` accidental.

Consumidores:

```text
buscador de Marcas
selector de Artículos
alta rápida de Proveedores
otros consumidores del maestro
```

Existe cobertura de regresión para CREATE → UPDATE/rename → DELETE sin recargas globales innecesarias.

---

# 18. Artículos vinculados a Marca eliminada

Contrato final:

```text
artículo existente con Marca eliminada
→ puede conservarla

guardar otros cambios sin cambiar Marca
→ permitido

cambiar a otra Marca activa
→ permitido

después de cambiar
→ eliminada ya no seleccionable

artículo nuevo
→ eliminada no disponible
```

Backend UPDATE:

```text
idMarca enviado == id_marca persistido
→ puede conservar aunque esté eliminada

idMarca enviado != id_marca persistido
→ debe ser Marca activa
```

Backend CREATE:

```text
→ siempre Marca activa
```

UI:

```text
Marca histórica actual eliminada
→ opción "Marca eliminada"
→ selected
→ disabled
```

---

# 19. Regresión integral de Marcas

`16.13.10` ejecutado y aprobado.

Se validó:

```text
welcome
búsqueda
nueva
validación
guardar
cancelar
dirty
confirmaciones
workspace
navegación
logo
soft-delete
maestro global
selectores
Marca eliminada
estadísticas días/meses/años
amount
units
persistencia filtros
devoluciones ignoradas
renombrado histórico
reasignación de artículo sin mover historia
persistencia tras reinicio
```

Resultado:

```text
16.13 Marcas ✅ CERRADO
```

---

# 20. Proveedores — implementación actual

```text
16.14 Proveedores 🟦 CASI CERRADO
16.14.1–16.14.10 ✅
16.14.11 Regresión integral ⬅️ SIGUIENTE
```

El contrato funcional definido en v2.65 ha sido implementado sin rediseñarlo.

## 20.1 Arquitectura backend final

Contratos públicos:

```text
ProveedorInterface
ComercialInterface
CrearProveedorCommand
ActualizarProveedorCommand
CrearComercialCommand
ActualizarComercialCommand
```

Repositorio de Proveedores:

```text
findAll
findById
existsActiveByName
create
update
deactivate

createComercial
updateComercial
deactivateComercial
```

`ProveedoresService` backend:

```text
→ valida IDs
→ normaliza textos opcionales
→ valida Nombre
→ valida Email opcional
→ mapea records internos a contratos públicos
→ mantiene CRUD de Proveedor y Comercial separado
```

API / IPC / preload exponen tanto CRUD de Proveedor como CRUD independiente de Comercial.

IPC conserva las reglas generales del proyecto:

```text
assertTrustedSender
getMainWindow cuando corresponde
contratos tipados
preload público congelado con Object.freeze
```

## 20.2 Alta, actualización y nombre único

Proveedor:

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Logo
Marcas
```

Reglas:

```text
Nombre obligatorio
Nombre no puede ser solo espacios
Email opcional válido
Nombre único entre proveedores activos
comparación NOCASE
```

Un proveedor eliminado puede compartir nombre con uno activo.

La unicidad se controla sobre registros activos; no se ha introducido una restricción incompatible con los datos legacy.

## 20.3 Persistencia de proveedor_marca

La relación es N:M:

```text
Proveedor ↔ Marca
```

Una Marca puede pertenecer a varios Proveedores.

Regla crítica ya implementada:

```text
guardar proveedor
→ sincroniza solo relaciones con Marcas activas visibles
→ preserva relaciones existentes con Marcas soft-deleted
```

No se hace:

```text
DELETE total proveedor_marca
```

si eso implicara perder relaciones ocultas históricas.

Existe cobertura específica que prueba:

```text
Marca activa antigua
Marca eliminada ya relacionada
→ cambiar selección visible
→ Marca eliminada continúa físicamente relacionada
```

## 20.4 No reasignar Artículos al cambiar Marcas

El comportamiento legacy queda descartado definitivamente.

```text
cambiar proveedor_marca
→ NO modifica articulo.id_proveedor
```

Motivo:

```text
una Marca puede tener varios Proveedores
un Artículo tiene un Proveedor concreto
```

Por tanto:

```text
proveedor_marca
≠ asignación automática del proveedor del artículo
```

## 20.5 Soft-delete de Proveedor

Baja lógica:

```text
proveedor.deleted_at = timestamp
proveedor.updated_at = timestamp
```

Comerciales:

```text
comerciales activos del proveedor
→ soft-delete con la misma operación
```

Comerciales ya eliminados previamente:

```text
→ conservan su historial
→ no se reescriben innecesariamente
```

NO se modifica:

```text
proveedor_marca
articulo.id_proveedor
logo / archivo persistido
fichero físico
referencias históricas
```

## 20.6 Infraestructura de logo

El logo sigue el patrón moderno ya validado en Marcas.

```text
purpose específico de proveedor
WebP
staging
preview
keep
replace
remove
discard
promote
rollback
```

El renderer:

```text
NO conoce rutas físicas
NO decide rutas de almacenamiento
```

El workspace conserva:

```text
logoStagingId
draft.foto
```

El ciclo temporal se limpia correctamente en:

```text
cancelación
reemplazo
cierre/descarte
fallo antes de persistir
```

## 20.7 Workspace de Proveedor

`ProveedoresService` renderer mantiene:

```text
proveedoresSignal
loadedSignal
workspaceSignal
```

Workspace principal:

```text
proveedorId
proveedorPublicId
draft
baseSnapshot
logoStagingId
activeSection
comercialWorkspace
```

Secciones:

```text
data
brands
commercials
```

Proveedor nuevo:

```text
solo Datos
```

Proveedor persistido:

```text
Datos
Marcas
Comerciales
```

Dirty principal:

```text
Datos + Marcas + Logo
```

El estado se calcula comparando:

```text
draft
vs
baseSnapshot
```

más staging pendiente del logo.

## 20.8 Welcome y buscador

Pantalla inicial:

```text
Buscar
Nuevo
```

Buscador:

```text
→ trabaja exclusivamente sobre el maestro en memoria
→ no consulta SQLite al escribir
→ tarjetas
→ nombre
→ miniatura de logo
→ filtro por nombre
```

Selección:

```text
→ abre ficha persistida
```

Con cambios sin guardar dentro de Proveedores:

```text
otro proveedor
Nueva
Cerrar ficha
→ confirmar descarte cuando corresponda
```

Salir temporalmente de Proveedores hacia otra sección de la aplicación:

```text
→ NO descarta
→ NO confirma por el mero cambio temporal
→ conserva workspace
```

## 20.9 Ficha Datos

Formulario final:

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Logo
```

Validación:

```text
Nombre obligatorio
Email opcional válido
```

Guardar:

```text
CREATE
→ persiste
→ incorpora respuesta canónica al maestro
→ convierte workspace nuevo en persistido

UPDATE
→ persiste Datos + Marcas + Logo
→ sustituye inmediatamente Proveedor canónico
→ actualiza draft/baseSnapshot
→ limpia dirty
```

Cancelar:

```text
→ restaura baseSnapshot
→ restaura Datos + Marcas
→ descarta staging temporal
→ no modifica Comercial activo
```

Eliminar:

```text
→ soft-delete
→ elimina inmediatamente el Proveedor del maestro activo
→ cierra la ficha
```

## 20.10 Pestaña Marcas

Lista basada en el maestro global de Marcas.

Incluye:

```text
buscador en memoria
checkboxes
seleccionadas primero
no seleccionadas después
orden alfabético dentro de cada grupo
```

Datos y Marcas comparten:

```text
draft
baseSnapshot
dirty
Guardar
Cancelar
```

Cambiar checks de Marcas no afecta al dirty independiente de Comercial.

## 20.11 Comerciales backend

Cada Comercial pertenece a un único Proveedor.

Campos:

```text
Nombre *
Teléfono
Email
Observaciones
```

Validación:

```text
Nombre obligatorio
Email opcional válido
```

CRUD independiente:

```text
createComercial(idProveedor, command)
updateComercial(idProveedor, idComercial, command)
deactivateComercial(idProveedor, idComercial)
```

El contexto de Proveedor forma parte de update/delete para reforzar la pertenencia.

Repository:

```text
CREATE
→ exige Proveedor activo

UPDATE
→ exige Comercial activo
→ exige Proveedor activo
→ exige pertenencia exacta Comercial → Proveedor

DELETE lógico
→ mismas garantías de pertenencia
```

No existe restricción de unicidad por nombre de Comercial porque el contrato funcional no la exige.

## 20.12 UI Comerciales

La pestaña Comerciales está disponible únicamente para un Proveedor persistido.

Incluye:

```text
selector de comerciales
Nuevo comercial
Nombre *
Teléfono
Email
Observaciones
Guardar
Cancelar
Eliminar
```

Workspace independiente:

```text
comercialId
comercialPublicId
state = new | existing
draft
baseSnapshot
```

Dirty:

```text
comercialDirty
```

independiente de:

```text
dirty principal de Datos + Marcas + Logo
```

Guardar Comercial:

```text
nuevo
→ createComercial
→ añadir inmediatamente al Proveedor canónico

existente
→ updateComercial
→ sustituir inmediatamente el Comercial del Proveedor canónico
```

Eliminar Comercial:

```text
→ deactivateComercial
→ quitar inmediatamente del Proveedor canónico
→ limpiar workspace del Comercial
```

No es necesario recargar todos los Proveedores tras cada operación.

## 20.13 Confirmaciones y navegación de Comerciales

Con `comercialDirty`:

```text
seleccionar otro Comercial
Nuevo Comercial
cambiar de Proveedor
cerrar ficha
→ confirmación de descarte
```

Cambio temporal de pestaña dentro del proveedor:

```text
Datos ↔ Marcas ↔ Comerciales
→ conserva comercialWorkspace
→ conserva draft
→ conserva dirty
```

Salir temporalmente del apartado Proveedores hacia otra sección de la aplicación:

```text
→ conserva workspace
→ conserva Comercial seleccionado
→ conserva draft
→ conserva dirty
→ sin confirmación por el mero cambio temporal
```

El dirty principal y el dirty comercial se mantienen separados.

## 20.14 Maestro global de Proveedores

Se carga durante startup y vive en un `signal` canónico.

Operaciones:

```text
CREATE
→ añadir inmediatamente

UPDATE / rename
→ sustituir inmediatamente
→ mantener orden canónico

logo
→ sustituir respuesta canónica completa

soft-delete
→ eliminar inmediatamente
```

Comerciales:

```text
CREATE
→ reconciliar dentro del Proveedor canónico

UPDATE
→ sustituir Comercial canónico

DELETE
→ quitar Comercial canónico
```

Consumidores del mismo maestro observan los cambios sin reiniciar la aplicación ni depender de un `getAll()` accidental.

## 20.15 Proveedor eliminado en Artículos

Contrato ya implementado.

UI:

```text
artículo existente con idProveedor de un proveedor soft-deleted
→ "Proveedor eliminado"
→ selected
→ disabled
```

La opción histórica no se incorpora al maestro activo.

Artículo nuevo:

```text
→ solo puede seleccionar Proveedores activos
```

Backend CREATE:

```text
idProveedor != null
→ exige Proveedor activo
```

Backend UPDATE:

```text
idProveedor enviado == id_proveedor persistido
→ puede conservarlo aunque ese Proveedor esté eliminado

idProveedor enviado != id_proveedor persistido
→ si no es null, debe apuntar a Proveedor activo

idProveedor = null
→ permite quitar la relación
```

Por tanto:

```text
Proveedor histórico eliminado 1 → conservar 1        ✅
Proveedor histórico eliminado 1 → cambiar a activo 2 ✅
Proveedor histórico eliminado 1 → cambiar a borrado 3 ❌
Proveedor histórico eliminado 1 → quitar/null        ✅
```

Esta regla es simétrica a la ya cerrada para Marca eliminada.

## 20.16 Alta rápida desde Artículos

Artículos consume el mismo `ProveedoresService` global.

Alta rápida:

```text
crear Proveedor
→ se incorpora al maestro
→ queda inmediatamente disponible/seleccionado
```

No mantener una lista paralela de Proveedores dentro de Artículos.

## 20.17 Pedidos y referencias históricas

La baja de Proveedor no borra ni reescribe referencias históricas.

Regla:

```text
soft-delete Proveedor
→ NO cascada funcional sobre Pedidos históricos
→ NO reasignación
→ NO borrado de proveedor_marca
→ NO modificación de articulo.id_proveedor
```

En la regresión final debe comprobarse que cualquier visualización histórica que dependa del proveedor continúe siendo coherente después de una baja.

## 20.18 Tests relevantes ya incorporados

La implementación previa a `16.14.11` incluye cobertura para, entre otros:

```text
Proveedor
→ create
→ update
→ deactivate
→ nombre único activo NOCASE
→ relaciones proveedor_marca
→ relaciones ocultas con Marca eliminada
→ soft-delete de Comerciales al borrar Proveedor
→ no tocar artículos
→ no tocar archivos

Comerciales
→ create
→ update
→ deactivate
→ validación
→ pertenencia al Proveedor
→ Proveedor eliminado/inexistente
→ Comercial eliminado

Renderer
→ workspace principal
→ dirty principal
→ workspace Comercial
→ dirty Comercial
→ reconciliación canónica
→ navegación y confirmaciones

Artículos
→ conservar Proveedor eliminado
→ rechazar selección nueva de Proveedor eliminado
→ permitir cambio a activo
```

---

# 21. Roadmap de Proveedores — estado real

```text
16.14.1 — Auditoría + contrato backend definitivo ✅
  → schema/modelos/import legacy revisados
  → consumidores revisados
  → contrato UPDATE/soft-delete cerrado
  → duplicados activos NOCASE
  → preservación de proveedor_marca ocultas
  → reglas de dominio cerradas

16.14.2 — CRUD backend completo de Proveedor ✅
  → findById
  → update
  → deactivate
  → datos + proveedor_marca atómico
  → NO tocar artículos
  → soft-delete comerciales al eliminar proveedor
  → preservar proveedor_marca
  → API / IPC / preload
  → tests TypeORM + Application

16.14.3 — Infraestructura de logo ✅
  → purpose proveedor
  → WebP
  → staging
  → keep / replace / remove
  → promoter / discard / rollback
  → integración CREATE/UPDATE
  → tests

16.14.4 — Workspace + pantalla base ✅
  → ProveedorFormModel
  → draft / baseSnapshot
  → dirty computed
  → logoStagingId
  → activeSection
  → estado de Comercial
  → welcome
  → barra contextual
  → Nueva / Buscar / Cerrar
  → persistencia al navegar fuera

16.14.5 — Buscador en memoria ✅
  → modal
  → filtro por nombre
  → tarjetas
  → miniatura logo
  → selección
  → confirmaciones dirty

16.14.6 — Ficha Datos ✅
  → Signal Forms
  → Nombre obligatorio
  → email opcional válido
  → foco Nombre
  → Guardar / Cancelar
  → CREATE / UPDATE
  → logo
  → feedback
  → soft-delete
  → maestro inmediato

16.14.7 — Pestaña Marcas ✅
  → búsqueda en memoria
  → checks
  → seleccionadas primero
  → alfabético
  → mismo dirty que Datos
  → Guardar/Cancelar
  → many-to-many
  → preservar relaciones a Marcas eliminadas
  → tests de relaciones ocultas

16.14.8 — Comerciales backend ✅
  → create
  → update
  → deactivate
  → validación
  → pertenencia al proveedor
  → API / IPC / preload
  → tests

16.14.9 — UI Comerciales ✅
  → selector
  → Nuevo
  → formulario
  → dirty propio
  → Guardar / Cancelar / Eliminar
  → confirmaciones al abandonar/cambiar
  → reconciliación inmediata del Proveedor canónico

16.14.10 — Sincronización global + proveedor eliminado ✅
  → CREATE / rename / logo / delete sin reload
  → maestro global compartido
  → Artículos
  → alta rápida
  → existente conserva eliminado
  → nueva selección exige activo
  → no reasignar Artículos por Marcas
  → tests backend de referencia histórica

16.14.11 — Regresión integral ⬅️ SIGUIENTE
  → welcome
  → búsqueda
  → nueva
  → Datos
  → logo
  → Marcas
  → relaciones ocultas
  → Comerciales
  → dirty principal/comercial
  → confirmaciones
  → navegación/workspace
  → soft-delete
  → maestro global
  → Artículos
  → alta rápida
  → Pedidos/referencias históricas
  → reinicio/persistencia
```

Cierre previsto tras superar la regresión:

```text
16.14 Proveedores ✅
16 Compras ✅
```

---

# 22. Plan recomendado para 16.14.11

La regresión debe hacerse sobre `main` actual.

Primero revisar que no haya diferencias inesperadas entre el código auditado y el último push.

Después ejecutar batería automática:

```bash
npm run build
npm test
npm run build:electron
npm run test:electron
npm run lint
```

Y validar funcionalmente, como mínimo:

## 22.1 Welcome y búsqueda

```text
entrar en Proveedores
→ welcome correcto
→ Buscar
→ Nuevo

Buscar
→ filtro en memoria
→ tarjetas
→ logos
→ abrir proveedor
```

## 22.2 Alta de Proveedor

```text
Nuevo
→ solo Datos
→ Nombre obligatorio
→ email válido
→ logo staging
→ Guardar
→ aparece inmediatamente en maestro/buscador
→ aparecen Marcas y Comerciales después de persistir
```

## 22.3 Edición principal

```text
Datos
→ cambiar textos
→ cambiar logo
→ dirty

Marcas
→ cambiar checks
→ mismo dirty principal

Guardar desde Datos
→ persiste Datos + Marcas

Guardar desde Marcas
→ persiste Datos + Marcas

Cancelar
→ restaura ambos
→ limpia logo temporal
```

## 22.4 Relaciones con Marcas eliminadas

Preparar proveedor relacionado con:

```text
Marca activa A
Marca que posteriormente se elimina B
```

Después:

```text
B no aparece como opción activa
editar selección visible
guardar
→ proveedor_marca de B sigue existiendo
```

Confirmar también:

```text
cambiar proveedor_marca
→ articulo.id_proveedor NO cambia
```

## 22.5 Comerciales

```text
Nuevo comercial
→ Nombre obligatorio
→ email opcional válido
→ guardar
→ aparece inmediatamente

Editar
→ dirty Comercial
→ guardar
→ reconciliación inmediata

Cancelar
→ restaura solo Comercial

Eliminar
→ soft-delete
→ desaparece inmediatamente
```

Confirmar independencia:

```text
dirty principal
≠
dirty Comercial
```

## 22.6 Guardas de navegación

Con dirty principal:

```text
otro proveedor
Nueva
Cerrar
→ confirmar
```

Con dirty Comercial:

```text
otro Comercial
Nuevo Comercial
otro proveedor
Cerrar
→ confirmar
```

Cambio de pestaña:

```text
Datos ↔ Marcas ↔ Comerciales
→ conservar estados
```

Salir temporalmente a otra sección:

```text
→ sin confirmación
→ conservar workspace
→ conservar dirty principal
→ conservar Comercial seleccionado/draft/dirty
```

Volver:

```text
→ mismo estado
```

## 22.7 Baja de Proveedor

Proveedor con:

```text
logo
Marcas
Comerciales activos
Artículo asociado
```

Eliminar:

```text
Proveedor → soft-delete
Comerciales activos → soft-delete
proveedor_marca → conservar
Artículo.id_proveedor → conservar
logo/archivo → conservar
```

El Proveedor debe desaparecer inmediatamente del maestro activo y del buscador.

## 22.8 Artículos

Artículo asociado antes de borrar Proveedor:

```text
→ después de la baja muestra "Proveedor eliminado"
→ opción disabled
```

Editar otro dato y guardar:

```text
→ conserva idProveedor histórico
```

Cambiar a Proveedor activo:

```text
→ permitido
```

Intentar asignar proveedor eliminado:

```text
→ no disponible en UI
→ backend lo rechaza si se fuerza
```

Alta rápida:

```text
→ nuevo Proveedor aparece inmediatamente
→ puede seleccionarse sin reiniciar
```

## 22.9 Reinicio

Tras cerrar y volver a abrir la aplicación:

```text
→ bajas siguen persistidas
→ relaciones históricas siguen intactas
→ proveedores activos correctos
→ comerciales activos correctos
→ proveedor eliminado en artículo sigue reconocible
```

Si todo es correcto:

```text
16.14.11 ✅
16.14 Proveedores ✅ CERRADO
16 Compras ✅ CERRADO
```

---

# 23. Estado resumido para relevo rápido

```text
Osumi TPV Client
Base: v2.66 + main

13 Artículos ✅
14 Clientes ✅
15 Almacén ✅
REF ✅
CTRL ✅

16 Compras 🟦
  Pedidos 16.1–16.12 ✅
  Marcas 16.13 ✅ COMPLETAMENTE CERRADO
  Proveedores 16.14 🟦 CASI CERRADO
    16.14.1 Auditoría + contrato backend ✅
    16.14.2 CRUD backend ✅
    16.14.3 Logo ✅
    16.14.4 Workspace/base ✅
    16.14.5 Buscador ✅
    16.14.6 Datos ✅
    16.14.7 Marcas ✅
    16.14.8 Comerciales backend ✅
    16.14.9 UI Comerciales ✅
    16.14.10 Sync global + eliminado ✅
    16.14.11 Regresión integral ⬅️ SIGUIENTE

Contrato Proveedores implementado:
  welcome + Buscar/Nuevo
  maestro en memoria
  nuevo → solo Datos
  persistido → Datos/Marcas/Comerciales
  Nombre único entre activos NOCASE
  Datos+Marcas comparten dirty
  relaciones ocultas con Marcas eliminadas se conservan
  logo con staging/WebP
  Comerciales CRUD independiente
  Comercial tiene dirty propio
  navegación temporal conserva workspace
  soft-delete proveedor + comerciales activos
  conservar proveedor_marca
  NO modificar artículos al borrar
  artículo puede conservar proveedor eliminado
  nueva selección exige proveedor activo
  UI histórica "Proveedor eliminado" disabled
  NO reasignar artículos al cambiar Marcas
  maestro global se reconcilia sin reload

TicketBAI:
  ordinario ✅
  devoluciones/mixtas ⏸️ Berein

GitHub:
  connector instalado ✅
  revisar main antes de patches ✅
  SOLO LECTURA
  prohibida toda escritura

Flujo:
  ChatGPT analiza/propuesta
  usuario aplica/prueba/commit/push
```

---

# 24. Cómo retomar

En una conversación nueva:

1. usar este documento como contexto principal;
2. usar GitHub connector para revisar `main`;
3. GitHub es **solo lectura**;
4. confirmar:

```text
16.13 Marcas ✅ CERRADO
16.14.1–16.14.10 Proveedores ✅
16.14.11 Regresión integral ⬅️ SIGUIENTE
```

5. NO rediseñar Proveedores: el contrato ya está implementado;
6. comenzar por auditoría rápida de `main` tras el último push;
7. ejecutar/revisar la batería automática;
8. hacer la regresión funcional descrita en la sección 22;
9. si aparece una regresión real, corregirla en un bloque coherente y repetir la parte afectada;
10. si todo es correcto, cerrar `16.14 Proveedores` y `16 Compras`;
11. mantener `DATABASE_SCHEMA_VERSION = 1`;
12. imports internos por alias absoluto;
13. JSDoc en todo método nuevo, también interfaces;
14. interfaz modificada → adaptar fakes/mocks/specs;
15. usuario aplica y prueba;
16. esperar confirmación antes de avanzar;
17. no tocar TicketBAI 12C.9 sin Berein.

---

# 25. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal:
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.66.

Estado:
- Artículos 13 ✅
- Clientes 14 ✅
- Almacén 15 ✅
- REF ✅
- CTRL ✅
- TicketBAI ordinario ✅
- TicketBAI devoluciones/mixtas ⏸️ Berein
- Compras:
  - Pedidos 16.1–16.12 ✅
  - Marcas 16.13 ✅ COMPLETAMENTE CERRADO
  - Proveedores 16.14 🟦 CASI CERRADO

Punto exacto:
16.14.11 — Regresión integral de Proveedores.

IMPLEMENTADO EN PROVEEDORES:
- auditoría + contrato backend;
- CRUD completo de Proveedor;
- logo con staging/WebP;
- workspace persistente;
- welcome Buscar/Nuevo;
- buscador exclusivamente en memoria;
- ficha Datos;
- pestaña Marcas;
- preservación de proveedor_marca con Marcas eliminadas;
- NO reasignar Artículos por proveedor_marca;
- Comerciales backend independientes;
- UI de Comerciales;
- dirty principal independiente de dirty Comercial;
- confirmaciones dentro de Proveedores;
- navegación temporal conserva workspace;
- maestro global reconciliado sin reload;
- soft-delete de Proveedor + Comerciales activos;
- proveedor_marca conservado;
- articulo.id_proveedor conservado;
- Artículos muestra “Proveedor eliminado” disabled;
- artículo existente puede conservar proveedor eliminado;
- cambiar proveedor exige uno activo.

SIGUIENTE:
- revisar main actual;
- ejecutar batería automática;
- realizar la regresión integral descrita en v2.66;
- corregir solo regresiones reales;
- si todo es correcto:
  16.14 Proveedores ✅
  16 Compras ✅

GITHUB:
- repo: osumionline/Osumi-TPV-Client;
- GitHub connector como vía preferente de lectura;
- EXCLUSIVAMENTE SOLO LECTURA;
- prohibidos commits, push, PR, merges, ramas, issues,
  modificar/borrar archivos, re-runs y cualquier mutación;
- ChatGPT analiza y prepara;
- yo aplico, pruebo, commit y push.

REGLAS:
- Angular standalone + signals + zoneless;
- imports internos por alias absoluto;
- un único export → default;
- varios exports → named;
- todo método nuevo con JSDoc, también interfaces;
- interfaz modificada → adaptar fakes/mocks/specs;
- DATABASE_SCHEMA_VERSION = 1;
- yo aplico y ejecuto tests;
- tú no escribes en GitHub;
- esperar confirmación antes de avanzar;
- no tocar TicketBAI 12C.9 sin Berein.
```

---

# 26. Historial reciente

| Versión | Fecha | Cambio principal |
|---|---|---|
| **2.61** | 2026 | Continuidad de ficha Datos de Marcas |
| **2.62** | 2026 | Ficha Datos de Marcas completamente cerrada |
| **2.63** | 15/09/2026 | GitHub connector y política estricta de solo lectura |
| **2.64** | 15/09/2026 | **16.13 Marcas completamente cerrado; siguiente 16.14 Proveedores** |
| **2.65** | 15/09/2026 | **Contrato funcional y roadmap completo de 16.14 Proveedores; siguiente 16.14.1** |
| **2.66** | 16/09/2026 | **16.14.1–16.14.10 Proveedores implementados, probados y subidos; siguiente 16.14.11 Regresión integral** |

---

**Fin del documento de continuidad v2.66.**
