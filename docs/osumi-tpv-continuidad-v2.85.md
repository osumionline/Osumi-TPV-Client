# Osumi TPV Client — Documento de continuidad v2.85

**Fecha:** 25 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento actualiza y sustituye como referencia de continuidad a `docs/osumi-tpv-continuidad-v2.84.md`.

La fuente de verdad para continuar es:

```text
main
+
este documento
+
la conversación actual
```

Su objetivo es conservar el estado real del proyecto, las decisiones funcionales y técnicas, las instrucciones de trabajo del usuario, los puntos descartados y el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

## Unidad de trabajo

Cada propuesta debe ser una **unidad pequeña, coherente, autocontenida y verificable**.

Esto **no significa un archivo por mensaje**.

Reglas:

- si una unidad funcional necesita varios archivos relacionados, se modifican juntos;
- dividir solo cuando el bloque sea realmente grande, complejo o mezcle responsabilidades;
- evitar tanto los bloques masivos como la fragmentación artificial;
- cada bloque debe poder aplicarse, probarse y validarse claramente.

## Antes de proponer código

Siempre:

1. revisar el estado actual de `main`;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, helpers, contratos, campos ni APIs;
4. contrastar código legacy cuando sea una fuente funcional relevante;
5. distinguir lo heredado de las decisiones nuevas.

Para archivos nuevos:

> Dar contenido completo.

Para archivos existentes:

> Dar reemplazos exactos y contexto suficiente.

## GitHub

Uso estrictamente de solo lectura.

No crear ni modificar remotamente:

- commits;
- ramas;
- PRs;
- issues;
- comentarios;
- archivos.

El usuario aplica los cambios localmente, ejecuta tests y hace push.

Tras cada push confirmado:

> Volver a revisar `main` antes de continuar.

## Validación

Tras cada bloque estable:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

No continuar con errores.

Regla expresa del usuario:

> No proponer comandos individuales para validar mini-cambios. Cuando haya que validar un bloque, indicar únicamente la batería completa anterior.

Cuando proceda, añadir prueba funcional real además de tests automáticos.

---

# 2. Reglas permanentes de código

## JSDoc

Regla expresa:

> Todo método creado o modificado debe tener JSDoc.

Incluye métodos públicos, privados, protegidos y métodos declarados en interfaces.

## Exports

```text
1 único símbolo exportado
→ export default

2 o más símbolos exportados
→ solo exports nominales
→ sin export default
```

## Angular

Referencia actual:

```text
Angular 22.2.x
```

Convenciones:

- standalone;
- zoneless;
- signals;
- `computed()` para derivados;
- `effect()` cuando proceda;
- `input()` / `output()`;
- no usar `@Input` / `@Output`;
- `inject()` para DI;
- no usar constructor para DI;
- `viewChild()` signal;
- `@if` / `@for`;
- Signal Forms cuando corresponda;
- servicios propios con `@Service()`;
- lazy loading;
- tipado estricto;
- preferencia por tipos explícitos cuando mejoran claridad.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer: seguir la configuración/estilo real del proyecto.
- No duplicar cobertura sin necesidad.
- Para SQL importante, preferir tests integrados con SQLite real.
- Cubrir casos límite de negocio, no solo happy path.

## Base de datos

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones salvo acuerdo expreso.

---

# 3. Repositorios de referencia

## Osumi TPV

```text
Cliente
https://github.com/osumionline/Osumi-TPV-Client

TPV antiguo
https://github.com/osumionline/Osumi-TPV

API antigua / exportador legacy
https://github.com/osumionline/TPV-API

TPV Backup antiguo
https://github.com/osumionline/Backup-TPV

SDK TicketBAI
https://github.com/osumionline/ticketbaiws
```

## Indomable Store

```text
Panel
https://github.com/igorosabel/indomable-admin

Backend
https://github.com/igorosabel/indomable-api

Frontend
https://github.com/igorosabel/indomable-frontend
```

---

# 4. Estado general

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
   ⏳ 21.4 Nueva app TPV Backup
   ⏳ 21.5 API almacenamiento remoto
   ⏳ 21.6 Integración Client ↔ Backup
   ⏳ 21.7 Seguridad/integridad/retención
   ⏳ 21.8 Regresión recuperación global

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

Último commit de `main` verificado al crear este documento:

```text
72503f69ebae7eed3ce2d5de6c4245880db88852
Terminado Backup 21.3j
```

Después de ese commit el usuario:

- aplicó una corrección visual localizada en el campo de TPV Backup key para que la zona de `mat-error` tenga fondo transparente;
- pasó correctamente la batería completa de tests;
- realizó una restauración funcional real desde una copia `.otpv` v3 en una instalación limpia;
- confirmó que la restauración terminó sin problemas;
- dio **21.3 por cerrado**.

