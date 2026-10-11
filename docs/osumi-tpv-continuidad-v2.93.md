# Osumi TPV Client — Documento de continuidad v2.93

**Fecha:** 11 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** https://github.com/osumionline/Osumi-TPV-Client  
**Repositorio TPV Backup API:** https://github.com/osumionline/TPV-Backup-API  
**Repositorio TPV Backup Front:** https://github.com/osumionline/Osumi-TPV-Backup-Front

Este documento actualiza y sustituye como referencia principal de continuidad a:

`docs/osumi-tpv-continuidad-v2.92.md`

La fuente de verdad para continuar el desarrollo será siempre:

**main actual de los repositorios + documento de continuidad más reciente + conversación activa**

La v2.93 se genera con `main` en:

`ee3fa7dd8191b59a9ecb52b91b60d24942ce3297`

**Terminado logging snapshot backup PT-LOG.5l-10b**

Desde v2.92 se han incorporado **17 commits** al Client y se han tocado **38 archivos**.

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
- ▶️ PAUSA TÉCNICA — Logging transversal y diagnóstico persistente
- ✅ PT-LOG.1 — Auditoría y diseño
- ✅ PT-LOG.2 — Contratos y normalización
- ✅ PT-LOG.3 — Logger persistente de Main
- ✅ PT-LOG.4 — Renderer → Main + integración Angular
- ▶️ PT-LOG.5 — Migración de puntos críticos
- ✅ PT-LOG.5a — Scheduler de backups automáticos
- ✅ PT-LOG.5b — Gestión > Copias
- ✅ PT-LOG.5c — Limpieza temporal TPV Backup
- ✅ PT-LOG.5d — Post-COMMIT de Ventas
- ✅ PT-LOG.5e — Persistencia de Ventas
- ✅ PT-LOG.5f — Contexto de Ventas + apertura de Caja
- ✅ PT-LOG.5g — Lectura/cierre definitivo de Caja
- ✅ PT-LOG.5h — Salidas de Caja
- ✅ PT-LOG.5i — Flujos secundarios de Ventas
- ✅ PT-LOG.5j — Documentos / impresión / email / informes
- ✅ PT-LOG.5k — TicketBAI directo
- ▶️ PT-LOG.5l — Auditoría técnica final
- ✅ PT-LOG.5l-1 — Estado de aplicación / DB
- ✅ PT-LOG.5l-2 — Configuración / rollback
- ✅ PT-LOG.5l-3a — Instalación
- ✅ PT-LOG.5l-3b — Staging / finalizer
- ✅ PT-LOG.5l-4 — Estado de backups automáticos
- ✅ PT-LOG.5l-5 — Gestión > Ajustes
- ✅ PT-LOG.5l-6 — Nueva instalación
- ✅ PT-LOG.5l-7 — Cleanup descargas TPV Backup
- ✅ PT-LOG.5l-8 — Finalización / recuperación restore OTPV
- ✅ PT-LOG.5l-9a — Cleanup unlock OTPV
- ✅ PT-LOG.5l-9b — Native Restore Renderer
- ✅ PT-LOG.5l-10a — Cleanup staging restore
- ✅ PT-LOG.5l-10b — Cleanup snapshot SQLite backup
- ⏳ residuos finales de PT-LOG.5l
- ⏳ PT-LOG.6 — Soporte / acceso / exportación de logs
- ⏳ PT-LOG.7 — Regresión final
- ⏳ PAUSA TÉCNICA — Compatibilidad Windows / Linux
- ⏳ Hito 22 — Sincronización tienda online
- ⏸ TicketBAI 12C.9 — pendiente de Berein

## 1.2. Punto exacto de continuación

Seguimos dentro de:

**PT-LOG.5l — Auditoría técnica final**

Frente inmediato ya identificado:

- corregir falsos “no existe” de filesystem:
  - `ElectronLogoStorage.exists()`;
  - `YazlOtpvV3PayloadBuilder.assertDestinationDoesNotExist()`.

