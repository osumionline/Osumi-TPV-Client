# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 2.41  
**Fecha:** 6 de septiembre de 2026  
**Base de continuidad:** `v2.41 + main` una vez este documento se suba al repositorio.

## Estado de alto nivel

TicketBAI ordinario permanece **cerrado ✅** y `12C.9 — TicketBAI devoluciones/mixtas` continúa **⏸️ bloqueado por Berein**.

El **Hito 13 — Artículos** está completamente terminado, validado y subido al repositorio ✅.

El **Hito 14 — Clientes** está prácticamente terminado. `14A–14J`, `14K.1–14K.5` y `14K.6A` están cerrados, validados mediante tests y pruebas funcionales y subidos al repositorio. El único punto pendiente antes de cerrar Clientes es:

```text
14K.6B — Regresión integral + cierre Hito 14
```

El módulo Clientes dispone ya de ficha persistente, búsqueda, facturación alternativa, ventas, estadísticas, consumo mensual y un sistema completo de facturas: borradores, emisión, preview interactiva, PDF definitivo inmutable, impresión, email, anulación e integración directa con la finalización de ventas mediante la opción **Imprimir factura**.

---

# 1. Estado resumido

```text
Installation + importación .otpv v2               ✅
Startup                                           ✅
Auditoría + Refactor A–E                          ✅

Ventas 1–11                                       ✅
Ventas 12 — Postventa                             🟦
  12C.8 TicketBAI ordinario                       ✅ CERRADO
  12C.9 TicketBAI devoluciones/mixtas             ⏸️ Berein
  12C.10 Regresión integral final                 ⬜

13 Artículos                                      ✅ HITO CERRADO

14 Clientes                                       🟦 CASI CERRADO
  14A Documento de continuidad y plan             ✅
  14B Base del apartado Clientes                  ✅
  14C Búsqueda y selección                        ✅
  14D Workspace y formulario                     ✅
  14E Persistencia y mantenimiento                ✅
  14F Ventas del cliente                          ✅
  14G Estadísticas generales                      ✅
  14H Consumo mensual                             ✅
  14I Dominio y listado de facturas               ✅
  14J Editor de factura                           ✅

  14K Emisión y documentos                        🟦
    14K.1 Emisión transaccional                   ✅
    14K.2 Documento y previsualización            ✅
    14K.3 PDF definitivo inmutable                ✅
    14K.4 Impresión y email                       ✅
    14K.5 Anulación                               ✅
    14K.6 Integración final con Ventas            🟦
      14K.6A “Imprimir factura” tras venta        ✅ CERRADO
      14K.6B Regresión integral + cierre Hito 14  ⬅️ SIGUIENTE

15 Almacén                                        ⬜
16 Compras                                        ⬜

Star TSP100/TSP143 80 mm                          ⏸️ prueba física no bloqueante
```

---

# 2. Convenciones de trabajo

- Angular standalone.
- Angular 22.
- Signals: `signal()`, `computed()`, `input()`, `output()`, `inject()`.
- No añadir explícitamente `ChangeDetectionStrategy.OnPush`.
- TypeScript estricto.
- No usar `any`; usar `unknown` cuando corresponda.
- Templates con `@if`, `@for`, `@switch`.
- Todo método TS/JS nuevo lleva JSDoc breve.
- Líneas en blanco solo con finalidad estructural.
- No separar con líneas vacías cada propiedad de una interfaz u objeto.
- Sí separar visualmente métodos, bloques de responsabilidades y secciones distintas.
- Archivo nuevo: mostrar contenido completo.
- Archivo existente: mostrar fragmento actual reconocible → fragmento nuevo.
- Para imports: indicar únicamente los imports nuevos; Prettier decide el orden.
- Trabajar en lotes coherentes, no micro-pasos.
- Revisar siempre `main` actual antes de proponer patches.
- No avanzar al siguiente mini-hito sin confirmación explícita del usuario.
- Al comenzar cada bloque, incluir resumen visible de:
  - terminado;
  - punto actual;
  - pendiente.
