# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.68  
**Fecha:** 16 de septiembre de 2026  
**Base de continuidad:** `v2.68 + main` una vez este documento se suba al repositorio.  
**Documento anterior:** `Osumi_TPV_Client_Documento_Continuidad_v2.67.md`

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

16 Compras                                        ✅ HITO CERRADO
  16.1–16.12 Pedidos                              ✅
  16.13 Marcas                                    ✅
  16.14 Proveedores                               ✅
    16.14.1–16.14.11                              ✅

17 Gestión                                        🟦 EN DESARROLLO
  17.1 Shell + navegación + rutas                 ✅
  17.2 Autenticación backend de empleados         ✅
  17.3 Portada + sesión + permisos                ⬅️ SIGUIENTE
  17.4 Ajustes iniciales                          ⬜
  17.5 Empleados                                  ⬜
  17.6 Tipos de pago                              ⬜
  17.7 Copias de seguridad + TPV Backup           ⬜
  17.8 Regresión integral                         ⬜

18 Caja                                           ⬜ PENDIENTE
19 Aplicar roles globalmente                      ⬜ PENDIENTE

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

`16 — Compras` queda completamente cerrado tras superar la regresión integral de Proveedores.

`17.1` y `17.2` están implementados, probados y subidos a `main`.

El siguiente bloque es:

```text
17.3 — Portada de Gestión + sesión temporal + permisos
```

TicketBAI ordinario permanece cerrado. `12C.9 — TicketBAI devoluciones/mixtas` sigue bloqueado hasta recibir respuesta o documentación actualizada de Berein.

No reabrir hitos cerrados salvo regresión real demostrada.

---

# 2. Orden global de desarrollo

Orden fijado:

```text
17 Gestión
   ↓
18 Caja
   ↓
19 Aplicar roles globalmente
```

Durante Gestión se construye la infraestructura de autenticación, sesión, `admin` y permisos necesaria para el propio apartado.

Los permisos históricos no se aplicarán todavía de forma transversal a Ventas, Artículos, Clientes, Compras, etc.

Ese trabajo queda reservado para:

```text
19 — Aplicar roles globalmente
```

---

# 3. Punto exacto de continuación

Siguiente mini-hito:

```text
17.3 — Portada + sesión temporal + permisos de Gestión
```

Objetivo:

```text
/gestion
→ mostrar empleados si no hay sesión válida
→ autenticar mediante el backend ya terminado
→ crear sesión temporal en memoria
→ mostrar dashboard si hay sesión válida
→ aplicar permisos a los cuatro accesos
→ permitir cambiar de empleado
→ proteger rutas hijas
```

Todavía NO desarrollar:

```text
CRUD de Empleados
CRUD de Tipos de pago
Ajustes reales
TPV Backup
roles globales
Caja
```

---

# 4. Repositorios

Cliente actual:

```text
https://github.com/osumionline/Osumi-TPV-Client
main
```

TPV antiguo — referencia funcional:

```text
Frontend:
https://github.com/osumionline/Osumi-TPV

Backend:
https://github.com/osumionline/TPV-API
```

SDK TicketBAI:

```text
https://github.com/osumionline/ticketbaiws
```

GitHub se usa exclusivamente en modo lectura.

El usuario aplica, prueba, hace commit y push.

---

# 5. Convenciones obligatorias

- Angular standalone.
- Angular 22.
- Signals.
- Aplicación zoneless.
- `@if`, `@for`, `@switch`.
- TypeScript estricto.
- No usar `any`.
- Preferir `inject()`.
- Evitar `@HostListener`.
- Imports internos por alias absoluto.
- Un solo export → `default`.
- Varios exports → named.
- Métodos nuevos con JSDoc breve.
- También métodos nuevos en interfaces con JSDoc.
- `DATABASE_SCHEMA_VERSION = 1`.
- No crear migraciones antes de la primera versión estable.

Preferencia de ritmo de trabajo:

