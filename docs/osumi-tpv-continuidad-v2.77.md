Osumi TPV Client — Documento de continuidad v2.77

Fecha: 21 de septiembre de 2026  
Proyecto: Osumi TPV Client  
Repositorio principal: https://github.com/osumionline/Osumi-TPV-Client

Este documento sustituye a docs/osumi-tpv-continuidad-v2.76.md.

Su objetivo es permitir retomar el desarrollo sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

1\. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

    ●	Cada respuesta de desarrollo contiene una sola unidad pequeña y autocontenida.

    ●	Antes de cada bloque:

    1\.	resumir lo terminado;

    2\.	indicar el punto actual;

    3\.	indicar lo pendiente;

    4\.	explicar qué hace exactamente la unidad actual.

    ●	Antes de proponer código dependiente del repositorio, revisar siempre main.

    ●	No inventar rutas, clases, helpers, APIs ni contratos.

    ●	Archivo nuevo: contenido completo.

    ●	Archivo existente: bloque exacto, localización y contexto suficiente.

    ●	Los tests de una unidad se implementan en esa misma unidad.

    ●	El usuario ejecuta siempre la batería completa:

npm test

npm run build

npm run test:electron

npm run build:electron

npm run lint

    ●	No continuar si hay tests/builds fallando.

    ●	Tras verde \+ push, volver a revisar main antes del siguiente bloque.

    ●	No abrir ni diseñar un apartado funcional nuevo hasta que el usuario explique objetivo y comportamiento heredado.

    ●	Todo método público nuevo debe llevar JSDoc.

    ●	No crear migraciones antes de la primera versión estable salvo necesidad expresa.

    ●	DATABASE\_SCHEMA\_VERSION \= 1\.

Angular

    ●	Angular 22.1.7.

    ●	standalone.

    ●	zoneless.

    ●	signals.

    ●	input() / output().

    ●	inject().

    ●	computed() / effect() cuando proceda.

    ●	@if / @for.

    ●	Signal Forms.

    ●	viewChild() signal.

    ●	evitar APIs legacy salvo necesidad real.

    ●	servicios propios con @Service().

Tests

    ●	Electron: imports explícitos de Vitest.

    ●	Renderer/frontend: globals según configuración actual.

    ●	Aislar hijos pesados en specs del padre cuando el hijo ya tiene tests propios.

    ●	Caso consolidado: PaymentTypeStatisticsComponent se sustituye por stub en el spec de ManagementPaymentTypesComponent para no inicializar ECharts/ResizeObserver en JSDOM.

2\. Repositorios y acceso

Osumi TPV

    ●	Cliente nuevo: https://github.com/osumionline/Osumi-TPV-Client

    ●	TPV antiguo UI: https://github.com/osumionline/Osumi-TPV

    ●	TPV API antigua: https://github.com/osumionline/TPV-API

    ●	SDK TicketBAI: https://github.com/osumionline/ticketbaiws

Indomable Store

Repositorios disponibles para estudiar la sincronización futura:

    ●	Panel Angular: https://github.com/igorosabel/indomable-admin

    ●	Backend Osumi Framework: https://github.com/igorosabel/indomable-api

    ●	Frontend tienda: https://github.com/igorosabel/indomable-frontend

Regla expresa del usuario: todos los repositorios GitHub tratados en el proyecto, incluidos osumionline/\* e igorosabel/\*, deben manejarse en modo estrictamente de solo lectura desde ChatGPT. No crear commits, ramas, PRs, issues, comentarios ni modificar archivos.

La GitHub App ChatGPT Codex Connector está instalada también en la cuenta igorosabel; el acceso de lectura funciona correctamente.

3\. Estado general

Cerrado

    ●	16 Compras ✅

    ●	17 Gestión:

    ●	17.1 Shell/rutas ✅

    ●	17.2 Auth backend empleados ✅

    ●	17.3 Sesión/permisos ✅

    ●	17.4 Ajustes ✅

    ●	17.5 Empleados ✅ CERRADO

    ●	17.6 Tipos de pago ✅ CERRADO

    ●	17.6.1 infraestructura/lectura/memoria/startup ✅

    ●	17.6.2 estructura visual ✅

    ●	17.6.3 Datos \+ logo ✅

    ●	17.6.4 CRUD ✅

    ●	17.6.5 orden persistente ✅

    ●	17.6.6 estadísticas ✅

    ●	17.6.7 regresión final ✅

    ●	Corrección de foco del modal de login de Gestión ✅

    ●	Corrección Ventas/Empleados ✅ CERRADA

    ●	Retirada total del antiguo flag empleados ✅ CERRADA

    ●	18 Caja:

    ●	18.1 Shell de Caja ✅

    ●	18.2 Histórico de ventas embebido ✅

    ●	18.3 Lectura de Salidas de caja ✅

    ●	18.4 CRUD de Salidas de caja ✅

    ●	18.4a backend/API/persistencia ✅

    ●	18.4b interfaz completa ✅

En curso / siguiente

    ●	18 Caja 🔨

    ●	siguiente unidad: 18.5 — Datos calculados del cierre

    ●	18.6 UI de cierre \+ recuento ⏳

    ●	18.7 desglose por tipos de pago ⏳

    ●	18.8 cierre transaccional ⏳

    ●	18.9 regresión final ⏳

    ●	Informes continúa como placeholder hasta que el usuario defina su comportamiento.

Pendiente posterior

    ●	19 Enforcement global de permisos ⏳

    ●	resto de desarrollo funcional de la aplicación ⏳

    ●	Sincronización Indomable Store ↔ Osumi TPV 📋 PLANIFICADA, PERO POSPUESTA HASTA TERMINAR LA APLICACIÓN

    ●	TicketBAI 12C.9 ⏸ hasta respuesta/actualización de Berein.

4\. Punto exacto de continuidad

Último commit confirmado en main al generar esta versión:

d5888ac594ec608f9ec0214efaf109b7d717c7d4

Terminado Caja 18.4b

Commits inmediatamente anteriores del bloque Caja:

3ddf0f05883df9f866762b7804fca969b6fb9c0f

