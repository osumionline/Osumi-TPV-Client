# Osumi TPV Client — Documento de continuidad v2.87

**Fecha:** 6 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** `https://github.com/osumionline/Osumi-TPV-Client`  
**Repositorio TPV Backup API:** `https://github.com/osumionline/TPV-Backup-API`  
**Repositorio TPV Backup Front:** `https://github.com/osumionline/TPV-Backup-Front`

Este documento actualiza y sustituye como referencia de continuidad a:

`docs/osumi-tpv-continuidad-v2.86.md`

La fuente de verdad para continuar el desarrollo será:

```text
main actual de los repositorios
+
este documento
+
la conversación activa
```

El documento `docs/tpv-backup-contexto-tecnico-v1.0.md` continúa siendo útil como referencia histórica del arranque de TPV Backup, pero sus apartados sobre API e integración con el Client están ampliamente superados por el estado descrito aquí.

---

## 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental, controlada y verificable.

### Unidad de trabajo

Cada propuesta debe ser una unidad pequeña y coherente. No significa necesariamente un archivo por mensaje: se pueden agrupar varios archivos cuando forman un único bloque funcional.

Reglas:

- agrupar únicamente cambios que pertenezcan a la misma responsabilidad;
- evitar cambios masivos;
- evitar fragmentar artificialmente un cambio sencillo;
- cada bloque debe poder probarse de forma clara antes de continuar;
- no continuar si existen errores de compilación, lint o tests;
- realizar prueba funcional real cuando el cambio afecte a flujos de backup, restore, persistencia, red o filesystem.

### Antes de proponer código

Siempre:

1. revisar el `main` actual;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, helpers, contratos, campos ni APIs;
4. comprobar el comportamiento real de las capas existentes;
5. reutilizar pipelines existentes en lugar de crear sistemas paralelos;
6. distinguir decisiones cerradas de hipótesis o propuestas futuras.

### Entrega de cambios

Para archivos nuevos:

> indicar ruta exacta y contenido completo.

Para archivos existentes:

> indicar ruta, bloque claramente identificable y reemplazo exacto.

### GitHub

Uso estrictamente de solo lectura desde ChatGPT.

No crear ni modificar remotamente:

- commits;
- ramas;
- pull requests;
- issues;
- comentarios;
- archivos.

El usuario aplica los cambios localmente, ejecuta tests y hace push.

Después de cada push confirmado:

> volver a revisar `main` antes de continuar.

### Batería estable del Client

Cuando un bloque del Client se considere listo para validar:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

No sustituir esta batería por subconjuntos cuando se solicite la validación final de un bloque estable.

Para TPV Backup API:

```bash
composer test
```

---

## 2. Reglas permanentes de código

### JSDoc / PHPDoc

Regla expresa:

> Todo método creado o modificado debe tener JSDoc/PHPDoc.

También las firmas de interfaces cuando se introduzcan métodos nuevos.

### Exports TypeScript

Convención expresa del proyecto:

```text
1 único símbolo exportado
→ export default

2 o más símbolos exportados
→ todos exports nominales
→ nunca export default
```

### Angular

Referencia actual:

```text
Angular 22+
standalone
zoneless
signals
```

Convenciones:

- `inject()` para DI;
- `input()` / `output()` signals;
- signal queries;
- `@if`, `@for`, `@switch`;
- Signal Forms cuando corresponda;
- tipado estricto;
- evitar `any`;
- usar `unknown` cuando sea necesario;
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

## 3. HEADs verificados al generar v2.87

### Osumi TPV Client

```text
64f4bed3252b0a54d93d540898c7063b98aa57e6
Terminado restauración de copia remota 21.6.8b
```

Commits relevantes desde v2.86:

```text
6e7459c514fcdce1244cb7975244f3aea229c801
Terminado Upload remoto streaming 21.6.5a

705414ca6a551b2dcd134aedbe550451d73e0999
Envío de copias remotas 21.6.5

4b1af5d70a430b1343f581d4fbdc28317a2fe672
Terminado descarga HTTP streaming 21.6.6a

3b72847a9c6a32ba89d66b3a2c578b15fd89a3cc
Terminado descarga remota de backups 21.6.6b

60ac00e73bd61e709bd8f5076c2f9ab243f6a635
Terminado borrado de copia remota 21.6.7

79072988c5ae6a6eddf777fe66aaae41a03233b1
Terminado restauración a partir de copia remota 21.6.8a

64f4bed3252b0a54d93d540898c7063b98aa57e6
Terminado restauración de copia remota 21.6.8b
```

### TPV Backup API

```text
1ba68110749b6c647c7c868d1db00cf7d429b074
Verificar el SHA 21.7.1
```

Commit anterior de referencia:

```text
63b9fc42478f5a585eca96370d2d7f4d94adbed5
Metodo para borrar un backup remotamente
```

### TPV Backup Front

```text
469109cf3d0c7f3ab2170273f7a56d5338052b68
Actualizo pagina de auditoria
```

No ha necesitado cambios durante 21.6 ni durante 21.7.1.

---

## 4. Estado general de hitos

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
   ▶️ 21.7 Seguridad / integridad / retención
      ✅ 21.7.1 Verificación SHA-256 del blob almacenado
      ⏳ cierre global del bloque pendiente
   ⏳ 21.8 Regresión recuperación global

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

---

## 5. Arquitectura actual de TPV Backup

La solución está dividida en tres aplicaciones.

### Osumi TPV Client

Responsabilidades:

- crear `.otpv`;
- restaurar `.otpv`;
- almacenar de forma segura la TPV Backup key;
- configurar credenciales de servicio `Key ID + Secret`;
- autenticar contra TPV Backup;
- crear y subir backups remotos;
- listar backups remotos;
- descargar backups remotos;
- borrar backups remotos;
- restaurar una instalación limpia directamente desde TPV Backup.

### TPV Backup API

Responsabilidades:

- autenticar instalaciones;
- emitir JWT de corta duración;
- aplicar ownership;
- almacenar blobs cifrados;
- validar estructura pública del `.otpv`;
- persistir metadatos;
- aplicar retención;
- servir descargas;
- borrar backups;
- registrar auditoría;
- administrar suscripciones, instalaciones y credenciales.

