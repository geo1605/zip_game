import 'package:material_ui/material_ui.dart';
import '../../../../app/app_scope.dart';
import '../../../../app/routes/app_routes.dart';
import '../../../../core/utils/formatters.dart';

/// Pantalla principal: nombre de la app, datos del jugador y navegación.
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).authController;
    final user = auth.user!;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ZIP Game'),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: auth.logout,
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  color: scheme.primaryContainer,
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text(
                        user.fullName.isEmpty ? '?' : user.fullName[0].toUpperCase(),
                      ),
                    ),
                    title: Text('¡Hola, ${user.fullName}!'),
                    subtitle: Text(
                      'Dificultad recomendada: ${difficultyLabel(user.recommendedDifficulty)}',
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Conecta los números en orden pasando por TODAS las celdas del tablero, '
                  'sin diagonales y sin repetir celdas.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton.icon(
                  key: const Key('home_quick_play'),
                  onPressed: () => Navigator.of(context).pushNamed(AppRoutes.game),
                  icon: const Icon(Icons.bolt),
                  label: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text('Juego rápido (dificultad adaptativa)'),
                  ),
                ),
                const SizedBox(height: 12),
                _NavButton(icon: Icons.grid_view, label: 'Niveles', route: AppRoutes.levels),
                _NavButton(
                  icon: Icons.leaderboard,
                  label: 'Ranking',
                  route: AppRoutes.leaderboard,
                ),
                _NavButton(icon: Icons.person, label: 'Mi perfil', route: AppRoutes.profile),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.label, required this.route});

  final IconData icon;
  final String label;
  final String route;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: OutlinedButton.icon(
          onPressed: () => Navigator.of(context).pushNamed(route),
          icon: Icon(icon),
          label: Padding(padding: const EdgeInsets.all(12), child: Text(label)),
        ),
      );
}