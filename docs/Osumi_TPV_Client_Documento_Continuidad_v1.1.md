# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 1.1
**Fecha:** 9 de agosto de 2026
**Estado:** Installation, importación legacy y Startup completados y probados. El proyecto queda preparado para continuar el traspaso funcional por módulos.

## 1. Propósito del documento

Este documento reúne el contexto técnico y funcional necesario para continuar el desarrollo de Osumi TPV Client aunque se abra una conversación nueva o cambie la persona que trabaja en el proyecto.

Debe tratarse como un documento vivo. Al completar un módulo, cambiar una decisión arquitectónica o cerrar un hito, se actualizarán la versión, el estado actual, las decisiones y el siguiente paso.

> **Importante:** Los dos grandes hitos de infraestructura completados hasta ahora son: **Installation + importación legacy** y **Startup + precarga inicial de datos**. Ambos están probados con datos reales importados desde Osumi TPV.

## 2. Estado actual del proyecto

- Aplicación de escritorio: Electron + Angular.
- Backend local: Node.js/TypeScript dentro de Electron.
- Persistencia local: SQLite mediante TypeORM y better-sqlite3.
- Instalación desde cero: completada.
- Importación desde Osumi TPV antiguo mediante `.otpv`: completada.
- Transformación de las 33 tablas legacy: completada.
- Importación de imágenes, iconos, documentos PDF, logo, configuración y secretos: completada.
- Promoción atómica desde staging a la instalación definitiva: completada.
- Comprobación inicial del estado de instalación mediante `ApplicationStateService`: completada.
- Ruta `/startup` y flujo de arranque visual: completados.
- Precarga global en memoria de marcas, proveedores, empleados, clientes, categorías y provincias: completada.
- Conexión SQLite operativa persistente durante la ejecución: implementada.
- Protocolo interno `osumi://assets/...` para recursos de la instalación: implementado y probado.
- Siguiente gran fase: continuar el traspaso modular de la aplicación antigua a la nueva, revisando arquitectura, experiencia de usuario y componentes en cada módulo.

## 3. Repositorios y entorno

| Elemento              | Valor                                                     |
| --------------------- | --------------------------------------------------------- |
| Cliente de escritorio | https://github.com/osumionline/Osumi-TPV-Client           |
| Frontend antiguo      | https://github.com/osumionline/Osumi-TPV                  |
| Backend antiguo       | https://github.com/osumionline/TPV-API                    |
| API remota futura     | https://github.com/osumionline/TPV-Client-API             |
| Ruta local principal  | `C:\Users\anacp\Documents\Angular\Osumi\Osumi-TPV-Client` |
| Sistema habitual      | Windows 11                                                |
| Editor                | Visual Studio Code                                        |
| Zona horaria          | Europe/Madrid                                             |

Los tres repositorios activos usados como referencia (`Osumi-TPV`, `TPV-API` y `Osumi-TPV-Client`) se mantienen actualizados en GitHub. Antes de pedir archivos al usuario, se puede consultar directamente la versión actual de los repositorios. Solo se pedirán archivos cuando exista código local no subido, recursos no presentes en GitHub o una decisión funcional que el código no permita resolver.

## 4. Arquitectura objetivo

Osumi TPV Client es la evolución instalable de Osumi TPV. La primera etapa es monopuesto y local; la arquitectura debe permitir evolucionar a multipuesto sin duplicar la lógica de negocio.

- Angular se ocupa de interfaz, estado de presentación y formularios.
- El backend Electron/Node concentra la lógica de negocio, validación y persistencia.
- El frontend envía acciones o comandos con payloads tipados.
- Una capa de persistencia decide si la acción se ejecuta contra SQLite local o contra una API remota OFW.
- La selección local/remota dependerá de la configuración y licencia del equipo.
- La futura API remota reutilizará la misma semántica de acciones y reglas de negocio.
- Los contratos que cruzan Electron IPC viven en `electron/contracts` y se organizan por dominio.
- Los contratos internos del backend viven en `electron/backend/contracts` y también se organizan por dominio.

> **Importante:** Principio arquitectónico: la lógica de negocio no debe quedar repartida entre componentes Angular ni depender de detalles de SQLite.

## 5. Convenciones de desarrollo

