# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.65  
**Fecha:** 15 de septiembre de 2026  
**Base de continuidad:** `v2.65 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.64.md`

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

  16.14 Proveedores                               🟦 PLAN CERRADO
    16.14.1 Auditoría + contrato backend           ⬅️ SIGUIENTE
    16.14.2 CRUD backend completo                  ⬜
    16.14.3 Infraestructura logo                   ⬜
    16.14.4 Workspace + pantalla base              ⬜
    16.14.5 Buscador en memoria                    ⬜
    16.14.6 Ficha Datos                            ⬜
    16.14.7 Pestaña Marcas                         ⬜
    16.14.8 Comerciales backend                    ⬜
    16.14.9 UI Comerciales                         ⬜
    16.14.10 Sincronización global                 ⬜
    16.14.11 Regresión integral                    ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

`16.13 — Marcas` queda completamente cerrado, probado funcionalmente y subido a `main`.

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

No reabrir hitos cerrados salvo regresión real demostrada.

---

# 2. Punto exacto de continuación

El contrato funcional de:

```text
16.14 — Proveedores
```

queda **cerrado**.

El siguiente mini-hito exacto es:

```text
16.14.1 — Auditoría + contrato backend definitivo
```

Antes de proponer el primer patch de Proveedores:

```text
1. revisar main actual;
2. revisar contratos frontend/Electron ya existentes;
3. revisar schema SQLite actual;
4. revisar ProveedoresService renderer;
5. revisar ProveedoresService backend;
6. revisar TypeOrmProveedorRepository;
7. revisar importación legacy;
8. revisar consumidores de proveedor:
   - Artículos
   - Pedidos
   - alta rápida
   - cualquier selector global;
9. comprobar qué piezas existentes pueden conservarse;
10. cerrar el contrato técnico de UPDATE / soft-delete / relaciones ocultas.
```

No empezar directamente por UI.

Estado ya confirmado en `main`:

```text
ProveedorInterface
→ datos
→ foto
→ ids de marcas
→ comerciales

ApplicationStartupService
→ carga proveedores en memoria al arrancar

ProveedoresService renderer
→ maestro global signal
→ load / reload / create / findById / findByPublicId

ProveedoresService backend
→ getAll
→ create

TypeOrmProveedorRepository
→ findAll
→ create
→ proveedor_marca
→ comerciales

schema
→ proveedor
→ comercial
→ proveedor_marca
```

La arquitectura nueva debe ampliar esta base, no duplicarla.

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

El usuario ha instalado y conectado el complemento oficial de **GitHub** en su cuenta de ChatGPT.

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

---

# 6. Stack actual de referencia

Según `main` al cierre de Marcas:

```text
Angular core/material/cdk            22.1.6
@angular/build                       ^22.1.8
@angular/cli                         ^22.1.8
TypeScript                           ~6.0.2
Electron                             ^44.3.0
TypeORM                              ^1.1.1
better-sqlite3                       ^12.11.1
@osumi/ticketbaiws                   ^1.0.1
npm                                  12.0.2
ECharts                              ^6.1.0
ngx-echarts                          ^22.0.0
```

Batería cross-layer habitual:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
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

Existe test que verifica CREATE → UPDATE/rename → DELETE con `0` recargas de `getAll()`.

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

# 20. Proveedores — contrato funcional y roadmap

```text
16.14 Proveedores 🟦 PLAN CERRADO
16.14.1 Auditoría + contrato backend definitivo ⬅️ SIGUIENTE
```

## 20.1 Pantalla inicial

Al entrar en Proveedores:

```text
welcome
→ Buscar
→ Nuevo
```

Mismo patrón conceptual que Marcas.

El maestro de proveedores:

```text
→ se carga en memoria durante startup
→ el buscador NO consulta SQLite mientras se escribe
```

El modal de búsqueda:

```text
→ tarjetas
→ nombre
→ miniatura de logo cuando exista
→ filtro en memoria
→ selección abre la ficha
```

## 20.2 Proveedor nuevo

Mientras no esté persistido:

```text
solo pestaña DATOS
```

Tras el primer guardado:

```text
DATOS | MARCAS | COMERCIALES
```

No crear comerciales para un proveedor sin ID persistido.

## 20.3 Datos

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

Único obligatorio:

```text
Nombre
```

Validación:

```text
Nombre no vacío ni solo espacios
Email opcional con formato válido
```

Nombre de proveedor:

```text
→ único entre proveedores activos
→ comparación case-insensitive / NOCASE
```

No introducir una restricción física que pueda romper datos legacy si no es necesario; seguir el enfoque de Marcas:

```text
validación Application + Repository
```

## 20.4 Datos + Marcas comparten edición

Datos y Marcas forman parte del mismo workspace editable:

```text
draft único
baseSnapshot único
dirty computed único
```

Cambiar:

