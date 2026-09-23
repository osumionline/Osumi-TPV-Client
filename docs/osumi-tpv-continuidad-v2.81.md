# Osumi TPV Client — Documento de continuidad v2.81

**Fecha:** 23 de septiembre de 2026  
**Proyecto:** Osumi TPV Client  
**Repositorio principal:** `https://github.com/osumionline/Osumi-TPV-Client`

Este documento actualiza y sustituye como referencia de continuidad a `docs/osumi-tpv-continuidad-v2.80.md`.

Su objetivo es permitir retomar el desarrollo sin perder decisiones funcionales, arquitectura, convenciones, estado real del código ni el siguiente paso exacto.

---

# 1. Forma de trabajo acordada

El desarrollo se realiza de forma incremental y controlada.

## Unidad de trabajo

Cada respuesta de desarrollo debe contener una **unidad pequeña, coherente, autocontenida y verificable**.

Esto **no significa un archivo por mensaje**.

Regla práctica:

- si una unidad funcional afecta a 3–5 archivos estrechamente relacionados y el cambio sigue siendo claro, se pueden modificar juntos;
- si el bloque empieza a mezclar responsabilidades, a crecer demasiado o aumenta el riesgo de omisiones, dividirlo;
- evitar tanto los bloques masivos de decenas de archivos como la fragmentación artificial de un archivo por respuesta.

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

Aplica también a:

- métodos públicos;
- métodos privados;
- métodos protegidos;
- métodos declarados en interfaces.

No limitar esta regla a APIs públicas.

## Convención de exports

Regla expresa del usuario:

```text
1 único símbolo exportado por archivo
→ export default

2 o más símbolos exportados por archivo
→ solo exports nominales
→ sin export default
```

No mezclar `export default` con exports nominales cuando un archivo exporta más de un símbolo.

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
- No crear infraestructura de test desproporcionada si una capa inferior ya cubre la autorización o lógica crítica.

## Base de datos

El proyecto sigue antes de la primera versión estable:

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

Repositorios disponibles para estudiar la sincronización futura:

- Panel Angular: `https://github.com/igorosabel/indomable-admin`
- Backend: `https://github.com/igorosabel/indomable-api`
- Frontend: `https://github.com/igorosabel/indomable-frontend`

## Regla de acceso

Todos estos repositorios deben tratarse desde ChatGPT en **modo estrictamente de solo lectura**.

No crear:

- commits;
- ramas;
- PRs;
- issues;
- comentarios;
- modificaciones remotas.

---

# 3. Estado general

## Cerrado

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
   ✅ eliminado antiguo flag `empleados`
   ✅ selector integrado por venta
   ✅ nueva venta con 1 empleado → asignación automática
   ✅ nueva venta con 2+ empleados → empleado pendiente
   ✅ reservas con la misma regla

✅ 18 Caja — alcance original
   ✅ Histórico de ventas
   ✅ Salidas caja
   ✅ Cerrar caja
   ✅ cierre transaccional
   ✅ compatibilidad legacy
   ✅ recuento físico
   ✅ tipos de pago
   ✅ regresión final

✅ 19 Simplificación y aplicación definitiva de permisos
   ✅ 19.1 catálogo string + schema + contratos + importador
   ✅ 19.2 Ventas
   ✅ 19.3 Gestión
   ✅ 19.4 regresión final
```

## Siguiente hito

```text
▶️ 20 — Caja: Informes
```

La definición funcional queda cerrada en este documento.

## Hitos posteriores

```text
⏳ 21 — TPV Backup
⏳ 22 — Sincronización con tienda online
⏸ TicketBAI 12C.9 — pendiente de Berein
```

---

# 4. Punto exacto de continuidad

Último commit confirmado en `main` al cerrar Hito 19:

```text
149d4a271b3ca8fae85f8f719f03260e33b1dfb6
Terminado Permisos 19.4
```

Commits inmediatamente anteriores:

```text
72162b8038802fd47786f0d49f3030c7929ef98a
Terminado Permisos 19.3

