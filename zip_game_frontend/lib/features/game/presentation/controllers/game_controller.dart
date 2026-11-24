import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../../../../core/errors/api_exception.dart';
import '../../../levels/domain/repositories/levels_repository.dart';
import '../../domain/game_repository.dart';
import '../../domain/game_rules.dart';
import '../../domain/game_session.dart';

enum GamePhase { loading, playing, completed, abandoned, failed }

class GameController extends ChangeNotifier {
  GameController(this._games, this._levels, {DateTime Function()? now})
    : _now = now ?? DateTime.now;

  final GameRepository _games;
  final LevelsRepository _levels;
  final DateTime Function() _now;
  GamePhase _phase = GamePhase.loading;
  GameSession? _session;
  GameRules? _rules;
  GameScore? _score;
  List<int> _path = [];
  int _localMistakes = 0;
  int _serverMistakes = 0;
  int _hintsUsed = 0;
  int _elapsedSeconds = 0;
  int? _requestedLevelId;
  int? _hintCell;
  String? _error;
  String? _notice;
  String? _syncError;
  bool _busy = false;
  bool _disposed = false;
  Timer? _timer;
  DateTime? _startedLocally;
  List<int>? _pendingPath;
  Completer<void>? _syncDone;

  GamePhase get phase => _phase;
  GameSession? get session => _session;
  GameRules? get rules => _rules;
  GameScore? get score => _score;
  List<int> get path => List.unmodifiable(_path);
  int get mistakesCount => _localMistakes + _serverMistakes;
  int get hintsUsed => _hintsUsed;
  int get elapsedSeconds => _elapsedSeconds;
  int? get hintCell => _hintCell;
  String? get error => _error;
  String? get notice => _notice;
  String? get syncError => _syncError;
  bool get busy => _busy;
  bool get syncing => _syncDone != null;
  bool get canPlay => !_disposed && !_busy && _phase == GamePhase.playing;
  bool get canComplete => canPlay && (_rules?.isComplete(_path) ?? false);

  Future<void> start({int? levelId}) async {
    if (_busy || _disposed || _phase == GamePhase.playing) return;
    _requestedLevelId = levelId ?? _requestedLevelId;
    _busy = true;
    _phase = GamePhase.loading;
    _error = null;
    _notify();
    try {
      var selectedId = _requestedLevelId;
      if (selectedId == null) {
        final page = await _levels.getLevels();
        final candidates = page.levels.where(
          (level) =>
              level.size == 6 &&
              !level.completed &&
              level.difficulty == page.recommendedDifficulty,
        );
        final level = candidates.isNotEmpty
            ? candidates.first
            : await _levels.generate(page.recommendedDifficulty);
        selectedId = level.id;
      }
      if (_disposed) return;
      _requestedLevelId = selectedId;
      final started = _now();
      final session = await _games.start(selectedId);
      if (_disposed) {
        await _games.abandon(session.id);
        return;
      }
      _session = session;
      _rules = GameRules(session.level);
      _path = [];
      _localMistakes = 0;
      _serverMistakes = session.mistakesCount;
      _hintsUsed = session.hintsUsed;
      _score = null;
      _hintCell = null;
      _notice = null;
      _syncError = null;
      _startedLocally = started;
      _elapsedSeconds = 0;
      _phase = GamePhase.playing;
      _timer?.cancel();
      _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
      _tick();
    } catch (e) {
      _error = _message(e);
      _phase = GamePhase.failed;
    } finally {
      _busy = false;
      _notify();
    }
  }

  void selectCell(int cell) {
    if (!canPlay || (_path.isNotEmpty && cell == _path.last)) return;
    final violation = _rules!.checkMove(_path, cell);
    if (violation != null) {
      _localMistakes++;
      _error = switch (violation) {
        MoveViolation.outsideBoard => 'La celda está fuera del tablero.',
        MoveViolation.startAtFirst => 'Empieza en el número 1.',
        MoveViolation.repeatedCell =>
          'Ya visitaste esa celda. Usa Deshacer para retroceder.',
        MoveViolation.notAdjacent =>
          'Avanza a una celda vecina, sin diagonales ni saltos.',
        MoveViolation.checkpointOrder =>
          'Primero pasa por el número ${_rules!.nextClue(_path)}.',
        MoveViolation.finishTooEarly =>
          'Llena todas las celdas antes de llegar al último número.',
      };
    } else {
      _path = [..._path, cell];
      _hintCell = null;
      _error = null;
      _notice = null;
      _queueMove();
    }
    _notify();
  }

  void undo() {
    if (!canPlay || _path.isEmpty) return;
    _path = _path.sublist(0, _path.length - 1);
    _hintCell = null;
    _error = null;
    _notice = null;
    _queueMove();
    _notify();
  }

  void _queueMove() {
    _pendingPath = _path.isEmpty ? null : List.of(_path);
    if (_pendingPath != null) unawaited(_syncMoves());
  }