- El usuario aplica manualmente cambios, ejecuta tests/build/lint y sube commits.
- El asistente no hace commits ni PRs.

## Convención de exports

- Si un archivo exporta un único elemento: `export default`.
- Si exporta varios elementos: exports nombrados y ningún `default`.
- Aplicar también a interfaces, tipos, constantes y clases.

## Comandos habituales

Frontend:

```bash
npm test
npm run build
npm run lint
```

Backend/Electron/contratos/repository/IPC/preload:

```bash
npm run test:electron
npm run build:electron
npm run lint
```

Batería completa para cambios cross-layer:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
npm run lint
```

`npm test` ya incorpora `--watch=false`; no añadirlo.

---

# 3. Política SQLite durante desarrollo

Hasta la primera versión estable con usuarios reales:

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones todavía.

Si aparece un cambio incompatible:

```text
mantener DATABASE_SCHEMA_VERSION = 1
→ borrar instalación/base local
→ recrear instalación
→ reimportar .otpv
```

Las migraciones reales y el incremento de versión del esquema empezarán después de la primera versión estable.

---

# 4. TicketBAI — estado

## 4.1 Ordinario

```text
12C.8 TicketBAI ordinario ✅ CERRADO
```

Principios cerrados:

- `@osumi/ticketbaiws` 1.0.1.
- `production` es el entorno por defecto.
- Durante desarrollo manual se usa `app_data.json → ticketBai.environment = "test"` y token TEST.
- No añadir selector de entorno TicketBAI a UI.
- PENDING es un resultado válido.
- Identidad fiscal congelada.
- Solo `rechazada` permite `resend()`.
- `error_temporal` se reconcilia antes de actuar.
- `error_permanente` informa y no muta automáticamente.
- El fallo TicketBAI no revierte una venta comercial confirmada.

## 4.2 Devoluciones/mixtas

```text
12C.9 TicketBAI devoluciones/mixtas ⏸️
```

Bloqueado hasta respuesta/documentación suficiente de Berein. No implementar por intuición.

## 4.3 Facturas de cliente y TicketBAI

Regla crítica:

```text
Factura de cliente ≠ operación TicketBAI
```

Las ventas ya fueron cobradas y procesaron su flujo TicketBAI correspondiente.

Crear, editar, emitir, previsualizar, imprimir, enviar o anular una factura de cliente **no llama a TicketBAI**.

---

# 5. Hito 14 — Arquitectura general de Clientes

## 5.1 Workspace

Existe un único workspace de cliente.

Durante la sesión conserva:

- cliente activo;
- draft;
- `baseSnapshot`;
- dirty;
- sección activa.

Cambiar/cerrar/crear ficha con dirty requiere confirmación.

Secciones:

```text
Datos
Facturación
Facturas
Ventas
Estadísticas
Consumo mensual
```

Cliente nuevo no persistido: solo Datos/Facturación hasta guardarlo.

## 5.2 Guardado

- Draft compartido.
- Guardar/Cancelar global.
- Solo nombre obligatorio.
- Datos alternativos de facturación se preservan aunque `factIgual = true`.
- Si `factIgual = false`, se validan los campos alternativos necesarios.
- CREATE/UPDATE transaccionales.
- Reconciliación post-COMMIT sin reload innecesario.
- UPDATE preserva la instancia canónica del cliente cuando corresponde.

## 5.3 Baja

- Baja lógica transaccional.
- Se bloquea si existen borradores activos de factura.
- Históricos de ventas/facturas permanecen.
- Éxito invalida las cachés necesarias y cierra workspace.

---

# 6. Ventas y estadísticas del cliente

## 6.1 Ventas

La pestaña Ventas reutiliza el histórico general, filtrado por cliente.

Incluye:

- filtros;
- listado;
- detalle histórico;
- PDF/ticket;
- reimpresión;
- email.

Cambiar posteriormente el cliente de una venta no reescribe la relación histórica con una factura ya emitida/anulada.

## 6.2 Estadísticas

Cerradas:

- estadísticas generales;
- jerarquía anual/mensual;
- total general;
- beneficio/margen;
- top;
- consumo mensual y series completas.

---

# 7. Facturas — modelo funcional cerrado

## 7.1 Naturaleza

Una factura de cliente agrupa `1..N` ventas ya cobradas.

Solo admite ventas:

- del cliente correspondiente;
- ordinarias;
- positivas;
- no eliminadas;
- no devolución;
- no mixtas;
- sin otra relación de factura activa.

## 7.2 Relación factura ↔ venta

```text
venta
→ 0..1 relación activa de factura
→ 0..N relaciones históricas inactivas
```

Tabla:

```text
factura_venta
```

`activa = 1` bloquea la venta para otras facturas.

`activa = 0` conserva historia pero libera la venta.

Existe unicidad parcial para impedir más de una relación activa por venta.

## 7.3 Estados

```text
borrador
emitida
anulada
```

Reglas:

```text
borrador
  numero = null
  fecha_emision = null
  fecha_anulacion = null

