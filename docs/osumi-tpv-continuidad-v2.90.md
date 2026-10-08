Osumi TPV Client — Documento de continuidad v2.90
Fecha: 8 de octubre de 2026
Proyecto principal: Osumi TPV Client
Repositorio Client: https://github.com/osumionline/Osumi-TPV-Client
Repositorio TPV Backup API: https://github.com/osumionline/TPV-Backup-API
Repositorio TPV Backup Front: https://github.com/osumionline/TPV-Backup-Front
Este documento actualiza y sustituye como referencia principal de continuidad a:
docs/osumi-tpv-continuidad-v2.89.md
La fuente de verdad para continuar el desarrollo será siempre:
main actual de los repositorios +
documento de continuidad más reciente +
conversación activa
La v2.90 tiene dos objetivos principales: 1. dejar formalmente cerrado todo el Hito 21 — TPV Backup, incluido 21.9 — Backups remotos automáticos; 2. introducir una pausa técnica transversal de logging antes de comenzar el Hito 22 — Sincronización tienda online.
El documento histórico:
docs/tpv-backup-contexto-tecnico-v1.0.md
sigue siendo útil como referencia del nacimiento de TPV Backup, pero las decisiones e implementación descritas aquí prevalecen ante cualquier diferencia.

1. Resumen ejecutivo
   1.1. Estado general
   ✅ Hito 16 — Compras
   ✅ Hito 17 — Gestión
   ✅ Hito 18 — Caja base
   ✅ Empleado por venta
   ✅ Hito 19 — Permisos
   ✅ Hito 20 — Caja > Informes
   ✅ Hito 21 — TPV Backup
   ✅ 21.1 Especificación `.otpv` v3
   ✅ 21.2 Exportador nativo del Client
   ✅ 21.3 Restauración nativa v3
   ✅ 21.4 Nueva app TPV Backup
   ✅ 21.5 API remota
   ✅ 21.6 Integración Client ↔ TPV Backup
   ✅ 21.7 Seguridad / integridad / retención
   ✅ 21.8 Regresión recuperación global
   ✅ 21.9 Backups remotos automáticos
   ✅ 21.9.1 Configuración de hora
   ✅ 21.9.2 Estado persistente del scheduler
   ✅ 21.9.3 Ejecución automática
   ✅ 21.9.4 Ciclo de vida Electron
   ✅ 21.9.5 UI informativa
   ✅ 21.9.6 Regresión funcional final
   ▶️ PAUSA TÉCNICA — Logging transversal y diagnóstico persistente
   ⏳ Hito 22 — Sincronización tienda online
   ⏸ TicketBAI 12C.9 — pendiente de Berein
   1.2. Punto exacto de continuación
   El próximo trabajo NO es todavía Hito 22.
   El siguiente bloque será:
   PAUSA TÉCNICA — Logging transversal
   Objetivo funcional:

> Cuando ocurra un problema en una instalación real, debe quedar información persistente suficiente para reconstruir posteriormente qué ocurrió, aunque el usuario haya cerrado rápidamente el aviso o no recuerde los detalles.
> Motivación operativa:
> ● el TPV debe permitir vender con agilidad;
> ● los mensajes de error seguirán siendo claros y accionables para el usuario;
> ● no se puede depender de que el usuario recuerde o copie el mensaje;
> ● soporte necesita poder revisar posteriormente qué operación falló, cuándo, en qué contexto y con qué error técnico;
> ● los logs deben ser útiles sin poner en riesgo secretos o información sensible.
> La pausa técnica debe diseñarse antes de modificar código de forma masiva.

2. HEADs al generar v2.90
   2.1. Osumi TPV Client
   HEAD verificado:
   cacc941a0b7805ed58a6a65581b65dcd3897337e
   Terminado añadir última copia automática en pantalla de backups 21.9.5b
   Commit anterior:
   157e6a214bdb806b2b62ebdaeeb175e49ffb496b
   Terminado consulta pública Main - Renderer 21.9.5a
   Documento de continuidad anterior:
   d9104a0f1f65e4e244d492928552b811bc9d2d8c
   Actualizado documento de continuidad tras 21.9.4
   No hubo cambios de código posteriores a cacc941... para cerrar 21.9.6.
   21.9.6 se cerró mediante:
   ● pruebas funcionales reales;
   ● batería completa de tests/build/lint;
   ● resultado reportado: todo correcto.
   2.2. TPV Backup API
   HEAD conocido y sin cambios durante 21.9:
   d1d3bdcde95d0e7d848347ec434b499025caa1b5
   Tarea de reconciliacion 21.7.3a
   2.3. TPV Backup Front
   HEAD conocido y sin cambios durante 21.9:
   1be138f8e280646b9419f9fe60287111174e890e
   Corrección en mensaje al desactivar subscripción
