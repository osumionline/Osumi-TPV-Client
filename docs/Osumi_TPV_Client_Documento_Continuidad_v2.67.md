# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.67  
**Fecha:** 16 de septiembre de 2026  
**Base de continuidad:** `v2.67 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.66.md`

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

16 Compras                                        🟦 CASI CERRADO
  16.1–16.12 Pedidos                              ✅ CERRADO
  16.13 Marcas                                    ✅ HITO CERRADO
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

17 Gestión                                        🟨 CONTRATO DEFINIDO
18 Caja                                           ⬜ PENDIENTE
19 Aplicar roles globalmente                      ⬜ PENDIENTE

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

`16.13 — Marcas` queda completamente cerrado, probado funcionalmente y subido a `main`.

`16.14.1–16.14.10 — Proveedores` están implementados, probados funcionalmente y subidos a `main`.

`16.14.11 — Regresión integral de Proveedores` continúa siendo el siguiente paso técnico antes de declarar cerrado el Hito 16.

El contrato funcional y el roadmap técnico del futuro **Hito 17 — Gestión** quedan definidos en esta versión para no perder contexto al cerrar Compras.

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

No reabrir hitos cerrados salvo regresión real demostrada.

---

# 2. Orden global de desarrollo acordado

Una vez cerrado Compras:

```text
16 Compras
   ↓
17 Gestión
   ↓
18 Caja
   ↓
19 Aplicar roles globalmente
```

Este orden queda fijado.

## 2.1 Gestión antes que Caja

Aunque ambos apartados aparecen actualmente deshabilitados en la cabecera, el orden acordado es:

```text
primero Gestión
después Caja
```

## 2.2 Roles globales después de Gestión y Caja

Durante Gestión se construirá la infraestructura real de:

```text
autenticación de empleados
sesión temporal
admin
permisos
guards/autorización del área Gestión
```

Pero **no se aplicarán todavía todos los permisos históricos al resto de módulos**.

Después de cerrar Gestión y Caja se abrirá un hito específico:

```text
19 — Aplicar roles globalmente
```

para aplicar de forma transversal los permisos a:

```text
Ventas
Artículos
Marcas
Proveedores
Clientes
Caja
y demás operaciones protegidas
```

Esto evita convertir Gestión en una regresión transversal de toda la aplicación.

---

# 3. Punto exacto de continuación

El siguiente mini-hito técnico sigue siendo:

```text
16.14.11 — Regresión integral de Proveedores
```

Objetivo:

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
→ consumidores históricos
→ persistencia tras reinicio
```

Si no aparece ninguna regresión real:

```text
16.14 Proveedores ✅ CERRADO
16 Compras ✅ CERRADO
```

Después:

```text
17 Gestión
→ comenzar por 17.1
```

---

# 4. Repositorios y referencias

## 4.1 Cliente actual

```text
https://github.com/osumionline/Osumi-TPV-Client
main
```

## 4.2 TPV antiguo — referencia funcional

Frontend:

```text
https://github.com/osumionline/Osumi-TPV
```

Backend:

```text
https://github.com/osumionline/TPV-API
```

El TPV antiguo sirve como referencia funcional, numérica y UX, pero **no como arquitectura ni diseño visual a copiar literalmente**.

Para Gestión se ha revisado especialmente el antiguo apartado:

```text
Configuración
```

Su flujo funcional sirve como base conceptual, pero la nueva aplicación debe rediseñarlo con su arquitectura y estética actuales.

## 4.3 SDK TicketBAI

```text
https://github.com/osumionline/ticketbaiws
```

No tocar `12C.9` sin nueva información de Berein.

---

# 5. GitHub connector — política obligatoria

GitHub se usa **EXCLUSIVAMENTE EN MODO LECTURA**.

Antes de preparar cualquier patch:

```text
→ revisar main actual
→ trabajar sobre el código real
```

Aunque las herramientas puedan exponer operaciones de escritura, están prohibidas para este proyecto:

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

---

# 6. Convenciones de trabajo

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- Aplicación zoneless.
- Nuevo control flow: `@if`, `@for`, `@switch`.
- TypeScript estricto.
- No usar `any`; usar `unknown`.
- Preferir `inject()`.
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

Archivo nuevo:

```text
→ contenido completo
```

Archivo existente:

```text
→ fragmento reconocible actual
→ reemplazo exacto
```

Preferencia del usuario:

```text
→ bloques coherentes y suficientemente grandes
→ cada respuesta debe poder convertirse en un commit lógico
→ evitar microcambios innecesariamente fragmentados
```

Batería habitual:

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

Si un cambio de schema es incompatible con la base local de desarrollo:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear
→ reimportar .otpv
```

