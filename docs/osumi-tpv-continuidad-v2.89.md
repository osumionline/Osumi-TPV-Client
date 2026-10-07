# Osumi TPV Client — Documento de continuidad v2.89

**Fecha:** 7 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** `https://github.com/osumionline/Osumi-TPV-Client`  
**Repositorio TPV Backup API:** `https://github.com/osumionline/TPV-Backup-API`  
**Repositorio TPV Backup Front:** `https://github.com/osumionline/TPV-Backup-Front`

Este documento actualiza y sustituye como referencia principal de continuidad a:

```text
docs/osumi-tpv-continuidad-v2.88.md
```

La fuente de verdad para continuar el desarrollo será siempre:

```text
main actual de los repositorios
+
este documento
+
la conversación activa
```

El documento histórico:

```text
docs/tpv-backup-contexto-tecnico-v1.0.md
```

sigue siendo útil para entender el origen de TPV Backup, pero la implementación actual y las decisiones consolidadas descritas aquí prevalecen cuando exista cualquier diferencia.

---

# 1. Objetivo de esta versión

La versión `v2.89` se genera después de un avance muy importante en:

```text
21.9 — Backups remotos automáticos
```

Desde `v2.88` se ha implementado y cerrado:

- `21.9.1 — Configuración de hora`;
- `21.9.2 — Estado persistente del scheduler`;
- `21.9.3 — Ejecución automática`;
- `21.9.4 — Ciclo de vida Electron`.

El sistema de backups automáticos ya está conectado al proceso real de Electron y dispone de:

- hora diaria configurable;
- compatibilidad hacia atrás con instalaciones y backups anteriores;
- cálculo de vencimientos en hora local;
- estado persistente `lastSuccessfulAt`;
- catch-up tras arranque tardío;
- protección contra duplicados;
- reutilización del pipeline remoto existente;
- retry aproximado cada hora ante errores reales;
- arranque y parada con Electron;
- reevaluación tras `powerMonitor.resume`;
- reevaluación tras cambios de configuración, instalación, restauración e importación legacy;
- limpieza del estado automático al reemplazar una instalación.

Queda pendiente para terminar `21.9`:

```text
21.9.5 — UI informativa
21.9.6 — Regresión funcional
```

El propósito de este documento es que, si se alcanza el límite de contexto de la conversación, otra conversación pueda recuperar el estado real del proyecto sin reconstruir decisiones, contratos ni razones arquitectónicas ya cerradas.

---

# 2. Resumen ejecutivo para retomar rápidamente

Si solo se dispone de unos minutos para recuperar contexto, leer primero esta sección.

## 2.1. Estado general

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
      ✅ 21.9.1 Configuración de hora
      ✅ 21.9.2 Estado persistente del scheduler
      ✅ 21.9.3 Ejecución automática
      ✅ 21.9.4 Ciclo de vida Electron
      ⏳ 21.9.5 UI informativa
      ⏳ 21.9.6 Regresión funcional

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

## 2.2. Punto exacto de continuación

Al generar este documento el siguiente bloque es:

```text
21.9.5 — UI informativa
```

Objetivo previsto:

```text
COPIAS AUTOMÁTICAS
Todos los días a las 03:00

Última copia automática
07/10/2026 03:02
```

Será necesario exponer al Renderer el estado automático actual, principalmente:

```text
automaticTime
lastSuccessfulAt
latestScheduledAt
nextScheduledAt
pending
```

El dominio ya dispone de:

```text
BackupAutomaticStatus
```

pero todavía no existe una API IPC pública para consultarlo desde Angular.

Después:

```text
21.9.6 — Regresión funcional completa
```

## 2.3. No reabrir estas decisiones

Ya están cerradas:

```text
hora por defecto             03:00
hora configurable            sí
formato                       HH:mm
zona horaria                  local del terminal
lastSuccessfulAt              UTC ISO
estado scheduler              local y no portable
backupAutomaticTime           portable en app_data.json
manual backup                 NO satisface ciclo automático
varios días offline           solo 1 catch-up, no N copias
fallo                         NO marca éxito
retry tras fallo              aproximadamente 1 hora
suspend/resume                reevaluación inmediata
scheduler nuevo               reutiliza BackupRemoteCreateService
servidor                      no conoce clave criptográfica
```

---

# 3. Forma de trabajo acordada

El desarrollo se realiza de forma incremental, controlada y verificable.

## 3.1. Unidad de trabajo

Cada propuesta debe ser una unidad pequeña y coherente.

Reglas:

- agrupar únicamente cambios que pertenezcan a una misma responsabilidad;
- evitar refactors no relacionados;
- evitar cambios masivos;
- probar cada bloque antes de continuar;
- no continuar con errores de build, tests o lint;
- hacer prueba funcional real cuando se alteran backups, restore, filesystem, red, credenciales o persistencia;
- después de cada push confirmado por el usuario, revisar de nuevo `main` antes de proponer el siguiente bloque.

## 3.2. Antes de proponer código

Siempre:

1. revisar el `main` actual;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, helpers, campos, contratos ni APIs;
4. reutilizar pipelines existentes;
5. distinguir claramente decisiones cerradas de propuestas futuras.

## 3.3. Entrega de cambios

Para archivos nuevos:

> indicar ruta exacta y contenido completo.

Para archivos existentes:

> indicar ruta, bloque claramente identificable y reemplazo exacto.

El usuario prefiere cambios archivo por archivo o por pequeños bloques coherentes. No entregar ZIP.

## 3.4. GitHub

Uso desde ChatGPT estrictamente de solo lectura.

No crear ni modificar remotamente:

- commits;
- ramas;
- pull requests;
- issues;
- comentarios;
- archivos.

El usuario aplica los cambios localmente, prueba y hace push.

## 3.5. Estado de situación en cada respuesta

Regla nueva expresamente solicitada:

> En cada mensaje o bloque de desarrollo indicar siempre por dónde vamos y qué queda por delante.

Esto debe mantenerse aunque el cambio sea pequeño.

---

# 4. Convenciones permanentes de código

## 4.1. JSDoc / PHPDoc

Todo método creado o modificado debe tener JSDoc/PHPDoc.

También:

- métodos de interfaces;
- contratos;
- helpers relevantes cuando aportan intención.

## 4.2. Exports TypeScript

Convención expresa e importante:

```text
1 único símbolo exportado
→ export default

2 o más símbolos exportados
→ todos exports nominales
→ nunca export default
```

No volver a mezclar ambas estrategias.

Referencia histórica de corrección relevante:

```text
636efea
```

## 4.3. Imports TypeScript

Nueva convención expresa:

> Usar siempre rutas absolutas basadas en aliases cuando exista alias aplicable.

Evitar imports relativos como:

```ts
import ... from './...';
import ... from '../...';
```

cuando exista un alias del proyecto.

Aliases Electron actuales relevantes:

```text
@bootstrap/*
@backend/*
@desktop-contracts/*
@infrastructure/*
@ipc/*
```

El alias `@bootstrap/*` se añadió durante `21.9.3b` para evitar rutas relativas desde `main.ts` y composición.

## 4.4. Angular

Referencia actual:

```text
Angular 22.2.1
standalone
zoneless
signals
Signal Forms
```

Convenciones:

- `inject()`;
- `input()` / `output()`;
- signal queries;
- `@if`, `@for`, `@switch`;
- tipado estricto;
- evitar `any`;
- usar `unknown` cuando corresponda;
- Angular Material;
- `MatTooltip` en lugar de `title`;
- no `NgModule`;
- no `CommonModule` salvo necesidad real;
- no `HostBinding` / `HostListener`;
- no `ngClass` / `ngStyle`;
- WCAG AA;
- Prettier organiza imports.

---

# 5. Baterías de pruebas

## 5.1. Client — cierre de bloque estable

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

Para pequeños bloques exclusivamente Electron se ha usado durante `21.9`:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

pero antes de cerrar `21.9` debe ejecutarse la batería completa.

## 5.2. TPV Backup API

```bash
composer test
```

## 5.3. TPV Backup Front

```bash
npm test
npm run build
npm run lint
```

---

# 6. HEADs verificados al generar v2.89

## 6.1. Osumi TPV Client

```text
2d81e1cbb33eea84c59e2f0762e039484a262183
Terminado cambios de configuración en caliente 21.9.4c
```

Archivos del último commit:

```text
electron/bootstrap/application-composition.ts
electron/ipc/backup/register-backup-ipc.ts
electron/ipc/configuration/register-configuration-ipc.ts
electron/ipc/register-legacy-import-ipc.ts
```

## 6.2. TPV Backup API

```text
d1d3bdcde95d0e7d848347ec434b499025caa1b5
Tarea de reconciliacion 21.7.3a
```

No ha sido necesario modificar la API durante `21.9` hasta este punto.

## 6.3. TPV Backup Front

```text
1be138f8e280646b9419f9fe60287111174e890e
Corrección en mensaje al desactivar subscripción
```

No ha sido necesario modificar el Front administrativo durante `21.9` hasta este punto.

---

# 7. Versiones relevantes del Client

`package.json` verificado en el `main` actual:

```text
Angular                 ^22.2.1
Angular Material        ^22.2.1
Electron                ^44.5.1
TypeScript              ~6.0.2
Vitest                  ^5.0.3
Node types              ^26.6.4
better-sqlite3          ^12.11.1
typeorm                 ^1.1.1
yauzl                   ^3.4.0
yazl                    ^3.3.1
@osumi/angular-tools    ^1.5.2
@osumi/ticketbaiws      ^1.0.1
npm                     12.2.0
```

---

# 8. Arquitectura global de TPV Backup

La solución está dividida en tres aplicaciones.

## 8.1. Osumi TPV Client

Responsabilidades actuales:

- crear `.otpv` locales;
- restaurar `.otpv` v3;
- importar backups legacy;
- almacenar TPV Backup key como secreto local;
- almacenar credenciales remotas `Key ID + Secret` mediante `safeStorage`;
- autenticar contra TPV Backup;
- crear/subir backups remotos;
- listar backups;
- descargar backups;
- borrar backups;
- restaurar una instalación limpia directamente desde TPV Backup;
- programar y ejecutar backups remotos automáticos diarios.

## 8.2. TPV Backup API

Responsabilidades:

- autenticar instalaciones;
- emitir JWT de corta duración;
- revalidar estado administrativo por request;
- ownership;
- almacenamiento de blobs cifrados;
- validación estructural pública de `.otpv`;
- persistencia de metadata;
- retención;
- descarga;
- borrado;
- auditoría;
- reconciliación metadata/storage;
- administración de suscripciones, instalaciones y credenciales.

## 8.3. TPV Backup Front

Panel administrativo para:

- login;
- dashboard;
- suscripciones;
- instalaciones;
- credenciales;
- backups;
- auditoría;
- descarga y borrado administrativo.

## 8.4. Zero knowledge

Regla estructural:

```text
TPV Backup API
→ nunca recibe la TPV Backup key
→ nunca puede descifrar payload.enc
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

Secreto criptográfico maestro para abrir `.otpv`.

Reglas:

- bytes UTF-8 exactos;
- no `trim()`;
- no normalización;
- nunca se envía al servidor;
- nunca se incluye en `.otpv`;
- deriva KEK mediante `scrypt`;
- se mantiene como secreto operacional local.

## 9.2. Key ID + Secret

Credenciales de servicio para TPV Backup.

```text
Key ID
→ trim permitido

Secret
→ conservar exactamente
→ no trim
```

Persistencia local:

```text
secrets/backup_remote_credentials.json
```

protegido con Electron `safeStorage`.

## 9.3. JWT remoto

- solo memoria;
- no persiste;
- no cruza al Renderer;
- no entra en `.otpv`;
- TTL API actual: `3600 s`;
- skew Client: `30 s`.

---

# 10. `.otpv` v3 — contrato definitivo

ZIP exterior con exactamente:

```text
manifest.json
payload.enc
```

`payload.enc` contiene el ZIP interior cifrado.

## 10.1. Criptografía

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
- IV 12 bytes;
- auth tag 16 bytes.

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
backup_automatic_state.json
logs/
backups/
staging/
TPV Backup key
JWT
```

`backupAutomaticTime` sí es portable porque forma parte de `config/app_data.json`.

`lastSuccessfulAt` no es portable porque pertenece al terminal y vive en:

```text
config/backup_automatic_state.json
```

## 10.3. Límite contractual

```text
8 GiB
```

No materializar `.otpv` completos en memoria en upload/download.

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
→ NO aparece en secrets/secrets.json
→ NO aparece en ningún lugar del `.otpv`
```

---

# 12. Filesystem actual del Client

Raíz:

```text
app.getPath('userData') / osumi-tpv
```

Estructura relevante actual:

```text
osumi-tpv/
├── config/
│   ├── app_data.json
│   ├── printing_settings.json
│   └── backup_automatic_state.json
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

Temporales relevantes:

```text
staging/remote-upload/
staging/remote-restore/
staging/restore-work/
```

La ruta del estado automático está declarada en:

```text
electron/backend/contracts/system/application-paths.interface.ts
```

como:

```text
backupAutomaticStateFile
```

y construida por:

```text
electron/infrastructure/electron/electron-application-paths.provider.ts
```

como:

```text
config/backup_automatic_state.json
```

---

# 13. Backup local y pipeline reusable

`BackupService.createLocal()` sigue siendo puramente local.

Genera bajo:

```text
backups/
```

`BackupService.createFile(destinationDirectory)` permite reutilizar exactamente el mismo pipeline desde Main.