3. Forma de trabajo acordada
   El desarrollo se realiza incrementalmente y con verificación entre bloques.
   3.1. Antes de proponer código
   Siempre:
   1. revisar main;
   2. leer los archivos exactos implicados;
   3. no inventar rutas, clases, contratos, helpers ni APIs;
   4. reutilizar arquitectura y pipelines existentes;
   5. distinguir decisiones cerradas de propuestas pendientes;
   6. tras cada push confirmado por el usuario, volver a revisar main.
      3.2. Entrega
      Archivo nuevo:
      ruta exacta

-

contenido completo
Archivo existente:
ruta exacta +
bloque identificable +
reemplazo exacto
Preferencia expresa:
● bloques pequeños y coherentes;
● no ZIP;
● probar antes de continuar;
● no avanzar con errores.
3.3. GitHub
Desde ChatGPT:
SOLO LECTURA
No crear remotamente:
● commits;
● ramas;
● PR;
● issues;
● comentarios;
● archivos.
El usuario aplica cambios, ejecuta pruebas y hace push.
3.4. Estado de situación
En cada bloque de desarrollo indicar:
Dónde estamos
Qué estamos haciendo
Qué queda por delante 4. Convenciones permanentes
4.1. TypeScript exports
Regla expresa:
1 único símbolo exportado
→ export default
2 o más símbolos exportados
→ exports nominales
→ nunca export default
Referencia histórica importante:
636efea
4.2. Imports
Usar aliases absolutos siempre que exista uno.
Aliases Electron relevantes:
@bootstrap/*
@backend/*
@desktop-contracts/*
@infrastructure/*
@ipc/*
Evitar rutas relativas cuando exista alias aplicable.
4.3. Documentación de código
Todo método creado o modificado debe tener:
JSDoc / PHPDoc
incluidos contratos e interfaces.
4.4. Angular
Base actual:
Angular 22.2.1
standalone
zoneless
signals
Signal Forms
Convenciones:
● inject();
● input() / output();
● signal queries;
● @if, @for, @switch;
● tipado estricto;
● evitar any;
● unknown cuando proceda;
● Angular Material;
● MatTooltip en vez de title;
● sin NgModule;
● evitar CommonModule;
● sin HostBinding / HostListener;
● sin ngClass / ngStyle;
● WCAG AA;
● Prettier organiza imports. 5. Baterías de pruebas
Client — cierre estable:
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
TPV Backup API:
composer test
TPV Backup Front:
npm test
npm run build
npm run lint
La batería completa del Client fue ejecutada al cierre de 21.9.6 y el usuario confirmó que pasó correctamente. 6. Versiones relevantes del Client
Referencia verificada durante 21.9:
Angular ^22.2.1
Angular Material ^22.2.1
Electron ^44.5.1
TypeScript ~6.0.2
Vitest ^5.0.3
Node types ^26.6.4
better-sqlite3 ^12.11.1
typeorm ^1.1.1
yauzl ^3.4.0
yazl ^3.3.1
@osumi/angular-tools ^1.5.2
@osumi/ticketbaiws ^1.0.1
npm 12.2.0 7. Hito 21 — CERRADO
El Hito 21 queda oficialmente terminado.
Su resultado final comprende tres aplicaciones:
Osumi TPV Client
TPV Backup API
TPV Backup Front
y cubre:
● formato portable .otpv v3;
● creación local;
● restauración nativa;
● importación legacy;
● almacenamiento remoto;
● autenticación;
● integridad;
● seguridad;
● retención;
● descarga;
● borrado;
● restore remoto;
● recuperación tras interrupciones;
● gestión administrativa;
● backups remotos automáticos diarios;
● UI de estado automático;
● regresión funcional real. 8. .otpv v3 — contrato consolidado
ZIP exterior:
manifest.json
payload.enc
payload.enc contiene el ZIP interior cifrado.
8.1. Criptografía
formatVersion = 3
cryptoSuite = otpv3-scrypt-aes-256-gcm
scrypt:
salt 32 bytes
cost 32768
blockSize 8
parallelization 3
length 32 bytes
AES-256-GCM:
● DEK aleatoria por backup;
● KEK derivada desde TPV Backup key;
● wrapping de DEK;
● IV 12 bytes;
● auth tag 16 bytes.
8.2. Payload portable
Incluye:
database/osumi-tpv.sqlite
config/app_data.json
assets/logo.webp
secrets/secrets.json
files/**
No incluye:
printing_settings.json
backup_automatic_state.json
logs/
backups/
staging/
TPV Backup key
JWT
Esta exclusión de logs/ sigue siendo el contrato vigente al comenzar la pausa técnica.
No modificarla accidentalmente al introducir logging.
8.3. Límite
8 GiB
Upload/download en streaming. 9. Secretos y credenciales
No confundir:
installation.public_id
≠
TPV Backup Key ID
≠
TPV Backup Secret
≠
backup.backup_id
≠
backup.public_id
≠
TPV Backup key
9.1. TPV Backup key
● UTF-8 exacto;
● no trim;
● no normalización;
● nunca al servidor;
● nunca dentro de .otpv;
● usada para derivar KEK.
9.2. Key ID + Secret
Credenciales remotas.
Key ID → trim permitido
Secret → conservar exactamente
Persistencia:
secrets/backup_remote_credentials.json
protegido mediante Electron safeStorage.
9.3. JWT remoto
● RAM;
● no persistir;
● no Renderer;
● no .otpv. 10. Filesystem actual del Client
Raíz:
app.getPath('userData') / osumi-tpv
Estructura relevante:
osumi-tpv/
├── config/
│ ├── app_data.json
│ ├── printing_settings.json
│ └── backup_automatic_state.json
├── assets/
│ ├── logo.webp
│ └── files/
├── database/
│ └── osumi-tpv.sqlite
├── backups/
├── logs/
├── secrets/
│ ├── secrets.json
│ └── backup_remote_credentials.json
└── staging/
ApplicationPaths YA dispone de:
readonly logsDirectory: string;
ElectronApplicationPathsProvider ya resuelve:
<root>/logs
En main.ts ya existe:
app.setAppLogsPath(applicationPaths.logsDirectory);
Por tanto:

> La pausa técnica de logging no parte de cero en cuanto a estructura de filesystem, pero todavía debe diseñarse el logger de aplicación real, su API, su persistencia, su política y su integración.

11. Recuperación e instalación
    app_data.json es marcador final de instalación completa.
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
    config/backup_automatic_state.json
    es local, no portable y se resetea al reemplazar instalación.
12. TPV Backup API — semántica consolidada
    12.1. Suscripciones
    ACTIVE
    auth ✅
    list ✅
    download ✅
    delete ✅
    upload ✅
    EXPIRED
    auth ✅
    list ✅
    download ✅
    delete ✅
    upload ❌
    DISABLED
    auth ❌
    list ❌
    download ❌
    delete ❌
    upload ❌
    12.2. Revalidación
    Cada request relevante revalida:
    ● credencial;
    ● revocación;
    ● key id;
    ● instalación;
    ● suscripción;
    ● estado activo.
    Rotar/revocar invalida efectivamente JWT aún vigente.
    12.3. Storage
    Ruta lógica:
    installations/<installation.public_id>/<backup.public_id>.otpv
    Fuera del webroot.
    Integridad mediante tamaño + SHA-256.
    Reconciliación read-only ya implementada y probada.
13. 21.9 — Backups remotos automáticos — CERRADO
    13.1. Decisiones definitivas
    hora por defecto 03:00
    hora configurable sí
    formato HH:mm
    zona horaria local del terminal
    lastSuccessfulAt UTC ISO
    estado scheduler local, no portable
    backupAutomaticTime portable en app_data.json
    backup manual NO satisface ciclo automático
    varios días offline 1 catch-up, no N
    fallo NO marca éxito
    retry aproximadamente 1 hora
    suspend/resume reevaluación inmediata
    pipeline BackupRemoteCreateService
    toggle enable no
    Activación práctica:
    instalación válida

-

credenciales remotas +
suscripción/canUpload válidos +
ciclo pendiente
13.2. Compatibilidad
Instalaciones/backups antiguos sin:
backupAutomaticTime
normalizan a:
03:00
sin bump innecesario de schema.
13.3. Persistencia
Fichero:
config/backup_automatic_state.json
estructura:
{
"schemaVersion": 1,
"lastSuccessfulAt": "2026-10-08T07:00:00.000Z"
}
Escrito de forma atómica.
No forma parte del .otpv. 14. Scheduler automático — arquitectura final
14.1. Resolución temporal
BackupAutomaticScheduleResolver calcula:
latestScheduledAt
nextScheduledAt
pending
reconstruyendo fechas civiles locales.
No usa:
setInterval(24h)
como modelo de calendario.
Esto evita asumir días rígidos de 24 horas y preserva la semántica local ante DST.
14.2. Estado
BackupAutomaticStateService:
● carga último éxito;
● resuelve estado;
● marca éxito únicamente tras completar;
● permite reset.
14.3. Ejecución
BackupAutomaticExecutionService comprueba:
instalación
credenciales
pending
y reutiliza:
BackupRemoteCreateService
La autenticación/estado administrativo remoto se vuelve a comprobar antes de generar el paquete costoso.
Un fallo:
NO markSuccessful()
14.4. Ciclo de vida
BackupAutomaticSchedulerService:
● primera evaluación al arrancar;
● programa próximo vencimiento;
● retry ~1 h en error/estado sin próximo fiable;
● evita evaluaciones concurrentes;
● permite reevaluate();
● conserva una petición de reevaluación si llega durante otra evaluación.
main.ts:
createMainWindow
↓
scheduler.start()
before-quit:
scheduler.stop()
↓
database.disconnect()
powerMonitor.resume:
scheduler.reevaluate()
14.5. Cambios en caliente
Reevaluación tras éxito de:
● actualización de configuración;
● instalación;
● configuración de credenciales remotas;
● eliminación de credenciales;
● restore v3 finalizado;
● import legacy finalizado;
● resume del sistema.
No se reevalúa por credenciales temporales de restore. 15. UI automática final
En:
Gestión → Copias de seguridad
la zona TPV Backup muestra en dos tarjetas de igual ancho:
[Tienda / suscripción]
[Copias automáticas]
La tarjeta automática muestra:
Copias automáticas
Todos los días a las HH:mm
Última copia automática
<fecha local o "Todavía no se ha realizado ninguna">
Al día / Pendiente
La UI:
● consulta el estado mediante contrato público Main → Renderer;
● no lee filesystem directamente;
● no recalcula scheduling en Angular;
● no muestra nextScheduledAt como promesa de retry;
● distingue backup manual de automático;
● usa diseño responsive;
● ambas tarjetas quedan alineadas desde la parte superior.
Contrato público:
BackupAutomaticInfo
campos:
automaticTime
lastSuccessfulAt
latestScheduledAt
nextScheduledAt
pending 16. 21.9.6 — Regresión funcional final — RESULTADO
Todas las pruebas funcionales previstas para el cierre fueron superadas.
16.1. Ejecución real al vencer la hora
Procedimiento:
● configurar hora pocos minutos por delante;
● mantener aplicación abierta;
● esperar vencimiento.
Resultado:
✅ se creó automáticamente
✅ exactamente una copia
✅ lastSuccessfulAt actualizado
✅ UI pasó a Al día
16.2. Reinicio sin duplicados
Tras una ejecución automática correcta:
cerrar
abrir de nuevo
Resultado:
✅ no se creó duplicado
✅ lastSuccessfulAt se conservó
✅ estado siguió Al día
16.3. Backup manual independiente
Después del ciclo automático se creó una copia manual.
Resultado:
✅ listado remoto +1
✅ lastSuccessfulAt automático no cambió
✅ manual NO satisfizo ni alteró el ciclo automático
16.4. Catch-up con aplicación cerrada
Procedimiento:
● configurar hora futura cercana;
● cerrar antes del vencimiento;
● abrir después.
Resultado:
✅ se creó una única copia al arrancar
✅ se actualizó lastSuccessfulAt
✅ quedó Al día
✅ no hubo duplicados posteriores
16.5. Suspensión / reanudación
Procedimiento real:
● configurar hora;
● mantener Client abierto;
● cerrar tapa del portátil;
● dejar pasar vencimiento;
● reabrir tapa.
Resultado:
✅ powerMonitor.resume provocó reevaluación
✅ se creó la copia pendiente
✅ una sola copia
✅ estado final Al día
16.6. Fallo de red y recuperación
Procedimiento:
● configurar vencimiento cercano;
● desconectar red;
● dejar vencer;
● comprobar estado;
● recuperar red;
● provocar reevaluación real mediante cambio de hora relevante.
Resultado:
✅ fallo NO actualizó lastSuccessfulAt
✅ UI permaneció Pendiente
✅ no apareció copia falsa
✅ tras recuperación se creó exactamente una copia
✅ lastSuccessfulAt se actualizó
✅ volvió a Al día
16.7. Batería automática final
Ejecutada:
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
Resultado reportado:
✅ todo correcto
Por tanto:
✅ 21.9 — CERRADO
✅ Hito 21 — CERRADO 17. Commits clave de 21.9
Cronología útil:
86acb9565b602f6353e396832ee8018a95136780
Terminado incluir backupAutomaticTime 21.9.1a
96661d3e2d809185a393ecc8e486f6813bebe1f4
Corrección UX de logo obligatorio
3588d60b6da922f3bc7f765c6a502fc9df2a778c
Retoques estéticos hora backups
3a76fb7739ed8c0e1195f43318d45963895bf992
Compatibilidad backups antiguos 21.9.1c
42bad51b5c7cc4abe531ca165575f71a52aa8c93
Resolver horario automático 21.9.2a
7f2181e3a4809ff1fe021c79fecadcb31ab4299f
Persistencia lastSuccessfulAt 21.9.2b
81f74f1addbff1b62e47d4f27b1bcb9ce1e71e30
Corrección 21.9.2b
570304da1abe50e9cbf9196749c6bfd17944ec3f
Servicio estado scheduler 21.9.2c
382b6213532dad1a87f96716c2d733dbaea4b7f5
Ejecutor aislado 21.9.3a
e496dd7186a2c8f60914cbfa7b4befd7f1482d19
Composición real 21.9.3b
80f2c54ccffa9b4847bd24becd367d6c570fbf57
Reset estado al reemplazar instalación 21.9.3c
3b87982466722ef4d7488db1eef4c9f434716d12
Motor scheduler 21.9.4a-1
f34f0b7031c00a328d05be6e9d3fca8f75f86542
Startup/stop real 21.9.4a-2
cf86a64d94446a07872ba2f96cfd8eddc50427ee
Reanudación suspensión 21.9.4b
2d81e1cbb33eea84c59e2f0762e039484a262183
Cambios configuración en caliente 21.9.4c
157e6a214bdb806b2b62ebdaeeb175e49ffb496b
Consulta pública Main → Renderer 21.9.5a
cacc941a0b7805ed58a6a65581b65dcd3897337e
UI última copia automática 21.9.5b 18. PAUSA TÉCNICA — Logging transversal
Este es el siguiente bloque.
No pertenece al Hito 22.
Nombre recomendado de trabajo:
Pausa técnica — Logging y diagnóstico
Puede subdividirse después de la auditoría. 19. Problema que debe resolver el logging
Situación actual:
ocurre un error
↓
se controla
↓
se muestra mensaje al usuario
↓
usuario necesita continuar vendiendo
↓
descarta/cierra el aviso
↓
más tarde contacta soporte
↓
no recuerda mensaje, secuencia ni contexto exacto
Resultado:
diagnóstico difícil
reproducción incierta
pérdida de contexto técnico
Objetivo de la pausa:
ocurre un error
↓
usuario recibe mensaje claro +
queda registro técnico persistente
↓
usuario continúa trabajando cuando sea posible
↓
soporte puede revisar después:
qué ocurrió
cuándo
en qué operación
qué error técnico hubo
qué contexto seguro era relevante
El logger NO sustituye los mensajes de usuario.
Debe complementar la UX existente. 20. Estado actual relevante para logging
20.1. Directorio ya disponible
Existe:
osumi-tpv/logs/
y forma parte de ApplicationPaths.
20.2. Electron ya conoce esa ruta
En main.ts:
app.setAppLogsPath(applicationPaths.logsDirectory);
Esto configura la ruta de logs de Electron, pero NO equivale por sí solo a tener un logger funcional de aplicación para todos nuestros casos de uso.
20.3. Errores actuales
Existen usos explícitos de:
console.error(...)
en distintas zonas.
Ejemplos ya conocidos:
● errores de startup en main.ts;
● fallo al desconectar DB;
● scheduler automático;
● pantalla Gestión → Backups;
● otros handlers/componentes a auditar.
Actualmente muchos errores están correctamente tratados de cara al usuario, pero no existe todavía una estrategia transversal y persistente con:
● niveles;
● contexto;
● formato;
● rotación;
● retención;
● sanitización;
● correlación;
● acceso de soporte. 21. Principios iniciales del logger
Estos puntos expresan el objetivo, no una implementación cerrada.
21.1. Persistencia real
Los errores importantes deben sobrevivir al cierre de la aplicación.
No depender únicamente de:
DevTools
terminal
console
memoria
21.2. No bloquear venta
Logging debe ser secundario respecto al flujo operativo.
Regla deseada:

> Un fallo escribiendo un log no debe impedir una venta ni convertir un problema secundario en uno crítico.
> Salvo casos excepcionales, el logger debería trabajar de forma best-effort.
> 21.3. Contexto suficiente
> Un registro útil probablemente necesitará conceptos como:
> timestamp
> nivel
> área / categoría
> operación
> mensaje
> error
> stack cuando exista
> contexto técnico seguro
> versión de aplicación
> El formato definitivo queda pendiente de diseño.
> 21.4. Seguridad
> Nunca registrar secretos.
> Especialmente:
> TPV Backup key
> TPV Backup Secret
> JWT
> secretApi
> emailSmtpPass
> ticketBaiToken
> contraseñas
> tokens
> payloads cifrados completos
> headers Authorization
> También revisar datos personales/comerciales antes de loguear objetos enteros.
> Regla preferida:
> registrar identificadores y contexto mínimo necesario, no volcar estructuras arbitrarias.
> 21.5. UX existente
> Mantener:
> mensaje comprensible al usuario

-

detalle técnico en log
No sustituir errores amigables por mensajes internos. 22. Auditoría inicial necesaria antes de diseñar
Antes de introducir el logger hay que recorrer el Client y clasificar puntos de error.
Como mínimo:
22.1. Electron Main
Revisar:
electron/main.ts
electron/bootstrap/**
electron/ipc/**
electron/backend/application/**
electron/infrastructure/**
Buscar:
console.error
console.warn
console.log
catch
throw new Error
promesas rechazadas
operaciones filesystem
DB
red
printing
email
TicketBAI
TPV Backup
22.2. Renderer Angular
Revisar:
src/app/**
Especialmente:
● servicios de aplicación;
● páginas con try/catch;
● DialogService.alert;
● errores mapeados con getErrorMessage;
● acciones críticas de venta;
● caja;
● compras;
● configuración;
● backups;
● impresión;
● email;
● TicketBAI.
22.3. IPC
Decidir la frontera correcta para errores originados en Renderer.
Pregunta abierta:
¿Renderer envía entradas de log a Main mediante IPC?
Probablemente sea necesario si queremos una única persistencia controlada por Electron, pero NO darlo por cerrado hasta revisar arquitectura.
22.4. Procesos globales
Revisar posibilidades como:
uncaughtException
unhandledRejection
renderer process errors
window errors
Angular ErrorHandler
Electron render-process-gone
No activar capturas globales indiscriminadamente sin valorar duplicados y ruido. 23. Decisiones pendientes de la pausa técnica
NO están cerradas todavía.
23.1. Implementación
Evaluar:
logger propio
vs
librería madura
Criterios:
● soporte Electron;
● rotación;
● rendimiento;
● TypeScript;
● mantenimiento;
● dependencia runtime;
● funcionamiento offline;
● control de destino;
● sanitización;
● facilidad de test.
No introducir una dependencia antes de compararla con una solución simple propia.
23.2. Niveles
Posible esquema:
debug
info
warn
error
pero debe decidirse qué se conserva en producción.
Evitar logs excesivos por cada interacción trivial.
23.3. Formato
Pendiente decidir:
texto legible
JSON Lines
híbrido
Necesidades de soporte deberían guiar esta decisión.
23.4. Archivos y rotación
Pendiente definir:
● nombre de archivo;
● tamaño máximo;
● rotación;
● días/archivos retenidos;
● limpieza;
● comportamiento ante disco lleno;
● escritura concurrente.
23.5. Logs de Renderer
Pendiente definir:
● API IPC;
● contrato de entrada;
● campos permitidos;
● normalización de Error;
● sanitización;
● prevención de objetos enormes.
23.6. Contexto y correlación
Estudiar si merece la pena disponer de:
operationId
requestId
sale publicId/id
backup publicId
invoice id
según el flujo.
No añadir IDs artificiales a todo el sistema si no aportan diagnóstico real.
23.7. Acceso para soporte
El objetivo del usuario es poder recuperar los logs posteriormente.
Opciones a estudiar:
Abrir carpeta de logs
Exportar paquete de logs
Copiar ruta
ZIP de soporte
selección de intervalo
No se ha decidido todavía ninguna.
23.8. Privacidad
Antes de permitir exportar logs, revisar:
● información personal;
● tickets;
● clientes;
● email;
● fiscalidad;
● tokens;
● rutas locales;
● nombres de usuario del sistema. 24. Logging y .otpv
Contrato vigente:
logs/
→ NO portable
→ NO incluido en `.otpv`
Durante la pausa técnica mantener esta regla por defecto.
Razones:
● logs pertenecen al terminal y al diagnóstico local;
● pueden contener contexto operativo;
● no son necesarios para restaurar funcionamiento;
● podrían aumentar tamaño;
● podrían trasladar información innecesaria entre terminales.
Si en el futuro se desea un “paquete de soporte”, debe diseñarse como función independiente y explícita, no colarse dentro del backup portable. 25. Logging y TPV Backup
Los backups automáticos ya generan fallos silenciosos/no modales cuando corresponde.
Esto refuerza el valor del logger.
Ejemplo:
scheduler intenta backup
↓
red caída
↓
usuario no recibe modal repetitivo
↓
logger registra el fallo técnico
↓
scheduler mantiene pending
↓
retry posterior
El logger debería permitir distinguir como mínimo:
inicio evaluación
no configurado
no pendiente
intento upload
fallo autenticación/red
éxito
retry
pero sin convertir cada evaluación normal en ruido excesivo.
La granularidad exacta debe decidirse en la auditoría. 26. Logging y ventas
Ventas es el flujo más crítico operativamente.
Prioridad de diseño:

> Un problema debe quedar registrado sin impedir que el usuario siga trabajando cuando el dominio permita continuar.
> Áreas futuras de especial interés para auditoría:
> ● resolución de artículos;
> ● guardar venta;
> ● impresión ticket;
> ● generación PDF;
> ● email;
> ● TicketBAI;
> ● cambio cliente/tipo pago postventa;
> ● caja.
> No asumir que todos necesitan el mismo nivel o cantidad de logging.

27. Logging y errores esperables
    No todo resultado negativo es un error técnico.
    Ejemplos conceptuales:
    usuario cancela diálogo
    → no error
    búsqueda sin resultados
    → no error
    credenciales inválidas introducidas por usuario
    → posiblemente warn/info contextual, no necesariamente error técnico
    fallo filesystem inesperado
    → error
    SQLite integrity failure
    → error crítico
    API responde suscripción caducada
    → estado de negocio esperado
    La pausa debe establecer una taxonomía razonable para no llenar los logs de falsos errores.
28. Posible plan de trabajo de la pausa técnica
    No definitivo hasta auditar main, pero buen punto de partida:
    PT-LOG.1 Auditoría actual
    → localizar console/catch/error boundaries
    → clasificar dominios y severidad
    → inventario de secretos a proteger
    PT-LOG.2 Contrato y arquitectura
    → Logger interface
    → formato
    → niveles
    → persistencia
    → rotación
    → sanitización
    PT-LOG.3 Implementación Main
    → File logger
    → lifecycle
    → tests
    PT-LOG.4 Renderer → Main
    → contrato IPC
    → servicio Angular
    → error handler si procede
    PT-LOG.5 Migración de puntos críticos
    → sustituir console.error relevantes
    → ventas
    → caja
    → impresión
    → red
    → backup
    → TicketBAI
    → filesystem/database
    PT-LOG.6 Soporte
    → acceso/exportación de logs si se aprueba
    PT-LOG.7 Regresión
    → fallos simulados
    → sanitización
    → rotación
    → disco/ruta no disponible
    → batería completa
    La numeración puede ajustarse después de la auditoría.
29. Qué NO hacer al empezar la pausa
    Evitar:
    ❌ reemplazar todos los console.error masivamente de una vez
    ❌ loguear objetos completos sin revisar secretos
    ❌ persistir JWT/tokens
    ❌ incluir logs en .otpv por accidente
    ❌ hacer que el logger pueda romper ventas
    ❌ escribir directamente a filesystem desde Angular Renderer
    ❌ duplicar cada error varias veces en Main + IPC + Renderer
    ❌ introducir ruido de debug permanente en producción
    ❌ diseñar rotación sin pruebas
    Primero arquitectura, después migración incremental.
30. Primer paso al retomar
    Antes de escribir código:
    1.  revisar main;
    2.  auditar búsquedas de:
        console.error
        console.warn
        console.log
        catch (
        getErrorMessage
        DialogService.alert
    3.  revisar:
        ApplicationPaths
        ApplicationDirectoriesService
        main.ts
        application-composition.ts
        IPC bridge/preload
        desktop API
        Angular services
    4.  preparar mapa de puntos de logging;
    5.  proponer arquitectura mínima;
    6.  decidir formato/rotación/sanitización;
    7.  implementar un bloque pequeño y testeable.
31. Hito 22 — POSPUESTO hasta terminar logging
    Siguiente gran hito funcional:
    Hito 22 — Sincronización tienda online
    Estado:
    ⏳ pendiente
    No comenzar todavía.
    Orden acordado:
    ✅ Hito 21
    ↓
    ▶️ Pausa técnica — Logging transversal
    ↓
    ⏳ Hito 22 — Sincronización tienda online
    Al terminar la pausa técnica conviene generar otro documento de continuidad antes de entrar en Hito 22, especialmente si el logger toca muchas capas.
32. TicketBAI — estado separado
    Librería:
    @osumi/ticketbaiws 1.0.1
    Pendiente:
    TicketBAI 12C.9
    → respuesta / actualización de Berein
    No mezclar esta espera con la pausa de logs.
    Cuando Berein responda habrá que revisar:
    ● tipos;
    ● endpoints;
    ● documentación;
    ● posibles cambios del SDK.
33. Recordatorios de arquitectura crítica
    33.1. Snapshot SQLite
    Nunca copiar SQLite operacional directamente.
    Usar snapshot consistente.
    33.2. Zero knowledge TPV Backup
    Servidor:
    nunca recibe TPV Backup key
    nunca descifra payload.enc
    33.3. Restore
    Credenciales remotas temporales de restore:
    RAM
    ↓
    finalize
    ↓
    safeStorage definitivo
    33.4. Scheduler
    Manual:
    backup manual ≠ backup automático
    Fallo:
    fallo ≠ éxito
    Catch-up:
    varios días pendientes → una sola copia
34. Bugs históricos ya resueltos que no deben reabrirse
    ● estado stale de TPV Backup en Gestión;
    ● getConnection() remoto stale;
    ● credenciales temporales restore;
    ● limpieza tras instalación incompleta;
    ● integridad SHA en upload/download;
    ● ruta .tmp del estado automático;
    ● duplicados del scheduler;
    ● resume tras suspensión;
    ● cambios de configuración en caliente;
    ● UI de mat-error transparente;
    ● compatibilidad backup antiguo sin hora automática.
    Solo revisarlos de nuevo si aparece evidencia nueva.
35. Checklist para una conversación nueva
    Si se alcanza el límite de contexto:
    1.  localizar el documento de continuidad más reciente;
    2.  si es v2.90, asumir:
        Hito 21 cerrado
        Logging es el siguiente trabajo
        Hito 22 aún no iniciado
    3.  revisar main;
    4.  comparar HEAD con:
        cacc941a0b7805ed58a6a65581b65dcd3897337e
    5.  si hay commits posteriores, leerlos antes de proponer nada;
    6.  auditar el logging existente antes de elegir implementación;
    7.  mantener aliases absolutos;
    8.  mantener convención de exports;
    9.  JSDoc/PHPDoc;
    10. trabajar en bloques pequeños;
    11. ejecutar pruebas después de cada bloque;
    12. indicar siempre dónde estamos y qué queda.
36. Punto exacto de cierre de esta continuidad
    Al generar v2.90:
    HEAD Client:
    cacc941a0b7805ed58a6a65581b65dcd3897337e
    Terminado añadir última copia automática en pantalla de backups 21.9.5b
    Estado lógico:
    ✅ Hito 21 — TPV Backup
    ✅ 21.9 — Backups remotos automáticos
    ✅ regresión funcional real
    ✅ batería completa Client
    ▶️ Pausa técnica — Logging transversal
    ⏳ Hito 22 — Sincronización tienda online
    Cuando este documento sea subido al repositorio:
    docs/osumi-tpv-continuidad-v2.90.md
    debe sustituir a v2.89 como referencia principal de continuidad.
37. Regla final
    Para continuar:
    main actual
    → continuidad más reciente
    → conversación activa
    Y para la pausa técnica recordar el objetivo central:

> Los errores deben seguir siendo manejables para el usuario en el momento, pero además deben dejar una traza persistente, segura y útil para poder diagnosticar después qué ocurrió realmente.
