# Osumi TPV Client — Documento de continuidad v2.91

**Fecha:** 8 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** https://github.com/osumionline/Osumi-TPV-Client  
**Repositorio TPV Backup API:** https://github.com/osumionline/TPV-Backup-API  
**Repositorio TPV Backup Front:** https://github.com/osumionline/TPV-Backup-Front  

Este documento actualiza y sustituye como referencia principal de continuidad a:

`docs/osumi-tpv-continuidad-v2.90.md`

La fuente de verdad para continuar el desarrollo será siempre:

**main actual de los repositorios + documento de continuidad más reciente + conversación activa**

La v2.91 se genera durante la pausa técnica de logging, después de completar **PT-LOG.5g — logging del cierre de Caja**. Su objetivo es dejar completamente consolidado:

1. el estado cerrado del Hito 21 — TPV Backup;
2. la arquitectura definitiva de logging diseñada e implementada en PT-LOG.1–4;
3. el trabajo ya terminado en PT-LOG.5a–5g;
4. la taxonomía y reglas de logging que deben mantenerse;
5. el catálogo de eventos de log actualmente implantados;
6. el punto exacto donde continuar PT-LOG.5;
7. el trabajo pendiente de PT-LOG.5, PT-LOG.6 y PT-LOG.7;
8. el hecho de que el Hito 22 — Sincronización tienda online sigue pospuesto hasta terminar la pausa técnica.

El documento histórico:

`docs/tpv-backup-contexto-tecnico-v1.0.md`

sigue siendo útil como referencia del nacimiento de TPV Backup, pero las decisiones e implementación descritas aquí prevalecen ante cualquier diferencia.

---

# 1. Resumen ejecutivo

## 1.1. Estado general

- ✅ Hito 16 — Compras
- ✅ Hito 17 — Gestión
- ✅ Hito 18 — Caja base
- ✅ Empleado por venta
- ✅ Hito 19 — Permisos
- ✅ Hito 20 — Caja > Informes
- ✅ Hito 21 — TPV Backup
- ✅ 21.1 — Especificación `.otpv` v3
- ✅ 21.2 — Exportador nativo del Client
- ✅ 21.3 — Restauración nativa v3
- ✅ 21.4 — Nueva app TPV Backup
- ✅ 21.5 — API remota
- ✅ 21.6 — Integración Client ↔ TPV Backup
- ✅ 21.7 — Seguridad / integridad / retención
- ✅ 21.8 — Regresión recuperación global
- ✅ 21.9 — Backups remotos automáticos
- ✅ 21.9.1 — Configuración de hora
- ✅ 21.9.2 — Estado persistente del scheduler
- ✅ 21.9.3 — Ejecución automática
- ✅ 21.9.4 — Ciclo de vida Electron
- ✅ 21.9.5 — UI informativa
- ✅ 21.9.6 — Regresión funcional final
- ▶️ PAUSA TÉCNICA — Logging transversal y diagnóstico persistente
- ✅ PT-LOG.1 — Auditoría y diseño
- ✅ PT-LOG.2 — Contratos y normalización
- ✅ PT-LOG.3 — Logger persistente de Main
- ✅ PT-LOG.4 — Renderer → Main + integración Angular
- ▶️ PT-LOG.5 — Migración de puntos críticos
- ✅ PT-LOG.5a — Scheduler de backups automáticos
- ✅ PT-LOG.5b — Pantalla Gestión > Copias de seguridad
- ✅ PT-LOG.5c — Limpieza temporal TPV Backup
- ✅ PT-LOG.5d — Post-COMMIT de Ventas
- ✅ PT-LOG.5e — Persistencia de Ventas
- ✅ PT-LOG.5f — Contexto de Ventas + apertura de Caja
- ✅ PT-LOG.5g — Lectura/cierre definitivo de Caja
- ⏳ PT-LOG.5h y siguientes — resto de puntos críticos
- ⏳ PT-LOG.6 — Soporte / acceso / exportación de logs
- ⏳ PT-LOG.7 — Regresión final del sistema de logging
- ⏳ Hito 22 — Sincronización tienda online
- ⏸ TicketBAI 12C.9 — pendiente de Berein

## 1.2. Punto exacto de continuación

El próximo trabajo **NO** es todavía el Hito 22.

El siguiente bloque recomendado es:

**PT-LOG.5h — Caja: salidas / movimientos**

Objetivo:

- revisar lectura de salidas;
- alta;
- modificación;
- eliminación;
- identificar qué errores son validación/estado de negocio;
- registrar únicamente los fallos técnicos reales;
- evitar duplicados entre Renderer, IPC, servicio de aplicación y repository.

Después de PT-LOG.5h el recorrido previsto continúa por:

1. flujos secundarios de Ventas;
2. documentos, impresión y email;
3. TicketBAI directo: reconciliación / retry / fronteras técnicas;
4. auditoría final de filesystem, base de datos, `catch` silenciosos y `console.*`;
5. PT-LOG.6;
6. PT-LOG.7;
7. Hito 22.

---

# 2. HEADs al generar v2.91

## 2.1. Osumi TPV Client

HEAD verificado:

`6518202730e7a56a006d0bf5b502f6ac9a334703`

**Terminado logging cierre caja PT-LOG.5g**

Commits inmediatamente anteriores:

`0c7f079f782288e47c041290826fc364d0010b18`  
**Terminado logging contexto ventas y apertura caja PT-LOG.5f**

`9ef5d784f15d7555de7d11fcaca10158cf4e07a6`  
**Terminado logging persistencia ventas PT-LOG.5e**

`3227ac34c3119021f90b6e6e7fd8fd6fdbc96343`  
**Terminado logging post-COMMIT ventas PT-LOG.5d**

El usuario confirmó que los tests requeridos para PT-LOG.5g pasaron correctamente antes del push.

## 2.2. TPV Backup API

HEAD verificado y sin cambios durante la pausa técnica:

`d1d3bdcde95d0e7d848347ec434b499025caa1b5`

**Tarea de reconciliacion 21.7.3a**

## 2.3. TPV Backup Front

HEAD verificado y sin cambios durante la pausa técnica:

`1be138f8e280646b9419f9fe60287111174e890e`

**Corrección en mensaje al desactivar subscripción**

---

# 3. Forma de trabajo acordada

El desarrollo se realiza incrementalmente y con verificación entre bloques.

## 3.1. Antes de proponer código

Siempre:

1. revisar `main`;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, contratos, helpers ni APIs;
4. reutilizar arquitectura y pipelines existentes;
5. distinguir decisiones cerradas de propuestas pendientes;
6. tras cada push confirmado por el usuario, volver a revisar `main`;
7. no asumir que un search vacío de GitHub significa que una clase no existe: cuando exista una ruta conocida, usar lectura exacta del archivo.

## 3.2. Entrega

Archivo nuevo:

- ruta exacta;
- contenido completo.

Archivo existente:

- ruta exacta;
- bloque identificable;
- reemplazo exacto.

Preferencia expresa:

- bloques pequeños y coherentes;
- no ZIP;
- probar antes de continuar;
- no avanzar con errores;
- si un test falla, corregir el bloque actual antes de abrir el siguiente.

## 3.3. GitHub

Desde ChatGPT:

**SOLO LECTURA**

No crear remotamente:

- commits;
- ramas;
- PR;
- issues;
- comentarios;
- archivos.

El usuario aplica cambios, ejecuta pruebas y hace push.

## 3.4. Estado de situación

En cada mensaje de desarrollo indicar siempre:

- **Dónde estamos**
- **Qué estamos haciendo**
- **Qué queda por delante**

---

# 4. Convenciones permanentes

## 4.1. TypeScript exports

Regla expresa:

**1 único símbolo exportado**  
→ `export default`

**2 o más símbolos exportados**  
→ exports nominales  
→ nunca `export default`

Referencia histórica:

