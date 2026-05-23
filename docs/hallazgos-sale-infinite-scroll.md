# Hallazgos — Infinite scroll en `Sale`

## Estado del documento

- **Tipo**: análisis técnico previo a RFC
- **Estado**: draft verificable
- **Fecha**: 2026-04-15
- **Pantalla analizada**: `src/screens/Sale.js`
- **Objetivo**: explicar por qué el infinite scroll de ventas falla en ciertos casos y cómo debería comportarse una versión corregida

> IMPORTANTE: este documento describe la implementación actual verificada en código y muestra el comportamiento corregido **esperado/propuesto**. No implica que esos cambios ya estén implementados.

---

## 1. Resumen ejecutivo

El problema del infinite scroll en la pantalla `Sale` **no parece ser un único bug aislado**. Hay una combinación de decisiones de implementación que hacen que la lista quede inconsistente según el contexto de uso.

Los hallazgos más importantes son:

1. **Cuando hay filtro por usuario, la paginación reemplaza la lista en vez de acumular páginas.**
2. **Al cambiar de usuario no se reinicia `skip`, entonces la lista filtrada puede arrancar desde una página intermedia.**
3. **La lista pagina por offset (`skip/limit`) pero además inserta elementos nuevos arriba vía socket, lo que desalinea las páginas.**
4. **El refresh no tiene una sola fuente de verdad y puede disparar cargas duplicadas.**
5. **La configuración de `FlatList` en `Sale` es menos estable que en otras listas del proyecto.**

---

## 2. Flujo actual verificado

### Estado principal

En `src/screens/Sale.js` se maneja:

- `query = { skip: 0, limit: 25 }`
- `selectedUser`
- `data`
- `dataSearch`
- `limitSales`

Referencia: `src/screens/Sale.js:74-83`

### Cómo carga hoy la lista

1. Cambia `query`, `selectedUser` o `showLocal`.
2. Se ejecuta `getSale(query.skip, query.limit, selectedUser?._id)`.
3. `getSale` llama `POST /sale/skip`.
4. Según haya filtro o no, la lista se actualiza de dos maneras distintas.

Referencia: `src/screens/Sale.js:136-176` y `src/screens/Sale.js:236-240`

---

## 3. Hallazgo 1 — Con filtro por usuario, la paginación pisa la lista anterior

## Qué pasa hoy

En `getSale`, si `filterUser !== null`, el código hace esto:

```js
if (filterUser !== null) {
  setData(response.data.array)
  setLimitSales(response.data.longitud)
  return
}
```

Referencia: `src/screens/Sale.js:147-150`

Eso significa que, cuando la lista está filtrada por usuario:

- la primera página carga bien
- pero la segunda página **reemplaza** a la primera
- no hay acumulación real de resultados

## Ejemplo de situación actual

### Caso

- Usuario seleccionado: `Juan`
- Página 1 pedida al backend: `skip=0, limit=25`
- Resultado: ventas `1..25`
- Usuario hace scroll
- Página 2 pedida: `skip=25, limit=25`
- Resultado: ventas `26..50`

### Resultado actual

La lista visible queda con:

- `26..50`

Y desaparecen:

- `1..25`

O sea, el infinite scroll parece “bugueado”, porque el usuario espera ver **1..50** acumulado y en cambio la lista cambia de bloque.

## Cómo debería quedar corregido

Con filtro activo, la estrategia debe ser consistente con la lista normal:

- primera página: reemplaza el dataset porque es una nueva consulta
- páginas siguientes: **append** de los resultados nuevos

### Resultado corregido esperado

Después de cargar dos páginas filtradas, la lista debería quedar así:

- `1..25` + `26..50`

### Regla conceptual correcta

- **nuevo filtro** → resetear lista y paginación
- **misma consulta, siguiente página** → acumular resultados

---

## 4. Hallazgo 2 — Cambiar el filtro de usuario no reinicia la paginación

## Qué pasa hoy

Al elegir un usuario desde el dropdown, el código hace:

```js
onPress={() => { setSelectedUser(item); setShowUserDropdown(false) }}
```

Referencia: `src/screens/Sale.js:569-575`

Pero no hace:

- reset de `query.skip`
- reset de `data`

Eso es un problema conceptual serio. ¿Y sabés por qué? Porque **cambiar el filtro cambia el universo de datos**. No podés seguir paginando como si la consulta fuese la misma. Eso es arquitectura básica de listas paginadas.

## Ejemplo de situación actual

