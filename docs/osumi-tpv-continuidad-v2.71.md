# Osumi TPV Client — Documento de continuidad
**Versión 2.71 — 18 de septiembre de 2026**

## 1. Forma de trabajo — reglas obligatorias

Este proyecto se desarrolla de forma jerárquica: secciones principales → bloques → sub-bloques.

Reglas de trabajo acordadas:

- Repositorio principal: `osumionline/Osumi-TPV-Client`, rama `main`.
- El usuario desarrolla localmente, prueba los cambios y realiza commit/push.
- **Cada respuesta de desarrollo debe contener una sola unidad pequeña y autocontenida.**
- Es preferible dividir un bloque si con ello se reduce el riesgo.
- Antes de proponer código que dependa del estado actual, revisar `main` en GitHub.
- No asumir que existe una ruta, clase, contrato, helper o archivo: verificarlo primero.
- Si se pide crear un archivo nuevo, proporcionar siempre **el contenido completo**.
- Si se modifica un archivo existente con un cambio parcial:
  - indicar exactamente el bloque a localizar;
  - decir qué sustituir o dónde añadir;
  - incluir contexto suficiente para evitar ambigüedad.
- No proponer archivos o tests “para más adelante” si pertenecen a la unidad actual: o se hacen en ese bloque o no se plantean todavía.
- El usuario prueba cada unidad y confirma antes de avanzar.
- **Antes de cada nuevo bloque de desarrollo**, incluir:
  1. una lista breve de lo ya terminado, punto actual y lo pendiente;
  2. un solo párrafo corto explicando exactamente qué se hará en ese punto.
- **No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique primero qué quiere y cómo funcionaba en el TPV antiguo.**
- El usuario dirige el producto y la migración. No inventar funcionalidades por analogía.
- Todo método público nuevo debe llevar JSDoc. Si se toca una clase/interfaz y hay métodos públicos sin JSDoc, completarlos también.
- Angular moderno:
  - standalone;
  - zoneless;
  - signals;
  - `input()/output()`;
  - `inject()`;
  - `computed()`;
  - `@if/@for`;
  - Signal Forms.
- Evitar APIs Angular legacy. `viewChild()` signal es válido.
- Servicios propios Angular con `@Service()`.
- Tests Electron con Vitest imports; frontend admite globals.
- Batería completa habitual:
  ```bash
  npm test
  npm run build
  npm run test:electron
  npm run build:electron
  npm run lint
  ```
- Para pequeños cambios exclusivamente renderer se ha usado a veces:
  ```bash
  npm test
  npm run build
  npm run lint
  ```
- No crear migraciones antes de la primera versión estable salvo necesidad expresa.
- `DATABASE_SCHEMA_VERSION = 1`.

---

## 2. Entorno y estructura

### Repositorios
- Nuevo cliente: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

### Estado técnico
- Angular **22.1.7**
- Angular Material **22.1.7**
- Electron + TypeScript
- SQLite / TypeORM
- Secrets operacionales con Electron `safeStorage`

### Aliases renderer
- `@env/*`
- `@app/*`
- `@constants/*`
- `@guards/*`
- `@interfaces/*`
- `@model/*`
- `@modules/*`
- `@pipes/*`
- `@services/*`
- `@utils/*`
- `@desktop-contracts/*`

### Aliases Electron
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

### Redistribución de contratos / IPC
Las carpetas Electron se organizan por dominio.

Ejemplos actuales:
- Empleados:
  - `electron/contracts/configuration/empleados/*`
  - `electron/ipc/configuration/register-empleados-ipc.ts`
- Printing:
  - `electron/contracts/configuration/printing/*`
  - `electron/ipc/configuration/register-printing-ipc.ts`
- Tipos de pago ya tiene contrato base:
  - `electron/contracts/configuration/tipos-pago/tipo-pago.interface.ts`
- Marcas/proveedores bajo `compras/...`
- Categorías bajo `articulos/categorias/...`
- Reservas bajo `ventas/reservas/...`

No asumir rutas antiguas: revisar siempre `main`.

---

## 3. Estado general de hitos