- Angular moderno: componentes standalone, signals, computed, input/output e `inject()`.
- Control flow moderno: `@if`, `@for` y `@switch`.
- Tipado estricto; evitar `any` y preferir tipos explícitos incluso cuando TypeScript pueda inferirlos.
- No usar una carpeta `core`. Servicios en `src/app/services` y guards en `src/app/guards`.
- Agrupación por dominio, por ejemplo `src/app/model/configuracion/`.
- `export default` cuando el archivo exporta un único elemento; exports nombrados cuando contiene varios.
- SCSS con anidamiento cuando mejora la legibilidad.
- En Angular 22 no añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- Aliases activos: `@env`, `@app/*`, `@backend/*` y aliases específicos del backend/contratos ya configurados en el proyecto.
- Al modificar código existente se debe indicar la ubicación exacta usando bloques presentes en el archivo actual.
- Cuando un archivo es nuevo o el contexto puede haber cambiado, se entrega el archivo completo.
- No asumir que un fragmento propuesto anteriormente continúa existiendo sin comprobarlo.
- Usar líneas en blanco para separar **bloques lógicos**, no entre cada import, propiedad, atributo u operación individual.
- Evitar formatos verticales excesivamente fragmentados cuando una declaración o un objeto resultan más legibles en varias propiedades consecutivas.

## 6. Installation e importación legacy completadas

### 6.1 Bloque 4A — Selección, inspección e integridad

- Diálogo nativo para seleccionar archivos `.otpv`.
- Inspección segura del ZIP y prevención de rutas peligrosas.
- Inventario de archivos, versiones, recuentos de tablas y filas.
- SHA-256 del paquete y verificación de checksums.
- Revalidación antes de ejecutar la importación.

### 6.2 Bloque 4B — Análisis del dump

- Lector incremental de `database.sql`.
- Interpretación tipada de `INSERT`, `NULL`, números, booleanos y textos escapados.
- Detección de duplicados, referencias inválidas y restricciones incompatibles con SQLite.

### 6.3 Bloque 4C — Revisión y decisiones

- Informe previo a la importación.
- Resolución de conflictos bloqueantes.
- Decisiones manuales y automáticas validadas antes de importar.

### 6.4 Bloque 4D — Transformación de datos y archivos

- Worker independiente y base SQLite temporal.
- Importadores por fases con transacciones y rollback.
- Datos maestros, catálogo, artículos, etiquetas, códigos, caducidades e imágenes.
- Clientes, reservas, facturas y relaciones.
- Cajas, recuentos, movimientos, ventas, líneas, pagos y TicketBAI.
- Pedidos, líneas, vistas y documentos PDF.
- Histórico de artículos y de almacén.

### 6.5 Bloque 4E — Activación definitiva

- Lectura y transformación de `app_data.json`.
- Separación y cifrado de `secretApi` y `backupApiKey` mediante `safeStorage`.
- Conversión real del logo a PNG.
- Preparación de secuencias de tickets y facturas.
- Validación global de SQLite.
- Promoción atómica de base, archivos, logo, secretos y configuración.
- Recuperación ante una promoción interrumpida.

## 7. Tablas legacy transformadas

El paquete legacy contiene 33 tablas. Todas están cubiertas por el proceso de importación:

| Dominio                | Tablas legacy                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo               | `articulo`, `codigo_barras`, `categoria`, `marca`, `etiqueta`, `etiqueta_web`, `articulo_etiqueta`, `articulo_etiqueta_web`, `foto`, `articulo_foto` |
| Stock e histórico      | `caducidad`, `historico_articulo`, `historico_almacen`                                                                                               |
| Ventas                 | `venta`, `linea_venta`                                                                                                                               |
| Caja                   | `caja`, `caja_tipo`, `pago_caja`                                                                                                                     |
| Compras                | `pedido`, `linea_pedido`, `pdf_pedido`, `vista_pedido`                                                                                               |
| Proveedores            | `proveedor`, `comercial`, `proveedor_marca`                                                                                                          |
| Clientes y facturación | `cliente`, `factura`, `factura_venta`, `reserva`, `linea_reserva`                                                                                    |
| Gestión                | `empleado`, `empleado_rol`, `tipo_pago`                                                                                                              |

## 8. Decisiones importantes ya tomadas

