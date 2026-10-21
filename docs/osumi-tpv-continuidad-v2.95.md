# Osumi TPV Client — Documento de continuidad v2.95

**Fecha:** 21 de octubre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio Client:** https://github.com/osumionline/Osumi-TPV-Client  
**Repositorio TPV Backup API:** https://github.com/osumionline/TPV-Backup-API  
**Repositorio TPV Backup Front:** https://github.com/osumionline/Osumi-TPV-Backup-Front  
**Ubicación recomendada:** `docs/osumi-tpv-continuidad-v2.95.md`  
**Documento anterior:** `docs/osumi-tpv-continuidad-v2.94.md`

La v2.95 **sustituye a la v2.94 como documento principal de continuidad**. Conserva las decisiones y contratos esenciales, registra la auditoría multiplataforma completada y establece la reanudación del Hito 22. Los documentos anteriores siguen disponibles para los detalles históricos de los bloques de logging.

**Precedencia:** `main` real de los repositorios → documento de continuidad más reciente → conversación activa. Volver a consultar `main` antes de proponer cualquier cambio.

**HEAD verificado del Client al redactar este documento:**  
`99576cb89019228d195ecb146913fdd005f83d2c` — «Protegida propiedad del temporal de PDFs de pedidos PT-PLAT.1g».

> **Punto de continuación:** Hito 21 (TPV Backup) cerrado; PT-LOG cerrado, con PT-LOG.6 descartado; **PT-PLAT Windows/Linux cerrado y aceptado** tras pruebas automatizadas en ambos sistemas y funcionamiento gráfico real en Ubuntu. **Próximo trabajo: recuperar el plan original y comenzar Hito 22 — Sincronización con tienda online.** No iniciar su implementación sin comprobar el roadmap y el código real.

---

# 1. Resumen ejecutivo

| Área | Estado |
| --- | --- |
| Hito 16 — Compras | Cerrado |
| Hito 17 — Gestión | Cerrado |
| Hito 18 — Caja base | Cerrado |
| Empleado por venta | Cerrado |
| Hito 19 — Permisos | Cerrado |
| Hito 20 — Caja > Informes | Cerrado |
| Hito 21 — TPV Backup | Cerrado |
| PT-LOG.1–5l y PT-LOG.7 | Cerrados |
| PT-LOG.6 — Exportación de logs | **Descartado expresamente** |
| PT-PLAT.1 — Rutas, filesystem y temporales | Cerrado |
| PT-PLAT.2 — Dependencias nativas | Cerrado, pruebas funcionales en Ubuntu |
| PT-PLAT.3 — Ventanas, diálogos, IPC | Cerrado, pruebas funcionales en Ubuntu |
| PT-PLAT.4 — Impresión | Aceptado: tickets/CUPS/PDF verificados; A4 y facturas pendientes de prueba específica |
| PT-PLAT.5 — Backup y restauración | Aceptado: `.otpv` local generado y restaurado realmente en Ubuntu; remoto no revalidado allí |
| PT-PLAT.6 — Compilación/regresión | Cerrado para ejecución desde código fuente; instaladores aplazados |
| **Hito 22 — Sincronización con tienda online** | **Siguiente frente, pendiente de recuperar planificación** |
| TicketBAI 12C.9 / Berein | Seguimiento separado; pendiente de respuesta o revisión documental |
| Electron `protocol.registerSource()` | Experimental; adopción aplazada hasta estabilidad |

## 1.1. Secuencia

```text
Hito 21 — TPV Backup — CERRADO
PT-LOG — CERRADO (PT-LOG.6 DESCARTADO)
PT-PLAT — CERRADO (Windows + pruebas reales Ubuntu)
                      ↓
Hito 22 — Sincronización con tienda online
  1. Localizar el roadmap/plan original.
  2. Auditar qué contratos, servicios y UI existen ya.
  3. Confirmar alcance, orden y dependencias.
  4. Implementar por bloques funcionales agrupados.
                      ↓
Hitos posteriores del roadmap, todavía sin redefinir
```

