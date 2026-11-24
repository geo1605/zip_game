import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/leaderboard_entry.dart';

class LeaderboardRepositoryImpl implements LeaderboardRepository {
  LeaderboardRepositoryImpl(this._api);

  final ApiClient _api;

  @override
  Future<List<LeaderboardEntry>> top({int limit = 20}) async {
    final json = await _api.get(ApiConstants.leaderboard, query: {'limit': '$limit'})
        as Map<String, dynamic>;
    return (json['data'] as List).map((e) {
      final row = e as Map<String, dynamic>;
      return LeaderboardEntry(
        rank: row['rank'] as int,
        userId: row['userId'] as int,
        fullName: row['fullName'] as String,
        totalPoints: row['totalPoints'] as int,
        completedLevels: row['completedLevels'] as int,
        totalGames: row['totalGames'] as int,
        avgElapsedSeconds: row['avgElapsedSeconds'] as int,
      );
    }).toList();
  }
}