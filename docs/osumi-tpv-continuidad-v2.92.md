# Osumi TPV Client — Documento de continuidad v2.92

**Fecha:** 10 de octubre de 2026  
**Proyecto principal:** Osumi TPV Client  
**Repositorio Client:** https://github.com/osumionline/Osumi-TPV-Client  
**Repositorio TPV Backup API:** https://github.com/osumionline/TPV-Backup-API  
**Repositorio TPV Backup Front:** https://github.com/osumionline/Osumi-TPV-Backup-Front

Este documento actualiza y sustituye como referencia principal de continuidad a:

`docs/osumi-tpv-continuidad-v2.91.md`

La fuente de verdad para continuar el desarrollo será siempre:

**main actual de los repositorios + documento de continuidad más reciente + conversación activa**

La v2.92 se genera al cerrar **PT-LOG.5j — Documentos / impresión / email / informes**, después de una auditoría transversal específica de ese bloque.

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
- ✅ PT-LOG.5h — Salidas de Caja
- ✅ PT-LOG.5i — Flujos operativos secundarios de Ventas
- ✅ PT-LOG.5j — Documentos / impresión / email / informes
- ⏳ PT-LOG.5k — TicketBAI directo
- ⏳ PT-LOG.5l — Auditoría técnica final
- ⏳ PT-LOG.6 — Soporte / acceso / exportación de logs
- ⏳ PT-LOG.7 — Regresión final del sistema de logging
- ⏳ PAUSA TÉCNICA — Compatibilidad Windows / Linux
- ⏳ Hito 22 — Sincronización tienda online
- ⏸ TicketBAI 12C.9 — pendiente de Berein

## 1.2. Punto exacto de continuación

El siguiente bloque es:

**PT-LOG.5k — TicketBAI directo**

Debe auditar expresamente:

- `processInitial`;
- `reconcile`;
- `retry`;
- operaciones manuales desde histórico;
- estados fiscales ambiguos;
- `TicketBaiClientError`;
- errores inesperados del cliente TicketBAI;
- fronteras entre rechazo conocido, estado esperado e incidencia técnica.

No comenzar todavía:

- PT-LOG.6;
- la pausa Windows/Linux;
- Hito 22.

Orden actual:

```text
PT-LOG.5k — TicketBAI directo
↓
PT-LOG.5l — auditoría técnica final
↓
PT-LOG.6 — soporte/acceso/exportación de logs
↓
PT-LOG.7 — regresión final
↓
PAUSA TÉCNICA — Windows/Linux
↓
Hito 22 — sincronización tienda online
```

---

# 2. HEADs al generar v2.92

## 2.1. Osumi TPV Client

HEAD verificado:

`87541f4d5f82739c4d65acd7a225d448f8159274`

**Terminado logging documental preview factura PT-LOG.5j-6h-2**

Este commit cierra el último subbloque funcional de PT-LOG.5j.

El usuario confirmó que los tests requeridos pasaron correctamente antes del push.

## 2.2. TPV Backup API

HEAD verificado:

`d1d3bdcde95d0e7d848347ec434b499025caa1b5`

**Tarea de reconciliacion 21.7.3a**

No ha sufrido cambios durante esta parte de la pausa técnica.

## 2.3. TPV Backup Front

No se han realizado cambios en TPV Backup Front durante esta pausa.

Último HEAD de referencia conservado desde v2.91:

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
7. no asumir que una búsqueda vacía de GitHub implica que algo no existe;
8. cuando exista una ruta conocida, preferir lectura exacta del archivo;
9. GitHub desde ChatGPT es estrictamente de solo lectura.

## 3.2. Entrega

Archivo nuevo:

- ruta exacta;
- contenido completo.

Archivo existente:

- ruta exacta;
- bloque identificable;
- reemplazo exacto.

Preferencias expresas:

- bloques pequeños y coherentes;
- evitar parches dispersos difíciles de aplicar desde móvil/SSH;
- cuando sea razonable, preferir archivos completos;
- no ZIP;
- probar antes de continuar;
- no avanzar con errores.

## 3.3. Estado de situación