Lo utiliza:

```text
BackupRemoteCreateService
```

Regla permanente para `21.9`:

> El scheduler automático no tiene un segundo generador de `.otpv`; reutiliza `BackupRemoteCreateService`.

Existe protección contra concurrencia en la creación remota.

---

# 14. Snapshot SQLite

El Client usa:

```text
better-sqlite3
WAL
```

Regla permanente:

> Nunca copiar directamente la SQLite operacional.

Se genera snapshot consistente.

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
preparar staging
↓
finalizar instalación
```

Solo sobre instalación limpia.

## 15.1. Credenciales remotas restauradas

Las credenciales remotas incluidas en el backup pasan por:

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

## 15.2. Hora automática en backups antiguos

Desde `21.9.1c` existe prueba explícita de compatibilidad con un `app_data.json` v3 antiguo que no contenga:

```text
backupAutomaticTime
```

En ese caso se normaliza a:

```text
03:00
```

sin incrementar `schemaVersion` únicamente por este campo opcional compatible.

---

# 16. Recuperación ante instalación/restauración interrumpida

`app_data.json` es el marcador de instalación completa.

Si existe:

```text
instalación completa
→ limpiar staging residual
→ conservar estado automático
```

Si no existe:

```text
instalación/promoción incompleta
→ limpiar recursos finales parciales
→ limpiar credenciales remotas huérfanas
→ limpiar estado automático residual
→ reset staging
```

Desde `21.9.3c`, `FileInstallationFinalizer` elimina al reemplazar instalación:

```text
backup_automatic_state.json
backup_automatic_state.json.tmp
```

Esto aplica de forma común a:

- nueva instalación;
- restore v3;
- import legacy.

Durante un `recover()` de una instalación ya completa, el fichero se conserva.

Existe prueba específica en:

```text
electron/infrastructure/filesystem/file-installation-finalizer.spec.ts
```

para ambas situaciones.

---

# 17. TPV Backup API — autenticación, storage y semántica

## 17.1. Base URL

```text
https://apitpvbackup.osumi.dev/api/v1
```

Compuesta actualmente en:

```text
electron/bootstrap/application-composition.ts
```

## 17.2. Rutas

```text
POST /api/v1/auth/token
GET  /api/v1/me

POST   /api/v1/backups
GET    /api/v1/backups
GET    /api/v1/backups/:publicId/download
DELETE /api/v1/backups/:publicId
```

## 17.3. Revalidación por request

El middleware vuelve a validar:

- credencial;
- `revoked_at`;
- `key_id`;
- instalación;
- estado activo de instalación;
- suscripción;
- estado activo de suscripción.

Una credencial revocada/rotada invalida un JWT aún no expirado.

## 17.4. Semántica de suscripción

```text
ACTIVE
 auth       ✅
 list       ✅
 download   ✅
 delete     ✅
 upload     ✅

EXPIRED
 auth       ✅
 list       ✅
 download   ✅
 delete     ✅
 upload     ❌

DISABLED
 auth       ❌
 list       ❌
 download   ❌
 delete     ❌
 upload     ❌
```

## 17.5. Storage

Raíz lógica:

```text
storage/backups
```

Clave:

```text
installations/<installation.public_id>/<backup.public_id>.otpv
```

`FileBackupStorage`:

- valida segmentos;
- evita traversal;
- usa temporal + `rename()`;
- no sobrescribe;
- calcula tamaño;
- calcula SHA-256;
- lista objetos;
- borra idempotentemente;
- intenta limpiar padres vacíos.

## 17.6. Integridad del blob

Desde `21.7.1` la API verifica el SHA del objeto realmente almacenado antes de confirmar metadata.

El Client, al descargar, vuelve a comprobar SHA y tamaño sobre los bytes recibidos antes de promover el fichero.

No se hace pre-hash del blob completo antes de cada descarga del servidor porque duplicaría I/O para archivos de hasta 8 GiB.

## 17.7. Reconciliación

Comando:

```bash
php of reconcileBackupStorage
```

Detecta de forma read-only:

- objetos huérfanos;
- metadata sin fichero;
- objetos inválidos.

No borra automáticamente.

## 17.8. Retención

- configurable por suscripción;
- valor de referencia habitual: `6`;
- el upload exitoso no se convierte en error si falla el cleanup de retención;
- auditoría de borrado por retención como actor `system`.

---

# 18. `BackupRemoteService` — comportamiento actual

## 18.1. `getConnection()`

Siempre autentica de nuevo usando las credenciales persistidas.

Razón:

> El estado administrativo de la suscripción puede cambiar mientras el Client sigue abierto.

Por tanto `getConnection()` sirve como lectura fresca de:

- instalación;
- suscripción;
- `canUpload`.

## 18.2. Resto de operaciones

`list`, `upload`, `download`, `delete` pueden reutilizar sesión válida en memoria y renovar una vez si el servidor rechaza el JWT administrativamente.

## 18.3. Expiración

Suscripción expirada:

```text
list/download/delete permitidos
upload prohibido
```

## 18.4. Disabled

Suscripción desactivada:

```text
auth bloqueada
→ operaciones bloqueadas
```

---

# 19. Cierre de `21.8 — Regresión recuperación global`

`21.8` quedó cerrado antes de iniciar `21.9`.

## 19.1. Restauración remota completa

Probado:

```text
crear backup remoto
→ instalación limpia
→ conexión temporal TPV Backup
→ seleccionar backup
→ descargar
→ introducir TPV Backup key
→ restaurar
→ credenciales remotas restauradas
→ listar backups
→ crear nuevo backup remoto desde la instalación restaurada
```

Funcionó correctamente.

## 19.2. Estado administrativo dinámico

Se verificó:

- active → expired;
- expired → active;
- rotación de credencial con Client abierto;
- disabled → active.

Se corrigieron estados obsoletos tanto en servicio como en UI.

## 19.3. Clave criptográfica incorrecta

Se verificó que una TPV Backup key incorrecta:

- no destruye la selección;
- limpia workspace/staging temporal;
- permite reintentar con la clave correcta.

## 19.4. Blob remoto corrupto

Se corrompió físicamente un blob preservando tamaño.

El Client rechazó la descarga por SHA antes del unlock:

```text
La copia descargada no coincide con los metadatos de integridad almacenados en TPV Backup.
```

No hubo promoción ni instalación parcial.

## 19.5. Interrupciones

Probado cierre de aplicación:

- después de seleccionar backup remoto;
- después de unlock/staging y antes de finalize.

Al reabrir:

- no instalación parcial;
- no credenciales prematuras;
- staging recuperado correctamente.

## 19.6. Retención

Con límite `2`:

```text
crear A
crear B
crear C
→ quedan B y C
→ A se elimina por retención
```

Auditoría correcta y reconciliación limpia.

---

# 20. `21.9` — objetivo funcional definitivo

Crear automáticamente una copia remota diaria cuando la instalación tenga TPV Backup correctamente configurado y la suscripción permita subir.

Hora por defecto:

```text
03:00
```

pero configurable por instalación.

Comportamiento deseado:

```text
app viva a la hora programada
→ backup automático

