import { test } from '@japa/runner'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { idParamValidator, limitQueryValidator } from '#validators/common_validator'
import { generateLevelValidator, listLevelsQueryValidator } from '#validators/level_validator'
import {
  completeGameSessionValidator,
  createGameSessionValidator,
  hintRequestValidator,
  recordMoveValidator,
} from '#validators/game_session_validator'

test.group('Auth validators', () => {
  test('registerValidator normalizes email and trims fullName', async ({ assert }) => {
    const result = await registerValidator.validate({
      fullName: '  Ada Lovelace  ',
      email: '  ADA@Example.COM  ',
      password: 'strongpassword1',
    })

    assert.equal(result.fullName, 'Ada Lovelace')
    assert.equal(result.email, 'ada@example.com')
    assert.equal(result.password, 'strongpassword1')
  })

  test('registerValidator rejects short password and malformed email', async ({ assert }) => {
    await assert.rejects(
      () =>
        registerValidator.validate({
          fullName: 'A',
          email: 'not-an-email',
          password: '123',
        }),
      /Validation failure/
    )
  })

  test('loginValidator normalizes email and requires password', async ({ assert }) => {
    const result = await loginValidator.validate({
      email: '  USER@ZipGame.Test ',
      password: 'secret',
    })

    assert.equal(result.email, 'user@zipgame.test')
    assert.equal(result.password, 'secret')

    await assert.rejects(
      () => loginValidator.validate({ email: 'user@zipgame.test', password: '' }),
      /Validation failure/
    )
  })
})

test.group('Common and level validators', () => {
  test('idParamValidator accepts positive integers and rejects non-numeric values', async ({
    assert,
  }) => {
    const valid = await idParamValidator.validate({ id: '42' })
    assert.equal(valid.id, 42)

    await assert.rejects(() => idParamValidator.validate({ id: 'abc' }))
    await assert.rejects(() => idParamValidator.validate({ id: 0 }))
    await assert.rejects(() => idParamValidator.validate({ id: -3 }))
  })

  test('limitQueryValidator bounds limit between 1 and 100', async ({ assert }) => {
    const valid = await limitQueryValidator.validate({ limit: '25' })
    assert.equal(valid.limit, 25)

    const empty = await limitQueryValidator.validate({})
    assert.isUndefined(empty.limit)

    await assert.rejects(() => limitQueryValidator.validate({ limit: 0 }))
    await assert.rejects(() => limitQueryValidator.validate({ limit: 101 }))
  })

  test('level validators validate difficulty and gridSize bounds', async ({ assert }) => {
    const listQuery = await listLevelsQueryValidator.validate({ difficulty: 'medium' })
    assert.equal(listQuery.difficulty, 'medium')

    const generated = await generateLevelValidator.validate({
      difficulty: 'hard',
      name: '  Custom Puzzle  ',
      gridSize: 6,
    })
    assert.equal(generated.difficulty, 'hard')
    assert.equal(generated.name, 'Custom Puzzle')
    assert.equal(generated.gridSize, 6)

    await assert.rejects(() => listLevelsQueryValidator.validate({ difficulty: 'extreme' }))
    await assert.rejects(() =>
      generateLevelValidator.validate({ difficulty: 'easy', gridSize: 12 })
    )
  })
})

test.group('Game session validators', () => {
  test('createGameSessionValidator requires positive integer levelId', async ({ assert }) => {
    const valid = await createGameSessionValidator.validate({ levelId: 3 })
    assert.equal(valid.levelId, 3)

    await assert.rejects(() => createGameSessionValidator.validate({ levelId: 0 }))
  })

  test('recordMoveValidator and hintRequestValidator validate cell arrays', async ({ assert }) => {
    const move = await recordMoveValidator.validate({ path: [0, 1, 2] })
    assert.deepEqual(move.path, [0, 1, 2])

    const hintEmpty = await hintRequestValidator.validate({})
    assert.isUndefined(hintEmpty.path)

    await assert.rejects(() => recordMoveValidator.validate({ path: [] }))
    await assert.rejects(() => recordMoveValidator.validate({ path: [0, 99] }))
    await assert.rejects(() => recordMoveValidator.validate({ path: [-1] }))
  })

  test('completeGameSessionValidator enforces minimum path length and non-negative metrics', async ({
    assert,
  }) => {
    const complete = await completeGameSessionValidator.validate({
      path: [0, 1, 2, 3],
      elapsedSeconds: 45,
      mistakesCount: 2,
    })
    assert.equal(complete.elapsedSeconds, 45)
    assert.equal(complete.mistakesCount, 2)

    await assert.rejects(() => completeGameSessionValidator.validate({ path: [0, 1] }))
    await assert.rejects(() =>
      completeGameSessionValidator.validate({ path: [0, 1, 2, 3], elapsedSeconds: -5 })
    )
  })
})