Después quedan como frentes conocidos:

- `ClienteFacturasService`, especialmente operaciones mutantes;
- selección/restauración remota restante (`selectRemotePackage()` y ownership Main/Renderer);
- búsqueda de Imprenta y otros `catch` funcionales todavía absorbidos;
- confirmación final de UX post-COMMIT de facturas;
- barrido final de `console.*`;
- barrido final de `catch` silenciosos;
- verificación de duplicados Main / IPC / Renderer.

Orden:

```text
PT-LOG.5l — auditoría técnica final
↓
PT-LOG.6 — soporte/acceso/exportación
↓
PT-LOG.7 — regresión final
↓
PAUSA TÉCNICA — Windows/Linux
↓
Hito 22 — sincronización tienda online
```

---

# 2. Estimación de avance

La estimación mide trabajo técnico, no calendario.

## PT-LOG.5 — Migración de puntos críticos

**≈ 95% completado**

Las grandes áreas ya están instrumentadas. Lo pendiente es residual: ownership, cleanup, errores absorbidos y barrido final.

## PT-LOG.5l — Auditoría técnica final

**≈ 75–80% completado**

Ya se han cerrado trece frentes/subfrentes relevantes. Quedan aproximadamente **3–6 bloques pequeños o medios + el barrido final**, salvo que la auditoría descubra algo estructural nuevo.

## Pausa completa de logging — PT-LOG.1 a PT-LOG.7

**≈ 80–85% completado**

Centro orientativo:

**≈ 82%**

Una vez cerrado PT-LOG.5l, la pausa debería quedar aproximadamente en el entorno de **88–90%**, quedando PT-LOG.6 y PT-LOG.7.

Referencia razonable del trabajo restante de logging:

- PT-LOG.5l: ~3–6 bloques + cierre;
- PT-LOG.6: ~1–3 bloques;
- PT-LOG.7: ~1–2 bloques.

Por tanto, quedan aproximadamente **6–11 bloques coherentes** para cerrar toda la pausa de logging.

No extrapolar este porcentaje al Hito 22: antes existe una pausa Windows/Linux cuyo alcance todavía debe auditarse.

---

# 3. HEADs al generar v2.93

## Osumi TPV Client

HEAD verificado:

`ee3fa7dd8191b59a9ecb52b91b60d24942ce3297`

**Terminado logging snapshot backup PT-LOG.5l-10b**

## TPV Backup API

HEAD verificado:

`d1d3bdcde95d0e7d848347ec434b499025caa1b5`

**Tarea de reconciliacion 21.7.3a**

## TPV Backup Front

Último HEAD de referencia conservado desde v2.92:

`1be138f8e280646b9419f9fe60287111174e890e`

**Corrección en mensaje al desactivar subscripción**

Este repositorio no se ha podido volver a verificar desde el conector al generar v2.93; tratar este SHA como última referencia conocida, no como HEAD confirmado actual.

---

# 4. Forma de trabajo acordada

Antes de proponer código:

1. revisar `main`;
2. leer los archivos exactos implicados;
3. no inventar rutas, clases, contratos, helpers ni APIs;
4. reutilizar arquitectura y pipelines existentes;
5. distinguir decisiones cerradas de propuestas pendientes;
6. tras cada push confirmado, volver a revisar `main`;
7. no asumir que una búsqueda vacía de GitHub implica que algo no existe;
8. GitHub desde ChatGPT es estrictamente de solo lectura.

Entrega:

- archivo nuevo → ruta exacta + contenido completo;
- archivo existente → ruta exacta + bloque identificable + reemplazo exacto;
- bloques pequeños;
- tests antes de continuar;
- no avanzar con tests fallidos.

En cada mensaje de desarrollo:

- **Dónde estamos**
- **Qué estamos haciendo**
- **Qué queda por delante**

---

