import type { HttpContext } from '@adonisjs/core/http'
import type { LevelDifficulty } from '#models/level'
import UserRepository from '#repositories/user_repository'
import GameSessionRepository from '#repositories/game_session_repository'
import AdaptiveDifficultyService from '#services/adaptive_difficulty_service'
import { limitQueryValidator } from '#validators/common_validator'
import { serializeGameSession, serializeUser } from '#utils/serializers'

export default class ProfileController {
  private readonly userRepository = new UserRepository()
  private readonly gameSessionRepository = new GameSessionRepository()
  private readonly adaptiveDifficultyService = new AdaptiveDifficultyService()

  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const [stats, recentSessions] = await Promise.all([
      this.userRepository.getProfileStats(user.id),
      this.gameSessionRepository.findRecentByUser(user.id, 10),
    ])
    const completedSessions = recentSessions.filter((session) => session.status === 'completed')

    let recommendedDifficulty: LevelDifficulty = 'easy'
    if (completedSessions.length > 0) {
      const currentDifficulty: LevelDifficulty = completedSessions[0].level?.difficulty ?? 'easy'
      recommendedDifficulty = this.adaptiveDifficultyService.decide(
        currentDifficulty,
        completedSessions.map((session) => ({
          difficulty: session.level?.difficulty ?? currentDifficulty,
          durationSeconds: session.elapsedSeconds,
          mistakes: session.mistakesCount,
          hintsUsed: session.hintsUsed,
        }))
      ).recommended
    }

    return response.ok({
      data: {
        user: serializeUser(user),
        stats,
        recommendedDifficulty,
      },
    })
  }

  async history({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const query = await limitQueryValidator.validate(request.qs())

    const sessions = await this.gameSessionRepository.findHistoryByUser(user.id, query.limit ?? 20)

    return response.ok({
      data: sessions.map(serializeGameSession),
    })
  }
}