Esos últimos cambios/validaciones todavía no aparecen en el `main` remoto verificado arriba. El usuario va a subir este documento y los cambios locales correspondientes antes de continuar.

Tras la confirmación del push:

> Volver a revisar `main` antes de tocar código.

El siguiente trabajo no es 21.4 todavía. Primero hay un bloque de mantenimiento acordado y deliberadamente aplazado hasta terminar 21.3:

```text
Vitest 4 → 5
```

Después de cerrar esa actualización, continuar con:

```text
21.4 — Nueva app TPV Backup
```

# 5. Empleados — regla definitiva

El flag legacy `empleados` ya no se usa.

```text
0 empleados
→ no se puede iniciar una venta

1 empleado
→ asignación automática

2+ empleados
→ empleado = null
→ selector embebido dentro de la venta
```

No existe modal global bloqueante.

Las reservas siguen la misma regla.

---

# 6. Permisos — estado definitivo

Catálogo:

```text
ventas.modificar_importes
gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

Política:

```text
Ventas
→ empleado asignado a la venta

Gestión
→ empleado autenticado en GestionSessionService

admin = true
→ bypass completo
```

No introducir permisos en Caja, Marcas, Proveedores, Artículos, Clientes, Compras ni navegación general.

Legacy:

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
```

No existe concesión automática del permiso 25.

Un único empleado activo importado:

```text
→ ADMIN
```

---
# 7. Hito 20 — Caja > Informes CERRADO

Los tres informes están completos:

```text
Simple      ✅
Detallado   ✅
Ventas      ✅
```

Los tres son:

```text
consultables
mensuales
anuales (`Todos`)
imprimibles
```

Selector:

```text
Tipo
Mes
Año
Categoría (solo Ventas)
Generar
```

## Periodos

Mes concreto:

```text
actual → mes seleccionado
anterior → mes inmediatamente anterior
```

Enero:

```text
enero 2026
→ diciembre 2025
```

`Todos`:

```text
año seleccionado
→ año anterior completo
```

Repositories:

```text
[desde, hastaExclusive)
```

## Arquitectura de impresión

Los informes no se renderizan dentro de Caja.

```text
Caja → Informes
↓
CajaInformesService
↓
IPC
↓
CajaInformePrintService
↓
servicio de negocio
↓
snapshot
↓
BrowserWindow independiente
↓
CashReportPrintComponent
↓
Simple / Detallado / Ventas
↓
webContents.print()
```

Impresión:

```text
A4 horizontal
printBackground = true
diálogo nativo
```

## Simple

Columnas:

```text
Fecha
Tickets
[tipos de pago]
Total
Suma
```

Pagos:

```text
venta_pago
```

Total canónico:

```text
venta.total_cents
```

Incluye días/meses sin ventas y tipos de pago históricos usados.

## Detallado

Secciones:

```text
Ventas
Marcas
Artículos
```

Ventas:

```text
número de tickets
```

Beneficio medio:

```text
margen global ponderado
```

Fórmulas:

```text
PVP
= Σ (pvp_micros × unidades)

beneficio
= Σ ((pvp_micros - puc_micros) × unidades)

margen
= beneficio / PVP × 100
```

Marcas:

- todas las marcas;
- identidad histórica por `id_marca_snapshot`;
- margen ponderado;
- `% ventas = PVP marca / PVP total`;
- sin base anterior comparable:
  ```text
  margenAnteriorBps = null
  diferenciaMargenBps = null
  UI = "= —"
  ```

Artículos:

```text
Top 50 por PVP
```

`% ventas`:

```text
tickets distintos con artículo / tickets totales
```

El periodo anterior no se limita previamente a su propio Top 50.

## Ventas por categorías

Usa clasificación actual del artículo.

```text
Categoría
  Artículos / Marcas
  Subcategoría
    ...
```

Importe:

```text
Σ linea_venta.importe_micros
```

Margen siempre ponderado.

### Multicategoría

Un artículo puede aparecer en varias ramas.

Pero:

> Una misma `linea_venta.id` solo cuenta una vez en el agregado del ancestro común.

Es correcto que la suma visual de hijos supere al total del padre.

### Agrupar por marca

```text
sin marcar
→ categorías → artículos

marcado
→ categorías → marcas
```

### Impresión del árbol

Colapsar ramas no elimina nodos del DOM.

En `@media print`:

```text
todas las ramas se muestran
```

La impresión conserva el modo activo Artículos/Marcas.

---

# 8. Regresión 20.8

Batería final:

```text
npm test               ✅
npm run build          ✅
npm run test:electron  ✅
npm run build:electron ✅
npm run lint           ✅
```