`636efea`

## 4.2. Imports

Usar aliases absolutos siempre que exista uno.

Aliases Electron relevantes:

- `@bootstrap/*`
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

Evitar rutas relativas cuando exista alias aplicable.

## 4.3. Documentación de código

Todo método creado o modificado debe tener:

- JSDoc / PHPDoc;
- también contratos e interfaces cuando corresponda.

## 4.4. Regla permanente: métodos sin cuerpo vacío

Regla expresa del usuario:

**Nunca proporcionar métodos con cuerpo vacío `{}`**, ni en:

- producción;
- tests;
- mocks;
- stubs;
- fakes.

Si un método es deliberadamente no-op, debe existir una implementación explícita y compatible con ESLint, por ejemplo:

```ts
void event;
```

o un `return` apropiado.

Esta regla debe aplicarse proactivamente en todo código futuro.

Los constructores que únicamente declaran parameter properties pueden conservar la sintaxis normal de TypeScript cuando no existe una acción adicional necesaria; no introducir código artificial que empeore el diseño.

## 4.5. Angular

Base actual:

- Angular 22.2.2
- Angular Material 22.2.2
- standalone
- zoneless
- signals
- Signal Forms

Convenciones:

- `inject()`;
- `input()` / `output()`;
- signal queries;
- `@if`, `@for`, `@switch`;
- tipado estricto;
- evitar `any`;
- `unknown` cuando proceda;
- Angular Material;
- `MatTooltip` en vez de `title`;
- sin NgModule;
- evitar `CommonModule`;
- sin `HostBinding` / `HostListener`;
- sin `ngClass` / `ngStyle`;
- WCAG AA;
- Prettier organiza imports.

---

# 5. Baterías de pruebas

## 5.1. Client — batería completa

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

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

## 5.4. Regla durante PT-LOG.5

Cada bloque se prueba según la capa tocada.

Renderer / Angular:

```bash
npm test
npm run build
npm run lint
```

Main / Electron:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Si un cambio toca ambas capas, ampliar batería según corresponda.

Antes de cerrar PT-LOG.7 debe ejecutarse la batería completa del Client.

---

# 6. Versiones relevantes actuales del Client

Verificadas desde `package.json` en `main` al generar v2.91:

- Angular `^22.2.2`
- Angular Material `^22.2.2`
- Angular CDK `^22.2.2`
- Angular CLI `^22.2.2`
- Electron `^44.7.0`
- TypeScript `~6.0.2`
- Vitest `^5.0.3`
- Node types `^26.6.4`
- better-sqlite3 `^12.11.1`
- TypeORM `^1.1.2`
- yauzl `^3.4.0`
- yazl `^3.3.1`
- sharp `^0.35.5`
- nodemailer `^10.0.16`
- `@osumi/angular-tools` `^1.5.2`
- `@osumi/ticketbaiws` `^1.0.1`
- npm `12.2.0`

Durante la pausa técnica se actualizaron librerías y Angular/Material pasó de 22.2.1 a 22.2.2.

---

# 7. Hito 21 — CERRADO

El Hito 21 queda oficialmente terminado.

Su resultado final comprende:

- Osumi TPV Client;
- TPV Backup API;
- TPV Backup Front.

Y cubre:

- formato portable `.otpv` v3;
- creación local;
- restauración nativa;
- importación legacy;
- almacenamiento remoto;
- autenticación;
- integridad;
- seguridad;
- retención;
- descarga;
- borrado;
- restore remoto;
- recuperación tras interrupciones;
- gestión administrativa;
- backups remotos automáticos diarios;
- UI de estado automático;
- regresión funcional real.

No reabrir el Hito 21 salvo evidencia nueva de un problema real.

---

# 8. `.otpv` v3 — contrato consolidado

ZIP exterior:

- `manifest.json`
- `payload.enc`

`payload.enc` contiene el ZIP interior cifrado.

## 8.1. Criptografía

`formatVersion = 3`

`cryptoSuite = otpv3-scrypt-aes-256-gcm`

scrypt:

- salt 32 bytes;
- cost 32768;
- blockSize 8;
- parallelization 3;
- length 32 bytes.

AES-256-GCM:

- DEK aleatoria por backup;
- KEK derivada desde TPV Backup key;
- wrapping de DEK;
- IV 12 bytes;
- auth tag 16 bytes.

## 8.2. Payload portable

Incluye:

- `database/osumi-tpv.sqlite`
- `config/app_data.json`
- `assets/logo.webp`
- `secrets/secrets.json`
- `files/**`

No incluye:

- `printing_settings.json`
- `backup_automatic_state.json`
- `logs/`
- `backups/`
- `staging/`
- TPV Backup key
- JWT

La exclusión de `logs/` es un contrato vigente y especialmente importante durante la pausa técnica.

## 8.3. Límite

Máximo:

**8 GiB**

Upload/download en streaming.

---

# 9. Secretos y credenciales

No confundir:

`installation.public_id`  
≠  
TPV Backup Key ID  
≠  
TPV Backup Secret  
≠  
`backup.backup_id`  
≠  
`backup.public_id`  
≠  
TPV Backup key

## 9.1. TPV Backup key

- UTF-8 exacto;
- no `trim`;
- no normalización;
- nunca al servidor;
- nunca dentro de `.otpv`;
- usada para derivar KEK.

## 9.2. Key ID + Secret

Credenciales remotas.

Key ID:

- `trim` permitido.

Secret:

- conservar exactamente.

Persistencia:

`secrets/backup_remote_credentials.json`

protegido mediante Electron `safeStorage`.

## 9.3. JWT remoto

- RAM;
- no persistir;
- no Renderer;
- no `.otpv`.

---

# 10. Filesystem actual del Client

Raíz:

`app.getPath('userData') / osumi-tpv`

Estructura relevante:

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

`ApplicationPaths` dispone de:

```ts
readonly logsDirectory: string;
```

`ElectronApplicationPathsProvider` resuelve:

`<root>/logs`

En `main.ts`:

```ts
app.setAppLogsPath(applicationPaths.logsDirectory);
```

Y desde PT-LOG.3 existe además un logger propio persistente de aplicación en ese directorio.

---

# 11. Recuperación e instalación

`app_data.json` es el marcador final de instalación completa.

Si existe:

instalación válida  
→ limpiar staging residual  
→ conservar estado automático

Si no existe:

instalación incompleta  
→ limpiar finales parciales  
→ limpiar credenciales remotas huérfanas  
→ limpiar estado automático  
→ reset staging

El estado automático:

`config/backup_automatic_state.json`

es:

- local;
- no portable;
- reseteado al reemplazar instalación.

---

# 12. TPV Backup API — semántica consolidada

## 12.1. Suscripciones

### ACTIVE

- auth ✅
- list ✅
- download ✅
- delete ✅
- upload ✅

### EXPIRED

- auth ✅
- list ✅
- download ✅
- delete ✅
- upload ❌

### DISABLED

- auth ❌
- list ❌
- download ❌
- delete ❌
- upload ❌

## 12.2. Revalidación

Cada request relevante revalida:

- credencial;
- revocación;
- key id;
- instalación;
- suscripción;
- estado activo.

Rotar/revocar invalida efectivamente JWT aún vigente.

## 12.3. Storage

Ruta lógica:

`installations/<installation.public_id>/<backup.public_id>.otpv`

Fuera del webroot.

Integridad:

- tamaño;
- SHA-256.

Reconciliación read-only ya implementada y probada.

---

# 13. 21.9 — Backups remotos automáticos — CERRADO

## 13.1. Decisiones definitivas

