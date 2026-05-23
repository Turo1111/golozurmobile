# Plan y bitácora de pruebas manuales — Estabilización del listado de Sale

## 1. Objetivo

Este documento sirve para ejecutar y registrar la validación manual del cambio **`rfclistsale implementa @docs/RFC-estabilizacion-lista-sale.md`**.

La idea NO es solo “probar un poco”, sino dejar evidencia concreta de si el flujo de listado de ventas quedó estable en los escenarios críticos: scroll, filtro, búsqueda, refresh, realtime y cambio entre modo servidor/local.

## 2. Alcance

Estas pruebas cubren el comportamiento manual de:

- listado server-side de `Sale`
- infinite scroll
- filtro por usuario
- búsqueda
- refresh
- buffer de realtime con CTA
- cambio entre modo servidor y modo local
- comportamiento visible para admin y vendedor
- manejo de errores del listado sin desviar al modo local por accidente

## 3. Fuera de alcance

Queda fuera de esta ronda:

- unificación backend definitiva del endpoint de listado
- pruebas automatizadas
- performance profiling formal
- cambios de impresión/PDF fuera del flujo validado abajo

## 4. Referencias

- `docs/RFC-estabilizacion-lista-sale.md`
- `docs/hallazgos-sale-infinite-scroll.md`
- cambio SDD: `rfclistsale implementa @docs/RFC-estabilizacion-lista-sale.md, en las decisiones aplica lo que consideres mejor`

## 5. Instrucciones de uso

1. Duplicá este documento si querés una corrida por ambiente o por dispositivo.
2. Completá primero la sección **Contexto de ejecución**.
3. Ejecutá cada escenario en orden.
4. En cada caso registrá:
   - qué hiciste
   - qué pasó realmente
   - si coincide o no con lo esperado
   - evidencia disponible
5. Marcá el estado de cada escenario con checkbox.
6. Usá uno de estos estados para cada escenario:
   - `PASS`
   - `FAIL`
   - `N/A`
7. Si un caso falla, NO lo tapes con una nota vaga. Describí exactamente dónde rompe.

## 6. Contexto de ejecución

### 6.1 Datos generales

- Fecha:
- Tester:
- Rama / commit:
- Ambiente backend:
- Plataforma: `Android` / `iOS` / `Expo Go` / `Web`
- Dispositivo:
- Versión del SO:
- Usuario admin utilizado:
- Usuario vendedor utilizado:

### 6.2 Estado inicial esperado

Antes de empezar, confirmar:

- la app abre correctamente
- el módulo `Sale` carga
- existen suficientes ventas server-side para paginar al menos 4 páginas
- existe más de un usuario para poder filtrar
- existe data que permita probar búsqueda
- si se va a probar modo local, hay ventas guardadas en `saleStorage`
- si se va a probar realtime, hay una forma real de generar una venta nueva mientras la pantalla está abierta

### 6.3 Observaciones previas

-
-

-

## 7. Criterios de aprobación

Se considera que la validación quedó bien documentada cuando:

- cada escenario tiene estado explícito
- cada `FAIL` explica el síntoma concreto
- hay evidencia o notas útiles para reproducir
- si se completa el cierre final, resume qué quedó aprobado y qué no

## 8. Escenarios de prueba

---

## Escenario 1 — Scroll base server-side

### Objetivo

Validar que el infinite scroll acumula páginas sin saltos visibles, duplicados ni reemplazos inesperados.

### Precondiciones

- usuario online
- modo servidor activo
- dataset suficiente para al menos 4 páginas

### Pasos

1. Abrir la pantalla `Sale`.
2. Esperar carga inicial.
3. Hacer scroll hasta el final varias veces para cargar al menos 4 páginas.
4. Observar continuidad del listado en cada append.

### Resultado esperado

- la primera carga arranca desde la página 1
- cada página nueva se agrega al final
- no aparecen duplicados
- no se pierden bloques ya visibles
- no hay reorder inesperado

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
No considero necesario agregar evidencia
```

### Estado

- [x] PASS
- [ ] FAIL
- [ ] N/A

### Notas

-

---

## Escenario 2 — Filtro después de haber paginado

### Objetivo

Validar que al cambiar el filtro de usuario después de hacer scroll, la consulta vuelve a `offset=0` y no arranca desde una página vieja.

### Precondiciones

- usuario admin
- modo servidor activo
- haber cargado al menos 3 páginas antes de filtrar

### Pasos

1. Abrir `Sale`.
2. Bajar hasta página 3 o más.
3. Seleccionar un usuario en el filtro.
4. Revisar el primer bloque mostrado.

### Resultado esperado

- el listado filtrado vuelve a empezar desde la primera página del usuario seleccionado
- no aparecen residuos del listado anterior
- no se saltean las primeras ventas del usuario

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text

```

### Estado

- [x] PASS
- [ ] FAIL
- [ ] N/A

### Notas

-

---

