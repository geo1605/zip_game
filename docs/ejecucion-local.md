# ZIP Game

Juego de recorridos sobre un tablero 6×6: empieza en 1, visita los números en orden, pasa por las 36 celdas sin repetir ni moverte en diagonal y termina en el último número. Flutter consume una API AdonisJS 6 con persistencia en MySQL.

## Organización

- `zip_game_api/`: autenticación por token, niveles, validación, pistas, partidas, puntajes, perfil y ranking.
- `zip_game_frontend/`: aplicación Flutter para web y Android; capas `domain`, `data` y `presentation` por funcionalidad.
- `database/`: SQL de referencia. Las migraciones Lucid son la fuente de la estructura efectiva.
- `docs/`: documentación del integrante 5 y evidencias de verificación.

## Requisitos

- Flutter con Dart 3.14 o posterior compatible con `pubspec.yaml`.
- Node.js 24 y npm (una dependencia del lockfile requiere Node 24).
- MySQL 8, o Docker Desktop para la configuración local incluida.
- Chrome para ejecutar la versión web. Android necesita además el SDK de Android.

## Iniciar la base de datos

Desde la raíz del repositorio:

```sh
docker compose up -d mysql
```

Este servicio local escucha en `127.0.0.1:3307`; crea `zip_game` con usuario `zip_user` y contraseña de desarrollo `zip_local_password`. Los datos se conservan en un volumen de Docker. Si ya tienes MySQL, crea una base equivalente y usa sus datos de conexión.

## Iniciar la API

Dentro de `zip_game_api`:

```sh
npm ci
```

Copia `.env.example` a `.env` y configura `DB_PORT=3307`, `DB_USER=zip_user`, `DB_PASSWORD=zip_local_password`, `DB_DATABASE=zip_game` para Docker. Luego:

```sh
node ace generate:key
node ace migration:run
node ace db:seed
npm run dev
```

El servidor escucha en `http://localhost:3333`. Puedes crear tu cuenta desde la aplicación; los seeders agregan cinco niveles de demostración.

## Iniciar Flutter

En otra terminal, dentro de `zip_game_frontend`:

```sh
flutter pub get
flutter run -d chrome --dart-define=API_URL=http://localhost:3333/api
```

Para un emulador Android usa `http://10.0.2.2:3333/api`. En un teléfono físico usa la dirección LAN de tu computadora y configura `HOST=0.0.0.0` en la API. El valor de `API_URL` debe terminar en `/api` y no llevar una barra final.

## Jugar

1. Regístrate o inicia sesión.
2. Selecciona un nivel o usa **Juego rápido**, que consulta la dificultad recomendada y genera un tablero si hace falta.
3. Toca las celdas o arrastra con dedo o mouse. También puedes recorrerlas con Tab y activarlas con Enter.
4. **Deshacer** elimina el último paso. **Pista** resalta la siguiente celda; si te desviaste de la solución de referencia, retrocede hasta el primer desvío.
5. **Reiniciar** abandona la partida actual y abre una nueva del mismo nivel. Al salir se pide confirmación antes de abandonar.
6. Con 36 celdas, pulsa **Verificar solución**. La API valida, guarda y calcula el resultado. Desde el resumen puedes consultar perfil, historial y ranking.

## Pruebas

Las pruebas HTTP requieren una base separada cuyo nombre termine en `_test`. Sus migraciones pueden revertirse durante la limpieza; no uses la base de tus partidas.

```sh
docker compose exec mysql mysql -uroot -pzip_local_root -e "CREATE DATABASE IF NOT EXISTS zip_game_test;"
```

En `zip_game_api`, copia `.env.test.example` a `.env.test` y ejecuta:

```sh
npm run typecheck
npm test
npm run build
```

En `zip_game_frontend`:

```sh
flutter analyze
flutter test --coverage
flutter build web --release
```

La prueba `test/live_api_test.dart` está omitida por defecto porque escribe en una API real. Para ejecutarla, inicia una instancia de la API en el puerto 3334 con `NODE_ENV=test` y `DB_DATABASE=zip_game_test`; aplica antes sus migraciones. Después:

```sh
flutter test test/live_api_test.dart --dart-define=RUN_LIVE_API=true --dart-define=API_URL=http://localhost:3334/api
```

Esta prueba registra un usuario, genera un nivel, obtiene un recorrido mediante pistas, finaliza y verifica historial, perfil y ranking a través de los repositorios reales de Flutter. Deja datos de prueba en esa base.

La configuración de GitHub Actions repite las comprobaciones con MySQL aislado, compila web y ejecuta también la integración HTTP real.

Consulta [la documentación técnica del integrante 5](integrante-5.md) y [el registro de pruebas](verificacion.md).
