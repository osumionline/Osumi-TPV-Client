# Osumi TPV Client — Documento de continuidad v2.94

**Fecha:** 21 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** https://github.com/osumionline/Osumi-TPV-Client  
**Repositorio TPV Backup API:** https://github.com/osumionline/TPV-Backup-API  
**Repositorio TPV Backup Front:** https://github.com/osumionline/Osumi-TPV-Backup-Front  
**Archivo recomendado:** `docs/osumi-tpv-continuidad-v2.94.md`

Este documento **actualiza y sustituye como referencia principal** a `docs/osumi-tpv-continuidad-v2.93.md`. Conserva las decisiones esenciales y el estado histórico; para el detalle exhaustivo de bloques antiguos, consultar las versiones anteriores.

**Orden de precedencia para retomar el desarrollo:**

```text
main actual de los repositorios
→ documento de continuidad más reciente
→ conversación activa
```

**HEAD verificado del Client al redactar la v2.94:**

`378f1781ecb9034c49ecfb4e770ea4247906488a` — «Actualización de librerías».

**Punto exacto:** todo el bloque **PT-LOG** se ha cerrado y validado; `PT-LOG.6` se **descartó expresamente**. El siguiente trabajo es **PT-PLAT.1 — Auditoría de rutas y filesystem para Windows/Linux**, antes del Hito 22.

---

# 1. Resumen ejecutivo y estado general

## 1.1. Hitos y bloques

| Área | Estado |
| --- | --- |
| Hito 16 — Compras | ✅ Cerrado |
| Hito 17 — Gestión | ✅ Cerrado |
| Hito 18 — Caja base | ✅ Cerrado |
| Empleado por venta | ✅ Cerrado |
| Hito 19 — Permisos | ✅ Cerrado |
| Hito 20 — Caja > Informes | ✅ Cerrado |
| Hito 21 — TPV Backup | ✅ Cerrado |
| PT-LOG.1 — Auditoría y diseño | ✅ Cerrado |
| PT-LOG.2 — Contratos y normalización | ✅ Cerrado |
| PT-LOG.3 — Logger persistente en Main | ✅ Cerrado |
| PT-LOG.4 — Renderer → Main e integración Angular | ✅ Cerrado |
| PT-LOG.5a–5k — Migración funcional de puntos críticos | ✅ Cerrado |
| PT-LOG.5l — Auditoría técnica final | ✅ Cerrado |
| PT-LOG.6 — Exportación de logs para soporte | 🚫 Descartado por decisión de producto |
| PT-LOG.7 — Regresión final automatizada y funcional | ✅ Cerrado |
| PT-PLAT — Pausa técnica Windows/Linux | ▶️ Siguiente frente |
| Hito 22 — Sincronización con tienda online | ⏳ Pospuesto hasta terminar PT-PLAT |
| TicketBAI 12C.9 — Seguimiento de Berein | ⏸ Pendiente de respuesta/documentación |

## 1.2. Secuencia inmediata

```text
PT-LOG.1–5l — CERRADO
PT-LOG.6 — DESCARTADO
PT-LOG.7 — CERRADO
             ↓
PT-PLAT.1 — Rutas y filesystem Windows/Linux
             ↓
PT-PLAT.2+ — Dependencias, Electron, impresión, distribución y pruebas reales
             ↓
Hito 22 — Sincronización con tienda online
```

**No volver a proponer una interfaz para exportar logs:** el usuario prefiere que el logging sea invisible y de uso interno del desarrollador. Tampoco duplicar el IPC `logging:write`, ya existente.

---

# 2. Situación de los repositorios y versiones

## 2.1. Osumi TPV Client

HEAD verificado en `main`:

`378f1781ecb9034c49ecfb4e770ea4247906488a` — Actualización de librerías.

Commits inmediatamente anteriores:

- `ae9979903dea2490caac0185878f7ddf587f7254` — Actualización Angular CLI/Core/Material 22.2.2 → 22.2.3.
- `b3dac7c123ba6596b54de51710e2082d13208714` — Regresión de registros grandes PT-LOG.5l-31.

Versiones declaradas en `package.json` **verificadas al generar este documento**:

| Dependencia | Versión declarada |
| --- | --- |
| Angular Core / Material / CLI | `^22.2.3` |
| Electron | `^44.9.0` |
| TypeScript | `~6.0.2` |
| Vitest | `^5.0.5` |
| @types/node | `^26.6.5` |
| better-sqlite3 | `^12.11.1` |
| sharp | `^0.35.5` |
| yauzl | `^3.4.0` |
| yazl | `^3.3.1` |
| TypeORM | `^1.1.2` |
| @osumi/ticketbaiws | `^1.0.1` |
| npm (packageManager) | `npm@12.2.0` |