### TPV Backup Front

Panel administrativo para:

- login de administración;
- dashboard;
- suscripciones;
- instalaciones;
- credenciales;
- backups;
- auditoría;
- descarga y borrado administrativo.

### Principio zero-knowledge

El servidor almacena el `.otpv` cifrado pero no conoce la clave necesaria para abrir su payload funcional.

El servidor **nunca recibe la TPV Backup key**.

---

## 6. Versiones actuales relevantes

### Client

`package.json` actual:

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

### TPV Backup Front

```text
Angular                 22.2.1
Angular Material        22.2.1
TypeScript              ~6.0.2
npm                     12.2.0
```

### TPV Backup API

```text
PHP                     >= 8.5
Osumi Framework         ^9.10.1
plugin-token            ^3.0
PHPUnit                 ^13.3
```

Osumi Framework 9.10.0 introdujo `OStreamResponse`.

Osumi Framework 9.10.1 corrigió la propagación de `OCore::setHttpStatus()` en el flujo de middleware/respuesta.

---

## 7. Dominios y endpoints

### Front administrativo

```text
https://tpvbackup.osumi.dev
```

### API

```text
https://apitpvbackup.osumi.dev
```

Base URL usada actualmente por Electron:

```text
https://apitpvbackup.osumi.dev/api/v1
```

Está compuesta directamente en `electron/bootstrap/application-composition.ts`.

No existe por ahora una segunda configuración de entorno para esta URL.

---

## 8. Identidades y secretos — no confundir

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

### TPV Backup key

Es el secreto maestro criptográfico utilizado para abrir los `.otpv`.

Reglas:

- bytes UTF-8 exactos;
- no `trim()`;
- no normalización;
- nunca se envía al servidor;
- nunca se incluye dentro del `.otpv`;
- se utiliza para derivar la KEK con `scrypt`.

### Key ID + Secret

Credenciales de servicio de una instalación frente a TPV Backup.

Reglas:

```text
Key ID
→ puede normalizarse con trim en capa de aplicación

Secret
→ conservar exactamente
→ no trim
```

Persistencia local:

```text
secrets/backup_remote_credentials.json
```

Se cifra con Electron `safeStorage`.

No forma parte de `InstallationSecretsData`.

### JWT remoto

Reglas:

- solo memoria;
- no se persiste;
- no cruza al Renderer;
- no se incluye en `.otpv`;
- margen de renovación en Client: 30 segundos;
- TTL de API por defecto/config actual: 3600 segundos.

---

## 9. `.otpv` v3 — contrato definitivo actual

Contenedor exterior ZIP con exactamente:

```text
manifest.json
payload.enc
```

`payload.enc` es un ZIP interior cifrado.

### Algoritmos

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
- KEK derivada desde la TPV Backup key;
- key wrapping también con AES-256-GCM;
- IV de 12 bytes;
- auth tag de 16 bytes.

### Payload portable

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

El `payload.enc` exterior debe almacenarse con:

```text
ZipArchive::CM_STORE
```

sin compresión ZIP adicional.

### Tamaño máximo contractual

```text
8 GiB
```

No cargar un `.otpv` completo en memoria ni durante upload ni durante download.

---

## 10. `secrets/secrets.json` — schema 1

Como todavía no hay producción histórica que mantener, se decidió no inventar una compatibilidad schema 1/schema 2.

Contrato inicial real:

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
→ NO aparece en secrets/secrets.json
→ NO aparece en ningún otro lugar del `.otpv`
```

La TPV Backup key debe aportarse externamente al restaurar.

---

## 11. Filesystem del Client

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

Subdirectorios temporales utilizados actualmente:

```text
staging/remote-upload/
staging/remote-restore/
staging/restore-work/
```

`FileInstallationFinalizer.recover()` limpia `staging` al arrancar y corrige instalaciones/restauraciones interrumpidas.

---

## 12. Backup local

`BackupService.createLocal()` continúa siendo una operación puramente local.

Genera un `.otpv` en:

```text
backups/
```

El resultado público no expone la ruta completa.

Contrato:

```ts
interface BackupCreateResult {
  readonly backupId: string;
  readonly createdAt: string;
  readonly fileName: string;
  readonly sizeBytes: number;
}
```

Internamente `BackupService.createFile()` permite generar un `.otpv` en un directorio controlado por Main.

Existe un guard de concurrencia para evitar crear simultáneamente varias copias sobre los mismos recursos/snapshot.

---

## 13. Snapshot SQLite

Client:

```text
better-sqlite3
WAL
```

Regla:

> Nunca copiar directamente la SQLite operacional.

El backup utiliza un snapshot consistente.

La SQLite restaurada es autocontenida y no depende de:

```text
-wal
-shm
```

Validaciones de restore:

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

## 14. Restauración local v3

Pipeline existente y reutilizado por el restore remoto:

```text
seleccionar `.otpv`
↓
validar contenedor exterior
↓
registrar selección
↓
introducir TPV Backup key
↓
volver a inspeccionar el paquete
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

La restauración solo se permite sobre instalación limpia.

### Protección contra cambio del paquete

`OtpvV3RestoreUnlockService` vuelve a inspeccionar el `.otpv` inmediatamente antes de descifrarlo.

El manifest actual debe coincidir con el manifest registrado durante la selección.

Si cambia:

```text
→ restore rechazado
```

### Secretos restaurados

`FileOtpvV3RestoreStagingPreparer` reconstruye `InstallationSecretsData` con:

```text
secretApi
emailSmtpPass
ticketBaiToken
+
TPV Backup key introducida externamente
```

### Credenciales remotas restauradas

Las credenciales `Key ID + Secret` incluidas dentro del payload cifrado:

```text
unlock
↓
InMemoryOtpvV3PreparedRestoreStore
↓
finalize
↓
ElectronSafeStorageBackupRemoteCredentialStorage
```

No se persisten antes de la promoción final.

### Impresión

`printing_settings.json` es local al equipo y no se restaura.

Después de restore:

```text
ticketPrinterDeviceName = null
```

---

## 15. Recuperación ante instalación/restauración interrumpida

`app_data.json` funciona como marcador final de instalación completa.