Pruebas funcionales:

```text
Simple      ✅
Detallado   ✅
Ventas      ✅
Impresión   ✅
```

Limpiezas finales realizadas:

- `DetailedReportComponent` reutiliza `format.utils.ts`;
- `CashReportsComponent` reutiliza `MONTH_OPTIONS`;
- eliminado código muerto de `SimpleReportComponent`:
  - `year`;
  - `month`;
  - `getTitle()`;
  - `MONTH_FORMATTER`;
- corregida comparación de Marcas Detallado sin base anterior.

Regla aprendida:

> Antes de crear formateadores, constantes o helpers, revisar utilidades existentes.

También:

> Cuando una arquitectura cambia, retirar inputs, métodos y tests que ya no participan en el comportamiento real.

---

# 9. Hito 21 — objetivo

Objetivo:

> Convertir `.otpv` en el artefacto canónico de copia y restauración completa de una instalación Osumi TPV Client.

Flujo:

```text
Osumi TPV Client
↓
.otpv cifrado
↓
TPV Backup
↓
custodia / lista / descarga / elimina
↓
.otpv
↓
Osumi TPV Client
↓
restauración completa
```

No copiar sin más la arquitectura antigua.

---
# 10. Referencia legacy ya estudiada

Se han revisado:

```text
osumionline/TPV-API
osumionline/Backup-TPV
```

## `.otpv` legacy

Exportador actual de `TPV-API`:

```text
FORMAT_VERSION = 2
SCHEMA_VERSION = legacy-2026-07
```

Incluye:

```text
database.sql
app_data.json
plugin_config.json
manifest.json
export-report.json
checksums.json

files/logo/
files/fotos/
files/marcas/
files/proveedores/
files/tipos-pago/
files/pdf/
```

Hashes:

```text
SHA-256
```

Plugins:

```text
email_smtp
ticketbai
```

Si falta plugin:

```text
null
```

El flag `empleados` ya no se exporta.

## Backup-TPV antiguo

El servicio antiguo:

- almacena `.sql`;
- asocia copias a cuentas;
- autentica con `api_key`;
- lista;
- descarga;
- elimina;
- tiene retención máxima configurable;
- borra la copia más antigua al llegar al límite.

Conclusión:

> Sirve como referencia funcional, no como arquitectura técnica del nuevo sistema.

---

# 11. Inventario real del Client

Raíz:

```text
app.getPath('userData') / osumi-tpv
```

Estructura:

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
│   └── secrets.json
└── staging/
```

Estado portable de instalación:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
assets/files/**
secretos lógicos
```

`assets/files/**` debe copiarse completo.

No mantener una lista rígida de subcarpetas.

Actualmente puede contener:

```text
articles/
brands/
providers/
payment-types/
orders/
clientes/facturas/
ventas/tickets/
```

Excluidos:

```text
logs/
backups/
staging/
```

---

# 12. `printing_settings.json`

Decisión cerrada:

> No forma parte del backup portable.

Actualmente contiene:

```text
ticketPrinterDeviceName
```

Es configuración de hardware local.

Tras restauración:

```text
impresora → sin seleccionar
```

La restauración no debe fallar porque el dispositivo no exista en el nuevo equipo.

---

# 13. SQLite — regla de backup

El Client usa:

```text
better-sqlite3
WAL habilitado
```

Regla cerrada:

> No copiar `osumi-tpv.sqlite` directamente mientras la aplicación está funcionando.

21.2 genera un:

```text
snapshot SQLite consistente
```

El `.otpv` contiene una SQLite autocontenida e independiente de:

```text
-wal
-shm
```

La restauración v3 valida la SQLite extraída mediante una conexión `better-sqlite3`/TypeORM de **solo lectura**, sin activar WAL sobre el artefacto que va a restaurarse.

La validación real incluye identidad, versión de esquema, tablas, metadatos, `integrity_check` y `foreign_key_check` mediante `DatabaseSchemaService`.

`DATABASE_SCHEMA_VERSION` sigue siendo:

```text
1
```

No se ha introducido ninguna migración durante 21.3.

# 14. Secretos actuales

`InstallationSecretsData`:

```text
secretApi
backupApiKey
emailSmtpPass
ticketBaiToken
```

Se guardan actualmente mediante Electron:

```text
safeStorage
```

en:

```text
secrets/secrets.json
```

Ese fichero no es portable entre máquinas.

Regla:

> Nunca copiar directamente `secrets/secrets.json` al `.otpv`.

El exportador debe cargar los secretos lógicos y el restaurador volver a guardarlos con `SecretStorage.save()` en el equipo destino.

---
# 15. `backupApiKey` — decisión fundamental

