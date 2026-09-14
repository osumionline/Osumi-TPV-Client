# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.59  
**Fecha:** 14 de septiembre de 2026  
**Base de continuidad:** `v2.59 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.58.md`

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

  16.13 Marcas                                    🟦 EN DESARROLLO
    16.13.1 Snapshot histórico Marca en Ventas    ✅ CERRADO
      16.13.1A Schema                             ✅
      16.13.1B Ventas nuevas                      ✅
      16.13.1C Import legacy                      ✅
      16.13.1D Validación real                    ✅

    16.13.2 Backend CRUD/soft-delete              ✅ CERRADO
      16.13.2A Repository                         ✅
      16.13.2B Application Service                ✅
      16.13.2C API / IPC / preload                ✅

    16.13.3 Infraestructura logo                  🟦 EN DESARROLLO
      16.13.3A Persistencia SQLite                ✅
      16.13.3B Staging / promoción / rollback     ✅
      16.13.3C Integración + regresión            ⬅️ SIGUIENTE

    16.13.4 Workspace + pantalla base             ⬜
    16.13.5 Buscador en memoria                   ⬜
    16.13.6 Ficha Datos                           ⬜
    16.13.7 Backend Estadísticas                  ⬜
    16.13.8 UI Estadísticas                       ⬜
    16.13.9 Sincronización maestro global         ⬜
    16.13.10 Regresión integral                   ⬜

  16.14 Proveedores                               ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

El **Hito 15 — Almacén**, la pausa REF, CTRL y **Pedidos 16.1–16.12** siguen cerrados. No reabrirlos salvo regresión real demostrada.

Desde `v2.57` se ha avanzado de forma importante en Marcas:

```text
16.13.1 Snapshot histórico Marca en Ventas        ✅ CERRADO
16.13.2 Backend CRUD/soft-delete de Marcas        ✅ CERRADO
16.13.3A Persistencia SQLite del logo             ✅
16.13.3B Staging/promoción/rollback del logo      ✅
```

El punto exacto de continuación es:

```text
16.13.3C — Integración + regresión de staging brand_image
```

La versión **2.58 sustituye a 2.57** como documento de continuidad. Si `v2.57` todavía no se había subido al repositorio, no es necesario subir ambas.

---
# 2. Punto exacto de continuación

Están cerrados, probados y subidos a `main`:

```text
16.1–16.12 Pedidos
16.13.1 Snapshot histórico de Marca en Ventas
16.13.2 Backend CRUD/soft-delete de Marcas
16.13.3A Persistencia SQLite del logo de Marca
16.13.3B Staging/promoción/rollback del logo de Marca
```

El siguiente mini-hito es:

```text
16.13.3C — Integración + regresión de staging brand_image
```

Objetivo:

```text
revisar la entrada pública existente de imágenes staged
→ confirmar soporte real de purpose = brand_image
→ asegurar que Marcas puede obtener stagingId desde renderer
→ reutilizar infraestructura común, sin endpoint específico innecesario
→ cerrar tests cross-layer necesarios
→ validar create / keep / remove / replace
→ cerrar 16.13.3
```

Antes del primer patch revisar el `main` actual de:

```text
contratos públicos del staging de imágenes
API/IPC/preload del staging
ImageStagingService / implementación concreta
validación de ImageAssetPurpose
uso actual desde Artículos
tests cross-layer del staging
MarcasService y sus specs tras 16.13.3B
```

No empezar todavía `16.13.4` ni construir la UI de la ficha. Primero cerrar por completo la infraestructura de logo.

---
# 3. Repositorios y referencias

## 3.1 Cliente actual

Repositorio:

```text
https://github.com/osumionline/Osumi-TPV-Client
```

Rama de referencia:

```text
main
```

Regla obligatoria antes de proponer cualquier patch:

```text
1. Intentar leer siempre el `main` actual del repositorio.
2. Si funciona:
   → trabajar sobre el código real de `main`.
3. Si falla:
   → informar al usuario del error exacto recibido.
   → distinguir si es:
      - error HTTP/permiso real de GitHub (`404`, `403`, `429`, etc.),
      - o error de la capa de acceso/herramientas (`DisabledError`, timeout, DNS, etc.).
4. Solo después de un fallo real de acceso:
   → pedir exclusivamente los archivos concretos necesarios.
```

El repositorio es **público**. El usuario no necesita cambiar permisos, visibilidad ni configuración para que pueda leerse cuando la capa web de la sesión está operativa.

Importante:

```text
`DisabledError`
→ no implica que GitHub haya rechazado el acceso
→ indica una limitación/fallo de la capa de acceso de la sesión
```

No decir simplemente “GitHub no está accesible” si se dispone de un error más preciso: comunicar el error concreto.

El usuario aplica manualmente todos los cambios.

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

Ante contradicción:

```text
comportamiento legacy
vs.
decisión explícita documentada para el nuevo cliente
```

prevalece la decisión explícita del nuevo cliente.

## 3.3 SDK TicketBAI

```text
https://github.com/osumionline/ticketbaiws
```

No tocar `12C.9` sin nueva información de Berein.

---

# 4. Convenciones de trabajo

## 4.1 Angular / TypeScript

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- Usar APIs modernas como `viewChild()` signal cuando encaje.
- Aplicación zoneless.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Templates con `@if`, `@for`, `@switch`.
- Todo método TS/JS nuevo lleva JSDoc breve.
- **También los métodos declarados en interfaces llevan JSDoc**; esta regla es obligatoria aunque la implementación concreta ya esté documentada.
- Evitar `@HostListener`; preferir `host`.
- Si Angular marca una API como deprecated y existe sustitución moderna estable, usar la moderna.
- No dejar líneas en blanco innecesarias entre propiedades estrechamente relacionadas.
- Separar visualmente métodos y responsabilidades distintas.

## 4.2 Flujo de trabajo

El usuario:

```text
→ aplica manualmente los cambios
→ ejecuta tests/build/lint
→ prueba funcionalmente
→ cuando lo da por bueno, sube el código al repositorio
→ confirma que podemos continuar
```

El asistente:

- revisa `main` antes de cada patch;
- intenta siempre GitHub/main antes de pedir archivos al usuario;
- si GitHub falla, comunica el error exacto y diferencia un fallo HTTP real de un fallo de herramienta/capa de acceso;
- solo pide archivos cuando el acceso a `main` realmente ha fallado;
- si necesita archivos, pide únicamente los concretos necesarios para el bloque activo;
- no modifica código por su cuenta;
- no hace commits;
- no abre PR;
- no ejecuta tests ni la aplicación por cuenta propia;
- no avanza al siguiente mini-hito sin confirmación explícita;
- propone bloques pequeños pero completos;
- si cambia una interfaz, incluye en el mismo bloque fakes/mocks/fixtures/specs afectados;
- entrega tests concretos, no solo casos descritos;
- archivo nuevo: contenido completo;
- archivo existente: fragmento reconocible actual → fragmento nuevo;
- indica todos los imports nuevos exactos;
- JSDoc en todo método nuevo.

## 4.3 Imports

Regla obligatoria:

```text
imports internos del proyecto
→ SIEMPRE alias absoluto
```

Incluso entre archivos de la misma carpeta.

Ejemplo:

```ts
// NO
import type X from './x.interface';

// SÍ
import type X from '@backend/.../x.interface';
```

Imports externos conservan su ruta normal:

```text
@angular/*
typeorm
vitest
node:*
```

## 4.4 Exports

```text
1 export  → default export
>1 export → named exports
```

También en `*.private.ts`.

## 4.5 Baterías habituales

Frontend:

```bash
npm test
npm run build
npm run lint
```

Electron/backend:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Cross-layer:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
npm run lint
```

`npm test` ya incorpora `--watch=false`.


## 4.6 Protocolo de acceso a GitHub

El repositorio de referencia es público y la rama de trabajo para lectura es `main`.

Secuencia obligatoria:

```text
intentar GitHub/main
→ si funciona, revisar código actual
→ si falla, comunicar error exacto
→ clasificar el fallo
→ pedir solo archivos concretos si sigue siendo necesario
```

Ejemplos de clasificación:

```text
404 / 403 / 429
→ respuesta de GitHub / permisos / rate limit

DisabledError
→ fallo o restricción de la capa de acceso de ChatGPT
→ NO implica problema en el repositorio

timeout / DNS
→ fallo transitorio de red o resolución
```

No pedir ZIP por defecto si todavía no se ha intentado leer `main`.

Si la sesión no permite acceso web, los archivos adjuntos por el usuario pasan a ser la fuente de verdad para ese bloque.

---

# 5. SQLite durante desarrollo

Hasta la primera versión estable:

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones.

Si un cambio de schema es incompatible con la SQLite local:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear
→ reimportar .otpv
```

Este criterio se aplicará también a `16.13.1`, ya que se añadirá identidad histórica de Marca a `linea_venta`.

---

# 6. TicketBAI

## 6.1 Ordinario

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Principios:

- SDK `@osumi/ticketbaiws`.
- Producción por defecto.
- Desarrollo manual mediante entorno TEST.
- No añadir selector de entorno a la UI.
- `PENDING` es válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite reenvío directo.
- `error_temporal` se reconcilia antes de actuar.
- `error_permanente` informa sin mutación automática.
- Un fallo posterior al COMMIT no revierte una venta confirmada.

## 6.2 Devoluciones / mixtas

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️ BEREIN
```

No inventar contrato ni reabrir sin nueva información.

## 6.3 Facturas de cliente

```text
Factura de cliente ≠ operación TicketBAI
```

Crear, editar, emitir, imprimir, enviar o anular una factura de cliente no llama por sí mismo a TicketBAI.

---

# 7. Hitos cerrados relevantes

## 7.1 Artículos

```text
13 Artículos ✅ CERRADO
```

Incluye ficha completa, fotos WebP/staging, códigos de barras, histórico, estadísticas, bajas, duplicado e integración con Ventas.

Regla importante para Marcas eliminadas:

```text
artículo existente que ya tiene una marca eliminada
→ puede conservarla

al editar y cambiar de marca
→ la marca eliminada no vuelve a ser seleccionable

