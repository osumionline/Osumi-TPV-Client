# Osumi TPV Client — Documento de continuidad v2.88

**Fecha:** 7 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** `https://github.com/osumionline/Osumi-TPV-Client`  
**Repositorio TPV Backup API:** `https://github.com/osumionline/TPV-Backup-API`  
**Repositorio TPV Backup Front:** `https://github.com/osumionline/TPV-Backup-Front`

Este documento actualiza y sustituye como referencia principal de continuidad a:

```text
docs/osumi-tpv-continuidad-v2.87.md
```

La fuente de verdad para continuar el desarrollo será siempre:

```text
main actual de los repositorios
+
este documento
+
la conversación activa
```

El documento:

```text
docs/tpv-backup-contexto-tecnico-v1.0.md
```

sigue siendo útil como referencia histórica del arranque de TPV Backup, pero muchos de sus apartados han quedado superados por la implementación y las decisiones descritas aquí.

---

# 1. Objetivo de este documento

Esta versión deja fijado el estado de Osumi TPV después de:

- cerrar completamente `21.7 — Seguridad / integridad / retención`;
- ejecutar y cerrar la regresión funcional global `21.8`;
- corregir durante esa regresión dos problemas reales de estado/UI;
- validar en producción/pruebas reales integridad, recovery, expiración, revocación, rotación y retención;
- diseñar el nuevo bloque `21.9 — Backups remotos automáticos`;
- acordar que la hora del backup automático será configurable por instalación;
- fijar `03:00` como valor por defecto, pero no como hora rígida del sistema.

El propósito es que una conversación nueva pueda retomar el trabajo sin reconstruir decisiones anteriores ni reabrir cuestiones ya cerradas.

---

# 2. Forma de trabajo acordada

El desarrollo se realiza de forma incremental, controlada y verificable.

## 2.1. Unidad de trabajo

Cada propuesta debe ser una unidad pequeña y coherente.

No significa necesariamente un archivo por mensaje: se pueden agrupar varios archivos cuando todos forman parte de una misma responsabilidad.

Reglas:

- agrupar únicamente cambios que pertenezcan al mismo bloque;
- evitar cambios masivos;
- evitar refactors no relacionados;
- evitar fragmentar artificialmente una modificación sencilla;
- cada bloque debe poder probarse antes de continuar;
- no continuar si hay errores de compilación, tests o lint;
- realizar prueba funcional real cuando el cambio afecta a backups, restore, filesystem, red, credenciales o persistencia.

## 2.2. Antes de proponer código

Siempre:

1. revisar el `main` actual;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, helpers, contratos, campos ni APIs;
4. comprobar el comportamiento real de las capas existentes;
5. reutilizar pipelines existentes en lugar de crear sistemas paralelos;
6. distinguir decisiones cerradas de propuestas futuras;
7. después de cada push confirmado por el usuario, volver a revisar `main`.

## 2.3. Entrega de cambios

Para archivos nuevos:

> indicar ruta exacta y contenido completo.

Para archivos existentes:

> indicar ruta, bloque claramente identificable y reemplazo exacto.

## 2.4. GitHub

Uso desde ChatGPT estrictamente de solo lectura.

No crear ni modificar remotamente:

- commits;
- ramas;
- pull requests;
- issues;
- comentarios;
- archivos.

El usuario aplica los cambios localmente, ejecuta pruebas y hace push.

## 2.5. Batería estable del Client

Cuando un bloque del Client se considere estable:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

No sustituir esta batería por subconjuntos cuando se pida la validación final del bloque.

Para TPV Backup API:

```bash
composer test
```

Para TPV Backup Front:

```bash
npm test
npm run build
npm run lint
```

---

# 3. Reglas permanentes de código

## 3.1. JSDoc / PHPDoc

Regla expresa:

> Todo método creado o modificado debe tener JSDoc/PHPDoc.

También los métodos introducidos en interfaces o contratos.

## 3.2. Exports TypeScript

Convención expresa del proyecto:

```text
1 único símbolo exportado
→ export default

2 o más símbolos exportados
→ todos exports nominales
→ nunca export default
```

No volver a mezclar ambas estrategias en un mismo archivo.

## 3.3. Angular

Referencia actual:

```text
Angular 22+
standalone
zoneless
signals
Signal Forms
```

Convenciones:

- `inject()` para DI;
- `input()` / `output()` signals;
- signal queries;
- `@if`, `@for`, `@switch`;
- tipado estricto;
- evitar `any`;
- usar `unknown` cuando corresponda;
- aliases de `tsconfig`;
- Angular Material;
- `MatTooltip` en lugar de `title`;
- no `NgModule`;
- no `CommonModule` salvo necesidad real;
- no `HostBinding` / `HostListener`;
- no `ngClass` / `ngStyle`;
- WCAG AA;
- Prettier organiza imports.

---

# 4. HEADs verificados al generar v2.88

## 4.1. Osumi TPV Client

```text
f61611c8d68ac9e5456104a192086d0c4eaaca74
Correcciones de estado caducado en backups 21.8.2a
```

Commit anterior de continuidad:

```text
346166ddf65cb2b52f28c0f3b5a615d336b8cfa1
Actualizado documento de continuidad tras 21.7.1
```

El commit actual modifica:

```text
electron/backend/application/backup/backup-remote.service.spec.ts
electron/backend/application/backup/backup-remote.service.ts
src/app/modules/gestion/pages/management-backups/management-backups.component.spec.ts
src/app/modules/gestion/pages/management-backups/management-backups.component.ts
```

## 4.2. TPV Backup API

```text
d1d3bdcde95d0e7d848347ec434b499025caa1b5
Tarea de reconciliacion 21.7.3a
```

Commit anterior relevante:

```text
1ba68110749b6c647c7c868d1db00cf7d429b074
Verificar el SHA 21.7.1
```

## 4.3. TPV Backup Front

```text
1be138f8e280646b9419f9fe60287111174e890e
Corrección en mensaje al desactivar subscripción
```

Commit anterior relevante:

```text
469109cf3d0c7f3ab2170273f7a56d5338052b68
Actualizo pagina de auditoria
```

---

# 5. Estado general de hitos