Terminado Caja 18.4a

9b588024cafb218fb0ac6805a9db04760dc46d79

Terminado Caja 18.3

be3c07d2526121e7ddc71d82671d8299e1068d13

Terminado Caja 18.2

495efcee83e37c3ac64495f6cac1cad963ddb07e

Terminado Caja 18.1

El usuario confirmó para 18.1–18.4:

    ●	batería completa de tests/build/lint correcta;

    ●	pruebas funcionales correctas;

    ●	aspecto visual de Salidas de caja aprobado;

    ●	cambios subidos a main.

Siguiente paso exacto

El próximo bloque de código es:

18.5 — Datos calculados del cierre

Objetivo único:

    ●	añadir la lectura canónica del cierre de la caja activa;

    ●	calcular en backend saldo inicial, ventas que afectan caja, salidas, saldo teórico y desglose por tipos de pago;

    ●	usar relación directa por id\_caja;

    ●	no implementar todavía el formulario/recuento visual del cierre;

    ●	no cerrar todavía la caja.

5\. Corrección Ventas / Empleados ✅

La antigua configuración empleados ha desaparecido por completo.

Regla definitiva

0 empleados → error / no se puede iniciar venta

1 empleado → asignación automática

2 o más → selector de empleado

Se aplica a:

    ●	nueva venta;

    ●	venta procedente de reservas.

EmployeeSelectorComponent se reutiliza para el caso de más de un empleado.

Limpieza realizada

El flag se eliminó de:

    ●	AppData;

    ●	instalación;

    ●	Gestión \> Ajustes;

    ●	contratos;

    ●	mappers;

    ●	validadores;

    ●	formularios;

    ●	Ventas;

    ●	tests;

    ●	importador .otpv;

    ●	exportador .otpv;

    ●	compatibilidad temporal de JsonAppDataRepository.

No debe quedar rastro funcional del antiguo campo.

No crear compatibilidad legacy futura para este flag: no existe una versión en producción que la requiera.

6\. Gestión y permisos

GestionSessionService mantiene sesión temporal de Gestión.

    ●	empleadoId

    ●	authenticatedAt

    ●	expiresAt

    ●	duración fija: 10 minutos desde login.

No se renueva por actividad.

Permisos relevantes:

    ●	18 Ajustes

    ●	19 Tipos de pago

    ●	20 Crear empleados

    ●	21 Modificar datos

    ●	22 Borrar empleados

    ●	23 Modificar permisos

    ●	24 Estadísticas empleados

    ●	25 Copias de seguridad

Administradores tienen bypass mediante hasPerm() / hasAnyPerm().

El enforcement global fino sigue reservado para el hito 19\.

7\. Tipos de pago — estado definitivo

17.6 está cerrado.

Incluye:

    ●	maestro global;

    ●	Efectivo estructural;

    ●	búsqueda;

    ●	alta/edición/baja lógica;

    ●	slug interno;

    ●	logo/staging/WebP;

    ●	drag & drop;

    ●	persistencia transaccional del orden;

    ●	rollback optimista;

    ●	estadísticas;

    ●	filtros temporales;

    ●	ECharts;

    ●	protección ante respuestas obsoletas;

    ●	tests y pruebas funcionales.

Efectivo estructural

    ●	nombre Efectivo

    ●	slug efectivo

    ●	afectaCaja \= true

    ●	orden \= 0

    ●	fisico \= true

    ●	sin logo

Está en el maestro global pero oculto en Gestión; no se edita, elimina ni reordena.

Semántica de afectaCaja

Esta semántica se mantiene para 18 Caja.

No significa “es el tipo Efectivo”.

Significa:

\> Los pagos realizados con ese tipo incrementan el efectivo teórico de la caja.

Por tanto cualquier tipo de pago con:

afectaCaja \= true

se suma al bloque de “Ventas efectivo” del cierre.

8\. TicketBAI / SDK

SDK:

@osumi/ticketbaiws

Estado:

    ●	versión 1.0.1;

    ●	ESM only;

    ●	tests OK;

    ●	README general;

    ●	documentación exhaustiva en docs/.

12C.9 sigue pausado hasta respuesta/actualización de Berein.

9\. Sincronización Indomable Store — prioridad actual

La arquitectura de sincronización se ha estudiado y documentado, pero la prioridad ha cambiado explícitamente.

Decisión del usuario:

\> No se implementará sincronización/conectividad con la tienda online hasta terminar el desarrollo funcional de la aplicación.

Por tanto:

18 Caja

↓

19 permisos

↓

resto de desarrollo funcional

↓

aplicación funcionalmente terminada

↓

sincronización Indomable Store ↔ Osumi TPV

No iniciar ningún bloque S1–S10 mientras la aplicación principal siga en desarrollo.

La planificación existente se conserva para retomarla después.

10\. Sincronización futura — arquitectura acordada

Planificada, no iniciada.

La conexión la iniciará siempre Osumi TPV Client:

Osumi TPV Client / Electron

        │

        │ HTTPS

        ▼

indomablestore.com / indomable-api

No habrá servidor local expuesto en el TPV.

Se eliminan como requisito:

    ●	entrada desde Internet al PC;

    ●	NAT/port forwarding;

    ●	IP dinámica;

    ●	hosts;

    ●	Apache local para recibir ventas.

Ciclo conceptual

arranca TPV

    ↓

si venta online está activa

    ↓

consulta ventas pagadas pendientes

    ↓

procesa cada pedido

    ↓

confirma resultados

    ↓

sincroniza stock/precios

    ↓

espera X minutos

    ↓

repite

Si el TPV está apagado o sin Internet:

    ●	los pedidos permanecen pendientes;

    ●	se recuperan en el siguiente ciclo.

11\. Sincronización futura — decisiones cerradas

Pedido

    ●	fecha económica: Order.payed\_at;

    ●	id\_cliente \= NULL;

    ●	solo ventas pagadas en primera versión;

    ●	cancelaciones/devoluciones/reembolsos fuera de alcance inicial.

Artículos

Clave compartida:

localizador

