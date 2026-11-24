import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/game_repository.dart';
import '../domain/game_session.dart';
import 'game_models.dart';

class RemoteGameRepository implements GameRepository {
  RemoteGameRepository(this._api);

  final ApiClient _api;

  Map<String, dynamic> _data(dynamic response) =>
      (response as Map<String, dynamic>)['data'] as Map<String, dynamic>;

  @override
  Future<GameSession> start(int levelId) async => sessionFromJson(
    _data(await _api.post(ApiConstants.sessions, body: {'levelId': levelId})),
  );

  @override
  Future<GameSession> getSession(int sessionId) async =>
      sessionFromJson(_data(await _api.get(ApiConstants.session(sessionId))));

  @override
  Future<MoveResponse> move(int sessionId, List<int> path) async {
    final data = _data(
      await _api.post(
        ApiConstants.sessionMoves(sessionId),
        body: {'path': path},
      ),
    );
    return MoveResponse(
      isValid: data['isValid'] as bool,
      mistakesCount: data['mistakesCount'] as int,
      errors: (data['errors'] as List).cast<String>(),
    );
  }

  @override
  Future<HintResponse> hint(int sessionId, List<int> path) async {
    final data = _data(
      await _api.post(
        ApiConstants.sessionHint(sessionId),
        body: {'path': path},
      ),
    );
    final hint = data['hint'] as Map<String, dynamic>?;
    return HintResponse(
      hint: hint == null
          ? null
          : GameHint(cell: hint['cell'] as int, step: hint['step'] as int),
      hintsUsed: data['hintsUsed'] as int,
    );
  }

  @override
  Future<GameScore> complete(
    int sessionId,
    List<int> path, {
    required int elapsedSeconds,
    required int mistakesCount,
  }) async {
    final data = _data(
      await _api.post(
        ApiConstants.sessionComplete(sessionId),
        body: {
          'path': path,
          'elapsedSeconds': elapsedSeconds,
          'mistakesCount': mistakesCount,
        },
      ),
    );
    return scoreFromJson(data['score'] as Map<String, dynamic>);
  }

  @override
  Future<void> abandon(int sessionId) async {
    await _api.post(ApiConstants.sessionAbandon(sessionId));
  }
}