```text
✅ Hito 16 — Compras
✅ Hito 17 — Gestión
✅ Hito 18 — Caja base
✅ Empleado por venta
✅ Hito 19 — Permisos
✅ Hito 20 — Caja > Informes

▶️ Hito 21 — TPV Backup
   ✅ 21.1 Especificación `.otpv` v3
   ✅ 21.2 Exportador nativo del Client
   ✅ 21.3 Restauración nativa v3
   ✅ 21.4 Nueva app TPV Backup
   ✅ 21.5 API remota
   ✅ 21.6 Integración Client ↔ TPV Backup
   ✅ 21.7 Seguridad / integridad / retención
   ✅ 21.8 Regresión recuperación global
   ▶️ 21.9 Backups remotos automáticos
      ⏳ 21.9.1 Configuración de hora
      ⏳ 21.9.2 Estado persistente del scheduler
      ⏳ 21.9.3 Ejecución automática
      ⏳ 21.9.4 Ciclo de vida Electron
      ⏳ 21.9.5 UI informativa
      ⏳ 21.9.6 Regresión funcional

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

El Hito 21 ya no puede considerarse cerrado porque se ha añadido expresamente `21.9`.

---

# 6. Arquitectura actual de TPV Backup

La solución está dividida en tres aplicaciones.

## 6.1. Osumi TPV Client

Responsabilidades:

- crear `.otpv`;
- restaurar `.otpv`;
- almacenar de forma segura la TPV Backup key;
- configurar credenciales remotas `Key ID + Secret`;
- autenticar contra TPV Backup;
- crear y subir backups remotos;
- listar backups remotos;
- descargar backups remotos;
- borrar backups remotos;
- restaurar una instalación limpia directamente desde TPV Backup;
- próximamente programar backups remotos automáticos diarios.

## 6.2. TPV Backup API

Responsabilidades:

- autenticar instalaciones;
- emitir JWT de corta duración;
- revalidar estado administrativo por request;
- aplicar ownership;
- almacenar blobs cifrados;
- validar estructura pública del `.otpv`;
- persistir metadatos;
- aplicar retención;
- servir descargas;
- borrar backups;
- registrar auditoría;
- reconciliar metadata y storage;
- administrar suscripciones, instalaciones y credenciales.

## 6.3. TPV Backup Front

Panel administrativo para:

- login de administración;
- dashboard;
- suscripciones;
- instalaciones;
- credenciales;
- backups;
- auditoría;
- descarga y borrado administrativo.

## 6.4. Principio zero-knowledge

El servidor almacena el `.otpv` cifrado pero no conoce la clave necesaria para abrir el payload funcional.

Regla estructural:

```text
TPV Backup API
→ nunca recibe la TPV Backup key
→ nunca puede descifrar payload.enc
```

---

# 7. Versiones relevantes

## 7.1. Client

Referencia actual:

```text
Angular                 22.2.1
Angular Material        22.2.1
Electron                ^44.5.1
TypeScript              ~6.0.2
Node types              ^26.6.4
better-sqlite3          ^12.11.1
typeorm                 ^1.1.1
yauzl                   ^3.4.0
yazl                    ^3.3.1
@osumi/angular-tools    ^1.5.2
@osumi/ticketbaiws      ^1.0.1
npm                     12.2.0
```

## 7.2. TPV Backup Front

```text
Angular                 22.2.1
Angular Material        22.2.1
TypeScript              ~6.0.2
npm                     12.2.0
```

## 7.3. TPV Backup API

```text
PHP                     >= 8.5
Osumi Framework         ^9.10.1
plugin-token            ^3.0
PHPUnit                 ^13.3
```

Osumi Framework 9.10.0 introdujo `OStreamResponse`.

Osumi Framework 9.10.1 corrigió la propagación de `OCore::setHttpStatus()` en middleware/respuesta.

---

# 8. Dominios y endpoints

Front administrativo:

```text
https://tpvbackup.osumi.dev
```

API:

```text
https://apitpvbackup.osumi.dev
```

Base URL usada actualmente por Electron:

```text
https://apitpvbackup.osumi.dev/api/v1
```

Actualmente está compuesta directamente en:

```text
electron/bootstrap/application-composition.ts
```

---

# 9. Identidades y secretos — no confundir

Son conceptos distintos:

```text
installation.public_id
≠
TPV Backup Key ID
≠
TPV Backup Secret
≠
backup.backup_id
≠
backup.public_id
≠
TPV Backup key
```

## 9.1. TPV Backup key

Secreto maestro criptográfico utilizado para abrir los `.otpv`.

Reglas:

- bytes UTF-8 exactos;
- no `trim()`;
- no normalización;
- nunca se envía al servidor;
- nunca se incluye dentro del `.otpv`;
- se utiliza para derivar la KEK mediante `scrypt`;
- se persiste como secreto operacional local.

## 9.2. Key ID + Secret

Credenciales de servicio de una instalación frente a TPV Backup.

Reglas:

```text
Key ID
→ trim permitido en capa de aplicación

Secret
→ conservar exactamente
→ no trim
```

Persistencia local:

```text
secrets/backup_remote_credentials.json
```

Protegida con Electron `safeStorage`.

## 9.3. JWT remoto

Reglas:

- solo memoria;
- no se persiste;
- no cruza al Renderer;
- no se incluye en `.otpv`;
- TTL de API actual: 3600 s;
- margen de renovación del Client: 30 s.

---

# 10. `.otpv` v3 — contrato definitivo

ZIP exterior con exactamente:

```text
manifest.json
payload.enc
```

`payload.enc` es un ZIP interior cifrado.

## 10.1. Algoritmos

```text
formatVersion = 3
cryptoSuite = otpv3-scrypt-aes-256-gcm
```

`scrypt`:

```text
salt            32 bytes
cost            32768
blockSize       8
parallelization 3
length          32 bytes
```

AES-256-GCM:

- DEK aleatoria por backup;
- KEK derivada desde TPV Backup key;
- wrapping de DEK con AES-256-GCM;
- IV de 12 bytes;
- auth tag de 16 bytes.

## 10.2. Payload portable

Incluye:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
files/**
```

No incluye:

```text
printing_settings.json
logs/
backups/
staging/
TPV Backup key
JWT
```

A partir de `21.9`, `app_data.json` incluirá también la hora configurada para el backup automático, porque se ha decidido que esa preferencia sí es portable entre restauraciones.

## 10.3. Límite contractual

```text
8 GiB
```

No materializar `.otpv` completos en memoria durante upload/download.

---

# 11. `secrets/secrets.json` — schema 1

Contrato actual:

```json
{
  "schemaVersion": 1,
  "secretApi": "...",
  "emailSmtpPass": "...",
  "ticketBaiToken": "...",
  "backupRemoteCredentials": {
    "keyId": "...",
    "secret": "..."
  }
}
```

Sin conexión remota:

```json
{
  "schemaVersion": 1,
  "secretApi": "...",
  "emailSmtpPass": "...",
  "ticketBaiToken": "...",
  "backupRemoteCredentials": null
}
```

Regla fundamental:

```text
backupApiKey
→ NO aparece dentro de secrets/secrets.json
→ NO aparece en ningún lugar del `.otpv`
```

La TPV Backup key se aporta externamente al restaurar.

---

# 12. Filesystem actual del Client

Raíz:

```text
app.getPath('userData') / osumi-tpv
```

Estructura relevante:

```text
osumi-tpv/
├── config/
│   ├── app_data.json
│   └── printing_settings.json
├── assets/
│   ├── logo.webp
│   └── files/
├── database/
│   └── osumi-tpv.sqlite
├── backups/
├── logs/
├── secrets/
│   ├── secrets.json
│   └── backup_remote_credentials.json
└── staging/
```

Subdirectorios temporales actuales:

```text
staging/remote-upload/
staging/remote-restore/
staging/restore-work/
```

Plan de `21.9`:

```text
config/backup_automatic_state.json
```

será estado operativo local del scheduler y NO formará parte del `.otpv`.

---

# 13. Backup local y creación reusable

`BackupService.createLocal()` sigue siendo una operación puramente local.

Genera el `.otpv` bajo:

```text
backups/
```

`BackupService.createFile(destinationDirectory)` permite que otras capas reutilicen exactamente el mismo pipeline en un directorio controlado por Main.

Esto ya es utilizado por:

```text
BackupRemoteCreateService
```

y debe seguir siendo el único camino de creación de `.otpv` para el scheduler automático.

No crear un segundo generador de backups en `21.9`.

Existe un guard de concurrencia para impedir dos creaciones simultáneas sobre los mismos recursos.

---

# 14. Snapshot SQLite

El Client usa:

```text
better-sqlite3
WAL
```

Regla permanente:

> Nunca copiar directamente la SQLite operacional.

Se genera un snapshot consistente.

La SQLite restaurada debe ser autocontenida y no depender de:

```text
-wal
-shm
```

Validaciones:

- identidad;
- schema;
- tablas;
- metadata;
- `integrity_check`;
- `foreign_key_check`.

`DATABASE_SCHEMA_VERSION` actual:

```text
1
```

---

# 15. Restauración nativa v3

Pipeline:

```text
seleccionar `.otpv`
↓
validar ZIP exterior
↓
registrar selección
↓
introducir TPV Backup key
↓
volver a inspeccionar paquete
↓
descifrar payload
↓
validar ZIP interior
↓
extraer recursos obligatorios
↓
validar SQLite / app_data / logo / secretos
↓
extraer files/**
↓
preparar staging canónico
↓
finalizar instalación
```

Solo se permite restaurar sobre instalación limpia.

## 15.1. Protección ante cambio del paquete

`OtpvV3RestoreUnlockService` vuelve a inspeccionar el paquete justo antes de usarlo.

Si el manifest difiere respecto a la selección:

```text
restore rechazado
```

## 15.2. Secretos restaurados

El staging reconstruye `InstallationSecretsData` con:

```text
secretApi
emailSmtpPass
ticketBaiToken
+
TPV Backup key introducida externamente
```

## 15.3. Credenciales remotas

Las credenciales remotas portables:

```text
unlock
↓
prepared restore en RAM
↓
finalize
↓
safeStorage definitivo
```

No se persisten antes de la promoción final.

---

# 16. Recuperación ante instalación/restauración interrumpida

`app_data.json` es el marcador final de una instalación completa.

Si existe:

```text
instalación completa
→ limpiar staging residual
```

Si no existe:

```text
instalación/promoción incompleta
→ limpiar recursos finales parciales
→ limpiar credenciales remotas huérfanas
→ reset staging
```

Se eliminan también:

```text
backup_remote_credentials.json
backup_remote_credentials.json.tmp
```

cuando `recover()` detecta que no hay instalación completa.

Esta lógica fue validada funcionalmente en `21.8.2c`.

---

# 17. TPV Backup API — configuración relevante

