# Osumi TPV Client — Documento de continuidad v2.82

**Fecha:** 23 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento actualiza y sustituye como referencia de continuidad a `docs/osumi-tpv-continuidad-v2.81.md`.

Su objetivo es permitir retomar el desarrollo sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

## Unidad de trabajo

Cada respuesta de desarrollo debe contener una **unidad pequeña, coherente, autocontenida y verificable**.

Esto **no significa un archivo por mensaje**.

Regla práctica:

- si una unidad funcional afecta a varios archivos estrechamente relacionados y el cambio sigue siendo claro, se pueden modificar juntos;
- si el bloque empieza a mezclar responsabilidades, a crecer demasiado o aumenta el riesgo de omisiones, dividirlo;
- evitar tanto los bloques masivos como la fragmentación artificial de un archivo por respuesta.

Antes de proponer código dependiente del repositorio:

1. revisar siempre el estado actual de `main`;
2. no inventar rutas, clases, helpers, APIs ni contratos;
3. para archivos nuevos, dar contenido completo;
4. para archivos existentes, indicar bloques exactos y contexto suficiente;
5. incluir los tests que correspondan a la misma unidad funcional.

Tras cada bloque estable:

```bash
npm test
npm run build
npm run test:electron
npm run build:electron
npm run lint
```

No continuar si hay errores.

Tras verde + push, volver a revisar `main` antes del siguiente bloque.

## JSDoc

Regla permanente:

> Todo método que se cree o se modifique debe tener JSDoc.

Aplica también a métodos privados y a métodos declarados en interfaces.

## Convención de exports

```text
1 único símbolo exportado por archivo
→ export default

2 o más símbolos exportados por archivo
→ solo exports nominales
→ sin export default
```

## Angular

Referencia actual:

- Angular 22.1.x;
- standalone;
- zoneless;
- signals;
- `input()` / `output()`;
- `inject()`;
- `computed()` / `effect()` cuando proceda;
- `@if` / `@for`;
- Signal Forms;
- `viewChild()` signal;
- servicios propios con `@Service()`;
- tipado estricto.

## Tests

- Electron: imports explícitos de Vitest.
- Renderer/frontend: globals según la configuración actual.
- Aislar hijos pesados en specs del padre cuando el hijo ya tenga cobertura propia.
- No crear infraestructura de test desproporcionada si una capa inferior ya cubre la lógica crítica.

## Base de datos

```text
DATABASE_SCHEMA_VERSION = 1
```

No crear migraciones salvo necesidad expresa.

---

# 2. Repositorios

## Osumi TPV

- Cliente nuevo: `https://github.com/osumionline/Osumi-TPV-Client`
- TPV antiguo UI: `https://github.com/osumionline/Osumi-TPV`
- TPV API antigua/exportador: `https://github.com/osumionline/TPV-API`
- SDK TicketBAI: `https://github.com/osumionline/ticketbaiws`

## Indomable Store

- Panel Angular: `https://github.com/igorosabel/indomable-admin`
- Backend: `https://github.com/igorosabel/indomable-api`
- Frontend: `https://github.com/igorosabel/indomable-frontend`

## Regla de acceso

Todos los repositorios deben tratarse desde ChatGPT en **modo estrictamente de solo lectura**.

---

# 3. Estado general

```text
✅ 16 Compras

✅ 17 Gestión
   ✅ 17.1 Shell/rutas
   ✅ 17.2 Auth backend empleados
   ✅ 17.3 Sesión/permisos
   ✅ 17.4 Ajustes
   ✅ 17.5 Empleados
   ✅ 17.6 Tipos de pago

✅ Ventas / empleados
   ✅ eliminado flag legacy `empleados`
   ✅ selector integrado por venta
   ✅ 1 empleado → asignación automática
   ✅ 2+ empleados → empleado pendiente

✅ 18 Caja base
   ✅ Histórico de ventas
   ✅ Salidas caja
   ✅ Cerrar caja
   ✅ cierre transaccional
   ✅ compatibilidad legacy
   ✅ recuento físico

✅ 19 Permisos definitivos
   ✅ 19.1 catálogo/string/importador
   ✅ 19.2 Ventas
   ✅ 19.3 Gestión
   ✅ 19.4 regresión

▶️ 20 Caja — Informes
   ✅ 20.1 Contratos y periodos
   ✅ 20.2 Backend Informe Simple
   ✅ 20.3 Selector + UI/impresión Simple
   ✅ 20.4 Backend Informe Detallado
   ✅ 20.5 UI/impresión Detallado
   ▶️ 20.6 Backend Informe Ventas
   ⏳ 20.7 UI Informe Ventas + impresión
   ⏳ 20.8 Regresión final

⏳ 21 TPV Backup
⏳ 22 Sincronización tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

---

# 4. Punto exacto de continuidad

Último commit confirmado en `main`:

```text
f33f0e7edd2190ef725d1b27c39d245e6013249e
Terminado Informes 20.5
```

Commits recientes:

```text
fc298f5c8b07018bf8b70d2827c75cdf7a644ee1
Terminado Informes 20.4b

