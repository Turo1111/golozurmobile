# Golozur Mobile

Aplicación móvil de gestión comercial para ventas, productos, clientes y usuarios. Parte del ecosistema Golozur, diseñada para operar en terreno con soporte offline y sincronización en tiempo real.

---

## Características del proyecto

### Funcionalidades principales

- **Ventas**: Creación y edición de ventas con carrito, múltiples productos, porcentajes y estados
- **Productos**: CRUD completo con categorías, marcas, proveedores, stock y precios
- **Clientes**: Gestión de clientes con ubicación en mapa, geocodificación y búsqueda
- **Usuarios y roles**: Sistema de permisos por rol (JWT) para controlar acceso a funciones
- **Modo offline**: Ventas sin conexión con guardado local y sincronización posterior
- **Impresión y compartición**: Generación de PDF de ventas y envío por canales nativos
- **Tiempo real**: Actualización de productos y ventas vía Socket.io

### Stack tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Framework | Expo ~49, React 18.2, React Native 0.72 |
| Navegación | React Navigation (native-stack) |
| Estado | Redux Toolkit |
| Formularios | Formik + Yup |
| HTTP | Axios |
| Almacenamiento local | AsyncStorage |
| Mapas | React Native Maps, Google Maps API |
| Impresión | expo-print, expo-sharing |

### Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables (carrito, modales, formularios)
├── context.js/     # Contextos (offline, socket)
├── hooks/          # Hooks personalizados (permisos, búsqueda, filtros)
├── navigation/     # Configuración de navegación
├── redux/          # Store, slices (user, alert, loading)
├── screens/        # Pantallas (Login, Ventas, Productos, Clientes, Usuarios)
├── services/       # Notificaciones, background fetch
├── utils/          # Cliente API, geocodificación
└── types/          # Tipos TypeScript
```

### Requisitos de entorno

- Node.js
- Expo CLI
- Variables de entorno: `DB_HOST`, `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`

### Scripts

```bash
npm start      # Iniciar Expo
npm run android # Ejecutar en Android
npm run ios     # Ejecutar en iOS
npm run build   # Build para producción (EAS)
```

---

## Licencia

Este proyecto es **propietario** y está protegido por derechos de autor.  
**Prohibido su uso, copia, modificación o distribución sin autorización.**

Ver [LICENSE](./LICENSE) para más detalles.
