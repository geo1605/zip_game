import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Level from '#models/level'
import Score from '#models/score'
import ScoringService from '#services/scoring_service'

const SAMPLE_4X4_SOLUTION = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12]
const SAMPLE_4X4_CLUES = [
  { number: 1, cell: 0 },
  { number: 2, cell: 3 },
  { number: 3, cell: 8 },
  { number: 4, cell: 12 },
]

async function createPlayer(label: string) {
  const user = await User.create({
    fullName: label,
    email: `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random()}@zipgame.test`,
    password: 'password123',
  })
  const token = await User.accessTokens.create(user)
  return { user, token: token.value!.release() }
}

test.group('Game Sessions API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('plays a full session with moves, hints, server-side validation, and scoring', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createPlayer('Session Player')
    const level = await Level.create({
      name: 'Session 4x4',
      difficulty: 'medium',
      gridSize: 4,
      clues: SAMPLE_4X4_CLUES,
      solution: SAMPLE_4X4_SOLUTION,
      isGenerated: false,
    })

    const startResponse = await client
      .post('/api/sessions')
      .bearerToken(token)
      .json({ levelId: level.id })
    startResponse.assertStatus(201)
    const sessionId: number = startResponse.body().data.id
    assert.equal(startResponse.body().data.status, 'in_progress')
    assert.notProperty(startResponse.body().data.level, 'solution')

    const validMove = await client
      .post(`/api/sessions/${sessionId}/moves`)
      .bearerToken(token)
      .json({ path: [0, 1, 2] })
    validMove.assertStatus(200)
    assert.isTrue(validMove.body().data.isValid)
    assert.equal(validMove.body().data.mistakesCount, 0)

    const invalidMove = await client
      .post(`/api/sessions/${sessionId}/moves`)
      .bearerToken(token)
      .json({ path: [0, 10] })
    invalidMove.assertStatus(200)
    assert.isFalse(invalidMove.body().data.isValid)
    assert.equal(invalidMove.body().data.mistakesCount, 1)

    const hintResponse = await client
      .post(`/api/sessions/${sessionId}/hint`)
      .bearerToken(token)
      .json({ path: [0, 1, 2] })
    hintResponse.assertStatus(200)
    assert.equal(hintResponse.body().data.hint.cell, 3)
    assert.equal(hintResponse.body().data.hintsUsed, 1)

    const invalidComplete = await client
      .post(`/api/sessions/${sessionId}/complete`)
      .bearerToken(token)
      .json({ path: [0, 1, 2, 3] })
    invalidComplete.assertStatus(422)
    assert.equal(invalidComplete.body().mistakesCount, 2)

    const completeResponse = await client
      .post(`/api/sessions/${sessionId}/complete`)
      .bearerToken(token)
      .json({
        path: SAMPLE_4X4_SOLUTION,
        elapsedSeconds: 20,
        mistakesCount: 0,
        points: 999999,
      })
    completeResponse.assertStatus(200)

    const completed = completeResponse.body().data
    assert.equal(completed.session.status, 'completed')
    assert.equal(completed.score.mistakesCount, 2)
    assert.equal(completed.score.hintsUsed, 1)
    const expectedPoints = new ScoringService().calculate({
      difficulty: 'medium',
      durationSeconds: completed.score.elapsedSeconds,
      mistakes: completed.score.mistakesCount,
      hintsUsed: completed.score.hintsUsed,
    }).total
    assert.equal(completed.score.points, expectedPoints)

    const persistedScore = await Score.findByOrFail('gameSessionId', sessionId)
    assert.equal(persistedScore.userId, user.id)
    assert.equal(persistedScore.points, expectedPoints)

    const duplicateComplete = await client
      .post(`/api/sessions/${sessionId}/complete`)
      .bearerToken(token)
      .json({ path: SAMPLE_4X4_SOLUTION })
    duplicateComplete.assertStatus(409)
  })

  test('enforces session ownership and supports abandoning active sessions', async ({
    client,
    assert,
  }) => {
    const owner = await createPlayer('Owner Player')
    const intruder = await createPlayer('Other Player')
    const level = await Level.create({
      name: 'Protected 4x4',
      difficulty: 'easy',
      gridSize: 4,
      clues: SAMPLE_4X4_CLUES,
      solution: SAMPLE_4X4_SOLUTION,
      isGenerated: false,
    })

    const startResponse = await client
      .post('/api/sessions')
      .bearerToken(owner.token)
      .json({ levelId: level.id })
    const sessionId: number = startResponse.body().data.id

    const stolenRead = await client.get(`/api/sessions/${sessionId}`).bearerToken(intruder.token)
    stolenRead.assertStatus(404)

    const stolenMove = await client
      .post(`/api/sessions/${sessionId}/moves`)
      .bearerToken(intruder.token)
      .json({ path: [0, 1] })
    stolenMove.assertStatus(404)

    const abandonResponse = await client
      .post(`/api/sessions/${sessionId}/abandon`)
      .bearerToken(owner.token)
    abandonResponse.assertStatus(200)
    assert.equal(abandonResponse.body().data.status, 'abandoned')

    const moveAfterAbandon = await client
      .post(`/api/sessions/${sessionId}/moves`)
      .bearerToken(owner.token)
      .json({ path: [0, 1] })
    moveAfterAbandon.assertStatus(409)
  })
})
