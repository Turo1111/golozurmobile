# PRD — Golozur Mobile

## Estado del documento

- **Tipo**: PRD reconstruido desde la implementación actual
- **Estado**: Draft operativo
- **Fecha**: 2026-04-15
- **Fuente de verdad**: código y configuración del repositorio

> Este documento describe el producto **tal como está implementado hoy** y, cuando hace falta completar visión de producto, marca explícitamente las partes como **propuestas**. No mezcla hechos con deseos.

---

## 1. Resumen ejecutivo

Golozur Mobile es una aplicación móvil de gestión comercial orientada a operación en terreno. Su objetivo principal es permitir que vendedores y administradores gestionen **ventas, productos, clientes, usuarios y roles** desde el celular, incluso con conectividad inestable.

El producto prioriza:

- captura de ventas en campo
- consulta y mantenimiento de catálogo
- control de acceso por roles y permisos
- persistencia local para operación degradada
- sincronización posterior y actualización en tiempo real
- generación y compartición de PDFs comerciales

La implementación actual está montada como **una única app Expo/React Native**, con backend HTTP consumido vía Axios, permisos derivados de JWT, persistencia local en AsyncStorage y eventos en tiempo real con Socket.IO.

---

## 2. Problema que resuelve

### Problema de negocio

Equipos comerciales que trabajan en terreno necesitan:

- registrar ventas sin depender de conectividad perfecta
- consultar productos, precios y stock desde el celular
- asociar ventas a clientes reales
- ubicar clientes en mapa
- operar con permisos diferenciados según rol
- compartir comprobantes o listas de precios rápidamente

### Problemas operativos observados

- la conectividad puede fallar durante la venta
- el catálogo necesita refresco frecuente
- distintas personas no deberían ver ni modificar lo mismo
- el cierre comercial requiere material compartible en PDF
- la operación necesita continuidad aun cuando el backend no responda

---

## 3. Objetivos del producto

### Objetivos verificables por implementación actual

1. **Permitir autenticación móvil con sesión persistida**.
2. **Permitir gestión comercial desde módulos separados**: Productos, Ventas, Clientes, Usuarios, Roles y Almacenamiento local.
3. **Permitir crear ventas con múltiples ítems, porcentajes y cliente asociado**.
4. **Permitir operar con fallback offline para ventas y cache local de productos**.
5. **Permitir administración de clientes con datos de contacto y ubicación geográfica**.
6. **Permitir administración de usuarios y roles con permisos finos por entidad/acción**.
7. **Permitir exportar y compartir PDFs de ventas y listas de precios**.
8. **Mantener sincronización y refresco en segundo plano cuando hay conectividad**.

### Objetivos propuestos de negocio

- reducir ventas perdidas por falta de señal
- mejorar tiempo de atención en visita comercial
- mantener catálogo razonablemente actualizado en móvil
- profesionalizar la operación con control de permisos

---

## 4. No objetivos / fuera de alcance actual

Estos puntos **no están implementados como módulo completo en la app actual**:

- módulo funcional de **Compras** (solo existe en el modelo de permisos de roles)
- dashboards analíticos o BI
- flujos de e-commerce o autoservicio del cliente final
- CI/CD, testing automatizado o observabilidad avanzada desde repo móvil
- sincronización offline completa para usuarios, roles o clientes
- gestión centralizada de sockets en un único provider activo

---

## 5. Usuarios del producto

## 5.1 Administrador

Necesita:

- crear y editar productos
- crear y editar usuarios
- crear y editar roles
- ver ventas de múltiples usuarios
- imprimir listas de precios
- dar de baja ventas

## 5.2 Vendedor / usuario de campo

Necesita:

- iniciar sesión
- consultar catálogo
- crear ventas
- buscar o crear cliente durante la venta
- operar con conectividad limitada
- compartir comprobante PDF

## 5.3 Supervisor / rol personalizado

Necesita:

- acceder solo a módulos habilitados por permisos
- consultar ventas, clientes o productos según política del negocio

> Importante: la app no fija roles cerrados en frontend. El acceso real se deriva del JWT y de la entidad `role.permissions`.

---

## 6. Modelo de permisos

