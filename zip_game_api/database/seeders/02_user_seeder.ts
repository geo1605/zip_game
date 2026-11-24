import { DateTime } from 'luxon'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Level from '#models/level'
import GameSession from '#models/game_session'
import GameMove from '#models/game_move'
import Score from '#models/score'

export default class UserSeeder extends BaseSeeder {
  async run() {
    const demoUser = await User.updateOrCreate(
      { email: 'demo@zipgame.test' },
      {
        fullName: 'Jugador Demo',
        email: 'demo@zipgame.test',
        password: 'demo12345',
      }
    )

    const rivalUser = await User.updateOrCreate(
      { email: 'ana.lopez@zipgame.test' },
      {
        fullName: 'Ana López',
        email: 'ana.lopez@zipgame.test',
        password: 'demo12345',
      }
    )

    const tutorial = await Level.findBy('name', 'Tutorial - Serpiente')
    if (!tutorial) {
      return
    }

    const existingDemoScore = await Score.query()
      .where('user_id', demoUser.id)
      .where('level_id', tutorial.id)
      .first()

    if (!existingDemoScore) {
      const startedAt = DateTime.utc().minus({ minutes: 5 })
      const finishedAt = startedAt.plus({ seconds: 48 })

      const session = await GameSession.create({
        userId: demoUser.id,
        levelId: tutorial.id,
        status: 'completed',
        startedAt,
        finishedAt,
        elapsedSeconds: 48,
        mistakesCount: 1,
        hintsUsed: 0,
      })

      await GameMove.createMany(
        tutorial.solution.map((cellIndex, index) => ({
          gameSessionId: session.id,
          stepOrder: index + 1,
          cellIndex,
          isValid: true,
        }))
      )

      await Score.create({
        userId: demoUser.id,
        levelId: tutorial.id,
        gameSessionId: session.id,
        points: 920,
        elapsedSeconds: 48,
        mistakesCount: 1,
        hintsUsed: 0,
      })
    }

    const existingRivalScore = await Score.query()
      .where('user_id', rivalUser.id)
      .where('level_id', tutorial.id)
      .first()

    if (!existingRivalScore) {
      const startedAt = DateTime.utc().minus({ minutes: 12 })
      const finishedAt = startedAt.plus({ seconds: 35 })

      const session = await GameSession.create({
        userId: rivalUser.id,
        levelId: tutorial.id,
        status: 'completed',
        startedAt,
        finishedAt,
        elapsedSeconds: 35,
        mistakesCount: 0,
        hintsUsed: 0,
      })

      await GameMove.createMany(
        tutorial.solution.map((cellIndex, index) => ({
          gameSessionId: session.id,
          stepOrder: index + 1,
          cellIndex,
          isValid: true,
        }))
      )

      await Score.create({
        userId: rivalUser.id,
        levelId: tutorial.id,
        gameSessionId: session.id,
        points: 980,
        elapsedSeconds: 35,
        mistakesCount: 0,
        hintsUsed: 0,
      })
    }
  }
}
