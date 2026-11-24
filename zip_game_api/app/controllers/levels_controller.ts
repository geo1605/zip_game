import type { HttpContext } from '@adonisjs/core/http'
import type { LevelDifficulty } from '#models/level'
import LevelRepository from '#repositories/level_repository'
import GameSessionRepository from '#repositories/game_session_repository'
import LevelGeneratorService from '#services/level_generator_service'
import GameValidatorService from '#services/game_validator_service'
import GameAssistanceService from '#services/game_assistance_service'
import { idParamValidator } from '#validators/common_validator'
import { generateLevelValidator, listLevelsQueryValidator } from '#validators/level_validator'
import { serializeLevel, serializeLevelWithStatus } from '#utils/serializers'

export default class LevelsController {
  private readonly levelRepository = new LevelRepository()
  private readonly gameSessionRepository = new GameSessionRepository()
  private readonly levelGeneratorService = new LevelGeneratorService()
  private readonly gameValidatorService = new GameValidatorService()
  private readonly gameAssistanceService = new GameAssistanceService()

  async index({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const query = await listLevelsQueryValidator.validate(request.qs())

    const levels = await this.levelRepository.findAllWithUserStatus(user.id, query.difficulty)

    return response.ok({
      data: levels.map(serializeLevelWithStatus),
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { id } = await idParamValidator.validate(params)

    const levelWithStatus = await this.levelRepository.findByIdWithUserStatus(id, user.id)
    if (!levelWithStatus) {
      return response.notFound({
        message: 'Level not found',
      })
    }

    return response.ok({
      data: serializeLevelWithStatus(levelWithStatus),
    })
  }

  async generate({ request, response }: HttpContext) {
    const payload = await request.validateUsing(generateLevelValidator)

    const generated = this.levelGeneratorService.generate(payload.difficulty, {
      name: payload.name,
      gridSize: payload.gridSize,
    })

    const verification = this.gameValidatorService.validatePath(
      generated.solution,
      generated.clues,
      {
        gridSize: generated.gridSize,
        requireComplete: true,
      }
    )

    if (!verification.isValid || !verification.isComplete) {
      return response.internalServerError({
        message: 'Failed to generate a valid level',
      })
    }

    const level = await this.levelRepository.create(generated)

    return response.created({
      data: serializeLevel(level),
    })
  }

  async recommended({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const recentSessions = await this.gameSessionRepository.findRecentByUser(user.id, 10)

    if (recentSessions.length === 0) {
      return response.ok({
        data: {
          currentDifficulty: 'easy' as LevelDifficulty,
          recommendedDifficulty: 'easy' as LevelDifficulty,
          basedOnSessions: 0,
        },
      })
    }

    const currentDifficulty: LevelDifficulty = recentSessions[0].level?.difficulty ?? 'easy'
    const completedCount = recentSessions.filter((s) => s.status === 'completed').length
    const totalMistakes = recentSessions.reduce((sum, s) => sum + s.mistakesCount, 0)
    const totalHints = recentSessions.reduce((sum, s) => sum + s.hintsUsed, 0)

    const recommendedDifficulty = this.gameAssistanceService.recommendDifficulty(
      currentDifficulty,
      {
        completionRate: completedCount / recentSessions.length,
        averageMistakes: totalMistakes / recentSessions.length,
        averageHints: totalHints / recentSessions.length,
      }
    )

    return response.ok({
      data: {
        currentDifficulty,
        recommendedDifficulty,
        basedOnSessions: recentSessions.length,
      },
    })
  }
}