Si existe:

```text
instalación completa
→ cualquier staging residual se limpia
```

Si no existe:

```text
instalación/promoción incompleta
→ limpiar recursos finales parciales
→ limpiar credenciales remotas potencialmente huérfanas
→ reset staging
```

Se eliminan también:

```text
backup_remote_credentials.json
backup_remote_credentials.json.tmp
```

únicamente cuando `recover()` determina que no existe una instalación completa.

Esto evita que una caída entre configuración de TPV Backup y promoción final deje credenciales remotas huérfanas.

---

## 16. TPV Backup API — configuración relevante

`src/Config/Config.json` versionado actualmente contiene:

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

Los servicios de autenticación requieren además secretos runtime para los tokens:

```text
admin_token_secret
installation_token_secret
```

No deben incorporarse al repositorio.

Antes de producción hay que revisar como parte del hardening global:

- `environment`;
- `log_level`;
- CORS real desplegado;
- aprovisionamiento de secretos;
- límites PHP/webserver.

---

## 17. Storage remoto

Storage lógico:

```text
storage/backups
```

fuera del webroot.

Clave de storage:

```text
installations/<installation.public_id>/<backup.public_id>.otpv
```

No se utiliza el filename del cliente como path físico.

`FileBackupStorage`:

- restringe los segmentos permitidos;
- rechaza `.` y `..`;
- evita traversal;
- crea el fichero mediante temporal;
- hace `rename()` únicamente tras completar la copia;
- no sobrescribe destinos existentes;
- elimina directorios padre vacíos después del delete.

---

## 18. API remota — rutas definitivas

### Autenticación de instalación

```text
POST /api/v1/auth/token
GET  /api/v1/me
```

### Backups de instalación

```text
POST   /api/v1/backups
GET    /api/v1/backups
GET    /api/v1/backups/:publicId/download
DELETE /api/v1/backups/:publicId
```

Las rutas de backups pasan por:

```text
InstallationAuthMiddleware
```

El `publicId` remoto del backup nunca debe confundirse con el `backupId` del manifest.

---

## 19. Autenticación de instalaciones

`POST /api/v1/auth/token` recibe:

```text
Key ID
Secret
```

El `Key ID` se normaliza con `trim`.

El `Secret` no se normaliza.

JWT contiene, entre otros:

```text
type = installation
installation_id
installation_public_id
credential_id
key_id
iat
exp
```

TTL actual:

```text
3600 s
```

### Revalidación en cada request

`InstallationAuthMiddleware` no confía únicamente en un JWT firmado.

`InstallationAuthService.authenticateToken()` vuelve a comprobar:

- credencial;
- `revoked_at`;
- `key_id`;
- instalación;
- estado activo de instalación;
- suscripción;
- estado activo de suscripción.

Consecuencia importante:

> Revocar o rotar una credencial invalida también un JWT todavía no expirado.

---

## 20. Semántica de suscripción

Estados:

```text
active = false
→ instalación/suscripción no utilizable

active = true + expires_at pasado
→ expired

active = true + expires_at futuro o null
→ active
```

Política definitiva:

```text
ACTIVE
token       ✅
/me         ✅
list        ✅
download    ✅
delete      ✅
upload      ✅

EXPIRED
token       ✅
/me         ✅
list        ✅
download    ✅
delete      ✅
upload      ❌
```

Objetivo:

> Una suscripción caducada no debe bloquear la recuperación ni eliminación de los datos existentes.

---

## 21. API upload — comportamiento actual

`POST /api/v1/backups`

Campo multipart exacto:

```text
file
```

Controles:

```text
CONTENT_LENGTH > post_max_size
→ 413

DTO/file/context inválidos
→ 400

canUpload !== true
→ 403

UPLOAD_ERR_INI_SIZE / FORM_SIZE
→ 413

NO_FILE / PARTIAL
→ 400

otros upload errors
→ 500

.otpv inválido
→ 422

backupId conflictivo
→ 409
```

Máximo de aplicación:

```text
8 GiB
```

El API usa `is_uploaded_file()` y comprueba tamaño real.

---

## 22. Inspector `.otpv` del API

`OtpvV3InspectorService` valida sin descifrar:

- ZIP válido;
- exactamente `manifest.json` + `payload.enc`;
- `payload.enc` con `CM_STORE`;
- manifest máximo 64 KiB;
- claves exactas;
- `formatVersion = 3`;
- `application = Osumi TPV Client`;
- `backupId` UUID v4;
- fecha ISO válida;
- `cryptoSuite` exacta;
- KDF exacto;
- tamaños Base64 de salt/IV/auth tags/wrapped DEK;
- descriptor de payload exacto;
- tamaño total;
- SHA-256 total del `.otpv`.

El servidor sigue sin conocer el contenido cifrado del payload.

---

## 23. Idempotencia del upload

Un retry exacto es idempotente cuando:

```text
mismo backupId
+
misma instalación
+
mismo SHA-256
+
storage existente y consistente
```

No crea una segunda fila ni una segunda auditoría `backup.create`.

Conflictos:

```text
mismo backupId
+
otra instalación
→ conflicto

mismo backupId
+
SHA distinto
→ conflicto
```

También se contempla la carrera entre dos uploads simultáneos del mismo backup.

---

## 24. Retención remota

La retención se configura mediante:

```text
subscription.max_backups_per_installation
```

El valor de referencia usado en tests es:

```text
6
```

No hay un límite hardcoded universal en `BackupService`: se obtiene desde la suscripción.

Orden de eliminación:

```text
created_at_client ASC
+
id ASC como desempate determinista
```

Después de crear o resolver idempotentemente un backup:

```text
enforceRetentionSafely()
```

La retención es best effort:

- una copia recién guardada no se invalida si falla el cleanup;
- el fallo se registra;
- una operación posterior puede volver a intentar limpiar exceso.

Cada eliminación automática genera auditoría:

```text
retention_delete
```

Nota operativa:

> Durante pruebas anteriores se llegó a modificar temporalmente el límite de una suscripción. Antes de pruebas de volumen conviene comprobar el valor real configurado en la suscripción utilizada.

---

## 25. Auditoría

