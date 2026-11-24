import 'package:material_ui/material_ui.dart';

import '../features/auth/presentation/controllers/auth_controller.dart';
import '../features/auth/presentation/pages/login_page.dart';
import '../features/home/presentation/pages/home_page.dart';
import 'app_scope.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';

class ZipGameApp extends StatefulWidget {
  const ZipGameApp({super.key, required this.dependencies});

  final AppDependencies dependencies;

  @override
  State<ZipGameApp> createState() => _ZipGameAppState();
}

class _ZipGameAppState extends State<ZipGameApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  AuthStatus _previousAuthStatus = AuthStatus.unknown;

  @override
  void initState() {
    super.initState();
    final auth = widget.dependencies.authController;
    auth.addListener(_onAuthChange);
    auth.restore();
  }

  /// Si la sesión expira se regresa a la raíz (login)
  void _onAuthChange() {
    final status = widget.dependencies.authController.status;
    final sessionEnded =
        _previousAuthStatus == AuthStatus.authenticated &&
        status == AuthStatus.unauthenticated;
    _previousAuthStatus = status;
    // Los cambios de loading/error durante el registro no son un cierre
    // de sesión y no deben sacar al usuario del formulario.
    if (sessionEnded) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
    }
  }

  @override
  void dispose() {
    widget.dependencies.authController.removeListener(_onAuthChange);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      dependencies: widget.dependencies,
      child: MaterialApp(
        title: 'ZIP Game',
        debugShowCheckedModeBanner: false,
        navigatorKey: _navigatorKey,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        onGenerateRoute: AppRoutes.onGenerateRoute,
        home: ListenableBuilder(
          listenable: widget.dependencies.authController,
          builder: (context, _) {
            switch (widget.dependencies.authController.status) {
              case AuthStatus.unknown:
                return const Scaffold(
                  body: Center(child: CircularProgressIndicator()),
                );
              case AuthStatus.unauthenticated:
                return const LoginPage();
              case AuthStatus.authenticated:
                return const HomePage();
            }
          },
        ),
      ),
    );
  }
}