Decisión cerrada:

> `backupApiKey` será el secreto maestro de recuperación de Osumi TPV.

Motivos:

- ya existe;
- ya pertenece al dominio Backup;
- no cambia por usuario;
- evita introducir otra contraseña;
- permite backups automáticos sin pedir credenciales;
- permite restaurar en otra máquina con la TPV Backup key.

Existe precedente legacy:

> `BackupAppTask.php` ya utilizaba `backup_api_key` como parte del material de cifrado.

La nueva implementación debe hacerlo con diseño criptográfico correcto.

## Regla crítica

Nunca:

```text
usar backupApiKey directamente como clave AES
```

Nunca incluir:

```text
backupApiKey
```

dentro del `.otpv`.

El nuevo TPV Backup tampoco debe almacenar ni recibir el secreto maestro en claro.

---

# 16. Derivación criptográfica — contrato vigente

El formato v3 usa `scrypt` para derivar la KEK desde los bytes UTF-8 exactos de `backupApiKey`, sin normalización ni recortes. HKDF se descartó para la KEK porque la clave puede ser introducida manualmente y no se garantiza su entropía.

Parámetros fijos, validados en el manifest:

```text
salt aleatorio por backup = 32 bytes
cost = 32768
blockSize = 8
parallelization = 3
length = 32 bytes
cryptoSuite = otpv3-scrypt-aes-256-gcm
```

El KDF de la futura autenticación remota es una responsabilidad separada que se concretará en los bloques del servicio remoto; no reutilizar la KEK para autenticación.

La especificación autoritativa del formato es `docs/osumi-tpv-backup-v3.md`.

---

# 17. DEK / KEK

Cada backup genera una:

```text
DEK aleatoria
Data Encryption Key
```

La DEK cifra el payload.

Desde `backupApiKey` se deriva una:

```text
KEK
Key Encryption Key
```

La KEK protege/envuelve la DEK.

Ventajas:

- una DEK distinta por backup;
- aislamiento entre copias;
- futura rotación/re-envoltorio más sencillo;
- el cifrado masivo no depende directamente del secreto maestro.

---

# 18. Cifrado autenticado

Algoritmo acordado como dirección de `.otpv` v3:

```text
AES-256-GCM
```

Objetivos:

```text
confidencialidad
+
integridad autenticada
```

Usar nonce/IV seguro y único.

Nunca reutilizar nonce con la misma clave.

---

# 19. TPV Backup y conocimiento de claves

Objetivo de seguridad:

> TPV Backup debe poder custodiar copias sin poder descifrarlas.

El servidor conocerá solo la credencial derivada necesaria para autenticación.

No debe conocer:

```text
backupApiKey
KEK de cifrado
DEK en claro
```

Así, una filtración del servicio de backup no permite abrir los `.otpv`.

---

# 20. Restauración en otra máquina

Máquina original:

```text
SecretStorage.load()
↓
backupApiKey
↓
backup automático/local
```

Máquina nueva:

```text
no existe el safeStorage anterior
```

El usuario proporciona:

```text
TPV Backup key
```

Flujo v3 implementado y validado:

1. seleccionar `.otpv`;
2. detectar `formatVersion` y separar v2/v3;
3. validar contenedor exterior y manifest;
4. comprobar que el paquete no ha cambiado desde la selección;
5. obtener externamente TPV Backup key;
6. derivar KEK con scrypt;
7. autenticar/recuperar DEK;
8. autenticar y descifrar `payload.enc`;
9. validar ZIP interior, límites, rutas, duplicados y symlinks;
10. extraer y validar SQLite, `app_data.json`, logo y secretos portables;
11. materializar `files/**`;
12. reconstruir `InstallationSecretsData` combinando secretos portables + TPV Backup key externa;
13. generar un nuevo `secrets.json` mediante `SecretStorage.save()` y `safeStorage` de la máquina destino;
14. preparar staging canónico;
15. vincular el staging a `selectionId + backupId`;
16. verificar que no exista una instalación ya configurada;
17. resetear la impresora local a `ticketPrinterDeviceName = null`;
18. promover database/files/logo/secrets/app_data, con `app_data.json` el último;
19. invalidar selección/estado preparado;
20. recargar el renderer sobre la instalación restaurada.

La restauración nativa v3 está diseñada para una **instalación limpia**. El backend impide promover una copia sobre una instalación ya configurada.

La prueba funcional real A → `.otpv` → B fue completada con éxito por el usuario al cerrar 21.3.

# 21. Nueva generación `.otpv`

Dirección acordada:

```text
formatVersion = 3
```

Significado:

```text
v2
→ paquete legacy de migración

v3
→ backup/restauración nativa del Client
```

