import 'game_session.dart';

abstract class GameRepository {
  Future<GameSession> start(int levelId);
  Future<GameSession> getSession(int sessionId);
  Future<MoveResponse> move(int sessionId, List<int> path);
  Future<HintResponse> hint(int sessionId, List<int> path);
  Future<GameScore> complete(
    int sessionId,
    List<int> path, {
    required int elapsedSeconds,
    required int mistakesCount,
  });
  Future<void> abandon(int sessionId);
}