- hora por defecto: `03:00`;
- hora configurable: sí;
- formato `HH:mm`;
- zona horaria local del terminal;
- `lastSuccessfulAt`: UTC ISO;
- estado scheduler local y no portable;
- `backupAutomaticTime` portable en `app_data.json`;
- backup manual **NO** satisface ciclo automático;
- varios días offline → 1 catch-up, no N;
- fallo → NO marca éxito;
- retry aproximadamente 1 hora;
- suspend/resume → reevaluación inmediata;
- pipeline → `BackupRemoteCreateService`;
- toggle enable → no.

Activación práctica:

instalación válida  
+ credenciales remotas  
+ suscripción / `canUpload` válidos  
+ ciclo pendiente

## 13.2. Compatibilidad

Instalaciones/backups antiguos sin:

`backupAutomaticTime`

normalizan a:

`03:00`

sin bump innecesario de schema.

## 13.3. Persistencia

Fichero:

`config/backup_automatic_state.json`

Estructura:

```json
{
  "schemaVersion": 1,
  "lastSuccessfulAt": "2026-10-08T07:00:00.000Z"
}
```

Escrito de forma atómica.

No forma parte de `.otpv`.

---

# 14. Scheduler automático — arquitectura final

## 14.1. Resolución temporal

`BackupAutomaticScheduleResolver` calcula:

- `latestScheduledAt`;
- `nextScheduledAt`;
- `pending`.

Reconstruye fechas civiles locales.

No utiliza `setInterval(24h)` como modelo de calendario.

Esto preserva la semántica local y evita asumir días rígidos de 24 horas ante DST.

## 14.2. Estado

`BackupAutomaticStateService`:

- carga último éxito;
- resuelve estado;
- marca éxito únicamente tras completar;
- permite reset.

## 14.3. Ejecución

`BackupAutomaticExecutionService` comprueba:

- instalación;
- credenciales;
- `pending`.

Reutiliza:

`BackupRemoteCreateService`

La autenticación/estado administrativo remoto se vuelve a comprobar antes de generar el paquete costoso.

Un fallo:

**NO `markSuccessful()`**

## 14.4. Ciclo de vida

`BackupAutomaticSchedulerService`:

- primera evaluación al arrancar;
- programa próximo vencimiento;
- retry ~1 h en error o estado sin próximo fiable;
- evita evaluaciones concurrentes;
- permite `reevaluate()`;
- conserva una petición de reevaluación si llega durante otra evaluación.

`main.ts`:

```text
createMainWindow
↓
scheduler.start()
```

`before-quit`:

```text
scheduler.stop()
↓
database.disconnect()
```

`powerMonitor.resume`:

```text
scheduler.reevaluate()
```

## 14.5. Cambios en caliente

Reevaluación tras éxito de:

- actualización de configuración;
- instalación;
- configuración de credenciales remotas;
- eliminación de credenciales;
- restore v3 finalizado;
- import legacy finalizado;
- resume del sistema.

No se reevalúa por credenciales temporales de restore.

---

# 15. UI automática final

En:

**Gestión → Copias de seguridad**

la zona TPV Backup muestra dos tarjetas de igual ancho:

```text
[Tienda / suscripción]
[Copias automáticas]
```

La tarjeta automática muestra:

- Copias automáticas;
- Todos los días a las HH:mm;
- Última copia automática;
- fecha local o “Todavía no se ha realizado ninguna”;
- Al día / Pendiente.

La UI:

- consulta el estado mediante contrato público Main → Renderer;
- no lee filesystem directamente;
- no recalcula scheduling en Angular;
- no muestra `nextScheduledAt` como promesa de retry;
- distingue backup manual de automático;
- usa diseño responsive.

Contrato público:

`BackupAutomaticInfo`

Campos:

- `automaticTime`
- `lastSuccessfulAt`
- `latestScheduledAt`
- `nextScheduledAt`
- `pending`

---

# 16. 21.9.6 — regresión funcional final

Todas las pruebas funcionales previstas para el cierre fueron superadas.

Se verificó:

- ejecución real al vencer la hora;
- reinicio sin duplicados;
- independencia del backup manual;
- catch-up tras aplicación cerrada;
- suspensión/reanudación;
- fallo de red y recuperación;
- batería automática completa.

Resultado:

- ✅ 21.9 cerrado;
- ✅ Hito 21 cerrado.

---

# 17. Pausa técnica — Logging transversal

## 17.1. Objetivo central

Cuando ocurra un problema en una instalación real debe quedar información persistente suficiente para reconstruir posteriormente qué ocurrió, aunque:

- el usuario cierre rápidamente el aviso;
- no recuerde el texto;
- el fallo sea recuperable;
- la incidencia ocurra sin modal, como en tareas automáticas.

El logging complementa la UX existente.

No sustituye:

- mensajes claros;
- recuperación;
- validaciones;
- semántica del dominio.

## 17.2. Principio operativo

El TPV debe seguir priorizando vender.

Regla cerrada:

> Un fallo del propio sistema de logging no debe convertir una operación funcional en un fallo.

El logger es **best-effort**.

---

# 18. PT-LOG.1 — Auditoría y diseño — CERRADO

PT-LOG.1 se realizó como auditoría y diseño previo; no necesitó un commit específico.

Resultados principales:

- se revisaron Main, IPC, Renderer, filesystem, base de datos, red, impresión, email, TicketBAI y TPV Backup;
- se distinguieron errores controlados de errores no controlados;
- se identificó el riesgo de duplicar la misma incidencia en Main + IPC + Renderer;
- se fijó que el contexto debe ser explícito y escalar;
- se descartó volcar objetos arbitrarios;
- se fijó la exclusión de secretos;
- se decidió conservar una única persistencia en Main;
- se decidió que Renderer enviaría eventos mediante IPC;
- se estableció una taxonomía funcional de `debug`, `info`, `warn`, `error`;
- se acordó migración incremental, no reemplazo masivo.

Regla fundamental nacida de la auditoría:

> Registrar el fallo en el punto que mejor conoce su significado funcional y evitar volver a registrar la misma excepción cuando simplemente atraviesa capas.

---

# 19. PT-LOG.2 — Contratos y normalización — CERRADO

Commit:

`eaa0c4a09fdc8746d2de022b4da3b0960adecae8`

**Terminado contratos y normalización de logging PT-LOG.2a**

## 19.1. Niveles

```ts
type ApplicationLogLevel = 'debug' | 'info' | 'warn' | 'error';
```

## 19.2. Origen

```ts
type ApplicationLogSource = 'main' | 'renderer';
```

## 19.3. Contexto permitido

Solo valores escalares:

```ts
string | number | boolean | null
```

No se admiten:

- objetos;
- arrays;
- requests completos;
- responses completas;
- estructuras de dominio arbitrarias.

Contrato conceptual:

```ts
Readonly<Record<string, string | number | boolean | null>>
```

## 19.4. Evento de aplicación

Campos:

- `source?`;
- `area`;
- `operation`;
- `message`;
- `error?`;
- `context?`.

`source` se omite normalmente en Main y se resuelve como `main`.

Renderer lo fija como `renderer` en el bridge IPC.

## 19.5. Error normalizado

Solo:

- `name`;
- `message`;
- `stack`;
- `cause`;
- `errors`.

Nunca inspeccionar ni serializar propiedades arbitrarias del `Error`.

## 19.6. Registro persistente

`ApplicationLogRecord`:

```text
schemaVersion = 1
timestamp
level
source
area
operation
message
appVersion
context
error
```

Formato persistente:

**JSON Lines / JSONL**

---

# 20. Normalización y sanitización de errores

## 20.1. `ApplicationErrorNormalizer`

Límites:

- profundidad `cause`: 4;
- errores de `AggregateError`: máximo 5;
- `name`: 200 caracteres;
- `message`: 4096;
- `stack`: 16384.

Si el valor no es un `Error`:

- `name = UnknownError`;
- mensaje genérico;
- no se serializa el valor arbitrario recibido.

## 20.2. `ApplicationLogTextSanitizer`

Barrera defensiva adicional.

Redacta patrones evidentes como:

- `Bearer ...`;
- `authorization`;
- `token`;
- `secret`;
- `secretApi`;
- `backupApiKey`;
- `password`;
- `pass`;
- `contraseña`;
- JWT con forma reconocible.

La sanitización es una defensa adicional.

La protección principal sigue siendo:

> no entregar secretos ni objetos arbitrarios al logger.

---

# 21. PT-LOG.3 — Logger persistente de Main — CERRADO

## 21.1. PT-LOG.3a

Commit:

`b84072ad58547a05613f9ab391611baff756a390`

**Terminado escritor persistente + rotación PT-LOG.3a**

Clase:

`FileApplicationLogger`

Ruta:

`electron/infrastructure/logging/file-application.logger.ts`

## 21.2. Archivo activo

`osumi-tpv.log`

Dentro de:

`osumi-tpv/logs/`

## 21.3. Rotación

Máximo por fichero:

**10 MiB**

Número máximo total:

**5 ficheros**

Es decir:

- `osumi-tpv.log`
- `osumi-tpv.1.log`
- `osumi-tpv.2.log`
- `osumi-tpv.3.log`
- `osumi-tpv.4.log`

Rotación:

```text
.4 se elimina
.3 → .4
.2 → .3
.1 → .2
actual → .1
```

## 21.4. Cola

Todas las escrituras comparten una única cola asíncrona.

Objetivos:

- mantener orden;
- evitar carreras de escritura;
- evitar carreras de rotación.

## 21.5. Tamaño defensivo por registro

Máximo:

**256 KiB**

Si una entrada completa es demasiado grande:

- se reduce mensaje;
- se elimina stack profundo;
- se eliminan causas/agregados;
- se sustituye contexto por:

```json
{
  "logRecordTruncated": true
}
```

Si incluso así supera el máximo:

- no se propaga;
- se usa fallback de emergencia.

## 21.6. Escritura

- `mkdir(..., { recursive: true })`;
- UTF-8;
- append;
- mode `0600`;
- rotación antes del append.

## 21.7. Contexto

Límites:

- máximo 32 entradas;
- clave máximo 100;
- string máximo 4096;
- números no finitos → `null`.

Claves sensibles se sustituyen por:

`[REDACTED]`

Se consideran sensibles claves relacionadas con:

- authorization;
- pass;
- password;
- contraseña;
- secret;
- token;
- apiKey.

## 21.8. Best effort

El logger nunca relanza sus propios fallos.

Fallback de emergencia:

```ts
console.error(...)
```

Este `console.error` es deliberado y no debe eliminarse mecánicamente: existe precisamente para el caso en que el sistema de logging persistente no puede funcionar.

---

# 22. PT-LOG.3b — Integración con ciclo de vida Electron — CERRADO

Commit:

`165d3712eb50f83ed2caf05dc84338542748ddd7`

**Terminado integración del logger en Electron PT-LOG.3b**

## 22.1. Creación

En `main.ts`, después de:

- resolver paths;
- crear directorios;
- `app.setAppLogsPath(...)`.

Se crea:

`FileApplicationLogger`

con:

- `logsDirectory`;
- `appVersion`.

## 22.2. Startup

Éxito:

- level `info`;
- area `application`;
- operation `startup`.

Fallo de startup cuando el logger ya existe:

- level `error`;
- area `application`;
- operation `startup`;
- `flush()` antes de `app.quit()`.

Si el startup falla **antes** de que el logger pueda existir:

- `console.error` de emergencia;
- `app.quit()`.

Ese `console.error` también es intencionado.

## 22.3. Shutdown

Antes de salir:

1. parar scheduler;
2. desconectar DB;
3. si falla disconnect:
   - `error`;
   - area `database`;
   - operation `disconnect`;
4. registrar shutdown:
   - `info`;
   - area `application`;
   - operation `shutdown`;
5. `flush()`;
6. `app.quit()`.

---

# 23. PT-LOG.4 — Renderer → Main — CERRADO

## 23.1. PT-LOG.4a — IPC seguro

Commit:

`2a18b52be311365735f58ea5acbfb56b79bd4205`

**Terminado puente IPC seguro PT-LOG.4a**

Arquitectura:

```text
Angular Renderer
↓
window.osumiDesktop.logging.write(...)
↓
preload
↓
IPC
↓
registerLoggingIpc
↓
RendererLogCommandValidator
↓
ApplicationLogger en Main
↓
FileApplicationLogger
```

Main es el **único escritor persistente**.

Renderer nunca escribe directamente al filesystem.

## 23.2. Validación IPC

Se valida sender mediante:

`assertTrustedSender`

Main nunca confía en el objeto recibido aunque proceda de la ventana principal.

Campos exactos admitidos:

- `level`;
- `area`;
- `operation`;
- `message`;
- `context`;
- `error`.

Propiedades adicionales:

**rechazadas**

## 23.3. Límites Renderer

- area: 100;
- operation: 120;
- message: 4096;
- contexto: 32 campos;
- clave contexto: 100;
- string contexto: 4096;
- error depth: 4;
- aggregate errors: 5;
- error name: 200;
- error message: 4096;
- stack: 16384.

Contexto:

solo:

- string;
- number finito;
- boolean;
- null.

## 23.4. Restauración del Error

Main reconstruye exclusivamente:

- Error;
- AggregateError;
- cause;
- name;
- message;
- stack.

Nunca reconstruye propiedades arbitrarias.

---

# 24. PT-LOG.4b — Integración Angular — CERRADO

Commit:

`73d4f2e28640e3294df41a43e5b9c5f9df26ca71`

**Terminado integrar logging con Angular PT-LOG.4b**

## 24.1. `ApplicationLoggingService`

Servicio Angular:

`src/app/services/application/application-logging.service.ts`

Expone:

- `debug()`;
- `info()`;
- `warn()`;
- `error()`.

Normaliza antes del IPC.

Es best-effort.

Si falla el bridge:

- no propaga;
- usa `console.error` de emergencia.

Ese fallback es intencionado.

## 24.2. `ApplicationErrorHandler`

Ruta:

`src/app/services/application/application-error-handler.service.ts`

Sustituye el `ErrorHandler` global de Angular.

Registra errores no controlados como:

- area `application`;
- operation `unhandled-renderer-error`;
- level `error`.

Mantiene además:

`console.error(...)`

para conservar la utilidad de desarrollo.

## 24.3. Regla de duplicación

`ApplicationErrorHandler` es **fallback global**.

No debe convertirse en el origen normal de errores ya controlados.

Cuando un flujo controlado:

1. conoce el contexto;
2. registra el error;
3. muestra UX adecuada;

debe evitar volver a propagarlo al handler global salvo que realmente siga siendo no controlado.

Ejemplo ya aplicado:

`SalesComponent.initialize()`

absorbe el fallo después de que `VentasContextService`:

- lo haya registrado;
- conserve el mensaje en su state.

---

# 25. Taxonomía cerrada de severidades

## 25.1. `debug`

Diagnóstico detallado.

No añadir ruido permanente sin una necesidad concreta.

## 25.2. `info`

Hito operativo relevante que terminó correctamente.

Ejemplos actuales:

- startup;
- shutdown;
- copia remota automática creada.

No registrar como `info` cada interacción ordinaria.

## 25.3. `warn`

Incidencia recuperable o degradación que no invalida la operación principal.

Ejemplos:

- venta ya confirmada pero falla PDF;
- venta confirmada pero falla impresión;
- limpieza temporal posterior;
- no se puede cargar un listado auxiliar;
- fallo post-COMMIT.

## 25.4. `error`

Fallo de la operación que se estaba intentando completar.

Ejemplos:

- no se puede persistir una venta;
- no se puede abrir caja;
- no se puede persistir el cierre;
- fallo de scheduler;
- no se puede crear backup solicitado.

## 25.5. No todo resultado negativo es log