`src/Config/Config.json` versionado contiene:

```json
{
  "name": "Osumi TPV Backup API",
  "environment": "dev",
  "lang": "es",
  "log_level": "DEBUG",
  "allow-cross-origin": true,
  "extra": {
    "admin_token_ttl": 28800,
    "installation_token_ttl": 3600,
    "backup_storage_path": "storage/backups"
  }
}
```

Los secretos runtime para tokens no deben entrar al repositorio:

```text
admin_token_secret
installation_token_secret
```

Durante `21.7` se decidió no modificar `Config.json` únicamente porque los valores versionados parezcan de desarrollo: el deployment real puede aplicar configuración operativa distinta. No introducir cambios especulativos sin auditar el entorno real.

---

# 18. Storage remoto

Raíz lógica:

```text
storage/backups
```

fuera del webroot.

Clave:

```text
installations/<installation.public_id>/<backup.public_id>.otpv
```

No se utiliza el filename del cliente como ruta física.

`FileBackupStorage`:

- valida segmentos;
- rechaza `.` y `..`;
- evita traversal;
- escribe a temporal;
- usa `rename()` atómico;
- no sobrescribe destinos;
- calcula tamaño;
- calcula SHA-256;
- lista objetos;
- borra de forma idempotente;
- intenta limpiar directorios padre vacíos.

---

# 19. API remota — rutas

Autenticación:

```text
POST /api/v1/auth/token
GET  /api/v1/me
```

Backups:

```text
POST   /api/v1/backups
GET    /api/v1/backups
GET    /api/v1/backups/:publicId/download
DELETE /api/v1/backups/:publicId
```

Todas las rutas de backups pasan por:

```text
InstallationAuthMiddleware
```

---

# 20. Autenticación de instalaciones

`POST /api/v1/auth/token` recibe:

```text
Key ID
Secret
```

El `Key ID` se normaliza.

El `Secret` se conserva exactamente.

JWT contiene datos de instalación y credencial, entre otros:

```text
type = installation
installation_id
installation_public_id
credential_id
key_id
iat
exp
```

## 20.1. Revalidación por request

El middleware no confía únicamente en la firma del JWT.

Se vuelve a comprobar:

- credencial;
- `revoked_at`;
- `key_id`;
- instalación;
- estado activo de instalación;
- suscripción;
- estado activo de suscripción.

Consecuencia verificada:

> Revocar o rotar una credencial invalida efectivamente un JWT que todavía no ha expirado.

---

# 21. Semántica definitiva de suscripciones

```text
active = false
→ disabled
→ no autenticación válida
→ no list
→ no download
→ no delete
→ no upload
```

```text
active = true + expires_at pasado
→ expired
→ autenticación permitida
→ list permitido
→ download permitido
→ delete permitido
→ upload bloqueado
```

```text
active = true + expires_at futuro o null
→ active
→ operaciones normales
```

Matriz:

```text
ACTIVE
auth        ✅
list        ✅
download    ✅
delete      ✅
upload      ✅

EXPIRED
auth        ✅
list        ✅
download    ✅
delete      ✅
upload      ❌

DISABLED
auth        ❌
list        ❌
download    ❌
delete      ❌
upload      ❌
```

Esta semántica fue comprobada funcionalmente en `21.8.2a`.

---

# 22. `BackupRemoteService` — comportamiento actual del Client

Responsabilidades:

```text
configure
getConnection
list
upload
download
delete
removeConfiguration
```

## 22.1. Cambio importante encontrado durante 21.8

Antes, `getConnection()` podía reutilizar una sesión en memoria todavía vigente y devolver:

```text
subscription.status = active
canUpload = true
```

aunque la suscripción hubiera caducado en el servidor.

Esto provocó un fallo funcional real durante la regresión:

```text
TPV Backup Front mostraba Caducada
Client seguía mostrando Activa
upload era rechazado correctamente por el servidor
```

## 22.2. Solución actual

`getConnection()` siempre vuelve a autenticar contra TPV Backup para obtener estado administrativo fresco.

En cambio:

```text
list
upload
download
delete
```

siguen usando `ensureSession()` y reutilizan JWT cuando es seguro hacerlo.

Esto mantiene:

- estado visible fresco cuando se consulta conexión;
- eficiencia en operaciones;
- invalidación administrativa correcta.

## 22.3. Retry de sesión

Cuando una operación obtiene `403` con un JWT aparentemente válido:

```text
descartar sesión
↓
reautenticar con credencial persistida
↓
reintentar una sola vez
```

Sirve para:

- revocación;
- rotación;
- desactivación administrativa.

---

# 23. Gestión → Copias de seguridad — corrección de estado obsoleto

Durante `21.8.2a` se detectó otro problema de UX/estado:

Si `loadRemoteState()` fallaba autenticando, la pantalla podía conservar:

```text
remoteConnection anterior
remoteBackups anteriores
```

aunque ya no fueran válidos.

Corrección aplicada:

```text
fallo de getRemoteConnection()
→ remoteConnection = null
→ remoteBackups = []
→ mostrar error
```

Si la conexión es válida pero falla solo el listado:

```text
remoteConnection se conserva
remoteBackups = []
→ mostrar error de listado
```

Esto evita mostrar datos remotos obsoletos como si siguieran siendo válidos.

---

# 24. Mensaje de desactivación en TPV Backup Front

También se corrigió el texto de confirmación de desactivación de suscripción.

Antes inducía a pensar que solo se bloquearían nuevos uploads.

Ahora debe dejar claro que:

> las instalaciones no podrán autenticarse ni acceder a sus copias remotas mientras la suscripción permanezca desactivada.

Commit:

```text
1be138f8e280646b9419f9fe60287111174e890e
Corrección en mensaje al desactivar subscripción
```

---

# 25. Upload remoto

Client:

```text
crear `.otpv` en staging/remote-upload
↓
autenticar/refrescar estado
↓
stream multipart
↓
API
↓
validación
↓
storage
↓
metadata
↓
retención
↓
respuesta
↓
validar backupId + size
↓
eliminar temporal
```

El Client no materializa el `.otpv` completo en RAM.

---

# 26. Download remoto

Client:

```text
listar metadata autorizada
↓
GET download
↓
stream a .tmp
↓
SHA-256 incremental
↓
size
↓
comparar con metadata
↓
rename final
```

Si falla:

```text
.tmp eliminado
destino final no aparece
```

Se ha probado funcionalmente corrupción con mismo tamaño y distinto SHA.

---

# 27. Restore remoto

No existe un segundo pipeline de restauración.

Recorrido:

```text
credenciales temporales Key ID + Secret
↓
listado remoto
↓
download temporal
↓
size + SHA
↓
selector nativo
↓
backupId remoto vs manifest
↓
pipeline v3 existente
```

Las credenciales temporales de restore viven únicamente en Main/RAM.

---

# 28. Delete remoto

El borrado remoto elimina solo la copia del servidor.

No elimina una descarga local ya existente.

Semántica del API:

```text
DELETE metadata DB
↓
COMMIT
↓
DELETE blob
```

Motivo:

> evitar rollback de metadata hacia un objeto físico ya eliminado.

Un fallo físico posterior puede crear un huérfano, cubierto por reconciliación.

---

# 29. 21.7 — cierre completo de seguridad / integridad / retención

Estado:

```text
✅ cerrado
```

---

# 30. 21.7.1 — SHA-256 del blob almacenado

Estado:

```text
✅ cerrado
```

Se añadió SHA-256 del fichero ya persistido en storage.

Pipeline:

```text
upload temporal
↓
inspección
↓
SHA origen
↓
storeFile
↓
size storage
↓
SHA storage
↓
comparar
↓
guardar metadata
```

Si size o SHA no coinciden:

```text
blob eliminado
metadata no persistida
```

Retry idempotente también verifica SHA físico.

---

# 31. 21.7.2 — integridad en lectura

Estado:

```text
✅ cerrado por decisión de arquitectura
```

Se evaluó calcular `hash_file()` antes de cada descarga en el API.

Se rechazó porque para backups de hasta 8 GiB provocaría:

```text
lectura completa para SHA
+
segunda lectura completa para stream
```

Duplicando I/O y latencia.

Garantía actual considerada suficiente:

```text
SHA verificado al persistir
+
size verificado al abrir stream
+
Client calcula SHA de los bytes realmente descargados
+
Client compara contra metadata antes de promocionar
```

Una corrupción posterior al almacenamiento se detecta end-to-end en el Client.

No introducir doble lectura server-side sin una nueva necesidad real.