```text
datos
logo
checks de marcas
```

ensucia el mismo proveedor.

Guardar:

```text
→ persiste Datos + Marcas
```

Cancelar:

```text
→ restaura Datos + Marcas
→ limpia staging pendiente
→ clean
```

Los botones:

```text
Guardar
Cancelar
```

deben estar disponibles tanto en Datos como en Marcas.

## 20.5 Pestaña Marcas

Parte superior:

```text
buscador de marcas en memoria
```

Lista:

```text
checkbox por Marca
```

Orden:

```text
1. seleccionadas primero
2. no seleccionadas después
3. dentro de cada grupo → alfabético
```

Una Marca puede estar asociada a varios proveedores.

No aplicar la lógica legacy que reasignaba automáticamente Artículos al cambiar las Marcas de un proveedor.

Regla definitiva:

```text
cambiar proveedor_marca
→ NO modifica articulo.id_proveedor
```

## 20.6 Marcas eliminadas relacionadas

Si un proveedor ya tenía relacionada una Marca que después fue soft-deleted:

```text
→ no mostrarla como opción activa
→ no permitir seleccionarla de nuevo
→ conservar proveedor_marca existente
```

Guardar el proveedor NO debe eliminar relaciones ocultas con Marcas eliminadas.

Por tanto, el backend no puede hacer:

```text
DELETE todas proveedor_marca
→ INSERT solo IDs visibles del renderer
```

sin preservar previamente las relaciones ocultas.

Debe existir test específico para esta regla.

## 20.7 Logo de Proveedor

Misma arquitectura moderna que Marcas:

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

Renderer:

```text
NO conoce rutas físicas
NO decide rutas de destino
```

El ciclo de staging debe conservar las mismas garantías ya probadas en Marcas.

## 20.8 Comerciales

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

UI:

```text
selector de comerciales
botón Nuevo comercial
formulario inferior
Guardar
Cancelar
Eliminar
```

Comerciales tienen CRUD independiente del Guardar principal del proveedor.

Cada comercial mantiene su propio:

```text
draft
baseSnapshot
dirty
```

Con comercial dirty:

```text
seleccionar otro comercial
Nuevo comercial
cambiar de proveedor
cerrar ficha
→ confirmar descarte
```

Cambiar temporalmente de pestaña o salir a otra sección de la aplicación:

```text
→ NO descartar
→ conservar comercial seleccionado
→ conservar draft
→ conservar dirty
```

## 20.9 Workspace de Proveedor

Debe conservar como mínimo:

```text
proveedorId
proveedorPublicId
draft
baseSnapshot
logoStagingId
activeSection
```

Y para Comerciales:

```text
comercialId / publicId
comercialDraft
comercialBaseSnapshot
estado nuevo/existente
```

Dirty principal:

```text
Datos + Marcas + Logo
```

Dirty de Comercial:

```text
independiente
```

Salir del apartado Proveedores hacia otra sección de la app:

```text
→ sin confirmación
→ conservar workspace
```

Dentro de Proveedores:

```text
otro proveedor / Nuevo / Cerrar
→ confirmar si hay dirty principal o comercial
```

## 20.10 Soft-delete de Proveedor

Proveedor:

```text
deleted_at = timestamp
updated_at = timestamp
```

Comerciales activos del proveedor:

```text
→ soft-delete
```

Relaciones:

```text
proveedor_marca
→ conservar
```

Artículos:

```text
articulo.id_proveedor
→ NO modificar
```

Logo / archivo persistido:

```text
→ NO borrar
```

Pedidos históricos:

```text
→ conservar referencia al proveedor
```

## 20.11 Proveedor eliminado en Artículos

Contrato equivalente a Marca eliminada:

```text
artículo existente que ya usa proveedor eliminado
→ puede conservarlo

guardar otros cambios sin cambiar proveedor
→ permitido

cambiar a otro proveedor activo
→ permitido

después de cambiar
→ el eliminado ya no es seleccionable

artículo nuevo
→ proveedor eliminado no disponible
```

UI:

```text
Proveedor eliminado
→ opción histórica seleccionada
→ disabled
```

No convertir al proveedor eliminado otra vez en opción activa.

## 20.12 Maestro global de Proveedores

Se carga durante startup.

Operaciones futuras:

```text
CREATE
→ añadir inmediatamente

UPDATE / rename
→ reconciliar inmediatamente
→ reordenar

logo
→ sustituir canónica

soft-delete
→ eliminar del maestro activo
```

No depender de:

```text
reinicio
reload global accidental
```

Consumidores a revisar en regresión:

```text
buscador de Proveedores
Artículos
alta rápida
Pedidos
otros selectores
```

## 20.13 Legacy expresamente descartado

El backend antiguo hacía:

```text
cambiar marcas del proveedor
→ poner id_proveedor en artículos de esas marcas
```