emitida
  numero != null
  fecha_emision != null
  fecha_anulacion = null

anulada
  numero != null
  fecha_emision != null
  fecha_anulacion != null
```

`deleted_at` no se usa para anulación.

## 7.4 Numeración

- Serie actual: `''`.
- Numeración global por serie.
- Empieza desde `facturaInicial` o fallback 1.
- La secuencia se prepara con `max(importado, facturaInicial - 1)`.
- El número se consume solo al emitir.
- Nunca se reutiliza.
- Una factura anulada conserva su número.
- Formato visible:

```text
numero_AÑO
```

Ejemplo:

```text
21_2026
```

Borrador/previsualización:

```text
_2026
```

Nunca mostrar al usuario el publicId o id interno como número de factura.

---

# 8. 14J — Editor de factura ✅

## 8.1 Ventas disponibles

Consulta backend específica.

Para un borrador actual:

- sus propias relaciones activas siguen seleccionables;
- se marcan con `incluidaEnBorrador = true`.

Las relaciones activas de otra factura bloquean.

Las relaciones históricas inactivas no bloquean.

## 8.2 CRUD

### Crear borrador

- mínimo una venta;
- ventas revalidadas dentro de la transacción;
- importe recalculado en SQLite;
- snapshot de facturación del cliente;
- relaciones activas.

### Actualizar

- solo borrador activo del mismo cliente;
- revalidación;
- sincronización de relaciones;
- recálculo de importe/snapshot.

### Eliminar

- baja lógica del borrador;
- relaciones de borrador eliminadas físicamente para liberar ventas.

## 8.3 Editor Angular

Modal propio.

Modos:

```text
Nueva factura
Borrador
Factura numero_AÑO
```

Nueva/borrador:

- selección de ventas a la izquierda;
- detalle histórico de venta a la derecha;
- editable.

Emitida/anulada:

- lectura histórica;
- no editable.

Dirty propio y confirmación al cerrar.

La ficha de cliente queda bloqueada mientras el editor está abierto.

---

# 9. 14K.1 — Emisión transaccional ✅

`ClienteFacturasRepository.emitBorrador()`:

1. resuelve cliente y datos efectivos de facturación;
2. resuelve borrador activo del mismo cliente;
3. recupera relaciones actuales;
4. revalida ventas;
5. recalcula importe;
6. obtiene siguiente número;
7. actualiza snapshot/estado/número/fecha;
8. todo dentro de una única transacción.

Si falla la transacción:

```text
no se consume número
no queda emisión parcial
```

Tras COMMIT:

- Angular adopta la respuesta emitida;
- no necesita GET post-COMMIT para confirmar la operación.

---

# 10. 14K.2 — Documento y previsualización ✅

## 10.1 Modelo documental

El documento se construye desde snapshots históricos:

- factura;
- cliente congelado;
- ventas;
- líneas de venta históricas;
- importes;
- IVA.

No usa datos actuales de artículos para reconstruir documentos históricos.

Backend calcula las cifras que consumen tanto preview como PDF.

## 10.2 Previsualización

La previsualización **no es un PDF**.

Es una BrowserWindow Electron independiente con página HTML interactiva y preload mínimo.

Características:

- ventana maximizada;
- logo `osumi://assets/logo`;
- cabecera tienda izquierda;
- fecha/número y cliente derecha;
- `AppData.nombreComercial` bajo el logo;
- número `_AÑO` en borrador;
- todas las ventas inicialmente contraídas;
- cada venta puede desplegar/ocultar sus líneas;
- control global en cabecera para desplegar/contraer todas;
- iconos Angular Material para esos controles;
- resumen fiscal;
- `PREVISUALIZACIÓN`;
- botón `Facturar`.

