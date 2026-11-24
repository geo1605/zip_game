/// Perfil del jugador con estadísticas
class Profile {
  const Profile({
    required this.fullName,
    required this.email,
    required this.recommendedDifficulty,
    required this.totalSessions,
    required this.completedLevelsCount,
    required this.totalPoints,
    required this.bestScore,
  });

  final String fullName;
  final String email;
  final String recommendedDifficulty;
  final int totalSessions;
  final int completedLevelsCount;
  final int totalPoints;
  final int bestScore;
}

/// Partida del historial
class HistoryEntry {
  const HistoryEntry({
    required this.id,
    required this.levelName,
    required this.status,
    required this.difficulty,
    required this.elapsedSeconds,
    this.points,
    this.startedAt,
  });

  final int id;
  final String levelName;
  final String status;
  final String difficulty;
  final int elapsedSeconds;
  final int? points;
  final DateTime? startedAt;
}

abstract class ProfileRepository {
  Future<Profile> getProfile();
  Future<List<HistoryEntry>> getHistory({int limit = 20});
}