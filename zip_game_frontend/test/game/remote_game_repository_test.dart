import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zip_game_frontend/core/errors/api_exception.dart';
import 'package:zip_game_frontend/core/network/api_client.dart';
import 'package:zip_game_frontend/core/network/token_storage.dart';
import 'package:zip_game_frontend/features/game/data/remote_game_repository.dart';
import 'package:zip_game_frontend/features/game/domain/game_session.dart';

final sessionJson = <String, dynamic>{
  'id': 7,
  'status': 'in_progress',
  'startedAt': '2026-11-24T12:00:00Z',
  'elapsedSeconds': 0,
  'mistakesCount': 0,
  'hintsUsed': 0,
  'level': {
    'id': 1,
    'name': 'Prueba',
    'difficulty': 'easy',
    'gridSize': 6,
    'clues': [
      {'number': 2, 'cell': 30},
      {'number': 1, 'cell': 0},
    ],
  },
};
final scoreJson = <String, dynamic>{
  'id': 8,
  'gameSessionId': 7,
  'points': 735,
  'elapsedSeconds': 20,
  'mistakesCount': 6,
  'hintsUsed': 1,
};

void main() {
  test(
    'envía token y decodifica partida, pistas y resultado de Adonis',
    () async {
      final storage = MemoryTokenStorage();
      await storage.write('test-token');
      final requests = <http.Request>[];
      final repository = RemoteGameRepository(
        ApiClient(
          tokenStorage: storage,
          httpClient: MockClient((request) async {
            requests.add(request);
            expect(request.headers['Authorization'], 'Bearer test-token');
            final path = request.url.path;
            final data = path.endsWith('/complete')
                ? {'session': sessionJson, 'score': scoreJson}
                : path.endsWith('/hint')
                ? {
                    'hint': {'cell': 1, 'step': 2},
                    'hintsUsed': 1,
                  }
                : path.endsWith('/moves')
                ? {'isValid': true, 'mistakesCount': 0, 'errors': <String>[]}
                : sessionJson;
            return http.Response(jsonEncode({'data': data}), 200);
          }),
        ),
      );
      final session = await repository.start(1);
      expect(session.status, SessionStatus.inProgress);
      expect(session.level.checkpoints, [0, 30]);
      expect((await repository.getSession(7)).id, 7);
      expect((await repository.move(7, [0])).isValid, isTrue);
      expect((await repository.hint(7, [0])).hint?.cell, 1);
      final score = await repository.complete(
        7,
        [0, 1],
        elapsedSeconds: 20,
        mistakesCount: 6,
      );
      expect(score.points, 735);
      final completion = jsonDecode(requests.last.body) as Map<String, dynamic>;
      expect(
        completion.keys,
        unorderedEquals(['path', 'elapsedSeconds', 'mistakesCount']),
      );
      await repository.abandon(7);
      expect(requests.last.url.path, '/api/sessions/7/abandon');
    },
  );

  test(
    'maneja errors como cadenas y como objetos Vine sin lanzar TypeError',
    () {
      final error = ApiException.fromResponse(422, {
        'message': 'Invalid path',
        'errors': ['Cell 0 is repeated'],
        'mistakesCount': 3,
      });
      expect(error.message, 'Cell 0 is repeated');
      expect(error.details?['mistakesCount'], 3);
      expect(
        ApiException.fromResponse(422, {
          'errors': [
            {'message': 'Required', 'field': 'path'},
          ],
        }).message,
        'Required',
      );
    },
  );

  test('propaga 401 y notifica expiración de sesión', () async {
    var expired = false;
    final api = ApiClient(
      tokenStorage: MemoryTokenStorage(),
      httpClient: MockClient((_) async => http.Response('{}', 401)),
    )..onUnauthorized = () => expired = true;
    await expectLater(
      RemoteGameRepository(api).start(1),
      throwsA(isA<ApiException>().having((e) => e.isUnauthorized, '401', true)),
    );
    expect(expired, isTrue);
  });
}
