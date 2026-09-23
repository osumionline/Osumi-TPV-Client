# Osumi TPV — Formato de backup `.otpv` v3

## 1. Objetivo

`.otpv` v3 es el formato nativo de copia de seguridad y restauración
de Osumi TPV Client.

No sustituye al `.otpv` v2 de migración legacy.

```text
v2
→ migración TPV legacy → Osumi TPV Client

v3
→ backup/restauración Osumi TPV Client
```

El formato está diseñado para que el servicio remoto TPV Backup pueda
almacenar una copia sin disponer del material necesario para descifrarla.

---

## 2. Contenedor exterior

Un `.otpv` v3 es un archivo ZIP.

Debe contener exactamente dos ficheros regulares:

```text
manifest.json
payload.enc
```

No se admiten otros ficheros en el contenedor exterior.

`manifest.json` contiene únicamente los metadatos mínimos necesarios
para identificar, validar y descifrar el backup.

`payload.enc` contiene el ZIP interior completo cifrado.

El fichero cifrado debe almacenarse en el ZIP exterior sin intentar
comprimirlo de nuevo.

---

## 3. Identificación del formato

El manifest debe contener:

```json
{
  "formatVersion": 3,
  "application": "Osumi TPV Client"
}
```

La restauración debe utilizar `formatVersion` para seleccionar
el parser correspondiente.

Nunca se debe intentar interpretar un v2 como v3 ni viceversa.

---

## 4. Estructura de `manifest.json`

Estructura exacta prevista:

```json
{
  "formatVersion": 3,
  "application": "Osumi TPV Client",
  "applicationVersion": "0.0.0",
  "databaseSchemaVersion": 1,
  "backupId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "createdAt": "2026-09-23T21:00:00.000Z",
  "cryptoSuite": "otpv3-hkdf-sha256-aes-256-gcm",
  "authenticatedData": "...",
  "kdf": {
    "algorithm": "hkdf-sha256",
    "salt": "...",
    "info": "osumi-tpv-backup:v3:kek",
    "length": 32
  },
  "keyWrap": {
    "algorithm": "aes-256-gcm",
    "iv": "...",
    "authTag": "...",
    "wrappedDek": "..."
  },
  "payload": {
    "entry": "payload.enc",
    "format": "zip",
    "algorithm": "aes-256-gcm",
    "iv": "...",
    "authTag": "..."
  }
}
```

Todos los datos binarios del manifest se codifican mediante Base64
estándar RFC 4648, sin saltos de línea.

---

## 5. Metadatos autenticados

Los metadatos críticos se serializan como JSON UTF-8 compacto,
sin espacios y en este orden exacto:

```json
{"formatVersion":3,"backupId":"...","application":"Osumi TPV Client","applicationVersion":"...","databaseSchemaVersion":1,"createdAt":"...","cryptoSuite":"otpv3-hkdf-sha256-aes-256-gcm"}
```

Los bytes UTF-8 exactos de ese JSON se almacenan en:

```text
manifest.authenticatedData
```

codificados en Base64.

La restauración no debe volver a generar esos bytes para usarlos
criptográficamente.

Debe:

1. decodificar `authenticatedData`;
2. utilizar esos bytes como fuente de AAD;
3. parsear además su JSON;
4. comprobar que sus campos coinciden exactamente con los campos
   equivalentes del manifest.

Esto evita depender de una canonicalización JSON implícita.

---

## 6. TPV Backup key

El secreto maestro es:

```text
backupApiKey
```

Nunca se incluye en el `.otpv`.

Nunca se utiliza directamente como clave AES.

Se trata como material secreto opaco.

---

## 7. Derivación de KEK

Para cada backup se generan 32 bytes aleatorios criptográficamente
seguros:

```text
salt
```

Se deriva una KEK de 32 bytes mediante:

```text
HKDF-SHA-256
```

Parámetros:

```text
IKM
→ bytes UTF-8 exactos de backupApiKey

salt
→ 32 bytes aleatorios

info
→ bytes UTF-8 de:
  osumi-tpv-backup:v3:kek

length
→ 32 bytes
```

Resultado:

```text
KEK de 256 bits
```

No se normaliza, recorta ni modifica `backupApiKey` antes de utilizarlo.