Al facturar desde preview:

```text
COMMIT emisión
→ preview adopta documento emitido
→ desaparece PREVISUALIZACIÓN
→ aparece PAGADO
→ cerrar ventana devuelve la factura emitida a la ventana principal
```

El preload de preview solo expone:

```text
getDocumento()
emitFactura()
```

No expone la API completa de escritorio.

---

# 11. 14K.3 — PDF definitivo inmutable ✅

## 11.1 Formato

Formato definitivo:

```text
A4 vertical
```

La preview interactiva no cambia por la orientación del PDF.

El PDF final:

- logo;
- `nombreComercial` en cabecera;
- datos fiscales;
- cliente;
- fecha;
- `numero_AÑO`;
- una fila resumen por venta/ticket;
- subtotales/IVA/descuento/total;
- `PAGADO`.

Nunca incluye las líneas de artículos.

## 11.2 Inmutabilidad

Ruta:

```text
files/clientes/facturas/<facturaPublicId>.pdf
```

Semántica:

```text
no existe → guardar
ya existe → conservar primeros bytes válidos
```

No sobrescribir nunca un PDF definitivo ya materializado.

El storage usa protección frente a carreras (`COPYFILE_EXCL`).

## 11.3 Materialización

`ClienteFacturaPdfService.getOrCreatePdf()`:

```text
PDF existente
→ devolver mismos bytes

PDF ausente
→ documento
→ HTML
→ renderer A4
→ storage inmutable
→ releer bytes canónicos
```

Deduplica materializaciones simultáneas en memoria.

Regla post-COMMIT:

```text
factura ya emitida
→ intentar materializar PDF
→ si Chromium/filesystem falla:
   factura sigue emitida
   número sigue consumido
   error documental no falsea el COMMIT
   PDF puede materializarse posteriormente
```

---

# 12. 14K.4 — Impresión y email ✅

## 12.1 Impresión

No usa la impresora térmica configurada para tickets.

Flujo:

```text
factura emitida
→ ClienteFacturaPdfService.getOrCreatePdf()
→ bytes canónicos inmutables
→ ventana Electron temporal
→ diálogo estándar de impresión
```

El usuario elige impresora, copias, etc.

Orientación propuesta:

```text
A4 vertical
```

Cancelar el diálogo es una salida normal y no genera error.

## 12.2 Email

Se reutilizan:

- configuración SMTP existente;
- `SecretStorage`;
- `NodemailerEmailSender`;
- contrato de adjuntos `Uint8Array`.

Se adjunta exactamente el mismo PDF canónico usado para imprimir.

Nombre de fichero:

```text
factura-<numero_AÑO>.pdf
```

Criterio definitivo de nombres:

```text
PDF / cabecera factura     → AppData.nombreComercial
From name del email        → AppData.nombre
Asunto del email           → AppData.nombre
Cuerpo del email           → AppData.nombre
```

El destinatario inicial procede de:

```text
workspace.baseSnapshot.email
```

Es editable solo para ese envío y no modifica la ficha del cliente.

Durante SMTP, el listado comunica `actionProcessingEvent` y se integra con el `processing()` global de Clientes.

En error:

- se desbloquea la ficha;
- el formulario permanece abierto;
- el usuario puede corregir/reintentar.

---

# 13. 14K.5 — Anulación ✅ CERRADO

## 13.1 Transacción

Transición:

```text
emitida
→ anulada
```

La operación:

- exige factura emitida activa;
- establece `estado = anulada`;
- establece `fecha_anulacion`;
- conserva:
  - serie;
  - número;
  - fecha de emisión;
  - importe;
  - snapshot;
  - PDF;
- convierte todas sus relaciones activas `factura_venta` a `activa = 0`.

La anulación es atómica.

Si la factura emitida no tuviera relaciones activas coherentes, se hace rollback.

## 13.2 Efecto sobre ventas

Después de anular:

```text
ventas siguen visibles en el histórico de esa factura
+
ventas vuelven a estar disponibles para otra factura
```

## 13.3 UI

Factura emitida abierta:

```text
Anular
```

Botón destructivo rojo.

Confirmación explica:

- las ventas se liberarán;
- número/documento se conservarán.

Tras éxito:

- editor permanece en modo consulta;
- estado pasa a Anulada;
- desaparece Anular;
- listado se reconcilia sin GET post-COMMIT;
- Email/Imprimir desaparecen por capacidades.

PDF físico permanece intacto.

---

# 14. 14K.6A — “Imprimir factura” al finalizar venta ✅ CERRADO

Este requisito se había dejado expresamente pendiente desde el desarrollo del modal de finalización de Ventas.

Ya está implementado, validado funcionalmente y subido.

## 14.1 Opción del modal

Nuevo valor:

```text
imprimir-factura
```

Etiqueta:

```text
Imprimir factura
```

Sustituye al placeholder anterior `factura`.

## 14.2 Condiciones

La opción solo se habilita cuando:

```text
✅ pago/finalización completa
✅ cliente asignado
✅ venta ordinaria
✅ importe positivo
✅ no devolución
✅ no venta mixta
```

Sin cliente:

```text
Imprimir factura → deshabilitado
```

La condición de UI es solo preventiva; backend vuelve a revalidar autoritativamente la venta persistida.

## 14.3 Solicitud de finalización

`VentaFinalizacionSolicitud` incluye:

```ts
imprimirTicket
imprimirFactura
```

La acción `imprimir-factura` solicita:

```text
imprimirTicket = true
imprimirFactura = true
```

Es decir, **Imprimir factura siempre imprime también el ticket**.

## 14.4 Caso de uso atómico Venta → Factura

Se añadió un caso de uso específico, no una secuencia externa CREATE borrador + EMIT.

Conceptualmente:

```text
createEmitidaFromVenta(clientePublicId, ventaPublicId)
```

Todo ocurre en una única transacción SQLite:

```text
resolver cliente
→ resolver datos efectivos de facturación
→ revalidar ESA venta
→ calcular importe
→ insertar factura
→ insertar relación activa
→ consumir siguiente número
→ finalizar factura
→ COMMIT
```

No existe un borrador observable o persistente intermedio.

Si algo falla:

```text
no queda borrador
no queda relación parcial
no se consume número
```

La factura contiene **solo la venta recién finalizada**.

## 14.5 Bridge

El caso de uso está expuesto mediante:

```text
ClienteFacturasRepository.createEmitidaFromVenta()
ClienteFacturasService.createFacturaDesdeVenta()
ClientesApi.createFacturaDesdeVenta()
IPC
preload
ClientesService.createFacturaDesdeVenta()
```

La respuesta se reconcilia con la caché de facturas si ya estaba cargada.

Si la caché no estaba cargada, no se crea una caché parcial artificial.

## 14.6 Materialización

Después del COMMIT de la factura:

```text
materializeAfterEmit()
```

El fallo documental sigue siendo post-COMMIT y no revierte la factura.

## 14.7 Flujo post-COMMIT de Venta

`VentaPostCommitService.run()` ahora contempla:

```text
idVenta
reloadReservas
clientePublicId
imprimirTicket
ventaPublicId
imprimirFactura
```

Orden definitivo:

```text
1. venta ya guardada/COMMIT
2. invalidar estadísticas del cliente cuando corresponde
3. recargar reservas cuando corresponde
4. TicketBAI
5. generar/conservar PDF del ticket
6. imprimir ticket si se solicitó
7. crear+emitir factura si se solicitó
8. abrir diálogo estándar de impresión de la factura
9. devolver warnings post-COMMIT
10. cerrar pestaña de venta / continuar flujo normal
```