# 5. Convenciones permanentes

## TypeScript exports

- 1 símbolo exportado → `export default`
- 2 o más → exports nominales

## Imports

Usar aliases cuando existan:

- `@bootstrap/*`
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

## JSDoc/PHPDoc

Todo método creado o modificado debe documentarse.

## Métodos sin cuerpo vacío

Nunca proporcionar `{}` vacío, tampoco en tests/mocks/stubs/fakes.

Un no-op explícito:

```ts
void event;
```

## Angular

Base actual:

- Angular 22.2.2
- Material 22.2.2
- standalone
- zoneless
- signals
- Signal Forms

Mantener:

- `inject()`;
- `input()` / `output()`;
- signal queries;
- `@if/@for/@switch`;
- tipado estricto;
- `unknown` en vez de `any`;
- Angular Material;
- `MatTooltip`;
- sin NgModule;
- evitar CommonModule;
- sin HostBinding/HostListener;
- sin ngClass/ngStyle;
- WCAG AA.

---

# 6. Baterías de pruebas

Batería completa:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

Renderer:

```bash
npm test
npm run build
npm run lint
```

Main/Electron:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Antes de cerrar PT-LOG.7 debe ejecutarse la batería completa.

---

# 7. Versiones relevantes actuales

Verificadas desde `package.json`:

- Angular / CDK / Material / CLI `^22.2.2`
- Electron `^44.7.0`
- TypeScript `~6.0.2`
- Vitest `^5.0.3`
- `@types/node` `^26.6.5`
- better-sqlite3 `^12.11.1`
- TypeORM `^1.1.2`
- yauzl `^3.4.0`
- yazl `^3.3.1`
- sharp `^0.35.5`
- nodemailer `^10.1.0`
- `@osumi/angular-tools` `^1.5.2`
- `@osumi/ticketbaiws` `^1.0.1`
- npm `12.2.0`

Actualización de librerías incluida:

`dbee9467eccc2e05a9e00a7de43d3eaa078814fe`

---

# 8. Hito 21 — CERRADO

Incluye `.otpv` v3, creación local, restore nativo, importación legacy, almacenamiento remoto, autenticación, integridad, seguridad, retención, descarga, borrado, restore remoto, backups remotos automáticos y regresión funcional.

No reabrir salvo evidencia nueva.

---

# 9. `.otpv` v3 — contrato consolidado

ZIP exterior:

- `manifest.json`
- `payload.enc`

Payload portable:

- `database/osumi-tpv.sqlite`
- `config/app_data.json`
- `assets/logo.webp`
- `secrets/secrets.json`
- `files/**`

No portable:

- `printing_settings.json`
- `backup_automatic_state.json`
- `logs/`
- `backups/`
- `staging/`
- TPV Backup key
- JWT

Criptografía:

- `otpv3-scrypt-aes-256-gcm`
- scrypt salt 32
- cost 32768
- blockSize 8
- parallelization 3
- length 32
- AES-256-GCM
- IV 12
- auth tag 16
- DEK aleatoria
- KEK derivada

Máximo: **8 GiB**.

Nunca copiar SQLite operacional directamente; usar snapshot consistente.

---

# 10. Logging — arquitectura consolidada

Principios:

- best-effort;
- Main único escritor;
- Renderer no toca filesystem;
- una incidencia una vez;
- ownership en la capa con significado funcional;
- contexto escalar explícito;
- validación/cancelación/estado esperado no son automáticamente incidencias;
- cleanup secundario no oculta error principal.

Niveles:

`debug | info | warn | error`

Fuentes:

`main | renderer`

Contexto:

`string | number | boolean | null`

Persistencia:

- `osumi-tpv.log`
- 10 MiB
- máximo 5 ficheros
- cola asíncrona
- modo `0600`
- record máximo 256 KiB
- contexto máximo 32

Nunca registrar:

- TPV Backup key/Secret;
- JWT;
- `secretApi`;
- password SMTP;
- token TicketBAI;
- Authorization;
- payload cifrado;
- requests/responses completas;
- datos personales/fiscales/comerciales salvo necesidad explícita.

Normalizador:

- `name`
- `message`
- `stack`
- `cause`
- `AggregateError.errors`
- límites de profundidad/cantidad/texto
- no recorre propiedades arbitrarias del error

---

# 11. PT-LOG.5a–5j — CERRADOS

No reabrir sin evidencia nueva.

Principios heredados:

- post-COMMIT recuperable → normalmente `warn`;
- fallo que invalida una operación → normalmente `error`;
- cancelación → sin log;
- precondición conocida → sin log;
- infraestructura compartida de impresión/Chromium sin logger si la capa funcional ya es propietaria;
- contexto mínimo en documentos sensibles.

La v2.92 conserva el detalle histórico exhaustivo de PT-LOG.5h–5j.

---

# 12. PT-LOG.5k — TicketBAI directo — CERRADO

Commits:

- `8833947aa86ade9bc57f5c588de4b0f3bb6924b5` — inicial
- `e5b1e8025b36a141243d604a4218ea521a7306b1` — reconciliación
- `25069080fd54bc666231d199c6c6057f339e3f34` — retry manual

Cubierto:

- `processInitial()`
- `reconcile()`
- `retry()`

Reglas:

- ID inválido → no log;
- registro inexistente → no log;
- estado que no permite la operación → no log;
- intento operativo real fallido → `warn`;
- contexto seguro: `idVenta`;
- nunca token/payload fiscal/respuesta completa/Authorization.

`TicketBaiClientError.responsePayload` no se incorpora automáticamente porque el normalizador no recorre propiedades arbitrarias.

No fue necesario PT-LOG.5k-4.

---

# 13. PT-LOG.5l — Auditoría técnica final — EN CURSO

Se trabaja por fronteras pequeñas.

Para cada `catch` se decide:

1. estado esperado o incidencia;
2. propagado o absorbido;
3. ownership;
4. duplicado;
5. severidad;
6. contexto seguro.

No migrar `catch` mecánicamente.

---

# 14. PT-LOG.5l cerrados desde v2.92

## 5l-1 — Estado aplicación / DB

Commit `9f7e11b23138ea82f004ccad3403d4db028abfc2`

- DB inválida → `error`
- cleanup QueryRunner/DataSource → `warn`
- fallos reales de stat dejan de ocultarse
- sin rutas absolutas

## 5l-2 — Configuración / rollback

Commit `354c439b72bbc409da3839128a978976888a9c74`

- `error configuration/update-configuration`
- `warn configuration/rollback-app-data`
- `warn configuration/rollback-secrets`

## 5l-3a — Instalación

Commit `0f19638f9c27133eca087b3e898269d0697abf79`

- `error installation/install`
- `warn installation/recover-incomplete-installation`

## 5l-3b — Staging/finalizer instalación

Commit `e561efc63e434795ffd93b60211d32d83bcbe504`

- `warn installation/cleanup-installation-staging-after-error`
- `warn installation/cleanup-installation-staging`

## 5l-4 — Estado automático de backups

Commit `a7e9e7e9a1e83cf33c19d5880dfae39a6c5bece3`

- ENOENT → sin log
- JSON/estructura inválida → `warn`
- otros filesystem → propagar

## 5l-5 — Gestión > Ajustes

Commit `12ce120635136c8f7327a1feef70b7d22c58981d`

Migrados los `console.error` de impresoras/logo/configuración de impresión. Revelación de secretos pasa a Main.

## 5l-6 — Nueva instalación

Commit `f6e97f113e9882ebf7c97c193dd6849927e61a5a`

Migrados impresoras/logo/TPV Backup/rollback y ownership Main/Renderer.

## 5l-7 — Descargas TPV Backup

