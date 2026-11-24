import '../entities/user.dart';

/// Contrato de autenticación. La capa de presentación sólo conoce esta interfaz.
abstract class AuthRepository {
  Future<User> login({required String email, required String password});

  Future<User> register({
    required String fullName,
    required String email,
    required String password,
  });

  /// Devuelve el usuario si hay un token guardado y sigue siendo válido.
  Future<User?> restoreSession();

  Future<void> logout();
}