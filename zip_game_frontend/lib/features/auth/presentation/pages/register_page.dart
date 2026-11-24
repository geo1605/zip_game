import 'package:material_ui/material_ui.dart';
import '../../../../app/app_scope.dart';
import '../widgets/auth_form_card.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    for (final c in [_fullName, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await AppScope.of(context)
        .authController
        .register(_fullName.text.trim(), _email.text.trim(), _password.text);
    if (ok && mounted) Navigator.of(context).pop(); // la raíz ya muestra el Home
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).authController;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) => AuthFormCard(
        title: 'Crear cuenta',
        showBack: true,
        formKey: _formKey,
        error: auth.error,
        loading: auth.loading,
        submitLabel: 'Registrarme',
        onSubmit: _submit,
        fields: [
          TextFormField(
            key: const Key('register_full_name'),
            controller: _fullName,
            decoration: const InputDecoration(
              labelText: 'Nombre completo',
              prefixIcon: Icon(Icons.person),
            ),
            validator: (v) {
              final text = v?.trim() ?? '';
              return text.length >= 2 && text.length <= 120
                  ? null
                  : 'Escribe entre 2 y 120 caracteres';
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register_email'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Correo',
              prefixIcon: Icon(Icons.email),
            ),
            validator: (v) =>
                v != null && RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())
                    ? null
                    : 'Correo inválido',
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register_password'),
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Contraseña',
              prefixIcon: Icon(Icons.lock),
            ),
            validator: (v) => v != null && v.length >= 8 ? null : 'Mínimo 8 caracteres',
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('register_confirm'),
            controller: _confirm,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Confirmar contraseña',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            validator: (v) => v == _password.text ? null : 'Las contraseñas no coinciden',
          ),
        ],
      ),
    );
  }
}