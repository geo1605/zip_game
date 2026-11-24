import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Level from '#models/level'

const SAMPLE_4X4_SOLUTION = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12]
const SAMPLE_4X4_CLUES = [
  { number: 1, cell: 0 },
  { number: 2, cell: 3 },
  { number: 3, cell: 8 },
  { number: 4, cell: 12 },
]

async function registerAndLogin(client: any, fullName: string, email: string) {
  const response = await client.post('/api/auth/register').json({
    fullName,
    email,
    password: 'password123',
  })
  response.assertStatus(201)
  return {
    userId: response.body().user.id as number,
    token: response.body().token.value as string,
  }
}

test.group('Profile, History, and Leaderboard API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns accurate profile stats, personal history, and ordered leaderboard', async ({
    client,
    assert,
  }) => {
    const level = await Level.create({
      name: 'Ranking Arena',
      difficulty: 'hard',
      gridSize: 4,
      clues: SAMPLE_4X4_CLUES,
      solution: SAMPLE_4X4_SOLUTION,
      isGenerated: false,
    })

    const alice = await registerAndLogin(
      client,
      'Alice Winner',
      `alice-${Date.now()}-${Math.random()}@zipgame.test`
    )
    const bob = await registerAndLogin(
      client,
      'Bob Runner',
      `bob-${Date.now()}-${Math.random()}@zipgame.test`
    )

    const aliceStart = await client
      .post('/api/sessions')
      .bearerToken(alice.token)
      .json({ levelId: level.id })
    const aliceSessionId: number = aliceStart.body().data.id

    const aliceComplete = await client
      .post(`/api/sessions/${aliceSessionId}/complete`)
      .bearerToken(alice.token)
      .json({ path: SAMPLE_4X4_SOLUTION, elapsedSeconds: 15 })
    aliceComplete.assertStatus(200)
    const alicePoints: number = aliceComplete.body().data.score.points

    const bobStart = await client
      .post('/api/sessions')
      .bearerToken(bob.token)
      .json({ levelId: level.id })
    const bobSessionId: number = bobStart.body().data.id

    const bobComplete = await client
      .post(`/api/sessions/${bobSessionId}/complete`)
      .bearerToken(bob.token)
      .json({ path: SAMPLE_4X4_SOLUTION, elapsedSeconds: 90, mistakesCount: 2 })
    bobComplete.assertStatus(200)
    const bobPoints: number = bobComplete.body().data.score.points

    assert.isAbove(alicePoints, bobPoints)

    const profileResponse = await client.get('/api/profile').bearerToken(alice.token)
    profileResponse.assertStatus(200)
    const profile = profileResponse.body().data
    assert.equal(profile.user.id, alice.userId)
    assert.equal(profile.stats.completedLevelsCount, 1)
    assert.equal(profile.stats.totalSessions, 1)
    assert.equal(profile.stats.totalPoints, alicePoints)
    assert.equal(profile.stats.bestScore, alicePoints)

    const historyResponse = await client.get('/api/history?limit=5').bearerToken(alice.token)
    historyResponse.assertStatus(200)
    const history = historyResponse.body().data
    assert.lengthOf(history, 1)
    assert.equal(history[0].id, aliceSessionId)
    assert.equal(history[0].score.points, alicePoints)
    assert.notProperty(history[0].level, 'solution')

    const leaderboardResponse = await client
      .get('/api/leaderboard?limit=10')
      .bearerToken(alice.token)
    leaderboardResponse.assertStatus(200)
    const leaderboard = leaderboardResponse.body().data
    const aliceEntry = leaderboard.find((row: any) => row.userId === alice.userId)
    const bobEntry = leaderboard.find((row: any) => row.userId === bob.userId)

    assert.exists(aliceEntry)
    assert.exists(bobEntry)
    assert.isBelow(aliceEntry.rank, bobEntry.rank)
  })

  test('rejects unauthenticated access and invalid limit parameters', async ({ client }) => {
    const unauthProfile = await client.get('/api/profile')
    unauthProfile.assertStatus(401)

    const unauthLeaderboard = await client.get('/api/leaderboard')
    unauthLeaderboard.assertStatus(401)

    const user = await User.create({
      fullName: 'Limit Tester',
      email: `limit-${Date.now()}-${Math.random()}@zipgame.test`,
      password: 'password123',
    })
    const accessToken = await User.accessTokens.create(user)
    const token = accessToken.value!.release()

    const badLimit = await client.get('/api/leaderboard?limit=500').bearerToken(token)
    badLimit.assertStatus(422)
  })
})
