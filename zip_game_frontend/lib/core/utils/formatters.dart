/// Formatea segundos como mm:ss
String formatDuration(int totalSeconds) {
  final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
  final s = (totalSeconds % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

/// Traduce la dificultad del backend al español
String difficultyLabel(String difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'Fácil';
    case 'medium':
      return 'Media';
    case 'hard':
      return 'Difícil';
    default:
      return difficulty;
  }
}