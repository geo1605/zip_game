import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zip_game_frontend/app/app_scope.dart';
import 'package:zip_game_frontend/core/network/api_client.dart';
import 'package:zip_game_frontend/core/network/token_storage.dart';
import 'package:zip_game_frontend/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:zip_game_frontend/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:zip_game_frontend/features/leaderboard/data/leaderboard_repository_impl.dart';
import 'package:zip_game_frontend/features/levels/data/datasources/levels_remote_datasource.dart';
import 'package:zip_game_frontend/features/levels/data/repositories/levels_repository_impl.dart';
import 'package:zip_game_frontend/features/profile/data/profile_repository_impl.dart';

import 'game_fakes.dart';

/// Transporte HTTP simulado; repositorios, controladores y pantallas reales.
class AppHarness {
  AppHarness() {
    api = ApiClient(tokenStorage: storage, httpClient: MockClient(_respond));
    dependencies = AppDependencies(
      apiClient: api,
      authRepository: AuthRepositoryImpl(AuthRemoteDataSource(api), storage),
      levelsRepository: LevelsRepositoryImpl(LevelsRemoteDataSource(api)),
      leaderboardRepository: LeaderboardRepositoryImpl(api),
      profileRepository: ProfileRepositoryImpl(api),
    );
    api.onUnauthorized = () {
      storage.clear();
      dependencies.authController.expire();
    };
  }
  final storage = MemoryTokenStorage();
  late final ApiClient api;
  late final AppDependencies dependencies;
  final requests = <http.Request>[];
  bool completed = false;
  bool expire = false;
  int hints = 0;
  int sessionId = 0;
  final user = {
    'id': 1,
    'fullName': 'Jugador ZIP',
    'email': 'player@zipgame.test',
  };
  Map<String, dynamic> get level => {
    'id': 1,
    'name': testLevel.name,
    'difficulty': 'easy',
    'gridSize': 6,
    'clues': [
      for (var i = 0; i < testLevel.checkpoints.length; i++)
        {'number': i + 1, 'cell': testLevel.checkpoints[i]},
    ],
    'completed': completed,
    'bestPoints': completed ? 777 : null,
  };
  Map<String, dynamic> get score => {
    'id': 9,
    'gameSessionId': sessionId,
    'points': 777,
    'elapsedSeconds': 40,
    'mistakesCount': 2,
    'hintsUsed': hints,
  };
  Map<String, dynamic> get session => {
    'id': sessionId,
    'levelId': 1,
    'status': completed ? 'completed' : 'in_progress',
    'startedAt': DateTime.utc(2026, 11, 24).toIso8601String(),
    'elapsedSeconds': completed ? 40 : 0,
    'mistakesCount': 0,
    'hintsUsed': hints,
    'level': level,
    'score': completed ? score : null,
  };
  Future<http.Response> _respond(http.Request request) async {
    requests.add(request);
    final path = request.url.path;
    http.Response respond(Object body, [int status = 200]) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );
    http.Response data(Object? value) => respond({'data': value});
    if (path.endsWith('/auth/login') || path.endsWith('/auth/register')) {
      return respond({
        'user': user,
        'token': {'value': 'test-token'},
      });
    }
    if (expire) return respond({'message': 'Sesión expirada'}, 401);
    if (request.headers['Authorization'] != 'Bearer test-token') {
      return respond({'message': 'Token requerido'}, 401);
    }
    if (path.endsWith('/auth/me')) return respond({'user': user});
    if (path.endsWith('/auth/logout')) {
      return respond({'message': 'Logged out'});
    }
    if (path.endsWith('/levels/recommended')) {
      return data({'recommendedDifficulty': completed ? 'medium' : 'easy'});
    }
    if (path.endsWith('/levels')) return data([level]);
    if (path.endsWith('/levels/generate') || path.endsWith('/levels/1')) {
      return data(level);
    }
    if (path.endsWith('/sessions')) {
      sessionId++;
      completed = false;
      return data(session);
    }
    if (path.endsWith('/moves')) {
      return data({'isValid': true, 'mistakesCount': 0, 'errors': <String>[]});
    }
    if (path.endsWith('/hint')) {
      hints++;
      final submitted = (jsonDecode(request.body)['path'] as List).cast<int>();
      var step = 0;
      while (step < submitted.length && submitted[step] == solution[step]) {
        step++;
      }
      return data({
        'hint': {'cell': solution[step], 'step': step + 1},
        'hintsUsed': hints,
      });
    }
    if (path.endsWith('/complete')) {
      final submitted = (jsonDecode(request.body)['path'] as List).cast<int>();
      if (submitted.join(',') != solution.join(',')) {
        return respond({
          'errors': ['Invalid path'],
          'mistakesCount': 1,
        }, 422);
      }
      completed = true;
      return data({'session': session, 'score': score});
    }
    if (path.endsWith('/abandon')) {
      return data({...session, 'status': 'abandoned'});
    }
    if (path.contains('/sessions/')) return data(session);
    if (path.endsWith('/profile')) {
      return data({
        'user': user,
        'recommendedDifficulty': 'medium',
        'stats': {
          'totalSessions': sessionId,
          'completedLevelsCount': completed ? 1 : 0,
          'totalPoints': completed ? 777 : 0,
          'bestScore': completed ? 777 : 0,
        },
      });
    }
    if (path.endsWith('/history')) return data(completed ? [session] : []);
    if (path.endsWith('/leaderboard')) {
      return data(
        completed
            ? [
                {
                  'rank': 1,
                  'userId': 1,
                  'fullName': 'Jugador ZIP',
                  'totalPoints': 777,
                  'completedLevels': 1,
                  'totalGames': 1,
                  'avgElapsedSeconds': 40,
                },
              ]
            : [],
      );
    }
    throw StateError('Endpoint no esperado: ${request.method} $path');
  }
}
