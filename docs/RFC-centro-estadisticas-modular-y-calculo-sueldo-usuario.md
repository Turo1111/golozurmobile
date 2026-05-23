# RFC — Centro de estadísticas modular y cálculo de sueldo por usuario

## Estado del documento

- **Tipo**: RFC técnico-funcional
- **Estado**: propuesta inicial
- **Fecha**: 2026-04-20
- **Basado en**:
  - `docs/RFC-estadisticas-ventas-por-usuario.md`
  - `src/screens/SalesStats.js`
  - `src/screens/Users.js`
  - `src/screens/Home.js`
  - `src/navigation/NavigationStack.js`
  - `src/hooks/useSalesStats.js`
  - `src/services/salesStatsService.js`
- **Ámbito**: frontend obligatorio, backend por etapas
- **Reemplaza parcialmente**:
  - el enfoque visual y de interacción del RFC anterior de estadísticas de ventas por usuario

> Este RFC redefine la experiencia de estadísticas para evitar que todo quede concentrado en una sola pantalla. La nueva dirección es un **centro de estadísticas** con accesos a módulos separados, priorizando primero **estadísticas de usuarios**. Además, el porcentaje deja de ser una herramienta global de la pantalla y pasa a formar parte del flujo de **calcular sueldo** de un usuario dentro de un rango de fechas.

---

## 1. Resumen ejecutivo

La implementación actual de estadísticas concentra demasiada información en una sola ventana. Eso complica la lectura, mezcla contextos y hace que acciones distintas convivan en el mismo bloque visual.

### Decisiones principales de este RFC

1. Crear una nueva pantalla principal llamada **Estadísticas**.
2. Esa pantalla mostrará métricas básicas y actuará como **hub** de acceso a módulos:
   - estadísticas de usuarios
   - estadísticas de ventas
   - estadísticas de productos
   - otros módulos futuros
3. El primer módulo completo a desarrollar será **estadísticas de usuarios**.
4. En estadísticas de usuarios, el contenido inicial debe parecerse visualmente al listado actual de `Users.js`.
5. Al tocar un usuario, se abrirá un **modal / bottom sheet** con acciones.
6. Las acciones mínimas serán:
   - `Más detalles`
   - `Calcular sueldo`
7. El porcentaje seguirá ingresándose **manual y temporalmente**, con valor por defecto en **5%**.
8. El cálculo de sueldo se hará sobre el **total vendido por ese usuario en un rango de fechas elegido**, aplicando:
   - `total vendido × porcentaje / 100`
9. El porcentaje **no se persiste**.
10. El módulo de estadísticas debe mantener la continuidad visual del proyecto y seguir usando nombres técnicos en inglés.

---

## 2. Problema

### 2.1 Problema de UX

La pantalla única de estadísticas resuelve demasiado en el mismo lugar:

- resumen global
- ranking
- detalle por usuario
- filtros
- cálculo porcentual

Eso genera una vista pesada, difícil de escanear y poco flexible para crecer.

### 2.2 Problema conceptual

El porcentaje actual quedó demasiado asociado a una vista global, cuando en realidad el negocio ahora lo quiere usar como una acción puntual de:

- elegir usuario
- elegir rango
- calcular sueldo

Eso cambia el modelo mental. Ya no es “porcentaje de la pantalla”, sino **porcentaje aplicado al cálculo de sueldo de un usuario**.

### 2.3 Evidencia técnica verificada

1. `src/screens/SalesStats.js` hoy concentra en una sola pantalla:
   - filtros
   - porcentaje
   - cards resumen
   - chart
   - detalle por usuario
2. `src/screens/Users.js` ya tiene una representación visual útil de usuarios con:
   - nombre
   - rol
   - cantidad de ventas
   - ganancia
3. `src/screens/Home.js` ya usa un patrón de navegación por tarjetas tipo módulo.
4. `src/navigation/NavigationStack.js` declara las rutas manualmente.
5. El proyecto ya tiene base mock-first de estadísticas, pero la experiencia actual no escala bien si después se agregan productos, ventas y otros dominios en la misma vista.

---

## 3. Objetivos

### 3.1 Objetivos funcionales

