# Estructura del proyecto Quokki

## Vista general
- `index.html`: solo markup de pantallas y carga de assets.
- `sw.js`: service worker.
- `assets/css/main.css`: estilos globales de la app.
- `assets/js/data/`: datos estáticos y catálogos.
- `assets/js/features/`: lógica separada por funcionalidad.

## JavaScript por funcionalidad
- `assets/js/data/images.js`: mapa global de imágenes (`window.QIMGS`).
- `assets/js/data/recipes.js`: dataset de recetas (`RECIPES`).
- `assets/js/data/calendar.js`: reglas de calendario (`CAL`, `calInfo`, `nextDay`).
- `assets/js/features/auth.js`: Supabase, auth, onboarding, navegación y configuración de usuario.
- `assets/js/features/tracker.js`: hábitos, persistencia diaria, UI principal, stats, vianda y pomodoro.
- `assets/js/features/notifications.js`: permisos y programación de notificaciones.

## Orden de carga (importante)
En `index.html` los scripts se cargan en este orden:
1. `images.js`
2. `recipes.js`
3. `calendar.js`
4. `auth.js`
5. `tracker.js`
6. `notifications.js`

Este orden garantiza que las dependencias globales estén disponibles cuando cada módulo se ejecuta.
