import 'package:material_ui/material_ui.dart';

/// Muestra los estados de carga, vacío, error y contenido de un Future.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({
    super.key,
    required this.future,
    required this.builder,
    this.isEmpty,
    this.emptyMessage = 'No hay datos',
    this.onRetry,
  });

  final Future<T> future;
  final Widget Function(T data) builder;
  final bool Function(T data)? isEmpty;
  final String emptyMessage;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return StateMessage(
            icon: Icons.cloud_off,
            message: snapshot.error.toString(),
            actionLabel: onRetry == null ? null : 'Reintentar',
            onAction: onRetry,
          );
        }
        final data = snapshot.data as T;
        if (isEmpty?.call(data) ?? false) {
          return StateMessage(icon: Icons.inbox_outlined, message: emptyMessage);
        }
        return builder(data);
      },
    );
  }
}

/// Mensaje centrado reutilizable (vacío / error)
class StateMessage extends StatelessWidget {
  const StateMessage({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Icon(icon, size: 56, color: Theme.of(context).colorScheme.outline),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(message, textAlign: TextAlign.center),
        ),
        if (actionLabel != null) ...[
          const SizedBox(height: 16),
          Center(child: FilledButton(onPressed: onAction, child: Text(actionLabel!))),
        ],
      ],
    );
  }
}