c95137f7f8692ba8d12e4ee71d094a55eea554cd
Terminado Permisos 19.2

a2346326a8fade42c5b53391647288d71222fdce
Terminado Permisos 19.1f
```

El usuario confirmó después de 19.4:

```text
npm test               ✅
npm run build          ✅
npm run test:electron  ✅
npm run build:electron ✅
npm run lint           ✅
```

y subió los cambios a `main`.

---

# 5. Ventas / empleado — regla definitiva

La configuración antigua `empleados` ha desaparecido.

Regla:

```text
0 empleados
→ no se puede iniciar una venta

1 empleado
→ la venta nace con ese empleado

2+ empleados
→ la venta nace con empleado = null
→ selector embebido dentro de esa venta
```

No existe modal global bloqueante.

Una venta sin empleado puede quedar pendiente mientras el usuario navega por otros apartados.

Cuando se asigna empleado, la pestaña adopta su color.

---

# 6. Permisos — estado definitivo

Catálogo único:

```text
ventas.modificar_importes

gestion.ajustes
gestion.tipos_pago
gestion.empleados
gestion.copias_seguridad
```

## Política

```text
Ventas
→ usa el empleado asignado a la propia venta

Gestión
→ login obligatorio
→ usa el empleado autenticado en GestionSessionService

admin = true
→ bypass completo

Resto de la aplicación
→ sin permisos
```

No introducir permisos en:

- Marcas;
- Proveedores;
- Artículos;
- Clientes;
- Compras;
- Caja;
- navegación general.

## Ventas

`ventas.modificar_importes` protege:

- importe manual;
- retirada de importe manual;
- retirada de descuento promocional;
- descuento porcentual manual;
- retirada del descuento porcentual manual;
- descuento directo fijo;
- retirada del descuento directo.

No protege `alternarRegalo()`.

La capa de UI evita operaciones no autorizadas y `VentasService` vuelve a comprobarlo como defensa en profundidad.

## Gestión

```text
gestion.ajustes
→ Ajustes

gestion.tipos_pago
→ Tipos de pago

gestion.empleados
→ gestión completa de empleados