Snapshot a ampliar en indomable-api:

localizador

nombre

marca

iva

Importes históricos ya disponibles:

    ●	amount\_before

    ●	discount

    ●	amount\_after

PUC

    ●	no lo envía la web;

    ●	se toma del artículo local del TPV al importar.

Tipo de pago

Usar identificador estable:

tipoPagoPublicId

No usar ids SQLite entre sistemas.

Empleado

Empleado estructural futuro:

Tienda online

Debe quedar oculto para uso humano.

Caja

Venta online futura:

id\_caja \= NULL

Venta presencial:

id\_caja \!= NULL

Idempotencia

Diseño conceptual:

origen \= tpv | online

referencia\_externa \= id pedido online

Un reintento del mismo pedido no puede crear una segunda venta.

Seguridad

    ●	HTTPS;

    ●	secreto compartido;

    ●	safeStorage;

    ●	formato compatible con osumionline/plugin-token;

    ●	HMAC SHA-256;

    ●	iat;

    ●	exp;

    ●	propósito/request id cuando se cierre contrato.

Stock

No copiar el snapshot absoluto antiguo sin resolver la carrera de concurrencia.

12\. Sincronización futura — plan S1–S10

Aparcado hasta finalizar la aplicación.

S1 — Modelo TPV

    ●	origen;

    ●	referencia externa;

    ●	idempotencia;

    ●	id\_caja nullable online;

    ●	empleado “Tienda online”.

S2 — Snapshot indomable-api

    ●	localizador;

    ●	nombre;

    ●	marca;

    ●	IVA;

    ●	normalizar sync.

S3 — API versionada

    ●	pull;

    ●	ACK;

    ●	lotes;

    ●	errores;

    ●	autenticación.

S4 — Cliente HTTP Electron

    ●	configuración;

    ●	token;

    ●	timeouts;

    ●	errores.

S5 — Importador de ventas

    ●	idempotencia;

    ●	resolver artículos;

    ●	resolver tipo pago;

    ●	PUC local;

    ●	snapshots;

    ●	validación;

    ●	persistencia;

    ●	TicketBAI/documentos.

S6 — Scheduler

    ●	startup;

    ●	intervalo;

    ●	exclusión mutua;

    ●	recuperación/reintento.

S7 — ACK

    ●	resultado por pedido;

    ●	sync \= 2 éxito;

    ●	sync \= 1 error/reintento.

S8 — Stock/precios

    ●	resolver concurrencia;

    ●	contrato tipado.

S9 — Observabilidad

    ●	último intento;

    ●	último éxito;

    ●	último error.

S10 — Retirada legacy

    ●	llamadas web → TPV;

    ●	sync\_url;

    ●	DoSync;

    ●	ForceSync;

    ●	infraestructura de exposición del PC.

13\. 18 Caja — alcance funcional acordado

El apartado Caja se compone de cuatro pestañas:

1\. Histórico de ventas

2\. Salidas caja

3\. Cerrar caja

4\. Informes

La ruta /caja y el shell ya están implementados.

La cabecera principal habilita Caja mediante:

route: '/caja'

CashRegisterComponent mantiene la pestaña activa localmente y sirve como composición de los subapartados.

Estado:

Histórico de ventas ✅ implementado

Salidas caja ✅ implementado

Cerrar caja ⏳ siguiente fase

Informes 📋 placeholder

Informes

No diseñar todavía.

Debe seguir como placeholder hasta que el usuario defina el nuevo comportamiento deseado.

No inferir informes a partir del TPV antiguo.

14\. 18 Caja — Histórico de ventas

El TPV antiguo reutilizaba el mismo componente de histórico tanto:

    ●	dentro de Caja;

    ●	como en el modal abierto desde Ventas.

El cliente nuevo mantiene esa misma idea.

Componente:

HistoricalSalesComponent

Implementación terminada

Se añadió el input:

embedded: boolean

con valor por defecto:

false

Modal desde Ventas

Se conserva:

    ●	backdrop;

    ●	panel overlay;

    ●	cabecera;

    ●	botón cerrar;

    ●	pestañas internas del modal;

    ●	comportamiento postventa existente;

    ●	foco inicial del botón de cierre;

    ●	Escape/cierre;

    ●	detalle;

    ●	TicketBAI;

    ●	impresión;

    ●	ticket regalo;

    ●	email;

    ●	cambio de cliente;

    ●	cambio de tipo de pago.

No se duplicó ninguna consulta ni acción.

Embebido en Caja

Con:

\<otpv-historical-sales \[embedded\]="true" /\>

se elimina visualmente:

    ●	backdrop;

    ●	posicionamiento modal;

    ●	cabecera modal;

    ●	botón cerrar;

    ●	pestañas internas.

Se muestra directamente el panel de Histórico de ventas.

La antigua pestaña interna placeholder Salidas caja no aparece en modo embebido porque Caja ya tiene su propia pestaña real.

Detalles técnicos consolidados

    ●	En modo embebido close() no emite.

    ●	El foco inicial del botón cerrar solo se aplica en modo modal.

    ●	El wrapper no conserva la clase global .overlay al estar embebido, porque esa clase es position: fixed.

    ●	El layout responsive del modal no se aplica al modo embebido.

    ●	El histórico mantiene sus filtros Fecha/Rango y su comportamiento previo.

    ●	Existen tests que protegen ambos modos.

Estado:

18.2 ✅ CERRADO

15\. 18 Caja — Salidas de caja

Objetivo:

Registrar retiradas manuales de efectivo realizadas durante una caja abierta.

Ejemplos:

    ●	comprar folios;

    ●	pagar algo en mano;

    ●	pagar a un repartidor;

    ●	cualquier gasto que requiera sacar efectivo físicamente.

Componente renderer actual:

CashOutflowsComponent

Servicio renderer:

CajaSalidasService

Filtros

La cabecera quedó alineada visual y funcionalmente con HistoricalSalesComponent.

Dos modos:

Fecha

    ●	botones Fecha / Rango como selector de modo;

    ●	\<input type="date"\> nativo;

    ●	calendario nativo del sistema;

    ●	botones anterior/siguiente;

    ●	carga automática al cambiar de día.

