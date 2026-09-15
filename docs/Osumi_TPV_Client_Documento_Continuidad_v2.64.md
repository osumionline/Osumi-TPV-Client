# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.64  
**Fecha:** 15 de septiembre de 2026  
**Base de continuidad:** `v2.64 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.63.md`

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

  16.14 Proveedores                               ⬅️ SIGUIENTE

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

`16.13 — Marcas` queda completamente cerrado, probado funcionalmente y subido a `main`.

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

No reabrir hitos cerrados salvo regresión real demostrada.

---

# 2. Punto exacto de continuación

El siguiente apartado es:

```text
16.14 — Proveedores
```

Todavía **NO existe un contrato funcional definitivo** para la nueva pantalla completa de Proveedores.

Secuencia obligatoria antes de implementar:

```text
1. El usuario explica el comportamiento y objetivo deseado para Proveedores.
2. Revisar `main` actual.
3. Revisar el TPV antiguo como referencia funcional.
4. Revisar el backend antiguo si hace falta.
5. Separar comportamiento legacy de decisiones nuevas.
6. Cerrar el contrato funcional.
7. Definir roadmap interno de 16.14.
8. Solo después empezar a implementar.
```

No inventar campos, tabs, búsquedas, estadísticas, relaciones, bajas ni flujos antes de cerrar ese contrato con el usuario.

La creación rápida de Proveedor existente en Artículos se conserva mientras no se decida expresamente otra cosa.

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

# 20. Proveedores — siguiente hito

```text
16.14 Proveedores ⬅️ SIGUIENTE
```

Todavía no diseñar por adelantado.

Secuencia:

```text
usuario explica objetivo y comportamiento deseado
→ revisar main
→ revisar TPV legacy
→ revisar TPV-API legacy si hace falta
→ identificar qué conservar/mejorar
→ cerrar contrato funcional
→ dividir 16.14 en mini-hitos
→ implementar
```

Puntos a revisar después de escuchar al usuario:

```text
modelo actual de Proveedor
backend CRUD actual
relación proveedor_marca
relación Artículo ↔ Proveedor
alta rápida desde Artículos
uso en Pedidos/Compras
importación .otpv
soft-delete actual
consumidores del maestro
```

No asumir que Proveedores debe copiar Marcas.

---

# 21. Estado resumido para relevo rápido

```text
Osumi TPV Client
Base: v2.64 + main

13 Artículos ✅
14 Clientes ✅
15 Almacén ✅
REF ✅
CTRL ✅

16 Compras
  Pedidos 16.1–16.12 ✅
  Marcas 16.13 ✅ COMPLETAMENTE CERRADO
  Proveedores 16.14 ⬅️ SIGUIENTE

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

1. Usar este documento como contexto principal.
2. Usar GitHub connector para revisar `main`.
3. GitHub es **solo lectura**.
4. Confirmar:

```text
16.13 Marcas ✅ CERRADO
16.14 Proveedores ⬅️ SIGUIENTE
```

5. Antes de implementar Proveedores, escuchar primero al usuario.
6. Después revisar legacy + main.
7. Cerrar contrato y roadmap.
8. Imports internos por alias absoluto.
9. JSDoc en todo método nuevo, también interfaces.
10. Interfaz modificada → adaptar fakes/mocks/specs.
11. Usuario aplica y prueba.
12. Esperar confirmación antes de avanzar.
13. No tocar TicketBAI 12C.9 sin Berein.

---

# 23. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal:
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.64.

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
  - Proveedores 16.14 ⬅️ SIGUIENTE

Punto exacto:
16.14 — Proveedores.

IMPORTANTE:
Todavía no existe un contrato funcional definitivo para la pantalla completa
de Proveedores.

Antes de implementar:
1. déjame explicar el comportamiento y objetivo que quiero;
2. revisa main actual;
3. revisa el TPV antiguo y TPV-API cuando sea útil;
4. distingue legacy de decisiones nuevas;
5. propón un contrato funcional;
6. cerramos roadmap de 16.14;
7. solo después implementamos.

GITHUB:
- plugin instalado y verificado;
- repo: osumionline/Osumi-TPV-Client;
- usar como vía preferente de lectura;
- EXCLUSIVAMENTE SOLO LECTURA;
- prohibidos commits, push, PR, merges, ramas, issues,
  modificar/borrar archivos, re-runs y cualquier mutación;
- ChatGPT analiza y prepara;
- yo aplico, pruebo, commit y push.

MARCAS:
- snapshot histórico por linea_venta.id_marca_snapshot;
- CRUD/soft-delete;
- logo WebP/staging;
- workspace persistente;
- dirty computed;
- búsqueda en memoria;
- Datos y Estadísticas;
- amount/units por días/meses/años;
- devoluciones puras y líneas negativas ignoradas;
- maestro global sin reload;
- artículo existente puede conservar Marca eliminada;
- nueva selección exige Marca activa;
- regresión integral completa.

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

---

**Fin del documento de continuidad v2.64.**
