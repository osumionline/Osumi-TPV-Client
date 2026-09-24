# TPV Backup — Documento técnico de arranque y continuidad

**Versión:** 1.0  
**Fecha:** 25 de septiembre de 2026  
**Objetivo:** servir como contexto autosuficiente para iniciar una conversación independiente dedicada a la nueva aplicación **TPV Backup**.

---

# 1. Propósito de este documento

Este documento reúne el contexto técnico necesario para diseñar y desarrollar la nueva aplicación **TPV Backup** sin depender de la conversación donde se ha desarrollado **Osumi TPV Client**.

Debe utilizarse como punto de partida junto con el estado real de los repositorios.

La fuente de verdad al comenzar la nueva conversación será:

```text
main de los repositorios implicados
+
este documento
+
las decisiones que se vayan cerrando en la nueva conversación
```

Antes de proponer código:

1. revisar siempre el `main` actual del repositorio que se vaya a modificar;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, modelos, campos, contratos ni APIs;
4. usar los repositorios legacy solo como referencia funcional;
5. distinguir siempre:
   - comportamiento heredado;
   - decisiones ya cerradas;
   - decisiones nuevas aún pendientes.

---

# 2. Estado global del Hito 21

El Hito 21 tiene como objetivo construir el sistema completo de copia y recuperación de Osumi TPV.

Estado actual:

```text
Hito 21 — TPV Backup

21.1  Especificación `.otpv` v3                  ✅ CERRADO
21.2  Exportador nativo Osumi TPV Client          ✅ CERRADO
21.3  Restauración nativa `.otpv` v3              ✅ CERRADO
MANT  Vitest 4 → 5                                ✅ CERRADO

21.4  Nueva aplicación TPV Backup                 ▶️ SIGUIENTE
21.5  API remota                                  ⏳
21.6  Integración Client ↔ TPV Backup             ⏳
21.7  Seguridad / integridad / retención          ⏳
21.8  Regresión global de recuperación            ⏳
```

La nueva conversación debe comenzar por:

```text
21.4 — Nueva aplicación TPV Backup
```

No mezclar prematuramente 21.5/21.6 con 21.4 salvo que una decisión de arquitectura necesite dejar preparado un contrato.

---

# 3. Estado actual de Osumi TPV Client

Repositorio:

```text
https://github.com/osumionline/Osumi-TPV-Client
```

Último `main` verificado al preparar este documento:

```text
796626f4331c0589300b2664d790b09936938909
Actualizo a Vitest 5.0.1
```

Estado tecnológico relevante:

```text
Angular                 22.2.x
Electron                44.x
TypeScript              6.0.x
Vitest                  5.0.1
Vite                    8.3.x
SQLite                  better-sqlite3
ORM                     TypeORM
DATABASE_SCHEMA_VERSION 1
```

La migración:

```text
Vitest 4.1.11
→
Vitest 5.0.1
```

se realizó sin incidencias y toda la batería de tests pasó.

---

# 4. Repositorios de referencia

## Client actual

```text
https://github.com/osumionline/Osumi-TPV-Client
```

Es la referencia autoritativa para:

- `.otpv` v3;
- exportación;
- restauración;
- TPV Backup key;
- contratos actuales;
- futura integración remota.

## TPV Backup legacy

```text
https://github.com/osumionline/Backup-TPV
```

Último estado legacy estudiado:

```text
d59b0332d60b07ebec48b2a7de5197fd82b48772
Actualizo OFW (8.2.6 -> 8.2.8)
```

Sirve como referencia funcional.

**No debe copiarse su arquitectura ni sus decisiones de seguridad.**

## TPV/API legacy

```text
https://github.com/osumionline/TPV-API
```

Último estado estudiado:

```text
947e6ff18ee3275e2a193271994f46303241ddde
Quito campo empleados de export
```

Contiene, entre otras cosas:

```text
src/Task/BackupAppTask.php
```

que muestra cómo el TPV antiguo generaba y enviaba backups al servicio legacy.

## TPV frontend legacy

```text
https://github.com/osumionline/Osumi-TPV
```

Sirve para estudiar la experiencia de usuario antigua de:

- listar backups;
- crear nueva copia;
- eliminar;
- futuro flujo de carga.

## Osumi Framework actual

Repositorio actual:

```text
https://github.com/osumionline/framework
```

Último `main` verificado:

```text
6fe2cc2326204d41fec5f3006eed7b38404f6d2d
9.8.3
```

Requisitos declarados por OFW 9.8.3:

```text
PHP >= 8.2
ext-json
```

Documentación:

```text
https://framework.osumi.dev
```

Creación recomendada de nuevas aplicaciones:

```bash
composer create-project osumionline/new
```

Importante:

> El esqueleto `osumionline/new` y el framework pueden estar en versiones distintas. Al arrancar TPV Backup hay que consultar `main` y las versiones publicadas en ese momento, no fijarse ciegamente en versiones de este documento.

No asumir características planeadas para versiones futuras de OFW hasta comprobar que han aterrizado realmente.

---

# 5. Forma de trabajo acordada

El usuario quiere desarrollo incremental y verificable.

Cada bloque debe ser:

```text
pequeño
+
coherente
+
autocontenido
+
verificable
```

No significa “un archivo por mensaje”.

Reglas:

- varios archivos relacionados pueden formar una única unidad;
- evitar lotes enormes;
- evitar fragmentación artificial;
- no continuar con errores;
- tras cada push confirmado volver a leer `main`;
- GitHub se usa estrictamente en modo lectura;
- el usuario aplica localmente los cambios, prueba y hace push.

Para archivos nuevos:

> proporcionar contenido completo.

Para archivos existentes:

> proporcionar reemplazos exactos con contexto suficiente.

---

# 6. Qué es `.otpv` v3

`.otpv` v3 es el formato canónico de backup/restauración de Osumi TPV Client.

Semántica:

```text
v2
→ exportación/migración del TPV antiguo

v3
→ backup/restauración nativa de Osumi TPV Client
```

No reinterpretar nunca silenciosamente un formato como el otro.

La especificación autoritativa está en:

```text
Osumi-TPV-Client/docs/osumi-tpv-backup-v3.md
```

TPV Backup debe tratar `.otpv` v3 como el artefacto que custodia.

---

# 7. Flujo global objetivo

El sistema completo debe quedar:

```text
Osumi TPV Client A
        │
        │ crea `.otpv` v3 cifrado
        ▼
TPV Backup
        │
        │ custodia blob cifrado
        │ lista / descarga / elimina
        ▼
Osumi TPV Client B limpio
        │
        │ obtiene `.otpv`
        ▼
restauración nativa v3
        │
        ▼
instalación B funcional
```

La regresión local:

```text
Client A
→ `.otpv`
→ Client B limpio
```

ya se ha realizado con éxito.

La futura regresión 21.8 añadirá el salto remoto:

```text
Client A
→ `.otpv`
→ TPV Backup remoto
→ descarga
→ Client B
→ restauración
```

---

# 8. Principio fundamental del nuevo TPV Backup

TPV Backup debe ser esencialmente:

> un custodio de blobs `.otpv` cifrados.

Responsabilidades:

```text
autenticar al Client
recibir `.otpv`
almacenar
listar
descargar
eliminar
aplicar retención
registrar/auditar operaciones relevantes
```

No debe necesitar:

```text
descifrar payload.enc
leer la SQLite
leer secretos portables
conocer la configuración del negocio
conocer la TPV Backup key
conocer la KEK
conocer la DEK en claro
```

Principio de diseño:

> Una filtración de TPV Backup no debe proporcionar material suficiente para descifrar los `.otpv` almacenados.

---

# 9. Contenedor exterior `.otpv` v3

Un `.otpv` v3 es un ZIP exterior que contiene exactamente:

```text
manifest.json
payload.enc
```

`payload.enc` es el ZIP interior completo cifrado mediante AES-256-GCM.

El servidor remoto no debe necesitar descomprimir `payload.enc`.

---

# 10. Contenido lógico cifrado

