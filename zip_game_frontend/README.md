# ZIP Game — Flutter

Cliente para web y Android con autenticación, niveles, tablero interactivo, pistas, cronómetro, resultados, perfil, historial y ranking.

Requiere Flutter 3.50.1 / Dart 3.14 y la API AdonisJS en ejecución.

```sh
flutter pub get
flutter run -d chrome --dart-define=API_URL=http://localhost:3333/api
```

En un emulador Android cambia `localhost` por `10.0.2.2`.

```sh
flutter analyze
flutter test --coverage
flutter build web --release
```

- [Preparación de API y MySQL](../docs/ejecucion-local.md)
- [Arquitectura, reglas y contrato de partidas](../docs/integrante-5.md)
- [Resultados de pruebas y capturas](../docs/verificacion.md)

`test/live_api_test.dart` se activa con `--dart-define=RUN_LIVE_API=true` y una `API_URL` de pruebas. `test/evidence_capture_test.dart` genera capturas con `--dart-define=CAPTURE_EVIDENCE=true` y `ZIP_FLUTTER_ROOT` apuntando al SDK. Ambas se omiten en la ejecución habitual porque necesitan recursos externos; los scripts de `../scripts/` las ejecutan explícitamente.