- La base SQLite se crea completa; no se usan migraciones durante Installation.
- Los IDs legacy se conservan cuando resulta seguro y útil.
- Los `public_id` nuevos se generan de forma determinista a partir del hash de origen y la entidad.
- Precios contables se almacenan en céntimos o microeuros según la precisión necesaria.
- Porcentajes se almacenan en puntos básicos o microporcentaje.
- Efectivo pasa a ser un tipo de pago explícito.
- Los archivos reciben nombres internos nuevos y se validan con tamaño y SHA-256.
- `app_data.json` es el último marcador de una instalación promovida correctamente.
- Los secretos no se almacenan en texto plano dentro de `app_data.json`.
- El historial legacy conserva códigos y valores reales aunque la documentación antigua sea incompleta.
- Las referencias opcionales inválidas pueden normalizarse a `NULL` con advertencia; las referencias esenciales provocan error.
- La base de datos operativa se mantiene conectada durante la sesión mediante `TypeOrmApplicationDatabase`; la conexión es lazy, reutilizable e idempotente.
- Los servicios Angular de dominios precargados son propietarios de sus signals y recargan sus datos después de futuras operaciones CRUD.
- `ApplicationStartupService` orquesta la precarga, pero no almacena los datos de los dominios.
- Los DTO que atraviesan IPC no usan `urlencode/urldecode`; IPC transporta directamente los strings.

## 9. Mejora de usabilidad aplicada al importador

El proceso de importación no cambia de ruta; muestra distintas vistas dentro del mismo componente. Por ello `withInMemoryScrolling()` no controlaba esos cambios.

- Al analizar el paquete se desplaza la vista al inicio del informe.
- Al abrir la resolución de conflictos se desplaza al inicio.
- Al validar decisiones se enfoca la sección Decisiones validadas.
- Al iniciar la importación se desplaza al proceso.
- Al terminar se desplaza al informe final.
- La implementación usa `viewChild()`, `afterNextRender()`, `focus({preventScroll:true})` y `scrollIntoView()`.

## 10. Traspaso modular

> **Importante:** A partir de Installation comenzó el traspaso funcional de Osumi TPV antiguo a Osumi TPV Client. El primer hito de esta fase, **Startup**, ya está completado.

El trabajo se realizará módulo por módulo. No se pretende copiar mecánicamente la aplicación antigua: cada módulo se revisará para mejorar arquitectura, experiencia de usuario, tipado, separación de responsabilidades y compatibilidad futura con modo multipuesto.

| Orden propuesto | Módulo                               | Objetivo principal                                                               | Estado     |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------------- | ---------- |
| 1               | Startup / arranque inicial           | Validar instalación y precargar datos globales antes de entrar en la aplicación. | Completado |
| 2               | Shell, sesión y navegación funcional | Estructura principal, empleado activo y navegación entre módulos.                | Pendiente  |
| 3               | Venta                                | Caja activa, búsqueda, carrito, pagos, stock, ticket y TicketBAI.                | Pendiente  |
| 4               | Artículos                            | Listado, edición, precios, stock, códigos, etiquetas, fotos y caducidades.       | Pendiente  |
| 5               | Compras                              | Pedidos, recepción, documentos, proveedores y actualización de costes.           | Pendiente  |
| 6               | Clientes                             | Ficha, reservas, facturación e histórico.                                        | Pendiente  |
| 7               | Almacén                              | Inventario, mermas, caducidades e históricos.                                    | Pendiente  |
| 8               | Caja                                 | Apertura, cierre, recuentos, movimientos y consultas.                            | Pendiente  |
| 9               | Gestión                              | Empleados, permisos, configuración y tipos de pago.                              | Pendiente  |
| 10              | Estadísticas                         | Informes y cuadros de mando sobre el nuevo modelo.                               | Pendiente  |

## 11. Hito Startup completado

### 11.1 Objetivo

Startup es la fase de arranque situada entre una instalación válida y el acceso a los módulos funcionales. Su ruta es `/startup`.

Se separaron dos conceptos:

```text
ApplicationStateService
    ¿La instalación es utilizable?

ApplicationStartupService
    ¿Están cargados los datos globales necesarios para esta sesión?
```

`provideAppInitializer()` se mantiene exclusivamente para ejecutar `ApplicationStateService.load()`. La precarga funcional no se ejecuta dentro del initializer, de modo que Angular puede renderizar una pantalla de progreso real.

### 11.2 Flujo de navegación

