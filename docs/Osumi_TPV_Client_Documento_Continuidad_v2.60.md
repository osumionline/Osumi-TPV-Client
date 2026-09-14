# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.60  
**Fecha:** 14 de septiembre de 2026  
**Base de continuidad:** `v2.60 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.59.md`

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
    16.13.2 Backend CRUD/soft-delete              ✅ CERRADO
    16.13.3 Infraestructura logo                  ✅ CERRADO
      16.13.3A Persistencia SQLite                ✅
      16.13.3B Staging / promoción / rollback     ✅
      16.13.3C Integración pública brand_image    ✅

    16.13.4 Workspace + pantalla base             🟦 EN DESARROLLO
      16.13.4A Workspace                          ✅
      16.13.4B Pantalla base inicial              ✅
      16.13.4C Barra contextual Compras            ⬅️ SIGUIENTE

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

El **Hito 15 — Almacén**, REF, CTRL y **Pedidos 16.1–16.12** siguen cerrados. No reabrirlos salvo regresión real demostrada.

Desde `v2.59` se ha avanzado en Marcas:

```text
16.13.3C Integración pública brand_image          ✅ CERRADO
16.13.4A Workspace                                ✅ CERRADO
16.13.4B Pantalla base inicial                    ✅ CERRADO
```

Además, el usuario ha realizado una reorganización amplia del frontend:

```text
/src/app/services
→ servicios reorganizados en subcarpetas por dominio/responsabilidad
→ imports internos actualizados
→ tests pasan
→ aplicación arranca correctamente
```

Este cambio está confirmado funcionalmente por el usuario y ya está subido a `main`.

En esta sesión concreta no se ha podido inspeccionar el commit desde GitHub porque la capa web devuelve:

```text
DisabledError
```

Esto NO implica un problema de permisos ni visibilidad del repositorio.

El siguiente mini-hito exacto es:

```text
16.13.4C — Barra contextual integrada de Compras
```

---
# 2. Punto exacto de continuación

Están cerrados, probados y subidos a `main`:

```text
16.1–16.12 Pedidos
16.13.1 Snapshot histórico Marca en Ventas
16.13.2 Backend CRUD/soft-delete de Marcas
16.13.3 Infraestructura de logo completa
16.13.4A Workspace de Compras/Marcas
16.13.4B Pantalla base inicial de Marcas
```

También está subido y validado por el usuario:

```text
reorganización de /src/app/services
→ servicios agrupados en subcarpetas
→ imports corregidos
→ tests verdes
→ aplicación arranca
```

El siguiente mini-hito es:

```text
16.13.4C — Barra contextual integrada de Compras
```

Objetivo visual/arquitectónico:

```text
eliminar la cabecera redundante propia de Marcas

barra de pestañas Compras:
PEDIDOS | MARCAS | PROVEEDORES                 zona contextual derecha
```

Comportamiento aprobado:

```text
PEDIDOS
→ pestaña Pedidos activa
→ zona derecha vacía

MARCAS sin ficha
→ pestaña Marcas activa
→ derecha: Buscar + Nueva

MARCAS con ficha
→ pestaña Marcas activa
→ derecha: nombre Marca + cerrar + Buscar + Nueva

PROVEEDORES sin ficha
→ pestaña Proveedores activa
→ derecha: Buscar + Nuevo

PROVEEDORES con ficha
→ pestaña Proveedores activa
→ derecha: nombre Proveedor + cerrar + Buscar + Nuevo
```

Principio arquitectónico:

```text
PurchasesTabsComponent
→ navegación genérica
→ NO conoce dominios concretos ni acciones de Marca/Proveedor

PurchasesComponent
→ compone la barra
→ proyecta acciones contextuales según activeSection

acciones de Marca
→ pertenecen funcionalmente a Marcas
→ aunque se rendericen visualmente dentro de la barra superior
```

Antes del patch:

```text
1. intentar leer main actual en GitHub;
2. tener en cuenta la nueva reorganización de /src/app/services;
3. no asumir rutas antiguas de servicios;
4. revisar PurchasesTabsComponent;
5. revisar PurchasesComponent;
6. revisar MarcasComponent;
7. revisar MarcasService en su nueva ruta;
8. revisar workspace actual.
```

No avanzar a `16.13.5` hasta cerrar y validar visualmente `16.13.4C`.

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

### 27.3.3 16.13.3C — Integración pública `brand_image` ✅

Se añadió una entrada pública específica:

```text
files.stageBrandImage()
```

Regla de seguridad:

```text
renderer NO elige purpose

stageArticleImage()
→ backend fuerza article_image

stageBrandImage()
→ backend fuerza brand_image
```

Se reutiliza:

```text
ImageStagingService
discardStagedImage()
infraestructura WebP común
```

No se creó un staging paralelo para Marcas.

Cadena cerrada:

```text
renderer
→ files.stageBrandImage()
→ IPC trusted sender
→ purpose = brand_image
→ ImageStagingService
→ stagingId
→ MarcasService
→ ImageAssetPromoter
→ files/brands/
→ TypeOrmMarcaRepository
→ archivo + marca.id_archivo
```

