/// Fila del ranking
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.userId,
    required this.fullName,
    required this.totalPoints,
    required this.completedLevels,
    required this.totalGames,
    required this.avgElapsedSeconds,
  });

  final int rank;
  final int userId;
  final String fullName;
  final int totalPoints;
  final int completedLevels;
  final int totalGames;
  final int avgElapsedSeconds;
}

abstract class LeaderboardRepository {
  Future<List<LeaderboardEntry>> top({int limit = 20});
}