gestion.copias_seguridad
→ Copias de seguridad
```

Las rutas están protegidas por `gestionPermissionGuard`.

## Legacy

Mapeo definitivo:

```text
1  → ventas.modificar_importes
18 → gestion.ajustes
19 → gestion.tipos_pago
20 → gestion.empleados
25 → gestion.copias_seguridad
```

Todo lo demás se descarta.

Especialmente:

```text
21–24
→ no conceden nada
```

No existe concesión automática del permiso 25.

Si una importación contiene un único empleado activo:

```text
→ ese empleado se convierte en ADMIN
```

---

# 7. Caja — estado previo a Hito 20

Caja contiene:

```text
1. Histórico de ventas
2. Salidas caja
3. Cerrar caja
4. Informes
```

Los tres primeros apartados están terminados.

`Informes` sigue actualmente como placeholder y se completa en Hito 20.

El backend de Caja existente ya soporta:

- pagos mixtos;
- devoluciones;
- tipos de pago con `afectaCaja`;
- ventas legacy de total 0;
- descuentos;
- cajas importadas;
- cierre transaccional;
- recuento físico;
- reconciliación de `caja_tipo`.

Los informes no deben alterar esa lógica de cierre.

---

# 8. Hito 20 — Caja: Informes

Objetivo:

> Completar el cuarto apartado de Caja con tres informes consultables e imprimibles: Simple, Detallado y Ventas.

El comportamiento se ha contrastado con:

- TPV antiguo Angular;
- `InformesService` del TPV antiguo;
- `TPV-API`;
- esquema SQLite actual del Client;
- capturas reales aportadas por el usuario.

La especificación de este apartado queda cerrada a continuación.

---

# 9. Selector de informes

Al entrar en:

```text
Caja → Informes
```

se muestran inicialmente tres combos.

## Tipo

Opciones:

```text
Simple
Detallado
Ventas
```

## Mes

Opciones:

```text
Todos
Enero
Febrero
...
Diciembre
```

`Todos` representa el año completo seleccionado.

## Año

Mostrar:

```text
año actual
+
4 años anteriores
```

Total:

```text
5 años
```

Ejemplo en 2026:

```text
2026
2025
2024
2023
2022
```

## Categoría

Solo aparece cuando:

```text
Tipo = Ventas
```

Debe mostrar el árbol de categorías de forma legible, manteniendo indentación por profundidad.

La categoría elegida incluye:

```text
categoría seleccionada
+
todos sus descendientes
```

## Generar

El informe se muestra en una vista dedicada preparada también para impresión.

---

# 10. Periodos y comparativas

## Mes concreto

Periodo principal:

```text
mes + año seleccionados
```

Periodo comparable anterior:

```text
mes inmediatamente anterior
```

Caso enero:

```text
enero 2026
→ diciembre 2025
```

## Todos

Periodo principal:

```text
1 enero – 31 diciembre del año seleccionado
```

Periodo comparable:

```text
año natural anterior completo
```

Ejemplo:

```text
Todos / 2026
→ comparar con Todos / 2025
```

---

# 11. Informe Simple

El informe Simple resume ventas por tiempo y tipos de pago.

Columnas:

```text
Fecha
Tickets
[una columna por tipo de pago]
Total
Suma
```

Las columnas de tipos de pago se generan dinámicamente a partir de los tipos relevantes del periodo.

Usar el orden definido por el sistema de tipos de pago.

`Efectivo` conserva su posición estructural.

## Mes concreto

Una línea por cada día natural del mes.

Ejemplo:

```text
1 Jueves
2 Viernes
3 Sábado
...
```

Se muestran también días sin ventas.

### Tickets

Rango de tickets del día:

```text
9486 - 9500
```

Si no existen ventas:

```text
----
```

### Tipos de pago

Cada columna suma los importes realmente registrados en:

```text
venta_pago
```

Esto permite representar correctamente:

- Efectivo;
- VISA;
- Bizum;
- otros tipos;
- pagos mixtos dentro de una misma venta.

### Total

Suma de todas las ventas del día.

### Suma

Acumulado progresivo.

Ejemplo:

```text
día 1 = 10 €
Suma = 10 €

día 2 = 15 €
Suma = 25 €
```

Los días sin ventas mantienen el acumulado anterior.

## Mes = Todos

Cuando se selecciona:

```text
Todos
```

el informe deja de mostrar una línea por día y muestra:

```text
una línea por mes
```

Es decir, 12 líneas:

```text
Enero
Febrero
...
Diciembre
```

Cada mes contiene:

- rango de tickets;
- importe por tipo de pago;
- total del mes;
- acumulado anual hasta ese mes.

Los meses sin ventas muestran guiones en los datos no aplicables y mantienen el acumulado anterior.

## Footer

La última línea es de totales.

Debe mostrar:

- `TOTAL`;
- primer ticket del periodo;
- último ticket del periodo;
- total de cada tipo de pago;
- total general;
- acumulado final.

Regla:

```text
Total final = Suma final
```

---

# 12. Informe Detallado

El informe Detallado se divide en:

```text
1. Ventas
2. Marcas
3. Artículos
```

---

# 13. Detallado — bloque Ventas

Dos columnas:

```text
Ventas
Beneficio medio
```

## Ventas

Representa:

```text
número de ventas / tickets
```

No es un importe.

Se compara con el periodo anterior correspondiente.

Ejemplo:

```text
234
↓ (-41)
```

Estados:

```text
↑ más ventas
↓ menos ventas
= mismo número
```

La diferencia se muestra siempre.

## Beneficio medio

En la nueva versión significa **margen global ponderado del periodo**.

Fórmula:

```text
beneficio total
─────────────── × 100
 ventas PVP
```

Donde, para líneas de artículo:

```text
ventas PVP
= Σ (PVP histórico × unidades)