No registrar automáticamente como error técnico:

- usuario cancela diálogo;
- búsqueda sin resultados;
- precondición local conocida;
- validación de dominio rechazada antes de tocar infraestructura;
- caja que ya no está abierta si el repository responde `null`;
- ausencia de resultados esperable;
- estado administrativo esperado;
- suscripción caducada como simple estado de negocio.

---

# 26. Seguridad y privacidad del logging

Nunca registrar:

- TPV Backup key;
- TPV Backup Secret;
- JWT;
- `secretApi`;
- `emailSmtpPass`;
- `ticketBaiToken`;
- passwords;
- tokens;
- Authorization headers;
- payload cifrado completo;
- requests/responses completas sin selección explícita;
- secretos incluidos accidentalmente en objetos.

Evitar también:

- nombres completos si no son necesarios;
- emails;
- teléfonos;
- direcciones;
- líneas completas de ticket;
- contenido fiscal completo;
- datos comerciales detallados.

Preferir:

- public IDs;
- IDs internos cuando ayuden;
- flags booleanos;
- counts;
- estado técnico;
- timestamps;
- nombres estables de operación.

---

# 27. Regla de origen único del error

Uno de los principios más importantes de PT-LOG:

> Cada incidencia debe registrarse preferentemente una sola vez, en la capa que conoce mejor su significado funcional.

Patrones recomendados:

## 27.1. Error técnico de repository

```text
validación
↓
command normalizado
↓
try repository
↓
catch
↓
log técnico
↓
rethrow
```

La capa superior:

- muestra UX;
- no vuelve a loguear el mismo error.

## 27.2. Post-COMMIT recuperable

```text
COMMIT correcto
↓
postproceso
↓
fallo
↓
warn
↓
convertir a warning de usuario
↓
continuar resto de postprocesos cuando sea posible
```

## 27.3. Error ya registrado en servicio Angular

```text
servicio
↓
log
↓
state/error visible
↓
rethrow si API lo necesita
```

El consumidor puede absorberlo si hacerlo evita que `ApplicationErrorHandler` vuelva a registrar la misma excepción.

---

# 28. PT-LOG.5 — Migración de puntos críticos

PT-LOG.5 está en curso.

El enfoque es deliberadamente incremental.

No se pretende “poner logs en todo”.

Se revisa cada flujo para decidir:

- si merece log;
- nivel;
- origen;
- contexto seguro;
- si ya existe otro origen;
- si es negocio esperado;
- si el error debe propagarse;
- si puede continuar el flujo.

---

# 29. PT-LOG.5a — Scheduler de backups — CERRADO

Commit:

`76888ad1ceec1c2703a55a689e10af5c7f6e5ef0`

**Terminado logging scheduler backups PT-LOG.5a**

Archivo principal:

`electron/backend/application/backup/backup-automatic-scheduler.service.ts`

Eventos:

### `automatic-backup-created`

- level: `info`
- area: `backup`
- contexto:
  - `lastSuccessfulAt`
  - `nextScheduledAt`

### `automatic-scheduler-evaluate`

- level: `error`
- area: `backup`
- error completo normalizado
- contexto:
  - `retryDelayMs`

### `automatic-scheduler-schedule`

- level: `error`
- area: `backup`
- contexto:
  - `nextScheduledAt`
  - `currentTime`
  - `retryDelayMs`

No se loguea cada evaluación normal para no generar ruido.

---

# 30. PT-LOG.5b — Gestión > Copias de seguridad — CERRADO

Commit:

`0e7a13bdef4e3032157f371b4c306344decd9f4f`

**Terminado logging pantalla backups PT-LOG.5b**

Archivo principal:

`src/app/modules/gestion/pages/management-backups/management-backups.component.ts`

Eventos `error`:

- `create-local`
- `create-remote`
- `download-remote`
  - contexto `backupPublicId`
- `remove-remote-configuration`
- `delete-remote`
  - contexto `backupPublicId`

Eventos `warn`:

- `load-automatic-status`
- `load-remote-connection`
- `load-remote-backups`
- `configure-remote`
- `reload-remote-backups`

No se incluyen credenciales en contexto.

No se registran éxitos de pantalla para evitar ruido.

---

# 31. PT-LOG.5c — Limpieza temporal TPV Backup — CERRADO

Commit:

`1b6d934d803c975e44cb41d9f28bee5d21608d14`

**Terminado logging limpieza backups PT-LOG.5c**

Se sustituyeron `console.error` de limpieza best-effort.

Eventos:

### `remote-upload-cleanup`

- level `warn`
- area `backup`

### `remote-download-cleanup`

- level `warn`
- area `backup`

No se guarda la ruta temporal en contexto.

Motivo:

- no es necesaria para diagnosticar;
- evita filtrar rutas locales;
- el fallo de cleanup no debe convertir un upload/download correcto en fallo funcional.

---

# 32. PT-LOG.5d — Post-COMMIT de Ventas — CERRADO

Commit:

`3227ac34c3119021f90b6e6e7fd8fd6fdbc96343`

**Terminado logging post-COMMIT ventas PT-LOG.5d**

Servicio:

`src/app/services/ventas/venta-post-commit.service.ts`

Principio:

> La venta ya está confirmada en SQLite. Los fallos siguientes son incidencias recuperables y deben ser `warn`.

Eventos:

### `post-commit-ticketbai`

- level `warn`
- context:
  - `idVenta`

### `post-commit-ticket-pdf`

- level `warn`
- context:
  - `idVenta`

### `post-commit-ticket-print`

- level `warn`
- context:
  - `idVenta`

### `post-commit-invoice-create`

Variantes:

- factura solicitada sin cliente persistido;
- venta confirmada sin publicId válido;
- fallo real creando factura.

Cuando existe fallo real:

- error técnico como propiedad del evento;
- context:
  - `ventaPublicId`.

No se registra contenido del cliente.

### `post-commit-invoice-print`

- level `warn`
- context:
  - `ventaPublicId`
  - `facturaPublicId`

No se registra número de factura como dato adicional porque no es necesario para el diagnóstico técnico.

---

# 33. PT-LOG.5e — Persistencia de Ventas — CERRADO

Commit:

`9ef5d784f15d7555de7d11fcaca10158cf4e07a6`

**Terminado logging persistencia ventas PT-LOG.5e**

Servicio Main:

`electron/backend/application/ventas/ventas-persistencia.service.ts`

Evento:

### `persist-sale`

- level `error`
- area `ventas`
- se registra **solo** si falla:
  - `ventasPersistenciaRepository.save(...)`

Contexto seguro:

- `ventaPublicId`
- `cajaPublicId`
- `lineCount`
- `paymentCount`
- `hasClient`
- `hasReturn`
- `reservationCount`

No se registran:

- nombres;
- artículos;
- importes;
- cliente;
- líneas;
- pagos;
- contenido completo del command.

## 33.1. Frontera de validación

Toda validación ocurre antes del `try/catch` técnico.

Por tanto:

venta inválida  
→ excepción de validación  
→ no repository  
→ no `error` técnico

fallo repository/SQLite  
→ `error`  
→ rethrow original

Los tests fijan esta diferencia como contrato.

## 33.2. Lección de integración

Al añadir una dependencia obligatoria como `ApplicationLogger` a un servicio:

- revisar composition;
- revisar todos los tests que construyan directamente el servicio;
- revisar fakes/integration tests.

Durante este bloque hubo tests antiguos que seguían construyendo el servicio con el constructor anterior. Se corrigieron antes del push.

---

# 34. PT-LOG.5f — Contexto Ventas + apertura Caja — CERRADO

Commit:

`0c7f079f782288e47c041290826fc364d0010b18`

**Terminado logging contexto ventas y apertura caja PT-LOG.5f**

Servicio Renderer:

`src/app/services/ventas/ventas-context.service.ts`

## 34.1. `load-context`