En cada mensaje de desarrollo indicar siempre:

- **Dónde estamos**
- **Qué estamos haciendo**
- **Qué queda por delante**

---

# 4. Convenciones permanentes

## 4.1. TypeScript exports

**1 único símbolo exportado** → `export default`

**2 o más símbolos exportados** → exports nominales, nunca `export default`

## 4.2. Imports

Usar aliases absolutos siempre que exista uno.

Aliases Electron relevantes:

- `@bootstrap/*`
- `@backend/*`
- `@desktop-contracts/*`
- `@infrastructure/*`
- `@ipc/*`

## 4.3. Documentación de código

Todo método creado o modificado debe tener JSDoc/PHPDoc.

## 4.4. Regla permanente: métodos sin cuerpo vacío

Nunca proporcionar métodos con cuerpo vacío `{}`, tampoco en tests, mocks, stubs o fakes.

Un no-op deliberado debe hacer algo explícito, por ejemplo:

```ts
void event;
```

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
- usar `unknown` cuando proceda;
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

## 5.2. Durante PT-LOG

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

Si un bloque toca ambas capas, ampliar la batería.

Antes de cerrar PT-LOG.7 debe ejecutarse la batería completa del Client.

## 5.3. TPV Backup API

```bash
composer test
```

## 5.4. TPV Backup Front

```bash
npm test
npm run build
npm run lint
```

---

# 6. Versiones relevantes actuales del Client

Verificadas desde `package.json` de `main` al generar v2.92:

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

---

# 7. Hito 21 — CERRADO

El Hito 21 sigue oficialmente terminado.

Incluye `.otpv` v3, creación local, restauración nativa, importación legacy, almacenamiento remoto, autenticación, integridad, seguridad, retención, descarga, borrado, restore remoto, recuperación tras interrupciones, gestión administrativa, backups remotos automáticos diarios, UI del scheduler y regresión funcional real.

No reabrir el Hito 21 salvo evidencia nueva de un problema real.

---

# 8. `.otpv` v3 — contrato consolidado

ZIP exterior:

- `manifest.json`
- `payload.enc`

`payload.enc` contiene un ZIP interior cifrado.

Criptografía:

- `formatVersion = 3`
- `cryptoSuite = otpv3-scrypt-aes-256-gcm`
- scrypt salt 32 bytes
- cost 32768
- blockSize 8
- parallelization 3
- length 32 bytes
- AES-256-GCM
- DEK aleatoria por backup
- KEK derivada desde TPV Backup key
- IV 12 bytes
- auth tag 16 bytes

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

Máximo: **8 GiB**.

---

# 9. Logging — arquitectura consolidada

Objetivo:

> Un error manejable en UX debe dejar además una traza persistente, segura y útil para soporte.

Principios:

- logger best-effort;
- un fallo del logger no rompe la operación;
- Renderer no escribe filesystem;
- Main es el único escritor;
- registrar una incidencia una sola vez;
- preferir la capa que conoce el significado funcional;
- contexto escalar y explícito;
- validación / cancelación / estado esperado no son automáticamente error técnico.

Niveles:

```ts
type ApplicationLogLevel = 'debug' | 'info' | 'warn' | 'error';
```

Origen:

```ts
type ApplicationLogSource = 'main' | 'renderer';
```

Contexto permitido:

```ts
string | number | boolean | null
```

Logger persistente:

- `osumi-tpv.log`
- 10 MiB por fichero
- máximo 5
- cola asíncrona
- permisos `0600`
- record máximo 256 KiB
- contexto máximo 32 entradas

Nunca registrar:

- TPV Backup key/Secret;
- JWT;
- `secretApi`;
- password SMTP;
- token TicketBAI;
- Authorization;
- payload cifrado;
- requests/responses completas;
- datos personales/fiscales/comerciales salvo necesidad diagnóstica explícita.

---

# 10. PT-LOG.5h — Salidas de Caja — CERRADO

Commit:

`17ab618c7402df817ec4cf953c6b411b4986d0bf`

Eventos:

- `warn caja/load-cash-outflows`
- `error caja/create-cash-outflow`
- `error caja/update-cash-outflow`
- `error caja/delete-cash-outflow`

