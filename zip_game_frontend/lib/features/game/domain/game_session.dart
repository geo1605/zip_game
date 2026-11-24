import '../../levels/domain/entities/level.dart';

enum SessionStatus { inProgress, completed, abandoned }

class GameSession {
  const GameSession({
    required this.id,
    required this.level,
    required this.status,
    required this.startedAt,
    this.elapsedSeconds = 0,
    this.mistakesCount = 0,
    this.hintsUsed = 0,
    this.score,
  });

  final int id;
  final Level level;
  final SessionStatus status;
  final DateTime startedAt;
  final int elapsedSeconds;
  final int mistakesCount;
  final int hintsUsed;
  final GameScore? score;
}

/// Siempre procede del servidor; el cliente no calcula ni envía puntos.
class GameScore {
  const GameScore({
    required this.id,
    required this.sessionId,
    required this.points,
    required this.elapsedSeconds,
    required this.mistakesCount,
    required this.hintsUsed,
  });

  final int id;
  final int sessionId;
  final int points;
  final int elapsedSeconds;
  final int mistakesCount;
  final int hintsUsed;
}

class GameHint {
  const GameHint({required this.cell, required this.step});

  final int cell;

  /// Posición en el recorrido, empezando en uno.
  final int step;
}

class HintResponse {
  const HintResponse({required this.hint, required this.hintsUsed});

  final GameHint? hint;
  final int hintsUsed;
}

class MoveResponse {
  const MoveResponse({
    required this.isValid,
    required this.mistakesCount,
    required this.errors,
  });

  final bool isValid;
  final int mistakesCount;
  final List<String> errors;
}
