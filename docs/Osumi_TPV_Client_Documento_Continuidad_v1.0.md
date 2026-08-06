# Osumi TPV Client — Documento de continuidad y relevo

**Versión:** 1.0  
**Fecha:** 6 de agosto de 2026  
**Estado:** Installation e importación legacy completadas; comienza el traspaso modular.

## 1. Propósito del documento

Este documento reúne el contexto técnico y funcional necesario para continuar el desarrollo de Osumi TPV Client aunque se abra una conversación nueva o cambie la persona que trabaja en el proyecto.

Debe tratarse como un documento vivo. Al completar un módulo, cambiar una decisión arquitectónica o cerrar un hito, se actualizarán la versión, el estado actual, las decisiones y el siguiente paso.

> **Importante:** Hito actual: el flujo completo de Installation y la importación legacy desde un paquete .otpv están terminados, validados manualmente y dejan una instalación operativa.

## 2. Estado actual del proyecto

- Aplicación de escritorio: Electron + Angular.
- Backend local: Node.js/TypeScript dentro de Electron.
- Persistencia local: SQLite mediante TypeORM y better-sqlite3.
- Instalación desde cero: completada.
- Importación desde Osumi TPV antiguo mediante .otpv: completada.
- Transformación de las 33 tablas legacy: completada.
- Importación de imágenes, iconos, documentos PDF, logo, configuración y secretos: completada.
- Promoción atómica desde staging a la instalación definitiva: completada.
- Siguiente gran fase: traspaso modular de la aplicación antigua a la nueva, revisando arquitectura, experiencia de usuario y componentes en cada módulo.

## 3. Repositorios y entorno

| Elemento | Valor |
| --- | --- |
| Cliente de escritorio | https://github.com/osumionline/Osumi-TPV-Client |
| Aplicación antigua | https://github.com/osumionline/Osumi-TPV |
| API remota futura | https://github.com/osumionline/TPV-Client-API |
| Ruta local principal | C:\Users\anacp\Documents\Angular\Osumi\Osumi-TPV-Client |
| Sistema habitual | Windows 11 |
| Editor | Visual Studio Code |
| Zona horaria | Europe/Madrid |

## 4. Arquitectura objetivo

Osumi TPV Client es la evolución instalable de Osumi TPV. La primera etapa es monopuesto y local; la arquitectura debe permitir evolucionar a multipuesto sin duplicar la lógica de negocio.

- Angular se ocupa de interfaz, estado de presentación y formularios.
- El backend Electron/Node concentra la lógica de negocio, validación y persistencia.
- El frontend envía acciones o comandos con payloads tipados.
- Una capa de persistencia decide si la acción se ejecuta contra SQLite local o contra una API remota OFW.
- La selección local/remota dependerá de la configuración y licencia del equipo.
- La futura API remota reutilizará la misma semántica de acciones y reglas de negocio.
> **Importante:** Principio arquitectónico: la lógica de negocio no debe quedar repartida entre componentes Angular ni depender de detalles de SQLite.

## 5. Convenciones de desarrollo