Commit `8d00f36573b2b2bd4e90e16dfdbabce295c433f1`

- `warn backup/remote-download-stream-cancel`
- `warn backup/remote-download-partial-close`
- cleanup final sin duplicado

## 5l-8 — Finalización restore OTPV

Commit `00d98f7c942db8bc1622c5434aa6e3daafeb102e`

- `error backup/finalize-restore`
- `warn backup/restore-remote-credentials-cleanup`
- `warn backup/recover-incomplete-restore`

## 5l-9a — Cleanup unlock OTPV

Commit `15d4a25bcee8ed5d6491e46d45651c707489154d`

- `warn backup/restore-unlock-workspace-cleanup`
- `warn backup/restore-unlock-staging-cleanup`

Clave incorrecta/copia dañada no se registra como error principal esperado.

## 5l-9b — Native Restore Renderer

Commit `721d48576d926ef261d871d9a8a7a8924e21db49`

- `warn backup/clear-remote-restore-selection`
- `warn backup/disconnect-remote-restore-on-destroy`
- `warn backup/connect-remote-restore`
- `warn backup/disconnect-remote-restore`

## 5l-10a — Cleanup staging restore

Commit `268b75fa2e68117dc8bff6073da72f4ece8d0d8e`

- `warn backup/restore-staging-cleanup`
- `warn backup/restore-workspace-cleanup`

## 5l-10b — Snapshot SQLite temporal

Commit `ee3fa7dd8191b59a9ecb52b91b60d24942ce3297`

- `warn backup/payload-snapshot-cleanup`
- el fallo de cleanup no convierte un backup correcto en fallido
- sin ruta física en contexto

---

# 15. Residuos conocidos de PT-LOG.5l

## Filesystem: falsos “no existe”

### `ElectronLogoStorage.exists()`

Ahora cualquier error de `access()` se transforma en `false`.

Hay que distinguir ENOENT de EACCES/EPERM/otros.

### `YazlOtpvV3PayloadBuilder.assertDestinationDoesNotExist()`

Mismo patrón: un `catch` indiscriminado de `access()` puede interpretar error técnico como ausencia.

Revisar ambos juntos.

## `ClienteFacturasService`

Pendiente revisar operaciones mutantes:

- `createBorrador`
- `updateBorrador`
- `deleteBorrador`
- `emitBorrador`
- `createFacturaDesdeVenta`
- `anularFactura`

Separar validaciones, persistencia, concurrencia y duplicados con preview/documentos/email.

## Restore remoto

Pendiente revisar:

- `selectRemotePackage()`
- `BackupRemoteRestoreSelectionService`
- `BackupRemoteDownloadService`

No instrumentar Renderer genéricamente antes de decidir ownership Main.

## Imprenta

`getImprentaPrintArticulos()` ya está cubierto.

Pendiente comprobar búsqueda:

- `searchImprentaArticulos()`
- `ImprentaComponent.search()`

## Factura post-COMMIT

Ya existe `clientes/post-commit-invoice-preview-refresh`.

Confirmar que UX no muestre como “fallo al emitir” una factura ya emitida cuyo único fallo fue el refresco posterior.

## Barrido final

Antes de cerrar 5l revisar:

- `console.error/warn/log/info/debug`
- `catch`
- `getErrorMessage`
- `DialogService.alert`
- promesas rechazadas
- errores absorbidos
- filesystem
- red
- DB
- startup/shutdown
- IPC
- duplicados Main/Renderer

---

# 16. `console.error` intencionados

Al final de PT-LOG.5l deberían quedar solo fallbacks deliberados:

1. `main.ts` startup fallback;
2. `FileApplicationLogger.reportEmergencyFailure`;
3. `ApplicationLoggingService.reportLoggingFailure`;
4. `ApplicationErrorHandler.handleError` solo en desarrollo.

Cualquier otro debe justificarse o migrarse.

---

# 17. PT-LOG.6 — PENDIENTE