Estas son versiones **declaradas**, no necesariamente versiones efectivamente instaladas en cada máquina; comprobar `package-lock.json` y el entorno cuando sea relevante.

## 2.2. TPV Backup API y Front

Últimas referencias heredadas de v2.93, **no reverificadas para esta versión**:

- API: `d1d3bdcde95d0e7d848347ec434b499025caa1b5` — Reconciliación 21.7.3a.
- Front: `1be138f8e280646b9419f9fe60287111174e890e` — Mensaje al desactivar subscripción.

No inferir que estas referencias continúan siendo HEAD actual. El trabajo inmediato PT-PLAT corresponde al **Client**.

---

# 3. Forma de trabajar — instrucciones permanentes

1. Comprobar **el `main` actual** antes de cada bloque y leer **los archivos exactos** implicados; después de cada push, volver a comprobar HEAD.
2. Acceso de ChatGPT a GitHub: **estrictamente solo lectura**. El usuario modifica, prueba y sube los cambios.
3. **No inventar** rutas, clases, helpers, contratos, métodos, constructores o detalles de librerías. Una búsqueda vacía de GitHub no demuestra que un símbolo no exista; inspeccionar los archivos y directorios.
4. Cambios pequeños y autocontenidos. **Un archivo nuevo:** ruta exacta y contenido completo. **Archivo existente:** ruta exacta, bloque reconocible y reemplazo exacto.
5. No avanzar si fallan tests, lint o build. Diagnosticar y corregir antes de proponer el siguiente bloque.
6. Documentar mediante **JSDoc** todos los métodos nuevos o modificados (PHPDoc en PHP).
7. TypeScript estricto, evitar `any`, preferir `unknown`; no crear métodos ni stubs con cuerpos `{}` vacíos.
8. Una única entidad exportada por archivo → `export default`; múltiples → exports nominales.
9. Respetar los aliases existentes (`@backend/*`, `@infrastructure/*`, `@bootstrap/*`, `@desktop-contracts/*`, `@ipc/*`) y la composición/arquitectura real.
10. No reabrir decisiones cerradas sin evidencia de regresión.
11. En cada respuesta de desarrollo explicar **Dónde estamos / Qué estamos haciendo / Qué queda por delante**.
12. La prueba real de Windows/Linux será obligatoria donde el resultado dependa del SO. **Compilar o pasar tests en Windows no demuestra operabilidad en Linux.**

## 3.1. Convenciones Angular

Angular standalone, zoneless, signals y Signal Forms. Mantener `inject()`, `input()/output()`, signal queries, `@if/@for/@switch`, Angular Material, WCAG AA y tipado estricto; evitar NgModule/CommonModule sin necesidad, `HostBinding`/`HostListener`, `ngClass`/`ngStyle` cuando existan alternativas modernas.

---

# 4. Pruebas y comandos

Batería automatizada completa **validada por el usuario al finalizar PT-LOG.7a**:

```bash
npm run test:electron
npm run test
npm run build:desktop
npm run lint
```

`build:desktop` incluye compilación Angular y Electron; `build:electron` incluye `typecheck:electron`. Otras variantes útiles:

```bash
npm run build
npm run build:electron
npm run typecheck:electron
npm run start:desktop
npm run start:desktop:prod
```

**PT-LOG.7b — Validación funcional:** el usuario ejecutó la aplicación en Windows, comprobó la existencia de los logs y que **se generan correctamente**. Dio por buena la funcionalidad y autorizó continuar. Esta aceptación cierra PT-LOG.7; no interpretar que todas las funciones se probaron exhaustivamente en Linux, ni que se reprodujeron artificialmente todos los errores de limpieza.

El repo puede haber recibido actualizaciones de librerías después de esas validaciones; repetir la batería que corresponda cuando se modifique código o se haga el ensayo en Linux.

---

# 5. Hito 21 — TPV Backup — CERRADO

Incluye `.otpv` v3, creación local, restauración nativa, importación legacy, servicios remotos, autenticación, integridad, seguridad, retención, descarga, borrado, restauración remota, scheduler de backups automáticos y regresión funcional.

## 5.1. Contrato `.otpv` v3 consolidado

ZIP exterior:

- `manifest.json`
- `payload.enc`

Contenido portable:

- `database/osumi-tpv.sqlite`
- `config/app_data.json`
- `assets/logo.webp`
- `secrets/secrets.json`
- `files/**`

**No portables:** `printing_settings.json`, `backup_automatic_state.json`, `logs/`, `backups/`, `staging/`, TPV Backup key y JWT.

Criptografía: `otpv3-scrypt-aes-256-gcm`; scrypt con salt 32, coste 32768, blockSize 8, parallelization 3, longitud 32; AES-256-GCM con IV 12, tag 16, DEK aleatoria y KEK derivada. Límite: **8 GiB**. Nunca copiar directamente la SQLite operacional: usar snapshot consistente.

## 5.2. Invariantes

- TPV Backup es **zero knowledge**: el servidor no recibe la TPV Backup key ni descifra `payload.enc`.
- Restore: credenciales temporales en RAM hasta `finalize`, persistencia definitiva vía safeStorage.
- Scheduler: backup manual ≠ automático; fallo ≠ éxito; catch-up único; hora local configurable; estado UTC ISO; reevaluación al reanudar.
- `app_data.json.empleados` ya no gobierna la detección de múltiples empleados: se determina por número de empleados en la base de datos; exportador legacy ignora `empleados`.

---

# 6. Logging — arquitectura final — CERRADO

## 6.1. Flujo y visibilidad

- **Main es el único escritor físico** del log.
- Renderer no accede al filesystem; utiliza el bridge validado **`logging:write`** (`electron/ipc/register-logging-ipc.ts`), ya integrado en preload y Angular.
- Evento con `source: main | renderer`, niveles `debug | info | warn | error`.
- Registros JSON Lines en `osumi-tpv.log`, rotación a un máximo de **cinco ficheros** y **10 MiB** por fichero.
- Escrituras mediante cola asíncrona para preservar orden; `flush()` para esperar los eventos pendientes; creación del archivo con modo `0600` cuando procede.
- Tamaño máximo de registro: **256 KiB**; máximo **32 entradas** de contexto; contexto solamente escalar (`string | number | boolean | null`).
- `ApplicationErrorNormalizer`: `name`, `message`, `stack`, `cause`, `AggregateError.errors`, límites de profundidad/cantidad/texto y ninguna serialización automática de propiedades ajenas de un Error.
- `ApplicationLogTextSanitizer`: protección defensiva de credenciales/JWT y patrones de rutas Windows/POSIX.
- No registrar claves, tokens, credenciales, payloads, requests/responses completos ni datos personales/fiscales/comerciales innecesarios.

## 6.2. Ownership y severidad

- Una incidencia se registra una vez, en la capa con sentido funcional.
- Fallo principal que impide la operación → generalmente `error`.
- Limpieza secundaria, rollback, post-COMMIT fallido recuperable → generalmente `warn`.
- Cancelación del usuario, clave inválida esperada y precondiciones de negocio → normalmente sin log técnico principal.
- Un error secundario no oculta el principal ni convierte una operación ya completada en fallida.
- El logging es **best-effort**: no puede hacer fracasar la operación por fallar la persistencia del propio log.
- Sanitización por patrones = defensa adicional, **no garantía universal** de ausencia de datos sensibles; la barrera primaria está en los productores de eventos.

## 6.3. Decisión PT-LOG.6 — DESCARTADO

La propuesta de exportación/acceso a logs para soporte **no se implementará** por decisión del usuario:

> El usuario final no necesita saber que los logs existen. El desarrollador accederá directamente a los ficheros cuando necesite investigar una incidencia.

Por tanto:

- sin pantalla, botón o menú de exportación;
- sin paquete ZIP de soporte;
- sin nuevo IPC para exportar;
- **mantener intacto `logging:write`** y el logger persistente;
- logs **no portables**, tampoco en copias `.otpv`.

No volver a presentar PT-LOG.6 como trabajo pendiente.

---

# 7. PT-LOG.5 — Migración y auditoría — CERRADO

## 7.1. Bloques funcionales 5a–5k

Todos cerrados: scheduler automático; Gestión > Copias; temporales Backup; post-COMMIT y persistencia de Ventas; apertura, lectura, cierre y salidas de Caja; flujos secundarios de Ventas; impresión, email, documentos e informes; TicketBAI directo.

TicketBAI: `processInitial()`, `reconcile()`, `retry()`; ID inválido/registro inexistente/estado esperado no son incidencias; fallos operativos reales → generalmente `warn`. Nunca introducir token ni payload fiscal en logs. La normalización no extrae `TicketBaiClientError.responsePayload`.

