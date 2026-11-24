import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/profile.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl(this._api);

  final ApiClient _api;

  @override
  Future<Profile> getProfile() async {
    final json = await _api.get(ApiConstants.profile) as Map<String, dynamic>;
    final data = json['data'] as Map<String, dynamic>;
    final user = data['user'] as Map<String, dynamic>;
    final stats = data['stats'] as Map<String, dynamic>;

    return Profile(
      fullName: user['fullName'] as String,
      email: user['email'] as String,
      recommendedDifficulty: (data['recommendedDifficulty'] as String?) ?? 'easy',
      totalSessions: (stats['totalSessions'] as int?) ?? 0,
      completedLevelsCount: (stats['completedLevelsCount'] as int?) ?? 0,
      totalPoints: (stats['totalPoints'] as int?) ?? 0,
      bestScore: (stats['bestScore'] as int?) ?? 0,
    );
  }

  @override
  Future<List<HistoryEntry>> getHistory({int limit = 20}) async {
    final json = await _api.get(ApiConstants.history, query: {'limit': '$limit'})
        as Map<String, dynamic>;
    return (json['data'] as List).map((e) {
      final row = e as Map<String, dynamic>;
      final level = row['level'] as Map<String, dynamic>?;
      final score = row['score'] as Map<String, dynamic>?;
      return HistoryEntry(
        id: row['id'] as int,
        levelName: (level?['name'] as String?) ?? 'Nivel #${row['levelId']}',
        status: row['status'] as String,
        difficulty: (level?['difficulty'] as String?) ?? 'easy',
        elapsedSeconds: (row['elapsedSeconds'] as int?) ?? 0,
        points: score?['points'] as int?,
        startedAt: DateTime.tryParse((row['startedAt'] as String?) ?? ''),
      );
    }).toList();
  }
}