La app actual usa un esquema de permisos por combinación **acción + entidad**.

### Entidades observadas

- `user`
- `role`
- `product`
- `sale`
- `buy`
- `client`

### Acciones observadas

- `create`
- `read`
- `update`
- `delete`

### Ejemplos

- `create_sale`
- `read_product`
- `update_user`
- `delete_sale`

### Comportamiento actual

- el frontend decodifica el JWT en cliente
- toma `role.permissions`
- habilita o bloquea pantallas y acciones con `usePermissionCheck`

### Observación importante

- `buy` existe en el modelo de permisos, pero **no existe módulo de Compras en la UI actual**.

---

## 7. Alcance funcional actual

## 7.1 Autenticación y sesión

### Capacidades actuales

- login con `nickname` + `password`
- persistencia de sesión en AsyncStorage (`user`)
- restauración de sesión al abrir la app
- logout manual
- invalidación práctica ante respuestas como `USUARIO_NO_ACTIVO`

### Requisitos funcionales

- **FR-AUTH-01**: el usuario debe poder autenticarse con credenciales.
- **FR-AUTH-02**: la app debe persistir la sesión localmente.
- **FR-AUTH-03**: la app debe reutilizar el token persistido si Redux aún no lo cargó.
- **FR-AUTH-04**: la app debe bloquear acceso a funcionalidades si faltan permisos.

---

## 7.2 Home y navegación principal

### Capacidades actuales

- pantalla principal con acceso modular
- render condicional de tarjetas según permisos
- acción rápida para crear venta
- acceso a módulo de almacenamiento local

### Requisitos funcionales

- **FR-HOME-01**: la app debe mostrar solo módulos permitidos para el rol actual.
- **FR-HOME-02**: la app debe ofrecer acceso rápido a nueva venta si existe `create_sale`.
- **FR-HOME-03**: la navegación debe resolverse por stack manual.

---

## 7.3 Productos

### Capacidades actuales

- listado paginado de productos
- búsqueda por texto
- filtros por categoría, marca y proveedor
- alta de producto
- edición de producto
- actualización de precios
- visualización de detalle
- carga de imagen de producto
- impresión/compartición de lista de precios PDF
- soporte de catálogo offline desde `productStorage`

### Campos de producto observados

- descripción
- stock
- código de barras
- sabor
- categoría
- marca
- proveedor
- bulto
- precio por bulto
- precio de compra
- precio unitario
- precio con descuento
- path de imagen

### Requisitos funcionales

- **FR-PROD-01**: listar productos en forma paginada.
- **FR-PROD-02**: buscar productos por texto.
- **FR-PROD-03**: filtrar por categoría, marca y proveedor.
- **FR-PROD-04**: crear producto con validación mínima de descripción, stock, precio unitario, categoría, marca y proveedor.
- **FR-PROD-05**: editar producto existente.
- **FR-PROD-06**: mostrar detalle de producto con precios, stock y vendidos.
- **FR-PROD-07**: permitir carga de imagen del producto.
- **FR-PROD-08**: permitir generar PDF de lista de precios.
- **FR-PROD-09**: permitir listas con descuentos por categoría.
- **FR-PROD-10**: permitir uso de catálogo cacheado cuando no hay conexión.

---

## 7.4 Ventas

### Capacidades actuales

- listado paginado de ventas
- búsqueda de ventas
- filtro por usuario
- creación de venta con carrito
- asociación a cliente por nombre o `idCliente`
- cálculo de total con porcentaje
- detalle de venta
- edición de venta
- baja de venta
- generación y compartición de PDF
- fallback offline cuando falla el POST al backend
- visualización de ventas locales almacenadas

### Requisitos funcionales

- **FR-SALE-01**: listar ventas con paginación.
- **FR-SALE-02**: buscar ventas por texto.
- **FR-SALE-03**: filtrar ventas por usuario.
- **FR-SALE-04**: crear venta con múltiples ítems, totales y porcentaje.
- **FR-SALE-05**: exigir cliente o `idCliente` antes de guardar una venta.
- **FR-SALE-06**: si la venta online falla, guardar localmente para sincronización posterior.
- **FR-SALE-07**: permitir editar una venta existente.
- **FR-SALE-08**: permitir dar de baja una venta.
- **FR-SALE-09**: permitir generar y compartir comprobante PDF.
- **FR-SALE-10**: permitir ver ventas locales pendientes desde almacenamiento.