Rango

    ●	fecha desde;

    ●	fecha hasta;

    ●	botón Buscar.

Validación:

desde \<= hasta

La consulta usa fechas civiles YYYY-MM-DD.

Layout

Dos columnas.

Izquierda

Listado de salidas:

    ●	concepto;

    ●	fecha/hora;

    ●	importe;

    ●	icono de candado cuando la salida pertenece a una caja cerrada.

Debajo:

Nueva salida de caja

Si no existe caja abierta:

    ●	el histórico sigue siendo consultable;

    ●	no se permite crear una salida nueva.

Derecha

Formulario Signal Forms:

    ●	concepto obligatorio;

    ●	descripción opcional;

    ●	importe obligatorio.

Acciones:

    ●	Eliminar;

    ●	Cancelar;

    ●	Guardar.

Las salidas de cajas cerradas se muestran en modo solo lectura.

Flujo de alta

Al crear:

    1\.	se usa la caja abierta actual;

    2\.	backend asigna fecha/hora actual;

    3\.	se persiste;

    4\.	el filtro vuelve al día actual, conservando el modo Fecha/Rango;

    5\.	se refresca el listado;

    6\.	la salida recién creada queda seleccionada;

    7\.	el formulario queda preparado para corregirla o eliminarla;

    8\.	aparece durante 4 segundos:

Salida de caja guardada correctamente

No aparece diálogo modal de éxito al guardar.

Flujo de edición

Al editar:

    ●	se conserva el publicId;

    ●	se conserva la fecha original;

    ●	se actualiza el listado en memoria;

    ●	la salida sigue seleccionada;

    ●	el formulario se resetea al snapshot persistido;

    ●	aparece el mismo feedback inferior durante 4 segundos.

No aparece diálogo modal de éxito.

Flujo de borrado

Al borrar:

    1\.	se pide confirmación;

    2\.	backend realiza baja lógica;

    3\.	se muestra diálogo de éxito;

    4\.	se refresca el filtro actualmente visible;

    5\.	no se selecciona automáticamente ninguna otra salida.

La confirmación y el diálogo de éxito de eliminación sí deben mantenerse.

Cancelar

    ●	en alta, restaura el formulario vacío;

    ●	en edición, restaura los datos persistidos de la salida seleccionada.

Feedback

El patrón de guardado replica el usado en Artículos:

    ●	señal temporal;

    ●	texto verde en el footer;

    ●	duración 4 segundos;

    ●	desaparece al iniciar otra operación.

Estado:

18.4b ✅ CERRADO

16\. Salidas de caja — modelo nuevo

El esquema actual utiliza:

movimiento\_caja

Campos relevantes:

    ●	public\_id

    ●	id\_caja

    ●	id\_empleado

    ●	tipo

    ●	concepto

    ●	importe\_cents

    ●	descripcion

    ●	created\_at

    ●	updated\_at

    ●	deleted\_at

Para este subapartado:

tipo \= 'salida'

No existe ni debe crearse una tabla paralela equivalente a pago\_caja.

Contratos implementados

Lectura:

SalidaCajaConsulta

SalidaCajaInterface

Escritura:

CrearSalidaCajaCommand

ActualizarSalidaCajaCommand

EliminarSalidaCajaCommand

CajaApi expone:

getSalidas()

createSalida()

updateSalida()

deleteSalida()

Persistencia

TypeOrmCajaRepository implementa:

findSalidasByPeriod()

createSalida()

updateSalida()

deleteSalida()

Reglas:

    ●	alta/edición/borrado se ejecutan transaccionalmente;

    ●	alta genera public\_id UUID;

    ●	alta usa new Date().toISOString() como created\_at;

    ●	edición conserva created\_at;

    ●	borrado usa deleted\_at;

    ●	solo se recuperan movimientos activos;

    ●	solo se recuperan tipo \= 'salida';

    ●	orden: fecha descendente \+ id descendente.

Después de cualquier alta/edición/baja se reconstruye:

caja.movimientos\_salida\_cents

mediante la suma real de movimientos activos de esa caja.

No se mantiene mediante deltas acumulativos.

Esto conserva la base coherente antes del cierre, aunque 18.5/18.8 volverán a calcular los valores canónicos al cerrar.

Validación de aplicación

Backend normaliza:

    ●	cajaPublicId;

    ●	publicId;

    ●	concepto.trim();

    ●	descripción vacía → null.

Reglas:

concepto: 1..250 caracteres tras trim

importeCents: entero seguro \> 0

El renderer usa:

eurosToCents()

centsToEuros()

No se implementó una selección de empleado para Salidas:

movimiento\_caja.id\_empleado \= NULL

El esquema lo permite y el usuario no ha definido un flujo de empleado para esta operación.

No inventar uno.

Compatibilidad legacy

El importador ya transforma:

pago\_caja

→ movimiento\_caja tipo 'salida'

Por tanto el histórico importado está alineado con el modelo nuevo.

17\. Salidas de caja — editabilidad

El TPV antiguo impedía modificar salidas pertenecientes a cajas ya cerradas.

El cliente nuevo conserva y refuerza esa regla.

Regla definitiva

Caja abierta

Salida perteneciente a la caja activa:

    ●	editable;

    ●	eliminable;

    ●	guardable.

Caja cerrada

Salida perteneciente a una caja ya cerrada:

    ●	visible;

    ●	consultable;

    ●	solo lectura;

    ●	no editable;

    ●	no eliminable.

Motivo:

Modificarla alteraría retrospectivamente los importes de un cierre ya consolidado.

Lectura canónica

La query de lectura obtiene:

editable \=

caja.cierre IS NULL

No se infiere editabilidad mediante fechas.

La relación se obtiene directamente de:

movimiento\_caja.id\_caja

Protección de escritura

Renderer recibe editable, pero no es la barrera de seguridad.

Alta, edición y borrado envían:

cajaPublicId

