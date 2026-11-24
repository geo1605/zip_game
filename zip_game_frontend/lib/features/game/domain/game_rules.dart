import '../../levels/domain/entities/level.dart';

enum MoveViolation {
  outsideBoard,
  startAtFirst,
  repeatedCell,
  notAdjacent,
  checkpointOrder,
  finishTooEarly,
}

/// Reglas locales de ZIP. La API vuelve a validar el recorrido al finalizar.
class GameRules {
  GameRules(Level level)
    : size = level.size,
      checkpoints = List.unmodifiable(level.checkpoints) {
    if (size < 2 ||
        size > 8 ||
        checkpoints.length < 2 ||
        checkpoints.toSet().length != checkpoints.length ||
        checkpoints.any((cell) => cell < 0 || cell >= totalCells)) {
      throw const FormatException(
        'El nivel recibido no tiene un tablero válido.',
      );
    }
  }

  final int size;
  final List<int> checkpoints;
  int get totalCells => size * size;

  int? clueAt(int cell) {
    final index = checkpoints.indexOf(cell);
    return index < 0 ? null : index + 1;
  }

  int? nextClue(List<int> path) {
    final visited = path.toSet();
    final index = checkpoints.indexWhere((cell) => !visited.contains(cell));
    return index < 0 ? null : index + 1;
  }

  bool areAdjacent(int a, int b) =>
      ((a ~/ size) - (b ~/ size)).abs() + ((a % size) - (b % size)).abs() == 1;

  MoveViolation? checkMove(List<int> path, int cell) {
    if (cell < 0 || cell >= totalCells) return MoveViolation.outsideBoard;
    if (path.isEmpty) {
      return cell == checkpoints.first ? null : MoveViolation.startAtFirst;
    }
    if (path.contains(cell)) return MoveViolation.repeatedCell;
    if (!areAdjacent(path.last, cell)) return MoveViolation.notAdjacent;
    final clue = clueAt(cell);
    if (clue != null && clue != nextClue(path)) {
      return MoveViolation.checkpointOrder;
    }
    if (cell == checkpoints.last && path.length != totalCells - 1) {
      return MoveViolation.finishTooEarly;
    }
    return null;
  }

  bool isComplete(List<int> path) {
    if (path.length != totalCells) return false;
    final prefix = <int>[];
    for (final cell in path) {
      if (checkMove(prefix, cell) != null) return false;
      prefix.add(cell);
    }
    return path.last == checkpoints.last && nextClue(path) == null;
  }
}