### Estados observados

- el alta de venta usa `estado: 'Entregado'`
- existe edición y baja lógica de venta

---

## 7.5 Clientes

### Capacidades actuales

- listado paginado de clientes
- búsqueda por nombre
- alta de cliente
- edición de cliente
- selección de cliente durante la venta
- creación rápida de cliente dentro del flujo de venta
- almacenamiento de teléfonos
- selección de ubicación en mapa
- reverse geocoding a dirección legible
- visualización en mapa de cliente existente
- suscripción a evento de ubicación en tiempo real (`client_location`)

### Campos observados

- nombre completo
- teléfonos[]
- lat
- lng
- address
- description

### Requisitos funcionales

- **FR-CLIENT-01**: listar clientes en forma paginada.
- **FR-CLIENT-02**: buscar clientes por nombre.
- **FR-CLIENT-03**: crear cliente con nombre obligatorio.
- **FR-CLIENT-04**: permitir agregar múltiples teléfonos.
- **FR-CLIENT-05**: permitir fijar ubicación en mapa.
- **FR-CLIENT-06**: resolver dirección textual desde coordenadas.
- **FR-CLIENT-07**: editar cliente existente.
- **FR-CLIENT-08**: seleccionar cliente desde el flujo de venta.
- **FR-CLIENT-09**: permitir alta rápida de cliente durante la venta.
- **FR-CLIENT-10**: mostrar ubicación y seguir actualizaciones de localización del cliente cuando existan eventos.

---

## 7.6 Usuarios

### Capacidades actuales

- listado paginado de usuarios
- búsqueda de usuarios
- alta de usuario
- edición de usuario
- asignación de rol
- activación/desactivación de usuario
- visualización de métricas básicas por usuario (`qtySaleUser`, `gain`)

### Requisitos funcionales

- **FR-USER-01**: listar usuarios.
- **FR-USER-02**: buscar usuarios por nombre o rol.
- **FR-USER-03**: crear usuario con nickname, password y rol.
- **FR-USER-04**: editar usuario existente.
- **FR-USER-05**: permitir cambiar rol.
- **FR-USER-06**: permitir activar o desactivar usuario.

---

## 7.7 Roles

### Capacidades actuales

- listado paginado de roles
- búsqueda de roles
- alta de rol
- edición de rol
- selección granular de permisos
- protección del rol `admin` en la lista (no editable desde esa vista)

### Requisitos funcionales

- **FR-ROLE-01**: listar roles.
- **FR-ROLE-02**: buscar roles por nombre.
- **FR-ROLE-03**: crear rol con nombre, descripción y permisos.
- **FR-ROLE-04**: editar rol existente.
- **FR-ROLE-05**: permitir selección masiva de permisos por entidad.
- **FR-ROLE-06**: impedir edición directa del rol `admin` desde la lista actual.

### Observación importante

- existe pantalla `DetailsRole`, pero la ruta está comentada en `NavigationStack`, por lo que hoy el flujo efectivo es lista + crear + editar.

---

## 7.8 Operación offline y sincronización

### Capacidades actuales

- persistencia local de usuario, productos y ventas
- cache de productos en `productStorage`
- ventas pendientes en `saleStorage`
- sincronización de ventas pendientes a `/sale/multiple`
- sincronización de productos basada en fechas de actualización
- pantalla `InfoStorage` para inspeccionar y limpiar almacenamiento local

### Requisitos funcionales

- **FR-OFF-01**: la app debe persistir credenciales/sesión localmente.
- **FR-OFF-02**: la app debe cachear productos para uso sin conexión.
- **FR-OFF-03**: la app debe guardar ventas localmente si el envío online falla.
- **FR-OFF-04**: la app debe intentar enviar ventas pendientes cuando vuelve la conectividad.
- **FR-OFF-05**: la app debe permitir limpiar caches locales desde UI.
- **FR-OFF-06**: la app debe mostrar estado online/offline por pantalla.

