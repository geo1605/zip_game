import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Level from '#models/level'

async function createAuthToken() {
  const user = await User.create({
    fullName: 'Level Tester',
    email: `levels-${Date.now()}-${Math.random()}@zipgame.test`,
    password: 'password123',
  })
  const token = await User.accessTokens.create(user)
  return { user, token: token.value!.release() }
}

test.group('Levels API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('protects level endpoints with bearer authentication', async ({ client }) => {
    const response = await client.get('/api/levels')
    response.assertStatus(401)
  })

  test('lists levels filtered by difficulty and never exposes solutions', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthToken()

    await Level.createMany([
      {
        name: 'Easy One',
        difficulty: 'easy',
        gridSize: 4,
        clues: [
          { number: 1, cell: 0 },
          { number: 2, cell: 12 },
        ],
        solution: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
        isGenerated: false,
      },
      {
        name: 'Hard One',
        difficulty: 'hard',
        gridSize: 4,
        clues: [
          { number: 1, cell: 0 },
          { number: 2, cell: 12 },
        ],
        solution: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
        isGenerated: false,
      },
    ])

    const response = await client.get('/api/levels?difficulty=easy').bearerToken(token)
    response.assertStatus(200)

    const levels = response.body().data
    assert.isAbove(levels.length, 0)
    for (const item of levels) {
      assert.equal(item.difficulty, 'easy')
      assert.notProperty(item, 'solution')
      assert.isBoolean(item.completed)
    }

    const invalidFilter = await client.get('/api/levels?difficulty=invalid').bearerToken(token)
    invalidFilter.assertStatus(422)
  })

  test('retrieves level by id and handles missing or invalid ids', async ({ client, assert }) => {
    const { token } = await createAuthToken()

    const level = await Level.create({
      name: 'Lookup Level',
      difficulty: 'medium',
      gridSize: 4,
      clues: [
        { number: 1, cell: 0 },
        { number: 2, cell: 12 },
      ],
      solution: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
      isGenerated: false,
    })

    const found = await client.get(`/api/levels/${level.id}`).bearerToken(token)
    found.assertStatus(200)
    assert.equal(found.body().data.id, level.id)
    assert.notProperty(found.body().data, 'solution')

    const missing = await client.get('/api/levels/999999').bearerToken(token)
    missing.assertStatus(404)

    const malformed = await client.get('/api/levels/not-a-number').bearerToken(token)
    malformed.assertStatus(422)
  })

  test('generates and persists a procedural level without exposing its solution', async ({
    client,
    assert,
  }) => {
    const { token } = await createAuthToken()

    const response = await client.post('/api/levels/generate').bearerToken(token).json({
      difficulty: 'medium',
      name: 'Generated Test Level',
      gridSize: 4,
    })

    response.assertStatus(201)
    const data = response.body().data
    assert.equal(data.name, 'Generated Test Level')
    assert.equal(data.difficulty, 'medium')
    assert.equal(data.gridSize, 4)
    assert.isTrue(data.isGenerated)
    assert.notProperty(data, 'solution')

    const saved = await Level.findOrFail(data.id)
    assert.lengthOf(saved.solution, 16)

    const recommended = await client.get('/api/levels/recommended').bearerToken(token)
    recommended.assertStatus(200)
    assert.equal(recommended.body().data.recommendedDifficulty, 'easy')
  })
})