## Escenario 3 — Scroll con filtro activo

### Objetivo

Validar que la paginación sigue funcionando correctamente cuando el filtro por usuario ya está aplicado.

### Precondiciones

- usuario admin
- filtro activo
- suficiente data del usuario filtrado para varias páginas

### Pasos

1. Aplicar un filtro de usuario.
2. Esperar la primera página filtrada.
3. Hacer scroll hasta cargar al menos 2 páginas más.

### Resultado esperado

- las páginas del usuario filtrado se appendéan
- la lista NO se reemplaza en cada fetch
- no hay duplicados ni huecos visibles

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
si scrolleo muy rapido no aparece el cargando ventas
```

### Estado

- [x] PASS
- [ ] FAIL
- [ ] N/A

### Notas

-

---

## Escenario 4 — Búsqueda + filtro combinados

### Objetivo

Validar el comportamiento visible cuando conviven búsqueda y filtro por usuario.

### Precondiciones

- usuario admin
- existe término de búsqueda con resultados conocidos
- existe usuario aplicable al filtro

### Pasos

1. Abrir `Sale`.
2. Aplicar filtro por usuario.
3. Ingresar un texto de búsqueda.
4. Revisar resultados.
5. Limpiar búsqueda y volver a aplicar.

### Resultado esperado

- la búsqueda reinicia la consulta desde página 1
- los resultados son coherentes con el usuario filtrado
- no aparecen elementos ajenos al filtro
- no quedan residuos de búsquedas anteriores

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
Retesteado luego de la corrección. La búsqueda combinada con filtro funciona de forma usable en mobile y devuelve resultados coherentes.
```

### Estado

- [x] PASS
- [ ] FAIL
- [ ] N/A

### Notas

-

---

## Escenario 5 — Refresh único

### Objetivo

Confirmar que refresh reconstruye la lista desde `offset=0` mediante una sola ruta lógica.

### Precondiciones

- modo servidor activo
- haber cargado más de una página

### Pasos

1. Abrir `Sale`.
2. Paginar varias páginas.
3. Ejecutar refresh desde la UI.
4. Observar la reconstrucción del listado.

### Resultado esperado

- el listado se reconstruye desde la primera página
- no se ve doble recarga contradictoria
- no aparecen mezclas entre estado previo y nuevo

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
Retesteado luego de la corrección. El refresh funciona por los entry points vigentes con efecto visible, y además quedó incorporado el botón flotante para volver arriba.
```

### Estado

- [x] PASS
- [ ] FAIL
- [ ] N/A

### Notas

-

---

## Escenario 6 — Realtime durante scroll

### Objetivo

Validar que una venta nueva no hace prepend directo ni reordena la lista visible mientras el usuario está paginando.

### Precondiciones

- pantalla `Sale` abierta en modo servidor
- usuario parado al menos en página 2
- posibilidad de generar una venta nueva desde otro actor/dispositivo

### Pasos

1. Abrir `Sale`.
2. Llegar a página 2 o más.
3. Generar una nueva venta mientras la pantalla sigue abierta.
4. Observar la lista visible.

### Resultado esperado

- la lista actual NO cambia de orden automáticamente
- NO aparece prepend inmediato arriba
- se informa la novedad mediante CTA o indicador equivalente

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
No se validó el comportamiento realtime de este caso. Solo se comprobó que al ir a la pantalla de nueva venta y volver atrás, la lista quedó en la página donde estaba. Eso no alcanza para confirmar prepend/reorder/CTA.
```

### Estado

- [ ] PASS
- [ ] FAIL
- [x] N/A

### Notas

- Rehacer este escenario solo si podemos generar una venta nueva desde otro actor/dispositivo mientras la lista sigue abierta.

---

## Escenario 7 — Aplicación de novedades realtime mediante CTA

### Objetivo

Validar que al aceptar la novedad realtime se refresca la consulta actual sin romper el contexto activo.

### Precondiciones

- CTA de novedades visible
- pantalla en modo servidor

### Pasos

1. Generar o esperar una novedad realtime.
2. Confirmar que aparece el CTA.
3. Presionar el CTA de actualización.
4. Revisar el listado resultante.

### Resultado esperado

- el contador/CTA se consume
- se refresca la consulta actual
- la lista queda coherente con búsqueda/filtro vigentes

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
No se realizara este test
```

### Estado

- [ ] PASS
- [ ] FAIL
- [x] N/A

### Notas

- No se ejecutó en esta corrida rápida.

---

## Escenario 8 — Cambio entre modo servidor y modo local

### Objetivo

Confirmar que los datasets no se mezclan y que volver al modo servidor reconstruye la consulta limpia.

### Precondiciones

- existen ventas locales en `saleStorage`
- existe data server-side disponible

### Pasos

1. Abrir `Sale` en modo servidor.
2. Cambiar a modo local.
3. Confirmar que se muestran ventas locales.
4. Volver a modo servidor.
5. Revisar el listado resultante.

### Resultado esperado

- el modo local muestra solo data local
- el modo servidor vuelve a cargar desde `offset=0`
- no se mezclan ventas locales con ventas server

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
 no se realizara
```