Sin concepto, descripción o importes en logs.

---

# 11. PT-LOG.5i — Ventas secundarias — CERRADO

Commits:

- `3a08842acab89db249da5a40d799cc3f9935d157` — reservas load + post-COMMIT auxiliar
- `2efa8d62244f4950c92163ed1d2b97c328236612` — mutaciones de reservas
- `f193caeb5d11bcaf82ed54432946d7be227a0f27` — creación de reserva
- `a3b58de398a3d2e6bf0315240f4a4ec312ed23b1` — lectura de devolución
- `1d37c12c64d5d79efe358273567d65c818bb8420` — histórico
- `1aa7b5d470425a7d0ba3d12846d1f88fcf08b168` — correcciones postventa
- `79696349613166ef196ae325842ebfda6ae21877` — reconciliación devolución
- `2200fc748fafb06c95fb321165d0f846a95fa0d9` — consultas artículos de venta

Eventos principales:

- `ventas/load-reservations`
- `ventas/post-commit-client-statistics`
- `ventas/post-commit-reservations-reload`
- `ventas/delete-reservation-line`
- `ventas/delete-reservation`
- `ventas/create-reservation`
- `ventas/load-return-source`
- `ventas/load-sales-history`
- `ventas/load-sales-history-detail`
- `ventas/post-sale-change-client`
- `ventas/post-sale-change-payment-type`
- `ventas/post-sale-refresh-detail`
- `ventas/reconcile-return`
- `ventas/resolve-sale-article`
- `ventas/search-sale-articles`
- `ventas/load-sale-direct-accesses`

---

# 12. PT-LOG.5j — Documentos / impresión / email / informes — CERRADO

PT-LOG.5j queda oficialmente cerrado con la auditoría realizada tras:

`87541f4d5f82739c4d65acd7a225d448f8159274`

Principio consolidado:

> El fallo se registra en la capa funcional que sabe qué operación documental estaba intentando hacer el usuario.

La infraestructura compartida de Chromium/printing permanece sin logger propio cuando el servicio funcional ya es propietario del error.

---

# 13. PT-LOG.5j-1 — Comprobante de reserva

Commit:

`bec75633d9b1dde87f9588d8e168c73ab06c1c04`

Evento:

- `warn ventas/print-reservation-receipt`

---

# 14. PT-LOG.5j-2 — PDF histórico de ticket

Commit:

`e560fe1143506e1ac6053674ff28c59236cd742f`

Evento:

- `warn ventas/generate-ticket-pdf`

---

# 15. PT-LOG.5j-3 — Reimpresión y ticket regalo

Commit:

`1c9b62d9b0ceaa5e4496a9338f0eb346abe278c3`

Eventos:

- `warn ventas/load-current-ticket-pdf`
- `warn ventas/reprint-ticket`
- `warn ventas/print-gift-ticket`

---

# 16. PT-LOG.5j-4 — Email de ticket

Commit:

`5f937c158f1f7b23049cb653c2fee9f77f4634ee`

Eventos:

- `warn ventas/prepare-ticket-email`
- `warn ventas/send-ticket-email`

No se registran destinatario, SMTP, template ni PDF.

---

# 17. PT-LOG.5j-5 — Facturas

## PDF definitivo

Commit:

`30c5c98d654465ea9a80daa8483468d4fe8f4bab`

Evento:

- `warn clientes/generate-invoice-pdf`

## Impresión

Commit:

`a08173c35b96dcc97c6db44e50425a0867f633c7`

Evento:

- `warn clientes/print-invoice`

Cancelación del diálogo → sin log.

## Email

Commit:

`a5b52a8ae7a94a3487e2ad0abf6ed3d7ec3d265f`

Eventos:

- `warn clientes/prepare-invoice-email`
- `warn clientes/send-invoice-email`

---

# 18. PT-LOG.5j-6a — Categorías

Commit:

`81f12216f9670c391d282fc7ad544f57c740d724`

Evento:

- `warn articulos/load-categories`

Cubre fallo IPC e incoherencia de jerarquía.

---