---

# 32. 21.7.3 — reconciliación metadata/storage

Estado:

```text
✅ cerrado
```

API HEAD:

```text
d1d3bdcde95d0e7d848347ec434b499025caa1b5
Tarea de reconciliacion 21.7.3a
```

Se añadió:

```text
BackupStorageInterface::listObjects()
FileBackupStorage::listObjects()
BackupStorageReconciliationService
ReconcileBackupStorageTask
tests correspondientes
```

Comando:

```bash
php of reconcileBackupStorage
```

Compara:

- metadata DB;
- objetos físicos;
- storage keys;
- tamaño/estado relevante.

Reporta:

```text
objetos huérfanos
objetos ausentes
metadata inválida
```

Es deliberadamente:

```text
read-only
diagnóstico
no destructivo
```

No añadir `--delete` preventivamente.

Si un día hace falta limpieza automática, deberá diseñarse con:

- exclusión de `.tmp-*`;
- solo claves canónicas finales;
- grace period;
- re-check inmediato antes de borrar;
- auditoría.

## 32.1. Validación funcional real

Se ejecutó:

```text
Registros de metadata: 2
Objetos físicos: 2
Objetos huérfanos: 0
Objetos ausentes: 0
Metadata inválida: 0

No se ha modificado ningún dato.
```

Correcto.

---

# 33. 21.7.4 — límites de infraestructura

Estado:

```text
✅ cerrado / omitido conscientemente
```

Se inició una auditoría de:

```text
upload_max_filesize
post_max_size
memory_limit
Nginx
Apache
timeouts
Plesk
```

El usuario confirmó que la infraestructura real ya está correctamente configurada y pidió no dedicar más tiempo a este punto.

Decisión:

> No introducir cambios en repositorio para límites que ya están correctamente resueltos en despliegue.

Mantener como conocimiento operativo:

```text
máximo contractual aplicación = 8 GiB
multipart/proxy deben admitir suficiente overhead
```

---

# 34. 21.7.5 — auditoría y logs sin secretos

Estado:

```text
✅ cerrado sin cambios
```

Se revisaron llamadas reales de auditoría y logging en:

- login;
- instalaciones;
- credenciales;
- suscripciones;
- backups.

Los datos auditados incluyen identificadores, estados, tamaños, filenames y metadatos no sensibles.

No se pasan a auditoría:

```text
TPV Backup key
Secret remoto
passwords
JWT
secretApi
emailSmtpPass
ticketBaiToken
DEK
KEK
payload descifrado
```

No se añadió un sanitizador genérico porque la disciplina actual ya es explícita y un filtro genérico podría crear falsa seguridad.

---

# 35. 21.7.6 — descarga del Front administrativo

Estado:

```text
✅ cerrado como decisión de arquitectura
```

API:

```text
streaming ✅
```

Client:

```text
streaming a disco + SHA ✅
```

Front administrativo:

```text
HttpClient responseType: 'blob'
→ materializa fichero en navegador
```

Se decidió aceptar esta limitación porque:

- el Front es herramienta administrativa;
- el Client es la vía principal de recuperación;
- implementar streaming real con Bearer en navegador introduciría complejidad importante:
  - File System Access API;
  - service worker / StreamSaver;
  - tickets temporales de descarga;
  - otra infraestructura equivalente.

Si el Front empieza a descargar habitualmente backups de varios GiB, reabrir este punto como mejora independiente.

---

# 36. 21.8 — regresión recuperación global

Estado:

```text
✅ cerrado
```

La regresión no fue solo automatizada: se realizaron múltiples pruebas funcionales reales y durante ellas se detectó y corrigió comportamiento de estado obsoleto.

---

# 37. 21.8.1 — camino feliz E2E

Estado:

```text
✅ validado
```

Recorrido real:

```text
Client operativo
↓
crear nueva copia remota
↓
confirmar en TPV Backup
↓
borrar datos / instalación limpia
↓
Key ID + Secret
↓
listar
↓
seleccionar backup
↓
descarga
↓
SHA/size
↓
TPV Backup key
↓
unlock
↓
restore
↓
instalación operativa
```

Después se validó también:

```text
credenciales remotas restauradas ✅
listado remoto inmediato ✅
creación de nueva copia remota desde instalación restaurada ✅
```

Esta última prueba valida la cadena:

```text
payload cifrado
→ credenciales portables
→ safeStorage nuevo equipo
→ autenticación
→ upload
```

---

# 38. 21.8.2a — credenciales y suscripción

Estado:

```text
✅ validado
```

Probado funcionalmente:

```text
active
expired
disabled
revocación
rotación
```

## 38.1. Expired

Se cambió `expires_at` a una fecha pasada.

TPV Backup Front:

```text
Caducada
```

Tras la corrección del Client:

```text
Client muestra Caducada
Nueva copia remota deshabilitada
list permitido
download permitido
```

El servidor ya bloqueaba correctamente upload antes de la corrección visual.

## 38.2. Rotación

Con Client abierto:

```text
rotar credencial
↓
JWT anterior rechazado
↓
reautenticación con credencial antigua falla
↓
Client elimina conexión/listado obsoletos
↓
nueva credencial
↓
conexión vuelve a funcionar
```

## 38.3. Disabled

```text
desactivar suscripción
↓
auth rechazada
↓
Client no conserva conexión remota antigua
↓
reactivar
↓
operación normal
```

---

# 39. 21.8.2b-1 — TPV Backup key incorrecta

Estado:

```text
✅ validado
```

Con una copia remota válida se introdujo deliberadamente una clave incorrecta.

Resultado:

```text
AES-GCM no autentica
↓
restore rechazado
↓
no instalación parcial
↓
workspace/staging preparado limpiados
```

Después, sin seleccionar otra copia:

```text
misma copia
+
TPV Backup key correcta
→ unlock correcto
→ restore correcto
```

Esto valida que el fallo criptográfico no contamina un retry posterior.

---

# 40. 21.8.2b-2 — blob corrupto con mismo tamaño

Estado:

```text
✅ validado
```

Se creó una copia remota específica de prueba.

Se comprobó inicialmente:

```text
size
SHA-256
```

Luego se modificó un byte físico del blob con `conv=notrunc`, manteniendo exactamente el mismo tamaño.

Resultado esperado y observado:

```text
size anterior == size posterior
SHA anterior != SHA posterior
```

Desde el Client:

```text
HTTP descarga bytes
↓
SHA incremental calculado por Client
↓
comparación con metadata
↓
mismatch
↓
copia rechazada
```

No se promocionó el temporal.

No se llegó al unlock.

Después se eliminó la copia corrupta y la reconciliación volvió a estado limpio.

Esta prueba demuestra que la garantía no depende solo del tamaño.

---

# 41. 21.8.2c — interrupción y recovery

Estado:

```text
✅ validado
```

Se probaron dos interrupciones reales.

## 41.1. Cierre después de selección pero antes de unlock

```text
descarga/selección remota
↓
cerrar aplicación
↓
reiniciar
```

Resultado:

```text
sin instalación parcial
flujo de instalación limpio
sin restore preparado
temporales recuperables/limpiados
```

## 41.2. Cierre después de unlock con staging preparado

```text
backup seleccionado
↓
TPV Backup key correcta
↓
payload validado
↓
staging preparado
↓
cerrar antes de finalize
↓
reiniciar
```

Resultado:

```text
sin app_data final
sin instalación parcial
staging anterior no utilizable
credenciales remotas no persistidas prematuramente
```

Después se completó una restauración normal con éxito.

---

# 42. 21.8.3 — retención E2E

Estado:

```text
✅ validado
```

Se cambió temporalmente el límite de la suscripción a:

```text
max_backups_per_installation = 2
```

Se crearon tres copias remotas consecutivas.

Resultado:

```text
A → eliminada por retención
B → conservada
C → conservada
```

Se comprobó:

```text
listado Client correcto
auditoría retention_delete
storage consistente
reconcileBackupStorage limpio
```

Después se dejó el límite normal/restaurado.

Esta prueba valida de extremo a extremo:

```text
Client
→ API
→ DB
→ filesystem
→ retention
→ audit
→ reconciliation
```

---

# 43. Casos adversos cubiertos por tests automatizados

No es necesario repetir manualmente salvo regresión concreta:

```text
retry/idempotencia
backupId conflictivo
upload inválido
download parcial/interrumpido
limpieza de temporales
manifest cambiado entre selección/unlock
payload ZIP inválido
SQLite inválida
fallo de finalize
retry de JWT
retención determinista
retención con fallo de delete
integridad del blob persistido
```