artículo nuevo
→ marca eliminada no disponible
```

## 7.2 Clientes

```text
14 Clientes ✅ CERRADO
```

Incluye workspace, búsqueda, formulario, ventas, estadísticas, consumo mensual, facturas, PDFs, impresión/email y anulación.

Clientes es referencia importante para:

```text
draft + baseSnapshot
dirty derivado
workspace que sobrevive navegación
cambio de entidad con confirmación si existe dirty
feedback temporal de guardado
```

## 7.3 Almacén

```text
15 Almacén ✅ CERRADO
```

Inventario, Caducidades e Imprenta cerrados. La prueba física Star de 80 mm sigue siendo no bloqueante.

---

# 8. Históricos de artículo

Contrato estable:

```text
VENTA          = 1
VENTA_SYNC     = 2
PEDIDO         = 3
ARTICULO       = 4
INVENTARIO     = 5
INVENTARIO_ALL = 6
CADUCIDAD      = 7
```

La recepción de Pedido ya usa:

```text
PEDIDO = 3
```

y relaciona cada histórico con `id_pedido`.

No reinterpretar `VENTA_SYNC = 2` hasta desarrollar sincronización.

---

# 9. Hito 16 — Compras

Compras contiene:

```text
Pedidos
Marcas
Proveedores
```

Estado:

```text
Pedidos       ✅ CERRADO
Marcas        🟦 PLAN CERRADO / IMPLEMENTACIÓN PENDIENTE
Proveedores   ⬜ CONTRATO AÚN NO DEFINIDO
```

No diseñar Proveedores hasta cerrar Marcas.

---

# 10. Pedidos — estado final ✅

Pedidos queda cerrado funcionalmente tras `16.12`.

## 10.1 Borrador

Pedido pendiente:

```text
→ editable
→ puede guardarse con líneas en 0
→ Guardar NO modifica artículos canónicos
→ Guardar NO crea históricos
→ Guardar NO crea barcode canónico
```

Proveedor obligatorio para guardar.

## 10.2 Líneas

- unidades nuevas = `0`;
- duplicado no duplica y enfoca Unidades;
- stock actual se relee del artículo canónico mientras está pendiente;
- stock final pendiente = stock actual + unidades;
- PALB/PUC/PVP se mantienen como snapshot editable del Pedido;
- barcode adicional puede quedar pendiente;
- artículo que ya tiene adicional activo no admite uno nuevo desde Compras;
- líneas recepcionadas quedan readonly;
- stock previo/final recepcionado se muestra desde snapshots persistidos.

## 10.3 Economía

Fuente única de línea:

```text
PurchaseOrderLineCalculator
```

Fuente única global:

```text
PurchaseOrderTotalsCalculator
```

Reglas cerradas:

- descuento global aplica proporcionalmente a bases de línea;
- no aplica a Portes;
- no altera PUC almacenado de línea;
- Portes funciona como línea fiscal ficticia;
- IVA 21 % y RE 5,2 % para Portes cuando R.E. activo;
- Total beneficios excluye Portes;
- Media margen legacy incluye Portes en coste;
- UE no elimina internamente IVA/RE;
- UE añade presentación `Total sin IVA`;
- Total factura sigue siendo total con impuestos;
- pedido recepcionado conserva economía congelada.

## 10.4 Dirty / navegación

No autosave.

```text
buildPurchaseOrderDirtyFingerprint()
→ snapshot persistible
→ dirty computed
```

Protección de salida mediante:

```text
PendingChangesAware
pendingChangesGuard
beforeunload
```

PDFs no forman parte del dirty state.

## 10.5 Pedido ↔ Artículos

```text
Pedido persistido + limpio + pendiente
→ +
→ Artículos
→ crear artículo
→ guardar
→ preguntar si volver
→ volver por idPedido + idArticulo exactos
→ getPedidoArticuloById()
→ añadir unidades 0
```

Pedido recepcionado oculta toda la zona de alta/búsqueda de artículos.

## 10.6 PDFs

Disponibles en pendientes y recepcionados.

Características:

- selector nativo;
- un PDF;
- máximo 100 MB;
- validar `%PDF-`;
- SHA-256 streaming;
- almacenamiento `files/orders/<publicId>.pdf`;
- `archivo` + `pedido_archivo`;
- renderer no conoce rutas internas;
- abrir mediante `shell.openPath`;
- ENOENT normalizado;
- borrado con confirmación;
- preservar archivo compartido mientras existan referencias;
- soft-delete lógico y borrado físico solo si queda huérfano.

---

# 11. 16.10 — Recepción atómica ✅ CERRADO

La recepción es **el único punto** donde un Pedido pendiente modifica Artículos canónicos.

## 11.1 Precondiciones

Dentro de backend/transacción:

```text
pedido existente
pedido pendiente
proveedor activo/utilizable
al menos una línea
todas las líneas unidades > 0
id_articulo válido y activo
datos económicos válidos
barcode pendiente válido
barcode pendiente globalmente único
```

La validación de barcode cubre el espacio comercial completo:

```text
codigo_barras activo
+
si es numérico:
→ localizador
→ acceso_directo
```

No basta con comprobar solo `codigo_barras`.

## 11.2 Transacción

Patrón:

```text
runDataSourceTransaction()
→ único QueryRunner
```

Secuencia:

```text
1. releer Pedido
2. comprobar que sigue pendiente
3. validar proveedor
4. releer líneas persistidas
5. validar líneas/unidades
6. releer artículos canónicos
7. capturar stock previo real
8. calcular stock final
9. validar todos los barcodes pendientes
10. actualizar stock canónico
11. actualizar PALB canónico
12. actualizar PUC canónico
13. convertir PVP microeuros → céntimos con microsToCents()
14. actualizar PVP canónico
15. actualizar margen canónico
16. crear barcode adicional si procede
17. crear histórico PEDIDO = 3 por línea
18. enlazar histórico con id_pedido
19. fijar stock_actual_snapshot
20. fijar stock_final_snapshot
21. fijar fecha_recepcionado real
22. marcar recepcionado
23. COMMIT
```

Cualquier error:

```text
→ ROLLBACK integral
```

Existe prueba real de rollback forzando un fallo después de haber mutado la primera línea y comprobando que se revierten:

```text
stock/precios
barcode
histórico
snapshots
pedido
```

## 11.3 Histórico de recepción

Uno por línea:

```text
tipo          = PEDIDO = 3
id_articulo   = artículo
id_pedido     = pedido
stock_previo  = stock canónico releído
diferencia    = unidades recibidas
stock_final   = stock previo + unidades
puc_micros    = PUC línea
pvp_micros    = PVP línea
```

## 11.4 Exposición cross-layer

Cadena cerrada:

```text
ComprasService renderer
→ preload
→ IPC trusted sender
→ PedidosService
→ PedidosRepository
→ TypeOrmPedidosRepository.recepcionarPedido()
```

Contrato público:

```text
recepcionarPedido(idPedido)
```

No transportar snapshot del renderer.

## 11.5 Renderer

Botón `Recepcionar` solo cuando:

```text
pedido persistido
+
pendiente
+
clean
+
líneas persistidas
+
todas unidades > 0
+
no processing
```

Si dirty:

```text
→ no autosave
→ Recepcionar deshabilitado
→ primero Guardar
```

Flujo:

```text
Recepcionar
→ confirmación irreversible
→ receiving = true
→ backend
→ COMMIT
→ loadPage()
→ releer cabecera/líneas canónicas
→ markCurrentStateClean()
→ receiving = false
```

La recarga canónica activa automáticamente el modo histórico/readonly.

---

# 12. 16.11 — Pedido recepcionado ✅ CERRADO

Campos informativos que siguen editables:

```text
Proveedor
Forma de pago
Tipo documental
Número
Fecha pedido
Fecha pago
UE
Columnas visibles
Observaciones
PDFs
```

Datos congelados:

```text
R.E.
líneas
stock snapshots
economía
Portes
descuento global
importe
```

Guardar un pedido recepcionado:

```text
→ puede modificar datos informativos
→ NO modifica líneas
→ NO modifica artículos
→ NO crea barcode
→ NO repite histórico
→ NO repite stock/precios
→ conserva fecha_recepcionado
```

La regresión backend cubre explícitamente esta separación.

---

# 13. 16.12 — Regresión integral de Pedidos ✅ CERRADO

Se ejecutó la batería completa y las pruebas funcionales de:

```text
listados
filtros
paginación/workspace
borradores
líneas
duplicados
orden
barcode pendiente
motor económico
R.E.
UE
dirty/navigation
Pedido ↔ Artículos
PDFs
recepción
snapshots
históricos
pedido recepcionado
edición informativa
no repetición de efectos canónicos
```

Resultado:

```text
✅ tests
✅ builds
✅ lint
✅ pruebas funcionales
✅ cambios subidos
```

## 13.1 Rediseño compacto final de la ficha

Durante la regresión se recuperó el layout compacto del TPV antiguo.

Cabecera de escritorio:

```text
Proveedor | Pago | Tipo | Número | R.E./UE | Fecha pedido | Fecha pago | Columnas
```

Se eliminó Observaciones de la cabecera.

Parte inferior:

```text
PDFs | Observaciones | Totales
```

El cambio fue exclusivamente HTML/SCSS. No modifica lógica.

Responsive:

- escritorio ancho: cabecera en una única fila;
- ancho intermedio: distribución en dos filas;
- <= 1200 px: layout adaptado y footer en columna.

Este diseño queda aprobado.

**Pedidos 16.1–16.12 queda completamente cerrado.**

---

# 14. 16.13 — Marcas: contrato funcional aprobado

Marcas es un subapartado de Compras junto a:

```text
Pedidos
Marcas
Proveedores
```

El listado tradicional del TPV antiguo no se recupera porque el número de marcas hace que deje de ser útil.

## 14.1 Estado de bienvenida

Al entrar sin marca seleccionada:

```text
Marcas                               buscar   nueva
──────────────────────────────────────────────────
          Elige una marca de la lista.