app cerrada durante la hora
→ al siguiente arranque detectar vencimiento pendiente
→ crear 1 backup catch-up

PC suspendido durante la hora
→ al resume reevaluar
→ crear backup si está pendiente

varios días apagado
→ crear solo 1 catch-up
→ NO una copia por cada día perdido

fallo de red/API/subscripción
→ NO marcar éxito
→ retry aproximadamente cada hora
```

---

# 21. `21.9.1 — Configuración de hora` — CERRADO

## 21.1. Contrato

Archivo:

```text
electron/contracts/backup/backup-automatic-time.ts
```

Expone dos símbolos nominales:

```ts
export const DEFAULT_BACKUP_AUTOMATIC_TIME: string = '03:00';

export function isBackupAutomaticTime(value: unknown): value is string
```

Formato válido:

```text
HH:mm
00:00 — 23:59
```

## 21.2. `AppData`

Campo actual:

```ts
readonly backupAutomaticTime: string;
```

Es obligatorio en runtime.

Persistencia antigua puede no contenerlo.

Normalización:

```text
missing
→ 03:00

invalid
→ error de validación
```

## 21.3. Portabilidad

`backupAutomaticTime` vive en `app_data.json` y por tanto viaja dentro de backups v3 nuevos.

Backups v3 antiguos sin ese campo restauran con:

```text
03:00
```

No se incrementó `schemaVersion` solo por este cambio compatible.

## 21.4. Legacy

La importación legacy también obtiene:

```text
03:00
```

por defecto.

## 21.5. UI Nueva instalación

Bloque visual final:

```text
[ BACKUP API KEY                                                       ]
[ KEY ID                        ] [ SECRET                        ] [ HORA ]
```

Hora compacta de aproximadamente `160px` en escritorio.

Responsive colapsa correctamente.

## 21.6. UI Ajustes

Bloque visual final:

```text
[ BACKUP API KEY ........................................ ] (ojo) [ HORA ]
```

También responsive.

## 21.7. Corrección colateral del logo obligatorio

Durante las pruebas de nueva instalación se detectó que `logoDataUrl` era obligatorio pero su error podía no mostrarse aunque el grupo estuviera marcado como touched.

Se corrigió:

- texto `Logo (obligatorio)`;
- visibilidad del error basada en `installationForm.negocio().touched()` + invalidación de `logoDataUrl`;
- estilo `.form-error` con color de error Material.

## 21.8. Compatibilidad antigua

Se añadió prueba explícita en:

```text
electron/infrastructure/backup/file-otpv-v3-required-content.validator.spec.ts
```

que elimina `backupAutomaticTime` de un `app_data.json` válido anterior y confirma que el paquete continúa siendo aceptado.

---

# 22. `21.9.2 — Estado persistente del scheduler` — CERRADO

Se dividió en:

```text
21.9.2a cálculo temporal puro
21.9.2b persistencia lastSuccessfulAt
21.9.2c servicio de estado
```

## 22.1. Resolver temporal

Archivo:

```text
electron/backend/application/backup/backup-automatic-schedule.resolver.ts
```

Contrato devuelto:

```ts
interface BackupAutomaticSchedule {
  readonly latestScheduledAt: string;
  readonly nextScheduledAt: string;
  readonly pending: boolean;
}
```

Todos los vencimientos se construyen desde componentes de fecha/hora **locales**.

No se suma simplemente `24h`.

Razón:

> No asumir que todos los días duran exactamente 24 horas; correcto ante cambios DST.

Después se serializan a ISO UTC con `toISOString()`.

## 22.2. Semántica de `pending`

```text
lastSuccessfulAt == null
→ pending

lastSuccessfulAt < latestScheduledAt
→ pending

lastSuccessfulAt >= latestScheduledAt
→ cubierto
```

## 22.3. Cambio de hora

El ciclo se recalcula usando siempre la hora configurada actual.

Ejemplo:

```text
ahora 12:00
hora nueva 03:00
último éxito ayer 23:05
→ vencimiento actual hoy 03:00
→ pending = true
```

Cambio hacia una hora aún futura:

```text
ahora 12:00
hora nueva 23:00
último éxito hoy 03:05
→ último vencimiento relevante = ayer 23:00
→ cubierto
```

## 22.4. Persistencia

Contrato:

```text
electron/backend/domain/backup/backup-automatic-state.interface.ts
```

Estado persistido:

```json
{
  "schemaVersion": 1,
  "lastSuccessfulAt": "2026-10-07T01:05:00.000Z"
}
```

Repositorio:

```text
electron/infrastructure/filesystem/json-backup-automatic-state.repository.ts
```

Ruta:

```text
config/backup_automatic_state.json
```

## 22.5. Robustez del repositorio

```text
fichero inexistente
→ null

JSON corrupto
→ log técnico
→ null

estructura inválida
→ log técnico
→ null

error real de filesystem
→ propagar
```

Principio:

> Un estado corrupto no debe impedir la protección automática. Como máximo puede provocar una copia adicional.

## 22.6. Timestamp canónico

`lastSuccessfulAt` debe ser un ISO UTC canónico compatible exactamente con:

```ts
date.toISOString()
```

## 22.7. Escritura atómica

```text
backup_automatic_state.json.tmp
↓ rename
backup_automatic_state.json
```

Modo del temporal:

```text
0600
```

Se corrigió durante el desarrollo una errata que inicialmente generaba literalmente:

```text
this.filePath.tmp
```

La implementación final correcta usa:

```ts
`${this.filePath}.tmp`
```

## 22.8. Servicio de estado

Archivo:

```text
electron/backend/application/backup/backup-automatic-state.service.ts
```

Responsabilidades:

```text
getStatus(now, automaticTime)
markSuccessful(completedAt)
reset()
```

Contrato de estado resuelto:

```ts
interface BackupAutomaticStatus {
  readonly automaticTime: string;
  readonly lastSuccessfulAt: string | null;
  readonly latestScheduledAt: string;
  readonly nextScheduledAt: string;
  readonly pending: boolean;
}
```

Este contrato será especialmente útil en `21.9.5` para mostrar estado en UI.

---

# 23. `21.9.3 — Ejecución automática` — CERRADO

Se dividió en:

```text
21.9.3a ejecutor aislado
21.9.3b composición real
21.9.3c reset al reemplazar instalación
```

## 23.1. `BackupRemoteCreator`

Se creó el contrato:

```text
electron/backend/contracts/backup/backup-remote-creator.interface.ts
```

`BackupRemoteCreateService` lo implementa.

Esto permite probar el ejecutor automático sin montar toda la infraestructura remota.

## 23.2. `BackupAutomaticExecutionService`

Archivo:

```text
electron/backend/application/backup/backup-automatic-execution.service.ts
```

Implementa:

```text
BackupAutomaticExecutor
```

Flujo real:

```text
execute()
↓
si ya hay ejecución automática → busy
↓
load app_data
↓
si no instalado → not-installed
↓
resolver status temporal
↓
si no hay credenciales remotas → not-configured
↓
si ciclo cubierto → not-pending
↓
BackupRemoteCreateService.create()
↓
solo si termina bien
↓
markSuccessful(hora real de finalización)
↓
recalcular status
↓
created
```

## 23.3. Resultados normales

Contrato:

```ts
outcome:
  | 'not-installed'
  | 'not-configured'
  | 'not-pending'
  | 'busy'
  | 'created'