---

# 44. Regla de retención actual

Por defecto/referencia:

```text
6 backups por instalación
```

El orden de retención utiliza:

```text
created_at_client
```

con desempate por id interno.

Esto significa que una copia subida hoy con una fecha cliente antigua puede ser considerada la más vieja.

Es una decisión semántica existente.

No cambiar a “orden de upload” sin una decisión de dominio explícita.

---

# 45. Auditoría actual

Acciones relevantes:

```text
backup.create
backup.download
backup.delete
backup.retention_delete
admin.login
subscription.*
installation.*
installation.authenticate
installation.credential_rotate
installation.credential_revoke
```

La auditoría es best-effort:

> un fallo guardando auditoría no convierte una operación de negocio ya completada en fallo.

---

# 46. Front administrativo

Estado:

```text
Angular 22
```

Autenticación:

```text
sessionStorage
Bearer solo contra API
guard valida /admin/me
```

Backups:

```text
listar
descargar
borrar
```

Suscripciones:

```text
active
expired
disabled
```

El texto de desactivación ya refleja que `disabled` bloquea todo el acceso.

---

# 47. SafeStorage

Secretos operativos:

```text
secrets/secrets.json
```

Credenciales TPV Backup:

```text
secrets/backup_remote_credentials.json
```

Ambos siguen políticas de persistencia segura.

La configuración remota se mantiene separada de `InstallationSecretsData` en runtime local.

---

# 48. Importación legacy v2

Los paquetes legacy pueden contener:

```text
backupApiKey
```

pero no:

```text
TPV Backup Key ID
TPV Backup Secret
```

porque esas credenciales no existían.

Una importación legacy debe avisar de que la conexión remota debe configurarse posteriormente.

---

# 49. Decisiones que NO deben revertirse

No:

- introducir schema 2 de secretos sin necesidad real;
- meter `Key ID + Secret` en `InstallationSecretsData`;
- incluir TPV Backup key dentro del `.otpv`;
- persistir JWT;
- enviar TPV Backup key al API;
- hacer `trim()` del Secret;
- hacer `trim()` de la TPV Backup key;
- cargar `.otpv` completos en memoria;
- crear un segundo pipeline de restore remoto;
- crear un segundo pipeline para backup automático;
- borrar copia local al borrar remota;
- persistir credenciales temporales antes del finalize;
- confiar en paths del Renderer;
- usar filename del cliente como storage key;
- mezclar `backupId` y `publicId`;
- bloquear recuperación solo porque la suscripción esté `expired`;
- añadir borrado automático de huérfanos sin diseño explícito;
- calcular SHA server-side antes de cada download sin reevaluar coste;
- cambiar retención de `created_at_client` sin decisión de producto.

---

# 50. Nueva funcionalidad acordada — 21.9 Backups remotos automáticos

Objetivo:

> Cuando una instalación tenga TPV Backup correctamente configurado y una suscripción activa con permiso de upload, crear automáticamente una copia remota una vez al día.

La hora será configurable.

Valor por defecto:

```text
03:00
```

pero no será rígido.

---

# 51. Semántica funcional acordada para el scheduler

No se implementará como un simple `setTimeout()` que dependa de que Electron esté vivo exactamente a la hora indicada.

Regla:

```text
una ejecución automática por ciclo diario programado
```

## 51.1. Aplicación abierta a la hora

Ejemplo:

```text
hora = 03:00
app abierta
→ backup automático alrededor de las 03:00
```

## 51.2. Aplicación cerrada

```text
03:00 con app cerrada
↓
siguiente arranque
↓
si existe una ejecución vencida no completada
→ crear backup
```

## 51.3. Equipo suspendido

```text
03:00 durante suspensión
↓
powerMonitor resume
↓
reevaluar vencimiento
↓
si falta ejecución
→ backup
```

## 51.4. Varios reinicios

Si ya hubo backup automático válido para el último vencimiento:

```text
reiniciar varias veces
→ no repetir
```

## 51.5. Varios días apagado

No crear una cola de varios backups atrasados.

Ejemplo:

```text
equipo apagado 4 días
↓
arranca
↓
crear 1 backup
↓
marcar último vencimiento cubierto
↓
continuar ciclo normal
```

---

# 52. Hora configurable — decisión de producto

El usuario pidió expresamente:

> Si se configura TPV Backup, debe poder indicarse la hora a la que se hacen las copias automáticas y esa hora debe tener un valor obligatorio.

Valor inicial:

```text
03:00
```

Formato:

```text
HH:mm
00:00 → 23:59
```

UI recomendada:

```html
<input type="time">
```

No aceptar valores vacíos en configuración válida.

---

# 53. Persistencia de la hora

Decisión:

```text
app_data.json
```

Nuevo campo previsto:

```json
{
  "backupAutomaticTime": "03:00"
}
```

Motivos:

- no es un secreto;
- es una preferencia funcional de la instalación;
- debe sobrevivir reinicios;
- debe poder editarse;
- debe ser portable en un `.otpv`;
- una restauración debe conservar el horario elegido.

No guardarlo en `safeStorage`.

No guardarlo únicamente en estado del scheduler.

---

# 54. Compatibilidad con `app_data.json` existentes

No romper instalaciones existentes.

`JsonAppDataRepository` ya utiliza evolución tolerante para campos añadidos.

Plan:

```text
StoredAppData.backupAutomaticTime?: string
```

Carga:

```text
si existe y es válida
→ usarla

si no existe
→ 03:00
```

El siguiente guardado persistirá el campo nuevo.

No es necesario aumentar `schemaVersion` únicamente por este cambio mientras se mantenga compatibilidad hacia atrás.

---

# 55. Compatibilidad con backups antiguos

Un `.otpv` creado antes de `21.9` contiene un `app_data.json` sin `backupAutomaticTime`.

Al restaurar:

```text
campo ausente
→ default 03:00
```

Un `.otpv` nuevo:

```text
campo presente
→ conservar hora elegida
```

Antes de implementar, revisar también todos los validadores de `app_data.json` del pipeline de restore, especialmente:

```text
JsonAppDataRepository
FileOtpvV3RequiredContentValidator
cualquier parser/validator de configuración legacy/native
```

No asumir que el repository es el único consumidor.

---

# 56. Nueva instalación — UI prevista

En el paso donde ya se configura TPV Backup:

```text
TPV Backup key
Key ID
Secret
```

añadir:

```text
Hora de la copia automática
[03:00]
```

Texto recomendado:

```text
Si el equipo no está disponible a esa hora,
la copia se realizará cuando vuelva a estar disponible.
```

La hora forma parte del mismo bloque funcional de TPV Backup.

---

# 57. Nueva instalación — validación prevista

Actualmente los tres valores se relacionan:

```text
backupApiKey
Key ID
Secret
```

La hora se añadirá al contrato del formulario.

Al configurar TPV Backup:

```text
backupApiKey requerido
Key ID requerido
Secret requerido
backupAutomaticTime requerido
```

Aunque `backupAutomaticTime` tendrá siempre `03:00` como valor inicial, se validará igualmente en Renderer y Main.

No confiar únicamente en `<input type="time">`.

Validación Main:

```text
regex/formato HH:mm
hora 00..23
minutos 00..59
```

---

# 58. Gestión → Ajustes iniciales — UI prevista

La pantalla actual contiene un bloque TPV Backup con la `Backup API key`.

Añadir:

```text
Hora de la copia automática
[03:00]
```

Texto de ayuda:

> Se utilizará cuando este equipo tenga configurada una conexión activa con TPV Backup.

No hacer que la pantalla de Ajustes dependa de una petición de red para decidir si muestra el campo.

Razón:

- `Key ID + Secret` se administran en Gestión → Copias de seguridad;
- la hora está en `AppData`;
- editar ajustes no debe depender de que Internet o TPV Backup estén disponibles.

La hora puede mostrarse siempre y ser un valor válido obligatorio de configuración, aunque el terminal todavía no tenga credenciales remotas.

---

# 59. Gestión → Copias de seguridad — UI informativa prevista

En `21.9.5` mostrar información operativa, por ejemplo:

```text
Copias automáticas
Todos los días a las 03:00

Última copia automática
07/10/2026 03:02
```

Objetivo:

- que el usuario conozca el horario;
- que pueda confirmar que el scheduler funciona;
- no obligarle a mirar logs.

La edición de hora seguirá en Ajustes, no necesariamente en Copias de seguridad.

---