Backend exige:

    1\.	que esa caja exista y continúe abierta;

    2\.	en edición/borrado, que el movimiento:

    ●	exista;

    ●	sea tipo \= 'salida';

    ●	no esté borrado;

    ●	pertenezca exactamente a esa caja.

Por tanto un estado obsoleto del renderer no permite alterar una caja cerrada ni una salida de otra caja.

Renderer

    ●	sin caja abierta se puede consultar, pero no crear;

    ●	salida cerrada muestra candado;

    ●	formulario cerrado usa estado readonly de Signal Forms;

    ●	Guardar/Eliminar quedan deshabilitados;

    ●	backend sigue validando aunque la UI se manipule.

Estado:

18.3 lectura ✅

18.4 protección CRUD ✅

18\. 18 Caja — Cerrar caja

El cierre muestra la información económica de la caja activa.

No debe existir ya la antigua separación:

Tienda | Web | Totales

El nuevo sistema integra todos los tipos de pago.

Por tanto habrá un único cierre.

19\. Cerrar caja — bloque superior

Mostrar:

    ●	Saldo inicial

    ●	Ventas efectivo

    ●	Salidas caja

    ●	Saldo final

    ●	Importe real

    ●	Retirado

    ●	Diferencia

    ●	Entrada

    ●	Saldo siguiente caja

Saldo inicial

Es:

caja.importe\_apertura\_cents

Ventas efectivo

No significa solo el tipo de pago Efectivo.

Es la suma de pagos de la caja cuyos tipos tengan:

afectaCaja \= true

La semántica está confirmada por el TPV antiguo.

Salidas caja

Suma de movimientos activos:

tipo \= 'salida'

pertenecientes a la caja.

Saldo final teórico

Fórmula:

saldoFinal \=

saldoInicial

\+ ventasQueAfectanCaja

\- salidasCaja

20\. Importe real y recuento físico

Importe real representa el efectivo físico que queda en caja en el momento del cierre.

Al pulsarlo se muestra el desglose de monedas y billetes.

Denominaciones:

1c

2c

5c

10c

20c

50c

1 €

2 €

5 €

10 €

20 €

50 €

100 €

200 €

500 €

El esquema actual ya contiene:

caja\_recuento

con:

momento \= 'apertura' | 'cierre'

valor\_centimos

cantidad

Para este flujo usar:

momento \= 'cierre'

El total del recuento calcula importe real.

21\. Retirado, Diferencia, Entrada y saldo siguiente

Retirado

Dinero retirado físicamente al cerrar.

Ejemplo:

    ●	retirar exceso de efectivo para ingresarlo en banco.

Persistencia prevista:

caja.importe\_retirado\_cents

Entrada

Dinero añadido a la caja al cerrar.

Ejemplo:

    ●	traer cambio del banco.

El esquema actual representa el acumulado mediante:

movimientos\_entrada\_cents

El importador legacy ya traslada importe\_entrada a ese campo.

Diferencia

Semántica heredada:

diferencia \=

importeReal

\+ retirado

\- saldoFinalTeorico

Puede ser positiva o negativa.

Saldo siguiente caja

Fórmula:

saldoSiguiente \=

importeReal

\+ entrada

El TypeOrmCajaRepository actual ya abre la siguiente caja usando:

importe\_cierre\_real\_cents

\+ movimientos\_entrada\_cents

Esto coincide con la semántica acordada.

22\. Cerrar caja — tipos de pago inferiores

Debajo del bloque de efectivo se muestran los tipos de pago definidos, excepto el Efectivo estructural.

No habrá pestañas Tienda/Web/Totales.

Cada tarjeta empieza cerrada y muestra:

    ●	nombre del tipo de pago;

    ●	ventas/importes.

Al abrir:

    ●	Ventas;

    ●	Operaciones;

    ●	Importe real;

    ●	Diferencia.

Importe real

Valor inicial:

importeReal \= importeVentas

El usuario puede corregirlo manualmente.

Diferencia

diferencia \=

importeReal

\- importeVentas

Operaciones

Como ahora una venta puede tener pagos divididos:

COUNT(DISTINCT venta)

para ese tipo de pago.

No contar simplemente filas de venta\_pago.

23\. Tipos de pago y caja

El esquema actual ya contiene:

caja\_tipo

Campos:

    ●	id\_caja

    ●	id\_tipo\_pago

    ●	operaciones

    ●	importe\_total\_cents

    ●	importe\_real\_cents

    ●	importe\_descuento\_cents

Al abrir una nueva caja, TypeOrmCajaRepository ya inicializa filas para los tipos de pago activos.

Esto se reutilizará.

No crear una estructura paralela.

24\. Cierre — origen de cálculos

Mejora importante respecto al sistema antiguo:

\> Los totales del cierre deben recalcularse en backend dentro de la operación de cierre.

No confiar en valores económicos enviados por el renderer.

El comando de cierre debería contener solo datos realmente introducidos por el usuario:

    ●	recuento físico;

    ●	retirado;

    ●	entrada;

    ●	importe real de tipos de pago;

    ●	empleado de cierre cuando corresponda;

    ●	observaciones si se incorporan.

Backend recalcula:

    ●	ventas;

    ●	beneficios;

    ●	descuentos;

    ●	pagos que afectan caja;

    ●	salidas;

    ●	operaciones;

    ●	importes por tipo;

    ●	saldo teórico;

    ●	diferencias.

Motivo:

Evitar cerrar con cifras obsoletas si ocurre una operación entre cargar la pantalla y confirmar.

25\. Cierre — relación directa con id\_caja

El TPV antiguo buscaba ventas por intervalo:

apertura \<= venta.created\_at \<= cierre

El cliente nuevo debe aprovechar:

venta.id\_caja

Por tanto los cálculos del cierre se basarán directamente en la caja concreta.

Ventajas:

    ●	asociación inequívoca;

    ●	menos errores por límites de fecha;

    ●	mejor soporte para devoluciones;

    ●	mejor soporte multi-terminal futuro;

    ●	queries más claras.

26\. Estado actual del esquema de Caja

El cliente nuevo ya tiene estas tablas:

caja

caja\_tipo

caja\_recuento

movimiento\_caja

caja