**Decisión de avance:** el usuario ha aceptado expresamente la compatibilidad Windows/Linux comprobada y ha solicitado volver al desarrollo. La ausencia de instaladores empaquetados no bloquea Hito 22; se tratará en una futura fase de lanzamiento.

---

# 2. Repositorios y versiones

## 2.1. Client

**Último commit verificado:** `99576cb89019228d195ecb146913fdd005f83d2c`.

Versiones **declaradas** en `package.json` al redactar esta versión (no confundir con la versión instalada exacta):

| Dependencia | Declaración |
| --- | --- |
| Angular Core / Material / CLI | `^22.2.3` |
| Electron | `^44.9.0` |
| TypeScript | `~6.0.2` |
| Vitest | `^5.0.5` |
| @types/node | `^26.6.5` |
| better-sqlite3 | `^12.11.1` |
| sharp | `^0.35.5` |
| yauzl / yazl | `^3.4.0` / `^3.3.1` |
| TypeORM | `^1.1.2` |
| @osumi/ticketbaiws | `^1.0.1` |
| npm (packageManager) | `npm@12.2.0` |

**Scripts comprobados en `package.json`:** `test:electron`, `test`, `build:desktop`, `build:electron`, `lint`, `start:desktop`, `start:desktop:prod`, `rebuild:native`. `rebuild:native` reconstruye `better-sqlite3` para Electron; `postinstall` lo invoca.

## 2.2. TPV Backup API y Front

Últimos SHAs históricos referenciados en v2.94; **no se han vuelto a verificar como HEAD actuales**:

- API: `d1d3bdcde95d0e7d848347ec434b499025caa1b5` — Reconciliación 21.7.3a.
- Front: `1be138f8e280646b9419f9fe60287111174e890e` — Mensaje al desactivar subscripción.

No derivar de esos SHAs el estado actual de los repositorios. Hito 22 se centra inicialmente en recuperar el alcance y las dependencias de sincronización de tienda online, no en reabrir TPV Backup.

---

# 3. Convenciones de desarrollo y colaboración

1. **Consultar siempre `main` actual** y leer los archivos concretos antes de proponer modificaciones. Verificar el nuevo HEAD después de cada push del usuario.
2. **GitHub: acceso de ChatGPT exclusivamente de lectura.** El usuario aplica los cambios, ejecuta pruebas, crea commits y los sube.
3. **No inventar** rutas, clases, métodos, aliases, contratos, endpoints ni decisiones de negocio. Si falta un plan o contrato, recuperarlo desde el roadmap/documentos/código; señalar lo desconocido.
4. **Agrupar cambios relacionados en un único bloque y commit.** El usuario pidió expresamente evitar un commit y una batería completa por cada archivo. Entregar varios archivos y tests cuando pertenezcan al mismo problema o funcionalidad; dividir solo por razones técnicas reales.
5. Para archivos nuevos: indicar la ruta exacta y el contenido completo. Para existentes: cambio localizable y reemplazo preciso; si el cambio afecta casi todo el método, dar el método completo.
6. JSDoc para métodos añadidos o modificados (PHPDoc en PHP). TypeScript estricto (`unknown` frente a `any`), no dejar stubs ni métodos vacíos.
7. Respetar aliases `@backend/*`, `@infrastructure/*`, `@bootstrap/*`, `@desktop-contracts/*`, `@ipc/*` y la arquitectura de composición del proyecto.
8. Una sola entidad exportada por archivo: preferir `export default`; múltiples: exports nominales.
9. No avanzar con tests/build/lint fallidos: diagnosticar y corregir antes. Evitar modificaciones especulativas o reabrir funcionalidades cerradas sin evidencias.
10. Diferenciar **tests automatizados Windows/Linux**, **aplicación gráfica probada en Ubuntu** y **partes sin prueba específica**. Un test Node.js no demuestra funcionamiento de un módulo nativo bajo Electron.
11. Mantener las respuestas de desarrollo con **Dónde estamos / Qué estamos haciendo / Qué queda por delante**.

