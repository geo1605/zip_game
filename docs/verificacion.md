# Verificación del integrante 5

Fecha: **24 de noviembre de 2026**. Entorno local: Windows, Flutter **3.50.1**, Dart **3.14.0**, Node **22.17.1** y MySQL **8.4** mediante Docker. El flujo de CI usa Node 24 para respetar los requisitos del lockfile.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| Integridad del repositorio después del apagón: `git fsck --full` | Sin errores |
| Espacios/conflictos: `git diff --check` y búsqueda de marcadores | Sin errores |
| TypeScript: `npm run typecheck` | Correcto |
| ESLint: `npm run lint` | Correcto |
| API: `node ace test` con MySQL aislado | **27 pruebas aprobadas**: 15 unitarias y 12 funcionales |
| API: `npm run build` | Compilación correcta |
| Flutter: `flutter analyze --no-pub` | Sin incidencias |
| Flutter: `flutter test --no-pub --coverage` | **32 pruebas aprobadas** |
| Flutter: `flutter build web --release --no-pub` | Compilación web correcta |
| Repositorios Flutter contra Adonis y MySQL reales | **1 prueba aprobada** |
| Capturas del renderer de Flutter | **1 prueba aprobada**, seis PNG |

La ejecución normal de Flutter omite dos pruebas que se activan explícitamente: la integración con API real y la generación de capturas. Ambas se ejecutaron también por separado. Las pruebas de widgets conservan las pantallas, los controladores y los repositorios reales y sustituyen únicamente el transporte HTTP.

Como comprobación adicional se generaron **60 tableros 6×6** (20 por dificultad) y se probaron **2,160 pistas** sobre sus prefijos. Las mismas soluciones y sus 2,160 pasos fueron aceptados por `GameRules` en Dart. También se comprobaron desvíos, recorridos inválidos, puntajes y búsqueda de soluciones.

## Regresiones corregidas durante las pruebas

- El formulario de registro podía salir dos veces porque las notificaciones de carga se interpretaban como un cierre de sesión. Ahora solo se vacía la navegación al pasar de autenticado a no autenticado.
- Login y registro exponían el tipo interno `auth_token`. El contrato HTTP ahora devuelve `bearer`, como espera la prueba de autenticación.
- La lectura de errores suponía objetos VineJS y fallaba ante las cadenas devueltas por la validación de caminos.
- Una pista tras un desvío podía repetir una celda. Ahora indica el primer paso distinto de la solución de referencia y Flutter conserva únicamente el prefijo correspondiente.
- Se corrigieron los problemas de formato y una variable que ocultaba otra en el backend para que ESLint también termine sin errores.

## Evidencias visuales

Estas capturas son de widgets renderizados por Flutter, con datos HTTP controlados de prueba. El resultado de 777 puntos es un valor de prueba para verificar que la interfaz muestra el resultado recibido. La persistencia real se verifica en las pruebas HTTP contra MySQL.

| Pantalla | Captura |
| --- | --- |
| Inicio de sesión | [01-login.png](evidence/01-login.png) |
| Partida en escritorio | [02-game-desktop.png](evidence/02-game-desktop.png) |
| Partida en pantalla de 390 × 844 | [03-game-mobile.png](evidence/03-game-mobile.png) |
| Resultado guardado | [04-result.png](evidence/04-result.png) |
| Perfil e historial | [05-profile.png](evidence/05-profile.png) |
| Ranking | [06-leaderboard.png](evidence/06-leaderboard.png) |

## Repetir las comprobaciones

Con Flutter y los paquetes instalados y el servicio MySQL local iniciado:

```powershell
./scripts/verify-flutter.ps1 -FlutterSdk C:\ruta\flutter
./scripts/verify-api.ps1 -FlutterSdk C:\ruta\flutter
```

Los scripts guardan salidas y códigos de retorno en `tmp/verification/` (excluido de Git). El segundo script requiere la base `zip_game_test`, inicia una API temporal, ejecuta la prueba HTTP real y detiene ese proceso al terminar. Las instrucciones completas están en [ejecucion-local.md](ejecucion-local.md).

No se compiló un APK ni se realizó una ejecución en un dispositivo Android. Se verificaron los gestos táctiles y de mouse en pruebas de widgets y la compilación de la aplicación web.