Ya incluye:

    ●	public\_id

    ●	id\_terminal

    ●	empleados apertura/cierre

    ●	apertura

    ●	cierre

    ●	ventas

    ●	beneficios

    ●	descuentos

    ●	movimientos entrada/salida

    ●	importe apertura

    ●	cierre teórico

    ●	cierre real

    ●	retirado

    ●	observaciones

caja\_tipo

Ya preparado para desglose de tipos de pago.

caja\_recuento

Ya preparado para monedas/billetes.

movimiento\_caja

Ya preparado para entradas/salidas manuales.

Por tanto 18 debe explotar el esquema existente antes de plantear cambios.

27\. Estado actual del backend de Caja

Ya existe y está ampliado:

CajaService

TypeOrmCajaRepository

CajaApi

Apertura

TypeOrmCajaRepository.open():

    ●	busca caja abierta del terminal;

    ●	si existe la reutiliza;

    ●	si no existe crea una nueva;

    ●	calcula saldo inicial desde la caja cerrada anterior;

    ●	crea filas iniciales de caja\_tipo.

Salidas — lectura

Actualmente están implementados:

CajaService.findSalidas()

TypeOrmCajaRepository.findSalidasByPeriod()

CajaApi.getSalidas()

Además:

    ●	canal IPC específico;

    ●	handler con assertTrustedSender;

    ●	preload;

    ●	CajaSalidasService en renderer.

La aplicación convierte una fecha civil local a intervalo UTC:

\[desde, hastaExclusive)

y valida fechas reales y rangos no invertidos.

Salidas — CRUD

Implementados:

CajaService.createSalida()

CajaService.updateSalida()

CajaService.deleteSalida()

TypeOrmCajaRepository.createSalida()

TypeOrmCajaRepository.updateSalida()

TypeOrmCajaRepository.deleteSalida()

También existen:

    ●	canales IPC create/update/delete;

    ●	preload;

    ●	métodos correspondientes en CajaApi;

    ●	métodos correspondientes en CajaSalidasService.

Persistencia transaccional:

movimiento\_caja

\+

reconciliación caja.movimientos\_salida\_cents

Protecciones:

    ●	caja obligatoriamente abierta;

    ●	movimiento activo;

    ●	tipo salida;

    ●	pertenencia exacta a la caja indicada.

Renderer

La pestaña Salidas está implementada mediante:

CashOutflowsComponent

Usa:

    ●	Signal Forms;

    ●	VentasContextService para conocer cajaAbierta;

    ●	CajaSalidasService para lectura/CRUD;

    ●	utilidades monetarias existentes.

Estado actual del backend de Caja:

apertura ✅

lectura salidas ✅

CRUD salidas ✅

cálculos de cierre ⏳ siguiente

cierre transaccional ⏳

28\. Apertura y venta

Regla funcional:

\> Una vez cerrada la caja no se puede hacer una venta hasta volver a abrir una nueva.

El comportamiento de venta debe seguir dependiendo de la existencia de una caja abierta.

El cierre debe dejar:

caja.cierre \!= NULL

La siguiente venta debe forzar/solicitar nueva apertura según el flujo ya existente.

29\. Importación legacy de Caja

El importador nuevo ya conserva:

    ●	cajas antiguas;

    ●	cierres;

    ●	caja\_tipo;

    ●	recuentos;

    ●	salidas;

    ●	importe retirado;

    ●	importe de entrada;

    ●	saldo inicial;

    ●	cierre teórico;

    ●	cierre real.

Transformaciones importantes:

pago\_caja

→ movimiento\_caja tipo 'salida'

El efectivo implícito del sistema antiguo se materializa como tipo estructural Efectivo.

No reabrir la migración legacy salvo que 18 revele un caso real no cubierto.

30\. 18 Caja — plan de implementación

18.1 — Shell de Caja ✅

Implementado:

    ●	ruta /caja;

    ●	opción Caja habilitada en cabecera;

    ●	CashRegisterComponent;

    ●	cuatro pestañas:

    ●	Histórico de ventas;

    ●	Salidas caja;

    ●	Cerrar caja;

    ●	Informes;

    ●	Informes como placeholder;

    ●	tests del shell.

Commit:

495efcee83e37c3ac64495f6cac1cad963ddb07e

Terminado Caja 18.1

18.2 — Histórico embebido ✅

Implementado:

    ●	HistoricalSalesComponent funciona como modal y embebido;

    ●	input embedded;

    ●	modo Ventas preservado;

    ●	Caja reutiliza el mismo histórico;

    ●	no se duplicó lógica;

    ●	no aparecen overlay/cabecera/pestañas internas en Caja;

    ●	tests de ambos modos.

Commit:

be3c07d2526121e7ddc71d82671d8299e1068d13

Terminado Caja 18.2

18.3 — Lectura de Salidas ✅

Implementado:

    ●	contratos;

    ●	domain record;

    ●	repository;

    ●	application service;

    ●	IPC/preload;

    ●	servicio renderer;

    ●	consulta por fecha;

    ●	consulta por rango;

    ●	fechas civiles locales;

    ●	flag canónico editable.

Commit:

9b588024cafb218fb0ac6805a9db04760dc46d79

Terminado Caja 18.3

18.4 — CRUD de Salidas ✅

18.4a — backend/API/persistencia ✅

Implementado:

    ●	alta;

    ●	edición;

    ●	baja lógica;

    ●	fecha automática al crear;

    ●	validación y normalización backend;

    ●	protección caja abierta;

    ●	pertenencia exacta de movimiento a caja;

    ●	transacciones;

    ●	reconciliación movimientos\_salida\_cents;

    ●	IPC/preload/API/servicio renderer;

    ●	tests de servicio y repository SQLite.

Commit:

3ddf0f05883df9f866762b7804fca969b6fb9c0f

Terminado Caja 18.4a

18.4b — interfaz completa ✅

