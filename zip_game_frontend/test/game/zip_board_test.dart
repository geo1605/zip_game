import 'dart:ui' show PointerDeviceKind;

import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:zip_game_frontend/features/game/domain/game_rules.dart';
import 'package:zip_game_frontend/features/game/presentation/widgets/zip_board.dart';

import '../support/game_fakes.dart';

void main() {
  for (final kind in [PointerDeviceKind.touch, PointerDeviceKind.mouse]) {
    testWidgets('arrastra tres celdas con $kind sin duplicar eventos', (
      tester,
    ) async {
      final selected = <int>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: 360,
                child: ZipBoard(
                  rules: GameRules(testLevel),
                  path: const [],
                  onCell: selected.add,
                ),
              ),
            ),
          ),
        ),
      );
      final gesture = await tester.startGesture(
        tester.getCenter(find.byKey(const Key('cell_0'))),
        kind: kind,
      );
      await gesture.moveTo(tester.getCenter(find.byKey(const Key('cell_1'))));
      await tester.pump();
      final last = tester.getCenter(find.byKey(const Key('cell_2')));
      await gesture.moveTo(last);
      await gesture.moveTo(last + const Offset(1, 0));
      await gesture.up();
      expect(selected, [0, 1, 2]);
    });
  }
  testWidgets('no admite interacción mientras espera al servidor', (
    tester,
  ) async {
    final selected = <int>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 320,
            child: ZipBoard(
              rules: GameRules(testLevel),
              path: const [],
              onCell: selected.add,
              enabled: false,
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.byKey(const Key('cell_0')));
    expect(selected, isEmpty);
  });
}