```text
Arranque
  ↓
ApplicationStateService
  ├─ not-installed      → /instalacion
  ├─ incomplete/invalid → /estado-aplicacion
  └─ ready              → /startup
                              ↓
                     ApplicationStartupService
                              ↓
                          datos listos
                              ↓
                           /ventas
```

- La ruta raíz y el wildcard pasan por `/startup`.
- `startupGuard` permite la ruta solo cuando la instalación está preparada y redirige a `/ventas` si Startup ya terminó.
- `readyApplicationGuard` impide entrar en rutas funcionales mientras Startup no esté `ready`.
- Al completar la carga se navega a `/ventas` usando `replaceUrl: true`.
- La pantalla de Startup muestra estado, paso actual, porcentaje, error y opción de reintento.
- Se añadió temporalmente un `demoDelay` para revisar visualmente la pantalla; fue retirado al cerrar el hito.

### 11.3 Estado interno de Startup

`ApplicationStartupService` trabaja con los estados:

```text
idle
loading
ready
error
```

Mantiene señales para:

- estado;
- paso actual;
- tareas completadas;
- total de tareas;
- porcentaje derivado;
- error.

`start()` es idempotente y reutiliza una petición pendiente para evitar cargas simultáneas.

### 11.4 Datos precargados

Startup carga secuencialmente seis conjuntos de datos:

| Orden | Dominio                   | Origen                     | Estado en Angular                                               |
| ----- | ------------------------- | -------------------------- | --------------------------------------------------------------- |
| 1     | Marcas                    | SQLite vía backend + IPC   | `MarcasService.marcas()`                                        |
| 2     | Proveedores + comerciales | SQLite vía backend + IPC   | `ProveedoresService.proveedores()`                              |
| 3     | Empleados + permisos      | SQLite vía backend + IPC   | `EmpleadosService.empleados()`                                  |
| 4     | Clientes                  | SQLite vía backend + IPC   | `ClientesService.clientes()`                                    |
| 5     | Categorías                | SQLite vía backend + IPC   | `CategoriasService.categorias()` y `categoriasPlain()`          |
| 6     | Provincias                | Constante TypeScript local | `ProvinciasService.provinciasAgrupadas()` y `provinciasPlain()` |

Los artículos **no** se precargan de forma global.

### 11.5 Patrón de servicios de dominio

Los dominios cargados desde SQLite siguen el patrón:

```text
SQLite
  ↓
Repository backend
  ↓
Application Service backend
  ↓
IPC
  ↓
preload.ts / window.osumiDesktop
  ↓
Service Angular
  ↓
DTO → clase de modelo
  ↓
Signal readonly
```

Cada servicio Angular mantiene su signal como fuente de verdad durante la sesión y dispone de `load()`/`reload()` para que, al implementar CRUD, una operación persistida pueda terminar recargando el conjunto correspondiente.

Se conserva el patrón habitual del proyecto `Interface ↔ Model` mediante `fromInterface()` y `toInterface()`.

### 11.6 Conexión SQLite operativa

Se creó `TypeOrmApplicationDatabase` para evitar abrir y cerrar SQLite en cada consulta funcional.

- La conexión se abre de forma lazy cuando la primera operación la necesita.
- Las llamadas posteriores reutilizan el mismo `DataSource`.
- Si hay una conexión en curso se reutiliza la misma `Promise`.
- Al cerrar Electron se destruye el `DataSource` de forma controlada.
- Installation y las validaciones de staging mantienen sus propios ciclos independientes.

Esta capa será compartida por los futuros repositories de módulos funcionales.

### 11.7 Assets internos

El protocolo `osumi://assets` se amplió para servir de forma segura recursos situados bajo `assets/files`.

Ejemplos:

```text
osumi://assets/logo
osumi://assets/files/articles/...
osumi://assets/files/brands/...
osumi://assets/files/providers/...
osumi://assets/files/payment-types/...
osumi://assets/files/orders/...
```

- `archivo.relative_path` se transforma en una URL `osumi://assets/...` mediante un builder reutilizable.
- Se valida que la ruta solicitada permanezca físicamente dentro de `filesDirectory`.
- Se protege frente a traversal y enlaces simbólicos que apunten fuera del directorio permitido.
- Las imágenes se han probado correctamente mediante `<img src="osumi://...">`.
- No se habilitó CORS general para `fetch(osumi://...)`; la restricción se mantiene deliberadamente.