- level `error`
- area `ventas`
- error original
- sin contexto adicional.

Se produce si falla:

`window.osumiDesktop.ventas.getContext()`

## 34.2. `open-cash-register`

- level `error`
- area `caja`
- context:
  - `terminalPublicId`

Se produce si falla:

`window.osumiDesktop.caja.open(...)`

## 34.3. Precondición local

Si se intenta abrir caja sin haber cargado el contexto:

```text
No se puede abrir la caja sin haber cargado el contexto operativo.
```

No se registra como error técnico.

No se ha cruzado IPC.

## 34.4. Evitar duplicado global

`SalesComponent.initialize()` absorbe el error de inicialización después de que `VentasContextService`:

- lo registre;
- actualice su `errorSignal`.

Así se evita que el mismo error llegue de nuevo al `ApplicationErrorHandler`.

---

# 35. PT-LOG.5g — Cierre de Caja — CERRADO

Commit:

`6518202730e7a56a006d0bf5b502f6ac9a334703`

**Terminado logging cierre caja PT-LOG.5g**

Servicio Main:

`electron/backend/application/caja/caja.service.ts`

## 35.1. `load-close-snapshot`

- level `error`
- area `caja`
- context:
  - `cajaPublicId`

Solo se registra si:

`cajaRepository.findCierre(...)`

lanza una excepción técnica.

Si el repository devuelve:

`null`

porque la caja ya no está abierta:

- se lanza el error de negocio correspondiente;
- no se registra `error` técnico.

## 35.2. `close-cash-register`

- level `error`
- area `caja`
- context:
  - `cajaPublicId`
  - `recountEntryCount`
  - `paymentTypeCount`

No se registran:

- saldo inicial;
- efectivo contado;
- importes reales;
- importe retirado;
- entrada;
- diferencias;
- valores concretos de medios de pago.

El error se registra únicamente alrededor de:

`cajaRepository.close(...)`

después de todas las validaciones.

## 35.3. Validaciones

Ejemplo:

cierre sin recuento  
→ validación rechazada  
→ no repository  
→ no log técnico

Esta distinción está cubierta por tests.

## 35.4. Tests intermedios

Durante el desarrollo existieron dos fallos de los tests nuevos donde los eventos esperados no llegaban al fake logger.

Se corrigió el bloque antes del push.

Estado definitivo:

- tests correctos;
- build correcto;
- lint correcto;
- commit subido.

No conservar como referencia ninguna variante intermedia previa al commit `651820...`.

---

# 36. Catálogo actual de eventos de logging implantados

Esta lista sirve de referencia rápida.

## 36.1. Application / lifecycle

| Nivel | Área | Operación | Contexto |
|---|---|---|---|
| info | application | startup | — |
| error | application | startup | error |
| info | application | shutdown | — |
| error | database | disconnect | error |
| error | application | unhandled-renderer-error | error |

## 36.2. Backup

| Nivel | Área | Operación | Contexto |
|---|---|---|---|
| info | backup | automatic-backup-created | lastSuccessfulAt, nextScheduledAt |
| error | backup | automatic-scheduler-evaluate | retryDelayMs |
| error | backup | automatic-scheduler-schedule | nextScheduledAt, currentTime, retryDelayMs |
| error | backup | create-local | — |
| error | backup | create-remote | — |
| error | backup | download-remote | backupPublicId |
| warn | backup | load-automatic-status | — |
| warn | backup | load-remote-connection | — |
| warn | backup | load-remote-backups | — |
| warn | backup | configure-remote | — |
| error | backup | remove-remote-configuration | — |
| error | backup | delete-remote | backupPublicId |
| warn | backup | reload-remote-backups | — |
| warn | backup | remote-upload-cleanup | — |
| warn | backup | remote-download-cleanup | — |

## 36.3. Ventas

| Nivel | Área | Operación | Contexto |
|---|---|---|---|
| warn | ventas | post-commit-ticketbai | idVenta |
| warn | ventas | post-commit-ticket-pdf | idVenta |
| warn | ventas | post-commit-ticket-print | idVenta |
| warn | ventas | post-commit-invoice-create | según variante; ventaPublicId cuando existe |
| warn | ventas | post-commit-invoice-print | ventaPublicId, facturaPublicId |
| error | ventas | persist-sale | ventaPublicId, cajaPublicId, counts/flags |
| error | ventas | load-context | — |

## 36.4. Caja

| Nivel | Área | Operación | Contexto |
|---|---|---|---|
| error | caja | open-cash-register | terminalPublicId |
| error | caja | load-close-snapshot | cajaPublicId |
| error | caja | close-cash-register | cajaPublicId, recountEntryCount, paymentTypeCount |

---

# 37. Qué falta en PT-LOG.5

El mapa actual, acordado y consciente de lo ya cubierto, es el siguiente.

## 37.1. PT-LOG.5h — Caja: salidas / movimientos

**Siguiente bloque.**

Revisar:

- `findSalidas`;
- `createSalida`;
- `updateSalida`;
- `deleteSalida`;
- componentes/servicios Renderer asociados;
- `CajaService`;
- `CajaRepository`.

Objetivo:

- validaciones → sin falso error técnico;
- fallo repository/DB → `error`;
- errores de carga recuperables → valorar `warn`/`error` según impacto;
- evitar registrar concepto, descripción o importes si no son necesarios;
- preferir public IDs y contexto mínimo.

## 37.2. PT-LOG.5i — Ventas: flujos operativos secundarios

Revisar, entre otros:

- reservas;
- devolución;
- carga de ticket histórico;
- resolución/búsqueda de artículos;
- Varios;
- cambio cliente/tipo pago postventa;
- operaciones controladas que actualmente muestran `DialogService.alert`;
- servicios Angular que absorben errores y solo mantienen mensaje visible.

No todos deben generar log.

Ejemplos que probablemente **no** son error técnico por sí mismos:

- código no encontrado;
- reserva inexistente;
- operación bloqueada por estado actual;
- cancelación del usuario;
- validación del modelo.

## 37.3. PT-LOG.5j — Documentos / impresión / email / informes

Revisar:

- impresión de tickets fuera de lo ya cubierto por post-COMMIT;
- facturas fuera de ese flujo;
- protección de datos;
- comprobantes de reserva;
- email de ticket;
- email de factura;
- informes de Caja;
- generación/guardado de PDFs;
- apertura de diálogos de impresión.

Regla:

si el origen ya registra el error con suficiente contexto, no volver a registrarlo en el componente que solo muestra el aviso.

## 37.4. PT-LOG.5k — TicketBAI directo

PT-LOG.5d cubre el error de TicketBAI cuando se ejecuta como post-COMMIT inicial.

Todavía conviene auditar explícitamente:

- `processInitial`;
- `reconcile`;
- `retry`;
- llamadas manuales desde histórico;
- estados ambiguos;
- errores inesperados del cliente;
- fronteras `TicketBaiClientError`.

Nunca registrar:

- `ticketBaiToken`;
- payload fiscal completo;
- Authorization;
- respuesta remota completa si puede contener datos fiscales innecesarios.

## 37.5. PT-LOG.5l — Auditoría técnica final

Antes de cerrar PT-LOG.5 revisar:

- filesystem;
- SQLite / TypeORM;
- startup/shutdown;
- `console.error`;
- `console.warn`;
- `console.log`;
- `catch`;
- `getErrorMessage`;
- `DialogService.alert`;
- promesas rechazadas;
- errores silenciosos;
- duplicados Main/Renderer;
- operaciones de red no cubiertas;
- servicios de configuración relevantes.

Importante:

no considerar automáticamente todos los `console.error` como deuda.

Existen `console.error` intencionados de emergencia en:

- startup antes de existir logger;
- `FileApplicationLogger` cuando él mismo falla;
- `ApplicationLoggingService` cuando falla el bridge;
- `ApplicationErrorHandler` para mantener utilidad en desarrollo.

