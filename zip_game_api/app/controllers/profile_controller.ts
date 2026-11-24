import type { HttpContext } from '@adonisjs/core/http'
import type { LevelDifficulty } from '#models/level'
import UserRepository from '#repositories/user_repository'
import GameSessionRepository from '#repositories/game_session_repository'
import GameAssistanceService from '#services/game_assistance_service'
import { limitQueryValidator } from '#validators/common_validator'
import { serializeGameSession, serializeUser } from '#utils/serializers'

export default class ProfileController {
  private readonly userRepository = new UserRepository()
  private readonly gameSessionRepository = new GameSessionRepository()
  private readonly gameAssistanceService = new GameAssistanceService()

  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const [stats, recentSessions] = await Promise.all([
      this.userRepository.getProfileStats(user.id),
      this.gameSessionRepository.findRecentByUser(user.id, 10),
    ])

    let recommendedDifficulty: LevelDifficulty = 'easy'
    if (recentSessions.length > 0) {
      const currentDifficulty: LevelDifficulty = recentSessions[0].level?.difficulty ?? 'easy'
      const completedCount = recentSessions.filter((s) => s.status === 'completed').length
      const totalMistakes = recentSessions.reduce((sum, s) => sum + s.mistakesCount, 0)
      const totalHints = recentSessions.reduce((sum, s) => sum + s.hintsUsed, 0)

      recommendedDifficulty = this.gameAssistanceService.recommendDifficulty(currentDifficulty, {
        completionRate: completedCount / recentSessions.length,
        averageMistakes: totalMistakes / recentSessions.length,
        averageHints: totalHints / recentSessions.length,
      })
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