### Limitaciones actuales verificadas

- el toggle manual de modo offline existe a nivel de contexto, pero la UI que lo expone está comentada
- `InfoStorage` muestra un botón de sincronización manual, pero la lógica de posteo real allí está incompleta/comentada
- el soporte offline útil hoy está concentrado en **productos cacheados** y **ventas pendientes**

---

## 7.9 Tiempo real, background y notificaciones

### Capacidades actuales

- sockets para refresco de ventas, productos y algunos eventos de cliente
- tareas de background para chequeo de conectividad y sincronización de productos
- notificaciones locales al sincronizar ventas
- chequeos periódicos en foreground y background

### Requisitos funcionales

- **FR-RT-01**: la app debe reaccionar a cambios de ventas en tiempo real.
- **FR-RT-02**: la app debe reaccionar a cambios de productos en tiempo real.
- **FR-RT-03**: la app debe permitir escuchar ubicación de cliente si el backend emite `client_location`.
- **FR-NOTIF-01**: la app debe solicitar permisos de notificación.
- **FR-NOTIF-02**: la app debe registrar tareas de background para chequeo de conectividad y sincronización de productos.
- **FR-NOTIF-03**: la app debe notificar el resultado del envío de ventas pendientes.

### Frecuencias observadas en código

- intervalos foreground: **300000 ms (5 min)**
- `BackgroundFetch.registerTaskAsync`: **60 * 5**

---

## 7.10 Almacenamiento local y diagnóstico operativo

### Capacidades actuales

- inspección de cantidad y tamaño aproximado de datos locales
- borrado de cache de productos
- borrado de ventas pendientes
- visualización de `lastUpdate` para productos

### Requisitos funcionales

- **FR-STORAGE-01**: permitir inspeccionar el contenido local de productos y ventas.
- **FR-STORAGE-02**: permitir limpiar productos cacheados.
- **FR-STORAGE-03**: permitir limpiar ventas pendientes.
- **FR-STORAGE-04**: mostrar tamaño aproximado del almacenamiento local por tipo.

---

## 8. Flujos críticos del producto

## 8.1 Login y restauración de sesión

1. Usuario ingresa nickname y contraseña.
2. Backend autentica y devuelve token/usuario.
3. App guarda sesión en Redux y AsyncStorage `user`.
4. En siguientes aperturas, la app restaura acceso desde storage.

## 8.2 Venta online

1. Usuario entra a `NewSale`.
2. Busca o filtra productos.
3. Agrega productos al carrito.
4. Define cliente, porcentaje y total.
5. Envía la venta al backend.
6. Puede generar o compartir PDF.

## 8.3 Venta con falla de red

1. Usuario arma venta normalmente.
2. POST `/sale` falla.
3. La app ejecuta fallback local (`postOffline`).
4. Guarda la venta en `saleStorage`.
5. Más tarde, al detectar conectividad, intenta `/sale/multiple`.

## 8.4 Alta rápida de cliente durante venta

1. Usuario abre selector de cliente.
2. Busca cliente existente.
3. Si no existe y tiene permiso, abre formulario inline.
4. Completa nombre, teléfonos y ubicación.
5. Guarda cliente y lo selecciona automáticamente para la venta.

## 8.5 Gestión de catálogo

1. Usuario entra a Productos.
2. Busca o filtra por categoría/marca/proveedor.
3. Crea o edita producto según permisos.
4. Puede actualizar precios o imprimir lista PDF.

## 8.6 Gestión de clientes con ubicación

1. Usuario crea o edita cliente.
2. Elige punto en mapa o usa ubicación actual.
3. La app consulta dirección por reverse geocoding.
4. Guarda coordenadas y address con el cliente.

## 8.7 Administración de roles y usuarios

1. Administrador crea o edita rol.
2. Define permisos por entidad y acción.
3. Luego crea o edita usuario asignando rol.
4. El usuario ve solamente módulos habilitados por su JWT.

---

## 9. Modelo de dominio