**Angular:** standalone, zoneless, signals y Signal Forms; `inject()`, `input()/output()`, signal queries, `@if/@for/@switch`, Angular Material, WCAG AA y tipado estricto. Evitar NgModule/CommonModule innecesarios, `HostBinding`/`HostListener`, `ngClass`/`ngStyle` cuando existan alternativas modernas.

---

# 4. Pruebas y entorno de ejecución

La batería completa validada por el usuario **tanto en Windows como en Linux** al cierre de PT-PLAT.6:

```bash
npm run test:electron
npm run test
npm run build:desktop
npm run lint
```

Arranque de la versión compilada también verificado en ambos sistemas:

```bash
npm run start:desktop:prod
```

En Ubuntu se probó asimismo `npm run start:desktop` con interfaz gráfica, no solo los tests en servidor sin pantalla. `build:desktop` construye Angular y Electron; `build:electron` incluye el `typecheck:electron`.

**Entorno Linux gráfico de validación:** máquina virtual Ubuntu preparada por el usuario, con recursos limitados. Arranque inicialmente irregular, posteriormente funcional con los comandos habituales.

## 4.1. Incidencias de arranque observadas, sin cambios de producto

- **Sandbox SUID de Chromium:** Electron rechazó inicialmente el arranque por permisos incorrectos de `node_modules/electron/dist/chrome-sandbox`. Se propuso `root:root` y modo `4755` exclusivamente para ese ejecutable. El usuario consiguió avanzar; no introducir `--no-sandbox` como solución permanente.
- **Aviso `[SharpElectronLinux]`:** advertencia sobre posibles incompatibilidades de librerías nativas con Electron Linux. Posteriormente el usuario procesó una imagen real correctamente. Conservar como observación, no como fallo reproducido.
- **VA-API:** `vaInitialize failed: unknown libva error` en la VM. Se probaron arranques con `--disable-gpu` y logging; finalmente `npm run start:desktop` también funcionó sin parámetros especiales. El bloqueo inicial **no tiene causa demostrada**; posible limitación de recursos virtualizados, no afirmar diagnóstico definitivo.
- No se añadieron flags permanentes de GPU ni se desactivó el sandbox del código.

---

# 5. Hito 21 — TPV Backup — CERRADO

Incluye formato `.otpv` v3, creación local, restauración nativa, importación legacy, servicios remotos, autenticación/integridad/seguridad, retención, descarga, borrado, restauración remota y scheduler de copias automáticas.

## 5.1. Contrato `.otpv` v3

ZIP exterior: `manifest.json` + `payload.enc`.

Contenido portable:

- `database/osumi-tpv.sqlite`
- `config/app_data.json`
- `assets/logo.webp`
- `secrets/secrets.json`
- `files/**`

No portables: `printing_settings.json`, `backup_automatic_state.json`, `logs/`, `backups/`, `staging/`, TPV Backup key ni JWT.

Criptografía: `otpv3-scrypt-aes-256-gcm`; scrypt con salt de 32 bytes, coste 32768, blockSize 8, parallelization 3 y longitud 32; AES-256-GCM con IV 12 bytes y tag 16 bytes; DEK aleatoria y KEK derivada. Máximo 8 GiB. Para backups SQLite se usa un snapshot consistente, no la copia directa del archivo operacional.

## 5.2. Decisiones que se mantienen

- TPV Backup es **zero knowledge**: el servidor no recibe la TPV Backup key ni descifra el contenido.
- Restore: credenciales remotas temporales en RAM hasta `finalize` y persistencia segura mediante `safeStorage` cuando corresponda.
- Backup manual no equivale a ciclo automático; fallo no equivale a éxito; scheduler con catch-up único, hora local configurable, estado UTC ISO y reevaluación al reanudar.
- La detección de varios empleados depende del número de empleados en la base de datos; no de `app_data.json.empleados`. El exportador legacy ignora ese campo.
- Restauración nativa **no sobrescribe una instalación ya configurada**. La impresora de tickets se restablece a no seleccionada tras restaurar, por ser configuración local.