beneficio total
= Σ ((PVP histórico - PUC histórico) × unidades)
```

Se utilizan los snapshots económicos de `linea_venta`.

Comparativa:

```text
margen actual - margen del periodo anterior
```

La diferencia son **puntos porcentuales**.

Ejemplo:

```text
31,00 %
↑ (+3,50 p.p.)
```

Mostrar siempre la diferencia.

Estados:

```text
↑ diferencia > 0
↓ diferencia < 0
= diferencia = 0
```

Si no existe periodo comparable útil, mostrar estado neutro.

---

# 14. Detallado — Marcas

Se muestran **todas las marcas**, también las que no tengan ventas en el periodo.

Columnas:

```text
Marca
Total ventas PVP
Total beneficio
% margen beneficio
Incremento
% ventas
```

## Total ventas PVP

```text
Σ (PVP histórico × unidades)
```

## Total beneficio

```text
Σ ((PVP histórico - PUC histórico) × unidades)
```

## % margen beneficio

```text
beneficio
────────── × 100
ventas PVP
```

## Incremento

Mantener la semántica legacy:

```text
margen actual - margen del periodo anterior
```

No representa incremento de facturación.

Unidad:

```text
puntos porcentuales
```

Ejemplo:

```text
↑ (+2,40 p.p.)
↓ (-1,35 p.p.)
= 0,00 p.p.
```

El valor se muestra siempre; no solo al hacer hover.

## % ventas

Porcentaje de ventas PVP de la marca respecto al total PVP de las marcas del periodo:

```text
ventas PVP marca
──────────────── × 100
 ventas PVP total
```

## Footer

Mostrar:

- total ventas PVP;
- total beneficio;
- margen global ponderado.

No utilizar la media aritmética simple de los márgenes de las marcas.

---

# 15. Detallado — Artículos

Mostrar los:

```text
50 artículos
```

con mayor:

```text
Total ventas PVP
```

del periodo.

Columnas:

```text
Marca
Nombre
Total unidades vendidas
Total ventas PVP
Total beneficio
Incremento
% ventas
```

## Total unidades

Suma firmada de unidades vendidas.

Las devoluciones se integran naturalmente mediante sus unidades/importes históricos.

## Total ventas PVP

```text
Σ (PVP histórico × unidades)
```

## Total beneficio

```text
Σ ((PVP histórico - PUC histórico) × unidades)
```

## Incremento

Mantener la semántica legacy:

```text
margen actual del artículo
-
margen del artículo en el periodo anterior
```

Unidad:

```text
puntos porcentuales
```

Mostrar siempre:

```text
↑ (+X,XX p.p.)
↓ (-X,XX p.p.)
= 0,00 p.p.
```

## % ventas

Mantener exactamente la semántica legacy.

No es porcentaje de facturación.

Fórmula:

```text
número de tickets distintos
en los que aparece el artículo
────────────────────────────── × 100
número total de tickets
```

Si un artículo aparece varias veces dentro del mismo ticket:

```text
ese ticket cuenta una sola vez
```

---

# 16. Informe Ventas por categorías

Este informe analiza las ventas utilizando el árbol actual de categorías.

Filtro adicional:

```text
Categoría
```

Periodo:

```text
mes concreto
o
Todos / año completo
```

La categoría seleccionada incluye todos sus descendientes.

---

# 17. Ventas — estructura del árbol

La tabla muestra:

```text
Concepto
Margen
Unidades
Importe
```

Jerarquía visual:

```text
Categoría
  Subcategoría
    Subcategoría
      Marca + Artículo
```

La indentación debe reflejar la profundidad.

Las categorías aparecen expandidas inicialmente.

El usuario puede colapsar/expandir ramas en pantalla.

Las subcategorías sin ventas pueden omitirse.

Si no existe ninguna venta en la rama seleccionada, mostrar un estado vacío claro.

---

# 18. Ventas — datos de artículos

Para cada artículo:

```text
Marca
Nombre
Margen
Unidades
Importe
```

## Importe

Mantener la semántica del informe legacy:

```text
Σ linea_venta.importe_micros
```

Es decir, el importe final histórico de las líneas.

## Unidades

```text
Σ linea_venta.unidades
```

## Margen

Utilizar margen agregado ponderado, no la media simple del legacy.

Base:

```text
PVP agregado
= Σ (PVP histórico × unidades)

