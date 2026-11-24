/// Jugador autenticado (entidad de dominio, sin dependencias de JSON).
class User {
  const User({
    required this.id,
    required this.fullName,
    required this.email,
    this.recommendedDifficulty = 'easy',
  });

  final int id;
  final String fullName;
  final String email;
  final String recommendedDifficulty;
}