import 'package:flutter/foundation.dart';
import '../../../../core/errors/api_exception.dart';
import '../../domain/entities/level.dart';
import '../../domain/repositories/levels_repository.dart';

enum LoadState { loading, ready, empty, error }

class LevelsController extends ChangeNotifier {
  LevelsController(this._repository);

  final LevelsRepository _repository;

  LoadState state = LoadState.loading;
  List<Level> levels = [];
  String recommendedDifficulty = 'easy';
  String? filter;
  String? error;
  bool generating = false;

  Future<void> load() async {
    state = LoadState.loading;
    error = null;
    notifyListeners();
    try {
      final page = await _repository.getLevels(difficulty: filter);
      levels = page.levels;
      recommendedDifficulty = page.recommendedDifficulty;
      state = levels.isEmpty ? LoadState.empty : LoadState.ready;
    } on ApiException catch (e) {
      error = e.message;
      state = LoadState.error;
    }
    notifyListeners();
  }

  Future<void> setFilter(String? difficulty) async {
    filter = difficulty;
    await load();
  }

  Future<Level?> generate(String difficulty) async {
    generating = true;
    notifyListeners();
    try {
      final level = await _repository.generate(difficulty);
      await load();
      return level;
    } on ApiException catch (e) {
      error = e.message;
      return null;
    } finally {
      generating = false;
      notifyListeners();
    }
  }
}