beneficio agregado
= Σ ((PVP histórico - PUC histórico) × unidades)

margen
= beneficio agregado / PVP agregado × 100
```

Si el denominador es cero:

```text
margen = 0
```

---

# 19. Artículos con varias categorías

El nuevo Client permite:

```text
un artículo
→ varias categorías
```

mediante:

```text
articulo_categoria
```

Regla definitiva:

> Un artículo puede aparecer en varias ramas cuando pertenece a varias categorías.

Sin embargo, los agregados superiores no deben duplicar una misma venta/línea.

Para cada categoría:

- determinar la unión de líneas pertenecientes a artículos de esa categoría o sus descendientes;
- deduplicar por línea de venta;
- calcular el agregado una sola vez.

Consecuencia aceptada:

> La suma visual de varias subcategorías puede superar el total del padre si una misma línea pertenece legítimamente a varias ramas, porque el padre la deduplica.

---

# 20. Categorías históricas

No se añadirá snapshot histórico de categoría a `linea_venta`.

Regla:

```text
los informes usan la clasificación actual del artículo
```

Motivo:

> La categoría es una ayuda semántica para identificar y analizar los artículos; utilizar la estructura actual resulta más comprensible para el usuario.

Por tanto, si un artículo cambia de categoría:

```text
un informe antiguo puede aparecer bajo su categoría actual
```

Esto es intencionado.

---

# 21. Marca/nombre y datos económicos históricos

Los datos económicos deben salir de los snapshots de `linea_venta`:

```text
puc_micros
pvp_micros
importe_micros
unidades
```

La clasificación por categoría usa la relación actual del artículo.

Para el análisis económico no recalcular precios históricos usando el artículo actual.

---

# 22. Agrupar por marca

El informe Ventas incluye:

```text
[ ] Agrupar por marca
```

Sin marcar:

```text
categorías
→ artículos
```

Marcado:

```text
categorías
→ marcas
```

En modo agrupado:

- no se muestran artículos individuales;
- cada marca agrega los artículos correspondientes a esa categoría concreta;
- se muestran margen ponderado, unidades e importe.

Las categorías y subcategorías siguen formando el árbol principal.

---

# 23. Impresión

Los tres informes deben poder imprimirse.

Cada vista de informe tendrá una acción de impresión.

## Reglas generales

Al imprimir:

- ocultar controles de navegación/acción;
- ocultar botón de imprimir;
- ocultar filtros;
- mantener encabezados y totales;
- evitar cortes innecesarios dentro de una fila;
- usar estilos específicos `@media print`.

## Informe Ventas

Además:

- ocultar `Agrupar por marca`;
- ocultar botones de expandir/colapsar;
- imprimir **todas las ramas abiertas**, independientemente del estado de pantalla.

Regla:

```text
estado colapsado en pantalla
≠
estado impreso
```

La impresión siempre muestra el contenido completo correspondiente al modo seleccionado:

```text
artículos
o
agrupado por marca
```

---

# 24. Fuentes de datos del Hito 20

El Client nuevo debe calcular los informes directamente desde SQLite.

Fuentes principales:

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

## Histórico económico

Usar prioritariamente:

```text
linea_venta.puc_micros
linea_venta.pvp_micros
linea_venta.importe_micros
linea_venta.unidades
```

No usar PUC/PVP actuales del artículo para reconstruir ventas antiguas.

## Ventas activas

Los informes deben trabajar sobre ventas válidas/no eliminadas.

Las devoluciones se incorporan con sus signos históricos.

---

# 25. Hito 20 — plan de implementación

El desarrollo se realizará por unidades funcionales, no por archivo.

## 20.1 — Contratos y modelo de periodo

Definir:

- tipo de informe;
- periodo mensual/anual;
- contratos de salida;
- estructuras compartidas;
- reglas de comparación;
- helpers de rango temporal.

Sin UI compleja todavía.

Tests de:

- enero → diciembre anterior;
- Todos → año anterior;
- años bisiestos;
- límites de periodo.

## 20.2 — Backend Informe Simple

Implementar:

- query diaria para mes concreto;
- query mensual para `Todos`;
- rangos de tickets;
- pagos por tipo;
- pagos mixtos;
- Total;
- Suma acumulada;
- footer/totales;
- IPC/preload/API renderer.

Tests con:

- días sin ventas;
- meses sin ventas;
- pagos mixtos;
- múltiples tipos;
- devoluciones;
- año completo.

## 20.3 — UI Informe Simple + selector general

Implementar en Caja → Informes:

- Tipo;
- Mes + Todos;
- Año;
- Categoría condicional;
- botón Generar.

Crear vista imprimible de Simple.

Validar diseño y densidad.

## 20.4 — Backend Informe Detallado

Implementar conjuntamente:

```text
Ventas
Marcas
Artículos
```

Incluye:

- periodo anterior;
- número de tickets;
- margen global ponderado;
- todas las marcas;
- diferencias de margen en p.p.;
- porcentaje de ventas de marca;
- Top 50 artículos;
- penetración por tickets de artículo.

Tests matemáticos específicos.

## 20.5 — UI Informe Detallado

Implementar:

- bloque Ventas;
- tabla Marcas;
- tabla Artículos;
- flechas ↑ ↓ =;
- diferencias siempre visibles;
- footers;
- ordenación cuando aporte valor;
- impresión.

## 20.6 — Backend Informe Ventas

Implementar:

- categoría elegida;
- descendientes;
- árbol actual;
- artículos multcategoría;
- deduplicación de líneas en agregados;
- importes finales históricos;
- unidades;
- margen ponderado;
- agrupación por marca.

Tests específicos de:

- árbol multinivel;
- artículo en dos categorías;
- no duplicación en padre;
- categorías sin ventas;
- devoluciones;
- `Todos`.

## 20.7 — UI Informe Ventas + impresión

Implementar:

- árbol recursivo;
- indentación;
- expansión/colapso;
- expandido inicial;
- checkbox Agrupar por marca;
- modo artículos;
- modo marcas;
- estilos de impresión;
- impresión forzadamente expandida.

## 20.8 — Regresión final de Informes

Cubrir conjuntamente:

```text
Simple mensual
Simple anual
Detallado mensual
Detallado anual
Ventas mensual
Ventas anual
comparativas
pagos mixtos
devoluciones
multicategoría
marcas sin ventas
Top 50
impresión
```

Ejecutar batería completa y pruebas funcionales.

Solo entonces cerrar Hito 20.

---

# 26. Hito 21 — TPV Backup

El antiguo TPV Backup no debe reutilizarse como diseño definitivo.

Situación actual:

- existe una aplicación web antigua basada en Osumi Framework 8;
- está abandonada;
- el backup histórico estaba orientado a dump MariaDB;
- el nuevo Client usa SQLite + archivos locales;
- el exportador `.otpv` ya existe en `TPV-API` para migración al Client.

Objetivo del nuevo Hito 21:

> Convertir `.otpv` en el artefacto canónico de copia/restauración completa de una instalación Osumi TPV.

Flujo conceptual:

```text
Osumi TPV Client
      ↓