---

# 8. Hitos cerrados relevantes

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

# 9. Resumen contractual de Marcas

`16.13 — Marcas` está completamente cerrado.

Puntos especialmente relevantes para continuidad:

```text
Datos + Estadísticas
workspace persistente
dirty
logo con staging/WebP
soft-delete
maestro global en memoria
Marca eliminada histórica en Artículos
snapshot histórico en Ventas
estadísticas por amount/units
devoluciones ignoradas en estadísticas
```

Regla histórica:

```text
artículo existente con Marca eliminada
→ puede conservarla

nueva selección
→ exige Marca activa
```

---

# 10. Resumen contractual de Proveedores

`16.14.1–16.14.10` implementados.

Proveedor persistido:

```text
Datos
Marcas
Comerciales
```

Proveedor nuevo:

```text
solo Datos
```

Datos:

```text
Nombre *
Teléfono
Email
Dirección
Web
Observaciones
Logo
```

Reglas:

```text
Nombre obligatorio
Nombre único entre activos NOCASE
Email opcional válido
```

Datos + Marcas:

```text
mismo draft
mismo baseSnapshot
mismo dirty
mismo Guardar/Cancelar
```

Relaciones:

```text
Proveedor ↔ Marca = N:M
Marca puede tener varios Proveedores
relaciones con Marcas eliminadas se preservan físicamente
cambiar proveedor_marca NO modifica articulo.id_proveedor
```

Comerciales:

```text
Nombre *
Teléfono
Email
Observaciones

CRUD independiente
dirty independiente
confirmación propia
```

Soft-delete Proveedor:

```text
proveedor → soft-delete
comerciales activos → soft-delete
proveedor_marca → conservar
articulo.id_proveedor → conservar
logo/archivo → conservar
```

Artículos:

```text
Proveedor eliminado histórico
→ "Proveedor eliminado"
→ selected
→ disabled

conservar proveedor eliminado existente → permitido
cambiar a proveedor activo → permitido
seleccionar nuevo proveedor eliminado → rechazado
```

Maestro global:

```text
CREATE / UPDATE / rename / logo / DELETE
→ reconciliación inmediata
→ sin reload general
```

---

# 11. Regresión pendiente de Proveedores

Antes de comenzar implementación de Gestión:

```text
16.14.11
```

Debe cubrir al menos:

```text
welcome
búsqueda
nueva
Datos
logo
Marcas
relaciones ocultas
Comerciales
dirty principal
dirty Comercial
confirmaciones
navegación temporal
soft-delete
maestro global
Artículos
Proveedor eliminado
alta rápida
persistencia tras reinicio
```

Si todo queda verde:

```text
16 Compras ✅ CERRADO
```

No hace falta crear commit para la regresión si no requiere cambios de código.

---

# 12. Hito 17 — Gestión

## 12.1 Nombre y relación con el TPV antiguo

En el TPV antiguo este apartado se llamaba:

```text
Configuración
```

En el nuevo TPV se llamará:

```text
Gestión
```

No copiar literalmente el diseño antiguo.

Conservar:

```text
flujo
conceptos
roles
selección de empleado
login
cuatro destinos principales
```

Rediseñar:

```text
distribución
tarjetas
modal
dashboard
botones
estética general
```

---

# 13. Cabecera final

La distribución deseada es:

```text
Tienda          Ventas | Artículos | Compras | Clientes | Almacén | Caja          Gestión
```

Reglas:

```text
nombre de tienda → izquierda
navegación operativa → centrada
Gestión → extremo derecho
```

`Gestión` no será simplemente el último elemento del mismo bloque centrado.

Debe existir una estructura real de tres zonas:

```text
header-left
header-center
header-right
```

Caja permanece en navegación central.

Gestión queda en la zona derecha.

---

# 14. Rutas de Gestión

Estructura prevista:

```text
/gestion
/gestion/ajustes
/gestion/empleados
/gestion/tipos-pago
/gestion/copias-seguridad
```

Los cuatro apartados son **páginas independientes**, no pestañas.

Primera fase:

```text
/gestion               → funcional
/gestion/ajustes       → acceso preparado
/gestion/empleados     → placeholder
/gestion/tipos-pago    → placeholder
/gestion/copias-seguridad → placeholder
```

Los placeholders se sustituirán por su funcionalidad real a medida que avance el hito.

---

# 15. Portada de Gestión sin sesión

Al entrar sin una sesión válida:

```text
→ mostrar empleados activos
→ tarjetas
→ una tarjeta por empleado
→ fondo = empleado.color
→ texto = empleado.textColor
```

No cargar una segunda lista específica para Gestión.

Fuente canónica:

```text
EmpleadosService
→ maestro global cargado en startup
```

Click en empleado:

```text
→ abrir modal de autenticación
→ mostrar nombre del empleado
→ solicitar contraseña
→ foco automático
```

---

# 16. Autenticación de empleados

El cliente nuevo todavía necesita completar la autenticación real.

Contrato previsto:

```text
authenticate(idEmpleado, password)
```

Flujo:

```text
renderer
→ preload
→ IPC
→ application service
→ repository/security
```

Reglas:

```text
password viaja al proceso main
password_hash NO sale nunca al renderer
resultado = válido / inválido
```

El empleado debe estar:

```text
activo
no eliminado
```

## 16.1 Instalaciones nuevas

Algoritmo:

```text
scrypt
```

Usar la infraestructura existente de `PasswordHasher`.

## 16.2 Instalaciones legacy

Los hashes legacy válidos se importaron como:

```text
password_algorithm = bcrypt_legacy
```

Login correcto con bcrypt legacy:

```text
1. verificar bcrypt
2. generar nuevo hash scrypt
3. actualizar empleado.password_hash
4. actualizar password_algorithm = scrypt
5. completar login
```

Resultado:

```text
migración transparente al primer login correcto
```

## 16.3 Contraseña legacy no utilizable

Los hashes legacy no válidos/ausentes se importaron mediante el mecanismo de contraseña deshabilitada.

Comportamiento:

```text
empleado sigue visible en selección
click
→ no permitir login
→ informar:

"Este empleado no tiene una contraseña válida.
Un administrador debe asignarle una nueva contraseña."
```

Nunca iniciar sesión sin contraseña.

---

# 17. Sesión temporal de Gestión

Crear un servicio renderer específico:

```text
GestionSessionService
```

Estado mínimo:

```text
empleadoId
authenticatedAt
expiresAt
```

Duración:

```text
10 minutos
```

Regla temporal:

```text
10 minutos desde el login original
```

NO se renueva por actividad.

Ejemplo:

```text
login 10:00
expiresAt 10:10
```

aunque el usuario esté utilizando la aplicación durante ese tiempo.

## 17.1 Persistencia

La sesión vive:

```text
solo en memoria
```

NO usar:

```text
SQLite
localStorage
sessionStorage persistente entre procesos
archivo
config
```

Cerrar Osumi TPV:

```text
→ pierde sesión
```

## 17.2 Navegación temporal

Ejemplo:

```text
10:00 login Gestión
10:03 ir a Ventas
10:07 volver a Gestión
→ sesión válida

10:00 login Gestión
10:03 ir a Ventas
10:20 volver a Gestión
→ sesión expirada
→ volver a selector de empleados
```

## 17.3 No expulsar al usuario

No usar:

```text
timer de logout
interval
expulsión automática
redirección mientras trabaja
```

Si el usuario está dentro de:

```text
/gestion/ajustes
/gestion/empleados
/gestion/tipos-pago
/gestion/copias-seguridad
```

y pasan los 10 minutos:

```text
→ NO interrumpir
→ NO cerrar formulario
→ NO redirigir
```

La expiración se evalúa al volver a acceder al área protegida de Gestión.

Una entrada directa a una ruta protegida con sesión expirada debe terminar en:

```text
/gestion
→ selector de empleados
```

---

# 18. Dashboard tras login

Login correcto:

```text
Hola <nombre>, elige una de las siguientes opciones:
```

Mostrar también:

```text
Cambiar de empleado
```