El orden funcional clave queda protegido por tests:

```text
ticketbai
→ pdf ticket
→ print ticket
→ factura
→ factura-print
```

## 14.8 Política de fallos

Una vez guardada la venta, nunca se intenta deshacer/repetir la operación comercial por un fallo posterior.

### Falla TicketBAI

```text
warning
→ ticket continúa
→ factura continúa
```

### Falla impresión térmica

```text
warning
→ factura continúa
```

### Falla creación de factura

```text
venta sigue finalizada
ticket ya procesado
warning
no se repite la venta
```

### Factura creada pero falla diálogo A4

```text
factura sigue emitida y numerada
PDF puede recuperarse/reimprimirse después
warning
```

Cancelar el diálogo A4 no es un error.

## 14.9 Prueba funcional validada

Flujo real probado:

```text
venta ordinaria positiva
+ cliente asignado
→ Finalizar
→ Imprimir factura
→ completar pago
→ finalizar
```

Resultado validado:

```text
✅ venta guardada
✅ ticket enviado a impresión
✅ factura creada con una única venta
✅ factura emitida y numerada
✅ PDF definitivo materializado/reutilizado
✅ diálogo estándar A4 abierto
✅ flujo de venta termina correctamente
✅ factura aparece después en Clientes
```

También validada la desactivación de la opción cuando no cumple condiciones.

---

# 15. Archivos clave del bloque Facturas

## Backend / contratos

```text
electron/backend/contracts/clientes/
  cliente-facturas.repository.interface.ts
  cliente-factura-documentos.repository.interface.ts
  cliente-factura-pdf-storage.interface.ts
  cliente-factura-preview-window.interface.ts
  crear-cliente-factura-borrador-record-command.interface.ts
  actualizar-cliente-factura-borrador-record-command.interface.ts
  eliminar-cliente-factura-borrador-record-command.interface.ts
  emitir-cliente-factura-record-command.interface.ts
  anular-cliente-factura-record-command.interface.ts
  crear-cliente-factura-desde-venta-record-command.interface.ts

electron/contracts/clientes/
  cliente-factura.interface.ts
  cliente-factura-documento.interface.ts
  cliente-factura-preview-api.interface.ts
  crear-cliente-factura-borrador-command.interface.ts
  actualizar-cliente-factura-borrador-command.interface.ts
  eliminar-cliente-factura-borrador-command.interface.ts
  emitir-cliente-factura-command.interface.ts
  anular-cliente-factura-command.interface.ts
  crear-cliente-factura-desde-venta-command.interface.ts
  cliente-factura-email-command.interface.ts
  clientes-api.interface.ts
```

## Backend application

```text
electron/backend/application/clientes/
  cliente-facturas.service.ts
  cliente-factura-documentos.service.ts
  cliente-factura-pdf-html.builder.ts
  cliente-factura-pdf.service.ts
  cliente-factura-print.service.ts
  cliente-factura-email.service.ts
```

## Infrastructure

```text
electron/infrastructure/database/typeorm/
  typeorm-cliente-facturas.repository.ts

electron/infrastructure/electron/
  electron-a4-document.renderer.ts
  electron-cliente-factura-preview-window.ts
  electron-pdf-print-dialog.ts

electron/infrastructure/filesystem/
  file-cliente-factura-pdf.storage.ts
```

## IPC / preload

```text
electron/ipc/
  channels.ts
  register-clientes-ipc.ts
  register-cliente-factura-preview-ipc.ts

electron/
  preload.ts
  factura-preview-preload.ts
```

## Angular Clientes

```text
src/app/services/
  clientes.service.ts

src/app/modules/clientes/components/
  client-invoices/
  client-invoice-editor/
  client-invoice-email-form/

src/app/modules/clientes/pages/
  clients/
  client-invoice-preview/
```

## Angular Ventas / integración finalización

