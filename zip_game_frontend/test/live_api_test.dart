import 'package:flutter_test/flutter_test.dart';
import 'package:zip_game_frontend/core/network/api_client.dart';
import 'package:zip_game_frontend/core/network/token_storage.dart';
import 'package:zip_game_frontend/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:zip_game_frontend/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:zip_game_frontend/features/game/data/remote_game_repository.dart';
import 'package:zip_game_frontend/features/game/domain/game_rules.dart';
import 'package:zip_game_frontend/features/game/domain/game_session.dart';
import 'package:zip_game_frontend/features/levels/data/datasources/levels_remote_datasource.dart';
import 'package:zip_game_frontend/features/levels/data/repositories/levels_repository_impl.dart';
import 'package:zip_game_frontend/features/profile/data/profile_repository_impl.dart';
import 'package:zip_game_frontend/features/leaderboard/data/leaderboard_repository_impl.dart';

/// Ejecutar contra una API y una base de datos de pruebas: crea datos reales.
/// flutter test test/live_api_test.dart --dart-define=RUN_LIVE_API=true
///   --dart-define=API_URL=http://localhost:3334/api
void main() {
  test(
    'repositorios Flutter ↔ Adonis ↔ MySQL: flujo real completo',
    () async {
      final storage = MemoryTokenStorage();
      final api = ApiClient(tokenStorage: storage);
      final auth = AuthRepositoryImpl(AuthRemoteDataSource(api), storage);
      final levels = LevelsRepositoryImpl(LevelsRemoteDataSource(api));
      final games = RemoteGameRepository(api);
      final profile = ProfileRepositoryImpl(api);
      final ranking = LeaderboardRepositoryImpl(api);
      final user = await auth.register(
        fullName: 'Integration Flutter',
        email: 'flutter-${DateTime.now().microsecondsSinceEpoch}@zipgame.test',
        password: 'integration-test-password',
      );
      try {
        final level = await levels.generate('easy');
        expect(level.size, 6);
        final session = await games.start(level.id);
        final rules = GameRules(level);
        final path = <int>[];
        // Obtiene la ruta por el contrato público de pistas, sin leer la BD
        // ni depender de una solución expuesta en el JSON del nivel.
        while (path.length < 36) {
          final response = await games.hint(session.id, path);
          final hint = response.hint!;
          expect(hint.step, path.length + 1);
          expect(rules.checkMove(path, hint.cell), isNull);
          path.add(hint.cell);
        }
        expect((await games.move(session.id, path)).isValid, isTrue);
        final score = await games.complete(
          session.id,
          path,
          elapsedSeconds: 1,
          mistakesCount: 0,
        );
        expect(score.hintsUsed, 36);
        expect(score.points, 100); // El puntaje mínimo es 10 % de la base de 1000 puntos.
        final saved = await games.getSession(session.id);
        expect(saved.status, SessionStatus.completed);
        expect(saved.score?.id, score.id);
        expect((await profile.getHistory()).first.id, session.id);
        expect((await profile.getProfile()).completedLevelsCount, 1);
        expect((await levels.getLevel(level.id)).completed, isTrue);
        expect(
          (await ranking.top(limit: 100)).any((row) => row.userId == user.id),
          isTrue,
        );
      } finally {
        await auth.logout();
        expect(await storage.read(), isNull);
      }
    },
    skip: !const bool.fromEnvironment('RUN_LIVE_API'),
    timeout: const Timeout(Duration(minutes: 3)),
  );
}