### Caso

1. Entrás a ventas sin filtro.
2. Hacés scroll varias veces.
3. El estado queda en algo como:
   - `skip=50`
   - `limit=25`
4. Ahora elegís el usuario `Pedro`.

### Resultado actual

La próxima petición no necesariamente arranca en:

- `skip=0, filterUser=Pedro`

Puede arrancar en:

- `skip=50, filterUser=Pedro`

Entonces el usuario ve una de estas dos cosas:

- una lista incompleta
- una lista vacía aunque sí existan ventas previas
- una lista que “parece saltada”

## Cómo debería quedar corregido

Cuando cambia el filtro de usuario, el comportamiento esperado es:

1. resetear `skip` a `0`
2. mantener `limit`
3. limpiar o reconstruir `data` para esa nueva consulta
4. pedir la primera página del usuario seleccionado

### Ejemplo corregido esperado

Si estabas en:

- `skip=50`

y cambiás al usuario `Pedro`, la nueva consulta debe empezar en:

- `skip=0, limit=25, filterUser=Pedro`

No hay vuelta. Si no se hace eso, la paginación del filtro nace mal.

---

## 5. Hallazgo 3 — Offset pagination + inserciones por socket = páginas desalineadas

## Qué pasa hoy

La lista pagina usando `skip/limit`, pero además escucha sockets y ante una venta nueva hace esto:

```js
return [socket.data, ...prevData]
```

Referencia: `src/screens/Sale.js:242-261`, especialmente `251-254`

Eso mete elementos nuevos al principio de la lista local.

## Por qué esto es peligroso

La paginación por offset asume que el dataset mantiene el mismo orden relativo mientras vos seguís pidiendo páginas.

Si entre una página y otra agregás elementos arriba, entonces:

- lo que antes estaba en posición `25`
- ahora puede haber pasado a posición `26`

Y el siguiente `skip=25` ya no apunta al mismo bloque lógico.

## Ejemplo de situación actual

### Caso

1. Primera carga:
   - backend devuelve ventas `A..Y` (25 ítems)
2. Antes de pedir la página 2, entra una venta nueva por socket:
   - `NUEVA`
3. La app deja la lista local así:
   - `NUEVA, A..Y`
4. El usuario hace scroll y pide:
   - `skip=25, limit=25`

### Qué puede pasar

El backend ahora calcula el offset sobre un dataset que cambió. Entonces podés obtener:

- ítems duplicados
- ítems salteados
- bloques que no coinciden con lo que el usuario venía viendo

## Cómo debería quedar corregido

Hay varias estrategias válidas. Acá no estamos definiendo la solución final del RFC todavía, pero sí el comportamiento correcto esperado.

### Opción A — Mantener offset pero sin mutar el orden mientras se pagina

- si entra un socket nuevo, marcar “hay novedades”
- no insertar arriba inmediatamente mientras el usuario está en scroll paginado
- refrescar explícitamente la primera página cuando corresponda

### Opción B — Migrar a cursor pagination

- cada página se pide a partir de un cursor estable
- una inserción nueva arriba no rompe los bloques siguientes

### Comportamiento corregido esperado

El usuario no debería ver que la lista cambia de forma arbitraria mientras sigue bajando. Si la fuente cambia, el sistema debe:

- o congelar la consulta actual
- o invalidarla y reconstruirla correctamente

Pero NO mezclar ambas cosas.

---

## 6. Hallazgo 4 — El refresh no tiene un flujo limpio

## Qué pasa hoy

En el botón de refresh se hace esto:

```js
setQuery({ skip: 0, limit: 25 })
getSale(0, 25)
```

Referencia: `src/screens/Sale.js:522-528`

Pero además ya existe un `useEffect` que escucha cambios de `query` y llama `getSale`.

Referencia: `src/screens/Sale.js:236-240`

## Problema

Eso puede generar:

- una carga directa por el click
- otra carga por el cambio de `query`

O sea: dos fuentes disparando la misma intención.

## Ejemplo de situación actual

1. Tocás refresh.
2. Se ejecuta `getSale(0,25)` manualmente.
3. También cambia `query`.
4. El `useEffect` vuelve a ejecutar `getSale`.

### Resultado posible

- doble request
- estado de loading poco claro
- acumulación rara si no se limpió `data`

## Cómo debería quedar corregido

Tiene que existir una sola fuente de verdad para refrescar:

- o el botón solo cambia estado y el efecto hace el fetch
- o el botón hace el fetch directamente y el estado se sincroniza desde ahí