```

Los estados operativos normales no se consideran excepciones.

Los fallos reales sí se propagan al scheduler.

## 23.4. Preflight remoto

El ejecutor no duplica lógica de suscripción.

`BackupRemoteCreateService.create()` ya hace:

```text
getConnection()
→ autenticación fresca
→ estado actual de suscripción
→ canUpload
→ solo entonces generar `.otpv`
```

Esto evita generar un backup costoso cuando el servidor no permite subir.

## 23.5. Éxito

`lastSuccessfulAt` se registra con la **hora real de finalización**, no con la hora nominal programada.

## 23.6. Fallo

Si falla:

- autenticación;
- suscripción;
- red;
- generación;
- upload;
- validación de respuesta;
- persistencia del estado;

no se marca éxito.

El ciclo permanece pendiente.

## 23.7. Backup manual

Decisión cerrada:

> Un backup manual no satisface el ciclo automático.

Por tanto crear manualmente una copia remota no actualiza `backup_automatic_state.json`.

## 23.8. Concurrencia

`BackupAutomaticExecutionService` tiene guard `running`.

Además `BackupRemoteCreateService` tiene guard de creación remota.

Colisión manual/automática:

- no se crean dos paquetes remotos simultáneamente;
- si el automático pierde la carrera por concurrencia, el error llega al scheduler y se reintenta más tarde;
- no se marca éxito indebidamente.

---

# 24. `21.9.3b — Composición real`

Se añadió:

```text
backupAutomaticStateFile
```

a `ApplicationPaths`.

Se compone el pipeline real:

```text
JsonBackupAutomaticStateRepository
        ↓
BackupAutomaticScheduleResolver
        ↓
BackupAutomaticStateService
        ↓
BackupAutomaticExecutionService
        ↓