## 7.2. Primeros bloques 5l (v2.93)

- `5l-1` — aplicación/DB, existencia filesystem y cleanup de QueryRunner/DataSource.
- `5l-2` — configuración y rollback.
- `5l-3a / 3b` — instalación, staging y finalizer.
- `5l-4` — estado de backups automáticos; ENOENT frente a fallos reales.
- `5l-5 / 6` — Gestión > Ajustes y nueva instalación; ownership Main/Renderer.
- `5l-7` — cleanup de descarga remota.
- `5l-8 / 9a / 9b / 10a` — finalización, desbloqueo, Renderer y staging de restore.
- `5l-10b` — limpieza de snapshot SQLite en backup.

La v2.93 conserva los SHAs y la descripción pormenorizada de estos bloques.

## 7.3. Bloques posteriores realizados hasta el cierre

| Bloque | Resultado |
| --- | --- |
| `5l-18b-1` | Cleanup de `YauzlOtpvV3EncryptedPayloadExtractor`: warning en vez de `console.error`; pruebas deterministas |
| `5l-18b-2` | Cleanup de `YazlOtpvV3PackageBuilder`, preservación del fallo principal |
| `5l-18b-3` | Cleanup de `BetterSqlite3DatabaseSnapshot` |
| `5l-19` | `Database.close()` seguro en snapshot SQLite; las pruebas cierran el recurso real antes de simular error |
| `5l-20a` | Limpieza del destino en `YauzlOtpvV3FilesExtractor` |
| `5l-20b` | Limpieza de ficheros temporales de extracción sin ocultar el error principal |
| `5l-21` | Igual protección en `YauzlOtpvV3RequiredContentExtractor` |
| `5l-22` | Unificado `RemoveTemporaryFile` en `electron/infrastructure/filesystem/remove-temporary-file.type.ts` |
| `5l-23` | Revisión de `zipFile.close()` de Yauzl; sin cambio injustificado |
| `5l-24` | Revisión de listeners `error` de Yauzl; sin modificación al no demostrar incidencia |
| `5l-25` | Revisión de cleanup doble preparer/unlock; mantenidos los reintentos independientes |
| `5l-26a` | Fallo limpiando estado después de promoción correcta no revierte una instalación completada |
| `5l-26b` | Fallo limpiando estado después de finalización fallida no oculta causa ni bloquea recuperación |
| `5l-27` | Errores de staging incompleto sin rutas físicas |
| `5l-28a` | Sanitización de rutas Windows en texto/stack del error |
| `5l-28b` | Sanitización de rutas POSIX preservando referencias internas de Node |
| `5l-29` | Error de emergencia del propio logger no imprime excepción sin sanitizar |
| `5l-30` | Claves de contexto sensibles con separadores (`api_key`, `backup-api-key`, etc.) |
| `5l-31` | Regresión de logs grandes: truncado defensivo y continuidad de la cola |
| `5l-32` | Cierre de auditoría, sin cambios de código |

Los bloques intermedios no desglosados individualmente en esta tabla forman parte del historial del repositorio y de la conversación de desarrollo; **no inferir nombres o commits que no se hayan verificado**.

### SHAs de referencia posteriores a v2.93

- `4c770f9047dded3b1c8bae37e4f0c7c57de3fd91` — protección de cierre DB en snapshot.
- `bb8205fb4b6bdff44747a1db6544f09276bed3a0` — limpieza destino FilesExtractor.
- `d425c02f17f17299a2f87ca44ffc9044a426a8c3` — limpieza temporal FilesExtractor.
- `2bb3aebe037fb29bfd1e49830394481bc890e515` — limpieza temporal RequiredContentExtractor.
- `da876ba6450814eb976b34649375f4c57c0f0081` — tipo unificado `RemoveTemporaryFile`.
- `f86532b74c08de7bf0ca3796d81874e11ea1a3bd` — PT-LOG.5l-26a.
- `1583eb3ee0850980d4772e9cb1a22c2fc04161a5` — PT-LOG.5l-26b.
- `593ef07f405ceaa5c7f0b804eda078bd547176e2` — PT-LOG.5l-27.
- `176765e6f0d1ae3fc185161fb9dfcc0282503af3` — PT-LOG.5l-28a.
- `ca8ee10066a618dc9aee4740f354ebb8d63e9901` — PT-LOG.5l-28b.
- `6f1e34b2c2eadbe6350b8a368196818f78ae4e81` — PT-LOG.5l-29.
- `249a3c34229840290fc809af942be62b7c0b90a0` — PT-LOG.5l-30.
- `b3dac7c123ba6596b54de51710e2082d13208714` — PT-LOG.5l-31.