| Entidad | Campos principales observados | Notas |
| --- | --- | --- |
| Usuario | `nickname`, `token`, `role`, `isActive`, `qtySaleUser`, `gain` | el estado global en Redux guarda sobre todo token; datos completos viven también en AsyncStorage |
| Rol | `name`, `description`, `permissions`, `isActive` | permisos tipo `accion_entidad` |
| Producto | `descripcion`, `stock`, `codigoBarra`, `sabor`, `categoria`, `marca`, `proveedor`, `precioCompra`, `precioUnitario`, `precioDescuento`, `path`, `vendidos` | soporta categorías, marcas y proveedores relacionados |
| Cliente | `nombreCompleto`, `telefonos[]`, `lat`, `lng`, `address`, `description` | puede usarse desde venta y desde módulo de clientes |
| Venta | `cliente`, `idCliente`, `itemsSale[]`, `total`, `estado`, `porcentaje`, `createdAt` | ítems se editan también a nivel `itemSale` |
| ItemSale | producto, cantidad, precio unitario, total | se observa edición/desactivación de ítems en edición de venta |
| Storage local | `user`, `productStorage`, `saleStorage`, `offlineStorage` | `offlineStorage` existe, pero su uso visible hoy es parcial |

---

## 10. Requisitos no funcionales

## 10.1 Seguridad y acceso

- autenticación con **Bearer JWT**
- permisos derivados del contenido del token en cliente
- las pantallas se protegen por permiso y algunas acciones por botón

## 10.2 Performance y experiencia

- timeout de red observado en Axios: **7000 ms**
- listas principales con paginación incremental
- búsqueda con debounce en algunos flujos
- feedback global de carga con componente `Loading`

## 10.3 Resiliencia operativa

- degradación funcional ante caída de backend
- persistencia local de ventas pendientes
- cache de catálogo para consulta offline
- intentos periódicos de sincronización

## 10.4 Compatibilidad móvil

- app Expo React Native
- configuración runtime disponible para Android e iOS
- build script actual del repo apunta a **Android EAS**

## 10.5 Geolocalización

- permisos de ubicación foreground
- obtención de última ubicación conocida o posición actual
- reverse geocoding y búsqueda textual con Nominatim

## 10.6 Documentos y compartición

- generación de PDF para ventas
- generación de PDF para listas de precios
- guardado temporal en filesystem y compartición nativa

## 10.7 Tiempo real

- Socket.IO usado desde múltiples pantallas/componentes
- eventos de producto, venta y ubicación de cliente

---

## 11. Integraciones y dependencias externas

## 11.1 Backend principal

- URL base: `DB_HOST`
- consumo vía `src/utils/client.js`
- token desde Redux con fallback a AsyncStorage

## 11.2 Socket.IO

- conexión a `DB_HOST`
- uso distribuido por pantalla/componente

## 11.3 Mapas y geocodificación

- selector actual basado en **WebView + Leaflet + OpenStreetMap**
- reverse geocoding y search con **Nominatim**

## 11.4 Notificaciones y background

- `expo-notifications`
- `expo-task-manager`
- `expo-background-fetch`

## 11.5 Documentos y archivos

- `expo-print`
- `expo-sharing`
- `expo-file-system`

---

## 12. Restricciones y decisiones técnicas que impactan producto

1. **La app es una única aplicación Expo**; no hay monorepo ni separación por paquetes.
2. **Toda la navegación depende de registro manual** en `NavigationStack.js`.
3. **La configuración runtime real vive en `app.config.js`**, no en `app.json`.
4. **No hay scripts de test/lint/typecheck ni CI** en este repo móvil.
5. **La lógica de realtime está descentralizada**; no hay un `SocketProvider` activo en `App.js`.
6. **La sincronización útil en background vive en `NotificationService.js`**.
7. **El chequeo de ping usa una URL hardcodeada** distinta de `DB_HOST`.

---

## 13. Riesgos y brechas actuales

## 13.1 Riesgos funcionales

- el módulo de **Compras** aparece en permisos, pero no tiene experiencia de usuario implementada
- la pantalla `InfoStorage` promete sincronización manual, pero su lógica efectiva está incompleta
- el toggle manual de offline está comentado; la experiencia depende más de fallas de red que de control explícito del usuario

## 13.2 Riesgos técnicos

