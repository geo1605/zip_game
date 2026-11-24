import 'package:material_ui/material_ui.dart';

/// Tarjeta reutilizable para login y registro
class AuthFormCard extends StatelessWidget {
  const AuthFormCard({
    super.key,
    required this.title,
    required this.formKey,
    required this.fields,
    required this.submitLabel,
    required this.onSubmit,
    this.error,
    this.loading = false,
    this.footer,
    this.showBack = false,
  });

  final String title;
  final GlobalKey<FormState> formKey;
  final List<Widget> fields;
  final String submitLabel;
  final VoidCallback onSubmit;
  final String? error;
  final bool loading;
  final Widget? footer;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: showBack ? AppBar() : null,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(Icons.route, size: 64, color: scheme.primary),
                  const SizedBox(height: 8),
                  Text(
                    'ZIP Game',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  Text(title, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  ...fields,
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      error!,
                      key: const Key('auth_error'),
                      style: TextStyle(color: scheme.error),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    key: const Key('auth_submit'),
                    onPressed: loading ? null : onSubmit,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(submitLabel),
                    ),
                  ),
                  if (footer != null) ...[const SizedBox(height: 8), footer!],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}