import 'package:flutter/foundation.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// Estado global de autenticación (ChangeNotifier).
class AuthController extends ChangeNotifier {
  AuthController(this._repository);

  final AuthRepository _repository;

  AuthStatus status = AuthStatus.unknown;
  User? user;
  bool loading = false;
  String? error;

  Future<void> restore() async {
    user = await _repository.restoreSession();
    status = user == null ? AuthStatus.unauthenticated : AuthStatus.authenticated;
    notifyListeners();
  }

  Future<bool> login(String email, String password) =>
      _run(() => _repository.login(email: email, password: password));

  Future<bool> register(String fullName, String email, String password) =>
      _run(() => _repository.register(fullName: fullName, email: email, password: password));

  Future<void> logout() async {
    await _repository.logout();
    expire();
  }

  /// Se llama cuando el backend responde 401
  void expire() {
    user = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  /// Actualiza la dificultad recomendada del usuario en memoria
  void updateRecommendedDifficulty(String difficulty) {
    final current = user;
    if (current == null) return;
    user = User(
      id: current.id,
      fullName: current.fullName,
      email: current.email,
      recommendedDifficulty: difficulty,
    );
    notifyListeners();
  }

  Future<bool> _run(Future<User> Function() action) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      user = await action();
      status = AuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      error = e.message;
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}