- 16 Compras ✅
- 17 Gestión:
  - 17.1 Shell + navegación + rutas ✅
  - 17.2 autenticación backend de empleados ✅
  - 17.3 portada + sesión temporal + permisos ✅
    - 17.3.1 sesión / semántica admin ✅
    - 17.3.2 selector + modal contraseña + login/logout ✅
    - 17.3.3 permisos UI + guards ✅
    - 17.3.4 permiso 25 de backups + compatibilidad legacy ✅
  - 17.4 Ajustes funcionalmente terminado ✅
    - 17.4.1 actualización segura de AppData ✅
    - 17.4.2 UI de ajustes generales ✅
    - 17.4.3 integraciones / secretos / logo / impresora ✅
    - limpieza técnica opcional de `integrations` todavía pendiente; no iniciar automáticamente
  - 17.5 Empleados:
    - 17.5.1a CRUD backend ✅
    - 17.5.1b política definitiva de contraseña + bridge CRUD ✅
    - 17.5.1c importación legacy sin contraseña ✅
    - 17.5.2 estructura de pantalla ✅
    - 17.5.3 pestaña Datos ✅
    - 17.5.4 catálogo + pestaña Permisos ✅
    - 17.5.5a borrado + protección de autoborrado ✅
    - 17.5.5b autogestión tras perder permisos 20–24 ✅
    - 17.5.6a auditoría/regresión automatizada ✅
    - **17.5.6b pruebas funcionales manuales pendientes**
  - **17.6 Tipos de pago — PLAN DEFINIDO, AÚN NO IMPLEMENTADO**
- 18 Caja — pendiente; no iniciar sin dirección del usuario
- 19 enforcement global de roles/permisos — pendiente
- TicketBAI 12C.9 pausado hasta respuesta/actualización de Berein.

Punto de continuidad actual en `main`:
- último commit de código relevante:
  `074da2573ec2757c59c988d11159724e5a9b2ff8` — **“Terminado Gestion 17.5.5b”**
- commit anterior:
  `b7ba35af017561c0de64f5be5736ee405c9e6fd7` — **“Terminado Gestion 17.5.5a”**

No hubo cambios de código adicionales en 17.5.6a: fue una auditoría de cobertura y regresión.

---

# 4. Gestión — sesión y permisos

## Sesión temporal
`GestionSessionService` mantiene:
- `empleadoId`
- `authenticatedAt`
- `expiresAt`

Duración fija: **10 minutos desde login**.

Reglas:
- no se renueva por actividad;
- no existe timer que expulse mientras la página está abierta;
- se valida al entrar/reentrar en páginas protegidas;
- “Cambiar empleado” limpia la sesión inmediatamente.

El empleado efectivo se resuelve desde `EmpleadosService` usando el id; la sesión no mantiene una copia completa.

## Guard
`gestionPermissionGuard`:
1. exige sesión activa;
2. obtiene `empleadoId`;
3. resuelve el empleado desde `EmpleadosService`;
4. si ya no existe, hace logout;
5. comprueba permisos requeridos;
6. si no tiene acceso, redirige a `/gestion`.

## Permisos de Gestión
- 18 Ajustes
- 19 Tipos de pago
- 20 Crear empleados
- 21 Modificar datos de empleados
- 22 Borrar empleados
- 23 Modificar permisos de empleados
- 24 Consultar estadísticas de empleados
- 25 Copias de seguridad

Admin tiene bypass mediante `hasPerm()` / `hasAnyPerm()`.

---

# 5. Ajustes — estado actual

## AppData público
`AppData` no contiene secretos.

Contiene configuración pública de:
- negocio;
- tienda online;
- SMTP;
- TicketBAI;
- fiscalidad;
- opciones generales.

## Secrets
`InstallationSecretsData`:
- `secretApi`
- `backupApiKey`
- `emailSmtpPass`
- `ticketBaiToken`

Persistencia:
- Electron `safeStorage`
- nunca volver a `app_data.json`

Semántica:
- `null` = conservar el existente;
- string no vacío = sustituir;
- desactivar una integración limpia el secreto correspondiente.

## Revelación controlada
Revelables:
- `secretApi`
- `backupApiKey`
- `ticketBaiToken`

No revelable:
- `emailSmtpPass`

## Logo
- `osumi://assets/logo`
- reemplazo y previsualización
- backend valida JPG/PNG/WebP
- máx. 5 MB
- máx. 4096 px
- conversión WebP
- escritura atómica
- cache bust `?v=<timestamp>`

## Impresora
Preferencia local:
`PrintingSettings.ticketPrinterDeviceName`

No pertenece a AppData ni a `InstallationCommand`.

Está implementada:
- en Ajustes;
- en Nueva instalación.

La desaparición de la impresora no invalida instalación ni otros ajustes.

---

# 6. Empleados — estado final de implementación

## Contrato público
`electron/contracts/configuration/empleados/empleado.interface.ts`

Campos:
- `id`
- `publicId`
- `nombre`
- `hasPassword`
- `color`
- `admin`
- `permisos`

