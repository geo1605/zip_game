import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:zip_game_frontend/app/app.dart';
import 'package:zip_game_frontend/app/routes/app_routes.dart';
import 'package:zip_game_frontend/features/game/presentation/widgets/zip_board.dart';

import 'support/app_harness.dart';
import 'support/game_fakes.dart';

Future<void> login(WidgetTester tester, AppHarness harness) async {
  await tester.pumpWidget(ZipGameApp(dependencies: harness.dependencies));
  await tester.pumpAndSettle();
  await tester.enterText(
    find.byKey(const Key('login_email')),
    'player@zipgame.test',
  );
  await tester.enterText(
    find.byKey(const Key('login_password')),
    'password123',
  );
  await tester.tap(find.text('Entrar'));
  await tester.pumpAndSettle();
}

Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'login → niveles → juego → resultado → perfil → ranking → logout',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1000, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      final harness = AppHarness();
      await login(tester, harness);
      expect(find.text('¡Hola, Jugador ZIP!'), findsOneWidget);
      await tester.tap(find.text('Niveles'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('level_1')));
      await tester.pumpAndSettle();
      expect(find.byType(ZipBoard), findsOneWidget);
      await tester.tap(find.byKey(const Key('cell_0')));
      await tester.pumpAndSettle();
      await tapVisible(tester, find.byKey(const Key('game_hint')));
      expect(find.text('1 pistas'), findsOneWidget);
      await tester.tap(find.byKey(const Key('cell_1')));
      await tester.pumpAndSettle();
      await tapVisible(tester, find.byKey(const Key('game_undo')));
      expect(find.text('1/36 celdas'), findsOneWidget);
      for (final cell in solution.skip(1)) {
        await tester.tap(find.byKey(Key('cell_$cell')));
        await tester.pump();
      }
      expect(find.text('36/36 celdas'), findsOneWidget);
      await tapVisible(tester, find.byKey(const Key('game_complete')));
      expect(find.text('777 puntos'), findsOneWidget);
      expect(find.text('Resultado validado y guardado'), findsOneWidget);
      await tester.tap(find.text('Ver mi perfil e historial'));
      await tester.pumpAndSettle();
      expect(find.text('Jugador ZIP'), findsOneWidget);
      expect(find.text('777 pts'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ver ranking'));
      await tester.pumpAndSettle();
      expect(find.text('777'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continuar'));
      await tester.pumpAndSettle();
      expect(find.text('777 pts'), findsOneWidget);
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Cerrar sesión'));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('login_email')), findsOneWidget);
      expect(await harness.storage.read(), isNull);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('registro muestra home y guarda la sesión', (tester) async {
    final harness = AppHarness();
    await tester.pumpWidget(ZipGameApp(dependencies: harness.dependencies));
    await tester.pumpAndSettle();
    await tester.tap(find.text('¿No tienes cuenta? Regístrate'));
    await tester.pumpAndSettle();
    for (final entry in {
      'register_full_name': 'Jugador ZIP',
      'register_email': 'player@zipgame.test',
      'register_password': 'password123',
      'register_confirm': 'password123',
    }.entries) {
      await tester.enterText(find.byKey(Key(entry.key)), entry.value);
    }
    await tapVisible(tester, find.text('Registrarme'));
    expect(find.text('¡Hola, Jugador ZIP!'), findsOneWidget);
    expect(await harness.storage.read(), 'test-token');
    expect(tester.takeException(), isNull);
  });

  testWidgets('ruta de juego sin autenticación muestra login', (tester) async {
    final harness = AppHarness();
    await tester.pumpWidget(ZipGameApp(dependencies: harness.dependencies));
    await tester.pumpAndSettle();
    final context = tester.element(find.byKey(const Key('login_email')));
    Navigator.of(context).pushNamed(AppRoutes.game);
    await tester.pumpAndSettle();
    expect(find.byType(ZipBoard), findsNothing);
    expect(
      harness.requests.where((r) => r.url.path.contains('/sessions')),
      isEmpty,
    );
  });

  testWidgets('401 durante juego vuelve a login sin notificaciones tardías', (
    tester,
  ) async {
    final harness = AppHarness();
    await login(tester, harness);
    await tester.tap(find.byKey(const Key('home_quick_play')));
    await tester.pumpAndSettle();
    harness.expire = true;
    await tester.tap(find.byKey(const Key('cell_0')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('login_email')), findsOneWidget);
    expect(find.byType(ZipBoard), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('pantalla de 320 px permite jugar y confirmar un reinicio', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 740));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final harness = AppHarness();
    await login(tester, harness);
    await tapVisible(tester, find.byKey(const Key('home_quick_play')));
    await tester.tap(find.byKey(const Key('cell_0')));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.byKey(const Key('game_restart')));
    await tester.tap(find.widgetWithText(FilledButton, 'Reiniciar'));
    await tester.pumpAndSettle();
    expect(harness.sessionId, 2);
    expect(find.text('0/36 celdas'), findsOneWidget);
    expect(tester.takeException(), isNull);
    // Finaliza la pantalla y su Timer antes de terminar la prueba.
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
