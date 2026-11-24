import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Level from '#models/level'
import GameSession from '#models/game_session'
import ScoringService from '#services/scoring_service'

const solution = [
  0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 12, 13, 14, 15, 16, 17, 23, 22, 21, 20, 19, 18, 24, 25, 26,
  27, 28, 29, 35, 34, 33, 32, 31, 30,
]

test.group('Flutter contract: complete 6x6 flow', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('registers, plays, recovers results, updates profile/history/ranking and logs out', async ({
    client,
    assert,
  }) => {
    const email = `flutter-${Date.now()}-${Math.random()}@zipgame.test`
    const register = await client.post('/api/auth/register').json({
      fullName: 'Flutter Player',
      email,
      password: 'password123',
    })
    register.assertStatus(201)
    const token = register.body().token.value
    const userId = register.body().user.id
    const level = await Level.create({
      name: 'Integration 6x6',
      difficulty: 'easy',
      gridSize: 6,
      clues: [
        { number: 1, cell: 0 },
        { number: 2, cell: 5 },
        { number: 3, cell: 12 },
        { number: 4, cell: 30 },
      ],
      solution,
      isGenerated: false,
    })
    const levels = await client.get('/api/levels').bearerToken(token)
    levels.assertStatus(200)
    assert.isTrue(levels.body().data.some((row: { id: number }) => row.id === level.id))

    const start = await client.post('/api/sessions').bearerToken(token).json({ levelId: level.id })
    start.assertStatus(201)
    const sessionId = start.body().data.id
    assert.notProperty(start.body().data.level, 'solution')

    const hint = await client
      .post(`/api/sessions/${sessionId}/hint`)
      .bearerToken(token)
      .json({ path: [0, 6, 7, 1] })
    hint.assertStatus(200)
    assert.equal(hint.body().data.hint.step, 2)
    assert.equal(hint.body().data.hint.cell, 1)
    const move = await client
      .post(`/api/sessions/${sessionId}/moves`)
      .bearerToken(token)
      .json({ path: solution.slice(0, 20) })
    move.assertStatus(200)
    assert.isTrue(move.body().data.isValid)

    const complete = await client
      .post(`/api/sessions/${sessionId}/complete`)
      .bearerToken(token)
      .json({ path: solution, elapsedSeconds: 30, mistakesCount: 2, points: 999999 })
    complete.assertStatus(200)
    const score = complete.body().data.score
    const expectedPoints = new ScoringService().calculate({
      difficulty: 'easy',
      durationSeconds: score.elapsedSeconds,
      mistakes: score.mistakesCount,
      hintsUsed: score.hintsUsed,
    }).total
    assert.equal(score.points, expectedPoints)
    assert.equal(score.hintsUsed, 1)

    const recovered = await client.get(`/api/sessions/${sessionId}`).bearerToken(token)
    recovered.assertStatus(200)
    assert.equal(recovered.body().data.status, 'completed')
    assert.equal(recovered.body().data.score.id, score.id)
    assert.notProperty(recovered.body().data.level, 'solution')
    const history = await client.get('/api/history').bearerToken(token)
    assert.equal(history.body().data[0].score.id, score.id)
    const profile = await client.get('/api/profile').bearerToken(token)
    assert.equal(profile.body().data.stats.totalPoints, score.points)
    assert.equal(profile.body().data.stats.completedLevelsCount, 1)
    const leaderboard = await client.get('/api/leaderboard').bearerToken(token)
    const player = leaderboard.body().data.find((row: { userId: number }) => row.userId === userId)
    assert.equal(player.totalPoints, score.points)
    assert.equal(player.completedLevels, 1)
    const updatedLevels = await client.get(`/api/levels/${level.id}`).bearerToken(token)
    assert.isTrue(updatedLevels.body().data.completed)
    assert.equal(updatedLevels.body().data.bestPoints, score.points)

    const replay = await client
      .post(`/api/sessions/${sessionId}/complete`)
      .bearerToken(token)
      .json({ path: solution })
    replay.assertStatus(409)
    const finished = await GameSession.findOrFail(sessionId)
    assert.equal(finished.status, 'completed')
    const logout = await client.post('/api/auth/logout').bearerToken(token)
    logout.assertStatus(200)
    const expired = await client.get('/api/profile').bearerToken(token)
    expired.assertStatus(401)
  })
})