genera .otpv completo
      ↓
TPV Backup
      ↓
custodia / lista / descarga / elimina
      ↓
.otpv
      ↓
Osumi TPV Client
      ↓
restaura instalación completa
```

TPV Backup debe tratar el `.otpv` como unidad de almacenamiento, sin depender de la estructura interna de SQLite.

## Plan preliminar Hito 21

```text
21.1 — especificación definitiva del formato .otpv
21.2 — exportador .otpv dentro del Client
21.3 — importación/restauración completa
21.4 — rediseño y reconstrucción moderna de TPV Backup
21.5 — API de almacenamiento remoto
21.6 — integración Client ↔ TPV Backup
21.7 — seguridad, integridad y retención
21.8 — regresión de recuperación completa
```

Antes de implementar 21.1:

1. estudiar el exportador actual de `TPV-API`;
2. estudiar el TPV Backup OFW8 actual;
3. inventariar todos los datos/ficheros del Client;
4. definir estrategia portable para secretos;
5. acordar stack y arquitectura de la nueva aplicación TPV Backup;
6. cerrar contrato `.otpv`.

No decidir todavía el stack de la nueva aplicación TPV Backup sin estudiar el sistema antiguo y los requisitos actuales.

---

# 27. `.otpv` actual — referencia para Hito 21

El exportador existente de `TPV-API` genera actualmente un paquete con:

- dump MariaDB;
- `app_data.json`;
- logo;
- fotos;
- marcas;
- proveedores;
- iconos de tipos de pago;
- PDFs;
- configuración de plugins necesaria.

Plugins actuales incluidos:

```text
email_smtp
ticketbai
```

Si un plugin no existe:

```text
null
```

El antiguo flag:

```text
empleados
```

ya no forma parte del `.otpv`.

Hito 21 deberá adaptar esta idea a la instalación nativa del Client, no copiar literalmente la estructura antigua.

---

# 28. Hito 22 — Sincronización tienda online

Hito 22 retoma el plan ya definido y documentado.

No rediseñar desde cero sin revisar primero las decisiones existentes.

Orden acordado:

```text
20 Informes
↓
21 TPV Backup
↓
22 Sincronización tienda online
```

---

# 29. Sincronización — arquitectura acordada

La conexión la inicia siempre Osumi TPV Client:

```text
Osumi TPV Client / Electron
        │
        │ HTTPS
        ▼