```text
bloques autocontenidos de tamaño medio
→ suficientemente completos para un commit lógico
→ evitar tanto macro-bloques enormes como micro-pasos de un único archivo
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

# 6. Hito 16 — Compras

Estado final:

```text
16 Compras ✅ CERRADO
```

Incluye:

```text
Pedidos
Marcas
Proveedores
Comerciales
logos
relaciones Marca ↔ Proveedor
soft-delete
sincronización global
referencias históricas
integración con Artículos
regresión integral
```

No reabrir salvo regresión real.

---

# 7. Gestión — contrato funcional general

En el TPV antiguo este apartado se llamaba:

```text
Configuración
```

En el nuevo:

```text
Gestión
```

La idea funcional se conserva, pero el diseño se moderniza.

Cabecera deseada:

```text
Tienda          Ventas | Artículos | Compras | Clientes | Almacén | Caja          Gestión
```

Reglas:

```text
nombre tienda → izquierda
navegación operativa → centrada
Gestión → extremo derecho
Caja → bloque central
```

---

# 8. 17.1 — Shell, navegación y rutas ✅

Implementado y cerrado.

Gestión ya está activa en la cabecera y situada a la derecha mediante una estructura real de tres zonas.

Rutas actuales:

```text
/gestion
/gestion/ajustes
/gestion/empleados
/gestion/tipos-pago
/gestion/copias-seguridad
```

Arquitectura:

```text
management-shell
→ cabecera común
→ router-outlet
```

Las páginas hijas son rutas independientes, no pestañas.

Estado actual:

```text
/gestion
→ dashboard base

/gestion/ajustes
/gestion/empleados
/gestion/tipos-pago
/gestion/copias-seguridad
→ placeholders
```

En 17.3 el dashboard actual se adaptará para mostrar primero el selector de empleados cuando no exista sesión válida.

---

# 9. Maestro global de empleados

El renderer ya dispone de:

```text
EmpleadosService
```

con maestro global cargado en startup.

Datos públicos por empleado:

```text
id
publicId
nombre
hasPassword
color
admin
permisos
```

El color llega al renderer ya como color CSS:

```text
#RRGGBB
```

Gestión debe reutilizar este maestro.

No crear una segunda caché específica para Gestión.

---

# 10. 17.2 — Autenticación backend de empleados ✅

Este bloque está terminado, probado y subido a `main`.

Se añadió autenticación segura de empleados sin exponer credenciales al renderer.

Contrato principal:

```text
authenticate(idEmpleado, password)
```

Resultado posible:

```text
authenticated
invalid_password
password_unavailable
employee_unavailable
```

El renderer nunca recibe:

```text
password_hash
password_algorithm
```

---

# 11. Contratos de autenticación

Contratos públicos:

```text
electron/contracts/empleados/
  autenticar-empleado-command.interface.ts
  autenticar-empleado-result.type.ts
  empleados-api.interface.ts
```

Command:

```text
idEmpleado
password
```

Resultado:

```text
status
```

La API pública de empleados dispone ahora de:

```text
getAll()
authenticate()
```

---

# 12. Credenciales internas

Se añadió un record exclusivamente interno al proceso main:

```text
EmpleadoAuthenticationRecord
```

Campos:

```text
id
passwordHash
passwordAlgorithm
passwordAvailable
```

Algoritmos permitidos:

```text
scrypt
bcrypt_legacy
```

Este record no forma parte de la API pública Electron.

---

# 13. Repository de empleados

`EmpleadoRepository` dispone ahora de:

```text
findAll()

findAuthenticationById(idEmpleado)

