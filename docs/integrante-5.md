# Integrante 5: juego e integración Flutter

## Entregables y commits

| Commit | Entregable |
| --- | --- |
| 21 — `feat(game): implement ZIP game domain and rules` | Entidades de partida, puntaje, pistas y respuestas; contrato de repositorio; reglas locales y pruebas. |
| 22 — `feat(game): implement remote game repository` | Conversión JSON y conexión con las seis operaciones de partidas de Adonis; errores Vine y errores de recorrido. |
| 23 — `feat(game): implement game controller and state management` | Estado, cronómetro, serialización de movimientos, deshacer, reinicio, pistas y recuperación de resultados. |
| 24 — `feat(ui): implement interactive 6x6 game board` | Tablero táctil y mouse, HUD, ayuda, confirmaciones, resumen, rutas y dependencias. |
| 25 — `test(app): complete integration tests and technical documentation` | Pruebas de flujo y regresión, correcciones de integración, ejecución reproducible, evidencias y documentación. |

## Arquitectura y flujo

`GamePage` crea un `GameController` con `GameRepository` y `LevelsRepository` desde `AppScope`. La implementación `RemoteGameRepository` usa el mismo `ApiClient` autenticado que las demás funcionalidades.

El dominio utiliza índices de celda de 0 a 35, ordenados por filas. La fila es `cell ~/ 6`, la columna es `cell % 6`. Los números del tablero se obtienen de las pistas públicas del nivel; la solución no se descarga con el nivel.

`GameRules` comprueba límites, inicio en 1, adyacencia ortogonal, celdas repetidas, orden de números y llegada al último número al llenar el tablero. El tamaño se adapta al `gridSize` recibido; juego rápido selecciona tableros 6×6.

El controlador expone estados `loading`, `playing`, `completed`, `abandoned` y `failed`. `busy` bloquea acciones incompatibles mientras se consulta una pista, se finaliza o se abandona. Los caminos expuestos a la UI son inmutables. Al destruir la pantalla se cancela el temporizador y se ignoran respuestas tardías.

## Contrato HTTP

Todas las rutas usan el prefijo `/api` y `Authorization: Bearer <token>`.

| Operación | Método y ruta | Datos enviados |
| --- | --- | --- |
| Iniciar | `POST /sessions` | `levelId` |
| Recuperar estado/resultado | `GET /sessions/:id` | — |
| Validar movimiento | `POST /sessions/:id/moves` | `path` completo actual |
| Pedir pista | `POST /sessions/:id/hint` | `path` actual |
| Finalizar | `POST /sessions/:id/complete` | `path`, `elapsedSeconds`, `mistakesCount` |
| Abandonar | `POST /sessions/:id/abandon` | — |

El cliente no envía `points` ni el contador autoritativo de pistas. El resumen utiliza exclusivamente `data.score` de la API. El servidor conserva como mínimo su propio tiempo y errores y obtiene las pistas desde la sesión persistida.

## Decisiones de integración

- **Interacción inmediata:** se valida localmente antes de cambiar el dibujo. Las peticiones de movimientos se serializan y se agrupan para enviar el último recorrido completo cuando hay arrastres rápidos.
- **Deshacer:** quita un paso local y sincroniza el prefijo restante. No borra errores ni pistas acumuladas.
- **Reiniciar:** abandona la sesión antes de crear otra. Si abandonar falla, conserva la partida y permite reintentar.
- **Tiempo:** se calcula con la diferencia entre instantes, no contando ticks; incluye el tiempo pasado en segundo plano. El backend mantiene la autoridad al finalizar.
- **Conexión:** un error de sincronización conserva el recorrido. Las operaciones de resultado y abandono consultan el estado persistido cuando la respuesta falla; así se recupera una transacción completada cuya respuesta se perdió.
- **Pistas tras un desvío:** la API devuelve el primer paso distinto del prefijo de la solución de referencia. Flutter conserva ese prefijo y resalta la celda que sigue. Esto corrige el comportamiento anterior que podía recomendar una celda repetida.
- **Errores de API:** se aceptan tanto `errors: string[]` del juego como `errors: {message, field, rule}[]` de VineJS.
- **Perfil y ranking:** el resumen navega a las pantallas existentes, que consultan datos persistidos. Al volver a la lista se recargan los niveles y sus puntajes.
- **Autenticación:** las rutas privadas comprueban el estado autenticado y un HTTP 401 vuelve al login.
- **Registro:** solo se vacía la navegación cuando termina una sesión autenticada. Las notificaciones de carga o error de un formulario no cierran la pantalla de registro.

## Alcance de persistencia

Las sesiones, movimientos, pistas y puntajes se guardan en MySQL. El recorrido editable vive en el controlador durante la pantalla de juego; recargar el navegador o cerrar la aplicación no restaura ese recorrido, porque la API actual no expone una instantánea del camino activo. Salir mediante la navegación de la aplicación sí registra el abandono.

## Pruebas

- Reglas: diagonales, saltos entre filas, inicio incorrecto, repeticiones, orden, final prematuro, tablero malformado y solución completa.
- Repositorio: token, JSON, payload sin puntaje, respuestas 401 y los dos formatos de errores.
- Controlador: dificultad adaptativa, arrastre con peticiones pendientes, deshacer, pista correctiva, fallos de red, doble envío, recuperación de resultados, reinicio y liberación durante operaciones asíncronas.
- Widgets y flujo: login y registro, niveles, partida, pista, deshacer, resultado, perfil, ranking, logout, rutas privadas, expiración y pantalla estrecha.
- API: flujo 6×6 contra MySQL, puntuación en servidor, recuperación, historial, perfil, ranking y revocación del token.
- Integración HTTP real: los repositorios Flutter hablan directamente con Adonis y MySQL.

Los resultados efectivamente ejecutados se registran en [verificacion.md](verificacion.md); la existencia de una prueba no equivale a haberla ejecutado.
