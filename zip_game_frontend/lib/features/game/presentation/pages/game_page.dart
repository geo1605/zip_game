import 'package:material_ui/material_ui.dart';

import '../../../../app/app_scope.dart';
import '../../../../app/routes/app_routes.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../shared/widgets/async_view.dart';
import '../controllers/game_controller.dart';
import '../widgets/zip_board.dart';

class GamePage extends StatefulWidget {
  const GamePage({super.key, this.levelId});

  final int? levelId;

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> {
  GameController? _controller;
  bool _leaving = false;
  bool _askingToLeave = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final deps = AppScope.of(context);
    _controller ??= GameController(deps.gameRepository, deps.levelsRepository)
      ..start(levelId: widget.levelId);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<bool> _confirm(String title, String message, String action) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(action),
            ),
          ],
        ),
      ) ??
      false;

  Future<void> _leave() async {
    final c = _controller!;
    if (_askingToLeave || c.busy || !mounted) return;
    _askingToLeave = true;
    try {
      if (c.phase == GamePhase.playing &&
          !await _confirm(
            '¿Salir de la partida?',
            'Se guardará como abandonada y no sumará puntos.',
            'Salir',
          )) {
        return;
      }
      if (!mounted) return;
      if (!await c.abandon() || !mounted) return;
      setState(() => _leaving = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
    } finally {
      _askingToLeave = false;
    }
  }

  Future<void> _restart() async {
    if (await _confirm(
          '¿Reiniciar la partida?',
          'La partida actual quedará abandonada. Comenzarás el mismo nivel desde cero.',
          'Reiniciar',
        ) &&
        mounted) {
      await _controller!.restart();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller!;
    return ListenableBuilder(
      listenable: c,
      builder: (context, _) => PopScope(
        canPop:
            _leaving ||
            c.phase == GamePhase.completed ||
            c.phase == GamePhase.abandoned ||
            c.phase == GamePhase.failed,
        onPopInvokedWithResult: (didPop, result) {
          if (!didPop) _leave();
        },
        child: Scaffold(
          appBar: AppBar(
            leading: IconButton(
              tooltip: 'Volver',
              onPressed: c.busy ? null : _leave,
              icon: const Icon(Icons.arrow_back),
            ),
            title: const Text('ZIP Game'),
            actions: [
              IconButton(
                tooltip: 'Cómo jugar',
                icon: const Icon(Icons.help_outline),
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Cómo jugar'),
                    content: const Text(
                      'Empieza en 1 y conecta los números en orden. Recorre todas las '
                      'celdas una sola vez, sin diagonales, y termina en el último número.\n\n'
                      'Toca las celdas o arrastra con el dedo o el mouse. Usa Deshacer '
                      'para corregir. Cada pista reduce el puntaje en 75 puntos.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('Entendido'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          body: SafeArea(
            child: switch (c.phase) {
              GamePhase.loading => const Center(
                child: CircularProgressIndicator(),
              ),
              GamePhase.failed => StateMessage(
                icon: Icons.cloud_off,
                message: c.error ?? 'No se pudo iniciar la partida.',
                actionLabel: 'Reintentar',
                onAction: () => c.start(),
              ),
              GamePhase.completed => _result(c),
              GamePhase.abandoned => StateMessage(
                icon: Icons.flag_outlined,
                message: 'La partida terminó.',
                actionLabel: 'Volver',
                onAction: _leave,
              ),
              GamePhase.playing => _game(c),
            },
          ),
        ),
      ),
    );
  }

  Widget _game(GameController c) {
    final level = c.session!.level;
    final next = c.rules!.nextClue(c.path);
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(level.name, style: Theme.of(context).textTheme.titleLarge),
              Text(
                '${difficultyLabel(level.difficulty)} · ${level.size} × ${level.size}',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  Chip(
                    avatar: const Icon(Icons.timer_outlined, size: 18),
                    label: Text(
                      formatDuration(c.elapsedSeconds),
                      key: const Key('game_timer'),
                    ),
                  ),
                  Chip(
                    label: Text(
                      '${c.path.length}/${level.totalCells} celdas',
                      key: const Key('game_progress'),
                    ),
                  ),
                  Chip(label: Text('${c.mistakesCount} errores')),
                  Chip(label: Text('${c.hintsUsed} pistas')),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(value: c.path.length / level.totalCells),
              const SizedBox(height: 12),
              Text(
                c.canComplete
                    ? '¡Recorrido completo! Verifica tu solución.'
                    : c.path.isEmpty
                    ? 'Empieza en 1.'
                    : 'Siguiente número: ${next ?? '—'}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              ZipBoard(
                rules: c.rules!,
                path: c.path,
                hintCell: c.hintCell,
                enabled: c.canPlay,
                onCell: c.selectCell,
              ),
              if (c.error != null || c.notice != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      c.error ?? c.notice!,
                      key: const Key('game_message'),
                      style: TextStyle(
                        color: c.error != null ? scheme.error : scheme.primary,
                      ),
                    ),
                  ),
                ),
              if (c.syncError != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.syncError!, style: TextStyle(color: scheme.error)),
                      TextButton(
                        onPressed: c.canPlay ? c.retrySync : null,
                        child: const Text('Reintentar conexión'),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 16),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    key: const Key('game_undo'),
                    onPressed: c.canPlay && c.path.isNotEmpty ? c.undo : null,
                    icon: const Icon(Icons.undo),
                    label: const Text('Deshacer'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('game_restart'),
                    onPressed: c.canPlay ? _restart : null,
                    icon: const Icon(Icons.restart_alt),
                    label: const Text('Reiniciar'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('game_hint'),
                    onPressed: c.canPlay && !c.canComplete
                        ? c.requestHint
                        : null,
                    icon: const Icon(Icons.lightbulb_outline),
                    label: const Text('Pista −75'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                key: const Key('game_complete'),
                onPressed: c.canComplete ? c.complete : null,
                icon: c.busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check),
                label: Text(c.busy ? 'Consultando…' : 'Verificar solución'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _result(GameController c) {
    final result = c.score!;
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.emoji_events, size: 72, color: scheme.primary),
              const SizedBox(height: 16),
              Text(
                '¡Nivel completado!',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              Text(c.session!.level.name, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              Card(
                color: scheme.primaryContainer,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Text(
                        '${result.points} puntos',
                        key: const Key('game_score'),
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      const Text('Resultado validado y guardado'),
                      const SizedBox(height: 12),
                      Text('Tiempo: ${formatDuration(result.elapsedSeconds)}'),
                      Text(
                        'Errores: ${result.mistakesCount} · Pistas: ${result.hintsUsed}',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(onPressed: _leave, child: const Text('Continuar')),
              OutlinedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, AppRoutes.profile),
                child: const Text('Ver mi perfil e historial'),
              ),
              OutlinedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, AppRoutes.leaderboard),
                child: const Text('Ver ranking'),
              ),
              TextButton(
                onPressed: c.busy ? null : c.restart,
                child: const Text('Jugar otra vez'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