### 11.8 Marcas

- Se cargan solo marcas no borradas, ordenadas por nombre.
- El DTO incorpora `publicId`.
- La foto se obtiene mediante `archivo.relative_path` y el protocolo `osumi://assets`.
- Los antiguos campos operativos `crearProveedor` y `proveedor` no forman parte del modelo global `Marca`.
- La relación proveedor-marca se trata donde corresponde, no mediante una consulta adicional por marca.

### 11.9 Proveedores y comerciales

- Cada proveedor conserva sus IDs de marcas y su lista de comerciales.
- Proveedores, relaciones `proveedor_marca` y comerciales se cargan en tres consultas globales y se agrupan en memoria.
- Se elimina el patrón N+1 del backend antiguo.
- Las fotos usan el mismo sistema genérico de assets.
- Proveedor y Comercial incorporan `publicId`.

### 11.10 Empleados y permisos

- Se precargan empleados activos y no borrados.
- `password_hash` y `password_algorithm` nunca se exponen al renderer.
- `hasPassword` se deriva de forma segura, incluyendo el hash centinela usado para empleados legacy sin contraseña utilizable.
- Los antiguos `roles` se reinterpretan correctamente como **permisos**, de acuerdo con el nuevo modelo `empleado_permiso`.
- El modelo expone `hasPerm()` y `hasAnyPerm()`.
- `textColor` se deriva del color del empleado y no se mantiene en un mapa/cache paralelo.
- Si solo existe un empleado, `EmpleadosService.empleadoDefecto()` lo devuelve mediante un `computed`; no representa todavía una sesión/autenticación activa.

### 11.11 Clientes

- Startup carga únicamente la ficha base del cliente y `ultimaVenta`.
- Facturas, estadísticas, reservas y ventas detalladas quedan fuera de la precarga.
- `ultimaVenta` se calcula mediante una consulta agregada con `MAX(venta.created_at)`, evitando la carga de todas las ventas por cliente del sistema antiguo.
- El timestamp se conserva como dato ISO y el formato visual será responsabilidad de Angular.
- `descuento_bps` se convierte a porcentaje al cruzar hacia el frontend.
- El modelo global de Cliente no se utiliza como cache de estados de facturas/estadísticas de otras pantallas.

### 11.12 Categorías

- SQLite devuelve una única lista plana de categorías activas.
- Angular construye a partir de ella dos vistas sobre las mismas instancias:
  - `categorias()`: árbol jerárquico de categorías reales.
  - `categoriasPlain()`: recorrido depth-first con `profundidad` calculada.
- La categoría ficticia `Inicio` del TPV antiguo no forma parte del estado global.
- `deployed` se elimina del modelo porque es estado de presentación de una pantalla concreta.
- Se respeta el nuevo campo persistido `orden`.
- La construcción del árbol detecta padres no disponibles y relaciones circulares/inaccesibles.
- Se elimina la construcción recursiva del backend antiguo que realizaba una consulta por nodo.

### 11.13 Provincias

El antiguo `provinces.json` se convirtió en datos TypeScript integrados en la aplicación.

Se conservan dos representaciones:

- `provinciasAgrupadas()`: comunidades autónomas con sus provincias, pensada entre otros usos para `mat-optgroup`.
- `provinciasPlain()`: las mismas provincias en una lista plana ordenada alfabéticamente.

El catálogo antiguo tenía 47 provincias y omitía Baleares y Canarias. Se completó hasta 50 sin modificar ningún ID existente:

```text
13 → Illes Balears
14 → Las Palmas
15 → Santa Cruz de Tenerife
```

El catálogo final contiene 17 comunidades autónomas y 50 provincias.

### 11.14 Organización de contratos backend

Durante el hito Startup se reorganizó `electron/backend/contracts`, que había empezado a crecer como un directorio plano.

Los contratos se agrupan ahora por dominios como:

```text
electron/backend/contracts/
├── application/
├── clientes/
├── configuration/
├── empleados/
├── legacy-import/
├── marcas/
├── proveedores/
├── security/
└── system/
```

Los nuevos dominios deben seguir este mismo criterio en lugar de volver a acumular contratos en la raíz.

## 12. Método de trabajo por módulo

Para cada módulo se seguirá el mismo ciclo:

1. Inventariar pantallas, componentes, servicios, modelos y endpoints de la aplicación antigua.
2. Identificar qué comportamiento debe conservarse y qué deuda técnica no debe trasladarse.
3. Revisar el modelo SQLite y las reglas de negocio disponibles.
4. Definir casos de uso, acciones backend y contratos tipados.
5. Proponer arquitectura de carpetas y responsabilidades.
6. Trasladar primero una vertical funcional mínima.
7. Mejorar UX, accesibilidad, estados vacíos, errores y rendimiento.
8. Añadir pruebas y comprobar datos importados reales.
9. Cerrar el módulo con una recapitulación y actualizar este documento.

> **Importante:** En cada módulo se revisarán las decisiones en vez de asumir que la implementación antigua es el diseño correcto.

## 13. Fuentes de información al empezar un módulo

La fuente principal será el código actual de los repositorios GitHub:

- frontend antiguo: `osumionline/Osumi-TPV`;
- backend antiguo: `osumionline/TPV-API`;
- cliente nuevo: `osumionline/Osumi-TPV-Client`.

Además, cuando sea necesario se usarán:

- capturas o descripción del flujo cuando la interfaz sea relevante;
- reglas de negocio o excepciones conocidas que no sean evidentes en el código;
- recursos no presentes en los repositorios;
- decisiones explícitas sobre qué comportamiento conservar o mejorar.

No se debe pedir al usuario que vuelva a adjuntar archivos que estén ya actualizados y accesibles en los repositorios, salvo que sea necesario contrastar código local no publicado.

## 14. Protocolo para cambios de código

- Los cambios se darán en orden de compilación y por bloques pequeños verificables.
- Cada archivo nuevo se entregará completo.
- En archivos existentes se indicará la ruta y la ubicación exacta antes o después de un símbolo presente en la versión actual.
- Cuando haya dudas sobre el contenido actual, se revisará primero el repositorio o se pedirá el archivo si no está disponible.
- Tras cada bloque se ejecutarán `typecheck`, `build`, `lint` y pruebas o comprobaciones específicas.
- No se avanzará al bloque siguiente hasta que el actual funcione o queden documentadas sus limitaciones.
- Al proponer código, usar líneas en blanco para separar bloques lógicos y evitar fragmentación vertical innecesaria.

## 15. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” como contexto principal.

Los hitos Installation + importación legacy y Startup están completados y probados. Startup valida la instalación y precarga en memoria marcas, proveedores, empleados, clientes, categorías y provincias antes de entrar en la aplicación.

Los repositorios de referencia, mantenidos actualizados, son:
- Frontend antiguo: https://github.com/osumionline/Osumi-TPV
- Backend antiguo: https://github.com/osumionline/TPV-API
- Cliente nuevo: https://github.com/osumionline/Osumi-TPV-Client

Ahora continuamos trasladando la aplicación antigua módulo por módulo, revisando arquitectura y experiencia de usuario. Respeta las convenciones técnicas y el protocolo de cambios del documento. Antes de proponer cambios sobre archivos existentes, consulta su contenido actual en el repositorio y no asumas que conservan fragmentos de respuestas anteriores.

El módulo que vamos a trabajar ahora es: [MÓDULO].
El objetivo concreto es: [OBJETIVO].
```

## 16. Próximo paso

El hito **Startup** está cerrado. La aplicación dispone ya de una instalación validada, conexión SQLite operativa, precarga global y navegación de entrada hasta `/ventas`.

El siguiente trabajo pertenece ya al traspaso funcional de la aplicación. Quedan por abordar, entre otros, el shell principal, la selección/sesión de empleado y los módulos funcionales, comenzando por la vertical de Venta según el orden de trabajo acordado.

Antes de iniciar un nuevo hito funcional se revisará el comportamiento equivalente en el frontend y backend antiguos y se decidirá qué conservar y qué rediseñar.

## 17. Registro de hitos

| Versión | Fecha               | Hito                                                                                                                                                                     |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 6 de agosto de 2026 | Installation e importación legacy completadas. Inicio del traspaso modular.                                                                                              |
| 1.1     | 9 de agosto de 2026 | Startup completado: ruta de arranque, conexión SQLite operativa, assets internos y precarga global de marcas, proveedores, empleados, clientes, categorías y provincias. |