Acciones:

```text
Ajustes iniciales
Empleados
Tipos de pago
Copias de seguridad
```

`Cambiar de empleado`:

```text
→ clear sesión inmediatamente
→ volver a tarjetas
```

---

# 19. Permisos dentro de Gestión

Durante el Hito 17 los permisos se aplican al propio apartado Gestión.

No aplicarlos globalmente todavía.

## 19.1 Administrador

Regla cerrada:

```text
empleado.admin === true
→ acceso total
```

No necesita tener físicamente cada ID en `empleado_permiso`.

Semántica deseada:

```text
hasPerm(id)
→ admin || permisos.includes(id)

hasAnyPerm(ids)
→ admin || ids.some(...)
```

## 19.2 Permisos existentes

Mantener IDs históricos:

```text
18 → Modificar ajustes generales
19 → Modificar tipos de pago

20 → Crear empleados
21 → Modificar empleados
22 → Borrar empleados
23 → Modificar permisos de empleados
24 → Consultar estadísticas de empleados
```

Acceso a Empleados:

```text
admin
O cualquiera de 20–24
```

## 19.3 Nuevo permiso

Añadir:

```text
25 → Gestionar copias de seguridad
```

Descripción funcional:

```text
Permite acceder a la gestión de copias de seguridad,
crear/subir copias y realizar las operaciones que
se definan en dicho apartado.
```

## 19.4 Importación legacy

El permiso 25 no existía en el TPV antiguo.

Para conservar compatibilidad:

```text
empleados activos importados desde legacy
→ recibir automáticamente permiso 25
```

No modificar:

```text
IDs 1–24 existentes
```

---

# 20. Presentación de módulos sin permiso

Los cuatro módulos del dashboard siempre se muestran.

Con permiso:

```text
botón/tarjeta habilitado
```

Sin permiso:

```text
visible
deshabilitado
explicación visual / tooltip
"No tienes permiso para acceder"
```

No usar como comportamiento principal:

```text
click
→ alert de permiso denegado
```

Los guards/backend deben seguir protegiendo la acción; el estado deshabilitado es UX, no la única defensa.

---

# 21. Flag AppData.empleados

La autenticación de Gestión es independiente del flag:

```text
AppData.empleados
```

Aunque el uso de empleados esté desactivado para operaciones ordinarias:

```text
Gestión continúa protegida por autenticación
```

La zona administrativa nunca se abre anónimamente por tener ese flag desactivado.

La instalación nueva crea un empleado inicial administrador.

Si por datos anómalos no existe ningún empleado activo:

```text
→ no conceder acceso anónimo
→ mostrar estado explícito de que no hay empleados disponibles
```

No inventar un bypass inseguro.

---

# 22. Sesión de Gestión NO es empleado operativo

La sesión de Gestión sirve exclusivamente para:

```text
autorización administrativa
```

NO cambia:

```text
empleado de una venta
empleado de Caja
empleado operativo global
vendedor actual
```

Ejemplo:

```text
Amaia inicia sesión en Gestión
→ va a Ventas
→ NO se convierte automáticamente en empleado de la venta
```

La futura Caja tendrá su propio contrato de identidad/autorización cuando se diseñe.

---

# 23. Ajustes iniciales — principio de reutilización

El cliente actual tiene:

```text
installation
→ selector de modo
   → new-installation
   → legacy-import
```

La pantalla relevante para reutilización es:

```text
new-installation
```

No reutilizar el wrapper `installation`.

## 23.1 No volver a ejecutar una instalación

`InstallationService.install()` es exclusivamente de primera instalación.

En una aplicación configurada:

```text
→ NO llamar install()
→ NO recrear SQLite
→ NO ejecutar NewInstallationDataService
```

Gestión necesita una operación de:

```text
actualización de configuración
```

separada del proceso de instalación.

---

# 24. Qué reutilizar de new-installation

Reutilizar/refactorizar cuando tenga sentido:

```text
submodelos del formulario
schemas
validaciones
componentes de campos
presentación
listas IVA/RE
listas de márgenes
datos fiscales
redes
ticket
venta online
SMTP
TicketBAI
opciones
logo
```

Evitar:

```text
duplicar 25 KB de template
duplicar reglas de validación
crear dos formularios divergentes
```

Objetivo:

```text
componentes/formulario compartidos
          │
          ├── instalación inicial
          └── edición desde Gestión
```

---

# 25. Qué NO aparece en Ajustes desde Gestión

Excluir por completo del modo edición:

```text
Empleado inicial
Caja inicial
Número inicial de ticket
Número inicial de factura
```

Motivo:

```text
no son configuración editable
son datos que generan estado operativo durante la instalación
```

Cambiar posteriormente esos valores no debe:

```text
crear otro empleado inicial
reabrir/recrear Caja
rebobinar secuencias
alterar tickets/facturas ya emitidos
```

---

# 26. Datos editables en Ajustes

A priori, mantener la configuración equivalente a:

```text
Datos del negocio
  nombre
  nombre comercial
  CIF/NIF
  teléfono
  email
  dirección
  población
  logo

Redes
  Twitter
  Facebook
  Instagram
  web

Ticket
  frases
  plantilla/asunto de email

Fiscalidad
  tipo IVA
  lista IVA
  lista RE
  márgenes

Venta online
  activa
  URL API

Email SMTP
  activo
  host
  puerto
  seguridad
  usuario
  contraseña mediante reemplazo seguro

TicketBAI
  activo
  NIF
  token mediante reemplazo seguro

Opciones
  fecha de caducidad
  empleados
  backup API key mediante reemplazo seguro
```

Antes de implementar Ajustes, volver a auditar `AppData`, secretos y consumidores actuales para no dejar datos fuera.

---

# 27. Secretos en Ajustes

Mantener la separación actual entre datos públicos y secretos.

Nunca devolver al renderer el valor actual de:

```text
secret API
backup API key
SMTP password
TicketBAI token
otros secretos futuros
```

UX prevista:

```text
credencial configurada
→ indicar que existe

campo vacío
→ conservar valor actual

nuevo valor
→ reemplazar

acción explícita de borrar
→ solo si el contrato del secreto lo permite
```

No precargar secretos reales en inputs.

La actualización debe preservar secretos no modificados.

---

# 28. Logo en Ajustes

El logo debe poder cambiarse desde Ajustes.

Antes de implementar:

```text
revisar infraestructura actual de logo de instalación
revisar si conviene reutilizar staging/promote/rollback moderno
```

Preferir el patrón seguro ya utilizado en Marcas/Proveedores si encaja.

No hacer que el renderer conozca rutas físicas.

---

# 29. Sincronización tras guardar Ajustes

Guardar configuración desde Gestión debe reflejarse sin reiniciar la aplicación siempre que sea viable.

Consumidores a revisar:

```text
nombre comercial / cabecera
datos fiscales
ticket
email
venta online
TicketBAI
opciones
```

No depender de:

```text
cerrar y volver a abrir Osumi TPV
```

Si algún dato sólo puede aplicarse en el siguiente proceso por motivos técnicos reales, documentarlo explícitamente.

---

# 30. Empleados — página independiente

Ruta:

```text
/gestion/empleados
```

En la primera fase:

```text
placeholder
```

No copiar todavía el CRUD del TPV antiguo.

Cuando llegue su bloque:

```text
→ auditar backend actual
→ auditar schema
→ revisar import legacy
→ definir contrato funcional
→ diseñar CRUD nuevo
→ definir edición de admin/permisos
→ definir cambio/reset de contraseña
→ definir soft-delete
→ definir estadísticas si se mantienen
```

No inventar estas reglas antes de ese análisis específico.

---

# 31. Tipos de pago — página independiente

Ruta:

```text
/gestion/tipos-pago
```

Inicialmente:

```text
placeholder
```

La tabla SQLite ya existe.

Antes de desarrollar:

```text
→ auditar uso en Ventas
→ auditar Caja
→ auditar import legacy
→ definir CRUD
→ definir orden
→ definir afecta_caja
→ definir fisico
→ definir icono/archivo si procede
→ definir soft-delete e históricos
```

Especial cuidado:

```text
Tipos de pago afecta directamente al futuro Hito 18 — Caja
```

Por tanto, cerrar su contrato teniendo Caja en cuenta.

---

# 32. Copias de seguridad — página independiente

Ruta:

```text
/gestion/copias-seguridad
```

Inicialmente:

```text
placeholder
```

Existe una aplicación independiente:

```text
TPV Backup
```

Cuando llegue el bloque:

```text
→ revisar aplicación/servicio existente
→ diseñar solución sencilla
→ permitir subir copias de seguridad
→ definir listado
→ definir creación
→ definir borrado/retención si corresponde
→ definir autenticación mediante backup API key
```

No copiar automáticamente el flujo antiguo.

Este bloque incluye también el desarrollo/adaptación necesaria de TPV Backup.

Permiso:

```text
25
```

---

# 33. Roadmap técnico definitivo de Gestión

## 17.1 — Shell, navegación y rutas

Objetivo:

```text
activar Gestión
moverlo al extremo derecho de cabecera
crear /gestion
crear rutas hijas
crear dashboard base
crear placeholders
```

Incluye:

```text
header left / center / right
Caja en centro
Gestión derecha
routing
estructura de páginas
```

Todavía sin autenticación real si conviene separar commits.

## 17.2 — Autenticación backend de empleados

Objetivo:

```text
authenticate(idEmpleado, password)
```

Incluye:

```text
contratos
repository
application service
scrypt
bcrypt_legacy
rehash bcrypt → scrypt
contraseña legacy deshabilitada
IPC
preload
tests
```

No exponer hashes al renderer.

## 17.3 — Portada, sesión temporal y permisos de Gestión

Incluye:

```text
tarjetas empleados
colores
modal login
GestionSessionService
10 minutos
no refresh por actividad
no persistencia entre reinicios
Cambiar de empleado
admin = acceso total
permisos 18–25
nuevo permiso 25
legacy activos → permiso 25
dashboard
módulos deshabilitados por permiso
guards
tests
```

Al cerrar este bloque, el núcleo de Gestión debe ser plenamente navegable.

## 17.4 — Ajustes iniciales / configuración editable

Incluye:

```text
refactor de new-installation
componentes/formulario compartidos
modo instalación
modo edición
load configuración
update configuración
logo
secretos keep/replace
sin empleado/caja/secuencias iniciales
sin reinstalar
sin recrear SQLite
sin reinicio innecesario
tests
```

## 17.5 — Empleados

Antes de código:

```text
definir contrato detallado
```

Después:

```text
CRUD
contraseñas
color
admin
permisos
soft-delete
sincronización maestro
tests
```

Las estadísticas de Empleado se decidirán específicamente en este bloque.

## 17.6 — Tipos de pago

Antes de código:

```text
definir contrato detallado
```

Después:

```text
CRUD
orden
afecta_caja
fisico
históricos
soft-delete
sincronización
tests
```

Diseñar pensando en Caja.

## 17.7 — Copias de seguridad + TPV Backup

Antes de código:

```text
auditar TPV Backup actual
definir contrato mínimo
```

Después:

```text
cliente
servicio remoto
subida
listado
operaciones acordadas
permiso 25
errores
tests
```

Mantener solución sencilla.

## 17.8 — Regresión integral de Gestión

Validar:

```text
cabecera
posición de Gestión
selector de empleados
colores
modal login
scrypt
bcrypt legacy
rehash
contraseña no utilizable
sesión 10 min
navegación fuera/dentro
expiración
no expulsión
Cambiar empleado
admin
permisos
guards
Ajustes
Empleados
Tipos de pago
Copias
reinicio
persistencia
```

Si todo queda verde:

```text
17 Gestión ✅ CERRADO
```

Siguiente:

```text
18 Caja
```

---

# 34. Contrato visual inicial de Gestión

Las capturas del TPV antiguo sirven como referencia de concepto.

Elementos a conservar:

```text
empleados como tarjetas
color propio por empleado
modal de contraseña
saludo tras login
Cambiar de empleado
cuatro accesos principales
```

No conservar literalmente:

```text
tamaños
espaciados
botones verdes antiguos
layout exacto
modal exacto
tipografía
iconografía
```

El diseño nuevo debe encajar con:

```text
Angular Material actual
controles normalizados del cliente
estética del resto de Osumi TPV Client
```

---

# 35. Seguridad y responsabilidades

La autorización visual del renderer no basta.

Regla:

```text
UI disabled
+
guards
+
validación backend donde una operación protegida lo requiera
```

No confiar únicamente en:

```text
ocultar botones
deshabilitar botones
estado del navegador
```