---

# 6. PT-LOG — Logging y auditoría — CERRADO

## 6.1. Arquitectura consolidada

- **Main es el único escritor físico** del log. Renderer utiliza el IPC `logging:write`, integrado en preload y Angular.
- Origen `main | renderer`; niveles `debug | info | warn | error`.
- Archivo JSON Lines `osumi-tpv.log`; hasta cinco archivos, máximo 10 MiB cada uno.
- Cola asíncrona para orden y `flush()`; permisos de creación `0600` donde procede.
- Límite de evento 256 KiB, hasta 32 entradas de contexto y valores escalares exclusivamente.
- `ApplicationErrorNormalizer` trata `cause` y `AggregateError.errors` con límites de profundidad y cantidad, sin extracción genérica de propiedades arbitrarias de errores.
- `ApplicationLogTextSanitizer` filtra defensivamente credenciales/JWT y patrones Windows/POSIX de rutas.
- Un fallo de limpieza secundario o del propio logger no debe ocultar el error funcional principal ni revertir una operación ya completada.
- Evitar datos personales, credenciales, payloads completos y tokens desde el origen de los eventos: la sanitización es una defensa adicional, no una garantía total.

## 6.2. PT-LOG.6 descartado

El usuario decidió que el logging permanezca **invisible para el usuario final**, reservado al diagnóstico del desarrollador mediante acceso directo a ficheros. **No crear pantalla, menú, botón, exportación ZIP ni IPC de exportación.** No reabrir esta decisión.

## 6.3. Auditoría PT-LOG.5 y PT-LOG.7

Bloques funcionales 5a–5k cerrados. Auditoría 5l cerrada: scheduler, configuración, ventas, caja, backup/restore, instalación, extracción ZIP, cleanup, SQLite, impresión, TicketBAI, sanitización y logger. PT-LOG.7 pasó tests y validación funcional de creación de logs en Windows.

Detalles históricos conservados en v2.94 y v2.93. SHAs útiles:

- `4c770f9047dded3b1c8bae37e4f0c7c57de3fd91` — protección del cierre SQLite en snapshot.
- `bb8205fb4b6bdff44747a1db6544f09276bed3a0` — limpieza de destino FilesExtractor.
- `d425c02f17f17299a2f87ca44ffc9044a426a8c3` — limpieza temporal FilesExtractor.
- `2bb3aebe037fb29bfd1e49830394481bc890e515` — limpieza temporal RequiredContentExtractor.
- `da876ba6450814eb976b34649375f4c57c0f0081` — tipo `RemoveTemporaryFile`.
- `f86532b74c08de7bf0ca3796d81874e11ea1a3bd` — finalización completada no se revierte por error de cleanup.
- `1583eb3ee0850980d4772e9cb1a22c2fc04161a5` — cleanup fallido no oculta causa de restore.
- `593ef07f405ceaa5c7f0b804eda078bd547176e2` — staging sin rutas físicas en errores.
- `176765e6f0d1ae3fc185161fb9dfcc0282503af3` y `ca8ee10066a618dc9aee4740f354ebb8d63e9901` — sanitización de rutas Windows/POSIX.
- `6f1e34b2c2eadbe6350b8a368196818f78ae4e81` — error de emergencia del logger.
- `249a3c34229840290fc809af942be62b7c0b90a0` — claves sensibles de contexto.
- `b3dac7c123ba6596b54de51710e2082d13208714` — regresión de entradas grandes.

**Riesgos residuales no bloqueantes:** test de integración del doble intento de limpieza staging/workspace en restore fallido si se modifica esa zona; los filtros heurísticos de rutas/credenciales nunca sustituyen la responsabilidad de los productores de logs.

---

# 7. PT-PLAT — Compatibilidad Windows/Linux — CERRADO

**Objetivo alcanzado:** comprobar funcionamiento real de Osumi TPV Client en Windows y Linux, además de la batería automática. La VM Ubuntu permitió validar el renderer, los dispositivos e interacciones del sistema y los módulos nativos.