indomablestore.com / indomable-api
```

No exponer un servidor local del TPV a Internet.

No requerir:

- NAT;
- port forwarding;
- IP pública fija;
- `hosts`;
- Apache local para recibir pedidos.

---

# 30. Sincronización — decisiones ya cerradas

## Pedido

- fecha económica: `Order.payed_at`;
- `id_cliente = NULL`;
- primera versión: solo ventas pagadas;
- cancelaciones/devoluciones/reembolsos fuera del alcance inicial.

## Artículos

Clave compartida:

```text
localizador
```

Snapshot previsto desde la web:

```text
localizador
nombre
marca
iva
```

## PUC

No lo envía la web.

Se resuelve con el artículo local del TPV al importar.

## Tipo de pago

Usar identificador estable:

```text
tipoPagoPublicId
```

No IDs SQLite compartidos.

## Empleado

Empleado estructural futuro:

```text
Tienda online
```

Oculto para uso humano.

## Caja

Venta online:

```text
id_caja = NULL
```

Venta presencial:

```text
id_caja != NULL
```

## Idempotencia

Concepto:

```text
origen = tpv | online
referencia_externa = id pedido online
```

Un reintento no puede crear una venta duplicada.

## Seguridad

- HTTPS;
- secreto compartido;
- `safeStorage`;
- HMAC SHA-256;
- `iat`;
- `exp`;
- propósito/request id cuando se cierre contrato.

## Stock

No copiar snapshots absolutos sin resolver concurrencia.

---

# 31. Hito 22 — plan S1–S10 existente

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

Este plan permanece vigente como base de Hito 22.

---

# 32. TicketBAI

SDK:

```text
@osumi/ticketbaiws
```

Estado:

- 1.0.1;
- ESM;
- tests;
- README;
- documentación en `docs/`.

Bloque:

```text
12C.9
```

sigue pausado hasta respuesta/actualización de Berein.

No intercalar ese trabajo dentro de Hitos 20–22 salvo novedad externa.

---

# 33. Reglas matemáticas consolidadas para Informes

## Ventas PVP

```text
Σ (pvp_micros × unidades)
```

## Beneficio

```text
Σ ((pvp_micros - puc_micros) × unidades)
```

## Margen ponderado

```text
beneficio
────────── × 100
ventas PVP
```

## Diferencia de margen

```text
margen actual - margen anterior
```

Unidad:

```text
puntos porcentuales
```

No porcentaje de crecimiento.

## % ventas Marca

```text
PVP marca / PVP total × 100
```

## % ventas Artículo

```text
tickets distintos con artículo / tickets totales × 100
```

## Importe Informe Ventas

```text
Σ importe_micros
```

Estas definiciones deben centralizarse conceptualmente y tener tests con cifras fáciles de verificar manualmente.

---

# 34. Decisiones del legacy que NO se copian

No reproducir estos defectos históricos:

## Bloque Ventas del Detallado

Legacy:

```text
COUNT de tickets
mostrado como €
```

Nuevo:

```text
COUNT de tickets
mostrado como número
```

## Beneficio medio

Legacy:

```text
euros medios por ticket
mostrados como %
```

Nuevo:

```text
margen global ponderado real
mostrado como %
```

## Incrementos

Legacy ocultaba a veces la cifra hasta hover.

Nuevo:

```text
flecha + diferencia siempre visible
```

## Margen agregado de categorías

Legacy:

```text
media aritmética simple de márgenes
```

Nuevo:

```text
margen ponderado por PVP agregado
```

---

# 35. Resumen ejecutivo

```text
✅ Hito 16 — Compras

