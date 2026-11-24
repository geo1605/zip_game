import '../../levels/data/models/level_model.dart';
import '../domain/game_session.dart';

GameScore scoreFromJson(Map<String, dynamic> json) => GameScore(
  id: json['id'] as int,
  sessionId: json['gameSessionId'] as int,
  points: json['points'] as int,
  elapsedSeconds: json['elapsedSeconds'] as int,
  mistakesCount: json['mistakesCount'] as int,
  hintsUsed: json['hintsUsed'] as int,
);

GameSession sessionFromJson(Map<String, dynamic> json) => GameSession(
  id: json['id'] as int,
  level: LevelModel.fromJson(json['level'] as Map<String, dynamic>),
  status: switch (json['status']) {
    'in_progress' => SessionStatus.inProgress,
    'completed' => SessionStatus.completed,
    'abandoned' => SessionStatus.abandoned,
    _ => throw const FormatException('Estado de partida desconocido.'),
  },
  startedAt: DateTime.parse(json['startedAt'] as String),
  elapsedSeconds: json['elapsedSeconds'] as int,
  mistakesCount: json['mistakesCount'] as int,
  hintsUsed: json['hintsUsed'] as int,
  score: json['score'] == null
      ? null
      : scoreFromJson(json['score'] as Map<String, dynamic>),
);
