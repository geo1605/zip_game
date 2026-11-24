import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../models/user_model.dart';

/// Llamadas HTTP de autenticación.
class AuthRemoteDataSource {
  AuthRemoteDataSource(this._api);

  final ApiClient _api;

  Future<({UserModel user, String token})> login(String email, String password) async {
    final json = await _api.post(ApiConstants.login, body: {
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;
    return _parseAuth(json);
  }

  Future<({UserModel user, String token})> register(
    String fullName,
    String email,
    String password,
  ) async {
    final json = await _api.post(ApiConstants.register, body: {
      'fullName': fullName,
      'email': email,
      'password': password,
    }) as Map<String, dynamic>;
    return _parseAuth(json);
  }

  Future<UserModel> me() async {
    final json = await _api.get(ApiConstants.me) as Map<String, dynamic>;
    return UserModel.fromJson(json['user'] as Map<String, dynamic>);
  }

  Future<void> logout() => _api.post(ApiConstants.logout);

  ({UserModel user, String token}) _parseAuth(Map<String, dynamic> json) => (
        user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
        token: (json['token'] as Map<String, dynamic>)['value'] as String,
      );
}