---

# 38. PT-LOG.6 — Soporte / acceso a logs — PENDIENTE

Objetivo final del usuario:

poder recuperar posteriormente la información necesaria para soporte.

Todavía no se ha cerrado la UX.

Opciones a estudiar:

- abrir carpeta de logs;
- exportar paquete de soporte;
- copiar ruta;
- ZIP explícito de soporte;
- rango temporal;
- selección de archivos;
- posible información de versión/entorno junto a los logs.

Regla:

**un paquete de soporte no es un backup `.otpv`.**

Si se implementa exportación:

- revisar privacidad;
- no exportar secretos;
- no incluir archivos operativos innecesarios;
- diseñar flujo explícito.

---

# 39. PT-LOG.7 — Regresión final — PENDIENTE

Antes de terminar la pausa técnica probar al menos:

## 39.1. Persistencia

- escritura normal;
- múltiples escrituras;
- orden;
- `flush`.

## 39.2. Rotación

- superar 10 MiB;
- rotación exacta;
- máximo 5 archivos;
- eliminación del más antiguo.

## 39.3. Sanitización

- Bearer;
- JWT;
- token;
- password;
- secret;
- apiKey;
- claves sensibles de contexto.

## 39.4. Límites

- contexto >32;
- strings largos;
- stack largo;
- cause profundo;
- AggregateError grande;
- record >256 KiB;
- números no finitos.

## 39.5. Fallos del propio logger

- directorio no disponible;
- append fallido;
- rotate fallido;
- logger no debe romper venta/operación.

## 39.6. Renderer

- IPC inválido;
- sender no fiable;
- propiedades extra;
- tipos no permitidos;
- error global.

## 39.7. Funcional

Simular puntos críticos:

- backup;
- venta;
- caja;
- impresión;
- TicketBAI;
- filesystem;
- DB.

## 39.8. Batería completa

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

---

# 40. Logging y `.otpv`

Contrato vigente:

`logs/`  
→ NO portable  
→ NO incluido en `.otpv`

Razones:

- logs pertenecen al terminal;
- diagnóstico local;
- pueden contener contexto operativo;
- no son necesarios para restaurar;
- aumentan tamaño;
- trasladarlos entre terminales sería innecesario.

No modificar este contrato durante PT-LOG.5/6.

Si se crea “paquete de soporte”:

debe ser:

- independiente;
- explícito;
- separado de backup/restore.

---

# 41. Logging y TPV Backup

Los backups automáticos pueden fallar sin mostrar modal repetitivo.

Por eso el logging es especialmente útil.

Semántica deseada:

```text
scheduler
↓
fallo red/auth/etc.
↓
error persistente
↓
pending permanece
↓
retry posterior
```

No registrar como ruido:

- cada evaluación normal;
- no pendiente;
- estados rutinarios sin incidencia.

Sí se registra actualmente:

- éxito real de backup automático;
- fallo de evaluación;
- fallo de scheduling;
- fallos de UI de Gestión relevantes;
- cleanup temporal.

---

# 42. Logging y Ventas

Ventas es el flujo más crítico operativamente.

Principio:

> El logging no debe alterar la frontera del COMMIT.

Antes del COMMIT:

- fallo persistiendo venta → `error`;
- validación del command → no error técnico.

Después del COMMIT:

- TicketBAI/PDF/impresión/factura → `warn`;
- venta sigue siendo válida y no debe repetirse `save()`.

Esto queda ya implementado y probado.

---

# 43. Logging y Caja

Reglas ya establecidas:

## Apertura

Fallo real IPC → `error`.

Precondición local sin contexto cargado → no log técnico.

## Snapshot de cierre

Repository lanza → `error`.

Repository devuelve `null` porque caja no está abierta → estado de negocio, no log técnico.

## Persistencia de cierre

Validación → no log técnico.

Repository falla → `error`.

## Contexto económico

Evitar incluir en log:

- cantidades de recuento;
- importes;
- diferencias;
- saldos.

Preferir:

- public IDs;
- counts.

Este patrón debe reutilizarse en PT-LOG.5h para salidas/movimientos.

---

# 44. Logging y TicketBAI

Librería:

`@osumi/ticketbaiws 1.0.1`

Estado del flujo fiscal:

- envío inicial implementado;
- histórico/reconciliación/reintento implementados;
- 12C.9 pendiente de Berein.

Reglas de logging:

- token nunca;
- payload fiscal completo nunca por defecto;
- respuesta completa nunca por defecto;
- usar IDs/estado/operación;
- distinguir rechazo conocido de error técnico inesperado;
- mantener la máquina de estados fiscal como fuente de verdad;
- no convertir una incidencia post-COMMIT en una venta repetible.

---

# 45. Estado separado de TicketBAI 12C.9

Pendiente:

**respuesta / actualización de Berein**

No mezclar esta espera con la pausa de logging.

Cuando Berein responda habrá que revisar:

- tipos;
- endpoints;
- documentación;
- posibles cambios del SDK;
- posibles cambios del Client;
- decisiones de `@osumi/ticketbaiws`.

---

# 46. `console.error` intencionados

Durante la auditoría final no eliminar mecánicamente estos casos:

## 46.1. Startup antes de logger

Si `applicationLogger === null` y falla arranque:

`console.error`

es el único fallback disponible.

## 46.2. `FileApplicationLogger`

Si falla el propio logger:

`console.error`

es el canal de emergencia.

## 46.3. `ApplicationLoggingService`

Si falla el IPC de logging:

`console.error`

es el fallback Renderer.

## 46.4. `ApplicationErrorHandler`

Conserva `console.error` además del registro persistente para desarrollo.

Estos usos son intencionados mientras no se diseñe una alternativa superior.

---

# 47. Patrones que NO deben introducirse

Evitar:

- ❌ reemplazar todos los `console.error` masivamente;
- ❌ registrar cada `catch`;
- ❌ registrar cada éxito;
- ❌ loguear objetos completos;
- ❌ loguear secrets;
- ❌ añadir contexto “por si acaso”;
- ❌ registrar importes/cliente si no ayudan al diagnóstico;
- ❌ duplicar Main + Renderer;
- ❌ registrar validaciones normales como errores técnicos;
- ❌ escribir filesystem desde Angular;
- ❌ hacer `await` del logging si puede bloquear la operación sin necesidad;
- ❌ hacer que un fallo de logging modifique el resultado funcional;
- ❌ meter `logs/` en `.otpv`;
- ❌ cuerpos de método vacíos en mocks/fakes/tests.

---

# 48. Commits clave de la pausa técnica

Cronología:

`eaa0c4a09fdc8746d2de022b4da3b0960adecae8`  
**Terminado contratos y normalización de logging PT-LOG.2a**

`b84072ad58547a05613f9ab391611baff756a390`  
**Terminado escritor persistente + rotación PT-LOG.3a**

`165d3712eb50f83ed2caf05dc84338542748ddd7`  
**Terminado integración del logger en Electron PT-LOG.3b**

`2a18b52be311365735f58ea5acbfb56b79bd4205`  
**Terminado puente IPC seguro PT-LOG.4a**

`73d4f2e28640e3294df41a43e5b9c5f9df26ca71`  
**Terminado integrar logging con Angular PT-LOG.4b**

`76888ad1ceec1c2703a55a689e10af5c7f6e5ef0`  
**Terminado logging scheduler backups PT-LOG.5a**

`0e7a13bdef4e3032157f371b4c306344decd9f4f`  
**Terminado logging pantalla backups PT-LOG.5b**

`1b6d934d803c975e44cb41d9f28bee5d21608d14`  
**Terminado logging limpieza backups PT-LOG.5c**

`3227ac34c3119021f90b6e6e7fd8fd6fdbc96343`  
**Terminado logging post-COMMIT ventas PT-LOG.5d**

