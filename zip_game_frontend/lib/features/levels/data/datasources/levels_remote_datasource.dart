import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/api_client.dart';
import '../models/level_model.dart';

class LevelsRemoteDataSource {
  LevelsRemoteDataSource(this._api);

  final ApiClient _api;

  Future<({List<LevelModel> levels, String recommended})> getLevels({String? difficulty}) async {
    final results = await Future.wait([
      _api.get(
        ApiConstants.levels,
        query: difficulty == null ? null : {'difficulty': difficulty},
      ),
      _api.get(ApiConstants.recommendedLevel),
    ]);

    final levelsJson = results[0] as Map<String, dynamic>;
    final recJson = results[1] as Map<String, dynamic>;
    final recData = recJson['data'] as Map<String, dynamic>?;

    return (
      levels: (levelsJson['data'] as List)
          .map((e) => LevelModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      recommended: (recData?['recommendedDifficulty'] as String?) ?? 'easy',
    );
  }

  Future<LevelModel> getLevel(int id) async {
    final json = await _api.get(ApiConstants.level(id)) as Map<String, dynamic>;
    return LevelModel.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<LevelModel> generate(String difficulty) async {
    final json = await _api.post(ApiConstants.generateLevel, body: {'difficulty': difficulty})
        as Map<String, dynamic>;
    return LevelModel.fromJson(json['data'] as Map<String, dynamic>);
  }
}