```text
src/app/model/ventas/
  venta-finalizacion-accion.type.ts
  venta-finalizacion-solicitud.interface.ts

src/app/modules/ventas/components/
  sale-finalization/
  sale-workspace/

src/app/services/
  venta-post-commit.service.ts
```

## Documentos compartidos

```text
electron/contracts/documents/
  business-logo-url.constant.ts

src/app/model/documents/
  business-logo-url.constant.ts
```

---

# 16. Decisiones que NO deben reabrirse sin requisito nuevo

- Facturas no llaman a TicketBAI.
- Borrador no tiene número.
- Número se asigna solo al emitir.
- Número nunca se reutiliza.
- Anular no borra número, snapshot ni PDF.
- Venta solo puede tener una relación activa de factura.
- Relaciones históricas inactivas no bloquean nuevas facturas.
- PDF definitivo es A4 vertical.
- PDF definitivo no incluye líneas de artículos.
- Preview sí permite ver líneas.
- Preview no es PDF.
- PDF materializado es inmutable.
- Impresión de factura usa diálogo estándar, no impresora térmica.
- Email e impresión usan los mismos bytes canónicos.
- Cabecera PDF usa `nombreComercial`.
- Email `fromName`, asunto y cuerpo usan `nombre`.
- Destinatario de factura parte del email persistido del cliente y puede editarse solo para el envío.
- `Imprimir factura` al finalizar una venta exige cliente.
- `Imprimir factura` imprime primero el ticket y después crea/imprime la factura.
- La factura automática contiene exclusivamente la venta recién finalizada.
- Creación automática desde venta es atómica y nunca deja borrador intermedio.
- Fallos post-COMMIT no revierten la venta ni una factura ya emitida.

---

# 17. Avisos conocidos de tests

En un test de relaciones históricas puede aparecer en stdout:

```text
UNIQUE constraint failed: factura_venta.id_venta
```

si el propio test intenta deliberadamente crear una segunda relación activa para comprobar la restricción.

Si Vitest marca el test como `✓`, ese mensaje es esperado y no es una regresión.

---

# 18. Siguiente bloque exacto

```text
14K.6B — Regresión integral + cierre Hito 14
```

No queda una funcionalidad de Clientes conocida pendiente.

El objetivo del siguiente bloque es **auditar y cerrar**, no inventar nuevas funciones.

## 18.1 Antes de proponer cambios

Revisar `main` actual.

Comprobar que no quedan:

- placeholders de factura;
- eventos sin conectar;
- métodos/API añadidos pero sin consumidores;
- capacidades incoherentes;
- comentarios/documentación que todavía indiquen pendiente;
- tests obsoletos por el cambio `factura → imprimir-factura`;
- referencias a PDF A4 horizontal;
- referencias a `nombreComercial` como nombre del email;
- botones de anulación con tokens Material antiguos;
- ramas de código que intenten crear borrador + emitir para el flujo automático de venta.

## 18.2 Regresión automática completa

Ejecutar:

```bash
npm run test:electron
npm run build:electron
npm test
npm run build
npm run lint
```

Solo añadir/cambiar tests si la auditoría detecta un hueco real.

## 18.3 Regresión funcional recomendada

### Cliente

```text
buscar/abrir cliente
editar/cancelar
editar/guardar
facturación alternativa
dirty al cambiar/cerrar
baja con y sin bloqueo
```

### Ventas del cliente

```text
listado
detalle
ticket PDF
reimpresión
email
```

### Estadísticas

```text
general
años/meses
consumo mensual
```

### Factura manual

```text
Nueva factura
→ seleccionar ventas
→ guardar borrador
→ modificar
→ cerrar con dirty
→ preview
→ desplegar/contraer una/todas
→ facturar
→ PAGADO
→ cerrar preview
→ listado Emitida
```

### Impresión/email

```text
Emitida
→ imprimir
→ diálogo A4 vertical

Emitida
→ email
→ destinatario persistido
→ modificar solo para envío
→ adjunto PDF correcto
```

### Anulación

```text
Emitida
→ Anular
→ cancelar
→ sigue Emitida

Emitida
→ Anular
→ confirmar
→ Anulada
→ mismo numero_AÑO
→ ventas históricas visibles
→ venta liberada para nueva factura
```