Acciones relevantes ya registradas:

```text
backup.create
backup.download
backup.delete
retention_delete
```

Actores:

```text
admin
installation
system
```

La auditoría almacena metadatos no sensibles.

Regla permanente:

> No registrar TPV Backup key, Secret remoto, JWT, `secretApi`, credenciales SMTP, token TicketBAI, KEK, DEK ni payload descifrado.

Sí se pueden registrar de forma sanitizada:

- `backup.public_id`;
- `backupId`;
- `installation.public_id`;
- filename;
- bytes;
- operación;
- status;
- error técnico no sensible.

---

## 26. 21.6.1–21.6.4 — base remota del Client

Antes de los flujos de transferencia ya estaban cerrados:

- cliente HTTP remoto;
- almacenamiento seguro de Key ID + Secret;
- `BackupRemoteService`;
- JWT solo en Main;
- IPC protegido con `assertTrustedSender`;
- `DesktopBackupService`;
- configuración desde Gestión;
- configuración durante una instalación nueva;
- listado remoto;
- estado active/expired;
- portable secrets;
- restore de credenciales remotas;
- aviso en imports legacy;
- recovery de credenciales huérfanas.

---

## 27. 21.6.5 — creación y upload remoto

Estado:

```text
✅ cerrado
```

### Arquitectura

Una copia remota **no crea primero una copia permanente en `backups/`**.

Flujo:

```text
UI "Nueva copia remota"
↓
BackupRemoteCreateService
↓
preflight getConnection()
↓
canUpload
↓
BackupService.createFile(staging/remote-upload)
↓
.otpv temporal
↓
HttpBackupRemoteClient.upload()
↓
multipart/form-data
↓
API
↓
validar respuesta
↓
eliminar .otpv temporal
```

### Streaming de upload

`HttpBackupRemoteClient` usa:

```text
node:fs openAsBlob()
FormData
fetch
```

El Blob está respaldado por el fichero local.

No se utiliza:

```text
readFile()
arrayBuffer()
```

para materializar el `.otpv` completo.

No se fija manualmente `Content-Type` del multipart; `fetch/FormData` genera el boundary.

### Coordinación

`BackupRemoteCreateService`:

- comprueba que existan credenciales;
- comprueba `canUpload`;
- genera el paquete temporal;
- sube;
- compara `backupId + sizeBytes` de la respuesta;
- elimina el temporal incluso ante error;
- impide dos creaciones remotas simultáneas.

`BackupService` mantiene además su propio guard de creación para evitar generación local/remota simultánea.

### Prueba funcional realizada

Desde la aplicación:

```text
Nueva copia remota
→ copia creada
→ subida correctamente
→ visible en TPV Backup
```

Validado.

---

## 28. 21.6.6a — download HTTP streaming

Estado:

```text
✅ cerrado
```

`HttpBackupRemoteClient.download()`:

```text
GET /backups/:publicId/download
↓
ReadableStream
↓
chunks
↓
SHA-256 incremental
↓
escritura incremental a disco
```

No usa `response.arrayBuffer()`.

### Controles durante transferencia

- máximo 8 GiB sobre bytes reales;
- apertura destino con `wx`;
- permisos `0600`;
- manejo de escrituras parciales;
- SHA-256 incremental;
- limpieza del fichero parcial si falla la transferencia.

### Content-Length

El API envía `Content-Length`, pero en una prueba funcional real Electron recibió `200` y el header no estaba expuesto.

Decisión definitiva:

```text
Content-Length presente
→ validarlo
→ comprobar tamaño anunciado

Content-Length ausente
→ permitido
```

La integridad **no depende** de ese header.

Siempre se mantiene:

```text
límite 8 GiB sobre bytes reales
+
sizeBytes real
+
SHA-256 real
```

---

## 29. 21.6.6b — descarga remota a `backups/`

Estado:

```text
✅ cerrado
```

El Renderer envía únicamente:

```text
publicId
```

Main vuelve a consultar el listado remoto y obtiene metadatos autoritativos.

Flujo:

```text
publicId
↓
list()
↓
BackupRemoteBackup autoritativo
↓
descarga streaming a .tmp
↓
calcular sizeBytes + sha256
↓
comparar con metadata remota
↓
rename atómico
↓
backups/*.otpv
```

`BackupRemoteDownloadService` no confía en:

- rutas del Renderer;
- filename remoto como path físico;
- hashes enviados por Angular.

Nombre local generado:

```text
osumi-tpv-backup-remote-<uuid>.otpv
```

El `originalFilename` se conserva únicamente como metadato/presentación.

### Prueba funcional realizada

```text
Descargar
→ fichero recibido
→ SHA/tamaño válidos
→ nuevo .otpv visible en backups/
```

Validado.

---

## 30. Semántica de copia local descargada

Una copia descargada desde TPV Backup pasa a ser una **copia local independiente**.

Por diseño:

```text
borrar backup remoto
≠
borrar copia local descargada
```

Si el usuario descarga:

```text
TPV Backup
↓
backups/*.otpv
```

y después elimina la copia remota:

```text
servidor → borrado
backups/ → permanece
```

No existe una relación persistente `remote publicId ↔ local file`.

No introducir borrado local implícito.

---

## 31. 21.6.7 — delete remoto

Estado:

```text
✅ cerrado
```

Flujo:

```text
Eliminar
↓
confirmación explícita
↓
publicId
↓
IPC
↓
BackupRemoteService.delete()
↓
JWT / retry si 403
↓
DELETE /backups/:publicId
↓
validar publicId devuelto
↓
refrescar listado
```

El delete está permitido también con suscripción `expired`.

La UI diferencia claramente:

```text
Desconectar TPV Backup
```

de:

```text
Eliminar una copia remota
```

Desconectar solo elimina la credencial local.

### Prueba funcional realizada

- confirmación correcta;
- backup remoto eliminado;
- desaparece del listado;
- copia local descargada previamente sigue existiendo.

Validado.

---

## 32. 21.6.8a — acceso remoto temporal desde instalación limpia

Estado:

```text
✅ cerrado
```

La pantalla existente:

```text
Configuración → Restaurar copia de seguridad
```

mantiene dos orígenes:

```text
Desde este equipo
Desde TPV Backup
```

No se creó una página Angular nueva.

### Credenciales temporales

Para una máquina limpia se creó:

```text
InMemoryBackupRemoteCredentialStorage
```

Las credenciales introducidas para localizar la copia:

```text
Key ID
Secret
```

se almacenan solo en RAM de Main.

No se escriben en:

```text
secrets/backup_remote_credentials.json
```

antes del restore.

### Motivo

Las credenciales temporales usadas para encontrar el backup no tienen por qué ser las credenciales que finalmente deban quedar instaladas.

Las credenciales definitivas son las que están dentro del payload cifrado de la copia restaurada.

### Renderer

Tras conectar correctamente:

```text
Key ID + Secret
↓
Main
↓
Renderer limpia ambos campos
```

JWT sigue solo en Main.

### Prueba funcional realizada

Con datos locales borrados:

```text
abrir Client limpio
↓
Restaurar copia
↓
Key ID + Secret
↓
conectar
↓
listado remoto correcto
```

Validado.

---

## 33. 21.6.8b — restore completo desde TPV Backup

Estado:

```text
✅ cerrado
```

Se reutiliza el pipeline local. No existe un segundo sistema de restore.

### Componentes clave

```text
BackupRemoteDownloadService
BackupRemoteRestoreSelectionService
BackupRestoreSelectionService
OtpvPackageSelectionService
OtpvV3RestoreUnlockService
OtpvV3RestoreFinalizeService
```

### Directorio temporal

```text
staging/remote-restore/
```

### Flujo

```text
Client limpio
↓
Key ID + Secret temporales
↓
listado remoto
↓
seleccionar "Restaurar"
↓
BackupRemoteDownloadService
↓
streaming + size + SHA-256
↓
staging/remote-restore/*.otpv
↓
BackupRestoreSelectionService.selectPackagePath()
↓
inspección `.otpv`
↓
comprobar backupId del manifest
   == backupId remoto
↓
selectedPackage
↓
introducir TPV Backup key
↓
OtpvV3RestoreUnlockService
↓
pipeline v3 normal
↓
staging canónico
↓
OtpvV3RestoreFinalizeService
↓
instalación definitiva
```

### Controles de integridad antes de descifrar

La copia remota debe pasar:

```text
size real == size remoto
SHA-256 real == SHA remoto
backupId manifest == backupId remoto
```

Después entra en las validaciones criptográficas y estructurales normales del restore v3.

### Limpieza

`BackupRemoteRestoreSelectionService` conserva como máximo un paquete remoto temporal.

Se limpia cuando:

- se inicia otra selección;
- se desconecta la sesión remota;
- se quita la selección remota;
- falla la selección;
- `FileInstallationFinalizer` limpia staging al completar/recover.

### Prueba funcional completa realizada

Se validó el flujo real:

```text
borrar datos locales
↓
abrir aplicación limpia
↓
introducir Key ID + Secret
↓
listar backup remoto
↓
elegir copia
↓
descargar
↓
introducir TPV Backup key
↓
validar y preparar
↓
activar restauración
↓
instalación operativa
```

Sin errores.

Este punto cierra funcionalmente el objetivo crítico:

```text
Client A
→ TPV Backup
→ Client B limpio
```

---

## 34. Gestión → Copias de seguridad — estado final de 21.6

La pantalla permite actualmente:

### Copias locales

```text
Nueva copia local
```

### TPV Backup sin configurar

```text
Key ID
Secret
Conectar con TPV Backup
```

### TPV Backup configurado

Muestra:

- instalación;
- suscripción;
- estado `active` / `expired`;
- listado remoto;
- fecha cliente;
- filename;
- backupId;
- versión;
- tamaño.

Acciones:

```text
Nueva copia remota
Actualizar
Cambiar credenciales
Desconectar
Descargar
Eliminar
```

Las acciones se bloquean entre sí durante operaciones largas para evitar carreras innecesarias.

El permiso sigue siendo:

```text
gestion.copias_seguridad
```

No introducir bypass específico.

---

## 35. `BackupRemoteService` — comportamiento actual

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

### Sesión

```text
JWT solo memoria
```

Se renueva si:

```text
expiresAt <= now + 30s
```

### Rechazo administrativo anticipado

Si una operación devuelve `403` aunque el JWT aún pareciera vigente:

```text
descartar JWT
↓
autenticar una vez con credenciales persistidas
↓
reintentar operación una única vez
```

Esto permite reaccionar a:

- revocación;
- rotación;
- desactivación administrativa.

### `canUpload`

Se aplica únicamente a upload.

No bloquear por `canUpload = false`:

```text
list
download
delete
```

---

## 36. Errores HTTP remotos normalizados en Client

Mapa actual:

```text
401 → unauthorized
403 → forbidden
404 → not-found
409 → conflict
413 → too-large
422 → invalid-backup
408 → temporary
425 → temporary
429 → temporary
5xx → temporary
JSON inválido → invalid-response
otros → unexpected
```

Infraestructura conserva un tipo técnico estable.

La UI puede traducirlo a mensajes adecuados sin perder la clasificación interna.

---

## 37. Seguridad del IPC

Recorrido:

```text
Angular
↓
DesktopBackupService
↓
preload
↓
IPC
↓
assertTrustedSender
↓
servicios Main
```

No se exponen al Renderer:

- JWT almacenado;
- Secret persistido;
- rutas internas de filesystem para backups;
- TPV Backup key persistida.

El Renderer sí puede enviar credenciales introducidas explícitamente por el usuario cuando corresponde a un flujo de configuración/restauración.

---

## 38. SafeStorage

### Secretos operativos

`secrets/secrets.json`

### Credenciales TPV Backup

`secrets/backup_remote_credentials.json`

La implementación remota usa Electron `safeStorage`.

Persistencia:

```text
cifrado
.tmp
rename atómico
modo de fichero 0600
```

La configuración remota se mantiene separada de `InstallationSecretsData`.

---

## 39. Importación legacy v2

Los `.otpv` del TPV antiguo pueden contener:

```text
backupApiKey
```

pero no pueden contener:

```text
TPV Backup Key ID
TPV Backup Secret
```