Eso queda DESCARTADO.

Motivo funcional:

```text
una Marca puede tener varios proveedores
un Artículo tiene un proveedor concreto
```

Por tanto:

```text
proveedor_marca
≠ asignación automática de proveedor a artículos
```

## 20.14 Roadmap 16.14

```text
16.14.1 — Auditoría + contrato backend definitivo
  → revisar schema/modelos/import legacy actuales
  → revisar consumidores
  → completar contratos técnicos
  → definir UPDATE + soft-delete
  → duplicados activos NOCASE
  → preservar proveedor_marca ocultas
  → tests de reglas de dominio

16.14.2 — CRUD backend completo de Proveedor
  → findById
  → update
  → deactivate
  → datos + proveedor_marca atómico
  → NO tocar artículos
  → soft-delete comerciales al eliminar proveedor
  → preservar proveedor_marca
  → API / IPC / preload
  → tests TypeORM + Application

16.14.3 — Infraestructura de logo
  → purpose proveedor
  → WebP
  → staging
  → keep / replace / remove
  → promoter / discard / rollback
  → integración CREATE/UPDATE
  → tests

16.14.4 — Workspace + pantalla base
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

16.14.5 — Buscador en memoria
  → modal
  → filtro por nombre
  → tarjetas
  → miniatura logo
  → selección
  → confirmaciones dirty

16.14.6 — Ficha Datos
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

16.14.7 — Pestaña Marcas
  → búsqueda en memoria
  → checks
  → seleccionadas primero
  → alfabético
  → mismo dirty que Datos
  → Guardar/Cancelar
  → many-to-many
  → preservar relaciones a Marcas eliminadas
  → tests de relaciones ocultas

16.14.8 — Comerciales backend
  → create
  → update
  → deactivate
  → validación
  → pertenencia al proveedor
  → API / IPC / preload
  → tests

16.14.9 — UI Comerciales
  → selector
  → Nuevo
  → formulario
  → dirty propio
  → Guardar / Cancelar / Eliminar
  → confirmaciones al abandonar/cambiar
  → reconciliación inmediata del Proveedor canónico

16.14.10 — Sincronización global + proveedor eliminado
  → CREATE / rename / logo / delete sin reload
  → buscador
  → Artículos
  → alta rápida
  → Pedidos
  → otros consumidores
  → existente conserva eliminado
  → nueva selección exige activo
  → no reasignar Artículos por Marcas

16.14.11 — Regresión integral
  → welcome
  → búsqueda
  → nueva
  → Datos
  → logo
  → Marcas
  → relaciones ocultas
  → Comerciales
  → dirty principal/comercial
  → navegación/workspace
  → soft-delete
  → maestro global
  → Artículos
  → Pedidos
  → reinicio/persistencia
```

Cierre previsto:

```text
16.14 Proveedores ✅
```

---

# 21. Estado resumido para relevo rápido