# 60. Estado persistente del scheduler

El estado de ejecución NO debe ir dentro de `app_data.json`.

Archivo previsto:

```text
config/backup_automatic_state.json
```

Contrato mínimo recomendado:

```json
{
  "schemaVersion": 1,
  "lastSuccessfulAt": "2026-10-07T01:02:18.000Z"
}
```

`lastSuccessfulAt` se guarda como timestamp UTC ISO.

La comparación con el horario diario se hace usando hora local del equipo.

---

# 61. El estado del scheduler NO es portable

No incluir:

```text
backup_automatic_state.json
```

dentro del `.otpv`.

Motivo:

> Una máquina restaurada no debe heredar el hecho de que el terminal anterior ya ejecutó el backup automático del día.

Ejemplo:

```text
restaurar en un equipo nuevo a las 10:00
hora configurada = 03:00
estado scheduler nuevo = vacío
↓
existe vencimiento pendiente
↓
backup automático
```

Este comportamiento es deseable.

---

# 62. Cálculo del vencimiento

No basar la lógica en “la fecha del último backup” exclusivamente.

Calcular:

```text
último instante programado que debería haber ocurrido
```

según:

- fecha local actual;
- hora configurada.

Ejemplo con `03:00`:

```text
hoy 02:00
→ último vencimiento = ayer 03:00

hoy 08:00
→ último vencimiento = hoy 03:00
```

Regla:

```text
lastSuccessfulAt >= último vencimiento
→ ciclo cubierto
→ no ejecutar

lastSuccessfulAt < último vencimiento
o no existe
→ ciclo pendiente
```

---

# 63. Cambios de hora configurada

La lógica debe basarse siempre en el horario actual guardado en `AppData`.

Ejemplo:

```text
hora anterior = 03:00
último success = hoy 03:05
usuario cambia a 23:00
hoy son las 12:00
→ último vencimiento según nueva hora = ayer 23:00
→ ya está cubierto por success de hoy
→ no duplicar
```

Otro ejemplo:

```text
hora anterior = 23:00
último success = ayer 23:05
usuario cambia a 03:00
hoy son las 12:00
→ último vencimiento = hoy 03:00
→ falta ciclo
→ backup pendiente
```

Los tests de `21.9.2` deben cubrir estos casos.

---

# 64. Hora local y DST

La hora configurada representa:

```text
hora local del equipo
```

No UTC.

Motivo:

> “03:00” debe significar las tres de la mañana del establecimiento.

El scheduler debe recomputar el siguiente vencimiento y no asumir que todos los días duran exactamente 24 h.

Esto importa en cambios DST.

No programar indefinidamente con:

```text
24 * 60 * 60 * 1000
```

desde la última ejecución.

---

# 65. Reintentos tras fallo

Si falla el backup automático:

```text
NO actualizar lastSuccessfulAt
```

Causas posibles:

- sin red;
- API temporalmente caída;
- credencial inválida;
- suscripción expired;
- suscripción disabled;
- error creando `.otpv`;
- error filesystem;
- upload fallido;
- respuesta remota inválida.

Propuesta acordada:

```text
reintento tranquilo aproximadamente cada hora
```

hasta que:

- haya éxito;
- o cambie el ciclo de forma que siga existiendo una única ejecución pendiente.

No crear bucles agresivos.

---

# 66. Condiciones para ejecutar backup automático

Antes de generar el `.otpv`:

```text
instalación completa
+
hora válida
+
credenciales Key ID + Secret configuradas
+
autenticación correcta
+
suscripción active
+
canUpload = true
+
vencimiento pendiente
```

Importante:

`BackupRemoteService.getConnection()` ya fuerza estado administrativo fresco.

El scheduler debe reutilizarlo.

Si:

```text
connection === null
```

no ejecutar.

Si:

```text
canUpload === false
```

no generar `.otpv`.

---

# 67. Pipeline del backup automático

Debe reutilizar:

```text
BackupRemoteCreateService
```

Exactamente el mismo flujo que una creación remota manual.

Arquitectura:

```text
BackupAutomaticScheduler
↓
comprobar vencimiento
↓
comprobar conexión TPV Backup
↓
BackupRemoteCreateService.create()
↓
BackupService.createFile()
↓
snapshot SQLite
↓
.otpv v3
↓
upload streaming
↓
API valida
↓
retención
↓
respuesta validada
↓
eliminar temporal
↓
persistir lastSuccessfulAt
```

No duplicar:

- snapshot;
- packaging;
- crypto;
- upload;
- integridad;
- retención.

---

# 68. Concurrencia

`BackupService` ya tiene guard de creación.

`BackupRemoteCreateService` también protege creación remota.

Caso:

```text
03:00
usuario pulsa backup manual
+
scheduler dispara
```

No deben crearse dos operaciones peligrosamente concurrentes.

Si el automático pierde la carrera:

```text
no marcar éxito
→ volver a evaluar/reintentar más tarde
```

Una copia manual no debe marcar por sí sola el ciclo automático como completado.

El requisito es:

> backup automático diario independiente de que haya existido otro manual.

---

# 69. Retención y backups automáticos

La retención actual es compatible.

Con límite 6:

```text
1 backup automático/día
→ aproximadamente 6 snapshots diarios remotos
```

Pero una copia manual también consume un hueco del mismo límite.

No crear una retención separada para automáticos salvo decisión futura.

La API no necesita distinguir hoy:

```text
manual
vs
automático
```

para aplicar retención.

---

# 70. ¿Debe el API saber que un backup es automático?

Decisión inicial:

```text
NO
```

El scheduler puede funcionar sin añadir un nuevo campo remoto.

Ventajas:

- no cambia contrato API;
- no cambia DB;
- no cambia Front;
- menor superficie;
- retención ya funciona.

La “última copia automática” se obtiene inicialmente del estado local del scheduler.

Si en el futuro se quiere auditar manual/automático server-side, abrir un cambio explícito de contrato.

---

# 71. Fichero de estado — robustez

Recomendación para `21.9.2`:

- repository/port separado;
- escritura `.tmp`;
- `rename()` atómico;
- modo de fichero apropiado;
- JSON versionado;
- lectura tolerante a fichero ausente.

Si el fichero está corrupto:

```text
log técnico
→ tratar como sin éxito previo
→ no bloquear arranque de la aplicación
```

Peor caso:

> puede generarse una copia extra, pero no se pierde protección.

Eso es preferible a desactivar silenciosamente el scheduler.

---

# 72. Plan técnico 21.9.1 — Configuración de hora

Estado:

```text
⏳ siguiente bloque
```

No existe todavía código de `21.9`.

## 72.1. Contratos

Revisar/modificar:

```text
electron/contracts/configuration/app-data.interface.ts
electron/contracts/configuration/installation-command.interface.ts
electron/contracts/configuration/configuration-update-command.interface.ts
```

Campo previsto:

```text
backupAutomaticTime: string
```

Ubicación exacta del campo en comandos debe respetar la estructura existente y evitar duplicidades.

## 72.2. Persistencia y mapeo

Revisar/modificar:

```text
electron/backend/application/configuration/installation-app-data.mapper.ts
electron/backend/application/configuration/configuration.service.ts
electron/infrastructure/filesystem/json-app-data.repository.ts
```

Objetivos:

- default `03:00`;
- compatibilidad con fichero antiguo;
- persistencia del valor;
- actualización desde Ajustes.

## 72.3. Validadores Main

Revisar/modificar:

```text
electron/backend/application/configuration/installation-command.validator.ts
electron/backend/application/configuration/configuration-update-command.validator.ts
```

Validación estricta HH:mm.

Añadir tests.

## 72.4. Formulario nueva instalación

Revisar/modificar:

```text
src/app/model/configuracion/installation-form.model.ts
src/app/model/configuracion/installation-form.initial-value.ts
src/app/model/configuracion/installation-form.schema.ts
src/app/model/configuracion/installation-command.mapper.ts
src/app/modules/configuracion/pages/new-installation/new-installation.component.html
```

Valor inicial:

```text
03:00
```

## 72.5. Formulario Ajustes

Revisar/modificar:

```text
src/app/model/configuracion/settings-form.model.ts
src/app/model/configuracion/settings-form.initial-value.ts
src/app/model/configuracion/settings-form.schema.ts
src/app/model/configuracion/settings-command.mapper.ts
src/app/modules/gestion/pages/management-settings/management-settings.component.html
```

El valor inicial sale de `AppData`.

## 72.6. Restore

Antes de cerrar 21.9.1 revisar:

```text
FileOtpvV3RequiredContentValidator
tests de app_data
tests restore
```

para garantizar que un backup antiguo sin el campo sigue restaurando con `03:00`.

---

# 73. Plan técnico 21.9.2 — Estado persistente y lógica temporal

Crear una capa aislada, testeable sin Electron ni red.

Responsabilidades:

```text
leer estado
guardar estado
calcular último vencimiento
determinar si hay backup pendiente
marcar éxito
```

Separar:

```text
cálculo temporal
de
filesystem
de
ejecución remota
```

Esto permitirá tests deterministas mediante reloj inyectable.

Casos mínimos de test:

```text
antes de la hora
después de la hora
lastSuccessfulAt cubre ciclo
lastSuccessfulAt antiguo
sin estado
varios días apagado
cambio de hora
medianoche
DST
```

---

# 74. Plan técnico 21.9.3 — Ejecución automática

Introducir un servicio/coordinador del dominio de aplicación, por ejemplo conceptualmente:

```text
BackupAutomaticScheduler
```

No fijar nombre definitivo hasta revisar `main` al empezar el bloque.

Dependencias conceptuales:

```text
ApplicationStateReader
AppDataRepository / ConfigurationService
BackupRemoteService
BackupRemoteCreateService
BackupAutomaticStateRepository
clock
timer abstraction si hace falta
```

Responsabilidades:

- decidir si debe intentar;
- validar que instalación esté lista;
- refrescar conexión remota;
- no generar paquete si no puede subir;
- ejecutar `BackupRemoteCreateService`;
- guardar éxito;
- loggear fallos no sensibles.

---

# 75. Plan técnico 21.9.4 — ciclo de vida Electron

`electron/main.ts` actual:

```text
whenReady
↓
ensureDirectories
↓
register protocol
↓
installationFinalizer.recover()
↓
createApplicationComposition()
↓
createMainWindow()
```

En Windows:

```text
window-all-closed
→ app.quit()
```

Por tanto el scheduler solo puede funcionar mientras el proceso Electron está vivo.

Debe reaccionar como mínimo a:

```text
arranque
timer del siguiente vencimiento
retry
powerMonitor resume
```

Importante:

> No depender exclusivamente de un timer programado muchas horas antes.

Tras `resume`, recalcular siempre.

Antes de implementar, decidir la composición más limpia:

- devolver un objeto runtime desde `createApplicationComposition()`;
- o arrancar el scheduler dentro de composición y exponer `stop()`;
- o una pequeña capa de lifecycle.

No cambiar la firma actual por conveniencia sin revisar el impacto sobre DB shutdown y tests.

---

# 76. Plan técnico 21.9.5 — UI informativa

En:

```text
Gestión → Copias de seguridad
```

mostrar:

```text
hora configurada
última copia automática correcta
```

Opcionalmente:

```text
estado pendiente / sin ejecución todavía
```

No mostrar detalles técnicos ni secretos.

No convertir fallos transitorios en diálogos modales durante la madrugada.

La operación automática debe ser silenciosa salvo logs/estado visible.

---

# 77. Plan técnico 21.9.6 — regresión funcional

Antes de cerrar Hito 21, probar realmente:

```text
hora próxima para prueba
app abierta → ejecución
reinicio antes de hora
reinicio después de hora → catch-up
varios reinicios → no duplicar
sin Internet → no marcar éxito
Internet recuperado → retry
suscripción expired → no upload
suscripción reactivada → retry
credencial revocada → no upload
credencial nueva → recuperación
suspend/resume si es viable
retención tras varios automáticos
restore de backup nuevo conserva hora
restore de backup antiguo usa 03:00
```

Después restaurar una hora normal.

---

# 78. Seguridad del scheduler

No registrar:

```text
TPV Backup key
Secret
JWT
secretApi
emailSmtpPass
ticketBaiToken
```

Sí se puede registrar:

```text
inicio de intento automático
success/failure
backupId/publicId
bytes
duración
próximo vencimiento
tipo de error no sensible
```

El scheduler nunca necesita conocer directamente el Secret ni la TPV Backup key.

Debe consumir servicios existentes.

---

# 79. Fallos silenciosos y UX

Una copia automática no debe abrir diálogos inesperados a las 03:00.

Los errores se registrarán técnicamente y el scheduler reintentará.

La UI informativa permitirá comprobar:

```text
última copia automática
```

Más adelante podría añadirse:

```text
último error
```

pero no se ha acordado todavía.

No introducir notificaciones intrusivas en la primera versión.

---

# 80. Relación con backup manual

Las copias manuales siguen exactamente igual.

No reemplazar ni ocultar:

```text
Nueva copia remota
```

El backup automático es una capa adicional de protección.

Manual y automático comparten:

```text
BackupRemoteCreateService
```

pero tienen distinto disparador.

---

# 81. Relación con restore

`backupAutomaticTime` sí viaja en `app_data.json`.

`lastSuccessfulAt` no.

Después de restore:

```text
horario restaurado
estado scheduler vacío
credenciales remotas restauradas
```

Si la hora programada ya pasó y la suscripción está activa:

```text
scheduler puede hacer un backup automáticamente al arrancar
```

Esto es coherente con la política acordada.

---

# 82. Relación con legacy import

Un legacy no tendrá `backupAutomaticTime`.

Al terminar la importación, el nuevo `AppData` debe quedar con:

```text
03:00
```

salvo que el flujo de configuración permita elegirlo explícitamente en ese punto.

Antes de implementar, revisar cómo `LegacyImportService` construye/persiste `AppData`.

No dejar una ruta capaz de crear una instalación sin hora válida.

---

# 83. Invariantes que 21.9 debe respetar

```text
backupApiKey nunca servidor
Secret exacto
JWT solo RAM
.otpv streaming
snapshot consistente
retención remota
safeStorage
restore zero-knowledge
Main controla filesystem
Renderer no recibe rutas internas
```

El scheduler no justifica romper ninguna de estas garantías.

---

# 84. Tests automatizados destacables ya existentes

Client cubre, entre otros:

- portable secrets;
- exclusión de backupApiKey del payload;
- package builder;
- restore staging;
- unlock;
- finalize;
- rollback credencial;
- recovery;
- auth/list;
- upload remoto;
- streaming download;
- descarga parcial;
- JWT retry;
- expired;
- delete;
- remote create;
- remote download;
- SHA/size;
- restore remoto;
- selección;
- backupId remoto vs manifest;
- UI de backups.

API cubre, entre otros:

- autenticación;
- middleware;
- upload;
- validación v3;
- idempotencia;
- conflictos;
- download;
- delete;
- retención;
- auditoría;
- storage;
- read stream;
- SHA persistido;
- reconciliación.

---

# 85. Pruebas funcionales reales completadas

Se han comprobado realmente:

```text
upload remoto
download remoto
delete remoto
restore remoto completo
restore tras 21.7.1
reconciliación storage
active
expired
disabled
rotación
revocación
TPV Backup key incorrecta
retry con TPV Backup key correcta
blob corrupto mismo tamaño
rechazo por SHA
interrupción antes de unlock
interrupción tras unlock
recovery al reiniciar
restore correcto después del recovery
retención E2E
auditoría retention_delete
```

Esta cobertura debe considerarse parte del conocimiento de continuidad y no repetirse innecesariamente salvo regresión.

---

# 86. Aspectos conocidos no bloqueantes

## 86.1. Front administrativo usa Blob

Aceptado por ahora.

## 86.2. Config.json versionado muestra dev/DEBUG

No se cambió sin necesidad de despliegue.

## 86.3. Retención usa fecha cliente

Decisión existente.

## 86.4. Auditoría best-effort

Decisión existente.

## 86.5. Reconciliación no borra

Decisión explícita de seguridad.

---

# 87. Estado exacto al cerrar este documento

```text
21.7 ✅
21.8 ✅
21.9 ⏳ diseñado, sin código todavía
```

No hay que volver a revisar 21.7/21.8 desde cero.

El siguiente cambio de código debe ser:

```text
21.9.1 — configuración de hora de backup automático
```

---

# 88. Orden recomendado al retomar 21.9.1

1. Revisar `main` actual después de que este documento sea subido.
2. Revisar todos los consumidores de `AppData`.
3. Añadir `backupAutomaticTime` al contrato público.
4. Implementar compatibilidad de lectura con default `03:00`.
5. Añadir el campo a instalación nueva.
6. Añadir el campo a Ajustes.
7. Añadir validación Renderer.
8. Añadir validación Main.
9. Actualizar mappers.
10. Revisar restore nativo y legacy.
11. Añadir/actualizar tests.
12. Ejecutar batería completa del Client.
13. Hacer prueba funcional:
    - instalación existente;
    - nueva instalación;
    - edición de hora;
    - reload y persistencia.