No confundir ambos usos.

El importador debe leer:

```text
manifest.formatVersion
```

y enrutar al flujo correspondiente.

---

# 22. Contenido lógico de `.otpv` v3

El contenedor exterior ZIP lleva **exactamente** dos ficheros regulares:

```text
manifest.json
payload.enc
```

`payload.enc` cifra íntegramente un ZIP interior con:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
files/**
```

`files/**` copia toda la jerarquía de `assets/files/**` sin lista rígida de subdirectorios. El snapshot SQLite debe ser consistente e independiente de `-wal` y `-shm`. Se excluyen `logs/`, `backups/`, `staging/` y `printing_settings.json`.

`secrets/secrets.json` contiene los secretos portables con `schemaVersion`, `secretApi`, `emailSmtpPass` y `ticketBaiToken`. **Nunca contiene `backupApiKey`**. La clave se suministra externamente al restaurar y después se combina con los secretos portables para guardarlos mediante `SecretStorage.save()` en la máquina destino.

---

# 23. Manifest v3 — contrato cerrado

`docs/osumi-tpv-backup-v3.md` y los contratos y validadores del repositorio fijan el esquema exacto. Entre sus campos están:

```text
formatVersion = 3
application = Osumi TPV Client
applicationVersion
databaseSchemaVersion
backupId (UUID v4)
createdAt (UTC ISO 8601)
cryptoSuite = otpv3-scrypt-aes-256-gcm
authenticatedData
kdf (scrypt, salt y parámetros fijos)
keyWrap (AES-256-GCM, iv, authTag, wrappedDek)
payload (payload.enc, ZIP, AES-256-GCM, iv, authTag)
```

`authenticatedData` son los bytes JSON canónicos, codificados en Base64, de los metadatos críticos en el orden formalizado. La restauración usa esos bytes como AAD y además parsea/compara su contenido con el manifest.

No se exponen en el manifest datos del negocio ni secretos.

El contenedor exterior debe tener exactamente:

```text
manifest.json
payload.enc
```

Los límites, rutas permitidas, validación, compatibilidad y secuencia de restauración constan en `docs/osumi-tpv-backup-v3.md`, que debe seguir tratándose como especificación autoritativa del formato.

# 24. Integridad

El legacy usa `checksums.json` y SHA-256.

V3 no requiere `checksums.json`:

```text
AES-256-GCM
```

autentica tanto el wrapped DEK como el payload. El AAD vincula los metadatos críticos.

Una autenticación fallida invalida completamente la copia.

Mensaje funcional genérico para clave incorrecta/corrupción:

```text
No se puede abrir la copia de seguridad. La TPV Backup key no es correcta o el archivo está dañado.
```

La restauración valida antes de la promoción:

- tamaño exterior;
- estructura exacta del ZIP exterior;
- manifest y metadatos autenticados;
- parámetros criptográficos;
- ZIP interior;
- límites por entrada y acumulados mientras se leen streams reales;
- rutas seguras;
- duplicados;
- symlinks;
- raíces permitidas;
- recursos obligatorios;
- SQLite real;
- `app_data.json`;
- secretos portables;
- WebP del logo;
- `files/**`.

Ningún recurso definitivo se promociona antes de completar estas comprobaciones.

# 25. Staging y restauración

El Client dispone del staging canónico:

```text
staging/
├── app_data.json
├── logo.webp
├── secrets.json
├── osumi-tpv.sqlite
└── files/
```

La promoción usa el orden:

```text
database
files
logo
secrets
app_data
```

`app_data.json` se mueve el último como marcador de instalación completa.

La restauración v3 implementa además un workspace previo:

```text
staging/restore-work/
├── required/
│   ├── database/osumi-tpv.sqlite
│   ├── config/app_data.json
│   ├── assets/logo.webp
│   └── secrets/secrets.json   ← portable
└── files/**
```

Secuencia real:

```text
descifrar
↓
validar completamente
↓
materializar restore-work
↓
reconstruir secrets.json local mediante safeStorage
↓
preparar staging canónico
↓
eliminar restore-work / payloads temporales
↓
comprobar selectionId + backupId
↓
promover
↓
app_data como marcador final
```

El estado preparado está ligado explícitamente a:

```text
selectionId + backupId
```

Seleccionar otro paquete invalida y limpia cualquier staging v3 previamente preparado.

Ante error de promoción se utiliza `InstallationFinalizer.recover()`; el arranque de Electron también ejecuta `recover()` antes de construir el grafo de dependencias.

`printing_settings.json` no se restaura. Antes de la promoción se deja:

```json
{
  "schemaVersion": 1,
  "ticketPrinterDeviceName": null
}
```

No escribir directamente sobre la instalación definitiva durante la validación.

# 26. TPV Backup nuevo — principios

La app OFW8 antigua se reconstruirá.

Responsabilidades:

```text
recibir .otpv cifrado
almacenar
listar
descargar
eliminar
aplicar retención
autenticar Client
```

Principio:

> TPV Backup debe actuar como custodio de blobs cifrados y no necesitar entender el contenido funcional.

La retención legacy:

```text
max_backups = 6
```

sirve como referencia, pero la política definitiva debe cerrarse durante Hito 21.

---

# 27. Plan actualizado Hito 21

## ✅ 21.1 — Especificación `.otpv` v3

Contrato documentado en `docs/osumi-tpv-backup-v3.md`: contenedor exterior con `manifest.json` y `payload.enc`, ZIP interior, metadatos autenticados, scrypt, DEK/KEK y AES-256-GCM, snapshot SQLite, secretos portables sin `backupApiKey`, entradas permitidas, límites, seguridad de rutas y compatibilidad.

## ✅ 21.2 — Exportador nativo del Client

Implementados snapshot SQLite consistente, inventario portable completo de `assets/files/**`, secretos lógicos sin la clave maestra, ZIP interior, cifrado streaming, DEK aleatoria, KEK mediante scrypt, manifest, ZIP exterior y limpieza de temporales.

La creación funcional de `.otpv` desde la aplicación fue probada y aceptada por el usuario.

## ✅ 21.3 — Restauración nativa v3 — CERRADO

Desarrollo realizado por bloques incrementales:

```text
21.3a ✅ Detección/inspección inicial v2-v3
21.3b ✅ Stores y routing común de selección
21.3c ✅ Selección real Electron + IPC/preload
21.3d ✅ Extracción payload.enc + AES-GCM + workspace
21.3e ✅ Validación estricta del ZIP interior
21.3f ✅ Extracción/validación semántica de recursos obligatorios
21.3g ✅ Materialización de files/** + limpieza de payloads
21.3h ✅ Reconstrucción de secretos safeStorage + staging canónico
21.3i ✅ Promoción final segura + estado preparado + recovery
21.3j ✅ UI Angular de restauración desde /instalacion
21.3k ✅ Regresión funcional real A → .otpv → B
```

### 21.3a

Se introdujo inspección común del paquete y clasificación explícita:

```text
v2 → legacy-import
v3 → native-restore
```

Nunca reinterpretar silenciosamente un formato como otro.

### 21.3b–c

Se añadieron stores/servicios de selección y ruta Electron común. La información sensible del manifest, rutas físicas y datos criptográficos no se exponen al renderer.

### 21.3d

Se implementaron:

- extracción segura de `payload.enc`;
- validación de que el `.otpv` no cambió tras seleccionarlo;
- derivación scrypt;
- unwrap de DEK;
- descifrado AES-256-GCM;
- workspace temporal de restore;
- limpieza integral ante error.

La TPV Backup key se usa exactamente como se introduce, sin `trim` ni normalización.

### 21.3e

El ZIP interior se inspecciona con yauzl y lectura real de streams. Se comprueban:

```text
máximo 50.000 entradas
máximo 2 GiB por entrada
máximo 16 GiB total
rutas <= 1.024 caracteres
sin cifrado ZIP
sin duplicados
sin symlinks
sin path traversal
raíces permitidas
recursos obligatorios
```

### 21.3f

Se materializan y validan semánticamente:

```text
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
```

Detalles importantes:

- SQLite validada en modo read-only, sin activar WAL sobre la copia;
- `DatabaseSchemaService.validate()` sobre SQLite real;
- `app_data.json` validado mediante el repositorio real;
- secretos portables con contrato exacto y sin `backupApiKey`;
- logo realmente WebP, estático y dentro de límites;
- Sharp recibe el logo como Buffer para evitar locks `EBUSY` en Windows.

Límites semánticos actuales:

```text
app_data.json       16 MiB
secrets.json         1 MiB
logo.webp            5 MiB
logo dimensiones     4096 × 4096
```

### 21.3g

Se materializa toda la jerarquía segura `files/**` conservando rutas relativas. Una vez materializado el contenido portable completo se eliminan `payload.enc` y `payload.zip`.

### 21.3h

Los secretos portables se combinan con la TPV Backup key externa:

```text
secretApi        ← payload
backupApiKey     ← input externo exacto
emailSmtpPass    ← payload
ticketBaiToken   ← payload
```

Después se genera un nuevo `staging/secrets.json` mediante Electron `safeStorage` de la máquina destino.

El staging canónico queda:

```text
staging/osumi-tpv.sqlite
staging/files/**
staging/logo.webp
staging/secrets.json
staging/app_data.json
```

`app_data.json` se prepara el último.

### 21.3i

Se introdujo estado de restore preparado ligado a:

```text
selectionId + backupId
```

La finalización:

- rechaza staging de otra selección;
- rechaza restaurar sobre instalación ya configurada;
- resetea impresora local;
- usa `InstallationFinalizer.finalize()`;
- usa `recover()` ante promoción fallida;
- invalida selección/estado tras éxito.

### 21.3j

`/instalacion` tiene tres modos:

```text
Configurar una nueva instalación
Importar Osumi TPV anterior
Restaurar copia de seguridad
```

El restore nativo permite:

```text
seleccionar .otpv
↓
mostrar metadatos v3
↓
introducir TPV Backup key
↓
validar y preparar
↓
activar restauración
↓
Entrar en Osumi TPV
```

Si se selecciona un v2 desde el flujo nativo, la UI indica que debe usarse `Importar Osumi TPV anterior`.

La TPV Backup key usa Signal Forms y se elimina del estado del renderer después de preparar correctamente el staging.

### 21.3k — regresión final local

El usuario realizó una prueba funcional real:

```text
instalación A
↓
crear backup .otpv v3
↓
instalación B limpia
↓
seleccionar backup
↓
introducir TPV Backup key
↓
validar/preparar
↓
activar
↓
instalación restaurada correctamente
```

Resultado comunicado:

> Restauración completada sin ningún problema.

Con esa prueba, **21.3 queda oficialmente cerrado**.

También se corrigió visualmente el `mat-form-field` de la TPV Backup key para que la zona inferior reservada a `mat-error` sea transparente y no destaque en blanco sobre el fondo de la pantalla.

## 🔧 Mantenimiento inmediato — Vitest 4 → 5

Este bloque fue aplazado expresamente hasta terminar 21.3.

Estado actual antes de actualizar:

```text
vitest ^4.1.11
Angular ^22.2.0
```

Debe tratarse como mantenimiento aislado, sin mezclar funcionalidad de Backup:

- revisar `package.json` y `package-lock.json`;
- revisar `electron/vitest.config.mts` y compatibilidad Vite/Vitest;
- actualizar Vitest 4 → 5;
- corregir únicamente incompatibilidades derivadas de la actualización;
- pasar tests Angular + Electron y la batería completa;
- no introducir cambios funcionales de Hito 21.

Tras cerrar este mantenimiento:

## ⏳ 21.4 — Nueva app TPV Backup

Reconstrucción moderna de la aplicación de custodia de backups. Antes de diseñarla, volver a estudiar el repositorio legacy `osumionline/Backup-TPV` y el estado actual del ecosistema.

## ⏳ 21.5 — API remota

Endpoints versionados para autenticación, upload, listado, descarga y borrado.

## ⏳ 21.6 — Integración Client ↔ Backup

```text
upload
listado
descarga
borrado
estado última copia
```

## ⏳ 21.7 — Seguridad / integridad / retención

- autenticación derivada independiente de la KEK;
- rate limiting;
- límites;
- auditoría;
- retención;
- errores.

## ⏳ 21.8 — Regresión global de recuperación

La prueba A → B de 21.3 ya valida el round-trip local del `.otpv` v3.

21.8 será la regresión del sistema completo una vez existan app remota + API + integración:

```text
Client A
↓
backup v3
↓
TPV Backup remoto
↓
descarga
↓
Client B limpio
↓
restauración
↓
B funcionalmente equivalente
```

# 28. Riesgos Hito 21

## SQLite + WAL

Riesgo original:

```text
copia inconsistente
```

Mitigación ya implementada:

```text
snapshot SQLite consistente
+
validación read-only al restaurar
```

## Secretos en temporales

Reglas vigentes:

- `backupApiKey` nunca se incluye en el payload;
- secretos portables solo existen dentro del payload cifrado y en `restore-work` durante la restauración;
- buffers sensibles se ponen a cero cuando procede;
- `restore-work` se limpia tras preparar staging;
- secretos finales se regeneran con `safeStorage` del equipo destino;
- no registrar secretos en logs.

## ZIP / contenedor malicioso

Mitigaciones implementadas en restore v3:

- límites de entradas/tamaños;
- validación de streams reales;
- rechazo de `../`;
- rechazo de rutas absolutas;
- rechazo de drive letters;
- rechazo de backslashes/rutas no canónicas;
- rechazo de symlinks;
- rechazo de duplicados;
- raíces permitidas explícitas;
- requeridos explícitos.

## Staging cruzado entre selecciones

Riesgo detectado durante 21.3:

> preparar una copia A, seleccionar B y promocionar accidentalmente el staging de A.

Mitigación implementada:

```text
prepared restore = selectionId + backupId
```

Una nueva selección invalida y limpia el staging preparado anterior.

## Pérdida de Backup key

Si se pierde:

```text
backupApiKey
```

las copias v3 cifradas son irrecuperables.

La UX futura del servicio remoto debe advertirlo claramente.

## Servicio remoto

Riesgos todavía pendientes para 21.4–21.7:

- diseño de credencial de autenticación remota separada de la KEK;
- límites de subida/descarga;
- rate limiting;
- retención;
- auditoría;
- borrado;
- recuperación de errores de red;
- garantías de que el servidor nunca necesita `backupApiKey` en claro.

# 29. Hito 22 — Sincronización tienda online

Orden:

```text
Hito 20 ✅
↓
Hito 21 ▶️
↓
Hito 22 ⏳
```

Arquitectura:

```text
Osumi TPV Client
        │ HTTPS
        ▼
indomablestore.com / indomable-api
```

La conexión la inicia siempre el Client.

No exponer servidor local.

Decisiones ya cerradas:

```text
fecha económica = Order.payed_at
id_cliente = NULL
primera fase = ventas pagadas
clave artículo = localizador
PUC = se resuelve localmente
tipo pago = tipoPagoPublicId
empleado estructural = Tienda online

online     → id_caja = NULL
presencial → id_caja != NULL

idempotencia:
origen + referencia_externa
```

Seguridad prevista:

- HTTPS;
- secreto compartido;
- `safeStorage`;
- HMAC SHA-256;
- `iat`;
- `exp`;
- request id / propósito.

No copiar snapshots absolutos de stock sin resolver concurrencia.

Plan:

```text
S1  Modelo TPV
S2  Snapshot indomable-api
S3  API versionada
S4  Cliente HTTP Electron
S5  Importador de ventas
S6  Scheduler
S7  ACK
S8  Stock/precios
S9  Observabilidad
S10 Retirada legacy
```

---

# 30. TicketBAI

SDK:

```text
@osumi/ticketbaiws
```

Estado:

```text
1.0.1
ESM
tests
README
docs/
```

Bloque `12C.9` pausado hasta respuesta/actualización de Berein.

No intercalarlo dentro de Hito 21 salvo novedad externa.

---

# 31. Siguiente paso exacto

El usuario va a subir esta continuidad a `main` junto con los últimos cambios locales del cierre de 21.3.

**Esperar su confirmación del push antes de continuar.**

Después:

1. volver a revisar el nuevo `main`;
2. confirmar que el cierre de 21.3 y la corrección visual del restore están presentes;
3. iniciar el bloque aislado de mantenimiento **Vitest 4 → 5**;
4. antes de proponer cambios, revisar exactamente:
   - `package.json`;
   - `package-lock.json`;
   - `electron/vitest.config.mts`;
   - scripts de tests Angular/Electron;
   - cualquier dependencia Vite/Vitest relevante;
5. no mezclar la actualización de Vitest con funcionalidad de Backup;
6. ejecutar únicamente la batería completa de validación acordada;
7. una vez cerrado Vitest 5, revisar de nuevo `main` y comenzar planificación/implementación de **21.4 — nueva app TPV Backup**.

No iniciar 21.5/21.6 antes de cerrar el diseño y alcance de 21.4.

No reabrir 21.3 salvo regresión real demostrada.

# 32. Estado al cerrar v2.85

```text
Hito 20: CERRADO.
Hito 21.1: especificación v3 CERRADA.
Hito 21.2: exportador nativo CERRADO y probado funcionalmente.
Hito 21.3: restauración nativa v3 CERRADA y probada A → B.
Mantenimiento Vitest 4 → 5: SIGUIENTE.
Hito 21.4: pendiente tras mantenimiento Vitest.
Hito 21.5–21.8: pendientes.
Hito 22: pendiente tras Hito 21.
TicketBAI 12C.9: pausado hasta respuesta/actualización de Berein.
```

Último `main` remoto verificado al redactar este documento:

```text
72503f69ebae7eed3ce2d5de6c4245880db88852
Terminado Backup 21.3j
```

Después de ese commit, pero antes de subir v2.85:

```text
corrección visual TPV Backup key            ✅
batería completa de tests                   ✅
regresión funcional A → .otpv → B          ✅
21.3 cerrado por el usuario                 ✅
```

La siguiente conversación puede empezar con:

```text
He subido osumi-tpv-continuidad-v2.85.md y los últimos cambios a main.
Revisa el último commit y empecemos el bloque aislado de mantenimiento
Vitest 4 → 5. No mezcles esta actualización con funcionalidad de Backup.
```

---

**Fin del documento de continuidad v2.85.**
