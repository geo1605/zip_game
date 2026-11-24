import '../../domain/entities/level.dart';
import '../../domain/repositories/levels_repository.dart';
import '../datasources/levels_remote_datasource.dart';

class LevelsRepositoryImpl implements LevelsRepository {
  LevelsRepositoryImpl(this._remote);

  final LevelsRemoteDataSource _remote;

  @override
  Future<LevelsPageData> getLevels({String? difficulty}) async {
    final result = await _remote.getLevels(difficulty: difficulty);
    return LevelsPageData(levels: result.levels, recommendedDifficulty: result.recommended);
  }

  @override
  Future<Level> getLevel(int id) => _remote.getLevel(id);

  @override
  Future<Level> generate(String difficulty) => _remote.generate(difficulty);
}