### Integración Venta → Factura

```text
venta con cliente
→ Imprimir factura
→ ticket
→ factura automática de una venta
→ emisión
→ diálogo A4
→ factura visible en ficha del cliente
```

Y:

```text
venta sin cliente
→ Imprimir factura deshabilitado
```

También devolución/mixta:

```text
Imprimir factura deshabilitado
```

## 18.4 Cierre esperado

Si la regresión queda limpia:

```text
14K.6B ✅
14K ✅
HITO 14 — CLIENTES ✅ CERRADO
```

Después se actualizará otra vez este documento de continuidad y el siguiente gran hito será:

```text
15 — Almacén
```

salvo que el usuario quiera tratar antes una regresión o tarea pendiente explícita.

---

# 19. Prompt de relevo

Si este chat alcanza el límite, continuar con este contexto:

```text
Estamos desarrollando Osumi TPV Client.
La base de continuidad es el documento v2.41 + el main actual del repositorio.

Reglas:
- revisar main antes de proponer patches;
- usuario aplica cambios y ejecuta tests;
- no hacer commits/PR;
- Angular 22 standalone, signals, strict TS, no any;
- métodos nuevos con JSDoc;
- no avanzar sin confirmación;
- empezar cada bloque con resumen de estado;
- DATABASE_SCHEMA_VERSION sigue en 1 y no hay migraciones pre-release.

Estado:
- Hito 13 Artículos cerrado.
- Hito 14 Clientes casi cerrado.
- 14A–14J cerrados.
- 14K.1 emisión cerrado.
- 14K.2 documento/preview cerrado.
- 14K.3 PDF inmutable cerrado.
- 14K.4 impresión/email cerrado.
- 14K.5 anulación cerrado.
- 14K.6A Imprimir factura tras finalizar venta cerrado y validado.
- siguiente punto exacto: 14K.6B Regresión integral + cierre Hito 14.

Facturas:
- borrador/emitida/anulada;
- relación factura_venta activa/histórica;
- número global asignado solo al emitir;
- preview BrowserWindow interactiva, ventas contraídas y líneas desplegables;
- PDF A4 vertical inmutable, solo filas resumen, PAGADO;
- impresión con diálogo del sistema;
- email con mismo PDF;
- cabecera PDF nombreComercial;
- fromName/asunto/cuerpo email nombre;
- anular conserva número/snapshot/PDF y libera ventas.

Integración Ventas:
- opción Imprimir factura;
- solo venta ordinaria positiva con cliente, no devolución/mixta;
- imprime ticket;
- crea y emite atómicamente factura con solo esa venta;
- materializa PDF;
- abre diálogo A4;
- fallos post-COMMIT son warnings y no revierten venta/factura.

Ahora revisar main y ejecutar/auditar 14K.6B. No inventar funcionalidad nueva; cerrar huecos reales de regresión y, si todo queda limpio, declarar Hito 14 Clientes cerrado.
```

---

# 20. Historial de continuidad

```text
v2.36
→ base previa antes del cierre de emisión/documentos

v2.37
→ 14J cerrado
→ 14K.1 emisión cerrada
→ 14K.2 preview interactiva cerrada
→ siguiente 14K.3

v2.38
→ 14K.3 PDF definitivo inmutable cerrado
→ siguiente 14K.4

v2.39
→ impresión/email desarrollados
→ PDF A4 vertical
→ criterio definitivo nombre/nombreComercial
→ siguiente integración/cierre 14K.4

v2.40
→ 14K.4 completamente cerrado
→ requisito Imprimir factura incorporado al roadmap 14K.6
→ siguiente 14K.5 anulación

v2.41
→ 14K.5 anulación completamente cerrada
→ 14K.6A Imprimir factura al finalizar venta completamente cerrado
→ creación Venta → Factura atómica sin borrador intermedio
→ flujo post-COMMIT ticket → factura → diálogo A4 validado
→ queda únicamente 14K.6B regresión integral + cierre Hito 14
```