---

# 8. PT-LOG.7 — Regresión final — CERRADO

## 8.1. Automatizada

El usuario ejecutó satisfactoriamente:

```bash
npm run test:electron
npm run test
npm run build:desktop
npm run lint
```

La suite actual cubre logger JSON Lines, fuentes Main/Renderer, orden/flush, rotación, saneamiento de secretos y rutas, límites de contexto, normalización de errores, cadenas `cause`, `AggregateError`, fallos internos del logger y reducción de registros grandes.

La revisión previa incluyó ownership de errores y cleanups de backup/restore, impresión, TicketBAI, venta y caja. **No afirmar que todos los caminos de fallo se reprodujeron manualmente**: el alcance automatizado y funcional es distinto.

## 8.2. Funcional

El usuario arrancó la aplicación en Windows y comprobó que los logs **se generan y aparecen correctamente**. Dio por aceptada la prueba funcional y autorizó cerrar la fase.

## 8.3. Aspectos a conservar como riesgos/pruebas de regresión

- Comportamiento integrado del doble intento de cleanup de staging/workspace durante un restore fallido, identificado en `5l-25`. Hay tests unitarios de cada responsabilidad, pero la prueba conjunta específica quedó pendiente; si se modifica restore, incorporarla a su regresión.
- Sanitización heurística de rutas/credenciales: no cubre necesariamente todas las representaciones; los productores nunca deben enviar secretos.
- Revalidar logs reales y permisos en Linux durante PT-PLAT; la aprobación funcional realizada fue en Windows.

Estos puntos **no bloquean el cierre aceptado de PT-LOG**; son comprobaciones residuales razonables para mantenimiento o compatibilidad.

---

# 9. PT-PLAT — Pausa técnica Windows/Linux — SIGUIENTE

## 9.1. Objetivo

Verificar **operabilidad real** del Client en ambos sistemas, no solo compilación. El Hito 22 sigue detenido hasta finalizar esta pausa.

No se ha auditado aún exhaustivamente la compatibilidad ni se ha validado en Linux desde esta conversación. **No darla por hecha.**

## 9.2. Plan orientativo

| Frente | Contenido |
| --- | --- |
| **PT-PLAT.1** | Auditoría de rutas, filesystem, errores ENOENT/EACCES/EPERM, directorios y temporales; suposiciones Windows-only |
| PT-PLAT.2 | Dependencias nativas: `better-sqlite3`, `sharp`, reconstrucción, permisos de ejecución y entorno |
| PT-PLAT.3 | Electron: ventanas, diálogos, IPC, preload, archivos del usuario, procesos y ciclo de vida |
| PT-PLAT.4 | Impresión: enumeración de impresoras, drivers, PDFs, spooler y diferencias de plataformas |
| PT-PLAT.5 | Backups locales/remotos, ZIP, staging, restauración y filesystem real en Windows/Linux |
| PT-PLAT.6 | Build, packaging/distribución, instalación y regresión funcional en ambas plataformas |

**La numeración a partir de PT-PLAT.2 es propuesta de planificación, no bloques ya implementados ni contratos cerrados.** Ajustarla según lo que muestre la auditoría real.

## 9.3. Punto exacto de arranque: PT-PLAT.1

**Primero inspeccionar `main` y los archivos afectados; no proponer modificaciones genéricas.**

1. Identificar generación de `ApplicationPaths` y rutas usadas por Main, preload y servicios.
2. Revisar uso de `join`, `resolve`, `basename`, `dirname`, `win32`, `posix`, `path.isAbsolute` y separadores literales.
3. Revisar gestión de temporales, renombrados/movimientos, creación y eliminación recursiva, permisos y bloqueos.
4. Verificar tratamiento específico de ENOENT frente a otros errores (`EACCES`, `EPERM`, etc.), sin repetir cambios ya resueltos por logging.
5. Inspeccionar filesystem de backup, restore, import legacy, imágenes, impresión y configuración; priorizar problemas reproducibles.
6. Preparar un **primer cambio pequeño**, con tests deterministas en Windows y Linux cuando sea posible. El usuario valida y sube antes del siguiente.

**Incidencia histórica ya corregida, que no debe reabrirse sin evidencia:** `basename()` sobre ruta `C:\...` ejecutada en POSIX. Se eligió `win32.isAbsolute()` + `win32.basename()` para rutas Windows y `basename()` para el resto.