upgradeLegacyPassword(
  idEmpleado,
  expectedLegacyHash,
  newScryptHash
)
```

`findAuthenticationById()`:

```text
→ sólo empleado activo
→ deleted_at IS NULL
→ devuelve credenciales internas
→ detecta contraseña legacy deshabilitada
```

`upgradeLegacyPassword()`:

```text
→ sólo bcrypt_legacy
→ sólo si el hash esperado sigue siendo el actual
→ actualiza a scrypt
→ compare-and-swap
```

Esto evita sobrescribir una contraseña cambiada concurrentemente.

---

# 14. Contraseñas nuevas y legacy

Instalaciones nuevas:

```text
scrypt
```

Se reutiliza:

```text
PasswordHasher
NodeScryptPasswordHasher
```

Legacy válido:

```text
password_algorithm = bcrypt_legacy
```

Se añadió:

```text
LegacyPasswordVerifier
BcryptLegacyPasswordVerifier
bcryptjs
```

Se normaliza:

```text
$2y$ → $2b$
```

para hashes provenientes de implementaciones PHP.

---

# 15. Rehash automático legacy → scrypt

Login correcto de un empleado legacy:

```text
1. verificar bcrypt
2. generar hash scrypt
3. actualizar password_hash
4. actualizar password_algorithm = scrypt
5. completar login
```

Migración transparente:

```text
primer login correcto
→ contraseña modernizada
```

Login bcrypt incorrecto:

```text
→ invalid_password
→ NO rehash
```

---

# 16. Contraseña legacy no utilizable

La importación legacy utiliza un hash sentinel para representar contraseñas imposibles de conservar.

Regla actual:

```text
passwordAvailable = false
```

En ese caso:

```text
authenticate()
→ password_unavailable
```

No se intenta verificar el sentinel con bcrypt.

En 17.3 la UI mostrará un mensaje claro indicando que un administrador debe asignar una nueva contraseña.

---

# 17. Seguridad IPC y renderer bridge

La autenticación está expuesta a través de:

```text
IPC
preload
renderer service
```

El handler mantiene:

```text
assertTrustedSender
getMainWindow
```

El bloque público `empleados` del preload sigue usando:

```text
Object.freeze
```

`src/app/services/empleados/empleados.service.ts` dispone ahora de:

```text
authenticate(idEmpleado, password)
```

Los componentes de Gestión deberán usar este servicio.

No llamar directamente a `window.osumiDesktop.empleados.authenticate()` desde componentes.

---

# 18. Tests de 17.2

Cobertura añadida y superada.

`EmpleadosService` cubre:

```text
getAll transforma correctamente empleados
scrypt correcto / incorrecto
bcrypt legacy correcto / incorrecto
rehash legacy → scrypt
password_unavailable
employee_unavailable
password vacío
idEmpleado inválido
```

`TypeOrmEmpleadoRepository` cubre:

```text
credencial scrypt activa
credencial bcrypt legacy activa
sentinel legacy
empleado inactivo
empleado eliminado
upgrade bcrypt → scrypt
compare-and-swap si cambió el hash
```

`BcryptLegacyPasswordVerifier` debe mantenerse cubierto para:

```text
password correcta
password incorrecta
prefijo $2y$
hash malformado
```

Toda la batería habitual pasó correctamente antes del push de 17.2.

---

# 19. 17.3 — Portada + sesión + permisos ⬅️ SIGUIENTE

Este es el siguiente bloque.

Debe incorporar:

```text
selector de empleados
tarjetas con color
modal de contraseña
mensajes de error
sesión Gestión
expiración
dashboard autenticado
Cambiar de empleado
admin
permisos 18–25
guards
permiso 25 legacy
```

No desarrollar todavía el contenido real de los cuatro módulos.

---

# 20. Portada sin sesión

Al entrar en `/gestion` sin sesión válida:

```text
→ mostrar empleados activos
→ tarjetas
→ fondo = empleado.color
→ texto = empleado.textColor
```

Click en empleado:

```text
→ abrir modal
→ nombre del empleado
→ input password
→ foco automático
→ autenticar
```

No pedir usuario manualmente.

El empleado ya ha sido seleccionado mediante su tarjeta.

---

# 21. Resultado del login en UI

`authenticated`:

```text
→ crear sesión Gestión
→ cerrar modal
→ mostrar dashboard
```

`invalid_password`:

```text
→ mantener modal
→ mostrar "Contraseña incorrecta"
```

`password_unavailable`:

```text
→ informar:
"Este empleado no tiene una contraseña válida.
Un administrador debe asignarle una nueva contraseña."
```

`employee_unavailable`:

```text
→ informar que el empleado ya no está disponible
→ reconciliar/recargar maestro si procede
```

No mostrar información técnica del backend.

---

# 22. Sesión temporal de Gestión

Crear:

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
10 minutos exactos desde el login
```

No se renueva por actividad.

Ejemplo:

```text
login 10:00
expiresAt 10:10
```

aunque haya actividad continua.

---

# 23. Persistencia y expiración

La sesión vive exclusivamente:

```text
en memoria del renderer
```

No usar:

```text
SQLite
localStorage
archivo
AppData
```

Cerrar la aplicación:

```text
→ sesión perdida
```

No expulsar jamás al usuario de una página que ya está usando.