```text
Osumi TPV Client
Base: v2.65 + main

13 Artículos ✅
14 Clientes ✅
15 Almacén ✅
REF ✅
CTRL ✅

16 Compras
  Pedidos 16.1–16.12 ✅
  Marcas 16.13 ✅ COMPLETAMENTE CERRADO
  Proveedores 16.14 🟦 PLAN CERRADO
    16.14.1 Auditoría + contrato backend ⬅️ SIGUIENTE
    16.14.2 CRUD backend ⬜
    16.14.3 Logo ⬜
    16.14.4 Workspace/base ⬜
    16.14.5 Buscador ⬜
    16.14.6 Datos ⬜
    16.14.7 Marcas ⬜
    16.14.8 Comerciales backend ⬜
    16.14.9 UI Comerciales ⬜
    16.14.10 Sync global ⬜
    16.14.11 Regresión ⬜

Contrato Proveedores:
  welcome + Buscar/Nuevo
  maestro en memoria
  nuevo → solo Datos
  persistido → Datos/Marcas/Comerciales
  Nombre único y único obligatorio
  Datos+Marcas comparten dirty
  Marcas seleccionadas primero
  preservar relaciones con Marcas eliminadas
  logo = patrón Marcas
  Comerciales CRUD independiente
  soft-delete proveedor + comerciales
  conservar proveedor_marca
  NO modificar artículos al borrar
  artículo puede conservar proveedor eliminado
  NO reasignar artículos al cambiar Marcas

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

# 22. Cómo retomar

En una conversación nueva:

1. usar este documento como contexto principal;
2. usar GitHub connector para revisar `main`;
3. GitHub es **solo lectura**;
4. confirmar:

```text
16.13 Marcas ✅ CERRADO
16.14 Proveedores 🟦 PLAN CERRADO
16.14.1 Auditoría + contrato backend definitivo ⬅️ SIGUIENTE
```

5. revisar antes del primer patch:
   - schema de `proveedor`, `comercial`, `proveedor_marca`;
   - `ProveedorInterface`;
   - `CrearProveedorCommand`;
   - `ProveedoresService` renderer;
   - `ProveedoresService` backend;
   - `ProveedorRepository`;
   - `TypeOrmProveedorRepository`;
   - API / IPC / preload;
   - import legacy;
   - consumidores en Artículos y Pedidos;
6. no rediseñar el contrato funcional: ya está cerrado;
7. preservar relaciones `proveedor_marca` ocultas con Marcas eliminadas;
8. NO reasignar Artículos automáticamente por asociación de Marcas;
9. imports internos por alias absoluto;
10. JSDoc en todo método nuevo, también interfaces;
11. interfaz modificada → adaptar fakes/mocks/specs;
12. usuario aplica y prueba;
13. esperar confirmación antes de avanzar;
14. no tocar TicketBAI 12C.9 sin Berein.

---

# 23. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal:
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.65.

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
  - Proveedores 16.14 🟦 PLAN CERRADO

Punto exacto:
16.14.1 — Auditoría + contrato backend definitivo.

CONTRATO PROVEEDORES YA CERRADO:
- welcome con Buscar/Nuevo;
- proveedores cargados en memoria al startup;
- buscador solo en memoria, con tarjetas y miniatura;
- proveedor nuevo → solo Datos;
- persistido → Datos / Marcas / Comerciales;
- Datos: Nombre, Teléfono, Email, Dirección, Web, Observaciones, Logo;
- solo Nombre obligatorio;
- nombre único entre activos, NOCASE;
- Datos + Marcas comparten draft/baseSnapshot/dirty;
- Guardar/Cancelar disponibles en Datos y Marcas;
- Marcas: búsqueda en memoria, checks, seleccionadas primero;
- una Marca puede pertenecer a varios Proveedores;
- relaciones existentes con Marcas eliminadas se conservan;
- guardar NO debe borrar relaciones ocultas;
- cambiar proveedor_marca NO modifica articulo.id_proveedor;
- logo con mismo patrón de staging/WebP que Marcas;
- Comerciales: Nombre*, Teléfono, Email, Observaciones;
- CRUD Comercial independiente y dirty propio;
- abandonar comercial dirty dentro de Proveedores → confirmar;
- salir temporalmente de la sección → conservar workspace;
- borrar Proveedor → soft-delete Proveedor + Comerciales;
- proveedor_marca se conserva;
- artículos NO se modifican;
- artículo existente puede conservar Proveedor eliminado;
- nueva selección exige Proveedor activo;
- UI histórica: “Proveedor eliminado” disabled;
- maestro global debe actualizarse sin reload.

ROADMAP:
16.14.1 Auditoría/backend contract ⬅️
16.14.2 CRUD backend
16.14.3 Logo
16.14.4 Workspace/base
16.14.5 Buscador
16.14.6 Datos
16.14.7 Marcas
16.14.8 Comerciales backend
16.14.9 UI Comerciales
16.14.10 Sync global/proveedor eliminado
16.14.11 Regresión integral

ANTES DEL PATCH DE 16.14.1:
- revisa main actual;
- revisa schema/modelos/contratos;
- revisa renderer/backend/repository;
- revisa import legacy;
- revisa Artículos/Pedidos/alta rápida;
- identifica piezas ya existentes;
- cierra la forma técnica de preservar relaciones ocultas.

GITHUB:
- plugin instalado y verificado;
- repo: osumionline/Osumi-TPV-Client;
- usar como vía preferente de lectura;
- EXCLUSIVAMENTE SOLO LECTURA;
- prohibidos commits, push, PR, merges, ramas, issues,
  modificar/borrar archivos, re-runs y cualquier mutación;
- ChatGPT analiza y prepara;
- yo aplico, pruebo, commit y push.

REGLAS:
- imports internos por alias absoluto;
- todo método nuevo con JSDoc, también interfaces;
- interfaz modificada → adaptar fakes/mocks/specs;
- yo aplico y ejecuto tests;
- tú no escribes en GitHub;
- esperar confirmación antes de avanzar;
- no tocar TicketBAI 12C.9 sin Berein.
```

---

# 24. Historial reciente

| Versión | Fecha | Cambio principal |
|---|---|---|
| **2.61** | 2026 | Continuidad de ficha Datos de Marcas |
| **2.62** | 2026 | Ficha Datos de Marcas completamente cerrada |
| **2.63** | 15/09/2026 | GitHub connector y política estricta de solo lectura |
| **2.64** | 15/09/2026 | **16.13 Marcas completamente cerrado; siguiente 16.14 Proveedores** |
| **2.65** | 15/09/2026 | **Contrato funcional y roadmap completo de 16.14 Proveedores; siguiente 16.14.1** |

---

**Fin del documento de continuidad v2.65.**