## 7.1. PT-PLAT.1 — Rutas, filesystem, temporales

Los cambios se realizaron en bloques independientes, todos probados por el usuario en Windows y Linux y subidos a `main`:

| Bloque | Cambios | Commit verificado |
| --- | --- | --- |
| 1a | Script `test:electron` portable, eliminando uso exclusivo de CMD `set` y limpiando `npm_config_allow_scripts` desde `scripts/test-electron.mjs` | `434dafefd9d2cfe675396de9e2976aa9061f7ccb` |
| 1b | No eliminar `.tmp` preexistente ante `EEXIST` en `FilesystemImageFileStorage` | `6b35f7024332d1acf2c53b045ecd29483782c1af` |
| 1c | Misma protección en `FilesystemImageStagingStorage` | `83e0fe5c3ee47c5d36e2d5d479ecce33a33ca63d` |
| 1d | Utilidad `write-atomic-text-file.ts`, temporales exclusivos para configuraciones JSON (`app_data`, impresión, backup automático) | `42f56a87420c73ce14abd1f05e482056b00b3c17` |
| 1e | Propiedad de temporales de texto mediante `FileHandle` y `open('wx')`; creación exclusiva para PDF factura/ticket | `ba317d19d109877dfb9fe3be178a4797722d4214` |
| 1f | Apertura exclusiva y cleanup condicionado a propiedad en PDFs de facturas y tickets; tests de colisión | `7b014f5d0f345add2d4f6c7b4ff18ad6bda14294` |
| 1g | Control de propiedad del temporal de PDFs de pedidos mediante evento `open` de `WriteStream`; test `EEXIST` | `99576cb89019228d195ecb146913fdd005f83d2c` |

Nota: el mensaje del commit de 1a dice «PT-PLAT.1, auditoría inicial» pero las correcciones posteriores 1b–1g forman parte de la misma fase. No considerar 1a como cierre de todos sus subapartados.

**Convención importante:** una apertura exclusiva fallida con `EEXIST` significa que la operación no adquirió el temporal y no debe eliminarlo. Limpieza de errores secundaria no oculta la principal. Algunos temporales JSON de nombre fijo legados pueden limpiarse por compatibilidad en `JsonBackupAutomaticStateRepository.delete()`; no eliminar esa lógica sin analizar migración.

## 7.2. PT-PLAT.2 — Dependencias nativas

**Verificación real en Ubuntu:**

- Instalación nueva con datos mínimos.
- Creación de marca y artículo con fotografía.
- Sharp procesó correctamente la imagen; se verificaron los archivos WebP guardados en disco.
- SQLite persistió el artículo, la marca y una venta; se inspeccionaron archivos y se comprobó persistencia después de reiniciar.
- Se creó correctamente un `.otpv` local.

`better-sqlite3` y Sharp quedan validados para las operaciones ejercitadas dentro de Electron gráfico en Ubuntu. No implica prueba exhaustiva de todas las rutas posibles. Sharp emitió previamente un warning en un arranque inicial, pero no produjo un fallo reproducible durante las pruebas funcionales.

## 7.3. PT-PLAT.3 — Ventanas, diálogos, preload e IPC

El usuario verificó en Ubuntu:

- Cierre, reapertura y navegación entre pantallas.
- Gestión > Ajustes, listado de usuarios, modal de contraseña, guardado de TPV Backup key y generación de backup.
- Selector de archivos para imagen de artículo y cancelación sin errores.
- Imágenes recuperadas al editar un artículo y al crear un acceso directo.
- Ciclo de vida de Electron y persistencia de datos tras varios reinicios.

**Resultado:** cerrado sin cambios de código. La ventana principal usa `show: false` y `ready-to-show`; el arranque irregular inicial no pudo reproducirse de manera estable y no se introdujo cambio especulativo.

## 7.4. PT-PLAT.4 — Impresión

En Ubuntu se instaló CUPS con `printer-driver-cups-pdf`. El usuario:

1. Creó/detectó una impresora PDF virtual.
2. La seleccionó en Ajustes.
3. Realizó una venta y la imprimió.
4. Verificó el PDF generado en la carpeta `~/PDF`: **ticket correcto, contenido y formato correctos**.

**Aceptación para continuidad:** impresión de tickets y CUPS validada en Linux. No declarar probadas específicamente la impresión A4 de inventarios/informes, los diálogos de factura ni una impresora térmica física. Son verificaciones complementarias, no bloqueantes ahora.

## 7.5. PT-PLAT.5 — Backup y restauración

Prueba real de extremo a extremo en Ubuntu:

1. Se generó previamente la copia `.otpv` de una instalación con marca, artículo/foto y venta.
2. Se trasladó el `.otpv` a la carpeta personal del usuario.
3. Se cerró la aplicación y se renombró el directorio de datos `osumi-tpv` a `osumi-tpv-old` para preservar la instalación original.
4. Al iniciar de nuevo, se mostró el flujo de instalación inicial.
5. Se seleccionó el paquete local, se introdujo la TPV Backup key y se restauró sin errores.

**Resultado:** restauración nativa local Linux validada y aceptada por el usuario. No se ejecutó durante esta fase una restauración remota real desde TPV Backup ni un ensayo exhaustivo de fallos/interrupciones; el Hito 21 contiene sus pruebas previas.

## 7.6. PT-PLAT.6 — Regresión y distribución

El usuario confirmó en Windows y Linux que toda la batería pasó:

```bash
npm run test:electron
npm run test
npm run build:desktop
npm run lint
npm run start:desktop:prod
```

La versión de producción compilada se abrió correctamente en ambos sistemas y recuperó los datos. **No existe todavía configuración de empaquetado/instaladores** (`electron-builder` o Electron Forge) en el repositorio verificado. Esto **no bloquea** el desarrollo funcional y se aplaza a la fase de publicación/distribución. No confundir la ejecución desde el repositorio con la validación de un instalador final.

## 7.7. Pendientes residuales de plataforma (no bloqueantes)

- Instaladores/paquetes distribuidos para Windows y Linux: formato, firmas, recursos, native modules, actualizaciones y pruebas desde paquete instalado.
- Ensayo de impresoras térmicas físicas y rutas de impresión A4/factura/informes en Linux, si entra en alcance de lanzamiento.
- Flujos remotos TPV Backup específicos de Ubuntu, si se requiere cobertura adicional.
- Warning eventual Sharp/Electron Linux y arranque inicialmente irregular de VM: investigar **solo si se reproduce** de forma consistente.
- Permisos y sandbox Linux en el empaquetado: conservar aislamiento, no fijar `--no-sandbox`.

Estos puntos son compromisos de validación futura, **no razones para reabrir PT-PLAT ni retrasar Hito 22** salvo nueva evidencia técnica.

---

# 8. Hito 22 — Sincronización con tienda online — SIGUIENTE

## 8.1. Decisión de reanudación

Se acordó detener Hito 22 hasta terminar logging y compatibilidad Windows/Linux. **Ambas condiciones están cumplidas**. El usuario ha pedido continuar y subir previamente este documento actualizado al repositorio.

**El plan funcional detallado de Hito 22 no se ha recuperado ni verificado durante la redacción de v2.95.** Por tanto, esta versión **no inventa** endpoints, entidades, workflows, protocolo de sincronización, resolución de conflictos, esquema de base de datos ni tareas concretas.

## 8.2. Primer bloque a realizar después de subir v2.95

1. Comprobar el nuevo HEAD de `osumionline/Osumi-TPV-Client`, incluida la existencia de este documento.
2. Buscar y leer el roadmap/plan original del Hito 22 en `docs/`, archivos del proyecto, historial o contexto anterior; no asumir que su alcance es obvio por el título.
3. Inspeccionar la implementación actual de integración con tienda online en `electron/` y `src/`, y los contratos correspondientes; consultar los repositorios relacionados solo si el plan lo exige.
4. Preparar una **propuesta de bloques de implementación** basada en el plan recuperado y el código existente, señalando qué está hecho, qué falta y dependencias reales.
5. Empezar el primer bloque de código una vez que el alcance esté sustentado; tests y un único commit por bloque coherente.