267dc99556422af39bf891d1e6d3bbc463178bbe
Terminado Informes 20.4a

22c605b029a910066948c5d7b95c9a72addf4aea
Terminado Informes 20.3c-b

e13faa6af8ede604aaebeb51d53b8adfde480c51
Terminado Informes 20.3c-a

c68a2b5385e519c9f2dd1b0b6bb59345ce3fd439
Terminado Informes 20.3

b021f273cef8d47ab551a0a313f5f6a2d44d3d7e
Terminado Informes 20.2b

415a8ca68cb341d64f1a2f5184c38ce28df56d1b
Terminado Informes 20.2a
```

Tras 20.5:

```text
npm test               ✅
npm run build          ✅
npm run test:electron  ✅
npm run build:electron ✅
npm run lint           ✅

Prueba funcional Simple     ✅
Prueba funcional Detallado  ✅
Impresión                   ✅
```

---

# 5. Empleados y permisos — reglas definitivas

## Empleado por venta

```text
0 empleados
→ no se puede iniciar una venta

1 empleado
→ asignación automática

2+ empleados
→ empleado pendiente
→ selector embebido en la venta
```

## Permisos

```text
ventas.modificar_importes
gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

Ventas usa el empleado asignado a la venta.

Gestión usa el empleado autenticado.

`admin = true` hace bypass completo.

No añadir permisos a Caja, Marcas, Proveedores, Artículos, Clientes, Compras ni navegación general.

Mapeo legacy:

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
```

---

# 6. Caja — estado actual

Caja contiene:

```text
1. Histórico de ventas
2. Salidas caja
3. Cerrar caja
4. Informes
```

Estado de Informes:

```text
Simple      ✅ completo e imprimible
Detallado   ✅ completo e imprimible
Ventas      ⏳ selector preparado; implementación pendiente
```

---

# 7. Hito 20 — definición funcional

Objetivo:

> Tres informes consultables e imprimibles: Simple, Detallado y Ventas.

Fuentes contrastadas:

- TPV antiguo Angular;
- `InformesService` legacy;
- `TPV-API`;
- esquema SQLite actual;
- capturas aportadas por el usuario.

---

# 8. Selector de informes

En:

```text
Caja → Informes
```

existen:

```text
Tipo
Mes
Año
Categoría (solo Ventas)
Generar
```

Tipo:

```text
Simple
Detallado
Ventas
```

Estado actual:

```text
Simple      → Generar habilitado
Detallado   → Generar habilitado
Ventas      → Generar deshabilitado
```

Mes:

```text
Todos
Enero
...
Diciembre
```

Año:

```text
año actual + 4 anteriores
```

El árbol de categorías ya se precarga y se muestra indentado cuando se selecciona Ventas.

---

# 9. Periodos y comparativas

Existe un resolver común ya implementado y probado.

Mes concreto:

```text
periodo actual
→ mes seleccionado

comparativa
→ mes inmediatamente anterior
```

Enero:

```text
enero 2026
→ diciembre 2025
```

`Todos`:

```text
año completo
→ año completo anterior
```

Los repositories usan intervalos:

```text
[desde, hastaExclusive)
```

---

# 10. Arquitectura definitiva de impresión

Los informes **no se renderizan dentro de Caja**.

Flujo:

```text
Caja → Informes
      ↓
Generar
      ↓
CajaInformesService
      ↓
IPC
      ↓
CajaInformePrintService
      ↓
servicio de negocio
      ↓
snapshot completo
      ↓
ElectronCajaInformePrintWindow
      ↓
BrowserWindow independiente
      ↓
preload exclusivo
      ↓
CashReportPrintComponent
      ↓
componente del informe
      ↓
IMPRIMIR
      ↓