La sesión temporal de Gestión es renderer-local, pero las operaciones sensibles que lo necesiten deben seguir teniendo contratos backend seguros.

La contraseña nunca debe permanecer almacenada en el renderer después del intento de login.

---

# 36. Hito 18 — Caja

Caja se desarrollará **después de Gestión**.

Está fuera del alcance de esta versión del contrato.

Antes de diseñarla:

```text
auditar módulo actual
auditar schema caja / caja_tipo / caja_recuento / movimiento_caja
auditar Ventas
auditar Tipos de pago
auditar TPV antiguo
definir flujo apertura/cierre
definir empleados y permisos
```

No adelantar decisiones funcionales de Caja durante Gestión salvo las necesarias para Tipos de pago.

---

# 37. Hito 19 — Aplicar roles globalmente

Después de:

```text
17 Gestión ✅
18 Caja ✅
```

abrir:

```text
19 Aplicar roles globalmente
```

Objetivo:

```text
usar infraestructura de autenticación/permisos
en el resto de operaciones de la aplicación
```

Auditar uno por uno:

```text
Ventas
Artículos
Marcas
Proveedores
Clientes
Almacén
Caja
otras acciones sensibles
```

No asumir que los permisos legacy 1–24 reflejan exactamente todas las necesidades del cliente nuevo.

Durante el Hito 19:

```text
→ revisar catálogo
→ conservar IDs compatibles
→ añadir permisos nuevos si son necesarios
→ aplicar protección UI + backend
→ regresión transversal
```

---

# 38. Estado resumido para relevo rápido

```text
Osumi TPV Client
Base: v2.67 + main

13 Artículos ✅
14 Clientes ✅
15 Almacén ✅
REF ✅
CTRL ✅

16 Compras 🟦 CASI CERRADO
  Pedidos 16.1–16.12 ✅
  Marcas 16.13 ✅
  Proveedores 16.14 🟦
    16.14.1–16.14.10 ✅
    16.14.11 Regresión integral ⬅️ SIGUIENTE

17 Gestión 🟨 CONTRATO DEFINIDO
  17.1 Shell + navegación + rutas
  17.2 Autenticación empleados
  17.3 Sesión + dashboard + permisos
  17.4 Ajustes iniciales
  17.5 Empleados
  17.6 Tipos de pago
  17.7 Copias + TPV Backup
  17.8 Regresión integral

18 Caja ⬜

19 Aplicar roles globalmente ⬜

Gestión:
  cabecera → extremo derecho
  /gestion + 4 páginas hijas
  empleados en tarjetas con color
  modal contraseña
  scrypt nuevo
  bcrypt legacy → rehash scrypt
  hash inválido → no login
  sesión 10 min desde login
  no refresh por actividad
  no persistencia tras cerrar app
  nunca expulsar mientras trabaja
  admin → acceso total
  permiso 18 → Ajustes
  permiso 19 → Tipos pago
  permisos 20–24 → Empleados
  permiso 25 → Copias
  legacy activos → permiso 25
  botones sin permiso visibles/deshabilitados
  AppData.empleados no desprotege Gestión
  sesión Gestión no afecta empleado operativo
  Ajustes reutiliza new-installation mediante refactor
  NO empleado inicial en edición
  NO caja inicial en edición
  NO ticket/factura inicial en edición
  secretos nunca se precargan
  otros módulos empiezan como placeholders

TicketBAI:
  ordinario ✅
  devoluciones/mixtas ⏸️ Berein

GitHub:
  SOLO LECTURA
  revisar main antes de patches
  usuario aplica/prueba/commit/push
```

---

# 39. Cómo retomar

En una conversación nueva:

1. usar este documento como contexto principal;
2. revisar `main` mediante GitHub en solo lectura;
3. confirmar que `16.14.11` sigue siendo el punto técnico inmediato;
4. completar regresión de Proveedores;
5. cerrar `16 Compras` si todo es correcto;
6. iniciar `17.1 — Shell, navegación y rutas de Gestión`;
7. no rediseñar el contrato de Gestión salvo que aparezca una contradicción real;
8. construir Empleados, Tipos de pago y Copias como páginas independientes;
9. no aplicar todavía roles de forma global;
10. desarrollar Caja después de Gestión;
11. abrir después el hito específico de roles globales;
12. mantener `DATABASE_SCHEMA_VERSION = 1`;
13. imports internos por alias absoluto;
14. todo método nuevo con JSDoc, también interfaces;
15. adaptar mocks/fakes/specs al modificar contratos;
16. esperar confirmación del usuario antes de avanzar entre bloques;
17. no tocar TicketBAI 12C.9 sin Berein.