porque esas credenciales no existían en el sistema anterior.

Si una importación legacy recupera `backupApiKey`, se muestra aviso de que las credenciales remotas deben configurarse después desde:

```text
Gestión → Copias de seguridad
```

No inventar ni generar credenciales retrospectivamente.

---

## 40. 21.7.1 — integridad del blob almacenado

Estado:

```text
✅ cerrado
```

API HEAD:

```text
1ba68110749b6c647c7c868d1db00cf7d429b074
Verificar el SHA 21.7.1
```

### Problema detectado

Antes:

```text
upload temporal PHP
↓
OtpvV3InspectorService
↓
SHA-256 del fichero recibido
↓
copiar a storage
↓
comprobar solo tamaño del storage
↓
persistir metadata
```

Una corrupción durante la copia que mantuviera exactamente el mismo tamaño podía dejar:

```text
metadata.sha256 = SHA del origen
blob físico = contenido distinto
```

### Solución

Se añadió:

```text
BackupStorageInterface.getSha256()
BackupStorageService.getSha256()
FileBackupStorage.getSha256()
```

`FileBackupStorage` usa:

```php
hash_file('sha256', $path)
```

por lo que la lectura es secuencial y no materializa el backup entero en RAM.

### Creación nueva

Ahora:

```text
upload temporal
↓
inspección
↓
SHA origen
↓
storeFile
↓
size del blob almacenado
↓
SHA-256 del blob almacenado
↓
comparar
↓
solo entonces guardar metadata
```

Si falla SHA o tamaño:

```text
el blob se elimina
metadata no se persiste
```

### Retry idempotente

`resolveExistingBackup()` comprueba ahora:

```text
metadata installation
metadata SHA incoming
storage existe
storage size
storage SHA real
```

Un objeto almacenado corrupto ya no se acepta como retry idempotente aunque conserve el mismo tamaño.

### Tests nuevos

```text
tests/Service/BackupServiceIntegrityTest.php
tests/Storage/FileBackupStorageTest.php
```

Cubren:

- mismatch SHA tras store;
- eliminación del objeto inconsistente;
- blob existente corrupto durante retry;
- SHA real del storage.

### Validación funcional realizada

Después de 21.7.1:

```text
crear nueva copia
↓
borrar datos locales
↓
crear/restaurar instalación a partir de la copia
↓
funcionamiento correcto
```

Validado.

---

## 41. Integridad existente además de 21.7.1

La cadena de integridad actual incluye varias capas.

### Client al crear

- manifest exacto;
- cifrado autenticado AES-GCM;
- snapshot SQLite;
- payload estructurado.

### API al recibir

- tamaño máximo;
- estructura ZIP;
- manifest exacto;
- SHA-256 completo del upload;
- SHA-256 del blob ya persistido;
- ownership;
- idempotencia/conflicto.

### Client al descargar

- streaming;
- tamaño real;
- límite 8 GiB;
- SHA-256 incremental;
- comparación con metadata remota;
- rename solo tras validar.

### Restore remoto

- size remoto;
- SHA remoto;
- backupId remoto vs manifest;
- re-inspección antes de unlock;
- GCM del key wrap;
- GCM del payload;
- estructura payload;
- SQLite integrity/foreign keys.

---

## 42. Delete remoto — consistencia

`BackupService.delete()` en API utiliza deliberadamente:

```text
DELETE metadata DB
↓
COMMIT
↓
DELETE blob físico
```

Motivo:

> Nunca dejar metadata activa apuntando a un blob que ya ha desaparecido por un rollback de DB.

Si el borrado físico falla después del commit:

```text
metadata ya eliminada
blob huérfano posible
```

El error se propaga.

Este comportamiento es conocido y deliberado.

Un futuro subbloque de 21.7 puede revisar si hace falta un mecanismo operativo de limpieza de huérfanos.

---

## 43. Front administrativo — estado relevante

Angular 22.

Autenticación admin:

- token almacenado en `sessionStorage`;
- `AuthInterceptor` añade Bearer únicamente al API;
- guard llama a `/admin/me`;
- fallo de sesión limpia token y vuelve a login.

Backups:

- listado;
- descarga;
- borrado con confirmación.

### Punto pendiente importante para 21.7

El Front administrativo descarga actualmente mediante:

```text
HttpClient
responseType: 'blob'
```

y después:

```text
URL.createObjectURL(blob)
```

Esto materializa la descarga en el navegador.

Dado que el contrato general admite hasta 8 GiB, antes de cerrar 21.7 hay que decidir si la descarga administrativa debe mantenerse así o cambiar a un mecanismo que no requiera tener el backup completo en memoria del navegador.

No modificarlo sin revisar primero el endpoint y las necesidades reales del panel.

---

## 44. API admin — autenticación

JWT admin:

```text
type = admin
id
public_id
iat
exp
```

TTL actual:

```text
28800 s
```

`AdminAuthMiddleware` vuelve a cargar el admin y exige:

```text
active = true
public_id coincidente
```

Por tanto un admin desactivado deja de ser aceptado aunque conserve un JWT firmado.

---

## 45. Reglas de logs

No registrar:

```text
TPV Backup key
Secret remoto
JWT
secretApi
emailSmtpPass
ticketBaiToken
KEK
DEK
payload descifrado
```

Sí se pueden registrar de forma sanitizada:

```text
backup publicId
backupId
installation publicId
operación
status
bytes
duración
error técnico no sensible
```

Esta regla debe aplicarse al revisar 21.7.

---

## 46. Aspectos ya cubiertos para 21.7

No volver a implementar salvo que una auditoría encuentre un fallo real:

```text
✅ storage fuera del webroot
✅ storage key segura
✅ protección traversal
✅ write temporal + rename
✅ ownership de backups
✅ JWT corto
✅ revalidación credencial por request
✅ revocación inmediata
✅ rotación
✅ suscripción active/expired
✅ upload bloqueado en expired
✅ recuperación permitida en expired
✅ máximo 8 GiB
✅ estructura `.otpv` validada
✅ SHA incoming
✅ SHA blob persistido
✅ idempotencia
✅ conflictos
✅ retención configurable
✅ retención con orden determinista
✅ auditoría create/download/delete/retention
✅ download Client streaming
✅ verificación SHA download Client
✅ cleanup de parciales Client
✅ restore criptográfico
✅ safeStorage Client
✅ JWT solo RAM
✅ staging recovery
```