1. Tener una pantalla principal de estadísticas con métricas básicas.
2. Desde esa pantalla, poder entrar a módulos separados:
   - usuarios
   - ventas
   - productos
   - otros futuros
3. Implementar primero el módulo de **estadísticas de usuarios**.
4. Mostrar en estadísticas de usuarios una lista visualmente alineada con `Users.js`.
5. Permitir tocar un usuario y abrir un bottom sheet con acciones.
6. Permitir calcular sueldo de un usuario dentro de un rango de fechas.
7. Permitir ingresar el porcentaje manualmente con default en **5%**.
8. Mantener la claridad visual y reducir la sobrecarga de una pantalla única.

### 3.2 Objetivos técnicos

1. Separar estadísticas por dominio para que cada módulo crezca de forma independiente.
2. Reutilizar lo implementado del slice mock-first actual en lugar de descartarlo.
3. Mantener una costura clara entre:
   - hub de estadísticas
   - estadísticas de usuarios
   - cálculo de sueldo
   - futura integración backend
4. Evitar mezclar analytics con flujos operativos de ventas o usuarios.

---

## 4. No objetivos

Este RFC **no** busca en esta fase:

- definir por completo las estadísticas de productos
- definir por completo las estadísticas de ventas
- rehacer el módulo `Users`
- persistir el porcentaje de sueldo
- liquidar sueldos reales o generar recibos
- reemplazar backend real por lógica client-side permanente
- cerrar todavía el modelo completo de permisos por submódulo estadístico

---

## 5. Alcance funcional

## 5.1 Nueva pantalla principal: Estadísticas

La pantalla `Statistics` será el entrypoint del módulo.

### Debe mostrar

1. resumen básico del negocio
2. tarjetas de acceso a módulos
3. continuidad visual con `Home`

### Módulos visibles

- Usuarios
- Ventas
- Productos
- otros futuros

### Importante

En esta fase, el módulo completo obligatorio es **Usuarios**.
Los demás pueden existir como placeholders o pantallas mínimas hasta que tengan su propio RFC o desarrollo detallado.

---

## 5.2 Módulo de estadísticas de usuarios

La pantalla `UserStats` será el primer módulo funcional completo.

### Vista inicial

Debe mostrar una lista/resumen de usuarios con una presentación cercana a `Users.js`, incluyendo al menos:

- nombre del usuario
- rol
- cantidad de ventas
- total vendido o ganancia visible según disponibilidad
- indicador visual consistente con el lenguaje actual

### Interacción principal

Al tocar un usuario se abre un **bottom sheet** con acciones.

---

## 5.3 Bottom sheet de acciones por usuario

Acciones mínimas:

1. **Más detalles**
2. **Calcular sueldo**

### Más detalles

Debe llevar a una vista detallada del usuario dentro del módulo de estadísticas, donde se puedan mostrar métricas ampliadas del período o del historial definido para ese módulo.

### Calcular sueldo

Debe abrir un flujo donde el usuario administrador pueda:

1. elegir rango de fechas
2. ingresar o ajustar el porcentaje
3. calcular el sueldo estimado

---

## 5.4 Flujo de cálculo de sueldo

### Inputs mínimos

- usuario seleccionado
- fecha desde
- fecha hasta
- porcentaje manual

### Valor por defecto

- `5%`

### Regla de cálculo

**Sueldo calculado = total vendido por el usuario en el rango elegido × (porcentaje / 100)**

### Reglas

- el porcentaje se puede editar manualmente
- el porcentaje no se guarda
- el cálculo no modifica ventas históricas
- el cálculo debe dejar claro que es una **estimación calculada en pantalla**

---

## 6. Reglas de negocio

## 6.1 Regla de modularidad

Las estadísticas no deben crecer dentro de una sola pantalla.
Cada dominio importante debe tener su propio espacio visual y lógico.

## 6.2 Regla del porcentaje

- default: `5`
- editable manualmente
- no persistido
- aplicado solo al cálculo actual

## 6.3 Regla del rango de fechas

Para calcular sueldo, el sistema debe permitir elegir un rango `desde/hasta`.

### Mínimo requerido

- fecha desde
- fecha hasta
- validación de rango válido

## 6.4 Regla de ventas consideradas