14. Hacer push.
15. Releer `main`.
16. Pasar a `21.9.2`.

---

# 89. Posibles nombres y constantes

No son código decidido todavía, pero conviene centralizar:

```text
DEFAULT_BACKUP_AUTOMATIC_TIME = '03:00'
```

Evitar repetir el literal en:

- repository;
- form initial value;
- validator;
- scheduler;
- tests.

Antes de crear el archivo de constantes, revisar la convención actual del proyecto para constantes de configuración.

---

# 90. Consideración sobre campo obligatorio

Hay dos niveles de obligatoriedad:

## Configuración persistida

Debe existir siempre lógicamente:

```text
AppData.backupAutomaticTime: string
```

Incluso si la instalación no tiene TPV Backup conectado.

## Nueva instalación

Si se están introduciendo datos TPV Backup:

```text
hora obligatoria
```

Como tendrá default `03:00`, la experiencia normal no exige escribirla manualmente.

Esto mantiene el contrato simple:

```text
no null
no undefined en AppData runtime
```

---

# 91. Por qué no usar `string | null`

Se descarta inicialmente:

```ts
backupAutomaticTime: string | null
```

porque:

- existe un default natural;
- complica scheduler;
- complica restore;
- obligaría a interpretar null;
- no aporta un estado de negocio útil.

Desactivar backups automáticos NO forma parte todavía del requisito.

Si en el futuro se quiere un toggle:

```text
backupAutomaticEnabled
```

deberá ser una decisión explícita, no codificarse indirectamente con `null`.

---

# 92. No existe todavía un toggle de backups automáticos

Decisión actual:

```text
TPV Backup correctamente configurado
+
suscripción active/canUpload
→ backups automáticos activos
```

El usuario no ha pedido poder desactivarlos manteniendo TPV Backup conectado.

No añadir esa opción anticipadamente.

---

# 93. Qué significa “correctamente configurado”

Para scheduler:

```text
Key ID + Secret existen localmente
↓
getConnection()
↓
auth correcta
↓
subscription.status = active
↓
canUpload = true
```

No basta con que exista un fichero de credenciales.

---

# 94. Qué ocurre con `expired`

```text
expired
→ no generar backup automático
→ no marcar ciclo como completado
→ reintentar posteriormente
```

Si la suscripción se renueva ese mismo día, el scheduler podrá cubrir el vencimiento pendiente.

---

# 95. Qué ocurre con `disabled` o credencial revocada

```text
auth falla
→ no generar `.otpv`
→ no marcar éxito
→ mantener ciclo pendiente
```

No eliminar automáticamente credenciales locales por este hecho.

La administración puede reactivar/rotar y recuperar el servicio.

---

# 96. Qué ocurre sin TPV Backup configurado

```text
credentialStorage.load() = null
→ scheduler no hace nada
```

No mostrar errores.

La instalación sigue operativa normalmente.

---

# 97. Qué ocurre sin TPV Backup key

`BackupRemoteCreateService` acabaría fallando al generar el paquete, pero el scheduler debería intentar evitar trabajo innecesario cuando sea posible.

No obstante, la fuente de verdad del secreto sigue siendo `BackupService`.

No duplicar lógica de lectura de secreto en demasiadas capas.

---

# 98. Última copia automática y privacidad

La fecha de última ejecución no es sensible.

Puede mostrarse en Renderer mediante un contrato específico del scheduler en `21.9.5`.

No exponer:

```text
storage paths
Secret
JWT
TPV Backup key
```

---

# 99. Prompt recomendado para una conversación nueva

```text
Quiero continuar el Hito 21 de Osumi TPV Client.

Usa como referencia principal:

docs/osumi-tpv-continuidad-v2.88.md

Estado:
- 21.1 `.otpv` v3 ✅
- 21.2 exportador nativo ✅
- 21.3 restauración nativa ✅
- 21.4 TPV Backup Front ✅
- 21.5 API remota ✅
- 21.6 integración Client ↔ TPV Backup ✅
- 21.7 seguridad/integridad/retención ✅
- 21.8 regresión global ✅
- 21.9 backups remotos automáticos ▶️
  - 21.9.1 configuración de hora ⏳

HEADs al generar v2.88:

Osumi TPV Client:
f61611c8d68ac9e5456104a192086d0c4eaaca74
Correcciones de estado caducado en backups 21.8.2a

TPV Backup API:
d1d3bdcde95d0e7d848347ec434b499025caa1b5
Tarea de reconciliacion 21.7.3a

TPV Backup Front:
1be138f8e280646b9419f9fe60287111174e890e
Corrección en mensaje al desactivar subscripción

21.7 está completamente cerrado.
21.8 está completamente cerrado y validado funcionalmente.

Durante 21.8 se corrigió:
- getConnection() ahora refresca siempre el estado administrativo real;
- la UI elimina conexión/listado obsoletos cuando falla autenticación;
- el Front explica correctamente que disabled bloquea todo el acceso.

Se han probado en real:
- active / expired / disabled;
- rotación y revocación;
- clave criptográfica incorrecta + retry correcto;
- blob corrupto manteniendo tamaño;
- rechazo por SHA;
- interrupción antes y después de unlock;
- recovery limpio;
- retención E2E.

Nuevo bloque 21.9:
backups remotos automáticos diarios.

Decisiones ya cerradas:
- hora configurable por instalación;
- default 03:00;
- formato HH:mm;
- hora local;
- obligatoria;
- almacenada en app_data.json;
- portable dentro del `.otpv`;
- backups antiguos sin campo usan 03:00;
- estado scheduler local NO portable;
- fichero previsto config/backup_automatic_state.json;
- guardar lastSuccessfulAt;
- si se pierde la hora por app cerrada/suspensión, ejecutar al siguiente arranque/resume;
- si falla, no marcar éxito y reintentar aprox. cada hora;
- si estuvo apagado varios días, crear solo un backup al volver;
- reutilizar BackupRemoteCreateService;
- no crear un segundo pipeline;
- suscripción active + canUpload obligatoria;
- no añadir toggle de activación todavía;
- la copia manual no sustituye al ciclo automático;
- UI de Copias mostrará hora y última copia automática en 21.9.5.

Siguiente tarea exacta:
21.9.1 — añadir backupAutomaticTime end-to-end:
AppData + compatibilidad + nueva instalación + Ajustes + validaciones + mappers + tests + restore/legacy.

Antes de proponer código:
1. revisa main;
2. lee todos los consumidores de AppData;
3. comprueba validadores de restore;
4. centraliza el default 03:00;
5. trabaja en un bloque pequeño;
6. ejecuta batería completa;
7. tras el push vuelve a revisar main.
```

---

# 100. Resumen ejecutivo

Estado funcional:

```text
.otpv v3                               ✅
AES-256-GCM + scrypt                   ✅
snapshot SQLite                        ✅
backup local                           ✅
restore local                          ✅
TPV Backup Front                       ✅
TPV Backup API                         ✅
auth instalación                       ✅
upload remoto                          ✅
download streaming                     ✅
SHA end-to-end                         ✅
delete remoto                          ✅
retención                              ✅
auditoría                              ✅
reconciliación storage                 ✅
credenciales safeStorage               ✅
JWT solo RAM                           ✅
restore remoto                         ✅
credenciales portables                 ✅
recovery de interrupciones             ✅
active/expired/disabled                ✅
revocación/rotación                    ✅
regresión global 21.8                  ✅
backup remoto automático               ⏳
hora configurable                      ⏳
scheduler                              ⏳
```

Arquitectura crítica:

```text
TPV Backup key
→ secreto criptográfico
→ nunca servidor
→ nunca dentro del `.otpv`

Key ID + Secret
→ autenticación remota
→ safeStorage
→ dentro del payload cifrado
→ restaurables

JWT
→ efímero
→ solo RAM

TPV Backup API
→ custodia blobs cifrados
→ valida estructura e integridad
→ no puede descifrar payload

Backup automático
→ no crea pipeline nuevo
→ reutiliza BackupRemoteCreateService
→ hora configurable en AppData
→ estado de ejecución local no portable
```

Siguiente bloque:

```text
21.9.1 — Configuración de hora de backup automático
```

---

**Fin del documento de continuidad v2.88**