---

## 47. 21.7 — puntos todavía por revisar antes de cerrarlo

No asumir que todos requieren cambios. Primero auditar.

### 21.7.2 — integridad en lectura / bit rot

Hoy `BackupService.openReadStream()` comprueba:

```text
storage existe
size físico == metadata size
```

Tras 21.7.1 se garantiza el SHA al escribir, y el Client vuelve a validar SHA al descargar.

Aun así debe decidirse si el API necesita detectar por sí mismo una corrupción posterior del blob antes/durante una descarga.

Opciones a estudiar, sin decisión cerrada:

- SHA server-side antes de stream;
- verificación periódica;
- confiar en la validación end-to-end del Client;
- mecanismo de health/integrity audit.

No implementar todavía sin valorar coste de I/O.

### Huérfanos físicos

Posibles cuando:

```text
metadata delete commit
+
fallo posterior eliminando blob
```

Evaluar si hace falta:

- tarea de reconciliación;
- comando administrativo;
- log operativo suficiente.

### Límites y proxy

Revisar coherencia real entre:

```text
8 GiB aplicación
upload_max_filesize
post_max_size
Nginx/Plesk
timeouts
```

`post_max_size` debe admitir también el overhead multipart.

### Configuración production

Revisar:

```text
environment
DEBUG
CORS
token secrets
headers
TLS
```

teniendo en cuenta el deployment real, no solo `Config.json`.

### Front admin y backups grandes

Revisar la descarga Blob del navegador.

### Auditoría

Revisar que no se introduzcan datos sensibles en:

- `data`;
- mensajes de excepciones;
- logs regulares;
- UI de auditoría.

---

## 48. 21.8 — regresión recuperación global

Cuando 21.7 quede cerrado hay que ejecutar una regresión completa.

### Camino principal

```text
Client A
↓
instalación operativa
↓
TPV Backup configurado
↓
crear copia remota
↓
upload HTTPS
↓
API valida y almacena
↓
listado
↓
Client B limpio
↓
Key ID + Secret temporales
↓
listar
↓
seleccionar
↓
descarga streaming
↓
SHA + size
↓
TPV Backup key
↓
restore v3
↓
Client B operativo
↓
credenciales remotas recuperadas
```

Este camino ya se ha probado de forma parcial/funcional durante 21.6 y 21.7.1, pero 21.8 debe tratarlo como regresión final formal.

### Matriz adicional

Probar expresamente:

```text
delete remoto
retención
credencial revocada
credencial rotada
suscripción expired
suscripción disabled
backup corrupto
blob storage inconsistente
upload interrumpido
download interrumpido
retry upload/idempotencia
backupId conflictivo
TPV Backup key incorrecta
restore de payload corrupto
caída durante instalación
caída durante restore
```

---

## 49. Estado de pruebas funcionales reales ya realizadas

Hasta v2.87 se han validado manualmente, además de tests automatizados:

### Upload remoto

```text
Client → crear copia remota → servidor
```

Correcto.

### Download remoto

```text
servidor → Client → backups/*.otpv
```

Correcto.

### Delete remoto

```text
confirmar → borrar servidor → refrescar listado
```

Correcto.

La copia local descargada se conserva por diseño.

### Restore remoto limpio

```text
borrar datos locales
↓
abrir Client
↓
Key ID + Secret
↓
listar
↓
elegir backup
↓
TPV Backup key
↓
validar
↓
restaurar
```

Correcto.

### Después de 21.7.1

Se volvió a:

```text
crear nueva copia
↓
borrar datos
↓
reconstruir instalación desde la copia
```

Correcto.

---

## 50. Tests automatizados destacables

Client cubre actualmente, entre otros:

- portable secrets con/sin credencial remota;
- prohibición de `backupApiKey` dentro del payload;
- package builder;
- restore staging;
- unlock;
- prepared restore;
- finalize;
- rollback credencial remota;
- recovery tras instalación interrumpida;
- HTTP auth/list;
- upload remoto;
- streaming download;
- Content-Length opcional;
- partial download cleanup;
- JWT retry;
- descarga con expired;
- delete con expired;
- remote create;
- remote download;
- integridad size/SHA;
- remote restore temporal;
- selección remota;
- backupId remoto vs manifest;
- UI upload/download/delete;
- UI restore remoto.

API cubre, entre otros:

- autenticación instalación;
- middleware;
- upload;
- validación `.otpv`;
- idempotencia;
- conflictos;
- download;
- delete;
- retención;
- auditoría;
- storage filesystem;
- stream de lectura;
- integridad SHA del blob almacenado.

---

## 51. Decisiones que NO deben revertirse

No:

- crear un schema 2 de secretos antes de necesitar compatibilidad real;
- meter `Key ID + Secret` en `InstallationSecretsData`;
- incluir TPV Backup key dentro del `.otpv`;
- persistir JWT;
- enviar TPV Backup key al API;
- hacer `trim()` del Secret remoto;
- hacer `trim()` de la TPV Backup key;
- cargar `.otpv` completos en memoria en el Client;
- crear un segundo pipeline de restore remoto;
- borrar una copia local al borrar la remota;
- persistir credenciales temporales de restore antes de abrir el backup;
- confiar en paths enviados por Renderer;
- usar filename remoto como path de storage;
- mezclar `backupId` y `publicId`;
- deshabilitar download/delete solo porque una suscripción está `expired`;
- saltarse la revisión de `main` después de un push.

---

## 52. TPV Backup key vs credencial remota — resumen definitivo

```text
TPV Backup key
→ cifra/descifra `.otpv`
→ nunca servidor
→ nunca dentro del `.otpv`
→ safeStorage local
→ se introduce externamente al restore

Key ID + Secret
→ autentican instalación contra TPV Backup
→ servidor sí los usa para autenticación
→ Secret almacenado en servidor solo mediante hash
→ safeStorage local en Client
→ también viajan dentro del payload cifrado
→ se restauran en otra máquina

JWT
→ token efímero
→ solo RAM
→ nunca payload
```