Pero no las dos juntas.

---

## 7. Hallazgo 5 — `FlatList` en `Sale` está menos controlada que en otras listas

## Qué pasa hoy

La lista principal de ventas usa `onEndReached`, pero no define `onEndReachedThreshold`.

Referencia: `src/screens/Sale.js:632-666`

En otras pantallas del proyecto sí aparece una configuración más explícita:

- `src/screens/Client.js:298-308`
- `src/screens/Users.js:239-249`

Ahí usan:

```js
onEndReachedThreshold={0.5}
```

Además, según la documentación de React Native para `VirtualizedList`, el valor default de `onEndReachedThreshold` es `2`.

## Por qué importa

Sin una configuración explícita:

- el momento en que dispara el evento es menos predecible
- puede disparar demasiado pronto
- cuesta más razonar el comportamiento

No parece ser la causa raíz principal, pero sí suma inestabilidad.

## Cómo debería quedar corregido

La lista debería tener al menos:

- threshold explícito
- guardas claras de `isFetching`
- una noción de `hasMore`

Así el scroll no depende de condiciones implícitas o mágicas.

---

## 8. Hallazgo 6 — La lógica de `onEndReached` tiene una rama inconsistente

## Qué pasa hoy

El código actual hace:

```js
if (!loading.open && search.value === '' && query.skip + query.limit < limitSales) {
  if (query.skip + query.limit >= limitSales) {
    // ...
  }
  setQuery({ skip: query.skip + query.limit, limit: query.limit })
}
```

Referencia: `src/screens/Sale.js:654-663`

## Problema

La condición interna:

- `query.skip + query.limit >= limitSales`

queda contenida dentro de una externa que exige lo contrario:

- `query.skip + query.limit < limitSales`

Entonces esa rama interna es, en la práctica, inconsistente o muerta.

## Cómo debería quedar corregido

La lógica de paginación debería calcular primero si hay más páginas o no, y después ejecutar una sola ruta de decisión.

### Comportamiento corregido esperado

- si no hay más páginas → no pedir nada
- si hay más páginas → calcular el siguiente bloque una sola vez

Sin condiciones que se contradigan entre sí.

---

## 9. Escenarios reales: actual vs corregido

## Escenario A — Scroll normal sin filtros

### Actual

- carga página 1
- si entra una venta nueva por socket, se inserta arriba
- al seguir scrolleando puede aparecer desalineación por offset

### Corregido esperado

- la consulta paginada se mantiene estable
- las novedades se administran sin romper el bloque actual

---

## Escenario B — Usuario scrollea y después filtra por vendedor

### Actual

- el `skip` viejo sigue vivo
- el filtro nuevo puede arrancar desde página 3 o 4

### Corregido esperado

- cambiar filtro reinicia la paginación
- la nueva consulta arranca siempre en página 1

---

## Escenario C — Usuario filtrado sigue bajando

### Actual

- cada página nueva reemplaza la anterior
- la lista da sensación de salto o pérdida de datos

### Corregido esperado

- todas las páginas del mismo filtro se acumulan
- el usuario ve una progresión continua y coherente

---

## 10. Conclusión técnica

El problema reportado por el usuario es consistente con lo que muestra el código.

La causa más fuerte no es “FlatList anda mal”, sino esto:

1. **cambio de consulta sin reset de paginación**
2. **reemplazo de páginas filtradas en vez de append**
3. **mezcla de offset pagination con mutaciones en tiempo real al inicio de la lista**

En otras palabras: el problema no es solo visual, es de **modelo mental de la lista**. La implementación actual mezcla varias estrategias incompatibles y por eso el resultado es inestable.

---

## 11. Recomendaciones para el futuro RFC

El RFC debería responder, como mínimo, estas preguntas:

1. ¿La lista de ventas va a seguir usando `skip/limit` o va a migrar a cursores?
2. ¿Qué evento reinicia la consulta? (búsqueda, filtro, refresh, cambio de modo)
3. ¿Cuándo una carga debe reemplazar la lista y cuándo debe acumular?
4. ¿Cómo se administran las novedades por socket sin romper la paginación?
5. ¿Cuál es el contrato de estado mínimo? Ejemplo:
   - `items`
   - `isFetching`
   - `hasMore`
   - `page` o `cursor`
   - `activeFilter`

Ese RFC tiene que atacar primero el modelo de datos y recién después el detalle del componente. Si no, terminamos parchando síntomas.