**Objetivo inmediato:** recuperar el contexto específico del Hito 22, no programar a ciegas. Mantener la arquitectura de Main/Renderer, los IPC autorizados, el logging invisible, los contratos y la portabilidad Windows/Linux.

## 8.3. Ritmo de trabajo aceptado por el usuario

No repetir el patrón PT-PLAT.1b–1c de dos commits para dos correcciones prácticamente idénticas. Agrupar implementaciones relacionadas, regresiones y validaciones en una sola entrega. Si una fase requiere solo comprobación funcional, se acepta sin commit.

---

# 9. Seguimientos separados y decisiones que no reabrir

## 9.1. TicketBAI / Berein

`@osumi/ticketbaiws` está publicado en npm; el Client declara `^1.0.1`. Sigue pendiente la respuesta o actualización documental de Berein para estudiar posibles inconsistencias de tipos o endpoints (12C.9). No modificar SDK o Client sin evidencia nueva.

## 9.2. Electron `protocol.registerSource()`

Introducido como experimental en Electron 44.6.0. Se decidió esperar a que pase a estable; existe seguimiento separado. La declaración actual del Client es `^44.9.0`. Una actualización del número de versión **no demuestra** estabilización de esta API.

## 9.3. Decisiones técnicas consolidadas

- Mantener contrato `.otpv` v3 y zero knowledge.
- No copiar directamente la SQLite operacional al backup; generar snapshot consistente.
- No restaurar sobre instalación activa; al recuperar datos, no trasladar configuración de impresora del equipo anterior.
- No exportar logs desde UI; mantener `logging:write` y privacidad de Main.
- No equiparar errores esperados de negocio (clave inválida, cancelación, estados previstos) con fallos técnicos que exijan logs principales.
- Conservar los cleanups independientes y preservar el error original.
- No reinstaurar el flag `empleados` de `app_data.json` como fuente de verdad.
- No desactivar permanentemente sandbox Chromium ni GPU por fallos puntuales de VM.
- No adoptar `protocol.registerSource()` mientras sea experimental.
- No iniciar una arquitectura de empaquetado completa antes de la fase de distribución sin necesidad funcional.

---

# 10. Checklist para la siguiente conversación

- [ ] El usuario ha subido `docs/osumi-tpv-continuidad-v2.95.md`.
- [ ] Verificar el HEAD actual de `main`, **no** asumir que permanece en `99576cb89019228d195ecb146913fdd005f83d2c`.
- [ ] Reconocer Hito 21, PT-LOG y PT-PLAT como cerrados; PT-LOG.6 descartado.
- [ ] No reabrir la auditoría Windows/Linux ni exigir instaladores para avanzar a Hito 22.
- [ ] Recuperar **roadmap original de Hito 22** y contrastarlo con implementación real.
- [ ] Definir dónde estamos, qué hacemos y qué queda; plantear un bloque inicial significativo.
- [ ] Verificar aliases, contratos, rutas y tipos antes de sugerir código.
- [ ] Aplicar cambios por bloques relacionados y completos; usuario valida Windows/Linux donde corresponda y sube commits.
- [ ] Mantener TicketBAI/Berein y `registerSource()` en seguimiento independiente.
- [ ] Preservar todos los acuerdos sobre backup, logging y seguridad.

---

# 11. Regla final

> Los errores deben ser manejables en la interfaz y registrarse de manera persistente, útil y segura cuando corresponda. El logging no debe comprometer las operaciones, duplicar incidencias ni exponer secretos. La portabilidad Windows/Linux requiere pruebas reales, no solo compilación; esas pruebas se han realizado y aceptado para el alcance actual.

**Próximo objetivo de producto: Hito 22 — Sincronización con tienda online.**
