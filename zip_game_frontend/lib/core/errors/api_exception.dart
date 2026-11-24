/// Error de comunicación con el backend, ya traducido a un mensaje legible.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.code, this.details});

  final String message;
  final int? statusCode;
  final String? code;
  final Map<String, dynamic>? details;

  bool get isUnauthorized => statusCode == 401;
  bool get isValidation => statusCode == 422;
  bool get isNotFound => statusCode == 404;
  bool get isConflict => statusCode == 409;

  /// Construye el error a partir del JSON que devuelve AdonisJS:
  /// - { message, code } (errores del juego)
  /// - { errors: [{ message, field, rule }] } (VineJS / auth)
  factory ApiException.fromResponse(int statusCode, dynamic body) {
    String message = _defaultMessage(statusCode);
    String? code;
    Map<String, dynamic>? details;

    if (body is Map<String, dynamic>) {
      if (body['message'] is String) message = body['message'] as String;
      if (body['code'] is String) code = body['code'] as String;
      if (body['details'] is Map<String, dynamic>) {
        details = body['details'] as Map<String, dynamic>;
      }

      final errors = body['errors'];
      if (errors is List && errors.isNotEmpty) {
        message = errors
            .whereType()
            .map((e) => e['message']?.toString() ?? '')
            .where((m) => m.isNotEmpty)
            .join('\n');
      }
    }

    return ApiException(message, statusCode: statusCode, code: code, details: details);
  }

  static String _defaultMessage(int status) {
    switch (status) {
      case 400:
        return 'Solicitud inválida';
      case 401:
        return 'Sesión expirada. Inicia sesión de nuevo.';
      case 404:
        return 'Recurso no encontrado';
      case 409:
        return 'La operación ya fue realizada';
      case 422:
        return 'Datos inválidos';
      default:
        return 'Error del servidor ($status)';
    }
  }

  @override
  String toString() => message;
}