---

## 8. DEK

Cada backup genera independientemente:

```text
32 bytes aleatorios
```

que forman la DEK.

```text
DEK
→ cifra payload.enc

KEK
→ cifra la DEK
```

La DEK nunca se guarda en claro.

---

## 9. Protección de la DEK

La DEK se cifra mediante:

```text
AES-256-GCM
```

con la KEK.

Se genera un IV aleatorio de:

```text
12 bytes
```

El authentication tag tiene:

```text
16 bytes
```

El AAD utilizado es la concatenación exacta:

```text
UTF-8("osumi-tpv-backup:v3:keywrap\n")
+
authenticatedData decodificado
```

El ciphertext resultante de los 32 bytes de la DEK se almacena en:

```text
keyWrap.wrappedDek
```

El IV:

```text
keyWrap.iv
```

El tag:

```text
keyWrap.authTag
```

---

## 10. Payload

Antes de cifrar se crea un ZIP interior.

Su estructura lógica es:

```text
database/
└── osumi-tpv.sqlite

config/
└── app_data.json

assets/
└── logo.webp

secrets/
└── secrets.json

files/
└── contenido completo de assets/files/**
```

Son obligatorios:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
```

`files/**` puede estar vacío.

No se incluye:

```text
printing_settings.json
logs/
backups/
staging/
secrets.json cifrado por Electron safeStorage
SQLite -wal
SQLite -shm
```

---

## 11. Secretos portables

`secrets/secrets.json` pertenece exclusivamente al payload cifrado.

Estructura:

```json
{
  "schemaVersion": 1,
  "secretApi": "...",
  "backupApiKey": "...",
  "emailSmtpPass": null,
  "ticketBaiToken": null
}
```

Los valores representan los secretos lógicos obtenidos mediante:

```text
SecretStorage.load()
```

No representan el fichero cifrado mediante Electron `safeStorage`.

Al restaurar:

```text
payload secrets
↓
SecretStorage.save()
↓
nuevo safeStorage de la máquina destino
```

---

## 12. Snapshot SQLite

`database/osumi-tpv.sqlite` debe ser una copia SQLite consistente
y autocontenida.

No se admite crear el backup copiando directamente la base operativa
mientras está en modo WAL.

El exportador debe utilizar un mecanismo de snapshot/backup SQLite.

La copia resultante no debe depender de:

```text
-wal
-shm
```

para poder abrirse.

---

## 13. Cifrado del payload

El ZIP interior completo se cifra mediante:

```text
AES-256-GCM
```

utilizando la DEK.

Se genera un IV independiente y aleatorio de:

```text
12 bytes
```

El authentication tag tiene:

```text
16 bytes
```

El AAD es exactamente:

```text
UTF-8("osumi-tpv-backup:v3:payload\n")
+
authenticatedData decodificado
```

El ciphertext constituye el contenido íntegro de:

```text
payload.enc
```

El tag se almacena en:

```text
payload.authTag
```

El IV:

```text
payload.iv
```

El IV de `keyWrap` y el IV de `payload` deben ser distintos.

---

## 14. Integridad

AES-256-GCM proporciona autenticación del wrapped DEK y del payload.

El formato v3 no requiere `checksums.json`.

La validación criptográfica debe completarse antes de utilizar
cualquier fichero extraído del payload.

Un fallo del authentication tag invalida completamente el backup.

---

## 15. Identificador de backup

Cada copia utiliza un:

```text
UUID v4
```

independiente:

```text
backupId
```

El `backupId` forma parte de los metadatos autenticados.

No reutilizar un `backupId` para dos copias diferentes.

---

## 16. Fecha

`createdAt`:

- debe ser ISO 8601;
- debe representar UTC;
- debe terminar en `Z`.

Ejemplo:

```text
2026-09-23T21:00:00.000Z
```

También forma parte de los metadatos autenticados.

---

## 17. `applicationVersion`

`applicationVersion` identifica la versión del Client que creó
la copia.

No determina por sí sola si una restauración es compatible.

La compatibilidad se decide fundamentalmente mediante:

```text
formatVersion
databaseSchemaVersion
```

---

## 18. Límites del contenedor

Límites v3 previstos:

```text
Tamaño máximo del .otpv:
8 GiB

Tamaño máximo de manifest.json:
64 KiB

Número de ficheros regulares exteriores:
2

Número máximo de entradas del ZIP interior:
50.000

Tamaño máximo de una entrada interior:
2 GiB

Tamaño máximo total descomprimido del ZIP interior:
16 GiB

Longitud máxima de una ruta ZIP:
1.024 caracteres
```

Los límites deben comprobarse tanto usando los metadatos ZIP
como mientras se leen realmente los streams.

---

## 19. Seguridad de rutas

Se rechaza cualquier entrada que:

- sea una ruta absoluta;
- contenga `..` como segmento;
- utilice una letra de unidad Windows;
- escape de la raíz de extracción;
- represente un enlace simbólico;
- duplique una ruta ya encontrada.

Las rutas internas del formato utilizan:

```text
/
```

como separador.

---

## 20. Entradas permitidas del payload

Top-level permitido:

```text
database/
config/
assets/
secrets/
files/
```

Cualquier otro top-level invalida el paquete.

Dentro de:

```text
files/
```

se permite cualquier jerarquía segura.

Esto permite que futuros storages del Client se incorporen al backup
sin modificar el formato `.otpv`.

---

## 21. Secuencia de validación al restaurar

La restauración debe realizar conceptualmente:

```text
1. validar tamaño exterior
2. abrir ZIP exterior
3. validar exactamente manifest.json + payload.enc
4. validar manifest.json
5. validar formatVersion
6. validar metadatos autenticados
7. obtener TPV Backup key
8. derivar KEK
9. autenticar y recuperar DEK
10. autenticar y descifrar payload
11. validar ZIP interior
12. validar límites y rutas
13. validar ficheros obligatorios
14. validar SQLite
15. validar app_data.json
16. validar secrets/secrets.json
17. preparar staging
18. restaurar recursos en staging
19. SecretStorage.save()
20. promoción final
```

Ningún recurso definitivo se sustituye antes de terminar las
validaciones necesarias.

---

## 22. Fallos criptográficos

Los siguientes casos deben considerarse backup no restaurable:

```text
Backup key incorrecta
wrapped DEK no autenticable
payload no autenticable
metadatos autenticados inconsistentes
```

No debe indicarse al usuario qué parte concreta de la clave falló
de una forma que facilite distinguir claves candidatas.

Mensaje funcional recomendado:

```text
No se puede abrir la copia de seguridad.
La TPV Backup key no es correcta o el archivo está dañado.
```

---

## 23. TPV Backup remoto

El servidor remoto no necesita descifrar el paquete.

Sus responsabilidades son:

```text
autenticar
recibir
almacenar
listar
descargar
eliminar
aplicar retención
```

No debe recibir:

```text
backupApiKey
KEK
DEK en claro
```

La autenticación remota utilizará material derivado separado
del utilizado para cifrar backups.

Su contrato se cerrará dentro de los bloques de API del Hito 21.

---

## 24. Compatibilidad futura

Cambios incompatibles del contenedor requieren:

```text
nuevo formatVersion
```

Cambios internos compatibles pueden evolucionar mediante:

```text
databaseSchemaVersion
schemaVersion de los documentos internos
```

Nunca reinterpretar silenciosamente un campo v3 con una semántica nueva.

---

## 25. Resumen criptográfico

```text
backupApiKey
      │
      │ HKDF-SHA-256
      │ salt aleatorio 32 B
      │ info = osumi-tpv-backup:v3:kek
      ▼
     KEK 32 B
      │
      │ AES-256-GCM
      ▼
DEK aleatoria 32 B
      │
      │ AES-256-GCM
      ▼
ZIP interior
      │
      ▼
payload.enc
```

Los dos AES-GCM utilizan:

```text
IV independiente de 12 B
tag de 16 B
AAD con metadatos autenticados
```

---

## 26. Estado del contrato

Este documento define el contrato funcional y criptográfico
propuesto para el formato `.otpv` v3.

El siguiente paso del Hito 21.1 es acompañarlo con:

```text
tipos TypeScript
constantes
validadores
tests
```

El exportador no debe implementarse hasta que esos contratos estén
estables.
