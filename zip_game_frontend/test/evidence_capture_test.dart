import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:zip_game_frontend/app/app.dart';

import 'support/app_harness.dart';
import 'support/game_fakes.dart';

/// Capturas reproducibles del renderer real de Flutter con transporte simulado.
/// ZIP_FLUTTER_ROOT debe señalar al SDK para cargar la fuente Roboto.
void main() {
  testWidgets('captura login, tablero, resultado, perfil y ranking', (
    tester,
  ) async {
    final sdk =
        Platform.environment['ZIP_FLUTTER_ROOT'] ??
        Platform.environment['FLUTTER_ROOT'];
    if (sdk == null) {
      throw StateError('Define ZIP_FLUTTER_ROOT con la ruta al SDK.');
    }
    await tester.runAsync(() async {
      for (final entry in {
        'Roboto': 'Roboto-Regular.ttf',
        'MaterialIcons': 'MaterialIcons-Regular.otf',
      }.entries) {
        final bytes = await File(
          '$sdk/bin/cache/artifacts/material_fonts/${entry.value}',
        ).readAsBytes();
        final font = FontLoader(entry.key)
          ..addFont(Future.value(ByteData.sublistView(bytes)));
        await font.load();
      }
    });
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final harness = AppHarness();
    const boundaryKey = Key('capture_boundary');
    await tester.pumpWidget(
      RepaintBoundary(
        key: boundaryKey,
        child: ZipGameApp(dependencies: harness.dependencies),
      ),
    );
    await tester.pumpAndSettle();

    Future<void> capture(String name) async {
      await tester.pumpAndSettle();
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(boundaryKey),
      );
      await tester.runAsync(() async {
        final image = await boundary.toImage();
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        final directory = Directory('../docs/evidence');
        await directory.create(recursive: true);
        await File('${directory.path}/$name.png')
            .writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
      });
    }

    await capture('01-login');
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
    await tester.tap(find.byKey(const Key('home_quick_play')));
    await tester.pumpAndSettle();
    for (final cell in solution.take(11)) {
      await tester.tap(find.byKey(Key('cell_$cell')));
      await tester.pump();
    }
    await capture('02-game-desktop');
    await tester.binding.setSurfaceSize(const Size(390, 844));
    await tester.pumpAndSettle();
    await capture('03-game-mobile');
    await tester.binding.setSurfaceSize(const Size(1000, 1000));
    await tester.pumpAndSettle();
    for (final cell in solution.skip(11)) {
      await tester.tap(find.byKey(Key('cell_$cell')));
      await tester.pump();
    }
    await tester.ensureVisible(find.byKey(const Key('game_complete')));
    await tester.tap(find.byKey(const Key('game_complete')));
    await tester.pumpAndSettle();
    await capture('04-result');
    await tester.tap(find.text('Ver mi perfil e historial'));
    await tester.pumpAndSettle();
    await capture('05-profile');
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ver ranking'));
    await tester.pumpAndSettle();
    await capture('06-leaderboard');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  }, skip: !const bool.fromEnvironment('CAPTURE_EVIDENCE'));
}
