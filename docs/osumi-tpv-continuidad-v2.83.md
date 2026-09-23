# Osumi TPV Client — Documento de continuidad v2.83

**Fecha:** 23 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento actualiza y sustituye como referencia de continuidad a `docs/osumi-tpv-continuidad-v2.82.md`.

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
Angular 22.1.x
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
   ▶️ 21.1 Especificación `.otpv` v3
   ⏳ 21.2 Exportador Client
   ⏳ 21.3 Restauración
   ⏳ 21.4 Nueva app TPV Backup
   ⏳ 21.5 API almacenamiento remoto
   ⏳ 21.6 Integración Client ↔ Backup
   ⏳ 21.7 Seguridad/integridad/retención
   ⏳ 21.8 Regresión recuperación

⏳ Hito 22 — Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

Último commit confirmado:

```text
3e18c389ce4c684c231dc42847e0245281c8a618
Terminado Informes 20.8
```

---

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

Por tanto:

> No copiar `osumi-tpv.sqlite` directamente mientras la aplicación está funcionando.

21.2 debe generar un:

```text
snapshot SQLite consistente
```

El `.otpv` debe contener una SQLite autocontenida.

No usar como estrategia:

```text
copiar .sqlite + -wal + -shm
```

---

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

# 16. Derivación criptográfica

Dirección acordada:

```text
backupApiKey
+
salt aleatorio por backup
+
separación de dominio
↓
HKDF-SHA-256
```

Se debe derivar material distinto para funciones distintas.

Ejemplo:

```text
backupApiKey
├── HKDF(info = "osumi-tpv-backup-encryption-v3")
│   └── material de cifrado
│
└── HKDF(info = "osumi-tpv-backup-authentication-v1")
    └── credencial remota
```