`9ef5d784f15d7555de7d11fcaca10158cf4e07a6`  
**Terminado logging persistencia ventas PT-LOG.5e**

`0c7f079f782288e47c041290826fc364d0010b18`  
**Terminado logging contexto ventas y apertura caja PT-LOG.5f**

`6518202730e7a56a006d0bf5b502f6ac9a334703`  
**Terminado logging cierre caja PT-LOG.5g**

Commits de actualización de librerías durante la misma jornada:

`0a48dd5b2caa01054870d5767a7c250efca5a083`  
**Actualización de librerías**

`0a9f84fdef8a1500b8b9e9a74d784a8b9d1b4c33`  
**Actualizo Angular CLI (22.2.1 -> 22.2.2), Angular (22.2.1 -> 22.2.2) y Angular Material (22.2.1 -> 22.2.2)**

---

# 49. Commits clave de 21.9

Referencia histórica útil:

`86acb9565b602f6353e396832ee8018a95136780`  
Terminado incluir `backupAutomaticTime` 21.9.1a

`96661d3e2d809185a393ecc8e486f6813bebe1f4`  
Corrección UX de logo obligatorio

`3588d60b6da922f3bc7f765c6a502fc9df2a778c`  
Retoques estéticos hora backups

`3a76fb7739ed8c0e1195f43318d45963895bf992`  
Compatibilidad backups antiguos 21.9.1c

`42bad51b5c7cc4abe531ca165575f71a52aa8c93`  
Resolver horario automático 21.9.2a

`7f2181e3a4809ff1fe021c79fecadcb31ab4299f`  
Persistencia `lastSuccessfulAt` 21.9.2b

`81f74f1addbff1b62e47d4f27b1bcb9ce1e71e30`  
Corrección 21.9.2b

`570304da1abe50e9cbf9196749c6bfd17944ec3f`  
Servicio estado scheduler 21.9.2c

`382b6213532dad1a87f96716c2d733dbaea4b7f5`  
Ejecutor aislado 21.9.3a

`e496dd7186a2c8f60914cbfa7b4befd7f1482d19`  
Composición real 21.9.3b

`80f2c54ccffa9b4847bd24becd367d6c570fbf57`  
Reset estado al reemplazar instalación 21.9.3c

`3b87982466722ef4d7488db1eef4c9f434716d12`  
Motor scheduler 21.9.4a-1

`f34f0b7031c00a328d05be6e9d3fca8f75f86542`  
Startup/stop real 21.9.4a-2

`cf86a64d94446a07872ba2f96cfd8eddc50427ee`  
Reanudación desde suspensión 21.9.4b

`2d81e1cbb33eea84c59e2f0762e039484a262183`  
Cambios configuración en caliente 21.9.4c

`157e6a214bdb806b2b62ebdaeeb175e49ffb496b`  
Consulta pública Main → Renderer 21.9.5a

`cacc941a0b7805ed58a6a65581b65dcd3897337e`  
UI última copia automática 21.9.5b

---

# 50. Arquitectura crítica que no debe romperse

## 50.1. Snapshot SQLite

Nunca copiar SQLite operacional directamente.

Usar snapshot consistente.

## 50.2. Zero knowledge TPV Backup

Servidor:

- nunca recibe TPV Backup key;
- nunca descifra `payload.enc`.

## 50.3. Restore

Credenciales remotas temporales:

```text
RAM
↓
finalize
↓
safeStorage definitivo
```

## 50.4. Scheduler

Manual:

`backup manual ≠ backup automático`

Fallo:

`fallo ≠ éxito`

Catch-up:

`varios días pendientes → una sola copia`

## 50.5. Logging

Renderer:

`NO filesystem`

Main:

`único escritor`

Seguridad:

`contexto escalar explícito`

Errores:

`sin propiedades arbitrarias`

Backup:

`logs/ NO portable`

---

# 51. Bugs históricos ya resueltos que no deben reabrirse

- estado stale de TPV Backup en Gestión;
- `getConnection()` remoto stale;
- credenciales temporales restore;
- limpieza tras instalación incompleta;
- integridad SHA en upload/download;
- ruta `.tmp` del estado automático;
- duplicados del scheduler;
- resume tras suspensión;
- cambios de configuración en caliente;
- UI de `mat-error` transparente;
- compatibilidad backup antiguo sin hora automática.

Solo revisarlos si aparece evidencia nueva.

---

# 52. Hito 22 — POSPUESTO

Siguiente gran hito funcional:

**Hito 22 — Sincronización tienda online**

Estado:

⏳ pendiente

No comenzar todavía.

Orden acordado:

```text
✅ Hito 21
↓
▶️ Pausa técnica — Logging transversal
↓
⏳ Hito 22 — Sincronización tienda online
```

Al terminar PT-LOG.7 conviene generar un nuevo documento de continuidad antes de iniciar Hito 22.

---

# 53. Checklist para una conversación nueva

Si se alcanza el límite de contexto:

1. localizar el documento de continuidad más reciente;
2. si es v2.91, asumir:
   - Hito 21 cerrado;
   - logging en curso;
   - PT-LOG.5a–5g cerrados;
   - próximo bloque PT-LOG.5h;
   - Hito 22 aún no iniciado;
3. revisar `main`;
4. comparar HEAD Client con:

   `6518202730e7a56a006d0bf5b502f6ac9a334703`

5. si hay commits posteriores, leerlos antes de proponer nada;
6. releer los archivos exactos del bloque que se vaya a tocar;
7. mantener aliases absolutos;
8. mantener convención de exports;
9. JSDoc/PHPDoc;
10. nunca proporcionar métodos vacíos;
11. trabajar en bloques pequeños;
12. probar después de cada bloque;
13. no avanzar si los tests fallan;
14. indicar siempre:
    - dónde estamos;
    - qué hacemos;
    - qué queda;
15. para logging:
    - no duplicar;
    - contexto mínimo;
    - sin secretos;
    - validación ≠ error técnico;
    - post-COMMIT recuperable → normalmente `warn`;
    - fallo que invalida la operación → normalmente `error`.

---

# 54. Punto exacto de cierre de esta continuidad

Al generar v2.91:

## Osumi TPV Client

HEAD:

`6518202730e7a56a006d0bf5b502f6ac9a334703`

**Terminado logging cierre caja PT-LOG.5g**

## Estado lógico

- ✅ Hito 21 — TPV Backup
- ✅ 21.9 — Backups remotos automáticos
- ✅ regresión funcional real Hito 21
- ✅ PT-LOG.1
- ✅ PT-LOG.2
- ✅ PT-LOG.3
- ✅ PT-LOG.4
- ✅ PT-LOG.5a
- ✅ PT-LOG.5b
- ✅ PT-LOG.5c
- ✅ PT-LOG.5d
- ✅ PT-LOG.5e
- ✅ PT-LOG.5f
- ✅ PT-LOG.5g
- ▶️ PT-LOG.5h — Caja: salidas / movimientos
- ⏳ resto de PT-LOG.5
- ⏳ PT-LOG.6
- ⏳ PT-LOG.7
- ⏳ Hito 22 — Sincronización tienda online
- ⏸ TicketBAI 12C.9 — espera Berein

Cuando este documento sea subido al repositorio:

`docs/osumi-tpv-continuidad-v2.91.md`

debe sustituir a v2.90 como referencia principal de continuidad.

---

# 55. Regla final

Para continuar:

```text
main actual
→ continuidad más reciente
→ conversación activa
```

Y durante la pausa técnica recordar siempre el objetivo central:

> Los errores deben seguir siendo manejables para el usuario en el momento, pero además deben dejar una traza persistente, segura y útil para poder diagnosticar después qué ocurrió realmente.

La meta no es “tener muchos logs”.

La meta es tener **los logs correctos, en el punto correcto, con la severidad correcta y sin comprometer la operación ni la seguridad**.