  /// Serializa peticiones y agrupa movimientos rápidos. Cada envío contiene
  /// el recorrido completo actual, de modo que deshacer no necesita otro API.
  Future<void> _syncMoves() async {
    if (_syncDone != null) return _syncDone!.future;
    final done = Completer<void>();
    _syncDone = done;
    try {
      while (_pendingPath != null && !_disposed) {
        final sentPath = _pendingPath!;
        _pendingPath = null;
        final response = await _games.move(_session!.id, sentPath);
        if (_disposed) return;
        _serverMistakes = math.max(_serverMistakes, response.mistakesCount);
        _syncError = response.isValid
            ? null
            : 'El servidor rechazó el recorrido. Deshaz el último movimiento.';
      }
    } catch (e) {
      _pendingPath = null;
      _syncError =
          '${_message(e)} Tu recorrido se conserva; puedes reintentar.';
    } finally {
      _syncDone = null;
      done.complete();
      _notify();
    }
  }

  Future<void> retrySync() async {
    if (!canPlay || _path.isEmpty) return;
    _pendingPath = List.of(_path);
    await _syncMoves();
  }

  Future<void> requestHint() async {
    if (!canPlay || canComplete) return;
    _busy = true;
    _error = null;
    _notify();
    try {
      await _syncMoves();
      if (_disposed) return;
      final response = await _games.hint(_session!.id, List.of(_path));
      if (_disposed) return;
      _hintsUsed = response.hintsUsed;
      final hint = response.hint;
      if (hint == null) {
        _notice = 'No hay más pistas para este recorrido.';
      } else {
        if (hint.step < 1 || hint.step > _path.length + 1) {
          throw const FormatException(
            'La pista recibida no corresponde al recorrido.',
          );
        }
        final prefix = _path.take(hint.step - 1).toList();
        if (_rules!.checkMove(prefix, hint.cell) != null) {
          throw const FormatException(
            'La pista recibida no es un movimiento válido.',
          );
        }
        final corrected = prefix.length < _path.length;
        _path = prefix;
        _hintCell = hint.cell;
        _notice = corrected
            ? 'Se corrigió el desvío. Continúa en la celda resaltada.'
            : 'Continúa en la celda resaltada.';
        _queueMove();
      }
    } catch (e) {
      _error = _message(e);
    } finally {
      _busy = false;
      _notify();
    }
  }

  Future<void> complete() async {
    if (!canComplete) return;
    _busy = true;
    _error = null;
    _notify();
    try {
      await _syncMoves();
      if (_disposed) return;
      _tick();
      final result = await _games.complete(
        _session!.id,
        List.of(_path),
        elapsedSeconds: _elapsedSeconds.clamp(0, 86400),
        mistakesCount: mistakesCount.clamp(0, 10000),
      );
      if (!_disposed) _acceptScore(result);
    } catch (e) {
      if (_disposed) return;
      if (e is ApiException && e.isValidation) {
        _serverMistakes = math.max(
          _serverMistakes,
          (e.details?['mistakesCount'] as int?) ?? 0,
        );
        _error = _message(e);
      } else {
        // Una respuesta perdida no significa que la transacción haya fallado.
        // Consulta antes de permitir otro envío y evita duplicar resultados.
        try {
          final saved = await _games.getSession(_session!.id);
          if (_disposed) return;
          if (saved.status == SessionStatus.completed && saved.score != null) {
            _acceptScore(saved.score!);
          } else if (saved.status == SessionStatus.abandoned) {
            _phase = GamePhase.abandoned;
            _timer?.cancel();
          } else {
            _error = _message(e);
          }
        } catch (_) {
          _error =
              '${_message(e)} Puedes volver a verificar sin perder tu recorrido.';
        }
      }
    } finally {
      _busy = false;
      _notify();
    }
  }

  void _acceptScore(GameScore result) {
    _score = result;
    _phase = GamePhase.completed;
    _elapsedSeconds = result.elapsedSeconds;
    _hintsUsed = result.hintsUsed;
    _localMistakes = 0;
    _serverMistakes = result.mistakesCount;
    _timer?.cancel();
    _error = null;
    _syncError = null;
  }

  Future<bool> abandon() async {
    if (_busy || _disposed) return false;
    if (_session == null ||
        _phase == GamePhase.completed ||
        _phase == GamePhase.abandoned) {
      return true;
    }
    _busy = true;
    _notify();
    try {
      await _syncMoves();
      if (_disposed) return false;
      await _games.abandon(_session!.id);
      _timer?.cancel();
      _phase = GamePhase.abandoned;
      return true;
    } catch (e) {
      // También reconcilia un abandono cuya respuesta se perdió.
      try {
        final saved = await _games.getSession(_session!.id);
        if (saved.status == SessionStatus.abandoned) {
          _phase = GamePhase.abandoned;
          _timer?.cancel();
          return true;
        }
        if (saved.status == SessionStatus.completed && saved.score != null) {
          _acceptScore(saved.score!);
          return true;
        }
      } catch (_) {
        /* Conserva el error original y permite reintentar. */
      }
      _error = _message(e);
      return false;
    } finally {
      _busy = false;
      _notify();
    }
  }

  Future<void> restart() async {
    if (!canPlay && _phase != GamePhase.completed) return;
    if (await abandon()) await start(levelId: _requestedLevelId);
  }

  void _tick() {
    if (_phase != GamePhase.playing || _disposed) return;
    _elapsedSeconds = math.max(
      0,
      _now().difference(_startedLocally!).inSeconds,
    );
    _notify();
  }

  String _message(Object e) => e is ApiException
      ? e.message
      : e is FormatException
      ? e.message
      : 'No se pudo completar la operación. Reintenta.';

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _pendingPath = null;
    super.dispose();
  }
}
