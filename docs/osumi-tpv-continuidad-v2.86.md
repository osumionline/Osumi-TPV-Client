Osumi TPV Client — Documento de continuidad v2.86

Fecha: 5 de octubre de 2026
Proyecto principal: Osumi TPV Client
Repositorio: https://github.com/osumionline/Osumi-TPV-Client

Este documento actualiza y sustituye como referencia de continuidad a:

docs/osumi-tpv-continuidad-v2.85.md

La fuente de verdad para continuar será:

main actual
+
este documento
+
la conversación nueva

El documento docs/tpv-backup-contexto-tecnico-v1.0.md puede seguir sirviendo como referencia histórica del arranque de TPV Backup, pero sus apartados pendientes sobre API e integración Client están superados por el estado descrito aquí.

────────

1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

Unidad de trabajo

Cada propuesta debe ser una unidad pequeña, coherente, autocontenida y verificable.

No significa necesariamente un archivo por mensaje.

Reglas:

• agrupar archivos relacionados cuando formen una única unidad funcional;
• dividir bloques realmente grandes o que mezclen responsabilidades;
• evitar cambios masivos y fragmentación artificial;
• cada bloque debe poder aplicarse, probarse y validar su comportamiento claramente.

Antes de proponer código

Siempre:

1. revisar el main actual;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, helpers, contratos, campos ni APIs;
4. comprobar código legacy cuando siga siendo una referencia funcional;
5. distinguir decisiones cerradas de propuestas futuras.

Para archivos nuevos:

> Dar ruta y contenido completo.

Para archivos existentes:

> Dar ruta, bloque identificable y reemplazo exacto.

GitHub

Uso estrictamente de solo lectura.

No crear ni modificar remotamente:

• commits;
• ramas;
• PRs;
• issues;
• comentarios;
• archivos.

El usuario aplica los cambios localmente, ejecuta tests y hace push.

Tras cada push confirmado:

> Volver a revisar `main` antes de continuar.

Validación

Batería estable del Client:

npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint

No continuar con errores.

Cuando proceda, además realizar prueba funcional real.

────────

2. Reglas permanentes de código

JSDoc / PHPDoc

Regla expresa:

> Todo método creado o modificado debe tener JSDoc/PHPDoc.

También en interfaces.

Exports TypeScript

Regla expresa:

1 único símbolo exportado
→ export default

2 o más símbolos exportados
→ todos nominales
→ nunca export default

Angular

Referencia actual:

Angular 22+
standalone
zoneless
signals

Convenciones:

• inject() para DI;
• input() / output() signals;
• viewChild() signal;
• @if / @for / @switch;
• Signal Forms cuando corresponda;
• tipado estricto;
• evitar any;
• aliases de tsconfig;
• Material;
• MatTooltip en vez de title;
• no NgModule;
• no CommonModule salvo necesidad real;
• no HostBinding / HostListener;
• no ngClass / ngStyle;
• WCAG AA;
• Prettier organiza imports.

────────

3. HEADs verificados al generar este documento

Osumi TPV Client

d62ab8864f40d57d2b0d3884af15145027e5ccef
Correcciones tras el ultimo commit

Ese commit contiene las últimas correcciones de:

• imports type;
• recuperación de credenciales remotas huérfanas tras instalación/restauración interrumpida.

Commit anterior principal del bloque:

112a365744aa5c19ff9dab02c2f5f9619261b352
Cambios para incluir backup key id y secret en backups e instalación

TPV Backup API

63b9fc42478f5a585eca96370d2d7f4d94adbed5
Metodo para borrar un backup remotamente

Repositorio:

https://github.com/osumionline/TPV-Backup-API

TPV Backup Front

469109cf3d0c7f3ab2170273f7a56d5338052b68
Actualizo pagina de auditoria

Repositorio:

https://github.com/osumionline/TPV-Backup-Front

Dominios:

Front:
https://tpvbackup.osumi.dev

API:
https://apitpvbackup.osumi.dev

────────