Ejemplo:

```text
10:00 login
10:03 entra en /gestion/ajustes
10:10 expira sesión
10:20 sigue trabajando en ajustes
→ NO redirigir
→ NO cerrar formulario
```

La expiración se evalúa al intentar volver a entrar en el área protegida.

Ejemplo:

```text
10:20 intenta /gestion/empleados
→ sesión expirada
→ /gestion
→ selector de empleados
```

No usar timers automáticos de logout.

---

# 24. Dashboard autenticado

Tras login:

```text
Hola <nombre>, elige una de las siguientes opciones:
```

Mostrar:

```text
Cambiar de empleado
```

Módulos:

```text
Ajustes iniciales
Empleados
Tipos de pago
Copias de seguridad
```

`Cambiar de empleado`:

```text
→ limpiar sesión
→ volver inmediatamente al selector
```

---

# 25. Admin

Regla cerrada:

```text
empleado.admin === true
→ acceso total en Gestión
```

No necesita tener físicamente todos los permisos en `empleado_permiso`.

Semántica deseada del modelo:

```text
hasPerm(id)
→ admin || permisos.includes(id)

hasAnyPerm(ids)
→ admin || ids.some(...)
```

Antes de modificar el modelo `Empleado`, revisar su implementación real en `main`.

---

# 26. Permisos de Gestión

IDs históricos:

```text
18 → Modificar ajustes generales
19 → Modificar tipos de pago
20 → Crear empleados
21 → Modificar empleados
22 → Borrar empleados
23 → Modificar permisos de empleados
24 → Consultar estadísticas de empleados
```

Acceso al módulo Empleados:

```text
admin
O cualquiera de 20–24
```

Nuevo:

```text
25 → Gestionar copias de seguridad
```

---

# 27. Permiso 25 e importación legacy

El permiso 25 no existía en el TPV antiguo.

Compatibilidad acordada:

```text
todos los empleados activos importados desde legacy
→ reciben automáticamente permiso 25
```

Objetivo:

```text
no quitar a empleados legacy una capacidad
que antes tenían en Configuración → Backup
```

Antes de implementar, auditar el importador actual y añadir el permiso en el punto correcto de importación.

No cambiar los IDs históricos 1–24.

---

# 28. Módulos sin permiso

Los cuatro accesos siempre deben mostrarse.

Con permiso:

```text
habilitado
```

Sin permiso:

```text
visible
deshabilitado
tooltip / ayuda:
"No tienes permiso para acceder"
```

La protección real debe mantenerse también en routing/guards y, cuando corresponda, backend.

---

# 29. AppData.empleados

Gestión sigue protegida aunque:

```text
AppData.empleados = false
```

Ese flag controla el uso operativo de empleados, no la seguridad administrativa.

Nunca conceder acceso anónimo a Gestión por tener ese flag desactivado.

Si no existe ningún empleado activo por datos anómalos:

```text
→ mostrar estado explícito
→ no crear bypass inseguro
```

---

# 30. Sesión Gestión ≠ empleado operativo

La sesión administrativa no cambia:

```text
empleado de una venta
empleado de Caja
vendedor actual
empleado global operativo
```

Caja tendrá su propio contrato cuando se desarrolle.

---

# 31. Guards previstos para 17.3

Las rutas hijas:

```text
/gestion/ajustes
/gestion/empleados
/gestion/tipos-pago
/gestion/copias-seguridad
```

deben requerir sesión Gestión válida al entrar.

Además, cada ruta debe exigir su permiso correspondiente.

Si falla sesión:

```text
→ /gestion
```

Si hay sesión pero falta permiso:

```text
→ evitar entrada
→ volver al dashboard Gestión
```

No hace falta comprobar continuamente mientras la página está abierta.

---

# 32. 17.4 — Ajustes iniciales

Después de 17.3.

Reutilizar/refactorizar:

```text
new-installation
```

No reutilizar `InstallationService.install()` en una instalación ya configurada.

Crear un flujo real de actualización de configuración.

Excluir del modo edición:

```text
Empleado inicial
Caja inicial
Número inicial de ticket
Número inicial de factura
```

Porque son estado inicial, no configuración mutable.

Secretos actuales nunca se devuelven al renderer.

Regla UX:

```text
campo vacío → conservar
nuevo valor → reemplazar
```

---

# 33. 17.5 — Empleados

Página:

```text
/gestion/empleados
```

Antes de implementar:

```text
auditar schema
auditar modelo
auditar import legacy
definir CRUD
definir reset/cambio contraseña
definir color
definir admin
definir permisos
definir soft-delete
definir estadísticas
```

No asumir todavía el contrato exacto.

---

# 34. 17.6 — Tipos de pago

Página:

```text
/gestion/tipos-pago
```

Antes de implementar:

```text
auditar uso actual en Ventas
auditar schema
auditar import legacy
auditar futura Caja
```

Definir específicamente:

```text
nombre
orden
afecta_caja
fisico
icono/archivo
soft-delete
históricos
```

Este módulo debe diseñarse pensando en el futuro Hito 18 — Caja.

---

# 35. 17.7 — Copias de seguridad + TPV Backup

Página:

```text
/gestion/copias-seguridad
```

Incluye revisión/desarrollo de la aplicación independiente:

```text
TPV Backup
```

Objetivo general:

```text
solución sencilla
subida de copias
listado
operaciones mínimas necesarias
autenticación mediante backup API key
```

Permiso:

```text
25
```

---

# 36. 17.8 — Regresión integral de Gestión

Debe cubrir:

```text
cabecera
Gestión a la derecha
selector de empleados
colores
modal
scrypt
bcrypt legacy
rehash automático
password_unavailable
employee_unavailable
sesión 10 min
navegación fuera/dentro
expiración
no expulsión
cambiar empleado
admin
permisos
guards
Ajustes
Empleados
Tipos de pago
Copias
reinicio
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

# 37. Hito 18 — Caja

Caja se desarrollará después de Gestión.

Antes de código:

```text
auditar schema:
caja
caja_tipo
caja_recuento
movimiento_caja

auditar:
Ventas
Tipos de pago
TPV antiguo
empleados
permisos
```

No cerrar decisiones de Caja antes de esa auditoría.

---

# 38. Hito 19 — Aplicar roles globalmente

Después de:

```text
17 Gestión ✅
18 Caja ✅
```

abrir:

```text
19 Aplicar roles globalmente
```

Aplicar la infraestructura de permisos a:

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

Conservar IDs históricos cuando sean compatibles.

---

# 39. TicketBAI

Estado:

```text
12C.8 ordinario ✅
12C.9 devoluciones/mixtas ⏸️ Berein
12C.10 regresión final ⬜
```

No tocar `12C.9` hasta recibir respuesta/documentación de Berein.

---

# 40. Resumen rápido para relevo

```text
Base: v2.68 + main

16 Compras ✅ CERRADO

17 Gestión 🟦
  17.1 Shell + navegación + rutas ✅
  17.2 Autenticación backend ✅
  17.3 Portada + sesión + permisos ⬅️ SIGUIENTE
  17.4 Ajustes iniciales ⬜
  17.5 Empleados ⬜
  17.6 Tipos de pago ⬜
  17.7 Copias + TPV Backup ⬜
  17.8 Regresión integral ⬜

Autenticación disponible:
  scrypt ✅
  bcrypt_legacy ✅
  $2y$ normalizado ✅
  rehash bcrypt → scrypt ✅
  password_unavailable ✅
  employee_unavailable ✅
  IPC/preload/renderer bridge ✅
  tests service/repository/verifier ✅

17.3 debe añadir:
  selector tarjetas
  modal password
  GestionSessionService
  10 min desde login
  no refresh por actividad
  no persistencia
  no auto-expulsión
  saludo
  Cambiar empleado
  admin acceso total
  permisos 18–25
  permiso 25 legacy
  botones sin permiso deshabilitados
  guards

Después:
  17.4 Ajustes
  17.5 Empleados
  17.6 Tipos pago
  17.7 Copias
  17.8 Regresión

Luego:
  18 Caja
  19 Roles globales
