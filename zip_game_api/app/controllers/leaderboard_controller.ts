import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ScoreRepository from '#repositories/score_repository'
import { limitQueryValidator } from '#validators/common_validator'

@inject()
export default class LeaderboardController {
  constructor(private readonly scoreRepository: ScoreRepository) {}

  async index({ request, response }: HttpContext) {
    const query = await limitQueryValidator.validate(request.qs())
    const rows = await this.scoreRepository.getLeaderboard(query.limit ?? 20)

    return response.ok({
      rules: 'Sum of points; ties: more completed levels, lower average completion time',
      data: rows.map((row, index) => ({
        rank: index + 1,
        ...row,
      })),
    })
  }
}