El ZIP interior contiene:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
files/**
```

No contiene:

```text
printing_settings.json
logs/
backups/
staging/
safeStorage original de Electron
backupApiKey
```

Este contenido está cifrado y es responsabilidad exclusiva del Client.

TPV Backup no debe interpretarlo.

---

# 11. Criptografía ya cerrada en el Client

Secreto maestro:

```text
backupApiKey
```

También llamado en UI:

```text
TPV Backup key
```

Reglas cerradas:

- nunca se incluye en el `.otpv`;
- nunca se usa directamente como clave AES;
- se trata como secreto opaco;
- se usan sus bytes UTF-8 exactos;
- no se aplica `trim`;
- no se normaliza.

KDF del backup:

```text
scrypt
salt aleatorio       32 bytes
cost                  32768
blockSize             8
parallelization       3
length                32
```

Suite:

```text
otpv3-scrypt-aes-256-gcm
```

Esquema:

```text
backupApiKey
    │
    │ scrypt
    ▼
KEK
    │
    │ AES-256-GCM
    ▼
DEK aleatoria
    │
    │ AES-256-GCM
    ▼
payload.enc
```

La DEK es distinta para cada backup.

---

# 12. Invariante de seguridad para TPV Backup

**TPV Backup nunca debe recibir `backupApiKey` en claro.**

Tampoco debe recibir:

```text
KEK del backup
DEK en claro
```

La futura autenticación remota debe utilizar material **separado** del material criptográfico que protege el `.otpv`.

No reutilizar la KEK del backup como credencial HTTP.

No diseñar:

```text
Authorization = backupApiKey
```

sin una decisión explícita que invalide este principio.

La derivación/autenticación remota todavía debe diseñarse en 21.4–21.7.

---

# 13. Límites cerrados de `.otpv` v3

Contrato actual:

```text
Tamaño máximo `.otpv`                 8 GiB
Tamaño máximo manifest.json          64 KiB
Ficheros regulares ZIP exterior       2
Entradas ZIP interior             50.000
Máximo por entrada interior           2 GiB
Máximo total interior                16 GiB
Longitud máxima ruta              1.024 caracteres
```

Límites semánticos internos:

```text
app_data.json          16 MiB
secrets.json            1 MiB
logo.webp               5 MiB
logo                  4096 × 4096
```

Para TPV Backup remoto, el límite exterior de:

```text
8 GiB
```

debe tenerse en cuenta desde:

- servidor HTTP/reverse proxy;
- PHP;
- temporales de upload;
- filesystem;
- lógica de aplicación;
- posibles cuotas.

No cargar un `.otpv` completo en memoria.

---

# 14. Manifest v3

Campos principales:

```text
formatVersion
application
applicationVersion
databaseSchemaVersion
backupId
createdAt
cryptoSuite
authenticatedData
kdf
keyWrap
payload
```

Actualmente:

```text
formatVersion = 3
application = Osumi TPV Client
```

`backupId` es UUID v4 y es único por copia.

`createdAt` es UTC ISO 8601.

Importante para TPV Backup:

> No está cerrado todavía si el servidor debe parsear `manifest.json` o si debe permanecer completamente agnóstico y recibir los metadatos de listado como campos autenticados/separados del upload.

Ambas estrategias deben estudiarse antes de cerrar el modelo remoto.

El servidor **no necesita** leer el manifest para descifrar nada.

---

# 15. Qué ya hace el Client localmente

La pantalla actual:

```text
Gestión
→ Copias de seguridad
```

puede crear una copia local.

El resultado devuelve:

```text
backupId
createdAt
fileName
sizeBytes
```

`BackupService.createLocal()`:

1. carga `backupApiKey` desde `SecretStorage`;
2. genera un `.otpv` v3 completo;
3. lo guarda en:
   ```text
   app.getPath('userData') / osumi-tpv / backups
   ```
4. devuelve los metadatos básicos.

Todavía no existe integración HTTP con TPV Backup nuevo.

---

# 16. Restauración nativa ya terminada

La restauración v3 en Osumi TPV Client está cerrada.

Flujo:

```text
seleccionar `.otpv`
↓
detectar v2/v3
↓
validar manifest
↓
obtener TPV Backup key externamente
↓
derivar KEK
↓
autenticar DEK
↓
descifrar payload
↓
validar ZIP interior
↓
validar SQLite/config/logo/secretos/files
↓
reconstruir safeStorage local
↓
preparar staging
↓
promoción final
↓
instalación restaurada
```

Se probó funcionalmente:

```text
instalación A
→ backup `.otpv`
→ instalación B limpia
→ restauración correcta
```

Por tanto, TPV Backup remoto no debe inventar otro formato de restauración.

Su misión es devolver el `.otpv` original intacto.

---

# 17. `printing_settings.json`

No forma parte del backup portable.

En una restauración:

```text
ticketPrinterDeviceName = null
```

Esto no afecta directamente al servicio remoto, pero es una decisión cerrada del ecosistema.

---

# 18. Comportamiento funcional del TPV Backup legacy

El TPV Backup antiguo modela:

```text
User
Subscription
Account
Backup
```

Relaciones:

```text
Subscription
    └── Account[]
            └── Backup[]
```

`User`:

```text
usuario administrador del panel
```

`Subscription`:

```text
name
api_key
expires_at
```

`Account`:

```text
id_subscription
name
last_copy_at
```

`Backup`:

```text
id_account
created_at
```

El fichero físico legacy se guardaba como:

```text
<backup-id>.sql
```

fuera del modelo.

---

# 19. Funcionalidad legacy de administración

El panel antiguo permite:

```text
login administrador
↓
listar suscripciones
↓
ver una suscripción
↓
crear/eliminar cuentas
↓
ver una cuenta
↓
listar backups
↓
eliminar backups
```

También permite:

```text
crear suscripción
eliminar suscripción
```

La suscripción muestra su API key y fecha de expiración.

La nueva aplicación debería conservar conceptualmente la capacidad de administrar:

```text
suscripciones/clientes
cuentas/instalaciones
copias
caducidad/estado
```

pero no necesariamente los mismos nombres, tablas ni UX.

---

# 20. API legacy

Rutas principales:

```text
/api/save-backup
/api/get-backups
/api/get-backup
/api/delete-account-backup
```

Además existe:

```text
/api/delete-backup
```

para uso administrativo.

## Upload legacy

Recibe:

```text
api_key
id_account
file
```

Proceso:

1. localizar `Subscription` por `api_key`;
2. localizar `Account` por id;
3. comprobar pertenencia;
4. comprobar retención;
5. crear `Backup`;
6. mover fichero subido;
7. actualizar `last_copy_at`.

## Listado legacy

Recibe:

```text
api_key
```

Devuelve todas las copias de todas las cuentas de la suscripción, ordenadas por fecha descendente.

## Descarga legacy

Recibe:

```text
api_key
id
```

Comprueba que el backup pertenece a una cuenta de la suscripción y hace streaming del fichero.

## Borrado desde TPV

Recibe:

```text
api_key
id
```

y elimina registro + archivo.

---

# 21. Retención legacy

Configuración histórica:

```text
max_backups = 6
```

Al subir una nueva copia:

```text
si numBackups == max_backups
→ borrar la copia más antigua
→ guardar la nueva
```

Este comportamiento es una **referencia funcional**, no una decisión cerrada para el nuevo sistema.

Problemas del enfoque antiguo:

- la comprobación `==` no cubre estados `> max`;
- no está diseñada para concurrencia;
- no hay transacción lógica fichero + DB;
- el borrado ocurre antes de asegurar que la nueva subida termine bien.

La nueva retención debe diseñarse explícitamente.

---

# 22. TPV legacy como cliente de Backup-TPV

El TPV antiguo enviaba:

```text
api_key
id_account
file
```

mediante multipart/form-data.

El TPV antiguo:

- generaba un dump SQL;
- lo cifraba localmente;
- enviaba el fichero cifrado;
- listaba copias desde el servidor;
- permitía eliminarlas.

En el frontend legacy había acciones:

```text
Crear nueva copia
Eliminar
Cargar
```

La acción “Cargar” no estaba terminada en esa UI.

El nuevo Client ya tiene una restauración real y segura, por lo que el flujo nuevo debe aprovecharla.

---

# 23. Problemas del sistema legacy que NO deben copiarse

La auditoría del repositorio antiguo muestra varias decisiones que no deben trasladarse al nuevo TPV Backup.

## Credencial

Legacy:

```text
api_key en claro
guardada en BD
enviada como parámetro de request
visible en panel
```

Nuevo sistema:

> definir autenticación moderna y separada de `backupApiKey`.

## Configuración sensible

El repositorio legacy contiene configuración sensible hardcodeada.

Nuevo sistema:

> secretos y credenciales nunca deben quedar comprometidos en el repositorio.

Usar configuración externa adecuada al despliegue.

## API sin versionar

Legacy:

```text
/api/save-backup
```

Nuevo:

> usar contrato versionado.

Ejemplo conceptual, no cerrado:

```text
/api/v1/...
```

## Status genérico

Legacy suele devolver:

```json
{
  "status": "ok"
}
```

o:

```json
{
  "status": "error"
}
```

Nuevo:

> usar HTTP status codes coherentes y DTOs de error tipados.

## Upload

El legacy no tiene un tratamiento robusto visible de:

- tamaño máximo;
- almacenamiento temporal;
- fallo de `move_uploaded_file`;
- integridad entre fila DB y fichero;
- concurrencia;
- cuotas;
- tipo real de fichero.

## Descarga

Legacy responde como:

```text
application/sql
```

El nuevo artefacto es `.otpv`.

No conservar ese content type.

## Autorización

El legacy basa gran parte de la autorización en:

```text
subscription.api_key
+
id_account
```

El nuevo modelo debe cerrar expresamente el scope de las credenciales.

## Auditoría / rate limiting

No hay arquitectura moderna explícita para:

```text
rate limiting
audit log
detección de abuso
cuotas
```

Deben contemplarse en 21.7 y, cuando afecten al modelo, prepararse desde 21.4.

---

# 24. Decisiones ya cerradas para la nueva aplicación

Estas decisiones no deben reabrirse sin una razón fuerte.

## D1 — Artefacto

```text
`.otpv` v3
```

es el artefacto de custodia.

## D2 — Zero-knowledge funcional

TPV Backup no debe necesitar conocer el contenido funcional cifrado.

## D3 — Backup key

El servicio remoto:

```text
NO recibe backupApiKey en claro
NO almacena backupApiKey
NO conoce KEK
NO conoce DEK
```

## D4 — Restauración

La restauración ocurre en:

```text
Osumi TPV Client
```

no en el servidor.

## D5 — Preservación

Una descarga debe devolver el blob `.otpv` original íntegro.

## D6 — Formato

TPV Backup no sustituye ni modifica el formato v3.

---

# 25. Decisiones todavía ABIERTAS

Estas decisiones deben cerrarse en la nueva conversación antes de codificar las capas que dependan de ellas.

## A1 — Stack exacto de la nueva aplicación

Dirección natural:

```text
Osumi Framework 9.x
PHP >= 8.2
MariaDB
```

pero hay que confirmarlo explícitamente al arrancar.

El legacy era OFW 8.x.

No copiar la estructura OFW8.

## A2 — Alcance exacto de 21.4 frente a 21.5

Separación prevista:

```text
21.4
→ aplicación, dominio, administración, almacenamiento

21.5
→ API remota versionada para el Client
```

Debe decidirse qué contratos mínimos dejar definidos ya en 21.4.

## A3 — Modelo tenancy

El legacy tiene:

```text
Subscription
→ Account[]
```

Hay que decidir si mantener esa semántica o renombrarla.

Preguntas:

- ¿una suscripción representa un cliente?
- ¿una cuenta representa un TPV/instalación?
- ¿puede una suscripción tener varias instalaciones?
- ¿la facturación futura depende de este modelo?

## A4 — Scope de credenciales

Legacy:

```text
una api_key por Subscription
+
id_account en cada upload
```

Opciones a estudiar:

```text
credencial por suscripción
credencial por cuenta/instalación
credencial principal + credenciales derivadas
```

No decidir por inercia.

## A5 — Autenticación remota

Debe ser independiente de la KEK.

Hay que decidir:

- formato de credencial;
- derivación;
- cómo se provisiona;
- cómo se almacena en Client;
- cómo se rota;
- cómo se revoca;
- si se firma cada request;
- protección frente a replay;
- timestamps/nonces/request IDs.

## A6 — Metadatos remotos

Decidir si TPV Backup:

### opción A
parsea únicamente `manifest.json`;

o:

### opción B
es completamente opaco y recibe metadatos separados.

Posibles metadatos útiles:

```text
backupId
createdAt
sizeBytes
applicationVersion
databaseSchemaVersion
formatVersion
```

No asumir todavía que todos deben persistirse.

## A7 — Identidad del backup remoto

Elegir entre:

```text
id DB interno
UUID remoto
backupId del manifest
storage key independiente
```

Es probable que haya más de uno con funciones diferentes.

## A8 — Política de retención

Referencia legacy:

```text
6 copias
```

Pendiente:

- límite fijo o configurable;
- por cuenta o por suscripción;
- por número o almacenamiento;
- orden exacto;
- qué ocurre si falla la nueva subida;
- concurrencia;
- backups protegidos/manuales en el futuro.

## A9 — Cuotas

Pendiente:

```text
número máximo
bytes máximos
tamaño máximo por upload
```

El formato v3 ya limita el fichero a 8 GiB.

## A10 — Storage físico

Pendiente decidir:

```text
filesystem local
object storage
abstracción intercambiable
```

Aunque se empiece con disco local:

> conviene aislar el almacenamiento detrás de un servicio/contrato.

## A11 — Administración

Hay que cerrar qué necesita el panel:

- login;
- usuarios administradores;
- suscripciones;
- cuentas;
- expiraciones;
- credenciales;
- estado última copia;
- backups;
- tamaño ocupado;
- descarga administrativa;
- borrado;
- auditoría.

## A12 — Dominio/deploy

El legacy usa:

```text
tpvbackup.osumi.dev
```

No asumir que el nuevo despliegue usará exactamente la misma configuración.

---

# 26. Requisitos de seguridad del nuevo servicio

## Transporte

```text
HTTPS obligatorio
```

## Master key

Nunca enviar:

```text
backupApiKey
```

al servidor.

## Autenticación

No enviar credenciales de alto valor en query strings.

Preferir headers/autenticación explícita.

## Almacenamiento de credenciales

No guardar tokens reutilizables en claro si se puede verificar mediante hash/derivación.

## Comparaciones

Usar comparación segura cuando corresponda.

## Autorización

Toda operación debe comprobar pertenencia:

```text
caller
→ subscription/account
→ backup
```

Nunca confiar en un `id` enviado por el cliente sin verificar ownership.

## Upload streaming

No leer el `.otpv` completo en RAM.

Usar streaming/temporales seguros.

## Temporal

Subida conceptual:

```text
request
↓
temporary file
↓
validaciones permitidas
↓
storage final atómico
↓
fila DB confirmada
```

El orden definitivo debe diseñarse para poder recuperar fallos.

## Storage

Los backups no deben estar directamente publicados por el webroot.

La descarga debe pasar por autorización.

## Nombres

No confiar en el filename aportado por el Client como ruta física.

Usar un storage key generado internamente.

## Path traversal

No usar nombres externos directamente para construir rutas.

## Rate limiting

Debe formar parte de 21.7.

## Auditoría

Registrar al menos operaciones sensibles:

```text
upload
download
delete
credential rotation/revocation
admin destructive actions
```

No registrar secretos.

## Administración web

Necesita protección independiente:

```text
sesión segura
password hashing
CSRF cuando proceda
cookies seguras
autorización de administración
```

---

# 27. Requisitos de robustez de filesystem

El servicio debe contemplar inconsistencias entre:

```text
base de datos
filesystem/object storage
```

Casos:

- DB creada pero fichero ausente;
- fichero escrito pero DB no confirmada;
- upload interrumpido;
- borrado DB falla;
- borrado físico falla;
- retención concurrente;
- dos uploads simultáneos para la misma cuenta.

No implementar lógica destructiva sin definir recuperación.

---

# 28. Estrategia recomendada de almacenamiento

No es una decisión cerrada, pero una arquitectura razonable para discutir es:

```text
BackupStorage
    save()
    open/read()
    delete()
    exists()
    size()
```

con una primera implementación:

```text
FileBackupStorage
```

Esto permitiría cambiar en el futuro a:

```text
S3
compatible object storage
NAS
otro backend
```

sin acoplar modelos/acciones HTTP al filesystem.

Debe discutirse antes de codificar.

---

# 29. Modelo de datos — referencia, NO contrato cerrado

Punto de partida conceptual derivado del legacy:

```text
AdminUser
Subscription
Account
Backup
```

Posible información de `Backup` a estudiar:

```text
id
public_id
id_account
backup_id
storage_key
original_filename
size_bytes
created_at
```

Metadatos opcionales a estudiar:

```text
format_version
application_version
database_schema_version
client_created_at
```

No crear estos campos automáticamente.

Primero decidir qué información necesita realmente:

- panel;
- Client;
- retención;
- auditoría;
- compatibilidad.

---

# 30. API remota futura — operaciones necesarias

21.5 debe cubrir como mínimo las operaciones funcionales:

```text
upload
list
download
delete
```

Además probablemente:

```text
health/version
account/subscription status
quota/retention info
```

pero esto no está cerrado.

El Client debe poder obtener:

```text
estado de última copia
```

según el plan general de 21.6.

No fijar rutas finales antes de diseñar autenticación y tenancy.

---

# 31. Convenciones deseables para la API nueva

Frente al API legacy:

```text
POST /api/save-backup
```

el sistema nuevo debe valorar un API versionado y semántico.

Ejemplo puramente orientativo:

```text
POST   /api/v1/backups
GET    /api/v1/backups
GET    /api/v1/backups/{id}/content
DELETE /api/v1/backups/{id}
```

**Estas rutas no están aprobadas.**

Solo ilustran el tipo de diseño que debe evaluarse.

La respuesta debe usar:

```text
HTTP status real
+
DTO estructurado
```

No limitarse a:

```text
status = ok/error
```

---

# 32. Subida de ficheros grandes

El máximo de `.otpv` es:

```text
8 GiB
```

Por tanto revisar en despliegue:

```text
Nginx / Apache / proxy
PHP upload_max_filesize
PHP post_max_size
timeouts
temporary directory
disk capacity
filesystem limits
```

En el código:

- streaming;
- no `file_get_contents()` de todo el backup;
- no Base64 del fichero;
- evitar copias temporales innecesarias;
- comprobar bytes realmente recibidos;
- limpiar temporales en error.

---

# 33. Integridad remota

El servidor no dispone de la TPV Backup key.

Por tanto no puede verificar el GCM del payload.

Sí puede, si se decide:

- comprobar tamaño;
- comprobar que el upload finalizó;
- calcular un hash del blob cifrado para detectar corrupción de almacenamiento;
- conservar el hash como integridad de transporte/storage.

Esto es distinto de la autenticidad criptográfica interna del `.otpv`.

Pendiente decidir si almacenar:

```text
SHA-256 del `.otpv` completo
```

o equivalente.

No confundir:

```text
hash de almacenamiento
≠
autenticación AES-GCM del contenido
```

---

# 34. Metadatos del Client que pueden ser útiles remotamente

`BackupCreateResult` actual expone:

```text
backupId
createdAt
fileName
sizeBytes
```

El manifest contiene también:

```text
applicationVersion
databaseSchemaVersion
formatVersion
```

Para listado remoto puede interesar:

```text
fecha
tamaño
backupId
versión
```

Pero debe decidirse cuál es la fuente:

```text
manifest
vs
request metadata
vs
registro generado por servidor
```

---

# 35. Integración futura con Osumi TPV Client

La pantalla actual de Client solo soporta:

```text
Nueva copia local
```

Futuro 21.6:

```text
crear backup
subir
listar remoto
descargar
eliminar
mostrar estado última copia
```

El Client ya tiene:

```text
gestion.copias_seguridad
```

como permiso específico para Copias de seguridad.

No introducir bypasses distintos sin revisar el modelo de permisos existente.

---

# 36. Descarga y restauración futura

Una descarga remota debe producir localmente:

```text
el mismo `.otpv`
```

Después debe reutilizarse la restauración v3 ya implementada.

No crear un “restore remoto” alternativo.

Flujo deseado:

```text
remote backup
↓
download
↓
`.otpv` local/temporal
↓
pipeline de restore v3 existente
```

Pendiente decidir dónde se guarda la descarga:

```text
backups/
staging/
otro temporal
```

y su política de limpieza.

---

# 37. Eliminación remota

El borrado debe ser:

```text
autorizado
auditable
consistente
```

Definir qué significa éxito si:

- DB se elimina pero storage falla;
- storage se elimina pero DB falla.

Valorar:

```text
soft delete
estado deleting
job de reconciliación
```

según complejidad necesaria.

No copiar simplemente:

```text
unlink()
+
delete()
```

sin estrategia de recuperación.

---

# 38. Expiración de suscripción

Legacy tiene:

```text
expires_at
```

con `null`:

```text
Nunca
```

La semántica nueva está abierta.

Hay que decidir:

- qué operaciones bloquea una suscripción expirada;
- si permite descargar backups existentes;
- si permite borrar;
- si bloquea solo nuevos uploads;
- grace period;
- administración.

Una política razonable debe preservar recuperación de datos y evitar dejar al usuario sin acceso accidentalmente.

No decidir implícitamente.

---

# 39. “Última copia”

Legacy mantiene:

```text
account.last_copy_at
```

El Client futuro necesita mostrar estado de última copia.

Hay que decidir si:

```text
last_copy_at
```

se persiste como dato desnormalizado

o se calcula desde:

```text
MAX(backup.created_at)
```

Considerar coste, consistencia y UX.

---

# 40. Administración: capacidades mínimas a estudiar

Panel administrativo probable:

```text
Login
Dashboard

Suscripciones
  listar
  crear
  ver
  editar
  expirar/reactivar
  eliminar

Cuentas
  listar
  crear
  ver
  editar
  revocar/regenerar credencial
  eliminar

Backups
  listar
  metadatos
  tamaño
  descargar
  eliminar

Auditoría
  operaciones críticas
```

No todo tiene que entrar necesariamente en 21.4.

Cerrar alcance antes de implementar.

---

# 41. OFW: recomendaciones para el nuevo proyecto

Si se confirma Osumi Framework:

1. crear proyecto desde el skeleton oficial actual;
2. actualizar/confirmar framework compatible;
3. no partir del código OFW8 legacy;
4. usar namespaces/estructura actual;
5. usar DTOs actuales cuando correspondan;
6. consultar documentación actual antes de diseñar routing, middleware, modelos o servicios;
7. no asumir todavía el sistema de middlewares previsto para OFW 9.9 si no ha aterrizado.

Referencia actual comprobada:

```text
framework 9.8.3
PHP >= 8.2
```

---

# 42. Base de datos

Legacy usa una base SQL con:

```text
user
subscription
account
backup
```

La nueva aplicación probablemente usará MariaDB, pero debe confirmarse al comenzar.

Antes de crear esquema:

- cerrar tenancy;
- cerrar credenciales;
- cerrar IDs públicos;
- cerrar retención;
- cerrar metadatos de backup;
- cerrar auditoría mínima.

No diseñar tablas únicamente copiando los cuatro modelos legacy.

---

# 43. IDs públicos

No exponer necesariamente IDs autoincrementales internos en el API.

Valorar:

```text
UUID
ULID
otro public_id
```

especialmente para:

```text
account
backup
```

`backupId` ya existe dentro del formato v3 como UUID v4.

Debe decidirse si puede actuar como identificador público remoto o si el servidor necesita uno propio.

---

# 44. Nombres de ficheros

El Client local genera nombres del estilo:

```text
osumi-tpv-backup-<timestamp>-<uuid>.otpv
```

El servidor:

- puede conservar ese nombre como metadato;
- no debe usarlo como clave física confiable;
- debe generar una ruta/storage key segura.

La descarga puede reconstruir un nombre amigable mediante `Content-Disposition`.

---

# 45. Content-Type

El legacy usa:

```text
application/sql
```

Eso ya no aplica.

Para `.otpv` estudiar:

```text
application/octet-stream
```

o un MIME propio si se decide formalizarlo.

No bloquear el desarrollo por este detalle; cerrarlo con el contrato HTTP.

---

# 46. Logging

No registrar:

```text
backupApiKey
credencial remota completa
KEK
DEK
contenido de secrets
payload descifrado
```

Logs útiles:

```text
request id
account/public id
backup/public id
operación
resultado
bytes
duración
error técnico sanitizado
```

---

# 47. Errores

Distinguir:

```text
401 no autenticado
403 no autorizado
404 recurso no existente/no visible
409 conflicto
413 payload demasiado grande
422 petición/metadatos inválidos
429 rate limited
5xx fallo interno/storage
```

El contrato exacto se cerrará en 21.5.

No devolver detalles internos de filesystem o credenciales.

---

# 48. Concurrencia

Casos que deben probarse:

```text
dos uploads simultáneos misma cuenta
upload mientras se aplica retención
delete mientras download
delete repetido
upload interrumpido
reintento del mismo backupId
```

Debe definirse idempotencia del upload.

Una posible clave natural a estudiar:

```text
account + backupId
```

pero no está cerrada.

---

# 49. Idempotencia

El Client podría reintentar por problemas de red.

Hay que decidir qué ocurre si se vuelve a subir:

```text
mismo account
+
mismo backupId
```

Opciones:

```text
devolver existente
rechazar 409
reemplazar solo si hash coincide
```

No crear dos copias accidentales sin decisión explícita.

---

# 50. Hash remoto

Una estrategia a estudiar:

```text
sha256 del blob `.otpv`
```

Usos:

- verificar upload;
- verificar storage antes de download;
- detectar reintentos;
- reconciliar DB/filesystem.

No sustituye la seguridad interna GCM.

---

# 51. Auditoría del storage

Debe existir una forma de detectar:

```text
fila DB sin blob
blob sin fila DB
hash diferente
size diferente
```

Puede implementarse inicialmente como:

```text
task/command de mantenimiento
```

sin necesidad de un sistema complejo.

---

# 52. Limpieza y jobs

Posibles tareas futuras:

```text
purga temporales
reconciliación storage
aplicar retención
auditoría de integridad
limpieza de registros huérfanos
```

Si OFW dispone de Task/CLI actual, reutilizarlo tras consultar su API vigente.

---

# 53. Borrado de suscripción/cuenta

Legacy borra en cascada:

```text
Subscription
→ Accounts
→ Backups
→ files
```

En el nuevo sistema una operación así puede ser muy destructiva.

Debe requerir:

- autorización administrativa;
- confirmación UI;
- estrategia de errores parciales;
- auditoría.

Valorar si el borrado real debe ser inmediato o pasar por estado pendiente.

---

# 54. Panel y API son superficies distintas

Separar mentalmente:

```text
Panel administrativo humano
```

de:

```text
API utilizada por Osumi TPV Client
```

No reutilizar sin necesidad la misma sesión/credencial.

El panel puede usar:

```text
usuario + contraseña + sesión
```

El Client debe usar su mecanismo específico.

---

# 55. Seguridad de usuarios administradores

Legacy usa bcrypt.

La nueva aplicación debe usar el mecanismo actual/recomendado por PHP/OFW:

```text
password_hash()
password_verify()
```

con algoritmo vigente apropiado.

No guardar contraseñas reversibles.

Valorar mecanismos de creación/reset, pero no sobrediseñar 21.4 si no son necesarios.

---

# 56. Configuración y secretos del servidor

Nunca commitear:

```text
DB password
server secret
tokens
storage credentials
```

Usar la estrategia de configuración segura que se acuerde para OFW/despliegue.

El repositorio legacy sirve precisamente como ejemplo de lo que no debe repetirse.

---

# 57. Backups del propio TPV Backup

TPV Backup se convierte en una pieza crítica.

Más adelante debe existir una estrategia para proteger:

```text
base de datos de metadatos
configuración
storage físico
```

Esto es infraestructura del servicio y no debe confundirse con los backups de los TPV clientes.

No es necesario resolverlo en el primer bloque, pero debe quedar contemplado.

---

# 58. Disponibilidad y recuperación

Casos que el diseño debe tolerar:

```text
reinicio durante upload
reinicio después de escribir blob pero antes de DB
disco lleno
storage no disponible
DB no disponible
timeout del Client
```

Las operaciones deben poder reintentarse o reconciliarse.

---

# 59. Política ante suscripción expirada — punto crítico

Especial atención:

> Bloquear uploads no debería implicar necesariamente impedir descargar una copia necesaria para recuperar un negocio.

Debe cerrarse una política explícita orientada a recuperación.

---

# 60. Privacidad

Aunque el blob está cifrado, los metadatos remotos pueden revelar:

```text
fechas de backup
tamaños
frecuencia
versiones
identidad de cuenta
```

Persistir solo metadatos realmente útiles.

No copiar datos del negocio al registro remoto.

---

# 61. Qué NO debe hacer 21.4

No implementar todavía sin diseño:

- descifrado `.otpv` en servidor;
- restore server-side;
- leer SQLite remota;
- usar `backupApiKey` para login HTTP;
- copiar las rutas API legacy;
- usar IDs de DB sin autorización;
- almacenar archivos dentro de webroot;
- introducir lógica Client dentro del panel;
- cerrar 21.5 antes de cerrar autenticación/tenancy.

---

# 62. Propuesta de subdivisión para 21.4

Esta división es una **propuesta inicial**, no una decisión cerrada.

```text
21.4.1 Auditoría final legacy + requisitos
21.4.2 Bootstrap proyecto OFW actual
21.4.3 Configuración segura + entornos
21.4.4 Esquema de dominio base
21.4.5 Usuarios/admin login
21.4.6 Suscripciones
21.4.7 Cuentas/instalaciones
21.4.8 Dominio/storage de backups
21.4.9 Retención base
21.4.10 Panel de backups
21.4.11 Tareas de mantenimiento/reconciliación
21.4.12 Regresión de la app
```

Después:

```text
21.5 API remota
```

podrá apoyarse en los servicios de dominio/storage ya construidos.

---

# 63. Primera conversación recomendada

La nueva conversación debería empezar revisando este documento y los repositorios.

Antes de crear código, cerrar al menos:

```text
1. stack exacto
2. alcance de 21.4
3. modelo Subscription / Account
4. storage inicial
5. IDs públicos
6. política de retención inicial
7. frontera 21.4 vs 21.5
```

La autenticación Client remota puede requerir más diseño y puede cerrarse antes de 21.5 aunque no se implemente aún.

---

# 64. Preguntas de diseño prioritarias

Orden recomendado:

## 1. ¿Qué representa una Account?

Por ejemplo:

```text
una instalación Osumi TPV Client
```

Confirmar.

## 2. ¿La credencial será por Subscription o Account?

Esta decisión afecta casi todo el API.

## 3. ¿Qué necesita ver el administrador?

Cerrar panel mínimo.

## 4. ¿Filesystem o storage abstracto?

Recomendación:

```text
contrato abstracto
+
filesystem como primera implementación
```

## 5. ¿Retención inicial = 6?

Confirmar si se conserva la referencia legacy.

## 6. ¿Qué metadatos persistirá el servidor?

No almacenar de más.

## 7. ¿Cómo se autentica el Client sin revelar backupApiKey?

Diseño crítico.

---

# 65. Criterios de aceptación de la nueva app

Al terminar 21.4, antes del API Client definitivo, la aplicación debería tener una base sólida que permita:

```text
administrar tenants/suscripciones
administrar cuentas/instalaciones
gestionar storage de backups
listar copias
eliminar copias
aplicar retención
recuperar errores de storage razonablemente
operar sin conocer secretos de descifrado
```

El alcance exacto puede ajustarse al cerrar 21.4.

---

# 66. Criterios futuros de 21.5

El API debería poder demostrar, mediante tests:

```text
autenticación
ownership
upload streaming
límites
idempotencia
listado
download
delete
retención
errores
```

---

# 67. Criterios futuros de 21.6

Desde Osumi TPV Client:

```text
crear `.otpv`
↓
subir
↓
ver listado remoto
↓
descargar
↓
eliminar
↓
mostrar última copia
```

La descarga debe alimentar el restore v3 existente.

---

# 68. Criterios futuros de 21.7

Cerrar y probar:

```text
credencial derivada
rotación/revocación
rate limiting
replay protection si aplica
auditoría
cuotas
retención
hash/integridad remota
errores de red
timeouts
```

---

# 69. Criterio final de 21.8

Prueba real:

```text
Client A
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
restore v3
↓
Client B funcionalmente equivalente
```

Además:

```text
delete remoto
retención
errores de auth
backup corrupto
reintentos
```

---

# 70. Reglas del Client que no deben romperse

## Backup key

```text
bytes UTF-8 exactos
sin trim
sin normalización
```

## Formato

```text
formatVersion 3
```

## Tamaño

```text
máximo 8 GiB
```

## Secretos

```text
backupApiKey nunca dentro del `.otpv`
```

## Restore

```text
instalación limpia
```

## Impresora

```text
no portable
```

## Permiso UI

```text
gestion.copias_seguridad
```

---

# 71. Estado de TicketBAI

No está relacionado con TPV Backup.

`12C.9` sigue pausado esperando novedades de Berein.

No intercalarlo en este desarrollo.

---

# 72. Estado de Hito 22

Sincronización con tienda online queda después de Hito 21.

No mezclarla con TPV Backup.

---

# 73. Convención para decisiones nuevas

En la nueva conversación conviene marcar cada decisión como:

```text
CERRADA
PROPUESTA
PENDIENTE
DESCARTADA
```

Así este documento puede evolucionar sin confundir referencia legacy con contrato vigente.

---

# 74. Checklist inicial para la nueva conversación

Antes del primer patch:

```text
[ ] revisar main de Backup-TPV legacy
[ ] revisar main de framework
[ ] revisar skeleton osumionline/new
[ ] revisar docs/osumi-tpv-backup-v3.md
[ ] revisar BackupService actual del Client
[ ] confirmar stack
[ ] confirmar modelo de tenant
[ ] confirmar storage
[ ] confirmar retención
[ ] definir alcance exacto de 21.4
[ ] diseñar plan incremental
```

---

# 75. Prompt de arranque recomendado

```text
Quiero continuar el Hito 21 de Osumi TPV en una conversación independiente
para desarrollar la nueva aplicación TPV Backup.

Usa como contexto principal el documento:

“TPV Backup — Documento técnico de arranque y continuidad”, versión 1.0.

Estado:
- 21.1 `.otpv` v3 ✅
- 21.2 exportador Client ✅
- 21.3 restauración Client ✅ y probada A → B
- Vitest 5 ✅
- 21.4 Nueva app TPV Backup ▶️

Antes de proponer código:
1. revisa el `main` actual de los repositorios relevantes;
2. vuelve a estudiar el TPV Backup legacy;
3. distingue decisiones cerradas, referencia legacy y decisiones pendientes;
4. no reutilices la arquitectura OFW8 sin justificarla;
5. no permitas que TPV Backup reciba ni almacene `backupApiKey` en claro;
6. trabaja en bloques pequeños, coherentes y verificables.

Empecemos por revisar y cerrar el alcance técnico de 21.4 antes de crear archivos.
```

---

# 76. Resumen ejecutivo

Lo ya cerrado:

```text
`.otpv` v3
AES-256-GCM
scrypt
DEK/KEK
backupApiKey fuera del paquete
export local
restore local
regresión A → B
```

Lo que debe hacer TPV Backup:

```text
custodiar blob cifrado
autenticar
listar
descargar
borrar
retener
auditar
```

Lo que nunca debe necesitar:

```text
backupApiKey
KEK
DEK
SQLite
secretos portables descifrados
datos funcionales del negocio
```

Referencia legacy útil:

```text
Subscription
→ Account
→ Backup

max_backups = 6
```

pero:

```text
credenciales
API
filesystem
seguridad
arquitectura OFW8
```

deben rediseñarse.

Siguiente paso:

```text
21.4
→ cerrar arquitectura y alcance
→ crear nueva aplicación moderna
→ preparar dominio/storage/admin
```

Después:

```text
21.5 API
21.6 Client integration
21.7 security/retention
21.8 global recovery regression
```

---

**Fin del documento técnico de arranque TPV Backup v1.0.**