---

## 53. Fechas remotas

La API devuelve actualmente fechas de backup como:

```text
2026-10-05 07:18:39
```

La UI del Client interpreta ese formato como UTC mediante conversión:

```text
YYYY-MM-DD HH:mm:ss
→
YYYY-MM-DDTHH:mm:ssZ
```

No asumir que el contrato ya devuelve ISO canónico si se toca la API.

---

## 54. Estado del exportador legacy TPV-API

El exportador antiguo continúa produciendo paquetes de migración legacy.

Decisión aplicada:

```text
flag empleados
→ ignorado
→ no se exporta
```

Los legacy pueden aportar `backupApiKey`, pero no las nuevas credenciales remotas.

---

## 55. Regla de empleados

Contexto estructural ajeno a TPV Backup pero vigente:

```text
0 empleados
→ no venta

1 empleado
→ asignación automática

2+ empleados
→ selector dentro de la venta
```

El flag legacy `empleados` ya no gobierna el comportamiento.

---

## 56. TicketBAI

SDK:

```text
@osumi/ticketbaiws
```

Estado:

```text
1.0.x publicado
```

El bloque TicketBAI sigue pendiente de respuesta/actualización de Berein.

No mezclarlo con Hito 21.

---

## 57. Siguiente bloque recomendado

Estado exacto:

```text
21.6 ✅ cerrado
21.7.1 ✅ cerrado
21.7 ▶️ en curso
```

El siguiente paso recomendado es:

```text
21.7.2 — auditoría de integridad en lectura y consistencia storage/metadata
```

Antes de escribir código:

1. revisar `main` de API después de que este documento se suba;
2. revisar `BackupService.openReadStream()`;
3. revisar endpoint de download de instalación;
4. revisar endpoint de download admin;
5. revisar qué garantía aporta ya el Client con SHA;
6. medir el coste de calcular SHA server-side antes de cada descarga;
7. decidir si hace falta código nuevo o si la garantía end-to-end actual es suficiente;
8. revisar a continuación la limpieza de blobs huérfanos;
9. no añadir lecturas duplicadas de 8 GiB sin una razón clara.

No considerar 21.7 cerrado únicamente porque existan muchos controles: debe hacerse una revisión explícita de los puntos pendientes del apartado 47.

---

## 58. Prompt recomendado para una conversación nueva

```text
Quiero continuar el Hito 21 de Osumi TPV Client.

Usa como referencia principal:

docs/osumi-tpv-continuidad-v2.87.md

Estado:
- 21.1 `.otpv` v3 ✅
- 21.2 exportador nativo ✅
- 21.3 restauración nativa ✅
- 21.4 TPV Backup Front ✅
- 21.5 API remota ✅
- 21.6 integración Client ↔ TPV Backup ✅
- 21.7 seguridad/integridad/retención ▶️
  - 21.7.1 SHA-256 del blob almacenado ✅
- 21.8 regresión global ⏳

Client HEAD al generar el documento:
64f4bed3252b0a54d93d540898c7063b98aa57e6

TPV Backup API HEAD:
1ba68110749b6c647c7c868d1db00cf7d429b074

TPV Backup Front HEAD:
469109cf3d0c7f3ab2170273f7a56d5338052b68

El flujo remoto completo ya funciona:
Client → upload → TPV Backup → list → download/delete
y también:
Client limpio → Key ID + Secret → backup remoto → TPV Backup key → restore completo.

La descarga del Client es streaming y verifica size + SHA.
El upload usa openAsBlob/FormData sin materializar el `.otpv`.
Las credenciales temporales de restore se guardan solo en RAM.
Las credenciales definitivas restauradas salen del payload cifrado.
La TPV Backup key nunca se envía al servidor ni se incluye en el `.otpv`.

21.7.1 añadió verificación del SHA-256 del blob realmente almacenado
y del blob existente en reintentos idempotentes.

Siguiente bloque recomendado:
21.7.2 — revisar integridad de lectura/descarga y consistencia storage/metadata.

Antes de proponer código:
1. revisa los main actuales;
2. lee los archivos exactos implicados;
3. no inventes cambios si la garantía actual ya es suficiente;
4. no cargues backups grandes completos en RAM;
5. conserva Secret y TPV Backup key exactamente;
6. no expongas secretos o JWT al Renderer;
7. trabaja en bloques pequeños;
8. tras cada push vuelve a revisar main.
```

---

## 59. Resumen ejecutivo

Estado funcional actual:

```text
.otpv v3                             ✅
AES-256-GCM + scrypt                 ✅
DEK/KEK                              ✅
snapshot SQLite                      ✅
backup local                         ✅
restore local                        ✅
TPV Backup Front                     ✅
TPV Backup API                       ✅
auth instalación                     ✅
list API                             ✅
upload API                           ✅
download API                         ✅
delete API                           ✅
retención API                        ✅
auditoría API                        ✅
credencial remota segura Client      ✅
JWT solo memoria                     ✅
configuración remota Client          ✅
upload remoto Client                 ✅
download streaming Client            ✅
SHA download Client                  ✅
delete remoto Client                 ✅
restore remoto Client limpio         ✅
credenciales remotas portables       ✅
restore credenciales remotas         ✅
legacy warning                       ✅
crash recovery                       ✅
SHA del blob almacenado API          ✅
retry idempotente verifica storage   ✅
```

Pendiente:

```text
21.7 auditoría/hardening restante
21.8 regresión global formal
Hito 22 sincronización tienda online
TicketBAI pendiente de Berein
```

Arquitectura crítica:

```text
TPV Backup key
→ secreto criptográfico
→ nunca servidor
→ nunca dentro del `.otpv`

Key ID + Secret
→ autenticación remota
→ safeStorage local
→ incluidos únicamente dentro del payload cifrado
→ restaurables

JWT
→ efímero
→ solo memoria

TPV Backup API
→ custodia blobs cifrados
→ valida estructura e integridad
→ no puede descifrar payload

Restore remoto
→ no es un pipeline alternativo
→ descarga + selección
→ reutiliza el restore v3 nativo
```

---

**Fin del documento de continuidad v2.87**
