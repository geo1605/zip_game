/// Nivel del juego tal como lo entrega el backend (SIN la solución).
class Level {
  const Level({
    required this.id,
    required this.name,
    required this.difficulty,
    required this.size,
    required this.checkpoints,
    this.completed = false,
    this.bestScore,
  });

  final int id;
  final String name;
  final String difficulty;
  final int size;

  /// checkpoints[i] = índice de la celda que contiene el número i + 1
  final List<int> checkpoints;
  final bool completed;
  final int? bestScore;

  int get totalCells => size * size;
}