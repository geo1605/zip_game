import 'package:material_ui/material_ui.dart';
import '../../../../app/app_scope.dart';
import '../../../../app/routes/app_routes.dart';
import '../widgets/auth_form_card.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await AppScope.of(context).authController.login(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).authController;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) => AuthFormCard(
        title: 'Iniciar sesión',
        formKey: _formKey,
        error: auth.error,
        loading: auth.loading,
        submitLabel: 'Entrar',
        onSubmit: _submit,
        fields: [
          TextFormField(
            key: const Key('login_email'),
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
            key: const Key('login_password'),
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Contraseña',
              prefixIcon: Icon(Icons.lock),
            ),
            validator: (v) => v == null || v.isEmpty ? 'Escribe tu contraseña' : null,
            onFieldSubmitted: (_) => _submit(),
          ),
        ],
        footer: TextButton(
          onPressed: () => Navigator.of(context).pushNamed(AppRoutes.register),
          child: const Text('¿No tienes cuenta? Regístrate'),
        ),
      ),
    );
  }
}