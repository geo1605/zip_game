import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:zip_game_frontend/core/errors/api_exception.dart';
import 'package:zip_game_frontend/features/game/domain/game_session.dart';
import 'package:zip_game_frontend/features/game/presentation/controllers/game_controller.dart';

import '../support/game_fakes.dart';

void main() {
  late FakeGameRepository games;
  late FakeLevelsRepository levels;
  late GameController controller;

  setUp(() {
    games = FakeGameRepository();
    levels = FakeLevelsRepository();
    controller = GameController(games, levels);
  });
  tearDown(() => controller.dispose());

  test(
    'juego rápido usa un nivel pendiente de la dificultad recomendada',
    () async {
      await controller.start();
      expect(controller.phase, GamePhase.playing);
      expect(games.calls.first, 'start:1');
      expect(levels.generatedDifficulty, isNull);
    },
  );

  test('genera un nivel adaptativo si no hay candidato pendiente', () async {
    levels.levels = [];
    levels.recommended = 'hard';
    await controller.start();
    expect(levels.generatedDifficulty, 'hard');
  });

  test(
    'valida localmente y deshacer conserva los errores acumulados',
    () async {
      await controller.start(levelId: 1);
      controller.selectCell(1);
      expect(controller.path, isEmpty);
      expect(controller.mistakesCount, 1);
      controller.selectCell(0);
      controller.selectCell(1);
      controller.undo();
      expect(controller.path, [0]);
      expect(controller.mistakesCount, 1);
      expect(() => controller.path.add(2), throwsUnsupportedError);
      await controller.retrySync();
    },
  );

  test(
    'serializa y agrupa arrastres sin dejar un recorrido obsoleto en cola',
    () async {
      await controller.start(levelId: 1);
      games.moveGate = Completer<void>();
      for (final cell in [0, 1, 2, 3]) {
        controller.selectCell(cell);
      }
      controller.undo();
      expect(games.paths, [
        [0],
      ]);
      games.moveGate!.complete();
      await controller.retrySync();
      expect(games.paths.last, [0, 1, 2]);
      expect(games.paths.length, 2);
    },
  );

  test(
    'fallo de red no borra el camino y permite volver a sincronizar',
    () async {
      await controller.start(levelId: 1);
      games.moveError = ApiException('Sin conexión');
      controller.selectCell(0);
      await controller.retrySync();
      expect(controller.path, [0]);
      expect(controller.syncError, contains('Sin conexión'));
      games.moveError = null;
      await controller.retrySync();
      expect(controller.syncError, isNull);
    },
  );

  test(
    'la pista corrige el desvío y conserva el contador del servidor',
    () async {
      await controller.start(levelId: 1);
      controller.selectCell(0);
      controller.selectCell(6);
      await controller.requestHint();
      expect(controller.path, [0]);
      expect(controller.hintCell, 1);
      expect(controller.hintsUsed, 1);
      expect(controller.notice, contains('corrigió'));
    },
  );

  test('no permite doble pista ni movimientos durante la consulta', () async {
    await controller.start(levelId: 1);
    games.moveGate = Completer<void>();
    controller.selectCell(0);
    final hint = controller.requestHint();
    controller.selectCell(1);
    await controller.requestHint();
    expect(controller.path, [0]);
    games.moveGate!.complete();
    await hint;
    expect(games.hints, 1);
  });

  test('una pista malformada no altera el camino', () async {
    await controller.start(levelId: 1);
    controller.selectCell(0);
    games.hintResponse = const HintResponse(
      hint: GameHint(cell: 35, step: 2),
      hintsUsed: 1,
    );
    await controller.requestHint();
    expect(controller.path, [0]);
    expect(controller.error, isNotNull);
    expect(controller.hintsUsed, 1);
  });

  test('solo envía una solución completa y muestra el puntaje real', () async {
    await controller.start(levelId: 1);
    await controller.complete();
    expect(games.completions, 0);
    controller.selectCell(2); // Error local incluido en la finalización.
    for (final cell in solution) {
      controller.selectCell(cell);
    }
    expect(controller.canComplete, isTrue);
    await controller.complete();
    expect(games.submittedMistakes, 1);
    expect(controller.score?.points, 777);
    expect(controller.elapsedSeconds, 40);
    expect(controller.phase, GamePhase.completed);
    controller.undo();
    await controller.complete();
    expect(games.completions, 1);
    expect(controller.path, solution);
  });

  test(
    'recupera un resultado ya guardado cuando la respuesta se pierde',
    () async {
      await controller.start(levelId: 1);
      for (final cell in solution) {
        controller.selectCell(cell);
      }
      games.saved = true;
      games.completeError = ApiException('Tiempo de espera agotado');
      await controller.complete();
      expect(controller.phase, GamePhase.completed);
      expect(controller.score?.points, 777);
      expect(games.calls.last, 'get:1');
    },
  );

  test(
    'rechazo de la solución conserva el camino y el contador de errores',
    () async {
      await controller.start(levelId: 1);
      for (final cell in solution) {
        controller.selectCell(cell);
      }
      games.completeError = ApiException(
        'Rechazado',
        statusCode: 422,
        details: {'mistakesCount': 3},
      );
      await controller.complete();
      expect(controller.phase, GamePhase.playing);
      expect(controller.path, solution);
      expect(controller.mistakesCount, 3);
      expect(controller.score, isNull);
    },
  );

  test('reinicia abandonando la sesión anterior antes de crear otra', () async {
    await controller.start(levelId: 1);
    controller.selectCell(0);
    await controller.restart();
    expect(
      games.calls.indexOf('abandon:1'),
      lessThan(games.calls.lastIndexOf('start:1')),
    );
    expect(controller.session?.id, 2);
    expect(controller.path, isEmpty);
    expect(controller.phase, GamePhase.playing);
  });

  test('si abandonar falla, reiniciar no crea una segunda partida', () async {
    await controller.start(levelId: 1);
    controller.selectCell(0);
    games.abandonError = ApiException('Sin conexión');
    await controller.restart();
    expect(games.starts, 1);
    expect(controller.path, [0]);
    expect(controller.error, contains('Sin conexión'));
  });

  test(
    'el tiempo enviado incluye el tiempo que la app pasó en segundo plano',
    () async {
      controller.dispose();
      var time = DateTime.utc(2026, 11, 24);
      controller = GameController(games, levels, now: () => time);
      await controller.start(levelId: 1);
      for (final cell in solution) {
        controller.selectCell(cell);
      }
      time = time.add(const Duration(minutes: 2));
      await controller.complete();
      expect(games.submittedSeconds, 120);
    },
  );

  test('liberar durante el inicio evita notificaciones tardías y abandona la sesión', () async {
    games.startGate = Completer<void>();
    final local = GameController(games, levels);
    final start = local.start(levelId: 1);
    local.dispose();
    games.startGate!.complete();
    await start;
    expect(games.calls, ['start:1', 'abandon:1']);
  });
}