Los strings exactos se fijarán formalmente en 21.1.

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
backup automático
```

Máquina nueva:

```text
no existe el safeStorage anterior
```

El usuario proporciona:

```text
TPV Backup key
```

Proceso:

1. leer metadatos del paquete;
2. derivar KEK;
3. recuperar DEK;
4. autenticar y descifrar payload;
5. validar contenido;
6. preparar staging;
7. restaurar SQLite, app_data, logo y `files/**`;
8. guardar secretos mediante `SecretStorage.save()`;
9. `safeStorage` los cifra para el equipo nuevo;
10. promoción final segura.

---

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

# 22. Contenido lógico previsto de `.otpv` v3

El contenedor debe representar:

```text
metadatos públicos mínimos
+
envelope criptográfico
+
payload cifrado
```

Payload lógico:

```text
database/
└── osumi-tpv.sqlite

config/
└── app_data.json

assets/
└── logo.webp

files/
└── copia completa de assets/files/**

secrets/
└── representación portable de InstallationSecretsData
```

Los secretos:

```text
siempre dentro del payload cifrado
```

---

# 23. Manifest v3 — pendiente de cerrar formalmente

21.1 debe fijar exactamente el contrato.

Como mínimo deberá contener los datos necesarios para:

- identificar `formatVersion`;
- identificar aplicación;
- versión de aplicación;
- fecha de creación;
- versión de esquema SQLite;
- KDF;
- salt;
- algoritmo de cifrado;
- nonce(s);
- wrapped DEK;
- compatibilidad;
- parámetros criptográficos necesarios para abrir la copia.

Evitar exponer en claro si no es imprescindible:

- nombre del negocio;
- CIF;
- email;
- secretos;
- datos personales;
- contenido funcional.

---

# 24. Integridad

El legacy usa:

```text
checksums.json
SHA-256
```

En v3:

- AES-GCM ya autentica el contenido cifrado;
- puede existir un hash adicional por operatividad;
- el contrato debe definir qué entra como AAD;
- no añadir mecanismos redundantes sin propósito claro.

---

# 25. Staging y restauración

El Client ya dispone de staging:

```text
staging/
├── app_data.json
├── logo.webp
├── secrets.json
├── osumi-tpv.sqlite
└── files/
```

La instalación actual promociona en orden:

```text
database
files
logo
secrets
app_data
```

`app_data.json` se mueve el último como marcador de instalación completa.

Hito 21.3 debe reutilizar la misma filosofía:

```text
validar completamente
↓
preparar staging
↓
promover
↓
marcador final
```

No escribir directamente sobre la instalación definitiva durante la validación.

---
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

## ▶️ 21.1 — Especificación `.otpv` v3

Decisiones ya tomadas:

```text
✅ formato nativo separado del legacy
✅ formatVersion 3 como nueva generación
✅ snapshot SQLite consistente
✅ app_data incluido
✅ logo incluido
✅ files/** completo
✅ secretos portables
✅ logs excluidos
✅ backups excluidos
✅ staging excluido
✅ printing_settings excluido
✅ backupApiKey = secreto maestro
✅ backupApiKey nunca dentro del paquete
✅ HKDF-SHA-256
✅ separación de dominio
✅ DEK aleatoria por backup
✅ KEK derivada
✅ AES-256-GCM
✅ servidor sin backupApiKey
✅ autenticación remota con material derivado separado
✅ re-cifrado de secretos con safeStorage al restaurar
```

Pendiente de cerrar en 21.1:

```text
manifest.json exacto
layout físico exacto
AAD exacto
wrapped DEK exacto
strings/versiones HKDF
límites de tamaño
límites de entradas
límites de expansión
protección anti-zip-bomb
protección anti-path-traversal
reglas de compatibilidad
códigos/errores de validación
hashes adicionales si proceden
```

## ⏳ 21.2 — Exportador nativo

- snapshot SQLite;
- inventario portable;
- secretos lógicos;
- DEK;
- KEK;
- cifrado;
- manifest;
- `.otpv`;
- validación post-generación;
- tests;
- limpieza segura de temporales.

## ⏳ 21.3 — Restauración

- detectar v3;
- solicitar Backup key cuando proceda;
- derivar claves;
- descifrar;
- validar;
- staging;
- reconstruir secretos;
- promoción;
- recuperación ante fallo.

## ⏳ 21.4 — Nueva app TPV Backup

Reconstrucción moderna.

## ⏳ 21.5 — API remota

Endpoints versionados.

## ⏳ 21.6 — Integración Client ↔ Backup

```text
upload
listado
descarga
borrado
estado última copia
```

## ⏳ 21.7 — Seguridad / integridad / retención

- autenticación derivada;
- rate limiting;
- límites;
- auditoría;
- retención;
- errores.

## ⏳ 21.8 — Regresión

Prueba principal:

```text
instalación A
↓
backup .otpv
↓
máquina limpia B
↓
restauración
↓
instalación B funcionalmente equivalente
```

---

# 28. Riesgos Hito 21

## SQLite + WAL

Riesgo:

```text
copia inconsistente
```

Mitigación:

```text
backup API/snapshot SQLite adecuado
```

## Secretos en temporales

Objetivo:

> Evitar materializar secretos en claro en disco.

Si fuera imprescindible:

- permisos restrictivos;
- temporales no predecibles;
- limpieza en `finally`;
- ningún secreto en logs.

## ZIP / contenedor malicioso

Al importar:

- limitar número de entradas;
- limitar tamaño por entrada;
- limitar tamaño descomprimido total;
- rechazar `../`;
- rechazar rutas absolutas;
- rechazar drive letters;
- no seguir symlinks inesperados.

El importador legacy ya contiene defensas de path traversal que sirven de referencia.

## Pérdida de Backup key

Si se pierde:

```text
backupApiKey
```

las copias v3 cifradas son irrecuperables.

La UX futura debe advertirlo claramente.

---

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

El siguiente trabajo es:

```text
Hito 21.1 — cerrar formalmente el contrato `.otpv` v3
```

No empezar todavía por el exportador.

Orden recomendado:

1. revisar `main`;
2. fijar `manifest.json`;
3. fijar layout físico;
4. fijar envelope criptográfico;
5. fijar salt/nonce/wrapped DEK/AAD;
6. fijar versiones y contextos HKDF;
7. fijar compatibilidad;
8. fijar límites de tamaño y entradas;
9. fijar defensas anti-zip-bomb/path-traversal;
10. fijar errores de validación;
11. documentar contrato;
12. solo entonces comenzar 21.2.

---

# 32. Estado al cerrar v2.83

```text
Hito 20:
COMPLETAMENTE CERRADO.

Simple:
funcional, probado e imprimible.

Detallado:
funcional, probado e imprimible.

Ventas:
funcional, probado e imprimible.

Regresión:
cerrada.

Hito 21:
iniciado a nivel de diseño.

Decisiones estructurales de backup:
cerradas.

Siguiente:
formalizar contrato exacto `.otpv` v3.

Hito 22:
pendiente tras Hito 21.

TicketBAI 12C.9:
pausado.
```

La siguiente conversación puede comenzar directamente con:

```text
Continuamos con Hito 21.1:
vamos a cerrar el contrato exacto del `.otpv` v3.
```
