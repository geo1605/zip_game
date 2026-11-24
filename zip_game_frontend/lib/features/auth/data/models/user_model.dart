import '../../domain/entities/user.dart';

/// Conversión JSON <-> User (compatible con serializeUser del backend)
class UserModel extends User {
  const UserModel({
    required super.id,
    required super.fullName,
    required super.email,
    super.recommendedDifficulty,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as int,
        fullName: json['fullName'] as String,
        email: json['email'] as String,
        recommendedDifficulty: (json['recommendedDifficulty'] as String?) ?? 'easy',
      );
}