Resultado:

```text
16.13.3 ✅ CERRADO
```

---

## 27.4 16.13.4 — Workspace + pantalla base 🟦 EN DESARROLLO

### 27.4.1 16.13.4A — Workspace ✅

Se creó el workspace de Marca con:

```text
marcaId
marcaPublicId
draft
baseSnapshot
activeSection
estadisticasFiltros
```

Dirty:

```text
NO booleano manual
→ computed comparando draft vs baseSnapshot
```

Marca nueva:

```text
activeSection = data
estadísticas no disponibles
```

Marca persistida:

```text
data | statistics
```

Filtros estadísticos:

```text
mes actual
año actual
tipo = amount
```

Regla:

```text
Año = Todos
→ Mes = Todos
```

Salir a otro apartado:

```text
→ workspace de Marca permanece
→ dirty permanece
→ pestaña permanece
→ filtros permanecen
→ sin confirmación
```

También se amplió el workspace de Compras para conservar:

```text
activeSection = orders | brands | suppliers
```

Importante:

```text
ComprasWorkspaceService ya existía por Pedidos
→ NO crear servicio duplicado
→ se fusionó activeSection con los estados existentes
→ listados de Pedidos siguen conservando su workspace independiente
```

### 27.4.2 16.13.4B — Pantalla base inicial ✅

Se sustituyó el placeholder de Marcas por una pantalla real inicial.

Estado sin ficha:

```text
Marcas
Buscar (todavía inactivo)
Nueva
"Elige una marca de la lista."
```

Estado nueva Marca:

```text
Nueva marca
DATOS
```

Marca persistida:

```text
nombre
DATOS | ESTADÍSTICAS
```

Se validó funcionalmente que:

```text
Compras → Marcas
→ Nueva marca
→ salir a otro apartado
→ volver a Compras
→ regresar a Marcas
→ conservar workspace
```

### 27.4.3 16.13.4C — Barra contextual integrada de Compras ⬅️ SIGUIENTE

Después de ver la pantalla real, se aprobó un rediseño para ganar espacio vertical.

Problema actual:

```text
COMPRAS
barra Pedidos/Marcas/Proveedores
cabecera Marcas + acciones
contenido
```

Nuevo diseño:

```text
COMPRAS
PEDIDOS | MARCAS | PROVEEDORES                    acciones contextuales
contenido
```

Acciones:

```text
Pedidos
→ ninguna

Marcas
→ buscar + nueva
→ si hay ficha: nombre + cerrar + buscar + nueva

Proveedores
→ buscar + nuevo
→ si hay ficha: nombre + cerrar + buscar + nuevo
```

Arquitectura:

```text
PurchasesTabsComponent
→ navegación genérica
→ zona proyectable de acciones a la derecha

PurchasesComponent
→ decide qué acciones contextuales proyectar

MarcasComponent
→ elimina su cabecera redundante
→ se centra solo en workspace/contenido
```

No cerrar 16.13.4 hasta validar este rediseño.

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

# 28.1 Reorganización de servicios frontend

Cambio estructural realizado por el usuario después de `16.13.4B`:

```text
/src/app/services
→ reorganizado en subcarpetas
```

Motivación:

```text
evitar una carpeta plana creciente
agrupar servicios por dominio/responsabilidad
mejorar navegación y mantenibilidad
```

Estado:

```text
imports corregidos
tests pasan
aplicación arranca
commit subido a main
```

Regla a partir de ahora:

```text
NO asumir rutas antiguas @services/<servicio>
→ revisar main actual
→ usar las nuevas rutas por subcarpeta
```

Los ejemplos de documentos anteriores que mencionen rutas antiguas de servicios deben interpretarse como históricos; prevalece `main`.

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
Pedidos 16.1–16.12 ✅

Marcas:
16.13.1 ✅
16.13.2 ✅
16.13.3 ✅
16.13.4A ✅
16.13.4B ✅
16.13.4C ⬅️ SIGUIENTE
```

5. tener en cuenta que `/src/app/services` ha sido reorganizado en subcarpetas;
6. NO reutilizar rutas antiguas de imports sin comprobar `main`;
7. continuar exactamente con:

```text
16.13.4C — Barra contextual integrada de Compras
```

8. objetivo del bloque:

```text
eliminar cabecera redundante de Marcas
integrar acciones a la derecha de tabs Compras
mantener PurchasesTabs genérico
preparar patrón reutilizable para Proveedores
```

9. revisar antes del patch:

```text
PurchasesComponent
PurchasesTabsComponent
MarcasComponent
MarcasService en su NUEVA ruta
ComprasWorkspaceService en su NUEVA ruta
tests asociados
```

10. después de 16.13.4C:
   - prueba visual;
   - cerrar 16.13.4;
   - avanzar a 16.13.5 Buscador de Marcas;
11. imports internos siempre por alias absoluto;
12. todo método nuevo, también en interfaces, lleva JSDoc;
13. interfaz modificada → adaptar fakes/mocks/specs en el mismo bloque;
14. usuario aplica y prueba; asistente no hace commits ni ejecuta el proyecto;
15. esperar confirmación antes de avanzar;
16. no tocar `12C.9 TicketBAI` sin información de Berein;
17. no diseñar Proveedores hasta cerrar Marcas;
18. protocolo GitHub:
    - intentar `main` primero;
    - si falla, explicar el error exacto;
    - ZIP/adjuntos solo como fallback.

---
# 32. Resumen ultracorto

```text
Proyecto: Osumi TPV Client
Continuidad: 14/09/2026
Base: v2.60 + main

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
16.13.1 Snapshot histórico ✅
16.13.2 Backend CRUD/soft-delete ✅
16.13.3 Infraestructura logo ✅

