import 'package:material_ui/material_ui.dart';
import 'app/app.dart';
import 'app/app_scope.dart';

/// Punto de entrada de ZIP Game.
///
/// Ejecutar (con el backend AdonisJS encendido en el puerto 3333):
///   flutter run -d chrome
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(ZipGameApp(dependencies: AppDependencies.production()));
}