```

Acciones:

```text
buscar marca
crear nueva marca
```

## 14.2 Buscador

Al pulsar Buscar:

```text
→ modal
→ buscador arriba
→ tarjetas de marcas debajo
```

Cada tarjeta:

```text
logo pequeño si existe
nombre
```

La colección de marcas ya está precargada en memoria al inicio de la aplicación.

Regla:

```text
escribir en buscador
→ filtrar maestro en memoria
→ NO IPC
→ NO SQLite
```

Normalizar búsqueda para evitar problemas por:

```text
mayúsculas
minúsculas
acentos
espacios
```

Seleccionar tarjeta:

```text
→ cerrar modal
→ abrir detalle de marca
```

---

# 15. Ficha de Marca

Estados:

```text
sin selección → bienvenida
marca existente → detalle
nueva marca → formulario nuevo
```

Marca persistida tiene dos pestañas:

```text
Datos
Estadísticas
```

Marca nueva:

```text
solo Datos
```

Después del primer Guardar:

```text
→ obtiene identidad persistida
→ continúa en la misma ficha
→ se habilita Estadísticas
```

---

# 16. Datos de Marca

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

**No gestionar proveedores dentro de Marcas.**

La relación Marca ↔ Proveedor se dejará para `16.14 — Proveedores`.

---

# 17. Logo de Marca

No copiar la gestión física legacy `marcas/{id}.webp`.

Usar infraestructura común moderna:

```text
purpose = brand_image
WebP obligatorio
staging
almacenamiento gestionado
files/brands/
archivo metadata
```

Comportamiento:

```text
seleccionar/cambiar logo
→ draft dirty
→ preview

Guardar
→ confirmar/materializar

Cancelar
→ restaurar logo anterior
→ limpiar staging

marca nueva cancelada
→ limpiar staging

quitar logo
→ permitido
```

No exponer rutas físicas al renderer.

---

# 18. Workspace / persistencia de sesión de Marcas

Marcas debe conservar su estado visual durante toda la sesión.

Workspace:

```text
marca activa o estado new
draft
baseSnapshot
pestaña datos/estadisticas
filtros de estadísticas
```

Dirty:

```text
draft vs baseSnapshot
→ computed
```

No usar booleano manual.

Si el usuario se va a:

```text
Ventas
Artículos
Clientes
Almacén
Caja
otro apartado
```

no se muestra confirmación por dirty.

Al volver:

```text
→ misma marca
→ mismo draft
→ mismo dirty
→ misma pestaña
→ mismos filtros estadísticos
```

---

# 19. Cambio de marca con dirty

Sí debe protegerse dentro del propio apartado Marcas.

Si existe dirty y el usuario:

```text
elige otra marca en buscador
o
pulsa Nueva marca
```

mostrar confirmación:

```text
hay cambios sin guardar
→ ¿descartar y continuar?
```

Aceptar:

```text
→ descartar draft actual
→ abrir destino
```

Cancelar:

```text
→ mantener marca/draft actual
```

Referencia conceptual: patrón ya utilizado en Clientes.

---

# 20. Guardar / Cancelar / Eliminar Marca

## 20.1 Guardar

```text
validar nombre
→ persistir
→ actualizar maestro global en memoria directamente
→ actualizar baseSnapshot
→ clean
→ mensaje de éxito temporal junto a acciones
```

No depender de reiniciar ni de un reload accidental para actualizar el maestro.

## 20.2 Cancelar

```text
→ restaurar baseSnapshot
→ restaurar logo
→ limpiar staging
→ clean
```

## 20.3 Eliminar

Solo marca existente:

```text
botón Eliminar visible
→ confirmación
→ soft-delete
```

Marca nueva:

```text
sin botón Eliminar
```

Soft-delete significa exclusivamente:

```text
marca.deleted_at = timestamp
```

No:

```text
NO poner articulo.id_marca = NULL
NO borrar proveedor_marca
NO borrar logo
NO borrar metadata/fichero físico
```

La marca desaparece de maestros activos/buscadores.

---

# 21. Marca eliminada y Artículos

Regla aprobada:

```text
soft-delete de Marca
→ NO altera artículos existentes
```

Artículo que ya tiene la marca:

```text
→ mantiene id_marca
→ sigue pudiéndose vender
→ sigue mostrando esa asignación
```

Al editar ese artículo:

```text
si no cambia la marca
→ puede conservar la eliminada

si cambia a otra marca
→ la eliminada deja de ser seleccionable
```

Artículo nuevo:

```text
→ no puede seleccionar una marca eliminada
```

Este comportamiento debe validarse en `16.13.9`.

---

# 22. Identidad histórica de Marca en Ventas

Decisión aprobada para evitar estadísticas históricas incorrectas.

Problema:

```text
agrupar por linea_venta.marca
→ falla si la marca se renombra

agrupar por articulo.id_marca actual
→ mueve retrospectivamente ventas si el artículo cambia de marca
```

Solución:

```text
linea_venta.id_marca_snapshot
```

Semántica:

```text
id_marca_snapshot
→ identidad de la marca en el momento de vender

