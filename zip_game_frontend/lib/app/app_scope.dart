import 'package:material_ui/material_ui.dart';
import '../core/network/api_client.dart';
import '../core/network/token_storage.dart';
import '../features/auth/data/datasources/auth_remote_datasource.dart';
import '../features/auth/data/repositories/auth_repository_impl.dart';
import '../features/auth/domain/repositories/auth_repository.dart';
import '../features/auth/presentation/controllers/auth_controller.dart';
import '../features/leaderboard/data/leaderboard_repository_impl.dart';
import '../features/leaderboard/domain/leaderboard_entry.dart';
import '../features/levels/data/datasources/levels_remote_datasource.dart';
import '../features/levels/data/repositories/levels_repository_impl.dart';
import '../features/levels/domain/repositories/levels_repository.dart';
import '../features/profile/data/profile_repository_impl.dart';
import '../features/profile/domain/profile.dart';

/// Contenedor de dependencias (inyección manual).
/// Las pantallas obtienen los repositorios con `AppScope.of(context)`.
class AppDependencies {
  AppDependencies({
    required this.apiClient,
    required this.authRepository,
    required this.levelsRepository,
    required this.leaderboardRepository,
    required this.profileRepository,
  }) : authController = AuthController(authRepository);

  final ApiClient apiClient;
  final AuthRepository authRepository;
  final LevelsRepository levelsRepository;
  final LeaderboardRepository leaderboardRepository;
  final ProfileRepository profileRepository;
  final AuthController authController;

  /// Construye las dependencias reales que hablan con AdonisJS
  factory AppDependencies.production() {
    final api = ApiClient(tokenStorage: SharedPrefsTokenStorage());
    final deps = AppDependencies(
      apiClient: api,
      authRepository: AuthRepositoryImpl(AuthRemoteDataSource(api), api.tokenStorage),
      levelsRepository: LevelsRepositoryImpl(LevelsRemoteDataSource(api)),
      leaderboardRepository: LeaderboardRepositoryImpl(api),
      profileRepository: ProfileRepositoryImpl(api),
    );
    api.onUnauthorized = () async {
      await api.tokenStorage.clear();
      deps.authController.expire();
    };
    return deps;
  }
}

class AppScope extends InheritedWidget {
  const AppScope({super.key, required this.dependencies, required super.child});

  final AppDependencies dependencies;

  static AppDependencies of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope no encontrado en el árbol de widgets');
    return scope!.dependencies;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => dependencies != oldWidget.dependencies;
}