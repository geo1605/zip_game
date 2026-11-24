import 'package:material_ui/material_ui.dart';
import '../../../../app/app_scope.dart';
import '../../../../app/routes/app_routes.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../shared/widgets/async_view.dart';
import '../controllers/levels_controller.dart';

class LevelsPage extends StatefulWidget {
  const LevelsPage({super.key});

  @override
  State<LevelsPage> createState() => _LevelsPageState();
}

class _LevelsPageState extends State<LevelsPage> {
  LevelsController? _controller;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _controller ??= LevelsController(AppScope.of(context).levelsRepository)..load();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _openGame(int levelId) async {
    await Navigator.of(context).pushNamed(AppRoutes.game, arguments: levelId);
    if (!mounted) return;
    _controller!.load();
  }

  Future<void> _generate() async {
    final difficulty = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Generar nivel nuevo'),
        children: [
          for (final d in ['easy', 'medium', 'hard'])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, d),
              child: Text(difficultyLabel(d)),
            ),
        ],
      ),
    );
    if (difficulty == null) return;

    final level = await _controller!.generate(difficulty);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(level == null ? 'No se pudo generar' : 'Nivel "${level.name}" creado'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller!;
    return ListenableBuilder(
      listenable: c,
      builder: (context, _) => Scaffold(
        appBar: AppBar(title: const Text('Niveles')),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: c.generating ? null : _generate,
          icon: c.generating
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.auto_awesome),
          label: const Text('Generar'),
        ),
        body: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  for (final d in [null, 'easy', 'medium', 'hard'])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(d == null ? 'Todos' : difficultyLabel(d)),
                        selected: c.filter == d,
                        onSelected: (_) => c.setFilter(d),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(child: _content(c)),
          ],
        ),
      ),
    );
  }

  Widget _content(LevelsController c) {
    switch (c.state) {
      case LoadState.loading:
        return const Center(child: CircularProgressIndicator());
      case LoadState.error:
        return StateMessage(
          icon: Icons.cloud_off,
          message: c.error ?? 'Error',
          actionLabel: 'Reintentar',
          onAction: c.load,
        );
      case LoadState.empty:
        return const StateMessage(
          icon: Icons.inbox_outlined,
          message: 'No hay niveles. Ejecuta los seeders o genera uno nuevo.',
        );
      case LoadState.ready:
        return RefreshIndicator(
          onRefresh: c.load,
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 96),
            itemCount: c.levels.length,
            itemBuilder: (context, i) {
              final level = c.levels[i];
              final recommended = level.difficulty == c.recommendedDifficulty;
              return Card(
                child: ListTile(
                  key: Key('level_${level.id}'),
                  leading: CircleAvatar(
                    backgroundColor: switch (level.difficulty) {
                      'easy' => Colors.green.shade200,
                      'medium' => Colors.orange.shade200,
                      _ => Colors.red.shade200,
                    },
                    child: Text('${level.checkpoints.length}'),
                  ),
                  title: Text(level.name),
                  subtitle: Text(
                    '${difficultyLabel(level.difficulty)} · ${level.checkpoints.length} números'
                    '${recommended ? ' · recomendado' : ''}',
                  ),
                  trailing: level.completed
                      ? Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.check_circle, color: Colors.green),
                            Text('${level.bestScore ?? 0} pts', style: const TextStyle(fontSize: 12)),
                          ],
                        )
                      : const Icon(Icons.play_circle_outline),
                  onTap: () => _openGame(level.id),
                ),
              );
            },
          ),
        );
    }
  }
}