# 19. PT-LOG.5j-6b — Informes de Caja

Generación:

`3170d4edd5a6b2483d069e6adb199fc8133f81f0`

Eventos:

- `warn caja/load-simple-report`
- `warn caja/load-detailed-report`
- `warn caja/load-sales-report`

BrowserWindow/impresión:

`6ac3caad7a9f0c26dd87be62e2dc2d38e9626c6f`

Eventos:

- `warn caja/open-report-window`
- `warn caja/load-report-document`
- `warn caja/print-report`

En este bloque se corrigió además la extracción de `basename` para rutas Windows ejecutadas en POSIX usando `win32.isAbsolute()` + `win32.basename()`.

---

# 20. PT-LOG.5j-6c — Caducidades

Generación:

`06aa2f7aedde63acbebc0eeb9c666010d5e58649`

Evento:

- `warn almacen/load-expiration-report`

BrowserWindow/impresión:

`c089ffa19f4ee2105feb14d7049a09c4c32333d0`

Eventos:

- `warn almacen/open-expiration-report-window`
- `warn almacen/load-expiration-report-document`
- `warn almacen/print-expiration-report`

---

# 21. PT-LOG.5j-6d — Inventario

Snapshot:

`5edf3c02f1be52f725d8f71ed8182adb5ab2a20b`

Evento:

- `warn almacen/load-inventory-report`

CSV:

`76b285743dedf8aee9ffd72ddfec96c2e2f96847`

Evento:

- `warn almacen/export-inventory-csv`

Cancelación de Guardar → sin log.

BrowserWindow/impresión:

`74db7e9a6ce7c5dfbc5fa37fdf58ccd53ebdd6ad`

Eventos:

- `warn almacen/open-inventory-print-window`
- `warn almacen/load-inventory-print-document`
- `warn almacen/print-inventory`

---

# 22. PT-LOG.5j-6e — Imprenta

Preparación:

`712ab3ce82134523b7b62fdc40fab63d56d42735`

Evento:

- `warn almacen/load-print-articles`

Artículo desaparecido → estado de concurrencia/negocio, no log técnico.

BrowserWindow/impresión:

`15f4a1b30824066448bad2944dcd600389d1298b`

Eventos:

- `warn almacen/open-imprenta-print-window`
- `warn almacen/load-imprenta-print-document`
- `warn almacen/print-imprenta`

---

# 23. PT-LOG.5j-6f — Protección de datos

Commit:

`1222f5ac63a0c5525c28884f9bf5f2a3824e73ae`

Evento:

- `warn clientes/print-data-protection-document`

Decisión de privacidad:

**sin contexto**.

No se registran cliente, public ID, DNI/CIF, provincia, HTML ni contenido documental.

---

# 24. PT-LOG.5j-6g — Residuos de restauración de backups

Commit:

`3b1863e60dd1bc324317f909f64dbadfeb270730`

Se retiraron dos `console.error` legacy.

Eventos:

- `warn backup/inspect-restore-package`
- `warn backup/cleanup-remote-restore-package`

La limpieza remota es secundaria y nunca debe ocultar el error principal.

---

# 25. PT-LOG.5j-6h — Preview de factura

BrowserWindow/contexto:

`e738adbebf49b6a7af2ea766c9b59c1d4790971f`

Eventos:

- `warn clientes/open-invoice-preview-window`
- `warn clientes/load-invoice-preview-context`

Documento/refresco post-COMMIT:

`87541f4d5f82739c4d65acd7a225d448f8159274`

Eventos:

- `warn clientes/load-invoice-preview-document`
- `warn clientes/post-commit-invoice-preview-refresh`

`ClienteFacturaDocumentosService` no se convierte en logger genérico porque también es consumido por PDF/email.

Después de emitir:

```text
COMMIT confirmado
↓
markEmitted
↓
materializeAfterEmit
↓
refresco documental
```

Si falla el refresco, la factura sigue emitida.

---

# 26. Auditoría de cierre de PT-LOG.5j

Después de 6h-2 se volvió a revisar `main`.

Conclusión:

**PT-LOG.5j queda cerrado.**

Se revisaron específicamente:

- tickets;
- reservas;
- facturas;
- email;
- protección de datos;
- informes de Caja;
- Caducidades;
- Inventario;
- Imprenta;
- BrowserWindows especializadas;
- infraestructura compartida de impresión;
- renderers Chromium;
- diálogo PDF de factura;
- helper HTML de impresión;
- residuos de consola detectados durante la auditoría.

Permanecen deliberadamente sin logger propio:

- `PrintingService`
- `ElectronHtmlDocumentRenderer`
- `ElectronA4DocumentRenderer`
- `ElectronPdfPrintDialog`
- `printHtmlDocument`

Motivo: las capas funcionales que los consumen ya son propietarias del significado del error.

---

# 27. `console.error` intencionados

No eliminar mecánicamente estos fallbacks de emergencia:

1. startup de `main.ts` antes de existir logger;
2. `FileApplicationLogger.reportEmergencyFailure`;
3. `ApplicationLoggingService.reportLoggingFailure`;
4. `ApplicationErrorHandler.handleError` para conservar utilidad en desarrollo.

Los dos `console.error` legacy de restauración conocidos ya fueron migrados en PT-LOG.5j-6g.

La comprobación transversal definitiva de `console.*` pertenece todavía a PT-LOG.5l.

---

# 28. PT-LOG.5k — TicketBAI directo — PENDIENTE

Este es el siguiente bloque.

PT-LOG.5d ya cubre TicketBAI como post-COMMIT inicial de una venta.

Todavía hay que auditar:

- `processInitial`;
- `reconcile`;
- `retry`;
- histórico;
- acciones manuales;
- recuperación de estado;
- errores inesperados;
- `TicketBaiClientError`.

Nunca registrar:

- token;
- payload fiscal completo;
- Authorization;
- respuesta completa por defecto.

---

# 29. PT-LOG.5l — Auditoría técnica final — PENDIENTE

Después de TicketBAI revisar transversalmente:

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
- operaciones de red;
- configuración;
- duplicados Main/Renderer;
- capas que absorben excepciones.

No convertir automáticamente cada `catch` en log.

---

# 30. PT-LOG.6 — Soporte / acceso a logs — PENDIENTE

Objetivo:

poder recuperar posteriormente la información necesaria para soporte.

Opciones a estudiar:

- abrir carpeta de logs;
- copiar ruta;
- exportar paquete de soporte;
- ZIP explícito;
- rango temporal;
- selección de archivos;
- versión/entorno.

Regla:

**un paquete de soporte no es un backup `.otpv`.**

Nunca incluir secretos ni convertirlo en parte del restore.

---

# 31. PT-LOG.7 — Regresión final — PENDIENTE

Debe cubrir:

- persistencia;
- orden;
- `flush`;
- rotación 10 MiB / 5 ficheros;
- sanitización Bearer/JWT/token/password/secret/apiKey;
- límites de contexto/error/record;
- AggregateError;
- cause profundo;
- números no finitos;
- fallos de directorio/append/rotate;
- IPC Renderer inválido;
- sender no fiable;
- error global;
- backup;
- venta;
- caja;
- impresión;
- TicketBAI;
- filesystem;
- DB.

Batería final:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

---

# 32. Pausa técnica Windows / Linux — ACORDADA Y PENDIENTE

Después de cerrar completamente logging y antes del Hito 22 se hará una pausa específica de compatibilidad real entre Windows y Linux.

No debe limitarse a “compila en Linux”.

Revisar sistemáticamente:

- construcción y parsing de rutas;
- separadores Windows/POSIX;
- filesystem;
- permisos;
- temporales;
- Electron;
- ventanas y diálogos nativos;
- impresión;
- impresoras y drivers;
- packaging;
- build;
- distribución;
- procesos;
- dependencias nativas;
- `better-sqlite3`;
- `sharp`;
- APIs o supuestos Windows-only.

Primera incidencia ya detectada:

`node:path.basename()` sobre una ruta `C:\...` ejecutándose en POSIX.

Solución actual:

- `win32.isAbsolute()`;
- `win32.basename()` para rutas Windows;
- `basename()` en el resto.