webContents.print()
```

Existe una única infraestructura común preparada para:

```text
simple
detallado
ventas
```

Contrato discriminado:

```text
CajaInformePrintDocumento
```

IPC exclusivo:

```text
caja-informe-print:get-documento
caja-informe-print:print
```

La ventana valida el `webContents.id` autorizado.

Impresión:

```text
A4 landscape
printBackground = true
diálogo nativo
```

Los controles de ventana no se imprimen.

---

# 11. Informe Simple — estado definitivo

```text
✅ backend
✅ ventana independiente
✅ UI
✅ impresión
✅ mensual
✅ anual
```

Columnas:

```text
Fecha
Tickets
[tipos de pago]
Total
Suma
```

Mes concreto:

```text
una línea por día natural
```

`Todos`:

```text
una línea por mes
```

Pagos:

```text
venta_pago
```

Total:

```text
venta.total_cents
```

Suma:

```text
acumulado progresivo
```

Tickets:

```text
serie + numero
```

Un único ticket se muestra como rango:

```text
9486 - 9486
```

Efectivo se mantiene como columna estructural.

Tipos de pago históricos usados siguen apareciendo aunque estén inactivos.

Ventas borradas se excluyen.

Ajuste visual importante:

```scss
table {
  margin: 0;
}
```

en los componentes de informe para neutralizar el `margin: 16px 0` global de `src/styles/tables.scss`.

---

# 12. Informe Detallado — estado definitivo

```text
✅ backend
✅ IPC/apertura
✅ BrowserWindow
✅ UI
✅ impresión
✅ mensual
✅ anual
```

Se divide en:

```text
Ventas
Marcas
Artículos
```

---

# 13. Detallado — Ventas

## Ventas

```text
número de ventas/tickets
```

No es un importe.

Se muestra:

```text
valor actual
↑ / ↓ / =
diferencia absoluta
```

## Beneficio medio

Semántica nueva definitiva:

```text
margen global ponderado
```

Fórmula:

```text
ventas PVP
= Σ (pvp_micros × unidades)

beneficio
= Σ ((pvp_micros - puc_micros) × unidades)

margen
= beneficio / ventas PVP × 100
```

Comparativa:

```text
margen actual - margen anterior
```

Unidad:

```text
puntos porcentuales
```

---

# 14. Detallado — Marcas

Se muestran **todas las marcas**, incluso sin ventas.

Columnas:

```text
Marca
Total ventas PVP
Total beneficio
% margen beneficio
Incremento
% ventas
```

Histórico de marca:

```text
linea_venta.id_marca_snapshot
```

Margen:

```text
beneficio / ventas PVP × 100
```

Incremento:

```text
margen actual - margen anterior
```

% ventas:

```text
PVP marca / PVP total marcas × 100
```

Footer:

```text
PVP total
beneficio total
margen global ponderado
```

No se usa media simple de márgenes.

---

# 15. Detallado — Artículos

Top:

```text
50 artículos con mayor PVP del periodo
```

Solo entran artículos identificables por:

```text
linea_venta.id_articulo
```

Columnas:

```text
Marca
Nombre
Unidades
Total ventas PVP
Total beneficio
Incremento
% ventas
```

Incremento:

```text
margen actual - margen anterior
```

El periodo anterior **no se limita a su propio Top 50** antes de buscar el artículo comparable.

% ventas:

```text
tickets distintos con artículo / tickets totales × 100
```

Footer:

```text
suma únicamente del Top 50 mostrado
```

---

# 16. UI Detallado

Componente:

```text
DetailedReportComponent
```

Usa tablas HTML normales para una impresión más predecible.

Diferencias:

```text
↑ +2,50 p.p.
↓ -1,75 p.p.
= 0,00 p.p.
= —
```

Las diferencias se muestran siempre.

En impresión:

- `thead` repetible;
- filas sin cortes innecesarios;
- densidad reducida;
- tablas con `margin: 0`.

---

# 17. Informe Ventas por categorías — siguiente trabajo

Siguiente bloque:

```text
20.6 — Backend Informe Ventas
```

Filtro adicional:

```text
Categoría
```

Periodo:

```text
mes concreto
o
Todos
```

La categoría seleccionada incluye todos sus descendientes.

---

# 18. Ventas — árbol

Estructura:

```text
Categoría
  Subcategoría
    Subcategoría
      Marca + Artículo
```

Tabla:

```text
Concepto
Margen
Unidades
Importe
```

Reglas UI posteriores:

- indentación;
- expandido inicialmente;
- colapsable en pantalla;
- categorías sin ventas pueden omitirse;
- estado vacío si no hay ventas.

---

# 19. Ventas — artículo

Para cada artículo:

```text
Marca
Nombre
Margen
Unidades
Importe
```

Importe:

```text
Σ linea_venta.importe_micros
```

Unidades:

```text
Σ linea_venta.unidades
```

Margen:

```text
PVP = Σ (pvp_micros × unidades)
beneficio = Σ ((pvp_micros - puc_micros) × unidades)
margen = beneficio / PVP × 100
```

---

# 20. Ventas — multicategoría

Relación:

```text
articulo_categoria
```

Un artículo puede aparecer en varias ramas.

Regla crítica:

> Los agregados superiores deben deduplicar una misma línea de venta.

Ejemplo:

```text
rama A → artículo X
rama B → artículo X