marca
→ nombre textual histórico mostrado en la venta
```

Ventas nuevas:

```text
→ capturar id_marca del artículo en el momento de finalizar/persistir
```

Import legacy:

```text
→ resolver la mejor identidad de marca disponible
→ persistir id_marca_snapshot cuando sea posible
```

Estadísticas futuras:

```text
→ agrupar SIEMPRE por id_marca_snapshot
```

No usar para pertenencia histórica:

```text
articulo.id_marca actual
linea_venta.marca textual
```

---

# 23. Estadísticas de Marca — contrato funcional

Pestaña disponible solo para marca persistida.

Filtros:

```text
Mes
Año
Tipo
```

Defaults:

```text
Mes  = mes actual
Año  = año actual
Tipo = importe de ventas
```

Tipo:

```text
Importe de ventas
Unidades
```

## 23.1 Mes concreto + año concreto

Ejemplo:

```text
Septiembre + 2026
```

Gráfica:

```text
eje X = días del mes
eje Y = importe/unidades por día
```

Total inferior:

```text
total del mes seleccionado
```

## 23.2 Mes Todos + año concreto

Ejemplo:

```text
Todos + 2026
```

Gráfica:

```text
eje X = meses
eje Y = importe/unidades por mes
```

Total inferior:

```text
total del año
```

## 23.3 Año Todos

Si:

```text
Año = Todos
```

entonces:

```text
Mes = Todos automáticamente
selector Mes deshabilitado
```

Gráfica:

```text
eje X = años
eje Y = importe/unidades por año
```

Total inferior:

```text
total global
```

No existe combinación funcional:

```text
mes concreto + año Todos
```

---

# 24. Devoluciones en Estadísticas de Marca

Decisión explícita:

```text
IGNORAR devoluciones
```

No utilizar valores netos.

Operación ordinaria:

```text
línea positiva
→ cuenta
```

Devolución:

```text
línea negativa/de devolución
→ no participa
```

Operación mixta:

```text
líneas positivas de venta
→ sí participan

líneas negativas de devolución
→ se ignoran
```

Aplicar la misma regla tanto a:

```text
importe
unidades
```

No restar devoluciones del total de Marca.

---

# 25. Presentación de Estadísticas

Parte superior:

```text
Mes [ ... ]
Año [ ... ]
Tipo [ Importe de ventas | Unidades ]
```

Centro:

```text
gráfica
```

Parte inferior:

```text
Total ventas: 1.234,56 €
```

o:

```text
Total unidades: 842
```

El backend devolverá también el total del conjunto.

Frontend:

```text
NO recalcular total sumando visualmente puntos de la gráfica
```

Sin datos:

```text
→ mensaje de ausencia de ventas
→ total = 0
→ no inventar una gráfica engañosa
```

Los filtros pertenecen al workspace y sobreviven navegación.

---

# 26. Sincronización con maestro global de Marcas

El maestro global precargado es autoridad de selección en renderer durante la sesión.

Operaciones:

```text
crear
→ añadir directamente al maestro

actualizar
→ reconciliar directamente el elemento

soft-delete
→ eliminar de colección activa
```

Debe reflejarse inmediatamente en:

```text
buscador de Marcas
selectores de Artículos
cualquier consumidor del maestro
```

No depender de:

```text
reinicio
reload global accidental
```

---

# 27. Plan y estado de 16.13 — Marcas

## 27.1 16.13.1 — Snapshot histórico Marca en Ventas ✅ CERRADO

### 27.1.1 16.13.1A — Schema ✅

Se añadió a `linea_venta`:

```text
id_marca_snapshot INTEGER NULL
CHECK id > 0 cuando no sea NULL
sin FOREIGN KEY
```

Índice específico:

```text
idx_linea_venta_marca_snapshot
(id_marca_snapshot, id_venta)
WHERE id_marca_snapshot IS NOT NULL
```

Motivo de no usar FK:

```text
es una identidad histórica
→ debe sobrevivir a cambios/bajas posteriores del catálogo
```

Se conserva además:

```text
linea_venta.marca
→ nombre textual histórico
```

### 27.1.2 16.13.1B — Ventas nuevas ✅

No se amplió el payload del renderer con `id_marca_snapshot`.

La autoridad es backend/SQLite:

```text
venta ordinaria
→ resolver artículo canónico
→ articulo.id_marca
→ linea_venta.id_marca_snapshot
```

Para `Varios`:

```text
id_articulo = NULL
id_marca_snapshot = NULL
```

Para devolución:

```text
línea original.id_marca_snapshot
→ línea devolución.id_marca_snapshot
```

No se reinterpreta con la marca actual del artículo.

Para líneas procedentes de Reserva:

```text
linea_reserva.id_articulo
→ artículo SQLite
→ articulo.id_marca
→ snapshot
```

### 27.1.3 16.13.1C — Import legacy ✅

El importador amplió su `ArticleSnapshot` con la identidad canónica de Marca de la SQLite nueva.

Flujo:

```text
linea legacy.id_articulo
→ artículo ya importado
→ articulo.id_marca
→ linea_venta.id_marca_snapshot
```

Reglas:

```text
NO usar id legacy de Marca directamente
NO inferir por nombre textual
artículo recuperable → snapshot de Marca
artículo irrecuperable/línea libre → NULL
```

El nombre textual de Marca sigue congelándose por separado.

### 27.1.4 16.13.1D — Validación real ✅

Se recreó la SQLite y se realizó una importación `.otpv` real.

Validaciones realizadas correctamente:

```text
líneas con artículo recuperable
→ id_marca_snapshot presente

id_marca_snapshot
→ coincide con articulo.id_marca tras importación

líneas sin artículo
→ no inventan snapshot