## Backend
`EmpleadosService` backend:
- `getAll()`
- `create()`
- `update()`
- `deactivate()`
- `authenticate()`

Política:
- contraseña obligatoria para nuevos empleados;
- scrypt actual;
- bcrypt legacy aceptado y migrado al autenticar;
- nombres activos únicos case-insensitive;
- color `#RRGGBB`;
- permisos 1–25 normalizados;
- baja lógica;
- protección del último administrador.

## Renderer
`EmpleadosService` renderer mantiene la lista en memoria y expone:
- `load()`
- `reload()`
- `clear()`
- `authenticate()`
- `create()`
- `update()`
- `deactivate()`
- `findById()`
- `findByPublicId()`

## Import legacy
- bcrypt válido → `bcrypt_legacy`;
- sin contraseña utilizable → `123456` hasheada con scrypt;
- warning final específico;
- permiso 25 sintético para empleados legacy activos.

## Pantalla
- lateral con búsqueda/listado;
- selección;
- botón Nuevo;
- pestañas Datos/Permisos;
- feedback de guardado durante 4 s.

## Permisos
- 20 alta;
- 21 Datos;
- 22 borrar;
- 23 permisos;
- 24 estadísticas futuro.
- 21 y 23 son estrictamente independientes.

## Borrado
- permiso 22;
- confirmación;
- baja lógica;
- autoborrado bloqueado;
- último administrador protegido en backend.

## Autogestión
Si el empleado se modifica a sí mismo:
- conserva alguno de 20–24 → permanece;
- pierde todos 20–24 → vuelve a `/gestion`;
- la sesión no se cierra.

Commits recientes:
- `b7ba35af017561c0de64f5be5736ee405c9e6fd7` — 17.5.5a
- `074da2573ec2757c59c988d11159724e5a9b2ff8` — 17.5.5b

---

# 7. Empleados — pruebas funcionales pendientes

17.5.6a de regresión automatizada está cerrado.

17.5.6b queda pendiente cuando el usuario vuelva al ordenador.

Checklist:
1. alta completa;
2. edición de Datos;
3. cambio/conservación de contraseña;
4. 21 sin 23;
5. 23 sin 21;
6. admin con 25 checks;
7. Cancelar;
8. eliminar otro empleado;
9. cancelar eliminación;
10. autoborrado deshabilitado;
11. último administrador;
12. quitarse algunos 20–24;
13. quitarse todos 20–24;
14. reentrada bloqueada por guard;
15. búsqueda/orden/lista tras altas, cambios y bajas.

Empleados se considera funcionalmente implementado; solo falta validación manual final.

---

# 8. Tipos de pago — análisis del TPV antiguo

El apartado antiguo tenía:

- columna izquierda;
- buscador;
- listado;
- orden manual mediante drag handle;
- botón “Añadir tipo de pago” al pie;
- área principal con mensaje inicial;
- formulario al seleccionar/crear;
- pestaña `DATOS`;
- pestaña `ESTADÍSTICAS` prevista pero comentada y nunca implementada.

Formulario antiguo:
- nombre obligatorio;
- check “El tipo de pago afecta a la caja”;
- check “Tipo de pago para tienda física”;
- logo;
- logo obligatorio en alta;
- Guardar;
- Cancelar;
- Eliminar.

Borrado:
- lógico;
- conserva ventas históricas;
- deja de estar disponible para nuevas ventas.

Orden:
- persistencia inmediata al soltar;
- sin botón Guardar.

---

# 9. Significado confirmado de los flags

## `afectaCaja`
Confirmado en la API antigua.

En venta no mixta:
- `afecta_caja = true` → el importe se clasificaba dentro de efectivo/caja;
- `afecta_caja = false` → se clasificaba como otros tipos de pago.

Afectaba al cierre de caja:
- venta efectivo;
- venta otros;
- operaciones;
- descuentos;
- desglose.

La semántica debe mantenerse en el nuevo modelo sobre `venta_pago`.

## `fisico`
Confirmado en el modal antiguo de finalizar venta.

- `fisico = true` → disponible al finalizar una venta presencial.
- `fisico = false` → no aparece en ese selector.

---

# 10. Tipos de pago — infraestructura ya existente

Ya existe:

`electron/contracts/configuration/tipos-pago/tipo-pago.interface.ts`

Campos:
- `id`
- `publicId`
- `nombre`
- `slug`
- `foto`
- `afectaCaja`
- `orden`
- `fisico`

También existe:

`src/app/model/tipos-pago/tipo-pago.model.ts`

El import legacy ya importa:
- registros `tipo_pago`;
- nombre;
- slug;
- afecta_caja;
- orden;
- fisico;
- activo/baja;
- logos como assets `payment_type_icon`;
- asociación mediante `id_archivo`.

Todavía no existe:
- backend CRUD específico de Tipos de pago;
- IPC/preload CRUD;
- `TiposPagoService` renderer;
- carga de tipos de pago en `ApplicationStartupService`;
- pantalla nueva del apartado.

---

# 11. Efectivo — decisión definitiva

En el nuevo TPV, Efectivo es un tipo de pago real de base de datos.

Instalación nueva crea:
- nombre `Efectivo`;
- slug `efectivo`;
- `afectaCaja = true`;
- `orden = 0`;
- `fisico = true`;
- sin logo.

Además, la reconstrucción de ventas legacy depende de ese tipo.

## Decisión acordada
**Efectivo NO aparecerá en Gestión > Tipos de pago.**

Consecuencias:
- no se edita aquí;
- no se elimina aquí;
- no se reordena aquí;
- no necesita logo;
- sigue existiendo internamente como tipo estructural.

Los tipos configurables sí tendrán logo obligatorio.

---

# 12. Tipos de pago — decisiones funcionales definitivas

## Listado
- buscador arriba;
- lista cargada en memoria desde el arranque;
- no consultar backend al buscar/seleccionar;
- orden por `orden`;
- drag handle;
- botón “Añadir nuevo tipo de pago” al pie.

## Búsqueda y reorder
Si existe texto de búsqueda:
- se puede seleccionar;
- **no se puede reordenar**.

## Persistencia del orden
Al hacer drop:
- recalcular orden;
- actualizar memoria;
- persistir inmediatamente;
- sin botón Guardar.

Si falla la persistencia:
- no dejar UI y DB divergentes;
- restaurar/recargar el orden fiable.

## Área principal
Inicio:
- mensaje de bienvenida/instrucción.

Tras seleccionar o crear:
- `DATOS`;
- `ESTADÍSTICAS`.

## Datos
- nombre obligatorio;
- `afectaCaja`;
- `fisico`;
- logo obligatorio;
- Efectivo excluido.

## Slug
- interno;
- no visible;
- no editable;
- se regenera automáticamente desde nombre;
- el asset ya no depende del slug, sino de `id_archivo`.

## Permiso
**El permiso 19 controla todo el apartado:**
- acceso;
- alta;
- edición;
- eliminación;
- reordenado;
- estadísticas.

No crear permisos nuevos.

## Borrado
- baja lógica;
- conservar histórico;
- conservar referencias de `venta_pago`;
- retirar de operaciones nuevas.

---

# 13. Tipos de pago — Estadísticas acordadas

La pestaña `ESTADÍSTICAS` se implementará en el nuevo TPV.

Alcance funcional inicial acordado:
- importe total cobrado con ese tipo;
- número de pagos/operaciones;
- importe medio por operación;
- evolución temporal;
- porcentaje del total de cobros que representa ese tipo;
- selector de periodo.

Fuente natural:
- `venta_pago`;
- relaciones con venta;
- fechas;
- tipos históricos conservados incluso tras baja lógica.

El detalle del selector temporal y la presentación gráfica se concretará dentro del bloque de Estadísticas, pero estas métricas ya forman parte del alcance aceptado.

---

# 14. Plan de desarrollo — 17.6 Tipos de pago

## 17.6.1 — Infraestructura + memoria
Objetivo:
dejar Tipos de pago como catálogo cargado en memoria.

Incluye:
- contratos de comandos;
- repository/backend service;
- getAll;
- create;
- update;
- deactivate;
- reorder;
- validaciones;
- IPC;
- preload;
- renderer `TiposPagoService`;
- signals;
- actualización de memoria;
- incorporación a `ApplicationStartupService`;
- ajuste de pasos de startup;
- tests backend/renderer/startup.

Reglas:
- Efectivo existe internamente pero no forma parte de la lista configurable;
- orden por `orden`;
- logos mediante asset asociado.

## 17.6.2 — Estructura visual
Objetivo:
crear la pantalla base siguiendo la composición consolidada de Empleados.

Incluye:
- ruta/página;
- lateral;
- buscador;
- lista;
- selección;
- handle;
- botón nuevo;
- mensaje inicial;
- tabs Datos/Estadísticas;
- responsive;
- permiso 19.

## 17.6.3 — Formulario Datos + logo
Objetivo:
Signal Form completo.