Implementado:

    ●	CashOutflowsComponent;

    ●	filtros Fecha/Rango iguales al patrón del Histórico;

    ●	controles de calendario nativos;

    ●	anterior/siguiente;

    ●	listado;

    ●	candado de caja cerrada;

    ●	formulario Signal Forms;

    ●	alta/edición;

    ●	cancelación;

    ●	confirmación y éxito de borrado;

    ●	feedback inferior de guardado durante 4 segundos;

    ●	alta queda seleccionada tras guardarse;

    ●	edición mantiene selección;

    ●	borrado deja el editor sin selección;

    ●	histórico consultable aunque no exista caja abierta;

    ●	crear/editar/borrar bloqueados sin caja abierta o sobre caja cerrada;

    ●	pruebas funcionales y aspecto visual aprobados.

Commit:

d5888ac594ec608f9ec0214efaf109b7d717c7d4

Terminado Caja 18.4b

18.5 — Datos calculados del cierre 🔨 SIGUIENTE

Backend de lectura del cierre activo:

    ●	saldo inicial;

    ●	ventas que afectan caja;

    ●	salidas;

    ●	saldo final teórico;

    ●	tipos de pago;

    ●	operaciones;

    ●	ventas/importes por tipo.

Calcular desde:

id\_caja

venta

venta\_pago

tipo\_pago.afecta\_caja

movimiento\_caja

Reglas ya acordadas:

    ●	usar caja exacta, no intervalos de tiempo;

    ●	excluir ventas con deleted\_at IS NOT NULL;

    ●	ventas efectivo \= pagos cuyo tipo tenga afecta\_caja \= true;

    ●	soportar pagos divididos;

    ●	operaciones por tipo \= COUNT(DISTINCT id\_venta);

    ●	tratar devoluciones según importes firmados de venta\_pago;

    ●	datos económicos calculados en backend.

En 18.5 solo lectura/cálculo.

No implementar todavía:

    ●	recuento físico;

    ●	campos de cierre editables;

    ●	persistencia del cierre.

18.6 — UI de cierre \+ recuento

Implementar:

    ●	bloque superior;

    ●	importe real;

    ●	desplegable de monedas/billetes;

    ●	cálculo del recuento;

    ●	retirado;

    ●	entrada;

    ●	diferencia;

    ●	saldo siguiente.

Usar caja\_recuento.

18.7 — Desglose por tipos de pago

Tarjetas desplegables:

    ●	todos salvo Efectivo estructural;

    ●	ventas;

    ●	operaciones;

    ●	importe real editable;

    ●	diferencia.

Sin Tienda/Web/Totales.

18.8 — Cierre transaccional

Implementar comando/servicio/repository para:

    ●	confirmación;

    ●	recalcular datos en backend;

    ●	validar;

    ●	persistir caja;

    ●	persistir caja\_tipo;

    ●	persistir caja\_recuento;

    ●	registrar acumulados;

    ●	cerrar transaccionalmente;

    ●	impedir venta hasta nueva apertura.

18.9 — Regresión final

Cubrir:

    ●	caja importada;

    ●	caja nueva;

    ●	movimientos legacy;

    ●	salida actual;

    ●	salida caja cerrada;

    ●	pagos simples;

    ●	pagos mixtos;

    ●	tipos afectaCaja;

    ●	devoluciones;

    ●	recuentos;

    ●	diferencias;

    ●	retirada;

    ●	entrada;

    ●	cierre;

    ●	nueva apertura;

    ●	histórico embebido/modal;

    ●	Informes sigue placeholder.

31\. 18 Caja — decisiones explícitamente no abiertas todavía

No diseñar todavía:

    ●	Informes;

    ●	nuevos tipos de informes;

    ●	impresión de cierre;

    ●	exportación específica de cierres;

    ●	permisos finos específicos de Caja;

    ●	sincronización con tienda online;

    ●	cambios de multi-terminal más allá de respetar id\_terminal;

    ●	observaciones de cierre si el usuario no las solicita.

No inventar requisitos.

32\. 18 Caja — referencias visuales aportadas

El usuario aportó capturas del TPV antiguo para:

    ●	Histórico de ventas;

    ●	Salidas caja;

    ●	Cerrar caja.

Estas capturas sirven como referencia de:

    ●	estructura;

    ●	jerarquía;

    ●	distribución;

    ●	comportamiento general.

No es obligatorio copiar literalmente el diseño visual antiguo.

El nuevo apartado debe mantener coherencia con la interfaz actual de Osumi TPV Client.

33\. Commits recientes relevantes

ef79cb84820cf2736ef5d0d5d473ec4df51a7549

Terminado Gestión 17.6

fe85e59b1f7049fe3a87655d3a3ed2c6c03b3709

Corrección modal login en Gestión

6e9f20dd98e32e290db8a41acafcef44ab9ef3d5

Selector de empleado en ventas

d7a9c1885a8a482d53fdf79f8b5a35945e4de465

Ronda de limpieza de antiguo valor empleados

282417b8b6b0ee2deaeee63111376d07c217d03b

Terminada limpieza de campo empleados

fe372fddbd9837d32dff4c4aae811a2848d34e01

Actualizado documento de continuidad tras plan para 18

495efcee83e37c3ac64495f6cac1cad963ddb07e

Terminado Caja 18.1

be3c07d2526121e7ddc71d82671d8299e1068d13

Terminado Caja 18.2

9b588024cafb218fb0ac6805a9db04760dc46d79

Terminado Caja 18.3

3ddf0f05883df9f866762b7804fca969b6fb9c0f

Terminado Caja 18.4a

d5888ac594ec608f9ec0214efaf109b7d717c7d4

Terminado Caja 18.4b

Último main confirmado para esta v2.77:

d5888ac594ec608f9ec0214efaf109b7d717c7d4

No hay cambios locales pendientes conocidos al generar este documento.

34\. Resumen ejecutivo

✅ 16 Compras

✅ 17.1 Gestión shell/rutas

✅ 17.2 auth backend empleados

✅ 17.3 sesión/permisos

✅ 17.4 Ajustes

✅ 17.5 Empleados

✅ 17.6 Tipos de pago

✅ Corrección foco modal Gestión

✅ Ventas / Empleados

0 empleados → error

1 empleado → automático