snapshot textual
→ coherente inmediatamente tras importación
```

También se validó una venta nueva y la invariancia histórica:

```text
venta creada con Marca A
→ cambiar después artículo a Marca B
→ articulo.id_marca cambia
→ linea_venta.id_marca_snapshot NO cambia
→ linea_venta.marca NO cambia
```

Por tanto:

```text
16.13.1 ✅ CERRADO
```

---

## 27.2 16.13.2 — Backend CRUD/soft-delete de Marcas ✅ CERRADO

### 27.2.1 16.13.2A — Repository ✅

Se creó/extendió el contrato canónico:

```text
findAll()
findById(id)
existsActiveByName(nombre, excludeId)
create(command)
update(id, command)
deactivate(id)
```

Todos los métodos de interfaces deben llevar JSDoc.

Nuevo command interno de actualización:

```text
ActualizarMarcaRecordCommand
```

No se añadió `UNIQUE INDEX` al schema para el nombre.

Motivo:

```text
el legacy puede contener duplicados históricos
→ deben preservarse
→ la política de nuevos duplicados vive en Application Service
```

`TypeOrmMarcaRepository` cubre:

```text
listar activas
buscar activa por ID
comprobar nombre activo case-insensitive
crear
actualizar
soft-delete
```

La creación rápida existente:

```text
crearProveedor = true
```

se conserva para Artículos.

Soft-delete aprobado y probado:

```text
marca.deleted_at = timestamp
marca.updated_at = timestamp
```

No modifica:

```text
articulo.id_marca
proveedor_marca
marca.id_archivo
archivo
fichero físico
```

### 27.2.2 16.13.2B — Application Service ✅

`MarcasService` añadió:

```text
getById()
update()
deactivate()
```

y reforzó `create()`.

Normalización/validación:

```text
nombre obligatorio
trim de campos
opcionales vacíos → NULL
email validado
id seguro > 0
nombre activo duplicado → error
```

Política para duplicados legacy:

```text
si una marca ya comparte nombre con otra legacy
y el usuario modifica teléfono/email/etc.
sin cambiar realmente el nombre
→ se permite guardar
```

Solo al cambiar a un nombre diferente se consulta disponibilidad.

Comparación de nombre equivalente:

```text
case-insensitive
```

Se mantiene el alta rápida con `crearProveedor`.

### 27.2.3 16.13.2C — API / IPC / preload ✅

`MarcasApi` expone:

```text
getAll()
getById(id)
create(command)
update(id, command)
deactivate(id)
```

Se añadieron canales:

```text
marcas:get-all
marcas:get-by-id
marcas:create
marcas:update
marcas:deactivate
```

Todos los handlers:

```text
→ assertTrustedSender()
→ MarcasService
```

El preload expone las mismas operaciones bajo:

```text
window.osumiDesktop.marcas
```

No fue necesario modificar la composición para este bloque.

Resultado:

```text
16.13.2 ✅ CERRADO
```

---

## 27.3 16.13.3 — Infraestructura de logo 🟦 EN DESARROLLO

Principio:

```text
NO infraestructura específica legacy
→ reutilizar staging común
→ WebP
→ purpose = brand_image
→ files/brands/
→ archivo metadata
```

### 27.3.1 16.13.3A — Persistencia SQLite ✅

Se creó el tipo interno:

```text
MarcaLogoUpdateRecord
```

Estados explícitos:

```text
keep
remove
replace + nuevoArchivo
```

Esto evita usar `null` con significados ambiguos.

Commands internos:

```text
CrearMarcaRecordCommand
→ nuevoLogo: ArchivoCreateRecord | null

ActualizarMarcaRecordCommand
→ logo: MarcaLogoUpdateRecord
```

`TypeOrmMarcaRepository` ahora conoce `marca.id_archivo`.

Alta:

```text
nuevoLogo != null
→ validar brand_image/WebP/files/brands/
→ insertArchivo()
→ INSERT marca.id_archivo
→ misma transacción
```

Edición:

```text
keep
→ conservar id_archivo

remove
→ id_archivo = NULL

replace
→ insertArchivo()
→ enlazar nuevo id_archivo
```

Validación del archivo preparado:

```text
purpose = brand_image
mimeType = image/webp
relativePath empieza por files/brands/
```

Importante:

```text
remove / replace
→ NO borra ni soft-deletea automáticamente el archivo anterior
```

La limpieza de huérfanos persistidos sigue siendo una responsabilidad separada y segura.

Tests cubren:

```text
crear con logo
keep
remove
replace
rechazar purpose/ruta incorrectos
preservar archivo anterior
```

### 27.3.2 16.13.3B — Staging / promoción / rollback ✅

Contratos públicos ampliados de forma retrocompatible.

Alta:

```text
CrearMarcaCommand.logoStagingId?: string | null
```

Si se omite:

```text
→ creación rápida existente desde Artículos sigue funcionando
→ marca sin logo
```

Edición:

```text
MarcaLogoUpdateCommand =
  keep
  remove
  replace + stagingId
```

`ActualizarMarcaCommand.logo?` es opcional:

```text
omitido → keep
```

`MarcasService` recibe ahora:

```text
ImageAssetPromoter
StagedImageDiscarder
```

La composición inyecta la misma infraestructura compartida que Artículos.

Alta con logo:

```text
validar datos/nombre
→ normalizar stagingId
→ ImageAssetPromoter.prepare(stagingId, 'brand_image')
→ CrearMarcaRecordCommand.nuevoLogo
→ repository.create()
→ COMMIT
→ descartar staging
```

Update replace:

```text
stagingId
→ prepare(..., 'brand_image')
→ MarcaLogoUpdateRecord.replace
→ repository.update()
→ COMMIT
→ descartar staging
```

Update keep/remove:

```text
→ no promocionan imagen nueva
```

Si falla SQLite después de preparar:

```text
→ ImageAssetPromoter.rollback(preparedAsset)
→ no consumir staging
→ propagar error original
```

Si también falla rollback:

```text
→ AggregateError
```

Si falla la limpieza del staging **después del COMMIT**:

```text
→ Promise.allSettled()
→ NO convertir un guardado persistido en error
```

Tests cubren:

```text
create con staging
update keep
update remove
update replace
rollback en create
rollback en update
fallo cleanup post-COMMIT no invalida éxito
stagingId vacío rechazado antes de preparar
```

### 27.3.3 16.13.3C — Integración + regresión ⬅️ SIGUIENTE

Objetivo:

```text
revisar API pública actual de staging de imágenes
confirmar soporte de brand_image de extremo a extremo
evitar crear un endpoint de Marcas si el staging común ya sirve
cerrar contratos/IPC/preload que falten
añadir tests cross-layer necesarios
validar ciclo real create/replace/remove/keep
cerrar 16.13.3
```

Antes del patch revisar:

```text
ImageStagingService
contrato público de selección/staging
ImageAssetPurpose
IPC channels de imágenes
handlers
preload
flujo actual usado por Artículos
tests existentes
```

No empezar todavía el componente visual de Marcas.

---

## 27.4 16.13.4 — Workspace + pantalla base ⬜

Estados:

```text
welcome
existing
new
```

Persistir:

```text
marca
draft
baseSnapshot
tab
filtros estadísticas
```

Dirty:

```text
draft vs baseSnapshot
```

Salir a otro apartado:

```text
→ conservar workspace aunque esté dirty
→ no confirmar
```

---

## 27.5 16.13.5 — Buscador en memoria ⬜

```text
modal
texto
tarjetas
logo + nombre
filtro local
sin IPC mientras se escribe
selección
protección dirty al cambiar de marca
```

---

## 27.6 16.13.6 — Ficha Datos ⬜

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Logo
Guardar
Cancelar
Eliminar solo existente
feedback temporal
dirty derivado
```