padre
→ X cuenta una sola vez
```

La suma visual de hijos puede superar el total del padre. Esto es aceptado e intencionado.

---

# 21. Categorías históricas

No se guarda snapshot de categoría en `linea_venta`.

El Informe Ventas usará:

```text
clasificación actual del artículo
```

Por tanto una venta antigua puede aparecer en la categoría actual del artículo.

---

# 22. Agrupar por marca

El Informe Ventas incluirá:

```text
[ ] Agrupar por marca
```

Sin marcar:

```text
categorías → artículos
```

Marcado:

```text
categorías → marcas
```

Cada marca agrega:

- importe;
- unidades;
- PVP;
- beneficio;
- margen ponderado.

---

# 23. Impresión

Estado:

```text
Simple      ✅
Detallado   ✅
Ventas      ⏳
```

Reglas comunes:

- BrowserWindow independiente;
- A4 horizontal;
- diálogo nativo;
- controles ocultos;
- cabeceras y totales visibles.

Ventas deberá además:

- ocultar checkbox;
- ocultar controles de expansión;
- imprimir todas las ramas expandidas;
- respetar modo artículos/marcas.

---

# 24. Fuentes de datos de Informes

```text
venta
venta_pago
tipo_pago
linea_venta
articulo
articulo_categoria
categoria
marca
```

Histórico económico:

```text
linea_venta.puc_micros
linea_venta.pvp_micros
linea_venta.importe_micros
linea_venta.unidades
```

Ventas válidas:

```text
venta.deleted_at IS NULL
```

---

# 25. Reglas matemáticas consolidadas

Ventas PVP:

```text
Σ (pvp_micros × unidades)
```

Beneficio:

```text
Σ ((pvp_micros - puc_micros) × unidades)
```

Margen:

```text
beneficio / ventas PVP × 100
```

Diferencia de margen:

```text
margen actual - margen anterior
```

% ventas Marca:

```text
PVP marca / PVP total × 100
```

% ventas Artículo:

```text
tickets distintos con artículo / tickets totales × 100
```

Importe Informe Ventas:

```text
Σ importe_micros
```

---

# 26. Decisiones legacy que no se copian

Ventas Detallado:

```text
legacy: COUNT tickets mostrado como €
nuevo: COUNT tickets como número
```

Beneficio medio:

```text
legacy: beneficio monetario medio por ticket
nuevo: margen global ponderado
```

Incrementos:

```text
legacy: parte oculta hasta hover
nuevo: flecha + diferencia siempre visible
```

Categorías:

```text
legacy: media simple de márgenes
nuevo: margen ponderado
```

---

# 27. Plan Hito 20 actualizado

## ✅ 20.1 Contratos y periodos

Cerrado.

## ✅ 20.2 Backend Simple

Cerrado.

## ✅ 20.3 Selector + UI/impresión Simple

Cerrado.

## ✅ 20.4 Backend Detallado

Cerrado.

## ✅ 20.5 UI/impresión Detallado

Cerrado.

## ▶️ 20.6 Backend Ventas

Implementar:

- validar categoría;
- obtener categoría y descendientes;
- árbol actual;
- líneas del periodo;
- multicategoría;
- deduplicación por `linea_venta.id`;
- `importe_micros`;
- unidades;
- PVP;
- beneficio;
- margen ponderado;
- artículos directos por categoría;
- agrupaciones directas por marca;
- mensual;
- `Todos`.

Tests:

```text
árbol multinivel
multicategoría
deduplicación en ancestros
categoría sin ventas
devoluciones
importe final
margen ponderado
agrupación por marca
Todos
```

## ⏳ 20.7 UI Ventas + impresión

Implementar:

- árbol recursivo;
- expandido inicial;
- colapsar/expandir;
- checkbox Agrupar por marca;
- modo artículos;
- modo marcas;
- impresión forzada expandida;
- integración con BrowserWindow común;
- habilitar Generar para Ventas.

## ⏳ 20.8 Regresión final

Cubrir:

```text
Simple mensual/anual
Detallado mensual/anual
Ventas mensual/anual
comparativas
pagos mixtos
devoluciones
multicategoría
marcas sin ventas
Top 50
impresión
```

---

# 28. Hito 21 — TPV Backup

Objetivo:

> `.otpv` como artefacto canónico de copia/restauración completa.

Flujo:

```text
Client
↓
.otpv completo
↓
TPV Backup
↓
custodia
↓
.otpv
↓
restauración completa
```

Plan preliminar:

```text
21.1 especificación .otpv
21.2 exportador Client
21.3 importación/restauración
21.4 nueva app TPV Backup
21.5 API almacenamiento remoto
21.6 integración Client ↔ Backup
21.7 seguridad/integridad/retención
21.8 regresión recuperación
```

Antes de 21.1:

- estudiar exportador TPV-API;
- estudiar TPV Backup OFW8;
- inventariar datos/ficheros;
- resolver secretos portables;
- acordar stack;
- cerrar contrato `.otpv`.

---

# 29. `.otpv` actual — referencia

Actualmente contiene:

- dump MariaDB;
- `app_data.json`;
- logo;
- fotos;
- marcas;
- proveedores;
- iconos tipos de pago;
- PDFs;
- plugins.

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

---

# 30. Hito 22 — Sincronización tienda online

Orden:

```text
20 Informes
↓
21 TPV Backup
↓
22 Sincronización
```

Arquitectura:

```text
Osumi TPV Client
      │ HTTPS
      ▼
