import 'package:flutter_test/flutter_test.dart';
import 'package:zip_game_frontend/features/game/domain/game_rules.dart';
import 'package:zip_game_frontend/features/levels/domain/entities/level.dart';

import '../support/game_fakes.dart';

void main() {
  final rules = GameRules(testLevel);

  test('exige iniciar en 1 y rechaza celdas fuera del tablero', () {
    expect(rules.checkMove([], 0), isNull);
    expect(rules.checkMove([], 1), MoveViolation.startAtFirst);
    expect(rules.checkMove([0], -1), MoveViolation.outsideBoard);
    expect(rules.checkMove([0], 36), MoveViolation.outsideBoard);
  });

  test('rechaza diagonales, saltos y el salto entre filas', () {
    expect(rules.checkMove([0], 7), MoveViolation.notAdjacent);
    expect(rules.checkMove([0], 2), MoveViolation.notAdjacent);
    expect(
      rules.checkMove(solution.take(6).toList(), 6),
      MoveViolation.notAdjacent,
    );
  });

  test('no permite repetir celdas ni saltarse números', () {
    expect(rules.checkMove([0, 1], 0), MoveViolation.repeatedCell);
    expect(rules.checkMove([0, 6], 12), MoveViolation.checkpointOrder);
    expect(rules.nextClue([0, 1]), 2);
    expect(rules.nextClue(solution.take(6).toList()), 3);
  });

  test('el último número solo se visita al llenar todo el tablero', () {
    expect(
      rules.checkMove([...solution.take(24), 24], 30),
      MoveViolation.finishTooEarly,
    );
  });

  test('acepta los 36 pasos y exige una solución completa válida', () {
    for (var i = 0; i < solution.length; i++) {
      expect(rules.checkMove(solution.take(i).toList(), solution[i]), isNull);
    }
    expect(rules.isComplete(solution), isTrue);
    expect(rules.nextClue(solution), isNull);
    expect(rules.isComplete(solution.take(35).toList()), isFalse);
    expect(rules.isComplete(List.filled(36, 0)), isFalse);
  });

  test('rechaza niveles malformados antes de iniciar', () {
    expect(
      () => GameRules(
        const Level(
          id: 2,
          name: 'Inválido',
          difficulty: 'easy',
          size: 6,
          checkpoints: [0, 0],
        ),
      ),
      throwsFormatException,
    );
  });
}