✅ Hito 17 — Gestión

✅ Hito 18 — Caja
   Histórico ✅
   Salidas ✅
   Cierre ✅
   Informes → trasladado expresamente a Hito 20

✅ B3 — Selector empleado integrado

✅ Hito 19 — Permisos definitivos

▶️ Hito 20 — Caja: Informes
   20.1 Contratos/periodos
   20.2 Backend Simple
   20.3 UI Simple + selector
   20.4 Backend Detallado
   20.5 UI Detallado
   20.6 Backend Ventas
   20.7 UI Ventas + impresión
   20.8 Regresión

⏳ Hito 21 — TPV Backup
   .otpv completo
   exportación
   restauración
   nueva aplicación TPV Backup
   integración remota

⏳ Hito 22 — Sincronización tienda online
   plan S1–S10 existente

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

# 36. Siguiente paso exacto

El siguiente trabajo de código es:

```text
Hito 20.1 — Contratos y modelo de periodo de Informes
```

Antes de escribir código:

1. revisar otra vez `main`;
2. inventariar arquitectura IPC/repository/service más adecuada para informes;
3. reutilizar patrones existentes de Caja;
4. definir contratos mínimos;
5. implementar una unidad funcional pequeña, posiblemente en varios archivos relacionados;
6. añadir tests de periodo;
7. ejecutar batería completa;
8. esperar verde + push antes de 20.2.

No empezar directamente por la interfaz.

Primero debe quedar estable la semántica temporal y contractual.

---

# 37. Regla final de dirección

Para cualquier módulo heredado:

1. el usuario explica comportamiento antiguo y objetivo nuevo;
2. se contrasta con repositorios;
3. se revisa esquema/código actual;
4. se detectan inconsistencias del legacy;
5. se resuelven dudas;
6. se fijan decisiones;
7. se define plan;
8. se implementa por bloques funcionales pequeños;
9. se valida;
10. solo se continúa después de verde + push.

Estado al cerrar v2.81:

```text
Hito 19 cerrado.
Hito 20 definido funcionalmente.
Hito 20.1 es el siguiente paso.
Hito 21 definido como TPV Backup basado en .otpv.
Hito 22 reservado para sincronización con tienda online.
TicketBAI 12C.9 sigue pausado.
```

La siguiente conversación puede comenzar directamente con:

```text
Continuamos con Hito 20.1 — contratos y modelo de periodo de Informes.
```