indomablestore.com / indomable-api
```

No exponer servidor local.

---

# 31. Sincronización — decisiones cerradas

Pedido:

- fecha económica `Order.payed_at`;
- `id_cliente = NULL`;
- inicialmente solo ventas pagadas.

Artículos:

```text
clave compartida = localizador
```

PUC:

```text
se resuelve en TPV local
```

Tipo de pago:

```text
tipoPagoPublicId
```

Empleado:

```text
Tienda online
```

Caja:

```text
online     → id_caja = NULL
presencial → id_caja != NULL
```

Idempotencia:

```text
origen
referencia_externa
```

Seguridad:

- HTTPS;
- secreto compartido;
- `safeStorage`;
- HMAC SHA-256;
- `iat`;
- `exp`.

---

# 32. Hito 22 — plan S1–S10

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

# 33. TicketBAI

SDK:

```text
@osumi/ticketbaiws
```

Estado:

- 1.0.1;
- ESM;
- tests;
- README;
- docs.

`12C.9` sigue pausado hasta respuesta de Berein.

---

# 34. Resumen ejecutivo

```text
✅ Hito 16 Compras
✅ Hito 17 Gestión
✅ Hito 18 Caja base
✅ B3 Selector empleado
✅ Hito 19 Permisos

▶️ Hito 20 Informes
   ✅ 20.1 Contratos/periodos
   ✅ 20.2 Backend Simple
   ✅ 20.3 Simple + impresión
   ✅ 20.4 Backend Detallado
   ✅ 20.5 Detallado + impresión
   ▶️ 20.6 Backend Ventas
   ⏳ 20.7 UI Ventas + impresión
   ⏳ 20.8 Regresión

⏳ Hito 21 TPV Backup
⏳ Hito 22 Sincronización
⏸ TicketBAI 12C.9
```

Fuente de verdad:

```text
main
+
este documento
+
conversación actual
```

---

# 35. Siguiente paso exacto

```text
Hito 20.6 — Backend Informe Ventas por categorías
```

Orden recomendado:

1. revisar `main`;
2. revisar `categoria`, `articulo_categoria`, `articulo`, `linea_venta`;
3. reutilizar `InformePeriodoResolver`;
4. definir repository/domain records;
5. resolver categoría + descendientes;
6. consultar líneas válidas del periodo;
7. deduplicar por `linea_venta.id` en agregados de ancestros;
8. calcular artículos directos;
9. calcular agrupaciones directas por marca;
10. construir árbol de salida;
11. cubrir mensual + `Todos`;
12. tests de multicategoría;
13. batería completa;
14. verde + push antes de 20.7.

La parte crítica es:

```text
un artículo puede mostrarse en varias ramas
```

pero:

```text
una misma línea de venta no puede duplicarse
en el agregado del ancestro común
```

---

# 36. Estado al cerrar v2.82

```text
Hito 19 cerrado.

Hito 20:
20.1 cerrado.
20.2 cerrado.
20.3 cerrado.
20.4 cerrado.
20.5 cerrado.
20.6 es el siguiente paso.

Simple:
funcional e imprimible.

Detallado:
funcional e imprimible.

Ventas:
definido; backend/UI pendientes.

Hito 21:
TPV Backup basado en .otpv.

Hito 22:
sincronización tienda online.

TicketBAI 12C.9:
pausado.
```

La siguiente conversación puede comenzar directamente con:

```text
Continuamos con Hito 20.6 — backend del Informe Ventas por categorías.
```