4. Estado general de hitos

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
   ▶️ 21.6 Integración Client ↔ TPV Backup
   ⏳ 21.7 Seguridad/integridad/retención — cierre global pendiente
   ⏳ 21.8 Regresión recuperación global

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein

Importante:

> Aunque varios aspectos de seguridad, auditoría, retención e integridad ya están implementados y probados en el API, el hito formal 21.7 todavía no se considera cerrado como bloque global.

────────

5. TPV Backup — arquitectura actual

La solución está dividida en tres repositorios:

Osumi TPV Client
→ crea/restaura `.otpv`
→ se autentica contra TPV Backup
→ subirá/listará/descargará/borrará copias

TPV Backup API
→ autentica instalaciones
→ almacena blobs cifrados
→ aplica ownership, retención y auditoría
→ nunca puede descifrar `.otpv`

TPV Backup Front
→ panel administrativo
→ suscripciones
→ instalaciones
→ credenciales
→ backups
→ auditoría

El servidor nunca recibe la TPV Backup key usada para descifrar copias.

────────

6. Identidades y secretos — distinción crítica

No confundir nunca:

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

TPV Backup key

Es el secreto maestro criptográfico del .otpv.

Reglas:

bytes UTF-8 exactos
sin trim
sin normalización
nunca se envía al servidor
nunca se incluye dentro del `.otpv`

Se utiliza para derivar la KEK con scrypt.

Key ID + Secret

Son las credenciales de servicio de una instalación frente al API TPV Backup.

Reglas:

Key ID
→ se puede normalizar con trim en capa de aplicación

Secret
→ conservar exactamente
→ no trim

Persistencia:

secrets/backup_remote_credentials.json

Cifrado mediante Electron safeStorage.

No forman parte de InstallationSecretsData.

JWT remoto

solo memoria
no se persiste
no cruza hacia Angular
no entra en `.otpv`

────────

7. .otpv v3 — contrato vigente

Contenedor exterior ZIP con exactamente:

manifest.json
payload.enc

payload.enc es un ZIP interior cifrado.

Algoritmos:

formatVersion = 3
cryptoSuite = otpv3-scrypt-aes-256-gcm

scrypt:
salt = 32 bytes
cost = 32768
blockSize = 8
parallelization = 3
length = 32 bytes

AES-256-GCM:
DEK aleatoria por backup
KEK derivada desde TPV Backup key

El payload interior contiene:

database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
files/**

No contiene:

printing_settings.json
logs/
backups/
staging/
TPV Backup key

El payload se crea por streaming y no debe cargarse entero en memoria.

Tamaño máximo de contrato:

8 GiB

────────

8. secrets/secrets.json — schema 1 definitivo inicial

Como la aplicación todavía no está en producción, se decidió explícitamente no crear una falsa compatibilidad schema 1/schema 2.

El contrato inicial real queda fijado ahora como:

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

Si la instalación no tiene conexión remota configurada:

{
  "schemaVersion": 1,
  "secretApi": "...",
  "emailSmtpPass": "...",
  "ticketBaiToken": "...",
  "backupRemoteCredentials": null
}

Regla fundamental:

backupApiKey
→ NO aparece en secrets/secrets.json
→ NO aparece en ningún otro lugar del `.otpv`

El .otpv solo puede abrirse aportando externamente la TPV Backup key.

────────

9. Creación de .otpv — estado actual

Clase principal:

electron/infrastructure/backup/yazl-otpv-v3-payload.builder.ts

Ahora obtiene:

InstallationSecretsData
+
BackupRemoteCredentialStorage

y serializa como secretos portables:

secretApi
emailSmtpPass
ticketBaiToken
backupRemoteCredentials

La credencial remota se incluye únicamente dentro del payload cifrado.

La backupApiKey utilizada para cifrar sigue viniendo del SecretStorage operativo, pero no se serializa.

────────

10. Restauración .otpv v3 — estado actual

Flujo actual:

seleccionar `.otpv`
↓
validar contenedor exterior
↓
introducir TPV Backup key
↓
descifrar payload
↓
validar ZIP interior
↓
extraer recursos obligatorios
↓
validar SQLite / app_data / logo / secretos
↓
restaurar files/**
↓
preparar staging canónico
↓
finalizar instalación

La restauración solo se permite sobre instalación limpia.

Secretos de instalación

FileOtpvV3RestoreStagingPreparer reconstruye:

InstallationSecretsData

combinando:

secretApi
emailSmtpPass
ticketBaiToken
+
TPV Backup key introducida externamente

y los guarda mediante safeStorage del equipo destino.

Credenciales remotas

El preparador devuelve:

BackupRemoteCredentials | null

Estas credenciales:

unlock
↓
InMemoryOtpvV3PreparedRestoreStore
↓
finalize

permanecen únicamente en memoria hasta la promoción final.

OtpvV3RestoreFinalizeService las guarda después mediante:

ElectronSafeStorageBackupRemoteCredentialStorage

en:

secrets/backup_remote_credentials.json

Si la finalización falla:

credencial remota restaurada
→ se elimina

instalación parcial
→ recover()

────────

11. Recuperación ante interrupciones bruscas

Se corrigió un caso importante.

Durante instalación nueva:

configureRemote()
↓
backup_remote_credentials.json
↓
install()
↓
app_data.json al final

Una caída del proceso entre ambos pasos podía dejar credenciales remotas huérfanas.

FileInstallationFinalizer.recover() ahora, cuando:

app_data.json NO existe

limpia también:

backup_remote_credentials.json
backup_remote_credentials.json.tmp

Solo se hace durante recuperación de una instalación/restauración incompleta.

No se añade ese fichero a la limpieza normal de finalize(), porque eso borraría credenciales válidas recién configuradas.

────────

12. Instalación nueva — TPV Backup integrado en onboarding

El paso 3 de instalación incluye ahora juntos:

TPV Backup key
Key ID
Secret

Los tres se tratan como un conjunto:

los tres vacíos
→ TPV Backup no configurado
→ instalación permitida

cualquiera informado
→ los tres obligatorios

La TPV Backup key sigue siendo parte de InstallationSecretsData.

Key ID + Secret están únicamente en el modelo Angular del formulario y no entran en InstallationCommand.

Flujo al guardar:

validar formulario
↓
si hay credencial remota:
    authenticate contra TPV Backup
    guardar con safeStorage
↓
realizar instalación local
↓
si instalación falla:
    eliminar configuración remota

Unas credenciales remotas incorrectas impiden terminar la instalación.

El Secret no se normaliza.

────────

13. Importación legacy v2

Los .otpv exportados por el TPV antiguo pueden contener:

backupApiKey

pero nunca:

Key ID
Secret

porque esas credenciales no existían en el sistema antiguo.

Durante importación legacy:

packageConfiguration.secrets.backupApiKey !== ''
→ requiresBackupRemoteCredentials = true

Tras una importación correcta se muestra un aviso:

> Se ha recuperado la TPV Backup key, pero el formato legacy no contiene Key ID ni Secret. Deben introducirse desde Gestión → Copias de seguridad.

No se inventan ni generan credenciales automáticamente.

────────

14. TPV Backup API — estado cerrado de 21.5

Backend:

Osumi Framework 9.10.1

El framework 9.10.0 añadió OStreamResponse.

9.10.1 corrigió la propagación de OCore::setHttpStatus() a middleware.

Configuración relevante:

{
  "admin_token_ttl": 28800,
  "installation_token_ttl": 3600,
  "backup_storage_path": "storage/backups"
}

Storage:

storage/backups

fuera del webroot.

Storage key:

installations/<installation.public_id>/<backup.public_id>.otpv

Máximo de aplicación:

8 GiB

────────

15. API remota — rutas definitivas actuales

Autenticación:

POST /api/v1/auth/token
GET  /api/v1/me

Backups:

POST   /api/v1/backups
GET    /api/v1/backups
GET    /api/v1/backups/:publicId/download
DELETE /api/v1/backups/:publicId

Todas las rutas de backup pasan por:

InstallationAuthMiddleware

────────

16. Autenticación de instalaciones

POST /api/v1/auth/token recibe:

Key ID
Secret

JWT:

type = installation
installation id/public_id
credential id/key_id
iat
exp

TTL actual:

3600 segundos

El middleware recarga en cada request:

credential
installation
subscription

Por tanto:

> Revocar/rotar la credencial invalida también un JWT todavía no expirado.

Una autenticación correcta actualiza:

credential.last_used_at
installation.last_seen_at

y puede rehashar la contraseña/secret almacenado cuando corresponda.

────────

17. Semántica de suscripciones

Estados:

active = false
→ deshabilitada

active = true + expires_at pasado
→ expired

active = true + expires_at futuro/null
→ active

Política definitiva probada:

active
→ token
→ /me
→ list
→ download
→ delete
→ upload

expired
→ token permitido
→ /me permitido
→ list permitido
→ download permitido
→ delete permitido
→ upload BLOQUEADO

El objetivo es no impedir la recuperación de datos por una suscripción caducada.

────────

18. Upload remoto — API

POST /api/v1/backups

Controles:

CONTENT_LENGTH > post_max_size
→ 413

DTO/file/context inválidos
→ 400

canUpload !== true
→ 403

INI/FORM size
→ 413

no file / partial upload
→ 400

otros upload errors
→ 500

.otpv inválido
→ 422

backupId conflictivo
→ 409

El servidor valida el .otpv sin descifrarlo.

Comprueba:

manifest
estructura exterior
formatVersion
application
backupId UUIDv4
createdAt
cryptoSuite
scrypt
AES-GCM metadata
payload CM_STORE
SHA-256 completo

────────

19. Idempotencia y retención remota

Resultado de creación:

BackupCreateResult
→ Backup
→ created: boolean

Idempotencia:

mismo installation
+
mismo backupId
+
mismo SHA
+
mismo storage
→ devuelve existente
→ created = false

Si cambia hash/instalación:

409 conflict

También se contempla race concurrente.

Retención:

subscription.max_backups_per_installation

Valor de referencia/default:

6

La retención borra las copias más antiguas según:

created_at_client ASC
+
id como desempate

El borrado por retención se audita.

Nota operativa:

> Durante pruebas funcionales se cambió temporalmente el límite a 1. Antes de futuras pruebas de volumen conviene comprobar que la suscripción utilizada ha vuelto al valor previsto.

────────

20. Download y delete remoto — API

Download

GET /api/v1/backups/:publicId/download

Validación funcional completada:

HTTP 200
longitud exacta
SHA exacto
audit backup.download

Se usa streaming.

Delete

DELETE /api/v1/backups/:publicId

Semántica:

backup inexistente/ajeno
→ 404

instalación inválida
→ 403

éxito
→ metadata eliminada
→ blob físico eliminado
→ audit backup.delete

BackupService::delete() elimina primero metadata DB y confirma la transacción; después intenta eliminar el blob.

Si el borrado físico falla:

metadata ya no existe
blob puede quedar huérfano

Debe resolverse por reconciliación/mantenimiento, no reinsertando metadata a ciegas.

────────

21. 21.5 — validaciones funcionales cerradas

Se probaron realmente:

auth instalación                         ✅
/me                                      ✅
upload válido                            ✅
idempotencia                             ✅
expired: token                           ✅
expired: /me                             ✅
expired: upload → 403                    ✅
.otpv inválido → 422                     ✅
conflict backupId/hash → 409             ✅
rotación/revocación credencial           ✅
JWT antiguo invalidado                   ✅
retención                                ✅
post_max_size → 413                      ✅
list                                     ✅
download + hash                          ✅
delete                                   ✅
expired: list                            ✅
expired: download                        ✅
expired: delete                          ✅
auditoría                                ✅

Conclusión:

21.5 — CERRADO

────────

22. Client 21.6 — bloques ya terminados

21.6.1 Cliente HTTP tipado

Contrato:

BackupRemoteClient

Implementación:

HttpBackupRemoteClient

Actualmente soporta:

authenticate()
list()

Errores normalizados:

unauthorized
forbidden
not-found
conflict
too-large
invalid-backup
temporary
invalid-response
unexpected

21.6.2 Storage de credencial remota

Contrato:

BackupRemoteCredentialStorage

Implementación:

ElectronSafeStorageBackupRemoteCredentialStorage

Fichero:

secrets/backup_remote_credentials.json

Formato:

schemaVersion = 1
encryptedData = base64

Se usa:

safeStorage.isAsyncEncryptionAvailable()
safeStorage.encryptStringAsync()
safeStorage.decryptStringAsync()

Guardado atómico:

.tmp
→ rename

21.6.3 Servicio remoto

BackupRemoteService

Responsabilidades:

configure
getConnection
list
removeConfiguration

La sesión JWT:

solo memoria

Renovación:

expiresAt
+
margen 30 s

Si el middleware devuelve 403 a un JWT todavía vigente:

descartar sesión
→ autenticar otra vez una sola vez
→ reintentar operación

Esto permite detectar revocaciones administrativas tempranas.

21.6.4 IPC y Renderer

Recorrido:

Angular
↓
DesktopBackupService
↓
preload
↓
IPC protegido con assertTrustedSender
↓
BackupRemoteService
↓
HttpBackupRemoteClient

El Renderer puede:

configureRemote
getRemoteConnection
removeRemoteConfiguration
getRemoteBackups

Nunca puede recuperar:

Secret almacenado
JWT

────────

23. Pantalla Gestión → Copias de seguridad

Estado actual de UI:

Nueva copia local
+
bloque TPV Backup

Si no hay configuración:

Key ID
Secret
Conectar con TPV Backup

El botón de conexión está alineado a la derecha.

Los mat-form-field usan:

otpv-mat-field--transparent-subscript

para evitar el fondo blanco heredado en el área reservada para errores.

Si existe conexión muestra:

instalación
suscripción
estado active/expired
Actualizar
Cambiar credenciales
Desconectar

También muestra listado remoto real con:

fecha cliente
archivo
backupId
versión
tamaño

Todavía NO hay en la UI:

upload remoto
download remoto
delete remoto
restore remoto

────────

24. Comportamiento del formulario remoto

Al cambiar credenciales:

authenticate primero
↓
solo si funciona:
    persistir nuevas credenciales

Si las nuevas credenciales fallan:

las antiguas se conservan

Al desconectar:

se elimina únicamente la credencial local

No se borra ningún backup remoto.

────────

25. Estado portable y no portable

Portable

database
app_data
logo
assets/files/**
secretApi
emailSmtpPass
ticketBaiToken
Key ID
Secret remoto

Externo al backup

TPV Backup key

Debe introducirse para abrir/restaurar.

No portable por diseño

printing_settings.json
JWT

Tras restore:

ticketPrinterDeviceName = null

────────

26. Seguridad del servicio remoto

TPV Backup opera como almacenamiento zero-knowledge respecto al contenido funcional.

Servidor NO conoce:

TPV Backup key
KEK
DEK en claro
secretApi
emailSmtpPass
ticketBaiToken
SQLite descifrada
Key ID/Secret contenidos dentro de payload.descifrado

Naturalmente, el servidor sí conoce la credencial remota que utiliza para autenticar la instalación mediante su mecanismo de credenciales.

No confundir:

credencial HTTP de instalación
≠
secreto criptográfico del backup

────────

27. API Client base URL

Actualmente compuesta en Electron como:

https://apitpvbackup.osumi.dev/api/v1

No se ha introducido una segunda configuración de entorno para esta URL.

Revisar esta decisión únicamente si aparece una necesidad real de entornos múltiples.

────────

28. Punto exacto actual de 21.6

Estado:

✅ autenticación remota
✅ almacenamiento cifrado Key ID/Secret
✅ sesión JWT en memoria
✅ renovación de sesión
✅ configuración desde Client
✅ configuración durante instalación
✅ listado remoto
✅ estado de suscripción
✅ soporte expired
✅ desconexión local
✅ Key ID + Secret dentro del `.otpv`
✅ restauración Key ID + Secret
✅ aviso para imports legacy
✅ recuperación ante proceso interrumpido

⏳ upload desde Client
⏳ download desde Client
⏳ delete desde Client
⏳ restore desde backup remoto
⏳ UX final de última copia/acciones

────────

29. Siguiente bloque recomendado

El siguiente bloque exacto es:

21.6.5 — Crear/subir backup remoto desde Osumi TPV Client

Antes de escribir código:

1. revisar main actual;
2. revisar HttpBackupRemoteClient;
3. revisar BackupRemoteService;
4. revisar BackupService.createLocal();
5. revisar cómo se obtiene el path real de la copia local;
6. confirmar la estrategia de multipart/streaming compatible con la versión Node/Electron usada.

Regla crítica:

> NO usar `readFile()` ni `arrayBuffer()` para cargar un `.otpv` completo en memoria.

El contrato admite hasta:

8 GiB

La subida debe ser streaming o utilizar una API de fichero/Blob que no materialice todo el archivo en RAM.

────────

30. Diseño previsto para upload Client — todavía no implementado

Dirección esperada:

crear `.otpv` local
↓
obtener path
↓
BackupRemoteService
↓
HttpBackupRemoteClient.upload(...)
↓
multipart/form-data
↓
POST /api/v1/backups

Debe respetar:

canUpload

Si la suscripción está expirada:

no intentar upload

o manejar limpiamente el 403 del servidor.

Hay que decidir durante implementación si:

"Crear copia"

seguirá siendo solo local

o si añadiremos una acción explícita:

"Crear y subir"

No asumir sin revisar la UX actual.

────────

31. Descarga futura

API ya disponible:

GET /api/v1/backups/:publicId/download

La implementación Client debe descargar por streaming.

No usar:

response.arrayBuffer()

para backups grandes.

El archivo descargado debe alimentar el pipeline de restauración v3 existente.

No crear un segundo sistema de restore.

Flujo:

backup remoto
↓
download
↓
.otpv local/temporal
↓
selector/pipeline restore v3

Pendiente decidir ubicación temporal/definitiva y política de limpieza.

────────

32. Delete futuro en Client

API:

DELETE /api/v1/backups/:publicId

El Client deberá:

confirmar acción
↓
delete
↓
refrescar listado

No confundir:

Desconectar TPV Backup

con:

Borrar una copia remota

Son operaciones completamente distintas.

────────

33. Restore remoto futuro

Objetivo final:

Client limpio
↓
conocer TPV Backup key
+
tener/introducir Key ID + Secret si es necesario
↓
listar backups
↓
descargar
↓
restore v3
↓
credenciales remotas incluidas en backup
↓
instalación operativa

El restore nativo ya sabe reconstruir Key ID + Secret del payload.

────────

34. Regresión final prevista 21.8

Prueba real objetivo:

Client A
↓
instalación con TPV Backup
↓
crear `.otpv`
↓
upload HTTPS
↓
TPV Backup
↓
listado
↓
download
↓
Client B limpio
↓
TPV Backup key
↓
restore
↓
Client B operativo
↓
conexión TPV Backup recuperada

Además probar:

delete remoto
retención
credencial revocada
suscripción expirada
backup corrupto
upload interrumpido
reintento/idempotencia

────────

35. Tests y estado de calidad

Último bloque validado por el usuario con:

npm test               ✅
npm run build          ✅
npm run test:electron  ✅
npm run build:electron ✅
npm run lint           ✅

Los tests se ampliaron para cubrir:

portable secrets con credencial remota
portable secrets sin credencial remota
prohibición de backupApiKey en payload
builder con Key ID + Secret
restore staging
unlock
prepared restore
finalize
rollback de credencial remota
recovery tras instalación interrumpida

────────

36. Detalles de infraestructura Client relevantes

Root:

app.getPath('userData') / osumi-tpv

Estructura relevante:

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

secrets.json y backup_remote_credentials.json están cifrados mediante safeStorage.

────────

37. SQLite

Client:

better-sqlite3
WAL

Nunca copiar directamente la SQLite operacional.

Backup:

snapshot consistente

Restore:

SQLite autocontenida
sin dependencia de -wal/-shm

Validación:

identidad
schema
tablas
metadata
integrity_check
foreign_key_check

DATABASE_SCHEMA_VERSION:

1

────────

38. TPV Backup Front — estado relevante

La aplicación administrativa ya existe y funciona sobre Angular moderno.

Incluye como mínimo:

login
dashboard
suscripciones
instalaciones
credenciales
backups
auditoría

La página de auditoría fue actualizada en el HEAD actual.

No mezclar desarrollo del panel con integración Client salvo que una necesidad funcional lo exija.

────────

39. TPV Backup API — reglas de dominio importantes

Instalaciones

Una instalación:

public_id
suscripción
estado activo/inactivo
last_seen_at

Credenciales

Pueden:

rotarse
revocarse

Una rotación invalida:

credencial antigua
+
JWT emitidos previamente

por la revalidación del middleware.

Backups

Identificadores distintos:

backup.backup_id
→ UUID contenido en manifest

backup.public_id
→ ID público generado por servidor

No usarlos indistintamente.

────────

40. Auditoría

Se registran acciones relevantes, entre ellas:

backup.create
backup.download
backup.delete
retention_delete

No crear auditorías duplicadas en reintentos idempotentes.

El upload idempotente con created = false no debe registrar una segunda creación.

────────

41. Errores remotos que el Client ya normaliza

401 → unauthorized
403 → forbidden
404 → not-found
409 → conflict
413 → too-large
422 → invalid-backup
408/425/429/5xx → temporary
JSON inválido → invalid-response
otros → unexpected

La UI futura debe traducirlos a mensajes claros, pero no esconder el tipo técnico dentro de la capa de infraestructura.

────────

42. Importante sobre fechas

La respuesta remota de backups contiene actualmente fechas como:

createdAtClient = "2026-10-05 07:18:39"

La UI actual convierte ese formato a UTC antes de formatearlo:

YYYY-MM-DD HH:mm:ss
→ YYYY-MM-DDTHH:mm:ssZ

No asumir que ya es ISO canónico sin revisar el contrato del API si se modifica.

────────

43. Notas de implementación que no deben perderse

Upload

No cargar 8 GiB en memoria.

Download

No usar arrayBuffer() para el fichero completo.

Secret

Nunca trim().

TPV Backup key

Nunca trim() ni normalizar.

Key ID

Puede normalizarse con trim() en capa de aplicación.

JWT

No persistir.

Renderer

No exponer:

secret almacenado
JWT

Restore

No permitir sobre instalación ya configurada.

────────

44. Reglas de seguridad para logs

No registrar:

TPV Backup key
Secret remoto
JWT
secretApi
emailSmtpPass
ticketBaiToken
KEK
DEK
payload descifrado

Sí pueden registrarse de forma sanitizada:

backup public id
backupId
installation public id
operación
status
bytes
duración
error técnico no sensible

────────

45. Estado del exportador legacy TPV-API

El exportador viejo sigue generando migraciones legacy.

Decisión ya aplicada:

flag empleados
→ ignorado
→ no se exporta

Los .otpv legacy pueden aportar:

backupApiKey

pero no las nuevas credenciales remotas.

No modificar esa realidad inventando campos retroactivos.

────────

46. Regla de empleados definitiva

No está relacionada con TPV Backup, pero sigue siendo contexto estructural importante.

0 empleados
→ no venta

1 empleado
→ asignación automática

2+ empleados
→ selector dentro de la venta

El flag legacy empleados no se usa.

────────

47. Permisos relevantes

Permiso específico:

gestion.copias_seguridad

La pantalla Gestión → Copias de seguridad sigue protegida por el sistema normal de permisos.

No introducir bypass específico para TPV Backup.

────────

48. TicketBAI

SDK:

@osumi/ticketbaiws

Estado:

1.0.x publicado

El bloque pendiente sigue esperando respuesta/actualización de Berein.

No mezclar TicketBAI con Hito 21.

────────

49. Qué NO hacer al continuar

No:

• crear schema 2 de secretos portables antes de producción sin necesidad real;
• meter Key ID + Secret en InstallationSecretsData;
• meter TPV Backup key dentro del .otpv;
• persistir JWT;
• enviar TPV Backup key al API;
• cargar backups completos en memoria para upload/download;
• crear un restore remoto alternativo;
• reutilizar APIs legacy;
• exponer secretos desde IPC hacia Renderer;
• modificar repositorios desde GitHub;
• saltarse la revisión de main después de un push.

────────

50. Checklist al abrir una conversación nueva

Antes del siguiente patch:

[ ] revisar main de Osumi-TPV-Client
[ ] confirmar HEAD posterior a d62ab886 si ha cambiado
[ ] revisar HttpBackupRemoteClient
[ ] revisar BackupRemoteService
[ ] revisar BackupService.createLocal()
[ ] revisar BackupCreateResult
[ ] revisar ApplicationPaths.backupsDirectory
[ ] revisar versión Node/Electron y soporte real de subida de fichero
[ ] diseñar upload streaming sin cargar `.otpv` completo en RAM
[ ] mantener API URL actual salvo decisión explícita

────────

51. Prompt recomendado de reanudación

Quiero continuar el Hito 21 de Osumi TPV Client.

Usa como referencia principal:

docs/osumi-tpv-continuidad-v2.86.md

Estado:
- 21.1 `.otpv` v3 ✅
- 21.2 exportador nativo ✅
- 21.3 restauración nativa ✅
- 21.4 nueva app TPV Backup ✅
- 21.5 API remota ✅
- 21.6 integración Client ↔ Backup ▶️

Dentro de 21.6 ya están:
- autenticación Key ID + Secret;
- almacenamiento seguro;
- JWT solo en memoria;
- IPC seguro;
- configuración durante instalación;
- listado remoto en Gestión → Copias de seguridad;
- suscripción active/expired;
- Key ID + Secret dentro del payload cifrado `.otpv`;
- restauración automática de esas credenciales;
- aviso para imports legacy;
- recuperación de credenciales huérfanas ante instalación interrumpida.

Último Client HEAD de referencia:
d62ab8864f40d57d2b0d3884af15145027e5ccef

Siguiente bloque:
21.6.5 — crear/subir una copia remota desde el Client.

Antes de proponer código:
1. revisa el main actual;
2. lee los archivos exactos implicados;
3. no cargues `.otpv` completos en memoria;
4. conserva TPV Backup key y Secret exactamente;
5. no expongas JWT ni Secret al Renderer;
6. trabaja en bloques pequeños y verificables;
7. después de cada push, vuelve a revisar main.

────────

52. Resumen ejecutivo

Estado ya cerrado:

`.otpv` v3                         ✅
AES-256-GCM + scrypt               ✅
DEK/KEK                            ✅
snapshot SQLite                    ✅
backup local                       ✅
restore local                      ✅
TPV Backup Front                   ✅
TPV Backup API                     ✅
auth instalación                   ✅
upload/list/download/delete API    ✅
retención/auditoría API            ✅
credencial remota segura Client    ✅
listado remoto Client              ✅
onboarding TPV Backup              ✅
credencial remota portable cifrada ✅
restore credencial remota          ✅
legacy warning                     ✅
crash recovery credencial          ✅

Pendiente inmediato:

Client upload remoto

Después:

Client download remoto
Client delete remoto
restore desde remoto
UX final
regresión A → servidor → B

La arquitectura crítica queda:

TPV Backup key
→ secreto criptográfico
→ nunca servidor
→ nunca dentro del `.otpv`

Key ID + Secret
→ autenticación remota
→ safeStorage local
→ también dentro del payload cifrado del `.otpv`
→ restaurables en otra máquina

JWT
→ solo memoria

TPV Backup API
→ custodia blobs cifrados
→ no puede descifrarlos

────────

Fin del documento de continuidad v2.86