BackupRemoteCreateService
```

También se creó:

```text
electron/bootstrap/application-composition.interface.ts
```

para devolver desde composición los objetos cuyo ciclo de vida pertenece a `main.ts`.

Durante este bloque se añadió el alias:

```text
@bootstrap/*
```

y se consolidó la preferencia de imports absolutos mediante aliases.

---

# 25. `21.9.3c — Reset al reemplazar instalación`

`backup_automatic_state.json` pertenece al terminal, no al backup.

Al activar una instalación diferente no debe heredarse el `lastSuccessfulAt` anterior.

Se resolvió en un único punto común:

```text
FileInstallationFinalizer
```

Durante `cleanPartialFinalInstallation()` elimina:

```text
backup_automatic_state.json
backup_automatic_state.json.tmp
```

Así cubre:

- instalación nueva;
- restore v3;
- import legacy.

Pero durante `recover()` de una instalación válida existente lo conserva.

---

# 26. `21.9.4 — Ciclo de vida Electron` — CERRADO

Se dividió en:

```text
21.9.4a-1 motor del scheduler
21.9.4a-2 arranque/parada real
21.9.4b powerMonitor resume
21.9.4c cambios de configuración en caliente
```

---

# 27. `21.9.4a-1 — Motor del scheduler`

Archivo:

```text
electron/backend/application/backup/backup-automatic-scheduler.service.ts
```

## 27.1. Estado interno

```text
timer
started
evaluating
reevaluateRequested
```

Retry constante:

```text
60 * 60 * 1000
```

aproximadamente una hora.

## 27.2. `start()`

Idempotente.

Programa una evaluación asíncrona inmediata:

```text
delay = 0
```

No bloquea el arranque de Electron.

## 27.3. `stop()`

- marca scheduler como detenido;
- limpia petición de reevaluación;
- cancela timer futuro;
- no intenta cancelar una copia ya en ejecución.

Si el proceso termina mientras existe una copia en curso y no llega a `markSuccessful()`, el siguiente arranque la considera pendiente.

## 27.4. `reevaluate()`

Si el scheduler no está iniciado:

```text
no-op
```

Si no está evaluando:

```text
cancela timer anterior
→ programa evaluación inmediata
```

Si ya está evaluando:

```text
reevaluateRequested = true
```

Al terminar la evaluación actual:

```text
una única reevaluación inmediata
```

Múltiples eventos mientras evalúa colapsan en una única reevaluación.

## 27.5. Programación del siguiente ciclo

Si el resultado contiene `status`:

```text
nextScheduledAt - now
```

Si no hay status o el cálculo es inválido:

```text
retry ~1h
```

Si el ejecutor lanza error:

```text
console.error
→ retry ~1h
```

## 27.6. Tests

Cubierto con fake timers:

- primera evaluación al arrancar;
- próximo vencimiento;
- retry tras error;
- retry sin instalación;
- `reevaluate()` inmediata;
- `reevaluate()` antes de `start()`;
- `stop()`;
- doble `start()` sin duplicar;
- reevaluación pedida mientras otra evaluación sigue en curso.

---

# 28. `21.9.4a-2 — Arranque/parada real`

El objeto expuesto por `ApplicationComposition` pasó a ser:

```text
applicationDatabase
backupAutomaticSchedulerService
```

`BackupAutomaticExecutionService` queda como detalle interno de composición.

En `electron/main.ts`:

```text
whenReady
→ recover instalaciones
→ createApplicationComposition
→ createMainWindow
→ backupAutomaticSchedulerService.start()
```

Se arranca después de crear la ventana para que:

- recovery haya terminado;
- composición esté completa;
- la app esté plenamente levantada.

En `before-quit`:

```text
scheduler.stop()
→ preventDefault
→ database.disconnect()
→ app.quit()
```

---

# 29. `21.9.4b — Reanudación desde suspensión`

`electron/main.ts` importa:

```text
powerMonitor
```

Y registra:

```text
powerMonitor.on('resume')
→ scheduler.reevaluate()
```

Razón:

> Un `setTimeout` puede haber quedado vencido o desfasado mientras Windows estaba suspendido.

Al reanudar:

```text
reevaluar inmediatamente
→ si el último vencimiento no está cubierto
→ crear catch-up
```

La regresión del scheduler confirma que un `resume` mientras ya existe una evaluación:

- no crea una segunda ejecución paralela;
- deja una sola reevaluación pendiente;
- múltiples solicitudes se colapsan.

---

# 30. `21.9.4c — Cambios de configuración en caliente`

Se decidió hacer la reevaluación en la frontera IPC y no introducir conocimiento del scheduler dentro de servicios de dominio/configuración.

Principio:

```text
operación relevante termina correctamente
→ scheduler.reevaluate()

operación falla
→ NO reevaluate()
```

## 30.1. Configuración general

Archivo:

```text
electron/ipc/configuration/register-configuration-ipc.ts
```

Tras:

```text
configurationService.update(command)
```

se llama:

```text
scheduler.reevaluate()
```

Esto cubre especialmente el cambio de:

```text
backupAutomaticTime
```

pero reevaluar tras cualquier guardado de configuración es suficientemente barato y evita lógica especial innecesaria.

## 30.2. Nueva instalación

Tras:

```text
installationService.install(command)
```

solo si:

```text
result.status === 'installed'
```

se llama a `reevaluate()`.

Así una instalación recién terminada no espera al retry horario del estado `not-installed` anterior.

## 30.3. Configuración remota

Archivo:

```text
electron/ipc/backup/register-backup-ipc.ts
```

Tras `backupRemoteService.configure(credentials)` correcto:

```text
reevaluate()
```

Esto permite crear inmediatamente un ciclo pendiente al conectar TPV Backup.

## 30.4. Quitar configuración remota

Tras:

```text
backupRemoteService.removeConfiguration()
```

correcto:

```text
reevaluate()
```

El scheduler pasa a estado `not-configured` y reprograma según el siguiente vencimiento.

## 30.5. Restauración v3 completada

Tras:

```text
restoreFinalizeService.finalize(selectionId)
```

correcto:

```text
reevaluate()
```

No se reevaluan las credenciales temporales usadas solo para seleccionar/descargar el backup remoto.

## 30.6. Importación legacy

Archivo:

```text
electron/ipc/register-legacy-import-ipc.ts
```

Después de `startImport()`:

```text
if result.status === 'installed'
→ reevaluate()
```

Si el legacy requiere completar luego `Key ID + Secret`, el primer resultado será `not-configured`; cuando el usuario configure posteriormente las credenciales, el handler remoto volverá a reevaluar.

---

# 31. Arquitectura actual completa de backups automáticos

```text
config/app_data.json
  backupAutomaticTime
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
BackupAutomaticScheduleResolver   config/backup_automatic_state.json
          │                              │
          └──────────────┬───────────────┘
                         ▼
             BackupAutomaticStateService
                         │
                         ▼
           BackupAutomaticExecutionService
                         │
                         ▼
             BackupRemoteCreateService
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
      BackupRemoteService     BackupService
               │                   │
               │                   ▼
               │             `.otpv` temporal
               │                   │
               └─────────┬─────────┘
                         ▼
                     upload
                         │
                    éxito real
                         │
                         ▼
               markSuccessful(now)
```

Por encima:

```text
BackupAutomaticSchedulerService
      │
      ├─ startup
      ├─ próximo vencimiento
      ├─ retry ~1h
      ├─ powerMonitor resume
      └─ cambios configuración
```

---

# 32. Semántica temporal definitiva

## 32.1. Hora local

La hora configurada:

```text
03:00
```

significa `03:00` de la zona horaria local del terminal.

No UTC.

## 32.2. Persistencia UTC

`lastSuccessfulAt` sí se almacena como UTC ISO:

```text
2026-10-07T01:05:00.000Z
```

## 32.3. Catch-up

Ejemplo:

```text
hora configurada: 03:00
último éxito: lunes 03:05
app vuelve a abrir jueves 12:00
```

Resultado:

```text
latestScheduledAt = jueves 03:00
lastSuccessfulAt < latestScheduledAt
pending = true
→ crear UNA copia
```

No se generan martes + miércoles + jueves por separado.

## 32.4. Reinicios

Tras un éxito jueves 12:02:

```text
reinicio jueves 12:10
→ latestScheduledAt jueves 03:00
→ lastSuccessfulAt jueves 12:02
→ pending = false
→ no duplicado
```

---

# 33. Estado automático y portabilidad

Decisión cerrada:

```text
backupAutomaticTime
→ preferencia de instalación
→ portable
→ app_data.json
```

```text
lastSuccessfulAt
→ estado operativo del terminal
→ NO portable
→ backup_automatic_state.json
```

Por tanto, tras restaurar una copia en una instalación limpia:

```text
backupAutomaticTime restaurada
lastSuccessfulAt vacío
```

El scheduler evaluará si corresponde crear una nueva copia automática según la hora actual.

---

# 34. Comportamiento ante suscripción / red

## 34.1. Active + canUpload

Si pending:

```text
crear backup
→ upload
→ markSuccessful
```

## 34.2. Expired

`getConnection()` funciona, pero:

```text
canUpload = false
```

`BackupRemoteCreateService` lanza error antes de generar el paquete.

Scheduler:

```text
no marca éxito
→ retry ~1h
```

## 34.3. Disabled

Autenticación falla.

Scheduler:

```text
no marca éxito
→ retry ~1h
```

## 34.4. Sin credenciales locales

`BackupAutomaticExecutionService` devuelve:

```text
not-configured
```

No es excepción.

Como existe `status`, el scheduler espera al próximo vencimiento conocido.

Al configurar credenciales mediante IPC:

```text
reevaluate()
```

inmediato.

## 34.5. Red temporalmente caída

Excepción propagada.

```text
retry ~1h
```

No bucles agresivos.

---

# 35. Concurrencia y ausencia de duplicados

Protecciones actuales:

```text
BackupAutomaticSchedulerService.evaluating
BackupAutomaticSchedulerService.reevaluateRequested
BackupAutomaticExecutionService.running
BackupRemoteCreateService.creating
```

Objetivo:

- no ejecutar dos ciclos automáticos paralelos;
- no lanzar una segunda copia por múltiples `resume`;
- no duplicar por reinicios;
- no duplicar por varios días offline;
- no considerar un manual como automático.

---

# 36. Estado de la composición Electron

Archivo:

```text
electron/bootstrap/application-composition.interface.ts
```

Expone actualmente:

```text
applicationDatabase
backupAutomaticSchedulerService
```

El scheduler se crea en:

```text
electron/bootstrap/application-composition.ts
```

El proceso principal controla su ciclo de vida.

---

# 37. `main.ts` — ciclo de vida relevante

Orden actual:

```text
app.whenReady()
↓
crear rutas
↓
asegurar directorios
↓
configurar logs
↓
registrar protocolo assets
↓
installationFinalizer.recover()
↓
createApplicationComposition()
↓
createMainWindow()
↓
scheduler.start()
↓
registrar powerMonitor.resume
```

Cierre:

```text
before-quit
↓
scheduler.stop()
↓
database.disconnect()
↓
app.quit()
```

Windows:

```text
window-all-closed
→ app.quit()
```

---

# 38. Commits relevantes de `21.9`

Cronología útil para localizar cambios:

```text
86acb9565b602f6353e396832ee8018a95136780
Terminado incluir backupAutomaticTime 21.9.1a

96661d3e2d809185a393ecc8e486f6813bebe1f4
Corrección UX de logo obligatorio durante nueva instalación

3588d60b6da922f3bc7f765c6a502fc9df2a778c
Retoques estéticos para hora de backups

3a76fb7739ed8c0e1195f43318d45963895bf992
Terminado compatibilidad con backups antiguos 21.9.1c

42bad51b5c7cc4abe531ca165575f71a52aa8c93
Terminado Resolver del horario automático 21.9.2a

7f2181e3a4809ff1fe021c79fecadcb31ab4299f
Terminado persistencia de lastSuccessfulAt 21.9.2b

81f74f1addbff1b62e47d4f27b1bcb9ce1e71e30
Corrección en 21.9.2b

570304da1abe50e9cbf9196749c6bfd17944ec3f
Terminado servicio de estado del scheduler 21.9.2c

382b6213532dad1a87f96716c2d733dbaea4b7f5
Terminado ejecutor aislado 21.9.3a

e496dd7186a2c8f60914cbfa7b4befd7f1482d19
Terminado composición real 21.9.3b

80f2c54ccffa9b4847bd24becd367d6c570fbf57
Terminado Reset al reemplazar instalación 21.9.3c

3b87982466722ef4d7488db1eef4c9f434716d12
Terminado motor del scheduler 21.9.4a-1

f34f0b7031c00a328d05be6e9d3fca8f75f86542
Terminado arranque/parada real desde main.ts 21.9.4a-2

cf86a64d94446a07872ba2f96cfd8eddc50427ee
Terminado reanudación desde suspensión 21.9.4b

2d81e1cbb33eea84c59e2f0762e039484a262183
Terminado cambios de configuración en caliente 21.9.4c
```

---

# 39. `21.9.5 — UI informativa` — SIGUIENTE BLOQUE

Todavía no implementado.

## 39.1. Objetivo visual acordado

Algo equivalente a:

```text
COPIAS AUTOMÁTICAS
Todos los días a las 03:00

Última copia automática
07/10/2026 03:02
```

Debe ser informativo, no un segundo lugar de configuración de la hora si ya existe en Ajustes.

## 39.2. Fuente de datos existente

Ya existe:

```text
BackupAutomaticStatus
```

con:

```text
automaticTime
lastSuccessfulAt
latestScheduledAt
nextScheduledAt
pending
```

El siguiente paso lógico es exponer una consulta segura desde Main al Renderer.

No diseñar todavía una segunda persistencia ni recalcular fechas en Angular.

## 39.3. Capa recomendada a inspeccionar

Antes de proponer código revisar en `main`:

- `electron/ipc/channels`;
- preload / bridge actual de backup;
- interfaces públicas usadas por Gestión > Backups;
- `management-backups.component.ts/html/scss/spec.ts`;
- si conviene exponer `BackupAutomaticStatus` tal cual o crear un contrato público específico.

## 39.4. Estado sin copia previa

Debe definirse visualmente, probablemente algo equivalente a:

```text
Última copia automática
Todavía no se ha realizado ninguna
```

No asumir texto definitivo sin revisar el diseño existente.

## 39.5. Errores automáticos

Decisión previa:

> Los fallos automáticos deben ser silenciosos/no modales.

La UI de `21.9.5` inicialmente tiene como objetivo principal mostrar horario y última ejecución correcta.

No introducir toasts repetitivos por retry horario.

---

# 40. `21.9.6 — Regresión funcional` — PENDIENTE

Debe cerrar `21.9` con pruebas reales, no solo unitarias.

Matriz mínima recomendada:

## 40.1. Primera copia catch-up al arrancar

Preparar:

```text
hora configurada anterior a la hora actual
sin backup_automatic_state.json
credenciales válidas
suscripción active/canUpload
```

Esperado:

```text
arrancar Client
→ crear exactamente 1 backup remoto
→ crear backup_automatic_state.json
→ lastSuccessfulAt válido
```

## 40.2. Reinicio sin duplicado

Después del caso anterior:

```text
cerrar
abrir otra vez el mismo día
```

Esperado:

```text
no crear una segunda copia automática
```

## 40.3. Hora futura

Configurar una hora aún no vencida.

Esperado:

```text
no backup inmediato
```

## 40.4. Cambio de hora en caliente

Caso hacia hora ya vencida:

```text
cambiar hora
→ guardar
→ reevaluate inmediata
→ backup si el nuevo ciclo queda pendiente
```

Caso hacia hora futura:

```text
no duplicado
→ reprogramar próximo vencimiento
```

## 40.5. Varios días offline

Simular estado antiguo y volver a abrir varios días después.

Esperado:

```text
1 catch-up
NO N backups
```

## 40.6. Suspend / resume

Suspender Windows antes del vencimiento y reanudar después.

Esperado:

```text
resume
→ reevaluate
→ backup pendiente inmediato
```

## 40.7. Fallo de red

Provocar fallo temporal.

Esperado:

```text
no lastSuccessfulAt nuevo
ciclo continúa pending
retry posterior
```

Para no esperar una hora real durante pruebas manuales se puede validar parte por tests/unitarios y decidir una estrategia controlada para funcional; no modificar el intervalo productivo de forma permanente solo para probar.

## 40.8. Suscripción expired

Esperado:

```text
auth válida
canUpload=false
no generar `.otpv` costoso
no marcar éxito
retry posterior
```

## 40.9. Suscripción disabled

Esperado:

```text
auth rechazada
no marcar éxito
retry posterior
```

## 40.10. Reactivación

Tras volver a `active`, en el siguiente retry o reevaluación relevante:

```text
crear backup pendiente
→ marcar éxito
```

## 40.11. Quitar y volver a configurar credenciales

Quitar:

```text
reevaluate
→ not-configured
```

Volver a configurar:

```text
reevaluate inmediata
→ si pending, crear backup
```

## 40.12. Backup manual no cubre ciclo automático

Crear backup remoto manual con ciclo pendiente.

Esperado:

```text
backup automático sigue pendiente
```

## 40.13. Restore v3

Restaurar copia con:

```text
backupAutomaticTime
```

Esperado:

```text
hora restaurada
lastSuccessfulAt local NO restaurado
scheduler parte limpio
```

## 40.14. Backup v3 antiguo

Restaurar backup sin `backupAutomaticTime`.

Esperado:

```text
03:00
```

## 40.15. Nueva instalación / import legacy

Esperado:

```text
estado automático anterior eliminado
scheduler reevaluado al finalizar
```

---

# 41. Riesgos y puntos que no deben olvidarse en `21.9.5/21.9.6`

## 41.1. El scheduler ya está activo de verdad

Desde `21.9.4a-2`, abrir el Client puede generar una copia remota automática si:

- la hora ya ha vencido;
- el ciclo está pendiente;
- hay credenciales;
- la suscripción permite upload.

Tenerlo en cuenta durante pruebas manuales.

## 41.2. `lastSuccessfulAt` no equivale al vencimiento

Representa la finalización real del backup.

No mostrarlo ni compararlo como si fuera la hora programada.

## 41.3. No resetear estado en cada arranque

`recover()` con instalación válida debe conservarlo.

Solo se limpia al reemplazar una instalación o cuando no existe marcador final válido.

## 41.4. No hacer portable el estado

No añadir `backup_automatic_state.json` al payload `.otpv`.

## 41.5. No marcar manuales como automáticos

No actualizar `lastSuccessfulAt` desde:

```text
backupRemoteCreate
```

manual.

## 41.6. No mover scheduling a UTC

La hora de usuario es local.

Solo timestamps persistidos son UTC ISO.

## 41.7. No usar un `setInterval(24h)`

Se debe recalcular el próximo vencimiento civil.

La implementación actual ya lo hace mediante `nextScheduledAt`.

## 41.8. No crear modales periódicos por fallos

Un fallo automático debe quedar silencioso desde el punto de vista operativo del usuario.

## 41.9. Imports

Usar aliases absolutos siempre que existan.

---

# 42. Estado actual de tests de `21.9`

Todos los bloques descritos hasta `21.9.4c` fueron reportados por el usuario como verdes antes de hacer push.

Se han ejecutado repetidamente:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Además `21.9.1` tuvo baterías más amplias durante integración con Angular.

Antes de cerrar `21.9.6` ejecutar batería completa del Client:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

---

# 43. Pantallas y UX relacionadas

## 43.1. Nueva instalación

TPV Backup:

```text
fila 1: Backup API Key a ancho completo
fila 2: Key ID | Secret | Hora
```

Logo:

```text
Logo (obligatorio)
```

con mensaje de error visible correctamente.

## 43.2. Ajustes

TPV Backup:

```text
Backup API Key + botón revelar | Hora
```

La explicación del horario/catch-up se muestra como texto de ayuda, no `mat-hint` conflictivo.

## 43.3. Backups

Actualmente ya permite:

- estado de conexión;
- listado remoto;
- crear manual;
- descargar;
- borrar;
- restaurar desde remoto.

En `21.9.5` esta pantalla es la candidata natural para mostrar el estado automático.

---

# 44. Recordatorio de `21.7` — seguridad e integridad

No reabrir salvo nueva evidencia.

## 44.1. Stored SHA

La API verifica el SHA-256 del blob ya persistido.

## 44.2. Download Client

El Client hace streaming, calcula SHA y tamaño durante la descarga y solo promociona si coinciden con metadata.

## 44.3. Storage reconciliation

Read-only, probado sobre storage real.

## 44.4. Límites

Upload contractual:

```text
8 GiB
```

Configuración PHP/webserver fue revisada en su bloque correspondiente.

## 44.5. Auditoría

Se revisó que secretos no aparezcan en auditoría/logs.

---

# 45. Recordatorio de bugs ya corregidos

## 45.1. UI de backups con estado stale

Tras error de autenticación/conexión se limpia conexión y listado.

Si solo falla listado con conexión válida, se conserva conexión pero se limpia listado.

## 45.2. `getConnection()` stale

Ahora siempre reautentica para obtener estado administrativo actual.

## 45.3. Mensaje al desactivar suscripción

Front corregido para explicar que las instalaciones no podrán autenticarse ni acceder a copias mientras permanezca desactivada.

## 45.4. Estado temporal scheduler

Error de ruta `.tmp` corregido en `21.9.2b`.

---

# 46. TicketBAI — estado separado

No mezclar con `21.9`.

`@osumi/ticketbaiws` publicado:

```text
@osumi/ticketbaiws 1.0.1
```

Pendiente:

```text
TicketBAI 12C.9
→ esperar respuesta / actualización de Berein
```

Cuando Berein responda, revisar tipos/endpoints/documentación del SDK.

---

# 47. Hito 22 — todavía no iniciar

Después de cerrar por completo `21.9` y por tanto estabilizar Hito 21, el siguiente gran hito previsto es:

```text
Hito 22 — Sincronización tienda online
```

No iniciar antes de terminar:

```text
21.9.5
21.9.6
```

---

# 48. Checklist para una conversación nueva

Si este documento se utiliza para retomar el desarrollo desde cero, seguir este orden:

1. Leer esta `v2.89` completa.
2. Revisar `main` de:
   - Osumi-TPV-Client;
   - TPV-Backup-API;
   - TPV-Backup-Front.
3. Confirmar si existe un documento de continuidad posterior a `v2.89`.
4. Si no existe uno posterior, comprobar el HEAD del Client respecto a:

```text
2d81e1cbb33eea84c59e2f0762e039484a262183
```

5. Si `main` sigue ahí, continuar por:

```text
21.9.5 — UI informativa
```

6. Antes de escribir código para `21.9.5`, leer los archivos actuales de:

```text
BackupAutomaticStateService
BackupAutomaticStatus
IPC channels
backup preload/bridge
management-backups component
application-composition
```

7. Mantener imports mediante aliases absolutos.
8. Indicar siempre al usuario:
   - dónde estamos;
   - qué bloque se está haciendo;
   - qué queda después.
9. No avanzar si fallan tests/build/lint.
10. Tras push, volver a leer `main`.

---

# 49. Punto exacto de cierre de esta continuidad

Al generar `v2.89`:

```text
HEAD Client
2d81e1cbb33eea84c59e2f0762e039484a262183
Terminado cambios de configuración en caliente 21.9.4c
```

Por tanto:

```text
✅ 21.9.1
✅ 21.9.2
✅ 21.9.3
✅ 21.9.4

▶️ 21.9.5 UI informativa
⏳ 21.9.6 Regresión funcional
```

Cuando `v2.89` sea subida al repositorio, debe sustituir a `v2.88` como referencia principal de continuidad.

---

# 50. Regla final de continuidad

No asumir que un resumen antiguo representa el código actual.

Siempre:

```text
main actual
→ documento de continuidad más reciente
→ conversación activa
```

Y para decisiones de `21.9`, conservar especialmente estas invariantes:

```text
03:00 por defecto, configurable
hora local
UTC ISO para lastSuccessfulAt
estado local no portable
1 solo catch-up
manual ≠ automático
fallo ≠ éxito
retry ~1h
resume → reevaluate
cambio relevante → reevaluate
mismo pipeline remoto
sin duplicados
```