- Angular moderno: componentes standalone, signals, computed, input/output e inject().
- Control flow moderno: @if, @for y @switch.
- Tipado estricto; evitar any y preferir tipos explícitos incluso cuando TypeScript pueda inferirlos.
- No usar una carpeta core. Servicios en src/app/services y guards en src/app/guards.
- Agrupación por dominio, por ejemplo src/app/model/configuracion/.
- export default cuando el archivo exporta un único elemento; exports nombrados cuando contiene varios.
- SCSS con anidamiento cuando mejora la legibilidad.
- En Angular 22 no añadir explícitamente ChangeDetectionStrategy.OnPush.
- Aliases activos: @env, @app/* y @backend/*.
- Al modificar código existente se debe indicar la ubicación exacta usando bloques presentes en el archivo actual.
- Cuando un archivo es nuevo o el contexto puede haber cambiado, se entrega el archivo completo.
- No asumir que un fragmento propuesto anteriormente continúa existiendo sin comprobarlo.

## 6. Installation e importación legacy completadas

### 6.1 Bloque 4A — Selección, inspección e integridad

- Diálogo nativo para seleccionar archivos .otpv.
- Inspección segura del ZIP y prevención de rutas peligrosas.
- Inventario de archivos, versiones, recuentos de tablas y filas.
- SHA-256 del paquete y verificación de checksums.
- Revalidación antes de ejecutar la importación.
### 6.2 Bloque 4B — Análisis del dump

- Lector incremental de database.sql.
- Interpretación tipada de INSERT, NULL, números, booleanos y textos escapados.
- Detección de duplicados, referencias inválidas y restricciones incompatibles con SQLite.
### 6.3 Bloque 4C — Revisión y decisiones

- Informe previo a la importación.
- Resolución de conflictos bloqueantes.
- Decisiones manuales y automáticas validadas antes de importar.
### 6.4 Bloque 4D — Transformación de datos y archivos

- Worker independiente y base SQLite temporal.
- Importadores por fases con transacciones y rollback.
- Datos maestros, catálogo, artículos, etiquetas, códigos, caducidades e imágenes.
- Clientes, reservas, facturas y relaciones.
- Cajas, recuentos, movimientos, ventas, líneas, pagos y TicketBAI.
- Pedidos, líneas, vistas y documentos PDF.
- Histórico de artículos y de almacén.
### 6.5 Bloque 4E — Activación definitiva

- Lectura y transformación de app_data.json.
- Separación y cifrado de secretApi y backupApiKey mediante safeStorage.
- Conversión real del logo a PNG.
- Preparación de secuencias de tickets y facturas.
- Validación global de SQLite.
- Promoción atómica de base, archivos, logo, secretos y configuración.
- Recuperación ante una promoción interrumpida.

## 7. Tablas legacy transformadas

El paquete legacy contiene 33 tablas. Todas están cubiertas por el proceso de importación:

| Dominio | Tablas legacy |
| --- | --- |
| Catálogo | articulo, codigo_barras, categoria, marca, etiqueta, etiqueta_web, articulo_etiqueta, articulo_etiqueta_web, foto, articulo_foto |
| Stock e histórico | caducidad, historico_articulo, historico_almacen |
| Ventas | venta, linea_venta |
| Caja | caja, caja_tipo, pago_caja |
| Compras | pedido, linea_pedido, pdf_pedido, vista_pedido |
| Proveedores | proveedor, comercial, proveedor_marca |
| Clientes y facturación | cliente, factura, factura_venta, reserva, linea_reserva |
| Gestión | empleado, empleado_rol, tipo_pago |

## 8. Decisiones importantes ya tomadas

- La base SQLite se crea completa; no se usan migraciones durante Installation.
- Los IDs legacy se conservan cuando resulta seguro y útil.
- Los public_id nuevos se generan de forma determinista a partir del hash de origen y la entidad.
- Precios contables se almacenan en céntimos o microeuros según la precisión necesaria.
- Porcentajes se almacenan en puntos básicos o microporcentaje.
- Efectivo pasa a ser un tipo de pago explícito.
- Los archivos reciben nombres internos nuevos y se validan con tamaño y SHA-256.
- app_data.json es el último marcador de una instalación promovida correctamente.
- Los secretos no se almacenan en texto plano dentro de app_data.json.
- El historial legacy conserva códigos y valores reales aunque la documentación antigua sea incompleta.
- Las referencias opcionales inválidas pueden normalizarse a NULL con advertencia; las referencias esenciales provocan error.

## 9. Mejora de usabilidad aplicada al importador

El proceso de importación no cambia de ruta; muestra distintas vistas dentro del mismo componente. Por ello withInMemoryScrolling() no controlaba esos cambios.

- Al analizar el paquete se desplaza la vista al inicio del informe.
- Al abrir la resolución de conflictos se desplaza al inicio.
- Al validar decisiones se enfoca la sección Decisiones validadas.
- Al iniciar la importación se desplaza al proceso.
- Al terminar se desplaza al informe final.
- La implementación usa viewChild(), afterNextRender(), focus({preventScroll:true}) y scrollIntoView().

## 10. Nuevo hito: traspaso modular

> **Importante:** A partir de este punto comienza el traspaso funcional de Osumi TPV antiguo a Osumi TPV Client.

El trabajo se realizará módulo por módulo. No se pretende copiar mecánicamente la aplicación antigua: cada módulo se revisará para mejorar arquitectura, experiencia de usuario, tipado, separación de responsabilidades y compatibilidad futura con modo multipuesto.

| Orden propuesto | Módulo | Objetivo principal |
| --- | --- | --- |
| 1 | Arranque, sesión y navegación | Abrir la base definitiva, cargar configuración, login y shell principal. |
| 2 | Venta | Caja activa, búsqueda, carrito, pagos, stock, ticket y TicketBAI. |
| 3 | Artículos | Listado, edición, precios, stock, códigos, etiquetas, fotos y caducidades. |
| 4 | Compras | Pedidos, recepción, documentos, proveedores y actualización de costes. |
| 5 | Clientes | Ficha, reservas, facturación e histórico. |
| 6 | Almacén | Inventario, mermas, caducidades e históricos. |
| 7 | Caja | Apertura, cierre, recuentos, movimientos y consultas. |
| 8 | Gestión | Empleados, roles, permisos, configuración y tipos de pago. |
| 9 | Estadísticas | Informes y cuadros de mando sobre el nuevo modelo. |

## 11. Método de trabajo por módulo

Para cada módulo se seguirá el mismo ciclo:

1. Inventariar pantallas, componentes, servicios, modelos y endpoints de la aplicación antigua.
1. Identificar qué comportamiento debe conservarse y qué deuda técnica no debe trasladarse.
1. Revisar el modelo SQLite y las reglas de negocio disponibles.
1. Definir casos de uso, acciones backend y contratos tipados.
1. Proponer arquitectura de carpetas y responsabilidades.
1. Trasladar primero una vertical funcional mínima.
1. Mejorar UX, accesibilidad, estados vacíos, errores y rendimiento.
1. Añadir pruebas y comprobar datos importados reales.
1. Cerrar el módulo con una recapitulación y actualizar este documento.
> **Importante:** En cada módulo se revisarán las decisiones en vez de asumir que la implementación antigua es el diseño correcto.

## 12. Información que debe aportarse al empezar un módulo

- Archivos actuales de la pantalla o componente antiguo.
- Servicios, endpoints o DTO relacionados.
- Capturas o descripción del flujo cuando la interfaz sea relevante.
- Archivos actuales del cliente nuevo que ya afecten al módulo.
- Reglas de negocio o excepciones conocidas.
- Qué comportamiento se considera imprescindible conservar.
- Qué aspectos resultan incómodos o mejorables en la aplicación antigua.

## 13. Protocolo para cambios de código

- Los cambios se darán en orden de compilación y por bloques pequeños verificables.
- Cada archivo nuevo se entregará completo.
- En archivos existentes se indicará la ruta y la ubicación exacta antes o después de un símbolo presente en la versión actual.
- Cuando haya dudas sobre el contenido actual, se pedirá o revisará el archivo antes de proponer un parche amplio.
- Tras cada bloque se ejecutarán typecheck, build, lint y pruebas o comprobaciones específicas.
- No se avanzará al bloque siguiente hasta que el actual funcione o queden documentadas sus limitaciones.

## 14. Prompt de arranque para una conversación nueva

```text
Estoy continuando el desarrollo de Osumi TPV Client. Usa el archivo “Osumi TPV Client — Documento de continuidad y relevo” como contexto principal. El hito Installation e importación legacy está completado y probado. Ahora estamos trasladando la aplicación antigua módulo por módulo, revisando arquitectura y experiencia de usuario. Respeta las convenciones técnicas y el protocolo de cambios del documento. Antes de proponer cambios sobre archivos existentes, trabaja con su contenido actual y no asumas que conservan fragmentos de respuestas anteriores. El módulo que vamos a trabajar ahora es: [MÓDULO]. El objetivo concreto es: [OBJETIVO]. Estos son los archivos actuales: [ARCHIVOS].
```

## 15. Próximo paso

El siguiente paso recomendado es comenzar el bloque 5B: arranque normal, shell principal, apertura de la base definitiva, carga de configuración, sesión de empleado y navegación inicial.

Después se abordará el módulo de Venta como primera vertical funcional completa.

## 16. Registro de hitos

| Versión | Fecha | Hito |
| --- | --- | --- |
| 1.0 | 6 de agosto de 2026 | Installation e importación legacy completadas. Inicio del traspaso modular. |