Por defecto, el cálculo debe trabajar con ventas válidas del período consultado y excluir canceladas, manteniendo consistencia con la lógica estadística general.

## 6.5 Regla de origen de datos

El cálculo no debe reconstruirse paginando listados operativos.
Debe apoyarse en una fuente agregada o en una costura mock/api equivalente.

## 6.6 Regla de conexión

Mientras el reporte siga siendo global del negocio, el módulo continuará siendo **online-first / online-only**.

---

## 7. Propuesta de UX

## 7.1 Pantalla principal de estadísticas

### Estructura

1. encabezado
2. tarjetas resumen básicas
3. grilla de módulos estadísticos

### Ejemplo de módulos

- Estadísticas de usuarios
- Estadísticas de ventas
- Estadísticas de productos

Debe sentirse como un “Home de estadísticas”, no como una pantalla técnica cargada.

---

## 7.2 Pantalla de estadísticas de usuarios

### Estructura inicial

1. encabezado
2. filtros generales si aplica
3. lista de usuarios
4. bottom sheet por selección

### Comportamiento

- tap en usuario => abre actions sheet
- no sobrecargar la vista inicial con chart + detalle + cálculo todo junto

---

## 7.3 Bottom sheet

### Opciones

- `Más detalles`
- `Calcular sueldo`

### Objetivo

Separar acciones operativas de navegación y cálculo sin ensuciar la lista principal.

---

## 7.4 Flujo UX de cálculo de sueldo

1. abrir estadísticas
2. entrar a estadísticas de usuarios
3. tocar usuario
4. abrir bottom sheet
5. elegir `Calcular sueldo`
6. seleccionar fechas
7. revisar/editar porcentaje (default 5%)
8. ver total vendido del período
9. ver sueldo calculado

---

## 8. Arquitectura propuesta

## 8.1 Nuevas piezas frontend

### Pantallas

- `src/screens/StatsHome.js`
- `src/screens/UserStats.js`
- `src/screens/UserStatsDetails.js` _(recomendado)_
- `src/screens/SalesStats.js` _(futuro módulo de ventas)_
- `src/screens/ProductStats.js` _(futuro módulo de productos)_

### Componentes

- `src/components/stats/StatsModuleCard.js`
- `src/components/stats/UserStatsActionSheet.js`
- `src/components/stats/UserSalarySheet.js`

### Hooks

- `src/hooks/useStatsOverview.js`
- `src/hooks/useUserStats.js`
- `src/hooks/useUserSalaryCalculator.js`

### Servicios

- `src/services/statsOverviewService.js`
- `src/services/userStatsService.js`

---

## 8.2 Estrategia de migración desde lo ya implementado

La implementación actual en `src/screens/SalesStats.js` no se tira.
Se debe **descomponer**.

### Recomendación

1. mover el foco actual de ventas por usuario a `UserStats`
2. crear una nueva pantalla hub `StatsHome`
3. reutilizar:
   - mocks
   - helpers
   - service seam
   - reglas de rango/estado
4. separar el flujo de porcentaje hacia `UserSalarySheet`

---

## 8.3 Estados de pantalla

### StatsHome

- `loading`
- `ready`
- `error`
- `offlineBlocked`

### UserStats

- `loading`
- `ready`
- `empty`
- `error`
- `refreshing`
- `offlineBlocked`

### UserSalarySheet

- `idle`
- `validating`
- `calculating`
- `ready`
- `error`

---

## 8.4 Navegación propuesta

### Entrada principal

- `Home -> Statistics`

### Subrutas internas

- `Statistics -> UserStats`
- `Statistics -> SalesStats`
- `Statistics -> ProductStats`

### Detalle

- `UserStats -> UserStatsDetails` _(si aplica)_

---

## 9. Contrato de datos propuesto

## 9.1 Overview general

El hub de estadísticas debería consumir un resumen básico agregado.

### Ejemplos

- total vendido general
- ventas del día o período actual
- usuarios activos
- productos más vendidos _(futuro)_

## 9.2 UserStats

Debe devolver por usuario al menos:

- `userId`
- `userName`
- `salesCount`
- `totalAmount`
- `averageTicket`
- `calculatedGain` o equivalente visible si aplica
- metadata del período

## 9.3 Salary calculation

