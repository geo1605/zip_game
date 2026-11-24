/// Configuración de la API.
///
/// Se puede cambiar sin tocar código:
///   flutter run -d chrome --dart-define=API_URL=http://localhost:3333/api
///   flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:3333/api
class ApiConstants {
  ApiConstants._();

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:3333/api',
  );

  static const Duration timeout = Duration(seconds: 15);

  // Autenticación
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String logout = '/auth/logout';

  // Niveles
  static const String levels = '/levels';
  static const String recommendedLevel = '/levels/recommended';
  static const String generateLevel = '/levels/generate';
  static String level(int id) => '/levels/$id';

  // Sesiones de juego
  static const String sessions = '/sessions';
  static String session(int id) => '/sessions/$id';
  static String sessionMoves(int id) => '/sessions/$id/moves';
  static String sessionHint(int id) => '/sessions/$id/hint';
  static String sessionComplete(int id) => '/sessions/$id/complete';
  static String sessionAbandon(int id) => '/sessions/$id/abandon';

  // Perfil, historial y ranking
  static const String profile = '/profile';
  static const String history = '/history';
  static const String leaderboard = '/leaderboard';
}