\>1 empleados → selector

reservas con la misma regla

✅ Eliminado completamente flag \`empleados\`

\- AppData

\- instalación

\- Ajustes

\- contratos

\- mappers

\- tests

\- importador .otpv

\- exportador .otpv

🔨 18 Caja

✅ 18.1 Shell

✅ 18.2 Histórico embebido

✅ 18.3 Lectura salidas

✅ 18.4 CRUD salidas

      ✅ 18.4a backend/API

      ✅ 18.4b interfaz

▶️ 18.5 Datos calculados cierre — SIGUIENTE

⏳ 18.6 UI/recuento

⏳ 18.7 Tipos de pago

⏳ 18.8 Cierre transaccional

⏳ 18.9 Regresión

✅ Salidas de caja

\- Fecha / Rango

\- calendario nativo

\- anterior / siguiente

\- alta / edición / baja lógica

\- cajas cerradas solo lectura

\- acumulado de salidas reconciliado

\- feedback inferior al guardar

\- alta queda seleccionada

\- borrado deja sin selección

⏳ 19 Enforcement global permisos

📋 Sincronización Indomable Store ↔ Osumi TPV

PLANIFICADA

NO INICIAR HASTA TERMINAR LA APLICACIÓN

⏸ TicketBAI 12C.9

Fuente de verdad al continuar:

main

\+

este documento

\+

conversación actual

Antes de 18.5 revisar de nuevo el main actualizado.

35\. Siguiente paso exacto

El siguiente trabajo de código es:

\> \*\*18.5 — Datos calculados del cierre\*\*

Objetivo de esta unidad:

Crear la lectura canónica de la caja abierta necesaria para pintar posteriormente el cierre.

Debe devolver, como mínimo:

saldoInicial

ventasEfectivo / ventasQueAfectanCaja

salidasCaja

saldoFinalTeorico

desgloseTiposPago\[\]

Para cada tipo de pago relevante:

tipoPago

importeVentas

operaciones

Fuentes de datos

Usar:

caja

venta

venta\_pago

tipo\_pago

movimiento\_caja

Asociar operaciones mediante:

venta.id\_caja

No mediante intervalo apertura/cierre.

Reglas económicas ya cerradas

Saldo inicial

caja.importe\_apertura\_cents

Ventas efectivo / efectivo que afecta caja

SUM(venta\_pago.importe\_cents)

WHERE tipo\_pago.afecta\_caja \= true

No limitar al slug efectivo.

Salidas

Suma de:

movimiento\_caja

tipo \= 'salida'

deleted\_at IS NULL

id\_caja \= caja actual

Saldo final teórico

saldoInicial

\+ ventasQueAfectanCaja

\- salidasCaja

Tipos de pago

Para cada tipo usado/definido según el diseño que confirme el código actual:

importe \= SUM(venta\_pago.importe\_cents)

operaciones \= COUNT(DISTINCT venta.id)

La UI inferior excluirá posteriormente el Efectivo estructural, pero 18.5 debe diseñar el contrato de datos de manera coherente con 18.6/18.7.

Ventas anuladas/borradas

Excluir:

venta.deleted\_at IS NOT NULL

Devoluciones

Respetar importes firmados ya persistidos en venta\_pago.

No añadir una segunda regla de compensación sin revisar el comportamiento actual de ventas/devoluciones.

Alcance estricto de 18.5

Sí:

    ●	contratos;

    ●	record(s);

    ●	repository queries;

    ●	application service;

    ●	IPC/preload;

    ●	servicio renderer si es necesario;

    ●	tests de cálculos.

No:

    ●	formulario visual definitivo de Cerrar caja;

    ●	recuento de monedas/billetes;

    ●	retirado;

    ●	entrada editable;

    ●	cierre de caja;

    ●	escritura de caja\_tipo;

    ●	escritura de caja\_recuento.

Eso empieza en 18.6/18.8.

Procedimiento

    1\.	revisar main;

    2\.	revisar cómo quedan actualmente los acumulados de venta en caja y caja\_tipo;

    3\.	decidir si 18.5 lee agregados persistidos o recalcula canónicamente desde venta/pagos; la decisión acordada favorece recalcular;

    4\.	implementar una sola unidad pequeña;

    5\.	tests;

    6\.	usuario ejecuta batería completa;

    7\.	no avanzar hasta verde \+ push.

36\. Regla final de dirección

Para cualquier módulo heredado:

    1\.	el usuario explica comportamiento antiguo y objetivo nuevo;

    2\.	se contrasta con repositorios;

    3\.	se revisa el esquema/código actual;

    4\.	se resuelven dudas;

    5\.	se acuerdan decisiones;

    6\.	se define plan;

    7\.	se implementa por bloques pequeños;

    8\.	el usuario valida;

    9\.	se continúa solo después de verde y push.

Estado al cerrar esta v2.77:

    ●	17.5 Empleados: CERRADO.

    ●	17.6 Tipos de pago: CERRADO.

    ●	Corrección foco modal Gestión: CERRADA.

    ●	Ventas/Empleados: CERRADO.

    ●	Flag empleados: ELIMINADO COMPLETAMENTE.

    ●	18.1 Shell de Caja: CERRADO.

    ●	18.2 Histórico embebido: CERRADO.

    ●	18.3 Lectura de Salidas: CERRADO.

    ●	18.4 CRUD de Salidas: CERRADO.

    ●	18.5 Datos calculados del cierre: SIGUIENTE.

    ●	18.6–18.9 Caja: pendientes posteriores.

    ●	Informes de Caja: placeholder; no diseñar todavía.

    ●	19 permisos: pendiente posterior.

    ●	Sincronización Indomable Store: planificada pero pospuesta hasta terminar la aplicación.

    ●	TicketBAI 12C.9: pausado.

    ●	Último commit confirmado: d5888ac594ec608f9ec0214efaf109b7d717c7d4.

La siguiente conversación puede comenzar directamente con:

Continuamos con 18.5 — Datos calculados del cierre.

Antes de escribir código, revisar de nuevo main y seguir la regla de una sola unidad pequeña por respuesta.