Sin gestión de Proveedores.

---

## 27.7 16.13.7 — Backend Estadísticas ⬜

Consulta agregada por:

```text
linea_venta.id_marca_snapshot
```

Modos:

```text
días
meses
años
```

Métricas:

```text
importe
unidades
```

Devoluciones:

```text
IGNORADAS
```

Backend devuelve también el total.

---

## 27.8 16.13.8 — UI Estadísticas ⬜

```text
Mes
Año
Tipo
gráfica
total
sin datos
persistencia de filtros
```

Solo marca persistida.

---

## 27.9 16.13.9 — Sincronización maestro global ⬜

Comprobar:

```text
crear
renombrar
logo
eliminar
selectores
artículo con marca eliminada
```

Y preservar histórico:

```text
renombrar marca
→ ventas antiguas siguen en la misma identidad

cambiar artículo de marca
→ ventas antiguas no se trasladan
```

---

## 27.10 16.13.10 — Regresión integral ⬜

Cubrir:

```text
welcome
búsqueda
logos
nueva
validación
guardar
cancelar
dirty
cambio de marca con dirty
workspace
tabs
filtros estadísticas
cambio/quitar logo
soft-delete
artículos vinculados
maestro global
estadísticas días/meses/años
importe
unidades
devoluciones ignoradas
renombrado histórico
cambio de marca de artículo
```

Cierre:

```text
16.13 Marcas ✅
→ después definir contrato de 16.14 Proveedores
```

---
# 28. Proveedores — aún no diseñar

```text
16.14 Proveedores ⬜
```

Regla:

```text
cerrar Marcas primero
→ después usuario explica comportamiento/objetivo
→ revisar legacy
→ cerrar contrato
→ planificar
→ implementar
```

No inventar todavía el contrato.

---

# 29. Convenciones arquitectónicas vigentes

## 29.1 Compartido vs privado

```text
global y estable
→ constants / utils

compartido dentro de dominio
→ shared/domain

exclusivo de consumidor
→ *.private.ts

estado/comportamiento de instancia
→ clase
```

## 29.2 Backend por feature

Patrón:

```text
FeatureService
→ FeatureRepository
→ TypeOrmFeatureRepository
```

No crear agregados genéricos por comodidad si el dominio ya tiene responsabilidades independientes.

## 29.3 Estado renderer

```text
datos canónicos
→ SQLite/backend

estado visual de sesión
→ workspace Angular

estado efímero
→ componente
```

Marcas seguirá este patrón.

## 29.4 Hotspots

```text
tamaño = señal
tamaño ≠ razón suficiente para extraer
```

Solo extraer cuando exista una responsabilidad con nombre propio.

---

# 30. Controles y apariencia

Apariencia compartida:

```text
src/styles/controls.scss
```

Layout/ancho/posición:

```text
SCSS del componente
```

No crear wrappers Angular triviales para controles nativos.

Fechas:

```text
<input type="date">
YYYY-MM-DD
```

Dinero/decimal/porcentaje que requiera entrada europea:

```text
type="text"
inputmode="decimal"
```

---

# 31. Cómo retomar

En una conversación nueva:

1. usar este documento como contexto principal;
2. intentar revisar `main` actual en:

```text
https://github.com/osumionline/Osumi-TPV-Client
```

3. si GitHub falla:
   - comunicar el **error exacto**;
   - distinguir una respuesta HTTP real (`404`, `403`, `429`, etc.) de un fallo de la capa de acceso (`DisabledError`, timeout, DNS, etc.);
   - no atribuir automáticamente el fallo al repositorio;
   - pedir solo los archivos concretos necesarios para el bloque activo;
4. confirmar:

```text
Hito 13 Artículos ✅
Hito 14 Clientes ✅
Hito 15 Almacén ✅
REF ✅
CTRL ✅
Pedidos 16.1–16.12 ✅ COMPLETAMENTE CERRADO

Marcas:
16.13.1 ✅
16.13.2 ✅
16.13.3A ✅
16.13.3B ✅
16.13.3C ⬅️ SIGUIENTE
```

5. no reimplementar Pedidos;
6. no reabrir 16.13.1/16.13.2 salvo regresión real;
7. continuar exactamente con:

```text
16.13.3C — Integración + regresión de staging brand_image
```

8. antes del patch revisar:

```text
contratos de staging de imágenes
ImageStagingService
ImageAssetPurpose
IPC de imágenes
preload de imágenes
flujo de Artículos que selecciona/stagea imágenes
tests cross-layer asociados
MarcasService y specs actuales
```

9. no crear infraestructura específica de logo si la genérica ya cubre `brand_image`;
10. mantener `keep/remove/replace` como estados explícitos;
11. alta rápida desde Artículos debe seguir siendo compatible sin `logoStagingId`;
12. `ActualizarMarcaCommand.logo` omitido significa `keep`;
13. fallo SQLite tras promoción → rollback físico;
14. fallo cleanup tras COMMIT → no invalidar guardado;
15. `remove/replace` no borran automáticamente el archivo anterior persistido;
16. imports internos siempre por alias absoluto;
17. **todo método nuevo, también en interfaces, lleva JSDoc**;
18. interfaz modificada → adaptar fakes/mocks/specs en el mismo bloque;
19. usuario aplica y prueba; asistente no hace commits ni ejecuta el proyecto;
20. esperar confirmación antes de avanzar;
21. no tocar `12C.9 TicketBAI` sin información de Berein;
22. no diseñar Proveedores hasta cerrar Marcas;
23. no empezar `16.13.4` hasta cerrar completamente `16.13.3`;
24. protocolo GitHub:
    - intentar `main` primero;
    - si falla, explicar el error exacto;
    - ZIP/adjuntos solo como fallback.

---
# 32. Resumen ultracorto

