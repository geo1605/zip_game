import '../../../../core/errors/api_exception.dart';
import '../../../../core/network/token_storage.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._remote, this._storage);

  final AuthRemoteDataSource _remote;
  final TokenStorage _storage;

  @override
  Future<User> login({required String email, required String password}) async {
    final result = await _remote.login(email, password);
    await _storage.write(result.token);
    return result.user;
  }

  @override
  Future<User> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final result = await _remote.register(fullName, email, password);
    await _storage.write(result.token);
    return result.user;
  }

  @override
  Future<User?> restoreSession() async {
    if (await _storage.read() == null) return null;
    try {
      return await _remote.me();
    } on ApiException catch (e) {
      if (e.isUnauthorized) await _storage.clear();
      return null;
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _remote.logout();
    } catch (_) {
      // Aunque falle la red, se borra el token local
    }
    await _storage.clear();
  }
}