### Estado

- [ ] PASS
- [ ] FAIL
- [x] N/A

### Notas

- No se ejecutó en esta corrida rápida.

---

## Escenario 9 — Error de listado sin desvío indebido al modo local

### Objetivo

Validar la corrección del warning detectado en verify: un error server-side no debe ocultar la lista ya cargada ni mandar al usuario al flujo local si `showLocal` es falso.

### Precondiciones

- pantalla `Sale` con data server ya cargada
- alguna manera de inducir fallo de red, timeout o error backend durante refresh/paginación/búsqueda

### Pasos

1. Abrir `Sale` y cargar datos server.
2. Forzar un error en refresh, paginación o búsqueda.
3. Observar qué queda visible en pantalla.

### Resultado esperado

- si ya había datos server, esos datos permanecen visibles
- la UI muestra error inline o estado de error coherente
- la pantalla NO cambia sola al dataset local por ese error

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
No se realizará en esta corrida porque requiere inducir un error de red/backend de forma controlada sin perder demasiado tiempo de ejecución manual.
```

### Estado

- [ ] PASS
- [ ] FAIL
- [x] N/A

### Notas

- Recomendado solo si hace falta revalidar específicamente el fix del fallback a modo local.

---

## Escenario 10 — Diferencias entre rol admin y rol vendedor

### Objetivo

Confirmar que el flujo se comporta bien en ambos perfiles y que el filtro admin no contamina el flujo del vendedor.

### Precondiciones

- una cuenta admin
- una cuenta vendedor

### Pasos

1. Ejecutar los escenarios relevantes con usuario admin.
2. Repetir carga base, refresh y realtime con usuario vendedor.
3. Comparar diferencias esperadas.

### Resultado esperado

- admin puede usar filtro por usuario
- vendedor no rompe el flujo por ausencia de filtro admin
- ambos perfiles mantienen scroll, refresh y realtime coherentes

### Resultado observado

-

### Evidencia

- screenshots:
- video:
- logs/notas:

### Salida observada

```text
no se realizara
```

### Estado

- [ ] PASS
- [ ] FAIL
- [x] N/A

### Notas

- Requiere cambiar de usuario/rol y no se ejecutó en esta corrida rápida.

## 9. Registro de defectos y observaciones (opcional)

### Defecto 1

- Título: Sin defectos activos en los escenarios ejecutados de esta corrida final
- Escenario relacionado: Escenarios 1 al 5
- Severidad: N/A
- Pasos para reproducir: N/A
- Resultado esperado: N/A
- Resultado observado: Luego del re-test, los escenarios ejecutados quedaron en `PASS`.
- Evidencia: Estados finales de escenarios 1 a 5
- Observaciones: Los escenarios 6 a 10 quedaron `N/A` por alcance/entorno de prueba, no por falla funcional confirmada.

### Defecto 2

- Título: N/A
- Escenario relacionado: N/A
- Severidad: N/A
- Pasos para reproducir: N/A
- Resultado esperado: N/A
- Resultado observado: N/A
- Evidencia: N/A
- Observaciones: N/A

### Observación 1

- Título: El loading de paginación no siempre se percibe al scrollear muy rápido
- Escenario relacionado: Escenario 3 — Scroll con filtro activo
- Severidad: Baja
- Pasos para reproducir: Aplicar filtro y hacer scroll rápido durante la carga de nuevas páginas.
- Resultado esperado: Que el feedback visual de carga sea claro cuando entra paginación.
- Resultado observado: Si se scrollea muy rápido no siempre aparece visible el estado de “cargando ventas”.
- Evidencia: Salida observada del escenario 3
- Observaciones: No bloquea el flujo principal, pero conviene revisarlo si se ajusta la UX del listado.

## 10. Cierre de la ejecución (opcional)

### Resumen final

- Escenarios ejecutados: 5
- Escenarios `PASS`: 1, 2, 3, 4, 5
- Escenarios `FAIL`: ninguno
- Escenarios `N/A`: 6, 7, 8, 9, 10

### Conclusión del tester

- Los escenarios ejecutados en esta corrida final quedaron funcionando correctamente. El cambio se considera estable para los casos probados manualmente.

### Recomendación final

Elegir una:

- `Aprobado para continuar`
- `Aprobado con observaciones`
- `No aprobado`

Selección actual:

- `Aprobado con observaciones`

### Próximos pasos sugeridos

- Si hace falta más cobertura, ejecutar en otra pasada los escenarios 6 a 10 según disponibilidad de entorno, roles y condiciones de red.
- Mantener como observación que los casos `N/A` no quedaron validados en esta corrida final.
- El RFC puede cerrarse con observaciones sobre cobertura manual parcial.