## 9.4. Criterios de cierre de PT-PLAT

- Baterías automatizadas superadas en los entornos disponibles.
- Verificación real del comportamiento en Linux para las partes que dependen del sistema operativo.
- Especial atención a dependencias nativas, impresoras, diálogos, almacenamiento y backups/restauración.
- Documentar con claridad las partes verificadas y las limitaciones de hardware/entorno.
- No iniciar Hito 22 hasta tomar una decisión explícita sobre esta compatibilidad.

---

# 10. Hito 22 — Sincronización con tienda online — POSPUESTO

No comenzar hasta terminar:

1. Logging — **ya cerrado**.
2. Pausa Windows/Linux — **pendiente**.

La v2.94 **no redefine el alcance de Hito 22**: cuando llegue el momento se recuperará su planificación específica desde el roadmap/documentos y el estado real del código.

---

# 11. Otros asuntos aplazados

## 11.1. TicketBAI 12C.9 / Berein

Queda pendiente la respuesta o mejora de documentación de Berein. `@osumi/ticketbaiws` fue publicado en npm; el Client declara `^1.0.1`. Cuando existan novedades, revisar tipos, endpoints, SDK, documentación y decisiones anteriores. No introducir cambios especulativos sin evidencia.

## 11.2. Electron `protocol.registerSource()`

Introducido como **experimental** en Electron 44.6.0. Se acordó **no adoptarlo** hasta que sea estable; existe un seguimiento separado. El Client declara actualmente Electron `^44.9.0`. No confundir actualización de Electron con estabilización de esa API.

---

# 12. Decisiones históricas que no reabrir sin evidencia

- Hito 21 y contrato `.otpv` v3.
- Zero knowledge y secretos de TPV Backup.
- Credenciales remotas temporales del restore y restauración definitiva al finalizar.
- Backup manual no satisface ciclo automático; catch-up/resume sin duplicados.
- Estado automático de backups y archivos `.tmp`.
- Rutas Windows interpretadas expresamente cuando se ejecuta en POSIX.
- Empleados múltiples determinados desde la base de datos; exportador ignora `app_data.json.empleados`.
- Estado esperado de TicketBAI no equivale por sí solo a error.
- Clave OTPV incorrecta no implica registro principal de error técnico.
- Error secundario de cleanup nunca reemplaza el principal.
- Una vez promocionado `app_data.json`, un fallo posterior de limpieza no deshace una instalación completada.
- Main es el único escritor de logs; Renderer usa `logging:write`.
- **No añadir exportación de logs a la UI** ni hacer consciente de ellos al usuario final.

---

# 13. Checklist para retomar el desarrollo

1. Leer `docs/osumi-tpv-continuidad-v2.94.md`.
2. Comprobar HEAD de `main` del Client; referencia de esta versión: `378f1781ecb9034c49ecfb4e770ea4247906488a`.
3. Confirmar que Hito 21 está cerrado.
4. Confirmar que PT-LOG.1–5l están cerrados; PT-LOG.6 descartado; PT-LOG.7 cerrado tras tests y prueba funcional del usuario.
5. **No** volver al diseño de exportación para soporte ni repetir `logging:write`.
6. Abrir **PT-PLAT.1**: revisar rutas, filesystem y compatibilidad Windows/POSIX.
7. Inspeccionar `main` y archivos implicados antes de escribir código.
8. Proponer cambios pequeños, exactos, con JSDoc, aliases y pruebas.
9. Respetar GitHub **solo lectura** para ChatGPT.
10. No continuar con tests fallidos y refrescar HEAD tras cada push.
11. Diferenciar validación Windows y Linux; no afirmar soporte Linux sin pruebas.
12. Tras PT-PLAT, recuperar planificación del Hito 22.
13. Mantener TicketBAI/Berein y `protocol.registerSource()` en seguimiento separado.
14. En cada desarrollo: **Dónde estamos / Qué estamos haciendo / Qué queda por delante**.

---

# 14. Regla final

> Los errores deben ser manejables en la interfaz y dejar un registro persistente, útil y seguro en los casos en que sea necesario diagnosticar una incidencia. El logging no debe comprometer la operación, duplicar errores ni exponer secretos.

**Ese objetivo se considera alcanzado y aceptado para la fase PT-LOG.** El siguiente objetivo es que las funcionalidades ya desarrolladas sean operativas en Windows y Linux antes de avanzar a la sincronización con tienda online.