```

---

# 41. Cómo retomar

En una conversación nueva:

1. usar este documento como contexto principal;
2. revisar `main` en GitHub, sólo lectura;
3. confirmar que `17.3` sigue siendo el punto exacto;
4. no rehacer 17.1 ni 17.2 salvo regresión;
5. reutilizar `EmpleadosService.authenticate()` desde renderer;
6. no exponer hashes ni algoritmos al renderer;
7. crear sesión Gestión únicamente en memoria;
8. duración fija de 10 minutos desde login;
9. no renovar por actividad;
10. no expulsar mientras el usuario trabaja;
11. aplicar `admin` + permisos sólo al área Gestión;
12. añadir permiso 25 a empleados legacy activos;
13. no aplicar todavía roles globalmente;
14. mantener `DATABASE_SCHEMA_VERSION = 1`;
15. imports internos por alias absoluto;
16. JSDoc en métodos nuevos e interfaces;
17. entregar bloques autocontenidos de tamaño medio;
18. esperar confirmación del usuario antes de avanzar;
19. no tocar TicketBAI 12C.9 sin Berein.

---

# 42. Prompt de arranque recomendado

```text
Estoy continuando el desarrollo de Osumi TPV Client.

Usa como contexto principal:
“Osumi TPV Client — Documento de continuidad y relevo”, versión 2.68.

ESTADO:
- Compras 16 ✅ CERRADO.
- Gestión 17:
  - 17.1 Shell + navegación + rutas ✅
  - 17.2 Autenticación backend de empleados ✅
  - 17.3 Portada + sesión + permisos ⬅️ SIGUIENTE
  - 17.4 Ajustes iniciales ⬜
  - 17.5 Empleados ⬜
  - 17.6 Tipos de pago ⬜
  - 17.7 Copias + TPV Backup ⬜
  - 17.8 Regresión integral ⬜

AUTENTICACIÓN YA IMPLEMENTADA:
- EmpleadosService backend authenticate().
- scrypt para instalaciones nuevas.
- bcryptjs para bcrypt_legacy.
- $2y$ normalizado a $2b$.
- login bcrypt correcto → rehash automático a scrypt.
- contraseña legacy deshabilitada → password_unavailable.
- empleado no disponible → employee_unavailable.
- hashes y algoritmos nunca salen al renderer.
- IPC/preload ya expone authenticate().
- renderer EmpleadosService ya tiene authenticate(id,password).
- tests backend/repository/verifier verdes.

CONTRATO 17.3:
- /gestion sin sesión → tarjetas empleados.
- click → modal password.
- sesión renderer en memoria.
- duración 10 min exactos desde login.
- no refresh por actividad.
- no persistencia tras cerrar app.
- no auto-expulsar de una página abierta.
- comprobar expiración al entrar/reentrar al área protegida.
- dashboard autenticado con saludo + Cambiar empleado.
- admin=true → acceso total.
- 18 Ajustes.
- 19 Tipos pago.
- 20–24 Empleados.
- 25 Copias.
- activos importados legacy reciben permiso 25.
- módulos sin permiso visibles/deshabilitados.
- guards para rutas hijas.
- AppData.empleados no desprotege Gestión.
- sesión Gestión no afecta empleado operativo.

ORDEN:
17 Gestión
→ 18 Caja
→ 19 Aplicar roles globalmente

GITHUB:
- osumionline/Osumi-TPV-Client
- main
- SOLO LECTURA
- ChatGPT analiza/propuesta
- usuario aplica/prueba/commit/push

REGLAS:
- Angular standalone + signals + zoneless.
- imports internos por alias absoluto.
- un export → default.
- varios exports → named.
- JSDoc en métodos nuevos e interfaces.
- DATABASE_SCHEMA_VERSION = 1.
- bloques autocontenidos de tamaño medio.
- esperar confirmación antes de avanzar.
- no tocar TicketBAI 12C.9 sin Berein.
```

---

# 43. Historial reciente

| Versión | Fecha | Cambio principal |
|---|---|---|
| **2.64** | 15/09/2026 | Marcas 16.13 completamente cerrado |
| **2.65** | 15/09/2026 | Contrato y roadmap de Proveedores |
| **2.66** | 16/09/2026 | Proveedores 16.14.1–16.14.10 implementados |
| **2.67** | 16/09/2026 | Roadmap Gestión → Caja → Roles y contrato completo de Gestión |
| **2.68** | 16/09/2026 | Compras cerrado; Gestión 17.1 y 17.2 terminados; siguiente 17.3 |

---

**Fin del documento de continuidad v2.68.**