---

# 33. Hito 22 — POSPUESTO

Siguiente gran hito funcional:

**Hito 22 — Sincronización tienda online**

No comenzar todavía.

Orden acordado:

```text
✅ Hito 21
↓
▶️ Pausa logging
↓
⏳ Pausa Windows/Linux
↓
⏳ Hito 22
```

---

# 34. TicketBAI 12C.9

Estado independiente:

**pendiente de Berein**

`@osumi/ticketbaiws` actual: `1.0.1`.

Cuando Berein responda o actualice documentación habrá que revisar:

- tipos;
- endpoints;
- documentación;
- SDK;
- Client;
- decisiones previas.

---

# 35. Nota paralela sobre Electron `protocol.registerSource()`

Electron 44.6.0 introdujo experimentalmente `protocol.registerSource()`.

Decisión:

- no introducirlo durante el desarrollo actual;
- reevaluarlo cuando deje de ser experimental;
- existe seguimiento separado para ello.

---

# 36. Arquitectura crítica que no debe romperse

## SQLite

Nunca copiar SQLite operacional directamente; usar snapshot consistente.

## TPV Backup zero knowledge

El servidor nunca recibe TPV Backup key ni descifra `payload.enc`.

## Restore

```text
credenciales temporales en RAM
↓
finalize
↓
safeStorage definitivo
```

## Scheduler

- backup manual ≠ backup automático;
- fallo ≠ éxito;
- varios días pendientes → una sola copia catch-up.

## Logging

- Renderer → no filesystem;
- Main → único escritor;
- contexto escalar explícito;
- `logs/` no portable.

---

# 37. Decisiones/bugs históricos que no deben reabrirse sin evidencia

- estado stale de TPV Backup en Gestión;
- `getConnection()` remoto stale;
- credenciales temporales restore;
- limpieza tras instalación incompleta;
- integridad SHA upload/download;
- ruta `.tmp` del estado automático;
- duplicados del scheduler;
- resume tras suspensión;
- cambios de configuración en caliente;
- UI de `mat-error` transparente;
- compatibilidad backup antiguo sin hora automática;
- backup manual no satisface ciclo automático;
- el flag legacy `app_data.json.empleados` ya no debe gobernar si hay varios empleados;
- el exportador legacy debe ignorar ese flag;
- rutas Windows deben analizarse explícitamente si el código puede ejecutarse en POSIX.

---

# 38. Commits desde v2.91

La v2.91 terminó en:

`6518202730e7a56a006d0bf5b502f6ac9a334703` — **Terminado logging cierre caja PT-LOG.5g**

Desde entonces:

- `17ab618c7402df817ec4cf953c6b411b4986d0bf` — PT-LOG.5h salidas Caja
- `3a08842acab89db249da5a40d799cc3f9935d157` — PT-LOG.5i-1
- `2efa8d62244f4950c92163ed1d2b97c328236612` — PT-LOG.5i-2
- `f193caeb5d11bcaf82ed54432946d7be227a0f27` — PT-LOG.5i-3
- `a3b58de398a3d2e6bf0315240f4a4ec312ed23b1` — PT-LOG.5i-4a
- `1d37c12c64d5d79efe358273567d65c818bb8420` — PT-LOG.5i-4b
- `1aa7b5d470425a7d0ba3d12846d1f88fcf08b168` — PT-LOG.5i-4c
- `79696349613166ef196ae325842ebfda6ae21877` — PT-LOG.5i-4d
- `2200fc748fafb06c95fb321165d0f846a95fa0d9` — PT-LOG.5i-5
- `bec75633d9b1dde87f9588d8e168c73ab06c1c04` — PT-LOG.5j-1
- `e560fe1143506e1ac6053674ff28c59236cd742f` — PT-LOG.5j-2
- `1c9b62d9b0ceaa5e4496a9338f0eb346abe278c3` — PT-LOG.5j-3
- `5f937c158f1f7b23049cb653c2fee9f77f4634ee` — PT-LOG.5j-4
- `30c5c98d654465ea9a80daa8483468d4fe8f4bab` — PT-LOG.5j-5a
- `a08173c35b96dcc97c6db44e50425a0867f633c7` — PT-LOG.5j-5b
- `a5b52a8ae7a94a3487e2ad0abf6ed3d7ec3d265f` — PT-LOG.5j-5c
- `81f12216f9670c391d282fc7ad544f57c740d724` — PT-LOG.5j-6a
- `3170d4edd5a6b2483d069e6adb199fc8133f81f0` — PT-LOG.5j-6b-1
- `6ac3caad7a9f0c26dd87be62e2dc2d38e9626c6f` — PT-LOG.5j-6b-2
- `06aa2f7aedde63acbebc0eeb9c666010d5e58649` — PT-LOG.5j-6c-1
- `c089ffa19f4ee2105feb14d7049a09c4c32333d0` — PT-LOG.5j-6c-2
- `5edf3c02f1be52f725d8f71ed8182adb5ab2a20b` — PT-LOG.5j-6d-1
- `76b285743dedf8aee9ffd72ddfec96c2e2f96847` — PT-LOG.5j-6d-2a
- `74db7e9a6ce7c5dfbc5fa37fdf58ccd53ebdd6ad` — PT-LOG.5j-6d-2b
- `712ab3ce82134523b7b62fdc40fab63d56d42735` — PT-LOG.5j-6e-1
- `15f4a1b30824066448bad2944dcd600389d1298b` — PT-LOG.5j-6e-2
- `1222f5ac63a0c5525c28884f9bf5f2a3824e73ae` — PT-LOG.5j-6f
- `3b1863e60dd1bc324317f909f64dbadfeb270730` — PT-LOG.5j-6g
- `e738adbebf49b6a7af2ea766c9b59c1d4790971f` — PT-LOG.5j-6h-1
- `87541f4d5f82739c4d65acd7a225d448f8159274` — PT-LOG.5j-6h-2

---

# 39. Estado exacto al cerrar v2.92

## Osumi TPV Client

HEAD:

`87541f4d5f82739c4d65acd7a225d448f8159274`

## Estado lógico

- ✅ Hito 21
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
- ✅ PT-LOG.5h
- ✅ PT-LOG.5i
- ✅ PT-LOG.5j
- ▶️ PT-LOG.5k — TicketBAI directo
- ⏳ PT-LOG.5l
- ⏳ PT-LOG.6
- ⏳ PT-LOG.7
- ⏳ pausa Windows/Linux
- ⏳ Hito 22
- ⏸ TicketBAI 12C.9 — espera Berein

---

# 40. Checklist para una conversación nueva

1. localizar `docs/osumi-tpv-continuidad-v2.92.md`;
2. revisar `main`;
3. comprobar si HEAD sigue siendo o deriva de `87541f4d5f82739c4d65acd7a225d448f8159274`;
4. asumir Hito 21 cerrado y PT-LOG.5a–5j cerrados;
5. siguiente bloque: PT-LOG.5k;
6. PT-LOG.5l, 6 y 7 pendientes;
7. pausa Windows/Linux obligatoria antes de Hito 22;
8. releer archivos exactos de TicketBAI antes de proponer cambios;
9. GitHub solo lectura;
10. usar aliases;
11. JSDoc/PHPDoc;
12. no métodos vacíos;
13. bloques pequeños;
14. tests tras cada bloque;
15. no avanzar con tests fallidos;
16. indicar siempre dónde estamos / qué hacemos / qué queda;
17. logging: una incidencia una vez, contexto mínimo, sin secretos, validación ≠ error técnico, post-COMMIT recuperable normalmente `warn`, fallo que invalida operación normalmente `error`.

---

# 41. Regla final

Para continuar:

```text
main actual
→ continuidad más reciente
→ conversación activa
```

Objetivo central:

> Los errores deben seguir siendo manejables para el usuario en el momento, pero además deben dejar una traza persistente, segura y útil para poder diagnosticar después qué ocurrió realmente.

La meta no es tener muchos logs.

La meta es tener **los logs correctos, en el punto correcto, con la severidad correcta, sin duplicados y sin comprometer la operación, la privacidad ni la seguridad**.