---

# 40. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal:
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.67.

ESTADO:
- Artículos 13 ✅
- Clientes 14 ✅
- Almacén 15 ✅
- REF ✅
- CTRL ✅
- Compras:
  - Pedidos 16.1–16.12 ✅
  - Marcas 16.13 ✅
  - Proveedores 16.14 🟦
    - 16.14.1–16.14.10 ✅
    - 16.14.11 Regresión integral ⬅️ SIGUIENTE

ORDEN POSTERIOR:
17 Gestión
18 Caja
19 Aplicar roles globalmente

GESTIÓN — CONTRATO CERRADO:
- Gestión queda al extremo derecho de la cabecera.
- Caja permanece en navegación central.
- Rutas:
  /gestion
  /gestion/ajustes
  /gestion/empleados
  /gestion/tipos-pago
  /gestion/copias-seguridad
- Los cuatro destinos son páginas independientes, no pestañas.
- Empleados/Tipos pago/Copias empiezan como placeholders.
- Portada sin sesión: tarjetas de empleados con su color.
- Click empleado → modal contraseña.
- Login backend seguro.
- Nuevo: scrypt.
- Legacy: bcrypt_legacy válido → login + rehash automático a scrypt.
- Password legacy inválido → empleado visible pero no puede autenticarse.
- Sesión Gestión en memoria: 10 minutos desde login.
- No se renueva por actividad.
- No persiste al cerrar app.
- Nunca se expulsa al usuario de una pantalla ya abierta.
- La expiración se comprueba al volver a acceder al área protegida.
- “Cambiar de empleado” limpia sesión.
- admin=true → acceso total.
- 18 → Ajustes.
- 19 → Tipos pago.
- 20–24 → Empleados.
- Nuevo 25 → Copias de seguridad.
- Empleados activos importados legacy reciben 25.
- Módulos sin permiso: visibles pero deshabilitados.
- AppData.empleados no desprotege Gestión.
- La sesión Gestión no cambia el empleado operativo de Ventas/Caja.
- Ajustes reutilizará/refactorizará new-installation.
- Ajustes NO incluye empleado inicial, caja inicial ni numeraciones iniciales.
- No volver a ejecutar InstallationService.install().
- Secretos actuales nunca se muestran al renderer; vacío=conservar, nuevo=reemplazar.
- No aplicar roles globalmente hasta después de Gestión y Caja.

ROADMAP GESTIÓN:
17.1 Shell + navegación + rutas
17.2 Autenticación backend
17.3 Portada + sesión + permisos
17.4 Ajustes iniciales
17.5 Empleados
17.6 Tipos de pago
17.7 Copias de seguridad + TPV Backup
17.8 Regresión integral

GITHUB:
- osumionline/Osumi-TPV-Client
- main
- SOLO LECTURA
- ChatGPT analiza/propuesta
- yo aplico/pruebo/commit/push

REGLAS:
- Angular standalone + signals + zoneless
- imports internos por alias absoluto
- un export → default
- varios exports → named
- JSDoc en métodos nuevos e interfaces
- DATABASE_SCHEMA_VERSION = 1
- esperar confirmación antes de avanzar
- no tocar TicketBAI 12C.9 sin Berein
```

---

# 41. Historial reciente

| Versión | Fecha | Cambio principal |
|---|---|---|
| **2.63** | 15/09/2026 | GitHub connector y política estricta de solo lectura |
| **2.64** | 15/09/2026 | 16.13 Marcas completamente cerrado |
| **2.65** | 15/09/2026 | Contrato y roadmap de 16.14 Proveedores |
| **2.66** | 16/09/2026 | 16.14.1–16.14.10 implementados; siguiente 16.14.11 |
| **2.67** | 16/09/2026 | Roadmap global Gestión → Caja → Roles; contrato y roadmap completo de Gestión |

---

**Fin del documento de continuidad v2.67.**