16.13.4 Workspace + pantalla base 🟦
16.13.4A Workspace ✅
→ draft/baseSnapshot
→ dirty computed
→ data/statistics
→ filtros persistentes
→ activeSection Compras persistente

16.13.4B Pantalla base ✅
→ bienvenida
→ nueva Marca
→ tabs internas
→ navegación conserva estado

SIGUIENTE:
16.13.4C Barra contextual integrada Compras

Nuevo diseño:
COMPRAS
PEDIDOS | MARCAS | PROVEEDORES                 contexto derecha

Pedidos:
→ derecha vacía

Marcas:
→ Buscar + Nueva
→ con ficha: nombre + cerrar + Buscar + Nueva

Proveedores:
→ Buscar + Nuevo
→ con ficha: nombre + cerrar + Buscar + Nuevo

Arquitectura:
→ PurchasesTabs genérico
→ zona proyectable derecha
→ acciones siguen perteneciendo al dominio activo
→ eliminar cabecera redundante de Marcas

Refactor adicional:
→ /src/app/services reorganizado en subcarpetas
→ imports corregidos
→ tests verdes
→ aplicación arranca
→ NO asumir rutas antiguas

Después:
16.13.5 Buscador en memoria
16.13.6 Ficha Datos
16.13.7 Backend Estadísticas
16.13.8 UI Estadísticas
16.13.9 Maestro global
16.13.10 Regresión
16.14 Proveedores

Reglas:
→ JSDoc en todos los métodos nuevos, también interfaces
→ intentar GitHub/main antes de pedir archivos
→ informar error exacto si falla
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
| 2.59 | 14/09/2026 | Protocolo explícito de acceso a GitHub/main y fallback por archivos |
| **2.60** | **14/09/2026** | **16.13.3 cerrado; 16.13.4A/B cerrados; servicios frontend reorganizados; aprobado rediseño barra contextual; siguiente 16.13.4C** |

---
# 34. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal el archivo
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.60.

Estado:
- Artículos 13 ✅
- Clientes 14 ✅
- Almacén 15 ✅
- REF ✅
- CTRL ✅
- TicketBAI ordinario ✅
- TicketBAI devoluciones/mixtas ⏸️ Berein
- Compras 🟦
  - Pedidos 16.1–16.12 ✅
  - Marcas:
    - 16.13.1 Snapshot histórico ✅
    - 16.13.2 Backend CRUD/soft-delete ✅
    - 16.13.3 Infraestructura logo ✅
    - 16.13.4A Workspace ✅
    - 16.13.4B Pantalla base ✅
    - 16.13.4C Barra contextual ⬅️ SIGUIENTE

Punto exacto:
16.13.4C — Barra contextual integrada de Compras.

IMPORTANTE:
El usuario ha reorganizado completamente `/src/app/services` en subcarpetas.
Todos los imports fueron corregidos, tests pasan y la aplicación arranca.
NO asumas rutas antiguas de servicios: revisa `main`.

Antes de proponer cambios:
- intenta siempre revisar `main` actual en GitHub;
- si falla, comunica el error exacto;
- distingue error HTTP real frente a fallo de capa de acceso (`DisabledError`, timeout, DNS, etc.);
- solo entonces pide los archivos concretos necesarios.

Diseño aprobado para 16.13.4C:
- mantener cabecera COMPRAS;
- usar una sola barra para tabs + acciones contextuales;
- Pedidos: derecha vacía;
- Marcas: Buscar + Nueva;
- Marca abierta: nombre + cerrar + Buscar + Nueva;
- Proveedores: patrón equivalente en el futuro;
- eliminar la cabecera redundante propia de Marcas;
- PurchasesTabsComponent debe seguir siendo genérico;
- las acciones contextuales deben proyectarse/componerse desde PurchasesComponent o componentes de dominio.

Workspace Marcas:
- draft + baseSnapshot;
- dirty computed;
- marca activa;
- data/statistics;
- filtros estadísticas persistentes;
- salir a otro módulo conserva todo.

No empieces 16.13.5 hasta cerrar y validar visualmente 16.13.4C.

Reglas:
- imports internos por alias absoluto;
- TODO método nuevo lleva JSDoc, también en interfaces;
- interfaz modificada → adaptar fakes/mocks/specs;
- yo aplico manualmente cambios y ejecuto tests;
- tú no haces commits ni modificas el repo;
- esperar confirmación antes de avanzar.
```

---

**Fin del documento de continuidad v2.60.**