Campos:
- nombre;
- afectaCaja;
- fisico;
- logo.

Reglas:
- nombre obligatorio;
- logo obligatorio;
- alta sin logo inválida;
- edición conserva logo;
- cambio de logo con preview;
- pipeline seguro de imágenes;
- Guardar/Cancelar;
- dirty state;
- feedback temporal “Tipo de pago guardado correctamente”.

## 17.6.4 — Alta, edición y baja
Objetivo:
cerrar CRUD funcional.

Incluye:
- create;
- update;
- memoria inmediata;
- slug automático;
- baja lógica;
- confirmación;
- histórico intacto;
- errores consistentes;
- tests.

## 17.6.5 — Orden
Objetivo:
drag & drop persistente.

Incluye:
- CDK DragDrop;
- solo sin filtro;
- persistencia inmediata;
- recuperación ante error;
- orden continuo;
- Efectivo fuera de la lista visual;
- tests.

## 17.6.6 — Estadísticas
Objetivo:
implementar la nueva pestaña.

Incluye:
- contrato de consulta;
- backend;
- filtros de periodo;
- total;
- operaciones;
- importe medio;
- evolución;
- porcentaje;
- UI;
- carga/sin datos/error;
- tests.

## 17.6.7 — Regresión
Objetivo:
cerrar Tipos de pago.

Comprobar:
- startup/memoria;
- filtro;
- selección;
- alta;
- logo obligatorio;
- edición;
- flags;
- slug;
- baja;
- histórico;
- permiso 19;
- orden;
- filtro sin reorder;
- error de reorder;
- estadísticas;
- Efectivo oculto;
- consumo posterior desde Ventas de `fisico = true`;
- batería completa.

---

# 15. Consideraciones técnicas para 17.6

## Efectivo
No eliminar ni modificar desde esta UI.

El backend debe proteger operaciones accidentales sobre el tipo estructural si el contrato puede invocarse fuera de la UI.

## Activos
La lista de configuración trabaja con tipos activos/configurables.

Los tipos dados de baja siguen existiendo para histórico.

## Orden
Efectivo no participa visualmente.

Durante implementación se decidirá técnicamente la normalización exacta del campo `orden`, manteniendo prioridad consistente entre los tipos configurables.

## Assets
El import legacy ya usa:
- purpose `payment_type_icon`;
- tabla `archivo`;
- `id_archivo`.

Reutilizar el pipeline seguro existente de imágenes.

## Ventas
`fisico = true` define qué tipos se ofrecen al cerrar venta presencial.

El módulo de Ventas deberá consumir la colección en memoria.

## Caja
`afectaCaja` conserva la semántica heredada.

El bloque 18 Caja deberá aplicarla sobre `venta_pago`.

---

# 16. Deuda técnica deliberadamente pendiente

`ConfigurationUpdateCommand.integrations` sigue opcional por compatibilidad temporal.

Posible limpieza futura:
- hacerlo obligatorio;
- simplificar validator;
- simplificar `ConfigurationService`;
- eliminar ramas `integrations === undefined`.

No mezclar esta limpieza con Tipos de pago.

---

# 17. TicketBAI / SDK

SDK:
- `@osumi/ticketbaiws`
- versión 1.0.1
- ESM only
- tests OK
- README general + docs por dominio.

Las inconsistencias de Berein ya fueron reportadas.

12C.9:
- pausado;
- no reabrir hasta respuesta/actualización de Berein.

---

# 18. Exportación legacy `.otpv`

Incluye:
- dump MariaDB;
- app_data;
- logo;
- fotos artículos;
- marcas;
- proveedores;
- iconos de tipos de pago;
- PDFs pedidos;
- SMTP;
- TicketBAI.

Tipos de pago:
- iconos exportados;
- importador nuevo soporta `tipo_pago`;
- propósito `payment_type_icon`;
- asociación a `id_archivo`.

Impresora:
- no se exporta;
- configuración local de máquina.

---

# 19. Regla de dirección de desarrollo

Para módulos heredados:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se resuelven dudas funcionales;
4. se acuerdan decisiones;
5. se define plan;
6. se implementa por bloques pequeños.

En el momento de este documento:

- **Empleados:** implementación terminada; pruebas funcionales manuales pendientes.
- **Tipos de pago:** análisis y plan completamente acordados; todavía no hay implementación nueva.
- El siguiente bloque de código es **17.6.1 — infraestructura + memoria de Tipos de pago**.
- No abrir Caja ni otros apartados hasta que el usuario los explique y dirija.