Objetivo: acceso y exportación para soporte.

Opciones:

- abrir carpeta de logs;
- copiar ruta;
- exportar paquete de soporte;
- ZIP explícito;
- rango temporal;
- selección;
- versión/entorno.

Regla:

**un paquete de soporte no es un backup `.otpv`.**

Nunca incluir secretos.

---

# 18. PT-LOG.7 — PENDIENTE

Regresión final:

- persistencia/orden/flush;
- rotación;
- sanitización;
- límites;
- AggregateError/cause;
- fallos internos del logger;
- IPC inválido/sender no fiable;
- error global;
- backup/restore;
- venta/caja;
- impresión/email;
- TicketBAI;
- filesystem/DB;
- cleanup best-effort;
- duplicados.

Batería final completa obligatoria.

---

# 19. Pausa Windows / Linux — PENDIENTE

Después de logging y antes del Hito 22.

Objetivo: operabilidad real, no solo compilación.

Revisar:

- rutas Windows/POSIX;
- filesystem/permisos;
- temporales;
- Electron;
- ventanas/diálogos;
- impresión/impresoras/drivers;
- packaging/build/distribución;
- procesos;
- dependencias nativas;
- better-sqlite3;
- sharp;
- supuestos Windows-only.

Incidencia ya corregida:

`basename()` sobre ruta `C:\...` ejecutada en POSIX.

Solución:

- `win32.isAbsolute()`
- `win32.basename()`
- `basename()` para el resto

---

# 20. Hito 22 — POSPUESTO

**Sincronización tienda online**

No comenzar hasta cerrar:

1. logging;
2. pausa Windows/Linux.

---

# 21. TicketBAI 12C.9

Pendiente de Berein.

`@osumi/ticketbaiws` actual: `^1.0.1`.

Cuando Berein responda/revise documentación:

- tipos;
- endpoints;
- docs;
- SDK;
- Client;
- decisiones previas.

---

# 22. Electron `protocol.registerSource()`

Electron 44.6.0 lo introdujo experimentalmente.

Decisión:

- no usarlo todavía;
- reevaluar cuando sea estable;
- seguimiento separado.

Electron Client actual: `^44.7.0`.

---

# 23. Arquitectura crítica

## TPV Backup zero knowledge

Servidor nunca recibe TPV Backup key ni descifra `payload.enc`.

## Restore

```text
credenciales temporales RAM
↓
finalize
↓
safeStorage definitivo
```

## Scheduler

- manual ≠ automático
- fallo ≠ éxito
- catch-up único
- hora local configurable
- estado UTC ISO
- reevaluación en resume

## Logging

- Renderer sin filesystem
- Main único escritor
- contexto escalar
- logs no portables
- best-effort
- una incidencia una vez
- cleanup secundario normalmente warn

---

# 24. Decisiones/bugs históricos que no reabrir sin evidencia

- stale TPV Backup en Gestión;
- getConnection stale;
- credenciales temporales restore;
- cleanup instalación incompleta;
- integridad SHA;
- estado automático `.tmp`;
- scheduler duplicado/resume;
- cambios config en caliente;
- backup manual no satisface ciclo automático;
- `app_data.json.empleados` ya no gobierna empleados múltiples;
- exportador legacy ignora `empleados`;
- rutas Windows deben tratarse explícitamente en POSIX;
- estados TicketBAI conocidos no son automáticamente errores;
- clave incorrecta OTPV no es error técnico principal por defecto;
- cleanup no sustituye error principal.

---

# 25. Commits desde v2.92

Base v2.92:

`87541f4d5f82739c4d65acd7a225d448f8159274`

Después:

1. `8833947aa86ade9bc57f5c588de4b0f3bb6924b5` — v2.92 + PT-LOG.5k-1
2. `e5b1e8025b36a141243d604a4218ea521a7306b1` — PT-LOG.5k-2
3. `25069080fd54bc666231d199c6c6057f339e3f34` — PT-LOG.5k-3
4. `9f7e11b23138ea82f004ccad3403d4db028abfc2` — PT-LOG.5l-1
5. `354c439b72bbc409da3839128a978976888a9c74` — PT-LOG.5l-2
6. `0f19638f9c27133eca087b3e898269d0697abf79` — PT-LOG.5l-3a
7. `e561efc63e434795ffd93b60211d32d83bcbe504` — PT-LOG.5l-3b
8. `dbee9467eccc2e05a9e00a7de43d3eaa078814fe` — librerías
9. `a7e9e7e9a1e83cf33c19d5880dfae39a6c5bece3` — PT-LOG.5l-4
10. `12ce120635136c8f7327a1feef70b7d22c58981d` — PT-LOG.5l-5
11. `f6e97f113e9882ebf7c97c193dd6849927e61a5a` — PT-LOG.5l-6
12. `8d00f36573b2b2bd4e90e16dfdbabce295c433f1` — PT-LOG.5l-7
13. `00d98f7c942db8bc1622c5434aa6e3daafeb102e` — PT-LOG.5l-8
14. `15d4a25bcee8ed5d6491e46d45651c707489154d` — PT-LOG.5l-9a
15. `721d48576d926ef261d871d9a8a7a8924e21db49` — PT-LOG.5l-9b
16. `268b75fa2e68117dc8bff6073da72f4ece8d0d8e` — PT-LOG.5l-10a
17. `ee3fa7dd8191b59a9ecb52b91b60d24942ce3297` — PT-LOG.5l-10b

---

# 26. Estado exacto al generar v2.93

HEAD Client:

`ee3fa7dd8191b59a9ecb52b91b60d24942ce3297`

Estado:

- ✅ Hito 21
- ✅ PT-LOG.1–4
- ✅ PT-LOG.5a–5k
- ▶️ PT-LOG.5l
- ✅ 5l-1–10b
- ⏳ residuos finales 5l
- ⏳ PT-LOG.6
- ⏳ PT-LOG.7
- ⏳ Windows/Linux
- ⏳ Hito 22
- ⏸ TicketBAI 12C.9

Estimación:

```text
PT-LOG.5     ≈ 95%
PT-LOG.5l    ≈ 75–80%
PT-LOG total ≈ 80–85%
```

---

# 27. Checklist para conversación nueva

1. localizar `docs/osumi-tpv-continuidad-v2.93.md`;
2. revisar `main`;
3. confirmar que HEAD deriva de `ee3fa7dd8191b59a9ecb52b91b60d24942ce3297`;
4. Hito 21 cerrado;
5. PT-LOG.1–4 cerrados;
6. PT-LOG.5a–5k cerrados;
7. PT-LOG.5l-1–10b cerrados;
8. continuar 5l;
9. primer frente: falsos “no existe” filesystem;
10. luego ClienteFacturas;
11. luego restore remoto / Imprenta / residuos;
12. barrido final `console.*` + `catch`;
13. después PT-LOG.6;
14. después PT-LOG.7;
15. después Windows/Linux;
16. después Hito 22;
17. GitHub solo lectura;
18. aliases;
19. JSDoc/PHPDoc;
20. no métodos vacíos;
21. bloques pequeños;
22. tests tras cada bloque;
23. no avanzar con tests fallidos;
24. siempre indicar dónde estamos / qué hacemos / qué queda.

---

# 28. Regla final

```text
main actual
→ continuidad más reciente
→ conversación activa
```

Objetivo:

> Los errores deben seguir siendo manejables para el usuario en el momento, pero además deben dejar una traza persistente, segura y útil para poder diagnosticar después qué ocurrió realmente.

La meta no es tener muchos logs.

La meta es tener **los logs correctos, en el punto correcto, con la severidad correcta, sin duplicados y sin comprometer la operación, la privacidad ni la seguridad**.