- múltiples sockets abiertos desde varias pantallas pueden generar inconsistencias o costo de mantenimiento alto
- `NotificationService.js` mezcla `DB_HOST` con un ping hardcodeado a `https://apigolozur.onrender.com/ping`
- la carga de imagen de producto usa `http://10.0.2.2:5000/product/uploadImage`, lo que revela una dependencia local/emulador en esa parte del flujo
- existe un archivo `setupBackgroundFetch.js`, pero no es el flujo activo de la app

## 13.3 Riesgos de configuración / seguridad

- `JWT_SECRET` se expone en `app.config.js -> expo.extra`, y **no se observó uso del lado cliente**; esto debería revisarse

## 13.4 Riesgos de producto

- sin métricas instrumentadas, es difícil medir tasa de sincronización, éxito de ventas offline o uso real de módulos
- el soporte offline hoy está centrado en ventas/productos; otras entidades dependen fuertemente de conectividad

---

## 14. KPIs propuestos

> Estos KPIs son **propuestos**; no se observaron dashboards ni telemetría en el repo actual.

### Operación comercial

- tasa de login exitoso
- ventas creadas por usuario por día
- tiempo medio para crear una venta
- tasa de ventas guardadas offline vs online

### Resiliencia

- cantidad de ventas pendientes en `saleStorage`
- tiempo medio de sincronización de ventas pendientes
- frescura del catálogo local (`productStorage.lastUpdate`)

### Adopción de módulos

- uso de módulo Clientes
- uso de impresión de lista de precios
- uso de exportación PDF de ventas
- porcentaje de clientes con ubicación cargada

### Administración

- cantidad de usuarios activos
- cantidad de roles personalizados usados
- porcentaje de acciones bloqueadas por permisos vs permitidas

---

## 15. Roadmap propuesto

## Fase 1 — Estabilización operativa

- unificar manejo de conectividad y offline
- completar sincronización manual desde `InfoStorage`
- eliminar secretos innecesarios del config cliente
- centralizar estrategia de sockets
- corregir endpoints hardcodeados locales

## Fase 2 — Robustez comercial

- mejorar flujos de edición/anulación de ventas
- definir estados formales de venta
- agregar trazabilidad de sincronización y errores
- ampliar cache offline a clientes relevantes para ventas

## Fase 3 — Expansión funcional

- implementar módulo de Compras si sigue siendo una necesidad real
- sumar métricas/telemetría
- incorporar notificaciones de negocio más allá de conectividad
- evaluar auditoría de cambios críticos

---

## 16. Trazabilidad a código

Archivos clave usados para reconstruir este PRD:

- `README.md`
- `package.json`
- `app.config.js`
- `App.js`
- `src/navigation/NavigationStack.js`
- `src/utils/client.js`
- `src/context.js/contextOffline.js`
- `src/services/NotificationService.js`
- `src/screens/Login.js`
- `src/screens/Home.js`
- `src/screens/Product.js`
- `src/screens/NewProduct.js`
- `src/screens/DetailsProduct.js`
- `src/screens/Sale.js`
- `src/screens/NewSale.js`
- `src/screens/DetailsSale.js`
- `src/screens/Client.js`
- `src/screens/NewClient.js`
- `src/screens/EditClient.js`
- `src/components/SelectClient.js`
- `src/screens/Users.js`
- `src/screens/NewUser.js`
- `src/screens/EditUser.js`
- `src/screens/Roles.js`
- `src/screens/NewRole.js`
- `src/screens/EditRole.js`
- `src/screens/InfoStorage.js`
- `src/hooks/usePermissionCheck.js`
- `src/components/ClienteLocationPicker.js`
- `src/utils/location/permissions.ts`
- `src/utils/location/reverseGeocode.ts`

---

## 17. Cierre

El proyecto ya resuelve un problema real: **gestión comercial móvil con operación degradada y control de permisos**. La base funcional está. Lo que falta no es “más pantallas porque sí”, sino cerrar de forma prolija la brecha entre:

- experiencia offline prometida vs experiencia offline real
- permisos declarados vs módulos realmente implementados
- realtime disperso vs arquitectura mantenible
- necesidad operativa vs medición del uso real

Ese es el punto. Primero fundamentos, después expansión. Es así de fácil.
