import '../../domain/entities/level.dart';

class LevelModel extends Level {
  const LevelModel({
    required super.id,
    required super.name,
    required super.difficulty,
    required super.size,
    required super.checkpoints,
    super.completed,
    super.bestScore,
  });

  factory LevelModel.fromJson(Map<String, dynamic> json) {
    final rawClues = (json['clues'] as List? ?? [])
        .map((e) => e as Map<String, dynamic>)
        .toList()
      ..sort((a, b) => (a['number'] as int).compareTo(b['number'] as int));

    return LevelModel(
      id: json['id'] as int,
      name: json['name'] as String,
      difficulty: json['difficulty'] as String,
      size: (json['gridSize'] as int?) ?? 6,
      checkpoints: rawClues.map((c) => c['cell'] as int).toList(),
      completed: (json['completed'] as bool?) ?? false,
      bestScore: json['bestPoints'] as int?,
    );
  }
}