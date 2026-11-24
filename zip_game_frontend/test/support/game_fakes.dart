import 'dart:async';

import 'package:zip_game_frontend/features/game/domain/game_repository.dart';
import 'package:zip_game_frontend/features/game/domain/game_session.dart';
import 'package:zip_game_frontend/features/levels/domain/entities/level.dart';
import 'package:zip_game_frontend/features/levels/domain/repositories/levels_repository.dart';

const testLevel = Level(
  id: 1,
  name: 'Serpiente 6×6',
  difficulty: 'easy',
  size: 6,
  checkpoints: [0, 5, 12, 30],
);
const solution = [
  0,
  1,
  2,
  3,
  4,
  5,
  11,
  10,
  9,
  8,
  7,
  6,
  12,
  13,
  14,
  15,
  16,
  17,
  23,
  22,
  21,
  20,
  19,
  18,
  24,
  25,
  26,
  27,
  28,
  29,
  35,
  34,
  33,
  32,
  31,
  30,
];
const testScore = GameScore(
  id: 9,
  sessionId: 1,
  points: 777,
  elapsedSeconds: 40,
  mistakesCount: 2,
  hintsUsed: 1,
);

class FakeLevelsRepository implements LevelsRepository {
  List<Level> levels = [testLevel];
  String recommended = 'easy';
  String? generatedDifficulty;

  @override
  Future<LevelsPageData> getLevels({String? difficulty}) async =>
      LevelsPageData(levels: levels, recommendedDifficulty: recommended);
  @override
  Future<Level> getLevel(int id) async => testLevel;
  @override
  Future<Level> generate(String difficulty) async {
    generatedDifficulty = difficulty;
    return testLevel;
  }
}

class FakeGameRepository implements GameRepository {
  final calls = <String>[];
  final paths = <List<int>>[];
  int starts = 0;
  int completions = 0;
  int hints = 0;
  int? submittedMistakes;
  int? submittedSeconds;
  bool saved = false;
  bool abandoned = false;
  Object? moveError;
  Object? completeError;
  Object? abandonError;
  Completer<void>? moveGate;
  Completer<void>? startGate;
  HintResponse hintResponse = const HintResponse(
    hint: GameHint(cell: 1, step: 2),
    hintsUsed: 1,
  );

  GameSession _session() => GameSession(
    id: starts,
    level: testLevel,
    status: saved
        ? SessionStatus.completed
        : abandoned
        ? SessionStatus.abandoned
        : SessionStatus.inProgress,
    startedAt: DateTime.utc(2026, 11, 24),
    score: saved ? testScore : null,
  );

  @override
  Future<GameSession> start(int levelId) async {
    calls.add('start:$levelId');
    starts++;
    saved = false;
    abandoned = false;
    if (startGate != null) await startGate!.future;
    return _session();
  }

  @override
  Future<GameSession> getSession(int sessionId) async {
    calls.add('get:$sessionId');
    return _session();
  }

  @override
  Future<MoveResponse> move(int sessionId, List<int> path) async {
    calls.add('move:$sessionId');
    paths.add(List.of(path));
    if (moveGate != null) await moveGate!.future;
    if (moveError != null) throw moveError!;
    return const MoveResponse(isValid: true, mistakesCount: 0, errors: []);
  }

  @override
  Future<HintResponse> hint(int sessionId, List<int> path) async {
    hints++;
    calls.add('hint:$sessionId');
    return hintResponse;
  }

  @override
  Future<GameScore> complete(
    int sessionId,
    List<int> path, {
    required int elapsedSeconds,
    required int mistakesCount,
  }) async {
    calls.add('complete:$sessionId');
    completions++;
    submittedMistakes = mistakesCount;
    submittedSeconds = elapsedSeconds;
    if (completeError != null) throw completeError!;
    saved = true;
    return testScore;
  }

  @override
  Future<void> abandon(int sessionId) async {
    calls.add('abandon:$sessionId');
    if (abandonError != null) throw abandonError!;
    abandoned = true;
  }
}