```text
Proyecto: Osumi TPV Client
Continuidad: 14/09/2026
Base: v2.59 + main

Hito 13 Artículos ✅
Hito 14 Clientes ✅
Hito 15 Almacén ✅
REF ✅
CTRL ✅

TicketBAI ordinario ✅
TicketBAI devoluciones/mixtas ⏸️ Berein

Hito 16 Compras 🟦

PEDIDOS:
16.1–16.12 ✅ COMPLETAMENTE CERRADO

MARCAS:
contrato funcional ✅
plan 16.13.1–16.13.10 ✅

16.13.1 Snapshot histórico Marca en Ventas ✅
→ linea_venta.id_marca_snapshot
→ nullable, sin FK
→ índice por snapshot + venta
→ ventas nuevas: articulo.id_marca canónico
→ devoluciones heredan snapshot origen
→ import legacy: artículo importado → articulo.id_marca
→ validación real .otpv correcta
→ cambiar artículo de marca NO cambia snapshots antiguos

16.13.2 Backend CRUD/soft-delete ✅
→ findAll / findById / existsActiveByName
→ create / update / deactivate
→ duplicados nuevos activos prohibidos en service
→ duplicados legacy editables si no cambia realmente nombre
→ get/update/deactivate expuestos por API/IPC/preload
→ soft-delete NO toca artículos/proveedor_marca/logo

16.13.3 Logo 🟦
16.13.3A ✅ SQLite
→ keep / remove / replace
→ ArchivoCreateRecord
→ insertArchivo
→ brand_image + image/webp + files/brands/
→ no borrar archivo anterior automáticamente

16.13.3B ✅ Staging/service
→ create logoStagingId opcional
→ update logo keep/remove/replace
→ ImageAssetPromoter
→ StagedImageDiscarder
→ rollback si falla SQLite
→ cleanup post-COMMIT no invalida éxito

SIGUIENTE:
16.13.3C Integración + regresión staging brand_image

Después:
16.13.4 Workspace + pantalla base
16.13.5 Buscador en memoria
16.13.6 Ficha Datos
16.13.7 Backend Estadísticas
16.13.8 UI Estadísticas
16.13.9 Maestro global
16.13.10 Regresión
16.14 Proveedores

Reglas reforzadas:
→ TODO método nuevo lleva JSDoc
→ también métodos de interfaces
→ intentar siempre GitHub/main antes de pedir archivos
→ si falla, comunicar error exacto
→ DisabledError = capa de acceso, no problema del repo
→ pedir solo archivos concretos como fallback
```

---
# 33. Historial reciente

| Versión | Fecha | Hito |
| --- | --- | --- |
| 2.53 | 11/09/2026 | 16.4 cerrado; 16.5 en desarrollo |
| 2.54 | 12/09/2026 | Líneas/buscador y motor económico avanzados |
| 2.55 | 13/09/2026 | 16.8 Pedido ↔ Artículos cerrado; PDFs en desarrollo |
| 2.56 | 13/09/2026 | 16.8 + 16.9 cerrados; siguiente Recepción atómica |
| 2.57 | 14/09/2026 | 16.10–16.12 cerrados; Pedidos cerrado; contrato y plan de Marcas aprobados |
| 2.58 | 14/09/2026 | 16.13.1 + 16.13.2 cerrados; 16.13.3A/B cerrados; siguiente 16.13.3C |
| **2.59** | **14/09/2026** | **Añadido protocolo explícito de acceso a GitHub/main y fallback por archivos; siguiente 16.13.3C** |

---
# 34. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.59.

Estado:
- Installation/importación ✅
- Startup ✅
- Refactors A–E ✅
- Artículos 13 ✅
- Clientes 14 ✅
- Almacén 15 ✅
- REF ✅
- CTRL ✅
- TicketBAI ordinario ✅
- TicketBAI devoluciones/mixtas ⏸️ Berein
- Compras 🟦
  - Pedidos 16.1–16.12 ✅ COMPLETAMENTE CERRADO
  - Marcas:
    - 16.13.1 Snapshot histórico ✅
    - 16.13.2 Backend CRUD/soft-delete ✅
    - 16.13.3A Persistencia SQLite logo ✅
    - 16.13.3B Staging/promoción/rollback ✅
    - 16.13.3C Integración/regresión ⬅️ SIGUIENTE

Punto exacto:
16.13.3C — Integración + regresión de staging brand_image.

Antes de proponer cambios:
- intenta siempre revisar `main` actual en GitHub;
- si falla, comunica el error exacto;
- distingue error HTTP real frente a fallo de capa de acceso (`DisabledError`, timeout, DNS, etc.);
- solo entonces pide los archivos concretos necesarios;
- revisa contratos públicos de staging;
- revisa ImageStagingService;
- revisa ImageAssetPurpose;
- revisa IPC/preload de imágenes;
- revisa cómo Artículos obtiene stagingId;
- revisa tests cross-layer existentes;
- revisa MarcasService y sus specs actuales.

Decisiones cerradas:
- logo Marca usa infraestructura común;
- purpose = brand_image;
- destino files/brands/;
- WebP;
- create acepta logoStagingId opcional;
- update usa keep/remove/replace;
- logo omitido en update = keep;
- alta rápida desde Artículos sigue funcionando sin logo;
- fallo SQLite tras prepare = rollback;
- fallo cleanup después del COMMIT NO invalida guardado;
- remove/replace NO elimina automáticamente el archivo persistido anterior.

Snapshot histórico:
- linea_venta.id_marca_snapshot ya existe;
- ventas nuevas lo resuelven en backend;
- devoluciones heredan el snapshot original;
- import legacy lo rellena desde articulo.id_marca de la SQLite nueva;
- validación real .otpv pasada correctamente.

Soft-delete Marca:
- solo deleted_at/updated_at;
- NO tocar articulo.id_marca;
- NO tocar proveedor_marca;
- NO borrar logo/archivo.

Regla de código:
- TODO método nuevo lleva JSDoc;
- también los métodos declarados en interfaces.

Regla de acceso a código:
- repositorio público: https://github.com/osumionline/Osumi-TPV-Client
- rama de referencia: main
- intentar GitHub/main antes de pedir archivos
- si falla, decir el error exacto
- `DisabledError` es de la capa de acceso, no del repositorio
- pedir ZIP/adjuntos solo como fallback y solo de los archivos necesarios

No empieces 16.13.4 hasta cerrar 16.13.3C.

Flujo de trabajo:
- tú propones cambios archivo por archivo;
- yo los aplico manualmente;
- yo ejecuto tests/build/lint y pruebas;
- cuando lo doy por bueno y lo subo, avanzamos;
- tú no haces commits ni modificas el repo por tu cuenta.
```

---

**Fin del documento de continuidad v2.59.**
