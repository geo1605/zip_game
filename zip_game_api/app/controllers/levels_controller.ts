import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GameException from '#exceptions/game_exception'
import type { LevelDifficulty } from '#models/level'
import LevelRepository from '#repositories/level_repository'
import GameSessionRepository from '#repositories/game_session_repository'
import LevelGeneratorService from '#services/level_generator_service'
import GameValidatorService from '#services/game_validator_service'
import AdaptiveDifficultyService from '#services/adaptive_difficulty_service'
import { idParamValidator } from '#validators/common_validator'
import { generateLevelValidator, listLevelsQueryValidator } from '#validators/level_validator'
import { serializeLevel, serializeLevelWithStatus } from '#utils/serializers'

@inject()
export default class LevelsController {
  constructor(
    private readonly levelRepository: LevelRepository,
    private readonly gameSessionRepository: GameSessionRepository,
    private readonly levelGeneratorService: LevelGeneratorService,
    private readonly gameValidatorService: GameValidatorService,
    private readonly adaptiveDifficultyService: AdaptiveDifficultyService
  ) {}

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
      throw new GameException('Level not found', {
        status: 404,
        code: 'E_LEVEL_NOT_FOUND',
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
      throw new GameException('Failed to generate a valid level', {
        status: 500,
        code: 'E_GENERATION_FAILED',
      })
    }

    const level = await this.levelRepository.create(generated)

    return response.created({
      data: serializeLevel(level),
      metrics: generated.metrics,
    })
  }

  async recommended({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const recentSessions = await this.gameSessionRepository.findRecentByUser(user.id, 10)
    const completedSessions = recentSessions.filter((session) => session.status === 'completed')

    if (completedSessions.length === 0) {
      return response.ok({
        data: {
          currentDifficulty: 'easy' as LevelDifficulty,
          recommendedDifficulty: 'easy' as LevelDifficulty,
          basedOnSessions: 0,
        },
      })
    }

    const currentDifficulty: LevelDifficulty = completedSessions[0].level?.difficulty ?? 'easy'
    const decision = this.adaptiveDifficultyService.decide(
      currentDifficulty,
      completedSessions.map((session) => ({
        difficulty: session.level?.difficulty ?? currentDifficulty,
        durationSeconds: session.elapsedSeconds,
        mistakes: session.mistakesCount,
        hintsUsed: session.hintsUsed,
      }))
    )

    return response.ok({
      data: {
        currentDifficulty,
        recommendedDifficulty: decision.recommended,
        basedOnSessions: completedSessions.length,
        change: decision.change,
        reason: decision.reason,
      },
    })
  }
}
