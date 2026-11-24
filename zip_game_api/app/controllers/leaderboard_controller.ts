import type { HttpContext } from '@adonisjs/core/http'
import ScoreRepository from '#repositories/score_repository'
import { limitQueryValidator } from '#validators/common_validator'

export default class LeaderboardController {
  private readonly scoreRepository = new ScoreRepository()

  async index({ request, response }: HttpContext) {
    const query = await limitQueryValidator.validate(request.qs())
    const rows = await this.scoreRepository.getLeaderboard(query.limit ?? 20)

    return response.ok({
      data: rows.map((row, index) => ({
        rank: index + 1,
        ...row,
      })),
    })
  }
}