El cálculo de sueldo puede usar:

### Opción recomendada

Reutilizar un endpoint agregado de estadísticas por usuario con filtro por:

- `userId`
- `startDate`
- `endDate`

Y hacer el porcentaje en frontend.

---

## 10. Permisos

## 10.1 Estado actual

Hoy existe el concepto de `read_sale_stats`, pero este RFC todavía no exige dividir permisos por submódulo.

## 10.2 Decisión de esta fase

Mantener un permiso general de acceso al centro de estadísticas y resolver el fine-grained access en una fase posterior si el negocio lo necesita.

---

## 11. Mock data y backend

## 11.1 Estrategia

Se mantiene la estrategia **mock-first** donde haga falta para no bloquear UX y navegación.

## 11.2 Backend futuro

Cuando exista backend real, debe sostener el modelo modular sin forzar volver a una pantalla única.

---

## 12. Riesgos

1. **Sobrediseñar el hub** antes de cerrar qué métricas básicas muestra.
2. **Duplicar lógica** entre `Users.js` y `UserStats` si no se reutilizan patrones.
3. **Confundir sueldo con ganancia real** si no se etiqueta bien el cálculo.
4. **Acoplar mal el cálculo al listado** y volver a una pantalla pesada otra vez.
5. **No separar bien el código actual** y terminar con `SalesStats.js` haciendo de todo.

---

## 13. Plan de implementación sugerido

## Fase 1 — Reorganización del módulo

1. crear `StatsHome`
2. mover el entrypoint actual hacia el hub
3. agregar tarjetas de acceso a submódulos
4. mantener el lenguaje visual ya usado en `Home` y screens modernas

## Fase 2 — Estadísticas de usuarios

1. crear `UserStats`
2. reutilizar la base mock/service ya implementada
3. modelar la lista inicial con inspiración visual de `Users.js`
4. agregar selección de usuario + bottom sheet

## Fase 3 — Cálculo de sueldo

1. crear `UserSalarySheet`
2. setear porcentaje default en `5`
3. agregar selección de rango de fechas
4. calcular sueldo en pantalla
5. mostrar resultado claro y no persistido

## Fase 4 — Detalle ampliado

1. definir `UserStatsDetails`
2. mostrar métricas extendidas del usuario
3. preparar costura con backend agregado

## Fase 5 — Módulos futuros

1. ventas
2. productos
3. otras estadísticas

---

## 14. Criterios de aceptación

1. Existe una pantalla principal `Statistics`.
2. La pantalla principal muestra métricas básicas y accesos a submódulos.
3. Existe una pantalla `UserStats`.
4. `UserStats` muestra una lista inicial de usuarios clara y navegable.
5. Tocar un usuario abre un modal / bottom sheet.
6. El bottom sheet muestra:
   - `Más detalles`
   - `Calcular sueldo`
7. El cálculo de sueldo permite elegir fechas.
8. El porcentaje se ingresa manualmente con default `5%`.
9. El sueldo calculado surge de:
   - total vendido del usuario en el rango
   - multiplicado por porcentaje
10. El porcentaje no se persiste.
11. El diseño ya no depende de una sola ventana sobrecargada.
12. La arquitectura queda preparada para módulos de ventas y productos sin volver al layout monolítico anterior.

---

## 15. Definiciones cerradas

1. Debe existir una pantalla principal de estadísticas.
2. Esa pantalla funciona como hub hacia módulos separados.
3. El primer módulo completo será estadísticas de usuarios.
4. El porcentaje de cálculo de sueldo sigue siendo manual.
5. El porcentaje default será `5%`.
6. Las acciones por usuario se mostrarán en modal / bottom sheet.

---

## 16. Conclusión

La evolución correcta del módulo no es seguir cargando una sola pantalla con más bloques, más filtros y más acciones. Eso escala mal visualmente y conceptualmente.

La dirección correcta es un **centro de estadísticas modular**, con un primer módulo fuerte de **estadísticas de usuarios**, donde el cálculo de sueldo sea una acción explícita, contextual y entendible.

El porcentaje deja de ser un elemento global ambiguo y pasa a ser lo que realmente querés que sea: una herramienta puntual para calcular el sueldo estimado de un usuario dentro de un rango de ventas.
